"""Which region a building stands in, and which regions border each other --
server side.

Two claims. First, that tools/gazetteer/core/containment.py agrees with
core/containment.mjs on every case in
test/fixtures/gazetteer-containment-cases.json -- both suites read that file,
so neither implementation can be quietly "fixed" into agreement with itself.
Second, that the geometry is actually right, checked against hand-worked
cases rather than the fixture (the fixture is generated FROM this
implementation and can only prove the two halves match, never that either is
correct).

Written 2026-09-12 (Gazetteer V2) alongside the module itself, after a direct
measurement embarrassed the tool: the map has forty regions tessellating it
exactly, so every building already knows its own district by geometry alone,
and nothing in the UI used that anywhere. This is the module that makes it
usable, and this file is the reason a real bug in it was caught before it
shipped rather than after: "The River Island" (a real region) sits precisely
in another real region's hole, and a first version -- testing only
exterior-to-exterior pairs -- reported it as having zero neighbours. See
test_the_real_island_in_a_hole_has_a_neighbour below.

JS half: test/gazetteer-containment.test.mjs.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import containment  # noqa: E402

_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures",
                             "gazetteer-containment-cases.json")
with open(_FIXTURE_PATH, encoding="utf-8") as fh:
    FIXTURE = json.load(fh)


class TestSharedFixture(unittest.TestCase):

    def test_every_case_reproduces(self):
        self.assertTrue(FIXTURE["cases"], "fixture is empty")
        for case in FIXTURE["cases"]:
            with self.subTest(case=case["name"]):
                got = containment.compute(case["items"])
                self.assertEqual(got, case["result"])


class TestPointInPolygon(unittest.TestCase):

    def test_a_point_inside_a_square(self):
        square = [[0, 0], [10, 0], [10, 10], [0, 10]]
        self.assertTrue(containment.point_in_ring(5, 5, square))

    def test_a_point_outside_a_square(self):
        square = [[0, 0], [10, 0], [10, 10], [0, 10]]
        self.assertFalse(containment.point_in_ring(50, 50, square))

    def test_a_point_on_the_exterior_but_inside_a_hole_is_excluded(self):
        outer = [[0, 0], [100, 0], [100, 100], [0, 100]]
        hole = [[40, 40], [60, 40], [60, 60], [40, 60]]
        self.assertTrue(containment.point_in_ring(50, 50, outer))
        self.assertFalse(containment.point_in_polygon(50, 50, outer, [hole]))
        # And a point elsewhere in the donut is still claimed.
        self.assertTrue(containment.point_in_polygon(5, 5, outer, [hole]))

    def test_winding_direction_does_not_matter(self):
        cw = [[0, 0], [0, 10], [10, 10], [10, 0]]
        ccw = [[0, 0], [10, 0], [10, 10], [0, 10]]
        self.assertEqual(containment.point_in_ring(5, 5, cw),
                         containment.point_in_ring(5, 5, ccw))


class TestAdjacency(unittest.TestCase):

    def test_a_shared_edge_is_adjacent(self):
        a = [[0, 0], [10, 0], [10, 10], [0, 10]]
        b = [[10, 0], [20, 0], [20, 10], [10, 10]]
        self.assertTrue(containment.are_adjacent(a, b))

    def test_a_distant_square_is_not_adjacent(self):
        a = [[0, 0], [10, 0], [10, 10], [0, 10]]
        c = [[1000, 1000], [1010, 1000], [1010, 1010], [1000, 1010]]
        self.assertFalse(containment.are_adjacent(a, c))

    def test_adjacency_within_the_snap_tolerance_still_counts(self):
        # A hand-drawn border after snapping can be off by a sub-pixel amount.
        a = [[0, 0], [10, 0], [10, 10], [0, 10]]
        b = [[10.0 + containment.PROXIMATE_TOLERANCE_PX * 0.5, 0],
             [20, 0], [20, 10],
             [10.0 + containment.PROXIMATE_TOLERANCE_PX * 0.5, 10]]
        self.assertTrue(containment.are_adjacent(a, b))

    def test_just_past_the_tolerance_is_not_adjacent(self):
        a = [[0, 0], [10, 0], [10, 10], [0, 10]]
        gap = containment.PROXIMATE_TOLERANCE_PX + 5.0
        b = [[10.0 + gap, 0], [20 + gap, 0], [20 + gap, 10], [10.0 + gap, 10]]
        self.assertFalse(containment.are_adjacent(a, b))

    def test_adjacency_is_symmetric(self):
        a = [[0, 0], [10, 0], [10, 10], [0, 10]]
        b = [[10, 0], [20, 0], [20, 10], [10, 10]]
        self.assertEqual(containment.are_adjacent(a, b), containment.are_adjacent(b, a))


class TestCompute(unittest.TestCase):

    def test_every_site_is_assigned_to_exactly_one_region_or_none(self):
        items = [
            {"localId": "a", "tier": "region",
             "geometry": {"kind": "polygon", "ringPx": [[0, 0], [10, 0], [10, 10], [0, 10]]}},
            {"localId": "s1", "tier": "site",
             "geometry": {"kind": "polygon", "ringPx": [[2, 2], [4, 2], [4, 4], [2, 4]]}},
            {"localId": "p1", "tier": "point", "geometry": {"kind": "point", "pointPx": [500, 500]}},
        ]
        result = containment.compute(items)
        self.assertEqual(result["s1"]["withinRegionRef"], "a")
        self.assertEqual(result["p1"]["withinRegionRef"], None)
        self.assertEqual(result["a"]["containsRefs"], ["s1"])

    def test_an_overlap_is_won_by_the_smaller_region(self):
        big = [[0, 0], [100, 0], [100, 100], [0, 100]]
        small = [[40, 40], [60, 40], [60, 60], [40, 60]]
        items = [
            {"localId": "big", "tier": "region", "geometry": {"kind": "polygon", "ringPx": big}},
            {"localId": "small", "tier": "region", "geometry": {"kind": "polygon", "ringPx": small}},
            {"localId": "s", "tier": "site",
             "geometry": {"kind": "polygon", "ringPx": [[48, 48], [52, 48], [52, 52], [48, 52]]}},
        ]
        result = containment.compute(items)
        self.assertEqual(result["s"]["withinRegionRef"], "small")

    def test_a_region_never_contains_itself_or_appears_in_its_own_neighbours(self):
        items = [
            {"localId": "a", "tier": "region",
             "geometry": {"kind": "polygon", "ringPx": [[0, 0], [10, 0], [10, 10], [0, 10]]}},
        ]
        result = containment.compute(items)
        self.assertNotIn("a", result["a"]["neighbourRefs"])

    def test_a_degenerate_geometry_gets_no_region_rather_than_raising(self):
        items = [
            {"localId": "a", "tier": "region",
             "geometry": {"kind": "polygon", "ringPx": [[0, 0], [10, 0], [10, 10], [0, 10]]}},
            {"localId": "bad", "tier": "site",
             "geometry": {"kind": "polygon", "ringPx": []}},
        ]
        result = containment.compute(items)
        self.assertEqual(result["bad"], {"withinRegionRef": None})

    def test_locked_items_are_treated_no_differently(self):
        items = [
            {"localId": "a", "tier": "region",
             "geometry": {"kind": "polygon", "ringPx": [[0, 0], [10, 0], [10, 10], [0, 10]]}},
            {"localId": "s", "tier": "site", "locked": True,
             "geometry": {"kind": "polygon", "ringPx": [[2, 2], [4, 2], [4, 4], [2, 4]]}},
        ]
        result = containment.compute(items)
        self.assertEqual(result["s"]["withinRegionRef"], "a")

    def test_the_real_island_in_a_hole_has_a_neighbour(self):
        """The regression this whole test file exists to pin. See the module
        docstring and _make_containment_fixture.py for the full story: an
        exterior-to-exterior-only adjacency test reported a real region
        sitting in another region's hole as having zero neighbours."""
        outer = [[0, 0], [100, 0], [100, 100], [0, 100]]
        hole = [[40, 40], [60, 40], [60, 60], [40, 60]]
        items = [
            {"localId": "sea", "tier": "region",
             "geometry": {"kind": "polygon", "ringPx": outer, "holesPx": [hole]}},
            {"localId": "island", "tier": "region",
             "geometry": {"kind": "polygon", "ringPx": hole}},
        ]
        result = containment.compute(items)
        self.assertEqual(result["island"]["neighbourRefs"], ["sea"])
        self.assertEqual(result["sea"]["neighbourRefs"], ["island"])

    def test_real_session_every_building_lands_in_exactly_one_region(self):
        """Run over the actual 113-item draft, not a toy case. Skips loudly
        when the gitignored draft is absent."""
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "map",
                            "gazetteer-drafts", "session-20260911-144323.json")
        if not os.path.exists(path):
            self.skipTest("the first drawing session's draft is not present")
        with open(path, encoding="utf-8") as fh:
            draft = json.load(fh)
        items = draft["items"]
        result = containment.compute(items)
        regions = [i for i in items if i["tier"] == "region"]
        sites = [i for i in items if i["tier"] in ("site", "point")]

        total_contained = sum(len(result[r["localId"]]["containsRefs"]) for r in regions)
        self.assertEqual(total_contained, len(sites),
                         "every site/point should be counted by exactly one region")

        orphans = [s["localId"] for s in sites
                  if result[s["localId"]]["withinRegionRef"] is None]
        self.assertEqual(orphans, [], "no building should be outside every region "
                                      "on a sheet that tessellates")

        no_neighbours = [r["localId"] for r in regions
                        if not result[r["localId"]]["neighbourRefs"]]
        self.assertEqual(no_neighbours, [],
                         "every region on a full tessellation borders something")


class TestPurity(unittest.TestCase):

    def test_containment_imports_nothing_but_the_standard_library(self):
        import ast
        path = os.path.join(os.path.dirname(__file__), "..", "..", "tools",
                            "gazetteer", "core", "containment.py")
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
        self.assertEqual(imported - {"__future__"}, set(), sorted(imported))


if __name__ == "__main__":
    unittest.main()
