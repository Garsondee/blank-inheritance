"""HTTP-level tests for POST /api/reclaim -- map-editor plan Phase 10.

Uses a real fields_module.build_fields fixture (same shape as
test_api_terrace.py) but, unlike every prior phase's test fixture, seeds a
REAL sea polygon into World.sea -- every earlier phase's fixture used
SeaResult(None, ...) since nothing before Phase 10 needed a real sea to
test against.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import Polygon  # noqa: E402

from citymap import fields as fields_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.store import gpkg as gpkg_module  # noqa: E402
from citymap.style import Style  # noqa: E402
from citymap.world import World  # noqa: E402

from api.main import app, configure  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=800.0, crs_epsg=6674, dem_grid=64)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))


class ReclaimServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        cx, cy = FRAME.cx, FRAME.cy
        # Sea covers the whole test frame -- any outline drawn inside it
        # overlaps real sea, matching every real Kurose-frame reclaim.
        self.sea_geom = Polygon([(cx - 500, cy - 500), (cx + 500, cy - 500),
                                 (cx + 500, cy + 500), (cx - 500, cy + 500)])
        sea = SeaResult(sea_geom=self.sea_geom, face_count=-1, sea_face_count=-1,
                        land_content_count=-1, carved_feature_count=0,
                        area_before_carve_km2=0.0, area_after_carve_km2=self.sea_geom.area / 1e6)
        world = World(features=[], road_graph=RoadGraph(), lamps=[], sea=sea, crs_epsg=6674)
        fields = fields_module.build_fields(world, FRAME, self.dem_cache, STYLE)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path,
                              self.dem_cache, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

        # Seed the store's own world_geom['sea'] to match World.sea -- the
        # real editor's own bootstrap (import_osm.py) always does this;
        # build_fields alone (used above for the in-memory Fields) does not
        # touch the store at all.
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.set_world_geom(conn, "sea", self.sea_geom, log=False)
        conn.commit()
        conn.close()

    def _outline_lonlat(self, x_off=0.0, y_off=0.0, half_size_m=30.0):
        cx, cy = FRAME.cx, FRAME.cy
        corners_source = [
            (cx + x_off - half_size_m, cy + y_off - half_size_m),
            (cx + x_off + half_size_m, cy + y_off - half_size_m),
            (cx + x_off + half_size_m, cy + y_off + half_size_m),
            (cx + x_off - half_size_m, cy + y_off + half_size_m),
            (cx + x_off - half_size_m, cy + y_off - half_size_m),
        ]
        coords = [list(FRAME.inv.transform(x, y)) for x, y in corners_source]
        return {"type": "Polygon", "coordinates": [coords]}

    def _default_body(self, **overrides):
        body = {"outline": self._outline_lonlat(), "freeboardM": 4.0, "blendM": 8.0}
        body.update(overrides)
        return body


class TestCreateReclaim(ReclaimServerTestCase):
    def test_creates_a_terrain_edit_and_a_landuse_feature(self):
        resp = self.client.post("/api/reclaim", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIsNotNone(body["terrainEditId"])
        self.assertIsNotNone(body["landFeature"])
        self.assertEqual(body["landFeature"]["properties"]["tags"]["landuse"], "construction")

    def test_shrinks_the_stores_sea_geometry(self):
        conn = gpkg_module.connect(self.store_path)
        sea_before = gpkg_module.get_world_geom(conn, "sea")
        conn.close()

        self.client.post("/api/reclaim", json=self._default_body())

        conn = gpkg_module.connect(self.store_path)
        sea_after = gpkg_module.get_world_geom(conn, "sea")
        conn.close()
        self.assertLess(sea_after.area, sea_before.area)

    def test_updates_the_live_sea_feature(self):
        before = [f for f in self.state.fields.features if f.tags.get("__sea__")]
        self.assertEqual(len(before), 1)
        before_area = before[0].geom.area

        self.client.post("/api/reclaim", json=self._default_body())

        after = [f for f in self.state.fields.features if f.tags.get("__sea__")]
        self.assertEqual(len(after), 1)
        self.assertLess(after[0].geom.area, before_area)

    def test_land_feature_is_live_visible_after_creation(self):
        resp = self.client.post("/api/reclaim", json=self._default_body())
        land_id = resp.json()["landFeature"]["id"]
        self.assertTrue(any(f.id == land_id for f in self.state.fields.features))

    def test_elevation_is_live_updated_after_creation(self):
        resp = self.client.post("/api/reclaim", json=self._default_body(freeboardM=5.0))
        self.assertEqual(resp.status_code, 200)
        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 5.0, delta=1.0)

    def test_outline_not_overlapping_the_sea_returns_422(self):
        far_outline = self._outline_lonlat(x_off=100000.0, y_off=100000.0)
        resp = self.client.post("/api/reclaim", json=self._default_body(outline=far_outline))
        self.assertEqual(resp.status_code, 422)

    def test_resubmitting_the_identical_request_is_a_clean_409(self):
        first = self.client.post("/api/reclaim", json=self._default_body())
        self.assertEqual(first.status_code, 200)
        second = self.client.post("/api/reclaim", json=self._default_body())
        self.assertEqual(second.status_code, 409)

    def test_bumps_world_version_exactly_once(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/reclaim", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)


class TestReclaimClearsPreExistingFeatures(ReclaimServerTestCase):
    """map-editor plan Phase 12: the real fix for "reclaiming the sea where
    old land used to be leaves ugly green/brown stuff showing through" --
    confirmed directly against the live campaign store to be old, never-
    deleted features (a military fort's bunkers etc.) still rendering under
    a new reclaim, not a rendering-order bug. A reclaim now clears whatever
    it substantially covers, in the same undoable batch as the new land."""

    def _seed_feature(self, feature_id, geom, tags=None):
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_feature(conn, id=feature_id, geom=geom, tags=tags or {"building": "bunker"},
                                  is_area=True, height_m=4.0, origin="hand", log=False)
        conn.commit()
        conn.close()

    def test_clears_a_fully_contained_old_feature(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Polygon([(cx + 10, cy + 10), (cx + 20, cy + 10), (cx + 20, cy + 20), (cx + 10, cy + 20)])
        self._seed_feature("old-bunker", old)

        resp = self.client.post("/api/reclaim", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["clearedFeatureIds"], ["old-bunker"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNone(row)

    def test_leaves_a_feature_outside_the_outline_alone(self):
        cx, cy = FRAME.cx, FRAME.cy
        far_away = Polygon([(cx + 400, cy + 400), (cx + 410, cy + 400),
                            (cx + 410, cy + 410), (cx + 400, cy + 410)])
        self._seed_feature("distant-shed", far_away)

        self.client.post("/api/reclaim", json=self._default_body())

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "distant-shed")
        conn.close()
        self.assertIsNotNone(row)

    def test_undo_restores_the_reclaim_and_the_cleared_feature_in_one_step(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Polygon([(cx + 10, cy + 10), (cx + 20, cy + 10), (cx + 20, cy + 20), (cx + 10, cy + 20)])
        self._seed_feature("old-bunker", old)

        self.client.post("/api/reclaim", json=self._default_body())
        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNotNone(row)

    def test_bump_stays_exactly_once_when_clearing_a_feature_too(self):
        cx, cy = FRAME.cx, FRAME.cy
        old = Polygon([(cx + 10, cy + 10), (cx + 20, cy + 10), (cx + 20, cy + 20), (cx + 10, cy + 20)])
        self._seed_feature("old-bunker", old)

        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/reclaim", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)


class TestUndoAReclaim(ReclaimServerTestCase):
    def test_undo_restores_the_sea_and_removes_the_land(self):
        conn = gpkg_module.connect(self.store_path)
        sea_before = gpkg_module.get_world_geom(conn, "sea")
        conn.close()

        create_resp = self.client.post("/api/reclaim", json=self._default_body())
        land_id = create_resp.json()["landFeature"]["id"]
        edit_id = create_resp.json()["terrainEditId"]

        undo_resp = self.client.post("/api/undo")
        body = undo_resp.json()
        self.assertTrue(body["undone"])

        conn = gpkg_module.connect(self.store_path)
        sea_after_undo = gpkg_module.get_world_geom(conn, "sea")
        land_row = gpkg_module.get_feature_row(conn, land_id)
        edit_row = gpkg_module.get_terrain_edit_row(conn, edit_id)
        conn.close()
        self.assertAlmostEqual(sea_after_undo.area, sea_before.area, delta=1.0)
        self.assertIsNone(land_row)
        self.assertIsNone(edit_row)

    def test_undo_restores_the_live_sea_feature_too(self):
        before = [f for f in self.state.fields.features if f.tags.get("__sea__")][0]
        before_area = before.geom.area

        self.client.post("/api/reclaim", json=self._default_body())
        self.client.post("/api/undo")

        after = [f for f in self.state.fields.features if f.tags.get("__sea__")][0]
        self.assertAlmostEqual(after.geom.area, before_area, delta=1.0)

    def test_undo_removes_the_land_feature_from_live_fields(self):
        create_resp = self.client.post("/api/reclaim", json=self._default_body())
        land_id = create_resp.json()["landFeature"]["id"]
        self.assertTrue(any(f.id == land_id for f in self.state.fields.features))

        self.client.post("/api/undo")
        self.assertFalse(any(f.id == land_id for f in self.state.fields.features))

    def test_redo_after_undoing_a_reclaim_brings_it_all_back(self):
        create_resp = self.client.post("/api/reclaim", json=self._default_body(freeboardM=5.0))
        land_id = create_resp.json()["landFeature"]["id"]

        self.client.post("/api/undo")  # delete
        redo_resp = self.client.post("/api/undo")  # redo -- recreate
        self.assertTrue(redo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        remaining = gpkg_module.get_feature_row(conn, land_id)
        conn.close()
        self.assertIsNotNone(remaining)

        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 5.0, delta=1.0)


if __name__ == "__main__":
    unittest.main()
