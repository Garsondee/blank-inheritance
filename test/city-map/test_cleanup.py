"""Unit tests for citymap.tools.cleanup -- map-editor plan Phase 12's
"which pre-existing features does a new outline substantially cover" check,
pure geometry, no store/Fields access."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap.tools import cleanup  # noqa: E402


class TestContainedFraction(unittest.TestCase):
    def test_fully_inside_polygon_is_1(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        old = Polygon([(10, 10), (20, 10), (20, 20), (10, 20)])
        self.assertAlmostEqual(cleanup.contained_fraction(old, outline), 1.0)

    def test_disjoint_polygon_is_0(self):
        outline = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        old = Polygon([(1000, 1000), (1010, 1000), (1010, 1010), (1000, 1010)])
        self.assertEqual(cleanup.contained_fraction(old, outline), 0.0)

    def test_half_overlapping_polygon_is_about_half(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        old = Polygon([(50, 0), (150, 0), (150, 100), (50, 100)])  # half in, half out
        self.assertAlmostEqual(cleanup.contained_fraction(old, outline), 0.5, places=6)

    def test_threshold_boundary_exact_match_passes(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        old = Polygon([(75, 0), (175, 0), (175, 100), (75, 100)])  # exactly 25% inside
        fraction = cleanup.contained_fraction(old, outline)
        self.assertAlmostEqual(fraction, 0.25, places=6)
        self.assertTrue(cleanup.features_substantially_contained(
            [{"id": "a", "geom": old}], outline, threshold=fraction))
        self.assertFalse(cleanup.features_substantially_contained(
            [{"id": "a", "geom": old}], outline, threshold=fraction + 1e-6))

    def test_fully_inside_line_is_1_via_length_not_area(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        old = LineString([(10, 10), (90, 90)])
        self.assertAlmostEqual(cleanup.contained_fraction(old, outline), 1.0)

    def test_half_overlapping_line_is_about_half(self):
        outline = Polygon([(0, 0), (50, 0), (50, 100), (0, 100)])
        old = LineString([(0, 50), (100, 50)])  # half inside the outline, half outside
        self.assertAlmostEqual(cleanup.contained_fraction(old, outline), 0.5, places=6)

    def test_point_inside_is_1_point_outside_is_0(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        self.assertEqual(cleanup.contained_fraction(Point(50, 50), outline), 1.0)
        self.assertEqual(cleanup.contained_fraction(Point(500, 500), outline), 0.0)

    def test_degenerate_zero_area_old_geom_never_raises(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        # A degenerate (zero-area) "polygon" -- a real, if rare, case a bad
        # hand-edit or repaired geometry could produce.
        zero_area = Polygon([(10, 10), (20, 10), (10, 10)])
        self.assertEqual(cleanup.contained_fraction(zero_area, outline), 0.0)

    def test_degenerate_zero_length_line_never_raises(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        zero_length = LineString([(10, 10), (10, 10)])
        self.assertEqual(cleanup.contained_fraction(zero_length, outline), 0.0)

    def test_empty_or_none_geom_is_0(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        self.assertEqual(cleanup.contained_fraction(None, outline), 0.0)
        self.assertEqual(cleanup.contained_fraction(Polygon(), outline), 0.0)


class TestFeaturesSubstantiallyContained(unittest.TestCase):
    def test_filters_a_mixed_list_by_threshold(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        candidates = [
            {"id": "fully-inside", "geom": Polygon([(10, 10), (20, 10), (20, 20), (10, 20)])},
            {"id": "disjoint", "geom": Polygon([(1000, 1000), (1010, 1000), (1010, 1010), (1000, 1010)])},
            {"id": "barely-clips-edge", "geom": Polygon([(95, 0), (200, 0), (200, 100), (95, 100)])},
        ]
        survivors = cleanup.features_substantially_contained(candidates, outline, threshold=0.75)
        self.assertEqual([c["id"] for c in survivors], ["fully-inside"])

    def test_skips_candidates_with_no_geometry(self):
        outline = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        candidates = [{"id": "no-geom", "geom": None}, {"id": "empty-geom", "geom": Polygon()}]
        self.assertEqual(cleanup.features_substantially_contained(candidates, outline), [])


if __name__ == "__main__":
    unittest.main()
