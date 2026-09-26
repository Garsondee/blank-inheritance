// NPC asset/content gap tracker. See design/scene-triggers-and-depth.md §5.
//
// Deliberately does NOT pin exact counts of what's currently missing --
// authoring Facts and assigning portraits is exactly the ongoing content
// work this tracker exists to guide, so a hardcoded "37 NPCs have zero
// Facts" assertion would go stale the moment that work starts (possibly
// within the same session that built this). Instead this checks the
// GENERATOR's own logic: self-consistency of its output, and a couple of
// real-data spot checks stable enough not to move under normal authoring
// (an NPC already named, a portrait already registered).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildGapReport, repoRoot } from "../tools/npc-gaps/generate.mjs";

test("counts.total matches the real number of data/npcs/*.json files, and every reported id resolves to a real file", () => {
  const report = buildGapReport();
  const files = readdirSync(path.join(repoRoot, "data", "npcs")).filter((f) => f.endsWith(".json"));
  assert.equal(report.counts.total, files.length);
  assert.equal(report.npcs.length, files.length);

  const realIds = new Set(
    files.map((f) => JSON.parse(readFileSync(path.join(repoRoot, "data", "npcs", f), "utf8")).id)
  );
  for (const npc of report.npcs) {
    assert.ok(realIds.has(npc.id), `reported NPC "${npc.id}" doesn't match any real data/npcs/*.json id`);
  }
  assert.equal(new Set(report.npcs.map((n) => n.id)).size, report.npcs.length, "duplicate NPC id in the report");
});

test("every *Ids convenience list is exactly consistent with the per-NPC flags -- never a stale or partial copy", () => {
  const report = buildGapReport();
  const byId = new Map(report.npcs.map((n) => [n.id, n]));

  for (const id of report.missingPortraitIds) assert.equal(byId.get(id)?.hasPortrait, false, `${id} is in missingPortraitIds but hasPortrait isn't false`);
  for (const npc of report.npcs) if (!npc.hasPortrait) assert.ok(report.missingPortraitIds.includes(npc.id), `${npc.id} has no portrait but is missing from missingPortraitIds`);

  for (const id of report.missingFactsIds) assert.equal(byId.get(id)?.factCount, 0, `${id} is in missingFactsIds but factCount isn't 0`);
  for (const npc of report.npcs) if (npc.factCount === 0) assert.ok(report.missingFactsIds.includes(npc.id), `${npc.id} has 0 facts but is missing from missingFactsIds`);

  for (const id of report.placeholderNameIds) assert.equal(byId.get(id)?.nameIsPlaceholder, true, `${id} is in placeholderNameIds but nameIsPlaceholder isn't true`);
  for (const npc of report.npcs) if (npc.nameIsPlaceholder) assert.ok(report.placeholderNameIds.includes(npc.id), `${npc.id} has a null name but is missing from placeholderNameIds`);

  assert.equal(report.counts.missingPortrait, report.missingPortraitIds.length);
  assert.equal(report.counts.missingFacts, report.missingFactsIds.length);
  assert.equal(report.counts.placeholderName, report.placeholderNameIds.length);
});

test("hasSocialProfile and factCount agree -- a socialProfile with facts always reports hasSocialProfile true", () => {
  const report = buildGapReport();
  for (const npc of report.npcs) {
    if (npc.factCount > 0) assert.equal(npc.hasSocialProfile, true, `${npc.id} has ${npc.factCount} fact(s) but hasSocialProfile is false`);
  }
});

test("REAL DATA: shucks-mordant has a long-assigned character portrait, so hasPortrait reads true", () => {
  const report = buildGapReport();
  const shucks = report.npcs.find((n) => n.id === "shucks-mordant");
  assert.ok(shucks, "shucks-mordant is missing from data/npcs/");
  assert.equal(shucks.hasPortrait, true);
});

test("REAL DATA: shop-boss (Hulda Brack) already has a real, decided name -- not a naming placeholder", () => {
  const report = buildGapReport();
  const shopBoss = report.npcs.find((n) => n.id === "shop-boss");
  assert.ok(shopBoss, "shop-boss is missing from data/npcs/");
  assert.equal(shopBoss.name, "Hulda Brack");
  assert.equal(shopBoss.nameIsPlaceholder, false);
});

test("the report is otherwise deterministic between runs (only generatedAt differs)", () => {
  const a = buildGapReport();
  const b = buildGapReport();
  delete a.generatedAt;
  delete b.generatedAt;
  assert.deepEqual(a, b);
});

test("the generated file on disk is current -- rerun tools/npc-gaps/generate.mjs if this fails", () => {
  const onDisk = JSON.parse(readFileSync(path.join(repoRoot, "data", "generated", "npc-asset-gaps.json"), "utf8"));
  const fresh = buildGapReport();
  delete onDisk.generatedAt;
  delete fresh.generatedAt;
  assert.deepEqual(onDisk, fresh);
});
