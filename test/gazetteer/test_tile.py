"""The tile pyramid the annotation UI pans over.

The claim worth testing is not "tiles were written" but **tile (x, y, z)
contains the image region the client will believe it contains**. The client
computes a grid reference from a pixel position it derives from the tile
scheme; if the scheme here and the transformation there disagree by even one
level, every reference is wrong by a power of two and the map still looks
perfectly fine while you pan around it.

So the central test paints a known pattern into the master and then reads
colours back out of the tiles at positions computed the way the client computes
them. That is the same round trip a person makes when they click a building.

Built on a small synthetic master rather than the real 12400 px one so the
suite stays fast and runs on a fresh clone with no artwork.
"""

import os
import shutil
import sys
import tempfile
import unittest

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

import tile as tiler  # noqa: E402

TILE = 32


def checker(w, h, block=16):
    """A master whose colour encodes position, so a tile read back can be
    checked against where it claims to come from."""
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = ((x // block * 37) % 256, (y // block * 53) % 256, 128, 255)
    return img


class TestPyramidArithmetic(unittest.TestCase):
    def test_max_zoom_is_the_first_level_at_or_finer_than_native(self):
        self.assertEqual(tiler.max_zoom_for(512, 512), 0)
        self.assertEqual(tiler.max_zoom_for(513, 512), 1)
        self.assertEqual(tiler.max_zoom_for(1024, 512), 1)
        self.assertEqual(tiler.max_zoom_for(12400, 512), 5)

    def test_the_real_map_needs_five_levels_and_one_root_tile(self):
        """12400 px at 512: z5 is 25x25 native tiles and z0 is a single tile
        covering the whole sheet."""
        mz = tiler.max_zoom_for(12400, 512)
        self.assertEqual(mz, 5)
        self.assertEqual(tiler.tiles_across(12400, 5, mz, 512), 25)
        self.assertEqual(tiler.tiles_across(12400, 0, mz, 512), 1)

    def test_edges_are_not_padded_out_to_a_power_of_two(self):
        """25 tiles across, not 32. Padding would cost a third of the pyramid
        in tiles that are entirely off the sheet."""
        mz = tiler.max_zoom_for(12400, 512)
        self.assertLess(tiler.tiles_across(12400, mz, mz, 512), 32)


class TestBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.w = cls.h = 200          # deliberately not a multiple of TILE
        cls.master = checker(cls.w, cls.h)
        cls.max_zoom, cls.count = tiler.build_pyramid(
            cls.master, cls.dir, tile=TILE, quality=95)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir, ignore_errors=True)

    def test_every_level_exists_with_the_expected_tile_count(self):
        total = 0
        for z in range(self.max_zoom + 1):
            n = tiler.tiles_across(self.w, z, self.max_zoom, TILE)
            for tx in range(n):
                for ty in range(n):
                    path = os.path.join(self.dir, str(z), str(tx), "%d.webp" % ty)
                    self.assertTrue(os.path.exists(path), path)
                    total += 1
        self.assertEqual(total, self.count)

    def test_every_tile_is_exactly_one_tile_square(self):
        """Edge tiles are padded to full size so the client never special-cases
        them."""
        for z in range(self.max_zoom + 1):
            n = tiler.tiles_across(self.w, z, self.max_zoom, TILE)
            for tx in range(n):
                for ty in range(n):
                    with Image.open(os.path.join(self.dir, str(z), str(tx),
                                                 "%d.webp" % ty)) as img:
                        self.assertEqual(img.size, (TILE, TILE))

    def test_the_root_level_is_a_single_tile_covering_everything(self):
        n = tiler.tiles_across(self.w, 0, self.max_zoom, TILE)
        self.assertEqual(n, 1)
        self.assertTrue(os.path.exists(os.path.join(self.dir, "0", "0", "0.webp")))

    def test_a_native_tile_holds_the_image_region_the_client_will_expect(self):
        """The central claim. Read a pixel out of a top-zoom tile using the
        client's own arithmetic, and check it is the colour the master has at
        that image pixel. If the level indexing were inverted, or the scale
        factor off by one power of two, this is what would catch it."""
        z = self.max_zoom
        factor = 2 ** (self.max_zoom - z)
        self.assertEqual(factor, 1, "the top level must be 1:1")
        master_px = self.master.load()
        for tx, ty, ox, oy in ((0, 0, 5, 5), (1, 2, 9, 3), (3, 3, 1, 30)):
            with Image.open(os.path.join(self.dir, str(z), str(tx),
                                         "%d.webp" % ty)) as img:
                got = img.convert("RGBA").load()[ox, oy]
            ix, iy = tx * TILE + ox, ty * TILE + oy
            if ix >= self.w or iy >= self.h:
                continue
            want = master_px[ix, iy]
            for got_c, want_c in zip(got[:3], want[:3]):
                self.assertLessEqual(abs(got_c - want_c), 6,
                                     "tile (%d,%d,z%d)+(%d,%d) should be image px (%d,%d)"
                                     % (tx, ty, z, ox, oy, ix, iy))

    def test_a_coarse_tile_covers_the_region_its_level_implies(self):
        """Same check one level down, where each tile pixel is two image
        pixels. The colour must come from the right neighbourhood, which is
        what proves the downsample is of the right crop."""
        z = self.max_zoom - 1
        factor = 2 ** (self.max_zoom - z)
        master_px = self.master.load()
        with Image.open(os.path.join(self.dir, str(z), "0", "0.webp")) as img:
            got = img.convert("RGBA").load()[10, 10]
        want = master_px[10 * factor, 10 * factor]
        for got_c, want_c in zip(got[:3], want[:3]):
            self.assertLessEqual(abs(got_c - want_c), 40,
                                 "coarse tile pixel should come from its own region")

    def test_area_past_the_edge_is_transparent_not_black(self):
        """"Off the sheet" must be visibly nothing. Black would read as painted
        map and would quietly invite someone to draw a region out there."""
        z = self.max_zoom
        n = tiler.tiles_across(self.w, z, self.max_zoom, TILE)
        last = n - 1
        with Image.open(os.path.join(self.dir, str(z), str(last),
                                     "%d.webp" % last)) as img:
            px = img.convert("RGBA").load()
            self.assertEqual(px[TILE - 1, TILE - 1][3], 0,
                             "the far corner of the last tile is past the image")

    def test_levels_are_built_from_the_master_not_from_each_other(self):
        """Chained downsampling compounds softening, and on a map that dissolves
        contour lines and hairline rules a level or two down -- exactly the zoom
        where you are trying to read the shape of a district. Checked by
        contrast surviving at the coarsest level."""
        with Image.open(os.path.join(self.dir, "0", "0", "0.webp")) as img:
            band = img.convert("RGB").getchannel("R")
            lo, hi = band.getextrema()
        self.assertGreater(hi - lo, 30,
                           "the root tile has lost almost all contrast")


class TestStaleness(unittest.TestCase):
    def test_a_changed_master_produces_a_different_hash(self):
        """How a stale pyramid is detected after a Photoshop re-export."""
        d = tempfile.mkdtemp()
        try:
            a = os.path.join(d, "a.png")
            b = os.path.join(d, "b.png")
            checker(64, 64).save(a)
            checker(64, 64, block=8).save(b)
            self.assertNotEqual(tiler.file_sha256(a), tiler.file_sha256(b))
            self.assertEqual(tiler.file_sha256(a), tiler.file_sha256(a))
        finally:
            shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
