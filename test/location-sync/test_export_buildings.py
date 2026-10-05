"""The real-buildings export (tools/location-sync/export_buildings.py): the static file the Location Editor reads in Foundry.

Held here: a footprint is its outer ring as integer image pixels in steps (round-trips through the reader's decode), the right buildings
are kept (on the map, on land, named or big enough, a real polygon) and the rest are counted and left out, and the same store gives the same
bytes. The store here is a tiny GeoPackage made in a temp directory with the real georeference, never the 123 MB one.
"""

import json
import os
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))
sys.path.insert(0, os.path.join(_REPO, "tools", "location-sync"))
sys.path.insert(0, os.path.join(_REPO, "tools", "city-map"))

try:
    from shapely.geometry import Polygon, LineString, box
    import export_buildings as eb
    from citymap.store import gpkg
    from core.georef import MapGeoref
    HAVE = True
except Exception:       # shapely / pyproj / numpy not installed: skip loudly, never pass silently
    HAVE = False


def decode(flat):
    x, y = flat[0], flat[1]
    out = [(x, y)]
    for i in range(2, len(flat), 2):
        x += flat[i]
        y += flat[i + 1]
        out.append((x, y))
    return out


@unittest.skipUnless(HAVE, "shapely, pyproj and numpy are needed (python -m pip install shapely pyproj numpy)")
class RingSteps(unittest.TestCase):
    def test_a_ring_is_its_first_vertex_then_steps_and_decodes_back(self):
        flat = eb.ring_steps([(100.2, 100.4), (120.0, 100.0), (120.0, 120.0), (100.0, 120.0), (100.2, 100.4)])
        self.assertEqual(flat[:2], [100, 100])
        self.assertEqual(decode(flat), [(100, 100), (120, 100), (120, 120), (100, 120)], "the closing vertex is implied, not repeated")

    def test_repeated_points_go_and_a_ring_with_fewer_than_three_is_nothing(self):
        self.assertEqual(decode(eb.ring_steps([(0, 0), (0.2, 0.1), (10, 0), (10, 10), (0, 0)])), [(0, 0), (10, 0), (10, 10)])
        self.assertIsNone(eb.ring_steps([(0, 0), (1, 1), (0, 0)]))
        self.assertIsNone(eb.ring_steps([(5, 5), (5.1, 5.2), (5.2, 5.1)]))

    def test_the_area_of_a_ring(self):
        self.assertEqual(eb._area([(0, 0), (10, 0), (10, 5), (0, 5)]), 50.0)


@unittest.skipUnless(HAVE, "shapely, pyproj and numpy are needed")
class Collect(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.georef = MapGeoref.load()
        cls.dir = tempfile.TemporaryDirectory()
        cls.path = os.path.join(cls.dir.name, "tiny.gpkg")
        conn = gpkg.create_store(cls.path)

        def at_image(x, y, w, h):
            """A rectangle of w x h metres whose corner is image px (x, y), as a polygon in the store's own projected metres."""
            pts = [cls.georef.image_px_to_source(x + dx, y + dy) for dx, dy in ((0, 0), (w, 0), (w, h), (0, h))]
            return Polygon(pts)

        cls.land = box(0, 0, 12400, 6000)       # the painted land: the top half of the sheet; below it is "sea"
        gpkg.insert_feature(conn, id="house", geom=at_image(1000, 1000, 20, 15), tags={"building": "house", "name": "Kiku's"}, is_area=True)
        gpkg.insert_feature(conn, id="plain", geom=at_image(2000, 2000, 30, 20), tags={"building": "yes"}, is_area=True)
        gpkg.insert_feature(conn, id="shed", geom=at_image(3000, 3000, 2, 3), tags={"building": "shed"}, is_area=True)
        gpkg.insert_feature(conn, id="named-shed", geom=at_image(3100, 3000, 2, 3), tags={"building": "shed", "name": "Tool shed"}, is_area=True)
        gpkg.insert_feature(conn, id="at-sea", geom=at_image(1000, 9000, 40, 40), tags={"building": "yes"}, is_area=True)
        gpkg.insert_feature(conn, id="off-map", geom=at_image(-300, 6200, 40, 40), tags={"building": "yes"}, is_area=True)
        gpkg.insert_feature(conn, id="road", geom=LineString([cls.georef.image_px_to_source(1000, 1100), cls.georef.image_px_to_source(1400, 1100)]), tags={"highway": "residential"}, is_area=False)
        gpkg.insert_feature(conn, id="park", geom=at_image(4000, 4000, 100, 100), tags={"leisure": "park"}, is_area=True)
        conn.commit()
        conn.close()

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def collect(self, **kw):
        return eb.collect(self.path, self.georef, self.land, **kw)

    def test_the_right_buildings_are_kept_and_everything_else_is_counted(self):
        rows, left = self.collect()
        self.assertEqual([r[0] for r in rows], ["house", "named-shed", "plain"], "sorted by id: the same store, the same file")
        self.assertEqual(left["notBuilding"], 2, "the road and the park")
        self.assertEqual(left["offMap"], 1)
        self.assertEqual(left["atSea"], 1, "by the painted coastline, not the store's own")
        self.assertEqual(left["tiny"], 1, "an unnamed shed under the minimum area; a named one is kept")

    def test_a_row_is_id_kind_name_area_and_an_outline_in_image_pixels(self):
        rows, _ = self.collect()
        house = rows[0]
        self.assertEqual((house[0], house[1], house[2]), ("house", "house", "Kiku's"))
        self.assertAlmostEqual(house[3], 20 * 15, delta=2)
        ring = decode(house[4])
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        self.assertEqual((min(xs), min(ys), max(xs), max(ys)), (1000, 1000, 1020, 1015))
        self.assertIsNone(rows[2][2], "an unnamed building has no name")

    def test_the_document_has_kinds_by_index_and_is_deterministic_bytes(self):
        rows, _ = self.collect()
        doc = eb.document(rows, self.georef)
        self.assertEqual((doc["kind"], doc["version"], doc["image"]), ("buildings-index", 1, [12400, 12400]))
        self.assertEqual(doc["kinds"], sorted(doc["kinds"]))
        self.assertEqual(doc["kinds"][doc["buildings"][0][1]], "house")
        again, _ = self.collect()
        self.assertEqual(eb.serialise(doc), eb.serialise(eb.document(again, self.georef)))
        json.loads(eb.serialise(doc))

    def test_without_a_painted_coastline_nothing_is_dropped_for_the_sea(self):
        rows, left = eb.collect(self.path, self.georef, None)
        self.assertEqual(left["atSea"], 0)
        self.assertIn("at-sea", [r[0] for r in rows])


@unittest.skipUnless(HAVE, "shapely, pyproj and numpy are needed")
class TheShippedFile(unittest.TestCase):
    def test_it_is_the_version_the_editor_reads(self):
        path = os.path.join(_REPO, "data", "map", "buildings-index.json")
        if not os.path.exists(path):
            self.skipTest("data/map/buildings-index.json has not been exported")
        with open(path, encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual((doc["kind"], doc["version"]), ("buildings-index", eb.VERSION))
        self.assertGreater(len(doc["buildings"]), 30000)


if __name__ == "__main__":
    unittest.main()
