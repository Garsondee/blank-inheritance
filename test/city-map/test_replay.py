"""replay.py tests: the op-log dispatch loop the CLI runs. Uses a minimal
2-op log (demolish then construct) against a synthetic World/Frame, mirroring
the same fixture style as test_construct.py.
"""

import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402
from citymap.ops.log import Operation  # noqa: E402
from citymap.ops.replay import replay_ops  # noqa: E402
from citymap.parse import Feature, RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.world import World  # noqa: E402


class FakeStyle:
    """Just enough of Style's interface for build_fields to run."""
    lighting = {}

    def canopy_blob_m(self): return 45.0
    def canopy_seed(self): return 8412


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


class TestReplayOps(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.templates_dir = os.path.join(self.tmp, "templates")
        os.makedirs(self.templates_dir)
        with open(os.path.join(self.templates_dir, "tiny-shed.json"), "w", encoding="utf-8") as fh:
            json.dump({
                "id": "tiny-shed", "type": "map-template", "name": "Tiny Shed",
                "parts": [{"tags": {"building": "shed"}, "heightM": 3.0,
                          "footprint": [[-5, -5], [5, -5], [5, 5], [-5, 5]]}],
                "frontage": {"localPoint": [0, -5], "localDirection": [0, -1]},
                "accessRoad": {"highwayClass": "track"},
            }, fh)

        self.frame = Frame(id="t", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
                           extent_m=1000.0, crs_epsg=6674, dem_grid=32)
        cx, cy = self.frame.cx, self.frame.cy

        graph = RoadGraph()
        node_a, node_b = (cx - 100.0, cy - 50.0), (cx + 50.0, cy - 50.0)
        graph.node_xy[1] = node_a
        graph.node_xy[2] = node_b
        graph.way_nodes[10] = [1, 2]
        graph.way_class[10] = "track"
        graph.node_ways[1].add(10)
        graph.node_ways[2].add(10)

        features = [
            Feature(id="old-shed", geom=square(cx + 300, cy + 300, 5.0),
                   tags={"building": "shed"}, area=True, height_m=3.0, osm_way_id=99),
            Feature(id="existing-road", geom=LineString([node_a, node_b]),
                   tags={"highway": "track"}, area=False, osm_way_id=10),
        ]
        self.world = World(features=features, road_graph=graph, lamps=[],
                          sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)

        demolish_lonlat = self.frame.inv.transform(cx + 300, cy + 300)
        construct_lonlat = self.frame.inv.transform(cx, cy)
        self.ops = [
            Operation(id="op-1", op="demolish",
                     payload={"area": {"center": {"lon": demolish_lonlat[0], "lat": demolish_lonlat[1]},
                                       "radiusM": 20}}),
            Operation(id="op-2", op="construct",
                     payload={"template": "tiny-shed",
                             "anchor": {"lon": construct_lonlat[0], "lat": construct_lonlat[1]},
                             "rotation": 0.0}),
        ]
        self.dem_cache_dir = os.path.join(self.tmp, "dem-cache")

    def test_both_ops_run_in_order_and_report(self):
        final_world, results = replay_ops(self.world, self.ops, self.frame, FakeStyle(),
                                          self.dem_cache_dir, self.templates_dir)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].op.id, "op-1")
        self.assertEqual(results[1].op.id, "op-2")
        self.assertEqual(results[0].report.removed_feature_count, 1)  # old-shed
        # NOT asserting terrain_edited here: this fixture uses a real GSI
        # fetch at a tiny test extent, and whether that specific patch of
        # real DEM has coverage is a data-availability fact this test
        # shouldn't depend on -- benching's own correctness (max-of-samples,
        # blend, round-trip) is covered exhaustively with synthetic elevation
        # in test_construct.py's TestTerrainBenching. This test's job is only
        # to prove replay_ops dispatches both ops, in order, with real reports.
        self.assertIsInstance(results[1].report.terrain_edited, bool)

    def test_demolished_feature_is_gone_and_construct_ran_on_the_result(self):
        final_world, _ = replay_ops(self.world, self.ops, self.frame, FakeStyle(),
                                    self.dem_cache_dir, self.templates_dir)
        ids = {f.id for f in final_world.features}
        self.assertNotIn("old-shed", ids)
        self.assertTrue(any(f.tags.get("building") == "shed" and f.source == "op:op-2"
                           for f in final_world.features))

    def test_on_step_callback_fires_for_every_op_in_order(self):
        seen = []
        replay_ops(self.world, self.ops, self.frame, FakeStyle(), self.dem_cache_dir,
                  self.templates_dir, on_step=lambda i, total, op: seen.append((i, total, op.id)))
        self.assertEqual(seen, [(0, 2, "op-1"), (1, 2, "op-2")])

    def test_on_step_done_fires_after_each_op_with_its_report(self):
        """Two separate callbacks, not on_step fired twice: a caller printing
        '[i/total] name ... ' without a newline needs on_step_done to land
        the matching 'done' on the SAME line, which needs the report."""
        seen = []
        replay_ops(self.world, self.ops, self.frame, FakeStyle(), self.dem_cache_dir, self.templates_dir,
                  on_step_done=lambda i, total, op, report: seen.append((i, total, op.id, report)))
        self.assertEqual(len(seen), 2)
        self.assertEqual([s[:3] for s in seen], [(0, 2, "op-1"), (1, 2, "op-2")])
        self.assertEqual(seen[0][3].removed_feature_count, 1)  # op-1's DemolishReport
        self.assertTrue(hasattr(seen[1][3], "road_ok"))  # op-2's ConstructReport

    def test_on_step_done_fires_in_order_relative_to_on_step(self):
        order = []
        replay_ops(self.world, self.ops, self.frame, FakeStyle(), self.dem_cache_dir, self.templates_dir,
                  on_step=lambda i, total, op: order.append(f"start-{op.id}"),
                  on_step_done=lambda i, total, op, report: order.append(f"done-{op.id}"))
        self.assertEqual(order, ["start-op-1", "done-op-1", "start-op-2", "done-op-2"])

    def test_unknown_op_kind_raises_clearly(self):
        from citymap.ops.log import Operation as Op
        bad_op = Op(id="op-x", op="rezone", payload={})  # a KNOWN_OPS member, but not yet dispatched
        with self.assertRaises(NotImplementedError):
            replay_ops(self.world, [bad_op], self.frame, FakeStyle(),
                      self.dem_cache_dir, self.templates_dir)

    def test_original_world_is_not_mutated(self):
        original_count = len(self.world.features)
        replay_ops(self.world, self.ops, self.frame, FakeStyle(), self.dem_cache_dir, self.templates_dir)
        self.assertEqual(len(self.world.features), original_count)


if __name__ == "__main__":
    unittest.main()
