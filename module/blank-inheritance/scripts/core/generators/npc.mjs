import { deriveFoundryId } from "../ids.mjs";
import { buildCombatStatblockSystemData } from "./combat-statblock.mjs";
import { resolveTokenRing } from "./token-ring.mjs";

/**
 * npc.schema.json -> sf2e "npc" Actor.
 *
 * Most Directorate NPCs are purely social/narrative and never carry a
 * `statblock` at all (npc.schema.json's own doc comment) — forcing them
 * through combat-stat defaults would mean inventing numbers nobody authored.
 * So this generator branches on whether one is present:
 *
 *  - source.statblock present: IDENTICAL mapping to creature.mjs's
 *    buildCreatureActorData, via the shared buildCombatStatblockSystemData —
 *    npc.schema.json's `statblock` and creature.schema.json both `$ref` the
 *    exact same combatStatblock def (common/sf2e-common.schema.json), so the
 *    two must produce the exact same Actor shape from the same input.
 *
 *  - source.statblock absent/null: a minimal but real, valid sf2e "npc"
 *    Actor, built from that SAME mapping fed an empty statblock ({}) rather
 *    than a second, hand-rolled set of magic numbers. That's exactly
 *    buildCreatureActorData's own already-tested "sensible defaults when
 *    optional fields are absent" behaviour (AC 10, 1 HP, level 0, zero
 *    items/strikes — see tier1-generators.test.mjs). HP 1 rather than 0 is
 *    deliberate: 0 HP reads as dead/defeated on an npc-type Actor's sheet,
 *    which is wrong for a living NPC who simply has no authored combat
 *    stats. `details.blurb`/`details.publicNotes` are then overridden from
 *    `source.description` — the one piece of real prose a statblock-less
 *    NPC actually has, and the closest equivalent to a creature's
 *    flavorText/notes.
 *
 * _id via deriveFoundryId, same convention as every other generator. Pure:
 * no Foundry globals. Every field path this writes under `system`/`items` is
 * checked against gamesystems/sf2e/template.json by test/tier3-contract.test.mjs;
 * `prototypeToken.ring` is core Foundry document schema instead, checked by
 * that same file's token-ring contract test.
 *
 * `tokenImage` is an optional Foundry-relative path to an already
 * circle-cropped portrait (tools/token-ring/'s output) — the caller's job to
 * resolve (via data/campaign/asset-registry.json), not this generator's, so
 * it stays a pure function of its arguments. Every NPC gets a Dynamic Ring
 * regardless of whether one is supplied (Ingram 2026-09-18: permanent,
 * automatic, faction-colored by `resolveTokenRing`) — a still-uncast
 * placeholder NPC just renders it around Foundry's own default token art.
 * `tokenImage`, when given, is written to `prototypeToken.texture.src` — the
 * token's own base art field, not `ring.subject.texture` (see token-ring.mjs's
 * header for why that distinction is load-bearing, found live 2026-09-18).
 */
export async function buildNpcActorData(source, { tokenImage = null } = {}) {
  const id = await deriveFoundryId(source.id);
  const prototypeToken = {
    ring: resolveTokenRing("npc", source),
    ...(tokenImage ? { texture: { src: tokenImage } } : {})
  };

  if (source.statblock) {
    const { system, items } = buildCombatStatblockSystemData(source.statblock);
    return {
      _id: id,
      name: source.name ?? source.id,
      type: "npc",
      system,
      items,
      prototypeToken
    };
  }

  const { system, items } = buildCombatStatblockSystemData({});
  system.details.blurb = source.description ?? "";
  system.details.publicNotes = source.description ?? "";

  return {
    _id: id,
    name: source.name ?? source.id,
    type: "npc",
    system,
    items,
    prototypeToken
  };
}
