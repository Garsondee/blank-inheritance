"""The small set of documents Claude treats as holy, and the instructions
Ingram leaves against them.

Ingram, 2026-09-13: "Imagine that the current risk is that you are
generating so much more content than I can read that we may introduce whole
entire worlds which start to drift from what the story needs. Ideally I
need to be able to curate and carefully control a small set of documents
which you treat as holy." This module is the registry that makes "holy" a
checkable fact instead of a feeling -- a document is in the library because
someone decided it belongs, at a stated importance, not because it happens
to sit in a folder that also holds real content.

Two files, two shapes, same load/save pattern as core/requests.py and
core/overrides.py:

  lore-library.json        the registry itself -- which documents, how
                           important, what shelf. Rarely written; mostly
                           read, by both Claude (before writing) and the
                           Gazetteer's Lore mode (to build the document list).
  lore-instructions.json   Ingram's own change requests against a document,
                           the reverse of core/requests.py's Claude -> Ingram
                           queue. A pending instruction on an importance-1
                           document is the one case this module deliberately
                           does NOT try to fully automate: resolving it as
                           "done" by guessing at an ambiguous request is
                           exactly the mistake the standing caution rule
                           (design/location-rank.md's rank-1 rule, extended
                           to documents) exists to prevent. See resolve()'s
                           own "needs-clarification" status.

Backlinks are computed on read, not maintained as a stored index -- a
document's own prose is the only source of truth for what it references,
and a maintained index is a second copy of that fact that can silently
disagree with the first. Pure except for the load/save pairs and the
backlink scan, which reads the other registered files (never writes them).
"""

from __future__ import annotations

import datetime
import json
import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))

LIBRARY_PATH = os.path.join(_REPO_ROOT, "data", "campaign", "lore-library.json")
INSTRUCTIONS_PATH = os.path.join(_REPO_ROOT, "data", "campaign", "lore-instructions.json")
#: A mutable module global, not a hardcoded default -- read_document_content
#: and write_document_content fall back to THIS at call time (see their own
#: "read the module global at call time" comment), the same pattern
#: LIBRARY_PATH/INSTRUCTIONS_PATH already use, so a test suite can redirect
#: every document read/write into a scratch directory instead of the real
#: repo just by reassigning this, the same way it already redirects the
#: other paths in this module.
REPO_ROOT = _REPO_ROOT

LIBRARY_SCHEMA_REL = "../schema/lore-library.schema.json"
INSTRUCTIONS_SCHEMA_REL = "../schema/lore-instructions.schema.json"


class LoreError(ValueError):
    pass


def _now(now=None):
    return (now or datetime.datetime.now()).isoformat(timespec="seconds")


# --- the registry ------------------------------------------------------------

def empty_library():
    return {
        "$schema": LIBRARY_SCHEMA_REL,
        "id": "lore-library",
        "type": "lore-library",
        "documents": [],
    }


def load_library(path=None):
    path = path or LIBRARY_PATH
    if not os.path.exists(path):
        return empty_library()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_library(doc, path=None):
    path = path or LIBRARY_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def find_document(library_doc, document_id):
    return next((d for d in library_doc.get("documents") or [] if d["id"] == document_id), None)


def add_document(library_doc, entry):
    """A new document joins the library. Refuses a duplicate id or path --
    both would make "which document is this" ambiguous, which is exactly
    what a curated registry exists to prevent."""
    required = ("id", "path", "title", "importance", "category")
    missing = [f for f in required if not entry.get(f) and entry.get(f) != 0]
    if missing:
        raise LoreError("document entry missing %s" % ", ".join(missing))
    existing = library_doc.get("documents") or []
    if any(d["id"] == entry["id"] for d in existing):
        raise LoreError("a document with id %r is already in the library" % entry["id"])
    if any(d["path"] == entry["path"] for d in existing):
        raise LoreError("%r is already in the library (as %r)" %
                        (entry["path"], next(d["id"] for d in existing if d["path"] == entry["path"])))
    return dict(library_doc, documents=existing + [dict(entry)])


def remove_document(library_doc, document_id):
    existing = library_doc.get("documents") or []
    if not any(d["id"] == document_id for d in existing):
        raise LoreError("no document %r in the library" % document_id)
    return dict(library_doc, documents=[d for d in existing if d["id"] != document_id])


# --- instructions --------------------------------------------------------

def empty_instructions():
    return {
        "$schema": INSTRUCTIONS_SCHEMA_REL,
        "id": "lore-instructions",
        "type": "lore-instructions",
        "instructions": [],
    }


