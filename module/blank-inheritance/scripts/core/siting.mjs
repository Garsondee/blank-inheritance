/**
 * Where the story happens -- the pure half of the Location Editor's Story list
 * (design/location-editor.md §12). Reads the campaign's own scene data and
 * answers, per Episode and for the Haunts: which scene is where, in play
 * order, what has no place yet, what the players get to choose between, and
 * what a change would touch.
 *
 * Pure: no Foundry globals, no filesystem. foundry/location-story.mjs fetches
 * the documents; tools/location-sync/siting.mjs reads and writes the same
 * documents on disk. Both call the functions here, so what the panel shows as
 * "pending" and what the pull later writes can never disagree.
 *
 * THE PLACES A SCENE CAN HAVE, and where each lives (each is a "slot", named by
 * a "target"):
 *   scene        `scenes[id].locationRef` in data/campaign/scene-set.json: where
 *                the scene happens, and where its marker stands on the map.
 *                Rooms inside a scene (kind "sub") are scenes of their own here.
 *   destination  `outro.departure.destinations[id].placeRef` in a scene brief:
 *                one place the players may choose to go to next. A rest at a
 *                haunt, a way of arriving, an afternoon's menu. Also the
 *                departure's `then` muster and a departure-level `placeRef`.
 *   position     `intro|outro.position.locationRef` in a scene brief: where the
 *                party stands when the scene opens and closes, the two ends of
 *                the travel leg the Scene Runner animates.
 *
 * Nothing here ever invents a place. A slot with nothing in it is a GAP, said
 * plainly, never a guess.
 */

export const TARGET_KINDS = Object.freeze(["scene", "destination", "position"]);

/** `destinationId` values that mean something other than one of `destinations[]`. */
export const THEN = "$then";
export const DEPARTURE = "$departure";

const POSITIONS = Object.freeze(["intro", "outro"]);

/**
 * Why a scene may have no place on the map, and be finished all the same. Each
 * is a real situation, not an excuse: a scene that happens nowhere the campaign
 * map can show is complete without a location, and saying WHY keeps "nowhere
 * on purpose" apart from "nobody has looked yet". Stored on the scene's own
 * Scene Set entry as `offMap: { reason }`.
 */
export const OFF_MAP_REASONS = Object.freeze([
  { id: "view-from-above", label: "A view from above", hint: "Narration over a picture; nobody stands anywhere." },
  { id: "in-transit", label: "On the move", hint: "Aboard a train, ferry, vehicle or Frame; there is no fixed place." },
  { id: "everywhere", label: "Wherever they are", hint: "The scene happens wherever each player already is." },
  { id: "separate-places", label: "Each in a different place", hint: "The party is split across places that are set at the table." },
  { id: "players-choose", label: "Wherever the players choose", hint: "The place is the players' own choice, made in play." },
  { id: "remote", label: "A call, message or broadcast", hint: "Voices and screens; the people are elsewhere." },
  { id: "virtual", label: "Inside a system or a simulation", hint: "A network, a drill, a trance: no physical place." },
  { id: "memory", label: "A memory or flashback", hint: "A place that no longer exists, or never did on this map." },
  { id: "vision", label: "A dream or vision", hint: "Not a place the party can go." },
  { id: "off-world", label: "Off the world", hint: "Orbit, a ship, another world: past the edge of any city map." },
  { id: "another-map", label: "On another map", hint: "An expedition or a far place with a map of its own." },
  { id: "at-sea", label: "Open water", hint: "Beyond the coast the map covers." },
  { id: "underground", label: "Below the map", hint: "Tunnels and depths the map does not show." },
  { id: "unknown", label: "A place the party cannot name yet", hint: "Secret or undiscovered; it earns a location when it is revealed." },
  { id: "everyone-knows-it-as", label: "Not one place, a whole area", hint: "Spread across a district or the whole city; use an area instead if one fits." },
  { id: "within-parent", label: "Inside the place its scene already has", hint: "A room or a beat of a scene that is already placed." },
  { id: "out-of-character", label: "Out of character", hint: "Induction, recap, the table talking: no place in the fiction." },
  { id: "abstract", label: "A menu or a montage", hint: "Downtime, a board, a list of choices: a screen, not a place." }
]);
const offMapIds = new Set(OFF_MAP_REASONS.map((r) => r.id));
export const isOffMapReason = (id) => typeof id === "string" && offMapIds.has(id);
export const offMapLabel = (id) => OFF_MAP_REASONS.find((r) => r.id === id)?.label ?? id;
const isString = (v) => typeof v === "string" && v.length > 0;
const isLocationId = (v) => typeof v === "string" && /^[a-z0-9][a-z0-9-]*$/.test(v);

