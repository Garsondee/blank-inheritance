# -*- coding: utf-8 -*-
"""Local map editor + render control panel.

    python tools/city-map/editor/server.py
    -> open http://localhost:8765

A UI layer over the EXISTING render pipeline (render.py, citymap/*), not a
second implementation of it: world/fields resolution, the op-log replay
cache, and render_tile/render_full are all called directly, the same
functions the CLI uses. Two jobs:

1. Show the current map as a real RENDERED IMAGE (not a live vector layer)
   so the user can draw arbitrary polygons for new construction (land or
   sea), removals, and road sketches, then submit all of it as one JSON
   file for later processing into real ops (see editor/siting.py and the
   workflow note in data/map/editor-submissions/README, not automated -- a
   human read of the submission is still part of turning "a shape the user
   drew" into "a real template placement"). This replaced an earlier
   version that served buildings/roads/etc as live GeoJSON queried from a
   ~230k-feature spatial index -- reliable in principle, but a real user
   session hit a wall of edge cases around it (zoom-dependent truncation
   producing an apparently-arbitrary sparse render being the worst one) and
   asked directly for a rendered raster background instead. A static image
   has none of those failure modes: there is no query, no cap, no LOD.
2. Trigger a real render at whatever resolution the user wants and stream
   real progress back over Server-Sent Events, instead of the user waiting
   on an AI narrating background-task output.
3. Tool 1 (the Design tab): draw a rough perimeter, get a real fast preview
   (design_preview.py, ~1s per render against the real map -- see
   render.py's LOCAL_FEATURE_MARGIN_M and _crop_elevation_for_tile) of a
   procedurally-generated Fort Wall (procgen/star_fort.py: the perimeter
   bastioned into a stubby star-fort trace, extruded into a real wall,
   broken up by strengthening pylons), with live parameter control and a
   save-as-template step once it looks right. This replaced an earlier
   approach where I (the AI) tried to hand-design whole compounds blind,
   coordinate by coordinate, with no preview until the final expensive
   render -- the user asked directly for a real tool they drive themselves
   instead.

stdlib only (http.server), matching this project's zero-new-dependency
philosophy (requirements.txt, the `node --test` choice) -- see the plan
this was built from for why that was worth confirming explicitly rather
than reaching for Flask.
"""

from __future__ import annotations

import glob
import json
import math
import os
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CITYMAP_TOOL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, CITYMAP_TOOL_DIR)

import render as render_cli  # noqa: E402
from citymap import render as render_module  # noqa: E402
from citymap.editor import design_preview  # noqa: E402
from citymap.editor.procgen import star_fort  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops import construct as construct_module  # noqa: E402
from citymap.ops import replay_cache  # noqa: E402
from citymap.ops.construct import Template, TemplatePart  # noqa: E402
from citymap.ops.log import Operation, load_ops, save_ops  # noqa: E402
from citymap.style import Style  # noqa: E402

HOST = "127.0.0.1"
PORT = 8765

# The base map's tile grid -- see resolve_base_map. 9216x9216px total, tiled
# (not one giant canvas) for the same memory reasoning as render_full/Frame's
# module docstring. Rendered once and cached; only re-rendered when the ops
# log actually changes (base_map_cache_key), not on every server restart.
BASE_MAP_TILES = 3
BASE_MAP_PX_PER_TILE = 3072
BASE_MAP_SUPERSAMPLE = 1

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
RENDERS_DIR = os.path.join(os.path.dirname(__file__), "renders")
DESIGN_DIR = os.path.join(os.path.dirname(__file__), "renders", "design")
SUBMISSIONS_DIR = os.path.join(render_cli.REPO_ROOT, "data", "map", "editor-submissions")
TEMPLATES_DIR = render_cli.DEFAULT_TEMPLATES_DIR
DEFAULT_OPS_PATH = os.path.join(render_cli.REPO_ROOT, "data", "map", "operations", "kurose.json")

os.makedirs(RENDERS_DIR, exist_ok=True)
os.makedirs(DESIGN_DIR, exist_ok=True)
os.makedirs(SUBMISSIONS_DIR, exist_ok=True)


# --- base-map raster background ---------------------------------------------

