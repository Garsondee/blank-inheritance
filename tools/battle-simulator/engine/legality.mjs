/**
 * THE CRITICAL COMPONENT. Every action the engine or an AI script proposes
 * must pass through here before it is applied to game state. Nothing else
 * in this codebase is allowed to mutate a combatant's position or HP
 * directly — engine.mjs only ever does so after a legality check here
 * returned { legal: true }.
 *
 * Each check returns { legal: boolean, reason: string|null } — reason is
 * always populated on illegal, explaining exactly which rule blocked it,
 * so a rejected action is debuggable, not a silent no-op.
 *
 * Hardened 2026-08-22 after an adversarial workflow (five independent
 * agents, each given real repro access) found and PROVED several gaps —
 * see design/testing-strategy.md-style discipline applied here: every fix
 * below traces to a concrete, reproduced exploit, not a hypothetical.
 */

import { distanceFeet, isOccupied, isInBounds, reachFeetForStrike, isAdjacent, FEET_PER_SQUARE } from "./grid.mjs";

export function checkActionBudget(turnState, actionCost) {
  const remaining = turnState.actionsAvailable - turnState.actionsUsed;
  if (actionCost > remaining) {
    return { legal: false, reason: `Not enough actions: this costs ${actionCost}, only ${remaining} of ${turnState.actionsAvailable} remain this turn.` };
  }
  return { legal: true, reason: null };
}

/**
 * Attacker/actor liveness — belt-and-suspenders alongside engine.mjs's own
 * per-iteration re-check. Found by the adversarial workflow: a combatant
 * reduced to 0 HP mid-turn by a reaction (e.g. the Claimant's Claim) could
 * keep proposing and landing further Strikes using its turn-start action
 * budget, because nothing in the legality layer itself checked that the
 * ACTOR (as opposed to the target) was still alive. checkTargetAlive
 * already covered the target side of this; this is the actor side.
 */
export function checkActorAlive(actor) {
  if (actor.currentHP <= 0) {
    return { legal: false, reason: `${actor.name} is at 0 HP (Hulked/Destroyed) and cannot act.` };
  }
  return { legal: true, reason: null };
}

/**
 * Walk the straight-line path from `from` to `to` one square at a time
 * (diagonal-preferred, matching how distanceFeet's 5-10-5 accounting
 * treats a directly-taken path elsewhere in this engine), and report the
 * first occupied square strictly BETWEEN the two endpoints. The
 * destination itself is checked separately by the caller (isOccupied on
 * `to`) — this only covers squares a mover would have to pass through.
 */
function firstBlockedIntermediateSquare(from, to, otherPositions) {
  let cur = { ...from };
  while (cur.col !== to.col || cur.row !== to.row) {
    const dx = Math.sign(to.col - cur.col);
    const dy = Math.sign(to.row - cur.row);
    cur = { col: cur.col + dx, row: cur.row + dy };
    if (cur.col === to.col && cur.row === to.row) break; // destination — not "intermediate", caller already checks it
    if (isOccupied(cur, otherPositions)) return cur;
  }
  return null;
}

export function checkMoveLegality({ combatant, from, to, effectiveSpeed, feetAlreadyMovedThisTurn, allPositions, gridSize, turnState }) {
  const budget = checkActionBudget(turnState, 1);
  if (!budget.legal) return budget;

  if (!isInBounds(to, gridSize)) {
    return { legal: false, reason: `(${to.col},${to.row}) is off the map (${gridSize.cols}x${gridSize.rows}).` };
  }
  const otherPositions = allPositions.filter((p) => p.combatantId !== combatant.id).map((p) => p.pos);
  if (isOccupied(to, otherPositions)) {
    return { legal: false, reason: `(${to.col},${to.row}) is already occupied — can't move through/onto another combatant.` };
  }
  const blocked = firstBlockedIntermediateSquare(from, to, otherPositions);
  if (blocked) {
    return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) passes through an occupied square at (${blocked.col},${blocked.row}) — can't move through another combatant to reach a legal destination.` };
  }
  // SF2E ACTION ECONOMY (design doc §15h, fixed 2026-08-23). Stride is ONE action for up to
  // your full Speed, and it is repeatable — three Strides is three times your Speed. This used
  // to charge a cumulative PER-TURN budget (`feetAlreadyMovedThisTurn + stepDistance`), which
  // made "spend three actions closing distance" mechanically impossible: after one full-Speed
  // move, every further move that turn was illegal, so the AI correctly found nothing to do and
  // held its remaining points. That single rule deviation was the largest contributor to the
  // measured 57.1% action utilization and the 20.3% of turns spent standing still.
  //
  // Ingram's standing principle: reproduce SF2E faithfully unless deliberately choosing to bend
  // a rule, and the action economy in particular must be right — the system stands on the back
  // of the play-tested original. `feetAlreadyMovedThisTurn` is retained as a parameter (it is
  // still logged, and a future effect that genuinely caps per-turn movement would use it) but no
  // longer gates an ordinary move.
  const stepDistance = distanceFeet(from, to);
  if (stepDistance > effectiveSpeed) {
    return {
      legal: false,
      reason: `Would move ${stepDistance}ft in one action, exceeding effective Speed ${effectiveSpeed}ft.`
    };
  }
  return { legal: true, reason: null };
}

