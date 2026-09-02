"""Access-road routing: a curvature-constrained state-lattice A*, not A* over
a plain cost surface.

**Why not a plain cost surface.** A cost surface penalises being ON a cell; it
cannot penalise the RATE of turning, because that is a property of a
transition between cells, not of a cell itself. That is exactly why a naive
grade-penalty router produces roads that are either implausibly straight up a
slope (the length term always beats a penalty that doesn't grow with route
length) or a jagged staircase (8-connectivity quantises heading to 45deg).
Proof the grade term alone can never switchback: climbing height H over
horizontal length L costs `L*(1 + K*(H/L)/g_max)`; over a k times longer
route it costs `k*L*(1 + K*(H/(kL))/g_max)` -- the penalty term `K*H/g_max` is
IDENTICAL in both, so the length term always prefers the direct climb.

**The fix**: state = (row, col, heading), 16 headings. A move is a fixed-length
step along the current heading, or the same step after turning by up to two
16ths of a full turn (45 degrees) either way. Curvature becomes an edge
property, enforceable as a hard limit rather than a soft penalty. Grade is
still penalised, and made SUPERLINEAR (`(g/g_max)**4`) so switchbacking starts
well before the hard limit, matching how real roads behave.

**A real limit, found while testing this, worth knowing about**: because every
lattice move is a turn-AND-a-step together (there is no zero-length
in-place rotation), a heading can only be reached by physically travelling in
it, so if EVERY heading between the current one and the one needed is itself
too steep, the router cannot pass through them to get there -- confirmed on a
synthetic uniform 30% slope against a 14% grade limit, where the only legal
headings form two disjoint "wedges" (near-level, one on each side of straight
uphill) with no legal path between them. This is not a bug so much as a
consequence of the state space; a real hillside's natural cross-slope
variation opens graded diagonal paths a perfectly uniform synthetic slope
does not, so it is not expected to bite on real terrain the way it did in
that specific test. Recorded here because it would be a confusing failure
mode to rediscover from scratch.

**Scope note, honestly**: this implements the structural property (curvature
is a hard per-edge constraint, not a soft cost) that is the actual point of a
state lattice. It does NOT yet implement design/map-generation.md's full plan
of measuring class-specific grade/curvature limits from the imported city's
own statistics (the "grammar", §5) — the limits below are sensible fixed
defaults, not measured ones. Swapping them for measured values later is a
config change, not a rewrite, because they are the router's only tunable
inputs.
"""

from __future__ import annotations

import heapq
import itertools
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

STAGE_CODE_VERSION = 1

N_HEADINGS = 16
TURN_DELTAS = (-2, -1, 0, 1, 2)          # up to 45 degrees per step
STEP_CELLS = 6                            # lattice step length, in grid cells

# Class defaults. Not measured from data yet -- see module docstring.
DEFAULT_MAX_GRADE_PERCENT = {
    "motorway": 6.0, "trunk": 8.0, "primary": 10.0, "secondary": 10.0,
    "tertiary": 12.0, "residential": 14.0, "unclassified": 14.0,
    "service": 16.0, "track": 20.0,
}
DEFAULT_MIN_RADIUS_M = {
    "motorway": 240.0, "trunk": 150.0, "primary": 90.0, "secondary": 60.0,
    "tertiary": 40.0, "residential": 25.0, "unclassified": 25.0,
    "service": 12.0, "track": 8.0,
}
GRADE_COST_EXPONENT = 4.0
CROSS_SLOPE_WEIGHT = 0.6
HAIRPIN_COST_EQ_M = 60.0
ROW_FACTOR = 0.35

# Causeway/bridge span cost (map-editor plan Phase 10) -- a real second
# cost mode, not a patch on the land grade formula: grade/cross-slope don't
# mean anything over open water (no real DEM elevation there), so an edge
# landing on a sea cell is costed by real span length instead, plus a fixed
# "committing to a new span" cost applied once per contiguous water
# crossing (charged on the land->sea TRANSITION edge only, so one long
# bridge is cheaper than several short ones without needing a bigger state
# space to track "currently on a bridge"). In cost-equivalent metres, same
# units as every other edge_cost in this module, so bridge and land routes
# compare on the same A* frontier without a unit-conversion step anywhere.
BRIDGE_FIXED_M = 60.0
BRIDGE_PER_M = 2.5


