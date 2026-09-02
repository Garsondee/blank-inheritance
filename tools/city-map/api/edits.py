# -*- coding: utf-8 -*-
"""Write endpoints. `PATCH /api/features/{id}` (Phase 4) is the single
write choke point the plan calls for: every geometry edit, from any tool
(Terra Draw's vertex drag, arrays/terracing in later phases), should end up
here rather than writing citymap.store.gpkg directly, so tile invalidation
and live in-memory Fields sync (see _sync_live_state below) always happen
together with the store write, never separately and never forgotten.
`POST /api/features` (Phase 6) is the same discipline applied to CREATING a
new feature -- drawing a road, most immediately -- and reports real
connectivity (does each end land on an existing road, and how many other
roads share that point) so "did this actually connect" is never a guess.

Coordinates: a PATCH body's geometry is real GeoJSON lon/lat (WGS84) --
what MapLibre/Terra Draw always work in, the exact inverse of
api/features.py's feature_kwargs_to_geojson. Reprojected to this frame's
SOURCE CRS before anything else happens, because that is what the store
holds and what render_tile ultimately draws from.

**Why a write here does not wait for a server restart to become visible.**
AppState.fields (citymap/api/main.py) is a single in-memory Fields object,
built once at process startup and cached on disk keyed by
meta.world_version (see citymap/store/load.py's resolve_fields_from_store).
A naive write-only-to-the-store implementation would be *correct* on the
next process restart (world_version bumped -> cache miss -> real rebuild)
but would show STALE tiles and STALE /api/features results for the entire
rest of the current process's life -- unacceptable for an editor whose
whole point is "make an edit, see it rendered." _sync_live_state patches
the running Fields object directly (Fields.replace_feature) and deletes
just the cached tile files the edit's own bbox actually touches
(tiles.invalidate_tiles_for_bbox) -- both cheap, targeted operations, never
the ~155s full rebuild.
"""

from __future__ import annotations

import sqlite3
from typing import Optional

import shapely.geometry
import shapely.ops
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from citymap import fields as fields_module
from citymap import ids as ids_module
from citymap import tiles as tiles_module
from citymap.frame import Frame
from citymap.parse import Feature
from citymap.render import LOCAL_FEATURE_MARGIN_M
from citymap.store import gpkg as gpkg_module

from api import features as features_module

router = APIRouter()


# --- pure logic (no FastAPI/DB touching -- directly unit-testable) ---------

def reproject_geojson_to_source(frame: Frame, geojson_geometry: dict):
    """A GeoJSON geometry (lon/lat, WGS84 -- what Terra Draw/MapLibre always
    produce) -> a shapely geometry in this frame's SOURCE CRS, ready to
    store. The exact inverse of api/features.py's feature_kwargs_to_geojson."""
    lonlat_geom = shapely.geometry.shape(geojson_geometry)
    return shapely.ops.transform(lambda lon, lat: frame.fwd.transform(lon, lat), lonlat_geom)


def repair_geometry(geom):
    """(geom, was_repaired). A hand-edit can produce a geometry render_tile's
    own shapely calls choke on -- most commonly a self-intersecting
    "bowtie" polygon from a vertex dragged across its own outline. Repaired
    via the standard buffer(0) idiom rather than rejected outright --
    rejecting would throw away a real, mid-drag edit the user is actively
    trying to commit. The repair is reported, never silent -- see the
    map-editor plan's Phase 4 validation rules."""
    if geom is None or geom.is_empty or geom.is_valid:
        return geom, False
    return geom.buffer(0), True


def is_road_feature(kwargs: dict) -> bool:
    """Same rule as api/ghostlines.py's own is_road_feature (a highway=*
    tag on a line, not an area) -- not imported from there to avoid a
    two-module import cycle risk for a 4-line check; if this drifts from
    ghostlines.py's copy in the future, that's a real signal the rule
    belongs in a shared module instead, not a bug to paper over here."""
    geom = kwargs.get("geom")
    if geom is None or geom.is_empty or kwargs.get("area"):
        return False
    return bool(kwargs.get("tags", {}).get("highway"))


