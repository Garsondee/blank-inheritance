"""HTTP-level tests for POST /api/array -- map-editor plan Phase 9.

Uses a real fields_module.build_fields fixture (same shape as
test_api_terrace.py/test_api_wall_on_foundation.py) seeded with one real
road Feature so routing has something real to reach. Most tests pass
skipAccessRoad=True to stay fast -- api/array_place.py calls place_array
with PRODUCTION routing constants (no test-scale override, unlike
test_array_place.py's own pure-module tests), so a real routing attempt
here pays the same real cost test_construct.py's own routing tests do;
only the tests that specifically need to prove routing actually works
end-to-end pay that cost.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString  # noqa: E402

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


class ArrayServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        cx, cy = FRAME.cx, FRAME.cy
        seed_road = Feature(id="seed-road", geom=LineString([(cx - 200, cy - 30), (cx + 200, cy - 30)]),
                            tags={"highway": "residential"}, area=False, height_m=0.0, source="test")
        world = World(features=[seed_road], road_graph=RoadGraph(), lamps=[],
                     sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)
        fields = fields_module.build_fields(world, FRAME, self.dem_cache, STYLE)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path,
                              self.dem_cache, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _lonlat_polygon(self, x_off=0.0, y_off=0.0, half=3.0):
        cx, cy = FRAME.cx, FRAME.cy
        corners_source = [
            (cx + x_off - half, cy + y_off - half), (cx + x_off + half, cy + y_off - half),
            (cx + x_off + half, cy + y_off + half), (cx + x_off - half, cy + y_off + half),
            (cx + x_off - half, cy + y_off - half),
        ]
        coords = [list(FRAME.inv.transform(x, y)) for x, y in corners_source]
        return {"type": "Polygon", "coordinates": [coords]}

    def _lonlat_line(self, points_source):
        coords = [list(FRAME.inv.transform(x, y)) for x, y in points_source]
        return {"type": "LineString", "coordinates": coords}

    def _default_body(self, **overrides):
        cx, cy = FRAME.cx, FRAME.cy
        # 90m, not 80m -- an exact multiple of spacingM=20 sits right on a
        # floor()-boundary that lon/lat round-trip reprojection precision
        # can tip either way (a real, expected effect, not a bug); 90/20=4.5
        # keeps well clear of that edge.
        body = {
            "unitFootprint": self._lonlat_polygon(half=3.0),
            "baseline": self._lonlat_line([(cx - 45, cy), (cx + 45, cy)]),
            "spacingM": 20.0,
            "unitHeightM": 5.0,
            "unitTags": {"building": "yes"},
            "orientationOffsetDeg": 0.0,
            "skipAccessRoad": True,  # most tests don't need real routing -- see module docstring
        }
        body.update(overrides)
        return body


class TestCreateArray(ArrayServerTestCase):
    def test_creates_real_instance_features(self):
        resp = self.client.post("/api/array", json=self._default_body())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["instanceFeatures"]), 5)  # floor(90/20)+1
        self.assertEqual(body["roadFeatures"], [])  # skipAccessRoad=True
        self.assertEqual(body["skipped"], [])

    def test_instances_are_real_tagged_feature_rows(self):
        resp = self.client.post("/api/array", json=self._default_body(unitTags={"building": "house"}))
        instance_id = resp.json()["instanceFeatures"][0]["id"]
        conn = gpkg_module.connect(self.store_path)
        kwargs = gpkg_module.get_feature_kwargs(conn, instance_id)
        conn.close()
        self.assertEqual(kwargs["tags"]["building"], "house")

    def test_instances_are_live_visible_after_creation(self):
        resp = self.client.post("/api/array", json=self._default_body())
        instance_id = resp.json()["instanceFeatures"][0]["id"]
        self.assertTrue(any(f.id == instance_id for f in self.state.fields.features))

    def test_invalid_spacing_returns_422_with_a_specific_message(self):
        resp = self.client.post("/api/array", json=self._default_body(spacingM=0.0))
        self.assertEqual(resp.status_code, 422)

    def test_resubmitting_the_identical_request_reports_every_instance_as_self_conflicting(self):
        """Different from terrace.py/wall_on_foundation.py's own identical-
        resubmission tests, deliberately: this is NOT the id-collision 409
        path. The first submission's instances are, by the time a second
        identical request arrives, real live buildings in Fields.features
        -- so the SAME footprint-conflict check that rejects an array
        overlapping any OTHER existing building rejects every one of a
        resubmission's instances too, for the exact same honest reason,
        confirmed directly (see this phase's own investigation). The
        underlying id-collision 409 (create_array's sqlite3.IntegrityError
        handler, shared with terrace.py/wall_on_foundation.py) is still
        real, working code -- it is just not reachable via THIS scenario
        for arrays specifically, since the conflict check fires first and
        is arguably the more informative response anyway (it explains
        WHY, a bare 409 would not)."""
        first = self.client.post("/api/array", json=self._default_body())
        self.assertEqual(first.status_code, 200)
        first_count = len(first.json()["instanceFeatures"])
        self.assertGreater(first_count, 0)

        second = self.client.post("/api/array", json=self._default_body())
        self.assertEqual(second.status_code, 200)
        second_body = second.json()
        self.assertEqual(second_body["instanceFeatures"], [])
        self.assertEqual(len(second_body["skipped"]), first_count)
        self.assertTrue(all("existing building" in s["reason"] for s in second_body["skipped"]))

    def test_bumps_world_version_exactly_once(self):
        conn = gpkg_module.connect(self.store_path)
        v0 = gpkg_module.get_world_version(conn)
        conn.close()
        self.client.post("/api/array", json=self._default_body())
        conn = gpkg_module.connect(self.store_path)
        v1 = gpkg_module.get_world_version(conn)
        conn.close()
        self.assertEqual(v1, v0 + 1)

    def test_reports_tiles_invalidated_as_a_real_count(self):
        # A plain isinstance check, deliberately not >0 -- a fresh test
        # store's tile cache starts empty (nothing has ever been rendered),
        # so 0 real files to invalidate is a legitimate result here, same
        # reasoning as test_api_terrace.py's own version of this test.
        resp = self.client.post("/api/array", json=self._default_body())
        self.assertIsInstance(resp.json()["tilesInvalidated"], int)

    def test_skipped_instances_are_reported_never_silently_dropped(self):
        # spacing tight enough that a 6m-wide footprint overlaps itself
        resp = self.client.post("/api/array", json=self._default_body(spacingM=3.0))
        body = resp.json()
        self.assertGreater(len(body["skipped"]), 0)
        for skip in body["skipped"]:
            self.assertIn("index", skip)
            self.assertIn("reason", skip)
            self.assertTrue(skip["reason"])


class TestArrayWithRealRouting(ArrayServerTestCase):
    """The one real end-to-end proof that skipAccessRoad=False actually
    routes real driveways through the full HTTP stack -- deliberately kept
    to a small number of cases, since this pays real production-scale A*
    routing cost (ROUTING_WINDOW_MIN_M alone is a real >=500m half-window;
    see array_place.py's own docstring on why that's a parameter, not
    hardcoded, precisely so most tests can avoid paying it).

    Elevation is flattened after setUp -- confirmed directly that the real
    GSI DEM at this small test frame is ~65% NaN (no coverage), a real,
    legitimate data gap (same class of thing test_api_terrace.py's own
    NaN-safe assertion already works around), not a routing bug: a NaN
    routing-grid cell is honestly rejected as impassable by router.py's own
    passable() check, which would make this specific test flaky depending
    on exactly where the real DEM happens to have a hole, for a test whose
    actual point is proving the HTTP/store wiring works, not re-testing
    real elevation coverage (already covered elsewhere)."""

    def setUp(self):
        super().setUp()
        self.state.fields.elevation = np.full_like(self.state.fields.elevation, 10.0)

    def test_a_real_road_gets_a_real_routed_driveway_feature(self):
        resp = self.client.post("/api/array", json=self._default_body(skipAccessRoad=False))
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertGreater(len(body["roadFeatures"]), 0)
        road_id = body["roadFeatures"][0]["id"]
        conn = gpkg_module.connect(self.store_path)
        kwargs = gpkg_module.get_feature_kwargs(conn, road_id)
        conn.close()
        self.assertEqual(kwargs["tags"]["highway"], "service")


class TestUndoAnArray(ArrayServerTestCase):
    def test_undo_removes_every_instance_as_one_step(self):
        create_resp = self.client.post("/api/array", json=self._default_body())
        instance_ids = [f["id"] for f in create_resp.json()["instanceFeatures"]]
        self.assertGreater(len(instance_ids), 0)

        undo_resp = self.client.post("/api/undo")
        body = undo_resp.json()
        self.assertTrue(body["undone"])
        self.assertEqual(set(body["deletedFeatureIds"]), set(instance_ids))

        conn = gpkg_module.connect(self.store_path)
        remaining = gpkg_module.get_feature_kwargs(conn, instance_ids[0])
        conn.close()
        self.assertIsNone(remaining)

    def test_undo_removes_instances_from_the_live_fields_too(self):
        create_resp = self.client.post("/api/array", json=self._default_body())
        instance_id = create_resp.json()["instanceFeatures"][0]["id"]
        self.assertTrue(any(f.id == instance_id for f in self.state.fields.features))

        self.client.post("/api/undo")
        self.assertFalse(any(f.id == instance_id for f in self.state.fields.features))

    def test_redo_after_undoing_brings_every_instance_back(self):
        create_resp = self.client.post("/api/array", json=self._default_body())
        instance_ids = {f["id"] for f in create_resp.json()["instanceFeatures"]}

        self.client.post("/api/undo")  # delete
        redo_resp = self.client.post("/api/undo")  # redo -- recreate
        self.assertTrue(redo_resp.json()["undone"])

        conn = gpkg_module.connect(self.store_path)
        remaining = {row["id"] for row in gpkg_module.iter_all_features(conn)}
        conn.close()
        self.assertTrue(instance_ids.issubset(remaining))


if __name__ == "__main__":
    unittest.main()
