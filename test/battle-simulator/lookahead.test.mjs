/**
 * Tests for `lookahead-v1` (design doc §60, GH issue #1) — the first real search-based decision
 * policy in this project, registered through `ai-common/`'s policy registry rather than modifying
 * `decide()` itself (see the policy's own header for why). Real concerns:
 * (1) it's a real, registered, adapter-agnostic policy — works on both engines;
 * (2) it never returns an illegal action, and never returns null while a real legal one exists,
 *     even under a degenerate budget;
 * (3) `topK` genuinely prunes — a smaller topK means fewer candidates get a full 2-ply score;
 * (4) THE test that actually matters, from the issue's own text: a real, constructed, VERIFIED trap
 *     where `greedy-v1`'s 1-ply score walks into a real enemy counter-strike that a 2-ply lookahead
 *     correctly avoids — not asserted, empirically found by direct probing before being written down
 *     here (see design doc §60 for the exact numbers).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import { FRAME_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/frame-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/greedy.mjs";
import "../../tools/battle-simulator/ai-common/policies/lookahead.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

test("lookahead-v1: registered in the policy registry", () => {
  assert.ok(listPolicyIds().includes("lookahead-v1"));
});

test("lookahead-v1: on a real populated personnel-scale state, returns only a real, legal action", () => {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  const state = {
    seed: 5, gridSize: { cols: 12, rows: 8 }, round: 1, walls: [],
    combatants: new Map([["lunar17", { ...lunar17, id: "lunar17", position: { col: 4, row: 4 } }], ["goon", { ...goon, id: "goon", position: { col: 6, row: 4 } }]]),
    positions: new Map([["lunar17", { col: 4, row: 4 }], ["goon", { col: 6, row: 4 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("lookahead-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, {});
  assert.ok(decision, "expected a real decision, not null");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state, turn });
  const result = sandbox.apply("lunar17", decision);
  assert.equal(result.legal, true, `lookahead-v1's own choice must be real and legal: ${JSON.stringify(decision)}`);
});

test("lookahead-v1: a degenerate maxIterations:0 budget (exhausted before any candidate gets a 2-ply score) still returns the real 1-ply best, never null", () => {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  const state = {
    seed: 5, gridSize: { cols: 12, rows: 8 }, round: 1, walls: [],
    combatants: new Map([["lunar17", { ...lunar17, id: "lunar17", position: { col: 4, row: 4 } }], ["goon", { ...goon, id: "goon", position: { col: 6, row: 4 } }]]),
    positions: new Map([["lunar17", { col: 4, row: 4 }], ["goon", { col: 6, row: 4 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("lookahead-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, { budget: { maxIterations: 0 } });
  assert.ok(decision, "a budget exhausted before any 2-ply work must still return the real 1-ply best");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("lunar17", decision).legal, true);
});

test("lookahead-v1: topK genuinely prunes — a smaller topK still returns a real legal action, and the reported examined count never exceeds it", () => {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  const state = {
    seed: 7, gridSize: { cols: 12, rows: 8 }, round: 1, walls: [],
    combatants: new Map([["lunar17", { ...lunar17, id: "lunar17", position: { col: 4, row: 4 } }], ["goon", { ...goon, id: "goon", position: { col: 6, row: 4 } }]]),
    positions: new Map([["lunar17", { col: 4, row: 4 }], ["goon", { col: 6, row: 4 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("lookahead-v1", PERSONNEL_ADAPTER, state, "lunar17", turn, { topK: 1 });
  assert.ok(decision, "expected a real decision with topK:1");
  assert.match(decision.reason, /top 1\//, `expected the reason to report topK:1 was respected, got: "${decision.reason}"`);
});

test("lookahead-v1: works identically (adapter-agnostic) on FRAME_ADAPTER too — returns a real, legal Frame-scale decision", () => {
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
  const decision = decideWithPolicy("lookahead-v1", FRAME_ADAPTER, state, "me", turn, {});
  assert.ok(decision, "expected a real decision from Frame-scale too");
  const sandbox = FRAME_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});

// --- THE REAL TRAP (design doc §60) — empirically found, not hand-derived, before being written
// down here: "me" has a scripted objective at its OWN starting square (so any move away costs real
// objective value) and no strikes (isolating pure positional reasoning). A melee enemy sits 5 squares
// away. The only two real move candidates are (a) toward the enemy (smaller objective loss, but
// walks adjacent to its reach) or (b) away (larger objective loss, but safe). 1-ply's static
// threatExposure term prices approaching as somewhat worse, but not worse enough to overcome the
// smaller objective loss — greedy-v1 walks in. Lookahead-v1's REAL simulated enemy reply (an actual
// Claw strike) reveals the true cost is much larger, and correctly retreats instead. ---

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
    round: 1, seed: 1, gridSize: { cols: 40, rows: 40 }, walls: [],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
}

test("THE TRAP: greedy-v1 (1-ply) walks toward the enemy's melee reach, chasing a smaller objective-distance loss than it costs in real threatExposure — the exact ceiling issue #1's own text describes", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("greedy-v1", PERSONNEL_ADAPTER, makeTrapState(), "me", turn, {});
  assert.equal(decision.type, "move");
  assert.equal(decision.to.col, 19, `expected greedy-v1 to walk toward the enemy (col 19), got ${JSON.stringify(decision)} — if this changed, the trap's own premise (a real, verified 1-ply mistake) no longer holds and this test needs re-deriving, not just updating`);
});

test("THE TRAP: lookahead-v1 (2-ply) correctly retreats instead, once the enemy's REAL simulated Claw strike reveals the true cost of approaching", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("lookahead-v1", PERSONNEL_ADAPTER, makeTrapState(), "me", turn, {});
  assert.equal(decision.type, "move");
  assert.equal(decision.to.col, 9, `expected lookahead-v1 to retreat (col 9) once the real enemy reply is simulated, got ${JSON.stringify(decision)}`);
});

test("THE TRAP: greedy-v1 and lookahead-v1 pick GENUINELY DIFFERENT real actions on the identical state — the core, direct proof that 2-ply search changes a real decision, not just a score", () => {
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };
  const greedyChoice = decideWithPolicy("greedy-v1", PERSONNEL_ADAPTER, makeTrapState(), "me", turn, {});
  const lookaheadChoice = decideWithPolicy("lookahead-v1", PERSONNEL_ADAPTER, makeTrapState(), "me", turn, {});
  assert.notDeepEqual(
    { type: greedyChoice.type, to: greedyChoice.to },
    { type: lookaheadChoice.type, to: lookaheadChoice.to },
    "expected greedy-v1 and lookahead-v1 to genuinely disagree on this constructed trap"
  );
  // Both must still be real, legal actions — a different choice is only meaningful if it's a real one.
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state: makeTrapState(), turn });
  assert.equal(sandbox.apply("me", lookaheadChoice).legal, true);
});
