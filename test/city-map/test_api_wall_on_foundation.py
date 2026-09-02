"""HTTP-level tests for POST /api/wall-on-foundation -- map-editor plan
Phase 8. Mirrors test_api_terrace.py's own fixture shape closely (same real,
if small, Fields build; see that file's own docstring for why -- these
tests need Fields.resync_terrain_from_store to actually work end-to-end).
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

# Same frame as test_api_terrace.py: rotation_deg=0 keeps outline authoring
# simple, small dem_grid keeps the real DEM fetch/hillshade recompute each
# test triggers fast. cell_m = 800/64 = 12.5m, so insetM must stay >= 25.0.
FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=800.0, crs_epsg=6674, dem_grid=64)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))


class WallOnFoundationServerTestCase(unittest.TestCase):
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
            "insetM": 40.0,   # comfortably above this test frame's 2-DEM-cell floor
                              # (25.0m at extent_m=800/dem_grid=64) -- see test_api_terrace.py
            "blendM": 8.0,
            "mode": "fill",
            "wallThicknessM": 6.0,  # well under the top tier's own ~20m half-size
                                    # after 2 insets of 40m each (100 - 2*40 = 20)
            "wallHeightM": 5.0,
        }
        body.update(overrides)
        return body


class TestCreateWallOnFoundation(WallOnFoundationServerTestCase):
    def test_creates_real_tiers_risers_and_wall_segments(self):
        resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["terrainEditIds"]), 3)
        self.assertEqual(len(body["riserFeatures"]), 2)
        self.assertEqual(len(body["wallFeatures"]), 4)  # square outline -> 4 wall segments
        self.assertFalse(body["repaired"])

    def test_wall_segments_are_real_tagged_feature_rows(self):
        resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        wall_id = resp.json()["wallFeatures"][0]["id"]
        conn = gpkg_module.connect(self.store_path)
        kwargs = gpkg_module.get_feature_kwargs(conn, wall_id)
        conn.close()
        self.assertEqual(kwargs["tags"]["building"], "wall")

    def test_wall_segments_are_live_visible_after_creation(self):
        resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        wall_id = resp.json()["wallFeatures"][0]["id"]
        self.assertTrue(any(f.id == wall_id for f in self.state.fields.features))

    def test_invalid_terrace_parameters_return_422_with_a_specific_message(self):
        resp = self.client.post("/api/wall-on-foundation", json=self._default_body(insetM=1.0))
        self.assertEqual(resp.status_code, 422)
        self.assertIn("DEM cell", resp.json()["detail"])

    def test_wall_too_thick_for_the_top_tier_returns_422_with_a_specific_message(self):
        resp = self.client.post("/api/wall-on-foundation", json=self._default_body(wallThicknessM=500.0))
        self.assertEqual(resp.status_code, 422)
        self.assertIn("no room", resp.json()["detail"])

    def test_resubmitting_the_identical_request_is_a_clean_409(self):
        first = self.client.post("/api/wall-on-foundation", json=self._default_body())
        self.assertEqual(first.status_code, 200)
        second = self.client.post("/api/wall-on-foundation", json=self._default_body())
        self.assertEqual(second.status_code, 409)

    def test_bumps_world_version_exactly_once(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/wall-on-foundation", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_reports_tiles_invalidated_as_a_real_count(self):
        resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        self.assertIsInstance(resp.json()["tilesInvalidated"], int)


class TestWallOnFoundationClearsPreExistingFeatures(WallOnFoundationServerTestCase):
    """map-editor plan Phase 12: same real fix as terrace's own -- a
    foundation-plus-wall lays new "clean" construction over existing
    ground exactly the same way a plain terrace does."""

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

        resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["clearedFeatureIds"], ["old-bunker"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNone(row)

    def test_undo_restores_the_foundation_and_the_cleared_feature_in_one_step(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Point(cx + 10, cy + 10).buffer(5.0)
        self._seed_feature("old-bunker", old)

        self.client.post("/api/wall-on-foundation", json=self._default_body())
        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNotNone(row)


class TestUndoAWallOnFoundation(WallOnFoundationServerTestCase):
    def test_undo_removes_every_tier_riser_and_wall_segment_as_one_step(self):
        create_resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        tier_ids = create_resp.json()["terrainEditIds"]
        riser_ids = [f["id"] for f in create_resp.json()["riserFeatures"]]
        wall_ids = [f["id"] for f in create_resp.json()["wallFeatures"]]

        undo_resp = self.client.post("/api/undo")
        body = undo_resp.json()
        self.assertTrue(body["undone"])
        self.assertEqual(set(body["featureIds"]), set(tier_ids) | set(riser_ids) | set(wall_ids))
        self.assertEqual(set(body["deletedFeatureIds"]), set(riser_ids) | set(wall_ids))

        conn = gpkg_module.connect(self.store_path)
        remaining_edits = list(gpkg_module.iter_all_terrain_edits(conn))
        remaining_wall = gpkg_module.get_feature_kwargs(conn, wall_ids[0])
        conn.close()
        self.assertEqual(remaining_edits, [])
        self.assertIsNone(remaining_wall)

    def test_undo_removes_the_wall_from_the_live_fields_too(self):
        create_resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        wall_id = create_resp.json()["wallFeatures"][0]["id"]
        self.assertTrue(any(f.id == wall_id for f in self.state.fields.features))

        self.client.post("/api/undo")
        self.assertFalse(any(f.id == wall_id for f in self.state.fields.features))

    def test_redo_after_undoing_brings_the_wall_back(self):
        create_resp = self.client.post("/api/wall-on-foundation", json=self._default_body())
        wall_ids = [f["id"] for f in create_resp.json()["wallFeatures"]]

        self.client.post("/api/undo")  # delete
        redo_resp = self.client.post("/api/undo")  # redo -- recreate
        self.assertTrue(redo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        remaining = {row["id"] for row in gpkg_module.iter_all_features(conn)}
        conn.close()
        self.assertTrue(set(wall_ids).issubset(remaining))


if __name__ == "__main__":
    unittest.main()