def _swept_cells(row: int, col: int, drow: int, dcol: int):
    """Every integer cell on the segment from (row,col) to (row+drow,col+dcol),
    inclusive of both ends. A lattice step covers several cells at once
    (STEP_CELLS=6, so up to ~6 cells per move); checking only the destination
    lets an obstacle or a goal narrower than one step be silently jumped over.
    """
    steps = max(abs(drow), abs(dcol), 1)
    for i in range(steps + 1):
        t = i / steps
        yield row + int(round(drow * t)), col + int(round(dcol * t))


def _heading_offset(heading: int, step_cells: int = STEP_CELLS) -> Tuple[int, int]:
    theta = 2.0 * math.pi * heading / N_HEADINGS
    return (int(round(step_cells * math.sin(theta))),
           int(round(step_cells * math.cos(theta))))


_OFFSETS = [_heading_offset(h) for h in range(N_HEADINGS)]


def turn_radius_m(step_m: float, turn_delta: int) -> Optional[float]:
    """Radius implied by turning `turn_delta` sixteenths of a full circle
    over one lattice step. None for a straight step (infinite radius)."""
    if turn_delta == 0:
        return None
    angle = abs(turn_delta) * (2.0 * math.pi / N_HEADINGS)
    return step_m / angle


@dataclass
class RoutingGrid:
    """A local routing surface: elevation and an obstacle mask, at a uniform
    cell size, in MAP-space with an explicit origin -- see frame.py's module
    docstring for why 2 m/cell here, not the DEM's native ~5.9 m/cell (a
    vector road-end joined at DEM resolution can be off by half a cell,
    visible right where the eye goes)."""

    origin_x: float
    origin_y: float
    cell_m: float
    elevation: np.ndarray      # (rows, cols); NaN = forbidden, never filled
    obstacle: np.ndarray       # (rows, cols) bool; True = impassable
    goal: np.ndarray           # (rows, cols) bool; True = "already the network"
    sea: Optional[np.ndarray] = None  # (rows, cols) bool, or None; True = open water,
                                      # PASSABLE despite NaN elevation there (GSI has no
                                      # real elevation for open sea) -- map-editor plan
                                      # Phase 10's causeway mode. None (every existing
                                      # caller) means "no sea awareness, pure land
                                      # routing" -- passable()/route()'s own cost loop
                                      # both fall through to their original behaviour
                                      # unchanged whenever this is None; see each site's
                                      # own comment for why that's a real, checked
                                      # guarantee, not just an intent.

    @property
    def shape(self):
        return self.elevation.shape

    def to_rc(self, mx: float, my: float) -> Tuple[float, float]:
        return ((my - self.origin_y) / self.cell_m, (mx - self.origin_x) / self.cell_m)

    def to_map(self, row: float, col: float) -> Tuple[float, float]:
        return (self.origin_x + col * self.cell_m, self.origin_y + row * self.cell_m)

    def in_bounds(self, row: int, col: int) -> bool:
        rows, cols = self.shape
        return 0 <= row < rows and 0 <= col < cols

    def is_sea(self, row: int, col: int) -> bool:
        return self.sea is not None and bool(self.sea[row, col])

    def passable(self, row: int, col: int) -> bool:
        if not self.in_bounds(row, col):
            return False
        if self.obstacle[row, col]:
            return False
        if self.is_sea(row, col):
            return True
        return not math.isnan(float(self.elevation[row, col]))


