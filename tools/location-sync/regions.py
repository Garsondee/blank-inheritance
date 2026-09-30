"""Deploy regions that tile the whole sheet, seeded from the real city.

The decision this implements (2026-09-11): "Region tessellation. I don't want
voids on the map or overlaps. Every building is going to belong to a region by
the end." And then (2026-09-12): "Can you actually deploy some regions? You
could even base them off real regions of that area of the map?"

Both halves matter and they pull in opposite directions, so here is how they
are reconciled.

WHERE THE BOUNDARIES COME FROM -- a Voronoi tessellation of seed points, which
is gapless and non-overlapping by construction rather than by inspection.
Drawing districts by hand and then checking them produces slivers for as long
as anyone is willing to keep checking; a partition that cannot have a hole in
it is a different kind of object. Each cell is then clipped to land or to
water, and those two clip masks come from tools/gazetteer/landmask.py, which
reads the painted map. The land cells tile the land exactly and the water
cells tile the water exactly, so together they tile the sheet.

WHERE THE SEEDS COME FROM -- the real city where it has anything to say, and a
lattice where it does not. A boundary drawn between two real place centres
falls where a real boundary falls: along the ridge, the railway, the river, the
thing that put the two settlements in different places to begin with. Three
sources are read, because each covers a different part of this sheet: `place`
nodes, stations, and clusters of `addr:neighbourhood`.

Be clear about how far that reaches, because it is less far than it sounds.
136 real place centres land on this sheet and they occupy **25 distinct square
kilometres between them, with 32 of them inside one of those** -- OSM's address
coverage here is dense in a few housing estates and absent everywhere else.
Thinned to district spacing, that yields about ten usable anchors. The
remaining two thirds of the map -- the uplands, the reclaimed platforms, the
open sea -- has no real structure to borrow and is filled with a hexagonal
lattice. The result is genuinely anchored on the real city in the populated
core and is honestly arbitrary in the hills, and it is worth knowing which is
which rather than believing the whole thing is grounded.

WHAT IS NOT TAKEN FROM THE REAL CITY -- the coastline, the names, and any
opinion about what the ground is like.

The coastline is refused on Ingram's own instruction: "the map I've drawn isn't
the same as the real data, there's a missing airport and I've changed a large
island into a smaller fort." A tessellation clipped to OSM's coast would put
districts on an airport that is under water here. So the mask is read off the
painting, by tools/gazetteer/landmask.py.

The names are refused because of the hard wall in the plan: real-world names
are research, never canon, and none may reach player-facing text. What this
writes is a placeholder handle -- "district C4.11" -- with the real place name
filed under `provenance.realWorldSeed`, clearly labelled as research, and never
in `name` or `note`. Naming them properly is a conversation, not a function.

The opinion is refused because it was measured and it was wrong; see the note
above `_provisional_label` for the four attempts and why none of them worked.

    python tools/gazetteer/regions.py              # report, write nothing
    python tools/gazetteer/regions.py --write      # add to the live session
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys

from shapely.geometry import MultiPoint, Point, box
from shapely.ops import unary_union

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import landmask  # noqa: E402
from core import georef as georef_mod  # noqa: E402
from core import grid, session  # noqa: E402

#: Spacing between land seeds, in image px (= metres). Measured on the real
#: sheet: 1,500 m gives 34 districts with a median area of 2.59 km2, about
#: 1.6 km across -- somewhere a person could walk the length of in twenty
#: minutes, which is the scale the plan's "each with its own flavour" is
#: pitched at. Smaller and the set stops being nameable; larger and a district
#: stops having one character.
LAND_SPACING_PX = 1500

#: The sea gets far fewer, far larger regions. Open water has no interior
#: structure to name and chopping it into a dozen cells would be tessellation
#: for its own sake -- what is wanted is the handful of named waters a harbour
#: city actually distinguishes: the roads, the approaches, the basins. 5,000 m
#: gives six on this sheet (0.6, 1.7, 4.5, 4.7, 20 and 30 km2), which is that
#: shape: two open seas, two approaches, two inner basins.
WATER_SPACING_PX = 5000

#: A real neighbourhood needs at least this many tagged features before its
#: centroid is trusted as the centre of anything. One tagged vending machine
#: is not a district.
MIN_NEIGHBOURHOOD_FEATURES = 3

#: Land parts smaller than this get no seed of their own and are absorbed by
#: whichever region is nearest. In square metres.
MIN_SEEDED_PART_M2 = 150000.0

#: A fragment under this size is not worth a region of its own even when it
#: has nowhere of its own domain to go, so it joins whatever it touches --
#: land or water. Real case: a 679 m2 dock puddle inside the fortress island,
#: part of the sea until a region boundary cut it off from the rest of it,
#: with no water neighbour left to rejoin. Filed as part of the wharf district
#: it sits in, which is both true and useful; left alone it was a region with
#: no area, a name to write, and nothing in it.
MIN_REGION_M2 = 5000.0

#: Holes smaller than this are not lagoons, they are arithmetic. Every boolean
#: operation on real polygons leaves a scatter of degenerate rings; one came
#: out of this build as a three-point hole of 0.0001 m2 sitting in a southern
#: suburb. Filling it back in changes the region's area by a ten-thousandth of
#: a square metre -- four orders of magnitude below coverage.py's own noise
#: floor -- and saves whoever edits that district later from finding a
#: triangle they cannot see and cannot delete.
MIN_HOLE_M2 = 1.0


class Seed:
    """One region's origin point, and what is known about it."""

    def __init__(self, x, y, domain, label, real_name=None, weight=0):
        self.x = float(x)
        self.y = float(y)
        self.domain = domain            # "land" or "water"
        self.label = label
        self.real_name = real_name      # research only, never player-facing
        self.weight = weight

    def __repr__(self):
        return "Seed(%s %.0f,%.0f %r)" % (self.domain, self.x, self.y, self.label)


