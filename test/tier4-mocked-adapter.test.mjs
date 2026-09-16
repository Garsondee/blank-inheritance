// Tier 4 — mocked-adapter tests. Exercises foundry/io.mjs and
// foundry/sync.mjs — the code that's only ever touched real Foundry globals
// — against test/support/mock-foundry.mjs, a small simulation verified
// against the real Foundry source (see that file's header) rather than
// guessed. This does NOT replace the live in-Foundry run (still the only
// tier that proves real Foundry actually behaves this way) — it proves OUR
// orchestration logic (teardown-before-setup, per-case isolation, flag
// sequencing, report assembly) is correct against a faithful-where-verified
// simulation. See design/testing-strategy.md §3.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installMockFoundry } from "./support/mock-foundry.mjs";
import { deriveFoundryId } from "../module/blank-inheritance/scripts/core/ids.mjs";
import { ensureDirectory, writeReportFile, fetchModuleJson } from "../module/blank-inheritance/scripts/foundry/io.mjs";
// Safe as a static top-level import even though this is "the mocked globals"
// file: sync.mjs only touches game/ui/Actor/etc. inside its exported
// function bodies, never at module-evaluation time, so it's fine to import
// once here and call its exports after installMockFoundry() runs per-test.
import { runDiagnosticTestSync, runRealContentSync } from "../module/blank-inheritance/scripts/foundry/sync.mjs";
import { promptToRunSync } from "../module/blank-inheritance/scripts/foundry/sync-dialog.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const templateJsonPath = path.join(repoRoot, "gamesystems", "sf2e", "template.json");

const moduleManifest = JSON.parse(readFileSync(path.join(moduleRoot, "module.json"), "utf8"));
const templateJson = existsSync(templateJsonPath) ? JSON.parse(readFileSync(templateJsonPath, "utf8")) : null;

function loadFixtureModuleFiles() {
  const fixturesDir = path.join(moduleRoot, "data", "_test-fixtures");
  const moduleFiles = {};
  for (const name of ["test-creature.json", "test-character.json", "test-scene.json", "test-journal.json"]) {
    moduleFiles[`data/_test-fixtures/${name}`] = JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
  }
  return moduleFiles;
}

/**
 * Real campaign data (repo root data/), keyed the same way
 * tools/module-sync/sync-campaign-data.mjs deploys it -- under the module's
 * own data/campaign/ so fetchModuleJson (relative to the module root) reads
 * it identically to how it reads the test fixtures above.
 */
function loadRealCampaignModuleFiles() {
  const dataRoot = path.join(repoRoot, "data");
  const moduleFiles = {};
  moduleFiles["data/campaign/antagonists/claimants/contact-unclassified.json"] = JSON.parse(
    readFileSync(path.join(dataRoot, "antagonists", "claimants", "contact-unclassified.json"), "utf8")
  );
  // Keep this list in step with REAL_NPC_PATHS in scripts/foundry/sync.mjs.
  for (const id of ["shucks-mordant", "nobu", "intake-medicals-clerk"]) {
    moduleFiles[`data/campaign/npcs/${id}.json`] = JSON.parse(readFileSync(path.join(dataRoot, "npcs", `${id}.json`), "utf8"));
  }
  // Session One is the only episode left in the repo -- every other drafted beat
  // beyond Session 0/1 was deleted 2026-09-13. Keep this list in step with
  // REAL_EPISODE_PATHS in scripts/foundry/sync.mjs.
  for (const name of ["episode-c1s1-mothers-maiden-name.json"]) {
    moduleFiles[`data/campaign/episodes/${name}`] = JSON.parse(readFileSync(path.join(dataRoot, "episodes", name), "utf8"));
  }
  return moduleFiles;
}

