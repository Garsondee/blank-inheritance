/**
 * Tests for personnel-engine/search/trap-insurance.mjs — root alpha-beta/oracle trap check, half of
 * GH issue #6's own step 6 (design doc §66). THE decisive test the build order itself names: "the
 * §54 trip-pile-on position, with pileOnRisk = 0, chooses not to enter the trap." Real concerns:
 * (1) verified BEFORE building anything: both real MCTS variants (`mcts-uct-v1`, `mcts-puct-v1`)
 *     genuinely, confidently walk into the real trap even at 800 iterations — this isn't a strawman;
 * (2) trap insurance correctly OVERRIDES that wrong pick with the oracle's own real, chance-node-aware
 *     verdict on the real diagnosed roster;
 * (3) on a position where MCTS is ALREADY correct, insurance must NOT spuriously override it — a real
 *     "first, do no harm" check;
 * (4) insurance reports which real candidates it checked and whether it actually overrode anything —
 *     a caller (or a human) can always tell what happened, not just get a silently-different answer;
 * (5) both real MCTS result shapes (`mcts.mjs`'s own `root.children` Map, `mcts-puct.mjs`'s own
 *     `root.candidates` array) are supported identically.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { search as searchPuct } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { search as searchUct } from "../../tools/battle-simulator/personnel-engine/search/mcts.mjs";
import { solve } from "../../tools/battle-simulator/personnel-engine/search/expectiminimax.mjs";
import { applyTrapInsurance } from "../../tools/battle-simulator/personnel-engine/search/trap-insurance.mjs";
import { DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct-insured.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

function makeTripPileOnState() {
  const lunar17 = loadFixture("lunar-17.json");
  const tough = loadFixture("tough.json");
  const xeno = loadFixture("xenowarden-greenhorn.json");
  const me = {
    ...lunar17, id: "me", side: "party", strikes: [], spells: [], healAbilities: [], intimidationModifier: null,
    objective: { col: 12, row: 10 }, position: { col: 10, row: 10 }
  };
  const enemyA = { ...tough, id: "enemyA", side: "opposition", position: { col: 12, row: 10 } };
  const enemyB = { ...xeno, id: "enemyB", side: "opposition", position: { col: 13, row: 10 } };
  return {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], initiativeOrder: ["me", "enemyA", "enemyB"],
    combatants: new Map([["me", { ...me }], ["enemyA", { ...enemyA }], ["enemyB", { ...enemyB }]]),
    positions: new Map([["me", { ...me.position }], ["enemyA", { ...enemyA.position }], ["enemyB", { ...enemyB.position }]])
  };
}

const TURN = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
const WEIGHTS_NO_PILEONRISK = { ...DEFAULT_WEIGHTS, pileOnRisk: 0 };

// --- 1: confirm the real gap trap insurance exists to patch (not a strawman) ---

test("PRECONDITION, verified directly: both mcts-uct-v1 and mcts-puct-v1 genuinely walk into the real trap at depth 3, even at 800 iterations — the class of blunder issue #6 itself names, not assumed", () => {
  const oracle = solve({ state: makeTripPileOnState(), combatantId: "me", turn: TURN, depth: 3, weights: WEIGHTS_NO_PILEONRISK });
  assert.equal(oracle.bestProposal.to.col, 5, "sanity: the oracle's own real answer must still be retreat");

  const uct = searchUct({ state: makeTripPileOnState(), combatantId: "me", turn: TURN, iterations: 800, maxDepth: 3, weights: WEIGHTS_NO_PILEONRISK });
  const puct = searchPuct({ state: makeTripPileOnState(), combatantId: "me", turn: TURN, iterations: 800, maxDepth: 3, weights: WEIGHTS_NO_PILEONRISK });
  assert.notEqual(uct.bestProposal.to.col, 5, "expected plain UCT to genuinely get this wrong, unaided, at 800 real iterations");
  assert.notEqual(puct.bestProposal.to.col, 5, "expected PUCT to genuinely get this wrong too, unaided, at 800 real iterations");
});

// --- 2: THE decisive test — trap insurance corrects the real mistake ---

test("THE DECISIVE TEST (issue #6 step 6): trap insurance overrides MCTS's own confident wrong pick with the oracle's real verdict — the trip-pile-on position, pileOnRisk=0, now correctly chooses NOT to enter the trap", () => {
  const mctsResult = searchPuct({ state: makeTripPileOnState(), combatantId: "me", turn: TURN, iterations: 200, maxDepth: 3, weights: WEIGHTS_NO_PILEONRISK });
  assert.notEqual(mctsResult.bestProposal.to.col, 5, "sanity: MCTS's own raw pick must still be wrong going in");

  const insured = applyTrapInsurance({ mctsResult, state: makeTripPileOnState(), combatantId: "me", turn: TURN, weights: WEIGHTS_NO_PILEONRISK, oracleDepth: 3, topK: 2 });
  assert.equal(insured.bestProposal.to.col, 5, "expected trap insurance to correct the pick to the real retreat");
  assert.equal(insured.trapInsurance.overridden, true);
  assert.ok(insured.trapInsurance.checked.length >= 2, "expected at least 2 real candidates checked (topK=2)");
  const retreatCheck = insured.trapInsurance.checked.find((c) => c.proposal.to.col === 5);
  assert.ok(retreatCheck, "expected the real retreat candidate to have been one of the ones actually checked");
  assert.ok(retreatCheck.oracleValue > -1000, "expected the retreat candidate's own real oracle value to be a normal, non-catastrophic number");
});

// --- 3: first, do no harm — a position where MCTS is already right ---

function makeTrapWhereMctsIsAlreadyRight() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 30, strikes: [],
    position: { col: 15, row: 15 }, objective: { col: 15, row: 15 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 20, row: 15 }
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 40, rows: 40 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
}

test("trap insurance does NOT spuriously override an already-correct MCTS pick — the §60/§61 trap, where PUCT already converges to the oracle unaided", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const mctsResult = searchPuct({ state: makeTrapWhereMctsIsAlreadyRight(), combatantId: "me", turn, iterations: 300, maxDepth: 2 });
  const oracle = solve({ state: makeTrapWhereMctsIsAlreadyRight(), combatantId: "me", turn, depth: 2 });
  assert.deepEqual(mctsResult.bestProposal.to, oracle.bestProposal.to, "sanity: MCTS must already be right here, unaided");

  const insured = applyTrapInsurance({ mctsResult, state: makeTrapWhereMctsIsAlreadyRight(), combatantId: "me", turn, oracleDepth: 2, topK: 2 });
  assert.deepEqual(insured.bestProposal.to, oracle.bestProposal.to, "expected insurance to leave the already-correct pick alone");
  assert.equal(insured.trapInsurance.overridden, false);
});

// --- 4: reporting ---

test("applyTrapInsurance: with no real root to check (a terminal MCTS result), returns the original result completely unmodified", () => {
  const me = { id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [], position: { col: 0, row: 0 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 0, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const mctsResult = searchPuct({ state, combatantId: "me", turn, iterations: 100, maxDepth: 3 });
  assert.equal(mctsResult.bestProposal, null);
  const insured = applyTrapInsurance({ mctsResult, state, combatantId: "me", turn });
  assert.equal(insured, mctsResult, "expected the exact same object back — no trapInsurance field grafted onto a result with nothing real to check");
});

// --- 5: both real MCTS result shapes supported ---

test("applyTrapInsurance: works identically on plain UCT's own root.children Map shape, not just PUCT's root.candidates array", () => {
  const mctsResult = searchUct({ state: makeTripPileOnState(), combatantId: "me", turn: TURN, iterations: 200, maxDepth: 3, weights: WEIGHTS_NO_PILEONRISK });
  assert.notEqual(mctsResult.bestProposal.to.col, 5, "sanity: plain UCT must still be wrong going in");
  const insured = applyTrapInsurance({ mctsResult, state: makeTripPileOnState(), combatantId: "me", turn: TURN, weights: WEIGHTS_NO_PILEONRISK, oracleDepth: 3, topK: 2 });
  assert.equal(insured.bestProposal.to.col, 5, "expected trap insurance to correct plain UCT's own wrong pick too");
  assert.equal(insured.trapInsurance.overridden, true);
});

// --- 6: registered as a real, usable policy ---

test("mcts-puct-insured-v1: registered in the policy registry, and correctly avoids the real trip-pile-on trap through the registry, matching applyTrapInsurance called directly", () => {
  assert.ok(listPolicyIds().includes("mcts-puct-insured-v1"));
  assert.ok(!listPolicyIds().includes("mcts-v1"), "mcts-v1 must not exist yet");
  const decision = decideWithPolicy("mcts-puct-insured-v1", PERSONNEL_ADAPTER, makeTripPileOnState(), "me", TURN, {
    iterations: 200, maxDepth: 3, weights: WEIGHTS_NO_PILEONRISK, oracleDepth: 3, topK: 2
  });
  assert.ok(decision, "expected a real decision through the registry");
  assert.equal(decision.type, "move");
  assert.equal(decision.to.col, 5, "expected the registered policy to also correctly retreat, not walk into the trap");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeTripPileOnState(), turn: TURN });
  assert.equal(sandbox.apply("me", decision).legal, true);
});