DEFAULT_CONNECTION_TOLERANCE_M = 15.0  # matches citymap/editor/roads.py's
                                       # own DEFAULT_TOLERANCE_M -- "generous
                                       # for click imprecision, nowhere near
                                       # two genuinely separate roads'
                                       # typical spacing" applies exactly as
                                       # much to a snapped Terra Draw vertex
                                       # as to the old editor's hand clicks.


def find_road_endpoint_connection(point, candidate_roads: list, tolerance_m: float) -> Optional[dict]:
    """Is `point` (an (x, y) tuple, SOURCE CRS) within tolerance_m of any
    VERTEX of any road in candidate_roads? candidate_roads must already
    exclude the road being checked (a road's own endpoint is always
    "close" to itself, which would trivially and wrongly report every road
    as self-connected).

    Returns {"sharedWithRoadIds": [...]} -- every DISTINCT candidate road
    (by id) with a vertex within tolerance of `point`, so the caller knows
    both "did this connect at all" (the dict is non-None) and "how many
    OTHER roads share this junction" (len(sharedWithRoadIds)) -- the map-
    editor plan's Phase 6 wish, "tells you whether both ends actually
    connected" plus the "shared with N other roads" figure, from one query.
    Returns None for a genuine dangling end -- reported honestly, never
    silently assumed connected (same discipline as api/edits.py's other
    "never guess" checks: repair_geometry's report, PATCH's
    nearbyTerrainEditIds).
    """
    query_point = shapely.geometry.Point(point)
    shared_with = []
    for road in candidate_roads:
        geom = road.get("geom")
        if geom is None or geom.is_empty:
            continue
        for coord in geom.coords:
            if query_point.distance(shapely.geometry.Point(coord)) <= tolerance_m:
                shared_with.append(road["id"])
                break  # this road counts once, even if several of its own vertices are within tolerance
    if not shared_with:
        return None
    return {"sharedWithRoadIds": shared_with}


def union_bounds(*geoms):
    """The bbox containing every given geometry's own bounds -- None/empty
    geometries skipped. None if nothing usable was given (e.g. both sides
    of an edit are empty, which for a PATCH means a doomed geometry that
    reprojects to nothing -- callers should not reach this with both sides
    empty in practice, but returning None rather than raising keeps this
    function honest about what it can and can't compute)."""
    boxes = [g.bounds for g in geoms if g is not None and not g.is_empty]
    if not boxes:
        return None
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
           max(b[2] for b in boxes), max(b[3] for b in boxes))


# --- live-state sync (touches AppState, but no FastAPI/HTTP concerns) ------

def _sync_live_state(state, frame: Frame, feature_id: str, old_geom_source, new_geom_source,
                     current_kwargs: Optional[dict]) -> int:
    """After a store write changes feature_id's SOURCE-CRS geometry from
    old_geom_source to new_geom_source, keep THIS ALREADY-RUNNING process's
    Fields and cached tiles in sync -- see module docstring for why this
    matters. `current_kwargs` is the feature's full current row (post-write,
    from gpkg.get_feature_kwargs) so the MAP-space Feature rebuilt here
    carries real, current tags/height/source -- not just a geometry swap.
    Returns the number of cached tile files actually deleted.
    """
    new_map_features = (fields_module.rotate_and_clip([Feature(**current_kwargs)], frame)
                        if current_kwargs is not None else [])
    state.fields.replace_feature(feature_id, new_map_features[0] if new_map_features else None)

    old_map = fields_module.geom_to_map_space(old_geom_source, frame)
    new_map = fields_module.geom_to_map_space(new_geom_source, frame)
    map_bbox = union_bounds(old_map, new_map)
    if map_bbox is None:
        return 0
    minx, miny, maxx, maxy = map_bbox
    return tiles_module.invalidate_tiles_for_bbox(
        state.renderer.tiles_root, frame, state.style,
        minx, miny, maxx, maxy, margin_m=LOCAL_FEATURE_MARGIN_M, max_zoom=tiles_module.MAX_ZOOM)


