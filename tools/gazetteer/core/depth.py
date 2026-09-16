"""Does this location match what it claims to be?

The specification this implements is design/location-depth.md -- read that
first; this module is the enforcement, not the argument.

The short version. A location declares a `depth` -- named / sketch / scene /
standing -- and that declaration is a commission: it says how much this place
is supposed to be. This module answers whether the content has caught up with
the declaration, in three lists rather than one verdict:

  missing     required at this depth and absent. Incomplete.
  overweight  past this depth's word ceiling. Not wrong, mis-declared.
  orphaned    written but not required here. Mis-declared from the other side.

Only `missing` blocks. The other two are advice, and callers are expected to
present them as advice -- a warning that cannot be ignored becomes a warning
that is always ignored.

Two-sided on purpose. The failure this campaign actually risks is not
under-written buildings; it is three paragraphs and a named proprietor spent
on a laundry nobody will ever enter, while the place the group returns to five
times has one line. Catching the second needs a ceiling, not a floor.

Pure: no I/O, no schema loading, no knowledge of where a location is stored.
Takes the shape of a promoted location entity OR a gazetteer session item and
normalises between them, because the same question gets asked while drafting
and again at promotion.
"""

from __future__ import annotations

#: In order. Each depth requires everything the ones below it require.
DEPTHS = ("named", "sketch", "scene", "standing")

#: Text fields that count toward the prose budget, in reading order.
_PROSE_FIELDS = ("summary", "playerFacing", "gmOnly", "history", "consequences")

#: Everything a depth obliges. `text` fields must be non-empty; `lists` must
#: hold at least that many entries. Word ceilings are deliberately in one
#: place so they can be retuned in a single edit once there is a big enough
#: corpus to argue with them -- see the specification's closing section.
SPEC = {
    # 70, not the 40 this was first guessed at: measured against the 36
    # hand-written entries in the first real session (median 42, p90 62,
    # max 88), a 40-word ceiling flagged 19 of them. Those are exactly the
    # entries Ingram pointed at as the depth-0 standard, so the ceiling was
    # wrong, not the entries. 70 passes 33 of 36 and still catches the three
    # that genuinely outgrew the rung.
    "named": {
        "text": ("summary",),
        "lists": {},
        "summary_words": 70,
        "total_words": 70,
    },
    "sketch": {
        "text": ("summary", "playerFacing"),
        "lists": {"hooks": 1},
        "summary_words": 90,
        "total_words": 250,
    },
    "scene": {
        "text": ("summary", "playerFacing", "gmOnly"),
        "lists": {"hooks": 1, "activities": 2, "npcRefs": 1,
                  "assetRefs": 1, "playlistRefs": 1},
        "summary_words": 150,
        "total_words": 900,
    },
    "standing": {
        "text": ("summary", "playerFacing", "gmOnly", "history", "consequences"),
        "lists": {"hooks": 1, "activities": 3, "npcRefs": 2,
                  "assetRefs": 1, "playlistRefs": 1},
        "summary_words": 150,
        "total_words": None,   # a place visited all campaign is allowed to accumulate
    },
}

#: Fields worth flagging when present below the depth that requires them.
#: Only the expensive ones: nobody needs telling they wrote a summary.
_ORPHAN_CANDIDATES = ("playerFacing", "gmOnly", "history", "consequences",
                      "activities", "npcRefs", "assetRefs", "playlistRefs")

#: Human-readable, for the UI and for error text. Kept here rather than in the
#: browser layer so both sides say the same words about the same rule.
LABELS = {
    "summary": "a one-line summary",
    "playerFacing": "player-facing description",
    "gmOnly": "GM-only notes",
    "history": "a history section",
    "consequences": "a consequences section",
    "hooks": "hooks",
    "activities": "activities",
    "npcRefs": "NPCs",
    "assetRefs": "artwork",
    "playlistRefs": "a playlist",
}


