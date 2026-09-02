"""design_preview.render_design_preview tests: the fast local iteration
loop a draft compound gets designed through before ever becoming a real
saved Template.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402

from citymap.editor.design_preview import render_design_preview  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops.construct import TemplatePart  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.style import Style  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))
FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674, dem_grid=16)


def flat_fields(dem_grid=16) -> Fields:
    elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
    shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
    return Fields(frame=FRAME, features=[], lamps=[], elevation=elevation,
                 shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


def square_part(half=20.0, height_m=15.0, tags=None):
    return TemplatePart(
        tags=tags or {"building": "yes"}, height_m=height_m,
        footprint=[(-half, -half), (half, -half), (half, half), (-half, half)])


class TestRenderDesignPreview(unittest.TestCase):
    def test_returns_an_image_of_the_requested_size(self):
        img = render_design_preview([square_part()], (135.205, 34.678), FRAME, STYLE,
                                    flat_fields(), extent_m=200.0, mpp=1.0)
        self.assertEqual(img.size, (200, 200))

    def test_the_draft_part_actually_appears_in_the_render(self):
        blank = render_design_preview([], (135.205, 34.678), FRAME, STYLE,
                                      flat_fields(), extent_m=200.0, mpp=1.0)
        with_part = render_design_preview([square_part()], (135.205, 34.678), FRAME, STYLE,
                                          flat_fields(), extent_m=200.0, mpp=1.0)
        self.assertFalse(np.array_equal(np.asarray(blank), np.asarray(with_part)),
                         "adding a draft part must change the rendered pixels")

    def test_context_features_are_drawn_alongside_the_draft(self):
        cx, cy = FRAME.cx + 300.0, FRAME.cy + 300.0  # well outside the 200m preview window
        far_building = Feature(id="ctx-1", geom=Polygon(
            [(cx - 10, cy - 10), (cx + 10, cy - 10), (cx + 10, cy + 10), (cx - 10, cy + 10)]),
            tags={"building": "yes"}, area=True, height_m=12.0)
        without_ctx = render_design_preview([square_part()], (135.205, 34.678), FRAME, STYLE,
                                            flat_fields(), extent_m=1000.0, mpp=2.0)
        with_ctx = render_design_preview([square_part()], (135.205, 34.678), FRAME, STYLE,
                                         flat_fields(), extent_m=1000.0, mpp=2.0,
                                         context_features=[far_building])
        self.assertFalse(np.array_equal(np.asarray(without_ctx), np.asarray(with_ctx)),
                         "a context feature within the (larger) preview window must render too")

    def test_rotation_actually_rotates_the_footprint(self):
        rect = TemplatePart(tags={"building": "yes"}, height_m=15.0,
                            footprint=[(-40, -5), (40, -5), (40, 5), (-40, 5)])
        unrotated = render_design_preview([rect], (135.205, 34.678), FRAME, STYLE,
                                          flat_fields(), extent_m=200.0, mpp=1.0, rotation_deg=0.0)
        rotated = render_design_preview([rect], (135.205, 34.678), FRAME, STYLE,
                                        flat_fields(), extent_m=200.0, mpp=1.0, rotation_deg=90.0)
        self.assertFalse(np.array_equal(np.asarray(unrotated), np.asarray(rotated)))

    def test_saves_to_out_path_when_given(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out_path = os.path.join(tmp, "preview.png")
            render_design_preview([square_part()], (135.205, 34.678), FRAME, STYLE,
                                  flat_fields(), extent_m=200.0, mpp=1.0, out_path=out_path)
            self.assertTrue(os.path.isfile(out_path))
            self.assertGreater(os.path.getsize(out_path), 0)

    def test_original_fields_object_is_not_mutated(self):
        fields = flat_fields()
        original_feature_count = len(fields.features)
        render_design_preview([square_part()], (135.205, 34.678), FRAME, STYLE,
                              fields, extent_m=200.0, mpp=1.0)
        self.assertEqual(len(fields.features), original_feature_count)


if __name__ == "__main__":
    unittest.main()
