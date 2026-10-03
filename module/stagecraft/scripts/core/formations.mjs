/**
 * Formations on the floor (stage.md §5.2–5.4, diorama.md §11.4). Pure.
 *
 * A formation answers "where does everyone stand?" in one press. It is given the cards it arranges (where each stands now,
 * how wide it is, whether it is one of the party's), a focus (the place on the floor the arrangement is about: a counter,
 * the middle of the room, the person being ganged up on) and sometimes who matters most (a target, two speakers), and it
 * returns where each card goes and how it stands there. The stage then walks each card to its place (walks.mjs), so a
 * change of formation is something the table watches happen, not a cut.
 *
 * Everything is in floor units (X across, Z towards the viewer), so it is the same on every screen. Poses are cheated
 * out to the audience, as the theatre does (diorama.mjs `cheatOut`): a card turns towards what it faces, but never so far
 * that its face is lost.
 *
 * The party's own cards are the players'. A formation moves them only when it is asked to (`party: true`), or when one
 * of them is its target or a speaker.
 */

import { cheatOut, yawTo, huddlePlaces, tablePlaces, standoffPlaces } from "./diorama.mjs";

export const FORMATIONS = Object.freeze(["line", "huddle", "talk", "gangup", "panel", "standoff", "circle", "queue", "scatter", "audience"]);

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;

/** The widest card in a list, in floor units, so spacing fits whoever is in it. */
const widest = (cards, fallback = 180) => Math.max(fallback * 0.5, ...cards.map((c) => c.w ?? fallback));

/** Facing a point, cheated out. */
const facing = (x, z, tx, tz, share = 0.7, max = 52) => cheatOut(yawTo(x, z, tx, tz), { share, max });

/**
 * Arrange cards. `cards` are [{ id, X, Z, w, pc }]; `focus` is { X, Z }; `limits` the floor's ({ x: [lo, hi], z: [lo, hi] }).
 * Returns [{ id, X, Z, yaw, lean, pitch }] for the cards it moves, in no particular order.
 */
export function arrange(kind, { cards = [], focus = { X: 0, Z: -400 }, target = null, speakers = [], party = false, limits = null, seed = 1, dir = "back", radius = null } = {}) {
  const chosen = cards.filter((c) => party || !c.pc || c.id === target || speakers.includes(c.id));
  if (!chosen.length) return [];
  const w = widest(chosen);
  let out;
  switch (kind) {
    case "huddle": out = huddle(chosen, focus, w, radius); break;
    case "talk": out = talk(chosen, focus, w, speakers); break;
    case "gangup": out = gangUp(chosen, focus, w, target); break;
    case "panel": out = panel(chosen, focus, w); break;
    case "standoff": out = standoff(chosen, focus, w); break;
    case "circle": out = circle(chosen, focus, w, radius); break;
    case "queue": out = queue(chosen, focus, w, seed, dir); break;
    case "scatter": out = scatter(chosen, focus, w, limits, seed); break;
    case "audience": out = audience(chosen, focus, w, limits); break;
    case "line":
    default: out = line(chosen, focus, w);
  }
  return out.map((p) => ({
    id: p.id,
    X: r1(limits ? clamp(p.X, limits.x[0], limits.x[1]) : p.X),
    Z: r1(limits ? clamp(p.Z, limits.z[0], limits.z[1]) : p.Z),
    yaw: r1(p.yaw ?? 0), lean: r1(p.lean ?? 0), pitch: r1(p.pitch ?? 0)
  }));
}

/** Order cards left to right by where they stand now, so nobody has to cross anybody to get to their place. */
const byX = (cards) => [...cards].sort((a, b) => a.X - b.X || (a.id < b.id ? -1 : 1));

/**
 * Everyone in a row across the focus, facing the table; the party a row in front if the scene's people are in it too.
 * A line of only the party stands at the focus itself.
 */
function line(cards, focus, w) {
  const out = [];
  const rows = [cards.filter((c) => !c.pc), cards.filter((c) => c.pc)];
  const step = rows[0].length ? 220 : 0;
  rows.forEach((row, r) => {
    const sorted = byX(row);
    const pitch = w * 1.12;
    sorted.forEach((c, i) => out.push({ id: c.id, X: focus.X + (i - (sorted.length - 1) / 2) * pitch, Z: focus.Z + r * step, yaw: 0 }));
  });
  return out;
}

