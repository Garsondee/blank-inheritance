"""Overpass JSON -> features and a real road graph, in SOURCE CRS.

Everything here works in the source CRS, unrotated and unclipped. That is
deliberate and is what lets the frame be re-centred, re-rotated and re-sized
without invalidating any of it -- rotation and extent are precisely the
parameters an art-direction loop sweeps, and they are also what stable ids must
NOT depend on (see ids.py).

Two things this module does that the original spike did not:

**Multipolygon relations.** Large landuse areas, and whole reclaimed islands,
are frequently mapped in OSM only as relations, never as closed ways. Port
Island's coastline exists *solely* as relation 6421263 -- there is no way-level
equivalent anywhere. A way-only parser therefore renders an 8.4 km2 island as
open sea, which is exactly the bug that took three attempts to pin down. Any
re-import must keep handling relations or the islands vanish again.

**The road graph.** design/map-generation.md §2 claims "roads import as a
topological graph", and the *data* supports that -- every Overpass way carries a
`nodes` array aligned 1:1 with `geometry` -- but nothing in the spike ever built
it; each way was an independent LineString. That distinction matters enormously
for routing: in the cached Kurose extract only 532 of 13,107 highway nodes are
genuine degree-1 dead ends, while 5,158 are shared between ways. So ~96% of
what a naive "nearest road endpoint" search would find are arbitrary way-splits
where a mapper changed a tag mid-street, and joining one produces a T-junction
in the middle of a straight road for no reason a viewer can see.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union

from . import ids

STAGE_CODE_VERSION = 1

# natural=* values that mean water, so they never count as land content.
WATERY_NATURAL = frozenset({"water", "coastline", "bay", "strait", "wetland"})

# Fallback building heights in metres, by building=* value, when neither
# `height` nor `building:levels` is tagged. 1950s Minkai reads low-rise, but
# these are the real-world OSM defaults the delivered render used.
_DEFAULT_HEIGHTS = {
    "house": 6.5, "detached": 6.5, "residential": 9.0, "apartments": 22.0,
    "commercial": 18.0, "retail": 10.0, "industrial": 11.0, "warehouse": 11.0,
    "office": 30.0, "hotel": 34.0, "school": 12.0, "temple": 9.0,
    "shrine": 7.0, "garage": 3.5, "roof": 4.0,
}
_LEVEL_HEIGHT_M = 3.3


@dataclass
class Feature:
    """One map feature in source CRS.

    Deliberately the same shape the renderer already dispatches on -- geometry,
    OSM-style tags, an area flag and a height. Everything downstream (Minkowski
    shadows, height-graded fills, road casings, bridge z-order) keys off tags,
    so a synthesised feature that carries plausible tags inherits the entire
    renderer for free. That is what makes the operation log cheap.
    """

    id: str
    geom: object                # shapely geometry, SOURCE CRS
    tags: Dict[str, str]
    area: bool
    height_m: float = 0.0
    source: str = "osm"         # "osm" | "op:<op-id>"
    osm_way_id: Optional[int] = None  # raw OSM id, ways only -- correlates a
                                      # road Feature back to RoadGraph.way_nodes
                                      # for demolish's severed-end pruning.
                                      # None for relations, synthesised
                                      # features, and nodes.

    def is_building(self) -> bool:
        return "building" in self.tags

    def to_attrs(self) -> Dict[str, str]:
        """Feature -> a flat string dict, for the world.py/fields.py cache
        writers. Non-tag fields are namespaced with a double-underscore so
        they can't collide with a real OSM tag key, and are stripped back out
        by `from_attrs`. Centralised here (rather than duplicated in both
        callers, as it briefly was) specifically because a duplicated version
        silently dropped `source` -- harmless while every feature came from
        OSM, a real bug the moment an op-log op starts saving synthesised
        features into a cached World or Fields.
        """
        out = {"__area__": "1" if self.area else "0",
              "__height__": repr(self.height_m),
              "__id__": self.id,
              "__source__": self.source}
        if self.osm_way_id is not None:
            out["__osm_way_id__"] = str(self.osm_way_id)
        out.update(self.tags)
        return out

    @classmethod
    def from_attrs(cls, geom, attrs: Dict[str, str]) -> "Feature":
        attrs = dict(attrs)  # never mutate the caller's dict
        area = attrs.pop("__area__") == "1"
        height = float(attrs.pop("__height__"))
        feature_id = attrs.pop("__id__")
        source = attrs.pop("__source__", "osm")
        way_id_raw = attrs.pop("__osm_way_id__", None)
        return cls(id=feature_id, geom=geom, tags=attrs, area=area,
                  height_m=height, source=source,
                  osm_way_id=int(way_id_raw) if way_id_raw is not None else None)

    def highway(self) -> Optional[str]:
        return self.tags.get("highway")

    def is_bridge(self) -> bool:
        """A deck carried above what it crosses.

        `layer > 0` counts too: plenty of elevated road is tagged only with a
        layer, and treating it as at-grade draws it underneath the buildings it
        actually flies over.
        """
        bridge = self.tags.get("bridge")
        if bridge and bridge != "no":
            return True
        try:
            return int(self.tags.get("layer", "0")) > 0
        except (TypeError, ValueError):
            return False


@dataclass
class RoadGraph:
    """Road topology recovered from OSM's own node ids.

    Exact by construction: two ways meet iff they literally share a node id.
    No geometric snapping and therefore no tolerance parameter to tune wrong.
    """

    node_xy: Dict[int, Tuple[float, float]] = field(default_factory=dict)
    node_ways: Dict[int, set] = field(default_factory=lambda: defaultdict(set))
    way_nodes: Dict[int, List[int]] = field(default_factory=dict)
    way_class: Dict[int, str] = field(default_factory=dict)

    def degree(self, node_id: int) -> int:
        """How many way-ends/passes touch this node.

        Counts *incidences*, not distinct ways: a node in the middle of one way
        has degree 2 because the road continues through it in both directions.
        """
        deg = 0
        for way_id in self.node_ways.get(node_id, ()):
            nodes = self.way_nodes.get(way_id, ())
            for i, n in enumerate(nodes):
                if n != node_id:
                    continue
                deg += 1 if (i == 0 or i == len(nodes) - 1) else 2
        return deg

    def junctions(self) -> List[int]:
        """Nodes where three or more road-ends meet -- real intersections."""
        return [n for n in self.node_ways if self.degree(n) >= 3]

    def dead_ends(self) -> List[int]:
        """Genuine degree-1 termini: cul-de-sacs, severed ends, map edges."""
        return [n for n in self.node_ways if self.degree(n) == 1]

    def classes_at(self, node_id: int) -> set:
        return {self.way_class[w] for w in self.node_ways.get(node_id, ())
                if w in self.way_class}

    def copy(self) -> "RoadGraph":
        """A deep-enough copy for safe mutation -- ops.demolish's pruning
        works on this, never on the original, so a World's road_graph stays
        replayable from the same base state regardless of what any single op
        does to its copy."""
        return RoadGraph(
            node_xy=dict(self.node_xy),
            node_ways={k: set(v) for k, v in self.node_ways.items()},
            way_nodes={k: list(v) for k, v in self.way_nodes.items()},
            way_class=dict(self.way_class),
        )

    def remove_way(self, way_id: int) -> None:
        """Delete a way and drop its reference from every node it touched, IN
        PLACE -- callers that need the original preserved must `copy()` first.

        A node left touching no ways at all is removed entirely, not kept as
        a degree-0 phantom: it is no longer part of the road network.
        """
        nodes = self.way_nodes.pop(way_id, [])
        self.way_class.pop(way_id, None)
        for node_id in set(nodes):
            ways = self.node_ways.get(node_id)
            if ways is None:
                continue
            ways.discard(way_id)
            if not ways:
                del self.node_ways[node_id]
                self.node_xy.pop(node_id, None)


def height_of(tags: Dict[str, str]) -> float:
    """Best available building height in metres.

    `height` first, then storey count x 3.3 m, then a per-type default. The 2.5 m
    floor stops a mis-tagged `height=0` producing a building that casts no
    shadow and so reads as a hole in the render.
    """
    for key, mult in (("height", 1.0), ("building:levels", _LEVEL_HEIGHT_M)):
        raw = tags.get(key)
        if not raw:
            continue
        try:
            value = float(str(raw).split(";")[0].replace("m", "").strip())
        except ValueError:
            continue
        return max(2.5, value * mult)
    return _DEFAULT_HEIGHTS.get(tags.get("building", "yes"), 8.0)


def _project_ring(geometry: Iterable[dict], fwd) -> List[Tuple[float, float]]:
    lons = [p["lon"] for p in geometry]
    lats = [p["lat"] for p in geometry]
    xs, ys = fwd.transform(lons, lats)   # vectorised: ~8x faster than per-point
    return list(zip(xs, ys))


def _is_closed(pts: List[Tuple[float, float]]) -> bool:
    return (len(pts) > 3
            and abs(pts[0][0] - pts[-1][0]) < 1e-6
            and abs(pts[0][1] - pts[-1][1]) < 1e-6)


def polygon_from_relation(element: dict, fwd):
    """Rebuild a multipolygon relation from its member way geometries.

    Outer-role members are polygonized into rings; inner-role members are
    polygonized separately and subtracted as holes. Members with no `role` are
    treated as outer, which matches how OSM data is actually tagged in practice
    (the role is frequently omitted on simple single-ring relations).

    Returns None when the members do not close into anything usable -- a
    partially-downloaded relation clipped by the query bbox is normal and must
    not raise.
    """
    outer_lines, inner_lines = [], []
    for member in element.get("members", []):
        geometry = member.get("geometry")
        if not geometry or len(geometry) < 2:
            continue
        try:
            line = LineString(_project_ring(geometry, fwd))
        except Exception:
            continue
        if line.is_empty:
            continue
        (inner_lines if member.get("role") == "inner" else outer_lines).append(line)

    if not outer_lines:
        return None
    try:
        outer = unary_union(list(polygonize(outer_lines)))
        if outer.is_empty:
            return None
        if inner_lines:
            inner = unary_union(list(polygonize(inner_lines)))
            if not inner.is_empty:
                outer = outer.difference(inner)
        return None if outer.is_empty else outer
    except Exception:
        return None


# Sanity cap on a reconstructed relation's area, in m2. A genuine local
# target -- Port Island (8.4 km2), Rokko Island, a reclaimed-island landuse
# zone -- is single-digit to low-double-digit km2. This is set two orders of
# magnitude above that, generously, and still three orders of magnitude below
# what actually triggered it.
#
# REGRESSION (found 2026-08-24, via a sea-carve integration test that took
# 40+ seconds when everything else in the suite took milliseconds -- not from
# a visibly wrong render, which is exactly why it survived to delivery).
# `relation["place"="island"]` has no size filter, and Overpass matches a
# relation against a bbox query if ANY member falls inside it -- so the query
# faithfully reconstructed relation 382313: HONSHU ITSELF, Japan's main
# island, 228,438 km2 across 580,397 vertices after unioning with its
# neighbours in land_content. Kurose sits ON Honshu, so of course it
# "overlaps" any bbox drawn there. That single feature silently cost every
# render 30-40+ seconds of wasted buffer() work in the sea carve-out -- real
# land, so it never corrupted a result, only wasted time, unpredictably,
# depending on how much of the mainland's boundary Overpass happened to
# return for that particular query shape.
MAX_RELATION_AREA_M2 = 200_000_000.0  # 200 km2


def relation_is_area(tags: Dict[str, str]) -> bool:
    """Does this relation describe a piece of ground we should reconstruct?"""
    if tags.get("type") != "multipolygon":
        return False
    return bool(
        tags.get("landuse") or tags.get("leisure") or tags.get("natural")
        or tags.get("aeroway") or tags.get("building")
        or tags.get("place") == "island"
    )


def parse_elements(elements: Iterable[dict], fwd):
    """Overpass elements -> (features, road_graph, rail_graph, street_lamps).

    Lamps come back separately because they are points with no geometry to
    draw; they become Foundry `AmbientLight` documents on export (§8).

    TWO graphs, not one: a demolish that clips a road or a railway bridge
    can only prune the severed remainder back to a real junction if it has a
    real graph to cascade through (see demolish.py's module docstring). Kobe
    Airport's own removal found this the hard way -- its road bridge pruned
    correctly, but the electrified rail bridge alongside it (a separate OSM
    way, sharing no highway=* tag and therefore never part of road_graph)
    was only ever clipped, never pruned, and was left as a bare rail line
    running out into open water. A way tagged with BOTH highway and railway
    (a tram in a street, say) goes into both graphs -- real, if rare.
    """
    features: List[Feature] = []
    lamps: List[Tuple[float, float]] = []
    road_graph = RoadGraph()
    rail_graph = RoadGraph()

    def _add_to_graph(graph: RoadGraph, way_id: int, class_value: str,
                      node_ids: List[int], pts: List[Tuple[float, float]]) -> None:
        graph.way_nodes[way_id] = list(node_ids)
        graph.way_class[way_id] = class_value
        for node_id, xy in zip(node_ids, pts):
            graph.node_xy[node_id] = xy
            graph.node_ways[node_id].add(way_id)

    for element in elements:
        etype = element.get("type")
        tags = element.get("tags", {}) or {}

        if etype == "node":
            if tags.get("highway") == "street_lamp":
                lamps.append(fwd.transform(element["lon"], element["lat"]))
            continue

        if etype == "relation":
            if not relation_is_area(tags):
                continue
            geom = polygon_from_relation(element, fwd)
            if geom is None or geom.is_empty:
                continue
            if geom.area > MAX_RELATION_AREA_M2:
                # See MAX_RELATION_AREA_M2's docstring -- this is the mainland
                # the frame sits on, not a local feature to carve, no matter
                # how legitimately it reconstructed.
                continue
            features.append(Feature(
                id=ids.osm_feature_id("relation", element["id"]),
                geom=geom, tags=tags, area=True,
                height_m=height_of(tags) if "building" in tags else 0.0,
            ))
            continue

        if etype != "way":
            continue

        geometry = element.get("geometry")
        if not geometry or len(geometry) < 2:
            continue
        pts = _project_ring(geometry, fwd)
        closed = _is_closed(pts)

        try:
            geom = Polygon(pts) if closed else LineString(pts)
            if closed and not geom.is_valid:
                geom = geom.buffer(0)
        except Exception:
            continue
        if geom.is_empty:
            continue

        features.append(Feature(
            id=ids.osm_feature_id("way", element["id"]),
            geom=geom, tags=tags, area=closed,
            height_m=height_of(tags) if "building" in tags else 0.0,
            osm_way_id=element["id"],
        ))

        # Road/rail topology, from OSM's own node ids -- see module docstring.
        node_ids = element.get("nodes")
        if node_ids and len(node_ids) == len(pts):
            way_id = element["id"]
            if tags.get("highway"):
                _add_to_graph(road_graph, way_id, tags["highway"], node_ids, pts)
            if tags.get("railway"):
                _add_to_graph(rail_graph, way_id, tags["railway"], node_ids, pts)

    return features, road_graph, rail_graph, lamps


def land_content(features: Iterable[Feature]) -> List:
    """Geometries that imply dry land, for sea classification and carving.

    Buildings, plus any area feature carrying a landuse/leisure/aeroway tag, an
    island tag, or a non-watery natural tag.

    Linear aeroway centrelines are buffered to a plausible paved half-width and
    included too. An airport's runway and taxiways are mapped as unclosed
    centrelines, not areas -- so with an area-only test the pavement between the
    grass strips has no land evidence at all and the whole airfield classifies
    as sea. That was the second half of the Kobe Airport bug.
    """
    aero_half_width = {"runway": 30.0, "taxiway": 15.0, "taxilane": 15.0}
    out = []
    for feature in features:
        tags = feature.tags
        if feature.is_building():
            out.append(feature.geom)
            continue
        if feature.area and (
            tags.get("landuse") or tags.get("leisure") or tags.get("aeroway")
            or tags.get("place") == "island"
            or (tags.get("natural") and tags["natural"] not in WATERY_NATURAL)
        ):
            out.append(feature.geom)
            continue
        if not feature.area:
            half = aero_half_width.get(tags.get("aeroway"))
            if half:
                out.append(feature.geom.buffer(half))
    return out
