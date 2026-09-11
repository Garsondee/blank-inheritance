"""Promoting a drawing-session item into a real, permanent location.

The claim worth testing hardest is containment: a site promoted after its
region exists gets `withinRegionRef` filled in without anyone typing it, and a
region promoted after its buildings do picks them up the same way. Both
directions are tested, because only testing one is exactly how "the region
came first" quietly becomes the only case that works.

This never invents `lore` -- it is asked for, or comes back empty and the
location's status is "needs-lore". That is deliberate: per the standing rule
against inventing the six kids/Frames, this module must not invent what a
place IS either.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import location, session  # noqa: E402
from core.georef import MapGeoref  # noqa: E402

# Sannomiya-area shapes, all comfortably inside a single grid cell or two, so
# containment tests do not accidentally straddle map edges.
REGION_RING = [[4400, 6400], [5400, 6400], [5400, 7400], [4400, 7400]]   # 1km sq, C4-ish
SITE_INSIDE = [[4700, 6700], [4900, 6700], [4900, 6900], [4700, 6900]]    # centroid (4800,6800) — inside region
SITE_OUTSIDE = [[9000, 9000], [9200, 9000], [9200, 9200], [9000, 9200]]   # far away


def georef():
    return MapGeoref.load()


def region_item(ring=None):
    return session.make_item("r1", "region",
                             {"kind": "polygon", "ringPx": ring or REGION_RING},
                             name="Test District", note="a district for testing")


def site_item(local_id="s1", ring=None, note="a building"):
    return session.make_item(local_id, "site",
                             {"kind": "polygon", "ringPx": ring or SITE_INSIDE},
                             note=note)


class TestBuildLocation(unittest.TestCase):
    def setUp(self):
        self.g = georef()

    def test_a_region_carries_canonical_lon_lat_and_derived_cells(self):
        doc = location.build_location(region_item(), "test-district", self.g)
        self.assertEqual(doc["tier"], "region")
        self.assertEqual(doc["id"], "test-district")
        self.assertEqual(len(doc["geometry"]["rings"]), 1)
        self.assertEqual(len(doc["geometry"]["rings"][0]), 4)
        for lon, lat in doc["geometry"]["rings"][0]:
            self.assertTrue(135.0 < lon < 135.4)
            self.assertTrue(34.5 < lat < 34.9)
        self.assertGreater(len(doc["derived"]["cells"]), 0)
        self.assertIsNotNone(doc["derived"]["areaM2"])

    def test_a_point_carries_a_single_lon_lat_pair_not_rings(self):
        item = session.make_item("p1", "point",
                                 {"kind": "point", "pointPx": [4573, 6580]},
                                 note="a statue")
        doc = location.build_location(item, "test-pin", self.g)
        self.assertEqual(doc["geometry"]["rings"], [])
        self.assertEqual(len(doc["geometry"]["point"]), 2)
        self.assertIsNone(doc["derived"]["areaM2"])

    def test_the_note_carries_over_unchanged(self):
        item = region_item()
        doc = location.build_location(item, "test-district", self.g)
        self.assertEqual(doc["authoring"]["note"], "a district for testing")

    def test_without_lore_the_status_is_needs_lore(self):
        doc = location.build_location(region_item(), "test-district", self.g)
        self.assertEqual(doc["authoring"]["status"], "needs-lore")
        self.assertEqual(doc["lore"]["summary"], "")

    def test_with_lore_the_status_becomes_drafted(self):
        doc = location.build_location(
            region_item(), "test-district", self.g,
            lore={"summary": "A dense commercial quarter north of the station."})
        self.assertEqual(doc["authoring"]["status"], "drafted")
        self.assertEqual(doc["lore"]["summary"],
                         "A dense commercial quarter north of the station.")

    def test_lore_is_never_invented_only_carried_through(self):
        """The whole point of taking lore as an argument rather than deriving
        it: this function must be incapable of writing a place's fiction."""
        doc = location.build_location(region_item(), "test-district", self.g)
        self.assertEqual(doc["lore"]["playerFacing"], "")
        self.assertEqual(doc["lore"]["gmOnly"], "")

    def test_provenance_points_back_at_the_draft(self):
        doc = location.build_location(
            site_item(), "test-site", self.g, session_id="session-20260911-144323")
        self.assertEqual(doc["derived"]["sourceSession"], "session-20260911-144323")
        self.assertEqual(doc["derived"]["sourceLocalId"], "s1")
        self.assertIsNotNone(doc["derived"]["promotedDate"])

    def test_build_location_refuses_a_tier_geometry_mismatch_bypassing_make_item(self):
        """session.make_item already refuses this pairing at draw time; this is
        build_location's own belt-and-braces check for a hand-built item that
        skips that validation (e.g. loaded from an older, looser draft file)."""
        bad = {"tier": "region", "geometry": {"kind": "point", "pointPx": [4600, 6600]},
              "name": "", "note": "", "kind": "", "localId": "x"}
        with self.assertRaises(location.PromotionError):
            location.build_location(bad, "x", self.g)
        bad2 = {"tier": "point", "geometry": {"kind": "polygon", "ringPx": SITE_INSIDE},
               "name": "", "note": "", "kind": "", "localId": "x"}
        with self.assertRaises(location.PromotionError):
            location.build_location(bad2, "x", self.g)


