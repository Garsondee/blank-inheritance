"""A real undo stack for delete/re-tier/rename.

Named as a deliberate follow-up in the commit that built containment,
briefs and the district tree (Gazetteer V2, 2026-09-12) rather than rushed
into that same pass: "the arm/confirm pattern used throughout already
covers the specific mistakes that prompted asking for [it]." That covers a
single accidental click. It does not cover realising, three saves later,
that the click should not have happened -- which is exactly how five
promoted homes went missing earlier in this project's history, caught only
because their `locationRef` survived in data/locations/ and the buildings
could be reconstructed by hand. An undo stack means that recovery is a
keystroke, not an investigation.

Pure: given two item lists (the draft's state before and after a save),
`describe_change` says in one line what a person would call that edit, and
the ring-buffer type below is a plain list with a size cap. No I/O, no
knowledge of the server or the draft file -- server.py pushes and pops it
around `_api_save_session`'s own read-modify-write of `STATE.draft["items"]`.

Deliberately whole-snapshot, not field-level. This project's own save model
already treats a session as "the whole items list, replaced" (every save,
promotion-rescue and stale-tab guard in server.py operates at that
granularity) -- a per-field undo would be a second, parallel model of what a
"change" is, maintained forever in step with the first. Restoring the
previous full snapshot undoes a delete, a rename and a re-tier identically,
because to this module they are the same shape of event: the items list
changed.
"""

from __future__ import annotations

#: How many prior states to keep. Bounded because each entry is a full copy
#: of the items list -- a real session runs to 100+ items with full ring
#: geometry -- and undo only ever needs to reach back a handful of actions,
#: not the whole session's history (the draft file itself is that record).
MAX_DEPTH = 8


def describe_change(old_items, new_items):
    """One line describing what changed between two items lists, for the
    button that offers to undo it ("Undo: deleted 'The Corner House'") --
    a bare "Undo" with no idea what it undoes is not a safe thing to click.

    Checked in a fixed order of "most likely to be the whole story": a
    single delete or rename is the common case and gets named exactly;
    anything broader falls back to a plain count rather than guessing.
    """
    old_by_id = {it.get("localId"): it for it in old_items}
    new_by_id = {it.get("localId"): it for it in new_items}
    old_ids, new_ids = set(old_by_id), set(new_by_id)

    # List order, not set-iteration order: a person reading "deleted 'A',
    # 'B', 'C'" expects that to match the order they saw those rows in, not
    # whatever order a hash set happens to produce.
    removed = [it for it in old_items if it.get("localId") in old_ids - new_ids]
    added = [it for it in new_items if it.get("localId") in new_ids - old_ids]
    common = [i for i in old_by_id if i in new_ids]
    renamed = [(old_by_id[i], new_by_id[i]) for i in common
               if (old_by_id[i].get("name") or "") != (new_by_id[i].get("name") or "")]
    retiered = [(old_by_id[i], new_by_id[i]) for i in common
                if old_by_id[i].get("tier") != new_by_id[i].get("tier")]

    def label(item):
        return (item.get("name") or "").strip() or "(unnamed %s)" % item.get("tier", "item")

    if removed and not added and not renamed and not retiered:
        if len(removed) == 1:
            return "deleted %r" % label(removed[0])
        return "deleted %d items (%s)" % (
            len(removed), ", ".join(repr(label(it)) for it in removed[:3]) +
            (", ..." if len(removed) > 3 else ""))

    if renamed and not removed and not added and not retiered and len(renamed) == 1:
        old, new = renamed[0]
        return "renamed %r to %r" % (label(old), label(new))

    if retiered and not removed and not added and not renamed and len(retiered) == 1:
        old, new = retiered[0]
        return "changed %r from %s to %s" % (label(old), old.get("tier"), new.get("tier"))

    changed = len(removed) + len(added) + len(renamed) + len(retiered)
    if changed == 0:
        return "no change"
    return "%d item%s changed" % (changed, "" if changed == 1 else "s")


def has_real_change(old_items, new_items):
    """Whether a save actually moved anything, so a no-op save (the
    inspector re-posting the same selection, a plain reload-and-resave)
    does not spend a slot in the undo stack on nothing."""
    key = lambda items: [(it.get("localId"), it.get("name"), it.get("tier"),
                          it.get("geometry")) for it in items]
    return key(old_items) != key(new_items)


class UndoStack:
    """A capped LIFO of prior draft snapshots.

    Each entry is whatever the caller pushes (server.py pushes
    `{"items": ..., "nextLocalId": ..., "description": ...}`); this class
    only enforces the cap and the ordering, it does not know the shape.
    """

    def __init__(self, max_depth=MAX_DEPTH):
        self.max_depth = max_depth
        self._entries = []

    def push(self, entry):
        self._entries.append(entry)
        if self.max_depth and len(self._entries) > self.max_depth:
            del self._entries[:-self.max_depth]

    def pop(self):
        """The most recent entry, removed -- or None if the stack is empty."""
        return self._entries.pop() if self._entries else None

    def peek(self):
        """The most recent entry, left in place -- or None."""
        return self._entries[-1] if self._entries else None

    def __len__(self):
        return len(self._entries)
