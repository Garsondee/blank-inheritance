// Tier 3 — the travel trail's own contract with Foundry.
//
// foundry/travel-trail.mjs touches Hooks/canvas.controls/PIXI.Graphics,
// none of which test/support/mock-foundry.mjs models (same situation as
// tier3-travel-camera-contract.test.mjs, built the same night for exactly
// this reason). The pure split/colour logic is unit-tested for real in
// tier1-travel-trail.test.mjs; this file pins the wiring.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const trail = readFileSync(path.join(moduleRoot, "foundry", "travel-trail.mjs"), "utf8");
const camera = readFileSync(path.join(moduleRoot, "foundry", "travel-camera.mjs"), "utf8");
const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");

test("the trail follows the SAME updateToken event and the SAME isTravelling check as the camera, not a second notion of \"in motion\"", () => {
  assert.match(trail, /import\s*\{\s*isTravelling\s*\}\s*from\s*"\.\/travel-camera\.mjs"/, "no longer shares isTravelling with the camera — a second, driftable definition of \"in motion\" has crept in");
  assert.match(camera, /export function isTravelling\(/, "isTravelling is no longer exported from travel-camera.mjs — travel-trail.mjs would have nothing real to import");
  const fn = trail.match(/Hooks\.on\("updateToken",\s*\(tokenDoc, changes\)\s*=>\s*\{[\s\S]*?\n\s*\}\);/);
  assert.ok(fn, "could not find the registered updateToken callback");
  assert.match(fn[0], /if\s*\(!\("x" in changes\)\s*&&\s*!\("y" in changes\)\)\s*return;/);
  assert.match(fn[0], /if\s*\(!isTravelling\(tokenDoc\)\)\s*return;/);
});

test("the trail is drawn on canvas.controls — the same ephemeral, non-scene-content layer Foundry's own Ruler/pings use — never written as a real Scene document", () => {
  assert.match(trail, /canvas\.controls\.addChild\(new PIXI\.Graphics\(\)\)/, "no longer draws on canvas.controls — this would either persist as real scene content or draw on the wrong layer");
  assert.doesNotMatch(trail, /createEmbeddedDocuments\(\s*"Drawing"/, "the trail must never become a real Drawing document — it is a per-client visual aid, not game state");
});

test("the trail is cleaned up on canvasReady (a scene change tears down canvas.controls itself) and on deleteToken, so it can never reference a destroyed graphics object", () => {
  assert.match(trail, /Hooks\.on\("canvasReady",\s*\(\)\s*=>\s*clearAllTrails\(\)\);/);
  assert.match(trail, /Hooks\.on\("deleteToken",\s*\(tokenDoc\)\s*=>\s*clearTrail\(tokenDoc\.id\)\);/);
});

test("registerTravelTrailHook is called during init, on every client, right alongside the camera hook", () => {
  assert.match(entry, /import\s*\{\s*registerTravelTrailHook\s*\}\s*from\s*"\.\/foundry\/travel-trail\.mjs"/);
  assert.match(entry, /registerTravelTrailHook\(\);/);
});

test("the remaining (not-yet-ridden) half of the trail is always drawn faded, and travelled always drawn solid, in that order so travelled draws on top at the shared boundary point", () => {
  const fn = trail.match(/function drawTrail\([\s\S]*?\n\}/);
  assert.ok(fn, "drawTrail is missing");
  const remainingIndex = fn[0].indexOf("drawSegments(g, remaining, REMAINING_ALPHA)");
  const traveledIndex = fn[0].indexOf("drawSegments(g, traveled, TRAVELED_ALPHA)");
  assert.ok(remainingIndex > -1 && traveledIndex > -1 && remainingIndex < traveledIndex, "remaining must draw before traveled, so the solid line is never covered by the faded one");
});
