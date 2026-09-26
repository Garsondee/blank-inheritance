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
