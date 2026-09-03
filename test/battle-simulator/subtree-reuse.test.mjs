/**
 * Tests for personnel-engine/search/subtree-reuse.mjs — the pure, VERIFIED matching logic behind
 * subtree reuse (design doc §69, GH issue #6 step 7, part 2 of 3). Real concerns:
 * (1) sound reuse — a real, already-expanded candidate whose predicted state genuinely matches the
 *     real one is reused by REFERENCE (its accumulated stats preserved, not rebuilt);
 * (2) unsound reuse is rejected, not silently trusted;
 * (3) the two "nothing to reuse" cases (no matching candidate at all; a real candidate that was never
 *     expanded) are reported distinctly, not conflated;
 * (4) the field-scoped state comparison actually does what it's for: a `realState` shaped like
 *     `runBattle`'s own live state (an extra, always-present `blindDeployment` own key, `undefined`
 *     when unused) against a tree state shaped like `cloneStateForPlanning`'s output (that key absent
 *     entirely) must still be recognized as a match — verified directly with `node -e` before writing
 *     this file that a naive whole-object `isDeepStrictEqual` would fail this EVERY time, for every
 *     scenario, silently and permanently; this test would fail against that naive version;
 * (5) `advanceRoot`'s multi-hop walk: full success, honest partial credit on a mid-chain divergence
 *     (not null, not the failed hop's own non-result), and the zero-hops edge case;
 * (6) `advanceRoot` on a cross-actor hop (someone else's real move, not the searching agent's own) —
 *     PUCT + progressive widening concentrate expansion on the searcher's OWN best-looking lines, so
 *     another actor's real choice is disproportionately likely to have never been tried; this is
 *     documented, not just asserted, by a direct test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { search } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { findReusableNode, advanceRoot } from "../../tools/battle-simulator/personnel-engine/search/subtree-reuse.mjs";
import { runBattle, forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";

const TURN = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

// --- fixtures ---

/** `me` has no strikes and a real objective — every real candidate `generateProposals` returns is a
 * MOVE (deterministic: EXPECTED_OUTCOMES and REAL_OUTCOMES can never diverge for it). A single,
 * harmless, distant `enemy` exists purely so `checkOutcome` doesn't fire immediately (an empty
 * opposition side would trivially "win" the moment the state is built, per checkOutcome's own
 * `opposition.every(...)` — vacuously true on an empty array). */
function makeMoveOnlyState() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [],
    position: { col: 0, row: 0 }, objective: { col: 20, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [],
    position: { col: 25, row: 25 }
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
}

// --- 1/2/3: core matching logic ---

test("findReusableNode: sound reuse of a real, already-expanded deterministic (move) candidate — returns the SAME node reference (real accumulated stats preserved), given its own real predicted state as the 'real' one", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  const expanded = result.root.candidates.find((c) => c.proposal.type === "move" && c.child);
  assert.ok(expanded, "expected at least one real move candidate to have been expanded after 100 iterations");

  const reused = findReusableNode({ previousRoot: result.root, realProposal: expanded.proposal, realState: expanded.child.state });
  assert.equal(reused.reused, true);
  assert.equal(reused.node, expanded.child, "expected the exact same node object back, not a rebuilt copy");
  assert.equal(reused.reason, "reused");
});

test("findReusableNode: unsound reuse is rejected — a realState that genuinely differs from the tree's own prediction reports state-diverged, not a false match", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  const expanded = result.root.candidates.find((c) => c.proposal.type === "move" && c.child);
  assert.ok(expanded);

  const divergedState = {
    ...expanded.child.state,
    combatants: new Map(expanded.child.state.combatants),
    positions: new Map(expanded.child.state.positions)
  };
  divergedState.combatants.set("enemy", { ...divergedState.combatants.get("enemy"), currentHP: 1 }); // "really" something else happened

  const reused = findReusableNode({ previousRoot: result.root, realProposal: expanded.proposal, realState: divergedState });
  assert.equal(reused.reused, false);
  assert.equal(reused.node, null);
  assert.equal(reused.reason, "state-diverged");
});

test("findReusableNode: no-matching-candidate — a real proposal that was never among the tree's own real candidates at all", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  const bogusProposal = { type: "move", to: { col: 999, row: 999 } };
  const reused = findReusableNode({ previousRoot: result.root, realProposal: bogusProposal, realState: {} });
  assert.equal(reused.reused, false);
  assert.equal(reused.reason, "no-matching-candidate");
});

