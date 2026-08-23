/**
 * Verifies the checked-in RAW-validation fixtures (tools/battle-simulator/data/raw-validation-fixtures/)
 * match a fresh, live re-derivation from the real pack data exactly — catches drift if either file
 * were ever hand-edited without re-running generate-raw-validation-fixtures.mjs, same discipline as
 * kid-fixtures.test.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens, toIngredients } from "../../tools/character-builder/extract-pregen.mjs";
import { deriveAbilityModifiers, deriveHP, deriveArmorClass } from "../../tools/character-builder/derive.mjs";
import { deriveStrikes, deriveSpells, deriveTransferVitality } from "../../tools/character-builder/build-combat-pregen.mjs";
import { findNPC, toCombatant } from "../../tools/pack-extractor/extract-npc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixturesDir = path.join(repoRoot, "tools", "battle-simulator", "data", "raw-validation-fixtures");

function readFixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

test("lunar-17.json: checked-in strikes/spell/heal-ability match a fresh live re-derivation exactly", () => {
  const fixture = readFixture("lunar-17.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Lunar-17");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Zero Knife", "Arc Pistol", "Semi-Auto Pistol"], mods));
  assert.deepEqual(fixture.spells, deriveSpells(ingredients, ["Eldritch Lance"], mods));
  assert.deepEqual(fixture.healAbilities, [deriveTransferVitality(ingredients)]);
  assert.equal(fixture.side, "party");
});

test("security-goon.json: checked-in strikes/reactions/actions match a fresh live re-extraction exactly", () => {
  const fixture = readFixture("security-goon.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
  const goon = findNPC(packDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.deepEqual(fixture.reactions, combatant.reactions);
  assert.deepEqual(fixture.actions, combatant.actions);
  assert.deepEqual(fixture.lore, combatant.lore);
  assert.equal(fixture.side, "opposition");
});

test("both fixtures are personnel-engine-shape-compatible: every strike/spell has the fields checkStrikeLegal/checkSpellAttackLegal actually read", () => {
  for (const name of ["lunar-17.json", "security-goon.json"]) {
    const fixture = readFixture(name);
    for (const strike of fixture.strikes) {
      assert.ok(strike.name && strike.strikeType && typeof strike.attackBonus === "number", `${name}: malformed strike ${JSON.stringify(strike)}`);
      assert.ok(Array.isArray(strike.damage) && strike.damage[0]?.dice, `${name}: strike "${strike.name}" has no usable damage`);
      if (strike.strikeType === "ranged") assert.ok(strike.rangeIncrement, `${name}: ranged strike "${strike.name}" has no rangeIncrement`);
    }
    for (const spell of fixture.spells ?? []) {
      assert.ok(spell.name && typeof spell.attackBonus === "number" && spell.range && spell.actions, `${name}: malformed spell ${JSON.stringify(spell)}`);
    }
  }
});
