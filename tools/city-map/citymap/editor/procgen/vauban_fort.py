# -*- coding: utf-8 -*-
"""A real bastioned-trace fort generator -- SPIKE, not yet wired into any
tool/endpoint. Built to answer a direct, falsifiable challenge: star_fort.py's
existing `bastioned_outline` puts one symmetric spike at the MIDPOINT of each
edge of an arbitrary, often hand-drawn/irregular polygon -- no flank, no
face, no shoulder, and no relationship to the input polygon's own vertices.
That's why it reads as "a few wonky wavy lines," not a fortification.

A real Vauban-style bastion has a distinctive silhouette because its shape
is load-bearing GEOMETRY, not decoration: two short FLANKS step out from the
curtain wall near-perpendicular to it, then two long FACES angle from the
flank tips to a projecting TIP -- the flank/face/shoulder break is exactly
what reads as "a real fort" instead of "a spiky blob." This module starts
from a REGULAR polygon (not an arbitrary drawn one) and puts one bastion at
each VERTEX -- computed via real trigonometry (outward bisector, edge-
relative perpendiculars), not typed/guessed points -- plus a moat that
echoes the same trace at a larger radius, small ravelins centred on each
curtain in the moat, and corner towers at the bastion tips.

Shared geometry (mitred banding, radial push, island-with-hole) now lives in
shapes.py -- factored out once mech_hangar.py/bunker.py/solar_array.py
needed the identical operations; this module keeps only what's genuinely
bastion-trace-specific (the trace itself, ravelins, the counterscarp)."""

from __future__ import annotations

from typing import List, Tuple

from ...ops.construct import TemplatePart
from .shapes import (
    RawShape, annulus, land_mass_with_hole, mitred_band,
    pushed_outward, regular_polygon_vertices, unit,
)

Point = Tuple[float, float]


def bastion_trace(n_bastions: int, radius_m: float, bastion_depth_m: float,
                  flank_length_m: float, gorge_fraction: float = 0.28
                  ) -> Tuple[List[Point], List[Point], Point]:
    """The real bastioned outline: one bastion per vertex of a regular
    n-gon of the given circumradius.

    For each vertex: a TIP projects outward (along the vertex's own outward
    bisector from the polygon centre) by `bastion_depth_m`. On each
    adjacent edge, a GORGE point sits `gorge_fraction` of that edge's own
    length from the vertex -- this is where the flank begins, still on the
    curtain line. From each gorge point, a FLANK steps outward
    `flank_length_m` (perpendicular to that edge, signed to point away from
    centre) to a SHOULDER, and a FACE runs from each shoulder to the tip.
    `gorge_fraction` must stay under 0.5 or the two gorge points on one
    edge cross and the curtain between bastions inverts.

    Returns (outline, tips, centre) -- `tips` (the bare bastion apex
    points, one per vertex, no flank/face detail) is returned separately
    since callers need it for towers/height accents without re-deriving it
    from the 5-points-per-vertex outline.
    """
    if n_bastions < 3:
        raise ValueError("a bastioned trace needs at least 3 bastions")
    if not 0.0 < gorge_fraction < 0.5:
        raise ValueError(f"gorge_fraction must be in (0, 0.5), got {gorge_fraction}")

    base = regular_polygon_vertices(n_bastions, radius_m)
    centre = (sum(p[0] for p in base) / n_bastions, sum(p[1] for p in base) / n_bastions)

    outline: List[Point] = []
    tips: List[Point] = []
    for i in range(n_bastions):
        v = base[i]
        out_ux, out_uy = unit(v[0] - centre[0], v[1] - centre[1])
        tip = (v[0] + out_ux * bastion_depth_m, v[1] + out_uy * bastion_depth_m)
        tips.append(tip)

        shoulder_points = []
        for neighbour in (base[(i - 1) % n_bastions], base[(i + 1) % n_bastions]):
            edge_len = ((neighbour[0] - v[0]) ** 2 + (neighbour[1] - v[1]) ** 2) ** 0.5
            dir_ux, dir_uy = unit(neighbour[0] - v[0], neighbour[1] - v[1])
            gorge = (v[0] + dir_ux * edge_len * gorge_fraction, v[1] + dir_uy * edge_len * gorge_fraction)
            perp_x, perp_y = -dir_uy, dir_ux
            if perp_x * out_ux + perp_y * out_uy < 0:  # pick the outward-facing sign
                perp_x, perp_y = -perp_x, -perp_y
            shoulder = (gorge[0] + perp_x * flank_length_m, gorge[1] + perp_y * flank_length_m)
            shoulder_points.append((gorge, shoulder))

        (gorge_prev, shoulder_prev), (gorge_next, shoulder_next) = shoulder_points
        outline.extend([gorge_prev, shoulder_prev, tip, shoulder_next, gorge_next])

    return outline, tips, centre


