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
 */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

/** A slot naming exactly one ability is fixed; the player has no choice to make. */
export function isFixedSlot(slot) {
  return slot.length === 1;
}

/**
 * Resolve one ancestry's boost OR flaw slots against a player's picks.
 *
 * `picks` is parallel to the FREE slots only, in the order they appear in
 * `slots` -- a fixed slot consumes no entry, because the template never
 * renders a picker for one. This is the shape a page that only shows
 * pickers for the slots that actually need one naturally produces.
 */
export function resolveSlots(slots, picks = []) {
  // Assigned BY INDEX, never pushed: a caller (Page 2's decorateSlots) reads
  // resolved[slotIndex] back to know what a specific slot currently shows,
  // including while other slots are still unresolved. push() would silently
  // compact around a still-missing slot -- harmless once every slot is
  // filled (the two are identical arrays then), but WRONG mid-choice: pick
  // a later free slot before an earlier one and every slot from the gap
  // onward reads one position short, showing the wrong ability as "picked".
  // Found by trace, not live -- see the mid-choice regression test below.
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
  return {
    terrestrial: ancestries.filter((a) => a.terrestrial),
    alienCoded: ancestries.filter((a) => !a.terrestrial)
  };
}

/** Case-insensitive substring match on name, for Page 2's live filter box. Empty/blank query matches everything. */
export function filterAncestries(ancestries, query) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return ancestries;
  return ancestries.filter((a) => a.name.toLowerCase().includes(q));
}
