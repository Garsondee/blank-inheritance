"""citymap.store.gpkg tests: the GPB codec, schema creation, R*Tree bbox
queries, and CRUD for every table shape.

TestGpbAgainstRealGdal is the one tier that needs an external tool
(pyogrio, dev-only -- see gpkg.py's module docstring) to prove our codec
against a real GeoPackage reader/writer, not just against itself. Per
design/testing-strategy.md rule 5 ("a skipped test must announce itself"),
it skips LOUDLY with an explanation when pyogrio/geopandas aren't
installed, rather than silently vanishing from the suite.
"""

import json
import os
import sys
import sqlite3
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

import shapely.geometry  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402

from citymap.store import gpkg  # noqa: E402


class TestGpbCodecRoundTrip(unittest.TestCase):
    """Self-contained: pack then unpack, no external tool required."""

    def test_polygon_round_trips(self):
        p = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        blob = gpkg.pack_gpb(p, srs_id=6674)
        back, srs_id = gpkg.unpack_gpb(blob)
        self.assertEqual(srs_id, 6674)
        self.assertTrue(back.equals_exact(p, tolerance=1e-9))

    def test_linestring_round_trips(self):
        line = LineString([(0, 0), (12.5, 7.25), (30, -4)])
        back, _ = gpkg.unpack_gpb(gpkg.pack_gpb(line))
        self.assertTrue(back.equals_exact(line, tolerance=1e-9))

    def test_point_round_trips(self):
        pt = Point(-135.5, 34.25)
        back, _ = gpkg.unpack_gpb(gpkg.pack_gpb(pt))
        self.assertTrue(back.equals_exact(pt, tolerance=1e-9))

    def test_none_geometry_round_trips_as_none(self):
        blob = gpkg.pack_gpb(None)
        back, _ = gpkg.unpack_gpb(blob)
        self.assertIsNone(back)

    def test_none_blob_round_trips_as_none(self):
        back, srs_id = gpkg.unpack_gpb(None)
        self.assertIsNone(back)
        self.assertIsNone(srs_id)

    def test_header_byte_layout_matches_the_ogc_spec(self):
        """Hand-verified against OGC GeoPackage Annex B: 'G','P', version=0,
        flags=0x01 (little-endian, no envelope, not empty), then a
        little-endian srs_id, then a standard little-endian WKB body."""
        import struct
        blob = gpkg.pack_gpb(Point(1.5, -2.5), srs_id=6674)
        self.assertEqual(blob[0:2], b"GP")
        self.assertEqual(blob[2], 0)
        self.assertEqual(blob[3], 0x01)
        self.assertEqual(struct.unpack("<i", blob[4:8])[0], 6674)
        wkb = blob[8:]
        self.assertEqual(len(wkb), 21)  # byte-order(1) + type(4) + x(8) + y(8)
        self.assertEqual(wkb[0], 1)  # little-endian WKB marker
        self.assertEqual(struct.unpack("<I", wkb[1:5])[0], 1)  # geometry type 1 = Point
        self.assertEqual(struct.unpack("<dd", wkb[5:21]), (1.5, -2.5))

    def test_bad_magic_raises(self):
        with self.assertRaises(gpkg.StoreError):
            gpkg.unpack_gpb(b"XX\x00\x01\x00\x00\x00\x00")


class TestGpbAgainstRealGdal(unittest.TestCase):
    """Validates the codec against a real GDAL-backed reader/writer
    (pyogrio), in both directions. Dev-only dependency -- skips loudly if
    not installed, per design/testing-strategy.md rule 5."""

    @classmethod
    def setUpClass(cls):
        try:
            import geopandas  # noqa: F401
            import pyogrio  # noqa: F401
        except ImportError:
            raise unittest.SkipTest(
                "geopandas/pyogrio not installed -- SKIPPING the real-GDAL GPB "
                "cross-check (dev-only tooling, never a production dependency; "
                "see gpkg.py's module docstring). The self-contained codec tests "
                "in TestGpbCodecRoundTrip still run and still catch a broken codec.")

    def test_gdal_written_blob_reads_correctly(self):
        import geopandas as gpd
        tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, tmp, ignore_errors=True)
        path = os.path.join(tmp, "ref.gpkg")
        poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        gdf = gpd.GeoDataFrame({"name": ["a"]}, geometry=[poly], crs="EPSG:6674")
        gdf.to_file(path, layer="polys", driver="GPKG")

        conn = sqlite3.connect(path)
        blob = conn.execute("SELECT geom FROM polys").fetchone()[0]
        conn.close()

        geom, srs_id = gpkg.unpack_gpb(blob)
        self.assertEqual(srs_id, 6674)
        self.assertTrue(geom.equals_exact(poly, tolerance=1e-9))

    def test_our_blob_is_readable_by_gdal(self):
        import geopandas as gpd
        tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, tmp, ignore_errors=True)
        path = os.path.join(tmp, "ours.gpkg")

        line = LineString([(0, 0), (12.5, 7.25), (30, -4), (100, 100)])
        conn = gpkg.create_store(path)
        gpkg.insert_feature(conn, id="f1", geom=line, tags={"highway": "residential"},
                           is_area=False, log=False)
        conn.commit()
        conn.close()

        back = gpd.read_file(path, layer="feature")
        self.assertTrue(back.iloc[0].geometry.equals_exact(line, tolerance=1e-9))


