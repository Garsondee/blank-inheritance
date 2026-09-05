// Tier 1 — pure generator unit tests. Milliseconds, no Foundry, no network.
// Golden files under test/golden/ are the committed expected output — an
// unintended change shows up as a readable diff in review. When a generator
// change is intentional, regenerate by running the relevant builder against
// the fixture and overwriting the golden file (see git history of this file
// for the exact one-off commands used to create them) — never hand-edit a
// golden file to make a test pass.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deriveFoundryId, contentHash } from "../module/blank-inheritance/scripts/core/ids.mjs";
import { buildCreatureActorData } from "../module/blank-inheritance/scripts/core/generators/creature.mjs";
import { buildCharacterActorData } from "../module/blank-inheritance/scripts/core/generators/character.mjs";
import { buildSceneData } from "../module/blank-inheritance/scripts/core/generators/scene.mjs";
import { buildJournalEntryData } from "../module/blank-inheritance/scripts/core/generators/journal.mjs";
import { validateActor, validateScene, validateJournalEntry } from "../module/blank-inheritance/scripts/core/validate.mjs";
import { summarizeReport, reportToClipboardText } from "../module/blank-inheritance/scripts/core/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const fixturesDir = path.join(repoRoot, "module", "blank-inheritance", "data", "_test-fixtures");
const goldenDir = path.join(here, "golden");

function readFixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}
function readGolden(name) {
  return JSON.parse(readFileSync(path.join(goldenDir, name), "utf8"));
}

test("deriveFoundryId is deterministic and Foundry-id-shaped", async () => {
  const a = await deriveFoundryId("test-fixture-creature-001");
  const b = await deriveFoundryId("test-fixture-creature-001");
  assert.equal(a, b, "same source id must always derive the same Foundry id");
  assert.match(a, /^[a-zA-Z0-9]{16}$/, "must be exactly 16 alphanumeric chars — Foundry's document id format");

  const different = await deriveFoundryId("test-fixture-creature-002");
  assert.notEqual(a, different);
});

