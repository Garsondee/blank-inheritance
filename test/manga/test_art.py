"""art.py: Midjourney art cropped to its panel and given the issue's one printed look."""
import os
import shutil
import tempfile
import unittest

import cv2
import numpy as np

import support  # noqa: F401
from mangapress import art


class TestCrop(unittest.TestCase):
    def test_the_crop_has_the_panels_shape_and_stays_inside_the_picture(self):
        for aspect in (0.5, 1.0, 1.63, 3.0):
            for focus in ((0.0, 0.0), (0.5, 0.5), (1.0, 1.0), (0.2, 0.9)):
                x0, y0, x1, y1 = art.crop_box(1456, 816, aspect, focus)
                self.assertAlmostEqual((x1 - x0) / (y1 - y0), aspect, places=6)
                self.assertGreaterEqual(x0, -1e-9)
                self.assertGreaterEqual(y0, -1e-9)
                self.assertLessEqual(x1, 1456 + 1e-9)
                self.assertLessEqual(y1, 816 + 1e-9)

    def test_the_crop_centres_on_the_focus_when_the_edges_allow(self):
        x0, y0, x1, y1 = art.crop_box(2000, 1000, 1.0, focus=(0.4, 0.5), zoom=2.0)
        self.assertAlmostEqual((x0 + x1) / 2, 800)
        self.assertAlmostEqual((y0 + y1) / 2, 500)
        self.assertAlmostEqual(x1 - x0, 500)

    def test_fit_returns_the_panels_pixels(self):
        g = np.random.default_rng(0).random((816, 1456)).astype(np.float32)
        self.assertEqual(art.fit(g, 640, 300).shape, (300, 640))


class TestTones(unittest.TestCase):
    ramp = np.tile(np.linspace(0, 1, 1000, dtype=np.float32), (200, 1))

    def test_flat_greys_settle_on_their_steps_away_from_the_edges(self):
        out = art.flat(self.ramp)
        edges = np.array(art.FLAT_EDGES)
        away = np.min(np.abs(self.ramp[..., None] - edges), axis=-1) > 0.05
        self.assertTrue(np.all(np.min(np.abs(out[away][:, None] - np.array(art.FLAT_STEPS)), axis=1) < 1e-6))

    def test_flat_never_turns_a_darker_grey_lighter(self):
        row = art.flat(self.ramp)[0]
        self.assertTrue(np.all(np.diff(row) >= -1e-6))

    def test_dots_are_pure_black_and_white_and_darker_greys_carry_more_ink(self):
        out = art.dots(self.ramp, 8.0)
        self.assertEqual(set(np.unique(out)), {0.0, 1.0})
        ink = 1.0 - out.mean(axis=0)
        bands = [ink[(self.ramp[0] >= lo) & (self.ramp[0] < hi)].mean()
                 for lo, hi in ((0.0, 0.18), (0.2, 0.45), (0.47, 0.7), (0.73, 0.89), (0.91, 1.0))]
        self.assertTrue(all(a > b for a, b in zip(bands, bands[1:])), bands)
        self.assertEqual(bands[0], 1.0)
        self.assertEqual(bands[-1], 0.0)

    def test_an_unknown_tone_is_refused(self):
        with self.assertRaises(ValueError):
            art.tone(self.ramp, "sepia")


class TestLoad(unittest.TestCase):
    def test_a_path_with_spaces_and_japanese_loads_and_is_levelled(self):
        d = tempfile.mkdtemp(prefix="manga art ")
        try:
            path = os.path.join(d, "花村 エミ.png")
            img = np.tile(np.linspace(40, 200, 256).astype(np.uint8), (64, 1))
            ok, buf = cv2.imencode(".png", cv2.cvtColor(img, cv2.COLOR_GRAY2BGR))
            self.assertTrue(ok)
            buf.tofile(path)
            g = art.load_grey(path)
            self.assertEqual(g.shape, (64, 256))
            self.assertAlmostEqual(float(g.min()), 0.0, places=3)
            self.assertAlmostEqual(float(g.max()), 1.0, places=3)
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_a_missing_file_says_so(self):
        with self.assertRaises((FileNotFoundError, OSError)):
            art.load_grey(os.path.join(tempfile.gettempdir(), "no-such-manga-art.png"))


if __name__ == "__main__":
    unittest.main()
