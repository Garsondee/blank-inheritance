"""layers.py: images with camera moves, typeset text and dust."""
import json
import os
import shutil
import sys
import tempfile
import unittest

import numpy as np

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "title-sequence"))

from titleseq import layers, raster  # noqa: E402


def write_png(arr_u8):
    import cv2
    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    cv2.imwrite(path, arr_u8[..., ::-1])
    return path


class TestImageTransform(unittest.TestCase):
    def test_the_focus_point_lands_on_its_frame_position(self):
        # pixel-centre coordinates: the continuous point (u, v) is the pixel-centre (u - 0.5, v - 0.5)
        s, m = layers.image_transform(2000, 1000, zoom=1.7, cx=0.3, cy=0.6, rot=23, px=700, py=550)
        x, y = m @ np.array([0.3 * 2000 - 0.5, 0.6 * 1000 - 0.5, 1.0])
        self.assertAlmostEqual(x, 700 - 0.5)
        self.assertAlmostEqual(y, 550 - 0.5)

    def test_cover_fills_the_picture_and_contain_fits_inside_it(self):
        s_cover, _ = layers.image_transform(2000, 1000, fit="cover")
        s_contain, _ = layers.image_transform(2000, 1000, fit="contain")
        self.assertAlmostEqual(2000 * s_cover, 2160)       # height 1080 fills, width overflows
        self.assertAlmostEqual(2000 * s_contain, 1440)     # width 1440 fits, height doesn't fill

    def test_rotation_turns_clockwise_on_screen(self):
        _, m = layers.image_transform(1000, 1000, rot=90, px=0, py=0, cx=0.5, cy=0.5)
        dx, dy = m[:, :2] @ np.array([1.0, 0.0])            # the image's "right"
        self.assertAlmostEqual(dx, 0, places=6)
        self.assertGreater(dy, 0)                           # points down the frame after a clockwise quarter turn


class TestDrawImage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        arr = np.zeros((300, 400, 3), np.uint8)
        arr[..., 0] = np.linspace(0, 255, 400, dtype=np.uint8)[None, :]    # red ramps left to right
        arr[150, 200] = (0, 255, 0)                                          # one green pixel at the centre
        cls.path = write_png(arr)
        cls.black = write_png(np.zeros((300, 400, 3), np.uint8))

    @classmethod
    def tearDownClass(cls):
        os.remove(cls.path)
        os.remove(cls.black)

    def test_cover_at_zoom_one_paints_every_pixel(self):
        img = raster.canvas((0, 0, 255))
        layers.draw_image(img, {"src": self.path})
        self.assertLess(img[..., 2].max(), 0.02)            # no blue base left anywhere

    def test_screen_blend_of_black_leaves_the_picture_alone(self):
        img = raster.canvas((40, 90, 160))
        before = img.copy()
        layers.draw_image(img, {"src": self.black, "blend": "screen"})
        np.testing.assert_allclose(img, before, atol=1e-6)

    def test_an_image_smaller_than_the_frame_leaves_the_rest_alone(self):
        img = raster.canvas((0, 0, 255))
        layers.draw_image(img, {"src": self.path, "zoom": 0.5})          # covers only the middle
        self.assertGreater(img[5, 5, 2], 0.99)                            # corner still the base
        self.assertLess(img[540, 720, 2], 0.01)                           # centre is the image

    def test_opacity_zero_draws_nothing(self):
        img = raster.canvas((40, 90, 160))
        before = img.copy()
        layers.draw_image(img, {"src": self.path, "opacity": 0.0})
        np.testing.assert_array_equal(img, before)

    def test_flip_mirrors_and_lift_raises_the_blacks(self):
        a, b = raster.canvas(), raster.canvas()
        layers.draw_image(a, {"src": self.path, "zoom": 2.0, "cx": 0.3})
        layers.draw_image(b, {"src": self.path, "zoom": 2.0, "cx": 0.3, "flip_x": True})
        # the focus point stays on centre either way; mirroring turns the ramp around it
        self.assertAlmostEqual(float(a[540, 720, 0]), float(b[540, 720, 0]), places=3)
        self.assertGreater(a[540, 900, 0], a[540, 540, 0])      # unmirrored: redder to the right
        self.assertLess(b[540, 900, 0], b[540, 540, 0])         # mirrored: redder to the left
        c = raster.canvas()
        layers.draw_image(c, {"src": self.black, "lift": 0.3})
        self.assertAlmostEqual(float(c[540, 720, 0]), 0.3, places=3)

    def test_panning_moves_the_picture(self):
        a, b = raster.canvas(), raster.canvas()
        layers.draw_image(a, {"src": self.path, "zoom": 2.0, "cx": 0.3})
        layers.draw_image(b, {"src": self.path, "zoom": 2.0, "cx": 0.7})
        self.assertLess(a[540, 720, 0], b[540, 720, 0])     # further right on the ramp = redder

    def test_a_crop_frames_only_its_part_of_the_image(self):
        img = raster.canvas()
        layers.draw_image(img, {"src": self.path, "crop": [0.5, 0.0, 1.0, 1.0]})     # the red half of the ramp
        self.assertGreater(img[300, 5, 0], 0.45)           # row 300: clear of the green marker pixel
        self.assertGreater(img[300, 1435, 0], 0.95)

    def test_gamma_deepens_the_middle_and_spares_white(self):
        img = raster.canvas()
        layers.draw_image(img, {"src": self.path, "gamma": 2.0})
        self.assertLess(img[540, 720, 0], 0.3)             # mid-ramp (about 0.5) falls to about 0.25
        self.assertGreater(img[540, 1439, 0], 0.97)        # the full-red end stays put


