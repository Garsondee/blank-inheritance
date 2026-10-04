/**
 * The Scene Runner's view logic — pure, no Foundry.
 *
 * core/scene-brief.mjs decides what a scene IS at any moment (which beats are
 * live, what the clock reads, what DC to post). This file decides what the
 * GM's screen should put in front of them because of it: which beat is the
 * one they are on, which rows are open, where the episode has got to, what a
 * room is called on a button, and which chat roll belongs to which beat.
 *
 * Written for the 2026-09-24 redesign (Ingram: "Reconsider it carefully...
 * it needs to be wider to get more contents on screen"). The old panel showed
 * every beat's full text, read-aloud, direction, notes and outcome stamps all
 * at once, in one 560px column, so the GM was always hunting for their place
 * in a nine-thousand-pixel scroll. The new one shows every beat as ONE LINE
 * and opens the beat the GM is actually on — "one actionable line per beat,
 * detail peekable underneath", which is what Ingram asked for on 2026-09-09
 * and what the old panel never really did.
 */

import { BEAT_STATES, DEGREES } from "./scene-brief.mjs";

/* ---------------------------------------------------------------- */
/*  Where the GM is                                                  */
/* ---------------------------------------------------------------- */

/**
 * The beat the GM is on right now.
 *
 * Only a LIVE beat can be "now" — one that is active, not already done, not
 * waiting on a roll that has not landed, not a road not taken, and not a
 * GM-judged trigger nobody has brought in yet.
 *
 * In order of preference:
 *   1. the beat the GM last ACTED on (posted its check, fired its trigger,
 *      brought it in), while it is still live — tables run scenes out of
 *      order all the time, and the panel follows the GM rather than
 *      insisting on the authored order;
 *   2. the beat that was "now" a moment ago, while it is still live — so
 *      resolving a side beat DURING it (the check a player asks for in the
 *      middle of their private moment) does not yank the marker away from
 *      the beat still being run (found live 2026-09-24, Intake Medicals:
 *      recording "the hand" skipped the marker past "one at a time");
 *   3. the first live beat AFTER the one most recently ticked, so finishing
 *      the beat being run moves the marker on the way a teleprompter scrolls;
 *   4. the first live beat in authoring order.
 *
 * Null when nothing is live, which the panel reads as "the scene is ready to
 * end" (every live beat done) or "waiting on something" (only pending forks).
 */
export function nowBeatId(beats = [], { focusId = null, previousId = null, lastTickedId = null } = {}) {
  const isLive = (beat) => beat?.state === BEAT_STATES.ACTIVE;
  const live = beats.filter(isLive);
  if (!live.length) return null;
  if (focusId && live.some((beat) => beat.id === focusId)) return focusId;
  if (previousId && live.some((beat) => beat.id === previousId)) return previousId;
  if (lastTickedId) {
    const index = beats.findIndex((beat) => beat.id === lastTickedId);
    if (index >= 0) {
      const after = beats.slice(index + 1).find(isLive);
      if (after) return after.id;
    }
  }
  return live[0].id;
}

/**
 * Whether one beat shows its detail (read-aloud, direction, check, notes).
 *
 * A GM's own choice wins in both directions, the same rule the section folds
 * have always followed. Without one, the "now" beat is open and nothing else
 * is — unless the GM has asked to see every beat's detail at once, which is
 * how a script is read the afternoon before, not how it is run.
 *
 * A done beat never opens by itself — once something has happened at the
 * table its read-aloud has been read, and the line striking it through is
 * the whole of what the GM needs from it — with ONE exception: the beat
 * whose outcome was just recorded (`resolvedId`) stays open, because that is
 * the moment the GM needs its consequence text, and folding it away on the
 * very click that chose the consequence would hide the thing they are about
 * to say. It folds when the next beat is resolved.
 */
export function beatDetailOpen(beatId, { nowId = null, resolvedId = null, opened = [], closed = [], showAll = false, done = false } = {}) {
  if (closed.includes(beatId)) return false;
  if (opened.includes(beatId)) return true;
  if (showAll) return true;
  if (resolvedId && beatId === resolvedId) return true;
  return !done && beatId === nowId;
}

/**
 * The GM flipping one row open or shut. Returns new lists rather than
 * mutating, so the caller can keep its own state immutable.
 */
