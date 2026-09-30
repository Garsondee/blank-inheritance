"""Which region a building stands in, and which regions border each other.

Written 2026-09-12 (Gazetteer V2) after a direct measurement embarrassed the
tool: the map had forty regions tessellating it exactly, so every site and
point already knows which district it stands in by simple geometry -- and
nothing in the interface used that anywhere. Not the list, not the inspector,
not search. A hundred and thirteen anonymous rows sat in one flat scroll while
the answer to "where is this" was sitting right there in the coordinates.

This module is the answer, computed rather than typed, over a SESSION DRAFT
(image-pixel geometry, core/session.py's shape) rather than over promoted
`data/locations/*.json` documents. `core/location.py` already does the
lon/lat version of containment for promoted locations one at a time at
promotion; this is deliberately its own module because a draft is worked
through wholesale, before anything is promoted -- Ingram's actual working
loop draws twenty buildings and only writes lore for three of them, and the
other seventeen still deserve to know which district they are standing in
while they wait. Recomputed on every load and every save, never stored once
and trusted, for the same reason `derive_item` recomputes cells: a vertex
dragged by a pixel can move a building across a district line, and a stale
answer is worse than none because it looks authoritative.

Two things are computed:

    containment   for every site/point, which region's centroid-test it falls
                  inside (by AREA if more than one candidate overlaps -- a
                  tessellation is meant to have none, but a session mid-draft
                  often does, and the smaller region is the more specific
                  answer). For every region, the sorted list of site/point
                  ids it contains.

    adjacency     which regions border each other. Not "close to" -- exact
                  tessellation means a shared border is made of literally
                  coincident or near-coincident vertices (region drawing
                  snaps new vertices onto existing ones for exactly this
                  reason), so "some vertex of A sits within a few pixels of
                  B's boundary" is a real structural fact about the map, not
                  a heuristic. Reported as a ratio: PROXIMATE_TOLERANCE_PX
                  worth of slack is what a hand-drawn shared border needs
                  after rounding, not what a merely nearby district gets.

Pure: no I/O, no shapely, no georeference. Mirrored in containment.mjs and
held to it by test/fixtures/gazetteer-containment-cases.json, matching the
shape/grid/depth precedent.
"""

from __future__ import annotations

#: How close two regions' vertices have to come to count as sharing a border,
#: in image pixels (= metres on this sheet). Loose enough to absorb a hand-
#: drawn seam's rounding, tight enough that "adjacent" still means touching:
#: the region-drawing snap radius itself is 12 SCREEN px, which converts to a
#: few image px at any zoom level actually used for drawing, so 6 px is a
#: generous multiple of the real snap error rather than a guess.
PROXIMATE_TOLERANCE_PX = 6.0


class ContainmentError(ValueError):
    """A geometry could not be measured."""


def _open_ring(ring):
    pts = [(float(x), float(y)) for x, y in ring]
    while len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    return pts


def point_in_ring(x, y, ring):
    """Even-odd ray casting. The one true implementation on the Python side --
    app.js, draw.js and overrides.py each already carry their own copy of
    this for their own reasons (a UI hit-test convenience, a suppression
    lookup); this is the one that decides containment for the record."""
    pts = _open_ring(ring)
    inside = False
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        if (y0 > y) != (y1 > y):
            t = (y - y0) / (y1 - y0)
            if x < x0 + t * (x1 - x0):
                inside = not inside
    return inside


def point_in_polygon(x, y, ring, holes=()):
    """Inside the outer ring and outside every hole -- a region with an
    island in its bay must not claim the island's own buildings."""
    if not point_in_ring(x, y, ring):
        return False
    return not any(point_in_ring(x, y, hole) for hole in holes)


def polygon_area(ring):
    """Shoelace area. Duplicated from core/grid.py's polygon_area_px rather
    than imported: that function raises GridError, which is the right
    behaviour for a shape someone is actively editing on screen and the wrong
    one for a batch containment pass that must finish the other 112 items
    when one is momentarily degenerate mid-drag."""
    pts = _open_ring(ring)
    if len(pts) < 3:
        return 0.0
    total = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        total += x0 * y1 - x1 * y0
    return abs(total) / 2.0


