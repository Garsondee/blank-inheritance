/**
 * Legality checks for the PERSONNEL-SCALE engine (design doc §19) — the same coverage shape as
 * legality.test.mjs (every check gets a positive AND negative case), at the real 5ft grid, with
 * NO checkScaleTargeting/scaleBlind coverage at all — personnel-engine/legality.mjs never ported
 * that check (see its own header: there is no "scale" axis for two ordinary SF2E creatures to be
 * disparate across). Line of Effect (walls) gets its own dedicated coverage here instead, since
 * that's the mechanism Phase 1b's building actually depends on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkActionBudget,
  checkActorAlive,
  checkMoveLegality,
  checkStepLegality,
  checkStrikeRange,
  checkTargetAlive,
  checkStrikeLegal,
  checkSpellRange,
  checkSpellAttackLegal,
  checkHealAbilityLegal,
  checkSaveAttackLegal,
  checkDemoralizeLegal,
  checkConditionSaveLegal,
  checkAreaAttackLegal,
  checkTripLegal,
  checkShoveLegal,
  checkGrappleLegal,
  checkEscapeLegal,
  checkStandLegal,
  checkCrawlLegal,
  multipleAttackPenalty,
  rangeIncrementPenalty,
  hasUses,
  spendUse
} from "../../tools/battle-simulator/personnel-engine/legality.mjs";

const gridSize = { cols: 20, rows: 20 };
const openBudget = { actionsAvailable: 3, actionsUsed: 0 };

test("checkActionBudget: allows an action that fits, rejects one that doesn't", () => {
  assert.equal(checkActionBudget({ actionsAvailable: 3, actionsUsed: 1 }, 1).legal, true);
  assert.equal(checkActionBudget({ actionsAvailable: 3, actionsUsed: 2 }, 2).legal, false);
  assert.equal(checkActionBudget({ actionsAvailable: 1, actionsUsed: 0 }, 1).legal, true, "exactly enough is legal");
  assert.equal(checkActionBudget({ actionsAvailable: 0, actionsUsed: 0 }, 1).legal, false, "a combatant at 0 HP (0 actions) can't act at all");
});

test("checkActorAlive: rejects an actor at 0 HP, allows one above it", () => {
  assert.equal(checkActorAlive({ name: "x", currentHP: 0 }).legal, false);
  assert.equal(checkActorAlive({ name: "x", currentHP: 1 }).legal, true);
});

test("checkMoveLegality: rejects moving further than effective Speed (real 5ft-grid numbers: 6 squares = 30ft)", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 6, row: 0 }, // 30ft
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /exceeding effective Speed/);
});

test("checkMoveLegality: allows a move exactly at the Speed limit (a real SF2E Speed 25 — 5 squares)", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 5, row: 0 }, // exactly 25ft
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkMoveLegality: each move action gets a FULL Speed independently — Stride is repeatable, having already moved this turn does not restrict the next move", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 5, row: 0 }, to: { col: 6, row: 0 }, // one more 5ft step
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true, "a second Stride is legal — paid for with a second action, not a shared distance pool");
});

test("checkMoveLegality: rejects moving onto an occupied square", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 999, allPositions: [{ combatantId: "b", pos: { col: 1, row: 0 } }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /occupied/);
});

test("checkMoveLegality: does not confuse the MOVER's own current square with an obstacle", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 999, allPositions: [{ combatantId: "a", pos: { col: 0, row: 0 } }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkMoveLegality: rejects a destination off the grid", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 99, row: 0 },
    effectiveSpeed: 999, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /off the map/);
});

test("checkMoveLegality: rejects when the action budget doesn't allow it", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 30, allPositions: [], gridSize, turnState: { actionsAvailable: 0, actionsUsed: 0 }
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /Not enough actions/);
});

test("checkMoveLegality: rejects a move whose straight-line PATH passes through a DIFFERENT-side occupant's square, not just the destination", () => {
  const result = checkMoveLegality({
    combatant: { id: "a", side: "party" }, from: { col: 0, row: 0 }, to: { col: 8, row: 0 }, // 40ft, straight line
    effectiveSpeed: 999, allPositions: [{ combatantId: "blocker", pos: { col: 4, row: 0 }, side: "opposition" }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /occupied by a different-side combatant/);
});

// --- Move through allies (design doc §24 — Ingram's own direct correction: "Characters can move
// through friendly character spaces per the rules") ---

test("checkMoveLegality: a SAME-side occupant's square does NOT block passing through it — a real SF2E movement rule, not a wall", () => {
  const result = checkMoveLegality({
    combatant: { id: "a", side: "party" }, from: { col: 0, row: 0 }, to: { col: 8, row: 0 },
    effectiveSpeed: 999, allPositions: [{ combatantId: "ally", pos: { col: 4, row: 0 }, side: "party" }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true, `expected passing through an ally's square to be legal, got: ${result.reason}`);
});

test("checkMoveLegality: an ally's square still can't be the DESTINATION — you can move through, you can't stop there", () => {
  const result = checkMoveLegality({
    combatant: { id: "a", side: "party" }, from: { col: 0, row: 0 }, to: { col: 4, row: 0 },
    effectiveSpeed: 999, allPositions: [{ combatantId: "ally", pos: { col: 4, row: 0 }, side: "party" }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /can't stop there/);
});

test("checkMoveLegality: with no side info at all on the mover, falls back to the original any-occupant-blocks rule rather than silently treating every occupant as passable", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 8, row: 0 },
    effectiveSpeed: 999, allPositions: [{ combatantId: "blocker", pos: { col: 4, row: 0 } }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false, "no side info anywhere must not silently become 'nothing blocks'");
});

// ---------------------------------------------------------------------------
// Wall / Line of Effect (design doc §19 Phase 1b — the building's whole point)
// ---------------------------------------------------------------------------

test("checkMoveLegality: a straight-line path blocked by a wall is rejected", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }]; // the shared edge between (0,0) and (1,0)
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 2, row: 0 },
    effectiveSpeed: 999, allPositions: [], gridSize, turnState: openBudget, walls: wall
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /blocked by a wall/);
});

test("checkMoveLegality: an explicit `path` that detours AROUND a blocker sitting on the straight line is legal", () => {
  const detour = [{ col: 0, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 0 }];
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 4, row: 0 },
    effectiveSpeed: 999, allPositions: [{ combatantId: "blocker", pos: { col: 2, row: 0 } }], gridSize, turnState: openBudget, path: detour
  });
  assert.equal(result.legal, true, `expected the detour to be accepted: ${result.reason}`);
});

test("checkMoveLegality: an explicit `path` is still rejected if IT is actually blocked by a wall", () => {
  const path = [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }];
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 2, row: 0 },
    effectiveSpeed: 999, allPositions: [], gridSize, turnState: openBudget, path, walls: wall
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /blocked by a wall/);
});

test("checkStepLegality: allows a one-square hop with ordinary Speed", () => {
  const result = checkStepLegality({
    combatant: { id: "a" }, from: { col: 5, row: 5 }, to: { col: 6, row: 5 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkStepLegality: rejects a hop longer than one square, even if Speed could cover it", () => {
  const result = checkStepLegality({
    combatant: { id: "a" }, from: { col: 5, row: 5 }, to: { col: 7, row: 5 }, // 2 squares
    effectiveSpeed: 999, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /exactly one square/);
});

test("checkStepLegality: rejects a Step when effective Speed can't even complete one square (below the real 5ft FEET_PER_SQUARE)", () => {
  const result = checkStepLegality({
    combatant: { id: "a" }, from: { col: 5, row: 5 }, to: { col: 6, row: 5 },
    effectiveSpeed: 2, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /too low/);
});

test("checkStrikeRange: melee rejects a target beyond reach (default reach is one 5ft square)", () => {
  const strike = { strikeType: "melee", traits: [] };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 5, row: 0 }, strike }); // 25ft
  assert.equal(result.legal, false);
});

test("checkStrikeRange: melee allows a target exactly at reach (a real reach-10 weapon)", () => {
  const strike = { strikeType: "melee", traits: ["reach-10"] };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 2, row: 0 }, strike }); // 10ft
  assert.equal(result.legal, true);
});

test("checkStrikeRange: ranged rejects a target beyond the 6th range increment", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 20 };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 25, row: 0 }, strike }); // 125ft > 120ft (6*20)
  assert.equal(result.legal, false);
  assert.match(result.reason, /6th range increment/);
});

test("checkStrikeRange: ranged allows a target within the 6th range increment", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 20 };
  const result = checkStrikeRange({ attackerPos: { col: 0, row: 0 }, targetPos: { col: 24, row: 0 }, strike }); // exactly 120ft
  assert.equal(result.legal, true);
});

test("rangeIncrementPenalty: matches Player Core pg. 254's own worked example exactly — real feet values, scale-independent (a 60ft-increment pistol)", () => {
  const strike = { strikeType: "ranged", rangeIncrement: 60 };
  assert.equal(rangeIncrementPenalty(strike, 60), 0, "exactly at the increment: no penalty");
  assert.equal(rangeIncrementPenalty(strike, 61), -2, "one foot past the increment: -2, the 2nd increment");
  assert.equal(rangeIncrementPenalty(strike, 120), -2, "exactly at the 2nd increment boundary: still -2");
  assert.equal(rangeIncrementPenalty(strike, 121), -4, "just past 2x: -4, the 3rd increment");
  assert.equal(rangeIncrementPenalty(strike, 360), -10, "exactly at the 6th increment: -10, the maximum before impossible");
});

test("rangeIncrementPenalty: is always 0 for melee, and for a ranged strike with no rangeIncrement set", () => {
  assert.equal(rangeIncrementPenalty({ strikeType: "melee" }, 9999), 0);
  assert.equal(rangeIncrementPenalty({ strikeType: "ranged" }, 9999), 0, "no rangeIncrement must not throw or divide by zero");
});

test("checkTargetAlive: rejects a missing or already-dead target", () => {
  assert.equal(checkTargetAlive(null).legal, false);
  assert.equal(checkTargetAlive({ name: "x", currentHP: 0 }).legal, false);
  assert.equal(checkTargetAlive({ name: "x", currentHP: 1 }).legal, true);
});

const pistol = { name: "Sidearm", strikeType: "ranged", rangeIncrement: 20 };

test("checkStrikeLegal: a strike with no usesRemaining field is unlimited", () => {
  const attacker = { name: "Goon", currentHP: 8 };
  const result = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 }, target: { name: "Target", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike: pistol, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkStrikeLegal: a limited-use strike with usesRemaining > 0 is legal, and with 0 is rejected", () => {
  const attacker = { name: "Goon", currentHP: 8 };
  const target = { name: "Target", currentHP: 10 };
  const loaded = { ...pistol, usesRemaining: 1 };
  assert.equal(checkStrikeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, strike: loaded, turnState: openBudget }).legal, true);

  const spent = { ...pistol, usesRemaining: 0 };
  const result = checkStrikeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, strike: spent, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of uses/);
});

test("checkStrikeLegal: no `vision` field means unlimited perceptual range", () => {
  const attacker = { name: "Goon", currentHP: 8 };
  const farWeapon = { name: "Rifle", strikeType: "ranged", rangeIncrement: 200, attackBonus: 10 };
  const result = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 }, target: { name: "Target", currentHP: 10 }, targetPos: { col: 20, row: 0 },
    strike: farWeapon, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkStrikeLegal: a defined vision.range rejects a target beyond it, even when the WEAPON's own range would reach", () => {
  const attacker = { name: "Goon", currentHP: 8, vision: { range: 50 } };
  const farWeapon = { name: "Rifle", strikeType: "ranged", rangeIncrement: 200, attackBonus: 10 };

  const withinVision = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 }, target: { name: "Target", currentHP: 10 }, targetPos: { col: 5, row: 0 }, // 25ft
    strike: farWeapon, turnState: openBudget
  });
  assert.equal(withinVision.legal, true);

  const beyondVision = checkStrikeLegal({
    attacker, attackerPos: { col: 0, row: 0 }, target: { name: "Target", currentHP: 10 }, targetPos: { col: 20, row: 0 }, // 100ft
    strike: farWeapon, turnState: openBudget
  });
  assert.equal(beyondVision.legal, false, "100ft is within the weapon's 1200ft max range but beyond a 50ft vision range");
  assert.match(beyondVision.reason, /perceptual range/);
});

test("checkStrikeLegal: rejects when the ATTACKER is at 0 HP, even if range/target/budget are all fine", () => {
  const result = checkStrikeLegal({
    attacker: { name: "Ghost", currentHP: 0 }, attackerPos: { col: 0, row: 0 },
    target: { name: "Target", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike: { strikeType: "melee", traits: [] }, turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkStrikeLegal: rejects a wall fully blocking Line of Effect, even though range/budget/target are all otherwise fine — the mechanism Phase 1b's building depends on", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }]; // sits directly between (0,0) and (1,0)
  const result = checkStrikeLegal({
    attacker: { name: "Goon", currentHP: 8 }, attackerPos: { col: 0, row: 0 },
    target: { name: "Target", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike: { strikeType: "melee", traits: [] }, turnState: openBudget, walls: wall
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /line of effect/i);
});

test("multipleAttackPenalty: standard progression 0/-5/-10", () => {
  assert.equal(multipleAttackPenalty(1, false), 0);
  assert.equal(multipleAttackPenalty(2, false), -5);
  assert.equal(multipleAttackPenalty(3, false), -10);
  assert.equal(multipleAttackPenalty(4, false), -10, "no further penalty beyond the 3rd");
});

test("multipleAttackPenalty: agile progression 0/-4/-8", () => {
  assert.equal(multipleAttackPenalty(1, true), 0);
  assert.equal(multipleAttackPenalty(2, true), -4);
  assert.equal(multipleAttackPenalty(3, true), -8);
});

// ---------------------------------------------------------------------------
// checkSpellRange / checkSpellAttackLegal / checkHealAbilityLegal — Lunar-17's
// own real kit. Range values (30ft/60ft) are already real, unscaled SF2E
// numbers, so they carry over from the Frame-scale fixtures unchanged.
// ---------------------------------------------------------------------------

const eldritchLance = { name: "Eldritch Lance", attackBonus: 24, range: 30, actions: 2, traits: ["attack", "cantrip"], damage: [{ dice: "1d6", bonus: 0, damageType: "mental" }] };
const transferVitality = { name: "Transfer Vitality", healingAmount: 5, range: 60, actions: 1, traits: ["healing"] };
const aliveCaster = { id: "mystic", name: "Lunar-17", currentHP: 16 };

test("checkSpellRange: legal at exactly the spell's stated range, illegal one square beyond it", () => {
  const atRange = checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 6, row: 0 }, spell: eldritchLance }); // 30ft
  assert.equal(atRange.legal, true);
  const beyond = checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 7, row: 0 }, spell: eldritchLance }); // 35ft
  assert.equal(beyond.legal, false);
});

test("checkSpellRange: a spell with no range field defaults to touch/adjacent-only (one 5ft square)", () => {
  const touchSpell = { name: "Touch Spell" };
  assert.equal(checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 1, row: 0 }, spell: touchSpell }).legal, true);
  assert.equal(checkSpellRange({ casterPos: { col: 0, row: 0 }, targetPos: { col: 2, row: 0 }, spell: touchSpell }).legal, false);
});

test("checkSpellAttackLegal: legal for a real in-range target with enough actions", () => {
  const target = { id: "t", name: "Target", currentHP: 8 };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: eldritchLance, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkSpellAttackLegal: rejects when fewer actions remain than the spell's own actions cost (2 for Eldritch Lance, not hardcoded to 1)", () => {
  const target = { id: "t", name: "Target", currentHP: 8 };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: eldritchLance, turnState: { actionsAvailable: 3, actionsUsed: 2 }
  });
  assert.equal(result.legal, false);
});

test("checkSpellAttackLegal: also respects Line of Effect — a wall blocks a spell attack exactly like a Strike", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const target = { id: "t", name: "Target", currentHP: 8 };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 },
    spell: eldritchLance, turnState: openBudget, walls: wall
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /line of effect/i);
});

test("checkSpellAttackLegal: a spent limited-use spell (usesRemaining 0) is rejected", () => {
  const target = { id: "t", name: "Target", currentHP: 8 };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: { ...eldritchLance, usesRemaining: 0 }, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of prepared slots/);
});

test("checkSpellAttackLegal: rejects out of range (beyond Eldritch Lance's real 30ft)", () => {
  const target = { id: "t", name: "Target", currentHP: 8 };
  const result = checkSpellAttackLegal({
    caster: aliveCaster, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 20, row: 0 }, // 100ft
    spell: eldritchLance, turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: legal on a wounded ally within range", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: transferVitality, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkHealAbilityLegal: rejects a target already at full HP", () => {
  const target = { id: "ally", name: "Ally", currentHP: 16, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: transferVitality, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /already at full HP/);
});

test("checkHealAbilityLegal: rejects a target at 0 HP", () => {
  const target = { id: "ally", name: "Ally", currentHP: 0, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: transferVitality, turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: rejects out of range (beyond Transfer Vitality's real 60ft)", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 13, row: 0 }, // 65ft
    ability: transferVitality, turnState: openBudget
  });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: a depleted ability (usesRemaining 0) is rejected", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    ability: { ...transferVitality, usesRemaining: 0 }, turnState: openBudget
  });
  assert.equal(result.legal, false);
});

// GH #60, design doc §60 Part 1 — Heal's shared spellSlots pool. checkHealAbilityLegal reads it via
// the new shared hasUses helper instead of a bare usesRemaining check, since Heal's own entries
// carry slotRank INSTEAD of usesRemaining.
const healTouch = { name: "Heal (touch)", healingFormula: "1d8", actions: 1, slotRank: 1 };
const heal30ft = { name: "Heal (30ft)", healingFormula: "1d8+8", actions: 2, range: 30, slotRank: 1 };

test("checkHealAbilityLegal: a slotRank ability with a real slot available is legal", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const healer = { ...aliveCaster, spellSlots: { 1: 1 } };
  const result = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, ability: healTouch, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkHealAbilityLegal: a slotRank ability is rejected once its own rank's pool hits 0, same reason message shape as a depleted usesRemaining ability", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const healer = { ...aliveCaster, spellSlots: { 1: 0 } };
  const result = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, ability: healTouch, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /no uses remaining/);
});

test("checkHealAbilityLegal: a healer with NO spellSlots object at all (never cast a slot-based ability) is rejected for a slotRank ability, not crashed", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const result = checkHealAbilityLegal({ healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, ability: healTouch, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkHealAbilityLegal: TWO DIFFERENT slotRank abilities sharing the SAME healer's pool — once rank 1 is spent, BOTH become illegal, not just the one cast", () => {
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const healer = { ...aliveCaster, spellSlots: { 1: 0 } }; // as if the touch variant already spent the shared slot
  const stillIllegalTouch = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, ability: healTouch, turnState: openBudget });
  const nowIllegal30ft = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, ability: heal30ft, turnState: openBudget });
  assert.equal(stillIllegalTouch.legal, false);
  assert.equal(nowIllegal30ft.legal, false, "the 30ft variant reads the SAME spellSlots.1 pool — it must be illegal too, not independently tracked");
});

// GH #60, design doc §60 Part 1b — the self-centered emanation's own area-mode branch. No `target`
// at all — legality is driven entirely by the pre-computed `anyTargetBelowFull` (engine.mjs's own
// job to compute from the real affected set, mirroring checkAreaAttackLegal's own `affectedCount`
// convention) and the SAME shared spellSlots pool the other two variants already use.
const healEmanation = { name: "Heal (emanation)", healingFormula: "1d8", actions: 3, areaOrigin: "self", radius: 30, slotRank: 1 };

test("checkHealAbilityLegal: area mode — legal when someone in range is below full HP and a real slot exists", () => {
  const healer = { ...aliveCaster, spellSlots: { 1: 1 } };
  const result = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, ability: healEmanation, turnState: openBudget, anyTargetBelowFull: true });
  assert.equal(result.legal, true);
});

test("checkHealAbilityLegal: area mode — illegal when nobody in range needs it, even with a real slot available", () => {
  const healer = { ...aliveCaster, spellSlots: { 1: 1 } };
  const result = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, ability: healEmanation, turnState: openBudget, anyTargetBelowFull: false });
  assert.equal(result.legal, false);
  assert.match(result.reason, /needs/);
});

test("checkHealAbilityLegal: area mode — illegal once the SHARED pool is spent, same as the single-target variants (shared, not independently tracked)", () => {
  const healer = { ...aliveCaster, spellSlots: { 1: 0 } };
  const result = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, ability: healEmanation, turnState: openBudget, anyTargetBelowFull: true });
  assert.equal(result.legal, false);
  assert.match(result.reason, /no uses remaining/);
});

test("checkHealAbilityLegal: area mode — spending the pool via the emanation makes the single-target variants illegal too, and vice versa (one real shared pool, three variants)", () => {
  const healer = { ...aliveCaster, spellSlots: { 1: 0 } }; // as if the emanation already spent the shared slot
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const stillIllegalTouch = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, ability: healTouch, turnState: openBudget });
  assert.equal(stillIllegalTouch.legal, false);
});

test("checkHealAbilityLegal: area mode never touches action budget differently — a real budget check still applies (3 actions needed, none available)", () => {
  const healer = { ...aliveCaster, spellSlots: { 1: 1 } };
  const result = checkHealAbilityLegal({ healer, healerPos: { col: 0, row: 0 }, ability: healEmanation, turnState: { actionsAvailable: 3, actionsUsed: 1 }, anyTargetBelowFull: true });
  assert.equal(result.legal, false, "only 2 actions remain, the emanation costs 3 — must be rejected on budget alone, before ever reaching anyTargetBelowFull");
});

// hasUses/spendUse — the shared helper pair itself, in isolation.
test("hasUses: a slotRank ability reads healer.spellSlots, completely ignoring any usesRemaining field it might also carry", () => {
  assert.equal(hasUses({ slotRank: 1 }, { spellSlots: { 1: 2 } }), true);
  assert.equal(hasUses({ slotRank: 1 }, { spellSlots: { 1: 0 } }), false);
  assert.equal(hasUses({ slotRank: 1 }, { spellSlots: {} }), false, "an absent rank in the pool reads as 0 uses, not unlimited");
});

test("hasUses: an ordinary usesRemaining-bearing ability (no slotRank) is COMPLETELY unaffected — same behavior as before this helper existed", () => {
  assert.equal(hasUses({ usesRemaining: 1 }, { spellSlots: { 1: 0 } }), true, "a flat usesRemaining ability must never consult spellSlots, even on a healer who has one");
  assert.equal(hasUses({ usesRemaining: 0 }, {}), false);
  assert.equal(hasUses({}, {}), true, "no slotRank and no usesRemaining at all means unlimited, matching every sibling ability type's own convention");
});

test("spendUse: decrements the shared pool for a slotRank ability, and leaves usesRemaining fields on OTHER abilities in the same array untouched", () => {
  const healer = { spellSlots: { 1: 2 } };
  spendUse(healTouch, healer);
  assert.equal(healer.spellSlots[1], 1);
  spendUse(heal30ft, healer); // a DIFFERENT ability object, SAME rank — must hit the same counter
  assert.equal(healer.spellSlots[1], 0);
});

test("spendUse: an ordinary usesRemaining-bearing ability decrements ITSELF, not any healer-level pool — unchanged from before this helper existed", () => {
  const ability = { usesRemaining: 2 };
  const healer = {};
  spendUse(ability, healer);
  assert.equal(ability.usesRemaining, 1);
  assert.equal(healer.spellSlots, undefined, "must never invent a spellSlots object on a healer that never had one");
});

test("spendUse: an unlimited ability (no slotRank, no usesRemaining) is a real no-op", () => {
  const ability = {};
  assert.doesNotThrow(() => spendUse(ability, {}));
  assert.deepEqual(ability, {});
});

// REGRESSION (design doc §32 — a direct user report: "I noticed a heal being cast through a
// wall"). checkHealAbilityLegal never checked Line of Effect at all, unlike every sibling action
// legality check just above it in this same file — confirmed missing by direct code reading, now
// fixed the same way those already work.
test("checkHealAbilityLegal: respects Line of Effect — a wall blocks a heal exactly like a Strike or spell attack", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }]; // sits directly between (0,0) and (1,0)
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 },
    ability: transferVitality, turnState: openBudget, walls: wall
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /No line of effect/);
});

test("checkHealAbilityLegal: still legal with real walls present that just don't happen to block THIS shot", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }]; // between (0,0) and (1,0) — irrelevant to a heal along a different edge
  const target = { id: "ally", name: "Ally", currentHP: 10, maxHP: 16 };
  const result = checkHealAbilityLegal({
    healer: aliveCaster, healerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 1 },
    ability: transferVitality, turnState: openBudget, walls: wall
  });
  assert.equal(result.legal, true);
});

// ---------------------------------------------------------------------------
// checkSaveAttackLegal / checkDemoralizeLegal — the skill-actions-in-combat expansion
// (design doc §19). The grenade's real range (70ft) is Lunar-17's own real extracted number.
// ---------------------------------------------------------------------------

const grenade = { name: "Incendiary Grenade (Commercial)", saveType: "ref", dc: 17, range: 70, actions: 1, traits: ["consumable", "fire"], damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }] };

test("checkSaveAttackLegal: legal for a real in-range target with enough actions", () => {
  const attacker = { id: "a", name: "Thrower", currentHP: 15 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkSaveAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 10, row: 0 }, saveAttack: grenade, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkSaveAttackLegal: rejects out of range (beyond the grenade's real 70ft)", () => {
  const attacker = { id: "a", name: "Thrower", currentHP: 15 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkSaveAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 20, row: 0 }, saveAttack: grenade, turnState: openBudget }); // 100ft
  assert.equal(result.legal, false);
});

test("checkSaveAttackLegal: also respects Line of Effect, same as a Strike/spell attack", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const attacker = { id: "a", name: "Thrower", currentHP: 15 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkSaveAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, saveAttack: grenade, turnState: openBudget, walls: wall });
  assert.equal(result.legal, false);
  assert.match(result.reason, /line of effect/i);
});

test("checkSaveAttackLegal: a depleted saveAttack (usesRemaining 0) is rejected, same mechanism as limited-use Strikes", () => {
  const attacker = { id: "a", name: "Thrower", currentHP: 15 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkSaveAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, saveAttack: { ...grenade, usesRemaining: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of uses/);
});

test("checkDemoralizeLegal: legal on a real in-range (30ft), never-before-demoralized target", () => {
  const attacker = { id: "a", name: "Goon", currentHP: 25 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkDemoralizeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 6, row: 0 }, turnState: openBudget }); // 30ft
  assert.equal(result.legal, true);
});

test("checkDemoralizeLegal: rejects beyond the real 30ft range", () => {
  const attacker = { id: "a", name: "Goon", currentHP: 25 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkDemoralizeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 7, row: 0 }, turnState: openBudget }); // 35ft
  assert.equal(result.legal, false);
});

test("checkDemoralizeLegal: respects Line of Effect — can't threaten someone through a wall", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const attacker = { id: "a", name: "Goon", currentHP: 25 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkDemoralizeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, turnState: openBudget, walls: wall });
  assert.equal(result.legal, false);
});

test("checkDemoralizeLegal: rejects a target this attacker has already tried to Demoralize this encounter (the real 10-minute cooldown, functionally 'never again' within a combat this short)", () => {
  const attacker = { id: "a", name: "Goon", currentHP: 25, demoralizedTargets: ["t"] };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkDemoralizeLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /already tried/);
});

test("checkDemoralizeLegal: a DIFFERENT attacker who hasn't tried yet can still Demoralize the same target", () => {
  const freshAttacker = { id: "b", name: "Other Goon", currentHP: 25, demoralizedTargets: [] };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkDemoralizeLegal({ attacker: freshAttacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

// ---------------------------------------------------------------------------
// checkConditionSaveLegal — design doc §22 (Erabryth's Forced Reflection). Real range/DC values.
// ---------------------------------------------------------------------------

const forcedReflection = { name: "Forced Reflection", saveType: "will", dc: 17, range: 60, actions: 1, traits: ["mental"], outcomes: {} };

test("checkConditionSaveLegal: legal for a real in-range target with enough actions", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 10, row: 0 }, conditionSave: forcedReflection, turnState: openBudget }); // 50ft
  assert.equal(result.legal, true);
});

test("checkConditionSaveLegal: rejects out of range (beyond the real 60ft)", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 14, row: 0 }, conditionSave: forcedReflection, turnState: openBudget }); // 70ft
  assert.equal(result.legal, false);
});

test("checkConditionSaveLegal: respects Line of Effect, same as every other targeted action", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 1, row: 0 }, conditionSave: forcedReflection, turnState: openBudget, walls: wall });
  assert.equal(result.legal, false);
  assert.match(result.reason, /line of effect/i);
});

test("checkConditionSaveLegal: rejects a target already immune to this SAME ability this encounter (the real 'the target is then temporarily immune... for 1 day' text, functionally 'never again' within a combat this short)", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10, conditionSaveImmunities: ["Forced Reflection"] };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, conditionSave: forcedReflection, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /already immune/);
});

test("checkConditionSaveLegal: the immunity gate is keyed PER-ABILITY, not just per-target — a different conditionSave against the same target is unaffected", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10, conditionSaveImmunities: ["Some Other Ability"] };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, conditionSave: forcedReflection, turnState: openBudget });
  assert.equal(result.legal, true);
});

// REGRESSION (design doc §34 — a direct user report of a real, if latent, bug: this whole gate
// used to live on the ATTACKER, matching Demoralize's shape — but Forced Reflection's real text
// makes the TARGET immune, not just to one attacker. Only matters once a second
// Forced-Reflection-capable creature exists, which is exactly why this needs its own explicit test
// rather than trusting the two tests above (a single-attacker roster can't tell the two shapes
// apart) — proven here with two DIFFERENT attackers.
test("checkConditionSaveLegal: immunity is TARGET-side, not attacker-side — a DIFFERENT attacker is also blocked once the target has already saved against this ability once this encounter", () => {
  const secondAttacker = { id: "b", name: "A Second Forced-Reflection Creature", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10, conditionSaveImmunities: ["Forced Reflection"] };
  const result = checkConditionSaveLegal({ attacker: secondAttacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, conditionSave: forcedReflection, turnState: openBudget });
  assert.equal(result.legal, false, "Player Core: 'the target is then temporarily immune to Forced Reflection' — immune to the ABILITY, not just to whichever creature tried it first");
});

test("checkConditionSaveLegal: rejects when the action budget doesn't allow it", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, conditionSave: forcedReflection, turnState: { actionsAvailable: 3, actionsUsed: 3 } });
  assert.equal(result.legal, false);
});

// GH #56/#69: conditionSave was the one sibling action type with no usesRemaining gate at all —
// every other ability type above already has this exact test (checkStrikeLegal line 264,
// checkSpellAttackLegal line 389, checkHealAbilityLegal line 445, checkSaveAttackLegal line 509).
test("checkConditionSaveLegal: a spent limited-use conditionSave (usesRemaining 0) is rejected, same mechanism as every sibling ability type", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, conditionSave: { ...forcedReflection, usesRemaining: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of uses/);
});

test("checkConditionSaveLegal: a conditionSave with no usesRemaining field at all is unlimited — omission means unlimited, matching every sibling ability type", () => {
  const attacker = { id: "a", name: "Erabryth", currentHP: 20 };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkConditionSaveLegal({ attacker, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, conditionSave: forcedReflection, turnState: openBudget });
  assert.equal(result.legal, true);
});

// ---------------------------------------------------------------------------
// checkAreaAttackLegal — design doc §38 (a thrown grenade's real burst). Real Tough/Frag Grenade
// numbers: DC 17 (10 + her real attack-row bonus of 7), 70ft throw range, 5ft burst radius.
// ---------------------------------------------------------------------------

const fragGrenade = { name: "Frag Grenade (Commercial)", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, traits: ["consumable", "grenade", "tech"], damage: [{ dice: "1d8", bonus: 0, damageType: "piercing" }] };

test("checkAreaAttackLegal: legal for a real in-range aim point with something caught in the blast", () => {
  const attacker = { id: "a", name: "Tough", currentHP: 24 };
  const result = checkAreaAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, originPos: { col: 10, row: 0 }, areaAttack: fragGrenade, turnState: openBudget, affectedCount: 1 }); // 50ft
  assert.equal(result.legal, true);
});

test("checkAreaAttackLegal: rejects out of range (beyond the grenade's real 70ft)", () => {
  const attacker = { id: "a", name: "Tough", currentHP: 24 };
  const result = checkAreaAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, originPos: { col: 20, row: 0 }, areaAttack: fragGrenade, turnState: openBudget, affectedCount: 1 }); // 100ft
  assert.equal(result.legal, false);
});

test("checkAreaAttackLegal: respects Line of Effect to the aim point, same as every other targeted action", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const attacker = { id: "a", name: "Tough", currentHP: 24 };
  const result = checkAreaAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, originPos: { col: 5, row: 0 }, areaAttack: fragGrenade, turnState: openBudget, walls: wall, affectedCount: 1 });
  assert.equal(result.legal, false);
  assert.match(result.reason, /line of effect/i);
});

test("checkAreaAttackLegal: a depleted areaAttack (usesRemaining 0) is rejected — a real grenade is single-use", () => {
  const attacker = { id: "a", name: "Tough", currentHP: 24 };
  const result = checkAreaAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, originPos: { col: 0, row: 0 }, areaAttack: { ...fragGrenade, usesRemaining: 0 }, turnState: openBudget, affectedCount: 1 });
  assert.equal(result.legal, false);
  assert.match(result.reason, /out of uses/);
});

test("checkAreaAttackLegal: rejects an aim point with nothing in the blast radius — not worth throwing a real grenade at empty ground", () => {
  const attacker = { id: "a", name: "Tough", currentHP: 24 };
  const result = checkAreaAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, originPos: { col: 5, row: 0 }, areaAttack: fragGrenade, turnState: openBudget, affectedCount: 0 });
  assert.equal(result.legal, false);
  assert.match(result.reason, /empty ground/);
});

test("checkAreaAttackLegal: rejects when the action budget doesn't allow it", () => {
  const attacker = { id: "a", name: "Tough", currentHP: 24 };
  const result = checkAreaAttackLegal({ attacker, attackerPos: { col: 0, row: 0 }, originPos: { col: 0, row: 0 }, areaAttack: fragGrenade, turnState: { actionsAvailable: 3, actionsUsed: 3 }, affectedCount: 1 });
  assert.equal(result.legal, false);
});

// ---------------------------------------------------------------------------
// checkTripLegal / checkShoveLegal / checkGrappleLegal / checkEscapeLegal — Athletics maneuvers
// (design doc §31's rules-gap sweep, priority 1). Real Player Core pg. 193 rules
// (reference/srd/player-core/skill-3-athletics.json), mirrored verbatim.
// ---------------------------------------------------------------------------

const grappler = { id: "a", name: "Grappler", currentHP: 15, athleticsModifier: 5 };
const foe = { id: "t", name: "Foe", currentHP: 10, saves: { fort: 4, ref: 4, will: 4 } };

test("checkTripLegal: legal against an adjacent target with enough actions", () => {
  const result = checkTripLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkTripLegal: rejects a target beyond melee reach (default reach is one 5ft square, no melee weapon needed — bare hands are enough to Trip)", () => {
  const result = checkTripLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 5, row: 0 }, turnState: openBudget }); // 25ft
  assert.equal(result.legal, false);
  assert.match(result.reason, /melee reach/);
});

test("checkTripLegal: a real reach-10 melee weapon extends the maneuver's own reach, same as a Strike", () => {
  const reachAttacker = { ...grappler, strikes: [{ name: "Polearm", strikeType: "melee", traits: ["reach-10"] }] };
  const result = checkTripLegal({ attacker: reachAttacker, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 2, row: 0 }, turnState: openBudget }); // 10ft
  assert.equal(result.legal, true);
});

test("checkTripLegal: rejects a target more than one size category larger than the (default Medium) attacker", () => {
  const huge = { ...foe, size: "huge" }; // medium vs huge: 2 categories apart
  const result = checkTripLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: huge, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /too large/);
});

test("checkTripLegal: allows a target exactly one size category larger — the real boundary is 'no MORE than one'", () => {
  const large = { ...foe, size: "large" }; // medium vs large: exactly 1 category apart
  const result = checkTripLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: large, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkTripLegal: respects Line of Effect, same as every other targeted action", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const result = checkTripLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget, walls: wall });
  assert.equal(result.legal, false);
  assert.match(result.reason, /line of effect/i);
});

test("checkTripLegal: rejects when the actor is at 0 HP", () => {
  const downed = { ...grappler, currentHP: 0 };
  const result = checkTripLegal({ attacker: downed, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkTripLegal: rejects when the action budget doesn't allow it", () => {
  const result = checkTripLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: { actionsAvailable: 3, actionsUsed: 3 } });
  assert.equal(result.legal, false);
});

test("checkTripLegal: a restrained attacker can't attempt it — Trip carries the Attack trait (skill-3-athletics.json)", () => {
  const restrained = { ...grappler, grappledBy: { attackerId: "someone-else", state: "restrained", expiresEndOfRound: 5 } };
  const result = checkTripLegal({ attacker: restrained, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /restrained/);
});

test("checkTripLegal: a GRABBED (not restrained) attacker can still attempt it — only Restrained blocks attack actions (condition-20-grabbed.json has no such restriction)", () => {
  const grabbed = { ...grappler, grappledBy: { attackerId: "someone-else", state: "grabbed", expiresEndOfRound: 5 } };
  const result = checkTripLegal({ attacker: grabbed, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

// --- checkShoveLegal: same legality shape as Trip, verified independently rather than assumed ---

test("checkShoveLegal: legal against an adjacent target with enough actions", () => {
  const result = checkShoveLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkShoveLegal: rejects a target beyond melee reach", () => {
  const result = checkShoveLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 5, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkShoveLegal: rejects a target more than one size category larger", () => {
  const gargantuan = { ...foe, size: "gargantuan" };
  const result = checkShoveLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: gargantuan, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkShoveLegal: respects Line of Effect", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const result = checkShoveLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget, walls: wall });
  assert.equal(result.legal, false);
});

test("checkShoveLegal: a restrained attacker can't attempt it", () => {
  const restrained = { ...grappler, grappledBy: { attackerId: "someone-else", state: "restrained", expiresEndOfRound: 5 } };
  const result = checkShoveLegal({ attacker: restrained, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

// --- checkGrappleLegal: same legality shape again ---

test("checkGrappleLegal: legal against an adjacent target with enough actions", () => {
  const result = checkGrappleLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkGrappleLegal: rejects a target beyond melee reach", () => {
  const result = checkGrappleLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 5, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkGrappleLegal: rejects a target more than one size category larger", () => {
  const huge = { ...foe, size: "huge" };
  const result = checkGrappleLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: huge, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkGrappleLegal: respects Line of Effect", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const result = checkGrappleLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget, walls: wall });
  assert.equal(result.legal, false);
});

test("checkGrappleLegal: rejects when the action budget doesn't allow it", () => {
  const result = checkGrappleLegal({ attacker: grappler, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: { actionsAvailable: 3, actionsUsed: 3 } });
  assert.equal(result.legal, false);
});

test("checkGrappleLegal: a restrained attacker can't attempt it", () => {
  const restrained = { ...grappler, grappledBy: { attackerId: "someone-else", state: "restrained", expiresEndOfRound: 5 } };
  const result = checkGrappleLegal({ attacker: restrained, attackerPos: { col: 0, row: 0 }, target: foe, targetPos: { col: 1, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, false);
});

// --- checkEscapeLegal (Athletics, Player Core pg. 193 — the held creature's own action) ---

test("checkEscapeLegal: legal for a combatant currently grabbed/restrained", () => {
  const held = { id: "held", name: "Held", currentHP: 10, grappledBy: { attackerId: "a", state: "grabbed", expiresEndOfRound: 5 } };
  const result = checkEscapeLegal({ actor: held, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkEscapeLegal: rejects a combatant who isn't held at all — nothing to Escape", () => {
  const free = { id: "free", name: "Free", currentHP: 10 };
  const result = checkEscapeLegal({ actor: free, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /nothing to Escape/);
});

test("checkEscapeLegal: rejects when the actor is at 0 HP", () => {
  const downed = { id: "held", name: "Held", currentHP: 0, grappledBy: { attackerId: "a", state: "grabbed", expiresEndOfRound: 5 } };
  const result = checkEscapeLegal({ actor: downed, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkEscapeLegal: rejects when the action budget doesn't allow it", () => {
  const held = { id: "held", name: "Held", currentHP: 10, grappledBy: { attackerId: "a", state: "grabbed", expiresEndOfRound: 5 } };
  const result = checkEscapeLegal({ actor: held, turnState: { actionsAvailable: 3, actionsUsed: 3 } });
  assert.equal(result.legal, false);
});

// --- Restrained blocks attack-ROLL actions too, not just the new maneuvers themselves — proven
// against the PRE-EXISTING checkStrikeLegal/checkSpellAttackLegal, and that Demoralize (no Attack
// trait) is correctly UNAFFECTED (design doc §31) ---

test("checkStrikeLegal: a restrained attacker can't Strike — Restrained's own real text ('can't use any attack ... actions')", () => {
  const restrained = { name: "Restrained Attacker", currentHP: 15, grappledBy: { attackerId: "someone-else", state: "restrained", expiresEndOfRound: 5 } };
  const result = checkStrikeLegal({
    attacker: restrained, attackerPos: { col: 0, row: 0 }, target: { name: "Target", currentHP: 10 }, targetPos: { col: 1, row: 0 },
    strike: pistol, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /restrained/);
});

test("checkSpellAttackLegal: a restrained caster can't cast an attack-roll spell either", () => {
  const restrained = { ...aliveCaster, grappledBy: { attackerId: "someone-else", state: "restrained", expiresEndOfRound: 5 } };
  const target = { id: "t", name: "Target", currentHP: 8 };
  const result = checkSpellAttackLegal({
    caster: restrained, casterPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 },
    spell: eldritchLance, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /restrained/);
});

test("checkDemoralizeLegal: a restrained attacker CAN still Demoralize — Demoralize carries no Attack trait (skill-8-intimidation.json), Player Core's own exception", () => {
  const restrained = { id: "a", name: "Goon", currentHP: 25, grappledBy: { attackerId: "someone-else", state: "restrained", expiresEndOfRound: 5 } };
  const target = { id: "t", name: "Target", currentHP: 10 };
  const result = checkDemoralizeLegal({ attacker: restrained, attackerPos: { col: 0, row: 0 }, target, targetPos: { col: 0, row: 0 }, turnState: openBudget });
  assert.equal(result.legal, true);
});

// --- Immobilized (granted by Grabbed/Restrained) blocks Move/Step — condition-24-immobilized.json:
// "can't use any actions that have the move trait." ---

test("checkMoveLegality: a grabbed/restrained (immobilized) combatant can't Stride", () => {
  const held = { id: "a", grappledBy: { attackerId: "x", state: "grabbed", expiresEndOfRound: 5 } };
  const result = checkMoveLegality({
    combatant: held, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /[Ii]mmobilized/);
});

test("checkStepLegality: an immobilized combatant can't Step either — Step delegates to checkMoveLegality for this exact check", () => {
  const held = { id: "a", grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 5 } };
  const result = checkStepLegality({
    combatant: held, from: { col: 5, row: 5 }, to: { col: 6, row: 5 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /[Ii]mmobilized/);
});

test("checkMoveLegality: an ordinary (non-held) combatant is completely unaffected by the new immobilize gate", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

// ---------------------------------------------------------------------------
// Prone blocks Stride/Step, and Stand/Crawl — the only two real exceptions (design doc §41, Stage 0
// — condition-32-prone.json: "The only move actions you can use while prone are Crawl and Stand.")
// ---------------------------------------------------------------------------

test("checkMoveLegality: a prone combatant can't Stride", () => {
  const result = checkMoveLegality({
    combatant: { id: "a", prone: true }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /[Pp]rone/);
});

test("checkStepLegality: a prone combatant can't Step either — delegates to checkMoveLegality for this exact check", () => {
  const result = checkStepLegality({
    combatant: { id: "a", prone: true }, from: { col: 5, row: 5 }, to: { col: 6, row: 5 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /[Pp]rone/);
});

test("checkMoveLegality: allowWhileProne:true bypasses the prone gate — the real exception Crawl's own wrapper uses, not a general escape hatch", () => {
  const result = checkMoveLegality({
    combatant: { id: "a", prone: true }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget, allowWhileProne: true
  });
  assert.equal(result.legal, true);
});

test("checkMoveLegality: a NON-prone combatant is completely unaffected by the new prone gate", () => {
  const result = checkMoveLegality({
    combatant: { id: "a", prone: false }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

// --- checkStandLegal (Player Core pg. 410) ---

test("checkStandLegal: legal for a prone combatant with enough actions", () => {
  const result = checkStandLegal({ actor: { name: "a", currentHP: 10, prone: true }, turnState: openBudget });
  assert.equal(result.legal, true);
});

test("checkStandLegal: rejects a combatant who isn't prone at all — nothing to Stand from", () => {
  const result = checkStandLegal({ actor: { name: "a", currentHP: 10, prone: false }, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /nothing to Stand/);
});

test("checkStandLegal: rejects when the actor is at 0 HP", () => {
  const result = checkStandLegal({ actor: { name: "a", currentHP: 0, prone: true }, turnState: openBudget });
  assert.equal(result.legal, false);
});

test("checkStandLegal: rejects when the action budget doesn't allow it", () => {
  const result = checkStandLegal({ actor: { name: "a", currentHP: 10, prone: true }, turnState: { actionsAvailable: 3, actionsUsed: 3 } });
  assert.equal(result.legal, false);
});

test("checkStandLegal: rejects a prone combatant who is ALSO immobilized — a real, intended interaction (Stand carries the move trait too), not a special case", () => {
  const held = { name: "a", currentHP: 10, prone: true, grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 5 } };
  const result = checkStandLegal({ actor: held, turnState: openBudget });
  assert.equal(result.legal, false);
  assert.match(result.reason, /immobilized/);
});

// --- checkCrawlLegal (Player Core pg. 408) ---

test("checkCrawlLegal: legal for a prone combatant, Speed >= 10ft, moving exactly one square", () => {
  const result = checkCrawlLegal({
    combatant: { id: "a", prone: true }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, true);
});

test("checkCrawlLegal: rejects a combatant who isn't prone", () => {
  const result = checkCrawlLegal({
    combatant: { id: "a", prone: false }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /Not prone/);
});

test("checkCrawlLegal: rejects when effective Speed is below the real 10ft requirement", () => {
  const result = checkCrawlLegal({
    combatant: { id: "a", prone: true }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 5, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /at least 10ft/);
});

test("checkCrawlLegal: rejects moving more than one square (the real 'move 5 feet' cap)", () => {
  const result = checkCrawlLegal({
    combatant: { id: "a", prone: true }, from: { col: 0, row: 0 }, to: { col: 2, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /exactly one square/);
});

test("checkCrawlLegal: still respects walls/occupancy via its checkMoveLegality delegation", () => {
  const wall = [{ c: [1, 0, 1, 1], move: 20, sight: 20 }];
  const result = checkCrawlLegal({
    combatant: { id: "a", prone: true }, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget, walls: wall
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /blocked by a wall/);
});

test("checkCrawlLegal: rejects a prone combatant who is ALSO immobilized — inherited from checkMoveLegality's own immobilize gate", () => {
  const held = { id: "a", prone: true, grappledBy: { attackerId: "x", state: "grabbed", expiresEndOfRound: 5 } };
  const result = checkCrawlLegal({
    combatant: held, from: { col: 0, row: 0 }, to: { col: 1, row: 0 },
    effectiveSpeed: 25, allPositions: [], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /[Ii]mmobilized/);
});
