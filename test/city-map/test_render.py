"""render_tile tests, built on hand-crafted Fields (no network, deterministic).

Priority is the properties that were REAL bugs in the delivered render:
hole-aware sea fill, correct shadow direction, landuse not flattening relief,
and bridge-over-building z-order. Each is checked in PIXELS, the same way
test_draw.py checks the hole-fill regression -- a geometry-only assertion
would have passed against several of the bugs this session actually found.
"""

import math
import os
import sys
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap import contour, render  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.style import Style  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674, dem_grid=16)


def flat_fields(features, lamps=None, sea_geom=None, dem_grid=16,
                elevation_value=10.0, direct_ok=1.0) -> Fields:
    """A Fields object over perfectly flat, fully-lit terrain -- isolates
    whatever a test wants to check from any real hillshade variation."""
    elevation = np.full((dem_grid, dem_grid), elevation_value, dtype=np.float32)
    shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
    depth_t = None
    if sea_geom is not None:
        from citymap.fields import sea_depth_gradient
        depth_t = sea_depth_gradient(sea_geom, FRAME, falloff_m=300.0, gamma=0.6)
        features = list(features) + [Feature(id="sea", geom=sea_geom,
                                             tags={"__sea__": "true"}, area=True)]
    return Fields(frame=FRAME, features=features, lamps=lamps or [],
                 elevation=elevation, shade_rgb=shade, sea_depth_t=depth_t,
                 dem_tiles_fetched=0, dem_tiles_missing=0)


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


def expected_building_fill(feature_id, height_m):
    """Mirrors render_tile's own formula for a building with no
    building:material tag EXACTLY (low -> per-feature-id seeded roof colour,
    blended 0.55-0.90 by height -- see render._building_roof_colour and the
    BUILDING_ROOF_BLEND_MIN/MAX comment in render_tile) -- the shared source
    of truth for every test that needs to predict an unmaterialed
    building's fill."""
    low = STYLE.colour("buildingLow")
    roof = render._building_roof_colour(feature_id, STYLE.building_roof_palette())
    height_k = min(1.0, height_m / 55.0)
    blend = 0.55 + 0.35 * height_k
    return tuple(int(low[i] + (roof[i] - low[i]) * blend) for i in range(3))


class TestCoastalFade(unittest.TestCase):
    """render_tile's coastal land fade -- 2026-08-24 direct user request:
    bare terrain blends toward palette.coastFade near the shore instead of
    an abrupt/jagged boundary. Landuse-tagged areas (sand, aerodrome, ...)
    and the sea itself must be completely unaffected -- 'the tan colour is
    fine for buildings near the ocean', the user's own words."""

    def _sea_and_fade(self, sea_geom, fade_m=400.0):
        from citymap import fields as fields_module
        depth_t = fields_module.sea_depth_gradient(sea_geom, FRAME, falloff_m=300.0, gamma=0.6)
        fade_t = fields_module.coast_fade_t(sea_geom, FRAME, fade_m=fade_m, gamma=1.0)
        return depth_t, fade_t

    def test_bare_ground_shifts_toward_coast_fade_near_the_shore(self):
        cx, cy = FRAME.cx, FRAME.cy
        sea = Polygon([(cx + 200, cy - 500), (cx + 500, cy - 500),
                      (cx + 500, cy + 500), (cx + 200, cy + 500)])
        depth_t, fade_t = self._sea_and_fade(sea)
        elevation = np.full((16, 16), 10.0, dtype=np.float32)
        shade = np.ones((16, 16, 3), dtype=np.float32)
        sea_feature = Feature(id="sea", geom=sea, tags={"__sea__": "true"}, area=True)
        f = Fields(frame=FRAME, features=[sea_feature], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=depth_t, dem_tiles_fetched=0, dem_tiles_missing=0,
                  coast_fade_t=fade_t)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        paper = STYLE.colour("paper")
        target = np.asarray(STYLE.colour("coastFade"), dtype=np.float32)
        x_near, y_near = tile.to_px(cx + 190, cy)   # bare ground, right at the shore
        x_far, y_far = tile.to_px(cx - 490, cy)     # bare ground, far inland
        near_px = np.asarray(img.getpixel((int(x_near), int(y_near))), dtype=np.float32)
        far_px = np.asarray(img.getpixel((int(x_far), int(y_far))), dtype=np.float32)

        self.assertLess(np.abs(near_px - target).sum(), np.abs(far_px - target).sum(),
                        "near-shore bare ground must read closer to coastFade than far-inland ground")
        self.assertAlmostEqual(float(sum(far_px)), float(sum(paper)), delta=2,
                               msg="far enough inland, bare ground must be untouched by the fade")

    def test_landuse_tagged_ground_is_unaffected_by_the_fade(self):
        """The user's explicit carve-out: an already-tagged area near the
        ocean keeps its own colour untouched."""
        cx, cy = FRAME.cx, FRAME.cy
        sea = Polygon([(cx + 200, cy - 500), (cx + 500, cy - 500),
                      (cx + 500, cy + 500), (cx + 200, cy + 500)])
        depth_t, fade_t = self._sea_and_fade(sea)
        sand = Feature(id="beach", geom=square(cx + 150, cy, 40),
                      tags={"natural": "sand"}, area=True)  # right at the shore
        elevation = np.full((16, 16), 10.0, dtype=np.float32)
        shade = np.ones((16, 16, 3), dtype=np.float32)
        sea_feature = Feature(id="sea", geom=sea, tags={"__sea__": "true"}, area=True)
        f = Fields(frame=FRAME, features=[sand, sea_feature], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=depth_t, dem_tiles_fetched=0, dem_tiles_missing=0,
                  coast_fade_t=fade_t)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        x, y = tile.to_px(cx + 150, cy)
        pixel = img.getpixel((int(x), int(y)))
        expected = STYLE.landuse_colour("sand")  # the plain tint, no fade blended in
        self.assertEqual(tuple(pixel), tuple(expected))

    def test_sea_itself_is_unaffected_by_the_fade(self):
        """The placeholder 0.0 fade_t value for sea cells must not leak
        through as 'maximum blend' and re-tint water that the sea section
        already rendered correctly."""
        cx, cy = FRAME.cx, FRAME.cy
        sea = Polygon([(cx + 200, cy - 500), (cx + 500, cy - 500),
                      (cx + 500, cy + 500), (cx + 200, cy + 500)])
        depth_t, fade_t = self._sea_and_fade(sea)
        elevation = np.full((16, 16), 10.0, dtype=np.float32)
        shade = np.ones((16, 16, 3), dtype=np.float32)
        sea_feature = Feature(id="sea", geom=sea, tags={"__sea__": "true"}, area=True)
        f = Fields(frame=FRAME, features=[sea_feature], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=depth_t, dem_tiles_fetched=0, dem_tiles_missing=0,
                  coast_fade_t=fade_t)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        # well out to sea -- must read as sea colour, not a coastFade-tinted blend
        x, y = tile.to_px(cx + 480, cy)
        pixel = np.asarray(img.getpixel((int(x), int(y))), dtype=np.float32)
        coast_fade = np.asarray(STYLE.colour("coastFade"), dtype=np.float32)
        sea_shallow = np.asarray(STYLE.colour("seaShallow"), dtype=np.float32)
        self.assertLess(np.abs(pixel - sea_shallow).sum(), np.abs(pixel - coast_fade).sum(),
                        "open sea must read as sea colour, not tinted toward coastFade")

    def test_missing_coast_fade_t_is_a_no_op(self):
        """Fields built without coast_fade_t (e.g. an older test helper, no
        sea at all in the frame) must render, not crash."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 60), tags={"building": "yes"},
                           area=True, height_m=10.0)
        f = flat_fields([building])   # coast_fade_t defaults to None
        self.assertIsNone(f.coast_fade_t)
        tile = FRAME.full_tile(px=200)
        img = render.render_tile(f, STYLE, tile)  # must not raise
        self.assertIsNotNone(img)


class TestSeaHoleAware(unittest.TestCase):
    """The bug that put Kobe Airport underwater, checked end-to-end here."""

    def test_an_island_hole_in_the_sea_reads_as_land_colour(self):
        cx, cy = FRAME.cx, FRAME.cy
        sea = Polygon(
            [(cx - 400, cy - 400), (cx + 400, cy - 400), (cx + 400, cy + 400), (cx - 400, cy + 400)],
            [[(cx - 100, cy - 100), (cx + 100, cy - 100), (cx + 100, cy + 100), (cx - 100, cy + 100)]],
        )
        f = flat_fields([], sea_geom=sea)
        tile = FRAME.full_tile(px=200)
        img = render.render_tile(f, STYLE, tile)
        centre = img.getpixel((100, 100))
        self.assertNotEqual(centre, STYLE.colour("seaShallow"))
        self.assertNotEqual(centre, STYLE.colour("seaDeep"))

    def test_the_sea_around_the_island_is_still_sea(self):
        cx, cy = FRAME.cx, FRAME.cy
        sea = Polygon(
            [(cx - 400, cy - 400), (cx + 400, cy - 400), (cx + 400, cy + 400), (cx - 400, cy + 400)],
            [[(cx - 100, cy - 100), (cx + 100, cy - 100), (cx + 100, cy + 100), (cx - 100, cy + 100)]],
        )
        f = flat_fields([], sea_geom=sea)
        tile = FRAME.full_tile(px=200)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx + 300, cy)
        edge_pixel = img.getpixel((int(x), int(y)))
        shallow = np.array(STYLE.colour("seaShallow"), dtype=np.int32)
        self.assertLess(np.abs(np.array(edge_pixel, dtype=np.int32) - shallow).max(), 60,
                        "open water away from the island must read close to sea colour")


class TestBridgeOverBuilding(unittest.TestCase):
    """A bridge must render ON TOP of a building it crosses, per the
    2026-08-23 z-order fix."""

    def test_bridge_deck_colour_wins_over_the_building(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=15.0)
        bridge = Feature(id="br1", geom=LineString([(cx - 150, cy), (cx + 150, cy)]),
                         tags={"highway": "primary", "bridge": "yes"}, area=False)
        f = flat_fields([building, bridge])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        x, y = tile.to_px(cx, cy)   # dead centre: under the building, on the bridge
        pixel = img.getpixel((int(x), int(y)))
        building_low = STYLE.colour("buildingLow")
        # The bridge deck tone is a warm near-white (238-246 range); the plain
        # building fill is a cool grey (STYLE.buildingLow). They must not match.
        self.assertNotEqual(pixel, building_low)
        self.assertGreater(sum(pixel), sum(building_low),
                           "the bridge deck (near-white) must be visible, not the grey building")

    def test_without_the_bridge_tag_the_road_goes_under(self):
        """Control case: an ordinary (non-bridge) road crossing a building
        must NOT win -- confirms the z-order fix is keyed on bridge=yes, not
        just "any road crosses a building"."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=15.0)
        at_grade = Feature(id="r1", geom=LineString([(cx - 150, cy), (cx + 150, cy)]),
                           tags={"highway": "primary"}, area=False)
        f = flat_fields([building, at_grade])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        pixel = img.getpixel((int(x), int(y)))
        # Height-graded, not flat buildingLow -- height_m=15 interpolates
        # toward this building's own seeded roof colour (render.py's
        # `k = height_m / 55.0`, see expected_building_fill).
        self.assertEqual(pixel, expected_building_fill("b1", 15.0),
                         "an at-grade road must render UNDER the building, not over it")