/**
 * Scale Disparity (design/scale-and-chassis.md §8/§10, encoded on the
 * Claimant itself as the Scale-Blind ability): a Frame-scale creature's
 * Strikes can only target Large-or-larger creatures/objects. This is
 * checked independently of range — it's a targeting-eligibility rule, not
 * a distance rule.
 */
export function checkScaleTargeting({ attacker, target }) {
  if (attacker.scaleBlind && (target.size === "medium" || target.size === "small" || target.size === "tiny")) {
    return { legal: false, reason: `${attacker.name} is Scale-Blind and cannot perceive or target ${target.name} (size ${target.size}, smaller than Large).` };
  }
  return { legal: true, reason: null };
}

export function checkStrikeRange({ attackerPos, targetPos, strike }) {
  const reach = reachFeetForStrike(strike);
  const dist = distanceFeet(attackerPos, targetPos);
  if (strike.strikeType === "melee" && dist > reach) {
    return { legal: false, reason: `Target is ${dist}ft away, outside melee reach (${reach}ft).` };
  }
  if (strike.strikeType === "ranged") {
    const increment = strike.rangeIncrement ?? Infinity;
    const maxRange = increment * 6; // Player Core pg. 254: attacks beyond the 6th range increment are impossible
    if (dist > maxRange) {
      return { legal: false, reason: `Target is ${dist}ft away, beyond the 6th range increment (max ${maxRange}ft) for a ranged Strike with increment ${increment}ft.` };
    }
  }
  return { legal: true, reason: null };
}

/**
 * Player Core pg. 254, verbatim: "Attack rolls beyond a weapon's range
 * increment take a -2 penalty for each additional multiple of that
 * increment between you and the target." Worked example from the same
 * page: a 60ft-increment pistol takes no penalty inside 60ft, -2 from
 * 61-120ft, -4 from 121-180ft, and so on. This was a real, confirmed gap
 * before 2026-08-22 — checkStrikeRange only ever enforced the hard
 * "beyond the 6th increment is impossible" half of the rule and silently
 * dropped the accuracy penalty for every increment short of that, which is
 * exactly how a helicopter's sidearm ended up able to land an undamaged
 * hit on a target that should have been a near-impossible shot.
 */
export function rangeIncrementPenalty(strike, distanceFeet) {
  if (strike.strikeType !== "ranged" || !strike.rangeIncrement) return 0;
  const incrementNumber = Math.max(1, Math.ceil(distanceFeet / strike.rangeIncrement));
  if (incrementNumber <= 1) return 0; // avoid returning -0 from -2 * 0
  return -2 * (incrementNumber - 1);
}

export function checkTargetAlive(target) {
  if (!target) {
    return { legal: false, reason: "No such combatant — the target id does not exist." };
  }
  if (target.currentHP <= 0) {
    return { legal: false, reason: `${target.name} is already at 0 HP — can't be the target of a new Strike.` };
  }
  return { legal: true, reason: null };
}

/**
 * Full legality gate for a proposed Strike. Composes every sub-check above
 * so engine.mjs (and any AI) has exactly one function to call and cannot
 * accidentally skip one of the checks by calling sub-functions directly.
 */
