"""rivers.py tests: Shreve stream magnitude and the width curve built on it.

The property this whole module exists to guarantee: an unbranched headwater
stays thin, and width only grows where two or more branches actually merge
-- never on a simple pass-through node, never without a real confluence.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.parse import Feature  # noqa: E402
from citymap.rivers import (  # noqa: E402
    compute_stream_magnitudes, river_widths_m, source_feature_ids, vertex_widths_m, width_scale,
)


def river(fid, coords, waterway="river"):
    return Feature(id=fid, geom=LineString(coords), tags={"waterway": waterway}, area=False)


class TestComputeStreamMagnitudes(unittest.TestCase):
    def test_single_unbranched_way_has_magnitude_one(self):
        f = river("a", [(0, 0), (0, 100)])
        self.assertEqual(compute_stream_magnitudes([f]), {"a": 1.0})

    def test_magnitude_passes_through_a_simple_chain_unchanged(self):
        """No confluence anywhere in a straight chain -- magnitude never
        grows just because a mapper split the way into segments."""
        a = river("a", [(0, 0), (0, 100)])
        b = river("b", [(0, 100), (0, 200)])
        c = river("c", [(0, 200), (0, 300)])
        mags = compute_stream_magnitudes([a, b, c])
        self.assertEqual(mags, {"a": 1.0, "b": 1.0, "c": 1.0})

    def test_two_headwaters_merging_gives_downstream_magnitude_two(self):
        left = river("left", [(-100, 100), (0, 0)])
        right = river("right", [(100, 100), (0, 0)])
        downstream = river("downstream", [(0, 0), (0, -200)])
        mags = compute_stream_magnitudes([left, right, downstream])
        self.assertEqual(mags["left"], 1.0)
        self.assertEqual(mags["right"], 1.0)
        self.assertEqual(mags["downstream"], 2.0)

    def test_three_way_confluence_sums_all_three(self):
        a = river("a", [(-100, 100), (0, 0)])
        b = river("b", [(0, 150), (0, 0)])
        c = river("c", [(100, 100), (0, 0)])
        downstream = river("downstream", [(0, 0), (0, -200)])
        mags = compute_stream_magnitudes([a, b, c, downstream])
        self.assertEqual(mags["downstream"], 3.0)

    def test_nested_confluences_accumulate_up_the_tree(self):
        """headwaterA + headwaterB -> mid (2); mid + headwaterC -> mouth (3)."""
        head_a = river("head_a", [(-200, 200), (-100, 100)])
        head_b = river("head_b", [(0, 200), (-100, 100)])
        mid = river("mid", [(-100, 100), (0, 0)])
        head_c = river("head_c", [(100, 100), (0, 0)])
        mouth = river("mouth", [(0, 0), (0, -200)])
        mags = compute_stream_magnitudes([head_a, head_b, mid, head_c, mouth])
        self.assertEqual(mags["head_a"], 1.0)
        self.assertEqual(mags["head_b"], 1.0)
        self.assertEqual(mags["mid"], 2.0)
        self.assertEqual(mags["head_c"], 1.0)
        self.assertEqual(mags["mouth"], 3.0)

    def test_stream_and_canal_tags_both_count(self):
        a = river("a", [(-100, 100), (0, 0)], waterway="stream")
        b = river("b", [(100, 100), (0, 0)], waterway="canal")
        downstream = river("downstream", [(0, 0), (0, -200)], waterway="river")
        mags = compute_stream_magnitudes([a, b, downstream])
        self.assertEqual(mags["downstream"], 2.0)

    def test_non_waterway_features_are_ignored(self):
        road = Feature(id="road", geom=LineString([(0, 0), (0, 100)]),
                       tags={"highway": "primary"}, area=False)
        f = river("a", [(0, 0), (0, 100)])
        mags = compute_stream_magnitudes([road, f])
        self.assertNotIn("road", mags)
        self.assertEqual(mags["a"], 1.0)

    def test_area_features_tagged_waterway_are_ignored(self):
        """A wide river mapped as a polygon, not a centreline -- irrelevant
        to this line-based tapering model."""
        poly = Feature(id="wide", geom=Polygon([(0, 0), (10, 0), (10, 10), (0, 10)]),
                       tags={"waterway": "riverbank"}, area=True)
        f = river("a", [(0, 0), (0, 100)])
        mags = compute_stream_magnitudes([poly, f])
        self.assertNotIn("wide", mags)

    def test_a_cycle_does_not_crash_and_defaults_to_one(self):
        """Bad data (a closed loop with no real source) must degrade
        gracefully, not hang or raise."""
        a = river("a", [(0, 0), (100, 0)])
        b = river("b", [(100, 0), (100, 100)])
        c = river("c", [(100, 100), (0, 0)])  # closes the loop back to a's start
        mags = compute_stream_magnitudes([a, b, c])
        self.assertEqual(mags, {"a": 1.0, "b": 1.0, "c": 1.0})

    def test_every_waterway_gets_an_entry(self):
        a = river("a", [(0, 0), (0, 100)])
        b = river("b", [(50, 50), (0, 100)])
        mags = compute_stream_magnitudes([a, b])
        self.assertEqual(set(mags), {"a", "b"})


class TestWidthScale(unittest.TestCase):
    def test_magnitude_one_gives_min_width(self):
        self.assertAlmostEqual(width_scale(1.0, 3.0, 14.0), 3.0)

    def test_saturation_magnitude_gives_max_width(self):
        self.assertAlmostEqual(width_scale(6.0, 3.0, 14.0, saturation_magnitude=6.0), 14.0)

    def test_beyond_saturation_clamps_to_max_width(self):
        self.assertAlmostEqual(width_scale(50.0, 3.0, 14.0, saturation_magnitude=6.0), 14.0)

    def test_width_is_monotonically_nondecreasing_with_magnitude(self):
        widths = [width_scale(m, 3.0, 14.0, saturation_magnitude=10.0)
                  for m in range(1, 15)]
        self.assertEqual(widths, sorted(widths))

    def test_first_confluence_already_widens_visibly(self):
        """The sqrt curve's whole point: magnitude 1->2 must not be a flat
        stretch near the source."""
        w1 = width_scale(1.0, 3.0, 14.0, saturation_magnitude=6.0)
        w2 = width_scale(2.0, 3.0, 14.0, saturation_magnitude=6.0)
        self.assertGreater(w2 - w1, (14.0 - 3.0) / 6.0,
                           "the first confluence should widen faster than a linear curve would")


class TestRiverWidthsM(unittest.TestCase):
    def test_downstream_of_a_confluence_is_wider_than_either_headwater(self):
        left = river("left", [(-100, 100), (0, 0)])
        right = river("right", [(100, 100), (0, 0)])
        downstream = river("downstream", [(0, 0), (0, -200)])
        widths = river_widths_m([left, right, downstream], min_width_m=3.0, max_width_m=14.0)
        self.assertEqual(widths["left"], widths["right"])
        self.assertGreater(widths["downstream"], widths["left"])

    def test_headwater_renders_at_the_minimum_width(self):
        f = river("a", [(0, 0), (0, 100)])
        widths = river_widths_m([f], min_width_m=3.0, max_width_m=14.0)
        self.assertAlmostEqual(widths["a"], 3.0)


class TestSourceFeatureIds(unittest.TestCase):
    """2026-08-24, direct user request: rivers should taper to a point at a
    real source (a loose upstream end), not just draw at min_width_m for
    their whole length. source_feature_ids finds which features those are."""

    def test_an_unbranched_headwater_is_a_source(self):
        f = river("a", [(0, 0), (0, 100)])
        self.assertEqual(source_feature_ids([f]), {"a"})

    def test_a_simple_chain_only_the_first_segment_is_a_source(self):
        """Mapper-split segments of the SAME unbranched channel: only the
        very first one has a genuinely loose upstream end."""
        a = river("a", [(0, 0), (0, 100)])
        b = river("b", [(0, 100), (0, 200)])
        c = river("c", [(0, 200), (0, 300)])
        self.assertEqual(source_feature_ids([a, b, c]), {"a"})

    def test_both_headwaters_of_a_confluence_are_sources_the_downstream_is_not(self):
        left = river("left", [(-100, 100), (0, 0)])
        right = river("right", [(100, 100), (0, 0)])
        downstream = river("downstream", [(0, 0), (0, -200)])
        self.assertEqual(source_feature_ids([left, right, downstream]), {"left", "right"})

    def test_a_cycle_has_no_sources(self):
        """No genuinely loose end anywhere in a closed loop."""
        a = river("a", [(0, 0), (100, 0)])
        b = river("b", [(100, 0), (100, 100)])
        c = river("c", [(100, 100), (0, 0)])
        self.assertEqual(source_feature_ids([a, b, c]), set())

    def test_non_waterway_features_never_count_as_sources(self):
        road = Feature(id="road", geom=LineString([(0, 0), (0, 100)]),
                       tags={"highway": "primary"}, area=False)
        self.assertEqual(source_feature_ids([road]), set())


class TestVertexWidthsM(unittest.TestCase):
    def test_non_source_is_uniform_at_width_m(self):
        f = river("a", [(0, 0), (0, 50), (0, 100)])
        widths = vertex_widths_m(f, width_m=6.0, is_source=False)
        self.assertEqual(widths, [6.0, 6.0, 6.0])

    def test_source_starts_at_zero(self):
        f = river("a", [(0, 0), (0, 100)])
        widths = vertex_widths_m(f, width_m=6.0, is_source=True, taper_m=80.0)
        self.assertEqual(widths[0], 0.0)

    def test_source_reaches_full_width_at_the_taper_distance(self):
        f = river("a", [(0, 0), (0, 80), (0, 200)])
        widths = vertex_widths_m(f, width_m=6.0, is_source=True, taper_m=80.0)
        self.assertAlmostEqual(widths[1], 6.0)
        self.assertAlmostEqual(widths[2], 6.0, msg="stays at full width past the taper distance")

    def test_taper_is_monotonically_nondecreasing(self):
        f = river("a", [(0, 0), (0, 20), (0, 40), (0, 60), (0, 80), (0, 100)])
        widths = vertex_widths_m(f, width_m=6.0, is_source=True, taper_m=80.0)
        self.assertEqual(widths, sorted(widths))

    def test_taper_clamps_to_a_short_features_own_length(self):
        """A headwater way shorter than the taper distance must still reach
        full width by its OWN last vertex, not stay perpetually thin."""
        f = river("a", [(0, 0), (0, 30)])  # only 30m, taper_m defaults to 80
        widths = vertex_widths_m(f, width_m=6.0, is_source=True)
        self.assertAlmostEqual(widths[-1], 6.0)

    def test_one_width_per_coordinate(self):
        f = river("a", [(0, 0), (0, 25), (0, 50), (0, 100)])
        widths = vertex_widths_m(f, width_m=6.0, is_source=True, taper_m=80.0)
        self.assertEqual(len(widths), 4)

if __name__ == "__main__":
    unittest.main()
