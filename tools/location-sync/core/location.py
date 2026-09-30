"""Turning a drawing-session item into a real, permanent location.

A draft item (core/session.py) is scratch -- it lives in a gitignored session
file and nobody else's data points at it. A location (data/locations/*.json)
is the opposite: tracked, schema-validated, and the thing everything else in
the repo will eventually reference by id -- asset-registry.json's `kind:
"location"` entries, a scene-brief's `locationRef`, a Foundry map pin.

Promotion is the one-way door between them. It happens once the rough note has
become real, written lore -- co-written in conversation, per the standing
"don't invent the six kids/Frames" rule extended to places: this module never
invents `lore` text, it only carries geometry and provenance across and lets
the caller supply what was actually agreed.

**Containment is derived, never typed.** If a region already exists on this
ground, a newly promoted site's `withinRegionRef` is computed from whose area
its centroid falls inside -- by area, if more than one region's boundary
happens to overlap here (regions are meant to tessellate without overlap, but
a promotion has to survive one that hasn't been cleaned up yet). Symmetrically,
promoting a region recomputes which existing sites/points now fall inside it.
Neither is asked for by hand, because a district boundary that moves six months
from now must not leave every building inside it silently wrong.

Pure module: geometry and dict-shaping only. No file I/O -- the server layer
reads the existing locations, calls these functions, and writes the result.
"""

from __future__ import annotations

import datetime

REQUIRED_LORE_FOR_APPROVAL = ("summary",)


class PromotionError(ValueError):
    """The draft item cannot become a location as given."""