class TestRiverAboveContours(unittest.TestCase):
    """River lines must draw ON TOP of contour lines, not under them -- a
    river drawn under the contour layer gets visually cut into dashes by
    every contour stroke crossing it (2026-08-24 fix, from the user's own
    map review: "River lines should be rendered ABOVE the contour lines")."""

    def _ramp_fields(self, river):
        dem_grid = 16
        # Elevation varies by COLUMN ONLY, so every contour line is a
        # perfectly straight vertical line spanning the full tile height --
        # a horizontal river is then guaranteed to cross every one of them.
        col_vals = np.linspace(0.0, 150.0, dem_grid, dtype=np.float32)
        elevation = np.tile(col_vals, (dem_grid, 1))
        shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
        return Fields(frame=FRAME, features=[river], lamps=[],
                     elevation=elevation, shade_rgb=shade, sea_depth_t=None,
                     dem_tiles_fetched=0, dem_tiles_missing=0)

    def test_river_pixels_are_never_overpainted_by_a_crossing_contour(self):
        cx, cy = FRAME.cx, FRAME.cy
        river = Feature(id="riv1", geom=LineString([(cx - 600, cy), (cx + 600, cy)]),
                        tags={"waterway": "river"}, area=False)
        f = self._ramp_fields(river)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        _, y = tile.to_px(cx, cy)
        row = [img.getpixel((x, int(round(y)))) for x in range(tile.px)]

        contour_major = STYLE.colour("contourIndex")
        contour_minor = STYLE.colour("contourMinor")
        water = STYLE.colour("water")

        self.assertIn(water, row, "sanity check -- the river itself must actually be drawn")
        self.assertNotIn(contour_major, row,
                         "a major contour crossed the river and painted over it -- "
                         "rivers must draw AFTER (above) contours")
        self.assertNotIn(contour_minor, row,
                         "a minor contour crossed the river and painted over it -- "
                         "rivers must draw AFTER (above) contours")


def _measure_stroke_width_px(img, tile, point, direction, colour, max_scan_px=60):
    """Perpendicular stroke width in pixels at `point` (map coords), for a
    line locally running in `direction` (a map-space vector, need not be
    unit) -- scans outward from the centre pixel along the perpendicular
    until `colour` stops matching, in both directions. Orientation- and
    scale-correct: the perpendicular is derived by converting a second
    nearby map-space point through `tile.to_px` rather than assuming
    map-space and pixel-space units coincide.
    """
    dx, dy = direction
    length = math.hypot(dx, dy)
    perp = (-dy / length, dx / length)

    cx_m, cy_m = point
    cx_px, cy_px = tile.to_px(cx_m, cy_m)
    step_px_x, step_px_y = tile.to_px(cx_m + perp[0], cy_m + perp[1])
    step_dx, step_dy = step_px_x - cx_px, step_px_y - cy_px
    step_len = math.hypot(step_dx, step_dy)
    step_dx, step_dy = step_dx / step_len, step_dy / step_len

    def matches(px, py):
        x, y = int(round(px)), int(round(py))
        if x < 0 or y < 0 or x >= tile.px or y >= tile.px:
            return False
        return img.getpixel((x, y)) == colour

    count = 1 if matches(cx_px, cy_px) else 0
    for sign in (1, -1):
        step = 1
        while step <= max_scan_px:
            if not matches(cx_px + step_dx * sign * step, cy_px + step_dy * sign * step):
                break
            count += 1
            step += 1
    return count


