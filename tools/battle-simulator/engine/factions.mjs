/**
 * Faction relations (stress-test mission, design doc §16). Every scenario before this one used
 * exactly two sides ("party"/"opposition") and treated `c.side !== me.side` as "enemy" throughout
 * decide.mjs, state-value.mjs, and engine.mjs's checkOutcome — correct ONLY under a strict binary.
 *
 * Adding a third side ("neutral" — civilians/assets nobody controls) breaks that assumption
 * silently rather than loudly: `!== "party"` is true for a neutral unit too, so an unpatched party
 * evaluator would price protecting a civilian convoy exactly backwards (spending weights.enemyDamage
 * to WANT its HP down, since "not my side" reads as "kill it"), and generateProposals would offer
 * the party a legal "Strike the convoy" action. Centralized here so decide.mjs, state-value.mjs, and
 * engine.mjs's checkOutcome share one definition rather than three independently-drifting guesses.
 *
 * Deliberately NOT a general N-faction relation matrix — that's more machinery than three sides
 * need and would just be YAGNI. Two hand-stated rules are the whole model:
 *   - party's hostility is unchanged: only opposition is an enemy. Neutral reads as protectable.
 *   - opposition's hostility WIDENS: party AND neutral are both legal targets (a raider faction
 *     preying on an undefended convoy is exactly the tactical texture this scenario wants).
 * A neutral unit is never hostile to anyone — it has no AI path that would act on it even if it
 * were (see ai/neutral-ai.mjs), but the relation is stated as false anyway so evaluateState never
 * has to special-case "what if a neutral combatant asks who its enemies are."
 */

/** Would `observer` treat `candidate` as a legal, hostile target? */
export function isHostileTo(observer, candidate) {
  if (!observer || !candidate || candidate.side === observer.side) return false;
  if (observer.side === "party") return candidate.side === "opposition";
  if (observer.side === "opposition") return candidate.side === "party" || candidate.side === "neutral";
  return false; // neutral treats nobody as hostile
}

/** Would `observer` count `candidate` as "one of mine" for HP/support-scoring purposes? */
export function isAlliedWith(observer, candidate) {
  if (!observer || !candidate) return false;
  if (candidate.side === observer.side) return true;
  // A neutral asset reads as the PARTY's own to protect (allyDamage-style scoring: the party wants
  // its HP kept up), but not the other way around — a neutral unit isn't "friends with" the party
  // for ITS OWN evaluation, because it never runs the general evaluator at all (ai/neutral-ai.mjs).
  if (observer.side === "party" && candidate.side === "neutral") return true;
  return false;
}

/** Split a combatant list into {allies, enemies} from `observer`'s point of view, in one pass. */
export function splitByRelation(observer, combatants) {
  const allies = [], enemies = [];
  for (const c of combatants) {
    if (c.id === observer.id) continue;
    if (isAlliedWith(observer, c)) allies.push(c);
    else if (isHostileTo(observer, c)) enemies.push(c);
  }
  return { allies, enemies };
}
