"""Tests for tools/stage-assets/stage_assets.py.

Python stdlib unittest, run separately from `npm test` (which stays Node-only),
exactly like test/city-map:

    python -m unittest discover -s test/stage-assets -t test/stage-assets

The interesting assertions are about the two things that fail SILENTLY in a
running game: an id collision (one image quietly overwriting another, so two
characters share a face and nothing anywhere reports it), and a missing source
(a scene referencing an image that was never written, which renders as an empty
frame with no error in any console).
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "stage-assets")))

import stage_assets  # noqa: E402


MANIFEST = {
    "portraits": [
        {"id": "commander", "source": "character-portraits/a.png"},
        {"id": "caretaker", "source": "character-portraits/b.png"},
    ],
    "scenes": [
        {"id": "stage-demo-bar", "background": "scenes/bar.png"},
        {"id": "stage-demo-void"},
    ],
}


class TestPlan(unittest.TestCase):
    def test_every_portrait_and_every_scene_background_is_planned(self):
        items = stage_assets.plan(MANIFEST)
        self.assertEqual([i.stable_id for i in items], ["commander", "caretaker", "bg-stage-demo-bar"])

    def test_a_scene_with_no_background_is_skipped_rather_than_planned_as_none(self):
        items = stage_assets.plan(MANIFEST)
        self.assertNotIn("bg-stage-demo-void", [i.stable_id for i in items])

    def test_background_ids_are_namespaced_so_a_scene_and_a_character_cannot_collide(self):
        # A scene called "commander" and an NPC called "commander" is not a
        # far-fetched manifest; without the bg- prefix one would silently
        # overwrite the other on disk.
        items = stage_assets.plan({"portraits": [{"id": "x", "source": "p.png"}],
                                   "scenes": [{"id": "x", "background": "s.png"}]})
        self.assertEqual(sorted(i.stable_id for i in items), ["bg-x", "x"])

    def test_two_sources_claiming_one_id_is_an_error_not_a_silent_overwrite(self):
        with self.assertRaises(ValueError) as caught:
            stage_assets.plan({"portraits": [
                {"id": "commander", "source": "a.png"},
                {"id": "commander", "source": "b.png"},
            ]})
        self.assertIn("commander", str(caught.exception))

    def test_the_same_source_named_twice_under_one_id_is_fine(self):
        # A portrait appearing in two scenes is the normal case, not a clash.
        stage_assets.plan({"portraits": [
            {"id": "commander", "source": "a.png"},
            {"id": "commander", "source": "a.png"},
        ]})

    def test_the_staged_filename_is_derived_from_the_id_alone(self):
        # This is the whole contract: when the real asset pipeline renames
        # every source file, nothing that points at assets/stage/<id>.webp moves.
        item = stage_assets.plan(MANIFEST)[0]
        self.assertEqual(item.out_name, "commander.webp")


class TestFit(unittest.TestCase):
    def test_shrinks_to_the_longest_edge_and_keeps_the_aspect(self):
        self.assertEqual(stage_assets.fit((3072, 1536), 1920), (1920, 960))
        self.assertEqual(stage_assets.fit((896, 1344), 768), (512, 768))

    def test_never_upscales(self):
        # An upscale produces a large file that looks exactly as soft as the
        # small original — the worst of both, and invisible in a listing.
        self.assertEqual(stage_assets.fit((400, 300), 1920), (400, 300))

    def test_a_degenerate_size_still_produces_at_least_one_pixel(self):
        self.assertEqual(stage_assets.fit((4000, 1), 100), (100, 1))


class TestStage(unittest.TestCase):
    def _manifest_file(self, data):
        path = os.path.join(self.tmp, "manifest.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(data, handle)
        return path

    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.tmp = self._dir.name
        self.addCleanup(self._dir.cleanup)

    def test_a_missing_source_is_reported_rather_than_passed_over(self):
        report = stage_assets.stage(
            self._manifest_file(MANIFEST),
            os.path.join(self.tmp, "in-tray-that-does-not-exist"),
            os.path.join(self.tmp, "out"),
        )
        self.assertEqual([m["id"] for m in report["missing"]], ["commander", "caretaker", "bg-stage-demo-bar"])
        self.assertEqual(report["staged"], [])

    def test_check_mode_writes_nothing_at_all(self):
        intray = os.path.join(self.tmp, "in-tray", "character-portraits")
        os.makedirs(intray)
        open(os.path.join(intray, "a.png"), "wb").close()
        out = os.path.join(self.tmp, "out")
        report = stage_assets.stage(
            self._manifest_file({"portraits": [{"id": "commander", "source": "character-portraits/a.png"}]}),
            os.path.join(self.tmp, "in-tray"),
            out,
            check_only=True,
        )
        self.assertEqual([s["id"] for s in report["skipped"]], ["commander"])
        self.assertFalse(os.path.exists(out), "--check created the output directory")

    def test_the_exit_code_fails_when_a_source_is_missing(self):
        # A scene pointing at an image that was never written renders as a
        # blank frame with no error anywhere, so this must not exit 0.
        code = stage_assets.main([
            "--manifest", self._manifest_file(MANIFEST),
            "--in-tray", os.path.join(self.tmp, "nope"),
            "--out", os.path.join(self.tmp, "out"),
        ])
        self.assertEqual(code, 1)


class TestRealManifest(unittest.TestCase):
    """The committed manifest itself must stay coherent."""

    def setUp(self):
        with open(stage_assets.DEFAULT_MANIFEST, encoding="utf-8") as handle:
            self.manifest = json.load(handle)

    def test_it_plans_without_an_id_collision(self):
        stage_assets.plan(self.manifest)

    def test_every_scene_names_a_layout_the_stage_understands(self):
        known = {"line", "conversation", "pair", "group-left", "group-right"}
        for scene in self.manifest["scenes"]:
            self.assertIn(scene["layout"], known, f"{scene['id']} asks for an unknown layout")

    def test_every_cast_member_points_at_a_portrait_that_exists_in_the_manifest(self):
        ids = {p["id"] for p in self.manifest["portraits"]}
        for scene in self.manifest["scenes"]:
            for member in scene["cast"]:
                self.assertIn(member["portraitId"], ids, f"{scene['id']} casts an unknown portrait")

    def test_the_conversation_scene_actually_puts_someone_on_each_side(self):
        scene = next(s for s in self.manifest["scenes"] if s["layout"] == "conversation")
        sides = {member.get("side") for member in scene["cast"]}
        self.assertEqual(sides, {"left", "right"})


if __name__ == "__main__":
    unittest.main()
