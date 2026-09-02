"""citymap.tiles: XYZ<->frame map-space math, the disk cache, and
bbox-precise invalidation (map-editor plan Phase 2).
"""

import os
import shutil
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from shapely.geometry import Point, Polygon  # noqa: E402

from citymap import cache, fields as fields_module, tiles  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.style import Style  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=2000.0, crs_epsg=6674, dem_grid=32)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))
OTHER_STYLE = Style({**STYLE._raw, "id": "other-style"})


def _minimal_fields(frame=FRAME):
    """A small but REAL fields fixture -- one building near the frame
    centre, so a render has actual visible content rather than being a
    flat colour that would pass a "non-blank" check for the wrong reason."""
    n = frame.dem_grid
    half = 15.0
    building = Feature(
        id="test-bldg",
        geom=Polygon([(frame.cx - half, frame.cy - half), (frame.cx + half, frame.cy - half),
                     (frame.cx + half, frame.cy + half), (frame.cx - half, frame.cy + half)]),
        tags={"building": "yes"}, area=True, height_m=12.0)
    return fields_module.Fields(
        frame=frame, features=[building], lamps=[],
        elevation=np.zeros((n, n), dtype=np.float32),
        shade_rgb=np.full((n, n, 3), 200, dtype=np.float32),
        sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


class TestTileCount(unittest.TestCase):
    def test_powers_of_two(self):
        self.assertEqual(tiles.tile_count(0), 1)
        self.assertEqual(tiles.tile_count(1), 2)
        self.assertEqual(tiles.tile_count(5), 32)

    def test_negative_zoom_raises(self):
        with self.assertRaises(tiles.TileError):
            tiles.tile_count(-1)


class TestTileBoundsMap(unittest.TestCase):
    def test_zoom_zero_is_the_whole_frame(self):
        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, 0, 0, 0)
        ox, oy = FRAME.origin
        self.assertAlmostEqual(minx, ox, places=6)
        self.assertAlmostEqual(miny, oy, places=6)
        self.assertAlmostEqual(maxx, ox + FRAME.extent_m, places=6)
        self.assertAlmostEqual(maxy, oy + FRAME.extent_m, places=6)

    def test_y_zero_is_the_northernmost_row(self):
        """Matches frame.py's own grid_tiles() convention (row 0 = top of
        page = max map-space y) and the standard XYZ scheme."""
        north_bounds = tiles.tile_bounds_map(FRAME, 1, 0, 0)  # (x=0, y=0)
        south_bounds = tiles.tile_bounds_map(FRAME, 1, 0, 1)  # (x=0, y=1)
        self.assertGreater(north_bounds[1], south_bounds[1])  # north's miny > south's miny

    def test_x_increases_eastward(self):
        west_bounds = tiles.tile_bounds_map(FRAME, 1, 0, 0)
        east_bounds = tiles.tile_bounds_map(FRAME, 1, 1, 0)
        self.assertGreater(east_bounds[0], west_bounds[0])

    def test_out_of_range_x_raises(self):
        with self.assertRaises(tiles.TileError):
            tiles.tile_bounds_map(FRAME, 2, 4, 0)  # zoom 2 has x in [0,3]

    def test_out_of_range_y_raises(self):
        with self.assertRaises(tiles.TileError):
            tiles.tile_bounds_map(FRAME, 2, 0, -1)

    def test_tiling_is_exhaustive_and_non_overlapping(self):
        """The property that matters most: every tile at a given zoom, laid
        side by side, covers the frame exactly -- no gaps, no overlaps.
        Checked by summing tile areas against the frame's own area, and by
        confirming adjacent tiles share an exact edge (no gap, no overlap)."""
        for z in range(0, 4):
            n = tiles.tile_count(z)
            total_area = 0.0
            for y in range(n):
                for x in range(n):
                    minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, x, y)
                    total_area += (maxx - minx) * (maxy - miny)
            self.assertAlmostEqual(total_area, FRAME.extent_m ** 2, delta=1e-3,
                                  msg=f"zoom {z}: tile areas must sum to exactly the frame's area")

    def test_adjacent_tiles_share_an_exact_edge(self):
        for z in range(1, 4):
            n = tiles.tile_count(z)
            for y in range(n):
                for x in range(n - 1):
                    _, _, maxx_left, _ = tiles.tile_bounds_map(FRAME, z, x, y)
                    minx_right, _, _, _ = tiles.tile_bounds_map(FRAME, z, x + 1, y)
                    self.assertAlmostEqual(maxx_left, minx_right, places=6,
                                          msg=f"zoom {z}: gap/overlap between x={x} and x={x+1} at y={y}")
            for x in range(n):
                for y in range(n - 1):
                    # y increases southward, so tile y's bottom (miny) must
                    # meet tile y+1's top (maxy).
                    _, miny_north, _, _ = tiles.tile_bounds_map(FRAME, z, x, y)
                    _, _, _, maxy_south = tiles.tile_bounds_map(FRAME, z, x, y + 1)
                    self.assertAlmostEqual(miny_north, maxy_south, places=6,
                                          msg=f"zoom {z}: gap/overlap between y={y} and y={y+1} at x={x}")


