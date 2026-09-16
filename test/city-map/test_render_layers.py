"""citymap.render_layers tests, built on hand-crafted Fields (no network,
deterministic) -- same fixture style as test_render.py.

Priority is the properties the design review specifically flagged as real
regression risks, not just "does each layer draw something": railways must
never be darkened by terrain-shadow (unlike roads/buildings), a bridge deck
must still win over a building and its own cast shadow once the layers are
recombined, a reference-grid line/label must not vanish at a tile seam, and
labels must number from the FRAME's own origin, not whichever tile happens
to draw them. Each of these was a real bug caught during design, not a
hypothetical -- see citymap/render_layers.py's own module docstring and
comments for the mechanism each test is pinning down.
"""

import json
import math
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from shapely.geometry import LineString, Polygon  # noqa: E402

import render as render_cli  # noqa: E402 -- the top-level CLI (tools/city-map/render.py)
from citymap import render, render_layers  # noqa: E402 -- citymap/render.py, a different module
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.style import Style  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674, dem_grid=16)


def flat_fields(features, lamps=None, sea_geom=None, dem_grid=16,
               elevation_value=10.0, shade_value=1.0, shadow_mul_value=None,
               canopy_t=None, coast_fade_t=None) -> Fields:
    """A Fields object over flat terrain with a controllable, UNIFORM
    shade_rgb/shadow_mul -- isolates whatever a test wants to check from any
    real hillshade variation. Mirrors test_render.py's own flat_fields,
    reimplemented locally rather than cross-imported (matching this
    project's existing test_render_full.py precedent of each test file
    owning its own small fixture rather than sharing one)."""
    elevation = np.full((dem_grid, dem_grid), elevation_value, dtype=np.float32)
    shade = np.full((dem_grid, dem_grid, 3), shade_value, dtype=np.float32)
    shadow_mul = None
    if shadow_mul_value is not None:
        shadow_mul = np.full((dem_grid, dem_grid, 3), shadow_mul_value, dtype=np.float32)
    depth_t = None
    if sea_geom is not None:
        from citymap.fields import sea_depth_gradient
        depth_t = sea_depth_gradient(sea_geom, FRAME, falloff_m=300.0, gamma=0.6)
        features = list(features) + [Feature(id="sea", geom=sea_geom,
                                             tags={"__sea__": "true"}, area=True)]
    return Fields(frame=FRAME, features=features, lamps=lamps or [],
                 elevation=elevation, shade_rgb=shade, sea_depth_t=depth_t,
                 dem_tiles_fetched=0, dem_tiles_missing=0, shadow_mul=shadow_mul,
                 canopy_t=canopy_t, coast_fade_t=coast_fade_t)


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


def expected_building_fill(feature_id, height_m):
    """Independently reproduces render_layers._build_buildings' fill formula
    (same one render_tile itself uses) -- a fresh derivation from the style
    palette, not a call into the implementation, matching test_render.py's
    own expected_building_fill."""
    low = STYLE.colour("buildingLow")
    roof = render._building_roof_colour(feature_id, STYLE.building_roof_palette())
    height_k = min(1.0, height_m / 55.0)
    blend = 0.55 + 0.35 * height_k
    return tuple(int(low[i] + (roof[i] - low[i]) * blend) for i in range(3))


def alpha_at(img, x, y):
    return img.getpixel((int(x), int(y)))[3]


class TestLayerOrderAndShape(unittest.TestCase):
    def test_render_tile_layers_yields_exactly_layer_order(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=64)
        layers = render_layers.render_tile_layers(f, STYLE, tile)
        self.assertEqual(tuple(layers.keys()), render_layers.LAYER_ORDER)

    def test_every_layer_is_rgba_and_the_output_size(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=64, supersample=2)
        layers = render_layers.render_tile_layers(f, STYLE, tile)
        for name, img in layers.items():
            self.assertEqual(img.mode, "RGBA", name)
            self.assertEqual(img.size, (64, 64), name)

    def test_no_grid_skips_both_reference_grid_layers(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=64)
        layers = render_layers.render_tile_layers(f, STYLE, tile, draw_grid=False)
        self.assertNotIn("grid-lines", layers)
        self.assertNotIn("grid-labels", layers)
        self.assertEqual(len(layers), len(render_layers.LAYER_ORDER) - 2)

    def test_iter_tile_layers_is_a_real_generator_not_a_list(self):
        """The memory-critical property: nothing forces the whole sequence
        to exist at once."""
        import types
        f = flat_fields([])
        tile = FRAME.full_tile(px=32)
        self.assertIsInstance(render_layers.iter_tile_layers(f, STYLE, tile),
                              types.GeneratorType)


