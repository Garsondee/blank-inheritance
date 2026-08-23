/**
 * Tests for the artifact's decision-overlay geometry (design doc §14h) —
 * the feet<->pixel conversion and reach extraction behind the move/strike
 * lines and range rings drawn on the map. Includes a direct cross-check
 * against the real engine's reachFeetForStrike (grid.mjs), the same
 * discipline this project already applies to the AI's own math
 * (considerations.test.mjs cross-checks against degreeOfSuccess) — a
 * visual confirmation tool is only trustworthy if its numbers can't
 * silently drift from what the engine actually computed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as geometry from "../../tools/battle-simulator/artifact/geometry.mjs";
import { reachFeetForStrike } from "../../tools/battle-simulator/engine/grid.mjs";

// Deliberately reading these OFF THE NAMESPACE OBJECT, not destructured, throughout this file —
// they're mutable `let` exports now (design doc §19: the library holds both Frame- and
// personnel-scale runs), and a destructured binding would freeze a stale value the moment
// setMapScale() reassigns the module's own exports out from under it.
const { setMapScale, posToPx, vertexToPx, feetToPx, reachFeetForStrikeLocal, cleanRangeFeetLocal } = geometry;

test("default scale (no setMapScale call yet): 44x44 at 30px/cell, 50ft/square — matches every Frame-scale run written before this field existed", () => {
  assert.equal(geometry.COLS, 44);
  assert.equal(geometry.ROWS, 44);
  assert.equal(geometry.CELL, 30);
  assert.equal(geometry.MAP_PX_W, 1320);
  assert.equal(geometry.MAP_PX_H, 1320);
  assert.equal(geometry.FEET_PER_SQUARE, 50);
});

test("setMapScale: switches to a real personnel-scale run's own dimensions and feet-per-square — the Phase 1b test facility (14x16, 5ft/square)", () => {
  setMapScale({ cols: 14, rows: 16, feetPerSquare: 5 });
  assert.equal(geometry.COLS, 14);
  assert.equal(geometry.ROWS, 16);
  assert.equal(geometry.MAP_PX_W, 14 * 30);
  assert.equal(geometry.MAP_PX_H, 16 * 30);
  assert.equal(geometry.FEET_PER_SQUARE, 5);
  setMapScale({ cols: 44, rows: 44, feetPerSquare: 50 }); // reset for every test after this one
});

test("setMapScale: a log with no feetPerSquare field at all (every real Frame-scale log written before design doc §19) defaults to 50 — real backward compatibility, not a guess", () => {
  setMapScale({ cols: 44, rows: 44, feetPerSquare: undefined });
  assert.equal(geometry.FEET_PER_SQUARE, 50);
});

test("posToPx: centers a cell, not its corner", () => {
  assert.deepEqual(posToPx({ col: 0, row: 0 }), { x: 15, y: 15 });
  assert.deepEqual(posToPx({ col: 1, row: 2 }), { x: 45, y: 75 });
});

test("feetToPx: one full square (at whatever scale is currently active) converts to exactly one CELL width", () => {
  assert.equal(feetToPx(geometry.FEET_PER_SQUARE), geometry.CELL);
});

test("feetToPx: scales linearly — the Claimant's Sweep reach (300ft) is 6 squares' worth of pixels", () => {
  assert.equal(feetToPx(300), geometry.CELL * 6);
});

test("feetToPx: a long-range weapon's real increment (2000ft) converts to a proportionally large ring, not something visually indistinguishable from a sidearm's", () => {
  const sidearmPx = feetToPx(100);
  const longRangePx = feetToPx(2000);
  assert.equal(longRangePx, sidearmPx * 20);
});

test("reachFeetForStrikeLocal: cross-checked against the real engine's reachFeetForStrike for melee strikes (with and without a reach trait) — must never silently diverge", () => {
  setMapScale({ cols: 44, rows: 44, feetPerSquare: 50 }); // explicit, not relying on a previous test's leftover state
  const withReach = { strikeType: "melee", traits: ["reach-300"] };
  const withoutReach = { strikeType: "melee", traits: [] };
  assert.equal(reachFeetForStrikeLocal(withReach), reachFeetForStrike(withReach));
  assert.equal(reachFeetForStrikeLocal(withoutReach), reachFeetForStrike(withoutReach));
  assert.equal(reachFeetForStrikeLocal(withReach), 300);
  assert.equal(reachFeetForStrikeLocal(withoutReach), geometry.FEET_PER_SQUARE);
});

test("reachFeetForStrikeLocal: a ranged strike uses its own rangeIncrement, not the engine's melee-only reachFeetForStrike (which would wrongly default it to one square)", () => {
  const sidearm = { strikeType: "ranged", rangeIncrement: 100, traits: ["mounted"] };
  assert.equal(reachFeetForStrikeLocal(sidearm), 100);
  assert.notEqual(reachFeetForStrikeLocal(sidearm), reachFeetForStrike(sidearm), "grid.mjs's reachFeetForStrike is melee-oriented and would return one square here — the artifact must NOT use it directly for a ranged weapon's ring");
});

test("reachFeetForStrikeLocal: a ranged strike with no rangeIncrement at all returns null (no ring to draw) rather than a misleading default", () => {
  assert.equal(reachFeetForStrikeLocal({ strikeType: "ranged" }), null);
});

test("cleanRangeFeetLocal (design doc §14k): a spell/ability's own flat `.range` wins, checked before strikeType — a spell has no strikeType at all and would otherwise fall through incorrectly", () => {
  const spell = { name: "Eldritch Lance", range: 300, strikeType: undefined };
  assert.equal(cleanRangeFeetLocal(spell), 300);
});

test("vertexToPx: a wall's grid-vertex coordinate maps to the cell CORNER, not the cell center posToPx uses — the whole point of having a separate function", () => {
  setMapScale({ cols: 44, rows: 44, feetPerSquare: 50 });
  assert.deepEqual(vertexToPx([0, 0]), { x: 0, y: 0 });
  assert.deepEqual(vertexToPx([1, 2]), { x: 30, y: 60 });
  assert.notDeepEqual(vertexToPx([1, 2]), posToPx({ col: 1, row: 2 }), "a vertex and a cell center must never coincide for the same (col,row) pair");
});

test("cleanRangeFeetLocal: falls through to reachFeetForStrikeLocal for anything without its own `.range` (melee and ranged Strikes alike) — mirrors ai/candidates.mjs's cleanRangeFeet exactly", () => {
  const melee = { strikeType: "melee", traits: ["reach-300"] };
  const ranged = { strikeType: "ranged", rangeIncrement: 100 };
  assert.equal(cleanRangeFeetLocal(melee), 300);
  assert.equal(cleanRangeFeetLocal(ranged), 100);
});
