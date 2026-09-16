"""The Claude -> Ingram "please define this place" queue.

See tools/gazetteer/core/requests.py's own docstring for why this exists:
the one unblock-Claude path the original Gazetteer plan named (Stage 7) and
nothing had built until now.
"""

import datetime
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import requests as gzreq  # noqa: E402

FIXED_NOW = datetime.datetime(2026, 9, 12, 12, 0, 0)


class TestCreate(unittest.TestCase):

    def test_a_fresh_document_has_no_requests(self):
        self.assertEqual(gzreq.empty()["requests"], [])

    def test_creating_one_returns_both_the_new_doc_and_the_entry(self):
        doc, entry = gzreq.create(gzreq.empty(), "a name for the harbourmaster's office",
                                  why="The Old Landing's lore mentions one but nothing is drawn",
                                  hint="C3.44", now=FIXED_NOW)
        self.assertEqual(len(doc["requests"]), 1)
        self.assertIs(doc["requests"][0], entry)
        self.assertEqual(entry["id"], "req-1")
        self.assertEqual(entry["status"], "open")
        self.assertEqual(entry["hint"], "C3.44")
        self.assertEqual(entry["raisedAt"], "2026-09-12T12:00:00")
        self.assertIsNone(entry["resolvedAt"])
        self.assertIsNone(entry["resolution"])

    def test_ids_are_monotonic_and_never_recycled(self):
        doc, _ = gzreq.create(gzreq.empty(), "first", now=FIXED_NOW)
        doc, _ = gzreq.create(doc, "second", now=FIXED_NOW)
        doc, _ = gzreq.resolve(doc, "req-1", now=FIXED_NOW)
        # req-1 is resolved, not deleted, but a THIRD request must still not
        # reuse "req-1" or "req-2" -- the same recycled-id lesson as the
        # session's own nextLocalId counter, applied to this queue.
        doc, third = gzreq.create(doc, "third", now=FIXED_NOW)
        self.assertEqual(third["id"], "req-3")

    def test_an_empty_what_is_refused(self):
        with self.assertRaises(gzreq.RequestError):
            gzreq.create(gzreq.empty(), "   ")

    def test_hint_and_why_are_optional(self):
        doc, entry = gzreq.create(gzreq.empty(), "something", now=FIXED_NOW)
        self.assertIsNone(entry["hint"])
        self.assertEqual(entry["why"], "")

    def test_the_original_document_is_not_mutated(self):
        original = gzreq.empty()
        gzreq.create(original, "something", now=FIXED_NOW)
        self.assertEqual(original["requests"], [],
                         "create must return a new document, not edit in place")


class TestResolve(unittest.TestCase):

    def test_resolving_marks_status_and_keeps_the_original_text(self):
        doc, entry = gzreq.create(gzreq.empty(), "a name for the harbourmaster's office",
                                  why="came up while writing The Old Landing", now=FIXED_NOW)
        doc, resolved = gzreq.resolve(doc, entry["id"],
                                      resolution="became 'harbourmasters-office'", now=FIXED_NOW)
        self.assertEqual(resolved["status"], "resolved")
        self.assertEqual(resolved["resolution"], "became 'harbourmasters-office'")
        self.assertEqual(resolved["resolvedAt"], "2026-09-12T12:00:00")
        # What was asked for and why must survive resolution unchanged --
        # otherwise the record cannot later answer "why did this exist".
        self.assertEqual(resolved["what"], entry["what"])
        self.assertEqual(resolved["why"], entry["why"])

    def test_resolving_an_unknown_id_is_refused(self):
        with self.assertRaises(gzreq.RequestError):
            gzreq.resolve(gzreq.empty(), "req-999")

    def test_resolving_an_already_resolved_request_is_refused_not_silent(self):
        doc, entry = gzreq.create(gzreq.empty(), "something", now=FIXED_NOW)
        doc, _ = gzreq.resolve(doc, entry["id"], now=FIXED_NOW)
        with self.assertRaises(gzreq.RequestError):
            gzreq.resolve(doc, entry["id"], now=FIXED_NOW)

    def test_resolving_one_request_does_not_touch_another(self):
        doc, first = gzreq.create(gzreq.empty(), "first", now=FIXED_NOW)
        doc, second = gzreq.create(doc, "second", now=FIXED_NOW)
        doc, _ = gzreq.resolve(doc, first["id"], now=FIXED_NOW)
        still_open = next(r for r in doc["requests"] if r["id"] == second["id"])
        self.assertEqual(still_open["status"], "open")


class TestOpenRequests(unittest.TestCase):

    def test_only_open_ones_are_returned(self):
        doc, first = gzreq.create(gzreq.empty(), "first", now=FIXED_NOW)
        doc, second = gzreq.create(doc, "second", now=FIXED_NOW)
        doc, _ = gzreq.resolve(doc, first["id"], now=FIXED_NOW)
        open_ids = [r["id"] for r in gzreq.open_requests(doc)]
        self.assertEqual(open_ids, [second["id"]])

    def test_oldest_first(self):
        doc, first = gzreq.create(gzreq.empty(), "first",
                                  now=datetime.datetime(2026, 9, 1))
        doc, second = gzreq.create(doc, "second",
                                   now=datetime.datetime(2026, 9, 10))
        ordered = [r["id"] for r in gzreq.open_requests(doc)]
        self.assertEqual(ordered, [first["id"], second["id"]])


class TestLoadSave(unittest.TestCase):

    def test_loading_a_missing_file_returns_an_empty_document(self):
        self.assertEqual(gzreq.load("/no/such/path.json")["requests"], [])

    def test_save_then_load_round_trips(self):
        import shutil
        import tempfile
        tmp = tempfile.mkdtemp()
        try:
            path = os.path.join(tmp, "sub", "requests.json")
            doc, _ = gzreq.create(gzreq.empty(), "something", hint="A1.01", now=FIXED_NOW)
            gzreq.save(doc, path)
            reloaded = gzreq.load(path)
            self.assertEqual(reloaded["requests"][0]["what"], "something")
            self.assertEqual(reloaded["requests"][0]["hint"], "A1.01")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