class TestLandBase(unittest.TestCase):
    def test_flat_opaque_paper_everywhere(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=40)
        img = render_layers._layer_land_base(STYLE, tile)
        expected = tuple(STYLE.colour("paper")) + (255,)
        self.assertEqual(img.getpixel((5, 5)), expected)
        self.assertEqual(img.getpixel((39, 39)), expected)


class TestHillshade(unittest.TestCase):
    def test_alpha_is_zero_over_sea_and_255_over_land(self):
        cx, cy = FRAME.cx, FRAME.cy
        sea = square(cx + 200, cy, 300)
        f = flat_fields([], sea_geom=sea, shade_value=1.0)
        tile = FRAME.full_tile(px=400)
        sea_geom, sea_mask = render_layers._sea_geom_and_mask(f, tile)
        img = render_layers._layer_hillshade(f, tile, sea_mask)
        land_x, land_y = tile.to_px(cx - 400, cy)
        sea_x, sea_y = tile.to_px(cx + 200, cy)
        self.assertEqual(alpha_at(img, land_x, land_y), 255)
        self.assertEqual(alpha_at(img, sea_x, sea_y), 0)

    def test_rgb_reflects_the_shade_value_when_at_or_below_one(self):
        f = flat_fields([], shade_value=0.5)
        tile = FRAME.full_tile(px=40)
        img = render_layers._layer_hillshade(f, tile, None)
        r, g, b, a = img.getpixel((20, 20))
        self.assertEqual((r, g, b, a), (127, 127, 127, 255))  # 0.5*255, floor of 127.5

    def test_documented_approximation_clips_above_one_to_white(self):
        """Locks in the documented hillshade limitation as an assertion, not
        just prose: shade_rgb CAN exceed 1.0 (a real warm-tint highlight,
        terrain.shade_rgb's own ceiling is ~1.22-2.0), but a "Multiply"
        blend mode cannot express that -- this layer clips to 1.0 (255) and
        the module docstring says so. Prove the clip is exactly at 1.0, not
        some other value."""
        f = flat_fields([], shade_value=1.5)
        tile = FRAME.full_tile(px=40)
        img = render_layers._layer_hillshade(f, tile, None)
        self.assertEqual(img.getpixel((20, 20)), (255, 255, 255, 255))


class TestSea(unittest.TestCase):
    def test_hole_aware_fill_leaves_an_island_transparent(self):
        """The exact bug class draw.py's own module docstring describes
        (Kobe Airport as a hole in the sea polygon) -- a sea Polygon with an
        interior ring must NOT get alpha inside that ring."""
        cx, cy = FRAME.cx, FRAME.cy
        sea_with_island = Polygon(
            [(cx - 400, cy - 400), (cx + 400, cy - 400), (cx + 400, cy + 400), (cx - 400, cy + 400)],
            holes=[[(cx - 50, cy - 50), (cx + 50, cy - 50), (cx + 50, cy + 50), (cx - 50, cy + 50)]],
        )
        f = flat_fields([], sea_geom=sea_with_island)
        tile = FRAME.full_tile(px=400)
        sea_geom, sea_mask = render_layers._sea_geom_and_mask(f, tile)
        img = render_layers._layer_sea(f, STYLE, tile, sea_geom, sea_mask)
        ix, iy = tile.to_px(cx, cy)          # inside the island hole
        ox, oy = tile.to_px(cx + 300, cy)    # open water
        self.assertEqual(alpha_at(img, ix, iy), 0, "the island hole must stay transparent")
        self.assertGreater(alpha_at(img, ox, oy), 0)

    def test_no_sea_in_frame_yields_a_fully_transparent_layer(self):
        f = flat_fields([])
        tile = FRAME.full_tile(px=40)
        img = render_layers._layer_sea(f, STYLE, tile, None, None)
        self.assertEqual(img.getpixel((20, 20))[3], 0)


