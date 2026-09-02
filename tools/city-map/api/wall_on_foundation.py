# -*- coding: utf-8 -*-
"""POST /api/wall-on-foundation -- map-editor plan Phase 8 (wish #4): "draw
a footprint, get a terraced foundation with a thick wall on its top bench."

HTTP layer only, mirroring api/terrace.py almost exactly (its own closest
sibling, not a coincidence -- see citymap.tools.wall_on_foundation's module
docstring: this whole feature is generate_terrace, Phase 7's own math,
unchanged, plus one new wall ring). Reuses every live-sync mechanism Phase 7
already built rather than inventing a second one: Fields.
resync_terrain_from_store for the terrain half, tiles.invalidate_all_tiles
for the same reason a plain terrace needs it (a terrain edit's hillshade
reach is global -- see that module's own docstring), and ONE change_log
batch_id covering every tier/riser/wall-segment row so Ctrl+Z undoes the
whole foundation-plus-wall as a single step -- no new undo machinery, just
Phase 4/6/7's existing batch grouping applied to a third kind of multi-row
write.

Phase 12 addition: before writing the tier/riser/wall rows, any EXISTING
feature substantially contained within the drawn outline
(citymap.tools.cleanup.features_substantially_contained) is deleted under
the SAME batch_id -- same reasoning and mechanism as api/terrace.py's own
Phase 12 addition, since a foundation is exactly a terrace plus one more
row kind. These deletes pass bump=False; the loop's own final
_bump_world_version() call remains the one-and-only bump for the batch.
"""

from __future__ import annotations

import sqlite3
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from shapely.geometry import Polygon

from citymap import fields as fields_module
from citymap import ids as ids_module
from citymap import tiles as tiles_module
from citymap.parse import Feature
from citymap.store import gpkg as gpkg_module
from citymap.tools import cleanup as cleanup_module
from citymap.tools import wall_on_foundation as wall_on_foundation_module

from api import edits as edits_module
from api import features as features_module

router = APIRouter()


class WallOnFoundationRequest(BaseModel):
    outline: dict  # GeoJSON Polygon geometry, lon/lat (WGS84)
    baseElevationM: float
    tiers: int = 3
    stepHeightM: float = 2.0
    insetM: float = 15.0
    blendM: float = 5.0
    mode: str = "fill"
    wallThicknessM: float = 3.0
    wallHeightM: float = 5.0
    wallTags: Optional[dict] = None


@router.post("/api/wall-on-foundation")
def create_wall_on_foundation(body: WallOnFoundationRequest, request: Request):
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
        result = wall_on_foundation_module.generate_wall_on_foundation(
            outline_source, base_elevation_m=body.baseElevationM, tiers=body.tiers,
            step_height_m=body.stepHeightM, inset_m=body.insetM, blend_m=body.blendM,
            cell_size_m=cell_m, wall_thickness_m=body.wallThicknessM,
            wall_height_m=body.wallHeightM, mode=body.mode, wall_tags=body.wallTags)
    except wall_on_foundation_module.TerraceError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # A deterministic id from every input that defines this exact
    # foundation+wall -- doubles as the terrain_edit/feature rows' shared
    # group_id AND the change_log batch_id, matching api/terrace.py's own
    # discipline: re-submitting an identical outline+parameters collides on
    # id (a clean 409) instead of silently minting a second overlapping one.
    coords = list(outline_source.exterior.coords)
    group_id = ids_module.derive_id(
        f"wall-on-foundation:{coords}:{body.tiers}:{body.stepHeightM}:{body.insetM}:{body.blendM}:"
        f"{body.mode}:{body.baseElevationM}:{body.wallThicknessM}:{body.wallHeightM}")

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

                wall_ids: List[str] = []
                for i, seg in enumerate(result.wall_segments):
                    wall_id = f"{group_id}:wall{i}"
                    gpkg_module.insert_feature(
                        conn, id=wall_id, geom=Polygon(seg.footprint), tags=seg.tags,
                        is_area=True, height_m=seg.height_m, origin="hand",
                        group_id=group_id, log=True, batch_id=group_id)
                    wall_ids.append(wall_id)

                gpkg_module._bump_world_version(conn)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="a wall-on-foundation with this exact outline and parameters already exists "
                       "(resubmitted an identical request?)")

        riser_kwargs = [gpkg_module.get_feature_kwargs(conn, rid) for rid in riser_ids]
        wall_kwargs = [gpkg_module.get_feature_kwargs(conn, wid) for wid in wall_ids]
    finally:
        conn.close()

    cleared_ids = [kwargs["id"] for kwargs in cleared_candidates]
    for fid in cleared_ids:
        state.fields.replace_feature(fid, None)

    state.fields.resync_terrain_from_store(state.store_path, state.dem_cache_dir, state.style)
    for kwargs in riser_kwargs + wall_kwargs:
        if kwargs is None:
            continue
        map_features = fields_module.rotate_and_clip([Feature(**kwargs)], frame)
        state.fields.replace_feature(kwargs["id"], map_features[0] if map_features else None)

    tiles_invalidated = tiles_module.invalidate_all_tiles(
        state.renderer.tiles_root, frame, state.style, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "groupId": group_id,
        "terrainEditIds": tier_ids,
        "riserFeatures": [features_module.feature_kwargs_to_geojson(k, frame)
                         for k in riser_kwargs if k is not None],
        "wallFeatures": [features_module.feature_kwargs_to_geojson(k, frame)
                        for k in wall_kwargs if k is not None],
        "clearedFeatureIds": cleared_ids,
        "repaired": repaired,
        "tilesInvalidated": tiles_invalidated,
    }
