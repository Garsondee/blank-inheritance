"""Per-layer variants of citymap.render's render_tile, for exporting each
visual element as its own transparent PNG -- a hand-painting-in-Photoshop
workflow. `citymap/render.py` and `render_tile()` are NOT modified by this
module. Every `_layer_*`/`_build_*` function here reuses render.py's
already-factored-out pure helpers (feature predicates, field cropping,
palette lookups, roof-colour seeding, the road-drawing primitive) and
citymap/draw.py's hole-aware drawing primitives, and re-implements
render_tile's own per-feature drawing passes in a form that isolates each
element onto its own RGBA canvas instead of compositing into one running
image.

**"Reference grid" vs "tile grid".** This module's `grid-lines`/`grid-labels`
layers are a coordinate-reference overlay for a human painting over the
export -- unrelated to `Frame.grid_tiles`, the TILING grid `render_full`
uses elsewhere to split a big render into memory-sized pieces. Comments here
always say "reference grid" to keep the two apart.

**Fidelity is approximate by design for two layers, not a bug.** The goal is
clean ingredients for hand-finishing, not a guaranteed byte-identical
recombination of `render_tile`'s flattened output:

  - `hillshade`'s RGB is `clip(shade_rgb, 0, 1) * 255` -- `shade_rgb`'s real
    ceiling is ~1.22 (a warm-tint highlight peak, see `terrain.shade_rgb`),
    which a "Multiply" blend mode cannot express (Multiply can only darken
    or preserve -- its blend factor is 0-255 -> 0.0-1.0, never above).
    Recommended blend mode is still Multiply; the loss is a small highlight
    boost, not a visible defect.
  - `landuse`'s RGB is the same kind of multiply FACTOR (`landuse_colour /
    paper`, clipped to [0,1]), not the raw landuse colour -- exported this
    way so a real "Multiply" blend in Photoshop reproduces "relief shows
    through" the way render_tile's own tint-then-multiply does. Nothing in
    the shipped style file (`data/map/style/kurose-1950s.json`) actually
    exceeds 1.0 today, so the clip has no visible effect yet; it is a
    defensive floor in case a future style edit changes that. Because the
    exported value is a FACTOR relative to `paper`, this layer will look
    like an unfamiliar, boosted version of the true tint colour if viewed at
    face value in Normal blend -- it is calibrated for Multiply, not for
    swatching.

`terrain-shadow` (`shadow_mul`) has NO such approximation:
`terrain.cast_shadow_mul` is mathematically bounded to `[castShadowFloor,
1.0]` (never brightens), so plain Multiply reproduces it losslessly.

**Memory.** `iter_tile_layers` is a GENERATOR, not a dict-returning
function, specifically so a caller can write each layer to disk and drop it
before the next is computed. An earlier version of this design returned a
dict of all layers at once -- at production tile resolution that holds
several gigabytes for a single tile before anything reaches disk. Do not add
a caller that materializes the whole per-tile sequence at production
resolution; `render_tile_layers` below is a thin convenience wrapper for
tests and small preview tiles only.
"""

from __future__ import annotations

import math
import os
from collections import OrderedDict
from typing import Iterator, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from shapely import affinity as _affinity
from shapely.geometry import box

from . import contour, draw, geometry, rivers
from .fields import Fields
from .frame import Tile
from .parse import Feature
from .render import (
    BUILDING_MATERIAL_TAG,
    CANOPY_LANDUSE_KEYS,
    LOCAL_FEATURE_MARGIN_M,
    _building_roof_colour,
    _crop_elevation_for_tile,
    _crop_field_for_tile,
    _draw_roads,
    _is_bridge,
    _is_water_polygon,
    _light_shadow_vector,
    _palette_lookup,
    _road_class,
)
from .style import Style

STAGE_CODE_VERSION = 1

# Bottom-to-top z-order, and the filename-numbering/manifest order the CLI
# uses. "bridges" sits above "cast-shadows": in the real render_tile, a
# bridge deck is a THIRD pass, always redrawn on top with its own shadow,
# never part of the plain roads buffer and never shadow_mul-multiplied
# (render.py L613-636) -- folding it into "roads" or "cast-shadows" would
# silently regress the exact "bridges read as above what they cross" z-order
# fix that module's own docstring documents.
LAYER_ORDER: Tuple[str, ...] = (
    "land-base", "hillshade", "sea", "landuse", "zoning", "coastal-fade", "water-bodies",
    "contours", "rivers", "roads", "railways", "barriers", "buildings",
    "terrain-shadow", "cast-shadows", "bridges", "power", "structures", "lamps",
    "historic", "services", "evacuation", "neighbourhoods",
    "grid-lines", "grid-labels",
)

# "Normal" everywhere except the three fields that are genuine per-pixel
# multipliers in the original compositing (see module docstring).
LAYER_BLEND_HINTS = {name: "Normal" for name in LAYER_ORDER}
LAYER_BLEND_HINTS["hillshade"] = "Multiply"
LAYER_BLEND_HINTS["landuse"] = "Multiply"
LAYER_BLEND_HINTS["terrain-shadow"] = "Multiply"
LAYER_BLEND_HINTS["zoning"] = "Multiply"

# One-line notes for the CLI's manifest.json -- only layers with something
# non-obvious to say get an entry.
LAYER_NOTES = {
    "hillshade": "Multiply. Clipped to a max factor of 1.0 -- loses a small "
                "(~1.22x ceiling) highlight boost real Multiply blending "
                "cannot express; everything else is exact.",
    "landuse": "Multiply. RGB is the tint FACTOR relative to the paper "
              "colour, not the raw landuse colour -- looks unfamiliar at "
              "face value in Normal blend, correct once set to Multiply.",
    "terrain-shadow": "Multiply. Exact -- this multiplier is mathematically "
                      "bounded to [castShadowFloor, 1.0] and never needs to "
                      "brighten, unlike hillshade.",
    "cast-shadows": "Building cast shadows only (Minkowski sweep). Bridge "
                    "shadows live in the 'bridges' layer instead, matching "
                    "the original's own separate always-on-top bridge pass.",
    "bridges": "Bridge decks + their own shadow, redrawn on top of "
              "everything below -- never shadow-multiplied.",
    "grid-lines": "New reference overlay, not part of the map's own look.",
    "grid-labels": "New reference overlay. Numbered col,row from the "
                   "frame's own origin -- consistent across tiles.",
    "zoning": "Multiply. Legal land-use zoning (用途地域) from MLIT A29, in "
             "the conventional Japanese zoning-map colours -- residential "
             "greens, commercial pinks, industrial blues. Separate from the "
             "buildings layer on purpose: it says what the ground is ZONED "
             "for, which is not the same as what is built on it.",
    "barriers": "Walls, seawalls, retaining walls, fences and hedges "
               "(OSM barrier=*). Weighted by kind -- a seawall draws heavier "
               "than a hedge.",
    "power": "Transmission and distribution lines, their pylons/poles, and "
            "substations/plants. Drawn in red on purpose (direct request) so "
            "the grid reads as infrastructure, not terrain.",
    "structures": "man_made=* -- the small vertical stuff (silos, tanks, "
                 "chimneys, cranes, masts, water towers) as point marks, plus "
                 "linear/area works (piers, breakwaters, quays, embankments) "
                 "as outlines.",
    "historic": "Shrines, monuments, ruins, forts and archaeological sites. "
               "Wayside shrines dominate the count in this frame.",
    "services": "Civic services, glyph-coded by kind: cross = medical, square "
               "= police/fire, triangle = education, circle = civic/worship.",
    "evacuation": "Designated evacuation/assembly points, in signage green "
                 "(matching real Japanese evacuation signing). Given its own "
                 "layer and heavier marks deliberately.",
    "neighbourhoods": "Place-name labels (city/town/suburb/quarter/"
                     "neighbourhood), sized by rank, Japanese over romanised. "
                     "Placement is collision-avoided and computed over the "
                     "WHOLE frame deterministically, so a label never half- "
                     "appears at a tile seam.",
}

