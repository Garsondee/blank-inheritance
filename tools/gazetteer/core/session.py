"""A drawing session: what gets drawn, noted, and dumped to one JSON file.

The working loop this serves was chosen deliberately (2026-09-11): draw a
session's worth of shapes with rough notes, dump them all into one file, then
work through them together in conversation and write the lore. So this is the
shape of that dump -- scratch, not the finished record. A draft becomes
`data/locations/*.json` entities later, which is where canonical lon/lat
geometry and written lore live.

Three tiers, because the map holds three different kinds of thing:

    region   a district. These tessellate -- the goal is the whole map broken
             into regions, each with its own flavour, so that containment
             ("this building is in that district") is derivable rather than
             typed.
    site     a building, complex or block inside a region.
    point    a pin with a story and no footprint: a statue, a doorway, a corner.

And three ways to get a footprint, because tracing a city block freehand at
200 m to the cell is miserable:

    drawn    you drew it
    adopted  you clicked a real building and took its actual footprint
    merged   you took several real buildings as one site (a campus, a terrace)

`note` is the human's text and is never rewritten by anything -- corrections
append. That is the one rule this file exists to protect: the rough note is the
brief, and a brief that gets quietly edited by a tool is no longer a brief.

Pure module. Coordinates are image pixels throughout, because that is what was
drawn and what a grid reference is computed from. Canonical lon/lat is attached
at save time by the one caller that has a georeference.
"""

from __future__ import annotations

import datetime
import json
import os
import re

from . import containment, grid

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DRAFT_DIR = os.path.join(_REPO_ROOT, "data", "map", "gazetteer-drafts")

TIERS = ("region", "site", "point")
SOURCES = ("drawn", "adopted", "merged")
#: Narrative development, independent of `tier`'s geometric scale. Kept in
#: step with core/depth.py's DEPTHS, which owns what each one obliges.
DEPTHS = ("named", "sketch", "scene", "standing")

#: A short, blunt vocabulary. Not the terrain system -- terrain is explicitly
#: out of scope -- just enough to sort a list and colour a shape while drawing
#: stays fast. Anything finer belongs in the note, where it can be prose.
KINDS = (
    "", "district", "quarter", "waterfront", "industrial", "residential",
    "civic", "commercial", "transport", "military", "green", "water",
    "landmark", "ruin", "infrastructure", "other",
)

_ID_SAFE = re.compile(r"[^a-z0-9]+")


def new_draft(map_sha256=None, map_ref="campaign-map", now=None):
    now = now or datetime.datetime.now()
    return {
        "id": "session-" + now.strftime("%Y%m%d-%H%M%S"),
        "type": "gazetteer-draft",
        "note": ("A drawing session. Scratch, not the record -- these become "
                 "data/locations/*.json entities once the lore is written."),
        "created": now.isoformat(timespec="seconds"),
        "updated": now.isoformat(timespec="seconds"),
        "mapRef": map_ref,
        "mapSha256": map_sha256,
        "items": [],
    }


def draft_path(draft_id, directory=None):
    """Where a draft lives.

    Reads DRAFT_DIR at call time rather than binding it as a default argument.
    A default is evaluated once at import, so binding it there would make the
    location look configurable while silently ignoring any change -- which is
    exactly how a test suite ends up writing into the real repo.
    """
    return os.path.join(directory or DRAFT_DIR, draft_id + ".json")