test("ensureDirectory creates a multi-level path one segment at a time (regression: non-recursive mkdir, found 2026-08-22)", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest });
  try {
    await ensureDirectory("modules/blank-inheritance/storage/test-reports");
    assert.ok(world.directories.has("modules/blank-inheritance/storage/test-reports"));
    assert.ok(world.directories.has("modules/blank-inheritance/storage"));
    assert.ok(world.directories.has("modules/blank-inheritance"));
  } finally {
    uninstall();
  }
});

test("ensureDirectory is safe to call twice (the EEXIST branch is caught, not thrown)", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest });
  try {
    await ensureDirectory("modules/blank-inheritance/storage/test-reports");
    await assert.doesNotReject(() => ensureDirectory("modules/blank-inheritance/storage/test-reports"));
  } finally {
    uninstall();
  }
});

test("writeReportFile writes through to the mock's uploaded-files store", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest });
  try {
    const report = { timestamp: "2026-08-22T00:00:00.000Z", results: [], fatalError: null };
    const relativePath = await writeReportFile(report);
    assert.match(relativePath, /^test-reports\/sync-report-.*\.json$/);
    const stored = world.uploadedFiles.get(`modules/blank-inheritance/storage/${relativePath}`);
    assert.ok(stored, "expected the report content to be present in the mock's upload store");
    assert.deepEqual(JSON.parse(stored), report);
  } finally {
    uninstall();
  }
});

test("mock uploadPersistent: the path argument is a directory only, never dir+filename (regression: found live 2026-09-05)", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest });
  try {
    await ensureDirectory("modules/blank-inheritance/storage/test-reports");
    const file = new File(["hello"], "report.json", { type: "application/json" });

    // The exact shape of the bug: passing dir+filename as the "directory"
    // must fail, matching the real server's fs.existsSync(destDir) check --
    // no directory is ever literally named after the report file.
    const wrongResult = await foundry.applications.apps.FilePicker.implementation.uploadPersistent(
      "blank-inheritance", "test-reports/report.json", file, {}, { notify: false }
    );
    assert.equal(wrongResult, false, "a path that already includes the filename must be rejected, matching the real server");

    const rightResult = await foundry.applications.apps.FilePicker.implementation.uploadPersistent(
      "blank-inheritance", "test-reports", file, {}, { notify: false }
    );
    assert.ok(rightResult, "a directory-only path must succeed");
    assert.equal(rightResult.path, "test-reports/report.json", "the filename must come from the File object's own .name");
  } finally {
    uninstall();
  }
});

test("writeReportFile throws if the module manifest lacks persistentStorage (verified real uploadPersistent behavior)", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest: { id: "blank-inheritance", persistentStorage: false } });
  try {
    await assert.rejects(() => writeReportFile({ results: [] }), /persistent storage/i);
  } finally {
    uninstall();
  }
});

