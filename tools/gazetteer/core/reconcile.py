"""Keep the region layer tessellating as Ingram keeps drawing more of it.

Ingram, 2026-09-13: "I will be drawing boundaries as accurately as possible,
so treat my region points as key and adjust other things around those...
Don't just do it this once, build a protocol for doing this again and
again." Drawing a precise new region (an airfield, a compound) on top of
ground that used to just be part of one bigger, coarser region (Island
Centre, The Landing End) is the normal way this map grows -- but it leaves
both shapes on the map at once, overlapping, until something goes back and
trims the coarser one to give way. `core/containment.py` already copes with
this gracefully for BUILDINGS (smallest-area region wins a centroid tie, see
its own docstring); this is the same rule run region-against-region, applied
as a real, repeatable protocol rather than a one-off cleanup.

**The rule: the smaller region is the more specific answer, always.**
Wherever a smaller region's polygon overlaps a bigger one, the smaller
region is left exactly as Ingram drew it -- never moved, never merged away
-- and the overlap is subtracted from the bigger one. A region that is the
smaller party in one pair and the bigger party in another (a chain) has
every smaller overlapping neighbour subtracted from its CURRENT shape, not
its original one, and regions are settled smallest-first for exactly that
reason: by the time a region is used to cut something bigger, its own
shape is already final.

**Merge and simplify, per Ingram's own instruction, when a trim would
otherwise split a region into disconnected pieces:** every piece but the
largest is checked against the smaller regions that caused the split, and
handed to whichever one of them it actually borders -- Ingram's new
airfield severing a corner of an old district does not leave that corner
orphaned, it grows the airfield by exactly that corner, because the corner
was only ever cut loose BY the airfield's own boundary. Only the genuinely
unclaimable case -- a piece that borders none of the regions that caused
the split, which real hand-drawn geometry essentially never produces -- is
left `unresolved` for a person to look at, per `location.schema.json`'s own
rule that a region is never a second disjoint part.

Pure: shapely for the geometry, no I/O, no server, no georeference. Only
region-tier items with polygon geometry are ever touched; every site,
point, and non-polygon region passes through completely unchanged. The
server layer (`_api_regions_reconcile`) is what actually calls this against
a live session and syncs any already-promoted region's file to match --
see its own docstring for that half.
"""

from __future__ import annotations

from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

from .containment import PROXIMATE_TOLERANCE_PX

#: Overlaps smaller than this are the rounding noise a hand-drawn shared
#: border always has (coverage.py's own sliver floor) -- not worth
#: rewriting a region's geometry over.
MIN_OVERLAP_PX2 = 100.0

#: When subtracting every smaller neighbour at once splits a region into
#: more than one piece, the largest piece is always kept; every other piece
#: is merged into whichever neighbour it borders (see module docstring).
#: This fraction only controls when a piece is small enough to not even
#: bother reporting as a merge -- true grazing-corner noise (18 to ~8,000
#: px2 in this session's own first real case) folds into its neighbour
#: silently, while anything bigger is still merged, just reported.
NEGLIGIBLE_PIECE_FRACTION = 0.02

#: How wide a hairline `bisect_region` buffers its cut line out to before
#: subtracting it, in image px. Two orders of magnitude below
#: MIN_OVERLAP_PX2 (a 0.01px-wide strip has to run 10,000px long before it
#: covers 100px2) so the sliver it removes is never mistakable for real
#: ground, only large enough to make the cut a genuine DIFFERENCE rather
#: than a knife-edge shapely.ops.split can decline to recognise.
BISECT_KERF_PX = 0.01


def _polygon(item):
    geom = item.get("geometry") or {}
    if geom.get("kind") != "polygon":
        return None
    ring = geom.get("ringPx") or []
    if len(ring) < 3:
        return None
    holes = geom.get("holesPx") or []
    try:
        poly = Polygon(ring, holes or None)
    except Exception:
        return None
    if not poly.is_valid:
        poly = poly.buffer(0)
    return poly if poly.area > 0 else None


def _ring_from(coords):
    pts = list(coords)
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return [[round(x, 1), round(y, 1)] for x, y in pts]