class TestCreateStore(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.path = os.path.join(self.tmp, "test.gpkg")

    def test_creates_a_valid_geopackage(self):
        conn = gpkg.create_store(self.path)
        srs = conn.execute("SELECT srs_id FROM gpkg_spatial_ref_sys ORDER BY srs_id").fetchall()
        self.assertEqual([r["srs_id"] for r in srs], [-1, 0, 6674])
        contents = {r["table_name"] for r in conn.execute("SELECT table_name FROM gpkg_contents")}
        self.assertIn("feature", contents)
        self.assertIn("terrain_edit", contents)
        self.assertIn("lamp", contents)
        conn.close()

    def test_refuses_to_overwrite_existing_file(self):
        gpkg.create_store(self.path).close()
        with self.assertRaises(gpkg.StoreError):
            gpkg.create_store(self.path)

    def test_world_version_starts_at_zero(self):
        conn = gpkg.create_store(self.path)
        self.assertEqual(gpkg.get_world_version(conn), 0)
        conn.close()

    def test_sets_the_geopackage_application_id_and_user_version(self):
        """Verified empirically against a real GDAL-written file (Phase 1
        spike) -- without these PRAGMAs a stricter reader than pyogrio could
        refuse to recognise the file as a GeoPackage at all."""
        conn = gpkg.create_store(self.path)
        app_id = conn.execute("PRAGMA application_id").fetchone()[0]
        user_version = conn.execute("PRAGMA user_version").fetchone()[0]
        conn.close()
        self.assertEqual(app_id, 0x47504B47)
        self.assertEqual(user_version, 10400)


class TestFeatureCrud(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_insert_and_get_round_trips_every_field(self):
        poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        gpkg.insert_feature(self.conn, id="bldg-1", geom=poly,
                           tags={"building": "yes", "height": "12"},
                           is_area=True, height_m=12.0, origin="osm", osm_way_id=42)
        self.conn.commit()
        row = gpkg.get_feature_row(self.conn, "bldg-1")
        kwargs = gpkg._row_to_feature_kwargs(row)
        self.assertEqual(kwargs["id"], "bldg-1")
        self.assertTrue(kwargs["geom"].equals_exact(poly, tolerance=1e-9))
        self.assertEqual(kwargs["tags"], {"building": "yes", "height": "12"})
        self.assertTrue(kwargs["area"])
        self.assertAlmostEqual(kwargs["height_m"], 12.0)
        self.assertEqual(kwargs["source"], "osm")
        self.assertEqual(kwargs["osm_way_id"], 42)

    def test_unicode_tags_round_trip(self):
        gpkg.insert_feature(self.conn, id="f1", geom=Point(0, 0),
                           tags={"name:ja": "ポートアイランド"}, is_area=False)
        row = gpkg.get_feature_row(self.conn, "f1")
        kwargs = gpkg._row_to_feature_kwargs(row)
        self.assertEqual(kwargs["tags"]["name:ja"], "ポートアイランド")

    def test_id_must_be_unique(self):
        gpkg.insert_feature(self.conn, id="dup", geom=Point(0, 0), tags={}, is_area=False)
        self.conn.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            gpkg.insert_feature(self.conn, id="dup", geom=Point(1, 1), tags={}, is_area=False)

    def test_group_id_is_queryable(self):
        gpkg.insert_feature(self.conn, id="a", geom=Point(0, 0), tags={}, is_area=False,
                           group_id="array:row-1")
        gpkg.insert_feature(self.conn, id="b", geom=Point(1, 1), tags={}, is_area=False,
                           group_id="array:row-1")
        gpkg.insert_feature(self.conn, id="c", geom=Point(2, 2), tags={}, is_area=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT id FROM feature WHERE group_id = ?",
                                 ("array:row-1",)).fetchall()
        self.assertEqual({r["id"] for r in rows}, {"a", "b"})

    def test_iter_all_features_is_deterministic_by_insertion_order(self):
        for i in range(5):
            gpkg.insert_feature(self.conn, id=f"f{i}", geom=Point(i, i), tags={}, is_area=False)
        self.conn.commit()
        ids = [f["id"] for f in gpkg.iter_all_features(self.conn)]
        self.assertEqual(ids, ["f0", "f1", "f2", "f3", "f4"])

    def test_null_geometry_round_trips(self):
        """A feature can legitimately have no geometry yet (mid-authoring)."""
        gpkg.insert_feature(self.conn, id="ghost", geom=None, tags={"note": "wip"}, is_area=False)
        row = gpkg.get_feature_row(self.conn, "ghost")
        kwargs = gpkg._row_to_feature_kwargs(row)
        self.assertIsNone(kwargs["geom"])


class TestBboxQuery(unittest.TestCase):
    """The property the whole R*Tree exists for: a viewport query is an
    indexed lookup that finds exactly what a brute-force scan would."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)
        # A scattered grid of points plus a couple of polygons spanning
        # multiple cells, so bbox membership isn't trivially "point inside box".
        self.geoms = {}
        for i in range(20):
            for j in range(20):
                fid = f"pt-{i}-{j}"
                geom = Point(i * 10.0, j * 10.0)
                gpkg.insert_feature(self.conn, id=fid, geom=geom, tags={}, is_area=False)
                self.geoms[fid] = geom
        big = Polygon([(50, 50), (150, 50), (150, 150), (50, 150)])
        gpkg.insert_feature(self.conn, id="big-square", geom=big, tags={}, is_area=True)
        self.geoms["big-square"] = big
        self.conn.commit()

    def _brute_force(self, minx, miny, maxx, maxy):
        hits = set()
        for fid, geom in self.geoms.items():
            gminx, gminy, gmaxx, gmaxy = geom.bounds
            if gmaxx >= minx and gminx <= maxx and gmaxy >= miny and gminy <= maxy:
                hits.add(fid)
        return hits

    def test_matches_brute_force_scan(self):
        for box in [(0, 0, 55, 55), (100, 100, 105, 105), (-1000, -1000, -900, -900),
                   (45, 45, 155, 155)]:
            expected = self._brute_force(*box)
            got = {f["id"] for f in gpkg.query_features_bbox(self.conn, *box)}
            self.assertEqual(got, expected, f"mismatch for box {box}")

    def test_count_matches_query_length(self):
        box = (0, 0, 100, 100)
        n = gpkg.count_features_bbox(self.conn, *box)
        rows = gpkg.query_features_bbox(self.conn, *box)
        self.assertEqual(n, len(rows))

    def test_limit_truncates_but_count_stays_honest(self):
        box = (0, 0, 1000, 1000)
        full_count = gpkg.count_features_bbox(self.conn, *box)
        limited = gpkg.query_features_bbox(self.conn, *box, limit=5)
        self.assertEqual(len(limited), 5)
        self.assertGreater(full_count, 5)


class TestRebuildRtree(unittest.TestCase):
    """The recovery path after an out-of-band write (e.g. a hand-edit made
    directly in QGIS, which won't go through this module's write helpers)."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_out_of_band_insert_is_invisible_until_rebuilt(self):
        # Bypass insert_feature entirely -- simulates a raw external write.
        blob = gpkg.pack_gpb(Point(500, 500))
        self.conn.execute(
            "INSERT INTO feature (id, geom, tags, is_area) VALUES (?, ?, ?, ?)",
            ("out-of-band", blob, "{}", 0))
        self.conn.commit()

        before = gpkg.query_features_bbox(self.conn, 400, 400, 600, 600)
        self.assertEqual(before, [])  # rtree doesn't know about it yet

        n = gpkg.rebuild_rtree(self.conn, "feature", "geom", "rtree_feature_geom")
        self.assertEqual(n, 1)

        after = gpkg.query_features_bbox(self.conn, 400, 400, 600, 600)
        self.assertEqual([f["id"] for f in after], ["out-of-band"])


class TestTerrainEditStackOrder(unittest.TestCase):
    """stack_order must survive a write/read round trip -- schema.sql's
    documented reason: apply_terrain_edits blends each edit against the
    already-accumulated result of prior edits, so losing this order
    silently breaks terracing."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_read_back_in_stack_order_not_insertion_order(self):
        # Insert deliberately out of stack order to prove ORDER BY, not
        # insertion order, is what's read back.
        outer = Polygon([(0, 0), (30, 0), (30, 30), (0, 30)])
        middle = Polygon([(5, 5), (25, 5), (25, 25), (5, 25)])
        inner = Polygon([(10, 10), (20, 10), (20, 20), (10, 20)])
        gpkg.insert_terrain_edit(self.conn, id="tier-2-inner", geom=inner,
                                target_elevation_m=6.0, blend_m=2.0, stack_order=2,
                                group_id="terrace-1")
        gpkg.insert_terrain_edit(self.conn, id="tier-0-outer", geom=outer,
                                target_elevation_m=2.0, blend_m=5.0, stack_order=0,
                                group_id="terrace-1")
        gpkg.insert_terrain_edit(self.conn, id="tier-1-middle", geom=middle,
                                target_elevation_m=4.0, blend_m=2.0, stack_order=1,
                                group_id="terrace-1")
        self.conn.commit()

        edits = list(gpkg.iter_all_terrain_edits(self.conn))
        self.assertEqual([e["id"] for e in edits],
                         ["tier-0-outer", "tier-1-middle", "tier-2-inner"])
        self.assertEqual([e["target_elevation_m"] for e in edits], [2.0, 4.0, 6.0])


class TestRoadGraphRoundTrip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_road_graph_round_trips(self):
        node_xy = {10: (0.0, 0.0), 11: (10.0, 0.0), 12: (10.0, 10.0)}
        way_nodes = {100: [10, 11, 12]}
        way_class = {100: "residential"}
        gpkg.write_graph(self.conn, "road", node_xy, way_nodes, way_class)
        self.conn.commit()

        back_xy, back_way_nodes, back_way_class = gpkg.read_graph(self.conn, "road")
        self.assertEqual(back_xy, node_xy)
        self.assertEqual(back_way_nodes, way_nodes)
        self.assertEqual(back_way_class, way_class)

    def test_way_node_order_is_preserved(self):
        """A road's node sequence is the road's shape -- reordering it would
        silently redraw the street."""
        node_xy = {i: (float(i), 0.0) for i in range(5)}
        way_nodes = {1: [4, 2, 0, 3, 1]}  # deliberately not sorted
        way_class = {1: "service"}
        gpkg.write_graph(self.conn, "road", node_xy, way_nodes, way_class)
        self.conn.commit()
        _, back_way_nodes, _ = gpkg.read_graph(self.conn, "road")
        self.assertEqual(back_way_nodes[1], [4, 2, 0, 3, 1])

    def test_road_and_rail_are_independent_tables(self):
        gpkg.write_graph(self.conn, "road", {1: (0.0, 0.0)}, {10: [1]}, {10: "residential"})
        gpkg.write_graph(self.conn, "rail", {2: (5.0, 5.0)}, {20: [2]}, {20: "rail"})
        self.conn.commit()
        road_xy, _, _ = gpkg.read_graph(self.conn, "road")
        rail_xy, _, _ = gpkg.read_graph(self.conn, "rail")
        self.assertEqual(road_xy, {1: (0.0, 0.0)})
        self.assertEqual(rail_xy, {2: (5.0, 5.0)})


class TestWorldGeomAndLamps(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_sea_geometry_round_trips(self):
        sea = Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)])
        gpkg.set_world_geom(self.conn, "sea", sea)
        self.conn.commit()
        back = gpkg.get_world_geom(self.conn, "sea")
        self.assertTrue(back.equals_exact(sea, tolerance=1e-6))

    def test_missing_key_returns_none(self):
        self.assertIsNone(gpkg.get_world_geom(self.conn, "sea"))

    def test_set_world_geom_is_upsert(self):
        a = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
        b = Polygon([(0, 0), (2, 0), (2, 2), (0, 2)])
        gpkg.set_world_geom(self.conn, "sea", a)
        gpkg.set_world_geom(self.conn, "sea", b)
        self.conn.commit()
        back = gpkg.get_world_geom(self.conn, "sea")
        self.assertAlmostEqual(back.area, b.area)

    def test_set_world_geom_returns_before_and_after(self):
        a = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
        b = Polygon([(0, 0), (2, 0), (2, 2), (0, 2)])
        gpkg.set_world_geom(self.conn, "sea", a)
        result = gpkg.set_world_geom(self.conn, "sea", b)
        self.conn.commit()
        self.assertIsNotNone(result["before"]["geom"])
        self.assertIsNotNone(result["after"]["geom"])

    def test_set_world_geom_logs_an_update_by_default(self):
        gpkg.set_world_geom(self.conn, "sea", Polygon([(0, 0), (1, 0), (1, 1), (0, 1)]))
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "update")
        self.assertEqual(rows[0]["table_name"], "world_geom")
        self.assertEqual(rows[0]["row_id"], "sea")

    def test_set_world_geom_log_false_skips_the_change_log(self):
        gpkg.set_world_geom(self.conn, "sea", Polygon([(0, 0), (1, 0), (1, 1), (0, 1)]), log=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log").fetchall()
        self.assertEqual(len(rows), 0)

    def test_set_world_geom_bumps_world_version_regardless_of_log(self):
        v0 = gpkg.get_world_version(self.conn)
        gpkg.set_world_geom(self.conn, "sea", Polygon([(0, 0), (1, 0), (1, 1), (0, 1)]), log=False)
        self.conn.commit()
        self.assertEqual(gpkg.get_world_version(self.conn), v0 + 1)

    def test_set_world_geom_bump_false_skips_the_version_bump(self):
        """REGRESSION: log and bump are separate parameters precisely so
        import_osm.py's one-time bootstrap call (log=False, bump=False)
        can start a fresh store at world_version=0 -- an earlier version
        of set_world_geom bumped unconditionally, which silently broke
        that invariant (test_store_import_osm.py's own
        test_world_version_starts_at_zero_after_import is what caught it)."""
        v0 = gpkg.get_world_version(self.conn)
        gpkg.set_world_geom(self.conn, "sea", Polygon([(0, 0), (1, 0), (1, 1), (0, 1)]),
                           log=False, bump=False)
        self.conn.commit()
        self.assertEqual(gpkg.get_world_version(self.conn), v0)

    def test_lamps_round_trip(self):
        gpkg.insert_lamp(self.conn, Point(1.0, 2.0))
        gpkg.insert_lamp(self.conn, Point(3.0, 4.0))
        self.conn.commit()
        lamps = list(gpkg.iter_all_lamps(self.conn))
        self.assertEqual(lamps, [(1.0, 2.0), (3.0, 4.0)])


class TestChangeLogAndWorldVersion(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_insert_feature_logs_a_change(self):
        gpkg.insert_feature(self.conn, id="f1", geom=Point(0, 0), tags={"a": "b"}, is_area=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "insert")
        self.assertEqual(rows[0]["table_name"], "feature")
        self.assertEqual(rows[0]["row_id"], "f1")
        self.assertIsNone(rows[0]["before"])
        after = json.loads(rows[0]["after"])
        self.assertEqual(after["tags"], {"a": "b"})

    def test_log_can_be_suppressed(self):
        gpkg.insert_feature(self.conn, id="f1", geom=Point(0, 0), tags={}, is_area=False, log=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log").fetchall()
        self.assertEqual(len(rows), 0)

    def test_batch_id_groups_multiple_changes(self):
        gpkg.insert_feature(self.conn, id="a", geom=Point(0, 0), tags={}, is_area=False,
                           batch_id="batch-1")
        gpkg.insert_feature(self.conn, id="b", geom=Point(1, 1), tags={}, is_area=False,
                           batch_id="batch-1")
        self.conn.commit()
        rows = self.conn.execute("SELECT row_id FROM change_log WHERE batch_id = ?",
                                 ("batch-1",)).fetchall()
        self.assertEqual({r["row_id"] for r in rows}, {"a", "b"})

    def test_world_version_bump_is_monotonic(self):
        self.assertEqual(gpkg.get_world_version(self.conn), 0)
        v1 = gpkg._bump_world_version(self.conn)
        v2 = gpkg._bump_world_version(self.conn)
        self.assertEqual((v1, v2), (1, 2))
        self.assertEqual(gpkg.get_world_version(self.conn), 2)


class TestUpdateFeatureGeom(unittest.TestCase):
    """map-editor plan Phase 4: PATCH /api/features/{id}'s store-level
    primitive -- a real UPDATE against an existing fid, never a
    delete+reinsert (see update_feature_geom's own docstring on why this
    is what makes ids.py's stability contract structural, not just
    conventional)."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)
        self.original = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        gpkg.insert_feature(self.conn, id="bldg-1", geom=self.original,
                           tags={"building": "yes"}, is_area=True, height_m=12.0, log=False)
        self.conn.commit()

    def test_updates_geometry_preserving_fid_and_id(self):
        row_before = gpkg.get_feature_row(self.conn, "bldg-1")
        moved = Polygon([(100, 100), (110, 100), (110, 110), (100, 110)])
        gpkg.update_feature_geom(self.conn, "bldg-1", moved)
        self.conn.commit()
        row_after = gpkg.get_feature_row(self.conn, "bldg-1")
        self.assertEqual(row_after["fid"], row_before["fid"])
        self.assertEqual(row_after["id"], "bldg-1")
        kwargs = gpkg._row_to_feature_kwargs(row_after)
        self.assertTrue(kwargs["geom"].equals_exact(moved, tolerance=1e-9))

    def test_updates_the_rtree_index_so_bbox_queries_track_the_new_location(self):
        moved = Polygon([(1000, 1000), (1010, 1000), (1010, 1010), (1000, 1010)])
        gpkg.update_feature_geom(self.conn, "bldg-1", moved)
        self.conn.commit()
        # The OLD location no longer finds it...
        self.assertEqual(gpkg.query_features_bbox(self.conn, -1, -1, 20, 20), [])
        # ...and the NEW location does.
        found = gpkg.query_features_bbox(self.conn, 990, 990, 1020, 1020)
        self.assertEqual([f["id"] for f in found], ["bldg-1"])

    def test_raises_for_a_nonexistent_id(self):
        with self.assertRaises(gpkg.StoreError):
            gpkg.update_feature_geom(self.conn, "does-not-exist", Point(0, 0))

    def test_logs_an_update_with_correct_before_and_after(self):
        moved = Polygon([(5, 5), (15, 5), (15, 15), (5, 15)])
        gpkg.update_feature_geom(self.conn, "bldg-1", moved)
        self.conn.commit()
        rows = self.conn.execute(
            "SELECT * FROM change_log WHERE row_id = ? ORDER BY seq", ("bldg-1",)).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "update")
        self.assertEqual(rows[0]["table_name"], "feature")
        before_geom = shapely.geometry.shape(json.loads(rows[0]["before"])["geom"])
        after_geom = shapely.geometry.shape(json.loads(rows[0]["after"])["geom"])
        self.assertTrue(before_geom.equals_exact(self.original, tolerance=1e-9))
        self.assertTrue(after_geom.equals_exact(moved, tolerance=1e-9))

    def test_bumps_world_version(self):
        self.assertEqual(gpkg.get_world_version(self.conn), 0)
        gpkg.update_feature_geom(self.conn, "bldg-1", Point(1, 1))
        self.assertEqual(gpkg.get_world_version(self.conn), 1)

    def test_log_false_suppresses_the_change_log_row_but_still_bumps_world_version(self):
        """log=False is what undo_last_change uses for the geometry restore
        itself (it writes its OWN, differently-shaped change_log row right
        afterward) -- but the restore is still a real state change, so the
        version bump must not be suppressed along with the log row."""
        gpkg.update_feature_geom(self.conn, "bldg-1", Point(1, 1), log=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log WHERE row_id = ?", ("bldg-1",)).fetchall()
        self.assertEqual(len(rows), 0)
        self.assertEqual(gpkg.get_world_version(self.conn), 1)

    def test_new_geom_none_clears_the_feature_geometry(self):
        gpkg.update_feature_geom(self.conn, "bldg-1", None)
        self.conn.commit()
        kwargs = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "bldg-1"))
        self.assertIsNone(kwargs["geom"])


