// Tier 1 — the induction terminal's Page 2 ancestry-choice resolution.
//
// Pure logic only: turning a player's picks against an ancestry's boost/flaw
// choice slots into the flat ability lists derive.mjs expects. No Foundry.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { isFixedSlot, resolveSlots, claimedAbilities } from "../module/blank-inheritance/scripts/core/boost-slots.mjs";
import {
  isAncestryChoiceComplete,
  resolveAncestryIngredients,
  groupAncestries,
  filterAncestries
} from "../module/blank-inheritance/scripts/core/induction-ancestry.mjs";

test("isFixedSlot: a single-ability slot is fixed, a multi-ability slot is a free choice", () => {
  assert.equal(isFixedSlot(["con"]), true);
  assert.equal(isFixedSlot(["str", "dex", "con", "int", "wis", "cha"]), false);
});

test("resolveSlots: fixed slots resolve on their own, consuming no pick", () => {
  const { resolved, missing } = resolveSlots([["con"], ["wis"]], []);
  assert.deepEqual(resolved, ["con", "wis"]);
  assert.deepEqual(missing, []);
});

test("resolveSlots: a free slot with a legal pick resolves to that pick", () => {
  const { resolved, missing } = resolveSlots([["con"], ["str", "dex", "con", "int", "wis", "cha"]], ["int"]);
  assert.deepEqual(resolved, ["con", "int"]);
  assert.deepEqual(missing, []);
});

test("resolveSlots: an unmade free-slot pick is reported missing, not silently dropped", () => {
  const { resolved, missing } = resolveSlots([["con"], ["str", "dex", "con", "int", "wis", "cha"]], []);
  assert.deepEqual(resolved, ["con"]);
  assert.deepEqual(missing, [1]);
});

test("resolveSlots: picks are consumed in order across only the free slots (fixed slots don't shift the index)", () => {
  // Lashunta's real shape: one fixed boost, one free boost, one free flaw --
  // three slots total but only two picks to make.
  const boosts = resolveSlots([["cha"], ["str", "dex", "con", "int", "wis", "cha"]], ["str"]);
  assert.deepEqual(boosts.resolved, ["cha", "str"]);
});

test("resolveSlots: an illegal pick (not in that slot's own set) throws rather than silently accepting it", () => {
  // Urog's real free-boost slot is restricted to int/wis, not all six --
  // "str" is a real ability but not a legal pick for this particular slot.
  assert.throws(() => resolveSlots([["con"], ["int", "wis"]], ["str"]), /not a legal choice/);
});

test("resolveSlots: an all-fixed slot list never consults picks at all, even if one is passed", () => {
  // Nothing to choose, so an extra/unused picks entry is simply ignored --
  // it is never validated against a slot that had no choice to make.
  const { resolved, missing } = resolveSlots([["con"]], ["cha"]);
  assert.deepEqual(resolved, ["con"]);
  assert.deepEqual(missing, []);
});

test("resolveSlots: resolved[slotIndex] stays correct when a LATER free slot is picked before an EARLIER one", () => {
  // Urog's real shape: one fixed boost, then two free boosts in a row.
  // picks[0] (slot 1) is still unmade; picks[1] (slot 2) is already "cha".
  const slots = [["con"], ["int", "wis"], ["str", "dex", "con", "int", "wis", "cha"]];
  const { resolved, missing } = resolveSlots(slots, [undefined, "cha"]);
  assert.equal(resolved[0], "con", "the fixed slot must still read correctly");
  assert.equal(resolved[1], undefined, "slot 1 has no pick yet -- must read as unresolved, not shifted");
  assert.equal(resolved[2], "cha", "slot 2's pick must appear at ITS OWN index, not compacted into slot 1's");
  assert.deepEqual(missing, [1]);
});

test("isAncestryChoiceComplete: false with no ancestry picked at all", () => {
  assert.equal(isAncestryChoiceComplete(null, [], []), false);
});