test("fetchModuleJson returns parsed content for a real path, throws a clear error for a 404", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest, moduleFiles: { "data/x.json": { hello: "world" } } });
  try {
    const data = await fetchModuleJson("data/x.json");
    assert.deepEqual(data, { hello: "world" });
    await assert.rejects(() => fetchModuleJson("data/missing.json"), /HTTP 404/);
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: full run against the mock produces an all-passing report", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    const report = await runDiagnosticTestSync();

    assert.equal(report.fatalError, null);
    assert.equal(report.results.length, 4);
    for (const result of report.results) {
      const failed = result.checks.filter((c) => !c.pass);
      assert.deepEqual(failed, [], `expected all checks to pass for ${result.foundryType} ${result.sourceId}`);
    }

    const creatureId = await deriveFoundryId("test-fixture-creature-001");
    const createdCreature = world.actors.get(creatureId);
    assert.ok(createdCreature, "expected the creature Actor to actually exist in the mock world");
    assert.equal(createdCreature.getFlag("blank-inheritance", "sourceId"), "test-fixture-creature-001");

    const journalId = await deriveFoundryId("test-fixture-journal-001");
    const createdJournal = world.journal.get(journalId);
    assert.ok(createdJournal, "expected the JournalEntry to actually exist in the mock world");
    assert.equal(createdJournal.pages.length, 2, "expected both pages from the test fixture");

    assert.equal(world.chatMessages.length, 1, "expected exactly one whispered chat message");
    assert.ok(report.reportFileWritten);
    assert.ok(world.uploadedFiles.has(`modules/blank-inheritance/storage/${report.reportPath}`));

    assert.equal(report.clipboardCopied, true, "a successful run must report that it copied to the clipboard");
    assert.ok(world.clipboardText, "expected the mock clipboard to have received text");
    assert.match(world.clipboardText, /paste.*back to Claude/i);
    const jsonStart = world.clipboardText.indexOf("{");
    const parsedFromClipboard = JSON.parse(world.clipboardText.slice(jsonStart));
    assert.deepEqual(parsedFromClipboard, report, "the clipboard's JSON must be the exact same report object returned to the caller");
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: a second run with unchanged fixtures skips all four cases, without recreating any of them (GH issue #113)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    const creatureId = await deriveFoundryId("test-fixture-creature-001");
    const characterId = await deriveFoundryId("test-fixture-kid-001");
    const sceneId = await deriveFoundryId("test-fixture-scene-001");
    const journalId = await deriveFoundryId("test-fixture-journal-001");

    const firstRun = await runDiagnosticTestSync();
    assert.equal(firstRun.fatalError, null);
    for (const result of firstRun.results) {
      assert.equal(result.skipped, false, `expected the first-ever run to create, not skip, ${result.sourceId}`);
    }
    // Capture object identity, not just id equality -- a skip that quietly
    // deleted and recreated an identical-looking document would still pass
    // an id/flag comparison, but MockDocument.create() always makes a new
    // object instance (see test/support/mock-foundry.mjs), so only a genuine
    // skip (no teardown, no create call at all) leaves these references untouched.
    const creatureRefAfterFirstRun = world.actors.get(creatureId);
    const characterRefAfterFirstRun = world.actors.get(characterId);
    const sceneRefAfterFirstRun = world.scenes.get(sceneId);
    const journalRefAfterFirstRun = world.journal.get(journalId);
    assert.ok(creatureRefAfterFirstRun && characterRefAfterFirstRun && sceneRefAfterFirstRun && journalRefAfterFirstRun);

    const secondRun = await runDiagnosticTestSync();
    assert.equal(secondRun.fatalError, null);
    for (const result of secondRun.results) {
      assert.equal(result.skipped, true, `expected the second run against unchanged fixtures to skip ${result.sourceId}`);
      assert.deepEqual(result.checks.filter((c) => !c.pass), [], "a skipped case must still validate the existing document, not just assume it's fine");
    }
    assert.equal(secondRun.results.length, 4);

    assert.strictEqual(world.actors.get(creatureId), creatureRefAfterFirstRun, "the creature Actor must be the SAME object -- never torn down and recreated");
    assert.strictEqual(world.actors.get(characterId), characterRefAfterFirstRun, "the character Actor must be the SAME object");
    assert.strictEqual(world.scenes.get(sceneId), sceneRefAfterFirstRun, "the Scene must be the SAME object");
    assert.strictEqual(world.journal.get(journalId), journalRefAfterFirstRun, "the JournalEntry must be the SAME object");
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: only the case whose source actually changed gets recreated -- the other two stay skipped", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const moduleFiles = loadFixtureModuleFiles();
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles, templateJson });
  try {
    const creatureId = await deriveFoundryId("test-fixture-creature-001");
    const characterId = await deriveFoundryId("test-fixture-kid-001");
    const sceneId = await deriveFoundryId("test-fixture-scene-001");
    const journalId = await deriveFoundryId("test-fixture-journal-001");

    await runDiagnosticTestSync();
    const creatureRefAfterFirstRun = world.actors.get(creatureId);
    const characterRefAfterFirstRun = world.actors.get(characterId);
    const sceneRefAfterFirstRun = world.scenes.get(sceneId);
    const journalRefAfterFirstRun = world.journal.get(journalId);

    // Mutate only the creature fixture in place -- moduleFiles is the same
    // object instance the mock's fetch() reads from, so this is visible to
    // the very next runDiagnosticTestSync() call without reinstalling anything.
    moduleFiles["data/_test-fixtures/test-creature.json"] = {
      ...moduleFiles["data/_test-fixtures/test-creature.json"],
      name: "A Genuinely Different Name",
    };

    const secondRun = await runDiagnosticTestSync();
    const creatureResult = secondRun.results.find((r) => r.entityLabel === "creature");
    const characterResult = secondRun.results.find((r) => r.entityLabel === "character");
    const sceneResult = secondRun.results.find((r) => r.foundryType === "Scene");
    const journalResult = secondRun.results.find((r) => r.foundryType === "JournalEntry");

    assert.equal(creatureResult.skipped, false, "the changed creature must be recreated, not skipped");
    assert.equal(characterResult.skipped, true, "the unchanged character must still be skipped");
    assert.equal(sceneResult.skipped, true, "the unchanged scene must still be skipped");
    assert.equal(journalResult.skipped, true, "the unchanged journal must still be skipped");

    assert.notStrictEqual(world.actors.get(creatureId), creatureRefAfterFirstRun, "the changed creature must be a genuinely NEW object, not just still present");
    assert.strictEqual(world.actors.get(characterId), characterRefAfterFirstRun, "the untouched character must remain the exact same object");
    assert.strictEqual(world.scenes.get(sceneId), sceneRefAfterFirstRun, "the untouched scene must remain the exact same object");
    assert.strictEqual(world.journal.get(journalId), journalRefAfterFirstRun, "the untouched journal must remain the exact same object");
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: a clipboard failure does not fail the whole sync (best-effort, per design/foundry-module-design.md's Safety section)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    // Simulate a browser that refuses clipboard access (no permission, insecure context, etc.).
    navigator.clipboard.writeText = async () => { throw new Error("clipboard permission denied"); };

    const report = await runDiagnosticTestSync();

    assert.equal(report.fatalError, null, "a clipboard failure must not become a fatal sync error");
    assert.equal(report.clipboardCopied, false);
    assert.equal(report.reportFileWritten, true, "the report file must still get written even if the clipboard copy failed");
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: re-running immediately does not collide with the previous run's documents (regression: found 2026-08-22)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    const firstRun = await runDiagnosticTestSync();
    assert.equal(firstRun.fatalError, null);

    const secondRun = await runDiagnosticTestSync();
    assert.equal(secondRun.fatalError, null, "a second run must not fail with an id-collision error");
    for (const result of secondRun.results) {
      assert.deepEqual(result.checks.filter((c) => !c.pass), []);
    }

    // Re-running should not accumulate duplicate documents — same ids, still just one each.
    assert.equal(world.actors.size, 2, "expected exactly the creature + character actors, not accumulated duplicates");
    assert.equal(world.scenes.size, 1);
    assert.equal(world.journal.size, 1);
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: a non-GM user does not create anything", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    globalThis.game.user.isGM = false;
    const result = await runDiagnosticTestSync();
    assert.equal(result, null);
    assert.equal(world.actors.size, 0);
    assert.equal(world.journal.size, 0);
    assert.equal(world.chatMessages.length, 0);
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: one case throwing does not prevent the other three from running and reporting (regression: found while bootstrapping tests, 2026-08-22)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const moduleFiles = loadFixtureModuleFiles();
  // Simulate a missing/corrupted creature fixture on the server — a
  // genuinely plausible real failure, and one that can't be worked around
  // by the generator (its output field NAMES are fixed regardless of input
  // content, so corrupting the fixture's own fields can't reach the
  // sf2e-template check; the fetch itself has to fail instead).
  delete moduleFiles["data/_test-fixtures/test-creature.json"];

  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles, templateJson });
  try {
    const report = await runDiagnosticTestSync();

    assert.equal(report.fatalError, null, "the sync as a whole must not abort just because one case failed");
    assert.equal(report.results.length, 4, "all four cases must still report a result");

    const creatureResult = report.results.find((r) => r.sourceId === "creature");
    assert.ok(creatureResult, "the failed case should still produce a result, labeled by its case name");
    assert.ok(creatureResult.checks.some((c) => !c.pass), "the failed case's result must show at least one failed check, not silently pass");
    assert.equal(world.actors.size, 1, "the character case must still have created its actor despite the creature case failing");

    const sceneResult = report.results.find((r) => r.foundryType === "Scene");
    assert.ok(sceneResult, "the scene case must still have run even though the creature case failed");
    // The scene can't place a token for the never-created creature, but it must still exist.
    assert.equal(world.scenes.size, 1);

    const journalResult = report.results.find((r) => r.foundryType === "JournalEntry");
    assert.ok(journalResult, "the journal case must still have run even though the creature case failed");
    assert.deepEqual(journalResult.checks.filter((c) => !c.pass), [], "the journal case doesn't depend on the creature at all, so it must fully pass");
    assert.equal(world.journal.size, 1);
  } finally {
    uninstall();
  }
});

