"""Parsing tests, including two regressions from the 2026-08-23 render session.

Both bugs presented identically -- a large piece of real land rendering as open
sea -- and both took several attempts to pin down, so both are locked down here
against the real cached Overpass extract where it is available.

  1. MULTIPOLYGON RELATIONS. Port Island's coastline exists only as relation
     6421263; there is no way-level equivalent. A way-only parser silently
     renders 8.4 km2 of city as ocean.

  2. LINEAR AEROWAY. Kobe Airport's runway and taxiways are unclosed
     centrelines, so an area-only land test finds no evidence on the pavement
     between the grass strips and classifies the airfield as sea.

The tests that need the 132 MB cache skip loudly when it is absent (a fresh
clone has no cache), per design/testing-strategy.md rule 5.
"""

import glob
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from pyproj import Transformer  # noqa: E402
from shapely.geometry import Point  # noqa: E402

from citymap import parse  # noqa: E402

FWD = Transformer.from_crs("EPSG:4326", "EPSG:6674", always_xy=True)

# Where the render session's Overpass cache lives. Not in the repo (bulk).
SCRATCH_CACHE = os.path.join(
    os.environ.get("TEMP", ""), "claude",
    "E--Mythica-Machina-Business-Blank-Inheritance",
    "a6dc3b76-df33-4055-92f4-6bae83ea1e6f", "scratchpad", "osm-cache",
)
REPO_CACHE = os.path.join(os.path.dirname(__file__), "..", "..",
                          "tools", "city-map", "cache", "source")

PORT_ISLAND_RELATION = 6421263
PORT_ISLAND_CENTROID = (135.2232901, 34.6664792)
PORT_ISLAND_AREA_KM2 = 8.38


def _find_big_cache():
    """Largest cached Overpass response, or None. Must contain relations."""
    candidates = []
    for root in (SCRATCH_CACHE, REPO_CACHE):
        if os.path.isdir(root):
            candidates.extend(glob.glob(os.path.join(root, "*.json")))
    if not candidates:
        return None
    candidates.sort(key=os.path.getsize, reverse=True)
    return candidates[0]


class TestHeightOf(unittest.TestCase):
    def test_explicit_height_wins(self):
        self.assertAlmostEqual(parse.height_of({"building": "yes", "height": "24"}), 24.0)

    def test_levels_convert_at_storey_height(self):
        self.assertAlmostEqual(
            parse.height_of({"building": "yes", "building:levels": "6"}), 6 * 3.3)

    def test_units_and_multivalues_tolerated(self):
        self.assertAlmostEqual(parse.height_of({"building": "y", "height": "12 m"}), 12.0)
        self.assertAlmostEqual(parse.height_of({"building": "y", "height": "12;18"}), 12.0)

    def test_garbage_falls_through_to_type_default(self):
        self.assertAlmostEqual(parse.height_of({"building": "house", "height": "tall"}), 6.5)

    def test_never_returns_zero(self):
        # A zero-height building casts no shadow and reads as a hole.
        self.assertGreaterEqual(parse.height_of({"building": "yes", "height": "0"}), 2.5)


