"""Which real-world features the campaign map no longer has.

The GeoPackage describes Kobe. The campaign map is a painting on top of that
geography which has already diverged: the op log sank three islands, and the
Photoshop master has been reworked by hand since. So when you click a building
to adopt its footprint, some of what the ground truth offers is not there any
more -- and clicking through stale buildings to find a real one is the kind of
friction that makes a tool stop getting used.

**Suppression is not deletion.** The GeoPackage stays true to the real place;
this file records what the CAMPAIGN map disagrees with. That matters for three
reasons: the real geometry is still the right answer for "what was here before
the Directorate flattened it", a mistake is undoable, and the record is a small
tracked JSON file whose diffs are readable rather than a 120 MB binary's.

Two ways to suppress, because the two real cases are different sizes:

    featureIds   exact, for "that specific warehouse is gone"
    areas        a polygon, for "everything inside here is gone" -- the airport,
                 a whole reclaimed island, a block levelled by a Claimant

Areas matter more than they look. Listing four thousand ids for a sunk island
would be unreadable, unreviewable, and would silently fail to cover anything
added to the ground truth later inside the same footprint.

Pure module: shapes and predicates, no I/O beyond the load/save pair at the
bottom, which is the only place that touches disk.
"""

from __future__ import annotations

import json
import os

from . import grid

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OVERRIDES_PATH = os.path.join(_REPO_ROOT, "data", "map", "groundtruth-overrides.json")

SCHEMA_REL = "../schema/groundtruth-overrides.schema.json"


def empty():
    """A fresh, valid overrides document."""
    return {
        "$schema": SCHEMA_REL,
        "id": "groundtruth-overrides",
        "type": "groundtruth-overrides",
        "description": (
            "Real-world features the campaign map no longer has. The "
            "GeoPackage stays true to the real place; this records where the "
            "painted map disagrees with it, so adopting a building's footprint "
            "never offers one that has been painted out."),
        "suppressedFeatures": [],
        "suppressedAreas": [],
    }


class Suppression:
    """A loaded overrides document, ready to answer "is this feature gone?".

    Built once per request batch rather than consulted row by row from disk:
    the id set becomes a real set, and each area's ring is kept as a flat point
    list for the point-in-polygon test. A viewport can hold a few thousand
    features, so this is asked a few thousand times in a row.
    """

    def __init__(self, doc=None):
        doc = doc or empty()
        self.doc = doc
        self.ids = {entry["featureId"] for entry in doc.get("suppressedFeatures", [])}
        self.areas = [(a.get("id"), [(float(x), float(y)) for x, y in a["ringPx"]])
                      for a in doc.get("suppressedAreas", []) if a.get("ringPx")]

    def __len__(self):
        return len(self.ids) + len(self.areas)

    def suppresses_id(self, feature_id):
        return feature_id in self.ids

    def suppresses_point(self, x, y):
        """Is this image pixel inside a suppressed area?"""
        return any(_point_in_ring(x, y, ring) for _, ring in self.areas)

    def why(self, feature_id=None, point=None):
        """Which rule suppressed something -- for showing in the UI rather than
        leaving a feature mysteriously absent."""
        if feature_id is not None and feature_id in self.ids:
            for entry in self.doc.get("suppressedFeatures", []):
                if entry["featureId"] == feature_id:
                    return entry.get("note") or "suppressed"
        if point is not None:
            for area in self.doc.get("suppressedAreas", []):
                ring = [(float(x), float(y)) for x, y in area.get("ringPx", [])]
                if ring and _point_in_ring(point[0], point[1], ring):
                    return area.get("note") or "inside a suppressed area"
        return None

    def hides(self, feature_id, centroid_px=None):
        """The question a feature query actually asks.

        A feature is hidden if it was named directly, or if its centroid falls
        in a suppressed area. Centroid rather than any-vertex: a long wall or a
        road that merely clips the corner of a levelled block has not itself
        been levelled, and treating it as gone would quietly erase the street
        outside the crater.
        """
        if feature_id in self.ids:
            return True
        if centroid_px is not None and self.suppresses_point(*centroid_px):
            return True
        return False


def add_feature_ids(doc, feature_ids, note="", when=None):
    """Suppress specific features. Already-suppressed ids are left alone rather
    than duplicated, so re-selecting an overlapping box is harmless."""
    existing = {e["featureId"] for e in doc.setdefault("suppressedFeatures", [])}
    added = 0
    for fid in feature_ids:
        if fid in existing:
            continue
        doc["suppressedFeatures"].append(
            {"featureId": fid, "note": note or "", "when": when})
        existing.add(fid)
        added += 1
    return added


def remove_feature_ids(doc, feature_ids):
    """Un-suppress -- the undo. A suppression made by mistake must be
    reversible without editing JSON by hand."""
    drop = set(feature_ids)
    before = len(doc.get("suppressedFeatures", []))
    doc["suppressedFeatures"] = [e for e in doc.get("suppressedFeatures", [])
                                 if e["featureId"] not in drop]
    return before - len(doc["suppressedFeatures"])


def add_area(doc, area_id, ring_px, note="", when=None, ring_lonlat=None):
    """Suppress everything whose centroid falls inside a polygon."""
    if len(ring_px) < 3:
        raise ValueError("a suppressed area needs at least 3 points")
    entry = {
        "id": area_id,
        "ringPx": [[float(x), float(y)] for x, y in ring_px],
        "note": note or "",
        "when": when,
        "refs": grid.refs_touched(ring_px),
    }
    if ring_lonlat is not None:
        entry["ring"] = [[float(a), float(b)] for a, b in ring_lonlat]
    doc.setdefault("suppressedAreas", []).append(entry)
    return entry


def remove_area(doc, area_id):
    before = len(doc.get("suppressedAreas", []))
    doc["suppressedAreas"] = [a for a in doc.get("suppressedAreas", [])
                              if a.get("id") != area_id]
    return before - len(doc["suppressedAreas"])


def load(path=None):
    # Read the module global at call time, not as a default argument -- see
    # session.draft_path for the failure that binding it at import invites.
    path = path or OVERRIDES_PATH
    if not os.path.exists(path):
        return empty()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save(doc, path=None):
    path = path or OVERRIDES_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def _point_in_ring(x, y, ring):
    """Ray casting. Kept here rather than imported from grid so this module can
    answer about a bare point without constructing a polygon object."""
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
