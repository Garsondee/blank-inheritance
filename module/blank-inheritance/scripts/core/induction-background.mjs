/**
 * Pure background-choice resolution for the induction terminal's Page 3
 * (design/induction-terminal.md §4). Turns a player's picks against
 * data/campaign/background-catalogue.json's boost slots into the flat
 * ability-key list tools/character-builder/derive.mjs's
 * deriveAbilityModifiers already expects (its `backgroundBoosts` param) --
 * no new chargen math here, only choice resolution. Same "collect the right
 * raw ingredients" principle as Page 2, and the same underlying slot logic
 * (core/boost-slots.mjs) -- a background's two (almost always) boost slots
 * are structurally identical to an ancestry's.
 *
 * Backgrounds have NO flaw slots (Player Core: "grants two boosts... and
 * the trained proficiency rank in two skills, one of which is a Lore
 * skill"), unlike ancestries. Trained skills, Lore skills and the granted
 * background feat are deliberately NOT resolved here -- the feat is a real
 * menu pick with its own rule text, deferred to the post-induction
 * character sheet, same reasoning as ancestry feat/heritage and class
 * feats/spells, design doc §5.
 *
 * ONE thing a background does ask: when its rules carry a ChoiceSet (Starship
 * Dweller is trained in Crafting OR Piloting; thirteen backgrounds in all),
 * the catalogue entry has `choices`, the page asks each one, and the answers
 * are written into the Item before it is embedded so Foundry opens no window
 * of its own at Confirm (core/induction-rule-choices.mjs has the whole
 * story). A background with an unanswered choice is not complete.
 */

import { resolveSlots } from "./boost-slots.mjs";
import { choicesComplete } from "./induction-rule-choices.mjs";

/** Every boost slot resolved, and every choice the background asks answered -- Page 3's Continue gate. */
export function isBackgroundChoiceComplete(background, boostPicks, choicePicks = {}) {
  if (!background) return false;
  return resolveSlots(background.boosts, boostPicks).missing.length === 0 && choicesComplete(background.choices, choicePicks);
}

/**
 * The flat shape derive.mjs's deriveAbilityModifiers consumes. Throws on a
 * missing or illegal choice -- callers check isBackgroundChoiceComplete
 * first, same discipline as resolveAncestryIngredients.
 */
export function resolveBackgroundIngredients(background, boostPicks, choicePicks = {}) {
  const boosts = resolveSlots(background.boosts, boostPicks);
  if (boosts.missing.length) {
    throw new Error("Not every background boost has been chosen yet.");
  }
  if (!choicesComplete(background.choices, choicePicks)) {
    throw new Error("Not every choice this background asks has been made yet.");
  }
  return { backgroundBoosts: boosts.resolved };
}

/**
 * Common first, then uncommon, then rare, alphabetical within each -- a
 * common background is always a legal, unremarkable pick; uncommon/rare
 * ones exist but call for a heavier hint that they're a less usual choice.
 * Mirrors groupAncestries' terrestrial/alien split in spirit (a real,
 * meaningful axis to group 154 entries by, not an arbitrary one) --
 * three groups instead of two because rarity, not disguise-relevance, is
 * the axis that matters here.
 */
export function groupBackgroundsByRarity(backgrounds) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  return {
    common: backgrounds.filter((b) => b.rarity === "common").sort(byName),
    uncommon: backgrounds.filter((b) => b.rarity === "uncommon").sort(byName),
    rare: backgrounds.filter((b) => b.rarity === "rare").sort(byName)
  };
}

/** Case-insensitive substring match on name, for Page 3's live filter box. Empty/blank query matches everything. */
export function filterBackgrounds(backgrounds, query) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return backgrounds;
  return backgrounds.filter((b) => b.name.toLowerCase().includes(q));
}
