/**
 * Foundry v14's core Dynamic Token Ring config for an Actor's prototype
 * token — common/documents/token.mjs's `ring` field (enabled, colors.ring,
 * colors.background, effects bitmask, subject.{texture,scale}). This is
 * core Foundry document schema, not sf2e's — it has no home in
 * combat-statblock.mjs or template.json, which is why it gets its own file.
 *
 * The RING STYLE (bronze vs steel) is deliberately NOT set here: verified
 * against source (client/canvas/placeables/tokens/ring-config.mjs), it is a
 * single world setting, not a per-token field — see foundry/token-ring-style.mjs.
 * What DOES vary per actor is the ring's own color (faction identification,
 * Ingram 2026-09-18) and which portrait, if any, sits inside it.
 *
 * Decided 2026-09-18, permanent: every Actor this pipeline creates gets a
 * ring, automatically, with Ring Pulse on. There is no "off" switch here on
 * purpose — an uncast placeholder NPC with no assigned portrait still gets a
 * ring around Foundry's own default token art (confirmed live: with no
 * explicit subject.texture, sf2e's own world-default grid fit-mode shrinks
 * the base image to sit inside the ring correctly, no extra work needed).
 *
 * `ring.subject.texture` is DELIBERATELY never set here (always null) —
 * found live, 2026-09-18: it is not "the portrait to show," it is an
 * ADVANCED override for a subject distinct from the token's own base art
 * (`TokenDocument#hasDistinctSubjectTexture`, client/documents/token.mjs).
 * Setting it while leaving the token's own `texture.src` at Foundry's
 * default produced a real, visible bug the first time this ran against a
 * live world: the default mystery-man icon rendered ON TOP of the assigned
 * portrait, because the icon was still the actual displayed token art and
 * the "subject" was a second, mostly-hidden layer underneath it. The
 * correct, simple mechanism — proven live by Contact Unclassified's default
 * icon, which rendered its ring perfectly with no ring-specific texture work
 * at all — is: put the (already circle-cropped, transparent-cornered)
 * portrait directly on `prototypeToken.texture.src`, the SAME field every
 * token's art has always lived on, and let the world's existing grid
 * fit-mode auto-shrink it to sit correctly inside the ring, exactly as it
 * already does for a default icon. See npc.mjs/creature.mjs/character.mjs
 * for where `texture.src` actually gets set.
 */

/**
 * client/canvas/placeables/tokens/ring.mjs's `TokenRing.effects` bitmask,
 * copied here as the source of truth for this project rather than only
 * existing as an opaque `3` at each call site. Bitwise-OR to combine, same
 * pattern as this project's own Tile.occlusion.modes usage elsewhere.
 */
export const RING_EFFECTS = Object.freeze({
  DISABLED: 0x00,
  ENABLED: 0x01,
  RING_PULSE: 0x02,
  RING_GRADIENT: 0x04,
  BKG_WAVE: 0x08,
  INVISIBILITY: 0x10, // core's own label: "Spectral Pulse"
  COLOR_OVER_SUBJECT: 0x20
});

/**
 * Straight out of module/blank-inheritance/styles/bi-tokens.css §4 rather
 * than invented here: vermilion is already documented there as "the
 * Directorate's own accent," and resonance violet is already reserved there
 * for "Claimant telemetry" specifically — this is applying an existing
 * decision, not making a new one. Cyan ("sensors, comms, targeting") reads
 * as an IFF-style friendly marker for the party's own kids/Frames. Amber is
 * the palette's caution/neutral color, used here as the fallback for
 * anything with no more specific affiliation yet.
 */
export const RING_HEX = Object.freeze({
  directorate: "#be3219",
  claimant: "#a986e8",
  party: "#4fc8d8",
  neutral: "#f0a830"
});

/** bi-steel-900 — a recessed-well dark, behind every ring regardless of faction, so only the ring's own hue carries the identification. */
const RING_BACKGROUND_HEX = "#121615";

function ringColorForNpc(source) {
  return source?.affiliation === "directorate" ? RING_HEX.directorate : RING_HEX.neutral;
}

function ringColorForCreature(source) {
  return Array.isArray(source?.traits) && source.traits.includes("claimant") ? RING_HEX.claimant : RING_HEX.neutral;
}

/**
 * `kind` is which generator is calling ("npc" | "creature" | "character"),
 * since the three entity schemas carry faction information differently (an
 * npc's `affiliation`, a creature's `traits`, or — for a kid/Frame — nothing
 * at all, because every character.mjs source IS the player party).
 */
export function resolveTokenRing(kind, source) {
  const ring =
    kind === "creature" ? ringColorForCreature(source) :
    kind === "character" ? RING_HEX.party :
    ringColorForNpc(source);

  return {
    enabled: true,
    colors: { ring, background: RING_BACKGROUND_HEX },
    effects: RING_EFFECTS.ENABLED | RING_EFFECTS.RING_PULSE,
    subject: { scale: 1, texture: null }
  };
}
