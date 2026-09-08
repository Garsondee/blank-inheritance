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
  return { ticked: {}, spent: [], opened: [] };
}

function runStateOf(runState) {
  return {
    ticked: runState?.ticked ?? {},
    spent: Array.isArray(runState?.spent) ? runState.spent : [],
    opened: Array.isArray(runState?.opened) ? runState.opened : []
  };
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
    degree: runStateOf(runState).ticked[beat.id]?.degree ?? null
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
 */
export function clockState(subsystem, runState, poolId = null) {
  const pools = subsystem?.pools ?? [];
  const pool = poolId ? pools.find((p) => p.id === poolId) : pools[0];
  if (!pool) return null;

  const state = runStateOf(runState);
  const deltaFor = new Map((subsystem?.spends ?? []).filter((s) => s.poolRef === pool.id).map((s) => [s.id, s.delta ?? 0]));
  const spent = state.spent.reduce((sum, id) => sum + (deltaFor.get(id) ?? 0), 0);

  const start = pool.start ?? pool.current ?? 0;
  const raw = start + spent;
  const floor = pool.floor ?? null;
  const ceiling = pool.ceiling ?? null;
  let current = raw;
  if (floor !== null) current = Math.max(floor, current);
  if (ceiling !== null) current = Math.min(ceiling, current);

  return {
    poolId: pool.id,
    name: pool.name ?? pool.id,
    mode: pool.mode ?? null,
    start,
    current,
    spent: -spent,
    exhausted: floor !== null && current <= floor,
    // Diminishing pools cross a threshold on the way DOWN, accumulating ones
    // on the way up. Law 19: nothing expires without its cost having been
    // visible first, so the GM needs these before they are reached, not after.
    crossed: (pool.thresholds ?? []).filter((t) =>
      pool.mode === "diminishing" ? current <= t.atValue : current >= t.atValue
    )
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
    cast: (brief.cast ?? []).map((member) => ({ ...member, displayName: displayName(member) })),
    beats: beatsWithState(brief, runState),
    progress: beatProgress(brief, runState),
    handouts: brief.handouts ?? [],
    offers: brief.offers ?? [],
    carryForward: brief.carryForward ?? [],
    clock: subsystem ? clockState(subsystem, runState) : null,
    spends: subsystem ? spendsFor(subsystem) : [],
    locationKey
  };
}
