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
import { deriveStrikes, deriveSpells, deriveSaveSpells, deriveTransferVitality, deriveSkillModifier } from "../../tools/character-builder/build-combat-pregen.mjs";
import { findNPC, toCombatant, deriveSpellAttacks, deriveConditionSave } from "../../tools/pack-extractor/extract-npc.mjs";

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
  assert.equal(fixture.saveAttacks, undefined, "her Incendiary Grenade is real but a burst-AREA effect (see design doc §21) — must never be wired as a single-target saveAttack again");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
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
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation);
  assert.equal(fixture.side, "opposition");
});

test("tapkey.json: checked-in strikes match a fresh live re-derivation exactly — Tapkey needed zero new derivation code, per design doc §21's research survey", () => {
  const fixture = readFixture("tapkey.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Tapkey");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Nano-edge Rapier", "Boom Pistol"], mods));
  assert.equal(fixture.saveAttacks, undefined, "her Incendiary Grenade is real but a burst-AREA effect (see design doc §21) — must never be wired as a single-target saveAttack again");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.intimidationModifier, 4, "her Cha modifier (+4) is the roster's highest — the untrained-Demoralize axis the design doc research specifically wanted a second data point for");
  assert.equal(fixture.side, "party");
});

test("xenowarden-greenhorn.json: checked-in strikes/spell match a fresh live re-extraction exactly — the project's first NPC attack-roll spell", () => {
  const fixture = readFixture("xenowarden-greenhorn.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const xenowarden = findNPC(packDir, "Xenowarden Greenhorn");
  const combatant = toCombatant(xenowarden, { strikeNames: ["Arc Pistol", "Nano-edge Rapier"] });

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.deepEqual(fixture.spells, deriveSpellAttacks(xenowarden, ["Gouging Claw"]));
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation ?? null);
  assert.equal(fixture.intimidationModifier, null, "Intimidation genuinely isn't one of her 3 listed skills — must stay null, not an invented untrained number");
  assert.equal(fixture.side, "opposition");
});

test("bennit.json: checked-in strikes/saveAttack (spell) match a fresh live re-derivation exactly — this project's first save-based SPELL", () => {
  const fixture = readFixture("bennit.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "“Nitpick” Bennit");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Laser Pistol", "Semi-Auto Pistol"], mods));
  assert.deepEqual(fixture.saveAttacks, deriveSaveSpells(ingredients, ["Thunderstrike"], mods));
  assert.equal(fixture.saveAttacks[0].usesRemaining, 3, "her real spell-slot count, not unlimited");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.side, "party");
});

test("erabryth.json: checked-in strikes/conditionSave match a fresh live re-extraction exactly — this project's first condition-only save action", () => {
  const fixture = readFixture("erabryth.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const erabryth = findNPC(packDir, "Erabryth");
  const combatant = toCombatant(erabryth, { strikeNames: ["Ribbon", "Fist", "Light Ray"] });
  const conditionSaves = [deriveConditionSave(erabryth, {
    name: "Forced Reflection", saveType: "will", range: 60,
    outcomes: {
      criticalSuccess: {},
      success: { frightened: 1 },
      failure: { stunnedRounds: 1, frightened: 1 },
      criticalFailure: { stunnedRounds: 2, frightened: 2 }
    }
  })];

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.deepEqual(fixture.conditionSaves, conditionSaves);
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation ?? null);
  assert.equal(fixture.intimidationModifier, 4, "Intimidation IS one of her real listed skills, unlike Xenowarden Greenhorn's");
  assert.equal(fixture.side, "opposition");
});

test("all six fixtures are personnel-engine-shape-compatible: every strike/spell has the fields checkStrikeLegal/checkSpellAttackLegal actually read", () => {
  for (const name of ["lunar-17.json", "security-goon.json", "tapkey.json", "xenowarden-greenhorn.json", "bennit.json", "erabryth.json"]) {
    const fixture = readFixture(name);
    for (const strike of fixture.strikes) {
      assert.ok(strike.name && strike.strikeType && typeof strike.attackBonus === "number", `${name}: malformed strike ${JSON.stringify(strike)}`);
      assert.ok(Array.isArray(strike.damage) && strike.damage[0]?.dice, `${name}: strike "${strike.name}" has no usable damage`);
      if (strike.strikeType === "ranged") assert.ok(strike.rangeIncrement, `${name}: ranged strike "${strike.name}" has no rangeIncrement`);
    }
    for (const spell of fixture.spells ?? []) {
      // range===null is a REAL, legal value (touch/adjacent-only, e.g. Gouging Claw) — checkSpellRange
      // falls back to FEET_PER_SQUARE for it, so it must not be rejected by a plain truthiness check.
      const rangeOk = spell.range === null || typeof spell.range === "number";
      assert.ok(spell.name && typeof spell.attackBonus === "number" && rangeOk && spell.actions, `${name}: malformed spell ${JSON.stringify(spell)}`);
    }
  }
});
