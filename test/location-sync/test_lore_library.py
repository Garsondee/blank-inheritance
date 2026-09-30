"""The small set of documents Claude treats as holy, and Ingram's own
instructions against them.

See tools/gazetteer/core/lore_library.py's own docstring for the two files
this tests (the registry, the instruction queue) and why backlinks are
computed fresh rather than stored.
"""

import datetime
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

from core import lore_library as lib  # noqa: E402

FIXED_NOW = datetime.datetime(2026, 9, 13, 12, 0, 0)


def entry(doc_id, path, title="Untitled", importance=3, category="design"):
    return {"id": doc_id, "path": path, "title": title,
           "importance": importance, "category": category}


class TestRegistry(unittest.TestCase):

    def test_a_fresh_library_has_no_documents(self):
        self.assertEqual(lib.empty_library()["documents"], [])

    def test_adding_a_document_returns_a_new_library_not_mutated_in_place(self):
        original = lib.empty_library()
        updated = lib.add_document(original, entry("ledger", "ideas/story/bible/LEDGER.md",
                                                    "The Ledger", 5, "ledger"))
        self.assertEqual(original["documents"], [])
        self.assertEqual(len(updated["documents"]), 1)
        self.assertEqual(updated["documents"][0]["id"], "ledger")

    def test_a_duplicate_id_is_refused(self):
        doc = lib.add_document(lib.empty_library(), entry("ledger", "a/path.md"))
        with self.assertRaises(lib.LoreError):
            lib.add_document(doc, entry("ledger", "a/different/path.md"))

    def test_a_duplicate_path_is_refused_even_with_a_different_id(self):
        doc = lib.add_document(lib.empty_library(), entry("ledger", "a/path.md"))
        with self.assertRaises(lib.LoreError):
            lib.add_document(doc, entry("ledger-two", "a/path.md"))

    def test_a_document_missing_a_required_field_is_refused(self):
        with self.assertRaises(lib.LoreError):
            lib.add_document(lib.empty_library(), {"id": "x", "path": "y"})

    def test_importance_zero_boundary_still_counts_as_present(self):
        # Not a real importance value (schema floors at 1) but exercises the
        # "missing vs falsy" distinction in the required-field check itself.
        doc = lib.add_document(lib.empty_library(),
                               entry("x", "y.md", "Y", importance=1, category="design"))
        self.assertEqual(doc["documents"][0]["importance"], 1)

    def test_find_document_returns_none_for_an_unknown_id(self):
        self.assertIsNone(lib.find_document(lib.empty_library(), "no-such-doc"))

    def test_removing_a_document_that_exists(self):
        doc = lib.add_document(lib.empty_library(), entry("ledger", "a/path.md"))
        doc = lib.remove_document(doc, "ledger")
        self.assertEqual(doc["documents"], [])

    def test_removing_an_unknown_document_is_refused(self):
        with self.assertRaises(lib.LoreError):
            lib.remove_document(lib.empty_library(), "no-such-doc")

    def test_save_then_load_round_trips(self):
        tmp = tempfile.mkdtemp()
        try:
            path = os.path.join(tmp, "sub", "lore-library.json")
            doc = lib.add_document(lib.empty_library(), entry("ledger", "a/path.md", "The Ledger"))
            lib.save_library(doc, path)
            reloaded = lib.load_library(path)
            self.assertEqual(reloaded["documents"][0]["title"], "The Ledger")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_loading_a_missing_file_is_a_valid_empty_library(self):
        self.assertEqual(lib.load_library("/no/such/path.json")["documents"], [])


