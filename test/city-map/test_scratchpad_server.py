"""editor/server.py's Scratchpad conversion tests: shape_to_template_parts
and document_to_parts, the pure logic turning a ScratchpadDocument's drawn
shapes into real TemplateParts.
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map", "editor"))

from shapely.geometry import Polygon  # noqa: E402

import server as editor_server  # noqa: E402

SQUARE = [[-10.0, -10.0], [10.0, -10.0], [10.0, 10.0], [-10.0, 10.0]]
LINE = [[0.0, 0.0], [40.0, 0.0], [40.0, 30.0]]


class TestAreaShapes(unittest.TestCase):
    def test_plain_area_shape(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 12.0, "tags": {"building": "watchtower"}})
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0].kind, "area")
        self.assertEqual(parts[0].height_m, 12.0)
        self.assertEqual(parts[0].tags["building"], "watchtower")

    def test_area_shape_with_no_renderable_tag_gets_building_injected(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 0.0, "tags": {"surface": "paved"}})
        self.assertIn("building", parts[0].tags)

    def test_zero_height_area_still_gets_tagged(self):
        """The actual bug found this session: sentinel-tower.json's real
        apron part had heightM=0 and only an unrecognized tag -- zero
        height must not skip the safety net, only 'already has a
        renderable tag' should."""
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 0.0, "tags": {"aeroway": "apron"}})
        self.assertIn("building", parts[0].tags)

    def test_existing_landuse_tag_is_not_overridden_by_building(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 0.0, "tags": {"landuse": "grass"}})
        self.assertNotIn("building", parts[0].tags)
        self.assertEqual(parts[0].tags["landuse"], "grass")

    def test_existing_building_tag_is_not_overridden(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 5.0, "tags": {"building": "barracks"}})
        self.assertEqual(parts[0].tags["building"], "barracks")

    def test_structure_type_used_as_fallback_building_value(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 5.0, "tags": {"structureType": "watchtower"}})
        self.assertEqual(parts[0].tags["building"], "watchtower")

    def test_building_material_tag_from_the_fill_tool_survives_untouched(self):
        """The Scratchpad's Fill tool (scratchpad.js's shapeExportTags) sends
        building:material alongside building=* -- a distinct key from
        'building' itself, so the renderable-tag safety net must leave it
        alone rather than treat its presence as satisfying RENDERABLE_AREA_KEYS."""
        parts = editor_server.shape_to_template_parts(
            {"kind": "area", "points": SQUARE, "heightM": 5.0,
             "tags": {"building": "yes", "building:material": "metal"}})
        self.assertEqual(parts[0].tags["building:material"], "metal")
        self.assertEqual(parts[0].tags["building"], "yes")

    def test_input_tags_dict_is_not_mutated(self):
        original = {"surface": "paved"}
        editor_server.shape_to_template_parts({"kind": "area", "points": SQUARE, "heightM": 0.0, "tags": original})
        self.assertNotIn("building", original)

    def test_area_shape_needs_at_least_3_points(self):
        with self.assertRaises(ValueError):
            editor_server.shape_to_template_parts({"kind": "area", "points": SQUARE[:2], "heightM": 1.0})


class TestLineShapes(unittest.TestCase):
    def test_plain_line_stays_a_line_part(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "line", "points": LINE, "tags": {"barrier": "fence"}})
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0].kind, "line")
        self.assertEqual(parts[0].footprint, [tuple(p) for p in LINE])

    def test_plain_line_is_not_force_tagged(self):
        """Line parts are schematic-only in the real renderer regardless of
        their tags (render_tile's shadow loop only ever iterates buildings)
        -- forcing a building tag onto a real line would be actively wrong,
        not just unnecessary."""
        parts = editor_server.shape_to_template_parts({"kind": "line", "points": LINE, "tags": {}})
        self.assertNotIn("building", parts[0].tags)

    def test_depth_hint_line_becomes_area_parts(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "line", "points": LINE, "depthHint": True, "heightM": 6.0,
             "thicknessM": 4.0, "tags": {"barrier": "wall"}})
        self.assertTrue(all(p.kind == "area" for p in parts))
        self.assertEqual(len(parts), len(LINE) - 1)  # one area part per segment

    def test_depth_hint_parts_are_tagged_for_rendering(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "line", "points": LINE, "depthHint": True, "tags": {"barrier": "wall"}})
        for p in parts:
            self.assertIn("building", p.tags)

    def test_depth_hint_parts_have_real_thickness(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "line", "points": LINE, "depthHint": True, "thicknessM": 5.0, "tags": {}})
        for p in parts:
            self.assertGreater(Polygon(p.footprint).area, 0.0)

    def test_depth_hint_uses_default_height_when_none_given(self):
        parts = editor_server.shape_to_template_parts(
            {"kind": "line", "points": LINE, "depthHint": True, "tags": {}})
        self.assertGreater(parts[0].height_m, 0.0)

    def test_line_needs_at_least_2_points(self):
        with self.assertRaises(ValueError):
            editor_server.shape_to_template_parts({"kind": "line", "points": [[0, 0]], "tags": {}})

    def test_unknown_kind_raises(self):
        with self.assertRaises(ValueError):
            editor_server.shape_to_template_parts({"kind": "point", "points": LINE, "tags": {}})


class TestDocumentToParts(unittest.TestCase):
    def test_multiple_shapes_flatten_into_one_part_list(self):
        doc = {"shapes": [
            {"kind": "area", "points": SQUARE, "heightM": 10.0, "tags": {"building": "tower"}},
            {"kind": "line", "points": LINE, "tags": {"barrier": "fence"}},
        ]}
        parts = editor_server.document_to_parts(doc)
        self.assertEqual(len(parts), 2)

    def test_empty_shapes_list_raises(self):
        with self.assertRaises(ValueError):
            editor_server.document_to_parts({"shapes": []})

    def test_missing_shapes_key_raises(self):
        with self.assertRaises(ValueError):
            editor_server.document_to_parts({})

    def test_a_depth_hint_line_with_no_real_segments_raises(self):
        # every point identical -> every segment length ~0 -> no parts survive
        degenerate = [[5.0, 5.0], [5.0, 5.0]]
        with self.assertRaises(ValueError):
            editor_server.document_to_parts(
                {"shapes": [{"kind": "line", "points": degenerate, "depthHint": True, "tags": {}}]})


if __name__ == "__main__":
    unittest.main()
