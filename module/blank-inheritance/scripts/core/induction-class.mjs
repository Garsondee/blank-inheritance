/**
 * Pure class-choice resolution for the induction terminal's Page 4
 * (design/induction-terminal.md §4). Turns a player's key-ability pick
 * against data/campaign/class-catalogue.json into the scalar
 * tools/character-builder/derive.mjs's deriveAbilityModifiers already
 * expects (its `classKeyAbility` param -- a single ability, unlike the
 * boost sources which are arrays).
 *
 * A class's key ability is modeled as ONE boost slot (`[cls.keyAbility]`,
 * wrapped to a one-element slots array) so it reuses core/boost-slots.mjs's
 * exact fixed/free resolution unchanged -- most classes fix it outright
 * (Soldier: Constitution only), a few offer a real choice (Witchwarper:
 * Charisma or Intelligence), structurally identical to an ancestry's fixed
 * vs. free boost slot, just always exactly one slot.
 *
 * Trained skills (a fixed list plus a free count, e.g. Soldier: "Intimidation,
 * plus 3 more of your choice") and class features are deliberately NOT
 * resolved here -- the free-count skill pick is a real "choose N of 18"
 * widget this form doesn't build, same "basic but viable" reasoning
 * already applied to background's own skill grants (design doc §1), and
 * class features/feats/spells are the form's original, first-decided
 * deferral (§5).
 *
 * ONE thing a class does ask: Envoy's rules carry a ChoiceSet (trained in
 * Deception, Diplomacy or Intimidation). Its catalogue entry has `choices`,
 * the page asks it, and the answer is written into the Item before it is
 * embedded so Foundry opens no window of its own at Confirm
 * (core/induction-rule-choices.mjs). A class with an unanswered choice is
 * not complete.
 */

import { resolveSlots } from "./boost-slots.mjs";
import { choicesComplete } from "./induction-rule-choices.mjs";

/** The class's key ability has a pick (or was already fixed), and every choice the class asks is answered. */
export function isClassChoiceComplete(cls, keyAbilityPicks, choicePicks = {}) {
  if (!cls) return false;
  return resolveSlots([cls.keyAbility], keyAbilityPicks).missing.length === 0 && choicesComplete(cls.choices, choicePicks);
}

/**
 * The scalar shape derive.mjs's deriveAbilityModifiers consumes
 * (`classKeyAbility`, singular -- not an array like the boost sources).
 * Throws on a missing or illegal choice, same discipline as
 * resolveAncestryIngredients/resolveBackgroundIngredients.
 */
export function resolveClassIngredients(cls, keyAbilityPicks, choicePicks = {}) {
  const { resolved, missing } = resolveSlots([cls.keyAbility], keyAbilityPicks);
  if (missing.length) {
    throw new Error("This class's key ability has not been chosen yet.");
  }
  if (!choicesComplete(cls.choices, choicePicks)) {
    throw new Error("Not every choice this class asks has been made yet.");
  }
  return { classKeyAbility: resolved[0] };
}