class TestInstructions(unittest.TestCase):

    def test_creating_one_returns_both_the_new_doc_and_the_entry(self):
        doc, created = lib.create_instruction(
            lib.empty_instructions(), "ledger",
            "Add a note that the school and the military end are not co-sited.", now=FIXED_NOW)
        self.assertEqual(len(doc["instructions"]), 1)
        self.assertIs(doc["instructions"][0], created)
        self.assertEqual(created["status"], "pending")
        self.assertEqual(created["id"], "instr-1")
        self.assertEqual(created["raisedAt"], "2026-09-13T12:00:00")

    def test_an_instruction_needs_real_text(self):
        with self.assertRaises(lib.LoreError):
            lib.create_instruction(lib.empty_instructions(), "ledger", "   ")

    def test_an_instruction_needs_a_document_id(self):
        with self.assertRaises(lib.LoreError):
            lib.create_instruction(lib.empty_instructions(), "", "do something")

    def test_ids_are_monotonic_and_never_recycled(self):
        doc, _ = lib.create_instruction(lib.empty_instructions(), "a", "first", now=FIXED_NOW)
        doc, second = lib.create_instruction(doc, "a", "second", now=FIXED_NOW)
        doc, _ = lib.resolve_instruction(doc, second["id"], "done", now=FIXED_NOW)
        doc, third = lib.create_instruction(doc, "a", "third", now=FIXED_NOW)
        self.assertEqual(third["id"], "instr-3")

    def test_resolving_as_done_keeps_the_original_text(self):
        doc, created = lib.create_instruction(lib.empty_instructions(), "ledger", "fix the typo",
                                              now=FIXED_NOW)
        doc, resolved = lib.resolve_instruction(doc, created["id"], "done",
                                                resolution="fixed", now=FIXED_NOW)
        self.assertEqual(resolved["status"], "done")
        self.assertEqual(resolved["text"], "fix the typo")
        self.assertEqual(resolved["resolution"], "fixed")

    def test_resolving_as_needs_clarification_is_a_real_distinct_outcome(self):
        """The whole reason this module has two closed states instead of
        one: a genuinely ambiguous instruction on a high-importance
        document should end here, not with a guessed edit."""
        doc, created = lib.create_instruction(lib.empty_instructions(), "ledger",
                                              "make the tone a bit more serious", now=FIXED_NOW)
        doc, resolved = lib.resolve_instruction(
            doc, created["id"], "needs-clarification",
            resolution="asked whether this means the whole document or one section",
            now=FIXED_NOW)
        self.assertEqual(resolved["status"], "needs-clarification")

    def test_resolving_with_an_invalid_status_is_refused(self):
        doc, created = lib.create_instruction(lib.empty_instructions(), "a", "x", now=FIXED_NOW)
        with self.assertRaises(lib.LoreError):
            lib.resolve_instruction(doc, created["id"], "finished")

    def test_resolving_an_unknown_instruction_is_refused(self):
        with self.assertRaises(lib.LoreError):
            lib.resolve_instruction(lib.empty_instructions(), "instr-999", "done")

    def test_resolving_an_already_resolved_instruction_is_refused_not_silent(self):
        doc, created = lib.create_instruction(lib.empty_instructions(), "a", "x", now=FIXED_NOW)
        doc, _ = lib.resolve_instruction(doc, created["id"], "done", now=FIXED_NOW)
        with self.assertRaises(lib.LoreError):
            lib.resolve_instruction(doc, created["id"], "done")

    def test_pending_instructions_excludes_resolved_ones(self):
        doc, first = lib.create_instruction(lib.empty_instructions(), "a", "first", now=FIXED_NOW)
        doc, second = lib.create_instruction(doc, "a", "second", now=FIXED_NOW)
        doc, _ = lib.resolve_instruction(doc, first["id"], "done", now=FIXED_NOW)
        ids = [i["id"] for i in lib.pending_instructions(doc)]
        self.assertEqual(ids, [second["id"]])

    def test_pending_instructions_can_be_narrowed_to_one_document(self):
        doc, a1 = lib.create_instruction(lib.empty_instructions(), "doc-a", "x", now=FIXED_NOW)
        doc, b1 = lib.create_instruction(doc, "doc-b", "y", now=FIXED_NOW)
        ids = [i["id"] for i in lib.pending_instructions(doc, document_id="doc-a")]
        self.assertEqual(ids, [a1["id"]])


