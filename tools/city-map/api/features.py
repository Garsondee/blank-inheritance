# -*- coding: utf-8 -*-
"""Vector feature endpoints -- map-editor plan Phase 3: click any building
or road, see its real id/tags/height/provenance.

Two endpoints, two different jobs:

**GET /api/features** -- what the MapLibre vector overlay loads for the
current viewport. Honestly bounded: an exact `hiddenByLod` (features
present but decluttered at this zoom) and `hiddenByCap` (features that
would show at this zoom but exceed the response cap) -- never a silent
truncation. This is the discipline the abandoned pre-Phase-1 live-vector
editor lacked (see tiles.py's module docstring and editor/server.py's own
account of that failure) -- the picture never comes from this query (it
comes from the Phase 2 tile server), so a capped/filtered result here can
never make the MAP look broken, only limit what's currently clickable.

**POST /api/hit-test** -- a single point -> the real feature there,
independent of whatever happens to be loaded in the viewport's vector
layer right now. Works at any zoom, with no LOD involved at all, because
it queries the store directly rather than relying on what the client
already has.

Coordinates: the store's geometry lives in SOURCE CRS (unrotated,
frame-invariant -- see world.py). Every response here is reprojected to
real WGS84 lon/lat via frame.inv, because that is what GeoJSON -- and
MapLibre, which is fundamentally Mercator/lon-lat based -- expects.
Reprojecting to true lon/lat does NOT undo this map's deliberate page
rotation: rotation is a property of how the raster picture is drawn on the
page (frame.to_map), never a property of a feature's real geographic
position, so vector features returned here are correctly unrotated real
coordinates, exactly matching where the rotated raster backdrop (placed by
its own real 4 corners, see main.py) visually puts them.
"""

from __future__ import annotations

import math
from typing import Optional

import shapely.geometry
import shapely.ops
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from citymap.frame import Frame
from citymap.store import gpkg as gpkg_module

router = APIRouter()

DEFAULT_CAP = 500
MAX_CAP = 5000
# A feature whose bounding-box DIAGONAL is smaller than this many pixels at
# the requested mpp is decluttered, not shown -- diagonal (not area), so a
# long thin road (near-zero bbox AREA relative to its visual length) is not
# wrongly treated as invisible the way an area threshold would treat it.
MIN_PX_DIAGONAL = 3.0
DEFAULT_HIT_TEST_TOLERANCE_M = 2.0


# --- pure logic (no FastAPI/DB touching -- directly unit-testable) ---------

def bbox_diagonal_m(bounds: tuple) -> float:
    minx, miny, maxx, maxy = bounds
    return math.hypot(maxx - minx, maxy - miny)


def lonlat_bbox_to_source(frame: Frame, min_lon: float, min_lat: float,
                          max_lon: float, max_lat: float) -> tuple:
    """A lon/lat viewport bbox -> an axis-aligned SOURCE CRS bbox for the
    store's R-tree query. Transforms all 4 corners and takes the envelope
    (not just 2 opposite corners) -- projection can skew a rectangle, and
    at this scale (a few km) the envelope of 4 transformed corners is the
    correct, standard way to bound it, not an approximation of convenience.
    """
    corners = [(min_lon, min_lat), (max_lon, min_lat), (max_lon, max_lat), (min_lon, max_lat)]
    pts = [frame.fwd.transform(lon, lat) for lon, lat in corners]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def apply_lod_filter(candidates: list, mpp: float, cap: int,
                     min_px_diagonal: float = MIN_PX_DIAGONAL) -> dict:
    """candidates: list of store-row kwargs dicts (from
    gpkg.query_features_bbox), each with a `geom` key.

    Returns {"visible": [...kwargs, capped], "hiddenByLod": int, "hiddenByCap": int}.
    Both counts are EXACT over the full candidate set, never estimated --
    the whole point of this function existing separately from the FastAPI
    route is that this exactness is easy to unit-test without a database.
    """
    min_diag_m = min_px_diagonal * mpp
    passed_lod = []
    hidden_by_lod = 0
    for kwargs in candidates:
        geom = kwargs.get("geom")
        if geom is None or geom.is_empty:
            hidden_by_lod += 1
            continue
        if bbox_diagonal_m(geom.bounds) < min_diag_m:
            hidden_by_lod += 1
            continue
        passed_lod.append(kwargs)

    hidden_by_cap = max(0, len(passed_lod) - cap)
    return {"visible": passed_lod[:cap], "hiddenByLod": hidden_by_lod, "hiddenByCap": hidden_by_cap}


