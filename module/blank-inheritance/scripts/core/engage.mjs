/**
 * The frame engage — the pure half.
 *
 * design/theatre-of-the-mind-staging.md §5's MIDDLE rung: the frame's own
 * entrance, without taking the screen. "A character should arrive the way a
 * piece of equipment engages — with a servo's authority, not a web page's
 * fade." Four treatments, bound to what the arrival MEANS rather than
 * picked at random, so the motion itself becomes a language the table
 * learns:
 *
 *   Engage  — the ordinary arrival. Most people, most scenes.
 *   Shutter — Directorate business, someone arriving in an official capacity.
 *   Alert   — a hostile or unwelcome arrival.
 *   Signal  — anything touching a Claimant.
 *
 * This file decides WHICH treatment a newly-arrived member gets and WHO
 * counts as newly arrived. foundry/stage.mjs owns the CSS trigger (a
 * `data-entrance` attribute, set only for the render a member actually
 * arrives on) and the instance-level memory of "what did I last render"
 * that makes the diff possible.
 */

import { diffCast } from "./sting.mjs";

/** The four treatments. Frozen so a typo in a caller throws instead of silently doing nothing. */
export const ENTRANCE_KINDS = Object.freeze({
  ENGAGE: "engage",
  SHUTTER: "shutter",
  ALERT: "alert",
  SIGNAL: "signal"
});

const KNOWN_KINDS = new Set(Object.values(ENTRANCE_KINDS));

/**
 * Faction id -> entrance kind. A hardcoded table, same reasoning and same
 * shape as core/splash.mjs#FACTION_ACCENTS: which motion suits a faction is
 * a creative call, not something to automate from a colour or a vibe, and a
 * two-line table already covers today's real case. Extend it the day a
 * faction genuinely earns a different treatment.
 *
 * Alert and Signal have NO faction mapping here on purpose — "hostile" and
 * "touches a Claimant" are not properties any faction has by default (a
 * Directorate NPC can still turn hostile in a given scene), so both stay
 * reachable ONLY via an explicit `member.entrance` override until this
 * project has a real per-scene disposition or Claimant-tag signal to read
 * instead of guessing at one.
 */
const FACTION_ENTRANCES = Object.freeze({
  directorate: ENTRANCE_KINDS.SHUTTER
});

/**
 * Which treatment a member's arrival should use.
 *
 * An explicit `member.entrance` always wins — same precedence rule as a
 * cast entry's explicit `side` in core/stage-layout.mjs#stageGroups: a
 * Director who has authored a specific entrance has made a directing
 * decision, and derived defaults must not override it. An unrecognised
 * override value is IGNORED rather than thrown on — the render must not
 * break because of a typo in hand-authored data — and falls through to the
 * ordinary derivation below.
 */
export function entranceFor(member) {
  if (member?.entrance && KNOWN_KINDS.has(member.entrance)) return member.entrance;
  return FACTION_ENTRANCES[member?.faction] ?? ENTRANCE_KINDS.ENGAGE;
}

/**
 * Which published cast members are newly arriving between two observations,
 * each carrying the treatment their entrance should play.
 *
 * Reuses core/sting.mjs#diffCast's presence diff directly rather than
 * reimplementing it — this is the exact same question ("who newly appeared
 * in the published cast, matched by portraitId") sting/splash both already
 * answer, just consumed for a third purpose. Order mirrors `next`, same
 * convention as diffCast and splashArrivals.
 */
export function engageArrivals(previous = [], next = []) {
  const { arrived } = diffCast(previous, next);
  return arrived.map((member) => ({ portraitId: member.portraitId, entrance: entranceFor(member) }));
}
