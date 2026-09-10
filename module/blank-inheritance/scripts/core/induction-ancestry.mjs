/**
 * Pure ancestry-choice resolution for the induction terminal's Page 2
 * (design/induction-terminal.md §4). Turns a player's picks against
 * data/campaign/ancestry-catalogue.json's boost/flaw choice slots into the
 * flat ability-key lists tools/character-builder/derive.mjs's
 * deriveAbilityModifiers already expects -- no new chargen math here, only
 * choice resolution. See design doc §2: "the terminal's job is narrower
 * than it first looks... collect the right raw ingredients."
 *
 * Heritage and ancestry-feat selection are deliberately NOT resolved here --
 * both are real menu picks that grant their own rule text, deferred to the
 * post-induction character sheet for the same reason class feats/spells are
 * (design doc §5): they aren't numbers derive.mjs needs.
 *
 * The generic boost/flaw slot resolution itself (`resolveSlots`,
 * `claimedAbilities`, `isFixedSlot`) moved to core/boost-slots.mjs
 * 2026-09-10, when Page 3 (background) needed the identical logic against
 * a different catalogue -- re-exported here so existing imports of this
 * module don't need to change.
 */

export { ABILITIES, isFixedSlot, resolveSlots, claimedAbilities } from "./boost-slots.mjs";
import { resolveSlots } from "./boost-slots.mjs";

/**
 * Every boost/flaw slot resolved -- Page 2's Continue gate. An ancestry
 * with no free slots at all (none of the 51 happen to have zero free slots,
 * but nothing here assumes otherwise) is complete the moment it's picked.
 */
export function isAncestryChoiceComplete(ancestry, boostPicks, flawPicks) {
  if (!ancestry) return false;
  const boosts = resolveSlots(ancestry.boosts, boostPicks);
  const flaws = resolveSlots(ancestry.flaws, flawPicks);
  return boosts.missing.length === 0 && flaws.missing.length === 0;
}

/**
 * The flat shape derive.mjs's deriveAbilityModifiers/deriveHP consume.
 * Throws on a missing or illegal choice -- callers check
 * isAncestryChoiceComplete first, same discipline as every other confirm
 * gate in this app (Page 9 does the same before calling derive.mjs for real).
 */
export function resolveAncestryIngredients(ancestry, boostPicks, flawPicks) {
  const boosts = resolveSlots(ancestry.boosts, boostPicks);
  const flaws = resolveSlots(ancestry.flaws, flawPicks);
  if (boosts.missing.length || flaws.missing.length) {
    throw new Error("Not every ancestry boost/flaw has been chosen yet.");
  }
  return { ancestryBoosts: boosts.resolved, ancestryFlaws: flaws.resolved, ancestryHP: ancestry.hp };
}

/**
 * Terrestrial-presenting first, alien-coded second, alphabetical within
 * each -- the grouping the "full catalogue, grouped/searchable" UI decision
 * asked for (2026-09-09). `terrestrial` is the catalogue's own tag; see its
 * schema for what it actually means and its stated boundary.
 */
export function groupAncestries(ancestries) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  return {
    terrestrial: ancestries.filter((a) => a.terrestrial).sort(byName),
    alienCoded: ancestries.filter((a) => !a.terrestrial).sort(byName)
  };
}

/** Case-insensitive substring match on name, for Page 2's live filter box. Empty/blank query matches everything. */
export function filterAncestries(ancestries, query) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return ancestries;
  return ancestries.filter((a) => a.name.toLowerCase().includes(q));
}
