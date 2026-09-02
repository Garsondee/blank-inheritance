# -*- coding: utf-8 -*-
"""Causeway routing -- map-editor plan Phase 10 (wish #3, causeway half):
route a real, curvature-constrained road from a point to the nearest real
road, ALLOWED to cross open water via a costed bridge span
(citymap.ops.router's new sea-aware mode) when land alone can't reach.

Scope, stated plainly: this is NOT wired to "place an offshore structure
first" the way ideas/entries/offshore-construction.json's own phase (c)
originally envisioned it (routing a driveway FROM a newly-built offshore
building). No tool in this live-editing stack places a single freestanding
structure yet (Phase 9's arrays place repeated footprints along a baseline,
not a one-off building) -- inventing that capability wasn't asked for by
Phase 8/9/10's own text. Instead, this is a standalone, genuinely useful
capability on its own: pick any point (the centre of a freshly reclaimed
platform, an existing building, empty water, anywhere), get a real routed
connection to the nearest road, crossing water via a real bridge span when
needed. Mirrors citymap.tools.array_place._route_driveway's shape closely
(same MAX_ROAD_DISTANCE_FOR_ROUTING_M guard, same routing-window sizing) --
not reused directly, since that function is built around a FOOTPRINT's own
nearest edge to a baseline, not a raw point routing to the real road
network with sea-crossing enabled.
"""

from __future__ import annotations

from dataclasses import dataclass

from shapely.geometry import LineString, Point
from shapely.ops import unary_union

from ..editor.siting import MAX_ROAD_DISTANCE_FOR_ROUTING_M
from ..ops import construct as construct_module
from ..ops import router as router_module

COMPATIBLE_HIGHWAY_CLASSES = {"motorway", "trunk", "primary", "secondary", "tertiary",
                              "residential", "unclassified", "service", "track"}


class CausewayError(Exception):
    pass


@dataclass
class CausewayResult:
    route: LineString      # SOURCE CRS
    crosses_water: bool
    length_m: float


def route_causeway(start_point_source: Point, frame, fields, *, highway_class: str = "service",
                   routing_cell_m: float = construct_module.ROUTING_CELL_M,
                   routing_window_min_m: float = construct_module.ROUTING_WINDOW_MIN_M,
                   routing_window_margin_m: float = construct_module.ROUTING_WINDOW_MARGIN_M
                   ) -> CausewayResult:
    """Route from `start_point_source` (SOURCE CRS) to the nearest real
    road in `fields`, crossing water when the real sea geometry
    (`fields.sea_features()`, the same synthesised `__sea__`-tagged Feature
    Fields.build_fields already carries) makes that necessary/cheaper.

    Raises CausewayError if there's no road network in range at all, if the
    nearest road is beyond MAX_ROAD_DISTANCE_FOR_ROUTING_M (the same
    hard-won guard array_place.py/siting.py already carry), or if the A*
    search itself fails to find any feasible route (router.py's own honest
    reason string is preserved in the exception).
    """
    start_map = Point(frame.to_map(start_point_source.x, start_point_source.y))

    existing_buildings_map = unary_union([f.geom for f in fields.features if f.is_building()]) or None
    road_geoms = [f.geom for f in fields.features
                 if not f.area and f.tags.get("highway") in COMPATIBLE_HIGHWAY_CLASSES]
    existing_roads_map = unary_union(road_geoms) if road_geoms else None
    if existing_roads_map is None or existing_roads_map.is_empty:
        raise CausewayError("no road network found in range -- nothing to connect to")

    dist_to_road = start_map.distance(existing_roads_map)
    if dist_to_road > MAX_ROAD_DISTANCE_FOR_ROUTING_M:
        raise CausewayError(
            f"nearest road is {dist_to_road:.0f}m away, over this tool's "
            f"{MAX_ROAD_DISTANCE_FOR_ROUTING_M:.0f}m routing-attempt cap")

    sea_feats = fields.sea_features()
    sea_map = sea_feats[0].geom if sea_feats and not sea_feats[0].geom.is_empty else None

    half_window = max(routing_window_min_m, 2.5 * dist_to_road) + routing_window_margin_m
    window_bounds = (start_map.x - half_window, start_map.y - half_window,
                     start_map.x + half_window, start_map.y + half_window)

    grid = router_module.build_routing_grid(
        fields.elevation, frame.extent_m, frame.origin, window_bounds,
        existing_buildings_map, existing_roads_map, cell_m=routing_cell_m, sea_map=sea_map)
    result = router_module.route(grid, (start_map.x, start_map.y), highway_class=highway_class)
    if not result.ok:
        raise CausewayError(f"routing failed: {result.reason}")

    simplified = router_module.simplify_path([(start_map.x, start_map.y)] + result.path_map, tolerance_m=3.0)
    route_map = LineString(simplified)
    route_source = LineString([frame.to_source(x, y) for x, y in route_map.coords])

    crosses_water = sea_map is not None and route_map.intersects(sea_map)
    return CausewayResult(route=route_source, crosses_water=crosses_water, length_m=route_source.length)
