/**
 * Which places the story uses, and by what (design/location-editor.md section 16): the index behind the Location Editor's Places tab and its "move all uses".
 *
 * A place in the story is whatever a slot of core/siting.mjs holds: where a scene happens, where a room of it is, where the party stands as a scene opens and closes,
 * an option the players may choose, a muster. The same building is often all of them (the Candidate Gate is where a scene happens AND where everyone is mustered AND
 * where a way of arriving ends), so changing "the Gate" by hand means finding five slots. This lists them by place, and turns "move everything at X to Y" into the
 * exact writes that do it.
 *
 * Pure: it reads the Story (placements still waiting to be pulled already laid over it) and answers; it writes nothing.
 */

import { slotIndex } from "./story-lines.mjs";

const ROLE_LABEL = Object.freeze({
  scene: "where the scene happens",
  room: "a room of the scene",
  position: "where the party stands",
  option: "an option the players choose",
  then: "where everyone musters",
  offered: "an option that leads here"
});
export const roleLabel = (role) => ROLE_LABEL[role] ?? role;

/** Every slot of the story once, with the row and group it is in and what part it plays: `[{ slot, row, group, role }]`. */
export function slotsOfStory(story) {
  const seen = new Set();
  const out = [];
  const add = (slot, row, group, role) => {
    if (!slot || seen.has(slot.key)) return;
    seen.add(slot.key);
    out.push({ slot, row, group, role });
  };
  for (const group of story?.groups ?? []) {
    for (const row of group.rows) {
      add(row.place, row, group, "scene");
      for (const room of row.rooms) add(room, row, group, "room");
      for (const position of row.positions) add(position, row, group, "position");
      for (const item of row.options?.items ?? []) add(item, row, group, "option");
      add(row.options?.then, row, group, "then");
      for (const offered of row.offeredIn ?? []) add(offered, row, group, "offered");
    }
  }
  return out;
}

/** The key a place is indexed by: its id, or `new:<record>` for one drawn and not yet pulled. */
export const placeKey = (slot) => (slot.locationId ?? (slot.viaRecord ? `new:${slot.viaRecord}` : null));

/**
 * Every place the story uses, most used first: `[{ key, locationId, viaRecord, name, tier, kind, broken, uses, scenes, choices, groups, pending }]`.
 * A use is `{ slotKey, rowKey, groupId, groupTitle, rowTitle, role, roleLabel, label, pending, deployedLocationId, target }`.
 * A slot with no place (a gap, or off the map by design) is not a use of anything.
 */
export function buildPlacesIndex(story, { locations = {} } = {}) {
  const entries = new Map();
  for (const { slot, row, group, role } of slotsOfStory(story)) {
    const key = placeKey(slot);
    if (!key) continue;
    let entry = entries.get(key);
    if (!entry) {
      const known = slot.locationId ? locations[slot.locationId] : null;
      entry = {
        key, locationId: slot.locationId ?? null, viaRecord: slot.viaRecord ?? null,
        name: slot.location?.name ?? known?.name ?? slot.locationId ?? "(unnamed)", tier: slot.location?.tier ?? known?.tier ?? null, kind: slot.location?.kind ?? known?.kind ?? "",
        broken: slot.state === "broken", uses: [], scenes: 0, choices: 0, groups: [], pending: false
      };
      entries.set(key, entry);
    }
    entry.uses.push({
      slotKey: slot.key, rowKey: row.key, groupId: group.id, groupTitle: group.title, rowTitle: row.title, role, roleLabel: roleLabel(role), label: slot.label,
      pending: Boolean(slot.pending), deployedLocationId: slot.deployedLocationId ?? null, target: slot.target
    });
    if (role === "scene" || role === "room") entry.scenes++;
    else entry.choices++;
    if (!entry.groups.includes(group.id)) entry.groups.push(group.id);
    if (slot.pending) entry.pending = true;
  }
  return [...entries.values()].sort((a, b) => b.uses.length - a.uses.length || String(a.name).localeCompare(String(b.name)));
}

/** The index narrowed by what was typed (a name, an id or a scene title) and, optionally, to places used in more than one slot. */
export function filterPlaces(index, { query = "", shared = false } = {}) {
  const q = String(query ?? "").trim().toLowerCase();
  return index.filter((entry) => {
    if (shared && entry.uses.length < 2) return false;
    if (!q) return true;
    return String(entry.name).toLowerCase().includes(q) || String(entry.locationId ?? "").toLowerCase().includes(q) || entry.uses.some((u) => String(u.rowTitle).toLowerCase().includes(q) || String(u.label).toLowerCase().includes(q));
  });
}

/**
 * "Move everything at X to Y": the writes that do it. `slotKeys` are the slots the GM ticked; `choice` is where they go: `{ locationId }` for a place that exists,
 * `{ viaRecord }` for one drawn but not pulled, `{ offMap }` for off the map. Returns `{ writes, skipped }`: each write is what one "site" record needs
 * (`{ key, target, label, rowTitle, before, beforeVia, isScene }`, `before` being what the editor sees there now, as the pull checks it against the repo), and a
 * slot that is not in the story, or is already at the destination, is `skipped` with the reason.
 */
export function bulkMovePlan(story, { slotKeys, choice }) {
  const index = slotIndex(story);
  const writes = [];
  const skipped = [];
  for (const key of slotKeys ?? []) {
    const entry = index.get(key);
    if (!entry) { skipped.push({ key, reason: "not in the story" }); continue; }
    const { slot, row } = entry;
    const there = choice.offMap ? (!slot.locationId && slot.offMapReason === choice.offMap)
      : choice.locationId ? slot.locationId === choice.locationId
        : choice.viaRecord ? slot.viaRecord === choice.viaRecord : false;
    if (there) { skipped.push({ key, reason: "already there" }); continue; }
    writes.push({
      key, target: slot.target, label: `${row.title} · ${slot.label}`, rowTitle: row.title,
      before: slot.locationId ?? null, beforeVia: slot.location?.pending ? slot.viaRecord : null, isScene: slot.target.kind === "scene"
    });
  }
  return { writes, skipped };
}

/**
 * A short string that changes whenever any slot's place changes, and only then: what a cached analysis of the journeys is keyed by. Two stories with the same
 * signature have the same places in the same slots, so the same journeys.
 */
export function placementSignature(story) {
  return slotsOfStory(story)
    .map(({ slot }) => `${slot.key}=${slot.locationId ?? ""}|${slot.viaRecord ?? ""}|${slot.offMapReason ?? ""}|${slot.state}`)
    .join(";");
}
