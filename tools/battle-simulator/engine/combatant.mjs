/**
 * Derived combatant stats — the damage-state degradation curve from
 * design/scale-and-chassis.md §8, computed fresh from current HP every
 * time it's needed rather than stored, so it can never drift out of sync
 * with the HP that's the source of truth.
 *
 * Pure functions only. No RNG, no mutation, no I/O — this module is unit
 * tested in isolation from the turn-resolution logic that calls it.
 */

import { FEET_PER_SQUARE } from "./grid.mjs";

export const DAMAGE_STATES = { OPERATIONAL: "operational", DEGRADED: "degraded", CRITICAL: "critical", HULKED: "hulked" };

/** Which damage-state band a combatant is in, from current/max HP. */
export function damageStateFor(currentHP, maxHP) {
  if (currentHP <= 0) return DAMAGE_STATES.HULKED;
  const pct = currentHP / maxHP;
  if (pct > 2 / 3) return DAMAGE_STATES.OPERATIONAL;
  if (pct > 1 / 3) return DAMAGE_STATES.DEGRADED;
  return DAMAGE_STATES.CRITICAL;
}

/**
 * The mechanical penalty table for each state, per design/scale-and-chassis.md §8.
 * Only applies to "frame" and "chassis" kinds — a "claimant" (a standard SF2E
 * creature, not a Frame or a vehicle) is deliberately NOT subject to this table;
 * personnel-scale rules never apply to it either, and it has its own Stunned/
 * weakness mechanic (Interdiction Field) instead. See design doc §8's opening line:
 * this is what makes Frames/vehicles feel mechanically distinct from characters,
 * which requires it NOT applying to every creature type indiscriminately.
 */
const PENALTIES = {
  // actionCap: 3 at Operational is the STANDARD SF2E action count (matches
  // a normal creature/PC) — this table only ever LOWERS it, never removes
  // the cap entirely. (Bug caught while writing combatant.test.mjs: this
  // was Infinity, silently giving a fully-healthy chassis unlimited
  // actions per turn — exactly the class of error legality.mjs's design
  // intent exists to prevent, and it slipped past the smoke test because
  // no scenario AI happened to propose enough actions to expose it.)
  [DAMAGE_STATES.OPERATIONAL]: { acDelta: 0, speedMultiplier: 1, hardnessMultiplier: 1, actionCap: 3 },
  [DAMAGE_STATES.DEGRADED]: { acDelta: -2, speedMultiplier: 0.75, hardnessMultiplier: 1, actionCap: 2 },
  [DAMAGE_STATES.CRITICAL]: { acDelta: -4, speedMultiplier: 0.5, hardnessMultiplier: 0.5, actionCap: 1 },
  [DAMAGE_STATES.HULKED]: { acDelta: 0, speedMultiplier: 0, hardnessMultiplier: 1, actionCap: 0 }
};

/**
 * Resolve a combatant's EFFECTIVE stats for the current round, folding in
 * damage-state penalties. Returns a new object; never mutates the input.
 */
export function resolveEffectiveStats(combatant) {
  const state = damageStateFor(combatant.currentHP, combatant.maxHP);
  const penalty = PENALTIES[state];
  const applies = combatant.kind === "frame" || combatant.kind === "chassis";

  const baseSpeed = combatant.speed;
  const baseAc = combatant.ac;
  const baseHardness = combatant.hardness ?? 0;

  // Speed rounds down to the nearest whole square, matching how SF2E's own
  // Broken rule ("Speeds are halved") is applied in practice — a fractional
  // speed isn't a real, usable number at the table.
  const effectiveSpeed = applies ? Math.floor((baseSpeed * penalty.speedMultiplier) / FEET_PER_SQUARE) * FEET_PER_SQUARE : baseSpeed;

  // Standard SF2E action economy is 3 actions/turn for any ordinary
  // creature — that's the default for "claimant" (and anything else that
  // isn't a Frame or a chassis). Frame/chassis kinds override it below.
  let actionCap = 3;
  if (combatant.kind === "frame") {
    // Frame action count is governed by the pilot's Resonance band
    // (design/scale-and-chassis.md §7), THEN capped further by damage state
    // if damage state is more restrictive — the two systems compose, they
    // don't override each other. See config.json's actionsPerTurn per band.
    const bandActions = combatant.resonanceBand?.actionsPerTurn ?? 2;
    actionCap = applies ? Math.min(bandActions, penalty.actionCap) : bandActions;
  } else if (combatant.kind === "chassis") {
    actionCap = applies ? penalty.actionCap : 3;
  }

  return {
    damageState: state,
    ac: applies ? baseAc + penalty.acDelta : baseAc,
    hardness: applies ? Math.floor(baseHardness * penalty.hardnessMultiplier) : baseHardness,
    speed: effectiveSpeed,
    actionsAvailable: actionCap,
    disabled: state === DAMAGE_STATES.HULKED
  };
}