class TestRiverTapersAtConfluence(unittest.TestCase):
    """End-to-end pixel proof of rivers.py: the reach downstream of a real
    confluence must render visibly WIDER than either headwater feeding it
    (2026-08-24, from the user's own request: "Make river lines branch in a
    way that means they taper at their sources and get wider as they
    combine")."""

    def test_downstream_reach_is_wider_than_a_headwater(self):
        cx, cy = FRAME.cx, FRAME.cy
        left = Feature(id="left", geom=LineString([(cx - 300, cy + 300), (cx, cy)]),
                       tags={"waterway": "river"}, area=False)
        right = Feature(id="right", geom=LineString([(cx + 300, cy + 300), (cx, cy)]),
                        tags={"waterway": "river"}, area=False)
        downstream = Feature(id="downstream", geom=LineString([(cx, cy), (cx, cy - 300)]),
                             tags={"waterway": "river"}, area=False)
        f = flat_fields([left, right, downstream])
        tile = FRAME.full_tile(px=1000)
        img = render.render_tile(f, STYLE, tile)
        water = STYLE.colour("water")

        headwater_px = _measure_stroke_width_px(
            img, tile, (cx - 150, cy + 150), (300, -300), water)
        downstream_px = _measure_stroke_width_px(
            img, tile, (cx, cy - 150), (0, -300), water)

        self.assertGreater(downstream_px, headwater_px,
                           "the reach below a confluence must render wider than "
                           "either branch feeding it")


def sloped_shade_fields(features, lamps=None, dem_grid=16) -> Fields:
    """Fields with a REAL shading gradient (unlike flat_fields, which
    deliberately uses shade=1.0/shadow_mul=1.0 everywhere to isolate other
    checks from it). Both shade_rgb (ground/landuse) and shadow_mul
    (roads/buildings -- see render.py's module docstring for why these are
    two separate arrays) carry the SAME dark-at-low-x-bright-at-high-x ramp
    here, so a road/building darkness comparison exercises shadow_mul (the
    array they actually read) while still being called "hillshade" for the
    test names that predate the shadow_mul split. Elevation stays flat --
    only the LIGHTING arrays vary, so any colour difference between two
    identically-tagged features at different x is attributable to the ramp
    alone."""
    elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
    ramp = np.linspace(0.3, 1.0, dem_grid, dtype=np.float32)
    shade = np.tile(ramp[None, :, None], (dem_grid, 1, 3)).astype(np.float32)
    return Fields(frame=FRAME, features=features, lamps=lamps or [],
                 elevation=elevation, shade_rgb=shade, sea_depth_t=None,
                 dem_tiles_fetched=0, dem_tiles_missing=0, shadow_mul=shade.copy())


class TestHillshadeAffectsRoadsAndBuildings(unittest.TestCase):
    """2026-08-24, from a direct user report: hillshade darkened bare ground
    but roads and buildings drew as flat colour cutouts on top of it,
    completely ignoring the terrain shading they were sitting on."""

    def test_a_road_is_darker_on_the_shaded_side_of_the_frame(self):
        cx, cy = FRAME.cx, FRAME.cy
        dark_road = Feature(id="dark", geom=LineString([(cx - 480, cy - 5), (cx - 480, cy + 5)]),
                            tags={"highway": "primary"}, area=False)
        bright_road = Feature(id="bright", geom=LineString([(cx + 480, cy - 5), (cx + 480, cy + 5)]),
                              tags={"highway": "primary"}, area=False)
        f = sloped_shade_fields([dark_road, bright_road])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        xd, yd = tile.to_px(cx - 480, cy)
        xb, yb = tile.to_px(cx + 480, cy)
        dark_px = sum(img.getpixel((int(xd), int(yd))))
        bright_px = sum(img.getpixel((int(xb), int(yb))))
        self.assertLess(dark_px, bright_px,
                        "the same road class must read darker under weaker hillshade")

    def test_a_building_is_darker_on_the_shaded_side_of_the_frame(self):
        cx, cy = FRAME.cx, FRAME.cy
        dark_b = Feature(id="dark", geom=square(cx - 480, cy, 15), tags={"building": "yes"},
                         area=True, height_m=6.0)
        bright_b = Feature(id="bright", geom=square(cx + 480, cy, 15), tags={"building": "yes"},
                           area=True, height_m=6.0)
        f = sloped_shade_fields([dark_b, bright_b])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        xd, yd = tile.to_px(cx - 480, cy)
        xb, yb = tile.to_px(cx + 480, cy)
        dark_px = sum(img.getpixel((int(xd), int(yd))))
        bright_px = sum(img.getpixel((int(xb), int(yb))))
        self.assertLess(dark_px, bright_px,
                        "the same building must read darker under weaker hillshade")

    def test_building_fill_still_matches_the_height_graded_formula_under_full_light(self):
        """Regression guard: at shade=1.0 (flat_fields), hillshade-tinting
        must be a true no-op -- the fill must still be exactly the plain
        height-graded colour every other building test assumes."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 30), tags={"building": "yes"},
                           area=True, height_m=20.0)
        f = flat_fields([building])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y))), expected_building_fill("b1", 20.0))

    def test_buildings_and_roads_ignore_shade_rgb_when_shadow_mul_is_neutral(self):
        """THE regression (2026-08-24, direct user report): 'buildings and
        roads have a layering issue... everything becomes brown.' Buildings
        and roads previously read the same tinted, facing-dimmed shade_rgb
        the ground uses -- a hillside merely ORIENTED away from the sun (no
        real cast shadow at all) darkened and warm/brown-tinted every
        building and road on it in lockstep with the bare earth, wiping out
        their own colours over areas spanning many blocks. They must now
        read shadow_mul (neutral, occlusion-only) instead: with shadow_mul
        held neutral, a building/road must render IDENTICALLY regardless of
        what shade_rgb's ground gradient is doing right underneath it."""
        cx, cy = FRAME.cx, FRAME.cy
        # Same building:material tag on both -- an explicit material is a
        # flat colour (see TestBuildingMaterial), so this isolates the test
        # from render._building_roof_colour's per-FEATURE-ID variation
        # (added 2026-08-24, same day, for CANOPY_LANDUSE_KEYS's neighbour
        # feature) -- two DIFFERENT feature ids at the same height would
        # otherwise legitimately get two different (and still shadow_mul-
        # correct) roof colours, breaking this equality assertion for a
        # reason unrelated to what this test actually checks.
        material_tags = {"building": "yes", render.BUILDING_MATERIAL_TAG: "concrete"}
        dark_side_b = Feature(id="dark-b", geom=square(cx - 480, cy, 15),
                              tags=material_tags, area=True, height_m=6.0)
        bright_side_b = Feature(id="bright-b", geom=square(cx + 480, cy, 15),
                                tags=material_tags, area=True, height_m=6.0)
        dark_side_r = Feature(id="dark-r", geom=LineString([(cx - 480, cy + 60), (cx - 480, cy + 70)]),
                              tags={"highway": "primary"}, area=False)
        bright_side_r = Feature(id="bright-r", geom=LineString([(cx + 480, cy + 60), (cx + 480, cy + 70)]),
                                tags={"highway": "primary"}, area=False)

        elevation = np.full((16, 16), 10.0, dtype=np.float32)
        ramp = np.linspace(0.3, 1.0, 16, dtype=np.float32)  # a real ground gradient...
        shade = np.tile(ramp[None, :, None], (16, 1, 3)).astype(np.float32)
        shadow_mul = np.ones((16, 16, 3), dtype=np.float32)  # ...but no real cast shadow anywhere
        f = Fields(frame=FRAME, features=[dark_side_b, bright_side_b, dark_side_r, bright_side_r],
                  lamps=[], elevation=elevation, shade_rgb=shade, sea_depth_t=None,
                  dem_tiles_fetched=0, dem_tiles_missing=0, shadow_mul=shadow_mul)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        xd, yd = tile.to_px(cx - 480, cy)
        xb, yb = tile.to_px(cx + 480, cy)
        self.assertEqual(img.getpixel((int(xd), int(yd))), img.getpixel((int(xb), int(yb))),
                         "buildings must ignore shade_rgb's ground gradient when shadow_mul "
                         "is neutral -- if this fails, buildings are reading shade_rgb again")

        xdr, ydr = tile.to_px(cx - 480, cy + 65)
        xbr, ybr = tile.to_px(cx + 480, cy + 65)
        self.assertEqual(img.getpixel((int(xdr), int(ydr))), img.getpixel((int(xbr), int(ybr))),
                         "roads must ignore shade_rgb's ground gradient when shadow_mul "
                         "is neutral -- if this fails, roads are reading shade_rgb again")


