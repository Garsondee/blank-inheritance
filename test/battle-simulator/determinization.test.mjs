/**
 * Tests for personnel-engine/search/determinization.mjs — `isFullyVisible`, the first, smaller half
 * of GH issue #6's step 8 (design doc §71, issue #10's own §1: "Perfect-information mode when it is
 * true... assert this holds in the mirror-arena tests"). Real concerns:
 * (1) an ordinary, open, full-information position reports fully visible for both sides — the exact
 *     "mirror arena" assumption every existing MCTS policy has always implicitly relied on;
 * (2) a REAL genuinely-blind deployment (RANDOM_ARCS on the real complex-battle map, which already
 *     guarantees zero cross-side Line of Effect at deployment) correctly reports NOT fully visible —
 *     not a hand-built strawman, the same real scenario builder `personnel-complex-battle.test.mjs`
 *     already trusts for this exact guarantee;
 * (3) a STALE belief (an enemy seen before, now genuinely hidden again) correctly counts as not fully
 *     visible, not merely "not currently checked";
 * (4) a NEVER-SEEN enemy (no belief entry at all — the same "arrived after this side's own first
 *     refresh, never perceived" case `personnel-belief.test.mjs`'s own regression-guard test covers)
 *     also correctly counts as not fully visible — distinct code path from the stale case, both need
 *     covering;
 * (5) a dead enemy never counts against visibility — belief.mjs itself stops tracking it, so
 *     isFullyVisible must not require a belief entry that will never exist;
 * (6) own-side combatants are never consulted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isFullyVisible } from "../../tools/battle-simulator/personnel-engine/search/determinization.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/personnel-complex-battle.mjs";

const PARTY_3V3 = ["lunar-17.json", "tapkey.json", "bennit.json"];
const OPPOSITION_3V3 = ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"];

function stateFromScenario(scenario, round = 1) {
  return {
    round, seed: scenario.seed, gridSize: scenario.gridSize, walls: scenario.walls, blindDeployment: scenario.blindDeployment,
    initiativeOrder: scenario.combatants.map((c) => c.id),
    combatants: new Map(scenario.combatants.map((c) => [c.id, { ...c }])),
    positions: new Map(scenario.combatants.map((c) => [c.id, { ...c.position }]))
  };
}

// --- 1: the ordinary, open, full-information case ("assert this holds in the mirror-arena tests") ---

test("isFullyVisible: an ordinary, open, full-information position reports TRUE for both sides — the assumption every existing MCTS policy has always implicitly relied on", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, position: { col: 0, row: 0 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, position: { col: 10, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]])
  };
  assert.equal(isFullyVisible(state, "party"), true);
  assert.equal(isFullyVisible(state, "opposition"), true);
});

// --- 2: a REAL genuinely-blind deployment ---

test("isFullyVisible: a REAL RANDOM_ARCS deployment on the real complex-battle map (guaranteed zero cross-side Line of Effect) correctly reports NOT fully visible, for both sides, across several real seeds", () => {
  for (let seed = 1; seed <= 5; seed++) {
    const scenario = buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS" });
    const state = stateFromScenario(scenario);
    assert.equal(isFullyVisible(state, "party"), false, `seed ${seed}: expected NOT fully visible at a genuinely blind deployment`);
    assert.equal(isFullyVisible(state, "opposition"), false, `seed ${seed}: expected NOT fully visible at a genuinely blind deployment`);
  }
});

test("isFullyVisible: the SAME real roster on an ordinary (non-blind) setup of the complex map reports fully visible once nothing actually blocks Line of Effect between the two sides' own spawn points", () => {
  // NORTH_SOUTH_ENDS places both sides at opposite map ends with real walls between rooms elsewhere
  // on the map, but nothing blocking the two sides' own spawn line specifically — a real contrast
  // against RANDOM_ARCS's own deliberately-blocked deployment, not a strawman "always false" mock.
  const scenario = buildScenario({ seed: 1, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "NORTH_SOUTH_ENDS" });
  const state = stateFromScenario(scenario);
  assert.equal(scenario.blindDeployment, false, "sanity: this setup must not be blind");
  assert.equal(isFullyVisible(state, "party"), true);
  assert.equal(isFullyVisible(state, "opposition"), true);
});

// --- 3: a stale belief (seen before, genuinely hidden again NOW) ---

function twoRoomWall(gridSize) {
  const walls = [];
  const midCol = Math.floor(gridSize.cols / 2);
  for (let row = 0; row < gridSize.rows; row++) walls.push({ c: [midCol, row, midCol, row + 1], move: 20, sight: 20 });
  return walls;
}

test("isFullyVisible: an enemy seen BEFORE but genuinely hidden again NOW (real wall between them, stale belief carried forward) correctly counts as NOT fully visible — not merely 'not yet checked'", () => {
  const gridSize = { cols: 20, rows: 20 };
  const walls = twoRoomWall(gridSize);
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, position: { col: 5, row: 5 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, position: { col: 15, row: 5 } }; // across the real wall
  const state = {
    round: 2, seed: 1, gridSize, walls, initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]]),
    // A real prior sighting, already on the books — round 1's own real belief, carried into round 2.
    belief: { party: new Map([["enemy", { position: { col: 15, row: 5 }, lastSeenRound: 1, visible: true }]]) }
  };
  assert.equal(isFullyVisible(state, "party"), false, "expected the real, current wall to correctly stale out the prior sighting");
});

// --- 4: a never-seen enemy (no belief entry at all) — the regression-guard case ---

test("isFullyVisible: an enemy that has NEVER been perceived at all (no belief entry whatsoever, not even a stale one) correctly counts as NOT fully visible — a distinct code path from the stale case above", () => {
  const gridSize = { cols: 20, rows: 20 };
  const walls = twoRoomWall(gridSize);
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, position: { col: 5, row: 5 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, position: { col: 15, row: 5 } };
  const state = {
    round: 2, seed: 1, gridSize, walls, initiativeOrder: ["me", "enemy"],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", me.position], ["enemy", enemy.position]]),
    // This side has already had its own first refresh (so deployment-moment seeding does NOT fire
    // again), but genuinely never perceived this specific enemy -- the real "arrived/relevant after
    // the first refresh, never spotted since" case, matching personnel-belief.test.mjs's own
    // regression-guard test.
    belief: { party: new Map() }
  };
  assert.equal(isFullyVisible(state, "party"), false);
});

// --- 5/6: dead enemies never count; own side is never consulted ---

test("isFullyVisible: a dead enemy (currentHP <= 0) never counts against visibility -- belief.mjs itself stops tracking it, so a belief entry must never be required for it", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, position: { col: 5, row: 5 } };
  const deadEnemy = { id: "deadEnemy", name: "DeadEnemy", side: "opposition", currentHP: 0, position: { col: 15, row: 15 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [{ c: [10, 0, 10, 20], move: 20, sight: 20 }],
    initiativeOrder: ["me", "deadEnemy"],
    combatants: new Map([["me", me], ["deadEnemy", deadEnemy]]),
    positions: new Map([["me", me.position], ["deadEnemy", deadEnemy.position]])
  };
  assert.equal(isFullyVisible(state, "party"), true, "expected a dead enemy behind a real wall to never count against visibility");
});

test("isFullyVisible: own-side combatants are never consulted -- a party checking its own side's visibility never looks at itself", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, position: { col: 5, row: 5 } };
  const ally = { id: "ally", name: "Ally", side: "party", currentHP: 30, position: { col: 15, row: 15 } }; // far away, irrelevant
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "ally"],
    combatants: new Map([["me", me], ["ally", ally]]),
    positions: new Map([["me", me.position], ["ally", ally.position]])
  };
  assert.equal(isFullyVisible(state, "party"), true, "expected a scenario with no living opposition at all to trivially report fully visible");
});