export function toggleDetail(id, isOpen, { opened = [], closed = [] } = {}) {
  const open = new Set(opened);
  const shut = new Set(closed);
  if (isOpen) {
    open.delete(id);
    shut.add(id);
  } else {
    shut.delete(id);
    open.add(id);
  }
  return { opened: [...open], closed: [...shut] };
}

/**
 * Which part of a scene the table is in.
 *
 *   opening — nothing has happened yet; the GM is about to read the room in
 *   running — at least one beat is done and a required one is still to come
 *   ending  — every required beat is done (or ruled out); time to get out
 *
 * The opening and ending sections open themselves in their own phase and
 * fold away otherwise, so the panel reads top to bottom in the order a scene
 * is actually run without the GM scrolling past either.
 */
export function runnerPhase(progress = null, runState = null) {
  const started = Object.keys(runState?.ticked ?? {}).length > 0;
  if (!started) return "opening";
  if (progress?.complete) return "ending";
  return "running";
}

/**
 * When the scene began: the first thing recorded as having happened.
 *
 * `startedAt` is only ever stamped by a plain tick. A scene whose first act
 * was a recorded degree, a choice, or a roll that recorded itself never had
 * it stamped, and its clock silently never started (found reading the
 * handlers for this redesign). The earliest tick on record is the same fact,
 * so it is the fallback.
 */
export function sceneStartedAt(runState = null) {
  if (runState?.startedAt) return runState.startedAt;
  let earliest = null;
  for (const tick of Object.values(runState?.ticked ?? {})) {
    const at = tick?.at;
    if (typeof at === "string" && (!earliest || at < earliest)) earliest = at;
  }
  return earliest;
}

/**
 * Whether the goal box shows in full (2026-10-04).
 *
 * It is read before the scene starts and is then in the way: at 1600x900 the
 * full box and the opening pushed the first beat to the bottom edge of the
 * screen (found running Episode One in the live Runner). Open while nothing
 * has happened; one line (the goal) once the scene is running. The GM's own
 * press wins either way, like the opening's and the ending's.
 */
export function goalOpen(phase, override = null) {
  if (typeof override === "boolean") return override;
  return phase === "opening";
}

/**
 * Whether a GM-judged beat's condition label is worth printing.
 *
 * The label ("someone studies the water first") sits above the beat's own
 * line, and most such lines already open by saying it ("If anyone studies the
 * water before touching anything, offer the check."). Printing both read the
 * same condition twice (found in the live Runner, 2026-10-04). A line that
 * opens on If, When, Once, Unless or Before already carries its condition;
 * so does one that contains the label's words.
 */
export function conditionLabelShown(condition, text) {
  const label = String(condition ?? "").trim();
  if (!label) return false;
  const line = String(text ?? "").replace(/<trig\b[^>]*\/>/gi, "").trim();
  if (/^(if|when|once|unless|before|whenever)\b/i.test(line)) return false;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  return !norm(line).includes(norm(label));
}

/**
 * The stopgap DCs a cast member's card carries (2026-10-04).
 *
 * Until the NPC generator exists, a speaking NPC's `statblock` is one line of
 * prose with the numbers in it ("Proposed: level 3, an officer, non-combat.
 * Perception DC 19, Will DC 19, Deception DC 19."). The card shows them as
 * a row of small pills, so the moment a player lies to him the number is
 * beside his name. An unreadable line returns nothing and the card shows
 * the prose instead.
 */
export function statDcs(statblock) {
  const text = String(statblock ?? "");
  const out = [];
  const seen = new Set();
  const pattern = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) DC (\d+)\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[1];
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, dc: Number(match[2]) });
  }
  const level = /\blevel (-?\d+)\b/i.exec(text);
  return { level: level ? Number(level[1]) : null, dcs: out };
}

/* ---------------------------------------------------------------- */
/*  The episode, and the rooms                                       */
/* ---------------------------------------------------------------- */

/**
 * "Scene N of M" in the header, in the SAME numbers as the running order's
 * own buttons (2026-10-04). Episode One numbers its scenes from 0 (the cold
 * open), so the header used to say "Scene 3 of 12" beside a button marked 2.
 * Null when the scene being read is not in the episode.
 */
export function scenePosition(steps = []) {
  const current = steps.find((step) => step.isCurrent);
  if (!current) return null;
  const last = steps.reduce((max, step) => Math.max(max, Number(step.order) || 0), 0);
  return { n: current.order, total: last };
}

