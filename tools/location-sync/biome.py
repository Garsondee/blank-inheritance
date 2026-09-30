"""Classify every grid cell on the sheet, mixing real data with the campaign.

Orchestration only -- core/biome.py holds the actual decision (classify_cell)
and is tested against it directly with synthetic measurements. This module's
job is producing those measurements for real: per cell, how much of it is
building footprint and how tall, how much is forest or industrial or
commercial ground, whether it is land or water on the PAINTED map (not the
real coastline -- landmask.py's own reason applies here exactly as it does
to coastline clipping), and whether a promoted district or a hand override
already has an opinion that beats all of that.

Same layering as core/overrides.py's building suppression, one level up:

    hand override (data/map/biome-overrides.json)
        beats
    a promoted district's own declared `kind`
        beats
    real measurement from data/map/kurose.gpkg
        beats
    nothing -- a cell with no data at all reads as an ordinary city street,
    per classify_cell's own documented default.

Skips loudly without the 120 MB GeoPackage, per the house rule (design/
testing-strategy.md rule 5) already followed by landmask.py and crop.py.
Results are cached in tools/gazetteer/_cache/biomes.json, gitignored like
landmask's own cache, because they are fully derived and a fresh clone has
neither the GeoPackage nor a reason to recompute this before it is asked for.
"""

from __future__ import annotations

import json
import os

from core import biome as biome_core
from core import grid, groundtruth
from core.georef import MapGeoref

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
CACHE_PATH = os.path.join(_HERE, "_cache", "biomes.json")
OVERRIDES_PATH = os.path.join(_REPO_ROOT, "data", "map", "biome-overrides.json")
OVERRIDES_SCHEMA_REL = "../schema/biome-overrides.schema.json"

#: Land within this many metres of water (or water within this many metres
#: of land) reads as shore -- half a cell either side of the coastline. See
#: core/biome.py's own note: this is a terrain-surface fact, checked after
#: everything else including a district's declared kind.
SHORE_BAND_M = 100.0

#: Below this share of a cell actually measured (by area, across every
#: bucket biome.py knows about) the real-data signal is too thin to trust --
#: treated the same as a cell with no data at all, per classify_cell's own
#: documented default, rather than let one sliver of a large tagged feature
#: decide the whole cell.
MIN_MEASURED_COVERAGE = 0.01


def empty_overrides():
    return {
        "$schema": OVERRIDES_SCHEMA_REL,
        "id": "biome-overrides",
        "type": "biome-overrides",
        "overrides": [],
    }


def load_overrides(path=None):
    path = path or OVERRIDES_PATH
    if not os.path.exists(path):
        return empty_overrides()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_overrides(doc, path=None):
    path = path or OVERRIDES_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def _district_kind_by_cell(locations_dir):
    """ref -> a promoted region's own `kind`, for every cell any region's
    `derived.cells` already claims. Reuses that field rather than
    recomputing containment -- it is already the tessellation's own record
    of which cells a district touches, kept in step by promotion itself."""
    by_cell = {}
    if not os.path.isdir(locations_dir):
        return by_cell
    for name in os.listdir(locations_dir):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(locations_dir, name), encoding="utf-8") as fh:
            doc = json.load(fh)
        if doc.get("tier") != "region":
            continue
        kind = doc.get("kind")
        for ref in (doc.get("derived") or {}).get("cells") or []:
            by_cell[ref] = kind
    return by_cell


