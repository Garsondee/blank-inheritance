/**
 * The Splash tier — the pure half.
 *
 * design/theatre-of-the-mind-staging.md §5's loudest rung: a full-screen
 * character-introduction card, NPC-only, GM-triggered, usable both for a
 * true first appearance and for re-spotlighting someone already on stage.
 * See the plan this was built from for the full design reasoning; this file
 * is the concrete result of it.
 *
 * A DELIBERATE SIBLING TO core/sting.mjs, not an extension of it. Two
 * reasons, both structural rather than stylistic:
 *
 *   `diffCast` is a PRESENCE diff — it can only say "this portraitId appeared
 *   / disappeared". Splash also has to fire when an ALREADY-PRESENT member's
 *   tier changes to `splash` (the re-spotlight case), which a presence diff
 *   is incapable of expressing. `splashArrivals` below is a different kind
 *   of diff on purpose.
 *
 *   `noticeForArrival`'s `{kind, text}` shape has nowhere to put a portrait
 *   image, an accent colour, or a first-appearance flag. `splashContentFor`
 *   returns a richer, different shape for a richer, different consumer.
 *
 * No Foundry, no DOM, no timers. foundry/splash.mjs owns the guard, the
 * settings, and the three-beat DOM lifecycle; this only decides WHO just
 * splashed, WHETHER a repeat splash is real (not an echo of the same click),
 * and WHAT colour and label that splash should carry.
 */

import { STING_TIERS } from "./sting.mjs";

/**
 * Faction id -> the CSS custom property name (already defined in
 * bi-tokens.css) that carries that faction's accent.
 *
 * A hardcoded table, not a `faction.schema.json` field, on purpose: "which
 * colour suits this faction" is a creative call, and CLAUDE.md is explicit
 * that this project's creative calls are not automated on the user's
 * behalf. One line per faction is the whole cost of extending it — that
 * already satisfies "extensible" at today's scale (one real case). Revisit
 * as a data-driven field only once this table has grown enough that hand-
 * editing it feels like the wrong home for the decision, not before.
 *
 * Deliberately does NOT pre-add a `claimant` entry: no faction file with
 * that id exists in data/factions/ yet, so nothing can legitimately set
 * `faction: "claimant"` on a cast member today. Add the line the day that
 * stops being true.
 */
export const FACTION_ACCENTS = Object.freeze({
  directorate: "--bi-vermilion"
});

/** The accent token for a faction id, or `null` — null means stay monochrome. */
export function factionAccent(factionId) {
  return FACTION_ACCENTS[factionId] ?? null;
}

/**
 * A display label for a faction id when the faction's own `name` is a
 * naming placeholder (true today: data/factions/directorate.json's `name`
 * is `null`, tracked by `namingPlaceholderRef: "directorate-name"`).
 *
 * Titlecasing the id is a working stand-in, not new invented content — the
 * same kind of placeholder-safe fallback the rest of this codebase already
 * relies on rather than surfacing `null`/`undefined` on screen.
 */
export function affiliationLabel(factionId) {
  if (!factionId) return null;
  return factionId
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Has this specific character ever been splashed before, in this world?
 *
 * Trivial, but kept here and exported anyway (matching this file's own
 * habit — see core/sting.mjs#noticeForDeparture) because it is a real,
 * independently testable piece of the "first appearance" rule, and because
 * the caller (foundry/splash.mjs) should never have to open-code the
 * inverse of an `includes` check.
 */
export function isFirstSplash(portraitId, everSplashedIds = []) {
  return !everSplashedIds.includes(portraitId);
}

/**
 * Which PUBLISHED cast members should splash right now, between two
 * observations of the same scene's cast.
 *
 * Two conditions, both required:
 *
 *   `sting === "splash"` AND `kind === "npc"`. The kind check is DEFENSE IN
 *   DEPTH, not the primary gate — Splash is meant to be offered only via the
 *   frame's own splash key, which the template only ever renders for an NPC
 *   frame (design decision, not enforced here) — but a diff that trusted
 *   the UI to have been the only path in would be one hand-edited flag away
 *   from putting a PC on a Splash screen, which the user was explicit must
 *   never happen. This function refuses that regardless of how the data
 *   arrived.
 *
 *   A REAL TRANSITION happened: either the member was absent from
 *   `previous` entirely (first-ever splash), or it was present with a
 *   DIFFERENT `stingSeq` (the deliberate re-spotlight case). Comparing
 *   `sting` alone would miss every repeat splash silently — `setRevealed`'s
 *   write is otherwise byte-identical to the one before it (`revealed: true`
 *   is already true, `sting: "splash"` is already "splash"), and there is no
 *   guarantee Foundry re-broadcasts a document update whose diff is empty.
 *   `stingSeq` (a fresh timestamp stamped on every `setRevealed` call) is
 *   what turns "the data looks the same" into "a new event actually
 *   happened" — see core/stage-layout.mjs's `PUBLISHABLE` for where it
 *   travels, and the mutation test below for what breaks without it.
 *
 * Matched by portraitId, same reasoning as diffCast: position is not identity.
 */
export function splashArrivals(previous = [], next = []) {
  const previousById = new Map(previous.map((member) => [member.portraitId, member]));
  return next.filter((member) => {
    if (member.sting !== STING_TIERS.SPLASH || member.kind !== "npc") return false;
    const before = previousById.get(member.portraitId);
    return !before || before.stingSeq !== member.stingSeq;
  });
}

/**
 * The full-screen card's content for one member, or `null` if there is
 * nothing safe to show (mirrors noticeForArrival's own guard: no label, no
 * card — there is nothing here worth a full-screen takeover over).
 *
 * Reads faction/label/img straight off the member, which is already the
 * PUBLISHED shape (past core/stage-layout.mjs#publishedCast's Law 11
 * boundary) by the time this runs — this function adds no new redaction
 * concern of its own, it only reshapes what was already safe to send.
 */
export function splashContentFor(member, everSplashedIds = []) {
  if (!member?.label) return null;
  const faction = member.faction ?? null;
  return {
    portraitId: member.portraitId,
    label: member.label,
    img: member.img ?? null,
    affiliationLabel: affiliationLabel(faction),
    accentToken: factionAccent(faction),
    firstAppearance: isFirstSplash(member.portraitId, everSplashedIds)
  };
}