def _rings_from_polygon(poly):
    """A shapely Polygon back to this codebase's own (ringPx, holesPx)
    shape -- open rings, no repeated closing vertex, matching every
    hand-authored region already on disk."""
    shell = _ring_from(poly.exterior.coords)
    holes = [_ring_from(interior.coords) for interior in poly.interiors]
    return shell, holes


def _ranked_neighbours_for(piece, candidates):
    """Every one of `candidates` ({id: polygon}) a severed `piece` sits
    within touching distance of, ranked by how much of the piece's own
    boundary that candidate shares -- most-touching first. Empty if it
    borders none of them.

    Ranked rather than a single best, because "within touching distance"
    (see PROXIMATE_TOLERANCE_PX) is not the same as "the union of the two
    is actually one connected piece" -- regions.py's own defragment()
    documents the real bug in trusting that jump: coming within snap
    distance across a hairline gap merges the shapes into a fragment that
    is STILL two pieces, just now attributed to the wrong owner. The
    caller walks this list and takes the first candidate whose union with
    the piece is genuinely whole."""
    touch_ring = piece.boundary.buffer(PROXIMATE_TOLERANCE_PX)
    scored = []
    for cid, poly in candidates.items():
        shared = touch_ring.intersection(poly.buffer(PROXIMATE_TOLERANCE_PX))
        if not shared.is_empty and shared.area > 0:
            scored.append((shared.area, cid))
    scored.sort(reverse=True)
    return [cid for _area, cid in scored]


def trim_overlapping_regions(items, *, min_overlap_px2=MIN_OVERLAP_PX2):
    """Return (new_items, report). `items` is a whole draft's items list;
    only region-tier polygons that actually change come back replaced --
    everything else, sites and points included, comes back unchanged (by
    identity, not just by value, so a caller can diff cheaply).

    `report`: `trimmed` (localId -> px2 subtracted), `merged` (localId ->
    {into_localId: px2 handed over} for a piece too big to call noise),
    `unresolved` (localId -> the smaller localIds that overlap it but left
    a piece that borders none of them -- real hand-drawn geometry should
    essentially never produce this).
    """
    regions = [it for it in items if it.get("tier") == "region"]
    original = {}
    for it in regions:
        poly = _polygon(it)
        if poly is not None:
            original[it["localId"]] = poly

    by_area = sorted(original.items(), key=lambda kv: kv[1].area)

    # Every OTHER region strictly smaller than a given one, by ORIGINAL
    # size, that overlaps it by more than the noise floor -- decided once,
    # up front, against original shapes. Which regions are IN this
    # relationship never changes; only their exact current shape does, as
    # smaller ones settle before the bigger ones that cut against them.
    smaller_overlapping = {local_id: [] for local_id, _ in by_area}
    for i, (small_id, small_poly) in enumerate(by_area):
        for big_id, big_poly in by_area[i + 1:]:
            if not small_poly.intersects(big_poly):
                continue
            if small_poly.intersection(big_poly).area >= min_overlap_px2:
                smaller_overlapping[big_id].append(small_id)

    current = dict(original)  # settles smallest-first as the loop proceeds
    trimmed, merged, unresolved = {}, {}, {}

    for big_id, _ in by_area:
        neighbour_ids = smaller_overlapping.get(big_id) or []
        if not neighbour_ids:
            continue
        neighbours = {nid: current[nid] for nid in neighbour_ids}
        before = current[big_id]
        result = before.difference(unary_union(list(neighbours.values())))

        if result.is_empty:
            unresolved[big_id] = neighbour_ids
            continue

        parts = list(result.geoms) if result.geom_type == "MultiPolygon" else [result]
        parts.sort(key=lambda p: -p.area)
        main, extras = parts[0], parts[1:]

        for piece in extras:
            placed = False
            for candidate in _ranked_neighbours_for(piece, neighbours):
                joined = unary_union([neighbours[candidate], piece]).buffer(0)
                if joined.geom_type == "MultiPolygon":
                    # Within touching distance is not the same as touching
                    # -- across a hairline gap this "merge" would just be
                    # two pieces wearing one id. Try the next candidate.
                    continue
                neighbours[candidate] = joined
                if piece.area / before.area > NEGLIGIBLE_PIECE_FRACTION:
                    merged.setdefault(big_id, {})[candidate] = (
                        merged.get(big_id, {}).get(candidate, 0) + round(piece.area, 1))
                placed = True
                break
            if not placed:
                # Should not happen often -- a piece cut loose BY these
                # neighbours normally borders at least one of them cleanly.
                # Left for a person rather than attached back arbitrarily.
                unresolved.setdefault(big_id, []).append(
                    "unclaimed fragment (%s px2)" % round(piece.area))

        for nid, poly in neighbours.items():
            current[nid] = poly
        current[big_id] = main
        trimmed[big_id] = round(before.area - main.area, 1)

    out = []
    for it in items:
        local_id = it.get("localId")
        if local_id in current and current[local_id] is not original.get(local_id):
            shell, holes = _rings_from_polygon(current[local_id])
            it = dict(it)
            it["geometry"] = dict(it["geometry"], ringPx=shell, holesPx=holes)
        out.append(it)

    return out, {"trimmed": trimmed, "merged": merged, "unresolved": unresolved}


