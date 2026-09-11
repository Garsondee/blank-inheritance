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

from core import groundtruth, location as location_mod, overrides as overrides_mod, session as session_mod  # noqa: E402
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

    @property
    def conn(self):
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = groundtruth.open_store()
            self._local.conn = conn
        return conn

    def refresh_suppression(self):
        self.suppression = overrides_mod.Suppression(self.overrides)

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
        """
        for item in self.draft["items"]:
            try:
                session_mod.derive_item(item, self.georef)
            except Exception:
                item["derived"] = {}
        return session_mod.save(self.draft, session_mod.draft_path(self.draft["id"]))


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
            if path == "/api/promote":
                return self._api_promote()
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
        """Which building is under this pixel. Topmost-smallest wins: in a
        dense block the small building you clicked is almost always the one you
        meant, not the large complex whose bounding box also contains it."""
        body = self._body()
        x, y = float(body["x"]), float(body["y"])
        pad = float(body.get("tolerancePx", 2.0))
        rows = groundtruth.features_in_image_rect(
            STATE.conn, STATE.georef, x - pad, y - pad, x + pad, y + pad)

        hits = []
        for row in rows:
            tags = row.get("tags") or {}
            if not tags.get("building"):
                continue
            rings = groundtruth.geom_to_image_rings(row.get("geom"), STATE.georef)
            if not rings:
                continue
            ring = rings[0]
            if not overrides_mod._point_in_ring(x, y, ring):
                continue
            cx = sum(p[0] for p in ring) / len(ring)
            cy = sum(p[1] for p in ring) / len(ring)
            if STATE.suppression.hides(row["id"], (cx, cy)):
                continue
            from core.grid import polygon_area_px
            hits.append((polygon_area_px(ring), row["id"], ring, tags, row.get("height_m")))

        hits.sort(key=lambda h: h[0])
        self._send(200, {"hits": [{
            "id": h[1],
            "ringPx": [[round(px, 1), round(py, 1)] for px, py in h[2]],
            "areaM2": round(h[0] * STATE.georef.metres_per_px ** 2, 1),
            "name": h[3].get("name") or h[3].get("name:en") or "",
            "nameJa": h[3].get("name:ja") or "",
            "building": h[3].get("building"),
            "levels": h[3].get("building:levels"),
            "heightM": h[4],
        } for h in hits]})

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

    def _api_locations(self):
        """Every promoted location, with geometry converted to image pixels so
        the client can draw them straight onto the same Leaflet CRS.Simple map
        it draws everything else on -- no lon/lat handling in the browser."""
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
                "pointPx": image_px, "ringsPx": rings_px,
            })
        self._send(200, {"locations": out})

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

        dest = os.path.join(LOCATIONS_DIR, location_id + ".json")
        if os.path.exists(dest) and not body.get("overwrite"):
            return self._error(409, "data/locations/%s.json already exists" % location_id)

        with STATE.lock:
            existing = _load_all_locations()
            existing_regions = [d for d in existing if d["tier"] == "region"]
            doc = location_mod.build_location(
                item, location_id, STATE.georef,
                lore=body.get("lore"), name=body.get("name"), nameJa=body.get("nameJa"),
                session_id=STATE.draft["id"], existing_regions=existing_regions,
                status=body.get("status"))

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

        self._send(200, {"saved": _repo_relative(dest), "location": doc})

    def _api_session(self):
        self._send(200, {"draft": STATE.draft,
                         "summary": session_mod.summarise(STATE.draft)})

    def _api_save_session(self):
        body = self._body()
        items = body.get("items")
        if items is None:
            return self._error(400, "need items")
        with STATE.lock:
            STATE.draft["items"] = items
            problems = session_mod.validate(STATE.draft)
            path = STATE.save_draft()
        self._send(200, {
            "saved": _repo_relative(path),
            "draft": STATE.draft,
            "summary": session_mod.summarise(STATE.draft),
            "problems": problems,
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
