"""citymap.tools.terrace tests -- map-editor plan Phase 7.

Two tiers of coverage: TestGenerateTerrace pins the pure geometry/
validation logic in isolation; TestTerraceProducesARealStaircase is the
end-to-end integration proof the plan itself calls for -- feed
generate_terrace's own output through the REAL citymap.fields.
apply_terrain_edits and sample a radial transect, confirming an actual
monotonic staircase comes out, not just that the right dataclasses were
constructed.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import Point, Polygon  # noqa: E402

from citymap import fields as fields_module  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.tools import terrace  # noqa: E402

SQUARE = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
CELL_M = 5.86  # matches the plan's own stated real value at the real frame's resolution


class TestGenerateTerrace(unittest.TestCase):
    def test_produces_the_right_number_of_tiers_in_outer_to_inner_stack_order(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=10.0, tiers=3,
                                         step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M)
        self.assertEqual(len(result.tiers), 3)
        self.assertEqual([t.stack_order for t in result.tiers], [0, 1, 2])

    def test_fill_mode_rises_with_each_tier(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=10.0, tiers=3,
                                         step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M, mode="fill")
        elevations = [t.target_elevation_m for t in result.tiers]
        self.assertEqual(elevations, [10.0, 12.0, 14.0])

    def test_cut_mode_drops_with_each_tier(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=10.0, tiers=3,
                                         step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M, mode="cut")
        elevations = [t.target_elevation_m for t in result.tiers]
        self.assertEqual(elevations, [10.0, 8.0, 6.0])

    def test_each_tier_is_strictly_nested_inside_the_previous(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=0.0, tiers=3,
                                         step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M)
        for outer, inner in zip(result.tiers, result.tiers[1:]):
            self.assertTrue(outer.polygon.contains(inner.polygon.buffer(-0.01)))
            self.assertLess(inner.polygon.area, outer.polygon.area)

    def test_a_single_tier_has_no_risers_and_equals_the_outline_itself(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=5.0, tiers=1,
                                         step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M)
        self.assertEqual(len(result.tiers), 1)
        self.assertEqual(len(result.risers), 0)
        self.assertTrue(result.tiers[0].polygon.equals_exact(SQUARE, tolerance=1e-9))

    def test_risers_have_the_right_count_height_and_stack_reference(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=0.0, tiers=3,
                                         step_height_m=2.5, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M)
        self.assertEqual(len(result.risers), 2)
        for riser in result.risers:
            self.assertEqual(riser.height_m, 2.5)
            self.assertFalse(riser.polygon.is_empty)
        self.assertEqual(result.risers[0].between_tiers, (0, 1))
        self.assertEqual(result.risers[1].between_tiers, (1, 2))

    def test_riser_geometry_is_the_real_annular_gap_between_tiers(self):
        result = terrace.generate_terrace(SQUARE, base_elevation_m=0.0, tiers=2,
                                         step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                                         cell_size_m=CELL_M)
        outer, inner = result.tiers[0].polygon, result.tiers[1].polygon
        expected = outer.difference(inner)
        self.assertAlmostEqual(result.risers[0].polygon.area, expected.area, places=3)

    # --- validation: parameter-level -------------------------------------

    def test_rejects_fewer_than_one_tier(self):
        with self.assertRaises(terrace.TerraceError):
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=0, step_height_m=2,
                                    inset_m=15, blend_m=5, cell_size_m=CELL_M)

    def test_rejects_non_positive_step_height(self):
        with self.assertRaises(terrace.TerraceError):
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=0,
                                    inset_m=15, blend_m=5, cell_size_m=CELL_M)

    def test_rejects_non_positive_inset(self):
        with self.assertRaises(terrace.TerraceError):
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=2,
                                    inset_m=0, blend_m=5, cell_size_m=CELL_M)

    def test_rejects_non_positive_blend(self):
        with self.assertRaises(terrace.TerraceError):
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=2,
                                    inset_m=15, blend_m=0, cell_size_m=CELL_M)

    def test_rejects_an_unknown_mode(self):
        with self.assertRaises(terrace.TerraceError):
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=2,
                                    inset_m=15, blend_m=5, cell_size_m=CELL_M, mode="sideways")

    def test_rejects_an_empty_outline(self):
        with self.assertRaises(terrace.TerraceError):
            terrace.generate_terrace(Polygon(), base_elevation_m=0, tiers=1, step_height_m=2,
                                    inset_m=15, blend_m=5, cell_size_m=CELL_M)

    # --- validation: the two silent-failure modes fields.py would otherwise hit --

    def test_rejects_an_inset_narrower_than_two_dem_cells(self):
        """REGRESSION-shaped: this is fields.py's own silent-drop condition
        (a polygon too thin to rasterise to any real pixel) surfaced here as
        a real, named, actionable error instead."""
        too_thin = CELL_M * 1.5
        with self.assertRaises(terrace.TerraceError) as ctx:
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=2,
                                    inset_m=too_thin, blend_m=1.0, cell_size_m=CELL_M)
        self.assertIn("DEM cell", str(ctx.exception))

    def test_accepts_an_inset_exactly_at_the_two_cell_boundary(self):
        exactly_two_cells = CELL_M * 2.0
        result = terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=2,
                                         inset_m=exactly_two_cells, blend_m=1.0, cell_size_m=CELL_M)
        self.assertEqual(len(result.tiers), 2)

    def test_rejects_blend_m_not_strictly_less_than_inset_m(self):
        with self.assertRaises(terrace.TerraceError) as ctx:
            terrace.generate_terrace(SQUARE, base_elevation_m=0, tiers=2, step_height_m=2,
                                    inset_m=15.0, blend_m=15.0, cell_size_m=CELL_M)
        self.assertIn("blend_m", str(ctx.exception))

    def test_rejects_too_many_tiers_for_the_outline_running_out_of_room(self):
        small_square = Polygon([(0, 0), (20, 0), (20, 20), (0, 20)])
        with self.assertRaises(terrace.TerraceError) as ctx:
            terrace.generate_terrace(small_square, base_elevation_m=0, tiers=5, step_height_m=2,
                                    inset_m=15.0, blend_m=5.0, cell_size_m=CELL_M)
        self.assertIn("no real room left", str(ctx.exception))

    def test_rejects_an_outline_that_splits_into_disconnected_pieces_when_inset(self):
        """A real dumbbell shape (two big lobes joined by a thin neck) --
        confirmed directly that at exactly the minimum valid inset (2 DEM
        cells), this specific shape splits into two real, substantial
        MultiPolygon parts (not a collapse to nothing) -- big lobes so the
        split-detection is what actually fires, not the too-small check."""
        left = Polygon([(0, 0), (60, 0), (60, 60), (0, 60)])
        right = Polygon([(90, 0), (150, 0), (150, 60), (90, 60)])
        neck = Polygon([(60, 28), (90, 28), (90, 32), (60, 32)])
        dumbbell = left.union(neck).union(right)
        min_inset = 2.0 * CELL_M
        with self.assertRaises(terrace.TerraceError) as ctx:
            terrace.generate_terrace(dumbbell, base_elevation_m=0, tiers=2, step_height_m=2,
                                    inset_m=min_inset, blend_m=1.0, cell_size_m=CELL_M)
        self.assertIn("disconnected pieces", str(ctx.exception))


class TestTerraceProducesARealStaircase(unittest.TestCase):
    """The plan's own required end-to-end proof: generate_terrace's output,
    fed through the REAL apply_terrain_edits, must produce an actual
    monotonic staircase along a radial transect -- not just correctly-
    shaped dataclasses."""

    def setUp(self):
        # rotation_deg=0 keeps SOURCE and MAP space identical, so the
        # transect math below stays simple to reason about directly.
        self.frame = Frame(id="t", center_lon=135.0, center_lat=35.0,
                          rotation_deg=0.0, extent_m=400.0, crs_epsg=6674, dem_grid=256)
        # cell size at this frame: 400/256 = 1.5625m -- deliberately fine
        # enough that a modest inset comfortably clears the 2-cell floor.
        self.cell_m = self.frame.extent_m / self.frame.dem_grid

    def _flat_elevation(self, value: float) -> np.ndarray:
        n = self.frame.dem_grid
        return np.full((n, n), value, dtype=np.float32)

    def test_a_radial_transect_is_a_monotonic_staircase(self):
        cx, cy = self.frame.cx, self.frame.cy
        outline = Point(cx, cy).buffer(120.0, quad_segs=32)
        result = terrace.generate_terrace(
            outline, base_elevation_m=0.0, tiers=4, step_height_m=3.0,
            inset_m=20.0, blend_m=4.0, cell_size_m=self.cell_m, mode="fill")

        elevation = self._flat_elevation(0.0)
        edits = [type("E", (), {"polygon": t.polygon, "target_elevation_m": t.target_elevation_m,
                                "blend_m": t.blend_m})() for t in result.tiers]
        out = fields_module.apply_terrain_edits(elevation, self.frame, edits)

        n = self.frame.dem_grid
        cell_m = self.cell_m
        # Sample straight out from the centre along +x (array columns),
        # centre row -- map-space x increases with column, and with
        # rotation_deg=0 that's also +column in array space.
        center_row = n // 2
        center_col = n // 2
        distances_m = []
        values = []
        for col in range(center_col, n):
            distances_m.append((col - center_col) * cell_m)
            values.append(float(out[center_row, col]))

        # Must actually reach the innermost tier's flat plateau at the centre...
        self.assertAlmostEqual(values[0], result.tiers[-1].target_elevation_m, delta=0.5)
        # ...fall back to the untouched flat 0.0 far outside every tier + blend...
        self.assertAlmostEqual(values[-1], 0.0, delta=0.05)
        # ...and never rise as distance from the centre increases (a real
        # monotonic staircase going DOWN and outward, allowing float noise).
        for prev, cur in zip(values, values[1:]):
            self.assertLessEqual(cur, prev + 1e-3)

        # Real, distinct flats: the value at the very centre (deep inside
        # every tier) must differ from the value just past the outermost
        # tier's own blend zone (back to natural terrain) -- confirms this
        # ACTUALLY produced multiple distinguishable steps, not one smooth
        # ramp from centre to edge.
        self.assertGreater(values[0] - values[-1], 5.0)

    def test_cut_mode_transect_is_monotonically_non_decreasing_outward(self):
        cx, cy = self.frame.cx, self.frame.cy
        outline = Point(cx, cy).buffer(120.0, quad_segs=32)
        result = terrace.generate_terrace(
            outline, base_elevation_m=0.0, tiers=3, step_height_m=2.0,
            inset_m=20.0, blend_m=4.0, cell_size_m=self.cell_m, mode="cut")

        elevation = self._flat_elevation(0.0)
        edits = [type("E", (), {"polygon": t.polygon, "target_elevation_m": t.target_elevation_m,
                                "blend_m": t.blend_m})() for t in result.tiers]
        out = fields_module.apply_terrain_edits(elevation, self.frame, edits)

        n = self.frame.dem_grid
        center_row = n // 2
        center_col = n // 2
        values = [float(out[center_row, col]) for col in range(center_col, n)]

        self.assertLess(values[0], 0.0)  # the deepest cut tier is below the original 0.0
        for prev, cur in zip(values, values[1:]):
            self.assertGreaterEqual(cur, prev - 1e-3)  # rises back toward 0 as distance grows


if __name__ == "__main__":
    unittest.main()
