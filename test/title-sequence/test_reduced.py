"""The reduced-motion opening and the flash check (Ingram, 2026-09-26: "a reduced motion and zero flashing
version... we use far less shots... Images should move 50% less and 50% slower whilst trying to keep the middle of
their movement front and center")."""
import copy
import json
import os
import sys
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import clock, flashcheck, raster, reduced, timeline  # noqa: E402

OPENING = os.path.join(ROOT, "data", "title-sequences", "opening.json")
REDUCED = os.path.join(ROOT, "data", "title-sequences", "opening-reduced.json")
f = clock.frame_to_time


class TestTheReducedCut(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = timeline.load(OPENING)
        cls.red = reduced.load(REDUCED, cls.base)

    def test_it_tiles_the_whole_song_in_order(self):
        segs = self.red.segments
        self.assertAlmostEqual(segs[0]["a"], f(0))
        self.assertAlmostEqual(segs[-1]["b"], clock.TRACK_LENGTH)
        for a, b in zip(segs, segs[1:]):
            self.assertAlmostEqual(a["b"], b["a"])
            self.assertLess(a["a"], a["b"])

    def test_it_uses_far_fewer_shots_and_none_of_them_quick(self):
        self.assertLessEqual(len(self.red.segments), len(self.base["shots"]) // 2)
        for s in self.red.segments:
            self.assertGreaterEqual(s["b"] - s["a"], 0.7, s["shot"])     # no cut comes sooner than 0.7 s

    def test_every_move_is_halved_slowed_and_centred_on_its_middle(self):
        for i, s in enumerate(self.red.segments):
            if s["motion"] >= 1.0:
                continue
            self.assertLessEqual(self.red.rate(i), 0.5 + 1e-9, s["shot"])     # half the pace or slower
            mid = (s["a"] + s["b"]) / 2
            self.assertAlmostEqual(self.red.source_time(i, mid), (s["s0"] + s["s1"]) / 2, places=5)
            shown = self.red.source_time(i, s["b"] - 1e-6) - self.red.source_time(i, s["a"])
            self.assertLessEqual(shown, (s["s1"] - s["s0"]) / 2 + 1e-6, s["shot"])   # half the travel or less

    def test_a_pan_shows_the_middle_half_of_its_travel(self):
        # the rooftop pans cx 0.4 -> 0.375 over R15; the reduced cut shows 0.39375 -> 0.38125
        clip = next(c for c in self.base["clips"] if c["id"] == "r15-rooftop")
        i = next(k for k, s in enumerate(self.red.segments) if s["shot"] == "R15")
        s = self.red.segments[i]
        cx = lambda t: timeline.params_at(clip, t)["cx"]
        full = cx(s["s0"]) - cx(s["s1"] - 0.05)
        shown = cx(self.red.source_time(i, s["a"])) - cx(self.red.source_time(i, s["b"] - 1e-6))
        self.assertAlmostEqual(shown, full / 2, delta=abs(full) * 0.08)
        middle = cx(self.red.source_time(i, (s["a"] + s["b"]) / 2))
        self.assertAlmostEqual(middle, (cx(s["s0"]) + cx(s["s1"] - 0.05)) / 2, delta=abs(full) * 0.08)

    def test_the_ripple_plays_as_it_is(self):
        # Ingram (2026-09-26): "The initial ripple is fine to include in the low motion version in future. It's not
        # strong enough to cause any issues and with it missing the intro isn't as nice."
        first = self.red.segments[0]
        self.assertEqual((first["shot"], first["last"], first["motion"]), ("R00", "R01", 1.0))
        ripple = [c["id"] for c in self.base["clips"] if c["shot"] == "R01"]
        self.assertTrue(ripple)
        kept = {c["id"] for c in self.red.doc["clips"]}
        for cid in ripple:
            self.assertIn(cid, kept)
        for n in (8, 20, 32):                                    # its own frames, at its own pace
            self.assertAlmostEqual(self.red.source_time(0, f(n)), f(n))

    def test_every_lead_beat_with_art_and_every_credit_are_kept(self):
        # the newcomers' lead beats (R11, R14, R24 so far); the other three wait on the group's own character art
        leads = [c for c in self.base["clips"] if c.get("note", "").startswith("LEAD BEAT")]
        self.assertGreaterEqual(len(leads), 3)
        for c in leads:
            self.assertTrue(any(s["s0"] < c["end"] and c["start"] < s["s1"] for s in self.red.segments), c["id"])
        credits = {c["id"] for c in self.base["clips"] if c["layer"].get("kind") == "credit"}
        self.assertEqual({c["id"] for c in self.red.credits}, credits)

    def test_credits_land_on_the_music_as_in_the_full_opening(self):
        music = next(c for c in self.base["clips"] if c["id"] == "r14-music")
        calm = next(c for c in self.red.credits if c["id"] == "r14-music")
        for n in (990, 1000, 1030, 1058):
            full, red = timeline.params_at(music, f(n)), timeline.params_at(calm, f(n))
            self.assertEqual(full is None, red is None, n)
            if full:
                self.assertAlmostEqual(full.get("opacity", 1.0), red.get("opacity", 1.0), n)

    def test_nothing_that_flashes_survives(self):
        types = {c["layer"]["type"] for c in self.red.doc["clips"]}
        self.assertNotIn("vhs_damage", types)                              # the tape tearing
        self.assertNotIn("arcs", types)                                    # lightning
        ids = {c["id"] for c in self.red.doc["clips"]}
        for cid in ("pre-channels", "r05-wash", "r10-wash", "r80-flash", "r84-white", "r09-flare-1", "r109-strobe"):
            self.assertNotIn(cid, ids)
        for c in self.red.doc["clips"]:
            if c["layer"]["type"] == "text":
                self.assertEqual(c["layer"].get("flicker", 0), 0, c["id"])
                self.assertEqual(c["layer"].get("weave", 0), 0, c["id"])
        self.assertEqual(self.red.doc["finish"]["vhs"]["dropouts"], 0.0)
        tape = next(c for c in self.red.doc["clips"] if c["id"] == "pre-tape")
        self.assertEqual(timeline.params_at(tape, f(-40))["strength"], 0.0)   # the pre-roll's tape stays locked

    def test_the_full_opening_is_left_untouched(self):
        self.assertIn("r80-flash", {c["id"] for c in self.base["clips"]})
        self.assertTrue(any(c["layer"]["type"] == "vhs_damage" for c in self.base["clips"]))

    def test_every_segment_names_a_real_shot(self):
        with open(REDUCED, encoding="utf-8") as fh:
            spec = json.load(fh)
        ids = {s["id"] for s in self.base["shots"]}
        for seg in spec["segments"]:
            for sid in seg.get("shots", [seg.get("shot")]):
                self.assertIn(sid, ids)
        self.assertTrue(os.path.exists(os.path.join(ROOT, "data", "schema", "title-sequence-reduced.schema.json")))


class TestTheDissolve(unittest.TestCase):
    """Cuts dissolve, so the picture never jumps in brightness from one frame to the next."""
    BASE = {"shots": [{"id": "R00", "in": -0.5}, {"id": "R01", "in": 1.5}], "built": ["R00", "R01"],
            "clips": [{"id": "a", "shot": "R00", "start": -0.5, "end": 1.5, "layer": {"type": "solid", "color": [255, 0, 0]}},
                      {"id": "b", "shot": "R01", "start": 1.5, "end": 90, "layer": {"type": "solid", "color": [0, 0, 255]}}]}

    def test_a_cut_is_a_mix_of_both_shots(self):
        spec = {"segments": [{"shot": "R00", "until": 1.5}, {"shot": "R01", "until": "end"}], "dissolve": 8,
                "finish": {"vhs": {"strength": 0.0}}}
        base = copy.deepcopy(self.BASE)
        base["finish"] = {"vhs": {"strength": 0.0}}
        red = reduced.Reduced(spec, base)
        cut = clock.time_to_frame(1.5)
        before, at, after = red.compose(cut - 8), red.compose(cut), red.compose(cut + 8)
        self.assertGreater(before[540, 720, 0], 0.95)
        self.assertGreater(after[540, 720, 2], 0.95)
        self.assertTrue(0.2 < at[540, 720, 0] < 0.8 and 0.2 < at[540, 720, 2] < 0.8)
        steps = [np.abs(red.compose(n) - red.compose(n + 1)).mean() for n in range(cut - 5, cut + 5)]
        self.assertLess(max(steps), 0.2)                                    # no single-frame jump


class TestTheFlashCheck(unittest.TestCase):
    """WCAG 2.3.1: no more than three general or red flashes in any second over a large enough area."""

    @staticmethod
    def frames(fn, n=48, w=192, h=144):
        return [fn(i, np.zeros((h, w, 3), np.uint8)) for i in range(n)]

    def test_a_full_screen_strobe_fails(self):
        def strobe(i, img):
            img[:] = 255 if i % 2 else 0
            return img
        report = flashcheck.check(self.frames(strobe))
        self.assertFalse(report["passes"])
        self.assertGreaterEqual(report["general_flashes"], 4)

    def test_a_slow_alternation_and_a_single_cut_pass(self):
        def slow(i, img):
            img[:] = 255 if (i // 12) % 2 else 0                                # one change every half second
            return img

        def cut(i, img):
            img[:] = 255 if i > 20 else 0
            return img
        self.assertTrue(flashcheck.check(self.frames(slow))["passes"])
        self.assertTrue(flashcheck.check(self.frames(cut))["passes"])

    def test_a_small_flashing_spot_is_below_the_area_threshold(self):
        def spot(i, img):
            img[70:74, 94:98] = 255 if i % 2 else 0                             # well under a window's area
            return img
        self.assertTrue(flashcheck.check(self.frames(spot))["passes"])

    def test_red_flashing_is_caught_on_its_own(self):
        def red(i, img):
            img[:] = (230, 0, 0) if i % 4 < 2 else (120, 0, 0)                  # saturated red, six times a second
            return img
        report = flashcheck.check(self.frames(red))
        self.assertGreaterEqual(report["red_flashes"], 4)
        self.assertFalse(report["passes"])


if __name__ == "__main__":
    unittest.main()
