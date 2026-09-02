"""The L2 per-frame layer: everything that depends on rotation and extent.

Rotates and clips the L1 world's features into MAP space, fetches the frame's
DEM, and precomputes the two resolution-independent raster fields every tile
draws from: the hillshade/colour multiplier (`terrain.shade_rgb`) and the sea
depth-gradient fraction. Both are computed ONCE at the frame's native
`dem_grid` resolution and cropped+upsampled per tile rather than recomputed --
that crop-and-upsample step is what makes a 1 km preview cost milliseconds
instead of repeating the horizon-shadow sweep or the sea EDT on every render.

This is the layer an operation-log replay (Milestone 1) invalidates: an
`excavate` or `crater` op edits `elevation` here, and hillshade/contours
re-derive from the edited array automatically -- see terrain.py's module
docstring for why that single hook is the whole point.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
from shapely import affinity
from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree

from . import acquire, terrain
from .draw import polygon_mask
from .frame import Frame
from .parse import Feature
from .world import World

STAGE_CODE_VERSION = 5  # bumped: shadow_mul, canopy_t, land-aware NaN fill, then coast_fade_t (see Fields)

GRADIENT_RES = 2048  # sea depth-gradient field resolution -- modest on
                     # purpose, a smooth fade doesn't need fine detail, and
                     # EDT cost scales with it (see terrain.distance_from).


def geom_to_map_space(geom, frame: Frame, map_square: Optional[Polygon] = None):
    """A single geometry, SOURCE CRS -> MAP space (rotated + clipped to the
    frame square) -- the same per-feature transform rotate_and_clip applies
    across a whole feature list, factored out so a single live edit
    (map-editor plan Phase 4's PATCH /api/features/{id}) can compute
    exactly the same MAP-space bounds a full Fields rebuild would, without
    a throwaway Feature wrapper just to get a bbox. Returns None if the
    geometry is empty/None, or if clipping to the frame square empties it
    (the geometry is entirely outside the current frame)."""
    if geom is None or geom.is_empty:
        return None
    if map_square is None:
        map_square = Polygon(frame.map_corners())
    rotated = affinity.rotate(geom, frame.rotation_deg, origin=(frame.cx, frame.cy))
    clipped = rotated.intersection(map_square)
    return None if clipped.is_empty else clipped


def rotate_and_clip(features: List[Feature], frame: Frame) -> List[Feature]:
    """Every feature, rotated into MAP space and clipped to the frame square.

    A feature entirely outside the square is dropped; nothing here mutates the
    L1 world's own Feature objects (new Feature instances are returned).
    """
    map_square = Polygon(frame.map_corners())
    out = []
    for feature in features:
        clipped = geom_to_map_space(feature.geom, frame, map_square)
        if clipped is None:
            continue
        out.append(Feature(id=feature.id, geom=clipped, tags=feature.tags,
                           area=feature.area, height_m=feature.height_m,
                           source=feature.source))
    return out


def rotate_and_clip_points(points: List[Tuple[float, float]], frame: Frame) -> List[Point]:
    map_square = Polygon(frame.map_corners())
    out = []
    for x, y in points:
        rotated = affinity.rotate(Point(x, y), frame.rotation_deg, origin=(frame.cx, frame.cy))
        if map_square.contains(rotated):
            out.append(rotated)
    return out


def apply_terrain_edits(elevation: np.ndarray, frame: Frame, edits: List) -> np.ndarray:
    """Bench/cut/fill the elevation array to match every TerrainEdit in
    world.terrain_edits -- terrain.py's own docstring calls this out as the
    reason `excavate`/`crater` (and now `construct`'s platform-benching) edit
    *this array* rather than painting pixels: hillshade, contours and the
    router's cost surface all re-derive from it for free.

    Each edit's polygon and target elevation are frame-invariant (SOURCE CRS,
    stored on World) -- this is the one place they become a per-frame RASTER
    edit, because elevation itself only exists per-frame, sampled at this
    frame's specific rotation/extent/grid. Nothing else about the edit is
    frame-specific; only the rasterisation step is done here.

    Inside the polygon the elevation is set flat to `target_elevation_m`;
    outside, it blends linearly back to the original value over `blend_m`, so
    the pad grades into natural terrain instead of ending in a vertical
    cliff. Where the original was NaN (no DEM data) inside the influence
    zone, the target is used outright -- there is nothing to blend toward,
    and the edit is actively terraforming that ground anyway; NaN far enough
    outside the blend zone is left untouched rather than manufactured.
    """
    if not edits:
        return elevation
    n = elevation.shape[0]
    cell_m = frame.extent_m / n
    tile = frame.full_tile(px=n)
    map_square = Polygon(frame.map_corners())
    out = elevation.astype(np.float32, copy=True)
    for edit in edits:
        rotated = affinity.rotate(edit.polygon, frame.rotation_deg, origin=(frame.cx, frame.cy))
        clipped = rotated.intersection(map_square)
        if clipped.is_empty:
            continue
        inside = np.asarray(polygon_mask(clipped, tile), dtype=bool)
        if not inside.any():
            continue
        dist_m = terrain.distance_from(inside, cell_m)
        blend_t = np.clip(dist_m / max(edit.blend_m, 1e-6), 0.0, 1.0)
        in_influence = blend_t < 1.0
        safe_original = np.where(np.isnan(out), edit.target_elevation_m, out)
        blended = safe_original * blend_t + edit.target_elevation_m * (1.0 - blend_t)
        out = np.where(in_influence, blended, out)
    return out.astype(np.float32)


def sea_depth_gradient(sea_geom_map: Optional[object], frame: Frame,
                       falloff_m: float, gamma: float) -> Optional[np.ndarray]:
    """depth_t in [0, 1] at GRADIENT_RES: 0 at the shore, 1 by `falloff_m` out.

    None when there is no sea at all in this frame -- a genuinely different
    case from "all zero", so callers must check rather than assume an array.
    """
    if sea_geom_map is None or sea_geom_map.is_empty:
        return None
    tile = frame.full_tile(px=GRADIENT_RES)
    mask_img = polygon_mask(sea_geom_map, tile)
    sea_bool = np.asarray(mask_img, dtype=bool)
    if not sea_bool.any():
        return None
    cell_m = frame.extent_m / GRADIENT_RES
    dist_m = terrain.distance_from(~sea_bool, cell_m)
    depth_t = np.clip(dist_m / falloff_m, 0.0, 1.0) ** gamma
    return np.where(sea_bool, depth_t, 0.0).astype(np.float32)


def coast_fade_t(sea_geom_map: Optional[object], frame: Frame,
                 fade_m: float, gamma: float) -> Optional[np.ndarray]:
    """fade_t in [0, 1] at GRADIENT_RES, for LAND cells only: 0 right at the
    shoreline, 1 by `fade_m` inland -- the LAND-side mirror of
    sea_depth_gradient just above (0 for cells that are themselves sea, the
    same "genuinely different from an all-zero real value" None-when-no-sea
    convention).

    Added 2026-08-24, direct user request: bare (unclassified) terrain
    reads as a warm brown right up to the coast, with nothing to soften an
    abrupt or jagged-looking boundary against the shore the way an actual
    landuse tint (sand, aerodrome, ...) already does. render_tile blends
    the ground's base colour toward palette.coastFade by (1 - fade_t), so
    the fade is strongest AT the shore and fully gone by `fade_m` inland.
    """
    if sea_geom_map is None or sea_geom_map.is_empty:
        return None
    tile = frame.full_tile(px=GRADIENT_RES)
    sea_bool = np.asarray(polygon_mask(sea_geom_map, tile), dtype=bool)
    if not sea_bool.any():
        return None
    cell_m = frame.extent_m / GRADIENT_RES
    dist_m = terrain.distance_from(sea_bool, cell_m)
    fade_t = np.clip(dist_m / fade_m, 0.0, 1.0) ** gamma
    return np.where(sea_bool, 0.0, fade_t).astype(np.float32)


@dataclass
class Fields:
    """Everything rotation/extent-dependent, ready for a tile to draw from."""

    frame: Frame
    features: List[Feature]           # rotated + clipped, MAP space
    lamps: List[Point]                # rotated + clipped, MAP space
    elevation: np.ndarray             # dem_grid^2, MAP space, row 0 = north
    shade_rgb: np.ndarray             # (dem_grid, dem_grid, 3) -- ground/landuse only, see render.py
    sea_depth_t: Optional[np.ndarray]  # (GRADIENT_RES, GRADIENT_RES) or None
    dem_tiles_fetched: int
    dem_tiles_missing: int
    # Neutral cast-shadow-only multiplier for buildings/roads (terrain.cast_shadow_mul)
    # -- deliberately NOT the tinted shade_rgb above, see that function's docstring for
    # why. Optional + defaulted so the many tests that build a Fields() directly for
    # unrelated assertions don't all need updating; None means "no shadow", not "use
    # shade_rgb" -- falling back to shade_rgb here would quietly resurrect the bug this
    # field exists to fix wherever a caller forgets to pass it.
    shadow_mul: Optional[np.ndarray] = None
    # [0,1] noise for tinting canopy landuse (terrain.canopy_noise_t) -- same
    # Optional/defaulted/no-fallback-to-something-else reasoning as shadow_mul.
    # None means "no canopy texture" (flat landuse colour, the old look), not
    # "derive one from something else".
    canopy_t: Optional[np.ndarray] = None
    # (GRADIENT_RES, GRADIENT_RES) or None -- see coast_fade_t. Same Optional/
    # defaulted reasoning as sea_depth_t just above (None means "no sea in
    # this frame at all", not "zero fade everywhere").
    coast_fade_t: Optional[np.ndarray] = None
    # Lazily-built spatial index over `features`' geometries, cached on first
    # use -- see query_features()'s docstring for why this exists. Excluded
    # from dataclass __init__/repr/eq (a cache, not state that defines a
    # Fields) so every existing `Fields(...)` test constructor keeps working
    # unchanged, and so two Fields built from the same inputs still compare
    # equal regardless of whether either has queried its index yet.
    _feature_tree: Optional[Tuple[STRtree, List[int]]] = field(
        default=None, repr=False, compare=False, init=False)
    # Guards `features` + `_feature_tree` together against a real race: a
    # live edit (map-editor plan Phase 4's PATCH /api/features/{id}) can
    # mutate `features` on one request thread while an in-flight tile
    # render concurrently calls query_features() on another (FastAPI runs
    # sync routes, and TileRenderer's own ThreadPoolExecutor, on real
    # separate threads -- ~88ms tile renders and human-paced edits overlap
    # often enough that "rare" is not the same as "impossible"). Without
    # this, query_features' two-step "compute valid_indices from
    # `features`, THEN re-index `features` by them" could IndexError if
    # `features` shrinks between the two steps -- not a data race Python's
    # GIL prevents, since it spans multiple bytecode-level operations.
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False, compare=False, init=False)

    def sea_features(self) -> List[Feature]:
        return [f for f in self.features if f.tags.get("__sea__")]

    def query_features(self, query_geom) -> List[Feature]:
        """Features whose geometry intersects `query_geom`, via a spatial
        index -- NOT a bbox-only prefilter needing a second exact check:
        Shapely 2's STRtree.query(geom, predicate="intersects") already
        performs the real geometric test (verified directly: an L-shaped
        polygon's bbox contains points the L-shape itself does not, and the
        predicate correctly excludes them).

        Exists because render_tile's per-tile `local_features` used to be a
        LINEAR scan calling `.intersects()` once per feature in the whole
        frame -- 76,706 of them on the real Kurose frame, measured at ~38s
        of a ~45s render, almost all spent on buildings nowhere near the
        tile being drawn. That per-tile floor is what made live map tiles
        (the map-editor plan's Phase 2) infeasible; this is the fix.

        Results come back sorted by their position in `self.features`, NOT
        raw STRtree traversal order -- confirmed directly as a real, live
        bug building the procgen mech hangar: STRtree.query()'s result
        order depends on the packed tree's internal structure, which shifts
        with the full set of geometries indexed, not just the two features
        actually competing for the same pixels. A parking marking drawn
        after its apron in `self.features` (meant to render on top of it,
        matching render.py's module docstring -- "drawing order matters")
        silently ended up UNDER the apron once a few more, entirely
        unrelated, features were added elsewhere in the same scene, because
        that changed the tree's shape and thus this query's traversal
        order. render_tile's per-layer passes (buildings, roads, ...) rely
        on `local_features`' order as the z-order for anything sharing a
        layer, so this method owes them a stable, predictable order -- the
        one they were already inserted in -- not whatever the spatial
        index happens to produce.
        """
        with self._lock:
            if self._feature_tree is None:
                valid_indices = [i for i, f in enumerate(self.features)
                                if f.geom is not None and not f.geom.is_empty]
                tree = STRtree([self.features[i].geom for i in valid_indices])
                self._feature_tree = (tree, valid_indices)
            tree, valid_indices = self._feature_tree
            return [self.features[valid_indices[i]]
                   for i in sorted(tree.query(query_geom, predicate="intersects"))]

    def replace_feature(self, feature_id: str, new_feature: Optional[Feature]) -> None:
        """Swap feature_id's entry for new_feature (already rotated+clipped
        to MAP space via geom_to_map_space/rotate_and_clip) -- or remove it
        if new_feature is None (the edit clipped it entirely out of the
        frame). If feature_id isn't currently present (e.g. it was outside
        the frame before this edit) and new_feature is given, it's
        appended.

        Used by the map-editor plan's Phase 4 live write path
        (api/edits.py) to keep an already-running server's Fields in sync
        with a store write, without the full Fields rebuild
        resolve_fields_from_store exists to avoid. Same lock as
        query_features -- see _lock's docstring for the race this closes.
        """
        with self._lock:
            idx = next((i for i, f in enumerate(self.features) if f.id == feature_id), None)
            if idx is not None:
                if new_feature is not None:
                    self.features[idx] = new_feature
                else:
                    del self.features[idx]
            elif new_feature is not None:
                self.features.append(new_feature)
            self._feature_tree = None

    def resync_terrain_from_store(self, db_path: str, dem_cache_dir: str, style) -> None:
        """Rebuild elevation, hillshade (shade_rgb) and cast shadow
        (shadow_mul) from the RAW DEM plus the store's CURRENT, FULL
        terrain_edit list -- map-editor plan Phase 7's live-sync path,
        used after ANY terrain_edit write: create, undo, or redo alike.

        Always rebuilds from scratch (raw DEM + every current edit) rather
        than incrementally patching on top of whatever elevation already
        happens to be in memory -- Fields never keeps the pre-edit
        elevation around, so there is no correct way to INCREMENTALLY
        remove one edit's effect (undo) the way there is to add one
        (replace_feature's per-feature model doesn't generalise here). One
        code path that is always correct, for create/undo/redo alike, beats
        two paths where only one of them actually works.

        "Raw DEM" does NOT mean a real network re-fetch for a tile this
        frame has real elevation data for: acquire.fetch_dem_tile caches
        every SUCCESSFUL tile fetch to a local .npy file, and this frame's
        real tiles were already fetched once when the server itself
        started. It DOES mean a real, and real-world-latency-variable,
        network re-fetch for every tile the frame's own extent overlaps
        that GSI has NO elevation data for at all (open ocean well
        offshore, mostly) -- confirmed directly (2026-08-25) that this
        frame has dozens of such tiles, and that acquire.fetch_dem_tile
        did not cache a 404 as anything other than "try again next time,"
        so EVERY resync re-attempted a real network round-trip for every
        one of them, at whatever the live GSI server's latency happened
        to be in that moment (measured directly: anywhere from under a
        second to well over a minute, unpredictably). Fixed with a
        sibling `.missing` marker file in fetch_dem_tile's own cache dir --
        a confirmed-missing tile is a stable, permanent fact, so caching
        it is exactly as safe as caching a hit.

        Real measured cost, not a full ~155s Fields rebuild, WITH that
        fix in place and the missing-tile markers already warm: DEM
        assembly from local .npy cache is under 2s at this frame's
        2048^2 resolution; horizon_shadow and cast_shadow_mul are each
        roughly 1-1.5s, not the ~0.5s this docstring used to claim
        (measured directly, not re-derived from terrain.py's own,
        apparently optimistic, docstring estimate). `apply_terrain_edits`
        itself is the now-dominant remaining cost -- confirmed directly at
        roughly 0.25-0.3s PER terrain_edit row, since it reruns a
        full-2048^2-grid polygon rasterise + distance transform for every
        edit regardless of how small that edit's own footprint is (see its
        own docstring) -- meaning this function's total cost grows
        linearly with how many terrain edits this campaign has ever made
        (measured at ~11s for 41 edits), not a fixed cost. No DEM re-fetch
        over the network for an already-resolved tile, no EDT/canopy/
        sea-gradient recompute -- none of those depend on elevation at
        all, and none are touched here.

        Deliberately NOT restricted to any one edit's own footprint the way
        replace_feature crops a single feature: horizon_shadow is a
        genuinely GLOBAL sweep -- a distant ridge can cast shade up to
        ~2.8km away at this frame's shallow default sun angle -- so there
        is no correct way to patch only a cropped region.

        `style` is required (not stored on Fields, unlike frame) purely for
        `style.lighting`, the same dict build_fields already threads
        through to shade_rgb/cast_shadow_mul.

        Thread-safe against concurrent query_features()/replace_feature()
        calls via the SAME lock -- elevation and shade_rgb/shadow_mul must
        never be read mid-update by a concurrent tile render (a torn read
        here is worse than for a single feature: it would show one part of
        the frame lit by the OLD terrain and another by the NEW terrain in
        the same image).
        """
        from .store import gpkg as gpkg_module
        from .world import TerrainEdit

        conn = gpkg_module.connect(db_path)
        try:
            edits = [TerrainEdit(**kwargs) for kwargs in gpkg_module.iter_all_terrain_edits(conn)]
        finally:
            conn.close()

        raw_elevation, _fetched, _missing = acquire.dem_grid_for_frame(self.frame, dem_cache_dir)

        with self._lock:
            cell_m = self.frame.extent_m / self.frame.dem_grid
            self.elevation = apply_terrain_edits(raw_elevation, self.frame, edits)

            sea_feats = self.sea_features()
            sea_mask = None
            if sea_feats and not sea_feats[0].geom.is_empty:
                n = self.elevation.shape[0]
                sea_mask = np.asarray(polygon_mask(sea_feats[0].geom, self.frame.full_tile(px=n)), dtype=bool)

            self.shade_rgb = terrain.shade_rgb(
                self.elevation, cell_m, self.frame.light_azimuth_deg, self.frame.light_altitude_deg,
                self.frame.rotation_deg, style.lighting, sea_mask=sea_mask)
            self.shadow_mul = terrain.cast_shadow_mul(
                self.elevation, cell_m, self.frame.light_azimuth_deg, self.frame.light_altitude_deg,
                self.frame.rotation_deg, style.lighting, sea_mask=sea_mask)


def build_fields(world: World, frame: Frame, dem_cache_dir: str, style) -> Fields:
    all_features = world.all_features()
    features = rotate_and_clip(all_features, frame)
    lamps = rotate_and_clip_points(world.lamps, frame)

    elevation, fetched, missing = acquire.dem_grid_for_frame(frame, dem_cache_dir)
    elevation = apply_terrain_edits(elevation, frame, world.terrain_edits)
    cell_m = frame.extent_m / frame.dem_grid

    # Computed BEFORE shade/shadow_mul (not after, where the sea polygon used
    # to be found) specifically so it can be threaded into them -- see
    # terrain.fill_land_nan's docstring for the real user-reported bug this
    # closes: NaN DEM data is not exclusively a sea/coastal phenomenon, and
    # flattening a NaN patch over real LAND to sea level manufactures a fake
    # flat patch that reads as a jagged, blocky artifact against its real
    # neighbours. Rasterised at the elevation grid's own resolution, same
    # polygon_mask + full_tile(px=n) technique apply_terrain_edits already
    # uses just above.
    sea_geom = None
    sea_feats = [f for f in features if f.tags.get("__sea__")]
    if sea_feats:
        sea_geom = sea_feats[0].geom
    sea_mask = None
    if sea_geom is not None and not sea_geom.is_empty:
        n = elevation.shape[0]
        sea_mask = np.asarray(polygon_mask(sea_geom, frame.full_tile(px=n)), dtype=bool)

    shade = terrain.shade_rgb(elevation, cell_m, frame.light_azimuth_deg,
                              frame.light_altitude_deg, frame.rotation_deg,
                              style.lighting, sea_mask=sea_mask)
    shadow_mul = terrain.cast_shadow_mul(elevation, cell_m, frame.light_azimuth_deg,
                                         frame.light_altitude_deg, frame.rotation_deg,
                                         style.lighting, sea_mask=sea_mask)
    canopy_t = terrain.canopy_noise_t(frame.dem_grid, frame.extent_m,
                                      style.canopy_blob_m(), style.canopy_seed())

    depth_t = sea_depth_gradient(
        sea_geom, frame,
        falloff_m=float(style.lighting.get("seaDepthFalloffM", 900.0)),
        gamma=float(style.lighting.get("seaDepthGamma", 0.6)),
    )
    coast_fade = coast_fade_t(
        sea_geom, frame,
        fade_m=float(style.lighting.get("coastFadeM", 700.0)),
        gamma=float(style.lighting.get("coastFadeGamma", 0.7)),
    )

    return Fields(frame=frame, features=features, lamps=lamps,
                 elevation=elevation, shade_rgb=shade, sea_depth_t=depth_t,
                 dem_tiles_fetched=fetched, dem_tiles_missing=missing,
                 shadow_mul=shadow_mul, canopy_t=canopy_t, coast_fade_t=coast_fade)


# --- L2 caching --------------------------------------------------------

def fields_key_parts(world_key: dict, frame: Frame) -> dict:
    return {"world": world_key, "frame": frame.cache_key_parts(),
           "fieldsCodeVersion": STAGE_CODE_VERSION}


def save_fields(fields: Fields, artifact) -> None:
    from . import cache
    artifact.begin_write()

    geoms = [f.geom for f in fields.features]
    cache.write_geometries(artifact.path("features"), geoms)
    attrs = [f.to_attrs() for f in fields.features]
    cache.write_attrs(artifact.path("features.attrs.json"), attrs)

    lamp_coords = [(p.x, p.y) for p in fields.lamps]
    cache.write_array(artifact.path("lamps.npy"),
                      np.asarray(lamp_coords, dtype=np.float64).reshape(-1, 2))

    cache.write_array(artifact.path("elevation.npy"), fields.elevation)
    cache.write_array(artifact.path("shade_rgb.npy"), fields.shade_rgb)
    if fields.shadow_mul is not None:
        cache.write_array(artifact.path("shadow_mul.npy"), fields.shadow_mul)
    if fields.canopy_t is not None:
        cache.write_array(artifact.path("canopy_t.npy"), fields.canopy_t)
    if fields.sea_depth_t is not None:
        cache.write_array(artifact.path("sea_depth_t.npy"), fields.sea_depth_t)
    if fields.coast_fade_t is not None:
        cache.write_array(artifact.path("coast_fade_t.npy"), fields.coast_fade_t)

    artifact.commit(extra={
        "featureCount": len(fields.features),
        "hasSea": fields.sea_depth_t is not None,
        "hasShadowMul": fields.shadow_mul is not None,
        "hasCanopyT": fields.canopy_t is not None,
        "hasCoastFadeT": fields.coast_fade_t is not None,
        "demTilesFetched": fields.dem_tiles_fetched,
        "demTilesMissing": fields.dem_tiles_missing,
    })


def load_fields(artifact, frame: Frame) -> Fields:
    from . import cache
    extra = artifact.verify()

    geoms = cache.read_geometries(artifact.path("features"))
    attrs = cache.read_attrs(artifact.path("features.attrs.json"))
    features = [Feature.from_attrs(geom, attr) for geom, attr in zip(geoms, attrs)]

    lamp_arr = cache.read_array(artifact.path("lamps.npy"), mmap=False)
    lamps = [Point(x, y) for x, y in np.asarray(lamp_arr)]

    elevation = cache.read_array(artifact.path("elevation.npy"))
    shade = cache.read_array(artifact.path("shade_rgb.npy"))
    depth_t = None
    if extra.get("hasSea"):
        depth_t = cache.read_array(artifact.path("sea_depth_t.npy"))
    shadow_mul = None
    if extra.get("hasShadowMul"):
        shadow_mul = cache.read_array(artifact.path("shadow_mul.npy"))
    canopy_t = None
    if extra.get("hasCanopyT"):
        canopy_t = cache.read_array(artifact.path("canopy_t.npy"))
    coast_fade = None
    if extra.get("hasCoastFadeT"):
        coast_fade = cache.read_array(artifact.path("coast_fade_t.npy"))

    return Fields(frame=frame, features=features, lamps=lamps,
                 elevation=np.asarray(elevation), shade_rgb=np.asarray(shade),
                 sea_depth_t=None if depth_t is None else np.asarray(depth_t),
                 dem_tiles_fetched=extra.get("demTilesFetched", 0),
                 dem_tiles_missing=extra.get("demTilesMissing", 0),
                 shadow_mul=None if shadow_mul is None else np.asarray(shadow_mul),
                 canopy_t=None if canopy_t is None else np.asarray(canopy_t),
                 coast_fade_t=None if coast_fade is None else np.asarray(coast_fade))
