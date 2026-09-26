"""fx.py: the procedural effects behave the way the source's measured effects do (design/opening-titles.md)."""
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "title-sequence"))

from titleseq import fx, raster  # noqa: E402

CX, CY = 708, 542


def ring_samples(img, cx, cy, r, n=720):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    xs = np.clip(np.round(cx + r * np.cos(th)).astype(int), 0, raster.W - 1)
    ys = np.clip(np.round(cy + r * np.sin(th)).astype(int), 0, raster.H - 1)
    inside = (cx + r * np.cos(th) >= 0) & (cx + r * np.cos(th) < raster.W) & \
             (cy + r * np.sin(th) >= 0) & (cy + r * np.sin(th) < raster.H)
    return img[ys[inside], xs[inside]]


class TestCelBand(unittest.TestCase):
    def test_flat_fill_inside_the_band_and_nothing_outside(self):
        img = raster.canvas()
        fx.cel_band(img, CX, CY, 139, 234, (43, 155, 252))
        np.testing.assert_allclose(img[CY, CX + 186], np.array([43, 155, 252]) / 255, atol=1e-5)
        self.assertEqual(img[CY, CX + 100].sum(), 0.0)      # the hole
        self.assertEqual(img[CY, CX + 300].sum(), 0.0)      # outside

    def test_coverage_leaves_that_share_of_the_ring_unpainted(self):
        img = raster.canvas()
        fx.cel_band(img, CX, CY, 420, 450, (255, 255, 255), coverage=0.6, dash_seed=4)
        lit = (ring_samples(img, CX, CY, 435)[:, 0] > 0.5).mean()
        self.assertAlmostEqual(lit, 0.6, delta=0.08)

    def test_fine_unsmoothed_dashes_break_into_many_short_gaps(self):
        coarse, fine = raster.canvas(), raster.canvas()
        fx.cel_band(coarse, CX, CY, 420, 450, (255, 255, 255), coverage=0.85, dash_segments=40, dash_seed=7)
        fx.cel_band(fine, CX, CY, 420, 450, (255, 255, 255), coverage=0.85, dash_segments=720, dash_seed=7,
                    dash_smooth=0)

        def gaps(img):
            lit = ring_samples(img, CX, CY, 435, n=4000)[:, 0] > 0.5
            return int(np.sum(lit[1:] != lit[:-1]))
        self.assertGreater(gaps(fine), 4 * gaps(coarse))

    def test_wobble_moves_the_edge_but_stays_close(self):
        img = raster.canvas()
        fx.cel_band(img, CX, CY, 139, 234, (255, 255, 255), wobble=0.012, wobble_seed=3)
        row = img[CY, CX:, 0]
        edge = int(np.argmin(row[150:] > 0.5)) + 150
        self.assertTrue(229 <= edge <= 240, edge)


class TestDroplets(unittest.TestCase):
    def test_droplets_stay_in_their_annulus_and_repeat_for_a_seed(self):
        a, b = raster.canvas(), raster.canvas()
        fx.droplets(a, CX, CY, 104, 136, 58, 1.3, 4.8, (255, 255, 255), seed=5)
        fx.droplets(b, CX, CY, 104, 136, 58, 1.3, 4.8, (255, 255, 255), seed=5)
        np.testing.assert_array_equal(a, b)
        d, _ = raster.polar(CX, CY)
        painted = a[..., 0] > 0.05
        self.assertTrue(painted.any())
        self.assertLess(d[painted].max(), 136 + 6)
        self.assertGreater(d[painted].min(), 104 - 6)


class TestAirbrushRing(unittest.TestCase):
    def test_white_band_halo_outside_and_spray_inside(self):
        img = raster.canvas((48, 137, 209))
        fx.airbrush_ring(img, 713, 557, 484, 48, seed=3)
        band = img[557, 713 + 460]
        self.assertTrue((band > 0.99).all())                          # the plateau is full white
        near, far = img[557, 713 + 490].mean(), img[557, 713 + 560].mean()
        base = np.array([48, 137, 209]).mean() / 255
        self.assertGreater(near, far)                                  # the halo falls away outside
        self.assertGreater(far, base - 1e-6)                           # but never darkens the picture
        spray = img[557 - 60:557 + 60, 713 + 405:713 + 430, 0]         # just inside the band: the sprayed edge
        self.assertGreater(spray.std(), 0.05)                          # grainy, not a smooth ramp
        self.assertTrue(48 / 255 + 0.05 < spray.mean() < 0.99, spray.mean())   # partly sprayed: between picture and white