class TestTileForXyz(unittest.TestCase):
    def test_returns_a_real_tile_with_correct_bounds(self):
        tile = tiles.tile_for_xyz(FRAME, 2, 1, 1, px=256, supersample=2)
        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, 2, 1, 1)
        self.assertAlmostEqual(tile.origin_x, minx, places=6)
        self.assertAlmostEqual(tile.origin_y, miny, places=6)
        self.assertAlmostEqual(tile.extent_m, maxx - minx, places=6)
        self.assertEqual(tile.px_out, 256)
        self.assertEqual(tile.supersample, 2)


class TestXyzForMapPoint(unittest.TestCase):
    def test_round_trips_with_tile_bounds_map(self):
        for z in range(0, 4):
            n = tiles.tile_count(z)
            for y in range(n):
                for x in range(n):
                    minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, x, y)
                    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
                    got_x, got_y = tiles.xyz_for_map_point(FRAME, z, cx, cy)
                    self.assertEqual((got_x, got_y), (x, y), f"zoom {z}, tile ({x},{y})")

    def test_clamps_at_the_frame_edge(self):
        ox, oy = FRAME.origin
        # Exactly on the south-west corner -- a real float-precision case.
        x, y = tiles.xyz_for_map_point(FRAME, 3, ox, oy)
        self.assertEqual((x, y), (0, tiles.tile_count(3) - 1))
        # Exactly on the north-east corner.
        x, y = tiles.xyz_for_map_point(FRAME, 3, ox + FRAME.extent_m, oy + FRAME.extent_m)
        self.assertEqual((x, y), (tiles.tile_count(3) - 1, 0))

    def test_clamps_far_outside_the_frame(self):
        x, y = tiles.xyz_for_map_point(FRAME, 2, FRAME.cx + 1e9, FRAME.cy + 1e9)
        n = tiles.tile_count(2)
        self.assertEqual((x, y), (n - 1, 0))