def pick_hit_test_winner(candidates: list, query_geom) -> Optional[dict]:
    """The smallest-metric (area for polygons/area-tagged features, length
    for lines, 0 -- always wins -- for points) candidate that actually
    intersects query_geom. Smallest wins so a small building inside a
    larger landuse parcel gets the click, not the parcel behind it."""
    best, best_metric = None, float("inf")
    for kwargs in candidates:
        geom = kwargs.get("geom")
        if geom is None or geom.is_empty or not geom.intersects(query_geom):
            continue
        metric = geom.area if geom.area > 0 else geom.length
        if metric < best_metric:
            best, best_metric = kwargs, metric
    return best


def feature_kwargs_to_geojson(kwargs: dict, frame: Frame) -> dict:
    """A store row -> a real GeoJSON Feature, geometry reprojected from
    SOURCE CRS to WGS84 lon/lat."""
    geom = kwargs["geom"]
    lonlat_geom = shapely.ops.transform(lambda x, y: frame.inv.transform(x, y), geom)
    return {
        "type": "Feature",
        "id": kwargs["id"],
        "geometry": shapely.geometry.mapping(lonlat_geom),
        "properties": {
            "id": kwargs["id"],
            "tags": kwargs["tags"],
            "isArea": kwargs["area"],
            "heightM": kwargs["height_m"],
            "source": kwargs["source"],
        },
    }


# --- FastAPI routes (thin -- delegate to the pure functions above) --------

class HitTestRequest(BaseModel):
    lon: float
    lat: float
    toleranceM: float = DEFAULT_HIT_TEST_TOLERANCE_M


@router.get("/api/features")
def get_features(
    request: Request,
    min_lon: float = Query(..., alias="minLon"),
    min_lat: float = Query(..., alias="minLat"),
    max_lon: float = Query(..., alias="maxLon"),
    max_lat: float = Query(..., alias="maxLat"),
    mpp: float = Query(..., gt=0),
    cap: int = Query(DEFAULT_CAP, ge=1, le=MAX_CAP),
):
    state = request.app.state.map_state
    frame = state.frame
    sminx, sminy, smaxx, smaxy = lonlat_bbox_to_source(frame, min_lon, min_lat, max_lon, max_lat)

    conn = gpkg_module.connect(state.store_path)
    try:
        candidates = gpkg_module.query_features_bbox(conn, sminx, sminy, smaxx, smaxy)
    finally:
        conn.close()

    result = apply_lod_filter(candidates, mpp, cap)
    return {
        "type": "FeatureCollection",
        "features": [feature_kwargs_to_geojson(k, frame) for k in result["visible"]],
        "hiddenByLod": result["hiddenByLod"],
        "hiddenByCap": result["hiddenByCap"],
        "truncated": result["hiddenByCap"] > 0,
    }


@router.post("/api/hit-test")
def hit_test(body: HitTestRequest, request: Request):
    state = request.app.state.map_state
    frame = state.frame
    sx, sy = frame.fwd.transform(body.lon, body.lat)
    query_geom = shapely.geometry.Point(sx, sy).buffer(body.toleranceM)
    minx, miny, maxx, maxy = query_geom.bounds

    conn = gpkg_module.connect(state.store_path)
    try:
        candidates = gpkg_module.query_features_bbox(conn, minx, miny, maxx, maxy)
    finally:
        conn.close()

    winner = pick_hit_test_winner(candidates, query_geom)
    if winner is None:
        return {"feature": None}
    return {"feature": feature_kwargs_to_geojson(winner, frame)}
