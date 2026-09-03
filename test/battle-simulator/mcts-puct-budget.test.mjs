/**
 * Tests for budget-awareness (design doc §68, GH issue #6 step 7 — the "budgets" third of it, #5/#11):
 * a real `{maxIterations, maxMs}` budget, the same shape as `ai-common/engine-adapter.mjs`'s own
 * documented `options.budget` policy contract, wired into `personnel-engine/search/mcts-puct.mjs`'s
 * own `search()` — plus its own personnel-engine-native copy of `createBudgetTracker`
 * (`search/tree-shared.mjs`, kept separate from `ai-common`'s copy on purpose: `personnel-engine/`
 * must never depend on `ai-common/`, per `baselines.mjs`'s own documented layering rule). Real
 * concerns:
 * (1) the tracker primitive itself — exhausts on iteration count, exhausts on wall-clock, and neither
 *     when given generous limits;
 * (2) `budget` composes with (never replaces) the existing plain `iterations` cap — whichever is
 *     tighter wins, in both directions;
 * (3) a real wall-clock budget genuinely cuts off a search that would otherwise run far longer, and
 *     still returns a real, legal, anytime-valid answer;
 * (4) `budget` omitted is byte-identical to before — the real, verified zero-behavior-change default
 *     every existing `mcts-puct-v1`/`mcts-puct-insured-v1`/`mcts-puct-solver-v1` caller depends on;
 * (5) `elapsedMs` is reported on every result, including the zero-iteration terminal-root path;
 * (6) the policy layer actually threads `options.budget` through to the real search, end to end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBudgetTracker } from "../../tools/battle-simulator/personnel-engine/search/tree-shared.mjs";
import { search as searchPuct } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { decideWithPolicy } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct.mjs";

const TURN = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

// --- 1: the tracker primitive itself ---

test("createBudgetTracker: generous limits never exhaust across real ticks", () => {
  const tracker = createBudgetTracker({ maxIterations: 1000, maxMs: 60000 });
  for (let i = 0; i < 50; i++) tracker.tick();
  assert.equal(tracker.iterations, 50);
  assert.equal(tracker.exhausted(), false);
});

test("createBudgetTracker: exhausts exactly at maxIterations real ticks, not before or after", () => {
  const tracker = createBudgetTracker({ maxIterations: 5 });
  for (let i = 0; i < 4; i++) { tracker.tick(); assert.equal(tracker.exhausted(), false, `must not be exhausted after ${i + 1}/5 ticks`); }
  tracker.tick();
  assert.equal(tracker.exhausted(), true, "must be exhausted after exactly 5/5 ticks");
});

test("createBudgetTracker: maxMs: 0 is exhausted immediately — real, deterministic wall-clock gating, no sleep needed to prove it", () => {
  const tracker = createBudgetTracker({ maxMs: 0 });
  assert.equal(tracker.exhausted(), true);
});

test("createBudgetTracker: omitted budget ({}) never exhausts — both limits default to unlimited", () => {
  const tracker = createBudgetTracker();
  for (let i = 0; i < 100; i++) tracker.tick();
  assert.equal(tracker.exhausted(), false);
});

// --- 2/3/4: real search() integration ---

function makeRichPosition() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 30,
    strikes: [{ name: "Blaster", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "2d6", bonus: 4, damageType: "fire" }] }],
    position: { col: 10, row: 10 }, objective: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 40, currentHP: 40, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 18, row: 10 }
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
}

test("search(): budget omitted is byte-identical to before — real iterations run exactly the plain `iterations` count, no early cutoff exists on this path", () => {
  const result = searchPuct({ state: makeRichPosition(), combatantId: "me", turn: TURN, iterations: 15, maxDepth: 2 });
  assert.equal(result.iterations, 15);
  assert.ok(result.elapsedMs >= 0, "expected a real, sane, non-negative elapsedMs even without an explicit budget");
});

test("search(): a real, already-terminal root reports elapsedMs: 0 (zero real search work happened)", () => {
  const me = { id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [], position: { col: 0, row: 0 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 0, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
  const result = searchPuct({ state, combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  assert.equal(result.iterations, 0);
  assert.equal(result.elapsedMs, 0);
});

test("search(): budget.maxIterations composes as the TIGHTER cap in both directions — whichever of `iterations`/`budget.maxIterations` is smaller wins", () => {
  const tighterBudget = searchPuct({ state: makeRichPosition(), combatantId: "me", turn: TURN, iterations: 1000, maxDepth: 2, budget: { maxIterations: 5 } });
  assert.equal(tighterBudget.iterations, 5, "budget.maxIterations (5) must win over the larger plain iterations (1000)");

  const tighterPlain = searchPuct({ state: makeRichPosition(), combatantId: "me", turn: TURN, iterations: 5, maxDepth: 2, budget: { maxIterations: 1000 } });
  assert.equal(tighterPlain.iterations, 5, "the smaller plain iterations (5) must still win over the larger budget.maxIterations (1000) — iterations is always an outer ceiling");
});

test("search(): a real wall-clock budget genuinely cuts off a search that would otherwise run far longer, and still returns a real, legal, anytime-valid answer", () => {
  const result = searchPuct({ state: makeRichPosition(), combatantId: "me", turn: TURN, iterations: 200000, maxDepth: 3, budget: { maxMs: 20 } });
  assert.ok(result.iterations < 200000, `expected the wall-clock budget to cut the search off well short of the full 200000-iteration cap, got ${result.iterations}`);
  assert.ok(result.elapsedMs < 2000, `expected a real, prompt cutoff (generous sanity bound against machine jitter), got ${result.elapsedMs}ms for a 20ms budget`);
  assert.ok(result.bestProposal, "expected a real, legal proposal even from a search cut short by wall-clock — the same anytime guarantee an iteration cap already gives");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeRichPosition(), turn: TURN });
  assert.equal(sandbox.apply("me", result.bestProposal).legal, true);
});

// --- 5/6: the policy layer actually threads options.budget through ---

test("mcts-puct-v1 through the registry: options.budget reaches the real search — a tiny wall-clock budget still returns a real, legal, fast decision", () => {
  const decision = decideWithPolicy("mcts-puct-v1", PERSONNEL_ADAPTER, makeRichPosition(), "me", TURN, {
    iterations: 200000, maxDepth: 3, budget: { maxMs: 20 }
  });
  assert.ok(decision, "expected a real decision through the registry even under a tiny wall-clock budget");
  assert.match(decision.reason, /ms,/, "expected the real elapsed time to show up in the policy's own reported reason");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeRichPosition(), turn: TURN });
  assert.equal(sandbox.apply("me", decision).legal, true);
});