class TestUndoLastChange(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)
        self.original = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        gpkg.insert_feature(self.conn, id="bldg-1", geom=self.original, tags={}, is_area=True, log=False)
        self.conn.commit()

    def test_returns_none_when_change_log_is_empty(self):
        self.assertIsNone(gpkg.undo_last_change(self.conn))

    def test_undoes_a_single_update_restoring_exact_geometry(self):
        moved = Polygon([(50, 50), (60, 50), (60, 60), (50, 60)])
        gpkg.update_feature_geom(self.conn, "bldg-1", moved)
        self.conn.commit()

        result = gpkg.undo_last_change(self.conn)
        self.conn.commit()
        self.assertEqual(result["featureIds"], ["bldg-1"])

        kwargs = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "bldg-1"))
        self.assertTrue(kwargs["geom"].equals_exact(self.original, tolerance=1e-9))

    def test_undo_appends_a_new_row_rather_than_deleting_the_undone_one(self):
        """change_log stays append-only/auditable -- undo is a recorded
        event, not a rewrite of history."""
        gpkg.update_feature_geom(self.conn, "bldg-1", Point(1, 1))
        self.conn.commit()
        count_before = self.conn.execute("SELECT COUNT(*) AS n FROM change_log").fetchone()["n"]

        gpkg.undo_last_change(self.conn)
        self.conn.commit()
        count_after = self.conn.execute("SELECT COUNT(*) AS n FROM change_log").fetchone()["n"]
        self.assertEqual(count_after, count_before + 1)

    def test_calling_undo_twice_acts_as_redo(self):
        moved = Polygon([(50, 50), (60, 50), (60, 60), (50, 60)])
        gpkg.update_feature_geom(self.conn, "bldg-1", moved)
        self.conn.commit()

        gpkg.undo_last_change(self.conn)  # -> back to self.original
        self.conn.commit()
        gpkg.undo_last_change(self.conn)  # -> reverses THAT, back to `moved`
        self.conn.commit()

        kwargs = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "bldg-1"))
        self.assertTrue(kwargs["geom"].equals_exact(moved, tolerance=1e-9))

    def test_bumps_world_version(self):
        gpkg.update_feature_geom(self.conn, "bldg-1", Point(1, 1))
        self.conn.commit()
        version_after_patch = gpkg.get_world_version(self.conn)
        gpkg.undo_last_change(self.conn)
        self.assertEqual(gpkg.get_world_version(self.conn), version_after_patch + 1)

    def test_insert_and_delete_kinds_are_supported_see_TestUndoInsertAndDelete(self):
        """update/insert/delete are all real, tested undo paths -- see
        TestUndoInsertAndDelete below (insert/delete undo is map-editor
        plan Phase 6's own addition, since Phase 4 had no live insert-
        producing flow yet to test it against; this class covers only
        `update`, kept separate for history/readability, not because the
        other two are unsupported)."""

    def test_raises_for_a_change_log_kind_no_tool_produces(self):
        """The schema's `kind` column is plain TEXT with no CHECK
        constraint -- undo_last_change is what actually enforces the known
        set. A row with some OTHER kind (nothing in this codebase writes
        one; simulated directly here) must raise, not silently guess a
        reversal for a kind it's never seen."""
        gpkg.insert_feature(self.conn, id="bldg-2", geom=Point(2, 2), tags={}, is_area=False, log=False)
        self.conn.execute(
            "INSERT INTO change_log (kind, table_name, row_id, after) VALUES (?, ?, ?, ?)",
            ("rename", "feature", "bldg-2", json.dumps({"id": "bldg-2"})))
        self.conn.commit()
        with self.assertRaises(gpkg.StoreError):
            gpkg.undo_last_change(self.conn)

    def test_raises_for_a_table_no_live_tool_writes_to(self):
        self.conn.execute(
            "INSERT INTO change_log (kind, table_name, row_id, after) VALUES (?, ?, ?, ?)",
            ("insert", "terrain_edit", "te-1", json.dumps({"id": "te-1"})))
        self.conn.commit()
        with self.assertRaises(gpkg.StoreError):
            gpkg.undo_last_change(self.conn)

    def test_batch_id_undoes_every_row_in_the_batch_as_one_step(self):
        gpkg.insert_feature(self.conn, id="bldg-2", geom=Point(2, 2), tags={}, is_area=False, log=False)
        self.conn.commit()
        gpkg.update_feature_geom(self.conn, "bldg-1", Point(9, 9), batch_id="batch-x")
        gpkg.update_feature_geom(self.conn, "bldg-2", Point(8, 8), batch_id="batch-x")
        self.conn.commit()

        result = gpkg.undo_last_change(self.conn)
        self.conn.commit()
        self.assertEqual(set(result["featureIds"]), {"bldg-1", "bldg-2"})
        kwargs1 = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "bldg-1"))
        kwargs2 = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "bldg-2"))
        self.assertTrue(kwargs1["geom"].equals_exact(self.original, tolerance=1e-9))
        self.assertTrue(kwargs2["geom"].equals_exact(Point(2, 2), tolerance=1e-9))


