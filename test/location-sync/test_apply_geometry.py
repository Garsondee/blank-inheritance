"""tools/location-sync/apply_geometry.py -- design/location-editor.md §5, §9.

Real georef math against the real campaign-map manifest and frame (both
small, tracked files -- no GeoPackage or master PNG needed for any of this),
proving the whole Foundry-scene-px -> image-px -> lon/lat -> a real location
document bridge produces sane, internally-consistent output. The
scene-px -> image-px half (toImagePoint, already tested live in
Foundry/JS) is out of scope here; these inputs are already in image-px,
exactly as apply_geometry.py always receives them from tools/location-sync's
Node half.
"""

import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_LOCATION_SYNC = os.path.join(_HERE, "..", "..", "tools", "location-sync")
if _LOCATION_SYNC not in sys.path:
    sys.path.insert(0, _LOCATION_SYNC)

import apply_geometry  # noqa: E402


def _georef():
    return apply_geometry.georef_mod.MapGeoref.load()


class ItemFromGeometryTests(unittest.TestCase):
    def test_polygon_rings_become_a_ringPx_holesPx_item(self):
        geometry = {"rings": [[[0, 0], [10, 0], [10, 10]], [[4, 4], [6, 4], [6, 6]]], "point": None}
        item = apply_geometry._item_from_geometry(geometry, "region", {})
        self.assertEqual(item["geometry"]["kind"], "polygon")
        self.assertEqual(item["geometry"]["ringPx"], [[0, 0], [10, 0], [10, 10]])
        self.assertEqual(item["geometry"]["holesPx"], [[[4, 4], [6, 4], [6, 6]]])

    def test_a_point_becomes_a_pointPx_item(self):
        geometry = {"rings": [], "point": [100, 200]}
        item = apply_geometry._item_from_geometry(geometry, "point", {})
        self.assertEqual(item["geometry"], {"kind": "point", "pointPx": [100, 200]})

    def test_no_rings_and_not_point_tier_is_an_error_not_a_silent_empty_shape(self):
        with self.assertRaises(ValueError):
            apply_geometry._item_from_geometry({"rings": [], "point": None}, "site", {})


class ApplyCreateTests(unittest.TestCase):
    def test_a_new_site_gets_real_lon_lat_geometry_a_centroid_and_a_grid_ref(self):
        georef = _georef()
        payload = {
            "tier": "site", "locationId": "test-apply-geometry-smoke-site", "draftId": "draft-1",
            "geometry": {"rings": [[[6300, 6300], [6350, 6300], [6350, 6350], [6300, 6350]]], "point": None},
            "fields": {
                "name": "Smoke Test Shed", "kind": "civic", "tags": ["test-fixture"],
                "rank": None, "classification": None, "depth": "named",
                "lore": {"summary": "A shed for testing.", "playerFacing": "", "gmOnly": ""},
                "scene": {"hooks": [], "activities": []}, "note": "smoke test",
            },
        }
        doc = apply_geometry._apply_create(payload, georef)
        self.assertEqual(doc["id"], "test-apply-geometry-smoke-site")
        self.assertEqual(doc["tier"], "site")
        self.assertEqual(doc["name"], "Smoke Test Shed")
        self.assertEqual(doc["authoring"]["status"], "drafted", "lore.summary was supplied, so this must not be needs-lore")
        # A 50x50 image-px square at this map's 1 m/px is 2500 m^2 -- proves
        # the georef pipeline actually ran, not a stub.
        self.assertAlmostEqual(doc["derived"]["areaM2"], 2500.0, places=1)
        self.assertAlmostEqual(doc["derived"]["centroidPx"][0], 6325.0, places=1)
        self.assertAlmostEqual(doc["derived"]["centroidPx"][1], 6325.0, places=1)
        self.assertEqual(len(doc["geometry"]["rings"]), 1)
        self.assertEqual(len(doc["geometry"]["rings"][0]), 4, "the shell keeps its 4 points")
        # Real lon/lat, not the raw pixel numbers copied through.
        lon, lat = doc["geometry"]["rings"][0][0]
        self.assertTrue(130 < lon < 140, "should be a real Kobe-area longitude")
        self.assertTrue(30 < lat < 40, "should be a real Kobe-area latitude")

    def test_a_new_point_gets_no_rings_and_a_real_lon_lat_point(self):
        georef = _georef()
        payload = {
            "tier": "point", "locationId": "test-apply-geometry-smoke-point", "draftId": "draft-2",
            "geometry": {"rings": [], "point": [6400, 6400]},
            "fields": {
                "name": "Smoke Test Pin", "kind": "", "tags": [], "rank": None, "classification": None,
                "depth": "named", "lore": {"summary": "", "playerFacing": "", "gmOnly": ""},
                "scene": {"hooks": [], "activities": []}, "note": "smoke test",
            },
        }
        doc = apply_geometry._apply_create(payload, georef)
        self.assertEqual(doc["geometry"]["rings"], [])
        self.assertIsNotNone(doc["geometry"]["point"])
        self.assertEqual(doc["authoring"]["status"], "needs-lore", "no lore.summary was supplied")
        self.assertIsNone(doc["derived"]["areaM2"])

    def test_no_lore_summary_promotes_as_needs_lore_not_drafted(self):
        georef = _georef()
        payload = {
            "tier": "site", "locationId": "test-apply-geometry-smoke-needslore", "draftId": "draft-3",
            "geometry": {"rings": [[[6300, 6300], [6320, 6300], [6320, 6320]]], "point": None},
            "fields": {
                "name": None, "kind": "", "tags": [], "rank": None, "classification": None, "depth": "named",
                "lore": {"summary": "", "playerFacing": "", "gmOnly": ""},
                "scene": {"hooks": [], "activities": []}, "note": "just a note, no lore yet",
            },
        }
        doc = apply_geometry._apply_create(payload, georef)
        self.assertEqual(doc["authoring"]["status"], "needs-lore")
        self.assertEqual(doc["authoring"]["note"], "just a note, no lore yet")


