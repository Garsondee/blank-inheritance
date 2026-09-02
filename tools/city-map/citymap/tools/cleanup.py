# -*- coding: utf-8 -*-
"""Which pre-existing features does a new outline substantially cover? --
map-editor plan Phase 12's real fix for "reclaiming the sea where old land
used to be leaves ugly green/brown stuff showing through." That artifact is
not a rendering-order bug you could paint over -- it's that reclaim/terrace/
wall-on-foundation never delete what was already on the ground before laying
new construction over it (confirmed directly against the live store: a
reclaim marker overlapping a cluster of old military-fort features replayed
from this campaign's pre-SQLite operation log, never deleted when the sea
carved through them, still rendering today via the existing id-hashed roof
palette landing on olive/brown tones).

This module answers "which of the store's existing rows does this new
outline substantially contain" -- pure geometry, no store/Fields access,
same tier as reclaim.py/terrace.py -- so each of those three tools' own HTTP
layer (and the new standalone POST /api/clear-ground) can delete the answer
under their own existing transaction, batch_id, and undo machinery,
unchanged.

"Substantially contained" is a fraction of the OLD feature's OWN geometry,
never the new outline's -- a huge reclaim merely clipping the corner of a
long road must never delete that road, but a small building fully engulfed
by a new 84,000 sq m platform should. Polygons use an area fraction; lines
(e.g. a leftover highway=track) use a LENGTH fraction, since a line's .area
is always 0 and an area-fraction test would be meaningless for it -- this
dispatch is forced by the math, not a style choice.
"""

from __future__ import annotations

from typing import List

CONTAINMENT_FRACTION_DEFAULT = 0.75


def contained_fraction(old_geom, new_outline) -> float:
    """What fraction of old_geom's own extent (area for a polygon, length
    for a line, a plain in/out 1.0/0.0 for a point) sits inside new_outline?
    0.0 for anything empty, non-overlapping, or with a zero-sized extent
    (never divides by zero)."""
    if old_geom is None or old_geom.is_empty or new_outline is None or new_outline.is_empty:
        return 0.0
    if not old_geom.intersects(new_outline):
        return 0.0

    geom_type = old_geom.geom_type
    if geom_type in ("Point", "MultiPoint"):
        return 1.0 if new_outline.contains(old_geom) else 0.0

    intersection = old_geom.intersection(new_outline)
    if geom_type in ("LineString", "MultiLineString"):
        denom = old_geom.length
        numer = intersection.length
    else:
        # Polygon/MultiPolygon (and anything else area-bearing) -- area fraction.
        denom = old_geom.area
        numer = intersection.area
    if denom <= 0:
        return 0.0
    return numer / denom


def features_substantially_contained(candidates: List[dict], outline,
                                     threshold: float = CONTAINMENT_FRACTION_DEFAULT) -> List[dict]:
    """candidates: store-row kwargs dicts (citymap.store.gpkg.query_features_bbox's
    own return shape, each with a `geom` key) -- the ones whose
    contained_fraction against `outline` meets or exceeds `threshold`."""
    survivors = []
    for kwargs in candidates:
        geom = kwargs.get("geom")
        if geom is None or geom.is_empty:
            continue
        if contained_fraction(geom, outline) >= threshold:
            survivors.append(kwargs)
    return survivors