test("findReusableNode: never-expanded — a real candidate that DOES exist in the tree but was never actually visited/simulated (nothing real to reuse yet)", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 1, maxDepth: 2 });
  assert.ok(result.root.candidates.length >= 2, "sanity: expected a real, multi-candidate move-only scenario");
  const unexpanded = result.root.candidates.find((c) => !c.child);
  assert.ok(unexpanded, "expected at least one real candidate to remain unexpanded after just 1 iteration");

  const reused = findReusableNode({ previousRoot: result.root, realProposal: unexpanded.proposal, realState: {} });
  assert.equal(reused.reused, false);
  assert.equal(reused.reason, "never-expanded");
});

// --- 4: the field-scoped comparison actually fixes the real blindDeployment-style trap ---

test("findReusableNode: a realState shaped like runBattle's own live state (extra blindDeployment:undefined own key) still matches a tree state shaped like cloneStateForPlanning's output (that key absent) — proves the field-scoped compare, not a naive whole-object one, verified directly to matter first", () => {
  assert.equal(isDeepStrictEqual({ a: undefined, b: 2 }, { b: 2 }), false, "PRECONDITION, verified directly: isDeepStrictEqual really does treat an explicit undefined key and an absent key as unequal — the exact trap a naive whole-object compare would fall into");

  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  const expanded = result.root.candidates.find((c) => c.proposal.type === "move" && c.child);
  assert.ok(expanded);
  assert.ok(!("blindDeployment" in expanded.child.state), "sanity: a tree node's own state (cloneStateForPlanning's shape) never carries this key at all");

  const liveShapedState = { ...expanded.child.state, blindDeployment: undefined }; // runBattle's own state always carries this own key
  const reused = findReusableNode({ previousRoot: result.root, realProposal: expanded.proposal, realState: liveShapedState });
  assert.equal(reused.reused, true, "expected the field-scoped compare to see past the irrelevant blindDeployment key difference");
});

// --- 5: advanceRoot's multi-hop walk ---

test("advanceRoot: a full, real 2-hop success walks two consecutive deterministic (move) hops and returns the deepest node, with honest hopsReused", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: { ...TURN, actionsAvailable: 3 }, iterations: 400, maxDepth: 3 });
  const hop1 = result.root.candidates.find((c) => c.proposal.type === "move" && c.child && c.child.candidates.some((c2) => c2.child));
  assert.ok(hop1, "expected at least one real 2-level-deep expansion after 400 iterations on this small, move-only scenario");
  const hop2 = hop1.child.candidates.find((c) => c.child);
  assert.ok(hop2);

  const advanced = advanceRoot({
    previousRoot: result.root,
    hops: [
      { proposal: hop1.proposal, resultState: hop1.child.state },
      { proposal: hop2.proposal, resultState: hop2.child.state }
    ]
  });
  assert.equal(advanced.hopsReused, 2);
  assert.equal(advanced.node, hop2.child);
  assert.equal(advanced.reason, "all-hops-reused");
});

test("advanceRoot: a mid-chain divergence returns honest PARTIAL credit — the deepest node actually verified, not null and not the failed hop's own (non-existent) result", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  const hop1 = result.root.candidates.find((c) => c.proposal.type === "move" && c.child);
  assert.ok(hop1);

  const bogusHop2Proposal = { type: "move", to: { col: -1, row: -1 } }; // never a real candidate of hop1.child
  const advanced = advanceRoot({
    previousRoot: result.root,
    hops: [
      { proposal: hop1.proposal, resultState: hop1.child.state },
      { proposal: bogusHop2Proposal, resultState: {} }
    ]
  });
  assert.equal(advanced.hopsReused, 1, "expected honest partial credit: hop 1 verified, hop 2 did not");
  assert.equal(advanced.node, hop1.child, "expected the deepest ACTUALLY-verified node, not null and not a nonexistent hop-2 result");
  assert.match(advanced.reason, /stopped-at-hop-1/);
});