class ApplyGeometryResyncTests(unittest.TestCase):
    def _existing_region_doc(self):
        return {
            "$schema": "../schema/location.schema.json", "id": "test-apply-geometry-smoke-region",
            "type": "location", "tier": "region", "name": "Smoke Test District", "nameJa": None,
            "namingPlaceholderRef": None, "kind": "district", "tags": [], "classification": None,
            "rank": None, "depth": "named",
            "geometry": {"rings": [[[135.2, 34.6], [135.21, 34.6], [135.21, 34.61], [135.2, 34.61]]], "point": None},
            "pinAnchor": None,
            "derived": {
                "imagePx": [[[1, 1], [2, 1], [2, 2], [1, 2]]], "centroidPx": [1.5, 1.5],
                "cells": ["A0·00"], "ref": "A0·00", "areaM2": 1.0,
                "withinRegionRef": None, "containsRefs": [], "neighbourRefs": [],
                "sourceSession": None, "sourceLocalId": None, "promotedDate": "2026-01-01",
            },
            "authoring": {"note": "district", "status": "drafted"},
            "lore": {"summary": "old lore that must survive untouched", "playerFacing": "", "gmOnly": ""},
            "scene": {"hooks": [], "activities": [], "history": "", "consequences": ""},
            "realWorld": {}, "factionRefs": [], "npcRefs": [], "episodeRefs": [],
            "openQuestionRefs": [], "bibleRef": None, "assetRefs": [], "playlistRefs": [],
        }

    def test_resync_replaces_geometry_and_derived_but_leaves_lore_and_name_alone(self):
        georef = _georef()
        payload = {
            "tier": "region", "locationId": "test-apply-geometry-smoke-region",
            "geometry": {"rings": [[[6300, 6300], [6500, 6300], [6500, 6500], [6300, 6500]]], "point": None},
            "existingDoc": self._existing_region_doc(),
        }
        doc = apply_geometry._apply_geometry(payload, georef)
        self.assertAlmostEqual(doc["derived"]["centroidPx"][0], 6400.0, places=1)
        self.assertAlmostEqual(doc["derived"]["centroidPx"][1], 6400.0, places=1)
        self.assertAlmostEqual(doc["derived"]["areaM2"], 40000.0, places=1, msg="200x200 image-px at 1 m/px")
        self.assertEqual(doc["lore"]["summary"], "old lore that must survive untouched")
        self.assertEqual(doc["name"], "Smoke Test District")
        self.assertEqual(doc["authoring"]["status"], "drafted", "resync must never touch authoring.status")

    def test_resync_refuses_a_non_region_tier(self):
        georef = _georef()
        payload = {
            "tier": "site", "locationId": "test-apply-geometry-smoke-region",
            "geometry": {"rings": [[[0, 0], [1, 0], [1, 1]]], "point": None},
            "existingDoc": self._existing_region_doc(),
        }
        with self.assertRaises(Exception):
            apply_geometry._apply_geometry(payload, georef)


