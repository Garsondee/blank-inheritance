"""procgen.perimeter tests: turning a site's drawn boundary into a fence,
wall, or rampart.
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import Polygon  # noqa: E402

from citymap.editor.procgen import perimeter  # noqa: E402

SQUARE = [(-50.0, -50.0), (50.0, -50.0), (50.0, 50.0), (-50.0, 50.0)]  # 200m perimeter


class TestChainLinkFence(unittest.TestCase):
    def test_returns_a_single_line_part_matching_the_input(self):
        parts = perimeter.perimeter(SQUARE, style="chain_link_fence")
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0].kind, "line")
        self.assertEqual(parts[0].footprint, SQUARE)

    def test_is_the_default_style(self):
        default = perimeter.perimeter(SQUARE)
        explicit = perimeter.perimeter(SQUARE, style="chain_link_fence")
        self.assertEqual(default, explicit)


class TestConcreteWall(unittest.TestCase):
    def test_one_area_part_per_edge(self):
        parts = perimeter.perimeter(SQUARE, style="concrete_wall")
        self.assertEqual(len(parts), len(SQUARE))
        self.assertTrue(all(p.kind == "area" for p in parts))

    def test_wall_segments_are_centred_on_the_original_edges(self):
        parts = perimeter.perimeter(SQUARE, style="concrete_wall")
        n = len(SQUARE)
        for i, part in enumerate(parts):
            x0, y0 = SQUARE[i]
            x1, y1 = SQUARE[(i + 1) % n]
            edge_mid = ((x0 + x1) / 2.0, (y0 + y1) / 2.0)
            part_centroid = Polygon(part.footprint).centroid
            self.assertAlmostEqual(part_centroid.x, edge_mid[0], places=3)
            self.assertAlmostEqual(part_centroid.y, edge_mid[1], places=3)

    def test_has_real_thickness_not_a_degenerate_sliver(self):
        parts = perimeter.perimeter(SQUARE, style="concrete_wall")
        for part in parts:
            poly = Polygon(part.footprint)
            self.assertGreater(poly.area, 0.0)


class TestStoneRampart(unittest.TestCase):
    def test_includes_wall_segments_plus_towers(self):
        parts = perimeter.perimeter(SQUARE, style="stone_rampart", tower_spacing_m=100.0)
        walls = [p for p in parts if p.tags.get("barrier") == "wall"]
        towers = [p for p in parts if p.tags.get("military") == "tower"]
        self.assertEqual(len(walls), len(SQUARE))
        self.assertGreater(len(towers), 0)

    def test_tower_count_scales_with_perimeter_over_spacing(self):
        # SQUARE's perimeter is 200m
        sparse = perimeter.perimeter(SQUARE, style="stone_rampart", tower_spacing_m=200.0)
        dense = perimeter.perimeter(SQUARE, style="stone_rampart", tower_spacing_m=40.0)
        sparse_towers = [p for p in sparse if p.tags.get("military") == "tower"]
        dense_towers = [p for p in dense if p.tags.get("military") == "tower"]
        self.assertLess(len(sparse_towers), len(dense_towers))

    def test_towers_are_taller_than_the_wall_they_sit_on(self):
        parts = perimeter.perimeter(SQUARE, style="stone_rampart")
        wall_h = next(p.height_m for p in parts if p.tags.get("barrier") == "wall")
        tower_h = next(p.height_m for p in parts if p.tags.get("military") == "tower")
        self.assertGreater(tower_h, wall_h)

    def test_towers_sit_on_the_boundary_not_off_in_space(self):
        """Every tower's centre must lie on (or extremely close to) the
        drawn ring -- proof interpolate() is being walked along the real
        boundary, not some unrelated coordinate space."""
        parts = perimeter.perimeter(SQUARE, style="stone_rampart", tower_spacing_m=100.0)
        boundary = Polygon(SQUARE).exterior
        towers = [p for p in parts if p.tags.get("military") == "tower"]
        for tower in towers:
            centre = Polygon(tower.footprint).centroid
            self.assertLess(boundary.distance(centre), 1.0)


class TestInvalidStyle(unittest.TestCase):
    def test_unknown_style_raises(self):
        with self.assertRaises(ValueError):
            perimeter.perimeter(SQUARE, style="laser_fence")


class TestWallsAreVisible(unittest.TestCase):
    """map-editor plan Phase 8's own regression: concrete_wall/stone_rampart
    walls used to carry only barrier=wall, no building tag -- render_tile's
    fill/outline/shadow treatment gates strictly on a real building tag, so
    they rendered as literally nothing. thicken_ring (shared with
    star_fort.fort_wall, which already had this fix) now force-injects it."""

    def test_concrete_wall_segments_are_double_tagged_with_building(self):
        parts = perimeter.perimeter(SQUARE, style="concrete_wall")
        for part in parts:
            self.assertIn("building", part.tags,
                         f"part {part.tags} has no building tag -- it will render as invisible")

    def test_stone_rampart_wall_segments_are_double_tagged_with_building(self):
        parts = perimeter.perimeter(SQUARE, style="stone_rampart")
        walls = [p for p in parts if p.tags.get("barrier") == "wall"]
        self.assertGreater(len(walls), 0)
        for wall in walls:
            self.assertIn("building", wall.tags,
                         f"part {wall.tags} has no building tag -- it will render as invisible")


if __name__ == "__main__":
    unittest.main()
