"""The one place image-pixel geometry becomes a real data/locations/*.json
document -- design/location-editor.md §5. Kept deliberately Python-only: the
coordinate reprojection (rotation + EPSG:6674 + calibration) lives in
core/georef.py, ported over from the retired tools/gazetteer/'s own
server.py, whose comment on why is still the reason: "a second
implementation of the rotation in JavaScript is exactly the duplicate that
drifts."

A pure bridge, not a second promotion engine: every real computation here is
core/location.py's `build_location()` / `resync_region_geometry()`, called
exactly as the old gazetteer's own server.py called them before it was
retired (design doc §10 phase 6). This script does not read the harvest
records or write the ledger -- tools/location-sync's Node half (sync.mjs)
owns that; this only turns one already-decided
{op, locationId, tier, geometry, fields} into a location document and prints
it to stdout. Node writes the file.

Usage: reads one JSON object from stdin, writes one JSON object to stdout.
    {"op": "create", "locationId": "the-new-place", "tier": "site",
     "geometry": {"rings": [[[x,y], ...]], "point": null},
     "fields": {"name": ..., "kind": ..., "tags": [...], "rank": ...,
                "classification": ..., "depth": ..., "lore": {...},
                "scene": {"hooks": [...], "activities": [...]}, "note": "..."}}
  -> the full new location document.

    {"op": "geometry", "locationId": "an-existing-place", "tier": "region",
     "geometry": {"rings": [[[x,y], ...]], "point": null},
     "existingDoc": { ...the current data/locations/<id>.json... }}
  -> that document with geometry/derived resynced, everything else untouched.

    {"op": "split", "locationId": "an-existing-region", "newLocationId": "an-existing-region-2",
     "tier": "region", "geometry": {"cutPointsImagePx": [[x,y], ...]},
     "existingDoc": { ...the current data/locations/<id>.json... }}
  -> {"survivor": {...same doc, geometry/derived resynced to the LARGER piece,
     everything else untouched...}, "new": {...a brand-new, minimal, "needs-
     lore" location document for the SMALLER piece, built the same way any
     other freshly-drawn region is...}}. core/reconcile.py#bisect_region does
     the actual cut (design doc §10 phase 2b/2c) -- this only reshapes its
     single-region-item input/output at the edges, the same bridging role
     this file already plays for create/geometry.
"""

from __future__ import annotations

import json
import os
import sys

# core/ is this script's own direct sibling (tools/location-sync/core/), a
# real package (has __init__.py; its modules use relative imports like
# "from .grid import ..."). Running this script directly puts its own
# directory on sys.path automatically, so no manual sys.path manipulation
# is needed -- unlike when this imported across tools/gazetteer/'s own
# directory boundary, before that tool was retired (design doc §10 phase 6).
from core import georef as georef_mod  # noqa: E402
from core import location as location_mod  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
_LOCATIONS_DIR = os.path.join(_REPO_ROOT, "data", "locations")


def _existing_regions():
    """Every already-promoted region document -- build_location needs these to
    compute a new site/point's withinRegionRef. Locations with bad JSON are
    skipped, not fatal: a promotion should still succeed even if one unrelated
    file is momentarily broken."""
    regions = []
    if not os.path.isdir(_LOCATIONS_DIR):
        return regions
    for name in os.listdir(_LOCATIONS_DIR):
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(_LOCATIONS_DIR, name), encoding="utf-8") as fh:
                doc = json.load(fh)
        except (OSError, ValueError):
            continue
        if doc.get("tier") == "region":
            regions.append(doc)
    return regions


def _item_from_geometry(geometry, tier, fields):
    """The harvest record's already-image-px `geometry` (rings/point, GeoJSON-
    order) reshaped into the {kind, ringPx, holesPx}/{kind, pointPx} `item`
    shape build_location()/resync_region_geometry() expect -- the same shape a
    tools/gazetteer session item's own `geometry` always had."""
    rings = geometry.get("rings") or []
    point = geometry.get("point")
    if tier == "point" or point is not None:
        return {"tier": tier, "geometry": {"kind": "point", "pointPx": point}}
    if not rings:
        raise ValueError("no geometry.rings for a %r location" % (tier,))
    shell, holes = rings[0], rings[1:]
    return {
        "tier": tier,
        "geometry": {"kind": "polygon", "ringPx": shell, "holesPx": holes},
    }


def _apply_create(payload, georef):
    tier = payload["tier"]
    fields = payload.get("fields") or {}
    item = _item_from_geometry(payload["geometry"], tier, fields)
    item["name"] = fields.get("name")
    item["kind"] = fields.get("kind") or ""
    item["tags"] = fields.get("tags") or []
    item["depth"] = fields.get("depth") or "named"
    item["note"] = fields.get("note") or ""
    item["localId"] = payload.get("draftId")

    doc = location_mod.build_location(
        item,
        payload["locationId"],
        georef,
        lore=fields.get("lore") or {},
        scene=fields.get("scene") or {},
        tags=fields.get("tags"),
        classification=fields.get("classification"),
        rank=fields.get("rank"),
        nameJa=fields.get("nameJa"),
        # The cross-references the panel has no form for, supplied by a caller that has them
        # (tools/location-sync/from-handoff.mjs --fields): the editor's own records never carry these.
        npc_refs=fields.get("npcRefs"),
        faction_refs=fields.get("factionRefs"),
        episode_refs=fields.get("episodeRefs"),
        open_question_refs=fields.get("openQuestionRefs"),
        asset_refs=fields.get("assetRefs"),
        playlist_refs=fields.get("playlistRefs"),
        existing_regions=_existing_regions(),
    )

    if fields.get("namingPlaceholderRef"):
        doc["namingPlaceholderRef"] = fields["namingPlaceholderRef"]

    if tier == "region":
        # A freshly-drawn region may already have sites/points sitting inside
        # it (drawn before the district that contains them, the ordinary
        # order when tidying an already-built-up area) -- pick them up the
        # same way build_location's own site/point path does the reverse.
        others = [d for d in _existing_regions_and_sites() if d.get("id") != doc["id"]]
        location_mod.recompute_region_contents(doc, others)
    return doc


