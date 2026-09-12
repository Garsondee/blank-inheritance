"""Does the set of regions actually tessellate the map?

Regions are the one tier with a global invariant: they are meant to cover the
whole sheet, once each. Every other kind of location is free-standing, but a
region tessellation is only useful if it is complete and non-overlapping --
containment is derived by asking which region a point falls in, and that
question has no good answer where two regions overlap and no answer at all in
a gap.

So this reports the two failures directly:

  voids     ground no region claims. Every one is a building with no district.
  overlaps  ground two regions both claim. Every one is a building whose
            district depends on which way the tie is broken.

**The target is the painted sheet, not the real world.** Coverage is measured
against the campaign map's content rectangle and nothing else -- no landuse,
no coastline, no OSM. That is deliberate and it is what makes this safe: the
painted map has diverged from the ground truth under it on purpose (an
airport that is no longer there, a large island redrawn as a small fort), and
any coverage check that consulted the real world would report voids where the
picture is simply different, and miss them where it agrees. Sea counts as
ground to be claimed exactly like land does: an ocean is a region, and the
map is not finished until it has one.

Exactness matters more than speed here. A tessellation is checked
occasionally and acted on carefully, so this uses real polygon booleans
rather than sampling a grid -- a sampled check cannot tell a genuine
hairline gap between two districts from a rounding artefact, and this is
precisely the tool whose job is to find hairline gaps.

Slivers are reported, never silently dropped. Hand-drawn borders produce
micro-gaps by the dozen; burying them would make the headline number a lie,
so anything under `min_sliver_px2` is counted and totalled separately rather
than listed individually.
"""

from __future__ import annotations

import os
import sys

from shapely.geometry import Polygon, box
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import grid as grid_mod  # noqa: E402

#: The painted content area: the 12400px sheet less its 200px border on every
#: side. Regions may be drawn past it (an ocean sensibly runs off the edge);
#: everything is clipped to this before being measured.
DEFAULT_EXTENT = (
    float(grid_mod.BORDER_PX),
    float(grid_mod.BORDER_PX),
    float(grid_mod.BORDER_PX + grid_mod.CELL_PX * grid_mod.GRID_COLS),
    float(grid_mod.BORDER_PX + grid_mod.CELL_PX * grid_mod.GRID_ROWS),
)

#: Below this, a gap or an overlap is a hand-drawing artefact rather than a
#: decision anyone made. 100 px = 100 m2 on this sheet, a 10m square: far
#: under anything that could hold a building. Counted and totalled, never
#: hidden -- see the module docstring.
DEFAULT_MIN_SLIVER_PX2 = 100.0

#: Below this, a fragment is not a gap at all -- it is arithmetic. Every
#: boolean operation on real polygons leaves a scatter of degenerate pieces
#: whose area rounds to zero; GEOS produced twenty of them from a set of
#: regions that were gapless by construction, at full coordinate precision,
#: with a total area of 0.00 px2. Counting those made `tessellates` report
#: False for a tessellation that provably was one, which is worse than useless
#: -- a gate nothing can pass gets ignored, and then the real 50 px gap it was
#: built to catch gets ignored along with it.
#:
#: 0.01 px2 is one square centimetre of ground. It sits four orders of
#: magnitude above the exhaust (individually around 1e-9 px2) and two below the
#: smallest gap anyone has ever drawn by hand, which keeps both halves honest:
#: a real 1 m2 hairline between two hand-drawn districts is still counted and
#: still blocks `tessellates`, exactly as before.
DEFAULT_NOISE_PX2 = 0.01


class CoverageError(ValueError):
    pass


def _rings_of(region):
    """A region's rings, tolerating both the session item and location shapes.

    Returns them in GeoJSON Polygon order: outside first, then holes. A session
    item keeps its holes in `holesPx` alongside its `ringPx`, because the
    drawing tools only ever produce and edit the outer ring and having one
    named field for it keeps every one of them simpler.
    """
    geom = region.get("geometry") or {}
    if region.get("ringsPx"):
        return list(region["ringsPx"])
    for source in (region, geom):
        if source.get("ringPx"):
            return [source["ringPx"]] + list(source.get("holesPx") or [])
    if geom.get("rings"):
        return list(geom["rings"])
    return []