class TestContainment(unittest.TestCase):
    def setUp(self):
        self.g = georef()

    def test_a_site_promoted_after_its_region_finds_it(self):
        region_doc = location.build_location(region_item(), "test-district", self.g)
        site_doc = location.build_location(
            site_item(), "test-site", self.g, existing_regions=[region_doc])
        self.assertEqual(site_doc["derived"]["withinRegionRef"], "test-district")

    def test_a_site_outside_every_region_gets_null_not_a_guess(self):
        region_doc = location.build_location(region_item(), "test-district", self.g)
        far = location.build_location(
            site_item(ring=SITE_OUTSIDE), "test-far-site", self.g,
            existing_regions=[region_doc])
        self.assertIsNone(far["derived"]["withinRegionRef"])

    def test_no_regions_drawn_yet_gives_null_not_an_error(self):
        site_doc = location.build_location(site_item(), "test-site", self.g,
                                           existing_regions=[])
        self.assertIsNone(site_doc["derived"]["withinRegionRef"])

    def test_a_point_is_also_tested_for_containment(self):
        region_doc = location.build_location(region_item(), "test-district", self.g)
        pin = session.make_item("p1", "point", {"kind": "point", "pointPx": [4800, 6800]})
        doc = location.build_location(pin, "test-pin", self.g, existing_regions=[region_doc])
        self.assertEqual(doc["derived"]["withinRegionRef"], "test-district")

    def test_a_region_never_gets_a_within_region_ref(self):
        """Regions tessellate; they do not nest inside each other in this model."""
        outer = location.build_location(region_item(), "outer", self.g)
        inner = location.build_location(
            region_item(ring=SITE_INSIDE), "inner", self.g, existing_regions=[outer])
        self.assertIsNone(inner["derived"]["withinRegionRef"])

    def test_the_smaller_overlapping_region_wins(self):
        """Regions are meant to tessellate without overlap, but a promotion has
        to survive one that has not been cleaned up yet -- prefer the more
        specific (smaller) answer, the way an inner administrative unit beats
        the outer one for the same address."""
        big = location.build_location(region_item(), "big-district", self.g)
        small_ring = [[4700, 6700], [4900, 6700], [4900, 6900], [4700, 6900]]
        small = location.build_location(
            region_item(ring=small_ring), "small-district", self.g, existing_regions=[big])
        centre = session.make_item("s1", "site",
                                   {"kind": "polygon", "ringPx":
                                    [[4780, 6780], [4820, 6780], [4820, 6820], [4780, 6820]]})
        doc = location.build_location(centre, "centre-site", self.g,
                                      existing_regions=[big, small])
        self.assertEqual(doc["derived"]["withinRegionRef"], "small-district")

    def test_recompute_region_contents_finds_sites_drawn_before_the_region(self):
        """The other direction: a region drawn AFTER its buildings must still
        pick them up, not just ones promoted afterward."""
        region_doc = location.build_location(region_item(), "test-district", self.g)
        site_doc = location.build_location(site_item(), "test-site", self.g)
        far_doc = location.build_location(
            site_item(local_id="s2", ring=SITE_OUTSIDE), "test-far", self.g)

        location.recompute_region_contents(region_doc, [site_doc, far_doc])
        self.assertEqual(region_doc["derived"]["containsRefs"], ["test-site"])

    def test_recompute_ignores_other_regions_and_itself(self):
        region_doc = location.build_location(region_item(), "test-district", self.g)
        other_region = location.build_location(region_item(), "other-district", self.g)
        location.recompute_region_contents(region_doc, [other_region, region_doc])
        self.assertEqual(region_doc["derived"]["containsRefs"], [])

    def test_recompute_refuses_on_a_non_region(self):
        site_doc = location.build_location(site_item(), "test-site", self.g)
        with self.assertRaises(location.PromotionError):
            location.recompute_region_contents(site_doc, [])


class TestValidateForPromotion(unittest.TestCase):
    def test_a_named_item_with_no_note_is_promotable(self):
        item = session.make_item("s1", "site", {"kind": "polygon", "ringPx": SITE_INSIDE},
                                 name="Something")
        self.assertEqual(location.validate_for_promotion(item), [])

    def test_a_noted_item_with_no_name_is_promotable(self):
        item = session.make_item("s1", "site", {"kind": "polygon", "ringPx": SITE_INSIDE},
                                 note="rough note")
        self.assertEqual(location.validate_for_promotion(item), [])

    def test_neither_name_nor_note_is_refused(self):
        """The exact state of item-14/item-15 in a real early session: adopted
        by clicking, nothing written yet. Promoting this would create an
        unlabelled entry with nothing to write lore from."""
        item = session.make_item("s1", "site", {"kind": "polygon", "ringPx": SITE_INSIDE})
        problems = location.validate_for_promotion(item)
        self.assertTrue(problems)
        self.assertIn("no name and no note", problems[0])


if __name__ == "__main__":
    unittest.main()