def _existing_regions_and_sites():
    docs = []
    if not os.path.isdir(_LOCATIONS_DIR):
        return docs
    for name in os.listdir(_LOCATIONS_DIR):
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(_LOCATIONS_DIR, name), encoding="utf-8") as fh:
                docs.append(json.load(fh))
        except (OSError, ValueError):
            continue
    return docs


def _apply_geometry(payload, georef):
    tier = payload["tier"]
    if tier != "region":
        # Matches the old tool's own rule (drawHandles' comment in draw.js):
        # a locked site/point never gets reshaped once promoted. Only a
        # region's border keeps needing tidying against its neighbours.
        raise ValueError(
            "a %r location's geometry cannot be resynced after promotion "
            "-- only a region's border is ever reshaped once linked" % (tier,)
        )
    doc = payload["existingDoc"]
    item = _item_from_geometry(payload["geometry"], tier, {})
    location_mod.resync_region_geometry(doc, item, georef)
    others = [d for d in _existing_regions_and_sites() if d.get("id") != doc["id"]]
    location_mod.recompute_region_contents(doc, others)
    return doc


def _apply_split(payload, georef):
    """Ingram's own bisect request (reconcile.py#bisect_region's docstring),
    reached from a real, already-promoted region for the first time -- the
    old gazetteer only ever bisected within one shared, persistent draft
    pool (server.py's STATE.draft) that always held every promoted region
    too; this tool's session is deliberately transient, drafts-only (design
    doc §3.4/§8's own retirement note), so there is no such pool to draw
    from here. Instead: `existingDoc` is read fresh by the Node caller at
    merge time (never a stale snapshot carried from the drawing session),
    reshaped into the one-item list bisect_region() expects, cut, and the
    two results reshaped back out -- the survivor resynced onto the SAME
    document (name/lore/authoring/every cross-reference untouched, only
    geometry moves, exactly resync_region_geometry's own contract), the
    smaller piece built fresh via build_location() like any other new
    region, deliberately with no lore at all so it lands at authoring.status
    "needs-lore" -- a real name and review are for a person to give it, the
    same as bisect_region's own docstring already insists on.
    """
    from core import reconcile as reconcile_mod

    tier = payload["tier"]
    if tier != "region":
        raise ValueError("only a region can be bisected, got %r" % (tier,))
    doc = payload["existingDoc"]
    # doc["geometry"]["rings"] is the CANONICAL shape -- lon/lat, per
    # design/map-generation.md's own rule. bisect_region needs image-px, the
    # same space the drawn cut line arrives in, so this reads
    # derived.imagePx instead: the same [shell, ...holes] shape build_location()
    # itself wrote there at promotion (or the last geometry resync), never
    # re-derived from lon/lat here (that round trip is exactly the kind of a
    # second implementation georef.py's own docstring warns against).
    image_rings = doc.get("derived", {}).get("imagePx") or []
    if not image_rings:
        raise ValueError("%r has no derived.imagePx to cut -- resync its geometry first" % (payload["locationId"],))
    target_item = _item_from_geometry({"rings": image_rings, "point": None}, "region", {})
    target_item["localId"] = payload["locationId"]
    target_item["tier"] = "region"

    cut_points = (payload.get("geometry") or {}).get("cutPointsImagePx") or []
    if len(cut_points) < 2:
        raise ValueError("a bisect cut needs at least two points")

    new_local_id = "bisect-new"
    try:
        new_items, survivor_id, new_id = reconcile_mod.bisect_region(
            [target_item], payload["locationId"], cut_points, new_local_id)
    except reconcile_mod.BisectError as exc:
        raise ValueError(str(exc))

    survivor_item = next(it for it in new_items if it["localId"] == survivor_id)
    new_item = next(it for it in new_items if it["localId"] == new_id)

    location_mod.resync_region_geometry(doc, survivor_item, georef)
    others = [d for d in _existing_regions_and_sites() if d.get("id") != doc["id"]]
    location_mod.recompute_region_contents(doc, others)

    new_item["note"] = "Split from %r by a bisect cut -- needs a name and review." % payload["locationId"]
    new_item["kind"] = doc.get("kind") or ""
    new_item["depth"] = "named"
    new_doc = location_mod.build_location(
        new_item, payload["newLocationId"], georef,
        existing_regions=_existing_regions(),
    )
    others2 = [d for d in _existing_regions_and_sites() if d.get("id") != new_doc["id"]]
    location_mod.recompute_region_contents(new_doc, others2)

    return {"survivor": doc, "new": new_doc}


def main():
    payload = json.load(sys.stdin)
    georef = georef_mod.MapGeoref.load()
    op = payload.get("op")
    if op == "create":
        json.dump(_apply_create(payload, georef), sys.stdout, indent=2)
    elif op == "geometry":
        json.dump(_apply_geometry(payload, georef), sys.stdout, indent=2)
    elif op == "split":
        json.dump(_apply_split(payload, georef), sys.stdout, indent=2)
    else:
        raise ValueError("apply_geometry.py only handles op 'create', 'geometry' or 'split', got %r" % (op,))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
