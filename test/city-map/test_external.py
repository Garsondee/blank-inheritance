# -*- coding: utf-8 -*-
"""citymap.external -- GSI designated evacuation sites (指定緊急避難場所).

Pure parsing/projection tests on hand-built GeoJSON; nothing here touches the
network. The one real-data check is a loud skip when the cache is cold, per
design/testing-strategy.md rule 5.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap import external  # noqa: E402
from citymap.frame import Frame  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)


def feature(lon, lat, name="x", **hazards):
    props = {external.NAME_FIELD: name}
    props.update(hazards)
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": props}


class TestHazardFlags(unittest.TestCase):
    def test_only_the_literal_string_one_counts_as_designated(self):
        """GSI writes "1" or "" -- never booleans, never null. Plain Python
        truthiness would also accept "0" or "指定なし", which would silently
        mark every site as designated for everything."""
        self.assertEqual(external.primary_hazard({"津波": "1"}), "津波")
        self.assertIsNone(external.primary_hazard({"津波": ""}))
        self.assertIsNone(external.primary_hazard({"津波": "0"}))
        self.assertIsNone(external.primary_hazard({}))

    def test_precedence_puts_coastal_inundation_first(self):
        """A site is designated for several hazards at once, so one symbol
        needs one winner -- and on a port-city map the water is the question
        that matters."""
        both = {"地震": "1", "津波": "1", "大規模な火事": "1"}
        self.assertEqual(external.primary_hazard(both), "津波")
        no_water = {"地震": "1", "大規模な火事": "1"}
        self.assertEqual(external.primary_hazard(no_water), "大規模な火事")

    def test_hazard_count_counts_only_designated_flags(self):
        self.assertEqual(external.hazard_count({"津波": "1", "地震": "1", "洪水": ""}), 2)
        self.assertEqual(external.hazard_count({}), 0)

    def test_every_hazard_field_is_one_of_the_eight_legal_categories(self):
        self.assertEqual(len(external.HAZARD_FIELDS), 8)
        self.assertEqual(len(set(external.HAZARD_FIELDS)), 8)
        for field in external.WATER_HAZARDS:
            self.assertIn(field, external.HAZARD_FIELDS)


class TestParsing(unittest.TestCase):
    def test_a_point_feature_parses_with_its_hazards(self):
        gj = {"features": [feature(135.2, 34.68, "板宿小学校", **{"津波": "1", "地震": "1"})]}
        got = external.parse_evacuation_features(gj)
        self.assertEqual(len(got), 1)
        self.assertEqual(got[0]["name"], "板宿小学校")
        self.assertEqual(got[0]["primary"], "津波")
        self.assertEqual(got[0]["count"], 2)
        self.assertTrue(got[0]["water"])

    def test_a_non_water_site_is_not_flagged_water(self):
        gj = {"features": [feature(135.2, 34.68, **{"大規模な火事": "1"})]}
        got = external.parse_evacuation_features(gj)
        self.assertFalse(got[0]["water"])

    def test_non_point_and_malformed_geometry_are_dropped(self):
        gj = {"features": [
            {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": []}, "properties": {}},
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [1.0]}, "properties": {}},
            {"type": "Feature", "geometry": None, "properties": {}},
        ]}
        self.assertEqual(external.parse_evacuation_features(gj), [])

    def test_an_empty_document_is_not_an_error(self):
        self.assertEqual(external.parse_evacuation_features({}), [])


class TestProjection(unittest.TestCase):
    def test_a_site_at_the_frame_centre_lands_at_the_frame_centre(self):
        sites = [{"lon": FRAME.center_lon, "lat": FRAME.center_lat,
                 "name": "c", "primary": "津波", "count": 1, "water": True}]
        placed = external.sites_to_map_space(sites, FRAME)
        self.assertEqual(len(placed), 1)
        self.assertAlmostEqual(placed[0]["map_x"], FRAME.cx, delta=1.0)
        self.assertAlmostEqual(placed[0]["map_y"], FRAME.cy, delta=1.0)

    def test_a_site_far_outside_the_frame_is_dropped(self):
        sites = [{"lon": 136.5, "lat": 35.4, "name": "far",
                 "primary": None, "count": 0, "water": False}]
        self.assertEqual(external.sites_to_map_space(sites, FRAME), [])

    def test_projection_keeps_the_original_fields(self):
        sites = [{"lon": FRAME.center_lon, "lat": FRAME.center_lat,
                 "name": "keepme", "primary": "洪水", "count": 3, "water": True}]
        placed = external.sites_to_map_space(sites, FRAME)
        self.assertEqual(placed[0]["name"], "keepme")
        self.assertEqual(placed[0]["count"], 3)


class TestZoningParsing(unittest.TestCase):
    def test_polygon_and_multipolygon_rings_are_both_read(self):
        poly = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}
        multi = {"type": "MultiPolygon",
                "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]],
                                [[[2, 2], [3, 2], [3, 3], [2, 2]]]]}
        self.assertEqual(len(list(external._iter_polygon_rings(poly))), 1)
        self.assertEqual(len(list(external._iter_polygon_rings(multi))), 2)

    def test_unsupported_geometry_yields_nothing(self):
        line = {"type": "LineString", "coordinates": [[0, 0], [1, 1]]}
        self.assertEqual(list(external._iter_polygon_rings(line)), [])
        self.assertEqual(list(external._iter_polygon_rings({})), [])

    def test_zone_field_names_match_the_published_schema(self):
        """A29's columns are positional codes, not readable names -- getting
        one wrong would silently colour the map by the wrong attribute."""
        self.assertEqual(external.ZONE_NAME_FIELD, "A29_005")      # 用途地域名
        self.assertEqual(external.ZONE_COVERAGE_FIELD, "A29_006")  # 建蔽率
        self.assertEqual(external.ZONE_FAR_FIELD, "A29_007")       # 容積率


class TestZoningAgainstRealCachedData(unittest.TestCase):
    def test_cached_zoning_loads_clipped_into_map_space(self):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        cache_dir = os.path.join(repo_root, "tools", "city-map", "cache", "source", "external")
        if not os.path.exists(os.path.join(cache_dir, "ksj-zoning-28100.geojson")):
            self.skipTest("no cached MLIT zoning -- run a --mode layers render first")
        zones = external.load_zoning(cache_dir, FRAME)
        self.assertGreater(len(zones), 100)
        names = {z["zone"] for z in zones}
        self.assertIn("商業地域", names)
        half = FRAME.extent_m / 2.0
        for z in zones[:50]:
            minx, miny, maxx, maxy = z["geom"].bounds
            self.assertGreaterEqual(minx, FRAME.cx - half - 1.0)
            self.assertLessEqual(maxx, FRAME.cx + half + 1.0)


class TestAttribution(unittest.TestCase):
    def test_attribution_names_gsi_and_carries_the_not_authoritative_warning(self):
        """PDL 1.0 permits the use; the 'per hazard type, may not be current,
        not authoritative guidance' condition travels downstream with it."""
        self.assertIn("国土地理院", external.ATTRIBUTION)
        self.assertIn("not authoritative", external.ATTRIBUTION.lower())

    def test_zoning_attribution_states_it_is_a_derived_work(self):
        """MLIT requires modified use to say so explicitly (をもとに作成),
        not just to cite the source."""
        self.assertIn("国土数値情報", external.ZONING_ATTRIBUTION)
        self.assertIn("をもとに作成", external.ZONING_ATTRIBUTION)


class TestAgainstRealCachedData(unittest.TestCase):
    def test_cached_gsi_data_parses_and_lands_in_the_frame(self):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        cache_dir = os.path.join(repo_root, "tools", "city-map", "cache", "source", "external")
        if not os.path.isdir(cache_dir) or not os.listdir(cache_dir):
            self.skipTest("no cached GSI evacuation data -- run a --mode layers render first")
        sites = external.load_evacuation_sites(cache_dir)
        self.assertGreater(len(sites), 100)
        placed = external.sites_to_map_space(sites, FRAME)
        self.assertGreater(len(placed), 50)
        self.assertLess(len(placed), len(sites), "the frame is smaller than the fetch area")
        self.assertTrue(any(s["water"] for s in placed), "a port city must have water-rated sites")


if __name__ == "__main__":
    unittest.main()
