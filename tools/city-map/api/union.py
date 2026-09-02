# -*- coding: utf-8 -*-
"""POST /api/union -- map-editor plan Phase 14 (boolean operations,
union-only for v1, per the user's own explicit answer to that scope
question): merge 2+ selected features into one.

Takes ids, not geometry -- re-reads each feature's CURRENT stored geometry/
tags/height directly from the store rather than trusting client-supplied
geometry, matching this project's "server re-derives from the store"
discipline elsewhere (api/edits.py's PATCH, api/reclaim.py's sea read).
404s if any id no longer exists -- a real race (another edit or undo
deleted one of the selected features between the click and this request),
never silently ignored or silently dropped from the merge.

Writes ONE new feature (the merged geometry, id `{groupId}:merged`) and
deletes the N originals under one change_log batch_id
(citymap.tools.union.derive_union_group_id), so Ctrl+Z restores every
original and removes the merge as a single step -- reusing Phase 12's
bump=False-per-row-then-bump-once pattern: delete every original with
bump=False, insert_feature the merged result directly (which never
auto-bumps either -- see that function's own docstring), one explicit
_bump_world_version() call covers the whole batch.

No terrain change here (unlike reclaim/terrace/foundation) -- tile
invalidation is scoped to the union of every original's own bbox plus the
merged result's bbox, the same scoped path DELETE /api/features/{id}
already uses, not the expensive unconditional invalidate_all_tiles.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import fields as fields_module
from citymap import tiles as tiles_module
from citymap.parse import Feature
from citymap.render import LOCAL_FEATURE_MARGIN_M
from citymap.store import gpkg as gpkg_module
from citymap.tools import union as union_module

from api import edits as edits_module
from api import features as features_module

router = APIRouter()


class UnionRequest(BaseModel):
    featureIds: List[str]


@router.post("/api/union")
def create_union(body: UnionRequest, request: Request):
    state = request.app.state.map_state
    frame = state.frame

    conn = gpkg_module.connect(state.store_path)
    try:
        originals = []
        for fid in body.featureIds:
            kwargs = gpkg_module.get_feature_kwargs(conn, fid)
            if kwargs is None:
                raise HTTPException(status_code=404, detail=f"no feature with id={fid!r}")
            originals.append(kwargs)

        try:
            result = union_module.generate_union([o["geom"] for o in originals])
        except union_module.UnionError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # Largest-input-wins for the merged feature's own tags/height --
        # simplest rule that doesn't need a client-side disambiguation
        # picker for v1. Same size metric as api/features.py's own
        # pick_hit_test_winner: area for a polygon, length for a line.
        survivor = max(originals, key=lambda o: o["geom"].area if o["geom"].area > 0 else o["geom"].length)

        group_id = union_module.derive_union_group_id(body.featureIds)
        merged_id = f"{group_id}:merged"

        with conn:
            for o in originals:
                gpkg_module.delete_feature(conn, o["id"], batch_id=group_id, bump=False)
            gpkg_module.insert_feature(
                conn, id=merged_id, geom=result.geometry, tags=survivor["tags"],
                is_area=survivor["area"], height_m=survivor["height_m"], origin="hand",
                group_id=group_id, log=True, batch_id=group_id)
            gpkg_module._bump_world_version(conn)

        merged_kwargs = gpkg_module.get_feature_kwargs(conn, merged_id)
    finally:
        conn.close()

    for o in originals:
        state.fields.replace_feature(o["id"], None)
    merged_map = fields_module.rotate_and_clip([Feature(**merged_kwargs)], frame)
    state.fields.replace_feature(merged_id, merged_map[0] if merged_map else None)

    old_maps = [fields_module.geom_to_map_space(o["geom"], frame) for o in originals]
    new_map = fields_module.geom_to_map_space(result.geometry, frame)
    map_bbox = edits_module.union_bounds(*old_maps, new_map)
    tiles_invalidated = 0
    if map_bbox is not None:
        minx, miny, maxx, maxy = map_bbox
        tiles_invalidated = tiles_module.invalidate_tiles_for_bbox(
            state.renderer.tiles_root, frame, state.style,
            minx, miny, maxx, maxy, margin_m=LOCAL_FEATURE_MARGIN_M, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "groupId": group_id,
        "mergedFeature": features_module.feature_kwargs_to_geojson(merged_kwargs, frame),
        "becameMulti": result.became_multi,
        "removedFeatureIds": [o["id"] for o in originals],
        "tilesInvalidated": tiles_invalidated,
    }
