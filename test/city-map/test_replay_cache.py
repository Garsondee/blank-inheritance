"""replay_cache.py tests: the L3 op-log replay cache. Mirrors test_replay.py's
fixture (a minimal demolish-then-construct log against a synthetic World),
since resolve_replayed_world is a thin wrapper around replay_ops -- what
these tests actually prove is the CACHING behaviour (hit/miss, and that a
hit genuinely skips replay_ops rather than just happening to agree with it).
"""

import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402
from citymap.ops import replay_cache  # noqa: E402
from citymap.ops.log import Operation  # noqa: E402
from citymap.parse import Feature, RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.world import World  # noqa: E402


class FakeStyle:
    lighting = {}

    def canopy_blob_m(self): return 45.0
    def canopy_seed(self): return 8412


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


class TestResolveReplayedWorld(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.repo_root = self.tmp  # cache.artifact_root just joins tools/city-map/cache/... onto this

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
        self.l1_key_parts = {"test": "l1-key", "crsEpsg": 6674}

    def _resolve(self, ops=None):
        return replay_cache.resolve_replayed_world(
            self.world, ops if ops is not None else self.ops, self.frame, FakeStyle(),
            self.dem_cache_dir, self.templates_dir, self.repo_root, self.l1_key_parts)

    def test_first_call_is_a_miss_and_actually_replays(self):
        world, results = self._resolve()
        self.assertIsNotNone(results)
        self.assertEqual(len(results), 2)
        self.assertNotIn("old-shed", {f.id for f in world.features})

    def test_second_identical_call_is_a_hit_with_no_results(self):
        self._resolve()
        world, results = self._resolve()
        self.assertIsNone(results, "a cache hit has nothing to report -- no op actually ran")
        self.assertNotIn("old-shed", {f.id for f in world.features})
        self.assertTrue(any(f.tags.get("building") == "shed" and f.source == "op:op-2"
                           for f in world.features))

    def test_a_cache_hit_genuinely_skips_replay_ops_not_just_agrees_with_it(self):
        """The real proof: patch replay_ops itself and count calls, so a
        passing test can't be explained by the two calls coincidentally
        producing the same result."""
        self._resolve()  # warm the cache
        with mock.patch.object(replay_cache, "replay_ops") as mocked:
            world, results = self._resolve()
        mocked.assert_not_called()
        self.assertIsNone(results)

    def test_changing_an_op_payload_misses(self):
        self._resolve()
        other_lonlat = self.frame.inv.transform(self.frame.cx + 40, self.frame.cy + 40)
        changed_ops = [
            self.ops[0],
            Operation(id="op-2", op="construct",
                     payload={"template": "tiny-shed",
                             "anchor": {"lon": other_lonlat[0], "lat": other_lonlat[1]},
                             "rotation": 0.0}),
        ]
        with mock.patch.object(replay_cache, "replay_ops", wraps=replay_cache.replay_ops) as mocked:
            world, results = self._resolve(ops=changed_ops)
        mocked.assert_called_once()
        self.assertIsNotNone(results)

    def test_reordering_ops_misses(self):
        self._resolve()
        reordered = [self.ops[1], self.ops[0]]
        with mock.patch.object(replay_cache, "replay_ops", wraps=replay_cache.replay_ops) as mocked:
            self._resolve(ops=reordered)
        mocked.assert_called_once()

    def test_a_different_l1_key_misses(self):
        self._resolve()
        other = replay_cache.resolve_replayed_world(
            self.world, self.ops, self.frame, FakeStyle(), self.dem_cache_dir,
            self.templates_dir, self.repo_root,
            {"test": "a-totally-different-l1-key", "crsEpsg": 6674})
        self.assertIsNotNone(other[1], "a different L1 world key must not reuse another world's cache")

    def test_empty_ops_list_is_a_no_op_not_a_cache_lookup(self):
        world, results = self._resolve(ops=[])
        self.assertEqual(results, [])
        self.assertIs(world, self.world)

    def test_original_world_is_not_mutated(self):
        original_count = len(self.world.features)
        self._resolve()
        self._resolve()  # once as a miss, once as a hit
        self.assertEqual(len(self.world.features), original_count)


if __name__ == "__main__":
    unittest.main()
