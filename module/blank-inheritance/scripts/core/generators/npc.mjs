import { deriveFoundryId } from "../ids.mjs";
import { sheetNotes } from "../actor-notes.mjs";
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
 *    stats.
 *
 * BOTH branches then get the sheet's notes from core/actor-notes.mjs (D080,
 * 2026-10-07; before it, a statblock-less NPC's `description` was written
 * into details.blurb and details.publicNotes, and a statblock NPC's sheet
 * said nothing at all): details.blurb is one line built from the source's
 * role and affiliation, details.publicNotes is that same line and never a
 * fact (a player may be able to read public notes), and details.privateNotes
 * is the GM-only text generated from canon, passed in as `notes` (the
 * person's entry in data/campaign/actor-notes.json). With no entry the Actor
 * carries its blurb only. A statblock's own flavorText/notes, if anyone ever
 * authors them, still win over the generated blurb/public notes: they were
 * written for this sheet.
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
 *
 * `portraitImage`, likewise optional and caller-resolved (tools/token-ring/
 * stage_npc_portraits.py's output, an UNCROPPED resize of the same registered
 * portrait), is written to the Actor's own top-level `img` — a field nothing
 * in this pipeline set before 2026-09-29, so every NPC Actor defaulted to
 * Foundry's mystery-man silhouette on its sheet, in the Actors directory, and
 * in the Theatre-of-Mind character frame's `actor.img` fallback
 * (design/theatre-of-the-mind-staging.md §7: "the frames can render
 * Foundry's own `actor.img`, which is already correct plumbing"). Distinct
 * from `tokenImage` on purpose: the ring wants a circle-cropped square
 * subject, `img` wants the ordinary rectangular portrait a sheet or frame
 * actually looks right with.
 *
 * `notes` is likewise optional and caller-resolved: this person's entry from
 * data/campaign/actor-notes.json (foundry/sync.mjs fetches the file once per
 * sync), or null/omitted when the file is missing or does not list them.
 */
export async function buildNpcActorData(source, { tokenImage = null, portraitImage = null, notes = null } = {}) {
  const id = await deriveFoundryId(source.id);
  const prototypeToken = {
    ring: resolveTokenRing("npc", source),
    ...(tokenImage ? { texture: { src: tokenImage } } : {})
  };

  const { system, items } = buildCombatStatblockSystemData(source.statblock ?? {});
  applySheetNotes(system.details, sheetNotes(source, notes));

  return {
    _id: id,
    name: source.name ?? source.id,
    type: "npc",
    system,
    items,
    prototypeToken,
    ...(portraitImage ? { img: portraitImage } : {})
  };
}

/**
 * Write the generated notes into the sheet's details. The blurb and public notes only where the statblock mapping left them
 * empty (its own flavorText/notes win); the private notes only when there are some, so a sheet canon has nothing to say about
 * keeps exactly the fields the statblock mapping gave it.
 */
function applySheetNotes(details, { blurb, publicNotes, privateNotes }) {
  if (!details.blurb && blurb) details.blurb = blurb;
  if (!details.publicNotes && publicNotes) details.publicNotes = publicNotes;
  if (privateNotes) details.privateNotes = privateNotes;
}
