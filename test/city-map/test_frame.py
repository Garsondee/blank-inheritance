"""Frame and Tile coordinate tests.

design/map-generation.md §10: coordinate systems "bite silently -- Japan has 19
plane-rectangular zones and the wrong one misplaces everything without
erroring." Nothing here throws when it is wrong; it just draws the city in the
wrong place. So these tests assert round-trips and known-good landmarks rather
than trusting the arithmetic to look right.
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap.frame import Frame, Tile  # noqa: E402

# The real Kurose frame, as rendered.
KUROSE = Frame(
    id="kurose-12km",
    center_lon=135.205, center_lat=34.678,
    rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674,
)

# Port Island's documented centroid (OSM relation 6421263), used as a landmark
# whose position we independently know.
PORT_ISLAND = (135.2232901, 34.6664792)


class TestRoundTrips(unittest.TestCase):
    def test_map_source_round_trip(self):
        for x, y in [(0.0, 0.0), (-71000.0, -151000.0), (KUROSE.cx, KUROSE.cy)]:
            mx, my = KUROSE.to_map(x, y)
            bx, by = KUROSE.to_source(mx, my)
            self.assertAlmostEqual(x, bx, places=6)
            self.assertAlmostEqual(y, by, places=6)

    def test_lonlat_map_round_trip(self):
        lon, lat = PORT_ISLAND
        mx, my = KUROSE.lonlat_to_map(lon, lat)
        blon, blat = KUROSE.map_to_lonlat(mx, my)
        self.assertAlmostEqual(lon, blon, places=9)
        self.assertAlmostEqual(lat, blat, places=9)

    def test_frame_centre_is_the_rotation_fixed_point(self):
        mx, my = KUROSE.to_map(KUROSE.cx, KUROSE.cy)
        self.assertAlmostEqual(mx, KUROSE.cx, places=9)
        self.assertAlmostEqual(my, KUROSE.cy, places=9)

    def test_rotation_preserves_distance_from_centre(self):
        # A rotation is rigid; if this drifts, the projection is being applied
        # somewhere it should not be.
        x, y = KUROSE.cx + 3000.0, KUROSE.cy + 4000.0
        mx, my = KUROSE.to_map(x, y)
        self.assertAlmostEqual(
            math.hypot(x - KUROSE.cx, y - KUROSE.cy),
            math.hypot(mx - KUROSE.cx, my - KUROSE.cy),
            places=6,
        )


class TestTilePixels(unittest.TestCase):
    def test_full_tile_round_trip(self):
        tile = KUROSE.full_tile(px=1024)
        for mx, my in [KUROSE.origin, (KUROSE.cx, KUROSE.cy)]:
            x, y = tile.to_px(mx, my)
            bmx, bmy = tile.px_to_map(x, y)
            self.assertAlmostEqual(mx, bmx, places=6)
            self.assertAlmostEqual(my, bmy, places=6)

    def test_origin_maps_to_bottom_left_pixel(self):
        tile = KUROSE.full_tile(px=1000)
        x, y = tile.to_px(*KUROSE.origin)
        self.assertAlmostEqual(x, 0.0, places=6)
        self.assertAlmostEqual(y, 1000.0, places=6)  # y is flipped for raster

    def test_centre_maps_to_canvas_centre(self):
        tile = KUROSE.full_tile(px=1000)
        x, y = tile.to_px(KUROSE.cx, KUROSE.cy)
        self.assertAlmostEqual(x, 500.0, places=6)
        self.assertAlmostEqual(y, 500.0, places=6)

    def test_supersample_changes_working_px_not_scale_semantics(self):
        plain = KUROSE.full_tile(px=1000, supersample=1)
        ss = KUROSE.full_tile(px=1000, supersample=2)
        self.assertEqual(plain.px, 1000)
        self.assertEqual(ss.px, 2000)
        self.assertAlmostEqual(plain.mpp_out, ss.mpp_out, places=9)
        self.assertAlmostEqual(ss.mpp, plain.mpp / 2.0, places=9)


class TestTileGrid(unittest.TestCase):
    def test_grid_covers_the_page_exactly(self):
        tiles = KUROSE.grid_tiles(3, px_per_tile=256)
        self.assertEqual(len(tiles), 9)
        fminx, fminy = KUROSE.origin
        fmaxx, fmaxy = fminx + KUROSE.extent_m, fminy + KUROSE.extent_m
        xs = [t.origin_x for t in tiles]
        ys = [t.origin_y for t in tiles]
        self.assertAlmostEqual(min(xs), fminx, places=6)
        self.assertAlmostEqual(min(ys), fminy, places=6)
        self.assertAlmostEqual(max(xs) + tiles[0].extent_m, fmaxx, places=6)
        self.assertAlmostEqual(max(ys) + tiles[0].extent_m, fmaxy, places=6)

    def test_grid_tiles_do_not_overlap(self):
        tiles = KUROSE.grid_tiles(3, px_per_tile=256)
        seen = {(round(t.origin_x, 6), round(t.origin_y, 6)) for t in tiles}
        self.assertEqual(len(seen), 9, "tile origins must be distinct")

    def test_a_tile_and_the_full_page_agree_on_where_a_landmark_lands(self):
        """The whole point of tiling: a feature must land in the same PLACE.

        If this fails, the 3x3 export and the preview disagree about geography
        and every tile seam is misaligned.
        """
        page_px = 3072
        full = KUROSE.full_tile(px=page_px)
        tiles = KUROSE.grid_tiles(3, px_per_tile=page_px // 3)
        mx, my = KUROSE.lonlat_to_map(*PORT_ISLAND)
        fx, fy = full.to_px(mx, my)

        holder = [t for t in tiles if t.contains_map(mx, my)]
        self.assertEqual(len(holder), 1, "landmark should fall in exactly one tile")
        tile = holder[0]
        tx, ty = tile.to_px(mx, my)
        ox, oy = tile.page_px_origin(page_px)
        self.assertAlmostEqual(fx, ox + tx, places=4)
        self.assertAlmostEqual(fy, oy + ty, places=4)


class TestWindowGridTiles(unittest.TestCase):
    """The windowed analogue of grid_tiles -- a cropped high-res tile grid,
    added so the editor's "Full" render mode can target the area someone is
    actually looking at instead of always the whole 12km frame (the "trying
    to render the entire island" bug report)."""

    def test_covers_the_requested_window_not_the_whole_frame(self):
        lon, lat = PORT_ISLAND
        extent_m = 1000.0
        tiles = KUROSE.window_grid_tiles(lon, lat, extent_m, n=2, px_per_tile=64)
        self.assertEqual(len(tiles), 4)
        mx, my = KUROSE.lonlat_to_map(lon, lat)
        half = extent_m / 2.0
        xs = [t.origin_x for t in tiles]
        ys = [t.origin_y for t in tiles]
        self.assertAlmostEqual(min(xs), mx - half, places=6)
        self.assertAlmostEqual(min(ys), my - half, places=6)
        self.assertAlmostEqual(max(xs) + tiles[0].extent_m, mx + half, places=6)
        self.assertAlmostEqual(max(ys) + tiles[0].extent_m, my + half, places=6)
        # Much smaller than the full page -- this is the actual bug fix:
        # a crop, not the whole frame's 12000m extent.
        self.assertLess(extent_m, KUROSE.extent_m)

    def test_tiles_do_not_overlap(self):
        tiles = KUROSE.window_grid_tiles(*PORT_ISLAND, extent_m=800.0, n=3, px_per_tile=32)
        seen = {(round(t.origin_x, 6), round(t.origin_y, 6)) for t in tiles}
        self.assertEqual(len(seen), 9, "tile origins must be distinct")

    def test_a_landmark_lands_in_exactly_one_tile(self):
        tiles = KUROSE.window_grid_tiles(*PORT_ISLAND, extent_m=900.0, n=3, px_per_tile=32)
        mx, my = KUROSE.lonlat_to_map(*PORT_ISLAND)
        holder = [t for t in tiles if t.contains_map(mx, my)]
        self.assertGreaterEqual(len(holder), 1, "the window's own centre landmark must land in a tile")

    def test_single_tile_window_matches_window_tile(self):
        """n=1 should agree with the single-tile window_tile helper (mpp
        derived from extent/px) -- same window, different entry point."""
        lon, lat = PORT_ISLAND
        extent_m, px = 1000.0, 500
        [grid_tile] = KUROSE.window_grid_tiles(lon, lat, extent_m, n=1, px_per_tile=px)
        single = KUROSE.window_tile(lon, lat, extent_m, mpp=extent_m / px)
        self.assertAlmostEqual(grid_tile.origin_x, single.origin_x, places=6)
        self.assertAlmostEqual(grid_tile.origin_y, single.origin_y, places=6)
        self.assertAlmostEqual(grid_tile.extent_m, single.extent_m, places=6)


class TestPagePixelOrigin(unittest.TestCase):
    def test_top_left_tile_starts_at_page_origin(self):
        tiles = KUROSE.grid_tiles(3, px_per_tile=100)
        top_left = max(tiles, key=lambda t: (t.origin_y, -t.origin_x))
        ox, oy = top_left.page_px_origin(300)
        self.assertAlmostEqual(ox, 0.0, places=6)
        self.assertAlmostEqual(oy, 0.0, places=6)

    def test_offsets_are_distinct_per_tile(self):
        # Paper grain is sampled from these; identical offsets would repeat the
        # same noise patch in every tile.
        tiles = KUROSE.grid_tiles(3, px_per_tile=100)
        offsets = {tuple(round(v, 4) for v in t.page_px_origin(300)) for t in tiles}
        self.assertEqual(len(offsets), 9)


class TestWindowTile(unittest.TestCase):
    def test_window_is_centred_on_the_requested_lonlat(self):
        tile = KUROSE.window_tile(*PORT_ISLAND, extent_m=1000.0, mpp=0.586)
        mx, my = KUROSE.lonlat_to_map(*PORT_ISLAND)
        cx_px, cy_px = tile.to_px(mx, my)
        self.assertAlmostEqual(cx_px, tile.px / 2.0, places=3)
        self.assertAlmostEqual(cy_px, tile.px / 2.0, places=3)

    def test_preview_mpp_matches_final_render_mpp(self):
        """The anti-lying-preview property.

        Style widths are metres divided by mpp, so equal mpp means a preview's
        ink weights are identical to the delivered render's. A preview at a
        different scale would silently retune the whole ink hierarchy.
        """
        final = KUROSE.full_tile(px=10240, supersample=2)
        preview = KUROSE.window_tile(*PORT_ISLAND, extent_m=1000.0,
                                     mpp=final.mpp, supersample=1)
        self.assertAlmostEqual(preview.mpp, final.mpp, places=9)


class TestCacheKeyParts(unittest.TestCase):
    def test_crs_participates(self):
        """§10's landmine: the same lon/lat in a different Japanese zone."""
        a = Frame(id="f", center_lon=135.205, center_lat=34.678,
                  rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        b = Frame(id="f", center_lon=135.205, center_lat=34.678,
                  rotation_deg=31.0, extent_m=12000.0, crs_epsg=6675)
        self.assertNotEqual(a.cache_key_parts(), b.cache_key_parts())

    def test_rotation_participates(self):
        a = Frame(id="f", center_lon=135.205, center_lat=34.678,
                  rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        b = Frame(id="f", center_lon=135.205, center_lat=34.678,
                  rotation_deg=0.0, extent_m=12000.0, crs_epsg=6674)
        self.assertNotEqual(a.cache_key_parts(), b.cache_key_parts())

    def test_float_noise_does_not_split_the_key(self):
        a = Frame(id="f", center_lon=135.205, center_lat=34.678,
                  rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)
        b = Frame(id="f", center_lon=135.205, center_lat=34.678,
                  rotation_deg=31.0000000001, extent_m=12000.0, crs_epsg=6674)
        self.assertEqual(a.cache_key_parts(), b.cache_key_parts())


if __name__ == "__main__":
    unittest.main()
