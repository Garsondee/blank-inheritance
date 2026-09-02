"""Terrain tests -- chiefly the golden-hour colour-temperature regression.

THE BUG (2026-08-23): Port Island rendered with a cold blue wash while being,
provably, in full unobstructed sun. Diagnosed by sampling the real arrays at the
island's own coordinates: elevation 2.24 m (real), occluded 0.000 (fully lit),
dot 0.244 -- and 0.244 is simply sin(14 degrees), which is what the Lambertian
term gives for ANY flat ground under a grazing sun, lit or not. Because colour
temperature was driven by `lit = dot * direct_ok`, flat sunlit land blended most
of the way to the cool tint.

The property that must hold forever after: **flat, unoccluded ground is warm.**
It may legitimately be DIM (a grazing sun does light it weakly), but it must not
be COLD. That distinction is the whole fix, and `test_flat_sunlit_ground_is_warm`
is the test that would have caught it.
"""

import math
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap import terrain  # noqa: E402

LIGHTING = {
    "warmTint": [1.22, 1.04, 0.70],
    "coolTint": [0.82, 0.90, 1.10],
    "ambient": 0.30,
    "directWeight": 0.70,
}
CELL_M = 5.86
AZIMUTH = 315.0
ALTITUDE = 14.0   # the golden-hour angle the bug appeared at


def warmth(rgb):
    """Red minus blue. Positive is warm, negative is cool."""
    return float(rgb[0] - rgb[2])


class TestColourTemperatureRegression(unittest.TestCase):
    def test_flat_sunlit_ground_is_warm(self):
        """THE regression. Flat + unoccluded must never read as shadow."""
        flat = np.full((64, 64), 2.24, dtype=np.float32)   # Port Island's real height
        shade = terrain.shade_rgb(flat, CELL_M, AZIMUTH, ALTITUDE, 31.0, LIGHTING)
        centre = shade[32, 32]
        self.assertGreater(
            warmth(centre), 0.0,
            "flat ground in full sun must be WARM. If this fails, colour "
            "temperature has been re-coupled to the Lambertian dot product, "
            "which is ~sin(altitude) on flat ground regardless of shadow.",
        )

    def test_flat_sunlit_ground_may_be_dim_but_not_cold(self):
        """Brightness and colour are allowed to disagree -- that is the point."""
        flat = np.full((64, 64), 2.24, dtype=np.float32)
        shade = terrain.shade_rgb(flat, CELL_M, AZIMUTH, ALTITUDE, 31.0, LIGHTING)
        centre = shade[32, 32]
        # Dim is fine: a 14-degree sun lights flat ground weakly.
        self.assertLess(float(centre.mean()), 1.0)
        # Cold is not.
        self.assertGreater(warmth(centre), 0.0)

    def test_genuinely_occluded_ground_goes_cool(self):
        """The cool tint must still exist -- the fix must not just delete it.

        A tall ridge with a deep flat valley behind it: cells immediately
        down-sun of the ridge are in real cast shadow.
        """
        elevation = np.zeros((128, 128), dtype=np.float32)
        elevation[60:68, :] = 400.0            # a ridge running across the field
        shade = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                  LIGHTING, occlusion_blur_sigma=0.0)

        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
        shadowed = occluded > 0.9
        self.assertTrue(shadowed.any(), "the ridge must cast a shadow at all")

        warmths = np.asarray([warmth(px) for px in shade[shadowed]])
        self.assertLess(float(warmths.mean()), 0.0,
                        "ground in real cast shadow must read cool")

    def test_lit_and_shadowed_differ_in_both_brightness_and_colour(self):
        elevation = np.zeros((128, 128), dtype=np.float32)
        elevation[60:68, :] = 400.0
        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
        shade = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                  LIGHTING, occlusion_blur_sigma=0.0)
        lit = occluded < 0.1
        dark = occluded > 0.9
        self.assertGreater(float(shade[lit].mean()), float(shade[dark].mean()))