DEFAULT_GRID_SPACING_M = 500.0

_TRANSPARENT = (0, 0, 0, 0)
# Black, not a bright reference colour -- direct user feedback after seeing
# a real render (2026-09-10): thin black hairlines read as a technical-
# drawing reference grid, not a loud overlay. Kept less than fully opaque so
# the map content underneath is never fully hidden by a line crossing it.
_GRID_LINE_COLOUR = (0, 0, 0, 220)
_GRID_LABEL_COLOUR = (0, 0, 0, 230)
# Deliberately NOT scaled by tile.supersample (see _layer_grid_lines) --
# direct user feedback wanted lines "very thin... maybe even subpixel".
# Drawing a fixed 1 WORKING pixel regardless of supersample is what makes
# that literal: at supersample=1 this is the thinnest PIL can draw at all,
# and at supersample>1 the same 1-working-px line becomes LESS than one
# output pixel wide once render_tile_layers' own proven downsample step
# runs, appearing as a genuinely sub-pixel, softly antialiased hairline
# rather than a crisp solid line -- the opposite of scaling it UP with
# supersample, which would keep it a constant, comparatively thick width
# at every resolution.
_GRID_LINE_WIDTH_PX = 1

# A label's font size must scale with how many WORKING pixels a reference-
# grid cell actually spans, not a fixed size -- found live (2026-09-10) on a
# real render of the whole 12km production frame at a modest 512px preview
# size: a fixed ~16px font drawing "07,03" is several times wider than an
# ~8.5px-wide cell at that combination of extent/resolution/spacing, so
# EVERY label overlapped its neighbours into unreadable red clutter. Sizing
# off `cell_px` instead (itself derived from tile.mpp, which already bakes
# in supersample -- see Tile.mpp's own docstring) means this scales
# correctly for both a tight, high-resolution crop AND a whole-frame
# low-resolution overview without a separate supersample-only formula.
#
# The fraction below is 1/3 of the value that same live render used --
# direct follow-up user feedback on the actual output: the numbers were
# "far too large... taking up too much space", with the explicit intent
# that the fix is a much higher overall export resolution (the user's own
# example: "potentially 12k x 12k"), not a redesigned formula. At a real
# production resolution a reference-grid cell spans many more working
# pixels, so proportionally smaller text is still perfectly legible; at a
# small low-resolution preview it may now hit the MIN_PX floor sooner or
# the skip gate below, which is the correct, conservative failure mode.
_GRID_LABEL_FONT_FRACTION_OF_CELL = 0.20 / 3.0
_GRID_LABEL_FONT_MIN_PX = 6
_GRID_LABEL_FONT_MAX_PX = 22
# Below this many working pixels per cell, no font size can fit a label
# without overlapping its neighbours -- skip labels entirely rather than
# render clutter, the same call real cartographic labelling makes at a zoom
# level too dense for its own text. Left unchanged even though the text
# above shrank -- a conservative floor that skips labels a bit more often
# than strictly necessary is the safe direction to be wrong in; lower it if
# small-cell labels are wanted too.
_GRID_LABEL_MIN_CELL_PX = 60.0

# --- OSM annotation layers (added 2026-09-11) ------------------------------
# Every size below is in GROUND METRES, converted at draw time by dividing by
# tile.mpp -- the same rule style.py enforces on the style sheet, so a mark
# keeps its real-world size at any export resolution instead of shrinking to
# nothing on a big render. Annotation SYMBOLS are deliberately drawn larger
# than the thing they mark (an evacuation point is not really 60 m across);
# that is ordinary cartographic practice, unlike the footprints in the
# physical layers, which are true to the ground.
# 用途地域 tints, following the conventional colours a Japanese zoning map
# uses -- residential greens, commercial pinks/reds, industrial blues/purples
# -- but lightened, because this layer is blended MULTIPLY over the finished
# ground and a saturated fill would bury the terrain under it.
_ZONE_COLOURS = {
    "第一種低層住居専用地域": (214, 238, 206),
    "第二種低層住居専用地域": (206, 234, 198),
    "第一種中高層住居専用地域": (222, 240, 196),
    "第二種中高層住居専用地域": (214, 236, 188),
    "第一種住居地域": (238, 242, 200),
    "第二種住居地域": (234, 238, 192),
    "準住居地域": (238, 234, 196),
    "近隣商業地域": (246, 216, 208),
    "商業地域": (246, 200, 204),
    "準工業地域": (226, 214, 236),
    "工業地域": (206, 224, 240),
    "工業専用地域": (192, 214, 236),
}
_ZONE_DEFAULT_COLOUR = (226, 226, 222)

_POWER_COLOUR = (188, 52, 44, 235)          # red, by direct request
_POWER_MINOR_COLOUR = (188, 52, 44, 190)
_BARRIER_COLOUR = (58, 52, 46, 225)
_STRUCTURE_COLOUR = (70, 62, 54, 235)
_HISTORIC_COLOUR = (126, 74, 92, 235)       # muted plum, distinct from power red
_SERVICE_COLOUR = (52, 96, 120, 235)        # civic blue-teal
_EVAC_COLOUR = (28, 122, 74, 240)           # Japanese evacuation signage green
_LABEL_INK = (38, 33, 29, 255)
_LABEL_HALO = (236, 231, 217, 210)

_POWER_LINE_M = 3.0
_POWER_MINOR_LINE_M = 1.6
_PYLON_M = 22.0
_SUBSTATION_STROKE_M = 3.0
_BARRIER_HEAVY_M = 3.0                      # wall, seawall, retaining wall
_BARRIER_LIGHT_M = 1.4                      # fence, hedge, railing
_STRUCTURE_MARK_M = 28.0
_HISTORIC_MARK_M = 32.0
_SERVICE_MARK_M = 38.0
_EVAC_MARK_M = 58.0

_BARRIER_HEAVY_KINDS = frozenset({
    "wall", "city_wall", "retaining_wall", "seawall", "flood_wall", "jersey_barrier",
})
_BARRIER_SKIP_KINDS = frozenset({"kerb", "bollard", "gate", "lift_gate", "block", "cycle_barrier"})

# man_made values that are small vertical structures -- drawn as point marks
# even when OSM maps them as a tiny closed way, because at map scale their
# footprint is a couple of pixels and a mark reads where a footprint does not.
_STRUCTURE_POINT_KINDS = frozenset({
    "silo", "storage_tank", "chimney", "water_tower", "tower", "mast", "antenna",
    "crane", "gasometer", "kiln", "lighthouse", "windmill", "watermill",
    "communications_tower", "flagpole", "monitoring_station", "water_well",
    "campanile", "obelisk", "telescope", "cooling_tower",
})
# man_made values that are genuinely linear/area works -- drawn as outlines.
_STRUCTURE_LINEAR_KINDS = frozenset({
    "pier", "breakwater", "groyne", "quay", "embankment", "dyke", "levee",
    "pipeline", "bridge", "works", "wastewater_plant", "water_works",
    "reservoir_covered", "storage", "gantry",
})

_SERVICE_GLYPHS = {
    "cross": ("hospital", "clinic", "doctors", "pharmacy", "dentist", "veterinary"),
    "square": ("police", "fire_station", "ranger_station"),
    "triangle": ("school", "kindergarten", "university", "college", "library", "driving_school"),
    "circle": ("townhall", "post_office", "community_centre", "place_of_worship",
               "social_facility", "courthouse", "embassy", "public_building"),
}
_SERVICE_KIND_TO_GLYPH = {v: glyph for glyph, values in _SERVICE_GLYPHS.items() for v in values}

# OSM tagging for "somewhere to go when it goes wrong". Japanese mapping uses
# both of these; the official MLIT designation (指定緊急避難場所) is a separate
# dataset entirely -- see the CLI's --evacuation-geojson option.
_EVAC_EMERGENCY_VALUES = frozenset({"assembly_point", "evacuation_centre", "shelter"})
_EVAC_AMENITY_VALUES = frozenset({"shelter", "refuge"})