test("runRealContentSync: the real Claimant and Session One sync cleanly against actual campaign data", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles(), templateJson });
  try {
    const report = await runRealContentSync();

    assert.equal(report.fatalError, null);
    assert.equal(report.results.length, 5, "1 claimant + 3 npcs (Shucks Mordant, Nobu, the Intake Medicals clerk) + 1 episode (Session One is the only one left)");
    for (const result of report.results) {
      const failed = result.checks.filter((c) => !c.pass);
      assert.deepEqual(failed, [], `expected all checks to pass for ${result.sourceId}: ${JSON.stringify(failed)}`);
      assert.equal(result.skipped, false, "first-ever run must create, not skip");
    }

    const claimantId = await deriveFoundryId("contact-unclassified");
    const claimant = world.actors.get(claimantId);
    assert.ok(claimant, "the real Claimant Actor must actually exist in the mock world");
    assert.equal(claimant.name, "Contact, Unclassified");
    assert.equal(claimant.system.attributes.hp.max, 165);

    const shucksId = await deriveFoundryId("shucks-mordant");
    const shucks = world.actors.get(shucksId);
    assert.ok(shucks, "Shucks Mordant's Actor must actually exist in the mock world");
    assert.equal(shucks.type, "npc");
    assert.equal(shucks.name, "Shucks Mordant");

    const nobuId = await deriveFoundryId("nobu");
    const nobu = world.actors.get(nobuId);
    assert.ok(nobu, "Nobu's Actor must actually exist in the mock world");
    assert.equal(nobu.name, "Nobu");

    const clerkId = await deriveFoundryId("intake-medicals-clerk");
    const clerk = world.actors.get(clerkId);
    assert.ok(clerk, "the Intake Medicals clerk's Actor must actually exist in the mock world");
    assert.equal(clerk.system.attributes.hp.value, 1, "a statblock-less NPC gets the 1-HP non-combat default, not 0");

    const sessionOneId = await deriveFoundryId("episode-c1s1-mothers-maiden-name");
    const sessionOneJournal = world.journal.get(sessionOneId);
    assert.ok(sessionOneJournal, "Session One's JournalEntry must exist");
    assert.equal(sessionOneJournal.pages.length, 7, "1 overview page + 6 authored scenes");

    // Real content must not touch the diagnostic path's documents or vice versa.
    assert.equal(world.actors.size, 4, "the claimant + the three established/voiced NPCs -- no test-fixture actors from this run");
    assert.equal(world.journal.size, 1, "one JournalEntry per real episode file");
  } finally {
    uninstall();
  }
});

