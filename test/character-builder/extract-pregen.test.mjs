/**
 * tools/character-builder/extract-pregen.mjs's own copy of the itemsFor() helper (a deliberate
 * duplicate of tools/pack-extractor/extract-npc.mjs's — see both files' own headers for why) carries
 * the identical ordering bug that fixture regeneration was found to have silently reordered
 * erabryth.json's/kuriaku.json's actions/lore arrays with (GH investigation, 2026-09-12): raw pack
 * read order is LevelDB storage order (ascending internal-key once compacted, write order while still
 * in the WAL), not Foundry's own authored order, and the two can silently disagree whenever a pack
 * recompacts. Nothing currently serializes listLevel1Pregens()'s weapons/spellcastingEntries/spells/
 * feats/actions arrays directly (every caller looks a specific item up by name), so this file's own
 * bug never had a visible symptom the way the NPC side's did — but the same fix (sort by each item's
 * real Foundry `sort` field) closes the identical latent hole here. See extract-npc.test.mjs's own
 * ordering tests for the real, visibly-reordered case this mirrors.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens } from "../../tools/character-builder/extract-pregen.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const pregensDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
const iconicsDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "iconics");

test("listLevel1Pregens: weapons/spells/feats/actions order is stable across two independent, from-disk extractions of the same unchanged pack — regression for the WAL/SSTable storage-order leak (extract-npc.mjs's own sibling bug)", () => {
  const run1 = listLevel1Pregens(pregensDir).find((p) => p.name === "Lunar-17");
  const run2 = listLevel1Pregens(pregensDir).find((p) => p.name === "Lunar-17");
  assert.deepEqual(run1.weapons.map((w) => w.name), run2.weapons.map((w) => w.name), "two independent reads of the same pack must return weapons in the same order, not just the same set");
  assert.deepEqual(run1.spells.map((s) => s.name), run2.spells.map((s) => s.name));
  assert.deepEqual(run1.feats.map((f) => f.name), run2.feats.map((f) => f.name));
  assert.deepEqual(run1.actions.map((a) => a.name), run2.actions.map((a) => a.name));

  const bennit1 = listLevel1Pregens(pregensDir).find((p) => p.name === "“Nitpick” Bennit");
  const bennit2 = listLevel1Pregens(pregensDir).find((p) => p.name === "“Nitpick” Bennit");
  assert.deepEqual(bennit1.feats.map((f) => f.name), bennit2.feats.map((f) => f.name));
});

test("listLevel1Pregens: “Nitpick” Bennit's feats follow her real Foundry `sort` field — the five class/ancestry feats she has no recorded sort for (0) come before the six the game assigns an explicit progression order (100-600), never an arbitrary storage order", () => {
  const bennit = listLevel1Pregens(pregensDir).find((p) => p.name === "“Nitpick” Bennit");
  const names = bennit.feats.map((f) => f.name);
  const quantumFieldIndex = names.indexOf("Quantum Field"); // real sort 100
  const tangibleObjectIndex = names.indexOf("Tangible Object"); // real sort 600, her last feat by sort
  assert.ok(quantumFieldIndex >= 0 && tangibleObjectIndex >= 0);
  assert.ok(quantumFieldIndex < tangibleObjectIndex, "Quantum Field (sort 100) must come before Tangible Object (sort 600)");
  assert.equal(names[names.length - 1], "Tangible Object", "the highest real sort value (600) must land last");
});

test("listLevel1Pregens: Lunar-17's weapons (all real sort:0 — a genuine tie) still come back in a fixed, repo-content-derived order, not raw storage order left to chance", () => {
  const run1 = listLevel1Pregens(pregensDir).find((p) => p.name === "Lunar-17").weapons.map((w) => w.name);
  const run2 = listLevel1Pregens(pregensDir).find((p) => p.name === "Lunar-17").weapons.map((w) => w.name);
  assert.deepEqual(run1, run2, "a tied sort value must still resolve to the same order every time, via the idPart tiebreak — never left to whatever order the pack read happened to produce");
});

test("listLevel1Pregens: Zemir's weapons (Battleglove, real sort -100000) come before Semi-Auto Pistol (real sort 0) — a negative sort value is handled correctly, not treated as falsy/missing", () => {
  const zemir = listLevel1Pregens(iconicsDir).find((p) => p.name === "Zemir (Level 1)");
  assert.deepEqual(zemir.weapons.map((w) => w.name), ["Battleglove", "Semi-Auto Pistol"]);
});
