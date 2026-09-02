"""Terrace generation -- map-editor plan Phase 7 ("draw an outline, set
benches/step/inset, get a real stepped elevation with contours and
hillshade that follow it").

The elevation mechanism itself needs no new work: citymap.fields.
apply_terrain_edits already blends each edit against the ALREADY-
ACCUMULATED result of prior edits (its own docstring), and a later edit
fully wins inside its own polygon -- verified directly, nested outer->inner
TerrainEdits already produce real terrace risers. This module is the
validation + generation layer on top: turn "draw one outline, pick tier
count/step height/inset" into the real ordered TerrainEdit stack (ready for
citymap.store.gpkg.insert_terrain_edit) plus the riser polygons that make
each step actually READ as a step (design/map-generation.md's "rim cut-face
polygons... visually essential" -- written about excavation specifically,
the same idea applies to a benched RISE).

Validation matters here because the failure modes are otherwise SILENT:
fields.py's apply_terrain_edits rasterises each edit's polygon onto the DEM
grid, and a polygon that rasterises to zero real pixels (too thin at this
frame's cell size) is just skipped, with no error at all. This module
refuses loudly instead, before anything is written to the store.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

from shapely.geometry import Polygon


class TerraceError(Exception):
    pass


@dataclass
class TerraceTier:
    polygon: Polygon
    target_elevation_m: float
    blend_m: float
    stack_order: int


@dataclass
class TerraceRiser:
    polygon: Polygon
    height_m: float
    between_tiers: Tuple[int, int]  # (outer, inner) stack_order -- diagnostic only


@dataclass
class TerraceResult:
    tiers: List[TerraceTier]
    risers: List[TerraceRiser]


def generate_terrace(outline: Polygon, *, base_elevation_m: float, tiers: int,
                     step_height_m: float, inset_m: float, blend_m: float,
                     cell_size_m: float, mode: str = "fill") -> TerraceResult:
    """The real, ordered TerrainEdit stack for a terrace over `outline`, plus
    its riser polygons.

    tiers: how many benches, >= 1 (1 tier = a single flat pad, no risers --
    still real and useful: "raise this whole outline to elevation X").
    step_height_m: rise (fill) or drop (cut) per tier, > 0 -- direction is
    controlled by `mode`, never by sign, so callers never pass a negative
    step_height_m to mean "cut".
    inset_m: how far each tier shrinks inward from the one before, > 0.
    blend_m: the transition width outside EVERY tier's own polygon (one
    value for all tiers, matching apply_terrain_edits' own per-edit
    parameter) -- must be strictly less than inset_m, or a tier's own blend
    zone would reach past the NEXT tier's edge and blend into the wrong
    surface (the map-editor plan's own stated validation rule).
    mode: "fill" (rising -- the default, matching the fortress-foundation
    framing this feature was requested for) or "cut" (excavating downward).
    cell_size_m: this frame's DEM cell size (frame.extent_m / frame.dem_grid).
    The silently-dropped-polygon failure mode this function refuses loudly
    instead of reproducing is entirely about resolution relative to this
    number, so it is a required parameter, never guessed or defaulted.

    Raises TerraceError, with a specific actionable message, for any
    parameter or resulting geometry that would trigger fields.py's silent
    drop, or that would produce a topologically ambiguous stack (a tier
    splitting into disconnected pieces) rather than a clean nest.
    """
    if tiers < 1:
        raise TerraceError(f"tiers must be >= 1, got {tiers}")
    if step_height_m <= 0:
        raise TerraceError(f"step_height_m must be positive, got {step_height_m}")
    if inset_m <= 0:
        raise TerraceError(f"inset_m must be positive, got {inset_m}")
    if blend_m <= 0:
        raise TerraceError(f"blend_m must be positive, got {blend_m}")
    if mode not in ("fill", "cut"):
        raise TerraceError(f"mode must be 'fill' or 'cut', got {mode!r}")
    if outline.is_empty or not outline.is_valid:
        raise TerraceError("outline is empty or invalid")

    min_span_m = 2.0 * cell_size_m
    if inset_m < min_span_m:
        raise TerraceError(
            f"inset_m={inset_m}m is narrower than 2 DEM cells ({min_span_m:.2f}m at this "
            f"frame's resolution) -- each tier would rasterise to zero real pixels and be "
            f"silently dropped by the renderer. Use a larger inset, or fewer tiers.")
    if blend_m >= inset_m:
        raise TerraceError(
            f"blend_m={blend_m}m must be smaller than inset_m={inset_m}m, or each tier's own "
            f"blend zone would reach past the next tier's edge and blend into the wrong surface.")

    sign = 1.0 if mode == "fill" else -1.0
    tier_polygons: List[Polygon] = []
    for i in range(tiers):
        # buffer(negative) on a simple polygon is always a SUBSET of the
        # original (or empty) -- no extra clip against `outline` needed.
        tier_geom = outline if i == 0 else outline.buffer(-i * inset_m)
        if tier_geom.is_empty or tier_geom.area < min_span_m * min_span_m:
            raise TerraceError(
                f"tier {i} has no real room left after {i} inset(s) of {inset_m}m each -- "
                f"this outline is too small/thin for {tiers} tiers at this spacing "
                f"(try fewer tiers or a smaller inset).")
        if tier_geom.geom_type != "Polygon":
            raise TerraceError(
                f"tier {i}'s inset outline split into multiple disconnected pieces "
                f"({tier_geom.geom_type}) -- this outline's shape doesn't support a clean "
                f"nested terrace at this inset; try a simpler outline or a smaller inset.")
        tier_polygons.append(tier_geom)

    tiers_out = [
        TerraceTier(polygon=tier_polygons[i],
                   target_elevation_m=base_elevation_m + sign * i * step_height_m,
                   blend_m=blend_m, stack_order=i)
        for i in range(tiers)
    ]

    risers = []
    for i in range(tiers - 1):
        riser_geom = tier_polygons[i].difference(tier_polygons[i + 1])
        if riser_geom.is_empty:
            continue
        risers.append(TerraceRiser(polygon=riser_geom, height_m=step_height_m,
                                   between_tiers=(i, i + 1)))

    return TerraceResult(tiers=tiers_out, risers=risers)
