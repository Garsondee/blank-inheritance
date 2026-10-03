/**
 * Life: what the people of a scene do when nobody is moving them (stage.md §5, diorama.md §6). Pure.
 *
 * A room is more alive when its people move a little on their own: the waitress goes from table to table, the
 * quartermaster works along his bench, a guard paces, a drunk wanders, the centipedes never quite keep still. Each of
 * those is a routine, and a routine is a function of the shared clock alone: where a card is at time t is worked out from
 * the routine, the card's own seed and t, the same way on every screen, so the room moves together for everyone without
 * a single message. Nothing here is random at run time; "random" is the card's seed.
 *
 * Time is cut into beats of `every` seconds. In each beat a card may set off once, at a moment of its own, and walk to
 * the beat's place (a spot, a point near home, the next point of a patrol). Some beats it stays put (`restless` says how
 * often it moves at all). Where it is in beat k is: the place of beat k-1, then the walk, then the place of beat k.
 *
 *   still   no routine (the default): it stands where it was put
 *   wander  drifts about near home, never further than `radius`
 *   visit   goes between a few named places (`spots`, or `marks` of the scene), lingering at each
 *   patrol  walks a path in order (`path`), there and back, or round if `loop`
 *   pace    walks back and forth across its spot, `width` wide (the nervous, the impatient, the guard)
 *   swarm   never keeps still: short quick scurries near home (vermin, a crowd of children, a dog)
 */

import { planWalk, walkAt, GAITS } from "./walks.mjs";
import { rng, cheatOut, yawTo } from "./diorama.mjs";

export const ROUTINES = Object.freeze(["still", "wander", "visit", "patrol", "pace", "swarm"]);

const DEFAULTS = Object.freeze({
  wander: { every: 11, restless: 0.55, radius: 0.05, gait: "stroll" },
  visit:  { every: 14, restless: 0.75, gait: "walk" },
  patrol: { every: 9, restless: 1, gait: "march" },
  pace:   { every: 5, restless: 0.85, width: 0.05, gait: "walk" },
  swarm:  { every: 2.6, restless: 0.8, radius: 0.035, gait: "scurry" }
});

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isPoint = (p) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]);

/**
 * Understand a routine as authored (positions are fractions of the painting, like everything else a scene says).
 * Returns null for "still" or for nothing at all, so a card without a routine costs nothing.
 */
export function describeRoutine(raw) {
  if (!raw || typeof raw !== "object" || !ROUTINES.includes(raw.kind) || raw.kind === "still") return null;
  const d = DEFAULTS[raw.kind];
  const out = {
    kind: raw.kind,
    every: Math.max(1.5, isNum(raw.every) ? raw.every : d.every),
    restless: Math.max(0, Math.min(1, isNum(raw.restless) ? raw.restless : d.restless)),
    gait: GAITS[raw.gait] ? raw.gait : d.gait,
    radius: Math.max(0.005, Math.min(0.3, isNum(raw.radius) ? raw.radius : d.radius ?? 0.05)),
    width: Math.max(0.01, Math.min(0.4, isNum(raw.width) ? raw.width : d.width ?? 0.05)),
    spots: Array.isArray(raw.spots) ? raw.spots.filter(isPoint).map((p) => [p[0], p[1]]) : [],
    marks: Array.isArray(raw.marks) ? raw.marks.filter((m) => typeof m === "string") : [],
    path: Array.isArray(raw.path) ? raw.path.filter(isPoint).map((p) => [p[0], p[1]]) : [],
    loop: raw.loop === true,
    faces: isPoint(raw.faces) ? [raw.faces[0], raw.faces[1]] : null,
    // someone to turn to while standing still: a card's id (two regulars talking to each other)
    facesCard: typeof raw.faces === "string" && raw.faces ? raw.faces : null,
    // small things it does now and then while standing (a nod, a bow, a hop), and how often a beat brings one
    gestures: Array.isArray(raw.gestures) ? raw.gestures.filter((g) => ["hop", "nod", "bow", "shake"].includes(g)) : [],
    gestureChance: Math.max(0, Math.min(1, isNum(raw.gestureChance) ? raw.gestureChance : 0.35)),
    yaw: isNum(raw.yaw) ? raw.yaw : null
  };
  if (out.kind === "visit" && out.spots.length + out.marks.length === 0) return null;
  if (out.kind === "patrol" && out.path.length < 2) return null;
  return out;
}