# --- seeds from the real city -------------------------------------------------

#: Where a real place centre can be read from, most to least authoritative.
#: Order is the thinning priority: where two are too close together to both be
#: districts, the one from the earlier source survives.
#:
#: All three are needed because each covers a different part of this sheet and
#: none covers it alone -- measured, not assumed: `place` nodes run x 4481 to
#: 8969 (the centre and the south), stations x 3137 to 9510 and as far north as
#: y 520, `addr:neighbourhood` only the south-west, where it is dense.
#:
#: Stations earn their place above address clusters on the geography rather
#: than the data: a Japanese city organises itself around its stations, and the
#: catchment of one is very close to what a district means here.
PLACE_SOURCES = (
    # (tag, accepted values or None for any, group-by-name, priority weight)
    ("place", ("neighbourhood", "quarter", "suburb", "island", "locality"),
     False, 3000),
    ("public_transport", ("station",), False, 2000),
    ("addr:neighbourhood", None, True, 0),
)


def real_place_seeds(conn, georef, extent=None,
                     min_features=MIN_NEIGHBOURHOOD_FEATURES):
    """Every real place centre that lands on the sheet, in priority order.

    Grouped sources (address tags) are averaged over every feature carrying the
    name and weighted by how many there are; ungrouped sources (a `place` node,
    a station) are one seed each at a fixed high weight. The weight is only
    ever a thinning priority -- nothing downstream reads it as a measurement.
    """
    x0, y0, x1, y1 = extent or landmask.DEFAULT_EXTENT
    seeds = []
    claimed = set()

    for tag, values, grouped, base_weight in PLACE_SOURCES:
        groups = {}
        singles = []
        cur = conn.execute(
            "SELECT tags, geom FROM feature WHERE tags LIKE ?",
            ('%"' + tag + '"%',))
        for tags_raw, geom_blob in cur:
            try:
                tags = json.loads(tags_raw) if tags_raw else {}
            except (TypeError, ValueError):
                continue
            value = tags.get(tag)
            if not value or geom_blob is None:
                continue
            if values is not None and value not in values:
                continue
            point = _blob_centroid_px(geom_blob, georef)
            if point is None:
                continue
            px, py = point
            if not (x0 <= px < x1 and y0 <= py < y1):
                continue
            # No fallback to the tag VALUE. An unnamed station recorded as
            # `realWorldSeed: "station"` is not research, it is noise wearing
            # research's clothes -- it tells a later reader nothing except
            # that something was looked up. A seed with no real name simply
            # has no real name.
            name = tags.get("name") or tags.get("name:en") or None
            if grouped:
                acc = groups.setdefault(value, [0, 0.0, 0.0])
                acc[0] += 1
                acc[1] += px
                acc[2] += py
            else:
                singles.append((name, px, py))

        for name, px, py in singles:
            key = (name or value, round(px, -1), round(py, -1))
            if key in claimed:
                continue
            claimed.add(key)
            seeds.append(Seed(px, py, "land", label=None, real_name=name,
                              weight=base_weight))
        for value, (count, sx, sy) in groups.items():
            if count < min_features:
                continue
            seeds.append(Seed(sx / count, sy / count, "land", label=None,
                              real_name=value, weight=base_weight + count))

    seeds.sort(key=lambda s: -s.weight)
    return seeds


