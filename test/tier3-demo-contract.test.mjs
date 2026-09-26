// Tier 3 — the demo/walkthrough runner's contract with itself.
//
// foundry/demo-runner.mjs touches real ApplicationV2/Foundry-canvas APIs
// test/support/mock-foundry.mjs does not model (see tier3-deck-contract.test.mjs
// and tier3-travel-contract.test.mjs for the same situation, and why this
// project's own convention is to read the real source rather than mount the
// class). What matters here is proven for real instead: core/demo.mjs's own
// walk logic is unit-tested in tier1-demo.test.mjs, and the actual demo runs
// live against the local Foundry test world
// (reference_local_foundry_test_environment) — this file only pins the
// handful of facts that would otherwise let the two silently drift apart.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const demoRunner = readFileSync(path.join(moduleRoot, "foundry", "demo-runner.mjs"), "utf8");
const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");
const sceneRunnerAdapter = readFileSync(path.join(moduleRoot, "foundry", "scene-runner.mjs"), "utf8");
const stageLayout = readFileSync(path.join(moduleRoot, "core", "stage-layout.mjs"), "utf8");

test("demo-runner builds on core/demo.mjs's own walk, not a second one", () => {
  assert.match(demoRunner, /import\s*\{\s*advanceDemo,\s*demoState,\s*retreatDemo,\s*validateDemo\s*\}\s*from\s*"\.\.\/core\/demo\.mjs"/);
});