test("runRealContentSync: a second run against unchanged real data skips everything (hash-skip applies to real content too)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles(), templateJson });
  try {
    await runRealContentSync();
    const claimantId = await deriveFoundryId("contact-unclassified");
    const claimantRef = world.actors.get(claimantId);
    const shucksId = await deriveFoundryId("shucks-mordant");
    const shucksRef = world.actors.get(shucksId);

    const secondRun = await runRealContentSync();
    for (const result of secondRun.results) {
      assert.equal(result.skipped, true, `expected ${result.sourceId} to be skipped on an unchanged second run`);
    }
    assert.strictEqual(world.actors.get(claimantId), claimantRef, "unchanged real data must never be torn down and recreated");
    assert.strictEqual(world.actors.get(shucksId), shucksRef, "the hash-skip mechanism must apply to the npc case type too, not just creature");
  } finally {
    uninstall();
  }
});

test("runRealContentSync: still does not touch the six kids/Frames or the three still-placeholder Directorate poles -- Shucks/Nobu/the clerk are the only NPCs real enough to sync", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles(), templateJson });
  try {
    await runRealContentSync();
    // No draft kid/Frame characters, which would also be type "character"
    // Actors if this pipeline ever created them.
    const characterActors = [...world.actors.values()].filter((a) => a.type === "character");
    assert.deepEqual(characterActors, [], "no draft kid/Frame character should be synced without explicit confirmation");
    // Exactly 4 npc-type Actors (claimant + 3 NPCs) -- see the "syncs cleanly"
    // test above for the precise identity/count assertions. Combined with the
    // character-type assertion above, this pins down that REAL_NPC_PATHS
    // still deliberately excludes the Commander/Caretaker/Transparency
    // Advocate placeholders (loadRealCampaignModuleFiles above doesn't even
    // provide mock data for them, so sync.mjs asking for them would surface
    // here as a failed/thrown case, not a silently-passing one).
    assert.equal(world.actors.size, 4);
  } finally {
    uninstall();
  }
});

