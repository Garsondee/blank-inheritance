/**
 * Action legality for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../engine/legality.mjs. Kept: everything genuinely SF2E-general (action budget, actor/target
 * liveness, Stride/Step legality including the path-vs-straight-line fix from §16, Strike range
 * and range-increment penalty, MAP, spell range/legality, a generic heal-ability check). Dropped:
 * everything that is Frame/vehicle/Day-1-specific and does not exist for an ordinary SF2E PC or
 * NPC — Scale Disparity/scaleBlind targeting, Field Repair (the Ladle), Spot, Evacuate. Ordinary
 * SF2E creatures don't have any of those mechanics; a level-1 Mystic and a Security Goon can
 * always see and target each other, subject only to real perception/range/Line of Effect.
 */

import { distanceFeet, isOccupied, isInBounds, reachFeetForStrike, FEET_PER_SQUARE } from "./grid.mjs";
import { moveBlockedBetween, lineOfEffect } from "./terrain.mjs";

/** Vision range (ported from engine/vision.mjs's own perception concept) — opt-in, no field = unlimited. */
function checkPerceptionRange({ attacker, attackerPos, targetPos }) {
  const range = attacker.vision?.range;
  if (range != null && distanceFeet(attackerPos, targetPos) > range) {
    return { legal: false, reason: `Target is beyond ${attacker.name}'s perceptual range (${range}ft).` };
  }
  return { legal: true, reason: null };
}

export function checkActionBudget(turnState, actionCost) {
  const remaining = turnState.actionsAvailable - turnState.actionsUsed;
  if (actionCost > remaining) {
    return { legal: false, reason: `Not enough actions: this costs ${actionCost}, only ${remaining} of ${turnState.actionsAvailable} remain this turn.` };
  }
  return { legal: true, reason: null };
}

export function checkActorAlive(actor) {
  if (actor.currentHP <= 0) {
    return { legal: false, reason: `${actor.name} is at 0 HP and cannot act.` };
  }
  return { legal: true, reason: null };
}

/** Straight-line intermediate-occupancy check — used only when a proposal supplies no real path. */
function firstBlockedIntermediateSquare(from, to, otherPositions) {
  let cur = { ...from };
  while (cur.col !== to.col || cur.row !== to.row) {
    const dx = Math.sign(to.col - cur.col);
    const dy = Math.sign(to.row - cur.row);
    cur = { col: cur.col + dx, row: cur.row + dy };
    if (cur.col === to.col && cur.row === to.row) break;
    if (isOccupied(cur, otherPositions)) return cur;
  }
  return null;
}

function firstWallBlockedEdge(from, to, walls) {
  if (!walls?.length) return null;
  let cur = { ...from };
  while (cur.col !== to.col || cur.row !== to.row) {
    const dx = Math.sign(to.col - cur.col);
    const dy = Math.sign(to.row - cur.row);
    const next = { col: cur.col + dx, row: cur.row + dy };
    if (moveBlockedBetween(cur, next, walls)) return { from: cur, to: next };
    cur = next;
  }
  return null;
}

/**
 * Stride legality. `path`, when supplied (the wall-aware pathfinder's real route — design doc
 * §16), is validated directly instead of a re-derived straight line — the fix for a real bug
 * found running the Frame-scale stress-test mission: a straight line can cross exactly the
 * obstacle a real detour was routing around, rejecting an otherwise-legal move forever.
 */
export function checkMoveLegality({ combatant, from, to, effectiveSpeed, allPositions, gridSize, turnState, walls, path }) {
  const budget = checkActionBudget(turnState, 1);
  if (!budget.legal) return budget;

  if (!isInBounds(to, gridSize)) {
    return { legal: false, reason: `(${to.col},${to.row}) is off the map (${gridSize.cols}x${gridSize.rows}).` };
  }
  const otherPositions = allPositions.filter((p) => p.combatantId !== combatant.id).map((p) => p.pos);
  if (isOccupied(to, otherPositions)) {
    return { legal: false, reason: `(${to.col},${to.row}) is already occupied — can't move through/onto another combatant.` };
  }
  if (path?.length) {
    for (let i = 1; i < path.length; i++) {
      const cell = path[i];
      const isDestination = cell.col === to.col && cell.row === to.row;
      if (!isDestination && isOccupied(cell, otherPositions)) {
        return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) passes through an occupied square at (${cell.col},${cell.row}).` };
      }
      if (walls?.length && moveBlockedBetween(path[i - 1], cell, walls)) {
        return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) is blocked by a wall between (${path[i - 1].col},${path[i - 1].row}) and (${cell.col},${cell.row}).` };
      }
    }
  } else {
    const blocked = firstBlockedIntermediateSquare(from, to, otherPositions);
    if (blocked) {
      return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) passes through an occupied square at (${blocked.col},${blocked.row}).` };
    }
    const wallBlocked = firstWallBlockedEdge(from, to, walls);
    if (wallBlocked) {
      return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) is blocked by a wall between (${wallBlocked.from.col},${wallBlocked.from.row}) and (${wallBlocked.to.col},${wallBlocked.to.row}).` };
    }
  }
  const stepDistance = distanceFeet(from, to);
  if (stepDistance > effectiveSpeed) {
    return { legal: false, reason: `Would move ${stepDistance}ft in one action, exceeding effective Speed ${effectiveSpeed}ft.` };
  }
  return { legal: true, reason: null };
}

