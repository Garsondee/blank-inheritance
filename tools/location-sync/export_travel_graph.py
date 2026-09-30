# -*- coding: utf-8 -*-
"""Exports the CURRENT road+rail network as one generic travel graph, in the
campaign map's own IMAGE PIXEL space -- ready for
module/blank-inheritance/scripts/core/travel-route.mjs to consume directly,
with no coordinate conversion needed at runtime.

    python tools/gazetteer/export_travel_graph.py

Reuses tools/city-map/render.py's own world-resolution path (resolve_world +
replay_cache.resolve_replayed_world) rather than a second copy, so this
always reflects exactly the same city those renders do -- and benefits from
the same on-disk cache, so a re-run after an unrelated render is fast.

Road and rail are merged into ONE graph deliberately: mode restriction (a
train may only ride rail, a car only roads) is explicitly a later layer, not
this one -- see ideas/entries/road-network-routing.json. Merging is safe
because node/way ids are real OSM ids, globally unique, so a road node and a
rail node can never collide.

Clipped to the map's content area (the 12000x12000 square inside the painted
border): the source import covers a much larger region than the campaign map
actually shows (measured 2026-09-18: 178,950 source nodes for a map that
displays a 12km square), and nothing outside the visible map is a place a
token could ever need to travel through. A way is dropped entirely only when
NONE of its nodes survive clipping; a way that dips outside the map and back
keeps its original node sequence untouched rather than being re-stitched
across the gap -- travel-route.mjs's buildAdjacency already skips any edge
touching a node with no surviving position, which is the honest answer
("we have no data for what happens off-map"), not a fabricated shortcut.
"""

from __future__ import annotations

import json
import os
import sys

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_CITY_MAP = os.path.join(_REPO_ROOT, "tools", "city-map")
if _CITY_MAP not in sys.path:
    sys.path.insert(0, _CITY_MAP)

import render as citymap_render  # tools/city-map/render.py
from citymap.frame import Frame
from citymap.ops import replay_cache
from citymap.ops.log import load_ops
from citymap.store import gpkg as store_gpkg
from citymap.style import Style
from shapely.geometry import Polygon

from core.georef import MapGeoref

DEFAULT_OPS = os.path.join(_REPO_ROOT, "data", "map", "operations", "kurose.json")
DEFAULT_OUTPUT = os.path.join(_REPO_ROOT, "data", "map", "travel-graph.json")
DEFAULT_STORE = os.path.join(_REPO_ROOT, "data", "map", "kurose.gpkg")

# cm precision in SOURCE metres -- kills float noise when snapping two ways'
# coordinates together as the same real junction, without ever merging two
# genuinely distinct real-world points (they'd differ by metres, not cm).
GAP_SNAP_ROUND = 2


def resolve_current_world(ops_path=DEFAULT_OPS, on_note=print):
    """The base imported World with the real ops log replayed on top --
    i.e. the city exactly as it stands today, demolitions and constructions
    included. Mirrors render.py's own main() sequence."""
    frame = Frame.from_file(citymap_render.DEFAULT_FRAME)
    style = Style.from_file(citymap_render.DEFAULT_STYLE)
    world, world_key_parts = citymap_render.resolve_world(frame, on_note=on_note)

    ops = load_ops(ops_path) if ops_path and os.path.exists(ops_path) else []
    if not ops:
        return world

    world, _results = replay_cache.resolve_replayed_world(
        world, ops, frame, style, citymap_render.DEM_CACHE_DIR,
        citymap_render.DEFAULT_TEMPLATES_DIR, _REPO_ROOT, world_key_parts,
        on_note=on_note)
    return world


def merge_road_and_rail(world):
    """`{nodeXy, wayNodes, wayClass, railWayIds}`, both graphs combined,
    still in SOURCE metres.

    `wayClass` carries each way's own raw OSM tag value (`highway=residential`,
    `railway=rail`, etc — citymap/parse.py's RoadGraph.way_class, already
    computed and cached, just never exported past this point until
    2026-09-23) so a mode/animation layer can key off what a way actually
    IS rather than guessing from distance alone.

    `railWayIds` records which way ids came from `world.rail_graph`
    specifically, BEFORE the two graphs' way_class dicts are merged — a way
    tagged with both `highway` and `railway` lands in both source graphs
    (citymap/parse.py's own documented behaviour), and rail must win that
    merge: riding a level crossing is still riding the rail line across it,
    not the road it happens to share a tag with.
    """
    node_xy = dict(world.road_graph.node_xy)
    node_xy.update(world.rail_graph.node_xy)
    way_nodes = dict(world.road_graph.way_nodes)
    way_nodes.update(world.rail_graph.way_nodes)
    way_class = dict(world.road_graph.way_class)
    way_class.update(world.rail_graph.way_class)
    rail_way_ids = set(world.rail_graph.way_class.keys()) | set(world.rail_graph.way_nodes.keys())
    return node_xy, way_nodes, way_class, rail_way_ids