test("runRealContentSync: a non-GM user does not create anything", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles(), templateJson });
  try {
    globalThis.game.user.isGM = false;
    const result = await runRealContentSync();
    assert.equal(result, null);
    assert.equal(world.actors.size, 0);
    assert.equal(world.journal.size, 0);
  } finally {
    uninstall();
  }
});

test("promptToRunSync: the GM confirming the dialog runs the real content sync (GH issue #82)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles(), templateJson });
  try {
    world.dialogConfirmResponse = true;
    await promptToRunSync();

    assert.equal(world.dialogConfirmCalls.length, 1, "expected exactly one confirmation dialog to have been shown");
    assert.equal(world.actors.size, 4, "confirming must actually run the REAL sync -- the real Claimant + 3 NPCs, not test fixtures");
    assert.equal(world.journal.size, 1, "one JournalEntry per real episode");
    assert.equal(world.chatMessages.length, 1, "the sync's own whispered report must still show up");
  } finally {
    uninstall();
  }
});

test("promptToRunSync: declining the dialog does not touch the world at all", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    world.dialogConfirmResponse = false;
    await promptToRunSync();

    assert.equal(world.dialogConfirmCalls.length, 1);
    assert.equal(world.actors.size, 0, "declining must not create anything");
    assert.equal(world.journal.size, 0);
    assert.equal(world.chatMessages.length, 0);
  } finally {
    uninstall();
  }
});

test("promptToRunSync: a dismissed dialog (null response) is treated the same as declining, not as an error", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    world.dialogConfirmResponse = null;
    await assert.doesNotReject(() => promptToRunSync());
    assert.equal(world.actors.size, 0);
  } finally {
    uninstall();
  }
});