/* ------------------------------------------------------------------ */
/*  Targets                                                             */
/* ------------------------------------------------------------------ */

/** Is this a well-formed target (the address of one slot)? */
export function validTarget(t) {
  if (!t || typeof t !== "object") return false;
  if (t.kind === "scene") return isString(t.sceneSetId);
  if (t.kind === "destination") return isString(t.briefRef) && isString(t.destinationId);
  if (t.kind === "position") return isString(t.briefRef) && POSITIONS.includes(t.which);
  return false;
}

/** A stable string for a target: the key everything (pending maps, open rows, records) is looked up by. */
export function targetKey(t) {
  if (!validTarget(t)) throw new Error(`not a target: ${JSON.stringify(t)}`);
  if (t.kind === "scene") return `scene:${t.sceneSetId}`;
  if (t.kind === "destination") return `destination:${t.briefRef}:${t.destinationId}`;
  return `position:${t.briefRef}:${t.which}`;
}

/** The target for one scene-set entry. */
export const sceneTarget = (sceneSetId) => ({ kind: "scene", sceneSetId });
export const destinationTarget = (briefRef, destinationId) => ({ kind: "destination", briefRef, destinationId });
export const positionTarget = (briefRef, which) => ({ kind: "position", briefRef, which });

/* ------------------------------------------------------------------ */
/*  Reading and writing one slot in the raw documents                   */
/*                                                                      */
/*  `docs` is { sceneSet, briefs: { [briefId]: brief }, episodes: [] }. */
/* ------------------------------------------------------------------ */

function departureOf(docs, briefRef) {
  const departure = docs.briefs?.[briefRef]?.outro?.departure;
  return departure && typeof departure === "object" ? departure : null;
}

/** `{ exists, value }`: whether the slot is there at all in the documents, and the location id in it (null when empty). */
export function readSlot(docs, target) {
  if (target.kind === "scene") {
    const entry = (docs.sceneSet?.scenes ?? []).find((s) => s.id === target.sceneSetId);
    return { exists: Boolean(entry), value: entry?.locationRef ?? null, offMap: entry?.offMap?.reason ?? null };
  }
  if (target.kind === "position") {
    const position = docs.briefs?.[target.briefRef]?.[target.which]?.position;
    return { exists: Boolean(position && typeof position === "object"), value: position?.locationRef ?? null };
  }
  const departure = departureOf(docs, target.briefRef);
  if (!departure) return { exists: false, value: null };
  if (target.destinationId === THEN) {
    return { exists: Boolean(departure.then && typeof departure.then === "object"), value: departure.then?.placeRef ?? null };
  }
  if (target.destinationId === DEPARTURE) return { exists: true, value: departure.placeRef ?? null };
  const destination = (departure.destinations ?? []).find((d) => d?.id === target.destinationId);
  return { exists: Boolean(destination), value: destination?.placeRef ?? null };
}

/**
 * Put `locationId` into a slot, in place. Returns `{ ok, before }` or
 * `{ ok: false, error }`. Never creates structure: a slot that is not already
 * there is an error, because inventing a destination or a travel position would
 * be inventing story (which state is the party in? who may go?).
 */
