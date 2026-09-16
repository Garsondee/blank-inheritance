# city-map

Real-data city rendering: OpenStreetMap + GSI Japan DEM in, a styled raster map
out. This is the Python implementation of `design/map-generation.md`'s
pipeline (stages A-D and F: acquire, normalise, name/style, render). It does
**not** replace `tools/map-generator/` (the Node/JS procedural terrain tool) --
that keeps its role for amplification and offshore bathymetry per that design
doc's §9. The two are independent; neither imports the other.

Rescued 2026-08-24 out of a session scratchpad (`spike8.py`, eight iterative
checkpoints built directly against real Kobe/Kurose data) into this tested,
modular form. `_spike8_reference.py` is the last checkpoint, kept only as the
source of truth for page-furniture drawing code (labels, cartouche, compass
rose, paper texture) not yet ported -- see its own header. Everything else in
it is superseded; several real bugs found in it are fixed here, each with a
regression test (see individual module docstrings for the full story):
concave building shadows, the sea polygon's hole-topology bug, golden-hour
tint/brightness coupling, a terrain-vs-building shadow direction mismatch, an
Overpass relation query with no size sanity check reconstructing Honshu
itself, and a NaN-elevation fill strategy that manufactured phantom shadows
across the open sea.

## Layout

```
render.py        THE CLI -- preview a window, an overview, or the full 3x3
                   export, with progress bars and time estimates. See
                   "Running the CLI" below; this is the button a person runs
                   and babysits, not something meant to be scripted around.
citymap/
  ids.py          Stable, deterministic feature ids (cross-language contract
                   with foundry/blank-inheritance/scripts/core/ids.mjs)
  frame.py        Frame (a map's centre/rotation/extent/CRS) and Tile (a
                   renderable rectangle of one) -- the coordinate model
  style.py        Style-as-data loader; enforces metres-not-pixels
  acquire.py      Overpass + GSI DEM fetch, both file-cached
  parse.py        Overpass JSON -> Feature list + road graph; multipolygon
                   relation reconstruction
  sea.py          Sea/land classification and the sea-polygon carve-out
  geometry.py     Pure geometry helpers (concave shadow sweep, ring iteration)
  terrain.py      Hillshade, cast shadow, colour grading
  contour.py      Marching-squares contour extraction
  cache.py        WKB+npy artifact serialisation and cache-key verification
  progress.py     Dependency-free progress bar + stage timer for the CLI
  world.py        L1: parsed world model (source CRS, rotation-independent)
                   PLUS the op-log's TerrainEdit record type, cached
  fields.py       L2: per-frame rotated/clipped features + terrain fields
                   (incl. applying TerrainEdits to the DEM -- see
                   apply_terrain_edits), cached
  draw.py         Raster drawing primitives (hole-aware fill, stroked rings)
  render.py       render_tile(fields, style, tile) -- the one drawing entry
                   point; preview, tile export and composition checks are all
                   the same call at different tile sizes. NOT the CLI (that's
                   the top-level render.py above) -- this is the library
                   function it calls.
  external.py     Non-OSM geo-referenced sources, projected into map space:
                   GSI's designated evacuation sites (指定緊急避難場所,
                   GeoJSON per municipality, carrying the eight legal hazard
                   categories) and MLIT 国土数値情報 A29 land-use zoning
                   (用途地域 + 建蔽率/容積率). Separate from acquire.py on
                   purpose -- these are drawn but never routed over, never
                   clipped against and never part of a cache key. Each source
                   carries its own licence/attribution string; see the module
                   docstring, and note the GSI condition that travels
                   downstream (designation is per hazard type, the data may
                   not be current, and it is not authoritative guidance).
  render_layers.py  The layered-export sibling of render.py -- never edits
                   or is edited by that file. iter_tile_layers(fields, style,
                   tile) yields render_tile's same visual elements as SEPARATE
                   transparent RGBA images (buildings, roads, the three
                   different "shadow" concepts kept apart, a new reference
                   grid + coordinate-label overlay, etc.) instead of one
                   flattened picture -- for hand-painting/finishing the map in
                   an image editor rather than fighting the code for the
                   final look. See its own module docstring for the two
                   layers with a deliberate, documented fidelity
                   approximation, and why iter_tile_layers is a generator
                   (memory), not a dict.
  ops/
    log.py         Operation dataclass, load/save the operation-log JSON
    demolish.py     Remove content cleanly: graph-cascade road pruning so a
                     demolish never leaves a road heading into empty space;
                     `leaveLanduse` (cleared land stays land, tinted) and
                     `returnToSea` (the ocean reclaims it -- unions the area
                     into World.sea) are alternative, mutually exclusive
                     outcomes for what the ground becomes.
    construct.py    Place a parametric template: routes an access road with
                     router.py, benches a level platform into the slope
                     (builds UP to the max elevation sampled at the site,
                     not down to the min -- see the module docstring for
                     why), and flags (never silently ignores) a footprint
                     that lands on a building, road, railway or water body.
    router.py       Curvature-hard-constrained state-lattice A* for the
                     access road -- see its own docstring for why a plain
                     cost-surface router cannot produce real switchbacks.
    replay.py       Dispatch a whole operation log against a World in order
                     -- the CLI's --ops path, and what --mode full applies
                     before rendering.
cache/             gitignored, matches reference/ artwork/ audio/'s bulk-tree
                   pattern. source/ (L0, raw Overpass+DEM), world/ (L1),
                   frame/ (L2)
```