def make_item(local_id, tier, geometry, note="", name="", kind="", tags=None,
              source="drawn", source_feature_ids=None, depth="named",
              brief="", constraints=None):
    """One drawn thing, validated.

    Validation is strict and immediate rather than deferred to a later
    promotion step: a session can hold dozens of items and the person drawing
    them has moved on. An error caught at the moment of drawing is a nudge; the
    same error caught a week later is archaeology.

    `brief` and `constraints` are the fix for a real, measured failure
    (Gazetteer V2, 2026-09-12): twenty-two military buildings were drawn and
    named, and three separate corrections arrived in conversation only AFTER
    lore had started -- "the school is elsewhere," "this end of the island is
    pure military and checkpoints" -- because nothing in the tool held the
    constraint before the writing began. `brief` is one line of standing
    context a REGION carries ("pure military and checkpoints"); `constraints`
    are short hard facts as data rather than prose ("no civilians", "1950s
    register") -- checkable, unlike a sentence someone might skim.
    Meaningful on any tier, but overwhelmingly a REGION field in practice: a
    district's brief is what every building inside it should already know
    before a word of lore is written about them. Deliberately draft-only for
    now, not carried into data/locations/*.json's schema -- see
    design/location-depth.md's own note on retuning against real content
    before locking a shape in; the same discipline applies to a brand new
    field. `derived.inheritedBrief`/`inheritedConstraints` (see derive_draft)
    is how a site or point actually SEES its region's brief without it being
    copied and duplicated onto every building inside the district.
    """
    if tier not in TIERS:
        raise ValueError("tier must be one of %s, got %r" % (TIERS, tier))
    if source not in SOURCES:
        raise ValueError("source must be one of %s, got %r" % (SOURCES, source))

    kind_geom = geometry.get("kind")
    if kind_geom == "polygon":
        ring = geometry.get("ringPx") or []
        if len(ring) < 3:
            raise ValueError("a polygon needs at least 3 points, got %d" % len(ring))
        # Holes are generated, never drawn -- a region tessellation produces
        # them wherever an island sits in a bay. They are kept in their own
        # field rather than appended to `ringPx` so that every tool which
        # drags, nudges or hit-tests the outline keeps working on one ring.
        for hole in geometry.get("holesPx") or []:
            if len(hole) < 3:
                raise ValueError(
                    "a hole needs at least 3 points, got %d" % len(hole))
    elif kind_geom == "point":
        if not geometry.get("pointPx"):
            raise ValueError("a point needs pointPx")
        if tier != "point":
            raise ValueError("only the 'point' tier may have point geometry")
    else:
        raise ValueError("geometry.kind must be 'polygon' or 'point'")

    if tier == "point" and kind_geom != "point":
        raise ValueError("the 'point' tier must have point geometry")

    if depth not in DEPTHS:
        raise ValueError("depth must be one of %s, got %r" % (DEPTHS, depth))

    return {
        "localId": local_id,
        "tier": tier,
        "name": name or "",
        "kind": kind or "",
        # How developed this is meant to become -- design/location-depth.md.
        # Declared, never inferred, and defaulting to the cheapest rung.
        "depth": depth,
        "note": note or "",
        "tags": list(tags or []),
        "source": source,
        "sourceFeatureIds": list(source_feature_ids or []),
        # See this function's own docstring. `brief` is one line; `constraints`
        # is short hard facts, not prose -- each entry should read like a
        # label, not a sentence.
        "brief": brief or "",
        "constraints": list(constraints or []),
        "geometry": geometry,
        "derived": {},
    }


def derive_item(item, georef=None):
    """Fill in everything computable from the geometry.

    Recomputed on every save rather than stored once and trusted: a vertex
    dragged by one pixel can move a shape into another cell, and a stale cell
    list is worse than none because it looks authoritative.
    """
    geom = item["geometry"]
    d = {}
    if geom["kind"] == "polygon":
        ring = [(float(x), float(y)) for x, y in geom["ringPx"]]
        holes = [[(float(x), float(y)) for x, y in hole]
                 for hole in geom.get("holesPx") or []]
        d["refs"] = grid.refs_touched(ring)
        cx, cy = grid.polygon_centroid_px(ring)
        d["centroidPx"] = [round(cx, 2), round(cy, 2)]
        # Net of its holes: a bay region that reports the island inside it as
        # part of its own area is lying about the only number anyone reads.
        area_px = grid.polygon_area_px(ring)
        for hole in holes:
            area_px -= grid.polygon_area_px(hole)
        d["areaPx2"] = round(area_px, 2)
        d["vertexCount"] = len(ring)
        if holes:
            d["holeCount"] = len(holes)
        if georef is not None:
            d["areaM2"] = round(d["areaPx2"] * georef.metres_per_px ** 2, 1)
            geom["ring"] = [[round(lon, 8), round(lat, 8)]
                            for lon, lat in georef.ring_to_lonlat(ring)]
            if holes:
                geom["holes"] = [
                    [[round(lon, 8), round(lat, 8)]
                     for lon, lat in georef.ring_to_lonlat(hole)]
                    for hole in holes]
            lon, lat = georef.image_px_to_lonlat(cx, cy)
            d["centroidLonLat"] = [round(lon, 8), round(lat, 8)]
    else:
        x, y = (float(v) for v in geom["pointPx"])
        d["refs"] = [grid.image_px_to_ref(x, y)]
        d["centroidPx"] = [round(x, 2), round(y, 2)]
        if georef is not None:
            lon, lat = georef.image_px_to_lonlat(x, y)
            geom["point"] = [round(lon, 8), round(lat, 8)]
            d["centroidLonLat"] = [round(lon, 8), round(lat, 8)]

    d["ref"] = d["refs"][0] if d["refs"] else None
    item["derived"] = d
    return item


