/**
 * Produces personnel-engine-consumable Strikes/spells/heal-abilities from a resolved pregen's raw
 * combat ingredients (design doc §19 Phase 2) — the counterpart to build-kid-fixture.mjs, which
 * deliberately does NOT derive combat fields (ground-role kids "never touch combat math directly",
 * per that file's own header). A combat-capable pregen (Lunar-17, built for the Pure RAW SF2E
 * Validation initiative) is the opposite case: combat IS the point, so every number here is real,
 * derived math, cited against reference/tables/dc-and-check-math.json and
 * reference/srd/player-core/349-damage-rolls.json — nothing hand-picked.
 *
 * SCOPE (updated for design doc §19's skill-actions-in-combat expansion — saving throws are no
 * longer unsupported): derives ATTACK-ROLL Strikes, attack-roll spells, save-based attacks (once
 * personnel-engine gained a real saving-throw mechanism), one hand-identified heal ability, and
 * skill-check modifiers for skill actions (Demoralize). What's still deliberately SKIPPED: a
 * Fortitude-save special action requiring a prerequisite condition this project doesn't model
 * (Prone) — that's a genuinely different kind of gap (a missing prerequisite mechanism, not a
 * missing resolution mechanism) and stays out of scope on its own terms.
 *
 * Every save-based item is still hand-identified BY NAME, not auto-detected — nothing in the raw
 * weapon data structurally distinguishes "this is a save-based attack" from an ordinary Strike
 * (the Incendiary Grenade's system.damage shape is IDENTICAL to Zero Knife's; the difference is
 * only visible in free-text description prose, "...with a @Check[reflex...] save"). Building
 * automatic detection for what's still a small, known set of cases would be exactly the kind of
 * fragile inference this project's "don't invent" conventions warn against.
 */
import { deriveStrikeAttackBonus, abilityForStrikeAttack, deriveStrikeDamageBonus, deriveSpellAttack, deriveSpellDC, deriveClassDC, proficiency, SKILL_KEY_ABILITY } from "./derive.mjs";

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
 * Derive real save-based attacks (design doc §19's skill-actions-in-combat expansion) — a
 * SINGLE-TARGET item with a basic saving throw against the wielder's DC (e.g. a hypothetical spell
 * like Thunderstrike, flagged but not yet built in design doc §21's pregen research). `items` is
 * `[{name, saveType}, ...]`, not just names: nothing in the raw weapon data says WHICH save a given
 * item's effect targets (that's only in free-text description prose — "...with a @Check[reflex...]
 * save" — so it's supplied by the caller, hand-read from that same prose, same discipline as this
 * file's other hand-identified cases). DC is the wielder's real Class DC (deriveClassDC).
 *
 * NOT A VALID FIT FOR GRENADES, despite this function's own original worked example having been the
 * Incendiary Grenade — corrected in design doc §21 after a direct user report: every grenade
 * checked so far (Incendiary, Frag, Electromag) is a `@Template[burst|distance:5]` AREA effect, not
 * a single-target attack (confirmed directly against the Incendiary Grenade's raw description:
 * "Activate 1 Area Fire ... @Template[burst|distance:5]"). Wiring an area weapon through this
 * single-target mechanism silently drops its real friendly-fire risk, which is likely why the AI
 * used it far more liberally than a rules-correct implementation ever would have. Grenades stay
 * unwired — same "out of scope" treatment already applied to every other area/multi-target weapon
 * (Auto-Fire, Suppressing Fire) — until this engine has a real area-effect mechanism to build them
 * against.
 *
 * `actions: 1` is NOT read from any raw field — no explicit action-cost field exists on this raw
 * weapon item to read instead. A thrown weapon Strike is a real, single-action SF2E activity, so
 * this is the correct value, just not one this function derives from structured data.
 */
export function deriveSaveAttacks(ingredients, items, abilityModifiers) {
  const { weapons, level, classKeyAbility } = ingredients;
  const dc = deriveClassDC({ level, keyAbilityModifier: abilityModifiers[classKeyAbility] }).modifier;
  return items.map(({ name: wantedName, saveType }) => {
    const weapon = weapons.find((w) => w.name === wantedName);
    if (!weapon) throw new Error(`No weapon named "${wantedName}" in this pregen's raw weapon list.`);
    return {
      name: weapon.name,
      saveType,
      dc,
      range: weapon.system.range,
      actions: 1,
      traits: weapon.system.traits?.value ?? [],
      damage: [{ dice: diceString(weapon.system.damage), bonus: 0, damageType: weapon.system.damage.damageType }],
      // A saveAttack is, by construction, a one-off thrown consumable effect (unlike deriveStrikes'
      // reusable melee/ranged weapons) — REGRESSION caught by measurement, not inspection: without
      // this, the AI correctly discovered it could throw an "infinite" single grenade over and over
      // (system.quantity was never read), which skewed a real 10-seed behavior sample so hard the
      // grenade outnumbered Eldritch Lance 31-to-4 despite Lunar-17's real sheet carrying exactly
      // ONE (system.quantity: 1, confirmed directly against her raw pack data).
      usesRemaining: weapon.system.quantity ?? 1
    };
  });
}

/**
 * A skill-check modifier for a skill action (Demoralize's Intimidation check). Reuses the same
 * proficiency() formula every other check in derive.mjs already does — a skill modifier IS a
 * proficiency check, nothing save/spell/Strike-specific about it. `ingredients.skillRanks` only
 * lists skills the pregen actually trained (matching how NPC system.skills only lists trained
 * skills too — see extract-npc.mjs) — an absent key correctly resolves to untrained (rank 0), not
 * an error, since untrained is a real, legal, complete answer (a real level-1 sheet always has
 * plenty of untrained skills).
 */
export function deriveSkillModifier(ingredients, skillName, abilityModifiers) {
  const rankIndex = rankIndexOf(ingredients.skillRanks?.[skillName] ?? 0);
  const abilityKey = SKILL_KEY_ABILITY[skillName];
  if (!abilityKey) throw new Error(`"${skillName}" is not one of the 18 real SF2E skills (SKILL_KEY_ABILITY has no entry for it).`);
  return proficiency(rankIndex, ingredients.level, abilityModifiers[abilityKey]).modifier;
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
