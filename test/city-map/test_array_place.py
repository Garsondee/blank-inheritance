"""citymap.tools.array_place tests -- map-editor plan Phase 9.

Uses a small, fast Frame/Fields fixture (rotation_deg=0 keeps SOURCE and MAP
space identical, matching test_terrace.py's own established trick) and
SMALL routing_cell_m/routing_window_* overrides so the real-router tests
stay fast without touching production behaviour (place_array's own
docstring explains why those are parameters, not hardcoded).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Polygon  # noqa: E402

from citymap.frame import Frame  # noqa: E402
from citymap.parse import Feature  # noqa: E402
from citymap.fields import Fields  # noqa: E402
from citymap.ops import construct as construct_module  # noqa: E402
from citymap.tools import array_place  # noqa: E402

FRAME = Frame(id="t", center_lon=135.0, center_lat=35.0,
             rotation_deg=0.0, extent_m=400.0, crs_epsg=6674, dem_grid=32)
CX, CY = FRAME.cx, FRAME.cy

# Small enough that the real A* router finishes fast; still big enough to
# leave real room around a handful of test instances.
FAST_ROUTING = dict(routing_cell_m=2.0, routing_window_min_m=20.0, routing_window_margin_m=10.0)


def flat_fields(features=()) -> Fields:
    n = FRAME.dem_grid
    elevation = np.full((n, n), 10.0, dtype=np.float32)
    shade = np.ones((n, n, 3), dtype=np.float32)
    return Fields(frame=FRAME, features=list(features), lamps=[], elevation=elevation,
                 shade_rgb=shade, sea_depth_t=None, dem_tiles_fetched=0, dem_tiles_missing=0)


def road_feature(coords, fid="road-1") -> Feature:
    return Feature(id=fid, geom=LineString(coords), tags={"highway": "residential"},
                   area=False, height_m=0.0, source="test")


def building_feature(polygon, fid="bldg-1") -> Feature:
    return Feature(id=fid, geom=polygon, tags={"building": "yes"}, area=True,
                   height_m=6.0, source="test")


def small_square_footprint(half=3.0) -> Polygon:
    return Polygon([(CX - half, CY - half), (CX + half, CY - half),
                    (CX + half, CY + half), (CX - half, CY + half)])


def marker_triangle_footprint() -> Polygon:
    """A real, asymmetric footprint -- an apex noticeably offset from the
    base, so orientation tests can tell 'placed facing the tangent
    direction' apart from 'placed mirrored' (see array_place.
    _tangent_rotation_deg's own docstring for why that distinction is the
    whole point of this test)."""
    apex = (CX, CY + 8.0)
    base_left = (CX - 4.0, CY - 4.0)
    base_right = (CX + 4.0, CY - 4.0)
    return Polygon([apex, base_right, base_left])


class TestValidation(unittest.TestCase):
    def test_rejects_non_positive_spacing(self):
        with self.assertRaises(array_place.ArrayError):
            array_place.place_array(
                small_square_footprint(), LineString([(CX, CY), (CX + 50, CY)]),
                frame=FRAME, fields=flat_fields(), spacing_m=0.0,
                unit_height_m=5.0, unit_tags={"building": "yes"}, **FAST_ROUTING)

    def test_rejects_an_empty_unit_footprint(self):
        with self.assertRaises(array_place.ArrayError):
            array_place.place_array(
                Polygon(), LineString([(CX, CY), (CX + 50, CY)]),
                frame=FRAME, fields=flat_fields(), spacing_m=10.0,
                unit_height_m=5.0, unit_tags={"building": "yes"}, **FAST_ROUTING)

    def test_rejects_an_empty_baseline(self):
        with self.assertRaises(array_place.ArrayError):
            array_place.place_array(
                small_square_footprint(), LineString(), frame=FRAME, fields=flat_fields(),
                spacing_m=10.0, unit_height_m=5.0, unit_tags={"building": "yes"}, **FAST_ROUTING)

    def test_rejects_a_spacing_that_would_exceed_the_instance_cap(self):
        long_baseline = LineString([(CX - 150, CY), (CX + 150, CY)])
        with self.assertRaises(array_place.ArrayError) as ctx:
            array_place.place_array(
                small_square_footprint(), long_baseline, frame=FRAME, fields=flat_fields(),
                spacing_m=1.0, unit_height_m=5.0, unit_tags={"building": "yes"},
                max_instances=10, skip_access_road=True, **FAST_ROUTING)
        self.assertIn("cap", str(ctx.exception))


class TestSpacingAndCount(unittest.TestCase):
    def test_count_derives_from_baseline_length_over_spacing(self):
        baseline = LineString([(CX - 30, CY), (CX + 30, CY)])  # 60m long
        result = array_place.place_array(
            small_square_footprint(), baseline, frame=FRAME, fields=flat_fields(),
            spacing_m=20.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, **FAST_ROUTING)
        # floor(60/20) + 1 = 4 instances (arc-lengths 0, 20, 40, 60)
        self.assertEqual(len(result.instances) + len(result.skipped), 4)

    def test_spacing_is_measured_along_the_curve_not_straight_line(self):
        """An L-shaped baseline: (cx,cy) -> (cx+30,cy) -> (cx+30,cy+30),
        60m of real path length. The instance at arc-length 40 must sit on
        the SECOND leg (10m into it), not on the straight-line diagonal a
        naive start-to-end interpolation would produce."""
        baseline = LineString([(CX, CY), (CX + 30, CY), (CX + 30, CY + 30)])
        result = array_place.place_array(
            small_square_footprint(half=1.0), baseline, frame=FRAME, fields=flat_fields(),
            spacing_m=20.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, **FAST_ROUTING)
        self.assertEqual(len(result.skipped), 0)
        third_instance = result.instances[2]  # arc-length 40
        centre = third_instance.footprint.centroid
        # real L-path point: 10m into the second (vertical) leg
        self.assertAlmostEqual(centre.x, CX + 30, delta=0.5)
        self.assertAlmostEqual(centre.y, CY + 10, delta=0.5)
        # NOT anywhere near the straight-line diagonal's own arc-length-40 point
        straight_line = LineString([(CX, CY), (CX + 30, CY + 30)])
        diagonal_point = straight_line.interpolate(40.0)
        self.assertGreater(centre.distance(diagonal_point), 5.0)


class TestOrientation(unittest.TestCase):
    def test_faces_the_tangent_direction_not_mirrored(self):
        """The empirically-verified regression this guards: feeding a plain
        compass bearing straight into construct._rotate_translate mirrors
        the placement (see _tangent_rotation_deg's own docstring). For a
        due-EAST baseline, the marker triangle's apex (drawn pointing
        local 'north') must end up EAST of the instance centre, never
        west."""
        baseline = LineString([(CX - 40, CY), (CX + 40, CY)])
        unit = marker_triangle_footprint()
        result = array_place.place_array(
            unit, baseline, frame=FRAME, fields=flat_fields(), spacing_m=40.0,
            unit_height_m=5.0, unit_tags={"building": "yes"}, skip_access_road=True, **FAST_ROUTING)
        self.assertGreaterEqual(len(result.instances), 1)
        instance = result.instances[0]
        centre = instance.footprint.centroid
        apex_placed = max(instance.footprint.exterior.coords[:-1], key=lambda p: p[0])
        self.assertGreater(apex_placed[0], centre.x + 2.0,
                          "the apex should be EAST of the instance centre for an eastward "
                          "baseline -- a mirrored placement would put it west instead")
        self.assertAlmostEqual(apex_placed[1], centre.y, delta=1.0)

    def test_orientation_offset_is_added_to_the_tangent(self):
        baseline = LineString([(CX - 40, CY), (CX + 40, CY)])
        unit = marker_triangle_footprint()
        no_offset = array_place.place_array(
            unit, baseline, frame=FRAME, fields=flat_fields(), spacing_m=40.0,
            unit_height_m=5.0, unit_tags={"building": "yes"}, skip_access_road=True, **FAST_ROUTING)
        with_offset = array_place.place_array(
            unit, baseline, frame=FRAME, fields=flat_fields(), spacing_m=40.0,
            unit_height_m=5.0, unit_tags={"building": "yes"}, skip_access_road=True,
            orientation_offset_deg=180.0, **FAST_ROUTING)
        self.assertAlmostEqual(
            (with_offset.instances[0].rotation_deg - no_offset.instances[0].rotation_deg) % 360.0,
            180.0, delta=0.01)


class TestNeighborCollisions(unittest.TestCase):
    def test_too_tight_a_spacing_skips_overlapping_instances(self):
        baseline = LineString([(CX - 40, CY), (CX + 40, CY)])
        # 6m-wide footprints at 3m spacing -- guaranteed heavy overlap.
        result = array_place.place_array(
            small_square_footprint(half=3.0), baseline, frame=FRAME, fields=flat_fields(),
            spacing_m=3.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, max_instances=40, **FAST_ROUTING)
        self.assertGreater(len(result.skipped), 0)
        self.assertTrue(any("instance" in s.reason for s in result.skipped))

    def test_accepted_instances_never_overlap_each_other(self):
        baseline = LineString([(CX - 40, CY), (CX + 40, CY)])
        result = array_place.place_array(
            small_square_footprint(half=3.0), baseline, frame=FRAME, fields=flat_fields(),
            spacing_m=3.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, max_instances=40, **FAST_ROUTING)
        footprints = [inst.footprint for inst in result.instances]
        for i, a in enumerate(footprints):
            for b in footprints[i + 1:]:
                self.assertFalse(a.intersects(b))

    def test_skipped_instances_are_reported_not_silently_dropped(self):
        baseline = LineString([(CX - 40, CY), (CX + 40, CY)])
        result = array_place.place_array(
            small_square_footprint(half=3.0), baseline, frame=FRAME, fields=flat_fields(),
            spacing_m=3.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, max_instances=40, **FAST_ROUTING)
        total_attempted = len(result.instances) + len(result.skipped)
        expected_count = int((baseline.length // 3.0) + 1)
        self.assertEqual(total_attempted, expected_count)
        for skip in result.skipped:
            self.assertIsInstance(skip.index, int)
            self.assertTrue(skip.reason)


class TestExistingBuildingConflicts(unittest.TestCase):
    def test_an_instance_overlapping_an_existing_building_is_skipped(self):
        # Baseline starts exactly where the existing building sits (CX, CY)
        # -- instance 0 (arc-length 0) lands there, its footprint centred
        # on the baseline's own start point regardless of where the unit
        # shape was originally drawn (place_array re-centres every instance
        # on its own centroid, see the module's own docstring).
        baseline = LineString([(CX, CY), (CX + 80, CY)])
        existing = building_feature(Polygon([
            (CX - 5, CY - 5), (CX + 5, CY - 5), (CX + 5, CY + 5), (CX - 5, CY + 5)]))
        result = array_place.place_array(
            small_square_footprint(half=3.0), baseline, frame=FRAME, fields=flat_fields([existing]),
            spacing_m=20.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, **FAST_ROUTING)
        skipped_at_zero = [s for s in result.skipped if s.index == 0]
        self.assertEqual(len(skipped_at_zero), 1)
        self.assertIn("existing building", skipped_at_zero[0].reason)
        # instances further along, clear of the existing building, still place fine
        self.assertGreater(len(result.instances), 0)


class TestAccessRoadRouting(unittest.TestCase):
    def test_skip_access_road_leaves_every_instance_without_a_road(self):
        baseline = LineString([(CX - 20, CY), (CX + 20, CY)])
        road = road_feature([(CX - 100, CY - 15), (CX + 100, CY - 15)])
        result = array_place.place_array(
            small_square_footprint(), baseline, frame=FRAME, fields=flat_fields([road]),
            spacing_m=20.0, unit_height_m=5.0, unit_tags={"building": "yes"},
            skip_access_road=True, **FAST_ROUTING)
        for inst in result.instances:
            self.assertIsNone(inst.access_road)
            self.assertEqual(inst.road_note, "access road routing skipped (skipAccessRoad)")

    def test_no_road_network_in_range_is_reported_per_instance(self):
        baseline = LineString([(CX - 20, CY), (CX + 20, CY)])
        result = array_place.place_array(
            small_square_footprint(), baseline, frame=FRAME, fields=flat_fields(),
            spacing_m=20.0, unit_height_m=5.0, unit_tags={"building": "yes"}, **FAST_ROUTING)
        for inst in result.instances:
            self.assertIsNone(inst.access_road)
            self.assertEqual(inst.road_note, "no road network found in range")

    def test_a_real_nearby_road_gets_a_real_routed_driveway(self):
        baseline = LineString([(CX - 20, CY), (CX + 20, CY)])
        road = road_feature([(CX - 100, CY - 15), (CX + 100, CY - 15)])
        result = array_place.place_array(
            small_square_footprint(), baseline, frame=FRAME, fields=flat_fields([road]),
            spacing_m=40.0, unit_height_m=5.0, unit_tags={"building": "yes"}, **FAST_ROUTING)
        self.assertGreaterEqual(len(result.instances), 1)
        instance = result.instances[0]
        self.assertIsNotNone(instance.access_road)
        self.assertIsNone(instance.road_note)
        self.assertGreater(instance.access_road.length, 0.0)

    def test_a_road_far_past_the_distance_cap_leaves_a_note_but_still_places_the_instance(self):
        far_baseline = LineString([(CX - 20, CY + 5000), (CX + 20, CY + 5000)])
        road = road_feature([(CX - 100, CY - 15), (CX + 100, CY - 15)])
        result = array_place.place_array(
            small_square_footprint(), far_baseline, frame=FRAME, fields=flat_fields([road]),
            spacing_m=40.0, unit_height_m=5.0, unit_tags={"building": "yes"}, **FAST_ROUTING)
        self.assertEqual(len(result.skipped), 0)
        self.assertGreaterEqual(len(result.instances), 1)
        instance = result.instances[0]
        self.assertIsNone(instance.access_road)
        self.assertIn("routing-attempt cap", instance.road_note)


if __name__ == "__main__":
    unittest.main()