def unrotated_frame(frame: Frame) -> Frame:
    """Same city, same extent, same CRS -- rotation zeroed.

    Used only for the editor's raster background. A browser's image-overlay
    primitive needs a plain axis-aligned lon/lat box, which the REAL,
    art-directed frame doesn't have: it's rotated (kurose-12km is 31deg), so
    its rendered PNG's corners form a tilted quadrilateral in WGS84, not a
    rectangle. Zeroing rotation for this one purpose sidesteps that instead
    of pulling in an image-rotation plugin.

    The residual skew this leaves between the frame's SOURCE CRS axes and
    true WGS84 north/east (a Japan Plane Rectangular projection is not
    perfectly north-aligned) is well under a degree over a 12km extent --
    invisible for a drawing reference image, and irrelevant to the PRECISION
    of what gets drawn: the browser still reports real mouse lon/lat off its
    own projection, independent of how accurately the backdrop image lines
    up with it.
    """
    return Frame(id=frame.id + "-unrotated", center_lon=frame.center_lon, center_lat=frame.center_lat,
                rotation_deg=0.0, extent_m=frame.extent_m, crs_epsg=frame.crs_epsg,
                dem_grid=frame.dem_grid, dem_zoom=frame.dem_zoom, dem_source=frame.dem_source,
                light_azimuth_deg=frame.light_azimuth_deg, light_altitude_deg=frame.light_altitude_deg)


def base_map_cache_key(frame: Frame, ops, n: int, px_per_tile: int, supersample: int) -> dict:
    """What the cached base-map PNG actually depends on. Re-render only when
    one of these changes (an op got added, tile/resolution settings
    changed) -- not on every server restart, which would make every
    editor launch pay the several-minutes render cost this file exists to
    avoid paying more than once."""
    key = frame.cache_key_parts()
    key["opsHash"] = replay_cache.ops_hash(ops) if ops else None
    key["tiles"] = n
    key["pxPerTile"] = px_per_tile
    key["supersample"] = supersample
    return key


def resolve_base_map(frame, style, world, world_key_parts, ops, renders_dir,
                     n=BASE_MAP_TILES, px_per_tile=BASE_MAP_PX_PER_TILE,
                     supersample=BASE_MAP_SUPERSAMPLE, on_note=lambda m: None):
    """Render (or reuse a cached) unrotated base-map PNG for the editor's
    background. Returns (filename, bounds) where bounds is
    (south, west, north, east) in WGS84, matching frame.lonlat_bbox()."""
    unrotated = unrotated_frame(frame)
    key = base_map_cache_key(unrotated, ops, n, px_per_tile, supersample)
    png_path = os.path.join(renders_dir, "base-map.png")
    meta_path = os.path.join(renders_dir, "base-map.meta.json")
    if os.path.exists(png_path) and os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as fh:
            if json.load(fh) == key:
                on_note(f"base map cache hit ({png_path})")
                return "base-map.png", unrotated.lonlat_bbox()

    on_note("rendering base map -- first run only, cached after this...")
    t0 = time.perf_counter()
    fields = render_cli.resolve_fields(world, world_key_parts, unrotated, style, ops=ops, on_note=on_note)
    img = render_cli.render_full(fields, style, unrotated, n, px_per_tile, supersample)
    img.save(png_path)
    with open(meta_path, "w", encoding="utf-8") as fh:
        json.dump(key, fh)
    on_note(f"base map rendered in {time.perf_counter() - t0:.1f}s ({png_path})")
    return "base-map.png", unrotated.lonlat_bbox()


# --- state, resolved once at startup ---------------------------------------

# --- Tool 1: Fort Wall design tool ------------------------------------------

# Request payload key -> star_fort.fort_wall keyword argument. Only keys
# present in the request are overridden; fort_wall's own defaults cover the
# rest, so the frontend never needs to send every parameter on every call.
FORT_WALL_PARAM_MAP = {
    "wallThicknessM": "wall_thickness_m", "wallHeightM": "wall_height_m",
    "bastionDepthM": "bastion_depth_m", "flankFraction": "flank_fraction",
    "pylonSpacingM": "pylon_spacing_m", "pylonRadiusM": "pylon_radius_m",
    "pylonHeightM": "pylon_height_m",
}