def _measure_cell(conn, georef, land, water, col, row):
    """Real measurement for one cell: land/water/shore from the painted map,
    coverage shares from the GeoPackage. Returns a dict matching
    core/biome.py's classify_cell keyword arguments (minus override and
    district_kind, which the caller already knows without measuring)."""
    from shapely.geometry import Polygon

    x0, y0, x1, y1 = grid.cell_bounds_px(col, row, border=georef.border_px,
                                         cell=georef.cell_px, cols=georef.cols, rows=georef.rows)
    cell_img = Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
    cell_area_px2 = float(cell_img.area)

    land_area = cell_img.intersection(land).area if not land.is_empty else 0.0
    is_water = land_area < cell_area_px2 * 0.5
    nearest_opposite = land if is_water else water
    # Distance in px == distance in metres (metres_per_px is 1.0 on this
    # sheet, verified in design/map-generation.md) -- no conversion needed,
    # but computed via georef rather than assumed, so a future sheet at a
    # different scale fails loudly instead of quietly mis-measuring shore.
    shore_m = cell_img.distance(nearest_opposite) * georef.metres_per_px if not nearest_opposite.is_empty else float("inf")
    shore = shore_m <= SHORE_BAND_M

    if is_water:
        return {"is_water": True, "shore": shore, "building_coverage": 0.0,
               "mean_building_height_m": 0.0, "commerce_coverage": 0.0,
               "industry_coverage": 0.0, "forest_coverage": 0.0, "green_coverage": 0.0}

    # Real measurement only makes sense in source CRS, where the sheet's 31
    # degree rotation is not a factor -- the cell is a rotated quadrilateral
    # there, not the axis-aligned rectangle it is on the picture, so its
    # true corners are used rather than an enclosing bbox that would
    # overcount features near the cell's rotated edges.
    corners_src = [georef.image_px_to_source(x, y) for x, y in cell_img.exterior.coords[:-1]]
    cell_src = Polygon(corners_src)
    cell_area_m2 = cell_src.area

    features = groundtruth.features_in_image_rect(conn, georef, x0, y0, x1, y1)
    building_area = commerce_area = industry_area = forest_area = green_area = 0.0
    height_weighted = 0.0
    for feat in features:
        geom = feat.get("geom")
        # The store's own `is_area` column is unset (None) throughout --
        # found live measuring a real forested cell that came back with zero
        # green coverage despite two real, multi-million-square-metre forest
        # polygons sitting right in it. geom_type is the ground truth for
        # whether a feature actually HAS an area to measure; a road or rail
        # LineString's own .area is already 0.0, so no separate area-ness
        # check is needed once this is checked directly instead.
        if geom is None or geom.is_empty or geom.geom_type not in ("Polygon", "MultiPolygon"):
            continue
        overlap = geom.intersection(cell_src).area
        if overlap <= 0:
            continue
        bucket = groundtruth.classify(feat.get("tags"), is_area=True)
        tags = feat.get("tags") or {}
        if bucket == "building":
            building_area += overlap
            height_weighted += overlap * float(feat.get("height_m") or 0.0)
        elif bucket == "commerce":
            commerce_area += overlap
        elif bucket == "industry":
            industry_area += overlap
        elif bucket == "green":
            if tags.get("landuse") == "forest" or tags.get("natural") in ("wood", "scrub"):
                forest_area += overlap
            else:
                green_area += overlap

    mean_height = (height_weighted / building_area) if building_area > 0 else 0.0
    return {
        "is_water": False, "shore": shore,
        "building_coverage": building_area / cell_area_m2,
        "mean_building_height_m": mean_height,
        "commerce_coverage": commerce_area / cell_area_m2,
        "industry_coverage": industry_area / cell_area_m2,
        "forest_coverage": forest_area / cell_area_m2,
        "green_coverage": green_area / cell_area_m2,
    }


def build(georef=None, locations_dir=None, overrides=None):
    """Every cell on the sheet, classified. Returns {ref: biome}.

    Not fast -- 3,600 real spatial queries against a 230,000-feature store --
    but run once and cached, the same trade calibrate.py and landmask.py
    already make for comparable one-off passes over the whole sheet.
    """
    import landmask as landmask_mod

    georef = georef or MapGeoref.load()
    locations_dir = locations_dir or os.path.join(_REPO_ROOT, "data", "locations")
    overrides_doc = overrides if overrides is not None else load_overrides()
    override_by_ref = {o["ref"]: o["biome"] for o in overrides_doc.get("overrides") or []}
    district_kind_by_ref = _district_kind_by_cell(locations_dir)

    conn = groundtruth.open_store()
    _, land, water = landmask_mod.load()

    result = {}
    for row in range(georef.rows):
        for col in range(georef.cols):
            ref = grid.cell_to_ref(col, row, cols=georef.cols, rows=georef.rows)
            override = override_by_ref.get(ref)
            district_kind = district_kind_by_ref.get(ref)
            if override or district_kind in biome_core.DISTRICT_KIND_BIOME:
                # Neither measured path needs a real query: an override is
                # absolute and a matching district kind is too, per
                # classify_cell's own priority order -- only the shore
                # adjustment still needs the painted map either way.
                measured = _measure_cell(conn, georef, land, water, col, row)
                result[ref] = biome_core.classify_cell(
                    override=override, district_kind=district_kind,
                    is_water=measured["is_water"], shore=measured["shore"])
            else:
                measured = _measure_cell(conn, georef, land, water, col, row)
                result[ref] = biome_core.classify_cell(district_kind=district_kind, **measured)
    return result


def build_and_cache(cache_path=None, **kwargs):
    result = build(**kwargs)
    path = cache_path or CACHE_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"biomes": result}, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    return result


def load_cached(cache_path=None):
    """The cache if it exists, else None -- callers decide whether to build."""
    path = cache_path or CACHE_PATH
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)["biomes"]
