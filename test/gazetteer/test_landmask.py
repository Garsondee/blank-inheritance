"""Reading land and water off the painted map.

The invariant everything else rests on: land and water together cover the
content area exactly, with no gap and no overlap. The region tessellation
clips its land cells to one and its water cells to the other, so if these two
do not sum to the sheet then no amount of correctness further up can produce a
gapless set of districts.

The three regressions here are all real and all cost time:

  the forest      a first version classified water as "bluer than red" alone
                  and tinted half the northern uplands as ocean. Painted
                  forest is rgb(72, 71, 76) -- blue-dominant and dark. Sea is
                  light. Brightness is the second test.

  the graticule   the sheet has a 200 m grid printed over the sea. A single
                  centre sample per block landed on a rule every eighth row
                  exactly, and a dotted line of sea classified as land all the
                  way down the sheet. A majority of nine reads per block
                  outvotes any hairline.

  the cartouche   the title block is painted over the bay in ink colours that
                  classify as land, which put three square kilometres of
                  reclaimed ground in open water and handed the tessellation
                  two districts made entirely of legend. It is declared as
                  page furniture in the manifest and forced to sea.

Synthetic images throughout, except where a test says otherwise -- the real
12400 px master is gitignored, so anything needing it skips loudly.
"""

import io
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

try:
    from PIL import Image
except ImportError:                                      # pragma: no cover
    Image = None

try:
    import landmask
    from shapely.geometry import box
except ImportError as exc:                               # pragma: no cover
    landmask = None
    _IMPORT_ERROR = exc


#: Colours measured off the real sheet, so the synthetic fixtures exercise the
#: same separation the real one does rather than a convenient one.
SEA = (180, 189, 188)
FOREST = (72, 71, 76)
CITY = (130, 112, 83)
CARTOUCHE = (215, 196, 171)
GRID_RULE = (60, 50, 40)


@unittest.skipIf(landmask is None, "shapely/landmask unavailable")
class TestMaskEncoding(unittest.TestCase):

    def test_run_length_round_trip(self):
        bits = [0] * 5 + [1] * 300 + [0] * 2 + [1]
        mask = landmask.Mask(bits, 308, 1, 25, (212.0, 212.0))
        again = landmask.Mask.from_json(mask.to_json())
        self.assertEqual(again.bits, bits)
        self.assertEqual(again.cols, 308)
        self.assertEqual(again.step, 25)
        self.assertEqual(again.origin, (212.0, 212.0))

    def test_the_encoding_is_actually_shorter_than_the_raster(self):
        bits = [1] * 230400
        self.assertLess(len(landmask.Mask(bits, 480, 480, 25, (0, 0))
                            .to_json()["runs"]), 10)

    def test_water_fraction(self):
        mask = landmask.Mask([1, 1, 0, 0], 2, 2, 25, (0, 0))
        self.assertAlmostEqual(mask.water_fraction, 0.5)


