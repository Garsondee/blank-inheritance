"""The campaign map's georeference -- pixels to places.

Two things are being held up here.

1. **The import of citymap.frame still resolves and still means what it meant.**
   tools/city-map is retired as a renderer, and a retired tree is exactly the
   kind of thing that gets moved or pruned. If that happens, this suite fails
   immediately and loudly rather than the gazetteer quietly returning
   coordinates in the sea.

2. **The rotation is applied, in both directions.** The page is turned 31
   degrees. Every bug this module could plausibly have -- a dropped rotation, a
   sign error, a y-flip, the margin counted twice -- shows up as a landmark in
   the wrong place or a bearing a third of a quadrant out. The checks below are
   built from real Kobe coordinates whose relationships are known independently
   of this code: Shin-Kobe Station is north-northeast of the Port Tower and
   about 2.7 km away, whatever the picture is doing.

The bearing case is the sharpest of them. On the rotated page Shin-Kobe is up
and to the LEFT of the Port Tower, so any implementation that measures the
angle in page space rather than in the projection reports north-west and looks
perfectly reasonable while being 50 degrees wrong.
"""

import copy
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core.georef import MANIFEST_PATH, GeorefError, MapGeoref  # noqa: E402

# Real Kobe, WGS84. Relationships between these are facts about the world, not
# about this code -- which is what makes them usable as a check on it.
PORT_TOWER = (135.1876, 34.6825)
SHIN_KOBE = (135.1975, 34.7062)
SANNOMIYA = (135.1955, 34.6947)
FRAME_CENTRE = (135.205, 34.678)


def load_manifest():
    with open(MANIFEST_PATH, encoding="utf-8") as fh:
        return json.load(fh)


class TestLoading(unittest.TestCase):
    def test_manifest_loads_and_the_frame_resolves(self):
        g = MapGeoref.load()
        self.assertEqual(g.frame.id, "kurose-12km")
        self.assertEqual(g.frame.crs_epsg, 6674)
        self.assertAlmostEqual(g.frame.rotation_deg, 31.0)

    def test_metres_per_pixel_is_derived_from_the_frame_not_asserted(self):
        """1 m/px is not a constant anyone typed -- it falls out of a 12000 m
        page over a 12000 px content area. If either changes, this changes."""
        g = MapGeoref.load()
        self.assertAlmostEqual(g.metres_per_px,
                               g.frame.extent_m / g.content_w, places=12)
        self.assertAlmostEqual(g.metres_per_px, 1.0, places=12)

    def test_a_manifest_that_disagrees_with_its_frame_is_rejected(self):
        m = load_manifest()
        m["metresPerPixel"] = 0.5
        with self.assertRaises(GeorefError):
            MapGeoref(m, MapGeoref.load().frame)

    def test_inconsistent_border_and_content_are_rejected(self):
        m = load_manifest()
        m["image"]["width"] = 12401
        with self.assertRaises(GeorefError):
            MapGeoref(m, MapGeoref.load().frame)

    def test_a_grid_that_does_not_fill_the_content_area_is_rejected(self):
        m = load_manifest()
        m["grid"]["cols"] = 59
        with self.assertRaises(GeorefError):
            MapGeoref(m, MapGeoref.load().frame)


class TestRoundTrips(unittest.TestCase):
    def setUp(self):
        self.g = MapGeoref.load()

    def test_lonlat_round_trips_through_image_pixels(self):
        for lon, lat in (PORT_TOWER, SHIN_KOBE, SANNOMIYA, FRAME_CENTRE):
            x, y = self.g.lonlat_to_image_px(lon, lat)
            back_lon, back_lat = self.g.image_px_to_lonlat(x, y)
            self.assertAlmostEqual(back_lon, lon, places=9)
            self.assertAlmostEqual(back_lat, lat, places=9)

    def test_image_pixels_round_trip_through_lonlat(self):
        for x, y in ((200, 200), (6200, 6200), (12199, 12199), (4573.5, 6580.5)):
            lon, lat = self.g.image_px_to_lonlat(x, y)
            bx, by = self.g.lonlat_to_image_px(lon, lat)
            self.assertAlmostEqual(bx, x, places=6)
            self.assertAlmostEqual(by, y, places=6)

    def test_source_crs_round_trips(self):
        for x, y in ((1000, 1000), (6200, 6200), (11000, 3000)):
            sx, sy = self.g.image_px_to_source(x, y)
            bx, by = self.g.source_to_image_px(sx, sy)
            self.assertAlmostEqual(bx, x, places=6)
            self.assertAlmostEqual(by, y, places=6)

    def test_the_frame_centre_lands_on_the_content_areas_centre(self):
        x, y = self.g.lonlat_to_image_px(*FRAME_CENTRE)
        self.assertAlmostEqual(x, 200 + 6000, places=6)
        self.assertAlmostEqual(y, 200 + 6000, places=6)


