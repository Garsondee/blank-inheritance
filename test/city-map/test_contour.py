"""Marching-squares contour tests: known shapes, NaN boundaries, and the
saddle-case disambiguation that is the one genuinely tricky part of this
algorithm.
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402

from citymap import contour  # noqa: E402


class TestRamp(unittest.TestCase):
    """A linear east-west ramp: contours must be straight vertical lines at
    the exact column implied by the slope."""

    def _ramp(self, size=20, rise_per_col=10.0):
        cols = np.arange(size, dtype=np.float32)
        return np.tile(cols * rise_per_col, (size, 1))

    def test_single_contour_lands_at_the_right_column(self):
        elevation = self._ramp(size=20, rise_per_col=10.0)
        segments = contour.contour_segments(elevation, level=55.0)
        self.assertGreater(len(segments), 0)
        cols = [p[0] for seg in segments for p in seg]
        # elevation = col * 10, so level 55 crosses at col = 5.5.
        self.assertTrue(all(abs(c - 5.5) < 1e-4 for c in cols))

    def test_contour_is_vertical(self):
        elevation = self._ramp()
        segments = contour.contour_segments(elevation, level=55.0)
        rows = sorted(seg[0][1] for seg in segments)
        # One segment per row band, each spanning exactly one row.
        self.assertEqual(rows, list(range(len(rows))))

    def test_no_crossing_returns_nothing(self):
        elevation = self._ramp(rise_per_col=10.0)
        # Above the whole field's range.
        self.assertEqual(contour.contour_segments(elevation, level=10000.0), [])
        self.assertEqual(contour.contour_segments(elevation, level=-10.0), [])


class TestCone(unittest.TestCase):
    """A radial cone: contours should be roughly circular and monotonically
    shrink in count/extent as level increases toward the peak."""

    def _cone(self, size=41, peak=100.0):
        c = size // 2
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
        r = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)
        return np.clip(peak - r * (peak / c), 0, None)

    def test_low_contour_encircles_high_contour(self):
        elevation = self._cone()
        low = contour.contour_segments(elevation, level=20.0)
        high = contour.contour_segments(elevation, level=80.0)
        self.assertGreater(len(low), len(high),
                           "a contour near the base must be longer than one near the peak")

    def test_forms_a_closed_ring_roughly_centred(self):
        elevation = self._cone()
        segments = contour.contour_segments(elevation, level=50.0)
        pts = [p for seg in segments for p in seg]
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        self.assertAlmostEqual(cx, 20.0, delta=1.0)
        self.assertAlmostEqual(cy, 20.0, delta=1.0)


class TestNaNBoundary(unittest.TestCase):
    def test_cells_touching_nan_produce_no_segment(self):
        # A single cell that WOULD cross level 25 (corners 0,0,50,50)...
        crossing = np.array([[0.0, 0.0], [50.0, 50.0]], dtype=np.float32)
        self.assertEqual(len(contour.contour_segments(crossing, level=25.0)), 1)
        # ...must produce nothing once any one corner is NaN.
        for r, c in ((0, 0), (0, 1), (1, 0), (1, 1)):
            with_nan = crossing.copy()
            with_nan[r, c] = np.nan
            self.assertEqual(contour.contour_segments(with_nan, level=25.0), [],
                             f"NaN at corner ({r},{c}) must suppress the crossing")

    def test_untouched_region_still_contours_normally(self):
        elevation = np.zeros((10, 10), dtype=np.float32)
        elevation[:, 5:] = 100.0
        elevation[0, 0] = np.nan  # far corner, must not affect the crossing
        segments = contour.contour_segments(elevation, level=50.0)
        self.assertGreater(len(segments), 0)


class TestSaddleDisambiguation(unittest.TestCase):
    """Cases 5 and 10: a checkerboard corner pattern has two valid
    connectivity choices, resolved by the cell-centre average vs level."""

    def test_diagonal_high_corners_produce_a_two_segment_saddle(self):
        # tl and br high, tr and bl low: a checkerboard pattern, case 5 or its
        # complement depending on level vs centre. Nudged off exact centre=50
        # (which would sit ambiguously ON the level) so centre unambiguously
        # reads above it.
        elevation = np.array([[100.0, 40.0], [40.0, 100.0]], dtype=np.float32)
        segments = contour.contour_segments(elevation, level=50.0)
        self.assertEqual(len(segments), 2, "a saddle must produce two segments (two edge pairs)")

    def test_case_5_and_case_10_are_complementary(self):
        """Swapping which diagonal is high must swap the connectivity choice."""
        high_diag_tl_br = np.array([[100.0, 40.0], [40.0, 100.0]], dtype=np.float32)
        high_diag_tr_bl = np.array([[40.0, 100.0], [100.0, 40.0]], dtype=np.float32)
        a = contour.contour_segments(high_diag_tl_br, level=50.0)
        b = contour.contour_segments(high_diag_tr_bl, level=50.0)
        self.assertEqual(len(a), 2)
        self.assertEqual(len(b), 2)
        # The two must not trace the same pair of edges -- they resolve the
        # saddle in opposite ways.
        edges_a = {frozenset((round(p[0]), round(p[1])) for p in seg) for seg in a}
        edges_b = {frozenset((round(p[0]), round(p[1])) for p in seg) for seg in b}
        self.assertNotEqual(edges_a, edges_b)

    def test_saddle_resolution_flips_with_the_centre_average(self):
        """Same corner pattern (high/low/low/high), two different levels that
        put the cell-centre average on opposite sides -- the connectivity
        choice must flip too, not just the segment count."""
        elevation = np.array([[100.0, 0.0], [0.0, 100.0]], dtype=np.float32)
        # centre = 50 always for this pattern; pick levels straddling it.
        below_centre = contour.contour_segments(elevation, level=20.0)   # centre 50 > level
        above_centre = contour.contour_segments(elevation, level=80.0)   # centre 50 < level
        self.assertEqual(len(below_centre), 2)
        self.assertEqual(len(above_centre), 2)
        edges_below = {frozenset((round(p[0]), round(p[1])) for p in seg) for seg in below_centre}
        edges_above = {frozenset((round(p[0]), round(p[1])) for p in seg) for seg in above_centre}
        self.assertNotEqual(edges_below, edges_above,
                            "the saddle must connect corners differently on either side of centre")


class TestGridToMap(unittest.TestCase):
    def test_row_zero_is_north_top_of_map(self):
        """Must match acquire.dem_grid_for_frame's row convention -- row 0 is
        the map's north edge, so upsampling needs no flip."""
        x_top, y_top = contour.grid_to_map(0, 0, origin_x=0, origin_y=0,
                                           extent_m=1000, grid_n=10)
        x_bot, y_bot = contour.grid_to_map(0, 9, origin_x=0, origin_y=0,
                                           extent_m=1000, grid_n=10)
        self.assertGreater(y_top, y_bot, "row 0 must have the larger map-y (north)")

    def test_centre_of_grid_is_centre_of_extent(self):
        x, y = contour.grid_to_map(4.5, 4.5, origin_x=0, origin_y=0,
                                   extent_m=1000, grid_n=10)
        self.assertAlmostEqual(x, 500.0, places=3)
        self.assertAlmostEqual(y, 500.0, places=3)

    def test_respects_origin_offset(self):
        x, y = contour.grid_to_map(0, 0, origin_x=1000, origin_y=2000,
                                   extent_m=1000, grid_n=10)
        self.assertAlmostEqual(x, 1050.0, places=3)
        self.assertAlmostEqual(y, 2950.0, places=3)


