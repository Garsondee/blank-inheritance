/**
 * Action legality for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../engine/legality.mjs. Kept: everything genuinely SF2E-general (action budget, actor/target
 * liveness, Stride/Step legality including the path-vs-straight-line fix from §16, Strike range
 * and range-increment penalty, MAP, spell range/legality, a generic heal-ability check). Dropped:
 * everything that is Frame/vehicle/Day-1-specific and does not exist for an ordinary SF2E PC or
 * NPC — Scale Disparity/scaleBlind targeting, Field Repair (the Ladle), Spot, Evacuate. Ordinary
 * SF2E creatures don't have any of those mechanics; a level-1 Mystic and a Security Goon can
 * always see and target each other, subject only to real perception/range/Line of Effect.
 *
 * EXTENDED (skill-actions-in-combat expansion): checkSaveAttackLegal (a target rolls a saving
 * throw instead of the attacker rolling to hit — the mechanism explicitly out of scope through
 * Phase 3, per design/scale-and-chassis.md §19's own "no saving-throw mechanism" note) and
 * checkDemoralizeLegal (Intimidation's Demoralize action, Player Core pg. 200, mirrored verbatim
 * at reference/srd/player-core/skill-8-intimidation.json).
 *
 * EXTENDED AGAIN (design doc §22's 3v3 NPC-research follow-up): checkConditionSaveLegal (a target
 * rolls a save whose effect is a per-degree CONDITION table, e.g. Erabryth's Forced Reflection —
 * Frightened/Stunned by degree, no damage at all) — structurally checkSaveAttackLegal's own shape
 * plus a per-attacker-per-ability-per-target one-time gate.
 */

import { distanceFeet, isOccupied, blocksPassage, isInBounds, reachFeetForStrike, FEET_PER_SQUARE } from "./grid.mjs";
import { moveBlockedBetween, lineOfEffect } from "./terrain.mjs";
import { isDead } from "./conditions.mjs";

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

/** Straight-line intermediate-occupancy check — used only when a proposal supplies no real path.
 * Faction-aware (design doc §24 — Ingram's own correction: "Characters can move through friendly
 * character spaces per the rules"): an ally's square only blocks PASSING through when moverSide
 * isn't given at all; otherwise a same-side occupant is a real waypoint, not a wall. */
