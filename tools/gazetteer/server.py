#!/usr/bin/env python3
"""The gazetteer's local server.

    python tools/gazetteer/server.py          then open http://localhost:8767

Serves the tile pyramid, the ground truth, and the drawing session. Python
stdlib only, same shape as tools/city-map/editor/server.py, for the same
reason: this is a single-machine tool for one person and a framework would be
more to install than to use.

Two things it does NOT do, deliberately:

* **It never sends lon/lat to the browser.** The page works entirely in image
  pixels, which is what was drawn and what a grid reference is computed from.
  Projection needs pyproj and the 31-degree page rotation, and a second
  implementation of that in JavaScript is exactly the duplicate that drifts.
  Canonical lon/lat is attached here, at save.

* **It never truncates a feature query silently.** Zoomed out, a viewport
  covers 175,000 buildings; drawing them would be useless and serving them
  would be slow. So the query refuses above a view width and says so, and caps
  a big result and says how much it kept. An honest empty answer is debuggable;
  a quietly halved one is not. (The same rule tools/city-map/api/features.py
  already follows with its hiddenByLod / hiddenByCap flags.)

No-cache headers on everything but tiles: editing the stylesheet and reloading
to find the browser still serving the old one cost real time on this repo's
last local tool, and the fix is recorded in design/ui/serve.py's own docstring.
Tiles are content-addressed by a rebuild, so they may cache.
"""

from __future__ import annotations

import argparse
import datetime
import json
import mimetypes
import os
import posixpath
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import groundtruth, location as location_mod, overrides as overrides_mod, session as session_mod, undo as undo_mod  # noqa: E402
from core.georef import MapGeoref  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
STATIC_DIR = os.path.join(_HERE, "static")
CORE_DIR = os.path.join(_HERE, "core")
#: The module's own stylesheet layers, loaded the way design/ui/style-prototype.html
#: loads them -- tokens and components only, never the Foundry bridge. This page
#: is not a mock-up of the campaign's look; it IS the campaign's CSS.
THEME_DIR = os.path.join(_REPO_ROOT, "module", "blank-inheritance", "styles")
FONT_DIR = os.path.join(_REPO_ROOT, "module", "blank-inheritance", "assets", "fonts")
LOCATIONS_DIR = os.path.join(_REPO_ROOT, "data", "locations")
DEFAULT_PORT = 8767

#: Above this view width in image pixels, a feature query refuses. At 4000 px
#: across (4 km, twenty cells) a viewport already holds tens of thousands of
#: buildings; past it the answer is not useful at any size. The UI shows the
#: refusal as "zoom in to pick buildings" rather than an empty layer.
MAX_FEATURE_VIEW_PX = 4000
#: And within that, a hard cap so one dense query cannot stall the page.
MAX_FEATURES = 4000


class State:
    """Everything the handler needs, built once and shared.

    The GeoPackage connection is per-thread: sqlite3 objects belong to the
    thread that made them, and this is a ThreadingHTTPServer.
    """

    def __init__(self, tile_dir=None, draft_id=None):
        self.georef = MapGeoref.load()
        manifest = self.georef.manifest
        tiles = manifest.get("tiles") or {}
        self.tile_dir = tile_dir or os.path.join(_REPO_ROOT, tiles.get("dir", ""))
        self.tile_size = tiles.get("tileSize", 512)
        self.max_zoom = tiles.get("maxZoom", 5)
        self.overrides = overrides_mod.load()
        self.suppression = overrides_mod.Suppression(self.overrides)
        self.lock = threading.Lock()
        self._local = threading.local()
        self.undo_stack = undo_mod.UndoStack()

        if draft_id:
            path = session_mod.draft_path(draft_id)
            self.draft = session_mod.load(path) if os.path.exists(path) else None
            if self.draft is None:
                raise SystemExit("no draft %r in %s" % (draft_id, session_mod.DRAFT_DIR))
        else:
            existing = session_mod.list_drafts()
            if existing:
                self.draft = session_mod.load(session_mod.draft_path(existing[0]))
            else:
                self.draft = session_mod.new_draft(
                    map_sha256=(manifest.get("image") or {}).get("sha256"))
        self._draft_mtime = self._on_disk_mtime()

    @property
    def conn(self):
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = groundtruth.open_store()
            self._local.conn = conn
        return conn

    def refresh_suppression(self):
        self.suppression = overrides_mod.Suppression(self.overrides)

    def landmask(self):
        """(land, water) off the real painted map, loaded once per process.

        landmask.load() reads and vectorises a cached raster; cheap next to a
        tile render, but not free, and a clip is expected to run once per
        district in a batch pass -- see landmask.py's own docstring for why
        this has to be the painted map and not OSM's coastline.
        """
        cached = getattr(self, "_landmask", None)
        if cached is None:
            import landmask as landmask_mod
            _, land, water = landmask_mod.load()
            cached = self._landmask = (land, water)
        return cached

    def _on_disk_mtime(self):
        """Modification time of the draft file, or None if it is not there."""
        try:
            return os.path.getmtime(session_mod.draft_path(self.draft["id"]))
        except OSError:
            return None

    def draft_changed_underneath(self):
        """Has something else written the draft since this process last did?

        The server holds the whole draft in memory and writes it out whole, so
        a tool that edits the file directly -- a backfill script, a hand
        correction -- is invisible to it, and the next save from the browser
        silently reverts the lot. That is not hypothetical: a backfill of the
        research provenance on forty regions was one autosave away from being
        wiped by a browser that had loaded before it ran.
        """
        current = self._on_disk_mtime()
        if current is None or self._draft_mtime is None:
            return False
        return current > self._draft_mtime + 0.001

    def reload_draft(self):
        path = session_mod.draft_path(self.draft["id"])
        if os.path.exists(path):
            self.draft = session_mod.load(path)
            self._draft_mtime = self._on_disk_mtime()
        return self.draft

    def save_draft(self):
        """Derive what can be derived, then write -- always write.

        One malformed shape must never cost a session. Deriving a two-point
        ring raises, and letting that propagate would abort the whole save and
        lose every good shape drawn alongside it: the exact failure the
        validate-don't-raise rule in core/session.py exists to prevent, undone
        one layer up. Found by the server suite rather than by losing an hour.

        A shape that cannot be derived keeps an empty derived block and is
        reported through validate(), so it shows in the UI as a problem instead
        of silently looking finished.

        Containment and adjacency (which region a building stands in, which
        regions border each other) are computed here too, over the WHOLE
        draft rather than one item at a time -- see session_mod.derive_draft
        for why that has to be a separate pass.
        """
        session_mod.derive_draft(self.draft, self.georef)
        path = session_mod.save(self.draft, session_mod.draft_path(self.draft["id"]))
        self._draft_mtime = self._on_disk_mtime()
        return path


STATE = None