class TestContourLevels(unittest.TestCase):
    def test_snapped_to_interval(self):
        elevation = np.array([[3.0, 47.0]], dtype=np.float32)
        levels = contour.contour_levels(elevation, interval=10.0)
        self.assertEqual(levels, [10.0, 20.0, 30.0, 40.0])

    def test_level_zero_excluded(self):
        """Sea level is drawn from the vector sea polygon, not a contour."""
        elevation = np.array([[-15.0, 25.0]], dtype=np.float32)
        levels = contour.contour_levels(elevation, interval=10.0)
        self.assertNotIn(0.0, levels)

    def test_all_nan_gives_no_levels(self):
        elevation = np.full((5, 5), np.nan, dtype=np.float32)
        self.assertEqual(contour.contour_levels(elevation), [])

    def test_is_major_at_fifty_metre_multiples(self):
        self.assertTrue(contour.is_major(50.0))
        self.assertTrue(contour.is_major(100.0))
        self.assertTrue(contour.is_major(0.0))
        self.assertFalse(contour.is_major(40.0))
        self.assertFalse(contour.is_major(10.0))


class TestExtractContours(unittest.TestCase):
    def test_returns_one_entry_per_level_with_segments(self):
        cols = np.arange(20, dtype=np.float32)
        elevation = np.tile(cols * 5.0, (20, 1))  # 0..95
        lines = contour.extract_contours(elevation, interval=10.0)
        self.assertGreater(len(lines), 0)
        for line in lines:
            self.assertGreater(len(line.segments), 0)
            self.assertEqual(line.major, contour.is_major(line.level))

    def test_total_segment_count_matches_sum(self):
        cols = np.arange(20, dtype=np.float32)
        elevation = np.tile(cols * 5.0, (20, 1))
        lines = contour.extract_contours(elevation, interval=10.0)
        self.assertEqual(contour.total_segment_count(lines),
                         sum(len(l.segments) for l in lines))


if __name__ == "__main__":
    unittest.main()
