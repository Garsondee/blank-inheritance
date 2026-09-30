"""Region tessellation: does the cover actually cover, once each?

The claim: tools/gazetteer/coverage.py finds every gap and every overlap in a
set of regions, exactly, and never quietly rounds either away.

The case worth reading first is
`test_full_coverage_is_not_the_same_question_as_no_overlap`. Two regions that
between them claim the whole sheet twice over report 100% claimed -- area
alone cannot tell a tessellation from a pile -- which is why gaps and
overlaps are two separate answers here rather than one percentage.

Geometry is deliberately hand-written and small enough to verify by eye:
every expected area below is a rectangle someone can multiply out.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

import coverage as cov  # noqa: E402

EXTENT = (0.0, 0.0, 100.0, 100.0)   # a 100x100 sheet: every area is legible


def rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def region(rid, x0, y0, x1, y1):
    return {"id": rid, "ringPx": rect(x0, y0, x1, y1)}


def analyse(regions, **kw):
    kw.setdefault("extent", EXTENT)
    kw.setdefault("min_sliver_px2", 0.5)
    return cov.analyse(regions, **kw)


class TestPerfectTessellation(unittest.TestCase):
    def test_two_halves_sharing_an_exact_border(self):
        r = analyse([region("west", 0, 0, 50, 100), region("east", 50, 0, 100, 100)])
        self.assertTrue(r["tessellates"])
        self.assertEqual(r["voids"], [])
        self.assertEqual(r["overlaps"], [])
        self.assertEqual(r["voidSliverCount"], 0)
        self.assertEqual(r["overlapSliverCount"], 0)
        self.assertAlmostEqual(r["claimedFraction"], 1.0, places=6)

    def test_four_quarters(self):
        r = analyse([region("nw", 0, 0, 50, 50), region("ne", 50, 0, 100, 50),
                     region("sw", 0, 50, 50, 100), region("se", 50, 50, 100, 100)])
        self.assertTrue(r["tessellates"], cov.summarise(r))

    def test_a_region_may_run_off_the_sheet_and_is_clipped_to_it(self):
        """An ocean sensibly gets drawn past the edge. Coverage is measured on
        the painted sheet, so the overspill is clipped rather than counted."""
        r = analyse([region("sea", -500, -500, 50, 600), region("land", 50, 0, 100, 100)])
        self.assertTrue(r["tessellates"], cov.summarise(r))
        self.assertAlmostEqual(r["claimedAreaPx2"], 10000.0, places=3)


class TestVoids(unittest.TestCase):
    def test_a_gap_between_two_regions_is_found_and_measured(self):
        r = analyse([region("west", 0, 0, 49, 100), region("east", 51, 0, 100, 100)])
        self.assertFalse(r["tessellates"])
        self.assertEqual(len(r["voids"]), 1)
        self.assertAlmostEqual(r["voids"][0]["areaPx2"], 200.0, places=3)  # 2 x 100
        self.assertAlmostEqual(r["voidAreaPx2"], 200.0, places=3)

    def test_an_empty_map_is_one_whole_void_rather_than_an_error(self):
        r = analyse([])
        self.assertFalse(r["tessellates"])
        self.assertEqual(len(r["voids"]), 1)
        self.assertAlmostEqual(r["voids"][0]["areaPx2"], 10000.0, places=3)
        self.assertEqual(r["claimedFraction"], 0.0)

    def test_a_void_reports_where_to_go_and_look(self):
        """A gap nobody can navigate to is a gap nobody will fix."""
        r = analyse([region("west", 0, 0, 49, 100), region("east", 51, 0, 100, 100)])
        void = r["voids"][0]
        cx, cy = void["centroidPx"]
        self.assertTrue(49 <= cx <= 51, "centroid should sit inside the gap")
        self.assertTrue(0 <= cy <= 100)
        self.assertTrue(void["ringsPx"], "a void must carry rings the UI can draw")

    def test_a_hole_in_the_middle_of_one_region_is_a_void(self):
        """The donut case: a region drawn around something without covering
        it. Easy to produce by tracing a coastline and missing an island."""
        r = analyse([region("all", 0, 0, 100, 100), region("hole", 40, 40, 60, 60)])
        # The union still covers everything, so this is an OVERLAP, not a void
        # -- the inner region sits on top of the outer one.
        self.assertEqual(r["voids"], [])
        self.assertEqual(len(r["overlaps"]), 1)
        self.assertAlmostEqual(r["overlaps"][0]["areaPx2"], 400.0, places=3)


class TestOverlaps(unittest.TestCase):
    def test_an_overlap_is_found_measured_and_attributed_to_both_regions(self):
        r = analyse([region("west", 0, 0, 51, 100), region("east", 49, 0, 100, 100)])
        self.assertFalse(r["tessellates"])
        self.assertEqual(len(r["overlaps"]), 1)
        overlap = r["overlaps"][0]
        self.assertAlmostEqual(overlap["areaPx2"], 200.0, places=3)
        self.assertEqual({overlap["a"], overlap["b"]}, {"west", "east"})

    def test_full_coverage_is_not_the_same_question_as_no_overlap(self):
        """The reason this module reports two things rather than a percentage.

        Two regions each covering the whole sheet claim 100% of it -- by area
        alone that is indistinguishable from a finished tessellation, while
        in fact every building on the map is in two districts at once.
        """
        r = analyse([region("a", 0, 0, 100, 100), region("b", 0, 0, 100, 100)])
        self.assertAlmostEqual(r["claimedFraction"], 1.0, places=6)
        self.assertEqual(r["voids"], [])
        self.assertFalse(r["tessellates"])
        self.assertEqual(len(r["overlaps"]), 1)
        self.assertAlmostEqual(r["overlaps"][0]["areaPx2"], 10000.0, places=3)

    def test_three_regions_overlapping_report_each_disagreeing_pair(self):
        """Pairwise, because the actionable question is never "where is there
        an overlap" but "which two regions disagree, and about what"."""
        r = analyse([region("a", 0, 0, 60, 100), region("b", 40, 0, 100, 100),
                     region("c", 30, 0, 70, 100)])
        pairs = {frozenset((o["a"], o["b"])) for o in r["overlaps"]}
        self.assertEqual(pairs, {frozenset(("a", "b")), frozenset(("a", "c")),
                                 frozenset(("b", "c"))})