def load_instructions(path=None):
    path = path or INSTRUCTIONS_PATH
    if not os.path.exists(path):
        return empty_instructions()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_instructions(doc, path=None):
    path = path or INSTRUCTIONS_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def create_instruction(doc, document_id, text, now=None):
    text = (text or "").strip()
    if not text:
        raise LoreError("an instruction needs text -- what change is wanted")
    if not document_id:
        raise LoreError("an instruction needs a documentId")
    existing = doc.get("instructions") or []
    highest = 0
    for i in existing:
        digits = "".join(c for c in str(i.get("id") or "") if c.isdigit())
        if digits:
            highest = max(highest, int(digits))
    entry = {
        "id": "instr-%d" % (highest + 1),
        "documentId": document_id,
        "text": text,
        "status": "pending",
        "raisedAt": _now(now),
        "resolvedAt": None,
        "resolution": None,
    }
    return dict(doc, instructions=existing + [entry]), entry


def resolve_instruction(doc, instruction_id, status="done", resolution="", now=None):
    """Close out one instruction -- as 'done' once the edit is actually
    applied, or as 'needs-clarification' when applying it would mean
    guessing at something genuinely ambiguous. Both are real endings, not
    a success/failure pair: a clarifying question asked instead of a wrong
    guess is the correct outcome on a high-importance document, not a
    failure to complete the instruction.
    """
    if status not in ("done", "needs-clarification"):
        raise LoreError("status must be 'done' or 'needs-clarification', not %r" % status)
    existing = doc.get("instructions") or []
    match = next((i for i in existing if i.get("id") == instruction_id), None)
    if match is None:
        raise LoreError("no instruction %r" % instruction_id)
    if match.get("status") != "pending":
        raise LoreError("instruction %r is already %s" % (instruction_id, match.get("status")))

    updated, resolved_entry = [], None
    for i in existing:
        if i.get("id") == instruction_id:
            i = dict(i, status=status, resolvedAt=_now(now), resolution=(resolution or "").strip())
            resolved_entry = i
        updated.append(i)
    return dict(doc, instructions=updated), resolved_entry


def pending_instructions(doc, document_id=None):
    """Oldest first -- the one raised longest ago is the one most likely to
    have been forgotten. Optionally narrowed to one document."""
    items = [i for i in (doc.get("instructions") or []) if i.get("status") == "pending"]
    if document_id:
        items = [i for i in items if i.get("documentId") == document_id]
    return items


# --- reading documents, and the backlinks between them --------------------

_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def read_document_content(entry, repo_root=None):
    """The real file's current text. Raises LoreError (not a bare
    exception) if it's gone -- a library entry pointing at a moved or
    deleted file is a real problem the caller should surface, not a KeyError
    three layers up."""
    root = repo_root or REPO_ROOT
    full_path = os.path.join(root, entry["path"])
    if not os.path.exists(full_path):
        raise LoreError("%s (library id %r) does not exist on disk" % (entry["path"], entry["id"]))
    with open(full_path, encoding="utf-8") as fh:
        return fh.read()


def write_document_content(entry, content, repo_root=None):
    root = repo_root or REPO_ROOT
    full_path = os.path.join(root, entry["path"])
    if not os.path.exists(full_path):
        raise LoreError("%s (library id %r) does not exist on disk -- the library only "
                        "edits documents that already exist" % (entry["path"], entry["id"]))
    with open(full_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)


def outbound_links(content, library_doc):
    """Which OTHER library documents this content's markdown links point at
    or plainly names, as a list of document ids in first-appearance order,
    duplicates removed. Two forms count: a real markdown link
    [text](path/to/file.md), and a bare mention of another document's own
    title -- the bible is written in prose, not everything worth linking is
    already a [link](...).
    """
    content = content or ""
    documents = library_doc.get("documents") or []
    by_path = {d["path"]: d["id"] for d in documents}
    by_path_basename = {os.path.basename(d["path"]): d["id"] for d in documents}

    # Earliest character position each document is found at, by EITHER form.
    # Both passes record a candidate position and the minimum wins, rather
    # than one pass's setdefault silently keeping a later position just
    # because it ran first -- a title mentioned before its own markdown
    # link (or vice versa) must still sort by wherever it actually first
    # appears, not by which pattern happened to be checked first.
    positions = {}

    def note(doc_id, pos):
        if doc_id is not None and pos != -1:
            positions[doc_id] = min(pos, positions.get(doc_id, pos))

    for match in _LINK_RE.finditer(content):
        target = match.group(2).strip()
        note(by_path.get(target) or by_path_basename.get(os.path.basename(target)), match.start())

    for d in documents:
        title = d.get("title") or ""
        if title:
            note(d["id"], content.find(title))

    return [doc_id for doc_id, _pos in sorted(positions.items(), key=lambda kv: kv[1])]


def inbound_links(library_doc, target_id, repo_root=None):
    """Every OTHER document that links to or names `target_id`. Computed by
    reading every registered file fresh, not from a stored index -- see
    this module's own docstring for why a maintained backlink index would
    be a second, driftable copy of a fact the files themselves already
    state.
    """
    documents = library_doc.get("documents") or []
    found = []
    for d in documents:
        if d["id"] == target_id:
            continue
        try:
            content = read_document_content(d, repo_root)
        except LoreError:
            continue
        if target_id in outbound_links(content, library_doc):
            found.append(d["id"])
    return found
