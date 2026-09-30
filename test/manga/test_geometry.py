"""geometry.py: millimetres, the spine side, the inner frame, panels in reading order, and the layout checks."""
import unittest

import support  # noqa: F401  (puts tools/manga on the path)
from mangapress import geometry

FMT = geometry.Format(trim_w=148, trim_h=210, bleed=3, top=15, bottom=15, outer=10, spine=16, gutter_side=2.5,
                      gutter_tier=5, frame=0.55, binding="right")


def page(number=3, tiers=None):
    return {"id": "p", "number": number, "panels": {}, "tiers": tiers or [
        {"height_mm": 90, "panels": [{"id": "A", "width_mm": 122}]},
        {"height_mm": 85, "panels": [{"id": "B", "width_mm": 70}, {"id": "C", "width_mm": 49.5}]},
    ]}


class TestUnits(unittest.TestCase):
    def test_254_dpi_is_ten_pixels_a_millimetre(self):
        self.assertAlmostEqual(geometry.px_per_mm(254), 10.0)

    def test_the_canvas_is_trim_plus_bleed_on_every_side(self):
        self.assertEqual(geometry.canvas_mm(FMT), (154, 216))


class TestSpine(unittest.TestCase):
    def test_a_right_bound_book_puts_odd_pages_on_the_left_with_the_spine_on_their_right(self):
        self.assertEqual(geometry.spine_side(FMT, 3), "right")
        self.assertEqual(geometry.spine_side(FMT, 4), "left")

    def test_a_left_bound_book_is_the_mirror(self):
        fmt = geometry.Format(**{**FMT.__dict__, "binding": "left"})
        self.assertEqual(geometry.spine_side(fmt, 3), "left")

    def test_the_wider_spine_margin_follows_the_spine(self):
        x0, _, x1, _ = geometry.inner_box(FMT, 3)       # spine on the right
        self.assertAlmostEqual(x0, 3 + 10)
        self.assertAlmostEqual(x1, 3 + 148 - 16)
        x0, _, x1, _ = geometry.inner_box(FMT, 4)       # spine on the left
        self.assertAlmostEqual(x0, 3 + 16)
        self.assertAlmostEqual(x1, 3 + 148 - 10)


class TestPanels(unittest.TestCase):
    def test_the_first_panel_in_a_tier_is_the_rightmost_and_is_read_first(self):
        rects, order = geometry.panel_rects(FMT, page())
        self.assertEqual(order, ["A", "B", "C"])
        self.assertGreater(rects["B"][0], rects["C"][0])
        self.assertAlmostEqual(rects["B"][2], geometry.inner_box(FMT, 3)[2])

    def test_tiers_run_top_to_bottom_with_the_tier_gap_between(self):
        rects, _ = geometry.panel_rects(FMT, page())
        self.assertAlmostEqual(rects["B"][1] - rects["A"][3], FMT.gutter_tier)


class TestLint(unittest.TestCase):
    def test_a_sound_layout_has_no_problems(self):
        self.assertEqual(geometry.lint(FMT, page()), [])

    def test_a_tier_that_does_not_fill_the_frame_is_reported(self):
        p = page(tiers=[{"height_mm": 180, "panels": [{"id": "A", "width_mm": 100}]}])
        self.assertTrue(any("tier 1 is 100.00 mm wide" in s for s in geometry.lint(FMT, p)))

    def test_gaps_that_line_up_from_tier_to_tier_are_reported(self):
        p = page(tiers=[
            {"height_mm": 87.5, "panels": [{"id": "A", "width_mm": 60}, {"id": "B", "width_mm": 59.5}]},
            {"height_mm": 87.5, "panels": [{"id": "C", "width_mm": 61}, {"id": "D", "width_mm": 58.5}]},
        ])
        self.assertTrue(any("line up" in s for s in geometry.lint(FMT, p)))

    def test_more_than_eight_panels_is_reported(self):
        tiers = [{"height_mm": 180 / 9 - 5 * 8 / 9, "panels": [{"id": f"P{i}", "width_mm": 122}]} for i in range(9)]
        self.assertTrue(any("9 panels" in s for s in geometry.lint(FMT, page(tiers=tiers))))

    def test_a_tier_gap_narrower_than_twice_the_side_gap_is_reported(self):
        fmt = geometry.Format(**{**FMT.__dict__, "gutter_tier": 3.0})
        p = page(tiers=[{"height_mm": 90, "panels": [{"id": "A", "width_mm": 122}]},
                        {"height_mm": 87, "panels": [{"id": "B", "width_mm": 122}]}])
        self.assertTrue(any("1.8 times" in s for s in geometry.lint(fmt, p)))


if __name__ == "__main__":
    unittest.main()
