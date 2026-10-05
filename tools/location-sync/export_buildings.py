#!/usr/bin/env python
"""Export the real buildings on the campaign map as one small static file Foundry can read.

    python tools/location-sync/export_buildings.py              write data/map/buildings-index.json
    python tools/location-sync/export_buildings.py --check      exit 1 if that file is not what the store gives now
    python tools/location-sync/export_buildings.py --stats      print what would be written, write nothing

Why this exists (design/location-editor.md section 7): the Location Editor runs inside Foundry, which cannot read the 123 MB
GeoPackage (data/map/kurose.gpkg), so the real footprints were never visible there and a real building could not be adopted by clicking it.
This is the "static, grid-bucketed export" that section asks for, except that the bucketing is left to the reader: the file is a flat list.

What is in it. Every building in the store (a feature whose tags carry `building`) whose middle lies on the campaign map's content area,
on LAND by the painted map (tools/location-sync/landmask.py: the coastline is authored, not OpenStreetMap's, so a building OSM puts on
the airport that is under the sea on this map is not offered), as its outline in the map image's own pixels (12400 x 12400, the same space as a
location's derived.imagePx, so Foundry draws and hit-tests it exactly as it does a location). Holes are dropped: a footprint is its outer ring.
Tiny outbuildings (under MIN_AREA_M2) are dropped unless they carry a name, because nobody sites a scene in a shed.

Format (version 1), kept small on purpose (about 70,000 buildings):
    { "kind": "buildings-index", "version": 1, "image": [w, h], "units": "image px",
      "kinds": ["yes", "house", ...],                 the building=* values, by index
      "buildings": [ [id, kindIndex, name|null, areaM2, [x0, y0, dx1, dy1, dx2, dy2, ...]], ... ] }
A ring is its first vertex then each next vertex as a step from the one before (integers; the closing vertex is implied). `id` is the
store's stable feature id: it is how a location made from a building can say which real building it is.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))
for p in (_HERE, os.path.join(_REPO, "tools", "city-map")):
    if p not in sys.path:
        sys.path.insert(0, p)

from citymap.store import gpkg  # noqa: E402
from core.georef import MapGeoref  # noqa: E402

STORE = os.path.join(_REPO, "data", "map", "kurose.gpkg")
OUTPUT = os.path.join(_REPO, "data", "map", "buildings-index.json")
MIN_AREA_M2 = 12.0
VERSION = 1


def ring_steps(points):
    """[(x, y), ...] -> [x0, y0, dx1, dy1, ...] with integer coordinates and no repeated or closing vertex."""
    out = []
    last = None
    for x, y in points:
        p = (int(round(x)), int(round(y)))
        if p == last:
            continue
        out.append(p)
        last = p
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    if len(out) < 3:
        return None
    flat = [out[0][0], out[0][1]]
    px, py = out[0]
    for x, y in out[1:]:
        flat += [x - px, y - py]
        px, py = x, y
    return flat


def _area(points):
    s = 0.0
    n = len(points)
    for i in range(n):
        x0, y0 = points[i]
        x1, y1 = points[(i + 1) % n]
        s += x0 * y1 - x1 * y0
    return abs(s) / 2.0


def collect(store_path=STORE, georef=None, land=None, min_area=MIN_AREA_M2):
    """The buildings, as (id, kind, name, areaM2, flatRing) rows, plus counts of what was left out and why."""
    georef = georef or MapGeoref.load()
    w, h = georef.image_w, georef.image_h
    corners = [georef.image_px_to_source(x, y) for x, y in ((0, 0), (w, 0), (0, h), (w, h))]
    minx, maxx = min(c[0] for c in corners), max(c[0] for c in corners)
    miny, maxy = min(c[1] for c in corners), max(c[1] for c in corners)
    conn = gpkg.connect(store_path)
    try:
        rows = gpkg.query_features_bbox(conn, minx, miny, maxx, maxy)
    finally:
        conn.close()
    out = []
    left = {"notBuilding": 0, "notPolygon": 0, "offMap": 0, "atSea": 0, "tiny": 0, "degenerate": 0}
    prepared = None
    if land is not None:
        from shapely.prepared import prep
        prepared = prep(land)
    from shapely.geometry import Point
    for kw in rows:
        tags = kw.get("tags") or {}
        if isinstance(tags, str):
            tags = json.loads(tags)
        if not tags.get("building"):
            left["notBuilding"] += 1
            continue
        geom = kw["geom"]
        if geom is None or geom.geom_type not in ("Polygon", "MultiPolygon"):
            left["notPolygon"] += 1
            continue
        poly = geom if geom.geom_type == "Polygon" else max(geom.geoms, key=lambda g: g.area)
        pts = [georef.source_to_image_px(x, y) for x, y in poly.exterior.coords]
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        if not (0 <= cx < w and 0 <= cy < h):
            left["offMap"] += 1
            continue
        if prepared is not None and not prepared.contains(Point(cx, cy)):
            left["atSea"] += 1
            continue
        area = _area(pts)                       # image px are metres: 1 m per px
        name = tags.get("name") or None
        if area < min_area and not name:
            left["tiny"] += 1
            continue
        flat = ring_steps(pts)
        if flat is None:
            left["degenerate"] += 1
            continue
        out.append((kw["id"], str(tags["building"]), name, int(round(area)), flat))
    out.sort(key=lambda r: r[0])                # a stable file: the same store gives the same bytes
    return out, left


def document(rows, georef=None):
    georef = georef or MapGeoref.load()
    kinds = sorted({r[1] for r in rows})
    index = {k: i for i, k in enumerate(kinds)}
    return {
        "$schema": "../schema/buildings-index.schema.json",
        "kind": "buildings-index",
        "version": VERSION,
        "image": [georef.image_w, georef.image_h],
        "units": "image px",
        "kinds": kinds,
        "buildings": [[r[0], index[r[1]], r[2], r[3], r[4]] for r in rows],
    }


def serialise(doc):
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def _land():
    try:
        from core import landmask  # noqa: F401
    except Exception:
        pass
    import landmask as lm
    try:
        _, land, _ = lm.load()
        return land
    except Exception as err:                    # no cache: the coastline is authored, so say so and offer every building
        print("landmask cache not found (%s): buildings at sea are NOT filtered out" % err, file=sys.stderr)
        return None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="exit 1 if the file differs from what the store gives now")
    ap.add_argument("--stats", action="store_true", help="print the counts and write nothing")
    ap.add_argument("--store", default=STORE)
    ap.add_argument("--out", default=OUTPUT)
    args = ap.parse_args(argv)

    georef = MapGeoref.load()
    rows, left = collect(args.store, georef, _land())
    doc = document(rows, georef)
    text = serialise(doc)
    print("%d buildings, %d kinds, %.2f MB; left out: %s" % (len(rows), len(doc["kinds"]), len(text.encode("utf-8")) / 1e6,
                                                           ", ".join("%s %d" % kv for kv in left.items())))
    if args.stats:
        return 0
    if args.check:
        try:
            have = open(args.out, encoding="utf-8").read()
        except OSError:
            have = ""
        if have != text:
            print("%s is not what the store gives now: run python tools/location-sync/export_buildings.py" % os.path.relpath(args.out, _REPO), file=sys.stderr)
            return 1
        print("%s is current" % os.path.relpath(args.out, _REPO))
        return 0
    with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print("wrote %s" % os.path.relpath(args.out, _REPO))
    return 0


if __name__ == "__main__":
    sys.exit(main())
