"""Cache module tests: WKB round-trip, key verification, crash-safety.

The property under test in TestArtifactVerification is the one the whole
module exists for: an under-keyed or corrupted cache must fail LOUDLY on load,
never silently serve the wrong frame. §10 names exactly this failure class
("coordinate systems bite silently").
"""

import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import numpy as np  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap import cache  # noqa: E402


class TestCanonicalJson(unittest.TestCase):
    def test_key_order_does_not_matter(self):
        a = cache.canonical_json({"b": 1, "a": 2})
        b = cache.canonical_json({"a": 2, "b": 1})
        self.assertEqual(a, b)

    def test_float_formatting_is_stable(self):
        a = cache.canonical_json({"x": 31.0})
        b = cache.canonical_json({"x": 31.0000000001})
        # Both format to the same 9-decimal string.
        self.assertEqual(a, b)

    def test_distinguishes_genuinely_different_floats(self):
        a = cache.canonical_json({"x": 31.0})
        b = cache.canonical_json({"x": 31.1})
        self.assertNotEqual(a, b)


class TestCacheKey(unittest.TestCase):
    def test_deterministic(self):
        parts = {"frameId": "kurose-12km", "rotationDeg": 31.0}
        self.assertEqual(cache.cache_key(parts), cache.cache_key(parts))

    def test_sensitive_to_every_field(self):
        base = {"frameId": "kurose-12km", "rotationDeg": 31.0, "crsEpsg": 6674}
        keys = {cache.cache_key(base)}
        for field, value in (("rotationDeg", 0.0), ("crsEpsg", 6675),
                            ("frameId", "other")):
            variant = {**base, field: value}
            keys.add(cache.cache_key(variant))
        self.assertEqual(len(keys), 4, "every field must participate in the key")


class TestGeometryRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_round_trip_mixed_geometry_types(self):
        geoms = [
            Point(1, 2),
            LineString([(0, 0), (1, 1), (2, 0)]),
            Polygon([(0, 0), (10, 0), (10, 10), (0, 10)]),
            None,
            Polygon([(0, 0), (5, 0), (5, 5), (0, 5)], [[(1, 1), (2, 1), (2, 2), (1, 2)]]),
        ]
        stem = os.path.join(self.tmp, "geoms")
        cache.write_geometries(stem, geoms)
        back = cache.read_geometries(stem)

        self.assertEqual(len(back), len(geoms))
        self.assertIsNone(back[3])
        for original, restored in zip(geoms, back):
            if original is None:
                continue
            self.assertTrue(original.equals_exact(restored, tolerance=1e-9))

    def test_holes_survive(self):
        holed = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)],
                        [[(3, 3), (7, 3), (7, 7), (3, 7)]])
        stem = os.path.join(self.tmp, "holed")
        cache.write_geometries(stem, [holed])
        back = cache.read_geometries(stem)[0]
        self.assertEqual(len(back.interiors), 1)

    def test_empty_list(self):
        stem = os.path.join(self.tmp, "empty")
        cache.write_geometries(stem, [])
        self.assertEqual(cache.read_geometries(stem), [])


class TestArrayRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_dtype_and_nan_preserved(self):
        arr = np.array([[1.0, np.nan], [3.5, -2.25]], dtype=np.float32)
        path = os.path.join(self.tmp, "a.npy")
        cache.write_array(path, arr)
        back = cache.read_array(path, mmap=False)
        self.assertEqual(back.dtype, np.float32)
        np.testing.assert_array_equal(back[~np.isnan(back)], arr[~np.isnan(arr)])
        self.assertTrue(np.isnan(back[0, 1]))

    def test_mmap_load_works(self):
        arr = np.arange(100, dtype=np.float32).reshape(10, 10)
        path = os.path.join(self.tmp, "b.npy")
        cache.write_array(path, arr)
        back = cache.read_array(path, mmap=True)
        np.testing.assert_array_equal(np.asarray(back), arr)


class TestAttrsRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_unicode_tags_survive(self):
        attrs = [{"name:ja": "ポートアイランド", "building": "yes"}, {}]
        path = os.path.join(self.tmp, "attrs.json")
        cache.write_attrs(path, attrs)
        self.assertEqual(cache.read_attrs(path), attrs)


class TestArtifactVerification(unittest.TestCase):
    """The core promise: a wrong or corrupted cache fails LOUDLY."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_miss_reports_as_miss_not_error(self):
        art = cache.Artifact(self.tmp, {"frameId": "x"})
        self.assertFalse(art.exists())

    def test_write_then_verify_round_trips(self):
        art = cache.Artifact(self.tmp, {"frameId": "kurose-12km", "rotationDeg": 31.0})
        art.begin_write()
        art.commit(extra={"faceCount": 6})
        self.assertTrue(art.exists())
        extra = art.verify()
        self.assertEqual(extra["faceCount"], 6)

    def test_manifest_written_last_so_a_crash_leaves_no_false_hit(self):
        art = cache.Artifact(self.tmp, {"frameId": "x"})
        art.begin_write()
        with open(art.path("payload.bin"), "wb") as fh:
            fh.write(b"partial data, no commit() called")
        self.assertFalse(art.exists(),
                         "a payload file without a manifest must not read as a hit")

    def test_corrupted_manifest_raises_not_silently_serves(self):
        """The landmine §10 warns about, made structurally impossible.

        If verify() ever returned success on a mismatched key, a frame
        rotation change could silently render against stale geometry.
        """
        art = cache.Artifact(self.tmp, {"frameId": "x", "rotationDeg": 31.0})
        art.begin_write()
        art.commit()

        # Simulate a hash collision / bit-rot: same directory, different config.
        with open(art.manifest_path, "w", encoding="utf-8") as fh:
            json.dump({"keyParts": {"frameId": "x", "rotationDeg": 0.0}, "extra": {}}, fh)

        with self.assertRaises(cache.CacheError):
            art.verify()

    def test_different_key_parts_use_different_directories(self):
        a = cache.Artifact(self.tmp, {"frameId": "a"})
        b = cache.Artifact(self.tmp, {"frameId": "b"})
        self.assertNotEqual(a.dir, b.dir)


if __name__ == "__main__":
    unittest.main()