class TestTerrainEditsIntersectingBbox(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)
        gpkg.insert_terrain_edit(self.conn, id="te-near", geom=Polygon([(0, 0), (10, 0), (10, 10), (0, 10)]),
                                target_elevation_m=10.0, stack_order=0, log=False)
        gpkg.insert_terrain_edit(self.conn, id="te-far", geom=Polygon([(1000, 1000), (1010, 1000), (1010, 1010), (1000, 1010)]),
                                target_elevation_m=10.0, stack_order=0, log=False)
        self.conn.commit()

    def test_finds_an_overlapping_edit(self):
        ids = gpkg.terrain_edits_intersecting_bbox(self.conn, -5, -5, 5, 5)
        self.assertEqual(ids, ["te-near"])

    def test_does_not_find_a_non_overlapping_edit(self):
        ids = gpkg.terrain_edits_intersecting_bbox(self.conn, -5, -5, 5, 5)
        self.assertNotIn("te-far", ids)

    def test_finds_none_when_nothing_overlaps(self):
        ids = gpkg.terrain_edits_intersecting_bbox(self.conn, 500, 500, 510, 510)
        self.assertEqual(ids, [])


class TestCreateAndDeleteFeature(unittest.TestCase):
    """map-editor plan Phase 6: POST /api/features's store-level
    primitives -- create_feature (live, single-row, unlike the bulk
    importer's own insert_feature(log=False) call) and delete_feature (the
    reversal undo_last_change uses for an insert it's undoing)."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_create_feature_logs_an_insert_with_a_real_geometry_snapshot(self):
        road = LineString([(0, 0), (100, 0)])
        gpkg.create_feature(self.conn, id="road-1", geom=road, tags={"highway": "residential"}, is_area=False)
        self.conn.commit()

        kwargs = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "road-1"))
        self.assertTrue(kwargs["geom"].equals_exact(road, tolerance=1e-9))

        rows = self.conn.execute("SELECT * FROM change_log WHERE row_id = ?", ("road-1",)).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "insert")
        after = json.loads(rows[0]["after"])
        self.assertTrue(shapely.geometry.shape(after["geom"]).equals_exact(road, tolerance=1e-9))

    def test_create_feature_bumps_world_version(self):
        self.assertEqual(gpkg.get_world_version(self.conn), 0)
        gpkg.create_feature(self.conn, id="road-1", geom=LineString([(0, 0), (10, 0)]), tags={}, is_area=False)
        self.assertEqual(gpkg.get_world_version(self.conn), 1)

    def test_delete_feature_removes_the_row_and_logs_a_full_snapshot(self):
        road = LineString([(0, 0), (100, 0)])
        gpkg.insert_feature(self.conn, id="road-1", geom=road, tags={"highway": "residential"},
                           is_area=False, height_m=0.0, origin="hand", log=False)
        self.conn.commit()

        result = gpkg.delete_feature(self.conn, "road-1")
        self.conn.commit()

        self.assertIsNone(gpkg.get_feature_row(self.conn, "road-1"))
        self.assertTrue(shapely.geometry.shape(result["before"]["geom"]).equals_exact(road, tolerance=1e-9))
        self.assertEqual(result["before"]["tags"], {"highway": "residential"})

        rows = self.conn.execute("SELECT * FROM change_log WHERE row_id = ?", ("road-1",)).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "delete")

    def test_delete_feature_removes_it_from_the_rtree_too(self):
        gpkg.insert_feature(self.conn, id="road-1", geom=LineString([(0, 0), (100, 0)]),
                           tags={}, is_area=False, log=False)
        self.conn.commit()
        gpkg.delete_feature(self.conn, "road-1")
        self.conn.commit()
        self.assertEqual(gpkg.query_features_bbox(self.conn, -10, -10, 110, 10), [])

    def test_delete_feature_bumps_world_version(self):
        gpkg.insert_feature(self.conn, id="road-1", geom=Point(0, 0), tags={}, is_area=False, log=False)
        self.conn.commit()
        v0 = gpkg.get_world_version(self.conn)
        gpkg.delete_feature(self.conn, "road-1")
        self.assertEqual(gpkg.get_world_version(self.conn), v0 + 1)

    def test_delete_feature_raises_for_a_nonexistent_id(self):
        with self.assertRaises(gpkg.StoreError):
            gpkg.delete_feature(self.conn, "does-not-exist")

    def test_delete_feature_log_false_suppresses_logging_but_still_bumps_world_version(self):
        gpkg.insert_feature(self.conn, id="road-1", geom=Point(0, 0), tags={}, is_area=False, log=False)
        self.conn.commit()
        gpkg.delete_feature(self.conn, "road-1", log=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log WHERE row_id = ?", ("road-1",)).fetchall()
        self.assertEqual(len(rows), 0)
        self.assertEqual(gpkg.get_world_version(self.conn), 1)

    def test_delete_feature_bump_false_suppresses_the_version_bump(self):
        """map-editor plan Phase 12: a batch clearing N pre-existing
        features from underneath a new reclaim/terrace/foundation passes
        bump=False per row and bumps exactly once for the whole batch --
        this is what makes that possible."""
        gpkg.insert_feature(self.conn, id="road-1", geom=Point(0, 0), tags={}, is_area=False, log=False)
        gpkg.insert_feature(self.conn, id="road-2", geom=Point(1, 1), tags={}, is_area=False, log=False)
        self.conn.commit()
        v0 = gpkg.get_world_version(self.conn)
        gpkg.delete_feature(self.conn, "road-1", bump=False)
        gpkg.delete_feature(self.conn, "road-2", bump=False)
        self.conn.commit()
        self.assertEqual(gpkg.get_world_version(self.conn), v0)
        gpkg._bump_world_version(self.conn)
        self.assertEqual(gpkg.get_world_version(self.conn), v0 + 1)

    def test_delete_feature_bump_false_still_logs_by_default(self):
        gpkg.insert_feature(self.conn, id="road-1", geom=Point(0, 0), tags={}, is_area=False, log=False)
        self.conn.commit()
        gpkg.delete_feature(self.conn, "road-1", bump=False)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log WHERE row_id = ?", ("road-1",)).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "delete")


class TestUndoInsertAndDelete(unittest.TestCase):
    """map-editor plan Phase 6: undo_last_change's insert/delete reversal,
    deferred by Phase 4's own docstring until a real insert-producing flow
    (drawing a new road) existed to test it against."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)

    def test_undoing_an_insert_deletes_the_feature(self):
        road = LineString([(0, 0), (100, 0)])
        gpkg.create_feature(self.conn, id="road-1", geom=road, tags={"highway": "residential"}, is_area=False)
        self.conn.commit()

        result = gpkg.undo_last_change(self.conn)
        self.conn.commit()

        self.assertEqual(result["featureIds"], ["road-1"])
        self.assertIsNone(gpkg.get_feature_row(self.conn, "road-1"))
        self.assertIsNone(result["changes"][0]["after"])

    def test_undoing_an_insert_is_itself_a_new_appendonly_delete_row(self):
        gpkg.create_feature(self.conn, id="road-1", geom=Point(0, 0), tags={}, is_area=False)
        self.conn.commit()
        count_before = self.conn.execute("SELECT COUNT(*) AS n FROM change_log").fetchone()["n"]

        gpkg.undo_last_change(self.conn)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log ORDER BY seq").fetchall()
        self.assertEqual(len(rows), count_before + 1)
        self.assertEqual(rows[-1]["kind"], "delete")

    def test_redo_after_undoing_an_insert_recreates_the_exact_feature(self):
        road = LineString([(0, 0), (100, 0)])
        gpkg.create_feature(self.conn, id="road-1", geom=road, tags={"highway": "residential", "name": "Main St"},
                           is_area=False, height_m=0.0)
        self.conn.commit()

        gpkg.undo_last_change(self.conn)  # delete it
        self.conn.commit()
        gpkg.undo_last_change(self.conn)  # redo -- recreate it
        self.conn.commit()

        kwargs = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "road-1"))
        self.assertTrue(kwargs["geom"].equals_exact(road, tolerance=1e-9))
        self.assertEqual(kwargs["tags"], {"highway": "residential", "name": "Main St"})

    def test_redo_after_undoing_an_insert_is_findable_by_bbox_again(self):
        """REGRESSION-style check: the redo path must restore the r*tree
        entry too, not just the feature row -- delete_feature/create_feature
        each maintain their own half of this, so a full undo+redo cycle is
        the real end-to-end proof neither half was skipped."""
        gpkg.create_feature(self.conn, id="road-1", geom=LineString([(0, 0), (100, 0)]), tags={}, is_area=False)
        self.conn.commit()
        gpkg.undo_last_change(self.conn)
        self.conn.commit()
        self.assertEqual(gpkg.query_features_bbox(self.conn, -10, -10, 110, 10), [])

        gpkg.undo_last_change(self.conn)
        self.conn.commit()
        found = gpkg.query_features_bbox(self.conn, -10, -10, 110, 10)
        self.assertEqual([f["id"] for f in found], ["road-1"])

    def test_deleting_then_undoing_restores_the_feature(self):
        road = LineString([(0, 0), (100, 0)])
        gpkg.insert_feature(self.conn, id="road-1", geom=road, tags={"highway": "residential"},
                           is_area=False, origin="osm", log=False)
        self.conn.commit()

        gpkg.delete_feature(self.conn, "road-1")
        self.conn.commit()
        self.assertIsNone(gpkg.get_feature_row(self.conn, "road-1"))

        result = gpkg.undo_last_change(self.conn)
        self.conn.commit()
        self.assertEqual(result["featureIds"], ["road-1"])
        kwargs = gpkg._row_to_feature_kwargs(gpkg.get_feature_row(self.conn, "road-1"))
        self.assertTrue(kwargs["geom"].equals_exact(road, tolerance=1e-9))
        self.assertEqual(kwargs["source"], "osm")

    def test_bumps_world_version_for_both_insert_and_delete_reversal(self):
        gpkg.create_feature(self.conn, id="a", geom=Point(0, 0), tags={}, is_area=False)
        self.conn.commit()
        v_after_create = gpkg.get_world_version(self.conn)

        gpkg.undo_last_change(self.conn)  # reverses the insert (deletes)
        self.conn.commit()
        v_after_undo = gpkg.get_world_version(self.conn)
        self.assertEqual(v_after_undo, v_after_create + 1)

        gpkg.undo_last_change(self.conn)  # reverses the delete (redo, re-inserts)
        self.conn.commit()
        v_after_redo = gpkg.get_world_version(self.conn)
        self.assertEqual(v_after_redo, v_after_undo + 1)