/**
 * An audience: everyone in a shallow arc in front of the focus (a stage, a platform, a speaker), turned to face it, cheated
 * out so the table still sees their faces. It stands well forward of what it watches, most of the way to the front of the
 * floor, so it never hides it: on a deep stage that is a long way forward. Two rows if there are many.
 */
function audience(cards, focus, w, limits) {
  const sorted = byX(cards);
  const front = limits ? limits.z[1] : focus.Z + 600;
  // near the front of the floor (a fifth of the way back from it), and never closer to the focus than a few steps
  const near = Math.max(focus.Z + 280, front - Math.max(150, (front - focus.Z) * 0.2));
  // two groups with the middle left open, so whatever they are watching is seen between them, as from the stalls
  const half = Math.ceil(sorted.length / 2);
  const groups = [sorted.slice(0, half).reverse(), sorted.slice(half)];
  const out = [];
  groups.forEach((group, side) => {
    const s = side === 0 ? -1 : 1;
    group.forEach((c, k) => {
      const X = focus.X + s * (w * 0.95 + k * w * 1.15);
      const Z = near - k * 45;
      out.push({ id: c.id, X, Z, yaw: facing(X, Z, focus.X, focus.Z, 0.6, 40), pitch: -2 });
    });
  });
  return out;
}

/** Heads together round the focus: close, turned in, leaning in. The conspiratorial look is the lean, not the distance. */
function huddle(cards, focus, w, radius = null) {
  const sorted = byX(cards);
  const places = huddlePlaces({ x: focus.X, z: focus.Z }, sorted.length, { r: radius ?? w * (0.45 + 0.08 * sorted.length), lean: 8, pitch: 6 });
  return sorted.map((c, i) => ({ id: c.id, X: places[i].x, Z: places[i].z, yaw: places[i].yaw, lean: places[i].lean, pitch: places[i].pitch }));
}

/**
 * Two people talking: either side of the focus, turned to each other; whoever else is there listens a step back, to
 * either side, turned towards the pair.
 */
function talk(cards, focus, w, speakers) {
  const ids = speakers.filter((id) => cards.some((c) => c.id === id));
  const rest = byX(cards.filter((c) => !ids.includes(c.id)));
  while (ids.length < 2 && rest.length) ids.push(rest.shift().id);
  const [a, b] = ids;
  const half = w * 0.78;
  const out = [];
  const A = { X: focus.X - half, Z: focus.Z };
  const B = { X: focus.X + half, Z: focus.Z };
  if (a) out.push({ id: a, X: A.X, Z: A.Z, yaw: facing(A.X, A.Z, B.X, B.Z, 0.85, 58), lean: 2 });
  if (b) out.push({ id: b, X: B.X, Z: B.Z, yaw: facing(B.X, B.Z, A.X, A.Z, 0.85, 58), lean: -2 });
  rest.forEach((c, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const rank = Math.floor(i / 2) + 1;
    const X = focus.X + side * (half + w * (0.55 + rank * 0.95));
    const Z = focus.Z - 120 - rank * 60;
    out.push({ id: c.id, X, Z, yaw: facing(X, Z, focus.X, focus.Z, 0.6, 40) });
  });
  return out;
}

/**
 * Ganging up on one person: the target stands at the focus, front and centre; everyone else closes round them in an arc
 * behind and to the sides, leaning in, the flanks lower and closer, allowed to overlap (crowding is the point).
 */
function gangUp(cards, focus, w, target) {
  const victim = cards.find((c) => c.id === target) ?? null;
  const crowd = byX(cards.filter((c) => c !== victim));
  const n = crowd.length;
  const out = [];
  if (victim) out.push({ id: victim.id, X: focus.X, Z: focus.Z + 60, yaw: 0, pitch: 3 });
  const span = Math.min(200, 90 + n * 22);                // degrees of arc round the target
  const rx = w * (0.85 + n * 0.17);
  const rz = 140 + n * 14;
  crowd.forEach((c, i) => {
    const u = n > 1 ? i / (n - 1) : 0.5;
    const deg = -span / 2 + u * span;                     // 0 is straight behind the target
    const a = deg * DEG;
    const X = focus.X + Math.sin(a) * rx;
    const Z = focus.Z - Math.cos(a) * rz;
    const side = Math.sign(Math.sin(a)) || 0;
    out.push({ id: c.id, X, Z, yaw: facing(X, Z, focus.X, focus.Z + 60, 0.8, 55), lean: -side * 7, pitch: 5 });
  });
  return out;
}

