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

    def test_the_verse_carries_only_the_cast_and_the_watcher(self):
        texts = [c for c in self.doc["clips"] if c["layer"]["type"] == "text" and c["shot"] in ("R11", "R12", "R13")]
        self.assertEqual(sorted(c["id"] for c in texts), ["r11-cast", "r11-watcher"])
        cast = [it["text"] for it in self.clip("r11-cast")["layer"]["items"]]
        self.assertEqual(cast[0], "出演")
        names = "　".join(cast[1:]).split("　")
        # all six players, in the kana order Japanese credits use: a, ku, ji, su, pi, ri
        self.assertEqual(names, ["アン", "クレイグ", "ジェイミー", "スティーブ", "ピッパ", "リアム"])
        watcher = [it["text"] for it in self.clip("r11-watcher")["layer"]["items"]]
        self.assertEqual(watcher, ["監視者", "クロード・コード"])

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

    def test_r35_is_ingrams_art_not_effects_on_their_own(self):
        # Ingram (2026-09-26): "R35 needs replacing, we don't have any graphics for it and it makes no sense on it's
        # own."
        r35 = [c for c in self.doc["clips"] if c["shot"] == "R35"]
        self.assertTrue(r35)
        self.assertTrue(all(c["layer"]["type"] in ("image", "video") for c in r35))
        on = [n for n in range(1511, 1581) if any(timeline.params_at(c, frame_t(n)) for c in r35)]
        self.assertEqual(len(on), 70)

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

    def test_lead_beat_three_is_the_animated_newcomer_not_the_extreme_close_up(self):
        # Ingram (2026-09-26): "00:57 - not a fan of this moment, it's far too zoomed in. Get rid of it entirely and
        # select something else." The still pushed from 1.8 to 2.8 times; her animated newcomer only drifts in.
        face = self.clip("r24-face")
        self.assertEqual(face["layer"]["type"], "video")
        on = [timeline.params_at(face, frame_t(n)) for n in range(1288, 1336)]
        self.assertTrue(all(on))                                   # the whole of R24 to R26
        self.assertLessEqual(max(p.get("zoom", 1.0) for p in on), 1.1)
        srcs = [c["layer"].get("src", "") for c in self.doc["clips"]]
        self.assertFalse(any(s.endswith("R24-newcomer.png") for s in srcs))

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

    def test_the_silhouettes_fade_slowly_and_drift_slowly(self):
        # Ingram, Step 3 review: "Silhouettes must fade in and out slowly and move slower."
        for cid in ("r11-standing", "r11-pass-a", "r11-pass-b"):
            c = self.clip(cid)
            on = [n for n in range(500, 900) if timeline.params_at(c, frame_t(n))]
            ops = [timeline.params_at(c, frame_t(n)).get("opacity", 1.0) for n in on]
            peak = max(ops)
            self.assertGreaterEqual(next(i for i, o in enumerate(ops) if o >= peak - 1e-6), 12, cid)   # half a second in
            self.assertGreaterEqual(len(ops) - 1 - max(i for i, o in enumerate(ops) if o >= peak - 1e-6), 12, cid)
            pxs = [timeline.params_at(c, frame_t(n)).get("px", 0) for n in on]
            exposure = c.get("on", 1)                                        # it steps once per drawing
            self.assertLessEqual(max(abs(b - a) for a, b in zip(pxs, pxs[1:])), 6 * exposure, cid)
            self.assertLessEqual(abs(pxs[-1] - pxs[0]) / len(pxs), 6, cid)   # slow on average, too

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
        for cid in ["r03-dust", "r20-counter"] + [f"r22-lamps-{k}" for k in range(10)]:
            self.assertEqual(self.clip(cid).get("on"), 2, cid)
        for c in self.doc["clips"]:
            if c["layer"]["type"] in ("image", "video"):
                self.assertEqual(c.get("on", 1), 1, c["id"])
        self.assertEqual(self.clip("r11-face")["layer"]["hold"], 3)      # the newcomer's own drawings stay on threes

    def test_the_rooftop_shimmers_in_the_heat_under_a_crisp_credit_and_pans(self):
        # Ingram: "a soft, subtle heat haze... reasonably subtle and a slight pan might help make it feel more alive";
        # then, of the first pass (2 px ripples, 38 px across): "too subtle, needs to be higher frequency and
        # amplitude"
        haze, roof, song = self.clip("r15-haze"), self.clip("r15-rooftop"), self.clip("r15-song")
        self.assertEqual(haze["layer"]["type"], "heat_haze")
        self.assertLess(roof.get("z", 0), haze.get("z", 0))                # it shimmers the rooftop...
        self.assertLess(haze.get("z", 0), song.get("z", 0))                # ...never the credit's type
        amp, scale = haze["layer"]["amp"], haze["layer"]["scale"]
        self.assertGreaterEqual(amp, 4.0)                                   # well past the first pass's 2 px
        self.assertLessEqual(scale, 20)                                     # ripples finer than its 38 px
        self.assertGreater(haze["layer"]["speed"] / scale, 55 / 38 * 2)     # and shimmering faster
        self.assertLessEqual(amp / scale, 0.35)                             # but the mitflit keeps its outline
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

    def test_the_newcomer_plays_through_once_without_looping(self):
        from titleseq import layers
        face = self.clip("r11-face")
        path = os.path.join(ROOT, face["layer"]["src"])
        if not os.path.exists(path):
            self.skipTest("the gitignored art isn't in this checkout")
        n_frames = len(layers.load_video(face["layer"]["src"]))           # a clip, or Ingram's folder of keyed PNGs
        p = face["layer"]
        first, last = clock.time_to_frame(face["start"]) + 1, clock.time_to_frame(face["end"])
        shown = [layers.video_frame_index(n_frames, n - first, p["speed"], p["hold"], p["mode"])
                 for n in range(first, last + 1)]
        self.assertEqual(shown, sorted(shown))                  # never jumps back to the start
        self.assertLess(shown[-1], n_frames - 1)                # and never runs out and freezes

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

    def test_the_blue_sky_dissolves_to_the_sunset_as_the_newcomer_fades(self):
        sunset, face = self.clip("r12-sunset"), self.clip("r11-face")
        self.assertAlmostEqual(timeline.params_at(sunset, frame_t(889))["opacity"], 0.0, places=3)
        self.assertGreater(timeline.params_at(sunset, frame_t(896))["opacity"], 0.8)
        self.assertIsNone(timeline.params_at(face, frame_t(897)))
        self.assertEqual(timeline.shot_at(self.doc, frame_t(897))["id"], "R13")

    def test_it_is_never_synced_to_the_server(self):
        # its credits will name who plays the Watcher (LEDGER #37); the module sync is an allow-list
        with open(os.path.join(ROOT, "tools", "module-sync", "stage-campaign-data.mjs"), encoding="utf-8") as f:
            src = f.read()
        block = src[src.index("SYNCED_CAMPAIGN_DIRS = ["):]
        block = block[:block.index("]")]
        self.assertNotIn("title-sequences", block)


if __name__ == "__main__":
    unittest.main()
