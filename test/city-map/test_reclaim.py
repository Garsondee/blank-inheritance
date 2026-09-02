"""citymap.tools.reclaim tests -- map-editor plan Phase 10.

generate_reclaim is pure geometry (no store, no Fields) -- the current sea
geometry is passed in directly, same convention array_place.py established
for anything genuinely needing external state, just here it's a plain
argument rather than a Fields object since reclaim needs nothing else.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import Polygon  # noqa: E402

from citymap.tools import reclaim  # noqa: E402

SEA = Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)])
CELL_M = 5.86  # matches test_terrace.py's own stated real value


class TestGenerateReclaim(unittest.TestCase):
    def test_carves_the_outline_out_of_the_sea(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        result = reclaim.generate_reclaim(outline, SEA, cell_size_m=CELL_M)
        self.assertFalse(result.new_sea_geom.intersects(outline.buffer(-0.1)))

    def test_sea_area_shrinks_by_roughly_the_outline_area(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        result = reclaim.generate_reclaim(outline, SEA, cell_size_m=CELL_M)
        self.assertAlmostEqual(SEA.area - result.new_sea_geom.area, outline.area, delta=1.0)

    def test_land_polygon_is_the_exact_drawn_outline(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        result = reclaim.generate_reclaim(outline, SEA, cell_size_m=CELL_M)
        self.assertTrue(result.land_polygon.equals_exact(outline, tolerance=1e-9))

    def test_default_freeboard_and_blend_match_construct_pys_own_constants(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        result = reclaim.generate_reclaim(outline, SEA, cell_size_m=CELL_M)
        self.assertEqual(result.target_elevation_m, 4.0)
        self.assertEqual(result.blend_m, 8.0)

    def test_freeboard_and_blend_are_overridable(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        result = reclaim.generate_reclaim(outline, SEA, freeboard_m=6.5, blend_m=12.0, cell_size_m=CELL_M)
        self.assertEqual(result.target_elevation_m, 6.5)
        self.assertEqual(result.blend_m, 12.0)

    def test_negative_freeboard_is_allowed_no_positivity_check(self):
        """Matches terrace.py's own base_elevation_m -- no sign requirement,
        a real (if unusual) tidal-flat use case is not this tool's business
        to forbid."""
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        result = reclaim.generate_reclaim(outline, SEA, freeboard_m=-1.0, cell_size_m=CELL_M)
        self.assertEqual(result.target_elevation_m, -1.0)

    # --- validation ---------------------------------------------------

    def test_rejects_an_empty_outline(self):
        with self.assertRaises(reclaim.ReclaimError):
            reclaim.generate_reclaim(Polygon(), SEA, cell_size_m=CELL_M)

    def test_rejects_non_positive_blend(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        with self.assertRaises(reclaim.ReclaimError):
            reclaim.generate_reclaim(outline, SEA, blend_m=0.0, cell_size_m=CELL_M)

    def test_rejects_an_outline_too_small_to_rasterise(self):
        tiny = Polygon([(100, 100), (101, 100), (101, 101), (100, 101)])  # 1sq m, well under the floor
        with self.assertRaises(reclaim.ReclaimError) as ctx:
            reclaim.generate_reclaim(tiny, SEA, cell_size_m=CELL_M)
        self.assertIn("too small", str(ctx.exception))

    def test_rejects_an_outline_that_does_not_overlap_the_sea(self):
        dry_land_elsewhere = Polygon([(2000, 2000), (2100, 2000), (2100, 2100), (2000, 2100)])
        with self.assertRaises(reclaim.ReclaimError) as ctx:
            reclaim.generate_reclaim(dry_land_elsewhere, SEA, cell_size_m=CELL_M)
        self.assertIn("does not overlap the sea", str(ctx.exception))

    def test_rejects_when_there_is_no_sea_at_all(self):
        outline = Polygon([(100, 100), (200, 100), (200, 200), (100, 200)])
        with self.assertRaises(reclaim.ReclaimError):
            reclaim.generate_reclaim(outline, None, cell_size_m=CELL_M)

    def test_an_outline_only_partially_overlapping_the_sea_still_reclaims_the_overlap(self):
        """A reclaim drawn straddling the coastline (half on existing dry
        land, half in the sea) is a real, sensible use case -- extending a
        peninsula, say -- not an error. Only ZERO overlap is refused."""
        straddling = Polygon([(950, 400), (1050, 400), (1050, 500), (950, 500)])  # half outside SEA's own bounds
        result = reclaim.generate_reclaim(straddling, SEA, cell_size_m=CELL_M)
        self.assertLess(result.new_sea_geom.area, SEA.area)


if __name__ == "__main__":
    unittest.main()
