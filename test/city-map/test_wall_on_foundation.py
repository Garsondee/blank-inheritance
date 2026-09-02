"""citymap.tools.wall_on_foundation tests -- map-editor plan Phase 8.

TestGenerateWallOnFoundation pins the pure geometry/validation logic
(composition over generate_terrace + perimeter.thicken_ring, not
reimplemented math); TestWallOnFoundationActuallyRenders is the same
"did it leave real ink" regression star_fort.py's own test suite already
established for exactly this class of bug (a part with correct geometry
but no building tag renders as nothing).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402

from citymap.editor.design_preview import render_design_preview  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.style import Style  # noqa: E402
from citymap.tools import terrace, wall_on_foundation  # noqa: E402

SQUARE = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
CELL_M = 5.86  # matches test_terrace.py's own stated real value

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STYLE = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))
FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=0.0, extent_m=1000.0, crs_epsg=6674, dem_grid=16)


def _generate(**overrides):
    kwargs = dict(base_elevation_m=0.0, tiers=3, step_height_m=2.0, inset_m=15.0, blend_m=5.0,
                 cell_size_m=CELL_M, wall_thickness_m=3.0, wall_height_m=5.0)
    kwargs.update(overrides)
    return wall_on_foundation.generate_wall_on_foundation(SQUARE, **kwargs)


class TestGenerateWallOnFoundation(unittest.TestCase):
    def test_tiers_and_risers_match_generate_terrace_directly(self):
        """Proof this is composition, not a second implementation of the
        terrace math: identical parameters must produce identical tiers/
        risers whether called through terrace.generate_terrace directly or
        through wall_on_foundation."""
        direct = terrace.generate_terrace(SQUARE, base_elevation_m=1.0, tiers=3, step_height_m=2.0,
                                         inset_m=15.0, blend_m=5.0, cell_size_m=CELL_M)
        combined = _generate(base_elevation_m=1.0)
        self.assertEqual(len(combined.tiers), len(direct.tiers))
        self.assertEqual([t.target_elevation_m for t in combined.tiers],
                         [t.target_elevation_m for t in direct.tiers])
        self.assertEqual(len(combined.risers), len(direct.risers))

    def test_one_wall_segment_per_top_tier_edge(self):
        result = _generate()
        # SQUARE erodes to another axis-aligned rectangle (still 4 corners)
        # at any inset that doesn't collapse it -- see the module docstring
        # on why the wall ring is built from the top tier's own boundary.
        self.assertEqual(len(result.wall_segments), 4)

    def test_wall_segments_carry_the_requested_height_and_are_visible(self):
        result = _generate(wall_height_m=6.0)
        for seg in result.wall_segments:
            self.assertEqual(seg.height_m, 6.0)
            self.assertIn("building", seg.tags,
                         f"part {seg.tags} has no building tag -- it will render as invisible")

    def test_every_wall_segment_is_contained_within_the_top_tier(self):
        result = _generate(tiers=3, inset_m=15.0, wall_thickness_m=3.0)
        top_tier = result.tiers[-1]
        # A tiny outward tolerance for buffer()'s own floating-point
        # precision, not because the containment is meant to be approximate
        # -- see the module docstring: the wall's footprint is built to sit
        # exactly flush with the top tier's boundary, by construction.
        bound = top_tier.polygon.buffer(0.05)
        for seg in result.wall_segments:
            seg_poly = Polygon(seg.footprint)
            self.assertTrue(bound.contains(seg_poly),
                           f"wall segment {seg.footprint} escapes the top tier it should sit on")

    def test_single_tier_still_gets_a_wall_with_no_risers(self):
        result = _generate(tiers=1)
        self.assertEqual(len(result.risers), 0)
        self.assertEqual(len(result.wall_segments), 4)

    def test_custom_wall_tags_are_used_verbatim_plus_forced_building(self):
        result = _generate(wall_tags={"barrier": "wall", "wall": "citadel", "name:en": "Test Wall"})
        for seg in result.wall_segments:
            self.assertEqual(seg.tags["wall"], "citadel")
            self.assertIn("building", seg.tags)

    def test_default_wall_tags_are_used_when_none_given(self):
        result = _generate()
        for seg in result.wall_segments:
            self.assertEqual(seg.tags["wall"], "rampart")

    # --- validation ---------------------------------------------------

    def test_rejects_non_positive_wall_thickness(self):
        with self.assertRaises(terrace.TerraceError):
            _generate(wall_thickness_m=0.0)

    def test_rejects_non_positive_wall_height(self):
        with self.assertRaises(terrace.TerraceError):
            _generate(wall_height_m=0.0)

    def test_rejects_a_wall_too_thick_for_the_top_tier(self):
        """tiers=3, inset_m=15 -> the top tier is a 40x40 square (100 -
        2*30). A 200m-thick wall can't possibly fit inside it."""
        with self.assertRaises(terrace.TerraceError) as ctx:
            _generate(tiers=3, inset_m=15.0, wall_thickness_m=200.0)
        self.assertIn("no room", str(ctx.exception))

    def test_still_raises_the_underlying_terrace_error_for_bad_terrace_params(self):
        """wall_on_foundation must not swallow generate_terrace's own
        validation -- an invalid terrace request fails for the SAME reason
        it would through terrace.generate_terrace directly."""
        with self.assertRaises(terrace.TerraceError) as ctx:
            _generate(inset_m=1.0)
        self.assertIn("DEM cell", str(ctx.exception))


def flat_fields(dem_grid=16) -> Fields:
    elevation = np.full((dem_grid, dem_grid), 10.0, dtype=np.float32)
    shade = np.ones((dem_grid, dem_grid, 3), dtype=np.float32)
    return Fields(frame=FRAME, features=[], lamps=[], elevation=elevation,
                 shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


class TestWallOnFoundationActuallyRenders(unittest.TestCase):
    """Regression guard for the exact failure class star_fort.py's own test
    suite was built to catch: geometrically correct parts that put zero ink
    on the actual image. Direct pixel check, not just 'the function
    returned something'. Uses a small LOCAL square (matching
    test_procgen_star_fort.py's own SQUARE fixture convention) rather than
    this file's own SQUARE, since render_design_preview positions parts as
    OFFSETS from an anchor -- a real-world-scale outline centred on (0, 0)
    doubles as both."""

    def test_produces_visible_ink_covering_a_real_fraction_of_the_preview(self):
        local_square = Polygon([(-100.0, -100.0), (100.0, -100.0), (100.0, 100.0), (-100.0, 100.0)])
        result = wall_on_foundation.generate_wall_on_foundation(
            local_square, base_elevation_m=0.0, tiers=2, step_height_m=3.0, inset_m=20.0,
            blend_m=5.0, cell_size_m=CELL_M, wall_thickness_m=4.0, wall_height_m=6.0)
        img = render_design_preview(result.wall_segments, (135.205, 34.678), FRAME, STYLE,
                                    flat_fields(), extent_m=400.0, mpp=1.0)
        arr = np.asarray(img)
        paper = np.array(STYLE.colour("paper"))
        non_paper_fraction = np.mean(np.any(arr != paper, axis=-1))
        self.assertGreater(non_paper_fraction, 0.02,
                          "a wall ring spanning most of a 400m preview must leave real ink, "
                          "not render as an empty page")


if __name__ == "__main__":
    unittest.main()
