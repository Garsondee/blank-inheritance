/**
 * The scene runner's arithmetic — pure logic only.
 *
 * A scene brief (data/schema/scene-brief.schema.json) is authored prose plus a
 * checklist. Almost all of it renders straight through. This file owns the
 * three parts that are decisions rather than text:
 *
 *   - which beats should be on screen right now, given what has already
 *     happened (that is what makes a branch a branch);
 *   - what a visible clock currently reads, given what has been spent on it;
 *   - what DC to actually post when a hidden, GM-only modifier applies.
 *
 * No Foundry, no DOM, no storage. foundry/scene-runner.mjs decides where run
 * state lives and what a click does; this decides what any of it means.
 */

/** A beat's fundamental kind. `action` is the default and by far the commonest. */
export const BEAT_KINDS = Object.freeze({ ACTION: "action", CHECK: "check", REVEAL: "reveal" });

/**
 * Who receives a beat. `solo` is the one that earns its keep: the alternative
 * a GM reaches for otherwise is a separate chat channel, which strands the
 * rest of the table for as long as it takes.
 */
export const DELIVERY = Object.freeze({ TABLE: "table", SOLO: "solo", PASSIVE: "passive" });

/**
 * SF2E's real degrees. FOUR, never five — a plain Failure with no listed
 * effect is what reads as "neutral" at the table, and inventing a fifth rung
 * was corrected out of ideas/entries/dialogue-management-panel.json once it
 * was checked against real Diplomacy/Intimidation actions.
 */
export const DEGREES = Object.freeze(["criticalSuccess", "success", "failure", "criticalFailure"]);

/**
 * What a beat is doing on screen right now.
 *
 * `pending` and `notTaken` are why this is a state rather than a boolean. A GM
 * reading ahead wants to see BOTH sides of a fork before the roll lands — "if
 * he gets through to Kudo… if he doesn't…" is prep, and hiding half of it
 * until the dice decide makes the panel useless for the ten seconds when it
 * matters most. Once the roll does land, the road not taken stays visible but
 * struck through, because what didn't happen is part of what happened.
 */
export const BEAT_STATES = Object.freeze({
  DONE: "done",
  ACTIVE: "active",
  PENDING: "pending",
  CONDITIONAL: "conditional",
  NOT_TAKEN: "notTaken"
});

/** A run with nothing done yet. Shape is the contract for the stored world setting. */
export function emptyRunState() {
  return { ticked: {}, spent: [], opened: [], granted: [], topics: {}, adjust: {} };
}

function runStateOf(runState) {
  return {
    ticked: runState?.ticked ?? {},
    spent: Array.isArray(runState?.spent) ? runState.spent : [],
    opened: Array.isArray(runState?.opened) ? runState.opened : [],
    granted: Array.isArray(runState?.granted) ? runState.granted : [],
    // Which coercible topic last landed on which degree (design doc §10.7's
    // Cast drawer: "one-click DC-plus-degree-of-success recording per
    // subject"). Deliberately its own bag, not folded into `ticked` -- a
    // topic is a side conversation, never a beat that gates branching, and
    // conflating the two would make a topic's outcome silently participate in
    // beat-branch logic it has nothing to do with. `?? {}` guards a run
    // stored before this field existed.
    topics: runState?.topics ?? {},
    // The GM's own hand on a clock, by pool id (2026-09-24): +1 when the
    // compactor grinds another round, -1 when the table buys time back. A
    // clock whose subsystem authors no spends (the Compactor Cycle has none)
    // had no way to move at all in the runner before this.
    adjust: runState?.adjust && typeof runState.adjust === "object" ? runState.adjust : {}
  };
}

/**
 * The artefacts this scene can hand over, and whether the party has them yet.
 *
 * Granting is one-way on purpose. An artefact is a permanent possession — the
 * players can re-read it in Chapter 7 and find the thing they walked past in
 * Chapter 1 — so there is no ungrant here and none in the adapter either.
 * Un-showing something six people have already read is not a thing software
 * can do, and pretending otherwise would be the dangerous kind of button.
 */
