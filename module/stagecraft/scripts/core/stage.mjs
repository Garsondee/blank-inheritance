/**
 * The stage engine. Pure: no Foundry, no DOM, no three.js, no clock of its own.
 *
 * It owns every card on a stage: where each stands, who holds it, how it leans and wobbles, what it bumps, which mark
 * it rests on and which zones it is in. A caller drives it with `hold`, `setHand` and `release` (a hand), `perform`
 * (a hop, a bow), and `advance(seconds)` (time), and reads it with `snapshot()` (what a renderer needs) and `drain()`
 * (what happened). The physics is `puppets.mjs`, stepped at a fixed 1/120 s whatever the screen does, so the feel is
 * the same on every machine (feel.md §7).
 *
 * Cards also move without a hand (stage.md §5): `walkTo` sends one somewhere and it steps there (walks.mjs); a card with a
 * routine (life.mjs) goes about its business on its own; a card that arrives can walk in from the side. All three are
 * worked out from `clock()`, the time every screen shares, so they agree everywhere without being sent step by step.
 * Cards left standing on top of each other drift apart (magnets), and the people on the stage turn their heads towards a
 * card someone is carrying, or towards whoever has just bumped into them.
 */

import { idle, cheatOut, yawTo } from "./diorama.mjs";
import { createPuppet, stepPuppet, collide, box, perform, verbPose } from "./puppets.mjs";
import { makeRig, depthGrow } from "./rigspace.mjs";
import { resolveMarks, nearestFree, visibleMarks, markPose, tidy } from "./marks.mjs";
import { zonesAt, zoneChanges, outlineStates, rangeBands, zoneSlots } from "./zones.mjs";
import { planWalk, walkAt, entrancePoint, floorDistance } from "./walks.mjs";
import { describeRoutine, prepareRoutine, lifeAt, gestureAt } from "./life.mjs";
import { arrange } from "./formations.mjs";
import { spreadApart } from "./visibility.mjs";

export const STEP = 1 / 120;

/** The most a card behind a cut-out is ever raised, in card heights. */
export const RISER_MOST = 2.5;

