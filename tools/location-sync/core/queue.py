"""What in this session actually needs attention, grouped by district.

Written 2026-09-12 (Gazetteer V2). Before this, the only way to know what
still needed writing was to scroll a flat list of a hundred and thirteen rows
looking for blanks -- or, worse, to be told in conversation ("I've saved some
more structures for you to create") because nothing in the tool surfaced it
on its own.

This answers one question: **what should be worked on next, and where is
it?** Grouped by region rather than as one flat backlog, because that is how
the work is actually done -- a session is "tonight: The Landing End," not
"tonight: forty of the hundred and thirteen items in no particular order."

Pure: takes a draft's `items` (already carrying fresh `derived` from
session.derive_draft -- this module does not recompute containment itself,
the same division of labour depth.py and shape.py already keep from
groundtruth.py) and returns plain data. No I/O, no server, no opinion about
how the caller displays it.
"""

from __future__ import annotations

#: A site/point counts as "needs a note" below this many characters of note.
#: Not zero: "?" or "guard hut" are real, useful three-word notes that get a
#: session unstuck (see design brainstorm entry "three-word notes are
#: enough"), and a length floor rather than an emptiness check is what lets
#: those count as attended-to rather than still-blank.
MIN_NOTE_CHARS = 3


def _needs_note(item):
    return len((item.get("note") or "").strip()) < MIN_NOTE_CHARS


def _needs_name(item):
    return not (item.get("name") or "").strip()


def region_summary(region, members):
    """One region's worth of progress, for the tree list and for the queue.

    `members` is every site/point whose derived.withinRegionRef is this
    region's localId -- the caller already has this from containment, so it
    is passed in rather than recomputed.
    """
    total = len(members)
    locked = sum(1 for m in members if m.get("locked"))
    needs_note = [m["localId"] for m in members if _needs_note(m)]
    needs_name = [m["localId"] for m in members if _needs_name(m)]
    return {
        "localId": region["localId"],
        "name": region.get("name") or "",
        "brief": region.get("brief") or "",
        "constraints": list(region.get("constraints") or []),
        "total": total,
        "locked": locked,
        "needsNoteCount": len(needs_note),
        "needsNameCount": len(needs_name),
        "hasBrief": bool((region.get("brief") or "").strip()),
    }


def build(items):
    """Every region's progress, plus session-wide totals and a short, ranked
    "needs attention" list -- the things a person opening this session cold
    would want pointed at first.

    Ranking is deliberately simple and explainable: regions with the MOST
    unwritten items first (the biggest single chunk of remaining work), then
    regions with no brief at all (the thing that caused today's actual
    rework -- writing lore before a constraint was known). A region that is
    already fully locked is never listed; there is nothing to point at.
    """
    regions = [it for it in items if it.get("tier") == "region"]
    members_by_region = {r["localId"]: [] for r in regions}
    unassigned = []

    for item in items:
        if item.get("tier") not in ("site", "point"):
            continue
        within = (item.get("derived") or {}).get("withinRegionRef")
        if within and within in members_by_region:
            members_by_region[within].append(item)
        else:
            unassigned.append(item)

    region_reports = [region_summary(r, members_by_region[r["localId"]])
                      for r in regions]

    needs_attention = [
        r for r in region_reports
        if r["needsNoteCount"] > 0 or r["needsNameCount"] > 0 or not r["hasBrief"]
    ]
    needs_attention.sort(key=lambda r: (-r["needsNoteCount"], r["hasBrief"], r["name"]))

    all_members = [it for members in members_by_region.values() for it in members]
    all_sites_points = all_members + unassigned
    return {
        "regionCount": len(regions),
        "siteCount": sum(1 for i in items if i.get("tier") == "site"),
        "pointCount": sum(1 for i in items if i.get("tier") == "point"),
        "totalNeedsNote": sum(1 for i in all_sites_points if _needs_note(i)),
        "totalNeedsName": sum(1 for i in all_sites_points if _needs_name(i)),
        "regionsWithNoBrief": sum(1 for r in region_reports if not r["hasBrief"]),
        "unassignedIds": sorted(i["localId"] for i in unassigned),
        "regions": region_reports,
        "needsAttention": needs_attention[:10],
    }
