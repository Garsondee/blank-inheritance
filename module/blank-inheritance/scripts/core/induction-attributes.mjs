/**
 * Pure logic for the induction terminal's Page 5 (design/induction-terminal.md
 * §4): the four free ability boosts every character gets at Player Core's
 * chargen Step 6, on top of whatever ancestry/background/class already
 * granted on Pages 2-4.
 *
 * Modeled as four identical, fully-open boost slots -- core/boost-slots.mjs
 * unchanged, the fourth real consumer of the same fixed/free slot
 * resolution (ancestry boosts, ancestry flaws, background boosts, class
 * key ability, now this). Player Core pg. 18's "different ability at the
 * same time" rule applies across these four slots against EACH OTHER only
 * (they're granted together) -- not against ancestry/background/class,
 * which were separate steps; a free boost CAN legally land on an ability
 * already boosted earlier, it just adds another +1 there (subject to
 * derive.mjs's own level-1 +4 clamp, applied when Page 9 actually derives
 * the sheet, not here).
 */

import { ABILITIES, resolveSlots } from "./boost-slots.mjs";

/** The four free-boost slots, identical and fully open -- every ability legal in every slot. */
export const FREE_BOOST_SLOTS = [ABILITIES, ABILITIES, ABILITIES, ABILITIES];

/** Complete once all four free boosts have a pick. */
export function isFreeBoostsComplete(freeBoostPicks) {
  return resolveSlots(FREE_BOOST_SLOTS, freeBoostPicks).missing.length === 0;
}

/**
 * The flat shape derive.mjs's deriveAbilityModifiers consumes (its
 * `freeBoosts` param). Throws on a missing pick, same discipline as every
 * other resolveXIngredients in this module family.
 */
export function resolveFreeBoosts(freeBoostPicks) {
  const { resolved, missing } = resolveSlots(FREE_BOOST_SLOTS, freeBoostPicks);
  if (missing.length) {
    throw new Error("Not every free ability boost has been chosen yet.");
  }
  return { freeBoosts: resolved };
}
