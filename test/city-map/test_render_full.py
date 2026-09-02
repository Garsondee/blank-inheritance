"""render_full (tools/city-map/render.py, the top-level CLI's tiled-export
helper) window-crop tests.

This is the actual fix for the "trying to render the entire island, there
is no cropped section" bug report: the editor's "Full" render mode used to
always tile the WHOLE frame (Frame.grid_tiles), with no way to scope a
high-resolution render to the area someone is actually looking at. Frame's
own tiling geometry (window_grid_tiles) is covered in test_frame.py; this
file is specifically about render_full's dispatch -- that a `window` arg
is actually forwarded to the windowed tiler rather than silently falling
back to the whole-frame one.
"""

import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402

import render as render_cli  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.style import Style  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=4000.0, crs_epsg=6674, dem_grid=16)


def flat_fields(dem_grid=16) -> Fields:
    elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
    shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
    return Fields(frame=FRAME, features=[], lamps=[], elevation=elevation,
                 shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


class TestRenderFullNoWindowUnchanged(unittest.TestCase):
    """Regression: the CLI's existing --mode full (no crop) must keep tiling
    the whole frame exactly as before."""

    def test_covers_the_whole_frame_by_default(self):
        img = render_cli.render_full(flat_fields(), STYLE, FRAME, n=2, px_per_tile=16, supersample=1)
        self.assertEqual(img.size, (32, 32))

    def test_dispatches_to_grid_tiles_not_window_grid_tiles(self):
        with mock.patch.object(Frame, "grid_tiles", autospec=True,
                               side_effect=Frame.grid_tiles) as gt, \
             mock.patch.object(Frame, "window_grid_tiles", autospec=True,
                               side_effect=Frame.window_grid_tiles) as wgt:
            render_cli.render_full(flat_fields(), STYLE, FRAME, n=2, px_per_tile=16, supersample=1)
        gt.assert_called_once_with(FRAME, 2, 16, 1)
        wgt.assert_not_called()


class TestRenderFullWindowCrop(unittest.TestCase):
    """The fix: a `window=(lon, lat, extent_m)` arg must scope the tile grid
    to that crop instead of the whole frame."""

    def test_dispatches_to_window_grid_tiles_not_grid_tiles(self):
        with mock.patch.object(Frame, "grid_tiles", autospec=True,
                               side_effect=Frame.grid_tiles) as gt, \
             mock.patch.object(Frame, "window_grid_tiles", autospec=True,
                               side_effect=Frame.window_grid_tiles) as wgt:
            render_cli.render_full(flat_fields(), STYLE, FRAME, n=2, px_per_tile=16, supersample=1,
                                   window=(135.205, 34.678, 500.0))
        wgt.assert_called_once_with(FRAME, 135.205, 34.678, 500.0, 2, 16, 1)
        gt.assert_not_called()

    def test_output_canvas_size_matches_tile_grid_regardless_of_crop_size(self):
        """A 500m crop and a 4000m (whole-frame) request must both produce
        an n*px_per_tile canvas -- crop size changes what's IN the image,
        not its pixel dimensions."""
        cropped = render_cli.render_full(flat_fields(), STYLE, FRAME, n=2, px_per_tile=16,
                                         supersample=1, window=(135.205, 34.678, 500.0))
        whole = render_cli.render_full(flat_fields(), STYLE, FRAME, n=2, px_per_tile=16, supersample=1)
        self.assertEqual(cropped.size, whole.size)

    def test_on_tile_fires_once_per_tile_in_the_windowed_grid(self):
        seen = []
        render_cli.render_full(flat_fields(), STYLE, FRAME, n=2, px_per_tile=16, supersample=1,
                               on_tile=lambda done, total: seen.append((done, total)),
                               window=(135.205, 34.678, 500.0))
        self.assertEqual(seen, [(1, 4), (2, 4), (3, 4), (4, 4)])

    def test_crop_extent_is_smaller_than_the_frame_extent(self):
        """Sanity check tying this back to the bug report: the crop this
        test exercises is genuinely a crop, not accidentally the whole
        frame in disguise."""
        self.assertLess(500.0, FRAME.extent_m)


if __name__ == "__main__":
    unittest.main()
