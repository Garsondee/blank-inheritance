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
import { rollD20 } from "../shared/rng.mjs";
import { degreeOfSuccess } from "../shared/resolve.mjs";

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
 *
 * `combatant.pcDeathRules` (design doc §49 erratum) is an OPTIONAL, explicit override, defaulting
 * to `undefined` for every fixture in this roster — `?? (combatant.side === "party")` reproduces
 * TODAY's exact side-keyed behavior byte-for-byte when omitted. It exists because `side` turned out
 * to carry two DIFFERENT real meanings that a mirror match (`personnel-mirror.mjs`, design doc §47)
 * silently conflated: "which side of THIS fight" (fine — win/loss detection SHOULD stay keyed on the
 * literal `side` field) versus "is this a player character" (not fine — a mirror match deploys the
 * IDENTICAL fixture on both sides, so whichever copy happened to land on `side: "opposition"` was
 * silently denied real PC survivability it should have kept, a pure artifact of the label, not a
 * real difference between the two combatants being compared). The quoted rule text ITSELF already
 * anticipates exactly this override — "villains, powerful monsters, special NPCs... can use these
 * rules as well" — this isn't a new rule, just a real field for a real, already-anticipated case.
 */
export function usesDyingRules(combatant) {
  return combatant.pcDeathRules ?? combatant.side === "party";
}

export function isDead(combatant) {
  if (combatant.currentHP > 0) return false;
  if (!usesDyingRules(combatant)) return true;
  return (combatant.dyingValue ?? 0) >= 4; // Player Core: reaching dying 4 kills you
}

/** A PC (or `pcDeathRules`-opted-in combatant) at 0 HP who isn't yet dead is unconscious (knocked
 * out) — same source page as isDead. Deliberately derived, not stored — see this file's own header. */
export function isUnconscious(combatant) {
  return usesDyingRules(combatant) && combatant.currentHP <= 0 && !isDead(combatant);
}

/**
 * Grabbed / Restrained (Athletics' Grapple, Player Core pg. 193/437 — reference/srd/player-core/
 * skill-3-athletics.json, condition-20-grabbed.json, condition-34-restrained.json): the first
 * RELATIONAL condition in this file — Player Core's own text names WHO is holding whom ("ends...
 * unless you move or your target Escapes"), so unlike every condition above, a flat scalar can't
 * represent it. Stored on the TARGET only (`grappledBy: {attackerId, state, expiresEndOfRound} |
 * null`) — no mirrored forward pointer on the attacker (e.g. `attacker.grappling`), matching this
 * file's own "derive, don't duplicate" convention (see isDead/isUnconscious above): anything that
 * needs "who is X currently grappling" scans for it (releaseGrapplesHeldBy below) — cheap at this
 * roster's scale, and can never drift out of sync with the one real source of truth.
 *
 * Grabbed: "held in place... giving you the off-guard and immobilized conditions." Restrained
 * grants the SAME two conditions PLUS "you can't use any attack or manipulate actions except to
 * attempt to Escape or Force Open your bonds" (enforced in legality.mjs's checkNotRestrained, for
 * every action type that genuinely carries the Attack trait) — and "Restrained overrides grabbed"
 * (506-overriding-conditions.json's real rule: the weaker condition is suppressed, not removed,
 * while the stronger one holds; since the only source of either in this engine is Grapple itself,
 * a new Grapple attempt against an already-held target simply overwrites `grappledBy` wholesale,
 * matching that same real overriding behavior without needing to track two conditions at once).
 * Immobilized: "incapable of movement... can't use any actions that have the move trait" — Stride
 * and Step both carry it (enforced in legality.mjs's checkMoveLegality, which Step delegates to).
 *
 * NOT modeled, flagged honestly rather than silently skipped: Grabbed's own DC 5 flat-check-or-lose
 * text for manipulate actions (nothing in this roster's action set is worth gating this finely);
 * Restrained's "can't use manipulate actions" half (this engine has no trait data on
 * saveAttack/conditionSave/areaAttack/healAbility to know which, if any, carry manipulate — only
 * its unambiguous "attack actions" half is enforced); Immobilized's own "an external force must
 * beat a DC/Fortitude to move you" clause (no OTHER action in this roster ever tries to forcibly
 * move an already-immobilized creature).
 */
