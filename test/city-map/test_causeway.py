"""citymap.tools.causeway tests -- map-editor plan Phase 10.

Small, fast Frame/Fields fixture (rotation_deg=0 keeps SOURCE and MAP space
identical, matching test_array_place.py's own established trick) plus SMALL
routing_cell_m/routing_window_* overrides so the real-router tests stay
fast -- same reasoning as test_array_place.py's own FAST_ROUTING dict.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.tools import causeway  # noqa: E402

FRAME = Frame(id="t", center_lon=135.0, center_lat=35.0,
             rotation_deg=0.0, extent_m=400.0, crs_epsg=6674, dem_grid=32)
CX, CY = FRAME.cx, FRAME.cy

FAST_ROUTING = dict(routing_cell_m=2.0, routing_window_min_m=20.0, routing_window_margin_m=10.0)


def flat_fields(features=()) -> Fields:
    n = FRAME.dem_grid
    elevation = np.full((n, n), 10.0, dtype=np.float32)
    shade = np.ones((n, n, 3), dtype=np.float32)
    return Fields(frame=FRAME, features=list(features), lamps=[], elevation=elevation,
                 shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


def road_feature(coords, fid="road-1") -> Feature:
    return Feature(id=fid, geom=LineString(coords), tags={"highway": "residential"},
                   area=False, height_m=0.0, source="test")


def sea_feature(polygon, fid="sea-polygon") -> Feature:
    return Feature(id=fid, geom=polygon, tags={"__sea__": "true"}, area=True,
                   height_m=0.0, source="test")


class TestRouteCausewayOnLand(unittest.TestCase):
    def test_a_point_near_a_real_road_routes_without_crossing_water(self):
        road = road_feature([(CX - 100, CY - 15), (CX + 100, CY - 15)])
        fields = flat_fields([road])
        result = causeway.route_causeway(Point(CX, CY), FRAME, fields, **FAST_ROUTING)
        self.assertGreater(result.length_m, 0.0)
        self.assertFalse(result.crosses_water)

    def test_no_road_network_raises(self):
        fields = flat_fields([])
        with self.assertRaises(causeway.CausewayError) as ctx:
            causeway.route_causeway(Point(CX, CY), FRAME, fields, **FAST_ROUTING)
        self.assertIn("no road network", str(ctx.exception))

    def test_a_road_far_past_the_distance_cap_raises_with_a_specific_message(self):
        road = road_feature([(CX - 100, CY - 15), (CX + 100, CY - 15)])
        fields = flat_fields([road])
        far_point = Point(CX, CY + 5000)
        with self.assertRaises(causeway.CausewayError) as ctx:
            causeway.route_causeway(far_point, FRAME, fields, **FAST_ROUTING)
        self.assertIn("routing-attempt cap", str(ctx.exception))


class TestRouteCausewayAcrossWater(unittest.TestCase):
    """The real point of this phase: a start point stranded by water, with
    the only real road on the far shore, must get a real routed connection
    that actually crosses the sea -- not just fail honestly."""

    def _island_and_sea_fixture(self):
        # Sea covers everything except a small "island" hole at the frame
        # centre and a strip of "mainland" on the far east edge -- the
        # island is genuinely cut off from the road by open water in every
        # direction except across it.
        island = Polygon([(CX - 10, CY - 10), (CX + 10, CY - 10), (CX + 10, CY + 10), (CX - 10, CY + 10)])
        # A simple, robust sea polygon: a big square covering the routing
        # window, with the island carved out as an interior ring.
        big_square = Polygon([(CX - 150, CY - 150), (CX + 150, CY - 150),
                              (CX + 150, CY + 150), (CX - 150, CY + 150)])
        sea_geom = big_square.difference(island)
        road = road_feature([(CX + 140, CY - 150), (CX + 140, CY + 150)])
        fields = flat_fields([sea_feature(sea_geom), road])
        return fields, island

    def test_routes_successfully_and_reports_crossing_water(self):
        fields, island = self._island_and_sea_fixture()
        result = causeway.route_causeway(Point(CX, CY), FRAME, fields, **FAST_ROUTING)
        self.assertGreater(result.length_m, 0.0)
        self.assertTrue(result.crosses_water)

    def test_the_routed_line_actually_passes_through_the_sea_geometry(self):
        fields, island = self._island_and_sea_fixture()
        result = causeway.route_causeway(Point(CX, CY), FRAME, fields, **FAST_ROUTING)
        sea_geom = fields.sea_features()[0].geom
        self.assertTrue(result.route.intersects(sea_geom))


if __name__ == "__main__":
    unittest.main()