def _fort_wall_parts_and_anchor(payload: dict):
    """Shared by both /api/design/fort-wall (preview) and
    /api/design/save-template (the finished output) -- both need the exact
    same parts for the exact same drawn polygon, so there is one place that
    turns a request payload into (parts, anchor_lonlat), not two that could
    silently drift apart."""
    polygon = payload["polygon"]  # [{"lon":,"lat":}, ...], >=3 points
    frame = STATE.frame
    points_map = [frame.lonlat_to_map(p["lon"], p["lat"]) for p in polygon]
    cx = sum(p[0] for p in points_map) / len(points_map)
    cy = sum(p[1] for p in points_map) / len(points_map)
    polygon_local = [(x - cx, y - cy) for x, y in points_map]

    kwargs = {}
    for req_key, kw in FORT_WALL_PARAM_MAP.items():
        if req_key in payload.get("params", {}):
            kwargs[kw] = float(payload["params"][req_key])
    parts = star_fort.fort_wall(polygon_local, **kwargs)
    anchor_lonlat = frame.map_to_lonlat(cx, cy)
    return parts, anchor_lonlat


# --- Scratchpad (multi-shape asset authoring + placement) -------------------

DEFAULT_LINE_THICKNESS_M = 2.0
DEFAULT_DEPTH_HEIGHT_M = 3.0


def shape_to_template_parts(shape: dict) -> list:
    """One ScratchpadDocument shape (see the plan this was built from) -> one
    or more real TemplateParts.

    A plain 'line' shape stays a line part -- schematic-only in the real
    renderer (render_tile's shadow/fill loops never touch a line part, only
    buildings), which is fine, that is genuinely how a fence/track already
    renders. A line with depthHint=True is the one exception: it gets
    materialized into a real thickness-offset AREA part instead, using
    star_fort.fort_wall's exact per-edge-offset technique (there: applied to
    a closed bastioned ring; here: applied directly to whatever open
    polyline the shape already is) -- a "wall you can see" needs a real
    footprint with real height, not just a styled line.

    EVERY area part gets a `building` tag force-injected if the caller didn't
    already set a `building`/`landuse`/`natural`/`leisure` tag -- not just
    ones with real height. render_tile's fill/outline/shadow loops all gate
    on `"building" in feature.tags` strictly, independent of height_m, and
    its landuse-tint pass is the ONLY other area-fill path, gated on those
    three other keys. A height=0 "apron/yard" shape (this tool's own
    structure-type list includes exactly that) with neither is just as
    invisible as a tall one -- confirmed this is a REAL, pre-existing trap,
    not a hypothetical: data/map/templates/sentinel-tower.json's own apron
    part is tagged only `aeroway=apron`, which matches none of the four keys
    render_tile actually checks, so it has been rendering as nothing since
    it was written. Fixed there separately; guarded against here so the
    Scratchpad can't reproduce it a fourth time. tags-not-mutated-in-place
    (a fresh dict) either way.
    """
    kind = shape.get("kind", "area")
    points = [tuple(float(v) for v in p) for p in shape["points"]]
    if len(points) < 2:
        raise ValueError("a shape needs at least 2 points")
    tags = dict(shape.get("tags") or {})
    height_m = float(shape.get("heightM", 0.0))
    RENDERABLE_AREA_KEYS = ("building", "landuse", "natural", "leisure")

    if kind == "area":
        if len(points) < 3:
            raise ValueError("an area shape needs at least 3 points")
        if not any(k in tags for k in RENDERABLE_AREA_KEYS):
            tags["building"] = tags.get("structureType") or "yes"
        return [TemplatePart(kind="area", tags=tags, height_m=height_m, footprint=points)]

    if kind != "line":
        raise ValueError(f"unknown shape kind {kind!r}")
    if not shape.get("depthHint"):
        return [TemplatePart(kind="line", tags=tags, height_m=0.0, footprint=points)]

    thickness_m = float(shape.get("thicknessM") or DEFAULT_LINE_THICKNESS_M)
    depth_height_m = height_m or DEFAULT_DEPTH_HEIGHT_M
    half = thickness_m / 2.0
    seg_tags = dict(tags)
    if "building" not in seg_tags:
        seg_tags["building"] = seg_tags.get("structureType") or "wall"
    parts = []
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy)
        if length < 1e-6:
            continue
        nx, ny = -dy / length, dx / length
        parts.append(TemplatePart(
            kind="area", tags=seg_tags, height_m=depth_height_m,
            footprint=[
                (x0 + nx * half, y0 + ny * half), (x1 + nx * half, y1 + ny * half),
                (x1 - nx * half, y1 - ny * half), (x0 - nx * half, y0 - ny * half),
            ],
        ))
    return parts


