/**
 * Candidate generation for the utility-AI framework (design doc §14h,
 * built 2026-08-22 in direct response to Ingram's "don't half-ass this —
 * we need the best possible system for automating SF2E combats" — a
 * genuine, reusable decision-making layer for BOTH the enemy and the
 * party, not a bigger pile of hand-written if-chains).
 *
 * A "candidate" is one realistic thing a combatant could do RIGHT NOW:
 * {type, ...action-specific fields, weightKey, value, reason}. Every
 * candidate here has ALREADY passed the real legality.mjs checks (never
 * reimplemented — imported and called directly, so a candidate can never
 * drift from what engine.mjs will actually accept), and its `value` is
 * ALREADY grounded in considerations.mjs's expected-value math (reused
 * from the actual resolver, same guarantee). `weightKey` names which
 * profile weight (profiles.mjs) scales this candidate's value into a
 * final score — role differentiation lives entirely in those weights, not
 * here: this file generates the SAME candidate set for an aggressive
 * attacker and a dedicated spotter, and lets the weights decide which one
 * a Strike beats a Spot for.
 *
 * `reason` is a plain-language string built from the real numbers behind
 * each candidate — the mechanism that makes a decision auditable (Ingram's
 * screenshot question: "why did it choose to strike?") rather than a black
 * box. utility-ai.mjs threads the winning candidate's reason through into
 * the battle log via engine.mjs's decisionReason field.
 */
import { distanceFeet, isOccupied, isInBounds, isAdjacent, reachFeetForStrike, FEET_PER_SQUARE } from "../engine/grid.mjs";
import {
  checkStrikeLegal, checkScaleTargeting, checkSpotLegal, checkEvacuateLegal, checkFieldRepairLegal,
  checkSpellAttackLegal, checkHealAbilityLegal,
  multipleAttackPenalty, rangeIncrementPenalty
} from "../engine/legality.mjs";
import { resolveEffectiveStats } from "../engine/combatant.mjs";
import { expectedStrikeDamage, expectedRepairHealing, AVERAGE_EVACUATION_CIVILIANS } from "./considerations.mjs";

/**
 * Greedy straight-line step toward `to`, using up to maxSpeedFeet, stopping
 * at standoffFeet if reached first. If the straight-line cell is occupied,
 * tries perpendicular/lateral sidesteps before giving up on that step — a
 * real, if modest, obstacle-avoidance behavior, not full pathfinding.
 * Never proposes a cell outside the grid or already occupied.
 *
 * REDESIGNED 2026-08-22 (design doc §14h, found running the utility-AI
 * framework's first real statistical check): the previous version built
 * its path by recomputing direction toward `to` at every step, so it
 * could bend around a nearby obstacle over several internal iterations —
 * but engine.mjs's checkMoveLegality only ever validates a "move" action
 * as ONE STRAIGHT HOP from the turn's actual start position (see its
 * firstBlockedIntermediateSquare check), with no awareness of whatever
 * bent path this function walked internally to get there. A destination
 * that looked reachable step-by-step here could be, and often was,
 * rejected as illegal there — found because the new framework's more
 * varied move-toward-target destinations hit this far more often than
 * the old hardcoded single-opponent case did, stalling several
 * combatants for entire rounds at a time (proposed illegal move -> turn
 * held -> repeat next round, since the same blocked geometry usually
 * still held). Fixed by only ever walking a single FIXED direction per
 * candidate: every square from `from` to the returned cell is checked
 * for occupancy as part of the same walk that computes the cell, so the
 * result is always reachable in one real straight hop — exactly what
 * checkMoveLegality will re-verify. A few alternate directions are still
 * tried (the same sidestep spirit as before) when the direct line toward
 * `to` is blocked on its very first square, just never chained into a
 * multi-segment bent path within one candidate.
 */