class TestCutOutImages(unittest.TestCase):
    """An image layer with a matte: Ingram's art cut out of its plain Midjourney backdrop."""

    @classmethod
    def setUpClass(cls):
        arr = np.full((300, 400, 3), (140, 146, 148), np.uint8)       # the grey backdrop
        arr[100:200, 150:250] = (230, 60, 30)                          # the art: a red block in the middle
        cls.path = write_png(arr)

    @classmethod
    def tearDownClass(cls):
        os.remove(cls.path)

    def test_the_backdrop_lets_the_frame_through_and_the_art_lands(self):
        img = raster.canvas((0, 0, 255))
        layers.draw_image(img, {"src": self.path, "matte": {"mode": "flat"}})
        self.assertGreater(img[40, 40, 2], 0.99)            # blue where the grey was
        np.testing.assert_allclose(img[540, 720], np.array([230, 60, 30]) / 255, atol=0.02)   # the art, unmixed

    def test_fill_paints_a_silhouette(self):
        img = raster.canvas((255, 255, 255))
        layers.draw_image(img, {"src": self.path, "matte": {"mode": "flat"}, "fill": [0, 0, 0]})
        self.assertLess(img[540, 720].max(), 0.01)
        self.assertGreater(img[40, 40].min(), 0.99)

    def test_a_mirrored_cut_out_mirrors_its_matte_too(self):
        a, b = raster.canvas((0, 0, 255)), raster.canvas((0, 0, 255))
        layers.draw_image(a, {"src": self.path, "matte": {"mode": "flat"}, "cx": 0.4})
        layers.draw_image(b, {"src": self.path, "matte": {"mode": "flat"}, "cx": 0.4, "flip_x": True})
        red = lambda img: np.nonzero(img[540, :, 0] > 0.5)[0]
        # the block sits right of the focus point unmirrored, left of it mirrored, the same width either way
        self.assertGreater(red(a).mean(), 720)
        self.assertLess(red(b).mean(), 720)
        self.assertAlmostEqual(len(red(a)), len(red(b)), delta=2)


