/**
 * Which actor a stage card's token should stand for, decided by what is known about who the card is (pure; foundry/stage-figures.mjs
 * asks the world). The order, most real first:
 *
 *   1. a creature that already has a finished statblock (data/campaign/npc-roster.json `existing`: the giant centipedes are the sf2e
 *      compendium's own), so nothing is generated for it;
 *   2. the real NPC actor the content sync made from data/npcs/<id>.json (which carries the generated `statblock`);
 *   3. a basic figure made from the card alone (core/stagecraft-bridge.mjs `basicFace`).
 *
 * A card's id is `summon-<stage id>`. A stage id is the person's own id, except for someone whose name is held back, whose stage id is
 * an opaque alias: the real id is then GM-side only, on the authored cast member as `nameKey`.
 */

/** The flag an imported copy of a creature that already had a statblock carries (the value is the roster's `existing` id). */
export const EXISTING_FLAG = "stagecraftExisting";

/** "summon-nobu" -> "nobu". */
export const stageIdOf = (cardId) => String(cardId ?? "").replace(/^summon-/, "");

/** The id of the NPC a card stands for: the authored member's real key when there is one (a protected person), else the stage id. */
export const npcIdFor = (card, authoredMember = null) => authoredMember?.nameKey ?? stageIdOf(card?.id);

/** The roster's `existing` entry whose card pattern matches this stage id, or null. A malformed pattern matches nothing. */
export function existingFor(stageId, existing) {
  for (const entry of Array.isArray(existing) ? existing : []) {
    try {
      if (new RegExp(entry.cards).test(stageId)) return entry;
    } catch { /* a bad pattern in the roster matches no one */ }
  }
  return null;
}