class TestBuildingShadowsOtherBuildings(unittest.TestCase):
    """2026-08-24, the other half of the same user report: a building's cast
    shadow was silently erased by every building drawn afterward, including
    the very buildings it should have darkened."""

    def _caster_and_neighbour(self):
        """The neighbour must sit in the shadow's EXTENDED tail, clear of the
        caster's own footprint -- the swept polygon's bounding-box centre is
        NOT safe to use, since shadow_sweep's Minkowski sum includes the
        original polygon (see its docstring), so a small offset leaves the
        bbox centre still mostly covering the caster's own square. Placed
        instead by walking straight out along the light direction from the
        caster's centre, past its corner (half-diagonal) plus most of the
        shadow's own extra reach."""
        cx, cy = FRAME.cx, FRAME.cy
        half = 40.0
        caster_geom = square(cx, cy, half)
        dx, dy, _ = render._light_shadow_vector(FRAME)
        off = half * float(STYLE.shadow.get("buildingHeightScale", 0.55))
        past_corner = half * 2 ** 0.5  # centre -> corner, along the diagonal
        d = past_corner + off * 0.6
        neighbour_geom = square(cx + dx * d, cy + dy * d, 5)

        from citymap import geometry
        swept = geometry.shadow_sweep(caster_geom, dx * off, dy * off)
        self_excluded = swept.difference(caster_geom)
        self.assertTrue(self_excluded.contains(neighbour_geom.centroid),
                        "fixture sanity check -- neighbour must sit in the shadow's "
                        "extended tail, outside the caster's own footprint")

        caster = Feature(id="caster", geom=caster_geom, tags={"building": "yes"},
                         area=True, height_m=40.0)
        neighbour = Feature(id="neighbour", geom=neighbour_geom, tags={"building": "yes"},
                            area=True, height_m=3.0)
        return caster, neighbour, neighbour_geom

    def test_a_neighbouring_building_is_darkened_by_a_cast_shadow(self):
        caster, neighbour, neighbour_geom = self._caster_and_neighbour()
        tile = FRAME.full_tile(px=1000)
        x, y = tile.to_px(neighbour_geom.centroid.x, neighbour_geom.centroid.y)

        control = render.render_tile(flat_fields([neighbour]), STYLE, tile)
        test = render.render_tile(flat_fields([caster, neighbour]), STYLE, tile)

        control_px = control.getpixel((int(x), int(y)))
        test_px = test.getpixel((int(x), int(y)))
        self.assertNotEqual(control_px, test_px,
                           "a neighbouring building's cast shadow must darken this building")
        self.assertLess(sum(test_px), sum(control_px))

    def test_a_building_does_not_darken_itself(self):
        """The self-exclusion: a lone building's own colour must be exactly
        the plain height-graded fill, never dimmed by the shadow it casts."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 30), tags={"building": "yes"},
                           area=True, height_m=45.0)  # tall -- a big self-shadow if unexcluded
        f = flat_fields([building])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y))), expected_building_fill("b1", 45.0))

    def test_road_is_still_darkened_by_a_cast_shadow_after_the_reorder(self):
        """Regression guard: roads moving into a separate hillshade buffer
        must not lose the ALREADY-correct cast-shadow-on-roads behaviour."""
        cx, cy = FRAME.cx, FRAME.cy
        caster_geom = square(cx, cy, 40)
        dx, dy, _ = render._light_shadow_vector(FRAME)
        off = 40.0 * float(STYLE.shadow.get("buildingHeightScale", 0.55))
        from citymap import geometry
        swept = geometry.shadow_sweep(caster_geom, dx * off, dy * off)
        minx, miny, maxx, maxy = swept.bounds
        road_y = (miny + maxy) / 2
        road = Feature(id="r1", geom=LineString([(minx - 50, road_y), (maxx + 50, road_y)]),
                      tags={"highway": "primary"}, area=False)
        caster = Feature(id="caster", geom=caster_geom, tags={"building": "yes"}, area=True, height_m=40.0)

        tile = FRAME.full_tile(px=1000)
        x_out, y_out = tile.to_px(minx - 40, road_y)
        x_in, y_in = tile.to_px((minx + maxx) / 2, road_y)

        img = render.render_tile(flat_fields([caster, road]), STYLE, tile)
        outside_shadow = img.getpixel((int(x_out), int(y_out)))
        inside_shadow = img.getpixel((int(x_in), int(y_in)))
        self.assertLess(sum(inside_shadow), sum(outside_shadow),
                        "the road inside the caster's shadow must still read darker")


class TestShadowDirection(unittest.TestCase):
    def test_building_shadow_falls_on_the_correct_side(self):
        """Cheap end-to-end check of the direction the whole pipeline agreed
        on after the terrain.py shadow-direction regression fix: the shadow
        must fall on the same side the light vector implies, not the
        opposite one."""
        from citymap import terrain
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 30), tags={"building": "yes"},
                           area=True, height_m=40.0)  # tall, for a long shadow
        f = flat_fields([building])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)

        dx, dy, _ = terrain.light_vector(FRAME.light_azimuth_deg,
                                         FRAME.light_altitude_deg, FRAME.rotation_deg)
        shadow_side = tile.to_px(cx + dx * 60, cy + dy * 60)
        opposite_side = tile.to_px(cx - dx * 60, cy - dy * 60)

        paper = np.array(STYLE.colour("paper"), dtype=np.int32)
        shadow_px = np.array(img.getpixel((int(shadow_side[0]), int(shadow_side[1]))), dtype=np.int32)
        opposite_px = np.array(img.getpixel((int(opposite_side[0]), int(opposite_side[1]))), dtype=np.int32)

        shadow_darkness = np.abs(shadow_px - paper).sum()
        opposite_darkness = np.abs(opposite_px - paper).sum()
        self.assertGreater(shadow_darkness, opposite_darkness,
                           "the shadow side must be darker than the opposite side")


class TestLanduseDoesNotFlattenRelief(unittest.TestCase):
    """§7's fix: landuse is a MULTIPLY tint, not an opaque fill, so terrain
    brightness variation must still show through it."""

    def test_relief_survives_under_a_landuse_tint(self):
        cx, cy = FRAME.cx, FRAME.cy
        park = Feature(id="p1", geom=square(cx, cy, 200), tags={"leisure": "park"}, area=True)

        dem_grid = 16
        # A real brightness gradient (not flat), so a flattening bug would be
        # visible as constant colour across the park where it should vary.
        elevation = np.tile(np.linspace(0, 40, dem_grid), (dem_grid, 1)).astype(np.float32)
        shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
        shade[:, : dem_grid // 2] *= 0.6   # left half noticeably darker
        f = Fields(frame=FRAME, features=[park], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)

        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        left = img.getpixel((int(tile.px * 0.3), int(tile.px * 0.5)))
        right = img.getpixel((int(tile.px * 0.7), int(tile.px * 0.5)))
        self.assertNotEqual(left, right,
                            "brightness variation must survive under a landuse tint")

    def test_park_colour_is_visible_at_all(self):
        cx, cy = FRAME.cx, FRAME.cy
        park = Feature(id="p1", geom=square(cx, cy, 200), tags={"leisure": "park"}, area=True)
        f = flat_fields([park])
        tile = FRAME.full_tile(px=200)
        img = render.render_tile(f, STYLE, tile)
        centre = img.getpixel((100, 100))
        self.assertNotEqual(centre, STYLE.colour("paper"))


class TestPaletteLookup(unittest.TestCase):
    PALETTE = [[100, 100, 100], [200, 150, 100], [50, 50, 200]]

    def test_t_zero_is_the_first_stop(self):
        out = render._palette_lookup(np.array([0.0]), self.PALETTE)
        np.testing.assert_allclose(out[0], [100, 100, 100])

    def test_t_one_is_the_last_stop(self):
        out = render._palette_lookup(np.array([1.0]), self.PALETTE)
        np.testing.assert_allclose(out[0], [50, 50, 200])

    def test_midpoint_of_a_two_stop_palette_is_the_average(self):
        out = render._palette_lookup(np.array([0.5]), [[0, 0, 0], [100, 100, 100]])
        np.testing.assert_allclose(out[0], [50, 50, 50])

    def test_out_of_range_t_is_clamped_not_extrapolated(self):
        lo = render._palette_lookup(np.array([-5.0]), self.PALETTE)
        hi = render._palette_lookup(np.array([5.0]), self.PALETTE)
        np.testing.assert_allclose(lo[0], [100, 100, 100])
        np.testing.assert_allclose(hi[0], [50, 50, 200])

    def test_operates_elementwise_over_a_2d_array(self):
        t = np.array([[0.0, 1.0], [0.5, 0.25]])
        out = render._palette_lookup(t, [[0, 0, 0], [100, 100, 100]])
        self.assertEqual(out.shape, (2, 2, 3))
        np.testing.assert_allclose(out[0, 0], [0, 0, 0])
        np.testing.assert_allclose(out[0, 1], [100, 100, 100])
        np.testing.assert_allclose(out[1, 0], [50, 50, 50])


class TestBuildingRoofColour(unittest.TestCase):
    """render._building_roof_colour: per-building seeded colour variety for
    buildings with no building:material tag -- point 4 of the 2026-08-24
    user report ('different random colours for the buildings using a seed
    so that it's consistent with their location')."""

    PALETTE = [(10, 10, 10), (20, 20, 20), (30, 30, 30), (40, 40, 40), (50, 50, 50)]

    def test_returns_a_colour_from_the_palette(self):
        out = render._building_roof_colour("some-building-id", self.PALETTE)
        self.assertIn(out, self.PALETTE)

    def test_deterministic_for_the_same_id(self):
        """Consistent per location, not fresh-random every render -- the
        user's own explicit requirement."""
        a = render._building_roof_colour("op-0007-part-3", self.PALETTE)
        b = render._building_roof_colour("op-0007-part-3", self.PALETTE)
        self.assertEqual(a, b)

    def test_different_ids_can_get_different_colours(self):
        """Not a strict guarantee for any two arbitrary ids (hash collisions
        are possible), but across a real sample of many ids, real variety
        must show up -- otherwise this is only cosmetically different from
        one fixed colour for every building."""
        colours = {render._building_roof_colour(f"building-{i}", self.PALETTE) for i in range(200)}
        self.assertGreater(len(colours), 1)

    def test_uses_every_palette_entry_across_enough_ids(self):
        """Roughly even distribution, not e.g. always index 0 from a biased
        hash -- sampled generously to make a real bias detectable."""
        colours = {render._building_roof_colour(f"building-{i}", self.PALETTE) for i in range(500)}
        self.assertEqual(colours, set(self.PALETTE))

    def test_single_colour_palette_never_raises(self):
        out = render._building_roof_colour("anything", [(77, 77, 77)])
        self.assertEqual(out, (77, 77, 77))


