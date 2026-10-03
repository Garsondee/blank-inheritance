/**
 * The debut flourish: a sketch of scripts/core/flourish.mjs.
 *
 * Pure. No DOM, no Foundry. Given a seed and a family, it composes a RECIPE:
 * a small plain object naming which module fills each slot of the flourish
 * (how the frame arrives, how the portrait develops, how the plate lands, how
 * the caption card reads) plus the jittered numbers each module plays with.
 *
 * Three ideas do all the work:
 *
 *   1. SLOTS × MODULES. Six entries × six reveals × four stamps × four cards
 *      is 576 shapes before a single number is jittered. Each is simple.
 *   2. SEEDED JITTER. Every duration, angle, distance and stagger is drawn
 *      from a seeded generator, so two debuts of the same shape still differ,
 *      and every screen at the table plays the SAME performance (the seed
 *      travels as data, the way stingSeq does today).
 *   3. FAMILIES. Which modules are allowed is decided by what the arrival
 *      means (official business, a hostile arrival, an ordinary face), so
 *      variety lives inside a meaning the table can learn: the same tune,
 *      played differently each night.
 */

/* ------------------------------------------------------------------ */
/*  Seeded randomness                                                   */
/* ------------------------------------------------------------------ */

/** A 32-bit string hash (cyrb-style). Stable across browsers and Node. */
export function hashString(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** mulberry32: tiny, fast, good enough for motion. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Helpers bound to one generator, so a recipe draws from one stream. */
export function dice(seed) {
  const rnd = mulberry32(seed);
  const range = (a, b) => a + (b - a) * rnd();
  const int = (a, b) => Math.floor(range(a, b + 1));
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const sign = () => (rnd() < 0.5 ? -1 : 1);
  const weighted = (table) => {
    const entries = Object.entries(table).filter(([, w]) => w > 0);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = rnd() * total;
    for (const [key, w] of entries) {
      roll -= w;
      if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
  };
  return { rnd, range, int, pick, sign, weighted };
}

/* ------------------------------------------------------------------ */
/*  Families: what an arrival means decides which modules may play      */
/* ------------------------------------------------------------------ */

export const FAMILIES = Object.freeze({
  /** Most people, most scenes. Everything is allowed; nothing is loud. */
  ordinary: {
    entries: { rise: 3, drop: 2, slide: 3, unfold: 2, swing: 2 },
    reveals: { wipe: 3, blinds: 2, iris: 2, raster: 2, develop: 2, shutter: 2 },
    stamps: { thump: 2, slap: 3, type: 2, press: 2 },
    cards: { ribbon: 3, spine: 2, tag: 2, stamp: 2 },
    tilt: 1, motes: [5, 12], tempo: [0.92, 1.1]
  },
  /** Official business: square, level, mechanical. No swing, no wobble. */
  official: {
    entries: { drop: 3, unfold: 3, rise: 1 },
    reveals: { iris: 3, shutter: 3, raster: 2 },
    stamps: { press: 3, thump: 2, type: 1 },
    cards: { ribbon: 2, stamp: 3, spine: 2 },
    tilt: 0.25, motes: [0, 3], tempo: [0.95, 1.05]
  },
  /** A hostile or unwelcome arrival: fast, hard, off-balance. */
  hostile: {
    entries: { slam: 4, slide: 1 },
    reveals: { wipe: 3, shutter: 2 },
    stamps: { slap: 3, thump: 2 },
    cards: { stamp: 3, ribbon: 1 },
    tilt: 1.8, motes: [9, 16], tempo: [1.25, 1.4]
  }
});

/** Faction id -> family. A hand-kept table, like core/engage.mjs#FACTION_ENTRANCES. */
export const FACTION_FAMILIES = Object.freeze({ directorate: "official" });

export function familyFor(member = {}) {
  if (member.situation === "hostile") return "hostile";
  return FACTION_FAMILIES[member.faction] ?? "ordinary";
}

/* ------------------------------------------------------------------ */
/*  The recipe                                                          */
/* ------------------------------------------------------------------ */

const ENTRY_BASE = 640; // ms, before tempo
const LAND = (entry) => entry.delay + entry.dur;

/**
 * Compose one debut.
 *
 * @param {object} o
 * @param {number} o.seed          hashString(alias + debutSeq): the same on every screen
 * @param {string} [o.family]      ordinary | official | hostile
 * @param {string} [o.side]        where the frame lands: left | centre | right
 * @param {string[]} [o.avoid]     "entry+reveal" pairs played recently (the shuffle bag)
 * @param {boolean} [o.reduced]    the calm version: a fade and the card, nothing else
 * @param {object|string} [o.force] authored choices, which always win:
 *                                 {entry, reveal, stamp, card} or "reveal:iris,card:tag"
 */
export function composeDebut({ seed, family = "ordinary", side = "centre", avoid = [], reduced = false, force = {} } = {}) {
  const d = dice(seed);
  const F = FAMILIES[family] ?? FAMILIES.ordinary;
  const tempo = 1 / d.range(F.tempo[0], F.tempo[1]);
  const t = (ms) => Math.round(ms * tempo);
  const chosen = parseForce(force);

  if (reduced) return reducedDebut(d, family, side);

  // The shuffle bag: re-draw (up to four times) rather than repeat a pairing
  // the table saw in the last few debuts. Deterministic, because `avoid` is
  // part of the published data, not local memory.
  let entryKind;
  let revealKind;
  for (let tries = 0; tries < 5; tries++) {
    entryKind = d.weighted(F.entries);
    revealKind = d.weighted(F.reveals);
    if (!avoid.includes(`${entryKind}+${revealKind}`)) break;
  }
  // An authored choice wins over the draw (the same precedence as an explicit
  // `entrance` in core/engage.mjs). The numbers are still drawn from the seed.
  if (chosen.entry) entryKind = chosen.entry;
  if (chosen.reveal) revealKind = chosen.reveal;

  // Arrive from somewhere: a frame landing on the left comes in from the left.
  const fromSide = side === "left" ? -1 : side === "right" ? 1 : d.sign();
  const tilt = F.tilt;

  const marks = { delay: 0, dur: t(d.range(220, 320)), inset: d.range(12, 22) };
  const entry = composeEntry(entryKind, d, { fromSide, tilt, t, delay: t(d.range(120, 200)) });
  const land = LAND(entry);

  const reveal = composeReveal(revealKind, d, { t, delay: entry.delay + t(d.range(40, 220)) });
  const stampKind = d.weighted(F.stamps);
  const cardKind = d.weighted(F.cards);
  const stamp = {
    kind: chosen.stamp ?? stampKind,
    tilt: d.range(-7, 7) * tilt,
    delay: land - t(d.range(0, 140)),
    dur: t(d.range(340, 520))
  };
  const glint = {
    angle: d.sign() * d.range(18, 72),
    delay: land + t(d.range(60, 260)),
    dur: t(d.range(560, 900))
  };
  const lamp = { delay: land - t(60), steps: lampFlicker(d) };
  const keys = { delay: stamp.delay + t(d.range(60, 160)), stagger: t(d.range(45, 95)) };
  const card = {
    kind: chosen.card ?? cardKind,
    // Toward the middle of the screen, so a card never runs off an edge.
    side: side === "left" ? "right" : side === "right" ? "left" : d.pick(["left", "right"]),
    delay: land + t(d.range(140, 380)),
    hold: d.range(1750, 2250),
    tilt: d.range(-3.5, 3.5) * Math.min(tilt, 1),
    rise: d.range(-30, 30)
  };
  const moteCount = d.int(F.motes[0], F.motes[1]);
  const motes = Array.from({ length: moteCount }, () => ({
    angle: d.range(-168, -12),
    dist: d.range(28, 120),
    size: d.range(2, 5.5),
    delay: land + t(d.range(-40, 140)),
    dur: t(d.range(600, 1300)),
    warm: d.rnd() < 0.6,
    origin: d.rnd() < 0.5 ? "left" : "right"
  }));
  const pool = { delay: entry.delay + t(40), dur: t(d.range(500, 700)), width: d.range(1.1, 1.5) };

  const total = Math.max(card.delay + card.hold + 500, glint.delay + glint.dur, ...motes.map((m) => m.delay + m.dur));
  return {
    seed, family, side, reduced: false,
    signature: `${entryKind} · ${revealKind} · ${stamp.kind} · ${card.kind}`,
    pair: `${entryKind}+${revealKind}`,
    marks, entry, reveal, stamp, glint, lamp, keys, card, motes, pool,
    land, total: Math.round(total)
  };
}

function parseForce(force) {
  if (!force) return {};
  if (typeof force === "object") return force;
  return Object.fromEntries(String(force).split(",").map((pair) => pair.split(":").map((s) => s.trim())).filter(([k, v]) => k && v));
}

function composeEntry(kind, d, { fromSide, tilt, t, delay }) {
  const overshoot = d.range(0.02, 0.08);
  const base = { kind, delay, overshoot, ease: d.pick(["servo", "back", "spring"]) };
  switch (kind) {
    case "rise":
      return { ...base, dur: t(ENTRY_BASE * d.range(0.9, 1.15)),
        from: { x: d.range(-8, 8), y: d.range(34, 70), rot: d.range(-2, 2) * tilt, scale: d.range(0.9, 0.96) } };
    case "drop":
      return { ...base, dur: t(ENTRY_BASE * d.range(0.8, 1.0)),
        from: { x: d.range(-6, 6), y: -d.range(48, 96), rot: d.range(-3, 3) * tilt, scale: 1.02 } };
    case "slide":
      return { ...base, dur: t(ENTRY_BASE * d.range(0.95, 1.2)),
        from: { x: fromSide * d.range(90, 170), y: d.range(-6, 10), rot: fromSide * d.range(2, 6) * tilt, scale: 0.97 } };
    case "unfold":
      return { ...base, dur: t(ENTRY_BASE * d.range(0.9, 1.1)), from: { x: 0, y: 0, rot: 0, scale: 1, scaleY: 0.02 } };
    case "swing":
      return { ...base, dur: t(ENTRY_BASE * d.range(1.2, 1.5)), origin: "top",
        from: { x: 0, y: -14, rot: fromSide * d.range(12, 22), scale: 1 } };
    case "slam":
      return { ...base, ease: "slam", overshoot: d.range(0.06, 0.1), dur: t(d.range(230, 300)),
        from: { x: fromSide * d.range(0, 30), y: -d.range(110, 160), rot: fromSide * d.range(3, 8), scale: 1.08 }, shake: d.range(5, 9) };
    default:
      return { ...base, dur: t(ENTRY_BASE), from: { x: 0, y: 40, rot: 0, scale: 0.95 } };
  }
}

function composeReveal(kind, d, { t, delay }) {
  const base = { kind, delay };
  switch (kind) {
    case "wipe": {
      // Bias to diagonals: they read as a cut, not a loading bar.
      const quadrant = d.pick([45, 135, 225, 315]);
      return { ...base, dur: t(d.range(420, 620)), angle: quadrant + d.range(-28, 28), softness: d.range(4, 16) };
    }
    case "blinds":
      return { ...base, dur: t(d.range(460, 680)), slats: d.int(5, 9), axis: d.pick(["h", "v"]),
        order: d.pick(["sweep", "reverse", "centre", "scatter"]), stagger: t(d.range(26, 52)) };
    case "iris":
      return { ...base, dur: t(d.range(520, 760)), cx: d.range(40, 60), cy: d.range(24, 42) };
    case "raster":
      return { ...base, dur: t(d.range(560, 820)), steps: d.int(10, 22), from: d.pick(["top", "bottom"]) };
    case "develop":
      return { ...base, dur: t(d.range(700, 1000)), tint: d.pick(["safelight", "sepia"]) };
    case "shutter":
      return { ...base, dur: t(d.range(380, 560)), axis: d.pick(["h", "v"]) };
    default:
      return { ...base, kind: "none", dur: 0 };
  }
}

/** A lamp warming up: never more than three flashes a second (staging doc §12.5). */
export function lampFlicker(d) {
  const flickers = d.int(1, 3);
  const steps = [];
  for (let i = 0; i < flickers; i++) {
    steps.push({ on: true, ms: Math.round(d.range(50, 110)) });
    steps.push({ on: false, ms: Math.round(d.range(250, 340)) });
  }
  steps.push({ on: true, ms: 0 });
  return steps;
}

/** Count lamp flashes in any one-second window: the guard a test would hold. */
export function maxFlashesPerSecond(steps) {
  const ons = [];
  let at = 0;
  for (const step of steps) {
    if (step.on) ons.push(at);
    at += step.ms;
  }
  let worst = 0;
  for (const start of ons) worst = Math.max(worst, ons.filter((x) => x >= start && x < start + 1000).length);
  return worst;
}

function reducedDebut(d, family, side) {
  const card = { kind: "ribbon", side: side === "left" ? "right" : "left", delay: 300, hold: 2200, tilt: 0, rise: 0 };
  return {
    seed: null, family, side, reduced: true, signature: "fade · card", pair: "fade+none",
    marks: null, entry: { kind: "fade", delay: 0, dur: 300, from: { x: 0, y: 0, rot: 0, scale: 1 } },
    reveal: { kind: "none", delay: 0, dur: 0 }, stamp: { kind: "none", delay: 0, dur: 0 },
    glint: null, lamp: null, keys: { delay: 200, stagger: 0 }, card, motes: [], pool: null,
    land: 300, total: card.delay + card.hold + 400
  };
}

/* ------------------------------------------------------------------ */
/*  Several at once                                                     */
/* ------------------------------------------------------------------ */

/**
 * Several debuts landing in one stage update play as ONE ensemble, inside a
 * fixed time budget, rather than as a queue that grows with headcount.
 *
 * Order: left to right across the stage, then the headliner (if one is named)
 * lands last. Gaps shrink as the crowd grows, so four new faces take barely
 * longer than two. Captions: one or two newcomers get a card each; three or
 * more get ONE group card that names them as they land, and only the
 * headliner keeps a card of their own.
 */
export function scheduleEnsemble(members = [], { seed = 1, budget = 2600, single = 1100 } = {}) {
  const d = dice(seed);
  const lead = members.find((m) => m.lead);
  const rest = members.filter((m) => m !== lead).sort((a, b) => a.x - b.x);
  const order = lead ? [...rest, lead] : rest;
  const n = order.length;
  const idealGap = n > 1 ? (budget - single) / (n - 1) : 0;
  const gap = Math.max(140, Math.min(420, idealGap));
  let at = 0;
  const slots = order.map((member, index) => {
    const offset = index === 0 ? 0 : Math.round(at += gap * d.range(0.8, 1.2));
    return { id: member.id, offset, lead: member === lead, card: n <= 2 || member === lead };
  });
  return { order: slots, groupCard: n >= 3, span: slots.length ? slots[slots.length - 1].offset + single : 0 };
}