def _to_polygon(rings):
    """Rings -> a valid shapely polygon, or None if they cannot be one.

    The FIRST ring is the outside and every later ring is a hole, which is
    GeoJSON's Polygon convention and is also exactly what `_describe` below
    emits. Those two used to disagree: this read every ring as solid ground and
    unioned them, so a region with an island in it reported the island as part
    of the region and the island's own region as an overlap. A tessellation
    check that cannot represent a lagoon is not checking the thing it claims to.

    buffer(0) is the standard repair for a self-intersecting ring, which a
    hand-drawn region produces easily -- a bowtie from a dragged vertex. The
    repair is applied rather than refused because the alternative is the
    coverage view going blank the moment one region is briefly malformed
    mid-edit, which is exactly when it is being looked at.
    """
    usable = [r for r in rings if r and len(r) >= 3]
    if not usable:
        return None
    shell = [(float(x), float(y)) for x, y in usable[0]]
    holes = [[(float(x), float(y)) for x, y in r] for r in usable[1:]]
    try:
        poly = Polygon(shell, holes)
    except (ValueError, TypeError):
        return None
    if not poly.is_valid:
        poly = poly.buffer(0)
    if poly.is_empty or poly.area <= 0:
        return None
    return poly


def _parts(geom):
    """Polygon parts of any shapely result, flattened."""
    if geom is None or geom.is_empty:
        return []
    if geom.geom_type == "Polygon":
        return [geom]
    if geom.geom_type in ("MultiPolygon", "GeometryCollection"):
        out = []
        for part in geom.geoms:
            out.extend(_parts(part))
        return out
    return []  # lines and points from a boolean op carry no area


def _describe(poly, georef=None):
    """A polygon as the UI and a person both need it: rings to draw, an area,
    a centroid to fly to, and the grid references to say out loud."""
    exterior = [[round(x, 1), round(y, 1)] for x, y in poly.exterior.coords]
    holes = [[[round(x, 1), round(y, 1)] for x, y in interior.coords]
             for interior in poly.interiors]
    centroid = poly.representative_point()   # guaranteed inside, unlike centroid
    try:
        refs = grid_mod.refs_touched([(x, y) for x, y in poly.exterior.coords])
    except Exception:
        refs = []
    return {
        "areaPx2": round(poly.area, 1),
        "ringsPx": [exterior] + holes,
        "centroidPx": [round(centroid.x, 1), round(centroid.y, 1)],
        "refs": refs[:12],
        "refCount": len(refs),
    }


