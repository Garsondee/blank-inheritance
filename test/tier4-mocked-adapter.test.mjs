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
import { runDiagnosticTestSync, runRealContentSync, isPushable } from "../module/blank-inheritance/scripts/foundry/sync.mjs";
import { PROMOTABLE_STATUSES, BASELINE_STATUSES } from "../module/blank-inheritance/scripts/core/promote.mjs";

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
/**
 * `promoteToSound`: issue #166 backfilled every real npc/episode/scene file
 * with `authoring.status: "drafted"` (nothing has actually been through the
 * Desk yet), and issue #168 makes sync genuinely withhold anything below
 * sound/final. Most of the tests below exist to prove the CREATE/UPDATE
 * mechanics work correctly, not to re-prove the withholding gate (that has
 * its own dedicated tests further down) -- so they simulate "as if this had
 * already been promoted" in the in-memory copy handed to the mock. This never
 * touches the real files on disk; promoting Shucks/Nobu/the clerk/Episode One
 * for real is Ingram's own call, made through the Desk once it exists.
 */
function loadRealCampaignModuleFiles({ promoteToSound = false } = {}) {
  const dataRoot = path.join(repoRoot, "data");
  const moduleFiles = {};
  // REMOVED 2026-09-19, at Ingram's direct instruction: this used to also load
  // data/antagonists/claimants/contact-unclassified.json (the real Claimant). That file, and the
  // whole frame-scale battle-simulator it was also the single source of truth for, were deleted --
  // unapproved, stale content. No real Claimant exists to load right now; restore this once one does
  // (same shape as REAL_NPC_PATHS below, kept in step with sync.mjs's own REAL_CLAIMANT_PATH note).
  // Keep this list in step with REAL_NPC_PATHS in scripts/foundry/sync.mjs.
  for (const id of ["shucks-mordant", "nobu", "intake-medicals-clerk"]) {
    const npc = JSON.parse(readFileSync(path.join(dataRoot, "npcs", `${id}.json`), "utf8"));
    if (promoteToSound) npc.authoring = { ...npc.authoring, status: "sound" };
    moduleFiles[`data/campaign/npcs/${id}.json`] = npc;
  }
  // Episode One is the only episode left in the repo -- every other drafted beat
  // beyond Session 0/1 was deleted 2026-09-13. Keep this list in step with
  // REAL_EPISODE_PATHS in scripts/foundry/sync.mjs.
  for (const name of ["episode-c1e1-mothers-maiden-name.json"]) {
    const episode = JSON.parse(readFileSync(path.join(dataRoot, "episodes", name), "utf8"));
    if (promoteToSound) {
      episode.authoring = { ...episode.authoring, status: "sound" };
      episode.scenes = (episode.scenes ?? []).map((scene) => ({ ...scene, authoring: { ...scene.authoring, status: "sound" } }));
    }
    moduleFiles[`data/campaign/episodes/${name}`] = episode;
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

test("runRealContentSync: Episode One and the established NPCs sync cleanly against actual campaign data", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  // promoteToSound: true -- this test proves the CREATE/UPDATE mechanics work
  // (issue #168 would otherwise withhold all of this, since none of it has
  // really been through the Desk yet; see the dedicated withheld-content
  // tests below for that).
  const realCampaignModuleFiles = loadRealCampaignModuleFiles({ promoteToSound: true });
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: realCampaignModuleFiles, templateJson });
  try {
    const report = await runRealContentSync();

    assert.equal(report.fatalError, null);
    // REDUCED 2026-09-19 from 5 to 4 (was "1 claimant + 3 npcs + 1 episode"): the real Claimant was
    // removed at Ingram's direct instruction, unapproved and stale, along with the rest of the
    // frame-scale battle simulator it was the single source of truth for. Restore to 5 once a new,
    // approved Claimant exists and REAL_CLAIMANT_PATH is restored in sync.mjs.
    assert.equal(report.results.length, 4, "3 npcs (Shucks Mordant, Nobu, the Intake Medicals clerk) + 1 episode (Episode One is the only one left)");
    for (const result of report.results) {
      const failed = result.checks.filter((c) => !c.pass);
      assert.deepEqual(failed, [], `expected all checks to pass for ${result.sourceId}: ${JSON.stringify(failed)}`);
      assert.equal(result.skipped, false, "first-ever run must create, not skip");
    }

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

    const sessionOneId = await deriveFoundryId("episode-c1e1-mothers-maiden-name");
    const sessionOneJournal = world.journal.get(sessionOneId);
    assert.ok(sessionOneJournal, "Episode One's JournalEntry must exist");
    // Scene count asserted against the real episode file itself rather than
    // hardcoded: Episode One's own running order keeps growing as real
    // content gets authored (5 scenes -> 6 with Flood Tunnel -> 8 with The
    // Tram Back/The Walk Down added 2026-09-19), and this test's own job is
    // "one page per authored scene, plus the overview," not a specific count.
    const realSceneCount = realCampaignModuleFiles["data/campaign/episodes/episode-c1e1-mothers-maiden-name.json"].scenes.length;
    assert.equal(sessionOneJournal.pages.length, 1 + realSceneCount, `1 overview page + ${realSceneCount} authored scenes`);

    // Real content must not touch the diagnostic path's documents or vice versa.
    assert.equal(world.actors.size, 3, "the three established/voiced NPCs -- no test-fixture actors from this run, no claimant until a new one is approved");
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
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles({ promoteToSound: true }), templateJson });
  try {
    await runRealContentSync();
    const shucksId = await deriveFoundryId("shucks-mordant");
    const shucksRef = world.actors.get(shucksId);

    const secondRun = await runRealContentSync();
    for (const result of secondRun.results) {
      assert.equal(result.skipped, true, `expected ${result.sourceId} to be skipped on an unchanged second run`);
    }
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
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles({ promoteToSound: true }), templateJson });
  try {
    await runRealContentSync();
    // No draft kid/Frame characters, which would also be type "character"
    // Actors if this pipeline ever created them.
    const characterActors = [...world.actors.values()].filter((a) => a.type === "character");
    assert.deepEqual(characterActors, [], "no draft kid/Frame character should be synced without explicit confirmation");
    // Exactly 3 npc-type Actors (the 3 established NPCs -- no claimant until a
    // new, approved one exists, see the "syncs cleanly" test above) -- see
    // that same test for the precise identity/count assertions. Combined with
    // the character-type assertion above, this pins down that REAL_NPC_PATHS
    // still deliberately excludes the Commander/Caretaker/Transparency
    // Advocate placeholders (loadRealCampaignModuleFiles above doesn't even
    // provide mock data for them, so sync.mjs asking for them would surface
    // here as a failed/thrown case, not a silently-passing one).
    assert.equal(world.actors.size, 3);
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

test("runRealContentSync: issue #168 -- real content is genuinely still drafted today, so the NPC gate actually withholds it rather than pushing it", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  // Deliberately NOT promoted -- this is what the real, on-disk data actually
  // says today (issue #166's backfill: nothing has been through the Desk
  // yet). Proves the gate is real, not just unit-tested in isolation.
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadRealCampaignModuleFiles(), templateJson });
  try {
    const report = await runRealContentSync();
    assert.equal(report.fatalError, null);

    const npcResults = report.results.filter((r) => r.sourceId !== "episode-c1e1-mothers-maiden-name");
    assert.equal(npcResults.length, 3, "Shucks Mordant, Nobu, and the Intake Medicals clerk");
    for (const result of npcResults) {
      assert.equal(result.withheld, true, `expected ${result.sourceId} to be withheld -- it is still "drafted"`);
      assert.match(result.withheldReason, /authoring\.status is "drafted"/);
      assert.deepEqual(result.checks, []);
    }

    assert.equal(world.actors.size, 0, "nothing drafted should have been created");
    // The episode's JournalEntry is NOT withheld at the sync.mjs level (issue
    // #168's design choice: a scene is the Desk's real grading unit, so
    // journal.mjs withholds page-by-page instead -- see
    // test/tier1-generators.test.mjs's own withheld-content tests for that).
    const episodeResult = report.results.find((r) => r.sourceId === "episode-c1e1-mothers-maiden-name");
    assert.equal(episodeResult.withheld, undefined, "the episode case is not gated at this level");
    assert.equal(world.journal.size, 1, "the journal still gets created -- with withheld placeholder pages, not withheld entirely");
  } finally {
    uninstall();
  }
});

