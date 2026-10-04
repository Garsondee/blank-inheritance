// Wet ink's arithmetic (core/wet.mjs): where the wall is on the window, the tail between the last dab and the pointer.

import { test } from "node:test";
import assert from "node:assert/strict";
import { wallToWindow, toCanvas, dim, tailDabs, dabArea, joinAreas } from "../scripts/core/wet.mjs";
import { wallGrid } from "../scripts/core/chalk.mjs";
import { makeRig } from "../scripts/core/rigspace.mjs";
import { RAW_SCENE } from "./fixture.mjs";
import { describeScene } from "../scripts/core/scene.mjs";

const view = (w, h, iw, ih, rig) => {
  // a view as the 3D picture keeps it: the stage's window shows the reference page scaled by s, from (ox, oy)
  const s = Math.min(w / rig.ref.W, h / rig.ref.H);
  return { ox: 0, oy: 0, s, visW: rig.ref.W, visH: rig.ref.H };
};

test("the map from the wall to the window is a scale and an offset, and puts the painting's corners where the picture does", () => {
  const { scene } = describeScene(RAW_SCENE);
  const rig = makeRig(scene.painting, scene.rig);
  const grid = wallGrid(scene.painting);
  const v = view(1280, 720, 0, 0, rig);
  const m = wallToWindow({ size: rig.size, map: rig.map, view: v }, grid);
  assert.ok(m.k > 0);
  assert.ok(Math.abs(m.kx - m.ky) / m.k < 1e-9, "the wall has the painting's shape, so one scale does for both ways");
  for (const [fx, fy] of [[0, 0], [1, 1], [0.5, 0.25], [0.8, 0.9]]) {
    const wx = fx * grid.w;
    const wy = fy * grid.h;
    const want = { x: (rig.map.x(fx) - v.ox) * v.s, y: (rig.map.y(fy) - v.oy) * v.s };   // what the picture says (the probe's viewportOf)
    assert.ok(Math.abs(m.k * wx + m.bx - want.x) < 1e-6 && Math.abs(m.k * wy + m.by - want.y) < 1e-6, `(${fx}, ${fy}) lands on the window where the picture puts it`);
  }
});

test("a denser canvas scales the map, nothing else", () => {
  const m = toCanvas({ k: 0.9, bx: -20, by: 5 }, 1.5);
  assert.deepEqual([m.k, m.bx, m.by], [1.35, -30, 7.5]);
});

test("dim multiplies a colour's brightness and stays a colour", () => {
  assert.equal(dim("#ffffff", 0xee / 255), "#eeeeee");
  assert.equal(dim("#102030", 0.5), "#081018");
  assert.equal(dim("#ffffff", 2), "#ffffff");
  assert.equal(dim("#000000", 0.5), "#000000");
});

test("the tail runs from the last dab to the pointer, at the dabs' own size and spacing, and stops at the pointer", () => {
  const from = { x: 100, y: 100, size: 8, flow: 0.8, angle: 0, seed: 5, dist: 40 };
  const tail = tailDabs(from, { x: 130, y: 100 }, 0.8);
  assert.ok(tail.length >= 20 && tail.length <= 62);
  assert.deepEqual([tail.at(-1).x, tail.at(-1).y], [130, 100], "it ends on the pointer");
  assert.ok(tail.every((d) => d.size === 8 && d.flow === 0.8 && Math.abs(d.y - 100) < 1e-9));
  assert.ok(tail.every((d, i) => i === 0 || d.x >= tail[i - 1].x), "in order");
  assert.ok(tail.at(-1).dist > from.dist, "further along the stroke");
  assert.deepEqual(tailDabs(from, { x: 100.2, y: 100.2 }, 0.8), [], "a pointer that has hardly moved leaves no tail");
  assert.deepEqual(tailDabs(null, { x: 1, y: 1 }, 1), []);
  assert.ok(tailDabs(from, { x: 4000, y: 100 }, 0.4).length <= 61, "a jump of the hand never costs more than a bounded number of dabs");
});

test("the area dabs cover is in whole canvas pixels, inside the canvas, and joins", () => {
  const m = { k: 1, bx: 0, by: 0 };
  const a = dabArea([{ x: 50, y: 50, size: 10 }], m, 200, 100);
  assert.deepEqual(a, { x: 42, y: 42, w: 16, h: 16 });
  assert.deepEqual(dabArea([{ x: 2, y: 2, size: 10 }], m, 200, 100), { x: 0, y: 0, w: 10, h: 10 }, "clipped to the canvas");
  assert.equal(dabArea([{ x: -500, y: -500, size: 10 }], m, 200, 100), null, "wholly off it");
  assert.equal(dabArea([], m, 200, 100), null);
  assert.deepEqual(joinAreas(a, { x: 100, y: 10, w: 20, h: 20 }), { x: 42, y: 10, w: 78, h: 48 });
  assert.equal(joinAreas(null, a), a);
  assert.equal(joinAreas(a, null), a);
});
