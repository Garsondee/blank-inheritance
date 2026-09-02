"""River width grading: taper at sources, widen as tributaries combine.

Added 2026-08-24 from a direct user request, on top of the same-day fix that
moved rivers to draw ABOVE contours (see render.py's module docstring). The
model is Shreve stream magnitude, the simplest well-defined hydrological
measure that is exactly "how many source branches have merged by this
point": a headwater edge has magnitude 1; at a confluence, the downstream
edge's magnitude is the SUM of every incoming edge's magnitude -- not max,
and not +1 the way Strahler order works. Sum is what actually reads as "gets
wider as they combine" when two decent-sized tributaries meet, rather than
only growing at joins between branches of equal size.

Confluences are found by exact endpoint-coordinate match, not a real
node-id graph (contrast parse.RoadGraph, built from OSM's own shared node
ids). That is safe here specifically because every waterway Feature's
geometry in a given render pass is produced by the same deterministic chain
of transforms (parse's CRS projection, then a single frame-wide rotation) --
two ways that share an OSM node get bit-identical endpoint coordinates, not
merely close ones, so this is exact matching, not tolerance-based snapping.
It is deliberately NOT plumbed through parse.py/World as a fourth cascade-
pruned graph alongside road_graph/rail_graph: this is a rendering-only
concern (how thick to stroke a line), unlike demolish's graph pruning, which
changes what a replay actually keeps. If a future op ever needs to prune
severed rivers the way demolish already does for roads and railways, that
is a separate, larger change.

Directionality comes for free from the OSM waterway mapping convention: a
waterway way is digitised in the direction of flow, so its first coordinate
is upstream and its last is downstream. This is a real mapping convention
(unlike highway/railway ways, whose direction is arbitrary and roadgraph
never relies on), so no direction inference is attempted here -- a waterway
tagged backwards in the source data renders with reversed tapering, same as
any other OSM data-quality issue this project treats as ground truth rather
than second-guessing.
"""

from __future__ import annotations

import math
from collections import defaultdict, deque
from typing import Dict, List, Tuple

from .parse import Feature

STAGE_CODE_VERSION = 1

WATERWAY_CLASSES = {"river", "stream", "canal"}

# Shreve magnitude at which stroke width saturates to max -- past this many
# merged source branches, treat the channel as "as wide as this map ever
# draws a river." A tuned default on the function, not style-tunable config:
# it is a property of the topology model, not a visual choice, matching how
# contour.py keeps its own interval/major_interval defaults in code.
DEFAULT_SATURATION_MAGNITUDE = 6.0

# Ground metres over which a true headwater tapers from a point up to its
# normal stream width. Same "property of the topology model, not a visual
# choice" reasoning as DEFAULT_SATURATION_MAGNITUDE above -- clamped to the
# source feature's own length in vertex_widths_m, so a short headwater way
# doesn't overshoot into whatever comes after it.
DEFAULT_SOURCE_TAPER_M = 80.0


def _waterway_features(features: List[Feature]) -> List[Feature]:
    return [
        f for f in features
        if not f.area and f.tags.get("waterway") in WATERWAY_CLASSES
        and f.geom is not None and not f.geom.is_empty
        and f.geom.geom_type == "LineString"
    ]


def _endpoints(feature: Feature) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    coords = list(feature.geom.coords)
    return coords[0], coords[-1]


def compute_stream_magnitudes(features: List[Feature]) -> Dict[str, float]:
    """{feature.id: Shreve magnitude} for every river/stream/canal LineString
    in `features`. A feature not present in the result never occurs -- every
    waterway gets an entry, defaulting to 1.0 if its topology could not be
    resolved (see the cycle note below).
    """
    waterways = _waterway_features(features)

    incoming_at: Dict[Tuple[float, float], List[Feature]] = defaultdict(list)
    outgoing_at: Dict[Tuple[float, float], List[Feature]] = defaultdict(list)
    for f in waterways:
        start, end = _endpoints(f)
        outgoing_at[start].append(f)
        incoming_at[end].append(f)

    # Kahn's-algorithm-style topological sweep upstream -> downstream: a way
    # becomes resolvable once every way feeding its start node is resolved.
    remaining_needed = {f.id: len(incoming_at[_endpoints(f)[0]]) for f in waterways}
    incoming_sum: Dict[str, float] = defaultdict(float)
    magnitude: Dict[str, float] = {}

    queue = deque(f for f in waterways if remaining_needed[f.id] == 0)
    resolved = set()
    while queue:
        f = queue.popleft()
        if f.id in resolved:
            continue
        resolved.add(f.id)
        magnitude[f.id] = incoming_sum[f.id] if incoming_sum[f.id] > 0 else 1.0
        _, end = _endpoints(f)
        for nxt in outgoing_at[end]:
            incoming_sum[nxt.id] += magnitude[f.id]
            remaining_needed[nxt.id] -= 1
            if remaining_needed[nxt.id] == 0:
                queue.append(nxt)

    # Anything left unresolved is part of a cycle (bad data -- a waterway
    # loop with no real source) -- treat each as its own unbranched source
    # rather than dropping its width entirely or looping forever.
    for f in waterways:
        magnitude.setdefault(f.id, 1.0)
    return magnitude


