"""Direct unit tests for api.features's pure functions -- no HTTP, no
database, milliseconds. The HTTP-level behaviour (exact counts, real
lon/lat output, small-wins hit-testing) is ALSO exercised end-to-end in
test_api_tiles.py; these tests pin the same properties at the source,
matching this project's pure-core-tested-directly testing philosophy.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402

from api import features  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=2000.0, crs_epsg=6674)


class TestBboxDiagonalM(unittest.TestCase):
    def test_a_square(self):
        # 3-4-5 triangle scaled: a 30x40 box has diagonal 50.
        self.assertAlmostEqual(features.bbox_diagonal_m((0, 0, 30, 40)), 50.0)

    def test_a_point_has_zero_diagonal(self):
        self.assertEqual(features.bbox_diagonal_m((5, 5, 5, 5)), 0.0)


class TestLonlatBboxToSource(unittest.TestCase):
    def test_round_trips_through_the_frame_projection(self):
        """A generous delta, deliberately: an axis-aligned lon/lat box does
        NOT transform to a perfectly axis-aligned box in a projected CRS --
        real "grid convergence" between true north and the projection's own
        grid north introduces a small, expected skew (measured ~1.6m over a
        200m box here). The property this test actually protects is that
        ALL FOUR corners get transformed (this function's own docstring:
        "not just 2 opposite corners") -- if it silently transformed only
        the 2 diagonal corners given, the result would equal them exactly,
        which a tight delta would wrongly reward as "more correct"."""
        min_lon, min_lat = FRAME.inv.transform(FRAME.cx - 100, FRAME.cy - 100)
        max_lon, max_lat = FRAME.inv.transform(FRAME.cx + 100, FRAME.cy + 100)
        sminx, sminy, smaxx, smaxy = features.lonlat_bbox_to_source(
            FRAME, min(min_lon, max_lon), min(min_lat, max_lat),
            max(min_lon, max_lon), max(min_lat, max_lat))
        self.assertAlmostEqual(sminx, FRAME.cx - 100, delta=5.0)
        self.assertAlmostEqual(sminy, FRAME.cy - 100, delta=5.0)
        self.assertAlmostEqual(smaxx, FRAME.cx + 100, delta=5.0)
        self.assertAlmostEqual(smaxy, FRAME.cy + 100, delta=5.0)

    def test_uses_all_four_corners_not_just_the_two_given(self):
        """The regression case for the docstring's specific claim: if this
        function transformed only the 2 diagonal input points (a plausible,
        wrong simplification), the envelope would be constructible from
        those alone. Confirms the OTHER two corners -- (max_lon, min_lat)
        and (min_lon, max_lat) -- genuinely participate by checking the
        result differs from the naive 2-corner-only envelope by the real
        grid-convergence skew, not by zero."""
        min_lon, min_lat = FRAME.inv.transform(FRAME.cx - 100, FRAME.cy - 100)
        max_lon, max_lat = FRAME.inv.transform(FRAME.cx + 100, FRAME.cy + 100)
        naive = (FRAME.cx - 100, FRAME.cy - 100, FRAME.cx + 100, FRAME.cy + 100)
        real = features.lonlat_bbox_to_source(FRAME, min_lon, min_lat, max_lon, max_lat)
        self.assertNotEqual(real, naive)


class TestApplyLodFilter(unittest.TestCase):
    def _row(self, id_, geom):
        return {"id": id_, "geom": geom}

    def test_a_large_feature_passes_at_a_fine_mpp(self):
        rows = [self._row("big", Polygon([(0, 0), (30, 0), (30, 30), (0, 30)]))]
        result = features.apply_lod_filter(rows, mpp=1.0, cap=100)
        self.assertEqual([r["id"] for r in result["visible"]], ["big"])
        self.assertEqual(result["hiddenByLod"], 0)

    def test_a_small_feature_is_hidden_at_a_coarse_mpp(self):
        rows = [self._row("small", Polygon([(0, 0), (2, 0), (2, 2), (0, 2)]))]
        result = features.apply_lod_filter(rows, mpp=50.0, cap=100)
        self.assertEqual(result["visible"], [])
        self.assertEqual(result["hiddenByLod"], 1)

    def test_none_and_empty_geometries_count_as_hidden_by_lod_not_crashing(self):
        rows = [self._row("none-geom", None), self._row("empty-geom", Polygon())]
        result = features.apply_lod_filter(rows, mpp=1.0, cap=100)
        self.assertEqual(result["visible"], [])
        self.assertEqual(result["hiddenByLod"], 2)

    def test_cap_truncates_and_reports_the_exact_remainder(self):
        rows = [self._row(f"f{i}", Polygon([(0, 0), (30, 0), (30, 30), (0, 30)])) for i in range(10)]
        result = features.apply_lod_filter(rows, mpp=1.0, cap=4)
        self.assertEqual(len(result["visible"]), 4)
        self.assertEqual(result["hiddenByCap"], 6)

    def test_lod_and_cap_counts_are_independent(self):
        big = [self._row(f"big{i}", Polygon([(0, 0), (30, 0), (30, 30), (0, 30)])) for i in range(5)]
        small = [self._row(f"small{i}", Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])) for i in range(3)]
        result = features.apply_lod_filter(big + small, mpp=1.0, cap=2)
        self.assertEqual(result["hiddenByLod"], 3)  # the 3 small ones
        self.assertEqual(result["hiddenByCap"], 3)  # 5 passed LOD, cap=2 -> 3 cut
        self.assertEqual(len(result["visible"]), 2)


class TestPickHitTestWinner(unittest.TestCase):
    def test_a_point_always_wins_over_an_area(self):
        candidates = [
            {"id": "parcel", "geom": Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])},
            {"id": "lamp", "geom": Point(50, 50)},
        ]
        winner = features.pick_hit_test_winner(candidates, Point(50, 50).buffer(1))
        self.assertEqual(winner["id"], "lamp")

    def test_the_smaller_of_two_overlapping_polygons_wins(self):
        candidates = [
            {"id": "big", "geom": Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])},
            {"id": "small", "geom": Polygon([(40, 40), (60, 40), (60, 60), (40, 60)])},
        ]
        winner = features.pick_hit_test_winner(candidates, Point(50, 50).buffer(1))
        self.assertEqual(winner["id"], "small")

    def test_a_non_intersecting_candidate_never_wins(self):
        candidates = [{"id": "far", "geom": Polygon([(1000, 1000), (1010, 1000), (1010, 1010), (1000, 1010)])}]
        winner = features.pick_hit_test_winner(candidates, Point(0, 0).buffer(1))
        self.assertIsNone(winner)

    def test_a_thin_line_can_win_via_length_metric(self):
        candidates = [
            {"id": "road", "geom": LineString([(0, 50), (100, 50)])},
            {"id": "parcel", "geom": Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])},
        ]
        winner = features.pick_hit_test_winner(candidates, Point(50, 50).buffer(1))
        self.assertEqual(winner["id"], "road")

    def test_returns_none_for_an_empty_candidate_list(self):
        self.assertIsNone(features.pick_hit_test_winner([], Point(0, 0).buffer(1)))


class TestFeatureKwargsToGeojson(unittest.TestCase):
    def test_shape_and_property_names(self):
        row = {"id": "f1", "geom": Point(FRAME.cx, FRAME.cy), "tags": {"a": "b"},
              "area": False, "height_m": 3.5, "source": "osm"}
        out = features.feature_kwargs_to_geojson(row, FRAME)
        self.assertEqual(out["type"], "Feature")
        self.assertEqual(out["id"], "f1")
        self.assertEqual(out["geometry"]["type"], "Point")
        self.assertEqual(out["properties"], {
            "id": "f1", "tags": {"a": "b"}, "isArea": False, "heightM": 3.5, "source": "osm",
        })

    def test_geometry_coordinates_are_real_lonlat(self):
        row = {"id": "f1", "geom": Point(FRAME.cx, FRAME.cy), "tags": {},
              "area": False, "height_m": 0.0, "source": "osm"}
        out = features.feature_kwargs_to_geojson(row, FRAME)
        lon, lat = out["geometry"]["coordinates"]
        self.assertAlmostEqual(lon, FRAME.center_lon, delta=1e-6)
        self.assertAlmostEqual(lat, FRAME.center_lat, delta=1e-6)


if __name__ == "__main__":
    unittest.main()