class MergeError(ValueError):
    """The requested regions cannot be merged as given."""


def merge_regions(items, local_ids):
    """Ingram, 2026-09-13: "shift clicking on both regions and using a
    'merge' button makes the most sense" -- combine two or more selected
    region-tier items into one, by geometric union.

    Returns (new_items, survivor_local_id): `survivor_local_id` is whichever
    ONE of `local_ids` keeps its identity afterward, and every other
    selected item is dropped from the returned list outright -- once merged
    they are the same ground, and a region is small enough that keeping a
    second, now-redundant draft note or lore entry around serves nobody.

    Raises MergeError, never silently, for either way this can go wrong:
    the regions do not actually share a border (their union is not one
    connected piece -- the same MultiPolygon check the trim-and-merge loop
    above already relies on), or more than one of them is already promoted
    with its own real written lore, which would otherwise mean silently
    discarding one person's writing to keep the other's.
    """
    by_id = {it["localId"]: it for it in items}
    targets = []
    for lid in local_ids:
        it = by_id.get(lid)
        if it is None:
            raise MergeError("no item %r in this session" % lid)
        if it.get("tier") != "region":
            raise MergeError("%r is not a region" % lid)
        targets.append(it)
    if len(targets) < 2:
        raise MergeError("need at least two regions to merge")

    promoted = [t for t in targets if t.get("locationRef")]
    if len(promoted) > 1:
        raise MergeError(
            "more than one of these is already promoted with its own written "
            "lore (%s) -- merging would have to silently pick one's writing "
            "over the other's, so this refuses instead" %
            ", ".join(t["locationRef"] for t in promoted))

    polys = []
    for t in targets:
        poly = _polygon(t)
        if poly is None:
            raise MergeError("%r has no usable polygon geometry" % t["localId"])
        polys.append(poly)

    merged = unary_union(polys).buffer(0)
    if merged.geom_type == "MultiPolygon":
        raise MergeError(
            "these regions do not actually share a border -- merging them "
            "would produce two disconnected pieces wearing one id")

    survivor_id = promoted[0]["localId"] if promoted else targets[0]["localId"]
    shell, holes = _rings_from_polygon(merged)
    removed_ids = {t["localId"] for t in targets} - {survivor_id}

    new_items = []
    for it in items:
        if it["localId"] == survivor_id:
            it = dict(it, geometry=dict(it["geometry"], ringPx=shell, holesPx=holes))
        elif it["localId"] in removed_ids:
            continue
        new_items.append(it)
    return new_items, survivor_id


class BisectError(ValueError):
    """The requested cut does not split this region into two."""


