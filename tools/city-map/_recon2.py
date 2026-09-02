# -*- coding: utf-8 -*-
"""Precise Kobe Airport footprint + bridge identification, straight from
geometry and the road graph rather than eyeballing tag dumps."""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "citymap"))
sys.path.insert(0, os.path.dirname(__file__))

from shapely.geometry import Point
from shapely.ops import unary_union

from citymap import acquire, cache, world as world_mod
from citymap.frame import Frame

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
frame = Frame.from_file(os.path.join(REPO_ROOT, "data", "map", "frames", "kurose-12km.json"))

south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=world_mod.FETCH_PAD_M)
query = acquire.build_overpass_query(south, west, north, east)
world_key = world_mod.world_key_parts(query, frame.crs_epsg)
w = world_mod.load_world(cache.Artifact(cache.artifact_root(REPO_ROOT, "world"), world_key))

airport_lon, airport_lat = 135.2238, 34.6328
ax, ay = frame.fwd.transform(airport_lon, airport_lat)
airport_pt = Point(ax, ay)

# Pure aeroway=* geometry only -- no name/tag guessing -- AND near the known
# airport point, since the 12km frame likely has unrelated aeroway=helipad
# tags scattered on rooftops elsewhere in Kobe.
aero = [f for f in w.features if f.tags.get("aeroway") and f.geom.distance(airport_pt) < 3000]
print(f"{len(aero)} aeroway=* features within 3000m of the known airport point")
aero_union = unary_union([f.geom.buffer(20.0) if not f.area else f.geom for f in aero]).buffer(150.0)
minx, miny, maxx, maxy = aero_union.bounds
print(f"aeroway envelope (+150m buffer): x[{minx:.0f},{maxx:.0f}] y[{miny:.0f},{maxy:.0f}]  "
     f"{maxx-minx:.0f}m x {maxy-miny:.0f}m")
cx_, cy_ = (minx + maxx) / 2, (miny + maxy) / 2
clon, clat = frame.inv.transform(cx_, cy_)
print(f"envelope centroid lon/lat: {clon:.6f}, {clat:.6f}")

# Buildings whose centroid falls in the aeroway envelope -- terminal, cargo
# terminal, station -- these should demolish with the island too.
island_buildings = [f for f in w.features if f.is_building() and aero_union.contains(f.geom.centroid)]
print(f"{len(island_buildings)} buildings centred inside the envelope")

full_island = unary_union([aero_union] + [f.geom for f in island_buildings])
minx, miny, maxx, maxy = full_island.bounds
print(f"full island envelope: x[{minx:.0f},{maxx:.0f}] y[{miny:.0f},{maxy:.0f}] "
     f"{maxx-minx:.0f}m x {maxy-miny:.0f}m")

# --- graph edges that straddle the envelope boundary = the bridge(s) -----
graph = w.road_graph
inside = {nid: full_island.contains(Point(xy)) for nid, xy in graph.node_xy.items()}
straddling = set()
for way_id, nodes in graph.way_nodes.items():
    flags = {inside.get(n, False) for n in nodes}
    if len(flags) > 1:  # both True and False present among this way's nodes
        straddling.add(way_id)
print(f"\n{len(straddling)} ways straddle the island envelope boundary (candidate bridges):")
for way_id in sorted(straddling):
    nodes = graph.way_nodes[way_id]
    n_in = sum(1 for n in nodes if inside.get(n, False))
    print(f"  way={way_id} class={graph.way_class.get(way_id)} nodes={len(nodes)} "
         f"({n_in} inside envelope)")

inside_node_ids = {n for n, v in inside.items() if v}
outside_node_ids = {n for n, v in inside.items() if not v}
print(f"\ngraph nodes: {len(inside_node_ids)} inside envelope, {len(outside_node_ids)} outside")

# Confirm: with ALL straddling ways' outside portions removed conceptually,
# is the island's road subgraph reached by exactly these ways?
touching_inside_ways = {w_id for w_id, nodes in graph.way_nodes.items()
                        if any(inside.get(n, False) for n in nodes)}
print(f"{len(touching_inside_ways)} ways touch at least one inside node "
     f"(these + the demolish polygon's own geometric clip are everything "
     f"apply_demolish needs to consider)")