# Place ranks worth labelling, and their label height in GROUND METRES. A
# 12 km frame exported at 12000 px is 1 m/px, so these are also pixel heights
# at full export scale.
_PLACE_LABEL_M = {
    "city": 170.0, "borough": 130.0, "town": 120.0, "suburb": 95.0,
    "quarter": 72.0, "neighbourhood": 60.0, "village": 90.0,
    "hamlet": 55.0, "locality": 50.0, "island": 110.0, "islet": 60.0,
}
_PLACE_MIN_LABEL_PX = 15.0      # below this a label is illegible; skip it
_PLACE_LABEL_MARGIN_M = 900.0   # tile overlap so a label never half-appears at a seam
# Breathing room around each label's collision box, as a multiple of its own
# measured size. Japanese chōme divisions are small and numerous -- central
# Kobe alone has hundreds -- so a box sized exactly to the glyphs still packs
# them wall to wall.
#
# Tuned deliberately SPARSE (direct instruction: "instinct should be towards
# less labels rather than too many"), and that is the right way round to be
# wrong: this is a standalone layer over a hand-painted map, so a missing
# name costs one manual addition, while an over-labelled layer costs erasing
# hundreds. Important places are sorted first and therefore win the greedy
# pass, so raising this thins the chōme-level noise before it touches the
# ward and city names.
_PLACE_LABEL_PAD = 2.3

# Same lookup list as _spike8_reference.py's find_font (the only other place
# in this tool that has ever drawn text) -- Japanese-capable faces first,
# matching this campaign's Japanese setting, falling back to Latin faces and
# finally PIL's built-in bitmap font. Windows-only; the installed Pillow
# (9.5.0, confirmed) predates a scalable ImageFont.load_default(size=...),
# so a real TTF is the only way to get legible text at export resolution.
_FONT_CANDIDATES = ("YuGothM.ttc", "meiryo.ttc", "msgothic.ttc", "segoeui.ttf", "arial.ttf")
_FONT_DIR = "C:\\Windows\\Fonts"


def _find_font(size: int):
    size = max(1, int(size))
    for name in _FONT_CANDIDATES:
        path = os.path.join(_FONT_DIR, name)
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _new_layer(tile: Tile) -> Image.Image:
    return Image.new("RGBA", (tile.px, tile.px), _TRANSPARENT)


def _finish(img: Image.Image, tile: Tile) -> Image.Image:
    """The same supersample -> output LANCZOS downsample citymap.render's
    render_tile performs once at the very end (its own comment: "THE
    MISSING STEP" -- the project's proven antialiasing fix). Duplicated here
    (rather than imported) because extracting it out of citymap/render.py
    would still touch the one file this module is built to leave at zero
    diff. Applied per layer, so alpha edges get the same real partial-pixel
    antialiasing as colour edges."""
    if tile.supersample > 1:
        return img.resize((tile.px_out, tile.px_out), Image.LANCZOS)
    return img


def _paste_fill(layer: Image.Image, geom, tile: Tile, colour: Tuple[int, int, int],
                alpha: int = 255) -> None:
    """Hole-aware opaque(ish) fill onto an RGBA layer. Reuses
    draw.polygon_mask (the same hole-aware mask draw.fill_polygon itself
    uses for RGB) as a paste stencil: a soft-masked paste writes colour+alpha
    only where the mask says, leaving the rest of the layer (still
    transparent) untouched -- verified directly that this correctly leaves a
    hole transparent rather than solid."""
    if geom is None or geom.is_empty:
        return
    mask = draw.polygon_mask(geom, tile)
    patch = Image.new("RGBA", layer.size, tuple(colour) + (int(alpha),))
    layer.paste(patch, (0, 0), mask)


# --- shared per-tile lookups ------------------------------------------------

def _sea_geom_and_mask(fields: Fields, tile: Tile):
    sea_features = fields.sea_features()
    if not sea_features:
        return None, None
    sea_geom = sea_features[0].geom
    return sea_geom, draw.polygon_mask(sea_geom, tile)


# --- individual layers -------------------------------------------------------

def _layer_land_base(style: Style, tile: Tile) -> Image.Image:
    return Image.new("RGBA", (tile.px, tile.px), tuple(style.colour("paper")) + (255,))


def _layer_hillshade(fields: Fields, tile: Tile, sea_mask_img: Optional[Image.Image]) -> Image.Image:
    frame = tile.frame
    shade = _crop_field_for_tile(fields.shade_rgb, frame.extent_m, tile, tile.px)
    rgb = np.clip(shade, 0.0, 1.0) * 255.0
    if sea_mask_img is not None:
        sea_arr = np.asarray(sea_mask_img, dtype=np.uint8)
        alpha = np.where(sea_arr > 0, 0, 255).astype(np.uint8)
    else:
        alpha = np.full((tile.px, tile.px), 255, dtype=np.uint8)
    rgba = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(rgba, mode="RGBA")


def _layer_sea(fields: Fields, style: Style, tile: Tile, sea_geom,
               sea_mask_img: Optional[Image.Image]) -> Image.Image:
    layer = _new_layer(tile)
    if sea_geom is None or sea_mask_img is None:
        return layer
    frame = tile.frame
    _paste_fill(layer, sea_geom, tile, style.colour("seaShallow"))

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

        tone_img = Image.fromarray(np.clip(tone, 0, 255).astype(np.uint8)).convert("RGBA")
        tone_img.putalpha(sea_mask_img)
        layer.alpha_composite(tone_img)

    drawer = ImageDraw.Draw(layer, "RGBA")
    draw.stroke_rings(drawer, sea_geom, tile, style.colour("coastInk"),
                      style.px("widths", "coastStroke", tile.mpp))
    return layer


def _build_landuse(fields: Fields, style: Style, tile: Tile,
                   local_features: List[Feature]) -> Tuple[Image.Image, Image.Image]:
    """Returns (rgba_layer, landuse_mask). `landuse_mask` ('L', 0/255) is
    reused by `_layer_coastal_fade` -- the same lu_mask_arr render_tile
    itself threads from the landuse section into the coastal-fade section."""
    frame = tile.frame
    paper = style.colour("paper")
    landuse_buf = Image.new("RGB", (tile.px, tile.px), paper)
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

    if fields.canopy_t is not None:
        canopy_mask_arr = np.asarray(canopy_mask, dtype=np.float32) / 255.0
        if canopy_mask_arr.any():
            t = _crop_field_for_tile(fields.canopy_t, frame.extent_m, tile, tile.px)
            t = np.clip(t, 0.0, 1.0) ** style.canopy_gamma()
            noise_rgb = _palette_lookup(t, style.canopy_palette())
            lu_arr_pre = np.asarray(landuse_buf, dtype=np.float32)
            lu_arr_pre = np.where(canopy_mask_arr[..., None] > 0.5, noise_rgb, lu_arr_pre)
            landuse_buf = Image.fromarray(np.clip(lu_arr_pre, 0, 255).astype(np.uint8))

    # Export the MULTIPLY FACTOR (landuse_colour / paper), not the raw
    # colour -- see module docstring. Matches render_tile's own
    # `lu_arr /= paper` (L366) exactly, just packaged as an image instead of
    # consumed inline.
    paper_arr = np.asarray(paper, dtype=np.float32)
    factor = np.asarray(landuse_buf, dtype=np.float32) / paper_arr
    factor_rgb = np.clip(factor, 0.0, 1.0) * 255.0
    rgba = np.dstack([factor_rgb.astype(np.uint8), np.asarray(landuse_mask, dtype=np.uint8)])
    return Image.fromarray(rgba, mode="RGBA"), landuse_mask


