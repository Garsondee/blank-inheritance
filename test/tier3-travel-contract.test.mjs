// Tier 3 — the "SCENE -> MAP -> SCENE" wiring's contract with itself.
//
// travel-route.mjs, travel-animation.mjs and travel-trigger.mjs are each
// already unit-tested in isolation (tier1). What has never been proven is
// that scene-runner.mjs's own cut action actually reaches them — the one
// new integration point this adds. foundry/travel.mjs touches real Foundry
// Scene/Token embedded-collection APIs (scene.tokens, createEmbeddedDocuments)
// that test/support/mock-foundry.mjs does not model, so — matching
// tier3-deck-contract.test.mjs's own established pattern for exactly this
// situation — this reads the real source and pins the handful of facts that
// have to stay true for the wiring to work, rather than mounting the class.
//
// The full animated crossing is proven live instead, against the local
// Foundry test world (reference_local_foundry_test_environment).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const sceneRunner = readFileSync(path.join(moduleRoot, "foundry", "scene-runner.mjs"), "utf8");
const travel = readFileSync(path.join(moduleRoot, "foundry", "travel.mjs"), "utf8");
const sceneBuild = readFileSync(path.join(moduleRoot, "foundry", "scene-build.mjs"), "utf8");

test("scene-runner imports the travel gate and the travel ritual", () => {
  assert.match(sceneRunner, /import\s*\{\s*needsTravel\s*\}\s*from\s*"\.\.\/core\/travel-trigger\.mjs"/);
  assert.match(sceneRunner, /import\s*\{\s*runTravelSequence\s*\}\s*from\s*"\.\/travel\.mjs"/);
});

