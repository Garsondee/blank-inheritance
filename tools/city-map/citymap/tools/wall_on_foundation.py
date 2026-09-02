# -*- coding: utf-8 -*-
"""wall_on_foundation -- map-editor plan Phase 8 (wish #4): "draw a
footprint, get a terraced foundation with a thick wall on its top bench."

Pure composition, no new elevation or wall math of its own: citymap.tools.
terrace.generate_terrace (Phase 7, unchanged) builds the terraced platform;
citymap.editor.procgen.perimeter.thicken_ring (Phase 8's own shared
primitive, also used by perimeter() and star_fort.fort_wall) builds the
wall ring.

The wall ring is built from the TOP tier's own boundary, buffered INWARD by
half the wall's thickness, then thickened back out by the FULL thickness --
so the wall's outer face lands exactly on the top tier's true boundary, and
its inner face lands `wall_thickness_m` further inside it. The wall's
entire footprint is therefore always contained within (flush with, never
overhanging) the top tier polygon, by construction, not by a separate
containment check bolted on afterward.

Height stays a shadow offset, never a z-extrusion (design/map-generation.md
's "cast shadows, do not extrude") -- "on top of the foundation" is
expressed purely through this geometric containment; there is no separate
z-coordinate concept anywhere in this rendering pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from shapely.geometry import Polygon

from ..editor.procgen.perimeter import thicken_ring
from ..ops.construct import TemplatePart
from .terrace import TerraceError, TerraceRiser, TerraceTier, generate_terrace

DEFAULT_WALL_TAGS = {"barrier": "wall", "wall": "rampart", "building": "wall",
                     "name:en": "Foundation Wall"}


@dataclass
class WallOnFoundationResult:
    tiers: List[TerraceTier]
    risers: List[TerraceRiser]
    wall_segments: List[TemplatePart]


def generate_wall_on_foundation(outline: Polygon, *, base_elevation_m: float, tiers: int,
                                step_height_m: float, inset_m: float, blend_m: float,
                                cell_size_m: float, wall_thickness_m: float, wall_height_m: float,
                                mode: str = "fill", wall_tags: Optional[Dict[str, str]] = None
                                ) -> WallOnFoundationResult:
    """The terrace (identical contract to generate_terrace itself -- same
    parameters, same TerraceError validation, same tiers/risers back) plus
    a closed wall ring thickened from the TOP tier's own boundary (the
    smallest -- highest in "fill" mode, lowest in "cut" mode -- polygon in
    the stack; see generate_terrace's stack_order convention).

    Raises TerraceError (reused, not a new exception type -- this is the
    same class of "the geometry doesn't support the requested parameters"
    failure the terrace-only path already has) if wall_thickness_m or
    wall_height_m is not positive, or if the wall is wide enough to consume
    the entire top tier (the inward buffer collapses to empty or splits) --
    the wall would otherwise silently vanish rather than visibly failing.
    """
    if wall_thickness_m <= 0:
        raise TerraceError(f"wall_thickness_m must be positive, got {wall_thickness_m}")
    if wall_height_m <= 0:
        raise TerraceError(f"wall_height_m must be positive, got {wall_height_m}")

    terrace = generate_terrace(outline, base_elevation_m=base_elevation_m, tiers=tiers,
                               step_height_m=step_height_m, inset_m=inset_m, blend_m=blend_m,
                               cell_size_m=cell_size_m, mode=mode)

    top_tier = max(terrace.tiers, key=lambda t: t.stack_order)
    wall_ring_polygon = top_tier.polygon.buffer(-wall_thickness_m / 2.0)
    if wall_ring_polygon.is_empty or wall_ring_polygon.geom_type != "Polygon":
        raise TerraceError(
            f"wall_thickness_m={wall_thickness_m}m leaves no room on the top tier "
            f"(tier {top_tier.stack_order}'s own size after {tiers} tier(s) of "
            f"inset_m={inset_m}m each) -- use a thinner wall, fewer tiers, or a larger outline.")

    ring_points = list(wall_ring_polygon.exterior.coords)[:-1]
    tags = dict(wall_tags) if wall_tags else dict(DEFAULT_WALL_TAGS)
    wall_segments = thicken_ring(ring_points, wall_thickness_m, wall_height_m, tags)

    return WallOnFoundationResult(tiers=terrace.tiers, risers=terrace.risers, wall_segments=wall_segments)
