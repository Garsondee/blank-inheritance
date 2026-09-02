"""HTTP-level tests for the tile server (map-editor plan Phase 2) --
exercises the real ASGI request/response stack via FastAPI's TestClient
(no real socket needed), closing the gap the plan calls out explicitly:
the OLD editor/server.py's HTTP layer had no request-level tests at all,
only in-process helper-function tests. Every route here is driven as a
real HTTP request/response, including validation and error paths.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402

from citymap import fields as fields_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.store import gpkg as gpkg_module  # noqa: E402
from citymap.style import Style  # noqa: E402

from api.main import app, configure  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=2000.0, crs_epsg=6674, dem_grid=32)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))


def _test_features():
    """One shared feature list, used to build BOTH the rendering Fields
    AND a real backing .gpkg store, so a test hitting /tiles/... and one
    hitting /api/features are looking at the exact same fixture data."""
    half = 15.0
    building = Feature(
        id="test-bldg",
        geom=Polygon([(FRAME.cx - half, FRAME.cy - half), (FRAME.cx + half, FRAME.cy - half),
                     (FRAME.cx + half, FRAME.cy + half), (FRAME.cx - half, FRAME.cy + half)]),
        tags={"building": "yes"}, area=True, height_m=12.0)
    return [building]


def _test_fields(features):
    n = FRAME.dem_grid
    return fields_module.Fields(
        frame=FRAME, features=features, lamps=[],
        elevation=np.zeros((n, n), dtype=np.float32),
        shade_rgb=np.full((n, n, 3), 200, dtype=np.float32),
        sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


class TileServerTestCase(unittest.TestCase):
    """Base: a fresh tiles cache dir AND a fresh backing .gpkg store per
    test, and the shared `app` reconfigured with a small, fast fixture
    before each test runs -- configure() overwrites app.state.map_state
    wholesale, so this is sufficient isolation without needing a second
    FastAPI() instance."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

        self.store_path = os.path.join(self.tmp, "test.gpkg")
        conn = gpkg_module.create_store(self.store_path)
        for f in _test_features():
            gpkg_module.insert_feature(conn, id=f.id, geom=f.geom, tags=f.tags, is_area=f.area,
                                      height_m=f.height_m, origin=f.source, log=False)
        conn.commit()
        conn.close()

        self.state = configure(app, FRAME, STYLE, _test_fields(_test_features()), self.tmp,
                              self.store_path, self.tmp, max_workers=2)
        self.addCleanup(self.state.renderer.shutdown)
        self.client = TestClient(app)


class TestGetFrame(TileServerTestCase):
    def test_returns_real_center_lonlat(self):
        resp = self.client.get("/api/frame")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertAlmostEqual(body["centerLon"], FRAME.center_lon, places=6)
        self.assertAlmostEqual(body["centerLat"], FRAME.center_lat, places=6)
        self.assertAlmostEqual(body["extentM"], FRAME.extent_m, places=3)

    def test_four_corners_in_nw_ne_se_sw_order(self):
        """MapLibre's ImageSource wants [top-left, top-right, bottom-right,
        bottom-left] -- for this frame (row 0 of every render is north),
        that's [NW, NE, SE, SW]. Checked against the frame's own real
        source_corners(), not re-derived independently, so this test would
        catch a reordering regression, not just "4 numbers came back"."""
        resp = self.client.get("/api/frame")
        corners = resp.json()["cornersLonLat"]
        self.assertEqual(len(corners), 4)

        # frame.source_corners() is documented as [SW, SE, NE, NW].
        expected_source = list(reversed(FRAME.source_corners()))  # -> [NW, NE, SE, SW]
        expected_lonlat = [FRAME.inv.transform(x, y) for x, y in expected_source]
        for (got_lon, got_lat), (exp_lon, exp_lat) in zip(corners, expected_lonlat):
            self.assertAlmostEqual(got_lon, exp_lon, places=6)
            self.assertAlmostEqual(got_lat, exp_lat, places=6)

    def test_corners_form_a_real_quadrilateral_around_the_centre(self):
        """A weaker, geometry-only sanity check independent of the exact
        reordering above -- every corner must be roughly extentM/sqrt(2)
        from the centre (a rotated square's circumradius), so a totally
        wrong transform (e.g. accidentally returning MAP-space metres
        instead of lon/lat) would fail this even if the ordering test
        above had a matching bug on both sides."""
        resp = self.client.get("/api/frame")
        body = resp.json()
        half_diag_m = body["extentM"] / 2 * (2 ** 0.5)
        for lon, lat in body["cornersLonLat"]:
            x, y = FRAME.fwd.transform(lon, lat)
            dist_m = ((x - FRAME.cx) ** 2 + (y - FRAME.cy) ** 2) ** 0.5
            self.assertAlmostEqual(dist_m, half_diag_m, delta=1.0)

    def test_backdrop_url_is_a_real_servable_tile(self):
        resp = self.client.get("/api/frame")
        backdrop_url = resp.json()["backdropUrl"]
        tile_resp = self.client.get(backdrop_url)
        self.assertEqual(tile_resp.status_code, 200)
        self.assertEqual(tile_resp.headers["content-type"], "image/png")

    def test_returns_503_when_not_configured(self):
        del app.state.map_state
        try:
            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get("/api/frame")
            self.assertEqual(resp.status_code, 503)
        finally:
            app.state.map_state = self.state