def build_location(item, location_id, georef, *, lore=None, name=None, nameJa=None,
                   session_id=None, existing_regions=(), status=None, now=None,
                   scene=None, npc_refs=None, faction_refs=None, episode_refs=None,
                   open_question_refs=None, bible_ref=None, asset_refs=None,
                   playlist_refs=None, tags=None, classification=None, rank=None):
    """A draft item -> a full location document.

    `existing_regions` is the list of already-promoted region documents (full
    dicts, as loaded from data/locations/) -- needed to compute
    `derived.withinRegionRef` for a site or point. Passing an empty list is
    correct and common: it just means no region has been drawn over this
    ground yet, and `withinRegionRef` comes back null rather than guessed.

    `scene` and the cross-reference lists exist for the same reason `lore`
    does: a location promoted straight into `sketch` depth or deeper needs
    them on arrival, not as a follow-up hand-edit. Their absence was a real
    gap -- `scene` used to be hardcoded empty regardless of what was passed,
    which meant there was no way to promote a fully-written standing-depth
    location in one step; found while actually trying to do that. Each stays
    optional and defaults to depth.py's own cheapest-rung shape, matching how
    `lore` already behaves.

    `tags` follows the same explicit-override-else-carry-from-item pattern as
    `name`/`nameJa`: a session item already carries its own `tags` (set by
    hand, e.g. "military", "underground"), and promotion keeps them unless
    the caller passes something else.

    `classification` has no item-side equivalent to carry from -- the drawing
    tool has no concept of it yet -- so it is taken from the caller alone and
    defaults to None (undeclared), matching the schema. See
    location.schema.json's own description for what the tiers mean.
    """
    scene = dict(scene or {})
    tier = item["tier"]
    geom = item["geometry"]
    lore = dict(lore or {})
    now = now or datetime.datetime.now()

    if tier in ("region", "site") and geom["kind"] != "polygon":
        raise PromotionError("%s needs polygon geometry, got %r" % (tier, geom["kind"]))
    if tier == "point" and geom["kind"] != "point":
        raise PromotionError("point needs point geometry, got %r" % geom["kind"])

    if geom["kind"] == "polygon":
        ring_px = geom["ringPx"]
        ring_lonlat = geom.get("ring") or georef.ring_to_lonlat(ring_px)
        holes_px = geom.get("holesPx") or []
        holes_lonlat = geom.get("holes") or [georef.ring_to_lonlat(h) for h in holes_px]
        # GeoJSON Polygon order, matched by coverage.py's own _to_polygon: the
        # first ring is the shell, every later one a hole -- an island sitting
        # inside a region (The Open Sea holding The River Island) is real
        # here, not a hypothetical, and dropping the hole on promotion is
        # exactly the bug that made that overlap look unfixable.
        rings = [ring_lonlat] + list(holes_lonlat)
        point_ll = None
        from .grid import cells_touched, polygon_area_px, polygon_centroid_px
        cx_px, cy_px = polygon_centroid_px(ring_px)
        area_px = polygon_area_px(ring_px)
        for hole in holes_px:
            area_px -= polygon_area_px(hole)
        area_m2 = round(area_px * georef.metres_per_px ** 2, 1)
        cells = cells_touched(ring_px, border=georef.border_px, cell=georef.cell_px,
                              cols=georef.cols, rows=georef.rows)
        image_px = [ring_px] + list(holes_px)
    else:
        x, y = geom["pointPx"]
        point_ll = list(geom.get("point") or georef.image_px_to_lonlat(x, y))
        rings = []
        cx_px, cy_px = x, y
        area_m2 = None
        from .grid import image_px_to_cell
        cells = [image_px_to_cell(x, y, border=georef.border_px, cell=georef.cell_px,
                                  cols=georef.cols, rows=georef.rows)]
        image_px = None

    from .grid import cell_to_ref
    ref_strs = [cell_to_ref(c, r, cols=georef.cols, rows=georef.rows,
                            separator=georef.separator) for c, r in cells]
    centroid_lonlat = list(georef.image_px_to_lonlat(cx_px, cy_px))

    within = None
    if tier in ("site", "point"):
        # Nothing contains itself. Callers re-promoting an existing location
        # have its previous version in `existing_regions`, and without this a
        # re-promotion could set withinRegionRef to the location's own id.
        within = _find_containing_region(
            centroid_lonlat,
            [r for r in existing_regions if r.get("id") != location_id])

    doc = {
        "$schema": "../schema/location.schema.json",
        "id": location_id,
        "type": "location",
        "tier": tier,
        "name": name if name is not None else (item.get("name") or None),
        "nameJa": nameJa if nameJa is not None else None,
        "namingPlaceholderRef": None,
        "kind": item.get("kind") or "",
        # Explicit override if given, else carried from the draft item's own
        # tags (e.g. "underground", set by hand for Deep Storage) -- same
        # explicit-else-carried pattern as name/nameJa above.
        "tags": list(tags) if tags is not None else list(item.get("tags") or []),
        "classification": classification,
        "rank": rank,
        # Carried from the draft, defaulting to the cheapest rung: an
        # undeclared location owes the least, not the most. What that
        # obligates is design/location-depth.md, checked by core/depth.py.
        "depth": item.get("depth") or "named",
        "geometry": {"rings": rings, "point": point_ll},
        "pinAnchor": None,
        "derived": {
            "imagePx": image_px,
            "centroidPx": [round(cx_px, 2), round(cy_px, 2)],
            "cells": ref_strs,
            "ref": ref_strs[0] if ref_strs else None,
            "areaM2": area_m2,
            "withinRegionRef": within,
            "containsRefs": [],
            "neighbourRefs": [],
            "sourceSession": session_id,
            "sourceLocalId": item.get("localId"),
            "promotedDate": now.strftime("%Y-%m-%d"),
        },
        "authoring": {
            "note": item.get("note") or "",
            "status": status or ("drafted" if lore.get("summary") else "needs-lore"),
        },
        "lore": {
            "summary": lore.get("summary", ""),
            "playerFacing": lore.get("playerFacing", ""),
            "gmOnly": lore.get("gmOnly", ""),
        },
        # Empty by default and filled as the location is developed, or
        # supplied up front by a caller that already has it -- present
        # rather than omitted either way, so the shape of what a deeper
        # location owes is visible in the file itself, not only in the spec.
        "scene": {
            "hooks": list(scene.get("hooks") or []),
            "activities": list(scene.get("activities") or []),
            "history": scene.get("history", ""),
            "consequences": scene.get("consequences", ""),
        },
        "realWorld": item.get("realWorld") or {},
        "factionRefs": list(faction_refs or []),
        "npcRefs": list(npc_refs or []),
        "episodeRefs": list(episode_refs or []),
        "openQuestionRefs": list(open_question_refs or []),
        "bibleRef": bible_ref,
        "assetRefs": list(asset_refs or []),
        "playlistRefs": list(playlist_refs or []),
    }
    return doc


