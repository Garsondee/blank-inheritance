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
import { deriveStrikes, deriveSpells, deriveTransferVitality, deriveHealSpellVariants, deriveSaveAttacks, deriveSaveSpells, deriveSkillModifier } from "../../tools/character-builder/build-combat-pregen.mjs";

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

// GH #69 REGRESSION: an earlier version of deriveSpells lacked a cantrip check entirely and would
// have derived usesRemaining:3 for Eldritch Lance (her real Occult Spontaneous Spells entry has a
// genuinely populated slots.slot1.max:3) — capping the AI's signature attack spell at 3 casts per
// encounter, when the correct SF2E-legal number is unlimited (Eldritch Lance is a real cantrip,
// castable "at will, any number of times per day", Player Core pg. 283). This is the one test that
// would have caught it: asserting the WRONG number is exactly as easy to write as the right one, so
// this checks the cantrip trait is really present on the real data AND that atWill/no-limit is what
// actually comes out, not just that SOME value comes out.
test("deriveSpells: Eldritch Lance is a real cantrip and MUST be atWill with no usesRemaining, never a slot-based limit", () => {
  const ingredients = lunar17Ingredients();
  const mods = deriveAbilityModifiers(ingredients);
  const [eldritchLance] = deriveSpells(ingredients, ["Eldritch Lance"], mods);
  assert.ok(eldritchLance.traits.includes("cantrip"), "sanity: Eldritch Lance must really be a cantrip in the raw data for this test to mean anything");
  assert.equal(eldritchLance.atWill, true);
  assert.equal(eldritchLance.usesRemaining, undefined, "a cantrip must never carry a slot-based usesRemaining, regardless of what its own spellcastingEntry's slots happen to contain");
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

// GH #55: usesRemaining must stay undefined here, deliberately — the real limit is the Vitality
// Network feat's own regenerating HP-pool, not a per-day slot count, so there is no real structured
// field for this function to derive it from (unlike deriveSaveAttacks' grenade quantity or
// deriveSaveSpells' Thunderstrike slots, both tested above). A hand-authored approximation belongs
// at the fixture-construction site (lunar-17.json's own notes field), never invented here — this
// test is the same "assert the deliberate absence, not just its accidental omission" pattern as the
// cantrip usesRemaining tests above, applied to a different kind of real-but-underivable limit.
test("deriveTransferVitality: never invents a usesRemaining — the real limit is a regenerating resource pool, not a derivable per-day count", () => {
  const ingredients = lunar17Ingredients();
  const heal = deriveTransferVitality(ingredients);
  assert.equal(heal.usesRemaining, undefined, "no real structured field for Transfer Vitality's limit exists in the raw data — this function must not guess one");
});

// GH #60, design doc §60 Part 1 — Heal really is on Lunar-17's own real raw spell list (confirmed
// directly via a LevelDB read before this code was written, same discipline as every other real
// number in this file), governed by the SAME "Occult Spontaneous Spells" entry as Eldritch Lance.
test("deriveHealSpellVariants: Heal's real touch variant — 1 action, 1d8, no range field at all (touch/adjacent per checkSpellRange's own default), rank-1 slot", () => {
  const ingredients = lunar17Ingredients();
  const [touch] = deriveHealSpellVariants(ingredients, "Heal");
  assert.equal(touch.name, "Heal (touch)");
  assert.equal(touch.actions, 1);
  assert.equal(touch.healingFormula, "1d8");
  assert.equal(touch.range, undefined, "a touch-range variant must omit range entirely, not set it to 0 — see design doc §60's own Part 1 Decision 2 note");
  assert.equal(touch.slotRank, 1);
});

test("deriveHealSpellVariants: Heal's real 30ft variant — 2 actions, 1d8+8 (the living-target bonus, NOT the plain 1d8 the vs.-Undead overlay gets), rank-1 slot", () => {
  const ingredients = lunar17Ingredients();
  const [, ranged] = deriveHealSpellVariants(ingredients, "Heal");
  assert.equal(ranged.name, "Heal (30ft)");
  assert.equal(ranged.actions, 2);
  assert.equal(ranged.healingFormula, "1d8+8");
  assert.equal(ranged.range, 30);
  assert.equal(ranged.slotRank, 1);
});

test("deriveHealSpellVariants: both variants carry the SAME slotRank — the whole point of Decision 3's shared pool", () => {
  const ingredients = lunar17Ingredients();
  const [touch, ranged] = deriveHealSpellVariants(ingredients, "Heal");
  assert.equal(touch.slotRank, ranged.slotRank);
});

// GH #60, design doc §60 Part 1b — Heal's real 3-action self-centered emanation.
test("deriveHealSpellVariants: Heal's real emanation variant — 3 actions, plain 1d8 (NOT the 30ft variant's +8 bonus — this overlay never overrides damage), self-centered, 30ft radius, SAME shared slot", () => {
  const ingredients = lunar17Ingredients();
  const [touch, , emanation] = deriveHealSpellVariants(ingredients, "Heal");
  assert.equal(emanation.name, "Heal (emanation)");
  assert.equal(emanation.actions, 3);
  assert.equal(emanation.healingFormula, "1d8", "must inherit the BASE spell's own formula, not the 2-action overlay's +8 bonus");
  assert.equal(emanation.areaOrigin, "self");
  assert.equal(emanation.radius, 30);
  assert.equal(emanation.range, undefined, "a self-centered origin has no range field at all — it always targets the caster's own square");
  assert.equal(emanation.slotRank, touch.slotRank, "all three variants share the same pool");
});

test("deriveHealSpellVariants: throws a clear error if the spell doesn't have the expected 3-action self-centered emanation overlay", () => {
  const ingredients = lunar17Ingredients();
  const realHeal = ingredients.spells.find((s) => s.name === "Heal");
  const missingEmanation = {
    name: "Fake Heal No Emanation",
    system: {
      damage: { 0: { formula: "1d8" } },
      location: { value: realHeal.system.location.value },
      level: { value: 1 },
      overlays: {
        touch: { system: { time: { value: "1" } } },
        ranged: { system: { time: { value: "2" }, damage: { 0: { formula: "1d8+8", kinds: ["healing"] } } } }
        // no 3-action emanation overlay at all
      }
    }
  };
  ingredients.spells = [...ingredients.spells, missingEmanation];
  assert.throws(() => deriveHealSpellVariants(ingredients, "Fake Heal No Emanation"), /expected a 3-action self-centered emanation overlay/);
});

test("deriveHealSpellVariants: throws a clear error for a spell name that doesn't exist", () => {
  const ingredients = lunar17Ingredients();
  assert.throws(() => deriveHealSpellVariants(ingredients, "Not A Real Spell"), /No spell named/);
});

// Defensive throw, mirroring deriveSaveSpells' own "throws rather than silently misreading" tests
// above — a synthetic spell missing the two real overlays this function depends on (rather than
// Heal's own real 4-overlay shape) must fail loudly, not silently return wrong/partial variants.
test("deriveHealSpellVariants: throws a clear error if the spell doesn't have the expected touch + living-heal overlay shape", () => {
  const ingredients = lunar17Ingredients();
  const realHeal = ingredients.spells.find((s) => s.name === "Heal");
  const malformed = {
    name: "Fake Heal",
    system: {
      damage: { 0: { formula: "1d8" } },
      location: { value: realHeal.system.location.value },
      overlays: {} // no overlays at all — a restructured/differently-modeled spell
    }
  };
  ingredients.spells = [...ingredients.spells, malformed];
  assert.throws(() => deriveHealSpellVariants(ingredients, "Fake Heal"), /expected a 1-action touch overlay/);
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

// GH #69: deriveSaveSpells reads real slot data correctly today (the test above), but — before the
// shared deriveSpellUsesRemaining guard existed — it carried the IDENTICAL latent bug deriveSpells
// itself shipped for Eldritch Lance (GH #69's own found regression), dormant only because no current
// fixture has ever pointed it at a cantrip-shaped save-spell. No real one exists in this project's
// data yet, so this is a synthetic input — deliberately linked to Bennit's own REAL, populated
// spellcastingEntry (the same one Thunderstrike itself uses, confirmed non-empty by the test above),
// so this proves the cantrip check actually SKIPS the slot lookup, not that the slots happened to be
// empty by accident.
test("deriveSaveSpells: a cantrip-shaped save-spell (synthetic — no real one exists yet) is atWill with no usesRemaining, even when its spellcastingEntry has real, populated slots", () => {
  const ingredients = bennitIngredients();
  const mods = deriveAbilityModifiers(ingredients);
  const realThunderstrike = ingredients.spells.find((s) => s.name === "Thunderstrike");
  const cantripSaveSpell = {
    name: "Synthetic Cantrip Blast",
    system: {
      traits: { value: ["cantrip"] },
      defense: { save: { statistic: "reflex", basic: true } },
      location: { value: realThunderstrike.system.location.value }, // the SAME real, non-empty entry Thunderstrike itself uses
      range: { value: "30 feet" },
      time: { value: "2" },
      damage: { 0: { formula: "1d4", type: "fire" } }
    }
  };
  ingredients.spells = [...ingredients.spells, cantripSaveSpell];
  const [cantrip] = deriveSaveSpells(ingredients, ["Synthetic Cantrip Blast"], mods);
  assert.equal(cantrip.atWill, true);
  assert.equal(cantrip.usesRemaining, undefined, "must not silently pick up the real, populated slots.slot1.max from the entry it shares with Thunderstrike");
});
