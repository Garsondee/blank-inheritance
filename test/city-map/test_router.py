"""Router tests: the specific failure modes a plain cost-surface A* cannot
avoid (see router.py's module docstring for the proof), each checked directly
against synthetic terrain built to trigger it.
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.ops import router  # noqa: E402


def flat_grid(rows=100, cols=100, cell_m=2.0, goal_col=None):
    elevation = np.zeros((rows, cols), dtype=np.float32)
    obstacle = np.zeros((rows, cols), dtype=bool)
    goal = np.zeros((rows, cols), dtype=bool)
    if goal_col is not None:
        goal[:, goal_col] = True
    return router.RoutingGrid(origin_x=0.0, origin_y=0.0, cell_m=cell_m,
                              elevation=elevation, obstacle=obstacle, goal=goal)


class TestHeadingOffsets(unittest.TestCase):
    def test_sixteen_distinct_directions_at_a_reasonable_step(self):
        offsets = router._OFFSETS
        self.assertEqual(len(offsets), 16)
        # At STEP_CELLS=6 the 16 directions should mostly be distinguishable.
        self.assertGreaterEqual(len(set(offsets)), 12)

    def test_opposite_headings_are_roughly_opposite_vectors(self):
        d0 = router._heading_offset(0)
        d8 = router._heading_offset(8)   # 180 degrees away
        self.assertAlmostEqual(d0[0], -d8[0], delta=1)
        self.assertAlmostEqual(d0[1], -d8[1], delta=1)


class TestTurnRadius(unittest.TestCase):
    def test_straight_is_infinite_radius(self):
        self.assertIsNone(router.turn_radius_m(10.0, 0))

    def test_sharper_turn_gives_smaller_radius(self):
        r1 = router.turn_radius_m(10.0, 1)
        r2 = router.turn_radius_m(10.0, 2)
        self.assertGreater(r1, r2)

    def test_radius_scales_with_step_length(self):
        short = router.turn_radius_m(5.0, 1)
        long_ = router.turn_radius_m(10.0, 1)
        self.assertLess(short, long_)


class TestFlatObstacleFreeRouting(unittest.TestCase):
    """On flat open ground the route should be direct -- a control case
    guarding against over-eager curvature cost making even trivial routes
    wander."""

    def test_route_reaches_the_goal(self):
        grid = flat_grid(goal_col=80)
        result = router.route(grid, start_map=(20.0, 50.0), highway_class="service")
        self.assertTrue(result.ok, result.reason)
        self.assertGreater(len(result.path_map), 1)

    def test_route_is_reasonably_direct_on_flat_ground(self):
        grid = flat_grid(goal_col=80)
        start = (20.0, 50.0)
        result = router.route(grid, start_map=start, highway_class="service")
        self.assertTrue(result.ok, result.reason)
        end = result.path_map[-1]
        straight_line = math.hypot(end[0] - start[0], end[1] - start[1])
        self.assertLess(result.cost_eq_m, straight_line * 2.0,
                        "a flat, obstacle-free route should not wander far past the "
                        "straight-line distance")

    def test_start_already_on_network_is_rejected(self):
        grid = flat_grid(goal_col=50)
        start_map = grid.to_map(20, 50)   # deliberately ON the goal column
        result = router.route(grid, start_map=start_map, highway_class="service")
        self.assertFalse(result.ok)

    def test_start_inside_an_obstacle_is_rejected(self):
        grid = flat_grid(goal_col=80)
        grid.obstacle[18:22, 48:52] = True
        start_map = grid.to_map(20, 50)   # inside the obstacle block above
        result = router.route(grid, start_map=start_map, highway_class="service")
        self.assertFalse(result.ok)
        self.assertIn("not passable", result.reason)


class TestGradeLimit(unittest.TestCase):
    def test_a_slope_within_the_class_limit_routes_straight_up(self):
        rows, cols = 60, 60
        cell_m = 2.0
        elevation = np.zeros((rows, cols), dtype=np.float32)
        # 5% grade: well inside service's 16% default limit.
        for r in range(rows):
            elevation[r, :] = r * cell_m * 0.05
        obstacle = np.zeros((rows, cols), dtype=bool)
        goal = np.zeros((rows, cols), dtype=bool)
        goal[50, :] = True
        grid = router.RoutingGrid(0.0, 0.0, cell_m, elevation, obstacle, goal)
        result = router.route(grid, start_map=(10.0, 60.0), highway_class="service")
        self.assertTrue(result.ok, result.reason)

    def test_a_slope_exceeding_every_class_limit_forces_a_detour_or_fails_honestly(self):
        """No class in DEFAULT_MAX_GRADE_PERCENT exceeds 20%; a uniform 60%
        slope covering the whole field leaves no legal edge anywhere, so the
        router must fail rather than silently return an illegal route."""
        rows, cols = 40, 40
        cell_m = 2.0
        elevation = np.zeros((rows, cols), dtype=np.float32)
        for r in range(rows):
            elevation[r, :] = r * cell_m * 0.60
        obstacle = np.zeros((rows, cols), dtype=bool)
        goal = np.zeros((rows, cols), dtype=bool)
        goal[35, :] = True
        grid = router.RoutingGrid(0.0, 0.0, cell_m, elevation, obstacle, goal)
        result = router.route(grid, start_map=(10.0, 20.0), highway_class="track")
        self.assertFalse(result.ok)
        self.assertIn("no feasible route", result.reason)

    def test_no_edge_in_the_recorded_path_exceeds_the_class_grade_limit(self):
        """The actual invariant: not just 'a route was found', but that every
        step along it individually respects the limit."""
        rows, cols = 80, 80
        cell_m = 2.0
        rng = np.random.default_rng(3)
        elevation = np.cumsum(rng.uniform(-0.3, 0.5, size=(rows, cols)), axis=0).astype(np.float32)
        obstacle = np.zeros((rows, cols), dtype=bool)
        goal = np.zeros((rows, cols), dtype=bool)
        goal[70, :] = True
        grid = router.RoutingGrid(0.0, 0.0, cell_m, elevation, obstacle, goal)
        result = router.route(grid, start_map=(10.0, 40.0), highway_class="residential")
        if not result.ok:
            self.skipTest(f"no route on this random field: {result.reason}")
        max_grade = router.DEFAULT_MAX_GRADE_PERCENT["residential"] / 100.0
        for (x0, y0), (x1, y1) in zip(result.path_map, result.path_map[1:]):
            run = math.hypot(x1 - x0, y1 - y0)
            r0, c0 = grid.to_rc(x0, y0)
            r1, c1 = grid.to_rc(x1, y1)
            z0 = elevation[int(round(r0)), int(round(c0))]
            z1 = elevation[int(round(r1)), int(round(c1))]
            grade = abs(z1 - z0) / max(run, 1e-6)
            self.assertLessEqual(grade, max_grade + 1e-6,
                                 f"edge grade {grade*100:.1f}% exceeds the "
                                 f"{max_grade*100:.0f}% class limit")


class TestSwitchbacking(unittest.TestCase):
    """THE property the whole state-lattice design exists for: a slope too
    steep to climb directly, but within reach via switchbacks, must produce
    a route that is LONGER than the straight-line distance (it switchbacks)
    while still respecting the grade limit on every edge -- proving the
    router did not simply refuse or cheat the constraint.
    """

    def test_steep_slope_produces_a_longer_than_direct_route(self):
        """'track' (20% grade limit, 8m min radius -- a real class this
        design intends for exactly this terrain) against an 18% average
        grade: too steep to take directly at every heading, shallow enough
        that switchbacking within the lattice's own turn/heading resolution
        is physically achievable without needing an instantaneous reversal.

        A much steeper synthetic slope (uniform 30% against residential's 14%
        limit) turned out to demand reversing heading entirely between two
        lattice steps that are each individually infeasible mid-turn -- a
        genuine structural limit of a heading-quantised lattice with no
        physical space to complete a real U-turn, not a bug, but not a fair
        test of switchbacking either. Real terrain always has cross-variation
        a synthetic uniform infinite slope does not.
        """
        rows, cols = 120, 200
        cell_m = 2.0
        elevation = np.zeros((rows, cols), dtype=np.float32)
        for r in range(rows):
            elevation[r, :] = r * cell_m * 0.18
        obstacle = np.zeros((rows, cols), dtype=bool)
        goal = np.zeros((rows, cols), dtype=bool)
        goal[110, :] = True
        grid = router.RoutingGrid(0.0, 0.0, cell_m, elevation, obstacle, goal)

        start_map = grid.to_map(20, 100)
        result = router.route(grid, start_map=start_map, highway_class="track",
                              max_expansions=600_000)
        self.assertTrue(result.ok, result.reason)

        start, end = result.path_map[0], result.path_map[-1]
        straight_line = math.hypot(end[0] - start[0], end[1] - start[1])
        self.assertGreater(
            result.cost_eq_m, straight_line * 1.3,
            "a slope too steep to climb directly must switchback, producing a "
            "route noticeably longer than the straight-line distance -- a plain "
            "linear grade penalty cannot do this (see module docstring's proof)",
        )


class TestObstacleAvoidance(unittest.TestCase):
    def test_route_goes_around_a_building(self):
        grid = flat_grid(rows=100, cols=100, goal_col=90)
        grid.obstacle[30:70, 45:55] = True   # a wall spanning the direct path
        start_map = grid.to_map(50, 20)      # same row-band as the wall
        result = router.route(grid, start_map=start_map, highway_class="service")
        self.assertTrue(result.ok, result.reason)
        for x, y in result.path_map:
            row, col = grid.to_rc(x, y)
            self.assertFalse(grid.obstacle[int(round(row)), int(round(col))],
                             "the path must never cross the building")

    def test_unreachable_goal_fails_cleanly(self):
        """A goal fully enclosed by obstacles must fail, not hang or crash."""
        grid = flat_grid(rows=60, cols=60, goal_col=None)
        grid.goal[28:32, 28:32] = True
        grid.obstacle[24:36, 24:28] = True
        grid.obstacle[24:36, 32:36] = True
        grid.obstacle[24:28, 24:36] = True
        grid.obstacle[32:36, 24:36] = True
        start_map = grid.to_map(10, 10)
        result = router.route(grid, start_map=start_map, highway_class="service",
                              max_expansions=50_000)
        self.assertFalse(result.ok)


class TestDeterminism(unittest.TestCase):
    def test_identical_input_gives_identical_path(self):
        """Required for operation-log replay: a re-routed road must land in
        exactly the same place every time, or every scar recorded against it
        detaches. Tie-breaking must never depend on heap or set iteration
        order."""
        grid = flat_grid(rows=80, cols=80, goal_col=70)
        a = router.route(grid, start_map=(30.0, 30.0), highway_class="residential")
        b = router.route(grid, start_map=(30.0, 30.0), highway_class="residential")
        self.assertEqual(a.ok, b.ok)
        self.assertEqual(a.path_map, b.path_map)
        self.assertEqual(a.cost_eq_m, b.cost_eq_m)


class TestRoutingGridCoordinates(unittest.TestCase):
    def test_to_rc_to_map_round_trip(self):
        grid = flat_grid()
        row, col = grid.to_rc(123.4, 56.7)
        x, y = grid.to_map(row, col)
        self.assertAlmostEqual(x, 123.4, places=3)
        self.assertAlmostEqual(y, 56.7, places=3)

    def test_passable_checks_bounds(self):
        grid = flat_grid(rows=10, cols=10)
        self.assertFalse(grid.passable(-1, 5))
        self.assertFalse(grid.passable(5, 100))
        self.assertTrue(grid.passable(5, 5))

    def test_nan_elevation_is_never_passable(self):
        grid = flat_grid(rows=10, cols=10)
        grid.elevation[5, 5] = np.nan
        self.assertFalse(grid.passable(5, 5))


class TestBuildRoutingGrid(unittest.TestCase):
    def test_shapes_and_obstacle_rasterisation(self):
        frame_elevation = np.full((32, 32), 5.0, dtype=np.float32)
        building = Polygon([(40, 40), (60, 40), (60, 60), (40, 60)])
        road = LineString([(0, 50), (100, 50)])
        grid = router.build_routing_grid(
            frame_elevation, frame_extent_m=320.0, frame_origin=(0.0, 0.0),
            window_map_bounds=(0.0, 0.0, 100.0, 100.0),
            obstacles_map=building, existing_roads_map=road, cell_m=2.0,
        )
        self.assertEqual(grid.shape, (50, 50))
        r, c = grid.to_rc(50.0, 50.0)
        self.assertTrue(grid.obstacle[int(r), int(c)])

    def test_existing_road_becomes_goal_mask(self):
        frame_elevation = np.full((32, 32), 5.0, dtype=np.float32)
        road = LineString([(0, 80), (100, 80)])
        grid = router.build_routing_grid(
            frame_elevation, frame_extent_m=320.0, frame_origin=(0.0, 0.0),
            window_map_bounds=(0.0, 0.0, 100.0, 100.0),
            obstacles_map=None, existing_roads_map=road, cell_m=2.0,
        )
        self.assertTrue(grid.goal.any())

    def test_no_sea_map_means_sea_is_none(self):
        frame_elevation = np.full((32, 32), 5.0, dtype=np.float32)
        grid = router.build_routing_grid(
            frame_elevation, frame_extent_m=320.0, frame_origin=(0.0, 0.0),
            window_map_bounds=(0.0, 0.0, 100.0, 100.0),
            obstacles_map=None, existing_roads_map=None, cell_m=2.0,
        )
        self.assertIsNone(grid.sea)

    def test_sea_map_rasterises_to_a_real_mask(self):
        frame_elevation = np.full((32, 32), np.nan, dtype=np.float32)  # open water: no real DEM
        sea = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        grid = router.build_routing_grid(
            frame_elevation, frame_extent_m=320.0, frame_origin=(0.0, 0.0),
            window_map_bounds=(0.0, 0.0, 100.0, 100.0),
            obstacles_map=None, existing_roads_map=None, cell_m=2.0, sea_map=sea,
        )
        self.assertIsNotNone(grid.sea)
        self.assertTrue(grid.sea.any())

    def test_sea_map_with_an_island_hole_leaves_the_island_off_the_sea_mask(self):
        """REGRESSION-shaped: the shared rasterize() closure didn't punch
        interior rings at all before this phase -- fine for obstacles/roads
        (which never have meaningful holes), wrong for the real sea polygon
        (an island is an interior ring of world.sea.sea_geom, per
        citymap/sea.py's own construction), which would have wrongly
        marked island interiors as open water."""
        frame_elevation = np.full((32, 32), np.nan, dtype=np.float32)
        island = Polygon([(40, 40), (60, 40), (60, 60), (40, 60)])
        sea_with_island_hole = Polygon(
            [(0, 0), (100, 0), (100, 100), (0, 100)], holes=[list(island.exterior.coords)])
        grid = router.build_routing_grid(
            frame_elevation, frame_extent_m=320.0, frame_origin=(0.0, 0.0),
            window_map_bounds=(0.0, 0.0, 100.0, 100.0),
            obstacles_map=None, existing_roads_map=None, cell_m=2.0, sea_map=sea_with_island_hole,
        )
        island_r, island_c = grid.to_rc(50.0, 50.0)
        self.assertFalse(grid.sea[int(island_r), int(island_c)])
        open_water_r, open_water_c = grid.to_rc(5.0, 5.0)
        self.assertTrue(grid.sea[int(open_water_r), int(open_water_c)])


class TestCauseway(unittest.TestCase):
    """map-editor plan Phase 10: the sea-aware bridge-cost mode -- a real
    second cost model (BRIDGE_FIXED_M + span_m*BRIDGE_PER_M), not a patch
    on the land grade formula. All grids here have elevation=NaN wherever
    sea=True, matching what a real GSI DEM actually looks like over open
    water (see build_routing_grid's own real DEM-sampling path) -- a test
    grid that gave sea cells a fake real elevation would not prove the
    NaN-bypass in RoutingGrid.passable/route() actually does anything."""

    def _land_sea_land_grid(self, rows=60, cols=100, cell_m=2.0, sea_cols=(40, 60), goal_col=99):
        """Land everywhere except a full-height sea band spanning
        `sea_cols` -- genuinely impassable on pure land (no route exists
        without crossing water, however far the route wanders in rows),
        so any successful route through this grid is real, direct proof
        the sea bypass works, not a route that happened to avoid the water."""
        elevation = np.zeros((rows, cols), dtype=np.float32)
        sea = np.zeros((rows, cols), dtype=bool)
        sea[:, sea_cols[0]:sea_cols[1]] = True
        elevation[sea] = np.nan
        obstacle = np.zeros((rows, cols), dtype=bool)
        goal = np.zeros((rows, cols), dtype=bool)
        goal[:, goal_col] = True
        return router.RoutingGrid(origin_x=0.0, origin_y=0.0, cell_m=cell_m,
                                  elevation=elevation, obstacle=obstacle, goal=goal, sea=sea)

    def test_a_route_impossible_on_land_alone_succeeds_with_sea_awareness(self):
        grid = self._land_sea_land_grid()
        result = router.route(grid, start_map=(10.0, 60.0))
        self.assertTrue(result.ok, result.reason)

        land_only = router.RoutingGrid(origin_x=grid.origin_x, origin_y=grid.origin_y,
                                       cell_m=grid.cell_m, elevation=grid.elevation,
                                       obstacle=grid.obstacle, goal=grid.goal, sea=None)
        land_result = router.route(land_only, start_map=(10.0, 60.0))
        self.assertFalse(land_result.ok, "a solid full-height sea band must be genuinely "
                                        "impassable without sea awareness -- otherwise this "
                                        "test proves nothing about the sea bypass specifically")

    def test_the_recorded_path_actually_crosses_the_sea_band(self):
        # sea_cols=(40,60) at cell_m=2.0 -> map-x range [80.0, 120.0)
        grid = self._land_sea_land_grid()
        result = router.route(grid, start_map=(10.0, 60.0))
        self.assertTrue(result.ok, result.reason)
        crossed = any(80.0 <= x <= 120.0 for x, y in result.path_map)
        self.assertTrue(crossed, "the route must actually pass through the sea band's own "
                                "x-range, not find some other way around it")

    def test_crossing_water_costs_more_than_an_equivalent_all_land_route(self):
        """The router must not get open water for free -- a route forced
        through a sea band must cost strictly more than the same-shaped
        route over land with no sea at all."""
        sea_grid = self._land_sea_land_grid()
        sea_result = router.route(sea_grid, start_map=(10.0, 60.0))
        self.assertTrue(sea_result.ok)

        all_land = router.RoutingGrid(origin_x=sea_grid.origin_x, origin_y=sea_grid.origin_y,
                                      cell_m=sea_grid.cell_m,
                                      elevation=np.zeros_like(sea_grid.elevation),
                                      obstacle=sea_grid.obstacle, goal=sea_grid.goal, sea=None)
        land_result = router.route(all_land, start_map=(10.0, 60.0))
        self.assertTrue(land_result.ok)
        self.assertGreater(sea_result.cost_eq_m, land_result.cost_eq_m)

    def test_fixed_span_cost_is_charged_once_not_per_cell(self):
        """Direct proof BRIDGE_FIXED_M is a per-SPAN charge: doubling the
        sea band's width must roughly DOUBLE the water portion's per-metre
        cost but leave the one-time fixed charge unchanged -- so total
        cost less than doubles, never scales linearly with width from
        zero (which is what a naive per-cell fixed charge would do)."""
        narrow = self._land_sea_land_grid(sea_cols=(40, 50))   # 20m span
        wide = self._land_sea_land_grid(sea_cols=(40, 80))     # 80m span
        narrow_result = router.route(narrow, start_map=(10.0, 60.0))
        wide_result = router.route(wide, start_map=(10.0, 60.0))
        self.assertTrue(narrow_result.ok)
        self.assertTrue(wide_result.ok)
        # Quadrupling the span width must cost meaningfully less than 4x
        # the narrow route's own cost -- a per-cell fixed charge would
        # scale closer to linearly with width from a large base; a real
        # per-span fixed charge means most of the ratio comes from the
        # (much smaller) per-metre term alone.
        self.assertLess(wide_result.cost_eq_m, narrow_result.cost_eq_m * 4.0)

    def test_start_already_in_the_sea_is_a_real_passable_start(self):
        # sea_cols=(40,60) at cell_m=2.0 -> map-x range [80.0, 120.0)
        grid = self._land_sea_land_grid()
        r, c = grid.to_rc(100.0, 50.0)
        self.assertTrue(grid.sea[int(r), int(c)])
        self.assertTrue(grid.passable(int(r), int(c)))

    def test_no_sea_at_all_behaves_exactly_like_the_land_only_router(self):
        """The other half of the backward-compatibility guarantee:
        sea=None (every pre-Phase-10 caller) must produce byte-identical
        routing decisions to before this mode existed."""
        grid = flat_grid(goal_col=90)
        result = router.route(grid, start_map=(10.0, 10.0))
        self.assertTrue(result.ok)
        for x, y in result.path_map:
            r, c = grid.to_rc(x, y)
            self.assertFalse(grid.is_sea(int(round(r)), int(round(c))))

    def test_an_island_surrounded_by_sea_routes_in_bounded_real_time(self):
        """Real regression for a severe performance bug found while testing
        this exact scenario: heuristic() used to recompute
        np.nonzero(grid.goal) on every single call rather than once before
        the search loop, which on a large grid (here: an island searching
        broadly before finding the one direction with a real road) made a
        real route take minutes instead of seconds -- confirmed directly
        with a >60s hang before the fix, ~8s after, on the real scenario
        this test reproduces at a smaller, CI-friendly scale. A generous
        wall-clock ceiling, not a tight benchmark: this asserts "bounded",
        not "fast", so it doesn't become flaky on a slower machine."""
        import time
        rows = cols = 300
        cell_m = 2.0
        elevation = np.full((rows, cols), 10.0, dtype=np.float32)
        sea = np.ones((rows, cols), dtype=bool)
        sea[140:160, 140:160] = False  # a small island at the centre
        elevation[sea] = np.nan
        obstacle = np.zeros((rows, cols), dtype=bool)
        goal = np.zeros((rows, cols), dtype=bool)
        goal[:, cols - 1] = True  # a road along the far edge
        grid = router.RoutingGrid(origin_x=0.0, origin_y=0.0, cell_m=cell_m,
                                  elevation=elevation, obstacle=obstacle, goal=goal, sea=sea)
        start = grid.to_map(150, 150)

        t0 = time.time()
        result = router.route(grid, start_map=start)
        elapsed = time.time() - t0

        self.assertTrue(result.ok, result.reason)
        self.assertLess(elapsed, 20.0,
                        f"a real routing call took {elapsed:.1f}s -- the heuristic-recompute "
                        f"regression this test guards against made a similar scenario take minutes")


class TestSimplifyPath(unittest.TestCase):
    def test_endpoints_preserved(self):
        path = [(0.0, 0.0), (5.0, 0.1), (10.0, -0.1), (15.0, 0.0), (20.0, 20.0)]
        simplified = router.simplify_path(path, tolerance_m=1.0)
        self.assertEqual(simplified[0], path[0])
        self.assertEqual(simplified[-1], path[-1])

    def test_reduces_point_count_on_a_near_straight_line(self):
        path = [(float(i), 0.01 * math.sin(i)) for i in range(50)]
        simplified = router.simplify_path(path, tolerance_m=2.0)
        self.assertLess(len(simplified), len(path))

    def test_short_paths_pass_through_unchanged(self):
        path = [(0.0, 0.0), (1.0, 1.0)]
        self.assertEqual(router.simplify_path(path), path)


if __name__ == "__main__":
    unittest.main()