export function writeSlot(docs, target, locationId) {
  if (locationId !== null && !isLocationId(locationId)) return { ok: false, error: `not a location id: ${JSON.stringify(locationId)}` };
  const current = readSlot(docs, target);
  if (!current.exists) return { ok: false, error: `no such slot: ${targetKey(target)}` };
  // Writing what is already there changes nothing, not even by adding an empty key.
  if (current.value === locationId) return { ok: true, before: current.value };
  if (target.kind === "scene") {
    const entry = docs.sceneSet.scenes.find((s) => s.id === target.sceneSetId);
    entry.locationRef = locationId;
  } else if (target.kind === "position") {
    docs.briefs[target.briefRef][target.which].position.locationRef = locationId;
  } else {
    const departure = departureOf(docs, target.briefRef);
    if (target.destinationId === THEN) departure.then.placeRef = locationId;
    else if (target.destinationId === DEPARTURE) departure.placeRef = locationId;
    else departure.destinations.find((d) => d?.id === target.destinationId).placeRef = locationId;
  }
  return { ok: true, before: current.value };
}

/**
 * Apply one siting to the documents, in place -- the whole effect of a "site"
 * record, shared by the repo-side pull. For a scene it also settles what the
 * placement used to say: `approximate` is cleared (the GM has chosen) and
 * `locationNote`, which records WHY a scene sits where it does, is replaced
 * rather than left to describe a place the scene no longer has.
 *
 * Returns `{ ok, before, changed: ["sceneSet" | "brief:<id>"] }`, or
 * `{ ok: false, error }`.
 */
export function applySiting(docs, target, locationId, { note = null, date = null, locationName = null, offMap = null } = {}) {
  if (offMap && (target.kind !== "scene" || locationId !== null || !isOffMapReason(offMap))) return { ok: false, error: `cannot mark ${targetKey(target)} off the map as ${JSON.stringify(offMap)}` };
  const wrote = writeSlot(docs, target, locationId);
  if (!wrote.ok) return wrote;
  if (target.kind !== "scene") return { ok: true, before: wrote.before, changed: [`brief:${target.briefRef}`] };
  const entry = docs.sceneSet.scenes.find((s) => s.id === target.sceneSetId);
  delete entry.approximate;
  const wasOff = entry.offMap?.reason ?? null;
  if (offMap) entry.offMap = { reason: offMap };
  else delete entry.offMap;
  const trimmed = typeof note === "string" ? note.trim() : "";
  if (trimmed) entry.locationNote = trimmed;
  else if (offMap && wasOff !== offMap) {
    entry.locationNote = `Marked off the map (${offMapLabel(offMap)}) in the Location Editor${date ? ` on ${date}` : ""}; it was ${wrote.before ?? "unplaced"}.`;
  }
  else if (!offMap && wrote.before !== locationId) {
    const where = locationName ? `${locationName} (${locationId ?? "no place"})` : (locationId ?? "no place");
    entry.locationNote = `Placed at ${where} in the Location Editor${date ? ` on ${date}` : ""}; it was ${wrote.before ?? "unplaced"}. The earlier reasoning is in git history.`;
  }
  return { ok: true, before: wrote.before, changed: ["sceneSet"] };
}

/* ------------------------------------------------------------------ */
/*  The Story: episodes and haunts, scene by scene                      */
/* ------------------------------------------------------------------ */

/** A scene-set entry is a room of a scene, not a scene. */
const isRoom = (entry) => entry.kind === "sub";

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

function whenText(scene) {
  const parts = [];
  if (Number.isFinite(scene.day)) parts.push(`Day ${scene.day}`);
  if (scene.quarter) parts.push(scene.quarter);
  return parts.join(" · ");
}

/** What a slot's value means. `offmap` is a place that is deliberately nowhere; it is never counted as a gap. */
export function slotState({ locationId, location, approximate = false, offmapByDesign = false, pendingNew = false }) {
  if (pendingNew) return "pending-new";
  if (!locationId) return offmapByDesign ? "offmap" : "gap";
  if (!location) return "broken";
  return approximate ? "approximate" : "ok";
}

const COUNTED_AS_GAP = new Set(["gap", "broken"]);

/**
 * The Story list's data. `locations` maps a location id to `{id, name, tier,
 * kind}` (every deployed location, drawable or not). `overrides` maps a
 * target key to what the GM has chosen but the repo has not yet received:
 * `{ locationId, recordId }` or `{ viaRecord, recordId }`; `newLocations`
 * maps a record id to `{name, tier}` for a location drawn but not yet pulled.
 *
 * Returns `{ groups, totals }`. A group is `{ id, kind: "episode"|"haunts"|"other",
 * title, subtitle, rows, counts }`; a row is one scene with its `place` slot,
 * `rooms`, `positions`, `options` and (haunts) `offeredIn`.
 */
