"""render.py end to end: a two-frame draft with the music becomes a real 1920x1080 MP4 with an audio stream.

Skipped where ffmpeg or the (gitignored) music file isn't present, as in a fresh clone.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

import render  # noqa: E402
from titleseq.encode import TRACK, find_ffmpeg  # noqa: E402

FFMPEG = find_ffmpeg()


@unittest.skipUnless(FFMPEG and os.path.exists(TRACK), "needs ffmpeg and the music file")
class TestDraftRender(unittest.TestCase):
    def test_two_frames_become_a_1080p_mp4_with_sound(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "smoke.mp4")
            # frames 0 and 1: frame 1 starts at -0.4583 s, so --to -0.45 includes it
            render.main(["draft", "--from=-0.5", "--to=-0.45", "--clean", "--out", out])
            self.assertTrue(os.path.exists(out))
            probe = os.path.join(os.path.dirname(FFMPEG), "ffprobe" + (".exe" if os.name == "nt" else ""))
            info = json.loads(subprocess.run(
                [probe, "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames", "-of", "json", out],
                capture_output=True, text=True, check=True).stdout)
            kinds = {s["codec_type"] for s in info["streams"]}
            self.assertEqual(kinds, {"video", "audio"})
            video = next(s for s in info["streams"] if s["codec_type"] == "video")
            self.assertEqual((video["width"], video["height"]), (1920, 1080))
            self.assertEqual(int(video["nb_frames"]), 2)

    def test_the_titles_sit_at_the_campaigns_music_level(self):
        # the audio pipeline sets all music to -18 LUFS, and players hear the titles at their own music volume
        from titleseq.encode import MUSIC_LUFS, loudness, track_with_lead_in
        self.assertAlmostEqual(loudness(FFMPEG, track_with_lead_in(FFMPEG)), MUSIC_LUFS, delta=1.0)

    def test_a_render_can_start_playing_before_it_has_downloaded(self):
        # faststart: the index (moov) comes before the media (mdat), so a browser plays while it downloads
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "fast.mp4")
            render.main(["draft", "--from=-0.5", "--to=-0.45", "--clean", "--out", out])
            boxes, pos = [], 0
            with open(out, "rb") as fh:
                data = fh.read()
            while pos + 8 <= len(data):
                size = int.from_bytes(data[pos:pos + 4], "big")
                boxes.append(data[pos + 4:pos + 8].decode("latin-1"))
                if size == 1:
                    size = int.from_bytes(data[pos + 8:pos + 16], "big")
                pos += max(size, 8)
            self.assertLess(boxes.index("moov"), boxes.index("mdat"), boxes)

    def test_the_preroll_plays_with_its_static(self):
        # the first frames of the whole opening: an empty channel, and the static under it
        import numpy as np
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "pre.mp4")
            render.main(["draft", "--from=-3.5", "--to=-3.35", "--clean", "--out", out])
            pcm = subprocess.run([FFMPEG, "-v", "error", "-i", out, "-f", "s16le", "-ac", "1", "-ar", "22050", "-"],
                                 capture_output=True, check=True).stdout
            sound = np.frombuffer(pcm, np.int16).astype(np.float64) / 32768
            self.assertGreater(len(sound), 22050 * 0.1)
            self.assertGreater(np.sqrt(np.mean(sound ** 2)), 0.005)          # audible static, at the -18 LUFS mix


class TestFrameRange(unittest.TestCase):
    """Which frames a draft covers: the pre-roll first, unless --no-preroll or a --from says otherwise."""
    DOC = {"preroll": {"seconds": 3.0}}

    def first(self, t_from=None, no_preroll=False):
        return render.frame_range(argparse.Namespace(t_from=t_from, t_to=None, no_preroll=no_preroll), self.DOC)[0]

    def test_a_whole_draft_opens_on_the_preroll(self):
        self.assertEqual(self.first(), -72)

    def test_no_preroll_starts_on_the_programme(self):
        self.assertEqual(self.first(no_preroll=True), 0)

    def test_a_from_starts_where_it_says(self):
        self.assertEqual(self.first(-0.5), 0)                  # the programme's first frame: no pre-roll
        self.assertEqual(self.first(-2.0), -36)                # partway into it
        self.assertEqual(self.first(-9.0), -72)                # never before it


if __name__ == "__main__":
    unittest.main()