function firstBlockedIntermediateSquare(from, to, positionEntries, moverSide) {
  let cur = { ...from };
  while (cur.col !== to.col || cur.row !== to.row) {
    const dx = Math.sign(to.col - cur.col);
    const dy = Math.sign(to.row - cur.row);
    cur = { col: cur.col + dx, row: cur.row + dy };
    if (cur.col === to.col && cur.row === to.row) break;
    if (blocksPassage(cur, positionEntries, moverSide)) return cur;
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
  // Flattened to {col,row,side} — `side` is what makes the INTERMEDIATE checks below faction-aware
  // (design doc §24: an ally's square is a real waypoint, not a wall); the DESTINATION check just
  // below never looks at side at all — you can never end your move on top of anyone, ally included.
  const otherPositions = allPositions.filter((p) => p.combatantId !== combatant.id).map((p) => ({ ...p.pos, side: p.side }));
  if (isOccupied(to, otherPositions)) {
    return { legal: false, reason: `(${to.col},${to.row}) is already occupied — can't end a move there, even on an ally's square (Player Core's own movement rule: you can move THROUGH an ally, you can't stop there).` };
  }
  if (path?.length) {
    for (let i = 1; i < path.length; i++) {
      const cell = path[i];
      const isDestination = cell.col === to.col && cell.row === to.row;
      if (!isDestination && blocksPassage(cell, otherPositions, combatant.side)) {
        return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) passes through a square at (${cell.col},${cell.row}) occupied by a different-side combatant.` };
      }
      if (walls?.length && moveBlockedBetween(path[i - 1], cell, walls)) {
        return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) is blocked by a wall between (${path[i - 1].col},${path[i - 1].row}) and (${cell.col},${cell.row}).` };
      }
    }
  } else {
    const blocked = firstBlockedIntermediateSquare(from, to, otherPositions, combatant.side);
    if (blocked) {
      return { legal: false, reason: `Path from (${from.col},${from.row}) to (${to.col},${to.row}) passes through a square at (${blocked.col},${blocked.row}) occupied by a different-side combatant.` };
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

/**
 * Design doc §25: a downed PC is unconscious, not dead — Player Core is explicit that they remain
 * a real, legal target (an easy one, thanks to Unconscious's own -4 AC/off-guard) until they
 * actually reach dying 4. Only a genuinely dead combatant (any ordinary NPC at 0 HP; a PC who's
 * reached dying 4) is excluded — see conditions.mjs's isDead for the real PC-vs-NPC asymmetry this
 * reads off of.
 */
export function checkTargetAlive(target) {
  if (!target) return { legal: false, reason: "No such combatant — the target id does not exist." };
  if (isDead(target)) return { legal: false, reason: `${target.name} is dead — can't be the target of a new Strike.` };
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

/**
 * A flat, no-roll heal ability (e.g. the Mystic's Transfer Vitality) — real amount, real range,
 * real limited uses. `walls` (design doc §32 — a real report: "I noticed a heal being cast
 * through a wall") was the one thing missing here relative to every sibling legality check —
 * checkStrikeLegal/checkSpellAttackLegal/checkSaveAttackLegal/checkDemoralizeLegal/
 * checkConditionSaveLegal all independently gate on lineOfEffect, and this function simply never
 * received the `walls` parameter to do the same. Healing at range still needs a real line to the
 * target — nothing in Player Core exempts it from Line of Effect.
 */
export function checkHealAbilityLegal({ healer, healerPos, target, targetPos, ability, turnState, walls }) {
  const actorAlive = checkActorAlive(healer);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, ability.actions ?? 1);
  if (!budget.legal) return budget;

  if (!target) return { legal: false, reason: "No such combatant — the target id does not exist." };
  // Design doc §25: healing a downed-but-not-dead PC back to 1+ HP is the whole point of the real
  // dying/unconscious rules (Player Core pg. 403 — "restored to 1 Hit Point or more via healing,
  // you lose the dying and unconscious conditions") — a target at 0 HP must stay LEGAL to heal as
  // long as they're not actually dead. Only a genuinely dead target (isDead) is excluded.
  if (isDead(target)) return { legal: false, reason: `${target.name} is dead — cannot be healed by ${ability.name}.` };
  if (target.currentHP >= target.maxHP) return { legal: false, reason: `${target.name} is already at full HP.` };

  const range = checkSpellRange({ casterPos: healerPos, targetPos, spell: ability });
  if (!range.legal) return range;

  if (!lineOfEffect(healerPos, targetPos, walls)) {
    return { legal: false, reason: `No line of effect to ${target.name} — a wall entirely blocks ${ability.name}.` };
  }

  if (ability.usesRemaining != null && ability.usesRemaining <= 0) {
    return { legal: false, reason: `${ability.name} has no uses remaining this encounter.` };
  }

  return { legal: true, reason: null };
}

/**
 * A saving-throw-based attack (e.g. a thrown grenade with a basic Reflex save): the TARGET rolls,
 * not the attacker. Same shape as checkStrikeLegal/checkSpellAttackLegal — actor/target alive,
 * budget, range (a flat max, matching how this project's real extracted grenade data represents
 * `range` as a single throw-distance number, not an incrementing gun-style range), perception, LOS,
 * limited uses.
 */
export function checkSaveAttackLegal({ attacker, attackerPos, target, targetPos, saveAttack, turnState, walls }) {
  const actorAlive = checkActorAlive(attacker);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, saveAttack.actions ?? 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const dist = distanceFeet(attackerPos, targetPos);
  const maxRange = saveAttack.range ?? FEET_PER_SQUARE;
  if (dist > maxRange) {
    return { legal: false, reason: `Target is ${dist}ft away, beyond ${saveAttack.name}'s range (${maxRange}ft).` };
  }

  const perception = checkPerceptionRange({ attacker, attackerPos, targetPos });
  if (!perception.legal) return perception;

  if (!lineOfEffect(attackerPos, targetPos, walls)) {
    return { legal: false, reason: `No line of effect to ${target.name} — a wall entirely blocks it.` };
  }

  if (saveAttack.usesRemaining != null && saveAttack.usesRemaining <= 0) {
    return { legal: false, reason: `${saveAttack.name} is out of uses this encounter.` };
  }

  return { legal: true, reason: null };
}

/**
 * Demoralize (Intimidation, Player Core pg. 200, one action, real range 30ft): an Intimidation
 * check against the target's Will DC. "Regardless of the outcome, you can't Demoralize the same
 * creature again for 10 minutes" — in a combat this short (SF2E rounds are 6 seconds; 10 minutes
 * is 100 rounds), that cooldown is functionally "never again this battle", so it's modeled as a
 * flat per-attacker per-target attempted-once gate (`attacker.demoralizedTargets`) rather than a
 * numeric timer nothing in this engine would ever see expire.
 */
const DEMORALIZE_RANGE_FEET = 30;

export function checkDemoralizeLegal({ attacker, attackerPos, target, targetPos, turnState, walls }) {
  const actorAlive = checkActorAlive(attacker);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const dist = distanceFeet(attackerPos, targetPos);
  if (dist > DEMORALIZE_RANGE_FEET) {
    return { legal: false, reason: `Target is ${dist}ft away, beyond Demoralize's ${DEMORALIZE_RANGE_FEET}ft range.` };
  }

  const perception = checkPerceptionRange({ attacker, attackerPos, targetPos });
  if (!perception.legal) return perception;

  if (!lineOfEffect(attackerPos, targetPos, walls)) {
    return { legal: false, reason: `No line of effect to ${target.name} — can't be seen/heard through a wall.` };
  }

  if (attacker.demoralizedTargets?.includes(target.id)) {
    return { legal: false, reason: `${attacker.name} has already tried to Demoralize ${target.name} this encounter — can't attempt it again for 10 minutes.` };
  }

  return { legal: true, reason: null };
}

/**
 * A condition-only save action (design doc §22 — e.g. Erabryth's Forced Reflection): the TARGET
 * rolls a save, same as checkSaveAttackLegal, but the effect is a per-degree table of CONDITIONS
 * (Frightened/Stunned) rather than a flat damage multiplier — structurally identical legality to
 * checkSaveAttackLegal (range/budget/perception/LOS/uses), kept as its own function rather than a
 * variant flag on that one, matching this file's own existing precedent of one function per action
 * type even where two are structurally close (checkSaveAttackLegal vs. checkDemoralizeLegal).
 *
 * REGRESSION FIX (design doc §34 — Ingram's own quoted rule text caught this): the one-time gate
 * here is genuinely NOT the same shape as Demoralize's `demoralizedTargets`, despite an earlier
 * comment here claiming it was. The real text differs in exactly the way that matters: Demoralize's
 * cooldown is phrased "YOU can't Demoralize the same creature again" — attacker-scoped, so a
 * DIFFERENT creature can still try. Forced Reflection's is phrased "the TARGET is then temporarily
 * immune to Forced Reflection" — target-scoped, so ANY attacker is blocked, not just the one who
 * already tried. This was previously tracked as `attacker.conditionSaveTargets` (keyed
 * attacker-side, same shape as Demoralize) — functionally invisible with only one
 * Forced-Reflection-capable creature in the current roster (Erabryth), but wrong the moment a
 * second one exists. Now tracked as `target.conditionSaveImmunities` (a plain list of ability
 * names the TARGET has become immune to) instead.
 */
export function checkConditionSaveLegal({ attacker, attackerPos, target, targetPos, conditionSave, turnState, walls }) {
  const actorAlive = checkActorAlive(attacker);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, conditionSave.actions ?? 1);
  if (!budget.legal) return budget;

  const alive = checkTargetAlive(target);
  if (!alive.legal) return alive;

  const dist = distanceFeet(attackerPos, targetPos);
  const maxRange = conditionSave.range ?? FEET_PER_SQUARE;
  if (dist > maxRange) {
    return { legal: false, reason: `Target is ${dist}ft away, beyond ${conditionSave.name}'s range (${maxRange}ft).` };
  }

  const perception = checkPerceptionRange({ attacker, attackerPos, targetPos });
  if (!perception.legal) return perception;

  if (!lineOfEffect(attackerPos, targetPos, walls)) {
    return { legal: false, reason: `No line of effect to ${target.name} — a wall entirely blocks it.` };
  }

  if (target.conditionSaveImmunities?.includes(conditionSave.name)) {
    return { legal: false, reason: `${target.name} is already immune to ${conditionSave.name} this encounter.` };
  }

  return { legal: true, reason: null };
}

/**
 * A real area/burst effect (design doc §38 — e.g. a thrown grenade's "@Template[burst|distance:5]
 * ... basic save"): unlike every other save-based action above, there is no single `target` — the
 * attacker aims at a POINT (`originPos`, in practice a living creature's own square, matching how a
 * player actually throws a grenade "at" someone) and EVERYONE within the burst radius is affected,
 * friend or foe. Every note this project has written for an unwired grenade (Lunar-17, Tapkey,
 * Bennit, all the way back to design doc §21) named this exact gap: "wiring a burst weapon through
 * [saveAttack] would have hit exactly one creature with none of the real friendly-fire risk an area
 * weapon actually carries." This is that missing mechanism, finally built — see engine.mjs's own
 * areaAttack resolution for how "who's actually in the blast" gets computed from real state.
 *
 * Legality here only covers what the ATTACKER needs (range/budget/LOS/uses to the aim point) — the
 * "is anything actually caught in the blast" check needs the full combatant/position map, which
 * this file's other functions deliberately never take (they work off pre-resolved attacker/target
 * objects, not raw state), so engine.mjs computes `affectedCount` from real state BEFORE calling
 * this, and passes it through as the one extra param — keeping the state-scanning in engine.mjs
 * where every other multi-combatant scan in this project already lives.
 */
export function checkAreaAttackLegal({ attacker, attackerPos, originPos, areaAttack, turnState, walls, affectedCount }) {
  const actorAlive = checkActorAlive(attacker);
  if (!actorAlive.legal) return actorAlive;

  const budget = checkActionBudget(turnState, areaAttack.actions ?? 1);
  if (!budget.legal) return budget;

  const dist = distanceFeet(attackerPos, originPos);
  const maxRange = areaAttack.range ?? FEET_PER_SQUARE;
  if (dist > maxRange) {
    return { legal: false, reason: `That point is ${dist}ft away, beyond ${areaAttack.name}'s range (${maxRange}ft).` };
  }

  const perception = checkPerceptionRange({ attacker, attackerPos, targetPos: originPos });
  if (!perception.legal) return perception;

  if (!lineOfEffect(attackerPos, originPos, walls)) {
    return { legal: false, reason: `No line of effect to that point — a wall entirely blocks it.` };
  }

  if (areaAttack.usesRemaining != null && areaAttack.usesRemaining <= 0) {
    return { legal: false, reason: `${areaAttack.name} is out of uses this encounter.` };
  }

  if (affectedCount === 0) {
    return { legal: false, reason: `Nothing within ${areaAttack.radius}ft of that point — not worth spending ${areaAttack.name} on empty ground.` };
  }

  return { legal: true, reason: null };
}