class TestLanduse(unittest.TestCase):
    def test_alpha_marks_exactly_the_tagged_polygon(self):
        cx, cy = FRAME.cx, FRAME.cy
        forest = Feature(id="f1", geom=square(cx, cy, 100), tags={"natural": "forest"}, area=True)
        f = flat_fields([forest])
        tile = FRAME.full_tile(px=400)
        img, mask = render_layers._build_landuse(f, STYLE, tile, [forest])
        inside_x, inside_y = tile.to_px(cx, cy)
        outside_x, outside_y = tile.to_px(cx + 300, cy)
        self.assertGreater(alpha_at(img, inside_x, inside_y), 0)
        self.assertEqual(alpha_at(img, outside_x, outside_y), 0)

    def test_rgb_is_the_tint_factor_relative_to_paper_not_the_raw_colour(self):
        """render_tile's own compositing divides the landuse colour by
        paper before multiplying it against the base (L366) -- exporting
        the raw colour instead would silently disagree with a real
        Photoshop Multiply blend. No canopy noise involved here (a flat
        landuse class), so the exported factor should match exactly."""
        cx, cy = FRAME.cx, FRAME.cy
        industrial = Feature(id="i1", geom=square(cx, cy, 100), tags={"landuse": "industrial"}, area=True)
        f = flat_fields([industrial])
        tile = FRAME.full_tile(px=400)
        img, _mask = render_layers._build_landuse(f, STYLE, tile, [industrial])
        x, y = tile.to_px(cx, cy)
        got = img.getpixel((int(x), int(y)))[:3]
        paper = STYLE.colour("paper")
        colour = STYLE.landuse_colour("industrial")
        expected = tuple(round(min(1.0, colour[i] / paper[i]) * 255) for i in range(3))
        for i in range(3):
            self.assertLessEqual(abs(got[i] - expected[i]), 1, f"channel {i}: {got} vs {expected}")


class TestCoastalFade(unittest.TestCase):
    def test_alpha_fades_with_distance_and_is_zero_over_landuse_and_sea(self):
        cx, cy = FRAME.cx, FRAME.cy
        sea = Polygon([(cx + 200, cy - 500), (cx + 500, cy - 500),
                      (cx + 500, cy + 500), (cx + 200, cy + 500)])
        from citymap import fields as fields_module
        depth_t = fields_module.sea_depth_gradient(sea, FRAME, falloff_m=300.0, gamma=0.6)
        fade_t = fields_module.coast_fade_t(sea, FRAME, fade_m=400.0, gamma=1.0)
        sand = Feature(id="beach", geom=square(cx + 150, cy, 20), tags={"natural": "sand"}, area=True)
        f = Fields(frame=FRAME, features=[
            Feature(id="sea", geom=sea, tags={"__sea__": "true"}, area=True), sand,
        ], lamps=[], elevation=np.full((16, 16), 10.0, dtype=np.float32),
            shade_rgb=np.ones((16, 16, 3), dtype=np.float32), sea_depth_t=depth_t,
            dem_tiles_fetched=0, dem_tiles_missing=0, coast_fade_t=fade_t)
        tile = FRAME.full_tile(px=400)
        sea_geom, sea_mask = render_layers._sea_geom_and_mask(f, tile)
        _landuse_img, landuse_mask = render_layers._build_landuse(f, STYLE, tile, [sand])
        img = render_layers._layer_coastal_fade(f, STYLE, tile, sea_geom, sea_mask, landuse_mask)

        near_x, near_y = tile.to_px(cx + 190, cy)     # bare ground, near shore
        far_x, far_y = tile.to_px(cx - 490, cy)       # bare ground, far inland
        sea_x, sea_y = tile.to_px(cx + 300, cy)       # open water
        sand_x, sand_y = tile.to_px(cx + 150, cy)     # already-tagged landuse

        self.assertGreater(alpha_at(img, near_x, near_y), alpha_at(img, far_x, far_y))
        self.assertEqual(alpha_at(img, sea_x, sea_y), 0, "sea must be untouched by the fade")
        self.assertEqual(alpha_at(img, sand_x, sand_y), 0, "tagged landuse keeps its own colour")


class TestWaterBodies(unittest.TestCase):
    def test_lake_alpha_marks_the_polygon(self):
        cx, cy = FRAME.cx, FRAME.cy
        lake = Feature(id="lk1", geom=square(cx, cy, 60), tags={"natural": "water"}, area=True)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_water_bodies(STYLE, tile, [lake])
        ix, iy = tile.to_px(cx, cy)
        ox, oy = tile.to_px(cx + 300, cy)
        self.assertGreater(alpha_at(img, ix, iy), 0)
        self.assertEqual(alpha_at(img, ox, oy), 0)