/**
 * The episode's running order as a row of steps.
 *
 * Every scene keeps its cue button (the demo and a GM jumping out of order
 * both need every one), but only the scene being run and the one after it
 * print their titles — the rest are numbers with the title as a tooltip.
 * Eleven titles in a row wrapped onto three lines of header in the old panel;
 * "where am I, what's next" fits on one.
 */
export function episodeSteps(scenes = [], { currentBriefId = null, closedIds = [] } = {}) {
  const ordered = scenes
    .filter((scene) => scene?.briefRef)
    .map((scene, index) => ({ scene, index }))
    .sort((a, b) => (a.scene.order ?? a.index) - (b.scene.order ?? b.index) || a.index - b.index)
    .map(({ scene }) => scene);
  const current = ordered.findIndex((scene) => scene.briefRef === currentBriefId);
  const closed = new Set(closedIds);
  return ordered.map((scene, index) => {
    const isCurrent = index === current;
    const isNext = current >= 0 && index === current + 1;
    return {
      order: scene.order ?? index + 1,
      title: scene.title ?? scene.briefRef,
      briefRef: scene.briefRef,
      isCurrent,
      isNext,
      isClosed: closed.has(scene.briefRef),
      showTitle: isCurrent || isNext
    };
  });
}

/**
 * What a room is called on its own button.
 *
 * Scene documents are named for the Scene Directory ("02a. Intake Medicals —
 * The Examination Room"), where the number sorts them and the brief title
 * groups them. Inside the runner both are already known — the brief's title
 * is the heading above the buttons — so a room button that repeats them is
 * forty characters to say "The Examination Room".
 */