#: Kept as the old name for callers and tests written against it.
neighbourhood_seeds = real_place_seeds


def _blob_centroid_px(blob, georef):
    """Image-pixel centroid of one gpkg geometry blob.

    A mean of the ring vertices rather than a true centroid: a neighbourhood
    seed only has to be somewhere sensible inside its own neighbourhood, and
    the mean is cheap over 230,000 features and never lands outside a convex
    footprint.
    """
    from core import groundtruth   # pulls in citymap.store.gpkg via its path

    try:
        geom, _srid = groundtruth.gpkg.unpack_gpb(blob)
        rings = groundtruth.geom_to_image_rings(geom, georef)
    except Exception:                                    # noqa: BLE001
        return None
    points = [p for ring in (rings or []) for p in ring]
    if not points:
        return None
    return (sum(p[0] for p in points) / len(points),
            sum(p[1] for p in points) / len(points))


# --- thinning and filling -----------------------------------------------------

def thin(seeds, min_sep_px):
    """Greedy: keep a seed only if nothing already kept is within min_sep_px.

    Input order is the priority order, so callers sort first. Greedy rather
    than a proper relaxation because the result only has to be well spread,
    not optimal, and a deterministic answer is worth more here than a slightly
    better one.
    """
    kept = []
    sep2 = min_sep_px * min_sep_px
    for seed in seeds:
        if all((seed.x - k.x) ** 2 + (seed.y - k.y) ** 2 >= sep2 for k in kept):
            kept.append(seed)
    return kept


def lattice_fill(region_geom, existing, spacing_px, domain, extent=None):
    """Seeds on a staggered lattice wherever `existing` leaves a hole.

    Staggered rather than square: a square lattice of Voronoi seeds produces
    square regions in rows, which reads as a survey grid rather than as a
    place. Offsetting alternate rows by half a step gives hexagons, which at
    least look like they grew.
    """
    x0, y0, x1, y1 = extent or landmask.DEFAULT_EXTENT
    step = float(spacing_px)
    row_step = step * math.sqrt(3) / 2
    # A hair under step^2, and the hair is load-bearing. In a true hex lattice
    # the nearest-neighbour distance IS exactly `step`, so an exact comparison
    # rejects every staggered row against the one above it -- and it did:
    # written with 0.866 as the row factor, every other row was deleted in
    # full and the lattice quietly produced half the seeds it was asked for,
    # giving districts of twice the intended area.
    sep2 = step * step * (1 - 1e-9)
    added = []
    kept = list(existing)

    row = 0
    y = y0 + row_step / 2
    while y < y1:
        offset = (step / 2) if (row % 2) else 0.0
        x = x0 + step / 2 + offset
        while x < x1:
            point = Point(x, y)
            if region_geom.contains(point):
                if all((x - k.x) ** 2 + (y - k.y) ** 2 >= sep2 for k in kept):
                    seed = Seed(x, y, domain, label=None)
                    kept.append(seed)
                    added.append(seed)
            x += step
        y += row_step
        row += 1
    return added