test("runRealContentSync: a withheld NPC that was already live from before the gate existed is left exactly as it was, not deleted", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  // First run: promoted, so it actually gets created (simulating content
  // that predates this gate). Second run: the SAME content, but now
  // reporting as drafted (simulating the gate turning on under already-live
  // content) -- the existing Actor must survive untouched.
  const moduleFiles = loadRealCampaignModuleFiles({ promoteToSound: true });
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles, templateJson });
  try {
    await runRealContentSync();
    const shucksId = await deriveFoundryId("shucks-mordant");
    const shucksRef = world.actors.get(shucksId);
    assert.ok(shucksRef, "sanity: Shucks Mordant was actually created on the first, promoted run");

    // Mutate the SAME object the mock's fetchModuleJson reads from, in
    // place -- simulating "the gate turned on under content that was
    // already live," not a fresh world.
    Object.assign(moduleFiles, loadRealCampaignModuleFiles());
    const report = await runRealContentSync();
    const shucksResult = report.results.find((r) => r.sourceId === "shucks-mordant");
    assert.equal(shucksResult.withheld, true);
    assert.equal(shucksResult.actualId, shucksRef.id, "the withheld result still names the Actor that's actually live");
    assert.strictEqual(world.actors.get(shucksId), shucksRef, "the pre-existing Actor must be left exactly as it was, never deleted just because the gate turned on");
  } finally {
    uninstall();
  }
});