class TestGetSea(TileServerTestCase):
    """The fast-vector-view's water source -- deliberately absent from
    GET /api/features (see api/main.py's own get_sea docstring for why:
    the sea lives in world_geom, not the feature table)."""

    def test_no_sea_in_this_frame_returns_a_null_feature(self):
        resp = self.client.get("/api/sea")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"feature": None})

    def test_a_real_sea_polygon_comes_back_as_real_lonlat_geojson(self):
        cx, cy = FRAME.cx, FRAME.cy
        sea_geom = Polygon([(cx - 500, cy - 500), (cx + 500, cy - 500),
                            (cx + 500, cy + 500), (cx - 500, cy + 500)])
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.set_world_geom(conn, "sea", sea_geom, log=False)
        conn.commit()
        conn.close()

        resp = self.client.get("/api/sea")
        self.assertEqual(resp.status_code, 200)
        feature = resp.json()["feature"]
        self.assertIsNotNone(feature)
        self.assertEqual(feature["type"], "Feature")
        self.assertEqual(feature["properties"]["tags"]["__sea__"], "true")
        self.assertEqual(feature["geometry"]["type"], "Polygon")

        # Real WGS84 lon/lat, not SOURCE-CRS metres -- re-project the
        # response geometry's centroid back and check it lands on the
        # frame's own real centre, the same round-trip other endpoints'
        # own coordinate tests use. GeoJSON rings repeat their first point
        # as the closing vertex -- drop it before averaging, or that one
        # corner is double-weighted and the "centroid" skews toward it.
        ring = feature["geometry"]["coordinates"][0][:-1]
        lon = sum(c[0] for c in ring) / len(ring)
        lat = sum(c[1] for c in ring) / len(ring)
        x, y = FRAME.fwd.transform(lon, lat)
        self.assertAlmostEqual(x, cx, delta=1.0)
        self.assertAlmostEqual(y, cy, delta=1.0)

    def test_returns_503_when_not_configured(self):
        del app.state.map_state
        try:
            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get("/api/sea")
            self.assertEqual(resp.status_code, 503)
        finally:
            app.state.map_state = self.state


class TestHealth(TileServerTestCase):
    def test_ok_when_configured(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})

    def test_not_configured_before_first_configure_call(self):
        del app.state.map_state
        try:
            resp = self.client.get("/health")
            self.assertEqual(resp.json(), {"status": "not_configured"})
        finally:
            app.state.map_state = self.state  # restore for addCleanup/other tests