class TestLight(unittest.TestCase):
    def test_glow_dot_is_brightest_at_its_centre(self):
        img = raster.canvas()
        fx.glow_dot(img, 100, 100, 3, 4, (255, 255, 255))
        self.assertGreater(img[100, 100, 0], img[100, 110, 0])
        self.assertEqual(img[100, 200].sum(), 0.0)

    def test_bloom_spreads_light_past_an_edge(self):
        img = raster.canvas()
        img[500:580, 700:780] = 1.0
        before = img[540, 790].copy()
        fx.bloom(img, 6, 0.35)
        self.assertGreater(img[540, 790, 0], before[0])

    def test_screen_wash_lifts_the_darks_and_keeps_the_brights(self):
        img = np.array([[[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]]], np.float32)
        fx.wash(img, (165, 112, 48), 1.0, mode="screen")
        np.testing.assert_allclose(img[0, 0], np.array([165, 112, 48]) / 255, atol=1e-6)
        np.testing.assert_allclose(img[0, 1], [1, 1, 1], atol=1e-6)

    def test_film_grain_is_fixed_per_seed(self):
        a, b = raster.canvas((128, 128, 128), w=16, h=16), raster.canvas((128, 128, 128), w=16, h=16)
        fx.film_grain(a, seed=9)
        fx.film_grain(b, seed=9)
        np.testing.assert_array_equal(a, b)