export function computeDestination(state, moverId, from, to, maxSpeedFeet, standoffFeet) {
  const otherPositions = [...state.positions.entries()].filter(([id]) => id !== moverId).map(([, p]) => p);
  if (distanceFeet(from, to) <= standoffFeet) return null;

  const primaryDx = Math.sign(to.col - from.col);
  const primaryDy = Math.sign(to.row - from.row);
  if (primaryDx === 0 && primaryDy === 0) return null;

  // Walk outward from `from` in one fixed (dx,dy) direction, one square at a time, stopping the
  // instant the next square would be occupied, out of bounds, exceed the real Speed budget,
  // reach standoffFeet of `to`, or — critically — stop making real progress toward `to`.
  //
  // FIX (design doc §14i, 2026-08-22, found reading through a real transcript at Ingram's
  // request): the version of this function that only stopped on bounds/occupied/budget/standoff
  // walked the FULL remaining budget in a fixed compass direction every time, even long after
  // passing the closest point that direction ever gets to `to` — since `to` is almost never
  // EXACTLY on one of the 8 directions tried, a full-budget walk sails past the point of closest
  // approach and can end up much FARTHER from the target than where it started. Confirmed via a
  // real seed: Kingfisher spent five entire rounds oscillating between two fixed points ~2500ft
  // apart, each round recomputing a fresh "primary direction" from its now-overshot position and
  // overshooting the other way — full Speed spent every round, zero net progress, never once in
  // range to strike. Fixed by refusing to take a step that doesn't strictly reduce distance to
  // `to` — the walk stops the instant it would start moving away, using only as much of the
  // budget as actually helps, exactly like a real driver stopping once they've arrived rather
  // than continuing past the destination because the road kept going.
  function extend(dx, dy) {
    let cur = { ...from };
    let curDist = distanceFeet(cur, to);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (curDist <= standoffFeet) break;
      const next = { col: cur.col + dx, row: cur.row + dy };
      if (!isInBounds(next, state.gridSize)) break;
      if (isOccupied(next, otherPositions)) break;
      if (distanceFeet(from, next) > maxSpeedFeet) break;
      const nextDist = distanceFeet(next, to);
      if (nextDist >= curDist) break; // this step doesn't get any closer — stop rather than overshoot
      cur = next;
      curDist = nextDist;
    }
    return cur.col === from.col && cur.row === from.row ? null : cur;
  }

  const directions = [
    [primaryDx, primaryDy], [primaryDx, 0], [0, primaryDy],
    [primaryDx, 1], [primaryDx, -1], [1, primaryDy], [-1, primaryDy]
  ];
  for (const [dx, dy] of directions) {
    if (dx === 0 && dy === 0) continue;
    const destination = extend(dx, dy);
    if (destination) return destination;
  }
  return null;
}

/**
 * The clean (unpenalized) range an attack option is actually worth
 * closing to — reach for a melee Strike, the weapon's own increment for
 * a ranged Strike (not the 6x hard cap; that's "possible", this is
 * "worth aiming for"), or a spell's own flat range (a spell has no
 * strikeType at all — checked first so a spell is never mistaken for an
 * increment-less ranged Strike, which would wrongly read as Infinity).
 */
function cleanRangeFeet(item) {
  if (item.range != null) return item.range; // a spell
  if (item.strikeType === "melee") return reachFeetForStrike(item);
  return item.rangeIncrement ?? Infinity;
}

/**
 * How much Speed is actually left to spend on a move THIS turn — total
 * effective Speed minus whatever this same turn has already moved
 * (turnState.feetMoved, tracked by engine.mjs across every action so
 * far). FOUND running the utility-AI framework's first statistical check
 * (2026-08-22): every move-candidate generator here used to pass the
 * FULL turnState.effective.speed to computeDestination regardless of
 * turn progress, so a combatant whose first action was already a move
 * would have its second move candidate budgeted as if it hadn't moved at
 * all — checkMoveLegality correctly rejected the resulting overshoot
 * every time, holding the rest of the turn on an illegal-proposal error
 * instead of a real, reachable second step.
 */
function remainingSpeedFeet(turnState) {
  return Math.max(0, turnState.effective.speed - turnState.feetMoved);
}

