/**
 * Pure logic for the induction terminal's Page 9 (design/induction-terminal.md
 * §4/§6): the final review-and-confirm gate before a real Foundry Actor
 * gets created. Everything Page 9 actually WRITES to Foundry (embedding
 * real ancestry/background/class Items, resolving their boost selections,
 * setting the four free boosts, creating a Lore item) is necessarily
 * adapter-side (scripts/foundry/) -- there is no pure "compute the sheet"
 * step here, deliberately: sf2e's own derived-data engine computes AC/HP/
 * skills/saves live from embedded Items once they're created, exactly the
 * way a real character sheet works, so this terminal never re-implements
 * that math. This module only covers the one thing that genuinely is pure:
 * whether every earlier page's required choice has actually been made.
 */

import { isFreeBoostsComplete } from "./induction-attributes.mjs";

/**
 * True once every REQUIRED prior choice exists: an ancestry, a background,
 * a class, a name, and all four free boosts. Everything else collected
 * across Pages 1-8 (pronouns/gender/appearance/languages, the banal
 * questions, the eight core questions) is optional by design -- Page 9
 * must not block on any of them.
 *
 * Free boosts are already gated by Page 5's own Continue button before a
 * player can reach Page 9 through the normal flow, so this re-check is
 * defense in depth (same reasoning as #pickFreeSlot's own isLegalPick
 * guard), not the primary gate -- state reachable only by skipping the UI
 * entirely (direct state mutation, a future routing bug) shouldn't be able
 * to reach a real Actor-creation call with an incomplete build.
 */
export function isReviewComplete(state) {
  return Boolean(
    state?.ancestry?.id &&
    state?.background?.id &&
    state?.class?.id &&
    (state?.finishing?.name ?? "").trim() &&
    isFreeBoostsComplete(state?.attributes?.freeBoostPicks ?? [])
  );
}

/**
 * Remove any `GrantItem` rule element from a compendium Item's own
 * `system.rules` before embedding it on a fresh Actor.
 *
 * `system.items` grant descriptors (a background's own feat, a class's
 * features) are one mechanism sf2e uses to auto-grant a further Item on
 * embed -- stripped separately, by the caller, just by clearing that field.
 * `GrantItem` is a SEPARATE mechanism (a real rule element) that does the
 * same thing but isn't touched by clearing `system.items` at all. Found
 * live 2026-09-10: Escaped Experiment (a real background) grants "Canny
 * Acumen" this way, and Canny Acumen itself carries a ChoiceSet (which
 * proficiency to boost) that pops a real interactive dialog mid-embed --
 * on a real player's screen, Confirm would silently hang on a popup they
 * don't understand until someone clicks it. Every other feat/spell/further
 * grant is already deferred to the real character sheet (design doc §5);
 * this closes the one path that could still auto-grant something despite
 * that policy. Filters rather than clearing `system.rules` outright, so
 * unrelated rules (e.g. an ancestry's own ActiveEffectLike flag) are left
 * intact.
 */
export function stripGrantItemRules(rules) {
  return (rules ?? []).filter((rule) => rule.key !== "GrantItem");
}
