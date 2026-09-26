"""matte.py: cutting art out of flat backdrops (the newcomer's grey, the hand's cream) and dark ink off light ground."""
import os
import sys
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import matte  # noqa: E402

GREY = np.array([0.55, 0.57, 0.58], np.float32)
RED = np.array([0.9, 0.2, 0.1], np.float32)


def figure_on_backdrop(h=200, w=260, gradient=0.0):
    """A red disc on a grey backdrop that brightens to the right by `gradient`, touching the bottom edge."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    bg = GREY[None, None, :] + gradient * (xx / (w - 1))[..., None]
    d = np.hypot(xx - 130, yy - 150)
    cover = np.clip(70.5 - d, 0.0, 1.0)[..., None]               # one anti-aliased pixel of edge
    return (cover * RED + (1 - cover) * bg).astype(np.float32), cover[..., 0], bg


class TestBackdrop(unittest.TestCase):
    def test_a_graded_backdrop_is_recovered_even_with_art_touching_an_edge(self):
        img, _, bg = figure_on_backdrop(gradient=0.2)
        B = matte.fit_backdrop(img)
        far = np.hypot(*np.mgrid[0:200, 0:260] - np.array([150, 130])[:, None, None]) > 80
        self.assertLess(np.abs(B - bg)[far].max(), 0.01)


class TestFlat(unittest.TestCase):
    def test_the_backdrop_goes_clear_and_the_art_stays_solid(self):
        img, cover, _ = figure_on_backdrop(gradient=0.15)
        prem, a = matte.cut_out(img, {"mode": "flat"})
        self.assertLess(a[5, 5], 0.01)
        self.assertLess(a[5, 250], 0.01)
        self.assertGreater(a[150, 130], 0.99)

    def test_edges_come_back_without_the_backdrop_in_them(self):
        # pasted onto blue, a grey-fringed edge would carry green; a clean one carries none
        img, cover, _ = figure_on_backdrop()
        prem, a = matte.cut_out(img, {"mode": "flat"})
        out = prem + (1 - a)[..., None] * np.array([0.0, 0.0, 1.0], np.float32)
        edge = (cover > 0.05) & (cover < 0.95)
        self.assertTrue(edge.any())
        self.assertLess(out[..., 1][edge].max() - RED[1], 0.03)

    def test_premultiplied_colour_never_exceeds_its_alpha(self):
        img, _, _ = figure_on_backdrop()
        prem, a = matte.cut_out(img, {"mode": "flat"})
        self.assertTrue((prem <= a[..., None] + 1e-6).all())


class TestDark(unittest.TestCase):
    def test_ink_stays_and_a_half_dark_shadow_is_cut_away(self):
        img = np.full((120, 160, 3), 0.85, np.float32)
        img[20:60, 40:60] = 0.03                                   # the ink
        img[70:90, 40:120] = 0.40                                  # a cast shadow, about half as dark
        prem, a = matte.cut_out(img, {"mode": "dark", "lo": 0.7, "hi": 0.85})
        self.assertGreater(a[40, 50], 0.99)
        self.assertLess(a[80, 80], 0.01)
        self.assertLess(a[5, 5], 0.01)
        self.assertLess(prem[40, 50].max(), 0.05)                  # ink comes back black


class TestCleanUp(unittest.TestCase):
    def setUp(self):
        self.img = np.full((200, 200, 3), 0.6, np.float32)
        self.img[40:160, 40:160] = (0.1, 0.1, 0.1)                 # the figure
        self.img[90:100, 90:100] = 0.6                             # a backdrop-coloured patch inside it
        self.img[10:13, 180:183] = (0.1, 0.1, 0.1)                 # a speck
        self.img[170:190, 170:190] = (0.1, 0.1, 0.1)               # a small separate shape (a passing gull)

    def test_largest_keeps_only_the_figure(self):
        _, a = matte.cut_out(self.img, {"mode": "flat", "keep": "largest"})
        self.assertLess(a[11, 181], 0.01)
        self.assertLess(a[180, 180], 0.01)
        self.assertGreater(a[50, 50], 0.99)

    def test_min_area_drops_specks_but_keeps_a_gull(self):
        _, a = matte.cut_out(self.img, {"mode": "flat", "min_area": 30})
        self.assertLess(a[11, 181], 0.01)
        self.assertGreater(a[180, 180], 0.99)

    def test_holes_fill_all_or_only_small_ones(self):
        _, a = matte.cut_out(self.img, {"mode": "flat"})
        self.assertLess(a[95, 95], 0.01)
        _, a = matte.cut_out(self.img, {"mode": "flat", "fill_holes": True})
        self.assertGreater(a[95, 95], 0.99)
        _, a = matte.cut_out(self.img, {"mode": "flat", "fill_holes": 50})         # the patch is 100 px
        self.assertLess(a[95, 95], 0.01)

    def test_an_unknown_mode_is_refused(self):
        with self.assertRaises(ValueError):
            matte.cut_out(self.img, {"mode": "chroma"})


if __name__ == "__main__":
    unittest.main()