test("contentHash changes when the object changes, stable when it doesn't", async () => {
  const h1 = await contentHash({ a: 1, b: 2 });
  const h2 = await contentHash({ a: 1, b: 2 });
  const h3 = await contentHash({ a: 1, b: 3 });
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test("buildCreatureActorData matches golden output", async () => {
  const source = readFixture("test-creature.json");
  const actual = await buildCreatureActorData(source);
  const expected = readGolden("creature-actor.json");
  assert.deepEqual(actual, expected);
});

test("buildCreatureActorData: strikes map to melee Items with the real sf2e field shape", async () => {
  const source = readFixture("test-creature.json");
  const data = await buildCreatureActorData(source);
  assert.equal(data.items.length, 1);
  const [claw] = data.items;
  assert.equal(claw.type, "melee");
  assert.equal(claw.system.action, "strike");
  assert.equal(claw.system.bonus.value, 25);
  assert.equal(claw.system.range, null, "strikeType 'melee' must produce a null range, not a range object");
  const damageEntries = Object.values(claw.system.damageRolls);
  assert.equal(damageEntries.length, 1);
  assert.equal(damageEntries[0].damage, "3d8+10");
  assert.equal(damageEntries[0].damageType, "slashing");
});

test("buildCreatureActorData: sensible defaults when optional fields are absent", async () => {
  const data = await buildCreatureActorData({ id: "bare-creature" });
  assert.equal(data.type, "npc");
  assert.equal(data.system.attributes.ac.value, 10, "AC defaults to 10, matching template.json's own default");
  assert.equal(data.system.attributes.hp.max, 1);
  assert.equal(data.system.traits.size.value, "med", "unrecognized/missing size must fall back to medium");
  assert.deepEqual(data.items, [], "no strikes in source must produce an empty items array, not throw");
});

test("buildCharacterActorData matches golden output", async () => {
  const source = readFixture("test-character.json");
  const actual = await buildCharacterActorData(source);
  const expected = readGolden("character-actor.json");
  assert.deepEqual(actual, expected);
});

test("buildCharacterActorData: deliberately does not write system.abilities or attributes.ac", async () => {
  // Regression guard for the exact mistake design/foundry-module-design.md §2 warns about:
  // every shipped sf2e character has system.abilities === null, computed from embedded Items.
  // Writing flat numbers here would produce a sheet that's wrong the moment sf2e recalculates.
  const data = await buildCharacterActorData({ id: "x", name: "X", level: 5 });
  assert.equal(data.system.abilities, undefined);
  assert.equal(data.system.attributes, undefined);
  assert.deepEqual(Object.keys(data.system), ["details"]);
});

test("buildSceneData matches golden output", async () => {
  const sceneSource = readFixture("test-scene.json");
  const actorIdBySourceId = readGolden("actor-id-by-source-id.json");
  const actual = await buildSceneData(sceneSource, actorIdBySourceId);
  const expected = readGolden("scene.json");
  assert.deepEqual(actual, expected);
});

test("buildSceneData: a placement referencing an actor not in the map is silently dropped, not thrown", async () => {
  const data = await buildSceneData(
    { id: "s", placements: [{ actorSourceId: "unknown-actor", x: 1, y: 1 }] },
    {}
  );
  assert.deepEqual(data.tokens, []);
});

test("buildJournalEntryData matches golden output", async () => {
  const source = readFixture("test-journal.json");
  const actual = await buildJournalEntryData(source);
  const expected = readGolden("journal-entry.json");
  assert.deepEqual(actual, expected);
});

test("buildJournalEntryData: page ids are deterministic and independent of the parent journal's id", async () => {
  const a = await buildJournalEntryData({ id: "j1", pages: [{ id: "p1", name: "Page" }] });
  const b = await buildJournalEntryData({ id: "j1", pages: [{ id: "p1", name: "Page" }] });
  assert.equal(a.pages[0]._id, b.pages[0]._id, "same journal id + same page id must always derive the same page id");

  const differentJournal = await buildJournalEntryData({ id: "j2", pages: [{ id: "p1", name: "Page" }] });
  assert.notEqual(a.pages[0]._id, differentJournal.pages[0]._id, "the same page id under a different journal must derive a different page id");
});

test("buildJournalEntryData: no pages in source produces an empty pages array, not throw", async () => {
  const data = await buildJournalEntryData({ id: "bare-journal" });
  assert.deepEqual(data.pages, []);
  assert.equal(data.name, "bare-journal", "falls back to id when name is absent, same convention as the other generators");
});

test("buildJournalEntryData: pages default to text/HTML format and space sort values by Foundry's own SORT_INTEGER_DENSITY", async () => {
  const data = await buildJournalEntryData({ id: "j", pages: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
  for (const page of data.pages) {
    assert.equal(page.type, "text");
    assert.equal(page.text.format, 1, "must match CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML");
  }
  assert.equal(data.pages[0].sort, 100000);
  assert.equal(data.pages[1].sort, 200000);
});

test("validateJournalEntry: a JournalEntry with all pages present and matching passes every check", async () => {
  const source = readFixture("test-journal.json");
  const data = await buildJournalEntryData(source);
  const created = { ...data, id: data._id };
  const result = await validateJournalEntry(created, source, data._id);
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 0, `expected all checks to pass, got: ${JSON.stringify(result.checks.filter((c) => !c.pass))}`);
});

test("validateJournalEntry: a missing page is reported as a failed check, not silently accepted", async () => {
  const source = readFixture("test-journal.json");
  const data = await buildJournalEntryData(source);
  const created = { ...data, id: data._id, pages: data.pages.slice(0, 1) };
  const result = await validateJournalEntry(created, source, data._id);
  const failed = result.checks.filter((c) => !c.pass);
  assert.ok(failed.length > 0, "dropping a page must surface at least one failed check");
});

test("validateActor + summarizeReport: a matching Actor passes every check", async () => {
  const source = readFixture("test-creature.json");
  const data = await buildCreatureActorData(source);
  // Simulate what Foundry would hand back after Actor.create + re-read: same shape, plus a real Document's `.id`.
  const created = { ...data, id: data._id };
  const result = await validateActor(created, source, data._id, "creature");
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 0, `expected all checks to pass, got: ${JSON.stringify(result.checks.filter((c) => !c.pass))}`);
});

test("summarizeReport: counts skipped results separately from pass/fail, without affecting the check totals", () => {
  const skippedResult = { skipped: true, checks: [{ pass: true }, { pass: true }] };
  const createdResult = { skipped: false, checks: [{ pass: true }, { pass: false }] };
  const summary = summarizeReport({ results: [skippedResult, createdResult] });
  assert.equal(summary.skipped, 1);
  assert.equal(summary.total, 4, "skipping a case must not exclude its own checks from the totals -- a skip is still validated");
  assert.equal(summary.passed, 3);
  assert.equal(summary.failed, 1);
});

test("summarizeReport: a result with no 'skipped' field at all (older report shape) counts as 0 skipped, not a crash", () => {
  const summary = summarizeReport({ results: [{ checks: [{ pass: true }] }] });
  assert.equal(summary.skipped, 0);
});

test("validateActor: a mismatched field is reported as a failed check, not silently accepted", async () => {
  const source = readFixture("test-creature.json");
  const data = await buildCreatureActorData(source);
  const created = { ...data, id: data._id, name: "Wrong Name" };
  const result = await validateActor(created, source, data._id, "creature");
  const nameCheck = result.checks.find((c) => c.label === "name matches source");
  assert.equal(nameCheck.pass, false);
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 1);
});

test("validateScene: token count check fails if a placement silently produced no token", async () => {
  const sceneSource = readFixture("test-scene.json");
  const actorIdBySourceId = readGolden("actor-id-by-source-id.json");
  const data = await buildSceneData(sceneSource, actorIdBySourceId);
  const created = { ...data, id: data._id, tokens: [] }; // simulate a Scene that came back with no tokens
  const result = await validateScene(created, sceneSource, data._id, actorIdBySourceId);
  const tokenCountCheck = result.checks.find((c) => c.label === "token count matches placements");
  assert.equal(tokenCountCheck.pass, false);
});

test("reportToClipboardText: contains a human-readable summary AND the full report as parseable JSON", () => {
  const report = { timestamp: "2026-09-04T00:00:00.000Z", results: [{ foo: "bar" }], fatalError: null };
  const summary = { total: 5, passed: 5, failed: 0 };
  const text = reportToClipboardText(report, summary);

  assert.match(text, /5\/5 checks passed/);
  assert.doesNotMatch(text, /FAILED/, "a fully-passing report must not mention FAILED");
  assert.match(text, /paste.*back to Claude/i);

  const jsonStart = text.indexOf("{");
  const parsed = JSON.parse(text.slice(jsonStart));
  assert.deepEqual(parsed, report, "the full original report object must be losslessly recoverable from the clipboard text");
});

test("reportToClipboardText: a failing report names the failure count and the fatal error", () => {
  const report = { timestamp: "2026-09-04T00:00:00.000Z", results: [], fatalError: "boom" };
  const summary = { total: 3, passed: 1, failed: 2 };
  const text = reportToClipboardText(report, summary);

  assert.match(text, /1\/3 checks passed \(2 FAILED\)/);
  assert.match(text, /Fatal error: boom/);
});