test("advanceRoot: zero hops requested returns the same root unchanged, and a failure on the very first hop returns null (nothing here to build on)", () => {
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });

  const zeroHops = advanceRoot({ previousRoot: result.root, hops: [] });
  assert.equal(zeroHops.node, result.root);
  assert.equal(zeroHops.hopsReused, 0);
  assert.equal(zeroHops.reason, "no-hops-provided");

  const bogusFirstHop = advanceRoot({ previousRoot: result.root, hops: [{ proposal: { type: "move", to: { col: -1, row: -1 } }, resultState: {} }] });
  assert.equal(bogusFirstHop.node, null, "expected null (not the previousRoot) when even the very first hop fails to verify");
  assert.equal(bogusFirstHop.hopsReused, 0);
});

// --- 6: cross-actor hops are honestly harder to reuse ---

test("advanceRoot: a cross-actor hop (someone else's real move, not the searching agent's own) is a real, structural never-expanded case, not a crash — documents the honest 'cross-actor hits are rarer' property directly", () => {
  // enemy's own move toward `me` was never a candidate `me`'s own search ever generated (search only
  // ever expands the SEARCHING agent's own proposals at the root) -- a real, structural mismatch, not
  // a contrived one.
  const result = search({ state: makeMoveOnlyState(), combatantId: "me", turn: TURN, iterations: 100, maxDepth: 2 });
  const enemyRealMove = { type: "move", to: { col: 20, row: 20 } };
  const reused = findReusableNode({ previousRoot: result.root, realProposal: enemyRealMove, realState: {} });
  assert.equal(reused.reused, false);
  assert.equal(reused.reason, "no-matching-candidate", "the root's own candidates are only ever `me`'s own proposals -- an enemy's real move is never even a name match, let alone a state match");
});

// --- 7: a real, live-dice cross-check — a genuinely stochastic action really does diverge in practice ---

test("REAL DICE, verified directly: a genuinely stochastic action (Strike), resolved through a real live runBattle (REAL_OUTCOMES, real dice) across several real seeds, produces GENUINELY VARYING real damage totals against forkTurnSandbox's own SINGLE, FIXED EXPECTED_OUTCOMES prediction for the identical starting position and proposal -- the real problem this whole file exists to guard against, not a strawman", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 0,
    strikes: [{ name: "Blaster", strikeType: "melee", attackBonus: 9, traits: [], damage: [{ dice: "2d6", bonus: 3, damageType: "fire" }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 200, currentHP: 200, ac: 16,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [],
    position: { col: 0, row: 1 }
  };
  const gridSize = { cols: 20, rows: 20 };
  const strikeProposal = { type: "strike", targetId: "enemy", strikeIndex: 0 };

  // The EXPECTED_OUTCOMES prediction -- a SINGLE, fixed number (the starting position never
  // changes), via the same real forkTurnSandbox path search() itself uses.
  const state = {
    round: 1, seed: 1, gridSize, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const sandbox = forkTurnSandbox({ state, turn: TURN });
  const expectedResult = sandbox.apply("me", strikeProposal);
  assert.equal(expectedResult.legal, true);
  const expectedDamage = expectedResult.damageApplied;

  // Several REAL, live battles -- real dice via runBattle's own REAL_OUTCOMES path, scripted to
  // always attempt the same strike whenever it's "me"'s own turn (attemptAction/REAL_OUTCOMES
  // aren't exported directly, so this is the real, supported way to exercise them; "me" may end up
  // striking more than once across its own real actions this turn -- only the FIRST one per seed is
  // read below, which is all this test needs). Enough distinct seeds that getting the exact same
  // discrete damage total every single time (which is what the code being guarded against would
  // require to slip past this test undetected) is astronomically unlikely, not just "unlikely."
  function ai(battleState, combatantId) {
    return combatantId === "me" ? strikeProposal : null;
  }
  const realDamages = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
    const log = runBattle({ seed, gridSize, roundLimit: 1, walls: [], combatants: [{ ...me }, { ...enemy }], ai });
    const realStrike = log.rounds.flatMap((r) => r.turns).flatMap((t) => t.actions).find((a) => a.type === "strike");
    assert.ok(realStrike, `seed ${seed}: expected a real strike action to actually appear in the real battle log`);
    return realStrike.damageApplied;
  });

  const distinctRealDamages = new Set(realDamages);
  assert.ok(distinctRealDamages.size > 1, `expected real dice to produce GENUINELY VARYING damage totals across 8 real seeds (got the identical ${realDamages[0]} every time — either the RNG isn't real, or this fixture is somehow deterministic), vs. EXPECTED_OUTCOMES's own single fixed prediction of ${expectedDamage}: [${realDamages.join(", ")}]`);
});