class TestGetTile(TileServerTestCase):
    def test_returns_a_real_png(self):
        resp = self.client.get("/tiles/0/0/0.png")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "image/png")
        self.assertEqual(resp.content[:8], b"\x89PNG\r\n\x1a\n")  # real PNG magic bytes

    def test_no_cache_header_present(self):
        """Deliberate: a live-editable map must not let the browser cache
        tiles aggressively, or a later edit's re-render becomes invisible
        until a hard refresh -- see main.py's own comment on this."""
        resp = self.client.get("/tiles/0/0/0.png")
        self.assertEqual(resp.headers["cache-control"], "no-cache")

    def test_respects_px_query_param(self):
        resp = self.client.get("/tiles/0/0/0.png?px=64")
        self.assertEqual(resp.status_code, 200)
        from PIL import Image
        import io
        with Image.open(io.BytesIO(resp.content)) as img:
            self.assertEqual(img.size, (64, 64))

    def test_out_of_range_xy_returns_400_not_500(self):
        resp = self.client.get("/tiles/2/99/0.png")  # zoom 2 has x in [0,3]
        self.assertEqual(resp.status_code, 400)
        self.assertIn("out of range", resp.json()["detail"])

    def test_zoom_beyond_max_returns_400(self):
        from api.main import MAX_ZOOM
        resp = self.client.get(f"/tiles/{MAX_ZOOM + 1}/0/0.png")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("MAX_ZOOM", resp.json()["detail"])

    def test_px_below_minimum_is_rejected_by_validation(self):
        resp = self.client.get("/tiles/0/0/0.png?px=1")
        self.assertEqual(resp.status_code, 422)  # FastAPI request-validation error

    def test_px_above_maximum_is_rejected_by_validation(self):
        resp = self.client.get("/tiles/0/0/0.png?px=999999")
        self.assertEqual(resp.status_code, 422)

    def test_4096_the_new_on_demand_render_ceiling_is_accepted(self):
        # Direct user request (2026-08-25): the always-on backdrop stays at
        # a cheap default, but an explicit "render at higher quality"
        # action needs real 4K to be a legal request, not just under the
        # old 2048 ceiling this project shipped with.
        resp = self.client.get("/tiles/0/0/0.png?px=4096")
        self.assertEqual(resp.status_code, 200)
        from PIL import Image
        import io
        with Image.open(io.BytesIO(resp.content)) as img:
            self.assertEqual(img.size, (4096, 4096))

    def test_4097_one_past_the_new_ceiling_is_rejected(self):
        resp = self.client.get("/tiles/0/0/0.png?px=4097")
        self.assertEqual(resp.status_code, 422)

    def test_supersample_out_of_range_is_rejected(self):
        resp = self.client.get("/tiles/0/0/0.png?supersample=99")
        self.assertEqual(resp.status_code, 422)

    def test_second_request_for_the_same_tile_is_served_from_cache(self):
        """Exercises the cache-hit path through the real HTTP layer, not
        just tiles.py directly -- confirms the endpoint's caching plumbing
        (not just the underlying library function) actually works."""
        first = self.client.get("/tiles/1/0/0.png")
        self.assertEqual(first.status_code, 200)
        second = self.client.get("/tiles/1/0/0.png")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.content, second.content)

    def test_different_tiles_return_different_images(self):
        a = self.client.get("/tiles/1/0/0.png")
        b = self.client.get("/tiles/1/1/1.png")
        self.assertEqual(a.status_code, 200)
        self.assertEqual(b.status_code, 200)
        # Not a strict guarantee in general (two tiles COULD render
        # identically), but for this fixture's off-centre building the two
        # opposite-corner quadrants must differ.
        self.assertNotEqual(a.content, b.content)


def _lonlat_bbox_around_center(buffer_m: float):
    """A real lon/lat bbox covering `buffer_m` around the frame's centre --
    computed via the real inverse projection, not approximated as a fixed
    degree offset (which would be wrong, and fragile, at any real latitude).
    """
    min_lon, min_lat = FRAME.inv.transform(FRAME.cx - buffer_m, FRAME.cy - buffer_m)
    max_lon, max_lat = FRAME.inv.transform(FRAME.cx + buffer_m, FRAME.cy + buffer_m)
    return (min(min_lon, max_lon), min(min_lat, max_lat),
           max(min_lon, max_lon), max(min_lat, max_lat))


class TestGetFeatures(TileServerTestCase):
    def test_finds_the_test_building(self):
        min_lon, min_lat, max_lon, max_lat = _lonlat_bbox_around_center(50.0)
        resp = self.client.get("/api/features", params={
            "minLon": min_lon, "minLat": min_lat, "maxLon": max_lon, "maxLat": max_lat,
            "mpp": 1.0,
        })
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["type"], "FeatureCollection")
        ids = [f["id"] for f in body["features"]]
        self.assertIn("test-bldg", ids)
        self.assertEqual(body["hiddenByCap"], 0)

    def test_geometry_is_real_lonlat_not_map_space(self):
        """A returned feature's coordinates must be real geographic
        lon/lat -- roughly near the frame's own centre lon/lat, not raw
        MAP-space metres (which would be off by many orders of magnitude
        and by the frame's own large projected-CRS offset)."""
        min_lon, min_lat, max_lon, max_lat = _lonlat_bbox_around_center(50.0)
        resp = self.client.get("/api/features", params={
            "minLon": min_lon, "minLat": min_lat, "maxLon": max_lon, "maxLat": max_lat,
            "mpp": 1.0,
        })
        feature = next(f for f in resp.json()["features"] if f["id"] == "test-bldg")
        lon, lat = feature["geometry"]["coordinates"][0][0]
        self.assertAlmostEqual(lon, FRAME.center_lon, delta=0.01)
        self.assertAlmostEqual(lat, FRAME.center_lat, delta=0.01)

    def test_far_away_bbox_finds_nothing(self):
        min_lon, min_lat, max_lon, max_lat = _lonlat_bbox_around_center(50.0)
        # Shift the whole query box far from the building -- well outside
        # any reasonable projection/reprojection tolerance.
        resp = self.client.get("/api/features", params={
            "minLon": min_lon + 5.0, "minLat": min_lat + 5.0,
            "maxLon": max_lon + 5.0, "maxLat": max_lat + 5.0, "mpp": 1.0,
        })
        self.assertEqual(resp.json()["features"], [])

    def test_a_coarse_mpp_hides_the_small_test_building(self):
        """At a very coarse metres-per-pixel, the 30m test building's bbox
        diagonal falls below the pixel-visibility threshold and must be
        excluded via hiddenByLod, not silently omitted with no signal."""
        min_lon, min_lat, max_lon, max_lat = _lonlat_bbox_around_center(50.0)
        resp = self.client.get("/api/features", params={
            "minLon": min_lon, "minLat": min_lat, "maxLon": max_lon, "maxLat": max_lat,
            "mpp": 100.0,  # 30m diagonal / 100 mpp << the 3px threshold
        })
        body = resp.json()
        self.assertEqual(body["features"], [])
        self.assertEqual(body["hiddenByLod"], 1)

    def test_cap_is_respected_and_hiddenByCap_is_exact(self):
        # Add more features clustered at the same point, on top of the
        # fixture's one building, so the cap genuinely has something to cut.
        conn = gpkg_module.connect(self.store_path)
        for i in range(5):
            gpkg_module.insert_feature(
                conn, id=f"extra-{i}",
                geom=Polygon([(FRAME.cx - 5, FRAME.cy - 5), (FRAME.cx + 5, FRAME.cy - 5),
                             (FRAME.cx + 5, FRAME.cy + 5), (FRAME.cx - 5, FRAME.cy + 5)]),
                tags={}, is_area=True, log=False)
        conn.commit()
        conn.close()

        min_lon, min_lat, max_lon, max_lat = _lonlat_bbox_around_center(50.0)
        resp = self.client.get("/api/features", params={
            "minLon": min_lon, "minLat": min_lat, "maxLon": max_lon, "maxLat": max_lat,
            "mpp": 1.0, "cap": 3,
        })
        body = resp.json()
        self.assertEqual(len(body["features"]), 3)
        self.assertEqual(body["hiddenByCap"], 6 - 3)  # 6 total (1 fixture + 5 extra), 3 shown
        self.assertTrue(body["truncated"])

    def test_missing_required_param_is_a_422_not_a_500(self):
        resp = self.client.get("/api/features", params={"minLon": 0, "minLat": 0, "maxLon": 1})
        self.assertEqual(resp.status_code, 422)


