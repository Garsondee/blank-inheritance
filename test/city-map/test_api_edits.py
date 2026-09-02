"""Tests for api.edits -- map-editor plan Phase 4: PATCH /api/features/{id}
and POST /api/undo. Pure-function unit tests first (no HTTP, no DB), then
real HTTP-level behaviour via FastAPI's TestClient, matching
test_api_tiles.py's TileServerTestCase pattern so a PATCH/undo request is
exercised through the exact same ASGI stack a real client would hit.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
import shapely.affinity  # noqa: E402
import shapely.geometry  # noqa: E402
import shapely.ops  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap import fields as fields_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.store import gpkg as gpkg_module  # noqa: E402
from citymap.style import Style  # noqa: E402

from api import edits  # noqa: E402
from api.main import app, configure  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=2000.0, crs_epsg=6674, dem_grid=32)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))


# --- pure-function tests -----------------------------------------------

class TestReprojectGeojsonToSource(unittest.TestCase):
    def test_round_trips_against_the_frames_own_inverse(self):
        """The exact inverse of api/features.py's feature_kwargs_to_geojson
        -- reprojecting a real SOURCE-CRS point out to lon/lat and back
        must return (within float tolerance) the original point."""
        source_pt = Point(FRAME.cx + 50, FRAME.cy - 30)
        lon, lat = FRAME.inv.transform(source_pt.x, source_pt.y)
        geojson = {"type": "Point", "coordinates": [lon, lat]}
        back = edits.reproject_geojson_to_source(FRAME, geojson)
        self.assertAlmostEqual(back.x, source_pt.x, delta=1e-6)
        self.assertAlmostEqual(back.y, source_pt.y, delta=1e-6)

    def test_reprojects_a_polygon_not_just_a_point(self):
        lon, lat = FRAME.inv.transform(FRAME.cx, FRAME.cy)
        geojson = {"type": "Polygon", "coordinates": [[
            [lon - 0.0001, lat - 0.0001], [lon + 0.0001, lat - 0.0001],
            [lon + 0.0001, lat + 0.0001], [lon - 0.0001, lat + 0.0001],
            [lon - 0.0001, lat - 0.0001],
        ]]}
        back = edits.reproject_geojson_to_source(FRAME, geojson)
        self.assertIsInstance(back, Polygon)
        self.assertAlmostEqual(back.centroid.x, FRAME.cx, delta=5.0)
        self.assertAlmostEqual(back.centroid.y, FRAME.cy, delta=5.0)


class TestRepairGeometry(unittest.TestCase):
    def test_a_valid_polygon_passes_through_unchanged_and_unreported(self):
        p = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        out, repaired = edits.repair_geometry(p)
        self.assertFalse(repaired)
        self.assertTrue(out.equals_exact(p, tolerance=1e-9))

    def test_a_bowtie_polygon_is_repaired_and_reported(self):
        bowtie = Polygon([(0, 0), (10, 10), (10, 0), (0, 10), (0, 0)])
        self.assertFalse(bowtie.is_valid)
        out, repaired = edits.repair_geometry(bowtie)
        self.assertTrue(repaired)
        self.assertTrue(out.is_valid)

    def test_none_passes_through_as_none_unreported(self):
        out, repaired = edits.repair_geometry(None)
        self.assertIsNone(out)
        self.assertFalse(repaired)

    def test_empty_geometry_passes_through_unreported(self):
        empty = Polygon()
        out, repaired = edits.repair_geometry(empty)
        self.assertTrue(out.is_empty)
        self.assertFalse(repaired)


class TestUnionBounds(unittest.TestCase):
    def test_union_of_two_disjoint_boxes(self):
        a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        b = Polygon([(20, 20), (30, 20), (30, 30), (20, 30)])
        self.assertEqual(edits.union_bounds(a, b), (0, 0, 30, 30))

    def test_none_and_empty_entries_are_skipped(self):
        a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        self.assertEqual(edits.union_bounds(a, None, Polygon()), a.bounds)

    def test_all_none_or_empty_returns_none(self):
        self.assertIsNone(edits.union_bounds(None, Polygon()))


# --- HTTP-level tests -----------------------------------------------------

class EditsServerTestCase(unittest.TestCase):
    """Same fixture shape as test_api_tiles.py's TileServerTestCase: a real
    backing .gpkg store AND a matching in-memory Fields, so a PATCH's store
    write and its live-Fields sync can both be checked against the same
    starting point."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

        half = 15.0
        self.building = Feature(
            id="test-bldg",
            geom=Polygon([(FRAME.cx - half, FRAME.cy - half), (FRAME.cx + half, FRAME.cy - half),
                         (FRAME.cx + half, FRAME.cy + half), (FRAME.cx - half, FRAME.cy + half)]),
            tags={"building": "yes"}, area=True, height_m=12.0)

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        gpkg_module.insert_feature(conn, id=self.building.id, geom=self.building.geom,
                                  tags=self.building.tags, is_area=self.building.area,
                                  height_m=self.building.height_m, origin=self.building.source, log=False)
        conn.commit()
        conn.close()

        # Fields.features is documented MAP space (rotated + clipped) --
        # FRAME has a real nonzero rotation (31 deg), so building it from
        # the raw SOURCE-CRS self.building here (skipping rotate_and_clip,
        # the way test_api_tiles.py's own fixture does since that module
        # never compares Fields.features against store geometry directly)
        # would silently make every live-Fields assertion below compare
        # two DIFFERENT coordinate spaces. Going through rotate_and_clip
        # for real matches what build_fields() actually does in production.
        n = FRAME.dem_grid
        map_features = fields_module.rotate_and_clip([self.building], FRAME)
        fields = fields_module.Fields(
            frame=FRAME, features=map_features, lamps=[],
            elevation=np.zeros((n, n), dtype=np.float32),
            shade_rgb=np.full((n, n, 3), 200, dtype=np.float32),
            sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path, self.tmp, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _moved_geojson(self, dx_m=200.0, dy_m=0.0):
        """The building's real geometry, translated dx/dy metres in SOURCE
        space, then reprojected out to lon/lat -- what a real frontend
        vertex-drag would send."""
        moved_source = shapely.affinity.translate(self.building.geom, xoff=dx_m, yoff=dy_m)
        lonlat = shapely.ops.transform(lambda x, y: FRAME.inv.transform(x, y), moved_source)
        return shapely.geometry.mapping(lonlat)


class TestPatchFeature(EditsServerTestCase):
    def test_moves_the_feature_and_returns_its_new_geojson(self):
        resp = self.client.patch(f"/api/features/{self.building.id}",
                                json={"geometry": self._moved_geojson()})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["feature"]["id"], self.building.id)
        self.assertFalse(body["repaired"])
        new_geom = shapely.geometry.shape(body["feature"]["geometry"])
        old_lon, old_lat = FRAME.inv.transform(self.building.geom.centroid.x, self.building.geom.centroid.y)
        self.assertNotAlmostEqual(new_geom.centroid.x, old_lon, places=4)

    def test_404_for_a_nonexistent_feature(self):
        resp = self.client.patch("/api/features/does-not-exist",
                                json={"geometry": self._moved_geojson()})
        self.assertEqual(resp.status_code, 404)

    def test_a_self_intersecting_polygon_is_repaired_and_reported(self):
        lon, lat = FRAME.inv.transform(FRAME.cx, FRAME.cy)
        d = 0.0003
        bowtie = {"type": "Polygon", "coordinates": [[
            [lon - d, lat - d], [lon + d, lat + d], [lon + d, lat - d], [lon - d, lat + d], [lon - d, lat - d],
        ]]}
        resp = self.client.patch(f"/api/features/{self.building.id}", json={"geometry": bowtie})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["repaired"])
        self.assertTrue(shapely.geometry.shape(body["feature"]["geometry"]).is_valid)

    def test_updates_the_live_in_memory_fields_immediately_no_restart(self):
        """The whole point of _sync_live_state: a PATCH must be visible to
        the CURRENT process's own tile-rendering data on the very next
        request, not just after a restart re-reads world_version."""
        self.client.patch(f"/api/features/{self.building.id}", json={"geometry": self._moved_geojson()})
        ids_now = [f.id for f in self.state.fields.features]
        self.assertEqual(ids_now, ["test-bldg"])
        moved_feature = self.state.fields.features[0]
        original_map_geom = fields_module.geom_to_map_space(self.building.geom, FRAME)
        self.assertFalse(moved_feature.geom.equals_exact(original_map_geom, tolerance=1e-6))

    def test_invalidates_the_stale_feature_tree_cache(self):
        """query_features (backed by an STRtree) must reflect the edit on
        the very next call -- proves _feature_tree was reset, not just the
        plain features list. Fields.features is MAP space, so the query
        geometry must be too -- geom_to_map_space is the same rotate+clip
        setUp already used to build the fixture in the first place."""
        original_map_geom = fields_module.geom_to_map_space(self.building.geom, FRAME)
        # Force the STRtree to build against the ORIGINAL location first.
        found_before = self.state.fields.query_features(original_map_geom.buffer(1))
        self.assertEqual([f.id for f in found_before], ["test-bldg"])

        self.client.patch(f"/api/features/{self.building.id}",
                         json={"geometry": self._moved_geojson(dx_m=500.0)})

        found_at_old_spot = self.state.fields.query_features(original_map_geom.buffer(1))
        self.assertEqual(found_at_old_spot, [])

    def test_bumps_world_version_in_the_store(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()

        self.client.patch(f"/api/features/{self.building.id}", json={"geometry": self._moved_geojson()})

        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_reports_a_nearby_terrain_edit_without_moving_it(self):
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_terrain_edit(conn, id="te1", geom=self.building.geom.buffer(5),
                                       target_elevation_m=10.0, stack_order=0, log=False)
        conn.commit()
        conn.close()

        resp = self.client.patch(f"/api/features/{self.building.id}",
                                json={"geometry": self._moved_geojson(dx_m=1.0)})
        self.assertEqual(resp.json()["nearbyTerrainEditIds"], ["te1"])

        conn = gpkg_module.connect(self.store_path)
        te_row = conn.execute("SELECT * FROM terrain_edit WHERE id = 'te1'").fetchone()
        conn.close()
        # Unmoved -- reporting is informational only, per this endpoint's
        # module docstring: it never blocks or modifies anything itself.
        self.assertIsNotNone(te_row)


class TestUndo(EditsServerTestCase):
    def test_undone_false_when_there_is_nothing_to_undo(self):
        resp = self.client.post("/api/undo")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"undone": False})

    def test_undoes_a_patch_restoring_the_original_geometry_live(self):
        original_geom = self.building.geom  # SOURCE CRS -- what the store holds
        original_map_geom = fields_module.geom_to_map_space(original_geom, FRAME)  # what Fields holds
        self.client.patch(f"/api/features/{self.building.id}", json={"geometry": self._moved_geojson()})

        resp = self.client.post("/api/undo")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["undone"])
        self.assertEqual(body["featureIds"], ["test-bldg"])

        # Live in-memory state (MAP space) reflects the restore...
        restored = self.state.fields.features[0]
        self.assertTrue(restored.geom.equals_exact(original_map_geom, tolerance=1e-6))

        # ...and so does the store itself (SOURCE CRS), not just Fields.
        conn = gpkg_module.connect(self.store_path)
        kwargs = gpkg_module.get_feature_kwargs(conn, "test-bldg")
        conn.close()
        self.assertTrue(kwargs["geom"].equals_exact(original_geom, tolerance=1e-6))

    def test_undo_twice_acts_as_redo(self):
        self.client.patch(f"/api/features/{self.building.id}", json={"geometry": self._moved_geojson()})
        after_patch = shapely.geometry.shape(
            self.client.post("/api/undo").json()["features"][0]["geometry"])
        # That request already undid it; a second call redoes -- back to
        # the moved position from the original patch.
        resp2 = self.client.post("/api/undo")
        redone_geom = shapely.geometry.shape(resp2.json()["features"][0]["geometry"])
        self.assertFalse(redone_geom.equals_exact(after_patch, tolerance=1e-6))


