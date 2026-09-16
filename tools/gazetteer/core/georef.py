"""Binds the campaign map's raster to real coordinates.

The map is a hand-finished Photoshop raster now, not a render -- but it was
exported from a render whose frame is still on disk, and that frame is what
makes a pixel on the picture mean a place on the Earth. Three spaces:

    IMAGE PX    the 12400x12400 PNG, origin top-left, y down. What the browser
                draws in and what a grid reference names.
    CONTENT PX  the same, minus the 200 px painted margin. 12000x12000 at
                exactly 1 m/px, so it is also the frame's page square.
    SOURCE      projected metres, EPSG:6674. What the GeoPackage stores, and
                therefore the space every real-world lookup happens in.
    WGS84       lon/lat. What a location's geometry is CANONICALLY stored as,
                per design/map-generation.md: "Op coordinates are lon/lat, not
                world-frame [x,y]" -- a rule that doc says was burned once
                already, when a re-framed map silently detached every recorded
                operation from its intended place.

The rotation is the part that catches people. The page is turned 31 degrees, so
lat/lon does NOT interpolate linearly across the image; a naive corner-to-corner
lerp is out by roughly 4 km at the edges. `citymap.frame.Frame` already does the
rotation correctly in both directions and is covered by that tool's own tests,
so this module IMPORTS it rather than restating the maths. A second hand-written
copy of a rotation is exactly how a sign error gets in.

That import is a real dependency on tools/city-map, which is retired as a
renderer but not as geometry. It is deliberate, and test_georef.py asserts both
that the import resolves and that the transform still produces known values --
so if that tree ever moves, this fails loudly and immediately rather than
quietly returning coordinates in the sea.
"""

from __future__ import annotations

import json
import math
import os
import sys

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_CITY_MAP = os.path.join(_REPO_ROOT, "tools", "city-map")
if _CITY_MAP not in sys.path:
    sys.path.insert(0, _CITY_MAP)

from citymap.frame import Frame  # noqa: E402

from . import grid  # noqa: E402

MANIFEST_PATH = os.path.join(_REPO_ROOT, "data", "map", "campaign-map.json")


class GeorefError(RuntimeError):
    """The manifest and the frame disagree, or the manifest is unusable."""