def _layer_coastal_fade(fields: Fields, style: Style, tile: Tile, sea_geom,
                        sea_mask_img: Optional[Image.Image], landuse_mask: Image.Image) -> Image.Image:
    layer = _new_layer(tile)
    if fields.coast_fade_t is None or sea_geom is None or sea_mask_img is None:
        return layer
    frame = tile.frame
    fade_t = _crop_field_for_tile(fields.coast_fade_t, frame.extent_m, tile, tile.px)
    sea_mask_arr = np.asarray(sea_mask_img, dtype=np.float32) / 255.0
    lu_mask_arr = np.asarray(landuse_mask, dtype=np.float32) / 255.0
    # Exact reproduction of render_tile's true lerp (base + (target-base)*w):
    # Normal-blend compositing a flat colour with alpha=w IS that lerp.
    blend = (1.0 - fade_t) * (1.0 - sea_mask_arr) * (1.0 - lu_mask_arr)
    alpha = np.clip(blend * 255.0, 0, 255).astype(np.uint8)
    colour = style.colour("coastFade")
    rgb = np.empty((tile.px, tile.px, 3), dtype=np.uint8)
    rgb[..., 0], rgb[..., 1], rgb[..., 2] = colour[0], colour[1], colour[2]
    rgba = np.dstack([rgb, alpha])
    return Image.fromarray(rgba, mode="RGBA")


def _layer_water_bodies(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    layer = _new_layer(tile)
    drawer = ImageDraw.Draw(layer, "RGBA")
    width = style.px("widths", "waterStroke", tile.mpp)
    for feature in local_features:
        if _is_water_polygon(feature):
            _paste_fill(layer, feature.geom, tile, style.colour("water"))
            draw.stroke_rings(drawer, feature.geom, tile, style.colour("coastInk"), width)
    return layer


def _layer_contours(style: Style, tile: Tile, contour_lines, dem_n: int,
                    crop_ix0: int, crop_iy0: int) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    frame = tile.frame
    for line in contour_lines:
        colour = style.colour("contourIndex" if line.major else "contourMinor")
        width = style.px("widths", "contourIndex" if line.major else "contourMinor", tile.mpp)
        for (c0, r0), (c1, r1) in line.segments:
            x0m, y0m = contour.grid_to_map(c0 + crop_ix0, r0 + crop_iy0, *frame.origin, frame.extent_m, dem_n)
            x1m, y1m = contour.grid_to_map(c1 + crop_ix0, r1 + crop_iy0, *frame.origin, frame.extent_m, dem_n)
            d.line([tile.to_px(x0m, y0m), tile.to_px(x1m, y1m)],
                  fill=colour, width=max(1, int(round(width))))
    return layer


def _layer_rivers(fields: Fields, style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    water_colour = style.colour("water")
    river_width_by_id = rivers.river_widths_m(
        fields.features, style.metres("widths", "riverMin"), style.metres("widths", "riverMax"))
    river_source_ids = rivers.source_feature_ids(fields.features)
    river_min_px = style.px("widths", "riverMin", tile.mpp)
    for feature in local_features:
        if not feature.area and feature.tags.get("waterway") in rivers.WATERWAY_CLASSES:
            width_m = river_width_by_id.get(feature.id, style.metres("widths", "riverMin"))
            full_width_m = max(river_min_px, width_m / tile.mpp) * tile.mpp
            if feature.id in river_source_ids:
                vertex_widths = rivers.vertex_widths_m(feature, full_width_m, is_source=True)
                draw.draw_tapered_line(d, feature.geom, tile, water_colour, vertex_widths)
            else:
                draw.draw_line(d, feature.geom, tile, water_colour, full_width_m / tile.mpp)
    return layer


def _build_roads(style: Style, tile: Tile, local_features: List[Feature]) -> Tuple[Image.Image, Image.Image]:
    """True (unshadowed) road colour, plus the mask `terrain-shadow` needs.
    Reuses render.py's own `_draw_roads`, which already supports drawing the
    same stroke onto a parallel mask -- built for exactly this, see its own
    docstring."""
    layer = _new_layer(tile)
    mask = Image.new("L", (tile.px, tile.px), 0)
    d = ImageDraw.Draw(layer, "RGBA")
    _draw_roads(d, local_features, style, tile, only_bridges=False,
               mask_drawer=ImageDraw.Draw(mask))
    return layer, mask


def _layer_railways(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    width = style.px("widths", "railway", tile.mpp)
    for feature in local_features:
        if feature.tags.get("railway") and not feature.area:
            draw.draw_line(d, feature.geom, tile, style.colour("railway"), width)
    return layer


def _build_buildings(style: Style, tile: Tile, local_features: List[Feature]) -> Tuple[Image.Image, Image.Image]:
    """True (unshadowed) building fill + flat ink outline, plus the fill-only
    mask `terrain-shadow` needs (the original never shadow-multiplies the
    outline either, so the returned mask deliberately excludes it -- see
    inline note below)."""
    layer_buf = Image.new("RGB", (tile.px, tile.px), style.colour("paper"))
    building_mask = Image.new("L", (tile.px, tile.px), 0)
    bld_drawer = ImageDraw.Draw(layer_buf)
    bld_mask_drawer = ImageDraw.Draw(building_mask)
    low = style.colour("buildingLow")
    for feature in local_features:
        if "building" not in feature.tags or feature.geom.is_empty:
            continue
        material_fill = style.material_colour(feature.tags.get(BUILDING_MATERIAL_TAG))
        if material_fill is not None:
            fill = material_fill
        else:
            blend_min, blend_max = 0.55, 0.90
            height_k = min(1.0, feature.height_m / 55.0)
            blend = blend_min + (blend_max - blend_min) * height_k
            roof = _building_roof_colour(feature.id, style.building_roof_palette())
            fill = tuple(int(low[i] + (roof[i] - low[i]) * blend) for i in range(3))
        for exterior, interiors in geometry.iter_rings(feature.geom):
            if len(exterior) < 3:
                continue
            if not any(len(interior) >= 3 for interior in interiors):
                bld_drawer.polygon([tile.to_px(x, y) for x, y in exterior], fill=fill)
                bld_mask_drawer.polygon([tile.to_px(x, y) for x, y in exterior], fill=255)
                continue
            # A polygon WITH a hole must be isolated in its own local mask
            # before merging -- see render_tile's own comment for the real
            # bug (a building inside another's courtyard vanishing) this
            # guards against. `lighter` (max) never erases a pixel an
            # earlier feature already claimed.
            local_mask = Image.new("L", (tile.px, tile.px), 0)
            local_mask_drawer = ImageDraw.Draw(local_mask)
            local_mask_drawer.polygon([tile.to_px(x, y) for x, y in exterior], fill=255)
            for interior in interiors:
                if len(interior) >= 3:
                    local_mask_drawer.polygon([tile.to_px(x, y) for x, y in interior], fill=0)
            fill_layer = Image.new("RGB", (tile.px, tile.px), fill)
            layer_buf.paste(fill_layer, (0, 0), local_mask)
            building_mask = ImageChops.lighter(building_mask, local_mask)
            bld_mask_drawer = ImageDraw.Draw(building_mask)

    # Package fill+mask as RGBA FIRST, then draw the outline directly onto
    # the resulting RGBA image (not onto layer_buf) -- an outline stroke
    # straddles its own fill's boundary, so a pixel just outside
    # `building_mask` would otherwise carry ink colour but alpha=0
    # (invisible) in the final export. Drawing it with an explicit RGBA
    # colour on an "RGBA"-mode draw sets real alpha=255 wherever the stroke
    # itself lands, regardless of the fill mask.
    rgba = np.dstack([np.asarray(layer_buf, dtype=np.uint8), np.asarray(building_mask, dtype=np.uint8)])
    img = Image.fromarray(rgba, mode="RGBA")
    outline_drawer = ImageDraw.Draw(img, "RGBA")
    outline_width = max(1, int(round(style.px("widths", "buildingOutline", tile.mpp))))
    ink = style.colour("ink")
    for feature in local_features:
        if "building" not in feature.tags or feature.geom.is_empty:
            continue
        for exterior, interiors in geometry.iter_rings(feature.geom):
            outline_drawer.polygon([tile.to_px(x, y) for x, y in exterior],
                                   outline=ink, width=outline_width)
    return img, building_mask


def _layer_terrain_shadow(fields: Fields, tile: Tile, roads_mask: Image.Image,
                          buildings_mask: Image.Image) -> Image.Image:
    layer = _new_layer(tile)
    if fields.shadow_mul is None:
        return layer
    frame = tile.frame
    shadow = _crop_field_for_tile(fields.shadow_mul, frame.extent_m, tile, tile.px)
    # Bounded to [castShadowFloor, 1.0] by construction (terrain.cast_shadow_mul)
    # -- this clip is a no-op safety net, not a real approximation.
    rgb = np.clip(shadow, 0.0, 1.0) * 255.0
    # Alpha = wherever EITHER roads or buildings actually drew something --
    # derived from those layers' own masks (built anyway) rather than a
    # separately-tracked footprint, so railways (confirmed never
    # shadow-multiplied in the original) are excluded BY CONSTRUCTION, not
    # by a special case someone could "fix" away later.
    combined_mask = ImageChops.lighter(roads_mask, buildings_mask)
    alpha = np.asarray(combined_mask, dtype=np.uint8)
    rgba = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(rgba, mode="RGBA")


def _layer_cast_shadows(style: Style, tile: Tile, local_features: List[Feature],
                        dx: float, dy: float) -> Image.Image:
    """Building Minkowski-sweep shadows ONLY -- bridge shadows are their own
    layer (see LAYER_ORDER's comment)."""
    layer = _new_layer(tile)
    height_scale = float(style.shadow.get("buildingHeightScale", 0.55))
    shadow_alpha = int(style.lighting.get("buildingShadowAlpha", 92))
    for feature in local_features:
        if "building" not in feature.tags or feature.geom.is_empty:
            continue
        off = feature.height_m * height_scale
        swept = geometry.shadow_sweep(feature.geom, dx * off, dy * off)
        self_excluded = swept.difference(feature.geom)
        draw.fill_polygon_rgba(layer, self_excluded, tile, (38, 32, 28, shadow_alpha))
    blur_px = draw.blur_radius_px(style, "shadow", "buildingBlur", tile)
    if blur_px > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur_px))
    return layer


def _layer_bridges(style: Style, tile: Tile, local_features: List[Feature],
                   dx: float, dy: float) -> Image.Image:
    """Bridge shadow + bridge deck, one combined layer -- matches the
    original's own single "redrawn on top with its own shadow" step
    (render.py L613-636). Never shadow_mul-multiplied."""
    layer = _new_layer(tile)
    bridge_feats = [f for f in local_features
                   if _road_class(f) and style.knows_road(f.tags["highway"]) and _is_bridge(f)]
    if not bridge_feats:
        return layer
    height_scale = float(style.shadow.get("buildingHeightScale", 0.55))
    deck_m = float(style.shadow.get("bridgeDeckM", 8.0))
    boff = deck_m * height_scale
    bdx, bdy = dx * boff, dy * boff
    bridge_alpha = int(style.lighting.get("bridgeShadowAlpha", 80))
    widen = float(style.shadow.get("bridgeWidenM", 2.3))
    shadow_drawer = ImageDraw.Draw(layer, "RGBA")
    for feature in bridge_feats:
        width = style.road_width_px(feature.tags["highway"], tile.mpp) + widen / tile.mpp
        shifted = _affinity.translate(feature.geom, xoff=bdx, yoff=bdy)
        draw.draw_line(shadow_drawer, shifted, tile, (30, 26, 22, bridge_alpha), width)
    bblur = draw.blur_radius_px(style, "shadow", "bridgeBlur", tile)
    if bblur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(bblur))
    deck_drawer = ImageDraw.Draw(layer, "RGBA")
    _draw_roads(deck_drawer, local_features, style, tile, only_bridges=True)
    return layer


