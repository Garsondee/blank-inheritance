"""export_travel_graph.py's own merge/clip logic -- with small, synthetic
graphs, never the real 120MB gpkg-derived world (that stays an integration
fact proven by actually running the export, not by this suite).

Written 2026-09-23 alongside the wayClass export itself: a mode/animation
layer (core/travel-speed.mjs) needs to know what kind of way a route
segment actually rode -- residential road, footway, rail -- and until this
change that fact was computed and cached by citymap/parse.py's own
RoadGraph, then silently dropped on the way into travel-graph.json. The
specific thing worth pinning here is the RAIL-WINS merge rule: a way tagged
with both `highway` and `railway` (citymap/parse.py's own documented case)
lands in both source graphs, and whichever way_class the merge keeps
decides whether that segment reads as a car ride or a train ride.
"""

import os
import sys
import unittest
from dataclasses import dataclass, field
from typing import Dict, List, Set

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "city-map"))

from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from export_travel_graph import derive_gap_graph_from_features, merge_road_and_rail, to_clipped_image_px  # noqa: E402


@dataclass
class FakeGraph:
    node_xy: Dict[int, tuple] = field(default_factory=dict)
    way_nodes: Dict[int, List[int]] = field(default_factory=dict)
    way_class: Dict[int, str] = field(default_factory=dict)


@dataclass
class FakeWorld:
    road_graph: FakeGraph
    rail_graph: FakeGraph


class FakeGeoref:
    """Identity projection, everything inside a 1000x1000 square kept."""

    def source_to_image_px(self, sx, sy):
        return (sx, sy)

    def contains_image_px(self, x, y):
        return 0 <= x < 1000 and 0 <= y < 1000


class TestMergeRoadAndRail(unittest.TestCase):
    def test_road_and_rail_nodes_and_ways_both_carry_through(self):
        world = FakeWorld(
            road_graph=FakeGraph(
                node_xy={1: (10, 10), 2: (20, 20)},
                way_nodes={100: [1, 2]},
                way_class={100: "residential"},
            ),
            rail_graph=FakeGraph(
                node_xy={3: (30, 30), 4: (40, 40)},
                way_nodes={200: [3, 4]},
                way_class={200: "rail"},
            ),
        )
        node_xy, way_nodes, way_class, rail_way_ids = merge_road_and_rail(world)
        self.assertEqual(node_xy, {1: (10, 10), 2: (20, 20), 3: (30, 30), 4: (40, 40)})
        self.assertEqual(way_nodes, {100: [1, 2], 200: [3, 4]})
        self.assertEqual(way_class, {100: "residential", 200: "rail"})
        self.assertEqual(rail_way_ids, {200})

    def test_a_way_tagged_both_highway_and_railway_has_rail_win_the_merge(self):
        # citymap/parse.py's own documented case: a level crossing's shared
        # way lands in both graphs. Riding across it is riding the rail
        # line, not the road that happens to share the tag.
        world = FakeWorld(
            road_graph=FakeGraph(
                node_xy={5: (50, 50), 6: (60, 60)},
                way_nodes={300: [5, 6]},
                way_class={300: "residential"},
            ),
            rail_graph=FakeGraph(
                node_xy={5: (50, 50), 6: (60, 60)},
                way_nodes={300: [5, 6]},
                way_class={300: "rail"},
            ),
        )
        _node_xy, _way_nodes, way_class, rail_way_ids = merge_road_and_rail(world)
        self.assertEqual(way_class[300], "rail", "rail must win a shared way, not whichever graph happened to merge first")
        self.assertIn(300, rail_way_ids)


class TestClipping(unittest.TestCase):
    def test_wayClass_and_railWayIds_are_filtered_to_the_ways_that_actually_survive_clipping(self):
        node_xy = {1: (10, 10), 2: (2000, 2000)}  # node 2 is outside the fake 1000x1000 content area
        way_nodes = {
            100: [1],           # survives (node 1 is inside)
            200: [2],            # entirely clipped away (its only node is outside)
        }
        way_class = {100: "footway", 200: "rail"}
        rail_way_ids = {200}

        clipped_xy, kept_ways, kept_class, kept_rail_ids = to_clipped_image_px(
            node_xy, way_nodes, way_class, rail_way_ids, FakeGeoref())

        self.assertEqual(set(kept_ways.keys()), {100})
        self.assertEqual(kept_class, {100: "footway"})
        self.assertEqual(kept_rail_ids, set(), "way 200 was entirely clipped, so it must not still be reported as a rail way")

    def test_a_way_with_no_way_class_entry_at_all_is_simply_absent_from_the_kept_class_map(self):
        # A way this project's own parse.py chose not to classify (or a
        # future upstream tag gap) must not crash the export or invent a
        # fabricated class -- "no data" is the honest answer.
        node_xy = {1: (10, 10)}
        way_nodes = {100: [1]}
        clipped_xy, kept_ways, kept_class, kept_rail_ids = to_clipped_image_px(
            node_xy, way_nodes, {}, set(), FakeGeoref())
        self.assertEqual(kept_ways, {100: [1]})
        self.assertEqual(kept_class, {})
        self.assertEqual(kept_rail_ids, set())


def _feature(tags, coords, osm_way_id=1, fid="f1"):
    return {"id": fid, "osm_way_id": osm_way_id, "tags": tags, "geom": LineString(coords)}


