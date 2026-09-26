"""logo.py and the title's light layers: the blade kanji, the composed logo, rays, beams and polygons."""
import os
import sys
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import fx, layers, logo, raster  # noqa: E402

FONTS_PRESENT = os.path.exists(os.path.join(layers.FONT_DIR, "NotoSerifCJKjp-Black.otf"))


class TestBlades(unittest.TestCase):
    def test_a_blade_runs_between_its_ends_and_a_tip_pulls_to_a_point(self):
        plain = logo.blade_polygon(0, 0, 100, 0, 20)
        tipped = logo.blade_polygon(0, 0, 100, 0, 20, tip1=50)
        self.assertEqual(len(plain), 4)
        self.assertEqual(len(tipped), 5)
        self.assertAlmostEqual(max(x for x, _ in tipped), 150)          # the point sits 50 past the end
        ys = [y for _, y in plain]
        self.assertAlmostEqual(max(ys) - min(ys), 20)                    # the width is the blade's width

    def test_every_kanji_is_drawn_and_reads_as_ink(self):
        for ch in "空白相続":
            m = logo.glyph_mask(ch, 200)
            self.assertGreater(m.mean(), 0.03, ch)                        # real strokes, not an empty box
            self.assertLess(m.mean(), 0.45, ch)                           # and not a filled block

    def test_the_horizontal_strokes_rise_to_the_right(self):
        x0, y0, x1, y1, *_ = logo.styled_stroke((100, 500, 900, 500, 60, 0, 0, 0, 0))
        self.assertLess(y1, y0)


@unittest.skipUnless(FONTS_PRESENT, "needs the gitignored fonts in third-party/fonts")
class TestComposedLogo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parts = logo.render_parts(layers.FONT_DIR)

    def rows(self, part):
        a = self.parts[part][1]
        ys = np.nonzero(a.max(axis=1) > 0.5)[0]
        return ys.min(), ys.max()

    def test_the_book_sits_above_the_wordmark_and_the_kanji_hang_below_it(self):
        book_top, book_bottom = self.rows("book")
        wm_top, wm_bottom = self.rows("wordmark")
        k_top, k_bottom = self.rows("kanji_alpha")
        self.assertLess(book_bottom, wm_bottom)
        self.assertLess(book_top, wm_top)
        self.assertGreater(k_bottom, wm_bottom + 150)            # the blades hang well below the wordmark

    def test_the_wordmark_stays_readable_above_the_kanji(self):
        wm = self.parts["wordmark"][1] > 0.5
        k = self.parts["kanji_alpha"][1] > 0.5
        covered = (wm & k).sum() / max(1, wm.sum())
        self.assertLess(covered, 0.25)                           # the blades cross the wordmark's edge, not bury it

    def test_everything_fits_inside_the_picture(self):
        for name in ("wordmark", "kanji", "book"):
            a = self.parts[name][1]
            self.assertEqual(a[:, :4].max(), 0.0, name)
            self.assertEqual(a[:4].max(), 0.0, name)

    def test_the_kanji_run_orange_at_the_top_to_red_at_the_bottom(self):
        rgb, a = self.parts["kanji"]
        top, bottom = self.rows("kanji_alpha")
        def mean_at(y):
            m = self.parts["kanji_alpha"][1][y] > 0.9
            return rgb[y][m].mean(axis=0)
        upper, lower = mean_at(top + 60), mean_at(bottom - 60)
        self.assertGreater(upper[1], lower[1])                   # more green (orange) above, less (red) below

    def test_book_one_is_big_enough_and_its_strokes_stay_clear(self):
        # Ingram, Step 3 review: 第一部 needed to be bigger, and its outline was clogging it (a red ring drawn inside
        # and outside every stroke of the heaviest weight at 70 px). Now the outline sits outside the strokes only.
        import cv2
        rgb, a = self.parts["book"]
        top, bottom = self.rows("book")
        self.assertGreaterEqual(bottom - top, 85)                            # it was 69 px tall
        inside = cv2.erode((a > 0.99).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
        self.assertGreater(inside.sum(), 500)
        np.testing.assert_allclose(rgb[inside].mean(axis=0), np.array(logo.BOOK_FILL) / 255, atol=0.02)

    def test_the_logo_layer_moves_with_dx_and_dy(self):
        a, b = raster.canvas(), raster.canvas()
        layers.draw_logo(a, {"part": "wordmark"})
        layers.draw_logo(b, {"part": "wordmark", "dy": 108})
        rows = lambda img: np.nonzero(img[..., 0].max(axis=1) > 0.5)[0]
        self.assertEqual(rows(b).min() - rows(a).min(), 108)


class TestLight(unittest.TestCase):
    def test_upward_streaks_rise_above_the_mask_and_fade(self):
        a = np.zeros((200, 50), np.float32)
        a[150:160, 20:30] = 1.0
        s = fx.upward_streaks(a, 40)
        self.assertGreater(s[120, 25], 0.3)                      # light above the mask
        self.assertGreater(s[140, 25], s[100, 25])               # fading as it rises
        self.assertEqual(s[180, 25], 0.0)                        # nothing below the mask

    def test_a_beam_is_brightest_on_its_line(self):
        img = raster.canvas()
        fx.light_beam(img, 0, 540, 1440, 540, 6, 30, (80, 170, 255))
        self.assertGreater(img[540, 720].mean(), img[600, 720].mean())
        self.assertGreater(img[600, 720].mean(), img[900, 720].mean())

    def test_several_polygons_draw_as_one_shape(self):
        # a hazard band's stripes, or a tunnel's light bars, in one layer
        img = raster.canvas()
        fx.polygon_light(img, [[[0, 0], [100, 0], [100, 100], [0, 100]],
                               [[300, 0], [400, 0], [400, 100], [300, 100]]], (255, 200, 0), blend="over")
        self.assertGreater(img[50, 50].mean(), 0.5)
        self.assertGreater(img[50, 350].mean(), 0.5)
        self.assertEqual(img[50, 200].sum(), 0.0)                # the gap between them stays dark

    def test_a_polygon_of_light_fills_only_its_shape(self):
        img = raster.canvas()
        fx.polygon_light(img, [[0, 0], [720, 0], [0, 540]], (200, 240, 255), blend="over")
        self.assertGreater(img[100, 100].mean(), 0.8)
        self.assertEqual(img[1000, 1400].sum(), 0.0)


if __name__ == "__main__":
    unittest.main()
