# -*- coding: utf-8 -*-
"""The city-map CLI: preview a small window fast, or export the full frame,
with progress reporting and time estimates throughout so a real person can
babysit a long render rather than guessing whether it has hung.

    python render.py --mode preview --lon 135.205 --lat 34.678 --extent-m 1000 --out preview.png
    python render.py --mode overview --out overview.png
    python render.py --mode full --out full.png
    python render.py --mode full --ops data/map/operations/kurose.json --out full-with-ops.png
    python render.py --mode layers --out-dir export/layers --tiles 3 --px-per-tile 2048

--mode layers writes one transparent PNG per visual element (see
citymap/render_layers.py) plus manifest.json into --out-dir, instead of one
flattened image -- for hand-painting/finishing the map in an image editor.
--grid-spacing-m and --no-grid control the reference-grid overlay layers;
every other flag (--tiles/--px-per-tile/--supersample/--lon/--lat/--extent-m)
means exactly what it means for --mode full, since it shares the same tiled
assembly.

Frame/style default to the real Kurose files under data/map/; --ops is
optional (design/map-generation.md §6: render = base World + replay log, and
with no ops that's just the base world). World/Fields are loaded from cache
when available (tools/city-map/cache/, gitignored) and built+cached
otherwise -- the first real run pays the Overpass+DEM fetch cost, every run
after is fast.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

from citymap import (
    acquire, cache, external, fields as fields_module, render as render_module,
    render_layers as render_layers_module, world as world_module,
)
from citymap.frame import Frame
from citymap.ops import replay_cache
from citymap.ops.log import load_ops
from citymap.progress import ProgressReporter, StageTimer
from citymap.style import Style

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_FRAME = os.path.join(REPO_ROOT, "data", "map", "frames", "kurose-12km.json")
DEFAULT_STYLE = os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json")
DEFAULT_TEMPLATES_DIR = os.path.join(REPO_ROOT, "data", "map", "templates")
SOURCE_CACHE_DIR = cache.artifact_root(REPO_ROOT, "source")
DEM_CACHE_DIR = os.path.join(SOURCE_CACHE_DIR, "dem")
EXTERNAL_CACHE_DIR = os.path.join(SOURCE_CACHE_DIR, "external")


def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--frame", default=DEFAULT_FRAME, help="path to a map-frame.schema.json file")
    p.add_argument("--style", default=DEFAULT_STYLE, help="path to a map-style.schema.json file")
    p.add_argument("--ops", default=None, help="path to a map-operation-log.schema.json file to replay")
    p.add_argument("--templates-dir", default=DEFAULT_TEMPLATES_DIR,
                  help="directory holding {template}.json files construct ops reference")
    p.add_argument("--out", default=None,
                  help="output PNG path (preview/overview/full modes; layers mode uses --out-dir instead)")
    p.add_argument("--mode", choices=["preview", "overview", "full", "layers"], default="preview")

    p.add_argument("--lon", type=float,
                  help="preview mode: window centre longitude; full mode: optional crop centre "
                       "longitude (with --lat, tiles a window instead of the whole frame)")
    p.add_argument("--lat", type=float, help="preview mode: window centre latitude; full mode: "
                                            "optional crop centre latitude")
    p.add_argument("--extent-m", type=float, default=1000.0,
                  help="preview mode: window side, metres; full mode: crop side, metres "
                       "(only used when --lon/--lat are given)")
    p.add_argument("--mpp", type=float, default=0.586, help="preview/overview mode: metres per pixel")

    p.add_argument("--overview-px", type=int, default=2048, help="overview mode: output side, pixels")
    p.add_argument("--tiles", type=int, default=3,
                  help="full/layers mode: N x N tile grid (design doc §8 default 3)")
    p.add_argument("--px-per-tile", type=int, default=2048,
                  help="full/layers mode: each tile's output side, pixels")
    p.add_argument("--supersample", type=int, default=1, help="working-canvas multiplier before downsample")

    p.add_argument("--out-dir", default=None,
                  help="layers mode: directory to write one PNG per layer + manifest.json into")
    p.add_argument("--grid-spacing-m", type=float, default=render_layers_module.DEFAULT_GRID_SPACING_M,
                  help="layers mode: reference-grid line spacing, ground metres")
    p.add_argument("--no-grid", action="store_true",
                  help="layers mode: skip the grid-lines/grid-labels reference layers")
    p.add_argument("--no-external", action="store_true",
                  help="layers mode: skip non-OSM sources (GSI evacuation sites) -- use when "
                       "offline; they are fetched once and cached thereafter")
    return p.parse_args(argv)


def resolve_world(frame: Frame, on_note=print):
    """Returns (World, world_key_parts) -- the key travels with the World so
    resolve_fields can address the SAME fields cache _setup_cache.py-style
    scripts already populate, instead of silently missing it under a
    different key and rebuilding Fields (DEM fetch + hillshade) every run."""
    south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=world_module.FETCH_PAD_M)
    query = acquire.build_overpass_query(south, west, north, east)
    key_parts = world_module.world_key_parts(query, frame.crs_epsg)
    artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "world"), key_parts)
    if artifact.exists():
        on_note(f"world cache hit ({artifact.dir})")
        return world_module.load_world(artifact), key_parts
    with StageTimer("fetching + parsing OSM data (no cache yet for this query)"):
        data = acquire.fetch_overpass(query, SOURCE_CACHE_DIR)
        boundary = frame.classification_boundary(margin=1.0)
        w = world_module.build_world(data["elements"], frame.fwd, boundary, frame.crs_epsg)
        world_module.save_world(w, artifact)
    return w, key_parts


def resolve_fields(world, world_key_parts: dict, frame: Frame, style, ops=None, on_note=print):
    """`ops`, when given, folds their content hash into the cache key -- this
    is the other half of the L3 replay cache (citymap.ops.replay_cache): a
    World with terrain_edits baked in from ops is genuinely a DIFFERENT
    world, so Fields built from it must be keyed on what produced it, not
    just reused/discarded by a blunt "any ops present -> never cache" rule
    the way this used to work."""
    key_parts = fields_module.fields_key_parts(world_key_parts, frame)
    if ops:
        key_parts["opsHash"] = replay_cache.ops_hash(ops)
    artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "frame"), key_parts)
    if artifact.exists():
        on_note(f"fields cache hit ({artifact.dir})")
        return fields_module.load_fields(artifact, frame)
    with StageTimer("building fields (DEM fetch/sample, hillshade, sea gradient)"):
        f = fields_module.build_fields(world, frame, DEM_CACHE_DIR, style)
    with StageTimer("caching fields"):
        fields_module.save_fields(f, artifact)
    return f


def render_full(fields, style, frame: Frame, n: int, px_per_tile: int, supersample: int,
                on_tile=None, window=None):
    """`on_tile(i, total)` fires after each tile finishes -- optional, so the
    CLI's own ProgressReporter-driven bar keeps working unchanged; the editor
    server's SSE progress stream is the other caller, and wants structured
    per-tile events rather than a bar to scrape text off of.

    `window`, when given, is `(lon, lat, extent_m)`: tile an n x n grid over
    that square crop (Frame.window_grid_tiles) instead of the whole frame
    page. Without it this covers the entire frame, same as always -- the
    windowed case exists for a high-resolution render of just the area
    someone is working on, which used to have no crop option at all."""
    from PIL import Image
    if window is not None:
        lon, lat, extent_m = window
        tiles = frame.window_grid_tiles(lon, lat, extent_m, n, px_per_tile, supersample)
    else:
        tiles = frame.grid_tiles(n, px_per_tile, supersample)
    canvas = Image.new("RGB", (n * px_per_tile, n * px_per_tile))
    with ProgressReporter(total=len(tiles), label="export tiles") as bar:
        for i, tile in enumerate(tiles):
            img = render_module.render_tile(fields, style, tile)
            row, col = divmod(i, n)
            canvas.paste(img, (col * px_per_tile, row * px_per_tile))
            bar.update(1)
            if on_tile is not None:
                on_tile(i + 1, len(tiles))
    return canvas


def render_layers_full(fields, style, frame: Frame, n: int, px_per_tile: int, supersample: int,
                       out_dir: str, *, grid_spacing_m: float = render_layers_module.DEFAULT_GRID_SPACING_M,
                       draw_grid: bool = True, window=None, on_tile=None,
                       evacuation_sites=None, zoning=None) -> None:
    """The layered analogue of render_full: writes one big PNG per layer
    (n*px_per_tile square, same final size as render_full's single
    flattened canvas) into out_dir. Manifest writing is the caller's job
    (main() does it) so this function's only responsibility is pixels.

    Two-phase, specifically to keep this feasible at the SAME resolution
    ceiling as today's flattened export regardless of how many layers there
    are -- see citymap/render_layers.py's own module docstring on why
    materializing every layer for one tile at production resolution at once
    is a real MemoryError risk, and why holding every layer's FULL canvas in
    memory simultaneously (17 layers x 24576^2 RGBA ~= 41 GB at the design
    doc's production scale) is not an option either:

      Phase 1 renders each tile ONCE -- paying the expensive feature-query/
      shadow-sweep/contour cost per TILE, not per layer -- and streams every
      yielded layer straight to a small per-tile temp PNG, freeing it
      immediately. Peak memory here is bounded by one tile's current layer.

      Phase 2 assembles one full-size canvas AT A TIME from those temp
      tiles, on disk, then saves and frees it before the next layer. Peak
      memory here matches today's proven single-canvas flattened export,
      regardless of layer count.

    Temp tiles live under out_dir/.tmp-tiles (same volume as the final
    output), not the OS temp directory -- Windows' default temp location can
    be a different, and much smaller, drive than wherever the user pointed
    --out-dir.
    """
    from PIL import Image

    if window is not None:
        lon, lat, extent_m = window
        tiles = frame.window_grid_tiles(lon, lat, extent_m, n, px_per_tile, supersample)
    else:
        tiles = frame.grid_tiles(n, px_per_tile, supersample)

    layer_names = [name for name in render_layers_module.LAYER_ORDER
                  if draw_grid or name not in ("grid-lines", "grid-labels")]

    tmp_root = os.path.join(out_dir, ".tmp-tiles")
    for name in layer_names:
        os.makedirs(os.path.join(tmp_root, name), exist_ok=True)

    try:
        with ProgressReporter(total=len(tiles), label="render tiles") as bar:
            for i, tile in enumerate(tiles):
                row, col = divmod(i, n)
                for name, img in render_layers_module.iter_tile_layers(
                        fields, style, tile, grid_spacing_m=grid_spacing_m, draw_grid=draw_grid,
                        evacuation_sites=evacuation_sites, zoning=zoning):
                    img.save(os.path.join(tmp_root, name, f"r{row}_c{col}.png"))
                    del img
                bar.update(1)
                if on_tile is not None:
                    on_tile(i + 1, len(tiles))

        os.makedirs(out_dir, exist_ok=True)
        with ProgressReporter(total=len(layer_names), label="assemble layers") as bar:
            for index, name in enumerate(layer_names):
                canvas = Image.new("RGBA", (n * px_per_tile, n * px_per_tile), (0, 0, 0, 0))
                for i in range(len(tiles)):
                    row, col = divmod(i, n)
                    tile_path = os.path.join(tmp_root, name, f"r{row}_c{col}.png")
                    tile_img = Image.open(tile_path)
                    canvas.paste(tile_img, (col * px_per_tile, row * px_per_tile))
                    tile_img.close()
                out_path = os.path.join(out_dir, f"{index:02d}-{name}.png")
                tmp_out = out_path + ".tmp"
                canvas.save(tmp_out, format="PNG")
                os.replace(tmp_out, out_path)
                del canvas
                bar.update(1)
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)


def write_layers_manifest(out_dir: str, frame: Frame, style: Style, n: int, px_per_tile: int,
                          supersample: int, grid_spacing_m: float, draw_grid: bool) -> str:
    """Writes out_dir/manifest.json (atomic tmp-then-replace, matching
    citymap/cache.py's Artifact.commit / citymap/tiles.py's _ensure_manifest
    -- this tool's own established convention for a sidecar written after
    every payload file is already on disk) and returns its path."""
    layer_names = [name for name in render_layers_module.LAYER_ORDER
                  if draw_grid or name not in ("grid-lines", "grid-labels")]
    total_px = n * px_per_tile
    manifest = {
        "frameId": frame.id,
        "styleId": style.id,
        "resolutionPx": [total_px, total_px],
        "tiles": n,
        "pxPerTile": px_per_tile,
        "supersample": supersample,
        "gridSpacingM": grid_spacing_m if draw_grid else None,
        "layers": [
            {
                "index": index,
                "file": f"{index:02d}-{name}.png",
                "blendMode": render_layers_module.LAYER_BLEND_HINTS[name],
                "note": render_layers_module.LAYER_NOTES.get(name),
            }
            for index, name in enumerate(layer_names)
        ],
        "attribution": {
            "openStreetMap": "(c) OpenStreetMap contributors, ODbL 1.0.",
            "gsiDem": "出典：国土地理院ウェブサイト (GSI elevation tiles).",
            "gsiEvacuation": external.ATTRIBUTION,
            "mlitZoning": external.ZONING_ATTRIBUTION,
        },
        "howToUse": "Stack files in ascending index order (00 at the bottom), each set to "
                   "the listed blendMode. Layers not generated here (paper grain/vignette, "
                   "road/place labels, cartouche, compass rose) are intentionally out of "
                   "scope -- see tools/city-map/README.md.",
    }
    path = os.path.join(out_dir, "manifest.json")
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    os.replace(tmp, path)
    return path


def main(argv=None) -> int:
    # Python block-buffers stdout whenever it isn't a live terminal (e.g.
    # redirected to a log file, or run under a supervising process) -- a
    # progress bar that only appears when the buffer happens to fill is not
    # a progress bar. Force line buffering unconditionally, since a "babysit
    # this render" CLI is exactly the case where output almost always ends
    # up redirected or captured by something other than an interactive shell.
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except AttributeError:  # pragma: no cover - only on very old Python
        pass

    args = parse_args(argv)
    t_start = time.perf_counter()

    frame = Frame.from_file(args.frame)
    style = Style.from_file(args.style)
    print(f"frame: {frame.id}  style: {style.id}  mode: {args.mode}")

    world, world_key_parts = resolve_world(frame)
    print(f"world: {len(world.features)} features")

    ops = []
    if args.ops:
        ops = load_ops(args.ops)
        print(f"replaying {len(ops)} operation(s) from {args.ops}")

        def on_step(i, total, op):
            print(f"  [{i + 1}/{total}] {op.op} ({op.id}) ... ", end="", flush=True)

        def on_step_done(i, total, op, report):
            print(f"done  {report}")

        t0 = time.perf_counter()
        world, results = replay_cache.resolve_replayed_world(
            world, ops, frame, style, DEM_CACHE_DIR, args.templates_dir, REPO_ROOT,
            world_key_parts, on_step=on_step, on_step_done=on_step_done, on_note=print)
        if results is None:
            print(f"replayed-world cache hit -- skipped all {len(ops)} op(s) "
                 f"({time.perf_counter() - t0:.1f}s)")
        else:
            print(f"replay finished in {time.perf_counter() - t0:.1f}s")

    fields = resolve_fields(world, world_key_parts, frame, style, ops=ops)

    if args.mode == "preview":
        if args.lon is None or args.lat is None:
            print("error: --mode preview requires --lon and --lat", file=sys.stderr)
            return 2
        if not args.out:
            print("error: --mode preview requires --out", file=sys.stderr)
            return 2
        tile = frame.window_tile(args.lon, args.lat, args.extent_m, args.mpp, args.supersample)
        with StageTimer(f"rendering preview ({args.extent_m:.0f}m @ {args.mpp}m/px)"):
            img = render_module.render_tile(fields, style, tile)

    elif args.mode == "overview":
        if not args.out:
            print("error: --mode overview requires --out", file=sys.stderr)
            return 2
        tile = frame.full_tile(px=args.overview_px, supersample=args.supersample)
        with StageTimer(f"rendering overview ({args.overview_px}px)"):
            img = render_module.render_tile(fields, style, tile)

    elif args.mode == "layers":
        if not args.out_dir:
            print("error: --mode layers requires --out-dir", file=sys.stderr)
            return 2
        n, px = args.tiles, args.px_per_tile
        total_px = n * px
        window = None
        draw_grid = not args.no_grid
        n_layers = len(render_layers_module.LAYER_ORDER) - (0 if draw_grid else 2)
        if args.lon is not None and args.lat is not None:
            window = (args.lon, args.lat, args.extent_m)
            print(f"exporting {n_layers} layer(s) as {n}x{n} tiles at {px}px each over a "
                 f"{args.extent_m:.0f}m crop centred at ({args.lon}, {args.lat}) "
                 f"-> {total_px}x{total_px} per layer")
        else:
            print(f"exporting {n_layers} layer(s) as {n}x{n} tiles at {px}px each "
                 f"-> {total_px}x{total_px} per layer")
        evacuation_sites = None
        zoning = None
        if not args.no_external:
            with StageTimer("loading GSI designated evacuation sites"):
                raw = external.load_evacuation_sites(EXTERNAL_CACHE_DIR)
                evacuation_sites = external.sites_to_map_space(raw, frame)
            print(f"  {len(evacuation_sites)} designated evacuation site(s) inside the frame "
                 f"(of {len(raw)} fetched)")
            with StageTimer("loading MLIT land-use zoning"):
                zoning = external.load_zoning(EXTERNAL_CACHE_DIR, frame)
            print(f"  {len(zoning)} zoning polygon(s) inside the frame")
        render_layers_full(fields, style, frame, n, px, args.supersample, args.out_dir,
                           grid_spacing_m=args.grid_spacing_m, draw_grid=draw_grid, window=window,
                           evacuation_sites=evacuation_sites, zoning=zoning)
        with StageTimer("writing manifest.json"):
            manifest_path = write_layers_manifest(args.out_dir, frame, style, n, px, args.supersample,
                                                  args.grid_spacing_m, draw_grid)
        print(f"\ndone. {n_layers} layer(s) + {manifest_path} written to {args.out_dir} "
             f"in {time.perf_counter() - t_start:.1f}s total")
        return 0

    else:  # full
        if not args.out:
            print("error: --mode full requires --out", file=sys.stderr)
            return 2
        n, px = args.tiles, args.px_per_tile
        total_px = n * px
        window = None
        if args.lon is not None and args.lat is not None:
            window = (args.lon, args.lat, args.extent_m)
            print(f"exporting {n}x{n} tiles at {px}px each over a {args.extent_m:.0f}m crop "
                 f"centred at ({args.lon}, {args.lat}) -> {total_px}x{total_px} final image")
        else:
            print(f"exporting {n}x{n} tiles at {px}px each -> {total_px}x{total_px} final image")
        img = render_full(fields, style, frame, n, px, args.supersample, window=window)

    with StageTimer(f"saving {args.out}"):
        img.save(args.out)

    size_mb = os.path.getsize(args.out) / 1e6
    print(f"\ndone. {args.out} ({img.size[0]}x{img.size[1]}, {size_mb:.1f} MB) "
         f"in {time.perf_counter() - t_start:.1f}s total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