# --- FastAPI routes (thin -- delegate to the pure functions above) --------

class CreateFeatureRequest(BaseModel):
    geometry: dict  # GeoJSON geometry object, lon/lat (WGS84)
    tags: dict = {}
    isArea: bool = False
    heightM: float = 0.0


@router.post("/api/features")
def create_feature(body: CreateFeatureRequest, request: Request):
    """Create a new feature -- map-editor plan Phase 6's "draw a road"
    (the endpoint is deliberately generic, not road-specific: Phase 9's
    parametric arrays will create non-road features through the same
    door). Connectivity is only computed/reported for a highway=*-tagged
    LineString -- everything else gets `"connectivity": null`, not a
    forced/meaningless value.
    """
    state = request.app.state.map_state
    frame = state.frame

    try:
        new_geom_source = reproject_geojson_to_source(frame, body.geometry)
    except (ValueError, TypeError, AttributeError) as e:
        raise HTTPException(status_code=422, detail=f"invalid GeoJSON geometry: {e}")
    new_geom_source, repaired = repair_geometry(new_geom_source)
    if new_geom_source is None or new_geom_source.is_empty:
        raise HTTPException(status_code=422, detail="geometry is empty after reprojection/repair")

    is_road = bool(body.tags.get("highway")) and not body.isArea and new_geom_source.geom_type == "LineString"
    kind = body.tags.get("highway") or ("area" if body.isArea else "line")
    coords = (list(new_geom_source.exterior.coords) if body.isArea and new_geom_source.geom_type == "Polygon"
             else list(new_geom_source.coords))
    feature_id = ids_module.geometry_feature_id(kind, coords, extra="hand")

    conn = gpkg_module.connect(state.store_path)
    try:
        try:
            with conn:
                gpkg_module.create_feature(conn, id=feature_id, geom=new_geom_source, tags=body.tags,
                                          is_area=body.isArea, height_m=body.heightM, origin="hand")
        except sqlite3.IntegrityError:
            # geometry_feature_id is deterministic -- re-submitting the
            # EXACT same shape (a real, if rare, case: a double-click, a
            # network retry replaying the request) collides on id, caught
            # here as a clean 409 rather than an unhandled IntegrityError
            # turning into a raw 500.
            raise HTTPException(
                status_code=409,
                detail="a feature with this exact geometry already exists (resubmitted an identical shape?)")

        connectivity = None
        if is_road:
            start_pt, end_pt = coords[0], coords[-1]
            search_bbox = union_bounds(
                shapely.geometry.Point(start_pt).buffer(DEFAULT_CONNECTION_TOLERANCE_M),
                shapely.geometry.Point(end_pt).buffer(DEFAULT_CONNECTION_TOLERANCE_M),
            )
            candidates = [
                c for c in gpkg_module.query_features_bbox(conn, *search_bbox)
                if is_road_feature(c) and c["id"] != feature_id
            ] if search_bbox is not None else []
            connectivity = {
                "start": find_road_endpoint_connection(start_pt, candidates, DEFAULT_CONNECTION_TOLERANCE_M),
                "end": find_road_endpoint_connection(end_pt, candidates, DEFAULT_CONNECTION_TOLERANCE_M),
            }

        current_kwargs = gpkg_module.get_feature_kwargs(conn, feature_id)
    finally:
        conn.close()

    tiles_invalidated = _sync_live_state(state, frame, feature_id, None, new_geom_source, current_kwargs)

    return {
        "feature": features_module.feature_kwargs_to_geojson(current_kwargs, frame),
        "repaired": repaired,
        "connectivity": connectivity,
        "tilesInvalidated": tiles_invalidated,
    }


class PatchFeatureRequest(BaseModel):
    geometry: dict  # GeoJSON geometry object, lon/lat (WGS84)


