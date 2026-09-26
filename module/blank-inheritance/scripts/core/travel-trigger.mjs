/**
 * Deciding WHETHER a cut between two scenes should go by way of the map —
 * the one piece of campaign-specific judgement travel-route.mjs's own header
 * deliberately keeps out of itself ("What this deliberately does NOT do...
 * know about transit modes"). Everything here is a plain string comparison;
 * no Foundry, no coordinates, no routing.
 *
 * scene-set.json's own rule (its "notes" field, verbatim): "SCENE -> MAP ->
 * SCENE. The map is the hub and the thing to cut back to between beats."
 * Every real Foundry Scene the module builds carries its own `locationRef`
 * flag (foundry/scene-build.mjs), stamped straight from that same manifest —
 * so the decision is just: did the named location actually change?
 */

/**
 * `fromLocationRef`/`toLocationRef` are the `locationRef` flag off the scene
 * being left and the scene being cut to (foundry/scene-build.mjs's own
 * `scene.getFlag(MODULE_ID, "locationRef")`). Either can be null — no scene
 * has activated yet, or a scene the manifest never gave a location (the
 * campaign-map hub itself, Directorate HQ's own place-scenes) — and null
 * never triggers travel: there is nowhere to plan a route FROM, or nothing
 * meaningfully happened if the location didn't change at all (a cut to a
 * same-location sub-room, e.g. Intake Medicals' own Examination Room).
 */
export function needsTravel(fromLocationRef, toLocationRef) {
  return Boolean(fromLocationRef && toLocationRef && fromLocationRef !== toLocationRef);
}

/**
 * The LEGS a cut between two scene edges should animate -- one per group that
 * actually moves.
 *
 * Ingram, 2026-09-22, on being told the map ritual drives a single shared
 * marker: *"That's great when the party is together, not great when the party
 * splits up."* Correct, and the gap went deeper than the marker: a `position`
 * carried one `locationRef`, so `split` could say THAT the party had divided
 * but never WHERE each half was. `position.groups` fixes the data; this
 * function turns it into journeys.
 *
 * Still pure -- string ids in, plain objects out. Nothing here knows about
 * Foundry, tokens, routing or coordinates; foundry/travel.mjs animates one
 * marker per returned leg, concurrently, because two groups crossing the city
 * at the same time is what actually happened in the fiction.
 *
 * `from`/`to` are `position` objects (data/schema/scene-brief.schema.json):
 * `{ locationRef, state, groups?: [{ id, label?, locationRef }] }`.
 *
 * The four shapes, and why each is what it is:
 *
 *   together -> together   one leg. The existing behaviour, unchanged.
 *   together -> split      one leg per destination group, all leaving the same
 *                          place: the party divides on the way.
 *   split    -> together   one leg per origin group, all arriving at the same
 *                          place: the party reconverges.
 *   split    -> split      matched by group id. A group that exists on only one
 *                          side falls back to the whole-party ref for its other
 *                          end, because a group appearing from nowhere is a
 *                          worse failure than a slightly wrong start point.
 *
 * An edge whose state is `scattered` returns NO legs at all: that is the
 * campaign's own opening, deliberately off-map, and there is nothing to draw.
 */
export function travelLegsFor(from, to) {
  if (!from || !to) return [];
  if (from.state === "scattered" || to.state === "scattered") return [];

  const partyFrom = from.locationRef ?? null;
  const partyTo = to.locationRef ?? null;
  const fromGroups = Array.isArray(from.groups) && from.groups.length ? from.groups : null;
  const toGroups = Array.isArray(to.groups) && to.groups.length ? to.groups : null;

  const leg = (id, label, a, b) =>
    needsTravel(a, b) ? [{ groupId: id, label: label ?? null, from: a, to: b }] : [];

  if (!fromGroups && !toGroups) return leg("party", null, partyFrom, partyTo);

  if (fromGroups && !toGroups) {
    return fromGroups.flatMap((g) => leg(g.id, g.label, g.locationRef ?? partyFrom, partyTo));
  }
  if (!fromGroups && toGroups) {
    return toGroups.flatMap((g) => leg(g.id, g.label, partyFrom, g.locationRef ?? partyTo));
  }

  const byId = new Map(fromGroups.map((g) => [g.id, g]));
  const seen = new Set();
  const legs = [];
  for (const g of toGroups) {
    seen.add(g.id);
    const origin = byId.get(g.id);
    legs.push(...leg(g.id, g.label ?? origin?.label, origin?.locationRef ?? partyFrom, g.locationRef ?? partyTo));
  }
  // A group that disappears between the two edges still has to arrive somewhere,
  // or its marker is simply abandoned mid-map.
  for (const g of fromGroups) {
    if (seen.has(g.id)) continue;
    legs.push(...leg(g.id, g.label, g.locationRef ?? partyFrom, partyTo));
  }
  return legs;
}
