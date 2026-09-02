"""load_world_from_store: the integration seam that protects the rendering
code (the map-editor plan's own phrase for this).

Returns the identical `World` dataclass (citymap.world.World) that
`world.load_world`/`replay_ops` already produce -- every downstream module
(fields.py, render.py, terrain.py, draw.py, contour.py, rivers.py,
router.py, sea.py) stays untouched, because they only ever depend on
`World`'s shape, never on how it was constructed. Only the loader changes.
"""

from __future__ import annotations

import os
from typing import Callable

from ..parse import Feature, RoadGraph
from ..sea import SeaResult
from ..world import TerrainEdit, World
from . import gpkg


def _road_graph_from_store(conn, prefix: str) -> RoadGraph:
    node_xy, way_nodes, way_class = gpkg.read_graph(conn, prefix)
    # node_ways is derived, not stored (see gpkg.write_graph's docstring).
    # A PLAIN dict, matching every other loaded RoadGraph in this codebase
    # (world.py's _graph_from_dict, demolish.py's own documented note that
    # node_ways is "a plain dict after RoadGraph.copy()/load_world() (never
    # a defaultdict)") -- code downstream (demolish.py, construct.py's
    # _splice_road_into_graph) already defends with .setdefault() rather
    # than assuming auto-vivification, so matching that convention exactly
    # avoids a subtle, hard-to-spot behavioural mismatch.
    node_ways: dict = {}
    for way_id, nodes in way_nodes.items():
        for node_id in nodes:
            node_ways.setdefault(node_id, set()).add(way_id)
    return RoadGraph(node_xy=node_xy, node_ways=node_ways, way_nodes=way_nodes, way_class=way_class)


def load_world_from_store(db_path: str, crs_epsg: int = gpkg.SOURCE_SRS_ID) -> World:
    """The store -> a World, ready for fields.build_fields/render_tile
    exactly like today's replayed World is."""
    conn = gpkg.connect(db_path)
    try:
        features = [Feature(**kwargs) for kwargs in gpkg.iter_all_features(conn)]
        terrain_edits = [TerrainEdit(**kwargs) for kwargs in gpkg.iter_all_terrain_edits(conn)]
        road_graph = _road_graph_from_store(conn, "road")
        rail_graph = _road_graph_from_store(conn, "rail")
        sea_geom = gpkg.get_world_geom(conn, "sea")
        lamps = [(x, y) for x, y in gpkg.iter_all_lamps(conn)]

        sea = SeaResult(
            sea_geom=sea_geom, face_count=-1, sea_face_count=-1, land_content_count=-1,
            carved_feature_count=0,  # diagnostic-only; world.py's own load_world doesn't
                                     # faithfully round-trip this either (see its docstring) --
                                     # matching that existing precedent, not a new gap.
            area_before_carve_km2=0.0,
            area_after_carve_km2=sea_geom.area / 1e6 if sea_geom is not None else 0.0,
        )
        return World(features=features, road_graph=road_graph, rail_graph=rail_graph,
                    lamps=lamps, sea=sea, crs_epsg=crs_epsg, terrain_edits=terrain_edits)
    finally:
        conn.close()


def resolve_fields_from_store(db_path: str, frame, style, dem_cache_dir: str,
                              repo_root: str, on_note: Callable[[str], None] = lambda m: None):
    """load_world_from_store + fields.build_fields, CACHED -- the store-path
    analogue of render.py's resolve_fields, which caches the OSM-fetch
    path's Fields the same way. Without this, every process start (a tile
    server restart, in particular) pays the full DEM/hillshade build cost
    from scratch -- measured ~155s on the real Kurose data -- even when
    nothing in the store has changed since the last run.

    Keyed on the store's own `meta.world_version` in place of the OSM
    path's Overpass-query hash -- reuses fields.fields_key_parts and the
    same cache/frame/ artifact root unchanged (the two key shapes never
    collide, since one has an `osmQueryHash` field and this one doesn't),
    so this is a genuinely new key space living alongside the existing one,
    not a parallel cache mechanism.
    """
    from .. import cache, fields as fields_module

    conn = gpkg.connect(db_path)
    try:
        world_version = gpkg.get_world_version(conn)
    finally:
        conn.close()

    world_key = {"storePath": os.path.abspath(db_path), "worldVersion": world_version}
    key_parts = fields_module.fields_key_parts(world_key, frame)
    artifact = cache.Artifact(cache.artifact_root(repo_root, "frame"), key_parts)
    if artifact.exists():
        on_note(f"fields cache hit ({artifact.dir})")
        return fields_module.load_fields(artifact, frame)

    on_note("building fields (DEM fetch/sample, hillshade, sea gradient) -- "
           "first run for this store state only, cached after this...")
    world = load_world_from_store(db_path, crs_epsg=frame.crs_epsg)
    f = fields_module.build_fields(world, frame, dem_cache_dir, style)
    fields_module.save_fields(f, artifact)
    return f
