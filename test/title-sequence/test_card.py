"""card.py: the episode title card after the opening (Ingram, 2026-09-26: "when we start a session we watch the intro
video, then we cut to the episode title, then we fade into the first scene automatically")."""
import json
import os
import sys
import unittest

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import card, clock, timeline  # noqa: E402

EPISODE = "episode-c1e1-mothers-maiden-name"


def text_of(doc):
    return [it["text"] for c in doc["clips"] for it in c["layer"].get("items", [])]


class TestTheCard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = card.build(EPISODE)

    def test_it_says_the_episode_in_english_and_japanese(self):
        words = text_of(self.doc)
        with open(os.path.join(ROOT, "data", "episodes", EPISODE + ".json"), encoding="utf-8") as f:
            title = json.load(f)["title"]
        self.assertIn(title.upper().replace("'", "’"), words)             # the episode's own title, in caps
        self.assertIn("EPISODE:1", words)
        self.assertIn("第壱話", words)
        self.assertIn("母の旧姓、再び", words)
        self.assertFalse(any("{" in w for w in words))                        # every field filled in

    def test_it_is_a_short_silent_film_of_its_own(self):
        self.assertIsNone(self.doc["track"])
        self.assertEqual(timeline.end_frame(self.doc), round((7.0 + clock.LEAD_IN) * clock.FPS))
        self.assertTrue(self.doc.get("sound"))                                 # just the tape's hiss
        self.assertEqual(timeline.validate(self.doc), [])

    def test_it_cuts_in_from_black_and_ends_on_black_for_the_fade_into_the_scene(self):
        words = [c for c in self.doc["clips"] if c["layer"]["type"] == "text"]
        first_word = min(c["start"] for c in words)
        self.assertAlmostEqual(first_word, 0.0, delta=0.05)                    # a hard cut, half a second in
        fade = next(c for c in self.doc["clips"] if c["id"] == "card-fade")
        last = timeline.end_frame(self.doc) - 1
        self.assertGreaterEqual(timeline.params_at(fade, clock.frame_to_time(last))["amount"], 0.999)

    def test_it_wears_the_openings_film_type_and_tape(self):
        with open(os.path.join(ROOT, "data", "title-sequences", "opening.json"), encoding="utf-8") as f:
            opening = json.load(f)
        self.assertEqual(self.doc["finish"], opening["finish"])
        for c in self.doc["clips"]:
            if c["layer"]["type"] == "text":
                self.assertEqual(c["layer"]["kind"], "title")
                self.assertGreater(c["layer"].get("soften", 0), 0, c["id"])
                self.assertGreater(c["layer"].get("glow", 0), 0, c["id"])

    def test_foundry_finds_it_by_the_episode_id(self):
        self.assertEqual(card.video_name(EPISODE), f"episode-titles/{EPISODE}.mp4")

    def test_every_titled_episode_exists(self):
        with open(card.TITLES, encoding="utf-8") as f:
            titles = json.load(f)
        for eid in titles["episodes"]:
            self.assertTrue(os.path.exists(os.path.join(card.EPISODES, eid + ".json")), eid)

    def test_an_episode_without_a_card_entry_says_so(self):
        with self.assertRaises(KeyError):
            card.fields("episode-c9e9-nothing-yet")


if __name__ == "__main__":
    unittest.main()
