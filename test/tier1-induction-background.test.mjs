// Tier 1 — the induction terminal's Page 3 background-choice resolution.
//
// Pure logic only: turning a player's picks against a background's boost
// slots into the flat ability list derive.mjs expects. No Foundry. The
// generic slot-resolution mechanics themselves (resolveSlots, etc.) are
// already covered by test/tier1-induction-ancestry.test.mjs against the
// shared core/boost-slots.mjs -- this file only tests what's specific to
// backgrounds.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  isBackgroundChoiceComplete,
  resolveBackgroundIngredients,
  groupBackgroundsByRarity,
  filterBackgrounds
} from "../module/blank-inheritance/scripts/core/induction-background.mjs";

test("isBackgroundChoiceComplete: false with no background picked at all", () => {
  assert.equal(isBackgroundChoiceComplete(null, []), false);
});

test("isBackgroundChoiceComplete: true once every free boost slot has a pick", () => {
  // Absalom Local's real shape: one free-among-two boost, one fully-free boost.
  const background = { boosts: [["cha", "wis"], ["str", "dex", "con", "int", "wis", "cha"]] };
  assert.equal(isBackgroundChoiceComplete(background, []), false, "both slots are still unpicked");
  assert.equal(isBackgroundChoiceComplete(background, ["wis"]), false, "the second free slot is still unpicked");
  assert.equal(isBackgroundChoiceComplete(background, ["wis", "int"]), true);
});

test("isBackgroundChoiceComplete: a background with THREE boost slots (Escaped Experiment's real shape) needs all three picked", () => {
  const background = {
    boosts: [
      ["str", "dex", "con", "int", "wis", "cha"],
      ["str", "dex", "con", "int", "wis", "cha"],
      ["str", "dex", "con", "int", "wis", "cha"]
    ]
  };
  assert.equal(isBackgroundChoiceComplete(background, ["str", "dex"]), false);
  assert.equal(isBackgroundChoiceComplete(background, ["str", "dex", "con"]), true);
});

test("resolveBackgroundIngredients: produces the flat shape derive.mjs's deriveAbilityModifiers expects (backgroundBoosts)", () => {
  const background = { boosts: [["cha", "wis"], ["str", "dex", "con", "int", "wis", "cha"]] };
  const ingredients = resolveBackgroundIngredients(background, ["wis", "int"]);
  assert.deepEqual(ingredients, { backgroundBoosts: ["wis", "int"] });
});

test("resolveBackgroundIngredients: throws rather than silently deriving from an incomplete choice", () => {
  const background = { boosts: [["cha", "wis"], ["str", "dex", "con", "int", "wis", "cha"]] };
  assert.throws(() => resolveBackgroundIngredients(background, []), /not.*chosen/i);
});

test("groupBackgroundsByRarity: splits into common/uncommon/rare, alphabetical within each", () => {
  // Deliberately non-alphabetical input, same discipline as groupAncestries'
  // own regression test (2026-09-09: a prior version claimed to sort but didn't).
  const backgrounds = [
    { id: "z", name: "Zealot", rarity: "rare" },
    { id: "s", name: "Smuggler", rarity: "common" },
    { id: "a", name: "Advocate", rarity: "common" },
    { id: "w", name: "Wayfinder", rarity: "uncommon" }
  ];
  const { common, uncommon, rare } = groupBackgroundsByRarity(backgrounds);
  assert.deepEqual(common.map((b) => b.id), ["a", "s"]);
  assert.deepEqual(uncommon.map((b) => b.id), ["w"]);
  assert.deepEqual(rare.map((b) => b.id), ["z"]);
});

test("filterBackgrounds: case-insensitive substring match on name; a blank query matches everything", () => {
  const backgrounds = [{ id: "s", name: "Smuggler" }, { id: "sc", name: "Scientist" }, { id: "w", name: "Wayfinder" }];
  assert.deepEqual(filterBackgrounds(backgrounds, "sc").map((b) => b.id), ["sc"]);
  assert.deepEqual(filterBackgrounds(backgrounds, "S").map((b) => b.id), ["s", "sc"]);
  assert.deepEqual(filterBackgrounds(backgrounds, "").map((b) => b.id), ["s", "sc", "w"]);
});

// ---------------------------------------------------------------------------
// The real authored catalogue, run through the real code.
// ---------------------------------------------------------------------------

const CATALOGUE = JSON.parse(readFileSync(new URL("../data/campaign/background-catalogue.json", import.meta.url), "utf8"));

test("the real background catalogue has exactly 154 entries, each with a unique id", () => {
  assert.equal(CATALOGUE.backgrounds.length, 154);
  assert.equal(new Set(CATALOGUE.backgrounds.map((b) => b.id)).size, 154);
});

test("every real background's boosts resolve cleanly once every free slot is given a legal pick, and each question it asks is answered", () => {
  for (const background of CATALOGUE.backgrounds) {
    const boostPicks = background.boosts.filter((slot) => slot.length > 1).map((slot) => slot[0]);
    // A background whose rules ask a question (Starship Dweller: Crafting or Piloting) is not complete until it is answered;
    // test/tier1-induction-rule-choices.test.mjs holds that, and the questions themselves.
    const choicePicks = Object.fromEntries((background.choices ?? []).map((choice) => [choice.flag, choice.options[0].key]));
    assert.ok(isBackgroundChoiceComplete(background, boostPicks, choicePicks), `${background.id} did not resolve to complete`);
    const ingredients = resolveBackgroundIngredients(background, boostPicks, choicePicks);
    assert.equal(ingredients.backgroundBoosts.length, background.boosts.length);
  }
});

test("rarity totals match the real compendium's own breakdown (118 common / 24 uncommon / 12 rare)", () => {
  const { common, uncommon, rare } = groupBackgroundsByRarity(CATALOGUE.backgrounds);
  assert.equal(common.length, 118);
  assert.equal(uncommon.length, 24);
  assert.equal(rare.length, 12);
});

test("data/schema/background-catalogue.schema.json parses as valid JSON and matches the file it describes", () => {
  const schema = JSON.parse(readFileSync(new URL("../data/schema/background-catalogue.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.$id, "background-catalogue.schema.json");
  for (const required of schema.required) {
    assert.ok(required in CATALOGUE, `catalogue is missing required field "${required}"`);
  }
});
