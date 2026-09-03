/**
 * Integration tests for subtree reuse's own resume-from-a-reused-node entry point in
 * personnel-engine/search/mcts-puct.mjs (`continueSearch`, design doc §69, GH issue #6 step 7, part
 * 2 of 3). `subtree-reuse.test.mjs` already covers the pure matching logic (`findReusableNode`/
 * `advanceRoot`) directly; this file covers what happens once a real, verified reuse is actually
 * CONTINUED as a search: the depth-offset correctness property, the MCTS-Solver interaction, the real
 * measured efficiency gain, the caller-error guards, and a realistic end-to-end lifecycle.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { search, continueSearch } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { findReusableNode, advanceRoot } from "../../tools/battle-simulator/personnel-engine/search/subtree-reuse.mjs";
import { resetSandboxForkCount, getSandboxForkCount } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";

/** `me` alone (no strikes) with a real objective, plus a harmless, distant, immobile `enemy` purely
 * so `checkOutcome` doesn't fire immediately on an empty opposition side. Every real candidate is a
 * MOVE — deterministic, so a hand-picked candidate's own predicted state is always a sound "real"
 * result for it, letting these tests build real, verified reuse chains without needing a live battle. */
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

// --- 1: depth preservation — the headline correctness property, checked structurally ---

test("continueSearch: a node frozen horizon:true under the ORIGINAL search's own (smaller) ceiling is reopened, with real, non-empty candidates, under the LARGER effective ceiling continueSearch's own depth-offset provides — not left silently stuck at the old, stale depth", () => {
  // actionsAvailable generously above maxDepth so the frozen node's own actor still has real,
  // legal further moves once reopened — proving genuine depth was gained, not just an empty
  // candidate list recomputed for an actor who'd have run out of actions anyway.
  const turn = { actionsAvailable: 5, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeMoveOnlyState(), combatantId: "me", turn, iterations: 400, maxDepth: 2 });

  const depth1 = original.root.candidates.find((c) => c.child && c.child.candidates.length);
  assert.ok(depth1, "expected at least one real depth-1 expansion with its own real candidates");
  const depth2Candidate = depth1.child.candidates.find((c) => c.child);
  assert.ok(depth2Candidate, "expected at least one real depth-2 expansion after 400 iterations on this small, move-only scenario");

  const frozen = depth2Candidate.child;
  assert.equal(frozen.horizon, true, "PRECONDITION, verified directly: this node really is frozen at the original maxDepth=2 ceiling");
  assert.equal(frozen.candidates.length, 0, "PRECONDITION: a horizon node's own candidates are never populated");
  assert.equal(frozen.terminal, false, "PRECONDITION: this is a depth-cap freeze, not a real game-over");

  const hop = findReusableNode({ previousRoot: original.root, realProposal: depth1.proposal, realState: depth1.child.state });
  assert.equal(hop.reused, true);
  assert.equal(hop.node, depth1.child);

  continueSearch({ reused: hop, combatantId: "me", iterations: 500, maxDepth: 2 }); // effectiveMaxDepth = depth1.child.depth(1) + 2 = 3

  assert.equal(frozen.horizon, false, "expected the SAME node (checked by reference) to have been reopened, not left stuck");
  assert.ok(frozen.candidates.length > 0, "expected real, non-empty candidates once reopened — this actor genuinely still had legal moves left");
});

// --- 2: a reused root that's already MCTS-Solver-proven ---

function makeCloseAndKillState() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 30,
    strikes: [{ name: "Blaster", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "fire" }] }],
    position: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 20, currentHP: 1, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [],
    position: { col: 12, row: 10 } // 2 squares away -- one Stride closes to melee reach
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
}

test("continueSearch: a reused root that the ORIGINAL search already proved (MCTS-Solver) is handled correctly — no crash, zero new iterations needed, the real certain answer returned (headline correctness case: markProven sets terminal WITHOUT clearing candidates, breaking the old terminal||candidates.length===0 guard's own long-standing invariant for the first time)", () => {
  const turn = { actionsAvailable: 2, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeCloseAndKillState(), combatantId: "me", turn, iterations: 300, maxDepth: 2, useSolver: true });

  const moveIn = original.root.candidates.find((c) => c.proposal.type === "move" && c.child && c.child.proven === "win");
  assert.ok(moveIn, "expected the original search to have already PROVEN the post-move node a win (the follow-up strike is a guaranteed kill) within 300 iterations");

  const hop = findReusableNode({ previousRoot: original.root, realProposal: moveIn.proposal, realState: moveIn.child.state });
  assert.equal(hop.reused, true);
  assert.equal(hop.node.terminal, true, "PRECONDITION, verified directly: the reused node really is already solver-proven, with a real, non-empty candidate list (markProven never clears candidates) -- exactly the case the old guard would have silently discarded");
  assert.ok(hop.node.candidates.length > 0);

  const result = continueSearch({ reused: hop, combatantId: "me", iterations: 300, maxDepth: 2, useSolver: true });
  assert.equal(result.iterations, 0, "expected zero NEW iterations -- the proof already stood, nothing left to learn");
  assert.equal(result.bestProposal.type, "strike");
  assert.ok(result.meanValue > 1000, `expected a real WIN sentinel as the mean value, got ${result.meanValue}`);
});