class TestSlivers(unittest.TestCase):
    def test_a_hairline_gap_is_counted_not_listed(self):
        r = cov.analyse([region("west", 0, 0, 49.99, 100), region("east", 50, 0, 100, 100)],
                        extent=EXTENT)   # default sliver threshold
        self.assertEqual(r["voids"], [], "a 1px hairline should not be listed individually")
        self.assertEqual(r["voidSliverCount"], 1)
        self.assertGreater(r["voidSliverAreaPx2"], 0)

    def test_a_sliver_still_means_it_does_not_tessellate(self):
        """The headline must not round 99.99% up to finished. A hairline gap
        is still a building that could fall through it."""
        r = cov.analyse([region("west", 0, 0, 49.99, 100), region("east", 50, 0, 100, 100)],
                        extent=EXTENT)
        self.assertFalse(r["tessellates"])
        self.assertIn("sliver", cov.summarise(r))

    def test_the_threshold_is_adjustable(self):
        regions = [region("west", 0, 0, 49, 100), region("east", 51, 0, 100, 100)]
        listed = cov.analyse(regions, extent=EXTENT, min_sliver_px2=10)
        swallowed = cov.analyse(regions, extent=EXTENT, min_sliver_px2=1000)
        self.assertEqual(len(listed["voids"]), 1)
        self.assertEqual(len(swallowed["voids"]), 0)
        self.assertEqual(swallowed["voidSliverCount"], 1)


