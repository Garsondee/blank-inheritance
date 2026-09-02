"""Raster drawing primitives, in tile pixel space.

**The hole rule.** PIL's `ImageDraw.polygon` takes a single point list and has
no concept of an interior ring, so the obvious implementation --
`draw.polygon(exterior_coords)` -- fills holes in solid. That is not a cosmetic
approximation; it produced one of the hardest bugs of the 2026-08-23 session.

The sea is a single polygon with a hole punched in it for every island carved
out of it. Kobe Airport is an island reachable only by one bridge, so carving it
left a genuine interior ring -- and the flat sea fill painted straight over it,
putting the entire airfield under water. Port Island escaped only by topological
luck: its carved land stayed connected to other carved land all the way to the
page edge, so it never became an interior ring at all. The depth-gradient pass
layered on top was already hole-aware, which is *why* the bug survived scrutiny
-- the texture correctly declined to touch the hole, so nothing ever repainted
what the flat fill had already got wrong.

So: `fill_polygon` here is mask-based and hole-aware, and is the only sanctioned
way to fill an area. Nothing should call `ImageDraw.polygon` directly on a
shapely exterior.
"""

from __future__ import annotations

import math
from typing import Iterable, List, Optional, Sequence, Tuple

from PIL import Image, ImageDraw

from .geometry import iter_polygons, iter_rings

STAGE_CODE_VERSION = 1

RGB = Tuple[int, int, int]


def _px_ring(ring: Sequence[Tuple[float, float]], tile) -> list:
    return [tile.to_px(x, y) for x, y in ring]


def polygon_mask(geom, tile, size: Optional[int] = None) -> Image.Image:
    """An 'L' mask of `geom` for this tile: 255 inside, 0 in holes and outside.

    This is the hole-aware core. Exteriors are filled, then interiors are
    punched back out in the same pass, so nesting order is respected.
    """
    n = size or tile.px
    mask = Image.new("L", (n, n), 0)
    drawer = ImageDraw.Draw(mask)
    for exterior, interiors in iter_rings(geom):
        if len(exterior) < 3:
            continue
        drawer.polygon(_px_ring(exterior, tile), fill=255)
        for interior in interiors:
            if len(interior) >= 3:
                drawer.polygon(_px_ring(interior, tile), fill=0)
    return mask


def fill_polygon(image: Image.Image, geom, tile, colour: RGB) -> None:
    """Fill an area on `image`, respecting interior rings.

    Uses a mask + paste rather than a direct polygon call precisely so holes
    survive -- see the module docstring for what happens when they do not.
    """
    if geom is None or geom.is_empty:
        return
    interiors_present = any(interiors for _, interiors in iter_rings(geom))
    if not interiors_present:
        # Fast path: no holes, so a direct fill is exactly equivalent and
        # avoids allocating a full-tile mask per feature. 57k buildings per
        # render makes this worth having.
        drawer = ImageDraw.Draw(image)
        for exterior, _ in iter_rings(geom):
            if len(exterior) >= 3:
                drawer.polygon(_px_ring(exterior, tile), fill=colour)
        return
    mask = polygon_mask(geom, tile)
    image.paste(Image.new("RGB", image.size, colour), (0, 0), mask)


def fill_polygon_rgba(layer: Image.Image, geom, tile,
                      colour: Tuple[int, int, int, int]) -> None:
    """Translucent fill onto an RGBA shadow layer, hole-aware.

    Takes the layer image rather than a drawer because holes cannot be expressed
    by drawing: in RGBA mode `ImageDraw` alpha-composites, so "drawing"
    transparent over a filled region is a no-op and the hole stays filled. A
    holed piece therefore has to go through a mask.

    Overlapping shadows deliberately accumulate (each fill composites at its own
    alpha), which is how the approved render looks. That is not physically right
    -- two buildings blocking the same sun cast one shadow, not a darker one --
    but it is the established look, and changing it here would silently restyle
    the map during what is meant to be a lossless refactor. Worth revisiting as
    a deliberate style decision, not as a side effect.
    """
    if geom is None or geom.is_empty:
        return
    drawer = ImageDraw.Draw(layer, "RGBA")
    for polygon in iter_polygons(geom):
        exterior = list(polygon.exterior.coords)
        if len(exterior) < 3:
            continue
        if not polygon.interiors:
            drawer.polygon(_px_ring(exterior, tile), fill=colour)
            continue
        mask = Image.new("L", layer.size, 0)
        mask_drawer = ImageDraw.Draw(mask)
        mask_drawer.polygon(_px_ring(exterior, tile), fill=colour[3])
        for interior in polygon.interiors:
            ring = list(interior.coords)
            if len(ring) >= 3:
                mask_drawer.polygon(_px_ring(ring, tile), fill=0)
        patch = Image.new("RGBA", layer.size, colour[:3] + (255,))
        layer.alpha_composite(Image.composite(
            patch, Image.new("RGBA", layer.size, (0, 0, 0, 0)), mask))