/** Step (Player Core pg. 410): one square, never provokes a reaction. Delegates to checkMoveLegality for everything else. */
export function checkStepLegality({ combatant, from, to, effectiveSpeed, allPositions, gridSize, turnState, walls }) {
  if (effectiveSpeed < FEET_PER_SQUARE) {
    return { legal: false, reason: `Speed ${effectiveSpeed}ft is too low to complete even one square via Step.` };
  }
  const distance = distanceFeet(from, to);
  if (distance > FEET_PER_SQUARE) {
    return { legal: false, reason: `Step moves exactly one square (${FEET_PER_SQUARE}ft) — (${from.col},${from.row})->(${to.col},${to.row}) is ${distance}ft.` };
  }
  return checkMoveLegality({ combatant, from, to, effectiveSpeed, allPositions, gridSize, turnState, walls });
}

export function checkStrikeRange({ attackerPos, targetPos, strike }) {
  const reach = reachFeetForStrike(strike);
  const dist = distanceFeet(attackerPos, targetPos);
  if (strike.strikeType === "melee" && dist > reach) {
    return { legal: false, reason: `Target is ${dist}ft away, outside melee reach (${reach}ft).` };
  }
  if (strike.strikeType === "ranged") {
    const increment = strike.rangeIncrement ?? Infinity;
    const maxRange = increment * 6; // Player Core pg. 254: beyond the 6th range increment is impossible
    if (dist > maxRange) {
      return { legal: false, reason: `Target is ${dist}ft away, beyond the 6th range increment (max ${maxRange}ft) for a ranged Strike with increment ${increment}ft.` };
    }
  }
  return { legal: true, reason: null };
}

/** Player Core pg. 254: -2 penalty per additional range increment beyond the first. */
export function rangeIncrementPenalty(strike, distanceFeetValue) {
  if (strike.strikeType !== "ranged" || !strike.rangeIncrement) return 0;
  const incrementNumber = Math.max(1, Math.ceil(distanceFeetValue / strike.rangeIncrement));
  if (incrementNumber <= 1) return 0;
  return -2 * (incrementNumber - 1);
}

export function checkTargetAlive(target) {
  if (!target) return { legal: false, reason: "No such combatant — the target id does not exist." };
  if (target.currentHP <= 0) return { legal: false, reason: `${target.name} is already at 0 HP — can't be the target of a new Strike.` };
  return { legal: true, reason: null };
}

export function checkStrikeLegal({ attacker, attackerPos, target, targetPos, strike, turnState, walls }) {
  const actorAlive = checkActorAlive(attacker);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const range = checkStrikeRange({ attackerPos, targetPos, strike });
  if (!range.legal) return range;

  const perception = checkPerceptionRange({ attacker, attackerPos, targetPos });
  if (!perception.legal) return perception;

  if (!lineOfEffect(attackerPos, targetPos, walls)) {
    return { legal: false, reason: `No line of effect to ${target.name} — a wall entirely blocks the shot.` };
  }

  if (strike.usesRemaining != null && strike.usesRemaining <= 0) {
    return { legal: false, reason: `${strike.name} is out of uses this encounter.` };
  }

  return { legal: true, reason: null };
}

/** Multiple Attack Penalty for the Nth Strike this turn (1-indexed), accounting for the agile trait. */
export function multipleAttackPenalty(strikeNumber, hasAgile) {
  if (strikeNumber <= 1) return 0;
  if (strikeNumber === 2) return hasAgile ? -4 : -5;
  return hasAgile ? -8 : -10;
}

/** A spell's flat range — no range field means touch/adjacent-only. */
export function checkSpellRange({ casterPos, targetPos, spell }) {
  const dist = distanceFeet(casterPos, targetPos);
  const maxRange = spell.range ?? FEET_PER_SQUARE;
  if (dist > maxRange) {
    return { legal: false, reason: `Target is ${dist}ft away, beyond ${spell.name}'s range (${maxRange}ft).` };
  }
  return { legal: true, reason: null };
}

/** Cast a Spell, attack-roll variety (e.g. Eldritch Lance): same shape as checkStrikeLegal, minus Scale Disparity. */
export function checkSpellAttackLegal({ caster, casterPos, target, targetPos, spell, turnState, walls }) {
  const actorAlive = checkActorAlive(caster);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, spell.actions ?? 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const range = checkSpellRange({ casterPos, targetPos, spell });
  if (!range.legal) return range;

  const perception = checkPerceptionRange({ attacker: caster, attackerPos: casterPos, targetPos });
  if (!perception.legal) return perception;

  if (!lineOfEffect(casterPos, targetPos, walls)) {
    return { legal: false, reason: `No line of effect to ${target.name} — a wall entirely blocks the spell.` };
  }

  if (spell.usesRemaining != null && spell.usesRemaining <= 0) {
    return { legal: false, reason: `${spell.name} is out of prepared slots this encounter.` };
  }

  return { legal: true, reason: null };
}

/** A flat, no-roll heal ability (e.g. the Mystic's Transfer Vitality) — real amount, real range, real limited uses. */
export function checkHealAbilityLegal({ healer, healerPos, target, targetPos, ability, turnState }) {
  const actorAlive = checkActorAlive(healer);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, ability.actions ?? 1);
  if (!budget.legal) return budget;

  if (!target) return { legal: false, reason: "No such combatant — the target id does not exist." };
  if (target.currentHP <= 0) return { legal: false, reason: `${target.name} is at 0 HP — cannot be healed by ${ability.name}.` };
  if (target.currentHP >= target.maxHP) return { legal: false, reason: `${target.name} is already at full HP.` };

  const range = checkSpellRange({ casterPos: healerPos, targetPos, spell: ability });
  if (!range.legal) return range;

  if (ability.usesRemaining != null && ability.usesRemaining <= 0) {
    return { legal: false, reason: `${ability.name} has no uses remaining this encounter.` };
  }

  return { legal: true, reason: null };
}