export function isGrabbedOrRestrained(combatant) {
  return !!combatant.grappledBy;
}
export function isRestrained(combatant) {
  return combatant.grappledBy?.state === "restrained";
}
export function isImmobilized(combatant) {
  return isGrabbedOrRestrained(combatant); // the only source of Immobilized this engine models
}

export function applyGrapple(target, { attackerId, state, round }) {
  target.grappledBy = { attackerId, state, expiresEndOfRound: round + 1 };
}
export function releaseGrapple(target) {
  target.grappledBy = null;
}
/**
 * Every combatant currently held BY `attackerId`, released. Two real callers: the mover's own
 * Move/Step handling ("ends... unless you move" — engine.mjs) and the cleanup path for a grappler
 * who dies or is knocked out — a corpse (or an unconscious PC) can't maintain a physical hold, a
 * documented ruling (Player Core is silent on this exact edge case) needed so a grapple can never
 * outlive its own grappler and lock the target's movement for the rest of the fight — the identical
 * CLASS of bug engine.mjs's own livingPositions fix already found and fixed once for occupancy
 * (design doc §21's corpse-in-doorway bug).
 */
export function releaseGrapplesHeldBy(combatants, attackerId) {
  for (const c of combatants) {
    if (c.grappledBy?.attackerId === attackerId) releaseGrapple(c);
  }
}

/**
 * Off-Guard (reference/srd/player-core/condition-28-off-guard.json): -2 circumstance penalty to
 * AC. Granted persistently by Prone, Unconscious, and now Grabbed/Restrained (Player Core: "you...
 * have the... off-guard condition[s]") — deliberately NOT its own stored field, so it never needs
 * separate granting/revoking bookkeeping as its sources come and go; it's simply true whenever any
 * real source is true. Flanking (flanking.mjs) is a SEPARATE, per-attack geometric off-guard
 * source — composed with this one at the point of attack resolution (engine.mjs), not here, since
 * flanking is scoped to melee attacks from the flanking creatures specifically, not universal like
 * this one.
 */
