/**
 * Where a token stands for a place the editor knows only as a drawing (design/location-editor.md section 16).
 *
 * A place that exists has a stand-point in its file (`derived.centroidPx`), which the game's travel code walks tokens to. A place the GM has drawn in the editor but
 * not yet pulled has no file, only the "create" record that carries its geometry; until `npm run locations` mints it, the Journeys tab needs a point for it all the
 * same, so a journey to a pin dropped a minute ago can be shown and judged. The point is worked out the way the pull will work it out: a pin is its own point, a
 * building is the centre of its outline.
 */

import { ringCentroid } from "./location-editor.mjs";

/** The `{ x, y }` (map-image pixels) a "create" record stands for, or null when its geometry says nothing usable. */
export function pointForCreateRecord(record) {
  const geometry = record?.geometry;
  if (!geometry) return null;
  const point = geometry.point;
  if (Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)) return { x: point[0], y: point[1] };
  const shell = geometry.rings?.[0];
  if (Array.isArray(shell) && shell.length >= 3) {
    const centre = ringCentroid(shell.map(([x, y]) => ({ x, y })));
    if (centre && Number.isFinite(centre.x) && Number.isFinite(centre.y)) return centre;
  }
  return null;
}

/** `{ [recordId]: { x, y } }` for every "create" record that has a point; the rest are simply absent (their journeys say "no point yet"). */
export function pointsForPendingCreates(createRecords) {
  const out = {};
  for (const record of createRecords ?? []) {
    const point = pointForCreateRecord(record);
    if (point && record?.id) out[record.id] = point;
  }
  return out;
}

/** The fields a pin dropped from the Story tab is born with: its name, a kind that says what it is, and the note the pull requires, so one confirm is enough. */
export function quickPinFields({ name, note, scene = null, base }) {
  const trimmed = String(name ?? "").trim();
  const why = String(note ?? "").trim();
  return {
    ...base,
    name: trimmed || null,
    kind: "meeting point",
    depth: "named",
    note: why || `A pin dropped in the Location Editor${scene ? ` for ${scene}` : ""}, where the tokens stand.`
  };
}

/** A name for a pin when the GM does not give one: the scene it is for, in words that read as a place on the map. */
export function defaultPinName(rowTitle, slotLabel) {
  const title = String(rowTitle ?? "").trim();
  const role = String(slotLabel ?? "").trim().toLowerCase();
  if (!title) return "Meeting point";
  if (!role || role === "happens at") return `${title} (meeting point)`;
  return `${title}: ${role} (meeting point)`;
}