class TestTilesOverlappingBbox(unittest.TestCase):
    def _brute_force(self, z, minx, miny, maxx, maxy):
        n = tiles.tile_count(z)
        hits = []
        for y in range(n):
            for x in range(n):
                tminx, tminy, tmaxx, tmaxy = tiles.tile_bounds_map(FRAME, z, x, y)
                if tmaxx >= minx and tminx <= maxx and tmaxy >= miny and tminy <= maxy:
                    hits.append((x, y))
        return sorted(hits)

    def test_matches_brute_force_over_several_boxes(self):
        ox, oy = FRAME.origin
        boxes = [
            (ox, oy, ox + 100, oy + 100),                              # corner
            (FRAME.cx - 50, FRAME.cy - 50, FRAME.cx + 50, FRAME.cy + 50),  # centre
            (ox, oy, ox + FRAME.extent_m, oy + FRAME.extent_m),        # whole frame
            (FRAME.cx - 5, FRAME.cy - 5, FRAME.cx + 5, FRAME.cy + 5),  # tiny, mid-tile
        ]
        for z in (1, 2, 3):
            for box in boxes:
                expected = self._brute_force(z, *box)
                got = sorted(tiles.tiles_overlapping_bbox(FRAME, z, *box))
                self.assertEqual(got, expected, f"zoom {z}, box {box}")

    def test_whole_frame_box_returns_every_tile(self):
        ox, oy = FRAME.origin
        z = 3
        n = tiles.tile_count(z)
        got = set(tiles.tiles_overlapping_bbox(FRAME, z, ox, oy, ox + FRAME.extent_m, oy + FRAME.extent_m))
        expected = {(x, y) for x in range(n) for y in range(n)}
        self.assertEqual(got, expected)

    def test_tiny_box_inside_one_tile_returns_only_that_tile(self):
        z = 3
        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, 2, 2)
        cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
        got = tiles.tiles_overlapping_bbox(FRAME, z, cx - 1, cy - 1, cx + 1, cy + 1)
        self.assertEqual(got, [(2, 2)])

    def test_a_box_exactly_matching_one_tiles_bounds_returns_only_that_tile(self):
        """Regression test for a real bug: a first implementation classified
        each of the four query-box corners into a tile via point-membership
        (xyz_for_map_point), and a query box exactly equal to one tile's own
        bounds has its far corner sit exactly on a shared edge -- which
        legitimately belongs to the NEXT tile under point-membership rules,
        pulling in a neighbour with zero real (positive-area) overlap.
        Caught by test_only_overlapping_tiles_are_deleted expecting exactly
        1 deletion and observing 2. This test isolates the same case at the
        tiles_overlapping_bbox level, away from the disk-cache machinery."""
        for z in (1, 2, 4):
            n = tiles.tile_count(z)
            # Try every tile, not just one -- corners, edges, and the
            # interior all have different neighbours to accidentally pull in.
            for y in range(n):
                for x in range(n):
                    minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, x, y)
                    got = tiles.tiles_overlapping_bbox(FRAME, z, minx, miny, maxx, maxy)
                    self.assertEqual(got, [(x, y)],
                                    f"zoom {z}, tile ({x},{y}): its own exact bounds must "
                                    f"return only itself, not a neighbour it merely touches")

    def test_empty_or_inverted_box_returns_nothing(self):
        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, 2, 1, 1)
        self.assertEqual(tiles.tiles_overlapping_bbox(FRAME, 2, maxx, miny, minx, maxy), [])  # inverted x
        self.assertEqual(tiles.tiles_overlapping_bbox(FRAME, 2, minx, maxy, maxx, miny), [])  # inverted y
        self.assertEqual(tiles.tiles_overlapping_bbox(FRAME, 2, minx, miny, minx, maxy), [])  # zero width


class TestCacheKeyParts(unittest.TestCase):
    def test_differs_when_frame_differs(self):
        other_frame = Frame(id="other", center_lon=135.3, center_lat=34.7,
                           rotation_deg=0.0, extent_m=2000.0, crs_epsg=6674)
        a = cache.cache_key(tiles.cache_key_parts(FRAME, STYLE))
        b = cache.cache_key(tiles.cache_key_parts(other_frame, STYLE))
        self.assertNotEqual(a, b)

    def test_differs_when_style_differs(self):
        a = cache.cache_key(tiles.cache_key_parts(FRAME, STYLE))
        b = cache.cache_key(tiles.cache_key_parts(FRAME, OTHER_STYLE))
        self.assertNotEqual(a, b)

    def test_same_inputs_give_the_same_key(self):
        a = cache.cache_key(tiles.cache_key_parts(FRAME, STYLE))
        b = cache.cache_key(tiles.cache_key_parts(FRAME, STYLE))
        self.assertEqual(a, b)

    def test_does_not_depend_on_world_version(self):
        """The load-bearing design choice this module's docstring argues
        for: the key must be stable across ordinary edits, or every write
        would blank the whole tile cache. There is no world_version
        parameter to this function at all -- this test exists so that if
        one is ever added, it fails loudly rather than silently changing
        the invalidation behaviour."""
        import inspect
        sig = inspect.signature(tiles.cache_key_parts)
        self.assertNotIn("world_version", sig.parameters)