export function artefactsWithState(brief, runState) {
  const granted = new Set(runStateOf(runState).granted);
  return (brief?.artefacts ?? []).map((artefact) => ({
    ...artefact,
    clearance: artefact.clearance ?? 0,
    granted: granted.has(artefact.id)
  }));
}

/**
 * A scene's artefacts grouped into redaction chains.
 *
 * Several artefacts sharing a `documentRef` are the same document at different
 * clearance levels. Sorted low to high so the panel can show what the party
 * holds and what the next rung would get them, side by side.
 */
export function redactionChains(brief) {
  const chains = new Map();
  for (const artefact of brief?.artefacts ?? []) {
    const key = artefact.documentRef ?? artefact.id;
    if (!chains.has(key)) chains.set(key, []);
    chains.get(key).push(artefact);
  }
  for (const versions of chains.values()) {
    versions.sort((a, b) => (a.clearance ?? 0) - (b.clearance ?? 0));
  }
  return chains;
}

/** Authored beats are sparse on purpose; this is where the defaults live. */
export function normalizeBeat(beat = {}) {
  return {
    ...beat,
    kind: beat.kind ?? BEAT_KINDS.ACTION,
    delivery: beat.delivery ?? DELIVERY.TABLE,
    mandatory: beat.mandatory === true,
    readAloud: beat.readAloud ?? null,
    direction: beat.direction ?? null,
    npcRef: beat.npcRef ?? null,
    handoutRef: beat.handoutRef ?? null,
    challengeRef: beat.challengeRef ?? null,
    after: beat.after ?? null,
    when: beat.when ?? null
  };
}

/**
 * Where one beat stands.
 *
 * Read the order carefully — `done` wins over everything, including a `when`
 * that no longer holds. A beat that actually happened at the table happened,
 * and a later edit to its gate must never retroactively un-happen it.
 */
export function beatState(beat, runState) {
  const state = runStateOf(runState);
  if (state.ticked[beat?.id]) return BEAT_STATES.DONE;

  const when = beat?.when;
  const gatedByBeat = when?.beatRef;
  const gatedByCondition = when?.condition;
  if (!gatedByBeat && !gatedByCondition) return BEAT_STATES.ACTIVE;

  // A GM-judged trigger with no mechanical test ("if a PC engages him
  // afterward"). Shown, not hidden — the GM has to be able to RECOGNISE the
  // trigger, and they cannot recognise one they were never told about.
  if (!gatedByBeat) {
    return state.opened.includes(beat.id) ? BEAT_STATES.ACTIVE : BEAT_STATES.CONDITIONAL;
  }

  const gate = state.ticked[gatedByBeat];
  if (!gate) return BEAT_STATES.PENDING;
  if (!when.degrees?.length) return BEAT_STATES.ACTIVE;
  return when.degrees.includes(gate.degree) ? BEAT_STATES.ACTIVE : BEAT_STATES.NOT_TAKEN;
}

/** Every beat, normalized, each stamped with where it stands. Authoring order is kept. */
export function beatsWithState(brief, runState) {
  return (brief?.beats ?? []).map(normalizeBeat).map((beat) => ({
    ...beat,
    state: beatState(beat, runState),
    degree: runStateOf(runState).ticked[beat.id]?.degree ?? null,
    // Which choicePoint option was picked, if any -- same "latest wins,
    // stored on the beat's own ticked entry" shape as `degree` above, so a
    // GM re-opening the panel later sees which way a resolved choice went.
    choice: runStateOf(runState).ticked[beat.id]?.choice ?? null,
    // Who picked which option when the table was asked (core/choice-prompt.mjs):
    // userId -> option id. Null when the GM decided it by hand.
    picks: runStateOf(runState).ticked[beat.id]?.picks ?? null
  }));
}

