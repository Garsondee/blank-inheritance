# -*- coding: utf-8 -*-
"""POST /api/causeway -- map-editor plan Phase 10 (wish #3, causeway half):
route a real, curvature-constrained road from a point to the nearest real
road, crossing water via a real bridge span when needed.

HTTP layer only: reproject the given start point, call citymap.tools.
causeway.route_causeway for the real A*/bridge-cost work, then write the
routed LineString through the SAME create_feature choke point Phase 6's
POST /api/features already uses -- no new store machinery needed, since a
routed causeway is, once computed, just an ordinary highway=* feature (same
as a hand-drawn road), touching no terrain and needing no batch of rows.
Tagged bridge=yes ONLY when the route actually crossed water -- never
blanket-tagged, since render_tile's bridge z-order pass (a real elevated-
deck redraw with its own cast shadow) would be visibly wrong painted onto a
route that never left dry land.
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import ids as ids_module
from citymap.store import gpkg as gpkg_module
from citymap.tools import causeway as causeway_module

from api import edits as edits_module
from api import features as features_module

router = APIRouter()


class CausewayRequest(BaseModel):
    startPoint: dict  # GeoJSON Point, lon/lat (WGS84)
    highwayClass: str = "service"


@router.post("/api/causeway")
def create_causeway(body: CausewayRequest, request: Request):
    state = request.app.state.map_state
    frame = state.frame

    try:
        start_source = edits_module.reproject_geojson_to_source(frame, body.startPoint)
    except (ValueError, TypeError, AttributeError) as e:
        raise HTTPException(status_code=422, detail=f"invalid GeoJSON geometry: {e}")
    if start_source.geom_type != "Point":
        raise HTTPException(status_code=422, detail="startPoint must be a GeoJSON Point")

    try:
        result = causeway_module.route_causeway(
            start_source, frame, state.fields, highway_class=body.highwayClass)
    except causeway_module.CausewayError as e:
        raise HTTPException(status_code=422, detail=str(e))

    tags = {"highway": body.highwayClass}
    if result.crosses_water:
        tags["bridge"] = "yes"

    coords = list(result.route.coords)
    feature_id = ids_module.geometry_feature_id(body.highwayClass, coords, extra="causeway")

    conn = gpkg_module.connect(state.store_path)
    try:
        try:
            with conn:
                gpkg_module.create_feature(conn, id=feature_id, geom=result.route, tags=tags,
                                          is_area=False, height_m=0.0, origin="hand")
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="a causeway with this exact route already exists "
                       "(resubmitted an identical request?)")
        current_kwargs = gpkg_module.get_feature_kwargs(conn, feature_id)
    finally:
        conn.close()

    tiles_invalidated = edits_module._sync_live_state(state, frame, feature_id, None, result.route, current_kwargs)

    return {
        "feature": features_module.feature_kwargs_to_geojson(current_kwargs, frame),
        "crossesWater": result.crosses_water,
        "lengthM": result.length_m,
        "tilesInvalidated": tiles_invalidated,
    }
