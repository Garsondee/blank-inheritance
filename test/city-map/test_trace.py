"""trace op tests: splicing a literal, user-drawn polyline into the road
graph. Unlike construct's access-road routing, trace does no pathfinding --
its whole job is to turn given points into a real graph edge (snapping
endpoints onto nearby existing nodes where they land close enough) and to
report, not silently ignore, anything the literal path crosses.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402
from citymap.ops import trace  # noqa: E402
from citymap.ops.log import Operation  # noqa: E402
from citymap.parse import Feature, RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.world import World  # noqa: E402

NO_SEA = SeaResult(None, 0, 0, 0, 0, 0.0, 0.0)
FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
             extent_m=2000.0, crs_epsg=6674)


def square(dx, dy, half):
    """A source-CRS square, offset (dx, dy) metres from the frame's centre --
    same centring reasoning as lonlat() above."""
    cx, cy = FRAME.cx + dx, FRAME.cy + dy
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


def source_point(dx, dy):
    return FRAME.to_source(FRAME.cx + dx, FRAME.cy + dy)


def make_world(features=None, road_graph=None, sea=NO_SEA):
    return World(features=features or [], road_graph=road_graph or RoadGraph(), lamps=[],
                sea=sea, crs_epsg=FRAME.crs_epsg, terrain_edits=[])


def lonlat(dx, dy):
    """(dx, dy) metres from the frame's own centre -- never raw map-space
    zero, which is far outside this CRS's sane domain (see test_construct.py's
    established convention of always offsetting from frame.cx/frame.cy)."""
    x, y = FRAME.to_source(FRAME.cx + dx, FRAME.cy + dy)
    return dict(zip(("lon", "lat"), FRAME.inv.transform(x, y)))


def make_op(points_map, highway_class=None, op_id="op-trace-1"):
    payload = {"points": [lonlat(dx, dy) for dx, dy in points_map]}
    if highway_class is not None:
        payload["highwayClass"] = highway_class
    return Operation(id=op_id, op="trace", payload=payload)


class TestBasicSplice(unittest.TestCase):
    def test_adds_exactly_one_new_feature(self):
        world = make_world()
        op = make_op([(0, 0), (100, 0)])
        new_world, report = trace.apply_trace(world, op, FRAME)
        self.assertEqual(len(new_world.features), 1)
        self.assertEqual(new_world.features[0].tags.get("highway"), "unclassified")

    def test_default_highway_class_is_unclassified(self):
        world = make_world()
        op = make_op([(0, 0), (100, 0)])
        _, report = trace.apply_trace(world, op, FRAME)
        self.assertGreater(report.length_m, 0)

    def test_custom_highway_class_is_used(self):
        world = make_world()
        op = make_op([(0, 0), (100, 0)], highway_class="secondary")
        new_world, _ = trace.apply_trace(world, op, FRAME)
        self.assertEqual(new_world.features[0].tags["highway"], "secondary")

    def test_original_features_are_untouched(self):
        original = Feature(id="osm:way:1", geom=square(500, 500, 5), tags={"building": "yes"}, area=True)
        world = make_world(features=[original])
        op = make_op([(0, 0), (100, 0)])
        new_world, _ = trace.apply_trace(world, op, FRAME)
        self.assertIn(original, new_world.features)
        self.assertEqual(len(new_world.features), 2)

    def test_multi_point_trace_preserves_intermediate_points(self):
        """A chain-joined road (roads.join_road_chains) must not get
        flattened to just its two ends -- the whole point of joining
        several drawn segments is to keep the shape they traced."""
        pts = [(0, 0), (50, 20), (100, 5), (140, 40)]
        world = make_world()
        op = make_op(pts)
        new_world, _ = trace.apply_trace(world, op, FRAME)
        self.assertEqual(len(list(new_world.features[0].geom.coords)), len(pts))

    def test_raises_on_fewer_than_two_points(self):
        world = make_world()
        op = Operation(id="op-bad", op="trace", payload={"points": [lonlat(0, 0)]})
        with self.assertRaises(ValueError):
            trace.apply_trace(world, op, FRAME)


class TestGraphSplicing(unittest.TestCase):
    def test_endpoints_snap_to_a_nearby_existing_node(self):
        graph = RoadGraph()
        existing_node = 111
        graph.node_xy[existing_node] = source_point(0.0, 0.0)
        graph.node_ways[existing_node] = {999}
        graph.way_nodes[999] = [existing_node, 222]
        graph.node_xy[222] = source_point(50.0, 0.0)
        graph.node_ways[222] = {999}
        graph.way_class[999] = "service"

        world = make_world(road_graph=graph)
        # trace starts 5m from the existing node (< SNAP_DISTANCE_M) and
        # heads off in a new direction
        op = make_op([(5.0, 0.0), (5.0, 100.0)])
        new_world, report = trace.apply_trace(world, op, FRAME)

        self.assertEqual(report.snapped_start_node, existing_node)
        way_id = report.way_id
        self.assertEqual(new_world.road_graph.way_nodes[way_id][0], existing_node)
        # the existing node now also belongs to the new way -- a real junction
        self.assertIn(way_id, new_world.road_graph.node_ways[existing_node])

    def test_endpoints_do_not_snap_when_far_from_any_node(self):
        graph = RoadGraph()
        graph.node_xy[111] = source_point(1000.0, 1000.0)  # far away
        graph.node_ways[111] = {999}
        graph.way_nodes[999] = [111]
        world = make_world(road_graph=graph)
        op = make_op([(0.0, 0.0), (100.0, 0.0)])
        new_world, report = trace.apply_trace(world, op, FRAME)
        self.assertIsNone(report.snapped_start_node)
        self.assertIsNone(report.snapped_end_node)
        # a brand new synthetic node was created for the start point instead
        way_id = report.way_id
        new_start_node = new_world.road_graph.way_nodes[way_id][0]
        self.assertNotEqual(new_start_node, 111)

    def test_new_way_is_registered_with_its_class(self):
        world = make_world()
        op = make_op([(0, 0), (100, 0)], highway_class="residential")
        new_world, report = trace.apply_trace(world, op, FRAME)
        self.assertEqual(new_world.road_graph.way_class[report.way_id], "residential")

    def test_original_graph_is_not_mutated(self):
        graph = RoadGraph()
        graph.node_xy[1] = source_point(0.0, 0.0)
        world = make_world(road_graph=graph)
        op = make_op([(0, 0), (100, 0)])
        trace.apply_trace(world, op, FRAME)
        self.assertEqual(list(graph.way_nodes.keys()), [])  # untouched original


class TestDeterminism(unittest.TestCase):
    def test_same_op_id_produces_the_same_ids_every_time(self):
        world = make_world()
        op = make_op([(0, 0), (100, 0)], op_id="op-fixed")
        w1, r1 = trace.apply_trace(world, op, FRAME)
        w2, r2 = trace.apply_trace(world, op, FRAME)
        self.assertEqual(r1.way_id, r2.way_id)
        self.assertEqual(w1.features[0].id, w2.features[0].id)

    def test_different_op_ids_produce_different_ids(self):
        world = make_world()
        op_a = make_op([(0, 0), (100, 0)], op_id="op-a")
        op_b = make_op([(0, 0), (100, 0)], op_id="op-b")
        _, ra = trace.apply_trace(world, op_a, FRAME)
        _, rb = trace.apply_trace(world, op_b, FRAME)
        self.assertNotEqual(ra.way_id, rb.way_id)


class TestConflictReporting(unittest.TestCase):
    def test_reports_a_building_the_path_crosses(self):
        building = Feature(id="osm:way:5", geom=square(50, 0, 20), tags={"building": "yes"}, area=True)
        world = make_world(features=[building])
        op = make_op([(0, 0), (100, 0)])
        _, report = trace.apply_trace(world, op, FRAME)
        self.assertIn("osm:way:5", report.crosses_building_ids)

    def test_no_conflicts_reported_when_clear(self):
        building = Feature(id="osm:way:6", geom=square(500, 500, 20), tags={"building": "yes"}, area=True)
        world = make_world(features=[building])
        op = make_op([(0, 0), (100, 0)])
        _, report = trace.apply_trace(world, op, FRAME)
        self.assertEqual(report.crosses_building_ids, [])
        self.assertFalse(report.crosses_water)

    def test_reports_crossing_water(self):
        sea = SeaResult(square(50, 0, 200), 0, 0, 0, 0, 0.0, 0.0)
        world = make_world(sea=sea)
        op = make_op([(0, 0), (100, 0)])
        _, report = trace.apply_trace(world, op, FRAME)
        self.assertTrue(report.crosses_water)


if __name__ == "__main__":
    unittest.main()
