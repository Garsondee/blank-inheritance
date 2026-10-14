/**
 * Playing a journey back (design/location-editor.md section 16): the same movement the game animates, as a timeline a scrubber can be dragged along.
 *
 * Foundry moves a token through a leg hop by hop, each hop one straight glide of the duration core/travel-speed.mjs `hopPlan` gives it
 * (foundry/travel.mjs `animateTokenAlongHops`). `legMotion` keeps exactly those hops, so `motionAt(motion, t)` is where the game's token is `t` ms into the leg.
 * Legs that the game plays at the same moment (every option of one departure, every way of arriving) are one STEP, and a playlist of steps is a TIMELINE with a
 * short pause at each arrival so what happened is legible.
 *
 * Pure: points are in whatever space the route was planned in (map-image pixels); the overlay converts them to the scene.
 */

import { pointAtDistance, polylineUpTo } from "./journey-draw.mjs";

/** The pause at the end of each step in a playlist, in ms. */
export const DWELL_MS = 900;
/** What the table also sits through before a scene cut's walk begins: the fade to the map (foundry/travel.mjs FADE_MS, 10 s). Reported, never played. */
export const CUT_LEAD_SECONDS = 10;
export const SPEEDS = Object.freeze([0.5, 1, 2, 4, 8]);

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * One leg's movement from its planned result: `{ points, hops, totalMs, totalPx }`, or null when there is nothing to watch (not routed, or no hops).
 * `points` is the path the token follows; each hop is `{ from, to, mode, startMs, endMs, startPx, length }`.
 */
export function legMotion(result) {
  if (!result || result.status !== "routed" || !result.from || !Array.isArray(result.hops) || result.hops.length === 0) return null;
  const points = [result.from];
  const hops = [];
  let t = 0;
  let px = 0;
  for (const hop of result.hops) {
    const from = points[points.length - 1];
    const length = dist(from, hop.to);
    hops.push({ from, to: hop.to, mode: hop.mode, startMs: t, endMs: t + hop.durationMs, startPx: px, length });
    points.push(hop.to);
    t += hop.durationMs;
    px += length;
  }
  return { points, hops, totalMs: t, totalPx: px };
}

/**
 * Where the token is `t` ms into a leg (clamped to the ends): `{ x, y, mode, hopIndex, distance, done }`. Within a hop it glides in a straight line at a
 * steady pace, as the game's own animation does. `distance` is how far along the whole path, for drawing the part already travelled.
 */
export function motionAt(motion, t) {
  const clamped = Math.min(Math.max(0, t), motion.totalMs);
  // the hop in progress: the last whose start has been reached (hops are in time order, so a binary search)
  let lo = 0;
  let hi = motion.hops.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (motion.hops[mid].startMs <= clamped) lo = mid;
    else hi = mid - 1;
  }
  const hop = motion.hops[lo];
  const span = hop.endMs - hop.startMs;
  const frac = span > 0 ? Math.min(1, (clamped - hop.startMs) / span) : 1;
  return {
    x: hop.from.x + (hop.to.x - hop.from.x) * frac,
    y: hop.from.y + (hop.to.y - hop.from.y) * frac,
    mode: hop.mode,
    hopIndex: lo,
    distance: hop.startPx + hop.length * frac,
    done: clamped >= motion.totalMs
  };
}

/** The part of the path already travelled when the token is at `state` (from `motionAt`), ending at the token. */
export const travelledPoints = (motion, state) => polylineUpTo(motion.points, state.distance);

/** A point and heading a given way along the whole path, for a marker that does not move with the clock. */
export const pointOnPath = (motion, fraction) => pointAtDistance(motion.points, motion.totalPx * Math.min(1, Math.max(0, fraction)));

/* ------------------------------------------------------------------ */
/*  Steps: the legs the game plays at the same moment                   */
/* ------------------------------------------------------------------ */

/**
 * The playlist of an episode as steps, in play order. A cut is a step of its own; the options of one departure are one step (the pawns walk at once, each to what
 * it chose), its `then` legs the next, and the ways of arriving one more. Each step is `{ id, groupId, kind, rowKey, legIds, title, detail }`.
 */