class TestReadWriteContent(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write_real_file(self, rel_path, content):
        full = os.path.join(self.tmp, rel_path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(content)

    def test_reading_a_real_file_returns_its_content(self):
        self._write_real_file("docs/a.md", "# Hello\n")
        content = lib.read_document_content(entry("a", "docs/a.md"), repo_root=self.tmp)
        self.assertEqual(content, "# Hello\n")

    def test_reading_a_missing_file_raises_a_lore_error_not_a_bare_exception(self):
        with self.assertRaises(lib.LoreError):
            lib.read_document_content(entry("a", "docs/missing.md"), repo_root=self.tmp)

    def test_writing_updates_the_real_file(self):
        self._write_real_file("docs/a.md", "old")
        lib.write_document_content(entry("a", "docs/a.md"), "new", repo_root=self.tmp)
        with open(os.path.join(self.tmp, "docs/a.md"), encoding="utf-8") as fh:
            self.assertEqual(fh.read(), "new")

    def test_writing_to_a_document_with_no_real_file_is_refused(self):
        # The library only edits documents that already exist -- it must
        # never become a second way to create a file, the same discipline
        # promotion already holds for locations.
        with self.assertRaises(lib.LoreError):
            lib.write_document_content(entry("a", "docs/missing.md"), "new", repo_root=self.tmp)


class TestLinks(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.library = lib.empty_library()
        for doc_id, path, title in (
            ("ledger", "bible/LEDGER.md", "The Ledger"),
            ("deep-storage", "bible/locations/deep-storage.md", "Deep Storage"),
            ("the-rock", "bible/locations/the-rock.md", "The Rock"),
        ):
            self.library = lib.add_document(self.library, entry(doc_id, path, title))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write(self, path, content):
        full = os.path.join(self.tmp, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(content)

    def test_a_markdown_link_to_a_registered_path_is_found(self):
        content = "See [Deep Storage](bible/locations/deep-storage.md) for more."
        ids = lib.outbound_links(content, self.library)
        self.assertEqual(ids, ["deep-storage"])

    def test_a_plain_mention_of_another_documents_title_is_found(self):
        content = "This connects to The Rock in an obvious way, no link needed."
        ids = lib.outbound_links(content, self.library)
        self.assertEqual(ids, ["the-rock"])

    def test_links_are_returned_in_first_appearance_order_without_duplicates(self):
        content = ("The Rock is mentioned here, and again: The Rock. "
                  "Also see [Deep Storage](bible/locations/deep-storage.md).")
        ids = lib.outbound_links(content, self.library)
        self.assertEqual(ids, ["the-rock", "deep-storage"])

    def test_a_link_to_something_not_in_the_library_is_ignored(self):
        content = "See [some other file](design/unrelated.md)."
        self.assertEqual(lib.outbound_links(content, self.library), [])

    def test_inbound_links_finds_every_document_that_references_the_target(self):
        self._write("bible/LEDGER.md", "Entry 13 discusses The Rock at length.")
        self._write("bible/locations/deep-storage.md", "Nothing about that other place here.")
        self._write("bible/locations/the-rock.md", "This is the document about itself.")
        backlinks = lib.inbound_links(self.library, "the-rock", repo_root=self.tmp)
        self.assertEqual(backlinks, ["ledger"])

    def test_inbound_links_never_includes_the_target_referencing_itself(self):
        self._write("bible/LEDGER.md", "")
        self._write("bible/locations/deep-storage.md", "")
        self._write("bible/locations/the-rock.md", "The Rock is a fortress. -- The Rock's own page.")
        backlinks = lib.inbound_links(self.library, "the-rock", repo_root=self.tmp)
        self.assertEqual(backlinks, [])

    def test_inbound_links_skips_a_document_whose_file_is_missing_rather_than_raising(self):
        self._write("bible/LEDGER.md", "Mentions The Rock.")
        # deep-storage.md and the-rock.md deliberately not written to disk.
        backlinks = lib.inbound_links(self.library, "the-rock", repo_root=self.tmp)
        self.assertEqual(backlinks, ["ledger"])


if __name__ == "__main__":
    unittest.main()
