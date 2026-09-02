"""Network acquisition: Overpass (OSM) and GSI DEM tiles, both file-cached.

Split deliberately in two, per design/testing-strategy.md's pure-core rule:
the tile math, URL construction, and GSI's odd CSV-with-'e' parsing are pure
functions and fully unit tested; the actual `urllib` calls are a thin,
untested boundary, same as the adapter layer in `foundry/.../scripts/foundry/`.
Nothing here should grow real logic -- if it can be pure, move it out.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np

STAGE_CODE_VERSION = 1

USER_AGENT = "blank-inheritance-mapgen/0.1 (private TTRPG project)"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

DEM_ZOOM = 15
DEM_DATASETS = ("dem5a", "dem5b")  # GSI convention: a tile is one or the
                                   # other, never both -- a 5a 404 means "try
                                   # 5b", not "retry 5a".
NODATA_MARKER = "e"


# --- Overpass query construction (pure) -----------------------------------

HIGHWAY_CLASSES = (
    "motorway|motorway_link|trunk|trunk_link|primary|primary_link|"
    "secondary|secondary_link|tertiary|tertiary_link|"
    "residential|unclassified|service|living_street|pedestrian|footway|steps"
)


def build_overpass_query(south: float, west: float, north: float, east: float) -> str:
    """The one query every frame issues, over an explicit (S, W, N, E) bbox.

    Includes relation clauses alongside way clauses -- see parse.py's module
    docstring for why relations are not optional (Port Island's coastline
    exists ONLY as a relation).
    """
    bbox = f"{south},{west},{north},{east}"
    return f"""
