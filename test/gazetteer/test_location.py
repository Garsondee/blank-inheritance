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

    def test_a_region_with_a_hole_carries_the_hole_into_rings_on_promotion(self):
        # A real case, not a hypothetical: The Open Sea holds The River
        # Island as a hole in its own ring. build_location() used to convert
        # only `ringPx` and silently drop `holesPx`, so a promoted region
        # with an island in it came back solid -- the promoted document
        # disagreed with the draft it was promoted from, and coverage.py's
        # overlap check (which does honour holes) kept reporting the two as
        # overlapping no matter how many times the draft geometry was fixed.
        outer = [[4000, 6000], [6000, 6000], [6000, 8000], [4000, 8000]]  # 2km sq
        hole = [[4800, 6800], [5200, 6800], [5200, 7200], [4800, 7200]]   # 400m sq, centred inside
        item = session.make_item("r2", "region",
                                 {"kind": "polygon", "ringPx": outer, "holesPx": [hole]},
                                 name="Test Sea", note="water with an island in it")
        doc = location.build_location(item, "test-sea", self.g)

        self.assertEqual(len(doc["geometry"]["rings"]), 2)
        self.assertEqual(len(doc["geometry"]["rings"][0]), 4)   # the shell
        self.assertEqual(len(doc["geometry"]["rings"][1]), 4)   # the hole
        for lon, lat in doc["geometry"]["rings"][1]:
            self.assertTrue(135.0 < lon < 135.4)
            self.assertTrue(34.5 < lat < 34.9)

        # derived.imagePx is documented as "same shape as geometry.rings".
        self.assertEqual(len(doc["derived"]["imagePx"]), 2)
        self.assertEqual(doc["derived"]["imagePx"][1], hole)

        # areaM2 is net of the hole, not the solid outer square's area.
        solid_area_m2 = 2000 * 2000 * self.g.metres_per_px ** 2
        hole_area_m2 = 400 * 400 * self.g.metres_per_px ** 2
        self.assertAlmostEqual(doc["derived"]["areaM2"],
                               solid_area_m2 - hole_area_m2, delta=1.0)

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

    def test_scene_and_cross_refs_flow_through_for_a_standing_depth_promotion(self):
        """Regression: build_location used to hardcode scene to all-empty and
        had no parameters for npcRefs/factionRefs/etc, so a location already
        authored all the way to standing depth still had to be promoted bare
        and hand-patched afterwards. Found while promoting Deep Storage and
        the fortress island hospital, both written to standing depth already."""
        item = region_item()
        item["depth"] = "standing"
        doc = location.build_location(
            item, "test-district", self.g,
            scene={
                "hooks": ["A courier goes missing carrying a manifest nobody will name."],
                "activities": ["Watch the loading crews argue over a discrepancy.",
                               "Trade a favour with a clearance clerk.",
                               "Get lost in a level that isn't on the plan."],
                "history": "Built in the boom years, expanded twice since.",
                "consequences": "Word gets back to whoever actually owns this level.",
            },
            npc_refs=["shucks-mordant", "vault-custodian"],
            faction_refs=["directorate"],
            episode_refs=["episode-c1s1--intake-medicals"],
            open_question_refs=["bleed-visibility"],
            bible_ref="locations/deep-storage.md",
            asset_refs=["deep-storage-concept"],
            playlist_refs=["deep-storage-ambience"])
        self.assertEqual(doc["scene"]["hooks"],
                         ["A courier goes missing carrying a manifest nobody will name."])
        self.assertEqual(len(doc["scene"]["activities"]), 3)
        self.assertEqual(doc["scene"]["history"], "Built in the boom years, expanded twice since.")
        self.assertEqual(doc["scene"]["consequences"],
                         "Word gets back to whoever actually owns this level.")
        self.assertEqual(doc["npcRefs"], ["shucks-mordant", "vault-custodian"])
        self.assertEqual(doc["factionRefs"], ["directorate"])
        self.assertEqual(doc["episodeRefs"], ["episode-c1s1--intake-medicals"])
        self.assertEqual(doc["openQuestionRefs"], ["bleed-visibility"])
        self.assertEqual(doc["bibleRef"], "locations/deep-storage.md")
        self.assertEqual(doc["assetRefs"], ["deep-storage-concept"])
        self.assertEqual(doc["playlistRefs"], ["deep-storage-ambience"])

    def test_scene_and_cross_refs_default_to_empty_when_not_supplied(self):
        """The old hardcoded-empty behaviour is still correct as a DEFAULT --
        this only had to become overridable, not stop being the default for a
        location promoted with nothing but geometry and a note."""
        doc = location.build_location(region_item(), "test-district", self.g)
        self.assertEqual(doc["scene"], {"hooks": [], "activities": [], "history": "", "consequences": ""})
        self.assertEqual(doc["npcRefs"], [])
        self.assertEqual(doc["factionRefs"], [])
        self.assertEqual(doc["episodeRefs"], [])
        self.assertEqual(doc["openQuestionRefs"], [])
        self.assertIsNone(doc["bibleRef"])
        self.assertEqual(doc["assetRefs"], [])
        self.assertEqual(doc["playlistRefs"], [])

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


