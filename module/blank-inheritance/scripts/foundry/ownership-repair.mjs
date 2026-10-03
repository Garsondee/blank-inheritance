/**
 * Take INHERIT out of every world Actor's ownership -- the Foundry-touching
 * half. See core/ownership.mjs for what goes wrong and why.
 *
 * Foundry never stores INHERIT on a top-level document (its own ownership
 * dialog drops the key before saving), but this module once did, through the
 * admin panel's "give the test characters back". Where that has happened, the
 * actor's unlinked tokens loop forever the moment anything asks about a
 * player's permission. This runs at a GM's login, finds those entries and
 * rewrites the map without them. Idempotent, silent when there is nothing to
 * do, and GM-only because only a GM may change ownership.
 *
 * The map is replaced whole with Foundry's ForcedReplacement operator, which
 * is exactly how its own dialog saves ownership: a `-=key` deletion is refused
 * on this field (the key is not a valid user id), so replacing is the only way
 * a key can leave the map.
 */

import { planOwnershipRepair } from "../core/ownership.mjs";

/** The world Actors whose ownership needs repairing, with the map to write. */
export function actorOwnershipPlan() {
  return planOwnershipRepair(
    (game.actors?.contents ?? []).map((actor) => ({ id: actor.id, name: actor.name, ownership: actor.toObject().ownership }))
  );
}

/** Repair them. Returns the plan that was applied (empty when nothing was wrong). */
export async function repairActorOwnership() {
  if (!game.user?.isGM) return [];
  const plan = actorOwnershipPlan();
  for (const fix of plan) {
    const actor = game.actors.get(fix.id);
    if (!actor) continue;
    await actor.update({ ownership: foundry.data.operators.ForcedReplacement.create(fix.ownership) }, { render: false });
  }
  if (plan.length) {
    console.warn(
      `Blank Inheritance | Removed INHERIT ownership entries from ${plan.length} actor(s): ` +
        plan.map((fix) => `${fix.name ?? fix.id} (${fix.removed.length})`).join(", ")
    );
  }
  return plan;
}
