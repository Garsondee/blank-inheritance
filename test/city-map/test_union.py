"""Unit tests for citymap.tools.union -- map-editor plan Phase 14's
union-only boolean op. Pure geometry, no store/Fields access."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap.tools import union  # noqa: E402


class TestDeriveUnionGroupId(unittest.TestCase):
    def test_order_independent(self):
        self.assertEqual(union.derive_union_group_id(["a", "b"]), union.derive_union_group_id(["b", "a"]))

    def test_different_sets_produce_different_ids(self):
        self.assertNotEqual(union.derive_union_group_id(["a", "b"]), union.derive_union_group_id(["a", "c"]))

    def test_deterministic(self):
        self.assertEqual(union.derive_union_group_id(["x", "y", "z"]), union.derive_union_group_id(["z", "y", "x"]))


class TestGenerateUnion(unittest.TestCase):
    def test_overlapping_inputs_merge_into_a_single_polygon(self):
        a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        b = Polygon([(5, 5), (15, 5), (15, 15), (5, 15)])
        result = union.generate_union([a, b])
        self.assertEqual(result.geometry.geom_type, "Polygon")
        self.assertFalse(result.became_multi)
        # The merged area is less than the sum of both (real overlap removed),
        # but bigger than either alone.
        self.assertLess(result.geometry.area, a.area + b.area)
        self.assertGreater(result.geometry.area, a.area)

    def test_disjoint_inputs_become_a_real_multipolygon(self):
        a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        b = Polygon([(1000, 1000), (1010, 1000), (1010, 1010), (1000, 1010)])
        result = union.generate_union([a, b])
        self.assertEqual(result.geometry.geom_type, "MultiPolygon")
        self.assertTrue(result.became_multi)
        self.assertAlmostEqual(result.geometry.area, a.area + b.area, places=6)

    def test_touching_but_not_overlapping_inputs_merge_into_one_polygon(self):
        a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        b = Polygon([(10, 0), (20, 0), (20, 10), (10, 10)])  # shares the (10,0)-(10,10) edge
        result = union.generate_union([a, b])
        self.assertEqual(result.geometry.geom_type, "Polygon")
        self.assertFalse(result.became_multi)

    def test_three_overlapping_inputs_merge_into_one(self):
        a = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        b = Polygon([(5, 5), (15, 5), (15, 15), (5, 15)])
        c = Polygon([(8, 8), (18, 8), (18, 18), (8, 18)])
        result = union.generate_union([a, b, c])
        self.assertEqual(result.geometry.geom_type, "Polygon")

    def test_zero_inputs_raises(self):
        with self.assertRaises(union.UnionError):
            union.generate_union([])

    def test_one_input_raises(self):
        with self.assertRaises(union.UnionError):
            union.generate_union([Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])])

    def test_one_real_geometry_plus_an_empty_one_still_raises(self):
        # 2 inputs structurally, but only 1 survives filtering -- a silent
        # one-geometry "merge" would be a confusing no-op dressed up as a
        # real union, so this must still raise, not quietly succeed.
        real = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        with self.assertRaises(union.UnionError):
            union.generate_union([real, Polygon()])

    def test_all_empty_inputs_raises(self):
        with self.assertRaises(union.UnionError):
            union.generate_union([Polygon(), Polygon()])

    def test_mixing_a_polygon_and_a_line_raises_instead_of_producing_a_geometrycollection(self):
        """REGRESSION: found live during map-editor plan Phase 14's own
        marquee-select verification -- a real drag that swept up both
        buildings AND roads produced a shapely GeometryCollection, a real
        feature kind this stack has no rendering/editing story for at all.
        Must be refused loudly, not silently created."""
        polygon = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        line = LineString([(20, 20), (30, 30)])
        with self.assertRaises(union.UnionError):
            union.generate_union([polygon, line])

    def test_mixing_a_polygon_and_a_point_raises(self):
        polygon = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        point = Point(50, 50)
        with self.assertRaises(union.UnionError):
            union.generate_union([polygon, point])

    def test_two_lines_merge_normally_no_kind_mismatch(self):
        a = LineString([(0, 0), (10, 0)])
        b = LineString([(10, 0), (20, 0)])
        result = union.generate_union([a, b])
        self.assertIn(result.geometry.geom_type, ("LineString", "MultiLineString"))


if __name__ == "__main__":
    unittest.main()