@unittest.skipIf(landmask is None or Image is None, "shapely/PIL unavailable")
class TestClassification(unittest.TestCase):
    """Every case goes through a real PNG, because the reading is the point."""

    EXTENT = (0.0, 0.0, 400.0, 400.0)

    def _write(self, paint):
        image = Image.new("RGB", (400, 400), SEA)
        paint(image)
        handle, path = tempfile.mkstemp(suffix=".png")
        os.close(handle)
        image.save(path)
        self.addCleanup(os.unlink, path)
        return path

    def _mask(self, paint, **kwargs):
        return landmask.sample(image_path=self._write(paint), step=25,
                               extent=self.EXTENT, **kwargs)

    def test_sea_is_water_and_city_is_not(self):
        def paint(image):
            for x in range(200, 400):
                for y in range(400):
                    image.putpixel((x, y), CITY)
        mask = self._mask(paint)
        self.assertEqual(mask[0, 0], 1, "open sea should read as water")
        self.assertEqual(mask[15, 8], 0, "city should read as land")

    def test_dark_forest_is_land_despite_being_bluer_than_red(self):
        # The regression. FOREST satisfies the blue-over-red test on its own.
        self.assertGreaterEqual(FOREST[2] - FOREST[0],
                                landmask.WATER_BLUE_EXCESS)

        def paint(image):
            for x in range(200, 400):
                for y in range(400):
                    image.putpixel((x, y), FOREST)
        mask = self._mask(paint)
        self.assertEqual(mask[15, 8], 0, "wooded upland is not the ocean")
        self.assertEqual(mask[0, 0], 1)

    @staticmethod
    def _paint_grid_ticks(image):
        """Dark tick dots exactly where a single centre sample would read.

        This is what the real sheet does: 1-2 px grid-tick dots printed over
        open sea on a 200 px pitch. On the master they landed on the centre
        sample of every eighth row, and a dotted line of sea classified as
        land all the way down the sheet. The rules themselves turned out to be
        innocent -- measured at y=400 in open water, the line is one pixel wide
        and still reads as water. It was always the dots.
        """
        for cy in range(12, 400, 200):
            for cx in range(12, 400, 25):
                for dx in range(2):
                    for dy in range(2):
                        image.putpixel((cx + dx, cy + dy), GRID_RULE)

    def test_a_printed_tick_dot_does_not_turn_the_sea_into_land(self):
        mask = self._mask(self._paint_grid_ticks)
        land_cells = [(c, r) for r in range(mask.rows) for c in range(mask.cols)
                      if mask[c, r] == 0]
        self.assertEqual(land_cells, [],
                         "printed grid ticks were classified as land")

    def test_one_sample_per_block_is_what_the_majority_fixes(self):
        # The same image with the majority disabled must still be fooled, or
        # this suite would keep passing after somebody reverted the fix.
        mask = self._mask(self._paint_grid_ticks, per_cell=1)
        self.assertGreater(sum(1 for b in mask.bits if b == 0), 0,
                           "single-pixel sampling should still be fooled")

    def test_page_furniture_is_forced_rather_than_read(self):
        def paint(image):
            for x in range(250, 400):
                for y in range(250, 400):
                    image.putpixel((x, y), CARTOUCHE)

        read = self._mask(paint)
        self.assertEqual(read[14, 14], 0, "the cartouche reads as land")

        forced = self._mask(paint, furniture=[(250.0, 250.0, 400.0, 400.0,
                                               "water")])
        self.assertEqual(forced[14, 14], 1, "declared furniture is sea")
        self.assertEqual(forced[0, 0], 1, "the rest of the sheet is unchanged")

    def test_furniture_can_also_declare_land(self):
        mask = self._mask(lambda image: None,
                          furniture=[(0.0, 0.0, 100.0, 100.0, "land")])
        self.assertEqual(mask[1, 1], 0)
        self.assertEqual(mask[15, 15], 1)


@unittest.skipIf(landmask is None, "shapely unavailable")
class TestPolygons(unittest.TestCase):

    EXTENT = (0.0, 0.0, 400.0, 400.0)

    def _mask_from_grid(self, rows):
        bits = [1 if ch == "~" else 0 for row in rows for ch in row]
        return landmask.Mask(bits, len(rows[0]), len(rows), 25, (12.5, 12.5))

    def test_land_and_water_sum_to_the_sheet_exactly(self):
        # The invariant the whole tessellation stands on.
        rows = ["~" * 8 + "." * 8] * 8 + ["." * 16] * 8
        land, water = landmask.to_polygons(
            self._mask_from_grid(rows), extent=self.EXTENT,
            min_feature_m2=0, simplify_m=0)
        sheet = box(*self.EXTENT)
        self.assertAlmostEqual(land.area + water.area, sheet.area, places=6)
        self.assertAlmostEqual(land.intersection(water).area, 0.0, places=6)

    def test_the_two_are_complements_not_two_independent_rasters(self):
        rows = ["~.~.~.~.~.~.~.~."] * 16
        land, water = landmask.to_polygons(
            self._mask_from_grid(rows), extent=self.EXTENT,
            min_feature_m2=0, simplify_m=0)
        sheet = box(*self.EXTENT)
        self.assertTrue(sheet.difference(land.union(water)).area < 1e-6)

    def test_a_speck_of_water_smaller_than_the_threshold_is_dropped(self):
        rows = ["." * 16] * 16
        rows[8] = "." * 8 + "~" + "." * 7
        mask = self._mask_from_grid(rows)
        land, water = landmask.to_polygons(
            mask, extent=self.EXTENT, min_feature_m2=10000, simplify_m=0)
        self.assertTrue(water.is_empty or water.area < 1e-6)
        self.assertAlmostEqual(land.area, box(*self.EXTENT).area, places=6)

    def test_a_real_body_of_water_survives_the_threshold(self):
        rows = ["." * 16] * 16
        for r in range(4, 12):
            rows[r] = "." * 4 + "~" * 8 + "." * 4
        land, water = landmask.to_polygons(
            self._mask_from_grid(rows), extent=self.EXTENT,
            min_feature_m2=10000, simplify_m=0)
        self.assertGreater(water.area, 0)
        self.assertAlmostEqual(land.area + water.area,
                               box(*self.EXTENT).area, places=6)

    def test_an_island_survives_as_a_hole_in_the_water(self):
        rows = ["~" * 16] * 16
        for r in range(6, 10):
            rows[r] = "~" * 6 + "." * 4 + "~" * 6
        land, water = landmask.to_polygons(
            self._mask_from_grid(rows), extent=self.EXTENT,
            min_feature_m2=100, simplify_m=0)
        self.assertGreater(land.area, 0)
        parts = list(getattr(water, "geoms", [water]))
        self.assertEqual(sum(len(p.interiors) for p in parts), 1,
                         "the island should punch one hole in the sea")