/**
 * How far through the scene the GM is.
 *
 * Counts the MANDATORY beats separately, because that is the only number that
 * answers "can I let this scene end". Optional colour being unticked is not
 * incompleteness (doctrine Law 20 — mandatory and slot-consuming are two
 * different tests, and conflating them is a bug even when the answer happens
 * to come out right).
 */
export function beatProgress(brief, runState) {
  const beats = beatsWithState(brief, runState);
  const mandatory = beats.filter((b) => b.mandatory);
  const outstanding = mandatory.filter(
    (b) => b.state !== BEAT_STATES.DONE && b.state !== BEAT_STATES.NOT_TAKEN
  );
  return {
    total: beats.length,
    done: beats.filter((b) => b.state === BEAT_STATES.DONE).length,
    mandatory: mandatory.length,
    mandatoryDone: mandatory.filter((b) => b.state === BEAT_STATES.DONE).length,
    outstanding: outstanding.map((b) => b.id),
    complete: outstanding.length === 0
  };
}

/**
 * What the clock reads.
 *
 * The pool comes from a real subsystem.schema.json instance — this is not a
 * bespoke counter. `spends` are its authored, check-free costs, and `spent`
 * is a LIST rather than a set because the same spend legitimately repeats
 * (interviewing a second shopkeeper costs another wall).
 *
 * Deltas are applied with their authored sign, never inferred from the pool's
 * mode: a diminishing pool can still be given time back, and guessing the
 * direction from `mode` would make that unauthorable.
 *
 * `startModifiers` reads the SAME runState this function was already given —
 * `state.ticked[beatRef].degree` is exactly what #onRecordOutcome writes when
 * the GM ticks a beat in this same scene-brief, so a setup check resolved
 * before this subsystem starts (Flood Tunnel's clear-the-jam, seeding the
 * Compactor Cycle's Encroachment) needs no new cross-file lookup — just
 * reading a beat id this pool's own author chose to reference.
 */
export function clockState(subsystem, runState, poolId = null) {
  const pools = subsystem?.pools ?? [];
  const pool = poolId ? pools.find((p) => p.id === poolId) : pools[0];
  if (!pool) return null;

  const state = runStateOf(runState);
  const deltaFor = new Map((subsystem?.spends ?? []).filter((s) => s.poolRef === pool.id).map((s) => [s.id, s.delta ?? 0]));
  const spent = state.spent.reduce((sum, id) => sum + (deltaFor.get(id) ?? 0), 0);

  const seeded = (pool.startModifiers ?? [])
    .filter((m) => m.poolRef === pool.id)
    .reduce((sum, m) => {
      const degree = state.ticked[m.beatRef]?.degree;
      return sum + (degree ? (m[degree] ?? 0) : 0);
    }, 0);

  const start = pool.start ?? pool.current ?? 0;
  const nudged = Number(state.adjust[pool.id]) || 0;
  const raw = start + seeded + spent + nudged;
  const floor = pool.floor ?? null;
  const ceiling = pool.ceiling ?? null;
  let current = raw;
  if (floor !== null) current = Math.max(floor, current);
  if (ceiling !== null) current = Math.min(ceiling, current);

  const rising = pool.mode === "accumulating";
  const reached = (t) => (rising ? current >= t.atValue : current <= t.atValue);
  const thresholds = pool.thresholds ?? [];
  // The next threshold still to come, nearest first — the one the GM should
  // be warning the table about (Law 19, below).
  const upcoming = thresholds
    .filter((t) => !reached(t))
    .sort((a, b) => (rising ? a.atValue - b.atValue : b.atValue - a.atValue));
  return {
    poolId: pool.id,
    name: pool.name ?? pool.id,
    mode: pool.mode ?? null,
    start: start + seeded,
    current,
    spent: -spent,
    adjusted: nudged,
    // What "N of M" is out OF: the start for a clock running down, the
    // ceiling for one filling up. The runner used to print "of {start}" for
    // both, so a rising clock read "0 of 0" (found 2026-09-24, Flood Tunnel).
    limit: rising ? (ceiling ?? start + seeded) : start + seeded,
    exhausted: rising ? ceiling !== null && current >= ceiling : floor !== null && current <= floor,
    canRaise: ceiling === null || current < ceiling,
    canLower: floor === null || current > floor,
    // Diminishing pools cross a threshold on the way DOWN, accumulating ones
    // on the way up. Law 19: nothing expires without its cost having been
    // visible first, so the GM needs these before they are reached, not after.
    crossed: thresholds.filter(reached),
    // The one the table is living under right now: the furthest reached.
    latest:
      thresholds
        .filter(reached)
        .sort((a, b) => (rising ? b.atValue - a.atValue : a.atValue - b.atValue))[0] ?? null,
    next: upcoming[0] ?? null
  };
}

