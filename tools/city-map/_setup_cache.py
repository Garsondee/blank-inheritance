# -*- coding: utf-8 -*-
"""One-time setup: build the real Kurose World+Fields and persist them into
citymap's own cache/ tree, so every subsequent op-log experiment loads in
seconds instead of repaying a ~4 minute OSM+DEM fetch each time. Reuses the
scratchpad's already-fetched Overpass/DEM cache to avoid a redundant network
round-trip; the OUTPUT lands in tools/city-map/cache/ (the tool's own,
committed-to layout) either way.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "citymap"))
sys.path.insert(0, os.path.dirname(__file__))

from citymap import acquire, cache, fields, world
from citymap.frame import Frame
from citymap.style import Style

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRATCH = os.path.join(
    os.environ.get("TEMP", ""), "claude",
    "E--Mythica-Machina-Business-Blank-Inheritance",
    "a6dc3b76-df33-4055-92f4-6bae83ea1e6f", "scratchpad")

frame = Frame(id="kurose-12km", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674,
             dem_grid=2048, dem_zoom=15)
style = Style.from_file(os.path.join(REPO_ROOT, "data", "map", "style", "kurose-1950s.json"))

t0 = time.perf_counter()
south, west, north, east = frame.fetch_bbox_lonlat(margin=1.0, pad_m=world.FETCH_PAD_M)
query = acquire.build_overpass_query(south, west, north, east)
data = acquire.fetch_overpass(query, os.path.join(SCRATCH, "osm-cache"))
boundary = frame.classification_boundary(margin=1.0)
w = world.build_world(data["elements"], frame.fwd, boundary, frame.crs_epsg)
print(f"world: {len(w.features)} features, sea {w.sea.area_after_carve_km2:.1f}km2, "
     f"{time.perf_counter()-t0:.1f}s")

world_dir = cache.artifact_root(REPO_ROOT, "world")
world_key = world.world_key_parts(query, frame.crs_epsg)
world_artifact = cache.Artifact(world_dir, world_key)
world.save_world(w, world_artifact)
print("world saved to", world_artifact.dir)

t0 = time.perf_counter()
f = fields.build_fields(w, frame, os.path.join(SCRATCH, "dem-cache"), style)
print(f"fields: elevation {f.elevation.shape}, DEM {f.dem_tiles_fetched} fetched/"
     f"{f.dem_tiles_missing} missing, {time.perf_counter()-t0:.1f}s")

frame_dir = cache.artifact_root(REPO_ROOT, "frame")
frame_key = fields.fields_key_parts(world_key, frame)
frame_artifact = cache.Artifact(frame_dir, frame_key)
fields.save_fields(f, frame_artifact)
print("fields saved to", frame_artifact.dir)

print("\nworld_key =", world_key)
print("frame_key =", frame_key)