class TestRelationReconstruction(unittest.TestCase):
    """Regression 1: relations are real geometry, not optional extras."""

    def test_simple_square_relation(self):
        element = {
            "type": "relation", "id": 1,
            "tags": {"type": "multipolygon", "landuse": "industrial"},
            "members": [{"role": "outer", "type": "way", "geometry": [
                {"lon": 135.20, "lat": 34.67}, {"lon": 135.21, "lat": 34.67},
                {"lon": 135.21, "lat": 34.68}, {"lon": 135.20, "lat": 34.68},
                {"lon": 135.20, "lat": 34.67},
            ]}],
        }
        geom = parse.polygon_from_relation(element, FWD)
        self.assertIsNotNone(geom)
        self.assertGreater(geom.area, 0)

    def test_inner_role_becomes_a_hole(self):
        ring = lambda a, b, c, d: [  # noqa: E731
            {"lon": a, "lat": b}, {"lon": c, "lat": b},
            {"lon": c, "lat": d}, {"lon": a, "lat": d}, {"lon": a, "lat": b},
        ]
        element = {
            "type": "relation", "id": 2,
            "tags": {"type": "multipolygon", "landuse": "industrial"},
            "members": [
                {"role": "outer", "geometry": ring(135.20, 34.67, 135.22, 34.69)},
                {"role": "inner", "geometry": ring(135.205, 34.675, 135.215, 34.685)},
            ],
        }
        geom = parse.polygon_from_relation(element, FWD)
        self.assertIsNotNone(geom)
        solid = parse.polygon_from_relation(
            {**element, "members": element["members"][:1]}, FWD)
        self.assertLess(geom.area, solid.area, "inner ring must remove area")

    def test_missing_role_treated_as_outer(self):
        # Real OSM frequently omits the role on single-ring relations.
        element = {
            "type": "relation", "id": 3,
            "tags": {"type": "multipolygon", "natural": "wood"},
            "members": [{"geometry": [
                {"lon": 135.20, "lat": 34.67}, {"lon": 135.21, "lat": 34.67},
                {"lon": 135.21, "lat": 34.68}, {"lon": 135.20, "lat": 34.67},
            ]}],
        }
        self.assertIsNotNone(parse.polygon_from_relation(element, FWD))

    def test_unclosable_members_return_none_not_raise(self):
        # A relation clipped by the query bbox is normal, not an error.
        element = {
            "type": "relation", "id": 4,
            "tags": {"type": "multipolygon", "landuse": "industrial"},
            "members": [{"role": "outer", "geometry": [
                {"lon": 135.20, "lat": 34.67}, {"lon": 135.21, "lat": 34.67},
            ]}],
        }
        self.assertIsNone(parse.polygon_from_relation(element, FWD))

    def test_relation_is_area_selects_the_right_tags(self):
        yes = [
            {"type": "multipolygon", "landuse": "industrial"},
            {"type": "multipolygon", "place": "island"},
            {"type": "multipolygon", "natural": "wood"},
            {"type": "multipolygon", "aeroway": "apron"},
        ]
        no = [
            {"type": "route", "route": "bus"},          # not a multipolygon
            {"type": "multipolygon"},                    # no area-ish tag
            {"type": "restriction", "restriction": "no_left_turn"},
        ]
        for tags in yes:
            self.assertTrue(parse.relation_is_area(tags), tags)
        for tags in no:
            self.assertFalse(parse.relation_is_area(tags), tags)

    def test_absurdly_large_relation_is_rejected(self):
        """REGRESSION: relation 382313 is Honshu itself, 228,438 km2.

        `relation["place"="island"]` in the Overpass query has no size filter,
        and Overpass matches a relation against a bbox if ANY member falls
        inside it -- so a query anywhere on Honshu faithfully reconstructs the
        entire mainland. It never corrupted a render (it IS real land) but
        silently cost every render 30-40+ seconds of wasted buffer() work
        downstream in the sea carve-out, on a 580,397-vertex blob. Found via a
        test that took 40s when everything else took milliseconds, not from a
        visibly wrong image.
        """
        # A plausible ~200 km2 square -- just at the cap.
        big_square = [
            {"lon": 135.0, "lat": 34.0}, {"lon": 135.15, "lat": 34.0},
            {"lon": 135.15, "lat": 34.15}, {"lon": 135.0, "lat": 34.15},
            {"lon": 135.0, "lat": 34.0},
        ]
        element = {
            "type": "relation", "id": 999,
            "tags": {"type": "multipolygon", "place": "island"},
            "members": [{"role": "outer", "geometry": big_square}],
        }
        features, _, _, _ = parse.parse_elements([element], FWD)
        self.assertEqual(features, [], "an island the size of Honshu must be rejected")

    def test_a_real_scale_island_relation_still_reconstructs(self):
        square = [
            {"lon": 135.20, "lat": 34.66}, {"lon": 135.23, "lat": 34.66},
            {"lon": 135.23, "lat": 34.69}, {"lon": 135.20, "lat": 34.69},
            {"lon": 135.20, "lat": 34.66},
        ]
        element = {
            "type": "relation", "id": 998,
            "tags": {"type": "multipolygon", "place": "island"},
            "members": [{"role": "outer", "geometry": square}],
        }
        features, _, _, _ = parse.parse_elements([element], FWD)
        self.assertEqual(len(features), 1, "a Port-Island-scale relation must survive the cap")

    def test_port_island_against_real_data(self):
        """The actual bug, against the actual extract."""
        cache = _find_big_cache()
        if cache is None:
            self.skipTest("no cached Overpass extract available -- "
                          "cannot verify Port Island reconstruction")
        with open(cache, encoding="utf-8") as fh:
            data = json.load(fh)
        rel = next((e for e in data["elements"]
                    if e.get("type") == "relation" and e.get("id") == PORT_ISLAND_RELATION),
                   None)
        if rel is None:
            self.skipTest(f"relation {PORT_ISLAND_RELATION} not in {os.path.basename(cache)}")

        geom = parse.polygon_from_relation(rel, FWD)
        self.assertIsNotNone(geom, "Port Island must reconstruct from its relation")
        self.assertTrue(geom.is_valid)
        self.assertAlmostEqual(geom.area / 1e6, PORT_ISLAND_AREA_KM2, delta=0.15,
                               msg="reconstructed area must match the real island")
        self.assertTrue(
            geom.contains(Point(*FWD.transform(*PORT_ISLAND_CENTROID))),
            "must contain the island's own documented centroid",
        )


