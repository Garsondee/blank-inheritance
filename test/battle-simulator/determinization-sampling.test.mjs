/**
 * Tests for `sampleDeterminizedWorld` (personnel-engine/search/determinization.mjs, design doc §72,
 * GH issue #10's own §2, part A). Pure sampling logic — no search involved yet (that's
 * determinization-search.test.mjs). Real concerns, each one a real fix the design's own adversarial
 * review found before any code existed:
 * (1) a stale enemy's sampled position is a REAL member of the actual `reachableCells` set from its
 *     own last-known position — a structural check against the real function, not a range guess;
 * (2) real variety across repeated samples (not always identical — proves the seeded rng actually
 *     drives the pick, not a hidden default);
 * (3) a never-seen enemy is absent from BOTH `combatants`/`positions` AND `initiativeOrder` — the
 *     exact crash the review found (an id left in `initiativeOrder` but dropped from `combatants`
 *     throws inside `advanceToNextActor`'s own unconditional `isDead(combatant)` call);
 * (4) two hidden enemies never collide, across many real samples — sequential, cumulative occupancy;
 * (5) a genuinely visible enemy's TRUE position is carried through completely unchanged;
 * (6) the same-round (`lastSeenRound === state.round`) case still produces a real, non-degenerate
 *     reachable set — the `Math.max(1, ...)` floor the review's own off-by-one finding required;
 * (7) the sampled output never carries a `belief` field (would make the sample's own root behave
 *     inconsistently with every node already below it in the search tree).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleDeterminizedWorld } from "../../tools/battle-simulator/personnel-engine/search/determinization.mjs";
import { reachableCells } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { makeRng } from "../../tools/battle-simulator/shared/rng.mjs";

function twoRoomWall(gridSize) {
  const walls = [];
  const midCol = Math.floor(gridSize.cols / 2);
  for (let row = 0; row < gridSize.rows; row++) walls.push({ c: [midCol, row, midCol, row + 1], move: 20, sight: 20 });
  return walls;
}

/** `me` (party) on the left side of a dividing wall; `staleEnemy` (opposition) genuinely hidden behind
 * it right now, with a real, pre-seeded stale belief entry; `neverSeenEnemy` also behind the wall,
 * with NO belief entry at all (this side's own first refresh already happened, per the non-empty
 * pre-seeded `state.belief`, so this is genuinely "arrived after deployment, never spotted," not a
 * deployment-seed artifact). */
function makeHiddenState({ round = 3, lastSeenRound = 1, staleEnemyPos = { col: 15, row: 5 } } = {}) {
  const gridSize = { cols: 20, rows: 20 };
  const walls = twoRoomWall(gridSize);
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, speed: 25, position: { col: 5, row: 5 } };
  const staleEnemy = { id: "staleEnemy", name: "StaleEnemy", side: "opposition", currentHP: 30, speed: 25, position: { ...staleEnemyPos } };
  const neverSeenEnemy = { id: "neverSeenEnemy", name: "NeverSeenEnemy", side: "opposition", currentHP: 30, speed: 25, position: { col: 18, row: 18 } };
  return {
    round, seed: 1, gridSize, walls, initiativeOrder: ["me", "staleEnemy", "neverSeenEnemy"],
    combatants: new Map([["me", me], ["staleEnemy", staleEnemy], ["neverSeenEnemy", neverSeenEnemy]]),
    positions: new Map([["me", { ...me.position }], ["staleEnemy", { ...staleEnemy.position }], ["neverSeenEnemy", { ...neverSeenEnemy.position }]]),
    // A real prior sighting already on the books for staleEnemy specifically — non-empty, so this
    // side's own deployment-moment seeding does NOT fire again; neverSeenEnemy's own absence is real.
    belief: { party: new Map([["staleEnemy", { position: { col: 15, row: 1 }, lastSeenRound, visible: true }]]) }
  };
}

// --- 1: sampled position is a real member of the real reachable set ---

test("sampleDeterminizedWorld: a stale enemy's sampled position is a real member of the real reachableCells set from its own last-known belief position", () => {
  const state = makeHiddenState();
  const rng = makeRng(42);
  const sampled = sampleDeterminizedWorld({ state, side: "party", rng });

  const belief = state.belief.party.get("staleEnemy");
  const roundsSince = Math.max(1, state.round - belief.lastSeenRound);
  const maxFeet = roundsSince * state.combatants.get("staleEnemy").speed;
  const realCells = reachableCells({ from: belief.position, maxFeet, gridSize: state.gridSize, occupiedPositions: [{ ...state.positions.get("me"), side: "party" }], walls: state.walls, moverSide: "opposition" });

  const sampledPos = sampled.positions.get("staleEnemy");
  assert.ok(sampledPos, "expected staleEnemy to still be present in the sampled world");
  assert.ok(realCells.has(`${sampledPos.col},${sampledPos.row}`), `expected the sampled position ${JSON.stringify(sampledPos)} to be a real member of the actual reachable-cell set`);
});

// --- 2: real variety across repeated samples ---

test("sampleDeterminizedWorld: repeated samples with different rng draws produce REAL variety in the stale enemy's position, not the same cell every time", () => {
  const state = makeHiddenState();
  const seen = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const rng = makeRng(seed);
    const sampled = sampleDeterminizedWorld({ state, side: "party", rng });
    seen.add(JSON.stringify(sampled.positions.get("staleEnemy")));
  }
  assert.ok(seen.size > 1, `expected real variety across 12 seeds, got only ${seen.size} distinct sampled position(s)`);
});

