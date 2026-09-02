"""The migration-correctness proof: `load_world_from_store` on a freshly
imported real store must produce a World field-equivalent to what
render.py's existing resolve_world + resolve_replayed_world path produces
today, on the REAL Kurose frame/style/ops. This is the single most
important test in the map-editor plan -- everything from Phase 2 onward
trusts that the store is a faithful replacement for the operation log.

Skips loudly (design/testing-strategy.md rule 5) rather than triggering a
cold Overpass fetch or a 500s+ replay inside a test run -- pre-checks that
BOTH the L1 world cache and the L3 replayed-world cache are already warm
for the real frame+ops before running, matching test_parse.py/test_sea.py's
existing "skip if the real cache isn't available" convention.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import render as render_cli  # noqa: E402
from citymap import cache, world as world_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops import replay_cache  # noqa: E402
from citymap.ops.log import load_ops  # noqa: E402
from citymap.style import Style  # noqa: E402
from citymap.store import load  # noqa: E402
from citymap.store.import_osm import import_world  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FRAME_PATH = os.path.join(REPO_ROOT, "data", "map", "frames", "kurose-12km.json")
STYLE_PATH = os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json")
OPS_PATH = os.path.join(REPO_ROOT, "data", "map", "operations", "kurose.json")


def _real_caches_are_warm():
    """True only if resolving the real frame+ops would hit BOTH the L1 world
    cache and the L3 replayed-world cache -- i.e. this test can run fast,
    offline, and deterministically. Mirrors render_cli.resolve_world's own
    key computation exactly, without actually calling it (a miss there would
    hit the network; a miss on replayed-world would run the real 500s+
    replay), so a cold cache is detected before doing any real work."""
    if not (os.path.exists(FRAME_PATH) and os.path.exists(STYLE_PATH) and os.path.exists(OPS_PATH)):
        return False, "real Kurose frame/style/ops files not found"

    frame = Frame.from_file(FRAME_PATH)
    south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=world_module.FETCH_PAD_M)
    from citymap import acquire
    query = acquire.build_overpass_query(south, west, north, east)
    l1_key_parts = world_module.world_key_parts(query, frame.crs_epsg)
    l1_artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "world"), l1_key_parts)
    if not l1_artifact.exists():
        return False, f"L1 world cache not warm for the real frame ({l1_artifact.dir})"

    ops = load_ops(OPS_PATH)
    l3_key_parts = replay_cache.replayed_world_key_parts(l1_key_parts, ops)
    l3_artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "replayed-world"), l3_key_parts)
    if not l3_artifact.exists():
        return False, f"L3 replayed-world cache not warm for the real ops ({l3_artifact.dir})"

    return True, None


class TestMigrationEquivalenceOnRealData(unittest.TestCase):
    """The load-bearing proof. Everything else in this test module is
    scaffolding for getting to this one comparison correctly and fast."""

    @classmethod
    def setUpClass(cls):
        warm, reason = _real_caches_are_warm()
        if not warm:
            raise unittest.SkipTest(
                f"real Kurose cache not warm -- SKIPPING the migration-equivalence "
                f"proof rather than triggering a cold Overpass fetch or a 500s+ "
                f"replay inside a test run ({reason}). Run "
                f"`python tools/city-map/render.py --mode overview --ops "
                f"data/map/operations/kurose.json --out /tmp/warm.png` once to "
                f"warm both caches, then re-run this test.")

        cls.frame = Frame.from_file(FRAME_PATH)
        cls.style = Style.from_file(STYLE_PATH)
        cls.expected_world, _ = render_cli.resolve_world(cls.frame, on_note=lambda *_: None)
        ops = load_ops(OPS_PATH)
        world_key_parts_ = world_module.world_key_parts(
            __import__("citymap.acquire", fromlist=["build_overpass_query"]).build_overpass_query(
                *cls.frame.fetch_bbox_lonlat(margin=1.0, pad_m=world_module.FETCH_PAD_M)),
            cls.frame.crs_epsg)
        cls.expected_world, _ = replay_cache.resolve_replayed_world(
            cls.expected_world, ops, cls.frame, cls.style,
            os.path.join(cache.artifact_root(REPO_ROOT, "source"), "dem"),
            os.path.join(REPO_ROOT, "data", "map", "templates"), REPO_ROOT,
            world_key_parts_, on_note=lambda *_: None)

        cls.tmp = tempfile.mkdtemp()
        cls.gpkg_path = os.path.join(cls.tmp, "kurose-test-import.gpkg")
        import_world(cls.expected_world, cls.gpkg_path, on_note=lambda *_: None)
        cls.actual_world = load.load_world_from_store(cls.gpkg_path)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_feature_count_matches(self):
        self.assertEqual(len(self.actual_world.features), len(self.expected_world.features))

    def test_every_feature_matches_field_for_field(self):
        by_id = {f.id: f for f in self.expected_world.features}
        self.assertEqual(len(by_id), len(self.expected_world.features), "expected ids must be unique")
        mismatches = []
        for f in self.actual_world.features:
            original = by_id.get(f.id)
            if original is None:
                mismatches.append(f"{f.id}: present in store but not in expected world")
                continue
            if not f.geom.equals_exact(original.geom, tolerance=1e-6):
                mismatches.append(f"{f.id}: geometry differs")
            if f.area != original.area:
                mismatches.append(f"{f.id}: area flag differs")
            if abs(f.height_m - original.height_m) > 1e-3:
                mismatches.append(f"{f.id}: height_m differs")
            if f.tags != original.tags:
                mismatches.append(f"{f.id}: tags differ")
            if f.source != original.source:
                mismatches.append(f"{f.id}: source differs")
            if f.osm_way_id != original.osm_way_id:
                mismatches.append(f"{f.id}: osm_way_id differs")
        self.assertEqual(mismatches, [], f"{len(mismatches)} feature mismatch(es) (showing up to 20): "
                                        + "; ".join(mismatches[:20]))

    def test_sea_geometry_matches(self):
        exp_sea = self.expected_world.sea.sea_geom
        act_sea = self.actual_world.sea.sea_geom
        if exp_sea is None:
            self.assertIsNone(act_sea)
        else:
            self.assertIsNotNone(act_sea)
            self.assertAlmostEqual(act_sea.area, exp_sea.area, delta=exp_sea.area * 1e-6)

    def test_road_graph_matches(self):
        exp = self.expected_world.road_graph
        act = self.actual_world.road_graph
        self.assertEqual(set(act.node_xy), set(exp.node_xy))
        self.assertEqual(set(act.way_nodes), set(exp.way_nodes))
        for way_id in exp.way_nodes:
            self.assertEqual(act.way_nodes[way_id], exp.way_nodes[way_id],
                            f"way {way_id}: node sequence differs")
        # node_ways is derived, not stored -- confirm the rebuild agrees with
        # the original for every node, not just that the key sets match.
        for node_id in exp.node_xy:
            self.assertEqual(act.node_ways.get(node_id, set()), exp.node_ways.get(node_id, set()),
                            f"node {node_id}: incident way set differs")

    def test_rail_graph_matches(self):
        exp = self.expected_world.rail_graph
        act = self.actual_world.rail_graph
        self.assertEqual(set(act.node_xy), set(exp.node_xy))
        self.assertEqual(set(act.way_nodes), set(exp.way_nodes))

    def test_terrain_edits_match_in_order(self):
        exp = self.expected_world.terrain_edits
        act = self.actual_world.terrain_edits
        self.assertEqual([e.id for e in act], [e.id for e in exp],
                        "terrain edit order (stack_order) must match exactly -- "
                        "this is what makes terracing correct, see gpkg.py")
        for a, e in zip(act, exp):
            self.assertAlmostEqual(a.target_elevation_m, e.target_elevation_m, places=3)
            self.assertAlmostEqual(a.blend_m, e.blend_m, places=3)
            self.assertAlmostEqual(a.polygon.area, e.polygon.area, delta=max(e.polygon.area * 1e-6, 1e-6))

    def test_lamp_count_matches(self):
        self.assertEqual(len(self.actual_world.lamps), len(self.expected_world.lamps))

    def test_a_real_render_from_the_store_matches_a_render_from_the_old_path(self):
        """The end-to-end version of the claim above: not just that the
        World's fields match, but that rendering FROM it produces the same
        picture. A small window, not the full frame, to keep this fast."""
        from citymap import fields as fields_module, render as render_module

        old_fields = fields_module.build_fields(
            self.expected_world, self.frame,
            os.path.join(cache.artifact_root(REPO_ROOT, "source"), "dem"), self.style)
        new_fields = fields_module.build_fields(
            self.actual_world, self.frame,
            os.path.join(cache.artifact_root(REPO_ROOT, "source"), "dem"), self.style)

        tile = self.frame.window_tile(lon=135.205, lat=34.678, extent_m=400.0, mpp=1.0, supersample=1)
        old_img = render_module.render_tile(old_fields, self.style, tile)
        new_img = render_module.render_tile(new_fields, self.style, tile)

        import numpy as np
        old_arr = np.asarray(old_img.convert("RGB"), dtype=np.int16)
        new_arr = np.asarray(new_img.convert("RGB"), dtype=np.int16)
        diff = np.abs(old_arr - new_arr)
        # Not byte-identical: (fid, insertion order) differs between the two
        # feature lists which can change per-building roof-colour hashing
        # and shadow paint order at overlaps by a pixel or two -- the real
        # claim is "the same picture", not "the same bytes". A tiny mean
        # difference with no wildly-differing pixels demonstrates that.
        self.assertLess(diff.mean(), 1.0,
                        f"mean per-channel pixel difference {diff.mean():.3f} is too high "
                        f"for what should be the same map from two equivalent World sources")
        self.assertLess(np.percentile(diff, 99.9), 40,
                        "99.9th-percentile pixel difference is too high -- something is "
                        "drawing in a genuinely different place, not just a hash-order nuance")


if __name__ == "__main__":
    unittest.main()
