# -*- coding: utf-8 -*-
"""Perimeter generators: turn a site's own boundary into a fence, wall, or
rampart, instead of hand-typing the same polygon coordinates into a 'line'
TemplatePart every time (directorate-command-citadel.json's fence was
exactly that, done once by hand -- this generalises it into a reusable,
styled tool).

`thicken_ring`/`place_along` below are the map-editor plan's Phase 8 shared
primitives -- the per-edge wall-thickening loop and the ring-spacing loop
each used to exist twice, character-for-character close, once here and once
in star_fort.py's own fort_wall (a third, open-polyline variant lives in
editor/server.py's Scratchpad tool and is NOT migrated to these -- it
thickens an OPEN line, not a closed ring, a genuinely different shape, and
that whole file is kept running as-is per this project's own judgment call,
not actively extended). star_fort.fort_wall now calls these two functions
directly instead of duplicating their math against its own bastioned
outline.
"""

from __future__ import annotations

import math
from typing import List, Tuple

from shapely.geometry import LinearRing

from ...ops.construct import TemplatePart

STYLES = {"chain_link_fence", "concrete_wall", "stone_rampart"}


def thicken_ring(ring_points: List[Tuple[float, float]], thickness_m: float, height_m: float,
                 tags: dict) -> List[TemplatePart]:
    """Thicken a CLOSED ring's boundary into one real 'area' TemplatePart per
    edge, each offset to both sides of the edge by half `thickness_m`.
    `ring_points` is open (no repeated closing point); edge n-1 wraps back
    to point 0 automatically.

    Force-injects a `building` tag into a COPY of `tags` if the caller
    didn't already set one: render_tile's fill/outline/shadow treatment
    only fires for features carrying a real `building` tag, so a wall
    tagged only e.g. `barrier=wall` renders as literally nothing -- this
    was confirmed the hard way once already (an earlier version of
    perimeter()'s concrete_wall/stone_rampart styles below had exactly this
    gap; star_fort.fort_wall was written with the fix already in mind, see
    its own history). Centralising the fix here means every closed-ring
    wall generator in this package gets it for free, permanently, instead
    of each one needing to remember it separately.
    """
    n = len(ring_points)
    half = thickness_m / 2.0
    wall_tags = dict(tags)
    if "building" not in wall_tags:
        wall_tags["building"] = "wall"
    parts: List[TemplatePart] = []
    for i in range(n):
        x0, y0 = ring_points[i]
        x1, y1 = ring_points[(i + 1) % n]
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy)
        if length < 1e-6:
            continue
        nx, ny = -dy / length, dx / length
        parts.append(TemplatePart(
            kind="area", tags=wall_tags, height_m=height_m,
            footprint=[
                (x0 + nx * half, y0 + ny * half), (x1 + nx * half, y1 + ny * half),
                (x1 - nx * half, y1 - ny * half), (x0 - nx * half, y0 - ny * half),
            ],
        ))
    return parts


def place_along(ring_points: List[Tuple[float, float]], spacing_m: float, *, radius_m: float,
                height_m: float, tags: dict) -> List[TemplatePart]:
    """Place identical square TemplateParts at regular intervals around a
    CLOSED ring, via shapely's own LinearRing.interpolate (handles
    wraparound/edge cases for free, rather than a hand-rolled segment walk).
    Always places at least one instance, even on a ring shorter than
    `spacing_m`.
    """
    ring = LinearRing(list(ring_points) + [ring_points[0]])
    perimeter_m = ring.length
    num = max(1, round(perimeter_m / spacing_m))
    parts: List[TemplatePart] = []
    for i in range(num):
        point = ring.interpolate((i / num) * perimeter_m)
        cx, cy = point.x, point.y
        parts.append(TemplatePart(
            kind="area", tags=dict(tags), height_m=height_m,
            footprint=[
                (cx - radius_m, cy - radius_m), (cx + radius_m, cy - radius_m),
                (cx + radius_m, cy + radius_m), (cx - radius_m, cy + radius_m),
            ],
        ))
    return parts


def perimeter(polygon_local: List[Tuple[float, float]], style: str = "chain_link_fence",
             tower_spacing_m: float = 120.0) -> List[TemplatePart]:
    """`polygon_local`: the site's own boundary as local (x, y) metres from
    whatever anchor the caller will place the finished compound at -- the
    drawn polygon's own vertices, offset from its centroid (the same
    convention TemplatePart.footprint already uses everywhere else).

    - 'chain_link_fence': the boundary itself, unchanged, as a thin 'line'
      part -- the plain case, a light perimeter marker rather than a real
      structure.
    - 'concrete_wall': the boundary thickened into a real 'area' part with
      a wall's own footprint width and height -- reads as a structure, not
      a line, at any hillshade angle.
    - 'stone_rampart': the concrete_wall treatment, plus small towers at
      regular intervals along it (LinearRing.interpolate -- shapely's own,
      not a hand-rolled segment walk, so wrapping/edge cases are handled by
      a tested library instead of reinvented here) -- the visually
      interesting, defensible-fortress option instead of a bare boundary.

    Raises ValueError for an unknown style rather than silently falling
    back to the plain fence -- a typo'd style name should be loud, not a
    quietly wrong-looking compound discovered only in the preview.
    """
    if style not in STYLES:
        raise ValueError(f"unknown perimeter style {style!r}; choose from {sorted(STYLES)}")

    if style == "chain_link_fence":
        return [TemplatePart(kind="line", tags={"barrier": "fence"}, height_m=2.5,
                             footprint=list(polygon_local))]

    wall_thickness_m = 3.0 if style == "concrete_wall" else 4.5
    wall_height_m = 4.0 if style == "concrete_wall" else 7.0
    wall_tag = "wall" if style == "concrete_wall" else "city_wall"

    # Perpendicular sign inside thicken_ring is arbitrary (not guaranteed
    # outward), which is fine: the wall is symmetric about the drawn
    # boundary either way, only its total thickness matters visually.
    parts = thicken_ring(polygon_local, wall_thickness_m, wall_height_m,
                         {"barrier": "wall", "wall": wall_tag})

    if style == "stone_rampart":
        tower_radius = wall_thickness_m * 1.6
        parts = parts + place_along(
            polygon_local, tower_spacing_m, radius_m=tower_radius, height_m=wall_height_m * 1.8,
            tags={"building": "tower", "military": "tower", "name:en": "Rampart Tower"})

    return parts
