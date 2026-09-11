"""The location depth contract, server side.

The claim: tools/gazetteer/core/depth.py agrees with core/depth.mjs on every
case in test/fixtures/gazetteer-depth-cases.json. Both suites read that same
file, so neither implementation can be quietly "fixed" into agreement with
itself -- a disagreement fails on both sides at once.

Why the pair exists at all: the browser runs this check live in the inspector
to say what a location still owes at its declared depth, and this half runs it
at promotion. Drift means the tool calls a location finished and the promotion
path refuses it, or lets a depth-3 location through with no history section.

Specification: design/location-depth.md.
JS half: test/gazetteer-depth.test.mjs.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import depth as depth_mod  # noqa: E402

_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures",
                             "gazetteer-depth-cases.json")
with open(_FIXTURE_PATH, encoding="utf-8") as fh:
    FIXTURE = json.load(fh)


class TestFixtureItself(unittest.TestCase):
    def test_the_fixture_is_actually_populated(self):
        self.assertGreaterEqual(len(FIXTURE["cases"]), 10)
        self.assertGreaterEqual(len(FIXTURE["suggestCases"]), 3)

    def test_the_fixture_is_reachable_from_the_path_the_js_suite_uses(self):
        """Both halves must read the same file, not two copies of it."""
        self.assertTrue(os.path.exists(_FIXTURE_PATH))


class TestSharedFixture(unittest.TestCase):
    def test_every_case_checks_exactly_as_specified(self):
        for case in FIXTURE["cases"]:
            with self.subTest(why=case["why"]):
                got = depth_mod.check(case["doc"])
                expect = case["expect"]

                if "known" in expect:
                    self.assertEqual(got["known"], expect["known"])
                if "depth" in expect:
                    self.assertEqual(got["depth"], expect["depth"])

                self.assertEqual(got["ok"], expect["ok"],
                                 "missing: %s" % "; ".join(got["missing"]))

                if "missing" in expect:
                    self.assertEqual(got["missing"], expect["missing"])
                if "missingCount" in expect:
                    self.assertEqual(len(got["missing"]), expect["missingCount"],
                                     "got: %s" % "; ".join(got["missing"]))
                if "overweightCount" in expect:
                    self.assertEqual(len(got["overweight"]), expect["overweightCount"],
                                     "got: %s" % "; ".join(got["overweight"]))
                if "orphanedCount" in expect:
                    self.assertEqual(len(got["orphaned"]), expect["orphanedCount"],
                                     "got: %s" % "; ".join(got["orphaned"]))
                if "summaryWords" in expect:
                    self.assertEqual(got["summaryWords"], expect["summaryWords"])

    def test_suggest_depth_reports_the_deepest_rung_already_satisfied(self):
        for case in FIXTURE["suggestCases"]:
            with self.subTest(why=case["why"]):
                self.assertEqual(depth_mod.suggest_depth(case["doc"]), case["expect"])


class TestLadderShape(unittest.TestCase):
    def test_requirements_only_ever_grow_with_depth(self):
        """The property the ladder rests on, and what lets suggest_depth stop
        at the deepest passing rung: anything a shallow depth demands, every
        deeper one demands too."""
        for shallower, deeper in zip(depth_mod.DEPTHS, depth_mod.DEPTHS[1:]):
            a = depth_mod.SPEC[shallower]
            b = depth_mod.SPEC[deeper]
            for field in a["text"]:
                self.assertIn(field, b["text"],
                              "%s dropped %r which %s requires" % (deeper, field, shallower))
            for name, least in a["lists"].items():
                self.assertGreaterEqual(b["lists"].get(name, 0), least,
                                        "%s asks for less %r than %s" % (deeper, name, shallower))

    def test_every_depth_has_a_label_for_everything_it_requires(self):
        """A missing label would surface in the UI as a blank obligation."""
        for name, spec in depth_mod.SPEC.items():
            for field in list(spec["text"]) + list(spec["lists"]):
                self.assertIn(field, depth_mod.LABELS,
                              "%s requires %r with no human-readable label" % (name, field))

    def test_the_depth_zero_ceiling_still_fits_real_depth_zero_entries(self):
        """Regression guard on the retune recorded in the spec: first guessed
        at 40 words, which flagged 19 of the 36 entries that define the
        standard. Anything back under the observed p90 breaks the same way."""
        self.assertGreaterEqual(depth_mod.SPEC["named"]["total_words"], 62)


class TestTheLadderIsNamedOnceEverywhere(unittest.TestCase):
    def test_session_and_depth_agree_on_the_rungs(self):
        """session.py validates a draft item's depth against its own copy of
        the list. If the two drift, make_item starts refusing a rung the
        checker considers perfectly valid."""
        from core import session as session_mod
        self.assertEqual(tuple(session_mod.DEPTHS), tuple(depth_mod.DEPTHS))

    def test_the_schema_offers_exactly_these_rungs(self):
        """A location file could otherwise declare a depth the checker knows
        nothing about, or be refused one the checker accepts."""
        here = os.path.dirname(__file__)
        schema_path = os.path.join(here, "..", "..", "data", "schema", "location.schema.json")
        with open(schema_path, encoding="utf-8") as fh:
            schema = json.load(fh)
        self.assertEqual(tuple(schema["properties"]["depth"]["enum"]),
                         tuple(depth_mod.DEPTHS))


class TestNormalisation(unittest.TestCase):
    def test_a_session_items_flat_note_counts_as_its_summary(self):
        """What lets the same check run while drafting, before anything has a
        lore block at all."""
        item = {"name": "Gate Post", "kind": "military", "note": "A booth and a barrier arm."}
        self.assertEqual(depth_mod.normalise(item)["summary"], "A booth and a barrier arm.")
        self.assertTrue(depth_mod.check(item)["ok"])

    def test_a_real_lore_summary_wins_over_the_draft_note(self):
        doc = {"name": "X", "kind": "civic", "note": "rough", "lore": {"summary": "written"}}
        self.assertEqual(depth_mod.normalise(doc)["summary"], "written")

    def test_list_entries_count_toward_the_word_budget(self):
        """Otherwise the ceiling is sidestepped by moving prose into twenty
        listed activities."""
        lean = {"name": "X", "kind": "civic", "depth": "named", "note": "Short."}
        self.assertEqual(depth_mod.check(lean)["words"], 1)
        padded = dict(lean, scene={"activities": ["word " * 100]})
        self.assertGreater(depth_mod.check(padded)["words"], 90)


if __name__ == "__main__":
    unittest.main()