@unittest.skipIf(landmask is None, "shapely unavailable")
class TestManifestFurniture(unittest.TestCase):

    def test_the_cartouche_is_declared_in_the_manifest(self):
        # Not a style check: if this entry goes missing the bay grows three
        # square kilometres of land and nothing else fails.
        declared = landmask.furniture_from_manifest()
        self.assertTrue(declared, "no page furniture declared")
        self.assertTrue(any(ground == "water" for *_r, ground in declared))
        for x0, y0, x1, y1, ground in declared:
            self.assertLess(x0, x1)
            self.assertLess(y0, y1)
            self.assertIn(ground, ("land", "water"))

    def test_a_missing_manifest_is_not_fatal(self):
        self.assertEqual(
            landmask.furniture_from_manifest("no-such-file.json"), [])

    def test_a_malformed_entry_is_skipped_rather_than_crashing(self):
        handle, path = tempfile.mkstemp(suffix=".json")
        os.close(handle)
        self.addCleanup(os.unlink, path)
        with io.open(path, "w", encoding="utf-8") as fh:
            json.dump({"pageFurniture": [{"id": "bad"},
                                         {"id": "ok", "rect": [0, 0, 10, 10]}]},
                      fh)
        got = landmask.furniture_from_manifest(path)
        self.assertEqual(len(got), 1)
        self.assertEqual(got[0][4], "water", "ground defaults to sea")


@unittest.skipIf(landmask is None, "shapely unavailable")
class TestAgainstTheRealSheet(unittest.TestCase):
    """Skips loudly when the gitignored master is absent."""

    def setUp(self):
        if not os.path.exists(landmask.DEFAULT_CACHE):
            self.skipTest("no cached mask -- run tools/gazetteer/landmask.py")
        self.mask, self.land, self.water = landmask.load()

    def test_the_real_sheet_sums_exactly(self):
        sheet = box(*landmask.DEFAULT_EXTENT)
        self.assertAlmostEqual(self.land.area + self.water.area, sheet.area,
                               places=3)
        self.assertLess(self.land.intersection(self.water).area, 1.0)

    def test_the_split_is_plausible_for_a_harbour_city(self):
        # A wide band, not a tight assertion: this catches the failure modes
        # that have actually happened (half the uplands read as ocean at 50%,
        # the whole sheet read as land at 0%), without breaking every time a
        # quay is repainted.
        fraction = self.water.area / (self.land.area + self.water.area)
        self.assertGreater(fraction, 0.25, "suspiciously little water")
        self.assertLess(fraction, 0.55, "suspiciously much water")

    def test_the_cartouche_corner_is_sea(self):
        from shapely.geometry import Point
        self.assertTrue(self.water.contains(Point(11000, 11600)),
                        "the legend block is being read as land again")


if __name__ == "__main__":
    unittest.main()
