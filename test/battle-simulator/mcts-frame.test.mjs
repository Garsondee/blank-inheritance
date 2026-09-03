/**
 * End-to-end tests for the Frame-scale port of plain-UCT MCTS (design doc §73, GH issue #20) — the
 * first search file ported off personnel-only imports, all the way through to a real, registered
 * dual-scale policy (`mcts-uct-v1`). Deliberately NOT reusing `data/combatants.mjs`/
 * `archetype-fixtures.mjs` (draft, to be redone later with a real chargen pass) — a minimal, hand-built
 * synthetic fixture, matching this project's own established personnel-MCTS test style and the real
 * Frame-scale fixture shape already proven working in `lookahead.test.mjs`'s own dual-adapter test.
 *
 * The fixture deliberately puts BOTH of Frame-scale's real, structurally-different mechanics in play,
 * not just rescaled arithmetic: `me` sits in the CRITICAL damage band (resolveEffectiveStats caps it
 * to a single action/turn — a real, scale-differentiating mechanic personnel-scale has no equivalent
 * of), and `enemy` carries a real `stunnedRounds: 1` — with `me` capped to exactly one action, EVERY
 * root-level expansion exhausts `me`'s whole turn on its first ply, so the very first real tree edge
 * built by the search walks straight through `advanceToNextActor`'s stunnedRounds skip-and-decrement
 * (design doc §73's Decision 2) — this is exercised through the REAL `mcts.mjs`/`expandOneChild` path
 * on every run, not left to MCTS's own selection to stumble onto it. The isolated, deterministic unit
 * test for the skip-and-decrement mechanic itself lives in `tree-shared-adapter.test.mjs`; this file's
 * job is proving the whole path composes without crashing and produces a real, legal decision.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { search } from "../../tools/battle-simulator/personnel-engine/search/mcts.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { FRAME_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/frame-adapter.mjs";
import { DEFAULT_WEIGHTS as PERSONNEL_DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import "../../tools/battle-simulator/ai-common/policies/mcts-uct.mjs";

function makeFrameSkirmish() {
  const me = {
    id: "me", name: "Me", side: "party", kind: "frame", size: "huge",
    currentHP: 30, maxHP: 100, // CRITICAL damage band (pct 0.3 <= 1/3) -- resolveEffectiveStats caps actionsAvailable to 1
    ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", kind: "claimant", size: "huge",
    currentHP: 100, maxHP: 100,
    stunnedRounds: 1, // real, deterministic -- must be skipped AND decremented, never crash the search
    speed: 0,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 1 }
  };
  const state = {
    round: 1, seed: 11, gridSize: { cols: 44, rows: 44 },
    initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 150 } };
  return { state, turn };
}

test("mcts.mjs search(): runs against FRAME_ADAPTER, producing a real, legal Frame-scale decision, and really walks through the stunnedRounds skip-and-decrement on its very first expansion", () => {
  const { state, turn } = makeFrameSkirmish();
  const result = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 4, adapter: FRAME_ADAPTER });
  assert.ok(result.bestProposal, "expected a real bestProposal, not null");
  assert.ok(result.root.children.size > 0, "expected the search to have really expanded past the root -- proof it walked through the enemy's stunnedRounds skip without crashing");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  const applied = sandbox.apply("me", result.bestProposal);
  assert.equal(applied.legal, true, `mcts.mjs's own Frame-scale choice must be real and legal: ${JSON.stringify(result.bestProposal)}`);
});

test("mcts-uct-v1: registered policy also works end-to-end on FRAME_ADAPTER through the real registry (decideWithPolicy), not just via a direct search() call", () => {
  assert.ok(listPolicyIds().includes("mcts-uct-v1"));
  const { state, turn } = makeFrameSkirmish();
  const decision = decideWithPolicy("mcts-uct-v1", FRAME_ADAPTER, state, "me", turn, { iterations: 100, maxDepth: 4 });
  assert.ok(decision, "expected a real decision from mcts-uct-v1 through the registry on Frame-scale");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});

test("mcts.mjs search(): adapter supplied with weights omitted uses the ADAPTER's own real DEFAULT_WEIGHTS, never silently falling back to personnel's own (which lacks Frame-only weight terms this state's own damage-banded combatant actually exercises)", () => {
  const { state, turn } = makeFrameSkirmish();
  // maxDepth: 0 forces the root itself to be a horizon leaf, so search() takes its early-return
  // path and reports engine.evaluateState(state, rootSide, weights) directly -- the exact
  // computation whose weights default was the review's own concern.
  const result = search({ state, combatantId: "me", turn, iterations: 100, maxDepth: 0, adapter: FRAME_ADAPTER });
  const realFrameValue = FRAME_ADAPTER.evaluateState(state, "party", FRAME_ADAPTER.DEFAULT_WEIGHTS);
  assert.equal(result.meanValue, realFrameValue, "search() must have used FRAME_ADAPTER's own real DEFAULT_WEIGHTS when weights was omitted");
  assert.ok(Number.isFinite(result.meanValue), "a real Frame-scale evaluation must be a finite number");
  // Proof personnel's weights would NOT have been a safe silent substitute: `me` sits in the
  // CRITICAL damage band, so evaluateState's actionsLost(...) branch is genuinely exercised --
  // personnel's own DEFAULT_WEIGHTS has no `actionDenial` field at all (renamed away, design doc
  // §42/§44's own tempoDenial/maneuverTempoDenial split), so applying it to Frame's evaluator
  // poisons the whole score with a real NaN, not just a "different but plausible" number.
  const wouldBeWithPersonnelWeights = FRAME_ADAPTER.evaluateState(state, "party", PERSONNEL_DEFAULT_WEIGHTS);
  assert.ok(Number.isNaN(wouldBeWithPersonnelWeights), "expected personnel's own DEFAULT_WEIGHTS to be a genuinely unsafe substitute on Frame's evaluator for this state, not merely a different number");
});
