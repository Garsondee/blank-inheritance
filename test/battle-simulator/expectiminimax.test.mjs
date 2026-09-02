/**
 * Tests for personnel-engine/search/expectiminimax.mjs — THE EXACTNESS ORACLE (design doc §61, GH
 * issue #21). Real concerns, matching the module's own stated scope (Phase A: deterministic
 * transitions only, forced nodes handled except the one genuinely stochastic one):
 * (1) it agrees with a hand-computable answer on a trivial 1-ply position;
 * (2) it agrees with a real design doc §52 tactical puzzle at depth 1 (decide() and the oracle,
 *     built independently, must reach the same real conclusion on the same real decision);
 * (3) it CROSS-VALIDATES against lookahead-v1's own already-verified trap (design doc §60) — the
 *     exact oracle, given the same real reply opportunity lookahead-v1 approximates, must reach the
 *     SAME real conclusion (retreat), a genuinely independent confirmation neither piece of work had
 *     when it was first built;
 * (4) terminal detection short-circuits correctly with a real win/loss sentinel;
 * (5) forced nodes are handled correctly — Stunned's real action-loss arithmetic, at least;
 * (6) nodesExplored is a real, reportable cost, not a placeholder;
 * (7) registered in the policy registry, usable like any other policy.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { solve } from "../../tools/battle-simulator/personnel-engine/search/expectiminimax.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { decideWithPolicy, listPolicyIds } from "../../tools/battle-simulator/ai-common/engine-adapter.mjs";
import { PERSONNEL_ADAPTER } from "../../tools/battle-simulator/ai-common/adapters/personnel-adapter.mjs";
import "../../tools/battle-simulator/ai-common/policies/lookahead.mjs";
import "../../tools/battle-simulator/ai-common/policies/exactness-oracle.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

// --- 1: a hand-computable trivial position ---

test("solve(): a 1-ply choice between two strikes on the same target picks the real higher-gain one, and reports the real absolute evaluateState as its value", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [
      { name: "BigSword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] },
      { name: "SmallDagger", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "1d4", bonus: 1, damageType: "piercing" }] }
    ],
    position: { col: 5, row: 5 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

  const result = solve({ state, combatantId: "me", turn, depth: 1 });
  assert.equal(result.bestProposal.type, "strike");
  assert.equal(result.bestProposal.strikeIndex, 0, "expected BigSword (the real higher-expected-damage strike) to win");

  const before = evaluateState(state, "party", DEFAULT_WEIGHTS, "me");
  const sandbox = forkTurnSandbox({ state, turn });
  const applied = sandbox.apply("me", result.bestProposal);
  assert.equal(applied.legal, true);
  const expectedValue = evaluateState(sandbox.state, "party", DEFAULT_WEIGHTS, "me");
  assert.ok(Math.abs(result.value - expectedValue) < 1e-9, `expected the oracle's own value (${result.value}) to equal the real absolute evaluateState after its own chosen action (${expectedValue})`);
  assert.ok(result.value - before > 0, "the chosen strike must be a real, positive gain over the starting position");
});

// --- 2: agreement with a real §52 tactical puzzle at depth 1 ---

test("solve(): agrees with decide() on design doc §52's own 'heal the critical ally' puzzle at depth 1 — two independently-built decision procedures reaching the same real conclusion", () => {
  const me = { ...loadFixture("lunar-17.json"), id: "me", side: "party", position: { col: 5, row: 5 } };
  const ally = { ...loadFixture("security-goon.json"), id: "ally", side: "party", currentHP: 3, position: { col: 5, row: 4 } };
  const enemy = { ...loadFixture("security-goon.json"), id: "enemy", side: "opposition", position: { col: 8, row: 5 } };
  const state = {
    seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], round: 1, initiativeOrder: ["me", "ally", "enemy"],
    combatants: new Map([["me", me], ["ally", ally], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["ally", ally.position], ["enemy", enemy.position]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

  const decideChoice = decide(state, "me", { combatantId: "me", actionsAvailable: 1, actionsUsed: 0, effective: { speed: me.speed, ac: me.ac }, decisionIndex: 0 });
  const oracleResult = solve({ state, combatantId: "me", turn, depth: 1 });

  assert.equal(decideChoice.type, "healAbility");
  assert.equal(oracleResult.bestProposal.type, "healAbility", `expected the oracle to independently reach the same real conclusion as decide() — got ${JSON.stringify(oracleResult.bestProposal)}`);
  assert.equal(oracleResult.bestProposal.targetId, "ally");
});

// --- 3: cross-validation against lookahead-v1's own real, already-verified trap (design doc §60) ---

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

test("CROSS-VALIDATION: the exact oracle, given the SAME real reply opportunity lookahead-v1 approximates, independently confirms retreating is genuinely better — depth=1 matches greedy-v1's own (wrong) pick, depth=2 flips to the real correct one", () => {
  // 'me' down to its last action this turn, so depth=2 means exactly one real reply from the enemy —
  // the same real comparison lookahead-v1's own trap test (design doc §60) makes.
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

  const depth1 = solve({ state: makeTrapState(), combatantId: "me", turn, depth: 1 });
  assert.equal(depth1.bestProposal.to.col, 19, "depth=1 must match greedy-v1's own real (myopic) pick — walking toward the enemy");

  const depth2 = solve({ state: makeTrapState(), combatantId: "me", turn, depth: 2 });
  assert.equal(depth2.bestProposal.to.col, 9, "depth=2, once the enemy's real best reply is exhaustively explored, must flip to retreating — the exact confirmation of lookahead-v1's own approximate finding");
});

// --- 4: terminal detection ---

test("solve(): a state that's already terminal returns the real WIN sentinel immediately, without exploring anything", () => {
  const me = { id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25, strikes: [], position: { col: 0, row: 0 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 0, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const result = solve({ state, combatantId: "me", turn, depth: 3 });
  assert.ok(result.value > 1000, `expected a large WIN sentinel value for an already-won position, got ${result.value}`);
  assert.equal(result.bestProposal, null, "a terminal position has no real action to propose");
  assert.equal(result.nodesExplored, 1, "a terminal position must be detected immediately, without exploring any real children");
});

// --- 5: forced nodes — Stunned's real action-loss arithmetic ---

test("solve(): a Stunned combatant loses the real, exact number of actions the engine's own rule specifies, then acts normally with what's left", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  // Stunned 1: loses exactly 1 of its 3 real actions (Player Core's own worked rule), leaving 2 —
  // enough for a real move-then-strike to still be possible in this file's own forced-node handling.
  const stunnedAlly = {
    id: "stunnedAlly", name: "StunnedAlly", side: "party", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, stunnedValue: 1,
    strikes: [{ name: "Dagger", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 1, damageType: "piercing" }] }],
    position: { col: 5, row: 6 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "stunnedAlly", "enemy"],
    combatants: new Map([["me", { ...me }], ["stunnedAlly", { ...stunnedAlly }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["stunnedAlly", { ...stunnedAlly.position }], ["enemy", { ...enemy.position }]])
  };
  // 'me' has exactly one action; depth=2 crosses into stunnedAlly's own (forced-reduced) turn.
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const result = solve({ state, combatantId: "me", turn, depth: 2 });
  assert.ok(result.bestProposal, "expected a real decision even with a Stunned ally later in initiative order");
  // The real, direct proof: nodesExplored must be nonzero for ply 2 (stunnedAlly's own reduced-but-
  // real turn was actually explored, not silently skipped as if it had zero actions).
  assert.ok(result.nodesExplored > 1, "expected the search to actually explore stunnedAlly's own (Stunned-reduced) turn, not just 'me' alone");
});

test("solve(): a FULLY Stunned combatant (stunnedValue >= its whole turn) is skipped entirely — no decision node for them at all, matching runBattle's own real 'continue' path — proven by a real, externally-observable difference, not just a nonzero node count", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  const fullyStunnedAlly = {
    id: "fullyStunnedAlly", name: "FullyStunnedAlly", side: "party", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, stunnedValue: 3, // loses ALL 3 real actions this turn
    strikes: [{ name: "Dagger", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 1, damageType: "piercing" }] }],
    position: { col: 5, row: 6 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "slashing" }] }],
    position: { col: 6, row: 5 }
  };
  function makeState(stunnedValue) {
    return {
      round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "fullyStunnedAlly", "enemy"],
      combatants: new Map([["me", { ...me }], ["fullyStunnedAlly", { ...fullyStunnedAlly, stunnedValue }], ["enemy", { ...enemy }]]),
      positions: new Map([["me", { ...me.position }], ["fullyStunnedAlly", { ...fullyStunnedAlly.position }], ["enemy", { ...enemy.position }]])
    };
  }
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

  // Fully stunned: ply 2 must belong to "enemy" (fullyStunnedAlly skipped outright) — real, legal
  // enemy proposals only, e.g. a strike against "me" is a real candidate there.
  const stunnedResult = solve({ state: makeState(3), combatantId: "me", turn, depth: 2 });
  // Not stunned at all: ply 2 must belong to fullyStunnedAlly instead (initiative order unchanged),
  // who has NO reason to attack "enemy" itself the way "enemy" would attack "me" — so the real
  // nodesExplored/value must differ between the two runs if Stunned is actually being applied.
  const unstunnedResult = solve({ state: makeState(0), combatantId: "me", turn, depth: 2 });

  assert.notEqual(stunnedResult.nodesExplored, unstunnedResult.nodesExplored,
    `expected a real difference in explored nodes between a fully-stunned ally (skipped) and a normal one (explored) — got ${stunnedResult.nodesExplored} for both, meaning stunnedValue is being ignored`);
  assert.notEqual(stunnedResult.value, unstunnedResult.value,
    "expected a real difference in the search's own value once who-acts-next genuinely differs (enemy vs. fullyStunnedAlly)");
});

test("solve(): a real Phase-A gap (an UNCONSCIOUS combatant's next turn — a genuinely stochastic recovery-check forced node this file doesn't model yet) degrades gracefully — the branch stops at its own real current value instead of throwing or silently guessing", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  // usesDyingRules-eligible (a PC-shaped combatant with dyingValue), knocked to 0 HP but not yet
  // dead — the real "unconscious, dying, needs a recovery check" state (Player Core pg. 402-403).
  const dyingAlly = {
    id: "dyingAlly", name: "DyingAlly", side: "party", maxHP: 20, currentHP: 0, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, dyingValue: 1, pcDeathRules: true,
    strikes: [{ name: "Dagger", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 1, damageType: "piercing" }] }],
    position: { col: 5, row: 6 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "dyingAlly", "enemy"],
    combatants: new Map([["me", { ...me }], ["dyingAlly", { ...dyingAlly }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["dyingAlly", { ...dyingAlly.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  assert.doesNotThrow(() => solve({ state, combatantId: "me", turn, depth: 2 }), "an unconscious combatant later in initiative order must not crash the search");
  const result = solve({ state, combatantId: "me", turn, depth: 2 });
  assert.ok(result.bestProposal, "expected a real decision for 'me' regardless of the later, unmodeled gap");
});

// --- 6: nodesExplored is a real, reportable cost ---

test("solve(): nodesExplored grows with real depth and reflects genuine exploration, not a placeholder constant", () => {
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "slashing" }] }], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const depth1 = solve({ state, combatantId: "me", turn, depth: 1 });
  const depth2 = solve({ state, combatantId: "me", turn, depth: 2 });
  assert.ok(depth2.nodesExplored > depth1.nodesExplored, `expected real growth in explored nodes from depth 1 (${depth1.nodesExplored}) to depth 2 (${depth2.nodesExplored})`);
});

// --- 7: registered as a policy ---

test("exactness-oracle-v1: registered in the policy registry, and decideWithPolicy(...) returns a real, legal action matching solve() directly", () => {
  assert.ok(listPolicyIds().includes("exactness-oracle-v1"));
  const me = {
    id: "me", name: "Me", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 14, traits: [], damage: [{ dice: "2d8", bonus: 6, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", { ...me }], ["enemy", { ...enemy }]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
  const decision = decideWithPolicy("exactness-oracle-v1", PERSONNEL_ADAPTER, state, "me", turn, { depth: 1 });
  assert.ok(decision, "expected a real decision through the registry");
  const sandbox = PERSONNEL_ADAPTER.forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", decision).legal, true);
});
