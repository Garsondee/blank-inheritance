// The three.js room (render/three/world.mjs), built without a graphics card: the parts that must never hide anything.

import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig } from "../scripts/core/rigspace.mjs";
import { World } from "../scripts/render/three/world.mjs";
import { Tracker } from "../scripts/render/three/support.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const rig = makeRig(scene.painting, scene.rig);

test("the shadow-catching floor and wall hide nothing: zones and the fight board drawn on the painting show through them", async () => {
  // regression, 2026-10-03: the floor lies in front of the painting, and while it wrote depth every zone outline and board
  // wash on the floor of a room was culled; only zones at the very back, beyond the painting's own depth, ever showed
  const world = await new World({ scene, rig, tracker: new Tracker(), softDot: null, settings: { shadows: false, footlights: true, dust: 0 } }).build({ width: 4, height: 2 });
  assert.equal(world.floor.material.depthWrite, false, "the floor writes no depth");
  assert.equal(world.wall.material.depthWrite, false, "nor does the footlights' wall");
  assert.equal(world.floor.receiveShadow, true, "and the floor still takes shadows");
});
