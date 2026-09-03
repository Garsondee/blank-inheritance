/**
 * End-to-end tests for the Frame-scale port of PUCT + progressive widening + MCTS-Solver +
 * subtree-reuse-resume (design doc §74, GH issue #20) — the second search file ported off
 * personnel-only imports, after `mcts.mjs`'s own first slice (§73, `mcts-frame.test.mjs`). Minimal,
 * hand-built synthetic fixtures throughout, matching this project's own established style — not the
 * draft `data/combatants.mjs`/`archetype-fixtures.mjs` factories.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { search, continueSearch } from "../../tools/battle-simulator/personnel-engine/search/mcts-puct.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { FRAME_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/frame-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import { DEFAULT_WEIGHTS as PERSONNEL_DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-puct-solver.mjs";

/** `me` capped to exactly 1 action/turn (CRITICAL damage band — pct 0.3 <= 1/3), `enemy` carrying a
 * real, deterministic `stunnedRounds: 1` — same fixture shape `mcts-frame.test.mjs` already proved
 * out for `mcts.mjs`. With actionsAvailable:1, EVERY root-level expansion exhausts `me`'s whole turn
 * on its first ply, so every real expanded child represents `me`'s OWN next turn (round 2), the
 * enemy's stun correctly skipped along the way — the node whose own `actor.turn.actionsAvailable`
 * proves whether `conditions` was really threaded into `runIteration`'s own `nextActorAfterAction`
 * call, not silently defaulted to personnel's unconditional actionsAvailable:3. */
function makeFramePuctSkirmish() {
  const me = {
    id: "me", name: "Me", side: "party", kind: "frame", size: "huge",
    currentHP: 30, maxHP: 100, // CRITICAL band
    ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", kind: "claimant", size: "huge",
    currentHP: 100, maxHP: 100,
    stunnedRounds: 1,
    speed: 0,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 13, gridSize: { cols: 44, rows: 44 },
    initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 150 } };
  return { state, turn };
}

/** A trivially-lethal Frame-scale skirmish for MCTS-Solver: `enemy` at 1 HP, adjacent, `me`'s strike
 * whose deterministic EXPECTED_OUTCOMES damage guarantees the kill — the same shape as
 * `mcts-puct-subtree-reuse.test.mjs`'s own personnel-scale `makeCloseAndKillState`, Frame-scaled. */
function makeFrameGuaranteedKillSkirmish() {
  const me = {
    id: "me", name: "Me", side: "party", size: "huge", currentHP: 100, maxHP: 100,
    ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Blaster", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "fire" }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", size: "huge", currentHP: 1, maxHP: 100,
    ac: 15, hardness: 0, speed: 0, strikes: [],
    position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 3, gridSize: { cols: 20, rows: 20 },
    initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  return { state, turn };
}

test("mcts-puct.mjs search(): runs against FRAME_ADAPTER, producing a real, legal Frame-scale decision", () => {
  const { state, turn } = makeFramePuctSkirmish();
  const result = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 4, adapter: FRAME_ADAPTER });
  assert.ok(result.bestProposal, "expected a real bestProposal, not null");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", result.bestProposal).legal, true);
});

test("mcts-puct.mjs search(): conditions really is threaded into runIteration's own nextActorAfterAction call — a reached child node's actionsAvailable reflects Frame's real CRITICAL-band cap (1), not personnel's unconditional fallback (3)", () => {
  const { state, turn } = makeFramePuctSkirmish();
  const result = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 4, adapter: FRAME_ADAPTER });
  const withChild = result.root.candidates.find((c) => c.child);
  assert.ok(withChild, "expected at least one real expanded child (me's single action always exhausts its turn)");
  assert.equal(withChild.child.actor.actingId, "me", "expected the enemy's stun to be skipped, wrapping straight back to me's own next turn");
  assert.equal(withChild.child.actor.turn.actionsAvailable, 1, "expected Frame's own real CRITICAL-band action cap, not personnel's resolveEffectiveStats always returning 3 for a living combatant");
});

test("mcts-puct.mjs search(): useSolver:true genuinely proves a real guaranteed win cross-scale on FRAME_ADAPTER — MCTS-Solver's own proven-propagation logic fires correctly, not just avoids crashing", () => {
  const { state, turn } = makeFrameGuaranteedKillSkirmish();
  const result = search({ state, combatantId: "me", turn, iterations: 200, maxDepth: 2, useSolver: true, adapter: FRAME_ADAPTER });
  assert.equal(result.root.proven, "win", `expected MCTS-Solver to prove this a real guaranteed win, got proven=${result.root.proven}`);
  assert.ok(result.bestProposal, "expected a real bestProposal from the solver-aware selection path");
});