def _layer_lamps(fields: Fields, style: Style, tile: Tile) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    lamp_r = style.px("widths", "lampRadius", tile.mpp)
    lamp_colour = style.colour("lamp")
    for point in fields.lamps:
        x, y = tile.to_px(point.x, point.y)
        d.ellipse([x - lamp_r, y - lamp_r, x + lamp_r, y + lamp_r], fill=lamp_colour)
    return layer


def _layer_zoning(tile: Tile, zoning: Optional[List[dict]]) -> Image.Image:
    """Legal land-use zoning as a Multiply tint. `zoning` arrives already in
    MAP space from citymap.external.load_zoning -- the lon/lat -> map
    transform runs once per render there, not once per tile here."""
    layer = _new_layer(tile)
    if not zoning:
        return layer
    for zone in zoning:
        colour = _ZONE_COLOURS.get(zone.get("zone"), _ZONE_DEFAULT_COLOUR)
        _paste_fill(layer, zone["geom"], tile, colour)
    return layer


# --- OSM annotation layers --------------------------------------------------

def _anchor_px(feature: Feature, tile: Tile):
    """Where a feature's mark goes: its own point, or a polygon/line's
    representative interior point (NOT the centroid -- a centroid can fall
    outside a crescent-shaped breakwater or a C-shaped pier)."""
    geom = feature.geom
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Point":
        return tile.to_px(geom.x, geom.y)
    try:
        pt = geom.representative_point()
    except Exception:
        return None
    return tile.to_px(pt.x, pt.y)


