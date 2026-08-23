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
  multipleAttackPenalty,
  rangeIncrementPenalty
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

test("checkMoveLegality: rejects a move whose straight-line PATH passes through an occupied square, not just the destination", () => {
  const result = checkMoveLegality({
    combatant: { id: "a" }, from: { col: 0, row: 0 }, to: { col: 8, row: 0 }, // 40ft, straight line
    effectiveSpeed: 999, allPositions: [{ combatantId: "blocker", pos: { col: 4, row: 0 } }], gridSize, turnState: openBudget
  });
  assert.equal(result.legal, false);
  assert.match(result.reason, /passes through an occupied square/);
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

// ---------------------------------------------------------------------------
// checkSaveAttackLegal / checkDemoralizeLegal — the skill-actions-in-combat expansion
// (design doc §19). The grenade's real range (70ft) is Lunar-17's own real extracted number.
// ---------------------------------------------------------------------------

const grenade = { name: "Incendiary Grenade (Commercial)", saveType: "reflex", dc: 17, range: 70, actions: 1, traits: ["consumable", "fire"], damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }] };

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
