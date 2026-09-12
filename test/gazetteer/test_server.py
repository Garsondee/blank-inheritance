"""The gazetteer server's API, exercised against a real running server.

Not mocked. The handler is started on an ephemeral port and hit over HTTP,
because the things most likely to break here are the seams a mock would paper
over: route dispatch, JSON encoding of non-ASCII names, the per-thread
GeoPackage connection, and whether a save actually reaches disk.

Two behaviours are load-bearing enough to be worth stating as claims:

**A feature query never truncates silently.** Zoomed out, the viewport covers
175,000 buildings. The query refuses above a view width and says so, and caps a
large result and says how much it kept. An honest empty answer can be debugged;
a quietly halved one cannot. (tools/city-map/api/features.py already holds this
line with its own hiddenByLod / hiddenByCap flags.)

**Suppression is reversible.** Every test that removes something also restores
it and checks it came back. A mechanism that installs state and cannot remove
it is a trap you discover at the worst possible moment — the first time a
removal was a mistake.

Skips loudly without the 120 MB GeoPackage, per design/testing-strategy.md
rule 5: a fresh clone has no cache.
"""

import json
import os
import shutil
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

import server as gz  # noqa: E402
from core import groundtruth, overrides as overrides_mod, session as session_mod  # noqa: E402
from core import location as location_mod  # noqa: E402

# Sannomiya: the densest ground truth on the sheet, so a small window there is
# a real test of the feature query rather than an empty one.
DENSE_PX = (4508, 5046)


def get(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read().decode("utf-8"))


def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


@unittest.skipUnless(groundtruth.store_exists(),
                     "needs data/map/kurose.gpkg (120 MB, not in a fresh clone)")
