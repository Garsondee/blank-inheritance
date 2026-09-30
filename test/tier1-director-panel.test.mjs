// Tier 1 — pure logic for the Director's panel (core/director-panel.mjs).
// Milliseconds, no Foundry, no network.

import { test } from "node:test";
import assert from "node:assert/strict";

import { TRANSITION_TYPES, transitionOptions, sceneRows, DEFAULT_TRANSITION_DURATION_MS, findSceneAuthoring, cueGateDecision } from "../module/blank-inheritance/scripts/core/director-panel.mjs";

test("TRANSITION_TYPES has exactly the 13 real TextureTransitionFilter types, each with a distinct id and a real localisation key", () => {
  assert.equal(TRANSITION_TYPES.length, 13);
  const ids = TRANSITION_TYPES.map((t) => t.id);
  assert.equal(new Set(ids).size, 13, "every transition id must be unique");
  for (const t of TRANSITION_TYPES) {
    assert.match(t.labelKey, /^BLANKINHERITANCE\.Director\.Transition\./);
  }
  // Spot-check a few real values rather than the whole list, so this test
  // doesn't just restate the source file verbatim.
  assert.ok(ids.includes("fade"));
  assert.ok(ids.includes("glitch"));
  assert.ok(ids.includes("holeSwirl"), "camelCase id must be preserved exactly -- Foundry's own shader keys off this string");
});

test("transitionOptions: no type means no override (undefined, not an empty object)", () => {
  assert.equal(transitionOptions(null), undefined);
  assert.equal(transitionOptions(""), undefined);
  assert.equal(transitionOptions(undefined), undefined);
});

test("transitionOptions: a chosen type produces the real {type, duration} shape SceneViewOptions expects", () => {
  assert.deepEqual(transitionOptions("fade"), { type: "fade", duration: DEFAULT_TRANSITION_DURATION_MS });
  assert.deepEqual(transitionOptions("glitch", 2500), { type: "glitch", duration: 2500 });
});

test("sceneRows: shapes real Scene-like objects, degrading a missing thumbnail to null rather than a fabricated URL", () => {
  const scenes = [
    { id: "s1", name: "The Road In", thumb: "path/to/thumb.webp", active: true },
    { id: "s2", name: "Intake Medicals", thumb: null, active: false }
  ];
  const rows = sceneRows(scenes);
  assert.deepEqual(rows, [
    { id: "s1", name: "The Road In", thumbUrl: "path/to/thumb.webp", active: true },
    { id: "s2", name: "Intake Medicals", thumbUrl: null, active: false }
  ]);
});

test("sceneRows: a nameless scene falls back to its id, active is always a real boolean", () => {
  const rows = sceneRows([{ id: "s3", active: undefined }]);
  assert.equal(rows[0].name, "s3");
  assert.equal(rows[0].active, false);
});

test("sceneRows: empty input is safe", () => {
  assert.deepEqual(sceneRows([]), []);
  assert.deepEqual(sceneRows(), []);
});

// Issue #168: cueing a drafted scene is gated, not silently allowed and not
// hard-blocked. findSceneAuthoring resolves a live Scene's briefRef flag back
// to the narrative episode-scene it represents; cueGateDecision turns that
// into an allow/block call.

test("findSceneAuthoring: matches a scene by briefRef across multiple episodes, not just the first one checked", () => {
  const episodes = [
    { scenes: [{ briefRef: "ep1-scene-a", authoring: { status: "drafted" } }] },
    { scenes: [{ briefRef: "ep2-scene-b", authoring: { status: "sound" } }] }
  ];
  assert.deepEqual(findSceneAuthoring(episodes, "ep2-scene-b"), { status: "sound" });
});

test("findSceneAuthoring: no episode scene claims this briefRef -- returns null, not a thrown error or a false positive", () => {
  const episodes = [{ scenes: [{ briefRef: "ep1-scene-a", authoring: { status: "drafted" } }] }];
  assert.equal(findSceneAuthoring(episodes, "some-hub-scene-with-no-narrative-owner"), null);
  assert.equal(findSceneAuthoring(episodes, null), null);
  assert.equal(findSceneAuthoring([], "anything"), null);
  assert.equal(findSceneAuthoring(undefined, "anything"), null);
});

test("findSceneAuthoring: a matching scene with no authoring block at all resolves to null, same as no match", () => {
  const episodes = [{ scenes: [{ briefRef: "ep1-scene-a" }] }];
  assert.equal(findSceneAuthoring(episodes, "ep1-scene-a"), null);
});

test("cueGateDecision: null authoring (untracked -- a hub scene, or genuinely no gate) always allows", () => {
  assert.deepEqual(cueGateDecision(null), { allowed: true, status: null, gated: false });
});

test("cueGateDecision: sound or final authoring allows without needing an override", () => {
  assert.deepEqual(cueGateDecision({ status: "sound" }), { allowed: true, status: "sound", gated: false });
  assert.deepEqual(cueGateDecision({ status: "final" }), { allowed: true, status: "final", gated: false });
});

test("cueGateDecision: a scene the Sign-Off sealed live is cleared, so cueing it asks nothing (regression: The Road In asked 'still drafted?' on every cue)", () => {
  // Shaped like the real sealed record in data/episodes/episode-c1e1-mothers-maiden-name.json:
  // seal() writes "live" and never sound/final, because a scene is sealed rather than
  // promoted (design/scene-signoff.md §3). Resolved the same way checkCueGate does it.
  const episodes = [{
    scenes: [
      { briefRef: "episode-c1e1--the-road-in", authoring: { status: "live", gradedAt: "2026-09-22", gradedBy: "Ingram" } },
      { briefRef: "episode-c1e1--intake-medicals", authoring: { status: "drafted" } }
    ]
  }];
  assert.deepEqual(cueGateDecision(findSceneAuthoring(episodes, "episode-c1e1--the-road-in")), { allowed: true, status: "live", gated: false });
  assert.deepEqual(
    cueGateDecision(findSceneAuthoring(episodes, "episode-c1e1--intake-medicals")),
    { allowed: false, status: "drafted", gated: true },
    "the drafted scene beside it still asks"
  );
});

test("cueGateDecision: drafted or needs-lore authoring blocks, naming the real status", () => {
  assert.deepEqual(cueGateDecision({ status: "drafted" }), { allowed: false, status: "drafted", gated: true });
  assert.deepEqual(cueGateDecision({ status: "needs-lore" }), { allowed: false, status: "needs-lore", gated: true });
});

test("cueGateDecision: override always allows, even over drafted authoring -- a hard block would be a worse failure than the one this gate prevents", () => {
  assert.deepEqual(cueGateDecision({ status: "drafted" }, { override: true }), { allowed: true, status: "drafted", gated: false });
});