def seed_unclaimed_parts(region_geom, existing, domain,
                         min_area_px2=MIN_SEEDED_PART_M2):
    """One seed per sizeable part of `region_geom` that holds none.

    Without this, an island whose whole area fell between lattice points gets
    absorbed into a mainland region on the other side of a strait. The
    tessellation is still gapless -- it is just wrong about what a district is.
    """
    added = []
    for part in getattr(region_geom, "geoms", [region_geom]):
        if part.area < min_area_px2:
            continue
        if any(part.contains(Point(s.x, s.y)) for s in existing):
            continue
        anchor = part.representative_point()
        seed = Seed(anchor.x, anchor.y, domain, label=None)
        existing = list(existing) + [seed]
        added.append(seed)
    return added


# --- the tessellation ---------------------------------------------------------

def tessellate(seeds, clip_geom, extent=None):
    """[(seed, polygon)] -- Voronoi cells of `seeds`, clipped to `clip_geom`.

    The cells partition the plane, so intersecting them with one mask yields
    pieces that union back to exactly that mask: no gap can appear that was not
    already in the mask, and no two pieces can overlap because no two Voronoi
    cells do. That is the whole reason for building it this way instead of
    drawing boundaries.
    """
    from shapely import voronoi_polygons

    if not seeds:
        return []
    extent = extent or landmask.DEFAULT_EXTENT
    sheet = box(*extent)
    points = MultiPoint([(s.x, s.y) for s in seeds])
    # extend_to keeps the outer cells finite; ordered keeps cell i with seed i,
    # which matters because two seeds can share a cell boundary exactly.
    cells = voronoi_polygons(points, extend_to=sheet, ordered=True)

    out = []
    for seed, cell in zip(seeds, cells.geoms):
        piece = _robust_intersection(
            _robust_intersection(cell, sheet), clip_geom)
        if piece is None or piece.is_empty or piece.area <= 0:
            continue
        out.append((seed, piece.buffer(0)))
    return out


def _robust_intersection(a, b):
    """a AND b, surviving GEOS's occasional refusal to do it.

    Real coastlines produce inputs that GEOS's overlay can fail on outright --
    "TopologyException: unable to assign free hole to a shell" came out of one
    particular arrangement of Voronoi cell against the painted shore, and it
    killed the whole build rather than one region. The two standard remedies
    are applied in order: buffer(0) to renoded both operands, then a snapped
    overlay at a millimetre grid. Only if both fail is the piece given up, and
    then it is given up rather than silently returned wrong.
    """
    from shapely import intersection as shp_intersection
    from shapely.errors import GEOSException

    if a is None or b is None:
        return None
    try:
        return a.intersection(b)
    except GEOSException:
        pass
    try:
        return a.buffer(0).intersection(b.buffer(0))
    except GEOSException:
        pass
    try:
        return shp_intersection(a.buffer(0), b.buffer(0), grid_size=0.001)
    except GEOSException:
        return None


