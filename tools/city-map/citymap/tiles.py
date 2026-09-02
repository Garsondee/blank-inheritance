"""The live raster tile pyramid: XYZ<->frame map-space math, a disk cache,
and precise bbox-scoped invalidation -- the map-editor plan's Phase 2.

**The picture is always real `render_tile` output**, at every zoom, never a
second/lighter-weight preview path -- the same discipline `frame.py`'s own
module docstring states for tiles in general ("there is deliberately no
separate 'preview renderer'"). This module only adds tiling math and a
cache on top of the existing, unchanged render pipeline.

**Why the cache key does NOT include world_version, despite tying the tile
cache to "what it depends on" the way every other cache artifact in this
codebase does (see cache.py's own docstring on verify-on-load).** A cache
key built from a single monotonic `meta.world_version` counter would
invalidate on ANY store write, anywhere -- so editing one building's vertex
would blank the entire tile cache for the whole 12km frame, forcing every
other tile to re-render on next view even though nothing about it changed.
That defeats live editing's actual latency goal. Instead: the cache key is
`frame + style` config only (stable across ordinary edits), and
`invalidate_tiles_for_bbox` deletes just the specific cached tile files
whose bounds overlap an edit's bbox (expanded by the same
LOCAL_FEATURE_MARGIN_M the renderer itself uses for shadow reach) -- so a
small edit costs a small, precise re-render, and everything else stays
warm. This is the literal meaning of "bbox-precise invalidation": precision
comes from targeted deletion, not from a key that changes on every write.
"""

from __future__ import annotations

import json
import math
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Tuple

from . import cache
from .fields import Fields
from .frame import Frame, Tile
from .render import render_tile
from .style import Style

STAGE_CODE_VERSION = 1

# tile_count(10) = 1024 tiles/side; comfortably past any zoom a 12km frame
# needs (at z10 a tile is ~11.7m across -- finer than a building footprint).
# A hard ceiling, not a tuned default, so a malformed request can't ask for
# an absurd tile count. Lives here (not api/main.py, which only consumes
# it) so any module that needs it -- the tile route AND api/edits.py's
# live tile invalidation after a write -- imports one shared constant
# instead of api/edits.py importing api/main, which would be circular
# (main.py already imports api/edits.py to register its router).
MAX_ZOOM = 10


class TileError(Exception):
    pass


# --- XYZ <-> frame map-space -------------------------------------------------

def tile_count(z: int) -> int:
    """2^z tiles per side at zoom z -- z=0 is the whole frame in one tile."""
    if z < 0:
        raise TileError(f"zoom must be >= 0, got {z}")
    return 2 ** z


def tile_bounds_map(frame: Frame, z: int, x: int, y: int) -> Tuple[float, float, float, float]:
    """(minx, miny, maxx, maxy) in MAP space for tile (z, x, y), x/y in
    [0, 2^z). y=0 is the NORTHERNMOST row -- matches frame.py's own
    grid_tiles() convention (row 0 = top of page = max map-space y) and the
    standard XYZ slippy-map scheme, so a generic tile client's default axis
    assumption is not silently backwards from this server's."""
    n = tile_count(z)
    if not (0 <= x < n):
        raise TileError(f"x={x} out of range for zoom {z} (valid: 0..{n - 1})")
    if not (0 <= y < n):
        raise TileError(f"y={y} out of range for zoom {z} (valid: 0..{n - 1})")
    te = frame.extent_m / n
    ox, oy = frame.origin  # south-west corner of the page
    minx = ox + x * te
    miny = oy + (n - 1 - y) * te
    return minx, miny, minx + te, miny + te


def tile_for_xyz(frame: Frame, z: int, x: int, y: int, px: int, supersample: int = 1) -> Tile:
    """The real Tile for (z, x, y) -- the same Tile class, and the same
    render_tile() call, every other render in this codebase already uses.
    There is no second, tile-server-specific rendering path."""
    minx, miny, maxx, maxy = tile_bounds_map(frame, z, x, y)
    return Tile(frame, minx, miny, maxx - minx, px, supersample)


