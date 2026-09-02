# -*- coding: utf-8 -*-
"""Fit a template into a polygon drawn in the map editor
(tools/city-map/editor/) -- given an arbitrary user-drawn shape (on land or
in the sea) and the available templates, pick the best-fitting one, its
rotation, and confirm the placement with a REAL dry-run `apply_construct`
(footprint-conflict checking, terrain benching/reclaim, and for on-land
sites, real access-road routing). This is the "propose a site, then verify
it with a real dry run" method already proven by hand for this session's
three Sentinel Tower sites, codified here instead of repeated ad hoc.

Deliberately NOT full polygon-inscribing optimisation: this tries a small,
explainable set of candidate rotations (the drawn polygon's own minimum-
rotated-rectangle orientation, and the nearest road's bearing when one is
close enough for "build parallel to roads" to mean something) against every
known template, largest first, and keeps the first that both fits inside
the drawn polygon and passes construct's own real conflict/routing checks.
"""

from __future__ import annotations

import glob
import math
import os
from dataclasses import dataclass
from typing import List, Optional

from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union

from ..ops import construct as construct_module
from ..ops.log import Operation

STAGE_CODE_VERSION = 1

ROAD_PARALLEL_SEARCH_M = 150.0   # how close a road must be to prefer its bearing
POLYGON_FIT_MARGIN_M = 5.0       # how far a template footprint may poke past the
                                  # drawn polygon and still count as "fits"

# apply_construct's routing window scales with distance to the nearest road
# (half_window ~= 2.5x that distance, construct.py's ROUTING_WINDOW_MIN_M/
# MARGIN_M), so a candidate anchor far from any road turns into a search
# over a huge state-lattice grid (16 headings per cell) -- found the hard
# way: an early version of this module's own test suite left the nearest
# road ~300m from the drawn site and produced a real 45-minute hang before
# the run was manually killed. fit_template tries several template/rotation
# candidates per call, so this cost could otherwise multiply badly. A
# drawn site legitimately this far from any road is realistically an
# offshore/remote site anyway (the offshore path never routes at all), so
# skipping the dry run past this distance costs nothing real.
MAX_ROAD_DISTANCE_FOR_ROUTING_M = 800.0


@dataclass
class SitingResult:
    ok: bool
    template_id: Optional[str] = None
    anchor_lon: Optional[float] = None
    anchor_lat: Optional[float] = None
    rotation_deg: Optional[float] = None
    is_offshore: bool = False
    reason: str = ""
    report: object = None  # the winning dry run's real ConstructReport, for the note text


def load_all_templates(templates_dir: str) -> List[construct_module.Template]:
    templates = []
    for path in sorted(glob.glob(os.path.join(templates_dir, "*.json"))):
        templates.append(construct_module.Template.from_file(path))
    return templates


def _template_footprint_area(template: construct_module.Template) -> float:
    polys = [Polygon(p.footprint) for p in template.parts if p.kind != "line"]
    return unary_union(polys).convex_hull.area if polys else 0.0


def _rectangle_orientation_deg(polygon_map: Polygon) -> float:
    """Bearing of the longer edge of the polygon's minimum rotated rectangle,
    in the same degrees-clockwise-from-north convention apply_construct's
    `rotation` uses."""
    rect = polygon_map.minimum_rotated_rectangle
    coords = list(rect.exterior.coords)
    edges = [(coords[i], coords[i + 1]) for i in range(len(coords) - 1)]
    (x0, y0), (x1, y1) = max(edges, key=lambda e: math.dist(e[0], e[1]))
    return math.degrees(math.atan2(x1 - x0, y1 - y0)) % 180.0


def _nearest_road_bearing_deg(polygon_map: Polygon, fields) -> Optional[float]:
    best_dist, best_bearing = None, None
    for f in fields.features:
        if f.area or not f.tags.get("highway"):
            continue
        d = polygon_map.distance(f.geom)
        if d > ROAD_PARALLEL_SEARCH_M:
            continue
        if best_dist is not None and d >= best_dist:
            continue
        coords = list(f.geom.coords)
        if len(coords) < 2:
            continue
        nearest = min(range(len(coords) - 1),
                     key=lambda i: polygon_map.distance(LineString(coords[i:i + 2])))
        (x0, y0), (x1, y1) = coords[nearest], coords[nearest + 1]
        best_dist = d
        best_bearing = math.degrees(math.atan2(x1 - x0, y1 - y0)) % 180.0
    return best_bearing


