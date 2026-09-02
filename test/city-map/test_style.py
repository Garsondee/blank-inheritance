"""Style loader tests -- above all, the metres-not-pixels rule.

The rule exists because the old spike mixed the two: roads scaled with the map
(`ROAD[hw] / mpp`) while contours, outlines and hatch were literal pixels. Ink
weight tuned in a preview therefore did not survive to the delivered render.
These tests make that class of mistake impossible to reintroduce silently.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap.style import Style, StyleError  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REAL_STYLE = os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json")

# The working scale the delivered Kurose render used: 12 km over a 20480 px
# supersampled canvas.
DELIVERED_MPP = 12000.0 / 20480.0


class TestRealStyleFile(unittest.TestCase):
    def test_the_shipped_style_loads(self):
        style = Style.from_file(REAL_STYLE)
        self.assertEqual(style.id, "kurose-1950s")

    def test_every_dimension_section_passes_the_metre_rule(self):
        # Loading is what enforces it; this asserts the shipped file complies.
        Style.from_file(REAL_STYLE)

    def test_known_colours_present(self):
        style = Style.from_file(REAL_STYLE)
        for key in ("paper", "ink", "seaShallow", "seaDeep", "coastInk", "water"):
            rgb = style.colour(key)
            self.assertEqual(len(rgb), 3)
            self.assertTrue(all(0 <= c <= 255 for c in rgb))

    def test_lighting_section_loads_without_the_metre_rule(self):
        style = Style.from_file(REAL_STYLE)
        self.assertIn("warmTint", style.lighting)
        self.assertIn("ambient", style.lighting)
        self.assertAlmostEqual(style.lighting["seaDepthFalloffM"], 900.0)

    def test_hatch_landuse_list_loads(self):
        style = Style.from_file(REAL_STYLE)
        self.assertIn("industrial", style.hatch_landuse)

    def test_road_widths_match_the_delivered_render(self):
        """Regression guard: the extracted values must reproduce the spike.

        These are the pixel widths the approved Kurose image was drawn with.
        """
        style = Style.from_file(REAL_STYLE)
        for hw, expected_m in (("motorway", 22), ("residential", 6.5), ("service", 3.6)):
            self.assertAlmostEqual(style.metres("roads", hw), expected_m, places=6)

    def test_converted_pixel_dimensions_reproduce_their_original_widths(self):
        """The pixel->metre conversion must be a no-op at the delivered scale.

        Each of these was a literal pixel constant in the spike. Converted to
        ground metres they must come back to the same pixel width when rendered
        at the scale they were tuned at -- otherwise this refactor silently
        restyled the map.
        """
        style = Style.from_file(REAL_STYLE)
        for key, original_px in (
            ("contourMinor", 1.0),
            ("contourIndex", 1.6),
            ("buildingOutline", 1.0),
            ("coastStroke", 2.0),
            ("waterStroke", 1.2),
        ):
            got = style.px("widths", key, DELIVERED_MPP, minimum=0.0)
            self.assertAlmostEqual(
                got, original_px, places=2,
                msg=f"{key}: {got:.3f}px at delivered scale, was {original_px}px",
            )


class TestScaleInvariance(unittest.TestCase):
    def test_ink_hierarchy_is_preserved_across_scales(self):
        """The property the whole rule exists to guarantee.

        A contour must stay the same fraction of a residential road's width at
        every zoom. Under the old mixed units it did not, and that is what made
        previews lie.
        """
        style = Style.from_file(REAL_STYLE)
        ratios = []
        for mpp in (0.2, DELIVERED_MPP, 1.0, 4.0):
            road = style.road_width_px("residential", mpp)
            contour = style.px("widths", "contourMinor", mpp, minimum=0.0)
            ratios.append(contour / road)
        for r in ratios[1:]:
            self.assertAlmostEqual(r, ratios[0], places=9)

    def test_minimum_clamp_only_ever_thickens(self):
        style = Style.from_file(REAL_STYLE)
        # At a very coarse scale a hairline would round to nothing.
        raw = style.metres("widths", "contourMinor") / 100.0
        clamped = style.px("widths", "contourMinor", 100.0, minimum=1.0)
        self.assertGreaterEqual(clamped, raw)
        self.assertEqual(clamped, 1.0)


class TestMetreRuleEnforcement(unittest.TestCase):
    def test_unitless_dimension_is_rejected(self):
        with self.assertRaises(StyleError) as ctx:
            Style({"id": "bad", "widths": {"contourMinor": 1.0}})
        self.assertIn("contourMinor", str(ctx.exception))

    def test_dimensionless_suffixes_are_allowed(self):
        style = Style({"id": "ok", "shadow": {"buildingHeightScale": 0.55,
                                              "buildingBlurM": 1.4}})
        self.assertAlmostEqual(style.shadow["buildingHeightScale"], 0.55)

    def test_page_furniture_is_exempt(self):
        # Sheet-relative values are legitimately not ground metres.
        Style({"id": "ok", "pageFurniture": {"cartoucheTitlePx": 34,
                                             "marginFrac": 0.005}})

    def test_colours_are_not_dimension_checked(self):
        Style({"id": "ok", "palette": {"paper": [234, 229, 214]}})

    def test_error_names_every_offender(self):
        with self.assertRaises(StyleError) as ctx:
            Style({"id": "bad", "widths": {"aaa": 1.0, "bbb": 2.0, "goodM": 3.0}})
        msg = str(ctx.exception)
        self.assertIn("widths.aaa", msg)
        self.assertIn("widths.bbb", msg)
        self.assertNotIn("goodM", msg)


class TestLookupErrors(unittest.TestCase):
    def test_missing_colour_names_what_is_available(self):
        style = Style.from_file(REAL_STYLE)
        with self.assertRaises(StyleError) as ctx:
            style.colour("nope")
        self.assertIn("paper", str(ctx.exception))

    def test_unknown_road_class_reports_zero_not_crash(self):
        # draw code checks knows_road() first; this must not raise.
        style = Style.from_file(REAL_STYLE)
        self.assertEqual(style.road_width_px("teleporter", 0.5), 0.0)
        self.assertFalse(style.knows_road("teleporter"))

    def test_synthesised_road_classes_are_all_known(self):
        """A synthesised access road must have a width or it draws as nothing.

        The old `if hw not in ROAD: continue` silently dropped unknown classes,
        so a generated road could vanish with no error at all.
        """
        style = Style.from_file(REAL_STYLE)
        for hw in ("service", "residential", "unclassified", "track", "road"):
            self.assertTrue(style.knows_road(hw), f"router may emit {hw!r}")


class TestMaterialColour(unittest.TestCase):
    """Style.material_colour: the Scratchpad Fill tool's real-renderer half
    (see render.py's BUILDING_MATERIAL_TAG)."""

    def test_real_style_file_knows_the_scratchpad_materials(self):
        """MATERIAL_STYLES in editor/static/scratchpad.js must have a real
        colour for every material it offers, or picking one in the UI would
        silently do nothing to the real render."""
        style = Style.from_file(REAL_STYLE)
        for material in ("concrete", "metal", "brick", "asphalt", "wood", "glass"):
            self.assertIsNotNone(style.material_colour(material),
                                 f"style has no buildingMaterial colour for {material!r}")

    def test_unknown_material_returns_none_not_raise(self):
        style = Style.from_file(REAL_STYLE)
        self.assertIsNone(style.material_colour("unobtainium"))

    def test_none_key_returns_none(self):
        """The common case -- a building with no building:material tag at
        all -- must fall back cleanly, not raise on a None lookup key."""
        style = Style.from_file(REAL_STYLE)
        self.assertIsNone(style.material_colour(None))

    def test_concrete_reads_lighter_than_metal(self):
        """Matches the user's own description verbatim: 'concrete being
        lighter... metal being dark grey'."""
        style = Style.from_file(REAL_STYLE)
        concrete = sum(style.material_colour("concrete"))
        metal = sum(style.material_colour("metal"))
        self.assertGreater(concrete, metal)


class TestCanopyConfig(unittest.TestCase):
    """Style.canopy_*: the real style file's forest-texture config
    (see terrain.canopy_noise_t and render_tile's landuse section)."""

    def test_real_style_file_has_a_canopy_palette_with_at_least_two_stops(self):
        style = Style.from_file(REAL_STYLE)
        palette = style.canopy_palette()
        self.assertGreaterEqual(len(palette), 2)
        for stop in palette:
            self.assertEqual(len(stop), 3)

    def test_blob_and_gamma_are_positive(self):
        style = Style.from_file(REAL_STYLE)
        self.assertGreater(style.canopy_blob_m(), 0.0)
        self.assertGreater(style.canopy_gamma(), 0.0)

    def test_missing_canopy_section_falls_back_to_a_default_palette(self):
        """A style sheet with no canopy section at all must still work --
        canopy is deliberately optional/additive, not required."""
        style = Style({"id": "bare", "name": "bare", "palette": {"paper": [255, 255, 255]},
                       "roads": {"residentialM": 4.0}})
        palette = style.canopy_palette()
        self.assertGreaterEqual(len(palette), 2)


class TestBuildingRoofPalette(unittest.TestCase):
    """Style.building_roof_palette: real per-building colour variety (see
    render._building_roof_colour, point 4 of the 2026-08-24 user report)."""

    def test_real_style_file_has_a_roof_palette_with_several_colours(self):
        style = Style.from_file(REAL_STYLE)
        palette = style.building_roof_palette()
        self.assertGreaterEqual(len(palette), 3, "one or two colours would barely read as 'variety'")
        for colour in palette:
            self.assertEqual(len(colour), 3)

    def test_missing_section_falls_back_to_a_default_palette(self):
        """buildingRoofPalette is deliberately optional/additive -- a style
        sheet with none must still render, just without the variety."""
        style = Style({"id": "bare", "name": "bare", "palette": {"paper": [255, 255, 255]},
                       "roads": {"residentialM": 4.0}})
        palette = style.building_roof_palette()
        self.assertGreaterEqual(len(palette), 2)


if __name__ == "__main__":
    unittest.main()
