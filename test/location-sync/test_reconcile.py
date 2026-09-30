"""Keeping the region layer tessellating as Ingram keeps drawing more of it.

See tools/gazetteer/core/reconcile.py's own docstring for the protocol:
smaller region is always the more specific answer and is never moved; a
bigger region yields; and a piece severed by that trim is merged into
whichever of the cutting regions it actually borders, rather than left
disconnected or refused.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

from core import reconcile  # noqa: E402
from core.reconcile import PROXIMATE_TOLERANCE_PX  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402
from shapely.ops import unary_union  # noqa: E402


def region(local_id, ring, name=""):
    return {"localId": local_id, "tier": "region", "name": name,
           "geometry": {"kind": "polygon", "ringPx": ring}}


def site(local_id, point=(0, 0)):
    return {"localId": local_id, "tier": "site", "name": "",
           "geometry": {"kind": "point", "pointPx": list(point)}}


def square(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def ring_of(it):
    return Polygon(it["geometry"]["ringPx"], it["geometry"].get("holesPx") or [])


class TestTrimOverlappingRegions(unittest.TestCase):

    def test_non_overlapping_regions_are_returned_unchanged(self):
        items = [region("a", square(0, 0, 100, 100)),
                region("b", square(200, 200, 300, 300))]
        out, report = reconcile.trim_overlapping_regions(items)
        self.assertEqual(out, items)
        self.assertEqual(report["trimmed"], {})
        self.assertEqual(report["merged"], {})
        self.assertEqual(report["unresolved"], {})

    def test_the_smaller_region_is_untouched_and_the_bigger_one_is_cut_back(self):
        big = region("big", square(0, 0, 100, 100))
        small = region("small", square(80, 0, 100, 100))
        out, report = reconcile.trim_overlapping_regions([big, small])

        by_id = {it["localId"]: it for it in out}
        self.assertEqual(by_id["small"], small, "the smaller region must not be rewritten")
        self.assertIn("big", report["trimmed"])
        self.assertNotIn("big", report["merged"])

        trimmed_big = ring_of(by_id["big"])
        self.assertAlmostEqual(trimmed_big.area, 80 * 100, delta=0.5)
        self.assertFalse(trimmed_big.intersects(ring_of(small).buffer(-0.1)),
                         "the trimmed region must not still cover the smaller one's ground")

    def test_a_region_fully_enclosed_in_a_bigger_one_punches_a_real_hole(self):
        outer = region("outer", square(0, 0, 100, 100))
        inner = region("inner", square(40, 40, 60, 60))
        out, report = reconcile.trim_overlapping_regions([outer, inner])

        by_id = {it["localId"]: it for it in out}
        self.assertIn("outer", report["trimmed"])
        holes = by_id["outer"]["geometry"].get("holesPx") or []
        self.assertEqual(len(holes), 1)
        self.assertAlmostEqual(ring_of(by_id["outer"]).area, 100 * 100 - 20 * 20, delta=0.5)

    def test_a_chain_of_three_sizes_only_cuts_each_region_against_smaller_ones(self):
        small = region("small", square(0, 0, 40, 40))
        medium = region("medium", square(20, 0, 80, 40))
        big = region("big", square(0, 0, 100, 100))
        out, report = reconcile.trim_overlapping_regions([small, medium, big])

        by_id = {it["localId"]: it for it in out}
        self.assertEqual(by_id["small"], small)
        self.assertIn("medium", report["trimmed"], "medium is bigger than small, so it yields")
        self.assertIn("big", report["trimmed"], "big must give way to BOTH smaller regions at once")

        small_poly = ring_of(small)
        medium_poly = ring_of(by_id["medium"])
        big_poly = ring_of(by_id["big"])
        self.assertLess(medium_poly.intersection(small_poly).area, 1.0)
        self.assertLess(big_poly.intersection(small_poly).area, 1.0)
        self.assertLess(big_poly.intersection(medium_poly).area, 1.0)

    def test_sites_and_points_pass_through_completely_unchanged(self):
        big = region("big", square(0, 0, 100, 100))
        small = region("small", square(80, 0, 100, 100))
        a_site = site("s1", point=(10, 10))
        out, _ = reconcile.trim_overlapping_regions([big, small, a_site])
        self.assertIn(a_site, out)

    def test_overlap_smaller_than_the_noise_floor_is_left_alone(self):
        a = region("a", square(0, 0, 100, 100))
        b = region("b", square(99.99, 0, 200, 100))
        out, report = reconcile.trim_overlapping_regions([a, b])
        self.assertEqual(out, [a, b])
        self.assertEqual(report["trimmed"], {})

    def test_non_polygon_regions_are_ignored_not_crashed_on(self):
        point_region = {"localId": "odd", "tier": "region", "name": "",
                        "geometry": {"kind": "point", "pointPx": [0, 0]}}
        big = region("big", square(0, 0, 100, 100))
        out, report = reconcile.trim_overlapping_regions([point_region, big])
        self.assertEqual(out, [point_region, big])
        self.assertEqual(report["trimmed"], {})

    def test_a_severed_sliver_is_folded_into_the_neighbour_that_caused_it(self):
        # `block` has a peninsula; `cutter` slices almost all the way
        # across it, leaving a tiny 1x20 stub disconnected from the main
        # body on the far side -- real MultiPolygon output, but the stub
        # only borders `cutter`, so it grows `cutter` instead of vanishing
        # or blocking the whole operation.
        block = region("block", [[0, 0], [100, 0], [100, 40], [120, 40],
                                 [120, 60], [100, 60], [100, 100], [0, 100]])
        cutter = region("cutter", square(101, 35, 119, 65))
        out, report = reconcile.trim_overlapping_regions([block, cutter])

        by_id = {it["localId"]: it for it in out}
        self.assertIn("block", report["trimmed"])
        self.assertIn("cutter", by_id, "cutter's grown shape must be written back")
        cutter_poly = ring_of(by_id["cutter"])
        # cutter's own drawn area (18x30=540) plus the 1x20=20 stub it absorbed.
        self.assertAlmostEqual(cutter_poly.area, 18 * 30 + 20, delta=1.0)

    def test_a_genuine_near_even_split_is_merged_into_the_region_that_caused_it_and_reported(self):
        # A bar drawn all the way across the middle of a square splits it
        # into a top half and a bottom half -- a REAL, non-negligible
        # second piece (not noise), so it must show up in `merged`, not be
        # silently dropped and not silently ignored either.
        bar = region("bar", square(-10, 45, 110, 55))
        block = region("block", square(0, 0, 100, 100))
        out, report = reconcile.trim_overlapping_regions([bar, block])

        by_id = {it["localId"]: it for it in out}
        self.assertIn("block", report["trimmed"])
        self.assertIn("block", report["merged"])
        self.assertIn("bar", report["merged"]["block"])
        self.assertGreater(report["merged"]["block"]["bar"], 4000,
                           "half the square is a real merge, not noise, and must be reported as one")

        bar_poly = ring_of(by_id["bar"])
        block_poly = ring_of(by_id["block"])
        original_union_area = ring_of(bar).union(ring_of(block)).area
        self.assertAlmostEqual(bar_poly.area + block_poly.area, original_union_area, delta=1.0,
                               msg="no ground gained or lost, only reassigned")
        self.assertLess(bar_poly.intersection(block_poly).area, 1.0,
                        "the two final shapes must not still overlap each other")

    def test_ranked_neighbours_for_is_empty_when_nothing_touches(self):
        piece = Polygon(square(0, 0, 10, 10))
        far_away = {"far": Polygon(square(1000, 1000, 1010, 1010))}
        self.assertEqual(reconcile._ranked_neighbours_for(piece, far_away), [])

    def test_ranked_neighbours_for_puts_the_most_shared_edge_first(self):
        piece = Polygon(square(0, 0, 10, 10))
        candidates = {
            "touches_a_corner": Polygon(square(10, 10, 20, 20)),
            "shares_a_whole_side": Polygon(square(10, 0, 20, 10)),
        }
        ranked = reconcile._ranked_neighbours_for(piece, candidates)
        self.assertEqual(ranked[0], "shares_a_whole_side")
        self.assertEqual(set(ranked), set(candidates))

    def test_within_tolerance_is_not_the_same_as_touching(self):
        # Pins down the exact condition trim_overlapping_regions' merge
        # loop checks before ever accepting a candidate (`unary_union([
        # candidate, piece]).buffer(0).geom_type != "MultiPolygon"`) -- a
        # live regression, found on real drawn data: a candidate ranked by
        # _ranked_neighbours_for as "within touching distance" turned out
        # to still be a genuine few-pixel gap away, and accepting that
        # "merge" crashed core/reconcile.py's own ring-conversion step
        # with an AttributeError, deep inside shapely, the first time a
        # gapped candidate happened to rank first. The merge loop's own
        # rejection of exactly this case is what fixed it -- this test
        # pins down the shapely behaviour that check depends on, so a
        # future shapely upgrade that silently changed it would be caught
        # here rather than back in production.
        piece = Polygon(square(0, 0, 10, 10))
        gap = PROXIMATE_TOLERANCE_PX * 0.5
        candidates = {"nearby": Polygon(square(10 + gap, 0, 20 + gap, 10))}
        self.assertEqual(reconcile._ranked_neighbours_for(piece, candidates), ["nearby"],
                         "it must still be RANKED -- the rejection belongs to the caller")
        joined = unary_union([candidates["nearby"], piece]).buffer(0)
        self.assertEqual(joined.geom_type, "MultiPolygon",
                         "and the merge loop's own union check is what must catch it")


class TestMergeRegions(unittest.TestCase):

    def test_two_touching_regions_become_one_with_the_union_shape(self):
        a = region("a", square(0, 0, 100, 100))
        b = region("b", square(100, 0, 200, 100))
        new_items, survivor_id = reconcile.merge_regions([a, b], ["a", "b"])

        self.assertEqual(len(new_items), 1)
        self.assertEqual(survivor_id, "a", "no promoted item among them -- the first one wins")
        self.assertAlmostEqual(ring_of(new_items[0]).area, 100 * 200, delta=0.5)

    def test_the_already_promoted_region_always_survives_regardless_of_order(self):
        a = region("a", square(0, 0, 100, 100))
        b = dict(region("b", square(100, 0, 200, 100)), locationRef="the-real-district")
        new_items, survivor_id = reconcile.merge_regions([a, b], ["a", "b"])
        self.assertEqual(survivor_id, "b")
        self.assertEqual(new_items[0]["locationRef"], "the-real-district")

    def test_three_regions_merge_into_one_if_they_all_connect(self):
        a = region("a", square(0, 0, 50, 100))
        b = region("b", square(50, 0, 100, 100))
        c = region("c", square(100, 0, 150, 100))
        new_items, survivor_id = reconcile.merge_regions([a, b, c], ["a", "b", "c"])
        self.assertEqual(len(new_items), 1)
        self.assertAlmostEqual(ring_of(new_items[0]).area, 150 * 100, delta=0.5)

    def test_two_regions_that_do_not_touch_refuse_to_merge(self):
        a = region("a", square(0, 0, 100, 100))
        b = region("b", square(500, 500, 600, 600))
        with self.assertRaises(reconcile.MergeError):
            reconcile.merge_regions([a, b], ["a", "b"])

    def test_two_already_promoted_regions_refuse_to_merge(self):
        a = dict(region("a", square(0, 0, 100, 100)), locationRef="district-one")
        b = dict(region("b", square(100, 0, 200, 100)), locationRef="district-two")
        with self.assertRaises(reconcile.MergeError):
            reconcile.merge_regions([a, b], ["a", "b"])

    def test_merging_a_site_is_refused(self):
        a = region("a", square(0, 0, 100, 100))
        b = site("b", point=(150, 50))
        with self.assertRaises(reconcile.MergeError):
            reconcile.merge_regions([a, b], ["a", "b"])

    def test_a_single_id_is_refused_there_is_nothing_to_merge(self):
        a = region("a", square(0, 0, 100, 100))
        with self.assertRaises(reconcile.MergeError):
            reconcile.merge_regions([a], ["a"])

    def test_other_items_in_the_session_pass_through_untouched(self):
        a = region("a", square(0, 0, 100, 100))
        b = region("b", square(100, 0, 200, 100))
        bystander = region("bystander", square(500, 500, 600, 600))
        new_items, _ = reconcile.merge_regions([a, b, bystander], ["a", "b"])
        self.assertIn(bystander, new_items)


class TestBisectRegion(unittest.TestCase):

    def test_a_straight_cut_down_the_middle_makes_two_equal_regions(self):
        a = region("a", square(0, 0, 100, 100), name="Original District")
        new_items, survivor_id, new_id = reconcile.bisect_region(
            [a], "a", [[50, 0], [50, 100]], "b")

        self.assertEqual(len(new_items), 2)
        by_id = {it["localId"]: it for it in new_items}
        self.assertAlmostEqual(ring_of(by_id[survivor_id]).area, 5000, delta=0.5)
        self.assertAlmostEqual(ring_of(by_id[new_id]).area, 5000, delta=0.5)
        self.assertEqual(by_id[survivor_id].get("name"), "Original District",
                         "the surviving half keeps the original's identity")
        self.assertEqual(by_id[new_id].get("name"), "",
                         "the new half is a blank draft, never a copy of the original's lore")

    def test_a_complex_cut_line_works_the_same_as_a_straight_one(self):
        a = region("a", square(0, 0, 100, 100))
        new_items, survivor_id, new_id = reconcile.bisect_region(
            [a], "a", [[50, 0], [30, 30], [70, 50], [30, 70], [50, 100]], "b")
        by_id = {it["localId"]: it for it in new_items}
        total = ring_of(by_id[survivor_id]).area + ring_of(by_id[new_id]).area
        self.assertAlmostEqual(total, 10000, delta=0.5, msg="no ground gained or lost")

    def test_a_cut_point_a_few_hundredths_of_a_pixel_off_the_boundary_still_works(self):
        # A live regression: driving this from the real UI, an edge
        # midpoint computed by hand (not shapely's own boundary.interpolate)
        # landed 0.03px off the true boundary -- an entirely ordinary amount
        # of residue for a real snapped click to carry -- and
        # shapely.ops.split silently returned the WHOLE region unchanged,
        # not two pieces. bisect_region must snap each end onto the
        # boundary itself before splitting, not trust the caller's point to
        # already be exact.
        a = region("a", [[7232, 4979.8], [7172, 5052.9],
                         [7486.934769760508, 5141.828460238905], [7497, 5040.8]])
        new_items, survivor_id, new_id = reconcile.bisect_region(
            [a], "a", [[7202, 5016.35], [7492, 5091.3]], "b")
        by_id = {it["localId"]: it for it in new_items}
        total = ring_of(by_id[survivor_id]).area + ring_of(by_id[new_id]).area
        # Not a tight area-conservation check -- see the other cases in this
        # class for that, on clean input. The point here is specifically
        # that an imprecise real click still produces a genuine two-way
        # split at all, so a generous bound (the hairline kerf on
        # imprecise input, not the tight synthetic cases) is deliberate.
        self.assertAlmostEqual(total, ring_of(a).area, delta=50)
        self.assertGreater(ring_of(by_id[survivor_id]).area, 0)
        self.assertGreater(ring_of(by_id[new_id]).area, 0)

    def test_the_larger_piece_keeps_the_locationRef_the_smaller_does_not(self):
        a = dict(region("a", square(0, 0, 100, 100)), locationRef="real-district")
        new_items, survivor_id, new_id = reconcile.bisect_region(
            [a], "a", [[30, 0], [30, 100]], "b")
        by_id = {it["localId"]: it for it in new_items}
        self.assertEqual(by_id[survivor_id]["locationRef"], "real-district")
        self.assertNotIn("locationRef", by_id[new_id])

    def test_a_line_that_does_not_touch_the_region_is_refused(self):
        a = region("a", square(0, 0, 100, 100))
        with self.assertRaises(reconcile.BisectError):
            reconcile.bisect_region([a], "a", [[500, 500], [600, 600]], "b")

    def test_a_line_that_only_grazes_the_boundary_is_refused(self):
        a = region("a", square(0, 0, 100, 100))
        with self.assertRaises(reconcile.BisectError):
            reconcile.bisect_region([a], "a", [[0, 50], [-10, 50]], "b")

    def test_a_line_that_crosses_the_boundary_more_than_twice_is_refused(self):
        a = region("a", square(0, 0, 100, 100))
        with self.assertRaises(reconcile.BisectError):
            reconcile.bisect_region([a], "a", [[50, 0], [150, 50], [50, 100]], "b")

    def test_bisecting_a_site_is_refused(self):
        a = site("a", point=(50, 50))
        with self.assertRaises(reconcile.BisectError):
            reconcile.bisect_region([a], "a", [[0, 0], [100, 100]], "b")

    def test_other_items_pass_through_untouched(self):
        a = region("a", square(0, 0, 100, 100))
        bystander = region("bystander", square(500, 500, 600, 600))
        new_items, _, _ = reconcile.bisect_region(
            [a, bystander], "a", [[50, 0], [50, 100]], "b")
        self.assertIn(bystander, new_items)


if __name__ == "__main__":
    unittest.main()
