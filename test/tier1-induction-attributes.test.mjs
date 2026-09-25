// Tier 1 — the induction terminal's Page 5 free-ability-boost resolution.
//
// Pure logic only: the four free boosts every character gets at chargen
// Step 6. No Foundry. The generic slot-resolution mechanics themselves are
// already covered by test/tier1-induction-ancestry.test.mjs against the
// shared core/boost-slots.mjs -- this file only tests what's specific to
// the four-free-boosts shape.

import { test } from "node:test";
import assert from "node:assert/strict";

import { claimedAbilities } from "../module/blank-inheritance/scripts/core/boost-slots.mjs";
import {
  FREE_BOOST_SLOTS, isFreeBoostsComplete, resolveFreeBoosts, toggleFreeBoost, abilityTally
} from "../module/blank-inheritance/scripts/core/induction-attributes.mjs";

test("FREE_BOOST_SLOTS is four identical, fully-open slots -- every ability legal in every slot", () => {
  assert.equal(FREE_BOOST_SLOTS.length, 4);
  for (const slot of FREE_BOOST_SLOTS) {
    assert.deepEqual([...slot].sort(), ["cha", "con", "dex", "int", "str", "wis"]);
  }
});

test("isFreeBoostsComplete: false until all four slots have a pick", () => {
  assert.equal(isFreeBoostsComplete([]), false);
  assert.equal(isFreeBoostsComplete(["str"]), false);
  assert.equal(isFreeBoostsComplete(["str", "dex", "con"]), false);
  assert.equal(isFreeBoostsComplete(["str", "dex", "con", "int"]), true);
});

test("resolveFreeBoosts: produces the flat shape derive.mjs's deriveAbilityModifiers expects (freeBoosts)", () => {
  assert.deepEqual(resolveFreeBoosts(["str", "dex", "con", "wis"]), { freeBoosts: ["str", "dex", "con", "wis"] });
});

test("resolveFreeBoosts: throws rather than silently deriving from an incomplete choice", () => {
  assert.throws(() => resolveFreeBoosts(["str", "dex"]), /not every.*chosen/i);
});

test("claimedAbilities: the four free slots refuse a duplicate among THEMSELVES (Player Core's 'different ability at the same time' rule)", () => {
  // Three slots already resolved to str/dex/con -- the fourth (index 3)
  // must not be allowed to repeat any of them, since all four are granted
  // simultaneously at Step 6.
  const claimed = claimedAbilities(FREE_BOOST_SLOTS, ["str", "dex", "con"], 3);
  assert.deepEqual([...claimed].sort(), ["con", "dex", "str"]);
});

test("claimedAbilities: a free boost CAN legally repeat an ability ancestry/background/class already boosted -- that's a separate step, not checked here", () => {
  // This module only resolves the four slots against EACH OTHER. Whether
  // "cha" was already boosted by ancestry is Page 9's concern (derive.mjs's
  // own level-1 +4 clamp), not something core/induction-attributes.mjs
  // enforces -- confirmed by there being no ancestry/background/class input
  // to any function in this file at all.
  const claimed = claimedAbilities(FREE_BOOST_SLOTS, [], 0);
  assert.deepEqual([...claimed], []);
});

// --- The one-row toggle and the running tally (UI pass, 2026-09-25) --------------------------------

test("toggleFreeBoost: a click picks an attribute, a second click on it unpicks it", () => {
  assert.deepEqual(toggleFreeBoost([], "str"), ["str"]);
  assert.deepEqual(toggleFreeBoost(["str", "dex"], "str"), ["dex"]);
});

test("toggleFreeBoost: a fifth pick is refused, so the four always differ and never exceed four", () => {
  const four = ["str", "dex", "con", "int"];
  assert.deepEqual(toggleFreeBoost(four, "wis"), four);
  assert.equal(isFreeBoostsComplete(four), true);
});

test("toggleFreeBoost: compacts the gaps an older four-row picker could leave, and ignores anything that isn't an attribute", () => {
  assert.deepEqual(toggleFreeBoost([null, "dex", undefined], "wis"), ["dex", "wis"]);
  assert.deepEqual(toggleFreeBoost(["dex"], "luck"), ["dex"]);
  assert.deepEqual(toggleFreeBoost(undefined, "cha"), ["cha"]);
});

test("toggleFreeBoost: never mutates the array it was given", () => {
  const picks = ["str"];
  toggleFreeBoost(picks, "dex");
  toggleFreeBoost(picks, "str");
  assert.deepEqual(picks, ["str"]);
});

test("abilityTally: one row per attribute, in the standard order, summing every source", () => {
  const rows = abilityTally({
    ancestryBoosts: ["con", "str", "dex"], ancestryFlaws: ["wis"],
    backgroundBoosts: ["dex", "con"], classKey: "con", freeBoosts: ["str", "dex", "int", "wis"]
  });
  assert.deepEqual(rows.map((r) => r.ability), ["str", "dex", "con", "int", "wis", "cha"]);
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.ability, r.mod])), { str: 2, dex: 3, con: 3, int: 1, wis: 0, cha: 0 });
  assert.deepEqual(rows.find((r) => r.ability === "wis").parts, [{ from: "flaw", delta: -1 }, { from: "free", delta: 1 }]);
});

test("abilityTally: level-1 sources touch an attribute once each, so the most any can reach is +4", () => {
  const rows = abilityTally({ ancestryBoosts: ["str"], backgroundBoosts: ["str"], classKey: "str", freeBoosts: ["str"] });
  assert.equal(rows.find((r) => r.ability === "str").mod, 4);
});

test("abilityTally: a half-made choice (nulls, nothing yet) still gives six rows at zero, never a throw", () => {
  const rows = abilityTally({ ancestryBoosts: [null], freeBoosts: [] });
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => r.mod === 0 && r.parts.length === 0));
  assert.equal(abilityTally().length, 6);
});