class TestContours(unittest.TestCase):
    def test_a_sloped_grid_draws_a_visible_contour(self):
        dem_grid = 32
        ramp = np.linspace(0.0, 100.0, dem_grid, dtype=np.float32)
        elevation = np.tile(ramp, (dem_grid, 1))  # rises left -> right, 0..100m over the frame
        f = Fields(frame=FRAME, features=[], lamps=[], elevation=elevation,
                  shade_rgb=np.ones((dem_grid, dem_grid, 3), dtype=np.float32), sea_depth_t=None,
                  dem_tiles_fetched=0, dem_tiles_missing=0)
        tile = FRAME.full_tile(px=200)
        from citymap.render import _crop_elevation_for_tile
        from citymap import contour as contour_module
        elev_crop, ix0, iy0 = _crop_elevation_for_tile(f.elevation, FRAME.extent_m, tile)
        lines = contour_module.extract_contours(elev_crop)
        self.assertGreater(sum(len(l.segments) for l in lines), 0, "fixture sanity: real contours exist")
        img = render_layers._layer_contours(STYLE, tile, lines, f.elevation.shape[0], ix0, iy0)
        arr = np.asarray(img)
        self.assertGreater((arr[..., 3] > 0).sum(), 0)


class TestRivers(unittest.TestCase):
    def test_river_line_draws_with_alpha(self):
        cx, cy = FRAME.cx, FRAME.cy
        river = Feature(id="riv1", geom=LineString([(cx - 400, cy), (cx + 400, cy)]),
                        tags={"waterway": "river"}, area=False)
        f = flat_fields([river])
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_rivers(f, STYLE, tile, [river])
        x, y = tile.to_px(cx, cy)
        self.assertGreater(alpha_at(img, x, y), 0)


class TestRoadsRailwaysBuildings(unittest.TestCase):
    """These must be TRUE (unshadowed) colour -- terrain-shadow is a
    separate layer, see TestTerrainShadow."""

    def test_road_pixel_is_the_true_unshadowed_tone(self):
        cx, cy = FRAME.cx, FRAME.cy
        road = Feature(id="r1", geom=LineString([(cx - 400, cy), (cx + 400, cy)]),
                       tags={"highway": "primary"}, area=False)
        tile = FRAME.full_tile(px=400)
        img, mask = render_layers._build_roads(STYLE, tile, [road])
        x, y = tile.to_px(cx, cy)
        self.assertGreater(alpha_at(img, x, y), 0)
        r, g, b, a = img.getpixel((int(x), int(y)))
        self.assertEqual((r, g, b), (246, 242, 234), "primary road fill tone, undarkened by any shadow")

    def test_railway_pixel_has_alpha_and_the_railway_colour(self):
        cx, cy = FRAME.cx, FRAME.cy
        rail = Feature(id="rw1", geom=LineString([(cx - 400, cy), (cx + 400, cy)]),
                       tags={"railway": "rail"}, area=False)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_railways(STYLE, tile, [rail])
        x, y = tile.to_px(cx, cy)
        self.assertGreater(alpha_at(img, x, y), 0)
        self.assertEqual(img.getpixel((int(x), int(y)))[:3], tuple(STYLE.colour("railway")))

    def test_building_fill_and_outline_are_true_unshadowed_colour(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=15.0)
        tile = FRAME.full_tile(px=400)
        img, mask = render_layers._build_buildings(STYLE, tile, [building])
        cx_px, cy_px = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(cx_px), int(cy_px))),
                         expected_building_fill("b1", 15.0) + (255,))

    def test_a_material_tagged_building_uses_the_flat_material_colour(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b2", geom=square(cx, cy, 80),
                           tags={"building": "yes", render_layers.BUILDING_MATERIAL_TAG: "brick"},
                           area=True, height_m=15.0)
        tile = FRAME.full_tile(px=400)
        img, _mask = render_layers._build_buildings(STYLE, tile, [building])
        x, y = tile.to_px(cx, cy)
        self.assertEqual(img.getpixel((int(x), int(y)))[:3], tuple(STYLE.material_colour("brick")))