export function buildSteps(model, groupId = null) {
  const legById = new Map((model?.legs ?? []).map((leg) => [leg.id, leg]));
  const steps = [];
  for (const group of model?.groups ?? []) {
    if (groupId && group.id !== groupId) continue;
    const byKey = new Map();
    for (const leg of group.legs) {
      const key = leg.kind === "cut" ? leg.id : `${leg.rowKey}|${leg.kind}`;
      let step = byKey.get(key);
      if (!step) {
        step = { id: `step:${key}`, groupId: group.id, kind: leg.kind, rowKey: leg.rowKey, legIds: [], title: "", detail: "" };
        byKey.set(key, step);
        steps.push(step);
      }
      step.legIds.push(leg.id);
    }
  }
  for (const step of steps) {
    const legs = step.legIds.map((id) => legById.get(id));
    const first = legs[0];
    const n = legs.length;
    if (step.kind === "cut") { step.title = first.label; step.detail = ""; }
    else if (step.kind === "option") { step.title = `${first.from.title}: the players choose`; step.detail = `${n} way${n === 1 ? "" : "s"} to go`; }
    else if (step.kind === "then") { step.title = `${first.to.label ?? first.to.name ?? "The muster"}: they gather`; step.detail = `${n} journey${n === 1 ? "" : "s"}`; }
    else { step.title = `${first.to.label ?? first.to.name ?? "The muster"}: arrivals`; step.detail = `${n} way${n === 1 ? "" : "s"} in`; }
  }
  return steps;
}

/** A playlist of only the scene-to-scene cuts (the main road), or every step. */
export const mainRoadSteps = (steps) => steps.filter((step) => step.kind === "cut");

/** The step that holds a leg, or null. */
export const stepOfLeg = (steps, legId) => steps.find((step) => step.legIds.includes(legId)) ?? null;

/* ------------------------------------------------------------------ */
/*  The timeline                                                        */
/* ------------------------------------------------------------------ */

/**
 * Steps -> a timeline. `analysis` is core/journey-checks.mjs#analyseJourneys's result (its `legs` map). A step with nothing to watch (every leg at one place,
 * off the map or unplaced) is left out; the rest are laid end to end, each lasting as long as its longest leg plus a pause.
 * Returns `{ steps: [{ index, step, startMs, travelMs, dwellMs, endMs, realMinutes, legs: [{ legId, motion }] }], totalMs }`.
 */
export function buildTimeline(steps, analysis, { dwellMs = DWELL_MS } = {}) {
  const out = [];
  let at = 0;
  for (const step of steps) {
    const legs = [];
    let realMinutes = 0;
    for (const id of step.legIds) {
      const result = analysis.legs.get(id);
      const motion = legMotion(result);
      if (!motion) continue;
      legs.push({ legId: id, motion });
      realMinutes = Math.max(realMinutes, result.realMinutes ?? 0);
    }
    if (!legs.length) continue;
    const travelMs = Math.max(...legs.map((l) => l.motion.totalMs));
    out.push({ index: out.length, step, startMs: at, travelMs, dwellMs, endMs: at + travelMs + dwellMs, realMinutes, legs });
    at += travelMs + dwellMs;
  }
  return { steps: out, totalMs: at };
}

/** The step a timeline time falls in (the last one for a time past the end), or -1 for an empty timeline. */
export function stepIndexAt(timeline, t) {
  if (!timeline.steps.length) return -1;
  for (let i = 0; i < timeline.steps.length; i++) if (t < timeline.steps[i].endMs) return i;
  return timeline.steps.length - 1;
}

/**
 * The whole picture at time `t`: which step, whether it is travelling or pausing, and where every token of that step is.
 * `{ stepIndex, phase: "travel" | "dwell", stepT, finished, tokens: [{ legId, x, y, mode, hopIndex, distance, done }] }`, or null for an empty timeline.
 */
export function timelineAt(timeline, t) {
  const index = stepIndexAt(timeline, t);
  if (index < 0) return null;
  const step = timeline.steps[index];
  const stepT = Math.min(Math.max(0, t - step.startMs), step.travelMs + step.dwellMs);
  return {
    stepIndex: index,
    phase: stepT < step.travelMs ? "travel" : "dwell",
    stepT,
    finished: t >= timeline.totalMs,
    tokens: step.legs.map(({ legId, motion }) => ({ legId, ...motionAt(motion, Math.min(stepT, motion.totalMs)) }))
  };
}

/** The time a step begins, for the skip buttons. */
export const timeOfStep = (timeline, index) => timeline.steps[Math.min(Math.max(0, index), timeline.steps.length - 1)]?.startMs ?? 0;
