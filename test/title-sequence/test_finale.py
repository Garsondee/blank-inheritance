"""The finale's own layers (titleseq/finale.py) and the picture features they rest on (layers.py's mask and reveal)."""
import os
import sys
import tempfile
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import finale, layers, timeline  # noqa: E402
from titleseq.raster import H, W, canvas  # noqa: E402

FONTS = all(os.path.exists(os.path.join(ROOT, "third-party", "fonts", f))
            for f in ("texgyreheroscn-bold.otf", "NotoSerifCJKjp-Black.otf", "NotoSerifCJKjp-Bold.otf"))
needs_fonts = unittest.skipUnless(FONTS, "needs the gitignored fonts in third-party/fonts")


def write_png(path, rgb01):
    import cv2
    cv2.imwrite(path, (np.clip(rgb01, 0, 1)[..., ::-1] * 255).astype(np.uint8))


def a_vault(path):
    """A stand-in for the vault picture: a dark room with a round door, lighter than the wall, centred a little low."""
    yy, xx = np.mgrid[0:480, 0:640].astype(np.float32)
    img = np.full((480, 640, 3), (0.05, 0.10, 0.10), np.float32)
    d = np.hypot(xx - 320, yy - 260)
    img[d < 105] = (0.14, 0.24, 0.22)
    img[(d >= 105) & (d < 125)] = (0.20, 0.30, 0.28)
    write_png(path, img)


def centre_mean(img, cx=720, cy=583, r=24):
    return float(img[cy - r:cy + r, cx - r:cx + r].mean())


class TestMaskAndReveal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.TemporaryDirectory()
        cls.red = os.path.join(cls.dir.name, "red.png")
        write_png(cls.red, np.tile(np.asarray((0.9, 0.1, 0.1), np.float32), (480, 640, 1)))

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def test_a_polygon_covers_what_is_inside_it(self):
        m = layers.poly_coverage([[[100, 100], [500, 100], [500, 400], [100, 400]]])
        self.assertAlmostEqual(float(m[250, 300]), 1.0)
        self.assertAlmostEqual(float(m[50, 300]), 0.0)
        self.assertAlmostEqual(float(m.sum()), 401 * 301, delta=900)     # the fill includes its boundary pixels

    def test_blur_softens_its_edge(self):
        hard = layers.poly_coverage([[[100, 100], [500, 100], [500, 400], [100, 400]]])
        soft = layers.poly_coverage([[[100, 100], [500, 100], [500, 400], [100, 400]]], blur=12)
        self.assertGreater(len(np.unique(np.round(soft[250, 60:140], 2))), len(np.unique(np.round(hard[250, 60:140], 2))))

    def test_a_picture_with_a_mask_shows_only_inside_it(self):
        img = canvas()
        layers.draw_image(img, {"src": self.red, "mask": [[[0, 0], [720, 0], [720, 1080], [0, 1080]]]})
        self.assertGreater(float(img[500, 300, 0]), 0.8)                  # the left half has the picture
        self.assertLess(float(img[500, 1100, 0]), 0.05)                   # the right half is untouched

    def test_a_reveal_writes_a_picture_on_from_one_side(self):
        box = [200, 200, 1000, 800]

        def at(p):
            return layers.reveal_ramp({"box": box, "angle": 0.0, "soft": 80.0, "p": p})
        self.assertEqual(float(at(0.0).max()), 0.0)                       # nothing before it starts
        self.assertEqual(float(at(1.0).min()), 1.0)                       # everything when it is done
        half = at(0.5)
        self.assertGreater(float(half[500, 300]), 0.95)                   # the near side is written first...
        self.assertLess(float(half[500, 900]), 0.05)                      # ...the far side still waits
        self.assertGreaterEqual(float(at(0.6).sum()), float(at(0.5).sum()))   # and it only ever grows

    def test_a_slanted_reveal_leans_with_its_angle(self):
        r = layers.reveal_ramp({"box": [0, 0, 1440, 1080], "angle": 20.0, "soft": 40.0, "p": 0.5})
        top, bottom = float(r[100, 700]), float(r[1000, 700])
        self.assertNotAlmostEqual(top, bottom, places=2)

    def test_a_keyed_reveal_progress_takes_over_the_dict(self):
        a, b = canvas(), canvas()
        base = {"src": self.red, "reveal": {"box": [0, 0, 1440, 1080], "angle": 0.0, "soft": 60.0, "p": 1.0}}
        layers.draw_image(a, dict(base, reveal_p=0.0))
        layers.draw_image(b, dict(base))
        self.assertLess(float(a.max()), 0.01)                             # reveal_p 0 hides it
        self.assertGreater(float(b.max()), 0.8)                           # the dict's own p of 1 shows it