class TestMemory(unittest.TestCase):
    def test_the_art_cache_forgets_the_least_recently_used_once_over_budget(self):
        # a full draft touches some twenty 58 MB stills; kept forever they ran a 16 GB machine out of memory
        c = layers._ByteCache(1000)
        c["a"] = np.zeros(400, np.uint8)
        c["b"] = (np.zeros(300, np.uint8), np.zeros(100, np.uint8))     # a cut-out: colour and alpha together
        _ = c["a"]                                                      # touching a leaves b the oldest
        c["c"] = np.zeros(400, np.uint8)
        self.assertIn("a", c)
        self.assertIn("c", c)
        self.assertNotIn("b", c)
        self.assertLessEqual(c.used, 1000)


class TestVideo(unittest.TestCase):
    def test_once_holds_the_last_frame(self):
        self.assertEqual(layers.video_frame_index(10, 3), 3)
        self.assertEqual(layers.video_frame_index(10, 50), 9)

    def test_loop_starts_again_and_pingpong_plays_back(self):
        self.assertEqual(layers.video_frame_index(10, 12, mode="loop"), 2)
        self.assertEqual([layers.video_frame_index(4, k, mode="pingpong") for k in range(8)], [0, 1, 2, 3, 2, 1, 0, 1])

    def test_on_threes_at_a_third_of_the_speed_shows_each_frame_three_times(self):
        shown = [layers.video_frame_index(100, k, speed=1 / 3, hold=3) for k in range(9)]
        self.assertEqual(shown, [0, 0, 0, 1, 1, 1, 2, 2, 2])

    def test_a_folder_of_keyed_pngs_plays_with_its_own_alpha(self):
        # Ingram re-keys clips herself off a green screen and hands over numbered PNGs with real alpha
        import cv2
        d = tempfile.mkdtemp()
        try:
            for i, bgr in enumerate(((0, 0, 255), (0, 255, 0))):              # a red block, then a green one
                f = np.zeros((120, 160, 4), np.uint8)
                f[30:90, 40:120, :3] = bgr
                f[30:90, 40:120, 3] = 255                                   # opaque block, clear all round it
                cv2.imwrite(os.path.join(d, f"boy_{i:05d}.png"), f)
            layers._videos.pop(d, None)
            img = raster.canvas((0, 0, 255))
            layers.draw_video(img, {"src": d, "_t0": 0.0}, 0.0)
            self.assertGreater(img[540, 720, 0], 0.95)                       # the block
            self.assertGreater(img[20, 20, 2], 0.95)                         # the base, through the clear part
            img = raster.canvas((0, 0, 255))
            layers.draw_video(img, {"src": d, "_t0": 0.0}, 1 / 24)
            self.assertGreater(img[540, 720, 1], 0.95)                       # the next frame
        finally:
            layers._videos.pop(d, None)
            layers._frames.clear()
            shutil.rmtree(d)

    def test_a_clip_draws_the_frame_that_is_due(self):
        import cv2
        fd, path = tempfile.mkstemp(suffix=".avi")
        os.close(fd)
        try:
            out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"MJPG"), 24, (160, 120))
            for bgr in ((0, 0, 255), (0, 255, 0), (255, 0, 0)):          # red, green, blue frames
                out.write(np.full((120, 160, 3), bgr, np.uint8))
            out.release()
            layers._videos.pop(path, None)
            p = {"src": path, "_t0": 0.0}
            img = raster.canvas()
            layers.draw_video(img, dict(p), 1 / 24)                       # one frame in: the green one
            self.assertGreater(img[540, 720, 1], 0.9)
            self.assertLess(img[540, 720, 0], 0.1)
            img = raster.canvas()
            layers.draw_video(img, dict(p, speed=0.5, hold=2), 3 / 24)     # on twos at half speed: still green
            self.assertGreater(img[540, 720, 1], 0.9)
        finally:
            layers._videos.pop(path, None)
            layers._frames.clear()
            os.remove(path)