def centroid_of(geometry):
    """The point a containment test is run against, for any item geometry.

    A point tier's own point, or a polygon's vertex-mean centroid -- the
    vertex mean rather than the true area centroid, on purpose: it is what
    app.js and draw.js already compute client-side for the live grid-ref
    readout and for `liveRef`, and disagreeing with the browser about which
    cell a shape is "in" would be its own quiet bug. Falls back to the vertex
    mean for a degenerate ring rather than raising, for the reason given on
    polygon_area above.
    """
    if geometry.get("kind") == "point":
        x, y = geometry["pointPx"]
        return (float(x), float(y))
    pts = _open_ring(geometry.get("ringPx") or [])
    if not pts:
        raise ContainmentError("empty geometry has no centroid")
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def _distance_point_to_segment(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    if dx == 0 and dy == 0:
        return ((px - x0) ** 2 + (py - y0) ** 2) ** 0.5
    t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx, cy = x0 + t * dx, y0 + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def _min_vertex_to_ring_distance(vertex, ring):
    x, y = vertex
    pts = _open_ring(ring)
    if not pts:
        return float("inf")
    best = float("inf")
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        d = _distance_point_to_segment(x, y, x0, y0, x1, y1)
        if d < best:
            best = d
    return best


def _bboxes_close(ring_a, ring_b, tolerance):
    ax = [p[0] for p in ring_a]; ay = [p[1] for p in ring_a]
    bx = [p[0] for p in ring_b]; by = [p[1] for p in ring_b]
    return not (max(ax) + tolerance < min(bx) or max(bx) + tolerance < min(ax)
                or max(ay) + tolerance < min(by) or max(by) + tolerance < min(ay))


def are_adjacent(ring_a, ring_b, tolerance=PROXIMATE_TOLERANCE_PX):
    """Do these two region outlines share a border?

    A bounding-box reject first -- cheap, and at forty regions most pairs are
    nowhere near each other, so this is what keeps the whole-draft pass from
    being quadratic in practice even though it is quadratic on paper. The
    real test then checks both directions (a vertex of A near an edge of B,
    and a vertex of B near an edge of A) because a shared border drawn as two
    different vertex densities on either side -- one district traced with six
    points, its neighbour with forty -- would otherwise only show up from one
    side.
    """
    if not _bboxes_close(ring_a, ring_b, tolerance):
        return False
    for vertex in _open_ring(ring_a):
        if _min_vertex_to_ring_distance(vertex, ring_b) <= tolerance:
            return True
    for vertex in _open_ring(ring_b):
        if _min_vertex_to_ring_distance(vertex, ring_a) <= tolerance:
            return True
    return False


def _boundary_rings(ring, holes):
    """Every ring that is part of a region's OWN edge -- its exterior, and
    every hole cut into it. A hole's edge is a real border exactly like the
    exterior is: an island sitting inside a bay region's hole shares its
    entire outline with that bay, and missing that produced a real, checked
    bug -- "The River Island" (a 13-vertex land region) sits precisely in a
    13-vertex hole of "The Open Sea" and came back with zero neighbours until
    holes were included here, because only exterior-to-exterior pairs were
    being tested."""
    return [ring] + list(holes)


def compute(items, *, tolerance=PROXIMATE_TOLERANCE_PX):
    """Containment and adjacency across one draft's worth of items.

    Returns {localId: {"withinRegionRef": id_or_None}} for every site/point,
    and {localId: {"containsRefs": [...], "neighbourRefs": [...]}} for every
    region. A region's own entry has no `withinRegionRef` and a site/point's
    has no `containsRefs`/`neighbourRefs` -- the three fields only exist on
    the tier that can meaningfully carry them, so a caller merging this into
    `derived` never has to strip a field that says nothing.

    Locked items are not treated specially: containment is a fact about
    geometry, not about how settled the writing is, and a locked building
    that quietly stopped knowing its own district the moment its lore was
    written would be a strange kind of reward for finishing it.
    """
    regions = [it for it in items if it.get("tier") == "region"
              and (it.get("geometry") or {}).get("kind") == "polygon"]
    others = [it for it in items if it.get("tier") in ("site", "point")]

    region_rings = {}
    for region in regions:
        geom = region["geometry"]
        region_rings[region["localId"]] = (
            geom.get("ringPx") or [], geom.get("holesPx") or [])

    out = {r["localId"]: {"containsRefs": [], "neighbourRefs": []} for r in regions}

    for item in others:
        try:
            cx, cy = centroid_of(item["geometry"])
        except ContainmentError:
            out[item["localId"]] = {"withinRegionRef": None}
            continue
        candidates = []
        for local_id, (ring, holes) in region_rings.items():
            if len(ring) < 3:
                continue
            if point_in_polygon(cx, cy, ring, holes):
                candidates.append((polygon_area(ring), local_id))
        winner = min(candidates)[1] if candidates else None
        out[item["localId"]] = {"withinRegionRef": winner}
        if winner is not None:
            out[winner]["containsRefs"].append(item["localId"])

    for entry in out.values():
        if "containsRefs" in entry:
            entry["containsRefs"].sort()

    region_ids = list(region_rings)
    for i, a_id in enumerate(region_ids):
        ring_a, holes_a = region_rings[a_id]
        if len(ring_a) < 3:
            continue
        boundaries_a = _boundary_rings(ring_a, holes_a)
        for b_id in region_ids[i + 1:]:
            ring_b, holes_b = region_rings[b_id]
            if len(ring_b) < 3:
                continue
            boundaries_b = _boundary_rings(ring_b, holes_b)
            touching = any(
                len(ba) >= 3 and len(bb) >= 3 and are_adjacent(ba, bb, tolerance)
                for ba in boundaries_a for bb in boundaries_b)
            if touching:
                out[a_id]["neighbourRefs"].append(b_id)
                out[b_id]["neighbourRefs"].append(a_id)

    for local_id in region_ids:
        out[local_id]["neighbourRefs"].sort()

    return out
