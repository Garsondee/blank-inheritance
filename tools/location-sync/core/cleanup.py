"""Snap hairline near-misses between region borders into one shared point.

Asked for directly: "How many [vertices] are so very nearly exactly
together that they might as well be the same line or vertex? Maybe we need
a 'Cleanup' button."

The first shipped version used a 20px default, reasoned from "every
sampled cross-region pair within 20px belonged to two regions already on
each other's neighbourRefs list." That check answers a weaker question
than the one that matters: adjacency only says the two regions touch
SOMEWHERE, not that THIS pair of corners is where they touch -- two
adjacent districts can still run close-but-deliberately-apart along a
stretch (a road, a channel, a buffer), and 20 image px is 20 real metres
on this sheet, wide enough to span exactly that kind of gap. Run for
real, it did: reported live as collapsing "valid map points which are
close but not even overlapping visually." The default below is now the
SAME distance `WELD_TOLERANCE_PX` (draw.js) already uses for the one
mechanism on this map with real evidence behind its number -- the live-
drag weld, measured against a real 56-region session: 865 vertex pairs
sit under 1px apart, a further 89 sit 3-4px apart, then it goes sparse.
That gap between the two real clusters and the unrelated tail is what
"meant to touch" actually looks like in this data; 20px was never in it.

This is the mechanism `snapEditedVertex` (draw.js) already applies to ONE
vertex during a live drag, run instead as a single batch pass over every
region on the sheet. The two differ in one important way: a live drag
snaps the vertex being moved ONTO an existing, unmoving target. A batch
pass has no single "the one being edited" vertex -- two corners that are
merely close are BOTH slightly wrong, so both move, to their shared
average, not to whichever one happened to already exist.

Two passes, each pure and independently testable:

  cluster_and_snap    groups every vertex within `tolerance_px` of another
                       region's vertex (transitively -- three regions
                       meeting at one corner become one cluster, not two
                       overlapping pairs) and moves every member of a
                       cluster to that cluster's centroid. A cluster
                       confined to a single region's own ring is left
                       alone: a shape's own near-duplicate point is a
                       different problem (see dedupe_self_duplicates)
                       from a border two DIFFERENT shapes disagree about.

  insert_edge_matches  for a vertex that still has no partner after the
                       snap pass but sits close to another region's EDGE
                       (not one of that region's existing vertices), splits
                       that edge by inserting a matching point -- the batch
                       version of splitTargetEdge (draw.js), which already
                       does exactly this for one vertex at the end of a
                       live drag.

Pure: no I/O, no server, no knowledge of session file shape beyond the
plain {localId, ring: [[x,y],...]} records the caller hands in and gets
back mutated. The caller (server.py's /api/cleanup) owns fetching the
draft, filtering to regions, calling these, and deciding whether to save
the result or only report it.
"""

from __future__ import annotations

import math

#: The default width of the "meant to touch" band -- the same number and
#: the same evidence as draw.js's own WELD_TOLERANCE_PX (see that
#: constant's own comment for the full pair-distance histogram this reads
#: off of). Deliberately NOT wider: the cost of erring low here is a
#: sliver left behind for a person to look at and decide about, which is
#: recoverable and visible; the cost of erring high is silently moving a
#: point someone drew on purpose, which a person is far less likely to
#: notice before it is buried under everything drawn after it.
DEFAULT_SNAP_TOLERANCE_PX = 5.0

#: A vertex sitting this close to another region's EDGE, but no closer to
#: any of that region's own VERTICES (or it would already have been caught
#: by cluster_and_snap), is treated as "meant to land on that edge." Same
#: value and the same reasoning as DEFAULT_SNAP_TOLERANCE_PX -- inserting
#: a stray point into a neighbour's ring is at least as consequential as
#: moving one, never less.
DEFAULT_EDGE_TOLERANCE_PX = 5.0

#: Two consecutive points on the SAME ring this close together are a
#: redundant point, not a border disagreement -- see dedupe_self_duplicates.
DEFAULT_SELF_DUPLICATE_TOLERANCE_PX = 1.0