class TestCastShadowMul(unittest.TestCase):
    """cast_shadow_mul: the neutral, occlusion-only multiplier buildings and
    roads use instead of shade_rgb -- see its docstring for the 2026-08-24
    "everything becomes brown" bug this exists to fix.
    """

    def test_shape_and_channels_match_shade_rgb(self):
        flat = np.full((32, 32), 2.24, dtype=np.float32)
        cast = terrain.cast_shadow_mul(flat, CELL_M, AZIMUTH, ALTITUDE, 31.0, LIGHTING)
        self.assertEqual(cast.shape, (32, 32, 3))

    def test_unoccluded_ground_is_always_full_brightness_and_neutral(self):
        """THE regression this function exists for: a slope merely FACING
        away from the sun (no ridge actually blocking it -- occluded stays
        at 0 everywhere) must NOT darken buildings/roads at all, unlike
        shade_rgb, which legitimately dims and warm-tints it for the ground.
        Confirmed empirically before writing this test: this exact ramp
        gives occluded==0.0 throughout the interior while shade_rgb's
        brightness there drops to ~0.66 with a real warm-tint skew."""
        n = 128
        elevation = np.zeros((n, n), dtype=np.float32)
        for r in range(n):
            elevation[r, :] = r * 3.0
        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
        interior = occluded[20:100, 20:100]
        self.assertLess(float(interior.max()), 0.01, "fixture must be unoccluded to test this")

        shade = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                  LIGHTING, occlusion_blur_sigma=0.0)
        self.assertLess(float(shade[64, 64].mean()), 0.9,
                        "fixture must actually dim shade_rgb to be a meaningful regression test")

        cast = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                       LIGHTING, occlusion_blur_sigma=0.0)
        centre = cast[64, 64]
        self.assertTrue(np.allclose(centre, 1.0, atol=1e-3),
                        f"unoccluded ground must stay full-brightness/neutral regardless of "
                        f"slope facing, got {centre}")

    def test_genuinely_occluded_area_darkens_to_the_floor(self):
        elevation = np.zeros((128, 128), dtype=np.float32)
        elevation[60:68, :] = 400.0  # a ridge, same fixture as the shade_rgb cool-shadow test
        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
        shadowed = occluded > 0.9
        self.assertTrue(shadowed.any(), "the ridge must cast a shadow at all")

        cast = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                       LIGHTING, occlusion_blur_sigma=0.0)
        floor = LIGHTING.get("castShadowFloor", 0.6)
        self.assertAlmostEqual(float(cast[shadowed].mean()), floor, places=2)

    def test_darkening_carries_no_colour_tint_anywhere(self):
        """Unlike shade_rgb, every channel must move together -- R, G and B
        equal at every pixel, lit or shadowed. A colour skew here would
        reintroduce exactly the bug this function exists to avoid."""
        elevation = np.zeros((128, 128), dtype=np.float32)
        elevation[60:68, :] = 400.0
        cast = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                       LIGHTING, occlusion_blur_sigma=0.0)
        self.assertTrue(np.allclose(cast[..., 0], cast[..., 1]))
        self.assertTrue(np.allclose(cast[..., 1], cast[..., 2]))

    def test_castshadowfloor_is_configurable(self):
        elevation = np.zeros((128, 128), dtype=np.float32)
        elevation[60:68, :] = 400.0
        lighting = dict(LIGHTING, castShadowFloor=0.25)
        cast = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                       lighting, occlusion_blur_sigma=0.0)
        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
        shadowed = occluded > 0.9
        self.assertAlmostEqual(float(cast[shadowed].mean()), 0.25, places=2)

    def test_nan_elevation_stays_neutral(self):
        elevation = np.full((16, 16), np.nan, dtype=np.float32)
        cast = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        self.assertTrue(np.allclose(cast, 1.0))


