# -*- coding: utf-8 -*-
"""A low, hardened bunker complex -- deliberately the opposite silhouette
from vauban_fort.py's tall bastioned trace: squat and SOLID rather than
tall and hollow. The fort's wall is a thin mitred band around an open
courtyard because a fort needs an interior; a bunker has no interior to
protect from above, so its core is a plain filled polygon -- an early
version of this file reused mitred_band for the core and it read as a
hollow ring with nothing inside, which is wrong for what a bunker actually
is. `built_on="land"` sits directly on existing ground (no platform of its
own); `built_on="sea"` wraps the same core in a small solid platform plus a
short jetty, for a coastal gun emplacement / sea-fort-adjacent siting.
"""

from __future__ import annotations

import math
from typing import List, Tuple

from shapely.geometry import Polygon

from ...ops.construct import TemplatePart
from .shapes import RawShape, annulus, regular_polygon_vertices

Point = Tuple[float, float]


class Bunker:
    def __init__(self, parts: List[TemplatePart], raw_shapes: List[RawShape], centre: Point):
        self.parts = parts
        self.raw_shapes = raw_shapes
        self.centre = centre


def bunker(
    built_on: str = "land",
    core_radius_m: float = 18.0, core_elongation_x: float = 1.4, core_height_m: float = 5.0,
    cupola_radius_m: float = 5.5, cupola_height_m: float = 8.0,
    berm_offset_m: float = 7.0, berm_width_m: float = 11.0, berm_height_m: float = 2.5,
    n_satellites: int = 2, satellite_radius_m: float = 3.5, satellite_height_m: float = 3.0,
    satellite_clearance_m: float = 14.0,
    apron_depth_m: float = 14.0, apron_width_m: float = 11.0,
    platform_margin_m: float = 16.0, jetty_length_m: float = 24.0, jetty_width_m: float = 5.0,
) -> Bunker:
    """A solid, elongated hexagonal core (a long low blockhouse, not a
    ring -- squat mass and thick apparent walls are what read as
    "hardened" here, not height) with a small raised cupola at centre
    (observation/periscope housing -- a real bunker's one vertical
    accent), wrapped in a raised earthwork berm (an annulus tagged as a
    real building -- confirmed directly this needs a genuine building
    fill/outline/shadow pass, not a bare landuse fill: over a `sea`
    platform, two adjacent landuse-only fills read as one seamless blob
    once hillshade darkens them toward similar tones, since landuse fill
    carries no stroke of its own), `n_satellites` small emplacements
    pushed clear of the berm's outer edge, a paved entrance apron on the
    south side (a bunker has ONE defensible entrance, not a fort's
    multiple gates), and thin service/track lines actually connecting the
    apron and satellites back to the core so the complex reads as one
    installation rather than scattered shapes.
    """
    if built_on not in ("land", "sea"):
        raise ValueError(f"built_on must be 'land' or 'sea', got {built_on!r}")

    centre = (0.0, 0.0)
    core_ring = [(x * core_elongation_x, y) for x, y in regular_polygon_vertices(6, core_radius_m, centre=centre)]
    core_outer_x = core_radius_m * core_elongation_x

    parts: List[TemplatePart] = []
    lines: List[TemplatePart] = []

    outer_radius = core_outer_x + berm_offset_m + berm_width_m
    satellite_distance_m = outer_radius + satellite_clearance_m

    for i in range(n_satellites):
        angle_deg = -90.0 + 360.0 * (i + 0.5) / n_satellites if n_satellites > 1 else 90.0
        a = math.radians(angle_deg)
        sx = centre[0] + satellite_distance_m * math.cos(a)
        sy = centre[1] + satellite_distance_m * math.sin(a)
        parts.append(TemplatePart(
            kind="area",
            tags={"building": "bunker", "military": "bunker", "building:material": "concrete",
                 "name:en": "Sensor Post" if i == 0 else "Flak Position"},
            height_m=satellite_height_m,
            footprint=regular_polygon_vertices(6, satellite_radius_m, centre=(sx, sy)),
        ))
        edge_x, edge_y = core_outer_x * math.cos(a), core_radius_m * math.sin(a)
        lines.append(TemplatePart(
            kind="line", tags={"highway": "track"}, height_m=0.0,
            footprint=[(edge_x, edge_y), (sx, sy)],
        ))

    apron_cy = centre[1] - (core_radius_m + berm_offset_m + berm_width_m)
    apron_cx = centre[0]
    parts.append(TemplatePart(
        kind="area",
        tags={"surface": "paved", "building": "yes", "building:material": "asphalt", "name:en": "Entrance Apron"},
        height_m=0.3,
        footprint=[
            (apron_cx - apron_width_m / 2, apron_cy), (apron_cx + apron_width_m / 2, apron_cy),
            (apron_cx + apron_width_m / 2, apron_cy - apron_depth_m),
            (apron_cx - apron_width_m / 2, apron_cy - apron_depth_m),
        ],
    ))
    lines.append(TemplatePart(
        kind="line", tags={"highway": "service"}, height_m=0.0,
        footprint=[(centre[0], -core_radius_m * 0.6), (apron_cx, apron_cy)],
    ))

    berm_geom = annulus(core_ring, centre, berm_offset_m, berm_width_m)
    raw_shapes = [
        RawShape(
            Polygon(core_ring),
            {"building": "bunker", "military": "bunker", "building:material": "concrete",
             "name:en": "Bunker Core"},
            core_height_m,
        ),
        RawShape(
            Polygon(regular_polygon_vertices(8, cupola_radius_m, centre=centre)),
            {"building": "yes", "military": "bunker", "building:material": "metal",
             "name:en": "Observation Cupola"},
            core_height_m + cupola_height_m,
        ),
        RawShape(
            berm_geom,
            {"building": "embankment", "military": "bunker", "building:material": "wood",
             "name:en": "Earthwork Berm"},
            berm_height_m,
        ),
    ]

    if built_on == "sea":
        platform_outer = regular_polygon_vertices(28, outer_radius + platform_margin_m, centre=centre)
        raw_shapes.insert(0, RawShape(
            Polygon(platform_outer),
            {"landuse": "military", "name:en": "Bunker Platform"},
            0.0,
        ))
        jetty_x0 = apron_cx
        jetty_y0 = apron_cy - apron_depth_m
        parts.append(TemplatePart(
            kind="area",
            tags={"man_made": "pier", "building": "yes", "building:material": "concrete", "name:en": "Jetty"},
            height_m=0.5,
            footprint=[
                (jetty_x0 - jetty_width_m / 2, jetty_y0), (jetty_x0 + jetty_width_m / 2, jetty_y0),
                (jetty_x0 + jetty_width_m / 2, jetty_y0 - jetty_length_m),
                (jetty_x0 - jetty_width_m / 2, jetty_y0 - jetty_length_m),
            ],
        ))

    return Bunker(parts + lines, raw_shapes, centre)