/**
 * Tests for MCTS-Solver (design doc §67, GH issue #6's step 6, the second half — Winands, Bjornsson &
 * Saito 2008: proven win/loss propagation), added as an opt-in `useSolver` flag to
 * personnel-engine/search/mcts-puct.mjs (mcts-puct.mjs's own already-shipped behavior, and every
 * already-shipped test for it, stay untouched — `useSolver` defaults to `false`). Real concerns:
 * (1) a real, constructed one-ply WIN gets PROVEN via propagation, not just found by ordinary search —
 *     the root itself becomes terminal, and the search stops in real, exactly-derived fewer iterations
 *     than its own requested budget (hand-verified below, not assumed);
 * (2) a real, constructed LOSS — where EVERY one of the root's own real candidates independently leads
 *     to a certain reply-kill — gets PROVEN too, exercising the "every candidate tried and every one
 *     bad" branch, not just the single-good-candidate shortcut (1) already covers; the intermediate
 *     minimizing-node propagation (the enemy's own reply being proven good for THEM) is checked
 *     directly, not just the final root outcome;
 * (3) a direct, real efficiency comparison: the exact same position, same iteration budget, WITH vs.
 *     WITHOUT the solver — the solver run finishes in real, measurably fewer iterations, the honest
 *     "cheap and decisive near the end of a fight" issue #6 itself names for this mechanism;
 * (4) `useSolver` omitted behaves byte-identically to `useSolver: false` — the real, verified
 *     zero-behavior-change default every existing `mcts-puct-v1` caller depends on, including that the
 *     new `proven` field stays inert when the solver is never opted into;
 * (5) registered as `mcts-puct-solver-v1`, distinct from the untouched `mcts-puct-v1`, through the
 *     real policy registry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { search as searchPuct } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct-solver.mjs";

const TURN = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

// --- 1: a real, one-ply proven WIN short-circuits the search ---

function makeLethalStrikeState() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 0,
    strikes: [{ name: "Blaster", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "fire" }] }],
    position: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 20, currentHP: 1, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [],
    position: { col: 10, row: 11 }
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
}

test("MCTS-SOLVER: a real one-action lethal strike gets PROVEN (not just found) — root.proven is 'win', the root itself becomes terminal, and the search stops in exactly 1 real iteration: me has exactly one real candidate (speed 0, one strike, one target), so it's selected on the very first (tied, zero-visit) selection, and its child is already a real checkOutcome terminal the instant it's created — no second iteration can add anything", () => {
  const budget = 50;
  const result = searchPuct({ state: makeLethalStrikeState(), combatantId: "me", turn: TURN, iterations: budget, maxDepth: 2, useSolver: true });
  assert.equal(result.root.candidates.length, 1, "sanity: exactly one real candidate (speed 0 removes movement, one strike, one target)");
  assert.equal(result.root.proven, "win", "expected the root to be PROVEN won, not just evaluated well");
  assert.equal(result.root.terminal, true);
  assert.equal(result.iterations, 1, "expected the solver to stop after exactly 1 real iteration — hand-derived above, not a loose bound");
  assert.equal(result.bestProposal.type, "strike");
  assert.ok(result.meanValue > 1000, `expected a real WIN sentinel as the mean value, got ${result.meanValue}`);

  const unsolved = searchPuct({ state: makeLethalStrikeState(), combatantId: "me", turn: TURN, iterations: budget, maxDepth: 2 });
  assert.equal(unsolved.iterations, budget, "sanity: without the solver, the exact same position spends its FULL requested budget every time — the real baseline the solver's own early exit is measured against");
});

// --- 2: a real, fully-hopeless position — every candidate proven bad, not just one ---

function makeHopelessState() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 1, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 0,
    strikes: [
      { name: "Sidearm", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] },
      { name: "Baton", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 2, damageType: "bludgeoning" }] }
    ],
    position: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 100, currentHP: 100, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 10, row: 11 }
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
}

test("MCTS-SOLVER: a real, fully hopeless position (neither of me's own two real candidates can stop the enemy's own certain, guaranteed-lethal reply) gets PROVEN a real LOSS only once EVERY candidate has been individually tried and found bad — the 'all candidates proven bad' branch, not just the single-good-candidate shortcut test 1 already covers; each candidate needs at most 2 of its own real visits to resolve (one to reach the enemy's own reply node, one to discover its reply), so 4 real iterations are provably enough regardless of selection order", () => {
  const budget = 20; // provably >= the hard 4-iteration bound derived above — generous, not tight
  const result = searchPuct({ state: makeHopelessState(), combatantId: "me", turn: TURN, iterations: budget, maxDepth: 2, useSolver: true });
  assert.equal(result.root.candidates.length, 2, "sanity: exactly 2 real candidates at the root (speed 0 removes movement, 2 strikes x 1 enemy)");

  for (const c of result.root.candidates) {
    assert.ok(c.child, `expected candidate strikeIndex=${c.proposal.strikeIndex} to have been fully expanded before the root could be proven`);
    assert.equal(c.child.proven, "loss", "expected EACH of me's own real candidates to individually resolve to a proven loss via the enemy's own certain reply — the intermediate minimizing-node propagation, not just the final root outcome");
  }
  assert.equal(result.root.proven, "loss", "expected the root to be PROVEN lost only once every real candidate above was proven bad");
  assert.equal(result.root.terminal, true);
  assert.ok(result.iterations <= 4, `expected the solver to stop within the hard 4-iteration bound, got ${result.iterations}`);
  assert.ok(result.bestProposal, "expected a real, legal proposal even in a fully lost position — MCTS always returns an anytime-valid answer");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeHopelessState(), turn: TURN });
  assert.equal(sandbox.apply("me", result.bestProposal).legal, true);

  const unsolved = searchPuct({ state: makeHopelessState(), combatantId: "me", turn: TURN, iterations: budget, maxDepth: 2 });
  assert.equal(unsolved.iterations, budget, "sanity: without the solver, the same hopeless position still spends its FULL requested budget — it has no way to know to stop");
});

// --- 3: zero behavior change when not opted in ---

test("useSolver omitted is byte-identical to useSolver: false — the real, verified default every existing mcts-puct-v1 caller depends on", () => {
  const omitted = searchPuct({ state: makeLethalStrikeState(), combatantId: "me", turn: TURN, iterations: 20, maxDepth: 2 });
  const explicit = searchPuct({ state: makeLethalStrikeState(), combatantId: "me", turn: TURN, iterations: 20, maxDepth: 2, useSolver: false });
  assert.deepEqual(omitted.bestProposal, explicit.bestProposal);
  assert.equal(omitted.visits, explicit.visits);
  assert.equal(omitted.meanValue, explicit.meanValue);
  assert.equal(omitted.iterations, explicit.iterations);
  assert.equal(omitted.iterations, 20, "without the solver, even a real, provably-won position runs its FULL requested budget — no early exit exists on this path");
  assert.equal(omitted.root.proven, null, "the new 'proven' field stays inert (null) on the root when the solver is never opted into, even though a real terminal child gets it set internally regardless");
});

// --- 4: registered as a real, distinct policy ---

test("mcts-puct-solver-v1: registered in the policy registry (distinct id from mcts-puct-v1, which this file never touches — see mcts-puct.test.mjs for that policy's own registration test), returns a real, legal action", () => {
  assert.ok(listPolicyIds().includes("mcts-puct-solver-v1"));
  const decision = decideWithPolicy("mcts-puct-solver-v1", PERSONNEL_ADAPTER, makeLethalStrikeState(), "me", TURN, { iterations: 50, maxDepth: 2 });
  assert.ok(decision, "expected a real decision through the registry");
  assert.equal(decision.type, "strike");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeLethalStrikeState(), turn: TURN });
  assert.equal(sandbox.apply("me", decision).legal, true);
});
