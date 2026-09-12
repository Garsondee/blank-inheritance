/**
 * GH #62's own remaining scope: MCTS tree search shares real pathfinding-flood results across tree
 * nodes with matching combatant occupancy, via `search/tree-shared.mjs`'s own `scopedDestCache`
 * (a `Map<occupancyFingerprint, Map>` instantiated fresh per real `search()`/`continueSearch()` call,
 * each bucket handed to `generateProposals` exactly like `decide()`'s own turn-scoped `destCache`
 * already is). Measured directly before this shipped (`battle-history.md`, 2026-09-12): 232 floods,
 * zero reuse, ~83% of a real decision's wall-clock time. These tests target exactly the failure
 * modes two adversarial review rounds found in earlier drafts: reading the new capability off the
 * wrong object (`engine` vs. `adapter` — round 1's critical finding, which would have shipped this
 * whole feature as a silent no-op passing every OTHER test), and a call site missed inside
 * `continueSearch`'s own reopen path (round 1's second finding).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scopedDestCache } from "../../tools/battle-simulator/personnel-engine/search/tree-shared.mjs";
import { occupancyFingerprint } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { search as searchPuct, continueSearch } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { search as searchUct } from "../../tools/battle-simulator/personnel-engine/search/mcts.mjs";
import { resetFloodCount, getFloodCount } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { decideWithPolicy } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import { FRAME_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/frame-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct.mjs";

// --- scopedDestCache: direct unit tests ---

test("scopedDestCache: the SAME fingerprint returns the SAME sub-map across two calls (real reuse)", () => {
  const searchDestCache = new Map();
  const engine = { occupancyFingerprint: () => "fp-A" };
  const a = scopedDestCache(searchDestCache, engine, {}, "me");
  const b = scopedDestCache(searchDestCache, engine, {}, "me");
  assert.equal(a, b, "the identical fingerprint must yield the identical Map instance, not a new one each time");
});

test("scopedDestCache: DIFFERENT fingerprints return DIFFERENT sub-maps — no cross-branch contamination", () => {
  const searchDestCache = new Map();
  let fp = "fp-A";
  const engine = { occupancyFingerprint: () => fp };
  const a = scopedDestCache(searchDestCache, engine, {}, "me");
  a.set("reach|me|0,0|25", { cost: 25, path: null });
  fp = "fp-B"; // a different branch's occupancy
  const b = scopedDestCache(searchDestCache, engine, {}, "me");
  assert.notEqual(a, b, "a different occupancy fingerprint must get its own, separate bucket");
  assert.equal(b.has("reach|me|0,0|25"), false, "the OTHER branch's cached entry must never leak into this one");
});

test("scopedDestCache: gracefully degrades to undefined when the engine has no occupancyFingerprint at all", () => {
  const searchDestCache = new Map();
  const engine = {}; // no occupancyFingerprint — e.g. FRAME_ADAPTER today
  assert.equal(scopedDestCache(searchDestCache, engine, {}, "me"), undefined);
});

test("scopedDestCache: gracefully degrades to undefined when searchDestCache itself is absent", () => {
  const engine = { occupancyFingerprint: () => "fp-A" };
  assert.equal(scopedDestCache(undefined, engine, {}, "me"), undefined);
});

// --- Correctness: the reason fingerprinting exists at all ---

function makeOccupancyState(farEnemyAlive) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20,
    speed: 30, strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  // The blocker sits directly on the shortest path from (0,0) toward (10,0) — alive, it forces a
  // real detour; dead, the straight line opens up. A real, structurally different reachable-cell
  // result between the two occupancies, not a contrived edge case.
  const blocker = { id: "blocker", name: "Blocker", side: "opposition", currentHP: farEnemyAlive ? 10 : 0, maxHP: 10, speed: 0, position: { col: 5, row: 0 } };
  const walls = [{ c: [19, 19, 19, 20], move: 20, sight: 20 }]; // forces the real Dijkstra flood path, matching fix 2's own established fixture convention
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls,
    combatants: new Map([["me", me], ["blocker", blocker]]),
    positions: new Map([["me", { col: 0, row: 0 }], ["blocker", { col: 5, row: 0 }]])
  };
}

test("CORRECTNESS: a real generateProposals call through each bucket reflects that bucket's OWN occupancy, not a stale sibling's", () => {
  const { generateProposals } = PERSONNEL_ADAPTER;
  const searchDestCache = new Map();
  const engine = { occupancyFingerprint };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 30 } };

  // Query the ALIVE bucket first, then the DEAD bucket, through the SAME shared searchDestCache —
  // if scopedDestCache ever served one branch's cached flood to the other, both calls below would
  // return byte-identical destination sets despite genuinely different occupancy blocking the
  // direct path in only one of them.
  const aliveState = makeOccupancyState(true);
  const aliveBucket = scopedDestCache(searchDestCache, engine, aliveState, "me");
  const aliveDests = generateProposals(aliveState, "me", turn, aliveBucket)
    .filter((p) => p.type === "move").map((p) => `${p.to.col},${p.to.row}`).sort();

  const deadState = makeOccupancyState(false);
  const deadBucket = scopedDestCache(searchDestCache, engine, deadState, "me");
  const deadDests = generateProposals(deadState, "me", turn, deadBucket)
    .filter((p) => p.type === "move").map((p) => `${p.to.col},${p.to.row}`).sort();

  assert.ok(aliveDests.length > 0 && deadDests.length > 0, "sanity: both occupancies must produce real move candidates");
  assert.notDeepEqual(aliveDests, deadDests,
    `expected a genuinely different destination SET once the blocker on the direct path dies — alive=${JSON.stringify(aliveDests)}, dead=${JSON.stringify(deadDests)}. Identical sets would mean one bucket served the other's stale, wrong-occupancy answer.`);
});

// --- Reuse is real, not just "nothing broke" — mirroring fix 2's own established methodology ---

function buildComplexState() {
  // A real multi-combatant, walled scenario with genuine occupancy repetition across MCTS tree
  // nodes — the same shape already used for the fix-3 measurement (battle-history.md, 2026-09-12).
  const positions = {
    lunar17: { col: 2, row: 2 }, tapkey: { col: 3, row: 2 }, bennit: { col: 2, row: 3 },
    goon: { col: 10, row: 2 }, xeno: { col: 11, row: 2 }, erabryth: { col: 10, row: 3 }
  };
  const walls = [];
  for (let row = 0; row <= 6; row++) if (row !== 3) walls.push({ c: [7, row, 7, row + 1], move: 20, sight: 20 });
  const mk = (id, side, pos, overrides = {}) => ({
    id, name: id, side, maxHP: 20, currentHP: 20, ac: 14, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: pos, ...overrides
  });
  const combatants = [
    mk("lunar17", "party", positions.lunar17), mk("tapkey", "party", positions.tapkey), mk("bennit", "party", positions.bennit),
    mk("goon", "opposition", positions.goon), mk("xeno", "opposition", positions.xeno), mk("erabryth", "opposition", positions.erabryth)
  ];
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 10 }, walls,
    combatants: new Map(combatants.map((c) => [c.id, c])),
    positions: new Map(combatants.map((c) => [c.id, { ...c.position }])),
    initiativeOrder: combatants.map((c) => c.id)
  };
}

test("REUSE IS REAL: a real mcts-puct-v1 search floods measurably LESS with occupancyFingerprint present than with it stripped — the ONE test that can tell 'wired but inert' apart from 'genuinely working'", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };

  resetFloodCount();
  const withFix = searchPuct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 300, maxDepth: 3, adapter: PERSONNEL_ADAPTER });
  const floodsWithFix = getFloodCount();

  // The exact real graceful-degradation path (Decision 1's own claim) doubles as the "fix disabled"
  // control here — a shallow copy of the real adapter with only occupancyFingerprint stripped,
  // never a separate/parallel implementation that could itself drift from the real one.
  const adapterWithoutFingerprint = { ...PERSONNEL_ADAPTER, occupancyFingerprint: undefined };
  resetFloodCount();
  const withoutFix = searchPuct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 300, maxDepth: 3, adapter: adapterWithoutFingerprint });
  const floodsWithoutFix = getFloodCount();

  assert.ok(withFix.bestProposal, "expected a real decision with the fix present");
  assert.ok(withoutFix.bestProposal, "expected a real decision with the fix stripped — this must remain a pure performance difference, never a behavior change");
  assert.ok(floodsWithFix < floodsWithoutFix,
    `expected strictly fewer floods with occupancyFingerprint present: with=${floodsWithFix}, without=${floodsWithoutFix}. Equal or more would mean the cache is wired but never actually populated (round 1's own critical finding, reintroduced).`);
});

test("REUSE IS REAL, plain UCT (mcts.mjs): the identical proof for the simpler search algorithm", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };

  resetFloodCount();
  searchUct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 300, maxDepth: 3, adapter: PERSONNEL_ADAPTER });
  const floodsWithFix = getFloodCount();

  const adapterWithoutFingerprint = { ...PERSONNEL_ADAPTER, occupancyFingerprint: undefined };
  resetFloodCount();
  searchUct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 300, maxDepth: 3, adapter: adapterWithoutFingerprint });
  const floodsWithoutFix = getFloodCount();

  assert.ok(floodsWithFix < floodsWithoutFix, `with=${floodsWithFix}, without=${floodsWithoutFix}`);
});

test("REUSE IS REAL, continueSearch's own reopen path — round 1's own second finding, the call site with real precedent for being missed in this codebase", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const state = buildComplexState();

  // Force a shallow, real search whose root gets frozen horizon at maxDepth 1, then resume it with
  // a larger maxDepth — exactly the shape that forces runSearchToCompletion's OWN root-level
  // computeCandidates reopen (not runIteration's), the third call site round 1 found undercounted.
  const shallow = searchPuct({ state, combatantId: "lunar17", turn, iterations: 50, maxDepth: 1, adapter: PERSONNEL_ADAPTER });
  assert.ok(shallow.root.horizon || shallow.root.candidates.length > 0, "sanity: a real shallow root was built");

  resetFloodCount();
  const resumed = continueSearch({ reused: { node: shallow.root }, combatantId: "lunar17", iterations: 100, maxDepth: 3, weights: shallow.root.builtWeights, tau: shallow.root.builtTau, adapter: PERSONNEL_ADAPTER });
  const floodsWithFix = getFloodCount();
  assert.ok(resumed.bestProposal, "expected a real resumed decision");

  const shallow2 = searchPuct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 50, maxDepth: 1, adapter: PERSONNEL_ADAPTER });
  const adapterWithoutFingerprint = { ...PERSONNEL_ADAPTER, occupancyFingerprint: undefined };
  resetFloodCount();
  continueSearch({ reused: { node: shallow2.root }, combatantId: "lunar17", iterations: 100, maxDepth: 3, weights: shallow2.root.builtWeights, tau: shallow2.root.builtTau, adapter: adapterWithoutFingerprint });
  const floodsWithoutFix = getFloodCount();

  assert.ok(floodsWithFix < floodsWithoutFix,
    `expected continueSearch's own reopen path to also show real reuse: with=${floodsWithFix}, without=${floodsWithoutFix}`);
});

// --- Graceful degradation, both directions ---

test("GRACEFUL DEGRADATION: FRAME_ADAPTER genuinely doesn't implement occupancyFingerprint yet — confirms the precondition every mcts-puct-frame.test.mjs/mcts-frame.test.mjs test already exercises for real (8 Frame-scale end-to-end decisions, all passing unchanged after this fix)", () => {
  assert.equal(FRAME_ADAPTER.occupancyFingerprint, undefined);
});

test("GRACEFUL DEGRADATION: an adapter missing occupancyFingerprint chooses the SAME real decision as one with it — a pure performance difference, never a behavior change", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const withFix = searchPuct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 300, maxDepth: 3, adapter: PERSONNEL_ADAPTER });
  const adapterWithoutFingerprint = { ...PERSONNEL_ADAPTER, occupancyFingerprint: undefined };
  const withoutFix = searchPuct({ state: buildComplexState(), combatantId: "lunar17", turn, iterations: 300, maxDepth: 3, adapter: adapterWithoutFingerprint });
  assert.deepEqual(withFix.bestProposal, withoutFix.bestProposal, "the cache must be a pure performance change — the chosen proposal must not depend on whether it's present");
});
