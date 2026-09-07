// Tier 1 — the staged Scene's data.
//
// Every assertion in here is guarding against a failure that produces NO error
// message in Foundry, only a wrong-looking screen:
//
//   background at the top level of scene data  -> no picture, no warning
//   padding left at its 0.25 default           -> the art in a grey border
//   a grid type other than gridless            -> a battlemap grid over a room
//   tokenVision left on                        -> a black screen with no tokens
//
// Every one of those is a thing to sit and stare at for twenty minutes.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LEVEL_ID,
  GRIDLESS,
  buildStageCast,
  buildStageSceneData
} from "../module/blank-inheritance/scripts/core/generators/stage-scene.mjs";

const SOURCE = {
  id: "stage-demo-bar",
  name: "Demo — A Bar, Late",
  layout: "conversation",
  cast: [
    { portraitId: "sato-hiroshi", side: "left", revealed: true },
    { portraitId: "directorate-security", side: "right", revealed: false }
  ]
};

const PORTRAITS = {
  "sato-hiroshi": { id: "sato-hiroshi", label: "Sato Hiroshi", kind: "pc", characterRef: "sato-hiroshi" },
  "directorate-security": { id: "directorate-security", label: "Directorate Security", kind: "npc", characterRef: null }
};

const BG = "modules/blank-inheritance/assets/stage/bg-stage-demo-bar.webp";
const assetPath = (id) => `modules/blank-inheritance/assets/stage/${id}.webp`;

test("the background goes on the LEVEL, not on the scene", () => {
  // Scene#background is a deprecation shim in v14 (common/documents/scene.mjs:334-349).
  // Writing it at the top level does nothing at all — no error, no picture.
  const data = buildStageSceneData(SOURCE, "abc123", BG);
  assert.equal(data.background, undefined, "background is back at the top level, where it does nothing");
  assert.equal(data.levels.length, 1);
  assert.equal(data.levels[0].background.src, BG);
  assert.equal(data.levels[0]._id, DEFAULT_LEVEL_ID, "the id Foundry's own shim maps Scene#background to");
});

test("padding is 0, so there is no border of empty canvas around the art", () => {
  // The default is 0.25 (common/documents/scene.mjs:78) and the background is
  // always sized to sceneRect, never to the padded rect — so a default-padded
  // stage scene draws the picture inside a frame of nothing.
  const data = buildStageSceneData(SOURCE, "abc123", BG);
  assert.equal(data.padding, 0);
  assert.equal(data.shiftX, 0);
  assert.equal(data.shiftY, 0);
});

test("whatever the camera cannot fill is black, not Foundry's default grey", () => {
  // Level#background.color defaults to #999999 (common/documents/level.mjs:87).
  assert.equal(buildStageSceneData(SOURCE, "abc123", BG).levels[0].background.color, "#000000");
});

test("the scene is gridless and the same shape as its artwork", () => {
  const data = buildStageSceneData(SOURCE, "abc123", BG);
  assert.equal(data.grid.type, GRIDLESS);
  assert.equal(GRIDLESS, 0, "CONST.GRID_TYPES.GRIDLESS is 0 (common/constants.mjs:584)");
  assert.equal(data.width, 1920);
  assert.equal(data.height, 960);
  assert.equal(data.width / data.height, 2, "the staged backgrounds are authored at 2:1");
});

test("vision and darkness are off — this is a picture, not a battlefield", () => {
  const data = buildStageSceneData(SOURCE, "abc123", BG);
  assert.equal(data.tokenVision, false, "token vision with no tokens is a black screen");
  assert.equal(data.environment.darknessLevel, 0);
  assert.equal(data.environment.globalLight.enabled, true);
});

test("the initial view is the centre of the scene", () => {
  const data = buildStageSceneData(SOURCE, "abc123", BG, { width: 1600, height: 800 });
  assert.deepEqual(data.initial, { x: 800, y: 400 });
});

test("a scene with no background is refused rather than built blank", () => {
  assert.throws(() => buildStageSceneData(SOURCE, "abc123", null), /no background/);
  assert.throws(() => buildStageSceneData(SOURCE, null, BG), /deterministic id/);
});

test("the cast keeps everyone, revealed or not — this half is GM-side", () => {
  const cast = buildStageCast(SOURCE, PORTRAITS, assetPath);
  assert.equal(cast.length, 2);
  assert.deepEqual(cast.map((m) => m.revealed), [true, false]);
});

test("a cast member's portrait path is derived from the stable id alone", () => {
  // The whole point of the manifest's ids: when the real asset pipeline
  // renames every source file, nothing that points at assets/stage/<id>.webp
  // has to move.
  const cast = buildStageCast(SOURCE, PORTRAITS, assetPath);
  assert.equal(cast[0].img, "modules/blank-inheritance/assets/stage/sato-hiroshi.webp");
});

test("casting a portrait the manifest does not define is an error, not a blank frame", () => {
  assert.throws(
    () => buildStageCast({ id: "s", cast: [{ portraitId: "ghost" }] }, PORTRAITS, assetPath),
    /does not define/
  );
});

test("revealed defaults to true, so a cast entry has to opt IN to being concealed", () => {
  // The safe direction: forgetting the flag puts somebody on screen, which is
  // visible and fixable. The other default would hide people silently.
  const cast = buildStageCast({ id: "s", cast: [{ portraitId: "sato-hiroshi" }] }, PORTRAITS, assetPath);
  assert.equal(cast[0].revealed, true);
});
