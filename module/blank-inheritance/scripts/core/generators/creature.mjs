import { deriveFoundryId } from "../ids.mjs";
import { buildCombatStatblockSystemData } from "./combat-statblock.mjs";

/**
 * creature.schema.json (combatStatblock) -> sf2e "npc" Actor.
 * NPCs store flat final numbers directly (confirmed against real sf2e
 * compendium data), so this is a straightforward field mapping — the
 * "easy" case relative to PCs, see character.mjs.
 *
 * The actual combatStatblock -> {system, items} mapping lives in
 * combat-statblock.mjs, shared with npc.mjs's statblock branch — see that
 * file's header for why. This wrapper only adds the id/name/type envelope
 * that's specific to a standalone creature.schema.json instance.
 *
 * Pure: no Foundry globals. Every field path this writes is checked
 * against gamesystems/sf2e/template.json by test/tier3-contract.test.mjs.
 */
export async function buildCreatureActorData(source) {
  const id = await deriveFoundryId(source.id);
  const { system, items } = buildCombatStatblockSystemData(source);

  return {
    _id: id,
    name: source.name ?? source.id,
    type: "npc",
    system,
    items
  };
}