# --- what a region is, and what this refuses to guess ------------------------
#
# There used to be a `character_at` here that read the painted map around a
# region and reported "wooded upland" / "upland" / "built-up" / "reclaimed
# flat". It is gone, and the reason is worth keeping.
#
# It never worked. Four successive versions were tried against the real sheet
# -- fractions of dark and bright pixels, then median brightness, then median
# brightness plus mean saturation, then all of that sampled across the whole
# polygon instead of a window at the seed. Each fixed the previous version's
# worst case and produced a new one. The final attempt called The High Ridges
# (bare mountain crests) "built-up", called the densest city grid on the sheet
# "upland", and got the open sea and the sheltered basin the wrong way round.
#
# The reason is not tuning. A hillshaded bare ridge and a painted city block
# occupy the same brightness and the same saturation, because a hillshade is
# doing to rock exactly what roofs and roads do to a street plan. There is no
# threshold that separates them, and the measurements say so.
#
# So this module no longer claims to know. `domain` -- land or water -- comes
# from tools/gazetteer/landmask.py, which is measured, tested, and verified by
# eye against the painting, and that is the one thing it does assert. What a
# district is LIKE is a sentence somebody writes after looking at it, and
# `note` is where it goes.
#
# The general rule this is an instance of: a field that is confidently wrong
# is worse than a field that is absent, because the absent one gets looked up
# and the wrong one gets believed.

# --- putting it together ------------------------------------------------------

def build(land, water, conn=None, georef=None, image=None,
          land_spacing=LAND_SPACING_PX, water_spacing=WATER_SPACING_PX,
          extent=None):
    # `image` is accepted and unused. It stays in the signature because the
    # CLI opens the painted map for other reasons and callers pass it; see the
    # note above for why nothing here reads colour any more.
    """Every region, as (seed, polygon) pairs across both domains."""
    extent = extent or landmask.DEFAULT_EXTENT

    land_seeds = []
    if conn is not None and georef is not None:
        land_seeds = thin(neighbourhood_seeds(conn, georef, extent=extent),
                          land_spacing)
        # A neighbourhood centre that has ended up in the water is a place the
        # painted map has taken away -- the sunken airport, the shrunken
        # island. Dropping it is the map winning the argument, which is right.
        land_seeds = [s for s in land_seeds if land.contains(Point(s.x, s.y))]

    land_seeds += lattice_fill(land, land_seeds, land_spacing, "land",
                               extent=extent)
    land_seeds += seed_unclaimed_parts(land, land_seeds, "land")

    water_seeds = lattice_fill(water, [], water_spacing, "water", extent=extent)
    water_seeds += seed_unclaimed_parts(water, water_seeds, "water")

    pairs = (tessellate(land_seeds, land, extent=extent)
             + tessellate(water_seeds, water, extent=extent))
    # Defragment, absorb, and then defragment again until nothing is in
    # pieces. One pass is not enough: absorbing a landlocked pond into the
    # district around it can leave that district in two pieces where the pond
    # touched its edge, and a second piece is a second dropped ring, which is
    # a 0.58 km2 void in the middle of the city. Measured, not hypothetical --
    # the first version left exactly one, and coverage.py found it.
    for _ in range(6):
        pairs = defragment(pairs)
        pairs, absorbed = absorb_inland_water(pairs)
        if not absorbed and not any(
                len(getattr(p, "geoms", [p])) > 1 for _s, p in pairs):
            break
    pairs = defragment(pairs)

    for index, (seed, poly) in enumerate(pairs, start=1):
        if not seed.label:
            seed.label = _provisional_label(seed, poly, index)
    return pairs


def _provisional_label(seed, poly, index):
    """A handle, not a name. Naming is a conversation -- see the docstring.

    A seed that lands outside the gridded content area gets a plain index
    instead of a reference rather than bringing the build down. That happens
    for real: a region clipped to a sliver against the sheet edge can have its
    representative point fall in the margin, and losing the whole tessellation
    over the label on one of them would be absurd.
    """
    kind = "water" if seed.domain == "water" else "district"
    try:
        return "%s %s" % (kind, grid.image_px_to_ref(seed.x, seed.y))
    except grid.GridError:
        return "%s %d" % (kind, index)