export function isOffGuardFromConditions(combatant) {
  return !!combatant.prone || isUnconscious(combatant) || isGrabbedOrRestrained(combatant);
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
 * Hero Points (Player Core pg. 405): "Spend all your Hero Points (minimum 1) to avoid death... You
 * can do this when your dying condition would increase. You lose the dying condition entirely and
 * stabilize with 0 Hit Points." Modeled as automatic-if-available, specifically at the one moment
 * it's nearly always correct to use it — the instant dying would actually REACH 4 (real death), not
 * preemptively on every lesser increase (a real player doesn't burn their one Hero Point going from
 * dying 1 to dying 2 while natural recovery checks are still live). PCs only, matching this file's
 * own real PC-vs-NPC dying asymmetry (isDead's own header) — Hero Points are a player-character
 * rule, and NPCs never enter the dying spiral at all. Each real PC fixture starts a battle with 1
 * (Player Core: "each character gets 1 Hero Point at the start of a session") — the "gain more via
 * heroic deeds" half is a real, GM-judged, narrative trigger this project's own conventions rule out
 * inventing a numeric proxy for; not modeled. Player Core is explicit this does NOT grant/increase
 * Wounded the way a natural recovery-check stabilization does (see resolveRecoveryCheck's own
 * comment) — the two paths are deliberately kept separate below, not merged into one.
 */
export function trySpendHeroPointToAvoidDeath(combatant) {
  if ((combatant.heroPoints ?? 0) <= 0) return false;
  combatant.heroPoints = 0;
  combatant.dyingValue = 0;
  combatant.currentHP = 0;
  return true;
}

/**
 * Player Core pg. 402-403: getting knocked to 0 HP for the first time. Gain dying 1, or dying 2 if
 * the hit was a critical success (or, for a save-based effect, the defender's own critical
 * failure); if already wounded, increase the dying value gained by the current wounded value. Only
 * ever called for a `side: "party"` target — see isDead's own comment on why ordinary NPCs never
 * go through this at all. Checks for a real Hero Point BEFORE applying a dyingValue that would
 * reach 4 — a critical knockout while already wounded 2 is exactly the case that can jump straight
 * to death on a single hit (the real worked example already pinned in this file's own tests).
 */
export function applyKnockout(combatant, { critical }) {
  const base = critical ? 2 : 1;
  const newDyingValue = base + (combatant.woundedValue ?? 0);
  if (newDyingValue >= 4 && trySpendHeroPointToAvoidDeath(combatant)) {
    combatant.prone = true; // still real either way — Player Core: "you fall prone" when knocked out
    return;
  }
  applyValuedCondition(combatant, "dyingValue", newDyingValue);
  combatant.prone = true;
}

/**
 * Player Core pg. 403: "If you take damage while you already have the dying condition, increase
 * your dying condition value by 1, or by 2 if the damage came from a critical hit..." — INSTEAD of
 * further HP loss, since HP can't go below 0. `combatant.currentHP` is untouched here (except by a
 * successful Hero Point, which explicitly re-floors it at 0 per Player Core's own "stabilize with 0
 * Hit Points" text); the caller is still responsible for computing/logging the nominal damage that
 * triggered this.
 */
export function worsenDyingFromDamage(combatant, { critical }) {
  const newDyingValue = (combatant.dyingValue ?? 0) + (critical ? 2 : 1);
  if (newDyingValue >= 4 && trySpendHeroPointToAvoidDeath(combatant)) return;
  combatant.dyingValue = newDyingValue;
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
  const newDyingValue = Math.max(0, combatant.dyingValue + delta);
  let heroPointSpent = false;
  if (newDyingValue >= 4 && trySpendHeroPointToAvoidDeath(combatant)) {
    heroPointSpent = true;
  } else {
    combatant.dyingValue = newDyingValue;
    // Player Core: "your wounded condition value INSTEAD increases by 1" on a NATURAL
    // stabilization — a real increment each time, not the max-wins rule applyValuedCondition
    // implements for reapplying a condition you already have (this isn't a reapplication, it's the
    // condition's own stated behavior). Deliberately NOT reached on the Hero Point path above —
    // Player Core is explicit that route grants no wounded at all.
    if (combatant.dyingValue === 0) combatant.woundedValue = (combatant.woundedValue ?? 0) + 1;
  }
  return {
    d20, dc, degree, delta, dyingValueAfter: combatant.dyingValue, heroPointSpent,
    stabilized: combatant.dyingValue === 0, died: combatant.dyingValue >= 4
  };
}

/** Player Core: restored to 1+ HP by any means -> immediately lose dying AND unconscious (derived,
 * so nothing to clear there) and can act normally next turn. Prone is cleared too — a deliberate,
 * documented simplification (design doc §25), KEPT as-is here even though its original stated
 * reason no longer fully holds: Trip (design doc §40) and a real Stand action (design doc §41) both
 * now exist, so "nothing else inflicts Prone" and "Stand doesn't exist yet" are no longer true.
 * Whether a just-revived PC should still need a real Stand action on their own next turn (matching
 * RAW more literally) is a real, separate question — left open on purpose, not silently resolved by
 * this pass, since Stage 1 (design doc §42) never asked for it and changing it now would alter
 * already-asserted test behavior for a question nobody has actually decided. */
export function applyRevival(combatant) {
  combatant.dyingValue = 0;
  combatant.prone = false;
}