class MapGeoref:
    """Everything needed to turn a pixel on the campaign map into a place.

    Construct with `MapGeoref.load()` in normal use. The constructor takes the
    manifest dict and a Frame directly so tests can build one without touching
    the repo.
    """

    def __init__(self, manifest, frame):
        self.manifest = manifest
        self.frame = frame

        self.border_px = int(manifest["border"]["px"])
        self.content_w = int(manifest["content"]["width"])
        self.content_h = int(manifest["content"]["height"])
        self.image_w = int(manifest["image"]["width"])
        self.image_h = int(manifest["image"]["height"])

        g = manifest["grid"]
        self.cell_px = int(g["cellPx"])
        self.cols = int(g["cols"])
        self.rows = int(g["rows"])
        self.separator = g.get("separator", grid.SEPARATOR)

        if self.content_w != self.content_h:
            raise GeorefError("the content area must be square; the frame page is")
        if self.image_w != self.content_w + 2 * self.border_px:
            raise GeorefError(
                "image width %d != content %d + 2 x border %d"
                % (self.image_w, self.content_w, self.border_px))
        if self.cols * self.cell_px != self.content_w:
            raise GeorefError(
                "%d columns of %d px do not fill a %d px content area"
                % (self.cols, self.cell_px, self.content_w))

        # One tile covering the whole page, at the content area's resolution.
        # `Tile.mpp_out` is then the map's true metres-per-pixel -- derived, not
        # asserted, so a re-export at a different size stays correct.
        self.tile = frame.full_tile(self.content_w)
        self.metres_per_px = self.tile.mpp_out

        declared = manifest.get("metresPerPixel")
        if declared is not None and abs(declared - self.metres_per_px) > 1e-9:
            raise GeorefError(
                "manifest says %s m/px but frame extent %s over %d px gives %s"
                % (declared, frame.extent_m, self.content_w, self.metres_per_px))

        self._a, self._b, self._c, self._d, self._e, self._f = _calibration_affine(manifest)

    # --- construction --------------------------------------------------------

    @classmethod
    def load(cls, manifest_path=MANIFEST_PATH):
        with open(manifest_path, encoding="utf-8") as fh:
            manifest = json.load(fh)
        frame_ref = manifest["frameRef"]
        frame_path = os.path.join(os.path.dirname(os.path.abspath(manifest_path)),
                                  "frames", frame_ref + ".json")
        if not os.path.exists(frame_path):
            raise GeorefError("frameRef %r has no file at %s" % (frame_ref, frame_path))
        return cls(manifest, Frame.from_file(frame_path))

    # --- image px <-> content px --------------------------------------------

    def image_to_content(self, x, y):
        """Strip the painted margin, then apply the calibration affine.

        The affine is the identity unless calibration found the Photoshop
        master had drifted off the frame page (a crop, a resample). Keeping it
        here rather than in the manifest consumer means every caller gets the
        correction whether it remembers to or not.
        """
        cx = x - self.border_px
        cy = y - self.border_px
        return (self._a * cx + self._b * cy + self._c,
                self._d * cx + self._e * cy + self._f)

    def content_to_image(self, cx, cy):
        det = self._a * self._e - self._b * self._d
        if det == 0:
            raise GeorefError("calibration affine is not invertible")
        ix = (self._e * (cx - self._c) - self._b * (cy - self._f)) / det
        iy = (-self._d * (cx - self._c) + self._a * (cy - self._f)) / det
        return (ix + self.border_px, iy + self.border_px)

    # --- image px <-> the world ---------------------------------------------

    def image_px_to_source(self, x, y):
        """Image pixel -> projected metres in the frame's CRS (EPSG:6674).

        This is the one to use for GeoPackage queries: its geometry is stored
        in source CRS, so going via lon/lat and back would cost two extra
        projections and a little precision for nothing.
        """
        cx, cy = self.image_to_content(x, y)
        return self.frame.to_source(*self.tile.px_to_map(cx, cy))

    def source_to_image_px(self, sx, sy):
        mx, my = self.frame.to_map(sx, sy)
        return self.content_to_image(*self.tile.to_px(mx, my))

    def image_px_to_lonlat(self, x, y):
        cx, cy = self.image_to_content(x, y)
        return self.frame.map_to_lonlat(*self.tile.px_to_map(cx, cy))

    def lonlat_to_image_px(self, lon, lat):
        mx, my = self.frame.lonlat_to_map(lon, lat)
        return self.content_to_image(*self.tile.to_px(mx, my))

    # --- rings ---------------------------------------------------------------

    def ring_to_lonlat(self, ring_px):
        return [list(self.image_px_to_lonlat(x, y)) for x, y in ring_px]

    def ring_to_image_px(self, ring_lonlat):
        return [list(self.lonlat_to_image_px(lon, lat)) for lon, lat in ring_lonlat]

    def ring_to_source(self, ring_px):
        return [self.image_px_to_source(x, y) for x, y in ring_px]

    # --- the grid ------------------------------------------------------------

    def _grid_kw(self):
        return dict(border=self.border_px, cell=self.cell_px,
                    cols=self.cols, rows=self.rows)

    def ref_at(self, x, y):
        """Image pixel -> grid reference string."""
        return grid.image_px_to_ref(x, y, separator=self.separator, **self._grid_kw())

    def refs_for_ring(self, ring_px):
        return grid.refs_touched(ring_px, separator=self.separator, **self._grid_kw())

    def coverage_for_ring(self, ring_px):
        return grid.cell_coverage(ring_px, **self._grid_kw())

    def contains_image_px(self, x, y):
        """Is this pixel inside the content area (i.e. on the map, not the margin)?"""
        return (self.border_px <= x < self.border_px + self.content_w
                and self.border_px <= y < self.border_px + self.content_h)

    # --- measurement ---------------------------------------------------------

    def distance_m(self, a_px, b_px):
        """Ground metres between two image pixels.

        Measured in the page's own metric space, not as a great circle. Over a
        12 km square in a plane-rectangular projection those agree to well
        inside the precision anything here cares about, and this way the number
        is consistent with the grid (200 px is 200 m, always).
        """
        ax, ay = self.image_to_content(*a_px)
        bx, by = self.image_to_content(*b_px)
        return math.hypot(bx - ax, by - ay) * self.metres_per_px

    def bearing_deg(self, a_px, b_px):
        """Compass bearing from a to b in TRUE degrees, 0 = north, clockwise.

        The page is rotated 31 degrees, so "up on the picture" is not north.
        Getting this wrong would put every written direction a third of a
        quadrant out, which is the kind of error that survives review because
        it is plausible. Computed in source CRS, where north really is up.
        """
        ax, ay = self.image_px_to_source(*a_px)
        bx, by = self.image_px_to_source(*b_px)
        deg = math.degrees(math.atan2(bx - ax, by - ay))
        return deg + 360.0 if deg < 0 else deg

    @staticmethod
    def compass_point(bearing_deg):
        """A bearing as one of the sixteen points, for prose."""
        names = ("north", "north-northeast", "northeast", "east-northeast",
                 "east", "east-southeast", "southeast", "south-southeast",
                 "south", "south-southwest", "southwest", "west-southwest",
                 "west", "west-northwest", "northwest", "north-northwest")
        return names[int((bearing_deg % 360.0) / 22.5 + 0.5) % 16]


def _calibration_affine(manifest):
    """(a, b, c, d, e, f) mapping raw content px -> corrected content px.

    Identity for mode "exact". For mode "affine" the manifest carries the six
    coefficients fitted from control points during calibration.
    """
    cal = manifest.get("calibration") or {}
    mode = cal.get("mode", "exact")
    if mode == "exact":
        return (1.0, 0.0, 0.0, 0.0, 1.0, 0.0)
    if mode == "affine":
        m = cal.get("matrix")
        if not m or len(m) != 6:
            raise GeorefError("calibration mode 'affine' needs a 6-element matrix")
        return tuple(float(v) for v in m)
    raise GeorefError("unknown calibration mode %r" % (mode,))
