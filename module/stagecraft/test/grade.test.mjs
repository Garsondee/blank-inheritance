// The light a card stands in (core/grade.mjs): dimmer and cooler where the painting is dark and teal, brighter and warmer where
// it is lit, and never so dark that a card cannot be read.

import { test } from "node:test";
import assert from "node:assert/strict";
import { gridFromPixels, colourAt, lightAt, easeLight, GRADE } from "../scripts/core/grade.mjs";
import { paintingGrid } from "../scripts/render/grade.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";

/** A grid of w x h cells, each colour given by f(x, y) as [r, g, b] in 0..255. */
const grid = (w, h, f) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y); data.set([r, g, b, 255], (y * w + x) * 4); }
  return gridFromPixels(data, w, h);
};

test("colourAt blends between the cells round a point, and stays on the grid", () => {
  const g = grid(2, 1, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
  assert.ok(Math.abs(colourAt(g, 0.5, 0.5)[0] - 0.5) < 1e-6);
  assert.deepEqual(colourAt(g, -3, 9).map((n) => Math.round(n)), [0, 0, 0]);
  assert.deepEqual(colourAt(g, 7, 0).map((n) => Math.round(n)), [1, 1, 1]);
});

test("a card is dimmer in a dark painting than in a bright one, and never below the floor", () => {
  const dark = lightAt(grid(4, 4, () => [10, 12, 14]), 0.5, 0.8);
  const bright = lightAt(grid(4, 4, () => [235, 230, 220]), 0.5, 0.8);
  assert.ok(dark[1] < bright[1] - 0.2, `${dark} vs ${bright}`);
  assert.ok(dark.every((n) => n >= GRADE.floor * 0.5 && n <= 1));
  assert.ok(lightAt(grid(4, 4, () => [0, 0, 0]), 0.5, 0.5).every((n) => n >= GRADE.floor * 0.98), "black is still readable");
  assert.ok(bright.every((n) => n <= 1));
});

test("a card takes the colour of the light: cold in teal, warm in amber", () => {
  const teal = lightAt(grid(4, 4, () => [30, 90, 100]), 0.5, 0.8);
  const amber = lightAt(grid(4, 4, () => [230, 150, 80]), 0.5, 0.8);
  assert.ok(teal[0] < teal[2], `teal: red below blue (${teal})`);
  assert.ok(amber[2] < amber[0], `amber: blue below red (${amber})`);
});

test("it follows the painting under the card, and strength 0 is no grading", () => {
  const g = grid(8, 2, (x) => (x < 4 ? [20, 20, 20] : [240, 240, 240]));
  assert.ok(lightAt(g, 0.1, 0.9)[0] < lightAt(g, 0.9, 0.9)[0]);
  assert.deepEqual(lightAt(g, 0.1, 0.9, { strength: 0 }), [1, 1, 1]);
  assert.deepEqual(lightAt(null, 0.5, 0.5), [1, 1, 1], "no painting to read: no grading");
  const half = lightAt(g, 0.1, 0.9, { strength: 0.5 });
  const full = lightAt(g, 0.1, 0.9);
  assert.ok(half[0] > full[0] && half[0] < 1, "half the strength is half the way");
});

test("easeLight moves part of the way, starting from where it is", () => {
  assert.deepEqual(easeLight(null, [0.5, 0.6, 0.7]), [0.5, 0.6, 0.7]);
  const next = easeLight([1, 1, 1], [0.5, 0.5, 0.5], 0.2);
  assert.ok(Math.abs(next[0] - 0.9) < 1e-9);
});

test("a scene may turn the grading down or off; the default is on", () => {
  assert.equal(describeScene(RAW_SCENE).scene.grade, 1);
  assert.equal(describeScene({ ...RAW_SCENE, grade: 0 }).scene.grade, 0);
  assert.equal(describeScene({ ...RAW_SCENE, grade: 9 }).scene.grade, 1.5, "as far as 1.5");
});

test("paintingGrid shrinks a painting to a small grid, and gives null when it cannot be read", () => {
  const drawn = [];
  const make = () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (...a) => drawn.push(a), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(128) }) }) });
  const g = paintingGrid({ naturalWidth: 1920, naturalHeight: 1080 }, make);
  assert.equal(g.w, 48);
  assert.equal(g.h, 27);
  assert.ok(Math.abs(g.cells[0] - 128 / 255) < 1e-6);
  assert.equal(paintingGrid({}, make), null);
  assert.equal(paintingGrid({ naturalWidth: 10, naturalHeight: 10 }, () => { throw new Error("tainted"); }), null);
});