"""acquire.py tests: the pure tile-math/parsing core, plus cache-hit paths for
the I/O boundary (network calls themselves are untested, per
design/testing-strategy.md's pure-core/thin-adapter split -- same treatment as
foundry/.../scripts/foundry/).
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402

from citymap import acquire  # noqa: E402


class TestOverpassQuery(unittest.TestCase):
    def test_bbox_is_embedded_south_west_north_east(self):
        query = acquire.build_overpass_query(34.6, 135.1, 34.7, 135.2)
        self.assertIn("34.6,135.1,34.7,135.2", query)

    def test_includes_relation_clauses(self):
        """Regression guard: relations are not optional, see parse.py."""
        query = acquire.build_overpass_query(0, 0, 1, 1)
        for clause in ('relation["landuse"]', 'relation["place"="island"]',
                      'relation["aeroway"]'):
            self.assertIn(clause, query)

    def test_includes_aeroway_way_clause(self):
        # Regression: the linear runway/taxiway fix depended on this being fetched.
        query = acquire.build_overpass_query(0, 0, 1, 1)
        self.assertIn('way["aeroway"]', query)

    def test_key_is_deterministic(self):
        q = acquire.build_overpass_query(34.6, 135.1, 34.7, 135.2)
        self.assertEqual(acquire.overpass_cache_key(q), acquire.overpass_cache_key(q))

    def test_different_bbox_different_key(self):
        a = acquire.build_overpass_query(34.6, 135.1, 34.7, 135.2)
        b = acquire.build_overpass_query(34.6, 135.1, 34.7, 135.3)
        self.assertNotEqual(acquire.overpass_cache_key(a), acquire.overpass_cache_key(b))


class TestFetchOverpassCacheHit(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_cache_hit_never_touches_the_network(self):
        query = "arbitrary test query"
        key = acquire.overpass_cache_key(query)
        path = os.path.join(self.tmp, f"{key}.json")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write('{"elements": [{"type": "node", "id": 1}]}')

        # If this reached urllib it would raise (no network in tests / bad URL
        # substitute) -- reaching the assertion at all proves the cache was used.
        result = acquire.fetch_overpass(query, self.tmp)
        self.assertEqual(result["elements"][0]["id"], 1)


class TestDemTextParsing(unittest.TestCase):
    def test_basic_grid(self):
        raw = "1.0,2.5\n3.25,4.0"
        arr = acquire.parse_dem_text(raw)
        np.testing.assert_allclose(arr, [[1.0, 2.5], [3.25, 4.0]])

    def test_e_marks_nodata(self):
        raw = "1.0,e\ne,4.0"
        arr = acquire.parse_dem_text(raw)
        self.assertTrue(np.isnan(arr[0, 1]))
        self.assertTrue(np.isnan(arr[1, 0]))
        self.assertEqual(arr[0, 0], 1.0)

    def test_trailing_whitespace_tolerated(self):
        raw = "1.0,2.0\n3.0,4.0\n\n"
        arr = acquire.parse_dem_text(raw)
        self.assertEqual(arr.shape, (2, 2))

    def test_dtype_is_float32(self):
        self.assertEqual(acquire.parse_dem_text("1.0,2.0").dtype, np.float32)


class TestDemTileCacheHit(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_cached_tile_never_touches_the_network(self):
        arr = np.array([[1.0, 2.0], [3.0, 4.0]], dtype=np.float32)
        path = os.path.join(self.tmp, "dem5a_15_1000_2000.npy")
        np.save(path, arr)
        back = acquire.fetch_dem_tile("dem5a", 15, 1000, 2000, self.tmp)
        np.testing.assert_array_equal(back, arr)

    def test_dem5a_cache_hit_skips_dem5b_entirely(self):
        arr = np.array([[9.0]], dtype=np.float32)
        np.save(os.path.join(self.tmp, "dem5a_15_5_5.npy"), arr)
        back = acquire.fetch_dem_tile_cached(15, 5, 5, self.tmp)
        np.testing.assert_array_equal(back, arr)

    def test_a_known_missing_tile_returns_none_without_touching_the_network(self):
        # A `.missing` marker (written the first time a tile 404s -- see
        # fetch_dem_tile's own docstring on why this negative cache exists)
        # must short-circuit BEFORE any real network attempt. If this
        # reached urllib it would raise (no network in tests) -- returning
        # cleanly at all proves the marker was honoured.
        marker_path = os.path.join(self.tmp, "dem5a_15_1000_2000.missing")
        open(marker_path, "w").close()
        result = acquire.fetch_dem_tile("dem5a", 15, 1000, 2000, self.tmp)
        self.assertIsNone(result)

    def test_a_missing_marker_for_one_dataset_still_lets_the_other_dataset_be_tried(self):
        # dem5a is confirmed missing; dem5b has a real cached hit -- fetch_dem_tile_cached
        # must fall through past the negative-cached dataset to the real one.
        open(os.path.join(self.tmp, "dem5a_15_7_7.missing"), "w").close()
        arr = np.array([[3.0]], dtype=np.float32)
        np.save(os.path.join(self.tmp, "dem5b_15_7_7.npy"), arr)
        back = acquire.fetch_dem_tile_cached(15, 7, 7, self.tmp)
        np.testing.assert_array_equal(back, arr)

    def test_a_real_npy_hit_is_preferred_over_a_stale_missing_marker(self):
        # Shouldn't happen in practice (a tile is either permanently missing
        # or not), but if both files somehow exist, the real data must win --
        # confirms the .npy check happens first, not the marker check.
        arr = np.array([[7.0]], dtype=np.float32)
        np.save(os.path.join(self.tmp, "dem5a_15_9_9.npy"), arr)
        open(os.path.join(self.tmp, "dem5a_15_9_9.missing"), "w").close()
        back = acquire.fetch_dem_tile("dem5a", 15, 9, 9, self.tmp)
        np.testing.assert_array_equal(back, arr)


class TestTileMath(unittest.TestCase):
    def test_known_web_mercator_tile(self):
        # z=0 covers the whole world in one tile: everything maps into [0,1).
        x, y = acquire.lonlat_to_tile_frac(np.array([0.0]), np.array([0.0]), zoom=0)
        self.assertAlmostEqual(float(x[0]), 0.5, places=6)
        self.assertAlmostEqual(float(y[0]), 0.5, places=6)

    def test_equator_prime_meridian_is_frame_centre_at_any_zoom(self):
        for zoom in (1, 10, 15):
            x, y = acquire.lonlat_to_tile_frac(np.array([0.0]), np.array([0.0]), zoom)
            n = 2 ** zoom
            self.assertAlmostEqual(float(x[0]), n / 2.0, places=4)
            self.assertAlmostEqual(float(y[0]), n / 2.0, places=4)

    def test_tile_range_covers_all_points(self):
        x = np.array([10.2, 10.8, 12.1])
        y = np.array([5.5, 6.9, 5.1])
        rng = acquire.tile_range_for(x, y)
        self.assertEqual(rng.tx_min, 10)
        self.assertEqual(rng.tx_max, 12)
        self.assertEqual(rng.ty_min, 5)
        self.assertEqual(rng.ty_max, 6)

    def test_tile_range_dimensions(self):
        rng = acquire.TileRange(10, 12, 5, 6)
        self.assertEqual(rng.count, 3 * 2)
        self.assertEqual(rng.width_px, 3 * 256)
        self.assertEqual(rng.height_px, 2 * 256)


class TestBilinearSample(unittest.TestCase):
    def test_grid_points_away_from_the_clamp_edge(self):
        mosaic = np.array([[0.0, 10.0, 0.0], [20.0, 30.0, 0.0], [0.0, 0.0, 0.0]],
                          dtype=np.float32)
        got = acquire.bilinear_sample(mosaic, np.array([0.0, 1.0]), np.array([0.0, 1.0]))
        np.testing.assert_allclose(got, [0.0, 30.0])

    def test_exact_top_right_corner_is_within_the_clamp_tolerance(self):
        # The clamp `w - 1.001` intentionally pulls the very last coordinate
        # fractionally inside the array to avoid an out-of-bounds floor()+1;
        # at the true corner that reads a hair short of the corner value.
        mosaic = np.array([[0.0, 10.0], [20.0, 30.0]], dtype=np.float32)
        got = acquire.bilinear_sample(mosaic, np.array([1.0]), np.array([1.0]))
        self.assertAlmostEqual(float(got[0]), 30.0, delta=0.05)

    def test_midpoint_is_the_average(self):
        mosaic = np.array([[0.0, 10.0], [20.0, 30.0]], dtype=np.float32)
        got = acquire.bilinear_sample(mosaic, np.array([0.5]), np.array([0.5]))
        self.assertAlmostEqual(float(got[0]), 15.0, places=4)

    def test_any_nan_corner_makes_the_sample_nan(self):
        """The regression this guards: never smear a real value across a
        coastline gap (see module docstring)."""
        mosaic = np.array([[0.0, np.nan], [20.0, 30.0]], dtype=np.float32)
        got = acquire.bilinear_sample(mosaic, np.array([0.5]), np.array([0.5]))
        self.assertTrue(np.isnan(got[0]))

    def test_out_of_range_coords_are_clamped_not_wrapped(self):
        mosaic = np.array([[1.0, 2.0], [3.0, 4.0]], dtype=np.float32)
        got = acquire.bilinear_sample(mosaic, np.array([-5.0, 50.0]), np.array([-5.0, 50.0]))
        self.assertFalse(np.isnan(got).any())


class TestDemGridForFrame(unittest.TestCase):
    def test_grid_shape_is_correct(self):
        """Shape and grid construction, independent of network availability.

        Whether tiles are actually fetched depends on this machine having
        internet access -- that is an integration concern, not what this test
        is for. The row/col -> lon/lat mapping (row 0 = the map's north edge,
        matching the canvas so no flip is needed downstream) is exercised
        precisely by TestRoundTrips in test_frame.py via the same
        `to_source_array` this function calls; duplicating that here would
        just be two tests of the same formula.
        """
        from citymap.frame import Frame

        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)

        frame = Frame(id="t", center_lon=135.205, center_lat=34.678,
                      rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674, dem_grid=8)
        elevation, fetched, missing = acquire.dem_grid_for_frame(frame, tmp)
        self.assertEqual(elevation.shape, (8, 8))
        self.assertGreaterEqual(fetched, 0)
        self.assertGreaterEqual(missing, 0)
        self.assertGreater(fetched + missing, 0, "at least one DEM tile must be in range")


if __name__ == "__main__":
    unittest.main()
