"""Drawing-primitive tests -- chiefly the hole-fill regression.

THE BUG THIS PINS DOWN (2026-08-23): Kobe Airport rendered underwater. The sea
is one polygon with an interior ring for every island carved out of it; the
airport is reachable only by a single bridge, so carving it produced a genuine
hole. `ImageDraw.polygon` has no concept of an interior ring, so the flat sea
fill painted over the hole and drowned the airfield.

It survived several rounds of debugging because every geometric test passed --
the airport really was outside the sea polygon by 150+ m, provably. The fault
was entirely in rasterisation. So these tests check PIXELS, not geometry: they
render and then sample. A geometry-only test would have passed against the
broken code.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from PIL import Image, ImageDraw  # noqa: E402
from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap import draw  # noqa: E402
from citymap.frame import Frame  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
              rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674)

SEA = (156, 180, 190)
PAPER = (234, 229, 214)


def _square_around_centre(half_m):
    cx, cy = FRAME.cx, FRAME.cy
    return [(cx - half_m, cy - half_m), (cx + half_m, cy - half_m),
            (cx + half_m, cy + half_m), (cx - half_m, cy + half_m)]


def ring_with_island():
    """A big 'sea' square with a smaller 'island' hole punched in the middle."""
    return Polygon(_square_around_centre(400), [_square_around_centre(100)])


class TestHoleAwareFill(unittest.TestCase):
    def setUp(self):
        self.tile = FRAME.full_tile(px=200)

    def test_island_hole_is_not_filled(self):
        """The regression, asserted in pixels."""
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        draw.fill_polygon(image, ring_with_island(), self.tile, SEA)

        centre = image.getpixel((self.tile.px // 2, self.tile.px // 2))
        self.assertEqual(centre, PAPER,
                         "the island (interior ring) must NOT be painted sea -- "
                         "this is the bug that put Kobe Airport underwater")

    def test_the_sea_around_the_island_is_filled(self):
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        draw.fill_polygon(image, ring_with_island(), self.tile, SEA)
        # A point between the island edge (100 m) and the sea edge (400 m).
        x, y = self.tile.to_px(FRAME.cx + 250, FRAME.cy)
        self.assertEqual(image.getpixel((int(x), int(y))), SEA)

    def test_outside_the_polygon_is_untouched(self):
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        draw.fill_polygon(image, ring_with_island(), self.tile, SEA)
        self.assertEqual(image.getpixel((2, 2)), PAPER)

    def test_naive_exterior_only_fill_would_have_drowned_the_island(self):
        """Demonstrates the old behaviour, so the regression cannot silently return."""
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        drawer = ImageDraw.Draw(image)
        exterior = [self.tile.to_px(x, y) for x, y in ring_with_island().exterior.coords]
        drawer.polygon(exterior, fill=SEA)   # what the old code did
        centre = image.getpixel((self.tile.px // 2, self.tile.px // 2))
        self.assertEqual(centre, SEA, "old exterior-only fill drowns the island")

    def test_solid_polygon_still_fills_completely(self):
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        solid = Polygon(_square_around_centre(400))
        draw.fill_polygon(image, solid, self.tile, SEA)
        self.assertEqual(image.getpixel((self.tile.px // 2, self.tile.px // 2)), SEA)

    def test_multipolygon_with_mixed_holes(self):
        from shapely.ops import unary_union
        cx, cy = FRAME.cx, FRAME.cy
        holed = Polygon(
            [(cx - 400, cy - 400), (cx - 100, cy - 400), (cx - 100, cy - 100), (cx - 400, cy - 100)],
            [[(cx - 300, cy - 300), (cx - 200, cy - 300), (cx - 200, cy - 200), (cx - 300, cy - 200)]],
        )
        solid = Polygon([(cx + 100, cy + 100), (cx + 400, cy + 100),
                         (cx + 400, cy + 400), (cx + 100, cy + 400)])
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        draw.fill_polygon(image, unary_union([holed, solid]), self.tile, SEA)

        hx, hy = self.tile.to_px(cx - 250, cy - 250)
        self.assertEqual(image.getpixel((int(hx), int(hy))), PAPER, "hole must survive")
        sx, sy = self.tile.to_px(cx + 250, cy + 250)
        self.assertEqual(image.getpixel((int(sx), int(sy))), SEA, "solid must fill")

    def test_empty_geometry_is_a_no_op(self):
        image = Image.new("RGB", (self.tile.px,) * 2, PAPER)
        draw.fill_polygon(image, Polygon(), self.tile, SEA)
        self.assertEqual(image.getpixel((10, 10)), PAPER)


class TestPolygonMask(unittest.TestCase):
    def test_mask_is_zero_in_holes(self):
        tile = FRAME.full_tile(px=200)
        mask = draw.polygon_mask(ring_with_island(), tile)
        self.assertEqual(mask.getpixel((tile.px // 2, tile.px // 2)), 0)
        x, y = tile.to_px(FRAME.cx + 250, FRAME.cy)
        self.assertEqual(mask.getpixel((int(x), int(y))), 255)


class TestStrokeRings(unittest.TestCase):
    def test_interior_rings_are_stroked(self):
        """Islands are interior rings; an exterior-only stroke omits their shores."""
        tile = FRAME.full_tile(px=200)
        image = Image.new("RGB", (tile.px,) * 2, PAPER)
        drawer = ImageDraw.Draw(image)
        draw.stroke_rings(drawer, ring_with_island(), tile, (0, 0, 0), 3)

        # Walk the island's own edge and look for ink.
        found = False
        for offset in range(-6, 7):
            x, y = tile.to_px(FRAME.cx + 100, FRAME.cy + offset)
            if image.getpixel((int(x), int(y))) != PAPER:
                found = True
                break
        self.assertTrue(found, "the island's own shoreline must be stroked")


class TestDrawLine(unittest.TestCase):
    def test_round_caps_extend_past_the_endpoint(self):
        tile = FRAME.full_tile(px=200)
        line = LineString([(FRAME.cx - 200, FRAME.cy), (FRAME.cx, FRAME.cy)])

        plain = Image.new("RGB", (tile.px,) * 2, PAPER)
        draw.draw_line(ImageDraw.Draw(plain), line, tile, (0, 0, 0), 9, round_caps=False)
        capped = Image.new("RGB", (tile.px,) * 2, PAPER)
        draw.draw_line(ImageDraw.Draw(capped), line, tile, (0, 0, 0), 9, round_caps=True)

        ink = lambda im: sum(  # noqa: E731
            1 for px in im.getdata() if px != PAPER)
        self.assertGreater(ink(capped), ink(plain),
                           "round caps must add ink at the termini")

    def test_handles_multilinestring(self):
        from shapely.ops import unary_union
        tile = FRAME.full_tile(px=100)
        image = Image.new("RGB", (tile.px,) * 2, PAPER)
        multi = unary_union([
            LineString([(FRAME.cx - 300, FRAME.cy - 100), (FRAME.cx, FRAME.cy - 100)]),
            LineString([(FRAME.cx, FRAME.cy + 100), (FRAME.cx + 300, FRAME.cy + 100)]),
        ])
        draw.draw_line(ImageDraw.Draw(image), multi, tile, (0, 0, 0), 3)
        self.assertLess(sum(1 for px in image.getdata() if px == PAPER),
                        tile.px * tile.px, "something must have been drawn")


class TestDrawTaperedLine(unittest.TestCase):
    """2026-08-24, direct user request: a river must taper to a point at its
    source, which a single fixed-width draw_line cannot represent at all."""

    def _ink_width_px(self, image, x_px):
        """Count non-paper pixels in the vertical column at x_px -- the
        rendered stroke's width, in pixels, at that point along the line."""
        h = image.size[1]
        x_px = max(0, min(image.size[0] - 1, int(round(x_px))))
        return sum(1 for y in range(h) if image.getpixel((x_px, y)) != PAPER)

    def test_width_grows_from_the_start_toward_the_end(self):
        tile = FRAME.full_tile(px=200)
        # a horizontal line so "width" reads as a vertical ink count at each x
        p0, p1, p2 = (FRAME.cx - 400, FRAME.cy), (FRAME.cx, FRAME.cy), (FRAME.cx + 400, FRAME.cy)
        line = LineString([p0, p1, p2])
        image = Image.new("RGB", (tile.px,) * 2, PAPER)
        draw.draw_tapered_line(ImageDraw.Draw(image), line, tile, (0, 0, 0), [0.0, 40.0, 40.0])

        x_near_start, _ = tile.to_px(*p0)
        x_near_end, _ = tile.to_px(*p2)
        near_start = self._ink_width_px(image, x_near_start + 3)
        near_end = self._ink_width_px(image, x_near_end - 3)
        self.assertLess(near_start, near_end,
                        "the tapered end must render visibly narrower than the full-width end")

    def test_zero_width_endpoint_draws_almost_no_ink_right_at_the_tip(self):
        tile = FRAME.full_tile(px=200)
        p0, p1 = (FRAME.cx - 400, FRAME.cy), (FRAME.cx + 400, FRAME.cy)
        line = LineString([p0, p1])
        image = Image.new("RGB", (tile.px,) * 2, PAPER)
        draw.draw_tapered_line(ImageDraw.Draw(image), line, tile, (0, 0, 0), [0.0, 60.0])
        x0, _ = tile.to_px(*p0)
        self.assertLessEqual(self._ink_width_px(image, x0), 1,
                             "a literal 0-width start must read as sub-pixel, not a visible band")

    def test_uniform_widths_look_like_draw_line(self):
        """A degenerate case (every width equal) must still draw a
        continuous, reasonably solid line -- not vanish or leave gaps."""
        tile = FRAME.full_tile(px=200)
        p0, p1, p2 = (FRAME.cx - 400, FRAME.cy), (FRAME.cx, FRAME.cy), (FRAME.cx + 400, FRAME.cy)
        line = LineString([p0, p1, p2])
        image = Image.new("RGB", (tile.px,) * 2, PAPER)
        draw.draw_tapered_line(ImageDraw.Draw(image), line, tile, (0, 0, 0), [30.0, 30.0, 30.0])
        for p in (p0, p1, p2):
            x, _ = tile.to_px(*p)
            self.assertGreater(self._ink_width_px(image, x), 0, f"gap in the ribbon near {p}")

    def test_mismatched_widths_length_is_a_silent_no_op(self):
        """geom and widths_m must correspond 1:1 -- a caller bug (wrong
        length) should not paint garbage silently."""
        tile = FRAME.full_tile(px=100)
        line = LineString([(FRAME.cx - 100, FRAME.cy), (FRAME.cx, FRAME.cy), (FRAME.cx + 100, FRAME.cy)])
        image = Image.new("RGB", (tile.px,) * 2, PAPER)
        draw.draw_tapered_line(ImageDraw.Draw(image), line, tile, (0, 0, 0), [10.0, 10.0])  # only 2, needs 3
        self.assertTrue(all(px == PAPER for px in image.getdata()))


class TestShadowLayerHoles(unittest.TestCase):
    def test_hole_in_a_shadow_stays_open(self):
        tile = FRAME.full_tile(px=200)
        layer = Image.new("RGBA", (tile.px,) * 2, (0, 0, 0, 0))
        draw.fill_polygon_rgba(layer, ring_with_island(), tile, (38, 32, 28, 92))
        self.assertEqual(layer.getpixel((tile.px // 2, tile.px // 2))[3], 0,
                         "a courtyard inside a swept shadow must not be shaded")
        x, y = tile.to_px(FRAME.cx + 250, FRAME.cy)
        self.assertGreater(layer.getpixel((int(x), int(y)))[3], 0)


if __name__ == "__main__":
    unittest.main()
