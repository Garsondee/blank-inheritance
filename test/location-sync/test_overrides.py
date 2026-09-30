"""Which real-world features the campaign map no longer has.

The claim: suppression hides a feature from the tool without destroying
anything, and un-suppression brings it back exactly. Both halves are tested,
because a mechanism that installs state and cannot remove it is a trap -- you
find out the first time a removal was a mistake, which is the worst possible
moment.

The subtle rule worth locking down is how an AREA decides what it covers: by a
feature's CENTROID, not by any vertex. A road or a long wall that merely clips
the corner of a levelled block has not itself been levelled, and treating it as
gone would quietly erase the street outside the crater.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

from core import overrides  # noqa: E402

# A 400x400 px block, and a point inside and outside it.
BLOCK = [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]
INSIDE = (4600, 6600)
OUTSIDE = (5200, 6600)


class TestEmptyDocument(unittest.TestCase):
    def test_a_fresh_document_suppresses_nothing(self):
        s = overrides.Suppression(overrides.empty())
        self.assertEqual(len(s), 0)
        self.assertFalse(s.hides("anything", INSIDE))

    def test_a_fresh_document_carries_its_own_schema_reference(self):
        """So it validates the moment it is written, like every other data file."""
        doc = overrides.empty()
        self.assertTrue(doc["$schema"].endswith("groundtruth-overrides.schema.json"))
        self.assertEqual(doc["id"], doc["type"])


class TestFeatureIds(unittest.TestCase):
    def setUp(self):
        self.doc = overrides.empty()

    def test_naming_a_feature_hides_it(self):
        overrides.add_feature_ids(self.doc, ["abc"], note="painted out")
        s = overrides.Suppression(self.doc)
        self.assertTrue(s.hides("abc"))
        self.assertFalse(s.hides("def"))
        self.assertEqual(s.why("abc"), "painted out")

    def test_suppressing_the_same_feature_twice_does_not_duplicate_it(self):
        """Dragging an overlapping box twice is normal, not an error."""
        overrides.add_feature_ids(self.doc, ["abc", "def"])
        added = overrides.add_feature_ids(self.doc, ["def", "ghi"])
        self.assertEqual(added, 1)
        self.assertEqual(len(self.doc["suppressedFeatures"]), 3)

    def test_un_suppressing_restores_it_exactly(self):
        overrides.add_feature_ids(self.doc, ["abc", "def"])
        removed = overrides.remove_feature_ids(self.doc, ["abc"])
        self.assertEqual(removed, 1)
        s = overrides.Suppression(self.doc)
        self.assertFalse(s.hides("abc"))
        self.assertTrue(s.hides("def"))

    def test_un_suppressing_something_that_was_not_suppressed_is_harmless(self):
        overrides.add_feature_ids(self.doc, ["abc"])
        self.assertEqual(overrides.remove_feature_ids(self.doc, ["zzz"]), 0)
        self.assertEqual(len(self.doc["suppressedFeatures"]), 1)


class TestAreas(unittest.TestCase):
    def setUp(self):
        self.doc = overrides.empty()
        overrides.add_area(self.doc, "sunk-island", BLOCK, note="reclaimed by the sea")

    def test_an_area_hides_whatever_sits_inside_it(self):
        s = overrides.Suppression(self.doc)
        self.assertTrue(s.hides("any-id", INSIDE))
        self.assertFalse(s.hides("any-id", OUTSIDE))

    def test_an_area_records_the_cells_it_covers(self):
        """So the file can be read and reviewed without running the tool."""
        self.assertEqual(self.doc["suppressedAreas"][0]["refs"],
                         ["C4·11", "C4·21", "C4·12", "C4·22"])

    def test_an_area_judges_by_centroid_not_by_any_vertex(self):
        """A wall or a road clipping the corner of a levelled block has not
        itself been levelled. Judging by 'any vertex inside' would erase the
        street outside the crater along with the crater."""
        s = overrides.Suppression(self.doc)
        # A long feature whose body is outside but whose corner grazes the area.
        grazing_centroid = (5100, 6600)
        self.assertFalse(s.hides("the-street", grazing_centroid))
        # And one genuinely within it.
        self.assertTrue(s.hides("the-warehouse", (4500, 6500)))

    def test_removing_an_area_brings_everything_inside_it_back(self):
        overrides.remove_area(self.doc, "sunk-island")
        s = overrides.Suppression(self.doc)
        self.assertFalse(s.hides("any-id", INSIDE))
        self.assertEqual(len(s), 0)

    def test_an_area_needs_a_real_polygon(self):
        with self.assertRaises(ValueError):
            overrides.add_area(self.doc, "bad", [[0, 0], [1, 1]])

    def test_lon_lat_is_attached_when_offered(self):
        """Pixels belong to this map version; lon/lat survives a re-export."""
        doc = overrides.empty()
        ll = [[135.1, 34.6], [135.2, 34.6], [135.2, 34.7], [135.1, 34.7]]
        entry = overrides.add_area(doc, "a", BLOCK, ring_lonlat=ll)
        self.assertEqual(entry["ring"], ll)

    def test_why_explains_which_rule_hid_something(self):
        """A feature that simply vanishes with no explanation is a bug report
        waiting to happen."""
        s = overrides.Suppression(self.doc)
        self.assertEqual(s.why(point=INSIDE), "reclaimed by the sea")
        self.assertIsNone(s.why(point=OUTSIDE))


class TestBothRulesTogether(unittest.TestCase):
    def test_ids_and_areas_compose(self):
        doc = overrides.empty()
        overrides.add_feature_ids(doc, ["far-away"])
        overrides.add_area(doc, "block", BLOCK)
        s = overrides.Suppression(doc)
        self.assertEqual(len(s), 2)
        self.assertTrue(s.hides("far-away", OUTSIDE))       # by id
        self.assertTrue(s.hides("something-else", INSIDE))  # by area
        self.assertFalse(s.hides("something-else", OUTSIDE))


class TestPersistence(unittest.TestCase):
    def test_a_document_round_trips_through_disk(self):
        d = tempfile.mkdtemp()
        try:
            path = os.path.join(d, "overrides.json")
            doc = overrides.empty()
            overrides.add_feature_ids(doc, ["abc"], note="gone")
            overrides.add_area(doc, "block", BLOCK, note="levelled")
            overrides.save(doc, path)

            reloaded = overrides.load(path)
            s = overrides.Suppression(reloaded)
            self.assertTrue(s.hides("abc"))
            self.assertTrue(s.hides("other", INSIDE))
            self.assertEqual(s.why("abc"), "gone")
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_a_missing_file_loads_as_an_empty_document(self):
        """A fresh clone has no overrides, and that must not be an error."""
        doc = overrides.load(os.path.join(tempfile.gettempdir(), "definitely-not-here.json"))
        self.assertEqual(doc["suppressedFeatures"], [])


class TestDistanceToRing(unittest.TestCase):
    """The hit-test fallback for a click that landed just outside a
    building's edge rather than exactly inside it -- found live: a building
    rendered at 8% fill opacity, one screen pixel wide at a zoomed-out view,
    is not realistically clickable if "exactly inside the polygon" is the
    only thing that ever counted as a hit. Distance is to the BOUNDARY, not
    the interior, on purpose -- see the two interior cases below.
    """

    def test_a_point_on_the_boundary_is_zero_distance(self):
        self.assertAlmostEqual(overrides._distance_to_ring(4600, 6400, BLOCK), 0.0)

    def test_a_point_outside_and_perpendicular_to_an_edge(self):
        # 50px straight above the top edge (y=6400), well within its span.
        self.assertAlmostEqual(overrides._distance_to_ring(4600, 6350, BLOCK), 50.0)

    def test_a_point_outside_nearest_to_a_corner_not_an_edge(self):
        # 30px left, 40px above the (4400, 6400) corner -- a 3-4-5 triangle,
        # and nearest to the VERTEX rather than perpendicular to either edge.
        self.assertAlmostEqual(overrides._distance_to_ring(4370, 6360, BLOCK), 50.0)

    def test_a_point_deep_inside_the_block_is_not_zero(self):
        # The block's centre is 200px from every edge -- distance to the
        # BOUNDARY, not "inside counts as zero". _point_in_ring is what
        # answers "is this inside" for the exact-hit case; this function
        # only ever answers "how far to the nearest edge".
        self.assertAlmostEqual(overrides._distance_to_ring(4600, 6600, BLOCK), 200.0)


if __name__ == "__main__":
    unittest.main()
