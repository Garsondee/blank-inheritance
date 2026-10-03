import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene, CHALK_MODES, ZONE_KINDS } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";

test("a complete description is understood without a complaint", () => {
  const r = describeScene(RAW_SCENE);
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
  assert.equal(r.usable, true);
  assert.equal(r.scene.lights.length, 5);
  assert.equal(r.scene.zones.length, 4);
  assert.equal(r.scene.marks.length, 6);
  assert.equal(r.scene.chalk.mode, "zones");
});

test("defaults are filled in: a light needs only a place, a mark only a place, a zone only a shape", () => {
  const r = describeScene({
    painting: RAW_SCENE.painting, rig: RAW_SCENE.rig,
    lights: [{ at: [0.5, 0.2] }],
    marks: [{ id: "m", at: [0.5, 0.9] }],
    zones: [{ id: "z", shape: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]] }]
  });
  assert.equal(r.ok, true, r.problems.join("; "));
  const [l] = r.scene.lights;
  assert.deepEqual(l.colour, [255, 172, 96]);
  assert.equal(l.shadow, false);
  assert.equal(r.scene.marks[0].capacity, 1);
  assert.equal(r.scene.zones[0].kind, "trigger", "an unnamed kind is a trigger");
  assert.equal(r.scene.zones[0].gate, "open");
  assert.equal(r.scene.chalk.mode, "off", "chalk is off unless a scene says otherwise");
  assert.equal(r.scene.reach.snap, 170);
});

test("no painting or no rig means the scene is not usable, and says why", () => {
  const r = describeScene({});
  assert.equal(r.usable, false);
  assert.ok(r.problems.some((p) => p.startsWith("painting.src")));
  assert.ok(r.problems.some((p) => p.startsWith("rig.horizon")));
  assert.equal(describeScene(null).usable, false);
});

test("a rig whose floor is above its horizon is refused", () => {
  const r = describeScene({ ...RAW_SCENE, rig: { ...RAW_SCENE.rig, floorFront: 0.5 } });
  assert.ok(r.problems.some((p) => /floor must meet/.test(p)));
});

test("bad points are reported with where they are, and the rest of the scene survives", () => {
  const r = describeScene({ ...RAW_SCENE, zones: [{ id: "z", kind: "area", shape: [[0.1, 0.1], [0.2, "x"], [0.3, 0.3], [0.1, 0.3]] }], marks: [{ id: "m", at: [5, 5] }] });
  assert.ok(r.problems.some((p) => p.includes("zones[0].shape[1]")));
  assert.ok(r.problems.some((p) => p.includes("marks[0].at")));
  assert.equal(r.usable, true);
  assert.equal(r.scene.zones.length, 1, "the zone keeps its three good points");
  assert.equal(r.scene.marks.length, 0);
});

test("ids must be unique, and a mark may only belong to or face a zone the scene has", () => {
  const r = describeScene({
    ...RAW_SCENE,
    marks: [{ id: "a", at: [0.5, 0.9], zone: "nowhere" }, { id: "a", at: [0.6, 0.9] }, { id: "b", at: [0.7, 0.9], faces: { zone: "alsonowhere" } }]
  });
  assert.ok(r.problems.some((p) => p.includes('id "a" is used twice')));
  assert.ok(r.problems.some((p) => p.includes('zone "nowhere"')));
  assert.ok(r.problems.some((p) => p.includes('zone "alsonowhere"')));
});

test("chalk: the modes are exactly off, zones and anywhere; zones mode needs a chalk zone", () => {
  assert.deepEqual([...CHALK_MODES], ["off", "zones", "anywhere"]);
  assert.equal(describeScene({ ...RAW_SCENE, chalk: { mode: "everywhere" } }).scene.chalk.mode, "off");
  assert.ok(describeScene({ ...RAW_SCENE, chalk: { mode: "everywhere" } }).problems.some((p) => p.includes("chalk.mode")));
  const noZone = describeScene({ ...RAW_SCENE, zones: RAW_SCENE.zones.filter((z) => z.kind !== "chalk") });
  assert.ok(noZone.problems.some((p) => /no zone of kind chalk/.test(p)));
  assert.equal(describeScene({ ...RAW_SCENE, chalk: { mode: "anywhere" } }).ok, true);
});

test("the zone kinds the module knows include the fun ones, and any other kind is allowed (it is a trigger)", () => {
  for (const k of ["door", "spot", "area", "exit", "track", "chalk", "podium", "photo", "quiet", "music", "shelter", "shot", "trigger"]) assert.ok(ZONE_KINDS.includes(k), k);
  const r = describeScene({ ...RAW_SCENE, zones: [{ id: "dartboard", kind: "dartboard", shape: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]] }], chalk: { mode: "off" } });
  assert.equal(r.scene.zones[0].kind, "dartboard");
});

test("the description is a copy: changing it afterwards does not change the input", () => {
  const raw = JSON.parse(JSON.stringify(RAW_SCENE));
  const r = describeScene(raw);
  r.scene.lights[0].at[0] = 0.99;
  r.scene.marks[0].at[0] = 0.99;
  assert.equal(raw.lights[0].at[0], 0.165);
  assert.equal(raw.marks[0].at[0], 0.3);
});
