"""Reading the real world underneath the campaign map.

`data/map/kurose.gpkg` holds 230,061 real OSM features for the ground the
campaign map covers -- buildings with heights, landuse, waterways, railways,
Japanese and English names, neighbourhood names -- in EPSG:6674, behind an
R*Tree index. It was built for the retired renderer and outlived it: as a
queryable model of the real place, it is exactly what is needed to research a
location before writing about it, and it answers in milliseconds with no
network.

**This is research material, never canon.** The campaign city is a fictional
Japanese-flavoured Golarion city that happens to sit on Kobe's geography. What
this module returns describes Kobe. It tells you that a block is 1960s
mid-rise housing on reclaimed flat ground four hundred metres from a sea wall,
which is what makes an invented place convincing -- but no name, operator or
address it returns may appear in player-facing text. `enrich.py` writes it into
a `realWorld` block that is walled off for exactly that reason.

The picture and the ground truth can also legitimately disagree. The Photoshop
master is hand-painted and the op log already sank three islands; where they
differ, the picture is the campaign's truth and this is only a note about the
place it was drawn from.
"""

from __future__ import annotations

import os
import sys

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_CITY_MAP = os.path.join(_REPO_ROOT, "tools", "city-map")
if _CITY_MAP not in sys.path:
    sys.path.insert(0, _CITY_MAP)

from citymap.store import gpkg  # noqa: E402

GPKG_PATH = os.path.join(_REPO_ROOT, "data", "map", "kurose.gpkg")


def store_exists(path=GPKG_PATH):
    """Whether the ground-truth store is on disk.

    Tests use this to skip loudly rather than fail, per
    design/testing-strategy.md: a fresh clone has no 120 MB GeoPackage.
    """
    return os.path.exists(path)


def open_store(path=GPKG_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(
            "no ground-truth store at %s -- real-world lookups need it" % path)
    return gpkg.connect(path)


def source_bbox_for_image_rect(georef, x0, y0, x1, y1):
    """Source-CRS bbox enclosing an image-pixel rectangle.

    The page is rotated, so a rectangle on the picture is a tilted quadrilateral
    on the ground: its axis-aligned bbox in source CRS must come from all four
    corners, not from two. Taking only the opposite corners would miss up to
    half the features along the long diagonal -- and would do it silently,
    since the query would still return plenty of results.
    """
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pts = [georef.image_px_to_source(x, y) for x, y in corners]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def features_in_image_rect(conn, georef, x0, y0, x1, y1, limit=None):
    """Every ground-truth feature whose bbox meets an image-pixel rectangle.

    Returns the store's own feature dicts unchanged (`geom` still shapely in
    source CRS, `tags` the full OSM tag dict). Reprojection is a separate step
    because most callers want to filter first and only convert what survives.
    """
    minx, miny, maxx, maxy = source_bbox_for_image_rect(georef, x0, y0, x1, y1)
    return gpkg.query_features_bbox(conn, minx, miny, maxx, maxy, limit=limit)


def count_features_in_image_rect(conn, georef, x0, y0, x1, y1):
    minx, miny, maxx, maxy = source_bbox_for_image_rect(georef, x0, y0, x1, y1)
    return gpkg.count_features_bbox(conn, minx, miny, maxx, maxy)


def geom_to_image_rings(geom, georef):
    """A shapely source-CRS geometry -> a list of image-pixel point lists.

    One list per drawable ring or line: a polygon contributes its exterior and
    each interior, a multi-part geometry contributes all its parts. Points are
    returned rather than re-wrapped as shapely because every consumer so far
    wants to draw them, and a drawing API wants a flat list.
    """
    out = []
    if geom is None or geom.is_empty:
        return out
    kind = geom.geom_type
    if kind in ("Polygon",):
        out.append([georef.source_to_image_px(*c) for c in geom.exterior.coords])
        for interior in geom.interiors:
            out.append([georef.source_to_image_px(*c) for c in interior.coords])
    elif kind in ("LineString", "LinearRing"):
        out.append([georef.source_to_image_px(*c) for c in geom.coords])
    elif kind == "Point":
        out.append([georef.source_to_image_px(geom.x, geom.y)])
    elif kind.startswith("Multi") or kind == "GeometryCollection":
        for part in geom.geoms:
            out.extend(geom_to_image_rings(part, georef))
    return out


def classify(tags, is_area=False):
    """A coarse bucket for a ground-truth feature, for colouring and summary.

    Deliberately blunt -- this is not the terrain system (explicitly out of
    scope) and it is not a campaign-facing vocabulary. It exists so a
    calibration overlay can draw water differently from buildings, and so an
    enrichment summary can say what a block is mostly made of.
    """
    tags = tags or {}
    if tags.get("natural") in ("water", "coastline", "bay", "strait", "wetland"):
        return "water"
    if tags.get("waterway"):
        return "water"
    if tags.get("landuse") in ("reservoir", "basin"):
        return "water"
    if tags.get("building"):
        return "building"
    if tags.get("railway"):
        return "rail"
    if tags.get("highway"):
        return "road"
    if tags.get("aeroway"):
        return "aeroway"
    if tags.get("natural") in ("wood", "scrub", "grassland", "heath", "tree_row"):
        return "green"
    if tags.get("landuse") in ("forest", "grass", "meadow", "farmland", "orchard",
                               "cemetery", "recreation_ground", "allotments"):
        return "green"
    if tags.get("leisure") in ("park", "garden", "pitch", "playground", "golf_course"):
        return "green"
    if tags.get("landuse") in ("industrial", "quarry", "brownfield", "landfill", "depot"):
        return "industry"
    if tags.get("landuse") in ("commercial", "retail"):
        return "commerce"
    if tags.get("landuse") == "residential":
        return "residential"
    if tags.get("landuse"):
        return "landuse"
    if tags.get("amenity") or tags.get("shop"):
        return "amenity"
    return "other"
