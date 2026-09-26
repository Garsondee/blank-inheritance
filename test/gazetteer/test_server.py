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

import crop as crop_mod  # noqa: E402
import server as gz  # noqa: E402
from core import groundtruth, overrides as overrides_mod, session as session_mod  # noqa: E402
from core import location as location_mod  # noqa: E402
from core import requests as requests_mod  # noqa: E402
from core import lore_library as lore_mod  # noqa: E402
import biome as biome_mod  # noqa: E402

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
    _seed_counter = 0  # see _seed_item's own docstring for why this exists

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        # Redirect both places this server writes, so a test run never touches
        # the repo's real session drafts or its tracked overrides file.
        cls.draft_dir = os.path.join(cls.tmp, "drafts")
        cls.overrides_path = os.path.join(cls.tmp, "overrides.json")
        cls.locations_dir = os.path.join(cls.tmp, "locations")
        cls.requests_path = os.path.join(cls.tmp, "gazetteer-requests.json")
        cls.biome_cache_path = os.path.join(cls.tmp, "biomes.json")
        cls.biome_overrides_path = os.path.join(cls.tmp, "biome-overrides.json")
        cls.lore_docs_dir = os.path.join(cls.tmp, "lore-docs")
        cls.lore_library_path = os.path.join(cls.tmp, "lore-library.json")
        cls.lore_instructions_path = os.path.join(cls.tmp, "lore-instructions.json")
        cls.client_log_path = os.path.join(cls.tmp, "client.log")
        cls._old_draft_dir = session_mod.DRAFT_DIR
        cls._old_overrides = overrides_mod.OVERRIDES_PATH
        cls._old_locations_dir = gz.LOCATIONS_DIR
        cls._old_client_log_path = gz.CLIENT_LOG_PATH
        cls._old_requests_path = requests_mod.REQUESTS_PATH
        cls._old_biome_cache = biome_mod.CACHE_PATH
        cls._old_biome_overrides = biome_mod.OVERRIDES_PATH
        cls._old_lore_library_path = lore_mod.LIBRARY_PATH
        cls._old_lore_instructions_path = lore_mod.INSTRUCTIONS_PATH
        cls._old_lore_repo_root = lore_mod.REPO_ROOT
        session_mod.DRAFT_DIR = cls.draft_dir
        overrides_mod.OVERRIDES_PATH = cls.overrides_path
        gz.LOCATIONS_DIR = cls.locations_dir
        requests_mod.REQUESTS_PATH = cls.requests_path
        biome_mod.CACHE_PATH = cls.biome_cache_path
        biome_mod.OVERRIDES_PATH = cls.biome_overrides_path
        lore_mod.LIBRARY_PATH = cls.lore_library_path
        lore_mod.INSTRUCTIONS_PATH = cls.lore_instructions_path
        lore_mod.REPO_ROOT = cls.tmp
        gz.CLIENT_LOG_PATH = cls.client_log_path
        os.makedirs(cls.draft_dir, exist_ok=True)
        os.makedirs(cls.lore_docs_dir, exist_ok=True)

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
        requests_mod.REQUESTS_PATH = cls._old_requests_path
        biome_mod.CACHE_PATH = cls._old_biome_cache
        biome_mod.OVERRIDES_PATH = cls._old_biome_overrides
        lore_mod.LIBRARY_PATH = cls._old_lore_library_path
        lore_mod.INSTRUCTIONS_PATH = cls._old_lore_instructions_path
        lore_mod.REPO_ROOT = cls._old_lore_repo_root
        gz.CLIENT_LOG_PATH = cls._old_client_log_path
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _seed_item(self, tier="site", ring=None, point=None, name="", note=""):
        """Save a session with one item and return its saved (derived) form,
        the way a real client would before promoting it.

        The default ring is nudged by a few pixels on every call that does
        not supply its own -- found live: two unrelated tests both using
        this same default rectangle for "seed-1" is exactly the shape
        _looks_like_the_same_item falls back to when sourceFeatureIds is
        empty on both sides (true here, always), so one test's promoted
        seed-1 was silently donating its locationRef to the next test's
        freshly-seeded seed-1 at the same coordinates -- the identical
        mechanism this project built to protect a real stale browser tab,
        tripped instead by every test in this file sharing one server
        process and one default shape. A 1px-per-call nudge, comfortably
        inside the sheet at any realistic test count, is enough: the shape
        comparison is exact equality, not a tolerance.
        """
        if ring is None and point is None:
            n = TestServer._seed_counter
            TestServer._seed_counter += 1
            ring = [[4400 + n, 6400], [4800 + n, 6400], [4800 + n, 6800], [4400 + n, 6800]]
        geometry = ({"kind": "point", "pointPx": point} if point else
                   {"kind": "polygon", "ringPx": ring or
                    [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]})
        item = {"localId": "seed-1", "tier": tier, "name": name, "kind": "",
               "note": note, "tags": [], "source": "drawn", "sourceFeatureIds": [],
               "geometry": geometry, "derived": {}}
        # The undo stack is process-lifetime state, not draft state, so
        # resetting the draft alone would leave it carrying entries from
        # whichever test happened to run first -- every test that cares
        # about undo starts from a clean stack the same way it starts from
        # a clean draft.
        gz.STATE.undo_stack = gz.undo_mod.UndoStack()
        # allowDeletePromoted: this helper deliberately resets the whole
        # session, including anything a previous test promoted.
        res = post(self.base + "/api/session",
                   {"items": [item], "allowDeletePromoted": True})
        return next(i for i in res["draft"]["items"] if i["localId"] == "seed-1")

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

    def test_the_tile_url_the_client_gets_is_content_addressed(self):
        # Found live: the map "still looks low resolution after a forced
        # reboot / refresh." The tile pyramid itself was fine (a fresh,
        # uncached read matched the master pixel-for-pixel) -- the bug was
        # that /tiles/{z}/{x}/{y}.webp carried no hash at all, so a rebuilt
        # pyramid changed the BYTES at an UNCHANGED url, and a browser that
        # had ever loaded the page kept serving the old bytes from its own
        # disk cache for the full 24-hour max-age -- immune to a plain
        # refresh (nothing to revalidate against: no ETag, no Last-
        # Modified) and to rebooting the machine (which never touches
        # browser disk cache). /api/map is fetched fresh on every load
        # (no-store, see test_a_fresh_load_never_gets_a_cached_api_response
        # -shaped guarantee below) and is the one place a hash can reach the
        # client at all.
        cfg = get(self.base + "/api/map")
        self.assertRegex(cfg["tiles"]["url"], r"^/tiles/[0-9a-f]{16}/\{z\}/\{x\}/\{y\}\.webp$",
                         "the tile url the client is told to fetch from no "
                         "longer carries the current build's hash -- a "
                         "rebuilt pyramid would again be invisible behind a "
                         "url that never changed")
        self.assertIn(gz.STATE.tile_hash, cfg["tiles"]["url"])

    def test_a_tile_request_ignores_its_own_hash_segment_and_serves_current_bytes(self):
        # The hash in the path is never checked against STATE.tile_hash --
        # its only job is making the URL DIFFERENT when the tiles are
        # rebuilt, a job /api/map's own freshness already does. Requiring a
        # match here would only add a way for an old tab's stale url to 404
        # instead of quietly self-healing the moment that tab reloads.
        os.makedirs(os.path.join(gz.STATE.tile_dir, "3", "1"), exist_ok=True)
        tile_path = os.path.join(gz.STATE.tile_dir, "3", "1", "2.webp")
        with open(tile_path, "wb") as fh:
            fh.write(b"fake-webp-bytes")
        try:
            req = urllib.request.Request(self.base + "/tiles/deadbeef00000000/3/1/2.webp")
            with urllib.request.urlopen(req) as r:
                body = r.read()
                cache_control = r.headers.get("Cache-Control")
            self.assertEqual(body, b"fake-webp-bytes")
            self.assertEqual(cache_control, "public, max-age=31536000, immutable")
        finally:
            os.remove(tile_path)

    def test_a_tile_url_missing_its_hash_segment_is_a_400_not_a_500(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            get(self.base + "/tiles/3/1/2.webp")  # only z/x/y -- the old, pre-fix shape
        self.assertEqual(cm.exception.code, 400)

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
        res = post(self.base + "/api/session", {"items": items, "allowDeletePromoted": True})
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

    def test_saving_computes_containment_and_inherits_the_regions_brief(self):
        """Gazetteer V2's whole reason for existing: a building already knows
        which district it stands in, and that district's brief, by geometry
        alone -- nothing typed twice, nothing that can silently go stale."""
        region = {
            "localId": "item-1", "tier": "region", "name": "The Yards",
            "kind": "military", "note": "", "tags": [], "source": "drawn",
            "sourceFeatureIds": [],
            "brief": "Pure military and checkpoints. No civilians.",
            "constraints": ["no-civilians", "1950s-register"],
            "geometry": {"kind": "polygon",
                        "ringPx": [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]},
            "derived": {},
        }
        site = {
            "localId": "item-2", "tier": "site", "name": "", "kind": "",
            "note": "a shed", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[4500, 6500], [4550, 6500], [4550, 6550], [4500, 6550]]},
            "derived": {},
        }
        res = post(self.base + "/api/session", {"items": [region, site], "allowDeletePromoted": True})
        by_id = {i["localId"]: i for i in res["draft"]["items"]}

        self.assertEqual(by_id["item-2"]["derived"]["withinRegionRef"], "item-1")
        self.assertIn("item-2", by_id["item-1"]["derived"]["containsRefs"])
        self.assertEqual(by_id["item-2"]["derived"]["inheritedBrief"],
                         "Pure military and checkpoints. No civilians.")
        self.assertEqual(by_id["item-2"]["derived"]["inheritedConstraints"],
                         ["no-civilians", "1950s-register"])
        # The region itself inherits nothing -- it is not standing inside
        # anything.
        self.assertEqual(by_id["item-1"]["derived"]["inheritedBrief"], "")

    def test_a_plain_get_also_returns_fresh_containment(self):
        """Not only at save time -- a page that only just loaded, before
        anyone has saved again, must still show the right district for
        something adopted a minute ago by someone else."""
        region = {
            "localId": "item-1", "tier": "region", "name": "The Yards",
            "kind": "", "note": "", "tags": [], "source": "drawn",
            "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]},
            "derived": {},
        }
        post(self.base + "/api/session", {"items": [region], "allowDeletePromoted": True})
        fresh = get(self.base + "/api/session")
        self.assertEqual(fresh["draft"]["items"][0]["derived"]["containsRefs"], [])

    def test_queue_groups_by_district_and_flags_a_missing_brief(self):
        items = [
            {"localId": "r1", "tier": "region", "name": "The Yards",
            "kind": "", "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]},
            "derived": {}},
            {"localId": "s1", "tier": "site", "name": "", "kind": "", "note": "",
            "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[4500, 6500], [4550, 6500], [4550, 6550], [4500, 6550]]},
            "derived": {}},
        ]
        post(self.base + "/api/session", {"items": items, "allowDeletePromoted": True})
        result = get(self.base + "/api/queue")
        self.assertEqual(result["regionCount"], 1)
        by_id = {r["localId"]: r for r in result["regions"]}
        self.assertEqual(by_id["r1"]["total"], 1)
        self.assertFalse(by_id["r1"]["hasBrief"])
        self.assertEqual(result["regionsWithNoBrief"], 1)
        self.assertIn("r1", [r["localId"] for r in result["needsAttention"]])

    def test_handoff_carries_the_regions_brief_and_the_shape_report(self):
        items = [
            {"localId": "r1", "tier": "region", "name": "The Yards",
            "kind": "", "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "brief": "Pure military and checkpoints.",
            "geometry": {"kind": "polygon",
                        "ringPx": [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]},
            "derived": {}},
            {"localId": "s1", "tier": "site", "name": "Shed", "kind": "", "note": "a shed",
            "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[4500, 6500], [4550, 6500], [4550, 6550], [4500, 6550]]},
            "derived": {}},
        ]
        post(self.base + "/api/session", {"items": items, "allowDeletePromoted": True})
        result = post(self.base + "/api/handoff", {"localIds": ["s1"]})
        self.assertIn("Pure military and checkpoints.", result["markdown"])
        self.assertIn("Shed", result["markdown"])
        self.assertIn("a shed", result["markdown"])
        # A 50x50 footprint (2,500 m2) with no tagged height -- shape.py must
        # have actually run, not just been imported.
        self.assertIn("Footprint", result["markdown"])

    def test_handoff_refuses_with_no_ids(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/handoff", {"localIds": []})
        self.assertEqual(cm.exception.code, 400)

    @unittest.skipUnless(os.path.exists(crop_mod.DEFAULT_IMAGE),
                         "the painted map is gitignored and not present")
    def test_crop_returns_a_real_png_for_a_real_item(self):
        seeded = self._seed_item(ring=[[6800, 5400], [6900, 5400], [6900, 5500], [6800, 5500]])
        with urllib.request.urlopen(
                self.base + "/api/crop/%s.png" % seeded["localId"]) as res:
            self.assertEqual(res.headers.get("Content-Type"), "image/png")
            data = res.read()
        self.assertTrue(data.startswith(b"\x89PNG"))

    def test_crop_404s_for_an_unknown_item(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            urllib.request.urlopen(self.base + "/api/crop/no-such-item.png")
        self.assertEqual(cm.exception.code, 404)

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

    def test_promotion_stamps_the_draft_item_so_the_session_knows(self):
        """Ingram's report: two locations were written in full and promoted,
        he refreshed the Gazetteer, and both still showed their stub notes
        with the whole lore listed as outstanding. Promotion is a one-way
        door and never writes lore back into the draft -- but the draft has
        to at least know the door was walked through, or the session panel
        and the handoff both keep reporting a finished place as unwritten."""
        self._seed_item(note="A quiet block behind the station.", name="Station Rear")
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "stamp-test"})
        item = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                    if i["localId"] == "seed-1")
        self.assertEqual(item["locationRef"], "stamp-test")
        self.assertTrue(item["locked"], "a promoted item is no longer a draft")

    def test_a_stale_save_cannot_erase_an_earlier_promotion(self):
        """Found live: Ingram had a browser tab open from before three
        locations were promoted (by a direct script call, not that tab).
        An unrelated edit in that tab triggered its next autosave, which
        sent the tab's own older idea of those items -- no locationRef, no
        locked -- and the server accepted it, silently un-stamping all
        three. The written lore was still on disk and still findable by
        sourceLocalId, but the inspector's Promoted badge and the map's
        green locked outline both went dark. A plain save must never be
        able to do that."""
        seeded = self._seed_item(note="a rough note", name="Written Place")
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "stale-save-test"})

        # A second, older payload for the same item -- as if a tab that
        # loaded the session before promotion is now saving an unrelated
        # change of its own, unaware locationRef/locked exist at all. Must
        # be the SAME drawn shape _seed_item actually used (read back from
        # its own return value, not a second hardcoded copy of the ring) --
        # _looks_like_the_same_item compares the shape exactly, and
        # _seed_item nudges its default ring a little on every call so
        # unrelated tests never collide on it by accident.
        stale_item = {
            "localId": "seed-1", "tier": "site", "name": "Written Place",
            "kind": "", "note": "a rough note, edited in the stale tab",
            "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon", "ringPx": seeded["geometry"]["ringPx"]},
            "derived": {},
        }
        post(self.base + "/api/session", {"items": [stale_item]})

        item = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                    if i["localId"] == "seed-1")
        self.assertEqual(item["locationRef"], "stale-save-test",
                         "the link to the promoted file must survive a stale save")
        self.assertTrue(item["locked"])
        # The stale tab's own edit still goes through -- this is reconciling
        # a gap, not refusing the save outright.
        self.assertEqual(item["note"], "a rough note, edited in the stale tab")

    def test_a_tab_that_knows_about_the_promotion_can_still_unlock_it(self):
        """The fix above only fills a GAP (locationRef missing entirely). A
        tab that already has the link and deliberately clicks Unlock must
        still be able to -- this is not a promotion made permanent."""
        self._seed_item(note="a rough note", name="Written Place")
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "unlock-test"})
        item = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                    if i["localId"] == "seed-1")

        item["locked"] = False   # the tab already knows locationRef and unlocks deliberately
        post(self.base + "/api/session", {"items": [item]})

        saved = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                    if i["localId"] == "seed-1")
        self.assertEqual(saved["locationRef"], "unlock-test")
        self.assertFalse(saved["locked"], "a tab that knows about the promotion may still unlock it")

    def test_a_promoted_region_does_not_overlap_its_own_draft_copy_in_coverage(self):
        """Found live, promoting The Proving Ground -- the first REGION
        anyone had promoted this session (every earlier promotion was a
        site). Promotion never deletes the draft item, so /api/coverage was
        counting a promoted region twice: once from the draft, once from
        data/locations/ -- and reporting the district as 100% overlapping
        ITSELF. That also buried a real, separate overlap against The Long
        Sheds underneath two rows of noise."""
        self._seed_item(tier="region", note="a training ground",
                        name="Coverage Region", ring=[[3400, 3400], [3900, 3400],
                                                       [3900, 3900], [3400, 3900]])
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "coverage-region-test"})
        result = get(self.base + "/api/coverage")
        self_overlaps = [o for o in result["overlaps"]
                         if {o["a"], o["b"]} == {"seed-1", "coverage-region-test"}]
        self.assertEqual(self_overlaps, [],
                         "a promoted region must not be checked against its own draft copy")

    def test_coverage_resyncs_a_promoted_regions_geometry_before_measuring_it(self):
        """Found live: /api/coverage built a promoted region's polygon from
        data/locations/ as of the LAST resync, not from whatever the draft
        currently holds -- so a vertex dragged and saved (which DOES resync)
        still left coverage reporting stale numbers for anything that moved
        BEFORE the resync mechanism next had a reason to run again mid-
        session. The gap between the "29 problems" Ingram was looking at and
        the "33" that showed up the moment something else forced a resync
        was exactly this staleness, not a real change to the map.

        Reproduced here by moving the draft copy directly (bypassing the
        normal save path, which already resyncs on its own) so the location
        file is left stale on purpose, then checking that a plain GET to
        /api/coverage -- no save, no promote -- is what fixes it."""
        self._seed_item(tier="region", note="a training ground",
                        name="Resync Region", ring=[[5400, 5400], [5900, 5400],
                                                     [5900, 5900], [5400, 5900]])
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "coverage-resync-test"})

        moved_ring = [[6400, 6400], [6900, 6400], [6900, 6900], [6400, 6900]]
        item = next(i for i in gz.STATE.draft["items"] if i["localId"] == "seed-1")
        item["geometry"]["ringPx"] = moved_ring

        location_path = os.path.join(self.locations_dir, "coverage-resync-test.json")
        with open(location_path, encoding="utf-8") as fh:
            before = json.load(fh)
        self.assertNotEqual((before.get("derived") or {}).get("imagePx", [None])[0], moved_ring,
                            "the location file already matches the moved ring -- "
                            "this test is not exercising staleness at all")

        get(self.base + "/api/coverage")

        with open(location_path, encoding="utf-8") as fh:
            after = json.load(fh)
        self.assertEqual((after.get("derived") or {}).get("imagePx", [None])[0], moved_ring,
                         "GET /api/coverage no longer resyncs a promoted region's "
                         "geometry before measuring it -- coverage can report "
                         "stale numbers for a region moved since the last save")

    def test_cleanup_dry_run_reports_the_snap_without_writing_anything(self):
        """Asked for directly: "Maybe we need a 'Cleanup' button." A dry run
        (the default -- a bare POST with no body must never write) reports
        exactly what a real run would do, so a preview and the real thing
        are provably the same computation."""
        self._seed_item()  # resets the undo stack and draft to something known
        a = {"localId": "clean-a", "tier": "region", "name": "Clean A", "kind": "",
             "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
             "geometry": {"kind": "polygon",
                         "ringPx": [[2000, 2000], [2400, 2000], [2400, 2400], [2000, 2400]]},
             "derived": {}}
        b = {"localId": "clean-b", "tier": "region", "name": "Clean B", "kind": "",
             "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
             "geometry": {"kind": "polygon",
                         "ringPx": [[2403, 2000], [2800, 2000], [2800, 3000], [2403, 3000]]},
             "derived": {}}
        post(self.base + "/api/session", {"items": [a, b]})

        result = post(self.base + "/api/cleanup", {"dryRun": True})
        self.assertTrue(result["dryRun"])
        self.assertEqual(len(result["snap"]), 1)
        self.assertEqual(result["snap"][0]["regionIds"], ["clean-a", "clean-b"])
        self.assertEqual(result["regionsTouched"], ["clean-a", "clean-b"])
        self.assertNotIn("saved", result, "a dry run must never report a save")

        after = get(self.base + "/api/session")["draft"]["items"]
        untouched_a = next(it for it in after if it["localId"] == "clean-a")
        self.assertEqual(untouched_a["geometry"]["ringPx"],
                         [[2000, 2000], [2400, 2000], [2400, 2400], [2000, 2400]],
                         "a dry run wrote to the live draft")

    def test_cleanup_applied_for_real_snaps_the_corner_and_can_be_undone(self):
        self._seed_item()
        a = {"localId": "clean-a", "tier": "region", "name": "Clean A", "kind": "",
             "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
             "geometry": {"kind": "polygon",
                         "ringPx": [[2000, 2000], [2400, 2000], [2400, 2400], [2000, 2400]]},
             "derived": {}}
        b = {"localId": "clean-b", "tier": "region", "name": "Clean B", "kind": "",
             "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
             "geometry": {"kind": "polygon",
                         "ringPx": [[2403, 2000], [2800, 2000], [2800, 3000], [2403, 3000]]},
             "derived": {}}
        post(self.base + "/api/session", {"items": [a, b]})

        result = post(self.base + "/api/cleanup", {"dryRun": False})
        self.assertFalse(result["dryRun"])
        self.assertIn("saved", result)
        self.assertEqual(result["regionsTouched"], ["clean-a", "clean-b"])

        after = get(self.base + "/api/session")["draft"]["items"]
        snapped_a = next(it for it in after if it["localId"] == "clean-a")
        snapped_b = next(it for it in after if it["localId"] == "clean-b")
        self.assertEqual(snapped_a["geometry"]["ringPx"][1], snapped_b["geometry"]["ringPx"][0],
                         "the two regions' near-corner did not actually snap together")

        undo_result = post(self.base + "/api/undo", {})
        reverted_a = next(it for it in undo_result["draft"]["items"] if it["localId"] == "clean-a")
        self.assertEqual(reverted_a["geometry"]["ringPx"],
                         [[2000, 2000], [2400, 2000], [2400, 2400], [2000, 2400]],
                         "undoing a real cleanup did not restore the pre-cleanup corner")

    def test_cleanup_with_nothing_to_clean_touches_nothing_and_pushes_no_undo_entry(self):
        self._seed_item()
        a = {"localId": "clean-a", "tier": "region", "name": "Clean A", "kind": "",
             "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
             "geometry": {"kind": "polygon",
                         "ringPx": [[2000, 2000], [2400, 2000], [2400, 2400], [2000, 2400]]},
             "derived": {}}
        # Far enough from `a` that nothing here is within any of
        # cleanup.py's default tolerances of anything in it.
        b = {"localId": "clean-b", "tier": "region", "name": "Clean B", "kind": "",
             "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
             "geometry": {"kind": "polygon",
                         "ringPx": [[9000, 9000], [9400, 9000], [9400, 9400], [9000, 9400]]},
             "derived": {}}
        post(self.base + "/api/session", {"items": [a, b]})
        before_undo_available = get(self.base + "/api/session").get("undoAvailable")

        result = post(self.base + "/api/cleanup", {"dryRun": False})
        self.assertEqual(result["regionsTouched"], [])
        self.assertNotIn("saved", result,
                         "nothing to clean up must not still report a write")

        after_undo_available = get(self.base + "/api/session").get("undoAvailable")
        self.assertEqual(before_undo_available, after_undo_available,
                         "a no-op cleanup must not push an undo entry")

    def test_a_recycled_localId_never_inherits_the_dead_item_promotion_link(self):
        """The worst bug this tool has produced, found live. Five promoted
        homes were deleted; the id counter was derived from 1 + max(existing),
        so it rolled BACKWARDS and handed those ids to the next twenty-seven
        buildings drawn. The save path then restored each dead home's
        locationRef onto the new building wearing its id, and the handoff
        duly reported a 15,103 m2 factory as a 121 m2 cottage."""
        self._seed_item(note="a house", name="A House")
        post(self.base + "/api/promote", {"localId": "seed-1", "id": "recycled-test"})

        # A DIFFERENT building that has been handed the same localId.
        impostor = {
            "localId": "seed-1", "tier": "site", "name": "", "kind": "",
            "note": "a completely different building", "tags": [],
            "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon", "ringPx":
                        [[9000, 9000], [9400, 9000], [9400, 9400], [9000, 9400]]},
            "derived": {},
        }
        post(self.base + "/api/session", {"items": [impostor]})

        item = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                    if i["localId"] == "seed-1")
        self.assertIsNone(item.get("locationRef"),
                          "a different building must never inherit a dead item's location")
        self.assertFalse(item.get("locked"))

    def test_the_id_counter_never_goes_backwards_after_a_deletion(self):
        """The root cause of the above: ids must not be reissued."""
        self._seed_item(note="first")
        after_seed = get(self.base + "/api/session")["draft"]
        # Save a draft whose highest id is much higher, then delete it.
        high = dict(after_seed["items"][0])
        high["localId"] = "item-900"
        post(self.base + "/api/session", {"items": [high], "nextLocalId": 901})
        post(self.base + "/api/session", {"items": [], "nextLocalId": 901})

        draft = get(self.base + "/api/session")["draft"]
        self.assertGreaterEqual(draft["nextLocalId"], 901,
                                "deleting the highest item must not roll the counter back")

    def test_a_save_cannot_delete_a_promoted_item(self):
        """How five promoted homes were actually lost. The lock that protects
        a promoted item is enforced in the BROWSER, against the browser's own
        copy of `locked` -- so a tab that loaded before the promotion believes
        it is an ordinary draft and drops it, and the server took that at face
        value. Deleting a promoted item for real means removing its
        data/locations entry first."""
        self._seed_item(note="a house", name="A House")
        post(self.base + "/api/promote", {"localId": "seed-1", "id": "undeletable-test"})

        # A save that simply omits it -- exactly what a stale tab sends.
        res = post(self.base + "/api/session", {"items": []})

        survivors = [i["localId"] for i in get(self.base + "/api/session")["draft"]["items"]]
        self.assertIn("seed-1", survivors, "a promoted item must survive a save that drops it")
        self.assertIn("seed-1", res.get("keptPromoted", []),
                      "and the save must say so rather than doing it quietly")

    def test_a_deleted_item_can_be_restored_with_undo(self):
        """The direct fix for how the five homes went missing earlier in
        this project's history: a save that drops an item is one keystroke
        away from being reversed, not an investigation."""
        self._seed_item(note="a house", name="A House")
        post(self.base + "/api/session", {"items": []})
        self.assertEqual(get(self.base + "/api/session")["draft"]["items"], [])

        res = post(self.base + "/api/undo", {})
        self.assertEqual(res["undid"], "deleted 'A House'")
        survivors = [i["localId"] for i in res["draft"]["items"]]
        self.assertIn("seed-1", survivors)
        # And it is really back, not just in this one response.
        self.assertIn("seed-1",
                      [i["localId"] for i in get(self.base + "/api/session")["draft"]["items"]])

    def test_a_save_names_what_undoing_it_would_restore(self):
        item = self._seed_item(note="a house", name="Signal Box")
        res = post(self.base + "/api/session",
                  {"items": [dict(item, name="Renamed Box")]})
        self.assertEqual(res["undoAvailable"], "renamed 'Signal Box' to 'Renamed Box'")
        # A plain GET agrees -- a page that only just loaded still offers it.
        self.assertEqual(get(self.base + "/api/session")["undoAvailable"],
                         "renamed 'Signal Box' to 'Renamed Box'")

    def test_a_no_op_save_does_not_spend_an_undo_slot(self):
        item = self._seed_item(note="a house", name="Unchanged")
        before = post(self.base + "/api/session", {"items": [item]})["undoAvailable"]
        # Re-posting the exact same item is not an edit -- resaving on a
        # timer, or the inspector re-sending the current selection, must not
        # bury a real prior edit's undo under a no-op.
        after = post(self.base + "/api/session", {"items": [item]})["undoAvailable"]
        self.assertEqual(before, after)

    def test_undo_reaches_back_more_than_one_step(self):
        # _seed_item's own save would count as one more real change and push
        # its own entry, so the two deletes under test are built as plain
        # saves on top of one seeded pair, not as two separate _seed_item
        # calls (each of which resets the stack -- see its own docstring).
        first = self._seed_item(note="a house", name="First")
        second = dict(first, localId="seed-2", name="Second")
        post(self.base + "/api/session", {"items": [first, second]})
        post(self.base + "/api/session", {"items": [first]})   # deletes Second
        post(self.base + "/api/session", {"items": []})        # deletes First

        first_undo = post(self.base + "/api/undo", {})
        self.assertEqual(first_undo["undid"], "deleted 'First'")
        second_undo = post(self.base + "/api/undo", {})
        self.assertEqual(second_undo["undid"], "deleted 'Second'")

    def test_undo_on_an_empty_stack_is_a_409_not_a_silent_no_op(self):
        self._seed_item(note="fresh session, nothing to undo yet")
        # _seed_item's own save is itself one real change and left an entry
        # of its own on the stack it just cleared -- drain that first so
        # this test is actually exercising an empty stack, not a full one.
        post(self.base + "/api/undo", {})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/undo", {})
        self.assertEqual(cm.exception.code, 409)

    # --- the Claude -> Ingram request queue ----------------------------------

    def _reset_requests(self):
        requests_mod.save(requests_mod.empty())

    def test_raising_a_request_and_listing_it_back(self):
        self._reset_requests()
        res = post(self.base + "/api/requests", {
            "what": "a name for the harbourmaster's office",
            "why": "The Old Landing's lore mentions one but nothing is drawn",
            "hint": "C3.44",
        })
        self.assertEqual(res["request"]["status"], "open")
        self.assertEqual(res["request"]["hint"], "C3.44")

        listed = get(self.base + "/api/requests")["requests"]
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["what"], "a name for the harbourmaster's office")

    def test_status_open_narrows_the_listing(self):
        self._reset_requests()
        r1 = post(self.base + "/api/requests", {"what": "first"})["request"]
        post(self.base + "/api/requests", {"what": "second"})
        post(self.base + "/api/requests/%s/resolve" % r1["id"], {"resolution": "done"})

        everything = get(self.base + "/api/requests")["requests"]
        open_only = get(self.base + "/api/requests?status=open")["requests"]
        self.assertEqual(len(everything), 2)
        self.assertEqual(len(open_only), 1)
        self.assertEqual(open_only[0]["what"], "second")

    def test_a_request_with_no_what_is_a_400(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/requests", {"why": "no `what` given"})
        self.assertEqual(cm.exception.code, 400)

    def test_resolving_an_unknown_request_is_a_404(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/requests/req-does-not-exist/resolve", {})
        self.assertEqual(cm.exception.code, 404)

    def test_resolving_twice_is_a_409_not_a_silent_overwrite(self):
        self._reset_requests()
        r = post(self.base + "/api/requests", {"what": "something"})["request"]
        post(self.base + "/api/requests/%s/resolve" % r["id"], {"resolution": "first"})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/requests/%s/resolve" % r["id"], {"resolution": "second"})
        self.assertEqual(cm.exception.code, 409)

    # --- grid-cell biomes ------------------------------------------------

    def test_biomes_builds_and_caches_on_first_request(self):
        res = get(self.base + "/api/biomes")
        self.assertGreater(len(res["biomes"]), 3000)
        self.assertIn("ocean", res["taxonomy"])
        self.assertTrue(os.path.exists(self.biome_cache_path),
                        "a build on first request must actually populate the cache file")

    def test_a_second_request_serves_the_same_cache_without_rebuilding(self):
        first = get(self.base + "/api/biomes")
        # Corrupt one entry directly in the cache file on disk -- if the
        # second GET rebuilt instead of reading the cache, this edit would
        # be silently overwritten and the assertion below would never catch
        # a regression back to "always rebuilds".
        with open(self.biome_cache_path, encoding="utf-8") as fh:
            doc = json.load(fh)
        any_ref = next(iter(doc["biomes"]))
        doc["biomes"][any_ref] = "dense-urban"
        with open(self.biome_cache_path, "w", encoding="utf-8") as fh:
            json.dump(doc, fh)
        second = get(self.base + "/api/biomes")
        self.assertEqual(second["biomes"][any_ref], "dense-urban")

    def test_rebuild_overwrites_a_stale_cache(self):
        get(self.base + "/api/biomes")
        with open(self.biome_cache_path, encoding="utf-8") as fh:
            doc = json.load(fh)
        any_ref = next(iter(doc["biomes"]))
        doc["biomes"][any_ref] = "dense-urban"
        with open(self.biome_cache_path, "w", encoding="utf-8") as fh:
            json.dump(doc, fh)

        rebuilt = post(self.base + "/api/biomes/rebuild", {})
        self.assertEqual(rebuilt["cellCount"], len(rebuilt["biomes"]))
        # The hand-edited value must be gone -- a real rebuild recomputes
        # every cell from the actual data, it does not merge onto whatever
        # was there before.
        reloaded = get(self.base + "/api/biomes")
        self.assertEqual(reloaded["biomes"][any_ref], rebuilt["biomes"][any_ref])

    def test_a_hand_override_beats_automatic_measurement_end_to_end(self):
        # The full stack, not just core/biome.py's own unit test: write a
        # real override file, rebuild through the real endpoint, confirm it
        # won for a cell that automatic measurement would not have picked.
        doc = biome_mod.empty_overrides()
        doc["overrides"].append({"ref": "A1·00", "biome": "dense-urban", "note": "test"})
        biome_mod.save_overrides(doc)
        try:
            rebuilt = post(self.base + "/api/biomes/rebuild", {})
            self.assertEqual(rebuilt["biomes"]["A1·00"], "dense-urban")
        finally:
            biome_mod.save_overrides(biome_mod.empty_overrides())
            post(self.base + "/api/biomes/rebuild", {})

    # --- the Lore Library ---------------------------------------------------

    def _reset_lore_library(self):
        lore_mod.save_library(lore_mod.empty_library())
        lore_mod.save_instructions(lore_mod.empty_instructions())

    def _write_lore_doc(self, rel_path, content):
        full = os.path.join(self.tmp, rel_path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(content)

    def test_documents_lists_the_registry_with_live_status(self):
        self._reset_lore_library()
        self._write_lore_doc("lore-docs/ledger.md", "one two three four five")
        doc = lore_mod.add_document(lore_mod.load_library(),
                                    {"id": "ledger", "path": "lore-docs/ledger.md",
                                     "title": "The Ledger", "importance": 1, "category": "ledger"})
        lore_mod.save_library(doc)

        res = get(self.base + "/api/lore/documents")
        row = res["documents"][0]
        self.assertEqual(row["id"], "ledger")
        self.assertTrue(row["exists"])
        self.assertEqual(row["wordCount"], 5)
        self.assertEqual(row["pendingInstructions"], 0)

    def test_documents_flags_a_registered_file_that_no_longer_exists(self):
        self._reset_lore_library()
        doc = lore_mod.add_document(lore_mod.load_library(),
                                    {"id": "gone", "path": "lore-docs/gone.md",
                                     "title": "Gone", "importance": 3, "category": "design"})
        lore_mod.save_library(doc)
        res = get(self.base + "/api/lore/documents")
        self.assertFalse(res["documents"][0]["exists"])

    def test_reading_one_document_returns_content_and_links(self):
        self._reset_lore_library()
        self._write_lore_doc("lore-docs/a.md", "See The Rock for context.")
        self._write_lore_doc("lore-docs/rock.md", "The Rock itself.")
        doc = lore_mod.load_library()
        doc = lore_mod.add_document(doc, {"id": "a", "path": "lore-docs/a.md",
                                          "title": "Doc A", "importance": 3, "category": "design"})
        doc = lore_mod.add_document(doc, {"id": "rock", "path": "lore-docs/rock.md",
                                          "title": "The Rock", "importance": 3, "category": "bible"})
        lore_mod.save_library(doc)

        res = get(self.base + "/api/lore/document?id=a")
        self.assertEqual(res["content"], "See The Rock for context.")
        self.assertEqual(res["outboundLinks"], ["rock"])

        backlinks = get(self.base + "/api/lore/document?id=rock")
        self.assertEqual(backlinks["inboundLinks"], ["a"])

    def test_reading_an_unknown_document_is_a_404(self):
        self._reset_lore_library()
        with self.assertRaises(urllib.error.HTTPError) as cm:
            get(self.base + "/api/lore/document?id=no-such-doc")
        self.assertEqual(cm.exception.code, 404)

    def test_saving_a_document_writes_the_real_file(self):
        self._reset_lore_library()
        self._write_lore_doc("lore-docs/a.md", "old content")
        doc = lore_mod.add_document(lore_mod.load_library(),
                                    {"id": "a", "path": "lore-docs/a.md", "title": "Doc A",
                                     "importance": 3, "category": "design"})
        lore_mod.save_library(doc)

        post(self.base + "/api/lore/document", {"id": "a", "content": "new content"})
        with open(os.path.join(self.tmp, "lore-docs/a.md"), encoding="utf-8") as fh:
            self.assertEqual(fh.read(), "new content")

    def test_adding_a_document_to_the_registry(self):
        self._reset_lore_library()
        res = post(self.base + "/api/lore/documents", {
            "id": "new-doc", "path": "lore-docs/new.md", "title": "New Doc",
            "importance": 2, "category": "design"})
        self.assertEqual(len(res["library"]["documents"]), 1)

    def test_adding_a_duplicate_document_id_is_a_400(self):
        self._reset_lore_library()
        post(self.base + "/api/lore/documents", {
            "id": "dup", "path": "lore-docs/one.md", "title": "One",
            "importance": 2, "category": "design"})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/lore/documents", {
                "id": "dup", "path": "lore-docs/two.md", "title": "Two",
                "importance": 2, "category": "design"})
        self.assertEqual(cm.exception.code, 400)

    def test_raising_and_resolving_an_instruction(self):
        self._reset_lore_library()
        created = post(self.base + "/api/lore/instructions",
                       {"documentId": "ledger", "text": "Fix the typo in entry 12."})
        self.assertEqual(created["instruction"]["status"], "pending")

        pending = get(self.base + "/api/lore/instructions?status=pending")
        self.assertEqual(len(pending["instructions"]), 1)

        resolved = post(self.base + "/api/lore/instructions/%s/resolve"
                        % created["instruction"]["id"],
                        {"status": "done", "resolution": "fixed"})
        self.assertEqual(resolved["instruction"]["status"], "done")

        pending_after = get(self.base + "/api/lore/instructions?status=pending")
        self.assertEqual(pending_after["instructions"], [])

    def test_an_instruction_can_be_resolved_as_needing_clarification(self):
        self._reset_lore_library()
        created = post(self.base + "/api/lore/instructions",
                       {"documentId": "ledger", "text": "make it more dramatic"})
        resolved = post(self.base + "/api/lore/instructions/%s/resolve"
                        % created["instruction"]["id"],
                        {"status": "needs-clarification",
                         "resolution": "asked which section this means"})
        self.assertEqual(resolved["instruction"]["status"], "needs-clarification")

    def test_resolving_an_unknown_instruction_is_a_404(self):
        self._reset_lore_library()
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/lore/instructions/instr-999/resolve", {})
        self.assertEqual(cm.exception.code, 404)

    def test_an_instruction_with_no_text_is_a_400(self):
        self._reset_lore_library()
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/lore/instructions", {"documentId": "ledger", "text": ""})
        self.assertEqual(cm.exception.code, 400)

    # --- approval: retired 2026-09-18, moved to the Foundry Approvals Desk --

    def test_promotion_refuses_an_incoming_approved_status(self):
        self._seed_item(note="a house", name="Approval Test House")
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/promote", {
                "localId": "seed-1", "id": "approval-test-house",
                "status": "approved", "lore": {"summary": "x"}})
        self.assertEqual(cm.exception.code, 400)
        self.assertFalse(os.path.exists(
            os.path.join(self.locations_dir, "approval-test-house.json")),
            "a refused promotion must not still create the file")

    def test_review_mode_edit_refuses_an_incoming_approved_status(self):
        self._seed_item(note="a house", name="Edit Approval Test")
        post(self.base + "/api/promote", {
            "localId": "seed-1", "id": "edit-approval-test",
            "lore": {"summary": "first pass"}})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/location", {"id": "edit-approval-test", "status": "approved"})
        self.assertEqual(cm.exception.code, 400)
        doc = json.loads(
            open(os.path.join(self.locations_dir, "edit-approval-test.json"), encoding="utf-8").read())
        self.assertEqual(doc["authoring"]["status"], "drafted",
                         "the refused status must not have been written anyway")

    # --- approval vocabulary generalized to sound/final, 2026-09-19, #167 --

    def test_promotion_refuses_an_incoming_sound_or_final_status(self):
        """The ladder moved from needs-lore/drafted/approved to needs-lore/
        drafted/sound/final (design/approvals-desk.md §2) -- the gazetteer's
        existing guard must cover the NEW promoted values too, not just the
        retired one it happened to be written against first."""
        for status in ("sound", "final"):
            self._seed_item(note="a house", name="Grade Test House " + status)
            with self.assertRaises(urllib.error.HTTPError) as cm:
                post(self.base + "/api/promote", {
                    "localId": "seed-1", "id": "grade-test-house-" + status,
                    "status": status, "lore": {"summary": "x"}})
            self.assertEqual(cm.exception.code, 400)
            self.assertFalse(os.path.exists(
                os.path.join(self.locations_dir, "grade-test-house-" + status + ".json")),
                "a refused promotion must not still create the file")

    def test_review_mode_edit_refuses_an_incoming_sound_or_final_status(self):
        for status in ("sound", "final"):
            slug = "edit-grade-test-" + status
            self._seed_item(note="a house", name="Edit Grade Test " + status)
            post(self.base + "/api/promote", {
                "localId": "seed-1", "id": slug,
                "lore": {"summary": "first pass"}})
            with self.assertRaises(urllib.error.HTTPError) as cm:
                post(self.base + "/api/location", {"id": slug, "status": status})
            self.assertEqual(cm.exception.code, 400)
            doc = json.loads(
                open(os.path.join(self.locations_dir, slug + ".json"), encoding="utf-8").read())
            self.assertEqual(doc["authoring"]["status"], "drafted",
                             "the refused status must not have been written anyway")

    def test_the_dedicated_endpoint_is_retired_and_refuses_unconditionally(self):
        """Ingram, 2026-09-18: "We make the Approvals Desk in Foundry VTT the
        final word in what is considered approved. The gazetteer is a tool
        for drawing shapes and drafting things." This endpoint used to be the
        one path allowed to grant that seal; now nothing here may. Proves it
        actually holds -- a location that WOULD have been approvable, still
        refused, and its status untouched on disk."""
        self._seed_item(note="a house", name="Real Approval Test")
        promoted = post(self.base + "/api/promote", {
            "localId": "seed-1", "id": "real-approval-test",
            "lore": {"summary": "first pass"}})["location"]
        self.assertEqual(promoted["authoring"]["status"], "drafted")

        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/location/real-approval-test/approve", {})
        self.assertEqual(cm.exception.code, 410,
                         "410, not 404: the route existed and is gone, not merely unmatched")

        doc = json.loads(open(os.path.join(
            self.locations_dir, "real-approval-test.json"), encoding="utf-8").read())
        self.assertEqual(doc["authoring"]["status"], "drafted",
                         "a refused approve call must not still have written anything")

    def test_the_retired_endpoint_refuses_even_an_unknown_location(self):
        """No existence check survives the retirement either -- there is
        nothing left this route can legitimately do for ANY location, known
        or not, so it refuses flatly rather than distinguishing the two."""
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/location/no-such-place/approve", {})
        self.assertEqual(cm.exception.code, 410)

    def test_review_mode_can_rewrite_lore_without_touching_geometry(self):
        """The review mode's save path. It edits what was WRITTEN and must
        never be able to edit what was DRAWN -- geometry, derived and
        provenance come from the map and stay that way, or the file quietly
        stops agreeing with the shape it came from."""
        self._seed_item(note="a rough note", name="Editable Place")
        promoted = post(self.base + "/api/promote", {
            "localId": "seed-1", "id": "review-edit-test", "status": "drafted",
            "lore": {"summary": "first pass"}})["location"]

        res = post(self.base + "/api/location", {
            "id": "review-edit-test", "rank": 2,
            "lore": {"summary": "second pass", "playerFacing": "seen", "gmOnly": "hidden"},
            "scene": {"hooks": ["a hook"], "activities": ["a", "b"]},
        })
        doc = res["location"]
        self.assertEqual(doc["lore"]["summary"], "second pass")
        self.assertEqual(doc["rank"], 2)
        self.assertEqual(doc["scene"]["hooks"], ["a hook"])
        self.assertEqual(doc["geometry"], promoted["geometry"],
                         "geometry is drawn, never edited as text")
        self.assertEqual(doc["derived"], promoted["derived"],
                         "derived is computed, never edited as text")

    def test_review_mode_cannot_create_a_location_by_typo(self):
        """Promotion is still the only thing that creates one. An id that is
        not already on disk is an error, not a new half-built file."""
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/location", {"id": "no-such-location-here",
                                               "lore": {"summary": "x"}})
        self.assertEqual(cm.exception.code, 404)

    def test_clip_to_shore_trims_a_district_to_the_real_coastline(self):
        """Ingram, 2026-09-12: "increase the resolution of these district
        borders and the ocean borders." A shape drawn out into open water
        comes back smaller, clipped against landmask.py's own reading of the
        painted map -- never OSM, which knows about an airport and an island
        this map does not have."""
        # Drawn to overshoot the real painted shore on its western edge --
        # computed against the actual landmask (see the module docstring for
        # why this can't be a blind guess at real coordinates), clear of the
        # two small offshore specks so the clip stays a single piece.
        self._seed_item(tier="region",
                        ring=[[-500, 3000], [2500, 3000], [2500, 6000], [-500, 6000]],
                        name="Western Overshoot", note="deliberately runs into the sea")
        res = post(self.base + "/api/clip-to-shore", {"localId": "seed-1"})
        self.assertIn("ringPx", res)
        self.assertGreater(len(res["ringPx"]), 2)
        self.assertLess(res["areaChangePx2"], 0, "clipping to shore should only ever shrink")

    def test_clip_to_shore_on_an_unknown_item_is_a_404(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            post(self.base + "/api/clip-to-shore", {"localId": "no-such-item"})
        self.assertEqual(cm.exception.code, 404)

    def test_promotion_names_an_unnamed_item_but_never_renames_a_named_one(self):
        self._seed_item(note="no name yet")
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "naming-test", "name": "Central Fortification"})
        item = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                    if i["localId"] == "seed-1")
        self.assertEqual(item["name"], "Central Fortification")

        self._seed_item(note="has one", name="Ingram's Own Name")
        post(self.base + "/api/promote",
            {"localId": "seed-1", "id": "naming-test-2", "name": "Something Else"})
        item2 = next(i for i in get(self.base + "/api/session")["draft"]["items"]
                     if i["localId"] == "seed-1")
        self.assertEqual(item2["name"], "Ingram's Own Name",
                         "a name typed in the tool is the person's own and wins")

    def test_a_handoff_for_a_promoted_item_reports_the_location_not_the_stub(self):
        self._seed_item(note="a rough note", name="Written Place")
        post(self.base + "/api/promote", {
            "localId": "seed-1", "id": "handoff-test", "status": "drafted",
            "lore": {"summary": "The written summary.", "playerFacing": "seen",
                     "gmOnly": "hidden"},
        })
        doc = post(self.base + "/api/handoff", {"localIds": ["seed-1"]})["markdown"]
        self.assertIn("Promoted", doc)
        self.assertIn("data/locations/handoff-test.json", doc)
        self.assertIn("The written summary.", doc)
        self.assertIn("a rough note", doc)

    def test_api_locations_carries_enough_for_the_inspector_to_show_written_lore(self):
        """The browser has no other way to learn a draft item was promoted --
        this response IS the link. Found missing live: the handoff document
        read the promoted entity correctly, but the actual Gazetteer UI
        (click a building, see what's written) still only ever showed the
        draft's own note, because nothing client-side had a way to fetch or
        recognise the promoted lore at all."""
        self._seed_item(note="a rough note", name="Written Place")
        post(self.base + "/api/promote", {
            "localId": "seed-1", "id": "locations-api-test", "status": "drafted",
            "classification": "top-secret",
            "lore": {"summary": "The written summary.", "playerFacing": "seen", "gmOnly": "hidden"},
            "scene": {"hooks": ["a hook"], "activities": ["a", "b", "c"]},
            "npcRefs": ["commander", "caretaker"],
        })
        found = next(loc for loc in get(self.base + "/api/locations")["locations"]
                    if loc["id"] == "locations-api-test")
        self.assertEqual(found["sourceLocalId"], "seed-1")
        self.assertEqual(found["lore"]["summary"], "The written summary.")
        self.assertEqual(found["scene"]["hooks"], ["a hook"])
        self.assertEqual(found["npcRefs"], ["commander", "caretaker"])
        self.assertEqual(found["classification"], "top-secret")
        self.assertEqual(found["authoringNote"], "a rough note")
        self.assertEqual(found["depth"], "named")

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

    def _promote_region(self, local_id, location_id, ring, name="", note="a test region"):
        post(self.base + "/api/session", {"items": [{
            "localId": local_id, "tier": "region", "name": name, "kind": "",
            "note": note, "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon", "ringPx": ring}, "derived": {},
        }]})
        post(self.base + "/api/promote", {"localId": local_id, "id": location_id})

    def test_reconcile_trims_a_promoted_region_and_resyncs_its_file(self):
        """Ingram, 2026-09-13: "build a protocol for doing this again and
        again." End-to-end through the real HTTP surface: an old, already-
        promoted region gets a precise new region drawn into its corner,
        and one POST is enough to both trim the draft copy and rewrite the
        promoted file to match -- not just one or the other."""
        self._seed_item()  # resets the undo stack and draft to something known
        self._promote_region("old-1", "reconcile-old-district",
                             [[2000, 2000], [3000, 2000], [3000, 3000], [2000, 3000]],
                             name="Old District")
        current = get(self.base + "/api/session")["draft"]["items"]
        old = next(it for it in current if it["localId"] == "old-1")
        new_corner = {
            "localId": "old-2", "tier": "region", "name": "New Precise Corner",
            "kind": "", "note": "carved precisely", "tags": [], "source": "drawn",
            "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[2800, 2000], [3000, 2000], [3000, 2200], [2800, 2200]]},
            "derived": {},
        }
        post(self.base + "/api/session", {"items": [old, new_corner]})

        result = post(self.base + "/api/regions/reconcile", {})
        self.assertTrue(result["changed"])
        self.assertIn("old-1", result["report"]["trimmed"])
        self.assertIn("reconcile-old-district", result["syncedLocations"])

        after = get(self.base + "/api/session")["draft"]["items"]
        trimmed = next(it for it in after if it["localId"] == "old-1")
        untouched = next(it for it in after if it["localId"] == "old-2")
        self.assertEqual(untouched["geometry"]["ringPx"], new_corner["geometry"]["ringPx"],
                         "the smaller, more specific region must not be rewritten")

        from shapely.geometry import Polygon
        self.assertLess(Polygon(trimmed["geometry"]["ringPx"]).area, 1000 * 1000,
                        "the bigger region's draft copy must actually shrink")

        with open(os.path.join(self.locations_dir, "reconcile-old-district.json"),
                 encoding="utf-8") as fh:
            promoted = json.load(fh)
        self.assertLess(promoted["derived"]["areaM2"], 1000 * 1000,
                        "the PROMOTED file, not just the draft, must be resynced")

    def test_reconcile_with_nothing_overlapping_changes_nothing(self):
        self._seed_item()
        self._promote_region("clean-1", "reconcile-clean-district",
                             [[5000, 5000], [5500, 5000], [5500, 5500], [5000, 5500]])
        result = post(self.base + "/api/regions/reconcile", {})
        self.assertFalse(result["changed"])
        self.assertEqual(result["syncedLocations"], [])

    def test_a_reconcile_can_be_undone_like_any_other_edit(self):
        self._seed_item()
        self._promote_region("undo-old-1", "reconcile-undo-district",
                             [[7000, 7000], [8000, 7000], [8000, 8000], [7000, 8000]])
        current = get(self.base + "/api/session")["draft"]["items"]
        old = next(it for it in current if it["localId"] == "undo-old-1")
        new_corner = {
            "localId": "undo-old-2", "tier": "region", "name": "", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[7800, 7000], [8000, 7000], [8000, 7200], [7800, 7200]]},
            "derived": {},
        }
        post(self.base + "/api/session", {"items": [old, new_corner]})
        original_ring = old["geometry"]["ringPx"]

        post(self.base + "/api/regions/reconcile", {})
        shrunk = next(it for it in get(self.base + "/api/session")["draft"]["items"]
                     if it["localId"] == "undo-old-1")
        self.assertNotEqual(shrunk["geometry"]["ringPx"], original_ring)

        post(self.base + "/api/undo", {})
        restored = next(it for it in get(self.base + "/api/session")["draft"]["items"]
                        if it["localId"] == "undo-old-1")
        self.assertEqual(restored["geometry"]["ringPx"], original_ring,
                         "undo must restore the pre-reconcile shape, not just log that it ran")

    def test_an_ordinary_save_resyncs_a_hand_edited_promoted_regions_file(self):
        """Ingram, after finding the vertex handles a LOCKED region didn't
        have: dragging a promoted region's border by hand has to actually
        reach data/locations/, not just the draft -- reconcile.py's own
        auto-fix already gets this; a plain save (a hand-dragged vertex)
        must get it too, or the promoted file quietly goes stale the
        moment someone edits a border without running reconcile."""
        self._seed_item()
        self._promote_region("hand-edit-old-1", "reconcile-hand-edit-district",
                             [[6000, 6000], [6500, 6000], [6500, 6500], [6000, 6500]])
        current = get(self.base + "/api/session")["draft"]["items"]
        item = next(it for it in current if it["localId"] == "hand-edit-old-1")
        # The exact gesture a hand-dragged vertex produces: the SAME item,
        # SAME locationRef, one corner moved.
        item["geometry"]["ringPx"] = [[6000, 6000], [6600, 6000], [6500, 6500], [6000, 6500]]

        result = post(self.base + "/api/session", {"items": [item]})
        self.assertEqual(result["resyncedLocations"], ["reconcile-hand-edit-district"])

        with open(os.path.join(self.locations_dir, "reconcile-hand-edit-district.json"),
                 encoding="utf-8") as fh:
            promoted = json.load(fh)
        self.assertEqual(len(promoted["derived"]["imagePx"][0]), 4)
        from shapely.geometry import Polygon
        self.assertAlmostEqual(
            Polygon(promoted["derived"]["imagePx"][0]).area,
            Polygon(item["geometry"]["ringPx"]).area, delta=0.5,
            msg="the promoted file's own geometry must match the hand-edited draft, not the old shape")

    def test_a_save_that_does_not_touch_region_geometry_resyncs_nothing(self):
        """The common case -- editing a site's note, say -- must not pay for
        or trigger a region-file rewrite it has nothing to do with."""
        self._seed_item()
        self._promote_region("no-touch-old-1", "reconcile-no-touch-district",
                             [[6000, 6000], [6500, 6000], [6500, 6500], [6000, 6500]])
        current = get(self.base + "/api/session")["draft"]["items"]
        item = next(it for it in current if it["localId"] == "no-touch-old-1")

        result = post(self.base + "/api/session", {"items": [item]})
        self.assertEqual(result["resyncedLocations"], [])

    def test_merge_regions_end_to_end_through_the_real_http_surface(self):
        """Ingram, 2026-09-13: "shift clicking on both regions and using a
        'merge' button makes the most sense." """
        self._seed_item()
        post(self.base + "/api/session", {"items": [{
            "localId": "merge-a", "tier": "region", "name": "District A", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[1000, 1000], [1100, 1000], [1100, 1100], [1000, 1100]]},
            "derived": {},
        }, {
            "localId": "merge-b", "tier": "region", "name": "District B", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[1100, 1000], [1200, 1000], [1200, 1100], [1100, 1100]]},
            "derived": {},
        }]})

        result = post(self.base + "/api/regions/merge", {"localIds": ["merge-a", "merge-b"]})
        self.assertEqual(result["survivorLocalId"], "merge-a")

        after = get(self.base + "/api/session")["draft"]["items"]
        self.assertIsNone(next((it for it in after if it["localId"] == "merge-b"), None),
                          "the non-surviving region must be gone from the draft")
        survivor = next(it for it in after if it["localId"] == "merge-a")
        from shapely.geometry import Polygon
        self.assertAlmostEqual(Polygon(survivor["geometry"]["ringPx"]).area, 100 * 200, delta=0.5)

    def test_merge_regions_refuses_and_reports_409_when_they_do_not_touch(self):
        self._seed_item()
        post(self.base + "/api/session", {"items": [{
            "localId": "far-a", "tier": "region", "name": "", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[100, 100], [200, 100], [200, 200], [100, 200]]},
            "derived": {},
        }, {
            "localId": "far-b", "tier": "region", "name": "", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[9000, 9000], [9100, 9000], [9100, 9100], [9000, 9100]]},
            "derived": {},
        }]})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            post(self.base + "/api/regions/merge", {"localIds": ["far-a", "far-b"]})
        self.assertEqual(ctx.exception.code, 409)

    def test_bisect_region_end_to_end_through_the_real_http_surface(self):
        """Ingram, 2026-09-13: "draw a line from one point on an existing
        line... to split an existing region into two." """
        self._seed_item()
        post(self.base + "/api/session", {"items": [{
            "localId": "bisect-a", "tier": "region", "name": "Whole District", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[2000, 2000], [2100, 2000], [2100, 2100], [2000, 2100]]},
            "derived": {},
        }]})

        result = post(self.base + "/api/regions/bisect",
                      {"localId": "bisect-a", "cutPoints": [[2050, 2000], [2050, 2100]]})
        self.assertEqual(result["survivorLocalId"], "bisect-a")
        new_id = result["newLocalId"]
        self.assertNotEqual(new_id, "bisect-a")

        after = get(self.base + "/api/session")["draft"]["items"]
        by_id = {it["localId"]: it for it in after}
        self.assertIn(new_id, by_id)
        self.assertEqual(by_id["bisect-a"]["name"], "Whole District",
                         "the surviving half keeps the original name")
        self.assertEqual(by_id[new_id]["name"], "", "the new half is a blank draft")

        from shapely.geometry import Polygon
        total = (Polygon(by_id["bisect-a"]["geometry"]["ringPx"]).area
                + Polygon(by_id[new_id]["geometry"]["ringPx"]).area)
        self.assertAlmostEqual(total, 100 * 100, delta=0.5)

    def test_bisect_region_refuses_and_reports_409_for_a_line_that_misses(self):
        self._seed_item()
        post(self.base + "/api/session", {"items": [{
            "localId": "bisect-miss", "tier": "region", "name": "", "kind": "",
            "note": "", "tags": [], "source": "drawn", "sourceFeatureIds": [],
            "geometry": {"kind": "polygon",
                        "ringPx": [[3000, 3000], [3100, 3000], [3100, 3100], [3000, 3100]]},
            "derived": {},
        }]})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            post(self.base + "/api/regions/bisect",
                {"localId": "bisect-miss", "cutPoints": [[9000, 9000], [9100, 9100]]})
        self.assertEqual(ctx.exception.code, 409)

    def test_client_log_appends_one_json_line_per_entry(self):
        if os.path.exists(gz.CLIENT_LOG_PATH):
            os.remove(gz.CLIENT_LOG_PATH)
        result = post(self.base + "/api/client-log", {"entries": [
            {"type": "tool_change", "tool": "region", "t": 1},
            {"type": "vertex_dragend", "itemId": "item-1", "snapped": None, "t": 2},
        ]})
        self.assertEqual(result, {"ok": True, "written": 2})
        with open(gz.CLIENT_LOG_PATH, encoding="utf-8") as fh:
            lines = [json.loads(line) for line in fh if line.strip()]
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0]["type"], "tool_change")
        self.assertEqual(lines[1]["type"], "vertex_dragend")
        # A server-received timestamp is attached to every entry, distinct
        # from whatever client timestamp it arrived carrying -- the whole
        # point being able to see clock skew and request queuing later.
        self.assertIn("receivedAt", lines[0])

    def test_client_log_keeps_writing_past_one_malformed_entry(self):
        if os.path.exists(gz.CLIENT_LOG_PATH):
            os.remove(gz.CLIENT_LOG_PATH)
        result = post(self.base + "/api/client-log", {"entries": [
            {"type": "ok_one"}, "not-a-dict-entry", {"type": "ok_two"},
        ]})
        self.assertEqual(result["written"], 3)
        with open(gz.CLIENT_LOG_PATH, encoding="utf-8") as fh:
            lines = [json.loads(line) for line in fh if line.strip()]
        self.assertEqual([l.get("type") for l in lines], ["ok_one", None, "ok_two"])

    def test_client_log_without_entries_is_a_400_not_a_silent_no_op(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            post(self.base + "/api/client-log", {"nope": True})
        self.assertEqual(ctx.exception.code, 400)

    def test_client_log_trims_to_the_line_budget_once_it_grows_past_it(self):
        if os.path.exists(gz.CLIENT_LOG_PATH):
            os.remove(gz.CLIENT_LOG_PATH)
        old_budget = gz.CLIENT_LOG_MAX_LINES
        gz.CLIENT_LOG_MAX_LINES = 10
        padding = "x" * 250  # each entry comfortably past the ~300B/line trim estimate
        try:
            for batch in range(3):
                post(self.base + "/api/client-log", {"entries": [
                    {"type": "e", "n": batch * 10 + i, "pad": padding} for i in range(10)
                ]})
            with open(gz.CLIENT_LOG_PATH, encoding="utf-8") as fh:
                lines = [json.loads(line) for line in fh if line.strip()]
            # Trimmed to the budget, and kept the MOST RECENT activity, not
            # the oldest -- entries 0-19 are gone, 20-29 survive.
            self.assertEqual(len(lines), 10)
            self.assertEqual([l["n"] for l in lines], list(range(20, 30)))
        finally:
            gz.CLIENT_LOG_MAX_LINES = old_budget


if __name__ == "__main__":
    unittest.main()