class ApplySplitTests(unittest.TestCase):
    """design doc §10 phase 2c -- the Bisect tool's Python half."""

    def _square_region_doc(self, region_id="test-apply-geometry-smoke-region"):
        return {
            "$schema": "../schema/location.schema.json", "id": region_id,
            "type": "location", "tier": "region", "name": "Smoke Test District", "nameJa": None,
            "namingPlaceholderRef": None, "kind": "district", "tags": ["test-fixture"], "classification": None,
            "rank": None, "depth": "named",
            "geometry": {"rings": [[[135.2, 34.6], [135.21, 34.6], [135.21, 34.61], [135.2, 34.61]]], "point": None},
            "pinAnchor": None,
            "derived": {
                "imagePx": [[[6300, 6300], [6500, 6300], [6500, 6500], [6300, 6500]]], "centroidPx": [6400, 6400],
                "cells": ["A0·00"], "ref": "A0·00", "areaM2": 40000.0,
                "withinRegionRef": None, "containsRefs": [], "neighbourRefs": [],
                "sourceSession": None, "sourceLocalId": None, "promotedDate": "2026-01-01",
            },
            "authoring": {"note": "district", "status": "drafted"},
            "lore": {"summary": "old lore that must survive on the surviving half", "playerFacing": "", "gmOnly": ""},
            "scene": {"hooks": ["a hook"], "activities": [], "history": "", "consequences": ""},
            "realWorld": {}, "factionRefs": ["some-faction"], "npcRefs": [], "episodeRefs": [],
            "openQuestionRefs": [], "bibleRef": None, "assetRefs": [], "playlistRefs": [],
        }

    def test_a_straight_cut_down_the_middle_produces_two_equal_halves(self):
        georef = _georef()
        doc = self._square_region_doc()
        # The cut reads derived.imagePx (a real promoted document's OWN
        # already-derived image-px shape, seeded directly in the fixture
        # above) -- never geometry.rings, which is lon/lat, the canonical
        # space per design/map-generation.md, not the space a drawn cut line
        # or a shapely intersection ever operates in.

        payload = {
            "tier": "region", "locationId": doc["id"], "newLocationId": doc["id"] + "-2",
            "geometry": {"cutPointsImagePx": [[6400, 6250], [6400, 6550]]},
            "existingDoc": doc,
        }
        result = apply_geometry._apply_split(payload, georef)
        survivor, new_doc = result["survivor"], result["new"]

        # Two equal 100x200 image-px halves -- 20000 m^2 each at 1 m/px --
        # and the LARGER-or-equal one keeps the original id/identity per
        # bisect_region's own "ties go to whichever the loop happened to
        # keep first" rule; equal areas here just means both must be ~20000.
        self.assertAlmostEqual(survivor["derived"]["areaM2"], 20000.0, delta=50)
        self.assertAlmostEqual(new_doc["derived"]["areaM2"], 20000.0, delta=50)
        self.assertEqual(survivor["id"], doc["id"], "the survivor keeps the original document's own id")
        self.assertEqual(new_doc["id"], doc["id"] + "-2")

        # The survivor is the SAME document -- only geometry/derived move.
        self.assertEqual(survivor["name"], "Smoke Test District")
        self.assertEqual(survivor["lore"]["summary"], "old lore that must survive on the surviving half")
        self.assertEqual(survivor["scene"]["hooks"], ["a hook"])
        self.assertEqual(survivor["factionRefs"], ["some-faction"])
        self.assertEqual(survivor["authoring"]["status"], "drafted", "a resync must never touch authoring.status")

        # The new piece is a real, freshly-BUILT document -- not a copy of
        # the original's lore (reconcile.py#bisect_region's own explicit
        # rule: "never a copy of the original's lore, which almost never
        # describes both halves once the cut is real").
        self.assertIsNone(new_doc["name"])
        self.assertEqual(new_doc["lore"]["summary"], "")
        self.assertEqual(new_doc["authoring"]["status"], "needs-lore")
        self.assertIn(doc["id"], new_doc["authoring"]["note"])
        self.assertEqual(new_doc["kind"], "district", "carried from the region being split")

    def test_a_line_that_never_crosses_the_region_is_refused_not_silently_ignored(self):
        georef = _georef()
        doc = self._square_region_doc()
        payload = {
            "tier": "region", "locationId": doc["id"], "newLocationId": doc["id"] + "-2",
            "geometry": {"cutPointsImagePx": [[7000, 7000], [7100, 7100]]},
            "existingDoc": doc,
        }
        with self.assertRaises(ValueError):
            apply_geometry._apply_split(payload, georef)

    def test_split_refuses_a_non_region_tier(self):
        georef = _georef()
        payload = {
            "tier": "site", "locationId": "test-apply-geometry-smoke-region", "newLocationId": "test-apply-geometry-smoke-region-2",
            "geometry": {"cutPointsImagePx": [[6400, 6250], [6400, 6550]]},
            "existingDoc": self._square_region_doc(),
        }
        with self.assertRaises(ValueError):
            apply_geometry._apply_split(payload, georef)

    def test_split_refuses_fewer_than_two_cut_points(self):
        georef = _georef()
        doc = self._square_region_doc()
        payload = {
            "tier": "region", "locationId": doc["id"], "newLocationId": doc["id"] + "-2",
            "geometry": {"cutPointsImagePx": [[6400, 6400]]},
            "existingDoc": doc,
        }
        with self.assertRaises(ValueError):
            apply_geometry._apply_split(payload, georef)


if __name__ == "__main__":
    unittest.main()
