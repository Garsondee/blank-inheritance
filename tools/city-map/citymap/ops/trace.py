# -*- coding: utf-8 -*-
"""The `trace` op: splice a literal, user-specified polyline into the road
graph as a new road Feature.

Unlike `construct`'s access-road routing (which pathfinds TOWARD the
nearest existing road from one fixed start point, over a real A* cost
surface), a trace's points ARE the desired path already -- e.g. the map
editor's road tool, where a person drew the route by eye against the real
rendered base map, which already shows every building/river/road. There is
nothing left to route around that they couldn't already see. No A* here on
purpose: reusing router.route() would mean pathfinding FROM one arbitrary
point TOWARD a goal built around another arbitrary point, a different
problem than what that router was built to answer (access-to-nearest-road),
and not worth the same expensive-search risk this project already hit once
(see editor/siting.py's MAX_ROAD_DISTANCE_FOR_ROUTING_M) for a case that
is, by construction, already a real intended path -- not a search problem.

Both endpoints snap to the nearest real road-graph node within
SNAP_DISTANCE_M, mirroring construct.py's own access-road snap, so a trace
drawn to meet an existing road becomes a genuine connected graph edge
(needed for demolish's cascade-pruning to treat it correctly), not just a
line that happens to touch one.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from shapely.geometry import LineString

from .. import ids as ids_module
from ..parse import Feature
from ..world import World

STAGE_CODE_VERSION = 1

SNAP_DISTANCE_M = 25.0  # close enough to an existing road-graph node to
                        # treat this trace's endpoint as landing ON it


def _synthetic_id(kind: str, op_id: str, role: str, index: int = 0) -> int:
    """Negative, deterministic, disjoint from every real (always positive)
    OSM id -- the same convention as ops/construct.py's own helper of the
    same name (duplicated rather than imported: op modules deliberately own
    their own id generation end to end, see ops/log.py's module docstring
    on why each op kind's shape -- ids included -- lives with its module)."""
    digest = hashlib.sha256(f"{kind}:{op_id}:{role}:{index}".encode()).hexdigest()
    return -int(digest[:12], 16)


@dataclass
class TraceReport:
    way_id: int
    length_m: float
    point_count: int
    snapped_start_node: Optional[int] = None
    snapped_end_node: Optional[int] = None
    crosses_building_ids: List[str] = field(default_factory=list)
    crosses_water: bool = False


def _nearest_road_node(graph, map_point: Tuple[float, float], frame,
                       max_dist: float) -> Tuple[Optional[int], float]:
    best_node, best_dist = None, math.inf
    for node_id, (sx, sy) in graph.node_xy.items():
        mx, my = frame.to_map(sx, sy)
        d = math.hypot(mx - map_point[0], my - map_point[1])
        if d < best_dist:
            best_dist, best_node = d, node_id
    if best_node is not None and best_dist <= max_dist:
        return best_node, best_dist
    return None, math.inf


def apply_trace(world: World, op, frame) -> Tuple[World, TraceReport]:
    """payload: {"points": [{"lon":,"lat":}, ...] (>=2), "highwayClass": "..."}
    highwayClass is optional, defaults to "unclassified" -- OSM's own tag
    for "a real road, not otherwise classified", which is exactly the
    amount known about a hand-drawn trace."""
    points = op.payload["points"]
    if len(points) < 2:
        raise ValueError(f"trace op {op.id!r} needs at least 2 points, got {len(points)}")
    highway_class = op.payload.get("highwayClass", "unclassified")

    src_coords = [frame.fwd.transform(p["lon"], p["lat"]) for p in points]
    map_coords = [frame.to_map(x, y) for x, y in src_coords]
    line_source = LineString(src_coords)

    way_id = _synthetic_id("way", op.id, "trace")
    new_graph = world.road_graph.copy()

    start_node, _ = _nearest_road_node(new_graph, map_coords[0], frame, SNAP_DISTANCE_M)
    end_node, _ = _nearest_road_node(new_graph, map_coords[-1], frame, SNAP_DISTANCE_M)

    node_ids = []
    for i, (sx, sy) in enumerate(src_coords):
        if i == 0 and start_node is not None:
            node_ids.append(start_node)
            continue
        if i == len(src_coords) - 1 and end_node is not None:
            node_ids.append(end_node)
            continue
        nid = _synthetic_id("node", op.id, "trace", i)
        new_graph.node_xy[nid] = (sx, sy)
        node_ids.append(nid)
    new_graph.way_nodes[way_id] = node_ids
    new_graph.way_class[way_id] = highway_class
    for nid in node_ids:
        # node_ways is a plain dict after RoadGraph.copy() (never a
        # defaultdict, see parse.py) -- a brand-new synthetic node id must
        # be seeded explicitly or this KeyErrors.
        new_graph.node_ways.setdefault(nid, set()).add(way_id)

    feature = Feature(
        id=ids_module.op_feature_id(op.id, "trace", 0), geom=line_source,
        tags={"highway": highway_class}, area=False,
        source=f"op:{op.id}", osm_way_id=way_id,
    )

    crosses_building_ids = [f.id for f in world.features
                           if f.tags.get("building") and f.geom.intersects(line_source)]
    crosses_water = bool(world.sea.sea_geom is not None and world.sea.sea_geom.intersects(line_source))

    new_world = World(
        features=world.features + [feature], road_graph=new_graph, rail_graph=world.rail_graph,
        lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg, terrain_edits=world.terrain_edits,
    )
    report = TraceReport(
        way_id=way_id, length_m=line_source.length, point_count=len(points),
        snapped_start_node=start_node, snapped_end_node=end_node,
        crosses_building_ids=crosses_building_ids, crosses_water=crosses_water,
    )
    return new_world, report
