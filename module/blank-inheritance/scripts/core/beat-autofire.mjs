/**
 * One press per moment -- pure, no Foundry.
 *
 * Starting The Road In took three presses and a confirm (found running
 * Episode One in the live Runner, 2026-10-04): the objective chip, the beat's
 * read, then Show the table for the letter -- and ticking the beat never gave
 * the objective at all. The chips are still there to press at the exact word;
 * this decides what happens by itself when the GM does the larger thing:
 *
 *   - showing a beat's handout gives the objective that same beat gives
 *     (the letter IS the enrolment order; Kit Issue's docket IS the errand);
 *   - marking a beat done fires its objective chips that have not been
 *     pressed yet, in authored order: give, tick, reveal, strike, close.
 *     A check beat only fires them on a pass, because "Drains: line powered"
 *     is not true on a failed power check;
 *   - un-marking that beat undoes what marking it did, where an undo exists
 *     (a tick or a strike is unticked, a close is reopened). A given
 *     objective and a revealed part stay: the players have already seen them.
 *
 * Entrances, name reveals and handouts are never fired by a tick: their
 * timing is the drama, and only the GM knows the moment (Ingram's split of
 * automatic and manual, 2026-10-04).
 */

import { PASSING } from "./runner-party.mjs";

/** The acts a tick may fire by itself, and what undoes each one (null: nothing can). */
export const UNDO_ACT = Object.freeze({ give: null, tick: "untick", reveal: null, strike: "untick", close: "reopen" });

// A chip authored `auto: false` depends on how it went (in by nineteen
// hundred, wearing the waders) and only ever fires when pressed.
const objectiveChips = (beat) =>
  (beat?.triggers ?? []).filter((t) => t?.kind === "objective" && t.objectiveRef && t.act in UNDO_ACT && t.auto !== false);

/**
 * The beat's objective chips that fire when it is marked done.
 *
 * `degree` is the result the beat was recorded at, if it is a check: only a
 * pass fires anything. `fired` holds the ids of chips already pressed by hand
 * (the session log) or fired before, which never fire twice.
 */
export function chipsToFireOnDone(beat, { degree = null, fired = new Set() } = {}) {
  if (degree && !PASSING.includes(degree)) return [];
  return objectiveChips(beat).filter((t) => !fired.has(t.id));
}

/**
 * The `give` chips on the beat a handout was shown from. A handout shown from
 * the Kit list (not from a beat) is matched to the beat that names it.
 */
export function chipsToFireOnHandout(beats = [], handoutId, { beatId = null, fired = new Set() } = {}) {
  const beat =
    (beatId && beats.find((b) => b.id === beatId)) ||
    beats.find((b) => b.handoutRef === handoutId) ||
    beats.find((b) => (b.triggers ?? []).some((t) => t.kind === "reveal-handout" && t.handoutRef === handoutId)) ||
    null;
  if (!beat) return { beat: null, chips: [] };
  return { beat, chips: objectiveChips(beat).filter((t) => t.act === "give" && !fired.has(t.id)) };
}

/**
 * What un-marking a beat should undo, newest first: the acts its own tick
 * fired and recorded on its stamp (`ticked[beatId].fired`).
 */
export function undoFor(fired = []) {
  return [...(fired ?? [])]
    .reverse()
    .map((entry) => ({ ...entry, undo: UNDO_ACT[entry?.act] ?? null }))
    .filter((entry) => entry.undo);
}

/** The trigger ids already pressed on one beat, read from the session log's subjects. */
export function firedTriggerIds(entries = [], beatId) {
  const prefix = `${beatId}::trigger::`;
  const ids = new Set();
  for (const entry of entries ?? []) {
    const subject = entry?.context?.subject;
    if (typeof subject === "string" && subject.startsWith(prefix)) ids.add(subject.slice(prefix.length));
  }
  return ids;
}
