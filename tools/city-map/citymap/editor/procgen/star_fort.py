# -*- coding: utf-8 -*-
"""Fort Wall generator (Tool 1): draw a rough perimeter, get a stubby
star-fort-style bastioned wall back. Each edge of the drawn perimeter gets
one angular bastion projecting outward from its midpoint -- the compact,
single-tier version of a real Vauban trace (which stacks multiple bastion
tiers and elaborate flanking geometry; "stubby" means this deliberately
doesn't). The bastioned outline is then extruded into a real wall footprint
and broken up by strengthening pylons at regular intervals.
"""

from __future__ import annotations

import math
from typing import List, Tuple

from ...ops.construct import TemplatePart
from .perimeter import place_along, thicken_ring

Point = Tuple[float, float]


def _edge_outward_normal(p0: Point, p1: Point, polygon_centroid: Point) -> Tuple[float, float]:
    """The unit normal of edge p0->p1 that points AWAY from the polygon's
    own centroid -- works regardless of the input ring's winding order,
    unlike always taking the same fixed rotation of the edge direction."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy) or 1e-6
    nx, ny = -dy / length, dx / length
    mid = ((p0[0] + p1[0]) / 2.0, (p0[1] + p1[1]) / 2.0)
    to_mid = (mid[0] - polygon_centroid[0], mid[1] - polygon_centroid[1])
    if nx * to_mid[0] + ny * to_mid[1] >= 0:
        return nx, ny
    return -nx, -ny


def bastioned_outline(polygon_local: List[Point], bastion_depth_m: float = 18.0,
                      flank_fraction: float = 0.32) -> List[Point]:
    """Turn a plain drawn perimeter into a stubby star-fort trace: each edge
    gets one angular bastion projecting outward from its own midpoint.

    `flank_fraction` (0-0.5) is how far along each edge, from either end,
    the bastion's two flank points sit before the tip juts out -- larger
    means a wider, blunter bastion; smaller means a narrower, sharper
    spike. 0.32 leaves a real curtain-wall stub flanking every bastion,
    matching an actual trace (a bastion springing directly off a corner
    with no flank at all is the degenerate case, not the norm).
    """
    if len(polygon_local) < 3:
        raise ValueError("a perimeter needs at least 3 points")
    n = len(polygon_local)
    centroid = (sum(p[0] for p in polygon_local) / n, sum(p[1] for p in polygon_local) / n)

    out: List[Point] = []
    for i in range(n):
        p0 = polygon_local[i]
        p1 = polygon_local[(i + 1) % n]
        nx, ny = _edge_outward_normal(p0, p1, centroid)
        flank0 = (p0[0] + (p1[0] - p0[0]) * flank_fraction, p0[1] + (p1[1] - p0[1]) * flank_fraction)
        flank1 = (p0[0] + (p1[0] - p0[0]) * (1 - flank_fraction), p0[1] + (p1[1] - p0[1]) * (1 - flank_fraction))
        mid = ((flank0[0] + flank1[0]) / 2.0, (flank0[1] + flank1[1]) / 2.0)
        tip = (mid[0] + nx * bastion_depth_m, mid[1] + ny * bastion_depth_m)
        out.extend([p0, flank0, tip, flank1])
    return out


def fort_wall(polygon_local: List[Point], wall_thickness_m: float = 5.0,
             wall_height_m: float = 9.0, bastion_depth_m: float = 18.0,
             flank_fraction: float = 0.32, pylon_spacing_m: float = 45.0,
             pylon_radius_m: float = 4.0, pylon_height_m: float = 13.0
             ) -> List[TemplatePart]:
    """The whole Tool 1 pipeline: bastion the drawn perimeter (see
    bastioned_outline), extrude it into a real wall footprint (one area
    part per outline edge, offset to either side by half the wall
    thickness), and break it up with strengthening pylons at regular
    intervals -- LinearRing.interpolate walking the FINISHED bastioned
    outline (not the original plain polygon), so pylons land on bastion
    tips and flanks alike, spaced along the real trace the wall follows.

    Every part is tagged with its real-world semantic tag (barrier=wall,
    man_made=pylon) AND ALSO building=... -- render_tile's fill+outline+
    shadow treatment only fires for features that carry a building tag.
    Confirmed the hard way: an earlier version of this generator's plain
    perimeter.py sibling tagged walls barrier=wall only, and they rendered
    as completely invisible in a real preview -- correct geometry, zero
    ink, an easy thing to miss without ever actually looking. Double-
    tagging is the correct, minimal fix until render_tile grows a
    dedicated non-building structure pass -- perimeter.thicken_ring now
    force-injects it for every caller (this one included) so the fix lives
    in one place, not re-applied by hand here.

    Wall thickening and pylon spacing are perimeter.py's own thicken_ring/
    place_along primitives (map-editor plan Phase 8) run against the
    bastioned `outline` instead of the plain drawn polygon -- this used to
    be its own copy of both loops; see perimeter.py's module docstring for
    why the two were collapsed into one shared implementation.
    """
    outline = bastioned_outline(polygon_local, bastion_depth_m, flank_fraction)
    parts = thicken_ring(
        outline, wall_thickness_m, wall_height_m,
        {"barrier": "wall", "wall": "fort_wall", "building": "wall", "name:en": "Fort Wall"})
    parts = parts + place_along(
        outline, pylon_spacing_m, radius_m=pylon_radius_m, height_m=pylon_height_m,
        tags={"man_made": "pylon", "military": "bastion", "building": "pylon", "name:en": "Wall Pylon"})
    return parts