export function checkStrikeLegal({ attacker, attackerPos, target, targetPos, strike, turnState }) {
  const actorAlive = checkActorAlive(attacker);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const scale = checkScaleTargeting({ attacker, target });
  if (!scale.legal) return scale;

  const range = checkStrikeRange({ attackerPos, targetPos, strike });
  if (!range.legal) return range;

  // Limited-use ordnance (design doc §14g): a strike carrying a usesRemaining
  // count (e.g. a vehicle's long-range missile) simply isn't available once
  // spent — no reload, no fallback, matching "expensive and a terrible waste
  // if they miss." Strikes with no usesRemaining field (ordinary sidearms)
  // are unlimited, same as before.
  if (strike.usesRemaining != null && strike.usesRemaining <= 0) {
    return { legal: false, reason: `${strike.name} is out of ordnance — ${strike.usesPerEncounter ?? "its limited"} use(s) already spent this encounter.` };
  }

  return { legal: true, reason: null };
}

/**
 * Field Repair (design/scale-and-chassis.md §6, the Ladle): 2-action,
 * requires the rig adjacent to the target, target must not be at full HP
 * and must not already be Hulked/Destroyed. Also requires the repairer to
 * actually HAVE Field Repair (repairBonus + handlingDC) — found by the
 * adversarial workflow: without this, any combatant (including the enemy
 * Claimant) could get a "repair" proposal accepted as legal, resolving via
 * NaN comparisons that mostly no-op but occasionally (a natural 20)
 * produced a real, illegitimate heal.
 */
export function checkFieldRepairLegal({ repairer, repairerPos, target, targetPos, turnState }) {
  const actorAlive = checkActorAlive(repairer);
  if (!actorAlive.legal) return actorAlive;

  if (repairer.repairBonus == null || repairer.handlingDC == null) {
    return { legal: false, reason: `${repairer.name} has no Field Repair capability (no repairBonus/handlingDC).` };
  }

  if (!target) {
    return { legal: false, reason: "No such combatant — the target id does not exist." };
  }

  const budget = checkActionBudget(turnState, 2);
  if (!budget.legal) return budget;
  if (!isAdjacent(repairerPos, targetPos)) {
    return { legal: false, reason: `${target.name} is not adjacent to ${repairer.name} — Field Repair requires the rig adjacent to the target.` };
  }
  if (target.currentHP <= 0) {
    return { legal: false, reason: `${target.name} is at 0 HP (Hulked/Destroyed) — cannot be Field Repaired.` };
  }
  if (target.currentHP >= target.maxHP) {
    return { legal: false, reason: `${target.name} is already at full HP.` };
  }
  return { legal: true, reason: null };
}

/**
 * Spot (design/scale-and-chassis.md §14d, 1 action): call out a target's
 * patterns to an ally, so their next Strike lands more easily. The actual
 * mechanism for "vehicles enable Frames to become their optimal
 * Claimant-defeating tools" — a vehicle's value here is making the
 * Frame's hit land, not out-damaging it.
 */
export function checkSpotLegal({ spotter, target, turnState }) {
  const actorAlive = checkActorAlive(spotter);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, 1);
  if (!budget.legal) return budget;

  if (!target) {
    return { legal: false, reason: "No such combatant — the target id does not exist." };
  }
  if (target.currentHP <= 0) {
    return { legal: false, reason: `${target.name} is at 0 HP — nothing to Spot for.` };
  }
  return { legal: true, reason: null };
}

/**
 * Evacuate (design/scale-and-chassis.md §14d, 2 actions): peel off to get
 * civilians clear, contributing to the same Shelter Evacuation pool
 * data/subsystems/day-1-ground-layer.json tracks for the personnel-scale
 * ground team. Requires genuine distance from every living opposition
 * combatant — this has to be a real trade-off (not fighting, not
 * spotting) or it isn't a choice.
 */
export function checkEvacuateLegal({ evacuator, evacuatorPos, oppositionPositions, turnState, minDistanceFeet = 300 }) {
  const actorAlive = checkActorAlive(evacuator);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, 2);
  if (!budget.legal) return budget;

  const tooClose = oppositionPositions.find((pos) => distanceFeet(evacuatorPos, pos) < minDistanceFeet);
  if (tooClose) {
    return { legal: false, reason: `${evacuator.name} is within ${minDistanceFeet}ft of the opposition — must be clear of the fight to Evacuate.` };
  }
  return { legal: true, reason: null };
}

/**
 * Multiple Attack Penalty for the Nth Strike this turn (1-indexed),
 * accounting for the agile trait (–4/–8 instead of –5/–10). None of this
 * simulation's Strikes currently have agile, but the check is real and
 * tested rather than hardcoded to "no agile weapons exist yet".
 */
