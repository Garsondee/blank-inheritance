// The flat backend's geometry (render/flat/geometry.mjs): where a card stands on the screen, what a click lands on, and how
// a point of the screen maps back to the floor and the painting. Run against the same rig the three.js backend uses, and
// checked against three.js itself, so the two pictures cannot disagree about where anything is.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig, viewFor } from "../scripts/core/rigspace.mjs";
import { aimCamera } from "../scripts/render/three/support.mjs";
import { mul, translate, scale, rotate, apply, invert, project, floorAt, paintingAt, cardPlacement, hitCard, byDepth, toWindow, toPage } from "../scripts/render/flat/geometry.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const rig = makeRig(scene.painting, scene.rig);
const FACE = { w: 280, h: 468 };
const near = (a, b, tol, what = "") => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not within ${tol} of ${b}`);
const card = (over = {}) => ({ id: "ana", x: 0, z: 0, lift: 0, lean: 0, yaw: 0, pitch: 0, grip: 0, breathe: 1, squash: 1, scale: 0.7, ...over });

test("2D transforms compose in the order they are written, and invert", () => {
  const m = mul(translate(10, 20), mul(scale(2), rotate(Math.PI / 2)));      // rotate, then scale, then move
  const p = apply(m, 1, 0);
  near(p.x, 10, 1e-9); near(p.y, 22, 1e-9);
  const back = apply(invert(m), p.x, p.y);
  near(back.x, 1, 1e-9); near(back.y, 0, 1e-9);
  assert.equal(invert([0, 0, 0, 0, 5, 5]), null, "a flattened transform cannot be undone");
});

test("the window and the reference page convert both ways, in any window shape", () => {
  for (const [w, h] of [[1920, 1080], [1280, 1024], [800, 1200], [2560, 1440]]) {
    const view = viewFor(w, h);
    for (const [x, y] of [[0, 0], [w / 2, h / 2], [w - 1, h - 1], [123, 456]]) {
      const page = toPage(view, x, y);
      const win = toWindow(view, page.x, page.y);
      near(win.x, x, 1e-9); near(win.y, y, 1e-9);
    }
  }
});

test("a point on the floor, projected to the window and asked for again, comes back, at any height", () => {
  const view = viewFor(1920, 1080);
  for (const height of [0, 40, 180]) {
    for (const [X, Z] of [[0, 0], [-300, -400], [250, 120], [600, -900]]) {
      const w = project(rig, view, { X, Y: height, Z });
      const back = floorAt(rig, view, w.x, w.y, height);
      assert.ok(back, `(${X}, ${Z}) at ${height}`);
      near(back.x, X, 1e-6, "x"); near(back.z, Z, 1e-6, "z");
    }
  }
});

test("above the horizon there is no floor", () => {
  const view = viewFor(1920, 1080);
  assert.equal(floorAt(rig, view, 960, 10, 0), null);
});

test("the point of the painting under the window is found, and nothing off the painting is", () => {
  const view = viewFor(1920, 1080);
  const target = [0.4, 0.7];
  const page = { x: rig.map.x(target[0]), y: rig.map.y(target[1]) };
  const win = toWindow(view, page.x, page.y);
  const at = paintingAt(rig, view, win.x, win.y);
  near(at.x, target[0], 1e-9); near(at.y, target[1], 1e-9);
  assert.equal(paintingAt(rig, view, -5000, 100), null);
});

test("the flat floor is the three.js floor: the same point, in the same window, for any height", () => {
  const view = viewFor(1920, 1080);
  const camera = new THREE.PerspectiveCamera();
  aimCamera(camera, rig, view);
  const threeFloor = (x, y, height) => {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / 1920) * 2 - 1, -((y / 1080) * 2 - 1)), camera);
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), out) ? { x: out.x, z: out.z } : null;
  };
  for (const height of [0, 60, 200]) {
    for (const [x, y] of [[960, 900], [300, 800], [1500, 700], [1000, 1000]]) {
      const a = floorAt(rig, view, x, y, height);
      const b = threeFloor(x, y, height);
      assert.ok(a && b, `${x},${y} at ${height}`);
      near(a.x, b.x, 0.01, "x"); near(a.z, b.z, 0.01, "z");
    }
  }
});

test("a card stands where the rig puts its foot, as big as the perspective says", () => {
  const view = viewFor(1920, 1080);
  const c = card({ x: 120, z: -200 });
  const pl = cardPlacement(c, rig, view);
  const foot = project(rig, view, { X: 120, Y: 0, Z: -200 });
  near(pl.at.x, foot.x, 1e-9); near(pl.at.y, foot.y, 1e-9);
  const bottom = apply(pl.m, 0, 0);
  const top = apply(pl.m, 0, -FACE.h);
  near(bottom.x, foot.x, 1e-6); near(bottom.y, foot.y, 1e-6);
  near(bottom.y - top.y, FACE.h * 0.7 * foot.k * view.s, 1e-6, "its height on the screen");
  const further = cardPlacement(card({ z: -800 }), rig, view);
  const closer = cardPlacement(card({ z: 200 }), rig, view);
  assert.ok(apply(further.m, 0, -FACE.h).y < apply(further.m, 0, 0).y);
  assert.ok((apply(closer.m, 0, 0).y - apply(closer.m, 0, -FACE.h).y) > (apply(further.m, 0, 0).y - apply(further.m, 0, -FACE.h).y), "a nearer card is taller on the screen");
});

test("a card leans the way the engine says: positive lean tips the top to the right, and the stick swings the card more than the card swings", () => {
  const view = viewFor(1920, 1080);
  const upright = cardPlacement(card({ z: -300 }), rig, view);
  const leaning = cardPlacement(card({ z: -300, lean: 12 }), rig, view);
  const top = (pl) => apply(pl.m, 0, -FACE.h);
  assert.ok(top(leaning).x > top(upright).x + 5, "the top went right");
  const heldLeaning = cardPlacement(card({ z: -300, lean: 12, grip: 1 }), rig, view);
  assert.ok(heldLeaning.hinge > 0, "a held card is lifted on its stick");
  assert.ok(apply(heldLeaning.m, 0, 0).y < apply(leaning.m, 0, 0).y - 20, "and its bottom is higher on the screen");
});

test("a card turned away shows its back, and edge on it is thin but never gone", () => {
  const view = viewFor(1920, 1080);
  assert.equal(cardPlacement(card({ yaw: 20 }), rig, view).back, false);
  assert.equal(cardPlacement(card({ yaw: 150 }), rig, view).back, true);
  assert.equal(cardPlacement(card({ yaw: -150 }), rig, view).back, true);
  const edge = cardPlacement(card({ yaw: 90 }), rig, view);
  const wide = cardPlacement(card({ yaw: 0 }), rig, view);
  const width = (pl) => Math.abs(apply(pl.m, FACE.w / 2, 0).x - apply(pl.m, -FACE.w / 2, 0).x);
  assert.ok(width(edge) > 0 && width(edge) < width(wide) * 0.1);
  near(cardPlacement(card({ yaw: 60 }), rig, view).side, Math.sin(Math.PI / 3), 1e-9);
});

test("a click inside a card lands on it, at the height of the point, and a click beside it does not", () => {
  const view = viewFor(1920, 1080);
  const c = card({ x: 0, z: -200, lift: 10 });
  const pl = cardPlacement(c, rig, view);
  const mid = apply(pl.m, 0, -FACE.h / 2);
  const h = hitCard(pl, c, FACE, mid.x, mid.y);
  assert.ok(h !== null);
  near(h, 10 + (FACE.h / 2) * 0.7, 0.5, "the grabbed point is half way up the card");
  const low = apply(pl.m, 0, -2);
  assert.ok(hitCard(pl, c, FACE, low.x, low.y) < h, "lower on the card is lower in the air");
  assert.equal(hitCard(pl, c, FACE, mid.x + 400, mid.y), null);
  assert.equal(hitCard(pl, c, FACE, mid.x, mid.y - FACE.h * pl.px), null, "above the top");
  const foot = apply(pl.m, 0, 6);
  assert.ok(hitCard(pl, c, FACE, foot.x, foot.y) !== null, "the foot is part of the card");
});

test("further cards are drawn first", () => {
  assert.deepEqual([{ z: 100 }, { z: -300 }, { z: 0 }].sort(byDepth).map((d) => d.z), [-300, 0, 100]);
});