test("isAncestryChoiceComplete: true once every free boost/flaw slot has a pick", () => {
  const ancestry = { boosts: [["con"], ["str", "dex", "con", "int", "wis", "cha"]], flaws: [["cha"]] };
  assert.equal(isAncestryChoiceComplete(ancestry, [], []), false, "the free boost slot is still unpicked");
  assert.equal(isAncestryChoiceComplete(ancestry, ["wis"], []), true, "the flaw slot is fixed and needs no pick");
});

test("isAncestryChoiceComplete: an ancestry with zero flaws (a 'voluntary' ancestry) needs no flaw pick", () => {
  const human = {
    boosts: [
      ["str", "dex", "con", "int", "wis", "cha"],
      ["str", "dex", "con", "int", "wis", "cha"]
    ],
    flaws: []
  };
  assert.equal(isAncestryChoiceComplete(human, ["str"], []), false, "the second free boost is still unpicked");
  assert.equal(isAncestryChoiceComplete(human, ["str", "wis"], []), true);
});

test("resolveAncestryIngredients: produces the flat shape derive.mjs's deriveAbilityModifiers/deriveHP expect", () => {
  const dwarf = { boosts: [["con"], ["wis"], ["str", "dex", "con", "int", "wis", "cha"]], flaws: [["cha"]], hp: 10 };
  const ingredients = resolveAncestryIngredients(dwarf, ["int"], []);
  assert.deepEqual(ingredients, { ancestryBoosts: ["con", "wis", "int"], ancestryFlaws: ["cha"], ancestryHP: 10 });
});

test("resolveAncestryIngredients: throws rather than silently deriving from an incomplete choice", () => {
  const dwarf = { boosts: [["con"], ["wis"], ["str", "dex", "con", "int", "wis", "cha"]], flaws: [["cha"]], hp: 10 };
  assert.throws(() => resolveAncestryIngredients(dwarf, [], []), /not.*chosen/i);
});

test("groupAncestries: splits by the terrestrial tag, alphabetical within each group", () => {
  // Deliberately fed in NON-alphabetical input order, so this only passes if
  // groupAncestries actually sorts rather than just preserving input order
  // (found live 2026-09-09: the old version didn't sort at all, and this
  // same test's old fixture happened to never exercise that gap).
  const ancestries = [
    { id: "vesk", name: "Vesk", terrestrial: false },
    { id: "human", name: "Human", terrestrial: true },
    { id: "elf", name: "Elf", terrestrial: true },
    { id: "android", name: "Android", terrestrial: false }
  ];
  const { terrestrial, alienCoded } = groupAncestries(ancestries);
  assert.deepEqual(terrestrial.map((a) => a.id), ["elf", "human"], "Elf sorts before Human");
  assert.deepEqual(alienCoded.map((a) => a.id), ["android", "vesk"], "Android sorts before Vesk");
});

test("claimedAbilities: a fixed sibling slot's ability is claimed against a free slot too", () => {
  // Dwarf's real shape: fixed con, fixed wis, free among all six. The free
  // slot may not duplicate either fixed ability -- Player Core's "different
  // ability score" rule applies across an ancestry's own boosts as a set,
  // not just between two free slots.
  const slots = [["con"], ["wis"], ["str", "dex", "con", "int", "wis", "cha"]];
  const claimed = claimedAbilities(slots, [], 2);
  assert.deepEqual([...claimed].sort(), ["con", "wis"]);
});

test("claimedAbilities: a sibling free slot's already-made pick is claimed against another free slot", () => {
  const slots = [["str", "dex", "con", "int", "wis", "cha"], ["str", "dex", "con", "int", "wis", "cha"]];
  const claimed = claimedAbilities(slots, ["str"], 1);
  assert.deepEqual([...claimed], ["str"]);
});

