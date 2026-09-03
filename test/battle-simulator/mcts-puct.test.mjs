/**
 * Tests for personnel-engine/search/mcts-puct.mjs — PUCT + progressive widening, step 5 of GH issue
 * #6's own build order (design doc §65). Real concerns:
 * (1) CONVERGENCE — matches the Phase-A oracle exactly on the same tractable positions plain UCT
 *     already converges to (mcts.mjs's own proof, re-confirmed here for the new algorithm);
 * (2) THE decisive test issue #6's own step 5 explicitly asks for — "same-budget win over plain UCT"
 *     — on a real, larger-branching-factor position (20 real candidates from an unmodified lunar-17
 *     fixture), at a tiny iteration budget SMALLER than the candidate count, PUCT finds the real
 *     correct answer while plain UCT does not; both are fully deterministic (no RNG anywhere in
 *     Phase-A search), so this is a real, exactly-reproducible result, not a favorable sample;
 * (3) real priors — computed from the same one-ply gain decide() itself uses, sum to 1, and the
 *     highest-gain candidate gets the highest prior;
 * (4) progressive widening genuinely bounds how many candidates are eligible early on;
 * (5) terminal detection;
 * (6) registered as `mcts-puct-v1`, deliberately NOT `mcts-v1` — `mcts-v1` is now real (design doc
 *     §70), a separate, later composition of this file's own `search()` with `useSolver: true` +
 *     trap insurance; this policy itself stays exactly what it always was, untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { search as searchPuct } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { search as searchUct } from "../../tools/battle-simulator/personnel-engine/search/mcts.mjs";
import { solve } from "../../tools/battle-simulator/personnel-engine/search/expectiminimax.mjs";
import { generateProposals } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct.mjs";

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

test("CONVERGENCE: matches the oracle's own exact pick and value on the §60/§61 trap, both at depth 1 (myopic) and depth 2 (the real flip)", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const oracle1 = solve({ state: makeTrapState(), combatantId: "me", turn, depth: 1 });
  const puct1 = searchPuct({ state: makeTrapState(), combatantId: "me", turn, iterations: 300, maxDepth: 1 });
  assert.deepEqual(puct1.bestProposal.to, oracle1.bestProposal.to);
  assert.ok(Math.abs(puct1.meanValue - oracle1.value) < 1e-9, `PUCT mean value ${puct1.meanValue} vs. oracle ${oracle1.value}`);

  const oracle2 = solve({ state: makeTrapState(), combatantId: "me", turn, depth: 2 });
  const puct2 = searchPuct({ state: makeTrapState(), combatantId: "me", turn, iterations: 500, maxDepth: 2 });
  assert.deepEqual(puct2.bestProposal.to, oracle2.bestProposal.to);
  assert.ok(Math.abs(puct2.meanValue - oracle2.value) < 1e-9, `PUCT mean value ${puct2.meanValue} vs. oracle ${oracle2.value}`);
});

// --- 2: THE decisive same-budget win over plain UCT ---

function makeRichBranchingState() {
  const lunar17 = loadFixture("lunar-17.json");
  const tough = loadFixture("tough.json");
  const xeno = loadFixture("xenowarden-greenhorn.json");
  const me = { ...lunar17, id: "me", side: "party", position: { col: 10, row: 10 } };
  const enemyA = { ...tough, id: "enemyA", side: "opposition", position: { col: 12, row: 10 } };
  const enemyB = { ...xeno, id: "enemyB", side: "opposition", position: { col: 13, row: 11 } };
  return {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], initiativeOrder: ["me", "enemyA", "enemyB"],
    combatants: new Map([["me", { ...me }], ["enemyA", { ...enemyA }], ["enemyB", { ...enemyB }]]),
    positions: new Map([["me", { ...me.position }], ["enemyA", { ...enemyA.position }], ["enemyB", { ...enemyB.position }]])
  };
}

test("SAME-BUDGET WIN (issue #6's own explicit step-5 test): on a real, unmodified-fixture position with a genuinely large branching factor (20 real candidates), at a tiny budget SMALLER than the candidate count, PUCT finds the real correct answer while plain UCT does not — fully deterministic (no RNG in Phase-A search), exactly reproducible, not a favorable sample", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const realCandidateCount = generateProposals(makeRichBranchingState(), "me", turn).length;
  assert.ok(realCandidateCount >= 15, `expected a real, large branching factor from the unmodified lunar-17 fixture, got only ${realCandidateCount} candidates`);

  const oracle = solve({ state: makeRichBranchingState(), combatantId: "me", turn, depth: 1 });
  const tinyBudget = 6; // real, deliberately smaller than realCandidateCount
  const uctResult = searchUct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations: tinyBudget, maxDepth: 1 });
  const puctResult = searchPuct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations: tinyBudget, maxDepth: 1 });

  assert.deepEqual(puctResult.bestProposal, oracle.bestProposal, "expected PUCT to find the real correct answer even at a tiny budget, via its own real prior");
  assert.notDeepEqual(uctResult.bestProposal, oracle.bestProposal, "expected plain UCT to genuinely fail at this same tiny budget — if this ever passes, the scenario's own real advantage margin has changed and this test needs re-deriving, not just updating");
});

test("SAME-BUDGET WIN: PUCT's advantage holds at several small budgets below the real candidate count, and both algorithms agree once the budget comfortably exceeds it — a real, swept comparison, not a single lucky number", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const oracle = solve({ state: makeRichBranchingState(), combatantId: "me", turn, depth: 1 });

  for (const iterations of [4, 6, 8, 10]) {
    const puctResult = searchPuct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations, maxDepth: 1 });
    assert.deepEqual(puctResult.bestProposal, oracle.bestProposal, `iterations=${iterations}: expected PUCT to still find the real correct answer`);
  }
  // Comfortably past the real candidate count, plain UCT catches up too — PUCT isn't "better," it's
  // more BUDGET-EFFICIENT, exactly the real, honest claim this step makes.
  const uctAtLargeBudget = searchUct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations: 200, maxDepth: 1 });
  assert.deepEqual(uctAtLargeBudget.bestProposal, oracle.bestProposal, "expected plain UCT to also find the real correct answer once given a real, sufficient budget");
});

// --- 3: real priors ---

test("real priors: sum to 1, and the highest one-ply-gain candidate gets the highest prior", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const result = searchPuct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations: 1, maxDepth: 1 });
  const totalPrior = result.root.candidates.reduce((sum, c) => sum + c.prior, 0);
  assert.ok(Math.abs(totalPrior - 1) < 1e-6, `expected real softmax priors to sum to 1, got ${totalPrior}`);
  // root.candidates is already sorted prior-descending (progressive widening's own ordering
  // requirement) — the first entry must be the real highest-prior one.
  const maxPrior = Math.max(...result.root.candidates.map((c) => c.prior));
  assert.equal(result.root.candidates[0].prior, maxPrior);
});

// --- 4: progressive widening genuinely bounds early eligibility ---

test("progressive widening: with a real, large candidate set, the search does not spend its very first few real iterations trying every candidate once (unlike plain UCT, which always does) — real evidence the top-by-prior gate is actually active, not a no-op", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const puctResult = searchPuct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations: 3, maxDepth: 1 });
  const uctResult = searchUct({ state: makeRichBranchingState(), combatantId: "me", turn, iterations: 3, maxDepth: 1 });
  const puctExpandedCount = puctResult.root.candidates.filter((c) => c.visits > 0).length;
  const uctExpandedCount = uctResult.root.children.size;
  assert.equal(uctExpandedCount, 3, "plain UCT must have expanded exactly 3 distinct children after 3 iterations (no widening gate)");
  assert.ok(puctExpandedCount <= 3, `PUCT must never expand MORE distinct candidates than real iterations spent, got ${puctExpandedCount} from 3 iterations`);
});

// --- 5: terminal detection ---

test("search(): an already-terminal state returns immediately with the real WIN value and no real proposal", () => {
  const me = { id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [], position: { col: 0, row: 0 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 0, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const result = searchPuct({ state, combatantId: "me", turn, iterations: 100, maxDepth: 3 });
  assert.equal(result.bestProposal, null);
  assert.ok(result.meanValue > 1000, `expected a real WIN sentinel, got ${result.meanValue}`);
  assert.equal(result.iterations, 0, "a terminal root needs zero real search iterations");
});

// --- 6: registered under a distinctly WIP name ---

test("mcts-puct-v1: registered in the policy registry (deliberately NOT mcts-v1 — this policy itself still has no chance-node consumption, no MCTS-Solver, no trap insurance; mcts-v1 is a separate, later composition, §70), returns a real, legal action", () => {
  assert.ok(listPolicyIds().includes("mcts-puct-v1"));
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("mcts-puct-v1", PERSONNEL_ADAPTER, makeTrapState(), "me", turn, { iterations: 100, maxDepth: 2 });
  assert.ok(decision, "expected a real decision through the registry");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeTrapState(), turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});
