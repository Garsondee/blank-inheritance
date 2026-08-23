/**
 * Produces personnel-engine-consumable Strikes/spells/heal-abilities from a resolved pregen's raw
 * combat ingredients (design doc §19 Phase 2) — the counterpart to build-kid-fixture.mjs, which
 * deliberately does NOT derive combat fields (ground-role kids "never touch combat math directly",
 * per that file's own header). A combat-capable pregen (Lunar-17, built for the Pure RAW SF2E
 * Validation initiative) is the opposite case: combat IS the point, so every number here is real,
 * derived math, cited against reference/tables/dc-and-check-math.json and
 * reference/srd/player-core/349-damage-rolls.json — nothing hand-picked.
 *
 * SCOPE, DELIBERATELY NARROW (matches the approved plan's own explicit scoping): only derives
 * ATTACK-ROLL Strikes and attack-roll spells, plus one hand-identified heal ability. Save-based
 * attacks (a Reflex-basic-save grenade, a Fortitude-save special action) are SKIPPED, not
 * guessed-at — personnel-engine's legality/engine layer has no mechanism for a saving-throw-based
 * action at all (checkStrikeLegal/checkSpellAttackLegal are both attack-roll-vs-AC only), and nothing
 * in the raw weapon/spell data structurally distinguishes "attack roll" from "target saves" — the
 * Incendiary Grenade's system.damage shape is IDENTICAL to Zero Knife's, the difference is only
 * visible in free-text description prose ("...with a @Check[reflex...] save"). Building automatic
 * detection for a single one-off case would be exactly the kind of fragile inference this project's
 * "don't invent" conventions warn against; hand-identifying by name with a citation is the honest
 * alternative.
 */
import { deriveStrikeAttackBonus, abilityForStrikeAttack, deriveStrikeDamageBonus, deriveSpellAttack, deriveSpellDC } from "./derive.mjs";

const RANK_INDEX = { untrained: 0, trained: 1, expert: 2, master: 3, legendary: 4 };
function rankIndexOf(value) {
  return typeof value === "number" ? value : (RANK_INDEX[value] ?? 0);
}

/** A weapon item's `system.damage` is structured ({dice, die, damageType}), not a formula string — assemble the "1d4"-style dice string personnel-engine's damage shape expects. */
function diceString(damage) {
  return `${damage.dice}${damage.die}`;
}

/** A spell item's `system.damage` is a MAP of keyed entries (Foundry's editable-rows shape) — this project only ever needs the first (Lunar-17's Eldritch Lance has exactly one). */
function firstSpellDamage(damageMap) {
  const entry = Object.values(damageMap ?? {})[0];
  if (!entry) return null;
  return { dice: entry.formula, bonus: 0, damageType: entry.type }; // Player Core pg. 398: spell damage adds no ability modifier by default
}

/**
 * Derive real Strikes for every weapon in `weaponNames` (by name, from `ingredients.weapons`) —
 * explicit inclusion list, not "every weapon present", so a save-based item never silently becomes
 * an attack-roll Strike just because it happens to sit in the same array.
 */
export function deriveStrikes(ingredients, weaponNames, abilityModifiers) {
  const { classAttacks, weapons, level } = ingredients;
  return weaponNames.map((wantedName) => {
    const weapon = weapons.find((w) => w.name === wantedName);
    if (!weapon) throw new Error(`No weapon named "${wantedName}" in this pregen's raw weapon list.`);

    const isRanged = weapon.system.range != null;
    const strikeType = isRanged ? "ranged" : "melee";
    const traits = weapon.system.traits?.value ?? [];
    const categoryRank = rankIndexOf(classAttacks[weapon.system.category] ?? 0);

    const attackAbility = abilityForStrikeAttack({ strikeType, traits, strModifier: abilityModifiers.str, dexModifier: abilityModifiers.dex });
    const attackBonus = deriveStrikeAttackBonus({ rankIndex: categoryRank, level, abilityModifier: attackAbility, itemBonus: weapon.system.bonus?.value ?? 0 });
    const damageBonus = deriveStrikeDamageBonus({ strikeType, traits, strModifier: abilityModifiers.str });

    return {
      name: weapon.name,
      strikeType,
      attackBonus,
      ...(isRanged ? { rangeIncrement: weapon.system.range } : {}),
      traits,
      damage: [{ dice: diceString(weapon.system.damage), bonus: damageBonus, damageType: weapon.system.damage.damageType }]
    };
  });
}

/**
 * Derive real attack-roll spells for every spell in `spellNames`. A spell's governing
 * spellcastingEntry is found via `spell.system.location.value` linking to that entry's own `_id`
 * (confirmed against Lunar-17's real raw data: Eldritch Lance's `location.value` matches "Occult
 * Spontaneous Spells"' `_id` exactly).
 */
export function deriveSpells(ingredients, spellNames, abilityModifiers) {
  const { spells, spellcastingEntries, level } = ingredients;
  return spellNames.map((wantedName) => {
    const spell = spells.find((s) => s.name === wantedName);
    if (!spell) throw new Error(`No spell named "${wantedName}" in this pregen's raw spell list.`);
    if (!(spell.system.traits?.value ?? []).includes("attack")) {
      throw new Error(`"${wantedName}" is not an attack-roll spell (no "attack" trait) — this engine only supports attack-roll spells, see this file's own header.`);
    }
    const entry = spellcastingEntries.find((e) => e._id === spell.system.location.value);
    if (!entry) throw new Error(`"${wantedName}": no spellcastingEntry found matching its own system.location.value.`);

    const rankIndex = rankIndexOf(entry.system.proficiency.value);
    const abilityKey = entry.system.ability.value;
    const attackBonus = deriveSpellAttack({ rankIndex, level, abilityModifier: abilityModifiers[abilityKey] });
    const damage = firstSpellDamage(spell.system.damage);

    return {
      name: spell.name,
      attackBonus,
      range: parseInt(spell.system.range.value, 10), // e.g. "30 feet" -> 30
      actions: parseInt(spell.system.time.value, 10),
      traits: spell.system.traits.value,
      ...(damage ? { damage: [damage] } : {})
    };
  });
}

/**
 * One hand-identified heal ability. Transfer Vitality's real healing amount ("up to 10 Hit Points
 * (minimum 1)... increases by 10 at 5th, 10th, 15th and 20th level") exists ONLY as free-text
 * description prose in the raw data — system.rules is empty, there is no structured numeric field
 * to derive from. At level 1 the "minimum 1" qualifier and the later-level increases are both
 * moot (a level-1 Mystic's pool is large enough that 10 is always available), so the flat number
 * transcribed here is the complete, correct level-1 value, not a simplification.
 */
export function deriveTransferVitality(ingredients) {
  const action = ingredients.actions.find((a) => a.name === "Transfer Vitality");
  if (!action) throw new Error(`No "Transfer Vitality" action found — check the pregen's Vitality Network feat actually granted it.`);
  return {
    name: "Transfer Vitality",
    healingAmount: 10, // Player Core / Starfinder Core Rulebook, Mystic's Vitality Network feat text — see this function's own header
    range: 60,
    actions: action.system.actions.value
  };
}
