/**
 * Puppets: a sketch of scripts/core/puppets.mjs.
 *
 * Pure. A character frame on a rod: the hand holds the grip at the bottom of
 * the handle, the frame stands on top of it, and everything lively about it
 * (the lean when it is swung, the wobble when it stops, the jolt when two
 * bump, a hop, a nod, a bow, turning its back) is a few springs stepped at a
 * fixed rate. No DOM and no clock of its own: the caller steps it.
 *
 * SYNC, the design this file is shaped for: only the GRIP travels over the
 * network (where the hand is, 30 times a second, while someone holds it).
 * Everything else here is cosmetic and deterministic from that motion, so
 * every screen computes its own lean and wobble from the same positions and
 * they agree closely without ever being sent. Bumps are cosmetic too: a
 * bumped frame jolts and springs back to where it stands; only a deliberate
 * drop changes where a frame stands, and that is one message.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The feel. Tuned for "a very slight wobble" that is fun when swung hard. */
export const FEEL = Object.freeze({
  follow: 42,        // how hard the grip chases the hand (rad/s, critically damped): ~45 ms behind
  stiffness: 150,    // the rod's spring back to upright (1/s²): a swing about every half second
  damping: 9,        // how quickly a wobble dies (1/s): two or three visible swings
  // Degrees of steady lean per 1000 px/s² of the hand's acceleration. Small on
  // purpose: a stop is an impulse, and its kick is (lag·k/1000)·Δv, so this
  // gives about 6° for a 1000 px/s stop and about 18° for a hard fling.
  lag: 0.5,
  maxLean: 15,       // degrees
  jostleK: 110,      // a bumped frame's spring back to its place
  jostleC: 11,
  bumpSpin: 0.009,   // spin per px/s of closing speed: ~12° for the knocked frame at 1300 px/s
  bonkSpeed: 120,    // px/s: slower than this, frames just slide past each other
  shove: 0.35,       // two frames in hands: how much overlap each pushes out per step
  maxJolt: 70,       // px: the furthest a bump ever knocks a frame from its place
  growK: 220,        // the spring from parked size to held size
  growC: 22,
  parked: 0.5,
  held: 1.0,
  hopTime: 0.42, hopHeight: 74,
  nodTime: 0.34, bowTime: 0.95, shakeTime: 0.62
});

export function createPuppet({ id, x, y, scale = 1, home = "stage", owner = null, rod = 112, w = 230, h = 393 }) {
  return {
    id, owner, home, rod, w, h,
    x, y, vx: 0, vy: 0, ax: 0,          // the grip
    restX: x, restY: y,                  // where it stands when nobody holds it
    lean: 0, leanV: 0,                   // tilt about the grip, degrees
    jx: 0, jv: 0,                        // a bump's sideways jolt
    scale, scaleV: 0, scaleTo: scale,    // parked 0.5, held 1
    turn: 0, turnV: 0, turnTo: 0,        // 0 facing the table, 180 its back
    heldBy: null, target: null,
    verbs: []                            // [{ verb, t }]
  };
}

/** The verbs a held puppet can perform. Each is a short envelope, nothing more. */
export const VERBS = Object.freeze(["hop", "nod", "bow", "shake", "turn"]);

export function perform(p, verb) {
  if (verb === "turn") { p.turnTo = p.turnTo ? 0 : 180; return p; }
  if (VERBS.includes(verb)) p.verbs.push({ verb, t: 0 });
  return p;
}

/**
 * One fixed step. `dt` in seconds (1/120 is the intended rate).
 * Semi-implicit Euler: stable for these stiffnesses at that rate.
 */
