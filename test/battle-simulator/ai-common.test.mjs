/**
 * Tests for the shared ai-common/ layer (design doc §57 — "Frame scale and 'personnel' scale should
 * be the same system, we only need one AI not two"; GitHub issues #4/#20). Three real concerns:
 * (1) the registry itself — registerPolicy/resolvePolicy/decideWithPolicy/assertValidAdapter behave
 * correctly, including their error cases; (2) BOTH real adapters (personnel, Frame) are genuinely
 * zero-wrapper re-exports of each engine's own real functions, not a reimplementation that could
 * silently drift; (3) the real, load-bearing claim of Stage 0 — that resolving `greedy-v1` against
 * either adapter reproduces THAT engine's own existing, already-tested decide() behavior exactly,
 * proven against personnel-engine's own pinned golden sequence (ai-profiles.test.mjs) and against a
 * real, direct Frame-scale decide() call, not just asserted by reading the wrapper code.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertValidAdapter, registerPolicy, resolvePolicy, listPolicyIds, decideWithPolicy, createBudgetTracker
} from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import { FRAME_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/frame-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/greedy.mjs"; // registers "greedy-v1" as a side effect
import "../../tools/battle-simulator/ai-common/policies/budget-demo.mjs"; // registers "budget-demo-v1" as a side effect

import { runBattle, checkOutcome as personnelCheckOutcome, forkTurnSandbox as personnelForkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide as personnelDecide, decisionRng as personnelDecisionRng, generateProposals as personnelGenerateProposals } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { evaluateState as personnelEvaluateState, DEFAULT_WEIGHTS as PERSONNEL_DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { BASELINE_V1, decideOptionsForProfile } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";

import { decide as frameDecide, decisionRng as frameDecisionRng, generateProposals as frameGenerateProposals } from "../../tools/battle-simulator/ai/decide.mjs";
import { forkTurnSandbox as frameForkTurnSandbox, checkOutcome as frameCheckOutcome } from "../../tools/battle-simulator/engine/engine.mjs";
import { evaluateState as frameEvaluateState, DEFAULT_WEIGHTS as FRAME_DEFAULT_WEIGHTS } from "../../tools/battle-simulator/ai/evaluate/state-value.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

// --- assertValidAdapter ---

test("assertValidAdapter: passes silently on a real, complete adapter", () => {
  assert.doesNotThrow(() => assertValidAdapter(PERSONNEL_ADAPTER));
  assert.doesNotThrow(() => assertValidAdapter(FRAME_ADAPTER));
});

test("assertValidAdapter: throws on a MISSING required field, naming it and the adapter id", () => {
  const broken = { ...PERSONNEL_ADAPTER };
  delete broken.evaluateState;
  assert.throws(() => assertValidAdapter(broken), /id: personnel.*missing real field\(s\) \[evaluateState\]/s);
});

test("assertValidAdapter: reports EVERY missing field in one real error, not just the first found", () => {
  const broken = { id: "bare" };
  assert.throws(() => assertValidAdapter(broken), /feetPerSquare.*decisionRng.*generateProposals.*forkTurnSandbox.*checkOutcome.*evaluateState.*DEFAULT_WEIGHTS.*nativeGreedyDecide/s);
});

// --- registry: registerPolicy / resolvePolicy / listPolicyIds / decideWithPolicy ---

test("registerPolicy: throws on a missing id or a non-function decide", () => {
  assert.throws(() => registerPolicy({ decide() {} }), /needs a real string id/);
  assert.throws(() => registerPolicy({ id: "no-decide-fn" }), /needs a real string id/);
});

test("registerPolicy: throws on a DUPLICATE id — greedy-v1 is already registered by policies/greedy.mjs's own import", () => {
  assert.throws(() => registerPolicy({ id: "greedy-v1", decide() {} }), /"greedy-v1" is already registered/);
});

test("resolvePolicy: throws on an unknown id, listing the real known ids", () => {
  assert.throws(() => resolvePolicy("no-such-policy"), /unknown policy id "no-such-policy".*known: \[.*greedy-v1.*\]/s);
});

test("listPolicyIds: includes the real registered greedy-v1 policy", () => {
  assert.ok(listPolicyIds().includes("greedy-v1"));
});

test("decideWithPolicy: real call-through — a stub policy receives exactly (adapter, state, combatantId, turn, options)", () => {
  let received = null;
  registerPolicy({
    id: "ai-common-test-stub-v1",
    decide(adapter, state, combatantId, turn, options) {
      received = { adapter, state, combatantId, turn, options };
      return { type: "stub-decision" };
    }
  });
  const fakeAdapter = { marker: "fake" };
  const fakeState = { marker: "state" };
  const fakeTurn = { marker: "turn" };
  const fakeOptions = { marker: "options" };
  const result = decideWithPolicy("ai-common-test-stub-v1", fakeAdapter, fakeState, "combatant-x", fakeTurn, fakeOptions);
  assert.deepEqual(result, { type: "stub-decision" });
  assert.equal(received.adapter, fakeAdapter);
  assert.equal(received.state, fakeState);
  assert.equal(received.combatantId, "combatant-x");
  assert.equal(received.turn, fakeTurn);
  assert.equal(received.options, fakeOptions);
});

test("decideWithPolicy: throws the same unknown-id error resolvePolicy does", () => {
  assert.throws(() => decideWithPolicy("no-such-policy", {}, {}, "x", {}, {}), /unknown policy id "no-such-policy"/);
});

// --- both adapters are genuinely zero-wrapper re-exports, not a reimplementation ---

test("PERSONNEL_ADAPTER: every re-exported field is REFERENCE-IDENTICAL to personnel-engine's own real export — proves zero wrapping, not just equal output on one example", () => {
  assert.equal(PERSONNEL_ADAPTER.decisionRng, personnelDecisionRng);
  assert.equal(PERSONNEL_ADAPTER.generateProposals, personnelGenerateProposals);
  assert.equal(PERSONNEL_ADAPTER.forkTurnSandbox, personnelForkTurnSandbox);
  assert.equal(PERSONNEL_ADAPTER.checkOutcome, personnelCheckOutcome);
  assert.equal(PERSONNEL_ADAPTER.evaluateState, personnelEvaluateState);
  assert.equal(PERSONNEL_ADAPTER.DEFAULT_WEIGHTS, PERSONNEL_DEFAULT_WEIGHTS);
  assert.equal(PERSONNEL_ADAPTER.nativeGreedyDecide, personnelDecide);
  assert.equal(PERSONNEL_ADAPTER.feetPerSquare, 5);
});

test("FRAME_ADAPTER: every re-exported field is REFERENCE-IDENTICAL to Frame-scale's own real export", () => {
  assert.equal(FRAME_ADAPTER.decisionRng, frameDecisionRng);
  assert.equal(FRAME_ADAPTER.generateProposals, frameGenerateProposals);
  assert.equal(FRAME_ADAPTER.forkTurnSandbox, frameForkTurnSandbox);
  assert.equal(FRAME_ADAPTER.checkOutcome, frameCheckOutcome);
  assert.equal(FRAME_ADAPTER.evaluateState, frameEvaluateState);
  assert.equal(FRAME_ADAPTER.DEFAULT_WEIGHTS, FRAME_DEFAULT_WEIGHTS);
  assert.equal(FRAME_ADAPTER.nativeGreedyDecide, frameDecide);
  assert.equal(FRAME_ADAPTER.feetPerSquare, 50);
});

test("DEFAULT_WEIGHTS: the two adapters' real key sets genuinely differ — documents/verifies the asymmetry this module's own header claims, rather than assuming it", () => {
  assert.ok("pileOnRisk" in PERSONNEL_ADAPTER.DEFAULT_WEIGHTS);
  assert.ok(!("pileOnRisk" in FRAME_ADAPTER.DEFAULT_WEIGHTS));
  assert.ok("actionDenial" in FRAME_ADAPTER.DEFAULT_WEIGHTS);
  assert.ok(!("actionDenial" in PERSONNEL_ADAPTER.DEFAULT_WEIGHTS));
});

// --- GOLDEN SEQUENCE THROUGH THE REGISTRY (the real "zero behavior change" proof for personnel-scale) ---
//
// Identical scenario/seed to ai-profiles.test.mjs's own pinned golden sequence (BASELINE_V1 vs
// BASELINE_V1, real Lunar-17/Security Goon fixtures, seed 42), but every decision is made by
// decideWithPolicy("greedy-v1", PERSONNEL_ADAPTER, ...) instead of calling decide() directly. If
// this ever diverges from the pinned array below, the registry/adapter layer has introduced a real
// behavior change — not hypothetical, the same array ai-profiles.test.mjs asserts independently.

function makeGoldenScenario(useRegistry) {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  function ai(state, combatantId, turn) {
    const options = decideOptionsForProfile(BASELINE_V1);
    return useRegistry
      ? decideWithPolicy("greedy-v1", PERSONNEL_ADAPTER, state, combatantId, turn, options)
      : personnelDecide(state, combatantId, turn, options);
  }
  return {
    seed: 42, gridSize: { cols: 12, rows: 8 }, roundLimit: 6,
    combatants: [
      { ...lunar17, id: "lunar17", position: { col: 1, row: 4 } },
      { ...goon, id: "goon", position: { col: 10, row: 4 } }
    ],
    ai, walls: []
  };
}

function actionSequence(log) {
  const seq = [];
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    seq.push(`${turn.combatantId}:${action.type}${action.targetId ? "->" + action.targetId : ""}`);
  }
  return seq;
}

// GH #58: re-derived alongside ai-profiles.test.mjs's own identical pinned array — see that file's
// own comment for why (threatReduction added to evaluateState; the goon carries a bit more value to
// keep pressuring once already hurt, so lunar17 now attacks before healing rather than after).
const PINNED_GOLDEN_SEQUENCE = [
  "lunar17:move",
  "lunar17:spellAttack->goon",
  "goon:move",
  "goon:trip->lunar17",
  "goon:strike->lunar17",
  "lunar17:spellAttack->goon",
  "lunar17:healAbility->lunar17",
  "goon:strike->lunar17",
  "goon:move",
  "goon:move"
];

test("GOLDEN SEQUENCE THROUGH THE REGISTRY: greedy-v1 resolved against PERSONNEL_ADAPTER reproduces the exact real pinned sequence from ai-profiles.test.mjs", () => {
  const log = runBattle(makeGoldenScenario(true));
  assert.equal(log.outcome.result, "party-defeat");
  assert.equal(log.rounds.length, 2);
  assert.deepEqual(actionSequence(log), PINNED_GOLDEN_SEQUENCE);
});

test("GOLDEN SEQUENCE THROUGH THE REGISTRY: matches a direct decide() run of the IDENTICAL scenario, action for action — the registry adds no behavior of its own", () => {
  const directLog = runBattle(makeGoldenScenario(false));
  const registryLog = runBattle(makeGoldenScenario(true));
  assert.deepEqual(actionSequence(registryLog), actionSequence(directLog));
  assert.equal(registryLog.outcome.result, directLog.outcome.result);
  assert.equal(registryLog.rounds.length, directLog.rounds.length);
});

// --- Frame-scale: greedy-v1 through the registry matches a direct decide() call ---

function makeFrameMeleeState() {
  const me = {
    id: "me", name: "Me", side: "party", size: "huge", currentHP: 100, maxHP: 100,
    speed: 300, strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", size: "huge", currentHP: 100, maxHP: 100,
    speed: 0, strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 7, gridSize: { cols: 44, rows: 44 },
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 300 } };
  return { state, turn };
}

test("Frame-scale: decideWithPolicy(\"greedy-v1\", FRAME_ADAPTER, ...) reproduces a direct ai/decide.mjs decide() call exactly, on a real adjacent-melee state", () => {
  const direct = makeFrameMeleeState();
  const viaRegistry = makeFrameMeleeState();
  const directResult = frameDecide(direct.state, "me", direct.turn, { competence: 1, weights: FRAME_DEFAULT_WEIGHTS });
  const registryResult = decideWithPolicy("greedy-v1", FRAME_ADAPTER, viaRegistry.state, "me", viaRegistry.turn, { competence: 1, weights: FRAME_DEFAULT_WEIGHTS });
  assert.ok(directResult, "expected a real decision, not null, from this adjacent-melee state");
  assert.deepEqual(registryResult, directResult);
});

test("Frame-scale: FRAME_ADAPTER silently ignores personnel-only option fields instead of erroring — the real, documented asymmetry", () => {
  const { state, turn } = makeFrameMeleeState();
  const result = decideWithPolicy("greedy-v1", FRAME_ADAPTER, state, "me", turn, {
    competence: 1, weights: FRAME_DEFAULT_WEIGHTS,
    templates: ["unconstrained"], moraleEnabled: true, disabledActionTypes: ["trip"]
  });
  assert.ok(result, "extra personnel-only fields must not break Frame's own decide()");
});

// --- createBudgetTracker + budget-demo-v1 (design doc §59, GH issue #5) ---

test("createBudgetTracker: with no budget given, never reports exhausted across many real ticks — the real 'unlimited' default", () => {
  const tracker = createBudgetTracker();
  for (let i = 0; i < 10000; i++) {
    tracker.tick();
    assert.equal(tracker.exhausted(), false, `expected an unbounded tracker to never exhaust, but it did at iteration ${i}`);
  }
  assert.equal(tracker.iterations, 10000);
});

test("createBudgetTracker: maxIterations is exact — not exhausted one tick before the limit, exhausted exactly at it", () => {
  const tracker = createBudgetTracker({ maxIterations: 5 });
  for (let i = 0; i < 4; i++) {
    tracker.tick();
    assert.equal(tracker.exhausted(), false, `expected NOT exhausted after ${i + 1} of 5 ticks`);
  }
  tracker.tick();
  assert.equal(tracker.iterations, 5);
  assert.equal(tracker.exhausted(), true, "expected exhausted at exactly maxIterations ticks");
});

test("createBudgetTracker: maxMs is real and deterministic under a controlled busy-loop — exhausts once real elapsed time passes the limit, not before", () => {
  const tracker = createBudgetTracker({ maxMs: 20 });
  assert.equal(tracker.exhausted(), false, "expected not exhausted immediately after creation");
  const start = Date.now();
  while (Date.now() - start < 30) { /* real busy-loop, deterministic wall-clock wait */ }
  assert.equal(tracker.exhausted(), true, `expected exhausted after a real ${Date.now() - start}ms busy-loop past a 20ms budget`);
  assert.ok(tracker.elapsedMs >= 20, `expected elapsedMs to report real elapsed time, got ${tracker.elapsedMs}`);
});

