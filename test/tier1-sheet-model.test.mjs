// Tier 1 — pure shaping for the full character-sheet console surface
// (module/blank-inheritance/scripts/core/sheet-model.mjs). No Foundry.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatMod,
  proficiencyDots,
  modToKnobFrame,
  abilityRows,
  hpStatus,
  defenseBlock,
  saveRows,
  resourceRows,
  conditionRows,
  strikeRows,
  spellcastingBlocks,
  hasAnySpell,
  nonEmptySpellBlocks,
  inventoryGroups,
  featGroups,
  overviewModel
} from "../module/blank-inheritance/scripts/core/sheet-model.mjs";

test("formatMod signs every value, including zero", () => {
  assert.equal(formatMod(3), "+3");
  assert.equal(formatMod(-1), "-1");
  assert.equal(formatMod(0), "+0");
  assert.equal(formatMod(undefined), "+0");
});

test("proficiencyDots fills exactly `rank` of 4 dots and clamps out-of-range input", () => {
  assert.deepEqual(proficiencyDots(0).dots, [false, false, false, false]);
  assert.deepEqual(proficiencyDots(2).dots, [true, true, false, false]);
  assert.deepEqual(proficiencyDots(4).dots, [true, true, true, true]);
  assert.equal(proficiencyDots(2).rankLabel, "Expert");
  assert.equal(proficiencyDots(9).rank, 4, "ranks above legendary clamp rather than overflow the dots");
  assert.equal(proficiencyDots(-1).rank, 0, "negative ranks clamp to untrained rather than throwing");
});

test("abilityRows returns all six abilities in a fixed order regardless of input key order", () => {
  const rows = abilityRows({ cha: { mod: 4 }, str: { mod: 0 }, dex: { mod: 2 } });
  assert.deepEqual(rows.map((r) => r.key), ["str", "dex", "con", "int", "wis", "cha"]);
  assert.equal(rows[0].modLabel, "+0");
  assert.equal(rows.find((r) => r.key === "cha").modLabel, "+4");
  assert.equal(rows.find((r) => r.key === "con").mod, 0, "an ability missing from input reads as 0, not undefined");
  assert.ok(Number.isInteger(rows[0].frame), "every row carries a precomputed knob frame, the template never maps mod->frame itself");
});

test("modToKnobFrame spans the full 0-127 sweep across the realistic -5..+9 modifier range and clamps outliers", () => {
  assert.equal(modToKnobFrame(-5), 0, "the worst realistic modifier sits at the dial's zero frame");
  assert.equal(modToKnobFrame(9), 127, "the best realistic modifier sits at the dial's last frame");
  assert.equal(modToKnobFrame(2), modToKnobFrame(2), "deterministic for the same input");
  assert.equal(modToKnobFrame(-99), 0, "a modifier far below the realistic floor clamps rather than going negative");
  assert.equal(modToKnobFrame(99), 127, "a modifier far above the realistic ceiling clamps rather than overflowing the strip");
  const mid = modToKnobFrame(2); // roughly the middle of -5..9
  assert.ok(mid > 40 && mid < 90, "a middling modifier lands roughly mid-dial, not pinned to an end");
});

test("hpStatus tiers correctly at the real boundaries, and temp HP passes through untouched", () => {
  assert.equal(hpStatus({ value: 16, max: 16 }).tier, "ok");
  assert.equal(hpStatus({ value: 8, max: 16 }).tier, "hurt", "exactly half is hurt, not ok");
  assert.equal(hpStatus({ value: 9, max: 16 }).tier, "ok", "just above half stays ok");
  assert.equal(hpStatus({ value: 4, max: 16 }).tier, "critical", "exactly a quarter is critical");
  assert.equal(hpStatus({ value: 0, max: 16 }).tier, "down");
  assert.equal(hpStatus({ value: -3, max: 16 }).tier, "down", "negative HP still reads as down, not a crash");
  assert.equal(hpStatus({ value: 10, max: 16, temp: 5 }).temp, 5);
});

test("defenseBlock formats perception's signed modifier without mutating the raw DC", () => {
  const block = defenseBlock({ ac: { value: 16 }, perception: { value: 4, dc: 14 }, speed: { value: 25 } });
  assert.equal(block.perception.valueLabel, "+4");
  assert.equal(block.perception.dc, 14);
  assert.equal(block.ac.value, 16);
  assert.equal(block.speed.value, 25);
});