def source_feature_ids(features: List[Feature]) -> set:
    """Feature ids whose START point has no incoming waterway edge -- a true
    topological source (a real headwater), not just wherever OSM happened to
    split a way. Only these should taper to a point (vertex_widths_m): a
    magnitude-1 segment immediately downstream of ANOTHER magnitude-1
    segment is mid-stream, still a single unbranched channel, not a source,
    even though both segments carry the same Shreve magnitude."""
    waterways = _waterway_features(features)
    incoming_at: Dict[Tuple[float, float], List[Feature]] = defaultdict(list)
    for f in waterways:
        _, end = _endpoints(f)
        incoming_at[end].append(f)
    return {f.id for f in waterways if len(incoming_at[_endpoints(f)[0]]) == 0}


def vertex_widths_m(feature: Feature, width_m: float, is_source: bool,
                    taper_m: float = DEFAULT_SOURCE_TAPER_M) -> List[float]:
    """Per-vertex stroke width along `feature`'s own geometry (ground
    metres, one entry per coordinate, first-to-last matching the OSM
    digitised direction -- upstream to downstream, see this module's
    docstring). Uniform at `width_m` unless `is_source` (see
    source_feature_ids), in which case it ramps from 0 at the very first
    vertex up to `width_m` over `taper_m` of arc length, clamped to the
    feature's own total length so a short headwater way can't overshoot
    into whatever comes after it. 0, not some small floor, is deliberate:
    the point of tapering is the source reads as a true point on the page,
    sub-pixel once projected -- draw.draw_tapered_line is what actually
    draws this, one filled quad per segment."""
    coords = list(feature.geom.coords)
    if not is_source or len(coords) < 2:
        return [width_m] * len(coords)
    cum = [0.0]
    for i in range(1, len(coords)):
        x0, y0 = coords[i - 1]
        x1, y1 = coords[i]
        cum.append(cum[-1] + math.hypot(x1 - x0, y1 - y0))
    ramp_m = min(taper_m, cum[-1]) if cum[-1] > 0 else 0.0
    if ramp_m <= 0:
        return [width_m] * len(coords)
    return [width_m * min(1.0, d / ramp_m) for d in cum]


def width_scale(magnitude: float, min_width: float, max_width: float,
                saturation_magnitude: float = DEFAULT_SATURATION_MAGNITUDE) -> float:
    """Map a Shreve magnitude to a stroke width between min_width and
    max_width (same units in and out -- this file works in ground metres).

    sqrt gives a concave growth curve: real channel width scales roughly
    with the square root of a flow proxy (hydraulic geometry), and it also
    means the very first confluence (magnitude 1 -> 2) already widens
    visibly, instead of the flat early stretch a linear or logarithmic
    curve would give.
    """
    if saturation_magnitude <= 1.0:
        return max_width
    t = min(1.0, math.sqrt(max(0.0, magnitude - 1.0) / (saturation_magnitude - 1.0)))
    return min_width + (max_width - min_width) * t


def river_widths_m(features: List[Feature], min_width_m: float, max_width_m: float,
                   saturation_magnitude: float = DEFAULT_SATURATION_MAGNITUDE) -> Dict[str, float]:
    """{feature.id: stroke width in ground metres} for every river/stream/
    canal in `features`, tapering at sources and widening as tributaries
    combine. The one call render.py needs -- wraps the magnitude computation
    and the width curve together."""
    magnitudes = compute_stream_magnitudes(features)
    return {
        fid: width_scale(m, min_width_m, max_width_m, saturation_magnitude)
        for fid, m in magnitudes.items()
    }