/** Every spend authored against a pool, ready to render as buttons. */
export function spendsFor(subsystem, poolId = null) {
  const pool = poolId ?? subsystem?.pools?.[0]?.id ?? null;
  return (subsystem?.spends ?? []).filter((s) => !pool || s.poolRef === pool);
}

/**
 * The secret adjustment applied to one check, as a bonus to the roller.
 *
 * Positive means the character is better off here. `byLocation` wins over the
 * flat `value` when the current location has an entry — the whole point of a
 * varying hidden modifier is that the table builds a false theory about when
 * the thing works, which only holds together if the variance is authored
 * across the campaign rather than improvised twice.
 */
export function hiddenAdjustment(modifiers = [], { challengeRef, locationKey = null } = {}) {
  return modifiers
    .filter((m) => (m?.appliesTo ?? []).includes(challengeRef))
    .reduce((sum, m) => {
      const local = locationKey != null ? m.byLocation?.[locationKey] : undefined;
      return sum + (local ?? m.value ?? 0);
    }, 0);
}

/**
 * What DC to actually post, given a hidden bonus.
 *
 * THE SIGN FLIPS ON PURPOSE. A +3 circumstance bonus to the character and a
 * DC 3 lower are the same arithmetic, and only one of them is available to us:
 * we cannot add a modifier to somebody's roll without reaching into their
 * sheet, and doctrine Law 18 says never recompute what sf2e already computes.
 * So the bonus is spent on the DC instead, the check posts blind, and the
 * player rolls against a number nobody tells them.
 */
export function postedDc(baseDc, adjustment = 0) {
  if (!Number.isInteger(baseDc)) return null;
  return baseDc - (adjustment ?? 0);
}

/** The cast entry a beat belongs to, if any. */
export function castFor(brief, npcRef) {
  if (!npcRef) return null;
  return (brief?.cast ?? []).find((member) => member.id === npcRef) ?? null;
}

/**
 * What one cast member is CALLED in the panel.
 *
 * `npcRef` deliberately does not resolve to a name here. Three of this
 * campaign's NPCs carry `"name": null` behind a naming placeholder, and a
 * brief that restated a name would fossilise a placeholder the naming system
 * owns. The adapter resolves a real NPC's name from its own file; this only
 * decides what to fall back to.
 */
export function displayName(member) {
  return member?.label ?? member?.role ?? member?.id ?? null;
}

/* ---------------------------------------------------------------- */
/*  What the panel shows at a glance                                 */
/* ---------------------------------------------------------------- */

