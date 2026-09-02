# -*- coding: utf-8 -*-
"""Apply data/map/operations/kurose.json to the real cached Kurose World,
rebuild Fields, and render before/after crops at each op's site plus a full
overview. This is the op-log's actual replay loop (design/map-generation.md
§6: render = base world + replay), just not wired into render.py's CLI yet.
"""
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "citymap"))
sys.path.insert(0, os.path.dirname(__file__))

from citymap import acquire, cache, fields as fields_mod, world as world_mod, render
from citymap.frame import Frame
from citymap.ops import construct as construct_mod
from citymap.ops import demolish as demolish_mod
from citymap.ops.log import load_ops
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
w = world_mod.load_world(world_artifact)
print(f"loaded base world: {len(w.features)} features")

frame_key = fields_mod.fields_key_parts(world_key, frame)
frame_artifact = cache.Artifact(cache.artifact_root(REPO_ROOT, "frame"), frame_key)
f = fields_mod.load_fields(frame_artifact, frame)
print(f"loaded base fields: {len(f.features)} map-space features")

ops = load_ops(os.path.join(REPO_ROOT, "data", "map", "operations", "kurose.json"))
print(f"\n{len(ops)} operations to replay:")
for op in ops:
    print(f"  {op.id}: {op.op}  ({op.note})")

dem_cache_dir = os.path.join(
    os.environ.get("TEMP", ""), "claude",
    "E--Mythica-Machina-Business-Blank-Inheritance",
    "a6dc3b76-df33-4055-92f4-6bae83ea1e6f", "scratchpad", "dem-cache")

current_world = w
reports = []
for op in ops:
    t0 = time.perf_counter()
    if op.op == "demolish":
        current_world, report = demolish_mod.apply_demolish(current_world, op, frame)
        print(f"\n[{op.id}] demolish: removed={report.removed_feature_count} "
             f"clipped={report.clipped_feature_count} "
             f"pruned_ways={report.pruned_way_count} {report.pruned_way_ids} "
             f"removed_lamps={report.removed_lamp_count} "
             f"({time.perf_counter()-t0:.2f}s)")
    elif op.op == "construct":
        template = construct_mod.Template.from_file(
            os.path.join(REPO_ROOT, "data", "map", "templates", f"{op.payload['template']}.json"))
        # Re-derive Fields for the CURRENT world state so construct's building-
        # overlap/routing checks see prior ops' edits, not the stale base
        # fields -- cheap here since DEM is file-cached; see below for the
        # equivalent full rebuild after every op in the log is applied.
        current_fields = fields_mod.build_fields(current_world, frame, dem_cache_dir, style)
        current_world, report = construct_mod.apply_construct(
            current_world, current_fields, op, frame, template)
        print(f"\n[{op.id}] construct: parts={len(report.part_feature_ids)} "
             f"demolished_existing={report.demolished_feature_ids} "
             f"road_ok={report.road_ok} ({report.road_reason}) "
             f"road_length={report.road_length_m:.0f}m "
             f"({time.perf_counter()-t0:.2f}s)")
    else:
        raise NotImplementedError(f"op kind {op.op!r} not wired into this script yet")
    reports.append((op, report))

print(f"\nfinal world: {len(current_world.features)} features "
     f"(base had {len(w.features)})")

t0 = time.perf_counter()
final_fields = fields_mod.build_fields(current_world, frame, dem_cache_dir, style)
print(f"final fields rebuilt in {time.perf_counter()-t0:.1f}s")

t0 = time.perf_counter()
overview_tile = frame.full_tile(px=1600)
render.render_tile(final_fields, style, overview_tile).save(
    os.path.join(OUT_DIR, "after_overview.png"))
print(f"after_overview.png rendered in {time.perf_counter()-t0:.1f}s")

for op in ops:
    if op.op == "demolish":
        area = op.payload["area"]
        if "center" in area:
            lon, lat = area["center"]["lon"], area["center"]["lat"]
        else:
            lons = [p["lon"] for p in area["polygon"]]
            lats = [p["lat"] for p in area["polygon"]]
            lon, lat = sum(lons) / len(lons), sum(lats) / len(lats)
    elif op.op == "construct":
        lon, lat = op.payload["anchor"]["lon"], op.payload["anchor"]["lat"]
    else:
        continue
    t0 = time.perf_counter()
    tile = frame.window_tile(lon=lon, lat=lat, extent_m=1200.0, mpp=1.0)
    render.render_tile(final_fields, style, tile).save(
        os.path.join(OUT_DIR, f"after_{op.id}_site.png"))
    print(f"after_{op.id}_site.png rendered in {time.perf_counter()-t0:.1f}s")

print("\ndone.")
