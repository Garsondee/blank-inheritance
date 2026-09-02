"""World (L1) tests: build/save/load round-trip, and the property the whole
layer exists for -- L1 does not depend on frame rotation.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap import cache, world  # noqa: E402
from citymap.frame import Frame  # noqa: E402

# A small (1km) test frame, NOT the real 12km Kurose frame -- world-building
# tests want a boundary the sample coastline can actually span. A short
# coastline segment floating inside a much larger boundary would never reach
# the boundary ring, so polygonize() would produce one undivided face and no
# sea/land split at all (found the hard way: see git history of this file).
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
    # Spans well past the 1km test frame's ~2km classification boundary on
    # both ends, so it properly crosses the boundary ring and splits it into
    # land/sea faces -- a segment that stays entirely inside the boundary
    # never reaches the ring at all, and polygonize() then produces one
    # undivided face with no sea/land split (found the hard way).
    {"type": "way", "id": 3, "tags": {"natural": "coastline"},
     "geometry": [{"lon": 135.15, "lat": 34.668}, {"lon": 135.26, "lat": 34.668}]},
    {"type": "node", "id": 20, "lon": 135.2042, "lat": 34.6722,
     "tags": {"highway": "street_lamp"}},
]

KUROSE = TEST_FRAME  # kept as an alias so existing references below still read clearly


class TestBuildWorld(unittest.TestCase):
    def test_builds_features_graph_and_sea(self):
        boundary = KUROSE.classification_boundary()
        w = world.build_world(SAMPLE_ELEMENTS, KUROSE.fwd, boundary, KUROSE.crs_epsg)
        self.assertEqual(len(w.features), 3)  # building, road, coastline
        self.assertEqual(len(w.lamps), 1)
        self.assertIn(10, w.road_graph.node_xy)

    def test_sea_synthesised_when_coastline_present(self):
        boundary = KUROSE.classification_boundary()
        w = world.build_world(SAMPLE_ELEMENTS, KUROSE.fwd, boundary, KUROSE.crs_epsg)
        self.assertIsNotNone(w.sea.sea_geom)

    def test_all_features_includes_the_sea_polygon(self):
        boundary = KUROSE.classification_boundary()
        w = world.build_world(SAMPLE_ELEMENTS, KUROSE.fwd, boundary, KUROSE.crs_epsg)
        all_feats = w.all_features()
        self.assertEqual(len(all_feats), len(w.features) + 1)
        self.assertTrue(any(f.tags.get("__sea__") for f in all_feats))

    def test_no_coastline_means_no_sea_feature_added(self):
        elements = [e for e in SAMPLE_ELEMENTS if e.get("id") != 3]
        boundary = KUROSE.classification_boundary()
        w = world.build_world(elements, KUROSE.fwd, boundary, KUROSE.crs_epsg)
        self.assertIsNone(w.sea.sea_geom)
        self.assertEqual(len(w.all_features()), len(w.features))


class TestSaveLoadRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def _built(self):
        boundary = KUROSE.classification_boundary()
        return world.build_world(SAMPLE_ELEMENTS, KUROSE.fwd, boundary, KUROSE.crs_epsg)

    def test_features_round_trip(self):
        w = self._built()
        artifact = cache.Artifact(self.tmp, {"q": "x", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)

        self.assertEqual(len(back.features), len(w.features))
        by_id = {f.id: f for f in w.features}
        for f in back.features:
            original = by_id[f.id]
            self.assertTrue(f.geom.equals_exact(original.geom, tolerance=1e-6))
            self.assertEqual(f.area, original.area)
            self.assertAlmostEqual(f.height_m, original.height_m, places=3)
            self.assertEqual(f.tags, original.tags)

    def test_sea_geometry_round_trips(self):
        w = self._built()
        artifact = cache.Artifact(self.tmp, {"q": "x", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)
        self.assertIsNotNone(back.sea.sea_geom)
        self.assertAlmostEqual(back.sea.sea_geom.area, w.sea.sea_geom.area, places=3)

    def test_road_graph_round_trips(self):
        w = self._built()
        artifact = cache.Artifact(self.tmp, {"q": "x", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)
        self.assertEqual(back.road_graph.degree(10), w.road_graph.degree(10))
        self.assertEqual(back.road_graph.node_ways[10], w.road_graph.node_ways[10])

    def test_lamps_round_trip(self):
        w = self._built()
        artifact = cache.Artifact(self.tmp, {"q": "x", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)
        self.assertEqual(len(back.lamps), len(w.lamps))
        self.assertAlmostEqual(back.lamps[0][0], w.lamps[0][0], places=3)

    def test_no_sea_round_trips_as_none(self):
        elements = [e for e in SAMPLE_ELEMENTS if e.get("id") != 3]
        boundary = KUROSE.classification_boundary()
        w = world.build_world(elements, KUROSE.fwd, boundary, KUROSE.crs_epsg)
        artifact = cache.Artifact(self.tmp, {"q": "y", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)
        self.assertIsNone(back.sea.sea_geom)

    def test_unicode_tags_round_trip(self):
        elements = list(SAMPLE_ELEMENTS)
        elements[0] = {**elements[0]}
        elements[0]["tags"] = {**elements[0]["tags"], "name:ja": "ポートアイランド"}
        boundary = KUROSE.classification_boundary()
        w = world.build_world(elements, KUROSE.fwd, boundary, KUROSE.crs_epsg)
        artifact = cache.Artifact(self.tmp, {"q": "z", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)
        matching = [f for f in back.features if f.tags.get("name:ja")]
        self.assertEqual(matching[0].tags["name:ja"], "ポートアイランド")


class TestFrameIndependence(unittest.TestCase):
    """The property L1 exists for: rotation must not change the world."""

    def test_lonlat_bbox_is_NOT_rotation_independent(self):
        """The wrong tool, kept honest: `lonlat_bbox` deliberately DOES vary
        with rotation (it circumscribes the actual tilted footprint). This
        pins that down so nobody "fixes" it into ambiguity with
        `fetch_bbox_lonlat` below, which is the one that must not vary."""
        base = Frame(id="f", center_lon=135.205, center_lat=34.678,
                    rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        rotated = Frame(id="f", center_lon=135.205, center_lat=34.678,
                       rotation_deg=0.0, extent_m=12000.0, crs_epsg=6674)
        south1, _, _, _ = base.lonlat_bbox(pad_m=250.0)
        south2, _, _, _ = rotated.lonlat_bbox(pad_m=250.0)
        self.assertNotAlmostEqual(south1, south2, places=3)

    def test_fetch_bbox_lonlat_is_independent_of_rotation(self):
        base = Frame(id="f", center_lon=135.205, center_lat=34.678,
                    rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        rotated = Frame(id="f", center_lon=135.205, center_lat=34.678,
                       rotation_deg=0.0, extent_m=12000.0, crs_epsg=6674)
        south1, west1, north1, east1 = base.fetch_bbox_lonlat(pad_m=250.0)
        south2, west2, north2, east2 = rotated.fetch_bbox_lonlat(pad_m=250.0)
        self.assertAlmostEqual(south1, south2, places=6)
        self.assertAlmostEqual(west1, west2, places=6)
        self.assertAlmostEqual(north1, north2, places=6)
        self.assertAlmostEqual(east1, east2, places=6)

    def test_classification_boundary_is_independent_of_rotation(self):
        base = Frame(id="f", center_lon=135.205, center_lat=34.678,
                    rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        rotated = Frame(id="f", center_lon=135.205, center_lat=34.678,
                       rotation_deg=97.0, extent_m=12000.0, crs_epsg=6674)
        self.assertTrue(base.classification_boundary().equals(
            rotated.classification_boundary()))

    def test_the_same_world_key_regardless_of_rotation(self):
        """The end-to-end claim: two frames differing only in rotation must
        resolve to the same L1 cache entry, so re-rotating never re-fetches."""
        base = Frame(id="f", center_lon=135.205, center_lat=34.678,
                    rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        rotated = Frame(id="f", center_lon=135.205, center_lat=34.678,
                       rotation_deg=0.0, extent_m=12000.0, crs_epsg=6674)
        south1, west1, north1, east1 = base.fetch_bbox_lonlat(pad_m=world.FETCH_PAD_M)
        south2, west2, north2, east2 = rotated.fetch_bbox_lonlat(pad_m=world.FETCH_PAD_M)
        q1 = __import__("citymap.acquire", fromlist=["build_overpass_query"]) \
            .build_overpass_query(south1, west1, north1, east1)
        q2 = __import__("citymap.acquire", fromlist=["build_overpass_query"]) \
            .build_overpass_query(south2, west2, north2, east2)
        key1 = world.world_key_parts(q1, base.crs_epsg)
        key2 = world.world_key_parts(q2, rotated.crs_epsg)
        self.assertEqual(key1, key2)

    def test_extent_change_does_change_the_key(self):
        """The other half of the claim: this is NOT unconditional caching."""
        a = Frame(id="f", center_lon=135.205, center_lat=34.678,
                 rotation_deg=0.0, extent_m=12000.0, crs_epsg=6674)
        b = Frame(id="f", center_lon=135.205, center_lat=34.678,
                 rotation_deg=0.0, extent_m=20000.0, crs_epsg=6674)
        south1, west1, north1, east1 = a.fetch_bbox_lonlat(pad_m=world.FETCH_PAD_M)
        south2, west2, north2, east2 = b.fetch_bbox_lonlat(pad_m=world.FETCH_PAD_M)
        from citymap.acquire import build_overpass_query
        key1 = world.world_key_parts(build_overpass_query(south1, west1, north1, east1), 6674)
        key2 = world.world_key_parts(build_overpass_query(south2, west2, north2, east2), 6674)
        self.assertNotEqual(key1, key2)


class TestFetchBuildAndCacheWorld(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_prebuilt_cache_hit_never_touches_the_network(self):
        """Seed a cache entry, then confirm it is served without fetching."""
        frame = TEST_FRAME
        south, west, north, east = frame.fetch_bbox_lonlat(pad_m=world.FETCH_PAD_M)
        from citymap.acquire import build_overpass_query
        query = build_overpass_query(south, west, north, east)
        key_parts = world.world_key_parts(query, frame.crs_epsg)

        world_dir = cache.artifact_root(self.tmp, "world")
        artifact = cache.Artifact(world_dir, key_parts)
        boundary = frame.classification_boundary()
        built = world.build_world(SAMPLE_ELEMENTS, frame.fwd, boundary, frame.crs_epsg)
        world.save_world(built, artifact)

        # A bad Overpass source dir would raise if fetch_overpass were ever
        # reached, proving this path used the cache instead.
        back = world.fetch_build_and_cache_world(frame, self.tmp)
        self.assertEqual(len(back.features), len(built.features))


class TestTerrainEditsRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_terrain_edits_round_trip(self):
        from shapely.geometry import Polygon as P
        from citymap.world import TerrainEdit
        boundary = TEST_FRAME.classification_boundary()
        w = world.build_world(SAMPLE_ELEMENTS, TEST_FRAME.fwd, boundary, TEST_FRAME.crs_epsg)
        edit = TerrainEdit(id="e1", polygon=P([(0, 0), (10, 0), (10, 10), (0, 10)]),
                           target_elevation_m=42.5, blend_m=12.0, source="op:test")
        w.terrain_edits.append(edit)

        artifact = cache.Artifact(self.tmp, {"q": "y", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)

        self.assertEqual(len(back.terrain_edits), 1)
        got = back.terrain_edits[0]
        self.assertEqual(got.id, "e1")
        self.assertAlmostEqual(got.target_elevation_m, 42.5)
        self.assertAlmostEqual(got.blend_m, 12.0)
        self.assertEqual(got.source, "op:test")
        self.assertAlmostEqual(got.polygon.area, edit.polygon.area, places=3)

    def test_a_world_saved_with_no_edits_loads_an_empty_list(self):
        boundary = TEST_FRAME.classification_boundary()
        w = world.build_world(SAMPLE_ELEMENTS, TEST_FRAME.fwd, boundary, TEST_FRAME.crs_epsg)
        self.assertEqual(w.terrain_edits, [])
        artifact = cache.Artifact(self.tmp, {"q": "z", "crsEpsg": 6674})
        world.save_world(w, artifact)
        back = world.load_world(artifact)
        self.assertEqual(back.terrain_edits, [])

    def test_a_cache_written_before_terrain_edits_existed_still_loads(self):
        """Simulates a pre-existing on-disk cache: no terrain_edits.* files at
        all. Must load as an empty list, not raise -- see world.py's
        load_world docstring note on this being an additive field."""
        boundary = TEST_FRAME.classification_boundary()
        w = world.build_world(SAMPLE_ELEMENTS, TEST_FRAME.fwd, boundary, TEST_FRAME.crs_epsg)
        artifact = cache.Artifact(self.tmp, {"q": "legacy", "crsEpsg": 6674})
        world.save_world(w, artifact)
        for suffix in (".wkb", ".offsets.npy"):
            os.remove(artifact.path("terrain_edits") + suffix)
        os.remove(artifact.path("terrain_edits.attrs.json"))

        back = world.load_world(artifact)
        self.assertEqual(back.terrain_edits, [])


if __name__ == "__main__":
    unittest.main()