class TestLandContent(unittest.TestCase):
    """Regression 2: linear aeroway centrelines are land evidence."""

    def _feature(self, geom, tags, area):
        return parse.Feature(id="x", geom=geom, tags=tags, area=area)

    def test_linear_runway_contributes_buffered_land(self):
        from shapely.geometry import LineString
        runway = self._feature(LineString([(0, 0), (1000, 0)]),
                               {"aeroway": "runway"}, area=False)
        content = parse.land_content([runway])
        self.assertEqual(len(content), 1)
        # A point 20 m off the centreline is still on the pavement.
        self.assertTrue(content[0].contains(Point(500, 20)))

    def test_linear_taxiway_narrower_than_runway(self):
        from shapely.geometry import LineString
        line = LineString([(0, 0), (1000, 0)])
        runway = parse.land_content([self._feature(line, {"aeroway": "runway"}, False)])[0]
        taxi = parse.land_content([self._feature(line, {"aeroway": "taxiway"}, False)])[0]
        self.assertGreater(runway.area, taxi.area)

    def test_water_natural_is_not_land(self):
        from shapely.geometry import Polygon
        square = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        for value in ("water", "coastline", "bay", "strait"):
            got = parse.land_content([self._feature(square, {"natural": value}, True)])
            self.assertEqual(got, [], f"natural={value} must not count as land")

    def test_island_place_tag_counts_as_land(self):
        from shapely.geometry import Polygon
        square = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        got = parse.land_content([self._feature(square, {"place": "island"}, True)])
        self.assertEqual(len(got), 1)

    def test_plain_linear_road_is_not_land_content(self):
        from shapely.geometry import LineString
        road = self._feature(LineString([(0, 0), (100, 0)]), {"highway": "service"}, False)
        self.assertEqual(parse.land_content([road]), [])


