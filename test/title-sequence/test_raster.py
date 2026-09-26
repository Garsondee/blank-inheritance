"""raster.py: frame buffers, blending and the 4:3 picture between side bars."""
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "title-sequence"))

from titleseq import raster  # noqa: E402


class TestPillarbox(unittest.TestCase):
    def test_the_picture_sits_between_240px_black_bars(self):
        pic = np.full((1080, 1440, 3), 200, np.uint8)
        out = raster.pillarbox(pic)
        self.assertEqual(out.shape, (1080, 1920, 3))
        self.assertTrue((out[:, :240] == 0).all())
        self.assertTrue((out[:, 1680:] == 0).all())
        self.assertTrue((out[:, 240:1680] == 200).all())


class TestHalftone(unittest.TestCase):
    """Manga screentone for the black-and-white smoke and cranes (Ingram, 2026-09-26: "could you produce a Halftone
    dots manga aesthetic? That would lift both the smoke and the cranes")."""

    def ink(self, grey, w=240, h=180, **kw):
        out = raster.halftone(np.full((h, w, 3), grey, np.float32), **kw)
        ink, paper = raster.rgb01((16, 14, 14)), raster.rgb01((236, 232, 220))
        a = (paper[0] - out[..., 0]) / (paper[0] - ink[0])           # 1 where ink, 0 where paper
        return a

    def test_a_mid_grey_is_about_half_ink_in_dots(self):
        a = self.ink(0.5)
        self.assertAlmostEqual(float(a.mean()), 0.5, delta=0.06)
        self.assertGreater(float(((a < 0.05) | (a > 0.95)).mean()), 0.75)   # two-tone: ink or paper, bar the dot edges

    def test_black_closes_up_solid_and_white_stays_paper(self):
        self.assertGreater(float(self.ink(0.0).mean()), 0.97)
        self.assertLess(float(self.ink(1.0).mean()), 0.02)

    def test_darker_means_bigger_dots(self):
        means = [float(self.ink(g).mean()) for g in (0.8, 0.6, 0.4, 0.2)]
        self.assertEqual(means, sorted(means))

    def test_the_dots_keep_their_size_whatever_the_picture(self):
        # the grid belongs to the frame: the same grey gives the same dots at the same places
        a, b = self.ink(0.5), self.ink(0.5)
        np.testing.assert_allclose(a, b)
        coarse = self.ink(0.5, cell=16)
        fine = self.ink(0.5, cell=6)
        edges = lambda x: float(np.abs(np.diff(x, axis=1)).mean())
        self.assertGreater(edges(fine), edges(coarse))                # more, smaller dots


class TestBlending(unittest.TestCase):
    def test_over_respects_coverage(self):
        img = raster.canvas((0, 0, 0), w=3, h=1)
        alpha = np.array([[0.0, 0.5, 1.0]], np.float32)
        raster.over(img, raster.rgb01((200, 100, 0)), alpha)
        np.testing.assert_allclose(img[0, 0], [0, 0, 0], atol=1e-6)
        np.testing.assert_allclose(img[0, 1], np.array([100, 50, 0]) / 255, atol=1e-6)
        np.testing.assert_allclose(img[0, 2], np.array([200, 100, 0]) / 255, atol=1e-6)

    def test_screen_never_darkens_and_keeps_white_white(self):
        img = np.array([[[0.0, 0.5, 1.0]]], np.float32)
        raster.screen(img, np.full_like(img, 0.5))
        np.testing.assert_allclose(img[0, 0], [0.5, 0.75, 1.0], atol=1e-6)

    def test_mix_at_full_amount_is_the_flat_colour(self):
        img = raster.canvas((10, 20, 30), w=2, h=2)
        raster.mix(img, (229, 255, 255), 1.0)
        np.testing.assert_allclose(img[1, 1], np.array([229, 255, 255]) / 255, atol=1e-6)

    def test_to_uint8_clips(self):
        out = raster.to_uint8(np.array([[[-0.5, 0.5, 1.5]]], np.float32))
        self.assertEqual(out.tolist(), [[[0, 128, 255]]])


if __name__ == "__main__":
    unittest.main()