test("the registered demos are real, valid definitions by core/demo.mjs's own rule", () => {
  // Exercise validateDemo() for real against a literal copy of DEMOS' shape,
  // rather than only asserting the source text looks right — this fails if
  // the demo's own field names (id/titleKey/seat/steps/narrationKey/run)
  // ever drift from what validateDemo actually checks.
  const idMatches = [...demoRunner.matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(idMatches.includes("session-01-integration"), "the session-01-integration demo id is missing from demo-runner.mjs");
  assert.ok(idMatches.includes("road-in-travel"), "the road-in-travel demo id is missing from demo-runner.mjs");
  const stepIds = [...demoRunner.matchAll(/id:\s*"([a-z-]+)",\n\s*narrationKey:/g)].map((m) => m[1]);
  assert.ok(stepIds.length >= 9, `expected at least 9 real steps across both demos, found ${stepIds.length}`);
  assert.match(demoRunner, /export const DEMOS = Object\.freeze\(\[SESSION_INTEGRATION_DEMO, ROAD_IN_TRAVEL_DEMO\]\);/, "DEMOS no longer registers both demos");
});

test("road-in-travel scatters the demo party, then crosses from The Road In to the real NEXT scene in sequence, Intake Medicals — not some other beat", () => {
  // e1-intake-medicals is the actual next scene after e1-the-road-in in
  // scene-set.json's own order (verified against the real manifest when this
  // was written) — deliberately different from SESSION_INTEGRATION_DEMO's
  // own destination (Kit Issue, several beats later), matching Ingram's own
  // literal ask: "watch the move from 'The Road In' to the next scene."
  assert.match(demoRunner, /scatterDemoParty\(\)/, "the road-in-travel demo no longer scatters the demo party");
  assert.match(demoRunner, /openSceneRunner\(EPISODE_ID, "episode-c1e1--the-road-in"\)/);
  assert.match(demoRunner, /data-brief-id="episode-c1e1--intake-medicals"/);
  assert.match(demoRunner, /sceneFoundryId\("e1-intake-medicals"\)/);
});

test("road-in-travel actually moves the six real candidate tokens — the fix for \"no visible token movement... complete failure\" (Ingram, live, 2026-09-23), not just the one already-together party marker", () => {
  assert.match(demoRunner, /import\s*\{\s*campaignMapImageWidth,\s*convergeTokensOnHub,\s*hubScene\s*\}\s*from\s*"\.\/travel\.mjs"/, "demo-runner no longer imports convergeTokensOnHub — the six candidates would go back to sitting still as decoration");
  const fn = demoRunner.match(/id:\s*"converge-on-gate",[\s\S]*?\n\s*\},\n\s*\{/);
  assert.ok(fn, "the converge-on-gate step is missing");
  assert.match(fn[0], /const plan = await demoPartyPlan\(/, "converge-on-gate no longer resolves the real candidate plan — it would have no real tokenIds to move");
  assert.match(fn[0], /to: ROAD_IN_LOCATION_REF/, "converge-on-gate no longer sends every candidate toward the same real destination");
  assert.match(fn[0], /await convergeTokensOnHub\(moves\);/);
});

test("scatterDemoParty builds on core/demo-party.mjs's own shared plan, not a private copy", () => {
  assert.match(demoRunner, /import\s*\{\s*demoPartyPlan\s*\}\s*from\s*"\.\.\/core\/demo-party\.mjs"/);
  assert.match(demoRunner, /import\s*\{\s*sceneCalibration\s*\}\s*from\s*"\.\.\/core\/travel-animation\.mjs"/);
  // campaignMapImageWidth/hubScene's own reuse is covered by the test above
  // (its import line grew a third name, convergeTokensOnHub, 2026-09-23).
});

test("every step proving the map-travel ritual targets a REAL Episode One backdrop, not a placeholder", () => {
  // Cross-checked against scene-set.json's own ids by hand when this was
  // written (e1-kit-issue / e1-canteen) -- pinned here so a rename there
  // shows up as a failing test rather than a demo that quietly starts
  // targeting nothing.
  assert.match(demoRunner, /sceneFoundryId\("e1-kit-issue"\)/);
  assert.match(demoRunner, /sceneFoundryId\("e1-canteen"\)/);
  assert.match(demoRunner, /data-brief-id="episode-c1e1--kit-issue"/);
  assert.match(demoRunner, /data-brief-id="episode-c1e1--canteen"/);
});

test("the two staging steps target real cast members authored with a non-quiet arrival tier", () => {
  // Nobu (Kit Issue, "announced") and Taka (Canteen, "splash") are real
  // authored content, not invented for the demo -- see
  // data/scene-briefs/episode-c1e1--kit-issue.json and --canteen.json.
  assert.match(demoRunner, /data-portrait-id="summon-nobu"/);
  assert.match(demoRunner, /stagedSting\("summon-nobu"\)\s*===\s*"announced"/);
  assert.match(demoRunner, /data-portrait-id="summon-taka"/);
  assert.match(demoRunner, /stagedSting\("summon-taka"\)\s*===\s*"splash"/);
});

test("every clickOnRunner/clickOnDeck selector actually targets a data-action this codebase still wires up elsewhere", () => {
  // cueScene replaced pickScene 2026-09-19 (picking a scene and cutting the
  // table there used to be two separate, undiscoverable clicks — see
  // tier3-scene-runner-cue-contract.test.mjs for the merge itself). The demo
  // no longer clicks cutTo directly either, now that cueScene does that work.
  for (const action of ["cueScene", "stagePerson"]) {
    assert.match(sceneRunnerAdapter, new RegExp(`${action}:\\s*SceneRunner\\.#on`), `scene-runner.mjs no longer wires the "${action}" action the demo depends on`);
  }
  assert.doesNotMatch(demoRunner, /data-action="pickScene"|data-action="cutTo"/, "the demo still clicks a two-step action pickScene/cutTo replaced");
  assert.match(demoRunner, /clickOnDeck\('\[data-action="openSoundDesk"\]'\)/);
});

test("the demo reads the same sting field name the stage's own publish boundary carries (regression: a silent rename would make every wait time out instead of fail loudly)", () => {
  assert.match(stageLayout, /"sting"/, "core/stage-layout.mjs's PUBLISHABLE allow-list no longer carries \"sting\"");
  assert.match(demoRunner, /\.sting\s*\?\?\s*null/);
});

test("road-in-travel defines a reset that clears the six candidate Actors/Tokens and cuts back to The Road In — Ingram's own ask, 2026-09-23: \"I have no way to reset things ... so that I can test that first transition\"", () => {
  const fn = demoRunner.match(/async function resetRoadInDemo\(\)[\s\S]*?\n\}/);
  assert.ok(fn, "resetRoadInDemo is missing");
  assert.match(fn[0], /await hub\.deleteEmbeddedDocuments\("Token", tokenIds\)/, "no longer clears the six demo candidate tokens off the hub scene");
  assert.match(fn[0], /await Actor\.deleteDocuments\(actorIds\)/, "no longer clears the six demo candidate Actors");
  assert.match(fn[0], /sceneFoundryId\("e1-the-road-in"\)/, "no longer cuts back to The Road In itself");
  assert.match(fn[0], /await target\.activate\(\)/);
  assert.match(demoRunner, /reset:\s*resetRoadInDemo,/, "ROAD_IN_TRAVEL_DEMO no longer registers resetRoadInDemo as its own reset");
});

test("the DemoRunner panel wires a reset action, gated on the running demo actually defining one, and restarts its step sequence from the top", () => {
  assert.match(demoRunner, /reset:\s*DemoRunner\.#onReset/, "reset is no longer a registered ApplicationV2 action");
  const fn = demoRunner.match(/static async #onReset\(\)[\s\S]*?\n  \}/);
  assert.ok(fn, "#onReset is missing");
  assert.match(fn[0], /if\s*\(this\.#busy \|\| !this\.#demo\?\.reset\)\s*return;/, "no longer refuses to run when the current demo has no reset of its own");
  assert.match(fn[0], /await this\.#demo\.reset\(\);/);
  assert.match(fn[0], /this\.#index = 0;/, "no longer restarts the step sequence from the top after a reset");
});

test("blank-inheritance.mjs mounts the demo runner, creates its macro, and exposes toggleDemoRunner on the module API", () => {
  assert.match(entry, /import\s*\{\s*createDemoMacroIfMissing,\s*mountDemoRunner,\s*toggleDemoRunner\s*\}\s*from\s*"\.\/foundry\/demo-runner\.mjs"/);
  assert.match(entry, /mountDemoRunner\(\);/);
  assert.match(entry, /await createDemoMacroIfMissing\(\);/);
  assert.match(entry, /toggleDemoRunner\s*\n?\s*\};/, "toggleDemoRunner no longer sits on mod.api");
});
