#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""One-time importer: today's World (the real OSM import with the real
operation log already replayed on top) -> a fresh store.

    python tools/city-map/citymap/store/import_osm.py --out data/map/kurose.gpkg

Run once to bootstrap the store. Everything downstream (Phase 2 onward)
edits the store directly -- this script's job ends the moment the store
exists; it is not part of any ongoing pipeline, and re-running it is meant
to fail loudly against an existing file rather than silently overwrite
hand-made edits (see gpkg.create_store).

Uses the SAME resolution path render.py's CLI already uses (resolve_world +
resolve_replayed_world), so the World imported here is exactly the World
today's renders are made from -- not a re-derivation that could drift.
"""

from __future__ import annotations

import argparse
import os
import sys

from shapely.geometry import Point

CITYMAP_TOOL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, CITYMAP_TOOL_DIR)

import render as render_cli  # noqa: E402
from citymap import cache  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops import replay_cache  # noqa: E402
from citymap.ops.log import load_ops  # noqa: E402
from citymap.style import Style  # noqa: E402
from citymap.store import gpkg  # noqa: E402
from citymap.world import World  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(CITYMAP_TOOL_DIR, "..", ".."))
DEFAULT_FRAME = os.path.join(REPO_ROOT, "data", "map", "frames", "kurose-12km.json")
DEFAULT_STYLE = os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json")
DEFAULT_OPS = os.path.join(REPO_ROOT, "data", "map", "operations", "kurose.json")
DEFAULT_TEMPLATES_DIR = os.path.join(REPO_ROOT, "data", "map", "templates")
DEFAULT_OUT = os.path.join(REPO_ROOT, "data", "map", "kurose.gpkg")
DEM_CACHE_DIR = os.path.join(cache.artifact_root(REPO_ROOT, "source"), "dem")


def resolve_current_world(frame: Frame, style: Style, ops_path: str, on_note=print) -> World:
    """The real base World, with the real op log replayed on top -- the
    exact same two-step resolution render.py's CLI performs for
    `--mode full --ops ...`. Prefers cache hits at every step (both L1 world
    and L3 replayed-world), so this is fast when the usual render cache is
    warm and only pays real fetch/replay cost on a cold cache."""
    world, world_key_parts = render_cli.resolve_world(frame, on_note=on_note)
    if not ops_path:
        return world
    ops = load_ops(ops_path)
    replayed, _results = replay_cache.resolve_replayed_world(
        world, ops, frame, style, DEM_CACHE_DIR, DEFAULT_TEMPLATES_DIR, REPO_ROOT,
        world_key_parts, on_note=on_note)
    return replayed


def import_world(world: World, out_path: str, on_note=print) -> str:
    """The World -> a fresh store at `out_path`. A pure function of
    (World, path) -- doesn't know or care whether `world` came from a cache
    hit or a fresh replay, which is what keeps this importable and testable
    without a real Overpass fetch (see test_import_osm.py)."""
    conn = gpkg.create_store(out_path)
    try:
        on_note(f"importing {len(world.features)} features...")
        for f in world.features:
            gpkg.insert_feature(conn, id=f.id, geom=f.geom, tags=f.tags, is_area=f.area,
                               height_m=f.height_m, origin=f.source, osm_way_id=f.osm_way_id,
                               log=False)

        on_note(f"importing {len(world.terrain_edits)} terrain edits...")
        for i, edit in enumerate(world.terrain_edits):
            gpkg.insert_terrain_edit(conn, id=edit.id, geom=edit.polygon,
                                    target_elevation_m=edit.target_elevation_m,
                                    blend_m=edit.blend_m, stack_order=i, origin=edit.source, log=False)

        on_note("importing road + rail graphs...")
        gpkg.write_graph(conn, "road", world.road_graph.node_xy,
                        world.road_graph.way_nodes, world.road_graph.way_class)
        gpkg.write_graph(conn, "rail", world.rail_graph.node_xy,
                        world.rail_graph.way_nodes, world.rail_graph.way_class)

        on_note("importing sea polygon...")
        gpkg.set_world_geom(conn, "sea", world.sea.sea_geom, log=False, bump=False)

        on_note(f"importing {len(world.lamps)} lamps...")
        for x, y in world.lamps:
            gpkg.insert_lamp(conn, Point(x, y))

        conn.commit()
    finally:
        conn.close()
    on_note(f"done: {out_path}")
    return out_path


def main(argv=None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--frame", default=DEFAULT_FRAME)
    p.add_argument("--style", default=DEFAULT_STYLE)
    p.add_argument("--ops", default=DEFAULT_OPS,
                  help="operation log to replay before importing; pass '' to import the base world only")
    p.add_argument("--out", default=DEFAULT_OUT)
    args = p.parse_args(argv)

    frame = Frame.from_file(args.frame)
    style = Style.from_file(args.style)
    world = resolve_current_world(frame, style, args.ops)
    import_world(world, args.out)


if __name__ == "__main__":
    main()
