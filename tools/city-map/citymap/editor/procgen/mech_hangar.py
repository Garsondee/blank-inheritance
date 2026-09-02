# -*- coding: utf-8 -*-
"""A Frame-scale mech hangar: a tall steel hall with a real door notch bitten
out of one gable end (a boundary-touching difference, not a hole -- distinct
from bunker.py's true annulus hole, and confirmed not to trigger the same
render_tile hole-punch bug fixed there, since a notch that overshoots the
hall's own edge modifies the exterior ring rather than enclosing a new
interior one), flanking workshop annexes, a gantry crane rail running the
hall's centreline and poking out through the door onto the apron, and a
painted parking silhouette on the apron itself -- the single detail that
makes this read as sized for a giant machine rather than a generic warehouse,
the same way an airfield's aircraft parking chevron does.
"""

from __future__ import annotations

import math
from typing import List, Tuple

from shapely.geometry import Point as ShapelyPoint
from shapely.geometry import Polygon
from shapely.ops import unary_union

from ...ops.construct import TemplatePart
from .shapes import RawShape, regular_polygon_vertices

Point = Tuple[float, float]


class MechHangar:
    def __init__(self, parts: List[TemplatePart], raw_shapes: List[RawShape], centre: Point):
        self.parts = parts
        self.raw_shapes = raw_shapes
        self.centre = centre


def _rect(cx, cy, w, d):
    hw, hd = w / 2.0, d / 2.0
    return [(cx - hw, cy - hd), (cx + hw, cy - hd), (cx + hw, cy + hd), (cx - hw, cy + hd)]


def mech_hangar(
    hall_length_m: float = 95.0, hall_width_m: float = 42.0, hall_height_m: float = 40.0,
    door_notch_width_m: float = 26.0, door_notch_depth_m: float = 10.0,
    annex_length_m: float = 55.0, annex_width_m: float = 13.0, annex_height_m: float = 9.0,
    annex_gap_m: float = 3.0,
    apron_depth_m: float = 55.0, apron_width_m: float = 70.0,
    crane_rail_margin_m: float = 6.0, crane_rail_apron_extend_m: float = 22.0,
    silhouette_length_m: float = 24.0, silhouette_width_m: float = 16.0,
    gatehouse_radius_m: float = 5.0, gatehouse_height_m: float = 4.0,
) -> MechHangar:
    """The hall's long axis runs east-west (+x), door end at +x. Two
    workshop annexes flank the hall's long sides (set back from the door so
    they don't collide with the apron), a wide asphalt apron extends east
    from the door for the Frame itself to stand on, a rail line runs the
    hall's centreline and extends out through the door onto the apron, a
    small gatehouse sits at the apron's outer corner with its own access
    track, and a painted parking silhouette (feet, shoulders, torso -- a
    genuinely abstracted top-down mech glyph, not a realistic footprint)
    marks where the Frame parks, the same role an aircraft parking chevron
    plays on a real apron.
    """
    centre = (0.0, 0.0)
    hl2, hw2 = hall_length_m / 2.0, hall_width_m / 2.0

    hall_rect = Polygon(_rect(0.0, 0.0, hall_length_m, hall_width_m))
    notch_overshoot_m = 4.0
    notch = Polygon(_rect(hl2 - door_notch_depth_m / 2.0 + notch_overshoot_m / 2.0,
                          0.0, door_notch_depth_m + notch_overshoot_m, door_notch_width_m))
    hall_footprint = hall_rect.difference(notch)

    raw_shapes: List[RawShape] = [
        RawShape(hall_footprint, {"building": "hangar", "military": "hangar",
                                  "building:material": "metal", "name:en": "Mech Hangar"}, hall_height_m),
    ]

    parts: List[TemplatePart] = []
    lines: List[TemplatePart] = []

    annex_cx = -(hall_length_m - annex_length_m) / 2.0 + hall_length_m * 0.06
    for side in (-1, 1):
        acy = side * (hw2 + annex_gap_m + annex_width_m / 2.0)
        parts.append(TemplatePart(
            kind="area",
            tags={"building": "yes", "building:material": "brick",
                 "name:en": "Workshop Annex"},
            height_m=annex_height_m,
            footprint=_rect(annex_cx, acy, annex_length_m, annex_width_m),
        ))

    apron_cx = hl2 + apron_depth_m / 2.0
    parts.append(TemplatePart(
        kind="area",
        tags={"surface": "paved", "building": "yes", "building:material": "asphalt",
             "name:en": "Hangar Apron"},
        height_m=0.3,
        footprint=_rect(apron_cx, 0.0, apron_depth_m, apron_width_m),
    ))

    lines.append(TemplatePart(
        kind="line", tags={"railway": "rail"}, height_m=0.0,
        footprint=[(-hl2 + crane_rail_margin_m, 0.0), (hl2 + crane_rail_apron_extend_m, 0.0)],
    ))

    # A jointed multi-part "mech" glyph reads as an unrecognisable blob at
    # this scale -- confirmed directly across two attempts (a disconnected
    # torso/feet union, then a bold but still-fiddly overlapping chain,
    # both looked like a wrench, not a robot). A real airfield parking spot
    # doesn't try to draw the aircraft either: it's a directional chevron
    # plus wheel-stop marks. Borrowing that logic reads unambiguously even
    # small -- a bold forward-pointing chevron (facing the apron's open
    # end) plus two round foot-pads, DISJOINT on purpose (a genuine
    # MultiPolygon renders each part correctly via render.py's per-ring
    # fast path -- confirmed, no need to force one connected blob).
    silhouette_cx = hl2 + apron_depth_m * 0.62
    L, W = silhouette_length_m, silhouette_width_m
    chevron_tip_x = silhouette_cx + L * 0.5
    chevron_back_x = silhouette_cx - L * 0.15
    chevron_notch_x = silhouette_cx - L * 0.05
    chevron_half_w = W * 0.32
    chevron = Polygon([
        (chevron_tip_x, 0.0),
        (chevron_back_x, chevron_half_w),
        (chevron_notch_x, 0.0),
        (chevron_back_x, -chevron_half_w),
    ])
    foot_x = silhouette_cx - L * 0.32
    foot_y = W * 0.30
    foot_r = W * 0.16
    silhouette = unary_union([
        chevron,
        ShapelyPoint(foot_x, -foot_y).buffer(foot_r, quad_segs=8),
        ShapelyPoint(foot_x, foot_y).buffer(foot_r, quad_segs=8),
    ])
    raw_shapes.append(RawShape(silhouette, {"building": "yes", "building:material": "concrete",
                                            "surface": "paved", "name:en": "Parking Marking"}, 0.15))

    gate_x, gate_y = hl2 + apron_depth_m + gatehouse_radius_m * 3.0, apron_width_m / 2.0 - gatehouse_radius_m * 2.0
    parts.append(TemplatePart(
        kind="area",
        tags={"building": "yes", "building:material": "concrete", "name:en": "Gatehouse"},
        height_m=gatehouse_height_m,
        footprint=regular_polygon_vertices(6, gatehouse_radius_m, centre=(gate_x, gate_y)),
    ))
    lines.append(TemplatePart(
        kind="line", tags={"highway": "service"}, height_m=0.0,
        footprint=[(hl2 + apron_depth_m, apron_width_m * 0.3), (gate_x, gate_y)],
    ))

    return MechHangar(parts + lines, raw_shapes, centre)