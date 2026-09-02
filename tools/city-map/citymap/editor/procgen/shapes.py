# -*- coding: utf-8 -*-
"""Shared geometry primitives for the procgen structure generators
(vauban_fort.py and its siblings) -- factored out once a second generator
needed the exact same "thicken a ring into a real mitred band" and "cut a
hole for a moat/dock out of a solid land mass" operations vauban_fort.py
worked out first. Real trigonometry/shapely operations throughout -- see
each function's own docstring for why it's built the way it is; the short
version is every one of these was hand-verified against a real render
before being trusted (see PROGRESS.md-equivalent context in
vauban_fort.py's own history: mitred banding replaced perimeter.py's
thicken_ring specifically because that per-edge-rectangle approach leaves
visibly notched joints at any sharp corner, invisible only for a shallow
curtain-wall angle).
"""

from __future__ import annotations

import math
from typing import List, Tuple

Point = Tuple[float, float]


class RawShape:
    """One (geometry, tags, height_m) triple for a shape built via real
    shapely buffer/difference operations (a mitred band, a polygon with a
    hole) and so too complex for TemplatePart's one-simple-ring footprint.
    The caller builds a Feature from this directly -- see
    preview_harness.render_structure_preview for the one place that
    already does this consistently, rather than hand-rolling the
    rotate/translate/Feature-construction dance per script."""
    def __init__(self, geometry, tags: dict, height_m: float):
        self.geometry = geometry
        self.tags = tags
        self.height_m = height_m


def unit(dx: float, dy: float) -> Tuple[float, float]:
    length = math.hypot(dx, dy) or 1e-6
    return dx / length, dy / length


def regular_polygon_vertices(n: int, radius_m: float, start_angle_deg: float = -90.0,
                             centre: Point = (0.0, 0.0)) -> List[Point]:
    """n points evenly spaced on a circle of the given radius.
    start_angle_deg=-90 (standard math convention: 0=east, counterclockwise)
    puts vertex 0 due north, so an odd-n shape points "up" by default."""
    cx, cy = centre
    return [
        (cx + radius_m * math.cos(math.radians(start_angle_deg + 360.0 * i / n)),
         cy + radius_m * math.sin(math.radians(start_angle_deg + 360.0 * i / n)))
        for i in range(n)
    ]


def pushed_outward(outline: List[Point], centre: Point, distance_m: float) -> List[Point]:
    """Every point of `outline` moved radially outward from `centre` by
    `distance_m` -- a clean, self-similar larger (or smaller, for a
    negative distance) echo of the same trace. The building block behind
    every moat/glacis/berm in this package: never hand-offset a ring's
    points, always push them outward from a real centre so the echo stays
    the same shape, just scaled."""
    out = []
    for x, y in outline:
        ux, uy = unit(x - centre[0], y - centre[1])
        out.append((x + ux * distance_m, y + uy * distance_m))
    return out


def mitred_band(outline: List[Point], thickness_m: float, *, mitre_limit: float = 2.5):
    """A closed outline thickened into ONE real mitred-corner band (a
    shapely polygon-with-a-hole), not N independent per-edge rectangles
    (perimeter.thicken_ring's own approach, kept as-is there since most of
    its callers only ever have shallow-angle corners where the difference
    is invisible). Confirmed directly, building the first fort spike: an
    unmitred per-edge band leaves a visibly notched/overlapping joint at
    any SHARP corner (a bastion's flank/face shoulder, in that case) --
    buffering the whole ring outward and inward by half the thickness and
    taking the difference gives a single continuous band with real mitred
    corners everywhere, sharp ones included. Returns a raw shapely
    geometry (use RawShape to carry it, not TemplatePart -- a
    polygon-with-a-hole has no single simple-ring footprint)."""
    from shapely.geometry import Polygon
    half = thickness_m / 2.0
    body = Polygon(outline)
    outer = body.buffer(half, join_style=2, mitre_limit=mitre_limit)
    inner = body.buffer(-half, join_style=2, mitre_limit=mitre_limit)
    return outer.difference(inner)


def annulus(outline: List[Point], centre: Point, offset_m: float, width_m: float, *,
           mitre_limit: float = 2.5):
    """A ring-shaped band that echoes `outline`'s own shape, offset
    `offset_m` outward from it and `width_m` wide -- the moat/glacis-ring
    primitive: every point pushed outward to the ring's inner edge, then
    mitre_band'd by the ring's own width. Used for a moat (tag it water),
    a glacis apron (tag it landuse), or any other "a uniform band at a
    fixed remove from this shape" need."""
    inner_ring_points = pushed_outward(outline, centre, offset_m)
    from shapely.geometry import Polygon
    inner_ring = Polygon(inner_ring_points)
    return inner_ring.buffer(width_m, join_style=2, mitre_limit=mitre_limit).difference(inner_ring)


def land_mass_with_hole(outer_outline: List[Point], hole_geometry):
    """A solid land polygon out to `outer_outline`, with `hole_geometry`
    (typically an annulus() result, e.g. a moat) cut out of it -- the
    "island" primitive: confirmed directly this is what makes a walled
    structure read as standing on real ground instead of a wireframe
    floating over open water (the single biggest gap found building the
    first fort spike -- wall/tower/moat geometry alone leaves the
    interior courtyard and every gap between bastions as bare sea, since
    nothing else was ever drawn there)."""
    from shapely.geometry import Polygon
    return Polygon(outer_outline).difference(hole_geometry)
