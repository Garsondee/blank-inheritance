"""A drawing session's shape, validation and derived fields.

Two claims matter most here, and both are about not losing work.

**The note is never rewritten.** The rough note is the brief for the lore that
gets written later, and a brief a tool quietly edits is no longer a brief. Any
future feature that wants to "tidy" or "enrich" a note has to fail this suite
first.

**Derived fields are recomputed, never trusted.** A vertex dragged one pixel
can move a shape into another cell. A stale cell list is worse than no cell
list, because it looks authoritative.

The rest is refusing shapes that cannot exist -- a two-point polygon, a pin
with an outline, a tier nobody defined -- at the moment they are drawn rather
than at some later promotion step, when whoever drew them has long moved on.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import session  # noqa: E402
from core.georef import MapGeoref  # noqa: E402

SQUARE = [[4400, 6400], [4800, 6400], [4800, 6800], [4400, 6800]]


def poly(ring=None):
    return {"kind": "polygon", "ringPx": ring or [list(p) for p in SQUARE]}


def point(x=4500, y=6500):
    return {"kind": "point", "pointPx": [x, y]}


class TestItemConstruction(unittest.TestCase):
    def test_a_drawn_region_is_accepted(self):
        item = session.make_item("item-1", "region", poly(), note="the old town")
        self.assertEqual(item["tier"], "region")
        self.assertEqual(item["note"], "the old town")
        self.assertEqual(item["source"], "drawn")

    def test_an_adopted_site_records_where_its_footprint_came_from(self):
        """Provenance is the difference between a shape someone drew and a real
        building's actual outline. It decides whether a later correction to the
        ground truth is worth propagating."""
        item = session.make_item("item-2", "site", poly(), source="adopted",
                                 source_feature_ids=["abc123"])
        self.assertEqual(item["source"], "adopted")
        self.assertEqual(item["sourceFeatureIds"], ["abc123"])

    def test_a_polygon_needs_three_points(self):
        with self.assertRaises(ValueError):
            session.make_item("x", "site", poly([[0, 0], [1, 1]]))

    def test_a_pin_must_be_a_point_and_a_point_must_be_a_pin(self):
        """The two halves of one rule. A pin with an outline would claim an area
        it does not have; a region with no outline could not contain anything."""
        with self.assertRaises(ValueError):
            session.make_item("x", "point", poly())
        with self.assertRaises(ValueError):
            session.make_item("x", "region", point())

    def test_unknown_tiers_and_sources_are_refused(self):
        with self.assertRaises(ValueError):
            session.make_item("x", "neighbourhood", poly())
        with self.assertRaises(ValueError):
            session.make_item("x", "site", poly(), source="imported")

    def test_geometry_must_declare_a_kind_it_actually_has(self):
        with self.assertRaises(ValueError):
            session.make_item("x", "site", {"kind": "circle", "r": 3})
        with self.assertRaises(ValueError):
            session.make_item("x", "point", {"kind": "point"})


class TestDerive(unittest.TestCase):
    def test_a_polygon_derives_its_cells_area_and_centroid(self):
        item = session.derive_item(session.make_item("a", "site", poly()))
        d = item["derived"]
        self.assertEqual(d["refs"], ["C4·11", "C4·21", "C4·12", "C4·22"])
        self.assertEqual(d["ref"], "C4·11")
        self.assertEqual(d["centroidPx"], [4600.0, 6600.0])
        self.assertEqual(d["areaPx2"], 160000.0)
        self.assertEqual(d["vertexCount"], 4)

    def test_a_pin_derives_the_one_cell_it_sits_in(self):
        item = session.derive_item(session.make_item("a", "point", point(4573, 6580)))
        self.assertEqual(item["derived"]["refs"], ["C4·11"])

    def test_derivation_is_recomputed_not_accumulated(self):
        """Move the shape and the old cells must be gone, not added to."""
        item = session.make_item("a", "site", poly())
        session.derive_item(item)
        first = item["derived"]["refs"]
        item["geometry"]["ringPx"] = [[600, 600], [900, 600], [900, 900], [600, 900]]
        session.derive_item(item)
        self.assertNotEqual(item["derived"]["refs"], first)
        self.assertEqual(item["derived"]["refs"],
                         ["A1·22", "A1·32", "A1·23", "A1·33"])

    def test_with_a_georeference_it_also_attaches_canonical_lon_lat(self):
        """Pixels are this map version's coordinates; lon/lat survives a
        re-export. design/map-generation.md says that rule was burned once
        already, so the canonical form is attached at save, not on promotion."""
        georef = MapGeoref.load()
        item = session.derive_item(session.make_item("a", "site", poly()), georef)
        ring = item["geometry"]["ring"]
        self.assertEqual(len(ring), 4)
        for lon, lat in ring:
            self.assertTrue(135.0 < lon < 135.4, lon)
            self.assertTrue(34.5 < lat < 34.9, lat)
        # 1 m/px, so a 400x400 px square is 160,000 square metres.
        self.assertAlmostEqual(item["derived"]["areaM2"], 160000.0, delta=1.0)
        self.assertEqual(len(item["derived"]["centroidLonLat"]), 2)

    def test_lon_lat_round_trips_back_to_the_pixels_that_were_drawn(self):
        georef = MapGeoref.load()
        item = session.derive_item(session.make_item("a", "site", poly()), georef)
        for (lon, lat), (x, y) in zip(item["geometry"]["ring"], SQUARE):
            bx, by = georef.lonlat_to_image_px(lon, lat)
            self.assertAlmostEqual(bx, x, delta=0.01)
            self.assertAlmostEqual(by, y, delta=0.01)


class TestTheNoteIsSacred(unittest.TestCase):
    def test_deriving_never_touches_the_note_or_the_name(self):
        item = session.make_item("a", "site", poly(),
                                 note="  rough. lower case. typos and all  ",
                                 name="whatever I typed")
        before_note, before_name = item["note"], item["name"]
        session.derive_item(item)
        session.derive_item(item)
        self.assertEqual(item["note"], before_note)
        self.assertEqual(item["name"], before_name)

    def test_a_saved_and_reloaded_note_is_byte_for_byte_the_same(self):
        d = tempfile.mkdtemp()
        try:
            draft = session.new_draft()
            note = "Line one.\n\n  indented line — with an em dash, 日本語, and \"quotes\"."
            draft["items"].append(session.make_item("a", "site", poly(), note=note))
            path = session.save(draft, session.draft_path(draft["id"], d))
            self.assertEqual(session.load(path)["items"][0]["note"], note)
        finally:
            shutil.rmtree(d, ignore_errors=True)


class TestValidate(unittest.TestCase):
    def test_a_clean_draft_has_no_problems(self):
        draft = session.new_draft()
        draft["items"] = [session.make_item("a", "site", poly()),
                          session.make_item("b", "point", point())]
        self.assertEqual(session.validate(draft), [])

    def test_duplicate_local_ids_are_reported(self):
        draft = session.new_draft()
        draft["items"] = [session.make_item("a", "site", poly()),
                          session.make_item("a", "site", poly())]
        self.assertTrue(any("duplicate" in p for p in session.validate(draft)))

    def test_validation_reports_rather_than_raises(self):
        """A drawing session must never lose an hour of work because one shape
        is malformed. The caller saves anyway and shows the list."""
        draft = session.new_draft()
        draft["items"] = [{"localId": "a", "tier": "nope", "geometry": {"kind": "polygon", "ringPx": []}}]
        problems = session.validate(draft)
        self.assertGreaterEqual(len(problems), 2)
        self.assertIsInstance(problems[0], str)


class TestSummaryAndIds(unittest.TestCase):
    def test_summary_counts_what_still_needs_attention(self):
        draft = session.new_draft()
        draft["items"] = [
            session.make_item("a", "region", poly(), name="Old Town", note="cliff-top"),
            session.make_item("b", "site", poly()),
            session.make_item("c", "point", point(), note="the statue"),
        ]
        s = session.summarise(draft)
        self.assertEqual(s["total"], 3)
        self.assertEqual(s["byTier"], {"region": 1, "site": 1, "point": 1})
        self.assertEqual(s["unnamed"], 2)
        self.assertEqual(s["unnoted"], 1)

    def test_suggested_ids_are_kebab_case_and_unique(self):
        self.assertEqual(session.suggest_id("Harbour Square", "region"), "harbour-square")
        self.assertEqual(session.suggest_id("The Gnoll Statue!", "point"), "the-gnoll-statue")
        self.assertEqual(session.suggest_id("Harbour Square", "region",
                                            taken={"harbour-square"}), "harbour-square-2")

    def test_an_unnamed_item_falls_back_to_its_tier(self):
        """So a draft never carries two blank ids, which would collide the
        moment either one got promoted."""
        self.assertEqual(session.suggest_id("", "region"), "region")
        self.assertEqual(session.suggest_id("   ", "site", taken={"site"}), "site-2")


class TestDraftFiles(unittest.TestCase):
    def test_drafts_list_newest_first(self):
        """The session you were just working on is the one you want back."""
        d = tempfile.mkdtemp()
        try:
            for name in ("session-20260101-000000", "session-20260911-120000",
                         "session-20260501-090000"):
                with open(os.path.join(d, name + ".json"), "w", encoding="utf-8") as fh:
                    fh.write("{}")
            self.assertEqual(session.list_drafts(d)[0], "session-20260911-120000")
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_saving_stamps_the_update_time(self):
        d = tempfile.mkdtemp()
        try:
            draft = session.new_draft()
            first = draft["updated"]
            import datetime
            session.save(draft, session.draft_path(draft["id"], d),
                         now=datetime.datetime(2030, 1, 1, 12, 0, 0))
            self.assertNotEqual(draft["updated"], first)
        finally:
            shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