class TestCanopyTexture(unittest.TestCase):
    """2026-08-24, direct user report: forest/wood landuse read as a
    blocky, low-resolution patch of flat colour next to the DEM's much finer
    contour detail. See terrain.canopy_noise_t and render_tile's landuse
    section for the fix -- a noise-driven multi-stop tint for CANOPY_LANDUSE_KEYS
    only, so open ground (grass/park/garden) keeps its plain flat tint."""

    def _canopy_fields(self, forest_geom, gradient_axis="x", dem_grid=16):
        elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
        shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
        # A real spatial gradient in canopy_t -- not just noise, an actual
        # smooth ramp -- so two sample points can be relied on to land on
        # meaningfully different values without depending on RNG placement.
        ramp = np.linspace(0.0, 1.0, dem_grid, dtype=np.float32)
        if gradient_axis == "x":
            canopy_t = np.tile(ramp[None, :], (dem_grid, 1))
        else:
            canopy_t = np.tile(ramp[:, None], (1, dem_grid))
        forest = Feature(id="f1", geom=forest_geom, tags={"natural": "forest"}, area=True)
        return Fields(frame=FRAME, features=[forest], lamps=[], elevation=elevation,
                     shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0,
                     shadow_mul=np.ones((dem_grid, dem_grid, 3), dtype=np.float32), canopy_t=canopy_t)

    def test_forest_is_canopy_keyed(self):
        self.assertIn("forest", render.CANOPY_LANDUSE_KEYS)
        self.assertIn("wood", render.CANOPY_LANDUSE_KEYS)

    def test_two_points_in_the_same_forest_polygon_differ_in_colour(self):
        """THE regression: a single flat fill made every pixel of a forest
        polygon identical, which is what read as 'blocky' next to the
        contours. With canopy_t varying, they must not be identical."""
        cx, cy = FRAME.cx, FRAME.cy
        forest = square(cx, cy, 400)
        f = self._canopy_fields(forest, gradient_axis="x")
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        left = img.getpixel((int(tile.px * 0.15), int(tile.px * 0.5)))
        right = img.getpixel((int(tile.px * 0.85), int(tile.px * 0.5)))
        self.assertNotEqual(left, right,
                            "canopy noise must vary a forest polygon's fill colour internally")

    def test_non_canopy_landuse_is_unaffected_by_canopy_t(self):
        """A gradient in canopy_t must not leak into landuse classes outside
        CANOPY_LANDUSE_KEYS -- grass/park stay their plain flat tint."""
        cx, cy = FRAME.cx, FRAME.cy
        park = Feature(id="p1", geom=square(cx, cy, 400), tags={"leisure": "park"}, area=True)
        dem_grid = 16
        elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
        shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
        ramp = np.linspace(0.0, 1.0, dem_grid, dtype=np.float32)
        canopy_t = np.tile(ramp[None, :], (dem_grid, 1))
        f = Fields(frame=FRAME, features=[park], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0,
                  shadow_mul=np.ones((dem_grid, dem_grid, 3), dtype=np.float32), canopy_t=canopy_t)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        left = img.getpixel((int(tile.px * 0.15), int(tile.px * 0.5)))
        right = img.getpixel((int(tile.px * 0.85), int(tile.px * 0.5)))
        self.assertEqual(left, right, "non-canopy landuse must ignore canopy_t entirely")

    def test_missing_canopy_t_falls_back_to_the_flat_landuse_colour(self):
        """Fields built without canopy_t (e.g. an older test helper, or a
        style/world combination that never set one) must render, not crash
        -- and must fall back to the plain flat tint, not raise or paint
        nothing."""
        cx, cy = FRAME.cx, FRAME.cy
        forest = Feature(id="f1", geom=square(cx, cy, 200), tags={"natural": "forest"}, area=True)
        f = flat_fields([forest])   # canopy_t defaults to None
        self.assertIsNone(f.canopy_t)
        tile = FRAME.full_tile(px=200)
        img = render.render_tile(f, STYLE, tile)  # must not raise
        centre = img.getpixel((100, 100))
        self.assertNotEqual(centre, STYLE.colour("paper"))


