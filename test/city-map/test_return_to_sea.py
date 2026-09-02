"""citymap.tools.return_to_sea tests -- the explicit inverse of reclaim.py,
mirroring test_reclaim.py's own conventions closely.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import Polygon  # noqa: E402

from citymap.tools import return_to_sea  # noqa: E402

SEA = Polygon([(0, 0), (500, 0), (500, 500), (0, 500)])
LAND_OUTLINE = Polygon([(600, 600), (700, 600), (700, 700), (600, 700)])  # well outside SEA -- real "land"
CELL_M = 5.86


class TestGenerateReturnToSea(unittest.TestCase):
    def test_unions_the_outline_into_the_sea(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, cell_size_m=CELL_M)
        self.assertTrue(result.new_sea_geom.contains(LAND_OUTLINE.buffer(-0.1)))

    def test_sea_area_grows_by_roughly_the_outline_area(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, cell_size_m=CELL_M)
        self.assertAlmostEqual(result.new_sea_geom.area - SEA.area, LAND_OUTLINE.area, delta=1.0)

    def test_outline_is_preserved_exactly(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, cell_size_m=CELL_M)
        self.assertTrue(result.outline.equals_exact(LAND_OUTLINE, tolerance=1e-9))

    def test_target_elevation_is_sea_level(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, cell_size_m=CELL_M)
        self.assertEqual(result.target_elevation_m, 0.0)

    def test_default_blend_matches_reclaims_own_default(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, cell_size_m=CELL_M)
        self.assertEqual(result.blend_m, 8.0)

    def test_blend_is_overridable(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, blend_m=15.0, cell_size_m=CELL_M)
        self.assertEqual(result.blend_m, 15.0)

    def test_works_with_no_pre_existing_sea_at_all(self):
        result = return_to_sea.generate_return_to_sea(LAND_OUTLINE, None, cell_size_m=CELL_M)
        self.assertTrue(result.new_sea_geom.equals(LAND_OUTLINE))

    # --- validation ---------------------------------------------------

    def test_rejects_an_empty_outline(self):
        with self.assertRaises(return_to_sea.ReturnToSeaError):
            return_to_sea.generate_return_to_sea(Polygon(), SEA, cell_size_m=CELL_M)

    def test_rejects_non_positive_blend(self):
        with self.assertRaises(return_to_sea.ReturnToSeaError):
            return_to_sea.generate_return_to_sea(LAND_OUTLINE, SEA, blend_m=0.0, cell_size_m=CELL_M)

    def test_rejects_an_outline_too_small_to_rasterise(self):
        tiny = Polygon([(600, 600), (601, 600), (601, 601), (600, 601)])
        with self.assertRaises(return_to_sea.ReturnToSeaError) as ctx:
            return_to_sea.generate_return_to_sea(tiny, SEA, cell_size_m=CELL_M)
        self.assertIn("too small", str(ctx.exception))

    def test_rejects_an_outline_already_entirely_open_sea(self):
        already_sea = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])  # well inside SEA
        with self.assertRaises(return_to_sea.ReturnToSeaError) as ctx:
            return_to_sea.generate_return_to_sea(already_sea, SEA, cell_size_m=CELL_M)
        self.assertIn("already entirely open sea", str(ctx.exception))

    def test_an_outline_only_partially_sea_still_returns_the_dry_part(self):
        """Straddling the coastline (half already sea, half dry land) is a
        real, sensible use case, not an error -- only a FULLY sea outline
        (nothing to change) is refused."""
        straddling = Polygon([(450, 450), (550, 450), (550, 550), (450, 550)])
        result = return_to_sea.generate_return_to_sea(straddling, SEA, cell_size_m=CELL_M)
        self.assertGreater(result.new_sea_geom.area, SEA.area)


if __name__ == "__main__":
    unittest.main()