class TestMalformedInput(unittest.TestCase):
    def test_a_self_intersecting_ring_is_repaired_rather_than_refused(self):
        """A bowtie is one dragged vertex away at any moment, and the coverage
        view going blank mid-edit is exactly when it is being looked at."""
        bowtie = {"id": "bad", "ringPx": [[0, 0], [100, 100], [100, 0], [0, 100]]}
        r = analyse([bowtie])
        self.assertEqual(r["invalidRegions"], [])
        self.assertGreater(r["claimedAreaPx2"], 0)

    def test_a_region_with_no_geometry_is_reported_not_ignored(self):
        r = analyse([{"id": "empty"}, region("real", 0, 0, 100, 100)])
        self.assertEqual(len(r["invalidRegions"]), 1)
        self.assertEqual(r["invalidRegions"][0]["id"], "empty")
        self.assertEqual(r["regionCount"], 1)

    def test_a_region_entirely_off_the_sheet_is_reported(self):
        r = analyse([region("elsewhere", 500, 500, 600, 600), region("real", 0, 0, 100, 100)])
        self.assertEqual(len(r["invalidRegions"]), 1)
        self.assertIn("outside", r["invalidRegions"][0]["problem"])


class TestGeometryShapes(unittest.TestCase):
    def test_the_location_entity_ring_shape_is_accepted(self):
        """Promoted locations carry geometry.rings; drafts carry ringPx. Both
        get checked by the same tool, so both shapes have to work."""
        as_location = {"id": "x", "geometry": {"rings": [rect(0, 0, 100, 100)]}}
        r = analyse([as_location])
        self.assertTrue(r["tessellates"], cov.summarise(r))

    def test_the_session_item_shape_is_accepted(self):
        as_item = {"localId": "item-1", "geometry": {"kind": "polygon",
                                                     "ringPx": rect(0, 0, 100, 100)}}
        r = analyse([as_item])
        self.assertTrue(r["tessellates"], cov.summarise(r))
        self.assertEqual(r["regionCount"], 1)


class TestOrphanSites(unittest.TestCase):
    def test_a_site_outside_every_region_is_reported(self):
        r = analyse([region("west", 0, 0, 50, 100)],
                    sites=[{"id": "inside", "centroidPx": [25, 50]},
                           {"id": "outside", "centroidPx": [75, 50]}])
        self.assertEqual(r["orphanSiteIds"], ["outside"])

    def test_a_complete_tessellation_leaves_no_orphans_by_construction(self):
        """Not independent news: a gapless cover means every point is inside
        something. This is the second opinion on the void check."""
        r = analyse([region("west", 0, 0, 50, 100), region("east", 50, 0, 100, 100)],
                    sites=[{"id": "a", "centroidPx": [10, 10]},
                           {"id": "b", "centroidPx": [90, 90]}])
        self.assertTrue(r["tessellates"])
        self.assertEqual(r["orphanSiteIds"], [])