def _nearest_road_distance_m(polygon_map: Polygon, fields) -> Optional[float]:
    """Unbounded (unlike _nearest_road_bearing_deg's ROAD_PARALLEL_SEARCH_M
    cap) -- this is the routing-cost guard, not the parallelism preference,
    so it needs the true nearest distance even when that is well past the
    point where "parallel to" stops being a meaningful preference."""
    best = None
    for f in fields.features:
        if f.area or not f.tags.get("highway"):
            continue
        d = polygon_map.distance(f.geom)
        if best is None or d < best:
            best = d
    return best


def fit_template(polygon_lonlat: List[dict], frame, fields, world,
                 templates: List[construct_module.Template], op_id: str,
                 note: str = "") -> SitingResult:
    """`polygon_lonlat`: [{"lon":..., "lat":...}, ...] as drawn in the editor."""
    src_coords = [frame.fwd.transform(p["lon"], p["lat"]) for p in polygon_lonlat]
    polygon_source = Polygon(src_coords)
    if not polygon_source.is_valid:
        polygon_source = polygon_source.buffer(0)
    polygon_map = Polygon([frame.to_map(x, y) for x, y in polygon_source.exterior.coords])

    is_offshore = (world.sea.sea_geom is not None
                  and world.sea.sea_geom.contains(polygon_source.centroid))

    if not is_offshore:
        nearest_road_m = _nearest_road_distance_m(polygon_map, fields)
        if nearest_road_m is None or nearest_road_m > MAX_ROAD_DISTANCE_FOR_ROUTING_M:
            return SitingResult(
                ok=False, is_offshore=False,
                reason=f"no road within {MAX_ROAD_DISTANCE_FOR_ROUTING_M:.0f}m -- "
                       "routing would be prohibitively expensive to even attempt "
                       "(see MAX_ROAD_DISTANCE_FOR_ROUTING_M)")

    rotations = {_rectangle_orientation_deg(polygon_map), _rectangle_orientation_deg(polygon_map) + 90.0}
    road_bearing = None if is_offshore else _nearest_road_bearing_deg(polygon_map, fields)
    if road_bearing is not None:
        rotations = {road_bearing, road_bearing + 90.0}  # parallel to the road wins outright

    anchor_point = polygon_source.representative_point()  # always inside, even for concave shapes
    anchor_lon, anchor_lat = frame.map_to_lonlat(*frame.to_map(anchor_point.x, anchor_point.y))

    anchor_map = frame.to_map(anchor_point.x, anchor_point.y)
    candidates = sorted(templates, key=_template_footprint_area, reverse=True)
    for template in candidates:
        for rotation in sorted(rotations):
            # Cheap geometry check FIRST: apply_construct's dry run does real
            # A* routing, which is the expensive part by far. No point
            # paying for a route to a placement that doesn't even fit the
            # drawn shape.
            parts_map = construct_module._instantiate_parts_map_space(
                template, anchor_map, rotation, op_id)
            footprint_map = unary_union([g for g, part, _ in parts_map if part.kind != "line"])
            if not polygon_map.buffer(POLYGON_FIT_MARGIN_M).contains(footprint_map):
                continue

            op = Operation(id=op_id, op="construct",
                          payload={"template": template.id,
                                  "anchor": {"lon": anchor_lon, "lat": anchor_lat},
                                  "rotation": rotation})
            try:
                _, report = construct_module.apply_construct(world, fields, op, frame, template)
            except Exception:  # noqa: BLE001 - a bad fit can raise from degenerate geometry; just skip it
                continue

            if not report.footprint_clear:
                continue
            if not is_offshore and not report.road_ok:
                continue

            return SitingResult(ok=True, template_id=template.id, anchor_lon=anchor_lon,
                                anchor_lat=anchor_lat, rotation_deg=rotation,
                                is_offshore=is_offshore, report=report,
                                reason=f"fits: {template.id} @ {rotation:.1f} deg")

    return SitingResult(ok=False, is_offshore=is_offshore,
                        reason="no available template fits inside this polygon "
                               "with a clear footprint" +
                               ("" if is_offshore else " and real road access"))
