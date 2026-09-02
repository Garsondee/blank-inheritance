"""HTTP-level tests for POST /api/return-to-sea -- map-editor plan Phase 10,
mirroring test_api_reclaim.py's own conventions closely (its closest
sibling -- this is reclaim's explicit inverse).

Unlike test_api_reclaim.py's fixture (a sea covering the WHOLE test frame,
since every drawn outline needs to overlap EXISTING sea to reclaim), this
fixture seeds only a SMALL sea patch tucked into one corner -- a
return-to-sea outline needs to overlap DRY LAND, and the rest of the frame
(including its own center, where every default outline is drawn) is dry
land by default, matching the real "flood a chosen patch of land" use case.
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


class ReturnToSeaServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        cx, cy = FRAME.cx, FRAME.cy
        scx, scy = cx - 300, cy - 300
        self.sea_corner_offset = (scx - cx, scy - cy)
        self.sea_geom = Polygon([(scx - 50, scy - 50), (scx + 50, scy - 50),
                                 (scx + 50, scy + 50), (scx - 50, scy + 50)])
        sea = SeaResult(sea_geom=self.sea_geom, face_count=-1, sea_face_count=-1,
                        land_content_count=-1, carved_feature_count=0,
                        area_before_carve_km2=self.sea_geom.area / 1e6,
                        area_after_carve_km2=self.sea_geom.area / 1e6)
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
        body = {"outline": self._outline_lonlat(), "blendM": 8.0}
        body.update(overrides)
        return body


class TestCreateReturnToSea(ReturnToSeaServerTestCase):
    def test_creates_a_terrain_edit(self):
        resp = self.client.post("/api/return-to-sea", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIsNotNone(body["terrainEditId"])
        self.assertIsNotNone(body["groupId"])

    def test_grows_the_stores_sea_geometry(self):
        conn = gpkg_module.connect(self.store_path)
        sea_before = gpkg_module.get_world_geom(conn, "sea")
        conn.close()

        self.client.post("/api/return-to-sea", json=self._default_body())

        conn = gpkg_module.connect(self.store_path)
        sea_after = gpkg_module.get_world_geom(conn, "sea")
        conn.close()
        self.assertGreater(sea_after.area, sea_before.area)

    def test_updates_the_live_sea_feature(self):
        before = [f for f in self.state.fields.features if f.tags.get("__sea__")]
        self.assertEqual(len(before), 1)
        before_area = before[0].geom.area

        self.client.post("/api/return-to-sea", json=self._default_body())

        after = [f for f in self.state.fields.features if f.tags.get("__sea__")]
        self.assertEqual(len(after), 1)
        self.assertGreater(after[0].geom.area, before_area)

    def test_stores_a_sea_level_terrain_edit(self):
        resp = self.client.post("/api/return-to-sea", json=self._default_body())
        edit_id = resp.json()["terrainEditId"]
        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_terrain_edit_row(conn, edit_id)
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row["target_elevation_m"], 0.0)

    def test_actually_flattens_previously_raised_elevation(self):
        """The point of the whole tool, checked directly: this doesn't just
        insert an inert row -- an area previously raised (say, by an
        earlier terrace/reclaim) really does come back down to sea level
        once returned to the sea, because a later stack_order/fid always
        wins inside its own footprint (fields.apply_terrain_edits' own
        accumulate-in-list-order contract)."""
        outline_source = Polygon([(FRAME.cx - 30, FRAME.cy - 30), (FRAME.cx + 30, FRAME.cy - 30),
                                  (FRAME.cx + 30, FRAME.cy + 30), (FRAME.cx - 30, FRAME.cy + 30)])
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_terrain_edit(conn, id="pre-existing-raised-pad", geom=outline_source,
                                        target_elevation_m=999.0, blend_m=8.0, stack_order=0, log=False)
        conn.commit()
        conn.close()
        self.state.fields.resync_terrain_from_store(self.store_path, self.dem_cache, STYLE)

        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 999.0, delta=1.0)

        resp = self.client.post("/api/return-to-sea", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        self.assertAlmostEqual(float(self.state.fields.elevation[center, center]), 0.0, delta=1.0)

    def test_does_not_delete_features_under_the_outline(self):
        """A real, explicit scope decision (return_to_sea.py's own
        docstring): flooding land and deleting whatever sits on it are two
        separate, composable actions, not one tool silently doing both."""
        building = Feature(id="building-in-the-way", geom=Polygon(
            [(FRAME.cx - 5, FRAME.cy - 5), (FRAME.cx + 5, FRAME.cy - 5),
             (FRAME.cx + 5, FRAME.cy + 5), (FRAME.cx - 5, FRAME.cy + 5)]),
            tags={"building": "yes"}, area=True, height_m=3.0, source="hand")
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_feature(conn, id=building.id, geom=building.geom, tags=building.tags,
                                   is_area=building.area, height_m=building.height_m,
                                   origin="hand", log=False)
        conn.commit()
        conn.close()
        self.state.fields.replace_feature(building.id, building)

        resp = self.client.post("/api/return-to-sea", json=self._default_body())
        self.assertEqual(resp.status_code, 200)

        self.assertTrue(any(f.id == building.id for f in self.state.fields.features))

    def test_outline_already_entirely_sea_returns_422(self):
        ox, oy = self.sea_corner_offset
        inside_existing_sea = self._outline_lonlat(x_off=ox, y_off=oy, half_size_m=20.0)
        resp = self.client.post("/api/return-to-sea", json=self._default_body(outline=inside_existing_sea))
        self.assertEqual(resp.status_code, 422)

    def test_resubmitting_the_identical_request_is_a_clean_422(self):
        """Unlike reclaim's resubmission (which lands on 409 -- carving the
        SAME outline out of the sea via difference() leaves the new sea
        geometry sharing a boundary with the outline, so `.intersects()`
        stays true and the request reaches the DB's uniqueness constraint),
        return-to-sea's flood via union() leaves the outline fully CONTAINED
        in the new sea -- caught by the "already entirely open sea" 422
        check before ever reaching the database. More honest than a 409,
        not a bug -- matches the array/causeway resubmission precedent of
        fixing the test's expectation, not the code, when a tool's own
        semantic check correctly catches "this no longer makes sense" earlier
        than the DB layer would have."""
        first = self.client.post("/api/return-to-sea", json=self._default_body())
        self.assertEqual(first.status_code, 200)
        second = self.client.post("/api/return-to-sea", json=self._default_body())
        self.assertEqual(second.status_code, 422)

    def test_bumps_world_version_exactly_once(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/return-to-sea", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)


class TestUndoAReturnToSea(ReturnToSeaServerTestCase):
    def test_undo_restores_the_sea_and_the_terrain_edit(self):
        conn = gpkg_module.connect(self.store_path)
        sea_before = gpkg_module.get_world_geom(conn, "sea")
        conn.close()

        create_resp = self.client.post("/api/return-to-sea", json=self._default_body())
        edit_id = create_resp.json()["terrainEditId"]

        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        sea_after_undo = gpkg_module.get_world_geom(conn, "sea")
        edit_row = gpkg_module.get_terrain_edit_row(conn, edit_id)
        conn.close()
        self.assertAlmostEqual(sea_after_undo.area, sea_before.area, delta=1.0)
        self.assertIsNone(edit_row)

    def test_undo_restores_the_live_sea_feature_too(self):
        before = [f for f in self.state.fields.features if f.tags.get("__sea__")][0]
        before_area = before.geom.area

        self.client.post("/api/return-to-sea", json=self._default_body())
        self.client.post("/api/undo")

        after = [f for f in self.state.fields.features if f.tags.get("__sea__")][0]
        self.assertAlmostEqual(after.geom.area, before_area, delta=1.0)

    def test_redo_after_undoing_brings_it_all_back(self):
        create_resp = self.client.post("/api/return-to-sea", json=self._default_body())
        edit_id = create_resp.json()["terrainEditId"]

        self.client.post("/api/undo")  # delete
        redo_resp = self.client.post("/api/undo")  # redo -- recreate
        self.assertTrue(redo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        remaining = gpkg_module.get_terrain_edit_row(conn, edit_id)
        conn.close()
        self.assertIsNotNone(remaining)


if __name__ == "__main__":
    unittest.main()