// --- issue #172: "the sync eligibility set equals the set of items at sound
// or above" --- a pure function, needs no mock-foundry install at all.

test("isPushable: the sync eligibility set is EXACTLY {sound, final} -- no more, no less, and it names the same set promote() itself uses", () => {
  assert.deepEqual([...PROMOTABLE_STATUSES], ["sound", "final"]);
  for (const status of PROMOTABLE_STATUSES) {
    assert.equal(isPushable({ authoring: { status } }), true, `"${status}" must be eligible -- it's in PROMOTABLE_STATUSES`);
  }
  for (const status of [...BASELINE_STATUSES, "cut"]) {
    assert.equal(isPushable({ authoring: { status } }), false, `"${status}" must NOT be eligible`);
  }
});

test("isPushable: an entity with no authoring block, or authoring with no status, is not eligible -- missing information must never default to pushable", () => {
  assert.equal(isPushable({}), false);
  assert.equal(isPushable({ authoring: {} }), false);
  assert.equal(isPushable(null), false);
  assert.equal(isPushable(undefined), false);
});

test("isPushable: agrees with promote()'s own refusal boundary -- anything isPushable rejects is exactly what promote() would refuse to leave below", () => {
  // Not a duplicate of the first test: this one asserts the two functions
  // are checking the SAME set by construction (both import PROMOTABLE_STATUSES
  // from core/promote.mjs), not just that they happen to agree today.
  for (const status of ["needs-lore", "drafted", "sound", "final", "cut", "approved", "", null, undefined]) {
    assert.equal(isPushable({ authoring: { status } }), PROMOTABLE_STATUSES.includes(status));
  }
});

// promptToRunSync (sync-dialog.mjs, GH issue #82's confirm-first prompt) and
// its three tests here were REMOVED 2026-09-19, at Ingram's own direct
// request: "I wouldn't even see a dialogue that I have to confirm, every
// time I load Foundry it just updates, adds or removes scenes to get us to
// the current state of the adventure." The confirm/decline/dismiss behaviour
// that file's tests covered no longer exists by design -- runAutomaticSync
// (blank-inheritance.mjs) now calls runRealContentSync unconditionally, and
// its own coverage (immediately above and below) already exercises exactly
// what a confirmed dialog used to: the real Claimant/NPCs/episode syncing
// cleanly. See test/tier3-scene-build-contract.test.mjs for runAutomaticSync's
// own orchestration contract (source-text, same reason buildSceneSet's own
// tests are -- Scene#update/find aren't modelled by this mock).

