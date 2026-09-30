"""Everything Claude would otherwise have to ask for, in one document.

Written 2026-09-12 (Gazetteer V2) against a real ledger of cost from a single
afternoon session: two throwaway Python scripts to write lore for forty
regions and twenty-two buildings; six manual map-crop renders just so Claude
could see what it was describing; and one plain sentence in chat -- "I have
saved some more structures for you to create" -- that carried none of the
grid references, footprint metrics, or district context Claude then had to
go compute or ask for by hand.

This builds the Markdown a person copies out of the Gazetteer and pastes into
a conversation. Not a live push -- there is no transport between this local
tool and a chat session, and building one would be a much bigger and
riskier thing than the actual problem needed. A clipboard handoff is instant,
needs no new infrastructure, and removes the typed sentence entirely: select
the items, press one button, paste.

Pure formatting over data the caller already has (a draft's items, already
carrying fresh `derived` from session.derive_draft -- see core/queue.py for
the same division of labour). Takes the shape.py/depth.py metrics as an
already-computed dict per item rather than recomputing them itself, so this
module does not have to know about `build` provenance or the depth spec --
only how to lay out what it is handed.
"""

from __future__ import annotations


def _heading(item):
    label = item.get("name") or "(unnamed %s)" % item.get("tier", "item")
    ref = (item.get("derived") or {}).get("ref") or "?"
    return "%s — %s — `%s`" % (label, item.get("tier", "?"), ref)


def _region_context_lines(item, regions_by_id):
    within = (item.get("derived") or {}).get("withinRegionRef")
    region = regions_by_id.get(within)
    lines = []
    if region:
        lines.append("- **District:** %s (`%s`)"
                     % (region.get("name") or region["localId"], region["localId"]))
        brief = (region.get("brief") or "").strip()
        if brief:
            lines.append("- **District brief:** %s" % brief)
        constraints = region.get("constraints") or []
        if constraints:
            lines.append("- **Constraints:** " + ", ".join(constraints))
        neighbours = (region.get("derived") or {}).get("neighbourRefs") or []
        if neighbours:
            names = [regions_by_id.get(n, {}).get("name") or n for n in neighbours]
            lines.append("- **Bordering districts:** " + ", ".join(names))
    else:
        lines.append("- **District:** none -- outside every drawn region")
    return lines


def _region_block(item, regions_by_id):
    """A region's own briefing, for when a region itself is being handed off:
    its own brief and constraints (not inherited from anywhere -- a region
    has nothing above it to inherit from), what it already contains, and who
    it borders.

    Deliberately separate from `_region_context_lines`, which answers a
    different question -- "what CONTAINS this item" -- that only makes sense
    for a site or point. Calling that on a region and getting "outside every
    drawn region" back was the actual bug this split fixes: a district
    handed off on its own was reported as belonging nowhere instead of
    describing itself, and its own brief never appeared at all.
    """
    lines = []
    brief = (item.get("brief") or "").strip()
    if brief:
        lines.append("- **Brief:** %s" % brief)
    constraints = item.get("constraints") or []
    if constraints:
        lines.append("- **Constraints:** " + ", ".join(constraints))

    d = item.get("derived") or {}
    contains = d.get("containsRefs") or []
    lines.append("- **Contains:** %d item%s" % (len(contains), "" if len(contains) == 1 else "s"))
    neighbours = d.get("neighbourRefs") or []
    if neighbours:
        names = [regions_by_id.get(n, {}).get("name") or n for n in neighbours]
        lines.append("- **Borders:** " + ", ".join(names))
    area = d.get("areaM2")
    if area:
        lines.append("- **Area:** %s m²" % format(round(area), ","))
    return lines


def _shape_lines(shape_report):
    """`shape_report` is capacity()'s own return shape from core/shape.py --
    {maxDepth, reasons, floorAreaM2, rooms, shape} -- handed in by the caller
    rather than recomputed, since building it needs `build` provenance and a
    metres-per-pixel constant this module has no business owning."""
    if not shape_report:
        return []
    lines = ["- **Footprint:** %s, carries up to `%s`"
            % (shape_report.get("shape", "?"), shape_report.get("maxDepth", "?"))]
    for reason in shape_report.get("reasons") or []:
        lines.append("  - %s" % reason)
    return lines