// --- 3: real, measured efficiency — two independent signals ---

test("continueSearch: measurably fewer NEW sandbox forks than an equivalent fresh search from the identical real position, and a higher total visit count after the same number of NEW iterations (the reused candidate's own prior visits carry forward, not discarded)", () => {
  const turn = { actionsAvailable: 5, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeMoveOnlyState(), combatantId: "me", turn, iterations: 100, maxDepth: 2 });
  const hopCandidate = original.root.candidates.find((c) => c.child);
  assert.ok(hopCandidate);
  const hop = findReusableNode({ previousRoot: original.root, realProposal: hopCandidate.proposal, realState: hopCandidate.child.state });
  assert.equal(hop.reused, true);
  const inheritedVisits = hop.node.candidates.reduce((sum, c) => sum + c.visits, 0);

  const NEW_ITERATIONS = 60;

  resetSandboxForkCount();
  const freshFromSamePoint = search({ state: hop.node.state, combatantId: "me", turn: hop.node.actor.turn, iterations: NEW_ITERATIONS, maxDepth: 2 });
  const freshForks = getSandboxForkCount();

  resetSandboxForkCount();
  const continued = continueSearch({ reused: hop, combatantId: "me", iterations: NEW_ITERATIONS, maxDepth: 2 });
  const continuedForks = getSandboxForkCount();

  assert.ok(continuedForks < freshForks, `expected continueSearch to spend measurably FEWER real sandbox forks than an equivalent fresh search from the identical position (computeCandidates's own root-level forks are skipped for an already-expanded reused root) — got ${continuedForks} vs ${freshForks}`);

  const continuedTotalVisits = continued.root.candidates.reduce((sum, c) => sum + c.visits, 0);
  const freshTotalVisits = freshFromSamePoint.root.candidates.reduce((sum, c) => sum + c.visits, 0);
  assert.ok(inheritedVisits > 0, "sanity: the reused root really did carry real, nonzero prior visits into this comparison");
  assert.equal(continuedTotalVisits, inheritedVisits + NEW_ITERATIONS, "expected the reused root's own total visits to be exactly its inherited visits PLUS the new iterations — nothing discarded");
  assert.ok(continuedTotalVisits > freshTotalVisits, `expected the reused search's own total visits (${continuedTotalVisits}) to exceed the fresh search's (${freshTotalVisits}) after the same ${NEW_ITERATIONS} new iterations, since the reused root started with real, nonzero prior visits`);
});

// --- 4: weights/tau mismatch is refused, not silently corrupting ---

test("continueSearch: refuses to resume with different weights or tau than the reused subtree was originally built with, rather than silently corrupting its accumulated statistics", () => {
  const turn = { actionsAvailable: 5, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeMoveOnlyState(), combatantId: "me", turn, iterations: 50, maxDepth: 2 });
  const hopCandidate = original.root.candidates.find((c) => c.child);
  const hop = findReusableNode({ previousRoot: original.root, realProposal: hopCandidate.proposal, realState: hopCandidate.child.state });
  assert.equal(hop.reused, true);

  assert.throws(
    () => continueSearch({ reused: hop, combatantId: "me", weights: { ...DEFAULT_WEIGHTS, pileOnRisk: 99 } }),
    /weights\/tau must match/
  );
  assert.throws(
    () => continueSearch({ reused: hop, combatantId: "me", tau: 999 }),
    /weights\/tau must match/
  );
  // Sanity: the SAME weights/tau the subtree was actually built with (defaults, both sides) is fine.
  assert.doesNotThrow(() => continueSearch({ reused: hop, combatantId: "me", iterations: 5 }));
});

// --- 5: caller-error guards ---

test("continueSearch: throws clearly on a missing reused.node and on a combatantId mismatch — real caller errors, not silent misbehavior", () => {
  assert.throws(() => continueSearch({ reused: { node: null }, combatantId: "me" }), /reused\.node is required/);
  assert.throws(() => continueSearch({ reused: {}, combatantId: "me" }), /reused\.node is required/);

  const turn = { actionsAvailable: 5, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeMoveOnlyState(), combatantId: "me", turn, iterations: 50, maxDepth: 2 });
  const hopCandidate = original.root.candidates.find((c) => c.child);
  const hop = findReusableNode({ previousRoot: original.root, realProposal: hopCandidate.proposal, realState: hopCandidate.child.state });

  assert.throws(() => continueSearch({ reused: hop, combatantId: "enemy" }), /reused node belongs to "me", not the requested "enemy"/);
});

