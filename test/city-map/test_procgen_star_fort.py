"""procgen.star_fort tests: the Fort Wall tool -- a drawn perimeter turned
into a bastioned star-fort trace, extruded into a wall, broken up by pylons.
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import Point, Polygon  # noqa: E402

from citymap.editor.design_preview import render_design_preview  # noqa: E402
from citymap.editor.procgen import star_fort  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.style import Style  # noqa: E402

SQUARE = [(-60.0, -60.0), (60.0, -60.0), (60.0, 60.0), (-60.0, 60.0)]

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))
FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674, dem_grid=16)


def flat_fields(dem_grid=16) -> Fields:
    elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
    shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
    return Fields(frame=FRAME, features=[], lamps=[], elevation=elevation,
                 shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


class TestBastionedOutline(unittest.TestCase):
    def test_four_points_per_input_edge(self):
        outline = star_fort.bastioned_outline(SQUARE)
        self.assertEqual(len(outline), 4 * len(SQUARE))

    def test_bastion_tips_project_further_from_centroid_than_the_original_edge(self):
        outline = star_fort.bastioned_outline(SQUARE, bastion_depth_m=20.0)
        centroid = Point(0, 0)
        # every 3rd point starting at index 2 is a tip (p0, flank0, TIP, flank1)
        tips = outline[2::4]
        self.assertEqual(len(tips), len(SQUARE))
        for tip in tips:
            self.assertGreater(Point(tip).distance(centroid), 60.0,
                              "a bastion tip must sit further out than the original edge (at 60m)")

    def test_flank_points_lie_on_the_original_edge(self):
        outline = star_fort.bastioned_outline(SQUARE, flank_fraction=0.3)
        # first edge is SQUARE[0] -> SQUARE[1], a horizontal line at y=-60
        flank0 = outline[1]
        self.assertAlmostEqual(flank0[1], -60.0, places=6)
        self.assertAlmostEqual(flank0[0], -60.0 + 120.0 * 0.3, places=6)

    def test_bigger_bastion_depth_projects_further_out(self):
        shallow = star_fort.bastioned_outline(SQUARE, bastion_depth_m=5.0)
        deep = star_fort.bastioned_outline(SQUARE, bastion_depth_m=40.0)
        centroid = Point(0, 0)
        self.assertLess(Point(shallow[2]).distance(centroid), Point(deep[2]).distance(centroid))

    def test_rejects_a_degenerate_perimeter(self):
        with self.assertRaises(ValueError):
            star_fort.bastioned_outline([(0, 0), (1, 1)])


class TestFortWall(unittest.TestCase):
    def test_one_wall_part_per_outline_edge(self):
        parts = star_fort.fort_wall(SQUARE)
        outline_len = len(star_fort.bastioned_outline(SQUARE))
        walls = [p for p in parts if p.tags.get("barrier") == "wall"]
        self.assertEqual(len(walls), outline_len)

    def test_every_part_is_double_tagged_with_building(self):
        """The actual bug this tool was built to not repeat: a part with
        only a semantic tag (barrier=wall) renders as nothing at all."""
        parts = star_fort.fort_wall(SQUARE)
        for part in parts:
            self.assertIn("building", part.tags,
                         f"part {part.tags} has no building tag -- it will render as invisible")

    def test_pylon_count_scales_with_spacing(self):
        sparse = star_fort.fort_wall(SQUARE, pylon_spacing_m=200.0)
        dense = star_fort.fort_wall(SQUARE, pylon_spacing_m=30.0)
        sparse_pylons = [p for p in sparse if p.tags.get("man_made") == "pylon"]
        dense_pylons = [p for p in dense if p.tags.get("man_made") == "pylon"]
        self.assertLess(len(sparse_pylons), len(dense_pylons))

    def test_pylons_sit_on_the_bastioned_trace_not_the_plain_input_polygon(self):
        parts = star_fort.fort_wall(SQUARE, bastion_depth_m=30.0, pylon_spacing_m=25.0)
        outline_ring_points = star_fort.bastioned_outline(SQUARE, bastion_depth_m=30.0)
        from shapely.geometry import LinearRing
        ring = LinearRing(outline_ring_points + [outline_ring_points[0]])
        pylons = [p for p in parts if p.tags.get("man_made") == "pylon"]
        self.assertGreater(len(pylons), 0)
        for pylon in pylons:
            centre = Polygon(pylon.footprint).centroid
            self.assertLess(ring.distance(centre), 1.0)

    def test_walls_have_real_thickness(self):
        parts = star_fort.fort_wall(SQUARE, wall_thickness_m=6.0)
        walls = [p for p in parts if p.tags.get("barrier") == "wall"]
        for wall in walls:
            self.assertGreater(Polygon(wall.footprint).area, 0.0)


class TestFortWallActuallyRenders(unittest.TestCase):
    """Regression guard for the exact failure caught by eye this session:
    geometrically correct parts that put zero ink on the actual image.
    Direct pixel check, not just 'the function returned something'."""

    def test_produces_visible_ink_covering_a_real_fraction_of_the_preview(self):
        parts = star_fort.fort_wall(SQUARE, bastion_depth_m=25.0, pylon_spacing_m=40.0)
        img = render_design_preview(parts, (135.205, 34.678), FRAME, STYLE,
                                    flat_fields(), extent_m=400.0, mpp=1.0)
        arr = np.asarray(img)
        paper = np.array(STYLE.colour("paper"))
        non_paper_fraction = np.mean(np.any(arr != paper, axis=-1))
        self.assertGreater(non_paper_fraction, 0.02,
                          "a fort wall spanning most of a 400m preview must leave real ink, "
                          "not render as an empty page")


if __name__ == "__main__":
    unittest.main()