class TestBuildingHeightGrading(unittest.TestCase):
    def test_taller_buildings_are_visually_distinct_from_shorter_ones(self):
        cx, cy = FRAME.cx, FRAME.cy
        short = Feature(id="s1", geom=square(cx - 200, cy, 60), tags={"building": "yes"},
                        area=True, height_m=4.0)
        tall = Feature(id="t1", geom=square(cx + 200, cy, 60), tags={"building": "yes"},
                       area=True, height_m=55.0)
        f = flat_fields([short, tall])
        tile = FRAME.full_tile(px=800)
        img = render.render_tile(f, STYLE, tile)
        x1, y1 = tile.to_px(cx - 200, cy)
        x2, y2 = tile.to_px(cx + 200, cy)
        self.assertNotEqual(img.getpixel((int(x1), int(y1))), img.getpixel((int(x2), int(y2))))


class TestBuildingMaterial(unittest.TestCase):
    """building:material (render.BUILDING_MATERIAL_TAG) -- the Scratchpad
    Fill tool's real-renderer half. Set by editor/static/scratchpad.js's
    Fill tool, or by hand."""

    def test_a_material_tag_overrides_the_height_graded_fill(self):
        cx, cy = FRAME.cx, FRAME.cy
        plain = Feature(id="p1", geom=square(cx - 200, cy, 60),
                        tags={"building": "yes"}, area=True, height_m=20.0)
        metal = Feature(id="m1", geom=square(cx + 200, cy, 60),
                        tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "metal"},
                        area=True, height_m=20.0)  # SAME height -- only the material tag differs
        f = flat_fields([plain, metal])
        tile = FRAME.full_tile(px=800)
        img = render.render_tile(f, STYLE, tile)
        x1, y1 = tile.to_px(cx - 200, cy)
        x2, y2 = tile.to_px(cx + 200, cy)
        self.assertNotEqual(img.getpixel((int(x1), int(y1))), img.getpixel((int(x2), int(y2))),
                            "a building:material tag must change the fill even at identical height")

    def test_material_fill_matches_the_style_colour_exactly_under_full_light(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 60),
                           tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "concrete"},
                           area=True, height_m=20.0)
        f = flat_fields([building])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y))), tuple(STYLE.material_colour("concrete")))

    def test_unknown_material_falls_back_to_height_graded_fill(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 60),
                           tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "unobtainium"},
                           area=True, height_m=20.0)
        f = flat_fields([building])
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)  # must not raise
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y))), expected_building_fill("b1", 20.0))

    def test_material_fill_still_darkens_in_cast_shadow(self):
        """A material colour is a flat fill INSTEAD of height-grading, not a
        way to skip shadow_mul entirely -- it must still darken under real
        cast shadow, the same as any other building."""
        cx, cy = FRAME.cx, FRAME.cy
        caster = Feature(id="caster", geom=square(cx, cy, 40), tags={"building": "yes"},
                         area=True, height_m=40.0)
        dx, dy, _ = render._light_shadow_vector(FRAME)
        off = 40.0 * float(STYLE.shadow.get("buildingHeightScale", 0.55))
        past_corner = 40.0 * 2 ** 0.5
        d = past_corner + off * 0.6
        neighbour_geom = square(cx + dx * d, cy + dy * d, 5)
        neighbour = Feature(id="neighbour", geom=neighbour_geom,
                            tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "metal"},
                            area=True, height_m=3.0)

        tile = FRAME.full_tile(px=1000)
        x, y = tile.to_px(neighbour_geom.centroid.x, neighbour_geom.centroid.y)
        control = render.render_tile(flat_fields([neighbour]), STYLE, tile)
        test = render.render_tile(flat_fields([caster, neighbour]), STYLE, tile)
        self.assertLess(sum(test.getpixel((int(x), int(y)))), sum(control.getpixel((int(x), int(y)))),
                        "a material-filled building must still darken under a neighbour's cast shadow")


class TestBuildingWithHoleDoesNotEraseOtherBuildings(unittest.TestCase):
    """A polygon-with-a-hole building (a mitred wall band, a moat rim, an
    earthwork berm) shares one accumulator canvas/mask with every other
    building in render_tile's fill pass -- confirmed as a real, live bug
    building the procgen bunker: an earlier-drawn solid building sitting
    inside a LATER-processed ring's hole vanished entirely, because the
    ring's hole-punch (`bld_mask_drawer.polygon(interior, fill=0)`) wrote
    straight into the shared mask instead of a mask scoped to its own
    feature. Fixed by isolating each hole-bearing feature's own
    exterior-minus-holes into a local mask, merged via ImageChops.lighter
    (max) so a later hole can only ever ADD transparency to pixels IT
    owns, never subtract coverage an earlier feature already painted."""

    def _ring_with_hole(self, cx, cy, inner_half, outer_half):
        outer = [(cx - outer_half, cy - outer_half), (cx + outer_half, cy - outer_half),
                (cx + outer_half, cy + outer_half), (cx - outer_half, cy + outer_half)]
        inner = [(cx - inner_half, cy - inner_half), (cx + inner_half, cy - inner_half),
                (cx + inner_half, cy + inner_half), (cx - inner_half, cy + inner_half)]
        return Polygon(outer, [inner])

    def test_a_building_inside_a_rings_hole_still_renders(self):
        cx, cy = FRAME.cx, FRAME.cy
        core = Feature(id="core", geom=square(cx, cy, 20),
                       tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "concrete"},
                       area=True, height_m=5.0)
        ring = Feature(id="ring", geom=self._ring_with_hole(cx, cy, 40, 70),
                      tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "wood"},
                      area=True, height_m=2.5)
        f = flat_fields([core, ring])
        tile = FRAME.full_tile(px=800)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y))), tuple(STYLE.material_colour("concrete")),
                        "the core building must still show through the ring's hole, "
                        "not be erased by the ring's own hole-punch")

    def test_order_independent_ring_processed_before_or_after(self):
        """The bug's actual trigger depended on iteration order (the ring's
        hole-punch only erases features already painted before it runs) --
        pin correctness regardless of which feature happens to be drawn
        first, rather than only the order this bug was originally found in."""
        cx, cy = FRAME.cx, FRAME.cy
        core = Feature(id="core", geom=square(cx, cy, 20),
                       tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "concrete"},
                       area=True, height_m=5.0)
        ring = Feature(id="ring", geom=self._ring_with_hole(cx, cy, 40, 70),
                      tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "wood"},
                      area=True, height_m=2.5)
        tile = FRAME.full_tile(px=800)
        x, y = tile.to_px(cx, cy)
        img_core_first = render.render_tile(flat_fields([core, ring]), STYLE, tile)
        img_ring_first = render.render_tile(flat_fields([ring, core]), STYLE, tile)
        expected = tuple(STYLE.material_colour("concrete"))
        self.assertEqual(img_core_first.getpixel((int(x), int(y))), expected)
        self.assertEqual(img_ring_first.getpixel((int(x), int(y))), expected)

    def test_the_hole_itself_still_shows_background_when_nothing_is_inside(self):
        """The fix must not accidentally make holes stop working -- with no
        other feature inside it, the hole must still show plain background,
        not the ring's own fill colour."""
        cx, cy = FRAME.cx, FRAME.cy
        ring = Feature(id="ring", geom=self._ring_with_hole(cx, cy, 40, 70),
                      tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "wood"},
                      area=True, height_m=2.5)
        f = flat_fields([ring])
        tile = FRAME.full_tile(px=800)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        self.assertNotEqual(img.getpixel((int(x), int(y))), tuple(STYLE.material_colour("wood")),
                           "an empty hole must not be filled with the ring's own colour")

    def test_ring_fill_still_present_outside_the_hole(self):
        """Guard against a fix that over-corrects by making the ring's own
        fill disappear entirely (e.g. an inverted mask) -- its annulus body
        must still render normally."""
        cx, cy = FRAME.cx, FRAME.cy
        ring = Feature(id="ring", geom=self._ring_with_hole(cx, cy, 40, 70),
                      tags={"building": "yes", render.BUILDING_MATERIAL_TAG: "wood"},
                      area=True, height_m=2.5)
        f = flat_fields([ring])
        tile = FRAME.full_tile(px=800)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx + 55, cy)  # inside the annulus body: between half-extents 40 and 70
        self.assertEqual(img.getpixel((int(x), int(y))), tuple(STYLE.material_colour("wood")))