def stroke_rings(drawer: ImageDraw.ImageDraw, geom, tile, colour, width: float) -> None:
    """Stroke every ring of a polygon -- exteriors AND interiors.

    Islands are interior rings of the sea polygon, so a coastline pass that
    only strokes exteriors draws the mainland shore and silently omits every
    island's own shoreline.
    """
    w = max(1, int(round(width)))
    for exterior, interiors in iter_rings(geom):
        if len(exterior) >= 2:
            drawer.line(_px_ring(exterior, tile), fill=colour, width=w, joint="curve")
        for interior in interiors:
            if len(interior) >= 2:
                drawer.line(_px_ring(interior, tile), fill=colour, width=w, joint="curve")


def draw_line(drawer: ImageDraw.ImageDraw, geom, tile, colour, width: float,
              round_caps: bool = False) -> None:
    """Draw a LineString (or collection) with optional round end caps.

    Round caps matter at both real cul-de-sacs and the page edge: a hard-clipped
    stub reads as a mistake, a rounded terminus reads as a road ending.
    """
    w = max(1, int(round(width)))
    parts = geom.geoms if hasattr(geom, "geoms") else [geom]
    for part in parts:
        if part.geom_type != "LineString" or len(part.coords) < 2:
            continue
        pts = _px_ring(list(part.coords), tile)
        drawer.line(pts, fill=colour, width=w, joint="curve")
        if round_caps:
            r = w / 2.0
            for x, y in (pts[0], pts[-1]):
                drawer.ellipse([x - r, y - r, x + r, y + r], fill=colour)


def draw_tapered_line(drawer: ImageDraw.ImageDraw, geom, tile, colour,
                      widths_m: List[float]) -> None:
    """Draw a LineString as a variable-width ribbon -- one width (GROUND
    METRES, one entry per coordinate) rather than draw_line's single fixed
    width. Added 2026-08-24 for river source tapering
    (citymap.rivers.vertex_widths_m): a headwater's true topological source
    ramps from ~0 width up to its normal stream width over some distance,
    which a single ImageDraw.line(width=...) call cannot represent at all.

    Built as one filled quad per SEGMENT, each offset by its own two
    endpoints' half-widths perpendicular to that segment's own direction --
    not a single mitred ribbon polygon. Consecutive segments meeting at a
    sharp bend can therefore leave a small gap or overlap right at the
    joint; immaterial for a moderately-sampled river polyline, and the same
    simplification editor/server.py's shape_to_template_parts already uses
    for wall thickness. Offsets happen in MAP SPACE (metres) before
    projecting to pixels via tile.to_px, matching every other geometry
    helper in this module -- offsetting in pixel space would misjudge
    perpendicular direction under the frame's rotation.
    """
    coords = list(geom.coords)
    if len(coords) < 2 or len(widths_m) != len(coords):
        return
    for i in range(len(coords) - 1):
        x0, y0 = coords[i]
        x1, y1 = coords[i + 1]
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy)
        if length < 1e-9:
            continue
        nx, ny = -dy / length, dx / length
        h0, h1 = widths_m[i] / 2.0, widths_m[i + 1] / 2.0
        quad = [
            (x0 + nx * h0, y0 + ny * h0),
            (x1 + nx * h1, y1 + ny * h1),
            (x1 - nx * h1, y1 - ny * h1),
            (x0 - nx * h0, y0 - ny * h0),
        ]
        drawer.polygon([tile.to_px(px, py) for px, py in quad], fill=colour)


def blur_radius_px(style, section: str, key: str, tile, minimum: float = 1.0) -> float:
    """Convert a ground-metre blur radius to pixels for this tile."""
    return max(minimum, style.metres(section, key) / tile.mpp)
