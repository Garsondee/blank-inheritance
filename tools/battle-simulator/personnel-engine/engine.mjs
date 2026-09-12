/**
 * Turn-loop orchestration for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../engine/engine.mjs. THE RULE THIS FILE EXISTS TO ENFORCE, unchanged from the Frame-scale
 * original: state (position, HP, flags) is NEVER mutated except inside attemptAction(), and
 * attemptAction() NEVER runs without a preceding { legal: true } from legality.mjs. An AI script
 * (or an adversarial test) can propose anything; the engine is what makes an illegal proposal a
 * no-op instead of a move.
 *
 * WHAT'S DROPPED, and why — everything below is Frame/vehicle/Day-1-specific machinery that
 * doesn't exist for an ordinary SF2E PC or NPC:
 *  - Field Repair, Evacuate, Spot: Ladle/vehicle/Day-1-specific action types. No proposal branch,
 *    no outcome-table entries, no legality imports for any of them.
 *  - Advance: the Claimant's own scripted occupancy-ignoring move. Ordinary movement (Stride/Step)
 *    already covers everything a real PC or NPC can do.
 *  - The damage-state degradation track and everything downstream of it: scaleHardness/"mounted"
 *    trait log fields, the roster's scaleHardness/scaleBlind/resonanceBand/repairBonus/handlingDC
 *    fields, and snapshotState's damageState field. combatant.mjs's personnel-scale
 *    resolveEffectiveStats never produces a damageState at all — see its own header for why.
 *  - The "damage state dropped mid-turn, reducing the action cap" secondary heldReason branch:
 *    personnel-scale actionsAvailable is only ever 3 or 0 (resolveEffectiveStats has no
 *    intermediate band), so that specific transition is now provably impossible, not just unused.
 *  - The stalemate/immuneToAllDamage outcome branch: the ground-layer Interdiction Field concept
 *    it exists for has no personnel-scale equivalent. checkOutcome here is party-victory /
 *    party-defeat / timeout only.
 *  - scriptedEvents: nothing in the current plan (a straight fight, no narrative triggers) needs
 *    a round-keyed event hook; adding one now would be exactly the kind of speculative surface
 *    area the project's own conventions warn against.
 *  - checkReactionTriggers (the Claimant's Claim): Claimant-specific machinery (a hardcoded Large+
 *    size trigger, checked only at a mover's FINAL destination), not ported here. GH #18 instead
 *    builds a real, generic Reactive Strike directly into the "move" branch below: gated on the
 *    combatant's own authored `reactions[]` (never inferred from size or a melee weapon alone —
 *    matching GM Core's own "not every creature has this" text), firing per-SQUARE as one is left,
 *    not just at the destination. Security Goon's "Get Back!" and Erabryth's "Reflect Aggression"
 *    are real but structurally different trigger shapes (ally-targeted redirect; on-hit retaliation)
 *    — still not fired by anything in this file; a real, separate extension, not silently assumed
 *    covered by the move-triggered case GH #18 actually built.
 *
 * The "re-derive effective stats every loop iteration, hard-stop if disabled" safety net
 * (runTurn's own `while (true)` loop, below) is exactly what makes GH #18 safe with zero special-
 * casing: a Reactive Strike fired mid-move (the first thing in this file that CAN reduce the acting
 * combatant's own HP during its own turn) that drops the mover to 0 HP is caught on the very next
 * loop iteration, ending the turn and reconciling the action ledger correctly — the same real
 * invariant the Frame-scale file already protects, kept here from the start "exactly right if a
 * future reaction... effect ever does need it," which this is.
 *
 * Reused directly, unmodified: ../engine/resolve.mjs (dice/degree-of-success/damage math) and
 * ../engine/rng.mjs (the seeded PRNG) — both verified scale-agnostic during planning, same
 * precedent ground-layer/ already established for exactly this kind of reuse.
 *
 * EXTENDED (skill-actions-in-combat expansion, requested directly: "expand to saving throws...
 * keep expanding the list of things that PCs and NPCs can do"): two new action types.
 *  - "saveAttack" — a basic saving throw the TARGET rolls (a genuinely single-target one — an
 *    AREA-effect save like a grenade's burst is explicitly OUT of scope, see build-combat-pregen.mjs's
 *    deriveSaveAttacks header, design doc §22), using ../engine/resolve.mjs's
 *    resolveSave/basicSaveDamage/expectedSaveDamage (also reused unmodified — this is exactly as
 *    scale-agnostic as resolveStrike's own dice math, and already proven by ground-layer/'s own
 *    reuse of resolveSave/basicSaveDamage for its hazard saves).
 *  - "demoralize" — Intimidation's Demoralize action (Player Core pg. 200, mirrored verbatim at
 *    reference/srd/player-core/skill-8-intimidation.json): an Intimidation check against the
 *    target's Will DC, applying the Frightened condition (mirrored at
 *    reference/srd/player-core/condition-18-frightened.json) on success/critical success.
 * Neither counts toward Multiple Attack Penalty or increments turnProgress.strikesAttempted — MAP
 * is specifically an attack-ROLL penalty (Player Core), and neither of these involves the ATTACKER
 * rolling an attack at all. This is the actual mechanism behind the tactic Ingram named directly:
 * Demoralize costs 0 extra penalty regardless of how many Strikes came before it in the same turn,
 * unlike a 2nd/3rd Strike's real -5/-10.
 *
 * EXTENDED AGAIN (design doc §22's cover ask): every attack-roll/save resolution above now checks
 * `terrain.mjs`'s `hasCover` between attacker and target and, if a cover object's segment crosses
 * that line, applies STANDARD_COVER_AC_BONUS (+2, Player Core pg. 416) to the target's effective
 * AC (strike/spellAttack) or Reflex save (saveAttack) for that ONE resolution only — never written
 * back onto the target's own persistent stats, since cover is relative to a specific attacker's
 * line, not a standing condition (a real rule: "you might have cover against one opponent but not
 * another"). Logged on the returned action as `coverBonus` for transcript/viewer honesty.
 *
 * EXTENDED AGAIN (design doc §38): "areaAttack" — a genuinely multi-target basic-save effect (a
 * thrown grenade's real burst), closing the gap every grenade-carrying fixture since §21 has
 * honestly flagged as unwired. Structurally different from saveAttack above: there is no single
 * `target`, only an aim point (`originId`'s current square) and a radius — every living combatant
 * within it is affected, either side, no exception for allies or the attacker's own square. `rng`
 * still only ever advances the real battle's dice stream when REAL_OUTCOMES is in play, exactly
 * like every other action type here.
 *
 * EXTENDED AGAIN (design doc §31's rules-gap sweep, priority 1 — "the first REAL control actions"):
 * "trip"/"shove"/"grapple"/"escape", Athletics maneuvers (Player Core pg. 193/437). None of the
 * four is an attack ROLL (they're skill checks, Trip/Shove/Grapple against the target's Fortitude
 * DC, Escape against the grappler's own), so none increments the shared Multiple Attack Penalty
 * counter, same as saveAttack/demoralize/conditionSave above. Grapple introduces this engine's
 * first RELATIONAL condition (conditions.mjs's `grappledBy` — Grabbed/Restrained), which in turn
 * required three small, real changes elsewhere in THIS file: the move/step branches now release
 * any grapple the MOVER holds ("ends... unless you move"), the round loop now expires a grapple at
 * the end of the grappler's own next turn (mirroring Frightened's decay, same real per-turn timing
 * point), and applyDyingTransition now also releases any grapple held by a combatant who's just
 * been knocked to/past 0 HP, on EITHER side (a dead or unconscious creature can't maintain a
 * physical hold — see conditions.mjs's releaseGrapplesHeldBy for why this is a real, necessary,
 * if uncited, ruling rather than an invented one). Shove is the one genuinely new mechanical shape:
 * code that writes a combatant OTHER than the acting one's position (`pushDestination`, below) —
 * every other action type in this file only ever moves/damages/conditions whoever it targets, never
 * repositions someone else.
 *
 * EXTENDED AGAIN (Stage 0 of the tactical-planning report — the prerequisite fix before Trip means
 * anything): "stand"/"crawl", the only two move actions Player Core allows while prone
 * (383-actions.json, pg. 408/410). Closes a real bug Trip exposed: nothing previously cleared
 * `prone` except the heal-a-downed-PC path, and checkMoveLegality had no prone gate at all, so a
 * tripped combatant simply strode away at full effective Speed, permanently off-guard and
 * permanently -2 to attack, for the rest of the battle — Trip cost an action and never got paid
 * back. `checkMoveLegality` gained an `allowWhileProne` escape hatch specifically so Crawl (which
 * IS legal prone movement) can delegate to the same shared checks Stride/Step already use without
 * being blocked by the very rule it exists to satisfy. Also fixed here, found re-verifying Escape
 * against a live, individually-fetched source while researching Crawl/Stand: Escape's own DC never
 * involved Fortitude at all — see REAL_OUTCOMES.escape's own regression note, below.
 */

import { makeRng, rollD20, rollFormula } from "../engine/rng.mjs";
import { resolveEffectiveStats } from "./combatant.mjs";
import {
  checkMoveLegality, checkStepLegality, checkStrikeLegal, checkSpellAttackLegal, checkHealAbilityLegal,
  checkSaveAttackLegal, checkDemoralizeLegal, checkConditionSaveLegal, checkAreaAttackLegal,
  checkTripLegal, checkShoveLegal, checkGrappleLegal, checkEscapeLegal, checkStandLegal, checkCrawlLegal,
  multipleAttackPenalty, rangeIncrementPenalty, spendUse
} from "./legality.mjs";
import { resolveStrike, mitigateDamage, expectedStrikeDamage, resolveSave, basicSaveDamage, expectedSaveDamage, degreeProbabilities, degreeOfSuccess, averageDamage, averageFormula } from "../engine/resolve.mjs";
import { distanceFeet, isInBounds, isOccupied, FEET_PER_SQUARE } from "./grid.mjs";
import { hasCover, STANDARD_COVER_AC_BONUS, moveBlockedBetween } from "./terrain.mjs";
import {
  isDead, isUnconscious, isOffGuardFromConditions, attackerConditionPenalty,
  applyKnockout, worsenDyingFromDamage, resolveRecoveryCheck, applyRevival,
  applyGrapple, releaseGrapple, releaseGrapplesHeldBy, usesDyingRules
} from "./conditions.mjs";
import { isFlanking, hasReactiveStrike, threatensSquare, longestMeleeStrike } from "./flanking.mjs";
import { isHostileTo } from "./factions.mjs";

/** Off-Guard's -2 to AC (condition-28-off-guard.json) — the melee-flanking-scoped bonus applied
 * per-attack, alongside the persistent (Prone/Unconscious) one resolveEffectiveStats already folds
 * into the target's base AC. Never double-counted: this only adds the flanking-specific -2 on top
 * when it ISN'T already covered by a persistent off-guard the target has for some other reason. */
export const OFF_GUARD_AC_PENALTY = 2;

/**
 * OUTCOME TABLES (design doc §15f) — the ONE seam where a real battle and a lookahead sandbox
 * differ. Everything else about resolving an action is shared: legality, action costs, the
 * multiple-attack-penalty counter, occupancy. Only the moment a die collapses to a number varies.
 */