class TestDiskCache(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_miss_returns_none(self):
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 1, 0, 0, px=64))

    def test_render_and_cache_produces_a_real_non_blank_png(self):
        fx = _minimal_fields()
        # z=0 covers the WHOLE frame in one tile, so the fixture's one
        # building (placed at the frame centre) is guaranteed to be inside
        # it regardless of exact tile-boundary geometry.
        path = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=0, x=0, y=0, px=64)
        self.assertTrue(os.path.exists(path))
        with Image.open(path) as img:
            self.assertEqual(img.size, (64, 64))
            arr = np.asarray(img.convert("RGB"))
        self.assertGreater(arr.std(), 0, "a real render must not be a flat colour")

    def test_cached_tile_is_found_after_render(self):
        fx = _minimal_fields()
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=0, y=0, px=64)
        found = tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 1, 0, 0, px=64)
        self.assertIsNotNone(found)

    def test_different_zxy_are_different_files(self):
        fx = _minimal_fields()
        p1 = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=0, y=0, px=64)
        p2 = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=1, y=0, px=64)
        self.assertNotEqual(p1, p2)
        self.assertTrue(os.path.exists(p1))
        self.assertTrue(os.path.exists(p2))

    def test_a_higher_resolution_request_for_the_same_tile_is_a_cache_miss_not_the_old_file(self):
        """Regression test for a real bug (2026-08-25): the cache path used
        to be keyed on (z, x, y) alone, with no px/supersample in it at
        all -- so a tile already cached at one resolution (e.g. the app's
        always-on low-res backdrop) was silently served back UNCHANGED for
        a request at any other resolution (e.g. an explicit "render at
        higher quality" action), which never actually rendered anything.
        The same (z, x, y) at two different px values must be two real,
        differently-sized, independently cached files."""
        fx = _minimal_fields()
        low_res_path = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=0, x=0, y=0, px=32)
        # A fresh get_cached_tile_path lookup at the HIGHER resolution must
        # be a miss -- the low-res file must not satisfy it.
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 0, 0, 0, px=128))
        high_res_path = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=0, x=0, y=0, px=128)
        self.assertNotEqual(low_res_path, high_res_path)
        with Image.open(low_res_path) as img:
            self.assertEqual(img.size, (32, 32))
        with Image.open(high_res_path) as img:
            self.assertEqual(img.size, (128, 128))
        # The low-res cache entry must still be intact -- rendering the
        # higher-resolution version must not have clobbered it.
        self.assertIsNotNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 0, 0, 0, px=32))

    def test_a_different_supersample_for_the_same_resolution_is_also_a_distinct_cache_entry(self):
        fx = _minimal_fields()
        p1 = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=0, x=0, y=0, px=32, supersample=1)
        self.assertIsNone(
            tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 0, 0, 0, px=32, supersample=2))
        p2 = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=0, x=0, y=0, px=32, supersample=2)
        self.assertNotEqual(p1, p2)

    def test_different_styles_use_different_cache_directories(self):
        fx = _minimal_fields()
        p1 = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=0, y=0, px=64)
        p2 = tiles.render_and_cache_tile(self.tmp, FRAME, OTHER_STYLE, fx, z=1, x=0, y=0, px=64)
        self.assertNotEqual(os.path.dirname(os.path.dirname(p1)), os.path.dirname(os.path.dirname(p2)))

    def test_manifest_written_and_matches(self):
        fx = _minimal_fields()
        path = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=0, y=0, px=64)
        key_dir = os.path.dirname(os.path.dirname(path))  # {key_dir}/{z}/{x}_{y}.png
        manifest_path = os.path.join(key_dir, "manifest.json")
        self.assertTrue(os.path.exists(manifest_path))

    def test_a_corrupted_manifest_raises_loudly_not_silently(self):
        """Simulates a hash collision or an under-specified key -- must fail
        loudly, matching cache.py's own verify-on-load discipline, never
        silently serve a tile that was cached under different config."""
        fx = _minimal_fields()
        path = tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=0, y=0, px=64)
        key_dir = os.path.dirname(os.path.dirname(path))
        manifest_path = os.path.join(key_dir, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as fh:
            fh.write('{"corrupted": true}')
        with self.assertRaises(tiles.TileError):
            tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, fx, z=1, x=1, y=1, px=64)


