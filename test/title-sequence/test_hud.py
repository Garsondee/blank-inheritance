"""The Directorate's screens (titleseq/hud.py): the six players' cards, the control panel and the status wall."""
import os
import sys
import tempfile
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import hud, timeline  # noqa: E402
from titleseq.raster import canvas  # noqa: E402

FONTS = all(os.path.exists(os.path.join(ROOT, "third-party", "fonts", f))
            for f in ("texgyreheroscn-bold.otf", "NotoSerifCJKjp-Black.otf", "NotoSerifCJKjp-Bold.otf"))
needs_fonts = unittest.skipUnless(FONTS, "needs the gitignored fonts in third-party/fonts")
SKY = (10, 14, 30)


def a_portrait(path):
    """A stand-in picture of no particular shape: a gradient with a bright block, so any placement shows."""
    import cv2
    yy, xx = np.mgrid[0:500, 0:640].astype(np.float32)
    img = np.stack([xx / 640, yy / 500, 0.4 + 0 * xx], -1)
    img[200:300, 300:400] = (1, 1, 0.2)
    cv2.imwrite(path, (img[..., ::-1] * 255).astype(np.uint8))


def orange_share(img, x0, x1):
    """How much of a column band of the frame is the plates' orange ink."""
    band = img[:, x0:x1]
    return float(((band[..., 0] > 0.8) & (band[..., 1] > 0.45) & (band[..., 1] < 0.75) & (band[..., 2] < 0.3)).mean())


@needs_fonts
class TestCastCard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.TemporaryDirectory()
        cls.art = os.path.join(cls.dir.name, "face.png")
        a_portrait(cls.art)

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def card(self, u, side="l", **kw):
        p = {"type": "cast_card", "src": self.art, "side": side, "accent": [255, 80, 60], "number": 1, "of": 6,
             "player": {"kana": "ジェイミー", "roman": "Jamie"}, "name": None, "dur": 2.4, "out": 0.22, "seed": 3,
             "target": [0.5, 0.4], "_t": 10.0 + u, "_t0": 10.0}
        p.update(kw)
        img = canvas(SKY)
        before = img.copy()
        hud.cast_card(img, p)
        return before, img

    def test_nothing_is_drawn_before_the_card_begins(self):
        before, img = self.card(0.0)
        self.assertTrue(np.array_equal(before, img))

    def test_the_card_has_gone_by_the_end_of_its_clip(self):
        before, img = self.card(2.399)
        self.assertLess(float(np.abs(img - before).max()), 0.05)

    def test_a_settled_card_shows_its_portrait_and_its_plates(self):
        before, img = self.card(1.2)
        self.assertGreater(float(np.abs(img - before).mean()), 0.05)
        self.assertGreater(orange_share(img, 985, 1385), 0.01)              # the plates' ink, on the right
        self.assertLess(orange_share(img, 55, 455), 0.002)                  # and not on the window's side

    def test_the_other_side_is_the_mirror(self):
        _, right = self.card(1.2, side="r")
        self.assertGreater(orange_share(right, 55, 455), 0.01)
        self.assertLess(orange_share(right, 985, 1385), 0.002)

    def test_the_plates_type_on_and_the_window_assembles(self):
        _, early = self.card(0.12)
        _, late = self.card(1.2)
        self.assertLess(float(np.abs(early - canvas(SKY)).mean()), float(np.abs(late - canvas(SKY)).mean()))

    def test_it_is_deterministic(self):
        _, a = self.card(0.9)
        _, b = self.card(0.9)
        self.assertTrue(np.array_equal(a, b))

    def test_an_unmade_character_reads_unregistered_and_a_made_one_shows_its_name(self):
        _, blank = self.card(1.2)
        _, named = self.card(1.2, name="WITCH")
        self.assertFalse(np.array_equal(blank, named))

    def test_a_portrait_pushed_to_its_edge_never_smears(self):
        # a tall picture asked to focus on its very top: the window still holds picture all the way down, not the
        # replicated border row that a pan past the art's edge would smear across it
        import cv2
        tall = os.path.join(self.dir.name, "tall.png")
        ramp = np.linspace(0, 255, 900, dtype=np.uint8)[:, None, None]
        cv2.imwrite(tall, np.tile(ramp, (1, 300, 3)))
        _, img = self.card(1.2, src=tall, focus=[0.5, 0.0])
        col = img[300:900, 420, 1]
        self.assertGreater(len(np.unique(np.round(col, 2))), 20)           # the ramp runs down the window


@needs_fonts
class TestTabPanel(unittest.TestCase):
    EVENTS = [{"t": 1.0, "rows": [10, 11, 12, 13], "to": 1}, {"t": 2.0, "rows": list(range(14)), "to": 0}]

    def panel(self, t, **kw):
        img = canvas()
        p = {"type": "tab_panel", "rows": 14, "events": self.EVENTS, "seed": 4, "_t": t, "_t0": 0.0}
        p.update(kw)
        hud.tab_panel(img, p)
        return img

    @staticmethod
    def green(img):
        return int(((img[..., 1] > 0.75) & (img[..., 0] < 0.6) & (img[..., 2] > 0.5)).sum())

    @staticmethod
    def red(img):
        return int(((img[..., 0] > 0.45) & (img[..., 1] < 0.2) & (img[..., 2] < 0.25)).sum())

    def test_every_pair_starts_locked_and_red(self):
        img = self.panel(0.5)
        self.assertGreater(self.red(img), 20000)
        self.assertEqual(self.green(img), 0)

    def test_an_event_releases_its_rows_to_green(self):
        before, after = self.panel(0.9), self.panel(1.6)
        self.assertEqual(self.green(before), 0)
        self.assertGreater(self.green(after), 2000)
        self.assertLess(self.red(after), self.red(before))

    def test_a_later_event_can_lock_them_again(self):
        after = self.panel(1.6)
        relocked = self.panel(2.6)
        self.assertEqual(self.green(relocked), 0)
        self.assertGreater(self.red(relocked), self.red(after))

    def test_a_release_passes_through_white(self):
        mid = self.panel(1.07)
        self.assertGreater(float((mid.min(axis=2) > 0.7).sum()), 500)

    def test_the_quad_is_the_camera(self):
        a = self.panel(0.5)
        b = self.panel(0.5, quad=[[-100, 100], [1700, -100], [1600, 1200], [-100, 1000]])
        self.assertFalse(np.array_equal(a, b))


@needs_fonts
class TestStatusWall(unittest.TestCase):
    def wall(self, x, blur=0):
        img = canvas()
        hud.status_wall(img, {"type": "status_wall", "x": x, "blur": blur, "label": "FRAME 01", "focus_x": 3600,
                              "seed": 3})
        return img

    def test_the_pan_moves_the_wall(self):
        self.assertFalse(np.array_equal(self.wall(0), self.wall(900)))

    def test_it_rests_on_its_label(self):
        self.assertGreater(orange_share(self.wall(2800), 500, 940), 0.01)   # the focus plate's big type, mid-frame

    def test_speed_smears_it_and_rest_is_sharp(self):
        def detail(img):
            return float(np.abs(np.diff(img[..., 0], axis=1)).mean())
        self.assertLess(detail(self.wall(1500, 61)), detail(self.wall(1500, 0)) * 0.6)


class TestTheNewLayersAreKnown(unittest.TestCase):
    def test_the_timeline_knows_them(self):
        for name in ("cast_card", "tab_panel", "status_wall"):
            self.assertIn(name, timeline.LAYER_TYPES)


if __name__ == "__main__":
    unittest.main()