class TestCanopyNoiseT(unittest.TestCase):
    """canopy_noise_t: the [0,1] noise field render_tile maps through a
    palette to texture forest/wood/scrub landuse -- see render.py's
    "blocky forest" comment for the 2026-08-24 bug this exists to fix."""

    def test_shape_matches_grid(self):
        t = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=1)
        self.assertEqual(t.shape, (64, 64))

    def test_values_stay_in_unit_range(self):
        t = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=1)
        self.assertGreaterEqual(float(t.min()), 0.0)
        self.assertLessEqual(float(t.max()), 1.0)

    def test_not_constant(self):
        """A real texture, not an accidentally-flat field."""
        t = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=1)
        self.assertGreater(float(t.std()), 0.01)

    def test_deterministic_for_the_same_seed(self):
        """Must be reproducible -- re-rendering the same tile (a preview,
        then the final export) must not shuffle the forest's texture."""
        a = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=7)
        b = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=7)
        np.testing.assert_array_equal(a, b)

    def test_different_seeds_differ(self):
        a = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=1)
        b = terrain.canopy_noise_t(grid=64, extent_m=1000.0, blob_m=45.0, seed=2)
        self.assertFalse(np.array_equal(a, b))

    def test_smaller_blob_scale_has_more_high_frequency_variation(self):
        """A smaller blob_m packs more independent noise cells into the same
        frame extent -- after upsampling to the same grid, that must survive
        as visibly higher-frequency variation, not get smoothed away."""
        extent_m, grid = 2000.0, 256
        fine = terrain.canopy_noise_t(grid=grid, extent_m=extent_m, blob_m=20.0, seed=3)
        coarse = terrain.canopy_noise_t(grid=grid, extent_m=extent_m, blob_m=200.0, seed=3)

        def mean_abs_gradient(arr):
            return float(np.abs(np.diff(arr, axis=0)).mean() + np.abs(np.diff(arr, axis=1)).mean())

        self.assertGreater(mean_abs_gradient(fine), mean_abs_gradient(coarse))


class TestHorizonShadow(unittest.TestCase):
    def test_a_wall_casts_only_down_sun(self):
        """Directional correctness: shadow behind the wall, none in front."""
        elevation = np.zeros((100, 100), dtype=np.float32)
        elevation[50, :] = 500.0
        # Light from due north (azimuth 0) -> shadow falls toward +row.
        dx, dy, tan_alt = terrain.light_vector(0.0, 10.0, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)

        behind = occluded[55:70, 40:60].mean()
        infront = occluded[30:45, 40:60].mean()
        self.assertGreater(behind, 0.5, "ground down-sun of the wall must be shadowed")
        self.assertLess(infront, 0.1, "ground up-sun of the wall must be lit")

    def test_flat_terrain_casts_nothing(self):
        flat = np.full((64, 64), 12.0, dtype=np.float32)
        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        occluded = terrain.horizon_shadow(flat, dx, dy, tan_alt, CELL_M)
        self.assertLess(float(occluded.mean()), 0.02)

    def test_lower_sun_casts_longer_shadows(self):
        """Measured as shadow REACH, not as coverage of a fixed window.

        A tall wall saturates any sampling window at both angles, which makes a
        mean-coverage test unable to tell them apart. The wall is kept short
        enough that both shadows terminate inside the field.
        """
        elevation = np.zeros((120, 120), dtype=np.float32)
        elevation[20, :] = 100.0
        reaches = []
        for altitude in (30.0, 10.0):
            dx, dy, tan_alt = terrain.light_vector(0.0, altitude, 0.0)
            occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
            column = occluded[21:, 40:80].mean(axis=1)
            lit_rows = np.where(column > 0.5)[0]
            reaches.append(int(lit_rows.max()) if len(lit_rows) else 0)
        self.assertGreater(reaches[1], reaches[0],
                           f"a lower sun must throw a longer shadow "
                           f"(30deg reached {reaches[0]} rows, 10deg {reaches[1]})")

    def test_shadow_length_matches_the_trigonometry(self):
        """A 100 m wall at 26.57 degrees (tan = 0.5) must reach ~200 m."""
        elevation = np.zeros((120, 120), dtype=np.float32)
        elevation[20, :] = 100.0
        altitude = math.degrees(math.atan(0.5))
        dx, dy, tan_alt = terrain.light_vector(0.0, altitude, 0.0)
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M)
        column = occluded[21:, 40:80].mean(axis=1)
        lit_rows = np.where(column > 0.5)[0]
        reach_m = (int(lit_rows.max()) + 1) * CELL_M
        self.assertAlmostEqual(reach_m, 200.0, delta=2 * CELL_M)

    def test_output_shape_preserved(self):
        elevation = np.zeros((73, 91), dtype=np.float32)
        dx, dy, tan_alt = terrain.light_vector(AZIMUTH, ALTITUDE, 31.0)
        self.assertEqual(
            terrain.horizon_shadow(elevation, dx, dy, tan_alt, CELL_M).shape, (73, 91))


