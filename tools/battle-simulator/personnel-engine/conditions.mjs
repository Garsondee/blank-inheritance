/**
 * Generic condition helpers for the PERSONNEL-SCALE engine (design doc §25 — requested directly:
 * "research the rules then implement conditions, death/dying for PCs and off guard/flanking").
 *
 * ARCHITECTURE: every condition here is a FLAT scalar field on the combatant object (frightened,
 * stunnedValue, prone, dyingValue, woundedValue) — never nested under a `conditions` object,
 * matching Frightened/Stunned's own existing precedent (see combatant.mjs's header for why: the
 * engine's shallow-spread sandbox clone, cloneStateForPlanning's `{...c}`, already copies a flat
 * scalar correctly by value with zero special handling; a nested object would alias between live
 * state and a sandbox fork). This is a deliberately RIGHT-SIZED generalization, not a big
 * speculative data-driven registry: what's shared across conditions is the HANDFUL of real rules
 * that apply to more than one of them (the redundant-conditions stacking rule, "what's my own
 * attack penalty right now", "am I off-guard right now") — centralized here, once, so a future
 * condition extends a short list of pure functions instead of hand-copying inline snippets at every
 * attack-resolution call site the way `-(combatant.frightened ?? 0)` had already been copy-pasted
 * twice before this file existed. That copy-paste pattern is the same shape of bug the Stunned fix
 * (design doc §24) found: a rule implemented as a bespoke one-off in N places drifts:one of them
 * gets it wrong and nothing catches it.
 *
 * `unconscious` and `dead` are DERIVED, never stored — both are fully determined by currentHP +
 * side + dyingValue, and a redundant stored flag would just be one more thing that could get out of
 * sync with the truth (exactly how a hand-rolled special case goes wrong).
 */
import { rollD20 } from "../engine/rng.mjs";
import { degreeOfSuccess } from "../engine/resolve.mjs";

/**
 * Player Core pg. 435 ("Redundant Conditions With Values", reference/srd/player-core/
 * 504-conditions-appendix.json): reapplying a valued condition you already have takes the HIGHER
 * value, never adds. The one shared rule every VALUED condition's reapplication goes through
 * (frightened, stunnedValue) — NOT wounded, whose own text is explicit that it genuinely increases
 * by 1 each time rather than taking the max (see applyWoundedIncrease below).
 */
export function applyValuedCondition(combatant, field, value) {
  combatant[field] = Math.max(combatant[field] ?? 0, value);
}

/**
 * Player Core pg. 402 (reference/srd/player-core/367-hit-points-healing-and-dying.json):
 * "Player characters, their companions, and other significant characters... don't automatically
 * die when they reach 0 Hit Points... The GM might determine that villains, powerful monsters,
 * special NPCs... can use these rules as well." Ordinary NPCs/opposition in this engine die
 * outright at 0 HP — this is the RAW default, not a simplification this project invented (design
 * doc §25 — Ingram's own "for PCs" scoping matches the real rule's own asymmetry exactly).
 */
export function isDead(combatant) {
  if (combatant.currentHP > 0) return false;
  if (combatant.side !== "party") return true;
  return (combatant.dyingValue ?? 0) >= 4; // Player Core: reaching dying 4 kills you
}

/** A PC at 0 HP who isn't yet dead is unconscious (knocked out) — same source page as isDead.
 * Deliberately derived, not stored — see this file's own header. */
export function isUnconscious(combatant) {
  return combatant.side === "party" && combatant.currentHP <= 0 && !isDead(combatant);
}

/**
 * Off-Guard (reference/srd/player-core/condition-28-off-guard.json): -2 circumstance penalty to
 * AC. Granted persistently by Prone and by Unconscious (Player Core: "you... have the... off-guard
 * condition[s]") — deliberately NOT its own stored field, so it never needs separate granting/
 * revoking bookkeeping as its sources come and go; it's simply true whenever either real source is
 * true. Flanking (flanking.mjs) is a SEPARATE, per-attack geometric off-guard source — composed
 * with this one at the point of attack resolution (engine.mjs), not here, since flanking is scoped
 * to melee attacks from the flanking creatures specifically, not universal like this one.
 */
