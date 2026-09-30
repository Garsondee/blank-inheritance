"""What in a session needs attention, grouped by district.

See tools/gazetteer/core/queue.py's own docstring for why this exists: before
it, the only way to know what still needed writing was to scroll a flat list
looking for blanks, or be told in conversation.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

from core import queue  # noqa: E402


def region(local_id, name="", brief="", constraints=None):
    return {"localId": local_id, "tier": "region", "name": name,
           "brief": brief, "constraints": constraints or []}


def site(local_id, within, name="", note="", locked=False):
    return {"localId": local_id, "tier": "site", "name": name, "note": note,
           "locked": locked, "derived": {"withinRegionRef": within}}


class TestRegionSummary(unittest.TestCase):

    def test_counts_locked_and_unwritten(self):
        r = region("r1", name="The Yards")
        members = [
            site("s1", "r1", name="Shed", note="a shed", locked=True),
            site("s2", "r1", name="", note=""),
            site("s3", "r1", name="Hut", note="?"),
        ]
        summary = queue.region_summary(r, members)
        self.assertEqual(summary["total"], 3)
        self.assertEqual(summary["locked"], 1)
        self.assertEqual(summary["needsNameCount"], 1)
        # "?" is 1 char, under MIN_NOTE_CHARS -- still counted as needing a
        # real note, unlike a three-word note which would pass.
        self.assertEqual(summary["needsNoteCount"], 2)

    def test_a_short_but_real_note_counts_as_written(self):
        r = region("r1")
        members = [site("s1", "r1", note="guard hut")]
        self.assertEqual(queue.region_summary(r, members)["needsNoteCount"], 0)

    def test_has_brief_reflects_a_non_blank_brief(self):
        self.assertTrue(queue.region_summary(
            region("r1", brief="Pure military."), [])["hasBrief"])
        self.assertFalse(queue.region_summary(region("r1", brief="  "), [])["hasBrief"])
        self.assertFalse(queue.region_summary(region("r1"), [])["hasBrief"])


class TestBuild(unittest.TestCase):

    def test_sites_are_grouped_under_their_region(self):
        items = [
            region("r1", name="A"), region("r2", name="B"),
            site("s1", "r1"), site("s2", "r1"), site("s3", "r2"),
        ]
        result = queue.build(items)
        by_id = {r["localId"]: r for r in result["regions"]}
        self.assertEqual(by_id["r1"]["total"], 2)
        self.assertEqual(by_id["r2"]["total"], 1)

    def test_a_site_with_no_containing_region_is_unassigned_not_dropped(self):
        items = [region("r1", name="A"), site("stray", None)]
        result = queue.build(items)
        self.assertEqual(result["unassignedIds"], ["stray"])
        self.assertEqual(result["regions"][0]["total"], 0)

    def test_a_site_pointing_at_a_region_that_no_longer_exists_is_unassigned(self):
        # The tier could have changed underneath it since containment last
        # ran; a stale reference must not crash the queue.
        items = [site("s1", "ghost-region")]
        result = queue.build(items)
        self.assertEqual(result["unassignedIds"], ["s1"])

    def test_needs_attention_ranks_the_biggest_backlog_first(self):
        items = [
            region("r1", name="Small", brief="x"),
            region("r2", name="Big", brief="x"),
            site("s1", "r1", note=""),
            site("s2", "r2", note=""), site("s3", "r2", note=""), site("s4", "r2", note=""),
        ]
        result = queue.build(items)
        self.assertEqual(result["needsAttention"][0]["localId"], "r2")

    def test_a_region_with_no_brief_is_flagged_even_if_fully_locked(self):
        items = [
            region("r1", name="Unbriefed"),
            site("s1", "r1", note="done", locked=True),
        ]
        result = queue.build(items)
        self.assertEqual(result["regionsWithNoBrief"], 1)
        self.assertIn("r1", [r["localId"] for r in result["needsAttention"]])

    def test_a_fully_written_briefed_region_is_not_flagged(self):
        items = [
            region("r1", name="Done", brief="x"),
            site("s1", "r1", note="done", name="A"),
        ]
        result = queue.build(items)
        self.assertEqual(result["needsAttention"], [])

    def test_totals_count_every_site_and_point_including_unassigned(self):
        items = [
            region("r1", name="A", brief="x"),
            site("s1", "r1", note=""), site("s2", None, note=""),
            {"localId": "p1", "tier": "point", "name": "", "note": "",
             "locked": False, "derived": {"withinRegionRef": None}},
        ]
        result = queue.build(items)
        self.assertEqual(result["totalNeedsNote"], 3)
        self.assertEqual(result["pointCount"], 1)
        self.assertEqual(result["siteCount"], 2)

    def test_an_empty_draft_does_not_crash(self):
        result = queue.build([])
        self.assertEqual(result["regionCount"], 0)
        self.assertEqual(result["needsAttention"], [])


if __name__ == "__main__":
    unittest.main()