class TestRePromotion(unittest.TestCase):
    """Re-promoting an existing location -- what happens when a place is
    re-tiered or rewritten and pushed through promotion a second time."""

    def setUp(self):
        self.g = georef()

    def test_a_location_is_never_found_inside_itself(self):
        """Found live: Deep Storage was drawn as a region, promoted, then
        re-tiered to a site by hand and re-promoted. Its own previous
        (region) version was still on disk and still in the existing-regions
        list, so its centroid matched its own footprint and it came back
        with withinRegionRef pointing at "deep-storage"."""
        previous_version_of_itself = location.build_location(
            region_item(), "deep-storage", self.g)
        doc = location.build_location(
            site_item(), "deep-storage", self.g,
            existing_regions=[previous_version_of_itself])
        self.assertIsNone(doc["derived"]["withinRegionRef"],
                          "a location must never be its own container")

    def test_a_genuine_container_is_still_found_alongside_the_old_self(self):
        """The exclusion must be by id only -- a real surrounding region in
        the same list still has to win, or the fix would break containment."""
        old_self = location.build_location(region_item(), "the-site", self.g)
        real_region = location.build_location(region_item(), "the-district", self.g)
        doc = location.build_location(
            site_item(), "the-site", self.g,
            existing_regions=[old_self, real_region])
        self.assertEqual(doc["derived"]["withinRegionRef"], "the-district")


class TestClassification(unittest.TestCase):
    """Site classification -- design/strategy-layer.md's Site Classification
    section, added 2026-09-12 alongside The Rock, the first site to carry it.
    A different axis from Clearance rungs: whether a place's EXISTENCE is
    secret, not how deep a party who already knows it exists may go."""

    def setUp(self):
        self.g = georef()

    def test_classification_defaults_to_none(self):
        doc = location.build_location(region_item(), "test-district", self.g)
        self.assertIsNone(doc["classification"])

    def test_classification_is_carried_when_given(self):
        doc = location.build_location(
            region_item(), "test-district", self.g, classification="omega-zero")
        self.assertEqual(doc["classification"], "omega-zero")

    def test_classification_has_no_item_side_default_to_carry(self):
        """Unlike tags, there is nothing on a session item to fall back to --
        an item with an unrelated field that happens to be called
        'classification' must not leak into the promoted document."""
        item = region_item()
        item["classification"] = "top-secret"
        doc = location.build_location(item, "test-district", self.g)
        self.assertIsNone(doc["classification"],
                          "classification must come from the caller alone, never the item")


class TestRank(unittest.TestCase):
    """Plot rank -- design/location-rank.md. A separate axis from depth:
    depth is how much has been written, rank is how much process the place
    earns. 1 is the most important."""

    def setUp(self):
        self.g = georef()

    def test_rank_defaults_to_none_meaning_not_yet_ranked(self):
        doc = location.build_location(region_item(), "test-district", self.g)
        self.assertIsNone(doc["rank"])

    def test_rank_is_carried_when_given(self):
        doc = location.build_location(region_item(), "test-district", self.g, rank=1)
        self.assertEqual(doc["rank"], 1)

    def test_rank_is_independent_of_depth(self):
        """The whole reason it is a second field: somewhere seen once can be
        pivotal, and somewhere returned to constantly can be incidental."""
        item = region_item()
        item["depth"] = "sketch"
        doc = location.build_location(item, "test-district", self.g, rank=1)
        self.assertEqual(doc["depth"], "sketch")
        self.assertEqual(doc["rank"], 1)


class TestResyncRegionGeometry(unittest.TestCase):
    """core/reconcile.py trims or grows a DRAFT region item's ringPx; this
    is the other half -- carrying that same change into the region's
    already-promoted twin, since promotion copies geometry once and
    nothing keeps the two in sync on its own."""

    def setUp(self):
        self.g = georef()

    def test_geometry_and_geometry_derived_fields_follow_the_new_ring(self):
        item = region_item()
        doc = location.build_location(item, "test-district", self.g,
                                      lore={"summary": "a real district"})
        original_rings = doc["geometry"]["rings"]

        shrunk = dict(item, geometry={"kind": "polygon",
                                      "ringPx": [[4400, 6400], [4900, 6400],
                                                [4900, 6900], [4400, 6900]]})
        location.resync_region_geometry(doc, shrunk, self.g)

        self.assertNotEqual(doc["geometry"]["rings"], original_rings)
        self.assertAlmostEqual(doc["derived"]["areaM2"], 500 * 500, delta=1.0)
        self.assertGreater(len(doc["derived"]["cells"]), 0)
        self.assertEqual(doc["derived"]["ref"], doc["derived"]["cells"][0])

    def test_everything_that_is_not_geometry_survives_untouched(self):
        item = region_item()
        doc = location.build_location(
            item, "test-district", self.g,
            lore={"summary": "written lore", "playerFacing": "what a player sees"},
            name="The Real Name", npc_refs=["some-npc"], rank=2)
        doc["authoring"]["status"] = "approved"

        shrunk = dict(item, geometry={"kind": "polygon",
                                      "ringPx": [[4400, 6400], [4900, 6400],
                                                [4900, 6900], [4400, 6900]]})
        location.resync_region_geometry(doc, shrunk, self.g)

        self.assertEqual(doc["name"], "The Real Name")
        self.assertEqual(doc["lore"]["summary"], "written lore")
        self.assertEqual(doc["lore"]["playerFacing"], "what a player sees")
        self.assertEqual(doc["npcRefs"], ["some-npc"])
        self.assertEqual(doc["rank"], 2)
        self.assertEqual(doc["authoring"]["status"], "approved")

    def test_a_grown_ring_with_a_hole_carries_the_hole_across(self):
        item = region_item()
        doc = location.build_location(item, "test-district", self.g)
        with_hole = dict(item, geometry={
            "kind": "polygon", "ringPx": REGION_RING,
            "holesPx": [[[4700, 6700], [4900, 6700], [4900, 6900], [4700, 6900]]]})
        location.resync_region_geometry(doc, with_hole, self.g)
        self.assertEqual(len(doc["geometry"]["rings"]), 2, "shell plus one hole")

    def test_refuses_a_non_region_document(self):
        item = site_item()
        doc = location.build_location(item, "test-site", self.g)
        with self.assertRaises(location.PromotionError):
            location.resync_region_geometry(doc, item, self.g)
