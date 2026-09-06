/**
 * What a character can roll — the pure half.
 *
 * The list is never hardcoded at runtime. sf2e's own `CONFIG.PF2E.skills` is
 * the fixed set and the actor carries the rest, so scripts/foundry/rolls.mjs
 * reads both off the live document and hands the result here to be shaped.
 * The constants below exist for tests and as a last-resort fallback, not as
 * the source of truth.
 */

/**
 * SF2E's fixed skill list: EIGHTEEN slugs, read directly out of
 * `CONFIG.PF2E.skills` in the shipped system (sf2e.mjs, verified 2026-09-06).
 *
 * Note what is NOT here: **Lore**. Lores are per-actor `lore` Items that
 * surface as extra `actor.skills` entries carrying `.lore`, so a character can
 * have any number of them or none. `design/ux-doctrine.md` §9 said "nineteen
 * skills" until 2026-09-06 by counting Lore as if it were fixed; it isn't, and
 * a list built from this constant alone is wrong for every character who has
 * one.
 *
 * Computers and Piloting are the two Starfinder additions. Computers is the
 * one behind Hack and Access Infosphere, and it is what the V1 prototype's
 * ten-key pod was most conspicuously missing.
 */
export const FALLBACK_SKILL_SLUGS = Object.freeze([
  "acrobatics", "arcana", "athletics", "computers", "crafting", "deception",
  "diplomacy", "intimidation", "medicine", "nature", "occultism", "performance",
  "piloting", "religion", "society", "stealth", "survival", "thievery"
]);

/** The three saving throws. Read off the actor when one is available. */
export const SAVE_SLUGS = Object.freeze(["fortitude", "reflex", "will"]);

export const PERCEPTION_SLUG = "perception";

/** Slugs safe to interpolate into an `@Check[...]` enricher string. */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeSlug(slug) {
  return typeof slug === "string" && SAFE_SLUG.test(slug);
}

/** "acrobatics" -> "Acrobatics"; "battle-lore" -> "Battle Lore". */
export function labelForSlug(slug) {
  if (typeof slug !== "string" || slug.length === 0) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The four-character legend that fits on a key.
 *
 * Four rather than three specifically because **Perception and Performance
 * both abbreviate to PER**, and they are two different rolls a player might
 * reach for in the same breath. PERC/PERF are unambiguous. The full name goes
 * in the button's title attribute regardless, so this only has to be
 * recognisable, not self-explanatory.
 *
 * A lore drops its trailing "Lore" first, so "Underworld Lore" reads UNDE
 * rather than LORE — otherwise every lore on the sheet would look identical.
 */
export function abbreviate(label) {
  if (typeof label !== "string") return "";
  const trimmed = label.trim().replace(/\s+Lore$/i, "");
  const letters = trimmed.replace(/[^A-Za-z0-9]/g, "");
  return letters.slice(0, 4).toUpperCase();
}

function byLabel(a, b) {
  return a.label.localeCompare(b.label);
}

/**
 * Group what this character can roll into the banks the console renders.
 *
 * Two groups, not three: Perception sits with the saves rather than alone in a
 * group of one. Lores sort after the fixed skills so the eighteen stay in a
 * stable, learnable order no matter what a character happens to know.
 *
 * A group with no entries is dropped entirely — an empty labelled bank is
 * furniture pretending to be a control.
 */
export function buildCheckGroups({ skills = [], saves = [], hasPerception = false } = {}) {
  const normalise = (entry) => {
    const label = entry.label || labelForSlug(entry.slug);
    return { slug: entry.slug, label, short: abbreviate(label), lore: !!entry.lore };
  };

  const skillEntries = skills.map(normalise);
  const fixed = skillEntries.filter((entry) => !entry.lore).sort(byLabel);
  const lores = skillEntries.filter((entry) => entry.lore).sort(byLabel);

  const defences = saves.map(normalise);
  if (hasPerception) {
    defences.push(normalise({ slug: PERCEPTION_SLUG, label: labelForSlug(PERCEPTION_SLUG) }));
  }

  return [
    {
      id: "skills",
      labelKey: "BLANKINHERITANCE.Console.Checks.Skills",
      columns: 6,
      entries: [...fixed, ...lores]
    },
    {
      id: "defences",
      labelKey: "BLANKINHERITANCE.Console.Checks.Defences",
      columns: 4,
      entries: defences
    }
  ].filter((group) => group.entries.length > 0);
}