/** A row of people to answer to: a hearing, a board, the night crew at the counter. A shallow arc facing the table. */
function panel(cards, focus, w) {
  const sorted = byX(cards.filter((c) => !c.pc));
  const n = sorted.length;
  const out = sorted.map((c, i) => {
    const u = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
    const X = focus.X + u * ((n - 1) / 2) * w * 1.1;
    const Z = focus.Z - 160 + 90 * u * u;
    return { id: c.id, X, Z, yaw: r1(-u * 14), pitch: -2 };
  });
  // anyone of the party in it stands before the panel
  byX(cards.filter((c) => c.pc)).forEach((c, i, all) => {
    const X = focus.X + (i - (all.length - 1) / 2) * w * 1.1;
    out.push({ id: c.id, X, Z: focus.Z + 260, yaw: 0 });
  });
  return out;
}

/** Two sides facing off across a gap: the people of the scene on one side, the party (or the rest) on the other. */
function standoff(cards, focus, w) {
  let left = byX(cards.filter((c) => !c.pc));
  let right = byX(cards.filter((c) => c.pc));
  if (!right.length) { const half = Math.ceil(left.length / 2); right = left.slice(half); left = left.slice(0, half); }
  if (!left.length) { const half = Math.ceil(right.length / 2); left = right.slice(0, half); right = right.slice(half); }
  const places = standoffPlaces({ x: focus.X, z: focus.Z }, left, right, { gap: w * 2.2, spread: w * 1.35, depthStep: 70 });
  return [...left, ...right].map((c, i) => ({ id: c.id, X: places[i].x, Z: places[i].z, yaw: places[i].yaw, lean: places[i].lean, pitch: places[i].pitch }));
}

/**
 * Round the focus (a table, a fire, a body on the floor), the side towards the table left open. `radius` (floor units)
 * says how big the thing in the middle is; without it the ring is just big enough for everyone in it.
 */
function circle(cards, focus, w, radius = null) {
  const sorted = byX(cards);
  const r = radius ?? Math.max(w * 0.9, (w * 1.05 * sorted.length) / (2 * Math.PI * 0.7));
  const places = tablePlaces({ x: focus.X, z: focus.Z }, r, sorted.length, { open: sorted.length > 5 ? 70 : 110 });
  return sorted.map((c, i) => ({ id: c.id, X: places[i].x, Z: places[i].z, yaw: places[i].yaw }));
}

/**
 * A queue: one behind another from the focus (a counter, a door), each a little off the line, everyone facing the head of
 * it. `dir` is the way it runs: "back" into the room (the default), or "left", "right" or "front" when the room has no
 * floor behind the counter to queue on.
 */
function queue(cards, focus, w, seed, dir = "back") {
  const sideways = dir === "left" || dir === "right";
  const sign = dir === "left" ? -1 : 1;
  // whoever is nearest the head now is first in the queue
  const nearHead = (c) => (sideways ? -Math.abs(c.X - focus.X) : dir === "front" ? -c.Z : c.Z);
  const sorted = [...cards].sort((a, b) => nearHead(b) - nearHead(a) || (a.id < b.id ? -1 : 1));
  return sorted.map((c, i) => {
    const wob = Math.sin((i + 1) * 2.399 + seed);
    let X;
    let Z;
    if (sideways) { X = focus.X + sign * i * w * 1.08; Z = focus.Z + wob * 26 - i * 8; }
    else { X = focus.X + wob * w * 0.18 + i * w * 0.12; Z = focus.Z + (dir === "front" ? 1 : -1) * i * 175; }
    // the head faces upstage, to the counter or the door the queue is for; everyone behind faces the head
    const yaw = i === 0 ? facing(X, Z, focus.X, focus.Z - 300, 0.55, 38) : facing(X, Z, focus.X, focus.Z, 0.55, 38);
    return { id: c.id, X, Z, yaw, pitch: i === 0 ? 0 : 2 };
  });
}

/** Everyone to a place of their own across the floor: a fight breaking out, a room clearing. */
function scatter(cards, focus, w, limits, seed) {
  const sorted = byX(cards);
  const n = sorted.length;
  const xs = limits ? [limits.x[0] * 0.7, limits.x[1] * 0.7] : [focus.X - w * n * 0.8, focus.X + w * n * 0.8];
  return sorted.map((c, i) => {
    const u = n > 1 ? i / (n - 1) : 0.5;
    const X = xs[0] + (xs[1] - xs[0]) * u;
    const Z = focus.Z + Math.sin((i + 1) * 1.7 + seed) * 260;
    return { id: c.id, X, Z, yaw: facing(X, Z, focus.X, focus.Z, 0.5, 40) };
  });
}