/** Tunables that are about the stage rather than the springs (the springs are FEEL in puppets.mjs). */
export const STAGE = Object.freeze({
  card: { w: 280, h: 468 },   // a card at scale 1, in reference pixels (a skin may say otherwise)
  holdLift: 70,               // how far a held card is raised off the floor
  stickLength: 134,           // a stick at scale 1
  lane: 150,                  // cards this close in depth can bump
  passInFront: 85,            // how far in front a held card steps while it overlaps another
  gripRate: 16,               // how fast the stick comes out and goes in (per second)
  limits: { x: [-1800, 1800], z: [-2300, 260] },
  zoneEvery: 4,               // zones are checked every this many steps (30 a second)
  look: { reach: 900, most: 22, linger: 2.6 },   // heads turn to a carried card this close, this far (degrees), and to a bump for this long
  magnet: { overlap: 0.42, lane: 110, rate: 9 }   // standing cards overlapping by more than this share drift apart, this fast
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Move `o[k]` towards `to` as a damped spring; `vk` names the velocity field. */
function spring(o, k, vk, to, dt, w = 16, zeta = 0.72) {
  const a = w * w * (to - o[k]) - 2 * zeta * w * o[vk];
  o[vk] += a * dt;
  o[k] += o[vk] * dt;
}

function hashSeed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 1000 + ((h >>> 0) % 9000);
}

export class Stage {
  /**
   * @param scene  a normalised description (`describeScene(...).scene`)
   * @param people the published cards: [{ id, name, portrait?, colour?, at | X,Z | mark, yaw?, size?, demeanour?, emote?,
   *               lean?, pitch?, life?, still?, packed?, enter? }]
   * @param opts   { card: { w, h }, limits, clock }   `clock()` is the time every screen shares, in seconds
   */
  constructor(scene, people = [], opts = {}) {
    this.scene = scene;
    this.opts = {
      ...STAGE, ...opts,
      card: { ...STAGE.card, ...(opts.card ?? {}) }, limits: { ...STAGE.limits, ...(opts.limits ?? {}) },
      look: { ...STAGE.look, ...(opts.look ?? {}) }, magnet: { ...STAGE.magnet, ...(opts.magnet ?? {}) }
    };
    this.clock = typeof opts.clock === "function" ? opts.clock : () => this.time;
    this.rig = makeRig(scene.painting, scene.rig);
    const placed = resolveMarks(scene.marks, this.rig);
    this.marks = placed.marks;
    this.problems = placed.dropped.map((id) => `mark "${id}" is above the horizon and cannot be stood on`);
    this.zones = scene.zones;
    this.bands = rangeBands(scene.zones);
    this.focus = this.#focus();
    this.risers = this.#cutOuts();
    this.cards = new Map();
    this.resting = new Map();       // mark id -> Set of card ids
    this.touching = new Map();      // "a|b" -> Set, the per-pair memory behind "one bonk per meeting"
    this.inZones = new Map();       // card id -> Set of zone ids
    this.events = [];
    this.recentBonks = [];
    this.time = 0;
    this.acc = 0;
    this.steps = 0;
    this.lifeOn = true;             // the GM's "Life" switch: routines run
    this.board = false;             // the GM's fight board: zones drawn plainly, with who is in each
    this.speaker = null;            // who has the floor: lit, and everyone else turns to look at them
    this.slots = new Map();         // zone id -> the places a card can dock in it (worked out when first wanted)
    for (const p of people) this.addCard(p);
  }

  /**
   * The cut-outs that raise whoever stands behind them, in floor units: the depth each stands at, how high its top edge is
   * there, and how far across it reaches. (The renderer stands the same cut-outs at the same depths: world.mjs.)
   */
  #cutOuts() {
    const { cam, map } = this.rig;
    const camY = cam.floorY - cam.cy;
    return (this.scene.occluders ?? []).filter((o) => o.riser).flatMap((o) => {
      const base = this.rig.standing([o.x, o.base]);
      if (!base) return [];
      const k = (cam.f - base.Z) / cam.f;
      const top = Math.min(...o.poly.map((p) => p[1]));
      const xs = o.poly.map((p) => (map.x(p[0]) - cam.cx) * k);
      return [{ Z: base.Z, top: camY - (map.y(top) - cam.cy) * k, x0: Math.min(...xs), x1: Math.max(...xs), hideAtMost: o.hideAtMost, camY, f: cam.f }];
    });
  }

  /**
   * How far a card must be raised to be seen over the cut-outs in front of it (diorama.md's riser): the line from the eye
   * over the cut-out's top edge, carried on to the card's depth, hides the card up to some height; the card is raised until
   * no more than its cut-out's share of it is hidden. Zero for a card in front of every cut-out.
   */
  riserFor(X, Z, w, h) {
    let need = 0;
    for (const r of this.risers) {
      if (Z >= r.Z - 4) continue;                                   // in front of it, or standing at it
      if (X + w / 2 < r.x0 || X - w / 2 > r.x1) continue;           // not behind it
      const hidden = r.camY + (r.top - r.camY) * ((r.f - Z) / (r.f - r.Z));
      need = Math.max(need, hidden - r.hideAtMost * h);
    }
    // A raised card's foot always stays below the line the cut-out hides up to (need is that line less the share left
    // showing), so it is never seen floating; the cap only stops something absurd behind a cut-out the size of a wall.
    return Math.max(0, Math.min(need, h * RISER_MOST));
  }

  /** How much bigger a card is drawn at depth Z (rigspace.mjs `depthGrow`). */
  grow(Z) { return depthGrow(this.rig.cam, Z); }

  /**
   * A place a formation would put a card, moved if the card could not be seen there: behind a cut-out that would hide more
   * of it than its riser could ever lift it clear of (just behind a table's front edge, say), it stands just in front of
   * that cut-out instead. Returns the Z to stand at.
   */
  unhidden(X, Z, w, h) {
    for (const r of this.risers) {
      if (Z >= r.Z - 4 || X + w / 2 < r.x0 || X - w / 2 > r.x1) continue;
      const hidden = r.camY + (r.top - r.camY) * ((r.f - Z) / (r.f - r.Z));
      if (hidden - r.hideAtMost * h > h * RISER_MOST) return r.Z + 60;
    }
    return Z;
  }

  /** The place on the floor a formation is about when nobody says otherwise: the scene's focus, or the middle of its floor. */
  #focus() {
    const r = this.scene.rig;
    const at = this.scene.focus ?? [r.vanish ?? 0.5, r.horizon + (r.floorFront - r.horizon) * 0.72];
    return this.rig.standing(at) ?? { X: 0, Z: -400 };
  }

  /* ---------------------------------------------------------------- cards */

  /** Put a card on the stage. A card names a mark to stand on, a point of the painting, or a place on the floor. */
  addCard(person) {
    if (!person?.id || this.cards.has(person.id)) return null;
    const w = this.opts.card.w;
    const h = this.opts.card.h;
    const s = this.scene.cardScale * (person.size ?? 1);
    let X = 0;
    let Z = 0;
    const mark = person.mark ? this.marks.find((m) => m.id === person.mark) : null;
    if (mark) { X = mark.X; Z = mark.Z; }
    else if (person.at) { const p = this.rig.standing(person.at); if (p) { X = p.X; Z = p.Z; } }
    else if (Number.isFinite(person.X) && Number.isFinite(person.Z)) { X = person.X; Z = person.Z; }
    const c = {
      id: person.id, person, s, w: w * s, h: h * s, seed: hashSeed(person.id),
      puppet: createPuppet({ id: person.id, x: X, y: 0, rod: 0, w: w * s, h: h * s, scale: 1 }),
      Z, restZ: Z, zOff: 0, grip: 0, holder: null, hand: null,
      yaw: person.yaw ?? 0, yawV: 0, yawTo: person.yaw ?? 0,
      lean: person.lean ?? 0, leanV: 0, leanTo: person.lean ?? 0,
      pitch: person.pitch ?? 0, pitchV: 0, pitchTo: person.pitch ?? 0,
      lift: 0, liftV: 0, liftTo: 0,
      mark: null,
      walk: null,                    // where it is walking to, if it is (walks.mjs)
      routine: null,                 // what it does on its own (life.mjs), ready to run here
      still: person.still === true,  // its routine is set aside: it stays where it was put
      living: false,                 // its routine was driving it last step
      packed: person.packed === true, // it stands close on purpose (a huddle, a gang-up): the magnets leave it be
      stepLift: 0, stepRock: 0,      // the bob and tip of a step
      look: 0, lookV: 0, attention: null,
      riser: 0, riserTo: 0,          // how far it is raised to be seen over a cut-out in front of it
      down: person.down === true ? 1 : 0, downV: 0, downTo: person.down === true ? 1 : 0,   // fallen (0 standing, 1 lying flat)
      grow: this.grow(Z)               // drawn this much bigger at its depth, so the back of a room does not shrink it away
    };
    c.riser = c.riserTo = this.riserFor(X, Z, c.w * c.grow, c.h * c.grow);
    this.cards.set(c.id, c);
    if (mark) this.#settle(c, mark, true);
    const routine = describeRoutine(person.life);
    if (routine) c.routine = prepareRoutine(routine, { home: { X, Z }, rig: this.rig, marks: this.marks, seed: c.seed });
    if (c.routine && !c.still && this.lifeOn && !mark) {
      // a card that is going about its business is already wherever its routine has it, on every screen alike
      const at = lifeAt(c.routine, this.clock());
      c.puppet.x = c.puppet.restX = at.X;
      c.Z = c.restZ = at.Z;
      if (at.yaw !== null) c.yaw = c.yawTo = at.yaw;
      c.living = true;
    }
    // walking on: it appears at the side and walks to its place, starting at the moment the scene says it did; or it rises
    // up out of the floor where it stands (out of the water, out of a trapdoor), with a spring to it
    const enter = person.enter;
    if (enter && typeof enter === "object" && enter.from === "rise") {
      const t0 = Number.isFinite(enter.t0) ? enter.t0 : this.clock();
      c.rise = { t0, dur: Number.isFinite(enter.dur) ? enter.dur : 0.7 };
    }
    // someone arriving now (not long ago, on a page loaded later) is looked at by whoever is near
    if (enter && Number.isFinite(enter.t0) && this.clock() - enter.t0 < 3) this.#glanceAt(c);
    if (enter && typeof enter === "object" && ["left", "right", "back"].includes(enter.from)) {
      const t0 = Number.isFinite(enter.t0) ? enter.t0 : this.clock();
      const from = entrancePoint(enter.from, { X, Z }, this.opts.limits);
      const w0 = planWalk(from, { X, Z }, { t0, gait: enter.gait ?? "walk", yaw: c.yawTo, maxDur: 8 });
      if (this.clock() < w0.t0 + w0.dur) {
        c.walk = w0;
        const p = walkAt(w0, this.clock());
        c.puppet.x = c.puppet.restX = p.X;
        c.Z = c.restZ = p.Z;
      }
    }
    return c;
  }

  removeCard(id) {
    const c = this.cards.get(id);
    if (!c) return false;
    if (c.mark) this.resting.get(c.mark)?.delete(id);
    this.cards.delete(id);
    this.inZones.delete(id);
    for (const key of [...this.touching.keys()]) if (key.split("|").includes(id)) this.touching.delete(key);
    return true;
  }

  /* ---------------------------------------------------------------- moving without a hand */

  /**
   * Send a card somewhere: it steps there (walks.mjs). `to` is { X, Z }, { at: [fx, fy] } (a point of the painting) or
   * { mark: id }. `t0` is when it sets off on the shared clock (a screen that hears late catches up); `yaw`, `lean` and
   * `pitch` are how it stands when it gets there; `still` sets its routine aside (a formation does), `packed` lets it
   * stand close to others. A card in a hand is not sent anywhere. Returns the walk, or null.
   */
  walkTo(id, to, { t0 = null, gait = "walk", yaw = null, lean = null, pitch = null, still = null, packed = null } = {}) {
    const c = this.cards.get(id);
    if (!c || c.holder !== null) return null;
    let dest = null;
    let mark = null;
    if (to?.mark) { mark = this.marks.find((m) => m.id === to.mark) ?? null; if (mark) dest = { X: mark.X, Z: mark.Z }; }
    else if (Array.isArray(to?.at)) dest = this.rig.standing(to.at);
    else if (Number.isFinite(to?.X) && Number.isFinite(to?.Z)) dest = { X: to.X, Z: to.Z };
    if (!dest) return null;
    const L = this.opts.limits;
    dest = { X: clamp(dest.X, L.x[0], L.x[1]), Z: clamp(dest.Z, L.z[0], L.z[1]) };
    if (c.mark) { this.resting.get(c.mark)?.delete(id); c.mark = null; }
    if (mark) {
      // the mark is taken from the moment the card sets off, so nobody else is sent to it on the way
      let set = this.resting.get(mark.id);
      if (!set) this.resting.set(mark.id, (set = new Set()));
      set.add(id);
      c.mark = mark.id;
    }
    if (still !== null) c.still = !!still;
    if (packed !== null) c.packed = !!packed;
    const pose = mark ? markPose(mark, this.#faceContext()) : { yaw: yaw ?? c.yawTo, lean: lean ?? 0, pitch: pitch ?? 0, lift: 0 };
    const start = t0 ?? this.clock();
    c.walk = planWalk({ X: c.puppet.x, Z: c.Z }, dest, { t0: start, gait, yaw: pose.yaw });
    c.walk.pose = pose;
    c.walk.mark = mark?.id ?? null;
    c.living = false;
    this.events.push({ type: "walk", card: id, to: { X: dest.X, Z: dest.Z }, mark: mark?.id ?? null, t: this.time });
    return c.walk;
  }

  /**
   * Give a card a new routine (as authored: life.mjs), keeping its home unless given a new one (`home`, a point of the
   * painting). A card whose routine changes while it is going about its business walks to wherever the new one has it,
   * rather than jumping.
   */
  setRoutine(id, life, home = null) {
    const c = this.cards.get(id);
    if (!c) return;
    const given = Array.isArray(home) ? this.rig.standing(home) : null;
    home = given ? { X: given.X, Z: given.Z } : c.routine?.home ?? { X: c.puppet.restX, Z: c.restZ };
    const routine = describeRoutine(life);
    c.routine = routine ? prepareRoutine(routine, { home, rig: this.rig, marks: this.marks, seed: c.seed }) : null;
    c.living = false;
  }

  /** Set a card's routine aside (it stays where it is) or let it go back to it. */
  setStill(id, still) {
    const c = this.cards.get(id);
    if (c) c.still = !!still;
  }

  /** The GM's "Life" switch: when off, nobody goes about their business; they stand where they are. */
  setLife(on) { this.lifeOn = !!on; }

  /** The GM's fight board: zones drawn plainly with who is in each, and the range bands between them. */
  setBoard(on) { this.board = !!on; }

  /**
   * A card falls down (a foe defeated, someone knocked out) or gets back up. Down, it tips over backwards with a bump and
   * lies on the floor, dimmed; it does not go about its routine and turns its head to nobody. Returns whether it changed.
   */
  setDown(id, down) {
    const c = this.cards.get(id);
    if (!c) return false;
    const to = down ? 1 : 0;
    if (c.downTo === to) return false;
    c.downTo = to;
    if (down && c.walk) this.#stopWalking(c);
    this.events.push({ type: "fall", card: id, down: !!down, t: this.time });
    if (down) this.#glanceAt(c);
    return true;
  }

  /** Everyone near a card looks round at it for a moment (it has just fallen, or just arrived). */
  #glanceAt(c) {
    const until = this.clock() + this.opts.look.linger;
    for (const o of this.cards.values()) {
      if (o === c || o.holder !== null || o.downTo) continue;
      if (floorDistance({ X: o.puppet.x, Z: o.Z }, { X: c.puppet.x, Z: c.Z }) <= this.opts.look.reach * 1.4) o.attention = { id: c.id, until };
    }
  }

  /** Who has the floor (a card's id, or null): they are lit, and the people on the stage turn their heads to them. */
  setSpeaker(id) { this.speaker = id && this.cards.has(id) ? id : null; }

  /**
   * Where a card let go inside a fight position docks while the board is up (stage.md §8.3): the nearest place in that
   * position that nobody else is standing on, so a fight's positions stay readable. Null when the board is down, the point
   * is in no position, or every place is taken.
   */
  dockFor(id, x, z) {
    if (!this.board) return null;
    const f = this.rig.fractionOf(x, z);
    const zone = this.zones.find((q) => q.kind === "area" && zonesAt([q], f[0], f[1]).length);
    if (!zone) return null;
    const c = this.cards.get(id);
    const w = (c?.w ?? 180) * this.grow(z);
    if (!this.slots.has(zone.id)) this.slots.set(zone.id, zoneSlots(zone, this.rig, { w: w * 1.05 }));
    const taken = [...this.cards.values()].filter((o) => o.id !== id && o.holder === null).map((o) => ({ X: o.walk ? o.walk.to.X : o.puppet.restX, Z: o.walk ? o.walk.to.Z : o.restZ }));
    const free = this.slots.get(zone.id).filter((s) => !taken.some((t) => Math.abs(t.X - s.X) < w * 0.6 && Math.abs(t.Z - s.Z) < 90));
    if (!free.length) return null;
    free.sort((a, b) => Math.hypot(a.X - x, (a.Z - z) * 0.8) - Math.hypot(b.X - x, (b.Z - z) * 0.8));
    return { X: free[0].X, Z: free[0].Z, zone: zone.id };
  }

  /* ---------------------------------------------------------------- hands */

  /** Take hold of a card. Returns false if someone else already has it. */
  hold(id, who) {
    const c = this.cards.get(id);
    if (!c) return false;
    if (c.holder !== null && c.holder !== who) return false;
    if (c.holder === who) return true;
    if (c.mark) { this.resting.get(c.mark)?.delete(id); c.mark = null; }   // its mark is free the moment it is lifted
    this.#stopWalking(c);
    if (c.routine) c.still = true;     // someone has taken charge of it: it stays wherever it is put down
    c.holder = who;
    c.hand = { x: c.puppet.x, z: c.Z };
    c.puppet.heldBy = who;
    this.events.push({ type: "grab", card: id, by: who, t: this.time });
    return true;
  }

  /** Where the hand is, in floor coordinates. */
  setHand(id, { x, z }) {
    const c = this.cards.get(id);
    if (!c || c.holder === null) return;
    const L = this.opts.limits;
    c.hand.x = clamp(x, L.x[0], L.x[1]);
    c.hand.z = clamp(z, L.z[0], L.z[1]);
  }

  /**
   * Let go. The card rests where it is, or goes to the mark within reach. Returns what happened.
   * A screen that was only watching the hand passes `landing` (the holder's own { X, Z, mark }), so that every screen
   * puts the card in exactly the place its holder's screen chose.
   */
  release(id, landing = null) {
    const c = this.cards.get(id);
    if (!c || c.holder === null) return null;
    const by = c.holder;
    const L = landing ?? this.landingFor(id);
    c.holder = null;
    c.hand = null;
    c.puppet.heldBy = null;
    const mark = L.mark ? this.marks.find((m) => m.id === L.mark) ?? null : null;
    if (mark) this.#settle(c, mark, false);
    else { c.puppet.restX = L.X; c.restZ = clamp(L.Z, this.opts.limits.z[0], this.opts.limits.z[1]); c.mark = null; }
    const result = { type: "drop", card: id, by, t: this.time, mark: mark?.id ?? null, X: c.puppet.restX, Z: c.restZ };
    this.events.push(result);
    // put down at a door or at something to look at: the card has gone there (the stage says so, the GM hears of it)
    const f = this.rig.fractionOf(c.puppet.restX, c.restZ);
    const at = zonesAt(this.zones.filter((z) => z.kind === "door" || z.kind === "spot"), f[0], f[1])[0];
    if (at) this.events.push({ type: "visit", card: id, by, zone: at.id, name: at.name, hint: at.hint, t: this.time });
    return result;
  }

  /** Where a held card would come to rest if it were let go this instant: { X, Z, mark } (mark is an id or null). */
  landingFor(id) {
    const c = this.cards.get(id);
    if (!c || c.holder === null) return null;
    const x = c.puppet.x;
    const z = c.hand?.z ?? c.Z;
    let mark = nearestFree(this.marks, this.resting, x, z, this.scene.reach.snap);
    if (!mark && this.scene.marksOnly) mark = nearestFree(this.marks, this.resting, x, z, Infinity);
    // with the fight board up, a card let go in a position docks in a free place in it
    const dock = mark ? null : this.dockFor(id, x, z);
    if (dock) return { X: dock.X, Z: dock.Z, mark: null };
    return { X: x, Z: clamp(z, this.opts.limits.z[0], this.opts.limits.z[1]), mark: mark?.id ?? null };
  }

  /** Another hand has the card now (a grab that lost to an earlier one). No event, no landing: the card stays in the air. */
  handOver(id, who) {
    const c = this.cards.get(id);
    if (!c) return false;
    if (c.mark) { this.resting.get(c.mark)?.delete(id); c.mark = null; }
    this.#stopWalking(c);
    if (c.routine) c.still = true;
    c.hand ??= { x: c.puppet.x, z: c.Z };
    c.holder = who;
    c.puppet.heldBy = who;
    return true;
  }

  /** A walk cut short (the card was picked up): it stands where it had got to. */
  #stopWalking(c) {
    if (!c.walk) return;
    c.walk = null;
    c.puppet.restX = c.puppet.x;
    c.restZ = c.Z;
    c.stepLift = 0;
    c.stepRock = 0;
  }

  /** A hop, a nod, a bow, a shake of the head, or turning its back (puppets.mjs VERBS). */
  perform(id, verb) {
    const c = this.cards.get(id);
    if (c) perform(c.puppet, verb);
  }

  #settle(c, mark, instant) {
    let set = this.resting.get(mark.id);
    if (!set) this.resting.set(mark.id, (set = new Set()));
    set.add(c.id);
    c.mark = mark.id;
    const pose = markPose(mark, this.#faceContext());
    c.puppet.restX = mark.X;
    c.restZ = mark.Z;
    c.yawTo = pose.yaw;
    c.leanTo = pose.lean;
    c.pitchTo = pose.pitch;
    c.liftTo = pose.lift;
    if (instant) {
      c.puppet.x = mark.X; c.Z = mark.Z;
      c.yaw = pose.yaw; c.lean = pose.lean; c.pitch = pose.pitch; c.lift = pose.lift;
    }
    this.events.push({ type: "mark", card: c.id, mark: mark.id, t: this.time });
  }

  #faceContext() {
    return {
      zones: this.zones,
      pointOnFloor: (f) => this.rig.standing(f),
      cardAt: (id) => { const o = this.cards.get(id); return o ? { X: o.puppet.x, Z: o.Z } : null; }
    };
  }

  /**
   * Every card to its nearest free mark (stage.md §8.10, the GM's Tidy): each walks there. Returns the pairs. `t0` is when
   * they set off on the shared clock, so that every screen that is told to tidy sends them off together.
   */
  tidy({ t0 = null } = {}) {
    const free = this.marks.map((m) => ({ ...m, capacity: m.capacity - (this.resting.get(m.id)?.size ?? 0) })).filter((m) => m.capacity > 0);
    const loose = [...this.cards.values()].filter((c) => !c.mark && c.holder === null && !c.walk).map((c) => ({ id: c.id, X: c.puppet.x, Z: c.Z }));
    const pairs = tidy(free, loose);
    for (const { card, mark } of pairs) this.walkTo(card, { mark }, { t0, gait: "hurry", still: true });
    return pairs;
  }

  /* ---------------------------------------------------------------- time */

  /** Advance by `dt` seconds of real time, in fixed steps. Returns how many steps ran. A long gap is clamped. */
  advance(dt) {
    this.acc += Math.min(Math.max(dt, 0), 0.05);
    let n = 0;
    while (this.acc >= STEP - 1e-9) { this.step(STEP); this.acc -= STEP; n++; }
    return n;
  }

  /** One fixed step of everything. */
  step(dt = STEP) {
    this.time += dt;
    this.steps++;
    const o = this.opts;
    const now = this.clock();
    const held = [...this.cards.values()].filter((c) => c.holder !== null);
    for (const c of this.cards.values()) {
      const p = c.puppet;
      const inHand = c.holder !== null;
      if (!inHand) this.#move(c, now);
      p.heldBy = inHand ? c.holder : null;
      p.target = inHand ? { x: c.hand.x, y: 0 } : null;
      stepPuppet(p, dt);
      c.Z += ((inHand ? c.hand.z : c.restZ) - c.Z) * Math.min(1, dt * (inHand ? 24 : 12));
      c.grip += ((inHand ? 1 : 0) - c.grip) * Math.min(1, dt * o.gripRate);
      spring(c, "yaw", "yawV", c.yawTo, dt, 16, 0.72);
      spring(c, "lean", "leanV", c.leanTo, dt, 18, 0.8);
      spring(c, "pitch", "pitchV", c.pitchTo, dt, 18, 0.8);
      spring(c, "lift", "liftV", c.liftTo, dt, 18, 0.62);
      spring(c, "look", "lookV", inHand || c.downTo ? 0 : this.#lookTo(c, held, now), dt, 7, 0.9);
      c.riser += (c.riserTo - c.riser) * Math.min(1, dt * 9);
      c.grow = this.grow(c.Z);
      // falling: a stiff spring that overshoots a little, so it lands with a bounce; getting up is slower
      if (c.downTo) spring(c, "down", "downV", 1, dt, 9, 0.45);
      else spring(c, "down", "downV", 0, dt, 6, 0.8);
      if (c.down > 1.08) { c.down = 1.08; c.downV = -Math.abs(c.downV) * 0.35; }
    }
    this.#bumps(dt);
    if (this.steps % o.zoneEvery === 0) {
      this.#zones();
      this.#magnets(dt * o.zoneEvery);
      if (this.risers.length) for (const c of this.cards.values()) c.riserTo = this.riserFor(c.puppet.x, c.Z, c.w * c.grow, c.h * c.grow);
    }
  }

  /**
   * Where a card nobody holds should be this step: on its walk, about its routine, or where it was put. A walk always
   * wins; a routine runs only while life is on and the card is not set aside; a card coming back to its routine from
   * somewhere else walks back to it first rather than jumping.
   */
  #move(c, now) {
    const p = c.puppet;
    if (c.walk) {
      const w = walkAt(c.walk, now);
      p.restX = w.X;
      c.restZ = w.Z;
      c.stepLift = w.lift;
      c.stepRock = w.rock;
      if (w.yaw !== null) c.yawTo = w.yaw;
      if (w.done) this.#arrive(c);
      return;
    }
    const living = !!c.routine && this.lifeOn && !c.still && !c.downTo;
    if (living) {
      const at = lifeAt(c.routine, now);
      if (!c.living && floorDistance({ X: p.restX, Z: c.restZ }, at) > 12) {
        // back to work from wherever it was put: walk to where the routine will be by the time it gets there
        const guess = planWalk({ X: p.x, Z: c.Z }, at, { t0: now, gait: c.routine.gait });
        const ahead = lifeAt(c.routine, now + guess.dur);
        c.walk = planWalk({ X: p.x, Z: c.Z }, ahead, { t0: now, gait: c.routine.gait, yaw: ahead.yaw ?? c.yawTo });
        c.walk.pose = { yaw: ahead.yaw ?? c.yawTo, lean: 0, pitch: 0, lift: 0 };
        c.walk.mark = null;
        c.walk.back = true;
        return;
      }
      c.living = true;
      p.restX = at.X;
      c.restZ = at.Z;
      c.stepLift = at.lift;
      c.stepRock = at.rock;
      if (!at.moving && c.routine.facesCard) {
        // talking to someone: turned to them, cheated out, while standing
        const other = this.cards.get(c.routine.facesCard);
        if (other) c.yawTo = cheatOut(yawTo(at.X, at.Z, other.puppet.x, other.Z), { share: 0.8, max: 55 });
      } else if (at.yaw !== null) c.yawTo = at.yaw;
      // now and then a small gesture (a nod, a bow), on the same beat on every screen
      const g = gestureAt(c.routine, now);
      if (g && !at.moving && now >= g.at && now < g.at + 0.5 && c.gestured !== g.beat) {
        c.gestured = g.beat;
        perform(p, g.verb);
      }
      return;
    }
    c.living = false;
    c.stepLift *= 0.8;
    c.stepRock *= 0.8;
  }

  /** A walk has ended: the card stands at its place, turned the way it should stand, on its mark if it was sent to one. */
  #arrive(c) {
    const w = c.walk;
    c.walk = null;
    c.puppet.restX = w.to.X;
    c.restZ = w.to.Z;
    c.stepLift = 0;
    c.stepRock = 0;
    const pose = w.pose ?? { yaw: w.yaw ?? c.yawTo, lean: 0, pitch: 0, lift: 0 };
    c.yawTo = pose.yaw ?? c.yawTo;
    c.leanTo = pose.lean ?? 0;
    c.pitchTo = pose.pitch ?? 0;
    c.liftTo = pose.lift ?? 0;
    // back from a walk to its routine, it checks again next step: if the routine has moved on meanwhile, it walks on to it
    c.living = false;
    if (w.mark) this.events.push({ type: "mark", card: c.id, mark: w.mark, t: this.time });
    if (!w.back) this.events.push({ type: "arrive", card: c.id, mark: w.mark ?? null, t: this.time });
  }

  /**
   * Where a card's head should be turned this step, on top of the way it stands: towards whoever just bumped into it,
   * for a moment, or else towards the nearest card in someone's hand. A small turn, cheated out, never a full about-face.
   */
  #lookTo(c, held, now) {
    const L = this.opts.look;
    let target = null;
    if (c.attention && c.attention.until > now) target = this.cards.get(c.attention.id) ?? null;
    else c.attention = null;
    if (!target) {
      let best = L.reach;
      for (const h of held) {
        if (h === c) continue;
        const d = floorDistance({ X: h.puppet.x, Z: h.Z }, { X: c.puppet.x, Z: c.Z });
        if (d < best) { best = d; target = h; }
      }
    }
    // with nothing nearer to look at, everyone looks at whoever has the floor
    if (!target && this.speaker && this.speaker !== c.id) target = this.cards.get(this.speaker) ?? null;
    if (!target) return 0;
    const want = cheatOut(yawTo(c.puppet.x, c.Z, target.puppet.x, target.Z), { share: 0.8, max: 60 });
    return clamp(want - c.yaw, -L.most, L.most);
  }

  /**
   * Magnets (stage.md §5.5): cards standing on top of each other drift apart until they no longer overlap by more than a
   * share of a card. Only cards that are standing still are moved (not one in a hand, on a walk, about its routine, or
   * packed close on purpose by a formation), and they are moved as little as it takes.
   */
  #magnets(dt) {
    const M = this.opts.magnet;
    const free = [...this.cards.values()].filter((c) => c.holder === null && !c.walk && !c.packed && !(c.routine && this.lifeOn && !c.still));
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i];
        const b = free[j];
        if (Math.abs(a.restZ - b.restZ) >= M.lane) continue;
        const dx = b.puppet.restX - a.puppet.restX;
        const wa = a.w * a.grow;
        const wb = b.w * b.grow;
        const allowed = (wa + wb) / 2 - Math.min(wa, wb) * M.overlap;
        const need = allowed - Math.abs(dx);
        if (need <= 0.5) continue;
        const dir = dx !== 0 ? Math.sign(dx) : (a.id < b.id ? 1 : -1);
        const push = Math.min(need / 2, need * M.rate * dt);
        const L = this.opts.limits.x;
        a.puppet.restX = clamp(a.puppet.restX - dir * push, L[0], L[1]);
        b.puppet.restX = clamp(b.puppet.restX + dir * push, L[0], L[1]);
      }
    }
  }

  #bumps(dt) {
    const o = this.opts;
    const done = new Set();
    for (const h of this.cards.values()) {
      if (h.holder === null) { h.zOff += (0 - h.zOff) * Math.min(1, dt * 11); continue; }
      let over = false;
      for (const other of this.cards.values()) {
        if (other === h || Math.abs(other.Z - h.Z) >= o.lane) continue;
        const key = h.id < other.id ? `${h.id}|${other.id}` : `${other.id}|${h.id}`;
        const A = box(h.puppet);
        const B = box(other.puppet);
        if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 0) over = true;
        if (done.has(key)) continue;
        done.add(key);
        let memory = this.touching.get(key);
        if (!memory) this.touching.set(key, (memory = new Set()));
        const pair = h.id < other.id ? [h, other] : [other, h];
        for (const k of collide(pair.map((c) => c.puppet), memory)) {
          const bonk = { type: "bonk", t: this.time, a: k.a, b: k.b, x: k.x, speed: k.speed, Z: h.Z };
          this.events.push(bonk);
          this.recentBonks.push(bonk);
          // whoever was bumped looks round at whoever did it, for a moment
          const until = this.clock() + this.opts.look.linger;
          const A = this.cards.get(k.a);
          const B = this.cards.get(k.b);
          if (A && B) { A.attention = { id: B.id, until }; B.attention = { id: A.id, until }; }
        }
      }
      h.zOff += ((over ? o.passInFront : 0) - h.zOff) * Math.min(1, dt * 11);
    }
    // a pair that has parted is forgotten, so the next meeting is a new bonk
    for (const [key, memory] of this.touching) if (memory.size === 0) this.touching.delete(key);
    this.recentBonks = this.recentBonks.filter((b) => this.time - b.t < 0.9);
  }

  #zones() {
    if (!this.zones.length) return;
    const now = new Map();
    for (const c of this.cards.values()) {
      const f = this.rig.fractionOf(c.puppet.x, c.Z);
      now.set(c.id, new Set(zonesAt(this.zones, f[0], f[1]).map((z) => z.id)));
    }
    for (const e of zoneChanges(this.inZones, now)) this.events.push({ ...e, t: this.time });
    this.inZones = now;
  }

  /* ---------------------------------------------------------------- reading */

  /** What happened since the last call, oldest first. */
  drain() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** The marks to show for a card in a hand: free ones near it, nearest first (stage.md §8.10). */
  marksFor(id) {
    const c = this.cards.get(id);
    if (!c || c.holder === null) return [];
    const reach = this.scene.reach;
    return visibleMarks(this.marks, this.resting, c.hand.x, c.hand.z, { show: reach.show, snap: reach.snap, max: 5 }).map((v) => ({
      id: v.id, for: id, X: v.mark.X, Z: v.mark.Z, label: v.mark.label, alpha: v.alpha, target: v.target, pose: markPose(v.mark, this.#faceContext())
    }));
  }

  /** The outline state and strength of every zone, from the cards in hands (stage.md §8.8). */
  zoneStates() {
    const held = [...this.cards.values()].filter((c) => c.holder !== null).map((c) => {
      const f = this.rig.fractionOf(c.hand.x, c.hand.z);
      return { x: f[0], y: f[1] };
    });
    return outlineStates(this.zones, held);
  }

  /**
   * Everything a renderer needs, as plain numbers: no physics knowledge required. `viewer` is the local user; only
   * the marks for cards that user holds are included (marks are a personal aid, not something to show everyone).
   */
  snapshot({ viewer = null, selected = null } = {}) {
    const t = this.time;
    const now = this.clock();
    const cards = [];
    const marks = [];
    for (const c of this.cards.values()) {
      const p = c.puppet;
      const life = idle(t, c.seed, c.person.demeanour ?? "calm", { speakerYaw: null });
      const vp = verbPose(p);
      const g = c.grip;
      const up = c.rise ? riseAt(c.rise, now) : 1;
      if (c.rise && now > c.rise.t0 + c.rise.dur) c.rise = null;
      cards.push({
        id: c.id, name: c.person.name ?? c.id, colour: c.person.colour ?? null,
        x: p.x + p.jx, z: c.Z + c.zOff,
        lift: (life.lift * (1 - g) + c.lift + c.stepLift + c.riser) * (1 - Math.min(1, c.down)) + this.opts.holdLift * g + vp.lift,
        lean: p.lean + (c.lean + life.lean) * (1 - 0.85 * g) * (1 - Math.min(1, c.down)) + c.stepRock,
        yaw: c.yaw + p.turn + vp.shakeY + life.yaw + c.look,
        // down: tipped over backwards to lie on the floor (a little short of flat, so the face still reads from the table)
        pitch: (c.pitch + life.pitch + vp.tipX + vp.dip * 0.4) * (1 - Math.min(1, c.down)) - 78 * c.down,
        down: Math.max(0, Math.min(1, c.down)),
        grip: g, breathe: life.breathe, squash: vp.squash * up, scale: c.s * c.grow, grow: c.grow,
        held: c.holder !== null, holder: c.holder, mark: c.mark,
        walking: !!c.walk || (c.living && Math.abs(c.stepLift) > 0.2),
        selected: !!selected?.has?.(c.id),
        speaking: this.speaker === c.id,
        emote: this.#emote(c, t)
      });
      if (viewer !== null && c.holder === viewer) marks.push(...this.marksFor(c.id));
    }
    return { t, cards, bonks: this.recentBonks.map((b) => ({ ...b })), marks, zones: this.zoneStates(), board: this.board ? this.boardState() : null };
  }

  /** Who is in each zone, and the range bands between zones: what the fight board shows (stage.md §8.6). */
  boardState() {
    const counts = {};
    const downs = {};
    for (const z of this.zones) { counts[z.id] = 0; downs[z.id] = 0; }
    // who is standing in each position, and, apart, who is down in it (a fallen foe still lies where it fell)
    for (const [card, set] of this.inZones) {
      const down = this.cards.get(card)?.downTo === 1;
      for (const id of set) if (id in counts) (down ? downs : counts)[id]++;
    }
    return { counts, downs, bands: this.bands };
  }

  /** The range band between two zones: "engaged" (the same zone), "near" (next to each other) or "far". */
  bandBetween(a, b) {
    if (!a || !b) return null;
    if (a === b) return "engaged";
    return this.bands.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)) ? "near" : "far";
  }

  #emote(c, t) {
    const e = c.person.emote;
    if (!e?.id) return null;
    const age = (t - (e.t0 ?? 0)) % 6;
    const opacity = age < 0 ? 0 : age < 0.2 ? age / 0.2 : age > 4.4 ? Math.max(0, 1 - (age - 4.4) / 0.6) : 1;
    const pop = age < 0.3 ? 0.6 + 0.4 * Math.sin((age / 0.3) * Math.PI * 0.5) + 0.12 * Math.sin((age / 0.3) * Math.PI) : 1;
    return { id: e.id, age, opacity, pop };
  }

  /**
   * Where one card stands now, in fractions of the painting, so it can be saved and put back at any size. A card on its
   * way somewhere is saved where it is going.
   */
  placeOf(id) {
    const c = this.cards.get(id);
    if (!c) return null;
    const X = c.walk ? c.walk.to.X : c.puppet.restX;
    const Z = c.walk ? c.walk.to.Z : c.restZ;
    const yaw = c.walk ? (c.walk.pose?.yaw ?? c.yawTo) : c.yawTo;
    return { id: c.id, at: this.rig.fractionOf(X, Z).map((n) => Math.round(n * 10000) / 10000), mark: c.mark, yaw: Math.round(yaw * 10) / 10 };
  }

  /**
   * A formation as moves to publish (formations.mjs): who goes where, in fractions of the painting, and how they stand.
   * `ids` limits it to those cards (the GM's selection); `focus` is a point of the painting ([fx, fy]) or a card's id, and
   * defaults to the scene's focus. The moves carry `still` (routines set aside) and, for the close formations, `packed`.
   */
  formationMoves(kind, { ids = null, focus = null, target = null, speakers = [], party = false, gait = "walk", dir = "back", away = false, size = null } = {}) {
    const all = this.standing();
    const cards = ids ? all.filter((c) => ids.includes(c.id)) : all;
    let at = this.focus;
    if (Array.isArray(focus)) at = this.rig.standing(focus) ?? this.focus;
    else if (typeof focus === "string" && this.cards.has(focus)) { const c = this.cards.get(focus); at = { X: c.puppet.restX, Z: c.restZ }; }
    // cards are drawn bigger the further back they stand, so they are spaced for the size they will be where they gather
    const g = this.grow(at.Z);
    const sized = cards.map((c) => ({ ...c, w: c.w * g }));
    if (kind === "position") return this.#positionMoves(sized, at, { party, gait });
    const packed = ["huddle", "gangup", "queue"].includes(kind);
    // `size`: how wide the thing they gather round is, as a share of the painting's width where they gather
    let radius = null;
    if (Number.isFinite(size) && size > 0) {
      const f = this.rig.fractionOf(at.X, at.Z);
      const a = this.rig.standing([f[0] - size / 2, f[1]]);
      const b = this.rig.standing([f[0] + size / 2, f[1]]);
      if (a && b) radius = Math.abs(b.X - a.X) / 2;
    }
    const arranged = arrange(kind, { cards: sized, focus: at, target, speakers, party, dir, radius, limits: { x: this.opts.limits.x, z: [this.opts.limits.z[0], 200] }, seed: this.steps % 7 })
      .filter((p) => this.cards.has(p.id))
      .map((p) => { const c = this.cards.get(p.id); const pg = this.grow(p.Z); return { ...p, Z: this.unhidden(p.X, p.Z, c.w * pg, c.h * pg) }; });
    // then loosened just enough that no face is hidden behind another (visibility.mjs), the formation's own people and
    // anyone else on the stage alike; only the formation's people move
    const movers = new Set(arranged.map((p) => p.id));
    const asCard = (id, X, Z) => {
      const c = this.cards.get(id);
      const pg = this.grow(Z);
      return { id, X, Z, w: c.w * pg, h: c.h * pg, lift: this.riserFor(X, Z, c.w * pg, c.h * pg) };
    };
    const everyone = [...arranged.map((p) => asCard(p.id, p.X, p.Z)), ...all.filter((c) => !movers.has(c.id)).map((c) => asCard(c.id, c.X, c.Z))];
    const loose = new Map(spreadApart(this.rig, everyone, movers, { limits: this.opts.limits.x }).map((c) => [c.id, c.X]));
    const placed = arranged.map((p) => {
      const c = this.cards.get(p.id);
      const X = loose.get(p.id) ?? p.X;
      const pg = this.grow(p.Z);
      return { ...p, X, Z: this.unhidden(X, p.Z, c.w * pg, c.h * pg) };
    });
    // `away`: everyone turns right round to look where the formation looks (out over the view, up at the stage), backs to the table
    return placed.map((p) => ({
      id: p.id, at: this.rig.fractionOf(p.X, p.Z).map((n) => Math.round(n * 10000) / 10000),
      yaw: away ? 180 : p.yaw, lean: away ? 0 : p.lean, pitch: away ? 0 : p.pitch, gait, still: true, packed
    }));
  }

  /**
   * Into position: everyone chosen goes to a free place in the position (a zone of kind `area`, or any zone) at `at`, the
   * nearest of them first, so a fight is set up with one press per side. Outside any zone it is a plain line there.
   */
  #positionMoves(cards, at, { party, gait }) {
    const f = this.rig.fractionOf(at.X, at.Z);
    const zone = zonesAt(this.zones.filter((z) => z.kind === "area"), f[0], f[1])[0] ?? zonesAt(this.zones, f[0], f[1])[0] ?? null;
    const chosen = cards.filter((c) => party || !c.pc);
    if (!zone) return this.formationMoves("line", { ids: chosen.map((c) => c.id), focus: f, party: true, gait });
    const w = Math.max(...chosen.map((c) => c.w), 120);
    const ids = new Set(chosen.map((c) => c.id));
    // everyone else standing in the position keeps their place: theirs are taken
    const others = [...this.cards.values()].filter((c) => !ids.has(c.id) && c.holder === null).map((c) => ({ X: c.walk ? c.walk.to.X : c.puppet.restX, Z: c.walk ? c.walk.to.Z : c.restZ }));
    const free = zoneSlots(zone, this.rig, { w: w * 1.05, most: 40 }).filter((s) => !others.some((o) => Math.abs(o.X - s.X) < w * 0.6 && Math.abs(o.Z - s.Z) < 90));
    const order = [...chosen].sort((a, b) => Math.hypot(a.X - at.X, a.Z - at.Z) - Math.hypot(b.X - at.X, b.Z - at.Z));
    const moves = [];
    for (const c of order) {
      if (!free.length) break;
      free.sort((p, q) => Math.hypot(p.X - c.X, (p.Z - c.Z) * 0.8) - Math.hypot(q.X - c.X, (q.Z - c.Z) * 0.8));
      const s = free.shift();
      moves.push({ id: c.id, at: this.rig.fractionOf(s.X, s.Z).map((n) => Math.round(n * 10000) / 10000), yaw: 0, lean: 0, pitch: 0, gait, still: true, packed: false });
    }
    return moves;
  }

  /** Where every card nobody holds stands now, as the formations want them: { id, X, Z, w, pc }. */
  standing() {
    return [...this.cards.values()].filter((c) => c.holder === null).map((c) => ({
      id: c.id, X: c.walk ? c.walk.to.X : c.puppet.restX, Z: c.walk ? c.walk.to.Z : c.restZ, w: c.w, pc: c.person.pc === true
    }));
  }

  /** Where every card stands now. */
  exportPlaces() {
    return [...this.cards.keys()].map((id) => this.placeOf(id));
  }
}

/**
 * How far a card that rises out of the floor has come up (0 flat, 1 standing), with an overshoot so it pops up rather
 * than unrolls. Before it starts it is flat; it is never quite zero, so the card is never degenerate.
 */
export function riseAt(rise, now) {
  const u = Math.max(0, Math.min(1, (now - rise.t0) / rise.dur));
  if (u <= 0) return 0.02;
  const c1 = 1.9;
  const c3 = c1 + 1;
  return Math.max(0.02, 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2);
}

export function createStage(scene, people, opts) {
  return new Stage(scene, people, opts);
}