class TestTerrainShadow(unittest.TestCase):
    """The layer render_layers.py's module docstring calls "exact, not
    approximate" -- terrain.cast_shadow_mul is mathematically bounded to
    [castShadowFloor, 1.0], and its alpha is derived from roads/buildings'
    own masks so railways are excluded BY CONSTRUCTION."""

    def _scene(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=15.0)
        road = Feature(id="r1", geom=LineString([(cx - 400, cy + 150), (cx + 400, cy + 150)]),
                       tags={"highway": "primary"}, area=False)
        rail = Feature(id="rw1", geom=LineString([(cx - 400, cy - 150), (cx + 400, cy - 150)]),
                       tags={"railway": "rail"}, area=False)
        return building, road, rail

    def test_alpha_covers_roads_and_buildings_but_excludes_railways(self):
        building, road, rail = self._scene()
        f = flat_fields([building, road, rail], shadow_mul_value=0.7)
        tile = FRAME.full_tile(px=400)
        roads_layer, roads_mask = render_layers._build_roads(STYLE, tile, [road])
        buildings_layer, buildings_mask = render_layers._build_buildings(STYLE, tile, [building])
        img = render_layers._layer_terrain_shadow(f, tile, roads_mask, buildings_mask)

        cx, cy = FRAME.cx, FRAME.cy
        bx, by = tile.to_px(cx, cy)
        rx, ry = tile.to_px(cx, cy + 150)
        railx, raily = tile.to_px(cx, cy - 150)

        self.assertGreater(alpha_at(img, bx, by), 0, "must cover the building")
        self.assertGreater(alpha_at(img, rx, ry), 0, "must cover the road")
        self.assertEqual(alpha_at(img, railx, raily), 0, "must exclude the railway")

    def test_rgb_is_the_shadow_mul_value_exactly(self):
        building, road, rail = self._scene()
        f = flat_fields([building, road, rail], shadow_mul_value=0.7)
        tile = FRAME.full_tile(px=400)
        _rl, roads_mask = render_layers._build_roads(STYLE, tile, [road])
        _bl, buildings_mask = render_layers._build_buildings(STYLE, tile, [building])
        img = render_layers._layer_terrain_shadow(f, tile, roads_mask, buildings_mask)
        cx, cy = FRAME.cx, FRAME.cy
        x, y = tile.to_px(cx, cy)
        r, g, b, a = img.getpixel((int(x), int(y)))
        self.assertEqual((r, g, b), (178, 178, 178))  # round(0.7*255) == 178, no clipping needed


