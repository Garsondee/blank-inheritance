// The three.js room (render/three/world.mjs), built without a graphics card: the parts that must never hide anything.

import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig, BACKDROP_DEPTH, DEEPEST } from "../scripts/core/rigspace.mjs";
import { Stage } from "../scripts/core/stage.mjs";
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

test("nobody is ever put behind the painting: it hangs at the core's depth, and a place near the horizon is brought forward", async () => {
  // regression, 2026-10-03: the painting hung 4000 back, and people put at the back of a long room were drawn behind it
  const world = await new World({ scene, rig, tracker: new Tracker(), softDot: null, settings: { shadows: false, footlights: true, dust: 0 } }).build({ width: 4, height: 2 });
  assert.equal(Math.round(world.backdrop.position.z), -BACKDROP_DEPTH, "the painting hangs where the core says");
  assert.ok(DEEPEST > -BACKDROP_DEPTH + 1000, "the deepest place leaves room to lean");
  const nearHorizon = [0.62, scene.rig.horizon + 0.004];
  assert.ok(rig.standing(nearHorizon).Z < DEEPEST, "the floor itself runs on behind the painting there");
  const p = rig.place(nearHorizon);
  assert.equal(p.Z, DEEPEST, "but a card put there stands in front of it");
  const raw = rig.standing(nearHorizon);
  const screen = (q) => rig.screenOf(q.X, 0, q.Z).x;
  assert.ok(Math.abs(screen(p) - screen(raw)) < 0.5, "at the same place across the page");
  const s = new Stage(scene, [{ id: "far", name: "Far", at: nearHorizon }]);
  assert.ok(s.cards.get("far").Z >= DEEPEST, "the stage puts a card there in front of the painting too");
  s.walkTo("far", { at: [0.3, scene.rig.horizon + 0.002] });
  assert.ok(s.cards.get("far").walk.to.Z >= DEEPEST, "and walks one no further back than that");
});