/**
 * Strike candidates: every (strike, live legal target) pair, scored by
 * real expected damage at the modifier this exact attempt would use
 * (current MAP step, current range penalty, current Spot bonus).
 *
 * Limited-use weapons (usesRemaining, e.g. a vehicle's one-shot missile)
 * are scored by their MARGINAL value over the best unlimited-use
 * alternative available this same turn, not their raw value — Ingram's
 * explicit design intent ("expensive to use... a terrible waste if they
 * miss... players will have to find the funding to replace it") means a
 * scarce resource should only be spent when it buys real uplift over the
 * free option, not merely because it scores a few points higher in a
 * vacuum. Without this, a strictly-better limited weapon would get fired
 * every single turn it's legal, including at point-blank range where the
 * free sidearm would have done almost as well — exactly the waste the
 * scarcity was meant to discourage.
 *
 * A plain "marginal value over the best free option" (rawValue -
 * bestFreeValue) turned out not to be steep enough on its own: a weapon
 * with a genuinely better attack bonus AND damage die (the Rocket
 * Pod/Heavy Ordnance Round vs the standard sidearm) still cleared a
 * positive marginal value even at point-blank range, where the free
 * sidearm is a perfectly adequate shot — firing the scarce one there
 * isn't "a terrible waste if it misses" being risked for good reason,
 * it's spending an irreplaceable resource for a modest edge the fiction
 * doesn't justify (Ingram: "expensive to use... players will have to
 * find the funding to replace it"). CONSERVATION_MULTIPLIER encodes the
 * actual bar: the limited weapon must be worth more than DOUBLE the best
 * free option before any of that surplus counts, so a modest accuracy/
 * damage edge alone never justifies spending it, but a target the free
 * weapon genuinely struggles against (or can't reach at all, where
 * bestFreeValue is 0 and the multiplier is moot) still gets the full,
 * undiscounted value it deserves.
 */
const CONSERVATION_MULTIPLIER = 2;

/**
 * REVISED design doc §14k: a spell attack (e.g. the Mystic's Eldritch
 * Lance — "make a ranged spell attack roll against the target's AC,
 * crit doubles") is mechanically the same shape as a weapon Strike, and
 * Player Core shares ONE multiple-attack-penalty counter across every
 * attack-trait action a turn takes, strikes and spells alike. Generating
 * both pools through the same function (rather than a parallel, near-
 * duplicate generateSpellAttackCandidates) means the reserve-price
 * scarcity logic below already generalizes correctly the moment a
 * limited-use spell exists — a scarce spell only outscores a free Strike
 * (or a free cantrip) by clearing the same real bar, with no separate
 * mechanism to keep in sync.
 */
function collectAttackOptions(combatant) {
  const options = [];
  (combatant.strikes ?? []).forEach((item, index) => options.push({ source: "strike", index, item }));
  (combatant.spells ?? []).forEach((item, index) => options.push({ source: "spell", index, item }));
  return options;
}

function generateStrikeCandidates(state, combatant, pos, turnState) {
  const options = collectAttackOptions(combatant);
  if (!options.length) return [];
  const strikeNumber = turnState.strikesAttempted + 1;
  const targets = [...state.combatants.values()].filter((c) => c.side !== combatant.side && c.currentHP > 0);

  const raw = [];
  for (const option of options) {
    const { source, index, item } = option;
    for (const target of targets) {
      const targetPos = state.positions.get(target.id);
      const legal = source === "strike"
        ? checkStrikeLegal({ attacker: combatant, attackerPos: pos, target, targetPos, strike: item, turnState })
        : checkSpellAttackLegal({ caster: combatant, casterPos: pos, target, targetPos, spell: item, turnState });
      if (!legal.legal) continue;

      // A spell's range is a single flat boundary (checkSpellRange) with no accuracy penalty for
      // being near it — only a weapon Strike's range increment degrades accuracy gradually.
      const rangePenalty = source === "strike" ? rangeIncrementPenalty(item, distanceFeet(pos, targetPos)) : 0;
      const mapPenalty = multipleAttackPenalty(strikeNumber, (item.traits ?? []).includes("agile"));
      const spotBonus = combatant.spotted ? 2 : 0;
      const attackModifier = item.attackBonus + mapPenalty + rangePenalty + spotBonus;
      const targetEffective = resolveEffectiveStats(target);
      const value = expectedStrikeDamage({ attackModifier, targetAc: targetEffective.ac, strike: item, target: { ...target, hardness: targetEffective.hardness } });

      raw.push({ source, index, item, target, attackModifier, targetAc: targetEffective.ac, value });
    }
  }
  if (!raw.length) return [];

  const bestFreeValue = Math.max(0, ...raw.filter((r) => r.item.usesRemaining == null).map((r) => r.value));
  const reservePrice = bestFreeValue * CONSERVATION_MULTIPLIER;

  return raw.map((r) => {
    const limited = r.item.usesRemaining != null;
    const adjustedValue = limited ? Math.max(0, r.value - reservePrice) : r.value;
    const reason = limited
      ? `${r.item.name} vs ${r.target.name}: attack ${r.attackModifier >= 0 ? "+" : ""}${r.attackModifier} vs AC ${r.targetAc} -> ${r.value.toFixed(1)} expected damage, but it's limited-use (${r.item.usesRemaining} left) so it only counts value above ${CONSERVATION_MULTIPLIER}x the best free option's ${bestFreeValue.toFixed(1)} (reserve price ${reservePrice.toFixed(1)}) -> ${adjustedValue.toFixed(1)}`
      : `${r.item.name} vs ${r.target.name}: attack ${r.attackModifier >= 0 ? "+" : ""}${r.attackModifier} vs AC ${r.targetAc} -> ${r.value.toFixed(1)} expected damage`;
    return r.source === "strike"
      ? { type: "strike", targetId: r.target.id, strikeIndex: r.index, weightKey: "damage", value: adjustedValue, reason }
      : { type: "spellAttack", targetId: r.target.id, spellIndex: r.index, weightKey: "damage", value: adjustedValue, reason };
  });
}

