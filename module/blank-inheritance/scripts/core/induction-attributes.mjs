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
 * Page 5's one-row picker (UI pass, 2026-09-25): the four free boosts must all differ, so "pick four
 * different attributes" is the same choice as four identical rows of six, shown as one row of six toggles.
 * Clicking a picked attribute unpicks it; a fifth pick is refused. Returns a new array, compact and in
 * pick order -- resolveSlots only needs one entry per identical slot, not a particular order.
 */
export function toggleFreeBoost(freeBoostPicks, ability) {
  const picks = (freeBoostPicks ?? []).filter(Boolean);
  if (!ABILITIES.includes(ability)) return picks;
  if (picks.includes(ability)) return picks.filter((a) => a !== ability);
  return picks.length >= FREE_BOOST_SLOTS.length ? picks : [...picks, ability];
}

/**
 * Where every attribute modifier ends up, and why: the running tally Page 5 and Review show, so the most
 * consequential choice in the form isn't made blind. Level 1 arithmetic only: each boost +1, each flaw
 * -1, from a base of 0 (Player Core's attribute modifiers). A level-1 character can't pass +4, and these
 * sources can't either: ancestry, background, class and the free four each touch an attribute at most once.
 *
 * Takes already-resolved picks (null or missing entries are fine, for a half-made choice) and returns
 * one row per attribute, in the standard order: { ability, mod, parts: [{ from, delta }] }.
 * `from` is "ancestry" | "flaw" | "background" | "class" | "free".
 */
export function abilityTally({ ancestryBoosts = [], ancestryFlaws = [], backgroundBoosts = [], classKey = null, freeBoosts = [] } = {}) {
  const sources = [
    ["ancestry", ancestryBoosts, +1], ["flaw", ancestryFlaws, -1], ["background", backgroundBoosts, +1],
    ["class", classKey ? [classKey] : [], +1], ["free", freeBoosts, +1]
  ];
  return ABILITIES.map((ability) => {
    const parts = [];
    for (const [from, list, delta] of sources) {
      if ((list ?? []).includes(ability)) parts.push({ from, delta });
    }
    return { ability, mod: parts.reduce((sum, p) => sum + p.delta, 0), parts };
  });
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