export function multipleAttackPenalty(strikeNumber, hasAgile) {
  if (strikeNumber <= 1) return 0;
  if (strikeNumber === 2) return hasAgile ? -4 : -5;
  return hasAgile ? -8 : -10;
}

/**
 * A spell's flat range check — deliberately NOT checkStrikeRange's
 * increment-and-6x-cap logic. Player Core's range-increment rule is a
 * weapon mechanic; a spell's stat block instead states a single flat
 * maximum range (e.g. Eldritch Lance's "30 feet") with no accuracy
 * penalty for being near that edge and no way to exceed it at all —
 * "close enough to touch" (range null/"touch") means adjacent, matching
 * how melee reach is checked. Kept separate from checkStrikeRange rather
 * than folded in with extra conditionals, since the two rules genuinely
 * don't share a shape (one degrades gradually with a hard cutoff far
 * out, the other is a single hard boundary with no degradation at all).
 */
export function checkSpellRange({ casterPos, targetPos, spell }) {
  const dist = distanceFeet(casterPos, targetPos);
  const maxRange = spell.range ?? FEET_PER_SQUARE; // no range field -> touch/adjacent-only
  if (dist > maxRange) {
    return { legal: false, reason: `Target is ${dist}ft away, beyond ${spell.name}'s range (${maxRange}ft).` };
  }
  return { legal: true, reason: null };
}

/**
 * Full legality gate for a proposed spell attack (design doc §14k) — an
 * attack-roll spell like Eldritch Lance: "Make a ranged spell attack roll
 * against the target's AC," crit doubles damage, same shape as a Strike
 * mechanically, resolved with the same resolveStrike() the engine already
 * uses for Strikes (Player Core's spell-attack rules produce an identical
 * degree-of-success table). What's genuinely different from a Strike:
 * variable action cost (a spell's own `actions` field, not hardcoded to
 * 1) and a flat range instead of an incrementing one (checkSpellRange
 * above) — everything else (actor-alive, target-alive, Scale
 * Disparity, limited-use slots via the same usesRemaining mechanism
 * vehicle ordnance already uses) is identical in spirit to checkStrikeLegal.
 */
export function checkSpellAttackLegal({ caster, casterPos, target, targetPos, spell, turnState }) {
  const actorAlive = checkActorAlive(caster);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, spell.actions ?? 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const scale = checkScaleTargeting({ attacker: caster, target });
  if (!scale.legal) return scale;

  const range = checkSpellRange({ casterPos, targetPos, spell });
  if (!range.legal) return range;

  if (spell.usesRemaining != null && spell.usesRemaining <= 0) {
    return { legal: false, reason: `${spell.name} is out of prepared slots — ${spell.usesPerEncounter ?? "its limited"} use(s) already spent this encounter.` };
  }

  return { legal: true, reason: null };
}

/**
 * Legality gate for a non-spell active class ability that heals, like the
 * Mystic's Transfer Vitality (design doc §14k) — no roll at all (Player
 * Core: "you can transfer up to N Hit Points... into yourself or a bonded
 * creature"), just a flat amount within range, gated by actually having
 * the ability, the target being alive and not already full, and (like
 * Field Repair) a real resource: usesRemaining stands in for the
 * ability's vitality-network pool (see combatants.mjs's own note on this
 * simplification) rather than tracking the pool's HP total directly.
 */
export function checkHealAbilityLegal({ healer, healerPos, target, targetPos, ability, turnState }) {
  const actorAlive = checkActorAlive(healer);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, ability.actions ?? 1);
  if (!budget.legal) return budget;

  if (!target) {
    return { legal: false, reason: "No such combatant — the target id does not exist." };
  }
  if (target.currentHP <= 0) {
    return { legal: false, reason: `${target.name} is at 0 HP — cannot be healed by ${ability.name}.` };
  }
  if (target.currentHP >= target.maxHP) {
    return { legal: false, reason: `${target.name} is already at full HP.` };
  }
  const range = checkSpellRange({ casterPos: healerPos, targetPos, spell: ability });
  if (!range.legal) return range;

  if (ability.usesRemaining != null && ability.usesRemaining <= 0) {
    return { legal: false, reason: `${ability.name}'s vitality network is depleted for this encounter.` };
  }

  return { legal: true, reason: null };
}