test("cutting to a backdrop reads locationRef off both the active scene and the target, not just one", () => {
  const cutTo = sceneRunner.match(/static async #onCutTo\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(cutTo, "could not find #onCutTo");
  assert.match(cutTo[0], /game\.scenes\.active\?\.getFlag\(MODULE_ID,\s*"locationRef"\)/, "no longer reads the CURRENT scene's location");
  assert.match(cutTo[0], /game\.scenes\.get\(targetSceneId\)\?\.getFlag\(MODULE_ID,\s*"locationRef"\)/, "no longer reads the TARGET scene's location");
  assert.match(cutTo[0], /needsTravel\(fromRef,\s*toRef\)/, "no longer gates on needsTravel");
  assert.match(cutTo[0], /runTravelSequence\(fromRef,\s*toRef,\s*targetSceneId\)/, "the travel branch no longer calls runTravelSequence");
});

test("scene-build stamps every real scene with the same locationRef flag travel.mjs and scene-runner both read", () => {
  // The whole wiring only works because these three files agree on both the
  // flag's NAME and which module namespaces it — confirmed here rather than
  // trusted, since a rename in one place would otherwise fail silently (every
  // cut would just read undefined on both sides and never travel).
  assert.match(sceneBuild, /scene\.setFlag\(MODULE_ID,\s*"locationRef",\s*plan\.locationRef\)/);
  assert.match(sceneRunner, /getFlag\(MODULE_ID,\s*"locationRef"\)/);
  assert.match(travel, /HUB_SOURCE_ID\s*=\s*"the-city"/, "travel.mjs's hub scene id no longer matches scene-set.json's own \"the-city\" hub entry");
});

test("runTravelSequence always cues the destination, whether or not the map animation itself succeeded", () => {
  // The try/catch must wrap ONLY the animation, and the final cueScene call
  // must sit outside it and run unconditionally — a broken graph, a missing
  // hub scene, or an unmapped location must still get the table there.
  const fn = travel.match(/export async function runTravelSequence\([\s\S]*?\n\}/);
  assert.ok(fn, "could not find runTravelSequence");
  assert.match(fn[0], /try\s*\{\s*await animateOnHub\(/, "the animation is no longer wrapped in its own try");
  assert.match(fn[0], /\}\s*catch\s*\(err\)\s*\{/);
  const afterCatch = fn[0].slice(fn[0].indexOf("} catch"));
  assert.match(afterCatch, /await cueScene\(destinationSceneId,/, "the final cut to the destination no longer runs unconditionally after the catch");
});

test("the hub scene is found by its sourceId flag first, not only by the deterministic id (regression: an ADOPTED hub, e.g. the real Campaign Map, keeps its own foreign id forever)", () => {
  const fn = travel.match(/async function hubScene\(\)[\s\S]*?\n\}/);
  assert.ok(fn, "could not find hubScene");
  assert.match(fn[0], /game\.scenes\.find\(\(s\) => s\.getFlag\(MODULE_ID, "sourceId"\) === HUB_SOURCE_ID\)/, "hubScene no longer checks the sourceId flag first — an adopted hub (a foreign, non-deterministic id) would never be found");
});

test("travel never hard-fails a missing hub scene, an unmapped location, or an empty route", () => {
  const animate = travel.match(/async function animateOnHub\([\s\S]*?\n\}/);
  assert.ok(animate, "could not find animateOnHub");
  assert.match(animate[0], /if\s*\(!hub\)\s*return;/, "no longer degrades gracefully when the hub scene doesn't exist");
  // `continue`, not `return`: this runs per-LEG (split-party travel,
  // 2026-09-22), so one leg's missing centroid must skip only that leg,
  // not cancel every other group's crossing too.
  assert.match(animate[0], /if\s*\(!from\s*\|\|\s*!to\)\s*continue;/, "no longer degrades gracefully when a location has no centroid");
  // Same per-leg `continue` reasoning as above. The variable is `hops` now
  // (2026-09-23's mode-aware hopPlan rewrite) — was `points`, was
  // `scenePoints` before that; each rename is stale test debt this project
  // has already hit twice, which is exactly why the regex is re-derived
  // here rather than assumed unchanged.
  assert.match(animate[0], /if\s*\(hops\.length\s*===\s*0\)\s*continue;/, "no longer degrades gracefully when the route is empty");
});

/* ------------------------------------------------------------------ */
/*  convergeTokensOnHub (2026-09-23) -- moving REAL, already-existing   */
/*  tokens (the six demo candidates), never the generic arrow marker.  */
/* ------------------------------------------------------------------ */

test("convergeTokensOnHub is GM-gated, resolves each move's own token by id, and never touches texture/tint the way ensureTravelToken does", () => {
  const fn = travel.match(/export async function convergeTokensOnHub\([\s\S]*?\n\}/);
  assert.ok(fn, "convergeTokensOnHub is missing");
  assert.match(fn[0], /if\s*\(!game\.user\?\.isGM\)\s*return;/, "no longer GM-gated -- every connected client would try to drive the same tokens");
  assert.match(fn[0], /const token = hub\.tokens\.get\(move\.tokenId\);/, "no longer resolves the caller's own real token by id -- it would have nothing to move, or move the wrong thing");
  assert.doesNotMatch(fn[0], /texture/, "convergeTokensOnHub must never touch a token's texture/tint -- these are real, already-styled tokens (or will be, once real art lands), not the generic travel-marker");
});

test("convergeTokensOnHub shares the SAME calibration, graph, and hop planning as animateOnHub -- one real transform and one real speed model, not a second copy", () => {
  const fn = travel.match(/export async function convergeTokensOnHub\([\s\S]*?\n\}/);
  assert.match(fn[0], /sceneCalibration\(/);
  assert.match(fn[0], /routerFor\(graph\)\.plan\(/, "no longer plans through the cached router (core/travel-route.mjs#routerFor, held to planRoute by test/tier1-travel-router.test.mjs)");
  assert.match(fn[0], /hopPlan\(route\.segments, \{ wayClass: graph\.wayClass \?\? \{\} \}\)/);
  assert.match(fn[0], /animateTokenAlongHops\(/, "no longer reuses the shared per-hop animation function animateOnHub itself uses");
});

test("demo-runner's converge-on-gate step is the only caller today, and it targets six real, distinct origins converging on one real destination", () => {
  const demoRunner = readFileSync(path.join(moduleRoot, "foundry", "demo-runner.mjs"), "utf8");
  assert.match(demoRunner, /convergeTokensOnHub\(moves\)/);
});

test("convergeTokensOnHub cuts the viewed canvas to the hub itself before moving anything — the exact live bug found 2026-09-23 (tokens moved correctly, but nothing was visible because the viewed scene never changed)", () => {
  const fn = travel.match(/export async function convergeTokensOnHub\([\s\S]*?\n\}/);
  assert.ok(fn, "convergeTokensOnHub is missing");
  assert.match(fn[0], /await cueScene\(hub\.id, \{ transitionType: "fade", transitionDuration: FADE_MS \}\);/, "no longer cuts the table's own view to the hub before the crossing — the movement would be real but invisible again");
  assert.match(fn[0], /await wait\(FADE_MS\);/, "no longer waits for the fade-in before the first token starts moving");
});
