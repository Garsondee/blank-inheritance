/**
 * Tests for personnel-engine/search/mcts.mjs — plain UCT MCTS, step 2 of GH issue #6's own build
 * order (design doc §62). Real concerns:
 * (1) CONVERGENCE — the primary claim step 2 makes: with enough iterations, the robust child matches
 *     the Phase-A exactness oracle's own exact answer AND value, on the same depth-capped horizon;
 * (2) agreement with decide() on a real design doc §52 puzzle, independently, same as the oracle;
 * (3) terminal detection short-circuits correctly;
 * (4) the robust child is chosen by real visit count, not merely a raw (possibly under-sampled) mean;
 * (5) the iteration budget is real and respected;
 * (6) registered in the policy registry under a clearly WIP name — `mcts-v1` itself is now real
 *     (design doc §70, the complete PUCT-based system), but this file's own `mcts-uct-v1` is plain
 *     UCT, deliberately NOT that name and deliberately untouched by everything built on top of PUCT.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { search } from "../../tools/battle-simulator/personnel-engine/search/mcts.mjs";
import { solve } from "../../tools/battle-simulator/personnel-engine/search/expectiminimax.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-uct.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

function makeTrapState() {
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

// --- 1: convergence to the Phase-A oracle ---

test("CONVERGENCE: at maxDepth=1, matches the oracle's own depth=1 pick AND exact value on the real trap scenario (design doc §60/§61)", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const oracle = solve({ state: makeTrapState(), combatantId: "me", turn, depth: 1 });
  const mcts = search({ state: makeTrapState(), combatantId: "me", turn, iterations: 300, maxDepth: 1 });
  assert.deepEqual(mcts.bestProposal.to, oracle.bestProposal.to, `expected MCTS to converge to the oracle's own pick ${JSON.stringify(oracle.bestProposal.to)}, got ${JSON.stringify(mcts.bestProposal.to)}`);
  assert.ok(Math.abs(mcts.meanValue - oracle.value) < 1e-9, `expected MCTS's own mean value (${mcts.meanValue}) to exactly match the oracle's (${oracle.value}) once a tiny, fully-explored tree converges`);
});

test("CONVERGENCE: at maxDepth=2, matches the oracle's own depth=2 pick AND exact value — the real flip to retreating, found independently by BOTH search methods", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const oracle = solve({ state: makeTrapState(), combatantId: "me", turn, depth: 2 });
  const mcts = search({ state: makeTrapState(), combatantId: "me", turn, iterations: 500, maxDepth: 2 });
  assert.equal(mcts.bestProposal.to.col, 9, "expected MCTS to independently find the real retreat, same as the oracle and lookahead-v1 before it");
  assert.deepEqual(mcts.bestProposal.to, oracle.bestProposal.to);
  assert.ok(Math.abs(mcts.meanValue - oracle.value) < 1e-9, `expected exact value agreement: MCTS ${mcts.meanValue} vs. oracle ${oracle.value}`);
});

test("CONVERGENCE: a hand-computable 1-ply strike choice — MCTS picks the real higher-gain strike, matching the oracle exactly", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [
      { name: "BigSword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] },
      { name: "SmallDagger", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "1d4", bonus: 1, damageType: "piercing" }] }
    ],
    position: { col: 5, row: 5 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  function makeState() {
    return {
      round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
      combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
      positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
    };
  }
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const oracle = solve({ state: makeState(), combatantId: "me", turn, depth: 1 });
  const mcts = search({ state: makeState(), combatantId: "me", turn, iterations: 200, maxDepth: 1 });
  assert.equal(mcts.bestProposal.strikeIndex, 0, "expected BigSword, the real higher-expected-damage strike");
  assert.equal(mcts.bestProposal.strikeIndex, oracle.bestProposal.strikeIndex);
});

// --- 2: agreement with decide() on a real §52 puzzle ---

test("agrees with decide() on design doc §52's own 'heal the critical ally' puzzle — a THIRD independently-built decision procedure reaching the same real conclusion", () => {
  const me = { ...loadFixture("lunar-17.json"), id: "me", side: "party", position: { col: 5, row: 5 } };
  const ally = { ...loadFixture("security-goon.json"), id: "ally", side: "party", currentHP: 3, position: { col: 5, row: 4 } };
  const enemy = { ...loadFixture("security-goon.json"), id: "enemy", side: "opposition", position: { col: 8, row: 5 } };
  const state = {
    seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], round: 1, initiativeOrder: ["me", "ally", "enemy"],
    combatants: new Map([["me", me], ["ally", ally], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["ally", ally.position], ["enemy", enemy.position]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const decideChoice = decide(state, "me", { combatantId: "me", actionsAvailable: 1, actionsUsed: 0, effective: { speed: me.speed, ac: me.ac }, decisionIndex: 0 });
  const mctsResult = search({ state, combatantId: "me", turn, iterations: 200, maxDepth: 1 });
  assert.equal(decideChoice.type, "healAbility");
  assert.equal(mctsResult.bestProposal.type, "healAbility", `expected MCTS to independently reach the same real conclusion — got ${JSON.stringify(mctsResult.bestProposal)}`);
  assert.equal(mctsResult.bestProposal.targetId, "ally");
});

// --- 3: terminal detection ---

test("search(): an already-terminal state returns immediately with the real WIN value and no real proposal", () => {
  const me = { id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [], position: { col: 0, row: 0 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 0, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const result = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 3 });
  assert.equal(result.bestProposal, null);
  assert.ok(result.meanValue > 1000, `expected a real WIN sentinel, got ${result.meanValue}`);
  assert.equal(result.iterations, 0, "a terminal root needs zero real search iterations");
});

// --- 4: robust child (visit count), and a real, respected iteration budget ---

test("search(): the returned visits/iterations are real numbers reflecting genuine search effort, and the iteration budget is respected (never exceeds what was requested)", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "slashing" }] }], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const result = search({ state, combatantId: "me", turn, iterations: 37, maxDepth: 2 });
  assert.equal(result.iterations, 37, "expected exactly the requested iteration budget to be spent (nothing terminated it early)");
  assert.ok(result.visits > 0 && result.visits <= 37, `expected the chosen child's own visit count to be real and bounded by the total budget, got ${result.visits}`);
});

// --- 5: registered as a policy under a clearly WIP (not "mcts-v1") name ---

test("mcts-uct-v1: registered in the policy registry (deliberately NOT named mcts-v1 — mcts-v1 is now real, §70, but built on PUCT, not this plain-UCT file, which stays untouched), returns a real, legal action", () => {
  assert.ok(listPolicyIds().includes("mcts-uct-v1"));
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("mcts-uct-v1", PERSONNEL_ADAPTER, state, "me", turn, { iterations: 100, maxDepth: 2 });
  assert.ok(decision, "expected a real decision through the registry");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});