export function buildStory(docs, { locations = {}, overrides = {}, newLocations = {} } = {}) {
  const sceneSet = docs.sceneSet?.scenes ?? [];
  const briefs = docs.briefs ?? {};
  const used = new Set();

  const slot = (target, { label, extra = {}, approximate = false, offmapByDesign = false }) => {
    const key = targetKey(target);
    const read = readSlot(docs, target);
    const override = overrides[key] ?? null;
    let locationId = read.value;
    let pendingNew = false;
    let newName = null;
    let offMapReason = read.offMap ?? (offmapByDesign ? (target.kind === "scene" ? "view-from-above" : "scattered") : null);
    if (override) {
      offMapReason = override.offMap ?? null;
      if (override.locationId !== undefined && override.locationId !== null) locationId = override.locationId;
      else if (override.locationId === null && !override.viaRecord) locationId = null;
      if (override.viaRecord) {
        const fresh = newLocations[override.viaRecord];
        if (fresh) { pendingNew = true; newName = fresh.name ?? "(unnamed)"; locationId = null; }
      }
    }
    const location = locationId ? (locations[locationId] ?? null) : null;
    const state = slotState({ locationId, location, approximate: approximate && !override, offmapByDesign: Boolean(offMapReason), pendingNew });
    return {
      key,
      target,
      label,
      exists: read.exists,
      deployedLocationId: read.value,
      locationId,
      location: pendingNew ? { id: null, name: newName, tier: newLocations[override.viaRecord]?.tier ?? null, kind: "", pending: true } : location,
      pending: Boolean(override),
      recordId: override?.recordId ?? null,
      viaRecord: override?.viaRecord ?? null,
      offMapReason: locationId || pendingNew ? null : offMapReason,
      state,
      ...extra
    };
  };

  const sceneSlot = (entry, label = "Happens at") => {
    used.add(entry.id);
    return slot(sceneTarget(entry.id), {
      label,
      approximate: entry.approximate === true,
      offmapByDesign: entry.kind === "landing" || Boolean(entry.offMap),
      extra: { sceneSetId: entry.id, entryName: entry.name, kind: entry.kind, note: entry.locationNote ?? null }
    });
  };

  const positionSlots = (briefRef) => {
    const brief = briefs[briefRef];
    const out = [];
    for (const which of POSITIONS) {
      const position = brief?.[which]?.position;
      if (!position || typeof position !== "object") continue;
      out.push(slot(positionTarget(briefRef, which), {
        label: which === "intro" ? "Opens at" : "Closes at",
        offmapByDesign: position.state === "scattered",
        extra: { partyState: position.state ?? null, note: position.note ?? null }
      }));
    }
    return out;
  };

  const destinationSlots = (briefRef) => {
    const departure = departureOf(docs, briefRef);
    if (!departure) return null;
    const items = [];
    for (const destination of departure.destinations ?? []) {
      if (!destination || !isString(destination.id)) continue;
      items.push(slot(destinationTarget(briefRef, destination.id), {
        label: destination.label ?? destination.id,
        extra: { destinationId: destination.id, blurb: destination.blurb ?? null, mode: destination.mode ?? null, toBrief: destination.briefRef ?? null, mystery: destination.mystery === true }
      }));
    }
    if (isString(departure.placeRef) || ((departure.destinations ?? []).length === 0 && departure.kind && departure.kind !== "sent")) {
      items.push(slot(destinationTarget(briefRef, DEPARTURE), { label: departure.label ?? "Everyone goes to", extra: { destinationId: DEPARTURE } }));
    }
    const then = departure.then && typeof departure.then === "object"
      ? slot(destinationTarget(briefRef, THEN), { label: departure.then.label ?? "Then everyone musters at", extra: { destinationId: THEN, toBrief: departure.then.briefRef ?? null, thenKind: departure.then.kind ?? "muster" } })
      : null;
    if (!items.length && !then) return null;
    return { kind: departure.kind ?? "sent", question: departure.question ?? null, items, then };
  };

  const makeRow = (key, { order, title, briefRef, status, when, day = null, quarter = null, mainEntry, group }) => {
    const entries = sceneSet.filter((s) => briefRef && s.briefRef === briefRef);
    const main = mainEntry ?? entries.find((s) => !isRoom(s) && s.kind !== "hub") ?? null;
    const rooms = entries.filter((s) => isRoom(s) && s !== main).sort(byOrder);
    const row = {
      key,
      order,
      title,
      briefRef: briefRef ?? null,
      hasBrief: Boolean(briefRef && briefs[briefRef]),
      status: status ?? null,
      when: when ?? "",
      day: Number.isFinite(day) ? day : null,
      quarter: typeof quarter === "string" && quarter ? quarter : null,
      group,
      place: main ? sceneSlot(main) : null,
      rooms: rooms.map((room) => sceneSlot(room, room.name)),
      positions: briefRef ? positionSlots(briefRef) : [],
      options: briefRef ? destinationSlots(briefRef) : null
    };
    row.hasChildren = row.rooms.length > 0 || row.positions.length > 0 || Boolean(row.options);
    const slots = [row.place, ...row.rooms, ...row.positions, ...(row.options?.items ?? []), row.options?.then].filter(Boolean);
    row.gaps = slots.filter((s) => COUNTED_AS_GAP.has(s.state)).length;
    row.sceneGap = !row.place || COUNTED_AS_GAP.has(row.place.state);
    row.unbuilt = !row.place;
    return row;
  };

  const groups = [];

  // Episodes, in play order, each scene in its own order.
  const episodes = [...(docs.episodes ?? [])].sort((a, b) => (a.dayRange?.start ?? Infinity) - (b.dayRange?.start ?? Infinity));
  for (const episode of episodes) {
    const rows = [...(episode.scenes ?? [])].sort(byOrder).map((scene) => makeRow(`scene:${episode.id}:${scene.id}`, {
      order: scene.order,
      title: scene.title ?? scene.id,
      briefRef: scene.briefRef ?? null,
      status: scene.authoring?.status ?? null,
      when: whenText(scene),
      day: scene.day,
      quarter: scene.quarter,
      group: episode.id
    }));
    groups.push({ id: episode.id, kind: "episode", title: episode.title ?? episode.id, subtitle: episode.dayRange ? `Days ${episode.dayRange.start}-${episode.dayRange.end}` : "", rows });
  }

  // Haunts: the places the group keeps coming back to, in the order they are written.
  const haunts = sceneSet.filter((s) => s.group === "haunts").sort(byOrder);
  if (haunts.length) {
    const rows = haunts.map((entry, index) => {
      const row = makeRow(`haunt:${entry.id}`, {
        order: index + 1,
        title: entry.name,
        briefRef: entry.briefRef ?? null,
        status: briefs[entry.briefRef]?.authoring?.status ?? null,
        when: "",
        mainEntry: entry,
        group: "haunts"
      });
      // Where the story offers it: every departure destination that leads to this scene.
      row.offeredIn = [];
      if (entry.briefRef) {
        for (const [briefId, brief] of Object.entries(briefs)) {
          for (const destination of brief?.outro?.departure?.destinations ?? []) {
            if (destination?.briefRef !== entry.briefRef || !isString(destination.id)) continue;
            row.offeredIn.push(slot(destinationTarget(briefId, destination.id), {
              label: `Offered at the end of ${episodeSceneTitle(docs, briefId)}`,
              extra: { destinationId: destination.id, fromBrief: briefId, optionLabel: destination.label ?? destination.id }
            }));
          }
        }
      }
      row.hasChildren = row.hasChildren || row.offeredIn.length > 0;
      row.gaps += row.offeredIn.filter((s) => COUNTED_AS_GAP.has(s.state)).length;
      return row;
    });
    groups.push({ id: "haunts", kind: "haunts", title: "Haunts", subtitle: "Places the group keeps coming back to", rows });
  }

  // Anything with a scene of its own that no episode or haunt list reaches.
  const strays = sceneSet.filter((s) => !used.has(s.id) && !isRoom(s) && s.kind !== "hub").sort(byOrder);
  if (strays.length) {
    groups.push({
      id: "other", kind: "other", title: "Not in any episode", subtitle: "Scenes the Scene Set builds that no episode lists",
      rows: strays.map((entry, index) => makeRow(`other:${entry.id}`, { order: index + 1, title: entry.name, briefRef: entry.briefRef ?? null, mainEntry: entry, group: "other" }))
    });
  }

  const optionGap = (row) => [...(row.options?.items ?? []), row.options?.then].filter(Boolean).filter((s) => COUNTED_AS_GAP.has(s.state)).length;
  for (const group of groups) {
    const rows = group.rows;
    group.counts = {
      scenes: rows.length,
      placed: rows.filter((r) => r.place && !COUNTED_AS_GAP.has(r.place.state) && r.place.state !== "offmap").length,
      offmap: rows.filter((r) => r.place?.state === "offmap").length,
      gaps: rows.filter((r) => r.sceneGap).length,
      approximate: rows.filter((r) => r.place?.state === "approximate").length,
      pending: rows.filter((r) => r.place?.pending).length,
      options: rows.reduce((n, r) => n + (r.options?.items.length ?? 0), 0),
      optionGaps: rows.reduce((n, r) => n + optionGap(r), 0),
      pointGaps: rows.reduce((n, r) => n + r.positions.filter((s) => COUNTED_AS_GAP.has(s.state)).length, 0)
    };
  }
  const totals = groups.reduce((t, g) => {
    for (const k of Object.keys(g.counts)) t[k] = (t[k] ?? 0) + g.counts[k];
    return t;
  }, {});
  return { groups, totals };
}

