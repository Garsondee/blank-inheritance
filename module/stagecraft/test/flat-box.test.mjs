// The flat box of chalk (render/flat/box.mjs): where its parts fall on the screen and what a click lands on. Checked against
// the real three.js box, so the two pictures put the same sticks in the same places.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig, viewFor } from "../scripts/core/rigspace.mjs";
import { COLOURS, BOX, DEFAULT_BOX } from "../scripts/core/chalk.mjs";
import { aimCamera, Tracker } from "../scripts/render/three/support.mjs";
import { ChalkBox } from "../scripts/render/three/chalk.mjs";
import { boxLayout, hitBox } from "../scripts/render/flat/box.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const rig = makeRig(scene.painting, scene.rig);
const view = viewFor(1920, 1080);
const AT = [0.77, 0.91];
const mid = (r) => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });

test("there is a stick for each colour, in order, and an eraser, and the box is as deep in the room as the place it stands", () => {
  const layout = boxLayout(rig, view, AT);
  assert.deepEqual(layout.sticks.map((s) => s.colour), [...COLOURS]);
  assert.ok(layout.eraser.hit);
  const place = rig.standing(AT);
  assert.equal(layout.z, place.Z);
  for (const part of ["floor", "back", "left", "right", "front"]) assert.equal(layout[part].length, 4, `${part} is a quadrilateral`);
});

test("a box with nowhere to stand (above the horizon) is not laid out at all", () => {
  assert.equal(boxLayout(rig, view, [0.5, 0.2]), null);
  assert.equal(hitBox(null, 100, 100), null);
});

test("a click in the middle of each stick, and of the eraser, lands on it", () => {
  const layout = boxLayout(rig, view, AT);
  for (const s of layout.sticks) {
    const c = mid(s.hit);
    assert.deepEqual(hitBox(layout, c.x, c.y), { kind: "chalk", colour: s.colour });
  }
  const e = mid(layout.eraser.hit);
  assert.deepEqual(hitBox(layout, e.x, e.y), { kind: "eraser" });
});

test("a click a hand's width to either side still lands on the stick, and well above or beside the box lands on nothing", () => {
  const layout = boxLayout(rig, view, AT);
  const s = layout.sticks[2];
  const c = mid(s.hit);
  const width = s.hit.x1 - s.hit.x0;
  for (const dx of [-0.4, 0.4]) assert.equal(hitBox(layout, c.x + dx * width, c.y)?.colour, s.colour, `${dx} widths off`);
  assert.equal(hitBox(layout, c.x, s.hit.y0 - 60), null, "well above");
  assert.equal(hitBox(layout, layout.sticks[0].hit.x0 - 80, c.y), null, "beside the box");
});

test("each hit rectangle is wider than the stick it belongs to, and neighbours do not overlap", () => {
  const layout = boxLayout(rig, view, AT);
  layout.sticks.forEach((s, i) => {
    assert.ok(s.hit.x1 - s.hit.x0 >= s.width * 1.5, `stick ${i}: hit ${s.hit.x1 - s.hit.x0} against ${s.width} drawn`);
    if (i) assert.ok(layout.sticks[i - 1].hit.x1 <= s.hit.x0 + 0.5, `sticks ${i - 1} and ${i} overlap`);
  });
});

test("the flat box is the three.js box: each stick's middle is at the same place in the window", () => {
  const camera = new THREE.PerspectiveCamera();
  aimCamera(camera, rig, view);
  const scene3 = new THREE.Scene();
  const box = new ChalkBox({ scene: scene3, rig, at: AT, tracker: new Tracker() });
  scene3.updateMatrixWorld(true);
  const layout = boxLayout(rig, view, AT);
  const window3 = (target) => {
    const p = target.parent.localToWorld(target.position.clone()).project(camera);
    return { x: ((p.x + 1) / 2) * view.vw, y: ((1 - p.y) / 2) * view.vh };
  };
  const targets = box.pickables;
  assert.equal(targets.length, layout.sticks.length + 1);
  layout.sticks.forEach((s, i) => {
    const t = window3(targets[i]);
    const c = mid(s.hit);
    assert.ok(Math.abs(t.x - c.x) < 2, `${s.colour}: x ${t.x} against ${c.x}`);
    assert.ok(t.y >= s.hit.y0 && t.y <= s.hit.y1, `${s.colour}: y ${t.y} is inside ${s.hit.y0}..${s.hit.y1}`);
  });
  const eraser = window3(targets[targets.length - 1]);
  const e = layout.eraser.hit;
  assert.ok(eraser.x >= e.x0 && eraser.x <= e.x1 && eraser.y >= e.y0 && eraser.y <= e.y1, "the eraser too");
});

test("the box's measures are the shared ones, and where it stands by default is on the painting", () => {
  assert.ok(BOX.hit.radius * 2 <= BOX.stick.spacing);
  assert.ok(DEFAULT_BOX.every((n) => n > 0 && n < 1));
});