/**
 * Move toward whichever live, scale-legal target is currently closest, if
 * nothing is within any strike's clean range yet — "close in for a better
 * shot", not a replacement for a Strike candidate (a penalized long-range
 * Strike is still generated and can still outscore this if it's good
 * enough; see generateStrikeCandidates). Never generated for a combatant
 * with a scripted `.objective` (the Claimant) — its statblock is explicit
 * that it "does not pursue, retreat, or change target"; its only movement
 * is the scripted Advance below.
 */
function generateMoveTowardTargetCandidate(state, combatant, pos, turnState) {
  if (combatant.objective) return null;
  const attackOptions = collectAttackOptions(combatant);
  if (!attackOptions.length) return null;
  const targets = [...state.combatants.values()].filter((c) => c.side !== combatant.side && c.currentHP > 0);
  const reachable = targets.filter((t) => checkScaleTargeting({ attacker: combatant, target: t }).legal);
  if (!reachable.length) return null;

  let best = null;
  let bestDist = Infinity;
  for (const t of reachable) {
    const d = distanceFeet(pos, state.positions.get(t.id));
    if (d < bestDist) { bestDist = d; best = t; }
  }
  const cleanReach = Math.max(...attackOptions.map((o) => cleanRangeFeet(o.item)));
  if (bestDist <= cleanReach) return null; // already at/within a clean shot — a Strike/spell candidate covers this

  const targetPos = state.positions.get(best.id);
  const destination = computeDestination(state, combatant.id, pos, targetPos, remainingSpeedFeet(turnState), cleanReach);
  if (!destination) return null;
  return {
    type: "move", to: destination, weightKey: "positioning", value: 1,
    reason: `Close the distance toward ${best.name} (${bestDist}ft away, needs ${cleanReach}ft for a clean shot).`
  };
}

/**
 * Spot candidates: call out a target for an ally who hasn't been spotted
 * for yet, scored by the REAL expected-damage gain the +2 circumstance
 * bonus buys the ally's own strike — not a flat value, so a spot for an
 * ally who'd barely benefit (already near-guaranteed to hit, or near-
 * guaranteed to miss regardless) naturally scores lower than one for an
 * ally sitting on a genuinely marginal roll. This is an ESTIMATE (the
 * ally hasn't taken its turn yet, so its own real range/MAP at that point
 * is unknown) — evaluated as "if this ally struck the nearest live enemy
 * with its first strike right now", grounded in the same math throughout,
 * just necessarily a forecast rather than a certainty.
 */
function generateSpotCandidates(state, combatant, turnState) {
  const allies = [...state.combatants.values()].filter((c) => c.side === combatant.side && c.id !== combatant.id && c.currentHP > 0 && (c.strikes ?? []).length > 0 && !c.spotted);
  if (!allies.length) return [];
  const opponent = [...state.combatants.values()].find((c) => c.side !== combatant.side && c.currentHP > 0);
  if (!opponent) return [];
  const opponentEffective = resolveEffectiveStats(opponent);

  const candidates = [];
  for (const ally of allies) {
    const legal = checkSpotLegal({ spotter: combatant, target: ally, turnState });
    if (!legal.legal) continue;
    const allyStrike = ally.strikes[0];
    const targetForScoring = { ...opponent, hardness: opponentEffective.hardness };
    const without = expectedStrikeDamage({ attackModifier: allyStrike.attackBonus, targetAc: opponentEffective.ac, strike: allyStrike, target: targetForScoring });
    const withBonus = expectedStrikeDamage({ attackModifier: allyStrike.attackBonus + 2, targetAc: opponentEffective.ac, strike: allyStrike, target: targetForScoring });
    const gain = withBonus - without;
    candidates.push({
      type: "spot", targetId: ally.id, weightKey: "support", value: gain,
      reason: `Spot for ${ally.name}: the +2 circumstance bonus is worth an estimated +${gain.toFixed(1)} expected damage on their next Strike against ${opponent.name}.`
    });
  }
  return candidates;
}