def ravelins(n_bastions: int, radius_m: float, ravelin_depth_m: float,
            ravelin_half_width_m: float) -> List[List[Point]]:
    """One small triangular outwork per curtain (i.e. one per EDGE of the
    base n-gon, centred between two adjacent bastions), pointing outward
    into the moat. A real ravelin is a solid raised platform, not a
    hollow wall -- each is returned as a plain 3-point ring, meant to be
    used as one filled TemplatePart apiece, not thickened."""
    base = regular_polygon_vertices(n_bastions, radius_m)
    centre = (sum(p[0] for p in base) / n_bastions, sum(p[1] for p in base) / n_bastions)
    out: List[List[Point]] = []
    for i in range(n_bastions):
        v = base[i]
        v_next = base[(i + 1) % n_bastions]
        mid = ((v[0] + v_next[0]) / 2.0, (v[1] + v_next[1]) / 2.0)
        out_ux, out_uy = unit(mid[0] - centre[0], mid[1] - centre[1])
        along_ux, along_uy = unit(v_next[0] - v[0], v_next[1] - v[1])
        tip = (mid[0] + out_ux * ravelin_depth_m, mid[1] + out_uy * ravelin_depth_m)
        base_a = (mid[0] - along_ux * ravelin_half_width_m, mid[1] - along_uy * ravelin_half_width_m)
        base_b = (mid[0] + along_ux * ravelin_half_width_m, mid[1] + along_uy * ravelin_half_width_m)
        out.append([base_a, tip, base_b])
    return out


def counterscarp_polygon(outline: List[Point], centre: Point, moat_offset_m: float,
                         moat_width_m: float, thickness_m: float = 4.0):
    """A thin retaining wall right at the moat's OUTER edge -- a real
    Vauban ditch has a counterscarp for exactly this structural reason,
    and it solves a real rendering problem here too: the moat's water is
    the identical flat colour as the open sea around it (both draw via
    the same unmodulated style.colour("water") fill), so without some
    engineered edge the moat reads as a few stray patches of "more ocean,"
    not a ditch. Reuses mitred_band directly against a ring pushed out to
    the moat's own outer boundary -- same mitred-band construction, no new
    geometry technique needed."""
    outer_edge = pushed_outward(outline, centre, moat_offset_m + moat_width_m)
    return mitred_band(outer_edge, thickness_m)


class VaubanFort:
    """Everything vauban_fort() built. `parts` is every shape simple enough
    for TemplatePart's one-ring footprint (towers, ravelins, keep);
    `raw_shapes` is every shape that needed real mitred-band or
    polygon-with-hole geometry (the wall, the moat, the counterscarp) --
    see RawShape's own docstring for why those can't be TemplateParts."""
    def __init__(self, parts: List[TemplatePart], raw_shapes: List[RawShape], centre: Point):
        self.parts = parts
        self.raw_shapes = raw_shapes
        self.centre = centre


