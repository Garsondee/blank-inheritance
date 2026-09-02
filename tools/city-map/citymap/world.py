"""The L1 world model: parsed features + road graph + sea polygon, cached.

Everything here is SOURCE CRS, unrotated. That is the entire point of the L1
layer -- it is what a frame's rotation and extent get to change WITHOUT paying
to re-fetch or re-parse OSM, re-run sea classification, or re-derive ids. See
frame.py's `classification_boundary` for how the one genuinely expensive
upstream stage (sea classification) is kept out of that dependency too.

**What "frame-independent" actually means here, precisely**, because it would
be easy to overclaim: the WORLD depends on what got fetched (an Overpass query
built from some centre + a padding), and the query bbox is still centre- and
extent-shaped. What does NOT feed into either the fetch or the classification
boundary is `rotation_deg` -- so re-rotating a frame for art direction, the
single most common tweak during a render session, never invalidates L1. Moving
the city or resizing it meaningfully still does, correctly, since that changes
what needs to be on the ground at all.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from pyproj import Transformer
from shapely.geometry import Polygon

from . import cache
from .acquire import build_overpass_query, fetch_overpass
from .parse import Feature, RoadGraph, parse_elements
from .sea import SeaResult, build_sea_polygon, sea_feature

STAGE_CODE_VERSION = 1


@dataclass
class TerrainEdit:
    """A permanent change to the ground itself, in SOURCE CRS -- construct's
    'bench a level platform into the slope' (design/map-generation.md §6) and
    the future excavate/crater/reclaim ops all produce these.

    Frame-invariant like everything else in World: the polygon and target
    elevation are absolute facts about the terrain, independent of which
    frame later renders them. The actual raster edit happens once per frame,
    in fields.apply_terrain_edits, against that frame's own DEM sampling --
    see that function's docstring for why it cannot happen here.
    """

    id: str
    polygon: Polygon              # SOURCE CRS, the area benched/cut/filled
    target_elevation_m: float     # the flat pad's elevation
    blend_m: float = 15.0         # transition width outside the polygon, so
                                  # the edge grades into natural terrain
                                  # instead of an impossible vertical cliff
    source: str = "osm"           # "op:<op-id>"

PARSER_VERSION = 3  # bumped 2026-08-24 (second bump, same day): parse_elements
                    # now returns a separate rail_graph alongside road_graph --
                    # railway ways previously had NO graph representation at
                    # all, so demolish.py's cascade pruning could only clip a
                    # severed railway bridge, never prune it back to a real
                    # terminus (the dangling-railway-over-open-water bug). A
                    # cache built under version 2 has no rail_graph.json, so
                    # this must bump or World.rail_graph silently loads empty.
                    #
                    # bumped 2026-08-24: Feature.to_attrs gained __osm_way_id__
                    # (previously silently dropped -- see Feature's docstring).
                    # A cache built under version 1 loads with every road
                    # Feature.osm_way_id=None, which makes demolish.py's
                    # graph-cascade pruning a silent no-op against real data:
                    # its removed-way detection keys off Feature.osm_way_id,
                    # so a version-1 world never triggers a single remove_way()
                    # call no matter what's demolished. Bump alongside
                    # parse.STAGE_CODE_VERSION on any other breaking change.
FETCH_PAD_M = 250.0  # margin added around the frame's classification boundary
                     # before it becomes an Overpass fetch request, so features
                     # near the edge are not clipped mid-way through their own
                     # geometry.


@dataclass
class World:
    """Everything known about the ground, unrotated, in source CRS."""

    features: List[Feature]
    road_graph: RoadGraph
    lamps: List[Tuple[float, float]]
    sea: SeaResult
    crs_epsg: int
    terrain_edits: List[TerrainEdit] = field(default_factory=list)
    rail_graph: RoadGraph = field(default_factory=RoadGraph)

    def all_features(self) -> List[Feature]:
        """Every drawable feature, including the synthesised sea polygon.

        Kept separate from `features` (the raw parsed set) so callers that
        only want real OSM content -- the road grammar measurer, say -- are
        not tripped up by the one synthetic entry.
        """
        out = list(self.features)
        feature = sea_feature(self.sea, feature_id="sea-polygon")
        if feature is not None:
            out.append(feature)
        return out


def build_world(elements, fwd: Transformer, boundary, crs_epsg: int) -> World:
    """Parse Overpass elements into a World, in one pass, given a boundary
    polygon (SOURCE CRS) to classify sea against."""
    features, road_graph, rail_graph, lamps = parse_elements(elements, fwd)
    sea_result = build_sea_polygon(features, boundary)
    return World(features=features, road_graph=road_graph, rail_graph=rail_graph,
                lamps=lamps, sea=sea_result, crs_epsg=crs_epsg)


def fetch_and_build_world(frame, source_cache_dir: str,
                          fetch_pad_m: float = FETCH_PAD_M) -> World:
    """The end-to-end L1 build: fetch (or reuse) Overpass, then parse+classify.

    Takes a Frame for convenience (centre, CRS, extent) but the resulting
    World's correctness does not depend on the frame's rotation -- see module
    docstring.
    """
    south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=fetch_pad_m)
    query = build_overpass_query(south, west, north, east)
    data = fetch_overpass(query, source_cache_dir)
    boundary = frame.classification_boundary(margin=1.0)
    return build_world(data["elements"], frame.fwd, boundary, frame.crs_epsg)


# --- L1 caching ------------------------------------------------------------

def world_key_parts(query: str, crs_epsg: int) -> dict:
    return {
        "osmQueryHash": cache.cache_key({"query": query}),
        "crsEpsg": crs_epsg,
        "parserVersion": PARSER_VERSION,
    }


def _graph_to_dict(graph: RoadGraph) -> dict:
    return {
        "nodeXy": {str(k): v for k, v in graph.node_xy.items()},
        "nodeWays": {str(k): sorted(v) for k, v in graph.node_ways.items()},
        "wayNodes": {str(k): v for k, v in graph.way_nodes.items()},
        "wayClass": {str(k): v for k, v in graph.way_class.items()},
    }


def _graph_from_dict(raw: dict) -> RoadGraph:
    graph = RoadGraph()
    graph.node_xy = {int(k): tuple(v) for k, v in raw["nodeXy"].items()}
    graph.node_ways = {int(k): set(v) for k, v in raw["nodeWays"].items()}
    graph.way_nodes = {int(k): v for k, v in raw["wayNodes"].items()}
    graph.way_class = {int(k): v for k, v in raw["wayClass"].items()}
    return graph


def save_world(world: World, artifact: cache.Artifact) -> None:
    artifact.begin_write()

    geoms = [f.geom for f in world.features]
    cache.write_geometries(artifact.path("features"), geoms)
    attrs = [f.to_attrs() for f in world.features]
    cache.write_attrs(artifact.path("features.attrs.json"), attrs)

    cache.write_geometries(artifact.path("sea"), [world.sea.sea_geom])

    with open(artifact.path("lamps.json"), "w", encoding="utf-8") as fh:
        json.dump(world.lamps, fh)

    with open(artifact.path("graph.json"), "w", encoding="utf-8") as fh:
        json.dump(_graph_to_dict(world.road_graph), fh)

    with open(artifact.path("rail_graph.json"), "w", encoding="utf-8") as fh:
        json.dump(_graph_to_dict(world.rail_graph), fh)

    cache.write_geometries(artifact.path("terrain_edits"), [e.polygon for e in world.terrain_edits])
    with open(artifact.path("terrain_edits.attrs.json"), "w", encoding="utf-8") as fh:
        json.dump([{"id": e.id, "targetElevationM": e.target_elevation_m,
                   "blendM": e.blend_m, "source": e.source} for e in world.terrain_edits], fh)

    artifact.commit(extra={
        "featureCount": len(world.features),
        "seaFaceCount": world.sea.sea_face_count,
        "seaCarvedCount": world.sea.carved_feature_count,
        "terrainEditCount": len(world.terrain_edits),
    })


def load_world(artifact: cache.Artifact) -> World:
    extra = artifact.verify()

    geoms = cache.read_geometries(artifact.path("features"))
    attrs = cache.read_attrs(artifact.path("features.attrs.json"))
    features = [Feature.from_attrs(geom, attr) for geom, attr in zip(geoms, attrs)]

    sea_geom = cache.read_geometries(artifact.path("sea"))[0]
    sea_result = SeaResult(
        sea_geom=sea_geom, face_count=-1, sea_face_count=-1,
        land_content_count=-1,
        carved_feature_count=extra.get("seaCarvedCount", 0),
        area_before_carve_km2=0.0,
        area_after_carve_km2=sea_geom.area / 1e6 if sea_geom is not None else 0.0,
    )

    with open(artifact.path("lamps.json"), encoding="utf-8") as fh:
        lamps = [tuple(p) for p in json.load(fh)]

    with open(artifact.path("graph.json"), encoding="utf-8") as fh:
        road_graph = _graph_from_dict(json.load(fh))

    with open(artifact.path("rail_graph.json"), encoding="utf-8") as fh:
        rail_graph = _graph_from_dict(json.load(fh))

    # Additive field (2026-08-23) -- tolerate a cache written before it
    # existed rather than forcing a full re-fetch+parse just to gain an
    # always-empty list.
    terrain_edits: List[TerrainEdit] = []
    edits_attrs_path = artifact.path("terrain_edits.attrs.json")
    if os.path.exists(edits_attrs_path):
        edit_geoms = cache.read_geometries(artifact.path("terrain_edits"))
        with open(edits_attrs_path, encoding="utf-8") as fh:
            edit_attrs = json.load(fh)
        terrain_edits = [
            TerrainEdit(id=a["id"], polygon=g, target_elevation_m=a["targetElevationM"],
                       blend_m=a["blendM"], source=a["source"])
            for g, a in zip(edit_geoms, edit_attrs)
        ]

    return World(features=features, road_graph=road_graph, rail_graph=rail_graph,
                lamps=lamps, sea=sea_result, crs_epsg=world_crs_from_key(artifact),
                terrain_edits=terrain_edits)


def world_crs_from_key(artifact: cache.Artifact) -> int:
    return artifact.key_parts["crsEpsg"]


def fetch_build_and_cache_world(frame, repo_root: str,
                                fetch_pad_m: float = FETCH_PAD_M) -> World:
    """The full path with L1 caching: reuse a cached world when the query and
    parser version match, else fetch+parse+classify and cache the result."""
    source_dir = cache.artifact_root(repo_root, "source")
    world_dir = cache.artifact_root(repo_root, "world")

    south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=fetch_pad_m)
    query = build_overpass_query(south, west, north, east)
    key_parts = world_key_parts(query, frame.crs_epsg)
    artifact = cache.Artifact(world_dir, key_parts)

    if artifact.exists():
        return load_world(artifact)

    data = fetch_overpass(query, source_dir)
    boundary = frame.classification_boundary(margin=1.0)
    world = build_world(data["elements"], frame.fwd, boundary, frame.crs_epsg)
    save_world(world, artifact)
    return world
