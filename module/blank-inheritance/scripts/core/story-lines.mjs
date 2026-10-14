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
import { legBadge, SEVERITY } from "./journey-checks.mjs";

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

/** One journey as the words and flags a line shows (core/journey-checks.mjs#legBadge, plus whether it is on the map or playing now). */
export function legInfo(leg, result, { shownLegIds = null, playingLegIds = null } = {}) {
  const badge = legBadge(result);
  return {
    id: leg.id,
    kind: leg.kind,
    label: leg.label,
    status: badge.status,
    statusText: badge.statusText,
    distance: badge.distance,
    time: badge.time,
    realTime: badge.realTime ?? "",
    modes: badge.modes,
    worst: badge.worst,
    worstClass: badge.worst ? `bi-story__leg--${badge.worst}` : "",
    watchable: badge.status === "routed",
    shown: Boolean(shownLegIds?.has(leg.id)),
    playing: Boolean(playingLegIds?.has(leg.id))
  };
}

/** The worst severity among some, or null. */
const worstOf = (severities) => severities.reduce((w, s) => (s && SEVERITY[s] > (SEVERITY[w] ?? 0) ? s : w), null);

/**
 * @param story    core/siting.mjs#buildStory's result
 * @param ui       { openGroups: Set, openRows: Set, onlyGaps: boolean, editing: string|null, focused: string|null,
 *                   journey: { model, analysis } | null (the journeys of the story: legs are drawn between the scenes and by the options),
 *                   routes: boolean (draw them; default true when there are journeys), shownLegIds: Set, playingLegIds: Set }
 */
export function storyLines(story, { openGroups = new Set(), openRows = new Set(), onlyGaps = false, editing = null, focused = null, journey = null, routes = true, shownLegIds = null, playingLegIds = null } = {}) {
  const lines = [];
  const legUi = { shownLegIds, playingLegIds };
  const legsOf = (slot) => (journey ? (journey.model.legsBySlot.get(slot.key) ?? []) : []);
  // what is wrong with a place as somewhere to stand (in the water, say), judged once however many journeys touch it; notes are not flagged
  const placeProblem = (slot) => {
    const found = journey?.analysis.places.get(slot?.key)?.issues.filter((i) => i.severity !== "info") ?? [];
    const worst = worstOf(found.map((i) => i.severity));
    return { placeProblem: worst, placeProblemText: found.find((i) => i.severity === worst)?.text ?? null };
  };
  const slotLine = (slot, role, depth, extra = {}) => {
    const legs = routes ? legsOf(slot).map((leg) => legInfo(leg, journey.analysis.legs.get(leg.id), legUi)) : [];
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
      legs: legs.length === 1 ? legs : [],
      legSummary: legs.length > 1 ? { count: legs.length, worst: worstOf(legs.map((l) => l.worst)), worstClass: worstOf(legs.map((l) => l.worst)) ? `bi-story__leg--${worstOf(legs.map((l) => l.worst))}` : "", firstLegId: legs[0].id, watchable: legs.some((l) => l.watchable) } : null,
      ...placeProblem(slot),
      ...extra
    });
    if (editing === slot.key) lines.push({ type: "editor", key: `editor:${slot.key}`, slotKey: slot.key, label: slot.label, depth: depth + 1, depthClass: `bi-story__line--d${depth + 1}` });
  };
  const isGap = (slot) => slot.state === "gap" || slot.state === "broken";
  // "Only problems": a slot with no place, a place no token can stand at, or a journey that cannot be walked
  const legError = (leg) => legBadge(journey?.analysis.legs.get(leg.id)).worst === "error";
  const isProblem = (slot) => isGap(slot) || (Boolean(journey) && (placeProblem(slot).placeProblem !== null || legsOf(slot).some(legError)));
  const rowProblem = (row) => row.gaps > 0 || row.sceneGap || (Boolean(journey) && (
    placeProblem(row.place).placeProblem !== null
    || (journey.model.legBeforeRow.has(row.key) && legError(journey.model.legBeforeRow.get(row.key)))
    || [...(row.options?.items ?? []), row.options?.then].filter(Boolean).some(isProblem)));

  for (const group of story.groups) {
    const rows = onlyGaps ? group.rows.filter(rowProblem) : group.rows;
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
      const rowOpen = (onlyGaps && row.hasChildren && (row.gaps > 0 || rowProblem(row))) || openRows.has(row.key);
      const place = row.place;
      // the way the party gets here from the scene before, drawn between the two
      const arriving = routes && journey ? journey.model.legBeforeRow.get(row.key) : null;
      if (arriving) {
        const info = legInfo(arriving, journey.analysis.legs.get(arriving.id), legUi);
        if (!onlyGaps || info.worst === "error") lines.push({ type: "leg", key: `leg:${arriving.id}`, legId: arriving.id, depth: 0, depthClass: "bi-story__line--d0", ...info });
      }
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
        missingBrief: !row.hasBrief,
        ...placeProblem(place)
      });
      if (place && editing === place.key) lines.push({ type: "editor", key: `editor:${place.key}`, slotKey: place.key, label: `${row.title}: ${place.label}`, depth: 2, depthClass: "bi-story__line--d2" });
      if (!rowOpen) continue;

      const keep = (slot) => !onlyGaps || isProblem(slot);
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
