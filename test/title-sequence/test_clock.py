"""clock.py: our frames, the track's seconds and the measured bar grid (design/opening-titles.md section 4)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "title-sequence"))

from titleseq import clock  # noqa: E402


class TestFrameTime(unittest.TestCase):
    def test_frame_zero_is_the_lead_in(self):
        self.assertAlmostEqual(clock.frame_to_time(0), -0.5)

    def test_the_first_note_is_frame_twelve(self):
        self.assertAlmostEqual(clock.frame_to_time(12), 0.0)
        self.assertEqual(clock.time_to_frame(0.0), 12)

    def test_round_trip_every_frame(self):
        for n in range(clock.total_frames()):
            self.assertEqual(clock.time_to_frame(clock.frame_to_time(n)), n)

    def test_a_time_typed_to_four_decimals_lands_on_its_frame(self):
        # frame 8 starts at -0.16666...; -0.1667 is a hair early and must still mean frame 8
        self.assertEqual(clock.time_to_frame(-0.1667), 8)
        self.assertEqual(clock.time_to_frame(-0.0417), 11)

    def test_a_time_inside_a_frame_is_that_frame(self):
        self.assertEqual(clock.time_to_frame(0.01), 12)
        self.assertEqual(clock.time_to_frame(0.04), 12)

    def test_the_video_is_the_track_plus_its_lead_in(self):
        self.assertEqual(clock.total_frames(), round((89.626 + 0.5) * 24))


class TestBarGrid(unittest.TestCase):
    def test_bar_one_is_the_bands_entry(self):
        bar, beat = clock.bar_beat(clock.BAR1)
        self.assertEqual(bar, 1)
        self.assertAlmostEqual(beat, 1.0)

    def test_nothing_before_bar_one(self):
        self.assertIsNone(clock.bar_beat(5.0))

    def test_bar_to_time_inverts_bar_beat(self):
        for bar, beat in [(1, 1.0), (6, 1.6), (25, 4.44), (38, 4.54)]:
            b, bt = clock.bar_beat(clock.bar_to_time(bar, beat))
            self.assertEqual(b, bar)
            self.assertAlmostEqual(bt, beat, places=6)

    def test_tempo_is_the_measured_128_45_bpm(self):
        self.assertAlmostEqual(60 / clock.BEAT, 128.45, places=1)


if __name__ == "__main__":
    unittest.main()
