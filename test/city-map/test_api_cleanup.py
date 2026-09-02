"""HTTP-level tests for POST /api/clear-ground -- map-editor plan Phase 12.

Uses the same fields_module.build_fields fixture shape as test_api_reclaim.py,
but seeds real pre-existing features into the store BEFORE drawing a
clear-ground outline over them -- the whole point of this tool: cleaning up
features a reclaim/terrace/foundation left showing through (or that a
pre-Phase-12 reclaim left behind before this fix existed).
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
from citymap.parse import Feature, RoadGraph  # noqa: E402
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


class ClearGroundServerTestCase(unittest.TestCase):
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

    def _outline_lonlat(self, x_off=0.0, y_off=0.0, half_size_m=50.0):
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

    def _seed_feature(self, feature_id, geom, tags=None, is_area=True):
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_feature(conn, id=feature_id, geom=geom, tags=tags or {"building": "bunker"},
                                  is_area=is_area, height_m=4.0, origin="hand", log=False)
        conn.commit()
        conn.close()


class TestClearGround(ClearGroundServerTestCase):
    def test_clears_a_fully_contained_feature(self):
        cx, cy = FRAME.cx, FRAME.cy
        inside = Polygon([(cx + 5, cy + 5), (cx + 15, cy + 5), (cx + 15, cy + 15), (cx + 5, cy + 15)])
        self._seed_feature("old-bunker", inside)

        resp = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["clearedFeatureIds"], ["old-bunker"])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "old-bunker")
        conn.close()
        self.assertIsNone(row)

    def test_leaves_a_disjoint_feature_alone(self):
        cx, cy = FRAME.cx, FRAME.cy
        far_away = Polygon([(cx + 5000, cy + 5000), (cx + 5010, cy + 5000),
                            (cx + 5010, cy + 5010), (cx + 5000, cy + 5010)])
        self._seed_feature("far-shed", far_away)

        resp = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["clearedFeatureIds"], [])

        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, "far-shed")
        conn.close()
        self.assertIsNotNone(row)

    def test_leaves_a_borderline_clipping_feature_alone(self):
        # A big feature that only barely clips the outline's edge -- almost
        # all of its own area sits OUTSIDE the outline, so it must survive.
        cx, cy = FRAME.cx, FRAME.cy
        clipping = Polygon([(cx + 45, cy - 500), (cx + 545, cy - 500),
                            (cx + 545, cy + 500), (cx + 45, cy + 500)])
        self._seed_feature("long-road-shoulder", clipping)

        resp = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat(half_size_m=50.0)})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["clearedFeatureIds"], [])

    def test_empty_result_is_a_clean_200_not_a_409(self):
        resp1 = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["clearedFeatureIds"], [])
        # Resubmitting the identical outline is a normal no-op, not a conflict
        # -- the sibling tools' 409-on-resubmit guard does not apply here.
        resp2 = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["clearedFeatureIds"], [])

    def test_clears_multiple_features_under_one_batch(self):
        cx, cy = FRAME.cx, FRAME.cy
        inside_a = Polygon([(cx + 5, cy + 5), (cx + 15, cy + 5), (cx + 15, cy + 15), (cx + 5, cy + 15)])
        inside_b = Polygon([(cx - 15, cy - 15), (cx - 5, cy - 15), (cx - 5, cy - 5), (cx - 15, cy - 5)])
        self._seed_feature("bunker-a", inside_a)
        self._seed_feature("bunker-b", inside_b)

        resp = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(set(resp.json()["clearedFeatureIds"]), {"bunker-a", "bunker-b"})

    def test_undo_restores_every_cleared_feature_in_one_step(self):
        cx, cy = FRAME.cx, FRAME.cy
        inside_a = Polygon([(cx + 5, cy + 5), (cx + 15, cy + 5), (cx + 15, cy + 15), (cx + 5, cy + 15)])
        inside_b = Polygon([(cx - 15, cy - 15), (cx - 5, cy - 15), (cx - 5, cy - 5), (cx - 15, cy - 5)])
        self._seed_feature("bunker-a", inside_a)
        self._seed_feature("bunker-b", inside_b)

        self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        row_a = gpkg_module.get_feature_row(conn, "bunker-a")
        row_b = gpkg_module.get_feature_row(conn, "bunker-b")
        conn.close()
        self.assertIsNotNone(row_a)
        self.assertIsNotNone(row_b)

    def test_bumps_world_version_exactly_once_for_the_whole_batch(self):
        cx, cy = FRAME.cx, FRAME.cy
        inside_a = Polygon([(cx + 5, cy + 5), (cx + 15, cy + 5), (cx + 15, cy + 15), (cx + 5, cy + 15)])
        inside_b = Polygon([(cx - 15, cy - 15), (cx - 5, cy - 15), (cx - 5, cy - 5), (cx - 15, cy - 5)])
        self._seed_feature("bunker-a", inside_a)
        self._seed_feature("bunker-b", inside_b)

        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()

        self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})

        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_no_bump_when_nothing_is_cleared(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()

        self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})

        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0)

    def test_clears_a_line_feature_by_length_fraction(self):
        # A road entirely inside the outline -- must be cleared via the
        # LENGTH-fraction path, not the area path (a line has zero area).
        cx, cy = FRAME.cx, FRAME.cy
        line = LineString([(cx + 5, cy), (cx + 15, cy)])
        self._seed_feature("old-track", line, tags={"highway": "track"}, is_area=False)

        resp = self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertEqual(resp.json()["clearedFeatureIds"], ["old-track"])

    def test_updates_live_fields_removing_the_cleared_feature(self):
        cx, cy = FRAME.cx, FRAME.cy
        inside = Polygon([(cx + 5, cy + 5), (cx + 15, cy + 5), (cx + 15, cy + 15), (cx + 5, cy + 15)])
        self._seed_feature("old-bunker", inside)
        mapped = fields_module.rotate_and_clip(
            [Feature(id="old-bunker", geom=inside, tags={"building": "bunker"}, area=True)], FRAME)
        self.state.fields.replace_feature("old-bunker", mapped[0] if mapped else None)
        self.assertTrue(any(f.id == "old-bunker" for f in self.state.fields.features))

        self.client.post("/api/clear-ground", json={"outline": self._outline_lonlat()})
        self.assertFalse(any(f.id == "old-bunker" for f in self.state.fields.features))


if __name__ == "__main__":
    unittest.main()