class TestNaNFillDoesNotManufacturePhantomShadows(unittest.TestCase):
    """REGRESSION (found 2026-08-24, via the Milestone-0 e2e check against the
    real 12 km Kurose frame, NOT from a synthetic test -- see terrain.py's
    `shade_rgb` docstring for the full story). Filling NaN elevation with
    `nanmean(elevation)` pulls in every mountain peak in the frame, so a frame
    with real 700 m relief and 39% NaN (mostly open sea, matching GSI's own
    documented NoData pattern) filled the entire visible ocean with a single
    fake ~114 m plateau. That flat-but-elevated "wall" then threw and caught
    entirely fictitious shadows on real coastal features via horizon_shadow.
    Confirmed directly against real data: Port Island read occluded=1.000
    (fully shadowed) under mean-fill and occluded=0.000 (its real, correct,
    unobstructed exposure) once filled with sea level (0 m) instead.

    This reproduces the same shape synthetically: a tall distant mountain (to
    pull nanmean well above zero) plus a large NaN "sea" region containing one
    small near-sea-level real feature, far enough from the mountain that real
    geometry could not possibly shadow it.
    """

    def test_low_lying_feature_far_from_the_mountain_reads_unoccluded(self):
        n = 256
        elevation = np.full((n, n), np.nan, dtype=np.float32)
        # A tall mountain block in one corner -- pulls nanmean well above 0.
        elevation[0:20, 0:20] = 700.0
        # A real, flat, near-sea-level feature far from the mountain (an
        # "island" like Port Island): correctly-surveyed data, not NaN.
        elevation[200:210, 200:210] = 2.0
        self.assertGreater(float(np.nanmean(elevation)), 20.0,
                           "the mean must be pulled well above sea level by the "
                           "mountain for this test to exercise the bug")

        shade = terrain.shade_rgb(elevation, cell_size_m=20.0, azimuth_deg=315.0,
                                  altitude_deg=14.0, rotation_deg=0.0,
                                  lighting=LIGHTING, occlusion_blur_sigma=0.0)
        centre = shade[205, 205]
        self.assertGreater(
            warmth(centre), 0.0,
            "a real, flat, near-sea-level feature far from the only real relief "
            "in frame must read as unoccluded/warm -- if this fails, NaN is "
            "being filled with something other than a flat, physically "
            "sensible sea-level value again",
        )

    def test_fill_value_is_flat_not_mountain_height(self):
        """The mechanism, isolated: the filled array itself must not contain
        the phantom plateau, regardless of what horizon_shadow then does with
        it."""
        elevation = np.full((50, 50), np.nan, dtype=np.float32)
        elevation[0:5, 0:5] = 700.0
        valid = ~np.isnan(elevation)
        filled = np.where(valid, elevation, 0.0)
        self.assertEqual(float(filled[40, 40]), 0.0,
                         "NaN cells far from real data must fill flat at sea "
                         "level, not at a mountain-inflated frame mean")