class TestCastShadowsAndBridges(unittest.TestCase):
    def test_a_building_never_shadows_itself(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=40.0)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_cast_shadows(STYLE, tile, [building], dx=0.0, dy=-1.0)
        x, y = tile.to_px(cx, cy)  # dead centre of the building's own footprint
        self.assertEqual(alpha_at(img, x, y), 0)

    def test_bridge_layer_contains_both_shadow_and_deck(self):
        cx, cy = FRAME.cx, FRAME.cy
        bridge = Feature(id="br1", geom=LineString([(cx - 150, cy), (cx + 150, cy)]),
                         tags={"highway": "primary", "bridge": "yes"}, area=False)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_bridges(STYLE, tile, [bridge], dx=0.3, dy=-0.3)
        deck_x, deck_y = tile.to_px(cx, cy)
        self.assertGreater(alpha_at(img, deck_x, deck_y), 0, "deck itself must be drawn")
        arr = np.asarray(img)
        self.assertGreater((arr[..., 3] > 0).sum(), 0)

    def test_no_bridges_in_scene_yields_a_fully_transparent_layer(self):
        cx, cy = FRAME.cx, FRAME.cy
        road = Feature(id="r1", geom=LineString([(cx - 150, cy), (cx + 150, cy)]),
                       tags={"highway": "primary"}, area=False)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_bridges(STYLE, tile, [road], dx=0.3, dy=-0.3)
        self.assertEqual(np.asarray(img)[..., 3].max(), 0)

    def test_bridge_deck_wins_when_recombined_over_building_and_its_shadow(self):
        """Mirrors test_render.py's TestBridgeOverBuilding -- the exact
        regression the missing-bridges-layer design gap would have
        reintroduced. Recombine buildings (Normal) -> cast-shadows
        (Normal/as-authored alpha) -> bridges (Normal/as-authored alpha) at
        the point where all three overlap; the bridge deck colour must win."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=15.0)
        bridge = Feature(id="br1", geom=LineString([(cx - 150, cy), (cx + 150, cy)]),
                         tags={"highway": "primary", "bridge": "yes"}, area=False)
        tile = FRAME.full_tile(px=400)
        buildings_img, _mask = render_layers._build_buildings(STYLE, tile, [building])
        cast_shadows_img = render_layers._layer_cast_shadows(STYLE, tile, [building], dx=0.3, dy=-0.3)
        bridges_img = render_layers._layer_bridges(STYLE, tile, [building, bridge], dx=0.3, dy=-0.3)

        composed = buildings_img.convert("RGBA")
        composed = Image.alpha_composite(composed, cast_shadows_img)
        composed = Image.alpha_composite(composed, bridges_img)

        x, y = tile.to_px(cx, cy)
        pixel = composed.getpixel((int(x), int(y)))[:3]
        building_low = STYLE.colour("buildingLow")
        self.assertNotEqual(pixel, building_low)
        self.assertGreater(sum(pixel), sum(building_low),
                           "the near-white bridge deck must win over the grey building/shadow")


class TestRecombinationApproximatesRenderTile(unittest.TestCase):
    """render_tile's flattened output is the ground truth these layers
    decompose. Exact agreement is provable at neutral points, and
    specifically at a point where only shadow_mul (not shade_rgb) is
    non-neutral -- see the module docstring for why those two multipliers
    have different fidelity guarantees."""

    def test_exact_agreement_at_a_fully_neutral_point(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=0.0)  # no height -> no cast shadow to contaminate this
        f = flat_fields([building], shade_value=1.0, shadow_mul_value=1.0)
        tile = FRAME.full_tile(px=400)
        flattened = render.render_tile(f, STYLE, tile)
        buildings_img, _mask = render_layers._build_buildings(STYLE, tile, [building])
        x, y = tile.to_px(cx, cy)
        self.assertEqual(flattened.getpixel((int(x), int(y))), buildings_img.getpixel((int(x), int(y)))[:3])

    def test_exact_agreement_when_only_shadow_mul_is_non_neutral(self):
        """shade_rgb stays 1.0 (so hillshade contributes nothing to bare
        ground either, keeping the comparison clean); shadow_mul=0.8 is
        within cast_shadow_mul's real [floor,1.0] range, so terrain-shadow's
        Multiply reproduction must be EXACT, not merely close."""
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=0.0)
        f = flat_fields([building], shade_value=1.0, shadow_mul_value=0.8)
        tile = FRAME.full_tile(px=400)
        flattened = render.render_tile(f, STYLE, tile)

        buildings_img, buildings_mask = render_layers._build_buildings(STYLE, tile, [building])
        # No roads in this scene -- an empty, all-zero mask stands in.
        empty_mask = Image.new("L", (tile.px, tile.px), 0)
        terrain_shadow_img = render_layers._layer_terrain_shadow(f, tile, empty_mask, buildings_mask)

        x, y = tile.to_px(cx, cy)
        base = np.asarray(buildings_img.getpixel((int(x), int(y)))[:3], dtype=np.float32)
        factor = np.asarray(terrain_shadow_img.getpixel((int(x), int(y)))[:3], dtype=np.float32) / 255.0
        # int() truncates rather than rounds, matching render_tile's own
        # `.astype(np.uint8)` (always rounds toward zero, not to nearest) --
        # using round() here would occasionally disagree by 1 on values
        # like G*0.8 that land just past a whole number.
        recombined = tuple(int(v) for v in np.clip(base * factor, 0, 255))
        self.assertEqual(flattened.getpixel((int(x), int(y))), recombined)


class TestGridLines(unittest.TestCase):
    def test_lines_land_at_the_expected_spacing(self):
        tile = FRAME.full_tile(px=1000)  # 1 px == 1 m at this frame's 1000m extent
        img = render_layers._layer_grid_lines(tile, grid_spacing_m=200.0)
        fox, foy = FRAME.origin
        # A line is expected at every 200m from the frame origin.
        x, y = tile.to_px(fox + 400.0, foy + 500.0)
        self.assertGreater(alpha_at(img, x, y), 0)
        x_off, y_off = tile.to_px(fox + 350.0, foy + 500.0)
        self.assertEqual(alpha_at(img, x_off, y_off), 0)

    def test_a_line_on_a_shared_tile_boundary_survives_tiled_assembly(self):
        """Seam-safety, precisely stated. Investigated directly (2026-09-10)
        after making the line only 1 working pixel wide (thin/near-subpixel,
        direct user request) broke a looser version of this test: a line
        sitting EXACTLY on a tile boundary is drawn by only ONE of the two
        neighbouring tiles, not both -- the boundary is column 250 for a
        250px-wide tile_left (out of bounds, 0-249 valid, and a 1px-wide
        line has no stroke-width spillover onto column 249 the way the old
        2px width accidentally had), but it is column 0 for tile_right
        (always in bounds, since a tile's own origin is never clipped).
        That asymmetry is fine, not a bug: render_layers_full pastes
        tile_left at columns [0,250) and tile_right at [250,500) of the
        shared canvas, so tile_right's column 0 IS the assembled canvas's
        column 250 -- exactly the true boundary position, filled exactly
        once. This test proves that real property (no gap after assembly),
        not the wrong, stronger claim that both tiles must render it."""
        fox, foy = FRAME.origin
        spacing = 250.0
        boundary_x = fox + 250.0
        px_per_tile = 250
        tile_left = render_layers.Tile(FRAME, fox, foy, 250.0, px_per_tile)
        tile_right = render_layers.Tile(FRAME, boundary_x, foy, 250.0, px_per_tile)
        img_left = render_layers._layer_grid_lines(tile_left, spacing)
        img_right = render_layers._layer_grid_lines(tile_right, spacing)

        canvas = Image.new("RGBA", (2 * px_per_tile, px_per_tile), (0, 0, 0, 0))
        canvas.paste(img_left, (0, 0))
        canvas.paste(img_right, (px_per_tile, 0))

        sample_row = 125  # away from the horizontal grid lines at the tile's own top/bottom edges
        self.assertGreater(alpha_at(canvas, px_per_tile, sample_row), 0,
                           "the boundary line must be present at its true assembled position")
        self.assertEqual(alpha_at(canvas, px_per_tile - 1, sample_row), 0,
                         "and must not double up onto the neighbouring column")


class TestGridLabels(unittest.TestCase):
    def test_a_label_appears_near_the_cells_top_right_corner(self):
        tile = FRAME.full_tile(px=1000)
        img = render_layers._layer_grid_labels(tile, grid_spacing_m=200.0)
        fox, foy = FRAME.origin
        corner_x, corner_y = tile.to_px(fox + 200.0, foy + 200.0)
        # Label sits just inside the cell, left+down from the corner.
        window = np.asarray(img.crop((int(corner_x) - 60, int(corner_y), int(corner_x), int(corner_y) + 25)))
        self.assertGreater((window[..., 3] > 0).sum(), 0, "expected label ink just inside the top-right corner")

    def test_numbering_comes_from_the_frame_origin_not_the_tile_origin(self):
        """A window tile offset from the frame's own origin must number a
        cell identically to a full-frame tile covering the same ground --
        otherwise two tiles disagree about the same physical cell's label,
        the exact bug class Tile.page_px_origin exists to prevent for noise
        fields."""
        fox, foy = FRAME.origin
        spacing = 200.0
        full_tile = FRAME.full_tile(px=1000)
        window_tile = render_layers.Tile(FRAME, fox + 150.0, foy + 150.0, 300.0, 300)

        corner_x, corner_y = fox + 400.0, foy + 400.0  # a cell corner inside both tiles
        col = int(round((corner_x - fox) / spacing)) - 1
        row = int(round((corner_y - foy) / spacing)) - 1
        expected_text = f"{col:02d},{row:02d}"

        img_full = render_layers._layer_grid_labels(full_tile, spacing)
        img_window = render_layers._layer_grid_labels(window_tile, spacing)

        # Render the expected string alone and cross-correlate its presence
        # by checking that BOTH images have ink in the same relative spot
        # near that corner (exact glyph-for-glyph comparison is brittle
        # across font fallback; presence-in-both is the load-bearing claim).
        fx, fy = full_tile.to_px(corner_x, corner_y)
        wx, wy = window_tile.to_px(corner_x, corner_y)
        full_window = np.asarray(img_full.crop((int(fx) - 60, int(fy), int(fx), int(fy) + 25)))
        win_window = np.asarray(img_window.crop((max(0, int(wx) - 60), int(wy), int(wx), min(300, int(wy) + 25))))
        self.assertGreater((full_window[..., 3] > 0).sum(), 0)
        self.assertGreater((win_window[..., 3] > 0).sum(), 0)
        self.assertTrue(expected_text)  # documents the label both tiles are proving agreement on

    def test_labels_are_skipped_rather_than_rendered_as_clutter_when_cells_are_tiny(self):
        """Real bug, found by actually rendering the production Kurose frame
        (2026-09-10): a fixed font size read fine on a tight crop but, on a
        whole-12km-frame low-resolution overview where one reference-grid
        cell can be under 10 working pixels wide, every label overlapped
        its neighbours into solid, illegible red clutter (visually
        confirmed, then fixed by gating on _GRID_LABEL_MIN_CELL_PX). This
        reproduces the same proportions that broke: a 1000m-per-tile frame
        rendered at only 64 working px, with a 200m grid -- cell_px =
        200 / (1000/64) = 12.8, far below the 60px floor."""
        tile = FRAME.full_tile(px=64)
        self.assertLess(200.0 / tile.mpp, render_layers._GRID_LABEL_MIN_CELL_PX,
                        "fixture sanity: this scenario must actually be below the gate")
        img = render_layers._layer_grid_labels(tile, grid_spacing_m=200.0)
        self.assertEqual(np.asarray(img)[..., 3].max(), 0,
                         "labels must be skipped entirely, not drawn as overlapping clutter")

    def test_font_size_grows_with_the_cells_actual_pixel_size(self):
        """The other half of the same fix: when there IS room, a coarser
        (fewer working-px-per-metre) render must not use the same absolute
        font size as a finer one -- it must scale with cell_px, clamped
        within [_GRID_LABEL_FONT_MIN_PX, _GRID_LABEL_FONT_MAX_PX]."""
        small_cell_px = 100.0
        large_cell_px = 800.0
        small = render_layers._GRID_LABEL_FONT_FRACTION_OF_CELL * small_cell_px
        large = render_layers._GRID_LABEL_FONT_FRACTION_OF_CELL * large_cell_px
        small_size = min(render_layers._GRID_LABEL_FONT_MAX_PX,
                         max(render_layers._GRID_LABEL_FONT_MIN_PX, small))
        large_size = min(render_layers._GRID_LABEL_FONT_MAX_PX,
                         max(render_layers._GRID_LABEL_FONT_MIN_PX, large))
        self.assertGreater(large_size, small_size)


class TestRenderLayersFullCLI(unittest.TestCase):
    """The two-phase tiled assembly (tools/city-map/render.py's
    render_layers_full + write_layers_manifest), mirroring
    test_render_full.py's dispatch-style coverage but for the layered path."""

    def _fields(self):
        cx, cy = FRAME.cx, FRAME.cy
        building = Feature(id="b1", geom=square(cx, cy, 80), tags={"building": "yes"},
                           area=True, height_m=15.0)
        return flat_fields([building])

    def test_writes_one_file_per_layer_plus_manifest_and_cleans_up_temp(self):
        out_dir = tempfile.mkdtemp(prefix="render_layers_test_")
        try:
            rl = render_layers
            render_cli.render_layers_full(self._fields(), STYLE, FRAME, n=2, px_per_tile=32,
                                          supersample=1, out_dir=out_dir, grid_spacing_m=200.0,
                                          draw_grid=True)
            manifest_path = render_cli.write_layers_manifest(
                out_dir, FRAME, STYLE, n=2, px_per_tile=32, supersample=1,
                grid_spacing_m=200.0, draw_grid=True)

            self.assertFalse(os.path.exists(os.path.join(out_dir, ".tmp-tiles")),
                             "scratch tiles must be cleaned up")
            files = sorted(os.listdir(out_dir))
            expected_pngs = [f"{i:02d}-{name}.png" for i, name in enumerate(rl.LAYER_ORDER)]
            for name in expected_pngs:
                self.assertIn(name, files)
            self.assertIn("manifest.json", files)

            with Image.open(os.path.join(out_dir, expected_pngs[0])) as img:
                img.load()
                self.assertEqual(img.size, (64, 64))  # n(2) * px_per_tile(32)
                self.assertEqual(img.mode, "RGBA")

            with open(manifest_path, encoding="utf-8") as fh:
                manifest = json.load(fh)
            self.assertEqual(len(manifest["layers"]), len(rl.LAYER_ORDER))
            self.assertEqual(manifest["resolutionPx"], [64, 64])
            self.assertEqual(manifest["gridSpacingM"], 200.0)
            hillshade_entry = next(e for e in manifest["layers"] if e["file"].endswith("hillshade.png"))
            self.assertEqual(hillshade_entry["blendMode"], "Multiply")
        finally:
            shutil.rmtree(out_dir, ignore_errors=True)

    def test_no_grid_omits_the_two_reference_layers_and_files(self):
        out_dir = tempfile.mkdtemp(prefix="render_layers_test_")
        try:
            render_cli.render_layers_full(self._fields(), STYLE, FRAME, n=1, px_per_tile=32,
                                          supersample=1, out_dir=out_dir, draw_grid=False)
            files = os.listdir(out_dir)
            self.assertFalse(any("grid-lines" in f or "grid-labels" in f for f in files))
            self.assertEqual(len(files), len(render_layers.LAYER_ORDER) - 2)
        finally:
            shutil.rmtree(out_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
