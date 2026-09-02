"""siting.py tests: fitting a template into a user-drawn polygon from the
map editor. Two synthetic templates (a small square, a big square) so
"only one of two candidates fits" is directly testable, against a fixture
with a real nearby road (for road_ok and for the parallel-to-road bearing
preference) and, separately, a synthetic sea polygon for the offshore path.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.editor import siting  # noqa: E402
from citymap.fields import Fields, rotate_and_clip  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops import construct  # noqa: E402
from citymap.parse import Feature, RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.world import World  # noqa: E402

import numpy as np  # noqa: E402

NO_SEA = SeaResult(None, 0, 0, 0, 0, 0.0, 0.0)


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


def make_frame(extent_m=2000.0, dem_grid=32):
    return Frame(id="t", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
                extent_m=extent_m, crs_epsg=6674, dem_grid=dem_grid)


def small_template():
    return construct.Template(
        id="small-shed", name="Small Shed",
        parts=[construct.TemplatePart(
            tags={"building": "shed"}, height_m=4.0,
            footprint=[(-10.0, -10.0), (10.0, -10.0), (10.0, 10.0), (-10.0, 10.0)])],
        frontage_point=(0.0, -10.0), frontage_direction=(0.0, -1.0),
        access_highway_class="track",
    )


def big_template():
    return construct.Template(
        id="big-hall", name="Big Hall",
        parts=[construct.TemplatePart(
            tags={"building": "hall"}, height_m=10.0,
            footprint=[(-40.0, -40.0), (40.0, -40.0), (40.0, 40.0), (-40.0, 40.0)])],
        frontage_point=(0.0, -40.0), frontage_direction=(0.0, -1.0),
        access_highway_class="service",
    )


def polygon_to_lonlat(polygon, frame):
    return [dict(zip(("lon", "lat"), frame.map_to_lonlat(*frame.to_map(x, y))))
           for x, y in polygon.exterior.coords]


def make_fields(world, frame):
    map_features = rotate_and_clip(world.all_features(), frame)
    elevation = np.full((frame.dem_grid, frame.dem_grid), 10.0, dtype=np.float32)
    shade = np.zeros((frame.dem_grid, frame.dem_grid, 3), dtype=np.uint8)
    return Fields(frame=frame, features=map_features, lamps=[],
                 elevation=elevation, shade_rgb=shade, sea_depth_t=None,
                 dem_tiles_fetched=0, dem_tiles_missing=0)


class TestFitTemplateOnLand(unittest.TestCase):
    def setUp(self):
        self.frame = make_frame()
        cx, cy = self.frame.cx, self.frame.cy

        # Close to the drawn sites (all centred at cy+150, see test methods
        # below) on purpose: apply_construct's routing window scales with
        # distance to the nearest road (half_window ~= 2.5x that distance),
        # so a road left far away turns every dry run in fit_template's
        # candidate loop into a search over a huge state-lattice grid --
        # this is exactly what produced a real 45-minute hang during
        # development, see the fix note in siting.py's _MAX_ROAD_DISTANCE_M.
        graph = RoadGraph()
        node_a, node_b = (cx - 200.0, cy + 50.0), (cx + 200.0, cy + 50.0)
        graph.node_xy[1] = node_a
        graph.node_xy[2] = node_b
        graph.way_nodes[10] = [1, 2]
        graph.way_class[10] = "service"
        graph.node_ways[1].add(10)
        graph.node_ways[2].add(10)

        features = [Feature(id="existing-road", geom=LineString([node_a, node_b]),
                            tags={"highway": "service"}, area=False, osm_way_id=10)]
        self.world = World(features=features, road_graph=graph, lamps=[], sea=NO_SEA, crs_epsg=6674)
        self.fields = make_fields(self.world, self.frame)
        self.templates = [small_template(), big_template()]

    def test_a_plain_rectangle_finds_a_fit(self):
        cx, cy = self.frame.cx, self.frame.cy
        polygon_map = square(cx, cy + 150, 45)  # big enough for big-hall (80x80)
        result = siting.fit_template(polygon_to_lonlat(polygon_map, self.frame), self.frame,
                                     self.fields, self.world, self.templates, "op-test-1")
        self.assertTrue(result.ok, result.reason)
        self.assertEqual(result.template_id, "big-hall")
        self.assertFalse(result.is_offshore)

    def test_a_small_polygon_only_fits_the_small_template(self):
        cx, cy = self.frame.cx, self.frame.cy
        polygon_map = square(cx, cy + 150, 15)  # 30x30 -- too small for big-hall (80x80)
        result = siting.fit_template(polygon_to_lonlat(polygon_map, self.frame), self.frame,
                                     self.fields, self.world, self.templates, "op-test-2")
        self.assertTrue(result.ok, result.reason)
        self.assertEqual(result.template_id, "small-shed")

    def test_a_tiny_polygon_fits_nothing(self):
        cx, cy = self.frame.cx, self.frame.cy
        polygon_map = square(cx, cy + 150, 3)  # 6x6 -- smaller than either template
        result = siting.fit_template(polygon_to_lonlat(polygon_map, self.frame), self.frame,
                                     self.fields, self.world, self.templates, "op-test-3")
        self.assertFalse(result.ok)
        self.assertIsNone(result.template_id)

    def test_a_site_far_from_any_road_fails_fast_instead_of_routing(self):
        """Regression: a site far enough from any road that apply_construct's
        routing window would balloon into a huge state-lattice search
        (half_window scales with distance) previously caused a real
        45-minute hang during this module's own development, discovered
        when a test fixture accidentally left the road ~300m away. Must
        return quickly with ok=False, never attempt the dry run at all."""
        cx, cy = self.frame.cx, self.frame.cy
        far_polygon_map = square(cx, cy + 5000, 45)  # nowhere near the one road in this fixture
        import time
        t0 = time.perf_counter()
        result = siting.fit_template(polygon_to_lonlat(far_polygon_map, self.frame), self.frame,
                                     self.fields, self.world, self.templates, "op-test-far")
        elapsed = time.perf_counter() - t0
        self.assertFalse(result.ok)
        self.assertIn("no road within", result.reason)
        self.assertLess(elapsed, 5.0, "must reject via the distance guard, not a real dry run")

    def test_the_winning_report_is_a_real_dry_run_report(self):
        cx, cy = self.frame.cx, self.frame.cy
        polygon_map = square(cx, cy + 150, 45)
        result = siting.fit_template(polygon_to_lonlat(polygon_map, self.frame), self.frame,
                                     self.fields, self.world, self.templates, "op-test-4")
        self.assertTrue(result.ok)
        self.assertTrue(result.report.footprint_clear)
        self.assertTrue(result.report.road_ok)


class TestFitTemplateOffshore(unittest.TestCase):
    def setUp(self):
        self.frame = make_frame()
        cx, cy = self.frame.cx, self.frame.cy
        sea_geom = square(cx, cy, 900.0)
        sea = SeaResult(sea_geom, 1, 1, 0, 0, sea_geom.area / 1e6, sea_geom.area / 1e6)
        self.world = World(features=[], road_graph=RoadGraph(), lamps=[], sea=sea, crs_epsg=6674)
        self.fields = make_fields(self.world, self.frame)
        self.templates = [small_template(), big_template()]

    def test_a_polygon_drawn_in_the_sea_becomes_an_offshore_fit(self):
        cx, cy = self.frame.cx, self.frame.cy
        polygon_map = square(cx, cy, 45)  # centred well inside the sea square
        result = siting.fit_template(polygon_to_lonlat(polygon_map, self.frame), self.frame,
                                     self.fields, self.world, self.templates, "op-test-5")
        self.assertTrue(result.ok, result.reason)
        self.assertTrue(result.is_offshore)
        self.assertTrue(result.report.is_offshore)
        # No causeway router yet -- an offshore fit must not require road_ok.
        self.assertFalse(result.report.road_ok)


if __name__ == "__main__":
    unittest.main()
