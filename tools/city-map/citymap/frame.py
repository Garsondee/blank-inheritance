"""Frame and Tile -- the coordinate model for the whole renderer.

Three coordinate spaces, and keeping them straight is most of the correctness
of this tool (design/map-generation.md §10 lists coordinate systems as a named
risk that "bites silently"):

  SOURCE   projected metres in the frame's CRS (EPSG:6674 for Kurose -- JGD2011
           Japan Plane Rectangular Zone VI). Unrotated. This is the space OSM
           and the DEM arrive in, and the ONLY space stable ids are derived in
           (see ids.py) -- so that re-framing the map never renames a feature.

  MAP      source, rotated by `rotation_deg` about the frame centre. This is
           "our own world frame" from §4's stage B: north-up on the page, real
           north pointing wherever the rotation put it. Axis-aligned to the
           output square, so clipping is a plain box intersection.

  PIXEL    per-TILE, not per-frame. A Tile owns its own pixel origin and scale.

The Tile split is what makes previewing and the §8 3x3 export the same code
path. A preview is one small tile; the delivered map is nine big ones; a
composition check is one downsampled tile covering the whole frame. There is
deliberately no separate "preview renderer" -- that is the classic way a
preview drifts out of sync with the real render until nobody trusts it.

It is also the memory fix. Rendering the full 12 km frame at 0.586 m/px with
2x supersampling means a 20480^2 canvas: a single float32 RGB pass over that is
5.03 GB, measured, on a machine with ~5 GB free -- so most of the old 10-12
minute render was page-file thrashing, not arithmetic. Four 10240^2 quadrant
tiles do identical work at 1.26 GB per pass.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field
from typing import Iterable, Tuple

from pyproj import Transformer
from shapely.geometry import Polygon

# numpy is a core dependency of the whole pipeline (arrays are the DEM/field
# representation everywhere downstream); imported here only for
# `to_source_array`'s vectorised rotation.
import numpy as np

# Bumped by hand when a change to this module invalidates cached artifacts
# derived from it. Deliberately NOT a hash of the source file: a comment edit
# must not nuke a ten-minute cache, or people start disabling the check.
STAGE_CODE_VERSION = 1

WGS84 = "EPSG:4326"


@dataclass(frozen=True)
class Frame:
    """A map frame: where the city is, how it is oriented, how big the page is."""

    id: str
    center_lon: float
    center_lat: float
    rotation_deg: float
    extent_m: float
    crs_epsg: int
    dem_grid: int = 2048
    dem_zoom: int = 15
    dem_source: str = "gsi-japan"
    light_azimuth_deg: float = 315.0
    light_altitude_deg: float = 14.0

    # Derived, built in __post_init__ (frozen dataclass -> object.__setattr__).
    fwd: Transformer = field(init=False, repr=False, compare=False)
    inv: Transformer = field(init=False, repr=False, compare=False)
    cx: float = field(init=False, repr=False, compare=False)
    cy: float = field(init=False, repr=False, compare=False)

    def __post_init__(self):
        fwd = Transformer.from_crs(WGS84, f"EPSG:{self.crs_epsg}", always_xy=True)
        inv = Transformer.from_crs(f"EPSG:{self.crs_epsg}", WGS84, always_xy=True)
        cx, cy = fwd.transform(self.center_lon, self.center_lat)
        object.__setattr__(self, "fwd", fwd)
        object.__setattr__(self, "inv", inv)
        object.__setattr__(self, "cx", cx)
        object.__setattr__(self, "cy", cy)

    # --- loading ---------------------------------------------------------

    @classmethod
    def from_file(cls, path: str) -> "Frame":
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
        return cls.from_dict(raw)

    @classmethod
    def from_dict(cls, raw: dict) -> "Frame":
        light = raw.get("light", {})
        dem = raw.get("dem", {})
        return cls(
            id=raw["id"],
            center_lon=float(raw["center"]["lon"]),
            center_lat=float(raw["center"]["lat"]),
            rotation_deg=float(raw["rotationDeg"]),
            extent_m=float(raw["extentM"]),
            crs_epsg=int(raw["crsEpsg"]),
            dem_grid=int(dem.get("grid", 2048)),
            dem_zoom=int(dem.get("zoom", 15)),
            dem_source=dem.get("source", "gsi-japan"),
            light_azimuth_deg=float(light.get("azimuthDeg", 315.0)),
            light_altitude_deg=float(light.get("altitudeDeg", 14.0)),
        )

    def cache_key_parts(self) -> dict:
        """The subset of config that frame-derived cache artifacts depend on.

        Floats are formatted to fixed precision so that 31.0 and 31.000000001
        cannot produce two different cache entries for the same frame, and so
        the key is stable across platforms. The CRS code is included
        deliberately: Japan has 19 plane-rectangular zones and a cache keyed
        without it is a landmine (§10).
        """
        return {
            "frameId": self.id,
            "centerLon": f"{self.center_lon:.9f}",
            "centerLat": f"{self.center_lat:.9f}",
            "rotationDeg": f"{self.rotation_deg:.9f}",
            "extentM": f"{self.extent_m:.6f}",
            "crsEpsg": self.crs_epsg,
            "demGrid": self.dem_grid,
            "demZoom": self.dem_zoom,
            "demSource": self.dem_source,
            "frameCodeVersion": STAGE_CODE_VERSION,
        }

    # --- source <-> map --------------------------------------------------

    def to_map(self, x: float, y: float) -> Tuple[float, float]:
        """Source CRS -> map space (rotate about the frame centre)."""
        r = math.radians(self.rotation_deg)
        dx, dy = x - self.cx, y - self.cy
        c, s = math.cos(r), math.sin(r)
        return (self.cx + dx * c - dy * s, self.cy + dx * s + dy * c)

    def to_source(self, mx: float, my: float) -> Tuple[float, float]:
        """Map space -> source CRS (the inverse rotation)."""
        r = math.radians(-self.rotation_deg)
        dx, dy = mx - self.cx, my - self.cy
        c, s = math.cos(r), math.sin(r)
        return (self.cx + dx * c - dy * s, self.cy + dx * s + dy * c)

    def to_source_array(self, mx, my):
        """Vectorised `to_source`, for a whole DEM grid at once.

        Deliberately the SAME formula as the scalar version, just applied to
        numpy arrays -- kept as one method rather than a second hand-written
        implementation in acquire.py, so the two paths cannot drift apart on a
        sign error the way terrain.py's map-space/array-space axis mismatch
        did (see terrain.py's horizon_shadow docstring).
        """
        r = math.radians(-self.rotation_deg)
        dx, dy = mx - self.cx, my - self.cy
        c, s = math.cos(r), math.sin(r)
        return (self.cx + dx * c - dy * s, self.cy + dx * s + dy * c)

    def lonlat_to_map(self, lon: float, lat: float) -> Tuple[float, float]:
        """WGS84 -> map space. The path an operation-log anchor takes.

        Ops store lon/lat precisely so they survive re-framing: rotation,
        extent and centre have all changed repeatedly during art direction,
        and map-space coordinates would silently relocate every recorded
        operation each time.
        """
        return self.to_map(*self.fwd.transform(lon, lat))

    def map_to_lonlat(self, mx: float, my: float) -> Tuple[float, float]:
        return self.inv.transform(*self.to_source(mx, my))

    # --- the page --------------------------------------------------------

    @property
    def origin(self) -> Tuple[float, float]:
        """Map-space (min x, min y) of the full page square."""
        half = self.extent_m / 2.0
        return (self.cx - half, self.cy - half)

    def map_corners(self) -> list:
        """The page square's corners in MAP space, counter-clockwise."""
        half = self.extent_m / 2.0
        return [
            (self.cx - half, self.cy - half),
            (self.cx + half, self.cy - half),
            (self.cx + half, self.cy + half),
            (self.cx - half, self.cy + half),
        ]

    def source_corners(self, pad_m: float = 0.0) -> list:
        """The page square's corners back in SOURCE space (a tilted quad).

        With `pad_m`, the quad is grown first in map space, which is the right
        order -- growing after rotation would skew the padding.
        """
        half = self.extent_m / 2.0 + pad_m
        corners = [
            (self.cx - half, self.cy - half),
            (self.cx + half, self.cy - half),
            (self.cx + half, self.cy + half),
            (self.cx - half, self.cy + half),
        ]
        return [self.to_source(mx, my) for mx, my in corners]

    def source_bbox(self, pad_m: float = 0.0) -> Tuple[float, float, float, float]:
        """Axis-aligned SOURCE-space bbox enclosing the (rotated) page."""
        pts = self.source_corners(pad_m)
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return (min(xs), min(ys), max(xs), max(ys))

    def classification_boundary(self, margin: float = 1.0) -> Polygon:
        """A SOURCE-CRS square for sea classification, independent of rotation.

        `source_corners`/`source_bbox` circumscribe the frame's actual rotated
        footprint, so their extent silently changes with `rotation_deg` -- fine
        for an OSM fetch padding, wrong for something meant to be a stable cache
        boundary. This is a plain axis-aligned square centred at (cx, cy) with
        half-width `extent_m * margin`, built from centre and extent alone.
        margin=1.0 comfortably contains any rotation of the true frame (whose
        furthest corner is only ~0.71x extent_m from centre).

        Still depends on centre and extent, not truly frame-independent in
        every sense -- moving or resizing the city is a rarer edit than
        nudging its rotation for framing, which is the coupling this actually
        needed to break. See world.py for where this is used and why.
        """
        half = self.extent_m * margin
        return Polygon([
            (self.cx - half, self.cy - half), (self.cx + half, self.cy - half),
            (self.cx + half, self.cy + half), (self.cx - half, self.cy + half),
        ])

    def fetch_bbox_lonlat(self, margin: float = 1.0, pad_m: float = 0.0
                          ) -> Tuple[float, float, float, float]:
        """(south, west, north, east) for an Overpass fetch, derived from the
        ROTATION-INDEPENDENT `classification_boundary` rather than the rotated
        frame footprint.

        This is the bbox `world.fetch_and_build_world` must use. Using
        `lonlat_bbox` (below) here instead was a real bug caught by
        `test_world.TestFrameIndependence`: `lonlat_bbox` circumscribes the
        frame's actual TILTED square, so it silently grows and shrinks with
        `rotation_deg` -- exactly the coupling this whole module exists to
        avoid, and it would have made every re-rotation during an
        art-direction session pay for a fresh Overpass fetch.
        """
        boundary = self.classification_boundary(margin=margin)
        if pad_m:
            boundary = boundary.buffer(pad_m, join_style="mitre")
        minx, miny, maxx, maxy = boundary.bounds
        corners = [(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy)]
        lonlats = [self.inv.transform(x, y) for x, y in corners]
        lons = [p[0] for p in lonlats]
        lats = [p[1] for p in lonlats]
        return (min(lats), min(lons), max(lats), max(lons))

    def lonlat_bbox(self, pad_m: float = 0.0) -> Tuple[float, float, float, float]:
        """(south, west, north, east) in WGS84, circumscribing this frame's
        ACTUAL rotated footprint -- varies with `rotation_deg`.

        For "what does this specific frame cover", e.g. a display label. For
        an Overpass fetch that should survive re-rotation, use
        `fetch_bbox_lonlat` instead -- see its docstring for why this one is
        the wrong choice there.
        """
        minx, miny, maxx, maxy = self.source_bbox(pad_m)
        corners = [(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy)]
        lonlats = [self.inv.transform(x, y) for x, y in corners]
        lons = [p[0] for p in lonlats]
        lats = [p[1] for p in lonlats]
        return (min(lats), min(lons), max(lats), max(lons))

    # --- tiling ----------------------------------------------------------

    def full_tile(self, px: int, supersample: int = 1) -> "Tile":
        """One tile covering the entire page -- the composition-check view."""
        ox, oy = self.origin
        return Tile(self, ox, oy, self.extent_m, px, supersample)

    def grid_tiles(self, n: int, px_per_tile: int, supersample: int = 1) -> list:
        """An n x n grid of tiles covering the page. §8 wants 3x3 at 8192."""
        ox, oy = self.origin
        step = self.extent_m / n
        out = []
        for row in range(n):
            for col in range(n):
                out.append(Tile(
                    self,
                    ox + col * step,
                    oy + (n - 1 - row) * step,  # row 0 = top of the page
                    step, px_per_tile, supersample,
                ))
        return out

    def window_tile(self, lon: float, lat: float, extent_m: float,
                    mpp: float, supersample: int = 1) -> "Tile":
        """A preview window centred on a lon/lat, at a CHOSEN metres-per-pixel.

        Specifying mpp rather than a pixel count is deliberate: a preview must
        render at the same scale as the final map or its ink weights lie. See
        style.py -- every stroke width is in metres, so identical mpp means
        identical apparent weight, and a preview tuned at the wrong scale would
        produce an ink hierarchy that does not exist in the delivered render.
        """
        mx, my = self.lonlat_to_map(lon, lat)
        px = max(1, int(round(extent_m / mpp)))
        # Snap the EXTENT to a whole number of pixels rather than letting mpp
        # drift to fit the requested extent. A pixel count must be an integer,
        # so one of the two has to give -- and mpp is the one that must not,
        # because every style width divides by it. Letting the window come out
        # a fraction of a metre bigger or smaller is invisible; letting mpp
        # drift makes the preview's ink weights disagree with the real render,
        # which is the exact failure this whole design avoids.
        snapped_extent = px * mpp
        half = snapped_extent / 2.0
        return Tile(self, mx - half, my - half, snapped_extent, px, supersample)

    def window_grid_tiles(self, lon: float, lat: float, extent_m: float,
                          n: int, px_per_tile: int, supersample: int = 1) -> list:
        """The windowed analogue of `grid_tiles`: an n x n grid tiling a
        SQUARE WINDOW centred on lon/lat, instead of the whole frame page.

        Exists so a high-resolution tiled render can be scoped to one area
        of interest instead of always paying for (and waiting on) every
        tile of the full frame -- the editor's "Full" render mode used to
        have no crop option at all, which is exactly the "trying to render
        the entire island" bug report this was added for. Memory reasoning
        is identical to `grid_tiles`/`full_tile`'s (module docstring):
        splitting into an n x n grid keeps the per-tile working canvas the
        limiting size, not the window's total resolution.
        """
        mx, my = self.lonlat_to_map(lon, lat)
        half = extent_m / 2.0
        ox, oy = mx - half, my - half
        step = extent_m / n
        out = []
        for row in range(n):
            for col in range(n):
                out.append(Tile(
                    self,
                    ox + col * step,
                    oy + (n - 1 - row) * step,  # row 0 = top of the window
                    step, px_per_tile, supersample,
                ))
        return out


@dataclass(frozen=True)
class Tile:
    """A rectangular piece of the page, rendered independently."""

    frame: Frame
    origin_x: float      # map-space x of the tile's left edge
    origin_y: float      # map-space y of the tile's BOTTOM edge
    extent_m: float      # tile side, metres
    px_out: int          # tile side, output pixels
    supersample: int = 1

    @property
    def px(self) -> int:
        """Working canvas side, before the final downsample."""
        return self.px_out * self.supersample

    @property
    def mpp(self) -> float:
        """Metres per WORKING pixel -- the number every style width divides by."""
        return self.extent_m / self.px

    @property
    def mpp_out(self) -> float:
        """Metres per OUTPUT pixel, after downsampling."""
        return self.extent_m / self.px_out

    def to_px(self, mx: float, my: float) -> Tuple[float, float]:
        """Map space -> this tile's working pixel space (y flipped for raster)."""
        scale = self.px / self.extent_m
        return ((mx - self.origin_x) * scale,
                (self.origin_y + self.extent_m - my) * scale)

    def px_to_map(self, x: float, y: float) -> Tuple[float, float]:
        scale = self.extent_m / self.px
        return (self.origin_x + x * scale,
                self.origin_y + self.extent_m - y * scale)

    def bounds_map(self) -> Tuple[float, float, float, float]:
        return (self.origin_x, self.origin_y,
                self.origin_x + self.extent_m, self.origin_y + self.extent_m)

    def page_px_origin(self, page_px: int) -> Tuple[float, float]:
        """This tile's origin expressed in FULL-PAGE pixel coordinates.

        Required for anything whose value must be continuous across a tile
        seam -- paper grain, vignette, the dappled cloud shadow. Those are
        currently generated per-canvas from a fresh RNG, which per-tile would
        produce different noise at different offsets and leave visible seams in
        the 3x3 export. Sampling them as a function of absolute page position
        instead makes them tile-invariant.
        """
        fox, foy = self.frame.origin
        scale = page_px / self.frame.extent_m
        return ((self.origin_x - fox) * scale,
                (foy + self.frame.extent_m - (self.origin_y + self.extent_m)) * scale)

    def contains_map(self, mx: float, my: float) -> bool:
        return (self.origin_x <= mx <= self.origin_x + self.extent_m
                and self.origin_y <= my <= self.origin_y + self.extent_m)