/**
 * The runner's remembered, per-GM layout choices, and each one's default.
 *
 * History worth keeping: Intake Medicals once rendered 5,293px of panel into
 * a 655px window, with the running order below two screens of material a GM
 * reads once. The fix was never less content — a brief earns its detail —
 * but opening on what gets used every minute and keeping the rest one press
 * away, by FREQUENCY OF USE at the table.
 *
 * The 2026-09-24 rebuild (a wide drawer in columns) turned most of what used
 * to be folds into things that are simply always on screen — the goal, the
 * running order, the people, the temptations, the clock, the handouts, the
 * rules search — or that open by themselves at their own moment (the
 * opening while nothing has happened, the ending once every required beat
 * is done, the beat being run, the person it is about; see
 * core/runner-view.mjs). Two choices are left that a GM makes once and
 * expects remembered:
 *
 *   summon — the gallery of every Actor in the world. Looked up
 *            occasionally, and a wall of portraits when open, so closed.
 *   detail — every beat's full detail at once, instead of one line each
 *            with the beat being run open. How a script is read the
 *            afternoon before, not how it is run, so off.
 *
 * A GM's own toggles persist, so this only decides the first render.
 */
export const RUNNER_SECTIONS = Object.freeze([
  { id: "summon", open: false },
  { id: "detail", open: false }
]);

const SECTION_DEFAULTS = new Map(RUNNER_SECTIONS.map((s) => [s.id, s.open]));

/**
 * Whether one section should render open.
 *
 * `overrides` is whatever the GM has toggled, keyed by section id. An unknown
 * section opens, because a section this file has not heard of is more likely
 * to be new content than something worth hiding.
 */
export function sectionOpen(id, overrides = {}) {
  if (Object.prototype.hasOwnProperty.call(overrides ?? {}, id)) return overrides[id] === true;
  return SECTION_DEFAULTS.has(id) ? SECTION_DEFAULTS.get(id) : true;
}

/** Every section's open state at once, for a template that cannot call a function. */
export function sectionStates(overrides = {}) {
  const out = {};
  for (const { id } of RUNNER_SECTIONS) out[id] = sectionOpen(id, overrides);
  return out;
}

/**
 * Should leaving this scene offer to close it?
 *
 * Yes once it has actually been RUN — a ticked beat — and not once it has
 * already been closed. Both halves matter: flicking between briefs to read
 * them must not nag, and neither must a scene whose closure is already on
 * record. design/ux-doctrine.md §10.3a wants friction at the boundary, which
 * is not the same thing as friction every time.
 */
export function shouldOfferClose(runState = emptyRunState()) {
  const ticked = Object.keys(runState?.ticked ?? {}).length > 0;
  return ticked && !runState?.closedAt;
}

/* ---------------------------------------------------------------- */
/*  Pacing                                                           */
/* ---------------------------------------------------------------- */

/**
 * The minutes a brief says it should run for.
 *
 * `runsAbout` is prose, not a field: "30-40 minutes, because every player gets
 * a private scene", or "30-45 minutes with the optional hazard, 20-30
 * without". Only the FIRST range is read — it is the headline case, and a
 * brief that qualifies itself afterwards is still telling you the number it
 * leads with. Returns null for anything unparseable, which is a perfectly
 * good answer: a scene with no stated length gets no pacing readout rather
 * than a made-up one.
 */
