"""The "Copy for Claude" document builder.

See tools/gazetteer/core/handoff.py's own docstring for the cost this
replaces: two throwaway scripts, six manual crop renders, and one typed
sentence carrying none of the context Claude then had to compute by hand.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import handoff  # noqa: E402


def region(local_id, name="", brief="", constraints=None, contains=None, neighbours=None):
    return {
        "localId": local_id, "tier": "region", "name": name,
        "brief": brief, "constraints": constraints or [], "note": "", "tags": [],
        "derived": {"ref": "C4·11", "containsRefs": contains or [],
                   "neighbourRefs": neighbours or [], "areaM2": 4000},
    }


def site(local_id, within=None, name="", note="", tags=None, locked=False):
    return {
        "localId": local_id, "tier": "site", "name": name, "note": note,
        "tags": tags or [], "locked": locked,
        "derived": {"ref": "C4·12", "withinRegionRef": within},
    }


class TestBuildItemSection(unittest.TestCase):

    def test_a_site_names_its_region_and_carries_the_note(self):
        r = region("r1", name="The Yards", brief="Pure military.")
        s = site("s1", within="r1", name="Shed", note="a store shed")
        doc = handoff.build_item_section(s, regions_by_id={"r1": r})
        self.assertIn("The Yards", doc)
        self.assertIn("Pure military.", doc)
        self.assertIn("a store shed", doc)
        self.assertIn("Shed", doc)

    def test_a_site_with_no_region_says_so_plainly(self):
        s = site("s1", within=None)
        doc = handoff.build_item_section(s, regions_by_id={})
        self.assertIn("outside every drawn region", doc)

    def test_a_locked_item_is_marked(self):
        s = site("s1", locked=True)
        doc = handoff.build_item_section(s, regions_by_id={})
        self.assertIn("Locked", doc)

    def test_an_empty_note_says_so_rather_than_showing_blank(self):
        s = site("s1", note="")
        doc = handoff.build_item_section(s, regions_by_id={})
        self.assertIn("no note yet", doc)

    def test_a_region_reports_what_it_contains_and_borders(self):
        r2 = region("r2", name="The Docks")
        r1 = region("r1", name="The Yards", contains=["s1", "s2"], neighbours=["r2"])
        doc = handoff.build_item_section(r1, regions_by_id={"r1": r1, "r2": r2})
        self.assertIn("Contains:** 2", doc)
        self.assertIn("The Docks", doc)

    def test_shape_report_lines_are_included_when_given(self):
        s = site("s1")
        shape_report = {"shape": "sliver", "maxDepth": "sketch",
                        "reasons": ["334 m long and only 4.3 m across."]}
        doc = handoff.build_item_section(s, regions_by_id={}, shape_report=shape_report)
        self.assertIn("sliver", doc)
        self.assertIn("334 m long", doc)

    def test_depth_report_shows_what_is_missing(self):
        s = site("s1")
        depth_report = {"depth": "scene", "missing": ["playerFacing", "gmOnly"], "words": 12}
        doc = handoff.build_item_section(s, regions_by_id={}, depth_report=depth_report)
        self.assertIn("Still owes", doc)
        self.assertIn("playerFacing", doc)

    def test_depth_report_shows_complete_when_nothing_is_missing(self):
        s = site("s1")
        depth_report = {"depth": "named", "missing": [], "words": 20}
        doc = handoff.build_item_section(s, regions_by_id={}, depth_report=depth_report)
        self.assertIn("Complete", doc)

    def test_tags_are_listed_when_present(self):
        s = site("s1", tags=["military", "waterfront"])
        doc = handoff.build_item_section(s, regions_by_id={})
        self.assertIn("military, waterfront", doc)


class TestBuild(unittest.TestCase):

    def test_builds_one_section_per_selected_item_in_order(self):
        items = [site("s1", name="First"), site("s2", name="Second")]
        doc = handoff.build(items, ["s2", "s1"])
        self.assertLess(doc.index("Second"), doc.index("First"))

    def test_a_missing_id_is_reported_not_silently_dropped(self):
        items = [site("s1")]
        doc = handoff.build(items, ["s1", "ghost"])
        self.assertIn("ghost", doc)
        self.assertIn("not found", doc)

    def test_an_optional_session_note_is_included_up_top(self):
        items = [site("s1", name="Shed")]
        doc = handoff.build(items, ["s1"], session_note="Tonight: The Yards.")
        self.assertIn("Tonight: The Yards.", doc)
        self.assertLess(doc.index("Tonight"), doc.index("Shed"))

    def test_a_region_in_the_selection_describes_itself_not_its_container(self):
        # The actual bug this test caught: a region handed off on its own
        # was reported as "outside every drawn region" (the phrasing for a
        # BUILDING with no district) instead of showing its own brief.
        r = region("r1", name="The Yards", brief="Pure military.",
                  constraints=["no-civilians"])
        doc = handoff.build([r], ["r1"])
        self.assertIn("Pure military.", doc)
        self.assertIn("no-civilians", doc)
        self.assertNotIn("outside every drawn region", doc)

    def test_the_heading_counts_are_correct_for_one_and_for_many(self):
        one = handoff.build([site("s1")], ["s1"])
        self.assertIn("1 item\n", one.split("—")[1][:20] + "\n")
        many = handoff.build([site("s1"), site("s2")], ["s1", "s2"])
        self.assertIn("2 items", many)

    def test_shape_and_depth_reports_are_matched_up_by_localId(self):
        items = [site("s1"), site("s2")]
        doc = handoff.build(
            items, ["s1", "s2"],
            shape_reports={"s1": {"shape": "blocky", "maxDepth": "scene", "reasons": []}},
            depth_reports={"s2": {"depth": "named", "missing": [], "words": 5}})
        self.assertIn("blocky", doc)
        self.assertIn("Complete", doc)

    def test_an_empty_selection_still_produces_a_valid_document(self):
        doc = handoff.build([site("s1")], [])
        self.assertIn("0 items", doc)


if __name__ == "__main__":
    unittest.main()


def promoted_location(location_id="deep-storage", summary="A bunker warehouse under the crane yard.",
                      status="drafted", source_local_id="s1"):
    return {
        "id": location_id, "tier": "site", "name": "Deep Storage",
        "authoring": {"note": "rough note", "status": status},
        "lore": {"summary": summary, "playerFacing": "x", "gmOnly": "y"},
        "derived": {"sourceLocalId": source_local_id},
    }


class TestPromotedItems(unittest.TestCase):
    """The gap Ingram hit: two locations were written in full and promoted,
    he refreshed the Gazetteer, and the handoff still described them as
    owing their entire lore -- because the draft item legitimately still
    holds only his rough note, and nothing said the promotion had happened."""

    def test_a_promoted_item_says_so_and_names_its_file(self):
        s = site("s1", name="Deep Storage", note="rough note")
        doc = handoff.build_item_section(s, regions_by_id={},
                                         location=promoted_location())
        self.assertIn("Promoted", doc)
        self.assertIn("data/locations/deep-storage.json", doc)

    def test_a_promoted_item_carries_the_written_summary_back(self):
        """So the next conversation starts from what exists rather than
        rewriting it from the stub."""
        s = site("s1", name="Deep Storage", note="rough note")
        doc = handoff.build_item_section(
            s, regions_by_id={},
            location=promoted_location(summary="A bunker under the crane yard."))
        self.assertIn("Written summary", doc)
        self.assertIn("A bunker under the crane yard.", doc)

    def test_the_original_note_is_still_shown_alongside_the_written_lore(self):
        """The note is the brief the lore was written FROM, and stays useful
        context -- the written summary adds to it, never replaces it."""
        s = site("s1", name="Deep Storage", note="anything unusual goes here")
        doc = handoff.build_item_section(s, regions_by_id={},
                                         location=promoted_location())
        self.assertIn("anything unusual goes here", doc)
        self.assertIn("**Note:**", doc)

    def test_an_unpromoted_item_is_unchanged(self):
        s = site("s1", name="Shed", note="a store shed")
        doc = handoff.build_item_section(s, regions_by_id={})
        self.assertNotIn("Promoted", doc)
        self.assertNotIn("Written summary", doc)

    def test_a_promoted_item_is_not_also_labelled_locked(self):
        """Promotion sets `locked`, so both labels would otherwise fire and
        say the same thing twice in two different vocabularies."""
        s = site("s1", name="Deep Storage", locked=True)
        doc = handoff.build_item_section(s, regions_by_id={},
                                         location=promoted_location())
        self.assertIn("Promoted", doc)
        self.assertNotIn("_Locked", doc)

    def test_build_matches_locations_up_by_localId(self):
        a = site("s1", name="Promoted one")
        b = site("s2", name="Draft one")
        doc = handoff.build([a, b], ["s1", "s2"],
                            locations={"s1": promoted_location()})
        promoted_half, draft_half = doc.split("### Draft one")
        self.assertIn("Promoted", promoted_half)
        self.assertNotIn("Promoted", draft_half)