def to_items(pairs, start_index, georef=None, session_note=""):
    """Session items, ready to be appended to a draft."""
    items = []
    for offset, (seed, poly) in enumerate(pairs):
        ring, holes = _rings(poly)
        if len(ring) < 3:
            continue
        note = session_note or ""
        # Six decimals, not the one decimal a hand-drawn shape is stored at.
        # Adjacent regions share edges exactly here, and rounding a vertex that
        # sits partway along a neighbour's straight side pushes it off that
        # side by up to half a rounding step -- which at 0.1 px over a 2 km
        # border is a 100 m2 sliver. Measured: 229 m2 of sliver at one decimal,
        # 2 m2 at three, none detectable at six. The extra digits are not
        # geography, they are topology.
        geometry = {"kind": "polygon",
                    "ringPx": [[round(x, 6), round(y, 6)] for x, y in ring]}
        if holes:
            geometry["holesPx"] = [[[round(x, 6), round(y, 6)] for x, y in hole]
                                   for hole in holes if len(hole) >= 3]
        item = session.make_item(
            "item-%d" % (start_index + offset),
            "region",
            geometry,
            note=note,
            name=seed.label,
            kind="water" if seed.domain == "water" else "district",
            tags=["auto-tessellated", seed.domain],
            source="drawn",
            depth="named",
        )
        # Machine facts go in their own field, NOT in the note. The note is
        # the brief -- core/depth.py reads it as the location's summary and
        # counts its words against the depth ceiling, so burying three lines
        # of provenance in it would put every generated region over budget
        # before anyone had written a word about the place.
        item["provenance"] = _seed_provenance(seed, poly)
        session.derive_item(item, georef=georef)
        items.append(item)
    return items


def defragment(pairs, snap_px=2.0, min_region_px2=MIN_REGION_M2):
    """Give every region one connected body, without losing any ground.

    A Voronoi cell clipped to a coastline routinely comes out in pieces: a
    water cell chopped into basins by a row of piers, a land cell cut by an
    inlet. Eleven of the first thirty-one regions did. That is fine as
    geometry and fatal as a session item, because an item carries one ring --
    so writing them would drop every piece but the biggest, and the dropped
    pieces are precisely the voids the tessellation exists to prevent.

    Keeping the largest part of each region and handing every other part to
    whichever same-domain neighbour shares the most boundary with it. Area is
    conserved exactly: nothing is discarded, it is re-attributed. A fragment
    that touches nothing stays its own region, because an island genuinely is
    one.
    """
    kept = []
    orphans = []
    for seed, poly in pairs:
        parts = sorted(getattr(poly, "geoms", [poly]), key=lambda p: -p.area)
        if not parts:
            continue
        kept.append([seed, parts[0]])
        orphans.extend((seed.domain, part) for part in parts[1:])

    for domain, orphan in orphans:
        probe = orphan.buffer(snap_px)
        candidates = []
        for entry in kept:
            # Same domain first, always. A fragment small enough not to
            # deserve its own region will fall through to the other domain
            # below rather than leaving a hole in the map.
            if entry[0].domain != domain and orphan.area >= min_region_px2:
                continue
            shared = entry[1].intersection(probe)
            if shared.is_empty:
                continue
            candidates.append((entry[0].domain == domain, shared.area, entry))
        candidates.sort(key=lambda c: (not c[0], -c[1]))

        placed = False
        for _same, _score, entry in candidates:
            merged = unary_union([entry[1], orphan]).buffer(0)
            # Only accept a host the fragment actually joins onto. Coming
            # within snap_px is not the same as touching, and merging into a
            # neighbour across a hairline just moves the fragment: the host
            # becomes two pieces, gets split again on the next pass, and the
            # two of them pass it back and forth forever while the piece stays
            # unrepresentable. Found by coverage.py reporting a stubborn
            # 0.58 km2 void that survived six passes.
            if len(getattr(merged, "geoms", [merged])) > 1:
                continue
            entry[1] = merged
            placed = True
            break

        if not placed:
            # Genuinely detached: its own region, because an island is one.
            anchor = orphan.representative_point()
            kept.append([Seed(anchor.x, anchor.y, domain, label=None), orphan])

    return [(seed, poly) for seed, poly in kept]