test("mcts-puct-v1: registered policy works end-to-end on FRAME_ADAPTER through the real registry", () => {
  assert.ok(listPolicyIds().includes("mcts-puct-v1"));
  const { state, turn } = makeFramePuctSkirmish();
  const decision = decideWithPolicy("mcts-puct-v1", FRAME_ADAPTER, state, "me", turn, { iterations: 100, maxDepth: 4 });
  assert.ok(decision, "expected a real decision from mcts-puct-v1 on Frame-scale");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});

test("mcts-puct-solver-v1: registered policy works end-to-end on FRAME_ADAPTER through the real registry", () => {
  assert.ok(listPolicyIds().includes("mcts-puct-solver-v1"));
  const { state, turn } = makeFrameGuaranteedKillSkirmish();
  const decision = decideWithPolicy("mcts-puct-solver-v1", FRAME_ADAPTER, state, "me", turn, { iterations: 200, maxDepth: 2 });
  assert.ok(decision, "expected a real decision from mcts-puct-solver-v1 on Frame-scale");
  assert.match(decision.reason, /proven=win/, `expected the composed reason to report the real solver proof, got: "${decision.reason}"`);
});

test("mcts-puct.mjs search(): adapter supplied with weights omitted uses the ADAPTER's own real DEFAULT_WEIGHTS, never silently falling back to personnel's own", () => {
  const { state, turn } = makeFramePuctSkirmish();
  const result = search({ state, combatantId: "me", turn, iterations: 50, maxDepth: 0, adapter: FRAME_ADAPTER });
  const realFrameValue = FRAME_ADAPTER.evaluateState(state, "party", FRAME_ADAPTER.DEFAULT_WEIGHTS);
  assert.equal(result.meanValue, realFrameValue, "search() must have used FRAME_ADAPTER's own real DEFAULT_WEIGHTS when weights was omitted");
  assert.ok(Number.isFinite(result.meanValue));
  const wouldBeWithPersonnelWeights = FRAME_ADAPTER.evaluateState(state, "party", PERSONNEL_DEFAULT_WEIGHTS);
  assert.ok(Number.isNaN(wouldBeWithPersonnelWeights), "expected personnel's own DEFAULT_WEIGHTS to be a genuinely unsafe substitute on Frame's evaluator for this CRITICAL-band state");
});

test("continueSearch: works end-to-end with adapter: FRAME_ADAPTER — a real expanded child from a Frame-scale search resumes correctly", () => {
  const { state, turn } = makeFramePuctSkirmish();
  const original = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 4, adapter: FRAME_ADAPTER });
  const withChild = original.root.candidates.find((c) => c.child);
  assert.ok(withChild, "expected a real expanded child to resume from");

  const reused = { node: withChild.child };
  const continued = continueSearch({ reused, combatantId: "me", iterations: 20, maxDepth: 2, adapter: FRAME_ADAPTER });
  assert.ok(continued.bestProposal, "expected a real, legal decision from the resumed Frame-scale subtree");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state: withChild.child.state, turn: withChild.child.actor.turn });
  assert.equal(sandbox.apply("me", continued.bestProposal).legal, true);
});

test("continueSearch: throws clearly when resuming a Frame-built subtree with a mismatched adapter — the new builtAdapterId guard", () => {
  const { state, turn } = makeFramePuctSkirmish();
  const original = search({ state, combatantId: "me", turn, iterations: 50, maxDepth: 4, adapter: FRAME_ADAPTER });
  const withChild = original.root.candidates.find((c) => c.child);
  assert.ok(withChild);
  const reused = { node: withChild.child };

  // weights explicitly matched to what the tree was actually built with, so ONLY the adapter
  // mismatch is under test here -- not masked by the pre-existing weights/tau check.
  assert.throws(
    () => continueSearch({ reused, combatantId: "me", weights: FRAME_ADAPTER.DEFAULT_WEIGHTS, adapter: PERSONNEL_ADAPTER }),
    /built against adapter "frame", not "personnel"/
  );
  // adapter omitted (defaults to personnel's own engine) must ALSO be caught, not just an explicit mismatch.
  assert.throws(
    () => continueSearch({ reused, combatantId: "me", weights: FRAME_ADAPTER.DEFAULT_WEIGHTS }),
    /built against adapter "frame", not "personnel"/
  );
  // sanity: the SAME adapter it was actually built with is fine.
  assert.doesNotThrow(() => continueSearch({ reused, combatantId: "me", adapter: FRAME_ADAPTER, iterations: 5 }));
});