def vauban_fort(n_bastions: int = 6, radius_m: float = 150.0, bastion_depth_m: float = 60.0,
                flank_length_m: float = 24.0, gorge_fraction: float = 0.28,
                wall_thickness_m: float = 6.0, wall_height_m: float = 12.0,
                tower_radius_m: float = 9.0, tower_height_m: float = 19.0,
                ravelin_depth_m: float = 40.0, ravelin_half_width_m: float = 24.0,
                moat_offset_m: float = 22.0, moat_width_m: float = 34.0,
                glacis_margin_m: float = 18.0,
                keep_radius_m: float = 30.0, keep_height_m: float = 22.0,
                ) -> VaubanFort:
    """The whole thing: bastioned rampart, a tower at every bastion tip, a
    ravelin in the moat facing every curtain, the moat itself, and a
    central keep for scale. Every sub-shape is real trigonometry against a
    regular polygon -- nothing here is a hand-picked or guessed coordinate.

    Every part carries an explicit `building:material` tag rather than
    being left to the generic per-id roof-colour hash
    (render_tile._building_roof_colour): confirmed directly that letting
    ~70 individually-id'd parts each pick their own hashed colour produces
    a random-looking patchwork, not a fortress that reads as one
    construction. Two deliberate materials, not one flat tone: `concrete`
    for the rampart/moat-facing works (the bulk of the structure), `brick`
    for the towers and keep (the tallest, most important points) so they
    read as accents, not more random variation.
    """
    outline, tips, centre = bastion_trace(n_bastions, radius_m, bastion_depth_m,
                                          flank_length_m, gorge_fraction)

    parts: List[TemplatePart] = []
    for tx, ty in tips:
        parts.append(TemplatePart(
            kind="area",
            tags={"building": "tower", "military": "bastion", "building:material": "brick",
                 "name:en": "Bastion Tower"},
            height_m=tower_height_m,
            footprint=[
                (tx - tower_radius_m, ty - tower_radius_m), (tx + tower_radius_m, ty - tower_radius_m),
                (tx + tower_radius_m, ty + tower_radius_m), (tx - tower_radius_m, ty + tower_radius_m),
            ],
        ))

    for ring in ravelins(n_bastions, radius_m, ravelin_depth_m, ravelin_half_width_m):
        parts.append(TemplatePart(
            kind="area",
            tags={"building": "ravelin", "military": "bunker", "building:material": "concrete",
                 "name:en": "Ravelin"},
            height_m=wall_height_m * 0.7, footprint=ring,
        ))

    keep_n = 8
    keep_ring = regular_polygon_vertices(keep_n, keep_radius_m)
    parts.append(TemplatePart(
        kind="area",
        tags={"building": "fortress", "military": "citadel", "building:material": "brick", "name:en": "Keep"},
        height_m=keep_height_m, footprint=keep_ring,
    ))

    moat_geom = annulus(outline, centre, moat_offset_m, moat_width_m)
    raw_shapes = [
        # Land first: everything else below either stands on it (wall,
        # towers, keep) or cuts a real hole through it (the moat).
        RawShape(
            land_mass_with_hole(
                pushed_outward(outline, centre, moat_offset_m + moat_width_m + glacis_margin_m),
                moat_geom),
            {"landuse": "military", "name:en": "Fort Island"},
            0.0,
        ),
        RawShape(
            mitred_band(outline, wall_thickness_m),
            {"barrier": "wall", "wall": "fort_wall", "building": "bastion_wall",
             "building:material": "concrete", "name:en": "Bastioned Rampart"},
            wall_height_m,
        ),
        RawShape(
            moat_geom,
            {"natural": "water", "name:en": "Fort Ditch"},
            0.0,
        ),
        RawShape(
            counterscarp_polygon(outline, centre, moat_offset_m, moat_width_m),
            {"barrier": "wall", "wall": "retaining_wall", "building": "counterscarp",
             "building:material": "concrete", "name:en": "Counterscarp"},
            wall_height_m * 0.35,
        ),
    ]
    return VaubanFort(parts, raw_shapes, centre)