def document_to_parts(payload: dict) -> list:
    """A whole ScratchpadDocument's `shapes` -> a flat TemplatePart list.
    Raises ValueError/KeyError on anything malformed -- callers turn that
    into a 400, not a bare server error, per the plan's save-time-validation
    requirement (Template.from_dict itself only fails at NEXT REPLAY, not at
    save, so this is the one place that actually catches a bad shape early)."""
    shapes = payload.get("shapes")
    if not shapes:
        raise ValueError("a design needs at least one shape")
    parts = []
    for shape in shapes:
        parts.extend(shape_to_template_parts(shape))
    if not parts:
        raise ValueError("no renderable parts -- every shape was degenerate")
    return parts


class EditorState:
    """The current map, resolved once (L1 world + the full op log replayed
    through the L3 cache, plus the rendered base-map image) and kept in
    memory. Read-only from every request handler -- nothing here mutates
    after __init__, so no locking is needed for the GET endpoints;
    /api/render builds its own local Fields/images and never touches this
    object."""

    def __init__(self, frame_path: str, style_path: str, ops_path: str):
        self.frame = Frame.from_file(frame_path)
        self.style = Style.from_file(style_path)
        self.ops_path = ops_path

        print("resolving world...")
        self.world, self.world_key_parts = render_cli.resolve_world(self.frame)
        print(f"world: {len(self.world.features)} features")

        self.ops = load_ops(ops_path) if os.path.exists(ops_path) else []
        if self.ops:
            print(f"replaying {len(self.ops)} op(s) from {ops_path}...")
            t0 = time.perf_counter()
            self.world, results = replay_cache.resolve_replayed_world(
                self.world, self.ops, self.frame, self.style, render_cli.DEM_CACHE_DIR,
                render_cli.DEFAULT_TEMPLATES_DIR, render_cli.REPO_ROOT, self.world_key_parts,
                on_note=print)
            tag = "cache hit" if results is None else "replayed"
            print(f"{tag} in {time.perf_counter() - t0:.1f}s")

        self.base_map_file, self.base_map_bounds = resolve_base_map(
            self.frame, self.style, self.world, self.world_key_parts, self.ops, RENDERS_DIR, on_note=print)

        # Fields for the REAL (rotated) production frame -- resolve_base_map's
        # own fields are for the unrotated editor-background frame instead,
        # wrong CRS-alignment for design_preview's window_tile/lonlat_to_map
        # calls, which assume the real frame's own rotation. Cached on disk
        # like everything else here, so this is normally a fast reload, not
        # a fresh multi-minute build.
        print("resolving fields (for the fort-wall design tool)...")
        self.fields = render_cli.resolve_fields(
            self.world, self.world_key_parts, self.frame, self.style, ops=self.ops, on_note=print)


STATE: EditorState
# Guards STATE mutation only (currently just _handle_construct_op) -- every
# GET handler and the preview/check-placement POSTs stay read-only and need
# no lock, per EditorState's own docstring. A local single-user tool doesn't
# need much concurrency-hardening, but committing a placement now genuinely
# mutates STATE.world/ops/fields, so two overlapping commits (or a commit
# racing a read mid-mutation) is worth guarding against cheaply rather than
# not at all.
STATE_LOCK = threading.Lock()


