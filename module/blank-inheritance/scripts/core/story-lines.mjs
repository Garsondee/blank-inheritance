/**
 * The Story list as the flat list of lines the panel draws
 * (design/location-editor.md §12). core/siting.mjs works out WHAT is where;
 * this turns that into an accordion: an Episode header, its scenes in play
 * order, and under an opened scene its rooms, the options the players choose
 * between, and its travel points -- each line carrying exactly what its row
 * shows. A flat list rather than nested markup so the template stays one
 * loop and so every rule about what is visible can be tested without a DOM.
 *
 * Pure: no Foundry globals.
 */

import { offMapLabel } from "./siting.mjs";

/** key -> { slot, row, group } for every slot in the story, so an action that only knows a key can find its scene. */
export function slotIndex(story) {
  const index = new Map();
  for (const group of story.groups) {
    for (const row of group.rows) {
      const slots = [row.place, ...row.rooms, ...row.positions, ...(row.options?.items ?? []), row.options?.then, ...(row.offeredIn ?? [])].filter(Boolean);
      for (const slot of slots) if (!index.has(slot.key)) index.set(slot.key, { slot, row, group });
    }
  }
  return index;
}

const TIER_WORD = Object.freeze({ site: "building", region: "area", point: "pin" });

/** What a place chip says, and how it should look. */
export function chipOf(slot) {
  // `cls` is the whole class name: the template's class check reads templates
  // only, so a name assembled there (`...--{{state}}`) would be invisible to it.
  const make = (state, text, tier, pending) => ({ state, text, tier, pending: Boolean(pending), cls: `bi-story__chip--${state}` });
  if (!slot) return make("unbuilt", "No Foundry scene yet", null, false);
  const tier = slot.location?.tier ? (TIER_WORD[slot.location.tier] ?? slot.location.tier) : null;
  switch (slot.state) {
    case "pending-new": return make(slot.state, `${slot.location?.name ?? "New place"} (new)`, tier, true);
    case "gap": return make(slot.state, "No place yet", null, slot.pending);
    case "broken": return make(slot.state, `${slot.locationId} (no such location)`, null, slot.pending);
    case "offmap": return make(slot.state, slot.offMapReason && slot.offMapReason !== "scattered" ? `Off the map: ${offMapLabel(slot.offMapReason)}` : "Off the map", null, slot.pending);
    default: return make(slot.state, slot.location?.name ?? slot.locationId, tier, slot.pending);
  }
}

const OPTION_KIND_WORD = Object.freeze({
  free: "each player chooses",
  together: "the party chooses as one",
  arrive: "each player chooses how they arrive",
  muster: "everyone goes",
  sent: "the story sends them"
});

/** "11 scenes · 2 without a place · 1 waiting to be pulled" -- the count line under a group's title. */
export function groupSummary(counts) {
  const parts = [`${counts.scenes} scene${counts.scenes === 1 ? "" : "s"}`];
  if (counts.gaps) parts.push(`${counts.gaps} without a place`);
  if (counts.optionGaps) parts.push(`${counts.optionGaps} option${counts.optionGaps === 1 ? "" : "s"} without a place`);
  if (counts.pointGaps) parts.push(`${counts.pointGaps} travel point${counts.pointGaps === 1 ? "" : "s"} empty`);
  if (counts.approximate) parts.push(`${counts.approximate} approximate`);
  if (counts.pending) parts.push(`${counts.pending} waiting to be pulled`);
  return parts.join(" · ");
}

/**
 * @param story    core/siting.mjs#buildStory's result
 * @param ui       { openGroups: Set, openRows: Set, onlyGaps: boolean, editing: string|null, focused: string|null }
 */
export function storyLines(story, { openGroups = new Set(), openRows = new Set(), onlyGaps = false, editing = null, focused = null } = {}) {
  const lines = [];
  const slotLine = (slot, role, depth, extra = {}) => {
    lines.push({
      type: "slot",
      key: slot.key,
      slotKey: slot.key,
      role,
      depth,
      roleClass: `bi-story__slot--${role}`,
      depthClass: `bi-story__line--d${depth}`,
      label: slot.label,
      chip: chipOf(slot),
      focusable: Boolean(slot.locationId && slot.location && !slot.location.pending),
      editing: editing === slot.key,
      focused: focused === slot.key,
      note: slot.note ?? null,
      blurb: slot.blurb ?? null,
      mode: slot.mode ?? null,
      partyState: slot.partyState ?? null,
      mystery: Boolean(slot.mystery),
      ...extra
    });
    if (editing === slot.key) lines.push({ type: "editor", key: `editor:${slot.key}`, slotKey: slot.key, label: slot.label, depth: depth + 1, depthClass: `bi-story__line--d${depth + 1}` });
  };
  const isGap = (slot) => slot.state === "gap" || slot.state === "broken";

  for (const group of story.groups) {
    const rows = onlyGaps ? group.rows.filter((r) => r.gaps > 0 || r.sceneGap) : group.rows;
    if (onlyGaps && !rows.length) continue;
    const open = onlyGaps || openGroups.has(group.id);
    lines.push({
      type: "group",
      key: group.id,
      groupId: group.id,
      kind: group.kind,
      title: group.title,
      subtitle: group.subtitle,
      summary: groupSummary(group.counts),
      open,
      flagged: group.counts.gaps > 0 || group.counts.optionGaps > 0,
      counts: group.counts
    });
    if (!open) continue;

    for (const row of rows) {
      const rowOpen = (onlyGaps && row.hasChildren && row.gaps > 0) || openRows.has(row.key);
      const place = row.place;
      lines.push({
        type: "scene",
        key: row.key,
        rowKey: row.key,
        groupId: group.id,
        order: row.order,
        title: row.title,
        when: row.when,
        status: row.status,
        statusClass: row.status ? `bi-story__status--${row.status}` : "",
        hasChildren: row.hasChildren,
        open: rowOpen,
        chip: chipOf(place),
        slotKey: place?.key ?? null,
        focusable: Boolean(place?.locationId && place.location && !place.location.pending),
        editing: Boolean(place) && editing === place.key,
        focused: Boolean(place) && focused === place.key,
        gap: row.sceneGap,
        unbuilt: row.unbuilt,
        gaps: row.gaps,
        optionCount: row.options?.items.length ?? 0,
        note: place?.note ?? null,
        missingBrief: !row.hasBrief
      });
      if (place && editing === place.key) lines.push({ type: "editor", key: `editor:${place.key}`, slotKey: place.key, label: `${row.title}: ${place.label}`, depth: 2, depthClass: "bi-story__line--d2" });
      if (!rowOpen) continue;

      const keep = (slot) => !onlyGaps || isGap(slot);
      for (const room of row.rooms.filter(keep)) slotLine(room, "room", 2);
      if (row.options) {
        const items = row.options.items.filter(keep);
        const then = row.options.then && keep(row.options.then) ? row.options.then : null;
        if (items.length || then) {
          lines.push({
            type: "header",
            key: `options:${row.key}`,
            depth: 2,
            depthClass: "bi-story__line--d2",
            text: row.options.question ?? "Where next?",
            detail: OPTION_KIND_WORD[row.options.kind] ?? row.options.kind,
            count: row.options.items.length
          });
          for (const item of items) slotLine(item, "option", 3);
          if (then) slotLine(then, "then", 3);
        }
      }
      for (const position of row.positions.filter(keep)) slotLine(position, "position", 2);
      for (const offered of (row.offeredIn ?? []).filter(keep)) slotLine(offered, "offered", 2);
    }
  }
  return lines;
}
