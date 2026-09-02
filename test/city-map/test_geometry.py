"""citymap.geometry tests. The offset_line/offset_both_sides section
(map-editor plan Phase 5's ghost lines) is the only part covered here so
far -- iter_polygons/iter_rings/shadow_sweep/has_holes predate this file
and are exercised indirectly via draw.py/render.py's own test suites; a
real, standing gap (no direct test for them) that isn't this phase's to
close, but is worth a future pass.

Every offset case here was reproduced directly against a real shapely call
before being pinned as a test (see citymap/geometry.py's own comment on
the offset section) -- these are not hypothetical edge cases, they're
shapely's ACTUAL observed behaviour for specific real input shapes.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString  # noqa: E402

from citymap import geometry  # noqa: E402


class TestOffsetLine(unittest.TestCase):
    def test_a_straight_line_offsets_to_a_single_parallel_line(self):
        line = LineString([(0, 0), (100, 0)])
        parts = geometry.offset_line(line, 5.0)
        self.assertEqual(len(parts), 1)
        # A straight horizontal line offset left (positive) by 5 in
        # shapely's own convention shifts +y.
        self.assertTrue(parts[0].equals_exact(LineString([(0, 5), (100, 5)]), tolerance=1e-6))

    def test_offset_distance_is_real_ground_metres_within_tolerance(self):
        """The whole point of computing this server-side in SOURCE CRS --
        confirms the offset line really does sit distance_m away from the
        original, not some CRS-distorted approximation."""
        line = LineString([(1000, 1000), (1000, 1100)])
        parts = geometry.offset_line(line, 12.5)
        self.assertEqual(len(parts), 1)
        # Perpendicular distance from the original line to the offset line's
        # own midpoint.
        offset_midpoint = parts[0].interpolate(0.5, normalized=True)
        self.assertAlmostEqual(line.distance(offset_midpoint), 12.5, places=3)

    def test_negative_distance_offsets_to_the_opposite_side(self):
        line = LineString([(0, 0), (100, 0)])
        left = geometry.offset_line(line, 5.0)[0]
        right = geometry.offset_line(line, -5.0)[0]
        self.assertGreater(left.centroid.y, 0)
        self.assertLess(right.centroid.y, 0)

    def test_a_self_crossing_line_can_split_into_multiple_real_parts_none_dropped(self):
        """REGRESSION: a first, simpler implementation could plausibly have
        just returned geom.geoms[0] for a MultiLineString result -- this
        pins the actual, real case (a figure-8-shaped line) and requires
        every part to survive, not just the first."""
        figure8 = LineString([(0, 0), (10, 10), (0, 10), (10, 0)])
        parts = geometry.offset_line(figure8, 2.0)
        self.assertEqual(len(parts), 3)
        for part in parts:
            self.assertIsInstance(part, LineString)
            self.assertFalse(part.is_empty)

    def test_a_geometrically_impossible_offset_returns_an_empty_list_not_a_degenerate_line(self):
        """A hairpin turn offset toward its own inside, past where the two
        arms would need to overlap, is shapely's own documented "this
        offset doesn't exist" case (returns an empty LineString) -- must
        become an empty LIST, never a length-1 list holding a zero-length
        or otherwise degenerate geometry."""
        hairpin = LineString([(0, 0), (0, 20), (3, 20), (3, 0)])
        parts = geometry.offset_line(hairpin, -5.0)
        self.assertEqual(parts, [])


class TestOffsetBothSides(unittest.TestCase):
    def test_returns_left_and_right_at_the_same_distance(self):
        line = LineString([(0, 0), (100, 0)])
        result = geometry.offset_both_sides(line, 8.0)
        self.assertEqual(set(result.keys()), {"left", "right"})
        self.assertEqual(len(result["left"]), 1)
        self.assertEqual(len(result["right"]), 1)
        self.assertGreater(result["left"][0].centroid.y, 0)
        self.assertLess(result["right"][0].centroid.y, 0)

    def test_rejects_a_non_positive_distance(self):
        line = LineString([(0, 0), (100, 0)])
        with self.assertRaises(geometry.GeometryError):
            geometry.offset_both_sides(line, 0.0)
        with self.assertRaises(geometry.GeometryError):
            geometry.offset_both_sides(line, -5.0)

    def test_one_side_can_be_empty_while_the_other_is_real(self):
        """A hairpin whose OUTSIDE offset is real but whose INSIDE offset
        (at the same distance) is geometrically impossible -- both sides
        must be reported independently and honestly, not both dropped just
        because one of them failed. Confirmed directly which side is which
        for this specific shape before pinning it (see offset_line's own
        hairpin regression test) -- not assumed from the "left"/"right"
        labels alone."""
        hairpin = LineString([(0, 0), (0, 20), (3, 20), (3, 0)])
        result = geometry.offset_both_sides(hairpin, 5.0)
        self.assertGreater(len(result["left"]), 0)
        self.assertEqual(result["right"], [])


if __name__ == "__main__":
    unittest.main()
