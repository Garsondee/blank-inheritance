# -*- coding: utf-8 -*-
"""POST /api/clear-ground -- map-editor plan Phase 12: a standalone tool to
retroactively clean up ground that already has old, never-deleted features
showing through it -- most immediately, the reclaims made earlier this
session before Phase 12's reclaim/terrace/wall-on-foundation fix existed.

Draw an outline, and every existing feature substantially contained within
it (citymap.tools.cleanup.features_substantially_contained -- the same
check reclaim/terrace/wall-on-foundation now run automatically on every new
construction, see those modules' own docstrings) is deleted under one
change_log batch_id, so Ctrl+Z restores all of them as a single step,
exactly like every other tool in this plan.

Unlike reclaim/terrace/wall-on-foundation, this tool writes NOTHING new (no
terrain edit, no landuse marker) -- it only ever deletes -- so it does its
own bbox-scoped tile invalidation (the same scoped path DELETE
/api/features/{id} already uses) instead of the expensive unconditional
invalidate_all_tiles those three call for their own, genuinely global,
terrain change.

Also unlike those three, running this twice over the same outline is a
normal, harmless no-op (the second run just finds nothing left to clear) --
so this deliberately returns 200 with an empty clearedFeatureIds list rather
than their 409-on-resubmit convention, which exists to catch an accidental
SECOND overlapping construction, a failure mode this tool cannot have.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import fields as fields_module
from citymap import ids as ids_module
from citymap import tiles as tiles_module
from citymap.render import LOCAL_FEATURE_MARGIN_M
from citymap.store import gpkg as gpkg_module
from citymap.tools import cleanup as cleanup_module

from api import edits as edits_module

router = APIRouter()


class ClearGroundRequest(BaseModel):
    outline: dict  # GeoJSON Polygon geometry, lon/lat (WGS84)
    thresholdFraction: float = cleanup_module.CONTAINMENT_FRACTION_DEFAULT


@router.post("/api/clear-ground")
def create_clear_ground(body: ClearGroundRequest, request: Request):
    state = request.app.state.map_state
    frame = state.frame

    try:
        outline_source = edits_module.reproject_geojson_to_source(frame, body.outline)
    except (ValueError, TypeError, AttributeError) as e:
        raise HTTPException(status_code=422, detail=f"invalid GeoJSON geometry: {e}")
    outline_source, repaired = edits_module.repair_geometry(outline_source)
    if outline_source is None or outline_source.is_empty:
        raise HTTPException(status_code=422, detail="outline is empty after reprojection/repair")

    coords = list(outline_source.exterior.coords)
    group_id = ids_module.derive_id(f"clear-ground:{coords}:{body.thresholdFraction}")

    conn = gpkg_module.connect(state.store_path)
    try:
        candidates = gpkg_module.query_features_bbox(conn, *outline_source.bounds)
        survivors = cleanup_module.features_substantially_contained(
            candidates, outline_source, threshold=body.thresholdFraction)

        cleared_ids = []
        old_geoms_source = []
        if survivors:
            with conn:
                for kwargs in survivors:
                    gpkg_module.delete_feature(conn, kwargs["id"], batch_id=group_id, bump=False)
                    cleared_ids.append(kwargs["id"])
                    old_geoms_source.append(kwargs["geom"])
                gpkg_module._bump_world_version(conn)
    finally:
        conn.close()

    for fid in cleared_ids:
        state.fields.replace_feature(fid, None)

    old_maps = [fields_module.geom_to_map_space(g, frame) for g in old_geoms_source
               if g is not None and not g.is_empty]
    map_bbox = edits_module.union_bounds(*old_maps)
    tiles_invalidated = 0
    if map_bbox is not None:
        minx, miny, maxx, maxy = map_bbox
        tiles_invalidated = tiles_module.invalidate_tiles_for_bbox(
            state.renderer.tiles_root, frame, state.style,
            minx, miny, maxx, maxy, margin_m=LOCAL_FEATURE_MARGIN_M, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "groupId": group_id if cleared_ids else None,
        "clearedFeatureIds": cleared_ids,
        "repaired": repaired,
        "tilesInvalidated": tiles_invalidated,
    }
