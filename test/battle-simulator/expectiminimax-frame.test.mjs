/**
 * End-to-end tests for the Frame-scale port of the exactness oracle, chance-node expansion, and trap
 * insurance (design doc §75, GH issue #20) — the third and final slice of the MCTS search family's
 * dual-scale port, closing out issue #20. Minimal, hand-built synthetic fixtures throughout, matching
 * this project's own established style.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { solve, evaluateProposal } from "../../tools/battle-simulator/personnel-engine/search/expectiminimax.mjs";
import { applyTrapInsurance } from "../../tools/battle-simulator/personnel-engine/search/trap-insurance.mjs";
import { search } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { FRAME_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/frame-adapter.mjs";
import { DEFAULT_WEIGHTS as PERSONNEL_DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import "../../tools/battle-simulator/ai-common/policies/exactness-oracle.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct-insured.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-v1.mjs";

/** A small, fast, 2-combatant Frame skirmish — `me` capped to exactly 1 action so an exhaustive
 * oracle search at depth 2 stays cheap. */
function makeFrameOracleSkirmish() {
  const me = {
    id: "me", name: "Me", side: "party", size: "huge", currentHP: 100, maxHP: 100,
    ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", size: "huge", currentHP: 100, maxHP: 100, speed: 0,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 5, gridSize: { cols: 6, rows: 6 },
    initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  return { state, turn };
}

/** Same CRITICAL-band `me` (1-action cap) + `stunnedRounds` `enemy` fixture shape proven out in
 * `mcts-puct-frame.test.mjs` — reused here to prove the oracle ALSO composes correctly with Frame's
 * own stunnedRounds skip-and-decrement and conditions-threading, not just MCTS. */
function makeFrameCriticalWithStunnedEnemy() {
  const me = {
    id: "me", name: "Me", side: "party", kind: "frame", size: "huge",
    currentHP: 30, maxHP: 100, // CRITICAL band
    ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", kind: "claimant", size: "huge",
    currentHP: 100, maxHP: 100, stunnedRounds: 1, speed: 0,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 7, gridSize: { cols: 6, rows: 6 },
    initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  return { state, turn };
}

/** A Frame opposition that's immuneToAllDamage with no real scenario context — design doc §75's own
 * Decision 4 regression: this must NOT be treated as an instant stalemate terminal. */
function makeImmuneOppositionSkirmish() {
  const me = {
    id: "me", name: "Me", side: "party", size: "huge", currentHP: 100, maxHP: 100,
    ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const shielded = {
    id: "shielded", name: "Shielded", side: "opposition", size: "huge", currentHP: 100, maxHP: 100,
    immuneToAllDamage: true, speed: 0, strikes: [], position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 9, gridSize: { cols: 6, rows: 6 },
    initiativeOrder: ["me", "shielded"],
    combatants: new Map([["me", me], ["shielded", shielded]]),
    positions: new Map([["me", { ...me.position }], ["shielded", { ...shielded.position }]]),
    reactionAvailable: new Map([["me", true], ["shielded", true]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  return { state, turn };
}

test("solve(): runs against FRAME_ADAPTER at a small depth, producing a real, legal decision and an exact value", () => {
  const { state, turn } = makeFrameOracleSkirmish();
  const result = solve({ state, combatantId: "me", turn, depth: 2, adapter: FRAME_ADAPTER });
  assert.ok(result.bestProposal, "expected a real bestProposal, not null");
  assert.equal(typeof result.value, "number");
  assert.ok(Number.isFinite(result.value));
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", result.bestProposal).legal, true);
});

test("evaluateProposal (Frame): a real strike proposal explores MULTIPLE real chance-node branches (up to 4, one per degree), while a deterministic proposal at the same depth would only ever explore one — proving the stochastic branch genuinely engaged, not silently bypassed", () => {
  const { state, turn } = makeFrameOracleSkirmish();
  const actor = { actingId: "me", initiativeIndex: 0, round: 1, turn };
  const strikeProposal = { type: "strike", targetId: "enemy", strikeIndex: 0 };
  const strikeResult = evaluateProposal({
    state, actor, proposal: strikeProposal, weights: FRAME_ADAPTER.DEFAULT_WEIGHTS,
    rootSide: "party", depthRemaining: 1, initiativeOrder: ["me", "enemy"], adapter: FRAME_ADAPTER
  });
  assert.ok(strikeResult, "expected a real, legal strike evaluation");
  assert.ok(strikeResult.nodesExplored > 1, `expected multiple real chance-node branches explored for a stochastic strike (a deterministic proposal at this depth would report exactly 1), got nodesExplored=${strikeResult.nodesExplored}`);
});

test("applyTrapInsurance (Frame): works end-to-end wrapping a real mcts-puct.mjs search result, producing a real, legal decision", () => {
  const { state, turn } = makeFrameOracleSkirmish();
  const mctsResult = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 3, adapter: FRAME_ADAPTER });
  const insured = applyTrapInsurance({ mctsResult, state, combatantId: "me", turn, weights: FRAME_ADAPTER.DEFAULT_WEIGHTS, oracleDepth: 2, topK: 2, adapter: FRAME_ADAPTER });
  assert.ok(insured.bestProposal, "expected a real bestProposal from the insured result");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", insured.bestProposal).legal, true);
});

test("exactness-oracle-v1: registered policy works end-to-end on FRAME_ADAPTER through the real registry", () => {
  assert.ok(listPolicyIds().includes("exactness-oracle-v1"));
  const { state, turn } = makeFrameOracleSkirmish();
  const decision = decideWithPolicy("exactness-oracle-v1", FRAME_ADAPTER, state, "me", turn, { depth: 2 });
  assert.ok(decision, "expected a real decision from exactness-oracle-v1 on Frame-scale");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});

test("mcts-puct-insured-v1: registered policy works end-to-end on FRAME_ADAPTER through the real registry", () => {
  assert.ok(listPolicyIds().includes("mcts-puct-insured-v1"));
  const { state, turn } = makeFrameOracleSkirmish();
  const decision = decideWithPolicy("mcts-puct-insured-v1", FRAME_ADAPTER, state, "me", turn, { iterations: 100, maxDepth: 3, oracleDepth: 2, topK: 2 });
  assert.ok(decision, "expected a real decision from mcts-puct-insured-v1 on Frame-scale");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});

test("mcts-v1: the COMPLETE, tournament-strength policy works end-to-end on FRAME_ADAPTER through the real registry — closing out issue #20's whole MCTS search family", () => {
  assert.ok(listPolicyIds().includes("mcts-v1"));
  const { state, turn } = makeFrameOracleSkirmish();
  const decision = decideWithPolicy("mcts-v1", FRAME_ADAPTER, state, "me", turn, { iterations: 100, maxDepth: 3, oracleDepth: 2, topK: 2 });
  assert.ok(decision, "expected a real decision from mcts-v1 on Frame-scale");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});

test("solve(): adapter supplied with weights omitted uses the ADAPTER's own real DEFAULT_WEIGHTS, never silently falling back to personnel's own", () => {
  const { state, turn } = makeFrameOracleSkirmish();
  const result = solve({ state, combatantId: "me", turn, depth: 0, adapter: FRAME_ADAPTER });
  const realFrameValue = FRAME_ADAPTER.evaluateState(state, "party", FRAME_ADAPTER.DEFAULT_WEIGHTS);
  assert.equal(result.value, realFrameValue, "solve() must have used FRAME_ADAPTER's own real DEFAULT_WEIGHTS when weights was omitted");
  const wouldBeWithPersonnelWeights = FRAME_ADAPTER.evaluateState(state, "party", PERSONNEL_DEFAULT_WEIGHTS);
  assert.ok(Number.isNaN(wouldBeWithPersonnelWeights) || Math.abs(wouldBeWithPersonnelWeights - realFrameValue) > 1e-9, "expected personnel's own DEFAULT_WEIGHTS to be a genuinely unsafe or different substitute on Frame's evaluator");
});

test("solve() (Frame): composes correctly with a CRITICAL-band actor and a stunnedRounds-skipped enemy — real multi-round exploration, not a crash, not a single-node dead end (conditions-threading regression, mirroring mcts-puct-frame.test.mjs's own MCTS-level check)", () => {
  const { state, turn } = makeFrameCriticalWithStunnedEnemy();
  const result = solve({ state, combatantId: "me", turn, depth: 2, adapter: FRAME_ADAPTER });
  assert.ok(result.nodesExplored > 1, `expected real multi-round exploration past the stunned enemy's own skipped turn, got nodesExplored=${result.nodesExplored}`);
  assert.ok(result.bestProposal, "expected a real bestProposal");
});

test("solve()/search() (Frame): an opposition that's immuneToAllDamage (no real scenario context) does NOT get treated as an instant stalemate terminal — the search continues exploring real candidates (design doc §75, Decision 4 regression)", () => {
  const { state, turn } = makeImmuneOppositionSkirmish();
  const oracleResult = solve({ state, combatantId: "me", turn, depth: 2, adapter: FRAME_ADAPTER });
  assert.ok(oracleResult.nodesExplored > 1, `expected real exploration, not an instant false-stalemate terminal (nodesExplored=1 would mean the root itself was wrongly treated as terminal) — got nodesExplored=${oracleResult.nodesExplored}`);
  assert.ok(oracleResult.bestProposal, "expected a real bestProposal, not null from a false terminal");

  const mctsResult = search({ state, combatantId: "me", turn, iterations: 50, maxDepth: 2, adapter: FRAME_ADAPTER });
  assert.ok(mctsResult.root.candidates.length > 0, "expected MCTS (mcts-puct.mjs's own root.candidates shape) to have real candidates too, not an immediately-terminal root");
});
