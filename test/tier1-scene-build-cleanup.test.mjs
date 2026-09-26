// Tier 1 — scene-build.mjs's own scratch-scene recognition (isTemporaryScene,
// isSuspectedStrayScene). Both are plain functions over a scene-shaped
// object with no Foundry global anywhere in them, so — unlike the rest of
// this file's Scene.create/embedded-collection work, which genuinely needs a
// live Foundry (see tier3-scene-build-contract.test.mjs) — these get real,
// direct unit tests.
//
// Written 2026-09-18, Ingram's own request after the real world's scene
// list turned out to be cluttered with exactly this: four old stage-demo
// scenes, a couple of self-labelled "TEST FIXTURE"/"(diagnostic..." scenes,
// and three unexplained 1x1-4x4 scenes evidently built to eyeball one
// Actor's own token in isolation.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DEMO_SOURCE_IDS, isSuspectedStrayScene, isTemporaryScene } from "../module/blank-inheritance/scripts/foundry/scene-build.mjs";

const MODULE_ID = "blank-inheritance";

function mockScene({ name = "A Scene", sourceId = null, bg = null, width = 3072, height = 1536 } = {}) {
  return {
    name,
    width,
    height,
    getFlag: (scope, key) => (scope === MODULE_ID && key === "sourceId" ? sourceId : undefined),
    levels: { contents: [{ background: { src: bg } }] }
  };
}

/* ------------------------------------------------------------------ */
/*  isTemporaryScene — deletion candidates                             */
/* ------------------------------------------------------------------ */

test("isTemporaryScene: a scene carrying one of the stage-demo sourceIds is named as such", () => {
  for (const sourceId of DEMO_SOURCE_IDS) {
    assert.equal(isTemporaryScene(mockScene({ sourceId })), "stage demo");
  }
});

test("isTemporaryScene: Foundry's own untouched new-world scene is recognised by its default background", () => {
  assert.equal(isTemporaryScene(mockScene({ bg: "nue/defaultscene/fvtt-background.webp" })), "Foundry's own new-world scene");
});

test("isTemporaryScene: a scene self-labelled TEST FIXTURE, (diagnostic...) or ZZ TEST is caught, case-insensitively", () => {
  assert.ok(isTemporaryScene(mockScene({ name: "TEST FIXTURE — Diagnostic Scene" })));
  assert.ok(isTemporaryScene(mockScene({ name: "TEST FIXTURE — Diagnostic Creature" })));
  assert.ok(isTemporaryScene(mockScene({ name: "TOKEN RING PROOF (diagnostic, delete after review)" })));
  assert.ok(isTemporaryScene(mockScene({ name: "test fixture — lowercase too" })));
  // Added 2026-09-19: named in this file's own comments as a real convention
  // found live in the world (see core/diagnostic-content.mjs), but never
  // actually part of the pattern until a "ZZ TEST CHARACTER" Actor turned up
  // cluttering the Scene Runner's summon list — the same shared pattern now
  // catches a scene named this way too.
  assert.ok(isTemporaryScene(mockScene({ name: "ZZ TEST CHARACTER — Kestrel Vance (DELETE BEFORE LAUNCH)" })));
});

test("isTemporaryScene: a real, ordinary scene is never flagged — no false positives on actual content", () => {
  assert.equal(isTemporaryScene(mockScene({ name: "03. Kit Issue", sourceId: "e1-kit-issue" })), null);
  assert.equal(isTemporaryScene(mockScene({ name: "Campaign Map" })), null);
  // A name that merely CONTAINS "test" or "diagnostic" without the specific
  // self-labelling patterns must not trip this -- "field test" is real
  // in-fiction content this campaign could easily have a scene named.
  assert.equal(isTemporaryScene(mockScene({ name: "The Field Test Range" })), null);
});

/* ------------------------------------------------------------------ */
/*  isSuspectedStrayScene — quarantine candidates                      */
/* ------------------------------------------------------------------ */

test("isSuspectedStrayScene: a tiny, unrecognised scene is flagged", () => {
  const known = new Set(["e1-kit-issue", "the-city"]);
  assert.ok(isSuspectedStrayScene(mockScene({ name: "Contact, Unclassified", width: 4, height: 4 }), known));
  assert.ok(isSuspectedStrayScene(mockScene({ name: "Shucks Mordant", width: 1, height: 1 }), known));
});

test("isSuspectedStrayScene: a tiny scene that IS a known manifest entry is left alone (a real sub-room could theoretically be small)", () => {
  const known = new Set(["e1-kit-issue"]);
  assert.equal(isSuspectedStrayScene(mockScene({ name: "Kit Issue", sourceId: "e1-kit-issue", width: 100, height: 100 }), known), false);
});

test("isSuspectedStrayScene: a real, full-size scene is never flagged, known or not", () => {
  const known = new Set([]);
  assert.equal(isSuspectedStrayScene(mockScene({ name: "Some Real Place", width: 3072, height: 1536 }), known), false);
});

test("isSuspectedStrayScene: a scene isTemporaryScene already deletes is not ALSO quarantined", () => {
  const known = new Set([]);
  const stageDemo = mockScene({ name: "Demo — A Bar, Late", sourceId: DEMO_SOURCE_IDS[0], width: 50, height: 50 });
  assert.equal(isSuspectedStrayScene(stageDemo, known), false, "a scene the delete-path already owns must not also be quarantined");
});

test("isSuspectedStrayScene: a full-size duplicate of a real scene's own clean name, but not OUR copy of it, is flagged (regression: a real leftover found live 2026-09-18 — an old, unfoldered 'Directorate HQ — Lobby' next to the properly-managed one)", () => {
  const knownIds = new Set(["hq-lobby"]);
  const knownNames = new Set(["Directorate HQ — Lobby"]);
  const leftover = mockScene({ name: "Directorate HQ — Lobby", sourceId: null, width: 3072, height: 1536 });
  assert.ok(isSuspectedStrayScene(leftover, knownIds, knownNames));
});

test("isSuspectedStrayScene: the REAL managed copy (carries the matching sourceId) is never flagged just for sharing its own name", () => {
  const knownIds = new Set(["hq-lobby"]);
  const knownNames = new Set(["Directorate HQ — Lobby"]);
  const real = mockScene({ name: "02. Directorate HQ — Lobby", sourceId: "hq-lobby", width: 3072, height: 1536 });
  assert.equal(isSuspectedStrayScene(real, knownIds, knownNames), false);
});