test("claimedAbilities: an unresolved sibling free slot claims nothing yet", () => {
  const slots = [["str", "dex", "con", "int", "wis", "cha"], ["str", "dex", "con", "int", "wis", "cha"]];
  const claimed = claimedAbilities(slots, [], 1);
  assert.deepEqual([...claimed], []);
});

test("claimedAbilities: the slot's OWN current pick is never claimed against itself", () => {
  const slots = [["str", "dex", "con", "int", "wis", "cha"]];
  const claimed = claimedAbilities(slots, ["str"], 0);
  assert.deepEqual([...claimed], []);
});

test("filterAncestries: case-insensitive substring match on name; a blank query matches everything", () => {
  const ancestries = [{ id: "vesk", name: "Vesk" }, { id: "elf", name: "Elf" }, { id: "elebrian", name: "Elebrian" }];
  assert.deepEqual(filterAncestries(ancestries, "el").map((a) => a.id), ["elf", "elebrian"]);
  assert.deepEqual(filterAncestries(ancestries, "VESK").map((a) => a.id), ["vesk"]);
  assert.deepEqual(filterAncestries(ancestries, "").map((a) => a.id), ["vesk", "elf", "elebrian"]);
  assert.deepEqual(filterAncestries(ancestries, "   ").map((a) => a.id), ["vesk", "elf", "elebrian"]);
});

// ---------------------------------------------------------------------------
// The real authored catalogue, run through the real code.
//
// Everything above is fixtures agreeing with themselves. This is what catches
// the schema and this module drifting apart -- a boost slot shaped
// differently than expected passes every unit test above and breaks Page 2
// silently, on whichever ancestry happens to be malformed.
// ---------------------------------------------------------------------------

const CATALOGUE = JSON.parse(readFileSync(new URL("../data/campaign/ancestry-catalogue.json", import.meta.url), "utf8"));

test("the real ancestry catalogue has exactly 51 entries, each with a unique id", () => {
  assert.equal(CATALOGUE.ancestries.length, 51);
  assert.equal(new Set(CATALOGUE.ancestries.map((a) => a.id)).size, 51);
});

test("every real ancestry's boosts/flaws resolve cleanly once every free slot is given a legal pick", () => {
  for (const ancestry of CATALOGUE.ancestries) {
    const boostPicks = ancestry.boosts.filter((slot) => !isFixedSlot(slot)).map((slot) => slot[0]);
    const flawPicks = ancestry.flaws.filter((slot) => !isFixedSlot(slot)).map((slot) => slot[0]);
    assert.ok(isAncestryChoiceComplete(ancestry, boostPicks, flawPicks), `${ancestry.id} did not resolve to complete`);
    const ingredients = resolveAncestryIngredients(ancestry, boostPicks, flawPicks);
    assert.equal(ingredients.ancestryBoosts.length, ancestry.boosts.length);
    assert.equal(ingredients.ancestryFlaws.length, ancestry.flaws.length);
    assert.equal(ingredients.ancestryHP, ancestry.hp);
  }
});

test("exactly the five classic ancestries are tagged terrestrial", () => {
  const { terrestrial } = groupAncestries(CATALOGUE.ancestries);
  assert.deepEqual(
    terrestrial.map((a) => a.id).sort(),
    ["dwarf", "elf", "gnome", "halfling", "human"]
  );
});

test("data/schema/ancestry-catalogue.schema.json parses as valid JSON and matches the file it describes", () => {
  const schema = JSON.parse(readFileSync(new URL("../data/schema/ancestry-catalogue.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.$id, "ancestry-catalogue.schema.json");
  for (const required of schema.required) {
    assert.ok(required in CATALOGUE, `catalogue is missing required field "${required}"`);
  }
});

test("no other data file under data/campaign/ silently duplicates the ancestry catalogue's id", () => {
  const dir = new URL("../data/campaign/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "ancestry-catalogue.json")) {
    const doc = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
    assert.notEqual(doc.id, "ancestry-catalogue", `${file} reuses the ancestry-catalogue id`);
  }
});
