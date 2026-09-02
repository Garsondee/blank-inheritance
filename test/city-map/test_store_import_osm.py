"""citymap.store.import_osm / load: World -> store -> World round trip on a
small SYNTHETIC world (fast, always runs -- the real-data equivalence check
lives in test_store_migration.py and skips loudly without a warm cache).

Mirrors test_world.py's own SAMPLE_ELEMENTS/TEST_FRAME fixtures so the two
suites stay easy to compare by eye.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap import world  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.store import gpkg, load  # noqa: E402
from citymap.store.import_osm import import_world  # noqa: E402
from citymap.style import Style  # noqa: E402

TEST_FRAME = Frame(id="test-1km", center_lon=135.205, center_lat=34.670,
                   rotation_deg=31.0, extent_m=1000.0, crs_epsg=6674)

SAMPLE_ELEMENTS = [
    {"type": "way", "id": 1, "tags": {"building": "yes", "height": "12"},
     "geometry": [{"lon": 135.2040, "lat": 34.6720}, {"lon": 135.2045, "lat": 34.6720},
                 {"lon": 135.2045, "lat": 34.6725}, {"lon": 135.2040, "lat": 34.6725},
                 {"lon": 135.2040, "lat": 34.6720}]},
    {"type": "way", "id": 2, "tags": {"highway": "residential"},
     "nodes": [10, 11],
     "geometry": [{"lon": 135.2020, "lat": 34.6730}, {"lon": 135.2080, "lat": 34.6730}]},
    {"type": "way", "id": 3, "tags": {"natural": "coastline"},
     "geometry": [{"lon": 135.15, "lat": 34.668}, {"lon": 135.26, "lat": 34.668}]},
    {"type": "way", "id": 4, "tags": {"railway": "rail"},
     "nodes": [30, 31],
     "geometry": [{"lon": 135.2000, "lat": 34.6740}, {"lon": 135.2100, "lat": 34.6740}]},
    {"type": "node", "id": 20, "lon": 135.2042, "lat": 34.6722,
     "tags": {"highway": "street_lamp"}},
]


def _built_world():
    boundary = TEST_FRAME.classification_boundary()
    w = world.build_world(SAMPLE_ELEMENTS, TEST_FRAME.fwd, boundary, TEST_FRAME.crs_epsg)
    from shapely.geometry import Polygon as P
    from citymap.world import TerrainEdit
    w.terrain_edits.append(TerrainEdit(id="e1", polygon=P([(0, 0), (10, 0), (10, 10), (0, 10)]),
                                       target_elevation_m=42.5, blend_m=12.0, source="op:test"))
    w.terrain_edits.append(TerrainEdit(id="e2", polygon=P([(2, 2), (8, 2), (8, 8), (2, 8)]),
                                       target_elevation_m=48.0, blend_m=3.0, source="op:test"))
    return w


class TestImportAndLoadRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.gpkg_path = os.path.join(self.tmp, "test.gpkg")

    def test_feature_count_and_fields_match(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)

        self.assertEqual(len(back.features), len(w.features))
        by_id = {f.id: f for f in w.features}
        for f in back.features:
            original = by_id[f.id]
            self.assertTrue(f.geom.equals_exact(original.geom, tolerance=1e-6))
            self.assertEqual(f.area, original.area)
            self.assertAlmostEqual(f.height_m, original.height_m, places=3)
            self.assertEqual(f.tags, original.tags)
            self.assertEqual(f.source, original.source)
            self.assertEqual(f.osm_way_id, original.osm_way_id)

    def test_sea_geometry_matches(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        self.assertIsNotNone(back.sea.sea_geom)
        self.assertAlmostEqual(back.sea.sea_geom.area, w.sea.sea_geom.area, places=3)

    def test_road_graph_matches(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        self.assertEqual(back.road_graph.degree(10), w.road_graph.degree(10))
        self.assertEqual(back.road_graph.node_ways[10], w.road_graph.node_ways[10])
        self.assertEqual(set(back.road_graph.node_xy), set(w.road_graph.node_xy))

    def test_rail_graph_matches_and_is_independent_of_road(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        self.assertEqual(set(back.rail_graph.node_xy), set(w.rail_graph.node_xy))
        self.assertTrue(set(back.rail_graph.node_xy).isdisjoint(set(back.road_graph.node_xy)))

    def test_lamps_match(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        self.assertEqual(len(back.lamps), len(w.lamps))
        self.assertAlmostEqual(back.lamps[0][0], w.lamps[0][0], places=3)
        self.assertAlmostEqual(back.lamps[0][1], w.lamps[0][1], places=3)

    def test_terrain_edits_preserve_stack_order(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        self.assertEqual([e.id for e in back.terrain_edits], ["e1", "e2"])
        self.assertAlmostEqual(back.terrain_edits[0].target_elevation_m, 42.5)
        self.assertAlmostEqual(back.terrain_edits[1].target_elevation_m, 48.0)

    def test_no_sea_imports_and_loads_as_none(self):
        elements = [e for e in SAMPLE_ELEMENTS if e.get("id") != 3]
        boundary = TEST_FRAME.classification_boundary()
        w = world.build_world(elements, TEST_FRAME.fwd, boundary, TEST_FRAME.crs_epsg)
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        self.assertIsNone(back.sea.sea_geom)

    def test_unicode_tags_survive(self):
        elements = list(SAMPLE_ELEMENTS)
        elements[0] = {**elements[0]}
        elements[0]["tags"] = {**elements[0]["tags"], "name:ja": "ポートアイランド"}
        boundary = TEST_FRAME.classification_boundary()
        w = world.build_world(elements, TEST_FRAME.fwd, boundary, TEST_FRAME.crs_epsg)
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        back = load.load_world_from_store(self.gpkg_path)
        matching = [f for f in back.features if f.tags.get("name:ja")]
        self.assertEqual(matching[0].tags["name:ja"], "ポートアイランド")

    def test_world_version_starts_at_zero_after_import(self):
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        conn = gpkg.connect(self.gpkg_path)
        self.addCleanup(conn.close)
        self.assertEqual(gpkg.get_world_version(conn), 0)

    def test_import_does_not_write_change_log_entries(self):
        """A one-time bootstrap is not a series of user edits -- nothing here
        should show up in the undo history."""
        w = _built_world()
        import_world(w, self.gpkg_path, on_note=lambda *_: None)
        conn = gpkg.connect(self.gpkg_path)
        self.addCleanup(conn.close)
        n = conn.execute("SELECT COUNT(*) AS n FROM change_log").fetchone()["n"]
        self.assertEqual(n, 0)


class TestResolveFieldsFromStore(unittest.TestCase):
    """resolve_fields_from_store: the store-path analogue of render.py's
    resolve_fields, which caches the OSM-fetch path's Fields -- without
    this, a server restart pays the full DEM/hillshade build cost every
    time even when nothing in the store changed (measured ~155s on the
    real Kurose data)."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.gpkg_path = os.path.join(self.tmp, "test.gpkg")
        import_world(_built_world(), self.gpkg_path, on_note=lambda *_: None)
        self.style = Style.from_file(os.path.join(
            os.path.dirname(__file__), "..", "..", "data", "map", "style", "kurose-1950s.json"))

    def test_first_call_builds_and_caches(self):
        f = load.resolve_fields_from_store(self.gpkg_path, TEST_FRAME, self.style, self.tmp, self.tmp,
                                          on_note=lambda *_: None)
        self.assertEqual(f.elevation.shape, (TEST_FRAME.dem_grid, TEST_FRAME.dem_grid))
        self.assertGreater(len(f.features), 0)

    def test_second_call_is_a_cache_hit_not_a_rebuild(self):
        """Verified by making build_fields explode if actually called a
        second time -- the same technique test_tiles.py uses for its own
        cache-hit tests."""
        load.resolve_fields_from_store(self.gpkg_path, TEST_FRAME, self.style, self.tmp, self.tmp,
                                      on_note=lambda *_: None)

        from citymap import fields as fields_module
        import unittest.mock as mock
        with mock.patch.object(fields_module, "build_fields",
                              side_effect=AssertionError("must not rebuild on a cache hit")):
            f2 = load.resolve_fields_from_store(self.gpkg_path, TEST_FRAME, self.style, self.tmp, self.tmp,
                                               on_note=lambda *_: None)
        self.assertIsNotNone(f2)

    def test_a_changed_world_version_is_a_cache_miss(self):
        """Simulates a real store edit (world_version bumped) -- the next
        resolve must NOT silently serve stale Fields from before the edit."""
        load.resolve_fields_from_store(self.gpkg_path, TEST_FRAME, self.style, self.tmp, self.tmp,
                                      on_note=lambda *_: None)

        conn = gpkg.connect(self.gpkg_path)
        gpkg._bump_world_version(conn)
        conn.commit()
        conn.close()

        notes = []
        load.resolve_fields_from_store(self.gpkg_path, TEST_FRAME, self.style, self.tmp, self.tmp,
                                      on_note=notes.append)
        self.assertTrue(any("building fields" in n for n in notes),
                       "a changed world_version must trigger a real rebuild, not a cache hit")


if __name__ == "__main__":
    unittest.main()
