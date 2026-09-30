"""A labelled crop of the painted map around one item.

See tools/gazetteer/crop.py's own docstring for why this exists: six manual
crop-and-render scripts in a single session, replaced with one real endpoint.

The window-sizing arithmetic (bounds_for_item, window_for_bounds) is pure and
tested directly. Actually rendering needs the real 12400x12400 painted PNG,
which is gitignored, so those tests skip loudly rather than fail on a fresh
clone -- design/testing-strategy.md rule 5.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

import crop  # noqa: E402


class TestBoundsForItem(unittest.TestCase):

    def test_a_polygons_bounds_is_its_bbox(self):
        item = {"geometry": {"kind": "polygon",
                            "ringPx": [[10, 20], [50, 20], [50, 80], [10, 80]]}}
        self.assertEqual(crop.bounds_for_item(item), (10, 20, 50, 80))

    def test_a_points_bounds_is_a_small_box_around_it(self):
        item = {"geometry": {"kind": "point", "pointPx": [500, 500]}}
        x0, y0, x1, y1 = crop.bounds_for_item(item)
        self.assertLess(x0, 500)
        self.assertGreater(x1, 500)
        self.assertLess(y0, 500)
        self.assertGreater(y1, 500)

    def test_too_few_points_raises_rather_than_a_degenerate_crop(self):
        item = {"geometry": {"kind": "polygon", "ringPx": [[1, 1]]}}
        with self.assertRaises(crop.CropError):
            crop.bounds_for_item(item)


class TestWindowForBounds(unittest.TestCase):

    def test_the_window_is_centred_on_the_bbox(self):
        window = crop.window_for_bounds((100, 100, 200, 140), min_window=0, max_window=10000)
        x0, y0, x1, y1 = window
        self.assertAlmostEqual((x0 + x1) / 2, 150)
        self.assertAlmostEqual((y0 + y1) / 2, 120)

    def test_the_window_is_square(self):
        x0, y0, x1, y1 = crop.window_for_bounds((0, 0, 300, 10),
                                                 min_window=0, max_window=10000)
        self.assertAlmostEqual(x1 - x0, y1 - y0)

    def test_context_padding_widens_the_window(self):
        tight = crop.window_for_bounds((0, 0, 100, 100), context_fraction=0.0,
                                       min_window=0, max_window=10000)
        padded = crop.window_for_bounds((0, 0, 100, 100), context_fraction=0.5,
                                        min_window=0, max_window=10000)
        self.assertGreater(padded[2] - padded[0], tight[2] - tight[0])

    def test_a_tiny_shape_is_floored_to_the_minimum_window(self):
        x0, y0, x1, y1 = crop.window_for_bounds((0, 0, 5, 5), min_window=120)
        self.assertGreaterEqual(x1 - x0, 120)

    def test_a_huge_region_is_capped_to_the_maximum_window(self):
        x0, y0, x1, y1 = crop.window_for_bounds((0, 0, 50000, 50000), max_window=3000)
        self.assertLessEqual(x1 - x0, 3000 + 1e-6)


@unittest.skipUnless(os.path.exists(crop.DEFAULT_IMAGE),
                     "the painted map is gitignored and not present")
class TestRenderAgainstTheRealMap(unittest.TestCase):

    def test_a_real_site_renders_to_the_requested_output_size(self):
        item = {"geometry": {"kind": "polygon",
                            "ringPx": [[6800, 5400], [6900, 5400], [6900, 5500], [6800, 5500]]}}
        image = crop.render(item, output_px=400)
        self.assertEqual(max(image.size), 400)

    def test_a_real_point_renders_without_error(self):
        item = {"geometry": {"kind": "point", "pointPx": [6800, 5400]}}
        image = crop.render(item, output_px=200)
        self.assertEqual(max(image.size), 200)

    def test_render_to_bytes_produces_a_real_png(self):
        item = {"geometry": {"kind": "polygon",
                            "ringPx": [[6800, 5400], [6900, 5400], [6900, 5500], [6800, 5500]]}}
        data = crop.render_to_bytes(item, output_px=200)
        self.assertTrue(data.startswith(b"\x89PNG"))


class TestMissingMap(unittest.TestCase):

    def test_a_missing_map_raises_a_clear_error_not_a_blank_image(self):
        item = {"geometry": {"kind": "polygon",
                            "ringPx": [[0, 0], [10, 0], [10, 10], [0, 10]]}}
        with self.assertRaises(crop.CropError):
            crop.render(item, image_path="no-such-file-anywhere.png")


if __name__ == "__main__":
    unittest.main()