class TestRoadCasing(unittest.TestCase):
    def test_motorway_wider_than_footway(self):
        cx, cy = FRAME.cx, FRAME.cy
        motorway = Feature(id="m1", geom=LineString([(cx - 300, cy - 200), (cx + 300, cy - 200)]),
                           tags={"highway": "motorway"}, area=False)
        footway = Feature(id="fp1", geom=LineString([(cx - 300, cy + 200), (cx + 300, cy + 200)]),
                          tags={"highway": "footway"}, area=False)
        f = flat_fields([motorway, footway])
        tile = FRAME.full_tile(px=800)
        img = render.render_tile(f, STYLE, tile)
        arr = np.asarray(img)

        def road_width_at_row(map_y):
            _, py = tile.to_px(cx, map_y)
            row = arr[int(py), :]
            paper = np.array(STYLE.colour("paper"))
            non_paper = np.where(np.any(row != paper, axis=-1))[0]
            return len(non_paper)

        self.assertGreater(road_width_at_row(cy - 200), road_width_at_row(cy + 200))

    def test_unknown_highway_class_does_not_crash_or_draw(self):
        """The old spike's `if hw not in ROAD: continue` silently dropped
        synthesised road classes with no error. Here it must at least not
        crash; drawing nothing for an unstyled class is the documented
        behaviour (see style.knows_road)."""
        cx, cy = FRAME.cx, FRAME.cy
        weird = Feature(id="w1", geom=LineString([(cx - 100, cy), (cx + 100, cy)]),
                        tags={"highway": "teleporter"}, area=False)
        f = flat_fields([weird])
        tile = FRAME.full_tile(px=200)
        render.render_tile(f, STYLE, tile)  # must not raise


class TestLamps(unittest.TestCase):
    def test_lamp_renders_at_its_position(self):
        cx, cy = FRAME.cx, FRAME.cy
        f = flat_fields([], lamps=[Point(cx, cy)])
        tile = FRAME.full_tile(px=200)
        img = render.render_tile(f, STYLE, tile)
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y))), STYLE.colour("lamp"))


