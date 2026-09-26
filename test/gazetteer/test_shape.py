"""Footprint shape and scale, server side.

Two claims. First, that tools/gazetteer/core/shape.py agrees with
core/shape.mjs on every case in test/fixtures/gazetteer-shape-cases.json --
both suites read that file, so neither implementation can be quietly "fixed"
into agreement with itself. Second, that the geometry is actually right, which
is checked against hand-computed answers rather than against the fixture: the
fixture is generated from this implementation and so can only ever prove the
two halves match, never that either is correct.

Why the module exists, and where the thresholds came from. The first real
drawing session produced 51 adopted footprints spanning 24 m2 to 16,479 m2,
and the tool offered all of them the same blank note field. The measured
spread that calibrated CAPACITY_FLOORS and SLIVER_WIDTH_M:

    floor area   median 727 m2, p10 187, p90 8,141, min 24, max 30,036
    storeys      8 of 51 tagged; the other 43 default to one
    elongation   median 2.4:1, p90 6.3:1, max 77.5:1
    width        median 17 m, min 4.3 m

An earlier draft gated on the length:width ratio alone -- "past 6:1 it is a
wall" -- and that rule capped the Permit Office (13 m wide, 82 m long, three
storeys, 3,208 m2) at a one-line entry. A 13 m wide slab is an office block.
So the ratio describes and the width gates, and the case that proves it is in
the fixture as item-159: 334 m long, 4.3 m across, 1,430 m2 of floor and
nowhere inside it to stand six people in a circle.

JS half: test/gazetteer-shape.test.mjs.
"""

import json
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import shape  # noqa: E402

_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures",
                             "gazetteer-shape-cases.json")
with open(_FIXTURE_PATH, encoding="utf-8") as fh:
    FIXTURE = json.load(fh)


class TestSharedFixture(unittest.TestCase):
    """Every case in the file the JS suite also reads."""

    def test_every_case_reproduces(self):
        self.assertTrue(FIXTURE["cases"], "fixture is empty")
        for case in FIXTURE["cases"]:
            with self.subTest(case=case["name"]):
                got = shape.metrics(case["ring"], **case["opts"])
                self.assertEqual(got, case["metrics"])

    def test_every_capacity_reproduces(self):
        for case in FIXTURE["cases"]:
            with self.subTest(case=case["name"]):
                m = shape.metrics(case["ring"], **case["opts"])
                self.assertEqual(shape.capacity(m), case["capacity"])

    def test_fixture_covers_each_shape_class_that_can_occur(self):
        # "degenerate" cannot appear through metrics() -- a ring with fewer
        # than three distinct points raises instead -- so it is excluded.
        seen = {c["metrics"]["shape"] for c in FIXTURE["cases"]}
        for name in ("sliver", "strip", "blocky", "complex", "circle"):
            self.assertIn(name, seen,
                          "no fixture case produces shape %r" % name)