test("saveRows always returns exactly fortitude/reflex/will in that order", () => {
  const rows = saveRows({ will: { value: 6, rank: 2 }, fortitude: { value: 3, rank: 1 } });
  assert.deepEqual(rows.map((r) => r.slug), ["fortitude", "reflex", "will"]);
  assert.equal(rows[1].value, 0, "a missing save (reflex here) reads as +0 rather than being omitted");
  assert.equal(rows[2].valueLabel, "+6");
});

test("saveRows keeps the save's own name — regression for a real bug found live: proficiencyDots' rank name (e.g. 'Trained') was silently overwriting it via object-spread order", () => {
  const rows = saveRows({ fortitude: { value: 3, rank: 1, label: "Fortitude" } });
  assert.equal(rows[0].label, "Fortitude", "the save's own name must survive spreading proficiencyDots() on top of it");
  assert.equal(rows[0].rankLabel, "Trained", "the rank name is still available, just under its own key");
});

test("resourceRows only includes a resource the actor actually has", () => {
  assert.deepEqual(resourceRows({}).map((r) => r.id), []);
  assert.deepEqual(resourceRows({ heroPoints: { value: 1, max: 3 } }).map((r) => r.id), ["hero-points"]);
  const full = resourceRows({ heroPoints: { value: 1, max: 3 }, focus: { value: 2, max: 3 }, investiture: { value: 0, max: 10 } });
  assert.deepEqual(full.map((r) => r.id), ["hero-points", "focus", "investiture"]);
  const heroRow = full.find((r) => r.id === "hero-points");
  assert.ok(Math.abs(heroRow.pct - 1 / 3) < 1e-9, "pct is precomputed so the template never has to do division");
});

test("conditionRows preserves a numbered condition's value and leaves an unnumbered one null", () => {
  const rows = conditionRows([{ slug: "stunned", label: "Stunned", value: 2 }, { slug: "off-guard", label: "Off-Guard" }]);
  assert.equal(rows[0].value, 2);
  assert.equal(rows[1].value, null);
});

test("strikeRows assigns a stable actionIndex/variantIndex pair a click can round-trip", () => {
  const rows = strikeRows([
    { label: "Unarmed", slug: "fist", variants: [{ label: "+5" }, { label: "+1 (MAP -4)" }] },
    { label: "Knife", slug: "knife", ready: false, traits: [{ name: "agile" }], variants: [{ label: "+5" }] }
  ]);
  assert.equal(rows[0].actionIndex, 0);
  assert.deepEqual(rows[0].variants.map((v) => v.variantIndex), [0, 1]);
  assert.equal(rows[1].actionIndex, 1);
  assert.equal(rows[1].ready, false);
  assert.deepEqual(rows[1].traits, ["agile"], "a trait object with a .name unwraps to a plain string");
});

test("spellcastingBlocks keeps entry/group/spell indices in lockstep for a multi-entry caster", () => {
  const blocks = spellcastingBlocks([
    { name: "Divine", tradition: "divine", groups: [{ id: "cantrips", label: "Cantrips", active: [{ name: "Guidance" }, null] }] }
  ]);
  assert.equal(blocks[0].entryIndex, 0);
  assert.equal(blocks[0].groups[0].spells.length, 1, "a null active-slot entry is dropped, not rendered as a blank spell");
  assert.deepEqual(blocks[0].groups[0].spells[0], { entryIndex: 0, spellIndex: 0, name: "Guidance", expended: false });
});

test("hasAnySpell is false for a non-caster's lone empty Rituals entry — regression for a real bug found live: a PC with no real caster class still shows one spellcasting block, and blocks.length alone said 'has spells'", () => {
  const blocks = spellcastingBlocks([{ name: "Rituals", groups: [{ id: "rituals", label: "Rituals", active: [] }] }]);
  assert.equal(hasAnySpell(blocks), false);
});