/**
 * A routine made ready to run on one stage for one card: every place resolved to the floor. `home` is where the card
 * stands ({ X, Z }); `rig` is the stage's rig (rigspace.mjs); `marks` the stage's resolved marks. Places above the
 * horizon are dropped. Returns null when nothing is left to do.
 */
export function prepareRoutine(routine, { home, rig, marks = [], seed = 1 }) {
  if (!routine) return null;
  const onFloor = (p) => (rig.place ?? rig.standing)(p);
  const homeF = rig.fractionOf(home.X, home.Z);
  // a radius is a share of the painting's width, measured at the card's own depth (further back is smaller)
  const across = (share) => {
    const a = rig.standing([homeF[0] - share / 2, homeF[1]]);
    const b = rig.standing([homeF[0] + share / 2, homeF[1]]);
    return a && b ? Math.abs(b.X - a.X) : 120;
  };
  const faceAt = routine.faces ? onFloor(routine.faces) : null;
  const ready = { ...routine, home: { X: home.X, Z: home.Z }, seed, places: [], faceAt };
  if (routine.kind === "visit") {
    const fromMarks = routine.marks.map((id) => marks.find((m) => m.id === id)).filter(Boolean).map((m) => ({ X: m.X, Z: m.Z, yaw: m.yaw ?? null }));
    const fromSpots = routine.spots.map(onFloor).filter(Boolean).map((p) => ({ X: p.X, Z: p.Z, yaw: null }));
    ready.places = [{ X: home.X, Z: home.Z, yaw: null }, ...fromMarks, ...fromSpots];
    if (ready.places.length < 2) return null;
  } else if (routine.kind === "patrol") {
    ready.places = routine.path.map(onFloor).filter(Boolean).map((p) => ({ X: p.X, Z: p.Z, yaw: null }));
    if (ready.places.length < 2) return null;
  } else if (routine.kind === "pace") {
    ready.reach = across(routine.width);
  } else {
    ready.reach = across(routine.radius);
  }
  return ready;
}

/* ------------------------------------------------------------------ the beats */

/** A number in [0, 1) that belongs to this card and this beat, the same on every screen. */
function roll(seed, k, salt = 0) {
  return rng(((seed * 2654435761) ^ (k * 97 + salt * 7919)) >>> 0)();
}

/** How many beats back a card that keeps still looks for the last beat in which it moved; past that, it is at home. */
const LOOK_BACK = 16;

/**
 * Where a routine's card stands at the end of beat k: { X, Z, yaw }. Beat 0 and below are home.
 *
 * Each beat's place is worked out on its own, from the card's seed and the beat's number, never from a chain of earlier
 * beats: the shared clock counts from 1970, so beat numbers run to the hundreds of millions, and anything that had to
 * walk back through them all would never finish. Two neighbouring beats are always worked out by this same function,
 * which is all the walk between them needs.
 */