export function stepPuppet(p, dt, F = FEEL) {
  const tx = p.target ? p.target.x : p.restX;
  const ty = p.target ? p.target.y : p.restY;
  // The grip: a critically damped spring chasing the hand. Its acceleration is
  // smooth by construction, which is what makes the lean read as weight rather
  // than jitter.
  const w = F.follow;
  const ax = w * w * (tx - p.x) - 2 * w * p.vx;
  const ay = w * w * (ty - p.y) - 2 * w * p.vy;
  p.vx += ax * dt; p.vy += ay * dt;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.ax = ax;

  // The lean: the frame lags the hand (accelerate right, the top falls back
  // left, a negative lean). A spring pulls it upright.
  const torque = -F.stiffness * p.lean - F.damping * p.leanV - (F.lag * F.stiffness / 1000) * ax;
  p.leanV += torque * dt;
  p.lean += p.leanV * dt;
  p.lean = clamp(p.lean, -F.maxLean * 1.6, F.maxLean * 1.6);

  // A bump's jolt springs back to nothing.
  const ja = -F.jostleK * p.jx - F.jostleC * p.jv;
  p.jv += ja * dt; p.jx += p.jv * dt;

  // Size: parked or held, with a little overshoot.
  const sa = F.growK * (p.scaleTo - p.scale) - F.growC * p.scaleV;
  p.scaleV += sa * dt; p.scale += p.scaleV * dt;

  // Turning its back: a soft spring on the turn.
  const ta = 160 * (p.turnTo - p.turn) - 18 * p.turnV;
  p.turnV += ta * dt; p.turn += p.turnV * dt;

  for (const v of p.verbs) v.t += dt;
  p.verbs = p.verbs.filter((v) => v.t < verbTime(v.verb, F));
  return p;
}

function verbTime(verb, F) {
  return verb === "hop" ? F.hopTime : verb === "nod" ? F.nodTime : verb === "bow" ? F.bowTime : F.shakeTime;
}

/**
 * What the verbs add to the pose this instant: a lift, a squash, a forward
 * tip (rotateX) and a head-shake (rotateY). Envelopes, so they compose.
 */
export function verbPose(p, F = FEEL) {
  let lift = 0;
  let squash = 1;
  let tipX = 0;
  let shakeY = 0;
  let dip = 0;
  for (const v of p.verbs) {
    const u = v.t / verbTime(v.verb, F);
    if (v.verb === "hop") {
      lift += 4 * F.hopHeight * u * (1 - u);
      if (u < 0.12) squash *= 1 - 0.1 * Math.sin((u / 0.12) * Math.PI);
      if (u > 0.86) squash *= 1 - 0.12 * Math.sin(((u - 0.86) / 0.14) * Math.PI);
    } else if (v.verb === "nod") {
      dip += 12 * Math.sin(u * Math.PI);
      squash *= 1 - 0.04 * Math.sin(u * Math.PI);
    } else if (v.verb === "bow") {
      tipX += 34 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (u < 0.62 ? 1 : Math.max(0, (1 - u) / 0.38));
    } else if (v.verb === "shake") {
      shakeY += 18 * Math.exp(-3.2 * u) * Math.sin(u * 4 * 2 * Math.PI);
    }
  }
  return { lift, squash, tipX, shakeY, dip };
}

/** The frame's box on screen this instant (for bumps), grip at the bottom. */
export function box(p) {
  const s = p.scale;
  const left = p.x + p.jx - (p.w * s) / 2;
  const bottom = p.y - p.rod * s;
  return { left, right: left + p.w * s, top: bottom - p.h * s, bottom };
}

/**
 * Bumps between frames. Only a frame in someone's hand starts one.
 *
 *   - The moment two frames meet: one jolt and one spin each, top falling
 *     away, scaled by how fast they closed (a "bonk"), and a contact for an
 *     impact mark and a sound.
 *   - After that, a frame in a hand passes IN FRONT of a standing frame: it
 *     never bulldozes it across the stage (found in the lab: a swing through
 *     a standing frame shoved it on top of the next one and hid it).
 *   - Two frames that are both in hands push each other apart softly for as
 *     long as they overlap, so two players can shove at each other.
 *   - Every jolt is cosmetic, capped, and springs back to where the frame
 *     stands. Only its own player's drop ever moves a frame.
 */
