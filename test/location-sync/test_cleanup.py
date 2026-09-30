"""core/cleanup.py -- snapping hairline near-misses between region borders.

Synthetic geometry throughout, not the live session: these prove the
ALGORITHM (transitive clustering, self-vs-cross-region discrimination,
insertion ordering, the cyclic-ring edge case) on cases small enough to
hand-verify, independent of whatever the real map happens to contain on
any given day.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

from core import cleanup  # noqa: E402


def region(local_id, ring):
    return {"localId": local_id, "ring": [list(p) for p in ring]}


class TestClusterAndSnap(unittest.TestCase):

    def test_two_regions_a_few_px_apart_snap_to_their_shared_midpoint(self):
        # Only a[0]/b[0] are meant to be close -- every other point is
        # padded off to a wildly different part of the plane so the test
        # cannot pass by accident on some OTHER, unintended pair.
        a = region("a", [[100, 0], [5100, 3000], [-4900, 3000]])
        b = region("b", [[103, 0], [5103, -3000], [-4897, -3000]])
        report = cleanup.cluster_and_snap([a, b], tolerance_px=5)
        self.assertEqual(len(report), 1)
        entry = report[0]
        self.assertEqual(entry["vertexCount"], 2)
        self.assertEqual(entry["regionIds"], ["a", "b"])
        self.assertAlmostEqual(entry["point"][0], 101.5, places=1)
        # both sides actually moved, to the SAME point
        self.assertEqual(a["ring"][0], b["ring"][0])
        self.assertEqual(a["ring"][0], [101.5, 0.0])

    def test_vertices_farther_than_tolerance_are_left_alone(self):
        a = region("a", [[0, 0], [100, 0], [100, 100], [0, 100]])
        b = region("b", [[150, 0], [200, 0], [200, 100], [150, 100]])
        original_a = [list(p) for p in a["ring"]]
        report = cleanup.cluster_and_snap([a, b], tolerance_px=5)
        self.assertEqual(report, [])
        self.assertEqual(a["ring"], original_a)

    def test_three_regions_meeting_at_one_corner_merge_transitively(self):
        # b sits within tolerance of BOTH a and c, but a and c are not
        # within tolerance of each other directly -- the whole point of
        # union-find over pairwise distance rather than a simple two-at-a-
        # time nearest-neighbour match, which would only ever catch two of
        # the three and leave the map with a real three-way sliver.
        # Same padding discipline as the two-region case above, and each
        # shape's padding points sent in a THIRD, mutually distinct
        # direction so no two shapes' padding can accidentally land near
        # each other either.
        a = region("a", [[100, 0], [2100, 1000], [-1900, 1000]])
        b = region("b", [[103, 0], [2103, -1000], [-1897, -1000]])
        c = region("c", [[106, 0], [2106, -2000], [-1894, -2000]])
        report = cleanup.cluster_and_snap([a, b, c], tolerance_px=5)
        self.assertEqual(len(report), 1)
        entry = report[0]
        self.assertEqual(entry["vertexCount"], 3)
        self.assertEqual(entry["regionIds"], ["a", "b", "c"])
        # all three now share the exact same point
        self.assertEqual(a["ring"][0], b["ring"][0])
        self.assertEqual(b["ring"][0], c["ring"][0])

    def test_a_cluster_confined_to_one_regions_own_ring_is_not_this_passs_job(self):
        # a has two of ITS OWN points close together -- a real thing worth
        # fixing (dedupe_self_duplicates' job), but not a border two
        # DIFFERENT shapes disagree about, which is what this pass reports.
        a = region("a", [[0, 0], [50, 0], [50.5, 0.2], [100, 100], [0, 100]])
        original = [list(p) for p in a["ring"]]
        report = cleanup.cluster_and_snap([a], tolerance_px=5)
        self.assertEqual(report, [])
        self.assertEqual(a["ring"], original)

    def test_a_ring_with_fewer_than_3_points_is_skipped_without_crashing(self):
        a = region("a", [[0, 0], [1, 1]])
        b = region("b", [[1.5, 1.5], [50, 50], [50, 0]])
        report = cleanup.cluster_and_snap([a, b], tolerance_px=5)
        self.assertEqual(report, [])

    def test_maxMovePx_is_the_farthest_any_single_member_actually_travelled(self):
        a = region("a", [[100, 0], [3100, 2000], [-2900, 2000]])
        b = region("b", [[110, 0], [3110, -2000], [-2890, -2000]])
        report = cleanup.cluster_and_snap([a, b], tolerance_px=15)
        self.assertEqual(len(report), 1)
        # midpoint is 105; both points started 5px from it
        self.assertAlmostEqual(report[0]["maxMovePx"], 5.0, places=1)


class TestInsertEdgeMatches(unittest.TestCase):

    def test_a_vertex_near_the_middle_of_anothers_edge_gets_a_matching_point(self):
        # b is a wide, TALL rectangle (height 500, not a sliver) so a point
        # a few px below its bottom edge is nowhere near the top edge too --
        # the failure mode a too-thin test rectangle would hide. a's own
        # near point sits at (500, -3); its other two points are pushed far
        # up and away so they cannot be mistaken for a second, unintended
        # match against any of b's other three edges.
        b = region("b", [[-1000, 0], [1000, 0], [1000, 500], [-1000, 500]])
        a = region("a", [[500, -3], [500, 2000], [-500, 2000]])
        report = cleanup.insert_edge_matches([a, b], tolerance_px=5)
        self.assertEqual(len(report), 1)
        entry = report[0]
        self.assertEqual(entry["intoRegionId"], "b")
        self.assertEqual(entry["fromRegionId"], "a")
        self.assertAlmostEqual(entry["point"][0], 500.0, places=1)
        self.assertAlmostEqual(entry["point"][1], 0.0, places=1)
        # actually landed in b's ring, between the two endpoints it split
        self.assertIn([500.0, 0.0], b["ring"])
        self.assertEqual(len(b["ring"]), 5)

    def test_a_vertex_already_essentially_at_an_existing_vertex_is_not_reinserted(self):
        # This is cluster_and_snap's job -- if a point is already sitting
        # on one of the segment's own endpoints, splitting the edge there
        # would insert a second, redundant point right next to the first.
        a = region("a", [[0, 0], [100.2, 0.1], [100, 100], [0, 100]])
        b = region("b", [[100, 0], [200, 0], [200, 100], [100, 100]])
        report = cleanup.insert_edge_matches([a, b], tolerance_px=5)
        self.assertEqual(report, [])

    def test_a_vertex_farther_than_tolerance_from_any_edge_is_left_alone(self):
        b = region("b", [[-1000, 0], [1000, 0], [1000, 500], [-1000, 500]])
        a = region("a", [[500, -50], [500, 2000], [-500, 2000]])  # 50px off, over the 5px tolerance
        report = cleanup.insert_edge_matches([a, b], tolerance_px=5)
        self.assertEqual(report, [])

    def test_two_stray_points_landing_on_the_same_edge_both_insert_in_order(self):
        # Points are matched in an order that would insert the SECOND one
        # (further along the edge) first if the implementation naively used
        # each match's own original index -- proving the sort-plus-offset
        # actually keeps both insertions where they belong along the edge,
        # not swapped or overlapping.
        b = region("b", [[-1000, 0], [1000, 0], [1000, 500], [-1000, 500]])
        # a2's near point (80) is FARTHER along the edge than a1's (30), but
        # its padding is sent in the opposite y direction from a1's so the
        # two source shapes cannot be mistaken for bordering EACH OTHER.
        a1 = region("a1", [[30, -1], [30, 2000], [-30, 2000]])
        a2 = region("a2", [[80, -2], [80, -2000], [-80, -2000]])
        report = cleanup.insert_edge_matches([a1, a2, b], tolerance_px=5)
        self.assertEqual(len(report), 2)
        # b's bottom edge (index 0 -> 1) gained two points, in ascending x
        # order along the edge, between the original two corners.
        self.assertEqual(len(b["ring"]), 6)
        self.assertEqual(b["ring"][0], [-1000, 0])
        self.assertAlmostEqual(b["ring"][1][0], 30, places=1)
        self.assertAlmostEqual(b["ring"][2][0], 80, places=1)
        self.assertEqual(b["ring"][3], [1000, 0])


class TestDedupeSelfDuplicates(unittest.TestCase):

    def test_a_redundant_consecutive_point_is_removed(self):
        a = region("a", [[0, 0], [50, 0], [50.3, 0.1], [100, 100], [0, 100]])
        report = cleanup.dedupe_self_duplicates([a], tolerance_px=1)
        self.assertEqual(report, [{"regionId": "a", "removedCount": 1}])
        self.assertEqual(len(a["ring"]), 4)

    def test_a_seam_at_the_wrap_around_is_caught_too(self):
        # the ring's LAST point and its FIRST point are within tolerance --
        # a seam a simple linear scan of consecutive pairs would miss,
        # since index 0 has no "previous" element in a plain pass.
        a = region("a", [[0, 0], [100, 0], [100, 100], [0, 100], [0.2, 0.1]])
        report = cleanup.dedupe_self_duplicates([a], tolerance_px=1)
        self.assertEqual(report, [{"regionId": "a", "removedCount": 1}])
        self.assertEqual(len(a["ring"]), 4)

    def test_never_removes_below_3_points(self):
        a = region("a", [[0, 0], [0.1, 0.1], [0.2, 0.2]])
        report = cleanup.dedupe_self_duplicates([a], tolerance_px=1)
        self.assertEqual(report, [])
        self.assertEqual(len(a["ring"]), 3)

    def test_a_ring_with_no_near_duplicates_is_untouched(self):
        a = region("a", [[0, 0], [100, 0], [100, 100], [0, 100]])
        original = [list(p) for p in a["ring"]]
        report = cleanup.dedupe_self_duplicates([a], tolerance_px=1)
        self.assertEqual(report, [])
        self.assertEqual(a["ring"], original)


if __name__ == "__main__":
    unittest.main()