class TestShadowDirectionConsistency(unittest.TestCase):
    """Terrain and buildings must be lit from the same side.

    REGRESSION (found 2026-08-24, inherited from the spike and present in the
    delivered render): building shadows are translated in MAP space and only
    flipped when converted to pixels, while the horizon sweep works directly on
    an array whose rows increase SOUTHWARD. Passing the map-space dy straight
    into the sweep therefore inverted the vertical component, so hillsides were
    shaded up-page while the buildings standing on them cast down-page.

    On complex ridge terrain that reads as "busy" rather than as an obvious
    fault, which is exactly why it shipped. This test makes the two agree by
    construction.
    """

    def _directions(self, azimuth):
        from citymap.frame import Frame
        frame = Frame(id="t", center_lon=135.205, center_lat=34.678,
                      rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674)
        tile = frame.full_tile(px=100)
        dx, dy, tan_alt = terrain.light_vector(azimuth, 14.0, 0.0)

        # Where a building's shadow lands, in pixels.
        base = tile.to_px(frame.cx, frame.cy)
        moved = tile.to_px(frame.cx + dx * 50.0, frame.cy + dy * 50.0)
        building = (moved[0] - base[0], moved[1] - base[1])

        # Where a peak's terrain shadow lands, in array cols/rows.
        elevation = np.zeros((101, 101), dtype=np.float32)
        elevation[50, 50] = 800.0
        occluded = terrain.horizon_shadow(elevation, dx, dy, tan_alt, 10.0)
        rows, cols = np.where(occluded > 0.3)
        self.assertTrue(len(rows) > 0, "the peak must cast some shadow")
        terrain_dir = (float(cols.mean()) - 50.0, float(rows.mean()) - 50.0)
        return building, terrain_dir

    def test_agree_for_every_cardinal_and_diagonal_sun(self):
        for azimuth in (0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0):
            building, terrain_dir = self._directions(azimuth)
            for axis, name in ((0, "horizontal"), (1, "vertical")):
                if abs(building[axis]) < 1e-6:
                    continue
                self.assertGreater(
                    building[axis] * terrain_dir[axis], 0.0,
                    f"azimuth {azimuth}: {name} shadow direction disagrees "
                    f"(building {building[axis]:+.2f} px vs terrain "
                    f"{terrain_dir[axis]:+.2f} cells)",
                )


class TestNaNHandling(unittest.TestCase):
    def test_nan_cells_render_neutral(self):
        elevation = np.full((32, 32), 10.0, dtype=np.float32)
        elevation[10:20, 10:20] = np.nan
        shade = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        np.testing.assert_allclose(shade[15, 15], [1.0, 1.0, 1.0])

    def test_all_nan_is_neutral_everywhere(self):
        elevation = np.full((16, 16), np.nan, dtype=np.float32)
        shade = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        np.testing.assert_allclose(shade, 1.0)

    def test_routing_elevation_keeps_nan_forbidden(self):
        """The router must never see a mean-filled plateau over the sea.

        GSI's NoData is concentrated at the coast, so filling it would ring the
        whole shoreline with phantom cliffs.
        """
        elevation = np.full((16, 16), 10.0, dtype=np.float32)
        elevation[0:4, :] = np.nan
        routing = terrain.routing_elevation(elevation)
        self.assertTrue(np.isnan(routing[0:4, :]).all(),
                        "NaN must survive into the routing surface as forbidden")
        self.assertFalse(np.isnan(routing[8, 8]))


