"""roads.join_road_chains tests: reassembling dot-to-dot 2-point segments
(the editor road tool's old limitation) back into the one intended path.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap.editor import roads  # noqa: E402
from citymap.frame import Frame  # noqa: E402

FRAME = Frame(id="t", center_lon=135.205, center_lat=34.678, rotation_deg=0.0,
             extent_m=4000.0, crs_epsg=6674)


def pt(dx, dy):
    """A {"lon","lat"} dict (dx, dy) metres from the frame's own centre."""
    lon, lat = FRAME.map_to_lonlat(FRAME.cx + dx, FRAME.cy + dy)
    return {"lon": lon, "lat": lat}


def road(*offsets):
    return {"points": [pt(dx, dy) for dx, dy in offsets]}


class TestStandaloneSegments(unittest.TestCase):
    def test_a_single_segment_comes_back_unchanged(self):
        r = road((0, 0), (100, 0))
        chains = roads.join_road_chains([r], FRAME)
        self.assertEqual(len(chains), 1)
        self.assertEqual(len(chains[0]), 2)

    def test_two_far_apart_segments_stay_separate(self):
        r1 = road((0, 0), (100, 0))
        r2 = road((5000, 5000), (5100, 5000))
        chains = roads.join_road_chains([r1, r2], FRAME)
        self.assertEqual(len(chains), 2)
        self.assertEqual({len(c) for c in chains}, {2})

    def test_empty_input_returns_empty(self):
        self.assertEqual(roads.join_road_chains([], FRAME), [])


class TestChaining(unittest.TestCase):
    def test_two_segments_sharing_an_endpoint_join_into_one_chain(self):
        r1 = road((0, 0), (100, 0))
        r2 = road((100, 0), (100, 100))  # starts exactly where r1 ends
        chains = roads.join_road_chains([r1, r2], FRAME)
        self.assertEqual(len(chains), 1)
        self.assertEqual(len(chains[0]), 3)  # shared point not duplicated

    def test_joins_within_tolerance_despite_small_click_imprecision(self):
        r1 = road((0, 0), (100, 0))
        r2 = road((100.5, -0.3), (200, 0))  # off by <1m, real click noise
        chains = roads.join_road_chains([r1, r2], FRAME, tolerance_m=15.0)
        self.assertEqual(len(chains), 1)

    def test_does_not_join_beyond_tolerance(self):
        r1 = road((0, 0), (100, 0))
        r2 = road((150, 0), (250, 0))  # 50m gap, a deliberate separate road
        chains = roads.join_road_chains([r1, r2], FRAME, tolerance_m=15.0)
        self.assertEqual(len(chains), 2)

    def test_chain_preserves_geographic_order_regardless_of_draw_direction(self):
        """A later segment might be drawn in either direction -- the chain
        must still come out as one continuous path, not a mangled order."""
        r1 = road((0, 0), (100, 0))
        r2 = road((100, 100), (100, 0))  # drawn end-to-start relative to r1
        chains = roads.join_road_chains([r1, r2], FRAME)
        self.assertEqual(len(chains), 1)
        chain = chains[0]
        self.assertEqual(len(chain), 3)
        # endpoints of the joined chain are the two true termini, not the
        # shared middle point
        ends = {(round(chain[0]["lon"], 6), round(chain[0]["lat"], 6)),
               (round(chain[-1]["lon"], 6), round(chain[-1]["lat"], 6))}
        expected = {(round(pt(0, 0)["lon"], 6), round(pt(0, 0)["lat"], 6)),
                   (round(pt(100, 100)["lon"], 6), round(pt(100, 100)["lat"], 6))}
        self.assertEqual(ends, expected)

    def test_a_real_ten_segment_chain_joins_into_one_path(self):
        """Mirrors the actual submission this was built for: a winding
        hillside path drawn as ten separate 2-point segments, each one's
        start landing within ~1-2m of the previous one's end."""
        waypoints = [(0, 0), (20, 15), (45, 10), (70, 35), (90, 55),
                    (85, 80), (60, 90), (35, 70), (15, 60), (0, 45), (-10, 20)]
        segments = [road(waypoints[i], waypoints[i + 1]) for i in range(len(waypoints) - 1)]
        chains = roads.join_road_chains(segments, FRAME)
        self.assertEqual(len(chains), 1)
        self.assertEqual(len(chains[0]), len(waypoints))

    def test_three_way_junction_keeps_segments_separate(self):
        """Three segments meeting at one point is a real junction, not a
        pass-through -- joining two of them arbitrarily would be a guess
        this function should not make."""
        hub = (100, 0)
        r1 = road((0, 0), hub)
        r2 = road(hub, (200, 0))
        r3 = road(hub, (100, 100))
        chains = roads.join_road_chains([r1, r2, r3], FRAME)
        # every chain still starts/ends at the hub or a true terminus --
        # none of the three got silently merged with another
        self.assertEqual(len(chains), 3)
        for c in chains:
            self.assertEqual(len(c), 2)

    def test_mixed_chain_and_standalone_segments(self):
        chain_a = road((0, 0), (100, 0))
        chain_b = road((100, 0), (200, 0))
        standalone = road((9000, 9000), (9100, 9000))
        chains = roads.join_road_chains([chain_a, chain_b, standalone], FRAME)
        lengths = sorted(len(c) for c in chains)
        self.assertEqual(lengths, [2, 3])


if __name__ == "__main__":
    unittest.main()