class TestTape(unittest.TestCase):
    """The VHS finish (Ingram: "some nice VHS grade grain across the whole thing") and bursts of tape damage."""

    def picture(self):
        img = raster.canvas((40, 60, 140), w=320, h=240)
        img[:, 160:] = (0.85, 0.2, 0.15)                                 # a hard edge from blue to red
        return img

    def test_the_same_frame_always_finishes_the_same_and_the_next_differs(self):
        a, b, c = self.picture(), self.picture(), self.picture()
        fx.vhs(a, 7)
        fx.vhs(b, 7)
        fx.vhs(c, 8)
        np.testing.assert_array_equal(a, b)
        self.assertGreater(np.abs(a - c).mean(), 0.001)

    def test_colour_smears_sideways_past_a_sharp_edge(self):
        img = self.picture()
        fx.vhs(img, 1, noise=0.0, jitter=0.0, head=0.0)
        row = img[120]
        redness = row[:, 0] - row[:, 2]
        # a clean edge flips in one pixel; on tape the colour creeps over several
        self.assertGreater(((redness > -0.4) & (redness < 0.4)).sum(), 4)

    def test_it_keeps_the_picture_in_range_and_about_as_bright(self):
        img = self.picture()
        before = img.mean()
        fx.vhs(img, 3, lift=0.025, saturation=0.92)
        self.assertGreaterEqual(img.min(), 0.0)
        self.assertLessEqual(img.max(), 1.0)
        self.assertLess(abs(img.mean() - before), 0.04)

    def test_the_bottom_lines_tear_where_the_heads_switch(self):
        a, b = self.picture(), self.picture()
        fx.vhs(a, 5, noise=0.0, jitter=0.0, head=1.0, bleed=0.0)
        fx.vhs(b, 5, noise=0.0, jitter=0.0, head=0.0, bleed=0.0)
        self.assertGreater(np.abs(a[-2] - b[-2]).mean(), 0.02)          # the last lines are torn
        self.assertLess(np.abs(a[100] - b[100]).mean(), 0.001)          # the middle isn't

    def test_strength_zero_leaves_the_picture_alone(self):
        img = self.picture()
        before = img.copy()
        fx.vhs(img, 2, strength=0.0)
        np.testing.assert_array_equal(img, before)

    def test_a_damage_burst_tears_its_band_and_nothing_far_from_it(self):
        img = self.picture()
        before = img.copy()
        fx.vhs_damage(img, 4, band_y=60, band_h=30, dropouts=0)
        self.assertGreater(np.abs(img[55:66] - before[55:66]).mean(), 0.01)
        np.testing.assert_array_equal(img[150:], before[150:])

    def test_heat_haze_shimmers_the_ground_and_leaves_the_high_sky_alone(self):
        # Ingram: "a soft, subtle heat haze... as if it were high summer"
        img = raster.canvas((0, 0, 0), w=320, h=240)
        img[:, ::6] = 1.0                                            # vertical stripes, so any wobble shows
        before = img.copy()
        fx.heat_haze(img, 1.0, amp=2.0, scale=12, speed=40, y_hot=200, y_cool=80, seed=3)
        np.testing.assert_array_equal(img[:70], before[:70])         # above y_cool: untouched
        self.assertGreater(np.abs(img[210:] - before[210:]).mean(), 0.02)   # the hot ground shimmers

    def test_heat_haze_is_the_same_at_the_same_moment_and_moves_on(self):
        a, b, c = (raster.canvas((0, 0, 0), w=320, h=240) for _ in range(3))
        for img in (a, b, c):
            img[:, ::6] = 1.0
        fx.heat_haze(a, 1.0, amp=2.0, scale=12, y_hot=200, y_cool=80)
        fx.heat_haze(b, 1.0, amp=2.0, scale=12, y_hot=200, y_cool=80)
        fx.heat_haze(c, 1.5, amp=2.0, scale=12, y_hot=200, y_cool=80)
        np.testing.assert_array_equal(a, b)
        self.assertGreater(np.abs(a - c).mean(), 0.001)

    def test_dropouts_are_soft_pale_streaks(self):
        # Ingram: "soften and lower the opacity of the VHS horizontal lines"
        img = raster.canvas((0, 0, 0), w=320, h=240)
        fx.vhs_damage(img, 9, band_h=0, dropouts=12)
        self.assertGreater((img[..., 0] > 0.3).sum(), 50)                    # they show...
        self.assertLess(img.max(), 0.9)                                        # ...but never as solid white
        self.assertLess(np.median(img[..., 0][img[..., 0] > 0.3]), 0.6)

    def test_a_dropout_is_soft_across_and_tapered_along(self):
        img = raster.canvas((0, 0, 0), w=320, h=240)
        fx._soft_streak(img, 120, 40, 200, 0.6)
        across = img[115:126, 140, 0]
        self.assertEqual(int(np.argmax(across)), 5)                           # brightest on its own line...
        self.assertGreater(across[4], 0.05)                                   # ...but not a one-pixel scratch
        self.assertLess(across[4], across[5])
        self.assertLess(img[120, 42, 0], img[120, 140, 0] * 0.5)             # and faint at its ends
        self.assertLessEqual(img.max(), 0.6 * 0.94 + 1e-6)

    def test_the_finish_noise_runs_in_soft_lines(self):
        a = raster.canvas((110, 110, 110), w=320, h=240)
        fx.vhs(a, 4, bleed=0.0, jitter=0.0, head=0.0, noise=0.05)
        luma = a.mean(axis=2) - a.mean()
        corr = (luma[1:] * luma[:-1]).mean() / (luma.var() + 1e-12)
        self.assertGreater(corr, 0.3)                                          # neighbouring lines share their noise


class TestLightColumn(unittest.TestCase):
    """The column of orange light the Frame stands in (the source's R32-R35 and R102-R105)."""

    def test_it_glows_toward_its_centre_and_reddens_toward_the_edges(self):
        img = raster.canvas()
        fx.light_column(img, 60.0, cx=720, width=300, seed=2)
        centre, edge = img[:, 680:760].mean(axis=(0, 1)), img[:, :80].mean(axis=(0, 1))
        self.assertGreater(centre.sum(), edge.sum())
        self.assertGreater(edge[0], edge[2] * 3)                               # red at the edge

    def test_its_streaks_run_up_and_down_not_across(self):
        img = raster.canvas()
        fx.light_column(img, 60.0, cx=720, width=300, seed=2)
        luma = img.mean(axis=2)[:, 520:920]
        across = np.abs(np.diff(luma, axis=1)).mean()
        down = np.abs(np.diff(luma, axis=0)).mean()
        self.assertGreater(across, down * 2)

    def test_it_is_redrawn_on_twos(self):
        f = lambda n: n / 24 - 0.5
        a, b, c = raster.canvas(), raster.canvas(), raster.canvas()
        fx.light_column(a, f(1600), seed=5)
        fx.light_column(b, f(1601), seed=5)
        fx.light_column(c, f(1602), seed=5)
        np.testing.assert_array_equal(a, b)                                     # one drawing, held two frames
        self.assertGreater(np.abs(a - c).mean(), 0.001)                        # then the next

    def test_strength_zero_leaves_the_picture_alone(self):
        img = raster.canvas((10, 200, 30))
        before = img.copy()
        fx.light_column(img, 60.0, strength=0.0)
        np.testing.assert_array_equal(img, before)


