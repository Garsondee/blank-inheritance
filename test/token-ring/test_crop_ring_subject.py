"""Tests for tools/token-ring/crop_ring_subject.py.

Python stdlib unittest, run separately from `npm test` (which stays Node-only),
exactly like test/stage-assets:

    python -m unittest discover -s test/token-ring -t test/token-ring

The interesting assertions are about the two things Foundry's own Dynamic
Ring renderer does NOT do for you (confirmed against real v14.367 source,
see this tool's own module docstring): it does not crop to a circle, and it
does not composite the subject under the ring -- an opaque square corner
fully occludes the ring beneath it. So the geometry (top-anchored square) and
the mask (fully opaque center, fully transparent corners) are exactly the two
things this test suite has to prove, not just "a file got written."
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "token-ring")))

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
            # A real situation in this project's own registry: a companion
            # detail shot assigned to the SAME npc ref as the primary
            # portrait above. Must not be an ambiguity error -- the primary
            # (exact id == ref) wins.
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
        {
            "id": "contact-unclassified-art",
            "kind": "image",
            "category": "character-portraits",
            "path": "artwork/character-portraits/claimant-one.png",
            "assignedTo": {"kind": "creature", "ref": "contact-unclassified"},
        },
    ]
}


class TestPlan(unittest.TestCase):
    def test_only_character_portraits_assigned_to_an_npc_or_creature_are_planned(self):
        items = crop_ring_subject.plan(REGISTRY)
        self.assertEqual(sorted(i.stable_id for i in items), ["contact-unclassified", "shucks-mordant"])

    def test_a_scene_background_is_not_planned_as_a_ring_subject(self):
        items = crop_ring_subject.plan(REGISTRY)
        self.assertNotIn("episode-c1e1--the-road-in", [i.stable_id for i in items])

    def test_stable_id_is_the_assignedTo_ref_not_the_asset_id(self):
        # contact-unclassified-art's asset id differs from its assignedTo.ref
        # on purpose, mirroring a real asset-registry entry -- the ring
        # subject id must be the npc/creature's own id (what
        # core/generators/token-ring.mjs's caller looks up by), not
        # whatever the asset happens to be called.
        items = {i.stable_id: i for i in crop_ring_subject.plan(REGISTRY)}
        self.assertEqual(items["contact-unclassified"].source, "artwork/character-portraits/claimant-one.png")

    def test_two_portraits_claiming_the_same_ref_with_neither_an_exact_id_match_raises(self):
        registry = {
            "assets": [
                {"id": "a", "category": "character-portraits", "path": "a.png", "assignedTo": {"kind": "npc", "ref": "x"}},
                {"id": "b", "category": "character-portraits", "path": "b.png", "assignedTo": {"kind": "npc", "ref": "x"}},
            ]
        }
        with self.assertRaises(ValueError):
            crop_ring_subject.plan(registry)

    def test_a_companion_detail_shot_sharing_a_ref_with_the_primary_portrait_is_not_an_ambiguity(self):
        # The real shucks-mordant / shucks-mordant--hand-detail situation:
        # the asset whose own id matches the ref exactly wins as primary.
        items = {i.stable_id: i for i in crop_ring_subject.plan(REGISTRY)}
        self.assertEqual(items["shucks-mordant"].source, "artwork/character-portraits/shucks-mordant.png")

    def test_an_override_topFraction_is_applied_by_ref(self):
        items = {i.stable_id: i for i in crop_ring_subject.plan(REGISTRY, overrides={"shucks-mordant": 0.1})}
        self.assertEqual(items["shucks-mordant"].top_fraction, 0.1)
        self.assertEqual(items["contact-unclassified"].top_fraction, crop_ring_subject.DEFAULT_TOP_FRACTION)


class TestTopAnchoredSquareBox(unittest.TestCase):
    def test_a_square_source_crops_to_itself_regardless_of_top_fraction(self):
        self.assertEqual(crop_ring_subject.top_anchored_square_box(400, 400, 0.0), (0, 0, 400, 400))
        self.assertEqual(crop_ring_subject.top_anchored_square_box(400, 400, 0.5), (0, 0, 400, 400))

    def test_a_tall_portrait_crops_a_square_of_the_shorter_edge_horizontally_centered(self):
        left, top, right, bottom = crop_ring_subject.top_anchored_square_box(900, 1350, 0.0)
        self.assertEqual((right - left, bottom - top), (900, 900))
        self.assertEqual(left, 0, "width already equals the crop size, so it must not be shifted off-center")

    def test_top_fraction_moves_the_crop_down_by_that_fraction_of_the_crop_size(self):
        _, top, _, _ = crop_ring_subject.top_anchored_square_box(900, 1350, 0.2)
        self.assertEqual(top, round(0.2 * 900))

    def test_the_crop_box_never_runs_past_the_bottom_of_the_source(self):
        # top_fraction=1.0 would naively place the box's top edge at the crop
        # size itself (900px down in a 900-wide crop) -- for a 1350-tall
        # source that's still in-bounds, but the box must never be clamped
        # to hang off the bottom regardless of how large top_fraction is.
        _, top, _, bottom = crop_ring_subject.top_anchored_square_box(900, 1000, 5.0)
        self.assertEqual(bottom, 1000)
        self.assertEqual(top, 100)

    def test_a_wide_source_crops_a_square_of_the_shorter_edge_vertically_full_height(self):
        left, top, right, bottom = crop_ring_subject.top_anchored_square_box(1200, 800, 0.0)
        self.assertEqual((right - left, bottom - top), (800, 800))
        self.assertEqual(top, 0)
        self.assertEqual(left, 200, "a landscape source must be horizontally centered, not left-anchored")

    def test_rejects_a_non_positive_size(self):
        with self.assertRaises(ValueError):
            crop_ring_subject.top_anchored_square_box(0, 100, 0.0)


class TestCropRingSubject(unittest.TestCase):
    """Real Pillow round-trip: proves the two things Foundry itself won't do --
    circular masking and top-anchored square framing -- actually happen in the
    written file, not just in the geometry math above."""

    def setUp(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow not installed")
        self.Image = Image
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)

    def _make_source(self, size, color=(200, 40, 40)):
        path = os.path.join(self.tmpdir.name, "source.png")
        self.Image.new("RGB", size, color).save(path)
        return path

    def test_output_is_square_at_OUTPUT_SIZE_with_an_alpha_channel(self):
        source = self._make_source((900, 1350))
        target = os.path.join(self.tmpdir.name, "out.webp")
        crop_ring_subject.crop_ring_subject(source, target)

        with self.Image.open(target) as out:
            self.assertEqual(out.size, (crop_ring_subject.OUTPUT_SIZE, crop_ring_subject.OUTPUT_SIZE))
            self.assertEqual(out.mode, "RGBA")

    def test_center_is_opaque_and_corners_are_transparent(self):
        # This is the load-bearing assertion: an opaque square corner is
        # exactly what would occlude the ring graphic underneath it in
        # Foundry's real compositing (token-ring.mjs's own docstring
        # citation) -- if this ever regresses, the ring would visually break
        # without any error anywhere.
        source = self._make_source((900, 900))
        target = os.path.join(self.tmpdir.name, "out.webp")
        crop_ring_subject.crop_ring_subject(source, target)

        with self.Image.open(target) as out:
            size = crop_ring_subject.OUTPUT_SIZE
            center_alpha = out.getpixel((size // 2, size // 2))[3]
            corner_alpha = out.getpixel((2, 2))[3]
            self.assertGreater(center_alpha, 250, "the center of the portrait must be fully opaque")
            self.assertLess(corner_alpha, 5, "a corner outside the circle must be fully transparent, or it will occlude the ring")

    def test_subject_is_inset_with_a_transparent_margin_around_it(self):
        # The load-bearing behavior this whole class of test exists for:
        # confirmed live 2026-09-18 (Ingram's own observation, checked
        # directly against a running Foundry world) that an edge-to-edge
        # circle leaves no room for the ring bezel to render at all. The
        # canvas corner was already covered by the opaque/transparent test
        # above; this checks a point ALONG the canvas edge, dead center,
        # which an edge-to-edge circle would have made opaque (it's tangent
        # to the middle of each edge) but an inset circle must not.
        source = self._make_source((900, 900))
        target = os.path.join(self.tmpdir.name, "out.webp")
        crop_ring_subject.crop_ring_subject(source, target)

        with self.Image.open(target) as out:
            size = crop_ring_subject.OUTPUT_SIZE
            edge_mid_alpha = out.getpixel((size // 2, 0))[3]
            self.assertLess(edge_mid_alpha, 5, "the subject must not touch the canvas edge -- no room would be left for the ring bezel")

    def test_mask_edge_is_antialiased_not_a_hard_jagged_step(self):
        # Scan a full row near the TOP of the inset circle itself (not the
        # canvas edge -- with a margin reserved, the canvas edge is now pure
        # transparent margin, nothing to observe there). Near the circle's
        # own top edge it's much narrower than at its center, so the
        # transparent-to-opaque transition spans several visible pixels. A
        # HARD-edged mask jumps straight from 255 to 0 between two adjacent
        # pixels in that transition; an antialiased one passes through at
        # least one intermediate value.
        source = self._make_source((900, 900))
        target = os.path.join(self.tmpdir.name, "out.webp")
        crop_ring_subject.crop_ring_subject(source, target)

        with self.Image.open(target) as out:
            size = crop_ring_subject.OUTPUT_SIZE
            subject_size = round(size * crop_ring_subject.SUBJECT_DIAMETER_FRACTION)
            offset = (size - subject_size) // 2
            row_y = offset + round(subject_size * 0.05)
            row = [out.getpixel((x, row_y))[3] for x in range(size)]
            self.assertTrue(
                any(20 < a < 235 for a in row),
                "expected at least one intermediate alpha value in the circle's edge transition near the top of the inset subject",
            )

    def test_missing_source_file_raises_rather_than_writing_a_blank_target(self):
        target = os.path.join(self.tmpdir.name, "out.webp")
        with self.assertRaises(Exception):
            crop_ring_subject.crop_ring_subject(os.path.join(self.tmpdir.name, "nope.png"), target)
        self.assertFalse(os.path.exists(target))


class TestStage(unittest.TestCase):
    def setUp(self):
        try:
            import PIL  # noqa: F401
        except ImportError:
            self.skipTest("Pillow not installed")
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)

    def test_a_missing_source_is_reported_rather_than_silently_skipped(self):
        import json

        registry_path = os.path.join(self.tmpdir.name, "registry.json")
        with open(registry_path, "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "assets": [
                        {
                            "category": "character-portraits",
                            "path": "artwork/character-portraits/does-not-exist-anywhere.png",
                            "assignedTo": {"kind": "npc", "ref": "nobody"},
                        }
                    ]
                },
                handle,
            )

        out_dir = os.path.join(self.tmpdir.name, "out")
        report = crop_ring_subject.stage(registry_path, out_dir)
        self.assertEqual(report["missing"], [{"id": "nobody", "source": "artwork/character-portraits/does-not-exist-anywhere.png"}])
        self.assertEqual(report["staged"], [])

    def test_check_mode_writes_nothing(self):
        import json

        registry_path = os.path.join(self.tmpdir.name, "registry.json")
        with open(registry_path, "w", encoding="utf-8") as handle:
            json.dump({"assets": []}, handle)

        out_dir = os.path.join(self.tmpdir.name, "out")
        crop_ring_subject.stage(registry_path, out_dir, check_only=True)
        self.assertFalse(os.path.exists(out_dir), "--check must not even create the output directory")


if __name__ == "__main__":
    unittest.main()