def analyse(regions, *, extent=None, min_sliver_px2=DEFAULT_MIN_SLIVER_PX2,
            noise_px2=DEFAULT_NOISE_PX2, sites=()):
    """The whole tessellation, checked.

    `regions` are dicts carrying an id and a ring in image pixels (any of the
    session-item or location shapes). `sites` are the non-region locations to
    sanity-check for containment -- with a complete tessellation this list is
    necessarily empty, since a gapless cover means every point is inside
    something, so anything it reports is a second opinion on the void check
    rather than independent news.
    """
    x0, y0, x1, y1 = extent or DEFAULT_EXTENT
    sheet = box(x0, y0, x1, y1)
    total = sheet.area

    prepared = []
    invalid = []
    for region in regions:
        rings = _rings_of(region)
        if not rings:
            invalid.append({"id": region.get("id") or region.get("localId"),
                            "problem": "no polygon geometry"})
            continue
        poly = _to_polygon(rings)
        if poly is None:
            invalid.append({"id": region.get("id") or region.get("localId"),
                            "problem": "geometry could not be made into a polygon"})
            continue
        merged = poly.intersection(sheet)
        if merged.is_empty:
            invalid.append({"id": region.get("id") or region.get("localId"),
                            "problem": "lies entirely outside the sheet"})
            continue
        prepared.append({"id": region.get("id") or region.get("localId"), "geom": merged})

    claimed = unary_union([p["geom"] for p in prepared]) if prepared else None
    claimed_area = claimed.area if claimed is not None else 0.0

    # --- voids: sheet minus everything claimed -------------------------------
    voids, void_slivers, void_sliver_area = [], 0, 0.0
    gap_geom = sheet.difference(claimed) if claimed is not None else sheet
    for part in _parts(gap_geom):
        if part.area < noise_px2:
            continue
        if part.area < min_sliver_px2:
            void_slivers += 1
            void_sliver_area += part.area
            continue
        voids.append(_describe(part))
    voids.sort(key=lambda v: v["areaPx2"], reverse=True)

    # --- overlaps: every pair that both claim the same ground ----------------
    # Pairwise rather than a single "claimed more than once" mask, because the
    # actionable question is never "where is there an overlap" but "which two
    # regions disagree, and about what".
    overlaps, overlap_slivers, overlap_sliver_area = [], 0, 0.0
    for i in range(len(prepared)):
        for j in range(i + 1, len(prepared)):
            a, b = prepared[i], prepared[j]
            if not a["geom"].intersects(b["geom"]):
                continue
            shared = a["geom"].intersection(b["geom"])
            for part in _parts(shared):
                if part.area < noise_px2:
                    continue
                if part.area < min_sliver_px2:
                    overlap_slivers += 1
                    overlap_sliver_area += part.area
                    continue
                entry = _describe(part)
                entry["a"] = a["id"]
                entry["b"] = b["id"]
                overlaps.append(entry)
    overlaps.sort(key=lambda o: o["areaPx2"], reverse=True)

    # --- orphan sites --------------------------------------------------------
    orphans = []
    for site in sites or ():
        centroid = site.get("centroidPx")
        if not centroid:
            continue
        from shapely.geometry import Point
        point = Point(float(centroid[0]), float(centroid[1]))
        if claimed is None or not claimed.contains(point):
            orphans.append(site.get("id") or site.get("localId"))

    void_area = max(0.0, total - claimed_area)
    return {
        "extent": {"x0": x0, "y0": y0, "x1": x1, "y1": y1},
        "regionCount": len(prepared),
        "invalidRegions": invalid,
        "totalAreaPx2": round(total, 1),
        "claimedAreaPx2": round(claimed_area, 1),
        "claimedFraction": round(claimed_area / total, 6) if total else 0.0,
        "voidAreaPx2": round(void_area, 1),
        "voids": voids,
        "voidSliverCount": void_slivers,
        "voidSliverAreaPx2": round(void_sliver_area, 1),
        "overlaps": overlaps,
        "overlapSliverCount": overlap_slivers,
        "overlapSliverAreaPx2": round(overlap_sliver_area, 1),
        "orphanSiteIds": orphans,
        "tessellates": (not voids and not overlaps
                        and void_slivers == 0 and overlap_slivers == 0),
        "minSliverPx2": min_sliver_px2,
        "noisePx2": noise_px2,
    }


def summarise(result, metres_per_px=1.0):
    """One line for a status bar. Deliberately states the sliver counts even
    when they are the only thing wrong -- a tessellation that is 99.99% there
    is not finished, and rounding the number to 100% would say it is."""
    pct = result["claimedFraction"] * 100.0
    bits = ["%.2f%% claimed" % pct]
    if result["voids"]:
        bits.append("%d gap%s" % (len(result["voids"]),
                                  "" if len(result["voids"]) == 1 else "s"))
    if result["voidSliverCount"]:
        bits.append("%d sliver gap%s" % (result["voidSliverCount"],
                                         "" if result["voidSliverCount"] == 1 else "s"))
    if result["overlaps"]:
        bits.append("%d overlap%s" % (len(result["overlaps"]),
                                      "" if len(result["overlaps"]) == 1 else "s"))
    if result["overlapSliverCount"]:
        bits.append("%d sliver overlap%s" % (result["overlapSliverCount"],
                                             "" if result["overlapSliverCount"] == 1 else "s"))
    if result["invalidRegions"]:
        bits.append("%d unusable" % len(result["invalidRegions"]))
    if result["tessellates"]:
        bits.append("tessellates")
    return " · ".join(bits)
