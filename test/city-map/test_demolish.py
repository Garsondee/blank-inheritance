"""demolish op tests. The central scenario mirrors Kobe Airport exactly: an
island reachable by a single bridge, with internal roads that have no other
connection to the network. Removing the island must eat the ENTIRE bridge
back to the mainland junction it branches from -- not leave it capped
mid-span, and not touch any of the junction's other, unrelated roads.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402
from citymap.ops.demolish import apply_demolish, demolish_area_source_crs  # noqa: E402
from citymap.ops.log import Operation  # noqa: E402
from citymap.parse import Feature, RoadGraph  # noqa: E402
from citymap.sea import SeaResult  # noqa: E402
from citymap.world import TerrainEdit, World  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
             extent_m=4000.0, crs_epsg=6674)


def square(cx, cy, half):
    return Polygon([(cx - half, cy - half), (cx + half, cy - half),
                    (cx + half, cy + half), (cx - half, cy + half)])


def make_airport_world():
    """mainland_junction(deg 3) --wayA--> elsewhere
                              --wayB--> elsewhere2
                              --bridge--> island_node --internal--> terminal(deg1, real)
       plus an unrelated real dead-end (unrelated_end) far from the island.
    """
    cx, cy = FRAME.cx, FRAME.cy
    mainland = (cx - 1000, cy)
    elsewhere_a = (cx - 1500, cy - 200)
    elsewhere_b = (cx - 1500, cy + 200)
    island_node = (cx + 500, cy)     # inside the demolish circle
    terminal = (cx + 700, cy + 50)   # inside the demolish circle
    unrelated_junction = (cx - 1500, cy - 200)
    unrelated_end = (cx - 1800, cy - 500)

    features = [
        Feature(id="bldgA", geom=square(cx + 550, cy + 20, 30),
               tags={"building": "yes"}, area=True, height_m=8.0, osm_way_id=901),
        Feature(id="bldgB", geom=square(cx - 1600, cy - 800, 30),
               tags={"building": "yes"}, area=True, height_m=8.0, osm_way_id=902),
        Feature(id="wayA", geom=LineString([mainland, elsewhere_a]),
               tags={"highway": "primary"}, area=False, osm_way_id=1),
        Feature(id="wayB", geom=LineString([mainland, elsewhere_b]),
               tags={"highway": "primary"}, area=False, osm_way_id=2),
        Feature(id="bridge", geom=LineString([mainland, island_node]),
               tags={"highway": "primary", "bridge": "yes"}, area=False, osm_way_id=3),
        Feature(id="internal", geom=LineString([island_node, terminal]),
               tags={"highway": "service"}, area=False, osm_way_id=4),
        Feature(id="unrelated", geom=LineString([unrelated_junction, unrelated_end]),
               tags={"highway": "residential"}, area=False, osm_way_id=5),
    ]

    graph = RoadGraph()
    node_id = {mainland: 10, elsewhere_a: 11, elsewhere_b: 12,
              island_node: 13, terminal: 14, unrelated_end: 15}
    for xy, nid in node_id.items():
        graph.node_xy[nid] = xy

    def add_way(way_id, hw_class, pts):
        ids = [node_id[p] for p in pts]
        graph.way_nodes[way_id] = ids
        graph.way_class[way_id] = hw_class
        for nid in ids:
            graph.node_ways[nid].add(way_id)

    add_way(1, "primary", [mainland, elsewhere_a])
    add_way(2, "primary", [mainland, elsewhere_b])
    add_way(3, "primary", [mainland, island_node])
    add_way(4, "service", [island_node, terminal])
    add_way(5, "residential", [elsewhere_a, unrelated_end])  # branches off elsewhere_a

    world = World(features=features, road_graph=graph, lamps=[(cx + 600, cy)],
                 sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)
    return world, node_id


class TestDemolishAreaConversion(unittest.TestCase):
    def test_radius_form(self):
        op = Operation.from_dict({
            "id": "op-1", "op": "demolish",
            "area": {"center": {"lon": 135.22, "lat": 34.63}, "radiusM": 500},
        })
        area = demolish_area_source_crs(op.payload, FRAME)
        cx, cy = FRAME.fwd.transform(135.22, 34.63)
        self.assertAlmostEqual(area.area, 3.14159 * 500 * 500, delta=500 * 500 * 0.02)
        self.assertTrue(area.contains(Point(cx, cy)))

    def test_polygon_form(self):
        op = Operation.from_dict({
            "id": "op-1", "op": "demolish",
            "area": {"polygon": [
                {"lon": 135.20, "lat": 34.60}, {"lon": 135.21, "lat": 34.60},
                {"lon": 135.21, "lat": 34.61}, {"lon": 135.20, "lat": 34.61},
            ]},
        })
        area = demolish_area_source_crs(op.payload, FRAME)
        self.assertGreater(area.area, 0)


class TestAirportRemoval(unittest.TestCase):
    def setUp(self):
        self.world, self.nodes = make_airport_world()
        cx, cy = FRAME.cx, FRAME.cy
        island_lonlat = FRAME.inv.transform(cx + 500, cy)
        self.op = Operation.from_dict({
            "id": "op-demolish-airport", "op": "demolish",
            "area": {"center": {"lon": island_lonlat[0], "lat": island_lonlat[1]},
                    "radiusM": 400},
        })

    def test_island_building_removed(self):
        new_world, report = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("bldgA", ids)
        # bldgA AND "internal" (the airport-internal road) are both entirely
        # inside the 400m circle, so both are caught by direct geometric
        # removal; the bridge is NOT geometrically inside it and is instead
        # caught by the separate graph-cascade pruning path below -- see
        # test_the_entire_bridge_is_pruned_back_to_the_junction.
        self.assertEqual(report.removed_feature_count, 2)

    def test_unrelated_building_survives(self):
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertIn("bldgB", ids)

    def test_the_entire_bridge_is_pruned_back_to_the_junction(self):
        """THE property this whole op exists to guarantee."""
        new_world, report = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("internal", ids, "the airport-internal road must be gone")
        self.assertNotIn("bridge", ids,
                         "the bridge must be pruned entirely -- its only purpose "
                         "was reaching what is now gone, so it must not survive "
                         "as a stub heading into empty space")

    def test_mainlands_other_two_roads_are_untouched(self):
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertIn("wayA", ids)
        self.assertIn("wayB", ids)

    def test_mainland_junction_degree_drops_by_exactly_one(self):
        """Before: degree 3 (wayA, wayB, bridge). After: degree 2 -- the
        bridge's incidence is gone, the other two remain."""
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        self.assertEqual(self.world.road_graph.degree(self.nodes[
            (FRAME.cx - 1000, FRAME.cy)]), 3)
        self.assertEqual(new_world.road_graph.degree(self.nodes[
            (FRAME.cx - 1000, FRAME.cy)]), 2)

    def test_unrelated_real_dead_end_is_never_touched(self):
        """The rule that protects legitimate cul-de-sacs elsewhere in the
        city: a pre-existing degree-1 node must never be pruned just because
        SOME unrelated demolition happened elsewhere in the frame."""
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertIn("unrelated", ids)

    def test_original_world_is_not_mutated(self):
        """Ops must never mutate the base World -- render = base + replay,
        and a mutated base breaks replaying from scratch."""
        original_way_count = len(self.world.road_graph.way_nodes)
        original_feature_count = len(self.world.features)
        apply_demolish(self.world, self.op, FRAME)
        self.assertEqual(len(self.world.road_graph.way_nodes), original_way_count)
        self.assertEqual(len(self.world.features), original_feature_count)

    def test_report_counts_are_consistent(self):
        new_world, report = apply_demolish(self.world, self.op, FRAME)
        # bldgA + "internal" -- both entirely inside the demolish circle,
        # removed directly rather than via graph-cascade pruning.
        self.assertEqual(report.removed_feature_count, 2)
        # The bridge is outside the circle except its far tip, so it is
        # geometrically CLIPPED first, then separately pruned via the graph
        # cascade once "internal"'s removal drops island_node to degree 1.
        self.assertEqual(report.pruned_way_count, 1)
        self.assertEqual(report.pruned_way_ids, [3])  # bridge's osm_way_id

    def test_lamp_inside_the_area_is_removed(self):
        new_world, report = apply_demolish(self.world, self.op, FRAME)
        self.assertEqual(new_world.lamps, [])
        self.assertEqual(report.removed_lamp_count, 1)

    def test_sea_feature_never_touched_by_demolish(self):
        from shapely.geometry import Polygon as P
        sea_geom = square(FRAME.cx, FRAME.cy, 2000)
        world = World(
            features=self.world.features + [Feature(id="sea", geom=sea_geom,
                                                     tags={"__sea__": "true"}, area=True)],
            road_graph=self.world.road_graph, lamps=self.world.lamps,
            sea=SeaResult(sea_geom, 1, 1, 0, 0, 0.0, sea_geom.area / 1e6),
            crs_epsg=6674,
        )
        new_world, _ = apply_demolish(world, self.op, FRAME)
        self.assertTrue(any(f.tags.get("__sea__") for f in new_world.features))