class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        # Redirect both places this server writes, so a test run never touches
        # the repo's real session drafts or its tracked overrides file.
        cls.draft_dir = os.path.join(cls.tmp, "drafts")
        cls.overrides_path = os.path.join(cls.tmp, "overrides.json")
        cls.locations_dir = os.path.join(cls.tmp, "locations")
        cls._old_draft_dir = session_mod.DRAFT_DIR
        cls._old_overrides = overrides_mod.OVERRIDES_PATH
        cls._old_locations_dir = gz.LOCATIONS_DIR
        session_mod.DRAFT_DIR = cls.draft_dir
        overrides_mod.OVERRIDES_PATH = cls.overrides_path
        gz.LOCATIONS_DIR = cls.locations_dir
        os.makedirs(cls.draft_dir, exist_ok=True)

        gz.STATE = gz.State(tile_dir=os.path.join(cls.tmp, "tiles"))
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), gz.Handler)
        cls.base = "http://127.0.0.1:%d" % cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        session_mod.DRAFT_DIR = cls._old_draft_dir
        overrides_mod.OVERRIDES_PATH = cls._old_overrides
        gz.LOCATIONS_DIR = cls._old_locations_dir
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _seed_item(self, tier="site", ring=None, point=None, name="", note=""):
        """Save a session with one item and return its saved (derived) form,
        the way a real client would before promoting it."""
        geometry = ({"kind": "point", "pointPx": point} if point else
                   {"kind": "polygon", "ringPx": ring or
                    [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]})
        item = {"localId": "seed-1", "tier": tier, "name": name, "kind": "",
               "note": note, "tags": [], "source": "drawn", "sourceFeatureIds": [],
               "geometry": geometry, "derived": {}}
        res = post(self.base + "/api/session", {"items": [item]})
        return res["draft"]["items"][0]

    # --- configuration -------------------------------------------------------

    def test_map_config_describes_the_sheet_the_client_must_agree_with(self):
        cfg = get(self.base + "/api/map")
        self.assertEqual(cfg["image"]["width"], 12400)
        self.assertEqual(cfg["border"]["px"], 200)
        self.assertEqual(cfg["content"]["width"], 12000)
        self.assertEqual(cfg["grid"]["cols"], 60)
        self.assertEqual(cfg["grid"]["cellPx"], 200)
        self.assertEqual(cfg["metresPerPixel"], 1.0)
        self.assertIn("region", cfg["tiers"])
        self.assertTrue(cfg["groundTruthAvailable"])

    def test_an_unknown_route_is_a_404_with_a_reason(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            get(self.base + "/api/nope")
        self.assertEqual(cm.exception.code, 404)

    # --- ground truth --------------------------------------------------------

    def test_a_tight_window_returns_real_buildings(self):
        x, y = DENSE_PX
        data = get(self.base + "/api/features?x0=%d&y0=%d&x1=%d&y1=%d"
                   % (x - 300, y - 300, x + 300, y + 300))
        self.assertFalse(data["refused"])
        self.assertGreater(len(data["features"]), 20)
        f = data["features"][0]
        self.assertIn("ringPx", f)
        self.assertGreaterEqual(len(f["ringPx"]), 3)

    def test_japanese_names_survive_the_json_round_trip(self):
        """The ground truth carries 4,135 name:ja values, and mojibake here
        would poison every note prefilled from a real building."""
        x, y = DENSE_PX
        data = get(self.base + "/api/features?x0=%d&y0=%d&x1=%d&y1=%d"
                   % (x - 600, y - 600, x + 600, y + 600))
        names = [f["name"] for f in data["features"] if f["name"]]
        self.assertTrue(names, "expected at least one named building in Sannomiya")
        self.assertTrue(any(any(ord(c) > 0x3000 for c in n) for n in names),
                        "expected at least one name in Japanese script")

    def test_a_wide_view_refuses_and_says_why(self):
        """Never a silent empty layer: the UI shows the reason as guidance."""
        data = get(self.base + "/api/features?x0=200&y0=200&x1=12200&y1=12200")
        self.assertTrue(data["refused"])
        self.assertIn("served below", data["reason"])
        self.assertEqual(data["features"], [])

    def test_hit_test_finds_the_building_under_a_pixel(self):
        x, y = DENSE_PX
        data = get(self.base + "/api/features?x0=%d&y0=%d&x1=%d&y1=%d"
                   % (x - 300, y - 300, x + 300, y + 300))
        target = data["features"][0]
        ring = target["ringPx"]
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        hits = post(self.base + "/api/hit-test", {"x": cx, "y": cy})["hits"]
        self.assertTrue(any(h["id"] == target["id"] for h in hits))

    def test_hit_test_on_open_water_finds_nothing(self):
        """An honest empty answer, not an error and not a nearest-neighbour
        guess that would adopt a building from the next street."""
        hits = post(self.base + "/api/hit-test", {"x": 10200, "y": 9600})["hits"]
        self.assertEqual(hits, [])

    def test_hit_test_finds_a_building_from_just_outside_its_edge(self):
        """Found live: a real building renders at 8% fill opacity with a 1px
        outline, and at any zoom below native a screen pixel already spans
        several image pixels -- landing exactly inside the polygon is not a
        realistic ask, and a plain miss made single-click adopt/remove nearly
        unusable except zoomed all the way in. tolerancePx now bounds a
        nearest-EDGE fallback, not just the query window, so a click just
        outside a small building's boundary still finds it."""
        x, y = DENSE_PX
        data = get(self.base + "/api/features?x0=%d&y0=%d&x1=%d&y1=%d"
                   % (x - 300, y - 300, x + 300, y + 300))
        target = data["features"][0]
        ring = [tuple(p) for p in target["ringPx"]]

        # Midpoint of the first edge, offset a few px perpendicular to it --
        # tried in both directions and self-verified against _point_in_ring,
        # so this does not depend on the ring's winding order.
        (ex0, ey0), (ex1, ey1) = ring[0], ring[1]
        mx, my = (ex0 + ex1) / 2, (ey0 + ey1) / 2
        dx, dy = ex1 - ex0, ey1 - ey0
        length = (dx ** 2 + dy ** 2) ** 0.5
        nx, ny = -dy / length, dx / length
        candidates = [(mx + nx * 3, my + ny * 3), (mx - nx * 3, my - ny * 3)]
        outside = [p for p in candidates if not overrides_mod._point_in_ring(p[0], p[1], ring)]
        self.assertTrue(outside, "both offset directions landed inside the ring -- degenerate edge")
        px, py = outside[0]

        # A generous tolerance (matching the client's zoom-scaled one) finds
        # it; a razor-thin one -- the OLD hard-coded default -- does not.
        hits = post(self.base + "/api/hit-test", {"x": px, "y": py, "tolerancePx": 8})["hits"]
        self.assertTrue(any(h["id"] == target["id"] for h in hits))

        tight = post(self.base + "/api/hit-test", {"x": px, "y": py, "tolerancePx": 0.1})["hits"]
        self.assertFalse(any(h["id"] == target["id"] for h in tight))

    # --- adopting ------------------------------------------------------------

    def test_adopting_one_building_returns_its_real_footprint(self):
        x, y = DENSE_PX
        data = get(self.base + "/api/features?x0=%d&y0=%d&x1=%d&y1=%d"
                   % (x - 300, y - 300, x + 300, y + 300))
        target = data["features"][0]
        adopted = post(self.base + "/api/adopt", {"featureIds": [target["id"]]})
        self.assertEqual(adopted["source"], "adopted")
        self.assertEqual(adopted["featureIds"], [target["id"]])
        self.assertEqual(len(adopted["ringPx"]), len(target["ringPx"]))

    def test_adopting_several_buildings_merges_them_into_one_shape(self):
        """A campus or a terrace is one place with one story. A multipolygon
        would be technically truer and useless to write about."""
        x, y = DENSE_PX
        data = get(self.base + "/api/features?x0=%d&y0=%d&x1=%d&y1=%d"
                   % (x - 200, y - 200, x + 200, y + 200))
        ids = [f["id"] for f in data["features"][:4]]
        merged = post(self.base + "/api/adopt", {"featureIds": ids})
        self.assertEqual(merged["source"], "merged")
        self.assertGreaterEqual(len(merged["ringPx"]), 3)

    def test_adopting_nothing_is_an_error_not_an_empty_shape(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/adopt", {"featureIds": []})
        self.assertEqual(cm.exception.code, 400)

    # --- removing, and putting back ------------------------------------------

    def test_removing_a_building_hides_it_and_restoring_brings_it_back(self):
        x, y = DENSE_PX
        window = "/api/features?x0=%d&y0=%d&x1=%d&y1=%d" % (x - 300, y - 300, x + 300, y + 300)
        before = get(self.base + window)["features"]
        victim = before[0]["id"]

        post(self.base + "/api/suppress", {"featureIds": [victim], "note": "painted out"})
        during = get(self.base + window)
        self.assertNotIn(victim, [f["id"] for f in during["features"]])
        self.assertGreaterEqual(during["suppressedHere"], 1)

        post(self.base + "/api/unsuppress", {"featureIds": [victim]})
        after = get(self.base + window)["features"]
        self.assertIn(victim, [f["id"] for f in after])

    def test_removing_an_area_hides_everything_inside_it_and_can_be_undone(self):
        x, y = DENSE_PX
        window = "/api/features?x0=%d&y0=%d&x1=%d&y1=%d" % (x - 300, y - 300, x + 300, y + 300)
        before = len(get(self.base + window)["features"])
        self.assertGreater(before, 0)

        ring = [[x - 250, y - 250], [x + 250, y - 250], [x + 250, y + 250], [x - 250, y + 250]]
        res = post(self.base + "/api/suppress", {"ringPx": ring, "note": "levelled"})
        area_id = res["area"]["id"]
        self.assertIn("refs", res["area"])
        self.assertIn("ring", res["area"], "an area must carry canonical lon/lat too")

        during = len(get(self.base + window)["features"])
        self.assertLess(during, before)

        post(self.base + "/api/unsuppress", {"areaId": area_id})
        self.assertEqual(len(get(self.base + window)["features"]), before)

    # --- the session ---------------------------------------------------------

    def test_saving_a_session_derives_its_fields_and_writes_a_file(self):
        items = [{
            "localId": "item-1",
            "tier": "region",
            "name": "Test District",
            "kind": "waterfront",
            "note": "rough note, 日本語 included",
            "tags": ["a", "b"],
            "source": "drawn",
            "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                         "ringPx": [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]},
            "derived": {},
        }]
        res = post(self.base + "/api/session", {"items": items})
        self.assertEqual(res["problems"], [])
        saved = res["draft"]["items"][0]
        self.assertEqual(saved["derived"]["refs"],
                         ["C4·11", "C4·21", "C4·12", "C4·22"])
        self.assertAlmostEqual(saved["derived"]["areaM2"], 160000.0, delta=1.0)
        self.assertEqual(len(saved["geometry"]["ring"]), 4,
                         "canonical lon/lat must be attached at save")
        self.assertEqual(saved["note"], "rough note, 日本語 included")

        with open(os.path.join(self.draft_dir, res["draft"]["id"] + ".json"),
                  encoding="utf-8") as fh:
            on_disk = json.load(fh)
        self.assertEqual(on_disk["items"][0]["name"], "Test District")

    def test_an_edit_made_on_disk_is_not_silently_overwritten(self):
        """The server holds the whole draft in memory and writes it out whole.

        So anything that edits the file directly -- a backfill script, a hand
        correction, another tool -- is invisible to it, and the next save from
        a browser that loaded earlier reverts the lot without a word. Found
        live: a backfill of the research provenance on forty regions was one
        autosave away from being wiped.
        """
        self._seed_item(name="Before")
        path = os.path.join(self.draft_dir, gz.STATE.draft["id"] + ".json")

        # Something else edits the file, the way a script would.
        with open(path, encoding="utf-8") as fh:
            on_disk = json.load(fh)
        on_disk["items"][0]["provenance"] = {"writtenBy": "another tool"}
        time.sleep(0.02)   # coarse mtime resolution on some filesystems
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(on_disk, fh, ensure_ascii=False)

        stale = [dict(gz.STATE.draft["items"][0], name="After")]
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/session", {"items": stale})
        self.assertEqual(cm.exception.code, 409)
        body = json.loads(cm.exception.read().decode("utf-8"))
        self.assertIn("changed on disk", body["error"])
        # And the refusal hands back what is really there, so the client can
        # reload rather than guess.
        self.assertEqual(body["draft"]["items"][0]["provenance"],
                         {"writtenBy": "another tool"})

        with open(path, encoding="utf-8") as fh:
            self.assertEqual(json.load(fh)["items"][0]["name"], "Before",
                             "the on-disk edit was overwritten anyway")

    def test_a_deliberate_overwrite_is_still_possible(self):
        self._seed_item(name="Before")
        path = os.path.join(self.draft_dir, gz.STATE.draft["id"] + ".json")
        with open(path, encoding="utf-8") as fh:
            on_disk = json.load(fh)
        on_disk["items"][0]["note"] = "edited elsewhere"
        time.sleep(0.02)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(on_disk, fh, ensure_ascii=False)

        items = [dict(gz.STATE.draft["items"][0], name="After")]
        res = post(self.base + "/api/session", {"items": items, "force": True})
        self.assertEqual(res["draft"]["items"][0]["name"], "After")

    def test_a_normal_save_is_not_blocked_by_its_own_previous_save(self):
        # The guard must compare against what THIS process wrote, or the
        # second save of every session fails.
        self._seed_item(name="One")
        items = [dict(gz.STATE.draft["items"][0], name="Two")]
        res = post(self.base + "/api/session", {"items": items})
        self.assertEqual(res["draft"]["items"][0]["name"], "Two")

    def test_a_malformed_item_is_reported_but_the_session_is_still_saved(self):
        """An hour of drawing must never be lost because one shape is broken."""
        res = post(self.base + "/api/session", {"items": [{
            "localId": "bad", "tier": "region", "source": "drawn",
            "geometry": {"kind": "polygon", "ringPx": [[1, 1], [2, 2]]},
            "name": "", "kind": "", "note": "", "tags": [],
            "sourceFeatureIds": [], "derived": {},
        }]})
        self.assertTrue(res["problems"])
        self.assertTrue(os.path.exists(os.path.join(
            self.draft_dir, res["draft"]["id"] + ".json")))

    def test_a_session_without_items_is_a_bad_request(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/session", {})
        self.assertEqual(cm.exception.code, 400)

    # --- promotion -------------------------------------------------------
    #
    # The claim these hold up: what you can already see in the DRAFT (the
    # session you save) is what becomes visible everywhere else, permanently,
    # once promoted -- and the reverse holds too: nothing is promotable with
    # neither a name nor a note, because that would create a file with nothing
    # to write a location's lore from.

    def test_a_bare_item_with_no_name_or_note_cannot_be_promoted(self):
        """The exact state a fresh click-to-adopt leaves an item in."""
        self._seed_item()
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/promote", {"localId": "seed-1", "id": "test-loc"})
        self.assertEqual(cm.exception.code, 409)
        body = json.loads(cm.exception.read().decode("utf-8"))
        self.assertTrue(body["problems"])

    def test_promoting_a_noted_item_writes_a_real_file_and_appears_in_locations(self):
        self._seed_item(note="A quiet block behind the station.", name="Station Rear")
        res = post(self.base + "/api/promote",
                  {"localId": "seed-1", "id": "station-rear"})
        path = os.path.join(self.locations_dir, "station-rear.json")
        self.assertTrue(os.path.exists(path))
        with open(path, encoding="utf-8") as fh:
            on_disk = json.load(fh)
        self.assertEqual(on_disk["authoring"]["note"], "A quiet block behind the station.")
        self.assertEqual(on_disk["authoring"]["status"], "needs-lore")

        locs = get(self.base + "/api/locations")["locations"]
        self.assertTrue(any(loc["id"] == "station-rear" for loc in locs))
        found = next(loc for loc in locs if loc["id"] == "station-rear")
        self.assertEqual(found["name"], "Station Rear")
        self.assertIsNotNone(found["ringsPx"])

    def test_promoting_the_same_id_twice_is_refused_without_overwrite(self):
        self._seed_item(note="first")
        post(self.base + "/api/promote", {"localId": "seed-1", "id": "dup-test"})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/promote", {"localId": "seed-1", "id": "dup-test"})
        self.assertEqual(cm.exception.code, 409)
        # ...but explicitly asking to overwrite works.
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "dup-test", "overwrite": True, "force": True})

    def test_a_point_promotes_with_lon_lat_not_rings(self):
        self._seed_item(tier="point", point=[4573, 6580], note="a statue")
        post(self.base + "/api/promote", {"localId": "seed-1", "id": "test-statue"})
        with open(os.path.join(self.locations_dir, "test-statue.json"), encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual(doc["geometry"]["rings"], [])
        self.assertEqual(len(doc["geometry"]["point"]), 2)

        locs = get(self.base + "/api/locations")["locations"]
        found = next(loc for loc in locs if loc["id"] == "test-statue")
        self.assertIsNotNone(found["pointPx"])
        self.assertIsNone(found["ringsPx"])

    def test_a_site_promoted_after_its_region_is_marked_contained(self):
        """The end-to-end version of core/location.py's containment tests,
        through the actual HTTP surface the UI calls."""
        region_ring = [[4000, 6000], [6000, 6000], [6000, 8000], [4000, 8000]]
        self._seed_item(ring=region_ring, name="Test Region", note="a big district")
        # overwrite the localId's tier field directly via session save, since
        # _seed_item always uses "site" -- promote a region explicitly here.
        post(self.base + "/api/session", {"items": [{
            "localId": "seed-1", "tier": "region", "name": "Test Region",
            "kind": "", "note": "a big district", "tags": [], "source": "drawn",
            "sourceFeatureIds": [], "geometry": {"kind": "polygon", "ringPx": region_ring},
            "derived": {},
        }]})
        post(self.base + "/api/promote", {"localId": "seed-1", "id": "test-region"})

        post(self.base + "/api/session", {"items": [{
            "localId": "seed-2", "tier": "site", "name": "Test Building",
            "kind": "", "note": "inside the district", "tags": [], "source": "drawn",
            "sourceFeatureIds": [],
            "geometry": {"kind": "polygon", "ringPx":
                        [[4700, 6700], [4900, 6700], [4900, 6900], [4700, 6900]]},
            "derived": {},
        }]})
        post(self.base + "/api/promote", {"localId": "seed-2", "id": "test-building"})

        with open(os.path.join(self.locations_dir, "test-building.json"), encoding="utf-8") as fh:
            building = json.load(fh)
        self.assertEqual(building["derived"]["withinRegionRef"], "test-region")

        with open(os.path.join(self.locations_dir, "test-region.json"), encoding="utf-8") as fh:
            region = json.load(fh)
        self.assertIn("test-building", region["derived"]["containsRefs"])


if __name__ == "__main__":
    unittest.main()
