# -*- coding: utf-8 -*-
"""Parametric array placement -- map-editor plan Phase 9 (wish #6): "a row
of buildings at even spacing along a road, a drawn line, or a ghost-line
offset."

Unlike terrace.py/wall_on_foundation.py, this is NOT a pure geometry
function: whether an instance's placement is actually clear, and whether it
gets a real access road, needs the same real data those questions always
need in this codebase -- Fields (existing buildings/roads, elevation) and
citymap.ops.router's real curvature-constrained A*.

Deliberately NOT built on citymap.ops.construct.apply_construct (the
op-log-era placement tool, tied to World/Operation, superseded by this
project's GeoPackage-store live-editing stack starting at Phase 1 of the
map-editor plan). What IS reused from construct.py/siting.py -- because it
is genuinely stack-independent, not because "reuse siting.py" was taken
literally -- is: the router itself (router.py has no World/Operation
dependency at all), the footprint-conflict-candidate/label helpers
(_is_conflict_candidate/_conflict_label), the routing-window sizing
constants, _rotate_translate's own placement math, and siting.py's
MAX_ROAD_DISTANCE_FOR_ROUTING_M guard -- a real, hard-won limit (a 45-minute
routing hang was hit and fixed there once already) that must carry forward
here unchanged, imported directly rather than re-derived, so the two never
drift apart.

Baseline scope, stated plainly: this module accepts any LineString as the
baseline, in SOURCE CRS, regardless of where it came from. The plan's three
baseline sources ("a road, a drawn line, or a ghost-line offset") are all
just LineStrings by the time they reach here -- an existing road's own
geometry, a freshly hand-drawn line, or a line traced along a ghost-line
guide (Phase 5's own snapping already lets a hand-drawn line snap onto a
ghost line's points) all arrive identically. A separate "pick an existing
feature as the baseline" UI is not built in this phase -- tracing along a
road by hand, with Phase 5's vertex/segment snapping on, already reaches
the same real road geometry closely; a dedicated picker is a smaller,
later UI addition, not a backend capability gap.

Each instance is placed one at a time, in order along the baseline, and
checked against every OTHER instance already placed in THIS SAME call, not
just pre-existing map features -- "instance i+1 sees instance i" is what
catches a too-tight spacing_m producing overlapping buildings, which
independent per-instance placement never could.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional

from shapely.geometry import LineString, Polygon
from shapely.ops import nearest_points, unary_union

from ..editor.siting import MAX_ROAD_DISTANCE_FOR_ROUTING_M
from ..ops import construct as construct_module
from ..ops import router as router_module

# Each instance that needs a driveway can trigger a real A* routing call --
# see router.py's own module docstring on why that is not cheap. Refuse
# loudly well before an array request could take minutes, rather than
# silently accepting one that will.
MAX_ARRAY_INSTANCES = 40

COMPATIBLE_HIGHWAY_CLASSES = {"motorway", "trunk", "primary", "secondary", "tertiary",
                              "residential", "unclassified", "service", "track"}

# How far past the footprint's own edge to push a routing start point --
# clears the footprint's own rasterised obstacle cell (construct.py's own
# apply_construct does the same 4.0m push along its frontage direction).
ROUTE_START_OFFSET_M = 4.0


class ArrayError(Exception):
    pass


@dataclass
class ArrayInstance:
    index: int
    footprint: Polygon                          # SOURCE CRS
    rotation_deg: float
    access_road: Optional[LineString] = None     # SOURCE CRS, or None
    road_note: Optional[str] = None              # why there's no road, when there isn't one


@dataclass
class ArraySkip:
    index: int
    reason: str


@dataclass
class ArrayResult:
    instances: List[ArrayInstance]
    skipped: List[ArraySkip]
    spacing_used_m: float


def _tangent_rotation_deg(baseline: LineString, dist: float) -> float:
    """The value to feed AS rotation_deg into construct_module._rotate_translate
    so a unit footprint's own local +y ("north", as drawn) ends up pointing
    along the baseline's tangent direction at arc-length `dist`.

    NOT a plain compass bearing (atan2(dx, dy), 0=north/90=east clockwise)
    despite looking similar -- confirmed empirically that _rotate_translate
    applies a standard mathematical (counterclockwise) rotation, so feeding
    it a plain compass bearing produces a MIRRORED placement (a vector "at
    bearing 90" ends up pointing west, not east). The correct value is the
    NEGATED bearing, applied below. This is a real, pre-existing property
    of _rotate_translate itself, not new to this module -- citymap/editor/
    siting.py's own _rectangle_orientation_deg/_nearest_road_bearing_deg
    feed a plain (non-negated) bearing into the very same function, which
    likely goes unnoticed there only because siting.py tries symmetric
    template rotations {bearing, bearing+90} and checks solely whether the
    result FITS inside the drawn polygon, never whether it faces the
    intended direction. Worth a fix there if that module's orientation
    ever becomes user-visible in a way that would surface a mirrored fit;
    out of scope for this module to change.
    """
    length = baseline.length
    eps = max(0.5, length * 0.01)
    ahead = baseline.interpolate(min(dist + eps, length))
    behind = baseline.interpolate(max(dist - eps, 0.0))
    if ahead.distance(behind) < 1e-9:
        return 0.0
    bearing_deg = math.degrees(math.atan2(ahead.x - behind.x, ahead.y - behind.y))
    return -bearing_deg


def _route_driveway(footprint_map: Polygon, frame, fields,
                    existing_buildings_map, placed_map: List[Polygon], existing_roads_map, *,
                    routing_cell_m: float, routing_window_min_m: float, routing_window_margin_m: float
                    ) -> "tuple[Optional[LineString], Optional[str]]":
    """A real routed driveway from `footprint_map`'s own nearest edge to
    `existing_roads_map`, or (None, reason) if none was found/attempted.
    Mirrors apply_construct's own routing call shape (window sizing, cell
    size) but works entirely in terms of Fields/frame -- no World, no
    Operation, no op-log persistence. The three routing_* parameters default
    (in place_array below) to construct.py's own real production constants;
    exposed here as parameters, not hardcoded, purely so tests can shrink the
    routing window/cell size and stay fast without touching production
    behaviour -- ROUTING_WINDOW_MIN_M alone imposes a real >=500m half-window
    on every call at production scale, real but slow to exercise in a test.

    The frontage/start point is the footprint's own nearest point to the
    REAL road network (`existing_roads_map`), NOT to the baseline the
    instances were arrayed along -- a real bug caught by this module's own
    test suite: an instance's footprint is CENTRED on its baseline point
    (see place_array), so "nearest point on the baseline" sits at or inside
    the footprint's own edge, a degenerate, near-zero direction vector, and
    the pushed-out start point still landed inside the footprint's own
    rasterised obstacle cell -- confirmed directly via router.py's own
    honest "start cell is not passable" rejection, not a silent failure.
    Aiming at the real road instead gives a real, non-degenerate direction
    in the overwhelmingly common case (a baseline is not usually itself the
    road being connected to).
    """
    nearest_on_footprint, nearest_on_road = nearest_points(footprint_map.exterior, existing_roads_map)
    dx = nearest_on_road.x - nearest_on_footprint.x
    dy = nearest_on_road.y - nearest_on_footprint.y
    d = math.hypot(dx, dy) or 1.0
    start_map = (nearest_on_footprint.x + dx / d * ROUTE_START_OFFSET_M,
                nearest_on_footprint.y + dy / d * ROUTE_START_OFFSET_M)

    obstacles_map = unary_union([existing_buildings_map, footprint_map] + placed_map)
    half_window = (max(routing_window_min_m, 2.5 * footprint_map.distance(existing_roads_map))
                  + routing_window_margin_m)
    window_bounds = (start_map[0] - half_window, start_map[1] - half_window,
                     start_map[0] + half_window, start_map[1] + half_window)

    grid = router_module.build_routing_grid(
        fields.elevation, frame.extent_m, frame.origin, window_bounds,
        obstacles_map, existing_roads_map, cell_m=routing_cell_m)
    result = router_module.route(grid, start_map, highway_class="service")
    if not result.ok:
        return None, f"routing failed: {result.reason}"
    simplified = router_module.simplify_path([start_map] + result.path_map, tolerance_m=3.0)
    return LineString(simplified), None


def place_array(unit_footprint_source: Polygon, baseline_source: LineString, *, frame, fields,
                spacing_m: float, unit_height_m: float, unit_tags: dict,
                orientation_offset_deg: float = 0.0, skip_access_road: bool = False,
                max_instances: int = MAX_ARRAY_INSTANCES,
                routing_cell_m: float = construct_module.ROUTING_CELL_M,
                routing_window_min_m: float = construct_module.ROUTING_WINDOW_MIN_M,
                routing_window_margin_m: float = construct_module.ROUTING_WINDOW_MARGIN_M
                ) -> ArrayResult:
    """Place copies of `unit_footprint_source` at even spacing along
    `baseline_source` (both SOURCE CRS), oriented to the baseline's local
    tangent at each point plus `orientation_offset_deg`.

    Raises ArrayError for non-positive spacing_m, an empty/invalid unit
    footprint or baseline, or a spacing/baseline-length combination that
    would exceed `max_instances` -- refused loudly, before any routing is
    attempted, rather than accepted and left to run for however long that
    many real A* calls take.
    """
    if spacing_m <= 0:
        raise ArrayError(f"spacing_m must be positive, got {spacing_m}")
    if unit_footprint_source.is_empty or not unit_footprint_source.is_valid:
        raise ArrayError("unit footprint is empty or invalid")
    if baseline_source.is_empty or baseline_source.length < 1e-6:
        raise ArrayError("baseline is empty or has zero length")

    baseline_map = LineString([frame.to_map(x, y) for x, y in baseline_source.coords])
    unit_map = Polygon([frame.to_map(x, y) for x, y in unit_footprint_source.exterior.coords])
    centroid = unit_map.centroid
    unit_local = [(x - centroid.x, y - centroid.y) for x, y in unit_map.exterior.coords[:-1]]

    count = max(1, math.floor(baseline_map.length / spacing_m) + 1)
    if count > max_instances:
        raise ArrayError(
            f"spacing_m={spacing_m}m over a {baseline_map.length:.0f}m baseline would place "
            f"{count} instances, over this tool's {max_instances}-instance cap -- use a larger "
            f"spacing or a shorter baseline.")

    existing_buildings_map = unary_union([f.geom for f in fields.features if f.is_building()]) or Polygon()
    infra_candidates = [f for f in fields.features if construct_module._is_conflict_candidate(f)]
    road_geoms = [f.geom for f in fields.features
                 if not f.area and f.tags.get("highway") in COMPATIBLE_HIGHWAY_CLASSES]
    existing_roads_map = unary_union(road_geoms) if road_geoms else None

    placed_map: List[Polygon] = []
    instances: List[ArrayInstance] = []
    skipped: List[ArraySkip] = []

    for i in range(count):
        dist = min(i * spacing_m, baseline_map.length)
        point = baseline_map.interpolate(dist)
        rotation_deg = _tangent_rotation_deg(baseline_map, dist) + orientation_offset_deg

        footprint_map = Polygon(
            [construct_module._rotate_translate(p, rotation_deg, (point.x, point.y)) for p in unit_local])
        if not footprint_map.is_valid:
            footprint_map = footprint_map.buffer(0)

        conflicts = []
        if existing_buildings_map.intersects(footprint_map):
            conflicts.append("an existing building")
        for j, prior in enumerate(placed_map):
            if prior.intersects(footprint_map):
                conflicts.append(f"instance {j}")
        for f in infra_candidates:
            if footprint_map.intersects(f.geom):
                conflicts.append(construct_module._conflict_label(f))
        if conflicts:
            skipped.append(ArraySkip(index=i, reason=f"footprint conflicts with {', '.join(conflicts)}"))
            continue

        access_road_map, road_note = None, None
        if skip_access_road:
            road_note = "access road routing skipped (skipAccessRoad)"
        elif existing_roads_map is None or existing_roads_map.is_empty:
            road_note = "no road network found in range"
        else:
            dist_to_road = footprint_map.distance(existing_roads_map)
            if dist_to_road > MAX_ROAD_DISTANCE_FOR_ROUTING_M:
                road_note = (f"nearest road is {dist_to_road:.0f}m away, over this tool's "
                            f"{MAX_ROAD_DISTANCE_FOR_ROUTING_M:.0f}m routing-attempt cap")
            else:
                access_road_map, road_note = _route_driveway(
                    footprint_map, frame, fields, existing_buildings_map,
                    placed_map, existing_roads_map, routing_cell_m=routing_cell_m,
                    routing_window_min_m=routing_window_min_m,
                    routing_window_margin_m=routing_window_margin_m)

        instances.append(ArrayInstance(
            index=i,
            footprint=Polygon([frame.to_source(x, y) for x, y in footprint_map.exterior.coords]),
            rotation_deg=rotation_deg,
            access_road=(LineString([frame.to_source(x, y) for x, y in access_road_map.coords])
                        if access_road_map is not None else None),
            road_note=road_note))
        placed_map.append(footprint_map)

    return ArrayResult(instances=instances, skipped=skipped, spacing_used_m=spacing_m)