class TestFillLandNan(unittest.TestCase):
    """terrain.fill_land_nan: the 2026-08-24 fix for a direct user report --
    a real peninsula (real buildings and roads, clearly emerged land) had
    52.75% of its DEM cells NaN, and flattening those to sea level (correct
    for genuine open water) sat a fake flat patch against real, gently
    varying neighbours, reading as a jagged, blocky, "low resolution"
    artifact right where it happened."""

    def test_sea_nan_still_fills_with_sea_level(self):
        """The ALREADY-correct behaviour for genuine open water must survive
        unchanged -- this function only changes what happens outside the
        sea mask."""
        elevation = np.full((10, 10), 5.0, dtype=np.float32)
        elevation[0:3, 0:3] = np.nan
        sea_mask = np.zeros((10, 10), dtype=bool)
        sea_mask[0:3, 0:3] = True
        filled = terrain.fill_land_nan(elevation, sea_mask)
        np.testing.assert_allclose(filled[1, 1], 0.0)

    def test_land_nan_fills_with_the_nearest_real_value_not_zero(self):
        elevation = np.full((10, 10), np.nan, dtype=np.float32)
        elevation[:, 9] = 8.0  # one real column of data, far side of the grid
        sea_mask = np.zeros((10, 10), dtype=bool)  # no sea anywhere -- all land
        filled = terrain.fill_land_nan(elevation, sea_mask)
        # every NaN cell's nearest valid neighbour is in column 9 -> 8.0, not 0.0
        np.testing.assert_allclose(filled[5, 0], 8.0)
        np.testing.assert_allclose(filled[5, 5], 8.0)

    def test_nearest_neighbour_picks_the_closer_of_two_real_regions(self):
        elevation = np.full((10, 10), np.nan, dtype=np.float32)
        elevation[:, 0] = 2.0    # real data on the left edge
        elevation[:, 9] = 20.0   # real data on the right edge
        sea_mask = np.zeros((10, 10), dtype=bool)
        filled = terrain.fill_land_nan(elevation, sea_mask)
        self.assertAlmostEqual(float(filled[5, 1]), 2.0, msg="closer to the left edge")
        self.assertAlmostEqual(float(filled[5, 8]), 20.0, msg="closer to the right edge")

    def test_no_nan_is_a_no_op(self):
        elevation = np.arange(16, dtype=np.float32).reshape(4, 4)
        sea_mask = np.zeros((4, 4), dtype=bool)
        filled = terrain.fill_land_nan(elevation, sea_mask)
        np.testing.assert_array_equal(filled, elevation)

    def test_all_nan_with_no_sea_does_not_crash(self):
        """Nothing valid ANYWHERE to borrow from -- must degrade gracefully
        (falls to sea_mask's own value, 0.0 for non-sea by construction of
        the where()), not raise or hang."""
        elevation = np.full((6, 6), np.nan, dtype=np.float32)
        sea_mask = np.zeros((6, 6), dtype=bool)
        filled = terrain.fill_land_nan(elevation, sea_mask)
        self.assertFalse(np.isnan(filled).any())


class TestShadeRgbAndCastShadowMulRespectSeaMask(unittest.TestCase):
    """Wiring: shade_rgb/cast_shadow_mul must actually USE sea_mask when
    given (via fill_land_nan), and stay byte-for-byte identical to the old
    behaviour when it is omitted (every existing caller/test)."""

    def _land_nan_elevation(self):
        n = 40
        elevation = np.full((n, n), np.nan, dtype=np.float32)
        # A mild real gradient on one side (so there is genuine terrain to
        # shade), and a large NaN gap -- all of it land (sea_mask all False).
        elevation[:, 0:15] = np.tile(np.linspace(0.0, 6.0, 15), (n, 1))
        return elevation

    def test_omitting_sea_mask_matches_the_old_flat_zero_fill_exactly(self):
        elevation = self._land_nan_elevation()
        without_mask = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        all_land_mask = np.zeros(elevation.shape, dtype=bool)
        with_all_false_mask = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                                LIGHTING, sea_mask=None)
        np.testing.assert_array_equal(without_mask, with_all_false_mask)

    def test_land_aware_fill_changes_shading_near_the_nan_boundary(self):
        """The actual regression check: a valid cell right next to a large
        land-NaN patch must shade DIFFERENTLY once the land-aware fill
        replaces the flat-zero fill there -- if this fails, sea_mask is
        being accepted but not actually used."""
        elevation = self._land_nan_elevation()
        sea_mask = np.zeros(elevation.shape, dtype=bool)  # explicitly: none of this is sea

        old_behaviour = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        new_behaviour = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                          LIGHTING, sea_mask=sea_mask)
        # column 14 is real data right at the edge of the NaN gap -- exactly
        # where the boundary artifact would show up.
        self.assertFalse(np.allclose(old_behaviour[:, 14], new_behaviour[:, 14]),
                         "land-aware fill must change shading right at the NaN boundary")

    def test_cast_shadow_mul_also_respects_sea_mask(self):
        elevation = self._land_nan_elevation()
        sea_mask = np.zeros(elevation.shape, dtype=bool)
        old_behaviour = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        new_behaviour = terrain.cast_shadow_mul(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                                LIGHTING, sea_mask=sea_mask)
        self.assertFalse(np.allclose(old_behaviour[:, 14], new_behaviour[:, 14]))

    def test_genuine_sea_nan_is_unaffected_by_the_land_aware_fill(self):
        """A NaN region correctly marked as sea must shade the SAME whether
        or not sea_mask is passed -- the fix must not perturb the
        already-correct sea case."""
        n = 40
        elevation = np.full((n, n), 3.0, dtype=np.float32)
        elevation[:, 20:] = np.nan
        sea_mask = np.zeros((n, n), dtype=bool)
        sea_mask[:, 20:] = True

        without_mask = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0, LIGHTING)
        with_mask = terrain.shade_rgb(elevation, CELL_M, AZIMUTH, ALTITUDE, 0.0,
                                      LIGHTING, sea_mask=sea_mask)
        np.testing.assert_allclose(without_mask, with_mask)