class TestDoorOpen(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.TemporaryDirectory()
        cls.src = os.path.join(cls.dir.name, "vault.png")
        a_vault(cls.src)

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def door(self, o, **kw):
        p = {"type": "door_open", "src": self.src, "open": o, "circle": [0.5, 0.54, 0.16], "seam": 0.5, "seed": 7}
        p.update(kw)
        img = canvas()
        finale.door_open(img, p)
        return img

    def test_a_closed_door_is_just_the_picture(self):
        plain = canvas()
        layers.draw_image(plain, {"src": self.src})
        self.assertTrue(np.array_equal(plain, self.door(0.0)))

    def test_the_doorway_fills_with_light_as_it_opens(self):
        means = [centre_mean(self.door(o)) for o in (0.0, 0.3, 0.6, 1.0)]
        self.assertEqual(means, sorted(means))
        self.assertGreater(means[-1], 0.85)                               # wide open it is all light
        self.assertLess(means[0], 0.3)

    def test_the_two_leaves_slide_apart(self):
        # a thin seam of light first, widening: the lit width across the doorway grows with the opening
        def lit_width(o):
            row = self.door(o)[583, :, :].mean(axis=1)
            return int((row > 0.6).sum())
        widths = [lit_width(o) for o in (0.1, 0.3, 0.5)]
        self.assertEqual(widths, sorted(widths))
        self.assertLess(widths[0], widths[-1])

    def test_light_is_kept_to_the_doorway_at_first(self):
        closed, ajar = self.door(0.0), self.door(0.2)
        corner = np.abs(ajar[40:140, 40:140] - closed[40:140, 40:140]).mean()
        inside = np.abs(ajar[540:620, 660:780] - closed[540:620, 660:780]).mean()
        self.assertLess(corner, 0.1)
        self.assertGreater(inside, corner)

    def test_a_push_in_carries_the_effect_with_it(self):
        near = self.door(0.5, zoom=2.0, cx=0.5, cy=0.54)
        far = self.door(0.5, zoom=1.0)
        self.assertGreater(float((near.min(axis=2) > 0.7).mean()), float((far.min(axis=2) > 0.7).mean()))

    def test_it_is_deterministic(self):
        self.assertTrue(np.array_equal(self.door(0.6), self.door(0.6)))


@needs_fonts
class TestScopeHud(unittest.TestCase):
    def hud(self, u, **kw):
        p = {"type": "scope_hud", "_t": 10.0 + u, "_t0": 10.0, "scope": {"cx": 215, "cy": 245, "r": 150},
             "lines": ["UNIDENTIFIED CONTACT", "CONTACTS  03", "BRG 320   RNG 11.2"], "lines_at": 0.47, "line_gap": 0.2,
             "lines_xy": [60, 450], "lock": 0.22, "seed": 3,
             "target_x": 660.0, "target_y": 540.0, "target_w": 520.0, "target_h": 720.0}
        p.update(kw)
        img = canvas((30, 60, 110))
        before = img.copy()
        finale.scope_hud(img, p)
        return before, img

    @staticmethod
    def amber(img):
        return (img[..., 0] > 0.8) & (img[..., 1] > 0.45) & (img[..., 1] < 0.8) & (img[..., 2] < 0.35)

    def test_the_scope_snaps_on(self):
        _, early = self.hud(0.0)
        _, later = self.hud(0.4)
        scope_area = (slice(60, 430), slice(50, 380))
        self.assertGreater(int(self.amber(later)[scope_area].sum()), int(self.amber(early)[scope_area].sum()) + 300)

    def test_the_reticle_closes_on_its_target(self):
        def spread(u):
            _, img = self.hud(u, lines=[], target_x=760.0)
            ys, xs = np.nonzero(self.amber(img)[:, 380:])                   # the reticle's brackets, clear of the scope
            return float(xs.max() - xs.min()) if len(xs) else 0.0
        self.assertGreater(spread(0.08), spread(0.3))                      # wide at first, then in on its target

    def test_the_reticle_follows_a_keyed_target(self):
        def centre_x(tx):
            _, img = self.hud(0.6, lines=[], target_x=tx)
            ys, xs = np.nonzero(self.amber(img)[:, 380:])
            return float(xs.mean()) + 380
        self.assertGreater(centre_x(820.0), centre_x(660.0) + 100)

    def test_the_readout_types_on_a_line_at_a_time(self):
        def ink(u):
            _, img = self.hud(u)
            return int(self.amber(img)[440:700, 40:560].sum())
        a, b, c = ink(0.5), ink(0.8), ink(1.4)
        self.assertLess(a, b)
        self.assertLess(b, c)

    def test_the_sweep_turns(self):
        _, a = self.hud(0.3, lines=[])
        _, b = self.hud(0.6, lines=[])
        scope_area = (slice(60, 430), slice(50, 380))
        self.assertFalse(np.array_equal(a[scope_area], b[scope_area]))


class TestStainedWall(unittest.TestCase):
    def wall(self, **kw):
        img = canvas()
        finale.stained_wall(img, dict({"seed": 111}, **kw))
        return img

    def test_it_is_dark_warm_and_brightest_toward_the_upper_left(self):
        img = self.wall()
        self.assertTrue(0.04 < float(img.mean()) < 0.35)
        self.assertGreater(float(img[..., 0].mean()), float(img[..., 2].mean()))        # red-brown, not grey
        self.assertGreater(float(img[100:400, 100:500].mean()), float(img[700:1000, 1000:1400].mean()))

    def test_brightness_scales_it_to_black(self):
        self.assertEqual(float(self.wall(brightness=0.0).max()), 0.0)

    def test_it_is_fixed_for_a_seed(self):
        self.assertTrue(np.array_equal(self.wall(), self.wall()))
        self.assertFalse(np.array_equal(self.wall(seed=5), self.wall(seed=6)))


class TestMotes(unittest.TestCase):
    def motes(self, t, **kw):
        img = canvas()
        finale.motes(img, dict({"_t": t, "n": 60, "seed": 5}, **kw))
        return img

    def test_they_drift_over_time(self):
        self.assertFalse(np.array_equal(self.motes(1.0), self.motes(2.0)))

    def test_they_fill_the_picture_and_stay_soft(self):
        img = self.motes(1.0)
        self.assertGreater(float((img.max(axis=2) > 0.05).mean()), 0.001)
        self.assertLess(float(img.max()), 1.0001)

    def test_no_strength_no_motes(self):
        self.assertEqual(float(self.motes(1.0, strength=0.0).max()), 0.0)


class TestLensFlare(unittest.TestCase):
    def flare(self, k, **kw):
        img = canvas()
        finale.lens_flare(img, dict({"cx": 1385, "cy": 108, "strength": k, "streak": 760, "thickness": 3.0}, **kw))
        return img

    def test_it_is_nothing_at_zero(self):
        self.assertEqual(float(self.flare(0.0).max()), 0.0)

    def test_it_is_brightest_at_the_light_and_fades_along_its_streak(self):
        img = self.flare(1.0)
        self.assertGreater(float(img[108, 1380].max()), 0.9)
        streak = [float(img[108, x].max()) for x in (1200, 900, 600, 300)]
        self.assertEqual(streak, sorted(streak, reverse=True))               # fading away across the picture
        self.assertGreater(float(img[108, 900].max()), float(img[160, 900].max()))   # thin: brighter on its line

    def test_its_ghosts_lie_toward_the_middle_of_the_picture(self):
        with_ghosts = self.flare(1.0)
        without = self.flare(1.0, ghosts=[])
        diff = np.abs(with_ghosts - without).max(axis=2)
        ys, xs = np.nonzero(diff > 0.02)
        self.assertGreater(len(xs), 100)
        self.assertLess(float(xs.mean()), 1385)                              # toward the centre, away from the corner
        self.assertGreater(float(ys.mean()), 108)

    def test_the_timeline_knows_the_finales_layers(self):
        for name in ("door_open", "scope_hud", "stained_wall", "motes", "lens_flare"):
            self.assertIn(name, timeline.LAYER_TYPES)


if __name__ == "__main__":
    unittest.main()
