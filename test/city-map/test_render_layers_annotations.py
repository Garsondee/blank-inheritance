"""Tests for the OSM annotation layers added 2026-09-11 -- barriers, power,
structures, historic, services, evacuation and neighbourhood labels -- plus
the parse.py change that makes them possible at all (tagged OSM nodes becoming
Point Features instead of being discarded).

Kept in its own file rather than bolted onto test_render_layers.py: that file
is about the decomposition of the ORIGINAL flattened render, and these layers
have no counterpart in render_tile to be checked against. Same fixture style
either way.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap import parse, render_layers  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.style import Style  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=4000.0, crs_epsg=6674, dem_grid=16)


def fields_with(features) -> Fields:
    return Fields(frame=FRAME, features=list(features), lamps=[],
                 elevation=np.full((16, 16), 10.0, dtype=np.float32),
                 shade_rgb=np.ones((16, 16, 3), dtype=np.float32), sea_depth_t=None,
                 dem_tiles_fetched=0, dem_tiles_missing=0)


def ink_count(img) -> int:
    return int((np.asarray(img)[..., 3] > 0).sum())


def alpha_at(img, x, y) -> int:
    return img.getpixel((int(x), int(y)))[3]


class TestNodesBecomePointFeatures(unittest.TestCase):
    """The parser change everything else here depends on."""

    def _parse(self, elements):
        class _Fwd:
            def transform(self, lon, lat):
                return (lon * 1000.0, lat * 1000.0)
        return parse.parse_elements(elements, _Fwd())

    def test_a_tagged_node_becomes_a_point_feature(self):
        features, _road, _rail, _lamps = self._parse([
            {"type": "node", "id": 11, "lon": 1.0, "lat": 2.0, "tags": {"power": "tower"}},
        ])
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0].geom.geom_type, "Point")
        self.assertFalse(features[0].area)
        self.assertEqual(features[0].tags["power"], "tower")

    def test_street_lamps_still_become_lamps_and_not_features(self):
        """Regression guard: lamps predate this change and become Foundry
        AmbientLights, not drawn features. A lamp must not be both."""
        features, _road, _rail, lamps = self._parse([
            {"type": "node", "id": 12, "lon": 1.0, "lat": 2.0, "tags": {"highway": "street_lamp"}},
        ])
        self.assertEqual(len(lamps), 1)
        self.assertEqual(features, [])

    def test_an_untagged_or_uninteresting_node_is_still_discarded(self):
        features, _road, _rail, lamps = self._parse([
            {"type": "node", "id": 13, "lon": 1.0, "lat": 2.0, "tags": {"crossing": "zebra"}},
            {"type": "node", "id": 14, "lon": 1.0, "lat": 2.0},
        ])
        self.assertEqual(features, [])
        self.assertEqual(lamps, [])

    def test_every_point_key_the_query_fetches_is_also_kept(self):
        """acquire fetches these node keys; parse must not silently drop one
        of them, or we pay the download and throw the data away."""
        from citymap import acquire
        for key in acquire.EXTRA_NODE_KEYS:
            self.assertIn(key, parse.POINT_FEATURE_KEYS, f"node key {key!r} fetched but dropped")


class TestLayerOrder(unittest.TestCase):
    def test_all_new_layers_are_in_layer_order_and_yielded(self):
        f = fields_with([])
        tile = FRAME.full_tile(px=64)
        layers = render_layers.render_tile_layers(f, STYLE, tile)
        for name in ("barriers", "power", "structures", "historic",
                     "services", "evacuation", "neighbourhoods"):
            self.assertIn(name, render_layers.LAYER_ORDER)
            self.assertIn(name, layers)
        self.assertEqual(tuple(layers.keys()), render_layers.LAYER_ORDER)

    def test_every_layer_has_a_blend_hint(self):
        for name in render_layers.LAYER_ORDER:
            self.assertIn(name, render_layers.LAYER_BLEND_HINTS)


class TestBarriers(unittest.TestCase):
    def _barrier(self, kind):
        cx, cy = FRAME.cx, FRAME.cy
        return Feature(id=f"b-{kind}", geom=LineString([(cx - 400, cy), (cx + 400, cy)]),
                       tags={"barrier": kind}, area=False)

    def test_a_wall_draws_heavier_than_a_fence(self):
        """Needs a FINE tile to show the difference at all: barrier widths are
        ground metres (3.0 vs 1.4), and at a coarse enough scale both clamp to
        the same 1 px minimum-width floor and draw identically -- correct
        behaviour, but it makes the weighting invisible. At 0.5 m/px they
        separate cleanly."""
        ox, oy = FRAME.origin
        tile = render_layers.Tile(FRAME, ox, oy, 400.0, 800)   # 0.5 m/px
        self.assertAlmostEqual(tile.mpp, 0.5, places=6, msg="fixture sanity")
        line = LineString([(ox + 40, oy + 200), (ox + 360, oy + 200)])
        wall = ink_count(render_layers._layer_barriers(
            STYLE, tile, [Feature(id="w", geom=line, tags={"barrier": "wall"}, area=False)]))
        fence = ink_count(render_layers._layer_barriers(
            STYLE, tile, [Feature(id="f", geom=line, tags={"barrier": "fence"}, area=False)]))
        self.assertGreater(wall, 0)
        self.assertGreater(wall, fence, "heavy barrier kinds must draw thicker than light ones")

    def test_kerbs_and_bollards_are_skipped(self):
        """They are barrier=* but they are street furniture, not structure --
        drawing them would bury the seawalls that matter."""
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_barriers(STYLE, tile, [self._barrier("kerb")])
        self.assertEqual(ink_count(img), 0)


class TestPower(unittest.TestCase):
    def test_a_power_line_draws_in_red(self):
        cx, cy = FRAME.cx, FRAME.cy
        line = Feature(id="pl", geom=LineString([(cx - 500, cy), (cx + 500, cy)]),
                       tags={"power": "line"}, area=False)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_power(STYLE, tile, [line])
        x, y = tile.to_px(cx, cy)
        r, g, b, a = img.getpixel((int(x), int(y)))
        self.assertGreater(a, 0)
        self.assertGreater(r, g + 40, "power must read as red, by direct request")
        self.assertGreater(r, b + 40)

    def test_a_pylon_node_draws_a_mark(self):
        cx, cy = FRAME.cx, FRAME.cy
        pylon = Feature(id="tw", geom=Point(cx, cy), tags={"power": "tower"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertGreater(ink_count(render_layers._layer_power(STYLE, tile, [pylon])), 0)

    def test_unrelated_features_draw_nothing(self):
        cx, cy = FRAME.cx, FRAME.cy
        road = Feature(id="r", geom=LineString([(cx - 500, cy), (cx + 500, cy)]),
                       tags={"highway": "primary"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertEqual(ink_count(render_layers._layer_power(STYLE, tile, [road])), 0)


class TestStructures(unittest.TestCase):
    def test_a_small_vertical_structure_gets_a_point_mark(self):
        cx, cy = FRAME.cx, FRAME.cy
        silo = Feature(id="s1", geom=Point(cx, cy), tags={"man_made": "silo"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertGreater(ink_count(render_layers._layer_structures(STYLE, tile, [silo])), 0)

    def test_a_linear_work_is_outlined_rather_than_marked(self):
        cx, cy = FRAME.cx, FRAME.cy
        pier = Feature(id="p1", geom=LineString([(cx - 300, cy), (cx + 300, cy)]),
                       tags={"man_made": "pier"}, area=False)
        tile = FRAME.full_tile(px=400)
        img = render_layers._layer_structures(STYLE, tile, [pier])
        # A drawn line spans the tile; a point mark would not.
        left = alpha_at(img, *tile.to_px(cx - 250, cy))
        right = alpha_at(img, *tile.to_px(cx + 250, cy))
        self.assertGreater(left, 0)
        self.assertGreater(right, 0)


class TestHistoric(unittest.TestCase):
    def test_a_shrine_node_is_marked(self):
        cx, cy = FRAME.cx, FRAME.cy
        shrine = Feature(id="h1", geom=Point(cx, cy),
                        tags={"historic": "wayside_shrine"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertGreater(ink_count(render_layers._layer_historic(STYLE, tile, [shrine])), 0)

    def test_historic_no_is_not_marked(self):
        cx, cy = FRAME.cx, FRAME.cy
        f = Feature(id="h2", geom=Point(cx, cy), tags={"historic": "no"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertEqual(ink_count(render_layers._layer_historic(STYLE, tile, [f])), 0)


class TestServicesAndEvacuation(unittest.TestCase):
    def test_a_hospital_is_marked_on_services(self):
        cx, cy = FRAME.cx, FRAME.cy
        hosp = Feature(id="a1", geom=Point(cx, cy), tags={"amenity": "hospital"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertGreater(ink_count(render_layers._layer_services(STYLE, tile, [hosp])), 0)

    def test_an_unmapped_amenity_is_ignored(self):
        cx, cy = FRAME.cx, FRAME.cy
        vending = Feature(id="a2", geom=Point(cx, cy),
                         tags={"amenity": "vending_machine"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertEqual(ink_count(render_layers._layer_services(STYLE, tile, [vending])), 0)

    def test_an_assembly_point_lands_on_evacuation(self):
        cx, cy = FRAME.cx, FRAME.cy
        pt = Feature(id="e1", geom=Point(cx, cy),
                    tags={"emergency": "assembly_point"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertGreater(ink_count(render_layers._layer_evacuation(STYLE, tile, [pt])), 0)

    def test_a_shelter_is_evacuation_only_and_never_double_marked(self):
        """amenity=shelter satisfies both layers' filters on the face of it.
        It must be claimed by evacuation alone, or the same point gets two
        different symbols stacked on top of each other."""
        cx, cy = FRAME.cx, FRAME.cy
        shelter = Feature(id="e2", geom=Point(cx, cy), tags={"amenity": "shelter"}, area=False)
        tile = FRAME.full_tile(px=400)
        self.assertGreater(ink_count(render_layers._layer_evacuation(STYLE, tile, [shelter])), 0)
        self.assertEqual(ink_count(render_layers._layer_services(STYLE, tile, [shelter])), 0)

    def test_evacuation_marks_are_green(self):
        cx, cy = FRAME.cx, FRAME.cy
        pt = Feature(id="e3", geom=Point(cx, cy),
                    tags={"emergency": "assembly_point"}, area=False)
        tile = FRAME.full_tile(px=400)
        arr = np.asarray(render_layers._layer_evacuation(STYLE, tile, [pt]))
        lit = arr[arr[..., 3] > 200]
        self.assertGreater(len(lit), 0)
        mean = lit[:, :3].mean(axis=0)
        self.assertGreater(mean[1], mean[0] + 20, "evacuation green, matching real signage")
        self.assertGreater(mean[1], mean[2] + 20)


class TestNeighbourhoodLabels(unittest.TestCase):
    def setUp(self):
        render_layers.clear_place_label_cache()

    def _place(self, fid, name, place, dx=0.0, dy=0.0, roman=None):
        tags = {"place": place, "name:ja": name}
        if roman:
            tags["name:en"] = roman
        return Feature(id=fid, geom=Point(FRAME.cx + dx, FRAME.cy + dy), tags=tags, area=False)

    def test_a_place_name_is_drawn(self):
        f = fields_with([self._place("p1", "神戸市", "city", roman="Kobe")])
        tile = FRAME.full_tile(px=600)
        self.assertGreater(ink_count(render_layers._layer_neighbourhoods(f, tile)), 0)

    def test_a_place_with_no_name_is_skipped(self):
        f = fields_with([Feature(id="p0", geom=Point(FRAME.cx, FRAME.cy),
                                tags={"place": "suburb"}, area=False)])
        tile = FRAME.full_tile(px=600)
        self.assertEqual(ink_count(render_layers._layer_neighbourhoods(f, tile)), 0)

    def test_cjk_is_measured_as_full_width(self):
        """The real bug this guards: CJK glyphs are one em each, and measuring
        them at Latin width under-sized the collision box by ~60%, so central
        Kobe's labels overlapped into mush on a real render."""
        self.assertAlmostEqual(render_layers._text_width_em("神戸市"), 3.0, places=6)
        latin = render_layers._text_width_em("Kobe")
        self.assertLess(latin, 3.0)
        self.assertGreater(latin, 1.5)

    # px=1200 over a 4 km frame is 3.33 m/px, which keeps even the smallest
    # rank used here above _PLACE_MIN_LABEL_PX -- otherwise these tests would
    # pass for the wrong reason (the legibility floor dropping the label
    # rather than the collision test rejecting it).
    COLLISION_PX = 1200

    def test_overlapping_labels_are_collision_rejected(self):
        """Two identical-rank places on top of each other: only one survives."""
        a = self._place("p1", "北野町", "neighbourhood")
        b = self._place("p2", "中央区", "neighbourhood", dx=1.0)
        f = fields_with([a, b])
        tile = FRAME.full_tile(px=self.COLLISION_PX)
        accepted = render_layers._accepted_place_labels(f, tile)
        self.assertEqual(len(accepted), 1)

    def test_the_more_important_place_wins_a_collision(self):
        city = self._place("p-city", "神戸市", "city")
        hamlet = self._place("p-ham", "小村", "hamlet", dx=1.0)
        f = fields_with([hamlet, city])   # deliberately unsorted on input
        tile = FRAME.full_tile(px=self.COLLISION_PX)
        accepted = render_layers._accepted_place_labels(f, tile)
        self.assertEqual(len(accepted), 1)
        self.assertEqual(accepted[0][2], "神戸市")

    def test_placement_is_identical_for_every_tile_of_one_render(self):
        """Seam safety. Placement is greedy, so if two tiles disagreed about
        which labels were accepted, a label could be drawn by one tile and
        omitted by its neighbour and tear in half at the join."""
        places = [self._place(f"p{i}", f"町{i}", "quarter", dx=i * 260.0, dy=(i % 3) * 240.0)
                 for i in range(14)]
        f = fields_with(places)
        whole = FRAME.full_tile(px=800)
        quadrant = render_layers.Tile(FRAME, FRAME.origin[0], FRAME.origin[1], 2000.0, 400)
        self.assertAlmostEqual(whole.mpp, quadrant.mpp, places=9, msg="fixture: same mpp")
        render_layers.clear_place_label_cache()
        a = render_layers._accepted_place_labels(f, whole)
        render_layers.clear_place_label_cache()
        b = render_layers._accepted_place_labels(f, quadrant)
        self.assertEqual(a, b)

    def test_labels_below_the_legibility_floor_are_skipped(self):
        f = fields_with([self._place("p1", "神戸市", "city")])
        tiny = FRAME.full_tile(px=24)   # ~167 m/px: a 170 m label is ~1 px tall
        self.assertEqual(ink_count(render_layers._layer_neighbourhoods(f, tiny)), 0)


if __name__ == "__main__":
    unittest.main()