/**
 * Evacuate candidates: the action itself once clear of the fight (gated
 * by the real checkEvacuateLegal distance rule), or a move toward a safe
 * corner otherwise — only for combatants actually carrying evacuation
 * capacity (`canEvacuate`), a real data flag (see data/combatants.mjs's
 * Runabout) rather than an id check, so this stays capability-driven
 * rather than hardcoded to one vehicle's name. Without this gate, a
 * mechanically-legal-but-narratively-absurd "the Frame evacuates
 * civilians" candidate would exist (checkEvacuateLegal has no capability
 * check of its own, by design — it only enforces the distance rule).
 */
function generateEvacuateCandidates(state, combatant, pos, turnState) {
  if (!combatant.canEvacuate) return [];
  const oppositionPositions = [...state.combatants.values()].filter((c) => c.side !== combatant.side && c.currentHP > 0).map((c) => state.positions.get(c.id));
  const legal = checkEvacuateLegal({ evacuator: combatant, evacuatorPos: pos, oppositionPositions, turnState });
  if (legal.legal) {
    return [{
      type: "evacuate", weightKey: "civilians", value: AVERAGE_EVACUATION_CIVILIANS,
      reason: `Clear of the fight — Evacuate gets an estimated ${AVERAGE_EVACUATION_CIVILIANS.toFixed(1)} civilians to safety this action.`
    }];
  }
  const retreatTarget = { col: state.gridSize.cols - 2, row: state.gridSize.rows - 2 };
  const destination = computeDestination(state, combatant.id, pos, retreatTarget, remainingSpeedFeet(turnState), 0);
  if (!destination) return [];
  return [{ type: "move", to: destination, weightKey: "positioning", value: 1, reason: "Retreat toward a safe evacuation corner — still within range of the opposition." }];
}

/**
 * Repair candidates: Field Repair the most-damaged-by-percentage ally in
 * range, scored by real expected healing, or a move to reach them —
 * gated by actually having repairBonus/handlingDC (the Ladle), the same
 * capability-not-identity pattern as Evacuate above.
 */
function generateRepairCandidates(state, combatant, pos, turnState) {
  if (combatant.repairBonus == null || combatant.handlingDC == null) return [];
  const injured = [...state.combatants.values()].filter((c) => c.side === combatant.side && c.id !== combatant.id && c.currentHP > 0 && c.currentHP < c.maxHP);
  if (!injured.length) return [];
  injured.sort((a, b) => a.currentHP / a.maxHP - b.currentHP / b.maxHP);
  const target = injured[0];
  const targetPos = state.positions.get(target.id);

  const legal = checkFieldRepairLegal({ repairer: combatant, repairerPos: pos, target, targetPos, turnState });
  if (legal.legal) {
    const healing = expectedRepairHealing({ repairBonus: combatant.repairBonus, handlingDC: combatant.handlingDC });
    return [{
      type: "repair", targetId: target.id, weightKey: "repair", value: healing,
      reason: `Field Repair ${target.name} (${target.currentHP}/${target.maxHP} HP): estimated ${healing.toFixed(1)} HP restored.`
    }];
  }
  if (isAdjacent(pos, targetPos)) return []; // adjacent but illegal for some other reason (budget, already full) — nothing to move toward
  const destination = computeDestination(state, combatant.id, pos, targetPos, remainingSpeedFeet(turnState), FEET_PER_SQUARE);
  if (!destination) return [];
  return [{ type: "move", to: destination, weightKey: "positioning", value: 1, reason: `Move to reach ${target.name} (${target.currentHP}/${target.maxHP} HP) for Field Repair.` }];
}

/**
 * Heal-ability candidates (design doc §14k) — the Mystic's real Transfer
 * Vitality: "transfer up to N Hit Points... into yourself or a bonded
 * creature," no roll, gated by real range (not adjacency — Field Repair's
 * touch requirement is a different ability's rule, not a general one).
 * Targets self or the most-injured-by-percentage ally, matching Player
 * Core's own wording ("yourself or a bonded creature") rather than
 * excluding the caster the way generateRepairCandidates does.
 */
