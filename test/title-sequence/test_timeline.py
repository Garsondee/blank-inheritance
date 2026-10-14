"""timeline.py: keyframes, frame addressing, validation, compositing order, and the shipped timeline itself."""
import copy
import json
import math
import os
import sys
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import clock, timeline  # noqa: E402

OPENING = os.path.join(ROOT, "data", "title-sequences", "opening.json")


def frame_t(n):
    return clock.frame_to_time(n)


def _picture_size(path, Image):
    """A still's, a clip's or a folder of keyed PNGs' width and height, without decoding a whole clip."""
    if os.path.isdir(path):
        path = os.path.join(path, sorted(n for n in os.listdir(path) if n.lower().endswith(".png"))[0])
    if path.lower().endswith((".mp4", ".mov", ".webm")):
        import cv2
        cap = cv2.VideoCapture(path)
        size = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        return size
    with Image.open(path) as im:
        return im.size


def _clip_frame_count(path):
    if os.path.isdir(path):
        return len([n for n in os.listdir(path) if n.lower().endswith(".png")])
    import cv2
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    return n


class TestKeys(unittest.TestCase):
    KEYS = [{"t": 0.0, "r": 10, "color": [0, 0, 0]}, {"t": 1.0, "r": 20}, {"t": 2.0, "color": [100, 100, 100]}]

    def test_nothing_before_the_first_key(self):
        self.assertIsNone(timeline.eval_keys(self.KEYS, -0.1))

    def test_hold_keeps_each_drawing_until_the_next_key(self):
        self.assertEqual(timeline.eval_keys(self.KEYS, 0.99)["r"], 10)
        self.assertEqual(timeline.eval_keys(self.KEYS, 1.0)["r"], 20)

    def test_values_carry_forward_from_earlier_keys(self):
        state = timeline.eval_keys(self.KEYS, 2.5)
        self.assertEqual(state["r"], 20)
        self.assertEqual(state["color"], [100, 100, 100])

    def test_linear_interpolates_numbers_and_lists(self):
        self.assertAlmostEqual(timeline.eval_keys(self.KEYS, 0.5, "linear")["r"], 15)
        # colour is keyed at t=0 and t=2, so at 1.5 it is three quarters of the way (the key at t=1 doesn't touch it)
        self.assertEqual(timeline.eval_keys(self.KEYS, 1.5, "linear")["color"], [75, 75, 75])

    def test_linear_glides_each_parameter_between_the_keys_that_set_it(self):
        # a push-in keyed only at its ends, with an opacity fade keyed in between: the zoom must glide throughout
        keys = [{"t": 0.0, "zoom": 1.0, "opacity": 0.0}, {"t": 1.0, "opacity": 1.0}, {"t": 4.0, "zoom": 2.0}]
        self.assertAlmostEqual(timeline.eval_keys(keys, 0.5, "linear")["zoom"], 1.125)
        self.assertAlmostEqual(timeline.eval_keys(keys, 2.0, "linear")["zoom"], 1.5)
        self.assertAlmostEqual(timeline.eval_keys(keys, 2.0, "linear")["opacity"], 1.0)
        self.assertAlmostEqual(timeline.eval_keys(keys, 0.5, "linear")["opacity"], 0.5)


class TestEase(unittest.TestCase):
    KEYS = [{"t": 0.0, "y": 0.0}, {"t": 1.0, "y": 100.0}]

    def test_the_curves(self):
        at = lambda ease, t: timeline.eval_keys(self.KEYS, t, "linear", ease)["y"]
        self.assertAlmostEqual(at("out", 0.5), 70.71, places=1)     # arrives at speed, settles
        self.assertAlmostEqual(at("in", 0.5), 29.29, places=1)      # starts still
        self.assertAlmostEqual(at("inout", 0.5), 50.0, places=3)
        self.assertAlmostEqual(at(None, 0.5), 50.0, places=3)

    def test_an_eased_move_keyed_at_its_ends_is_one_curve(self):
        # the blueprint once had two speeds (Ingram's note): under "out", every frame's step is smaller than the last
        ys = [timeline.eval_keys(self.KEYS, i / 24, "linear", "out")["y"] for i in range(25)]
        steps = [b - a for a, b in zip(ys, ys[1:])]
        self.assertEqual(steps, sorted(steps, reverse=True))

    def test_an_unknown_ease_is_caught(self):
        doc = {"clips": [{"id": "a", "shot": "R00", "start": 0, "end": 1, "ease": "bounce",
                          "layer": {"type": "solid", "color": [0, 0, 0]}}]}
        self.assertIn("ease", " ".join(timeline.validate(doc)))


class TestExposure(unittest.TestCase):
    """`on`: a clip's drawings held for two or three frames, as cel animation holds them."""

    CLIP = {"id": "c", "shot": "R01", "startF": 10, "endF": 30, "interp": "linear", "on": 2,
            "layer": {"type": "solid", "color": [0, 0, 0]},
            "keys": [{"f": 10, "x": 0.0, "opacity": 0.0}, {"f": 29, "x": 190.0, "opacity": 1.0}]}

    def clip(self):
        return timeline.normalize({"clips": [copy.deepcopy(self.CLIP)]})["clips"][0]

    def test_moves_step_once_per_drawing(self):
        c = self.clip()
        xs = [timeline.params_at(c, frame_t(n))["x"] for n in range(10, 16)]
        self.assertEqual(xs[0], xs[1])
        self.assertEqual(xs[2], xs[3])
        self.assertLess(xs[1], xs[2])

    def test_fades_stay_smooth_because_they_are_the_cameras(self):
        c = self.clip()
        ops = [timeline.params_at(c, frame_t(n))["opacity"] for n in range(10, 16)]
        self.assertEqual(len(set(ops)), len(ops))                          # a new value every frame

    def test_the_layers_own_clock_steps_too(self):
        c = self.clip()
        self.assertEqual(timeline.params_at(c, frame_t(12))["_t"], timeline.params_at(c, frame_t(13))["_t"])

    def test_a_bad_exposure_is_caught(self):
        doc = {"clips": [{"id": "a", "shot": "R00", "start": 0, "end": 1, "on": 0, "layer": {"type": "solid"}}]}
        self.assertIn("exposure", " ".join(timeline.validate(doc)))


class TestFrameAddressing(unittest.TestCase):
    def test_frames_become_times_that_include_start_and_exclude_end(self):
        doc = timeline.normalize({"clips": [{"id": "c", "shot": "R01", "startF": 8, "endF": 9,
                                             "layer": {"type": "solid", "color": [1, 1, 1]},
                                             "keys": [{"f": 8}]}],
                                  "shots": [{"id": "R01", "inF": 8}]})
        c = doc["clips"][0]
        self.assertTrue(timeline.active(c, frame_t(8)))
        self.assertFalse(timeline.active(c, frame_t(9)))
        self.assertFalse(timeline.active(c, frame_t(7)))
        self.assertIsNotNone(timeline.eval_keys(c["keys"], frame_t(8)))
        self.assertEqual(timeline.shot_at(doc, frame_t(8))["id"], "R01")


