# -*- coding: utf-8 -*-
"""Return land to the sea -- the explicit inverse of reclaim.py, requested
directly (a real, missing gap: reclaim (sea -> land) was built, but a real
map editor needs the reverse just as much -- undoing a reclaim, or turning
an unwanted patch of dry land like a sea fort's own footprint back into
open water). Matches the OLD op-log stack's `returnToSea` payload flag
(`citymap/ops/demolish.py`), which UNIONS a polygon INTO world.sea -- this
is that same operation, direct, in the new GeoPackage-store live-editing
stack, mirroring reclaim.py's own shape exactly (pure geometry, the current
sea geometry read by the caller and passed in, never touched via a store
from inside this module).

Deliberately does NOT delete features under the outline -- a real, narrow
scope decision: turning land into water and deleting the buildings sitting
on it are two separate, composable actions (the live-editing stack now has
a real DELETE /api/features/{id} for the latter), not one tool silently
doing both. A user who wants a sea fort fully gone deletes its buildings
first (or after), then returns the land itself to the sea.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from shapely.geometry import Polygon
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union

DEFAULT_BLEND_M = 8.0   # matches reclaim.py's own DEFAULT_BLEND_M -- the
                        # same "reads as an engineered edge" reasoning
                        # applies symmetrically to un-reclaiming.
SEA_LEVEL_M = 0.0       # matches terrain.py's own sea-level convention
                        # (the same baseline reclaim.py's freeboard is
                        # measured above).


class ReturnToSeaError(Exception):
    pass


@dataclass
class ReturnToSeaResult:
    outline: Polygon             # the exact drawn outline -- used for BOTH
                                 # the sea union and the terrain edit, so
                                 # "is this sea or land" and "is this at
                                 # sea level or not" never disagree
    new_sea_geom: BaseGeometry
    target_elevation_m: float
    blend_m: float


def generate_return_to_sea(outline: Polygon, current_sea_geom: Optional[BaseGeometry], *,
                           blend_m: float = DEFAULT_BLEND_M, cell_size_m: float) -> ReturnToSeaResult:
    """`outline`: the drawn area to flood, SOURCE CRS. `current_sea_geom`:
    the store's CURRENT world.sea.sea_geom (or None if there is no sea in
    this frame at all) -- the caller's job to fetch, since this module
    never touches the store.

    Raises ReturnToSeaError for an empty/invalid outline, a non-positive
    blend_m, an outline too small to rasterise at this frame's resolution
    (the same "silently dropped by the renderer" failure mode terrace.py/
    reclaim.py refuse loudly for), or an outline that is ALREADY entirely
    open sea (nothing to return -- refused rather than silently no-op'ing
    a union that changes nothing).
    """
    if outline.is_empty or not outline.is_valid:
        raise ReturnToSeaError("outline is empty or invalid")
    if blend_m <= 0:
        raise ReturnToSeaError(f"blend_m must be positive, got {blend_m}")

    min_span_m = 2.0 * cell_size_m
    if outline.area < min_span_m * min_span_m:
        raise ReturnToSeaError(
            f"outline is too small ({outline.area:.1f} sq m) to rasterise at this frame's "
            f"resolution ({min_span_m:.2f}m min span) -- it would be silently dropped by the "
            f"renderer. Draw a bigger outline.")

    if current_sea_geom is not None and not current_sea_geom.is_empty and current_sea_geom.contains(outline):
        raise ReturnToSeaError("outline is already entirely open sea -- nothing to return")

    new_sea_geom = (unary_union([current_sea_geom, outline])
                    if current_sea_geom is not None and not current_sea_geom.is_empty else outline)
    return ReturnToSeaResult(outline=outline, new_sea_geom=new_sea_geom,
                             target_elevation_m=SEA_LEVEL_M, blend_m=blend_m)