function generateHealAbilityCandidates(state, combatant, pos, turnState) {
  const abilities = combatant.healAbilities ?? [];
  if (!abilities.length) return [];
  const woundedIncludingSelf = [combatant, ...[...state.combatants.values()].filter((c) => c.side === combatant.side && c.id !== combatant.id)]
    .filter((c) => c.currentHP > 0 && c.currentHP < c.maxHP);
  if (!woundedIncludingSelf.length) return [];
  woundedIncludingSelf.sort((a, b) => a.currentHP / a.maxHP - b.currentHP / b.maxHP);
  const target = woundedIncludingSelf[0];
  const targetPos = state.positions.get(target.id);

  const candidates = [];
  for (let abilityIndex = 0; abilityIndex < abilities.length; abilityIndex++) {
    const ability = abilities[abilityIndex];
    const legal = checkHealAbilityLegal({ healer: combatant, healerPos: pos, target, targetPos, ability, turnState });
    if (!legal.legal) continue;
    const healing = Math.min(ability.healingAmount ?? 0, target.maxHP - target.currentHP);
    candidates.push({
      type: "healAbility", targetId: target.id, abilityIndex, weightKey: "repair", value: healing,
      reason: `${ability.name} on ${target.name} (${target.currentHP}/${target.maxHP} HP): ${healing} HP restored.`
    });
  }
  if (candidates.length) return candidates;

  if (isAdjacent(pos, targetPos)) return []; // already close enough for any real-world range this ability might have — nothing to move toward
  const bestRange = Math.max(...abilities.map((a) => a.range ?? FEET_PER_SQUARE));
  const destination = computeDestination(state, combatant.id, pos, targetPos, remainingSpeedFeet(turnState), bestRange);
  if (!destination) return [];
  return [{ type: "move", to: destination, weightKey: "positioning", value: 1, reason: `Move toward ${target.name} (${target.currentHP}/${target.maxHP} HP) to bring them into range of a heal ability.` }];
}

/**
 * Advance: the Claimant's scripted, near-mandatory directive (design doc
 * §14g/statblock: "It uses this every round it is not Stunned; it does
 * not pursue, retreat, or change target"). Modeled as a candidate like
 * everything else — RELENTLESS_ADVANCER's `directive` weight (profiles.mjs)
 * is set high enough that this always wins when it's available, which is
 * the honest way to represent "not really a discretionary choice" inside
 * a framework that's otherwise genuinely comparing options, rather than
 * special-casing the Claimant's turn outside the framework entirely.
 */
function generateAdvanceCandidate(combatant, turnState) {
  if (!combatant.objective) return null;
  const remaining = turnState.actionsAvailable - turnState.actionsUsed;
  if (turnState.actionsUsed !== 0 || remaining < 2) return null;
  return {
    type: "advance", towards: combatant.objective, weightKey: "directive", value: 1,
    reason: `Advance toward the objective (${combatant.objective.col},${combatant.objective.row}) — scripted directive, takes priority every turn it can afford the 2 actions.`
  };
}

/**
 * The full candidate set for one combatant's decision right now. Every
 * entry has already passed real legality checks and carries a
 * mechanically-grounded value + a human-readable reason; utility-ai.mjs
 * just has to weight and pick the best one.
 */
export function generateCandidates(state, combatantId, turnState) {
  const combatant = state.combatants.get(combatantId);
  const pos = state.positions.get(combatantId);
  const remaining = turnState.actionsAvailable - turnState.actionsUsed;
  if (remaining <= 0) return [];

  const candidates = [];
  const advance = generateAdvanceCandidate(combatant, turnState);
  if (advance) candidates.push(advance);

  candidates.push(...generateStrikeCandidates(state, combatant, pos, turnState));
  const moveTowardTarget = generateMoveTowardTargetCandidate(state, combatant, pos, turnState);
  if (moveTowardTarget) candidates.push(moveTowardTarget);

  candidates.push(...generateSpotCandidates(state, combatant, turnState));
  candidates.push(...generateEvacuateCandidates(state, combatant, pos, turnState));
  candidates.push(...generateRepairCandidates(state, combatant, pos, turnState));
  candidates.push(...generateHealAbilityCandidates(state, combatant, pos, turnState));

  return candidates;
}
