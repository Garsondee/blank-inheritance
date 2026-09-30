// Tier 4 — scene edits, the Foundry half (module/blank-inheritance/scripts/foundry/scene-edits.mjs),
// against the mocked Foundry globals. design/scene-edits.md.
//
// What matters here is where an edit goes and what the Runner then shows: one
// immutable file per edit, straight into storage/ (the one folder no deploy
// touches), nothing cached as saved unless the server said it was, and her
// edits laid over whatever is deployed.

import "./setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installMockFoundry } from "./support/mock-foundry.mjs";
import { makeRecord, recordFilename } from "../module/blank-inheritance/scripts/core/scene-edits.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance");
const moduleManifest = JSON.parse(readFileSync(path.join(moduleRoot, "module.json"), "utf8"));

// Fresh module state per test: the adapter caches what it has read for the page.
let loadCounter = 0;
const freshAdapter = () => import(`../module/blank-inheritance/scripts/foundry/scene-edits.mjs?t=${++loadCounter}`);

const BRIEF = {
  id: "episode-t4--scene",
  title: "T4",
  runsAbout: "6 minutes",
  beats: [
    { id: "a", kind: "action", text: "A" },
    { id: "b", kind: "action", text: "B" }
  ]
};
const FILE = `scene-briefs/${BRIEF.id}`;

function stored(spec) {
  const record = makeRecord({ file: FILE, briefId: BRIEF.id, by: "Ingram", ...spec });
  return [`storage/${recordFilename(record)}`, record];
}

function install(moduleFiles = {}) {
  const mock = installMockFoundry({ moduleManifest, moduleFiles, browse: true });
  // Foundry creates a persistentStorage module's storage/ itself; the mock
  // does not, so the root the adapter writes into is made here.
  mock.world.directories.add("modules/blank-inheritance/storage/");
  globalThis.game.user.name = "Ingram";
  return mock;
}

test("saving an edit writes one new file straight into storage/, named for its id, saying who made it", async () => {
  const { world, uninstall } = install();
  try {
    const { saveSceneEdit } = await freshAdapter();
    const first = await saveSceneEdit({ op: "set", file: FILE, briefId: BRIEF.id, path: ["runsAbout"], before: "6 minutes", after: "7 minutes" });
    const second = await saveSceneEdit({ op: "set", file: FILE, briefId: BRIEF.id, path: ["runsAbout"], before: "7 minutes", after: "8 minutes" });
    assert.equal(first.by, "Ingram");
    assert.ok(second.at > first.at, "two edits in quick succession still sort in the order they were made");
    const names = [...world.uploadedFiles.keys()].map((k) => k.replace(/\/{2,}/g, "/"));
    assert.deepEqual(names.sort(), [`modules/blank-inheritance/storage/${recordFilename(first)}`, `modules/blank-inheritance/storage/${recordFilename(second)}`].sort());
    const written = JSON.parse([...world.uploadedFiles.values()][0]);
    assert.equal(written.after, "7 minutes");
  } finally {
    uninstall();
  }
});

test("a save the server refuses throws, and nothing is remembered as saved", async () => {
  const { world, uninstall } = install();
  try {
    world.directories.delete("modules/blank-inheritance/storage/");
    const { saveSceneEdit, sceneEditsState } = await freshAdapter();
    await assert.rejects(() => saveSceneEdit({ op: "set", file: FILE, briefId: BRIEF.id, path: ["title"], before: "T4", after: "New" }));
    assert.equal(sceneEditsState().records.length, 0);
  } finally {
    uninstall();
  }
});

test("loading lists storage/, keeps only real records, reads the ledger, and overlays her edits on the deployed scene", async () => {
  const [pendingPath, pending] = stored({ op: "set", path: ["beats", { id: "a" }, "text"], before: "A", after: "A, hers", at: "2026-09-27T10:00:00.000Z", rand: "pend" });
  const [mergedPath, merged] = stored({ op: "set", path: ["title"], before: "T4-old", after: "T4", at: "2026-09-27T10:00:01.000Z", rand: "merg" });
  const [removePath, remove] = stored({ op: "remove", path: ["beats"], itemId: "b", item: BRIEF.beats[1], afterId: "a", at: "2026-09-27T10:00:02.000Z", rand: "remv" });
  const [notePath, note] = stored({ op: "note", path: ["beats", { id: "a" }], text: "Shorter?", at: "2026-09-27T10:00:03.000Z", rand: "note" });
  const { uninstall } = install({
    [pendingPath]: pending,
    [mergedPath]: merged,
    [removePath]: remove,
    [notePath]: note,
    "storage/scene-edit-20260927T100004000Z-bad1.json": { kind: "scene-edit", nonsense: true },
    "storage/chat-2026-09-27.json": { not: "an edit" },
    "data/campaign/campaign/scene-edits.json": { id: "scene-edits", entries: { [merged.id]: { state: "merged", at: "x" } } }
  });
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const { loadSceneEdits, overlayScene, unmergedCountFor } = await freshAdapter();
    const state = await loadSceneEdits();
    assert.deepEqual(
      state.records.map((r) => r.id),
      [pending.id, remove.id, note.id],
      "only what the Runner still has to show is fetched: a merged edit's words are already in the deployed file"
    );
    assert.ok(errors.some((e) => /not a usable record/.test(e)), "a malformed file in storage/ is said out loud");

    const shown = overlayScene({ brief: BRIEF });
    assert.equal(shown.brief.beats[0].text, "A, hers");
    assert.deepEqual(shown.brief.beats.map((b) => b.id), ["a"], "the beat she removed is gone from what the Runner shows");
    assert.equal(shown.brief.title, "T4", "a merged edit the server already has is not re-applied");
    assert.equal(shown.removed.length, 1, "and it is offered back");
    assert.equal(shown.notes[0].text, "Shorter?");
    assert.equal(shown.pendingCount, 2);
    assert.equal(unmergedCountFor(BRIEF.id), 2);
    assert.equal(BRIEF.beats.length, 2, "the deployed scene itself is never written into");
  } finally {
    console.error = originalError;
    uninstall();
  }
});

test("a new record saved on this page shows at once, without re-listing storage/", async () => {
  const { uninstall } = install();
  try {
    const { loadSceneEdits, overlayScene, saveSceneEdit } = await freshAdapter();
    await loadSceneEdits();
    await saveSceneEdit({ op: "insert", file: FILE, briefId: BRIEF.id, path: ["beats"], afterId: "a", item: { id: "beat-new", kind: "action", text: "" } });
    assert.deepEqual(overlayScene({ brief: BRIEF }).brief.beats.map((b) => b.id), ["a", "beat-new", "b"]);
  } finally {
    uninstall();
  }
});