test("hasAnySpell is true as soon as any group anywhere has a real spell", () => {
  const blocks = spellcastingBlocks([
    { name: "Rituals", groups: [{ id: "rituals", label: "Rituals", active: [] }] },
    { name: "Divine", groups: [{ id: "cantrips", label: "Cantrips", active: [{ name: "Guidance" }] }] }
  ]);
  assert.equal(hasAnySpell(blocks), true);
});

test("hasAnySpell on no casting entries at all", () => {
  assert.equal(hasAnySpell([]), false);
});

test("nonEmptySpellBlocks drops a bare Rituals-style entry but keeps every entry with a real spell", () => {
  const blocks = spellcastingBlocks([
    { name: "Rituals", groups: [{ id: "rituals", label: "Rituals", active: [] }] },
    { name: "Divine Spontaneous", groups: [{ id: "cantrips", label: "Cantrips", active: [{ name: "Guidance" }] }] }
  ]);
  const kept = nonEmptySpellBlocks(blocks);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].name, "Divine Spontaneous");
});

test("inventoryGroups sorts known types into the fixed reading order and alphabetizes within a type", () => {
  const groups = inventoryGroups([
    { id: "1", type: "treasure", name: "Credstick" },
    { id: "2", type: "weapon", name: "Zephyr Blade" },
    { id: "3", type: "weapon", name: "Ares Pistol" }
  ]);
  assert.deepEqual(groups.map((g) => g.type), ["weapon", "treasure"], "weapon sorts before treasure per the fixed order, not input order");
  assert.deepEqual(groups[0].items.map((i) => i.name), ["Ares Pistol", "Zephyr Blade"]);
});

test("inventoryGroups precomputes showQuantity so the template never has to compare numbers", () => {
  const groups = inventoryGroups([
    { id: "1", type: "ammo", name: "Rounds", quantity: 20 },
    { id: "2", type: "weapon", name: "Knife", quantity: 1 }
  ]);
  assert.equal(groups.find((g) => g.type === "ammo").items[0].showQuantity, true);
  assert.equal(groups.find((g) => g.type === "weapon").items[0].showQuantity, false);
});

test("inventoryGroups still surfaces an unrecognized item type rather than silently dropping it", () => {
  const groups = inventoryGroups([{ id: "1", type: "some-future-type", name: "Mystery Thing" }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "some-future-type");
});

test("featGroups labels ancestryfeature/classfeature properly — regression for a real bug found live: an unmapped real sf2e category (a shirren's automatically-granted 'Limited Telepathy') rendered as the literal raw string 'ancestryfeature' instead of a real heading", () => {
  const groups = featGroups([
    { id: "1", featType: "ancestryfeature", name: "Limited Telepathy" },
    { id: "2", featType: "classfeature", name: "Connection" }
  ]);
  assert.equal(groups.find((g) => g.type === "ancestryfeature").label, "Ancestry Features");
  assert.equal(groups.find((g) => g.type === "classfeature").label, "Class Features");
});

test("featGroups groups by featType and alphabetizes each group", () => {
  const groups = featGroups([
    { id: "1", featType: "class", name: "Watch Out" },
    { id: "2", featType: "class", name: "Guns Blazing" },
    { id: "3", featType: "ancestry", name: "Natural Ambition" }
  ]);
  assert.deepEqual(groups.map((g) => g.type), ["ancestry", "class"]);
  assert.deepEqual(groups.find((g) => g.type === "class").items.map((i) => i.name), ["Guns Blazing", "Watch Out"]);
});

test("overviewModel assembles every gauge-shaped block from one raw actor snapshot", () => {
  const model = overviewModel({
    name: "Navasi",
    level: 1,
    abilities: { dex: { mod: 2 } },
    hp: { value: 16, max: 16 },
    ac: { value: 16 },
    perception: { value: 4, dc: 14 },
    speed: { value: 25 },
    saves: { fortitude: { value: 3, rank: 1 } },
    heroPoints: { value: 1, max: 3 },
    conditions: []
  });
  assert.equal(model.identity.name, "Navasi");
  assert.equal(model.hp.tier, "ok");
  assert.equal(model.defenses.ac.value, 16);
  assert.equal(model.abilities.find((a) => a.key === "dex").modLabel, "+2");
  assert.equal(model.saves[0].valueLabel, "+3");
  assert.deepEqual(model.resources.map((r) => r.id), ["hero-points"]);
});