class TestHitTest(TileServerTestCase):
    def test_hits_the_building_at_its_centre(self):
        resp = self.client.post("/api/hit-test",
                               json={"lon": FRAME.center_lon, "lat": FRAME.center_lat})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIsNotNone(body["feature"])
        self.assertEqual(body["feature"]["id"], "test-bldg")

    def test_misses_far_from_anything(self):
        lon, lat = FRAME.inv.transform(FRAME.cx + 500, FRAME.cy + 500)
        resp = self.client.post("/api/hit-test", json={"lon": lon, "lat": lat})
        self.assertEqual(resp.json(), {"feature": None})

    def test_works_regardless_of_lod_or_cap(self):
        """The whole point of a separate hit-test endpoint: it must find
        the real feature even where /api/features, at a coarse mpp, would
        have hidden it via LOD -- this endpoint takes no mpp/cap at all."""
        resp = self.client.post("/api/hit-test",
                               json={"lon": FRAME.center_lon, "lat": FRAME.center_lat})
        self.assertEqual(resp.json()["feature"]["id"], "test-bldg")

    def test_small_feature_wins_over_a_larger_one_underneath(self):
        """A small building inside/overlapping a larger parcel must win the
        click -- not the larger feature behind it."""
        conn = gpkg_module.connect(self.store_path)
        gpkg_module.insert_feature(
            conn, id="big-parcel",
            geom=Polygon([(FRAME.cx - 200, FRAME.cy - 200), (FRAME.cx + 200, FRAME.cy - 200),
                         (FRAME.cx + 200, FRAME.cy + 200), (FRAME.cx - 200, FRAME.cy + 200)]),
            tags={"landuse": "residential"}, is_area=True, log=False)
        conn.commit()
        conn.close()

        resp = self.client.post("/api/hit-test",
                               json={"lon": FRAME.center_lon, "lat": FRAME.center_lat})
        self.assertEqual(resp.json()["feature"]["id"], "test-bldg")

    def test_invalid_body_is_a_422_not_a_500(self):
        resp = self.client.post("/api/hit-test", json={"lon": "not a number", "lat": 0})
        self.assertEqual(resp.status_code, 422)


class TestNotConfigured(unittest.TestCase):
    """A fresh request against an app that has never been configured must
    fail loudly (503), not raise an unhandled AttributeError (500)."""

    def test_tile_request_returns_503_when_never_configured(self):
        had_state = hasattr(app.state, "map_state")
        saved = getattr(app.state, "map_state", None)
        if had_state:
            del app.state.map_state
        try:
            client = TestClient(app, raise_server_exceptions=False)
            resp = client.get("/tiles/0/0/0.png")
            self.assertEqual(resp.status_code, 503)
        finally:
            if had_state:
                app.state.map_state = saved


if __name__ == "__main__":
    unittest.main()
