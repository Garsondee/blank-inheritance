# -*- coding: utf-8 -*-
"""Load the real cached Kurose World+Fields (built by _setup_cache.py) and:
1. render a full-frame BEFORE overview, so a bunker site can be chosen by eye
2. report Kobe Airport's real feature extent, so the demolish op's radius is
   measured against real data instead of guessed
"""
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "citymap"))
sys.path.insert(0, os.path.dirname(__file__))

from citymap import acquire, cache, fields as fields_mod, world as world_mod, render
from citymap.frame import Frame
from citymap.style import Style

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(REPO_ROOT, "tools", "city-map", "_out")
os.makedirs(OUT_DIR, exist_ok=True)

frame = Frame.from_file(os.path.join(REPO_ROOT, "data", "map", "frames", "kurose-12km.json"))
style = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))

south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=world_mod.FETCH_PAD_M)
query = acquire.build_overpass_query(south, west, north, east)
world_key = world_mod.world_key_parts(query, frame.crs_epsg)
world_artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "world"), world_key)
assert world_artifact.exists(), f"expected cached world at {world_artifact.dir}"
w = world_mod.load_world(world_artifact)
print(f"loaded world: {len(w.features)} features")

frame_key = fields_mod.fields_key_parts(world_key, frame)
frame_artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "frame"), frame_key)
assert frame_artifact.exists(), f"expected cached fields at {frame_artifact.dir}"
f = fields_mod.load_fields(frame_artifact, frame)
print(f"loaded fields: elevation {f.elevation.shape}, {len(f.features)} map-space features")

overview_path = os.path.join(OUT_DIR, "before_overview.png")
if not os.path.exists(overview_path):
    t0 = time.perf_counter()
    overview_tile = frame.full_tile(px=1600)
    img = render.render_tile(f, style, overview_tile)
    img.save(overview_path)
    print(f"before_overview.png rendered in {time.perf_counter()-t0:.1f}s")
else:
    print("before_overview.png already exists, skipping re-render")

# --- Kobe Airport real extent ------------------------------------------
airport_lon, airport_lat = 135.2238, 34.6328
ax, ay = frame.fwd.transform(airport_lon, airport_lat)
near = [x for x in w.features
       if (x.tags.get("aeroway") or x.tags.get("landuse") == "military"
           or "airport" in (x.tags.get("name", "") + x.tags.get("name:en", "")).lower())
       and x.geom.distance(__import__("shapely.geometry", fromlist=["Point"]).Point(ax, ay)) < 3000]
print(f"\n{len(near)} airport-tagged features within 3000m of the known airport point:")
minx = miny = float("inf")
maxx = maxy = float("-inf")
for feat in near:
    b = feat.geom.bounds
    minx, miny = min(minx, b[0]), min(miny, b[1])
    maxx, maxy = max(maxx, b[2]), max(maxy, b[3])
    print(f"  {feat.id[:16]} {dict(list(feat.tags.items())[:4])} way={feat.osm_way_id}")
if near:
    cx_, cy_ = (minx + maxx) / 2, (miny + maxy) / 2
    print(f"\ncombined bounds (source CRS): x[{minx:.1f},{maxx:.1f}] y[{miny:.1f},{maxy:.1f}]")
    print(f"size: {maxx-minx:.0f}m x {maxy-miny:.0f}m, centroid src=({cx_:.1f},{cy_:.1f})")
    clon, clat = frame.inv.transform(cx_, cy_)
    print(f"centroid lon/lat: {clon:.6f}, {clat:.6f}")
    import math
    radius_needed = math.hypot(maxx - minx, maxy - miny) / 2
    print(f"radius to cover full bounds from centroid: {radius_needed:.0f}m")

# --- bridge(s) reaching the airport --------------------------------------
print("\nways tagged bridge=yes within 3000m of the airport point:")
from shapely.geometry import Point
pt = Point(ax, ay)
for feat in w.features:
    if feat.area or feat.tags.get("bridge") in (None, "no"):
        continue
    if feat.geom.distance(pt) < 3000:
        print(f"  way={feat.osm_way_id} highway={feat.tags.get('highway')} "
             f"len={feat.geom.length:.0f}m dist={feat.geom.distance(pt):.0f}m")