# --- HTTP handler ------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # quieter default logging
        sys.stderr.write(f"[editor] {self.address_string()} {fmt % args}\n")

    # --- small response helpers ---
    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type):
        if not os.path.isfile(path):
            self._send_json({"error": f"not found: {path}"}, status=404)
            return
        with open(path, "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    # --- routing ---
    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/":
            self._send_file(os.path.join(STATIC_DIR, "index.html"), "text/html; charset=utf-8")
        elif path.startswith("/static/"):
            self._serve_static(path[len("/static/"):])
        elif path == "/api/base-map":
            self._handle_base_map()
        elif path == "/api/templates":
            self._handle_list_templates()
        elif path == "/api/render":
            # GET, not POST -- the browser's native EventSource (the standard
            # SSE client) can only issue GET requests with no custom body, so
            # render params travel as query params instead of a JSON body.
            self._handle_render(query)
        elif path.startswith("/renders/design/"):
            self._send_file(os.path.join(DESIGN_DIR, os.path.basename(path)), "image/png")
        elif path.startswith("/renders/"):
            self._send_file(os.path.join(RENDERS_DIR, os.path.basename(path)), "image/png")
        else:
            self._send_json({"error": f"no such route: {path}"}, status=404)

    def do_POST(self):
        if self.path == "/api/submit":
            self._handle_submit()
        elif self.path == "/api/design/fort-wall":
            self._handle_fort_wall_preview()
        elif self.path == "/api/design/scratchpad-preview":
            self._handle_scratchpad_preview()
        elif self.path == "/api/design/save-template":
            self._handle_save_template()
        elif self.path == "/api/design/check-placement":
            self._handle_check_placement()
        elif self.path == "/api/ops/construct":
            self._handle_construct_op()
        else:
            self._send_json({"error": f"no such route: {self.path}"}, status=404)

    def _serve_static(self, rel_path: str):
        # No directory traversal: resolve then confirm it's still under STATIC_DIR.
        full = os.path.abspath(os.path.join(STATIC_DIR, rel_path))
        if not full.startswith(os.path.abspath(STATIC_DIR) + os.sep):
            self._send_json({"error": "invalid path"}, status=400)
            return
        ext = os.path.splitext(full)[1]
        content_type = {".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
                        ".html": "text/html; charset=utf-8"}.get(ext, "application/octet-stream")
        self._send_file(full, content_type)

    # --- /api/base-map ---
    def _handle_base_map(self):
        south, west, north, east = STATE.base_map_bounds
        self._send_json({"url": f"/renders/{STATE.base_map_file}",
                         "south": south, "west": west, "north": north, "east": east})

    # --- /api/templates: the Place tab's palette source ---
    def _handle_list_templates(self):
        # `parts` (full footprint/tags/height) travels with the list, not
        # just id/name -- the placement ghost cursor draws a real schematic
        # of the selected template client-side (the plan's "same shared
        # renderer" principle), which needs the actual geometry, not a
        # second round trip per selection. Fine at this project's scale
        # (a handful of templates, this is a local single-user tool).
        out = []
        for path in sorted(glob.glob(os.path.join(TEMPLATES_DIR, "*.json"))):
            try:
                with open(path, encoding="utf-8") as fh:
                    raw = json.load(fh)
                out.append({"id": raw.get("id", os.path.splitext(os.path.basename(path))[0]),
                           "name": raw.get("name", raw.get("id", "")),
                           "parts": raw.get("parts", [])})
            except (json.JSONDecodeError, OSError):
                continue  # a malformed/mid-write template file shouldn't 500 the whole list
        self._send_json({"templates": out})

    # --- /api/submit ---
    def _handle_submit(self):
        payload = self._read_json_body()
        timestamp = self.headers.get("X-Client-Timestamp") or _now_stamp()
        filename = f"submission-{timestamp}.json"
        path = os.path.join(SUBMISSIONS_DIR, filename)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
        self._send_json({"saved": os.path.relpath(path, render_cli.REPO_ROOT)})

    # --- /api/design/fort-wall (Tool 1) ---
    def _handle_fort_wall_preview(self):
        payload = self._read_json_body()
        try:
            parts, anchor_lonlat = _fort_wall_parts_and_anchor(payload)
        except (KeyError, ValueError) as exc:
            self._send_json({"error": str(exc)}, status=400)
            return
        extent_m = float(payload.get("extentM", 400.0))
        mpp = float(payload.get("mpp", 0.3))
        out_name = f"fort-wall-{_now_stamp()}.png"
        out_path = os.path.join(DESIGN_DIR, out_name)
        design_preview.render_design_preview(
            parts, anchor_lonlat, STATE.frame, STATE.style, STATE.fields,
            extent_m=extent_m, mpp=mpp, out_path=out_path)
        self._send_json({"url": f"/renders/design/{out_name}", "partCount": len(parts)})

    def _handle_scratchpad_preview(self):
        payload = self._read_json_body()
        try:
            parts = document_to_parts(payload)
            anchor = payload["previewAnchor"]
            anchor_lonlat = (float(anchor["lon"]), float(anchor["lat"]))
        except (KeyError, ValueError) as exc:
            self._send_json({"error": str(exc)}, status=400)
            return
        extent_m = float(payload.get("extentM", 300.0))
        mpp = float(payload.get("mpp", 0.25))
        out_name = f"scratchpad-{_now_stamp()}.png"
        out_path = os.path.join(DESIGN_DIR, out_name)
        design_preview.render_design_preview(
            parts, anchor_lonlat, STATE.frame, STATE.style, STATE.fields,
            extent_m=extent_m, mpp=mpp, out_path=out_path)
        self._send_json({"url": f"/renders/design/{out_name}", "partCount": len(parts)})

    def _handle_save_template(self):
        # Two payload shapes land here: the original single-perimeter Fort
        # Wall tool ({polygon, params}) and the general Scratchpad
        # ({shapes: [...], frontage: {...}}) -- kept as one endpoint since
        # both do the exact same three things (turn a payload into parts,
        # validate, write a Template JSON), not two near-identical routes
        # that could quietly drift apart.
        payload = self._read_json_body()
        name = (payload.get("name") or "").strip()
        if not name or not all(c.isalnum() or c in "-_" for c in name):
            self._send_json({"error": "name must be non-empty, letters/digits/-/_ only"}, status=400)
            return

        try:
            if "shapes" in payload:
                parts = document_to_parts(payload)
                frontage = payload.get("frontage") or {}
                # Save-time validation, since Template.from_dict itself only
                # fails at NEXT REPLAY (a bare KeyError on raw["frontage"]),
                # not at save -- catch a malformed design here instead.
                if "localPoint" not in frontage or "localDirection" not in frontage:
                    self._send_json({"error": "frontage.localPoint and "
                                              "frontage.localDirection are required"}, status=400)
                    return
                front_point = tuple(float(v) for v in frontage["localPoint"])
                front_dir = tuple(float(v) for v in frontage["localDirection"])
                access_class = payload.get("accessHighwayClass") or "service"
                description = payload.get("description") or (
                    "Scratchpad design-tool output, saved from the map editor's Scratchpad panel "
                    "-- hand-drawn with grid/ortho/symmetry assists, not procedurally generated.")
            else:
                parts, _ = _fort_wall_parts_and_anchor(payload)
                # Frontage: point toward the drawn polygon's own first edge
                # -- a fort wall has no single obvious "front" the way a
                # bunker does, so this is a reasonable default, not a
                # considered design choice. Real access-road routing for a
                # shape like this is a separate, later concern (road_ok
                # reads False/unrouted until someone deliberately sites and
                # routes it, same as every offshore construct this session).
                frame = STATE.frame
                points_map = [frame.lonlat_to_map(p["lon"], p["lat"]) for p in payload["polygon"]]
                cx = sum(p[0] for p in points_map) / len(points_map)
                cy = sum(p[1] for p in points_map) / len(points_map)
                p0x, p0y = points_map[0][0] - cx, points_map[0][1] - cy
                p1x, p1y = points_map[1][0] - cx, points_map[1][1] - cy
                front_point = ((p0x + p1x) / 2.0, (p0y + p1y) / 2.0)
                dist = math.hypot(*front_point) or 1.0
                front_dir = (front_point[0] / dist, front_point[1] / dist)
                access_class = "track"
                description = payload.get("description") or (
                    "Fort Wall design-tool output, saved from the map editor's Design tab "
                    "(citymap/editor/procgen/star_fort.py) -- a user-drawn perimeter, "
                    "bastioned and extruded into a real wall with strengthening pylons.")
        except (KeyError, ValueError) as exc:
            self._send_json({"error": str(exc)}, status=400)
            return

        template_dict = {
            "$schema": "../../schema/map-template.schema.json",
            "id": name, "type": "map-template", "name": name.replace("-", " ").replace("_", " ").title(),
            "description": description,
            "parts": [
                {"tags": p.tags, "heightM": p.height_m, "footprint": [list(pt) for pt in p.footprint],
                 **({"kind": p.kind} if p.kind != "area" else {})}
                for p in parts
            ],
            "frontage": {"localPoint": list(front_point), "localDirection": list(front_dir)},
            "accessRoad": {"highwayClass": access_class},
        }
        out_path = os.path.join(TEMPLATES_DIR, f"{name}.json")
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(template_dict, fh, indent=2)
        self._send_json({"saved": os.path.relpath(out_path, render_cli.REPO_ROOT)})

    # --- /api/design/check-placement: one real dry run, on request only ---
    def _handle_check_placement(self):
        payload = self._read_json_body()
        try:
            template_id = payload["template"]
            anchor = payload["anchor"]
            rotation = float(payload.get("rotation", 0.0))
        except (KeyError, ValueError) as exc:
            self._send_json({"error": str(exc)}, status=400)
            return
        template_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        if not os.path.isfile(template_path):
            self._send_json({"error": f"no such template: {template_id}"}, status=404)
            return
        template = Template.from_file(template_path)
        # A throwaway op id: this dry run is discarded, never appended to
        # STATE.ops, so it can't collide with a real op's id.
        op = Operation(id="check-placement-dry-run", op="construct",
                       payload={"template": template_id, "anchor": anchor, "rotation": rotation})
        try:
            _, report = construct_module.apply_construct(STATE.world, STATE.fields, op, STATE.frame, template)
        except Exception as exc:  # noqa: BLE001 -- report it, don't crash the server over a bad placement
            self._send_json({"error": f"placement check failed: {exc}"}, status=400)
            return
        self._send_json({
            "footprintClear": report.footprint_clear, "footprintConflicts": report.footprint_conflicts,
            "isOffshore": report.is_offshore, "roadOk": report.road_ok, "roadReason": report.road_reason,
            "benchElevationM": report.bench_elevation_m,
        })

    # --- /api/ops/construct: the real placement commit ---------------------
    def _handle_construct_op(self):
        payload = self._read_json_body()
        try:
            template_id = payload["template"]
            anchor = payload["anchor"]
            rotation = float(payload.get("rotation", 0.0))
        except (KeyError, ValueError) as exc:
            self._send_json({"error": str(exc)}, status=400)
            return
        template_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        if not os.path.isfile(template_path):
            self._send_json({"error": f"no such template: {template_id}"}, status=404)
            return
        template = Template.from_file(template_path)

        with STATE_LOCK:
            existing_nums = [int(op.id.split("-")[1]) for op in STATE.ops
                             if op.id.startswith("op-") and op.id.split("-")[1].isdigit()]
            op_id = f"op-{(max(existing_nums) if existing_nums else 0) + 1:04d}"
            note = payload.get("note") or (
                f"Placed live via the map editor's Scratchpad/placement tool ({template_id}).")
            op = Operation(id=op_id, op="construct",
                           payload={"template": template_id, "anchor": anchor, "rotation": rotation}, note=note)

            try:
                new_world, report = construct_module.apply_construct(
                    STATE.world, STATE.fields, op, STATE.frame, template)
            except Exception as exc:  # noqa: BLE001
                self._send_json({"error": f"placement failed: {exc}"}, status=400)
                return

            STATE.world = new_world
            STATE.ops = STATE.ops + [op]
            save_ops(STATE.ops_path, STATE.ops)
            print(f"[editor] committed {op_id}: construct {template_id} @ {anchor} rot={rotation}")
            print("[editor] re-resolving fields after placement (this can take a while)...")
            STATE.fields = render_cli.resolve_fields(
                STATE.world, STATE.world_key_parts, STATE.frame, STATE.style, ops=STATE.ops, on_note=print)

        self._send_json({
            "opId": op_id, "footprintClear": report.footprint_clear, "isOffshore": report.is_offshore,
            "roadOk": report.road_ok, "partFeatureIds": report.part_feature_ids,
        })

    # --- /api/render (SSE) ---
    def _handle_render(self, query: dict):
        params = {k: v[0] for k, v in query.items()}  # parse_qs gives {key: [value]}
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        write_lock = threading.Lock()

        def send_event(event: str, data: dict):
            chunk = f"event: {event}\ndata: {json.dumps(data)}\n\n"
            with write_lock:
                try:
                    self.wfile.write(chunk.encode("utf-8"))
                    self.wfile.flush()
                except (BrokenPipeError, ConnectionAbortedError, OSError):
                    pass  # the browser navigated away -- rendering continues, nobody's listening

        # render_tile itself has no progress hooks (see module docstring),
        # so a single tile/full render can go silent on the wire for
        # minutes. An idle SSE connection that long risks the browser (or
        # anything sitting between it and this server) deciding the
        # connection is dead and having EventSource silently reconnect --
        # which restarts the whole render from scratch, repeatedly, and
        # LOOKS like a hang from the browser side even though the server is
        # doing real work the whole time. A ": ping" comment line (valid
        # SSE syntax, never dispatched as a message) every few seconds
        # keeps the connection visibly alive without meaning anything to
        # the actual progress state.
        stop_heartbeat = threading.Event()

        def heartbeat():
            while not stop_heartbeat.wait(10.0):
                with write_lock:
                    try:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionAbortedError, OSError):
                        return

        hb_thread = threading.Thread(target=heartbeat, daemon=True)
        hb_thread.start()

        try:
            _run_render(params, send_event)
        except Exception as exc:  # noqa: BLE001 - report to the client, then re-raise for the log
            send_event("error", {"message": str(exc)})
            raise
        finally:
            stop_heartbeat.set()


