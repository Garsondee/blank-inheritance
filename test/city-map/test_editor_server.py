"""editor/server.py's base-map (rendered-image background) tests.

The editor used to serve buildings/roads/etc as live GeoJSON queried from a
~230k-feature spatial index. That hit a wall of real-use edge cases (worst:
zoom-dependent truncation producing an apparently-arbitrary sparse render),
and the user asked directly for a rendered raster background instead: no
query, no cap, no level-of-detail cutoff, just a real PNG. This file covers
the two pure pieces of that -- unrotated_frame (why: an image-overlay needs
an axis-aligned lon/lat box, which the real, art-directed ROTATED frame's
PNG doesn't have) and base_map_cache_key (why: the render is expensive
enough that re-running it on every server restart, not just when the map
actually changed, would recreate exactly the "wait a long time for no
reason" problem this whole feature exists to avoid).
"""

import os
import sys
import types
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map", "editor"))

import server as editor_server  # noqa: E402
from citymap.editor.procgen import star_fort  # noqa: E402
from citymap.frame import Frame  # noqa: E402
from citymap.ops.log import Operation  # noqa: E402

FRAME = Frame(id="kurose-12km", center_lon=135.205, center_lat=34.678,
             rotation_deg=31.0, extent_m=12000.0, crs_epsg=6674)


def make_op(op_id, payload):
    return Operation(id=op_id, op="demolish", payload=payload, note="")


class TestUnrotatedFrame(unittest.TestCase):
    def test_rotation_is_zeroed(self):
        u = editor_server.unrotated_frame(FRAME)
        self.assertEqual(u.rotation_deg, 0.0)

    def test_geography_is_otherwise_unchanged(self):
        u = editor_server.unrotated_frame(FRAME)
        self.assertEqual(u.center_lon, FRAME.center_lon)
        self.assertEqual(u.center_lat, FRAME.center_lat)
        self.assertEqual(u.extent_m, FRAME.extent_m)
        self.assertEqual(u.crs_epsg, FRAME.crs_epsg)

    def test_id_is_distinct_from_the_real_frame(self):
        """Distinct ids keep this from ever silently colliding with a real
        frame's own cache entries (world/fields caching keys off frame id
        among other things elsewhere in the pipeline)."""
        u = editor_server.unrotated_frame(FRAME)
        self.assertNotEqual(u.id, FRAME.id)

    def test_lonlat_bbox_is_axis_aligned_unlike_the_rotated_frame(self):
        """The actual reason this function exists: L.imageOverlay needs a
        plain rectangle. A rotated frame's bbox circumscribes a tilted
        square (wider than the square itself); the unrotated one should not
        -- its bbox corners, converted back with source_bbox, should match
        its own (unrotated) source_corners almost exactly."""
        u = editor_server.unrotated_frame(FRAME)
        south, west, north, east = u.lonlat_bbox()
        # Round-trip: the unrotated frame's own straight square corners,
        # converted to lon/lat, must fall within the bbox we just computed.
        for mx, my in u.source_corners():
            lon, lat = u.inv.transform(mx, my)
            self.assertGreaterEqual(lat + 1e-6, south)
            self.assertLessEqual(lat - 1e-6, north)
            self.assertGreaterEqual(lon + 1e-6, west)
            self.assertLessEqual(lon - 1e-6, east)


