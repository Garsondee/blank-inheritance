# -*- coding: utf-8 -*-
"""A concentric solar-collector field around a central power tower --
tenth-scale of a real Ivanpah/Crescent-Dunes-style concentrated-solar
plant: rings of individually-placed panel modules around a tall central
collector tower, each ring holding more panels than the one inside it
(circumference grows with radius, so panel COUNT scales with it too, not
just spacing) -- real trigonometry per ring via shapes.regular_polygon_
vertices, not a hand-typed grid. Reads as deliberately futuristic/
engineered from top-down specifically because of that radial regularity,
in contrast to a flat rectangular-grid panel farm (which is more realistic
for a flat-plate PV farm, and a reasonable alternative shape if the
concentric-tower look isn't what's wanted -- not built here, this module
only covers the tower-field version).
"""

from __future__ import annotations

from typing import List, Tuple

from ...ops.construct import TemplatePart
from .shapes import RawShape, mitred_band, regular_polygon_vertices, unit

Point = Tuple[float, float]


class SolarArray:
    def __init__(self, parts: List[TemplatePart], raw_shapes: List[RawShape], centre: Point):
        self.parts = parts
        self.raw_shapes = raw_shapes
        self.centre = centre


def solar_array(
    n_rings: int = 6, ring_spacing_m: float = 24.0, first_ring_radius_m: float = 30.0,
    panels_in_first_ring: int = 10, panel_width_m: float = 6.0, panel_depth_m: float = 3.5,
    panel_height_m: float = 4.0, tower_radius_m: float = 8.0, tower_height_m: float = 48.0,
    fence_margin_m: float = 20.0, fence_height_m: float = 3.0,
) -> SolarArray:
    """Every ring's own panel count grows with the ring's own circumference
    relative to the first ring's -- ring i (0-indexed) sits at radius
    `first_ring_radius_m + i*ring_spacing_m` and holds
    `round(panels_in_first_ring * radius_i / first_ring_radius_m)` panels,
    each an individually-placed rectangular module (long axis TANGENTIAL --
    facing along the ring, not radially -- matching how a real heliostat/
    panel array reads from directly overhead: broad reflective faces, not
    edge-on slivers). A tall, slim central tower for scale contrast (real
    concentrated-solar towers are the tallest thing in the whole field by
    a wide margin) and a simple perimeter fence.
    """
    parts: List[TemplatePart] = []
    centre = (0.0, 0.0)

    for ring_i in range(n_rings):
        radius = first_ring_radius_m + ring_i * ring_spacing_m
        count = max(6, round(panels_in_first_ring * radius / first_ring_radius_m))
        positions = regular_polygon_vertices(count, radius, centre=centre)
        for (px, py) in positions:
            tangent_ux, tangent_uy = unit(-(py - centre[1]), px - centre[0])
            radial_ux, radial_uy = unit(px - centre[0], py - centre[1])
            hw, hd = panel_width_m / 2.0, panel_depth_m / 2.0
            corners = [
                (px + tangent_ux * hw + radial_ux * hd, py + tangent_uy * hw + radial_uy * hd),
                (px - tangent_ux * hw + radial_ux * hd, py - tangent_uy * hw + radial_uy * hd),
                (px - tangent_ux * hw - radial_ux * hd, py - tangent_uy * hw - radial_uy * hd),
                (px + tangent_ux * hw - radial_ux * hd, py + tangent_uy * hw - radial_uy * hd),
            ]
            parts.append(TemplatePart(
                kind="area",
                tags={"building": "yes", "power": "generator", "generator:source": "solar",
                     "building:material": "glass", "name:en": "Collector Panel"},
                height_m=panel_height_m, footprint=corners,
            ))

    parts.append(TemplatePart(
        kind="area",
        tags={"building": "tower", "power": "generator", "generator:source": "solar",
             "building:material": "metal", "name:en": "Collector Tower"},
        height_m=tower_height_m,
        footprint=regular_polygon_vertices(10, tower_radius_m, centre=centre),
    ))

    outer_radius = first_ring_radius_m + (n_rings - 1) * ring_spacing_m + panel_width_m / 2.0
    fence_ring = regular_polygon_vertices(48, outer_radius + fence_margin_m, centre=centre)
    raw_shapes = [
        RawShape(
            mitred_band(fence_ring, 1.2),
            {"barrier": "fence", "building": "fence", "building:material": "metal",
             "name:en": "Perimeter Fence"},
            fence_height_m,
        ),
    ]
    return SolarArray(parts, raw_shapes, centre)
