// The box of chalk is a prop in a deep room, so its sticks are small on the screen. A click has to find them anyway.
// Each stick (and the eraser) carries an invisible, much larger shape that is tested but never drawn; these tests
// cast rays at the real geometry with real three.js (no browser needed) and check what a click would pick.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ChalkBox, BOX } from "../scripts/render/three/chalk.mjs";
import { Tracker } from "../scripts/render/three/support.mjs";
import { COLOURS } from "../scripts/core/chalk.mjs";

const standingRig = { standing: ([x, y]) => ({ X: x * 100, Z: -y * 100 }) };

function build(rig = standingRig, at = [0, 0]) {
  const scene = new THREE.Scene();
  const tracker = new Tracker();
  const box = new ChalkBox({ scene, rig, at, tracker });
  scene.updateMatrixWorld(true);
  return { scene, tracker, box };
}

/** Fire a ray straight back from in front of a point and say which pickable it meets first. */
function pickAt(box, point) {
  const ray = new THREE.Raycaster(new THREE.Vector3(point.x, point.y, point.z + 500), new THREE.Vector3(0, 0, -1));
  return ray.intersectObjects(box.pickables, false)[0]?.object ?? null;
}
const centreOf = (target) => target.parent.localToWorld(target.position.clone());
const name = (object) => (object ? object.userData.chalk ?? (object.userData.eraser ? "the eraser" : "something else") : "nothing");   // never print a three.js object: it is circular

test("there is one thing to pick for each colour, and one for the eraser, and nothing else", () => {
  const { box } = build();
  assert.equal(box.pickables.length, COLOURS.length + 1);
  assert.deepEqual(box.pickables.filter((p) => p.userData.chalk).map((p) => p.userData.chalk), [...COLOURS]);
  assert.equal(box.pickables.filter((p) => p.userData.eraser).length, 1);
});

test("a click on the middle of each stick, and of the eraser, picks that one", () => {
  const { box } = build();
  for (const target of box.pickables) {
    const hit = pickAt(box, centreOf(target));
    assert.equal(name(hit), name(target), "picked from its middle");
  }
});

test("a click a hand's width to either side still picks the stick, but two sticks away does not", () => {
  const { box } = build();
  const sticks = box.pickables.filter((p) => p.userData.chalk);
  const c = centreOf(sticks[2]);
  for (const dx of [-10, -6, 6, 10]) assert.equal(name(pickAt(box, { x: c.x + dx, y: c.y, z: c.z })), name(sticks[2]), `${dx} units off`);
  const far = pickAt(box, { x: c.x + 2 * BOX.stick.spacing, y: c.y, z: c.z });
  assert.notEqual(name(far), name(sticks[2]));
});

test("a click well above a stick, or beside the box, picks nothing", () => {
  const { box } = build();
  const c = centreOf(box.pickables[0]);
  assert.equal(name(pickAt(box, { x: c.x, y: c.y + 200, z: c.z })), "nothing");
  assert.equal(name(pickAt(box, { x: c.x - 120, y: c.y, z: c.z })), "nothing");
});

test("the hit shapes are never drawn", () => {
  const { box } = build();
  assert.ok(box.pickables.every((p) => p.material.visible === false), "invisible to the camera, solid to a click");
  const drawn = [];
  box.group.traverse((o) => { if (o.isMesh && o.material.visible !== false) drawn.push(o); });
  assert.ok(drawn.length >= 4 + 1 + COLOURS.length + 1, `the tray, the sticks and the eraser are drawn (${drawn.length} meshes)`);
});

test("each hit shape is wider than the stick it belongs to, so it is easy to hit", () => {
  assert.ok(BOX.hit.radius >= BOX.stick.radius * 1.5);
  assert.ok(BOX.hit.radius * 2 <= BOX.stick.spacing, "but neighbours do not overlap");
});

test("a box with nowhere to stand (above the horizon) is hidden and offers nothing to pick", () => {
  const { box } = build({ standing: () => null });
  assert.equal(box.group.visible, false);
  assert.equal(box.pickables.length, 0);
  box.setVisible(true);
  assert.equal(box.group.visible, false, "it cannot be shown either");
});

test("the box can be shown and hidden, and everything it made is freed with the tracker", () => {
  const { box, tracker } = build();
  box.setVisible(false);
  assert.equal(box.group.visible, false);
  box.setVisible(true);
  assert.equal(box.group.visible, true);
  assert.ok(tracker.size > 5);
  tracker.disposeAll();
  assert.equal(tracker.size, 0);
});
