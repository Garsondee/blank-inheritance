# -*- coding: utf-8 -*-
"""POST /api/return-to-sea -- the explicit inverse of api/reclaim.py.

HTTP layer only, mirroring api/reclaim.py almost exactly (its own closest
sibling): reproject the drawn outline, fetch the store's CURRENT sea
geometry, call citymap.tools.return_to_sea.generate_return_to_sea, then
write the sea union + a flat sea-level terrain_edit under ONE change_log
batch_id -- Ctrl+Z undoes the whole thing as a single step, same batching
discipline as reclaim.py, just a two-table batch here (no landuse marker
feature -- flooding an area removes its "is this dry land" status, it
doesn't need a new tagged feature the way reclaiming created one).

Live-sync ordering is identical to reclaim.py's own, for the identical
reason: the sea Feature is replaced in Fields FIRST, then
resync_terrain_from_store (which re-reads Fields.sea_features() fresh for
its own sea-mask/hillshade computation), then invalidate_all_tiles.
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
from citymap.tools import return_to_sea as return_to_sea_module

from api import edits as edits_module

router = APIRouter()

SEA_WORLD_GEOM_KEY = "sea"
SEA_FEATURE_ID = "sea-polygon"  # matches api/reclaim.py's own SEA_FEATURE_ID
                                # (and citymap.world.World.all_features' own
                                # sea_feature(..., feature_id="sea-polygon"))


class ReturnToSeaRequest(BaseModel):
    outline: dict  # GeoJSON Polygon geometry, lon/lat (WGS84)
    blendM: float = return_to_sea_module.DEFAULT_BLEND_M


@router.post("/api/return-to-sea")
def create_return_to_sea(body: ReturnToSeaRequest, request: Request):
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
        try:
            result = return_to_sea_module.generate_return_to_sea(
                outline_source, current_sea_geom, blend_m=body.blendM, cell_size_m=cell_m)
        except return_to_sea_module.ReturnToSeaError as e:
            raise HTTPException(status_code=422, detail=str(e))

        coords = list(outline_source.exterior.coords)
        group_id = ids_module.derive_id(f"return-to-sea:{coords}:{body.blendM}")
        tier_id = f"{group_id}:edit0"

        try:
            with conn:
                gpkg_module.set_world_geom(conn, SEA_WORLD_GEOM_KEY, result.new_sea_geom, batch_id=group_id)
                gpkg_module.insert_terrain_edit(
                    conn, id=tier_id, geom=result.outline, target_elevation_m=result.target_elevation_m,
                    blend_m=result.blend_m, stack_order=0, group_id=group_id,
                    origin="hand", log=True, batch_id=group_id)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="a return-to-sea with this exact outline and parameters already exists "
                       "(resubmitted an identical request?)")
    finally:
        conn.close()

    sea_feature_kwargs = dict(id=SEA_FEATURE_ID, geom=result.new_sea_geom, tags={"__sea__": "true"},
                              area=True, height_m=0.0, source="hand")
    sea_feature_map = fields_module.rotate_and_clip([Feature(**sea_feature_kwargs)], frame)
    state.fields.replace_feature(SEA_FEATURE_ID, sea_feature_map[0] if sea_feature_map else None)

    state.fields.resync_terrain_from_store(state.store_path, state.dem_cache_dir, state.style)

    tiles_invalidated = tiles_module.invalidate_all_tiles(
        state.renderer.tiles_root, frame, state.style, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "groupId": group_id,
        "terrainEditId": tier_id,
        "repaired": repaired,
        "tilesInvalidated": tiles_invalidated,
    }