class TestTheProceduralShots(unittest.TestCase):
    """The effects the procedural shots are built from (the visuals round)."""
    f = staticmethod(lambda n: n / 24 - 0.5)

    def test_a_painted_field_is_lighter_above_and_darker_in_its_corners(self):
        img = raster.canvas()
        fx.field(img, (100, 120, 160), gradient=0.2, vignette=0.3, mottle=0.0)
        self.assertGreater(img[40, 720].mean(), img[1040, 720].mean())
        self.assertGreater(img[540, 720].mean(), img[10, 10].mean())

    def test_an_orb_is_lit_on_one_side_with_a_rim_and_a_glow(self):
        img = raster.canvas()
        fx.orb(img, 720, 540, 300, (150, 64, 232), light=(-0.5, -0.6), mottle=0.0)
        lit, dark = img[420, 600].mean(), img[680, 860].mean()
        self.assertGreater(lit, dark * 1.3)                                  # the lit side and the shadow side
        self.assertGreater(img[540, 1040].mean(), img[540, 1400].mean())     # a glow round it, fading out
        self.assertGreater(img[:, :, 0].max(), 0.9)                          # a bright specular spot

    def test_a_fan_of_rays_stays_in_its_sectors_and_unfurls(self):
        up, half = raster.canvas(), raster.canvas()
        fx.ray_fan(up, 1.0, 720, 540, [[240, 300]], n=30, length=(300, 500), blur=0, seed=2)
        fx.ray_fan(half, 1.0, 720, 540, [[240, 300]], n=30, length=(300, 500), blur=0, unfurl=0.4, seed=2)
        self.assertGreater(up[100:400, 620:820].mean(), 0.05)                # the rays go up...
        self.assertLess(up[700:1000, 620:820].mean(), 0.02)                  # ...and not down
        self.assertGreater(up[80:200, 620:820].mean(), half[80:200, 620:820].mean() + 0.02)   # and grow

    def test_rays_arcs_and_streaks_are_redrawn_on_twos(self):
        for draw in (lambda img, t: fx.ray_fan(img, t, 720, 540, [[0, 360]], n=20, seed=1),
                     lambda img, t: fx.arcs(img, t, 720, 540, 200, 420, seed=1),
                     lambda img, t: fx.streaks(img, t, seed=1)):
            a, b, c = raster.canvas(), raster.canvas(), raster.canvas()
            draw(a, self.f(900))
            draw(b, self.f(901))
            draw(c, self.f(902))
            np.testing.assert_array_equal(a, b)
            self.assertGreater(np.abs(a - c).mean(), 1e-4)

    def test_arcs_crackle_outward_from_their_ring(self):
        img = raster.canvas()
        fx.arcs(img, 1.0, 720, 540, 250, 450, n=10, seed=5)
        d, _ = raster.polar(720, 540)
        lit = img.max(axis=2) > 0.3
        self.assertGreater(lit.sum(), 500)
        self.assertGreater(np.median(d[lit]), 250)

    def test_streaks_run_along_their_angle(self):
        img = raster.canvas()
        fx.streaks(img, 1.0, angle=0, n=30, seed=4)
        luma = img.mean(axis=2)
        self.assertGreater(np.abs(np.diff(luma, axis=0)).mean(), np.abs(np.diff(luma, axis=1)).mean() * 2)

    def test_the_radar_leaves_an_afterglow_and_flares_its_contacts(self):
        t = self.f(1932)
        img = raster.canvas()
        fx.radar(img, t, sweep_speed=150.0, contacts=())
        sweep = (int(round((t + 10.0) * 24)) // 2 * 2 / 24.0 - 10.0) * 150.0 % 360
        at = lambda deg: img[int(540 + 300 * np.sin(np.radians(deg))), int(720 + 300 * np.cos(np.radians(deg)))].mean()
        self.assertGreater(at(sweep - 10), at(sweep + 60) + 0.05)            # bright just behind the sweep
        fresh, stale = raster.canvas(), raster.canvas()
        fx.radar(fresh, t, sweep_speed=150.0, contacts=((0.5, sweep - 5),))
        fx.radar(stale, t, sweep_speed=150.0, contacts=((0.5, sweep - 200),))
        px = lambda img, deg: img[int(540 + 220 * np.sin(np.radians(deg))), int(720 + 220 * np.cos(np.radians(deg)))]
        self.assertGreater(px(fresh, sweep - 5)[0], px(stale, sweep - 200)[0] + 0.1)   # just swept: it flares

    def test_data_bars_light_some_segments_and_change_on_twos(self):
        a, b, c = raster.canvas(), raster.canvas(), raster.canvas()
        for img, n in ((a, 900), (b, 901), (c, 902)):
            fx.data_bars(img, self.f(n), 100, 100, 300, 400, cols=6, segs=12, seed=3)
        self.assertGreater(a[100:500, 100:400].max(), 0.5)
        np.testing.assert_array_equal(a, b)
        self.assertGreater(np.abs(a - c).sum(), 0)

    def test_halation_glows_the_brights_into_the_dark(self):
        a, b = raster.canvas(w=320, h=240), raster.canvas(w=320, h=240)
        for img in (a, b):
            img[100:140, 140:180] = 1.0
        fx.vhs(a, 3, bleed=0.0, noise=0.0, jitter=0.0, head=0.0, halation=0.0)
        fx.vhs(b, 3, bleed=0.0, noise=0.0, jitter=0.0, head=0.0, halation=0.6)
        self.assertGreater(b[120, 195].mean(), a[120, 195].mean() + 0.02)    # light spills past the edge
        self.assertLess(b[20, 20].mean(), 0.02)                              # the far dark stays dark


class TestBlankTape(unittest.TestCase):
    """The pre-roll (Ingram: "start with a 'tracking issue' and add some blank space... as if it were changing
    channel")."""

    def test_locked_tape_is_near_black(self):
        img = raster.canvas()
        fx.tape_blank(img, -1.0, strength=0.0)
        self.assertLess(img.mean(), 0.03)
        self.assertLess(img.mean(axis=(1, 2)).max(), 0.05)                   # no band anywhere

    def test_tracking_off_rolls_bands_of_white_dashes(self):
        img = raster.canvas()
        fx.tape_blank(img, -2.0, strength=1.0)
        rows = img.mean(axis=(1, 2))
        self.assertGreater(rows.max(), 0.12)                                  # a band...
        self.assertLess(np.median(rows), 0.08)                                # ...across the snowy black
        band = img[int(np.argmax(rows)), :, 0]
        self.assertGreater(band.std(), 0.1)                                   # dashes, not a flat grey bar

    def test_the_bands_move_on_every_frame_and_repeat_for_a_moment(self):
        a, b, c = raster.canvas(), raster.canvas(), raster.canvas()
        fx.tape_blank(a, -2.0)
        fx.tape_blank(b, -2.0)
        fx.tape_blank(c, -2.0 + 1 / 24)
        np.testing.assert_array_equal(a, b)
        self.assertNotEqual(int(np.argmax(a.mean(axis=(1, 2)))), int(np.argmax(c.mean(axis=(1, 2)))))

    def test_an_empty_channel_is_static_all_over(self):
        img = raster.canvas()
        fx.tape_blank(img, -3.4, strength=0.0, snow=1.0)
        for quad in (img[:540, :720], img[:540, 720:], img[540:, :720], img[540:, 720:]):
            self.assertTrue(0.2 < quad.mean() < 0.6, quad.mean())
            self.assertGreater(quad.std(), 0.12)


if __name__ == "__main__":
    unittest.main()