class TestUndoWorldGeom(unittest.TestCase):
    """map-editor plan Phase 10: undo_last_change's world_geom/update
    reversal -- deferred until a real live writer (the reclaim tool)
    existed to need it. set_world_geom's very first call on a fresh store
    has no prior geometry (before=None); the second call is the ordinary
    update-with-a-real-prior-value case."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.tmp, ignore_errors=True)
        self.conn = gpkg.create_store(os.path.join(self.tmp, "test.gpkg"))
        self.addCleanup(self.conn.close)
        self.original_sea = Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)])
        gpkg.set_world_geom(self.conn, "sea", self.original_sea, log=False)
        self.conn.commit()

    def test_undoing_a_world_geom_update_restores_the_prior_geometry(self):
        reclaimed = self.original_sea.difference(Polygon([(100, 100), (200, 100), (200, 200), (100, 200)]))
        gpkg.set_world_geom(self.conn, "sea", reclaimed)
        self.conn.commit()

        result = gpkg.undo_last_change(self.conn)
        self.conn.commit()

        self.assertEqual(result["featureIds"], ["sea"])
        self.assertEqual(result["changes"][0]["table"], "world_geom")
        back = gpkg.get_world_geom(self.conn, "sea")
        self.assertAlmostEqual(back.area, self.original_sea.area)

    def test_undo_is_itself_a_new_appendonly_update_row(self):
        gpkg.set_world_geom(self.conn, "sea", Polygon([(0, 0), (500, 0), (500, 500), (0, 500)]))
        self.conn.commit()
        count_before = self.conn.execute("SELECT COUNT(*) AS n FROM change_log").fetchone()["n"]

        gpkg.undo_last_change(self.conn)
        self.conn.commit()
        rows = self.conn.execute("SELECT * FROM change_log ORDER BY seq").fetchall()
        self.assertEqual(len(rows), count_before + 1)
        self.assertEqual(rows[-1]["kind"], "update")
        self.assertEqual(rows[-1]["table_name"], "world_geom")

    def test_redo_after_undoing_brings_the_new_geometry_back(self):
        reclaimed = self.original_sea.difference(Polygon([(100, 100), (200, 100), (200, 200), (100, 200)]))
        gpkg.set_world_geom(self.conn, "sea", reclaimed)
        self.conn.commit()

        gpkg.undo_last_change(self.conn)  # restore original
        self.conn.commit()
        gpkg.undo_last_change(self.conn)  # redo -- reclaimed again
        self.conn.commit()

        back = gpkg.get_world_geom(self.conn, "sea")
        self.assertAlmostEqual(back.area, reclaimed.area)

    def test_bumps_world_version_on_undo(self):
        gpkg.set_world_geom(self.conn, "sea", Polygon([(0, 0), (500, 0), (500, 500), (0, 500)]))
        self.conn.commit()
        v_before_undo = gpkg.get_world_version(self.conn)

        gpkg.undo_last_change(self.conn)
        self.conn.commit()
        self.assertEqual(gpkg.get_world_version(self.conn), v_before_undo + 1)

    def test_a_world_geom_change_can_share_a_batch_with_a_terrain_edit(self):
        """The real shape Phase 10's reclaim endpoint writes: one sea
        carve plus one flat-elevation terrain_edit, under ONE batch_id, so
        Ctrl+Z undoes both as a single step -- matching Phase 7/8's own
        multi-row-batch precedent, just spanning a third table now."""
        batch_id = "reclaim-1"
        reclaimed = self.original_sea.difference(Polygon([(100, 100), (200, 100), (200, 200), (100, 200)]))
        gpkg.set_world_geom(self.conn, "sea", reclaimed, batch_id=batch_id)
        gpkg.insert_terrain_edit(
            self.conn, id="reclaim-1:edit0",
            geom=Polygon([(100, 100), (200, 100), (200, 200), (100, 200)]),
            target_elevation_m=4.0, blend_m=8.0, stack_order=0, batch_id=batch_id)
        self.conn.commit()

        result = gpkg.undo_last_change(self.conn)
        self.conn.commit()

        tables_touched = {c["table"] for c in result["changes"]}
        self.assertEqual(tables_touched, {"world_geom", "terrain_edit"})
        self.assertAlmostEqual(gpkg.get_world_geom(self.conn, "sea").area, self.original_sea.area)
        self.assertIsNone(gpkg.get_terrain_edit_row(self.conn, "reclaim-1:edit0"))


if __name__ == "__main__":
    unittest.main()