class Handler(BaseHTTPRequestHandler):
    server_version = "Gazetteer/1.0"

    # --- plumbing ------------------------------------------------------------

    def log_message(self, fmt, *args):
        if "/tiles/" in (self.path or ""):
            return  # 864 tile lines per pan is not a log, it is a hosing
        sys.stderr.write("%s %s\n" % (self.command, self.path))

    def _send(self, code, body, content_type="application/json", cache=False):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if cache:
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, code, message):
        self._send(code, {"error": message})

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    # --- routing -------------------------------------------------------------

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        try:
            if path == "/":
                return self._static("index.html")
            if path.startswith("/static/"):
                return self._static(path[len("/static/"):])
            if path.startswith("/core/"):
                return self._serve_from(CORE_DIR, path[len("/core/"):])
            if path.startswith("/theme/"):
                return self._serve_from(THEME_DIR, path[len("/theme/"):])
            # bi-fonts.css names its faces at "../assets/fonts/..." relative to
            # itself, so served from /theme/ they resolve here. Matching that
            # rather than rewriting the generated stylesheet.
            if path.startswith("/assets/fonts/"):
                return self._serve_from(FONT_DIR, path[len("/assets/fonts/"):], cache=True)
            if path.startswith("/tiles/"):
                return self._tile(path[len("/tiles/"):])
            if path == "/api/map":
                return self._api_map()
            if path == "/api/features":
                return self._api_features(query)
            if path == "/api/overrides":
                return self._send(200, STATE.overrides)
            if path == "/api/session":
                return self._api_session()
            if path == "/api/drafts":
                return self._send(200, {"drafts": session_mod.list_drafts(),
                                        "current": STATE.draft["id"]})
            if path == "/api/locations":
                return self._api_locations()
            if path == "/api/coverage":
                return self._api_coverage(parse_qs(parsed.query))
            if path == "/api/queue":
                return self._api_queue()
            if path.startswith("/api/crop/"):
                return self._api_crop(path[len("/api/crop/"):])
            if path == "/api/requests":
                return self._api_requests(query)
            if path == "/api/biomes":
                return self._api_biomes()
            if path == "/api/lore/documents":
                return self._api_lore_documents()
            if path == "/api/lore/document":
                return self._api_lore_document(query)
            if path == "/api/lore/instructions":
                return self._api_lore_instructions(query)
            return self._error(404, "no route for %s" % path)
        except Exception as exc:  # a local tool: show the fault, do not hide it
            import traceback
            traceback.print_exc()
            return self._error(500, "%s: %s" % (type(exc).__name__, exc))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path == "/api/session":
                return self._api_save_session()
            if path == "/api/session/new":
                return self._api_new_session()
            if path == "/api/hit-test":
                return self._api_hit_test()
            if path == "/api/adopt":
                return self._api_adopt()
            if path == "/api/suppress":
                return self._api_suppress()
            if path == "/api/unsuppress":
                return self._api_unsuppress()
            if path == "/api/location":
                return self._api_update_location()
            if path == "/api/clip-to-shore":
                return self._api_clip_to_shore()
            if path == "/api/promote":
                return self._api_promote()
            if path == "/api/handoff":
                return self._api_handoff()
            if path == "/api/undo":
                return self._api_undo()
            if path == "/api/requests":
                return self._api_create_request()
            if path.startswith("/api/requests/") and path.endswith("/resolve"):
                request_id = path[len("/api/requests/"):-len("/resolve")]
                return self._api_resolve_request(request_id)
            if path == "/api/biomes/rebuild":
                return self._api_rebuild_biomes()
            if path == "/api/regions/reconcile":
                return self._api_reconcile_regions()
            if path == "/api/regions/merge":
                return self._api_merge_regions()
            if path == "/api/regions/bisect":
                return self._api_bisect_region()
            if path.startswith("/api/location/") and path.endswith("/approve"):
                location_id = path[len("/api/location/"):-len("/approve")]
                return self._api_approve_location(location_id)
            if path == "/api/lore/document":
                return self._api_save_lore_document()
            if path == "/api/lore/documents":
                return self._api_add_lore_document()
            if path == "/api/lore/instructions":
                return self._api_create_lore_instruction()
            if path.startswith("/api/lore/instructions/") and path.endswith("/resolve"):
                instruction_id = path[len("/api/lore/instructions/"):-len("/resolve")]
                return self._api_resolve_lore_instruction(instruction_id)
            return self._error(404, "no route for %s" % path)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            return self._error(500, "%s: %s" % (type(exc).__name__, exc))

    # --- static + tiles ------------------------------------------------------

    def _static(self, rel):
        return self._serve_from(STATIC_DIR, rel)

    def _serve_from(self, base, rel, cache=False):
        rel = posixpath.normpath(rel).lstrip("/")
        if rel.startswith("..") or os.path.isabs(rel):
            return self._error(403, "no")
        full = os.path.normpath(os.path.join(base, rel.replace("/", os.sep)))
        if not full.startswith(os.path.normpath(base)):
            return self._error(403, "no")
        if not os.path.isfile(full):
            return self._error(404, "no such file %s" % rel)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if full.endswith(".mjs"):
            ctype = "text/javascript"
        elif full.endswith(".woff2"):
            ctype = "font/woff2"
        with open(full, "rb") as fh:
            self._send(200, fh.read(), ctype, cache=cache)

    def _tile(self, rel):
        """A missing tile is a 404, not an error. The pyramid is not padded out
        to a power of two, so the client legitimately asks for tiles past the
        edge of the sheet and treats the absence as empty."""
        parts = posixpath.normpath(rel).split("/")
        if len(parts) != 3 or any(p.startswith(".") for p in parts):
            return self._error(400, "tile path must be z/x/y.webp")
        full = os.path.join(STATE.tile_dir, parts[0], parts[1], parts[2])
        if not os.path.isfile(full):
            return self._error(404, "no tile")
        with open(full, "rb") as fh:
            self._send(200, fh.read(), "image/webp", cache=True)

    # --- api -----------------------------------------------------------------

    def _api_map(self):
        g = STATE.georef
        m = g.manifest
        self._send(200, {
            "image": {"width": g.image_w, "height": g.image_h},
            "border": {"px": g.border_px},
            "content": {"width": g.content_w, "height": g.content_h},
            "grid": m["grid"],
            "metresPerPixel": g.metres_per_px,
            "tiles": {"url": "/tiles/{z}/{x}/{y}.webp",
                      "tileSize": STATE.tile_size,
                      "maxZoom": STATE.max_zoom},
            "kinds": list(session_mod.KINDS),
            "tiers": list(session_mod.TIERS),
            "maxFeatureViewPx": MAX_FEATURE_VIEW_PX,
            "groundTruthAvailable": groundtruth.store_exists(),
        })

    def _api_features(self, query):
        """Ground-truth features overlapping a viewport, as image-pixel rings."""
        try:
            x0 = float(query["x0"][0]); y0 = float(query["y0"][0])
            x1 = float(query["x1"][0]); y1 = float(query["y1"][0])
        except (KeyError, ValueError):
            return self._error(400, "need x0, y0, x1, y1")

        width = max(abs(x1 - x0), abs(y1 - y0))
        if width > MAX_FEATURE_VIEW_PX:
            return self._send(200, {
                "features": [], "refused": True,
                "reason": ("view is %d px across; buildings are served below %d"
                           % (width, MAX_FEATURE_VIEW_PX)),
            })

        rows = groundtruth.features_in_image_rect(
            STATE.conn, STATE.georef, min(x0, x1), min(y0, y1),
            max(x0, x1), max(y0, y1))

        sup = STATE.suppression
        out = []
        hidden = 0
        for row in rows:
            tags = row.get("tags") or {}
            if not tags.get("building"):
                continue  # only buildings are adoptable or removable
            rings = groundtruth.geom_to_image_rings(row.get("geom"), STATE.georef)
            if not rings:
                continue
            ring = rings[0]
            cx = sum(p[0] for p in ring) / len(ring)
            cy = sum(p[1] for p in ring) / len(ring)
            if sup.hides(row["id"], (cx, cy)):
                hidden += 1
                continue
            out.append({
                "id": row["id"],
                "ringPx": [[round(px, 1), round(py, 1)] for px, py in ring],
                "name": tags.get("name") or tags.get("name:en") or "",
                "nameJa": tags.get("name:ja") or "",
                "building": tags.get("building"),
                "levels": tags.get("building:levels"),
                "heightM": row.get("height_m"),
                "build": _build_info(tags, row.get("height_m")),
                "kind": groundtruth.classify(tags, row.get("area")),
            })
            if len(out) >= MAX_FEATURES:
                break

        self._send(200, {
            "features": out,
            "refused": False,
            "capped": len(out) >= MAX_FEATURES,
            "cap": MAX_FEATURES,
            "suppressedHere": hidden,
        })

    def _api_hit_test(self):
        """Which building is under this pixel. Topmost-smallest wins for an
        exact hit: in a dense block the small building you clicked is almost
        always the one you meant, not the large complex whose bounding box
        also contains it. If the point is not exactly inside anything, the
        nearest building whose EDGE is within tolerancePx wins instead --
        found live: a building rendered at 8% fill opacity, one screen pixel
        wide at a zoomed-out view, is not realistically clickable if "exactly
        inside the polygon" is the only thing that counts, and a plain miss
        made single-click adopt/remove nearly unusable except at native zoom.
        tolerancePx already had to widen the query window below for this
        reason; it now does the same job for the hit itself."""
        body = self._body()
        x, y = float(body["x"]), float(body["y"])
        pad = float(body.get("tolerancePx", 2.0))
        rows = groundtruth.features_in_image_rect(
            STATE.conn, STATE.georef, x - pad, y - pad, x + pad, y + pad)

        from core.grid import polygon_area_px
        inside_hits, near_hits = [], []
        for row in rows:
            tags = row.get("tags") or {}
            if not tags.get("building"):
                continue
            rings = groundtruth.geom_to_image_rings(row.get("geom"), STATE.georef)
            if not rings:
                continue
            ring = rings[0]
            is_inside = overrides_mod._point_in_ring(x, y, ring)
            dist = 0.0 if is_inside else overrides_mod._distance_to_ring(x, y, ring)
            if not is_inside and dist > pad:
                continue
            cx = sum(p[0] for p in ring) / len(ring)
            cy = sum(p[1] for p in ring) / len(ring)
            if STATE.suppression.hides(row["id"], (cx, cy)):
                continue
            entry = (polygon_area_px(ring), row["id"], ring, tags, row.get("height_m"), dist)
            (inside_hits if is_inside else near_hits).append(entry)

        inside_hits.sort(key=lambda h: h[0])   # smallest area wins among exact hits
        near_hits.sort(key=lambda h: h[5])     # nearest edge wins among near-misses
        hits = inside_hits + near_hits

        self._send(200, {"hits": [{
            "id": h[1],
            "ringPx": [[round(px, 1), round(py, 1)] for px, py in h[2]],
            "areaM2": round(h[0] * STATE.georef.metres_per_px ** 2, 1),
            "name": h[3].get("name") or h[3].get("name:en") or "",
            "nameJa": h[3].get("name:ja") or "",
            "building": h[3].get("building"),
            "levels": h[3].get("building:levels"),
            "heightM": h[4],
            "build": _build_info(h[3], h[4]),
        } for h in hits]})

    def _api_clip_to_shore(self):
        """How much of a drawn shape actually sits on its own side of the
        real, painted shore -- landmask.py's clip_ring_to_shore(), computed
        but NOT applied. The caller (the review-mode UI, or a one-off script)
        decides whether to save the result, the same "compute, then the
        caller saves" shape /api/adopt already uses.

        Refuses with a plain reason (never a raw traceback) when the clip
        would empty the shape or split it in two -- both are real judgement
        calls, not something to guess at silently. See landmask.ClipError.
        """
        import landmask as landmask_mod

        body = self._body()
        local_id = body.get("localId")
        item = next((it for it in STATE.draft["items"] if it["localId"] == local_id), None)
        if item is None:
            return self._error(404, "no item %r in the current session" % local_id)
        geom = item.get("geometry") or {}
        if geom.get("kind") != "polygon":
            return self._error(400, "only a polygon has a shore to clip to")

        try:
            land, water = STATE.landmask()
            result = landmask_mod.clip_ring_to_shore(
                geom["ringPx"], land, water, kind=item.get("kind") or "")
        except landmask_mod.ClipError as exc:
            return self._error(409, str(exc))

        self._send(200, result)

    def _api_adopt(self):
        """Turn one or more real building footprints into a draft item.

        Several footprints merge into their convex hull rather than staying
        separate rings. A campus or a terrace is one place with one story, and
        a hull is the shape a person would have drawn around it -- where a
        multipolygon would be technically truer and useless to write about.
        """
        body = self._body()
        ids = body.get("featureIds") or []
        if not ids:
            return self._error(400, "need featureIds")

        rings = []
        names = []
        builds = []
        for fid in ids:
            from citymap.store import gpkg
            row = gpkg.get_feature_kwargs(STATE.conn, fid)
            if row is None:
                continue
            got = groundtruth.geom_to_image_rings(row.get("geom"), STATE.georef)
            if got:
                rings.append(got[0])
            tags = row.get("tags") or {}
            nm = tags.get("name") or tags.get("name:en")
            if nm:
                names.append(nm)
            builds.append(_build_info(tags, row.get("height_m")))

        if not rings:
            return self._error(404, "none of those features have geometry")

        if len(rings) == 1:
            ring = rings[0]
        else:
            ring = _convex_hull([p for r in rings for p in r])

        self._send(200, {
            "ringPx": [[round(px, 1), round(py, 1)] for px, py in ring],
            "source": "adopted" if len(rings) == 1 else "merged",
            "featureIds": ids,
            "realWorldNames": names,
            # The tallest of a merged set, because a campus is as complex as
            # its biggest building and averaging would flatten exactly the one
            # thing worth knowing about it.
            "build": max(builds, key=lambda b: b.get("heightM") or 0)
                     if builds else None,
        })

    def _api_suppress(self):
        """Mark real features as gone from the campaign map."""
        body = self._body()
        note = body.get("note") or ""
        when = datetime.datetime.now().strftime("%Y-%m-%d")
        with STATE.lock:
            added = 0
            if body.get("featureIds"):
                added = overrides_mod.add_feature_ids(
                    STATE.overrides, body["featureIds"], note, when)
            area = None
            if body.get("ringPx"):
                ring = [(float(x), float(y)) for x, y in body["ringPx"]]
                area_id = body.get("areaId") or ("area-%s" % datetime.datetime.now()
                                                 .strftime("%Y%m%d-%H%M%S-%f"))
                area = overrides_mod.add_area(
                    STATE.overrides, area_id, ring, note, when,
                    ring_lonlat=STATE.georef.ring_to_lonlat(ring))
            overrides_mod.save(STATE.overrides)
            STATE.refresh_suppression()
        self._send(200, {"added": added, "area": area,
                         "total": len(STATE.suppression)})

    def _api_unsuppress(self):
        body = self._body()
        with STATE.lock:
            removed = 0
            if body.get("featureIds"):
                removed += overrides_mod.remove_feature_ids(
                    STATE.overrides, body["featureIds"])
            if body.get("areaId"):
                removed += overrides_mod.remove_area(STATE.overrides, body["areaId"])
            overrides_mod.save(STATE.overrides)
            STATE.refresh_suppression()
        self._send(200, {"removed": removed, "total": len(STATE.suppression)})

    def _api_coverage(self, query):
        """Does the current set of regions tessellate the sheet?

        Draft regions and already-promoted ones are checked together, because
        a half-promoted tessellation is the normal state and checking either
        half alone would report the other half's ground as a gap.

        Everything is measured against the painted content rectangle and
        nothing else. The map has diverged from the ground truth under it on
        purpose -- an airport that is no longer there, a large island redrawn
        as a small fort -- so consulting the real world here would invent gaps
        wherever the picture is deliberately different.
        """
        import coverage as coverage_mod

        # A promoted region's draft copy is the SAME physical district as its
        # data/locations/ twin, not a second one -- counting both is what a
        # region promotion used to do by construction (promotion never
        # deletes the draft item), and it went untested because The Proving
        # Ground was the first region anyone actually promoted. Left in, it
        # reports 100% self-overlap against every region the moment it is
        # promoted, and can bury a real overlap underneath it in the list.
        promoted_source_local_ids = {
            (doc.get("derived") or {}).get("sourceLocalId")
            for doc in _load_all_locations() if doc.get("tier") == "region"
        }
        promoted_source_local_ids.discard(None)

        regions, sites = [], []
        for item in STATE.draft.get("items", []):
            if item.get("tier") == "region":
                if item.get("localId") in promoted_source_local_ids:
                    continue
                regions.append({"id": item.get("localId"),
                                "geometry": item.get("geometry") or {},
                                "name": item.get("name") or "",
                                "tags": item.get("tags") or []})
            else:
                derived = item.get("derived") or {}
                if derived.get("centroidPx"):
                    sites.append({"id": item.get("localId"),
                                  "centroidPx": derived["centroidPx"]})

        promoted = 0
        for doc in _load_all_locations():
            if doc.get("tier") != "region":
                continue
            rings_px = []
            for ring in (doc.get("geometry") or {}).get("rings") or []:
                rings_px.append([list(STATE.georef.lonlat_to_image_px(lon, lat))
                                 for lon, lat in ring])
            if rings_px:
                regions.append({"id": doc["id"], "ringsPx": rings_px,
                                "name": doc.get("name") or doc["id"],
                                "tags": doc.get("tags") or []})
                promoted += 1

        try:
            min_sliver = float(query.get("minSliver", [coverage_mod.DEFAULT_MIN_SLIVER_PX2])[0])
        except (TypeError, ValueError):
            min_sliver = coverage_mod.DEFAULT_MIN_SLIVER_PX2

        result = coverage_mod.analyse(regions, sites=sites, min_sliver_px2=min_sliver)
        result["promotedRegionCount"] = promoted
        result["draftRegionCount"] = len(regions) - promoted
        result["summary"] = coverage_mod.summarise(result)
        self._send(200, result)

    def _api_locations(self):
        """Every promoted location, with geometry converted to image pixels so
        the client can draw them straight onto the same Leaflet CRS.Simple map
        it draws everything else on -- no lon/lat handling in the browser.

        Also the ONLY thing that tells the browser a draft item has been
        promoted at all -- the inspector panel matches an item to its entry
        here (by `locationRef` first, falling back to `sourceLocalId` for
        anything promoted before that stamp existed; see
        core/promotion.mjs's resolvePromotedLocation, the JS mirror of the
        same two-way match server.py's own handoff code uses) and shows
        `lore`/`scene`/`npcRefs`/`classification` from THIS response instead
        of the draft's own note. Found missing live: Ingram promoted four
        locations, refreshed the Gazetteer, and the inspector still showed
        only his rough notes -- the handoff document had already been fixed
        to read the promoted entity, but nothing in the live UI had.
        """
        out = []
        for doc in _load_all_locations():
            g = STATE.georef
            if doc["tier"] == "point":
                lon, lat = doc["geometry"]["point"]
                image_px = list(g.lonlat_to_image_px(lon, lat))
                rings_px = None
            else:
                rings_px = [g.ring_to_image_px(r) for r in doc["geometry"]["rings"]]
                image_px = None
            out.append({
                "id": doc["id"], "tier": doc["tier"], "name": doc.get("name"),
                "kind": doc.get("kind") or "", "status": doc["authoring"]["status"],
                "ref": doc["derived"]["ref"], "withinRegionRef": doc["derived"].get("withinRegionRef"),
                "sourceLocalId": doc["derived"].get("sourceLocalId"),
                "pointPx": image_px, "ringsPx": rings_px,
                "depth": doc.get("depth") or "named",
                "rank": doc.get("rank"),
                "lore": doc.get("lore") or {}, "scene": doc.get("scene") or {},
                "npcRefs": doc.get("npcRefs") or [], "classification": doc.get("classification"),
                "authoringNote": (doc.get("authoring") or {}).get("note") or "",
            })
        self._send(200, {"locations": out})

    #: What the review mode is allowed to rewrite on an already-promoted
    #: location. Deliberately short: geometry, `derived` and provenance are
    #: computed from the drawing and must never be editable as text, or the
    #: file stops agreeing with the map it came from.
    EDITABLE_LOCATION_FIELDS = ("name", "nameJa", "rank", "classification",
                                "tags", "lore", "scene", "npcRefs", "factionRefs",
                                "episodeRefs", "openQuestionRefs", "assetRefs",
                                "playlistRefs", "bibleRef", "depth")

    def _api_update_location(self):
        """Rewrite the written parts of an existing data/locations entry.

        The review mode's save path. Promotion is still the only thing that
        CREATES a location, and this cannot create one -- it refuses an id it
        does not already have on disk, so a typo makes an error rather than a
        stray half-built file.
        """
        body = self._body()
        location_id = (body.get("id") or "").strip()
        if not location_id:
            return self._error(400, "need id")
        dest = os.path.join(LOCATIONS_DIR, location_id + ".json")
        if not os.path.exists(dest):
            return self._error(404, "no data/locations/%s.json -- promote it first"
                               % location_id)

        with STATE.lock:
            with open(dest, encoding="utf-8") as fh:
                doc = json.load(fh)
            changed = []
            for field in self.EDITABLE_LOCATION_FIELDS:
                if field in body:
                    doc[field] = body[field]
                    changed.append(field)
            if "status" in body and body["status"]:
                if body["status"] == "approved":
                    return self._error(400, "status 'approved' cannot be set through a "
                                            "normal edit -- use POST /api/location/<id>/approve")
                doc.setdefault("authoring", {})["status"] = body["status"]
                changed.append("status")
            _save_location(doc)

        self._send(200, {"saved": _repo_relative(dest), "changed": changed,
                         "location": doc})

    def _api_approve_location(self, location_id):
        """The one path that can ever write status 'approved' -- or take it
        back. Ingram, 2026-09-13: this is the seal of quality, and it is his
        alone to give; every other write path (promotion, the review-mode
        editor, a mass-edit-by-instruction) explicitly refuses the value
        instead of accepting it as a side effect. A dedicated, unmistakably-
        named endpoint is the actual enforcement -- a rule that only lives in
        a comment is a rule that survives until the next tired edit forgets
        it, which is exactly how it got INTO the review-mode editor unguarded
        in the first place.
        """
        location_id = (location_id or "").strip()
        dest = os.path.join(LOCATIONS_DIR, location_id + ".json")
        if not os.path.exists(dest):
            return self._error(404, "no data/locations/%s.json" % location_id)
        body = self._body()
        approved = body.get("approved", True)

        with STATE.lock:
            with open(dest, encoding="utf-8") as fh:
                doc = json.load(fh)
            doc.setdefault("authoring", {})["status"] = "approved" if approved else "drafted"
            _save_location(doc)

        self._send(200, {"saved": _repo_relative(dest), "location": doc})

    def _api_promote(self):
        """Turn one draft item into a permanent data/locations/*.json entity.

        Refuses on validate_for_promotion's problems rather than creating an
        unlabelled file, but the caller (the UI) is expected to have already
        shown those and let the person decide -- so this endpoint enforces the
        same rule server-side rather than trusting the client alone.
        """
        body = self._body()
        local_id = body.get("localId")
        location_id = (body.get("id") or "").strip()
        if not local_id or not location_id:
            return self._error(400, "need localId and id")

        item = next((it for it in STATE.draft["items"] if it["localId"] == local_id), None)
        if item is None:
            return self._error(404, "no item %r in the current session" % local_id)

        problems = location_mod.validate_for_promotion(item)
        if problems and not body.get("force"):
            return self._send(409, {"error": "not ready to promote", "problems": problems})

        # "approved" is Ingram's own seal, never a side effect of a normal
        # promotion -- see /api/location/<id>/approve, the one place it can
        # actually be set. Refused loudly rather than silently downgraded:
        # a caller that typed this deserves to know it did nothing, not to
        # have it quietly vanish and wonder later why approval never stuck.
        if body.get("status") == "approved":
            return self._error(400, "status 'approved' cannot be set through promotion -- "
                                    "use POST /api/location/<id>/approve instead")

        dest = os.path.join(LOCATIONS_DIR, location_id + ".json")
        if os.path.exists(dest) and not body.get("overwrite"):
            return self._error(409, "data/locations/%s.json already exists" % location_id)

        with STATE.lock:
            # Everything EXCEPT the one being written. On an overwrite the
            # previous version of this same location is still on disk, and
            # including it meant a re-promoted location could be found inside
            # itself -- Deep Storage came back with withinRegionRef pointing
            # at "deep-storage" the first time it was re-promoted after being
            # re-tiered from region to site.
            existing = [d for d in _load_all_locations() if d["id"] != location_id]
            existing_regions = [d for d in existing if d["tier"] == "region"]
            doc = location_mod.build_location(
                item, location_id, STATE.georef,
                lore=body.get("lore"), name=body.get("name"), nameJa=body.get("nameJa"),
                session_id=STATE.draft["id"], existing_regions=existing_regions,
                status=body.get("status"), scene=body.get("scene"),
                npc_refs=body.get("npcRefs"), faction_refs=body.get("factionRefs"),
                episode_refs=body.get("episodeRefs"),
                open_question_refs=body.get("openQuestionRefs"),
                bible_ref=body.get("bibleRef"), asset_refs=body.get("assetRefs"),
                playlist_refs=body.get("playlistRefs"), tags=body.get("tags"),
                classification=body.get("classification"), rank=body.get("rank"))

            if doc["tier"] == "region":
                location_mod.recompute_region_contents(doc, existing)
                _save_location(doc)
                # A region drawn after its buildings must pick them up too:
                # every existing site/point gets re-checked against the new
                # boundary, not just ones promoted from here on.
                for other in existing:
                    if other["tier"] in ("site", "point"):
                        ll = location_mod.location_centroid_lonlat(other)
                        if ll and location_mod.region_contains(ll, doc):
                            other["derived"]["withinRegionRef"] = doc["id"]
                            _save_location(other)
            else:
                _save_location(doc)
                for region in existing_regions:
                    if region["id"] == doc["derived"].get("withinRegionRef"):
                        location_mod.recompute_region_contents(
                            region, existing + [doc])
                        _save_location(region)

            # Point the draft item at what it became, and save. Promotion is a
            # one-way door -- the location never writes lore back into the
            # draft -- but without a pointer the session has no idea the door
            # was ever walked through, so the UI and the handoff both go on
            # reporting a fully-written location as owing its entire lore.
            # Promotion is also exactly the moment the item stops being a
            # draft, which is what `locked` already means (see its own commit).
            item["locationRef"] = location_id
            item["locked"] = True
            # A place named during promotion should appear under that name on
            # the map too, or the drawing it came from stays "(unnamed site)"
            # forever. Only fills a blank: a name typed in the tool is the
            # person's own and always wins.
            if not (item.get("name") or "").strip() and (doc.get("name") or "").strip():
                item["name"] = doc["name"]
            STATE.save_draft()

        self._send(200, {"saved": _repo_relative(dest), "location": doc})

    def _api_reconcile_regions(self):
        """Ingram, 2026-09-13: "I will be drawing boundaries as accurately
        as possible, so treat my region points as key and adjust other
        things around those... build a protocol for doing this again and
        again." This is that protocol, run on demand -- see
        core/reconcile.py's own docstring for the actual rule (smaller
        region wins, a severed piece merges into whichever region caused
        the split) rather than repeating it here.

        Two things happen together because they must: the draft's own
        region items are trimmed/grown, AND any of those regions that are
        already promoted get their data/locations/*.json twin resynced to
        match (core/location.py's resync_region_geometry) -- leaving only
        the draft fixed would make containment agree with a map picture
        the promoted files still disagree with, which is the exact kind of
        two-copies-of-the-truth drift this whole protocol exists to close.
        """
        from core import reconcile as reconcile_mod

        with STATE.lock:
            if STATE.draft_changed_underneath():
                fresh = STATE.reload_draft()
                return self._send(409, {
                    "error": "the draft changed on disk since this session loaded it "
                             "-- reload before reconciling",
                    "draft": fresh,
                })

            new_items, report = reconcile_mod.trim_overlapping_regions(STATE.draft["items"])
            changed_ids = set(report["trimmed"]) | {
                target for targets in report["merged"].values() for target in targets}
            if not changed_ids:
                return self._send(200, {"changed": False, "report": report, "syncedLocations": []})

            if undo_mod.has_real_change(STATE.draft["items"], new_items):
                STATE.undo_stack.push({
                    "items": STATE.draft["items"],
                    "nextLocalId": STATE.draft.get("nextLocalId"),
                    "description": "reconciled %d overlapping region(s)" % len(changed_ids),
                    "at": datetime.datetime.now().isoformat(timespec="seconds"),
                })

            STATE.draft["items"] = new_items
            STATE.save_draft()

            # Only NOW load what is promoted, and only for regions this
            # pass actually touched -- reading it before the draft save
            # would risk resyncing against a geometry that was about to be
            # superseded by whatever validate()/derive found on save.
            by_id = {it["localId"]: it for it in new_items}
            existing = _load_all_locations()
            by_slug = {d["id"]: d for d in existing}
            synced = []
            for local_id in changed_ids:
                item = by_id.get(local_id)
                slug = item.get("locationRef") if item else None
                if slug and slug in by_slug:
                    location_mod.resync_region_geometry(by_slug[slug], item, STATE.georef)
                    synced.append(slug)

            # containsRefs last, once and only once every touched region's
            # geometry is final -- recomputing it mid-loop would let an
            # earlier region's contents be checked against a later one's
            # stale, about-to-change shape.
            for slug in synced:
                location_mod.recompute_region_contents(by_slug[slug], existing)
                _save_location(by_slug[slug])

        self._send(200, {"changed": True, "report": report, "syncedLocations": synced})

    def _api_merge_regions(self):
        """Ingram, 2026-09-13: "shift clicking on both regions and using a
        'merge' button makes the most sense." core/reconcile.py#merge_regions
        does the actual geometry; this is the HTTP wrapping around it --
        undo protection, the stale-draft guard every other write already
        gets, and the same promoted-file resync a hand-dragged vertex gets,
        reused rather than re-implemented, since a merge is just another
        way a promoted region's draft ring can change shape.
        """
        from core import reconcile as reconcile_mod

        body = self._body()
        local_ids = body.get("localIds") or []

        with STATE.lock:
            if STATE.draft_changed_underneath():
                fresh = STATE.reload_draft()
                return self._send(409, {
                    "error": "the draft changed on disk since this session loaded it "
                             "-- reload before merging",
                    "draft": fresh,
                })

            try:
                new_items, survivor_id = reconcile_mod.merge_regions(
                    STATE.draft["items"], local_ids)
            except reconcile_mod.MergeError as exc:
                return self._error(409, str(exc))

            if undo_mod.has_real_change(STATE.draft["items"], new_items):
                STATE.undo_stack.push({
                    "items": STATE.draft["items"],
                    "nextLocalId": STATE.draft.get("nextLocalId"),
                    "description": "merged %d regions into one" % len(local_ids),
                    "at": datetime.datetime.now().isoformat(timespec="seconds"),
                })

            STATE.draft["items"] = new_items
            STATE.save_draft()
            resynced = _resync_promoted_region_geometry(STATE.draft["items"])

        self._send(200, {"survivorLocalId": survivor_id, "resyncedLocations": resynced,
                         "draft": STATE.draft})

    def _api_bisect_region(self):
        """Ingram, 2026-09-13: "draw a line from one point on an existing
        line and then describe a complex line and then terminate it on
        another regions line... to split an existing region into two."
        core/reconcile.py#bisect_region does the actual geometry; this is
        the HTTP wrapping -- minting the new region's localId (the one
        thing the pure core module cannot do for itself, since handing out
        ids is session state), then the same undo protection, stale-draft
        guard and promoted-file resync every other region write already
        gets.
        """
        from core import reconcile as reconcile_mod

        body = self._body()
        local_id = body.get("localId")
        cut_points = body.get("cutPoints") or []
        if not local_id:
            return self._error(400, "need localId")

        with STATE.lock:
            if STATE.draft_changed_underneath():
                fresh = STATE.reload_draft()
                return self._send(409, {
                    "error": "the draft changed on disk since this session loaded it "
                             "-- reload before bisecting",
                    "draft": fresh,
                })

            next_id = int(STATE.draft.get("nextLocalId") or 1)
            new_local_id = "item-%d" % next_id

            try:
                new_items, survivor_id, new_id = reconcile_mod.bisect_region(
                    STATE.draft["items"], local_id, cut_points, new_local_id)
            except reconcile_mod.BisectError as exc:
                return self._error(409, str(exc))

            STATE.undo_stack.push({
                "items": STATE.draft["items"],
                "nextLocalId": STATE.draft.get("nextLocalId"),
                "description": "split a region into two",
                "at": datetime.datetime.now().isoformat(timespec="seconds"),
            })

            STATE.draft["items"] = new_items
            STATE.draft["nextLocalId"] = next_id + 1
            STATE.save_draft()
            resynced = _resync_promoted_region_geometry(STATE.draft["items"])

        self._send(200, {"survivorLocalId": survivor_id, "newLocalId": new_id,
                         "resyncedLocations": resynced, "draft": STATE.draft})

    def _api_crop(self, rel):
        """A labelled PNG of the painted map around one item -- see crop.py's
        own docstring. `rel` is `<localId>.png`; the extension is required in
        the URL so the browser's own <img src> can be pointed at this route
        directly without a content-type mismatch."""
        import crop as crop_mod

        if not rel.endswith(".png"):
            return self._error(400, "expected <localId>.png")
        local_id = rel[: -len(".png")]
        item = next((it for it in STATE.draft["items"] if it["localId"] == local_id), None)
        if item is None:
            return self._error(404, "no item %r in the current session" % local_id)
        try:
            data = crop_mod.render_to_bytes(item)
        except crop_mod.CropError as exc:
            return self._error(409, str(exc))
        self._send(200, data, content_type="image/png")

    def _api_requests(self, query):
        """The Claude -> Ingram 'please define this place' queue. See
        core/requests.py's own docstring for why this exists at all.
        `?status=open` narrows to what still needs a look; omitted, every
        request (open and resolved) comes back, so a resolved one is still
        auditable rather than vanishing the moment it is closed."""
        from core import requests as requests_mod

        doc = requests_mod.load()
        status = (query.get("status") or [None])[0]
        items = requests_mod.open_requests(doc) if status == "open" else doc["requests"]
        self._send(200, {"requests": items})

    def _api_create_request(self):
        from core import requests as requests_mod

        body = self._body()
        with STATE.lock:
            doc = requests_mod.load()
            try:
                doc, entry = requests_mod.create(
                    doc, body.get("what"), why=body.get("why"), hint=body.get("hint"))
            except requests_mod.RequestError as exc:
                return self._error(400, str(exc))
            requests_mod.save(doc)
        self._send(200, {"request": entry})

    def _api_resolve_request(self, request_id):
        from core import requests as requests_mod

        body = self._body()
        with STATE.lock:
            doc = requests_mod.load()
            try:
                doc, entry = requests_mod.resolve(
                    doc, request_id, resolution=body.get("resolution"))
            except requests_mod.RequestError as exc:
                # "no such request" is a 404; "already resolved" is a real
                # request in a state the caller's action does not fit, which
                # is what 409 means everywhere else in this file.
                status = 409 if "already resolved" in str(exc) else 404
                return self._error(status, str(exc))
            requests_mod.save(doc)
        self._send(200, {"request": entry})

    def _api_lore_documents(self):
        """The library's own list, with live per-document status the
        registry itself does not store: whether the real file still exists,
        how long it is, and how many instructions are waiting against it.
        Computed fresh rather than cached, because "is this stale" is
        exactly the question a stale cache could not honestly answer.
        """
        from core import lore_library as lore_mod

        library = lore_mod.load_library()
        instructions = lore_mod.load_instructions()
        rows = []
        for entry in library.get("documents") or []:
            row = dict(entry)
            try:
                content = lore_mod.read_document_content(entry)
                row["exists"] = True
                row["wordCount"] = len(content.split())
            except lore_mod.LoreError:
                row["exists"] = False
                row["wordCount"] = 0
            row["pendingInstructions"] = len(
                lore_mod.pending_instructions(instructions, document_id=entry["id"]))
            rows.append(row)
        self._send(200, {"documents": rows})

    def _api_lore_document(self, query):
        from core import lore_library as lore_mod

        document_id = (query.get("id") or [None])[0]
        if not document_id:
            return self._error(400, "need ?id=")
        library = lore_mod.load_library()
        entry = lore_mod.find_document(library, document_id)
        if entry is None:
            return self._error(404, "no document %r in the library" % document_id)
        try:
            content = lore_mod.read_document_content(entry)
        except lore_mod.LoreError as exc:
            return self._error(409, str(exc))
        self._send(200, {
            "document": entry,
            "content": content,
            "outboundLinks": lore_mod.outbound_links(content, library),
            "inboundLinks": lore_mod.inbound_links(library, document_id),
        })

    def _api_save_lore_document(self):
        """Ingram typing directly into the viewer, or Claude applying an
        instruction -- the same save path either way. Approval-style gating
        does not belong here: a document's importance is a signal for HOW
        CAREFULLY an edit should be made and whether it needs asking about
        first, not a lock the server enforces, because the server cannot
        tell a careful edit from a careless one -- only judgement can, which
        is exactly why the standing rule is "ask when unsure," not
        "refuse automatically."""
        from core import lore_library as lore_mod

        body = self._body()
        document_id = (body.get("id") or "").strip()
        if not document_id:
            return self._error(400, "need id")
        content = body.get("content")
        if content is None:
            return self._error(400, "need content")
        library = lore_mod.load_library()
        entry = lore_mod.find_document(library, document_id)
        if entry is None:
            return self._error(404, "no document %r in the library" % document_id)
        try:
            lore_mod.write_document_content(entry, content)
        except lore_mod.LoreError as exc:
            return self._error(409, str(exc))
        self._send(200, {"saved": entry["path"], "wordCount": len(content.split())})

    def _api_add_lore_document(self):
        from core import lore_library as lore_mod

        body = self._body()
        library = lore_mod.load_library()
        try:
            updated = lore_mod.add_document(library, {
                "id": body.get("id"), "path": body.get("path"), "title": body.get("title"),
                "importance": body.get("importance"), "category": body.get("category"),
                "description": body.get("description", ""), "topics": list(body.get("topics") or []),
                "addedDate": datetime.datetime.now().strftime("%Y-%m-%d"),
            })
        except lore_mod.LoreError as exc:
            return self._error(400, str(exc))
        lore_mod.save_library(updated)
        self._send(200, {"library": updated})

    def _api_lore_instructions(self, query):
        from core import lore_library as lore_mod

        doc = lore_mod.load_instructions()
        status = (query.get("status") or [None])[0]
        document_id = (query.get("documentId") or [None])[0]
        items = doc.get("instructions") or []
        if status == "pending":
            items = lore_mod.pending_instructions(doc, document_id=document_id)
        elif document_id:
            items = [i for i in items if i.get("documentId") == document_id]
        self._send(200, {"instructions": items})

    def _api_create_lore_instruction(self):
        from core import lore_library as lore_mod

        body = self._body()
        with STATE.lock:
            doc = lore_mod.load_instructions()
            try:
                doc, entry = lore_mod.create_instruction(doc, body.get("documentId"), body.get("text"))
            except lore_mod.LoreError as exc:
                return self._error(400, str(exc))
            lore_mod.save_instructions(doc)
        self._send(200, {"instruction": entry})

    def _api_resolve_lore_instruction(self, instruction_id):
        from core import lore_library as lore_mod

        body = self._body()
        with STATE.lock:
            doc = lore_mod.load_instructions()
            try:
                doc, entry = lore_mod.resolve_instruction(
                    doc, instruction_id, status=body.get("status", "done"),
                    resolution=body.get("resolution", ""))
            except lore_mod.LoreError as exc:
                status = 409 if "already" in str(exc) else 404
                return self._error(status, str(exc))
            lore_mod.save_instructions(doc)
        self._send(200, {"instruction": entry})

    def _api_biomes(self):
        """What every grid cell is standing on -- see tools/gazetteer/
        biome.py's own docstring for the real-data/district/override
        layering. Served from the cache; a fresh clone or a stale cache
        (a district promoted since, an override edited) needs an explicit
        POST /api/biomes/rebuild rather than this endpoint silently paying
        the ~5-10 second real cost of a full build on some unlucky request."""
        import biome as biome_mod

        from core import biome as biome_core

        cached = biome_mod.load_cached()
        if cached is None:
            if not groundtruth.store_exists():
                return self._error(409, "no biome data yet, and no GeoPackage to "
                                        "build it from -- see biome.py's own house rule")
            cached = biome_mod.build_and_cache(locations_dir=LOCATIONS_DIR)
        self._send(200, {"biomes": cached, "taxonomy": list(biome_core.BIOMES)})

    def _api_rebuild_biomes(self):
        import biome as biome_mod
        from core import biome as biome_core

        if not groundtruth.store_exists():
            return self._error(409, "needs data/map/kurose.gpkg (not in a fresh clone)")
        result = biome_mod.build_and_cache(locations_dir=LOCATIONS_DIR)
        self._send(200, {"biomes": result, "taxonomy": list(biome_core.BIOMES),
                         "cellCount": len(result)})

    def _api_queue(self):
        """What in this session needs attention, grouped by district. See
        core/queue.py's own docstring for why this exists at all."""
        from core import queue as queue_mod

        with STATE.lock:
            session_mod.derive_draft(STATE.draft, STATE.georef)
            result = queue_mod.build(STATE.draft["items"])
        self._send(200, result)

    def _api_handoff(self):
        """The "Copy for Claude" document for a set of selected items.

        Builds each item's shape/depth report fresh (the same modules the
        inspector already calls client-side, run here so the document is
        self-contained and does not depend on the browser having looked at
        every item first) and hands the whole thing to core/handoff.py for
        formatting.
        """
        from core import handoff as handoff_mod

        body = self._body()
        ids = body.get("localIds") or []
        if not ids:
            return self._error(400, "need localIds")

        with STATE.lock:
            session_mod.derive_draft(STATE.draft, STATE.georef)
            items = STATE.draft["items"]

            from core import depth as depth_mod, shape as shape_mod

            # An item that has been promoted is answered for by its location,
            # not by the rough note it was drawn with -- so the depth check
            # runs against the promoted document. Checking the draft item
            # instead reported fully-written places as owing everything.
            all_locations = _load_all_locations()
            by_id = {d["id"]: d for d in all_locations}
            by_local_id = {(d.get("derived") or {}).get("sourceLocalId"): d
                           for d in all_locations
                           if (d.get("derived") or {}).get("sourceLocalId")}

            locations = {}
            shape_reports = {}
            depth_reports = {}
            for item in items:
                if item["localId"] not in ids:
                    continue
                # Either link answers this: the stamp the promote endpoint
                # leaves on the item, or the provenance every promoted
                # document already carries back to the item it came from.
                # Both, so this works for locations promoted before the stamp
                # existed, and for an item whose draft was rebuilt since.
                location = (by_id.get(item.get("locationRef"))
                            or by_local_id.get(item["localId"]))
                if location is not None:
                    locations[item["localId"]] = location
                try:
                    depth_reports[item["localId"]] = depth_mod.check(
                        location if location is not None else item)
                except Exception:
                    pass
                geom = item.get("geometry") or {}
                if (item.get("tier") == "site" and geom.get("kind") == "polygon"
                        and len(geom.get("ringPx") or []) >= 3):
                    try:
                        build = item.get("build") or {}
                        metrics = shape_mod.metrics(
                            geom["ringPx"], metres_per_px=STATE.georef.metres_per_px,
                            height_m=build.get("heightM"), levels=build.get("levels"),
                            height_source=build.get("heightSource"))
                        shape_reports[item["localId"]] = shape_mod.capacity(metrics)
                    except Exception:
                        pass

            doc = handoff_mod.build(
                items, ids, shape_reports=shape_reports, depth_reports=depth_reports,
                session_note=body.get("sessionNote") or "", locations=locations)

        self._send(200, {"markdown": doc})

    def _api_session(self):
        # Containment/adjacency are cheap (tens of milliseconds at this
        # session's size -- see test_containment.py's own timing note) and
        # recomputing them on every GET, not only on save, means a page that
        # only just loaded still shows the right district for a building
        # someone else adopted a minute ago, before anyone has saved again.
        with STATE.lock:
            session_mod.derive_draft(STATE.draft, STATE.georef)
            undo_available = STATE.undo_stack.peek()["description"] if len(STATE.undo_stack) else None
        self._send(200, {"draft": STATE.draft,
                         "summary": session_mod.summarise(STATE.draft),
                         "undoAvailable": undo_available})

    @staticmethod
    def _looks_like_the_same_item(current, incoming):
        """Is the incoming item the same thing the server already has under
        that localId, or a different item wearing a recycled id?

        Only asked when restoring a promotion link onto a payload that has
        lost one (see _api_save_session). Getting this wrong in the generous
        direction is how a brand-new factory ended up stamped as a promoted
        house, so identity is checked rather than assumed: the real building
        it was adopted from, or failing that the shape itself. A false
        negative merely drops a link that a re-promote restores; a false
        positive silently corrupts two locations at once.
        """
        if (current.get("sourceFeatureIds") or incoming.get("sourceFeatureIds")):
            return (list(current.get("sourceFeatureIds") or [])
                    == list(incoming.get("sourceFeatureIds") or []))
        # The DRAWN shape only. The stored copy also carries lon/lat derived
        # onto its geometry at save time, so comparing the whole geometry dict
        # would call a stale tab's unchanged item a different one -- which the
        # stale-save test caught immediately.
        def shape(it):
            g = it.get("geometry") or {}
            return (g.get("kind"), g.get("ringPx"), g.get("pointPx"))
        return shape(current) == shape(incoming)

    def _api_save_session(self):
        body = self._body()
        items = body.get("items")
        if items is None:
            return self._error(400, "need items")
        with STATE.lock:
            if STATE.draft_changed_underneath() and not body.get("force"):
                # Refuse rather than overwrite, and hand back what is actually
                # on disk so the browser can reload instead of guessing.
                fresh = STATE.reload_draft()
                return self._send(409, {
                    "error": "the draft file changed on disk since this "
                             "session loaded it -- saving now would overwrite "
                             "those changes. Reload to pick them up, or send "
                             "force:true to overwrite deliberately.",
                    "draft": fresh,
                    "summary": session_mod.summarise(fresh),
                })

            # A real edit (not a no-op re-save of the same state) gets a
            # snapshot of what it is about to replace pushed onto the undo
            # stack BEFORE anything changes -- see core/undo.py's own
            # docstring for why this is a whole-list snapshot rather than a
            # per-field record, and why it exists at all.
            if undo_mod.has_real_change(STATE.draft["items"], items):
                STATE.undo_stack.push({
                    "items": STATE.draft["items"],
                    "nextLocalId": STATE.draft.get("nextLocalId"),
                    "description": undo_mod.describe_change(STATE.draft["items"], items),
                    "at": datetime.datetime.now().isoformat(timespec="seconds"),
                })

            # Promotion is a one-way door (core/location.py's own words) --
            # once the server has stamped an item with locationRef, an
            # ordinary save must never silently erase that stamp. Found
            # live: a browser tab left open from before three locations were
            # promoted (via a script, not that tab -- but the same thing
            # happens between any two tabs) sent its own, older idea of
            # those items on its next save, unrelated edit elsewhere in the
            # session, and locationRef/locked both reverted to absent. The
            # written lore stayed on disk and was still findable by
            # sourceLocalId (core/promotion.mjs's fallback), so the
            # inspector kept showing it -- but the map's green "locked"
            # outline and the sidebar's [locked] tag both went dark, because
            # the saving tab's payload said, truthfully for what THAT TAB
            # knew, that the item had never been promoted.
            #
            # This only fills a GAP. An item that already carries its own
            # locationRef in the incoming payload -- a tab that DOES know
            # about the promotion -- keeps full control of its own `locked`,
            # Unlock button included; only a payload missing the link
            # entirely gets it restored.
            current_by_local_id = {it["localId"]: it for it in STATE.draft["items"]}
            for item in items:
                current = current_by_local_id.get(item.get("localId"))
                if (current and current.get("locationRef") and not item.get("locationRef")
                        and self._looks_like_the_same_item(current, item)):
                    item["locationRef"] = current["locationRef"]
                    item["locked"] = True

            # A save may not delete a promoted item. The lock that is supposed
            # to protect one is enforced in the browser, against the browser's
            # own copy of `locked` -- so a tab that loaded before a promotion
            # happened believes the item is an ordinary draft and will happily
            # drop it, and the server used to take that at face value. That is
            # exactly how five promoted homes were lost. Deleting one for real
            # means removing its data/locations entry first; until then this
            # keeps it, and says so rather than doing it quietly.
            # `allowDeletePromoted` is the deliberate way out, for a caller that
            # really does mean it -- accidental deletion is what this blocks, not
            # intentional deletion.
            incoming_ids = {it.get("localId") for it in items}
            rescued = []
            if not body.get("allowDeletePromoted"):
                rescued = [it for it in STATE.draft["items"]
                           if it.get("locationRef") and it["localId"] not in incoming_ids]
                if rescued:
                    items = list(items) + rescued

            STATE.draft["items"] = items
            # Never hand out an id twice, even after the highest items are
            # deleted -- see core/session.py's own note on nextLocalId.
            highest = 0
            for it in items:
                digits = "".join(c for c in str(it.get("localId") or "") if c.isdigit())
                if digits:
                    highest = max(highest, int(digits))
            STATE.draft["nextLocalId"] = max(
                int(STATE.draft.get("nextLocalId") or 1),
                int(body.get("nextLocalId") or 1),
                highest + 1)
            problems = session_mod.validate(STATE.draft)
            path = STATE.save_draft()
            resynced = _resync_promoted_region_geometry(STATE.draft["items"])
        self._send(200, {
            "saved": _repo_relative(path),
            "draft": STATE.draft,
            "summary": session_mod.summarise(STATE.draft),
            "problems": problems,
            "keptPromoted": [it["localId"] for it in rescued],
            "resyncedLocations": resynced,
            "undoAvailable": STATE.undo_stack.peek()["description"] if len(STATE.undo_stack) else None,
        })

    def _api_undo(self):
        """Pop the most recent snapshot off the undo stack and restore it.

        Goes through the exact same guards a normal save does -- the
        stale-draft check and the promoted-item rescue -- because a restore
        is still a write to the live draft and the reasons those guards
        exist (another tab, a promotion that happened since) apply just as
        much to undoing an edit as to making one. `force` is accepted for
        the same reason _api_save_session accepts it.
        """
        body = self._body()
        with STATE.lock:
            entry = STATE.undo_stack.pop()
            if entry is None:
                return self._error(409, "nothing to undo")

            if STATE.draft_changed_underneath() and not body.get("force"):
                # Put it back -- this undo did not happen, so it is not
                # spent. The draft on disk needs a look before anything else
                # touches it, the same as a normal save would say.
                STATE.undo_stack.push(entry)
                fresh = STATE.reload_draft()
                return self._send(409, {
                    "error": "the draft file changed on disk since this "
                             "session loaded it -- undoing now would "
                             "overwrite those changes. Reload to pick them "
                             "up, or send force:true to overwrite deliberately.",
                    "draft": fresh,
                    "summary": session_mod.summarise(fresh),
                })

            items = entry["items"]
            incoming_ids = {it.get("localId") for it in items}
            rescued = [it for it in STATE.draft["items"]
                       if it.get("locationRef") and it["localId"] not in incoming_ids]
            if rescued:
                items = list(items) + rescued

            STATE.draft["items"] = items
            STATE.draft["nextLocalId"] = max(
                int(STATE.draft.get("nextLocalId") or 1),
                int(entry.get("nextLocalId") or 1))
            problems = session_mod.validate(STATE.draft)
            path = STATE.save_draft()
            # An undo that puts a region's border back the way it was is
            # still a change to what the border IS -- the exact same reason
            # a normal save resyncs, not a special case of it. Skipping this
            # here would mean undoing a bad drag reverts the draft but
            # leaves the promoted file wearing the bad shape forever.
            resynced = _resync_promoted_region_geometry(STATE.draft["items"])
        self._send(200, {
            "saved": _repo_relative(path),
            "draft": STATE.draft,
            "summary": session_mod.summarise(STATE.draft),
            "problems": problems,
            "undid": entry["description"],
            "keptPromoted": [it["localId"] for it in rescued],
            "resyncedLocations": resynced,
            "undoAvailable": STATE.undo_stack.peek()["description"] if len(STATE.undo_stack) else None,
        })

    def _api_new_session(self):
        with STATE.lock:
            manifest = STATE.georef.manifest
            STATE.draft = session_mod.new_draft(
                map_sha256=(manifest.get("image") or {}).get("sha256"))
            STATE.save_draft()
        self._send(200, {"draft": STATE.draft,
                         "summary": session_mod.summarise(STATE.draft)})