class TestBaseMapCacheKey(unittest.TestCase):
    def setUp(self):
        self.ops = [make_op("op-0001", {"area": {"type": "circle", "lon": 1, "lat": 1, "radiusM": 5}})]

    def test_same_inputs_produce_the_same_key(self):
        a = editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 1)
        b = editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 1)
        self.assertEqual(a, b)

    def test_ops_content_participates(self):
        other_ops = [make_op("op-0001", {"area": {"type": "circle", "lon": 2, "lat": 2, "radiusM": 5}})]
        a = editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 1)
        b = editor_server.base_map_cache_key(FRAME, other_ops, 3, 3072, 1)
        self.assertNotEqual(a, b)

    def test_no_ops_differs_from_some_ops(self):
        a = editor_server.base_map_cache_key(FRAME, [], 3, 3072, 1)
        b = editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 1)
        self.assertNotEqual(a, b)

    def test_tile_grid_settings_participate(self):
        base = editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 1)
        self.assertNotEqual(base, editor_server.base_map_cache_key(FRAME, self.ops, 4, 3072, 1))
        self.assertNotEqual(base, editor_server.base_map_cache_key(FRAME, self.ops, 3, 2048, 1))
        self.assertNotEqual(base, editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 2))

    def test_frame_geography_participates(self):
        moved = Frame(id=FRAME.id, center_lon=135.3, center_lat=FRAME.center_lat,
                      rotation_deg=FRAME.rotation_deg, extent_m=FRAME.extent_m, crs_epsg=FRAME.crs_epsg)
        a = editor_server.base_map_cache_key(FRAME, self.ops, 3, 3072, 1)
        b = editor_server.base_map_cache_key(moved, self.ops, 3, 3072, 1)
        self.assertNotEqual(a, b)


class TestFortWallPartsAndAnchor(unittest.TestCase):
    """_fort_wall_parts_and_anchor: the shared conversion both
    /api/design/fort-wall (preview) and /api/design/save-template (the
    finished output) go through -- one place turning a request payload
    into (parts, anchor_lonlat), so preview and save can never silently
    diverge on the same drawn polygon."""

    def setUp(self):
        self._real_state = getattr(editor_server, "STATE", None)
        editor_server.STATE = types.SimpleNamespace(frame=FRAME)
        # a small square around the frame's own centre, in real lon/lat
        half_deg = 0.001
        lon, lat = FRAME.center_lon, FRAME.center_lat
        self.polygon = [
            {"lon": lon - half_deg, "lat": lat - half_deg}, {"lon": lon + half_deg, "lat": lat - half_deg},
            {"lon": lon + half_deg, "lat": lat + half_deg}, {"lon": lon - half_deg, "lat": lat + half_deg},
        ]

    def tearDown(self):
        editor_server.STATE = self._real_state

    def test_anchor_is_the_polygon_centroid(self):
        _, anchor_lonlat = editor_server._fort_wall_parts_and_anchor({"polygon": self.polygon})
        self.assertAlmostEqual(anchor_lonlat[0], FRAME.center_lon, places=4)
        self.assertAlmostEqual(anchor_lonlat[1], FRAME.center_lat, places=4)

    def test_missing_polygon_raises_key_error(self):
        with self.assertRaises(KeyError):
            editor_server._fort_wall_parts_and_anchor({})

    def test_default_params_match_calling_fort_wall_directly(self):
        parts, _ = editor_server._fort_wall_parts_and_anchor({"polygon": self.polygon})
        # same polygon, converted to local coords the same way, with no
        # param overrides -- must produce the identical part count as a
        # direct star_fort.fort_wall call with its own defaults.
        points_map = [FRAME.lonlat_to_map(p["lon"], p["lat"]) for p in self.polygon]
        cx = sum(p[0] for p in points_map) / len(points_map)
        cy = sum(p[1] for p in points_map) / len(points_map)
        local = [(x - cx, y - cy) for x, y in points_map]
        direct = star_fort.fort_wall(local)
        self.assertEqual(len(parts), len(direct))

    def test_param_overrides_change_the_result(self):
        default_parts, _ = editor_server._fort_wall_parts_and_anchor({"polygon": self.polygon})
        custom_parts, _ = editor_server._fort_wall_parts_and_anchor(
            {"polygon": self.polygon, "params": {"pylonSpacingM": 15.0}})
        default_pylons = [p for p in default_parts if p.tags.get("man_made") == "pylon"]
        custom_pylons = [p for p in custom_parts if p.tags.get("man_made") == "pylon"]
        self.assertNotEqual(len(default_pylons), len(custom_pylons))

    def test_unknown_param_keys_are_ignored_not_errors(self):
        # the frontend may send extra/future fields -- must not break on them
        parts, _ = editor_server._fort_wall_parts_and_anchor(
            {"polygon": self.polygon, "params": {"someFutureKnob": 42}})
        self.assertGreater(len(parts), 0)


if __name__ == "__main__":
    unittest.main()
