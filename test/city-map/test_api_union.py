"""HTTP-level tests for POST /api/union -- map-editor plan Phase 14.

Same simple fixture shape as test_api_cleanup.py (no terrain component, no
real DEM needed) -- Union only ever touches the feature table.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Polygon  # noqa: E402

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


class UnionServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        sea = SeaResult(sea_geom=None, face_count=-1, sea_face_count=-1,
                        land_content_count=-1, carved_feature_count=0,
                        area_before_carve_km2=0.0, area_after_carve_km2=0.0)
        world = World(features=[], road_graph=RoadGraph(), lamps=[], sea=sea, crs_epsg=6674)
        fields = fields_module.build_fields(world, FRAME, self.dem_cache, STYLE)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path,
                              self.dem_cache, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _seed_feature(self, feature_id, geom, tags=None, height_m=0.0, is_area=True):
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_feature(conn, id=feature_id, geom=geom, tags=tags or {"building": "yes"},
                                  is_area=is_area, height_m=height_m, origin="hand", log=False)
        conn.commit()
        conn.close()


class TestCreateUnion(UnionServerTestCase):
    def test_merges_two_overlapping_features_originals_gone_one_survivor(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 20, cy), (cx + 20, cy + 20), (cx, cy + 20)])
        b = Polygon([(cx + 10, cy + 10), (cx + 30, cy + 10), (cx + 30, cy + 30), (cx + 10, cy + 30)])
        self._seed_feature("bldg-a", a)
        self._seed_feature("bldg-b", b)

        resp = self.client.post("/api/union", json={"featureIds": ["bldg-a", "bldg-b"]})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(set(body["removedFeatureIds"]), {"bldg-a", "bldg-b"})
        self.assertFalse(body["becameMulti"])

        conn = gpkg_module.connect(self.store_path)
        row_a = gpkg_module.get_feature_row(conn, "bldg-a")
        row_b = gpkg_module.get_feature_row(conn, "bldg-b")
        merged_row = gpkg_module.get_feature_row(conn, body["mergedFeature"]["id"])
        conn.close()
        self.assertIsNone(row_a)
        self.assertIsNone(row_b)
        self.assertIsNotNone(merged_row)

    def test_disjoint_inputs_report_becameMulti_true(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 10, cy), (cx + 10, cy + 10), (cx, cy + 10)])
        b = Polygon([(cx + 500, cy + 500), (cx + 510, cy + 500), (cx + 510, cy + 510), (cx + 500, cy + 510)])
        self._seed_feature("far-a", a)
        self._seed_feature("far-b", b)

        resp = self.client.post("/api/union", json={"featureIds": ["far-a", "far-b"]})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["becameMulti"])

    def test_largest_input_wins_tags_and_height(self):
        cx, cy = FRAME.cx, FRAME.cy
        small = Polygon([(cx, cy), (cx + 5, cy), (cx + 5, cy + 5), (cx, cy + 5)])
        big = Polygon([(cx + 2, cy + 2), (cx + 50, cy + 2), (cx + 50, cy + 50), (cx + 2, cy + 50)])
        self._seed_feature("small-shed", small, tags={"building": "shed"}, height_m=3.0)
        self._seed_feature("big-tower", big, tags={"building": "tower"}, height_m=45.0)

        resp = self.client.post("/api/union", json={"featureIds": ["small-shed", "big-tower"]})
        merged = resp.json()["mergedFeature"]
        self.assertEqual(merged["properties"]["tags"], {"building": "tower"})
        self.assertEqual(merged["properties"]["heightM"], 45.0)

    def test_missing_id_is_a_404_with_no_partial_write(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 10, cy), (cx + 10, cy + 10), (cx, cy + 10)])
        self._seed_feature("real-feature", a)

        resp = self.client.post("/api/union", json={"featureIds": ["real-feature", "does-not-exist"]})
        self.assertEqual(resp.status_code, 404)

        # The real feature must survive untouched -- no partial delete.
        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "real-feature")
        conn.close()
        self.assertIsNotNone(row)

    def test_mixing_a_building_and_a_road_is_a_422_not_a_geometrycollection(self):
        """REGRESSION: found live during map-editor plan Phase 14's own
        marquee-select verification -- a real drag that swept up both
        buildings AND roads produced a shapely GeometryCollection, a real
        feature kind this stack has no rendering/editing story for at all.
        Must be refused loudly (422), never silently created."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Polygon([(cx, cy), (cx + 10, cy), (cx + 10, cy + 10), (cx, cy + 10)])
        road = LineString([(cx + 100, cy + 100), (cx + 200, cy + 200)])
        self._seed_feature("bldg-a", building)
        self._seed_feature("road-a", road, tags={"highway": "residential"}, is_area=False)

        resp = self.client.post("/api/union", json={"featureIds": ["bldg-a", "road-a"]})
        self.assertEqual(resp.status_code, 422)

        # No partial write -- both originals must survive untouched.
        conn = gpkg_module.connect(self.store_path)
        row_bldg = gpkg_module.get_feature_row(conn, "bldg-a")
        row_road = gpkg_module.get_feature_row(conn, "road-a")
        conn.close()
        self.assertIsNotNone(row_bldg)
        self.assertIsNotNone(row_road)

    def test_fewer_than_two_ids_is_a_422(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 10, cy), (cx + 10, cy + 10), (cx, cy + 10)])
        self._seed_feature("solo", a)
        resp = self.client.post("/api/union", json={"featureIds": ["solo"]})
        self.assertEqual(resp.status_code, 422)

    def test_bumps_world_version_exactly_once(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 20, cy), (cx + 20, cy + 20), (cx, cy + 20)])
        b = Polygon([(cx + 10, cy + 10), (cx + 30, cy + 10), (cx + 30, cy + 30), (cx + 10, cy + 30)])
        self._seed_feature("bldg-a", a)
        self._seed_feature("bldg-b", b)

        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/union", json={"featureIds": ["bldg-a", "bldg-b"]})
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_updates_live_fields_removing_originals_and_adding_the_merge(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 20, cy), (cx + 20, cy + 20), (cx, cy + 20)])
        b = Polygon([(cx + 10, cy + 10), (cx + 30, cy + 10), (cx + 30, cy + 30), (cx + 10, cy + 30)])
        self._seed_feature("bldg-a", a)
        self._seed_feature("bldg-b", b)

        from citymap.parse import Feature
        for fid, geom in [("bldg-a", a), ("bldg-b", b)]:
            mapped = fields_module.rotate_and_clip(
                [Feature(id=fid, geom=geom, tags={"building": "yes"}, area=True)], FRAME)
            self.state.fields.replace_feature(fid, mapped[0] if mapped else None)

        resp = self.client.post("/api/union", json={"featureIds": ["bldg-a", "bldg-b"]})
        merged_id = resp.json()["mergedFeature"]["id"]

        live_ids = [f.id for f in self.state.fields.features]
        self.assertNotIn("bldg-a", live_ids)
        self.assertNotIn("bldg-b", live_ids)
        self.assertIn(merged_id, live_ids)


class TestUndoAUnion(UnionServerTestCase):
    def test_undo_restores_both_originals_and_removes_the_merge(self):
        cx, cy = FRAME.cx, FRAME.cy
        a = Polygon([(cx, cy), (cx + 20, cy), (cx + 20, cy + 20), (cx, cy + 20)])
        b = Polygon([(cx + 10, cy + 10), (cx + 30, cy + 10), (cx + 30, cy + 30), (cx + 10, cy + 30)])
        self._seed_feature("bldg-a", a)
        self._seed_feature("bldg-b", b)

        create_resp = self.client.post("/api/union", json={"featureIds": ["bldg-a", "bldg-b"]})
        merged_id = create_resp.json()["mergedFeature"]["id"]

        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        row_a = gpkg_module.get_feature_row(conn, "bldg-a")
        row_b = gpkg_module.get_feature_row(conn, "bldg-b")
        merged_row = gpkg_module.get_feature_row(conn, merged_id)
        conn.close()
        self.assertIsNotNone(row_a)
        self.assertIsNotNone(row_b)
        self.assertIsNone(merged_row)


if __name__ == "__main__":
    unittest.main()