# --- Phase 6: POST /api/features (road creation + connectivity) -----------

class TestFindRoadEndpointConnection(unittest.TestCase):
    def test_a_point_near_an_existing_roads_vertex_is_connected(self):
        road_a = {"id": "a", "geom": LineString([(0, 0), (10, 0)])}
        result = edits.find_road_endpoint_connection((10.0, 0.0), [road_a], tolerance_m=1.0)
        self.assertEqual(result, {"sharedWithRoadIds": ["a"]})

    def test_a_dangling_point_returns_none(self):
        road_a = {"id": "a", "geom": LineString([(0, 0), (10, 0)])}
        result = edits.find_road_endpoint_connection((500.0, 500.0), [road_a], tolerance_m=15.0)
        self.assertIsNone(result)

    def test_multiple_roads_sharing_the_same_point_all_appear(self):
        point = (10.0, 0.0)
        road_a = {"id": "a", "geom": LineString([(0, 0), (10, 0)])}
        road_b = {"id": "b", "geom": LineString([(10, 0), (10, 10)])}
        road_c = {"id": "c", "geom": LineString([(10, 0), (20, -5)])}
        result = edits.find_road_endpoint_connection(point, [road_a, road_b, road_c], tolerance_m=1.0)
        self.assertEqual(set(result["sharedWithRoadIds"]), {"a", "b", "c"})

    def test_a_road_counts_once_even_with_several_own_vertices_in_tolerance(self):
        # Both of road_a's own points are within 1m of the query point.
        road_a = {"id": "a", "geom": LineString([(10.0, 0.0), (10.5, 0.0)])}
        result = edits.find_road_endpoint_connection((10.2, 0.0), [road_a], tolerance_m=2.0)
        self.assertEqual(result["sharedWithRoadIds"], ["a"])

    def test_exactly_at_the_tolerance_boundary_counts_as_connected(self):
        road_a = {"id": "a", "geom": LineString([(0, 0), (10, 0)])}
        result = edits.find_road_endpoint_connection((25.0, 0.0), [road_a], tolerance_m=15.0)
        self.assertEqual(result, {"sharedWithRoadIds": ["a"]})

    def test_a_road_with_no_geometry_is_skipped_not_a_crash(self):
        road_a = {"id": "a", "geom": None}
        result = edits.find_road_endpoint_connection((0.0, 0.0), [road_a], tolerance_m=15.0)
        self.assertIsNone(result)


