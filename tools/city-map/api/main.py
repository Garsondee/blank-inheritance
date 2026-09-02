# -*- coding: utf-8 -*-
"""The live map-tile server -- map-editor plan Phase 2.

    python tools/city-map/api/main.py                 # real Kurose data, port 8766

Testable without a live server or real data: import `app`, call
`configure(app, frame, style, fields, tiles_root)` with small fixtures, then
drive it with fastapi.testclient.TestClient -- no real HTTP socket needed
(see test_api_tiles.py). Production startup (`main()` below) does the exact
same `configure()` call with real paths, just later -- one configuration
code path, not a test-only shortcut that could drift from what actually
runs.

Every tile served is real `render_tile` output -- this module adds tiling
math (citymap/tiles.py), a disk cache, and HTTP plumbing on top; it is not
a second rendering path. See citymap/tiles.py's module docstring for why
the cache is keyed on frame+style only (not world_version) and invalidated
by precise, bbox-scoped file deletion instead.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass

CITYMAP_TOOL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, CITYMAP_TOOL_DIR)

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.responses import Response  # noqa: E402
import shapely.geometry  # noqa: E402
import shapely.ops  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402

from citymap import cache as cache_module, fields as fields_module, tiles as tiles_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.store import gpkg as gpkg_module  # noqa: E402
from citymap.style import Style  # noqa: E402
from citymap.store.load import resolve_fields_from_store  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(CITYMAP_TOOL_DIR, "..", ".."))
DEFAULT_FRAME_PATH = os.path.join(REPO_ROOT, "data", "map", "frames", "kurose-12km.json")
DEFAULT_STYLE_PATH = os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json")
DEFAULT_STORE_PATH = os.path.join(REPO_ROOT, "data", "map", "kurose.gpkg")
DEFAULT_DEM_CACHE_DIR = os.path.join(cache_module.artifact_root(REPO_ROOT, "source"), "dem")
DEFAULT_TILES_CACHE_DIR = cache_module.artifact_root(REPO_ROOT, "tiles")

DEFAULT_TILE_PX = 256
MAX_ZOOM = tiles_module.MAX_ZOOM  # see citymap/tiles.py -- lives there so
                                  # api/edits.py can use it too without a
                                  # circular import back into this module.


@dataclass
class AppState:
    frame: Frame
    style: Style
    fields: fields_module.Fields
    renderer: tiles_module.TileRenderer
    store_path: str  # api/features.py queries the store directly (live,
                     # editable data), never through the Fields/World cache
                     # this dataclass otherwise carries for rendering.
    dem_cache_dir: str  # api/terrace.py's Fields.resync_terrain_from_store
                        # needs this to re-derive elevation after a live
                        # terrain_edit write -- see that method's own
                        # docstring for why this is a local disk-cache hit,
                        # not a real network re-fetch, despite the name.


app = FastAPI(title="city-map tile server")

from api import array_place as array_place_module  # noqa: E402
from api import causeway as causeway_module  # noqa: E402
from api import cleanup as cleanup_module  # noqa: E402
from api import edits as edits_module  # noqa: E402
from api import features as features_module  # noqa: E402
from api import ghostlines as ghostlines_module  # noqa: E402
from api import reclaim as reclaim_module  # noqa: E402
from api import return_to_sea as return_to_sea_module  # noqa: E402
from api import terrace as terrace_module  # noqa: E402
from api import union as union_module  # noqa: E402
from api import wall_on_foundation as wall_on_foundation_module  # noqa: E402
app.include_router(features_module.router)
app.include_router(edits_module.router)
app.include_router(ghostlines_module.router)
app.include_router(terrace_module.router)
app.include_router(wall_on_foundation_module.router)
app.include_router(array_place_module.router)
app.include_router(reclaim_module.router)
app.include_router(causeway_module.router)
app.include_router(return_to_sea_module.router)
app.include_router(cleanup_module.router)
app.include_router(union_module.router)


def configure(app: FastAPI, frame: Frame, style: Style, fields: fields_module.Fields,
             tiles_root: str, store_path: str, dem_cache_dir: str, max_workers: int = 4) -> AppState:
    """Wire real (or test) state into the app.

    Warms the spatial index eagerly -- a whole-frame query, forcing
    Fields.query_features to build its STRtree now rather than on the
    first tile request. Measured cost (Phase 2 spike, real Kurose data):
    ~250ms for 230k features. Paying that once here, at startup, means
    EVERY tile request -- including the first -- lands at the same
    steady-state ~88ms this module was designed around, instead of one
    unlucky early request silently eating an extra quarter-second.
    """
    fields.query_features(Polygon(frame.map_corners()))
    state = AppState(frame=frame, style=style, fields=fields, store_path=store_path,
                     dem_cache_dir=dem_cache_dir,
                     renderer=tiles_module.TileRenderer(tiles_root, max_workers=max_workers))
    app.state.map_state = state
    return state


def _require_state(app: FastAPI) -> AppState:
    state = getattr(app.state, "map_state", None)
    if state is None:
        raise HTTPException(status_code=503, detail="server not configured yet -- call configure() first")
    return state


@app.get("/health")
def health():
    state = getattr(app.state, "map_state", None)
    return {"status": "ok" if state is not None else "not_configured"}


@app.get("/api/frame")
def get_frame():
    """Real geographic corners for the frontend's ImageSource backdrop
    (see api/features.py's module docstring on why rotation is a raster/
    page-drawing concern, never a property of real geographic position --
    this endpoint is the one place that fact becomes actionable: it hands
    the frontend the frame's real, rotated footprint so it can position
    the (rotated, non-Mercator) raster picture correctly on a true-north
    MapLibre map with zero warping math on the frontend's side)."""
    state = _require_state(app)
    frame = state.frame
    # frame.map_corners() is [SW, SE, NE, NW] (its own documented order).
    # MapLibre's ImageSource.coordinates wants [top-left, top-right,
    # bottom-right, bottom-left] -- for this frame, top=north (row 0 of
    # every rendered tile is the northernmost row, see tiles.py), so that's
    # [NW, NE, SE, SW] -- the SAME four points, reversed.
    source_corners = frame.source_corners()  # [SW, SE, NE, NW] in SOURCE CRS
    nw_ne_se_sw = list(reversed(source_corners))
    corners_lonlat = [list(frame.inv.transform(x, y)) for x, y in nw_ne_se_sw]
    return {
        "centerLon": frame.center_lon,
        "centerLat": frame.center_lat,
        "extentM": frame.extent_m,
        "cornersLonLat": corners_lonlat,  # [NW, NE, SE, SW], MapLibre ImageSource order
        "backdropUrl": "/tiles/0/0/0.png?px=2048",
    }


@app.get("/api/sea")
def get_sea():
    """The current sea polygon, real WGS84 lon/lat -- for the fast vector
    view's own water fill (see map-editor plan's fast-vs-real rendering
    tier). `GET /api/features` deliberately never carries this: the sea
    lives in the store's `world_geom` table, not the `feature` table
    `query_features_bbox` reads (its own synthetic `__sea__`-tagged Feature
    is built in-memory only, for the raster pipeline -- see
    citymap.world.World.all_features). Returns `{"feature": null}` for a
    frame with no sea at all, the same "genuinely absent, not an error"
    convention api/features.py's own hit-test uses."""
    state = _require_state(app)
    frame = state.frame
    conn = gpkg_module.connect(state.store_path)
    try:
        sea_geom = gpkg_module.get_world_geom(conn, "sea")
    finally:
        conn.close()
    if sea_geom is None or sea_geom.is_empty:
        return {"feature": None}
    lonlat_geom = shapely.ops.transform(lambda x, y: frame.inv.transform(x, y), sea_geom)
    return {
        "feature": {
            "type": "Feature",
            "id": "sea-polygon",
            "geometry": shapely.geometry.mapping(lonlat_geom),
            "properties": {"id": "sea-polygon", "tags": {"__sea__": "true"}},
        }
    }


@app.get("/tiles/{z}/{x}/{y}.png")
def get_tile(
    z: int,
    x: int,
    y: int,
    # 4096 (not just the always-on backdrop's own 2048) exists for the
    # frontend's explicit on-demand "Render" action -- direct user request,
    # 2026-08-25: "2048 is very low resolution. 4K is better." A real
    # asymmetry from the always-on path: that one runs after every single
    # edit, so it stays cheap; this ceiling only ever gets used when a
    # human deliberately asks for the slower, higher-quality picture.
    px: int = Query(DEFAULT_TILE_PX, ge=16, le=4096, description="output tile side, pixels"),
    supersample: int = Query(1, ge=1, le=4, description="working-canvas multiplier before downsample"),
):
    state = _require_state(app)
    if z > MAX_ZOOM:
        raise HTTPException(status_code=400, detail=f"zoom {z} exceeds MAX_ZOOM={MAX_ZOOM}")
    try:
        path = state.renderer.get_tile(state.frame, state.style, state.fields, z, x, y, px, supersample)
    except tiles_module.TileError as e:
        raise HTTPException(status_code=400, detail=str(e))
    with open(path, "rb") as fh:
        data = fh.read()
    # Explicitly NOT a long-lived Cache-Control: this map is live-editable
    # (Phase 4 onward), and a browser aggressively caching tiles would make
    # an edit's re-render invisible until a hard refresh. Short/no caching
    # is the correct default until there is a real invalidation signal the
    # client can react to (an ETag keyed on the same manifest this module
    # already writes would be the natural next step, not built yet).
    return Response(content=data, media_type="image/png",
                    headers={"Cache-Control": "no-cache"})


def main() -> None:
    import uvicorn

    print(f"loading real Kurose data from {DEFAULT_STORE_PATH} ...", flush=True)
    frame = Frame.from_file(DEFAULT_FRAME_PATH)
    style = Style.from_file(DEFAULT_STYLE_PATH)
    fields = resolve_fields_from_store(DEFAULT_STORE_PATH, frame, style, DEFAULT_DEM_CACHE_DIR,
                                       REPO_ROOT, on_note=lambda m: print(m, flush=True))
    configure(app, frame, style, fields, DEFAULT_TILES_CACHE_DIR, DEFAULT_STORE_PATH, DEFAULT_DEM_CACHE_DIR)
    print("ready -- serving on http://127.0.0.1:8766", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8766)


if __name__ == "__main__":
    main()
