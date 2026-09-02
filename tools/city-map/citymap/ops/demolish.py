"""The `demolish` op: remove real content cleanly, never leaving a road
heading into empty space.

design/map-generation.md §6's `crater` already specifies the shape of this
problem -- "cut road edges, detect severed ends, then re-run connectivity...
Barricade the severed ends" -- `demolish` is that same mechanism for removing
mapped content outright (no rubble, no terrain edit) rather than a weapon
event, which is what Kobe Airport's removal actually is: administrative, not
a blast crater.

**The pruning rule.** After removing/clipping every feature the demolish area
touches, some road may now dead-end at the edge of the void -- exactly the
"heading into empty space" failure this exists to prevent. The fix is
iterative leaf-pruning on the REAL road graph (parse.RoadGraph, built from
OSM's own shared node ids, not geometric snapping): any node that is now
degree-1 but was NOT a degree-1 node before this op (a real, pre-existing
cul-de-sac elsewhere in the city) has its one remaining way removed, which may
turn its other end into a new degree-1 node in turn -- repeat until nothing
new appears. This is what correctly eats an entire access bridge back to the
mainland junction it branches from, because the bridge's only reason to exist
was reaching what is now gone, while leaving a through-road that merely
crossed the demolished area's edge capped there, still connected to
everywhere else it always went.

Run once against `world.road_graph` and once, independently, against
`world.rail_graph` -- railways get their own graph (parse.py) precisely
because a way's node-id topology says nothing about whether it is a road or
a track, and the two networks must never prune each other's dead ends: a
station spur ending exactly where a road also happens to end is a
coincidence, not a shared junction. See `_prune_graph_cascade` for the
shared cascade logic and the real bug this generalisation fixes -- a
railway bridge to Kobe Airport survived the airport's removal as a
kilometre-long dangling clipped stub, because railways previously had no
graph at all to prune against.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import List, Optional, Tuple

from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

from .. import ids as ids_module
from ..parse import Feature, RoadGraph
from ..world import World

STAGE_CODE_VERSION = 1


def demolish_area_source_crs(payload: dict, frame) -> Polygon:
    """The op's target area, converted from lon/lat to the frame's source CRS
    -- everything in World lives in source CRS (see world.py)."""
    if "polygon" in payload["area"]:
        pts = [frame.fwd.transform(p["lon"], p["lat"]) for p in payload["area"]["polygon"]]
        return Polygon(pts)
    center = payload["area"]["center"]
    radius_m = payload["area"]["radiusM"]
    cx, cy = frame.fwd.transform(center["lon"], center["lat"])
    return Point(cx, cy).buffer(radius_m)


@dataclass
class DemolishReport:
    removed_feature_count: int
    clipped_feature_count: int
    pruned_way_count: int
    pruned_way_ids: List[int]
    removed_lamp_count: int
    left_landuse_feature_id: Optional[str] = None
    returned_to_sea: bool = False
    sea_area_after_km2: Optional[float] = None


def _prune_graph_cascade(graph: RoadGraph, original_dead_ends: set) -> List[int]:
    """Iteratively remove any node that's newly degree-1 -- i.e. not already
    a dead end before this op -- by dropping its one remaining way, which may
    turn its other end into a new degree-1 node in turn; repeat until nothing
    new appears. Mutates `graph` in place. Shared by the road and rail
    cascades in `apply_demolish`, which each call this against their own
    graph and their own `original_dead_ends` snapshot -- see module
    docstring for why the two networks must be pruned independently."""
    pruned_way_ids: List[int] = []
    changed = True
    while changed:
        changed = False
        for node_id in list(graph.dead_ends()):
            if node_id in original_dead_ends:
                continue  # a real, pre-existing cul-de-sac -- leave it alone
            ways = graph.node_ways.get(node_id)
            if not ways or len(ways) != 1:
                continue
            way_id = next(iter(ways))
            graph.remove_way(way_id)
            pruned_way_ids.append(way_id)
            changed = True
    return pruned_way_ids


def _apply_demolish_by_ids(world: World, op) -> Tuple[World, DemolishReport]:
    """Remove EXACTLY the given features by id -- the precise alternative to
    an `area` polygon, for the map editor's 'flag a building for removal'
    flow (tools/city-map/editor/): the user clicks a real feature, so its id
    is already known, and reverse-engineering a containment polygon from
    that click would risk catching an unintended neighbour for no reason.
    An id lookup cannot do that.

    Still runs the SAME graph-cascade pruning afterward as the area-based
    path (see module docstring), so a removed building's own driveway or
    access road gets eaten back to a real junction exactly as it would if
    the removal had been expressed as a small area instead. No
    returnToSea/leaveLanduse equivalent here -- there is no polygon for
    cleared ground to become, only specific features that are now gone.
    """
    ids_to_remove = set(op.payload["featureIds"])
    original_road_dead_ends = set(world.road_graph.dead_ends())
    original_rail_dead_ends = set(world.rail_graph.dead_ends())

    removed_way_ids = set()
    kept: List[Feature] = []
    removed_count = 0
    for f in world.features:
        if f.id in ids_to_remove:
            if f.osm_way_id is not None:
                removed_way_ids.add(f.osm_way_id)
            removed_count += 1
            continue
        kept.append(f)

    new_road_graph = world.road_graph.copy()
    new_rail_graph = world.rail_graph.copy()
    for way_id in removed_way_ids:
        if way_id in new_road_graph.way_nodes:
            new_road_graph.remove_way(way_id)
        if way_id in new_rail_graph.way_nodes:
            new_rail_graph.remove_way(way_id)

    road_pruned = _prune_graph_cascade(new_road_graph, original_road_dead_ends)
    rail_pruned = _prune_graph_cascade(new_rail_graph, original_rail_dead_ends)
    pruned_way_ids = sorted(set(road_pruned) | set(rail_pruned))
    pruned_set = set(pruned_way_ids)

    final_features = [
        f for f in kept
        if not (f.osm_way_id is not None and f.osm_way_id in pruned_set)
    ]

    new_world = World(features=final_features, road_graph=new_road_graph,
                      rail_graph=new_rail_graph, lamps=world.lamps, sea=world.sea,
                      crs_epsg=world.crs_epsg, terrain_edits=world.terrain_edits)
    report = DemolishReport(
        removed_feature_count=removed_count,
        clipped_feature_count=0,
        pruned_way_count=len(pruned_way_ids),
        pruned_way_ids=pruned_way_ids,
        removed_lamp_count=0,
    )
    return new_world, report


def apply_demolish(world: World, op, frame) -> Tuple[World, DemolishReport]:
    if "featureIds" in op.payload:
        return _apply_demolish_by_ids(world, op)

    area = demolish_area_source_crs(op.payload, frame)
    original_road_dead_ends = set(world.road_graph.dead_ends())
    original_rail_dead_ends = set(world.rail_graph.dead_ends())

    kept: List[Feature] = []
    removed_way_ids = set()
    removed_count = clipped_count = 0

    for f in world.features:
        if f.tags.get("__sea__"):
            kept.append(f)
            continue
        if not f.geom.intersects(area):
            kept.append(f)
            continue

        if f.area:
            # Areas (buildings, aprons, landuse) are all-or-nothing: a
            # building half inside a demolished zone is not a real object
            # once you draw it half-gone, so the call is by centroid.
            if area.contains(f.geom.centroid):
                if f.osm_way_id is not None:
                    removed_way_ids.add(f.osm_way_id)
                removed_count += 1
                continue
            kept.append(f)
            continue

        # Linear features (roads, aeroway centrelines, waterways): clip to
        # what remains outside the area. Whether the clipped remainder
        # SURVIVES is decided by the graph pruning pass below, not here --
        # a road that is merely clipped where it crosses the boundary but
        # still leads somewhere real must stay; one that only existed to
        # reach the demolished feature must not, and that is a network
        # question, not a per-feature one.
        remainder = f.geom.difference(area)
        if remainder.is_empty:
            if f.osm_way_id is not None:
                removed_way_ids.add(f.osm_way_id)
            removed_count += 1
            continue
        kept.append(replace(f, geom=remainder))
        clipped_count += 1

    new_road_graph = world.road_graph.copy()
    new_rail_graph = world.rail_graph.copy()
    for way_id in removed_way_ids:
        if way_id in new_road_graph.way_nodes:
            new_road_graph.remove_way(way_id)
        if way_id in new_rail_graph.way_nodes:
            new_rail_graph.remove_way(way_id)

    road_pruned = _prune_graph_cascade(new_road_graph, original_road_dead_ends)
    rail_pruned = _prune_graph_cascade(new_rail_graph, original_rail_dead_ends)
    # A way tagged both highway and railway (a tram line) can legitimately
    # appear in both lists -- dedupe so the report counts it once.
    pruned_way_ids = sorted(set(road_pruned) | set(rail_pruned))

    pruned_set = set(pruned_way_ids)
    final_features = [
        f for f in kept
        if not (f.osm_way_id is not None and f.osm_way_id in pruned_set)
    ]

    # What becomes of the cleared ground -- mutually exclusive, since a patch
    # of ground cannot be both new sea and a tagged landuse at once:
    #
    # `returnToSea`: the true "let the ocean reclaim it" case (e.g. Kobe
    # Airport) -- the demolish area is unioned INTO world.sea, so it renders
    # as open water with a fresh coastline, and (being sea) is permanently
    # exempt from ever being classified as land content again.
    #
    # `leaveLanduse`: for a demolish that clears content but the ground stays
    # dry land -- without one of these two, a demolish that removes EVERY
    # feature covering some ground (as opposed to clipping a road through
    # open countryside) leaves nothing for render.py's landuse-tint pass to
    # draw, because that tint only ever comes from a landuse/natural/leisure
    # -tagged polygon, and a paved surface like an airport apron was never
    # tagged that way to begin with -- discovered rendering Kobe Airport's
    # removal as a stark white void before this field existed.
    left_landuse_id = None
    returned_to_sea = False
    new_sea = world.sea
    return_to_sea = op.payload.get("returnToSea")
    leave_landuse = op.payload.get("leaveLanduse")
    if return_to_sea:
        merged = unary_union([g for g in (world.sea.sea_geom, area) if g is not None])
        new_sea = replace(world.sea, sea_geom=merged, area_after_carve_km2=merged.area / 1e6)
        returned_to_sea = True
    elif leave_landuse:
        left_landuse_id = ids_module.op_feature_id(op.id, "cleared-land", 0)
        final_features.append(Feature(
            id=left_landuse_id, geom=area, tags={"landuse": leave_landuse},
            area=True, source=f"op:{op.id}",
        ))

    removed_lamps = 0
    kept_lamps = []
    for p in world.lamps:
        if area.contains(Point(p[0], p[1])):
            removed_lamps += 1
        else:
            kept_lamps.append(p)

    new_world = World(features=final_features, road_graph=new_road_graph,
                      rail_graph=new_rail_graph, lamps=kept_lamps, sea=new_sea,
                      crs_epsg=world.crs_epsg, terrain_edits=world.terrain_edits)
    report = DemolishReport(
        removed_feature_count=removed_count,
        clipped_feature_count=clipped_count,
        pruned_way_count=len(pruned_way_ids),
        pruned_way_ids=pruned_way_ids,
        removed_lamp_count=removed_lamps,
        left_landuse_feature_id=left_landuse_id,
        returned_to_sea=returned_to_sea,
        sea_area_after_km2=new_sea.area_after_carve_km2 if returned_to_sea else None,
    )
    return new_world, report