class TestGeometryAgainstHandComputation(unittest.TestCase):
    """Answers worked out on paper, not taken from this implementation."""

    def test_square(self):
        m = shape.metrics([[0, 0], [10, 0], [10, 10], [0, 10]])
        self.assertEqual(m["areaM2"], 100.0)
        self.assertEqual(m["perimeterM"], 40.0)
        self.assertEqual(m["lengthM"], 10.0)
        self.assertEqual(m["widthM"], 10.0)
        self.assertEqual(m["elongation"], 1.0)
        self.assertEqual(m["rectangularity"], 1.0)
        # A square's isoperimetric quotient is exactly pi/4.
        self.assertAlmostEqual(m["compactness"], math.pi / 4, places=3)

    def test_l_plan_area_and_rectangularity(self):
        # A 30x30 square with a 20x20 corner removed: 900 - 400 = 500.
        ring = [[0, 0], [30, 0], [30, 10], [10, 10], [10, 30], [0, 30]]
        m = shape.metrics(ring)
        self.assertEqual(m["areaM2"], 500.0)
        self.assertEqual(m["lengthM"], 30.0)
        self.assertEqual(m["widthM"], 30.0)
        self.assertAlmostEqual(m["rectangularity"], 500.0 / 900.0, places=3)
        self.assertEqual(m["shape"], "complex")

    def test_winding_direction_does_not_change_anything(self):
        cw = [[0, 0], [0, 10], [10, 10], [10, 0]]
        ccw = [[0, 0], [10, 0], [10, 10], [0, 10]]
        self.assertEqual(shape.metrics(cw), shape.metrics(ccw))

    def test_a_repeated_closing_point_is_dropped(self):
        closed = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        self.assertEqual(shape.metrics(closed)["vertexCount"], 4)

    def test_metres_per_px_scales_lengths_once_and_areas_twice(self):
        ring = [[0, 0], [10, 0], [10, 10], [0, 10]]
        one = shape.metrics(ring)
        two = shape.metrics(ring, metres_per_px=2.0)
        self.assertEqual(two["areaM2"], one["areaM2"] * 4)
        self.assertEqual(two["perimeterM"], one["perimeterM"] * 2)
        self.assertEqual(two["lengthM"], one["lengthM"] * 2)
        # Every ratio is dimensionless and must survive a scale change.
        for key in ("elongation", "rectangularity", "compactness"):
            self.assertEqual(one[key], two[key], key)

    def test_too_few_points_raises_rather_than_returning_zeroes(self):
        with self.assertRaises(shape.ShapeError):
            shape.metrics([[0, 0], [1, 1]])
        with self.assertRaises(shape.ShapeError):
            shape.metrics([[0, 0], [0, 0], [0, 0]])


class TestMinimumAreaRectangle(unittest.TestCase):
    """The part a bounding box gets wrong, which is the whole point."""

    def test_a_rotated_terrace_is_not_square(self):
        # Its axis-aligned bounding box is 49.8 x 43.2 -- 1.15:1, which reads
        # as a block. It is a 60 x 6 m terrace at 40 degrees.
        ring = _rotate([[0, 0], [60, 0], [60, 6], [0, 6]], 40)
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        aabb_ratio = (max(xs) - min(xs)) / (max(ys) - min(ys))
        self.assertLess(aabb_ratio, 1.3, "the trap this test guards is gone")

        length, width, angle = shape.min_area_rect(ring)
        self.assertAlmostEqual(length, 60.0, places=6)
        self.assertAlmostEqual(width, 6.0, places=6)
        self.assertAlmostEqual(math.degrees(angle), 40.0, places=4)

    def test_the_answer_is_rotation_invariant(self):
        ring = [[0, 0], [40, 0], [40, 12], [0, 12]]
        base = shape.min_area_rect(ring)
        for deg in (7, 31, 90, 137, 180, 271):
            length, width, _ = shape.min_area_rect(_rotate(ring, deg))
            self.assertAlmostEqual(length, base[0], places=6, msg="deg=%s" % deg)
            self.assertAlmostEqual(width, base[1], places=6, msg="deg=%s" % deg)

    def test_the_rectangle_actually_encloses_the_polygon(self):
        # The property being claimed, checked directly: every vertex projects
        # inside the found rectangle's own extents.
        ring = [[0, 0], [30, 4], [26, 19], [11, 22], [2, 14]]
        length, width, angle = shape.min_area_rect(ring)
        ux, uy = math.cos(angle), math.sin(angle)
        vx, vy = -uy, ux
        us = [x * ux + y * uy for x, y in ring]
        vs = [x * vx + y * vy for x, y in ring]
        self.assertLessEqual(max(us) - min(us), length + 1e-9)
        self.assertLessEqual(max(vs) - min(vs), width + 1e-9)

    def test_it_is_no_worse_than_the_bounding_box_anywhere(self):
        ring = [[0, 0], [30, 4], [26, 19], [11, 22], [2, 14]]
        for deg in range(0, 180, 13):
            rotated = _rotate(ring, deg)
            xs = [p[0] for p in rotated]
            ys = [p[1] for p in rotated]
            aabb = (max(xs) - min(xs)) * (max(ys) - min(ys))
            length, width, _ = shape.min_area_rect(rotated)
            self.assertLessEqual(length * width, aabb + 1e-6, "deg=%s" % deg)

    def test_collinear_points_do_not_crash(self):
        length, width, _ = shape.min_area_rect([[0, 0], [5, 0], [10, 0]])
        self.assertEqual(width, 0.0)
        self.assertAlmostEqual(length, 10.0)