def normalise(doc):
    """One shape from either a location entity or a session draft item.

    A session item has a flat `note` and no lore block yet -- that note IS its
    summary while drafting, and treating it as one is what lets the same check
    run in the gazetteer before anything has been promoted.
    """
    lore = doc.get("lore") or {}
    scene = doc.get("scene") or {}
    return {
        "name": (doc.get("name") or "").strip(),
        "kind": (doc.get("kind") or "").strip(),
        "summary": (lore.get("summary") or doc.get("note") or "").strip(),
        "playerFacing": (lore.get("playerFacing") or "").strip(),
        "gmOnly": (lore.get("gmOnly") or "").strip(),
        "history": (scene.get("history") or "").strip(),
        "consequences": (scene.get("consequences") or "").strip(),
        "hooks": list(scene.get("hooks") or []),
        "activities": list(scene.get("activities") or []),
        "npcRefs": list(doc.get("npcRefs") or []),
        "assetRefs": list(doc.get("assetRefs") or []),
        "playlistRefs": list(doc.get("playlistRefs") or []),
    }


def word_count(text):
    return len((text or "").split())


def prose_words(fields):
    """Every word that counts toward the budget, list entries included.

    Hooks and activities count: a location whose prose is lean but carries
    twenty listed activities has still outgrown its depth, and a budget that
    ignored them would be trivially sidestepped.
    """
    total = sum(word_count(fields.get(name)) for name in _PROSE_FIELDS)
    for name in ("hooks", "activities"):
        total += sum(word_count(entry) for entry in fields.get(name) or [])
    return total


def check(doc, depth=None):
    """The whole contract, as three lists plus the arithmetic behind them.

    `depth` overrides the document's own declaration -- that is what answers
    "what would this owe if I promoted it?", which is the question worth
    asking when a place turns out to matter more than expected.
    """
    declared = depth or doc.get("depth") or "named"
    if declared not in SPEC:
        return {
            "depth": declared,
            "known": False,
            "missing": ["depth %r is not one of %s" % (declared, ", ".join(DEPTHS))],
            "overweight": [],
            "orphaned": [],
            "ok": False,
            "words": 0,
            "summaryWords": 0,
        }

    spec = SPEC[declared]
    fields = normalise(doc)
    missing, overweight, orphaned = [], [], []

    # Identity first: a location with no name is not a location at any depth.
    if not fields["name"]:
        missing.append("a name")
    if not fields["kind"]:
        missing.append("a kind")

    for name in spec["text"]:
        if not fields[name]:
            missing.append(LABELS[name])
    for name, least in spec["lists"].items():
        have = len(fields[name])
        if have < least:
            missing.append("%s (%d of %d)" % (LABELS[name], have, least))

    summary_words = word_count(fields["summary"])
    total = prose_words(fields)
    summary_over = summary_words > spec["summary_words"]
    if summary_over:
        overweight.append("summary is %d words, over the %d-word ceiling for %s"
                          % (summary_words, spec["summary_words"], declared))
    # At depth `named` the summary IS the whole prose, so reporting both
    # ceilings says the same thing twice and makes the advice read as
    # mechanical rather than considered.
    total_is_just_the_summary = total == summary_words
    if (spec["total_words"] is not None and total > spec["total_words"]
            and not (summary_over and total_is_just_the_summary)):
        overweight.append("%d words in total, over the %d-word ceiling for %s"
                          % (total, spec["total_words"], declared))

    required = set(spec["text"]) | set(spec["lists"])
    for name in _ORPHAN_CANDIDATES:
        if name in required:
            continue
        value = fields[name]
        if value:
            orphaned.append(LABELS[name])

    return {
        "depth": declared,
        "known": True,
        "missing": missing,
        "overweight": overweight,
        "orphaned": orphaned,
        "ok": not missing,
        "words": total,
        "summaryWords": summary_words,
    }


def suggest_depth(doc):
    """The DEEPEST depth this content would already satisfy, or None.

    Requirements only ever grow with depth, so satisfaction is monotonic: if
    `standing` passes then everything below it does too, and the deepest
    passing rung is the interesting one -- it is the one that says "you have
    already written a scene's worth here, promote it and it will check out".

    Advice for a location whose content has outgrown its declaration, never a
    substitute for declaring one: inferring depth from how much text exists
    would only ever tell you what you already wrote, where declaring it first
    makes it a commission. See the specification's "How this is meant to be
    used".
    """
    best = None
    for name in DEPTHS:
        if check(doc, depth=name)["ok"]:
            best = name
    return best