class TestFeatureIdsRemoval(unittest.TestCase):
    """The `featureIds` alternative to `area` -- exact-id removal for the map
    editor's 'flag a building for removal' flow (tools/city-map/editor/).
    """

    def test_exactly_the_named_feature_is_removed(self):
        world, _ = make_airport_world()
        op = Operation.from_dict({"id": "op-1", "op": "demolish", "featureIds": ["bldgA"]})
        new_world, report = apply_demolish(world, op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("bldgA", ids)
        self.assertEqual(report.removed_feature_count, 1)

    def test_an_unrelated_neighbour_is_never_caught(self):
        """The whole point of id-based removal over a reconstructed polygon:
        no geometry test at all, so a neighbour can never be swept up."""
        world, _ = make_airport_world()
        op = Operation.from_dict({"id": "op-1", "op": "demolish", "featureIds": ["bldgA"]})
        new_world, _ = apply_demolish(world, op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertIn("bldgB", ids)
        self.assertIn("wayA", ids)
        self.assertIn("wayB", ids)
        self.assertIn("bridge", ids)

    def test_removing_a_graph_connected_feature_still_cascades(self):
        """Removing 'internal' by id must still eat the bridge back to the
        junction, exactly like removing it via an area would -- the SAME
        graph-cascade pruning, just reached through a different front door."""
        world, _ = make_airport_world()
        op = Operation.from_dict({"id": "op-1", "op": "demolish", "featureIds": ["internal"]})
        new_world, report = apply_demolish(world, op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("internal", ids)
        self.assertNotIn("bridge", ids, "the bridge must be pruned once its only destination is gone")
        self.assertIn("unrelated", ids, "an unrelated pre-existing dead end must survive")
        self.assertEqual(report.pruned_way_count, 1)
        self.assertEqual(report.pruned_way_ids, [3])  # bridge's osm_way_id

    def test_an_unknown_id_is_silently_a_no_op_for_that_id(self):
        world, _ = make_airport_world()
        original_count = len(world.features)
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "featureIds": ["bldgA", "does-not-exist"]})
        new_world, report = apply_demolish(world, op, FRAME)
        self.assertEqual(report.removed_feature_count, 1)  # only bldgA was real
        self.assertEqual(len(new_world.features), original_count - 1)

    def test_no_returnToSea_or_leaveLanduse_equivalent(self):
        world, _ = make_airport_world()
        op = Operation.from_dict({"id": "op-1", "op": "demolish", "featureIds": ["bldgA"]})
        _, report = apply_demolish(world, op, FRAME)
        self.assertFalse(report.returned_to_sea)
        self.assertIsNone(report.left_landuse_feature_id)
        self.assertIsNone(report.sea_area_after_km2)

    def test_terrain_edits_are_preserved(self):
        world, _ = make_airport_world()
        edit = TerrainEdit(id="op:earlier:terrain-bench:0", polygon=square(FRAME.cx, FRAME.cy, 20),
                           target_elevation_m=15.0, source="op:earlier")
        world_with_edit = World(features=world.features, road_graph=world.road_graph,
                                lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg,
                                terrain_edits=[edit])
        op = Operation.from_dict({"id": "op-1", "op": "demolish", "featureIds": ["bldgA"]})
        new_world, _ = apply_demolish(world_with_edit, op, FRAME)
        self.assertEqual(len(new_world.terrain_edits), 1)
        self.assertEqual(new_world.terrain_edits[0].id, edit.id)

    def test_original_world_is_not_mutated(self):
        world, _ = make_airport_world()
        original_count = len(world.features)
        op = Operation.from_dict({"id": "op-1", "op": "demolish", "featureIds": ["bldgA"]})
        apply_demolish(world, op, FRAME)
        self.assertEqual(len(world.features), original_count)


def make_airport_world_with_railway():
    """Same island/bridge shape as make_airport_world, but on the rail
    network instead of roads -- the exact shape of the real bug this
    generalisation fixes: two electrified-rail bridge ways survived Kobe
    Airport's returnToSea removal as kilometre-long dangling clipped stubs,
    because railways had no graph representation at all to prune against.

    rail_mainland(deg1, real) --rail_bridge--> rail_island_node --rail_internal--> rail_terminal
    plus an unrelated real rail dead end (rail_far_b) far from the island.
    """
    world, nodes = make_airport_world()
    cx, cy = FRAME.cx, FRAME.cy
    rail_mainland = (cx - 1000, cy + 50)      # outside the demolish circle
    rail_island_node = (cx + 500, cy + 100)   # inside the demolish circle
    rail_terminal = (cx + 750, cy + 100)      # inside the demolish circle
    rail_far_a = (cx - 1800, cy + 300)
    rail_far_b = (cx - 2100, cy + 300)        # a real, unrelated dead end

    rail_graph = RoadGraph()
    rail_node_id = {rail_mainland: 20, rail_island_node: 21, rail_terminal: 22,
                    rail_far_a: 23, rail_far_b: 24}
    for xy, nid in rail_node_id.items():
        rail_graph.node_xy[nid] = xy

    def add_rail(way_id, cls, pts):
        ids = [rail_node_id[p] for p in pts]
        rail_graph.way_nodes[way_id] = ids
        rail_graph.way_class[way_id] = cls
        for nid in ids:
            rail_graph.node_ways[nid].add(way_id)

    add_rail(101, "rail", [rail_mainland, rail_island_node])
    add_rail(102, "rail", [rail_island_node, rail_terminal])
    add_rail(103, "rail", [rail_far_a, rail_far_b])

    rail_features = [
        Feature(id="rail_bridge", geom=LineString([rail_mainland, rail_island_node]),
               tags={"railway": "rail", "bridge": "yes"}, area=False, osm_way_id=101),
        Feature(id="rail_internal", geom=LineString([rail_island_node, rail_terminal]),
               tags={"railway": "rail"}, area=False, osm_way_id=102),
        Feature(id="rail_unrelated", geom=LineString([rail_far_a, rail_far_b]),
               tags={"railway": "rail"}, area=False, osm_way_id=103),
    ]

    new_world = World(features=world.features + rail_features, road_graph=world.road_graph,
                      rail_graph=rail_graph, lamps=world.lamps, sea=world.sea,
                      crs_epsg=world.crs_epsg)
    return new_world, nodes, rail_node_id


class TestRailwayBridgeRemoval(unittest.TestCase):
    """The bug the user's screenshot caught: a railway bridge to Kobe Airport
    survived the airport's removal as a dangling clipped stub, because
    railways previously had no graph at all for the cascade to prune
    against. Mirrors TestAirportRemoval exactly, but for rail_graph."""

    def setUp(self):
        self.world, self.nodes, self.rail_nodes = make_airport_world_with_railway()
        cx, cy = FRAME.cx, FRAME.cy
        island_lonlat = FRAME.inv.transform(cx + 500, cy)
        self.op = Operation.from_dict({
            "id": "op-demolish-airport", "op": "demolish",
            "area": {"center": {"lon": island_lonlat[0], "lat": island_lonlat[1]},
                    "radiusM": 400},
        })

    def test_entire_rail_bridge_is_pruned_back_to_the_junction(self):
        """THE property this fix exists to guarantee, for railways."""
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("rail_internal", ids, "the airport-internal track must be gone")
        self.assertNotIn("rail_bridge", ids,
                         "the rail bridge must be pruned entirely -- its only purpose "
                         "was reaching what is now gone, so it must not survive as a "
                         "stub heading into empty water")

    def test_road_bridge_is_also_pruned_in_the_same_pass(self):
        """The road and rail cascades run independently but in the same op --
        neither must interfere with or mask the other."""
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("bridge", ids)
        self.assertNotIn("internal", ids)

    def test_unrelated_real_rail_dead_end_is_never_touched(self):
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertIn("rail_unrelated", ids)

    def test_report_counts_both_networks_deduplicated(self):
        _, report = apply_demolish(self.world, self.op, FRAME)
        # way 3 (road bridge) + way 101 (rail bridge) -- two distinct ways
        # across two distinct graphs, counted once each.
        self.assertEqual(report.pruned_way_count, 2)
        self.assertEqual(report.pruned_way_ids, [3, 101])

    def test_rail_mainland_node_is_dropped_once_its_only_way_is_pruned(self):
        """RoadGraph.remove_way does not keep degree-0 phantoms -- once the
        bridge (rail_mainland's only way) is pruned, the node itself is gone
        entirely, not left behind at degree 0."""
        new_world, _ = apply_demolish(self.world, self.op, FRAME)
        mainland_rail_node = self.rail_nodes[(FRAME.cx - 1000, FRAME.cy + 50)]
        self.assertEqual(self.world.rail_graph.degree(mainland_rail_node), 1)
        self.assertNotIn(mainland_rail_node, new_world.rail_graph.node_ways)

    def test_original_world_rail_graph_is_not_mutated(self):
        original_rail_way_count = len(self.world.rail_graph.way_nodes)
        apply_demolish(self.world, self.op, FRAME)
        self.assertEqual(len(self.world.rail_graph.way_nodes), original_rail_way_count)


class TestThroughRoadSurvives(unittest.TestCase):
    """A road that merely clips the edge of the demolished area but connects
    real destinations on both sides must survive, capped -- not be treated as
    a severed branch."""

    def test_through_road_with_a_real_far_end_is_not_pruned(self):
        cx, cy = FRAME.cx, FRAME.cy
        left = (cx - 600, cy)
        right = (cx + 600, cy)   # inside the demolish circle
        far_right_junction = (cx + 900, cy)
        far_right_end = (cx + 1200, cy)

        graph = RoadGraph()
        ids = {left: 1, right: 2, far_right_junction: 3, far_right_end: 4}
        for xy, nid in ids.items():
            graph.node_xy[nid] = xy

        def add_way(wid, cls, pts):
            nids = [ids[p] for p in pts]
            graph.way_nodes[wid] = nids
            graph.way_class[wid] = cls
            for n in nids:
                graph.node_ways[n].add(wid)

        # through_road passes THROUGH the demolish circle (left -> right,
        # right is inside), continuing on to a real destination beyond it.
        add_way(1, "primary", [left, right])
        add_way(2, "primary", [right, far_right_junction])
        add_way(3, "primary", [far_right_junction, far_right_end])

        features = [
            Feature(id="seg1", geom=LineString([left, right]),
                   tags={"highway": "primary"}, area=False, osm_way_id=1),
            Feature(id="seg2", geom=LineString([right, far_right_junction]),
                   tags={"highway": "primary"}, area=False, osm_way_id=2),
            Feature(id="seg3", geom=LineString([far_right_junction, far_right_end]),
                   tags={"highway": "primary"}, area=False, osm_way_id=3),
        ]
        world = World(features=features, road_graph=graph, lamps=[],
                     sea=SeaResult(None, 0, 0, 0, 0, 0.0, 0.0), crs_epsg=6674)

        island_lonlat = FRAME.inv.transform(right[0], right[1])
        op = Operation.from_dict({
            "id": "op-1", "op": "demolish",
            "area": {"center": {"lon": island_lonlat[0], "lat": island_lonlat[1]},
                    "radiusM": 200},
        })
        new_world, report = apply_demolish(world, op, FRAME)
        ids_left = {f.id for f in new_world.features}
        # seg1 is clipped (its "right" end was inside the area) but must
        # survive as a shorter LineString -- it still leads somewhere real.
        self.assertIn("seg1", ids_left)
        self.assertIn("seg2", ids_left)
        self.assertIn("seg3", ids_left)
        self.assertEqual(report.pruned_way_count, 0)


class TestTerrainEditsSurviveDemolish(unittest.TestCase):
    """A demolish op must never silently drop existing terrain_edits (benched
    platforms, reclaimed land elevations) from an earlier construct op --
    found 2026-08-24: apply_demolish's own World(...) construction omitted
    terrain_edits entirely, so any demolish running after a construct would
    erase that construct's benching the moment it replayed, with nothing in
    the report to say so."""

    def test_an_existing_terrain_edit_is_preserved_across_a_demolish(self):
        world, _ = make_airport_world()
        edit = TerrainEdit(id="op:earlier-construct:terrain-bench:0",
                           polygon=square(FRAME.cx - 2000, FRAME.cy - 2000, 30),
                           target_elevation_m=42.0, blend_m=15.0, source="op:earlier-construct")
        world_with_edit = World(features=world.features, road_graph=world.road_graph,
                                lamps=world.lamps, sea=world.sea, crs_epsg=world.crs_epsg,
                                terrain_edits=[edit])

        island_lonlat = FRAME.inv.transform(FRAME.cx + 500, FRAME.cy)
        op = Operation.from_dict({
            "id": "op-1", "op": "demolish",
            "area": {"center": {"lon": island_lonlat[0], "lat": island_lonlat[1]}, "radiusM": 400},
        })
        new_world, _ = apply_demolish(world_with_edit, op, FRAME)

        self.assertEqual(len(new_world.terrain_edits), 1)
        self.assertEqual(new_world.terrain_edits[0].id, edit.id)
        self.assertEqual(new_world.terrain_edits[0].target_elevation_m, 42.0)


class TestLeaveLanduse(unittest.TestCase):
    """Without a landuse/natural/leisure tag, cleared ground has nothing for
    render.py's landuse-tint pass to draw -- discovered rendering the real
    Kobe Airport removal, where the emptied island came back as a stark white
    void rather than a tinted 'cleared land' patch. `leaveLanduse` is the
    opt-in fix: a demolish MAY leave a single landuse-tagged Feature covering
    exactly the demolished area."""

    def setUp(self):
        self.world, self.nodes = make_airport_world()
        cx, cy = FRAME.cx, FRAME.cy
        island_lonlat = FRAME.inv.transform(cx + 500, cy)
        self.base_payload = {
            "area": {"center": {"lon": island_lonlat[0], "lat": island_lonlat[1]},
                    "radiusM": 400},
        }

    def test_no_landuse_left_by_default(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish", **self.base_payload})
        new_world, report = apply_demolish(self.world, op, FRAME)
        self.assertIsNone(report.left_landuse_feature_id)
        self.assertFalse(any(f.tags.get("landuse") for f in new_world.features
                             if f.source != "osm"))

    def test_leave_landuse_adds_exactly_one_tagged_feature(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "leaveLanduse": "brownfield", **self.base_payload})
        new_world, report = apply_demolish(self.world, op, FRAME)
        self.assertIsNotNone(report.left_landuse_feature_id)
        left = [f for f in new_world.features if f.id == report.left_landuse_feature_id]
        self.assertEqual(len(left), 1)
        self.assertEqual(left[0].tags, {"landuse": "brownfield"})
        self.assertEqual(left[0].source, f"op:{op.id}")

    def test_left_landuse_covers_the_demolish_area(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "leaveLanduse": "brownfield", **self.base_payload})
        new_world, report = apply_demolish(self.world, op, FRAME)
        left = next(f for f in new_world.features if f.id == report.left_landuse_feature_id)
        area = demolish_area_source_crs(op.payload, FRAME)
        self.assertAlmostEqual(left.geom.area, area.area, delta=1.0)

    def test_stable_id_across_replays(self):
        op = Operation.from_dict({"id": "op-fixed", "op": "demolish",
                                  "leaveLanduse": "brownfield", **self.base_payload})
        _, report_a = apply_demolish(self.world, op, FRAME)
        _, report_b = apply_demolish(self.world, op, FRAME)
        self.assertEqual(report_a.left_landuse_feature_id, report_b.left_landuse_feature_id)