class TestInvalidateTilesForBbox(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.fx = _minimal_fields()

    def test_no_cache_directory_yet_returns_zero_not_an_error(self):
        n = tiles.invalidate_tiles_for_bbox(self.tmp, FRAME, STYLE, 0, 0, 10, 10,
                                           margin_m=0.0, max_zoom=2)
        self.assertEqual(n, 0)

    def test_invalidates_every_cached_resolution_of_a_tile_not_just_one(self):
        """Regression test for the same real bug as TestDiskCache's own
        resolution test, one layer up: bbox invalidation used to delete by
        one exact filename, so a tile cached at TWO resolutions (e.g. the
        low-res backdrop plus a higher-quality on-demand render) would only
        have ONE of them actually invalidated, leaving a stale file behind
        that a later request could still be served from."""
        z = 0
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=0, y=0, px=32)
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=0, y=0, px=128)

        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, 0, 0)
        deleted = tiles.invalidate_tiles_for_bbox(self.tmp, FRAME, STYLE, minx, miny, maxx, maxy,
                                                 margin_m=0.0, max_zoom=z)
        self.assertEqual(deleted, 2)
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, 0, 0, px=32))
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, 0, 0, px=128))

    def test_only_overlapping_tiles_are_deleted(self):
        z = 2
        # Render every tile at zoom 2 (a 4x4 grid).
        n_tiles = tiles.tile_count(z)
        for y in range(n_tiles):
            for x in range(n_tiles):
                tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=x, y=y, px=16)

        # Invalidate a bbox covering only tile (0,0)'s area.
        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, 0, 0)
        deleted = tiles.invalidate_tiles_for_bbox(self.tmp, FRAME, STYLE, minx, miny, maxx, maxy,
                                                 margin_m=0.0, max_zoom=z)
        self.assertEqual(deleted, 1)
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, 0, 0, px=16))
        # Every OTHER tile must still be cached.
        still_cached = sum(
            1 for y in range(n_tiles) for x in range(n_tiles)
            if (x, y) != (0, 0)
            and tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, x, y, px=16) is not None)
        self.assertEqual(still_cached, n_tiles * n_tiles - 1)

    def test_margin_expands_the_invalidated_area(self):
        z = 3
        n_tiles = tiles.tile_count(z)
        for y in range(n_tiles):
            for x in range(n_tiles):
                tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=x, y=y, px=8)

        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, 3, 3)  # a tile away from any edge
        no_margin = tiles.invalidate_tiles_for_bbox(self.tmp, FRAME, STYLE, minx, miny, maxx, maxy,
                                                    margin_m=0.0, max_zoom=z)
        # Re-render what was just deleted so the margin case starts from full again.
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=3, y=3, px=8)

        te = FRAME.extent_m / n_tiles
        with_margin = tiles.invalidate_tiles_for_bbox(self.tmp, FRAME, STYLE, minx, miny, maxx, maxy,
                                                      margin_m=te, max_zoom=z)
        self.assertGreater(with_margin, no_margin,
                          "a real margin must invalidate strictly more than zero margin")

    def test_invalidation_is_scoped_to_one_style_directory(self):
        z = 1
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=0, y=0, px=16)
        tiles.render_and_cache_tile(self.tmp, FRAME, OTHER_STYLE, self.fx, z=z, x=0, y=0, px=16)

        minx, miny, maxx, maxy = tiles.tile_bounds_map(FRAME, z, 0, 0)
        tiles.invalidate_tiles_for_bbox(self.tmp, FRAME, STYLE, minx, miny, maxx, maxy,
                                       margin_m=0.0, max_zoom=z)
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, 0, 0, px=16))
        self.assertIsNotNone(tiles.get_cached_tile_path(self.tmp, FRAME, OTHER_STYLE, z, 0, 0, px=16))