export function isOffGuardFromConditions(combatant) {
  return !!combatant.prone || isUnconscious(combatant);
}

/**
 * The real "status penalty to ALL your checks" conditions that reduce a combatant's OWN outgoing
 * d20 rolls: Frightened (condition-18-frightened.json, "a status penalty equal to this value to
 * all your checks and DCs") and Prone's own "-2 circumstance penalty to attack rolls"
 * (condition-32-prone.json). Centralized so every attack-resolution call site applies the SAME
 * penalty the SAME way, instead of each hand-copying its own snippet.
 */
export function attackerConditionPenalty(combatant) {
  const frightenedPenalty = -(combatant.frightened ?? 0);
  const pronePenalty = combatant.prone ? -2 : 0;
  return frightenedPenalty + pronePenalty;
}

/**
 * Player Core pg. 402-403: getting knocked to 0 HP for the first time. Gain dying 1, or dying 2 if
 * the hit was a critical success (or, for a save-based effect, the defender's own critical
 * failure); if already wounded, increase the dying value gained by the current wounded value. Only
 * ever called for a `side: "party"` target — see isDead's own comment on why ordinary NPCs never
 * go through this at all.
 */
export function applyKnockout(combatant, { critical }) {
  const base = critical ? 2 : 1;
  applyValuedCondition(combatant, "dyingValue", base + (combatant.woundedValue ?? 0));
  combatant.prone = true; // Player Core: "you fall prone" when knocked out
}

/**
 * Player Core pg. 403: "If you take damage while you already have the dying condition, increase
 * your dying condition value by 1, or by 2 if the damage came from a critical hit..." — INSTEAD of
 * further HP loss, since HP can't go below 0. `combatant.currentHP` is untouched here; the caller
 * is still responsible for computing/logging the nominal damage that triggered this.
 */
export function worsenDyingFromDamage(combatant, { critical }) {
  combatant.dyingValue = (combatant.dyingValue ?? 0) + (critical ? 2 : 1);
}

/**
 * Player Core pg. 403: a flat check (d20, NO modifiers at all) against DC 10 + current dying
 * value, attempted at the start of each of a dying PC's turns. Reuses the shared, already-tested
 * degreeOfSuccess (../engine/resolve.mjs) rather than hand-rolling nat-20/nat-1 boundary logic a
 * second time — a flat check is just an ordinary check whose `total` happens to equal the raw d20.
 * Real dice only: this never runs inside the AI's own sandboxed lookahead (a recovery check isn't
 * a choice anyone proposes, so it needs no EXPECTED_OUTCOMES twin).
 */
export function resolveRecoveryCheck(rng, combatant) {
  const dc = 10 + combatant.dyingValue;
  const d20 = rollD20(rng);
  const degree = degreeOfSuccess(d20, d20, dc);
  const delta = { criticalSuccess: -2, success: -1, failure: 1, criticalFailure: 2 }[degree];
  combatant.dyingValue = Math.max(0, combatant.dyingValue + delta);
  let stabilized = false;
  if (combatant.dyingValue === 0) {
    // Player Core: "your wounded condition value INSTEAD increases by 1" — a real increment each
    // time, not the max-wins rule applyValuedCondition implements for reapplying a condition you
    // already have (this isn't a reapplication, it's the condition's own stated behavior).
    combatant.woundedValue = (combatant.woundedValue ?? 0) + 1;
    stabilized = true;
  }
  return { d20, dc, degree, delta, dyingValueAfter: combatant.dyingValue, stabilized, died: combatant.dyingValue >= 4 };
}

/** Player Core: restored to 1+ HP by any means -> immediately lose dying AND unconscious (derived,
 * so nothing to clear there) and can act normally next turn. Prone is cleared too — a deliberate,
 * documented simplification (design doc §25): RAW you'd still need to Stand after waking, but nothing
 * in this roster inflicts Prone except this exact knockout/heal cycle, so modeling a separate
 * post-heal Stand action for a case with no other real source would be speculative machinery this
 * project's own conventions warn against building ahead of need. */
export function applyRevival(combatant) {
  combatant.dyingValue = 0;
  combatant.prone = false;
}
