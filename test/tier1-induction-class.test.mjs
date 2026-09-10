// Tier 1 — the induction terminal's Page 4 class-choice resolution.
//
// Pure logic only: turning a player's key-ability pick against a class's
// one boost slot into the scalar derive.mjs expects. No Foundry. The
// generic slot-resolution mechanics themselves are already covered by
// test/tier1-induction-ancestry.test.mjs against the shared
// core/boost-slots.mjs -- this file only tests what's specific to classes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { isClassChoiceComplete, resolveClassIngredients } from "../module/blank-inheritance/scripts/core/induction-class.mjs";

test("isClassChoiceComplete: false with no class picked at all", () => {
  assert.equal(isClassChoiceComplete(null, []), false);
});

test("isClassChoiceComplete: a fixed key ability (Soldier's real shape) is complete the moment the class is picked, no pick needed", () => {
  const soldier = { keyAbility: ["con"] };
  assert.equal(isClassChoiceComplete(soldier, []), true);
});

test("isClassChoiceComplete: a free key ability (Witchwarper's real shape) needs an actual pick", () => {
  const witchwarper = { keyAbility: ["cha", "int"] };
  assert.equal(isClassChoiceComplete(witchwarper, []), false, "no pick made yet");
  assert.equal(isClassChoiceComplete(witchwarper, ["cha"]), true);
});

test("resolveClassIngredients: a fixed key ability resolves to that ability, scalar not array", () => {
  const soldier = { keyAbility: ["con"] };
  assert.deepEqual(resolveClassIngredients(soldier, []), { classKeyAbility: "con" });
});

test("resolveClassIngredients: a free key ability resolves to the player's pick", () => {
  const witchwarper = { keyAbility: ["cha", "int"] };
  assert.deepEqual(resolveClassIngredients(witchwarper, ["int"]), { classKeyAbility: "int" });
});

test("resolveClassIngredients: throws rather than silently deriving from an incomplete choice", () => {
  const witchwarper = { keyAbility: ["cha", "int"] };
  assert.throws(() => resolveClassIngredients(witchwarper, []), /not been chosen/i);
});

test("resolveClassIngredients: throws on an illegal pick, same as the shared resolveSlots guard", () => {
  const witchwarper = { keyAbility: ["cha", "int"] };
  assert.throws(() => resolveClassIngredients(witchwarper, ["str"]), /not a legal choice/);
});

// ---------------------------------------------------------------------------
// The real authored catalogue, run through the real code.
// ---------------------------------------------------------------------------

const CATALOGUE = JSON.parse(readFileSync(new URL("../data/campaign/class-catalogue.json", import.meta.url), "utf8"));

test("the real class catalogue has exactly 6 entries, each with a unique id", () => {
  assert.equal(CATALOGUE.classes.length, 6);
  assert.equal(new Set(CATALOGUE.classes.map((c) => c.id)).size, 6);
});

test("every real class's key ability resolves cleanly once given a legal pick (or needs none, if fixed)", () => {
  for (const cls of CATALOGUE.classes) {
    const pick = cls.keyAbility.length > 1 ? [cls.keyAbility[0]] : [];
    assert.ok(isClassChoiceComplete(cls, pick), `${cls.id} did not resolve to complete`);
    const ingredients = resolveClassIngredients(cls, pick);
    assert.ok(cls.keyAbility.includes(ingredients.classKeyAbility));
  }
});

test("exactly one real class (Witchwarper) offers a real key-ability choice; the rest are fixed", () => {
  const withChoice = CATALOGUE.classes.filter((c) => c.keyAbility.length > 1);
  assert.deepEqual(withChoice.map((c) => c.id), ["witchwarper"]);
});

test("data/schema/class-catalogue.schema.json parses as valid JSON and matches the file it describes", () => {
  const schema = JSON.parse(readFileSync(new URL("../data/schema/class-catalogue.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.$id, "class-catalogue.schema.json");
  for (const required of schema.required) {
    assert.ok(required in CATALOGUE, `catalogue is missing required field "${required}"`);
  }
});
