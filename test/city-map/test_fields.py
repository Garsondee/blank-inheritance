"""L2 fields tests: rotate+clip correctness, the sea depth gradient, and the
save/load round-trip.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import Point, Polygon  # noqa: E402

from citymap import cache, fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.world import World  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=2000.0, crs_epsg=6674, dem_grid=64)


class TestRotateAndClip(unittest.TestCase):
    def test_a_feature_inside_the_frame_survives(self):
        square = Polygon([(FRAME.cx - 10, FRAME.cy - 10), (FRAME.cx + 10, FRAME.cy - 10),
                          (FRAME.cx + 10, FRAME.cy + 10), (FRAME.cx - 10, FRAME.cy + 10)])
        feature = Feature(id="a", geom=square, tags={"building": "yes"}, area=True)
        out = fields.rotate_and_clip([feature], FRAME)
        self.assertEqual(len(out), 1)
        self.assertGreater(out[0].geom.area, 0)

    def test_a_feature_far_outside_the_frame_is_dropped(self):
        square = Polygon([(FRAME.cx + 50000, FRAME.cy), (FRAME.cx + 50010, FRAME.cy),
                          (FRAME.cx + 50010, FRAME.cy + 10), (FRAME.cx + 50000, FRAME.cy + 10)])
        feature = Feature(id="a", geom=square, tags={}, area=True)
        self.assertEqual(fields.rotate_and_clip([feature], FRAME), [])

    def test_rotation_is_actually_applied(self):
        """A feature offset from centre must move under rotation -- this is
        the check that would have caught world.py's earlier rotation bug if
        it had been in the rotate step instead of the fetch-bbox step."""
        square = Polygon([(FRAME.cx + 500, FRAME.cy), (FRAME.cx + 510, FRAME.cy),
                          (FRAME.cx + 510, FRAME.cy + 10), (FRAME.cx + 500, FRAME.cy + 10)])
        feature = Feature(id="a", geom=square, tags={}, area=True)
        rotated_out = fields.rotate_and_clip([feature], FRAME)
        unrotated = Frame(id="u", center_lon=FRAME.center_lon, center_lat=FRAME.center_lat,
                          rotation_deg=0.0, extent_m=FRAME.extent_m, crs_epsg=FRAME.crs_epsg)
        unrotated_out = fields.rotate_and_clip([feature], unrotated)
        self.assertFalse(rotated_out[0].geom.equals(unrotated_out[0].geom))

    def test_ids_and_tags_survive_the_clip(self):
        square = Polygon([(FRAME.cx - 10, FRAME.cy - 10), (FRAME.cx + 10, FRAME.cy - 10),
                          (FRAME.cx + 10, FRAME.cy + 10), (FRAME.cx - 10, FRAME.cy + 10)])
        feature = Feature(id="keep-me", geom=square, tags={"building": "yes"},
                          area=True, height_m=12.0)
        out = fields.rotate_and_clip([feature], FRAME)
        self.assertEqual(out[0].id, "keep-me")
        self.assertEqual(out[0].tags, {"building": "yes"})
        self.assertEqual(out[0].height_m, 12.0)


class TestRotateAndClipPoints(unittest.TestCase):
    def test_point_inside_survives(self):
        pts = fields.rotate_and_clip_points([(FRAME.cx, FRAME.cy)], FRAME)
        self.assertEqual(len(pts), 1)

    def test_point_far_outside_dropped(self):
        pts = fields.rotate_and_clip_points([(FRAME.cx + 100000, FRAME.cy)], FRAME)
        self.assertEqual(pts, [])


class TestSeaDepthGradient(unittest.TestCase):
    def test_none_when_no_sea(self):
        self.assertIsNone(fields.sea_depth_gradient(None, FRAME, 900.0, 0.6))

    def test_zero_at_shore_rising_with_distance(self):
        half = FRAME.extent_m / 2
        sea = Polygon([(FRAME.cx, FRAME.cy - half), (FRAME.cx + half, FRAME.cy - half),
                       (FRAME.cx + half, FRAME.cy + half), (FRAME.cx, FRAME.cy + half)])
        depth_t = fields.sea_depth_gradient(sea, FRAME, falloff_m=500.0, gamma=1.0)
        self.assertIsNotNone(depth_t)
        n = depth_t.shape[0]
        # Near the shore (left edge of the sea half) should read low; far out
        # (right edge of the frame) should read high.
        near_shore = depth_t[n // 2, n // 2]
        far_out = depth_t[n // 2, n - 2]
        self.assertLess(near_shore, far_out)

    def test_land_side_is_exactly_zero(self):
        half = FRAME.extent_m / 2
        sea = Polygon([(FRAME.cx, FRAME.cy - half), (FRAME.cx + half, FRAME.cy - half),
                       (FRAME.cx + half, FRAME.cy + half), (FRAME.cx, FRAME.cy + half)])
        depth_t = fields.sea_depth_gradient(sea, FRAME, falloff_m=500.0, gamma=1.0)
        n = depth_t.shape[0]
        land_side = depth_t[n // 2, 2]
        self.assertEqual(land_side, 0.0)

    def test_gamma_curves_the_falloff(self):
        half = FRAME.extent_m / 2
        sea = Polygon([(FRAME.cx, FRAME.cy - half), (FRAME.cx + half, FRAME.cy - half),
                       (FRAME.cx + half, FRAME.cy + half), (FRAME.cx, FRAME.cy + half)])
        linear = fields.sea_depth_gradient(sea, FRAME, falloff_m=1000.0, gamma=1.0)
        curved = fields.sea_depth_gradient(sea, FRAME, falloff_m=1000.0, gamma=0.6)
        n = linear.shape[0]
        mid = linear.shape[0] // 2
        # gamma<1 pushes mid-distance values UP toward 1 faster than linear.
        self.assertGreater(curved[mid, mid + 5], linear[mid, mid + 5])


class TestCoastFadeT(unittest.TestCase):
    """fields.coast_fade_t: the LAND-side mirror of sea_depth_gradient above
    -- 2026-08-24 direct user request to fade bare terrain's colour toward
    a sand tone near the shore instead of an abrupt/jagged boundary."""

    def _half_frame_sea(self):
        half = FRAME.extent_m / 2
        return Polygon([(FRAME.cx, FRAME.cy - half), (FRAME.cx + half, FRAME.cy - half),
                        (FRAME.cx + half, FRAME.cy + half), (FRAME.cx, FRAME.cy + half)])

    def test_none_when_no_sea(self):
        self.assertIsNone(fields.coast_fade_t(None, FRAME, 700.0, 0.7))

    def test_zero_at_shore_rising_with_distance_inland(self):
        sea = self._half_frame_sea()
        fade_t = fields.coast_fade_t(sea, FRAME, fade_m=500.0, gamma=1.0)
        self.assertIsNotNone(fade_t)
        n = fade_t.shape[0]
        near_shore = fade_t[n // 2, n // 2 - 2]   # just on the land side of the shore
        far_inland = fade_t[n // 2, 2]             # far side of the frame, deep inland
        self.assertLess(near_shore, far_inland)

    def test_sea_side_is_exactly_zero(self):
        """The placeholder value for sea cells -- render_tile must not treat
        this as a real fade weight without re-masking by the real polygon
        (see its own coastal-fade section for why)."""
        sea = self._half_frame_sea()
        fade_t = fields.coast_fade_t(sea, FRAME, fade_m=500.0, gamma=1.0)
        n = fade_t.shape[0]
        sea_side = fade_t[n // 2, n // 2 + 2]
        self.assertEqual(sea_side, 0.0)

    def test_gamma_curves_the_falloff(self):
        sea = self._half_frame_sea()
        linear = fields.coast_fade_t(sea, FRAME, fade_m=1000.0, gamma=1.0)
        curved = fields.coast_fade_t(sea, FRAME, fade_m=1000.0, gamma=0.6)
        mid = linear.shape[0] // 2
        self.assertGreater(curved[mid, mid - 5], linear[mid, mid - 5])

    def test_far_enough_inland_reaches_full_fade(self):
        sea = self._half_frame_sea()
        fade_t = fields.coast_fade_t(sea, FRAME, fade_m=200.0, gamma=1.0)
        n = fade_t.shape[0]
        self.assertAlmostEqual(float(fade_t[n // 2, 0]), 1.0, places=2)


class TestBuildFieldsEndToEnd(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def _minimal_world(self):
        square = Polygon([(FRAME.cx - 10, FRAME.cy - 10), (FRAME.cx + 10, FRAME.cy - 10),
                          (FRAME.cx + 10, FRAME.cy + 10), (FRAME.cx - 10, FRAME.cy + 10)])
        feature = Feature(id="b1", geom=square, tags={"building": "yes"},
                          area=True, height_m=10.0)
        from citymap.parse import RoadGraph
        return World(features=[feature], road_graph=RoadGraph(), lamps=[],
                    sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)

    def test_shapes_and_types(self):
        from citymap.style import Style
        style = Style.from_file(os.path.join(
            os.path.dirname(__file__), "..", "..", "data", "map", "style", "kurose-1950s.json"))
        world = self._minimal_world()
        f = fields.build_fields(world, FRAME, self.tmp, style)
        self.assertEqual(f.elevation.shape, (FRAME.dem_grid, FRAME.dem_grid))
        self.assertEqual(f.shade_rgb.shape, (FRAME.dem_grid, FRAME.dem_grid, 3))
        self.assertEqual(len(f.features), 1)
        self.assertIsNone(f.sea_depth_t)
        # shadow_mul must be populated by the real build path -- it is
        # Optional/defaulted on the dataclass only so unit tests that build a
        # Fields() directly for unrelated assertions don't all need updating.
        self.assertIsNotNone(f.shadow_mul)
        self.assertEqual(f.shadow_mul.shape, (FRAME.dem_grid, FRAME.dem_grid, 3))


class TestSaveLoadRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_round_trip(self):
        square = Polygon([(FRAME.cx - 10, FRAME.cy - 10), (FRAME.cx + 10, FRAME.cy - 10),
                          (FRAME.cx + 10, FRAME.cy + 10), (FRAME.cx - 10, FRAME.cy + 10)])
        feature = Feature(id="b1", geom=square, tags={"building": "yes"},
                          area=True, height_m=10.0)
        elevation = np.random.default_rng(1).normal(20, 5, (16, 16)).astype(np.float32)
        shade = np.ones((16, 16, 3), dtype=np.float32) * 0.8
        depth_t = np.random.default_rng(2).random((8, 8)).astype(np.float32)

        original = fields.Fields(
            frame=FRAME, features=[feature], lamps=[Point(FRAME.cx, FRAME.cy)],
            elevation=elevation, shade_rgb=shade, sea_depth_t=depth_t,
            dem_tiles_fetched=3, dem_tiles_missing=1,
        )
        artifact = cache.Artifact(self.tmp, {"world": {"q": 1}, "frame": FRAME.cache_key_parts()})
        fields.save_fields(original, artifact)
        back = fields.load_fields(artifact, FRAME)

        self.assertEqual(len(back.features), 1)
        self.assertEqual(back.features[0].id, "b1")
        np.testing.assert_allclose(np.asarray(back.elevation), elevation)
        np.testing.assert_allclose(np.asarray(back.shade_rgb), shade)
        np.testing.assert_allclose(np.asarray(back.sea_depth_t), depth_t)
        self.assertEqual(back.dem_tiles_fetched, 3)
        self.assertEqual(back.dem_tiles_missing, 1)
        self.assertAlmostEqual(back.lamps[0].x, FRAME.cx, places=3)

    def test_no_sea_round_trips_as_none(self):
        elevation = np.zeros((8, 8), dtype=np.float32)
        shade = np.ones((8, 8, 3), dtype=np.float32)
        original = fields.Fields(frame=FRAME, features=[], lamps=[],
                                 elevation=elevation, shade_rgb=shade,
                                 sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        artifact = cache.Artifact(self.tmp, {"world": {"q": 2}, "frame": FRAME.cache_key_parts()})
        fields.save_fields(original, artifact)
        back = fields.load_fields(artifact, FRAME)
        self.assertIsNone(back.sea_depth_t)

    def test_shadow_mul_round_trips(self):
        elevation = np.zeros((8, 8), dtype=np.float32)
        shade = np.ones((8, 8, 3), dtype=np.float32)
        shadow_mul = np.full((8, 8, 3), 0.6, dtype=np.float32)
        original = fields.Fields(frame=FRAME, features=[], lamps=[],
                                 elevation=elevation, shade_rgb=shade,
                                 sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0,
                                 shadow_mul=shadow_mul)
        artifact = cache.Artifact(self.tmp, {"world": {"q": 3}, "frame": FRAME.cache_key_parts()})
        fields.save_fields(original, artifact)
        back = fields.load_fields(artifact, FRAME)
        np.testing.assert_allclose(np.asarray(back.shadow_mul), shadow_mul)

    def test_missing_shadow_mul_round_trips_as_none(self):
        """A Fields with no shadow_mul (e.g. built by an older test helper)
        must not error on save/load, and must NOT silently invent one."""
        elevation = np.zeros((8, 8), dtype=np.float32)
        shade = np.ones((8, 8, 3), dtype=np.float32)
        original = fields.Fields(frame=FRAME, features=[], lamps=[],
                                 elevation=elevation, shade_rgb=shade,
                                 sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        artifact = cache.Artifact(self.tmp, {"world": {"q": 4}, "frame": FRAME.cache_key_parts()})
        fields.save_fields(original, artifact)
        back = fields.load_fields(artifact, FRAME)
        self.assertIsNone(back.shadow_mul)


# rotation_deg=0 so map space == source space, which keeps the edit-polygon
# coordinates below directly interpretable as frame-relative metres.
FLAT_FRAME = Frame(id="flat", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
                   extent_m=1000.0, crs_epsg=6674, dem_grid=100)


def edit_square(cx, cy, half, target, blend_m=15.0, edit_id="e1"):
    from citymap.world import TerrainEdit
    poly = Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])
    return TerrainEdit(id=edit_id, polygon=poly, target_elevation_m=target, blend_m=blend_m)


class TestApplyTerrainEdits(unittest.TestCase):
    def make_sloped_elevation(self, n=100, low=0.0, high=100.0):
        # Elevation rises with array ROW (i.e. with map-space y, since row 0
        # = north edge and elevation increases going... this only needs to be
        # SOME real gradient, the exact direction doesn't matter for these
        # tests, only that it is non-constant.
        ramp = np.linspace(low, high, n, dtype=np.float32)
        return np.tile(ramp[:, None], (1, n))

    def test_no_edits_returns_elevation_unchanged(self):
        elevation = self.make_sloped_elevation()
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [])
        np.testing.assert_array_equal(out, elevation)

    def test_inside_the_polygon_is_flattened_to_target(self):
        elevation = self.make_sloped_elevation()
        cx, cy = FLAT_FRAME.cx, FLAT_FRAME.cy
        edit = edit_square(cx, cy, 60.0, target=250.0, blend_m=10.0)
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit])
        # Sample well inside the 120m-wide square (its own footprint, away
        # from the blend margin).
        n = elevation.shape[0]
        inside = np.asarray(fields.polygon_mask(edit.polygon, FLAT_FRAME.full_tile(px=n)), dtype=bool)
        self.assertTrue(np.allclose(out[inside], 250.0, atol=0.01))

    def test_far_outside_the_blend_zone_is_unchanged(self):
        elevation = self.make_sloped_elevation()
        cx, cy = FLAT_FRAME.cx, FLAT_FRAME.cy
        edit = edit_square(cx, cy, 20.0, target=999.0, blend_m=10.0)
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit])
        n = elevation.shape[0]
        tile = FLAT_FRAME.full_tile(px=n)
        corner_map = (FLAT_FRAME.origin[0] + 5, FLAT_FRAME.origin[1] + 5)  # far frame corner
        col, row = tile.to_px(*corner_map)
        row, col = int(row), int(col)
        self.assertAlmostEqual(float(out[row, col]), float(elevation[row, col]), places=3)

    def test_blend_zone_is_monotonic_between_target_and_original(self):
        elevation = np.full((100, 100), 10.0, dtype=np.float32)  # flat, so blend is easy to reason about
        cx, cy = FLAT_FRAME.cx, FLAT_FRAME.cy
        edit = edit_square(cx, cy, 40.0, target=50.0, blend_m=40.0)
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit])
        # Walk outward from the centre along +x in map space; values should
        # start at target (50), end at original (10), and never overshoot.
        samples = []
        tile = FLAT_FRAME.full_tile(px=100)
        for dx in (0, 30, 45, 60, 90, 150):
            px, py = tile.to_px(cx + dx, cy)
            samples.append(float(out[int(py), int(min(px, 99))]))
        self.assertAlmostEqual(samples[0], 50.0, delta=1.0)
        self.assertAlmostEqual(samples[-1], 10.0, delta=1.0)
        for a, b in zip(samples, samples[1:]):
            self.assertLessEqual(b, a + 1e-6)  # non-increasing as we move away from a raised pad

    def test_nan_inside_influence_becomes_target(self):
        elevation = self.make_sloped_elevation()
        cx, cy = FLAT_FRAME.cx, FLAT_FRAME.cy
        elevation[:, :] = np.where(elevation > 40, np.nan, elevation)  # blank out part of the field
        edit = edit_square(cx, cy, 30.0, target=77.0, blend_m=5.0)
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit])
        n = elevation.shape[0]
        inside = np.asarray(fields.polygon_mask(edit.polygon, FLAT_FRAME.full_tile(px=n)), dtype=bool)
        self.assertFalse(np.isnan(out[inside]).any())

    def test_nan_far_outside_stays_nan(self):
        elevation = np.full((100, 100), np.nan, dtype=np.float32)
        cx, cy = FLAT_FRAME.cx, FLAT_FRAME.cy
        edit = edit_square(cx, cy, 20.0, target=5.0, blend_m=10.0)
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit])
        tile = FLAT_FRAME.full_tile(px=100)
        px, py = tile.to_px(cx + 400, cy + 400)  # well outside the frame's own extent even
        px, py = min(int(px), 99), min(int(py), 99)
        self.assertTrue(np.isnan(out[py, px]))

    def test_multiple_edits_each_affect_only_their_own_area(self):
        elevation = self.make_sloped_elevation()
        cx, cy = FLAT_FRAME.cx, FLAT_FRAME.cy
        edit_a = edit_square(cx - 200, cy, 30.0, target=111.0, blend_m=5.0, edit_id="a")
        edit_b = edit_square(cx + 200, cy, 30.0, target=222.0, blend_m=5.0, edit_id="b")
        out = fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit_a, edit_b])
        n = elevation.shape[0]
        tile = FLAT_FRAME.full_tile(px=n)
        inside_a = np.asarray(fields.polygon_mask(edit_a.polygon, tile), dtype=bool)
        inside_b = np.asarray(fields.polygon_mask(edit_b.polygon, tile), dtype=bool)
        self.assertTrue(np.allclose(out[inside_a], 111.0, atol=0.01))
        self.assertTrue(np.allclose(out[inside_b], 222.0, atol=0.01))

    def test_input_array_is_not_mutated(self):
        elevation = self.make_sloped_elevation()
        original = elevation.copy()
        edit = edit_square(FLAT_FRAME.cx, FLAT_FRAME.cy, 30.0, target=500.0)
        fields.apply_terrain_edits(elevation, FLAT_FRAME, [edit])
        np.testing.assert_array_equal(elevation, original)


class TestQueryFeatures(unittest.TestCase):
    """Fields.query_features -- the STRtree-backed replacement for
    render.py's old per-tile linear scan (map-editor plan Phase 2). The
    property under test: identical results to a brute-force
    `.intersects()` scan, on cases a bbox-only check would get wrong.
    """

    def _linear_scan(self, feats, query_geom):
        """The exact behaviour being replaced, kept here as the reference
        implementation to compare against."""
        return [f for f in feats if f.geom is not None and not f.geom.is_empty
               and f.geom.intersects(query_geom)]

    def test_matches_brute_force_on_an_l_shape(self):
        """A bbox-only check would wrongly include a point sitting in an
        L-shaped polygon's notch -- its bbox covers the notch, the polygon
        itself does not. Verified directly against Shapely's STRtree before
        wiring this in (predicate='intersects' does the real geometric
        test, not just a bbox candidate filter)."""
        l_shape = Polygon([(0, 0), (10, 0), (10, 6), (6, 6), (6, 10), (0, 10)])
        f = Feature(id="L", geom=l_shape, tags={"building": "yes"}, area=True)
        fx = fields.Fields(frame=FRAME, features=[f], lamps=[],
                          elevation=np.zeros((4, 4), dtype=np.float32),
                          shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                          sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)

        in_notch = Point(8, 8).buffer(0.01)   # inside the L's bbox, not the L
        truly_inside = Point(3, 3).buffer(0.01)

        self.assertEqual(fx.query_features(in_notch), [])
        self.assertEqual(fx.query_features(truly_inside), [f])

    def test_none_and_empty_geometries_are_excluded_not_crashing(self):
        with_geom = Feature(id="a", geom=Point(5, 5).buffer(1), tags={}, area=True)
        no_geom = Feature(id="b", geom=None, tags={}, area=False)
        empty_geom = Feature(id="c", geom=Polygon(), tags={}, area=True)
        fx = fields.Fields(frame=FRAME, features=[with_geom, no_geom, empty_geom], lamps=[],
                          elevation=np.zeros((4, 4), dtype=np.float32),
                          shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                          sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        result = fx.query_features(Point(5, 5).buffer(5))
        self.assertEqual([f.id for f in result], ["a"])

    def test_matches_linear_scan_on_a_random_scattered_set(self):
        import random
        rng = random.Random(42)
        feats = []
        for i in range(200):
            cx, cy = rng.uniform(0, 1000), rng.uniform(0, 1000)
            r = rng.uniform(2, 40)
            geom = Point(cx, cy).buffer(r, quad_segs=4)  # octagon-ish, non-trivial shape
            feats.append(Feature(id=f"f{i}", geom=geom, tags={}, area=True))
        fx = fields.Fields(frame=FRAME, features=feats, lamps=[],
                          elevation=np.zeros((4, 4), dtype=np.float32),
                          shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                          sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)

        for _ in range(20):
            qx, qy = rng.uniform(0, 1000), rng.uniform(0, 1000)
            qr = rng.uniform(10, 100)
            query_geom = Point(qx, qy).buffer(qr, quad_segs=4)
            expected = {f.id for f in self._linear_scan(feats, query_geom)}
            got = {f.id for f in fx.query_features(query_geom)}
            self.assertEqual(got, expected, f"mismatch for query at ({qx:.1f},{qy:.1f}) r={qr:.1f}")

    def test_results_preserve_features_list_order(self):
        """render_tile's per-layer passes use `local_features`' order as the
        z-order for anything sharing a layer (module docstring: "drawing
        order matters") -- confirmed directly as a real, live bug building
        the procgen mech hangar: a small parking marking, listed AFTER its
        apron so it would draw on top, silently ended up rendering UNDER
        the apron instead, because raw STRtree.query() order depends on the
        packed tree's internal structure, not insertion order. Query a
        scattered set where that internal order provably differs from
        insertion order, and require the STABLE (insertion) order back."""
        import random
        rng = random.Random(7)
        feats = [Feature(id=f"f{i}", geom=Point(rng.uniform(0, 500), rng.uniform(0, 500)).buffer(15),
                         tags={}, area=True) for i in range(60)]
        fx = fields.Fields(frame=FRAME, features=feats, lamps=[],
                          elevation=np.zeros((4, 4), dtype=np.float32),
                          shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                          sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        result_ids = [f.id for f in fx.query_features(Point(250, 250).buffer(400))]
        expected_order = [f.id for f in feats if f.id in set(result_ids)]
        self.assertEqual(result_ids, expected_order)

    def test_relative_order_of_two_features_is_stable_as_unrelated_features_are_added(self):
        """The actual mechanism behind the hangar bug: two overlapping
        features (apron, then a marking meant to sit on top of it) keep
        their relative draw order even as more, spatially UNRELATED
        features are added to the same Fields -- adding them must not be
        able to reshuffle a tree traversal order that two unrelated
        features never asked to depend on."""
        base = Point(0, 0).buffer(50)
        top = Point(0, 0).buffer(10)
        under_feature = Feature(id="under", geom=base, tags={}, area=True)
        over_feature = Feature(id="over", geom=top, tags={}, area=True)

        for n_extra in (0, 1, 5, 20, 80):
            import random
            rng = random.Random(n_extra)
            extras = [Feature(id=f"extra{i}",
                              geom=Point(rng.uniform(1000, 5000), rng.uniform(1000, 5000)).buffer(20),
                              tags={}, area=True) for i in range(n_extra)]
            fx = fields.Fields(frame=FRAME, features=[under_feature, over_feature] + extras, lamps=[],
                              elevation=np.zeros((4, 4), dtype=np.float32),
                              shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                              sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
            result_ids = [f.id for f in fx.query_features(Point(0, 0).buffer(60))]
            self.assertEqual(result_ids, ["under", "over"],
                            f"relative order flipped with {n_extra} unrelated extra features present")

    def test_index_is_cached_across_calls(self):
        f = Feature(id="a", geom=Point(0, 0).buffer(1), tags={}, area=True)
        fx = fields.Fields(frame=FRAME, features=[f], lamps=[],
                          elevation=np.zeros((4, 4), dtype=np.float32),
                          shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                          sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        self.assertIsNone(fx._feature_tree)
        fx.query_features(Point(0, 0).buffer(5))
        first_tree = fx._feature_tree
        self.assertIsNotNone(first_tree)
        fx.query_features(Point(0, 0).buffer(5))
        self.assertIs(fx._feature_tree, first_tree, "a second query must reuse the cached index")

    def test_feature_tree_is_excluded_from_init(self):
        """The cache field must not change Fields' existing __init__
        contract -- every test file in this suite constructs Fields with
        keyword args and none of them pass _feature_tree; passing it
        explicitly must fail exactly like passing any other unknown kwarg
        would."""
        with self.assertRaises(TypeError):
            fields.Fields(frame=FRAME, features=[], lamps=[],
                         elevation=np.zeros((4, 4), dtype=np.float32),
                         shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                         sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0,
                         _feature_tree="not allowed")

    def test_feature_tree_field_metadata_is_init_false_and_compare_false(self):
        """Direct check on the dataclass field definition, rather than going
        through __eq__ -- Fields carries numpy-array fields (elevation,
        shade_rgb), and the dataclass-generated __eq__ already can't compare
        two real Fields instances at all (numpy raises on bool(array) inside
        the field-by-field comparison) independently of anything here, so
        this test does not attempt to exercise `==` on a Fields."""
        import dataclasses
        f = next(fld for fld in dataclasses.fields(fields.Fields) if fld.name == "_feature_tree")
        self.assertFalse(f.init)
        self.assertFalse(f.compare)


class TestQueryFeaturesAgainstRealData(unittest.TestCase):
    """The regression test the map-editor plan calls for explicitly:
    indexed local_features == old linear scan, same set, on real data --
    not just synthetic fixtures. Skips loudly if the real cache is cold
    (design/testing-strategy.md rule 5), matching test_parse.py/test_sea.py's
    established convention for real-cache-dependent tests."""

    @classmethod
    def setUpClass(cls):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        gpkg_path = os.path.join(repo_root, "data", "map", "kurose.gpkg")
        if not os.path.exists(gpkg_path):
            raise unittest.SkipTest(
                f"no real store at {gpkg_path} -- SKIPPING the real-data query_features "
                f"equivalence check (run citymap/store/import_osm.py once to create it). "
                f"The synthetic-data tests in TestQueryFeatures still run and still catch "
                f"a broken index.")
        from citymap.store.load import load_world_from_store
        real_frame = Frame.from_file(os.path.join(repo_root, "data", "map", "frames", "kurose-12km.json"))
        world = load_world_from_store(gpkg_path, crs_epsg=real_frame.crs_epsg)
        cls.map_features = fields.rotate_and_clip(world.features, real_frame)
        cls.frame = real_frame

    def _linear_scan(self, feats, query_geom):
        return [f for f in feats if f.geom is not None and not f.geom.is_empty
               and f.geom.intersects(query_geom)]

    def test_matches_linear_scan_on_several_real_windows(self):
        from shapely.geometry import box as shapely_box
        fx = fields.Fields(frame=self.frame, features=self.map_features, lamps=[],
                          elevation=np.zeros((4, 4), dtype=np.float32),
                          shade_rgb=np.zeros((4, 4, 3), dtype=np.float32),
                          sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        # Map-space is centred at (frame.cx, frame.cy), NOT the origin --
        # the frame's real extent spans [cx-half, cx+half] x [cy-half,
        # cy+half] (frame.py's own map_corners()). A handful of real windows
        # across the frame: centre, each quadrant, and several points along
        # a spiral out from the centre -- not every quadrant sample is
        # guaranteed to land on real content (open water, a frame-edge gap),
        # so the sanity check below is "at least one window found
        # something real", not "every individual window must".
        fcx, fcy = self.frame.cx, self.frame.cy
        half = self.frame.extent_m / 2
        windows = [(fcx, fcy, 400), (fcx + half * 0.5, fcy + half * 0.5, 400),
                  (fcx - half * 0.5, fcy + half * 0.5, 400),
                  (fcx + half * 0.5, fcy - half * 0.5, 400),
                  (fcx - half * 0.5, fcy - half * 0.5, 400)]
        windows += [(fcx + half * 0.15 * i, fcy + half * 0.15 * i, 800) for i in range(1, 6)]

        any_nonempty = False
        for cx, cy, extent in windows:
            query_box = shapely_box(cx - extent / 2, cy - extent / 2, cx + extent / 2, cy + extent / 2)
            expected = {f.id for f in self._linear_scan(self.map_features, query_box)}
            got = {f.id for f in fx.query_features(query_box)}
            self.assertEqual(got, expected, f"mismatch for window centred at ({cx:.0f},{cy:.0f})")
            any_nonempty = any_nonempty or len(expected) > 0
        self.assertTrue(any_nonempty, "sanity check: at least one real window must contain something")


class TestResyncTerrainFromStore(unittest.TestCase):
    """map-editor plan Phase 7's live-sync path. The load-bearing property
    is the LAST test below: rebuilding from raw DEM + the store's CURRENT
    full edit list (never incrementally patching in-memory state) is what
    makes this correct for UNDO, not just for adding a new edit -- Fields
    never keeps the pre-edit elevation around, so an incremental "subtract
    this one edit's effect" has no correct implementation."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.dem_cache = os.path.join(self.tmp, "dem")
        self.store_path = os.path.join(self.tmp, "test.gpkg")

        from citymap.store import gpkg as gpkg_module
        from citymap.style import Style
        self.gpkg_module = gpkg_module
        self.style = Style.from_file(os.path.join(
            os.path.dirname(__file__), "..", "..", "data", "map", "style", "kurose-1950s.json"))

        conn = gpkg_module.create_store(self.store_path)
        conn.commit()
        conn.close()

        from citymap.parse import RoadGraph
        world = World(features=[], road_graph=RoadGraph(), lamps=[],
                     sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)
        self.fields = fields.build_fields(world, FRAME, self.dem_cache, self.style)

    def test_shapes_after_resync_with_no_edits_at_all(self):
        self.fields.resync_terrain_from_store(self.store_path, self.dem_cache, self.style)
        self.assertEqual(self.fields.elevation.shape, (FRAME.dem_grid, FRAME.dem_grid))
        self.assertEqual(self.fields.shade_rgb.shape, (FRAME.dem_grid, FRAME.dem_grid, 3))
        self.assertEqual(self.fields.shadow_mul.shape, (FRAME.dem_grid, FRAME.dem_grid, 3))

    def test_a_stored_terrain_edit_is_reflected_in_the_resynced_elevation(self):
        platform = Polygon([(FRAME.cx - 200, FRAME.cy - 200), (FRAME.cx + 200, FRAME.cy - 200),
                            (FRAME.cx + 200, FRAME.cy + 200), (FRAME.cx - 200, FRAME.cy + 200)])
        conn = self.gpkg_module.connect(self.store_path)
        self.gpkg_module.insert_terrain_edit(conn, id="te1", geom=platform, target_elevation_m=999.0,
                                            blend_m=10.0, stack_order=0, log=False)
        conn.commit()
        conn.close()

        self.fields.resync_terrain_from_store(self.store_path, self.dem_cache, self.style)

        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.fields.elevation[center, center]), 999.0, delta=0.5)

    def test_undo_shaped_removal_of_an_edit_is_reflected_correctly(self):
        """The property that actually matters: resync after REMOVING a row
        from the store (exactly what gpkg.undo_last_change's insert-
        reversal does) must produce elevation as if that edit never
        existed -- not a stale value left over from having applied it once
        already in memory."""
        platform = Polygon([(FRAME.cx - 200, FRAME.cy - 200), (FRAME.cx + 200, FRAME.cy - 200),
                            (FRAME.cx + 200, FRAME.cy + 200), (FRAME.cx - 200, FRAME.cy + 200)])
        conn = self.gpkg_module.connect(self.store_path)
        self.gpkg_module.insert_terrain_edit(conn, id="te1", geom=platform, target_elevation_m=999.0,
                                            blend_m=10.0, stack_order=0, log=False)
        conn.commit()
        conn.close()

        self.fields.resync_terrain_from_store(self.store_path, self.dem_cache, self.style)
        n = FRAME.dem_grid
        center = n // 2
        self.assertAlmostEqual(float(self.fields.elevation[center, center]), 999.0, delta=0.5)

        # Remove the row -- the same store-level effect undo_last_change's
        # insert-reversal produces.
        conn = self.gpkg_module.connect(self.store_path)
        self.gpkg_module.delete_terrain_edit(conn, "te1", log=False)
        conn.commit()
        conn.close()

        self.fields.resync_terrain_from_store(self.store_path, self.dem_cache, self.style)
        restored_value = float(self.fields.elevation[center, center])
        self.assertNotAlmostEqual(restored_value, 999.0, delta=0.5)


if __name__ == "__main__":
    unittest.main()