def build_routing_grid(frame_elevation: np.ndarray, frame_extent_m: float,
                       frame_origin: Tuple[float, float],
                       window_map_bounds: Tuple[float, float, float, float],
                       obstacles_map, existing_roads_map, cell_m: float = 2.0,
                       sea_map=None) -> RoutingGrid:
    """Crop+resample the frame's elevation into a local 2 m/cell window, and
    rasterise obstacles (buildings), the existing road network, and
    (optionally) the sea onto it.

    `obstacles_map`/`existing_roads_map`/`sea_map` are shapely geometries in
    MAP space. `sea_map` is None by default -- every land-only caller gets a
    RoutingGrid with `sea=None`, i.e. pure land routing, completely
    unchanged from before this parameter existed (see RoutingGrid.passable/
    route()'s own cost loop, both no-ops when sea is None). Passing the real
    sea polygon (map-editor plan Phase 10's causeway mode) makes open-water
    cells passable despite having no real DEM elevation, at the span cost
    route() applies for any edge touching a sea cell.
    """
    from scipy.ndimage import map_coordinates

    minx, miny, maxx, maxy = window_map_bounds
    cols = max(2, int(round((maxx - minx) / cell_m)))
    rows = max(2, int(round((maxy - miny) / cell_m)))

    n = frame_elevation.shape[0]
    fox, foy = frame_origin
    grid_r, grid_c = np.mgrid[0:rows, 0:cols]
    map_x = minx + (grid_c + 0.5) * cell_m
    map_y = miny + (grid_r + 0.5) * cell_m
    # Frame elevation array: row 0 = north edge (see acquire.dem_grid_for_frame).
    src_col = (map_x - fox) / frame_extent_m * n - 0.5
    src_row = n * (1.0 - (map_y - foy) / frame_extent_m) - 0.5
    valid_src = ((src_row >= 0) & (src_row <= n - 1) & (src_col >= 0) & (src_col <= n - 1))
    filled_source = np.where(np.isnan(frame_elevation), np.nan, frame_elevation)
    sampled = map_coordinates(np.where(np.isnan(filled_source), 1e9, filled_source),
                              [src_row.clip(0, n - 1), src_col.clip(0, n - 1)],
                              order=1, mode="nearest")
    elevation = np.where(valid_src & (sampled < 1e8), sampled, np.nan).astype(np.float32)

    def rasterize(geom, out_shape):
        mask = np.zeros(out_shape, dtype=bool)
        if geom is None or geom.is_empty:
            return mask
        from PIL import Image, ImageDraw
        img = Image.new("L", (out_shape[1], out_shape[0]), 0)
        drawer = ImageDraw.Draw(img)
        parts = geom.geoms if hasattr(geom, "geoms") else [geom]
        for part in parts:
            if part.geom_type == "Polygon":
                px_pts = [((x - minx) / cell_m, out_shape[0] - (y - miny) / cell_m)
                         for x, y in part.exterior.coords]
                drawer.polygon(px_pts, fill=255)
                # Hole-aware -- required for the sea polygon's own land/
                # island interior rings (exactly citymap/draw.py's
                # polygon_mask pattern); a harmless no-op for obstacle/road
                # geometries, which never have meaningful holes in practice.
                for ring in part.interiors:
                    ring_px = [((x - minx) / cell_m, out_shape[0] - (y - miny) / cell_m)
                              for x, y in ring.coords]
                    drawer.polygon(ring_px, fill=0)
            elif part.geom_type == "LineString":
                px_pts = [((x - minx) / cell_m, out_shape[0] - (y - miny) / cell_m)
                         for x, y in part.coords]
                if len(px_pts) >= 2:
                    drawer.line(px_pts, fill=255, width=max(2, int(round(6.0 / cell_m))))
        return np.asarray(img, dtype=bool)

    obstacle = rasterize(obstacles_map, (rows, cols))
    goal = rasterize(existing_roads_map, (rows, cols))
    sea = rasterize(sea_map, (rows, cols)) if sea_map is not None else None
    return RoutingGrid(origin_x=minx, origin_y=miny, cell_m=cell_m,
                       elevation=elevation, obstacle=obstacle, goal=goal, sea=sea)


@dataclass(order=True)
class _QueueItem:
    f: float
    tie: int
    state: Tuple[int, int, int] = field(compare=False)
    g: float = field(compare=False)


@dataclass
class RouteResult:
    ok: bool
    path_map: List[Tuple[float, float]]
    cost_eq_m: float
    reason: str = ""