const REAL_OUTCOMES = {
  strike(rng, { attacker, strike, target, targetEffective, mapPenalty }) {
    const roll = resolveStrike(rng, { attacker, strike, targetAc: targetEffective.ac, mapPenalty });
    const { appliedDamage } = applyStrikeDamage(roll, target, targetEffective, strike);
    return { roll, appliedDamage, immune: false };
  },
  /** A basic saving throw (e.g. a thrown grenade) — the TARGET rolls, not the attacker. `coverBonus`
   * (Player Core pg. 416, standard cover) applies to Reflex saves specifically ("+2 ... to Reflex
   * saves against area effects") — folded in here as a plain addend, never written back onto
   * `target.saves` itself, since cover is relative to THIS attacker's line, not a persistent stat. */
  saveAttack(rng, { saveAttack, target, targetEffective, coverBonus = 0 }) {
    const saveBonus = target.saves[saveAttack.saveType] + (saveAttack.saveType === "ref" ? coverBonus : 0);
    const saveRoll = resolveSave(rng, { saveBonus, dc: saveAttack.dc });
    const damageEntries = (saveAttack.damage ?? []).map((d) => rollFormula(rng, `${d.dice}${d.bonus >= 0 ? "+" : ""}${d.bonus}`));
    const rawDamage = damageEntries.reduce((sum, e) => sum + e.total, 0);
    const afterSave = basicSaveDamage(rawDamage, saveRoll.degree);
    const appliedDamage = mitigateDamage(afterSave, { target, targetEffective, strike: saveAttack });
    target.currentHP = Math.max(0, target.currentHP - appliedDamage);
    return { roll: { ...saveRoll, damage: { entries: damageEntries, raw: rawDamage, afterSave } }, appliedDamage };
  },
  /** Demoralize (Intimidation): an Intimidation check against the target's Will DC (10 + their Will save). */
  demoralize(rng, { attacker, target }) {
    const modifier = (attacker.intimidationModifier ?? 0) - (attacker.frightened ?? 0); // Frightened penalizes ALL of your own checks, including this one
    const willDC = 10 + target.saves.will;
    const d20 = rollD20(rng);
    const total = d20 + modifier;
    const degree = degreeOfSuccess(d20, total, willDC);
    const appliedFrightened = { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: 0 }[degree];
    return { roll: { d20, modifier, total, dc: willDC, degree }, appliedFrightened };
  },
  /**
   * A condition-only save (design doc §22): the TARGET rolls, same basic shape as saveAttack, but
   * `conditionSave.outcomes[degree]` is a per-degree CONDITION table (e.g. {frightened, stunnedValue})
   * hand-transcribed from the real ability's own description — nothing structural distinguishes
   * which conditions a given degree applies, same "hand-identify, don't infer" discipline as every
   * other prose-only case in this project (extract-npc.mjs's deriveConditionSave is where that
   * table is actually authored, cited against the real text; this function only ever resolves
   * whatever table it's handed).
   */
  conditionSave(rng, { conditionSave, target }) {
    const saveBonus = target.saves[conditionSave.saveType];
    const saveRoll = resolveSave(rng, { saveBonus, dc: conditionSave.dc });
    const applied = conditionSave.outcomes[saveRoll.degree] ?? {};
    return { roll: saveRoll, applied };
  },
  /**
   * A real area/burst effect (design doc §38 — e.g. a thrown grenade). Unlike saveAttack, this is
   * genuinely MULTI-target: `affected` is every living combatant (either side) the blast radius
   * actually caught, pre-resolved by the caller (engine.mjs's areaAttack dispatch, which is the one
   * place with real access to the whole state.combatants/positions map). Real PF2e/SF2e area
   * damage is rolled ONCE and then applied per creature according to THEIR OWN save degree — not a
   * fresh damage roll per target — so `rawDamage` is rolled a single time here and reused for every
   * entry in `results`.
   */
  areaAttack(rng, { areaAttack, affected }) {
    const damageEntries = (areaAttack.damage ?? []).map((d) => rollFormula(rng, `${d.dice}${d.bonus >= 0 ? "+" : ""}${d.bonus}`));
    const rawDamage = damageEntries.reduce((sum, e) => sum + e.total, 0);
    const results = affected.map(({ target, targetEffective, coverBonus = 0 }) => {
      const saveBonus = target.saves[areaAttack.saveType] + (areaAttack.saveType === "ref" ? coverBonus : 0);
      const saveRoll = resolveSave(rng, { saveBonus, dc: areaAttack.dc });
      const afterSave = basicSaveDamage(rawDamage, saveRoll.degree);
      const appliedDamage = mitigateDamage(afterSave, { target, targetEffective, strike: areaAttack });
      target.currentHP = Math.max(0, target.currentHP - appliedDamage);
      return { targetId: target.id, roll: { ...saveRoll, damage: { raw: rawDamage, afterSave } }, appliedDamage };
    });
    return { damage: { entries: damageEntries, raw: rawDamage }, results };
  },
  /**
   * Trip (Athletics, Player Core pg. 193): an Athletics check against the target's Fortitude DC.
   * Critical success adds real 1d6 bludgeoning damage (via the same shared mitigateDamage path as
   * every other damage source) and both success degrees knock the target prone; critical failure
   * knocks the ATTACKER prone instead — a self-effect Shove/Grapple share below.
   */
  trip(rng, { attacker, target, targetEffective }) {
    const modifier = attacker.athleticsModifier ?? 0;
    const dc = 10 + target.saves.fort;
    const d20 = rollD20(rng);
    const total = d20 + modifier;
    const degree = degreeOfSuccess(d20, total, dc);
    let appliedDamage = 0, damage = null;
    if (degree === "criticalSuccess") {
      const entry = rollFormula(rng, "1d6");
      appliedDamage = mitigateDamage(entry.total, { target, targetEffective, strike: null });
      target.currentHP = Math.max(0, target.currentHP - appliedDamage);
      damage = { entries: [entry], raw: entry.total };
    }
    const fell = degree === "criticalSuccess" || degree === "success";
    const selfFell = degree === "criticalFailure";
    return { roll: { d20, modifier, total, dc, degree, damage }, appliedDamage, fell, selfFell };
  },
  /**
   * Shove (Athletics, Player Core pg. 193): an Athletics check against the target's Fortitude DC.
   * The actual repositioning (a real destination square, stopped early by bounds/occupancy/walls)
   * is computed by attemptAction's own pushDestination helper, which has the state access this pure
   * dice-resolution function deliberately doesn't — this only decides how far to attempt.
   */
  shove(rng, { attacker, target }) {
    const modifier = attacker.athleticsModifier ?? 0;
    const dc = 10 + target.saves.fort;
    const d20 = rollD20(rng);
    const total = d20 + modifier;
    const degree = degreeOfSuccess(d20, total, dc);
    const pushFeet = { criticalSuccess: 10, success: 5, failure: 0, criticalFailure: 0 }[degree];
    const selfFell = degree === "criticalFailure";
    return { roll: { d20, modifier, total, dc, degree }, pushFeet, selfFell };
  },
  /**
   * Grapple (Athletics, Player Core pg. 193): an Athletics check against the target's Fortitude DC.
   * Success grabs, critical success restrains (conditions.mjs's applyGrapple, called from
   * attemptAction once this resolves). Player Core: on a FAILURE or CRITICAL FAILURE against a
   * target this SAME attacker already holds, the hold ends; critical failure additionally knocks
   * the attacker prone.
   *
   * REGRESSION NOTE, caught re-verifying against the individually-fetched live action page
   * (https://2e.aonsrd.com/actions/64-grapple) while building Stand/Crawl: the real critical-failure
   * text is "Your target can either grab you, as if it succeeded at using the Grapple action against
   * you, or force you to fall and land prone" — NOT "push you up to 5 feet" as an earlier pass here
   * mis-described it (based on a less precise mirror). The real alternative (the freed target
   * grappling the attacker back) is the freed target's own tactical choice, which this engine has no
   * mechanism for target-directed reactive choices to make; always resolving to the prone
   * alternative, matching Trip/Shove's own self-fall shape, remains a real documented
   * simplification — only the comment describing what's skipped was wrong, not the behavior.
   */
  grapple(rng, { attacker, target }) {
    const modifier = attacker.athleticsModifier ?? 0;
    const dc = 10 + target.saves.fort;
    const d20 = rollD20(rng);
    const total = d20 + modifier;
    const degree = degreeOfSuccess(d20, total, dc);
    const newState = degree === "criticalSuccess" ? "restrained" : degree === "success" ? "grabbed" : null;
    const wasAlreadyHeldByMe = target.grappledBy?.attackerId === attacker.id;
    const releasesExisting = wasAlreadyHeldByMe && !newState;
    const selfFell = degree === "criticalFailure" && wasAlreadyHeldByMe;
    return { roll: { d20, modifier, total, dc, degree }, newState, releasesExisting, selfFell };
  },
  /**
   * Escape (Player Core pg. 408, the general Basic Actions listing — reference/srd/player-core/
   * 383-actions.json, cross-checked live at https://2e.aonsrd.com/actions/5-escape): "Attempt a
   * check using your unarmed attack modifier against the DC of the effect. This is typically the
   * Athletics DC of a creature grabbing you... You can attempt an Acrobatics or Athletics check
   * instead of using your attack modifier if you choose."
   *
   * REGRESSION FIX: the first version of this function used "the Fortitude or Athletics DC of the
   * creature grabbing you, whichever is higher" — that phrasing comes from skill-3-athletics.json's
   * OWN embedded summary of Escape, which turns out to disagree with both the canonical Basic
   * Actions listing and the live, individually-fetched Escape page — neither mentions Fortitude at
   * all. DC is the grappler's real Athletics DC only. This engine has no "unarmed attack modifier"
   * concept distinct from a combatant's named weapon strikes, so the escaping creature's own real,
   * RAW-legal Athletics-check option (explicitly offered as an alternative in the real text) is the
   * one used — not a guess, a documented choice among the rule's own real options.
   */
  escape(rng, { actor, grappler }) {
    const dc = 10 + (grappler.athleticsModifier ?? 0);
    const modifier = actor.athleticsModifier ?? 0;
    const d20 = rollD20(rng);
    const total = d20 + modifier;
    const degree = degreeOfSuccess(d20, total, dc);
    const freed = degree === "criticalSuccess" || degree === "success";
    return { roll: { d20, modifier, total, dc, degree }, freed };
  },
  /**
   * GH #60 — Heal's own real 1d8/1d8+8 dice roll. Branches on `healingFormula` so every EXISTING
   * flat-`healingAmount` heal ability (Transfer Vitality, Field Repair Kit) is completely untouched —
   * an earlier draft called rollFormula unconditionally, which would have thrown on the very first
   * cast of any flat-amount ability (rollFormula(rng, undefined) reads undefined.trim()).
   */
  healAbility(rng, { ability }) {
    if (ability.healingFormula == null) return { healingAmount: ability.healingAmount ?? 0 };
    const { total } = rollFormula(rng, ability.healingFormula);
    return { roll: { healingFormula: ability.healingFormula, total }, healingAmount: total };
  }
};

/**
 * The deterministic twin. Takes an rng parameter it deliberately ignores — the signature matches
 * REAL_OUTCOMES so the two are interchangeable, but a sandbox can never advance the battle's dice
 * even by accident.
 */
