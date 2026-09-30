// Tier 4 — a synced journal Ingram has edited in Foundry is kept, never
// deleted and rebuilt from the repo (foundry/sync.mjs#runRealJournalCase,
// design/scene-edits.md §7). Against the mocked Foundry globals, with a small
// synthetic episode rather than the real one, so the test says exactly what
// changed between the two syncs.

import "./setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installMockFoundry } from "./support/mock-foundry.mjs";
import { deriveFoundryId } from "../module/blank-inheritance/scripts/core/ids.mjs";
import { runRealContentSync } from "../module/blank-inheritance/scripts/foundry/sync.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleManifest = JSON.parse(readFileSync(path.resolve(here, "..", "module", "blank-inheritance", "module.json"), "utf8"));

const EPISODE_PATH = "data/campaign/episodes/episode-t4.json";
const episode = (description) => ({
  id: "episode-t4",
  title: "Test Episode",
  summary: "An episode.",
  authoring: { status: "sound" },
  scenes: [{ order: 1, id: "only", title: "The Only Scene", description, authoring: { status: "sound" } }]
});

function install(description) {
  const moduleFiles = { [EPISODE_PATH]: episode(description) };
  const mock = installMockFoundry({ moduleManifest, moduleFiles });
  // storage/ itself exists on a real server once persistentStorage is on.
  mock.world.directories.add("modules/blank-inheritance/storage/");
  mock.world.directories.add("modules/blank-inheritance/storage");
  mock.world.directories.add("modules/blank-inheritance/storage/test-reports");
  return { ...mock, moduleFiles };
}

async function sync() {
  const quietError = console.error;
  console.error = () => {}; // the three real NPC files are absent here; their cases fail on their own, as designed
  try {
    const report = await runRealContentSync({ quiet: true, episodePaths: [EPISODE_PATH] });
    return report.results.find((r) => r.sourceId === "episode-t4");
  } finally {
    console.error = quietError;
  }
}

const scenePage = (journal) => journal.pages.find((p) => p.name === "1. The Only Scene");

test("an unedited journal is rebuilt when its source changes, and remembers what it was given", async () => {
  const { world, moduleFiles, uninstall } = install("The first description.");
  try {
    await sync();
    const id = await deriveFoundryId("episode-t4");
    assert.ok(world.journal.get(id).getFlag("blank-inheritance", "pushedHash"));
    moduleFiles[EPISODE_PATH] = episode("A newer description, from the repo.");
    const result = await sync();
    assert.equal(result.keptEdited, undefined);
    assert.match(scenePage(world.journal.get(id)).text.content, /A newer description/);
  } finally {
    uninstall();
  }
});

test("CRITICAL: a journal she edited in Foundry is kept, not rebuilt, filed for Claude, and named on the update card", async () => {
  const { world, moduleFiles, uninstall } = install("The first description.");
  try {
    await sync();
    const id = await deriveFoundryId("episode-t4");
    const journal = world.journal.get(id);
    scenePage(journal).text = { ...scenePage(journal).text, content: "<p>Her own rewrite, made in Foundry.</p>" };

    moduleFiles[EPISODE_PATH] = episode("A newer description, from the repo.");
    const result = await sync();
    assert.equal(result.keptEdited, true);
    assert.strictEqual(world.journal.get(id), journal, "the journal was not deleted and recreated");
    assert.equal(scenePage(journal).text.content, "<p>Her own rewrite, made in Foundry.</p>");

    const filed = [...world.uploadedFiles.entries()].find(([key]) => key.endsWith("foundry-edit-journal-episode-t4.json"));
    assert.ok(filed, "a copy of her words was filed into storage/ for the pull to bring home");
    const snapshot = JSON.parse(filed[1]);
    assert.equal(snapshot.kind, "foundry-document-edit");
    assert.ok(snapshot.words.some((w) => /Her own rewrite/.test(w.content)));
  } finally {
    uninstall();
  }
});

test("a journal from before this check gets its fingerprint on the next unchanged sync, without being rebuilt", async () => {
  const { world, uninstall } = install("The first description.");
  try {
    await sync();
    const id = await deriveFoundryId("episode-t4");
    const journal = world.journal.get(id);
    delete journal.flags["blank-inheritance"].pushedHash;
    const result = await sync();
    assert.equal(result.skipped, true);
    assert.strictEqual(world.journal.get(id), journal);
    assert.ok(journal.getFlag("blank-inheritance", "pushedHash"));
  } finally {
    uninstall();
  }
});