def resync_region_geometry(doc, item, georef):
    """After `core/reconcile.py` rewrites a draft region item's `ringPx`
    (trimming it back, or growing it with a merged-in fragment), an
    already-promoted region's own file is a SECOND copy of that same
    geometry -- in lon/lat, with its own derived fields -- that promotion
    wrote once and nothing has kept in sync since. This is the sync: same
    geometry math `build_location` uses at promotion time, applied to an
    EXISTING document in place, touching only `geometry.rings` and the
    handful of `derived` fields computed purely from geometry.

    Everything else -- name, lore, authoring, scene, every cross-reference
    -- is untouched, because reconcile.py only ever changes a shape's
    OUTLINE, never what it means. `derived.containsRefs` is deliberately
    NOT touched here; call `recompute_region_contents` separately once
    every affected region's geometry has been resynced, so it sees every
    new shape rather than a mix of old and new.
    """
    if doc["tier"] != "region":
        raise PromotionError("only a region has geometry worth resyncing this way")
    geom = item["geometry"]
    ring_px = [[float(x), float(y)] for x, y in geom["ringPx"]]
    holes_px = [[[float(x), float(y)] for x, y in hole]
               for hole in geom.get("holesPx") or []]

    from .grid import cells_touched, polygon_area_px, polygon_centroid_px, cell_to_ref
    ring_lonlat = georef.ring_to_lonlat(ring_px)
    holes_lonlat = [georef.ring_to_lonlat(h) for h in holes_px]
    cx_px, cy_px = polygon_centroid_px(ring_px)
    area_px = polygon_area_px(ring_px)
    for hole in holes_px:
        area_px -= polygon_area_px(hole)
    cells = cells_touched(ring_px, border=georef.border_px, cell=georef.cell_px,
                          cols=georef.cols, rows=georef.rows)
    ref_strs = [cell_to_ref(c, r, cols=georef.cols, rows=georef.rows,
                            separator=georef.separator) for c, r in cells]

    doc["geometry"]["rings"] = [ring_lonlat] + holes_lonlat
    doc["derived"]["imagePx"] = [ring_px] + holes_px
    doc["derived"]["centroidPx"] = [round(cx_px, 2), round(cy_px, 2)]
    doc["derived"]["cells"] = ref_strs
    doc["derived"]["ref"] = ref_strs[0] if ref_strs else None
    doc["derived"]["areaM2"] = round(area_px * georef.metres_per_px ** 2, 1)
    return doc


def recompute_region_contents(region_doc, other_locations):
    """A region's `derived.containsRefs` -- every site/point whose centroid
    falls inside it, by lon/lat point-in-polygon.

    Called after promoting a region (against everything already promoted) and
    after promoting a new site/point (against every existing region, so the
    region's own file is kept current too) -- both directions, so a boundary
    drawn after its buildings still picks them up.
    """
    if region_doc["tier"] != "region":
        raise PromotionError("only a region has containsRefs")
    rings = region_doc["geometry"]["rings"]
    contained = []
    for other in other_locations:
        if other["id"] == region_doc["id"] or other["tier"] == "region":
            continue
        ll = _location_centroid_lonlat(other)
        if ll is None:
            continue
        if any(_point_in_ring(ll, ring) for ring in rings):
            contained.append(other["id"])
    region_doc["derived"]["containsRefs"] = sorted(contained)
    return region_doc


def validate_for_promotion(item):
    """Problems that block promotion, as a list of strings. Empty means clear.

    Deliberately permissive: a location may be promoted with only a note and
    no lore yet (status becomes "needs-lore"), because the working loop is
    draw-then-write, not draw-with-lore-already-decided. What is refused is a
    shape that cannot mean anything -- no geometry, or a tier/geometry
    mismatch session.py itself would have already caught on save.
    """
    problems = []
    if not (item.get("note") or "").strip() and not (item.get("name") or "").strip():
        problems.append("no name and no note -- promoting this would create an "
                        "unlabelled entry with nothing to write lore from")
    geom = item.get("geometry") or {}
    if geom.get("kind") == "polygon" and len(geom.get("ringPx") or []) < 3:
        problems.append("polygon has fewer than 3 points")
    if geom.get("kind") == "point" and not geom.get("pointPx"):
        problems.append("point has no position")
    return problems


def _find_containing_region(centroid_lonlat, regions):
    """Which region (by id) contains this point, preferring the smaller one if
    more than one candidate overlaps -- the smaller region is the more specific
    answer, the same instinct that picks the inner administrative unit over the
    outer one when both technically contain an address."""
    from .grid import polygon_area_px

    candidates = []
    for region in regions:
        for ring in region["geometry"]["rings"]:
            if _point_in_ring(centroid_lonlat, ring):
                # Area in lon/lat degrees is meaningless as a metric distance,
                # but is a consistent RANKING across candidates on one map, and
                # ranking is all "prefer the smaller" needs.
                candidates.append((polygon_area_px(ring), region["id"]))
                break
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0])
    return candidates[0][1]


def location_centroid_lonlat(doc):
    """A promoted location's centroid, in lon/lat. Public: the server needs
    this too, when re-checking existing sites against a region drawn after
    they were promoted."""
    return _location_centroid_lonlat(doc)


def region_contains(lonlat, region_doc):
    """Does this region's area cover this lon/lat point?"""
    return any(_point_in_ring(lonlat, ring) for ring in region_doc["geometry"]["rings"])


def _location_centroid_lonlat(doc):
    if doc["tier"] == "point":
        return doc["geometry"].get("point")
    rings = doc["geometry"].get("rings") or []
    if not rings:
        return None
    from .grid import polygon_centroid_px
    x, y = polygon_centroid_px(rings[0])
    return [x, y]


def _point_in_ring(point, ring):
    x, y = point
    inside = False
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]
        x1, y1 = ring[(i + 1) % n]
        if (y0 > y) != (y1 > y):
            t = (y - y0) / (y1 - y0)
            if x < x0 + t * (x1 - x0):
                inside = not inside
    return inside
