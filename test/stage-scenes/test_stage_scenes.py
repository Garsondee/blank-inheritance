"""Tests for tools/stage-scenes/stage_scenes.py.

Python stdlib unittest, run separately from `npm test` (which stays Node-only),
exactly like test/token-ring:

    python -m unittest discover -s test/stage-scenes -t test/stage-scenes
"""

import os
import sys
import tempfile
import unittest

from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "stage-scenes")))

import stage_scenes  # noqa: E402


REGISTRY = {
    "assets": [
        {
            "id": "episode-c1e1--the-road-in",
            "kind": "image",
            "category": "scenes",
            "path": "artwork/scenes/episode-c1e1--the-road-in.png",
            "assignedTo": {"kind": "scene", "ref": "episode-c1e1--the-road-in"},
        },
        {
            "id": "location--school-classroom",
            "kind": "image",
            "category": "locations",
            "path": "artwork/locations/location--school-classroom.png",
            "assignedTo": {"kind": "location", "ref": "main-school-complex"},
        },
        {
            # A registered NPC portrait, deliberately not a scene/location --
            # must never be swept up by a scene-backdrop staging pass.
            "id": "taka",
            "kind": "image",
            "category": "character-portraits",
            "path": "artwork/character-portraits/taka.png",
            "assignedTo": {"kind": "npc", "ref": "taka"},
        },
    ]
}


def scene_set(entries):
    return {"scenes": [{"id": e[0], "art": e[1]} for e in entries]}


class PlanTests(unittest.TestCase):
    def test_resolves_each_distinct_art_id_to_its_registered_master(self):
        ss = scene_set([("e1-the-road-in", "episode-c1e1--the-road-in")])
        items = stage_scenes.plan(ss, REGISTRY)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].stable_id, "episode-c1e1--the-road-in")
        self.assertEqual(items[0].source, "artwork/scenes/episode-c1e1--the-road-in.png")

    def test_a_shared_backdrop_is_staged_once_even_if_several_scenes_use_it(self):
        # Two school scenes reusing one classroom picture -- the real shape in
        # this project's own scene-set.json.
        ss = scene_set(
            [
                ("e1-school-first-period", "location--school-classroom"),
                ("e2-school-period-two", "location--school-classroom"),
            ]
        )
        items = stage_scenes.plan(ss, REGISTRY)
        self.assertEqual([i.stable_id for i in items], ["location--school-classroom"])

    def test_an_unresolvable_art_id_is_reported_by_name_not_silently_skipped(self):
        ss = scene_set([("e9-nowhere", "no-such-art-id")])
        with self.assertRaises(ValueError) as ctx:
            stage_scenes.plan(ss, REGISTRY)
        self.assertIn("no-such-art-id", str(ctx.exception))

    def test_every_missing_id_is_named_in_one_error_not_one_at_a_time(self):
        ss = scene_set([("a", "missing-one"), ("b", "missing-two")])
        with self.assertRaises(ValueError) as ctx:
            stage_scenes.plan(ss, REGISTRY)
        message = str(ctx.exception)
        self.assertIn("missing-one", message)
        self.assertIn("missing-two", message)

    def test_an_adopted_scene_is_skipped_even_if_its_art_id_does_not_resolve(self):
        # The real "the-city" hub scene: adoptSceneNamed means the adapter
        # never applies this entry's background at all, so a vestigial/unset
        # art id here must not fail the whole plan.
        ss = {
            "scenes": [
                {"id": "the-city", "art": "campaign-map", "adoptSceneNamed": "Campaign Map"},
                {"id": "e1-the-road-in", "art": "episode-c1e1--the-road-in"},
            ]
        }
        items = stage_scenes.plan(ss, REGISTRY)
        self.assertEqual([i.stable_id for i in items], ["episode-c1e1--the-road-in"])

    def test_a_registered_portrait_is_never_treated_as_scene_backdrop_material(self):
        # If a scene-set entry ever typo'd its way onto a portrait's id, this
        # must fail loudly (portraits are not in ELIGIBLE_CATEGORIES) rather
        # than quietly staging a character's face as a Scene background.
        ss = scene_set([("x", "taka")])
        with self.assertRaises(ValueError) as ctx:
            stage_scenes.plan(ss, REGISTRY)
        self.assertIn("taka", str(ctx.exception))


class StageOneTests(unittest.TestCase):
    def test_resizes_to_the_long_edge_cap_and_writes_webp(self):
        with tempfile.TemporaryDirectory() as tmp:
            src_rel = "art/big.png"
            os.makedirs(os.path.join(tmp, "art"))
            Image.new("RGB", (4000, 2000), (10, 20, 30)).save(os.path.join(tmp, src_rel))

            item = stage_scenes.Item(stable_id="big", source=src_rel)
            out_dir = os.path.join(tmp, "out")
            out_path, before, after = stage_scenes.stage_one(item, tmp, out_dir)

            self.assertTrue(out_path.endswith("big.webp"))
            with Image.open(out_path) as staged:
                self.assertEqual(staged.size, (stage_scenes.MAX_EDGE, stage_scenes.MAX_EDGE // 2))
            self.assertGreater(before, 0)
            self.assertGreater(after, 0)

    def test_leaves_a_smaller_source_at_its_own_size(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "art"))
            Image.new("RGB", (800, 400), (5, 5, 5)).save(os.path.join(tmp, "art", "small.png"))
            item = stage_scenes.Item(stable_id="small", source="art/small.png")
            out_path, _, _ = stage_scenes.stage_one(item, tmp, os.path.join(tmp, "out"))
            with Image.open(out_path) as staged:
                self.assertEqual(staged.size, (800, 400))


class CliTests(unittest.TestCase):
    def test_check_mode_writes_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            reg_path = os.path.join(tmp, "registry.json")
            ss_path = os.path.join(tmp, "scene-set.json")
            out_dir = os.path.join(tmp, "out")
            import json

            with open(reg_path, "w", encoding="utf-8") as fh:
                json.dump(REGISTRY, fh)
            with open(ss_path, "w", encoding="utf-8") as fh:
                json.dump(scene_set([("e1-the-road-in", "episode-c1e1--the-road-in")]), fh)

            code = stage_scenes.main(["--registry", reg_path, "--scene-set", ss_path, "--out", out_dir, "--check"])
            self.assertEqual(code, 0)
            self.assertFalse(os.path.isdir(out_dir))


if __name__ == "__main__":
    unittest.main()