export function placeOfBeat(r, k) {
  if (k <= 0) return { X: r.home.X, Z: r.home.Z, yaw: r.yaw };
  if (r.kind === "patrol") {
    const n = r.places.length;
    const i = r.loop ? k % n : pingPong(k, n);
    return { ...r.places[i], yaw: r.places[i].yaw ?? null };
  }
  // a beat in which the card stays put keeps the place of the last beat that moved (looking back a little way only)
  let j = k;
  for (let n = 0; j > 0 && roll(r.seed, j, 1) >= r.restless; n++) {
    if (n >= LOOK_BACK) return { X: r.home.X, Z: r.home.Z, yaw: r.yaw };
    j--;
  }
  if (j <= 0) return { X: r.home.X, Z: r.home.Z, yaw: r.yaw };
  if (r.kind === "visit") {
    // one of its places, chosen by the beat; the same place twice running is simply a beat spent standing there
    const i = Math.floor(roll(r.seed, j, 2) * r.places.length);
    return { ...r.places[i], yaw: r.places[i].yaw ?? null };
  }
  if (r.kind === "pace") {
    const side = (j % 2 === 0 ? -1 : 1) * (0.35 + 0.15 * roll(r.seed, j, 3));
    return { X: r.home.X + side * r.reach, Z: r.home.Z + (roll(r.seed, j, 4) - 0.5) * r.reach * 0.2, yaw: null };
  }
  // wander and swarm: a point in a squashed disc round home (depth counts for less, as the eye reads it)
  const a = roll(r.seed, j, 5) * Math.PI * 2;
  const d = Math.sqrt(roll(r.seed, j, 6)) * r.reach / 2;
  return { X: r.home.X + Math.cos(a) * d, Z: r.home.Z + Math.sin(a) * d * 0.7, yaw: null };
}

function pingPong(k, n) {
  const span = 2 * (n - 1);
  const m = k % span;
  return m < n ? m : span - m;
}

/** The moment in beat k the card sets off, as seconds after the beat begins. */
function departure(r, k) {
  return r.every * (0.1 + 0.4 * roll(r.seed, k, 8));
}

/**
 * The gesture a routine makes in the beat that contains time `t`, if any, and the moment within the beat it falls:
 * `{ beat, at, verb }` or null. The same on every screen, from the seed and the beat alone. A gesture never falls while the
 * card is walking (it comes late in the beat, after any walk has ended).
 */
export function gestureAt(r, t) {
  if (!r.gestures?.length) return null;
  const phase = roll(r.seed, 0, 9) * r.every;
  const k = Math.floor((t + phase) / r.every);
  if (roll(r.seed, k, 12) >= r.gestureChance) return null;
  const verb = r.gestures[Math.floor(roll(r.seed, k, 13) * r.gestures.length)];
  const at = k * r.every - phase + r.every * (0.93 + 0.05 * roll(r.seed, k, 14));
  return { beat: k, at, verb };
}

/**
 * Where a card with a routine is at time `t` (seconds, the shared clock): `{ X, Z, yaw, lift, rock, moving }`.
 * `yaw` is null while the card has nowhere in particular to look (the stage then keeps its own facing); a routine with
 * `faces` looks at that point whenever it is standing still.
 */
export function lifeAt(r, t) {
  // every card's beats are out of step with every other's
  const phase = roll(r.seed, 0, 9) * r.every;
  const tt = t + phase;
  const k = Math.floor(tt / r.every);
  const local = tt - k * r.every;
  const from = placeOfBeat(r, k - 1);
  const to = placeOfBeat(r, k);
  const facing = (p) => {
    if (r.faceAt) return cheatOut(yawTo(p.X, p.Z, r.faceAt.X, r.faceAt.Z), { share: 0.7, max: 50 });
    return p.yaw ?? null;
  };
  if (Math.abs(to.X - from.X) + Math.abs(to.Z - from.Z) < 0.5) return { X: to.X, Z: to.Z, yaw: facing(to), lift: 0, rock: 0, moving: false };
  const start = departure(r, k);
  // a walk always finishes inside its beat, hurrying if it must
  const w = planWalk(from, to, { t0: start, gait: r.gait, yaw: facing(to), maxDur: Math.max(0.4, (r.every - start) * 0.92) });
  const p = walkAt(w, local);
  if (!p.moving) return { X: p.X, Z: p.Z, yaw: local < start ? facing(from) : facing(to), lift: 0, rock: 0, moving: false };
  return { X: p.X, Z: p.Z, yaw: p.yaw, lift: p.lift, rock: p.rock, moving: true };
}