const EXPECTED_OUTCOMES = {
  strike(_rng, { strike, target, targetEffective, mapPenalty }) {
    const attackModifier = strike.attackBonus + mapPenalty;
    const expected = expectedStrikeDamage({ attackModifier, targetAc: targetEffective.ac, strike, target, targetEffective });
    if (expected > 0) target.currentHP = Math.max(0, target.currentHP - expected);
    return {
      roll: {
        expected: true, d20: null, degree: null, total: null,
        attackBonus: strike.attackBonus, mapPenalty, targetAc: targetEffective.ac,
        damage: expected > 0 ? { raw: expected, entries: [] } : null
      },
      appliedDamage: expected,
      immune: false
    };
  },
  saveAttack(_rng, { saveAttack, target, targetEffective, coverBonus = 0 }) {
    const saveBonus = target.saves[saveAttack.saveType] + (saveAttack.saveType === "ref" ? coverBonus : 0);
    const expected = expectedSaveDamage({ saveBonus, dc: saveAttack.dc, damage: saveAttack.damage, target, targetEffective });
    if (expected > 0) target.currentHP = Math.max(0, target.currentHP - expected);
    return {
      roll: { expected: true, d20: null, degree: null, total: null, saveBonus, dc: saveAttack.dc, damage: expected > 0 ? { raw: expected, entries: [] } : null },
      appliedDamage: expected
    };
  },
  /** Expected frightened value applied — a fractional "how frightened, on average" number, exactly the same expected-value philosophy expectedStrikeDamage already uses for fractional HP. */
  demoralize(_rng, { attacker, target }) {
    const modifier = (attacker.intimidationModifier ?? 0) - (attacker.frightened ?? 0);
    const willDC = 10 + target.saves.will;
    const probs = degreeProbabilities(modifier, willDC);
    const appliedFrightened = probs.criticalSuccess * 2 + probs.success * 1;
    return { roll: { expected: true, d20: null, modifier, total: null, dc: willDC, degree: null }, appliedFrightened };
  },
  /** Probability-weighted expected value across all four degrees, same shape as demoralize's own expected twin — folds BOTH condition axes (frightened, stunnedValue) since Forced Reflection's table sets both together on some degrees. */
  conditionSave(_rng, { conditionSave, target }) {
    const probs = degreeProbabilities(target.saves[conditionSave.saveType], conditionSave.dc);
    let frightened = 0, stunnedValue = 0;
    for (const [degree, p] of Object.entries(probs)) {
      const outcome = conditionSave.outcomes[degree] ?? {};
      frightened += p * (outcome.frightened ?? 0);
      stunnedValue += p * (outcome.stunnedValue ?? 0);
    }
    return { roll: { expected: true, d20: null, degree: null, total: null, dc: conditionSave.dc }, applied: { frightened, stunnedValue } };
  },
  /**
   * Design doc §38 — the multi-target twin of areaAttack above, one expectedSaveDamage call per
   * affected creature (it already folds the degree-probability-weighted average internally, so no
   * hand-rolled averaging is needed here). This is THE piece that makes friendly fire visible to the
   * AI's own lookahead: evaluateState reads every combatant's live currentHP directly off the
   * sandboxed state (state-value.mjs's own header/§38 design note), so an origin that also expects
   * to cost an ally real HP scores exactly as badly as any other ally-damaging proposal would,
   * automatically — no bespoke "avoid your own side" heuristic needed anywhere in decide.mjs.
   */
  areaAttack(_rng, { areaAttack, affected }) {
    const results = affected.map(({ target, targetEffective, coverBonus = 0 }) => {
      const saveBonus = target.saves[areaAttack.saveType] + (areaAttack.saveType === "ref" ? coverBonus : 0);
      const expected = expectedSaveDamage({ saveBonus, dc: areaAttack.dc, damage: areaAttack.damage, target, targetEffective });
      if (expected > 0) target.currentHP = Math.max(0, target.currentHP - expected);
      return { targetId: target.id, roll: { expected: true, saveBonus, dc: areaAttack.dc, damage: expected > 0 ? { raw: expected } : null }, appliedDamage: expected };
    });
    return { results };
  },
  /**
   * Deterministic twins for Trip/Shove/Grapple/Escape — all four resolve a discrete, non-additive
   * outcome (fell-or-not, a whole number of push squares, held-or-not) that can't be fractionally
   * applied the way Frightened's own continuous value can (see its own EXPECTED_OUTCOMES above), so
   * each picks its single MOST LIKELY degree via degreeProbabilities and resolves deterministically
   * from that — a real, stated simplification, not a guess at behavior nothing here can measure.
   */
  trip(_rng, { attacker, target, targetEffective }) {
    const modifier = attacker.athleticsModifier ?? 0;
    const dc = 10 + target.saves.fort;
    const probs = degreeProbabilities(modifier, dc);
    const mostLikely = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
    // REGRESSION FIX (design doc §43, Stage 2 — found chasing an unrelated anomaly: the whole-turn
    // planner was finding "Trip an already-prone target, repeatedly" scored BETTER than actually
    // attacking). The bug: this used to apply the FULL average 1d6 crit-trip damage whenever
    // criticalSuccess merely had the HIGHEST probability among the four degrees, treating a 51%
    // chance exactly the same as a 100% one — a real MODE-vs-MEAN conflation, the same class of
    // error expectedStrikeDamage (resolve.mjs) has always correctly avoided by probability-weighting
    // success and criticalSuccess separately. A single decide() call never had reason to attempt the
    // SAME control action against the SAME target twice in a row (each real call re-evaluates fresh
    // against the real post-action state), so this was latent — Stage 2's own multi-action lookahead
    // is the first thing to actually chain repeated Trips within one search and expose it. Fixed to
    // a true expectation: `probs.criticalSuccess` of the real 1d6, not a boolean gate.
    const appliedDamage = mitigateDamage(probs.criticalSuccess * averageDamage("1d6", 0), { target, targetEffective, strike: null });
    if (appliedDamage > 0) target.currentHP = Math.max(0, target.currentHP - appliedDamage);
    const fell = mostLikely === "criticalSuccess" || mostLikely === "success";
    // REGRESSION FIX (caught by this project's own required test coverage, not by inspection): the
    // first version of this function hardcoded selfFell:false regardless of mostLikely — exactly
    // the "REAL vs EXPECTED drift" bug class resolve.mjs's own header warns about (two statements of
    // one rule, only one of them updated). A sandboxed Trip attempt would have silently never priced
    // the attacker's own real chance of falling prone.
    const selfFell = mostLikely === "criticalFailure";
    return { roll: { expected: true, d20: null, modifier, total: null, dc, degree: mostLikely, damage: appliedDamage > 0 ? { raw: appliedDamage } : null }, appliedDamage, fell, selfFell };
  },
  shove(_rng, { attacker, target }) {
    const modifier = attacker.athleticsModifier ?? 0;
    const dc = 10 + target.saves.fort;
    const probs = degreeProbabilities(modifier, dc);
    const mostLikely = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
    // Same MODE-vs-MEAN fix as trip's own twin, above: a true expectation over the real push
    // distance (10ft/5ft/0ft by degree), not an all-or-nothing gate on whichever degree is merely
    // most likely.
    const pushFeet = probs.criticalSuccess * 10 + probs.success * 5;
    const selfFell = mostLikely === "criticalFailure"; // same drift fix as trip's own twin, above
    return { roll: { expected: true, d20: null, modifier, total: null, dc, degree: mostLikely }, pushFeet, selfFell };
  },
  grapple(_rng, { attacker, target }) {
    const modifier = attacker.athleticsModifier ?? 0;
    const dc = 10 + target.saves.fort;
    const probs = degreeProbabilities(modifier, dc);
    const mostLikely = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
    const newState = mostLikely === "criticalSuccess" ? "restrained" : mostLikely === "success" ? "grabbed" : null;
    const wasAlreadyHeldByMe = target.grappledBy?.attackerId === attacker.id;
    const releasesExisting = wasAlreadyHeldByMe && !newState;
    const selfFell = mostLikely === "criticalFailure" && wasAlreadyHeldByMe; // same drift fix, matching REAL_OUTCOMES.grapple's own condition exactly
    return { roll: { expected: true, d20: null, modifier, total: null, dc, degree: mostLikely }, newState, releasesExisting, selfFell };
  },
  escape(_rng, { actor, grappler }) {
    const dc = 10 + (grappler.athleticsModifier ?? 0); // same regression fix as REAL_OUTCOMES.escape, above — no Fortitude DC in the real text
    const modifier = actor.athleticsModifier ?? 0;
    const probs = degreeProbabilities(modifier, dc);
    const mostLikely = Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
    const freed = mostLikely === "criticalSuccess" || mostLikely === "success";
    return { roll: { expected: true, d20: null, modifier, total: null, dc, degree: mostLikely }, freed };
  },
  /** Deterministic twin of REAL_OUTCOMES.healAbility — same flat-amount branch, no averaging needed
   * there since a flat amount has no variance to average over. */
  healAbility(_rng, { ability }) {
    if (ability.healingFormula == null) return { healingAmount: ability.healingAmount ?? 0 };
    const expected = averageFormula(ability.healingFormula);
    return { roll: { expected: true, healingFormula: ability.healingFormula, total: expected }, healingAmount: expected };
  }
};

/**
 * Player Core pg. 427, Step 1: everyone rolls d20 + their initiative modifier once, at the top of
 * the encounter; ties keep their scenario array order (stable sort) rather than an arbitrary
 * re-roll — SF2E doesn't mandate a specific tiebreak, and a deterministic one keeps the whole
 * battle reproducible from its seed like everything else here.
 */
function rollInitiative(rng, combatants) {
  const rolls = combatants.map((c) => {
    const d20 = rollD20(rng);
    const modifier = c.initiativeModifier ?? 0;
    return { id: c.id, name: c.name, d20, modifier, total: d20 + modifier };
  });
  const order = [...rolls].sort((a, b) => b.total - a.total).map((r) => r.id);
  return { order, rolls };
}

/**
 * @param {object} scenario
 * @param {number} scenario.seed
 * @param {{cols:number, rows:number}} scenario.gridSize
 * @param {number} scenario.roundLimit
 * @param {Array} scenario.combatants - static + initial dynamic fields
 * @param {(state, combatantId, turnState) => object|null} scenario.ai - decision function per combatant
 */
