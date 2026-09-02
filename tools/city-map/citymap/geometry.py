"""Pure geometry helpers. No PIL, no I/O -- so all of this is directly testable.

design/testing-strategy.md rule 3: "If it can be a pure function, it must be."
The two functions here were both the site of a real rendering bug, and both
bugs were invisible in the data and only showed up as something looking subtly
wrong in a 130 MB image -- which is exactly the case for pushing logic into a
place a unit test can reach.
"""

from __future__ import annotations

from typing import Dict, Iterable, List

from shapely import affinity
from shapely.geometry import LineString, MultiLineString, Polygon
from shapely.ops import unary_union

STAGE_CODE_VERSION = 1


class GeometryError(Exception):
    pass


def iter_polygons(geom) -> Iterable[Polygon]:
    """Yield every non-empty Polygon in a geometry, flattening collections."""
    if geom is None or geom.is_empty:
        return
    for part in (geom.geoms if hasattr(geom, "geoms") else [geom]):
        if part.geom_type == "Polygon" and not part.is_empty:
            yield part


def iter_rings(geom):
    """Yield (exterior_coords, [interior_coords, ...]) for each polygon.

    Callers that only ever read `.exterior` silently discard holes -- see
    `draw.fill_polygon` for what that cost.
    """
    for part in iter_polygons(geom):
        yield list(part.exterior.coords), [list(r.coords) for r in part.interiors]


def shadow_sweep(geom, dx: float, dy: float):
    """The true swept shadow of a footprint along (dx, dy).

    This is the Minkowski sum of the polygon with the segment from (0,0) to
    (dx,dy) -- the region the building sweeps through as it is displaced.

    REGRESSION (2026-08-23): the original used
    `unary_union([original, translated]).convex_hull`. For any CONCAVE
    footprint -- an L-shape, a courtyard, a notch, all extremely common in real
    building data -- the convex hull fills the concavity in, so the shadow
    bulged across ground the building never occludes. Reported as shadows
    becoming "an illogical clipped version" of the real shape.

    The correct construction sweeps every EDGE, not just the two end positions:
    for each boundary edge, the quadrilateral joining it to its translated copy
    is part of the swept region. The union of the original, the translated copy,
    and every edge-quad is exactly the Minkowski sum, and is correct for concave
    footprints because it is built from the boundary directly rather than
    inferred from a hull.

    Interior rings are swept too -- a courtyard's own walls cast shadow into it.
    """
    parts: List[Polygon] = []
    for polygon in iter_polygons(geom):
        parts.append(polygon)
        parts.append(affinity.translate(polygon, xoff=dx, yoff=dy))
        rings = [list(polygon.exterior.coords)]
        rings.extend(list(r.coords) for r in polygon.interiors)
        for ring in rings:
            for i in range(len(ring) - 1):
                (x1, y1), (x2, y2) = ring[i], ring[i + 1]
                quad = Polygon([(x1, y1), (x2, y2),
                                (x2 + dx, y2 + dy), (x1 + dx, y1 + dy)])
                if not quad.is_valid:
                    quad = quad.buffer(0)
                if not quad.is_empty:
                    parts.append(quad)
    if not parts:
        return geom
    try:
        return unary_union(parts)
    except Exception:
        # Degenerate input should never lose the building entirely.
        return geom


def has_holes(geom) -> bool:
    return any(len(p.interiors) > 0 for p in iter_polygons(geom))


# --- Parallel-offset curves -- map-editor plan Phase 5's ghost lines -------
# ("creating things that are parallel to roads should be easy"). Computed
# here, in the frame's SOURCE CRS (EPSG:6674, a real projected metre-based
# system -- see citymap.store.gpkg's SOURCE_SRS_ID and ids.py's module
# docstring), deliberately never in the browser: MapLibre/GeoJSON work in
# lon/lat, and offsetting a curve by a fixed real-ground distance in lon/lat
# space would silently distort with latitude (a degree of longitude is not
# a fixed number of metres) -- the exact class of bug this project's
# SOURCE-CRS-first discipline exists to avoid elsewhere. Computing it here
# and shipping the already-correct result as plain coordinates sidesteps
# the whole problem.

def _normalize_offset_result(geom) -> List[LineString]:
    """shapely's LineString.offset_curve can return a LineString, a
    MultiLineString, or an empty LineString (its own "this offset is
    geometrically impossible here" result, e.g. a hairpin turn offset
    toward its own inside past where the two arms would overlap) --
    normalize to a flat list of real, non-empty LineStrings. A
    self-crossing or otherwise complex input line CAN split into multiple
    disjoint offset parts (confirmed directly: a figure-8-shaped line
    offset by a plain distance returns a real 3-part MultiLineString) --
    every part is real, ground-accurate offset geometry, so every caller
    gets every part, never just the first one picked silently."""
    if geom.is_empty:
        return []
    if isinstance(geom, LineString):
        return [geom]
    if isinstance(geom, MultiLineString):
        return [g for g in geom.geoms if not g.is_empty]
    raise GeometryError(f"unexpected offset_curve result type: {type(geom).__name__}")


def offset_line(line: LineString, distance_m: float) -> List[LineString]:
    """One side's offset of `line` at `distance_m` real ground metres.
    Sign follows shapely's own offset_curve convention: positive offsets to
    the LEFT of the line's own coordinate direction, negative to the
    RIGHT -- callers that want a specific compass side must account for
    their input line's own vertex order, this function does not normalize
    that (a road's own OSM-authored vertex order is what it is; flipping it
    here would silently disagree with the line as actually drawn on the
    map). Every real part, normalized -- see _normalize_offset_result."""
    return _normalize_offset_result(line.offset_curve(distance_m))


def offset_both_sides(line: LineString, distance_m: float) -> Dict[str, List[LineString]]:
    """Both sides at the same real distance -- {"left": [...], "right":
    [...]} -- the natural shape for "show ghost lines on either side of
    this road". distance_m must be positive; pass the magnitude once, not
    a pre-negated "right" value (offset_line(-distance_m) is called here so
    a caller never has to remember shapely's own sign convention)."""
    if distance_m <= 0:
        raise GeometryError(f"distance_m must be positive, got {distance_m}")
    return {"left": offset_line(line, distance_m), "right": offset_line(line, -distance_m)}
