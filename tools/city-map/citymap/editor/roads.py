# -*- coding: utf-8 -*-
"""Join hand-drawn road segments from the map editor into logical paths.

The editor's road tool caps a single drawn line at 2 points (Leaflet.Draw's
`maxPoints`), so someone routing a real winding path -- following a
hillside, say -- has to draw it dot-to-dot as several short 2-point
segments instead of one continuous line. This reassembles those into the
one intended path, by unioning segments end-to-end wherever one segment's
endpoint lands within `tolerance_m` of another's. A segment whose endpoints
don't meet any other segment's within tolerance comes back as its own
single-segment chain, unchanged -- this is also what makes it safe to run
unconditionally over EVERY road submission, not just ones known in advance
to contain a chain.
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple

DEFAULT_TOLERANCE_M = 15.0  # generous for click imprecision (a real drawn
                            # chain measured ~1-2m gaps at shared points),
                            # nowhere near two genuinely separate roads'
                            # typical spacing (hundreds of metres)


def _find(parent: List[int], x: int) -> int:
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


def _union(parent: List[int], a: int, b: int) -> None:
    ra, rb = _find(parent, a), _find(parent, b)
    if ra != rb:
        parent[ra] = rb


def join_road_chains(roads: List[dict], frame, tolerance_m: float = DEFAULT_TOLERANCE_M) -> List[List[dict]]:
    """`roads`: [{"id":..., "points": [{"lon":,"lat":}, ...]}, ...], each
    with >=2 points. Returns a list of chains, each an ordered list of
    {"lon","lat"} points -- one entry per input road that didn't chain to
    anything, one merged entry per group of segments that did."""
    if not roads:
        return []

    n = len(roads)
    endpoints_map: List[Tuple[float, float]] = []
    for r in roads:
        pts = r["points"]
        endpoints_map.append(frame.lonlat_to_map(pts[0]["lon"], pts[0]["lat"]))
        endpoints_map.append(frame.lonlat_to_map(pts[-1]["lon"], pts[-1]["lat"]))

    m = len(endpoints_map)
    parent = list(range(m))
    for i in range(m):
        xi, yi = endpoints_map[i]
        for j in range(i + 1, m):
            xj, yj = endpoints_map[j]
            if math.hypot(xi - xj, yi - yj) <= tolerance_m:
                _union(parent, i, j)
    clusters = [_find(parent, i) for i in range(m)]

    start_cluster = [clusters[2 * i] for i in range(n)]
    end_cluster = [clusters[2 * i + 1] for i in range(n)]

    degree: Dict[int, int] = {}
    for i in range(n):
        degree[start_cluster[i]] = degree.get(start_cluster[i], 0) + 1
        degree[end_cluster[i]] = degree.get(end_cluster[i], 0) + 1

    # cluster -> [(road_index, "start"|"end")] -- which segments touch it,
    # and from which of their own ends
    adjacency: Dict[int, List[Tuple[int, str]]] = {}
    for i in range(n):
        adjacency.setdefault(start_cluster[i], []).append((i, "start"))
        adjacency.setdefault(end_cluster[i], []).append((i, "end"))

    def other_cluster(road_idx: int, from_end: str) -> int:
        return end_cluster[road_idx] if from_end == "start" else start_cluster[road_idx]

    def points_forward(road_idx: int, from_end: str) -> List[dict]:
        pts = roads[road_idx]["points"]
        return list(pts) if from_end == "start" else list(reversed(pts))

    visited = [False] * n
    chains: List[List[dict]] = []

    # Walk every chain starting from a TERMINAL or JUNCTION cluster (degree
    # != 2) -- a degree-2 cluster is a pure pass-through point in the
    # middle of a chain, never where a walk should start.
    for cluster, incident in adjacency.items():
        if degree[cluster] == 2:
            continue
        for road_idx, end_name in incident:
            if visited[road_idx]:
                continue
            chain_points = points_forward(road_idx, end_name)
            visited[road_idx] = True
            current_cluster = other_cluster(road_idx, end_name)
            while degree.get(current_cluster) == 2:
                candidates = [(ri, en) for ri, en in adjacency[current_cluster] if not visited[ri]]
                if len(candidates) != 1:
                    break  # a junction that only LOOKS like degree 2 because
                          # one of its roads was already claimed -- stop here
                next_idx, next_end = candidates[0]
                next_points = points_forward(next_idx, next_end)
                chain_points = chain_points + next_points[1:]  # drop the shared duplicate point
                visited[next_idx] = True
                current_cluster = other_cluster(next_idx, next_end)
            chains.append(chain_points)

    # Anything left over is part of a pure closed loop (every cluster on it
    # has degree 2, so the terminal-driven walk above never had a start
    # point to begin from) -- fall back to each remaining segment as its
    # own chain rather than looping forever looking for a start that
    # doesn't exist.
    for i in range(n):
        if not visited[i]:
            chains.append(list(roads[i]["points"]))
            visited[i] = True

    return chains