// --- 3: a never-seen enemy is dropped from combatants/positions AND initiativeOrder ---

test("sampleDeterminizedWorld: a never-seen enemy is absent from combatants, positions, AND initiativeOrder — the exact crash the design's own review found (an id left in initiativeOrder but dropped elsewhere throws inside advanceToNextActor)", () => {
  const state = makeHiddenState();
  const rng = makeRng(1);
  const sampled = sampleDeterminizedWorld({ state, side: "party", rng });

  assert.equal(sampled.combatants.has("neverSeenEnemy"), false);
  assert.equal(sampled.positions.has("neverSeenEnemy"), false);
  assert.ok(!sampled.initiativeOrder.includes("neverSeenEnemy"), "expected neverSeenEnemy to be filtered out of initiativeOrder too, not just combatants/positions");
  // Everyone else must still be present and in order.
  assert.deepEqual(sampled.initiativeOrder, ["me", "staleEnemy"]);
});

// --- 4: two hidden enemies never collide ---

function makeTwoHiddenState() {
  const gridSize = { cols: 20, rows: 20 };
  const walls = twoRoomWall(gridSize);
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, speed: 25, position: { col: 5, row: 5 } };
  const hiddenA = { id: "hiddenA", name: "HiddenA", side: "opposition", currentHP: 30, speed: 25, position: { col: 15, row: 5 } };
  const hiddenB = { id: "hiddenB", name: "HiddenB", side: "opposition", currentHP: 30, speed: 25, position: { col: 15, row: 6 } };
  return {
    round: 3, seed: 1, gridSize, walls, initiativeOrder: ["me", "hiddenA", "hiddenB"],
    combatants: new Map([["me", me], ["hiddenA", hiddenA], ["hiddenB", hiddenB]]),
    positions: new Map([["me", { ...me.position }], ["hiddenA", { ...hiddenA.position }], ["hiddenB", { ...hiddenB.position }]]),
    belief: {
      party: new Map([
        ["hiddenA", { position: { col: 15, row: 5 }, lastSeenRound: 1, visible: true }],
        ["hiddenB", { position: { col: 15, row: 6 }, lastSeenRound: 1, visible: true }]
      ])
    }
  };
}

test("sampleDeterminizedWorld: two hidden enemies never land on the same cell, across many real samples", () => {
  const state = makeTwoHiddenState();
  for (let seed = 1; seed <= 20; seed++) {
    const rng = makeRng(seed);
    const sampled = sampleDeterminizedWorld({ state, side: "party", rng });
    const a = sampled.positions.get("hiddenA");
    const b = sampled.positions.get("hiddenB");
    assert.notDeepEqual(a, b, `seed ${seed}: hiddenA and hiddenB both sampled to ${JSON.stringify(a)}`);
  }
});

// --- 5: a genuinely visible enemy's true position is carried through unchanged ---

test("sampleDeterminizedWorld: a genuinely visible enemy keeps its TRUE current position, completely unchanged — only genuinely hidden enemies get resampled", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 30, speed: 25, position: { col: 5, row: 5 } };
  const visibleEnemy = { id: "visibleEnemy", name: "VisibleEnemy", side: "opposition", currentHP: 30, speed: 25, position: { col: 6, row: 5 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["me", "visibleEnemy"],
    combatants: new Map([["me", me], ["visibleEnemy", visibleEnemy]]),
    positions: new Map([["me", { ...me.position }], ["visibleEnemy", { ...visibleEnemy.position }]])
  };
  const rng = makeRng(1);
  const sampled = sampleDeterminizedWorld({ state, side: "party", rng });
  assert.deepEqual(sampled.positions.get("visibleEnemy"), visibleEnemy.position);
});

// --- 6: the same-round case is not degenerate ---

test("sampleDeterminizedWorld: an enemy seen and lost again in the SAME round (lastSeenRound === state.round) still produces a real, non-degenerate sample — not forced onto exactly the stale square (the Math.max(1,...) floor)", () => {
  const state = makeHiddenState({ round: 1, lastSeenRound: 1 }); // no elapsed rounds at all
  const staleBelief = state.belief.party.get("staleEnemy");
  let sawRealMovement = false;
  for (let seed = 1; seed <= 12; seed++) {
    const rng = makeRng(seed);
    const sampled = sampleDeterminizedWorld({ state, side: "party", rng });
    const pos = sampled.positions.get("staleEnemy");
    assert.ok(pos, "expected staleEnemy to still be sampled, not dropped, even at zero elapsed rounds");
    if (pos.col !== staleBelief.position.col || pos.row !== staleBelief.position.row) sawRealMovement = true;
  }
  assert.ok(sawRealMovement, "expected at least some real movement sampled even at lastSeenRound === state.round — the same-round undercount bug would force every sample onto the exact stale square");
});

// --- 7: the sampled output never carries a belief field ---

test("sampleDeterminizedWorld: the sampled output never carries a belief field — it must treat itself as full ground truth, consistent with every node already below it in a search tree", () => {
  const state = makeHiddenState();
  const rng = makeRng(1);
  const sampled = sampleDeterminizedWorld({ state, side: "party", rng });
  assert.equal("belief" in sampled, false);
  assert.equal("blindDeployment" in sampled, false);
});