test("createBudgetTracker: maxIterations and maxMs combine as an OR — exhausted the moment EITHER limit is reached", () => {
  const tracker = createBudgetTracker({ maxIterations: 1000, maxMs: 20 });
  const start = Date.now();
  while (Date.now() - start < 30) { /* real busy-loop */ }
  assert.equal(tracker.exhausted(), true, "expected the maxMs limit alone to exhaust the tracker despite maxIterations being nowhere close");
});

test("budget-demo-v1: registered in the policy registry alongside greedy-v1", () => {
  assert.ok(listPolicyIds().includes("budget-demo-v1"));
});

test("budget-demo-v1: with an UNLIMITED budget, converges to the exact same 1-ply-optimal choice greedy-v1 makes — proves it adds no real strength of its own, only a different (budgeted) route to the same answer", () => {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  const state = {
    seed: 42, gridSize: { cols: 12, rows: 8 }, round: 1, walls: [],
    combatants: new Map([["lunar17", { ...lunar17, id: "lunar17", position: { col: 4, row: 4 } }], ["goon", { ...goon, id: "goon", position: { col: 6, row: 4 } }]]),
    positions: new Map([["lunar17", { col: 4, row: 4 }], ["goon", { col: 6, row: 4 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const greedyResult = decideWithPolicy("greedy-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, { competence: 1 });
  const demoResult = decideWithPolicy("budget-demo-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, {});
  assert.ok(greedyResult && demoResult, "expected real decisions from both policies");
  assert.deepEqual(
    { type: demoResult.type, targetId: demoResult.targetId, to: demoResult.to },
    { type: greedyResult.type, targetId: greedyResult.targetId, to: greedyResult.to },
    "with an unlimited budget, budget-demo-v1 must pick the same real action greedy-v1 does"
  );
});

test("budget-demo-v1: a small maxIterations budget genuinely stops early (examines fewer than every candidate) yet STILL returns a real, legal action — the real anytime proof this issue's own 'done when' bar asks for", () => {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  const state = {
    seed: 1, gridSize: { cols: 12, rows: 8 }, round: 1, walls: [],
    combatants: new Map([["lunar17", { ...lunar17, id: "lunar17", position: { col: 4, row: 4 } }], ["goon", { ...goon, id: "goon", position: { col: 6, row: 4 } }]]),
    positions: new Map([["lunar17", { col: 4, row: 4 }], ["goon", { col: 6, row: 4 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };

  const fullProposals = PERSONNEL_ADAPTER.generateProposals(state, "lunar17", turn);
  assert.ok(fullProposals.length > 1, "need a real state with more than one candidate for this test to mean anything");

  const budgeted = decideWithPolicy("budget-demo-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, { budget: { maxIterations: 1 } });
  assert.ok(budgeted, "expected a real, non-null decision even from a budget of exactly 1 iteration");
  const examinedMatch = /best of (\d+)\//.exec(budgeted.reason);
  assert.ok(examinedMatch, `expected the reason to report a real examined-count, got: "${budgeted.reason}"`);
  const examined = Number(examinedMatch[1]);
  assert.ok(examined < fullProposals.length, `expected a maxIterations:1 budget to genuinely stop before examining all ${fullProposals.length} real candidates, but it examined ${examined} — the budget had no effect`);

  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state, turn });
  const result = sandbox.apply("lunar17", budgeted);
  assert.equal(result.legal, true, `budget-demo-v1's own budget-cut-off choice must still be a real, legal action: ${JSON.stringify(budgeted)}`);
});

test("budget-demo-v1: works identically (adapter-agnostic) on FRAME_ADAPTER too — a tiny budget still returns a real, legal Frame-scale decision", () => {
  const { state, turn } = makeFrameMeleeState();
  const budgeted = decideWithPolicy("budget-demo-v1", FRAME_ADAPTER, state, "me", turn, { budget: { maxIterations: 1 }, weights: FRAME_DEFAULT_WEIGHTS });
  assert.ok(budgeted, "expected a real, non-null decision from Frame-scale too");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  const result = sandbox.apply("me", budgeted);
  assert.equal(result.legal, true, `budget-demo-v1's Frame-scale choice must be real and legal: ${JSON.stringify(budgeted)}`);
});

test("budget-demo-v1: a budget of {maxIterations: 0} (a degenerate config, budget exhausted before any real work) STILL returns a real legal action, never null — the exact regression this policy's own null-on-illegal-first-candidate bug would have shipped without this test", () => {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  const state = {
    seed: 3, gridSize: { cols: 12, rows: 8 }, round: 1, walls: [],
    combatants: new Map([["lunar17", { ...lunar17, id: "lunar17", position: { col: 4, row: 4 } }], ["goon", { ...goon, id: "goon", position: { col: 6, row: 4 } }]]),
    positions: new Map([["lunar17", { col: 4, row: 4 }], ["goon", { col: 6, row: 4 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const budgeted = decideWithPolicy("budget-demo-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, { budget: { maxIterations: 0 } });
  assert.ok(budgeted, "a budget exhausted before any work has even happened must still return a real legal action if one exists");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state, turn });
  const result = sandbox.apply("lunar17", budgeted);
  assert.equal(result.legal, true, `expected a real, legal action even under maxIterations:0, got: ${JSON.stringify(budgeted)}`);
});