class TestIsRoadFeatureInEdits(unittest.TestCase):
    """A minimal spot-check -- the full battery for this exact rule lives
    in test_api_ghostlines.py's TestIsRoadFeature; this pins that the
    edits.py copy (kept separate on purpose, see edits.py's own comment)
    hasn't silently drifted from it."""

    def test_a_tagged_line_is_a_road(self):
        kwargs = {"geom": LineString([(0, 0), (10, 0)]), "tags": {"highway": "residential"}, "area": False}
        self.assertTrue(edits.is_road_feature(kwargs))

    def test_an_area_is_never_a_road_even_if_tagged(self):
        kwargs = {"geom": Polygon([(0, 0), (10, 0), (10, 10), (0, 10)]),
                 "tags": {"highway": "pedestrian"}, "area": True}
        self.assertFalse(edits.is_road_feature(kwargs))


class CreateFeatureServerTestCase(unittest.TestCase):
    """A store with one existing road (test-road-a, from (cx-100,cy) to
    (cx,cy)) -- new roads are drawn to either land on its far endpoint
    (connected) or well away from it (dangling)."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

        self.existing_road = Feature(
            id="test-road-a",
            geom=LineString([(FRAME.cx - 100, FRAME.cy), (FRAME.cx, FRAME.cy)]),
            tags={"highway": "residential"}, area=False, height_m=0.0)

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        gpkg_module.insert_feature(conn, id=self.existing_road.id, geom=self.existing_road.geom,
                                  tags=self.existing_road.tags, is_area=False,
                                  height_m=0.0, origin="osm", log=False)
        conn.commit()
        conn.close()

        n = FRAME.dem_grid
        map_features = fields_module.rotate_and_clip([self.existing_road], FRAME)
        fields = fields_module.Fields(
            frame=FRAME, features=map_features, lamps=[],
            elevation=np.zeros((n, n), dtype=np.float32),
            shade_rgb=np.full((n, n, 3), 200, dtype=np.float32),
            sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path, self.tmp, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _lonlat_line(self, points_source):
        """A list of (x, y) SOURCE-CRS points -> a lon/lat GeoJSON
        LineString geometry, what a real frontend draw would send."""
        lonlat = [FRAME.inv.transform(x, y) for x, y in points_source]
        return {"type": "LineString", "coordinates": [list(p) for p in lonlat]}


class TestPostFeatures(CreateFeatureServerTestCase):
    def test_creates_a_real_feature_with_a_stable_id(self):
        geometry = self._lonlat_line([(FRAME.cx + 50, FRAME.cy + 50), (FRAME.cx + 150, FRAME.cy + 50)])
        resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["feature"]["id"])
        self.assertEqual(body["feature"]["properties"]["tags"], {"highway": "residential"})
        self.assertFalse(body["repaired"])

    def test_creating_the_same_geometry_twice_is_a_clean_409_not_a_crash(self):
        """geometry_feature_id is deterministic -- a real, intentional
        property (re-submitting the identical shape must not silently mint
        a duplicate) -- which surfaces here as a real uniqueness conflict
        on the second attempt. Caught as a clean 409, not an unhandled
        sqlite3.IntegrityError turning into a raw 500."""
        geometry = self._lonlat_line([(FRAME.cx + 50, FRAME.cy + 50), (FRAME.cx + 150, FRAME.cy + 50)])
        first = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        self.assertEqual(first.status_code, 200)
        second = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        self.assertEqual(second.status_code, 409)

    def test_a_dangling_road_reports_no_connectivity_on_either_end(self):
        geometry = self._lonlat_line([(FRAME.cx + 500, FRAME.cy + 500), (FRAME.cx + 600, FRAME.cy + 500)])
        resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        connectivity = resp.json()["connectivity"]
        self.assertIsNone(connectivity["start"])
        self.assertIsNone(connectivity["end"])

    def test_a_road_drawn_from_the_existing_roads_endpoint_reports_connected(self):
        # Starts exactly at test-road-a's own far endpoint (FRAME.cx, FRAME.cy).
        geometry = self._lonlat_line([(FRAME.cx, FRAME.cy), (FRAME.cx + 100, FRAME.cy + 20)])
        resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        connectivity = resp.json()["connectivity"]
        self.assertEqual(connectivity["start"]["sharedWithRoadIds"], ["test-road-a"])
        self.assertIsNone(connectivity["end"])

    def test_a_non_road_feature_gets_no_connectivity_field_at_all(self):
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                list(FRAME.inv.transform(FRAME.cx + 5, FRAME.cy + 5)),
                list(FRAME.inv.transform(FRAME.cx + 15, FRAME.cy + 5)),
                list(FRAME.inv.transform(FRAME.cx + 15, FRAME.cy + 15)),
                list(FRAME.inv.transform(FRAME.cx + 5, FRAME.cy + 15)),
                list(FRAME.inv.transform(FRAME.cx + 5, FRAME.cy + 5)),
            ]],
        }
        resp = self.client.post("/api/features",
                               json={"geometry": geometry, "tags": {"building": "yes"}, "isArea": True})
        self.assertIsNone(resp.json()["connectivity"])

    def test_the_new_feature_is_immediately_visible_in_live_fields(self):
        geometry = self._lonlat_line([(FRAME.cx + 50, FRAME.cy + 50), (FRAME.cx + 150, FRAME.cy + 50)])
        resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        new_id = resp.json()["feature"]["id"]
        ids_now = [f.id for f in self.state.fields.features]
        self.assertIn(new_id, ids_now)

    def test_a_self_intersecting_road_is_repaired_and_reported(self):
        lon, lat = FRAME.inv.transform(FRAME.cx, FRAME.cy)
        d = 0.0003
        bowtie = {"type": "LineString", "coordinates": [
            [lon - d, lat - d], [lon + d, lat + d], [lon + d, lat - d], [lon - d, lat + d],
        ]}
        resp = self.client.post("/api/features", json={"geometry": bowtie, "tags": {"highway": "residential"}})
        self.assertEqual(resp.status_code, 200)

    def test_invalid_geometry_returns_422(self):
        resp = self.client.post("/api/features", json={"geometry": {"type": "Polygon", "coordinates": []}})
        self.assertEqual(resp.status_code, 422)

    def test_bumps_world_version(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        geometry = self._lonlat_line([(FRAME.cx + 50, FRAME.cy + 50), (FRAME.cx + 150, FRAME.cy + 50)])
        self.client.post("/api/features", json={"geometry": geometry, "tags": {}})
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_a_non_residential_highway_class_is_stored_and_reported_verbatim(self):
        """map-editor plan Phase 13: every one of the 21 real highway
        classes gets its own direct-draw toolbar button -- every existing
        test of this route happened to send highway=residential, which
        could never have caught a class-specific regression. Motorway here
        as the representative non-residential case."""
        geometry = self._lonlat_line([(FRAME.cx + 250, FRAME.cy + 250), (FRAME.cx + 350, FRAME.cy + 250)])
        resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "motorway"}})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["feature"]["properties"]["tags"], {"highway": "motorway"})

    def test_a_railway_tag_is_stored_and_reported_verbatim(self):
        """The toolbar's one Rail button -- stylistically separate from the
        21-entry highway table (core/style.ts's own split), never exercised
        by any existing test of this route."""
        geometry = self._lonlat_line([(FRAME.cx + 250, FRAME.cy + 300), (FRAME.cx + 350, FRAME.cy + 300)])
        resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"railway": "rail"}})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["feature"]["properties"]["tags"], {"railway": "rail"})
        # A railway isn't a highway -- connectivity is a highway-only concept.
        self.assertIsNone(body["connectivity"])

    def test_a_building_preset_with_a_real_height_is_stored_and_reported_verbatim(self):
        """The toolbar's 5 building-preset buttons (House/Hall/Tall Building/
        Tower/Antenna) always send a real heightM, unlike every existing
        area-feature test of this route (which leaves heightM at its 0.0
        default)."""
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                list(FRAME.inv.transform(FRAME.cx + 400, FRAME.cy + 400)),
                list(FRAME.inv.transform(FRAME.cx + 410, FRAME.cy + 400)),
                list(FRAME.inv.transform(FRAME.cx + 410, FRAME.cy + 410)),
                list(FRAME.inv.transform(FRAME.cx + 400, FRAME.cy + 410)),
                list(FRAME.inv.transform(FRAME.cx + 400, FRAME.cy + 400)),
            ]],
        }
        resp = self.client.post("/api/features", json={
            "geometry": geometry, "tags": {"building": "tower"}, "isArea": True, "heightM": 45.0,
        })
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["feature"]["properties"]["tags"], {"building": "tower"})
        self.assertEqual(body["feature"]["properties"]["heightM"], 45.0)
        self.assertTrue(body["feature"]["properties"]["isArea"])


class TestUndoARoadCreation(CreateFeatureServerTestCase):
    def test_undo_removes_the_newly_created_road(self):
        geometry = self._lonlat_line([(FRAME.cx + 50, FRAME.cy + 50), (FRAME.cx + 150, FRAME.cy + 50)])
        create_resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        new_id = create_resp.json()["feature"]["id"]

        undo_resp = self.client.post("/api/undo")
        body = undo_resp.json()
        self.assertTrue(body["undone"])
        self.assertEqual(body["deletedFeatureIds"], [new_id])
        self.assertNotIn(new_id, [f.id for f in self.state.fields.features])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, new_id)
        conn.close()
        self.assertIsNone(row)

    def test_redo_after_undoing_a_creation_brings_it_back(self):
        geometry = self._lonlat_line([(FRAME.cx + 50, FRAME.cy + 50), (FRAME.cx + 150, FRAME.cy + 50)])
        create_resp = self.client.post("/api/features", json={"geometry": geometry, "tags": {"highway": "residential"}})
        new_id = create_resp.json()["feature"]["id"]

        self.client.post("/api/undo")  # delete it
        redo_resp = self.client.post("/api/undo")  # redo -- recreate it
        body = redo_resp.json()
        self.assertEqual(body["deletedFeatureIds"], [])
        self.assertEqual([f["id"] for f in body["features"]], [new_id])
        self.assertIn(new_id, [f.id for f in self.state.fields.features])


class TestDeleteFeature(CreateFeatureServerTestCase):
    """A real, direct-delete gap this whole stack had until now: every
    prior tool could CREATE or EDIT a feature, but removing an unwanted
    one outright (an existing building, a sea fort, an array instance) had
    no route at all -- surfaced directly by real hands-on use of the
    editor, not found in advance by any test. gpkg.delete_feature itself
    was already fully tested (Phase 6, as undo's own reversal of an
    insert); this is the first real caller that invokes it as a direct,
    intentional user action."""

    def test_deletes_the_feature_from_the_store(self):
        resp = self.client.delete("/api/features/test-road-a")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["deleted"])
        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "test-road-a")
        conn.close()
        self.assertIsNone(row)

    def test_deletes_the_feature_from_live_fields_too(self):
        self.assertTrue(any(f.id == "test-road-a" for f in self.state.fields.features))
        self.client.delete("/api/features/test-road-a")
        self.assertFalse(any(f.id == "test-road-a" for f in self.state.fields.features))

    def test_deleting_a_nonexistent_id_returns_404(self):
        resp = self.client.delete("/api/features/no-such-feature")
        self.assertEqual(resp.status_code, 404)

    def test_bumps_world_version(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.delete("/api/features/test-road-a")
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_reports_tiles_invalidated_as_a_real_count(self):
        resp = self.client.delete("/api/features/test-road-a")
        self.assertIsInstance(resp.json()["tilesInvalidated"], int)

    def test_undo_restores_the_exact_deleted_feature(self):
        """Full undo support for free -- delete_feature's own change_log
        entry, reversed by undo_last_change's EXISTING ("feature", "delete")
        branch (built in Phase 6 for a different purpose, reused here
        unchanged)."""
        self.client.delete("/api/features/test-road-a")
        conn = gpkg_module.connect(self.store_path)
        self.assertIsNone(gpkg_module.get_feature_row(conn, "test-road-a"))
        conn.close()

        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        kwargs = gpkg_module._row_to_feature_kwargs(gpkg_module.get_feature_row(conn, "test-road-a"))
        conn.close()
        self.assertTrue(kwargs["geom"].equals_exact(self.existing_road.geom, tolerance=1e-9))
        self.assertEqual(kwargs["tags"], {"highway": "residential"})
        self.assertTrue(any(f.id == "test-road-a" for f in self.state.fields.features))


if __name__ == "__main__":
    unittest.main()
