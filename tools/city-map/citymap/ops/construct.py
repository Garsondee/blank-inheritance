"""The `construct` op: place a parametric template, connected to the real
road network by the router.

design/map-generation.md §6: "find the host block; demolish what it overlaps
(as recorded ops, never silent deletions); route an access road by A* over a
cost surface... orient the structure to its frontage; bench a level platform
into the slope." All of this is implemented, including benching: the
convex hull of every part (area AND line, so a perimeter track's own loop
sets the bench's extent) is built up to the MAX elevation sampled at its
vertices -- filling UP to the highest corner, deliberately not cutting DOWN
to the lowest one, because a cut-to-lowest platform leaves the frontage
sitting at unchanged natural grade with no vantage, while filling up to the
highest corner puts the whole pad above the naturally lower ground beyond
it. The actual raster edit happens once per frame in fields.apply_terrain_edits
(see that function's docstring); this module only computes WHERE and to
WHAT elevation, and persists that as a World.TerrainEdit.

**Why routing needs Fields, not just World.** Everything else in the op log
operates on World alone (source CRS, frame-invariant -- see world.py). The
router cannot: it needs real terrain, and terrain only exists per-frame, at a
specific rotation and resolution, in Fields. So construct takes both: Fields
supplies the routing CONTEXT (elevation, rasterised obstacles, the existing
network), and the road it finds is converted back to source CRS before being
added to the World, so the PERSISTED result stays frame-invariant like
everything else in the log, even though computing it needed one frame's view
of the ground.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, replace
from typing import List, Optional, Tuple

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

from .. import ids as ids_module
from ..fields import apply_terrain_edits
from ..parse import Feature
from ..world import TerrainEdit, World
from . import router as router_module

STAGE_CODE_VERSION = 1

ROUTING_WINDOW_MARGIN_M = 200.0
ROUTING_WINDOW_MIN_M = 500.0
ROUTING_CELL_M = 2.0

# --- offshore construction (ideas/entries/offshore-construction.json) -----
# Phase (a) of that plan: anchor-in-sea detection + reclaim-as-returnToSea's-
# -inverse. No causeway yet (phase b/c) -- an offshore anchor gets new land
# and a flat platform, but no access road, until the causeway router exists.
DEFAULT_FREEBOARD_M = 4.0     # metres above sea level (0m, see terrain.py) a
                              # reclaimed platform sits at -- "a few metres",
                              # matching a real artificial island/caisson
                              # platform. Override per-op via payload.freeboardM.
DEFAULT_RECLAIM_MARGIN_M = 15.0  # apron beyond the parts' convex hull that
                                  # becomes new land, so the platform is not
                                  # shrink-wrapped exactly to the buildings
                                  # standing on it. Override via payload.reclaimMarginM.
RECLAIM_EDGE_BLEND_M = 8.0    # tighter than on-land benching's 20m blend: a
                              # reclaimed platform's edge reads as an
                              # engineered seawall, not a natural slope, so
                              # the hillshade transition should be sharper.


@dataclass
class TemplatePart:
    tags: dict
    height_m: float
    footprint: List[Tuple[float, float]]   # local metres; open ring (area) or polyline (line)
    kind: str = "area"                     # "area" -> Polygon, "line" -> LineString


@dataclass
class Template:
    id: str
    name: str
    parts: List[TemplatePart]
    frontage_point: Tuple[float, float]
    frontage_direction: Tuple[float, float]
    access_highway_class: str = "service"

    @classmethod
    def from_dict(cls, raw: dict) -> "Template":
        parts = [TemplatePart(tags=dict(p["tags"]), height_m=float(p.get("heightM", 0.0)),
                              footprint=[tuple(pt) for pt in p["footprint"]],
                              kind=p.get("kind", "area"))
                for p in raw["parts"]]
        frontage = raw["frontage"]
        return cls(id=raw["id"], name=raw.get("name", raw["id"]), parts=parts,
                  frontage_point=tuple(frontage["localPoint"]),
                  frontage_direction=tuple(frontage["localDirection"]),
                  access_highway_class=raw.get("accessRoad", {}).get("highwayClass", "service"))

    @classmethod
    def from_file(cls, path: str) -> "Template":
        import json
        with open(path, encoding="utf-8") as fh:
            return cls.from_dict(json.load(fh))


def _rotate_translate(point: Tuple[float, float], rotation_deg: float,
                      origin: Tuple[float, float]) -> Tuple[float, float]:
    r = math.radians(rotation_deg)
    c, s = math.cos(r), math.sin(r)
    x, y = point
    return (origin[0] + x * c - y * s, origin[1] + x * s + y * c)


def _synthetic_id(kind: str, op_id: str, role: str, index: int = 0) -> int:
    """Negative, deterministic, and disjoint from every real (always
    positive) OSM id -- see module docstring on why replay-stability matters
    here as much as it does for Feature ids (ids.py)."""
    digest = hashlib.sha256(f"{kind}:{op_id}:{role}:{index}".encode()).hexdigest()
    return -int(digest[:12], 16)


def _sample_elevation_bilinear(elevation, frame, mx: float, my: float) -> float:
    """Elevation at one MAP-space point, bilinearly interpolated. NaN outside
    the frame or wherever the DEM itself has no data there."""
    n = elevation.shape[0]
    fox, foy = frame.origin
    col = (mx - fox) / frame.extent_m * n - 0.5
    row = n * (1.0 - (my - foy) / frame.extent_m) - 0.5
    if not (0 <= row <= n - 1 and 0 <= col <= n - 1):
        return float("nan")
    r0, c0 = int(row), int(col)
    r1, c1 = min(r0 + 1, n - 1), min(c0 + 1, n - 1)
    fr, fc = row - r0, col - c0
    e = elevation
    return float(e[r0, c0] * (1 - fr) * (1 - fc) + e[r0, c1] * (1 - fr) * fc
                + e[r1, c0] * fr * (1 - fc) + e[r1, c1] * fr * fc)


def _is_water_feature(f: Feature) -> bool:
    """Mirrors render.py's own water detection (_is_water_polygon plus the
    waterway tag check) so 'is this water' means the same thing everywhere,
    rather than construct silently disagreeing with what actually renders
    blue."""
    if not f.area:
        return bool(f.tags.get("waterway"))
    tags = f.tags
    return (tags.get("natural") == "water" or tags.get("landuse") in {"basin", "reservoir"}
           or bool(tags.get("water")) or tags.get("leisure") == "swimming_pool")


def _is_conflict_candidate(f: Feature) -> bool:
    """Does `f` represent infrastructure a new footprint should never land
    on top of silently -- water, a railway, or a road? "find the host
    block; demolish what it overlaps" (module docstring) applies to
    BUILDINGS only -- a road, railway or river is not something a
    placement tool bulldozes or pipes underground, so a conflict here is
    surfaced on the caller's report, not auto-fixed. Two real bugs this
    caught inside apply_construct, where this used to live as a local
    closure: a site 12m from a live railway (found only by eyeballing a
    screenshot), and a site straddling a real stream (same story) -- this
    check exists so neither ever has to be caught by eye again. Hoisted to
    module level (map-editor plan Phase 9) once citymap.tools.array_place
    became a second real caller -- same de-duplication call as Phase 8's
    thicken_ring/place_along, applied here instead of re-closing over it a
    second time."""
    if _is_water_feature(f):
        return True
    return not f.area and bool(f.tags.get("highway") or f.tags.get("railway"))


def _conflict_label(f: Feature) -> str:
    """A short human-readable tag summary for whatever _is_conflict_candidate
    flagged `f` for -- railway=rail, waterway=stream, natural=water, etc."""
    if f.tags.get("railway"):
        return f"railway={f.tags['railway']}"
    if f.tags.get("waterway"):
        return f"waterway={f.tags['waterway']}"
    if _is_water_feature(f):
        key = next((k for k in ("natural", "water", "landuse", "leisure") if f.tags.get(k)), "water")
        return f"{key}={f.tags.get(key)}"
    return f"highway={f.tags.get('highway')}"


@dataclass
class ConstructReport:
    part_feature_ids: List[str]
    demolished_feature_ids: List[str]
    road_ok: bool
    road_reason: str
    road_length_m: float = 0.0
    terrain_edited: bool = False
    bench_elevation_m: Optional[float] = None
    footprint_clear: bool = True
    footprint_conflicts: List[str] = None  # tag summaries of infrastructure the footprint overlaps
    is_offshore: bool = False
    reclaimed_area_m2: Optional[float] = None

    def __post_init__(self):
        if self.footprint_conflicts is None:
            self.footprint_conflicts = []


def _instantiate_parts_map_space(template: Template, anchor_map: Tuple[float, float],
                                 rotation_deg: float, op_id: str):
    """Each part -> (geom, part, feature_id), geom a Polygon for kind='area'
    or a LineString for kind='line' (see TemplatePart)."""
    out = []
    for i, part in enumerate(template.parts):
        pts = [_rotate_translate(p, rotation_deg, anchor_map) for p in part.footprint]
        if part.kind == "line":
            geom = LineString(pts)
        else:
            geom = Polygon(pts)
            if not geom.is_valid:
                geom = geom.buffer(0)
        feature_id = ids_module.op_feature_id(op_id, "part", i)
        out.append((geom, part, feature_id))
    return out


def apply_construct(world: World, fields, op, frame, template: Template
                    ) -> Tuple[World, ConstructReport]:
    anchor = op.payload["anchor"]
    anchor_map = frame.lonlat_to_map(anchor["lon"], anchor["lat"])
    anchor_source = Point(frame.fwd.transform(anchor["lon"], anchor["lat"]))
    rotation_deg = float(op.payload.get("rotation", 0.0))

    # Anchor-in-sea detection (ideas/entries/offshore-construction.json,
    # phase a) -- forks everything downstream: an offshore anchor needs land
    # reclaimed under it (world.sea is SOURCE CRS, so this check is too)
    # before any of the existing footprint/terrain/routing logic applies.
    is_offshore = world.sea.sea_geom is not None and world.sea.sea_geom.contains(anchor_source)

    parts_map = _instantiate_parts_map_space(template, anchor_map, rotation_deg, op.id)
    # Only AREA parts occupy ground -- a line part (perimeter track, fence)
    # is drawn but must never act as a placement obstacle or overlap
    # candidate, or a template author could never route a patrol road past
    # its own building without the router treating it as blocked.
    area_geoms = [g for g, part, _ in parts_map if part.kind != "line"]
    new_footprint_union = unary_union(area_geoms) if area_geoms else Polygon()
    all_geoms_map = [g for g, _, _ in parts_map]
    bench_polygon_map = unary_union(all_geoms_map).convex_hull

    # "find the host block; demolish what it overlaps" -- buildings only;
    # roads crossing the footprint are left for the operator to notice (a
    # future invariant-check pass, not yet built) rather than silently eaten.
    # This scan runs over fields.features (MAP space, rotated+clipped) purely
    # because that is the space the new footprint is already in -- only the
    # resulting IDS are kept. The World itself is rebuilt from world.features
    # below (SOURCE CRS): World must stay frame-invariant like everywhere else
    # in the op log (see module docstring), and fields.features also already
    # carries the synthesised __sea__ feature (Fields.build_fields unions it
    # in via world.all_features()) which must not be persisted a second time.
    demolished_ids: List[str] = []
    map_kept: List[Feature] = []
    for f in fields.features:
        if f.is_building() and new_footprint_union.intersects(f.geom):
            demolished_ids.append(f.id)
            continue
        map_kept.append(f)

    # New parts, in SOURCE CRS for persistence (see module docstring -- the
    # World stays frame-invariant even though routing below needs this
    # specific frame's terrain). Area parts close into a Polygon (building or
    # landuse fill); line parts stay an open/looped LineString (track, fence).
    new_source_features: List[Feature] = []
    for geom_map, part, feature_id in parts_map:
        if part.kind == "line":
            src_coords = [frame.to_source(x, y) for x, y in geom_map.coords]
            new_source_features.append(Feature(
                id=feature_id, geom=LineString(src_coords), tags=dict(part.tags),
                area=False, height_m=0.0, source=f"op:{op.id}",
            ))
        else:
            src_coords = [frame.to_source(x, y) for x, y in geom_map.exterior.coords]
            new_source_features.append(Feature(
                id=feature_id, geom=Polygon(src_coords), tags=dict(part.tags),
                area=True, height_m=part.height_m, source=f"op:{op.id}",
            ))

    # Does the new footprint land on top of existing infrastructure or
    # water? See _is_conflict_candidate/_conflict_label's own docstrings
    # (module level, above) for the two real bugs this check exists to
    # never have to catch by eye again.
    infra_geoms = [f.geom for f in map_kept if _is_conflict_candidate(f)]
    infra_union = unary_union(infra_geoms) if infra_geoms else None
    footprint_conflicts: List[str] = []
    if infra_union is not None and not infra_union.is_empty and new_footprint_union.intersects(infra_union):
        for f in map_kept:
            if _is_conflict_candidate(f) and new_footprint_union.intersects(f.geom):
                footprint_conflicts.append(_conflict_label(f))

    # --- new land (offshore) or a benched platform (on land) ---------------
    # Offshore: reclaim land the same way returnToSea gives it back -- the
    # exact inverse operation on the same SeaResult (ideas/entries/
    # offshore-construction.json, phase a). The reclaimed footprint is the
    # SAME polygon carved out of world.sea AND set to a flat freeboard
    # elevation, so "is this sea or land" and "is this elevated or not"
    # never disagree.
    #
    # On land: design/map-generation.md §6's own words for what construct
    # does, not optional flourish -- previously unimplemented (this function
    # used to unconditionally report terrain_edited=False). The whole
    # complex -- every part, area AND line, so the perimeter track's own
    # loop sets the bench's extent -- sits on ONE continuous flat terrace,
    # not a separate flat patch under each building with untouched slope
    # still poking through the gaps between them. Target elevation is the
    # MAX sampled at the bench polygon's vertices, i.e. material is built UP
    # to meet the highest corner rather than cut DOWN to the lowest: cutting
    # to the low corner leaves the frontage sitting at unchanged natural
    # grade (no vantage at all), where building up to the high corner puts
    # the whole pad -- frontage included -- above the naturally lower ground
    # beyond it, which is what "facing outward from an installation cut into
    # a hillside" should actually look like.
    new_sea = world.sea
    reclaimed_area_m2: Optional[float] = None
    reclaim_feature: Optional[Feature] = None
    terrain_edit: Optional[TerrainEdit] = None

    if is_offshore:
        reclaim_margin_m = float(op.payload.get("reclaimMarginM", DEFAULT_RECLAIM_MARGIN_M))
        freeboard_m = float(op.payload.get("freeboardM", DEFAULT_FREEBOARD_M))
        reclaim_polygon_map = bench_polygon_map.buffer(reclaim_margin_m)
        reclaim_polygon_source = Polygon(
            [frame.to_source(x, y) for x, y in reclaim_polygon_map.exterior.coords])

        new_sea_geom = world.sea.sea_geom.difference(reclaim_polygon_source)
        new_sea = replace(world.sea, sea_geom=new_sea_geom,
                          area_after_carve_km2=(new_sea_geom.area / 1e6
                                                if new_sea_geom is not None and not new_sea_geom.is_empty
                                                else 0.0))
        reclaimed_area_m2 = reclaim_polygon_source.area
        bench_elevation_m = freeboard_m
        terrain_edit = TerrainEdit(
            id=ids_module.op_feature_id(op.id, "terrain-reclaim", 0),
            polygon=reclaim_polygon_source, target_elevation_m=freeboard_m,
            blend_m=RECLAIM_EDGE_BLEND_M, source=f"op:{op.id}",
        )
        # A flat paved-platform tint under and around the buildings' own
        # footprints, so the apron beyond them doesn't read as a gap of
        # blank paper -- landuse=construction is already a real, rendering
        # style entry (matches demolish.py's leaveLanduse precedent exactly).
        reclaim_feature = Feature(
            id=ids_module.op_feature_id(op.id, "reclaimed-land", 0),
            geom=reclaim_polygon_source, tags={"landuse": "construction"},
            area=True, source=f"op:{op.id}",
        )
    else:
        bench_samples = [_sample_elevation_bilinear(fields.elevation, frame, x, y)
                         for x, y in bench_polygon_map.exterior.coords]
        valid_samples = [s for s in bench_samples if not math.isnan(s)]
        bench_elevation_m = max(valid_samples) if valid_samples else None
        if bench_elevation_m is not None:
            bench_src_coords = [frame.to_source(x, y) for x, y in bench_polygon_map.exterior.coords]
            terrain_edit = TerrainEdit(
                id=ids_module.op_feature_id(op.id, "terrain-bench", 0),
                polygon=Polygon(bench_src_coords), target_elevation_m=bench_elevation_m,
                blend_m=20.0, source=f"op:{op.id}",
            )

    routing_elevation = fields.elevation
    if terrain_edit is not None:
        # The router must see the SAME benched/reclaimed surface the
        # structure will actually sit on, or its cost surface right at the
        # pad edge is computed against terrain that is about to stop existing.
        routing_elevation = apply_terrain_edits(fields.elevation, frame, [terrain_edit])

    # --- route the access road, in MAP space (needs real terrain) ---------
    # Offshore: no causeway router yet (ideas/entries/offshore-construction
    # .json phase b/c) -- the platform gets new land but no access, and the
    # report says so plainly rather than pretending "no road network in
    # range" was the reason.
    road_ok, road_reason, road_length = False, "no existing road network in range", 0.0
    road_source_feature: Optional[Feature] = None
    graph_additions: dict = {}

    if is_offshore:
        road_reason = ("offshore construct -- causeway routing not yet implemented "
                       "(ideas/entries/offshore-construction.json, phase b/c)")
    else:
        frontage_map = _rotate_translate(template.frontage_point, rotation_deg, anchor_map)
        dir_map = _rotate_translate(
            (template.frontage_direction[0] + template.frontage_point[0],
            template.frontage_direction[1] + template.frontage_point[1]),
            rotation_deg, anchor_map)
        approach_dx = dir_map[0] - frontage_map[0]
        approach_dy = dir_map[1] - frontage_map[1]
        approach_len = math.hypot(approach_dx, approach_dy) or 1.0
        start_map = (frontage_map[0] + approach_dx / approach_len * 4.0,
                    frontage_map[1] + approach_dy / approach_len * 4.0)

        obstacle_geoms = [f.geom for f in map_kept if f.is_building()]
        obstacle_geoms.append(new_footprint_union)
        obstacles_map = unary_union(obstacle_geoms) if obstacle_geoms else None

        compatible = {"motorway", "trunk", "primary", "secondary", "tertiary",
                     "residential", "unclassified", "service", "track"}
        road_geoms = [f.geom for f in map_kept
                     if not f.area and f.tags.get("highway") in compatible]
        existing_roads_map = unary_union(road_geoms) if road_geoms else None

        half_window = max(ROUTING_WINDOW_MIN_M,
                          2.5 * (existing_roads_map.distance(Point(*start_map))
                                if existing_roads_map is not None and not existing_roads_map.is_empty
                                else ROUTING_WINDOW_MIN_M)) + ROUTING_WINDOW_MARGIN_M
        window_bounds = (start_map[0] - half_window, start_map[1] - half_window,
                         start_map[0] + half_window, start_map[1] + half_window)

        if existing_roads_map is not None and not existing_roads_map.is_empty:
            grid = router_module.build_routing_grid(
                routing_elevation, frame.extent_m, frame.origin, window_bounds,
                obstacles_map, existing_roads_map, cell_m=ROUTING_CELL_M,
            )
            result = router_module.route(grid, start_map, highway_class=template.access_highway_class)
            road_ok, road_reason = result.ok, result.reason
            if result.ok:
                full_path = [frontage_map] + result.path_map
                simplified = router_module.simplify_path(full_path, tolerance_m=3.0)
                road_length = LineString(simplified).length

                # Snap the far end to the nearest REAL road-graph node, so the
                # new road becomes a genuine graph edge rather than a geometric
                # line that merely happens to touch another one.
                end_map = simplified[-1]
                nearest_node, nearest_dist = None, math.inf
                for node_id, (nx, ny) in world.road_graph.node_xy.items():
                    nx_map, ny_map = frame.to_map(nx, ny)
                    d = math.hypot(nx_map - end_map[0], ny_map - end_map[1])
                    if d < nearest_dist:
                        nearest_dist, nearest_node = d, node_id
                if nearest_node is not None and nearest_dist < half_window:
                    simplified[-1] = frame.to_map(*world.road_graph.node_xy[nearest_node])

                src_coords = [frame.to_source(x, y) for x, y in simplified]
                road_id = ids_module.op_feature_id(op.id, "access-road", 0)
                road_source_feature = Feature(
                    id=road_id, geom=LineString(src_coords),
                    tags={"highway": template.access_highway_class}, area=False,
                    source=f"op:{op.id}", osm_way_id=_synthetic_id("way", op.id, "access-road"),
                )
                graph_additions = {
                    "way_id": road_source_feature.osm_way_id,
                    "highway_class": template.access_highway_class,
                    "points_source": src_coords,
                    "far_node_id": nearest_node,
                }

    demolished_id_set = set(demolished_ids)
    final_features = [f for f in world.features if f.id not in demolished_id_set]
    if reclaim_feature is not None:
        final_features.append(reclaim_feature)
    final_features.extend(new_source_features)
    if road_source_feature is not None:
        final_features.append(road_source_feature)

    new_graph = world.road_graph.copy()
    if graph_additions:
        _splice_road_into_graph(new_graph, graph_additions, op.id)

    new_terrain_edits = list(world.terrain_edits)
    if terrain_edit is not None:
        new_terrain_edits.append(terrain_edit)

    new_world = World(
        features=final_features, road_graph=new_graph, rail_graph=world.rail_graph,
        lamps=world.lamps, sea=new_sea, crs_epsg=world.crs_epsg,
        terrain_edits=new_terrain_edits,
    )
    report = ConstructReport(
        part_feature_ids=[fid for _, _, fid in parts_map],
        demolished_feature_ids=demolished_ids,
        road_ok=road_ok, road_reason=road_reason, road_length_m=road_length,
        terrain_edited=terrain_edit is not None, bench_elevation_m=bench_elevation_m,
        footprint_clear=not footprint_conflicts, footprint_conflicts=footprint_conflicts,
        is_offshore=is_offshore, reclaimed_area_m2=reclaimed_area_m2,
    )
    return new_world, report


def _splice_road_into_graph(graph, additions: dict, op_id: str) -> None:
    points = additions["points_source"]
    way_id = additions["way_id"]
    node_ids = []
    for i, (x, y) in enumerate(points):
        if i == len(points) - 1 and additions["far_node_id"] is not None:
            node_ids.append(additions["far_node_id"])
            continue
        nid = _synthetic_id("node", op_id, "access-road", i)
        graph.node_xy[nid] = (x, y)
        node_ids.append(nid)
    graph.way_nodes[way_id] = node_ids
    graph.way_class[way_id] = additions["highway_class"]
    for nid in node_ids:
        # node_ways is a plain dict after RoadGraph.copy()/load_world() (never
        # a defaultdict -- see parse.py), so a brand-new synthetic node id
        # must be seeded explicitly or this KeyErrors.
        graph.node_ways.setdefault(nid, set()).add(way_id)
