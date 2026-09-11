"""The campaign map's reference grid, server side.

The claim: tools/gazetteer/core/grid.py agrees with
tools/gazetteer/core/grid.mjs on every case in the shared fixture. Both suites
read test/fixtures/gazetteer-grid-cases.json, so neither implementation can be
"fixed" into agreement with itself -- a disagreement fails on both sides at
once.

Why it matters beyond tidiness: the browser computes the live grid readout
under the cursor and the cell list while you draw; this module computes the
cells written into a location's record. If the two ever disagree, a building is
filed in one cell and pointed at in another, and nothing complains.

Writing this fixture by hand rather than capturing it already earned its keep:
it caught a small square being placed in column 21 when it is in fact in
column 22, in the hand-worked expectations rather than in the code.

See test/gazetteer-grid.test.mjs for the JavaScript half.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core.grid import (  # noqa: E402
    BORDER_PX, CELL_PX, GRID_COLS, GRID_ROWS, MAJOR_COLS, MAJOR_ROWS, SEPARATOR,
    GridError,
    cell_bounds_px, cell_centre_px, cell_coverage, cell_to_image_px, cell_to_ref,
    cells_touched, image_px_to_cell, image_px_to_ref, major_label,
    polygon_area_px, polygon_centroid_px, ref_to_cell, refs_touched,
)

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures",
                            "gazetteer-grid-cases.json")

with open(FIXTURE_PATH, encoding="utf-8") as fh:
    FIXTURE = json.load(fh)


class TestGeometryMatchesFixture(unittest.TestCase):
    def test_declared_geometry_is_what_this_module_implements(self):
        g = FIXTURE["geometry"]
        self.assertEqual(BORDER_PX, g["borderPx"])
        self.assertEqual(CELL_PX, g["cellPx"])
        self.assertEqual(GRID_COLS, g["gridCols"])
        self.assertEqual(GRID_ROWS, g["gridRows"])
        self.assertEqual(SEPARATOR, g["separator"])
        self.assertEqual(MAJOR_COLS, g["gridCols"] // g["cellsPerMajor"])
        self.assertEqual(MAJOR_ROWS, g["gridRows"] // g["cellsPerMajor"])


class TestPoints(unittest.TestCase):
    def test_image_px_maps_to_expected_cell_and_ref(self):
        for case in FIXTURE["pointCases"]:
            x, y = case["imagePx"]
            with self.subTest(why=case["why"]):
                self.assertEqual(list(image_px_to_cell(x, y)), case["cell"])
                self.assertEqual(image_px_to_ref(x, y), case["ref"])

    def test_outside_the_content_area_is_rejected_not_clamped(self):
        for case in FIXTURE["outOfBoundsPx"]:
            with self.subTest(why=case["why"]):
                with self.assertRaises(GridError):
                    image_px_to_cell(*case["imagePx"])

    def test_cell_corners_and_bounds_are_consistent(self):
        x, y = cell_to_image_px(21, 31)
        self.assertEqual((x, y), (200 + 21 * 200, 200 + 31 * 200))
        self.assertEqual(cell_bounds_px(21, 31), (x, y, x + CELL_PX, y + CELL_PX))
        # A cell's top-left pixel belongs to that cell; the pixel before does not.
        self.assertEqual(image_px_to_cell(x, y), (21, 31))
        self.assertEqual(image_px_to_cell(x - 1, y - 1), (20, 30))


class TestReferences(unittest.TestCase):
    def test_refs_parse_back_to_their_cell(self):
        for case in FIXTURE["refParseCases"]:
            with self.subTest(why=case["why"]):
                self.assertEqual(list(ref_to_cell(case["ref"])), case["cell"])

    def test_malformed_refs_are_rejected(self):
        for case in FIXTURE["badRefs"]:
            with self.subTest(why=case["why"]):
                with self.assertRaises(GridError):
                    ref_to_cell(case["ref"])

    def test_major_labels(self):
        for case in FIXTURE["majorLabelCases"]:
            self.assertEqual(major_label(*case["major"]), case["label"])
        with self.assertRaises(GridError):
            major_label(MAJOR_COLS, 0)
        with self.assertRaises(GridError):
            major_label(0, MAJOR_ROWS)

    def test_every_cell_round_trips(self):
        """All 3600 cells, both through the reference string and through the
        cell's own centre pixel. Exhaustive because it is cheap and because an
        off-by-one in the major/sub split would otherwise only show up in the
        one corner of the map nobody tested."""
        for row in range(GRID_ROWS):
            for col in range(GRID_COLS):
                ref = cell_to_ref(col, row)
                self.assertEqual(ref_to_cell(ref), (col, row), ref)
                cx, cy = cell_centre_px(col, row)
                self.assertEqual(image_px_to_cell(cx, cy), (col, row), ref)


class TestPolygons(unittest.TestCase):
    def test_polygons_report_the_cells_their_area_overlaps(self):
        for case in FIXTURE["polygonCases"]:
            with self.subTest(why=case["why"]):
                self.assertEqual(refs_touched(case["ring"]), case["refs"])
                if "areaPx" in case:
                    self.assertAlmostEqual(polygon_area_px(case["ring"]),
                                           case["areaPx"], places=6)
                if "centroidPx" in case:
                    cx, cy = polygon_centroid_px(case["ring"])
                    self.assertAlmostEqual(cx, case["centroidPx"][0], places=6)
                    self.assertAlmostEqual(cy, case["centroidPx"][1], places=6)

    def test_per_cell_coverage_sums_to_the_polygons_own_area(self):
        """The strongest single check on the clipper: if every cell's clipped
        area is right, the pieces must add back up to the whole. Catches a
        dropped cell and a double-counted overlap in one assertion."""
        for case in FIXTURE["polygonCases"]:
            with self.subTest(why=case["why"]):
                total = sum(a for _, _, a in cell_coverage(case["ring"]))
                self.assertAlmostEqual(total, polygon_area_px(case["ring"]), places=6)

    def test_coverage_areas_are_positive_and_never_exceed_a_cell(self):
        for case in FIXTURE["polygonCases"]:
            for col, row, area in cell_coverage(case["ring"]):
                self.assertGreater(area, 0.0, (col, row))
                self.assertLessEqual(area, CELL_PX * CELL_PX + 1e-6, (col, row))

    def test_cells_touched_is_coverage_without_the_areas(self):
        ring = FIXTURE["polygonCases"][0]["ring"]
        self.assertEqual(cells_touched(ring),
                         [(c, r) for c, r, _ in cell_coverage(ring)])

    def test_degenerate_rings_are_rejected(self):
        with self.assertRaises(GridError):
            cells_touched([(1000, 1000), (2000, 2000)])
        with self.assertRaises(GridError):
            cells_touched([(1000, 1000), (2000, 2000), (1000, 1000)])

    def test_zero_area_ring_still_yields_a_usable_centroid(self):
        line = [(1000, 1000), (2000, 1000), (1000, 1000)]
        self.assertEqual(polygon_area_px(line), 0.0)
        cx, cy = polygon_centroid_px(line)
        self.assertTrue(cx == cx and cy == cy, "must not produce NaN")

    def test_shape_overhanging_the_margin_keeps_its_in_bounds_cells(self):
        """Drawing slightly off the edge of the content area is an easy slip
        with a mouse. It must not throw away the part that IS on the map."""
        refs = refs_touched([(100, 100), (500, 100), (500, 500), (100, 500)])
        self.assertIn("A1" + SEPARATOR + "00", refs)


if __name__ == "__main__":
    unittest.main()
