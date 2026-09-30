"""Tests for tools/token-ring/stage_npc_portraits.py.

Python stdlib unittest, run separately from `npm test`, exactly like this
directory's other suite:

    python -m unittest discover -s test/token-ring -t test/token-ring

This script is deliberately the "everything crop_ring_subject.py is NOT" of
the pair: same registry, same eligible-portrait plan, but an ordinary
rectangular resize instead of a circle-masked square. The interesting
assertions here are therefore (1) that it reuses crop_ring_subject's own
plan() rather than re-implementing eligibility/tie-breaking, and (2) that the
output is a plain resized rectangle -- no alpha channel, no masking, aspect
ratio preserved -- since a NPC sheet or Theatre-of-Mind frame wants the
source portrait's real shape, not a token-shaped crop.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "token-ring")))

import stage_npc_portraits  # noqa: E402
import crop_ring_subject  # noqa: E402


REGISTRY = {
    "assets": [
        {
            "id": "shucks-mordant",
            "kind": "image",
            "category": "character-portraits",
            "path": "artwork/character-portraits/shucks-mordant.png",
            "assignedTo": {"kind": "npc", "ref": "shucks-mordant"},
        },
        {
            "id": "shucks-mordant--hand-detail",
            "kind": "image",
            "category": "character-portraits",
            "path": "artwork/character-portraits/shucks-mordant--hand-detail.png",
            "assignedTo": {"kind": "npc", "ref": "shucks-mordant"},
        },
        {
            "id": "episode-c1e1--the-road-in",
            "kind": "image",
            "category": "scenes",
            "path": "artwork/scenes/episode-c1e1--the-road-in.png",
            "assignedTo": {"kind": "scene", "ref": "episode-c1e1--the-road-in"},
        },
    ]
}


class TestPlan(unittest.TestCase):
    def test_plan_matches_crop_ring_subjects_own_plan_exactly(self):
        # The two tools must never disagree about which portrait belongs to
        # which id -- this is the whole point of reusing plan() rather than
        # re-deriving it.
        ours = [(i.stable_id, i.source) for i in stage_npc_portraits.plan(REGISTRY)]
        theirs = [(i.stable_id, i.source) for i in crop_ring_subject.plan(REGISTRY)]
        self.assertEqual(sorted(ours), sorted(theirs))

    def test_a_scene_background_is_not_planned(self):
        items = stage_npc_portraits.plan(REGISTRY)
        self.assertNotIn("episode-c1e1--the-road-in", [i.stable_id for i in items])

    def test_companion_detail_shot_is_not_an_ambiguity(self):
        items = {i.stable_id: i for i in stage_npc_portraits.plan(REGISTRY)}
        self.assertEqual(items["shucks-mordant"].source, "artwork/character-portraits/shucks-mordant.png")


class TestFit(unittest.TestCase):
    def test_smaller_than_max_edge_is_unchanged(self):
        self.assertEqual(stage_npc_portraits.fit((400, 300), 768), (400, 300))

    def test_never_scales_up(self):
        self.assertEqual(stage_npc_portraits.fit((100, 50), 768), (100, 50))

    def test_scales_down_preserving_aspect_ratio(self):
        width, height = stage_npc_portraits.fit((1536, 1024), 768)
        self.assertEqual(max(width, height), 768)
        self.assertAlmostEqual(width / height, 1536 / 1024, places=3)

    def test_a_tall_portrait_scales_by_its_longer_edge(self):
        width, height = stage_npc_portraits.fit((900, 1350), 768)
        self.assertEqual(height, 768)
        self.assertEqual(width, round(900 * 768 / 1350))


class TestStage(unittest.TestCase):
    def setUp(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow not installed")
        self.Image = Image
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)

    def _registry_path(self, registry):
        import json

        path = os.path.join(self.tmpdir.name, "registry.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(registry, handle)
        return path

    def test_output_is_an_ordinary_rgb_resize_not_masked(self):
        source_path = os.path.join(self.tmpdir.name, "source.png")
        self.Image.new("RGB", (900, 1350), (10, 120, 90)).save(source_path)

        registry = {"assets": [{"category": "character-portraits", "path": "source.png", "assignedTo": {"kind": "npc", "ref": "x"}}]}
        registry_path = self._registry_path(registry)

        out_dir = os.path.join(self.tmpdir.name, "out")
        # stage() resolves sources relative to REPO_ROOT, so point it at the temp dir directly.
        original_root = stage_npc_portraits.REPO_ROOT
        stage_npc_portraits.REPO_ROOT = self.tmpdir.name
        try:
            report = stage_npc_portraits.stage(registry_path, out_dir)
        finally:
            stage_npc_portraits.REPO_ROOT = original_root

        self.assertEqual(report["missing"], [])
        self.assertEqual(len(report["staged"]), 1)
        with self.Image.open(os.path.join(out_dir, "x.webp")) as out:
            self.assertEqual(out.mode, "RGB", "a sheet/frame portrait must not carry a ring-style alpha mask")
            self.assertEqual(out.size, (512, 768), "768 max edge, aspect ratio preserved from the 900x1350 source")

    def test_a_missing_source_is_reported_rather_than_silently_skipped(self):
        registry = {"assets": [{"category": "character-portraits", "path": "nope.png", "assignedTo": {"kind": "npc", "ref": "nobody"}}]}
        registry_path = self._registry_path(registry)
        out_dir = os.path.join(self.tmpdir.name, "out")

        report = stage_npc_portraits.stage(registry_path, out_dir)
        self.assertEqual(report["missing"], [{"id": "nobody", "source": "nope.png"}])
        self.assertEqual(report["staged"], [])

    def test_check_mode_writes_nothing(self):
        registry_path = self._registry_path({"assets": []})
        out_dir = os.path.join(self.tmpdir.name, "out")

        stage_npc_portraits.stage(registry_path, out_dir, check_only=True)
        self.assertFalse(os.path.exists(out_dir), "--check must not even create the output directory")


if __name__ == "__main__":
    unittest.main()
