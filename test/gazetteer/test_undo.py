"""A real undo stack for delete/re-tier/rename.

See tools/gazetteer/core/undo.py's own docstring for why this exists and why
it works on whole item-list snapshots rather than individual fields.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

from core import undo  # noqa: E402


def item(local_id, tier="site", name="", geometry=None):
    return {"localId": local_id, "tier": tier, "name": name,
           "geometry": geometry or {"kind": "point", "pointPx": [0, 0]}}


class TestDescribeChange(unittest.TestCase):

    def test_a_single_delete_is_named_by_its_own_name(self):
        old = [item("s1", name="The Corner House"), item("s2", name="Signal Box")]
        new = [item("s2", name="Signal Box")]
        self.assertEqual(undo.describe_change(old, new), "deleted 'The Corner House'")

    def test_an_unnamed_delete_still_says_what_kind_it_was(self):
        old = [item("s1", tier="site", name="")]
        new = []
        self.assertEqual(undo.describe_change(old, new), "deleted '(unnamed site)'")

    def test_several_deletes_are_named_up_to_three_then_counted(self):
        old = [item("s1", name="A"), item("s2", name="B"),
               item("s3", name="C"), item("s4", name="D")]
        new = []
        desc = undo.describe_change(old, new)
        self.assertIn("deleted 4 items", desc)
        self.assertIn("'A'", desc)
        self.assertIn("...", desc)

    def test_a_single_rename_names_old_and_new(self):
        old = [item("s1", name="Building #114")]
        new = [item("s1", name="The Corner House")]
        self.assertEqual(undo.describe_change(old, new),
                         "renamed 'Building #114' to 'The Corner House'")

    def test_a_single_retier_names_old_and_new_tier(self):
        old = [item("s1", tier="site", name="The Long Sheds")]
        new = [item("s1", tier="region", name="The Long Sheds")]
        self.assertEqual(undo.describe_change(old, new),
                         "changed 'The Long Sheds' from site to region")

    def test_no_change_is_named_as_such(self):
        items = [item("s1", name="A")]
        self.assertEqual(undo.describe_change(items, items), "no change")

    def test_a_mixed_batch_of_edits_falls_back_to_a_plain_count(self):
        old = [item("s1", name="A"), item("s2", name="B")]
        new = [item("s1", name="A renamed"), item("s3", name="new one")]
        desc = undo.describe_change(old, new)
        # removed s2, added s3, renamed s1 -- three distinct events, no
        # single-event phrasing fits, so this must not silently pick one.
        self.assertIn("items changed", desc)

    def test_an_added_item_alone_does_not_match_the_delete_phrasing(self):
        old = [item("s1", name="A")]
        new = [item("s1", name="A"), item("s2", name="B")]
        self.assertNotIn("deleted", undo.describe_change(old, new))


class TestHasRealChange(unittest.TestCase):

    def test_identical_lists_have_no_real_change(self):
        items = [item("s1", name="A")]
        self.assertFalse(undo.has_real_change(items, list(items)))

    def test_a_geometry_edit_is_a_real_change_even_with_the_same_name(self):
        old = [item("s1", name="A", geometry={"kind": "point", "pointPx": [0, 0]})]
        new = [item("s1", name="A", geometry={"kind": "point", "pointPx": [5, 5]})]
        self.assertTrue(undo.has_real_change(old, new))

    def test_a_reordered_but_otherwise_identical_list_is_still_a_change(self):
        # Order carries no meaning in this model, but detecting that would be
        # a second kind of "equal" to maintain -- treating a reorder as a
        # real change is the conservative, cheap-to-stay-correct choice.
        a, b = item("s1", name="A"), item("s2", name="B")
        self.assertTrue(undo.has_real_change([a, b], [b, a]))


class TestUndoStack(unittest.TestCase):

    def test_pop_on_an_empty_stack_is_none_not_an_error(self):
        self.assertIsNone(undo.UndoStack().pop())

    def test_push_then_pop_round_trips_the_most_recent_entry(self):
        stack = undo.UndoStack()
        stack.push({"description": "first"})
        stack.push({"description": "second"})
        self.assertEqual(stack.pop()["description"], "second")
        self.assertEqual(stack.pop()["description"], "first")
        self.assertIsNone(stack.pop())

    def test_peek_does_not_remove_the_entry(self):
        stack = undo.UndoStack()
        stack.push({"description": "only"})
        self.assertEqual(stack.peek()["description"], "only")
        self.assertEqual(len(stack), 1)
        self.assertEqual(stack.pop()["description"], "only")

    def test_the_stack_is_capped_and_drops_the_oldest_entry_first(self):
        stack = undo.UndoStack(max_depth=3)
        for i in range(5):
            stack.push({"description": "edit %d" % i})
        self.assertEqual(len(stack), 3)
        # Newest-first pop order: 4, 3, 2 survive; 0 and 1 were dropped.
        self.assertEqual(stack.pop()["description"], "edit 4")
        self.assertEqual(stack.pop()["description"], "edit 3")
        self.assertEqual(stack.pop()["description"], "edit 2")
        self.assertIsNone(stack.pop())

    def test_an_unbounded_stack_keeps_everything(self):
        stack = undo.UndoStack(max_depth=None)
        for i in range(20):
            stack.push({"description": "edit %d" % i})
        self.assertEqual(len(stack), 20)


if __name__ == "__main__":
    unittest.main()