def absorb_inland_water(pairs, extent=None, snap_px=2.0):
    """Fold water regions that are landlocked into the land around them.

    A reservoir in the uplands and a pond behind a housing row come out of the
    tessellation as their own water regions, because they are water and they
    are not connected to the sea. Calling either a maritime region is wrong
    twice over: nobody sails from the reservoir to the bay, and the district
    around it obviously contains it.

    Landlocked is decided by what a body of water TOUCHES, not by whether some
    district strictly contains it. Containment was the first attempt and it
    does not survive contact with a tessellation -- a pond straddling the
    boundary between two districts is inside neither of them and is obviously
    still a pond. So: water that reaches the edge of the sheet is sea, water
    that touches other water is sea, and anything left joins whichever
    district holds the most of its shore.

    The asymmetry is the point, and it is why no size threshold is needed:
    enclosed water joins the land, and enclosed LAND never joins the sea,
    because an island in a basin is an island.
    """
    x0, y0, x1, y1 = extent or landmask.DEFAULT_EXTENT
    edge = box(x0, y0, x1, y1).exterior
    # Mutable rows so a land region can grow as ponds are folded into it.
    rows = [[seed, poly] for seed, poly in pairs]
    waters = [row for row in rows if row[0].domain == "water"]
    lands = [row for row in rows if row[0].domain == "land"]

    absorbed = []
    for row in waters:
        probe = row[1].buffer(snap_px)
        if probe.intersects(edge):
            continue                       # reaches the sheet edge: sea
        if any(other is not row and probe.intersects(other[1])
               for other in waters):
            continue                       # connected to other water: sea
        host = None
        best = 0.0
        for land_row in lands:
            shared = land_row[1].intersection(probe).area
            if shared > best:
                best, host = shared, land_row
        # And it has to be smaller than what is swallowing it. Without this
        # a bay with an island in it and no other water nearby gets absorbed
        # INTO the island, which is the right rule applied the wrong way up.
        # Relative, not a fixed size: a pond is always a fraction of its
        # district and a bay never is.
        if host is None or row[1].area >= host[1].area:
            continue
        host[1] = unary_union([host[1], row[1]]).buffer(0)
        absorbed.append(row)

    taken = {id(row) for row in absorbed}
    out = [(row[0], row[1]) for row in rows if id(row) not in taken]
    return out, len(absorbed)


def _rings(poly, min_hole_px2=MIN_HOLE_M2):
    """(exterior, [holes]) of the largest part, all as point lists.

    Holes below `min_hole_px2` are dropped -- see that constant for why.
    """
    from shapely.geometry import Polygon

    parts = sorted(getattr(poly, "geoms", [poly]), key=lambda p: -p.area)
    if not parts:
        return [], []
    biggest = parts[0]
    holes = [list(r.coords)[:-1] for r in biggest.interiors
             if Polygon(r).area >= min_hole_px2]
    return list(biggest.exterior.coords)[:-1], holes


def _outer_ring(poly):
    """The exterior of the single part a defragmented region should have."""
    parts = sorted(getattr(poly, "geoms", [poly]), key=lambda p: -p.area)
    if not parts:
        return []
    return list(parts[0].exterior.coords)[:-1]


def _seed_provenance(seed, poly):
    """Where this region came from. Never player-facing, never the note.

    Kept out of `note` deliberately. core/depth.py reads a draft item's note as
    its summary and counts the words against the depth ceiling, so three lines
    of machine provenance in there would put every generated region over budget
    before anybody had written a word about the place -- and would then be
    mistaken for the brief by whoever came to write one.
    """
    out = {
        "method": "voronoi-tessellation",
        "domain": seed.domain,
        "areaKm2": round(poly.area / 1e6, 3),
        "seedPx": [round(seed.x, 1), round(seed.y, 1)],
    }
    if seed.real_name:
        # Research only. The hard wall: no real-world name may reach `name`,
        # `note`, or anything a player sees.
        out["realWorldSeed"] = seed.real_name
        out["realWorldNote"] = ("Research only -- the real place whose centre "
                                "seeded this region. Not a name for it.")
    return out


