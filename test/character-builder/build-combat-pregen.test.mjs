/**
 * End-to-end correctness for build-combat-pregen.mjs (design doc §19 Phase 2), against Lunar-17's
 * REAL raw pack data — not a hand-built stand-in. Every asserted number here was independently
 * cross-checked by directly reading her real raw JSON before this code was written (design doc
 * §19's Phase 2 section records the full trail); this test is what proves the CODE reproduces
 * those same numbers, not just that the formulas in isolation are correct (derive.test.mjs already
 * covers that).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens, toIngredients } from "../../tools/character-builder/extract-pregen.mjs";
import { deriveAbilityModifiers } from "../../tools/character-builder/derive.mjs";
import { deriveStrikes, deriveSpells, deriveTransferVitality, deriveSaveAttacks, deriveSaveSpells, deriveSkillModifier } from "../../tools/character-builder/build-combat-pregen.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");

function lunar17Ingredients() {
  const pregens = listLevel1Pregens(packDir);
  const lunar17 = pregens.find((p) => p.name === "Lunar-17");
  assert.ok(lunar17, "expected a level-1 pregen named \"Lunar-17\" in paizo-pregens");
  return toIngredients(lunar17);
}

test("Lunar-17's real ability modifiers match what design doc §19's own research recorded (str +0, dex +3, con +1, int +1, wis +4, cha +0)", () => {
  const mods = deriveAbilityModifiers(lunar17Ingredients());
  assert.deepEqual(mods, { str: 0, dex: 3, con: 1, int: 1, wis: 4, cha: 0 });
});

test("deriveStrikes: Zero Knife (melee, finesse) gets attack +6 (trained + Dex, finesse chooses the better ability) and damage +0 (melee always uses Str, which is +0 here)", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  const [zeroKnife] = deriveStrikes(ingredients, ["Zero Knife"], mods);
  assert.equal(zeroKnife.strikeType, "melee");
  assert.equal(zeroKnife.attackBonus, 6);
  assert.deepEqual(zeroKnife.damage, [{ dice: "1d4", bonus: 0, damageType: "cold" }]);
  assert.ok(zeroKnife.traits.includes("finesse"));
  assert.equal(zeroKnife.rangeIncrement, undefined, "a melee Strike must not carry a range increment field at all");
});

test("deriveStrikes: Arc Pistol and Semi-Auto Pistol (ranged) both get attack +6 (trained + Dex) and damage +0 (no thrown/propulsive trait)", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  const [arcPistol, semiAuto] = deriveStrikes(ingredients, ["Arc Pistol", "Semi-Auto Pistol"], mods);

  assert.equal(arcPistol.strikeType, "ranged");
  assert.equal(arcPistol.attackBonus, 6);
  assert.equal(arcPistol.rangeIncrement, 30);
  assert.deepEqual(arcPistol.damage, [{ dice: "1d4", bonus: 0, damageType: "electricity" }]);

  assert.equal(semiAuto.strikeType, "ranged");
  assert.equal(semiAuto.attackBonus, 6);
  assert.equal(semiAuto.rangeIncrement, 60);
  assert.deepEqual(semiAuto.damage, [{ dice: "1d6", bonus: 0, damageType: "piercing" }]);
});

test("deriveStrikes: throws a clear error for a weapon name that doesn't exist, rather than silently returning nothing", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  assert.throws(() => deriveStrikes(ingredients, ["Not A Real Weapon"], mods), /No weapon named/);
});

test("deriveSpells: Eldritch Lance gets attack +7 (trained + Wis), range 30, 2 actions, real 2d6 mental damage — matches an independent read of her real raw spell/spellcastingEntry data exactly", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  const [eldritchLance] = deriveSpells(ingredients, ["Eldritch Lance"], mods);
  assert.equal(eldritchLance.attackBonus, 7);
  assert.equal(eldritchLance.range, 30);
  assert.equal(eldritchLance.actions, 2);
  assert.deepEqual(eldritchLance.damage, [{ dice: "2d6", bonus: 0, damageType: "mental" }]);
  assert.ok(eldritchLance.traits.includes("attack"));
});

test("deriveSpells: refuses a non-attack-roll spell rather than silently treating it as one (this engine has no save-based spell mechanism)", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  const nonAttackSpell = { name: "Fake Save Spell", system: { traits: { value: ["manipulate"] } } };
  ingredients.spells = [...ingredients.spells, nonAttackSpell];
  assert.throws(() => deriveSpells(ingredients, ["Fake Save Spell"], mods), /only supports attack-roll spells/);
});

test("deriveTransferVitality: real 1-action, 60ft heal ability, granted via Lunar-17's actual Vitality Network feat (confirmed present on her real actor)", () => {
  const ingredients = lunar17Ingredients();
  const heal = deriveTransferVitality(ingredients);
  assert.equal(heal.name, "Transfer Vitality");
  assert.equal(heal.actions, 1);
  assert.equal(heal.range, 60);
  assert.equal(heal.healingAmount, 10);
});

test("all three weapons' category (simple) is trained per the Mystic class's real system.attacks table — proficiency isn't a guess", () => {
  const ingredients = lunar17Ingredients();
  assert.equal(ingredients.classAttacks.simple, 1, "expected Mystic's real class data to show simple weapons as trained (rank 1)");
});

// ---------------------------------------------------------------------------
// deriveSaveAttacks / deriveSkillModifier — the skill-actions-in-combat expansion (design doc §19)
// ---------------------------------------------------------------------------

test("deriveSaveAttacks: her real Incendiary Grenade — DC 17 (her real Class DC, matching the raw data's own @Check[reflex|against:class]), real 70ft range, real 1d8 fire damage", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  const [grenade] = deriveSaveAttacks(ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref" }], mods);
  assert.equal(grenade.saveType, "ref");
  assert.equal(grenade.dc, 17, "her Class DC (Mystic, wis+4, trained, level 1): 10 + 3 + 4");
  assert.equal(grenade.range, 70);
  assert.deepEqual(grenade.damage, [{ dice: "1d8", bonus: 0, damageType: "fire" }]);
  assert.ok(grenade.traits.includes("grenade"));
  assert.equal(grenade.usesRemaining, 1, "her real sheet carries exactly system.quantity:1 of this consumable — not infinite");
});

test("deriveSaveAttacks: throws a clear error for a weapon name that doesn't exist", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  assert.throws(() => deriveSaveAttacks(ingredients, [{ name: "Not A Real Grenade", saveType: "ref" }], mods), /No weapon named/);
});

test("deriveSkillModifier: Lunar-17's real Intimidation is untrained (+0) — her cha modifier is +0 and intimidation isn't in her real skillRanks at all", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  assert.equal(deriveSkillModifier(ingredients, "intimidation", mods), 0);
});

test("deriveSkillModifier: a real TRAINED skill (Stealth, rank 1 in her real skillRanks) comes back correctly proficiency-bonused", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  // trained (level 1 -> +3 proficiency) + her real dex modifier (+3, confirmed in derive.test.mjs's own worked example)
  assert.equal(deriveSkillModifier(ingredients, "stealth", mods), 6);
});

test("deriveSkillModifier: throws for a name that isn't one of the 18 real SF2E skills", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  assert.throws(() => deriveSkillModifier(ingredients, "not-a-real-skill", mods), /not one of the 18 real SF2E skills/);
});

// ---------------------------------------------------------------------------
// deriveSaveSpells (design doc §22) — against "Nitpick" Bennit's REAL raw pack data (a different
// pregen than the rest of this file, on purpose: Thunderstrike is her real spell, not Lunar-17's).
// ---------------------------------------------------------------------------

function bennitIngredients() {
  const pregens = listLevel1Pregens(packDir);
  const bennit = pregens.find((p) => p.name === "“Nitpick” Bennit");
  assert.ok(bennit, "expected a level-1 pregen named “Nitpick” Bennit in paizo-pregens");
  return toIngredients(bennit);
}

test("deriveSaveSpells: Bennit's real Thunderstrike — DC from her real spell DC (not Class DC), real 120ft range, real TWO-entry damage (1d12 electricity + 1d4 sonic), real 3-slot usesRemaining", () => {
  const ingredients = bennitIngredients();
  const mods = deriveAbilityModifiers(ingredients);
  const [thunderstrike] = deriveSaveSpells(ingredients, ["Thunderstrike"], mods);
  assert.equal(thunderstrike.saveType, "ref", "her real system.defense.save.statistic is \"reflex\", correctly mapped to this project's own \"ref\" convention");
  assert.equal(thunderstrike.dc, 17);
  assert.equal(thunderstrike.range, 120);
  assert.equal(thunderstrike.actions, 2);
  assert.deepEqual(thunderstrike.damage, [
    { dice: "1d12", bonus: 0, damageType: "electricity" },
    { dice: "1d4", bonus: 0, damageType: "sonic" }
  ]);
  assert.equal(thunderstrike.usesRemaining, 3, "her real system.slots.slot1.max — not an invented number, and NOT unlimited");
});

test("deriveSaveSpells: throws a clear error for a spell name that doesn't exist", () => {
  const ingredients = bennitIngredients();
  const mods = deriveAbilityModifiers(ingredients);
  assert.throws(() => deriveSaveSpells(ingredients, ["Not A Real Spell"], mods), /No spell named/);
});

test("deriveSaveSpells: throws for a real spell that has no basic save at all (Sure Strike is a self-buff, no defense.save field)", () => {
  const ingredients = bennitIngredients();
  const mods = deriveAbilityModifiers(ingredients);
  assert.throws(() => deriveSaveSpells(ingredients, ["Sure Strike"], mods), /not a basic-save spell/);
});
