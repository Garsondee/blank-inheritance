// Tier 1 — the orange VU meter's printed face (scripts/core/vu-meter.mjs).
// Every coordinate on the deck's central instrument comes from here, because a
// malformed SVG path renders as nothing at all, silently.

import { test } from "node:test";
import assert from "node:assert/strict";

import { scaleLabels, valueToDeg, vuFace } from "../module/blank-inheritance/scripts/core/vu-meter.mjs";

test("valueToDeg sweeps symmetrically about vertical and clamps readings off either end of the scale", () => {
  assert.equal(valueToDeg(0, { min: 0, max: 16, sweep: 96 }), -48);
  assert.equal(valueToDeg(8, { min: 0, max: 16, sweep: 96 }), 0);
  assert.equal(valueToDeg(16, { min: 0, max: 16, sweep: 96 }), 48);
  assert.equal(valueToDeg(-5, { min: 0, max: 16, sweep: 96 }), -48, "negative HP pins to the stop, not past it");
  assert.equal(valueToDeg(40, { min: 0, max: 16, sweep: 96 }), 48, "temp HP above max pins to the stop");
});

test("valueToDeg on a degenerate scale rests at the low stop rather than dividing by zero", () => {
  assert.equal(valueToDeg(3, { min: 0, max: 0, sweep: 96 }), -48);
});

test("scaleLabels prints the real numbers a player reads, evenly spread, never repeating one", () => {
  assert.deepEqual(scaleLabels(0, 16, 5).map((l) => l.text), ["0", "4", "8", "12", "16"]);
  assert.deepEqual(scaleLabels(0, 2, 5).map((l) => l.text), ["0", "1", "2"], "a tiny range prints fewer labels, not duplicates");
  assert.deepEqual(scaleLabels(5, 5, 5).map((l) => l.text), ["5"]);
});

test("vuFace produces well-formed arc and band paths with no NaN anywhere", () => {
  const face = vuFace({ min: 0, max: 16, danger: { from: 0, to: 4 } });
  const all = JSON.stringify(face);
  assert.ok(!all.includes("NaN"), "NaN leaked into the meter face");
  assert.match(face.arc, /^M [\d.]+ [\d.]+ A [\d.]+ [\d.]+ 0 0 1 [\d.]+ [\d.]+$/);
  assert.match(face.dangerBand, /^M .+ A .+ L .+ A .+ Z$/);
  assert.equal(face.viewBox, "0 0 200 200");
});

test("vuFace puts one major tick per label and the requested minor ticks between each pair", () => {
  const face = vuFace({ min: 0, max: 16, labelCount: 5, minorPerGap: 3 });
  assert.equal(face.ticks.filter((t) => t.major).length, 5);
  assert.equal(face.ticks.filter((t) => !t.major).length, 4 * 3);
  assert.equal(face.labels.length, 5);
});

test("vuFace's arc is symmetric about the pivot, so the printed scale is centred on the glass", () => {
  const face = vuFace({ min: 0, max: 10, pivotX: 100, sweep: 96 });
  const first = face.labels[0];
  const last = face.labels[face.labels.length - 1];
  assert.ok(Math.abs((first.x - 100) + (last.x - 100)) < 0.05, "end labels are not mirror images across the pivot");
  assert.ok(Math.abs(first.y - last.y) < 0.05, "end labels do not sit at the same height");
});

test("vuFace prints no danger band when there is none, or when the requested range is empty or inverted", () => {
  assert.equal(vuFace({ min: 0, max: 16 }).dangerBand, null);
  assert.equal(vuFace({ min: 0, max: 16, danger: { from: 8, to: 8 } }).dangerBand, null);
  assert.equal(vuFace({ min: 0, max: 16, danger: { from: 12, to: 4 } }).dangerBand, null);
});
