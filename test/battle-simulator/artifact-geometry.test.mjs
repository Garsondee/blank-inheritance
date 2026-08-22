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
import { GRID, MAP_PX, CELL, FEET_PER_SQUARE, posToPx, feetToPx, reachFeetForStrikeLocal, cleanRangeFeetLocal } from "../../tools/battle-simulator/artifact/geometry.mjs";
import { reachFeetForStrike } from "../../tools/battle-simulator/engine/grid.mjs";

test("CELL is MAP_PX divided evenly by GRID, matching the 44x44 1320px map the artifact actually renders", () => {
  assert.equal(GRID, 44);
  assert.equal(MAP_PX, 1320);
  assert.equal(CELL, 30);
});

test("posToPx: centers a cell, not its corner", () => {
  assert.deepEqual(posToPx({ col: 0, row: 0 }), { x: 15, y: 15 });
  assert.deepEqual(posToPx({ col: 1, row: 2 }), { x: 45, y: 75 });
});

test("feetToPx: one full square (50ft) converts to exactly one CELL width", () => {
  assert.equal(feetToPx(FEET_PER_SQUARE), CELL);
});

test("feetToPx: scales linearly — the Claimant's Sweep reach (300ft) is 6 squares' worth of pixels", () => {
  assert.equal(feetToPx(300), CELL * 6);
});

test("feetToPx: a long-range weapon's real increment (2000ft) converts to a proportionally large ring, not something visually indistinguishable from a sidearm's", () => {
  const sidearmPx = feetToPx(100);
  const longRangePx = feetToPx(2000);
  assert.equal(longRangePx, sidearmPx * 20);
});

test("reachFeetForStrikeLocal: cross-checked against the real engine's reachFeetForStrike for melee strikes (with and without a reach trait) — must never silently diverge", () => {
  const withReach = { strikeType: "melee", traits: ["reach-300"] };
  const withoutReach = { strikeType: "melee", traits: [] };
  assert.equal(reachFeetForStrikeLocal(withReach), reachFeetForStrike(withReach));
  assert.equal(reachFeetForStrikeLocal(withoutReach), reachFeetForStrike(withoutReach));
  assert.equal(reachFeetForStrikeLocal(withReach), 300);
  assert.equal(reachFeetForStrikeLocal(withoutReach), FEET_PER_SQUARE);
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

test("cleanRangeFeetLocal: falls through to reachFeetForStrikeLocal for anything without its own `.range` (melee and ranged Strikes alike) — mirrors ai/candidates.mjs's cleanRangeFeet exactly", () => {
  const melee = { strikeType: "melee", traits: ["reach-300"] };
  const ranged = { strikeType: "ranged", rangeIncrement: 100 };
  assert.equal(cleanRangeFeetLocal(melee), 300);
  assert.equal(cleanRangeFeetLocal(ranged), 100);
});
