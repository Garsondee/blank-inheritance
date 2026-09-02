"""Tests for api.ghostlines -- map-editor plan Phase 5: GET /api/ghost-lines.
Pure-function tests first (no HTTP, no DB), then real HTTP-level behaviour
via FastAPI's TestClient, matching test_api_edits.py's pattern.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
import shapely.geometry  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap import fields as fields_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.store import gpkg as gpkg_module  # noqa: E402
from citymap.style import Style  # noqa: E402

from api import ghostlines  # noqa: E402
from api.main import app, configure  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=2000.0, crs_epsg=6674, dem_grid=32)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))


# --- pure-function tests -----------------------------------------------

class TestIsRoadFeature(unittest.TestCase):
    def _kwargs(self, geom, tags, area=False):
        return {"geom": geom, "tags": tags, "area": area}

    def test_a_tagged_line_is_a_road(self):
        kwargs = self._kwargs(LineString([(0, 0), (10, 0)]), {"highway": "residential"})
        self.assertTrue(ghostlines.is_road_feature(kwargs))

    def test_an_untagged_line_is_not_a_road(self):
        kwargs = self._kwargs(LineString([(0, 0), (10, 0)]), {"waterway": "stream"})
        self.assertFalse(ghostlines.is_road_feature(kwargs))

    def test_a_tagged_area_is_not_a_road_even_with_a_highway_tag(self):
        """A real case: highway=pedestrian areas (plazas) ARE tagged
        highway=* but are polygons, not lines -- offsetting a polygon as if
        it were a road's centreline would be meaningless."""
        kwargs = self._kwargs(Polygon([(0, 0), (10, 0), (10, 10), (0, 10)]),
                             {"highway": "pedestrian"}, area=True)
        self.assertFalse(ghostlines.is_road_feature(kwargs))

    def test_none_or_empty_geometry_is_not_a_road(self):
        self.assertFalse(ghostlines.is_road_feature(self._kwargs(None, {"highway": "residential"})))
        self.assertFalse(ghostlines.is_road_feature(self._kwargs(LineString(), {"highway": "residential"})))


class TestParseDistances(unittest.TestCase):
    def test_parses_a_real_comma_separated_list(self):
        self.assertEqual(ghostlines.parse_distances("5,10,15"), [5.0, 10.0, 15.0])

    def test_tolerates_stray_whitespace(self):
        self.assertEqual(ghostlines.parse_distances(" 5 , 10 "), [5.0, 10.0])

    def test_rejects_empty_input(self):
        with self.assertRaises(ValueError):
            ghostlines.parse_distances("")

    def test_rejects_a_non_numeric_value(self):
        with self.assertRaises(ValueError):
            ghostlines.parse_distances("5,abc")

    def test_rejects_a_non_positive_value(self):
        with self.assertRaises(ValueError):
            ghostlines.parse_distances("5,0")
        with self.assertRaises(ValueError):
            ghostlines.parse_distances("-5")

    def test_rejects_more_than_the_max_allowed_distances(self):
        too_many = ",".join(str(i + 1) for i in range(ghostlines.MAX_DISTANCES + 1))
        with self.assertRaises(ValueError):
            ghostlines.parse_distances(too_many)

    def test_exactly_the_max_is_allowed(self):
        exactly = ",".join(str(i + 1) for i in range(ghostlines.MAX_DISTANCES))
        self.assertEqual(len(ghostlines.parse_distances(exactly)), ghostlines.MAX_DISTANCES)


class TestGhostLinesForRoad(unittest.TestCase):
    def test_produces_both_sides_at_every_distance(self):
        road = {"id": "r1", "geom": LineString([(0, 0), (100, 0)])}
        entries = ghostlines.ghost_lines_for_road(road, [5.0, 10.0])
        sides_and_distances = {(e["side"], e["distanceM"]) for e in entries}
        self.assertEqual(sides_and_distances, {("left", 5.0), ("left", 10.0), ("right", 5.0), ("right", 10.0)})
        for e in entries:
            self.assertEqual(e["parentId"], "r1")

    def test_a_geometrically_impossible_side_contributes_no_entries_for_that_distance(self):
        hairpin = {"id": "r2", "geom": LineString([(0, 0), (0, 20), (3, 20), (3, 0)])}
        entries = ghostlines.ghost_lines_for_road(hairpin, [5.0])
        sides = {e["side"] for e in entries}
        self.assertIn("left", sides)
        self.assertNotIn("right", sides)


# --- HTTP-level tests -----------------------------------------------------

class GhostLinesServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

        self.road = Feature(
            id="test-road",
            geom=LineString([(FRAME.cx - 100, FRAME.cy), (FRAME.cx + 100, FRAME.cy)]),
            tags={"highway": "residential"}, area=False, height_m=0.0)
        self.building = Feature(
            id="test-bldg",
            geom=Polygon([(FRAME.cx - 5, FRAME.cy + 50), (FRAME.cx + 5, FRAME.cy + 50),
                         (FRAME.cx + 5, FRAME.cy + 60), (FRAME.cx - 5, FRAME.cy + 60)]),
            tags={"building": "yes"}, area=True, height_m=8.0)

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        for f in (self.road, self.building):
            gpkg_module.insert_feature(conn, id=f.id, geom=f.geom, tags=f.tags, is_area=f.area,
                                      height_m=f.height_m, origin=f.source, log=False)
        conn.commit()
        conn.close()

        n = FRAME.dem_grid
        fields = fields_module.Fields(
            frame=FRAME, features=[self.road, self.building], lamps=[],
            elevation=np.zeros((n, n), dtype=np.float32),
            shade_rgb=np.full((n, n, 3), 200, dtype=np.float32),
            sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)

        self.state = configure(app, FRAME, STYLE, fields, self.tmp, self.store_path, self.tmp, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)

    def _viewport_params(self, extra=None):
        corners = [FRAME.inv.transform(x, y) for x, y in
                  [(FRAME.cx - 500, FRAME.cy - 500), (FRAME.cx + 500, FRAME.cy + 500)]]
        lons = [c[0] for c in corners]
        lats = [c[1] for c in corners]
        params = {"minLon": min(lons), "minLat": min(lats), "maxLon": max(lons), "maxLat": max(lats)}
        if extra:
            params.update(extra)
        return params


class TestGetGhostLines(GhostLinesServerTestCase):
    def test_returns_ghost_lines_for_the_road_only_not_the_building(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params())
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertGreater(len(body["features"]), 0)
        for feature in body["features"]:
            self.assertEqual(feature["properties"]["parentId"], "test-road")
            self.assertEqual(feature["geometry"]["type"], "LineString")

    def test_default_distances_produce_both_sides_of_the_road(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params())
        sides = {f["properties"]["side"] for f in resp.json()["features"]}
        self.assertEqual(sides, {"left", "right"})

    def test_custom_distances_are_honoured(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params({"distances": "3,7"}))
        distances = {f["properties"]["distanceM"] for f in resp.json()["features"]}
        self.assertEqual(distances, {3.0, 7.0})

    def test_offset_lines_are_real_lon_lat_near_the_original_road(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params({"distances": "10"}))
        feature = resp.json()["features"][0]
        coords = feature["geometry"]["coordinates"]
        self.assertEqual(len(coords), 2)
        # A real, non-degenerate line in lon/lat -- both endpoints distinct,
        # and close to the real road (this frame's extent is 2000m, so
        # anything within a couple hundred metres of the road's own lon/lat
        # is clearly the SAME road offset, not something reprojected wrong).
        self.assertNotEqual(tuple(coords[0]), tuple(coords[1]))
        road_centroid_lonlat = FRAME.inv.transform(self.road.geom.centroid.x, self.road.geom.centroid.y)
        offset_lonlat_geom = shapely.geometry.shape(feature["geometry"])
        offset_centroid = offset_lonlat_geom.centroid
        self.assertAlmostEqual(offset_centroid.x, road_centroid_lonlat[0], delta=0.01)
        self.assertAlmostEqual(offset_centroid.y, road_centroid_lonlat[1], delta=0.01)

    def test_invalid_distances_returns_422_not_a_silent_default(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params({"distances": "not-a-number"}))
        self.assertEqual(resp.status_code, 422)

    def test_truncation_is_honest_and_exact(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params({"cap": 1}))
        body = resp.json()
        self.assertEqual(len(body["features"]), 1)
        self.assertTrue(body["truncated"])
        self.assertGreater(body["hiddenByCap"], 0)

    def test_no_truncation_when_everything_fits(self):
        resp = self.client.get("/api/ghost-lines", params=self._viewport_params())
        body = resp.json()
        self.assertFalse(body["truncated"])
        self.assertEqual(body["hiddenByCap"], 0)

    def test_an_empty_viewport_far_from_anything_returns_no_features_not_an_error(self):
        far_params = self._viewport_params()
        far_params["minLon"] += 5.0
        far_params["maxLon"] += 5.0
        resp = self.client.get("/api/ghost-lines", params=far_params)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["features"], [])


if __name__ == "__main__":
    unittest.main()