def _dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _closest_on_segment(p, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return a
    t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return (ax + t * dx, ay + t * dy)


class _UnionFind:
    def __init__(self, n):
        self._parent = list(range(n))

    def find(self, x):
        root = x
        while self._parent[root] != root:
            root = self._parent[root]
        while self._parent[x] != root:
            self._parent[x], x = root, self._parent[x]
        return root

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self._parent[ra] = rb


def cluster_and_snap(regions, tolerance_px=DEFAULT_SNAP_TOLERANCE_PX):
    """Mutates each region's `ring` in place. Returns a report: one entry
    per cluster actually moved, `{point, vertexCount, regionIds, maxMovePx}`.

    `regions` is `[{"localId": str, "ring": [[x, y], ...]}, ...]`. A ring
    with fewer than 3 points is left untouched (nothing to tessellate).

    O(n^2) over every region's vertices, deliberately not spatially
    indexed: at the scale one hand-drawn sheet actually reaches (a few
    thousand vertices, per the docstring's own count), a few million
    distance checks run in well under a second, and a batch cleanup pass
    is run on demand, never per-frame -- the cost this would actually be
    worth paying to avoid does not exist here the way it does for a live
    drag's own per-tick snap search.
    """
    flat = []  # (region_index, vertex_index)
    pts = []
    for ri, region in enumerate(regions):
        ring = region.get("ring") or []
        if len(ring) < 3:
            continue
        for vi, p in enumerate(ring):
            flat.append((ri, vi))
            pts.append((float(p[0]), float(p[1])))

    n = len(pts)
    uf = _UnionFind(n)
    for i in range(n):
        pi = pts[i]
        ri = flat[i][0]
        for j in range(i + 1, n):
            if flat[j][0] == ri:
                continue  # a region's own ring is not a tessellation question
            if _dist(pi, pts[j]) <= tolerance_px:
                uf.union(i, j)

    clusters = {}
    for i in range(n):
        clusters.setdefault(uf.find(i), []).append(i)

    report = []
    for members in clusters.values():
        region_indices = {flat[i][0] for i in members}
        if len(region_indices) < 2:
            continue  # confined to one region's own ring -- not this pass's job
        cx = sum(pts[i][0] for i in members) / len(members)
        cy = sum(pts[i][1] for i in members) / len(members)
        max_move = max(_dist(pts[i], (cx, cy)) for i in members)
        for i in members:
            ri, vi = flat[i]
            regions[ri]["ring"][vi] = [round(cx, 1), round(cy, 1)]
        report.append({
            "point": [round(cx, 1), round(cy, 1)],
            "vertexCount": len(members),
            "regionIds": sorted(regions[ri]["localId"] for ri in region_indices),
            "maxMovePx": round(max_move, 2),
        })
    report.sort(key=lambda e: -e["maxMovePx"])
    return report


def insert_edge_matches(regions, tolerance_px=DEFAULT_EDGE_TOLERANCE_PX):
    """The batch form of splitTargetEdge (draw.js): a vertex with no
    matching VERTEX anywhere else (cluster_and_snap already handled those)
    that nonetheless sits close to another region's EDGE gets a real,
    matching point inserted into that edge, at the nearest point on it.

    Run this AFTER cluster_and_snap, on the already-snapped rings -- a
    vertex that was just moved onto a shared corner should not also be
    treated as "close to a nearby edge" a second time.

    Mutates rings in place (insertions only, never a point removed).
    Returns a report: one entry per point inserted,
    `{intoRegionId, atIndex, point, fromRegionId, distancePx}`.

    All matches are found against the ORIGINAL ring contents before any
    insertion in this pass -- inserting into region B while still mid-scan
    over region A's vertices must never let a later vertex see an edge that
    only exists because THIS pass already split it once; that would let one
    stray point drag a whole chain of unrelated insertions along an edge
    that was only ever supposed to gain one new corner. Multiple
    insertions destined for the same ring are applied in one final pass,
    ordered so that inserting earlier ones never invalidates the index
    a later one was computed against.
    """
    original_rings = [list(region.get("ring") or []) for region in regions]
    pending = []  # (target_region_index, segment_index, t, point, source_id)

    for ai, a in enumerate(regions):
        a_ring = original_rings[ai]
        for p in a_ring:
            p = (float(p[0]), float(p[1]))
            best = None
            for bi, b in enumerate(regions):
                if bi == ai:
                    continue
                b_ring = original_rings[bi]
                nb = len(b_ring)
                if nb < 3:
                    continue
                for k in range(nb):
                    v1 = (float(b_ring[k][0]), float(b_ring[k][1]))
                    v2 = (float(b_ring[(k + 1) % nb][0]), float(b_ring[(k + 1) % nb][1]))
                    # Already essentially at one of this segment's own
                    # endpoints -- a vertex-vertex match, cluster_and_snap's
                    # job, not this pass's.
                    if _dist(p, v1) < 0.5 or _dist(p, v2) < 0.5:
                        continue
                    cx, cy = _closest_on_segment(p, v1, v2)
                    d = _dist(p, (cx, cy))
                    if d <= tolerance_px and (best is None or d < best[0]):
                        dx, dy = v2[0] - v1[0], v2[1] - v1[1]
                        seg_len2 = dx * dx + dy * dy
                        t = 0.0 if seg_len2 == 0 else ((cx - v1[0]) * dx + (cy - v1[1]) * dy) / seg_len2
                        best = (d, bi, k, t, (cx, cy))
            if best is not None:
                d, bi, k, t, point = best
                pending.append((bi, k, t, point, d, regions[ai]["localId"]))

    report = []
    by_region = {}
    for entry in pending:
        by_region.setdefault(entry[0], []).append(entry)

    for bi, entries in by_region.items():
        # Ascending by (segment index, position along it) so a running
        # offset accounts for every earlier insertion into the SAME ring
        # without re-deriving indices from a ring that has already grown.
        entries.sort(key=lambda e: (e[1], e[2]))
        offset = 0
        for _bi, k, _t, point, d, source_id in entries:
            insert_at = k + 1 + offset
            regions[bi]["ring"].insert(insert_at, [round(point[0], 1), round(point[1], 1)])
            offset += 1
            report.append({
                "intoRegionId": regions[bi]["localId"],
                "atIndex": insert_at,
                "point": [round(point[0], 1), round(point[1], 1)],
                "fromRegionId": source_id,
                "distancePx": round(d, 2),
            })

    report.sort(key=lambda e: -e["distancePx"])
    return report


def dedupe_self_duplicates(regions, tolerance_px=DEFAULT_SELF_DUPLICATE_TOLERANCE_PX):
    """Removes a vertex that sits within `tolerance_px` of its own
    immediate neighbour in the SAME ring -- a redundant point (an
    accidental double-click, or the far end of a drag that barely moved),
    not a border disagreement between two shapes, which is why this is a
    separate pass from cluster_and_snap rather than a special case of it.

    Never removes below 3 points -- a ring that would collapse further is
    left with its smallest remaining duplicate rather than broken.
    Mutates rings in place. Returns `{regionId, removedCount}` entries for
    every ring that actually lost a point.
    """
    report = []
    for region in regions:
        ring = region.get("ring") or []
        if len(ring) < 4:
            continue
        kept = [ring[0]]
        for p in ring[1:]:
            if _dist(kept[-1], p) > tolerance_px:
                kept.append(p)
        # the ring is a CYCLE -- the last kept point and the first must be
        # checked against each other too, or a seam at index 0 is missed.
        while len(kept) > 3 and _dist(kept[-1], kept[0]) <= tolerance_px:
            kept.pop()
        if len(kept) < 3:
            continue
        removed = len(ring) - len(kept)
        if removed:
            region["ring"][:] = kept
            report.append({"regionId": region["localId"], "removedCount": removed})
    return report