function episodeSceneTitle(docs, briefRef) {
  for (const episode of docs.episodes ?? []) {
    for (const scene of episode.scenes ?? []) if (scene.briefRef === briefRef) return scene.title ?? scene.id;
  }
  const entry = (docs.sceneSet?.scenes ?? []).find((s) => s.briefRef === briefRef && !isRoom(s));
  return entry?.name ?? docs.briefs?.[briefRef]?.title ?? briefRef;
}

/* ------------------------------------------------------------------ */
/*  Moving things together                                              */
/* ------------------------------------------------------------------ */

/**
 * The other slots that are about the same scene AND currently hold the same
 * place as `target` does -- the ones that agree with it today, and so would
 * disagree tomorrow if only this one moved. A haunt's place is written in its
 * own scene, in the travel points of its brief and in the option that offers it
 * in another scene's departure; moving one and not the rest is the quiet way
 * for a map to stop adding up.
 *
 * Each is `{ target, key, label, value, group, defaultChecked }`. Slots that
 * agree but belong to a different room of the same scene are listed unchecked:
 * a back alley is not always the shop it backs onto.
 */
export function linkedSlots(docs, target, { overrides = {} } = {}) {
  const here = readSlot(docs, target);
  const current = overrides[targetKey(target)]?.locationId ?? here.value;
  if (!current) return [];
  const briefRef = target.kind === "scene"
    ? (docs.sceneSet?.scenes ?? []).find((s) => s.id === target.sceneSetId)?.briefRef ?? null
    : target.briefRef;
  const targetBriefOfDestination = target.kind === "destination" ? readDestinationBrief(docs, target) : null;
  const aboutBrief = target.kind === "destination" ? targetBriefOfDestination : briefRef;
  if (!aboutBrief) return [];
  const out = [];
  const consider = (other, label, group, defaultChecked) => {
    if (targetKey(other) === targetKey(target)) return;
    const slotRead = readSlot(docs, other);
    const value = overrides[targetKey(other)]?.locationId ?? slotRead.value;
    if (!slotRead.exists || value !== current) return;
    out.push({ target: other, key: targetKey(other), label, value, group, defaultChecked });
  };
  for (const entry of docs.sceneSet?.scenes ?? []) {
    if (entry.briefRef !== aboutBrief) continue;
    consider(sceneTarget(entry.id), entry.name, "scene", !isRoom(entry));
  }
  for (const which of POSITIONS) consider(positionTarget(aboutBrief, which), `${episodeSceneTitle(docs, aboutBrief)}: ${which === "intro" ? "opens at" : "closes at"}`, "position", true);
  for (const [briefId, brief] of Object.entries(docs.briefs ?? {})) {
    const departure = brief?.outro?.departure;
    if (!departure) continue;
    for (const destination of departure.destinations ?? []) {
      if (destination?.briefRef === aboutBrief && isString(destination.id)) {
        consider(destinationTarget(briefId, destination.id), `${episodeSceneTitle(docs, briefId)}: option "${destination.label ?? destination.id}"`, "option", true);
      }
    }
    if (departure.then?.briefRef === aboutBrief) consider(destinationTarget(briefId, THEN), `${episodeSceneTitle(docs, briefId)}: then everyone musters`, "option", true);
  }
  return out;
}