# --- CLI ----------------------------------------------------------------------

def _open_sources():
    """(conn, georef, image) -- each None if that source is unavailable.

    `image` is always None. The tuple keeps its shape because callers and
    tests unpack three values; see the note at the end of this function.
    """
    conn = georef = image = None
    try:
        georef = georef_mod.MapGeoref.load()
    except Exception as exc:                             # noqa: BLE001
        print("georef unavailable (%s); regions will carry no lon/lat" % exc)
    citymap_dir = os.path.join(_HERE, "..", "city-map")
    if os.path.isdir(os.path.join(citymap_dir, "citymap")):
        sys.path.insert(0, os.path.abspath(citymap_dir))
    try:
        from core import groundtruth
        if groundtruth.store_exists():
            conn = groundtruth.open_store()
    except Exception as exc:                             # noqa: BLE001
        print("ground truth unavailable (%s); seeding from the lattice only"
              % exc)
    # The painted map itself is deliberately NOT opened here. It used to be,
    # to classify each region's terrain, and that classifier is gone (see the
    # note above `_provisional_label`). Decoding a 12400 x 12400 PNG to
    # produce a field nothing reads is a slow way to be wrong.
    return conn, georef, image


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true",
                        help="append the regions to the live session draft")
    parser.add_argument("--draft", default=None,
                        help="draft file to append to (default: the newest)")
    parser.add_argument("--land-spacing", type=int, default=LAND_SPACING_PX)
    parser.add_argument("--water-spacing", type=int, default=WATER_SPACING_PX)
    parser.add_argument("--rebuild-mask", action="store_true",
                        help="re-read the painted PNG instead of the cache")
    args = parser.parse_args(argv)

    if args.rebuild_mask or not os.path.exists(landmask.DEFAULT_CACHE):
        _mask, land, water = landmask.build()
    else:
        _mask, land, water = landmask.load()

    conn, georef, image = _open_sources()
    pairs = build(land, water, conn=conn, georef=georef, image=image,
                  land_spacing=args.land_spacing,
                  water_spacing=args.water_spacing)

    land_pairs = [p for p in pairs if p[0].domain == "land"]
    water_pairs = [p for p in pairs if p[0].domain == "water"]
    print("%d regions: %d land, %d water"
          % (len(pairs), len(land_pairs), len(water_pairs)))
    print("  seeded on a named real place: %d (the rest from the lattice)"
          % sum(1 for s, _ in pairs if s.real_name))
    for domain, group in (("land", land_pairs), ("water", water_pairs)):
        if not group:
            continue
        areas = sorted(p.area / 1e6 for _, p in group)
        print("  %-5s area km2: min %.2f  median %.2f  max %.2f"
              % (domain, areas[0], areas[len(areas) // 2], areas[-1]))

    if not args.write:
        print("\n(dry run -- pass --write to append to the session draft)")
        return pairs

    path = args.draft
    if path is None:
        drafts = session.list_drafts()
        if not drafts:
            raise SystemExit("no session draft to append to")
        path = session.draft_path(drafts[-1])
    draft = session.load(path)
    taken = {item["localId"] for item in draft["items"]}
    next_index = 1 + max(
        [int(i.split("-")[1]) for i in taken if i.startswith("item-")] or [0])

    items = to_items(pairs, next_index, georef=georef)
    draft["items"].extend(items)
    session.save(draft, path)
    print("\nappended %d regions to %s" % (len(items), os.path.basename(path)))
    return pairs


if __name__ == "__main__":
    main()
