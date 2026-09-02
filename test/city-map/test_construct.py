"""construct op tests. The central fixture places a template building on top
of an existing shed (which must be demolished) near an existing dead-end road
(which the new access road must reach, turning it into a real junction) with
an unrelated building and an unrelated dead-end elsewhere (which must both
survive untouched).
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.fields import Fields, rotate_and_clip  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops import construct  # noqa: E402
from citymap.ops.log import Operation  # noqa: E402
from citymap.parse import Feature, RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.world import World  # noqa: E402

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
MECH_BUNKER_TEMPLATE_PATH = os.path.join(
    REPO_ROOT, "data", "map", "templates", "mech-bunker.json")

NO_SEA = SeaResult(None, 0, 0, 0, 0, 0.0, 0.0)


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


def make_frame(extent_m=2000.0, dem_grid=64):
    return Frame(id="t", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
                extent_m=extent_m, crs_epsg=6674, dem_grid=dem_grid)


def make_template():
    return construct.Template(
        id="test-bunker", name="Test Bunker",
        parts=[construct.TemplatePart(
            tags={"building": "bunker"}, height_m=9.0,
            footprint=[(-10.0, -10.0), (10.0, -10.0), (10.0, 10.0), (-10.0, 10.0)])],
        frontage_point=(0.0, -10.0), frontage_direction=(0.0, -1.0),
        access_highway_class="service",
    )


def make_fields(world, frame):
    map_features = rotate_and_clip(world.all_features(), frame)
    elevation = np.full((frame.dem_grid, frame.dem_grid), 10.0, dtype=np.float32)
    shade = np.zeros((frame.dem_grid, frame.dem_grid, 3), dtype=np.uint8)
    return Fields(frame=frame, features=map_features, lamps=[],
                 elevation=elevation, shade_rgb=shade, sea_depth_t=None,
                 dem_tiles_fetched=0, dem_tiles_missing=0)


def make_op(frame, anchor_map=None, rotation=0.0, op_id="op-0001"):
    if anchor_map is None:
        anchor_map = (frame.cx, frame.cy)
    lon, lat = frame.map_to_lonlat(*anchor_map)
    return Operation(id=op_id, op="construct",
                     payload={"anchor": {"lon": lon, "lat": lat}, "rotation": rotation})


def make_fixture(with_road=True):
    """mainland-side dead-end (node_a, far) --existing-road-- near dead-end
    (node_b, close to the anchor). old-shed sits where the new bunker lands;
    far-house sits well clear of it. Returns (world, fields, frame, template, op).
    """
    frame = make_frame()
    cx, cy = frame.cx, frame.cy

    graph = RoadGraph()
    features = [
        Feature(id="old-shed", geom=square(cx, cy, 5.0),
               tags={"building": "shed"}, area=True, height_m=3.0, osm_way_id=501),
        Feature(id="far-house", geom=square(cx + 700.0, cy + 700.0, 5.0),
               tags={"building": "house"}, area=True, height_m=6.0, osm_way_id=502),
    ]

    if with_road:
        node_a = (cx - 300.0, cy - 110.0)
        node_b = (cx + 50.0, cy - 110.0)
        graph.node_xy[1001] = node_a
        graph.node_xy[1002] = node_b
        graph.way_nodes[42] = [1001, 1002]
        graph.way_class[42] = "service"
        graph.node_ways[1001].add(42)
        graph.node_ways[1002].add(42)
        features.append(Feature(id="existing-road", geom=LineString([node_a, node_b]),
                                tags={"highway": "service"}, area=False, osm_way_id=42))

    world = World(features=features, road_graph=graph, lamps=[], sea=NO_SEA, crs_epsg=6674)
    fields = make_fields(world, frame)
    template = make_template()
    op = make_op(frame)
    return world, fields, frame, template, op


class TestBuildingPlacement(unittest.TestCase):
    def test_new_building_part_is_added(self):
        world, fields, frame, template, op = make_fixture()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        parts = [f for f in new_world.features if f.source == f"op:{op.id}" and f.is_building()]
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0].tags["building"], "bunker")
        self.assertEqual(parts[0].height_m, 9.0)
        self.assertEqual(parts[0].id, report.part_feature_ids[0])

    def test_overlapping_building_is_demolished(self):
        world, fields, frame, template, op = make_fixture()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertEqual(report.demolished_feature_ids, ["old-shed"])
        self.assertNotIn("old-shed", [f.id for f in new_world.features])

    def test_unrelated_building_survives(self):
        world, fields, frame, template, op = make_fixture()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        self.assertIn("far-house", [f.id for f in new_world.features])

    def test_no_stray_sea_or_duplicate_features(self):
        """Regression: an earlier draft built the new World from Fields'
        already-rotated feature list (which also carries the synthesised
        __sea__ polygon) instead of World's own source-CRS features, which
        would have both persisted map-space geometry into the frame-invariant
        World and doubled the sea polygon on every construct."""
        world, fields, frame, template, op = make_fixture()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        self.assertEqual(len(new_world.features), 4)  # far-house, existing-road, +1 part, +1 road
        self.assertFalse(any(f.tags.get("__sea__") for f in new_world.features))


class TestAccessRoad(unittest.TestCase):
    def test_road_is_created_and_reaches_the_close_node(self):
        world, fields, frame, template, op = make_fixture()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.road_ok, report.road_reason)
        roads = [f for f in new_world.features
                if f.source == f"op:{op.id}" and f.tags.get("highway") == "service"]
        self.assertEqual(len(roads), 1)
        way_id = roads[0].osm_way_id
        self.assertIn(way_id, new_world.road_graph.way_nodes)
        last_node = new_world.road_graph.way_nodes[way_id][-1]
        self.assertEqual(last_node, 1002)  # the close dead-end, not the far one

    def test_splice_increases_degree_only_at_the_joined_node(self):
        world, fields, frame, template, op = make_fixture()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.road_ok, report.road_reason)
        self.assertEqual(world.road_graph.degree(1002), 1)       # before: dead end
        self.assertEqual(new_world.road_graph.degree(1002), 2)   # after: real junction
        self.assertEqual(new_world.road_graph.degree(1001), 1)   # untouched, far node

    def test_existing_road_geometry_is_unmodified(self):
        world, fields, frame, template, op = make_fixture()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        original = next(f for f in world.features if f.id == "existing-road")
        after = next(f for f in new_world.features if f.id == "existing-road")
        self.assertEqual(list(original.geom.coords), list(after.geom.coords))

    def test_road_terminates_exactly_at_the_real_node(self):
        world, fields, frame, template, op = make_fixture()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        road = next(f for f in new_world.features if f.tags.get("highway") == "service"
                   and f.source == f"op:{op.id}")
        end = road.geom.coords[-1]
        node_xy = new_world.road_graph.node_xy[1002]
        self.assertLess(math.hypot(end[0] - node_xy[0], end[1] - node_xy[1]), 1e-6)


class TestDisconnectedPlacement(unittest.TestCase):
    def test_no_road_network_in_range_still_places_the_structure(self):
        world, fields, frame, template, op = make_fixture(with_road=False)
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertFalse(report.road_ok)
        self.assertEqual(report.demolished_feature_ids, ["old-shed"])
        parts = [f for f in new_world.features if f.source == f"op:{op.id}"]
        self.assertEqual(len(parts), 1)  # the building part, no road
        self.assertTrue(all(f.tags.get("highway") != "service" or f.source != f"op:{op.id}"
                            for f in new_world.features))


class TestNoMutation(unittest.TestCase):
    def test_original_world_features_untouched(self):
        world, fields, frame, template, op = make_fixture()
        before = [f.id for f in world.features]
        construct.apply_construct(world, fields, op, frame, template)
        self.assertEqual([f.id for f in world.features], before)
        self.assertIn("old-shed", [f.id for f in world.features])

    def test_original_road_graph_untouched(self):
        world, fields, frame, template, op = make_fixture()
        construct.apply_construct(world, fields, op, frame, template)
        self.assertEqual(world.road_graph.degree(1002), 1)
        self.assertEqual(len(world.road_graph.way_nodes), 1)


class TestDeterminism(unittest.TestCase):
    def test_replay_produces_identical_geometry(self):
        world, fields, frame, template, op = make_fixture()
        world2, fields2, frame2, template2, op2 = make_fixture()
        new_world_a, report_a = construct.apply_construct(world, fields, op, frame, template)
        new_world_b, report_b = construct.apply_construct(world2, fields2, op2, frame2, template2)

        self.assertEqual(report_a.part_feature_ids, report_b.part_feature_ids)
        road_a = next(f for f in new_world_a.features if f.tags.get("highway") == "service"
                     and f.source == f"op:{op.id}")
        road_b = next(f for f in new_world_b.features if f.tags.get("highway") == "service"
                     and f.source == f"op:{op2.id}")
        self.assertEqual(list(road_a.geom.coords), list(road_b.geom.coords))
        self.assertEqual(road_a.osm_way_id, road_b.osm_way_id)


class TestSyntheticIds(unittest.TestCase):
    def test_negative_and_deterministic(self):
        a = construct._synthetic_id("way", "op-0001", "access-road")
        b = construct._synthetic_id("way", "op-0001", "access-road")
        self.assertLess(a, 0)
        self.assertEqual(a, b)

    def test_distinct_roles_give_distinct_ids(self):
        way_id = construct._synthetic_id("way", "op-0001", "access-road")
        node_id = construct._synthetic_id("node", "op-0001", "access-road", 0)
        self.assertNotEqual(way_id, node_id)


class TestLinePart(unittest.TestCase):
    def make_template_with_track(self):
        return construct.Template(
            id="test-bunker-track", name="Test Bunker With Track",
            parts=[
                construct.TemplatePart(
                    tags={"building": "bunker"}, height_m=9.0,
                    footprint=[(-10.0, -10.0), (10.0, -10.0), (10.0, 10.0), (-10.0, 10.0)]),
                construct.TemplatePart(
                    tags={"highway": "track", "surface": "unpaved"}, height_m=0.0, kind="line",
                    footprint=[(-20.0, -20.0), (20.0, -20.0), (20.0, 20.0), (-20.0, 20.0), (-20.0, -20.0)]),
            ],
            frontage_point=(0.0, -10.0), frontage_direction=(0.0, -1.0),
            access_highway_class="service",
        )

    def test_line_part_becomes_a_linestring_feature(self):
        world, fields, frame, _, op = make_fixture()
        template = self.make_template_with_track()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        track = next(f for f in new_world.features if f.tags.get("highway") == "track")
        self.assertFalse(track.area)
        self.assertEqual(track.height_m, 0.0)
        self.assertEqual(track.geom.geom_type, "LineString")
        self.assertIn(track.id, report.part_feature_ids)

    def test_line_part_is_not_an_obstacle_or_overlap_candidate(self):
        """A looped perimeter track necessarily crosses its own building's
        footprint area in plan view -- it must never be treated as a second
        overlapping structure or block the router as an obstacle."""
        world, fields, frame, _, op = make_fixture()
        template = self.make_template_with_track()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.footprint_clear)
        self.assertEqual(report.footprint_conflicts, [])
        self.assertTrue(report.road_ok, report.road_reason)

    def test_line_part_survives_a_closed_loop_round_trip(self):
        world, fields, frame, _, op = make_fixture()
        template = self.make_template_with_track()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        track = next(f for f in new_world.features if f.tags.get("highway") == "track")
        # 5 points in, 5 points out -- the loop-closing repeated first point
        # must survive the map<->source round trip untouched.
        self.assertEqual(len(track.geom.coords), 5)
        self.assertEqual(track.geom.coords[0], track.geom.coords[-1])


class TestFootprintConflict(unittest.TestCase):
    def test_clean_site_reports_no_conflict(self):
        world, fields, frame, template, op = make_fixture()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.footprint_clear)
        self.assertEqual(report.footprint_conflicts, [])

    def test_footprint_on_a_railway_is_flagged_not_silently_placed(self):
        """The real bug this guards against: a bunker sited 12m from a live
        railway, found only by eyeballing a screenshot after the fact."""
        world, fields, frame, template, op = make_fixture()
        cx, cy = frame.cx, frame.cy
        rail = Feature(id="rail-1", geom=LineString([(cx - 200.0, cy + 200.0), (cx + 200.0, cy - 200.0)]),
                      tags={"railway": "rail"}, area=False, osm_way_id=999)
        world2 = World(features=world.features + [rail], road_graph=world.road_graph,
                       lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg)
        fields2 = make_fields(world2, frame)
        _, report = construct.apply_construct(world2, fields2, op, frame, template)
        self.assertFalse(report.footprint_clear)
        self.assertEqual(report.footprint_conflicts, ["railway=rail"])
        # Still placed -- construct surfaces the conflict, it doesn't refuse
        # (consistent with road_ok=False: place it, make the problem visible).
        self.assertEqual(len(report.part_feature_ids), 1)

    def test_footprint_conflict_does_not_suppress_placement_or_road(self):
        world, fields, frame, template, op = make_fixture()
        cx, cy = frame.cx, frame.cy
        rail = Feature(id="rail-1", geom=LineString([(cx - 200.0, cy + 200.0), (cx + 200.0, cy - 200.0)]),
                      tags={"railway": "rail"}, area=False, osm_way_id=999)
        world2 = World(features=world.features + [rail], road_graph=world.road_graph,
                       lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg)
        fields2 = make_fields(world2, frame)
        new_world, report = construct.apply_construct(world2, fields2, op, frame, template)
        self.assertTrue(report.road_ok, report.road_reason)
        parts = [f for f in new_world.features if f.source == f"op:{op.id}" and f.area]
        self.assertEqual(len(parts), 1)


class TestTemplateLoading(unittest.TestCase):
    def test_real_mech_bunker_template_loads(self):
        template = construct.Template.from_file(MECH_BUNKER_TEMPLATE_PATH)
        self.assertEqual(template.id, "mech-bunker")
        # hangar, 2 blast wings, rear revetment, generator shed, gate post,
        # apron (7 area parts) + 1 line part (the perimeter patrol track).
        self.assertEqual(len(template.parts), 8)
        self.assertEqual(sum(1 for p in template.parts if p.kind == "area"), 7)
        self.assertEqual(sum(1 for p in template.parts if p.kind == "line"), 1)
        self.assertEqual(template.frontage_point, (0.0, -58.0))
        self.assertEqual(template.frontage_direction, (0.0, -1.0))
        # track, not service: a hidden hillside installation's access road is
        # an unpaved track by nature, and track's more permissive grade limit
        # (20% vs service's 16%) is also what real hillside siting needs.
        self.assertEqual(template.access_highway_class, "track")

    def test_real_template_places_cleanly_against_the_fixture_network(self):
        world, fields, frame, _, op = make_fixture()
        template = construct.Template.from_file(MECH_BUNKER_TEMPLATE_PATH)
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.road_ok, report.road_reason)
        self.assertTrue(report.footprint_clear, report.footprint_conflicts)
        own = [f for f in new_world.features if f.source == f"op:{op.id}"]
        # Template PARTS only -- distinguished from the constructed access
        # road by report.part_feature_ids, not by tags: both the perimeter
        # patrol track (a template part) and the access road happen to share
        # highway=track (see Template.access_highway_class), so a tag-only
        # filter can't tell them apart.
        template_parts = [f for f in own if f.id in report.part_feature_ids]
        area_parts = [f for f in template_parts if f.area]
        line_parts = [f for f in template_parts if not f.area]
        self.assertEqual(len(area_parts), 7)
        self.assertEqual(len(line_parts), 1)
        access_roads = [f for f in own if f.id not in report.part_feature_ids]
        self.assertEqual(len(access_roads), 1)


def make_fixture_sloped(low=0.0, high=60.0, with_road=True):
    """Same topology as make_fixture(), but the DEM genuinely slopes (rises
    with map-space y) instead of being flat -- needed to test benching at
    all, since a flat fixture benches to itself and proves nothing."""
    frame = make_frame()
    cx, cy = frame.cx, frame.cy

    graph = RoadGraph()
    features = [
        Feature(id="far-house", geom=square(cx + 700.0, cy + 700.0, 5.0),
               tags={"building": "house"}, area=True, height_m=6.0, osm_way_id=502),
    ]
    if with_road:
        node_a = (cx - 300.0, cy - 110.0)
        node_b = (cx + 50.0, cy - 110.0)
        graph.node_xy[1001] = node_a
        graph.node_xy[1002] = node_b
        graph.way_nodes[42] = [1001, 1002]
        graph.way_class[42] = "track"
        graph.node_ways[1001].add(42)
        graph.node_ways[1002].add(42)
        features.append(Feature(id="existing-road", geom=LineString([node_a, node_b]),
                                tags={"highway": "track"}, area=False, osm_way_id=42))

    world = World(features=features, road_graph=graph, lamps=[], sea=NO_SEA, crs_epsg=6674)

    n = frame.dem_grid
    fox, foy = frame.origin
    elevation = np.empty((n, n), dtype=np.float32)
    for row in range(n):
        my = foy + frame.extent_m * (1.0 - (row + 0.5) / n)
        t = (my - (cy - frame.extent_m / 2)) / frame.extent_m
        elevation[row, :] = low + (high - low) * np.clip(t, 0.0, 1.0)
    map_features = rotate_and_clip(world.all_features(), frame)
    shade = np.zeros((n, n, 3), dtype=np.uint8)
    fields = Fields(frame=frame, features=map_features, lamps=[],
                   elevation=elevation, shade_rgb=shade, sea_depth_t=None,
                   dem_tiles_fetched=0, dem_tiles_missing=0)

    template = make_template()
    op = make_op(frame)
    return world, fields, frame, template, op


class TestTerrainBenching(unittest.TestCase):
    def test_report_marks_terrain_edited_and_records_bench_elevation(self):
        world, fields, frame, template, op = make_fixture_sloped()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.terrain_edited)
        self.assertIsNotNone(report.bench_elevation_m)

    def test_one_terrain_edit_is_added_to_the_new_world(self):
        world, fields, frame, template, op = make_fixture_sloped()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        self.assertEqual(len(world.terrain_edits), 0)  # original untouched
        self.assertEqual(len(new_world.terrain_edits), 1)
        self.assertEqual(new_world.terrain_edits[0].source, f"op:{op.id}")

    def test_bench_elevation_is_the_max_sampled_not_the_average_or_min(self):
        world, fields, frame, template, op = make_fixture_sloped(low=0.0, high=60.0)
        _, report = construct.apply_construct(world, fields, op, frame, template)
        # Independently recompute what max/min/average would be at the SAME
        # bench-polygon vertices apply_construct itself samples, so this
        # checks the actual summary statistic used, not a guessed threshold.
        anchor_map = (frame.cx, frame.cy)
        parts_map = construct._instantiate_parts_map_space(template, anchor_map, 0.0, op.id)
        hull = construct.unary_union([g for g, _, _ in parts_map]).convex_hull
        samples = [construct._sample_elevation_bilinear(fields.elevation, frame, x, y)
                  for x, y in hull.exterior.coords]
        self.assertAlmostEqual(report.bench_elevation_m, max(samples), delta=0.01)
        self.assertGreater(max(samples), min(samples) + 0.5,
                          "fixture must have a real gradient or this test proves nothing")
        self.assertGreater(report.bench_elevation_m, sum(samples) / len(samples) - 0.01)

    def test_rebuilding_fields_from_the_new_world_shows_flat_ground_at_the_frontage(self):
        """The real round-trip property: World.terrain_edits must be enough,
        on its own, to reproduce the bench on a freshly rebuilt Fields --
        exactly what a later render or a later op in the log will do."""
        world, fields, frame, template, op = make_fixture_sloped()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)

        from citymap.fields import apply_terrain_edits
        rebuilt_elevation = apply_terrain_edits(fields.elevation, frame, new_world.terrain_edits)
        anchor_map = (frame.cx, frame.cy)
        frontage_map = construct._rotate_translate(template.frontage_point, 0.0, anchor_map)
        elev_at_frontage = construct._sample_elevation_bilinear(rebuilt_elevation, frame, *frontage_map)
        self.assertAlmostEqual(elev_at_frontage, report.bench_elevation_m, delta=0.5)

    def test_flat_fixture_still_benches_without_changing_anything_visible(self):
        """make_fixture() (flat elevation=10 everywhere) must keep working
        exactly as before -- benching to the max of an already-flat surface
        is a no-op in effect, and every pre-existing test relies on that."""
        world, fields, frame, template, op = make_fixture()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.terrain_edited)
        self.assertAlmostEqual(report.bench_elevation_m, 10.0, delta=0.01)


class TestWaterAvoidance(unittest.TestCase):
    def test_footprint_on_a_stream_is_flagged_not_silently_placed(self):
        world, fields, frame, template, op = make_fixture()
        cx, cy = frame.cx, frame.cy
        stream = Feature(id="stream-1", geom=LineString([(cx - 200.0, cy + 200.0), (cx + 200.0, cy - 200.0)]),
                         tags={"waterway": "stream"}, area=False, osm_way_id=888)
        world2 = World(features=world.features + [stream], road_graph=world.road_graph,
                       lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg)
        fields2 = make_fields(world2, frame)
        _, report = construct.apply_construct(world2, fields2, op, frame, template)
        self.assertFalse(report.footprint_clear)
        self.assertEqual(report.footprint_conflicts, ["waterway=stream"])

    def test_footprint_on_a_pond_polygon_is_flagged(self):
        world, fields, frame, template, op = make_fixture()
        cx, cy = frame.cx, frame.cy
        pond = Feature(id="pond-1", geom=square(cx, cy, 8.0),
                      tags={"natural": "water"}, area=True, osm_way_id=889)
        world2 = World(features=world.features + [pond], road_graph=world.road_graph,
                       lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg)
        fields2 = make_fields(world2, frame)
        _, report = construct.apply_construct(world2, fields2, op, frame, template)
        self.assertFalse(report.footprint_clear)
        self.assertEqual(report.footprint_conflicts, ["natural=water"])

    def test_a_stream_well_clear_of_the_footprint_is_not_flagged(self):
        world, fields, frame, template, op = make_fixture()
        cx, cy = frame.cx, frame.cy
        stream = Feature(id="stream-2", geom=LineString([(cx + 500.0, cy), (cx + 600.0, cy)]),
                         tags={"waterway": "stream"}, area=False, osm_way_id=890)
        world2 = World(features=world.features + [stream], road_graph=world.road_graph,
                       lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg)
        fields2 = make_fields(world2, frame)
        _, report = construct.apply_construct(world2, fields2, op, frame, template)
        self.assertTrue(report.footprint_clear)


def make_fixture_offshore(anchor_map=None, extra_payload=None):
    """A big open-sea square covers most of the frame; the anchor defaults
    to dead centre (deep water). One unrelated building sits well inland,
    outside the sea entirely, and must survive untouched. No existing road
    network -- offshore construct has no causeway router yet (phase a of
    ideas/entries/offshore-construction.json), so there is nothing for one
    to reach anyway.
    """
    frame = make_frame()
    cx, cy = frame.cx, frame.cy
    sea_geom = square(cx, cy, 900.0)
    sea = SeaResult(sea_geom, 1, 1, 0, 0, sea_geom.area / 1e6, sea_geom.area / 1e6)

    features = [
        Feature(id="inland-house", geom=square(cx + 2000.0, cy + 2000.0, 5.0),
               tags={"building": "house"}, area=True, height_m=6.0, osm_way_id=701),
    ]
    world = World(features=features, road_graph=RoadGraph(), lamps=[], sea=sea, crs_epsg=6674)
    fields = make_fields(world, frame)
    template = make_template()

    if anchor_map is None:
        anchor_map = (cx, cy)
    lon, lat = frame.map_to_lonlat(*anchor_map)
    payload = {"anchor": {"lon": lon, "lat": lat}, "rotation": 0.0}
    if extra_payload:
        payload.update(extra_payload)
    op = Operation(id="op-offshore-1", op="construct", payload=payload)
    return world, fields, frame, template, op


class TestOffshoreConstruct(unittest.TestCase):
    """ideas/entries/offshore-construction.json, phase (a): anchor-in-sea
    detection + reclaim-as-returnToSea's-inverse, with a flat freeboard
    elevation instead of benching to natural terrain. No causeway router
    yet -- that is phase (b)/(c), tracked separately."""

    def test_report_flags_the_anchor_as_offshore(self):
        world, fields, frame, template, op = make_fixture_offshore()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.is_offshore)

    def test_onshore_fixture_is_not_flagged_offshore(self):
        """Control case: make_fixture()'s NO_SEA world must never be
        misdetected as offshore."""
        world, fields, frame, template, op = make_fixture()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertFalse(report.is_offshore)

    def test_the_anchor_point_is_reclaimed_out_of_the_sea(self):
        world, fields, frame, template, op = make_fixture_offshore()
        cx, cy = frame.cx, frame.cy
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        from shapely.geometry import Point as P
        self.assertTrue(world.sea.sea_geom.contains(P(cx, cy)), "fixture sanity check")
        self.assertFalse(new_world.sea.sea_geom.contains(P(cx, cy)),
                         "the anchor must no longer read as sea after reclamation")

    def test_open_water_away_from_the_platform_is_still_sea(self):
        world, fields, frame, template, op = make_fixture_offshore()
        cx, cy = frame.cx, frame.cy
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        from shapely.geometry import Point as P
        self.assertTrue(new_world.sea.sea_geom.contains(P(cx + 800.0, cy + 800.0)),
                        "reclaiming one small platform must not swallow the whole sea")

    def test_original_world_sea_is_not_mutated(self):
        world, fields, frame, template, op = make_fixture_offshore()
        cx, cy = frame.cx, frame.cy
        from shapely.geometry import Point as P
        construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(world.sea.sea_geom.contains(P(cx, cy)),
                        "the ORIGINAL world must still read the anchor as sea")

    def test_bench_elevation_is_the_default_freeboard(self):
        world, fields, frame, template, op = make_fixture_offshore()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertAlmostEqual(report.bench_elevation_m, construct.DEFAULT_FREEBOARD_M, delta=0.01)

    def test_freeboard_is_overridable_via_payload(self):
        world, fields, frame, template, op = make_fixture_offshore(extra_payload={"freeboardM": 9.5})
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertAlmostEqual(report.bench_elevation_m, 9.5, delta=0.01)

    def test_terrain_edited_is_true_and_one_edit_is_added(self):
        world, fields, frame, template, op = make_fixture_offshore()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertTrue(report.terrain_edited)
        self.assertEqual(len(world.terrain_edits), 0)
        self.assertEqual(len(new_world.terrain_edits), 1)
        self.assertAlmostEqual(new_world.terrain_edits[0].target_elevation_m,
                               construct.DEFAULT_FREEBOARD_M, delta=0.01)

    def test_no_access_road_yet_and_reason_says_why(self):
        world, fields, frame, template, op = make_fixture_offshore()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertFalse(report.road_ok)
        self.assertEqual(report.road_length_m, 0.0)
        self.assertIn("causeway", report.road_reason)

    def test_reclaimed_area_is_reported_and_positive(self):
        world, fields, frame, template, op = make_fixture_offshore()
        _, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertIsNotNone(report.reclaimed_area_m2)
        self.assertGreater(report.reclaimed_area_m2, 0.0)

    def test_reclaim_margin_grows_the_reported_area(self):
        world, fields, frame, template, op = make_fixture_offshore()
        _, small = construct.apply_construct(world, fields, op, frame, template)
        world2, fields2, frame2, template2, op2 = make_fixture_offshore(
            extra_payload={"reclaimMarginM": 60.0})
        _, big = construct.apply_construct(world2, fields2, op2, frame2, template2)
        self.assertGreater(big.reclaimed_area_m2, small.reclaimed_area_m2)

    def test_a_reclaimed_land_feature_is_added_with_construction_landuse(self):
        world, fields, frame, template, op = make_fixture_offshore()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        reclaimed = [f for f in new_world.features
                    if f.source == f"op:{op.id}" and f.tags == {"landuse": "construction"}]
        self.assertEqual(len(reclaimed), 1)
        self.assertTrue(reclaimed[0].area)

    def test_the_building_part_itself_is_still_added(self):
        """Offshore construct still places the actual template -- reclaiming
        land is additive to normal placement, not a replacement for it."""
        world, fields, frame, template, op = make_fixture_offshore()
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        parts = [f for f in new_world.features if f.source == f"op:{op.id}" and f.is_building()]
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0].id, report.part_feature_ids[0])

    def test_inland_building_survives_untouched(self):
        world, fields, frame, template, op = make_fixture_offshore()
        new_world, _ = construct.apply_construct(world, fields, op, frame, template)
        self.assertIn("inland-house", [f.id for f in new_world.features])

    def test_onshore_construct_leaves_sea_untouched(self):
        """The other side of the fork: an anchor OUTSIDE the sea polygon
        (but still within the frame) must take the ordinary on-land path
        and never reclaim anything. The fixture's sea square is cx+-900; a
        point at cx+950 is dry land, still inside make_frame()'s cx+-1000
        extent."""
        base_frame = make_frame()
        anchor_map = (base_frame.cx + 950.0, base_frame.cy)
        world, fields, frame, template, op = make_fixture_offshore(anchor_map=anchor_map)
        new_world, report = construct.apply_construct(world, fields, op, frame, template)
        self.assertFalse(report.is_offshore)
        self.assertIsNone(report.reclaimed_area_m2)
        self.assertEqual(new_world.sea.sea_geom.area, world.sea.sea_geom.area)


if __name__ == "__main__":
    unittest.main()