@router.patch("/api/features/{feature_id}")
def patch_feature(feature_id: str, body: PatchFeatureRequest, request: Request):
    """Patch feature_id's geometry. The feature's id is never in the
    request body -- only ever the URL path -- so there is no field a
    client could even set to rename a feature; ids.py's stability contract
    is structurally enforced, not just validated."""
    state = request.app.state.map_state
    frame = state.frame

    try:
        new_geom_source = reproject_geojson_to_source(frame, body.geometry)
    except (ValueError, TypeError, AttributeError) as e:
        raise HTTPException(status_code=422, detail=f"invalid GeoJSON geometry: {e}")
    new_geom_source, repaired = repair_geometry(new_geom_source)

    conn = gpkg_module.connect(state.store_path)
    try:
        try:
            with conn:
                snapshot = gpkg_module.update_feature_geom(conn, feature_id, new_geom_source)
        except gpkg_module.StoreError as e:
            raise HTTPException(status_code=404, detail=str(e))

        current_kwargs = gpkg_module.get_feature_kwargs(conn, feature_id)
        before_geom = snapshot["before"]["geom"]
        old_geom_source = shapely.geometry.shape(before_geom) if before_geom else None

        source_bbox = union_bounds(old_geom_source, new_geom_source)
        nearby_terrain_ids = (gpkg_module.terrain_edits_intersecting_bbox(conn, *source_bbox)
                             if source_bbox is not None else [])
    finally:
        conn.close()

    tiles_invalidated = _sync_live_state(state, frame, feature_id, old_geom_source,
                                        new_geom_source, current_kwargs)

    return {
        "feature": features_module.feature_kwargs_to_geojson(current_kwargs, frame),
        "repaired": repaired,
        "nearbyTerrainEditIds": nearby_terrain_ids,
        "tilesInvalidated": tiles_invalidated,
    }


@router.delete("/api/features/{feature_id}")
def delete_feature_route(feature_id: str, request: Request):
    """Delete a feature outright -- a real, missing gap this whole live-
    editing stack had until now: every prior phase built ways to CREATE or
    EDIT a feature, but selecting an unwanted one (an existing building, a
    sea fort, an array instance, a wall segment) and just removing it had
    no route at all. `gpkg.delete_feature` already existed and was already
    fully tested -- undo_last_change's own ("feature", "delete") reversal
    branch has reinserted a deleted feature from its snapshot since Phase
    6, since that is exactly what reversing THIS module's own insert-undo
    needs. This route is the first thing that calls delete_feature as a
    direct, intentional user action rather than only as undo's own internal
    reversal of an insert -- it gets full undo (Ctrl+Z restores the exact
    feature) for free, no new undo machinery required.
    """
    state = request.app.state.map_state
    frame = state.frame

    conn = gpkg_module.connect(state.store_path)
    try:
        try:
            with conn:
                snapshot = gpkg_module.delete_feature(conn, feature_id)
        except gpkg_module.StoreError as e:
            raise HTTPException(status_code=404, detail=str(e))
    finally:
        conn.close()

    before_geom = snapshot["before"]["geom"]
    old_geom_source = shapely.geometry.shape(before_geom) if before_geom else None
    tiles_invalidated = _sync_live_state(state, frame, feature_id, old_geom_source, None, None)

    return {"deleted": True, "tilesInvalidated": tiles_invalidated}


