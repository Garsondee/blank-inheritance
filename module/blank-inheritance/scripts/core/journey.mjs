/**
 * The journey model: which legs the party actually walks, worked out from the Story the Location Editor already has (design/location-editor.md section 16).
 *
 * The campaign moves the party about the map in two ways, and this reads the same two rules the table plays by:
 *
 *   - a CUT: the Scene Runner takes the table from one scene to the next, and when the two scenes are at different places the party's marker walks from one
 *     to the other on the Campaign Map (foundry/travel.mjs `runTravelSequence`, `needsTravel`);
 *   - a DEPARTURE: a scene's `outro.departure` puts the choice to the players ("Where do you spend the night?", "How do you arrive in Kurose?") and the pawns
 *     walk to the place they chose (foundry/city-state.mjs `goCityDeparture`): from the scene's place to each option's place, or, for an arrival, from where each
 *     player came in to the place everyone musters, then on from each option to a `then` place that gathers them again.
 *
 * Both are legs between PLACES, and a place is whatever a slot of the Story holds (core/siting.mjs), pending placements included, so the model describes the
 * journeys as the GM has them in the editor now, not as they were last deployed. This file only works out WHICH legs there are and what each one joins; it never
 * routes anything (core/journey-checks.mjs does that, with a router it is given), so it is pure and quick and the same everywhere.
 *
 * What it deliberately does not model: a scene's rooms (a sub-scene at the same place), and the `position` travel points (`state: split` and its `groups`: no
 * scene uses them yet and nothing in play walks them). Both are still in the Story list to be placed; neither changes a journey today.
 */

const QUARTERS = Object.freeze(["morning", "afternoon", "evening", "night"]);

/** A scene's place on the day: a number that grows with time, or null when the scene has no day. */
export function dayTime(day, quarter) {
  if (!Number.isFinite(day)) return null;
  const q = QUARTERS.indexOf(quarter);
  return day * 4 + (q < 0 ? 0 : q);
}

const endpointOf = (slot, row, label) => ({
  slotKey: slot?.key ?? null,
  rowKey: row?.key ?? null,
  title: row?.title ?? null,
  label: label ?? slot?.label ?? null,
  locationId: slot?.locationId ?? null,
  viaRecord: slot?.viaRecord ?? null,
  state: slot?.state ?? "gap",
  name: slot?.location?.name ?? null,
  tier: slot?.location?.tier ?? null,
  pending: Boolean(slot?.pending),
  offMapReason: slot?.offMapReason ?? null
});

/**
 * @param story  core/siting.mjs#buildStory's result, the GM's waiting placements already laid over it
 * @returns `{ groups, legs, legsBySlot, legBeforeRow }`
 *   groups: one per episode, `{ id, title, kind, stops, legs }`; `stops` are the scenes with a place, in order
 *   legs: every leg, in play order across the groups
 *   legsBySlot: Map slotKey -> the legs that END at that slot (what a slot's line can show)
 *   legBeforeRow: Map rowKey -> the cut that brings the party to that scene
 *
 * A leg is `{ id, kind: "cut" | "option" | "then" | "arrival", groupId, rowKey, label, from, to, mode, settle, timing }`: `from` and `to` are endpoints
 * `{ slotKey, rowKey, title, label, locationId, viaRecord, state, name, tier, pending, offMapReason }`; `settle` is the scene a departure's destination leads to
 * (`{ rowKey, title, locationId, name }`) when that scene happens somewhere of its own; `timing` is the two scenes' days and quarters when both are known.
 */