function readDestinationBrief(docs, target) {
  const departure = departureOf(docs, target.briefRef);
  if (!departure) return null;
  if (target.destinationId === THEN) return departure.then?.briefRef ?? null;
  if (target.destinationId === DEPARTURE) return departure.briefRef ?? null;
  return (departure.destinations ?? []).find((d) => d?.id === target.destinationId)?.briefRef ?? null;
}

/* ------------------------------------------------------------------ */
/*  Pending sitings, laid over the deployed documents                   */
/* ------------------------------------------------------------------ */

/**
 * `records` are "site" location-edit records not yet merged, oldest first.
 * Returns the `overrides` map buildStory takes: the newest record for each
 * target wins. `resolveVia(recordId)` turns a record that points at a
 * location drawn in the same session into `{ locationId }` (it has been
 * pulled and has a real id) or leaves it for `newLocations` (still pending).
 */
export function overridesFromRecords(records, { resolveVia = () => null } = {}) {
  const overrides = {};
  for (const record of records) {
    if (record?.op !== "site" || !validTarget(record.target)) continue;
    const key = targetKey(record.target);
    if (record.offMap) {
      overrides[key] = { locationId: null, offMap: record.offMap, recordId: record.id };
    } else if (record.viaRecord) {
      const resolved = resolveVia(record.viaRecord);
      overrides[key] = resolved ? { locationId: resolved, recordId: record.id } : { viaRecord: record.viaRecord, recordId: record.id };
    } else {
      overrides[key] = { locationId: record.locationId ?? null, recordId: record.id };
    }
  }
  return overrides;
}