def _depth_lines(depth_report):
    """`depth_report` is depth.check()'s own return shape, handed in for the
    same reason shape_report is."""
    if not depth_report:
        return []
    lines = ["- **Depth:** `%s`" % depth_report.get("depth", "named")]
    if depth_report.get("missing"):
        lines.append("  - Still owes: " + ", ".join(depth_report["missing"]))
    else:
        lines.append("  - Complete for its declared depth (%d words)."
                     % depth_report.get("words", 0))
    for note in depth_report.get("overweight") or []:
        lines.append("  - %s." % note)
    return lines


def _promoted_lines(location):
    """The two things a handoff must say about an already-promoted item: that
    it HAS been promoted, and what was actually written.

    Without this the document reported a promoted location as owing its whole
    lore, because the depth check ran against the draft item -- which still
    holds only the rough note, by design, since promotion is a one-way door
    into data/locations/ and never writes back. Ingram hit exactly that:
    refreshed the Gazetteer after two locations had been fully written, and
    the handoff still handed back the stubs. A handoff that understates what
    exists invites the next conversation to rewrite it from scratch.
    """
    if not location:
        return []
    status = (location.get("authoring") or {}).get("status") or "?"
    return ["_Promoted — `data/locations/%s.json` (%s). Depth and lore below are "
            "the PROMOTED entity's, not the draft note's._" % (location["id"], status)]


def _written_lore_lines(location):
    if not location:
        return []
    summary = ((location.get("lore") or {}).get("summary") or "").strip()
    if not summary:
        return []
    return ["", "**Written summary:**", summary]


def build_item_section(item, *, regions_by_id, shape_report=None, depth_report=None,
                       location=None):
    """One item, as a Markdown section. Public so a single-item handoff and a
    multi-item one share exactly the same per-item formatting.

    `location` is the promoted data/locations/ document this item became, when
    it has been promoted -- see _promoted_lines.
    """
    lines = ["### " + _heading(item)]
    lines.extend(_promoted_lines(location))
    if item.get("locked") and not location:
        lines.append("_Locked -- has a real lore entry already._")
    if item.get("tier") == "region":
        lines.extend(_region_block(item, regions_by_id))
    else:
        lines.extend(_region_context_lines(item, regions_by_id))
    lines.extend(_shape_lines(shape_report))
    lines.extend(_depth_lines(depth_report))

    lines.extend(_written_lore_lines(location))

    note = (item.get("note") or "").strip()
    lines.append("")
    lines.append("**Note:**")
    lines.append(note if note else "_(no note yet)_")

    tags = item.get("tags") or []
    if tags:
        lines.append("")
        lines.append("**Tags:** " + ", ".join(tags))
    return "\n".join(lines)


def build(items, ids, *, shape_reports=None, depth_reports=None, session_note="",
          locations=None):
    """The full handoff document for a set of selected items.

    `shape_reports` / `depth_reports` are optional {localId: report} maps --
    a region has no shape report (shape.py refuses regions on purpose, see
    its own docstring), so a missing entry is expected and simply omits that
    section rather than erroring. `locations` is the same shape: {localId:
    promoted location document} for items that have been promoted, and the
    caller is expected to have computed that item's depth report against the
    LOCATION rather than the draft item.
    """
    by_id = {it["localId"]: it for it in items}
    regions_by_id = {it["localId"]: it for it in items if it.get("tier") == "region"}
    shape_reports = shape_reports or {}
    depth_reports = depth_reports or {}
    locations = locations or {}

    selected = [by_id[i] for i in ids if i in by_id]
    missing = [i for i in ids if i not in by_id]

    parts = ["## Gazetteer handoff — %d item%s"
            % (len(selected), "" if len(selected) == 1 else "s")]
    if session_note:
        parts.append(session_note.strip())
    if missing:
        parts.append("_%d id%s not found in the current session: %s_"
                     % (len(missing), "" if len(missing) == 1 else "s", ", ".join(missing)))

    for item in selected:
        parts.append(build_item_section(
            item, regions_by_id=regions_by_id,
            shape_report=shape_reports.get(item["localId"]),
            depth_report=depth_reports.get(item["localId"]),
            location=locations.get(item["localId"])))

    return "\n\n".join(parts) + "\n"