export function buildJourneyModel(story) {
  const rowsByBrief = new Map();
  for (const group of story?.groups ?? []) for (const row of group.rows) if (row.briefRef && !rowsByBrief.has(row.briefRef)) rowsByBrief.set(row.briefRef, row);

  const groups = [];
  const legs = [];
  const legsBySlot = new Map();
  const legBeforeRow = new Map();

  const addLeg = (group, leg) => {
    group.legs.push(leg);
    legs.push(leg);
    const key = leg.to.slotKey;
    if (key) {
      if (!legsBySlot.has(key)) legsBySlot.set(key, []);
      legsBySlot.get(key).push(leg);
    }
    return leg;
  };

  const timingOf = (a, b) => {
    const from = dayTime(a?.day, a?.quarter);
    const to = dayTime(b?.day, b?.quarter);
    return from === null || to === null ? null : { from: { day: a.day, quarter: a.quarter, t: from }, to: { day: b.day, quarter: b.quarter, t: to } };
  };

  for (const source of story?.groups ?? []) {
    if (source.kind !== "episode") continue;
    const group = { id: source.id, title: source.title, kind: source.kind, stops: [], legs: [] };
    groups.push(group);
    const rows = source.rows;
    for (const row of rows) if (row.place) group.stops.push({ rowKey: row.key, slotKey: row.place.key, title: row.title, order: row.order, day: row.day ?? null, quarter: row.quarter ?? null, when: row.when, slot: row.place });

    // Scenes the party reaches by a departure, whose way on is the departure's own `then`: the cut out of such a scene is not a leg of its own.
    const coveredByThen = new Set();
    for (const row of rows) {
      const options = row.options;
      if (!options?.then?.toBrief) continue;
      for (const item of options.items) {
        const target = item.toBrief ? rowsByBrief.get(item.toBrief) : null;
        if (target && target.key !== row.key) coveredByThen.add(target.key);
      }
    }

    rows.forEach((row, index) => {
      const here = endpointOf(row.place, row);
      const options = row.options;

      if (options && (options.items.length || options.then)) {
        const sameBrief = new Map();
        for (const item of options.items) if (item.toBrief) sameBrief.set(item.toBrief, (sameBrief.get(item.toBrief) ?? 0) + 1);
        const settleOf = (slot, toBrief) => {
          if (!toBrief || (sameBrief.get(toBrief) ?? 0) > 1) return null; // a rotation scene is played at every one of its destinations on purpose
          const target = rowsByBrief.get(toBrief);
          if (!target?.place?.locationId) return null;
          return { rowKey: target.key, title: target.title, locationId: target.place.locationId, name: target.place.location?.name ?? null, slotKey: target.place.key };
        };
        const targetRowOf = (toBrief) => (toBrief ? rowsByBrief.get(toBrief) ?? null : null);
        const then = options.then;
        const thenEnd = then ? endpointOf(then, row, then.label) : null;

        for (const item of options.items) {
          const itemEnd = endpointOf(item, row, item.label);
          const targetRow = targetRowOf(item.toBrief);
          if (options.kind === "arrive") {
            // Each player appears where they came in, then everyone walks to the muster.
            if (thenEnd) {
              addLeg(group, {
                id: `leg:arrival:${item.key}`, kind: "arrival", groupId: group.id, rowKey: row.key,
                label: `${item.label} → ${then.label}`, from: itemEnd, to: thenEnd, mode: item.mode ?? null,
                settle: settleOf(then, then.toBrief), timing: timingOf(row, targetRowOf(then.toBrief))
              });
            }
          } else {
            addLeg(group, {
              id: `leg:option:${item.key}`, kind: "option", groupId: group.id, rowKey: row.key,
              label: `${row.title}: ${item.label}`, from: here, to: itemEnd, mode: item.mode ?? null,
              settle: settleOf(item, item.toBrief), timing: timingOf(row, targetRow)
            });
            if (thenEnd) {
              addLeg(group, {
                id: `leg:then:${item.key}`, kind: "then", groupId: group.id, rowKey: row.key,
                label: `${item.label} → ${then.label}`, from: itemEnd, to: thenEnd, mode: null,
                settle: settleOf(then, then.toBrief), timing: timingOf(targetRow, targetRowOf(then.toBrief))
              });
            }
          }
        }
        return;
      }

      // No departure: the Scene Runner's cut to the next scene, unless the party got here by a departure whose `then` takes them on.
      const next = rows[index + 1];
      if (!next || coveredByThen.has(row.key)) return;
      const leg = addLeg(group, {
        id: `leg:cut:${row.key}>${next.key}`, kind: "cut", groupId: group.id, rowKey: next.key,
        label: `${row.title} → ${next.title}`, from: here, to: endpointOf(next.place, next), mode: null, settle: null, timing: timingOf(row, next)
      });
      legBeforeRow.set(next.key, leg);
    });
  }
  return { groups, legs, legsBySlot, legBeforeRow };
}

/** The leg with this id, or null: the Story list shows every episode's journeys, so a button there can name a leg of an episode that is not the one open on the Journeys tab. */
export const legById = (model, id) => (model?.legs ?? []).find((leg) => leg.id === id) ?? null;
