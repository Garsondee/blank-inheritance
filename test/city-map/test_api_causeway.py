"""HTTP-level tests for POST /api/causeway -- map-editor plan Phase 10.

Every test here pays real production-scale A* routing cost (api/causeway.py
calls citymap.tools.causeway.route_causeway with no test-scale override,
unlike test_causeway.py's own FAST_ROUTING) -- kept to a small number of
cases for exactly that reason, matching test_api_array_place.py's own
TestArrayWithRealRouting precedent. Elevation is flattened after setUp,
same reasoning as that class's own docstring: the real GSI DEM's NaN
coverage at a small test frame is a real but irrelevant-here data gap this
suite doesn't need to re-prove.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
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


class CausewayServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        cx, cy = FRAME.cx, FRAME.cy
        # Sea covers everything except a small island (frame centre) and a
        # strip of real road far to the east -- the island can only reach
        # that road by crossing open water.
        island = Polygon([(cx - 10, cy - 10), (cx + 10, cy - 10), (cx + 10, cy + 10), (cx - 10, cy + 10)])
        big_square = Polygon([(cx - 300, cy - 300), (cx + 300, cy - 300),
                              (cx + 300, cy + 300), (cx - 300, cy + 300)])
        self.sea_geom = big_square.difference(island)
        seed_road = Feature(id="seed-road", geom=LineString([(cx + 280, cy - 300), (cx + 280, cy + 300)]),
                            tags={"highway": "residential"}, area=False, height_m=0.0, source="test")
        sea = SeaResult(sea_geom=self.sea_geom, face_count=-1, sea_face_count=-1,
                        land_content_count=-1, carved_feature_count=0,
                        area_before_carve_km2=0.0, area_after_carve_km2=self.sea_geom.area / 1e6)
        world = World(features=[seed_road], road_graph=RoadGraph(), lamps=[], sea=sea, crs_epsg=6674)
        fields = fields_module.build_fields(world, FRAME, self.dem_cache, STYLE)
        fields.elevation = np.full_like(fields.elevation, 10.0)  # see module docstring

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path,
                              self.dem_cache, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _point_lonlat(self, x_off=0.0, y_off=0.0):
        cx, cy = FRAME.cx, FRAME.cy
        lon, lat = FRAME.inv.transform(cx + x_off, cy + y_off)
        return {"type": "Point", "coordinates": [lon, lat]}


class TestCreateCauseway(CausewayServerTestCase):
    def test_routes_from_the_island_across_water_and_tags_bridge_yes(self):
        resp = self.client.post("/api/causeway", json={"startPoint": self._point_lonlat()})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["crossesWater"])
        self.assertEqual(body["feature"]["properties"]["tags"]["bridge"], "yes")
        self.assertGreater(body["lengthM"], 0.0)

    def test_the_routed_feature_is_live_visible(self):
        resp = self.client.post("/api/causeway", json={"startPoint": self._point_lonlat()})
        feature_id = resp.json()["feature"]["id"]
        self.assertTrue(any(f.id == feature_id for f in self.state.fields.features))

    def test_no_road_in_range_returns_422(self):
        empty_state_client = self.client
        # Remove the seed road from the live Fields by pointing at a store
        # with none -- simplest real way to get "no road" without a second
        # fixture class: strip highway-tagged features from live Fields.
        self.state.fields.features = [f for f in self.state.fields.features if not f.tags.get("highway")]
        resp = empty_state_client.post("/api/causeway", json={"startPoint": self._point_lonlat()})
        self.assertEqual(resp.status_code, 422)

    def test_resubmitting_the_identical_request_fails_at_routing_not_id_collision(self):
        """Same class of finding as Phase 9's array resubmission behaviour,
        confirmed directly rather than assumed: the first causeway is, by
        the time a second identical request lands, itself a real
        highway=service feature in Fields.features -- so route_causeway's
        own start-point check ("start already touches the road network",
        router.py's own honest rejection) fires before the id-collision
        sqlite3.IntegrityError/409 path is ever reached. That 409 path is
        still real, shared code (same handler as every other tool); just
        not reachable via THIS scenario for a routed-to-itself causeway."""
        first = self.client.post("/api/causeway", json={"startPoint": self._point_lonlat()})
        self.assertEqual(first.status_code, 200)
        second = self.client.post("/api/causeway", json={"startPoint": self._point_lonlat()})
        self.assertEqual(second.status_code, 422)
        self.assertIn("already touches the road network", second.json()["detail"])


class TestUndoACauseway(CausewayServerTestCase):
    def test_undo_removes_the_causeway(self):
        create_resp = self.client.post("/api/causeway", json={"startPoint": self._point_lonlat()})
        feature_id = create_resp.json()["feature"]["id"]

        undo_resp = self.client.post("/api/undo")
        self.assertTrue(undo_resp.json()["undone"])
        conn = gpkg_module.connect(self.store_path)
        row = gpkg_module.get_feature_row(conn, feature_id)
        conn.close()
        self.assertIsNone(row)
        self.assertFalse(any(f.id == feature_id for f in self.state.fields.features))


if __name__ == "__main__":
    unittest.main()
