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
import { deriveFoundryId } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/core/ids.mjs";
import { ensureDirectory, writeReportFile, fetchModuleJson } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/foundry/io.mjs";
// Safe as a static top-level import even though this is "the mocked globals"
// file: sync.mjs only touches game/ui/Actor/etc. inside its exported
// function bodies, never at module-evaluation time, so it's fine to import
// once here and call its exports after installMockFoundry() runs per-test.
import { runDiagnosticTestSync } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/foundry/sync.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "mythica-machina-blank-inheritance-adventure-module");
const templateJsonPath = path.join(repoRoot, "gamesystems", "sf2e", "template.json");

const moduleManifest = JSON.parse(readFileSync(path.join(moduleRoot, "module.json"), "utf8"));
const templateJson = existsSync(templateJsonPath) ? JSON.parse(readFileSync(templateJsonPath, "utf8")) : null;

function loadFixtureModuleFiles() {
  const fixturesDir = path.join(moduleRoot, "data", "_test-fixtures");
  const moduleFiles = {};
  for (const name of ["test-creature.json", "test-character.json", "test-scene.json"]) {
    moduleFiles[`data/_test-fixtures/${name}`] = JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
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
    assert.equal(report.results.length, 3);
    for (const result of report.results) {
      const failed = result.checks.filter((c) => !c.pass);
      assert.deepEqual(failed, [], `expected all checks to pass for ${result.foundryType} ${result.sourceId}`);
    }

    const creatureId = await deriveFoundryId("test-fixture-creature-001");
    const createdCreature = world.actors.get(creatureId);
    assert.ok(createdCreature, "expected the creature Actor to actually exist in the mock world");
    assert.equal(createdCreature.getFlag("blank-inheritance", "sourceId"), "test-fixture-creature-001");

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

test("runDiagnosticTestSync: a second run with unchanged fixtures skips all three cases, without recreating any of them (GH issue #113)", async (t) => {
  if (!templateJson) {
    t.skip("gamesystems/sf2e/template.json not present locally — skipping loudly rather than failing or silently passing.");
    return;
  }
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles: loadFixtureModuleFiles(), templateJson });
  try {
    const creatureId = await deriveFoundryId("test-fixture-creature-001");
    const characterId = await deriveFoundryId("test-fixture-kid-001");
    const sceneId = await deriveFoundryId("test-fixture-scene-001");

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
    assert.ok(creatureRefAfterFirstRun && characterRefAfterFirstRun && sceneRefAfterFirstRun);

    const secondRun = await runDiagnosticTestSync();
    assert.equal(secondRun.fatalError, null);
    for (const result of secondRun.results) {
      assert.equal(result.skipped, true, `expected the second run against unchanged fixtures to skip ${result.sourceId}`);
      assert.deepEqual(result.checks.filter((c) => !c.pass), [], "a skipped case must still validate the existing document, not just assume it's fine");
    }
    assert.equal(secondRun.results.length, 3);

    assert.strictEqual(world.actors.get(creatureId), creatureRefAfterFirstRun, "the creature Actor must be the SAME object -- never torn down and recreated");
    assert.strictEqual(world.actors.get(characterId), characterRefAfterFirstRun, "the character Actor must be the SAME object");
    assert.strictEqual(world.scenes.get(sceneId), sceneRefAfterFirstRun, "the Scene must be the SAME object");
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

    await runDiagnosticTestSync();
    const creatureRefAfterFirstRun = world.actors.get(creatureId);
    const characterRefAfterFirstRun = world.actors.get(characterId);
    const sceneRefAfterFirstRun = world.scenes.get(sceneId);

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

    assert.equal(creatureResult.skipped, false, "the changed creature must be recreated, not skipped");
    assert.equal(characterResult.skipped, true, "the unchanged character must still be skipped");
    assert.equal(sceneResult.skipped, true, "the unchanged scene must still be skipped");

    assert.notStrictEqual(world.actors.get(creatureId), creatureRefAfterFirstRun, "the changed creature must be a genuinely NEW object, not just still present");
    assert.strictEqual(world.actors.get(characterId), characterRefAfterFirstRun, "the untouched character must remain the exact same object");
    assert.strictEqual(world.scenes.get(sceneId), sceneRefAfterFirstRun, "the untouched scene must remain the exact same object");
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

    // Re-running should not accumulate duplicate documents — same three ids, still just three.
    assert.equal(world.actors.size, 2, "expected exactly the creature + character actors, not accumulated duplicates");
    assert.equal(world.scenes.size, 1);
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
    assert.equal(world.chatMessages.length, 0);
  } finally {
    uninstall();
  }
});

test("runDiagnosticTestSync: one case throwing does not prevent the other two from running and reporting (regression: found while bootstrapping tests, 2026-08-22)", async (t) => {
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
    assert.equal(report.results.length, 3, "all three cases must still report a result");

    const creatureResult = report.results.find((r) => r.sourceId === "creature");
    assert.ok(creatureResult, "the failed case should still produce a result, labeled by its case name");
    assert.ok(creatureResult.checks.some((c) => !c.pass), "the failed case's result must show at least one failed check, not silently pass");
    assert.equal(world.actors.size, 1, "the character case must still have created its actor despite the creature case failing");

    const sceneResult = report.results.find((r) => r.foundryType === "Scene");
    assert.ok(sceneResult, "the scene case must still have run even though the creature case failed");
    // The scene can't place a token for the never-created creature, but it must still exist.
    assert.equal(world.scenes.size, 1);
  } finally {
    uninstall();
  }
});