class TestDeriveGapGraph(unittest.TestCase):
    """derive_gap_graph_from_features — the fix for a real, live bug: 527
    highway/railway-tagged features sat in a region travel-graph.json had
    zero road nodes for, because citymap/parse.py's parse_elements only adds
    a way to road_graph/rail_graph when Overpass returned a per-vertex
    `nodes` array of matching length. These features exist in the store
    regardless (the renderer already draws them) — this recovers them for
    routing too, without touching anything the real OSM import already
    covers.
    """

    def test_a_way_already_covered_by_the_real_graph_is_left_alone(self):
        node_xy = {1: (0, 0)}
        way_nodes, way_class, rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential"}, [(0, 0), (10, 0)], osm_way_id=42)],
            existing_road_way_ids={42}, existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_nodes, {}, "a way the real OSM import already covers must never be duplicated")
        self.assertEqual(node_xy, {1: (0, 0)}, "node_xy must not gain anything for an already-covered way")

    def test_a_genuinely_new_way_is_added_with_fresh_synthetic_node_ids(self):
        node_xy = {1: (0, 0)}  # unrelated existing node, elsewhere on the map
        way_nodes, way_class, rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential"}, [(100, 100), (110, 100)], osm_way_id=99)],
            existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_class, {"gap-99": "residential"})
        new_ids = way_nodes["gap-99"]
        self.assertEqual(len(new_ids), 2)
        self.assertTrue(all(n < 0 for n in new_ids), "a brand new node must get a synthetic (negative) id, never collide with a real positive OSM node id")
        self.assertEqual(node_xy[new_ids[0]], (100, 100))
        self.assertEqual(node_xy[new_ids[1]], (110, 100))

    def test_a_new_way_touching_an_existing_real_junction_reuses_its_real_node_id(self):
        # The connectivity-preserving case this whole function exists for:
        # a gap-filled road that meets the real network must actually JOIN
        # it, not become a disconnected island of its own.
        node_xy = {777: (50.0, 50.0)}  # a real junction from the existing graph
        way_nodes, _way_class, _rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential"}, [(50.0, 50.0), (200, 200)], osm_way_id=101)],
            existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_nodes["gap-101"][0], 777, "a new way starting exactly at an existing real node must reuse that node's real id, not mint a new one")

    def test_a_way_tagged_aeroway_is_never_restored_even_if_also_tagged_highway(self):
        node_xy = {}
        way_nodes, _way_class, _rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "service", "aeroway": "taxiway"}, [(0, 0), (10, 0)], osm_way_id=5)],
            existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_nodes, {}, "an aeroway-tagged way must never come back, whatever else it's tagged")

    def test_a_way_inside_the_exclusion_polygon_is_dropped_even_without_an_aeroway_tag(self):
        # op-0001's own note: the demolish union swept up some non-aeroway
        # footprint too (a staff-housing block). A tag-only filter would
        # miss exactly that, which is why this is a real geometry test.
        exclusion = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        node_xy = {}
        way_nodes, _way_class, _rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential"}, [(10, 10), (20, 20)], osm_way_id=6)],
            existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=exclusion)
        self.assertEqual(way_nodes, {}, "a way geometrically inside the exclusion zone must be dropped even with no aeroway tag at all")

    def test_a_way_outside_the_exclusion_polygon_is_unaffected(self):
        exclusion = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        node_xy = {}
        way_nodes, _way_class, _rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential"}, [(5000, 5000), (5010, 5000)], osm_way_id=7)],
            existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=exclusion)
        self.assertIn("gap-7", way_nodes, "a way nowhere near the exclusion zone must not be dropped")

    def test_a_way_tagged_both_highway_and_railway_becomes_two_separate_new_ways(self):
        node_xy = {}
        way_nodes, way_class, rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential", "railway": "tram"}, [(0, 0), (10, 0)], osm_way_id=8)],
            existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_class.get("gap-8"), "residential")
        self.assertEqual(way_class.get("gap-8-rail"), "tram")
        self.assertEqual(rail_ids, {"gap-8-rail"})

    def test_a_way_already_covered_as_a_road_but_not_as_rail_still_gets_its_rail_half_added(self):
        # A level-crossing-style way already in road_graph (real OSM import)
        # but whose railway half never made it in -- the road side must stay
        # untouched while the rail side is still recovered.
        node_xy = {}
        way_nodes, way_class, rail_ids = derive_gap_graph_from_features(
            [_feature({"highway": "residential", "railway": "tram"}, [(0, 0), (10, 0)], osm_way_id=9)],
            existing_road_way_ids={9}, existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        # The road half is already covered, so the bare "gap-9" key is claimed
        # by the RAIL data instead (never both) -- the real invariant is that
        # it holds rail's own class, not a re-added duplicate of the road.
        self.assertEqual(way_class.get("gap-9"), "tram", "the road half is already covered, so gap-9 must hold the rail data, never a duplicated 'residential'")
        self.assertEqual(rail_ids, {"gap-9"})

    def test_a_non_linestring_geometry_is_skipped_without_crashing(self):
        node_xy = {}
        feature = {"id": "f10", "osm_way_id": 10, "tags": {"highway": "residential"}, "geom": Point(0, 0)}
        way_nodes, _way_class, _rail_ids = derive_gap_graph_from_features(
            [feature], existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_nodes, {})

    def test_tags_stored_as_a_json_string_are_parsed_the_same_as_a_plain_dict(self):
        # gpkg.iter_all_features's own real rows carry tags as a JSON string
        # column, not a live dict -- this must handle both.
        import json
        node_xy = {}
        feature = {"id": "f11", "osm_way_id": 11, "tags": json.dumps({"highway": "residential"}), "geom": LineString([(0, 0), (10, 0)])}
        way_nodes, way_class, _rail_ids = derive_gap_graph_from_features(
            [feature], existing_road_way_ids=set(), existing_rail_way_ids=set(),
            node_xy=node_xy, exclusion_polygon=None)
        self.assertEqual(way_class.get("gap-11"), "residential")


if __name__ == "__main__":
    unittest.main()