export function expectedMinutes(runsAbout) {
  const match = /(\d+)\s*(?:-|–|—|to)\s*(\d+)/.exec(String(runsAbout ?? ""));
  if (match) {
    const low = Number(match[1]);
    const high = Number(match[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && low <= high) return { low, high };
    return null;
  }
  const single = /(\d+)\s*min/i.exec(String(runsAbout ?? ""));
  if (single) {
    const only = Number(single[1]);
    return Number.isFinite(only) ? { low: only, high: only } : null;
  }
  return null;
}

/**
 * How long this scene has been running, against how long it said it would.
 *
 * Deliberately NOT a countdown or a warning. design/pacing-and-the-responsive-campaign.md
 * is about a sawtooth, not a schedule, and a GM who is twelve minutes over on
 * a scene the table is enjoying is not doing anything wrong. This states a
 * fact and leaves the judgement where it belongs.
 */
export function pacing({ startedAt = null, now = null, runsAbout = null } = {}) {
  const expected = expectedMinutes(runsAbout);
  if (!startedAt) return { started: false, expected, elapsedMinutes: null, state: "unstarted", label: expected ? `${expected.low}–${expected.high} min` : null };

  const startMs = Date.parse(startedAt);
  const nowMs = now ? Date.parse(now) : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) return { started: false, expected, elapsedMinutes: null, state: "unstarted", label: null };

  const elapsedMinutes = Math.max(0, Math.floor((nowMs - startMs) / 60000));
  let state = "inside";
  if (!expected) state = "running";
  else if (elapsedMinutes < expected.low) state = "early";
  else if (elapsedMinutes > expected.high) state = "over";

  const label = expected ? `${elapsedMinutes} min · ${expected.low}–${expected.high}` : `${elapsedMinutes} min`;
  // `isOver` as a precomputed boolean, not a state string the template
  // interpolates into a class name: the tier-0 class lint strips Handlebars
  // before it looks, so `bi-runner__pace--{{state}}` would be invisible to it
  // and an undefined modifier fails silently as unstyled markup. beat.hbs
  // carries the same warning for the same reason.
  return { started: true, expected, elapsedMinutes, state, label, isOver: state === "over" };
}

/* ---------------------------------------------------------------- */
/*  Notes taken while the scene is running                           */
/* ---------------------------------------------------------------- */

/**
 * Which beat a note typed right now should attach itself to.
 *
 * The most recently ticked beat, by its own timestamp -- because a GM types
 * what just happened immediately AFTER marking that it happened, and asking
 * them to also pick a target from a list is the friction doctrine §10.3 says
 * will stop the note being written at all ("If they ever feel like a form,
 * they have failed").
 *
 * Returns null when nothing has been ticked yet, which the caller should read
 * as "this note belongs to the scene, not to a beat".
 */
export function noteTargetFor(beats = [], runState = emptyRunState()) {
  const ticked = runState?.ticked ?? {};
  let best = null;
  for (const beat of beats) {
    const at = ticked[beat.id]?.at;
    if (!at) continue;
    if (!best || String(at) > String(best.at)) best = { id: beat.id, at, text: beat.text ?? null };
  }
  return best;
}

/**
 * The notes already written against one beat, oldest first.
 *
 * Read straight back out of the session log rather than kept in run state:
 * the log IS the record (foundry/session-log.mjs writes it to
 * storage/sessions/), and a second copy in run state would be one more thing
 * to keep in step and one more place for the two to disagree.
 */
export function notesForBeat(entries = [], beatId) {
  if (!beatId) return [];
  return entries.filter((entry) => entry?.context?.subject === beatId);
}

/**
 * The prefix an outcome-tally log entry's `subject` carries, so it can be
 * told apart from an ordinary GM note on the same beat (both use `subject`,
 * per foundry/session-log.mjs's own shape) without adding a new field to the
 * log entry itself.
 */
const OUTCOME_SUBJECT_INFIX = "::outcome::";

/** The `subject` a degree-of-success log entry for this beat should carry. */
export function outcomeLogSubject(beatId, degree) {
  return `${beatId}${OUTCOME_SUBJECT_INFIX}${degree}`;
}

/**
 * The `subject` a `choicePoint` pick should carry — same structured shape as
 * `outcomeLogSubject`, one infix per kind of recorded thing, so a future
 * tally function could read either back out the same way
 * `outcomeTally` already does for degrees.
 */
const CHOICE_SUBJECT_INFIX = "::choice::";
export function choiceLogSubject(beatId, optionId) {
  return `${beatId}${CHOICE_SUBJECT_INFIX}${optionId}`;
}

/**
 * The `subject` an inline trigger press should carry
 * (design/scene-triggers-and-depth.md §2.3). Scoped by beat AND trigger id,
 * since a trigger id is only unique within its own beat — the same scoping
 * `checkRef` already uses inside a `challengeRef`.
 */