// --- approvals-desk.mjs's loadCatalog: singleton fetch paths (regression, found live 2026-09-20) ---
//
// approvals-desk.mjs touches foundry.applications.api at module-evaluation
// time (the ApplicationV2/HandlebarsApplicationMixin destructure at its top),
// so — like scene-runner.mjs in test/tier4-scene-runner-audio.test.mjs — it
// cannot be a static top-level import in this file the way sync.mjs is; it's
// dynamically imported per test, after installMockFoundry() has already
// defined globalThis.foundry.
//
// While live-verifying #172's out-tray in the local Foundry instance, all
// four of loadCatalog's "campaign singleton" fetches (scene-set.json,
// lore-instructions.json, gazetteer-requests.json, open-questions.json) were
// silently 404ing -- both here and, since sync-campaign-data.mjs stages data
// the same way for the real remote server, in production too. Each fetch is
// its own try/catch falling back to null, so the desk never crashed; it just
// silently showed "Nothing here." where real content should have been. Root
// cause: repo data/campaign/<file>.json deploys under the module at the
// DOUBLED data/campaign/campaign/<file>.json (campaign-state.mjs's
// CONFIG_PATH and sync.mjs's REAL_EPISODE_PATHS already document and rely on
// this), except gazetteer-requests.json, which comes from data/map/ instead
// (stage-campaign-data.mjs's SYNCED_MAP_FILES) and lands at
// data/campaign/map/gazetteer-requests.json -- the same location travel.mjs's
// own TRAVEL_GRAPH_PATH/CAMPAIGN_MAP_MANIFEST_PATH already read from. This
// test pins all four correct paths so a future edit can't silently drift back
// to the wrong ones the way this file's first version did.
async function freshApprovalsDesk() {
  const bust = `?t=${Math.random()}`;
  return import(`../module/blank-inheritance/scripts/foundry/approvals-desk.mjs${bust}`);
}

test("loadCatalog: every campaign-singleton fetch uses the real doubled data/campaign/campaign/ path (or, for gazetteer-requests.json, data/campaign/map/) -- not the single-campaign path that 404'd live", async () => {
  const sceneSet = { scenes: [{ briefRef: "the-road-in", id: "scene-the-road-in" }] };
  const loreInstructions = { instructions: [{ id: "li-1", status: "pending" }] };
  const gazetteerRequests = { requests: [{ id: "gr-1", status: "open" }] };
  const openQuestions = { questions: [{ id: "oq-1", status: "open" }] };
  const audioLibrary = { assets: [] };
  const audioReview = { decisions: {} };

  const { uninstall } = installMockFoundry({
    moduleManifest,
    moduleFiles: {
      "data/campaign/campaign/scene-set.json": sceneSet,
      "data/campaign/campaign/lore-instructions.json": loreInstructions,
      "data/campaign/map/gazetteer-requests.json": gazetteerRequests,
      "data/campaign/campaign/open-questions.json": openQuestions,
      "data/campaign/audio/library.json": audioLibrary,
      "data/campaign/audio/review.json": audioReview
    }
  });
  try {
    const { loadCatalog } = await freshApprovalsDesk();
    const catalog = await loadCatalog();

    assert.deepEqual(catalog.sceneSetByBriefRef["the-road-in"], sceneSet.scenes[0]);
    assert.deepEqual(catalog.loreInstructions, loreInstructions);
    assert.deepEqual(catalog.gazetteerRequests, gazetteerRequests);
    assert.deepEqual(catalog.openQuestions, openQuestions);
    assert.deepEqual(catalog.audioLibrary, audioLibrary);
    assert.deepEqual(catalog.audioReview, audioReview);
  } finally {
    uninstall();
  }
});

test("loadCatalog: a genuinely missing singleton (nothing staged at any path) degrades to null/empty, not a thrown error", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest, moduleFiles: {} });
  try {
    const { loadCatalog } = await freshApprovalsDesk();
    const catalog = await loadCatalog(); // must not throw -- a missing file is a 404, not an exception
    assert.deepEqual(catalog.sceneSetByBriefRef, {});
    assert.equal(catalog.loreInstructions, null);
    assert.equal(catalog.gazetteerRequests, null);
    assert.equal(catalog.openQuestions, null);
    assert.equal(catalog.audioLibrary, null);
    assert.equal(catalog.audioReview, null);
  } finally {
    uninstall();
  }
});