class TestValidate(unittest.TestCase):
    GOOD = {"shots": [{"id": "R00", "in": -0.5}, {"id": "R01", "in": 0.0}], "built": ["R00"],
            "clips": [{"id": "a", "shot": "R00", "start": -0.5, "end": 0.0, "layer": {"type": "solid", "color": [0, 0, 0]}}]}

    def test_a_sound_timeline_has_no_problems(self):
        self.assertEqual(timeline.validate(copy.deepcopy(self.GOOD)), [])

    def test_problems_are_caught(self):
        bad = copy.deepcopy(self.GOOD)
        bad["clips"].append(dict(bad["clips"][0]))                               # duplicate id
        bad["clips"].append({"id": "b", "shot": "R00", "start": 1, "end": 0, "layer": {"type": "solid"}})
        bad["clips"].append({"id": "c", "shot": "R00", "start": 0, "end": 1, "layer": {"type": "laser"}})
        bad["clips"].append({"id": "d", "shot": "R00", "start": 0, "end": 1, "layer": {"type": "solid"},
                             "keys": [{"t": 1}, {"t": 0}]})
        bad["clips"].append({"id": "e", "shot": "R00", "start": 0, "end": 1, "layer": {"type": "logo", "part": "banner"}})
        bad["clips"].append({"id": "g", "shot": "R00", "start": 0, "end": 1,
                             "layer": {"type": "image", "src": "x.png", "blend": "burn"}})
        bad["clips"].append({"id": "h", "shot": "R00", "start": 0, "end": 1,
                             "layer": {"type": "image", "src": "x.png", "matte": {"mode": "chroma"}}})
        bad["clips"].append({"id": "i", "shot": "R00", "start": 0, "end": 1,
                             "layer": {"type": "video", "src": "x.mp4", "mode": "bounce"}})
        bad["clips"].append({"id": "j", "shot": "R00", "start": 0, "end": 1,
                             "layer": {"type": "image", "src": "x.png", "keyed": True, "matte": {"mode": "flat"}}})
        bad["clips"].append({"id": "k", "shot": "R00", "start": 0, "end": 1,
                             "layer": {"type": "text", "items": [], "kind": "caption"}})
        bad["clips"].append({"id": "l", "shot": "R00", "start": 0, "end": 1, "layer": {"type": "slate", "code": "R00"}})
        bad["built"].append("R99")
        text = " | ".join(timeline.validate(bad))
        for needle in ("duplicate", "ends before it starts", "unknown layer type", "not in time order",
                       "not in the cut list", "unknown logo part", "unknown blend", "unknown matte mode",
                       "unknown video mode", "keyed art", "kind must be", "slate must say"):
            self.assertIn(needle, text)


class TestCompose(unittest.TestCase):
    def test_higher_z_draws_over_lower(self):
        doc = {"clips": [
            {"id": "top", "shot": "R00", "start": 0, "end": 1, "z": 5, "layer": {"type": "solid", "color": [255, 0, 0]}},
            {"id": "bottom", "shot": "R00", "start": 0, "end": 1, "z": 1, "layer": {"type": "solid", "color": [0, 0, 255]}},
        ]}
        img = timeline.compose(doc, 0.5)
        np.testing.assert_allclose(img[0, 0], [1, 0, 0])

    def test_invisible_key_hides_a_clip(self):
        clip = {"id": "x", "shot": "R00", "start": 0, "end": 2, "layer": {"type": "solid", "color": [255, 255, 255]},
                "keys": [{"t": 0}, {"t": 1, "visible": False}]}
        self.assertIsNotNone(timeline.params_at(clip, 0.5))
        self.assertIsNone(timeline.params_at(clip, 1.5))

    @unittest.skipUnless(os.path.exists(os.path.join(ROOT, "third-party", "fonts", "texgyreheroscn-bold.otf")),
                         "needs the gitignored fonts in third-party/fonts")
    def test_captions_above_the_finish_escape_the_tape(self):
        # the VCR lays its captions over the playing tape, so the tape's noise and smear never touch them
        caption = {"type": "osd", "text": "PLAY", "x": 100, "y": 100, "block": 5, "color": [72, 255, 72]}
        grey = {"id": "bg", "shot": "R00", "start": 0, "end": 1, "layer": {"type": "solid", "color": [40, 40, 40]}}
        green = np.array([72, 255, 72], np.float32) / 255

        def exact_green(above):
            doc = {"finish": {"vhs": {"strength": 1.0, "noise": 0.08}},
                   "clips": [grey, {"id": "c", "shot": "R00", "start": 0, "end": 1, "z": 9,
                                    "layer": dict(caption, above_finish=above)}]}
            img = timeline.compose(doc, 0.5, finish_n=7)
            return int(np.isclose(img, green, atol=1e-6).all(axis=2).sum())
        self.assertGreater(exact_green(True), 200)
        self.assertEqual(exact_green(False), 0)

    def test_the_preroll_is_counted_in_frames(self):
        self.assertEqual(timeline.preroll_frames({"preroll": {"seconds": 3.0}}), 72)
        self.assertEqual(timeline.preroll_frames({}), 0)


class TestSchema(unittest.TestCase):
    def test_the_schema_knows_every_layer_type(self):
        with open(os.path.join(ROOT, "data", "schema", "title-sequence.schema.json"), encoding="utf-8") as f:
            schema = json.load(f)
        enum = schema["properties"]["clips"]["items"]["properties"]["layer"]["properties"]["type"]["enum"]
        self.assertEqual(set(enum), timeline.LAYER_TYPES)