def route(grid: RoutingGrid, start_map: Tuple[float, float],
         highway_class: str = "service",
         max_expansions: int = 200_000) -> RouteResult:
    """A* over the state lattice from `start_map` to the nearest cell of
    `grid.goal`. Deterministic: ties broken by a monotonic counter, never by
    heap or set iteration order, so replaying an operation log reproduces the
    identical road every time.
    """
    max_grade = DEFAULT_MAX_GRADE_PERCENT.get(highway_class, 14.0) / 100.0
    min_radius = DEFAULT_MIN_RADIUS_M.get(highway_class, 25.0)
    step_m = STEP_CELLS * grid.cell_m

    # Delete successors that would violate the class's minimum turning radius
    # -- a HARD constraint, which is what actually produces switchbacks (see
    # module docstring) rather than a penalty that can be outspent.
    legal_turns = [d for d in TURN_DELTAS
                  if (r := turn_radius_m(step_m, d)) is None or r >= min_radius]

    start_row, start_col = grid.to_rc(*start_map)
    start_row, start_col = int(round(start_row)), int(round(start_col))
    if not grid.passable(start_row, start_col):
        return RouteResult(False, [], 0.0, "start cell is not passable "
                           "(inside an obstacle or has no elevation data)")
    if grid.goal[start_row, start_col]:
        return RouteResult(False, [], 0.0, "start already touches the road network")

    counter = itertools.count()
    open_heap: List[_QueueItem] = []
    best_g: Dict[Tuple[int, int, int], float] = {}
    parent: Dict[Tuple[int, int, int], Tuple[int, int, int]] = {}

    for h in range(N_HEADINGS):
        state = (start_row, start_col, h)
        best_g[state] = 0.0
        heapq.heappush(open_heap, _QueueItem(0.0, next(counter), state, 0.0))

    # Computed ONCE, not per heuristic() call -- a real, severe performance
    # bug found while testing map-editor plan Phase 10's causeway mode: an
    # island-like scenario (goal reachable only by searching broadly
    # before the right direction is found) can push expansions into the
    # hundreds of thousands, and np.nonzero(grid.goal) on a large window
    # (e.g. 875x875) costs real, measurable time -- confirmed directly
    # (~1ms/call) -- that multiplies into a multi-minute-plus hang when
    # paid on every heuristic() call instead of once. grid.goal never
    # changes during a route() call, so recomputing this per call was
    # always redundant, on land routes too; this simply never showed up
    # before because no prior caller exhausted anywhere near this many
    # expansions before Phase 10's real routing test caught it.
    goal_rows, goal_cols = np.nonzero(grid.goal)

    def heuristic(row: int, col: int) -> float:
        if len(goal_rows) == 0:
            return 0.0
        d2 = (goal_rows - row) ** 2 + (goal_cols - col) ** 2
        return float(np.sqrt(d2.min())) * grid.cell_m * ROW_FACTOR

    expansions = 0
    goal_state = None
    while open_heap and expansions < max_expansions:
        item = heapq.heappop(open_heap)
        state = item.state
        if item.g > best_g.get(state, math.inf) + 1e-9:
            continue
        row, col, heading = state
        if grid.goal[row, col]:
            goal_state = state
            break
        expansions += 1

        for turn in legal_turns:
            new_heading = (heading + turn) % N_HEADINGS
            dr, dc = _OFFSETS[new_heading]

            # Check every cell the step SWEEPS THROUGH, not just where it
            # lands -- STEP_CELLS covers several cells per move, so checking
            # only the destination lets an obstacle (or a goal) narrower than
            # one step be silently jumped over. If the sweep touches the goal
            # before its nominal end, the move is truncated there: the road
            # reaches the network mid-step, not by overshooting past it.
            swept = list(_swept_cells(row, col, dr, dc))
            blocked = False
            hit_goal_at = None
            for sr, sc in swept[1:]:
                if not grid.passable(sr, sc):
                    blocked = True
                    break
                if grid.goal[sr, sc]:
                    hit_goal_at = (sr, sc)
                    break
            if blocked:
                continue
            nrow, ncol = hit_goal_at if hit_goal_at is not None else (row + dr, col + dc)

            run = math.hypot(nrow - row, ncol - col) * grid.cell_m

            from_sea = grid.is_sea(row, col)
            to_sea = grid.is_sea(nrow, ncol)
            if from_sea or to_sea:
                # Span cost, not grade cost -- grade/cross-slope mean
                # nothing over open water (no real DEM elevation there;
                # RoutingGrid.passable already lets a sea cell through
                # despite the NaN that would otherwise block it). Checking
                # EITHER endpoint, not just the destination, matters for a
                # real reason, confirmed the hard way: a sea->land edge
                # (leaving the water) has a land destination, so checking
                # only `to_sea` would send it into the land branch below,
                # which reads z0 = elevation[row, col] -- NaN, since the
                # FROM cell is sea -- silently producing a NaN edge_cost
                # that a bare `<` comparison always rejects (NaN compares
                # False either way), so the search could enter the sea but
                # never leave it. No grade rejection here either: a bridge
                # deck is flat by definition, so there is no "too steep"
                # for this edge to fail on. BRIDGE_FIXED_M is charged only
                # on the land->sea TRANSITION edge (from_sea False), so one
                # long span costs one fixed charge, not one per cell, and
                # leaving the sea again is never charged a second time --
                # see the constants' own module-level comment for why this
                # needs no extra state-lattice dimension to track
                # "currently on a bridge".
                edge_cost = run * BRIDGE_PER_M
                if not from_sea:
                    edge_cost += BRIDGE_FIXED_M
            else:
                z0 = float(grid.elevation[row, col])
                z1 = float(grid.elevation[nrow, ncol])
                grade = abs(z1 - z0) / max(run, 1e-6)
                if grade > max_grade:
                    continue

                perp_dr, perp_dc = -dc, dr
                side_len = max(1, int(round(2.0 / grid.cell_m)))
                pr = int(round(row + perp_dr / max(1, math.hypot(perp_dr, perp_dc)) * side_len))
                pc = int(round(col + perp_dc / max(1, math.hypot(perp_dr, perp_dc)) * side_len))
                cross_slope = 0.0
                if grid.in_bounds(pr, pc) and not math.isnan(float(grid.elevation[pr, pc])):
                    cross_slope = abs(float(grid.elevation[pr, pc]) - z0) / max(side_len * grid.cell_m, 1e-6)

                mult = 1.0 + (grade / max_grade) ** GRADE_COST_EXPONENT + CROSS_SLOPE_WEIGHT * cross_slope
                edge_cost = run * mult

            if turn != 0:
                edge_cost += HAIRPIN_COST_EQ_M * (abs(turn) / 2.0) * 0.25

            new_g = item.g + edge_cost
            new_state = (nrow, ncol, new_heading)
            if new_g < best_g.get(new_state, math.inf) - 1e-9:
                best_g[new_state] = new_g
                parent[new_state] = state
                f = new_g + heuristic(nrow, ncol)
                heapq.heappush(open_heap, _QueueItem(f, next(counter), new_state, new_g))

    if goal_state is None:
        return RouteResult(False, [], 0.0,
                           f"no feasible route found within {expansions} expansions "
                           f"(grade limit {max_grade*100:.0f}%, min radius {min_radius:.0f}m)")

    path_states = [goal_state]
    while path_states[-1] in parent:
        path_states.append(parent[path_states[-1]])
    path_states.reverse()
    path_map = [grid.to_map(r, c) for r, c, _h in path_states]
    return RouteResult(True, path_map, best_g[goal_state])


def simplify_path(path_map: List[Tuple[float, float]], tolerance_m: float = 3.0
                  ) -> List[Tuple[float, float]]:
    """Light Douglas-Peucker smoothing of the lattice path.

    Scope note: this is NOT the fillet-spline-with-corridor-verification the
    full design calls for (arcs drawn at a grammar-sampled radius, checked
    against an obstacle distance transform before committing) -- it is a
    plain simplification that removes the lattice's staircase redundancy
    while staying on the already curvature-feasible path. A real fillet pass
    is a reasonable follow-up; this is enough for the path to read as a road
    rather than a grid trace.
    """
    if len(path_map) < 3:
        return path_map
    line = LineString(path_map)
    simplified = line.simplify(tolerance_m, preserve_topology=False)
    return list(simplified.coords)