class TestText(unittest.TestCase):
    ITEMS = [{"text": "イングラム", "font": "mincho-black", "size": 120, "x": 720, "y": 540}]

    @unittest.skipUnless(os.path.exists(os.path.join(layers.FONT_DIR, layers.FONTS["mincho-black"])),
                         "needs the gitignored fonts in third-party/fonts")
    def test_text_sits_on_its_anchor_and_nowhere_else(self):
        _, a, _ = layers.render_text(self.ITEMS)
        self.assertGreater(a[480:600, 520:920].max(), 0.9)
        self.assertEqual(a[:300].max(), 0.0)
        self.assertEqual(a[800:].max(), 0.0)

    @unittest.skipUnless(os.path.exists(os.path.join(layers.FONT_DIR, layers.FONTS["mincho-black"])),
                         "needs the gitignored fonts in third-party/fonts")
    def test_vertical_type_runs_top_to_bottom(self):
        # Japanese credits often stand upright (the director card's 監督)
        _, a, _ = layers.render_text([{"text": "監督", "font": "mincho-bold", "size": 96, "x": 720, "y": 540,
                                        "vertical": True}])
        ys, xs = np.nonzero(a > 0.5)
        self.assertGreater(np.ptp(ys), 1.6 * np.ptp(xs))
        self.assertLess(abs((ys.min() + ys.max()) / 2 - 540), 6)                # centred on its anchor

    @unittest.skipUnless(os.path.exists(os.path.join(layers.FONT_DIR, layers.FONTS["mincho-black"])),
                         "needs the gitignored fonts in third-party/fonts")
    def test_stretch_narrows_and_results_are_cached(self):
        wide = layers.render_text(self.ITEMS)[1]
        narrow = layers.render_text([dict(self.ITEMS[0], stretch=0.7)])[1]
        width = lambda a: np.ptp(np.nonzero(a.max(axis=0) > 0.5)[0])
        self.assertLess(width(narrow), width(wide) * 0.8)
        self.assertIs(layers.render_text(self.ITEMS), layers.render_text(self.ITEMS))


@unittest.skipUnless(os.path.exists(os.path.join(layers.FONT_DIR, layers.FONTS["grotesk-cn"])),
                     "needs the gitignored fonts in third-party/fonts")
class TestVcrCaptions(unittest.TestCase):
    """The VCR's on-screen display (Ingram: "do the VHS text on the screen too... as if it were changing channel")."""

    def test_a_caption_is_set_in_square_blocks(self):
        m = layers.osd_mask("CH 03", block=5)
        self.assertEqual(set(np.unique(m)), {0.0, 1.0})                      # hard-edged, no smoothing
        self.assertEqual((m.shape[0] % 5, m.shape[1] % 5), (0, 0))
        np.testing.assert_array_equal(np.kron(m[::5, ::5], np.ones((5, 5), np.float32)), m)   # every block solid

    def test_the_play_icon_follows_the_word(self):
        word, played = layers.osd_mask("PLAY", block=4), layers.osd_mask("PLAY", icon="play", block=4)
        self.assertGreater(played.shape[1], word.shape[1])
        self.assertGreater(played[:, word.shape[1]:].sum(), 0)

    def test_the_tracking_meter_lights_its_share_of_sixteen_segments(self):
        bars = [layers.osd_mask("TRACKING", bar=b, block=1) for b in (0.0, 0.25, 0.75, 1.0)]
        rows = [m[-4:] for m in bars]                                         # the meter is the bottom four lines
        solid = [int((r.min(axis=0) > 0).reshape(-1)[:64].reshape(16, 4)[:, :3].all(axis=1).sum()) for r in rows]
        self.assertEqual(solid, [0, 4, 12, 16])

    def test_a_caption_sits_on_its_anchor_over_a_hard_shadow(self):
        img = raster.canvas((128, 128, 128))
        layers.draw_osd(img, {"text": "PLAY", "x": 100, "y": 90, "anchor": "lt", "block": 5,
                              "color": (72, 255, 72)})
        green = (img[..., 1] > 0.9) & (img[..., 0] < 0.4)
        ys, xs = np.nonzero(green)
        self.assertEqual((xs.min(), ys.min()), (100, 90))
        dark = img[..., 1] < 0.1                                              # the shadow, a block down and right
        self.assertTrue(dark.any())
        self.assertGreaterEqual(np.nonzero(dark)[1].min(), 100)
        self.assertGreater(np.nonzero(dark)[0].max(), ys.max())