// --- 6: a realistic end-to-end lifecycle ---

test("REALISTIC LIFECYCLE: decide -> move (deterministic, reuse succeeds) -> decide -> strike (stochastic, so the NEXT reuse attempt correctly fails and falls back to fresh) -- advanceRoot's own honest partial credit is exactly what a real caller would act on", () => {
  const turn = { actionsAvailable: 5, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeMoveOnlyState(), combatantId: "me", turn, iterations: 100, maxDepth: 2 });
  const moveHop = original.root.candidates.find((c) => c.proposal.type === "move" && c.child);
  assert.ok(moveHop);

  // Hop 2: the SAME candidate's own proposal, but a "real" resulting state that genuinely diverges
  // from the tree's own prediction -- standing in for a real stochastic action's actual dice outcome
  // (subtree-reuse.test.mjs's own REAL DICE test already proves this divergence really happens; this
  // test's own job is proving advanceRoot/a real caller correctly falls back when it does).
  const divergedState = {
    ...moveHop.child.state,
    combatants: new Map(moveHop.child.state.combatants),
    positions: new Map(moveHop.child.state.positions)
  };
  divergedState.combatants.set("enemy", { ...divergedState.combatants.get("enemy"), currentHP: 5 });

  const advanced = advanceRoot({
    previousRoot: original.root,
    hops: [
      { proposal: moveHop.proposal, resultState: moveHop.child.state }, // real, sound
      { proposal: { type: "strike", targetId: "enemy", strikeIndex: 0 }, resultState: divergedState } // real, diverged
    ]
  });
  assert.equal(advanced.hopsReused, 1, "expected exactly the first, sound hop to be reused");
  assert.equal(advanced.node, moveHop.child);

  // A real caller's own pattern: continue from whatever advanceRoot actually verified.
  const continued = continueSearch({ reused: advanced, combatantId: "me", iterations: 20, maxDepth: 2 });
  assert.ok(continued.bestProposal, "expected a real, legal decision from the partially-reused subtree");
});

// --- 7: builtAdapterId must be stamped at BOTH real node-construction sites (design doc §74, GH
// issue #20) — not just makeNode. Found by adversarial review before any code shipped: runIteration's
// own inline forced-node object (the stochasticGap/noActor case) already hand-duplicates
// builtWeights/builtTau without going through makeNode at all, so a naive "stamp it in makeNode only"
// implementation of the new cross-scale-mismatch guard would leave THIS path's own builtAdapterId
// undefined, and continueSearch's new check would then throw a false-positive caller-error on a
// completely legitimate, adapter-less, personnel-only continuation reached this way.

/** `downed`, unconscious (real personnel dying-rules shape — party side, currentHP 0, dyingValue
 * below 4), sits right after `me` in initiative order. `me`'s own single available action guarantees
 * its whole turn is exhausted on the very first real expansion, so `advanceToNextActor` reaches
 * `downed` and returns `stochasticGap` deterministically — the exact path that builds a node inline
 * in `runIteration`, not through `makeNode`. */
function makeStochasticGapState() {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17,
    saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [],
    position: { col: 0, row: 0 }, objective: { col: 20, row: 0 }
  };
  const downed = {
    id: "downed", name: "Downed", side: "party", maxHP: 20, currentHP: 0, dyingValue: 0, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [],
    position: { col: 5, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [],
    position: { col: 25, row: 25 }
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], initiativeOrder: ["me", "downed", "enemy"],
    combatants: new Map([["me", me], ["downed", downed], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["downed", downed.position], ["enemy", enemy.position]])
  };
}

test("continueSearch: a reused node reached via the stochasticGap forced-node path (built inline in runIteration, NOT through makeNode) still carries a real builtAdapterId — resuming it (personnel-scale, adapter omitted) must NOT throw a false-positive adapter-mismatch error", () => {
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const original = search({ state: makeStochasticGapState(), combatantId: "me", turn, iterations: 20, maxDepth: 2 });

  const forcedChild = original.root.candidates.find((c) => c.child && c.child.horizon && !c.child.terminal && c.child.candidates.length === 0);
  assert.ok(forcedChild, "expected at least one real depth-1 child reached via the stochasticGap forced-node path (me's single action exhausts its turn, downed is unconscious)");

  const hop = findReusableNode({ previousRoot: original.root, realProposal: forcedChild.proposal, realState: forcedChild.child.state });
  assert.equal(hop.reused, true);
  assert.equal(hop.node, forcedChild.child, "PRECONDITION: this really is the inline-constructed forced node, not one built through makeNode");

  assert.doesNotThrow(
    () => continueSearch({ reused: hop, combatantId: "me", iterations: 5, maxDepth: 2 }),
    "a personnel-only reuse through the stochasticGap forced-node path must not spuriously throw an adapter-mismatch error"
  );
});
