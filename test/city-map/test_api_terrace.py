"""HTTP-level tests for POST /api/terrace -- map-editor plan Phase 7.

Uses a REAL fields_module.build_fields (a real, if small dem_grid=32, DEM
fetch -- disk-cached after the first call within a test, matching
test_fields.py's TestResyncTerrainFromStore precedent) rather than a bare
Fields(...) constructor, because these tests need Fields.
resync_terrain_from_store to actually work end-to-end, not just accept a
call.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import Point  # noqa: E402

from citymap import fields as fields_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.store import gpkg as gpkg_module  # noqa: E402
from citymap.style import Style  # noqa: E402
from citymap.world import World  # noqa: E402

from api.main import app, configure  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

# rotation_deg=0 keeps outline authoring simple; small dem_grid keeps the
# real DEM fetch/hillshade recompute each test triggers fast.
FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=800.0, crs_epsg=6674, dem_grid=64)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))


class TerraceServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        world = World(features=[], road_graph=RoadGraph(), lamps=[],
                     sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)
        fields = fields_module.build_fields(world, FRAME, self.dem_cache, STYLE)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path,
                              self.dem_cache, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _outline_lonlat(self, half_size_m=100.0):
        cx, cy = FRAME.cx, FRAME.cy
        corners_source = [
            (cx - half_size_m, cy - half_size_m), (cx + half_size_m, cy - half_size_m),
            (cx + half_size_m, cy + half_size_m), (cx - half_size_m, cy + half_size_m),
            (cx - half_size_m, cy - half_size_m),
        ]
        coords = [list(FRAME.inv.transform(x, y)) for x, y in corners_source]
        return {"type": "Polygon", "coordinates": [coords]}

    def _default_body(self, **overrides):
        body = {
            "outline": self._outline_lonlat(),
            "baseElevationM": 0.0,
            "tiers": 3,
            "stepHeightM": 3.0,
            "insetM": 40.0,  # comfortably above this test frame's own 2-DEM-cell floor (25.0m
                             # at extent_m=800/dem_grid=64) -- see cell_m in setUp's docstring
            "blendM": 8.0,
            "mode": "fill",
        }
        body.update(overrides)
        return body


class TestCreateTerrace(TerraceServerTestCase):
    def test_creates_real_tiers_and_risers(self):
        resp = self.client.post("/api/terrace", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["terrainEditIds"]), 3)
        self.assertEqual(len(body["riserFeatures"]), 2)
        self.assertFalse(body["repaired"])

    def test_tiers_are_real_rows_in_the_store_with_correct_stack_order(self):
        self.client.post("/api/terrace", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        rows = list(gpkg_module.iter_all_terrain_edits(conn))
        conn.close()
        self.assertEqual(len(rows), 3)

    def test_risers_are_real_tagged_feature_rows(self):
        resp = self.client.post("/api/terrace", json=self._default_body())
        riser_id = resp.json()["riserFeatures"][0]["id"]
        conn = gpkg_module.connect(self.store_path)
        kwargs = gpkg_module.get_feature_kwargs(conn, riser_id)
        conn.close()
        self.assertEqual(kwargs["tags"]["building"], "retaining_wall")

    def test_elevation_is_live_updated_after_creation(self):
        resp = self.client.post("/api/terrace", json=self._default_body(
            baseElevationM=500.0, tiers=1, insetM=40.0, blendM=8.0))
        self.assertEqual(resp.status_code, 200)
        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 500.0, delta=1.0)

    def test_invalid_terrace_parameters_return_422_with_a_specific_message(self):
        resp = self.client.post("/api/terrace", json=self._default_body(insetM=1.0))
        self.assertEqual(resp.status_code, 422)
        self.assertIn("DEM cell", resp.json()["detail"])

    def test_invalid_geometry_returns_422(self):
        resp = self.client.post("/api/terrace", json=self._default_body(
            outline={"type": "Polygon", "coordinates": []}))
        self.assertEqual(resp.status_code, 422)

    def test_resubmitting_the_identical_request_is_a_clean_409(self):
        first = self.client.post("/api/terrace", json=self._default_body())
        self.assertEqual(first.status_code, 200)
        second = self.client.post("/api/terrace", json=self._default_body())
        self.assertEqual(second.status_code, 409)

    def test_bumps_world_version_exactly_once(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/terrace", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_reports_tiles_invalidated_as_a_real_count(self):
        resp = self.client.post("/api/terrace", json=self._default_body())
        self.assertIsInstance(resp.json()["tilesInvalidated"], int)


class TestTerraceClearsPreExistingFeatures(TerraceServerTestCase):
    """map-editor plan Phase 12: terracing over ground that already has an
    old feature on it must clear that feature, not leave it showing through
    the new tiers -- the same real bug fixed for reclaim, since a terrace
    lays new "clean" construction over existing ground the same way."""

    def _seed_feature(self, feature_id, geom):
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_feature(conn, id=feature_id, geom=geom, tags={"building": "bunker"},
                                  is_area=True, height_m=4.0, origin="hand", log=False)
        conn.commit()
        conn.close()

    def test_clears_a_fully_contained_old_feature(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Point(cx + 10, cy + 10).buffer(5.0)
        self._seed_feature("old-bunker", old)

        resp = self.client.post("/api/terrace", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["clearedFeatureIds"], ["old-bunker"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNone(row)

    def test_undo_restores_the_terrace_and_the_cleared_feature_in_one_step(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Point(cx + 10, cy + 10).buffer(5.0)
        self._seed_feature("old-bunker", old)

        self.client.post("/api/terrace", json=self._default_body())
        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNotNone(row)

    def test_bump_stays_exactly_once_when_clearing_a_feature_too(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Point(cx + 10, cy + 10).buffer(5.0)
        self._seed_feature("old-bunker", old)

        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/terrace", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)


class TestUndoATerrace(TerraceServerTestCase):
    def test_undo_removes_every_tier_and_riser_as_one_step(self):
        create_resp = self.client.post("/api/terrace", json=self._default_body())
        tier_ids = create_resp.json()["terrainEditIds"]
        riser_ids = [f["id"] for f in create_resp.json()["riserFeatures"]]

        undo_resp = self.client.post("/api/undo")
        body = undo_resp.json()
        self.assertTrue(body["undone"])
        self.assertEqual(set(body["featureIds"]), set(tier_ids) | set(riser_ids))
        self.assertEqual(set(body["deletedFeatureIds"]), set(riser_ids))

        conn = gpkg_module.connect(self.store_path)
        remaining_edits = list(gpkg_module.iter_all_terrain_edits(conn))
        remaining_riser = gpkg_module.get_feature_kwargs(conn, riser_ids[0])
        conn.close()
        self.assertEqual(remaining_edits, [])
        self.assertIsNone(remaining_riser)

    def test_undo_restores_the_elevation_live(self):
        self.client.post("/api/terrace", json=self._default_body(
            baseElevationM=500.0, tiers=1, insetM=40.0, blendM=8.0))
        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 500.0, delta=1.0)

        self.client.post("/api/undo")
        restored = float(self.state.fields.elevation[center, center])
        # The real GSI DEM may genuinely have no coverage at this exact
        # test coordinate (fields.py/terrain.py's own documented NaN
        # handling) -- NaN here is an honest "no edit, no real data
        # either", not a bug, so this must not use assertNotAlmostEqual
        # (whose NaN handling is its own surprise) to assert "no longer
        # the terrace's target elevation".
        no_longer_the_edit = restored != restored or abs(restored - 500.0) > 1.0  # NaN != NaN is True
        self.assertTrue(no_longer_the_edit, f"expected the edit's target elevation to be gone, got {restored}")

    def test_redo_after_undoing_a_terrace_brings_it_all_back(self):
        create_resp = self.client.post("/api/terrace", json=self._default_body(
            baseElevationM=500.0, tiers=1, insetM=40.0, blendM=8.0))
        tier_ids = create_resp.json()["terrainEditIds"]

        self.client.post("/api/undo")  # delete
        redo_resp = self.client.post("/api/undo")  # redo -- recreate
        self.assertTrue(redo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        remaining = {row["id"] for row in gpkg_module.iter_all_terrain_edits(conn)}
        conn.close()
        self.assertEqual(remaining, set(tier_ids))

        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 500.0, delta=1.0)


if __name__ == "__main__":
    unittest.main()