export function runBattle(scenario) {
  const rng = makeRng(scenario.seed);
  const state = {
    round: 0,
    gridSize: scenario.gridSize,
    // `seed` and `initiativeOrder` are on state deliberately (design doc §15d), not just in the
    // log — the AI needs both and can reach neither otherwise: seed so it can derive its OWN
    // per-decision RNG stream without ever drawing from the engine's rng (which would desync every
    // subsequent real die roll), initiativeOrder so an evaluator can tell who's already acted.
    seed: scenario.seed,
    initiativeOrder: null, // filled immediately below, once the roll has happened
    walls: scenario.walls, // Foundry Wall-schema segments (design doc §19 Phase 1b) — undefined means none
    // design doc §35 — opt-in, undefined/false means completely unchanged §15s behavior (deployment
    // seeds true enemy positions into belief); only a genuinely LOS-validated random deployment sets
    // this, so belief.mjs's own refreshBelief starts empty instead — see that file's own comment.
    blindDeployment: scenario.blindDeployment,
    combatants: new Map(scenario.combatants.map((c) => [c.id, structuredClone(c)])),
    positions: new Map(scenario.combatants.map((c) => [c.id, { ...c.position }])),
    // GH #18 — 1 reaction per round (Player Core pg. 406-407), regained at the start of each of a
    // combatant's own turns. Batch-reset once at round start (below) rather than individually per
    // turn: genuinely equivalent under this engine's simple single-pass-per-round initiative model
    // (every combatant acts exactly once per round, in a fixed order), and the same pattern the
    // Frame-scale sibling already uses (engine/engine.mjs).
    reactionAvailable: new Map(scenario.combatants.map((c) => [c.id, true]))
  };
  const { order: initiativeOrder, rolls: initiativeRolls } = rollInitiative(rng, scenario.combatants);
  state.initiativeOrder = initiativeOrder;

  // Full authored ("sheet") stats, built in INITIATIVE order (not scenario.combatants' authoring
  // order) so every downstream consumer — the artifact's roster panel, the Round 0 deployment
  // listing — inherits the correct order for free via Object.entries/Object.keys, matching the
  // Frame-scale fix for the same divergence (design doc §14i).
  const combatantsById = new Map(scenario.combatants.map((c) => [c.id, c]));
  const roster = Object.fromEntries(
    initiativeOrder.map((id) => {
      const c = combatantsById.get(id);
      return [id, {
        name: c.name, kind: c.kind, side: c.side, size: c.size, maxHP: c.maxHP,
        initiativeModifier: c.initiativeModifier ?? 0,
        ac: c.ac, hardness: c.hardness ?? 0,
        saves: c.saves, speed: c.speed, strikes: c.strikes ?? [],
        // Real authored data, shown for transcript honesty — NOT fired by anything in this file.
        // See this file's own header for why reactions are deliberately not wired up in Phase 1.
        reactions: c.reactions ?? [],
        spells: c.spells ?? [], healAbilities: c.healAbilities ?? [],
        saveAttacks: c.saveAttacks ?? [], conditionSaves: c.conditionSaves ?? [], areaAttacks: c.areaAttacks ?? [], intimidationModifier: c.intimidationModifier ?? null,
        heroPoints: c.heroPoints ?? null, // design doc §42 — real, shown for transcript honesty; null (not 0) for anyone this rule doesn't apply to at all (every NPC)
        spellSlots: c.spellSlots ?? null // GH #60 — same transcript-honesty treatment as heroPoints, the one other combatant-level (not per-ability) resource
      }];
    })
  );
  const log = {
    seed: scenario.seed, gridSize: scenario.gridSize,
    // Both new for the artifact viewer (design doc §19): feetPerSquare so a shared renderer can
    // correctly scale range rings at 5ft instead of assuming the Frame-scale 50ft it was built for
    // (tools/battle-simulator/artifact/geometry.mjs's own former hardcoded constant), and walls so
    // Phase 1b's building actually becomes visible rather than invisible structure nobody can see.
    feetPerSquare: FEET_PER_SQUARE, walls: scenario.walls ?? [],
    initiativeOrder, initiativeRolls, roster,
    deployment: { round: 0, snapshot: snapshotState(state) }, // "Round 0" — every combatant is positioned before the clock starts
    initialSnapshot: snapshotState(state), rounds: [], outcome: null
  };

  for (let round = 1; round <= scenario.roundLimit; round++) {
    state.round = round;
    // OPTIONAL, opt-in progress visibility (design doc §45 — a real, direct ask: distinguish a
    // broken run from a slow-but-working one). Ignored by every existing caller — `scenario` already
    // flows straight through from a plain scenario-builder object, and an absent field is simply
    // `undefined`, so this is a pure addition with zero behavior change for anyone not using it.
    scenario.onRoundStart?.(round, scenario.roundLimit);
    const roundLog = { round, turns: [] };

    for (const id of state.reactionAvailable.keys()) state.reactionAvailable.set(id, true);

    for (const combatantId of initiativeOrder) {
      const combatant = state.combatants.get(combatantId);
      if (isDead(combatant)) continue;

      // Design doc §25 (Player Core pg. 402-403, reference/srd/player-core/
      // 367-hit-points-healing-and-dying.json): a downed PC isn't dead, isn't skipped — they get a
      // real recovery check at the start of each of their turns while unconscious, exactly like a
      // real turn's "if you're dying, roll a recovery check" step. NOT a choice the AI proposes
      // (there's nothing to decide), so this runs directly, before any of the normal stunned/action
      // machinery below, which only applies to a combatant who's actually conscious and acting.
      if (isUnconscious(combatant)) {
        const before = resolveRecoveryCheck(rng, combatant);
        roundLog.turns.push({
          combatantId, dying: true, recoveryCheck: before, actions: [],
          actionAccounting: accountForActions({ available: 0, spent: 0, heldReason: null }),
          snapshot: snapshotState(state)
        });
        const outcome = checkOutcome(state);
        if (outcome) { log.outcome = outcome; break; }
        continue;
      }

      // Stunned (Player Core pg. 421, quoted verbatim in design doc §24 — this is a direct fix of
      // a real, previously-shipped bug, not a first implementation): "Stunned usually includes a
      // VALUE, which indicates how many total actions you lose, possibly over multiple turns...
      // Each time you regain actions, reduce the number you regain by your stunned value, then
      // reduce your stunned value by the number of actions you lost." NOT "skip N whole turns" —
      // the previous code forfeited the ENTIRE turn for ANY stunnedValue > 0 and decremented by
      // exactly 1 per turn regardless of the real value, so a real "Stunned 2" (which should cost
      // exactly 2 of 3 actions, leaving 1 to use immediately) instead lost 6 actions across two
      // fully-forfeited turns — triple the real cost, and Erabryth's real "Stunned 1" (Forced
      // Reflection, failure) lost all 3 instead of exactly 1.
      let actionsAvailableOverride, stunnedActionsLost;
      if (combatant.stunnedValue > 0) {
        const fullAvailable = resolveEffectiveStats(combatant).actionsAvailable;
        const lost = Math.min(fullAvailable, combatant.stunnedValue);
        combatant.stunnedValue -= lost;
        const remaining = fullAvailable - lost;
        stunnedActionsLost = lost;
        if (remaining <= 0) {
          // The stun value was big enough to consume the WHOLE turn (Player Core's own worked
          // example: stunned 4 loses all 3 actions of a turn, carrying 1 over) — a real, if rarer,
          // case, not the automatic outcome of any nonzero value the old code assumed.
          roundLog.turns.push({
            combatantId, stunned: true, stunnedActionsLost: lost, actions: [],
            actionAccounting: accountForActions({
              available: fullAvailable, spent: 0,
              heldReason: `Stunned — lost all ${lost} of ${fullAvailable} action(s) this turn${combatant.stunnedValue > 0 ? ` (${combatant.stunnedValue} more carries to next turn)` : ""}`
            }),
            snapshot: snapshotState(state)
          });
          const outcome = checkOutcome(state);
          if (outcome) { log.outcome = outcome; break; }
          continue;
        }
        actionsAvailableOverride = remaining;
      }

      const turnLog = runTurn({ state, rng, scenario, combatantId, actionsAvailableOverride });
      if (actionsAvailableOverride != null) {
        turnLog.stunned = true;
        turnLog.stunnedActionsLost = stunnedActionsLost;
      }

      // Frightened decay (reference/srd/player-core/condition-18-frightened.json, mirrored
      // verbatim): "at the end of each of your turns, the value... decreases by 1." Placed here,
      // after the combatant's own turn fully resolves, matching the real rule's own timing exactly
      // — NOT at the start of their next turn, and NOT decremented on anyone else's turn.
      if (combatant.frightened > 0) combatant.frightened -= 1;

      // Grapple expiry (condition-20-grabbed.json/condition-34-restrained.json): "until the end of
      // your next turn." `expiresEndOfRound` is set to (the round Grapple was applied) + 1 when
      // applied (conditions.mjs's applyGrapple); checked here, the same "after this combatant's own
      // turn fully resolves" point Frightened's own decay already uses, so it fires once THIS
      // combatant (the grappler) has actually had that next turn, not on anyone else's. A grapple
      // still ends immediately on the grappler's own move (see the move/step branches below) or via
      // the target's own Escape — this is only the natural, un-forced expiry.
      for (const c of state.combatants.values()) {
        if (c.grappledBy?.attackerId === combatant.id && state.round >= c.grappledBy.expiresEndOfRound) {
          releaseGrapple(c);
        }
      }

      turnLog.snapshot = snapshotState(state);
      roundLog.turns.push(turnLog);

      const outcome = checkOutcome(state);
      if (outcome) {
        log.outcome = outcome;
        break;
      }
    }

    log.rounds.push(roundLog);
    if (log.outcome) break;
  }

  if (!log.outcome) log.outcome = { result: "timeout", detail: `Round limit (${scenario.roundLimit}) reached with no side eliminated.` };

  return log;
}

/**
 * Builds and validates one turn's action-point ledger. `available` is always the combatant's
 * actionsAvailable AT THE START of its turn. THROWS if spent+held != available: that combination
 * can only happen from a real bug in the caller, and this is the one place in the file positioned
 * to catch it for every turn, every combatant, unconditionally.
 */
export function accountForActions({ available, spent, heldReason }) {
  const held = available - spent;
  if (held < 0) {
    throw new Error(`Action accounting failure: spent ${spent} of ${available} available action points — spent MORE than available.`);
  }
  if (held > 0 && !heldReason) {
    throw new Error(`Action accounting failure: ${held} of ${available} action point(s) went unspent with no recorded reason.`);
  }
  return { available, spent, held, heldReason: held > 0 ? heldReason : null };
}

/**
 * ONE mutable per-turn object (design doc §15d). Everything that carries information from one
 * action to the next within a turn lives here and nowhere else: the action budget, movement
 * spent, and the shared multiple-attack-penalty counter. `{ ...turnProgress }` is a complete fork
 * by construction — this is what makes the lookahead sandbox's forking cheap and safe.
 *
 * `destCache` (GH #62, design doc §76.4 fix 2) is deliberately an OBJECT wrapping a Map, not a bare
 * Map or a bare field: `{ ...turnProgress }` (below, and at every call site that spreads turn
 * progress into a copy) copies the REFERENCE to this one container across every one of a turn's real
 * decide() calls, so `decide.mjs`'s `planTurn` can mutate `.map`/`.fingerprint` on the SAME shared
 * object every time — a bare string field would NOT survive this copy the same way (verified the hard
 * way: an earlier draft of this fix stored the fingerprint directly on `turnProgress` and it silently
 * never worked, since every `{...turnProgress}` copy left the ORIGINAL untouched). `planTurn` owns
 * everything about how this cache is used/invalidated; this file only ever constructs the empty
 * container once per real turn and lets the reference ride along.
 */
function makeTurnProgress(startEffective) {
  return {
    actionsAvailable: startEffective.actionsAvailable,
    actionsUsed: 0,
    feetMoved: 0,
    strikesAttempted: 0,
    decisionIndex: 0, // monotonic per turn; seeds the AI's own per-decision RNG (§15f)
    destCache: { map: new Map(), fingerprint: null }
  };
}

/**
 * `actionsAvailableOverride` (design doc §24): a partially-stunned turn (Player Core pg. 421 —
 * Stunned carries a VALUE, the number of actions lost, not a number of whole turns skipped) still
 * plays out as a real turn once its stun value is smaller than the actions it would otherwise
 * receive — it just starts with fewer of them. Threading a smaller number through here (rather than
 * teaching resolveEffectiveStats about a transient per-turn deduction) keeps that function a pure
 * read of persistent combatant state, safe to call from anywhere including the AI's own sandboxed
 * lookahead — the existing `Math.min(effective.actionsAvailable, startEffective.actionsAvailable)`
 * cap a few lines below already respects a smaller startEffective with no further change needed.
 */
function runTurn({ state, rng, scenario, combatantId, actionsAvailableOverride }) {
  const combatant = state.combatants.get(combatantId);
  const baseEffective = resolveEffectiveStats(combatant);
  const startEffective = actionsAvailableOverride != null
    ? { ...baseEffective, actionsAvailable: Math.min(baseEffective.actionsAvailable, actionsAvailableOverride) }
    : baseEffective;
  const turnProgress = makeTurnProgress(startEffective);
  const turnLog = { combatantId, effectiveStats: startEffective, feetMoved: 0, strikesAttempted: 0, actions: [] };

  if (startEffective.disabled) {
    turnLog.actions.push({ type: "none", note: `${combatant.name} is at 0 HP — no actions.` });
    turnLog.actionAccounting = accountForActions({ available: startEffective.actionsAvailable, spent: 0, heldReason: null });
    return turnLog;
  }

  let heldReason = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const effective = resolveEffectiveStats(combatant);
    if (effective.disabled) {
      turnLog.actions.push({ type: "none", note: `${combatant.name} was reduced to 0 HP mid-turn — remaining actions forfeited.` });
      heldReason = "Reduced to 0 HP mid-turn — remaining actions forfeited";
      break;
    }
    turnProgress.actionsAvailable = Math.min(effective.actionsAvailable, startEffective.actionsAvailable);

    // The AI receives a COPY, never the live object — it can read its own turn progress but
    // cannot mutate the engine's counters.
    const proposal = scenario.ai(state, combatantId, { ...turnProgress, effective });
    if (!proposal) {
      heldReason = "No legal action the AI could find to spend the remaining action point(s) on";
      break;
    }

    const result = attemptAction({ state, rng, combatantId, proposal, turnProgress, turnLog, effective });
    turnLog.actions.push(result);
    turnProgress.decisionIndex += 1;
    if (!result.legal) {
      // a well-behaved AI never proposes an illegal action twice in a row; stop the turn rather than loop forever
      heldReason = `AI proposed an illegal ${result.type} (${result.reason}) — turn ended rather than retry`;
      break;
    }
    if (turnProgress.actionsUsed >= turnProgress.actionsAvailable) break; // spent everything this turn's budget allows
  }

  turnLog.feetMoved = turnProgress.feetMoved;
  turnLog.strikesAttempted = turnProgress.strikesAttempted;
  turnLog.actionAccounting = accountForActions({ available: startEffective.actionsAvailable, spent: turnProgress.actionsUsed, heldReason });
  return turnLog;
}

/**
 * Shared damage-application path. Player Core p.399 ("Apply immunities first, then weaknesses,
 * and resistances third") is handled inside resolve.mjs's mitigateDamage — the ONE implementation
 * shared with the AI's own damage prediction (design doc §15e). This function's remaining job is
 * the part only the engine may do: actually writing the HP.
 */
function applyStrikeDamage(strikeResult, target, targetEffective, strike) {
  if (!strikeResult.damage) return { appliedDamage: 0 };
  const appliedDamage = mitigateDamage(strikeResult.damage.raw, { target, targetEffective, strike });
  target.currentHP = Math.max(0, target.currentHP - appliedDamage);
  return { appliedDamage };
}

/**
 * Design doc §25 (Player Core pg. 402-403): the real dying spiral, checked after EVERY damage
 * application, for strike/spellAttack/saveAttack alike — a shared hook rather than three copies,
 * exactly the pattern this whole feature exists to establish. Only ever does anything for a target
 * `usesDyingRules` (conditions.mjs's own isDead/applyKnockout carry the real PC-vs-NPC asymmetry —
 * side-keyed by default, `pcDeathRules`-overridable per design doc §49's own erratum for mirror
 * matches; an ordinary NPC reduced to 0 HP is just dead, nothing more to compute) and only when real
 * damage was actually dealt (a miss, or a save's own criticalSuccess-so-no-damage case, changes nothing).
 * `hpBefore` distinguishes the FIRST knockout (gain dying 1/2, Player Core's own "when you're
 * reduced to 0 HP" trigger) from a follow-up hit on an already-downed target (dying increases by
 * 1/2 INSTEAD of further HP loss, since HP is already floored at 0) — both real, both possible in
 * the exact same combat, so both need covering, not just the first one.
 */