class TestTheRealSheet(unittest.TestCase):
    def test_the_default_extent_is_the_painted_content_area(self):
        """12000x12000 inside a 200px border -- and nothing to do with where
        the real coastline is. The painted map has diverged from the ground
        truth on purpose, so a coverage check that consulted the real world
        would report gaps where the picture is simply different."""
        x0, y0, x1, y1 = cov.DEFAULT_EXTENT
        self.assertEqual((x0, y0), (200.0, 200.0))
        self.assertEqual((x1 - x0, y1 - y0), (12000.0, 12000.0))

    def test_an_empty_real_sheet_reports_its_whole_area_as_one_void(self):
        r = cov.analyse([])
        self.assertAlmostEqual(r["totalAreaPx2"], 144_000_000.0, places=1)
        self.assertEqual(len(r["voids"]), 1)

    def test_coverage_never_consults_the_real_world(self):
        """The constraint that makes this safe, pinned as source.

        The painted map has diverged from the ground truth beneath it on
        purpose -- an airport that is no longer there, a large island redrawn
        as a small fort. A coverage check that asked the GeoPackage where the
        land is would invent gaps wherever the picture is deliberately
        different, and miss them wherever it happens to agree. The sheet
        rectangle is the only authority here, and the sea is ground to be
        claimed exactly like the land.
        """
        import ast
        source_path = os.path.join(os.path.dirname(__file__), "..", "..",
                                   "tools", "location-sync", "coverage.py")
        with open(source_path, encoding="utf-8") as fh:
            source = fh.read()

        # Parse rather than grep. The docstrings here legitimately discuss
        # landuse and coastlines at length -- explaining that coverage does
        # NOT consult them -- so a naive text scan flags the very explanation
        # of the rule. Walking the AST asks what the code actually reaches
        # for, which is the real question.
        tree = ast.parse(source)
        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported.update(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imported.add(node.module or "")
                imported.update("%s.%s" % (node.module or "", a.name) for a in node.names)

        for forbidden in ("groundtruth", "gpkg", "overrides", "citymap"):
            for name in imported:
                self.assertNotIn(forbidden, name,
                                 "coverage.py imports %r -- coverage must be measured "
                                 "against the painted sheet alone, never the real "
                                 "world it has deliberately diverged from" % name)


class TestUndergroundRegions(unittest.TestCase):
    """Deep Storage sits entirely under The Container Ground's surface
    footprint -- a real Z-axis stack, found live once both were drawn.
    Untagged, that reads as a total overlap and the tessellation never
    passes; tagged "underground", it is excluded from the surface math
    entirely and reported separately instead."""

    def test_an_underground_region_matching_a_surface_footprint_is_not_an_overlap(self):
        surface = region("container-ground", 0, 0, 100, 100)
        bunker = region("deep-storage", 20, 20, 60, 60)
        bunker["tags"] = ["underground"]
        r = analyse([surface, bunker])
        self.assertTrue(r["tessellates"], cov.summarise(r))
        self.assertEqual(r["overlaps"], [])
        self.assertEqual(r["undergroundRegionIds"], ["deep-storage"])

    def test_an_underground_region_does_not_inflate_or_double_count_claimed_area(self):
        surface = region("container-ground", 0, 0, 100, 100)
        bunker = region("deep-storage", 20, 20, 60, 60)
        bunker["tags"] = ["underground"]
        r = analyse([surface, bunker])
        self.assertAlmostEqual(r["claimedAreaPx2"], 10000.0, places=3)  # the surface alone
        self.assertEqual(r["regionCount"], 1, "the underground region is excluded, not merged")

    def test_underground_exclusion_does_not_swallow_a_real_surface_overlap(self):
        """The exclusion must be targeted at tagged regions, not a global
        relaxation of the overlap check while any tag is present."""
        west = region("west", 0, 0, 51, 100)
        east = region("east", 49, 0, 100, 100)
        bunker = region("deep-storage", 20, 20, 30, 30)
        bunker["tags"] = ["underground"]
        r = analyse([west, east, bunker])
        self.assertFalse(r["tessellates"])
        self.assertEqual(len(r["overlaps"]), 1)
        self.assertEqual({r["overlaps"][0]["a"], r["overlaps"][0]["b"]}, {"west", "east"})

    def test_an_untagged_region_in_the_same_position_is_still_a_real_overlap(self):
        """Confirms the exclusion is reading the tag, not the geometry --
        the identical shapes without the tag must fail exactly as before."""
        surface = region("container-ground", 0, 0, 100, 100)
        untagged = region("deep-storage", 20, 20, 60, 60)
        r = analyse([surface, untagged])
        self.assertFalse(r["tessellates"])
        self.assertEqual(len(r["overlaps"]), 1)


if __name__ == "__main__":
    unittest.main()