@unittest.skipUnless(os.path.exists(os.path.join(layers.FONT_DIR, layers.FONTS["grotesk-cn"])),
                     "needs the gitignored fonts in third-party/fonts")
class TestFilmType(unittest.TestCase):
    """Type set like the source's title cards: fitted to a box, heavy, soft-edged (the typography round)."""
    LINE = {"text": "KUROSE", "font": "grotesk-cn", "size": 200, "x": 720, "y": 540}

    @staticmethod
    def ink(a):
        ys, xs = np.nonzero(a > 0.5)
        return xs.min(), xs.max(), ys.min(), ys.max()

    def test_a_boxed_line_fills_its_box_exactly(self):
        _, a, _ = layers.render_text([dict(self.LINE, box=[1190, 404])], shadow=0.0)
        x0, x1, y0, y1 = self.ink(a)
        self.assertAlmostEqual(x1 - x0 + 1, 1190, delta=3)
        self.assertAlmostEqual(y1 - y0 + 1, 404, delta=3)
        self.assertAlmostEqual((x0 + x1) / 2, 720, delta=2)

    def test_weight_thickens_the_strokes_but_keeps_the_box(self):
        thin = layers.render_text([dict(self.LINE, box=[1190, 404])], shadow=0.0)[1]
        heavy = layers.render_text([dict(self.LINE, box=[1190, 404], weight=8)], shadow=0.0)[1]
        self.assertGreater((heavy > 0.5).sum(), (thin > 0.5).sum() * 1.1)
        x0, x1, y0, y1 = self.ink(heavy)
        self.assertAlmostEqual(x1 - x0 + 1, 1190, delta=4)

    def test_soften_blurs_the_edge_and_spray_leaves_a_halo(self):
        crisp = layers.render_text([self.LINE], shadow=0.0)[1]
        soft = layers.render_text([self.LINE], shadow=0.0, soften=2.0)[1]
        mids = lambda a: ((a > 0.1) & (a < 0.9)).sum()
        self.assertGreater(mids(soft), mids(crisp) * 2)
        sprayed = layers.render_text([self.LINE], shadow=0.0, spray=0.5, seed=3)[1]
        self.assertGreater((sprayed > 0.05).sum(), (crisp > 0.05).sum())

    def test_glow_lights_the_dark_round_the_letters(self):
        plain, glowing = raster.canvas(), raster.canvas()
        layers.draw_text(plain, {"items": [self.LINE], "shadow": 0.0})
        layers.draw_text(glowing, {"items": [self.LINE], "shadow": 0.0, "glow": 0.3})
        dark = layers.render_text([self.LINE], shadow=0.0)[1] < 0.01
        self.assertGreater(glowing[dark].mean(), plain[dark].mean() + 0.001)

    def test_weave_jitters_by_at_most_its_pixels_and_repeats_for_a_frame(self):
        f = lambda n: n / 24 - 0.5
        frames = []
        for n in (100, 100, 101, 102, 103):
            img = raster.canvas()
            layers.draw_text(img, {"items": [self.LINE], "shadow": 0.0, "weave": 1, "seed": 4, "_t": f(n)})
            frames.append(img)
        np.testing.assert_array_equal(frames[0], frames[1])                   # the same frame, the same place
        still = layers.render_text([self.LINE], shadow=0.0)[1]
        x0, _, y0, _ = self.ink(still)
        for img in frames[2:]:
            a0, _, b0, _ = self.ink(img[..., 0])
            self.assertLessEqual(abs(a0 - x0), 1)
            self.assertLessEqual(abs(b0 - y0), 1)


@unittest.skipUnless(os.path.exists(os.path.join(layers.FONT_DIR, layers.FONTS["grotesk-cn"])),
                     "needs the gitignored fonts in third-party/fonts")
