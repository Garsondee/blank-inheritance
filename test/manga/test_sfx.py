"""sfx.py: sound effects and the title, drawn edge, then border, then fill, across every glyph at once."""
import unittest

import numpy as np
from PIL import Image

import support
from mangapress import sfx


def setUpModule():
    support.use_test_fonts()


def tearDownModule():
    support.use_real_fonts()


def paste_layers(layers, order, origin=(300, 320), size=(1400, 900)):
    canvas = Image.new("L", size, 255)
    for key, ink in order:
        for mask, (px, py) in layers[key]:
            canvas.paste(ink, (origin[0] + px, origin[1] + py), mask)
    return np.array(canvas)


def lost_fill(page, layers, origin=(300, 320)):
    """How many pixels of the glyphs' own black fill ended up anything but black."""
    lost = 0
    for mask, (px, py) in layers["fill"]:
        m = np.array(mask) > 200
        region = page[origin[1] + py:origin[1] + py + mask.height, origin[0] + px:origin[0] + px + mask.width]
        lost += int(np.count_nonzero(region[m] > 64))
    return lost


class TestLayering(unittest.TestCase):
    def test_no_border_ever_covers_a_neighbouring_glyphs_marks(self):
        # Drawn glyph by glyph, the first spike lost the two dots of ガ under the next glyph's white border.
        layers, _ = sfx.glyph_layers("ガガガ", 160, step=(0.72, 0.0), grow=0.1, wobble=0.0, seed=1)
        page = paste_layers(layers, (("edge", 0), ("border", 255), ("fill", 0)))
        self.assertEqual(lost_fill(page, layers), 0)

    def test_the_check_above_would_catch_glyph_by_glyph_drawing(self):
        layers, _ = sfx.glyph_layers("ガガガ", 160, step=(0.72, 0.0), grow=0.1, wobble=0.0, seed=1)
        canvas = Image.new("L", (1400, 900), 255)
        for i in range(len(layers["fill"])):
            for key, ink in (("edge", 0), ("border", 255), ("fill", 0)):
                mask, (px, py) = layers[key][i]
                canvas.paste(ink, (300 + px, 320 + py), mask)
        self.assertGreater(lost_fill(np.array(canvas), layers), 0)

    def test_draw_uses_the_safe_order(self):
        canvas = Image.new("L", (1200, 700), 255)
        box = sfx.draw(canvas, "ガガガ", (600, 350), 160, step=(0.72, 0.0), grow=0.1, wobble=0.0, seed=1)
        layers, (bx0, by0, _, _) = sfx.glyph_layers("ガガガ", 160, step=(0.72, 0.0), grow=0.1, wobble=0.0, seed=1)
        self.assertEqual(lost_fill(np.array(canvas), layers, origin=(box[0] - bx0, box[1] - by0)), 0)


class TestPlacement(unittest.TestCase):
    def test_an_effect_near_the_edge_is_pulled_inside_the_bounds(self):
        canvas = Image.new("L", (1000, 800), 255)
        bounds = (100, 100, 900, 700)
        x0, y0, x1, y1 = sfx.draw(canvas, "ギギギ", (890, 110), 120, bounds=bounds, seed=2)
        self.assertGreaterEqual(x0, bounds[0])
        self.assertGreaterEqual(y0, bounds[1])
        self.assertLessEqual(x1, bounds[2])
        self.assertLessEqual(y1, bounds[3])
        a = np.array(canvas)
        outside = np.ones(a.shape, bool)
        outside[bounds[1]:bounds[3], bounds[0]:bounds[2]] = False
        self.assertTrue(np.all(a[outside] == 255))

    def test_latin_letters_step_by_their_own_widths(self):
        # A fixed step spaced the first English title as EMI 'S PROMI SE.
        def gaps(proportional):
            layers, _ = sfx.glyph_layers("PROMISE", 120, grow=0.0, wobble=0.0, font="en-display",
                                         proportional=proportional, edge=0.0, border=0.0)
            spans = []
            for mask, (px, _) in layers["fill"]:
                cols = np.nonzero((np.array(mask) > 128).any(axis=0))[0]
                spans.append((px + cols[0], px + cols[-1]))
            return [b[0] - a[1] for a, b in zip(spans, spans[1:])]

        even = gaps(True)
        self.assertLess(max(even) - min(even), 0.12 * 120, even)
        fixed = gaps(False)
        self.assertGreater(max(fixed) - min(fixed), max(even) - min(even))


class TestSubtitle(unittest.TestCase):
    def test_the_english_gloss_is_drawn_inside_its_box(self):
        canvas = Image.new("L", (800, 400), 128)
        x0, y0, x1, y1 = sfx.subtitle(canvas, "CREAAK", (400, 200), 40)
        a = np.array(canvas)
        self.assertTrue((a[y0:y1, x0:x1] == 0).any())
        self.assertTrue((a[y0:y1, x0:x1] == 255).any())

    def test_a_turned_gloss_runs_down_beside_a_vertical_sign(self):
        # The dig banner's EXCAVATION WORKS runs down the tower under 掘削工事中.
        canvas = Image.new("L", (800, 800), 128)
        x0, y0, x1, y1 = sfx.subtitle(canvas, "EXCAVATION WORKS", (400, 400), 40, angle=-90)
        self.assertGreater(y1 - y0, 3 * (x1 - x0))
        a = np.array(canvas)
        outside = np.ones(a.shape, bool)
        outside[y0:y1, x0:x1] = False
        self.assertTrue(np.all(a[outside] == 128))


if __name__ == "__main__":
    unittest.main()