class TestReturnToSea(unittest.TestCase):
    """`returnToSea` is the actual 'let the ocean reclaim it' operation --
    what a demolish should do when the ground itself disappears, not just
    what is built on it. This is a DIFFERENT outcome from leaveLanduse (dry
    land, cleared) and the two are mutually exclusive."""

    def setUp(self):
        cx, cy = FRAME.cx, FRAME.cy
        self.world, self.nodes = make_airport_world()
        # An existing sea polygon well clear of the demolish target, so a
        # merge can be checked as "grew to include the new area" rather than
        # "replaced the old one".
        existing_sea = square(cx + 5000, cy + 5000, 800)
        self.world_with_sea = World(
            features=self.world.features, road_graph=self.world.road_graph,
            lamps=self.world.lamps,
            sea=SeaResult(existing_sea, 1, 1, 0, 0, existing_sea.area / 1e6, existing_sea.area / 1e6),
            crs_epsg=6674,
        )
        island_lonlat = FRAME.inv.transform(cx + 500, cy)
        self.base_payload = {
            "area": {"center": {"lon": island_lonlat[0], "lat": island_lonlat[1]},
                    "radiusM": 400},
        }

    def test_sea_grows_to_cover_the_demolished_area(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "returnToSea": True, **self.base_payload})
        new_world, report = apply_demolish(self.world_with_sea, op, FRAME)
        self.assertTrue(report.returned_to_sea)
        area = demolish_area_source_crs(op.payload, FRAME)
        self.assertTrue(new_world.sea.sea_geom.contains(area.buffer(-1.0)))

    def test_original_sea_is_preserved_not_replaced(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "returnToSea": True, **self.base_payload})
        new_world, _ = apply_demolish(self.world_with_sea, op, FRAME)
        original_sea_point = Point(FRAME.cx + 5000, FRAME.cy + 5000)
        self.assertTrue(new_world.sea.sea_geom.contains(original_sea_point))

    def test_works_with_no_pre_existing_sea(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "returnToSea": True, **self.base_payload})
        new_world, report = apply_demolish(self.world, op, FRAME)  # world.sea.sea_geom is None
        self.assertTrue(report.returned_to_sea)
        self.assertIsNotNone(new_world.sea.sea_geom)

    def test_no_sea_change_by_default(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish", **self.base_payload})
        new_world, report = apply_demolish(self.world_with_sea, op, FRAME)
        self.assertFalse(report.returned_to_sea)
        self.assertEqual(new_world.sea.sea_geom, self.world_with_sea.sea.sea_geom)

    def test_return_to_sea_takes_precedence_over_leave_landuse(self):
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "returnToSea": True, "leaveLanduse": "brownfield",
                                  **self.base_payload})
        new_world, report = apply_demolish(self.world_with_sea, op, FRAME)
        self.assertTrue(report.returned_to_sea)
        self.assertIsNone(report.left_landuse_feature_id)
        self.assertFalse(any(f.tags.get("landuse") for f in new_world.features if f.source != "osm"))

    def test_demolished_features_still_gone(self):
        """returnToSea changes what the ground becomes, not whether the
        island's own content and its bridge are still correctly removed."""
        op = Operation.from_dict({"id": "op-1", "op": "demolish",
                                  "returnToSea": True, **self.base_payload})
        new_world, _ = apply_demolish(self.world_with_sea, op, FRAME)
        ids = {f.id for f in new_world.features}
        self.assertNotIn("bldgA", ids)
        self.assertNotIn("bridge", ids)
        self.assertIn("bldgB", ids)


if __name__ == "__main__":
    unittest.main()
