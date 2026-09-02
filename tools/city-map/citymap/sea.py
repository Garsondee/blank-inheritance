"""Sea/land classification and the sea-polygon carve-out.

Three bugs shipped here in the 2026-08-23 session, each hiding the next:

1. **Coastline-direction classification alone is blind to un-coastlined
   islands.** OSM convention is that land sits to the left of a
   `natural=coastline` way's direction, which lets `polygonize()` split the
   fetch box into faces and a cross-product test call each one land or sea.
   But large reclaimed islands are frequently mapped with NO coastline way at
   all -- their edge exists only as the building/landuse polygons that fill
   them. A face with no nearby coastline data falls through as sea by default.
   Fix: an STRtree safety net that reclassifies a "sea" face as land when most
   of its interior is actually covered by real land content.

2. **A REGRESSION in that safety net**, found immediately: testing by area
   fraction over-corrected and reclassified the entire ocean as land, because
   the open sea's edge legitimately touches hundreds of small real structures
   (piers, breakwaters) and `STRtree.query()` is a bounding-box filter, so it
   handed back most of the tree for a face that size. Fixed by sampling
   interior POINTS instead of integrating edge-heavy area.

3. **Point-sampling is still face-level and all-or-nothing.** Port Island has
   no coastline data AT ALL, so it was never its own face -- it sits inside one
   enormous combined sea face that correctly votes "mostly open water" overall,
   Port Island included. The fix cannot be face-level; it has to carve real
   land content directly OUT of the finished sea polygon.

This module implements the fix as it stands after all three rounds, plus a
fourth thing found on Milestone 0 review: a 6 m carve buffer only seals slivers
between touching polygons, not the real gaps between separate mapped features
on a sparse island (parking lots, yards, unmapped taxiway pavement) -- so the
carve uses a morphological closing (buffer out, then most of the way back in)
calibrated to bridge realistic inter-building gaps while staying below the
width of genuine water inlets.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union
from shapely.prepared import prep
from shapely.strtree import STRtree

from .parse import Feature, land_content as compute_land_content

STAGE_CODE_VERSION = 1

# Morphological closing distances, in metres. Calibrated against the real
# Kurose frame: measured inter-building gaps on a sparse reclaimed island run
# ~120-290 m, and the nearest genuine water inlet (Port Island's own boat
# basin) reads ~400-700 m across. 130/-124 bridges gaps up to ~260 m (safely
# below the inlet width) while growing the true union by only ~6 m net.
DEFAULT_CLOSE_OUT_M = 130.0
DEFAULT_CLOSE_IN_M = 124.0

# Point-sampling safety net parameters (regression 2, above).
SAMPLE_TARGET = 40
SAMPLE_MAX_ATTEMPTS = 800
SAMPLE_MAJORITY = 0.5
DEFAULT_RNG_SEED = 1234


def classify_by_coastline(face: Polygon, coastline_segments: Sequence[LineString]) -> str:
    """'sea' or 'land', from which side of the nearest coastline way this is on.

    OSM convention: land is to the LEFT of a coastline way's direction. Found
    via the sign of the cross product between the segment's local tangent and
    the vector from the segment to the face's representative point.

    Requires at least one coastline segment; raises if `coastline_segments` is
    empty, since there is nothing to classify against -- callers should check
    for that case rather than getting a misleading default.
    """
    rep = face.representative_point()
    best_seg, best_dist = None, float("inf")
    for seg in coastline_segments:
        dist = seg.distance(rep)
        if dist < best_dist:
            best_dist, best_seg = dist, seg
    d = best_seg.project(rep)
    d0, d1 = max(0.0, d - 1.0), min(best_seg.length, d + 1.0)
    p0, p1 = best_seg.interpolate(d0), best_seg.interpolate(d1)
    tangent = (p1.x - p0.x, p1.y - p0.y)
    origin = best_seg.interpolate(d)
    to_rep = (rep.x - origin.x, rep.y - origin.y)
    cross = tangent[0] * to_rep[1] - tangent[1] * to_rep[0]
    return "sea" if cross < 0 else "land"


def _classify_with_safety_net(face: Polygon, coastline_segments, land_tree: Optional[STRtree],
                              land_geoms: List, rng: random.Random) -> str:
    verdict = classify_by_coastline(face, coastline_segments)
    if verdict != "sea" or land_tree is None:
        return verdict
    minx, miny, maxx, maxy = face.bounds
    hits = checked = attempts = 0
    while checked < SAMPLE_TARGET and attempts < SAMPLE_MAX_ATTEMPTS:
        attempts += 1
        pt = Point(minx + rng.random() * (maxx - minx), miny + rng.random() * (maxy - miny))
        if not face.contains(pt):
            continue
        checked += 1
        for idx in land_tree.query(pt):
            if land_geoms[idx].contains(pt):
                hits += 1
                break
    return "land" if checked > 0 and hits / checked > SAMPLE_MAJORITY else "sea"


@dataclass
class SeaResult:
    sea_geom: Optional[object]        # shapely (Multi)Polygon, or None if no ocean at all
    face_count: int
    sea_face_count: int
    land_content_count: int
    carved_feature_count: int
    area_before_carve_km2: float
    area_after_carve_km2: float


def build_sea_polygon(features: Sequence[Feature], boundary: Polygon,
                      rng_seed: int = DEFAULT_RNG_SEED,
                      close_out_m: float = DEFAULT_CLOSE_OUT_M,
                      close_in_m: float = DEFAULT_CLOSE_IN_M) -> SeaResult:
    """Classify sea vs land within `boundary` and carve real land out of it.

    `boundary` is a fixed, generous SOURCE-CRS polygon -- deliberately NOT
    derived from a Frame's rotated corners. Sea classification is one of the
    few genuinely expensive stages (the STRtree carve alone was minutes before
    `prep()`), and coupling it to frame rotation/extent would make that cost
    pay again every time an art-direction loop changes either. Keeping the
    boundary fixed is what lets the L1 world cache stay frame-independent.
    """
    coastline_segments: List[LineString] = []
    for feature in features:
        if feature.tags.get("natural") != "coastline" or feature.area:
            continue
        clipped = feature.geom.intersection(boundary)
        if clipped.is_empty:
            continue
        if clipped.geom_type == "LineString":
            coastline_segments.append(clipped)
        elif hasattr(clipped, "geoms"):
            coastline_segments.extend(p for p in clipped.geoms if p.geom_type == "LineString")

    land_geoms = compute_land_content(features)
    land_tree = STRtree(land_geoms) if land_geoms else None

    if not coastline_segments:
        # No coastline data at all in this boundary -- most likely a fully
        # inland frame, or the source query missed natural=coastline. There is
        # nothing to classify against, so there is no sea, not "assume land".
        return SeaResult(None, 0, 0, len(land_geoms), 0, 0.0, 0.0)

    boundary_ring = LineString(list(boundary.exterior.coords))
    arrangement = unary_union(coastline_segments + [boundary_ring])
    faces = list(polygonize(arrangement))

    rng = random.Random(rng_seed)
    sea_faces = [f for f in faces
                if _classify_with_safety_net(f, coastline_segments, land_tree, land_geoms, rng) == "sea"]

    if not sea_faces:
        return SeaResult(None, len(faces), 0, len(land_geoms), 0, 0.0, 0.0)

    sea_geom = unary_union(sea_faces)
    area_before = sea_geom.area
    carved_count = 0

    if land_tree is not None and not sea_geom.is_empty:
        # prep() amortises the sea polygon's own complexity across every
        # candidate test -- without it this step alone took minutes on the
        # real 12 km frame, because land_tree.query() (a bbox filter) hands
        # back a large fraction of ~115k features for a sea polygon whose own
        # bbox spans most of the fetch area.
        prepared_sea = prep(sea_geom)
        overlapping = [land_geoms[i] for i in land_tree.query(sea_geom)
                       if prepared_sea.intersects(land_geoms[i])]
        if overlapping:
            land_here = unary_union(overlapping).buffer(close_out_m).buffer(-close_in_m)
            carved = sea_geom.difference(land_here)
            if not carved.is_empty:
                sea_geom = carved
                carved_count = len(overlapping)

    return SeaResult(
        sea_geom=sea_geom,
        face_count=len(faces),
        sea_face_count=len(sea_faces),
        land_content_count=len(land_geoms),
        carved_feature_count=carved_count,
        area_before_carve_km2=area_before / 1e6,
        area_after_carve_km2=sea_geom.area / 1e6 if sea_geom is not None else 0.0,
    )


def sea_feature(result: SeaResult, feature_id: str) -> Optional[Feature]:
    """Wrap a SeaResult's geometry as a Feature, ready to append to the world.

    Tagged `__sea__` (matching the sentinel the renderer already dispatches on)
    rather than any real OSM key, since this geometry is synthesised.
    """
    if result.sea_geom is None or result.sea_geom.is_empty:
        return None
    return Feature(id=feature_id, geom=result.sea_geom, tags={"__sea__": "true"}, area=True)