[out:json][timeout:300];
(
  way["building"]({bbox});
  way["highway"~"^({HIGHWAY_CLASSES})$"]({bbox});
  way["railway"]({bbox});
  way["waterway"]({bbox});
  way["natural"]({bbox});
  way["landuse"]({bbox});
  way["leisure"]({bbox});
  way["aeroway"]({bbox});
  node["highway"="street_lamp"]({bbox});
  relation["landuse"]({bbox});
  relation["leisure"]({bbox});
  relation["natural"]({bbox});
  relation["aeroway"]({bbox});
  relation["place"="island"]({bbox});
);
out body geom;
""".strip()


def overpass_cache_key(query: str) -> str:
    return hashlib.sha1(query.encode("utf-8")).hexdigest()[:16]


def fetch_overpass(query: str, cache_dir: str, timeout: int = 900) -> dict:
    """Overpass JSON, cached by query hash. The one network call per frame."""
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{overpass_cache_key(query)}.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    request = urllib.request.Request(
        OVERPASS_URL, data=query.encode("utf-8"),
        headers={"User-Agent": USER_AGENT})
    raw = urllib.request.urlopen(request, timeout=timeout).read().decode("utf-8")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(raw)
    return json.loads(raw)


# --- GSI DEM tiles ----------------------------------------------------------

def dem_tile_url(dataset: str, z: int, x: int, y: int) -> str:
    return f"https://cyberjapandata.gsi.go.jp/xyz/{dataset}/{z}/{x}/{y}.txt"


def parse_dem_text(raw: str) -> np.ndarray:
    """GSI's tile format: comma-separated rows, 'e' marks no-data.

    Not a standard raster format -- GSI serves elevation as plain CSV text per
    256x256 tile, with the literal character 'e' where there is no survey data
    (mostly water and, per GSI's own documentation, the coast -- which is
    exactly where this pipeline's own routing/sea logic most needs to know the
    difference between "0m" and "unknown").
    """
    rows = raw.strip().split("\n")
    width = len(rows[0].split(","))
    arr = np.full((len(rows), width), np.nan, dtype=np.float32)
    for i, row in enumerate(rows):
        for j, value in enumerate(row.split(",")):
            if value != NODATA_MARKER:
                arr[i, j] = float(value)
    return arr


def fetch_dem_tile(dataset: str, z: int, x: int, y: int, cache_dir: str) -> Optional[np.ndarray]:
    """A 404 here is a stable, permanent fact about this exact tile (GSI's
    own DEM coverage for a fixed geographic square does not change), so it
    is worth caching just as much as a real hit -- confirmed directly
    (2026-08-25) that WITHOUT this, every resync_terrain_from_store call
    (every reclaim/return-to-sea/terrace/etc.) re-attempted a real network
    request for every permanently-missing tile in the frame, every single
    time, with wildly variable real-world latency (0.07s-0.8s per miss
    measured directly, but occasionally much slower depending on live
    network conditions to the real GSI tile server) -- the dominant,
    hard-to-predict source of the "freeze for ages after finishing a
    reclaim" symptom this cache entry fixes. The `.missing` marker is a
    SIBLING file, not a variant `.npy` payload, so `os.path.exists(path)`
    above (the real-data hit path) is untouched either way."""
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{dataset}_{z}_{x}_{y}.npy")
    missing_marker_path = os.path.join(cache_dir, f"{dataset}_{z}_{x}_{y}.missing")
    if os.path.exists(path):
        return np.load(path)
    if os.path.exists(missing_marker_path):
        return None
    request = urllib.request.Request(dem_tile_url(dataset, z, x, y),
                                     headers={"User-Agent": USER_AGENT})
    try:
        raw = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            open(missing_marker_path, "w").close()
            return None
        raise
    arr = parse_dem_text(raw)
    np.save(path, arr)
    return arr


def fetch_dem_tile_cached(z: int, x: int, y: int, cache_dir: str) -> Optional[np.ndarray]:
    for dataset in DEM_DATASETS:
        arr = fetch_dem_tile(dataset, z, x, y, cache_dir)
        if arr is not None:
            return arr
    return None


# --- web mercator tile math (pure) ------------------------------------------

def lonlat_to_tile_frac(lon: np.ndarray, lat: np.ndarray, zoom: int) -> Tuple[np.ndarray, np.ndarray]:
    """Continuous (fractional) web-mercator tile coordinates."""
    n = 2 ** zoom
    x = (lon + 180.0) / 360.0 * n
    lat_rad = np.radians(lat)
    y = (1.0 - np.log(np.tan(lat_rad) + 1.0 / np.cos(lat_rad)) / np.pi) / 2.0 * n
    return x, y


@dataclass
class TileRange:
    tx_min: int
    tx_max: int
    ty_min: int
    ty_max: int

    @property
    def count(self) -> int:
        return (self.tx_max - self.tx_min + 1) * (self.ty_max - self.ty_min + 1)

    @property
    def width_px(self) -> int:
        return (self.tx_max - self.tx_min + 1) * 256

    @property
    def height_px(self) -> int:
        return (self.ty_max - self.ty_min + 1) * 256


def tile_range_for(x_frac: np.ndarray, y_frac: np.ndarray) -> TileRange:
    return TileRange(
        int(np.floor(x_frac.min())), int(np.floor(x_frac.max())),
        int(np.floor(y_frac.min())), int(np.floor(y_frac.max())),
    )


def bilinear_sample(mosaic: np.ndarray, mx: np.ndarray, my: np.ndarray) -> np.ndarray:
    """Bilinear sample of `mosaic` at continuous coords, NaN-propagating.

    If ANY of the 4 corners is no-data, the sample is no-data -- this must not
    smear a real value into a coastline gap, which is exactly where GSI's
    NoData concentrates and exactly where this pipeline needs the boundary to
    stay sharp (terrain.routing_elevation depends on it).
    """
    h, w = mosaic.shape
    mx = np.clip(mx, 0, w - 1.001)
    my = np.clip(my, 0, h - 1.001)
    x0 = np.floor(mx).astype(np.int32)
    y0 = np.floor(my).astype(np.int32)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    fx, fy = mx - x0, my - y0

    v00, v10 = mosaic[y0, x0], mosaic[y0, x1]
    v01, v11 = mosaic[y1, x0], mosaic[y1, x1]
    any_nan = np.isnan(v00) | np.isnan(v10) | np.isnan(v01) | np.isnan(v11)
    value = (v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy)
            + v01 * (1 - fx) * fy + v11 * fx * fy)
    return np.where(any_nan, np.nan, value).astype(np.float32)


def assemble_mosaic(tile_range: TileRange, zoom: int, cache_dir: str) -> Tuple[np.ndarray, int, int]:
    """Fetch every DEM tile in range and lay them into one NaN-filled mosaic."""
    mosaic = np.full((tile_range.height_px, tile_range.width_px), np.nan, dtype=np.float32)
    fetched = missing = 0
    for ty in range(tile_range.ty_min, tile_range.ty_max + 1):
        for tx in range(tile_range.tx_min, tile_range.tx_max + 1):
            arr = fetch_dem_tile_cached(zoom, tx, ty, cache_dir)
            if arr is None:
                missing += 1
                continue
            fetched += 1
            oy = (ty - tile_range.ty_min) * 256
            ox = (tx - tile_range.tx_min) * 256
            mosaic[oy:oy + arr.shape[0], ox:ox + arr.shape[1]] = arr
    return mosaic, fetched, missing


def dem_grid_for_frame(frame, cache_dir: str, grid: Optional[int] = None,
                       zoom: Optional[int] = None) -> Tuple[np.ndarray, int, int]:
    """The frame's elevation array, MAP space, row 0 = north (matches the
    canvas convention -- upsampling this directly onto the raster needs no
    further flip).

    Returns (elevation, tiles_fetched, tiles_missing).
    """
    n = grid or frame.dem_grid
    zoom = zoom or frame.dem_zoom
    ox, oy = frame.origin

    gy, gx = np.mgrid[0:n, 0:n]
    grid_x_map = ox + (gx + 0.5) / n * frame.extent_m
    grid_y_map = oy + frame.extent_m - (gy + 0.5) / n * frame.extent_m

    src_x, src_y = frame.to_source_array(grid_x_map, grid_y_map)
    lon, lat = frame.inv.transform(src_x.ravel(), src_y.ravel())
    lon = np.asarray(lon).reshape(n, n)
    lat = np.asarray(lat).reshape(n, n)

    x_frac, y_frac = lonlat_to_tile_frac(lon, lat, zoom)
    tile_range = tile_range_for(x_frac, y_frac)
    mosaic, fetched, missing = assemble_mosaic(tile_range, zoom, cache_dir)

    mx = (x_frac - tile_range.tx_min) * 256 - 0.5
    my = (y_frac - tile_range.ty_min) * 256 - 0.5
    elevation = bilinear_sample(mosaic, mx, my)
    return elevation, fetched, missing