def bisect_region(items, local_id, cut_points, new_local_id):
    """Ingram, 2026-09-13: "draw a line from one point on an existing line
    and then describe a complex line and then terminate it on another
    region's line... to split an existing region into two." `cut_points`
    is the drawn line, image-px, in order -- as complex or as straight as
    the two ends and whatever is drawn between them; both ends need to
    land on (or very close to) the target region's own boundary, or there
    is nothing for shapely to divide.

    The larger of the two resulting pieces keeps the original item's
    identity entirely (name, note, locationRef, every cross-reference) --
    only its geometry changes. The smaller piece becomes a brand-new,
    completely blank draft region at `new_local_id` (a real name/note is
    for Ingram to write, the same as any other freshly-drawn region),
    never a copy of the original's lore, which almost never describes
    both halves once the cut is real.

    Refuses rather than guesses when the cut does not actually produce
    two pieces -- not on the region's own boundary at both ends, glancing
    off it without truly crossing, or crossing more than once each way
    (which needs `new_local_id` for a THIRD piece this function does not
    invent one for).
    """
    by_id = {it["localId"]: it for it in items}
    target = by_id.get(local_id)
    if target is None:
        raise BisectError("no item %r in this session" % local_id)
    if target.get("tier") != "region":
        raise BisectError("%r is not a region" % local_id)
    poly = _polygon(target)
    if poly is None:
        raise BisectError("%r has no usable polygon geometry" % local_id)
    if len(cut_points) < 2:
        raise BisectError("a cut needs at least two points")

    from shapely.geometry import LineString

    # Snap each end onto the boundary if it is already close -- the same
    # tolerance PROXIMATE_TOLERANCE_PX already uses for "is this actually
    # touching" -- so a cut drawn a hair short of the edge (an entirely
    # ordinary amount of residue for a real snapped click to carry) still
    # reads as landing exactly on it. A point well outside tolerance is
    # left alone; the intersects check below refuses it same as ever.
    points = [list(p) for p in cut_points]
    for i in (0, -1):
        p = Point(points[i])
        if poly.exterior.distance(p) <= PROXIMATE_TOLERANCE_PX:
            snapped = poly.exterior.interpolate(poly.exterior.project(p))
            points[i] = [snapped.x, snapped.y]

    line = LineString(points)
    if not line.intersects(poly):
        raise BisectError("this line does not cross %r at all" % local_id)

    # shapely.ops.split, tried first, turned out to need the line's ends to
    # touch the boundary at a precision tighter than the snap above can
    # promise -- found live, it silently returned the WHOLE region
    # unchanged for a real cut whose endpoint was a few hundredths of a
    # pixel off. Cutting by DIFFERENCE against the line buffered out to a
    # hairline sliver is the same technique trim_overlapping_regions
    # already relies on elsewhere in this module, and is robust to exactly
    # that residue: the sliver itself is far too thin to matter against any
    # region worth drawing (BISECT_KERF_PX is two orders of magnitude
    # below the smallest overlap this module ever acts on).
    kerf = line.buffer(BISECT_KERF_PX, cap_style=2)
    result = poly.difference(kerf)
    parts = [g for g in getattr(result, "geoms", [result])
            if g.geom_type == "Polygon" and g.area > BISECT_KERF_PX]
    if len(parts) < 2:
        raise BisectError(
            "this line does not actually divide the region into two pieces -- "
            "both ends need to land on (or very close to) its own boundary")
    if len(parts) > 2:
        raise BisectError(
            "this line divides the region into %d pieces, not two -- a "
            "bisecting cut may only cross the boundary at its two ends" % len(parts))

    parts.sort(key=lambda p: -p.area)
    survivor_shell, survivor_holes = _rings_from_polygon(parts[0])
    new_shell, new_holes = _rings_from_polygon(parts[1])

    survivor = dict(target,
                    geometry=dict(target["geometry"], ringPx=survivor_shell, holesPx=survivor_holes))
    new_item = {
        "localId": new_local_id, "tier": "region", "name": "", "kind": target.get("kind") or "",
        "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
        "geometry": {"kind": "polygon", "ringPx": new_shell, "holesPx": new_holes},
        "derived": {},
    }

    new_items = [survivor if it["localId"] == local_id else it for it in items]
    new_items.append(new_item)
    return new_items, survivor["localId"], new_local_id