function applyDyingTransition({ target, hpBefore, appliedDamage, critical, allCombatants }) {
  // Grapple: a creature just knocked to (or further past) 0 HP can't maintain a physical hold on
  // anyone — release any grapple THIS target holds over someone else, regardless of side, before
  // the party-only dying-spiral logic below (conditions.mjs's own releaseGrapplesHeldBy header
  // documents why this is a real, necessary ruling rather than an invented one). `allCombatants` is
  // optional so every pre-existing call site keeps working unchanged; only Strike/spellAttack/
  // saveAttack/areaAttack/Trip (the action types that can actually deal damage) pass it.
  if (allCombatants && appliedDamage > 0 && hpBefore > 0 && target.currentHP <= 0) {
    releaseGrapplesHeldBy(allCombatants, target.id);
  }
  if (!usesDyingRules(target) || appliedDamage <= 0) return;
  if (hpBefore > 0 && target.currentHP <= 0) applyKnockout(target, { critical });
  else if (hpBefore <= 0) worsenDyingFromDamage(target, { critical });
}

/**
 * Design doc §30: every HP-affecting action result already carries targetHPAfter; this adds the
 * matching "after" snapshot of the target's own condition fields so the artifact viewer can sync
 * its roster/chips to the SAME moment the HP number changes, beat by beat, rather than jumping
 * straight to the whole turn's end state the instant playback begins — the real root cause behind
 * the "heal cast on an already-full-health target" report (the target genuinely was hurt when
 * healed; the roster just hadn't caught up yet, since it was showing turn-end state throughout).
 * Mirrors conditionSave's own pre-existing targetFrightenedAfter/targetStunnedValueAfter fields —
 * same "targetXAfter" naming shape, not a second vocabulary.
 */
function targetConditionAfter(target) {
  return {
    targetDyingValueAfter: target.dyingValue ?? 0,
    targetWoundedValueAfter: target.woundedValue ?? 0,
    targetProneAfter: !!target.prone,
    targetUnconsciousAfter: isUnconscious(target),
    targetDeadAfter: isDead(target)
  };
}

/**
 * Every combatant's position, for occupancy purposes — DEAD combatants excluded. A defeated
 * creature's square isn't an obstacle (nothing in Player Core treats a fallen creature as blocking
 * movement the way a standing one does), so it must never count as "occupied" for pathing/legality.
 *
 * REAL BUG this fixes, found from a direct user report and confirmed by instrumenting a real fight:
 * `state.positions` keeps every combatant's last position forever, alive or dead (deliberately —
 * the artifact viewer needs a defeated combatant's final square to render its body). Every
 * occupancy check used to read straight off `state.positions` with no HP filter at all, so a
 * combatant who died standing in a single-square doorway permanently sealed that doorway for the
 * rest of the battle — confirmed directly: Security Goon died at (20,11), the ONLY doorway between
 * the courtyard and Xenowarden Greenhorn's building, and every one of Xenowarden Greenhorn's own
 * pathfinding calls for the following 27 rounds still listed `security-goon-o0@20,11(hp0)` as an
 * occupied, blocking square — she was structurally unable to ever leave her own building again,
 * which is what the "oscillates near a doorway that goes nowhere" and "moved three times instead of
 * engaging" reports were actually observing. Both the real legality gate here (via this function)
 * and the AI's own candidate generation (decide.mjs's own matching `otherLivingPositions`) needed
 * this fix — the AI's route-planning would still have proposed nothing useful even after the real
 * engine started allowing the correct move, since it independently rebuilds its own occupancy list.
 */
function livingPositions(state) {
  return [...state.positions.entries()]
    .filter(([id]) => (state.combatants.get(id)?.currentHP ?? 0) > 0)
    .map(([id, p]) => ({ combatantId: id, pos: p, side: state.combatants.get(id).side }));
}

/** Every OTHER living, same-side combatant — flanking.mjs's own candidate pool for "who could be
 * flanking alongside me". An unconscious ally (currentHP<=0) can't act and can't attack, so can't
 * help flank either — excluded the same way livingPositions already excludes anyone down. */
export function alliesWithPositions(state, combatant) {
  return [...state.combatants.values()]
    .filter((c) => c.id !== combatant.id && c.side === combatant.side && c.currentHP > 0)
    .map((c) => ({ id: c.id, pos: state.positions.get(c.id), combatant: c }));
}

/**
 * Shove (Athletics, Player Core pg. 193): pushes the target directly away from the attacker, up to
 * `squares` squares (1 for a success's real 5ft, 2 for a critical success's real 10ft — this engine
 * uses whole squares as the push primitive rather than reconciling the 5-10-5 diagonal-cost formula
 * for a diagonal push, the same simplification most real tables make at the table; Shove's target
 * is always within the attacker's own melee reach, so the push direction is always one clean
 * compass heading). Player Core: "can't move it into or through obstacles" — stops at the last
 * clear square if something blocks the full push, rather than failing the push outright.
 */
function pushDestination(attackerPos, targetPos, squares, gridSize, otherPositions, walls) {
  const dx = Math.sign(targetPos.col - attackerPos.col);
  const dy = Math.sign(targetPos.row - attackerPos.row);
  let cur = { ...targetPos };
  for (let i = 0; i < squares; i++) {
    const next = { col: cur.col + dx, row: cur.row + dy };
    if (!isInBounds(next, gridSize)) break;
    if (isOccupied(next, otherPositions)) break;
    if (walls?.length && moveBlockedBetween(cur, next, walls)) break;
    cur = next;
  }
  return cur;
}

/**
 * The shared resolution core behind a melee Strike (GH #18) — extracted so a Reactive Strike (fired
 * from `attemptAction`'s own "move" branch, below) and a proactive one (the "strike" branch,
 * further below) share ONE implementation rather than drifting apart, exactly the "six parallel
 * pipelines" anti-pattern GH #69's own investigation already diagnosed and warned against in this
 * codebase. Takes an already-composed `mapPenalty` and an optional `rangePenalty` (default 0,
 * correct for a Reactive Strike — it's inherently melee, no range increment applies) — composing
 * MAP/range/condition into that single number is each CALLER's own concern, not this function's.
 */
function resolveMeleeStrikeAgainst({ state, rng, outcomes, attacker, attackerPos, target, targetPos, strike, mapPenalty, rangePenalty = 0 }) {
  const coverBonus = hasCover(attackerPos, targetPos, state.walls) ? STANDARD_COVER_AC_BONUS : 0;
  // Flanking (design doc §25) is melee-only, and off-guard is never double-counted: if the target
  // already has a PERSISTENT off-guard (prone/unconscious, already folded into baseEffective.ac by
  // resolveEffectiveStats), flanking adds nothing further — same target, same -2, one source is enough.
  const flankBonus = (strike.strikeType === "melee" && !isOffGuardFromConditions(target)
    && isFlanking(attacker, attackerPos, target, targetPos, alliesWithPositions(state, attacker), state.walls))
    ? OFF_GUARD_AC_PENALTY : 0;
  const baseEffective = resolveEffectiveStats(target);
  // ONE signed delta, deliberately — see the "strike" branch's own identical comment for why.
  const acDelta = coverBonus - flankBonus;
  const targetEffective = acDelta ? { ...baseEffective, ac: baseEffective.ac + acDelta } : baseEffective;

  const hpBefore = target.currentHP;
  const { roll, appliedDamage } = outcomes.strike(rng, {
    attacker, strike, target, targetEffective, mapPenalty: mapPenalty + rangePenalty
  });
  roll.rangePenalty = rangePenalty;
  applyDyingTransition({ target, hpBefore, appliedDamage, critical: roll.degree === "criticalSuccess", allCombatants: state.combatants.values() });

  // Limited-use abilities: decrement on a successful fire — the caller's own legality/threat gate
  // already refused this if usesRemaining was already 0.
  if (strike.usesRemaining != null) strike.usesRemaining -= 1;

  return {
    roll, hardnessApplied: targetEffective.hardness, coverBonus, flankBonus,
    damageApplied: appliedDamage, targetHPAfter: target.currentHP, ...targetConditionAfter(target),
    usesRemaining: strike.usesRemaining ?? null
  };
}

/** Cheap short-circuit (GH #18): is there ANY living, hostile, reaction-available Reactive-Strike
 * holder anywhere on the field? Checked ONCE per move resolution, before ever walking the path —
 * O(combatants), not O(path × combatants). Given only a small minority of real fixtures carry
 * Reactive Strike, this keeps every untouched scenario/test/MCTS-search-node-expansion (a genuinely
 * hot path — design doc §76.4, GH #62) at its current cost, unchanged. */
function anyLivingReactiveStrikeHolder(state, mover) {
  for (const c of state.combatants.values()) {
    if (c.id === mover.id) continue;
    if (isDead(c) || isUnconscious(c)) continue;
    // `?? true`: a state object built by hand (bypassing runBattle's own constructor — several
    // search/test fixtures do this) may never have a `reactionAvailable` map at all; treat that as
    // "not tracked, so not yet spent" rather than crashing, matching this codebase's own established
    // "optional field, sensible default" idiom used everywhere else (c.hardness ?? 0, c.strikes ?? []).
    if (!(state.reactionAvailable?.get(c.id) ?? true)) continue;
    if (!isHostileTo(c, mover)) continue;
    if (hasReactiveStrike(c)) return true;
  }
  return false;
}

