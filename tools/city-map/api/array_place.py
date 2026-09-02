# -*- coding: utf-8 -*-
"""POST /api/array -- map-editor plan Phase 9 (wish #6): "a row of buildings
at even spacing along a road, a drawn line, or a ghost-line offset."

HTTP layer only: reproject the drawn unit footprint AND baseline, call
citymap.tools.array_place.place_array for the real placement/routing work,
write every ACCEPTED instance's footprint plus its (if any) routed
driveway as real `feature` rows under ONE change_log batch_id -- Ctrl+Z
undoes the whole array as a single step, reusing api/edits.py's EXISTING
undo path unchanged (arrays only ever create `feature`-table rows, and
undo_last_change already dispatches feature insert/delete generically since
Phase 6 -- no new undo machinery needed here, unlike Phase 7/8's
terrain_edit rows). Live-sync also reuses Phase 4/6's existing
`_sync_live_state` per new row (bbox-scoped tile invalidation, not
Phase 7/8's whole-frame invalidate_all_tiles -- an array touches no terrain
at all, so a plain per-feature bbox invalidation is the correct, cheaper
tool here).
"""

from __future__ import annotations

import sqlite3
from typing import List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import ids as ids_module
from citymap.store import gpkg as gpkg_module
from citymap.tools import array_place as array_place_module

from api import edits as edits_module
from api import features as features_module

router = APIRouter()


class ArrayPlaceRequest(BaseModel):
    unitFootprint: dict       # GeoJSON Polygon, lon/lat (WGS84)
    baseline: dict             # GeoJSON LineString, lon/lat (WGS84)
    spacingM: float
    unitHeightM: float = 5.0
    unitTags: dict = {"building": "yes"}
    orientationOffsetDeg: float = 0.0
    skipAccessRoad: bool = False


@router.post("/api/array")
def create_array(body: ArrayPlaceRequest, request: Request):
    state = request.app.state.map_state
    frame = state.frame

    try:
        unit_source = edits_module.reproject_geojson_to_source(frame, body.unitFootprint)
        baseline_source = edits_module.reproject_geojson_to_source(frame, body.baseline)
    except (ValueError, TypeError, AttributeError) as e:
        raise HTTPException(status_code=422, detail=f"invalid GeoJSON geometry: {e}")
    unit_source, unit_repaired = edits_module.repair_geometry(unit_source)
    baseline_source, baseline_repaired = edits_module.repair_geometry(baseline_source)
    if unit_source is None or unit_source.is_empty:
        raise HTTPException(status_code=422, detail="unit footprint is empty after reprojection/repair")
    if baseline_source is None or baseline_source.is_empty:
        raise HTTPException(status_code=422, detail="baseline is empty after reprojection/repair")

    try:
        result = array_place_module.place_array(
            unit_source, baseline_source, frame=frame, fields=state.fields,
            spacing_m=body.spacingM, unit_height_m=body.unitHeightM, unit_tags=body.unitTags,
            orientation_offset_deg=body.orientationOffsetDeg, skip_access_road=body.skipAccessRoad)
    except array_place_module.ArrayError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not result.instances:
        return {
            "groupId": None, "instanceFeatures": [], "roadFeatures": [],
            "skipped": [{"index": s.index, "reason": s.reason} for s in result.skipped],
            "unitRepaired": unit_repaired, "baselineRepaired": baseline_repaired,
            "tilesInvalidated": 0,
        }

    unit_coords = list(unit_source.exterior.coords)
    baseline_coords = list(baseline_source.coords)
    group_id = ids_module.derive_id(
        f"array:{baseline_coords}:{unit_coords}:{body.spacingM}:{body.unitHeightM}:"
        f"{body.unitTags}:{body.orientationOffsetDeg}:{body.skipAccessRoad}")

    conn = gpkg_module.connect(state.store_path)
    try:
        try:
            with conn:
                instance_ids: List[str] = []
                road_ids: List[str] = []
                for inst in result.instances:
                    instance_id = f"{group_id}:instance{inst.index}"
                    gpkg_module.insert_feature(
                        conn, id=instance_id, geom=inst.footprint, tags=body.unitTags,
                        is_area=True, height_m=body.unitHeightM, origin="hand",
                        group_id=group_id, log=True, batch_id=group_id)
                    instance_ids.append(instance_id)

                    if inst.access_road is not None:
                        road_id = f"{group_id}:road{inst.index}"
                        gpkg_module.insert_feature(
                            conn, id=road_id, geom=inst.access_road, tags={"highway": "service"},
                            is_area=False, height_m=0.0, origin="hand",
                            group_id=group_id, log=True, batch_id=group_id)
                        road_ids.append(road_id)

                gpkg_module._bump_world_version(conn)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="an array with this exact outline and parameters already exists "
                       "(resubmitted an identical request?)")

        instance_kwargs = [gpkg_module.get_feature_kwargs(conn, fid) for fid in instance_ids]
        road_kwargs = [gpkg_module.get_feature_kwargs(conn, fid) for fid in road_ids]
    finally:
        conn.close()

    tiles_invalidated = 0
    for kwargs in instance_kwargs + road_kwargs:
        if kwargs is None:
            continue
        tiles_invalidated += edits_module._sync_live_state(
            state, frame, kwargs["id"], None, kwargs["geom"], kwargs)

    return {
        "groupId": group_id,
        "instanceFeatures": [features_module.feature_kwargs_to_geojson(k, frame)
                             for k in instance_kwargs if k is not None],
        "roadFeatures": [features_module.feature_kwargs_to_geojson(k, frame)
                        for k in road_kwargs if k is not None],
        "skipped": [{"index": s.index, "reason": s.reason} for s in result.skipped],
        "unitRepaired": unit_repaired,
        "baselineRepaired": baseline_repaired,
        "tilesInvalidated": tiles_invalidated,
    }