## Status

**Structural core, the operation log, and the CLI are all built and tested**
(300+ Python tests, `test/city-map/`): parsing, sea classification, terrain,
tiled rendering, road-graph-aware demolition, parametric-template
construction with real access-road routing and terrain benching, and a
progress-reporting CLI all work end-to-end against real data.

**Not yet built**: offshore construction (sea forts -- reclaiming land in
open water and routing a causeway instead of a road; see
`ideas/entries/offshore-construction.json` for the plan), the grammar module
(§5 -- road classes currently use fixed defaults, not the city's own measured
statistics), and the page-furniture pass (paper texture, labels, cartouche,
compass rose -- still only in `_spike8_reference.py`).

## Running the CLI

```bash
# a fast preview window
python render.py --mode preview --lon 135.205 --lat 34.678 --extent-m 1000 --out preview.png

# the whole frame at a modest single-tile resolution (a composition check)
python render.py --mode overview --out overview.png

# the full 3x3 production export, base world only
python render.py --mode full --out full.png

# the full export with the operation log replayed first (Kobe Airport
# reclaimed by the sea, the mech bunker constructed) -- what the delivered
# map actually is
python render.py --mode full --ops ../../data/map/operations/kurose.json --out full-with-ops.png

# every visual element as its own transparent PNG (citymap/render_layers.py)
# plus a reference grid + manifest.json, instead of one flattened image
python render.py --mode layers --out-dir ../../export/layers --tiles 3 --px-per-tile 2048
```

As of 2026-09-11 that export is **25 layers**, not just the physical map:
alongside terrain/sea/roads/buildings/shadows it carries `zoning`,
`barriers`, `power` (lines, pylons, substations -- in red), `structures`
(silos, tanks, cranes, piers), `historic`, `services` (glyph-coded by kind),
`evacuation` (official GSI designated sites, in signage green) and
`neighbourhoods` (place-name labels, Japanese over romanised, collision-
avoided across the whole frame so nothing tears at a tile seam).

Most of that arrived by **widening the Overpass query**, not by finding new
data: the query used to ask for nine tag families and silently discarded
every tagged OSM *node*, which threw away the entire POI layer. Widening it
took the world from 236k to 257k features. Note that the query string is part
of the world cache key, so changing it forces a full refetch and rebuild --
about two minutes here, but not free.

`--no-external` skips the non-OSM sources (useful offline; they are fetched
once and cached under `cache/source/external/`).

`--mode layers` shares every resolution/crop flag `--mode full` has
(`--tiles`/`--px-per-tile`/`--supersample`/`--lon`/`--lat`/`--extent-m`) --
it tiles and assembles exactly the same way, just once per layer instead of
once overall, so it scales to the same resolution ceiling regardless of how
many layers there are (see render_layers_full's own docstring in the CLI
file for the two-phase assembly this relies on). `--grid-spacing-m`
(ground metres) and `--no-grid` control the new reference-grid overlay.

Frame/style default to the real Kurose files under `data/map/`; both cache
the World (L1) and Fields (L2) layers the same way a plain library call
would, so a second run is fast. `--help` lists every mode's options
(`--px-per-tile`, `--tiles`, `--mpp`, etc.). Progress bars and per-stage
timing print throughout -- this is meant to be run in a real terminal and
watched, not silently backgrounded.

## Running the tests

```bash
python -m unittest discover -s test/city-map -t test/city-map
```

Stdlib only. A handful of tests use real cached Overpass/DEM data if
available (from a prior render session) and skip loudly, not silently, when
it isn't -- per `design/testing-strategy.md` rule 5.

## Data flow

```
Frame (config)  -->  acquire.fetch_overpass  -->  parse.parse_elements  -->  sea.build_sea_polygon
                                                          |
                                                          v
                                                  world.World  (L1, cached, rotation-independent)
                                                          |
                                     ops.replay.replay_ops(world, operation-log.json)
                                              (demolish / construct, in order)
                                                          |
                                                          v
                                             world.World  (edited: features, road graph,
                                                            sea polygon, terrain_edits)
                                                          |
              fields.rotate_and_clip + acquire.dem_grid_for_frame + fields.apply_terrain_edits
                                          + terrain.shade_rgb
                                                          |
                                                          v
                                                 fields.Fields  (L2, cached, per-frame)
                                                          |
                                        render.render_tile(fields, style, tile)
                                                          |
                                                          v
                                                     a PIL Image
```