def airport_exclusion_polygon(frame, ops_path=DEFAULT_OPS):
    """op-0001's own demolish polygon (Kobe Airport, `returnToSea`), buffered
    50m same as the op itself -- so a gap-filled way can never restore
    vehicle access to a place the campaign has deliberately put back
    underwater, however that way happens to be tagged. Found live 2026-09-23
    (Ingram, directly: "make sure you don't accidentally add the airport
    back in that I've removed from the map") — checked here as a real
    geometry test, not a keyword guess, because op-0001's own note records
    that the union already swept in some non-`aeroway` staff-housing footprint
    too; a tag-only filter would miss exactly that.
    """
    ops = json.load(open(ops_path, encoding="utf-8"))
    items = ops if isinstance(ops, list) else ops.get("operations", ops.get("ops", []))
    op = next((o for o in items if o.get("id") == "op-0001"), None)
    if op is None:
        return None
    ring = [frame.fwd.transform(p["lon"], p["lat"]) for p in op["area"]["polygon"]]
    return Polygon(ring).buffer(50.0)


def derive_gap_graph(store_path, existing_road_way_ids, existing_rail_way_ids, node_xy, exclusion_polygon):
    """Ways with real LineString geometry in the store's `feature` table that
    never made it into road_graph/rail_graph in the first place.

    citymap/parse.py's parse_elements only adds a way to those graphs when
    Overpass returned a `nodes` array of matching length; for some ways it
    didn't (see that module's own note on Kobe Airport's rail bridge for a
    precedent), and those ways survive only as generic Features -- drawn by
    the renderer, invisible to routing. Confirmed live 2026-09-23: 527
    highway/railway-tagged features sit in exactly the region this exact
    problem was found in (a real crossing that walked in a straight line
    despite the rendered map showing a dense street grid right there).

    ADDITIVE ONLY: any way whose real osm_way_id is already in
    `existing_road_way_ids`/`existing_rail_way_ids` is left alone --this
    never touches or duplicates a way the real OSM import already covers.
    `node_xy` is mutated in place, seeded by the caller with the EXISTING
    graph's own node coordinates first, so a new segment that touches the
    existing network at a real junction reuses that junction's real node id
    and actually connects to it, rather than becoming a disconnected island
    of its own -- exact-coordinate snapping is the only way to reconstruct
    connectivity here, since the store's geometry has no preserved per-vertex
    OSM node ids for these ways, but two ways that meet in reality do so at
    literally the same point, so this invents no geometry, only identity.
    """
    conn = store_gpkg.connect(store_path)
    try:
        features = list(store_gpkg.iter_all_features(conn))
    finally:
        conn.close()
    return derive_gap_graph_from_features(features, existing_road_way_ids, existing_rail_way_ids, node_xy, exclusion_polygon)