class TestSlate(unittest.TestCase):
    """A slate: the text-only card holding a shot's place until its art comes (Ingram: "use some blank text only
    cards... Then we can go back and fill in the blanks")."""

    def test_a_slate_is_a_painted_card_with_its_words_in_the_middle(self):
        img = raster.canvas((255, 0, 0))
        layers.draw_slate(img, {"code": "R56", "text": "Portrait: the Deputy Director", "color": [34, 72, 78]})
        np.testing.assert_allclose(img[300, 300], np.array([34, 72, 78]) / 255, atol=0.06)   # the card covers all
        self.assertGreater(img[120, 720].mean(), img[1000, 720].mean())       # shaded like a cel: lighter above
        middle = img[500:580, 300:1140]
        self.assertGreater(middle.max(), 0.9)                                  # white words across the middle
        self.assertGreater((img[60:110, 70:160].max(axis=2) > 0.6).sum(), 50)  # the code, top left

    def test_the_words_are_set_as_a_justified_block(self):
        _, a = layers.render_slate("R39", "The grapple hand in a cloud of steam, a red harbour crane behind",
                                   bg=False)
        rows = np.nonzero(a[:, 300:1140].max(axis=1) > 0.9)[0]
        lines = np.split(rows, np.nonzero(np.diff(rows) > 8)[0] + 1)
        widths = [np.ptp(np.nonzero(a[l[0]:l[-1] + 1, :].max(axis=0) > 0.9)[0]) for l in lines if len(l) > 30]
        self.assertGreaterEqual(len(widths), 2)
        self.assertLess(max(widths) - min(widths), 40)                         # every line the same width

    def test_on_a_pale_card_the_words_go_dark(self):
        img = raster.canvas()
        layers.draw_slate(img, {"code": "R85", "text": "The four founders, backlit", "color": [236, 232, 222]})
        self.assertLess(img[380:700, 200:1240].mean(axis=2).min(), 0.2)      # dark ink, not white on cream

    def test_without_its_card_a_slate_leaves_the_picture_showing(self):
        img = raster.canvas((255, 0, 0))
        layers.draw_slate(img, {"code": "R34", "text": "The Frame front-on", "bg": False})
        np.testing.assert_allclose(img[300, 300], [1, 0, 0])
        self.assertGreater(img[520:560, 500:940, 1].max(), 0.9)               # the words drawn over it

    def test_long_words_wrap_inside_the_frame(self):
        rgb, a = layers.render_slate("R35", "The Frame spreads its arms; its boilers vent great golden plumes of "
                                            "steam behind it like wings", bg=False)
        ys = np.nonzero(a[:, 150:1290].max(axis=1) > 0.5)[0]
        cols = np.nonzero(a[200:880].max(axis=0) > 0.5)[0]
        self.assertGreater(np.ptp(ys[(ys > 200) & (ys < 880)]), 100)          # more than one line
        self.assertGreater(cols.min(), 44)                                     # and all of it inside the frame
        self.assertLess(cols.max(), 1440 - 44)


class TestKeyedArt(unittest.TestCase):
    def test_keyed_art_draws_only_where_its_own_alpha_is(self):
        # the Directorate's approved seal is cut out by hand; its own alpha places it with no matte
        import cv2
        rgba = np.zeros((200, 200, 4), np.uint8)
        rgba[50:150, 50:150] = (40, 60, 200, 255)                              # BGRA: an opaque red square
        fd, path = tempfile.mkstemp(suffix=".png")
        os.close(fd)
        cv2.imwrite(path, rgba)
        try:
            img = raster.canvas((0, 0, 255))
            layers.draw_image(img, {"src": path, "keyed": True, "fit": "contain"})
            np.testing.assert_allclose(img[540, 720], np.array([200, 60, 40]) / 255, atol=0.02)
            np.testing.assert_allclose(img[540, 200], [0, 0, 1], atol=1e-6)    # outside the square: untouched
        finally:
            os.remove(path)                                                    # a unique name, so no stale cache


