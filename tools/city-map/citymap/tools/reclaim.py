# -*- coding: utf-8 -*-
"""Reclaim land from the sea -- map-editor plan Phase 10 (wish #3, reclaim
half): "reclaim as its own tool," standalone rather than a side effect of
placing a structure (ideas/entries/offshore-construction.json's own phase
(a), built inside the OLD op-log apply_construct, is exactly that side
effect -- this is the same operation, direct, in the new GeoPackage-store
live-editing stack).

Pure geometry, same tier as terrace.py/wall_on_foundation.py: given the
drawn outline and the CURRENT sea geometry (read by the caller, passed in
-- this module never touches a store or Fields), produce the new sea
geometry (the outline carved OUT via difference(), the exact inverse of
demolish.py's returnToSea, which UNIONS a polygon back INTO the sea) plus a
flat TerrainEdit-shaped result at a freeboard elevation above sea level --
matching apply_construct's own already-proven offshore-reclaim design (same
"is this sea or land" / "is this elevated or not" never-disagree discipline
called out in that module's own docstring), just reached by a direct tool
instead of as a side effect of building something.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from shapely.geometry import Polygon
from shapely.geometry.base import BaseGeometry

DEFAULT_FREEBOARD_M = 4.0   # matches citymap/ops/construct.py's own
                            # DEFAULT_FREEBOARD_M -- "a few metres", a real
                            # artificial island/caisson platform's typical
                            # height above the waterline.
DEFAULT_BLEND_M = 8.0       # matches construct.py's own RECLAIM_EDGE_BLEND_M
                            # -- tighter than on-land benching's 20m blend:
                            # a reclaimed platform's edge reads as an
                            # engineered seawall, not a natural slope.


class ReclaimError(Exception):
    pass


@dataclass
class ReclaimResult:
    land_polygon: Polygon        # the exact drawn outline -- used for BOTH
                                 # the sea carve and the terrain edit, so
                                 # "is this sea or land" and "is this
                                 # elevated or not" never disagree
    new_sea_geom: Optional[BaseGeometry]
    target_elevation_m: float
    blend_m: float


def generate_reclaim(outline: Polygon, current_sea_geom: Optional[BaseGeometry], *,
                     freeboard_m: float = DEFAULT_FREEBOARD_M,
                     blend_m: float = DEFAULT_BLEND_M, cell_size_m: float) -> ReclaimResult:
    """`outline`: the drawn new-land shape, SOURCE CRS. `current_sea_geom`:
    the store's CURRENT world.sea.sea_geom (or None if there is no sea in
    this frame at all) -- the caller's job to fetch, since this module
    never touches the store.

    Raises ReclaimError for an empty/invalid outline, a non-positive
    blend_m, an outline too small to rasterise at this frame's resolution
    (the same "silently dropped by the renderer" failure mode terrace.py
    refuses loudly for), or an outline that doesn't overlap the sea at all
    (nothing to reclaim -- refused rather than silently creating a
    landuse-tagged no-op over land that was already dry).
    """
    if outline.is_empty or not outline.is_valid:
        raise ReclaimError("outline is empty or invalid")
    if blend_m <= 0:
        raise ReclaimError(f"blend_m must be positive, got {blend_m}")

    min_span_m = 2.0 * cell_size_m
    if outline.area < min_span_m * min_span_m:
        raise ReclaimError(
            f"outline is too small ({outline.area:.1f} sq m) to rasterise at this frame's "
            f"resolution ({min_span_m:.2f}m min span) -- it would be silently dropped by the "
            f"renderer. Draw a bigger outline.")

    if current_sea_geom is None or current_sea_geom.is_empty or not outline.intersects(current_sea_geom):
        raise ReclaimError("outline does not overlap the sea at all -- nothing to reclaim")

    new_sea_geom = current_sea_geom.difference(outline)
    return ReclaimResult(land_polygon=outline, new_sea_geom=new_sea_geom,
                         target_elevation_m=freeboard_m, blend_m=blend_m)