class TestInvalidateAllTiles(unittest.TestCase):
    """map-editor plan Phase 7: the deliberately blunt invalidation a
    terrain edit needs, since horizon_shadow's cast-shadow reach isn't
    bounded to the edit's own bbox -- see invalidate_all_tiles's own
    docstring."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.fx = _minimal_fields()

    def test_no_cache_directory_yet_returns_zero_not_an_error(self):
        n = tiles.invalidate_all_tiles(self.tmp, FRAME, STYLE, max_zoom=2)
        self.assertEqual(n, 0)

    def test_deletes_every_tile_at_every_zoom_level(self):
        for z in (0, 1, 2):
            n_tiles = tiles.tile_count(z)
            for y in range(n_tiles):
                for x in range(n_tiles):
                    tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=x, y=y, px=8)

        expected_total = sum(tiles.tile_count(z) ** 2 for z in (0, 1, 2))
        deleted = tiles.invalidate_all_tiles(self.tmp, FRAME, STYLE, max_zoom=2)
        self.assertEqual(deleted, expected_total)

        for z in (0, 1, 2):
            n_tiles = tiles.tile_count(z)
            for y in range(n_tiles):
                for x in range(n_tiles):
                    self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, x, y, px=8))

    def test_a_zoom_level_beyond_max_zoom_is_left_untouched(self):
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=0, x=0, y=0, px=8)
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=3, x=0, y=0, px=8)

        tiles.invalidate_all_tiles(self.tmp, FRAME, STYLE, max_zoom=0)

        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 0, 0, 0, px=8))
        self.assertIsNotNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, 3, 0, 0, px=8))

    def test_invalidation_is_scoped_to_one_style_directory(self):
        z = 1
        tiles.render_and_cache_tile(self.tmp, FRAME, STYLE, self.fx, z=z, x=0, y=0, px=16)
        tiles.render_and_cache_tile(self.tmp, FRAME, OTHER_STYLE, self.fx, z=z, x=0, y=0, px=16)

        tiles.invalidate_all_tiles(self.tmp, FRAME, STYLE, max_zoom=z)
        self.assertIsNone(tiles.get_cached_tile_path(self.tmp, FRAME, STYLE, z, 0, 0, px=16))
        self.assertIsNotNone(tiles.get_cached_tile_path(self.tmp, FRAME, OTHER_STYLE, z, 0, 0, px=16))


class TestTileRenderer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.fx = _minimal_fields()
        self.renderer = tiles.TileRenderer(self.tmp, max_workers=4)
        self.addCleanup(self.renderer.shutdown)

    def test_returns_a_real_tile_path(self):
        path = self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)
        self.assertTrue(os.path.exists(path))
        with Image.open(path) as img:
            self.assertEqual(img.size, (32, 32))

    def test_second_call_for_the_same_tile_is_a_cache_hit_not_a_rerender(self):
        """A cache hit must not even reach render_and_cache_tile -- verified
        by making the underlying render explode if called a second time."""
        path1 = self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)

        import unittest.mock as mock
        with mock.patch.object(tiles, "render_and_cache_tile",
                              side_effect=AssertionError("must not re-render a cache hit")):
            path2 = self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)
        self.assertEqual(path1, path2)

    def test_concurrent_requests_for_the_same_tile_render_exactly_once(self):
        """The dedup property: N threads asking for the identical (z,x,y)
        at the same time must trigger exactly one real render, and every
        caller must get the same resulting path."""
        import unittest.mock as mock
        real_render = tiles.render_and_cache_tile
        call_count = {"n": 0}
        release = threading.Event()

        def gated_render(*args, **kwargs):
            with lock:
                call_count["n"] += 1
            release.wait(timeout=5)  # hold every concurrent caller here until released
            return real_render(*args, **kwargs)

        lock = threading.Lock()
        results = [None] * 5
        errors = []

        def worker(i):
            try:
                results[i] = self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)
            except Exception as e:  # noqa: BLE001 -- surfaced via `errors` for the main thread to assert on
                errors.append(e)

        with mock.patch.object(tiles, "render_and_cache_tile", side_effect=gated_render):
            threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
            for t in threads:
                t.start()
            # Give the pool a moment to actually dispatch tasks before releasing --
            # the renderer's own max_workers=4 means at most 4 of the 5 threads can
            # even be inside gated_render concurrently; the 5th is queued on the
            # executor itself, which is fine -- dedup happens BEFORE submission,
            # in TileRenderer's own lock, so all 5 must still collapse to 1 call.
            import time
            time.sleep(0.2)
            release.set()
            for t in threads:
                t.join(timeout=5)

        self.assertEqual(errors, [])
        self.assertEqual(call_count["n"], 1, "5 concurrent identical requests must render exactly once")
        self.assertTrue(all(r == results[0] for r in results), "every caller must get the same path")
        self.assertIsNotNone(results[0])

    def test_different_tiles_do_not_dedup_against_each_other(self):
        import unittest.mock as mock
        real_render = tiles.render_and_cache_tile
        calls = []

        def counting_render(*args, **kwargs):
            calls.append(1)
            return real_render(*args, **kwargs)

        with mock.patch.object(tiles, "render_and_cache_tile", side_effect=counting_render):
            p1 = self.renderer.get_tile(FRAME, STYLE, self.fx, z=1, x=0, y=0, px=16)
            p2 = self.renderer.get_tile(FRAME, STYLE, self.fx, z=1, x=1, y=0, px=16)
        self.assertEqual(len(calls), 2)
        self.assertNotEqual(p1, p2)

    def test_in_flight_entry_is_cleaned_up_after_completion(self):
        self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)
        self.assertEqual(self.renderer._in_flight, {}, "no stale entries should remain after completion")

    def test_an_error_in_render_does_not_leave_a_stale_in_flight_entry(self):
        import unittest.mock as mock
        with mock.patch.object(tiles, "render_and_cache_tile", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)
        self.assertEqual(self.renderer._in_flight, {},
                        "a failed render must not permanently block future requests for the same tile")
        # And a real subsequent request must succeed normally.
        path = self.renderer.get_tile(FRAME, STYLE, self.fx, z=0, x=0, y=0, px=32)
        self.assertTrue(os.path.exists(path))


if __name__ == "__main__":
    unittest.main()
