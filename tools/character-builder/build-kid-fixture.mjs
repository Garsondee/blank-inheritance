/**
 * Produces one full kid.schema.json-shaped statblock from a resolved
 * pregen's ingredients — the "borrow and reflavour" path from
 * tools/character-builder/README.md. Mechanics (ancestry, background,
 * class, every derived number) are kept exactly as SF2E rules produce
 * them; only identity (name, concept) is reflavoured, and clearly marked
 * as a synthetic fixture — same convention tools/battle-simulator/data
 * /combatants.mjs already uses for the Reference Frame, extended here to
 * the personnel scale. See CLAUDE.md: the six real kids are collaborative
 * creative work with Ingram, never to be filled in to look complete —
 * these are simulator ingredients, not a proposal for who they are.
 *
 * Combat fields (strikes, inventory) are deliberately NOT derived: these
 * fixtures were built for the ground roles (cut 2026-09-20), where a kid
 * "never touches combat math directly," and today they only verify the
 * derivation engine. A combat-capable pregen is build-combat-pregen.mjs's
 * job.
 */
import {
  deriveAbilityModifiers, deriveHP, derivePerception, deriveSavingThrows,
  deriveSkills, deriveArmorClass, deriveClassDC
} from "./derive.mjs";

const SIZE_MAP = { tiny: "tiny", sm: "small", med: "medium", lg: "large", huge: "huge", grg: "gargantuan" };
const RANK_INDEX = { untrained: 0, trained: 1, expert: 2, master: 3, legendary: 4 };

function rankIndexOf(value) {
  return typeof value === "number" ? value : (RANK_INDEX[value] ?? 0);
}

/**
 * @param {object} ingredients - from extract-pregen.mjs's toIngredients()
 * @param {object} fixture - { id, groundRole, conceptNote }
 */
export function buildKidFixture(ingredients, fixture) {
  const abilityModifiers = deriveAbilityModifiers(ingredients);
  const level = ingredients.level;

  const hitPoints = deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: abilityModifiers.con });
  const perception = derivePerception({ rankIndex: rankIndexOf(ingredients.perceptionRank), level, wisModifier: abilityModifiers.wis });
  const savingThrows = deriveSavingThrows({
    fortitudeRank: rankIndexOf(ingredients.saveRanks.fortitude),
    reflexRank: rankIndexOf(ingredients.saveRanks.reflex),
    willRank: rankIndexOf(ingredients.saveRanks.will),
    level, conModifier: abilityModifiers.con, dexModifier: abilityModifiers.dex, wisModifier: abilityModifiers.wis
  });
  const skills = deriveSkills({ ranks: ingredients.skillRanks, level, abilityModifiers });
  const classDC = deriveClassDC({ level, keyAbilityModifier: abilityModifiers[ingredients.classKeyAbility] });
  const armorClass = ingredients.armor
    ? deriveArmorClass({
        armorCategoryRank: rankIndexOf(ingredients.armorCategoryRank), level, dexModifier: abilityModifiers.dex,
        dexCap: ingredients.armor.dexCap, itemBonus: ingredients.armor.acBonus, armorProficiency: ingredients.armor.name
      })
    : deriveArmorClass({ armorCategoryRank: rankIndexOf(ingredients.armorCategoryRank), level, dexModifier: abilityModifiers.dex, dexCap: null, armorProficiency: null });

  return {
    $schema: "PLACEHOLDER", // set by the caller once it knows the file's final path
    id: fixture.id,
    type: "kid",
    authoring: { status: "drafted" },
    name: `TEST FIXTURE — ${fixture.groundRole} (${ingredients.className}, synthetic, not one of the six real kids)`,
    player: null,
    age: 17,
    concept: fixture.conceptNote,
    level,
    xp: 0,
    ancestry: ingredients.ancestryName,
    heritage: ingredients.heritageName,
    background: ingredients.backgroundName,
    class: ingredients.className,
    size: SIZE_MAP[ingredients.size] ?? "medium",
    languages: ingredients.languages,
    abilityModifiers,
    perception,
    savingThrows,
    skills,
    classDC,
    hitPoints,
    armorClass,
    speed: { land: ingredients.speed },
    heroPoints: 1,
    framePilotedRef: fixture.framePilotedRef ?? null,
    status: "Synthetic — battle-simulator test fixture only.",
    notes: `Reflavoured from the SF2E Player Core "Adventure Pregens" compendium (gamesystems/sf2e/packs/paizo-pregens), extracted via tools/pack-extractor and re-derived from first principles via tools/character-builder/derive.mjs. Computed HP was cross-checked against the pregen's own official total as a correctness check (see test/battle-simulator/kid-fixtures.test.mjs) before this file was written.`
  };
}
