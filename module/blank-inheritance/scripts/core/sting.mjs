/**
 * The arrival sting — the pure half.
 *
 * design/theatre-of-the-mind-staging.md §5: an arrival or departure on the
 * stage is a per-character EVENT, not a page transition, and it comes in a
 * ladder of weights the Director chooses between — Quiet, Announced, Splash.
 * This file owns the shared vocabulary (`STING_TIERS`) and the bottom rung's
 * own logic (`noticeForArrival`, the brass banner). Splash's diff and content
 * logic live in the sibling core/splash.mjs: a presence diff (`diffCast`)
 * cannot express "this already-present member's tier just changed to
 * splash", which is exactly the re-spotlight case Splash has to support, so
 * it gets its own diff rather than this one being bent to do two jobs.
 *
 * WHY THE TIER IS DATA, NOT AN ARGUMENT PASSED AT NOTIFY TIME: the click that
 * reveals someone happens on exactly one client (the Director's), but the
 * banner has to appear on every client at once, driven by the SAME scene
 * document update landing everywhere (the timing rule §5 names explicitly).
 * So the tier the Director chose has to travel WITH the cast member through
 * the Scene flag — see core/stage-layout.mjs's `sting` field on
 * `PUBLISHABLE` — and every client independently decides whether to sound the
 * banner from the data it already received, not from a second message.
 *
 * No Foundry, no DOM, no timers. foundry/sting.mjs owns the queue, the
 * cache, and the plate; this only decides WHO just arrived and WHETHER that
 * arrival should say anything.
 */

/** Quiet is the default (§5's "Rules" list, item 1). Announced and Splash are opt-in per click. */
export const STING_TIERS = Object.freeze({ QUIET: "quiet", ANNOUNCED: "announced", SPLASH: "splash" });

/**
 * Which cast members newly appeared or disappeared between two PUBLISHED
 * casts (i.e. already past Law 11 — see core/stage-layout.mjs#publishedCast).
 *
 * Matched by `portraitId`, which is stable across a reveal/conceal cycle;
 * matching by array position would misfire the instant two members swap
 * sides. Order of the inputs does not matter for correctness, only for the
 * order of the returned arrays, which mirrors `next`/`previous` respectively
 * so a caller processing several arrivals gets them in the order they now
 * appear on stage.
 */
export function diffCast(previous = [], next = []) {
  const previousIds = new Set(previous.map((m) => m.portraitId));
  const nextIds = new Set(next.map((m) => m.portraitId));
  return {
    arrived: next.filter((m) => !previousIds.has(m.portraitId)),
    departed: previous.filter((m) => !nextIds.has(m.portraitId))
  };
}

/**
 * The banner content for one arrival, or `null` if this arrival should stay
 * quiet — which is most of them, by design (§5: "the loud one only works if
 * it is rare").
 *
 * Reads the tier off the member's own `sting` field rather than taking it as
 * a parameter, for the reason in the file header: every client must reach
 * the same answer from the same data, independently.
 */
export function noticeForArrival(member) {
  if (!member?.label || member.sting !== STING_TIERS.ANNOUNCED) return null;
  return { kind: "info", text: `${member.label} has arrived.` };
}

/**
 * Departures never sound the banner, at either tier — this is a deliberate
 * reading of §5's own words ("Someone leaving is information, not an
 * event"), not an oversight. Exported as a named function anyway, rather
 * than simply omitted, so a future change to that rule has one obvious place
 * to make it and one obvious test to update.
 */
export function noticeForDeparture(_member) {
  return null;
}