const TRIGGER_SUBJECT_INFIX = "::trigger::";
export function triggerLogSubject(beatId, triggerId) {
  return `${beatId}${TRIGGER_SUBJECT_INFIX}${triggerId}`;
}

/**
 * The `subject` a used temptation should carry (design/scene-triggers-and-depth.md
 * §3). Scene-level rather than beat-scoped like the three subjects above --
 * a temptation isn't authored against any one beat -- so it carries no
 * beatId prefix, just its own id.
 */
const TEMPTATION_SUBJECT_INFIX = "temptation::";
export function temptationLogSubject(temptationId) {
  return `${TEMPTATION_SUBJECT_INFIX}${temptationId}`;
}

/**
 * How many times each degree has actually landed on this beat, across every
 * attempt ever logged -- not just the current tick, which run state only
 * ever keeps the LATEST of. Requested 2026-09-19 (Ingram): "It would be nice
 * to record how many Crit success, success, neutral, fail, crit fails we get
 * for each challenge." The raw data already exists for free in the session
 * log the moment #onRecordOutcome writes one entry per degree recorded; this
 * is just the count.
 *
 * Four buckets, never five -- this project's own convention throughout
 * (DEGREES above): a plain Failure with no listed effect is what reads as
 * "neutral" at the table, not an invented fifth rung.
 */
export function outcomeTally(entries = [], beatId) {
  const tally = { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 };
  if (!beatId) return tally;
  const prefix = `${beatId}${OUTCOME_SUBJECT_INFIX}`;
  for (const entry of entries) {
    const subject = entry?.context?.subject;
    if (typeof subject !== "string" || !subject.startsWith(prefix)) continue;
    const degree = subject.slice(prefix.length);
    if (degree in tally) tally[degree] += 1;
  }
  return tally;
}

/** How many notes each beat carries, keyed by beat id, for the running order's own margin. */
export function noteCounts(entries = []) {
  const counts = {};
  for (const entry of entries) {
    const subject = entry?.context?.subject;
    if (!subject) continue;
    counts[subject] = (counts[subject] ?? 0) + 1;
  }
  return counts;
}

/**
 * Everything the panel needs for one scene, in one call.
 *
 * Assembled here rather than in the template so the ordering and the
 * derived numbers are testable, and identical wherever they are rendered.
 */
export function sceneRunnerState({ brief, subsystem = null, runState = emptyRunState(), locationKey = null } = {}) {
  if (!brief) return null;
  return {
    id: brief.id,
    title: brief.title ?? brief.id,
    summary: brief.summary ?? null,
    // The goal box, which the panel shows above everything else. `goal` is the
    // checkable outcome, `howToPlay` the register, and they are separate fields
    // because they answer different questions and were previously one blurred
    // paragraph that answered neither.
    goal: brief.goal ?? null,
    howToPlay: brief.howToPlay ?? null,
    runsAbout: brief.runsAbout ?? null,
    mode: brief.mode ?? null,
    accomplishment: brief.accomplishment ?? null,
    intro: brief.intro ?? null,
    outro: brief.outro ?? null,
    cast: (brief.cast ?? []).map((member) => ({ ...member, displayName: displayName(member) })),
    beats: beatsWithState(brief, runState),
    progress: beatProgress(brief, runState),
    artefacts: artefactsWithState(brief, runState),
    handouts: brief.handouts ?? [],
    offers: brief.offers ?? [],
    carryForward: brief.carryForward ?? [],
    // One sentence a GM can say out loud, unprompted, whenever the table
    // stalls -- scene-level, not tied to any one beat, on purpose (design/
    // scene-triggers-and-depth.md §3). Never mandatory, never gates anything.
    temptations: brief.temptations ?? [],
    clock: subsystem ? clockState(subsystem, runState) : null,
    spends: subsystem ? spendsFor(subsystem) : [],
    locationKey
  };
}
