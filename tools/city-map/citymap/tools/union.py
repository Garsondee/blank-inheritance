# -*- coding: utf-8 -*-
"""Merge selected features into one -- map-editor plan Phase 14 (boolean
operations, union-only for v1, per the user's own explicit answer to that
scope question). Pure geometry, same tier as reclaim.py/terrace.py: no
store/Fields access -- given the CURRENT geometries of the features to
merge by the caller (api/union.py re-reads them fresh from the store,
never trusting client-supplied geometry -- this project's "server
re-derives from the store" discipline elsewhere).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

import shapely.ops
from shapely.geometry.base import BaseGeometry

from citymap import ids as ids_module


class UnionError(Exception):
    pass


@dataclass
class UnionResult:
    geometry: BaseGeometry
    became_multi: bool  # True when the inputs didn't overlap/touch and the
                        # real result is a MultiPolygon, not a single Polygon
                        # -- reported, never silently flattened or blocked.


def derive_union_group_id(feature_ids: List[str]) -> str:
    """A deterministic id for merging exactly this set of features -- SORTS
    before hashing, so the result is order-independent: selecting A-then-B
    or B-then-A produces the identical group_id. Used as both the new
    merged feature's id and the change_log batch_id covering the whole
    merge (N deletes + 1 insert) under one Ctrl+Z step."""
    return ids_module.derive_id(f"union:{sorted(feature_ids)}")


def _geometry_kind(geom: BaseGeometry) -> str:
    """A coarse bucket -- "area" (Polygon/MultiPolygon), "line" (LineString/
    MultiLineString), or "point" (Point/MultiPoint) -- for catching a
    mixed-kind union BEFORE calling unary_union, not after. Confirmed live
    (map-editor plan Phase 14's own marquee-select verification, a real
    drag that swept up both buildings AND roads): shapely.ops.unary_union
    over a mix of polygons and lines produces a real GeometryCollection,
    not a Polygon/MultiPolygon -- an effectively unusable feature this
    stack has no rendering/editing story for (render.py's building and
    road passes each expect their own geometry kind, never a collection of
    both), so it must be refused loudly, not created silently."""
    if geom.geom_type in ("Polygon", "MultiPolygon"):
        return "area"
    if geom.geom_type in ("LineString", "MultiLineString"):
        return "line"
    if geom.geom_type in ("Point", "MultiPoint"):
        return "point"
    return "other"


def generate_union(geoms: List[BaseGeometry]) -> UnionResult:
    """Raises UnionError for fewer than 2 inputs (nothing to merge), fewer
    than 2 non-empty geometries surviving after empties are filtered (a
    silent one-geometry "merge" would be a confusing no-op dressed up as a
    real union), or a mix of geometry kinds (see _geometry_kind's own
    docstring for why)."""
    if len(geoms) < 2:
        raise UnionError(f"union needs at least 2 features, got {len(geoms)}")
    real_geoms = [g for g in geoms if g is not None and not g.is_empty]
    if len(real_geoms) < 2:
        raise UnionError(f"fewer than 2 non-empty geometries to merge (got {len(real_geoms)})")

    kinds = {_geometry_kind(g) for g in real_geoms}
    if len(kinds) > 1:
        raise UnionError(
            f"cannot union a mix of geometry kinds ({sorted(kinds)}) -- select only buildings/areas "
            f"or only roads/lines, not both")

    merged = shapely.ops.unary_union(real_geoms)
    return UnionResult(geometry=merged, became_multi=merged.geom_type.startswith("Multi"))