def _repo_relative(path):
    """A path to show in the UI. Falls back to the absolute path rather than
    raising: on Windows os.path.relpath throws outright when the two paths are
    on different drives, and a display string is never worth a 500."""
    try:
        return os.path.relpath(path, _REPO_ROOT).replace("\\", "/")
    except ValueError:
        return path.replace("\\", "/")


def _load_all_locations(directory=None):
    directory = directory or LOCATIONS_DIR
    if not os.path.isdir(directory):
        return []
    out = []
    for name in sorted(os.listdir(directory)):
        if name.endswith(".json"):
            with open(os.path.join(directory, name), encoding="utf-8") as fh:
                out.append(json.load(fh))
    return out


def _save_location(doc, directory=None):
    directory = directory or LOCATIONS_DIR
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, doc["id"] + ".json")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    return path


def _resync_promoted_region_geometry(items):
    """Any promoted region whose draft copy's ringPx no longer matches what
    its data/locations/ file already has gets that file rewritten to match.

    Called from every ordinary session save, not just from
    /api/regions/reconcile: a region's border is now editable by hand
    (draw.js's drawHandles() deliberately gives a locked REGION handles,
    unlike a locked site -- see its own comment) and a hand-dragged vertex
    deserves the exact same sync a reconciled one already gets, or the
    promoted file quietly becomes a second, stale copy of the truth the
    moment anyone drags a corner instead of running reconcile.

    Cheap in the common case -- most saves touch no region geometry at all,
    and the check below is one list-equality comparison per promoted
    region, not a re-derivation of anything.
    """
    promoted_regions = [it for it in items
                        if it.get("tier") == "region" and it.get("locationRef")]
    if not promoted_regions:
        return []

    all_locations = _load_all_locations()
    by_slug = {d["id"]: d for d in all_locations}
    changed_slugs = []
    for item in promoted_regions:
        doc = by_slug.get(item["locationRef"])
        new_ring = (item.get("geometry") or {}).get("ringPx")
        if doc is None or new_ring is None:
            continue
        current_shell = ((doc.get("derived") or {}).get("imagePx") or [None])[0]
        if current_shell == new_ring:
            continue
        location_mod.resync_region_geometry(doc, item, STATE.georef)
        changed_slugs.append(item["locationRef"])

    for slug in changed_slugs:
        location_mod.recompute_region_contents(by_slug[slug], all_locations)
        _save_location(by_slug[slug])
    return changed_slugs


