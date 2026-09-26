import { deriveFoundryId } from "../ids.mjs";
import { buildCombatStatblockSystemData } from "./combat-statblock.mjs";
import { resolveTokenRing } from "./token-ring.mjs";

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
 * Pure: no Foundry globals. Every field path this writes under
 * `system`/`items` is checked against gamesystems/sf2e/template.json by
 * test/tier3-contract.test.mjs; `prototypeToken.ring` is core Foundry
 * document schema instead — see token-ring.mjs's own header. `tokenImage`
 * (optional, caller-resolved) selects a circle-cropped portrait, written to
 * `prototypeToken.texture.src` (the token's own base art, not
 * `ring.subject.texture` — see token-ring.mjs's header). resolveTokenRing
 * colors the ring violet automatically for anything carrying the "claimant"
 * trait (module/.../bi-tokens.css already reserves that color for "Claimant
 * telemetry" — applying an existing decision, not inventing one), amber
 * otherwise.
 */
export async function buildCreatureActorData(source, { tokenImage = null } = {}) {
  const id = await deriveFoundryId(source.id);
  const { system, items } = buildCombatStatblockSystemData(source);

  return {
    _id: id,
    name: source.name ?? source.id,
    type: "npc",
    system,
    items,
    prototypeToken: {
      ring: resolveTokenRing("creature", source),
      ...(tokenImage ? { texture: { src: tokenImage } } : {})
    }
  };
}