def derive_gap_graph_from_features(features, existing_road_way_ids, existing_rail_way_ids, node_xy, exclusion_polygon):
    """The pure half of derive_gap_graph -- everything above the gpkg
    connection itself, so this is testable with plain synthetic feature
    dicts (see test/gazetteer/test_export_travel_graph.py), never the real
    120MB store. `features` is any iterable of dicts shaped like
    citymap.store.gpkg.iter_all_features's own rows (`tags`, `osm_way_id`,
    `geom`, `id`); `node_xy` is mutated in place, same contract as
    derive_gap_graph.
    """
    coord_to_node = {}
    for node_id, xy in node_xy.items():
        coord_to_node[(round(xy[0], GAP_SNAP_ROUND), round(xy[1], GAP_SNAP_ROUND))] = node_id
    next_synth_id = [-1]

    def node_for(pt):
        key = (round(pt[0], GAP_SNAP_ROUND), round(pt[1], GAP_SNAP_ROUND))
        if key not in coord_to_node:
            coord_to_node[key] = next_synth_id[0]
            node_xy[next_synth_id[0]] = (pt[0], pt[1])
            next_synth_id[0] -= 1
        return coord_to_node[key]

    new_way_nodes, new_way_class, new_rail_way_ids = {}, {}, set()
    for kwargs in features:
        tags = kwargs.get("tags", {})
        if isinstance(tags, str):
            tags = json.loads(tags)
        osm_way_id = kwargs.get("osm_way_id")
        is_road = bool(tags.get("highway")) and osm_way_id not in existing_road_way_ids
        is_rail = bool(tags.get("railway")) and osm_way_id not in existing_rail_way_ids
        if not is_road and not is_rail or "aeroway" in tags:
            continue
        geom = kwargs["geom"]
        if geom.geom_type != "LineString":
            continue
        if exclusion_polygon is not None and geom.intersects(exclusion_polygon):
            continue
        coords = list(geom.coords)
        if len(coords) < 2:
            continue
        node_ids = [node_for(pt) for pt in coords]
        way_id = f"gap-{osm_way_id or kwargs['id']}"
        if is_road:
            new_way_nodes[way_id] = node_ids
            new_way_class[way_id] = tags["highway"]
        if is_rail:
            rail_id = f"{way_id}-rail" if is_road else way_id
            new_way_nodes[rail_id] = node_ids
            new_way_class[rail_id] = tags["railway"]
            new_rail_way_ids.add(rail_id)
    return new_way_nodes, new_way_class, new_rail_way_ids


def to_clipped_image_px(node_xy, way_nodes, way_class, rail_way_ids, georef):
    """Source metres -> campaign-map image px, keeping only nodes inside the
    content area, and only ways with at least one surviving node."""
    clipped_xy = {}
    for node_id, (sx, sy) in node_xy.items():
        px, py = georef.source_to_image_px(sx, sy)
        if georef.contains_image_px(px, py):
            clipped_xy[node_id] = (round(px, 2), round(py, 2))

    kept_ways = {
        way_id: nodes for way_id, nodes in way_nodes.items()
        if any(n in clipped_xy for n in nodes)
    }
    kept_class = {way_id: way_class[way_id] for way_id in kept_ways if way_id in way_class}
    kept_rail_ids = rail_way_ids & set(kept_ways.keys())
    return clipped_xy, kept_ways, kept_class, kept_rail_ids


def export_travel_graph(ops_path=DEFAULT_OPS, output_path=DEFAULT_OUTPUT, store_path=DEFAULT_STORE, on_note=print):
    world = resolve_current_world(ops_path, on_note=on_note)
    node_xy, way_nodes, way_class, rail_way_ids = merge_road_and_rail(world)
    on_note(f"merged road+rail: {len(node_xy)} nodes, {len(way_nodes)} ways (unclipped)")

    if store_path and os.path.exists(store_path):
        frame = Frame.from_file(citymap_render.DEFAULT_FRAME)
        exclusion = airport_exclusion_polygon(frame, ops_path)
        new_way_nodes, new_way_class, new_rail_way_ids = derive_gap_graph(
            store_path, set(world.road_graph.way_nodes.keys()), set(world.rail_graph.way_nodes.keys()),
            node_xy, exclusion)
        way_nodes.update(new_way_nodes)
        way_class.update(new_way_class)
        rail_way_ids |= new_rail_way_ids
        on_note(f"gap-filled from store: +{len(new_way_nodes)} ways not covered by the real OSM import's own graph")

    georef = MapGeoref.load()
    clipped_xy, kept_ways, kept_class, kept_rail_ids = to_clipped_image_px(
        node_xy, way_nodes, way_class, rail_way_ids, georef)
    on_note(f"clipped to map content area: {len(clipped_xy)} nodes, {len(kept_ways)} ways")

    payload = {
        "$schema": "../schema/travel-graph.schema.json",
        "nodeXy": {str(k): list(v) for k, v in clipped_xy.items()},
        "wayNodes": {str(k): v for k, v in kept_ways.items()},
        "wayClass": {str(k): v for k, v in kept_class.items()},
        "railWayIds": sorted(str(k) for k in kept_rail_ids),
    }
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)
    size_mb = os.path.getsize(output_path) / 1e6
    on_note(f"wrote {output_path} ({size_mb:.2f} MB)")
    return payload


if __name__ == "__main__":
    export_travel_graph()