class TestFeatureAttrsRoundTrip(unittest.TestCase):
    """The consolidated to_attrs/from_attrs pair -- see Feature.to_attrs's
    docstring for the bug it replaced (source was silently dropped by two
    independently-duplicated inline versions in world.py and fields.py)."""

    def _square(self):
        from shapely.geometry import Polygon
        return Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])

    def test_basic_round_trip(self):
        f = parse.Feature(id="x", geom=self._square(), tags={"building": "yes"},
                          area=True, height_m=12.5)
        back = parse.Feature.from_attrs(f.geom, f.to_attrs())
        self.assertEqual(back.id, f.id)
        self.assertEqual(back.tags, f.tags)
        self.assertEqual(back.area, f.area)
        self.assertAlmostEqual(back.height_m, f.height_m)
        self.assertEqual(back.source, "osm")

    def test_source_survives(self):
        """The specific bug: an op-sourced feature must not silently become
        source='osm' on reload."""
        f = parse.Feature(id="x", geom=self._square(), tags={}, area=True,
                          source="op:op-0001")
        back = parse.Feature.from_attrs(f.geom, f.to_attrs())
        self.assertEqual(back.source, "op:op-0001")

    def test_osm_way_id_survives_when_present(self):
        f = parse.Feature(id="x", geom=self._square(), tags={}, area=True,
                          osm_way_id=12345)
        back = parse.Feature.from_attrs(f.geom, f.to_attrs())
        self.assertEqual(back.osm_way_id, 12345)

    def test_osm_way_id_stays_none_when_absent(self):
        f = parse.Feature(id="x", geom=self._square(), tags={}, area=True)
        back = parse.Feature.from_attrs(f.geom, f.to_attrs())
        self.assertIsNone(back.osm_way_id)

    def test_real_tags_are_not_clobbered_by_the_namespaced_fields(self):
        f = parse.Feature(id="x", geom=self._square(),
                          tags={"building": "yes", "name": "Test Hall"}, area=True)
        attrs = f.to_attrs()
        self.assertEqual(attrs["building"], "yes")
        self.assertEqual(attrs["name"], "Test Hall")
        back = parse.Feature.from_attrs(f.geom, attrs)
        self.assertEqual(back.tags, {"building": "yes", "name": "Test Hall"})

    def test_to_attrs_does_not_mutate_the_feature(self):
        f = parse.Feature(id="x", geom=self._square(), tags={"a": "b"}, area=True)
        f.to_attrs()
        self.assertEqual(f.tags, {"a": "b"})

    def test_from_attrs_does_not_mutate_the_caller_dict(self):
        f = parse.Feature(id="x", geom=self._square(), tags={"a": "b"}, area=True)
        attrs = f.to_attrs()
        snapshot = dict(attrs)
        parse.Feature.from_attrs(f.geom, attrs)
        self.assertEqual(attrs, snapshot)


class TestRoadGraph(unittest.TestCase):
    """The topology §2 assumed existed but nothing had built."""

    def _elements(self):
        # Two ways sharing node 100 mid-run, plus a spur ending at node 300.
        return [
            {"type": "way", "id": 1, "tags": {"highway": "residential"},
             "nodes": [10, 100, 11],
             "geometry": [{"lon": 135.20, "lat": 34.67},
                          {"lon": 135.21, "lat": 34.67},
                          {"lon": 135.22, "lat": 34.67}]},
            {"type": "way", "id": 2, "tags": {"highway": "service"},
             "nodes": [100, 300],
             "geometry": [{"lon": 135.21, "lat": 34.67},
                          {"lon": 135.21, "lat": 34.68}]},
        ]

    def test_graph_is_built_from_shared_node_ids(self):
        _, graph, _, _ = parse.parse_elements(self._elements(), FWD)
        self.assertIn(100, graph.node_ways)
        self.assertEqual(graph.node_ways[100], {1, 2})

    def test_shared_midpoint_is_a_junction(self):
        _, graph, _, _ = parse.parse_elements(self._elements(), FWD)
        # Node 100 is mid-way on way 1 (degree 2) and an end of way 2 (degree 1).
        self.assertEqual(graph.degree(100), 3)
        self.assertIn(100, graph.junctions())

    def test_true_dead_end_detected(self):
        _, graph, _, _ = parse.parse_elements(self._elements(), FWD)
        self.assertEqual(graph.degree(300), 1)
        self.assertIn(300, graph.dead_ends())

    def test_way_split_is_not_a_junction(self):
        """The 96% case: a mapper changed a tag mid-street.

        Two ways meeting end-to-end is degree 2 -- the road simply continues.
        Treating it as a connection target puts a T in a straight road.
        """
        elements = [
            {"type": "way", "id": 1, "tags": {"highway": "residential"},
             "nodes": [10, 50],
             "geometry": [{"lon": 135.20, "lat": 34.67}, {"lon": 135.21, "lat": 34.67}]},
            {"type": "way", "id": 2, "tags": {"highway": "residential"},
             "nodes": [50, 11],
             "geometry": [{"lon": 135.21, "lat": 34.67}, {"lon": 135.22, "lat": 34.67}]},
        ]
        _, graph, _, _ = parse.parse_elements(elements, FWD)
        self.assertEqual(graph.degree(50), 2)
        self.assertNotIn(50, graph.junctions())
        self.assertNotIn(50, graph.dead_ends())

    def test_classes_at_node(self):
        _, graph, _, _ = parse.parse_elements(self._elements(), FWD)
        self.assertEqual(graph.classes_at(100), {"residential", "service"})

    def test_non_highway_ways_stay_out_of_the_graph(self):
        elements = [{"type": "way", "id": 9, "tags": {"waterway": "river"},
                     "nodes": [1, 2],
                     "geometry": [{"lon": 135.20, "lat": 34.67},
                                  {"lon": 135.21, "lat": 34.67}]}]
        _, graph, _, _ = parse.parse_elements(elements, FWD)
        self.assertEqual(len(graph.node_ways), 0)

    def test_railway_ways_build_a_separate_graph(self):
        """The bug this exists to prevent from recurring: a railway bridge
        left dangling after a demolish because railways had no graph at all."""
        elements = [{"type": "way", "id": 50, "tags": {"railway": "rail"},
                     "nodes": [1, 2],
                     "geometry": [{"lon": 135.20, "lat": 34.67},
                                  {"lon": 135.21, "lat": 34.67}]}]
        _, road_graph, rail_graph, _ = parse.parse_elements(elements, FWD)
        self.assertEqual(len(road_graph.node_ways), 0)
        self.assertIn(1, rail_graph.node_ways)
        self.assertEqual(rail_graph.way_class[50], "rail")

    def test_a_way_tagged_both_highway_and_railway_joins_both_graphs(self):
        elements = [{"type": "way", "id": 51, "tags": {"highway": "service", "railway": "tram"},
                     "nodes": [1, 2],
                     "geometry": [{"lon": 135.20, "lat": 34.67},
                                  {"lon": 135.21, "lat": 34.67}]}]
        _, road_graph, rail_graph, _ = parse.parse_elements(elements, FWD)
        self.assertIn(51, road_graph.way_nodes)
        self.assertIn(51, rail_graph.way_nodes)