class TestClassification(unittest.TestCase):

    def test_narrow_and_long_is_a_sliver(self):
        m = shape.metrics([[0, 0], [100, 0], [100, 4], [0, 4]])
        self.assertEqual(m["shape"], "sliver")

    def test_narrow_and_short_is_not_a_sliver(self):
        # 5 x 5 m. Narrow, and a shed rather than a wall. This is the case
        # that stops SLIVER_WIDTH_M being applied on its own.
        m = shape.metrics([[0, 0], [5, 0], [5, 5], [0, 5]])
        self.assertNotEqual(m["shape"], "sliver")

    def test_long_and_wide_is_a_strip_not_a_sliver(self):
        # The Permit Office's proportions: 82 x 13 m, 6.3:1. An office slab.
        m = shape.metrics([[0, 0], [82, 0], [82, 13], [0, 13]])
        self.assertEqual(m["shape"], "strip")
        self.assertGreater(m["elongation"], shape.STRIP_ELONGATION)

    def test_a_hand_drawn_circle_is_recognised(self):
        # The same 32-point construction draw.js's own Circle tool produces,
        # for a bunker-sized 8 m radius. Asked for directly: "you currently
        # identify buildings by their shapes as well as size, you need to
        # add 'Looks like a circle' to your shape recognition."
        ring = [[8.0 * math.cos(2 * math.pi * i / 32),
                8.0 * math.sin(2 * math.pi * i / 32)] for i in range(32)]
        m = shape.metrics(ring)
        self.assertEqual(m["shape"], "circle")

    def test_an_elongated_oval_is_not_a_circle(self):
        # 10 x 7: compactness 0.951 clears CIRCLE_COMPACTNESS on its own, so
        # this proves CIRCLE_MAX_ELONGATION is doing real independent work
        # rather than never actually triggering -- an oval this shape is a
        # room with a stretched end, not a round one.
        ring = [[10.0 * math.cos(2 * math.pi * i / 32),
                7.0 * math.sin(2 * math.pi * i / 32)] for i in range(32)]
        m = shape.metrics(ring)
        self.assertGreater(m["compactness"], shape.CIRCLE_COMPACTNESS)
        self.assertGreater(m["elongation"], shape.CIRCLE_MAX_ELONGATION)
        self.assertNotEqual(m["shape"], "circle")

    def test_a_plain_square_is_not_reclassified_as_a_circle(self):
        # A square's elongation (1.0) clears CIRCLE_MAX_ELONGATION, but its
        # compactness is pi/4 (~0.785), well under CIRCLE_COMPACTNESS -- the
        # two thresholds have to work together, not either alone.
        m = shape.metrics([[0, 0], [10, 0], [10, 10], [0, 10]])
        self.assertLess(m["compactness"], shape.CIRCLE_COMPACTNESS)
        self.assertNotEqual(m["shape"], "circle")