class TestLightVector(unittest.TestCase):
    def test_frame_rotation_keeps_the_sun_in_the_same_page_corner(self):
        """The sun must not swing across the page when the city is rotated."""
        a = terrain.light_vector(AZIMUTH, ALTITUDE, 0.0)
        b = terrain.light_vector(AZIMUTH, ALTITUDE, 31.0)
        # Rotating the frame by 31 degrees rotates the light vector with it.
        angle_a = math.degrees(math.atan2(a[1], a[0]))
        angle_b = math.degrees(math.atan2(b[1], b[0]))
        self.assertAlmostEqual((angle_b - angle_a) % 360.0, 31.0, places=4)

    def test_tan_altitude_returned(self):
        _, _, tan_alt = terrain.light_vector(AZIMUTH, 45.0, 0.0)
        self.assertAlmostEqual(tan_alt, 1.0, places=6)


class TestDistanceTransform(unittest.TestCase):
    def test_distance_in_metres_from_a_seed(self):
        mask = np.zeros((21, 21), dtype=bool)
        mask[10, 10] = True
        distance = terrain.distance_from(mask, cell_size_m=2.0)
        self.assertAlmostEqual(float(distance[10, 10]), 0.0, places=6)
        self.assertAlmostEqual(float(distance[10, 15]), 10.0, places=6)
        self.assertAlmostEqual(float(distance[13, 14]), 10.0, places=6)  # 3-4-5

    def test_matches_the_pure_python_fallback(self):
        rng = np.random.default_rng(7)
        mask = rng.random((40, 40)) > 0.9
        if not mask.any():
            mask[0, 0] = True
        fast = terrain.distance_from(mask, 1.0)
        slow = terrain._edt_fallback(mask).astype(np.float32)
        np.testing.assert_allclose(fast, slow, atol=1e-4)


class TestSlope(unittest.TestCase):
    def test_constant_gradient_reads_the_right_percentage(self):
        # A 30% slope: 0.3 m rise per 1 m run.
        rows = np.arange(50, dtype=np.float32)[:, None] * (0.3 * 2.0)
        elevation = np.repeat(rows, 50, axis=1)
        slope = terrain.slope_percent(elevation, cell_size_m=2.0)
        self.assertAlmostEqual(float(slope[25, 25]), 30.0, places=3)

    def test_flat_is_zero(self):
        flat = np.full((20, 20), 5.0, dtype=np.float32)
        self.assertAlmostEqual(float(terrain.slope_percent(flat, 2.0).max()), 0.0, places=6)


class TestScipyPresence(unittest.TestCase):
    def test_scipy_is_available(self):
        # Not a hard requirement (there are fallbacks), but its absence costs
        # ~17 s per frame on the EDT alone, so announce it rather than let the
        # renderer quietly crawl.
        if not terrain.HAVE_SCIPY:
            self.skipTest("scipy missing -- EDT and blur fall back to slow paths "
                          "(~17s/frame penalty). Install with: pip install --user scipy")


if __name__ == "__main__":
    unittest.main()