@router.post("/api/undo")
def undo(request: Request):
    """Reverse the single most recent edit (or batch of edits sharing one
    batch_id) -- Ctrl+Z. See gpkg.undo_last_change's own docstring for the
    exact scope (one step, append-only log, a second call redoes it;
    feature update/insert/delete, terrain_edit insert/delete, and
    world_geom update all supported).

    A batch can mix tables (map-editor plan Phase 7's terrace tool writes
    every tier AND every riser feature under one batch_id, so undoing a
    terrace is one Ctrl+Z; Phase 10's reclaim tool adds a THIRD table --
    world_geom -- to the same batch) -- `changes` are grouped by `table`
    and synced through the RIGHT path for each: `_sync_live_state`
    (single-feature patch) for "feature" rows; a direct
    `Fields.replace_feature("sea-polygon", ...)` for "world_geom" rows
    (resync_terrain_from_store never touches Fields.features itself, so
    undoing a sea change needs this explicit step, done BEFORE the resync
    below so that call's own internal sea_mask computation, which re-reads
    Fields.sea_features() fresh, sees the restored geometry); then
    `Fields.resync_terrain_from_store` + `invalidate_all_tiles` (once, not
    once per row) for any "terrain_edit" OR "world_geom" row, since a sea
    change affects hillshade/coastline exactly like a terrain edit does.
    """
    state = request.app.state.map_state
    frame = state.frame

    conn = gpkg_module.connect(state.store_path)
    try:
        try:
            with conn:
                result = gpkg_module.undo_last_change(conn)
        except gpkg_module.StoreError as e:
            raise HTTPException(status_code=409, detail=str(e))
        if result is None:
            return {"undone": False}

        feature_ids = [c["featureId"] for c in result["changes"] if c["table"] == "feature"]
        current_by_id = {fid: gpkg_module.get_feature_kwargs(conn, fid) for fid in feature_ids}
    finally:
        conn.close()

    total_invalidated = 0
    touched_features = []
    deleted_feature_ids = []
    needs_full_resync = False
    for change in result["changes"]:
        fid = change["featureId"]
        if change["table"] == "terrain_edit":
            needs_full_resync = True
            continue
        if change["table"] == "world_geom":
            # "sea-polygon" matches citymap.world.World.all_features' own
            # sea_feature(..., feature_id="sea-polygon") -- the id every
            # OTHER live Fields.features entry for the sea already uses
            # (see api/reclaim.py's own SEA_FEATURE_ID, same literal, not
            # imported from there to avoid a real circular import: reclaim.py
            # already imports FROM this module).
            restored_geom = change["after"]["geom"] if change["after"] else None
            restored_source = shapely.geometry.shape(restored_geom) if restored_geom else None
            sea_map_features = (fields_module.rotate_and_clip(
                [Feature(id="sea-polygon", geom=restored_source, tags={"__sea__": "true"}, area=True)], frame)
                if restored_source is not None else [])
            state.fields.replace_feature("sea-polygon", sea_map_features[0] if sea_map_features else None)
            needs_full_resync = True
            continue

        before_geom = change["before"]["geom"] if change["before"] else None
        after_geom = change["after"]["geom"] if change["after"] else None
        old_geom_source = shapely.geometry.shape(before_geom) if before_geom else None
        new_geom_source = shapely.geometry.shape(after_geom) if after_geom else None
        current_kwargs = current_by_id[fid]

        total_invalidated += _sync_live_state(state, frame, fid, old_geom_source,
                                             new_geom_source, current_kwargs)
        if current_kwargs is not None:
            touched_features.append(features_module.feature_kwargs_to_geojson(current_kwargs, frame))
        else:
            # undo reversed an insert (or reversed a delete's own undo) --
            # the feature no longer exists. A caller with this id currently
            # selected/shown must know to clear it, not keep displaying a
            # feature that's gone (real gap once undo could ever delete
            # something -- Phase 4's undo only ever restored geometry on an
            # ALREADY-existing feature, so this case never arose before
            # Phase 6's insert support).
            deleted_feature_ids.append(fid)

    if needs_full_resync:
        state.fields.resync_terrain_from_store(state.store_path, state.dem_cache_dir, state.style)
        total_invalidated += tiles_module.invalidate_all_tiles(
            state.renderer.tiles_root, frame, state.style, max_zoom=tiles_module.MAX_ZOOM)

    return {
        "undone": True,
        "featureIds": result["featureIds"],
        "features": touched_features,
        "deletedFeatureIds": deleted_feature_ids,
        "tilesInvalidated": total_invalidated,
    }