class TestHeightAndFloorArea(unittest.TestCase):

    def test_storeys_multiply_the_footprint(self):
        ring = [[0, 0], [20, 0], [20, 20], [0, 20]]
        m = shape.metrics(ring, levels=3, height_source="levels")
        self.assertEqual(m["areaM2"], 400.0)
        self.assertEqual(m["floorAreaM2"], 1200.0)
        self.assertEqual(m["levels"], 3)
        self.assertFalse(m["floorAreaEstimated"])

    def test_a_tagged_height_infers_storeys_at_the_shared_constant(self):
        ring = [[0, 0], [20, 0], [20, 20], [0, 20]]
        m = shape.metrics(ring, height_m=22.0, height_source="tagged")
        self.assertEqual(m["levels"], round(22.0 / shape.LEVEL_HEIGHT_M))
        self.assertEqual(m["heightSource"], "tagged")
        self.assertFalse(m["floorAreaEstimated"])

    def test_storey_height_matches_the_city_map_pipeline(self):
        # citymap/parse.py turns building:levels into height_m at this rate,
        # and the gpkg's height_m column was written by it. Two different
        # constants would give one building two heights depending on which
        # tool was asked, and the disagreement would only surface as floor
        # areas that do not reconcile.
        citymap_dir = os.path.join(os.path.dirname(__file__), "..", "..",
                                   "tools", "city-map")
        if not os.path.isdir(os.path.join(citymap_dir, "citymap")):
            self.skipTest("tools/city-map is not present")
        sys.path.insert(0, citymap_dir)
        try:
            from citymap.parse import _LEVEL_HEIGHT_M  # noqa: WPS433
        finally:
            sys.path.remove(citymap_dir)
        self.assertEqual(shape.LEVEL_HEIGHT_M, _LEVEL_HEIGHT_M)

    def test_a_defaulted_height_never_becomes_storeys(self):
        """The store fills height_m in for EVERY building.

        citymap/parse.py falls back to a per-building-type default (8 m for a
        plain `building=yes`) when nothing is tagged, and two thirds of this
        sheet is that default. Read as a measurement it turns 8 m into two
        floors and doubles the floor area of a shed -- which is how a 24 m2
        bicycle store came to be reported live as 48 m2 across two levels,
        both numbers invented by the tool and both presented as facts.
        """
        ring = [[0, 0], [20, 0], [20, 20], [0, 20]]
        m = shape.metrics(ring, height_m=8.0, height_source="typical")
        self.assertEqual(m["levels"], 1)
        self.assertEqual(m["floorAreaM2"], m["areaM2"])
        self.assertTrue(m["floorAreaEstimated"])
        # The height itself is still reported -- it is what the renderer draws.
        self.assertEqual(m["heightM"], 8.0)

    def test_the_same_height_tagged_for_real_does_become_storeys(self):
        m = shape.metrics([[0, 0], [20, 0], [20, 20], [0, 20]],
                          height_m=8.0, height_source="tagged")
        self.assertEqual(m["levels"], 2)
        self.assertFalse(m["floorAreaEstimated"])

    def test_no_data_is_one_storey_and_says_so(self):
        m = shape.metrics([[0, 0], [20, 0], [20, 20], [0, 20]])
        self.assertEqual(m["levels"], 1)
        self.assertEqual(m["heightSource"], "typical")
        self.assertTrue(m["floorAreaEstimated"])
        reasons = " ".join(shape.capacity(m)["reasons"])
        self.assertIn("No storey count", reasons)

    def test_a_sub_storey_height_still_counts_as_one_floor(self):
        m = shape.metrics([[0, 0], [20, 0], [20, 20], [0, 20]], height_m=1.2)
        self.assertEqual(m["levels"], 1)
        self.assertEqual(m["floorAreaM2"], 400.0)


