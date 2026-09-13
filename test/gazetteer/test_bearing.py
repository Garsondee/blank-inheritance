"""Page-relative compass bearing, server side.

The claim: tools/gazetteer/core/bearing.py agrees with
tools/gazetteer/core/bearing.mjs on every case in the shared fixture. See
that fixture's own _comment, and bearing.py's module docstring, for the real
incident this exists to close off -- a live description that had a
building's bearing from a landmark backwards (NW written where SE was true)
because the caller phrased a self-to-landmark bearing as if it were
landmark-to-self.

See test/gazetteer-bearing.test.mjs for the JavaScript half.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core.bearing import (  # noqa: E402
    POINTS_8, POINTS_16, bearing_deg, compass_point, describe, distance_m,
)

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures",
                            "gazetteer-bearing-cases.json")

with open(FIXTURE_PATH, encoding="utf-8") as fh:
    FIXTURE = json.load(fh)


class TestSharedFixture(unittest.TestCase):

    def test_the_fixture_is_not_empty(self):
        self.assertGreaterEqual(len(FIXTURE["cases"]), 8, "too few shared cases to be a contract")

    def test_every_shared_case_reproduces_exactly(self):
        for case in FIXTURE["cases"]:
            result = describe(case["fromPx"], case["toPx"], case["metresPerPx"], points=POINTS_8)
            self.assertAlmostEqual(result["distanceM"], case["distanceM"], places=1, msg=case["why"])
            self.assertAlmostEqual(result["bearingDeg"], case["bearingDeg"], places=1, msg=case["why"])
            self.assertEqual(result["compass"], case["compass"], case["why"])

    def test_the_two_real_incident_cases_are_genuine_opposites(self):
        forward = next(c for c in FIXTURE["cases"] if "forward" in c["why"])
        reversed_ = next(c for c in FIXTURE["cases"] if "reversed" in c["why"])
        self.assertEqual(forward["fromPx"], reversed_["toPx"])
        self.assertEqual(forward["toPx"], reversed_["fromPx"])
        self.assertNotEqual(forward["compass"], reversed_["compass"],
                            "the whole bug was that these two were reported as the same thing")


class TestBearingDeg(unittest.TestCase):

    def test_reversing_the_two_points_flips_the_bearing_by_180_degrees(self):
        a, b = (0, 0), (100, -50)
        forward = bearing_deg(a, b)
        backward = bearing_deg(b, a)
        self.assertAlmostEqual((forward + 180) % 360, backward, places=6)

    def test_the_same_point_twice_is_zero(self):
        self.assertEqual(bearing_deg((10, 10), (10, 10)), 0.0)

    def test_the_same_point_twice_is_zero_even_with_float_coordinates(self):
        # Integer (10 - 10) can never produce a signed float -0.0, so it
        # alone would not catch atan2(0, -0.0)'s IEEE 754-defined +180
        # degrees -- found live via the JS twin of this module, which has
        # no int/float distinction and hit exactly this on every call.
        self.assertEqual(bearing_deg((10.0, 10.0), (10.0, 10.0)), 0.0)


class TestCompassPoint(unittest.TestCase):

    def test_16_point_table_matches_the_8_point_table_at_the_cardinals(self):
        for deg, point in ((0, "N"), (90, "E"), (180, "S"), (270, "W")):
            self.assertEqual(compass_point(deg, points=POINTS_8), point)
            self.assertEqual(compass_point(deg, points=POINTS_16), point)

    def test_16_point_table_resolves_the_intermediate_points(self):
        self.assertEqual(compass_point(22.5, points=POINTS_16), "NNE")
        self.assertEqual(compass_point(67.5, points=POINTS_16), "ENE")

    def test_wraps_at_360(self):
        self.assertEqual(compass_point(359.9, points=POINTS_8), "N")


class TestDistanceM(unittest.TestCase):

    def test_zero_distance_between_identical_points(self):
        self.assertEqual(distance_m((5, 5), (5, 5)), 0.0)

    def test_scales_by_metres_per_px(self):
        self.assertEqual(distance_m((0, 0), (10, 0), metres_per_px=0.5), 5.0)


if __name__ == "__main__":
    unittest.main()
