/**
 * Pure boost/flaw choice-slot resolution, shared by every induction-terminal
 * page that grants ability boosts against Player Core's "some fixed, some
 * free" slot shape -- originally written for Page 2 (ancestry), extracted
 * here 2026-09-10 when Page 3 (background) needed the exact same logic
 * against a different catalogue. Turns a player's picks into the flat
 * ability-key lists tools/character-builder/derive.mjs's
 * deriveAbilityModifiers already expects -- no chargen math here, only
 * choice resolution.
 *
 * Player Core's "different ability score" rule (pg. 18) only constrains
 * boosts/flaws granted AT THE SAME TIME -- an ancestry's own slots, or a
 * background's own slots, never against each other. So a caller simply
 * calls these functions once per source (ancestry.boosts, then separately
 * background.boosts, etc.) with that source's own slots array; nothing here
 * needs to know about any other source's picks.
 */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

/** A slot naming exactly one ability is fixed; the player has no choice to make. */
export function isFixedSlot(slot) {
  return slot.length === 1;
}

/**
 * Resolve one source's (an ancestry's, a background's) boost OR flaw slots
 * against a player's picks.
 *
 * `picks` is parallel to the FREE slots only, in the order they appear in
 * `slots` -- a fixed slot consumes no entry, because the template never
 * renders a picker for one. This is the shape a page that only shows
 * pickers for the slots that actually need one naturally produces.
 */
export function resolveSlots(slots, picks = []) {
  // Assigned BY INDEX, never pushed: a caller (e.g. Page 2's decorateSlots)
  // reads resolved[slotIndex] back to know what a specific slot currently
  // shows, including while other slots are still unresolved. push() would
  // silently compact around a still-missing slot -- harmless once every
  // slot is filled (the two are identical arrays then), but WRONG
  // mid-choice: pick a later free slot before an earlier one and every slot
  // from the gap onward reads one position short, showing the wrong
  // ability as "picked". Found by trace, not live -- see the mid-choice
  // regression test in test/tier1-induction-ancestry.test.mjs.
  let pickIndex = 0;
  const resolved = [];
  const missing = [];
  slots.forEach((slot, slotIndex) => {
    if (isFixedSlot(slot)) {
      resolved[slotIndex] = slot[0];
      return;
    }
    const pick = picks[pickIndex];
    pickIndex += 1;
    if (pick == null) {
      missing.push(slotIndex);
      return;
    }
    if (!slot.includes(pick)) {
      throw new Error(`"${pick}" is not a legal choice for this slot (allowed: ${slot.join(", ")}).`);
    }
    resolved[slotIndex] = pick;
  });
  return { resolved, missing };
}

/**
 * Which abilities a free slot may NOT pick, because some other slot in the
 * SAME `slots` list (a fixed sibling, or a different free slot already
 * resolved) has already claimed it.
 *
 * Player Core pg. 18: "If you're applying two or more boosts at the same
 * time... you must apply each of these boosts to a different ability
 * score" -- a source's fixed boosts and its own free boost are all granted
 * together, so the free one can never legally duplicate a fixed sibling's
 * ability either, not just another free slot's pick. Same rule for flaws.
 * Found live 2026-09-09 (ancestry): nothing enforced this, so Human's two
 * fully-free boost slots could both be pointed at "str", silently
 * producing an illegal +2 once fed to derive.mjs.
 */
export function claimedAbilities(slots, picks, excludeSlotIndex) {
  const { resolved } = resolveSlots(slots, picks);
  const claimed = new Set();
  resolved.forEach((ability, slotIndex) => {
    if (ability != null && slotIndex !== excludeSlotIndex) claimed.add(ability);
  });
  return claimed;
}
