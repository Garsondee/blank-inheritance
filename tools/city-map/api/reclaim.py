# -*- coding: utf-8 -*-
"""POST /api/reclaim -- map-editor plan Phase 10 (wish #3, reclaim half):
"reclaim as its own tool."

HTTP layer only: reproject the drawn outline, fetch the store's CURRENT sea
geometry, call citymap.tools.reclaim.generate_reclaim for the real
carve-and-elevate computation, then write THREE things under ONE
change_log batch_id so Ctrl+Z undoes the whole reclaim as a single step --
a `world_geom['sea']` update (Phase 10's own new gpkg.py capability), a
flat `terrain_edit` row (the freeboard elevation), and a `feature` row (a
landuse=construction marker, matching apply_construct's own established
offshore-reclaim tagging) -- reusing Phase 7/8's exact batching discipline
for a third table now, not new machinery.

Live-sync ordering matters and is deliberate: the sea Feature
("sea-polygon", the same id/tags citymap.world.all_features'/sea_feature's
own synthesis convention uses) is replaced in Fields FIRST, then
resync_terrain_from_store runs -- that function re-reads
Fields.sea_features() fresh for its own internal sea-mask/hillshade
computation, so it must see the NEW sea geometry, not the one about to be
replaced. Reusing Phase 7's resync + Phase 7/8's invalidate_all_tiles
outright rather than inventing parallel machinery -- a reclaim's terrain
edit has exactly the same "hillshade reach is global" property theirs do.

Phase 12 addition: before writing the new sea/terrain/landuse rows, any
EXISTING feature substantially contained within the drawn outline
(citymap.tools.cleanup.features_substantially_contained -- see that
module's own docstring for why this, not a rendering-order fix, is the real
cause of "reclaiming where old land used to be leaves ugly stuff showing
through") is deleted under the SAME batch_id, so Ctrl+Z undoes the whole
reclaim -- new land AND cleared old features -- as one step. These deletes
pass bump=False; set_world_geom's own unconditional bump right below them
remains the one-and-only bump this request needs (see the comment at that
call).
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import fields as fields_module
from citymap import ids as ids_module
from citymap import tiles as tiles_module
from citymap.parse import Feature
from citymap.store import gpkg as gpkg_module
from citymap.tools import cleanup as cleanup_module
from citymap.tools import reclaim as reclaim_module

from api import edits as edits_module
from api import features as features_module

router = APIRouter()

SEA_WORLD_GEOM_KEY = "sea"
SEA_FEATURE_ID = "sea-polygon"  # matches citymap.world.World.all_features'
                                # own sea_feature(..., feature_id="sea-polygon")


class ReclaimRequest(BaseModel):
    outline: dict  # GeoJSON Polygon geometry, lon/lat (WGS84)
    freeboardM: float = reclaim_module.DEFAULT_FREEBOARD_M
    blendM: float = reclaim_module.DEFAULT_BLEND_M


@router.post("/api/reclaim")
def create_reclaim(body: ReclaimRequest, request: Request):
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
    conn = gpkg_module.connect(state.store_path)
    try:
        current_sea_geom = gpkg_module.get_world_geom(conn, SEA_WORLD_GEOM_KEY)
        candidates = gpkg_module.query_features_bbox(conn, *outline_source.bounds)
        cleared_candidates = cleanup_module.features_substantially_contained(candidates, outline_source)
        try:
            result = reclaim_module.generate_reclaim(
                outline_source, current_sea_geom, freeboard_m=body.freeboardM,
                blend_m=body.blendM, cell_size_m=cell_m)
        except reclaim_module.ReclaimError as e:
            raise HTTPException(status_code=422, detail=str(e))

        coords = list(outline_source.exterior.coords)
        group_id = ids_module.derive_id(
            f"reclaim:{coords}:{body.freeboardM}:{body.blendM}")
        tier_id = f"{group_id}:edit0"
        landuse_id = f"{group_id}:land0"

        try:
            with conn:
                # Clear whatever was already on the ground before laying the
                # new reclaim over it -- see the module docstring's Phase 12
                # note. bump=False: set_world_geom bumps meta.world_version
                # itself, unconditionally (matches update_feature_geom's own
                # convention) -- insert_terrain_edit/insert_feature do NOT
                # (matches THEIR convention: the caller bumps once, per
                # Phase 7/8's own pattern). Composing everything under one
                # transaction means set_world_geom's own bump is already the
                # one-and-only bump this request needs; an extra explicit
                # _bump_world_version() call here would double it.
                for kwargs in cleared_candidates:
                    gpkg_module.delete_feature(conn, kwargs["id"], batch_id=group_id, bump=False)
                gpkg_module.set_world_geom(conn, SEA_WORLD_GEOM_KEY, result.new_sea_geom, batch_id=group_id)
                gpkg_module.insert_terrain_edit(
                    conn, id=tier_id, geom=result.land_polygon, target_elevation_m=result.target_elevation_m,
                    blend_m=result.blend_m, stack_order=0, group_id=group_id,
                    origin="hand", log=True, batch_id=group_id)
                gpkg_module.insert_feature(
                    conn, id=landuse_id, geom=result.land_polygon, tags={"landuse": "construction"},
                    is_area=True, height_m=0.0, origin="hand", group_id=group_id,
                    log=True, batch_id=group_id)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="a reclaim with this exact outline and parameters already exists "
                       "(resubmitted an identical request?)")

        landuse_kwargs = gpkg_module.get_feature_kwargs(conn, landuse_id)
    finally:
        conn.close()

    cleared_ids = [kwargs["id"] for kwargs in cleared_candidates]
    for fid in cleared_ids:
        state.fields.replace_feature(fid, None)

    sea_feature_kwargs = dict(id=SEA_FEATURE_ID, geom=result.new_sea_geom, tags={"__sea__": "true"},
                              area=True, height_m=0.0, source="hand")
    sea_feature_map = fields_module.rotate_and_clip([Feature(**sea_feature_kwargs)], frame)
    state.fields.replace_feature(SEA_FEATURE_ID, sea_feature_map[0] if sea_feature_map else None)

    state.fields.resync_terrain_from_store(state.store_path, state.dem_cache_dir, state.style)

    if landuse_kwargs is not None:
        landuse_map = fields_module.rotate_and_clip([Feature(**landuse_kwargs)], frame)
        state.fields.replace_feature(landuse_id, landuse_map[0] if landuse_map else None)

    tiles_invalidated = tiles_module.invalidate_all_tiles(
        state.renderer.tiles_root, frame, state.style, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "groupId": group_id,
        "terrainEditId": tier_id,
        "landFeature": (features_module.feature_kwargs_to_geojson(landuse_kwargs, frame)
                       if landuse_kwargs is not None else None),
        "clearedFeatureIds": cleared_ids,
        "repaired": repaired,
        "tilesInvalidated": tiles_invalidated,
    }
