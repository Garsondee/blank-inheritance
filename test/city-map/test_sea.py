"""Sea classification tests, covering all three 2026-08-23 regressions plus the
carve-buffer regression found during Milestone 0 review.

  1. coastline-direction alone misses un-coastlined islands
  2. the area-fraction safety net over-corrected and deleted the whole ocean
  3. even point-sampling is face-level and blind to an island with NO
     coastline data, because it was never its own face to begin with
  4. a 6 m carve buffer only seals slivers, not real inter-building gaps

Regressions 1-3 are exercised on synthetic geometry so they run in
milliseconds with no dependency on the cached extract. Regression 3's real
manifestation (Port Island) is additionally checked against the real cache
where available, since that is the case that actually shipped wrong.
"""

import glob
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from pyproj import Transformer  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap import parse, sea  # noqa: E402

FWD = Transformer.from_crs("EPSG:4326", "EPSG:6674", always_xy=True)


def coastline_feature(coords, feature_id="coast"):
    return parse.Feature(id=feature_id, geom=LineString(coords),
                         tags={"natural": "coastline"}, area=False)


def building_feature(square, feature_id="bldg"):
    return parse.Feature(id=feature_id, geom=Polygon(square),
                         tags={"building": "yes"}, area=True)


def square(cx, cy, half):
    return [(cx - half, cy - half), (cx + half, cy - half),
            (cx + half, cy + half), (cx - half, cy + half), (cx - half, cy - half)]


class TestClassifyByCoastline(unittest.TestCase):
    def test_left_of_direction_is_land(self):
        # A coastline running west->east (increasing x): OSM convention puts
        # land to the LEFT of travel, i.e. the north side (+y).
        coast = [LineString([(0, 0), (100, 0)])]
        land_face = Polygon([(0, 10), (100, 10), (100, 50), (0, 50)])
        sea_face = Polygon([(0, -50), (100, -50), (100, -10), (0, -10)])
        self.assertEqual(sea.classify_by_coastline(land_face, coast), "land")
        self.assertEqual(sea.classify_by_coastline(sea_face, coast), "sea")

    def test_reversed_direction_flips_the_answer(self):
        coast = [LineString([(100, 0), (0, 0)])]  # east->west
        north_face = Polygon([(0, 10), (100, 10), (100, 50), (0, 50)])
        self.assertEqual(sea.classify_by_coastline(north_face, coast), "sea")


class TestSafetyNet_Regression1(unittest.TestCase):
    """An island with real land content but NO nearby coastline data."""

    def test_uncoastlined_island_inside_a_sea_face_is_still_sea_at_face_level(self):
        # This is deliberately the failure mode BEFORE the carve-out step:
        # face-level classification alone cannot rescue an island that was
        # never its own face. It should read as sea here...
        boundary = Polygon(square(0, 0, 2000))
        coast = coastline_feature([(-2000, 0), (2000, 0)])  # land is north
        island_buildings = [
            building_feature(square(500, -800, 60), f"b{i}")
            for i in range(8)  # a small cluster in the "sea" half
        ]
        features = [coast] + island_buildings
        result = sea.build_sea_polygon(features, boundary)
        # ...and the carve-out (tested separately below) is what actually
        # rescues it, which is exactly what regression 3's fix does.
        self.assertIsNotNone(result.sea_geom)
        self.assertGreater(result.carved_feature_count, 0,
                           "the island buildings must be carved out of the sea")


class TestAreaFractionRegression2(unittest.TestCase):
    """Busy real edges must not flip the whole ocean to land."""

    def test_many_small_edge_structures_do_not_delete_the_ocean(self):
        boundary = Polygon(square(0, 0, 3000))
        coast = coastline_feature([(-3000, 0), (3000, 0)])
        # Piers/breakwaters clustered right along the coastline -- busy edge,
        # but the open sea south of them is still overwhelmingly empty water.
        piers = [building_feature(square(x, -20, 15), f"pier{i}")
                for i, x in enumerate(range(-2800, 2800, 100))]
        features = [coast] + piers
        result = sea.build_sea_polygon(features, boundary)
        self.assertIsNotNone(result.sea_geom, "busy edges must not delete the ocean")
        self.assertGreater(result.area_after_carve_km2, 1.0,
                           "the open sea south of the piers must remain sea")


class TestCarveOutRegression3(unittest.TestCase):
    def test_island_becomes_a_hole_in_the_sea_polygon(self):
        boundary = Polygon(square(0, 0, 2000))
        coast = coastline_feature([(-2000, 0), (2000, 0)])
        island = building_feature(square(0, -500, 200), "island")
        result = sea.build_sea_polygon([coast, island], boundary)
        self.assertIsNotNone(result.sea_geom)
        self.assertFalse(result.sea_geom.contains(Point(0, -500)),
                         "the island must be excluded from the final sea polygon")
        # But the sea around it must still be sea.
        self.assertTrue(result.sea_geom.contains(Point(1500, -1500)))

    def test_real_open_water_is_not_swallowed_by_the_close(self):
        """The regression this closing buffer itself could introduce.

        A wide (600 m) genuine channel between two carved land clusters must
        survive the 130/-124 m closing untouched.
        """
        boundary = Polygon(square(0, 0, 3000))
        coast = coastline_feature([(-3000, 0), (3000, 0)])
        west = [building_feature(square(-1500 + i * 40, -500, 15), f"w{i}") for i in range(10)]
        east = [building_feature(square(1500 + i * 40, -500, 15), f"e{i}") for i in range(10)]
        result = sea.build_sea_polygon([coast] + west + east, boundary)
        self.assertIsNotNone(result.sea_geom)
        self.assertTrue(result.sea_geom.contains(Point(0, -500)),
                        "a 600m-wide real channel between two islands must stay open water")