export function collide(puppets, touching = new Set(), F = FEEL) {
  const contacts = [];
  const now = new Set();
  const cap = (v) => clamp(v, -F.maxJolt, F.maxJolt);
  for (let i = 0; i < puppets.length; i++) {
    for (let j = i + 1; j < puppets.length; j++) {
      const a = puppets[i];
      const b = puppets[j];
      if (!a.heldBy && !b.heldBy) continue;
      if (a.home === "wings" || b.home === "wings") continue;
      const A = box(a);
      const B = box(b);
      const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
      const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (ox <= 0 || oy <= 0) continue;
      // s points from a to b: the side b is knocked towards.
      const s = (A.left + A.right) / 2 < (B.left + B.right) / 2 ? 1 : -1;
      const giveA = a.heldBy && !b.heldBy ? 0.15 : !a.heldBy && b.heldBy ? 0.85 : 0.5;
      const giveB = 1 - giveA;
      const key = `${a.id}|${b.id}`;
      now.add(key);
      if (a.heldBy && b.heldBy) {
        a.jx = cap(a.jx - s * ox * F.shove);
        b.jx = cap(b.jx + s * ox * F.shove);
      }
      if (touching.has(key)) continue;
      const closing = Math.abs(a.vx - b.vx);
      if (closing < F.bonkSpeed) continue;
      a.jv -= s * closing * 0.3 * giveA;
      b.jv += s * closing * 0.3 * giveB;
      a.leanV -= s * closing * F.bumpSpin * 6;
      b.leanV += s * closing * F.bumpSpin * 14 * giveB;
      contacts.push({ a: a.id, b: b.id, x: s > 0 ? A.right - ox / 2 : A.left + ox / 2, y: Math.max(A.top, B.top) + oy * 0.3, speed: closing });
    }
  }
  for (const p of puppets) p.jx = cap(p.jx);
  touching.clear();
  for (const key of now) touching.add(key);
  return contacts;
}

/* ------------------------------------------------------------------ */
/*  The network half: what travels, and how a screen catches up         */
/* ------------------------------------------------------------------ */

/** Send a grip sample at most every `every` ms, and only if it moved. */
export function shouldSend(last, x, y, now, every = 33) {
  if (!last) return true;
  if (now - last.t < every) return false;
  return Math.abs(x - last.x) + Math.abs(y - last.y) > 0.75;
}

/**
 * A remote grip, shown `delay` ms in the past and interpolated between the
 * two samples either side of that moment. A short extrapolation covers a
 * late packet; after that it holds still rather than guessing.
 */
export class GripBuffer {
  constructor({ delay = 100, max = 32 } = {}) {
    this.delay = delay;
    this.max = max;
    this.samples = [];
  }

  push(sample) {
    this.samples.push(sample);
    this.samples.sort((a, b) => a.t - b.t);
    if (this.samples.length > this.max) this.samples.shift();
  }

  at(now) {
    const s = this.samples;
    if (!s.length) return null;
    const t = now - this.delay;
    if (t <= s[0].t) return { x: s[0].x, y: s[0].y };
    for (let i = 1; i < s.length; i++) {
      if (s[i].t >= t) {
        const a = s[i - 1];
        const b = s[i];
        const u = (t - a.t) / Math.max(1, b.t - a.t);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    const last = s[s.length - 1];
    const prev = s[s.length - 2] ?? last;
    const over = Math.min(t - last.t, 80);
    const span = Math.max(1, last.t - prev.t);
    return { x: last.x + ((last.x - prev.x) / span) * over, y: last.y + ((last.y - prev.y) / span) * over };
  }
}

/** Two people grab the same frame at once: the earlier grab wins, then the lower user id. */
export function arbitrate(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.t !== b.t) return a.t < b.t ? a : b;
  return a.user < b.user ? a : b;
}
