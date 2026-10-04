// Tier 2 — the rules glossary against what ships (2026-10-04, D060). data/rules-glossary.json is generated
// (tools/rules-glossary/build.mjs) from the shipped sf2e packs and the shipped SRD index; this proves the file in the
// module is exactly what they make, that every UUID it holds opens a real document in those packs, that every article it
// names is in the index, and that the Scene Runner finds the rules Episode One's fight actually uses. An sf2e upgrade that
// renames or drops a condition fails here, before a GM presses a chip that opens nothing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGlossary, OUTPUT, PACKS, SRD_INDEX } from "../tools/rules-glossary/build.mjs";
import { readPackDocuments } from "../tools/pack-extractor/read-pack.mjs";
import { rulesInScene } from "../module/blank-inheritance/scripts/core/scene-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glossary = JSON.parse(readFileSync(OUTPUT, "utf8"));
const index = JSON.parse(readFileSync(SRD_INDEX, "utf8"));
const packIds = (pack, collection) => new Set(readPackDocuments(path.join(PACKS, pack)).documents.filter((d) => d.collection === collection).map((d) => d.doc._id));

test("the glossary in the module is exactly what the shipped packs and the rules index make (rebuild it: node tools/rules-glossary/build.mjs)", () => {
  assert.deepEqual(glossary, JSON.parse(JSON.stringify(buildGlossary())));
});

test("every condition and action opens a real document in sf2e's own packs, and every rule a real article", () => {
  const ids = { conditions: packIds("conditions", "items"), actions: packIds("actions", "items") };
  const articles = new Set(index.map((a) => a.id));
  const bad = [];
  for (const e of glossary.entries) {
    if (e.uuid) {
      const m = /^Compendium\.sf2e\.(conditions|actions)\.Item\.([A-Za-z0-9]{16})$/.exec(e.uuid);
      if (!m || !ids[m[1]].has(m[2])) bad.push(`${e.id}: ${e.uuid}`);
    } else if (!articles.has(e.srd)) bad.push(`${e.id}: no article ${e.srd}`);
    for (const p of e.patterns ?? []) { try { new RegExp(p, "i"); } catch { bad.push(`${e.id}: pattern ${p}`); } }
  }
  assert.deepEqual(bad, []);
  assert.ok(glossary.entries.filter((e) => e.kind === "condition").length >= 40, "every condition the system has");
  for (const name of ["Off-Guard", "Frightened", "Grabbed", "Prone", "Fatigued"]) assert.ok(glossary.entries.some((e) => e.name === name), `${name} is missing`);
  for (const name of ["Demoralize", "Recall Knowledge", "Seek", "Strike", "Escape", "Treat Wounds"]) assert.ok(glossary.entries.some((e) => e.kind === "action" && e.name === name), `the ${name} action is missing`);
  assert.ok(!glossary.entries.some((e) => e.name === "Become Ooze"), "an ancestry's own action is not a general rule");
});

test("REAL DATA: Flood Tunnel Clearance offers the rules its fight uses, the centipede's stat block first", () => {
  const load = (dir, id) => { const p = path.join(ROOT, "data", dir, `${id}.json`); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; };
  const brief = load("scene-briefs", "episode-c1e1--flood-tunnel");
  const ids = (key) => [...new Set((brief.beats ?? []).map((b) => b[key]).filter(Boolean))];
  const challenges = Object.fromEntries(ids("challengeRef").map((id) => [id, load("challenges", id)]).filter(([, c]) => c));
  const encounters = Object.fromEntries(ids("encounterRef").map((id) => [id, load("encounters", id)]).filter(([, e]) => e));
  const rules = rulesInScene({ brief, challenges, encounters, subsystem: load("subsystems", brief.clockRef) }, glossary);
  const names = rules.map((r) => r.name);
  assert.equal(rules[0].kind, "creature");
  assert.equal(rules[0].name, "Giant Centipede");
  assert.match(rules[0].uuid, /^Compendium\.sf2e\.tales-from-the-vast-bestiary\.Actor\./);
  assert.ok(packIds("tales-from-the-vast-bestiary", "actors").has(rules[0].uuid.split(".").pop()), "the centipede's UUID opens a real stat block");
  for (const want of ["Difficult terrain", "Off-Guard", "Demoralize", "Afflictions", "Initiative", "Grabbed"]) assert.ok(names.includes(want), `Flood Tunnel no longer offers ${want}: ${names.join(", ")}`);
});

test("REAL DATA: a scene of talk offers no rules at all, and nothing the players are told aloud is read as one", () => {
  const brief = JSON.parse(readFileSync(path.join(ROOT, "data", "scene-briefs", "episode-c1e1--intake-medicals.json"), "utf8"));
  const names = rulesInScene({ brief }, glossary).map((r) => r.name);
  assert.ok(!names.includes("Unconscious"), "the doctor's line about coming in unconscious is a line, not a ruling");
});