export function roomLabel(sceneName, briefTitle = null) {
  const raw = String(sceneName ?? "").trim();
  let label = raw.replace(/^\d+[a-z]?\.\s*/i, "");
  if (briefTitle) {
    const escaped = String(briefTitle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    label = label.replace(new RegExp(`^${escaped}\\s*[—–-]\\s*`, "i"), "");
  }
  return label.trim() || raw;
}

/* ---------------------------------------------------------------- */
/*  Rolls that come back                                             */
/* ---------------------------------------------------------------- */

/**
 * The roll option a posted check carries so its result can find its way home.
 *
 * sf2e's `@Check[...]` enricher takes an `options:` parameter whose values are
 * added to the roll's own roll options (gamesystems/sf2e/sf2e.mjs, the inline
 * check's `extraRollOptions`), and every roll option is written into the chat
 * message the roll produces (`flags.sf2e.context.options`). So a check posted
 * from a beat can carry that beat's id, and the result a player rolls from it
 * says which beat it answers — no guessing from DCs or skills or timestamps.
 */
export const RUNNER_ROLL_PREFIX = "bi-runner:";

/**
 * Everything in a tag must be safe to put inside an enricher, which parses
 * `|` and `]` as syntax and `,` as a list separator. A brief id is kebab-case
 * with no colon, which is what lets it be read back off the front; a beat id
 * is kebab-case too, and a coercible topic's key adds colons
 * (`shucks-mordant:coercible:0`).
 */
const SAFE_BRIEF = /^[a-z0-9][a-z0-9_-]*$/;
const SAFE_KEY = /^[a-z0-9][a-z0-9:_-]*$/;

/**
 * The tag carries the BRIEF as well as the beat, because beat ids are only
 * unique within their own brief: two scenes in Episode One each have a beat
 * called "the-fight", and a roll posted from one must never land on the other
 * because the GM moved on before the player clicked.
 */
export function runnerRollOption(briefId, key) {
  if (typeof briefId !== "string" || !SAFE_BRIEF.test(briefId)) {
    throw new Error(`Refusing to tag a roll with unsafe brief id ${JSON.stringify(briefId)}.`);
  }
  if (typeof key !== "string" || !SAFE_KEY.test(key)) {
    throw new Error(`Refusing to tag a roll with unsafe key ${JSON.stringify(key)}.`);
  }
  return `${RUNNER_ROLL_PREFIX}${briefId}:${key}`;
}

/** The brief and beat (or topic) key a roll's options carry, or null. */
export function rollTagFromOptions(options = []) {
  if (!Array.isArray(options)) return null;
  for (const option of options) {
    if (typeof option !== "string" || !option.startsWith(RUNNER_ROLL_PREFIX)) continue;
    const rest = option.slice(RUNNER_ROLL_PREFIX.length);
    const split = rest.indexOf(":");
    if (split <= 0) continue;
    const briefId = rest.slice(0, split);
    const key = rest.slice(split + 1);
    if (SAFE_BRIEF.test(briefId) && SAFE_KEY.test(key)) return { briefId, key };
  }
  return null;
}

/** A coercible topic's key, as opposed to a beat's (beat ids never contain a colon). */
export function isTopicKey(key) {
  return typeof key === "string" && key.includes(":coercible:");
}

/**
 * Read one chat message as a check result the runner asked for, or null.
 *
 * Takes plain data (the message's flags, speaker alias, id, timestamp and
 * roll total) rather than a ChatMessage, so it runs in plain Node. Returns
 * null for anything that is not a degree-of-success check tagged by this
 * runner — an ordinary roll, a damage roll, a check with no DC.
 */
export function checkResultFrom({ flags = null, speakerAlias = null, messageId = null, timestamp = null, total = null } = {}) {
  const context = flags?.sf2e?.context ?? flags?.pf2e?.context ?? null;
  if (!context) return null;
  const degree = context.outcome ?? null;
  if (!DEGREES.includes(degree)) return null;
  const tag = rollTagFromOptions(context.options);
  if (!tag) return null;
  return {
    briefId: tag.briefId,
    key: tag.key,
    degree,
    name: speakerAlias ?? null,
    actorId: context.actor ?? null,
    dc: context.dc?.value ?? null,
    total: Number.isFinite(total) ? total : null,
    isReroll: context.isReroll === true,
    messageId,
    at: Number.isFinite(timestamp) ? timestamp : null
  };
}

/**
 * Every tagged result, grouped by key, oldest first — what each beat shows
 * as "who rolled what".
 */
export function resultsByKey(results = []) {
  const byKey = new Map();
  for (const result of results) {
    if (!result?.key) continue;
    if (!byKey.has(result.key)) byKey.set(result.key, []);
    byKey.get(result.key).push(result);
  }
  for (const list of byKey.values()) list.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  return byKey;
}

/**
 * Should a result that just arrived be recorded against its beat by itself?
 *
 * Yes when nothing is recorded yet — the common case, one player rolling the
 * check the GM just posted. Yes too when the same character rerolled (a hero
 * point) the roll that was recorded from them, because the reroll is the
 * result that stands. Otherwise no: a second player's roll on a check that
 * already has an answer is the GM's call, offered as a button, never taken
 * for them.
 */
export function shouldAutoRecord(result, recorded = null) {
  if (!result) return false;
  if (!recorded?.degree && !recorded?.choice) return true;
  return Boolean(result.isReroll && recorded.via === "roll" && recorded.actorId && recorded.actorId === result.actorId);
}

/* ---------------------------------------------------------------- */
/*  Width                                                            */
/* ---------------------------------------------------------------- */

/** The narrowest and widest a dragged drawer may be, as a fraction of the window. */
export const RUNNER_WIDTH_RANGE = Object.freeze({ min: 0.2, max: 0.75 });

/**
 * The CSS for a drawer the GM has dragged to a width, or null for "use the
 * stylesheet's default".
 *
 * Stored as a FRACTION of the window rather than pixels, so a width chosen on
 * one screen means the same thing after a resize. The clamp keeps the old
 * guarantees whatever was stored: never narrower than a readable column, and
 * never so wide that the canvas beside it cannot hold the deck.
 */
export function runnerWidthCss(fraction) {
  const value = Number(fraction);
  if (!Number.isFinite(value) || value <= 0) return null;
  const clamped = Math.min(RUNNER_WIDTH_RANGE.max, Math.max(RUNNER_WIDTH_RANGE.min, value));
  const vw = Math.round(clamped * 1000) / 10;
  return `clamp(400px, ${vw}vw, calc(100vw - 880px))`;
}

/** A drag's pointer position as the fraction runnerWidthCss takes. */
export function widthFractionFrom(pointerX, viewportWidth) {
  const x = Number(pointerX);
  const width = Number(viewportWidth);
  if (!(width > 0) || !Number.isFinite(x)) return null;
  return Math.min(RUNNER_WIDTH_RANGE.max, Math.max(RUNNER_WIDTH_RANGE.min, x / width));
}