def derive_draft(draft, georef=None):
    """Everything derivable across a WHOLE draft, not just one item.

    Cell references, area and lon/lat are per-item facts and `derive_item`
    already owns them. Containment and adjacency are not: which region a
    building stands in depends on every region drawn, so they are computed
    once here, over the finished set, after every item's own geometry-derived
    fields are already in place.

    One malformed shape must not cost the containment pass for the other
    hundred: `derive_item` already tolerates a shape it cannot derive (see
    State.save_draft's own comment on the same principle), and this wraps the
    containment pass in the same spirit -- a single bad geometry drops that
    one item from the containment computation rather than aborting the whole
    thing.

    `derived.inheritedBrief` / `derived.inheritedConstraints` are how a site
    or point actually reads its containing region's `brief`/`constraints`
    without those being copied verbatim onto every building in the district
    (which would silently go stale the moment the region's brief changed).
    Computed here, alongside containment, because that is the one place both
    a building and its region are in hand at once.
    """
    for item in draft.get("items", []):
        try:
            derive_item(item, georef)
        except Exception:
            item["derived"] = {}

    try:
        contained = containment.compute(draft.get("items", []))
    except Exception:
        contained = {}

    by_id = {item["localId"]: item for item in draft.get("items", [])}
    for local_id, fields in contained.items():
        item = by_id.get(local_id)
        if item is not None:
            item["derived"].update(fields)

    for item in draft.get("items", []):
        item["derived"].setdefault("withinRegionRef", None)
        within = item["derived"].get("withinRegionRef")
        region = by_id.get(within) if within else None
        item["derived"]["inheritedBrief"] = (region or {}).get("brief") or ""
        item["derived"]["inheritedConstraints"] = list((region or {}).get("constraints") or [])

    return draft


def suggest_id(name, tier, taken=()):
    """A kebab-case id from a name, unique against what is already taken.

    Only a suggestion: the real id is settled when a draft item becomes a
    location entity, and that is a naming decision, not a slug. Unnamed items
    fall back to their tier so a draft never carries two blank ids.
    """
    base = _ID_SAFE.sub("-", (name or "").strip().lower()).strip("-")
    if not base:
        base = tier
    candidate = base
    n = 2
    while candidate in taken:
        candidate = "%s-%d" % (base, n)
        n += 1
    return candidate


def summarise(draft):
    """A one-line-per-tier count, for the UI's status line and for the report
    that greets a lore-writing session."""
    counts = {t: 0 for t in TIERS}
    unnamed = 0
    unnoted = 0
    for item in draft.get("items", []):
        counts[item["tier"]] = counts.get(item["tier"], 0) + 1
        if not item.get("name"):
            unnamed += 1
        if not (item.get("note") or "").strip():
            unnoted += 1
    return {
        "total": len(draft.get("items", [])),
        "byTier": counts,
        "unnamed": unnamed,
        "unnoted": unnoted,
    }


def validate(draft):
    """Problems worth refusing to save over, as a list of strings.

    Deliberately returns problems rather than raising: a drawing session should
    never lose work because one shape is malformed. The caller saves anyway and
    shows the list.
    """
    problems = []
    seen = set()
    for item in draft.get("items", []):
        lid = item.get("localId")
        if not lid:
            problems.append("an item has no localId")
        elif lid in seen:
            problems.append("duplicate localId %r" % lid)
        else:
            seen.add(lid)
        if item.get("tier") not in TIERS:
            problems.append("%s: unknown tier %r" % (lid, item.get("tier")))
        geom = item.get("geometry") or {}
        if geom.get("kind") == "polygon" and len(geom.get("ringPx") or []) < 3:
            problems.append("%s: polygon has fewer than 3 points" % lid)
        if geom.get("kind") == "point" and not geom.get("pointPx"):
            problems.append("%s: point has no position" % lid)
    return problems


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save(draft, path, now=None):
    draft["updated"] = (now or datetime.datetime.now()).isoformat(timespec="seconds")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(draft, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    return path


def list_drafts(directory=None):
    """Newest first -- the one you were just working on is the one you want."""
    directory = directory or DRAFT_DIR
    if not os.path.isdir(directory):
        return []
    names = [f[:-5] for f in os.listdir(directory) if f.endswith(".json")]
    return sorted(names, reverse=True)
