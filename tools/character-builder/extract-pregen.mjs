/**
 * Resolves one level-1 SF2E pregen character (from a Foundry compendium
 * pack, read via tools/pack-extractor) down to the plain "ingredients"
 * shape derive.mjs consumes — i.e. this is the bridge between "raw Foundry
 * Actor + Item documents" and "the four chargen steps from Player Core
 * pg. 18". A boost/keyAbility entry in the raw data is either a fixed
 * single value (`value` is a 1-item array, no `selected`) or a real choice
 * already made by the pregen's author (`selected` set) — `resolve()` below
 * is that one rule, applied everywhere a choice shows up.
 */
import { readPackDocuments } from "../pack-extractor/read-pack.mjs";

/**
 * Most pregens record which ability a choice-boost actually resolved to in
 * `selected`; a fixed (non-choice) boost has no `selected` but only ever
 * lists one candidate in `value`, so falling back to `value[0]` is exact,
 * not a guess. A minority of pregens (found empirically: Jaedana's Kasatha
 * ancestry free boost and Spacefarer background boosts) have neither —
 * `selected` is absent AND `value` lists multiple candidates, meaning the
 * source data genuinely doesn't record what was chosen. Silently taking
 * value[0] there would fabricate a specific choice and present it as fact,
 * so this throws instead: the caller must supply an explicit override,
 * with the reasoning for that choice written down at the call site.
 */
function resolve(entry, override) {
  if (!entry) return null;
  if (entry.selected) return entry.selected;
  if (entry.value.length === 1) return entry.value[0];
  if (override) return override;
  throw new Error(`Ambiguous boost — "selected" is absent and value lists ${entry.value.length} candidates (${entry.value.join("/")}): supply an override.`);
}

function itemsFor(documents, actorIdPart) {
  return documents.filter((e) => e.embedded && e.collection === "actors.items" && e.idPart.startsWith(actorIdPart + "."));
}

/** Every level-1 `character`-type actor in a pack, with its ancestry/heritage/background/class items attached. */
export function listLevel1Pregens(packDir) {
  const { documents } = readPackDocuments(packDir);
  const characters = documents.filter((d) => !d.embedded && d.doc.type === "character" && d.doc.system?.details?.level?.value === 1);
  return characters.map((d) => {
    const items = itemsFor(documents, d.idPart);
    return {
      name: d.doc.name,
      actor: d.doc,
      ancestry: items.find((i) => i.doc.type === "ancestry")?.doc ?? null,
      heritage: items.find((i) => i.doc.type === "heritage")?.doc ?? null,
      background: items.find((i) => i.doc.type === "background")?.doc ?? null,
      class: items.find((i) => i.doc.type === "class")?.doc ?? null,
      armor: items.find((i) => i.doc.type === "armor")?.doc ?? null
    };
  });
}

/**
 * Normalize one resolved pregen into derive.mjs's ingredient shape.
 * `boostOverrides` supplies resolutions for ambiguous entries (see
 * resolve()'s doc comment) as `{ ancestry: [ability, ...], background: [ability, ...] }`,
 * positional against that item's own `boosts` object in insertion order —
 * only needed for the rare pregen where the source data doesn't already
 * record the choice.
 */
export function toIngredients(pregen, boostOverrides = {}) {
  const { actor, ancestry, background, class: klass, armor } = pregen;
  if (!ancestry || !background || !klass) {
    throw new Error(`${pregen.name}: missing ancestry/background/class item — cannot derive a sheet from an incomplete pregen.`);
  }

  const resolveAll = (boostsObj, overrides = []) =>
    Object.values(boostsObj ?? {}).map((entry, i) => resolve(entry, overrides[i])).filter(Boolean);

  const ancestryBoosts = resolveAll(ancestry.system.boosts, boostOverrides.ancestry);
  const ancestryFlaws = Object.values(ancestry.system.flaws ?? {}).map((entry) => resolve(entry)).filter(Boolean);
  const backgroundBoosts = resolveAll(background.system.boosts, boostOverrides.background);
  const classKeyAbility = resolve(klass.system.keyAbility);
  const freeBoosts = actor.system.build?.attributes?.boosts?.["1"] ?? [];

  const skillRanks = Object.fromEntries(Object.entries(actor.system.skills ?? {}).map(([k, v]) => [k, v.rank]));

  const armorCategoryRank = armor ? (klass.system.defenses?.[armor.system.category] ?? 0) : (klass.system.defenses?.unarmored ?? 0);

  return {
    level: 1,
    ancestryName: ancestry.name,
    heritageName: pregen.heritage?.name ?? null,
    backgroundName: background.name,
    className: klass.name,
    ancestryBoosts,
    ancestryFlaws,
    backgroundBoosts,
    classKeyAbility,
    freeBoosts,
    ancestryHP: ancestry.system.hp,
    classHP: klass.system.hp,
    skillRanks,
    perceptionRank: klass.system.perception ?? 0,
    saveRanks: { fortitude: klass.system.savingThrows.fortitude, reflex: klass.system.savingThrows.reflex, will: klass.system.savingThrows.will },
    speed: pregen.heritage?.system?.rules?.find((r) => r.key === "BaseSpeed" && r.selector === "land-speed")?.value ?? ancestry.system.speed,
    size: ancestry.system.size, // sm/med/lg -> mapped to schema's size enum by the caller
    languages: ancestry.system.languages?.value ?? [],
    armor: armor ? { name: armor.name, category: armor.system.category, dexCap: armor.system.dexCap, acBonus: armor.system.acBonus } : null,
    armorCategoryRank,
    referenceHP: actor.system.attributes.hp.value // the pregen's own authoritative total, used only to verify the derivation, never trusted directly as output
  };
}