def _now_stamp() -> str:
    import datetime
    return datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")


def _run_render(params: dict, send_event) -> None:
    mode = params.get("mode", "preview")
    frame = STATE.frame
    style = STATE.style
    t_start = time.perf_counter()

    send_event("stage", {"stage": "world", "message": "resolving world"})
    world = STATE.world

    ops = STATE.ops
    if ops:
        send_event("stage", {"stage": "replay", "message": f"replaying {len(ops)} op(s)",
                             "total": len(ops), "done": 0})

        def on_step(i, total, op):
            send_event("progress", {"stage": "replay", "done": i, "total": total,
                                    "message": f"{op.op} ({op.id})"})

        def on_step_done(i, total, op, report):
            send_event("progress", {"stage": "replay", "done": i + 1, "total": total,
                                    "message": f"{op.op} ({op.id}) done"})

        world, results = replay_cache.resolve_replayed_world(
            world, ops, frame, style, render_cli.DEM_CACHE_DIR, render_cli.DEFAULT_TEMPLATES_DIR,
            render_cli.REPO_ROOT, STATE.world_key_parts, on_step=on_step, on_step_done=on_step_done)
        if results is None:
            send_event("progress", {"stage": "replay", "done": len(ops), "total": len(ops),
                                    "message": "replayed-world cache hit"})

    send_event("stage", {"stage": "fields", "message": "building fields (DEM, hillshade, sea)"})
    fields = render_cli.resolve_fields(world, STATE.world_key_parts, frame, style, ops=ops,
                                       on_note=lambda msg: send_event(
                                           "progress", {"stage": "fields", "message": msg}))

    out_name = f"render-{_now_stamp()}.png"
    out_path = os.path.join(RENDERS_DIR, out_name)

    if mode == "preview":
        lon, lat = float(params["lon"]), float(params["lat"])
        extent_m = float(params.get("extentM", 1000.0))
        mpp = float(params.get("mpp", 0.586))
        tile = frame.window_tile(lon, lat, extent_m, mpp, int(params.get("supersample", 1)))
        send_event("stage", {"stage": "render", "message": f"rendering preview ({extent_m:.0f}m)"})
        img = render_module.render_tile(fields, style, tile)

    elif mode == "overview":
        px = int(params.get("overviewPx", 2048))
        tile = frame.full_tile(px=px, supersample=int(params.get("supersample", 1)))
        send_event("stage", {"stage": "render", "message": f"rendering overview ({px}px)"})
        img = render_module.render_tile(fields, style, tile)

    else:  # full
        n = int(params.get("tiles", 3))
        px_per_tile = int(params.get("pxPerTile", 2048))
        supersample = int(params.get("supersample", 1))
        total_tiles = n * n

        window = None
        if "lon" in params and "lat" in params:
            window = (float(params["lon"]), float(params["lat"]), float(params.get("extentM", 2000.0)))
            send_event("stage", {"stage": "render",
                                 "message": f"rendering {n}x{n} tiles @ {px_per_tile}px "
                                            f"over a {window[2]:.0f}m crop",
                                 "total": total_tiles, "done": 0})
        else:
            # No crop given -- the true whole-frame render (e.g. final
            # delivery), same as this always used to behave. The editor UI
            # defaults to sending a crop (see editor.js's full-mode fields)
            # precisely so this whole-frame path isn't hit by accident.
            send_event("stage", {"stage": "render",
                                 "message": f"rendering full frame ({n}x{n} tiles @ {px_per_tile}px)",
                                 "total": total_tiles, "done": 0})

        def on_tile(done, total):
            send_event("progress", {"stage": "render", "done": done, "total": total,
                                    "message": f"tile {done}/{total}"})

        img = render_cli.render_full(fields, style, frame, n, px_per_tile, supersample,
                                     on_tile=on_tile, window=window)

    send_event("stage", {"stage": "saving", "message": "saving image"})
    img.save(out_path)

    send_event("done", {"url": f"/renders/{out_name}", "elapsedSeconds": time.perf_counter() - t_start})


def main():
    global STATE
    try:  # same reasoning as render.py's CLI: this always ends up redirected/captured
        sys.stdout.reconfigure(line_buffering=True)
    except AttributeError:  # pragma: no cover - only on very old Python
        pass
    STATE = EditorState(render_cli.DEFAULT_FRAME, render_cli.DEFAULT_STYLE, DEFAULT_OPS_PATH)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"editor ready: http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
