/**
 * The travel legs between scenes -- one per scene change, in play order.
 *
 * Ingram, 2026-09-22, correcting a miscommunication about the Seam pass:
 *
 *   "I don't want to just track if the group splits or merges, I want to
 *    literally have a set of coordinates for the players to move between and
 *    that needs to happen between EVERY scene change. Players start at X, then
 *    end up at Y. The plan is to cut to the world map, automatically, between
 *    every scene change."
 *
 * That cut is already built and wired: foundry/scene-runner.mjs calls
 * core/travel-trigger.mjs's `needsTravel` at three sites, and foundry/travel.mjs
 * plans a real route across the road graph and animates it. `needsTravel`
 * returns false when EITHER side has no location, so a scene with no
 * `locationRef` does not produce a gentle degradation -- it produces a **silent
 * hard cut**, with no error anywhere, which is the worst shape a gap can take.
 *
 * This module makes every one of those seams visible at once: where the leg
 * starts, where it ends, how far it is, and whether the map cut will actually
 * fire. It is pure, and it deliberately measures straight-line distance rather
 * than routing -- the real router needs a 3.4 MB graph and belongs at play time.
 * What matters here is "is there a leg at all", not its exact length.
 */
import { scenesInPlayOrder } from "./corpus.mjs";

/** Mirrors core/travel-trigger.mjs exactly. Kept as its own copy on purpose: this tool must not import Foundry-adjacent module code, and the rule is one line. */
export const cutFires = (from, to) => Boolean(from && to && from !== to);

/** Metres between two locations on the 12400x12400 sheet, where 1px = 1m. */
export function metresBetween(a, b) {
  const p = a?.derived?.centroidPx;
  const q = b?.derived?.centroidPx;
  if (!p || !q) return null;
  return Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]));
}

/**
 * The position a scene edge declares. Falls back to the scene-set entry's own
 * locationRef when the brief has not been given an explicit position yet --
 * that link already exists for all 26 scenes and is what scene-build.mjs stamps
 * onto the real Foundry Scene, so it is the same fact from a different field.
 */
export function positionAt(bundle, edge) {
  const declared = bundle?.brief?.[edge]?.position;
  if (declared) {
    return {
      locationRef: declared.locationRef ?? null,
      state: declared.state ?? null,
      note: declared.note ?? null,
      declared: true
    };
  }
  return {
    locationRef: bundle?.setEntry?.locationRef ?? null,
    state: null,
    note: null,
    declared: false
  };
}

/**
 * One leg per scene change: 25 of them across 26 scenes. Each says whether the
 * automatic map cut fires, and when it does not, why.
 */
export function travelLegs(corpus) {
  const scenes = scenesInPlayOrder(corpus);
  const legs = [];
  for (let i = 0; i < scenes.length - 1; i += 1) {
    const from = scenes[i];
    const to = scenes[i + 1];
    const fromPos = positionAt(from, "outro");
    const toPos = positionAt(to, "intro");
    const fires = cutFires(fromPos.locationRef, toPos.locationRef);

    let reason = null;
    if (!fires) {
      if (!fromPos.locationRef && !toPos.locationRef) reason = "neither end has a location";
      else if (!fromPos.locationRef) reason = `${from.scene.id} has no location to leave from`;
      else if (!toPos.locationRef) reason = `${to.scene.id} has no location to arrive at`;
      else reason = "same location -- a cut within one place, no journey";
    }
    // `scattered` is the one legitimate no-location edge: the campaign's own
    // opening, before anybody has arrived anywhere.
    // Boolean() on purpose: the inner `fromPos.locationRef && ...` yields null
    // rather than false when the ref is missing, which is exactly the case this
    // field has to answer, and a null here reads as "not broken" to anything
    // doing a strict comparison.
    const legitimate = Boolean(
      !fires && (fromPos.state === "scattered" || toPos.state === "scattered" ||
        (fromPos.locationRef && fromPos.locationRef === toPos.locationRef))
    );

    legs.push({
      order: i + 1,
      fromScene: from.scene.id,
      toScene: to.scene.id,
      fromBrief: from.briefRef,
      toBrief: to.briefRef,
      fromLocation: fromPos.locationRef,
      toLocation: toPos.locationRef,
      fromState: fromPos.state,
      toState: toPos.state,
      declared: fromPos.declared && toPos.declared,
      metres: metresBetween(corpus.locations[fromPos.locationRef ?? ""], corpus.locations[toPos.locationRef ?? ""]),
      cutFires: fires,
      legitimate,
      reason
    });
  }
  return legs;
}

export function travelSummary(corpus) {
  const legs = travelLegs(corpus);
  const broken = legs.filter((l) => !l.cutFires && !l.legitimate);
  return {
    legs,
    total: legs.length,
    firing: legs.filter((l) => l.cutFires).length,
    sameLocation: legs.filter((l) => !l.cutFires && l.legitimate && l.fromLocation).length,
    offMap: legs.filter((l) => l.fromState === "scattered" || l.toState === "scattered").length,
    broken: broken.length,
    brokenLegs: broken,
    declared: legs.filter((l) => l.declared).length,
    longest: legs.reduce((m, l) => (l.metres !== null && (!m || l.metres > m.metres) ? l : m), null)
  };
}