class TestTheShippedTimeline(unittest.TestCase):
    """data/title-sequences/opening.json itself: sound, complete, and still encoding the measured design."""

    @classmethod
    def setUpClass(cls):
        cls.doc = timeline.load(OPENING)

    def test_it_validates(self):
        self.assertEqual(timeline.validate(self.doc), [])

    def test_the_cut_list_is_the_full_source_continuity_in_order(self):
        ids = [s["id"] for s in self.doc["shots"]]
        self.assertEqual(ids, [f"R{i:02d}" for i in range(112)])

    def test_every_clip_belongs_to_a_shot_in_the_cut_list(self):
        ids = {s["id"] for s in self.doc["shots"]}
        for c in self.doc["clips"]:
            self.assertIn(c["shot"], ids, c["id"])

    def test_the_raindrop_donut_is_on_screen_for_exactly_frame_8(self):
        donut = next(c for c in self.doc["clips"] if c["id"] == "r01-donut")
        on = [n for n in range(0, 40) if timeline.params_at(donut, frame_t(n))]
        self.assertEqual(on, [8])

    def test_the_spreading_ring_runs_frames_9_to_32_and_only_grows(self):
        ring = next(c for c in self.doc["clips"] if c["id"] == "r01-ring")
        radii = []
        for n in range(0, 40):
            p = timeline.params_at(ring, frame_t(n))
            if p:
                radii.append((n, p["r_out"]))
        self.assertEqual(radii[0][0], 9)
        self.assertEqual(radii[-1][0], 32)
        rs = [r for _, r in radii]
        self.assertEqual(rs, sorted(rs))

    def test_the_burst_washes_out_after_the_big_rings_not_during_them(self):
        wash = next(c for c in self.doc["clips"] if c["id"] == "r05-wash")
        rings = next(c for c in self.doc["clips"] if c["id"] == "r05-ring-a")
        last_ring = max(n for n in range(300, 330) if timeline.params_at(rings, frame_t(n)))
        first_wash = min(n for n in range(300, 330) if timeline.params_at(wash, frame_t(n)))
        self.assertEqual(first_wash, last_ring + 1)

    def clip(self, cid):
        return next(c for c in self.doc["clips"] if c["id"] == cid)

    def test_the_wordmark_never_moves(self):
        # Ingram, Step 2 review: it surfaces in the strobe and holds in the same place through the logo
        marks = [c for c in self.doc["clips"] if c["layer"]["type"] == "logo" and c["layer"]["part"] == "wordmark"]
        self.assertGreaterEqual(len(marks), 4)
        for c in marks:
            for p in [c["layer"]] + c.get("keys", []):
                self.assertFalse(p.get("dx") or p.get("dy"), c["id"])

    def test_the_crane_booms_land_on_the_sources_beam_frames(self):
        crane = self.clip("r06-crane")
        shown = [n for n in range(320, 365) if timeline.params_at(crane, frame_t(n))]
        self.assertEqual(shown, [327, 330, 336, 339, 340, 346])

    def test_every_strobe_crop_covers_the_whole_frame(self):
        # the deep crops once let a rotated still's edge into the frame as a black wedge
        from PIL import Image
        from titleseq import layers
        smoke = self.clip("r06-smoke")
        for n in range(325, 361):
            p = timeline.params_at(smoke, frame_t(n))
            path = os.path.join(ROOT, p["src"])
            if not os.path.exists(path):
                self.skipTest("the gitignored art isn't in this checkout")
            with Image.open(path) as im:
                iw, ih = im.size
            _, m = layers.image_transform(iw, ih, p.get("fit", "cover"), p["zoom"], p["cx"], p["cy"], p["rot"])
            inv = np.linalg.inv(np.vstack([m, [0, 0, 1]]))
            for x, y in ((0, 0), (1440, 0), (0, 1080), (1440, 1080)):
                u, v, _ = inv @ np.array([x - 0.5, y - 0.5, 1.0])
                self.assertTrue(-1 <= u <= iw and -1 <= v <= ih, f"frame {n}: corner {x},{y} falls off the still")

    def test_the_verse_is_six_cards_of_even_length_and_the_watchers_credit(self):
        # Ingram, round 14: "we'll have six of them, we want to give them roughly even screen time... We could also
        # take this chance to pair the character name with the player name." The verse is one card per player, in
        # the order Japanese credits use (a, ku, ji, su, pi, ri), alternating sides; the old cast credit is gone
        # because each card carries its player's name.
        texts = [c for c in self.doc["clips"] if c["layer"]["type"] == "text" and c["shot"] in ("R11", "R12", "R13")]
        self.assertEqual([c["id"] for c in texts], ["r11-watcher"])
        watcher = [it["text"] for it in self.clip("r11-watcher")["layer"]["items"]]
        self.assertEqual(watcher, ["監視者", "クロード・コード"])
        cards = sorted((c for c in self.doc["clips"] if c["layer"]["type"] == "cast_card"), key=lambda c: c["start"])
        self.assertEqual([c["layer"]["player"]["kana"] for c in cards],
                         ["アン", "クレイグ", "ジェイミー", "スティーブ", "ピッパ", "リアム"])
        self.assertEqual([c["layer"]["player"]["roman"] for c in cards],
                         ["Anne", "Craig", "Jamie", "Steve", "Pippa", "Liam"])
        self.assertEqual([c["layer"]["number"] for c in cards], [1, 2, 3, 4, 5, 6])
        self.assertEqual([c["layer"]["side"] for c in cards], ["l", "r", "l", "r", "l", "r"])
        starts = [c["start"] for c in cards]
        gaps = [b - a for a, b in zip(starts, starts[1:])]
        self.assertLessEqual(max(gaps) / min(gaps), 1.05)                    # each card holds the same time
        self.assertLessEqual((cards[-1]["end"] - starts[-1]) / min(gaps), 1.25)   # the last one only waits for the cut
        for c in cards:
            self.assertIsNone(c["layer"]["name"])        # the characters are not made yet: nobody invents their names
            self.assertTrue(c["note"].startswith("LEAD BEAT"))

    def test_every_text_layer_says_whether_it_is_a_credit(self):
        # stencils and counters are text in the world, and title cards are the opening's own words: neither may be
        # counted as a credit by mistake
        for c in self.doc["clips"]:
            if c["layer"]["type"] == "text":
                self.assertIn(c["layer"].get("kind"), timeline.TEXT_KINDS, c["id"])

    def test_the_title_cards_say_only_the_approved_words(self):
        # design/opening-titles.md section 7: every word is one the players know or will be told; none is a secret
        approved = {"UTILITYTYPE", "FRAME-01", "UNIDENTIFIEDCONTACT", "CICADA", "KUROSE", "CRANERIGFRAME-00",
                    "SALVAGEANDFIREFRAME-02", "FIRSTIMPACT", "HERE"}
        cards = ["".join(it["text"] for it in c["layer"]["items"]).replace(" ", "")
                 for c in self.doc["clips"] if c["layer"]["type"] == "text" and c["layer"].get("kind") == "title"]
        self.assertEqual(sorted(cards), sorted(approved))

    @unittest.skipUnless(os.path.exists(os.path.join(ROOT, "third-party", "fonts", "texgyreheroscn-bold.otf")),
                         "needs the gitignored fonts in third-party/fonts")
    def test_the_title_cards_are_set_at_the_sources_size(self):
        # the typography round: measured on the source's own cards, its letters stand a quarter to nearly half the
        # picture tall (TEST TYPE 269 px, EVA-01 497, ANGELS 354, TOKYO-3 404, SECOND IMPACT 294, ADAM 468)
        from titleseq import layers
        expected = {"r40-card": 269, "r42-card": 497, "r51-card": 354, "r53-card": 404, "r89-card": 294,
                    "r95-card": 468}
        for cid, height in expected.items():
            _, a, _ = layers.render_text(self.clip(cid)["layer"]["items"], shadow=0.0)
            rows = np.nonzero(a.max(axis=1) > 0.5)[0]
            runs = np.split(rows, np.nonzero(np.diff(rows) > 1)[0] + 1)
            self.assertAlmostEqual(max(len(r) for r in runs), height, delta=8, msg=cid)

    def test_no_image_appears_in_two_shots(self):
        # Ingram: "No repeat shots." and "If you use the same image twice it's better to just use a text card."
        shots_of = {}
        for c in self.doc["clips"]:
            if c["layer"]["type"] in ("image", "video"):
                for src in [c["layer"]["src"]] + [k["src"] for k in c.get("keys", []) if "src" in k]:
                    shots_of.setdefault(src, set()).add(c["shot"])
        repeats = {src: sorted(s) for src, s in shots_of.items() if len(s) > 1}
        self.assertEqual(repeats, {})

    def test_the_opening_is_finished_from_the_art_in_hand(self):
        # Ingram (2026-09-26): "you can lower the overall number of shots, but you must use the assets you've got to
        # replace the gaps... Finish the video as best you can using the resources you have." No text-only slates.
        self.assertEqual([c["id"] for c in self.doc["clips"] if c["layer"]["type"] == "slate"], [])

    def test_art_ingram_turned_down_never_comes_back(self):
        # Ingram, 2026-09-26: "Get rid of the comms woman... I don't like that portrait so stop using it please";
        # "I didn't much care for the mech arm on it's own"; and of the too-close newcomer at 00:57, "Get rid of it
        # entirely". Retired art lives in art/retired/ and is never used.
        srcs = [c["layer"].get("src", "") for c in self.doc["clips"]]
        for name in ("R14-comms-officer.png", "R13-hand.png", "R24-newcomer.png"):
            self.assertFalse(any(s.endswith(name) for s in srcs), name)
        self.assertFalse(any("/retired/" in s for s in srcs))

    def test_taka_waves_in_front_of_a_real_place(self):
        # Ingram (2026-09-26): "Could you put Taka on a real background please?" (not the flat field he had)
        taka = self.clip("r16-taka")
        behind = [c for c in self.doc["clips"] if c["shot"] == "R16" and c.get("z", 0) < taka.get("z", 0)]
        self.assertTrue(behind)
        self.assertTrue(all(c["layer"]["type"] == "image" for c in behind))
        for n in range(1144, 1178):                                  # the whole of his shot
            self.assertTrue(any(timeline.params_at(c, frame_t(n)) for c in behind), n)

    def test_the_heads_eyes_flare_instead_of_cutting_away(self):
        # Ingram (2026-09-26): "instead of cutting to the eyes shining in the dark let's put the eye lights in the
        # middle of each eye so that when the robot head turns it's eyes flare light instead of cutting."
        head = self.clip("r36-art")
        self.assertEqual(head["layer"]["type"], "video")
        on = [n for n in range(1575, 1610) if timeline.params_at(head, frame_t(n))]
        self.assertEqual((on[0], on[-1]), (1581, 1602))                    # R36 to R38 in one shot
        pictures = [c for c in self.doc["clips"] if c["shot"] == "R38"]
        self.assertEqual(pictures, [])                                     # no separate eyes in the dark
        for side in ("l", "r"):
            halo = self.clip(f"r36-halo-{side}")
            pos = [(timeline.params_at(halo, frame_t(n))["cx"], timeline.params_at(halo, frame_t(n))["cy"])
                   for n in range(1593, 1603)]
            self.assertGreater(len(set(pos)), 3)                           # it follows the eye as the head turns
            self.assertTrue(all(0 < x < 1440 and 0 < y < 1080 for x, y in pos))
        peak = max(range(1593, 1603), key=lambda n: timeline.params_at(self.clip("r36-halo-l"), frame_t(n))["strength"])
        self.assertGreaterEqual(peak, 1597)                                # the flare peaks where the cut used to be

    def test_the_smoke_and_cranes_are_manga_halftone(self):
        # Ingram (2026-09-26): "could you produce a Halftone dots manga aesthetic? That would lift both the smoke
        # and the cranes."
        for cid in ("r06-smoke", "r06-crane"):
            self.assertTrue(self.clip(cid)["layer"].get("halftone"), cid)

    def test_the_opening_fades_out_over_a_five_second_tail(self):
        # Ingram (2026-09-26): "Add five seconds of fading out time at the end, we need to a longer tail."
        self.assertEqual(timeline.end_frame(self.doc) - clock.total_frames(), 120)
        fade = self.clip("r111-fade")
        amounts = [(n, timeline.params_at(fade, frame_t(n))) for n in range(2100, timeline.end_frame(self.doc))]
        black = [n for n, p in amounts if p and p["amount"] >= 0.999]
        started = [n for n, p in amounts if p and p["amount"] > 0.001]
        self.assertTrue(black)
        self.assertGreaterEqual((black[0] - started[0]) / clock.FPS, 4.5)     # a slow fade, not a cut
        self.assertEqual(black[-1], timeline.end_frame(self.doc) - 1)         # black to the very end
        self.assertEqual(self.clip("r111-wall")["end"], frame_t(timeline.end_frame(self.doc)) - 1e-6)

    def test_the_star_chart_is_ingrams_new_star_panning_slowly(self):
        # Ingram (2026-09-26): "I never liked how the round star chart looked... you have some latitude for a pan
        # too but it should be slow."
        chart = self.clip("r03-chart")
        self.assertTrue(chart["layer"]["src"].endswith("R03-star.png"))
        cxs = [timeline.params_at(chart, frame_t(n)).get("cx", 0.5) for n in range(160, 233)]
        per_frame = max(abs(b - a) for a, b in zip(cxs, cxs[1:])) * 3104 * (1080 / 1568)
        self.assertLess(per_frame, 6.0)                                    # a few pixels a frame at most
        self.assertGreater(abs(cxs[-1] - cxs[0]), 0.03)                    # but it does pan

    def test_the_salute_is_out_and_the_vehicles_have_its_time(self):
        # Ingram, round 14: "R35 is not a real character, so this section can be removed to give more time for other
        # things", and of the vehicles, "good but far too quick which means that they don't register".
        self.assertEqual([c["id"] for c in self.doc["clips"] if c["shot"] == "R35"], [])
        shots = {sh["id"]: sh for sh in self.doc["shots"]}
        self.assertEqual(shots["R35"]["in"], shots["R36"]["in"])               # no length: it is out of the cut
        for cid in ("r33-scout", "r33-tracked", "r33-recon", "r34-art"):
            c = self.clip(cid)
            self.assertGreaterEqual(clock.time_to_frame(c["end"]) - clock.time_to_frame(c["start"]), 22, cid)  # >= 0.9 s

    def test_the_welder_is_on_long_enough_to_read(self):
        # Ingram (2026-09-26): "74.50s bar 2.1 - this animation is so shortened that it's not obvious what is
        # happening."
        welder = self.clip("r73-art")
        on = [n for n in range(1780, 1820) if timeline.params_at(welder, frame_t(n))]
        self.assertGreaterEqual(len(on), 12)

    def test_a_keyed_move_never_jumps(self):
        # found 2026-09-26: R94's push keyed its centre only on its last frame, so the picture sat at the default
        # centre and jumped on that frame. Whatever a gliding clip keys is set in its first key (or starts from the
        # layer's own value), so every move glides from its first frame.
        for c in self.doc["clips"]:
            keys = c.get("keys") or []
            if c.get("interp", "hold") != "linear" or len(keys) < 2:
                continue
            for i, k in enumerate(keys[1:], 1):
                for p, v in k.items():
                    if p in ("t", "f") or any(p in kk for kk in keys[:i]):
                        continue
                    self.assertEqual(c["layer"].get(p), v, f"{c['id']}: {p} is first keyed at key {i}, so it jumps")

    def test_the_faces_between_the_verse_and_the_launch_are_real_people(self):
        # Ingram, round 14: "Ideally all characters seen in this intro would be real characters that the players will
        # meet, not generic anime characters they won't." R14 is Manako (the tea-house chemist) and R24 to R26 is
        # Section Officer Vetch; the animated newcomers who stood in for them are out of the cut.
        manako, vetch = self.clip("r14-face"), self.clip("r24-vetch")
        self.assertTrue(manako["layer"]["src"].endswith("R78-manako.png"))
        self.assertTrue(vetch["layer"]["src"].endswith("R65-vetch.png"))
        srcs = [c["layer"].get("src", "") for c in self.doc["clips"]]
        for gone in ("R14-newcomer.mp4", "R24-newcomer.mp4", "R24-newcomer.png", "R35-salute.png"):
            self.assertFalse(any(s.endswith(gone) for s in srcs), gone)
        on = [timeline.params_at(vetch, frame_t(n)) for n in range(1338, 1383)]
        self.assertTrue(all(on))                                              # a whole bar of him
        self.assertLessEqual(max(p.get("zoom", 1.0) for p in on), 1.15)       # and never the extreme close-up
        for cid in ("r14-glare", "r14-glare-haze"):
            self.assertNotIn(cid, {c["id"] for c in self.doc["clips"]})

    def test_full_frame_art_never_shows_its_own_edge(self):
        # found 2026-09-26: R54, R65 and R78 were keyed a little past their pictures' edges (R78 began off-centre at
        # zoom 1.0, where a 4:3 picture has no room to move), so a black band showed along one side for a few
        # frames. Art placed on purpose (px/py, a rotation, a crop, a matte, keyed alpha) is left out: R13's blueprint
        # drifts down over the sunset and is meant to.
        from PIL import Image
        from titleseq import raster
        placed = ("px", "py", "rot", "crop", "matte", "keyed")
        sizes = {}
        for c in self.doc["clips"]:
            if c["layer"]["type"] not in ("image", "video"):
                continue
            for n in range(clock.time_to_frame(c["start"]), clock.time_to_frame(c["end"]) + 2):
                p = timeline.params_at(c, frame_t(n))
                if p is None or p.get("opacity", 1.0) <= 0 or p.get("fit", "cover") != "cover":
                    continue
                if any(k in p for k in placed):
                    continue
                if p["src"] not in sizes:
                    path = os.path.join(ROOT, p["src"])
                    if not os.path.exists(path):
                        self.skipTest("the gitignored art isn't in this checkout")
                    sizes[p["src"]] = _picture_size(path, Image)
                iw, ih = sizes[p["src"]]
                s = max(raster.W / iw, raster.H / ih) * p.get("zoom", 1.0)
                hw, hh = raster.W / 2 / s, raster.H / 2 / s                    # half the view, in picture pixels
                cx, cy = p.get("cx", 0.5) * iw, p.get("cy", 0.5) * ih
                gap = max(hw - cx, cx + hw - iw, hh - cy, cy + hh - ih) * s     # frame pixels past the edge
                self.assertLessEqual(gap, 0.5, f"{c['id']}: frame {n} shows {gap:.0f} px past its picture's edge")

    def test_every_animation_plays_forward_and_never_freezes(self):
        # Ingram's animations (the newcomers, the power cell, the welder, the Gen 2 head: 2026-09-26) play once on
        # their own drawings; none may jump back, or run out and sit on its last frame while still on screen
        from titleseq import layers
        for c in self.doc["clips"]:
            if c["layer"]["type"] != "video":
                continue
            path = os.path.join(ROOT, c["layer"]["src"])
            if not os.path.exists(path):
                self.skipTest("the gitignored art isn't in this checkout")
            n_frames = _clip_frame_count(path)
            shown = []
            for n in range(clock.time_to_frame(c["start"]), clock.time_to_frame(c["end"]) + 2):
                p = timeline.params_at(c, frame_t(n))
                if p is None or p.get("opacity", 1.0) <= 0:
                    continue
                elapsed = math.floor((p["_t"] - p["_t0"]) * clock.FPS + 0.5)
                shown.append(layers.video_frame_index(n_frames, elapsed, p.get("speed", 1.0), p.get("hold", 1),
                                                      p.get("mode", "once"), p.get("offset", 0)))
            self.assertTrue(shown, c["id"])
            self.assertEqual(shown, sorted(shown), c["id"])
            self.assertLess(shown[-1], n_frames - 1, c["id"])

    def test_the_whole_opening_is_built_end_to_end(self):
        # Ingram: "get to the end of the whole thing. Then we can go back and fill in the blanks."
        self.assertEqual(self.doc["built"], [s["id"] for s in self.doc["shots"]])
        for s in self.doc["shots"]:                      # every shot opens on something of ours (R25 is R24's move)
            first = math.ceil((s["in"] + clock.LEAD_IN) * clock.FPS - 1e-3)
            self.assertTrue(any(timeline.params_at(c, frame_t(first)) for c in self.doc["clips"]), s["id"])

    def test_every_slate_says_what_belongs_there_and_has_its_prompt(self):
        # a slate is a text-only card holding a shot's place until the art comes; the prompt to make it is written
        with open(os.path.join(ROOT, "design", "opening-titles-prompts.md"), encoding="utf-8") as f:
            prompts = f.read()
        slates = [c for c in self.doc["clips"] if c["layer"]["type"] == "slate"]    # fewer each round; none is done
        for c in slates:
            layer = c["layer"]
            self.assertEqual(layer["code"], c["shot"], c["id"])
            self.assertTrue(layer["text"].strip(), c["id"])
            code = layer["prompt"].removeprefix("prompt ")
            self.assertIn(f"### {code} ", prompts, f"{c['id']}: no prompt headed {code} in the prompts doc")

    def test_every_credit_is_one_the_opening_needs(self):
        # Ingram: "we only want to use the ones that are needed" (design/opening-titles.md §7 lists them)
        needed = {"企画・原作", "キャラクター原案", "出演", "監視者", "音楽", "主題歌", "監督", "製作"}
        roles = {c["layer"]["items"][0]["text"] for c in self.doc["clips"]
                 if c["layer"]["type"] == "text" and c["layer"].get("kind") == "credit"}
        self.assertLessEqual(roles, needed)

    def test_the_music_is_credited_honestly(self):
        # Ingram: "give them credit, the real composers" (LEDGER #37, third round)
        text = lambda cid: " ".join(it["text"] for it in self.clip(cid)["layer"]["items"])
        for name in ("鷺巣詩郎", "天野正道", "モーリス・ジャール"):
            self.assertIn(name, text("r14-music"))
        for name in ("残酷な天使のテーゼ", "及川眠子", "佐藤英敏", "大森俊之", "高橋洋子"):
            self.assertIn(name, text("r15-song"))
        self.assertEqual(self.clip("r14-music")["shot"], "R14")      # where the source credits its own music
        self.assertEqual(self.clip("r15-song")["shot"], "R15")

    def test_the_blueprint_drifts_down_the_whole_time_at_one_speed(self):
        # Ingram: it moved "in a jerky fashion at two speeds"; then: "keep moving the whole time, slower, just moving
        # from top to bottom... slightly less opaque"
        bp = self.clip("r13-blueprint")
        r13 = next(n for n in range(850, 1000) if timeline.shot_at(self.doc, frame_t(n))["id"] == "R13")
        on = [n for n in range(850, 1010) if timeline.params_at(bp, frame_t(n))]
        self.assertEqual(on[0], r13)                                         # there from the start of R13
        ys = [timeline.params_at(bp, frame_t(n))["py"] for n in on]
        steps = [b - a for a, b in zip(ys, ys[1:])]
        self.assertTrue(all(s > 0 for s in steps))                          # always moving, always downward
        self.assertLess(max(steps) - min(steps), 0.01)                       # at one speed
        self.assertLess(max(steps), 6)                                       # slowly
        self.assertLessEqual(max(timeline.params_at(bp, frame_t(n)).get("opacity", 1.0) for n in on), 0.6)

    def test_taka_is_gone_before_the_watcher_arrives(self):
        # the source keeps its inset over its eye close-up; ours cuts, so nothing ties Taka to the Watcher
        first_eye = next(n for n in range(1100, 1260) if timeline.shot_at(self.doc, frame_t(n))["id"] == "R17")
        for c in self.doc["clips"]:
            if c["id"].startswith("r16-"):
                self.assertIsNone(timeline.params_at(c, frame_t(first_eye)), c["id"])

    def test_the_watcher_keeps_its_context(self):
        # Ingram: "much more zoomed out, we lose the context" (the smaller eyes, the town beneath)
        eye = self.clip("r17-eye")
        zooms = [p["zoom"] for p in (timeline.params_at(eye, frame_t(n)) for n in range(1150, 1220)) if p]
        self.assertTrue(zooms)
        self.assertLessEqual(max(zooms), 1.3)

    def test_the_tall_mech_is_seen_whole_only_once(self):
        # Ingram: "We cut to the same very tall mech shot twice." Extreme close-ups of its plates don't count.
        whole = set()
        for c in self.doc["clips"]:
            if c["layer"].get("src", "").endswith("R23-frame.png"):
                zooms = [k["zoom"] for k in c.get("keys", []) if "zoom" in k] or [c["layer"].get("zoom", 1.0)]
                if min(zooms) < 2.0:
                    whole.add(c["shot"])
        self.assertEqual(whole, {"R32"})              # opening chorus one since 2026-09-26 (it was R23)

    def test_the_speed_lines_fire_from_the_star_then_the_city(self):
        # Ingram: "have the radiating things emerge from the middle of the star, at the moment the origin is
        # slightly offset"; and for her new star (2026-09-26), "Make sure the wiggly lines radiate from where the
        # brightest middle bit of the sun is". Measured: the sun's white-hot heart in R03-star.png, the brightest
        # lights in R04-city.png.
        from titleseq import layers
        dust = self.clip("r03-dust")
        first = next(n for n in range(140, 200) if timeline.params_at(dust, frame_t(n)))
        drawn = lambda lo, hi: [n for n in range(lo, hi) if (n - first) % dust.get("on", 1) == 0]   # its drawings
        for clip_id, point, size, frames in (("r03-chart", (0.5661, 0.5151), (3104, 1568), drawn(170, 224)),
                                             ("r04-city", (0.445, 0.737), (2544, 1904), drawn(236, 312))):
            art = self.clip(clip_id)
            for n in frames:
                p = timeline.params_at(art, frame_t(n))
                _, m = layers.image_transform(size[0], size[1], "cover", p.get("zoom", 1.0), p.get("cx", 0.5),
                                              p.get("cy", 0.5), p.get("rot", 0.0), p.get("px", 720), p.get("py", 540))
                x, y = m @ [point[0] * size[0] - 0.5, point[1] * size[1] - 0.5, 1.0]
                d = timeline.params_at(dust, frame_t(n))
                self.assertLess(abs(d["ox"] - (x + 0.5)) + abs(d["oy"] - (y + 0.5)), 3.0, f"{clip_id} frame {n}")

    def test_drawn_things_step_on_twos_and_camera_moves_on_ones(self):
        # Ingram: "should your procedural elements... animate on twos?" (the source's effects step on twos, measured);
        # then "I was wrong about animating on less frames for backgrounds, that looks very jerky. Animate on 1s for
        # the background."
        for cid in ["r03-dust", "r20-counter"]:
            self.assertEqual(self.clip(cid).get("on"), 2, cid)
        for c in self.doc["clips"]:
            if c["layer"]["type"] in ("image", "video"):
                self.assertEqual(c.get("on", 1), 1, c["id"])

    def test_the_rooftop_shimmers_in_the_heat_under_a_crisp_credit_and_pans(self):
        # Ingram: "a soft, subtle heat haze... reasonably subtle and a slight pan might help make it feel more alive";
        # then, of the first pass (2 px ripples, 38 px across): "too subtle, needs to be higher frequency and
        # amplitude"
        haze, roof, song = self.clip("r15-haze"), self.clip("r15-rooftop"), self.clip("r15-song")
        self.assertEqual(haze["layer"]["type"], "heat_haze")
        self.assertLess(roof.get("z", 0), haze.get("z", 0))                # it shimmers the rooftop...
        self.assertLess(haze.get("z", 0), song.get("z", 0))                # ...never the credit's type
        amp, scale, speed = haze["layer"]["amp"], haze["layer"]["scale"], haze["layer"]["speed"]
        # Ingram, round 14, of the second pass (4.5 px ripples 14 px across, rising at 110 px/s): "make the haze
        # softer and less amplitude and slightly slower". It still shimmers (more than the first pass's 2 px, 38 px
        # across, 55 px/s) but with less swing, wider ripples and a slower rise than the second.
        self.assertLess(amp, 4.5)
        self.assertGreater(amp, 2.0)
        self.assertGreater(scale, 14)                                       # wider ripples are softer ones
        self.assertLess(speed, 110)
        self.assertGreater(speed, 55)                                       # "slightly" slower, not still
        self.assertLessEqual(amp / scale, 0.35)                             # and the mitflit keeps its outline
        shot = [n for n in range(1000, 1200) if timeline.shot_at(self.doc, frame_t(n))["id"] == "R15"]
        self.assertEqual([n for n in range(1000, 1200) if timeline.params_at(haze, frame_t(n))], shot)
        cxs = [timeline.params_at(roof, frame_t(n))["cx"] for n in shot]
        self.assertGreater(abs(cxs[-1] - cxs[0]), 0.02)                    # a slight pan

    def test_the_whole_picture_is_finished_like_a_tape(self):
        # Ingram: "some nice VHS grade grain across the whole thing... a bit more visual damage to parts of it"
        self.assertGreater(self.doc["finish"]["vhs"]["strength"], 0)
        damage = [c for c in self.doc["clips"] if c["layer"]["type"] == "vhs_damage"]
        self.assertGreaterEqual(len(damage), 4)
        self.assertIn("R17", {c["shot"] for c in damage})                  # the tape flinches at the Watcher

    def test_the_tape_lines_are_faint(self):
        # Ingram: "soften and lower the opacity of the VHS horizontal lines"
        self.assertLessEqual(self.doc["finish"]["vhs"]["noise"], 0.015)

    def test_it_opens_on_a_channel_flick_a_tracking_issue_and_blank_tape(self):
        # Ingram: "start with a 'tracking issue' and add some blank space, just a few seconds to the start of the
        # video", and "do the VHS text on the screen too... as if it were changing channel"
        pre = timeline.preroll_frames(self.doc)
        self.assertTrue(48 <= pre <= 120, pre)                                 # a few seconds
        live = lambda n: [p for p in (timeline.params_at(c, frame_t(n)) for c in self.doc["clips"]) if p]
        captions = []
        for n in range(-pre, 0):
            captions += [p["text"] for p in live(n) if p["type"] == "osd" and p["text"] not in captions]
        self.assertEqual([c for c in captions if c.startswith("CH")], ["CH 01", "CH 02", "CH 03"])
        self.assertIn("PLAY", captions)
        self.assertIn("TRACKING", captions)
        snow = [n for n in range(-pre, 0) if any(p.get("snow") for p in live(n))]
        self.assertTrue(snow and snow[0] == -pre)                               # it opens on an empty channel
        tape = [p["strength"] for n in range(-pre, 0) for p in live(n) if p["type"] == "tape_blank" and not p.get("snow")]
        self.assertAlmostEqual(max(tape), 1.0, places=4)                        # the tape plays out of true
        for n in range(-12, 0):                                                 # then half a second of clean black
            self.assertTrue(all(p["type"] == "tape_blank" and p["strength"] == 0 and not p.get("snow")
                                for p in live(n)), n)
        for c in self.doc["clips"]:                                             # and none of it reaches frame 0
            if c["id"].startswith(("pre-", "osd-")):
                self.assertLessEqual(c["end"], frame_t(0), c["id"])

    def test_the_vcr_captions_sit_above_the_tape(self):
        osd = [c for c in self.doc["clips"] if c["layer"]["type"] == "osd"]
        self.assertGreaterEqual(len(osd), 3)
        for c in osd:
            self.assertTrue(c["layer"].get("above_finish"), c["id"])

    def test_the_founders_flash_then_darken_in_the_sources_steps(self):
        for cid, sid in (("r28-hyuck", "R28"), ("r29-rupiah", "R29"), ("r30-anabala", "R30"), ("r31-shucks", "R31")):
            c = self.clip(cid)
            shot = [n for n in range(1370, 1430) if timeline.shot_at(self.doc, frame_t(n))["id"] == sid]
            on = [n for n in range(1370, 1430) if timeline.params_at(c, frame_t(n))]
            self.assertEqual(on, shot, cid)                                   # a hard cut in and out
            b = [timeline.params_at(c, frame_t(n))["brightness"] for n in on]
            self.assertAlmostEqual(b[0], 1.0)
            self.assertEqual(b[-4:], sorted(b[-4:], reverse=True))           # darkening, never lightening
            self.assertLess(b[-1], 0.2)

    def test_the_watcher_is_only_a_glimpse(self):
        # LEDGER #37: under a second, a hard cut in and out, pushing in on the eye; Ingram keeps it short for mystery
        eye = self.clip("r17-eye")
        on = [n for n in range(1100, 1260) if timeline.params_at(eye, frame_t(n))]
        r17 = [n for n in range(1100, 1260) if timeline.shot_at(self.doc, frame_t(n))["id"] == "R17"]
        self.assertEqual(on, r17)                                   # exactly the shot: cut in, cut out
        self.assertLess(len(on), 24)                                # under a second
        zooms = [timeline.params_at(eye, frame_t(n))["zoom"] for n in on]
        self.assertEqual(zooms, sorted(zooms))
        self.assertIn("R17", self.doc["built"])

    def test_the_blue_sky_dissolves_to_the_sunset_as_the_last_card_leaves(self):
        sunset = self.clip("r12-sunset")
        last = self.clip("r11-card-6")
        self.assertAlmostEqual(timeline.params_at(sunset, frame_t(889))["opacity"], 0.0, places=3)
        self.assertGreater(timeline.params_at(sunset, frame_t(896))["opacity"], 0.8)
        self.assertIsNone(timeline.params_at(last, frame_t(897)))
        self.assertEqual(timeline.shot_at(self.doc, frame_t(897))["id"], "R13")

    # The drum stem's kicks from the start of the sortie build to the head (one a beat, 0.467 s apart), measured
    # 2026-10-11 from artwork/title-sequences/reference/source-op/audio/stems/htdemucs/ost2-stereo44k/drums.wav. The
    # big accents fall on every fourth: bar 21 begins at 49.662, bar 22 at 51.525, and so on.
    KICKS = [49.662, 50.132, 50.602, 51.072, 51.525, 52.001, 52.460, 52.930, 53.394, 53.859, 54.323, 54.793,
             55.269, 55.740, 56.192, 56.662, 57.127, 57.603, 58.061, 58.526, 59.002, 59.478, 59.931, 60.395,
             60.860, 61.336, 61.794, 62.264, 62.735, 63.193, 63.669, 64.134, 64.604, 65.086]

    def test_the_sortie_build_is_cut_on_the_drums(self):
        # Ingram, round 14: "R18 onwards... We probably want to do some of our edits to align with the percussion.
        # This set of edits is a bit clunky, maybe a bit too complex." Every cut from the stencil card to the vehicles
        # lands on a kick (the card's first line on the snare just before the downbeat).
        shots = {sh["id"]: sh for sh in self.doc["shots"]}
        self.assertLessEqual(abs(shots["R18"]["in"] - 49.418), 0.045)
        for sid in ("R19", "R20", "R21", "R22", "R23", "R24", "R25", "R26", "R28", "R29", "R30", "R31", "R32",
                    "R33", "R34"):
            t = shots[sid]["in"]
            nearest = min(abs(t - k) for k in self.KICKS)
            self.assertLessEqual(nearest, 0.045, f"{sid} is {nearest:.3f} s from the nearest kick")

    def test_the_sortie_build_has_fewer_and_longer_cuts(self):
        # the same stretch used to cut twenty times in sixteen seconds, nine of them in under half a second
        shots = [sh for sh in self.doc["shots"] if "R18" <= sh["id"] <= "R36"]
        spans = [b["in"] - a["in"] for a, b in zip(shots, shots[1:])]
        self.assertEqual(sum(1 for d in spans if d <= 0), 2)                  # only the two shots that are out
        self.assertLessEqual(sum(1 for d in spans if 0 < d < 0.45), 1)        # and almost none under a beat

    def test_the_launch_tunnel_is_a_control_panel_seen_at_an_angle(self):
        # Ingram, round 14: "Replace this with a control panel screen, the same sort of EVA thing where coloured tabs
        # are locking or unlocking from each other... instead of a tunnel make it a control panel seen at an angle."
        ids = {c["id"] for c in self.doc["clips"]}
        self.assertFalse([i for i in ids if i.startswith("r22-lamps")])
        panel = self.clip("r22-panel")
        self.assertEqual(panel["layer"]["type"], "tab_panel")
        self.assertGreaterEqual(panel["end"] - panel["start"], 1.2)           # long enough to watch it work
        quads = [k["quad"] for k in panel["keys"]]
        self.assertNotEqual(quads[0], quads[-1])                              # the camera drifts across it
        for e in panel["layer"]["events"]:                                    # on a kick or halfway between two
            marks = self.KICKS + [(a + b) / 2 for a, b in zip(self.KICKS, self.KICKS[1:])]
            self.assertLessEqual(min(abs(e["t"] - m) for m in marks), 0.02, e)
        self.assertTrue(any(e["to"] == 0 for e in panel["layer"]["events"]))  # tabs lock as well as release

    def test_the_mech_bay_has_time_to_be_seen(self):
        # Ingram, round 14: "R23 is too brief to allow the user to see what is happening."
        bay = self.clip("r23-art")
        self.assertGreaterEqual(bay["end"] - bay["start"], 2.2)               # it was 1.8 s

    def test_the_machinery_pan_is_a_wall_of_the_directorates_own_screens(self):
        # Ingram, round 14: "R44, a generic pan across a generic looking Sci-fi space. We can do better."
        wall = self.clip("r44-wall")
        self.assertEqual(wall["layer"]["type"], "status_wall")
        srcs = [c["layer"].get("src", "") for c in self.doc["clips"]]
        self.assertFalse(any(x.endswith("R44-machinery.png") for x in srcs))
        keys = wall["keys"]
        self.assertGreater(keys[-1]["x"], keys[0]["x"])                       # a pan...
        self.assertLessEqual(keys[-1]["blur"], 1)                             # ...that comes to rest, sharp
        self.assertLessEqual(clock.time_to_frame(keys[-1]["t"]), clock.time_to_frame(wall["end"]) - 4)

    def test_the_star_children_last_into_the_red_star(self):
        # Ingram, round 14: "R02 we show the background image but it's too fast... Can we make this Mitflit image
        # last longer? It could leak into R03."
        mural, chart = self.clip("r02-mural"), self.clip("r03-chart")
        self.assertGreaterEqual(mural["end"] - mural["start"], 4.5)           # it was 2.3 s
        r03 = clock.time_to_frame(chart["start"]) + 1
        self.assertGreater(timeline.params_at(mural, frame_t(r03 + 4))["opacity"], 0.5)   # still there as R03 opens
        self.assertLess(mural["z"], chart["z"])                               # and the red star fades in over it

    def test_the_flashes_of_vetch_and_manako_are_gone_because_they_are_used_whole(self):
        # no image appears in two shots, so their old five-frame flashes (R65, R78) went when they took R14 and R24
        ids = {c["id"] for c in self.doc["clips"]}
        self.assertFalse({"r65-art", "r78-art"} & ids)

    def test_the_finale_is_one_shot_a_bar(self):
        # Ingram, round 15: "R94 - R110... we need less edits and we need to enhance this section as best we can...
        # What might fit better at a slower pace?" Seven seconds had a dozen cuts; now it is one shot to each of the
        # last four bars of the song, cut on the bar lines (bars 37 to 40), then the end card on the last.
        shots = {sh["id"]: sh for sh in self.doc["shots"]}
        bars = [clock.BAR1 + (n - 1) * 4 * clock.BEAT for n in range(37, 42)]
        for sid, t in zip(("R96", "R98", "R101", "R104", "R111"), bars):
            self.assertLessEqual(abs(shots[sid]["in"] - t), 0.025, sid)
        for a, b in zip(("R96", "R98", "R101", "R104"), ("R98", "R101", "R104", "R111")):
            self.assertAlmostEqual(shots[b]["in"] - shots[a]["in"], 4 * clock.BEAT, delta=0.06, msg=a)
        order = [sh["id"] for sh in self.doc["shots"]]
        for sid in ("R95", "R97", "R99", "R100", "R102", "R103", "R105", "R106", "R107", "R108", "R109", "R110"):
            nxt = order[order.index(sid) + 1]
            self.assertEqual(shots[sid]["in"], shots[nxt]["in"], f"{sid} is folded into the shot after it")

    def test_the_finale_shows_four_pictures_and_a_card(self):
        # the section showed a dozen images in seven seconds: the Gen 2 head, the walker, the pilot, the vault, the
        # witch, the machine in the alley, the engineer, the trainee
        start, end = clock.frame_to_time(1917), clock.frame_to_time(2102)
        pictures = [c["layer"]["src"].split("/")[-1] for c in self.doc["clips"]
                    if c["layer"]["type"] in ("image", "video", "door_open") and start - 1e-6 <= c["start"] < end]
        self.assertEqual(sorted(pictures), ["R101-vault.png", "R104-war-witch-pan.png", "R96-gen2-walker.png",
                                            "R99-gen2-pilot.png"])

    def test_here_is_the_last_flash_and_the_quiet_begins_on_the_bar_line(self):
        card, hill = self.clip("r95-card"), self.clip("r96-art")
        self.assertEqual(clock.time_to_frame(card["end"]) - clock.time_to_frame(card["start"]), 5)
        self.assertEqual(clock.time_to_frame(card["end"]), clock.time_to_frame(hill["start"]))

    def test_the_radar_scope_lies_over_the_hill_and_the_reticle_follows_the_pan(self):
        hill, hud = self.clip("r96-art"), self.clip("r96-hud")
        self.assertEqual(hud["layer"]["type"], "scope_hud")
        self.assertEqual((hud["start"], hud["end"]), (hill["start"], hill["end"]))
        n0, n1 = clock.time_to_frame(hill["start"]), clock.time_to_frame(hill["end"]) - 1
        self.assertGreater(timeline.params_at(hill, frame_t(n0))["cx"], timeline.params_at(hill, frame_t(n1))["cx"])
        for n in range(n0, n1 + 1):                                  # the reticle stays on the walker all the way
            cx = timeline.params_at(hill, frame_t(n))["cx"]
            want = 720 + (0.59 - cx) * 3104 * (1080 / 1568)
            self.assertAlmostEqual(timeline.params_at(hud, frame_t(n))["target_x"], want, delta=3.0, msg=n)
        layer = hud["layer"]
        self.assertAlmostEqual(layer["lines_at"], clock.BEAT, places=3)       # the readout starts on beat two
        self.assertGreaterEqual(len(layer["lines"]), 4)

    def test_the_pilot_tilts_for_the_whole_bar_and_the_stripe_wipes_it_away(self):
        pilot, stripe = self.clip("r99-art"), self.clip("r101-stripe")
        self.assertEqual(clock.time_to_frame(pilot["start"]), 1967)
        cys = [timeline.params_at(pilot, frame_t(n))["cy"] for n in range(1967, 2012)]
        self.assertLess(cys[0], 0.34)
        self.assertGreater(cys[-1], 0.66)                                     # the whole tilt, head to pilot
        self.assertEqual(cys, sorted(cys))
        self.assertLessEqual(max(b - a for a, b in zip(cys, cys[1:])) * 2304 * (1440 / 2048), 40)   # no lurch
        for n, key in ((2012, 0), (2021, 0)):                                 # the pilot shows ahead of the stripe
            lead = timeline.params_at(stripe, frame_t(n))["points"][0][1]     # the stripe's leading bottom corner
            edge = timeline.params_at(pilot, frame_t(n))["mask"][0][0]
            self.assertAlmostEqual(lead[0], edge[0], delta=0.5, msg=n)
            self.assertEqual(lead[1], edge[1], n)
        self.assertIsNone(timeline.params_at(pilot, frame_t(2022)))           # and is gone when the stripe has crossed

    def test_the_director_credit_lies_over_the_vault_and_is_gone_before_the_light(self):
        credit, vault = self.clip("r100-director"), self.clip("r101-art")
        self.assertNotIn("r100-black", {c["id"] for c in self.doc["clips"]})          # no black card of its own
        self.assertEqual(clock.time_to_frame(credit["start"]), 2012)                   # it lands on the bar line
        for n in range(2012, 2057):
            opened = timeline.params_at(vault, frame_t(n))["open"]
            opacity = (timeline.params_at(credit, frame_t(n)) or {}).get("opacity", 0.0)
            if opened >= 0.6:
                self.assertLess(opacity, 0.05, n)                                      # never white over the light

    def test_the_door_cracks_on_beat_three_and_the_picture_floods_to_white(self):
        vault, flood = self.clip("r101-art"), self.clip("r101-flood")
        crack = clock.time_to_frame(clock.BAR1 + 38 * 4 * clock.BEAT + 2 * clock.BEAT)
        opens = {n: timeline.params_at(vault, frame_t(n))["open"] for n in range(2012, 2057)}
        self.assertTrue(all(v < 1e-3 for n, v in opens.items() if n <= crack))          # shut until beat three
        self.assertGreater(opens[crack + 4], 0.0)
        self.assertAlmostEqual(opens[2056], 1.0, places=3)
        later = [opens[n] for n in range(crack, 2057)]
        self.assertEqual(later, sorted(later))
        zooms = [timeline.params_at(vault, frame_t(n))["zoom"] for n in range(2012, 2057)]
        self.assertEqual(zooms, sorted(zooms))
        self.assertGreater(zooms[-1], 3.0)
        steps = [b - a for a, b in zip(zooms, zooms[1:])]
        self.assertGreater(max(steps[-6:]), 3 * max(steps[:10]))               # slow at first, quick into the light
        self.assertAlmostEqual(timeline.params_at(flood, frame_t(2056))["amount"], 1.0, places=3)

    def test_the_vault_push_never_shows_the_pictures_edge(self):
        from PIL import Image
        vault = self.clip("r101-art")
        path = os.path.join(ROOT, vault["layer"]["src"])
        if not os.path.exists(path):
            self.skipTest("the gitignored art isn't in this checkout")
        iw, ih = Image.open(path).size
        for n in range(2012, 2057):
            p = timeline.params_at(vault, frame_t(n))
            s = max(1440 / iw, 1080 / ih) * p["zoom"]
            hw, hh = 720 / s, 540 / s
            cx, cy = p["cx"] * iw, p["cy"] * ih
            gap = max(hw - cx, cx + hw - iw, hh - cy, cy + hh - ih) * s
            self.assertLessEqual(gap, 0.5, f"frame {n} shows {gap:.0f} px past the vault picture's edge")

    def test_the_hero_plate_comes_out_of_the_light_settles_and_catches_a_flare_on_the_crash(self):
        plate, light = self.clip("r104-art"), self.clip("r104-lightin")
        self.assertTrue(plate["layer"]["src"].endswith("R104-war-witch-pan.png"))
        self.assertEqual(clock.time_to_frame(plate["start"]), 2057)
        cxs = [timeline.params_at(plate, frame_t(n))["cx"] for n in range(2057, 2102)]
        self.assertEqual(cxs, sorted(cxs, reverse=True))
        steps = [a - b for a, b in zip(cxs, cxs[1:])]
        self.assertGreater(max(steps[:8]), 3 * max(steps[-8:]))                # it arrives at speed and settles
        self.assertAlmostEqual(timeline.params_at(light, frame_t(2057))["amount"], 1.0, places=3)   # out of the white
        self.assertIsNone(timeline.params_at(light, frame_t(2075)))
        flare = self.clip("r104-flare")
        peak = max(range(2070, 2095), key=lambda n: (timeline.params_at(flare, frame_t(n)) or {"strength": 0})["strength"])
        self.assertLessEqual(abs(peak - clock.time_to_frame(86.1)), 1)         # the cymbal crash
        self.assertAlmostEqual(timeline.params_at(self.clip("r104-out"), frame_t(2101))["amount"], 1.0, places=3)

    def test_the_end_card_carries_the_production_companys_mark(self):
        # Ingram, round 15: "there is a graphic here you can use, this is the 'Production Company' that needs to go
        # on the end titles."
        logo, credit, wall = self.clip("r111-logo"), self.clip("r111-credit"), self.clip("r111-wall")
        self.assertTrue(logo["layer"]["src"].endswith("R111-mythica-machina-logo.png"))
        self.assertTrue(logo["layer"]["keyed"])
        self.assertEqual(logo["end"], wall["end"])                              # it stays to the end of the opening
        self.assertAlmostEqual(logo["keys"][-1]["t"], 88.55, delta=0.05)        # written on as the music stops
        self.assertEqual(logo["keys"][-1]["reveal_p"], 1.0)
        self.assertEqual(logo["keys"][0]["reveal_p"], 0.0)
        self.assertLess(credit["keys"][0]["t"], logo["start"])                  # the committee line comes first
        box = logo["layer"]["reveal"]["box"]
        self.assertTrue(all(it["y"] > box[3] for it in credit["layer"]["items"]))   # the mark is the focal point
        self.assertGreater(box[2] - box[0], 800)

    def test_the_mark_is_seen_whole_in_the_silence_before_the_tail_fades_it(self):
        logo, fade = self.clip("r111-logo"), self.clip("r111-fade")
        written = clock.time_to_frame(logo["keys"][-1]["t"])
        faded = clock.time_to_frame(fade["start"])
        self.assertGreaterEqual((faded - written) / clock.FPS, 0.9)

    def test_it_is_never_synced_to_the_server(self):
        # its credits will name who plays the Watcher (LEDGER #37); the module sync is an allow-list
        with open(os.path.join(ROOT, "tools", "module-sync", "stage-campaign-data.mjs"), encoding="utf-8") as f:
            src = f.read()
        block = src[src.index("SYNCED_CAMPAIGN_DIRS = ["):]
        block = block[:block.index("]")]
        self.assertNotIn("title-sequences", block)


if __name__ == "__main__":
    unittest.main()
