"""balloon.py: every balloon holds its words, stays inside its stated reach, and never lets its outline touch a letter."""
import math
import unittest

import cv2
import numpy as np
from PIL import Image

import support
from mangapress import balloon, letter_en, letter_ja

SHAPES = ("oval", "burst", "angular", "wobbly")
ASPECTS = (0.3, 0.45, 0.7, 1.0, 1.6, 2.4, 3.2, 5.0)


def lozenge(aspect, h=100.0):
    """Three lines of words, widest in the middle, as the letterer sets them."""
    w = h * aspect
    return w, h, [(-w * 0.35, -h / 2, w * 0.35, -h / 6), (-w / 2, -h / 6, w / 2, h / 6),
                  (-w * 0.35, h / 6, w * 0.35, h / 2)]


def corners(boxes):
    return [(x, y) for (x0, y0, x1, y1) in boxes for x in (x0, x1) for y in (y0, y1)]


def clearance(poly, points):
    """How far the nearest point sits inside the polygon (negative: outside)."""
    c = np.array(poly, dtype=np.float32).reshape(-1, 1, 2)
    return min(cv2.pointPolygonTest(c, (float(x), float(y)), True) for x, y in points)


class TestFit(unittest.TestCase):
    def test_the_fitted_ellipse_holds_every_corner(self):
        for aspect in ASPECTS:
            _, _, boxes = lozenge(aspect)
            a, b = balloon.fit(boxes)
            for x, y in corners(boxes):
                self.assertLessEqual((x / a) ** 2 + (y / b) ** 2, 1.0 + 1e-9)

    def test_it_hugs_a_lozenge_closer_than_an_ellipse_through_the_bounding_box(self):
        w, h, boxes = lozenge(1.4)
        a, b = balloon.fit(boxes)
        self.assertLess(a * b, (w / 2 * math.sqrt(2)) * (h / 2 * math.sqrt(2)))


class TestBody(unittest.TestCase):
    def test_every_shape_holds_its_words_however_long_the_balloon(self):
        # A long balloon once clipped "PIER SEVEN": corners spaced by direction bunched at its tips.
        for shape in SHAPES:
            for aspect in ASPECTS:
                w, h, boxes = lozenge(aspect)
                pad = 0.02 * min(w, h)
                a, b = balloon.axes(w, h, pad, shape, boxes)
                for seed in range(30):
                    body = balloon.body_points(shape, a, b, seed)
                    self.assertGreater(clearance(body, corners(boxes)), 0.0, (shape, aspect, seed))

    def test_the_stated_reach_bounds_every_shape(self):
        # page.py keeps a balloon inside the inner frame by its extent, before drawing it.
        for shape in SHAPES + ("caption",):
            for aspect in ASPECTS:
                w, h, boxes = lozenge(aspect)
                ex, ey = balloon.extent(shape, w, h, 5.0, boxes)
                a, b = balloon.axes(w, h, 5.0, shape, boxes)
                for seed in range(30):
                    body = balloon.body_points(shape, a, b, seed)
                    self.assertLessEqual(max(abs(x) for x, _ in body), ex + 1e-6, (shape, aspect, seed))
                    self.assertLessEqual(max(abs(y) for _, y in body), ey + 1e-6, (shape, aspect, seed))

    def test_the_same_seed_draws_the_same_balloon(self):
        self.assertEqual(balloon.body_points("burst", 80, 50, 7), balloon.body_points("burst", 80, 50, 7))
        self.assertNotEqual(balloon.body_points("burst", 80, 50, 7), balloon.body_points("burst", 80, 50, 8))


class TestTail(unittest.TestCase):
    def test_the_tail_stops_short_of_the_mouth(self):
        for shape in SHAPES:
            a, b, target = 60.0, 40.0, (200.0, 150.0)
            tail = balloon.tail_points(shape, a, b, target, stop=0.6)
            far = max(tail, key=lambda p: math.hypot(*p))
            rim = balloon._rim(a, b, math.atan2(target[1], target[0]))
            self.assertAlmostEqual(math.hypot(far[0] - rim[0], far[1] - rim[1]),
                                   0.6 * math.hypot(target[0] - rim[0], target[1] - rim[1]), delta=1.0)

    def test_a_mouth_inside_the_balloon_gets_no_tail(self):
        self.assertEqual(balloon.tail_points("oval", 60, 40, (58.0, 0.0)), [])


class TestDrawn(unittest.TestCase):
    """Drawn for real, on a grey page: nothing within two pixels of a letter may be anything but balloon white."""

    @classmethod
    def setUpClass(cls):
        support.use_test_fonts()

    @classmethod
    def tearDownClass(cls):
        support.use_real_fonts()

    def assertLettersClear(self, shape, mask, info, pad, target=(40, 40)):
        canvas = Image.new("L", (1400, 1000), 128)
        cx, cy = 700, 500
        balloon.draw(canvas, shape, (cx, cy), mask, target=target, line_px=4, pad_px=pad, seed=3,
                     boxes=info["boxes"])
        page = np.array(canvas)
        ink = np.zeros(page.shape, bool)
        ox, oy = int(cx - mask.width / 2), int(cy - mask.height / 2)
        ink[oy:oy + mask.height, ox:ox + mask.width] = np.array(mask) > 0
        near = cv2.dilate(ink.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        self.assertTrue(np.all(page[near & ~ink] == 255), f"{shape}: a letter touches the outline or the page")

    def test_the_loudspeaker_line_that_was_clipped(self):
        mask, info = letter_en.set_horizontal("Work crew three to pier seven.", 60, font="en-display")
        for shape in SHAPES:
            self.assertLettersClear(shape, mask, info, pad=0.45 * 60)

    def test_vertical_japanese_with_furigana(self):
        mask, info = letter_ja.set_vertical("{第三|だいさん}{作業班|さぎょうはん}、/{七番|ななばん}{埠頭|ふとう}へ。", 56)
        for shape in SHAPES:
            self.assertLettersClear(shape, mask, info, pad=0.45 * 56)

    def test_a_caption_box_holds_its_words(self):
        mask, info = letter_en.set_horizontal("The port city of Kurose.", 50, font="en-display", aspect=3.0)
        self.assertLettersClear("caption", mask, info, pad=0.4 * 50)


if __name__ == "__main__":
    unittest.main()