/** The ONLY function in this codebase permitted to mutate combatant position/HP/flags. */
function attemptAction({ state, rng, combatantId, proposal, turnProgress, turnLog, effective, outcomes = REAL_OUTCOMES }) {
  const combatant = state.combatants.get(combatantId);
  const pos = state.positions.get(combatantId);

  if (proposal.type === "move") {
    // proposal.to may carry a `path` (design doc §16, world/pathfind.mjs's wall-aware routing) —
    // real routing data checkMoveLegality needs but which must never leak into state.positions as
    // if it were part of a combatant's position (positions are plain {col,row}).
    const { path, ...to } = proposal.to;
    const check = checkMoveLegality({
      combatant, from: pos, to, effectiveSpeed: effective.speed,
      allPositions: livingPositions(state),
      gridSize: state.gridSize, turnState: turnProgress, walls: state.walls, path
    });
    if (!check.legal) return { type: "move", to, legal: false, reason: check.reason };

    // GH #18 (Reactive Strike, gamesystems/sf2e/lang/en.json's real, cited text): walk the real
    // path square-by-square, firing any hostile, reaction-available Reactive-Strike holder who
    // threatens a square AS IT'S LEFT — not just at the final destination (the one real difference
    // from the Frame-scale sibling's own destination-only checkReactionTriggers). `path`, when
    // present, already includes the origin cell (see this branch's own final comment below); a null
    // path (a wall-less scenario's straight-line fallback) still needs the one real [from,to] hop.
    // Cheap short-circuit first (Decision 4): only walk the path at all if a real, live, hostile,
    // Reactive-Strike-capable reactor exists anywhere on the field — every scenario/test/MCTS-search
    // node without one pays nothing extra.
    const fullPath = path ?? [pos, to];
    const reactions = [];
    let stoppedAt = null, stoppedIndex = null;
    if (anyLivingReactiveStrikeHolder(state, combatant)) {
      outer:
      for (let i = 0; i < fullPath.length - 1; i++) {
        const leaving = fullPath[i];
        // `?? state.combatants.keys()`: a state built by hand (or via a scenario helper that never
        // rolled initiative) may not have `initiativeOrder` set at all — Map iteration (insertion)
        // order is still a real, deterministic, stable fallback for "who resolves first," matching
        // the same "optional field, sensible default" idiom used throughout this file.
        for (const reactorId of state.initiativeOrder ?? state.combatants.keys()) {
          if (reactorId === combatantId) continue;
          if (!(state.reactionAvailable?.get(reactorId) ?? true)) continue; // see anyLivingReactiveStrikeHolder's own comment
          const reactor = state.combatants.get(reactorId);
          if (!isHostileTo(reactor, combatant)) continue;
          const reactorPos = state.positions.get(reactorId);
          if (!threatensSquare(reactor, reactorPos, leaving, state.walls)) continue;

          const strike = longestMeleeStrike(reactor); // the same weapon threatensSquare gated on
          state.reactionAvailable?.set(reactorId, false);
          const result = resolveMeleeStrikeAgainst({
            state, rng, outcomes, attacker: reactor, attackerPos: reactorPos,
            target: combatant, targetPos: leaving, strike,
            // Flat 0 MAP/range component — real by RAW, not a simplification: a Reactive Strike
            // "doesn't count toward... multiple attack penalty, and its multiple attack penalty
            // doesn't apply to this Strike" (gamesystems/sf2e/lang/en.json). Condition penalty
            // (frightened/prone of the REACTOR) still applies normally.
            mapPenalty: attackerConditionPenalty(reactor)
          });
          reactions.push({ reactorId, strikeName: strike.name, ...result });

          // A miss, or a non-critical hit, never stops the move (RAW scopes disruption to "a
          // critical hit AND the trigger was a manipulate action" — never a move trigger). Only the
          // natural consequence of the mover being incapacitated by the damage itself can.
          if (isDead(combatant) || isUnconscious(combatant)) { stoppedAt = leaving; stoppedIndex = i; break outer; }
        }
      }
    }

    const finalTo = stoppedAt ?? to;
    const stepDistance = distanceFeet(pos, finalTo);
    state.positions.set(combatantId, { ...finalTo });
    turnProgress.feetMoved += stepDistance;
    turnProgress.actionsUsed += 1;

    // Grapple: "ends... unless you move" — a Stride always releases anyone THIS combatant holds.
    releaseGrapplesHeldBy(state.combatants.values(), combatantId);

    // design doc §26: unlike state.positions, the LOG is exactly where this real route belongs —
    // preserving it here is what lets the artifact viewer glide a token through its own actual
    // wall-avoiding path instead of a straight line between endpoints, which visually cut through
    // whatever corner/wall a genuinely bent route (decide.mjs's Dijkstra-based destination
    // selection, ported from §16) had legitimately routed around. `path` includes the origin cell
    // (world/pathfind.mjs's own documented shape) — null when no real path was computed at all
    // (a wall-less scenario's straight-line fallback, where [from,to] already IS the real route).
    // Truncated (GH #18) to match `finalTo` when a reaction cut the move short mid-path, rather than
    // logging a route the mover never actually completed.
    const loggedPath = path && stoppedIndex != null ? path.slice(0, stoppedIndex + 1) : (path ?? null);
    return {
      type: "move", from: { ...pos }, to: { ...finalTo }, path: loggedPath, feet: stepDistance,
      legal: true, actionsCost: 1, reactions: reactions.length ? reactions : undefined,
      decisionReason: proposal.reason ?? null
    };
  }

  // Step (Player Core pg. 410): identical to a move in every way except it is capped at one
  // square and never triggers a reaction (GH #18) — real, textually confirmed RAW ("Unlike most
  // types of movement, Stepping doesn't trigger reactions, such as Reactive Strike"), not an
  // oversight: this branch deliberately never walks a path/checks threatened squares the way
  // "move" now does.
  if (proposal.type === "step") {
    const { path: _stepPath, ...to } = proposal.to;
    const check = checkStepLegality({
      combatant, from: pos, to, effectiveSpeed: effective.speed,
      allPositions: livingPositions(state),
      gridSize: state.gridSize, turnState: turnProgress, walls: state.walls
    });
    if (!check.legal) return { type: "step", to, legal: false, reason: check.reason };

    const stepDistance = distanceFeet(pos, to);
    state.positions.set(combatantId, { ...to });
    turnProgress.feetMoved += stepDistance;
    turnProgress.actionsUsed += 1;

    // Grapple: "ends... unless you move" — a Step is still movement, so it releases too.
    releaseGrapplesHeldBy(state.combatants.values(), combatantId);

    return { type: "step", from: { ...pos }, to: { ...to }, feet: stepDistance, legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };
  }

  if (proposal.type === "strike") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const strike = (combatant.strikes ?? [])[proposal.strikeIndex ?? 0];
    // A proposal naming a strike this combatant does not have is ILLEGAL, not a crash — an AI (or
    // an adversarial test) may propose anything and the engine turns anything invalid into a
    // no-op with a reason.
    if (!strike) return { type: "strike", targetId: proposal.targetId, legal: false, reason: `No strike at index ${proposal.strikeIndex ?? 0} — ${combatant.name} has ${(combatant.strikes ?? []).length}.` };

    const check = checkStrikeLegal({ attacker: combatant, attackerPos: pos, target, targetPos, strike, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "strike", targetId: proposal.targetId, legal: false, reason: check.reason };

    turnProgress.strikesAttempted += 1;
    const mapPenalty = multipleAttackPenalty(turnProgress.strikesAttempted, (strike.traits ?? []).includes("agile"));
    const rangePenalty = rangeIncrementPenalty(strike, distanceFeet(pos, targetPos));
    const conditionPenalty = attackerConditionPenalty(combatant); // design doc §25: frightened + prone, replaces the old frightened-only inline snippet

    const result = resolveMeleeStrikeAgainst({
      state, rng, outcomes, attacker: combatant, attackerPos: pos, target, targetPos, strike,
      mapPenalty: mapPenalty + conditionPenalty, rangePenalty
    });
    turnProgress.actionsUsed += 1;

    return {
      type: "strike", strikeName: strike.name, targetId: proposal.targetId, legal: true, actionsCost: 1,
      decisionReason: proposal.reason ?? null, ...result
    };
  }

  // Spell attack (design doc §14k): mechanically a Strike wearing different clothes — Player
  // Core's "make a ranged spell attack roll against the target's AC, crit doubles" is the exact
  // same degree-of-success shape resolveStrike() already resolves, so it's reused directly rather
  // than duplicated. What's genuinely different: a variable action cost (spell.actions, not
  // hardcoded to 1) and a flat range instead of an incrementing one, both handled entirely in
  // checkSpellAttackLegal. Spells with the attack trait share the SAME multiple-attack-penalty
  // counter as ordinary Strikes (Player Core: any attack-trait action counts toward MAP).
  if (proposal.type === "spellAttack") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const spell = (combatant.spells ?? [])[proposal.spellIndex ?? 0];
    if (!spell) return { type: "spellAttack", targetId: proposal.targetId, legal: false, reason: `No spell at index ${proposal.spellIndex ?? 0} — ${combatant.name} has ${(combatant.spells ?? []).length}.` };

    const check = checkSpellAttackLegal({ caster: combatant, casterPos: pos, target, targetPos, spell, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "spellAttack", targetId: proposal.targetId, legal: false, reason: check.reason };

    turnProgress.strikesAttempted += 1;
    const mapPenalty = multipleAttackPenalty(turnProgress.strikesAttempted, (spell.traits ?? []).includes("agile"));
    const conditionPenalty = attackerConditionPenalty(combatant); // design doc §25 — no flanking bonus below: flanking's off-guard is melee-only, and no spell in this roster carries a melee strikeType
    const coverBonus = hasCover(pos, targetPos, state.walls) ? STANDARD_COVER_AC_BONUS : 0;
    const baseEffective = resolveEffectiveStats(target);
    const targetEffective = coverBonus ? { ...baseEffective, ac: baseEffective.ac + coverBonus } : baseEffective;

    const hpBefore = target.currentHP;
    const { roll: spellResult, appliedDamage } = outcomes.strike(rng, {
      attacker: combatant, strike: spell, target, targetEffective, mapPenalty: mapPenalty + conditionPenalty
    });
    applyDyingTransition({ target, hpBefore, appliedDamage, critical: spellResult.degree === "criticalSuccess", allCombatants: state.combatants.values() });
    turnProgress.actionsUsed += spell.actions ?? 1;

    if (spell.usesRemaining != null) spell.usesRemaining -= 1;

    return {
      type: "spellAttack", spellName: spell.name, targetId: proposal.targetId, legal: true, actionsCost: spell.actions ?? 1,
      roll: spellResult, hardnessApplied: targetEffective.hardness, coverBonus,
      damageApplied: appliedDamage, targetHPAfter: target.currentHP, ...targetConditionAfter(target),
      usesRemaining: spell.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Heal ability (design doc §14k): e.g. the Mystic's real Transfer Vitality — "you can transfer
  // up to N Hit Points... into yourself or a bonded creature," no roll at all.
  if (proposal.type === "healAbility") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const ability = (combatant.healAbilities ?? [])[proposal.abilityIndex ?? 0];
    if (!ability) return { type: "healAbility", targetId: proposal.targetId, legal: false, reason: `No heal ability at index ${proposal.abilityIndex ?? 0} — ${combatant.name} has ${(combatant.healAbilities ?? []).length}.` };

    const check = checkHealAbilityLegal({ healer: combatant, healerPos: pos, target, targetPos, ability, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "healAbility", targetId: proposal.targetId, legal: false, reason: check.reason };

    const { healingAmount: healing } = outcomes.healAbility(rng, { ability, target });
    const wasDownBeforeHealing = target.currentHP <= 0;
    target.currentHP = Math.min(target.maxHP, target.currentHP + healing);
    // Player Core pg. 403: "restored to 1 Hit Point or more via healing, you lose the dying and
    // unconscious conditions and can act normally on your next turn" — design doc §25.
    if (wasDownBeforeHealing && target.currentHP > 0) applyRevival(target);
    turnProgress.actionsUsed += ability.actions ?? 1;

    spendUse(ability, combatant);

    return {
      type: "healAbility", abilityName: ability.name, targetId: proposal.targetId, legal: true, actionsCost: ability.actions ?? 1,
      healing, targetHPAfter: target.currentHP, ...targetConditionAfter(target),
      usesRemaining: ability.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Save-based attack (e.g. a thrown grenade, Player Core pg. 398's basic-save shape): the TARGET
  // rolls, not the attacker — no attack roll at all, so this does NOT increment
  // turnProgress.strikesAttempted and is never subject to Multiple Attack Penalty (MAP only
  // applies to attack ROLLS, Player Core's own rule — see rangeIncrementPenalty's sibling
  // multipleAttackPenalty for the ordinary-Strike case this deliberately does NOT share).
  if (proposal.type === "saveAttack") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const saveAttackAbility = (combatant.saveAttacks ?? [])[proposal.saveAttackIndex ?? 0];
    if (!saveAttackAbility) return { type: "saveAttack", targetId: proposal.targetId, legal: false, reason: `No saveAttack at index ${proposal.saveAttackIndex ?? 0} — ${combatant.name} has ${(combatant.saveAttacks ?? []).length}.` };

    const check = checkSaveAttackLegal({ attacker: combatant, attackerPos: pos, target, targetPos, saveAttack: saveAttackAbility, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "saveAttack", targetId: proposal.targetId, legal: false, reason: check.reason };

    const coverBonus = hasCover(pos, targetPos, state.walls) ? STANDARD_COVER_AC_BONUS : 0;
    const targetEffective = resolveEffectiveStats(target);
    const hpBefore = target.currentHP;
    const { roll: saveResult, appliedDamage } = outcomes.saveAttack(rng, { saveAttack: saveAttackAbility, target, targetEffective, coverBonus });
    // Design doc §25: no attack roll here (the TARGET rolls), so the relevant "critical" for the
    // real dying-value math is the target's own critical FAILURE of their save — Player Core's own
    // "or the result of your critical failure" clause, not the attacker's (nonexistent) crit.
    applyDyingTransition({ target, hpBefore, appliedDamage, critical: saveResult.degree === "criticalFailure", allCombatants: state.combatants.values() });
    turnProgress.actionsUsed += saveAttackAbility.actions ?? 1;

    if (saveAttackAbility.usesRemaining != null) saveAttackAbility.usesRemaining -= 1;

    return {
      type: "saveAttack", saveAttackName: saveAttackAbility.name, targetId: proposal.targetId, legal: true, actionsCost: saveAttackAbility.actions ?? 1,
      roll: saveResult, hardnessApplied: targetEffective.hardness, coverBonus,
      damageApplied: appliedDamage, targetHPAfter: target.currentHP, ...targetConditionAfter(target),
      usesRemaining: saveAttackAbility.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Demoralize (Intimidation, Player Core pg. 200): an Intimidation check, not an attack roll —
  // also never subject to MAP, for the same reason as saveAttack above. This is the actual
  // mechanism behind "Demoralize is a reliable way to spend an action when your remaining attacks
  // would carry a heavy MAP penalty" (Ingram's own framing, design doc §19): a 3rd Strike eats -10,
  // Demoralize eats 0, regardless of how many Strikes came before it this turn.
  if (proposal.type === "demoralize") {
    const target = state.combatants.get(proposal.targetId);
    const check = checkDemoralizeLegal({ attacker: combatant, attackerPos: pos, target, targetPos: state.positions.get(proposal.targetId), turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "demoralize", targetId: proposal.targetId, legal: false, reason: check.reason };

    const { roll: demoralizeRoll, appliedFrightened } = outcomes.demoralize(rng, { attacker: combatant, target });
    // "Keep the worse (higher) value, don't stack" — the standard SF2E rule for reapplying a
    // condition value you already have (well-established system knowledge; the specific stacking
    // rule text wasn't found verbatim in the mirrored SRD pages checked — see design doc §19).
    target.frightened = Math.max(target.frightened ?? 0, appliedFrightened);
    combatant.demoralizedTargets = [...(combatant.demoralizedTargets ?? []), proposal.targetId];
    turnProgress.actionsUsed += 1;

    return {
      type: "demoralize", targetId: proposal.targetId, legal: true, actionsCost: 1,
      roll: demoralizeRoll, frightenedApplied: appliedFrightened, targetFrightenedAfter: target.frightened,
      decisionReason: proposal.reason ?? null
    };
  }

  // Condition-only save (design doc §22, e.g. Erabryth's Forced Reflection): the TARGET rolls,
  // like saveAttack, but the effect is a per-degree table of CONDITIONS instead of damage — no
  // damage roll happens at all, so (matching saveAttack/demoralize above) this never counts toward
  // MAP either. Cover deliberately does NOT apply here (unlike saveAttack's Reflex case): Player
  // Core's cover bonus is explicitly to Reflex saves against AREA effects, and every conditionSave
  // built so far is a Will save with no area trait at all — applying it would be inventing a rule
  // interaction the real text doesn't describe, not a small oversight.
  if (proposal.type === "conditionSave") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const conditionSaveAbility = (combatant.conditionSaves ?? [])[proposal.conditionSaveIndex ?? 0];
    if (!conditionSaveAbility) return { type: "conditionSave", targetId: proposal.targetId, legal: false, reason: `No conditionSave at index ${proposal.conditionSaveIndex ?? 0} — ${combatant.name} has ${(combatant.conditionSaves ?? []).length}.` };

    const check = checkConditionSaveLegal({ attacker: combatant, attackerPos: pos, target, targetPos, conditionSave: conditionSaveAbility, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "conditionSave", targetId: proposal.targetId, legal: false, reason: check.reason };

    const { roll: saveResult, applied } = outcomes.conditionSave(rng, { conditionSave: conditionSaveAbility, target });
    // "Keep the worse (higher) value, don't stack" — same real stacking convention as Demoralize's
    // own Frightened application, extended here to Stunned too (both are numeric conditions with
    // the identical "higher value wins" rule — Conditions Appendix, Player Core).
    if (applied.frightened != null) target.frightened = Math.max(target.frightened ?? 0, applied.frightened);
    if (applied.stunnedValue != null) target.stunnedValue = Math.max(target.stunnedValue ?? 0, applied.stunnedValue);
    // Design doc §34: tracked on the TARGET, not the attacker — Forced Reflection's real text is
    // "the target is then temporarily immune," not "you can't try again" (contrast Demoralize's
    // own attacker-scoped demoralizedTargets, just below, which really is worded that way).
    target.conditionSaveImmunities = [...(target.conditionSaveImmunities ?? []), conditionSaveAbility.name];
    turnProgress.actionsUsed += conditionSaveAbility.actions ?? 1;

    // GH #56/#69: the one sibling action type that wasn't decrementing usesRemaining — see
    // checkConditionSaveLegal's own matching gate for why this was the sole exception.
    if (conditionSaveAbility.usesRemaining != null) conditionSaveAbility.usesRemaining -= 1;

    return {
      type: "conditionSave", conditionSaveName: conditionSaveAbility.name, targetId: proposal.targetId, legal: true, actionsCost: conditionSaveAbility.actions ?? 1,
      roll: saveResult, applied, targetFrightenedAfter: target.frightened, targetStunnedValueAfter: target.stunnedValue ?? 0,
      usesRemaining: conditionSaveAbility.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Area/burst attack (design doc §38, e.g. a thrown grenade): the attacker aims at a POINT — in
  // practice `originId`'s own current square, matching how a player actually throws a grenade "at"
  // someone — and EVERY living combatant within the burst radius is affected, either side, attacker
  // included if they're close enough to their own blast. This is the one action type with no single
  // `target` at all, so "who's actually caught in it" is computed here from real state, not trusted
  // from the proposal (matching this whole engine's "never trust the AI/scenario" design).
  if (proposal.type === "areaAttack") {
    // GH #61, Gap 2 — a free-point throw ("drop it in the gap so it catches two enemies and no
    // allies") is just as legal an aim as a combatant's own square: originPoint (a plain {col,row})
    // takes precedence when supplied, falling back to the existing originId-names-a-combatant path
    // unchanged for every pre-#61 caller. checkAreaAttackLegal was already written to take a plain
    // originPos regardless of where it came from — this is the one remaining place that only ever
    // derived it from a combatant's own square.
    const originPos = proposal.originPoint ?? state.positions.get(proposal.originId);
    const areaAttackAbility = (combatant.areaAttacks ?? [])[proposal.areaAttackIndex ?? 0];
    if (!areaAttackAbility) return { type: "areaAttack", originId: proposal.originId, originPoint: proposal.originPoint ?? null, legal: false, reason: `No areaAttack at index ${proposal.areaAttackIndex ?? 0} — ${combatant.name} has ${(combatant.areaAttacks ?? []).length}.` };
    if (!originPos) return { type: "areaAttack", originId: proposal.originId, originPoint: proposal.originPoint ?? null, legal: false, reason: proposal.originId ? `${proposal.originId} has no known position to aim at.` : `No aim point given — need either an originId or an originPoint.` };

    const affectedIds = [...state.combatants.keys()].filter((id) => {
      const c = state.combatants.get(id);
      if (isDead(c)) return false;
      const cPos = state.positions.get(id);
      return cPos && distanceFeet(cPos, originPos) <= areaAttackAbility.radius;
    });

    const check = checkAreaAttackLegal({
      attacker: combatant, attackerPos: pos, originPos, areaAttack: areaAttackAbility, turnState: turnProgress, walls: state.walls,
      affectedCount: affectedIds.length
    });
    if (!check.legal) return { type: "areaAttack", originId: proposal.originId, originPoint: proposal.originPoint ?? null, legal: false, reason: check.reason };

    const affected = affectedIds.map((id) => {
      const target = state.combatants.get(id);
      const targetPos = state.positions.get(id);
      // Cover is judged from the BLAST ORIGIN, not the attacker — once the grenade lands, what
      // matters for each caught creature's Reflex save is whether something stands between them and
      // where it actually went off, not where it was thrown from.
      const coverBonus = hasCover(originPos, targetPos, state.walls) ? STANDARD_COVER_AC_BONUS : 0;
      return { target, targetEffective: resolveEffectiveStats(target), coverBonus };
    });
    const hpBefore = new Map(affected.map(({ target }) => [target.id, target.currentHP]));

    const { damage, results } = outcomes.areaAttack(rng, { areaAttack: areaAttackAbility, affected });

    for (const r of results) {
      const target = state.combatants.get(r.targetId);
      applyDyingTransition({ target, hpBefore: hpBefore.get(r.targetId), appliedDamage: r.appliedDamage, critical: r.roll?.degree === "criticalFailure", allCombatants: state.combatants.values() });
    }
    turnProgress.actionsUsed += areaAttackAbility.actions ?? 1;
    if (areaAttackAbility.usesRemaining != null) areaAttackAbility.usesRemaining -= 1;

    return {
      type: "areaAttack", areaAttackName: areaAttackAbility.name, originId: proposal.originId ?? null, originPoint: { col: originPos.col, row: originPos.row }, legal: true, actionsCost: areaAttackAbility.actions ?? 1,
      radius: areaAttackAbility.radius, damage,
      affected: results.map((r) => {
        const target = state.combatants.get(r.targetId);
        return { ...r, targetHPAfter: target.currentHP, ...targetConditionAfter(target) };
      }),
      usesRemaining: areaAttackAbility.usesRemaining ?? null, decisionReason: proposal.reason ?? null
    };
  }

  // Trip (Athletics, Player Core pg. 193): a melee maneuver — an Athletics check against the
  // target's Fortitude DC, not an attack roll, so (matching Demoralize/saveAttack above) it never
  // increments the shared Multiple Attack Penalty counter.
  if (proposal.type === "trip") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const check = checkTripLegal({ attacker: combatant, attackerPos: pos, target, targetPos, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "trip", targetId: proposal.targetId, legal: false, reason: check.reason };

    const targetEffective = resolveEffectiveStats(target);
    const hpBefore = target.currentHP;
    const { roll: tripResult, appliedDamage, fell, selfFell } = outcomes.trip(rng, { attacker: combatant, target, targetEffective });
    if (fell) target.prone = true;
    if (selfFell) combatant.prone = true;
    applyDyingTransition({ target, hpBefore, appliedDamage, critical: tripResult.degree === "criticalSuccess", allCombatants: state.combatants.values() });
    turnProgress.actionsUsed += 1;

    return {
      type: "trip", targetId: proposal.targetId, legal: true, actionsCost: 1,
      roll: tripResult, appliedDamage, fell, selfFell, targetHPAfter: target.currentHP, ...targetConditionAfter(target),
      decisionReason: proposal.reason ?? null
    };
  }

  // Shove (Athletics, Player Core pg. 193): the genuinely new mechanical shape this project's own
  // design doc flagged — code that moves a combatant OTHER than the acting one. Same non-attack-roll
  // shape as Trip, never subject to MAP.
  if (proposal.type === "shove") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const check = checkShoveLegal({ attacker: combatant, attackerPos: pos, target, targetPos, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "shove", targetId: proposal.targetId, legal: false, reason: check.reason };

    const { roll: shoveResult, pushFeet, selfFell } = outcomes.shove(rng, { attacker: combatant, target });
    if (selfFell) combatant.prone = true;
    let newTargetPos = targetPos;
    if (pushFeet > 0) {
      const squares = Math.round(pushFeet / FEET_PER_SQUARE);
      const otherPositions = livingPositions(state).filter((p) => p.combatantId !== proposal.targetId).map((p) => ({ ...p.pos, side: p.side }));
      newTargetPos = pushDestination(pos, targetPos, squares, state.gridSize, otherPositions, state.walls);
      state.positions.set(proposal.targetId, newTargetPos);
    }
    turnProgress.actionsUsed += 1;

    return {
      type: "shove", targetId: proposal.targetId, legal: true, actionsCost: 1,
      roll: shoveResult, pushFeet, selfFell, targetPositionAfter: { ...newTargetPos },
      decisionReason: proposal.reason ?? null
    };
  }

  // Grapple (Athletics, Player Core pg. 193): applies the new relational Grabbed/Restrained
  // condition (conditions.mjs) rather than damage. Same non-attack-roll shape as Trip/Shove.
  if (proposal.type === "grapple") {
    const target = state.combatants.get(proposal.targetId);
    const targetPos = state.positions.get(proposal.targetId);
    const check = checkGrappleLegal({ attacker: combatant, attackerPos: pos, target, targetPos, turnState: turnProgress, walls: state.walls });
    if (!check.legal) return { type: "grapple", targetId: proposal.targetId, legal: false, reason: check.reason };

    const { roll: grappleResult, newState, releasesExisting, selfFell } = outcomes.grapple(rng, { attacker: combatant, target });
    if (newState) applyGrapple(target, { attackerId: combatant.id, state: newState, round: state.round });
    else if (releasesExisting) releaseGrapple(target);
    if (selfFell) combatant.prone = true;
    turnProgress.actionsUsed += 1;

    return {
      type: "grapple", targetId: proposal.targetId, legal: true, actionsCost: 1,
      roll: grappleResult, appliedState: newState, selfFell,
      targetGrappledAfter: target.grappledBy ? { ...target.grappledBy } : null,
      ...targetConditionAfter(target), decisionReason: proposal.reason ?? null
    };
  }

  // Escape (Athletics, Player Core pg. 193): the held creature's own action to shed Grabbed/
  // Restrained/Immobilized — never subject to Restrained's own "no attack actions" gate (Player
  // Core's explicit carve-out; checkEscapeLegal reflects this by never calling checkNotRestrained).
  if (proposal.type === "escape") {
    const check = checkEscapeLegal({ actor: combatant, turnState: turnProgress });
    if (!check.legal) return { type: "escape", legal: false, reason: check.reason };

    const grappler = state.combatants.get(combatant.grappledBy.attackerId);
    const { roll: escapeResult, freed } = outcomes.escape(rng, { actor: combatant, grappler });
    if (freed) releaseGrapple(combatant);
    turnProgress.actionsUsed += 1;

    return {
      type: "escape", legal: true, actionsCost: 1,
      roll: escapeResult, freed, grappledAfter: combatant.grappledBy ? { ...combatant.grappledBy } : null,
      decisionReason: proposal.reason ?? null
    };
  }

  // Stand (Player Core pg. 410): no check, no randomness — ends prone outright. Real, intended
  // interaction with Immobilized: checkStandLegal blocks this while grabbed/restrained, same as
  // ordinary movement, since Stand carries the move trait too.
  if (proposal.type === "stand") {
    const check = checkStandLegal({ actor: combatant, turnState: turnProgress });
    if (!check.legal) return { type: "stand", legal: false, reason: check.reason };

    combatant.prone = false;
    turnProgress.actionsUsed += 1;

    return { type: "stand", legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };
  }

  // Crawl (Player Core pg. 408): moves exactly 5ft while REMAINING prone — the only other move
  // action a prone combatant may use besides Stand. No check, no randomness.
  if (proposal.type === "crawl") {
    const { path: _crawlPath, ...to } = proposal.to;
    const check = checkCrawlLegal({
      combatant, from: pos, to, effectiveSpeed: effective.speed,
      allPositions: livingPositions(state), gridSize: state.gridSize, turnState: turnProgress, walls: state.walls
    });
    if (!check.legal) return { type: "crawl", to, legal: false, reason: check.reason };

    const stepDistance = distanceFeet(pos, to);
    state.positions.set(combatantId, { ...to });
    turnProgress.feetMoved += stepDistance;
    turnProgress.actionsUsed += 1;

    return { type: "crawl", from: { ...pos }, to: { ...to }, feet: stepDistance, legal: true, actionsCost: 1, decisionReason: proposal.reason ?? null };
  }

  return { type: proposal.type, legal: false, reason: `Unknown action type "${proposal.type}".` };
}

/**
 * A full, self-contained snapshot of every combatant's position/HP at this exact point in the
 * battle — computed once, server-side, so the artifact viewer never has to replay action deltas
 * client-side to reconstruct "what did the board look like after this turn."
 */
function snapshotState(state) {
  const snapshot = {};
  for (const [id, combatant] of state.combatants) {
    const pos = state.positions.get(id);
    snapshot[id] = {
      position: { ...pos },
      currentHP: combatant.currentHP,
      maxHP: combatant.maxHP,
      stunnedValue: combatant.stunnedValue ?? 0,
      frightened: combatant.frightened ?? 0,
      // design doc §25 — real, not derived-and-hidden, so the artifact viewer can show them directly.
      dyingValue: combatant.dyingValue ?? 0,
      woundedValue: combatant.woundedValue ?? 0,
      prone: !!combatant.prone,
      unconscious: isUnconscious(combatant),
      dead: isDead(combatant),
      // design doc §31 — same reasoning: a relational condition still needs to be directly visible
      // per-snapshot, not just on the one grapple action's own log entry, so later turns (a release
      // from movement, expiry, or the grappler dying) are observable at every subsequent beat too.
      grappledBy: combatant.grappledBy ?? null,
      // design doc §42 — null for anyone this rule doesn't apply to at all (every NPC), not 0;
      // real PCs start at 1 and drop to 0 the instant one is actually spent to avoid death.
      heroPoints: combatant.heroPoints ?? null,
      // GH #60 — same transcript-honesty reasoning as heroPoints above, for the new shared heal pool.
      spellSlots: combatant.spellSlots ?? null
    };
  }
  return snapshot;
}

/** Exported (design doc §57/#20 — the shared engine-interface adapters need a real, callable terminal
 * check without re-deriving win/loss logic) — behavior is completely unchanged, this is only a
 * visibility widening. */
export function checkOutcome(state) {
  const opposition = [...state.combatants.values()].filter((c) => c.side === "opposition");
  const party = [...state.combatants.values()].filter((c) => c.side === "party");

  if (opposition.every((c) => c.currentHP <= 0)) {
    return { result: "party-victory", detail: "All opposition combatants reduced to 0 HP." };
  }
  if (party.every((c) => c.currentHP <= 0)) {
    return { result: "party-defeat", detail: "All party combatants reduced to 0 HP." };
  }
  return null;
}

// ---------------------------------------------------------------------------
// LOOKAHEAD SANDBOX (design doc §15g)
// ---------------------------------------------------------------------------

/**
 * A clone purpose-built for planning, NOT structuredClone — copies exactly the fields the engine
 * ever mutates and shares the rest by reference. The ability arrays MUST be copied element-wise,
 * not shared: attemptAction does `strike.usesRemaining -= 1`, so a shallow `{...combatant}` would
 * let merely *planning* a shot spend a real limited use. Same reasoning for `demoralizedTargets`
 * (attemptAction's demoralize branch does `combatant.demoralizedTargets = [...]`, a REASSIGNMENT
 * not a mutation, so it happens to be safe either way this time — but a `.push()` would not be,
 * so it's still deep-copied here defensively, matching the array-of-arrays pattern below rather
 * than relying on this one branch never being rewritten to mutate in place later).
 *
 * `frightened` needs NO special handling here — see combatant.mjs's own header for why it's a flat
 * scalar rather than a nested `conditions` object specifically to make the plain `{...c}` shallow
 * copy below already correct for it, by construction. `grappledBy` is an OBJECT, not a scalar, but
 * needs no special handling for the identical reason: it is only ever REASSIGNED wholesale
 * (`target.grappledBy = {...}` / `= null`, conditions.mjs's applyGrapple/releaseGrapple), never
 * mutated in place, so a sandbox fork's shallow-shared reference can never be corrupted by planning
 * alone — the same guarantee `{...c}` already gives every other flat field here.
 *
 * Mutable surface at personnel scale: state.round; state.combatants.<id>.{currentHP,
 * stunnedValue, frightened, dyingValue, woundedValue, prone, demoralizedTargets,
 * conditionSaveImmunities, grappledBy, heroPoints, spellSlots}; state.combatants.<id>.{strikes,spells,
 * healAbilities, saveAttacks, conditionSaves}[i].usesRemaining; state.positions.<id>.{col,row};
 * state.reactionAvailable.<id> (GH #18 — a `Map<id,boolean>` of plain booleans, so `new Map(...)`
 * below allocates fully independent storage; a sandbox firing a reaction can never alias back to
 * the real battle's own reaction economy). `heroPoints`
 * needs no special deep-copy handling for the identical reason `grappledBy` doesn't (design doc
 * §41's own comment here) — trySpendHeroPointToAvoidDeath REASSIGNS it (`combatant.heroPoints = 0`),
 * never mutates in place.
 * dyingValue/woundedValue/prone are design doc §25 additions, flat scalars for the exact same
 * reason frightened/stunnedValue already are — see conditions.mjs's own header. `grappledBy` is
 * design doc §31's addition, the first relational one — see that same header for why.
 */
export function cloneStateForPlanning(state) {
  const combatants = new Map();
  for (const [id, c] of state.combatants) {
    const copy = { ...c };
    if (c.strikes) copy.strikes = c.strikes.map((s) => ({ ...s }));
    if (c.spells) copy.spells = c.spells.map((s) => ({ ...s }));
    if (c.healAbilities) copy.healAbilities = c.healAbilities.map((a) => ({ ...a }));
    if (c.saveAttacks) copy.saveAttacks = c.saveAttacks.map((s) => ({ ...s }));
    if (c.conditionSaves) copy.conditionSaves = c.conditionSaves.map((s) => ({ ...s }));
    if (c.areaAttacks) copy.areaAttacks = c.areaAttacks.map((a) => ({ ...a }));
    // GH #60 — combatant.spellSlots is a new, nested, mutable object of exactly the shape this
    // function's own header warns about: a shallow {...c} would alias copy.spellSlots to the SAME
    // object the live battle uses, letting a sandboxed lookahead branch that merely CONSIDERS
    // casting Heal permanently spend a real slot from the live battle, even on a branch never chosen.
    if (c.spellSlots) copy.spellSlots = { ...c.spellSlots };
    if (c.demoralizedTargets) copy.demoralizedTargets = [...c.demoralizedTargets];
    if (c.conditionSaveImmunities) copy.conditionSaveImmunities = [...c.conditionSaveImmunities];
    combatants.set(id, copy);
  }
  const positions = new Map();
  for (const [id, p] of state.positions) positions.set(id, { col: p.col, row: p.row });
  return {
    round: state.round,
    gridSize: state.gridSize,
    seed: state.seed,
    initiativeOrder: state.initiativeOrder,
    walls: state.walls, // static terrain — never mutated in a battle, safe (and cheap) to share by reference
    combatants,
    positions,
    reactionAvailable: new Map(state.reactionAvailable)
  };
}

// SANDBOX-FORK COUNTER (design doc §59, GH issue #5) — a real, minimal, additive instrumentation
// hook: forkTurnSandbox is the one true seam every decision algorithm's real search cost passes
// through, no matter how much caching/memoization sits above it (planTurn's own scoredCache, e.g.,
// skips this call outright on a cache hit — decide.mjs:745 vs decide.mjs:762 — so counting AT this
// seam, rather than trying to derive a count from generateProposals().length at the call site,
// automatically and correctly reflects real work done regardless of which internal algorithm is
// live). Inert for every existing caller: a plain increment that never touches the function's own
// control flow or return value, only meaningful to a caller that explicitly resets and reads it.
let sandboxForkCount = 0;
export function resetSandboxForkCount() { sandboxForkCount = 0; }
export function getSandboxForkCount() { return sandboxForkCount; }

/**
 * Fork the current turn into a private sandbox the AI can plan inside. Same restrictive shape as
 * the Frame-scale original: clones unconditionally, takes no rng (expected-value resolution means
 * a sandbox can never advance the battle's real dice stream), and keeps attemptAction module-
 * private so the live battle has exactly one writer — the turn loop.
 *
 * @param {object} args
 * @param {object} args.state - the live state; cloned, never mutated
 * @param {object} args.turn  - the turnProgress copy the AI was handed
 */
/**
 * `outcomes` (design doc §64, GH issue #6 step 4 — real stochastic chance-node enumeration): OPTIONAL,
 * defaults to `EXPECTED_OUTCOMES` exactly as before — every existing caller's behavior is completely
 * unchanged, since omitting it (every call site until this pass) reproduces the identical default.
 * A new caller (`search/chance.mjs`) can pass a degree-FORCED outcomes table instead, to ask "what
 * would this exact proposal do if its roll came out at THIS specific degree of success" — the same
 * real seam `REAL_OUTCOMES`/`EXPECTED_OUTCOMES` already are, just a third table. `attemptAction` itself
 * (legality, action costs, mapPenalty/rangePenalty/flanking/cover modifier computation, dying
 * transitions, prone application) is completely unaware of which table produced a given roll — this
 * widening touches nothing about how any of that is decided, only which table's own function gets
 * called at the one real "a die collapses to a number" seam.
 */
export function forkTurnSandbox({ state, turn, outcomes = EXPECTED_OUTCOMES }) {
  sandboxForkCount += 1;
  const sandboxState = cloneStateForPlanning(state);
  const sandboxTurn = { ...turn };
  const sandboxLog = { actions: [] }; // logging sink; nothing reads it during planning

  return {
    state: sandboxState,
    turn: sandboxTurn,
    actionsRemaining() {
      return sandboxTurn.actionsAvailable - sandboxTurn.actionsUsed;
    },
    /**
     * Apply a proposal to the sandbox using the REAL rules and the real `outcomes` table this
     * sandbox was forked with (`EXPECTED_OUTCOMES` unless a caller asked for something else).
     * Returns exactly what attemptAction returns, including `legal: false` with a reason when the
     * proposal is illegal — so a planner discovers illegality the same way the engine would.
     */
    apply(combatantId, proposal) {
      const effective = resolveEffectiveStats(sandboxState.combatants.get(combatantId));
      return attemptAction({
        state: sandboxState,
        rng: null, // EXPECTED_OUTCOMES/degree-forced tables both ignore it; passing null makes misuse throw loudly
        combatantId, proposal, turnProgress: sandboxTurn, turnLog: sandboxLog, effective,
        outcomes
      });
    }
  };
}