class TestCapacity(unittest.TestCase):

    def test_the_ladder_rises_with_floor_area(self):
        seen = []
        for side in (4, 9, 20, 45):
            ring = [[0, 0], [side, 0], [side, side], [0, side]]
            seen.append(shape.capacity(shape.metrics(ring))["maxDepth"])
        self.assertEqual(seen, ["named", "sketch", "scene", "standing"])

    def test_a_wall_is_capped_however_much_floor_it_has(self):
        # 400 x 4 m: 1,600 m2, which on area alone would reach "scene".
        m = shape.metrics([[0, 0], [400, 0], [400, 4], [0, 4]])
        self.assertEqual(m["shape"], "sliver")
        self.assertEqual(shape.capacity(m)["maxDepth"], "sketch")

    def test_a_wall_reports_no_rooms_rather_than_floor_area_over_twenty(self):
        m = shape.metrics([[0, 0], [400, 0], [400, 4], [0, 4]])
        self.assertEqual(m["rooms"], 0)
        joined = " ".join(shape.capacity(m)["reasons"])
        self.assertIn("no room in there", joined)
        # And it must not also claim the place has several distinct spaces.
        self.assertNotIn("several distinct spaces", joined)

    def test_elongation_alone_does_not_cap_a_wide_building(self):
        # 82 x 13 m over three storeys: 3,198 m2, 6.3:1. An earlier draft
        # capped this at "named" on the ratio. It is an office block.
        m = shape.metrics([[0, 0], [82, 0], [82, 13], [0, 13]],
                          levels=3, height_source="levels")
        self.assertEqual(shape.capacity(m)["maxDepth"], "standing")

    def test_check_passes_a_declaration_within_the_ceiling(self):
        m = shape.metrics([[0, 0], [45, 0], [45, 45], [0, 45]])
        result = shape.check("scene", m)
        self.assertTrue(result["ok"])
        self.assertEqual(result["declared"], "scene")

    def test_check_fails_a_declaration_above_the_ceiling(self):
        m = shape.metrics([[0, 0], [4, 0], [4, 4], [0, 4]])
        result = shape.check("standing", m)
        self.assertFalse(result["ok"])
        self.assertEqual(result["maxDepth"], "named")
        self.assertTrue(result["reasons"])

    def test_an_unknown_declared_depth_is_read_as_the_cheapest_rung(self):
        m = shape.metrics([[0, 0], [45, 0], [45, 45], [0, 45]])
        self.assertEqual(shape.check(None, m)["declared"], "named")
        self.assertEqual(shape.check("epic", m)["declared"], "named")

    def test_every_reason_is_a_sentence_a_person_can_read(self):
        # design/testing-strategy.md's rule about GM-facing prose applies to
        # tool output that gets read while writing: no bare field names.
        for side in (4, 20, 60):
            m = shape.metrics([[0, 0], [side, 0], [side, side], [0, side]])
            for reason in shape.capacity(m)["reasons"]:
                self.assertTrue(reason.endswith("."), reason)
                self.assertTrue(reason[0].isupper() or reason[0].isdigit(),
                                reason)
                self.assertNotIn("_", reason)


class TestRealSessionFootprints(unittest.TestCase):
    """The 51 outlines the thresholds were calibrated against."""

    DRAFT = os.path.join(os.path.dirname(__file__), "..", "..", "data", "map",
                         "gazetteer-drafts", "session-20260911-144323.json")

    def setUp(self):
        if not os.path.exists(self.DRAFT):
            self.skipTest("the first drawing session's draft is not present")
        with open(self.DRAFT, encoding="utf-8") as fh:
            self.draft = json.load(fh)

    def test_every_real_footprint_measures_without_raising(self):
        for item in self.draft["items"]:
            geom = item["geometry"]
            if geom["kind"] != "polygon":
                continue
            with self.subTest(item=item["localId"]):
                m = shape.metrics(geom["ringPx"])
                self.assertGreater(m["areaM2"], 0)
                self.assertIn(m["shape"], shape.SHAPES)
                self.assertIsNotNone(shape.capacity(m)["maxDepth"])

    def test_the_ceilings_are_not_all_the_same_answer(self):
        # A gate that says "scene" to all 51 is not a gate, it is a label.
        ceilings = set()
        for item in self.draft["items"]:
            geom = item["geometry"]
            if geom["kind"] != "polygon":
                continue
            ceilings.add(
                shape.capacity(shape.metrics(geom["ringPx"]))["maxDepth"])
        self.assertGreaterEqual(len(ceilings), 3, sorted(ceilings))


class TestPurity(unittest.TestCase):
    """core/ modules stay importable without the world attached."""

    def test_shape_imports_nothing_but_the_standard_library(self):
        import ast
        path = os.path.join(os.path.dirname(__file__), "..", "..", "tools",
                            "gazetteer", "core", "shape.py")
        with open(path, encoding="utf-8") as fh:
            tree = ast.parse(fh.read())
        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported.update(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom):
                if node.level:
                    imported.add("<relative>")
                elif node.module:
                    imported.add(node.module.split(".")[0])
        self.assertEqual(imported - {"__future__"}, {"math"}, sorted(imported))


def _rotate(ring, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return [[x * c - y * s, x * s + y * c] for x, y in ring]


if __name__ == "__main__":
    unittest.main()