class TestContoursDraw(unittest.TestCase):
    def test_a_slope_produces_visible_contour_ink(self):
        cx, cy = FRAME.cx, FRAME.cy
        dem_grid = 32
        elevation = np.tile(np.linspace(0, 95, dem_grid), (dem_grid, 1)).astype(np.float32)
        shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
        f = Fields(frame=FRAME, features=[], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        tile = FRAME.full_tile(px=400)
        img = render.render_tile(f, STYLE, tile)
        arr = np.asarray(img)
        paper = np.array(STYLE.colour("paper"))
        non_paper_fraction = np.mean(np.any(arr != paper, axis=-1))
        self.assertGreater(non_paper_fraction, 0.01, "contour lines must leave visible ink")


class TestCropElevationForTile(unittest.TestCase):
    """_crop_elevation_for_tile: the actual preview-speed fix -- contour
    extraction used to run over the FULL frame elevation array (2048^2 in
    production) on every render_tile call regardless of tile size, measured
    costing ~9s per call independent of feature count or window size. This
    crops to just the tile's own window (plus a 1-cell margin) before
    contour.extract_contours ever sees the array."""

    def _big_frame_elevation(self, dem_grid=64):
        frame = Frame(id="big", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
                     extent_m=2000.0, crs_epsg=6674, dem_grid=dem_grid)
        # a simple W->E ramp so every cell has a distinct, known elevation
        elevation = np.tile(np.linspace(0, 630, dem_grid), (dem_grid, 1)).astype(np.float32)
        return frame, elevation

    def test_crop_is_smaller_than_the_full_array_for_a_small_window(self):
        frame, elevation = self._big_frame_elevation()
        tile = frame.window_tile(135.205, 34.678, extent_m=200.0, mpp=1.0)
        crop, ix0, iy0 = render._crop_elevation_for_tile(elevation, frame.extent_m, tile)
        self.assertLess(crop.shape[0], elevation.shape[0])
        self.assertLess(crop.shape[1], elevation.shape[1])

    def test_full_tile_crop_covers_the_whole_array(self):
        frame, elevation = self._big_frame_elevation()
        tile = frame.full_tile(px=100)
        crop, ix0, iy0 = render._crop_elevation_for_tile(elevation, frame.extent_m, tile)
        self.assertEqual(ix0, 0)
        self.assertEqual(iy0, 0)
        self.assertEqual(crop.shape, elevation.shape)

    def test_crop_values_match_the_source_array_at_the_reported_offset(self):
        frame, elevation = self._big_frame_elevation()
        tile = frame.window_tile(135.205, 34.678, extent_m=200.0, mpp=1.0)
        crop, ix0, iy0 = render._crop_elevation_for_tile(elevation, frame.extent_m, tile)
        np.testing.assert_array_equal(
            crop, elevation[iy0:iy0 + crop.shape[0], ix0:ix0 + crop.shape[1]])

    def test_contours_extracted_from_the_crop_match_the_full_array_once_offset(self):
        """The correctness property that actually matters: every contour
        segment found in the cropped array, translated back by (ix0, iy0),
        must be a segment that also exists in the full array's own
        extraction restricted to that same region -- the crop must not
        invent or drop crossings relative to ground truth."""
        frame, elevation = self._big_frame_elevation()
        tile = frame.window_tile(135.205, 34.678, extent_m=200.0, mpp=1.0)
        crop, ix0, iy0 = render._crop_elevation_for_tile(elevation, frame.extent_m, tile)

        cropped_lines = contour.extract_contours(crop)
        full_lines = contour.extract_contours(elevation)
        full_by_level = {line.level: line.segments for line in full_lines}

        for line in cropped_lines:
            translated = {((c0 + ix0, r0 + iy0), (c1 + ix0, r1 + iy0))
                         for (c0, r0), (c1, r1) in line.segments}
            full_segments = set(full_by_level.get(line.level, []))
            self.assertTrue(translated <= full_segments,
                            f"level {line.level}: crop found a segment the full array didn't")

    def test_renders_much_faster_than_a_full_frame_contour_pass(self):
        """Regression guard for the actual bug: this used to cost ~9s per
        preview render regardless of window size (full-frame contour
        extraction on every call). A local design-preview loop needs many
        renders per minute -- generous 2s ceiling, nowhere near the ~9s
        this was measured at before the fix, but not so tight it's flaky."""
        frame, elevation = self._big_frame_elevation(dem_grid=512)
        shade = np.ones((512, 512, 3), dtype=np.float32)
        f = Fields(frame=frame, features=[], lamps=[], elevation=elevation,
                  shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)
        tile = frame.window_tile(135.205, 34.678, extent_m=200.0, mpp=1.0)
        t0 = time.perf_counter()
        render.render_tile(f, STYLE, tile)
        elapsed = time.perf_counter() - t0
        self.assertLess(elapsed, 2.0, f"render_tile took {elapsed:.2f}s -- crop optimisation regressed")


class TestOutputShape(unittest.TestCase):
    def test_output_matches_the_tile_pixel_size(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=333)
        img = render.render_tile(f, STYLE, tile)
        self.assertEqual(img.size, (333, 333))

    def test_rgb_mode(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=64)
        img = render.render_tile(f, STYLE, tile)
        self.assertEqual(img.mode, "RGB")


class TestSupersampleDownsample(unittest.TestCase):
    """2026-08-24, direct user report ("pixelated lines... even at higher
    resolution", confirmed a second time after trying supersample directly:
    "even super sampling doesn't get rid of horrible aliased lines"). The
    Tile data model always had `px` (working canvas) vs `px_out` (output,
    "after downsampling" per its own docstring) but render_tile never
    actually performed that downsample -- supersample>1 rendered a bigger
    working canvas and returned it AS-IS, so PIL's non-antialiased
    ImageDraw lines stayed just as hard-edged as ever."""

    def test_output_size_is_px_out_not_the_working_canvas(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=100, supersample=3)
        self.assertEqual(tile.px, 300, "fixture sanity check")
        img = render.render_tile(f, STYLE, tile)
        self.assertEqual(img.size, (100, 100),
                         "must return the OUTPUT size (px_out), not the working canvas (px)")

    def test_supersample_one_is_unaffected(self):
        """No downsample at all when supersample==1 -- working canvas and
        output are the same size already, resizing would be a wasteful
        no-op filter pass, not just unnecessary."""
        f = flat_fields([])
        tile = FRAME.full_tile(px=200, supersample=1)
        img = render.render_tile(f, STYLE, tile)
        self.assertEqual(img.size, (200, 200))

    def test_a_diagonal_edge_gets_real_intermediate_colours_when_supersampled(self):
        """THE actual regression, in pixels: a hard-aliased edge has only
        the two source colours anywhere near the boundary. A genuinely
        antialiased edge blends them -- real intermediate colour values
        appear right at the line, not just building-colour and paper."""
        cx, cy = FRAME.cx, FRAME.cy
        # A 45-degree edge -- axis-aligned edges can alias to a hard line
        # that happens to fall exactly on a pixel boundary either way, a
        # diagonal reliably exercises partial pixel coverage.
        diamond = Polygon([(cx, cy - 60), (cx + 60, cy), (cx, cy + 60), (cx - 60, cy)])
        # height_m=0.0, deliberately: a real building's own cast shadow
        # (Minkowski-swept a few metres past its own footprint, then
        # Gaussian-blurred) smoothly shades the paper right next to the
        # edge too, which would contaminate an edge-antialiasing check with
        # colours that have nothing to do with supersampling. Zero height
        # collapses the shadow sweep to (approximately) the footprint
        # itself, so self-exclusion leaves no shadow to draw at all.
        building = Feature(id="b1", geom=diamond, tags={"building": "yes"}, area=True, height_m=0.0)
        f = flat_fields([building])
        tile = FRAME.full_tile(px=120, supersample=4)
        img = render.render_tile(f, STYLE, tile)  # returns at px_out=120, NOT the px=480 working canvas

        paper = STYLE.colour("paper")
        fill = expected_building_fill("b1", 0.0)
        ink = STYLE.colour("ink")  # the building's own outline stroke -- exclude it, it is
                                   # ALWAYS a hard flat colour and would trivially satisfy
                                   # "a third colour is present" without any real antialiasing
        wx, wy = tile.to_px(cx + 30, cy - 30)  # to_px works in WORKING (px) space
        x, y = int(wx / tile.supersample), int(wy / tile.supersample)  # -> px_out space, matching img
        found_intermediate = False
        for dx in range(-4, 5):
            for dy in range(-4, 5):
                xi, yi = x + dx, y + dy
                if not (0 <= xi < img.size[0] and 0 <= yi < img.size[1]):
                    continue
                px = img.getpixel((xi, yi))
                if px not in (paper, fill, ink):
                    found_intermediate = True
        self.assertTrue(found_intermediate,
                        "a supersampled diagonal edge must show blended intermediate colours, "
                        "not just the source/outline colours -- if this fails, no real "
                        "antialiasing is happening")

    def test_supersampling_produces_a_smoother_edge_than_no_supersampling(self):
        """A direct before/after over the SAME diagonal edge, at the SAME
        output pixel grid (px_out=120 either way): count pixels that are
        neither the paper, the fill, nor the building's own outline ink --
        genuine blended colours a real antialiased edge produces and a hard-
        aliased one cannot."""
        cx, cy = FRAME.cx, FRAME.cy
        diamond = Polygon([(cx, cy - 60), (cx + 60, cy), (cx, cy + 60), (cx - 60, cy)])
        # height_m=0.0, deliberately: a real building's own cast shadow
        # (Minkowski-swept a few metres past its own footprint, then
        # Gaussian-blurred) smoothly shades the paper right next to the
        # edge too, which would contaminate an edge-antialiasing check with
        # colours that have nothing to do with supersampling. Zero height
        # collapses the shadow sweep to (approximately) the footprint
        # itself, so self-exclusion leaves no shadow to draw at all.
        building = Feature(id="b1", geom=diamond, tags={"building": "yes"}, area=True, height_m=0.0)
        f = flat_fields([building])
        paper, fill = STYLE.colour("paper"), expected_building_fill("b1", 0.0)
        ink = STYLE.colour("ink")

        out_tile = FRAME.full_tile(px=120, supersample=1)  # px_out=120 either way -- same output pixel grid
        x, y = out_tile.to_px(cx + 30, cy - 30)
        x, y = int(x), int(y)

        aliased = render.render_tile(f, STYLE, out_tile)
        smoothed = render.render_tile(f, STYLE, FRAME.full_tile(px=120, supersample=4))

        def blended_count(img):
            return sum(1 for dx in range(-4, 5)
                      if img.getpixel((x + dx, y)) not in (paper, fill, ink))

        self.assertEqual(blended_count(aliased), 0,
                         "sanity check: unsupersampled output must be hard-edged, no blend colours")
        self.assertGreater(blended_count(smoothed), 0,
                           "supersampled output must show real blended colours across the same edge")


if __name__ == "__main__":
    unittest.main()