class TestDust(unittest.TestCase):
    P = {"n": 60, "seed": 3, "ox": 720, "oy": 540, "speed_lo": 100, "speed_hi": 400, "_t0": 0.0}

    def test_same_time_same_dust(self):
        a, b = raster.canvas(), raster.canvas()
        layers.draw_dust(a, dict(self.P), 1.0)
        layers.draw_dust(b, dict(self.P), 1.0)
        np.testing.assert_array_equal(a, b)

    def test_dust_moves_over_time_and_stays_light(self):
        a, b = raster.canvas(), raster.canvas()
        layers.draw_dust(a, dict(self.P), 1.0)
        layers.draw_dust(b, dict(self.P), 1.1)
        self.assertGreater(np.abs(a - b).sum(), 0)
        self.assertTrue(np.isfinite(a).all())
        self.assertLessEqual(a.max(), 1.0 + 1e-6)

    def test_travel_is_the_clock_when_given(self):
        # the field's flight is keyed, so it can speed up with a camera move without jumping
        a, b = raster.canvas(), raster.canvas()
        layers.draw_dust(a, dict(self.P, travel=0.8), 1.0)
        layers.draw_dust(b, dict(self.P, travel=0.8), 5.0)
        np.testing.assert_array_equal(a, b)

    def test_the_origin_carries_the_whole_field(self):
        a, b = raster.canvas(), raster.canvas()
        layers.draw_dust(a, dict(self.P), 1.0)
        layers.draw_dust(b, dict(self.P, ox=760, oy=560), 1.0)
        np.testing.assert_allclose(b[560:1000, 760:1400], a[540:980, 720:1360], atol=0.02)

    def test_hand_drawn_lines_boil_on_twos(self):
        # the same drawing for two frames (the same travel), a newly inked one after that
        hand = dict(self.P, style="hand", boil=2, travel=1.0)
        f = lambda n: n / 24 - 0.5
        a, b, c = raster.canvas(), raster.canvas(), raster.canvas()
        layers.draw_dust(a, dict(hand), f(10))
        layers.draw_dust(b, dict(hand), f(11))
        layers.draw_dust(c, dict(hand), f(12))
        np.testing.assert_array_equal(a, b)
        self.assertGreater(np.abs(a - c).sum(), 0)

    def test_a_hand_drawn_line_is_broad_at_its_head_and_a_hairline_at_its_tail(self):
        one = {"n": 1, "seed": 5, "ox": 720, "oy": 540, "speed_lo": 300, "speed_hi": 300, "size_lo": 3.0,
               "size_hi": 3.0, "streak": 4.0, "r_min": 30, "style": "hand", "bend": 0.0, "travel": 0.9, "opacity": 1.0}
        img = raster.canvas()
        layers.draw_dust(img, one, 0.0)
        lit = img[..., 0] > 0.05
        ys, xs = np.nonzero(lit)
        th = np.arctan2(ys.mean() - 540, xs.mean() - 720)                    # the streak's one direction
        along = (xs - 720) * np.cos(th) + (ys - 540) * np.sin(th)
        across = -(xs - 720) * np.sin(th) + (ys - 540) * np.cos(th)
        tail, head = along < np.percentile(along, 25), along > np.percentile(along, 75)
        self.assertGreater(np.ptp(across[head]), np.ptp(across[tail]))


class TestShippedArtReferences(unittest.TestCase):
    def test_every_image_the_timeline_uses_exists_locally(self):
        with open(os.path.join(ROOT, "data", "title-sequences", "opening.json"), encoding="utf-8") as f:
            doc = json.load(f)
        srcs = set()
        for c in doc["clips"]:
            if c["layer"]["type"] in ("image", "video"):
                srcs.add(c["layer"]["src"])
                srcs.update(k["src"] for k in c.get("keys", []) if "src" in k)   # the strobe swaps stills per key
        srcs = sorted(srcs)
        self.assertTrue(srcs)
        art = os.path.join(ROOT, "artwork", "title-sequences", "opening", "art")
        if not os.path.isdir(art):
            self.skipTest("the gitignored art isn't in this checkout")
        missing = [s for s in srcs if not os.path.exists(os.path.join(ROOT, s))]
        self.assertEqual(missing, [])
        for s in srcs:
            self.assertTrue(s.startswith("artwork/"), f"{s}: art lives under the gitignored artwork/")


if __name__ == "__main__":
    unittest.main()
