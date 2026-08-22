/**
 * Pure SF2E level-1 character-sheet derivation, grounded in
 * reference/srd/player-core/64-character-creation.json (the actual chargen
 * steps, verbatim) — not recalled rules-lawyering. This is "the process"
 * for building a legitimate character from scratch: feed it an ancestry's
 * boosts/flaws, a background's boosts, a class's key ability, and the
 * player's 4 free boosts, and it derives the full computed sheet the same
 * way a person filling out a physical character sheet would.
 *
 * Scope: level 1 only, on purpose. The +4 attribute-modifier cap
 * ("At 1st level, a character can never have any attribute modifier
 * that's higher than +4" — Player Core pg. 21) only holds at level 1;
 * a general-level version would need the real "partial boost" bookkeeping
 * this deliberately skips (see applyBoost's comment).
 */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

/** Player Core pg. 192 (Chapter 4): each skill's one fixed key ability. Unchanged since 1e/remaster and identical in SF2E's sci-fi-reskinned skill list. */
export const SKILL_KEY_ABILITY = {
  acrobatics: "dex", arcana: "int", athletics: "str", computers: "int",
  crafting: "int", deception: "cha", diplomacy: "cha", intimidation: "cha",
  medicine: "wis", nature: "wis", occultism: "int", performance: "cha",
  piloting: "dex", religion: "wis", society: "int", stealth: "dex",
  survival: "wis", thievery: "dex"
};

const RANK_NAME = ["untrained", "trained", "expert", "master", "legendary"];
const RANK_BONUS = [0, 2, 4, 6, 8]; // + level, per rank

/** Level+bonus, or flat +0 if untrained (untrained never scales with level). */
export function proficiencyBonus(rankIndex, level) {
  return rankIndex === 0 ? 0 : level + RANK_BONUS[rankIndex];
}

export function proficiency(rankIndex, level, abilityModifier = 0, itemBonus = 0) {
  return { rank: RANK_NAME[rankIndex] ?? "untrained", modifier: proficiencyBonus(rankIndex, level) + abilityModifier + itemBonus };
}

/**
 * A boost increases a modifier by 1, EXCEPT at +4 or higher, where Player
 * Core has the player bank a "partial boost" that only resolves into a
 * real +1 the SECOND time it happens — and because that second time can
 * only occur on a later level-up, no level-1 character's modifier can
 * ever numerically exceed +4 no matter how many boosts stack on it. So at
 * level 1 specifically, clamping is the correct behavior, not an
 * approximation of the partial-boost rule — it's what the rule reduces to
 * at this exact level.
 */
export function applyBoost(modifiers, ability) {
  return { ...modifiers, [ability]: Math.min(4, modifiers[ability] + 1) };
}

export function applyFlaw(modifiers, ability) {
  return { ...modifiers, [ability]: modifiers[ability] - 1 };
}

/**
 * Player Core pg. 18 "Attribute Modifier Overview" — the four steps, in
 * order: ancestry (boosts + at most one flaw), background (boosts),
 * class (one boost to the key ability), then four free boosts. Each
 * argument is a plain array of ability keys ("str","dex",...) — the
 * ingredient extraction (extract-pregen.mjs) is what resolves a source's
 * boost *choices* (e.g. "Dexterity or Intelligence") down to the actual
 * ability picked, so this function only ever applies concrete choices.
 */
export function deriveAbilityModifiers({ ancestryBoosts = [], ancestryFlaws = [], backgroundBoosts = [], classKeyAbility, freeBoosts = [] }) {
  let mods = Object.fromEntries(ABILITIES.map((a) => [a, 0]));
  for (const a of ancestryBoosts) mods = applyBoost(mods, a);
  for (const a of ancestryFlaws) mods = applyFlaw(mods, a);
  for (const a of backgroundBoosts) mods = applyBoost(mods, a);
  if (classKeyAbility) mods = applyBoost(mods, classKeyAbility);
  for (const a of freeBoosts) mods = applyBoost(mods, a);
  return mods;
}

/** Player Core pg. 21: total HP = ancestry HP + class HP + Con modifier, at level 1 (each subsequent level adds class HP + Con mod again — not implemented, level-1 only). */
export function deriveHP({ ancestryHP, classHP, conModifier }) {
  const max = ancestryHP + classHP + conModifier;
  return { max, current: max };
}

/** Player Core pg. 24: Perception = proficiency bonus (from class) + Wisdom modifier. */
export function derivePerception({ rankIndex, level, wisModifier }) {
  return { proficiency: proficiency(rankIndex, level, wisModifier) };
}

/** Player Core pg. 24: each save = proficiency bonus (from class) + its fixed ability modifier (Fort->Con, Reflex->Dex, Will->Wis). */
export function deriveSavingThrows({ fortitudeRank, reflexRank, willRank, level, conModifier, dexModifier, wisModifier }) {
  return {
    fortitude: proficiency(fortitudeRank, level, conModifier),
    reflex: proficiency(reflexRank, level, dexModifier),
    will: proficiency(willRank, level, wisModifier)
  };
}

/** Player Core pg. 24: each skill = proficiency bonus (rank varies per skill) + its one fixed key-ability modifier. `ranks` maps skill name -> rank index (0-4), defaulting to untrained for any of the 18 not present. */
export function deriveSkills({ ranks, level, abilityModifiers }) {
  const skills = {};
  for (const [skill, keyAbility] of Object.entries(SKILL_KEY_ABILITY)) {
    const rankIndex = ranks[skill] ?? 0;
    skills[skill] = proficiency(rankIndex, level, abilityModifiers[keyAbility]);
  }
  return skills;
}

/** Player Core pg. 25: AC = 10 + Dex modifier (capped by worn armor's Dex cap) + armor proficiency bonus + armor item bonus. */
export function deriveArmorClass({ armorCategoryRank, level, dexModifier, dexCap, itemBonus = 0, armorProficiency }) {
  const cappedDex = dexCap == null ? dexModifier : Math.min(dexModifier, dexCap);
  return {
    value: 10 + cappedDex + proficiencyBonus(armorCategoryRank, level) + itemBonus,
    armorProficiency: proficiency(armorCategoryRank, level),
    wornArmor: armorProficiency
  };
}

/**
 * Player Core pg. 25: Class DC = 10 + proficiency bonus (trained by default
 * at level 1 — "+3 for most 1st-level characters", pg. 24) + key ability
 * modifier. The proficiency $def's `modifier` field is documented as "the
 * final computed bonus ready to use in a roll" (sf2e-common.schema.json),
 * so the +10 is folded in here rather than left for a caller to remember.
 */
export function deriveClassDC({ rankIndex = 1, level, keyAbilityModifier }) {
  const p = proficiency(rankIndex, level, keyAbilityModifier);
  return { ...p, modifier: p.modifier + 10 };
}