class TestRotationIsReallyApplied(unittest.TestCase):
    def setUp(self):
        self.g = MapGeoref.load()

    def test_landmarks_land_where_they_should_on_the_page(self):
        """Shin-Kobe Station sits at the foot of the mountains, which on this
        page is up and to the left of the harbour. The Port Tower is on the
        water. If the rotation were dropped, these would swap their relative
        placement on the page while keeping the same lon/lat."""
        tower = self.g.lonlat_to_image_px(*PORT_TOWER)
        station = self.g.lonlat_to_image_px(*SHIN_KOBE)
        self.assertLess(station[1], tower[1], "the station must be higher on the page")
        self.assertLess(station[0], tower[0], "and to the left of the tower")

    def test_true_bearing_is_measured_in_the_projection_not_on_the_page(self):
        """The sharp one. On the page Shin-Kobe is up-LEFT of the Port Tower,
        so a bearing taken from pixel deltas reads roughly north-west. The true
        bearing is north-northeast. A 31 degree page rotation is exactly the
        size of error that looks plausible and is completely wrong."""
        tower = self.g.lonlat_to_image_px(*PORT_TOWER)
        station = self.g.lonlat_to_image_px(*SHIN_KOBE)
        bearing = self.g.bearing_deg(tower, station)
        self.assertTrue(5.0 < bearing < 35.0,
                        "expected roughly NNE, got %.1f degrees" % bearing)
        self.assertEqual(self.g.compass_point(bearing), "north-northeast")

    def test_compass_points_cover_the_circle(self):
        self.assertEqual(self.g.compass_point(0.0), "north")
        self.assertEqual(self.g.compass_point(90.0), "east")
        self.assertEqual(self.g.compass_point(180.0), "south")
        self.assertEqual(self.g.compass_point(270.0), "west")
        self.assertEqual(self.g.compass_point(359.9), "north")
        self.assertEqual(self.g.compass_point(360.0), "north")


class TestMeasurement(unittest.TestCase):
    def setUp(self):
        self.g = MapGeoref.load()

    def test_distance_matches_the_real_world(self):
        """Port Tower to Shin-Kobe Station is about 2.7 km on the ground."""
        a = self.g.lonlat_to_image_px(*PORT_TOWER)
        b = self.g.lonlat_to_image_px(*SHIN_KOBE)
        self.assertAlmostEqual(self.g.distance_m(a, b), 2750, delta=150)

    def test_one_cell_is_two_hundred_metres(self):
        """The number the whole grid scheme rests on, measured rather than
        assumed: adjacent cell origins are 200 m apart."""
        self.assertAlmostEqual(self.g.distance_m((200, 200), (400, 200)), 200.0, places=6)
        self.assertAlmostEqual(self.g.distance_m((200, 200), (200, 400)), 200.0, places=6)

    def test_a_major_square_is_two_kilometres(self):
        self.assertAlmostEqual(self.g.distance_m((200, 200), (2200, 200)), 2000.0, places=6)