def _draw_mark(d: ImageDraw.ImageDraw, xy, glyph: str, r: float, colour, stroke: float) -> None:
    """One annotation symbol. Glyph shapes are chosen to stay legible when
    they overlap each other at map scale -- outline-only for the common ones
    so a cluster reads as several marks rather than one blob."""
    x, y = xy
    w = max(1, int(round(stroke)))
    if glyph == "dot":
        d.ellipse([x - r, y - r, x + r, y + r], fill=colour)
    elif glyph == "circle":
        d.ellipse([x - r, y - r, x + r, y + r], outline=colour, width=w)
    elif glyph == "ring":
        d.ellipse([x - r, y - r, x + r, y + r], outline=colour, width=w)
        d.ellipse([x - r * 0.38, y - r * 0.38, x + r * 0.38, y + r * 0.38], fill=colour)
    elif glyph == "square":
        d.rectangle([x - r, y - r, x + r, y + r], outline=colour, width=w)
    elif glyph == "filled_square":
        d.rectangle([x - r, y - r, x + r, y + r], fill=colour)
    elif glyph == "triangle":
        d.polygon([(x, y - r), (x + r, y + r * 0.78), (x - r, y + r * 0.78)],
                 outline=colour, width=w)
    elif glyph == "cross":
        d.line([(x - r, y), (x + r, y)], fill=colour, width=w)
        d.line([(x, y - r), (x, y + r)], fill=colour, width=w)
    elif glyph == "x":
        d.line([(x - r, y - r), (x + r, y + r)], fill=colour, width=w)
        d.line([(x - r, y + r), (x + r, y - r)], fill=colour, width=w)
    elif glyph == "pylon":
        # A pylon reads better as an X in a frame than as a dot -- it is a
        # lattice tower seen from above, and it has to stay distinguishable
        # from the substation squares on the same layer.
        d.line([(x - r, y - r), (x + r, y + r)], fill=colour, width=w)
        d.line([(x - r, y + r), (x + r, y - r)], fill=colour, width=w)
        d.rectangle([x - r, y - r, x + r, y + r], outline=colour, width=max(1, w // 2))


def _layer_barriers(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    heavy_px = max(1.0, _BARRIER_HEAVY_M / tile.mpp)
    light_px = max(1.0, _BARRIER_LIGHT_M / tile.mpp)
    for feature in local_features:
        kind = feature.tags.get("barrier")
        if not kind or kind in _BARRIER_SKIP_KINDS:
            continue
        width = heavy_px if kind in _BARRIER_HEAVY_KINDS else light_px
        geom = feature.geom
        if geom is None or geom.is_empty or geom.geom_type == "Point":
            continue
        if feature.area:
            draw.stroke_rings(d, geom, tile, _BARRIER_COLOUR, width)
        else:
            draw.draw_line(d, geom, tile, _BARRIER_COLOUR, width)
    return layer


def _layer_power(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    """Lines, pylons and substations, in red (direct request). Drawn above the
    physical map because overhead transmission genuinely is above it."""
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    line_px = max(1.0, _POWER_LINE_M / tile.mpp)
    minor_px = max(1.0, _POWER_MINOR_LINE_M / tile.mpp)
    sub_px = max(1.0, _SUBSTATION_STROKE_M / tile.mpp)
    pylon_r = max(1.5, _PYLON_M / tile.mpp / 2.0)

    for feature in local_features:
        kind = feature.tags.get("power")
        if not kind:
            continue
        geom = feature.geom
        if geom is None or geom.is_empty:
            continue
        if kind in ("line", "cable"):
            draw.draw_line(d, geom, tile, _POWER_COLOUR, line_px)
        elif kind == "minor_line":
            draw.draw_line(d, geom, tile, _POWER_MINOR_COLOUR, minor_px)
        elif kind in ("substation", "plant", "generator", "transformer"):
            if feature.area:
                draw.stroke_rings(d, geom, tile, _POWER_COLOUR, sub_px)
            anchor = _anchor_px(feature, tile)
            if anchor is not None:
                _draw_mark(d, anchor, "filled_square", pylon_r * 0.9, _POWER_COLOUR, sub_px)
        elif kind in ("tower", "portal"):
            anchor = _anchor_px(feature, tile)
            if anchor is not None:
                _draw_mark(d, anchor, "pylon", pylon_r, _POWER_COLOUR, max(1.0, line_px * 0.8))
        elif kind == "pole":
            anchor = _anchor_px(feature, tile)
            if anchor is not None:
                _draw_mark(d, anchor, "dot", max(1.0, pylon_r * 0.34), _POWER_MINOR_COLOUR, 1)
    return layer


def _layer_structures(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    """man_made=* -- small vertical structures as marks, linear/area works as
    outlines. Deliberately one layer: they are the same kind of thing (built
    infrastructure that is not a building) and splitting them would multiply
    near-empty PNGs."""
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    mark_r = max(1.5, _STRUCTURE_MARK_M / tile.mpp / 2.0)
    stroke = max(1.0, 2.0 / tile.mpp)
    for feature in local_features:
        kind = feature.tags.get("man_made")
        if not kind:
            continue
        geom = feature.geom
        if geom is None or geom.is_empty:
            continue
        if kind in _STRUCTURE_LINEAR_KINDS and geom.geom_type != "Point":
            if feature.area:
                draw.stroke_rings(d, geom, tile, _STRUCTURE_COLOUR, stroke)
            else:
                draw.draw_line(d, geom, tile, _STRUCTURE_COLOUR, stroke)
            continue
        if kind in _STRUCTURE_POINT_KINDS or geom.geom_type == "Point":
            anchor = _anchor_px(feature, tile)
            if anchor is not None:
                _draw_mark(d, anchor, "circle", mark_r, _STRUCTURE_COLOUR, stroke)
                _draw_mark(d, anchor, "dot", mark_r * 0.3, _STRUCTURE_COLOUR, stroke)
    return layer


def _layer_historic(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    mark_r = max(1.5, _HISTORIC_MARK_M / tile.mpp / 2.0)
    stroke = max(1.0, 2.2 / tile.mpp)
    for feature in local_features:
        kind = feature.tags.get("historic")
        if not kind or kind == "no":
            continue
        geom = feature.geom
        if geom is None or geom.is_empty:
            continue
        if feature.area and geom.geom_type != "Point":
            draw.stroke_rings(d, geom, tile, _HISTORIC_COLOUR, stroke)
        anchor = _anchor_px(feature, tile)
        if anchor is not None:
            _draw_mark(d, anchor, "x", mark_r * 0.72, _HISTORIC_COLOUR, stroke)
            _draw_mark(d, anchor, "circle", mark_r, _HISTORIC_COLOUR, stroke)
    return layer


def _layer_services(style: Style, tile: Tile, local_features: List[Feature]) -> Image.Image:
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    mark_r = max(1.5, _SERVICE_MARK_M / tile.mpp / 2.0)
    stroke = max(1.0, 2.4 / tile.mpp)
    for feature in local_features:
        kind = feature.tags.get("amenity")
        if not kind:
            continue
        glyph = _SERVICE_KIND_TO_GLYPH.get(kind)
        if glyph is None:
            continue
        # An evacuation shelter is claimed by the evacuation layer instead, so
        # the two layers never double-mark the same point.
        if kind in _EVAC_AMENITY_VALUES:
            continue
        anchor = _anchor_px(feature, tile)
        if anchor is None:
            continue
        _draw_mark(d, anchor, glyph, mark_r, _SERVICE_COLOUR, stroke)
    return layer


def _layer_evacuation(style: Style, tile: Tile, local_features: List[Feature],
                      evacuation_sites: Optional[List[dict]] = None) -> Image.Image:
    """Its own layer, heavier marks, signage green -- by direct request, and
    because in a civil-defence campaign 'where do people go' is not a footnote
    on the services layer.

    Two sources, deliberately merged here rather than upstream. `local_features`
    contributes whatever OSM tagged (very little: measured at zero
    `emergency=assembly_point` across the real frame). `evacuation_sites` is
    the official GSI designated-site set in MAP space -- see citymap/external.py
    for why that is the real source and what its licence requires.

    A site designated against a WATER hazard (tsunami, storm surge, flood,
    inland flooding) gets a filled core; everything else stays hollow. On a
    port-city map that is the distinction worth carrying in the symbol, and it
    is real data, not decoration -- 313 of the 413 sites in this frame are
    tsunami-rated.
    """
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")
    mark_r = max(2.0, _EVAC_MARK_M / tile.mpp / 2.0)
    stroke = max(1.0, 4.0 / tile.mpp)

    for feature in local_features:
        emergency = feature.tags.get("emergency")
        amenity = feature.tags.get("amenity")
        is_evac = (emergency in _EVAC_EMERGENCY_VALUES) or (amenity in _EVAC_AMENITY_VALUES)
        if not is_evac:
            continue
        anchor = _anchor_px(feature, tile)
        if anchor is None:
            continue
        _draw_mark(d, anchor, "ring", mark_r, _EVAC_COLOUR, stroke)
        _draw_mark(d, anchor, "circle", mark_r * 1.38, _EVAC_COLOUR, max(1.0, stroke * 0.6))

    for site in evacuation_sites or ():
        anchor = tile.to_px(site["map_x"], site["map_y"])
        # More designated hazards means a more broadly usable site; let the
        # symbol grow a little with that, bounded so a 6-hazard site does not
        # dwarf its neighbours.
        scale = 1.0 + 0.07 * min(int(site.get("count", 0)), 6)
        r = mark_r * scale
        _draw_mark(d, anchor, "circle", r, _EVAC_COLOUR, stroke)
        if site.get("water"):
            _draw_mark(d, anchor, "dot", r * 0.42, _EVAC_COLOUR, stroke)
    return layer


# Memo for frame-wide label placement. Keyed by the Fields identity and the
# tile's metres-per-pixel -- placement must be IDENTICAL for every tile of one
# render (otherwise a label accepted on one tile and rejected on its neighbour
# tears in half at the seam), and mpp is the only tile property it depends on.
_PLACE_LABEL_CACHE = {}


def clear_place_label_cache() -> None:
    """Drop the frame-wide label-placement memo. Only tests need this; a real
    render builds one entry and throws the process away."""
    _PLACE_LABEL_CACHE.clear()

_PLACE_RANK_ORDER = ("city", "borough", "town", "island", "village", "suburb",
                     "quarter", "neighbourhood", "islet", "hamlet", "locality")


def _text_width_em(text: str) -> float:
    """Advance width in em units, without needing a font loaded.

    CJK glyphs are FULL-width -- one em each -- while Latin averages about
    half that. Treating everything as ~0.6 em (the first cut of this code)
    under-measured a Japanese place name by around 60%, so the collision test
    below accepted labels that visibly overlapped once drawn. Found by looking
    at a real render of central Kobe, where the chōme labels piled on top of
    each other into unreadable mush."""
    total = 0.0
    for ch in text:
        total += 1.0 if ord(ch) > 0x2E7F else 0.52
    return total


def _place_label_text(feature: Feature):
    primary = feature.tags.get("name:ja") or feature.tags.get("name")
    if not primary:
        return None
    roman = feature.tags.get("name:en") or feature.tags.get("name:ja_rm")
    if roman and roman.lower() == str(primary).lower():
        roman = None
    return primary, roman


def _accepted_place_labels(fields: Fields, tile: Tile):
    """Greedy, deterministic, collision-avoided label set for the WHOLE frame.

    Computed over `fields.features` (frame-wide), never the per-tile subset,
    and ordered by a stable key, so every tile of a tiled export independently
    arrives at exactly the same accepted set -- the same reasoning
    `_layer_grid_labels` uses for numbering from the frame origin rather than
    the tile's. Returns [(map_x, map_y, primary, roman, height_m)].
    """
    # `len(features)` rides along in the key purely so a recycled id() from a
    # garbage-collected Fields cannot silently serve another object's labels.
    key = (id(fields), len(fields.features), round(tile.mpp, 6))
    cached = _PLACE_LABEL_CACHE.get(key)
    if cached is not None:
        return cached

    candidates = []
    for feature in fields.features:
        geom = feature.geom
        if geom is None or geom.is_empty or geom.geom_type != "Point":
            continue
        place = feature.tags.get("place")
        if place not in _PLACE_LABEL_M:
            continue
        text = _place_label_text(feature)
        if text is None:
            continue
        rank = _PLACE_RANK_ORDER.index(place) if place in _PLACE_RANK_ORDER else len(_PLACE_RANK_ORDER)
        candidates.append((rank, feature.id, place, geom.x, geom.y, text))
    # Important places first, then a stable tiebreak on the feature's own id.
    candidates.sort(key=lambda c: (c[0], c[1]))

    accepted = []
    boxes = []
    for _rank, _fid, place, mx, my, (primary, roman) in candidates:
        height_m = _PLACE_LABEL_M[place]
        if height_m / tile.mpp < _PLACE_MIN_LABEL_PX:
            continue
        # Box in MAP METRES, so it is independent of which tile asks. The
        # romanised line is drawn at 0.46x the primary size, so its own width
        # is compared at that scale rather than assumed narrower.
        width_em = _text_width_em(primary)
        if roman:
            width_em = max(width_em, _text_width_em(roman) * 0.46)
        half_w = height_m * width_em * _PLACE_LABEL_PAD / 2.0
        half_h = height_m * (1.15 if roman else 0.72) * _PLACE_LABEL_PAD
        box = (mx - half_w, my - half_h, mx + half_w, my + half_h)
        if any(not (box[2] < b[0] or box[0] > b[2] or box[3] < b[1] or box[1] > b[3])
               for b in boxes):
            continue
        boxes.append(box)
        accepted.append((mx, my, primary, roman, height_m))

    _PLACE_LABEL_CACHE[key] = accepted
    if len(_PLACE_LABEL_CACHE) > 8:       # bounded; one render only needs one entry
        _PLACE_LABEL_CACHE.pop(next(iter(_PLACE_LABEL_CACHE)))
    return accepted


def _layer_neighbourhoods(fields: Fields, tile: Tile) -> Image.Image:
    """Place-name labels, Japanese over romanised, haloed so they survive
    being drawn across a dense city. Every tile attempts every label within a
    generous margin of its own bounds and lets PIL clip -- see
    `_layer_grid_labels` for why a label, unlike a line, is not naturally
    seam-safe."""
    layer = _new_layer(tile)
    d = ImageDraw.Draw(layer, "RGBA")

    x_lo = tile.origin_x - _PLACE_LABEL_MARGIN_M
    x_hi = tile.origin_x + tile.extent_m + _PLACE_LABEL_MARGIN_M
    y_lo = tile.origin_y - _PLACE_LABEL_MARGIN_M
    y_hi = tile.origin_y + tile.extent_m + _PLACE_LABEL_MARGIN_M

    for mx, my, primary, roman, height_m in _accepted_place_labels(fields, tile):
        if not (x_lo <= mx <= x_hi and y_lo <= my <= y_hi):
            continue
        px, py = tile.to_px(mx, my)
        size_px = int(round(height_m / tile.mpp))
        if size_px < _PLACE_MIN_LABEL_PX:
            continue
        font = _find_font(size_px)
        halo = max(1, int(round(size_px * 0.09)))

        bb = d.textbbox((0, 0), primary, font=font)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        d.text((px - w / 2, py - h / 2), primary, font=font, fill=_LABEL_INK,
              stroke_width=halo, stroke_fill=_LABEL_HALO)

        if roman:
            sub_size = max(8, int(round(size_px * 0.46)))
            sub_font = _find_font(sub_size)
            sb = d.textbbox((0, 0), roman, font=sub_font)
            sw = sb[2] - sb[0]
            d.text((px - sw / 2, py + h / 2 + size_px * 0.12), roman, font=sub_font,
                  fill=_LABEL_INK, stroke_width=max(1, halo // 2), stroke_fill=_LABEL_HALO)
    return layer


def _layer_grid_lines(tile: Tile, grid_spacing_m: float) -> Image.Image:
    """Lines at absolute world/map-space multiples of grid_spacing_m --
    seam-safe across a tiled export by construction, since every tile
    independently attempts the same absolute-position lines and PIL clips
    each to its own canvas (the same way a road already crossing a tile
    seam works today). A small margin (a couple of working pixels) around
    each tile's own bounds means a line sitting exactly on a shared tile
    edge doesn't depend on exact floating-point equality."""
    layer = _new_layer(tile)
    if grid_spacing_m <= 0:
        return layer
    frame = tile.frame
    fox, foy = frame.origin
    d = ImageDraw.Draw(layer, "RGBA")
    width_px = _GRID_LINE_WIDTH_PX  # NOT scaled by supersample -- see the constant's own comment
    margin_m = 2.0 * tile.mpp

    x0, y0 = tile.origin_x - margin_m, tile.origin_y - margin_m
    x1, y1 = tile.origin_x + tile.extent_m + margin_m, tile.origin_y + tile.extent_m + margin_m

    k0 = int(math.floor((x0 - fox) / grid_spacing_m))
    k1 = int(math.ceil((x1 - fox) / grid_spacing_m))
    for k in range(k0, k1 + 1):
        x = fox + k * grid_spacing_m
        if x < x0 or x > x1:
            continue
        d.line([tile.to_px(x, y0), tile.to_px(x, y1)], fill=_GRID_LINE_COLOUR, width=width_px)

    k0 = int(math.floor((y0 - foy) / grid_spacing_m))
    k1 = int(math.ceil((y1 - foy) / grid_spacing_m))
    for k in range(k0, k1 + 1):
        y = foy + k * grid_spacing_m
        if y < y0 or y > y1:
            continue
        d.line([tile.to_px(x0, y), tile.to_px(x1, y)], fill=_GRID_LINE_COLOUR, width=width_px)
    return layer


def _layer_grid_labels(tile: Tile, grid_spacing_m: float) -> Image.Image:
    """Small "col,row" numbers near each reference-grid cell's top-right
    corner (map-space max-x, max-y -- `Tile.to_px` flips y, so that corner
    lands at the visual top-right on the page). Two things this must get
    right that a naive per-tile implementation would not (found during
    design review):

    1. Numbering is derived from the FRAME's own origin, never this tile's
       -- otherwise every tile restarts its own numbering from its own edge
       and the same physical cell gets a different label depending on which
       tile "wins". Same class of bug `Tile.page_px_origin` exists to
       prevent for seam-safe noise fields.
    2. Unlike a line, a label is not naturally seam-safe: if only the one
       tile whose bounds contain a cell's corner ever attempts that label,
       a glyph extending past that tile's own edge is never drawn by
       anyone. Fixed the same way `LOCAL_FEATURE_MARGIN_M` handles a
       feature that draws past its own footprint: every tile attempts every
       label whose corner falls within its bounds expanded by a generous
       margin (half a reference-grid cell), and PIL's own clipping keeps
       only what's inside each tile's own canvas. A neighbour redundantly
       attempting the same label is harmless.
    3. Font size must track how many working pixels one cell actually spans
       (`cell_px`), not a fixed size -- see _GRID_LABEL_FONT_FRACTION_OF_CELL's
       own comment for the real, live-rendered bug this fixes: a fixed size
       reads fine on a tight high-resolution crop and turns into solid
       unreadable red clutter on a low-resolution whole-frame overview,
       where a reference-grid cell can be under 10 working pixels wide.
       Below `_GRID_LABEL_MIN_CELL_PX`, no font size can fit without
       overlapping neighbours, so labels are skipped entirely rather than
       rendered as clutter.
    """
    layer = _new_layer(tile)
    if grid_spacing_m <= 0:
        return layer
    frame = tile.frame
    fox, foy = frame.origin
    cell_px = grid_spacing_m / tile.mpp
    if cell_px < _GRID_LABEL_MIN_CELL_PX:
        return layer
    font_size = int(round(min(_GRID_LABEL_FONT_MAX_PX,
                              max(_GRID_LABEL_FONT_MIN_PX, cell_px * _GRID_LABEL_FONT_FRACTION_OF_CELL))))
    font = _find_font(font_size)
    d = ImageDraw.Draw(layer, "RGBA")
    inset_px = max(2, int(round(font_size * 0.25)))

    margin_m = grid_spacing_m * 0.5
    x_lo, x_hi = tile.origin_x - margin_m, tile.origin_x + tile.extent_m + margin_m
    y_lo, y_hi = tile.origin_y - margin_m, tile.origin_y + tile.extent_m + margin_m

    col_lo = int(math.floor((x_lo - fox) / grid_spacing_m)) - 1
    col_hi = int(math.ceil((x_hi - fox) / grid_spacing_m)) + 1
    row_lo = int(math.floor((y_lo - foy) / grid_spacing_m)) - 1
    row_hi = int(math.ceil((y_hi - foy) / grid_spacing_m)) + 1

    for row in range(row_lo, row_hi + 1):
        for col in range(col_lo, col_hi + 1):
            corner_x = fox + (col + 1) * grid_spacing_m
            corner_y = foy + (row + 1) * grid_spacing_m
            if not (x_lo <= corner_x <= x_hi and y_lo <= corner_y <= y_hi):
                continue
            px, py = tile.to_px(corner_x, corner_y)
            text = f"{col:02d},{row:02d}"
            bbox = d.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            d.text((px - text_w - inset_px, py + inset_px), text, font=font, fill=_GRID_LABEL_COLOUR)
    return layer


# --- orchestration -----------------------------------------------------------

def iter_tile_layers(fields: Fields, style: Style, tile: Tile, *,
                     grid_spacing_m: float = DEFAULT_GRID_SPACING_M,
                     draw_grid: bool = True,
                     evacuation_sites: Optional[List[dict]] = None,
                     zoning: Optional[List[dict]] = None
                     ) -> Iterator[Tuple[str, Image.Image]]:
    """Production entry point. Yields (name, image) one at a time, in
    LAYER_ORDER, each already downsampled to tile.px_out. A caller MUST
    write/drop each image before requesting the next -- see module
    docstring's Memory section. Shared per-tile computations (the local
    feature query, the sea geometry/mask, the landuse mask, the roads/
    buildings masks) are each computed exactly once, matching render_tile's
    own reuse of the same intermediates."""
    frame = tile.frame
    query_box = box(tile.origin_x, tile.origin_y,
                    tile.origin_x + tile.extent_m, tile.origin_y + tile.extent_m
                    ).buffer(LOCAL_FEATURE_MARGIN_M)
    local_features = fields.query_features(query_box)

    sea_geom, sea_mask_img = _sea_geom_and_mask(fields, tile)

    yield "land-base", _finish(_layer_land_base(style, tile), tile)
    yield "hillshade", _finish(_layer_hillshade(fields, tile, sea_mask_img), tile)
    yield "sea", _finish(_layer_sea(fields, style, tile, sea_geom, sea_mask_img), tile)

    landuse_layer, landuse_mask = _build_landuse(fields, style, tile, local_features)
    yield "landuse", _finish(landuse_layer, tile)
    yield "zoning", _finish(_layer_zoning(tile, zoning), tile)

    yield "coastal-fade", _finish(
        _layer_coastal_fade(fields, style, tile, sea_geom, sea_mask_img, landuse_mask), tile)
    yield "water-bodies", _finish(_layer_water_bodies(style, tile, local_features), tile)

    elev_crop, crop_ix0, crop_iy0 = _crop_elevation_for_tile(fields.elevation, frame.extent_m, tile)
    contour_lines = contour.extract_contours(elev_crop)
    dem_n = fields.elevation.shape[0]
    yield "contours", _finish(_layer_contours(style, tile, contour_lines, dem_n, crop_ix0, crop_iy0), tile)

    yield "rivers", _finish(_layer_rivers(fields, style, tile, local_features), tile)

    roads_layer, roads_mask = _build_roads(style, tile, local_features)
    yield "roads", _finish(roads_layer, tile)

    yield "railways", _finish(_layer_railways(style, tile, local_features), tile)
    yield "barriers", _finish(_layer_barriers(style, tile, local_features), tile)

    buildings_layer, buildings_mask = _build_buildings(style, tile, local_features)
    yield "buildings", _finish(buildings_layer, tile)

    yield "terrain-shadow", _finish(
        _layer_terrain_shadow(fields, tile, roads_mask, buildings_mask), tile)

    dx, dy, _ = _light_shadow_vector(frame)
    yield "cast-shadows", _finish(_layer_cast_shadows(style, tile, local_features, dx, dy), tile)
    yield "bridges", _finish(_layer_bridges(style, tile, local_features, dx, dy), tile)
    yield "power", _finish(_layer_power(style, tile, local_features), tile)
    yield "structures", _finish(_layer_structures(style, tile, local_features), tile)
    yield "lamps", _finish(_layer_lamps(fields, style, tile), tile)
    yield "historic", _finish(_layer_historic(style, tile, local_features), tile)
    yield "services", _finish(_layer_services(style, tile, local_features), tile)
    yield "evacuation", _finish(
        _layer_evacuation(style, tile, local_features, evacuation_sites), tile)
    yield "neighbourhoods", _finish(_layer_neighbourhoods(fields, tile), tile)

    if draw_grid:
        yield "grid-lines", _finish(_layer_grid_lines(tile, grid_spacing_m), tile)
        yield "grid-labels", _finish(_layer_grid_labels(tile, grid_spacing_m), tile)


def render_tile_layers(fields: Fields, style: Style, tile: Tile, **kwargs) -> "OrderedDict[str, Image.Image]":
    """OrderedDict(iter_tile_layers(...)) -- convenient for tests and small
    preview tiles, where holding every layer in memory at once is trivial.
    NOT the production export path (tools/city-map/render.py's CLI consumes
    iter_tile_layers directly) -- see module docstring's Memory section."""
    return OrderedDict(iter_tile_layers(fields, style, tile, **kwargs))
