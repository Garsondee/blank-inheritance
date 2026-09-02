# -*- coding: utf-8 -*-
"""POST /api/terrace -- map-editor plan Phase 7: "draw an outline, set
benches/step/inset, get a real stepped elevation with contours and
hillshade that follow it."

The elevation mechanism itself needed no new work (see
citymap.tools.terrace's own module docstring); this module is the HTTP
layer over that pure generator plus the store-write choke point for
terrain: reproject/repair the drawn outline, generate the real ordered
TerrainEdit stack and riser polygons, write ALL of it (every tier, every
riser) under ONE change_log batch_id so Ctrl+Z undoes the whole terrace as
a single step (gpkg.undo_last_change's existing batch grouping, no new
machinery needed), then resync live state.

Live sync here looks different from api/edits.py's feature PATCH: a
terrain edit changes the elevation array itself, and hillshade
(terrain.horizon_shadow) is a genuinely GLOBAL computation -- see
Fields.resync_terrain_from_store and tiles.invalidate_all_tiles's own
docstrings for why this rebuilds from the store's full current edit list
and invalidates every cached tile, not just a cropped bbox the way a
single feature's edit does.

Phase 12 addition: before writing the tier/riser rows, any EXISTING feature
substantially contained within the drawn outline
(citymap.tools.cleanup.features_substantially_contained) is deleted under
the SAME batch_id, so Ctrl+Z undoes the whole terrace -- new tiers/risers
AND cleared old features -- as one step. These deletes pass bump=False;
the loop's own final _bump_world_version() call remains the one-and-only
bump for the whole batch.
"""

from __future__ import annotations

import sqlite3
from typing import List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import fields as fields_module
from citymap import ids as ids_module
from citymap import tiles as tiles_module
from citymap.parse import Feature
from citymap.store import gpkg as gpkg_module
from citymap.tools import cleanup as cleanup_module
from citymap.tools import terrace as terrace_module

from api import edits as edits_module
from api import features as features_module

router = APIRouter()


class TerraceRequest(BaseModel):
    outline: dict  # GeoJSON Polygon geometry, lon/lat (WGS84)
    baseElevationM: float
    tiers: int = 3
    stepHeightM: float = 2.0
    insetM: float = 15.0
    blendM: float = 5.0
    mode: str = "fill"


@router.post("/api/terrace")
def create_terrace(body: TerraceRequest, request: Request):
    state = request.app.state.map_state
    frame = state.frame

    try:
        outline_source = edits_module.reproject_geojson_to_source(frame, body.outline)
    except (ValueError, TypeError, AttributeError) as e:
        raise HTTPException(status_code=422, detail=f"invalid GeoJSON geometry: {e}")
    outline_source, repaired = edits_module.repair_geometry(outline_source)
    if outline_source is None or outline_source.is_empty:
        raise HTTPException(status_code=422, detail="outline is empty after reprojection/repair")

    cell_m = frame.extent_m / frame.dem_grid
    try:
        result = terrace_module.generate_terrace(
            outline_source, base_elevation_m=body.baseElevationM, tiers=body.tiers,
            step_height_m=body.stepHeightM, inset_m=body.insetM, blend_m=body.blendM,
            cell_size_m=cell_m, mode=body.mode)
    except terrace_module.TerraceError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # A deterministic id from every input that defines this exact terrace --
    # ties the tiers together (terrain_edit.group_id's own documented
    # purpose) AND doubles as the change_log batch_id, so re-submitting the
    # identical outline+parameters collides (same 409-on-duplicate-geometry
    # discipline as POST /api/features) instead of silently minting a
    # second overlapping terrace.
    coords = list(outline_source.exterior.coords)
    group_id = ids_module.derive_id(
        f"terrace:{coords}:{body.tiers}:{body.stepHeightM}:{body.insetM}:{body.blendM}:"
        f"{body.mode}:{body.baseElevationM}")

    conn = gpkg_module.connect(state.store_path)
    try:
        candidates = gpkg_module.query_features_bbox(conn, *outline_source.bounds)
        cleared_candidates = cleanup_module.features_substantially_contained(candidates, outline_source)

        try:
            with conn:
                for kwargs in cleared_candidates:
                    gpkg_module.delete_feature(conn, kwargs["id"], batch_id=group_id, bump=False)

                tier_ids: List[str] = []
                for tier in result.tiers:
                    tier_id = f"{group_id}:tier{tier.stack_order}"
                    gpkg_module.insert_terrain_edit(
                        conn, id=tier_id, geom=tier.polygon, target_elevation_m=tier.target_elevation_m,
                        blend_m=tier.blend_m, stack_order=tier.stack_order, group_id=group_id,
                        origin="hand", log=True, batch_id=group_id)
                    tier_ids.append(tier_id)

                riser_ids: List[str] = []
                for i, riser in enumerate(result.risers):
                    riser_id = f"{group_id}:riser{i}"
                    gpkg_module.insert_feature(
                        conn, id=riser_id, geom=riser.polygon,
                        tags={"building": "retaining_wall", "man_made": "retaining_wall"},
                        is_area=True, height_m=riser.height_m, origin="hand",
                        group_id=group_id, log=True, batch_id=group_id)
                    riser_ids.append(riser_id)

                gpkg_module._bump_world_version(conn)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="a terrace with this exact outline and parameters already exists "
                       "(resubmitted an identical request?)")

        riser_kwargs = [gpkg_module.get_feature_kwargs(conn, rid) for rid in riser_ids]
    finally:
        conn.close()

    cleared_ids = [kwargs["id"] for kwargs in cleared_candidates]
    for fid in cleared_ids:
        state.fields.replace_feature(fid, None)

    state.fields.resync_terrain_from_store(state.store_path, state.dem_cache_dir, state.style)
    for kwargs in riser_kwargs:
        map_features = fields_module.rotate_and_clip([Feature(**kwargs)], frame) if kwargs else []
        if kwargs:
            state.fields.replace_feature(kwargs["id"], map_features[0] if map_features else None)

    tiles_invalidated = tiles_module.invalidate_all_tiles(
        state.renderer.tiles_root, frame, state.style, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "groupId": group_id,
        "terrainEditIds": tier_ids,
        "riserFeatures": [features_module.feature_kwargs_to_geojson(k, frame)
                         for k in riser_kwargs if k is not None],
        "clearedFeatureIds": cleared_ids,
        "repaired": repaired,
        "tilesInvalidated": tiles_invalidated,
    }