class TestCalibration(unittest.TestCase):
    def test_exact_mode_is_the_identity(self):
        g = MapGeoref.load()
        self.assertEqual(g.image_to_content(200, 200), (0.0, 0.0))
        self.assertEqual(g.image_to_content(1200, 700), (1000.0, 500.0))

    def test_an_affine_correction_is_applied_and_inverted(self):
        """A 1.002 scale with a 3 px shift -- the shape a Photoshop resample
        would leave. It must apply going out and invert coming back, or a
        correction would quietly double."""
        m = copy.deepcopy(load_manifest())
        m["calibration"] = {"mode": "affine",
                            "matrix": [1.002, 0.0, 3.0, 0.0, 1.002, -2.0]}
        g = MapGeoref(m, MapGeoref.load().frame)
        self.assertAlmostEqual(g.image_to_content(200, 200)[0], 3.0, places=9)
        self.assertAlmostEqual(g.image_to_content(200, 200)[1], -2.0, places=9)
        for x, y in ((1000, 1000), (6200, 6200), (11500, 900)):
            cx, cy = g.image_to_content(x, y)
            bx, by = g.content_to_image(cx, cy)
            self.assertAlmostEqual(bx, x, places=6)
            self.assertAlmostEqual(by, y, places=6)

    def test_an_unknown_calibration_mode_is_rejected(self):
        m = copy.deepcopy(load_manifest())
        m["calibration"] = {"mode": "polynomial"}
        with self.assertRaises(GeorefError):
            MapGeoref(m, MapGeoref.load().frame)

    def test_affine_mode_without_a_matrix_is_rejected(self):
        m = copy.deepcopy(load_manifest())
        m["calibration"] = {"mode": "affine", "matrix": None}
        with self.assertRaises(GeorefError):
            MapGeoref(m, MapGeoref.load().frame)


class TestControlPoints(unittest.TestCase):
    """The manifest's control points are the calibration, written down.

    Registration itself was confirmed by eye on 2026-09-11 -- the calibration
    overlay drew the real world's buildings and roads over the painted map at
    1:1 and they sat on top of each other. That check cannot be automated,
    because the map is a painting.

    What CAN be automated is that the transform which produced those pixel
    positions still produces them. If frame.py changes, if the manifest's
    border or extent is edited, if pyproj resolves EPSG:6674 differently after
    an upgrade, these move and this fails -- which is the loud failure that
    stops a silently mislocated map.
    """

    def test_recorded_control_points_still_project_where_they_did(self):
        g = MapGeoref.load()
        cps = g.manifest["calibration"]["controlPoints"]
        self.assertGreaterEqual(len(cps), 3, "keep at least three, spread out")
        for cp in cps:
            with self.subTest(label=cp["label"]):
                x, y = g.lonlat_to_image_px(*cp["lonLat"])
                # 0.01 px is the precision the manifest records them to; 1 px
                # would be 1 m of real drift, which is already too much to let
                # through unnoticed.
                self.assertAlmostEqual(x, cp["imagePx"][0], delta=0.01)
                self.assertAlmostEqual(y, cp["imagePx"][1], delta=0.01)

    def test_control_points_are_spread_across_the_map(self):
        """Three points in one corner would fit any affine perfectly and prove
        nothing about the rest of the page."""
        g = MapGeoref.load()
        xs = [cp["imagePx"][0] for cp in g.manifest["calibration"]["controlPoints"]]
        ys = [cp["imagePx"][1] for cp in g.manifest["calibration"]["controlPoints"]]
        self.assertGreater(max(xs) - min(xs), 1000, "control points too close in x")
        self.assertGreater(max(ys) - min(ys), 1000, "control points too close in y")

    def test_exact_calibration_means_no_matrix(self):
        g = MapGeoref.load()
        cal = g.manifest["calibration"]
        if cal["mode"] == "exact":
            self.assertIsNone(cal["matrix"],
                              "an exact calibration must not carry a stale matrix")


class TestGridIntegration(unittest.TestCase):
    def setUp(self):
        self.g = MapGeoref.load()

    def test_ref_at_uses_the_manifests_own_geometry(self):
        self.assertEqual(self.g.ref_at(4573, 6580), "C4·11")
        self.assertEqual(self.g.ref_at(200, 200), "A1·00")
        self.assertEqual(self.g.ref_at(12199, 12199), "F6·99")

    def test_contains_image_px_excludes_the_painted_margin(self):
        self.assertTrue(self.g.contains_image_px(200, 200))
        self.assertTrue(self.g.contains_image_px(12199, 12199))
        self.assertFalse(self.g.contains_image_px(199, 200))
        self.assertFalse(self.g.contains_image_px(12200, 6200))


if __name__ == "__main__":
    unittest.main()