def xyz_for_map_point(frame: Frame, z: int, mx: float, my: float) -> Tuple[int, int]:
    """Which (x, y) tile at zoom z contains map-space point (mx, my).
    Clamped to the valid range -- a point exactly on the frame's edge (a
    real float-precision case, not just a hypothetical) must not raise."""
    n = tile_count(z)
    te = frame.extent_m / n
    ox, oy = frame.origin
    x = int((mx - ox) // te)
    y = n - 1 - int((my - oy) // te)
    return max(0, min(n - 1, x)), max(0, min(n - 1, y))


def tiles_overlapping_bbox(frame: Frame, z: int, minx: float, miny: float,
                          maxx: float, maxy: float) -> List[Tuple[int, int]]:
    """Every (x, y) tile at zoom z with POSITIVE-AREA overlap against the
    given map-space bbox -- a query box whose edge merely touches a tile's
    edge (zero-width intersection, e.g. the query box IS exactly one
    tile's own bounds) must not pull in that neighbour too.

    Deliberately NOT corner-point sampling through xyz_for_map_point: that
    approach (tried first) classifies each of the four corners into
    whichever tile contains that exact POINT, and a point exactly on a
    shared edge belongs to only one of the two tiles it touches (a correct,
    necessary property of xyz_for_map_point itself, used for "which tile
    contains this point"). But it means a query box that exactly equals one
    tile's bounds has its far corner classified into the NEXT tile over,
    over-including a neighbour with zero real overlap -- confirmed as a
    real bug via test_only_overlapping_tiles_are_deleted expecting exactly
    1 deletion and getting 2. Interval math (floor/ceil on each axis) gives
    the true positive-area-overlap set directly, with no such edge case.
    """
    n = tile_count(z)
    if maxx <= minx or maxy <= miny:
        return []
    te = frame.extent_m / n
    ox, oy = frame.origin

    x_lo = max(0, int(math.floor((minx - ox) / te)))
    x_hi = min(n - 1, int(math.ceil((maxx - ox) / te)) - 1)
    if x_hi < x_lo:
        return []

    # y is flipped relative to map-space (y=0 = north = largest map-y).
    # Solve in "row from south" terms first (same shape as the x-axis: row
    # r spans map-y [oy + r*te, oy + (r+1)*te)), then flip row -> y.
    row_lo = max(0, int(math.floor((miny - oy) / te)))
    row_hi = min(n - 1, int(math.ceil((maxy - oy) / te)) - 1)
    if row_hi < row_lo:
        return []
    y_lo, y_hi = n - 1 - row_hi, n - 1 - row_lo

    return [(x, y) for y in range(y_lo, y_hi + 1) for x in range(x_lo, x_hi + 1)]


# --- disk cache ---------------------------------------------------------------

def cache_key_parts(frame: Frame, style: Style) -> dict:
    """What a cached tile actually depends on -- frame config and the full
    style sheet (any style edit, including art-direction tuning, must
    invalidate). Deliberately NOT world_version -- see module docstring."""
    return {"frame": frame.cache_key_parts(), "style": style._raw,
           "tilesStageVersion": STAGE_CODE_VERSION}


def _key_dir(tiles_root: str, frame: Frame, style: Style) -> str:
    return os.path.join(tiles_root, cache.cache_key(cache_key_parts(frame, style)))


def _tile_path(key_dir: str, z: int, x: int, y: int, px: int, supersample: int = 1) -> str:
    """`px`/`supersample` are part of the cache identity, not just the
    render call -- a real, previously-undiscovered bug (2026-08-25) had
    them absent from this path entirely, so a tile ALREADY cached at one
    resolution (e.g. the always-on 2048px backdrop) was served back
    UNCHANGED for a request at any other resolution (e.g. an on-demand
    higher-quality render) -- the second request never actually rendered
    anything, it just silently got the old file back. Encoded as a
    filename suffix, not a subdirectory, to keep `invalidate_all_tiles`'s
    existing "delete every *.png under this z dir" sweep correct with zero
    changes; `invalidate_tiles_for_bbox` glob-matches every resolution of a
    given (x, y) instead of one exact name for the same reason."""
    return os.path.join(key_dir, str(z), f"{x}_{y}_{px}_{supersample}.png")


def _ensure_manifest(key_dir: str, key_parts: dict) -> None:
    """Write-once verification sidecar, matching cache.py's own "verify on
    load, not just on write" discipline: an under-keyed or colliding cache
    must fail loudly, never silently serve a tile from the wrong frame."""
    manifest_path = os.path.join(key_dir, "manifest.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as fh:
            stored = json.load(fh)
        if stored != key_parts:
            raise TileError(
                f"tile cache key collision or corruption at {key_dir}: "
                f"stored config does not match the requested one.\n"
                f"  requested: {cache.canonical_json(key_parts)}\n"
                f"  stored:    {cache.canonical_json(stored)}")
        return
    os.makedirs(key_dir, exist_ok=True)
    tmp = manifest_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(cache.canonical_json(key_parts))
    os.replace(tmp, manifest_path)


def get_cached_tile_path(tiles_root: str, frame: Frame, style: Style,
                         z: int, x: int, y: int, px: int, supersample: int = 1) -> Optional[str]:
    """The tile's on-disk path if already cached AT THIS EXACT RESOLUTION,
    else None. Does not render -- callers check this first, then fall back
    to render_and_cache_tile on a miss (the split exists so a server can
    distinguish a cache hit, served instantly, from a miss that needs the
    real render cost)."""
    key_dir = _key_dir(tiles_root, frame, style)
    path = _tile_path(key_dir, z, x, y, px, supersample)
    return path if os.path.exists(path) else None


def render_and_cache_tile(tiles_root: str, frame: Frame, style: Style, fields: Fields,
                          z: int, x: int, y: int, px: int = 256, supersample: int = 1) -> str:
    """Render tile (z, x, y) via the real render_tile() and cache it to
    disk. Returns the cached file's path. `fields` is the caller's
    responsibility to resolve/cache (same L2 Fields any other render in this
    codebase uses) -- this function is purely the tiling+caching layer on
    top, so a caller serving many tiles for one frame session builds Fields
    once and passes it to every call here."""
    key_dir = _key_dir(tiles_root, frame, style)
    _ensure_manifest(key_dir, cache_key_parts(frame, style))
    tile = tile_for_xyz(frame, z, x, y, px, supersample)
    img = render_tile(fields, style, tile)
    path = _tile_path(key_dir, z, x, y, px, supersample)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    img.save(tmp, format="PNG")
    os.replace(tmp, path)
    return path


def invalidate_tiles_for_bbox(tiles_root: str, frame: Frame, style: Style,
                              minx: float, miny: float, maxx: float, maxy: float,
                              margin_m: float, max_zoom: int) -> int:
    """Delete every currently-cached tile file, at every zoom from 0 to
    max_zoom, whose bounds overlap the given map-space bbox (expanded by
    margin_m -- pass LOCAL_FEATURE_MARGIN_M's value so an edit's cast
    shadow, which can extend past its own footprint, is covered too).
    Returns the number of files actually deleted -- 0 is a normal, common
    result (most edits don't touch most zoom levels' worth of tiles), not
    an error.

    Only ever deletes files; never creates or renders. A deleted tile is
    simply a cache miss on next request, regenerated normally by
    render_and_cache_tile.
    """
    key_dir = _key_dir(tiles_root, frame, style)
    if not os.path.isdir(key_dir):
        return 0
    exp_minx, exp_miny = minx - margin_m, miny - margin_m
    exp_maxx, exp_maxy = maxx + margin_m, maxy + margin_m
    deleted = 0
    for z in range(0, max_zoom + 1):
        z_dir = os.path.join(key_dir, str(z))
        if not os.path.isdir(z_dir):
            continue
        for x, y in tiles_overlapping_bbox(frame, z, exp_minx, exp_miny, exp_maxx, exp_maxy):
            # A prefix match, not one exact filename: the same (x, y) tile
            # may be cached at several different px/supersample
            # combinations (see _tile_path's own docstring) -- every one of
            # them is stale once this bbox's content changes, not just
            # whichever resolution happened to be requested last.
            prefix = f"{x}_{y}_"
            for name in os.listdir(z_dir):
                if name.startswith(prefix) and name.endswith(".png"):
                    os.remove(os.path.join(z_dir, name))
                    deleted += 1
    return deleted


def invalidate_all_tiles(tiles_root: str, frame: Frame, style: Style, max_zoom: int) -> int:
    """Delete EVERY currently-cached tile file for this frame+style, at
    every zoom from 0 to max_zoom -- the correct (if blunt) invalidation
    for a live edit whose visual effect isn't bounded to its own bbox.

    A terrain edit is exactly that case: terrain.horizon_shadow (see that
    module's own docstring) is a genuinely GLOBAL sweep -- a distant ridge
    can throw real cast shadow up to ~2.8km away at this frame's default
    sun angle -- so invalidate_tiles_for_bbox's bbox+margin approach (right
    for a single feature's cast shadow, which reaches at most
    LOCAL_FEATURE_MARGIN_M) would under-invalidate here: a hillside tile
    far from the edit itself could still need to redraw with a new shadow
    on it. This trades a slower next-full-map-view (every tile is a cache
    miss once) for actual correctness, a deliberate, documented choice --
    not a missed optimisation to later replace with a tighter bbox.

    Returns the number of files actually deleted -- 0 if nothing was
    cached yet, not an error.
    """
    key_dir = _key_dir(tiles_root, frame, style)
    if not os.path.isdir(key_dir):
        return 0
    deleted = 0
    for z in range(0, max_zoom + 1):
        z_dir = os.path.join(key_dir, str(z))
        if not os.path.isdir(z_dir):
            continue
        for name in os.listdir(z_dir):
            if name.endswith(".png"):
                os.remove(os.path.join(z_dir, name))
                deleted += 1
    return deleted


# --- bounded, deduplicating live rendering ------------------------------------

class TileRenderer:
    """Bounded-concurrency, in-flight-deduplicating tile serving on top of
    render_and_cache_tile -- what a live FastAPI endpoint calls.

    **A ThreadPoolExecutor, not a ProcessPoolExecutor, deliberately, for
    now.** render_tile is CPU-bound, so a process pool is the textbook
    answer -- but Fields (the DEM array, hillshade, and every clipped
    Feature for the whole frame, several MB) would need pickling to every
    worker on every submitted task unless each worker keeps its own
    persistent copy via a process initializer, which is real, fiddly
    machinery and doubly so on Windows (spawn-based multiprocessing, not
    fork -- no shared memory to lean on). Measured instead (Phase 2 spike,
    real Kurose data, post-STRtree-fix): ~88ms per 256px tile once Fields
    is built -- already comfortably inside a ~150-200ms live-tile budget
    with NO concurrency at all. A thread pool still helps under real
    concurrent load, because numpy/PIL release the GIL during their C-level
    array work, giving real (if imperfect) parallelism. If profiling ever
    shows genuine GIL contention, the documented upgrade is a
    ProcessPoolExecutor with a per-worker Fields-building initializer -- a
    deliberately deferred cost, not a corner cut.

    **In-flight dedup** matters independently of thread-vs-process: a pan
    gesture can fire the same (z,x,y) request twice (a client retry racing
    the original, e.g.) before either completes. Without dedup, both would
    render the same tile from scratch; with it, the second caller waits on
    the first's in-progress Future and gets the same result for free.
    """

    def __init__(self, tiles_root: str, max_workers: int = 4):
        self.tiles_root = tiles_root
        self.max_workers = max_workers
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._lock = threading.Lock()
        self._in_flight: dict = {}  # (frameId, styleId, z, x, y, px, supersample) -> Future

    def get_tile(self, frame: Frame, style: Style, fields: Fields,
                z: int, x: int, y: int, px: int = 256, supersample: int = 1) -> str:
        """The tile's on-disk path -- from cache if already there, else a
        real render, deduplicated against any identical request already in
        flight. Raises TileError for an out-of-range (z, x, y) (propagated
        from tile_bounds_map via render_and_cache_tile)."""
        cached = get_cached_tile_path(self.tiles_root, frame, style, z, x, y, px, supersample)
        if cached is not None:
            return cached

        key = (frame.id, style.id, z, x, y, px, supersample)
        with self._lock:
            future = self._in_flight.get(key)
            is_new = future is None
            if is_new:
                future = self._executor.submit(
                    render_and_cache_tile, self.tiles_root, frame, style, fields,
                    z, x, y, px, supersample)
                self._in_flight[key] = future
        try:
            return future.result()
        finally:
            if is_new:
                with self._lock:
                    if self._in_flight.get(key) is future:
                        del self._in_flight[key]

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait)