/* ------------------------------------------------------------------ */
/*  Finding a place by name                                             */
/* ------------------------------------------------------------------ */

const lower = (s) => String(s ?? "").toLowerCase();

/**
 * Locations whose name or id match what was typed, best first: a name that
 * starts with it, then a name that contains it, then an id that does.
 * `locations` is the id -> {id, name, tier, kind} map; `extra` are pending new
 * locations `{ recordId, name, tier }`, which carry no id yet.
 */
export function searchPlaces(locations, query, { limit = 8, extra = [], tiers = null } = {}) {
  const q = lower(query).trim();
  if (!q) return [];
  const scored = [];
  const consider = (item, score) => { if (score !== null) scored.push({ item, score }); };
  const scoreOf = (name, id) => {
    const n = lower(name), i = lower(id);
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) return 1;
    if (i && i.includes(q)) return 2;
    return null;
  };
  for (const location of Object.values(locations)) {
    if (tiers && !tiers.includes(location.tier)) continue;
    consider({ id: location.id, recordId: null, name: location.name ?? location.id, tier: location.tier, kind: location.kind ?? "", pending: false }, scoreOf(location.name, location.id));
  }
  for (const fresh of extra) {
    if (tiers && !tiers.includes(fresh.tier)) continue;
    consider({ id: null, recordId: fresh.recordId, name: fresh.name ?? "(unnamed)", tier: fresh.tier, kind: "", pending: true }, scoreOf(fresh.name, ""));
  }
  scored.sort((a, b) => a.score - b.score || String(a.item.name).localeCompare(String(b.item.name)));
  return scored.slice(0, limit).map((s) => s.item);
}
