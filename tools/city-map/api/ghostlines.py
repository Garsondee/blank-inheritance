# -*- coding: utf-8 -*-
"""GET /api/ghost-lines -- map-editor plan Phase 5: parallel-to-road guide
lines ("creating things that are parallel to roads should be easy, so
'ghost lines' to show where these parallel lines are would be helpful").

The offset geometry itself is computed by citymap.geometry's offset_line/
offset_both_sides (added there, not a new citymap/geometry/ package -- a
plain citymap/geometry.py module already existed for pure geometry helpers
before this phase; see that module's own comment marking the new section),
in the frame's SOURCE CRS -- see that section's docstring for why this must
never be a browser-side computation. This module is the thin HTTP layer on
top:
find roads in the viewport (reusing api/features.py's own bbox-reprojection
helper, the same pattern api/edits.py already follows rather than
duplicating it), offset each one at every requested distance on both
sides, reproject the results to lon/lat, and return them honestly-capped --
same "truncation must be loud and exact, never silent" discipline as
/api/features.

Ghost lines are rendered by the frontend as a dashed line layer, excluded
from hit-testing (App.svelte) -- pure scaffolding, never a selectable
feature, never returned by /api/features or /api/hit-test.
"""

from __future__ import annotations

from typing import List

import shapely.geometry
import shapely.ops
from fastapi import APIRouter, HTTPException, Query, Request

from citymap import geometry as geometry_module
from citymap.frame import Frame
from citymap.store import gpkg as gpkg_module

from api import features as features_module

router = APIRouter()

DEFAULT_DISTANCES_M = [5.0, 10.0, 15.0]
# A hard ceiling on how many distances one request can ask for -- each one
# multiplies the offset work (two sides, every road in view), so this
# bounds worst-case cost the same way MAX_CAP bounds response size.
MAX_DISTANCES = 8
DEFAULT_CAP = 500
MAX_CAP = 2000


# --- pure logic (no FastAPI/DB touching -- directly unit-testable) ---------

def is_road_feature(kwargs: dict) -> bool:
    """A store row counts as a road for ghost-line purposes if it carries a
    highway=* tag and is a line, not an area -- the same tag key
    citymap.style.Style.knows_road checks, but NOT gated on the style
    already knowing how to RENDER that particular class: a ghost-line guide
    is useful even for a highway class the active style sheet hasn't been
    taught to draw yet."""
    geom = kwargs.get("geom")
    if geom is None or geom.is_empty or kwargs.get("area"):
        return False
    return bool(kwargs.get("tags", {}).get("highway"))


def ghost_lines_for_road(kwargs: dict, distances_m: List[float]) -> List[dict]:
    """Every real ghost-line part for one road feature, at every requested
    distance, both sides -- plain dicts {geom, parentId, distanceM, side},
    still in SOURCE CRS (reprojection to lon/lat happens once, in
    ghost_line_to_geojson, matching api/features.py's own split between
    "compute in SOURCE" and "reproject for the response")."""
    out = []
    for distance_m in distances_m:
        sides = geometry_module.offset_both_sides(kwargs["geom"], distance_m)
        for side, parts in sides.items():
            for part in parts:
                out.append({"geom": part, "parentId": kwargs["id"], "distanceM": distance_m, "side": side})
    return out


def parse_distances(raw: str) -> List[float]:
    """'5,10,15' -> [5.0, 10.0, 15.0]. Every value must be a real positive
    number; the list is capped at MAX_DISTANCES entries so a malformed or
    adversarial request can't demand an unbounded amount of offset work.
    Raises ValueError with a real, specific message on any bad input --
    the route turns this into a 422, never a silently-ignored default."""
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if not parts:
        raise ValueError("distances must include at least one value")
    if len(parts) > MAX_DISTANCES:
        raise ValueError(f"at most {MAX_DISTANCES} distances allowed, got {len(parts)}")
    values = []
    for p in parts:
        try:
            v = float(p)
        except ValueError:
            raise ValueError(f"'{p}' is not a real number")
        if v <= 0:
            raise ValueError(f"distance must be positive, got {v}")
        values.append(v)
    return values


def ghost_line_to_geojson(entry: dict, frame: Frame) -> dict:
    lonlat_geom = shapely.ops.transform(lambda x, y: frame.inv.transform(x, y), entry["geom"])
    return {
        "type": "Feature",
        "geometry": shapely.geometry.mapping(lonlat_geom),
        "properties": {
            "parentId": entry["parentId"],
            "distanceM": entry["distanceM"],
            "side": entry["side"],
        },
    }


# --- FastAPI route (thin -- delegates to the pure functions above) --------

@router.get("/api/ghost-lines")
def get_ghost_lines(
    request: Request,
    min_lon: float = Query(..., alias="minLon"),
    min_lat: float = Query(..., alias="minLat"),
    max_lon: float = Query(..., alias="maxLon"),
    max_lat: float = Query(..., alias="maxLat"),
    distances: str = Query(",".join(str(d) for d in DEFAULT_DISTANCES_M)),
    cap: int = Query(DEFAULT_CAP, ge=1, le=MAX_CAP),
):
    state = request.app.state.map_state
    frame = state.frame

    try:
        distances_m = parse_distances(distances)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    sminx, sminy, smaxx, smaxy = features_module.lonlat_bbox_to_source(
        frame, min_lon, min_lat, max_lon, max_lat)

    conn = gpkg_module.connect(state.store_path)
    try:
        candidates = gpkg_module.query_features_bbox(conn, sminx, sminy, smaxx, smaxy)
    finally:
        conn.close()

    roads = [c for c in candidates if is_road_feature(c)]
    all_entries: List[dict] = []
    for road in roads:
        all_entries.extend(ghost_lines_for_road(road, distances_m))

    hidden_by_cap = max(0, len(all_entries) - cap)
    visible = all_entries[:cap]
    return {
        "type": "FeatureCollection",
        "features": [ghost_line_to_geojson(e, frame) for e in visible],
        "hiddenByCap": hidden_by_cap,
        "truncated": hidden_by_cap > 0,
    }