def _build_info(tags, height_m):
    """Storeys and height for one real footprint, and where they came from.

    The provenance matters more than the number. `height_m` in the store is
    already a best effort -- citymap/parse.py takes a real `height` tag, else a
    storey count times 3.3, else a per-building-type DEFAULT. Two thirds of the
    buildings on this sheet are that default, so a floor-area estimate built
    from it without saying so is a guess wearing a measurement's clothes.
    """
    levels = None
    raw = tags.get("building:levels")
    if raw:
        try:
            levels = float(str(raw).split(";")[0].strip())
        except ValueError:
            levels = None
    if tags.get("height"):
        source = "tagged"
    elif levels is not None:
        source = "levels"
    else:
        source = "typical"
    return {
        "levels": levels,
        "heightM": height_m,
        "heightSource": source,
        "building": tags.get("building"),
    }


def _convex_hull(points):
    """Monotone chain. Used to merge several adopted footprints into one shape."""
    pts = sorted(set((round(x, 3), round(y, 3)) for x, y in points))
    if len(pts) <= 2:
        return [list(p) for p in pts]

    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and _cross(out[-2], out[-1], p) <= 0:
                out.pop()
            out.append(p)
        return out

    lower = half(pts)
    upper = half(reversed(pts))
    return [list(p) for p in (lower[:-1] + upper[:-1])]


def _cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def main(argv=None):
    global STATE
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--draft", help="continue a specific session id")
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args(argv)

    STATE = State(draft_id=args.draft)

    if not os.path.isdir(STATE.tile_dir):
        raise SystemExit("no tile pyramid at %s -- run tools/gazetteer/tile.py first"
                         % STATE.tile_dir)

    url = "http://localhost:%d/" % args.port
    print("gazetteer   %s" % url)
    print("map         %dx%d, %s m/px, %d x %d cells of %d m"
          % (STATE.georef.image_w, STATE.georef.image_h, STATE.georef.metres_per_px,
             STATE.georef.cols, STATE.georef.rows,
             STATE.georef.cell_px * STATE.georef.metres_per_px))
    print("session     %s (%d items)" % (STATE.draft["id"], len(STATE.draft["items"])))
    print("ground truth %s" % ("available" if groundtruth.store_exists() else "MISSING"))
    print("suppressed  %d rules" % len(STATE.suppression))

    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    if not args.no_browser:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