class TestParseElements(unittest.TestCase):
    def test_closed_way_becomes_an_area(self):
        elements = [{"type": "way", "id": 1, "tags": {"building": "yes"},
                     "geometry": [{"lon": 135.20, "lat": 34.67},
                                  {"lon": 135.201, "lat": 34.67},
                                  {"lon": 135.201, "lat": 34.671},
                                  {"lon": 135.20, "lat": 34.67}]}]
        features, _, _, _ = parse.parse_elements(elements, FWD)
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].area)
        self.assertTrue(features[0].is_building())
        self.assertGreater(features[0].height_m, 0)

    def test_street_lamps_come_back_separately(self):
        elements = [{"type": "node", "id": 1, "lon": 135.2, "lat": 34.67,
                     "tags": {"highway": "street_lamp"}}]
        features, _, _, lamps = parse.parse_elements(elements, FWD)
        self.assertEqual(features, [])
        self.assertEqual(len(lamps), 1)

    def test_ids_are_stable_and_source_derived(self):
        elements = [{"type": "way", "id": 12345, "tags": {"highway": "service"},
                     "geometry": [{"lon": 135.20, "lat": 34.67},
                                  {"lon": 135.21, "lat": 34.67}]}]
        a, _, _, _ = parse.parse_elements(elements, FWD)
        b, _, _, _ = parse.parse_elements(elements, FWD)
        self.assertEqual(a[0].id, b[0].id)

    def test_bridge_detection(self):
        def feat(tags):
            from shapely.geometry import LineString
            return parse.Feature(id="x", geom=LineString([(0, 0), (1, 1)]),
                                 tags=tags, area=False)
        self.assertTrue(feat({"bridge": "yes"}).is_bridge())
        self.assertTrue(feat({"layer": "1"}).is_bridge())
        self.assertFalse(feat({"bridge": "no"}).is_bridge())
        self.assertFalse(feat({"layer": "-1"}).is_bridge())   # a tunnel
        self.assertFalse(feat({"layer": "garbage"}).is_bridge())
        self.assertFalse(feat({}).is_bridge())


if __name__ == "__main__":
    unittest.main()
