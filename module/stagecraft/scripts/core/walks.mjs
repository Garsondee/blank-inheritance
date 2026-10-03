/**
 * Walks: how a card gets from one place on the floor to another without being carried (stage.md §5, diorama.md §3.4).
 * Pure: no clock of its own, no randomness.
 *
 * A card that is sent somewhere does not slide. It turns towards where it is going, steps there like a paper doll (a
 * little lift and a rock on every step), and on arrival turns to the way it should stand. How it steps is its gait: a
 * clerk walks, a nervous student hurries, a centipede scurries, a ghost glides.
 *
 * A walk is plain numbers, `{ from, to, t0, dur, gait, steps, yaw }`, and where the card is at any moment is a function
 * of the walk and the time alone. Every screen is given the same walk with the same start time on the clock they share,
 * so every screen shows the card at the same place on the way, without one message per step.
 */

import { yawTo, cheatOut } from "./diorama.mjs";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The ways of walking. Lengths are world units (pixels of the 2560-wide reference page at the front of the stage),
 * times are seconds. `speed` is how fast it covers the floor; `stride` how far one step goes; `height` and `rock` how
 * much a step lifts and tips the card; `turn` how far it looks where it is going (0 to 1).
 */
export const GAITS = Object.freeze({
  walk:   { speed: 520, stride: 110, height: 12, rock: 3.5, turn: 0.7 },
  stroll: { speed: 300, stride: 90, height: 8, rock: 2.6, turn: 0.6 },
  hurry:  { speed: 880, stride: 135, height: 15, rock: 5, turn: 0.8 },
  march:  { speed: 600, stride: 120, height: 10, rock: 1.2, turn: 0.5 },
  sneak:  { speed: 230, stride: 70, height: 4, rock: 1.5, turn: 0.75 },
  scurry: { speed: 1150, stride: 42, height: 5, rock: 7, turn: 0.9 },
  hop:    { speed: 640, stride: 170, height: 48, rock: 2, turn: 0.6 },
  glide:  { speed: 380, stride: 0, height: 0, rock: 0, turn: 0.4 }
});

export const GAIT_NAMES = Object.freeze(Object.keys(GAITS));

/** How far apart two places on the floor feel. Depth counts for a little less than width: the eye forgives it. */
export const floorDistance = (a, b) => Math.hypot(b.X - a.X, (b.Z - a.Z) * 0.8);

/**
 * Plan a walk from one place to another. `from` and `to` are `{ X, Z }`; `t0` is when it starts on the shared clock
 * (seconds); `yaw` is how the card stands when it arrives (degrees, null to keep facing where it walked). A walk too
 * short to be worth stepping takes a moment and no steps.
 */
export function planWalk(from, to, { t0 = 0, gait = "walk", yaw = null, pace = 1, minDur = 0.3, maxDur = 6 } = {}) {
  const g = GAITS[gait] ? gait : "walk";
  const spec = GAITS[g];
  const dist = floorDistance(from, to);
  const dur = clamp(dist / (spec.speed * Math.max(0.1, pace)), minDur, maxDur);
  const steps = spec.stride > 0 && dist > spec.stride * 0.6 ? Math.max(1, Math.round(dist / spec.stride)) : 0;
  return { from: { X: from.X, Z: from.Z }, to: { X: to.X, Z: to.Z }, t0, dur, gait: g, steps, yaw: yaw ?? null, dist };
}

/** Ease in and out, gently: a card sets off, walks, and slows to arrive, but walks at an even pace in the middle. */
export function pace(u) {
  const a = 0.18;                       // the share of the walk spent speeding up (and the same slowing down)
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const v = 1 / (1 - a);                // the even speed in the middle, so the whole walk still covers the distance
  if (u < a) return (v * u * u) / (2 * a);
  if (u > 1 - a) return 1 - (v * (1 - u) * (1 - u)) / (2 * a);
  return v * (u - a / 2);
}

/**
 * Where a walk has got to at time `t`: `{ X, Z, lift, rock, yaw, u, moving, done }`. `yaw` is the way the card should
 * be turned now (where it is going while it walks, then the way it stands); `lift` and `rock` are the step's bob and tip.
 */
export function walkAt(w, t) {
  const u = w.dur > 0 ? clamp((t - w.t0) / w.dur, 0, 1) : 1;
  const e = pace(u);
  const X = w.from.X + (w.to.X - w.from.X) * e;
  const Z = w.from.Z + (w.to.Z - w.from.Z) * e;
  const spec = GAITS[w.gait] ?? GAITS.walk;
  let lift = 0;
  let rock = 0;
  if (w.steps > 0 && u > 0 && u < 1) {
    const s = (e * w.steps) % 1;                       // where in the current step it is
    const env = Math.min(1, u * 6, (1 - u) * 6);       // the first and last steps are smaller
    lift = spec.height * Math.sin(s * Math.PI) * env;
    rock = spec.rock * Math.sin(s * Math.PI * 2) * env * Math.sign(w.to.X - w.from.X || 1);
  }
  // before it sets off it keeps whatever way it is facing (null); on the way it looks where it is going; then it turns
  const travelling = u > 0 && u < 0.86 && w.dist > 30;
  // turned towards where it is going, but no more than 40 degrees: seen from above, a card turned further reads as tipping
  const heading = cheatOut(yawTo(w.from.X, w.from.Z, w.to.X, w.to.Z), { share: spec.turn, max: 40 });
  const yaw = u <= 0 ? null : travelling || w.yaw === null ? heading : w.yaw;
  return { X, Z, lift, rock, yaw, u, moving: u > 0 && u < 1, done: u >= 1 };
}

/** Is a walk still under way at time `t`? (A walk that has not started yet counts: the card is about to go.) */
export const walking = (w, t) => !!w && t < w.t0 + w.dur;

/**
 * Where a card enters from when it arrives by walking in: just off the side of the stage it names, at its own depth, or
 * from the back of the room. `limits` are the stage's floor limits ({ x: [lo, hi], z: [lo, hi] }).
 */
export function entrancePoint(side, to, limits) {
  const pad = 160;
  if (side === "left") return { X: limits.x[0] - pad, Z: to.Z };
  if (side === "right") return { X: limits.x[1] + pad, Z: to.Z };
  if (side === "back") return { X: to.X * 0.6, Z: limits.z[0] };
  return { X: to.X, Z: to.Z };
}