class TestNoCoastlineData(unittest.TestCase):
    def test_no_coastline_means_no_sea_not_all_land(self):
        boundary = Polygon(square(0, 0, 1000))
        result = sea.build_sea_polygon([], boundary)
        self.assertIsNone(result.sea_geom)
        self.assertEqual(result.face_count, 0)

    def test_no_coastline_does_not_raise(self):
        boundary = Polygon(square(0, 0, 1000))
        buildings = [building_feature(square(0, 0, 50))]
        result = sea.build_sea_polygon(buildings, boundary)  # must not raise
        self.assertIsNone(result.sea_geom)


class TestDeterminism(unittest.TestCase):
    def test_same_seed_same_result(self):
        boundary = Polygon(square(0, 0, 2000))
        coast = coastline_feature([(-2000, 0), (2000, 0)])
        island = building_feature(square(0, -500, 200), "island")
        a = sea.build_sea_polygon([coast, island], boundary, rng_seed=99)
        b = sea.build_sea_polygon([coast, island], boundary, rng_seed=99)
        self.assertAlmostEqual(a.area_after_carve_km2, b.area_after_carve_km2, places=9)


class TestSeaFeature(unittest.TestCase):
    def test_wraps_as_a_tagged_feature(self):
        boundary = Polygon(square(0, 0, 1000))
        coast = coastline_feature([(-1000, 0), (1000, 0)])
        result = sea.build_sea_polygon([coast], boundary)
        feature = sea.sea_feature(result, "sea-1")
        self.assertIsNotNone(feature)
        self.assertEqual(feature.tags, {"__sea__": "true"})
        self.assertTrue(feature.area)

    def test_none_when_no_sea(self):
        boundary = Polygon(square(0, 0, 1000))
        result = sea.build_sea_polygon([], boundary)
        self.assertIsNone(sea.sea_feature(result, "sea-1"))


class TestAgainstRealData(unittest.TestCase):
    """The actual Port Island / Kobe Airport bug, against the real extract."""

    def _find_cache(self):
        roots = [
            os.path.join(os.environ.get("TEMP", ""), "claude",
                        "E--Mythica-Machina-Business-Blank-Inheritance",
                        "a6dc3b76-df33-4055-92f4-6bae83ea1e6f", "scratchpad", "osm-cache"),
            os.path.join(os.path.dirname(__file__), "..", "..",
                        "tools", "city-map", "cache", "source"),
        ]
        candidates = []
        for root in roots:
            if os.path.isdir(root):
                candidates.extend(glob.glob(os.path.join(root, "*.json")))
        if not candidates:
            return None
        candidates.sort(key=os.path.getsize, reverse=True)
        return candidates[0]

    def test_carve_out_completes_quickly_against_real_data(self):
        """Guards against the Honshu-relation performance regression.

        Before parse.py's MAX_RELATION_AREA_M2 cap, one wrongly-included
        228,438 km2 relation (Honshu itself) made this step take 40+ seconds
        via a 580,397-vertex buffer(). Correct behaviour is under 5s.
        """
        cache = self._find_cache()
        if cache is None:
            self.skipTest("no cached Overpass extract available")
        with open(cache, encoding="utf-8") as fh:
            data = json.load(fh)
        features, _, _, _ = parse.parse_elements(data["elements"], FWD)
        cx, cy = FWD.transform(135.205, 34.678)
        boundary = Polygon(square(cx, cy, 7000))

        import time
        t0 = time.perf_counter()
        result = sea.build_sea_polygon(features, boundary)
        elapsed = time.perf_counter() - t0

        self.assertIsNotNone(result.sea_geom)
        self.assertLess(elapsed, 5.0,
                        f"sea carve-out took {elapsed:.1f}s -- an oversized relation "
                        f"has likely slipped past the area cap again")

    def test_port_island_and_kobe_airport_end_up_on_land(self):
        cache = self._find_cache()
        if cache is None:
            self.skipTest("no cached Overpass extract available")
        with open(cache, encoding="utf-8") as fh:
            data = json.load(fh)

        features, _, _, _ = parse.parse_elements(data["elements"], FWD)

        # A generous fixed source-space box around the known Kurose frame.
        cx, cy = FWD.transform(135.205, 34.678)
        half = 7000.0
        boundary = Polygon(square(cx, cy, half))

        result = sea.build_sea_polygon(features, boundary)
        self.assertIsNotNone(result.sea_geom, "the frame has real open water")
        self.assertGreater(result.carved_feature_count, 100,
                           "many real land features should need carving out")

        port_island = Point(*FWD.transform(135.2232901, 34.6664792))
        self.assertFalse(result.sea_geom.contains(port_island),
                         "Port Island must not be inside the final sea polygon")

        kobe_airport = Point(*FWD.transform(135.2238, 34.6328))
        self.assertFalse(result.sea_geom.contains(kobe_airport),
                         "Kobe Airport must not be inside the final sea polygon")


if __name__ == "__main__":
    unittest.main()
