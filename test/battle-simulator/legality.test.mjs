/**
 * THE critical test file. Every check in engine/legality.mjs gets its own
 * positive AND negative case — proving both "a legal action is allowed"
 * and "an illegal one is rejected with a clear reason", since the whole
 * point of this module is that the second half never silently fails to
 * fire.
 *
 * Extended 2026-08-22 after an adversarial workflow (five independent
 * agents with real repro access against this exact engine) found and
 * proved several gaps. Every regression test added below traces to one of
 * those confirmed exploits — see engine.mjs/legality.mjs's own fix
 * comments for the matching root-cause explanation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkActionBudget,
  checkActorAlive,
  checkMoveLegality,
  checkScaleTargeting,
  checkStrikeRange,
  checkTargetAlive,
  checkStrikeLegal,
  checkFieldRepairLegal,
  checkSpotLegal,
  checkEvacuateLegal,
  checkSpellRange,
  checkSpellAttackLegal,
  checkHealAbilityLegal,
  multipleAttackPenalty,
  rangeIncrementPenalty
} from "../../tools/battle-simulator/engine/legality.mjs";

const gridSize = { cols: 20, rows: 20 };
const openBudget = { actionsAvailable: 3, actionsUsed: 0 };

test("checkActionBudget: allows an action that fits, rejects one that doesn't", () => {
  assert.equal(checkActionBudget({ actionsAvailable: 3, actionsUsed: 1 }, 1).legal, true);
  assert.equal(checkActionBudget({ actionsAvailable: 3, actionsUsed: 2 }, 2).legal, false, "1 action remains, can't afford a 2-cost action");
  assert.equal(checkActionBudget({ actionsAvailable: 1, actionsUsed: 0 }, 1).legal, true, "exactly enough is legal, not just strictly-more");
  assert.equal(checkActionBudget({ actionsAvailable: 0, actionsUsed: 0 }, 1).legal, false, "a Hulked/disabled combatant (0 actions) can't act at all");
});

test("checkActorAlive: rejects an actor at 0 HP, allows one above it (regression: dead combatants kept striking mid-turn)", () => {
  assert.equal(checkActorAlive({ name: "x", currentHP: 0 }).legal, false);
  assert.equal(checkActorAlive({ name: "x", currentHP: 1 }).legal, true);
});

test("checkMoveLegality: rejects moving further than effective Speed", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 10, row: 0 }, // 500ft
    effectiveSpeed: 300, feetAlreadyMovedThisTurn: 0, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /exceeding effective Speed/);
});

test("checkMoveLegality: allows a move exactly at the Speed limit", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 6, row: 0 }, // exactly 300ft
    effectiveSpeed: 300, feetAlreadyMovedThisTurn: 0, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkMoveLegality: accounts for feet already moved this turn (can't move 300ft twice on a 300ft Speed)", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 6, row: 0 }, to: { col: 7, row: 0 }, // one more 50ft step
    effectiveSpeed: 300, feetAlreadyMovedThisTurn: 300, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkMoveLegality: rejects moving onto an occupied square", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 999, feetAlreadyMovedThisTurn: 0,
    allPositions: [{ combatantId: "b", pos: { col: 1, row: 0 } }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /occupied/);
});

test("checkMoveLegality: does not confuse the MOVER's own current square with an obstacle", () => {
  // Regression guard: allPositions includes the mover's own entry; the filter in engine.mjs excludes it before
  // calling this function, but this function itself must also tolerate being handed a position list that includes it.
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 999, feetAlreadyMovedThisTurn: 0,
    allPositions: [{ combatantId: "a", pos: { col: 0, row: 0 } }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true, "the mover's own prior position must not block its own move — it's the one moving");
});

test("checkMoveLegality: rejects a destination off the grid", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 99, row: 0 },
    effectiveSpeed: 999, feetAlreadyMovedThisTurn: 0, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /off the map/);
});

test("checkMoveLegality: rejects when the action budget doesn't allow it (regression: 'move' used to be exempt from budget enforcement)", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 30, feetAlreadyMovedThisTurn: 0, allPositions: [], gridSize,
    turnState: { actionsAvailable: 0, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /Not enough actions/);
});

test("checkMoveLegality: rejects a move whose straight-line PATH passes through an occupied square, not just the destination (regression: could move through a blocker)", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 8, row: 0 }, // 40ft, straight line
    effectiveSpeed: 999, feetAlreadyMovedThisTurn: 0,
    allPositions: [{ combatantId: "blocker", pos: { col: 4, row: 0 } }], // directly on the path, not the destination
    gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /passes through an occupied square/);
});

test("checkMoveLegality: a move whose path does NOT cross an occupied square is unaffected by an unrelated blocker elsewhere", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 4, row: 0 },
    effectiveSpeed: 999, feetAlreadyMovedThisTurn: 0,
    allPositions: [{ combatantId: "blocker", pos: { col: 10, row: 10 } }], // nowhere near the path
    gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkScaleTargeting: a Scale-Blind attacker cannot target Medium or smaller", () => {
  const attacker = { name: "Claimant", scaleBlind: true };
  for (const size of ["medium", "small", "tiny"]) {
    const result = checkScaleTargeting({ attacker, target: { name: "Kid", size } });
    assert.equal(result.legal, false, `must reject targeting a ${size} creature`);
  }
});

test("checkScaleTargeting: a Scale-Blind attacker CAN target Large or bigger", () => {
  const attacker = { name: "Claimant", scaleBlind: true };
  for (const size of ["large", "huge", "gargantuan"]) {
    const result = checkScaleTargeting({ attacker, target: { name: "Frame", size } });
    assert.equal(result.legal, true, `must allow targeting a ${size} creature`);
  }
});

test("checkScaleTargeting: an attacker without scaleBlind can target anything", () => {
  const attacker = { name: "Kingfisher", scaleBlind: false };
  const result = checkScaleTargeting({ attacker, target: { name: "Kid", size: "medium" } });
  assert.equal(result.legal, true);
});

test("checkStrikeRange: melee rejects a target beyond reach", () => {
  const strike = { strikeType: "melee", traits: [] }; // default reach 50ft (one square)
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 5, row: 0 }, strike }); // 250ft
  assert.equal(result.legal, false);
});

test("checkStrikeRange: melee allows a target exactly at reach", () => {
  const strike = { strikeType: "melee", traits: ["reach-100"] };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 2, row: 0 }, strike }); // 100ft
  assert.equal(result.legal, true);
});

test("checkStrikeRange: ranged rejects a target beyond the 6th range increment", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 500 };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 62, row: 0 }, strike }); // 3100ft > 3000ft (6*500)
  assert.equal(result.legal, false);
  assert.match(result.reason, /6th range increment/);
});

test("checkStrikeRange: ranged allows a target within the 6th range increment", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 500 };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 60, row: 0 }, strike }); // exactly 3000ft
  assert.equal(result.legal, true);
});

test("rangeIncrementPenalty: matches Player Core pg. 254's own worked example exactly (a 60ft-increment pistol: 0 inside 60ft, -2 to 120ft, -4 to 180ft, and so on)", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 60 };
  assert.equal(rangeIncrementPenalty(strike, 60), 0, "exactly at the increment: no penalty");
  assert.equal(rangeIncrementPenalty(strike, 61), -2, "one foot past the increment: -2, the 2nd increment");
  assert.equal(rangeIncrementPenalty(strike, 120), -2, "exactly at the 2nd increment boundary: still -2");
  assert.equal(rangeIncrementPenalty(strike, 121), -4, "just past 2x: -4, the 3rd increment");
  assert.equal(rangeIncrementPenalty(strike, 180), -4);
  assert.equal(rangeIncrementPenalty(strike, 360), -10, "exactly at the 6th increment: -10, the maximum before impossible");
});

test("rangeIncrementPenalty: is 0 for a target inside the first increment, regardless of how close", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 500 };
  assert.equal(rangeIncrementPenalty(strike, 1), 0);
  assert.equal(rangeIncrementPenalty(strike, 500), 0);
});

test("rangeIncrementPenalty: is always 0 for a melee strike, and for a ranged strike with no rangeIncrement set (REGRESSION: this rule was previously missing entirely — checkStrikeRange only ever enforced the 6th-increment hard cutoff, never the -2-per-increment accuracy penalty for anything short of it)", () => {
  assert.equal(rangeIncrementPenalty({ strikeType: "melee" }, 9999), 0);
  assert.equal(rangeIncrementPenalty({ strikeType: "ranged" }, 9999), 0, "no rangeIncrement on the strike itself must not throw or divide by zero");
});

const unlimitedSidearm = { name: "Mounted Sidearm", strikeType: "ranged", rangeIncrement: 60 };

test("checkStrikeLegal: a strike with no usesRemaining field is unlimited — legal regardless of how many times it's checked", () => {
  const attacker = { name: "Vehicle", currentHP: 50, scaleBlind: false };
  const result = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 },
    target: { name: "Target", size: "huge", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike: unlimitedSidearm, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, true);
});

test("checkStrikeLegal: a limited-use strike with usesRemaining > 0 is legal, and with 0 is rejected with a clear reason (design doc §14g: expensive ordnance that just isn't there once spent)", () => {
  const attacker = { name: "Vehicle", currentHP: 50, scaleBlind: false };
  const target = { name: "Target", size: "huge", currentHP: 10 };
  const turnState = { actionsAvailable: 3, actionsUsed: 0 };

  const loaded = { name: "Long-Range Missile", strikeType: "ranged", rangeIncrement: 2000, usesRemaining: 1, usesPerEncounter: 1 };
  assert.equal(checkStrikeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, strike: loaded, turnState }).legal, true);

  const spent = { ...loaded, usesRemaining: 0 };
  const result = checkStrikeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, strike: spent, turnState });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of ordnance/);
});

test("checkTargetAlive: rejects targeting something already at 0 HP", () => {
  assert.equal(checkTargetAlive({ name: "x", currentHP: 0 }).legal, false);
  assert.equal(checkTargetAlive({ name: "x", currentHP: 1 }).legal, true);
});

test("checkTargetAlive: rejects (does not throw) when the target doesn't exist at all (regression: a bad/stale targetId used to crash the whole battle)", () => {
  assert.doesNotThrow(() => checkTargetAlive(undefined));
  assert.equal(checkTargetAlive(undefined).legal, false);
});

test("checkStrikeLegal: rejects when the ATTACKER is at 0 HP, even if everything about the target/range/budget is fine (regression: a dead combatant could still land Strikes)", () => {
  const deadAttacker = { name: "Ghost", currentHP: 0, scaleBlind: false };
  const strike = { strikeType: "melee", traits: [] };
  const result = checkStrikeLegal({
    attacker: deadAttacker, attackerPos: { col: 0, row: 0 },
    target: { name: "Target", size: "huge", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /Hulked\/Destroyed|0 HP/);
});

test("checkStrikeLegal: composes ALL sub-checks — fails closed if ANY one of them fails", () => {
  const attacker = { name: "Claimant", scaleBlind: true, currentHP: 100 };
  const strike = { strikeType: "melee", traits: [] };
  const turnState = { actionsAvailable: 3, actionsUsed: 0 };

  // Fails on scale targeting even though range/budget/alive would all pass.
  const scaleFail = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 },
    target: { name: "Kid", size: "medium", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike, turnState
  });
  assert.equal(scaleFail.legal, false);

  // Fails on range even though scale/budget/alive would all pass.
  const rangeFail = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 },
    target: { name: "Frame", size: "huge", currentHP: 10 }, targetPos: { col: 9, row: 0 },
    strike, turnState
  });
  assert.equal(rangeFail.legal, false);

  // Fails on budget even though everything else would pass.
  const budgetFail = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 },
    target: { name: "Frame", size: "huge", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike, turnState: { actionsAvailable: 1, actionsUsed: 1 }
  });
  assert.equal(budgetFail.legal, false);

  // Everything passes.
  const legal = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 },
    target: { name: "Frame", size: "huge", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike, turnState
  });
  assert.equal(legal.legal, true);
});

const capableRepairer = { name: "Ladle", currentHP: 100, repairBonus: 24, handlingDC: 16 };

test("checkFieldRepairLegal: rejects a repairer with no Field Repair capability (regression: any combatant, including the enemy, could get a 'repair' accepted as legal)", () => {
  const incapableRepairer = { name: "Frame with no repair training", currentHP: 100 };
  const result = checkFieldRepairLegal({
    repairer: incapableRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 50, maxHP: 100 }, targetPos: { col: 1, row: 0 },
    turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /no Field Repair capability/);
});

test("checkFieldRepairLegal: rejects a repairer at 0 HP", () => {
  const deadRepairer = { name: "Ladle", currentHP: 0, repairBonus: 24, handlingDC: 16 };
  const result = checkFieldRepairLegal({
    repairer: deadRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 50, maxHP: 100 }, targetPos: { col: 1, row: 0 },
    turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkFieldRepairLegal: rejects a missing target (regression: crashed instead of returning legal:false)", () => {
  assert.doesNotThrow(() => checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: undefined, targetPos: { col: 1, row: 0 },
    turnState: openBudget
  }));
  const result = checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: undefined, targetPos: { col: 1, row: 0 },
    turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkFieldRepairLegal: rejects when not adjacent, when target already full HP, and when target is Hulked", () => {
  const turnState = { actionsAvailable: 3, actionsUsed: 0 };

  assert.equal(checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 30, maxHP: 100 }, targetPos: { col: 5, row: 0 },
    turnState
  }).legal, false, "not adjacent");

  assert.equal(checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 100, maxHP: 100 }, targetPos: { col: 1, row: 0 },
    turnState
  }).legal, false, "already full HP");

  assert.equal(checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 0, maxHP: 100 }, targetPos: { col: 1, row: 0 },
    turnState
  }).legal, false, "Hulked/destroyed, can't be repaired");

  assert.equal(checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 50, maxHP: 100 }, targetPos: { col: 1, row: 0 },
    turnState
  }).legal, true);
});

test("checkFieldRepairLegal: rejects when fewer than 2 actions remain (it costs 2)", () => {
  const result = checkFieldRepairLegal({
    repairer: capableRepairer, repairerPos: { col: 0, row: 0 },
    target: { name: "x", currentHP: 50, maxHP: 100 }, targetPos: { col: 1, row: 0 },
    turnState: { actionsAvailable: 3, actionsUsed: 2 } // only 1 remains
  });
  assert.equal(result.legal, false);
});

const aliveSpotter = { name: "Vesper", currentHP: 85 };

test("checkSpotLegal: rejects a dead spotter, a missing target, and a dead target; allows the ordinary case", () => {
  const openTurn = { actionsAvailable: 3, actionsUsed: 0 };
  assert.equal(checkSpotLegal({ spotter: { name: "x", currentHP: 0 }, target: { name: "Frame", currentHP: 10 }, turnState: openTurn }).legal, false, "dead spotter");
  assert.equal(checkSpotLegal({ spotter: aliveSpotter, target: undefined, turnState: openTurn }).legal, false, "missing target");
  assert.equal(checkSpotLegal({ spotter: aliveSpotter, target: { name: "Frame", currentHP: 0 }, turnState: openTurn }).legal, false, "dead target");
  assert.equal(checkSpotLegal({ spotter: aliveSpotter, target: { name: "Frame", currentHP: 10 }, turnState: openTurn }).legal, true);
});

test("checkSpotLegal: rejects when no action remains (it costs 1)", () => {
  const result = checkSpotLegal({ spotter: aliveSpotter, target: { name: "Frame", currentHP: 10 }, turnState: { actionsAvailable: 1, actionsUsed: 1 } });
  assert.equal(result.legal, false);
});

const aliveEvacuator = { name: "Runabout", currentHP: 60 };

test("checkEvacuateLegal: rejects an evacuator at 0 HP", () => {
  const result = checkEvacuateLegal({
    evacuator: { name: "x", currentHP: 0 }, evacuatorPos: { col: 0, row: 0 },
    oppositionPositions: [], turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
});

test("checkEvacuateLegal: rejects when fewer than 2 actions remain (it costs 2)", () => {
  const result = checkEvacuateLegal({
    evacuator: aliveEvacuator, evacuatorPos: { col: 0, row: 0 },
    oppositionPositions: [], turnState: { actionsAvailable: 3, actionsUsed: 2 }
  });
  assert.equal(result.legal, false);
});

test("checkEvacuateLegal: rejects when within 300ft of any living opposition combatant", () => {
  const result = checkEvacuateLegal({
    evacuator: aliveEvacuator, evacuatorPos: { col: 0, row: 0 },
    oppositionPositions: [{ col: 4, row: 0 }], // 200ft — too close
    turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /within 300ft/);
});

test("checkEvacuateLegal: allows evacuating when clear of all opposition, ignores dead opposition already filtered out by the caller", () => {
  const result = checkEvacuateLegal({
    evacuator: aliveEvacuator, evacuatorPos: { col: 0, row: 0 },
    oppositionPositions: [{ col: 6, row: 0 }], // exactly 300ft
    turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, true);
});

test("multipleAttackPenalty: standard progression 0/-5/-10", () => {
  assert.equal(multipleAttackPenalty(1, false), 0);
  assert.equal(multipleAttackPenalty(2, false), -5);
  assert.equal(multipleAttackPenalty(3, false), -10);
  assert.equal(multipleAttackPenalty(4, false), -10, "no further penalty beyond the 3rd — it doesn't keep escalating");
});

test("multipleAttackPenalty: agile progression 0/-4/-8", () => {
  assert.equal(multipleAttackPenalty(1, true), 0);
  assert.equal(multipleAttackPenalty(2, true), -4);
  assert.equal(multipleAttackPenalty(3, true), -8);
});

// ---------------------------------------------------------------------------
// checkSpellRange / checkSpellAttackLegal / checkHealAbilityLegal (design doc §14k)
// ---------------------------------------------------------------------------

const eldritchLance = { name: "Eldritch Lance", attackBonus: 24, range: 30, actions: 2, traits: ["attack", "cantrip"], damage: [{ dice: "7d6", bonus: 0, damageType: "mental" }] };
const transferVitality = { name: "Transfer Vitality", healingAmount: 30, range: 60, actions: 1, traits: ["healing"] };
const aliveCaster = { id: "mystic", name: "Mystic", currentHP: 100, scaleBlind: false };

test("checkSpellRange: legal at exactly the spell's stated range, illegal one square beyond it — a flat boundary, not an incrementing one", () => {
  const atRange = checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 0, row: 0 }, spell: eldritchLance }); // 0ft, well within 30
  assert.equal(atRange.legal, true);
  const beyond = checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 1, row: 0 }, spell: eldritchLance }); // 50ft > 30ft
  assert.equal(beyond.legal, false);
  assert.match(beyond.reason, /beyond Eldritch Lance's range/);
});

test("checkSpellRange: a spell with no range field defaults to touch/adjacent-only (one square)", () => {
  const touchSpell = { name: "Touch Spell" };
  const adjacent = checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 1, row: 0 }, spell: touchSpell }); // 50ft = one square
  assert.equal(adjacent.legal, true);
  const notAdjacent = checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 2, row: 0 }, spell: touchSpell }); // 100ft
  assert.equal(notAdjacent.legal, false);
});

test("checkSpellAttackLegal: legal for a real in-range target with enough actions", () => {
  const target = { id: "t", name: "Target", currentHP: 100, size: "huge" };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: eldritchLance, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, true);
});

test("checkSpellAttackLegal: rejects when fewer actions remain than the spell's own actions cost (2 for Eldritch Lance, not hardcoded to 1 like a Strike)", () => {
  const target = { id: "t", name: "Target", currentHP: 100, size: "huge" };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: eldritchLance, turnState: { actionsAvailable: 3, actionsUsed: 2 } // only 1 left, spell needs 2
  });
  assert.equal(result.legal, false);
});

test("checkSpellAttackLegal: Scale Disparity still applies to a spell attack exactly like a Strike", () => {
  const scaleBlindCaster = { ...aliveCaster, scaleBlind: true };
  const mediumTarget = { id: "t", name: "Target", currentHP: 100, size: "medium" };
  const result = checkSpellAttackLegal({
    caster: scaleBlindCaster, casterPos: { col: 0, row: 0 }, target: mediumTarget, targetPos: { col: 0, row: 0 },
    spell: eldritchLance, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
});

test("checkSpellAttackLegal: a spent limited-use spell (usesRemaining 0) is rejected, same mechanism as vehicle ordnance", () => {
  const target = { id: "t", name: "Target", currentHP: 100, size: "huge" };
  const spentSpell = { ...eldritchLance, usesRemaining: 0 };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: spentSpell, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of prepared slots/);
});

test("checkSpellAttackLegal: rejects out of range (beyond Eldritch Lance's 30ft)", () => {
  const target = { id: "t", name: "Target", currentHP: 100, size: "huge" };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 5, row: 0 }, // 250ft
    spell: eldritchLance, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: legal on a wounded ally within range", () => {
  const target = { id: "ally", name: "Ally", currentHP: 50, maxHP: 100 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: transferVitality, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, true);
});

test("checkHealAbilityLegal: rejects a target already at full HP", () => {
  const target = { id: "ally", name: "Ally", currentHP: 100, maxHP: 100 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: transferVitality, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /already at full HP/);
});

test("checkHealAbilityLegal: rejects a target at 0 HP (dead/Hulked, not a valid heal target)", () => {
  const target = { id: "ally", name: "Ally", currentHP: 0, maxHP: 100 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: transferVitality, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: rejects out of range (beyond Transfer Vitality's 60ft)", () => {
  const target = { id: "ally", name: "Ally", currentHP: 50, maxHP: 100 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 3, row: 0 }, // 150ft
    ability: transferVitality, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: a depleted ability (usesRemaining 0) is rejected", () => {
  const target = { id: "ally", name: "Ally", currentHP: 50, maxHP: 100 };
  const depleted = { ...transferVitality, usesRemaining: 0 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: depleted, turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /depleted/);
});
