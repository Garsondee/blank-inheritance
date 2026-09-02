"""Tile rendering: Fields + Style -> a raster image.

`render_tile(fields, style, tile)` is the ONLY drawing entry point. A preview
is one small tile through this function; the delivered 3x3 export (design doc
§8) is nine calls to it at production size; a whole-frame composition check is
one more call at a smaller size. There is deliberately no separate "preview
path" -- see frame.py's module docstring for why that separation is exactly
how a preview stops being trustworthy.

Drawing order matters and encodes the z-order fixes from the 2026-08-23 and
2026-08-24 sessions: sea (hole-aware, see draw.py) -> landuse tint (multiply,
so relief shows through) -> water polygons (lakes/ponds/basins) -> contours
-> rivers/streams/canals -> at-grade roads -> railways -> buildings ->
building shadows (Minkowski sweep, see geometry.py), composited over
EVERYTHING drawn so far -- roads, rivers, contours, and other buildings
alike, so a shadow darkens whatever ground it actually falls across, not
just bare terrain -> bridges redrawn on top WITH their own shadow (so an
elevated road reads as above what it crosses) -> lamps. Rivers draw ABOVE
contours, not with the other water polygons, because a thin river line
drawn UNDER the contour layer gets visually cut into dashes by every
contour stroke crossing it -- a lake's broad fill does not have that
problem, so only the linear waterways moved. Buildings draw BEFORE their
own shadow layer, not after: each building's swept shadow polygon has that
SAME building's own footprint subtracted out (shadow_sweep's Minkowski sum
includes the source polygon by construction -- correct for the swept region,
wrong to then darken the very building that cast it), so a building is
correctly darkened by a NEIGHBOUR's shadow falling across it while never
shadowing itself. Previously buildings drew last and fully opaque, which
silently erased any shadow -- from any caster -- that had fallen on a
building's own footprint.

**Ground shading vs. building/road shading are deliberately two different
arrays (2026-08-24).** The ground (bare terrain, and landuse fills via their
multiply-tint reading back from it) responds to `fields.shade_rgb`, which
combines brightness, slope-facing, AND warm/cool colour temperature -- all
correct and attractive for terrain itself. Roads and buildings instead
respond to `fields.shadow_mul`, a neutral (no colour tint) multiplier driven
by genuine horizon-occluded cast shadow only, not slope facing. Sharing
`shade_rgb` with buildings/roads was tried first and was a real, shipped bug:
a hillside merely facing away from the sun -- not actually shadowed by
anything -- reads as warm-tinted-but-dim under `shade_rgb`, and multiplying
that onto every building and road across the whole slope pulled them all
toward the same dark brown regardless of their own colour, over areas that
could span many blocks. See `terrain.cast_shadow_mul`'s docstring for the
full account.

Not yet in this module, left for a follow-up since they are pure look, not
structure: paper grain/vignette/dapple, road/place labels, the cartouche and
compass rose. `render_tile`'s output is a plain, undecorated map -- correct
geometry and colour, no page furniture yet.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from shapely.geometry import box

from . import contour, draw, geometry, rivers
from .fields import Fields
from .frame import Tile
from .parse import Feature

# How far outside a tile's own bounds a feature can sit and still possibly
# draw something visible inside it -- comfortably covers a cast shadow's
# reach (offset = height_m * shadow.buildingHeightScale, ~0.55; even a
# 200m structure reaches well under this) with margin to spare. Filtering
# fields.features to this window before the per-feature loops below is the
# actual preview-speed fix alongside _crop_elevation_for_tile: profiled
# against the real ~230k-feature Kurose world, an 800m preview tile's
# shadow pass alone (geometry.shadow_sweep, called once per building
# regardless of visibility) cost ~38s of a ~45s total render, because nothing
# was skipping buildings scattered anywhere else across the whole 12km frame.
LOCAL_FEATURE_MARGIN_M = 300.0
from .style import Style

STAGE_CODE_VERSION = 1

WATER_NATURAL_OR_TAGS = {
    "natural": {"water"},
    "landuse": {"basin", "reservoir"},
    "water": {"reservoir", "pond", "river", "lake", "basin"},
    "leisure": {"swimming_pool"},
}

# landuse/natural keys dense enough with actual tree canopy to get the noise
# treatment instead of a flat tint -- see the "blocky forest" comment in
# render_tile. Deliberately narrower than "every green landuse class":
# grass/meadow/park/garden read as open, mown ground in real life, not a
# canopy, and texturing them the same way would look wrong, not just unasked.
CANOPY_LANDUSE_KEYS = {"forest", "wood", "scrub"}

# The OSM-ish tag the Scratchpad's Fill tool writes (editor/static/
# scratchpad.js's MATERIAL_STYLES) -- a real, standard OSM key
# (building:material), not a made-up one, so hand-authored template JSON can
# use it the same way.
BUILDING_MATERIAL_TAG = "building:material"
def _is_water_polygon(feature: Feature) -> bool:
    if not feature.area:
        return False
    tags = feature.tags
    for key, values in WATER_NATURAL_OR_TAGS.items():
        if tags.get(key) in values:
            return True
    return False


def _is_bridge(feature: Feature) -> bool:
    bridge = feature.tags.get("bridge")
    if bridge and bridge != "no":
        return True
    try:
        return int(feature.tags.get("layer", "0")) > 0
    except (TypeError, ValueError):
        return False


def _road_class(feature: Feature) -> Optional[str]:
    if feature.area:
        return None
    return feature.tags.get("highway")


def _upsample(field: np.ndarray, out_px: int) -> np.ndarray:
    """Bicubic-upsample a resolution-independent field to `out_px` square.

    Used for both the hillshade multiplier and the sea depth gradient -- both
    are precomputed once per frame at a modest native resolution (see
    fields.py) and only ever upsampled here, never recomputed per tile.
    """
    h, w = field.shape[:2]
    channels = 1 if field.ndim == 2 else field.shape[2]
    lo, hi = float(np.nanmin(field)), float(np.nanmax(field))
    if hi <= lo:
        hi = lo + 1.0
    scaled = np.clip((field - lo) / (hi - lo) * 255.0, 0, 255).astype(np.uint8)
    mode = "L" if channels == 1 else "RGB"
    img = Image.fromarray(scaled, mode=mode).resize((out_px, out_px), Image.BICUBIC)
    back = np.asarray(img, dtype=np.float32) / 255.0 * (hi - lo) + lo
    return back


def _crop_field_for_tile(field: np.ndarray, field_frame_extent: float, tile: Tile,
                         out_px: int) -> np.ndarray:
    """Crop the fraction of a frame-native field covered by `tile`, then
    upsample it to `out_px`. This is the whole preview-speed trick: the sea
    gradient and hillshade are computed once at ~2048^2 for the FULL frame,
    and a 1 km preview just reads the relevant few percent of that array."""
    n = field.shape[0]
    frame = tile.frame
    fox, foy = frame.origin
    x0 = (tile.origin_x - fox) / field_frame_extent * n
    y0 = (foy + field_frame_extent - (tile.origin_y + tile.extent_m)) / field_frame_extent * n
    x1 = (tile.origin_x + tile.extent_m - fox) / field_frame_extent * n
    y1 = (foy + field_frame_extent - tile.origin_y) / field_frame_extent * n

    ix0, iy0 = int(np.floor(max(0, x0))), int(np.floor(max(0, y0)))
    ix1, iy1 = int(np.ceil(min(n, x1))), int(np.ceil(min(n, y1)))
    ix1, iy1 = max(ix1, ix0 + 1), max(iy1, iy0 + 1)
    crop = field[iy0:iy1, ix0:ix1]
    return _upsample(crop, tile.px)


def _palette_lookup(t: np.ndarray, palette) -> np.ndarray:
    """Piecewise-linear multi-stop colour gradient: t in [0,1] (any shape)
    -> an RGB array shaped t.shape + (3,). `palette` is an ordered list of
    >=2 [r,g,b] stops from t=0 to t=1 -- the same idea as the sea depth
    gradient's 2-stop lerp (shallow/deep), generalised to N stops for
    canopy_t (see render_tile's landuse section)."""
    stops = np.asarray(palette, dtype=np.float32)
    n = len(stops) - 1
    pos = np.clip(t, 0.0, 1.0) * n
    i0 = np.clip(pos.astype(np.int32), 0, n - 1)
    local = (pos - i0)[..., None]
    c0 = stops[i0]
    c1 = stops[np.clip(i0 + 1, 0, n)]
    return c0 + (c1 - c0) * local


def _building_roof_colour(feature_id, palette):
    """Deterministic per-building pick from `palette`, seeded by the
    building's own feature id -- same id always picks the same colour (a
    stable choice "consistent with their location", per the user's own
    wording), with no per-render randomness and no state to track. Real
    aerial photos of Kobe/Kanazawa rooftops show a wide mix of roof colours
    even among similarly-sized buildings; render_tile's building fill used
    to be a single low/high gradient driven purely by height, with every
    building of a given height reading identically. Only used for buildings
    with no building:material tag (the Fill tool's explicit per-building
    choice always wins, see BUILDING_MATERIAL_TAG)."""
    digest = hashlib.sha256(str(feature_id).encode("utf-8")).digest()
    index = digest[0] % len(palette)
    return palette[index]


def _crop_elevation_for_tile(elevation: np.ndarray, field_frame_extent: float, tile: Tile):
    """Crop elevation to the tile's window, array indices only -- no
    upsampling, unlike `_crop_field_for_tile`: contour extraction wants
    native-resolution grid cells to interpolate between, not resampled
    colour data. A 1-cell margin on every side keeps a contour segment
    that straddles the crop boundary resolving the same as it would against
    the full array (contour_segments needs both corners of a cell).

    Returns (crop, ix0, iy0): callers recover full-frame grid coordinates
    from a segment found in the crop by adding (ix0, iy0) before calling
    grid_to_map, cheaper than reworking grid_to_map's origin/extent
    convention just for this.

    This is the actual preview-speed fix, not just the hillshade crop above
    it: extract_contours' cost scales with elevation.size times the number
    of 10m levels spanned, so calling it on a 2048^2 FULL-FRAME array for
    an 800m preview window was measured costing ~9s per render regardless
    of tile size or feature count -- a fast local design-preview loop
    (tools/city-map/citymap/editor/design_preview.py) needs many renders
    per minute, not one every 9+ seconds.
    """
    n = elevation.shape[0]
    frame = tile.frame
    fox, foy = frame.origin
    x0 = (tile.origin_x - fox) / field_frame_extent * n
    y0 = (foy + field_frame_extent - (tile.origin_y + tile.extent_m)) / field_frame_extent * n
    x1 = (tile.origin_x + tile.extent_m - fox) / field_frame_extent * n
    y1 = (foy + field_frame_extent - tile.origin_y) / field_frame_extent * n

    ix0 = max(0, int(np.floor(min(x0, x1))) - 1)
    iy0 = max(0, int(np.floor(min(y0, y1))) - 1)
    ix1 = min(n, int(np.ceil(max(x0, x1))) + 1)
    iy1 = min(n, int(np.ceil(max(y0, y1))) + 1)
    ix1, iy1 = max(ix1, ix0 + 2), max(iy1, iy0 + 2)
    return elevation[iy0:iy1, ix0:ix1], ix0, iy0


def render_tile(fields: Fields, style: Style, tile: Tile) -> Image.Image:
    frame = tile.frame
    img = Image.new("RGB", (tile.px, tile.px), style.colour("paper"))

    # Everything that draws per-feature below reads from `local_features`,
    # not `fields.features` -- see LOCAL_FEATURE_MARGIN_M. The one deliberate
    # exception is rivers.river_widths_m below, which needs the network's
    # FULL extent to size a reach consistently (its own comment explains why).
    #
    # Indexed (Fields.query_features), not a linear scan -- see that
    # method's docstring. This was the per-tile floor that made live map
    # tiles infeasible before the STRtree fix: ~38s of a ~45s preview render
    # was this scan alone, against every feature in the frame regardless of
    # visibility.
    query_box = box(tile.origin_x, tile.origin_y,
                    tile.origin_x + tile.extent_m, tile.origin_y + tile.extent_m
                    ).buffer(LOCAL_FEATURE_MARGIN_M)
    local_features = fields.query_features(query_box)

    # --- hillshade -----------------------------------------------------
    # `shade` (full tint+brightness) is for the GROUND ONLY -- bare terrain,
    # the paper it's drawn on, and (via the landuse multiply-tint below,
    # which reads back from `img`) landuse fills. Roads and buildings use
    # `shadow_mul` instead, a few lines down -- see cast_shadow_mul's own
    # docstring for why sharing `shade` with them was a real, previously-
    # shipped bug ("everything becomes brown").
    # In-place from here on (*=, +=, clip(out=...)) rather than each step
    # allocating a fresh (tile.px, tile.px, 3) float32 array -- at a large
    # export's working resolution (8192px: 768 MiB per such array) the
    # original chain of ~4-5 concurrent temporaries per blend step across
    # hillshade/landuse/coastal-fade/roads/buildings was enough to exhaust
    # memory on a real 3x3 tiled export (found 2026-08-24, a genuine
    # MemoryError at the building-fill step). Every rewrite below computes
    # the exact same arithmetic, just with fewer live buffers at once.
    shade = _crop_field_for_tile(fields.shade_rgb, frame.extent_m, tile, tile.px)
    base = np.asarray(img, dtype=np.float32)
    base *= shade
    np.clip(base, 0, 255, out=base)
    img = Image.fromarray(base.astype(np.uint8))
    del base
    if fields.shadow_mul is not None:
        shadow = _crop_field_for_tile(fields.shadow_mul, frame.extent_m, tile, tile.px)
    else:
        shadow = np.ones_like(shade)
    del shade  # not referenced again -- `shadow` (a separate array) is what roads/buildings use

    # --- sea: hole-aware flat fill, then depth gradient + ripple -------
    sea_features = fields.sea_features()
    if sea_features:
        sea_geom = sea_features[0].geom
        draw.fill_polygon(img, sea_geom, tile, style.colour("seaShallow"))

        if fields.sea_depth_t is not None:
            depth_t = _crop_field_for_tile(fields.sea_depth_t, frame.extent_m, tile, tile.px)
            shallow = np.asarray(style.colour("seaShallow"), dtype=np.float32)
            deep = np.asarray(style.colour("seaDeep"), dtype=np.float32)
            tone = shallow[None, None, :] + (deep - shallow)[None, None, :] * depth_t[..., None]

            ripple_res = max(8, tile.px // 3)
            rng = np.random.default_rng(1951)
            ripple = rng.normal(0, 1, (ripple_res, ripple_res)).astype(np.float32)
            ripple -= ripple.min()
            ripple /= max(1e-6, ripple.max())
            ripple = np.asarray(
                Image.fromarray((ripple * 255).astype(np.uint8)).resize(
                    (tile.px, tile.px), Image.BICUBIC), dtype=np.float32) / 255.0
            amount = float(style.lighting.get("seaRippleAmount", 0.06))
            tone *= (1.0 - amount / 2 + amount * ripple)[..., None]

            mask = draw.polygon_mask(sea_geom, tile)
            img.paste(Image.fromarray(np.clip(tone, 0, 255).astype(np.uint8)), (0, 0), mask)

        drawer = ImageDraw.Draw(img, "RGBA")
        draw.stroke_rings(drawer, sea_geom, tile,
                          style.colour("coastInk"),
                          style.px("widths", "coastStroke", tile.mpp))

    # --- landuse tint (multiply, so relief shows through) ---------------
    # Canopy classes (CANOPY_LANDUSE_KEYS) get a second mask so their flat
    # landuse_colour can be overridden with noise-textured colour below,
    # instead of every polygon sharing one uniform fill -- see the
    # "blocky forest" comment further down for why.
    landuse_buf = Image.new("RGB", (tile.px, tile.px), style.colour("paper"))
    landuse_mask = Image.new("L", (tile.px, tile.px), 0)
    canopy_mask = Image.new("L", (tile.px, tile.px), 0)
    lu_drawer = ImageDraw.Draw(landuse_buf)
    mask_drawer = ImageDraw.Draw(landuse_mask)
    canopy_mask_drawer = ImageDraw.Draw(canopy_mask)
    for feature in local_features:
        if not feature.area:
            continue
        key = feature.tags.get("landuse") or feature.tags.get("natural") or feature.tags.get("leisure")
        colour = style.landuse_colour(key) if key else None
        if colour is None:
            continue
        is_canopy = key in CANOPY_LANDUSE_KEYS
        for exterior, interiors in geometry.iter_rings(feature.geom):
            if len(exterior) >= 3:
                px_ring = [tile.to_px(x, y) for x, y in exterior]
                lu_drawer.polygon(px_ring, fill=colour)
                mask_drawer.polygon(px_ring, fill=255)
                if is_canopy:
                    canopy_mask_drawer.polygon(px_ring, fill=255)
            for interior in interiors:
                if len(interior) >= 3:
                    px_hole = [tile.to_px(x, y) for x, y in interior]
                    mask_drawer.polygon(px_hole, fill=0)
                    if is_canopy:
                        canopy_mask_drawer.polygon(px_hole, fill=0)

    # **The blocky-forest bug (2026-08-24).** A whole forest polygon filled
    # with one flat colour reads as a hard-edged, low-resolution patch next
    # to the DEM's much finer contour detail underneath it -- OSM's forest
    # geometry in this region really is coarse (real source data, not a
    # rendering bug), but a flat fill has nothing to break that up. Blend in
    # canopy_t's noise, mapped through a multi-stop palette, wherever
    # canopy_mask is set -- see terrain.canopy_noise_t's docstring.
    if fields.canopy_t is not None:
        canopy_mask_arr = np.asarray(canopy_mask, dtype=np.float32) / 255.0
        if canopy_mask_arr.any():
            t = _crop_field_for_tile(fields.canopy_t, frame.extent_m, tile, tile.px)
            t = np.clip(t, 0.0, 1.0) ** style.canopy_gamma()
            noise_rgb = _palette_lookup(t, style.canopy_palette())
            lu_arr_pre = np.asarray(landuse_buf, dtype=np.float32)
            lu_arr_pre = np.where(canopy_mask_arr[..., None] > 0.5, noise_rgb, lu_arr_pre)
            landuse_buf = Image.fromarray(np.clip(lu_arr_pre, 0, 255).astype(np.uint8))

    paper = np.asarray(style.colour("paper"), dtype=np.float32)
    lu_arr = np.asarray(landuse_buf, dtype=np.float32)
    lu_arr /= paper  # lu_arr now holds `tint`, in place -- one array, not two
    lu_mask_arr = (np.asarray(landuse_mask, dtype=np.float32) / 255.0)[..., None]
    base_arr = np.asarray(img, dtype=np.float32)
    lu_arr *= base_arr                    # lu_arr now holds base_arr * tint
    np.clip(lu_arr, 0, 255, out=lu_arr)
    lu_arr -= base_arr                    # lu_arr now holds the additive diff
    lu_arr *= lu_mask_arr
    base_arr += lu_arr                    # base_arr*(1-mask) + clipped*mask, algebraically
    del lu_arr
    img = Image.fromarray(np.clip(base_arr, 0, 255).astype(np.uint8))

    # --- coastal land fade: bare ground blends toward a sand tone near the
    # shore, instead of an abrupt or jagged-looking boundary -------------
    # Direct user request (2026-08-24): "identify the brown colour and
    # where it's coming from and then just add a very large wide fade from
    # that brown as it heads towards the ocean. The tan colour is fine for
    # buildings near the ocean." The "brown" is unclassified bare terrain --
    # `paper` tinted by hillshade with no landuse tint to soften it, unlike
    # an actually-tagged area (sand, aerodrome, ...), which is exactly why
    # this is gated by `(1 - lu_mask_arr)`: an already-tagged pixel keeps
    # its own correct colour untouched, only bare ground fades. ALSO gated
    # by `(1 - sea_mask_arr)`: fields.coast_fade_t's own placeholder value
    # for sea cells is 0.0 (same "meaningless outside its own domain, the
    # real gate is the polygon mask" convention sea_depth_t already uses,
    # see its consumer just above) -- 0.0 plugged directly into this
    # section's (1 - fade_t) blend weight would read as "maximum blend",
    # exactly backwards, and would re-tint sea pixels already correctly
    # rendered by the sea section above. Re-masking by the real polygon,
    # not trusting the placeholder value, is what sea_depth_t's own
    # consumer already does for the identical reason.
    if fields.coast_fade_t is not None and sea_features:
        fade_t = _crop_field_for_tile(fields.coast_fade_t, frame.extent_m, tile, tile.px)
        sea_mask_arr = (np.asarray(draw.polygon_mask(sea_geom, tile), dtype=np.float32) / 255.0)
        fade_t *= -1.0
        fade_t += 1.0                    # fade_t now holds (1 - fade_t), in place
        fade_t *= (1.0 - sea_mask_arr)
        fade_t *= (1.0 - lu_mask_arr[..., 0])
        blend = fade_t[..., None]
        target = np.asarray(style.colour("coastFade"), dtype=np.float32)
        base_arr = np.asarray(img, dtype=np.float32)
        # base*(1-blend) + target*blend == base + (target - base)*blend, one
        # (px, px, 3) temp instead of two.
        diff = target[None, None, :] - base_arr
        diff *= blend
        base_arr += diff
        del diff
        img = Image.fromarray(np.clip(base_arr, 0, 255).astype(np.uint8))

    d = ImageDraw.Draw(img, "RGBA")

    # --- water polygons (lakes, ponds, basins) ----------------------------
    for feature in local_features:
        if _is_water_polygon(feature):
            draw.fill_polygon(img, feature.geom, tile, style.colour("water"))
            draw.stroke_rings(d, feature.geom, tile, style.colour("coastInk"),
                             style.px("widths", "waterStroke", tile.mpp))

    # --- contours ---------------------------------------------------------
    elev_crop, crop_ix0, crop_iy0 = _crop_elevation_for_tile(fields.elevation, frame.extent_m, tile)
    lines = contour.extract_contours(elev_crop)
    n = fields.elevation.shape[0]
    for line in lines:
        colour = style.colour("contourIndex" if line.major else "contourMinor")
        width = style.px("widths", "contourIndex" if line.major else "contourMinor", tile.mpp)
        for (c0, r0), (c1, r1) in line.segments:
            x0m, y0m = contour.grid_to_map(c0 + crop_ix0, r0 + crop_iy0, *frame.origin, frame.extent_m, n)
            x1m, y1m = contour.grid_to_map(c1 + crop_ix0, r1 + crop_iy0, *frame.origin, frame.extent_m, n)
            d.line([tile.to_px(x0m, y0m), tile.to_px(x1m, y1m)],
                  fill=colour, width=max(1, int(round(width))))

    # --- rivers/streams/canals, ABOVE contours (see module docstring) -----
    # Width tapers at sources and widens as tributaries combine -- see
    # rivers.py. Computed from the FULL feature list (not just this tile's
    # crop) so a river's width is consistent with its network position
    # everywhere it is drawn, not just what happens to be visible right now.
    river_width_by_id = rivers.river_widths_m(
        fields.features,
        style.metres("widths", "riverMin"),
        style.metres("widths", "riverMax"),
    )
    # A TRUE topological source (a real headwater, not just wherever OSM
    # split a way -- rivers.source_feature_ids) tapers to a point along its
    # own length via draw_tapered_line; every other river segment keeps the
    # cheaper uniform-width draw_line.
    river_source_ids = rivers.source_feature_ids(fields.features)
    river_min_px = style.px("widths", "riverMin", tile.mpp)
    for feature in local_features:
        if not feature.area and feature.tags.get("waterway") in rivers.WATERWAY_CLASSES:
            width_m = river_width_by_id.get(feature.id, style.metres("widths", "riverMin"))
            full_width_m = max(river_min_px, width_m / tile.mpp) * tile.mpp
            if feature.id in river_source_ids:
                vertex_widths = rivers.vertex_widths_m(feature, full_width_m, is_source=True)
                draw.draw_tapered_line(d, feature.geom, tile, style.colour("water"), vertex_widths)
            else:
                draw.draw_line(d, feature.geom, tile, style.colour("water"), full_width_m / tile.mpp)

    # --- at-grade roads, shadow-tinted, then railways -----------------------
    # Roads draw into a separate buffer+mask and get multiplied by the
    # neutral cast-shadow multiplier (NOT the full tinted `shade`, see the
    # hillshade comment above), then masked back in -- the same
    # buffer+mask+multiply technique the landuse tint above uses. Without
    # this a road drew as a flat cutout that ignored cast shadow entirely,
    # reading as pasted onto the map rather than sitting on it -- but using
    # the full ground `shade` here was the "everything becomes brown" bug.
    road_buf = Image.new("RGB", (tile.px, tile.px), style.colour("paper"))
    road_mask = Image.new("L", (tile.px, tile.px), 0)
    _draw_roads(ImageDraw.Draw(road_buf, "RGBA"), local_features, style, tile,
               only_bridges=False, mask_drawer=ImageDraw.Draw(road_mask))
    road_arr = np.asarray(road_buf, dtype=np.float32)
    road_mask_arr = (np.asarray(road_mask, dtype=np.float32) / 255.0)[..., None]
    base_arr = np.asarray(img, dtype=np.float32)
    road_arr *= shadow
    np.clip(road_arr, 0, 255, out=road_arr)
    road_arr -= base_arr
    road_arr *= road_mask_arr
    base_arr += road_arr
    del road_arr
    img = Image.fromarray(np.clip(base_arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, "RGBA")

    for feature in local_features:
        if feature.tags.get("railway") and not feature.area:
            draw.draw_line(d, feature.geom, tile, style.colour("railway"),
                           style.px("widths", "railway", tile.mpp))

    # --- buildings: shadow-tinted fills, then flat ink outlines ------------
    # Drawn BEFORE the building-shadow layer, not after -- see module
    # docstring for why: a building must be darkened by a neighbour's shadow
    # falling across it, the same as any other ground feature. Fills go
    # through the same buffer+mask+multiply technique as roads above, using
    # the neutral cast-shadow multiplier rather than a flat colour that
    # ignored terrain shadow entirely -- and NOT the tinted ground `shade`,
    # which is what previously made a whole shaded hillside's buildings read
    # as a single flat brown mass (see cast_shadow_mul's docstring). Outlines
    # stay flat ink, drawn after, matching how road casings and contour ink
    # stay crisp regardless of the slope.
    building_buf = Image.new("RGB", (tile.px, tile.px), style.colour("paper"))
    building_mask = Image.new("L", (tile.px, tile.px), 0)
    bld_drawer = ImageDraw.Draw(building_buf)
    bld_mask_drawer = ImageDraw.Draw(building_mask)
    low, high = style.colour("buildingLow"), style.colour("buildingHigh")
    for feature in local_features:
        if "building" not in feature.tags or feature.geom.is_empty:
            continue
        # A building:material tag (set by the Scratchpad's Fill tool, or by
        # hand) picks a flat material colour instead of the generic
        # height-graded fill -- still shadow_mul-multiplied like any other
        # building fill below, so it still darkens correctly in cast shadow,
        # just without the height gradient (a material has its own
        # characteristic tone -- concrete lighter, metal darker -- that a
        # height-driven lerp would otherwise override).
        material_fill = style.material_colour(feature.tags.get(BUILDING_MATERIAL_TAG))
        if material_fill is not None:
            fill = material_fill
        else:
            # No explicit material: blend toward a colour seeded from this
            # building's own feature id (_building_roof_colour) instead of
            # one shared `high` tone -- real Kobe/Kanazawa rooftop photos
            # show genuine colour variety on ordinary, unremarkable-height
            # houses, not just tall landmark buildings, so the blend weight
            # stays generously roof-dominant (0.55-0.90) across the WHOLE
            # height range rather than scaling from 0 -- a first version of
            # this scaled the blend by height alone (k = height/55 directly),
            # which left short buildings reading as barely-tinted `low`,
            # missing the variety entirely for most ordinary buildings on
            # the map. Height still nudges the blend (taller leans further
            # toward the full roof colour), it just isn't the only signal.
            BUILDING_ROOF_BLEND_MIN, BUILDING_ROOF_BLEND_MAX = 0.55, 0.90
            height_k = min(1.0, feature.height_m / 55.0)
            blend = BUILDING_ROOF_BLEND_MIN + (BUILDING_ROOF_BLEND_MAX - BUILDING_ROOF_BLEND_MIN) * height_k
            roof = _building_roof_colour(feature.id, style.building_roof_palette())
            fill = tuple(int(low[i] + (roof[i] - low[i]) * blend) for i in range(3))
        for exterior, interiors in geometry.iter_rings(feature.geom):
            if len(exterior) < 3:
                continue
            if not any(len(interior) >= 3 for interior in interiors):
                # Fast path: the overwhelming majority of buildings are a
                # plain simple ring with no hole, so paint straight into
                # the shared canvas/mask as before.
                bld_drawer.polygon([tile.to_px(x, y) for x, y in exterior], fill=fill)
                bld_mask_drawer.polygon([tile.to_px(x, y) for x, y in exterior], fill=255)
                continue
            # A polygon WITH a hole (a mitred wall band, a moat rim) must
            # have that hole punched in ISOLATION. Punching straight into
            # the shared building_mask, as the fast path does, would carve
            # the hole through whatever an EARLIER feature already painted
            # there too -- confirmed directly: a solid building placed
            # inside a ring-shaped feature's hole (a bunker core inside its
            # own earthwork berm) vanished entirely, because both features
            # shared one global mask/canvas and the ring's hole-punch ran
            # after the core had already been painted. Building this
            # feature's own exterior-minus-holes into a local mask first,
            # then merging via `lighter` (max, never subtracting), keeps a
            # later ring's hole from ever erasing pixels an earlier
            # feature already claimed.
            local_mask = Image.new("L", (tile.px, tile.px), 0)
            local_mask_drawer = ImageDraw.Draw(local_mask)
            local_mask_drawer.polygon([tile.to_px(x, y) for x, y in exterior], fill=255)
            for interior in interiors:
                if len(interior) >= 3:
                    local_mask_drawer.polygon([tile.to_px(x, y) for x, y in interior], fill=0)
            fill_layer = Image.new("RGB", (tile.px, tile.px), fill)
            building_buf.paste(fill_layer, (0, 0), local_mask)
            building_mask = ImageChops.lighter(building_mask, local_mask)
            bld_mask_drawer = ImageDraw.Draw(building_mask)
    building_arr = np.asarray(building_buf, dtype=np.float32)
    building_mask_arr = (np.asarray(building_mask, dtype=np.float32) / 255.0)[..., None]
    base_arr = np.asarray(img, dtype=np.float32)
    building_arr *= shadow
    np.clip(building_arr, 0, 255, out=building_arr)
    building_arr -= base_arr
    building_arr *= building_mask_arr
    base_arr += building_arr
    del building_arr
    img = Image.fromarray(np.clip(base_arr, 0, 255).astype(np.uint8))

    ink = style.colour("ink")
    outline_drawer = ImageDraw.Draw(img)
    for feature in local_features:
        if "building" not in feature.tags or feature.geom.is_empty:
            continue
        for exterior, interiors in geometry.iter_rings(feature.geom):
            outline_drawer.polygon([tile.to_px(x, y) for x, y in exterior], outline=ink,
                                   width=max(1, int(round(style.px("widths", "buildingOutline", tile.mpp)))))

    # --- building shadows (Minkowski sweep), composited over EVERYTHING ---
    # drawn so far -- roads, rivers, contours, and now buildings too.
    shadow_layer = Image.new("RGBA", (tile.px, tile.px), (0, 0, 0, 0))
    height_scale = float(style.shadow.get("buildingHeightScale", 0.55))
    shadow_alpha = int(style.lighting.get("buildingShadowAlpha", 92))
    dx, dy, _ = _light_shadow_vector(frame)
    for feature in local_features:
        if "building" not in feature.tags or feature.geom.is_empty:
            continue
        off = feature.height_m * height_scale
        swept = geometry.shadow_sweep(feature.geom, dx * off, dy * off)
        # shadow_sweep's Minkowski sum includes the source polygon itself
        # (correct for the swept region) -- subtract it back out here so a
        # building is never darkened by the shadow it casts, only by a
        # neighbour's.
        self_excluded = swept.difference(feature.geom)
        draw.fill_polygon_rgba(shadow_layer, self_excluded, tile, (38, 32, 28, shadow_alpha))
    blur_px = draw.blur_radius_px(style, "shadow", "buildingBlur", tile)
    if blur_px > 0:
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur_px))
    img = Image.alpha_composite(img.convert("RGBA"), shadow_layer).convert("RGB")

    d = ImageDraw.Draw(img, "RGBA")

    # --- bridges: redrawn ON TOP with their own shadow ---------------------
    bridge_feats = [f for f in local_features
                   if _road_class(f) and style.knows_road(f.tags["highway"]) and _is_bridge(f)]
    if bridge_feats:
        deck_m = float(style.shadow.get("bridgeDeckM", 8.0))
        boff = deck_m * height_scale
        bdx, bdy = dx * boff, dy * boff
        bshadow = Image.new("RGBA", (tile.px, tile.px), (0, 0, 0, 0))
        bsd = ImageDraw.Draw(bshadow, "RGBA")
        bridge_alpha = int(style.lighting.get("bridgeShadowAlpha", 80))
        widen = float(style.shadow.get("bridgeWidenM", 2.3))
        for feature in bridge_feats:
            from shapely import affinity as _affinity
            width = style.road_width_px(feature.tags["highway"], tile.mpp) + widen / tile.mpp
            shifted = _affinity.translate(feature.geom, xoff=bdx, yoff=bdy)
            draw.draw_line(bsd, shifted, tile, (30, 26, 22, bridge_alpha), width)
        bblur = draw.blur_radius_px(style, "shadow", "bridgeBlur", tile)
        if bblur > 0:
            bshadow = bshadow.filter(ImageFilter.GaussianBlur(bblur))
        img = Image.alpha_composite(img.convert("RGBA"), bshadow).convert("RGB")
        d = ImageDraw.Draw(img, "RGBA")
        _draw_roads(d, local_features, style, tile, only_bridges=True)

    # --- lamps -------------------------------------------------------------
    d = ImageDraw.Draw(img, "RGBA")
    lamp_r = style.px("widths", "lampRadius", tile.mpp)
    lamp_colour = style.colour("lamp")
    for point in fields.lamps:
        x, y = tile.to_px(point.x, point.y)
        d.ellipse([x - lamp_r, y - lamp_r, x + lamp_r, y + lamp_r], fill=lamp_colour)

    # --- supersample downsample: the actual anti-aliasing step -------------
    # THE MISSING STEP (found 2026-08-24, direct user report: "pixelated
    # lines... even at higher resolution"). `Tile.px` ("working canvas side,
    # BEFORE the final downsample") vs `Tile.px_out` ("output pixels, AFTER
    # downsampling") were always in the data model -- every draw call above
    # already runs at the bigger `tile.px` working resolution when
    # `supersample > 1` -- but nothing ever actually resized back down to
    # `tile.px_out`. PIL's ImageDraw has no native line/polygon antialiasing
    # at all, so every edge drew as a hard, aliased staircase regardless of
    # resolution: more total pixels, but each edge was still a single-pixel
    # step with no partial coverage, so "jagged" never actually improved.
    # Downsampling from a larger working canvas with a quality filter is the
    # standard fix (supersampling): each output pixel now blends several
    # working pixels together, giving real partial-coverage antialiasing on
    # every line and polygon edge. LANCZOS over BICUBIC specifically for
    # this direction (downsampling, not the upsampling _upsample() does
    # elsewhere in this module) -- PIL's own docs recommend it as the
    # sharpest high-quality choice for shrinking an image.
    #
    # This also fixes a latent, previously-unexercised bug: render_full's
    # canvas is sized by `px_per_tile` (== px_out), so pasting an
    # un-downsampled `tile.px`-sized image into it at supersample > 1 would
    # have overflowed each tile's slot into its neighbours' -- returning the
    # correctly `px_out`-sized image here is what makes that paste correct,
    # not just what makes edges look smooth.
    if tile.supersample > 1:
        img = img.resize((tile.px_out, tile.px_out), Image.LANCZOS)

    return img


def _light_shadow_vector(frame):
    from . import terrain
    return terrain.light_vector(frame.light_azimuth_deg, frame.light_altitude_deg,
                                frame.rotation_deg)


def _draw_roads(drawer: ImageDraw.ImageDraw, features: List[Feature], style: Style,
                tile: Tile, only_bridges: bool,
                mask_drawer: Optional[ImageDraw.ImageDraw] = None) -> None:
    """`mask_drawer`, when given, gets the SAME line drawn onto it in solid
    white (255) alongside the real colour -- how render_tile builds the mask
    for hillshade-tinting at-grade roads (see its own comment) without
    duplicating this casing/fill loop."""
    ink = style.colour("ink")
    casing_extra = style.metres("widths", "roadCasing")
    for casing in (True, False):
        for feature in features:
            hw = _road_class(feature)
            if not hw or not style.knows_road(hw):
                continue
            if _is_bridge(feature) != only_bridges:
                continue
            width_px = style.road_width_px(hw, tile.mpp)
            if casing:
                w = width_px + max(1.4, casing_extra / tile.mpp)
                colour = ink
            else:
                w = width_px
                tone = 246 if hw.split("_")[0] in ("motorway", "trunk", "primary") else 238
                colour = (tone, tone - 4, tone - 12)
            draw.draw_line(drawer, feature.geom, tile, colour, w, round_caps=True)
            if mask_drawer is not None:
                draw.draw_line(mask_drawer, feature.geom, tile, 255, w, round_caps=True)
