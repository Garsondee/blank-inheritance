/**
 * Tests for the utility-AI orchestrator (design doc §14h) — the "given
 * every real candidate and this combatant's weight profile, pick the
 * best one" mechanism itself. candidates.mjs and profiles.mjs each have
 * their own direct tests; this file's job is the SELECTION logic and,
 * specifically, proving the framework's central claim: the exact same
 * situation (same candidates available) is resolved differently purely
 * because of which weight profile is attached to the combatant — that's
 * what "one shared system for either the enemies goals or the players"
 * (Ingram, 2026-08-22) actually means in code, not just in prose.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { utilityAI } from "../../tools/battle-simulator/ai/utility-ai.mjs";

function makeCombatantState(combatants) {
  return {
    gridSize: { cols: 44, rows: 44 },
    combatants: new Map(combatants.map((c) => [c.id, c])),
    positions: new Map(combatants.map((c) => [c.id, c.position]))
  };
}

const TURN_START = { actionsAvailable: 3, actionsUsed: 0, strikesAttempted: 0, feetMoved: 0, effective: { speed: 1500 } };
const SIDEARM = { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 20, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] };

test("utilityAI: returns null once the action budget for the turn is exhausted, before even generating candidates", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, target]);
  assert.equal(utilityAI(state, "a", { ...TURN_START, actionsUsed: 3 }), null);
});

test("utilityAI: returns null when no live opposition exists at all (no candidates to generate)", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const state = makeCombatantState([attacker]);
  assert.equal(utilityAI(state, "a", TURN_START), null);
});

test("utilityAI: returns null rather than a 0-value action (e.g. a Strike against an immune target with no better option available)", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const immuneTarget = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", immuneToAllDamage: true, position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, immuneTarget]);
  assert.equal(utilityAI(state, "a", TURN_START), null, "a doomed 0-expected-value strike, already in range with nowhere useful to move, should be held rather than proposed");
});

test("utilityAI: the returned proposal strips internal weightKey/value bookkeeping but keeps type/targetId/reason/score", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, target]);
  const proposal = utilityAI(state, "a", TURN_START);
  assert.equal(proposal.type, "strike");
  assert.equal(proposal.targetId, "t");
  assert.equal(typeof proposal.reason, "string");
  assert.equal(typeof proposal.score, "number");
  assert.equal(proposal.weightKey, undefined);
  assert.equal(proposal.value, undefined);
});

test("CENTRAL CLAIM: the identical situation (a spotter with a strike option AND an ally worth spotting for) resolves to Spot under the SPOTTER profile and to Strike under the ATTACKER profile — same candidate generation, different weights, different real decision", () => {
  const opponent = { id: "o", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, size: "huge", position: { col: 2, row: 0 } };
  const ally = { id: "ally", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], spotted: false, position: { col: 1, row: 1 } };

  const asVesper = { id: "vesper", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const spotterState = makeCombatantState([asVesper, ally, { ...opponent }]);
  const spotterChoice = utilityAI(spotterState, "vesper", TURN_START);
  assert.equal(spotterChoice.type, "spot", `expected the SPOTTER profile (id 'vesper') to prefer Spot, got ${JSON.stringify(spotterChoice)}`);

  const asAttacker = { id: "kingfisher", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const attackerState = makeCombatantState([asAttacker, { ...ally, spotted: false }, { ...opponent }]);
  const attackerChoice = utilityAI(attackerState, "kingfisher", TURN_START);
  assert.equal(attackerChoice.type, "strike", `expected the ATTACKER profile (id 'kingfisher') to prefer its own Strike, got ${JSON.stringify(attackerChoice)}`);
});

test("CENTRAL CLAIM: an EVACUATOR-profiled combatant prefers Evacuate over an available Strike even against an in-range, non-immune target — the same candidate set a normal attacker would fight with", () => {
  // 400ft away (8 squares, orthogonal): far enough to be clear of the opposition for
  // checkEvacuateLegal's 300ft rule, but still inside the sidearm's 600ft (6th-increment) hard
  // cap, so a real, legal, positive-value Strike candidate exists too — the point is EVACUATOR's
  // zero damage weight, not the absence of an alternative.
  const opponent = { id: "o", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, size: "huge", position: { col: 8, row: 0 } };
  const evacuator = { id: "runabout", side: "party", currentHP: 100, maxHP: 100, ac: 25, canEvacuate: true, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const state = makeCombatantState([evacuator, opponent]);
  const choice = utilityAI(state, "runabout", TURN_START);
  assert.equal(choice.type, "evacuate", `expected the EVACUATOR profile to prefer Evacuate over its own Strike, got ${JSON.stringify(choice)}`);
});
