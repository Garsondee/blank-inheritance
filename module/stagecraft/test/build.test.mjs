// The bundle Foundry loads (dist/stagecraft.js) must be built from the sources as they are now. A stale bundle is the
// worst kind of bug here: the tests pass and Foundry runs something else. `npm run build` fixes it.
// Also: the manifest must name files that exist (Foundry rejects a whole module that names a missing one), and the
// renderer contract must be met by the backend.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const threeInstalled = existsSync(path.join(root, "node_modules", "three", "package.json"));
const skip = threeInstalled ? false : "run npm install in module/stagecraft first";

test("the manifest names only files that exist", () => {
  const m = JSON.parse(readFileSync(path.join(root, "module.json"), "utf8"));
  for (const f of [...m.esmodules, ...(m.styles ?? []), ...(m.languages ?? []).map((l) => l.path)]) assert.ok(existsSync(path.join(root, f)), `module.json names ${f}`);
  assert.equal(m.id, "stagecraft");
  assert.ok(Number(m.compatibility.minimum) >= 14);
});

test("dist/stagecraft.js was built from the sources as they are now", { skip }, async () => {
  const { sourcesHash } = await import("../tools/build.mjs");
  const stamp = JSON.parse(readFileSync(path.join(root, "dist", "BUILD.json"), "utf8"));
  const now = sourcesHash();
  assert.equal(stamp.sources, now.hash, "the sources have changed since the bundle was built: run npm run build");
  assert.equal(stamp.three, now.three);
  assert.ok(statSync(path.join(root, "dist", "stagecraft.js")).size > 100000, "the bundle looks empty");
});

test("the bundle carries three.js's licence notice, as the licence requires", { skip }, () => {
  const text = readFileSync(path.join(root, "dist", "stagecraft.js"), "utf8");
  assert.match(text, /Copyright 2010-\d{4} Three\.js Authors|SPDX-License-Identifier: MIT/i);
});

test("the three.js backend meets the renderer contract", { skip }, async () => {
  const { assertBackend, tierSettings, TIERS } = await import("../scripts/render/contract.mjs");
  const { ThreeBackend } = await import("../scripts/render/three/backend.mjs");
  const b = new ThreeBackend();
  assert.equal(assertBackend(b, "ThreeBackend"), b);
  assert.deepEqual([...TIERS], ["high", "low", "flat"]);
  assert.equal(tierSettings("low").post, false, "the low tier has no post-processing");
  assert.equal(tierSettings("low").shadows, false);
  assert.equal(tierSettings("high").post, true);
  assert.throws(() => assertBackend({}, "empty"), /does not provide/);
  assert.throws(() => assertBackend({ ...Object.fromEntries(["mount", "unmount", "load", "resize", "setView", "setQuality", "draw", "addCard", "removeCard", "pick", "floorAt", "project", "capture", "stats", "dispose"].map((k) => [k, () => {}])), capabilities: { magic: true } }), /unknown capability/);
});

test("the camera maths puts the vanishing point where the painting's horizon is, in any viewport", { skip }, async () => {
  const THREE = await import("three");
  const { aimCamera, viewFor } = await import("../scripts/render/three/support.mjs");
  const { makeRig } = await import("../scripts/core/rigspace.mjs");
  const rig = makeRig({ size: [3072, 1536] }, { horizon: 0.56, floorFront: 0.935, depth: 1.1, vanish: 0.52, lift: 70 });
  for (const [w, h] of [[2560, 1440], [1920, 1080], [1472, 1274], [3440, 1440]]) {
    const view = viewFor(w, h);
    const camera = new THREE.PerspectiveCamera();
    aimCamera(camera, rig, view);
    // A point at the vanishing point on the z = 0 plane must land on the viewport pixel the rig says the horizon is at.
    const p = new THREE.Vector3(0, rig.cam.floorY - rig.cam.cy, 0).project(camera);
    const px = ((p.x + 1) / 2) * w;
    const py = ((1 - p.y) / 2) * h;
    const expected = { x: (rig.cam.cx - view.ox) * view.s, y: (rig.cam.cy - view.oy) * view.s };
    assert.ok(Math.abs(px - expected.x) < 0.5 && Math.abs(py - expected.y) < 0.5, `${w}x${h}: (${px.toFixed(1)}, ${py.toFixed(1)}) is not (${expected.x.toFixed(1)}, ${expected.y.toFixed(1)})`);
  }
});
