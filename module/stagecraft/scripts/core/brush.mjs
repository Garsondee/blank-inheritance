/**
 * The brush: how a hand's movement becomes paint (chalk.md §5). Pure.
 *
 * Chalk is painted the way painting programs paint, not drawn as lines (Ingram, 2026-10-03: "Ideally we don't use vector
 * lines ... a smooth art experience ... more precise ... less clunky ... raster preferred"). The pointer's samples are
 * steadied (the brush is pulled along on a short string, so a shaky hand still draws a smooth line), joined by a smooth
 * curve, and paint is put down as dabs, small stamps of the tool's tip, every so far along that curve, each sized and
 * weighted by how hard the hand presses. This file says where each dab goes, how big, how strong and at what angle; the
 * renderer (render/paint/) turns dabs into pixels. Positions are in pixels of the wall (core/chalk.mjs `wallGrid`).
 */

/**
 * The tools. `kind` says what a tool does with its dabs: `paint` puts colour down, `spray` puts down a cloud of fine
 * specks, `erase` takes paint away, `smudge` drags the paint that is there, `fill` floods a shape with one click.
 * Sizes are diameters in wall pixels (the wall is about as many pixels as the screen of a 1440p monitor). `spacing` is the
 * gap between dabs as a share of the tip's size; `flow` how much paint one dab lays down; `opacity` the most a whole
 * stroke can lay down (a stroke never darkens where it crosses itself); `grain` how much the wall's grain shows through;
 * `pressure` how much pressing harder widens (`size`) and strengthens (`flow`) a dab; `taper` grows a line in from a point
 * at its start, over this many of its own widths.
 */
export const TOOLS = Object.freeze({
  chalk: Object.freeze({
    kind: "paint", tip: "chalk", size: Object.freeze({ min: 2, max: 48, initial: 7 }), spacing: 0.1, flow: 0.8, opacity: 1,
    grain: 0.7, scatter: 0.05, jitter: Object.freeze({ size: 0.12, angle: 1 }), pressure: Object.freeze({ size: 0.5, flow: 0.4 }), taper: 0
  }),
  magic: Object.freeze({
    kind: "paint", tip: "chalk", magic: true, size: Object.freeze({ min: 2, max: 64, initial: 10 }), spacing: 0.09, flow: 0.85, opacity: 1,
    grain: 0.45, scatter: 0.04, jitter: Object.freeze({ size: 0.1, angle: 1 }), pressure: Object.freeze({ size: 0.5, flow: 0.4 }), taper: 0
  }),
  pencil: Object.freeze({
    kind: "paint", tip: "pencil", size: Object.freeze({ min: 1, max: 14, initial: 2.5 }), spacing: 0.12, flow: 0.9, opacity: 1,
    grain: 0.2, scatter: 0, jitter: Object.freeze({ size: 0.04, angle: 0 }), pressure: Object.freeze({ size: 0.45, flow: 0.55 }), taper: 1.5
  }),
  brush: Object.freeze({
    kind: "paint", tip: "soft", size: Object.freeze({ min: 3, max: 140, initial: 24 }), spacing: 0.06, flow: 0.45, opacity: 0.88,
    grain: 0, scatter: 0, jitter: Object.freeze({ size: 0, angle: 0 }), pressure: Object.freeze({ size: 0.7, flow: 0.25 }), taper: 1
  }),
  spray: Object.freeze({
    kind: "spray", tip: "speck", size: Object.freeze({ min: 10, max: 180, initial: 48 }), spacing: 0.05, flow: 0.55, opacity: 1,
    grain: 0, scatter: 0, particles: 34, jitter: Object.freeze({ size: 0, angle: 0 }), pressure: Object.freeze({ size: 0.25, flow: 0.6 }), taper: 0
  }),
  smudge: Object.freeze({
    kind: "smudge", tip: "soft", size: Object.freeze({ min: 6, max: 140, initial: 32 }), spacing: 0.08, flow: 0.6, opacity: 1,
    grain: 0, scatter: 0, jitter: Object.freeze({ size: 0, angle: 0 }), pressure: Object.freeze({ size: 0.35, flow: 0.5 }), taper: 0
  }),
  eraser: Object.freeze({
    kind: "erase", tip: "round", size: Object.freeze({ min: 3, max: 180, initial: 28 }), spacing: 0.07, flow: 1, opacity: 1,
    grain: 0, scatter: 0, jitter: Object.freeze({ size: 0, angle: 0 }), pressure: Object.freeze({ size: 0.35, flow: 0 }), taper: 0
  }),
  fill: Object.freeze({
    kind: "fill", tip: null, size: Object.freeze({ min: 0, max: 0, initial: 0 }), spacing: 1, flow: 1, opacity: 0.95,
    grain: 0.3, scatter: 0, jitter: Object.freeze({ size: 0, angle: 0 }), pressure: Object.freeze({ size: 0, flow: 0 }), taper: 0
  })
});

export const TOOL_NAMES = Object.freeze(Object.keys(TOOLS));

/**
 * The shape of each tool's tip: how opaque it is at a distance `r` from its middle (0 the middle, 1 the edge), given a
 * speck of noise `n` (0..1) at that place. Pure, so the look can be held to what was asked for. Chalk keeps her call from
 * 2026-10-01 (ledger J1): "solid core, slightly fuzzy outside": a solid middle, and an edge the wall shows through in
 * small bites, never the middle.
 */
export const TIP_CORE = Object.freeze({ chalk: 0.62, pencil: 0.82, round: 0.78 });
export function tipAlpha(tip, r, n = 0.5) {
  if (r >= 1) return 0;
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  if (tip === "chalk") {
    const core = TIP_CORE.chalk;
    if (r <= core) return 0.96;
    const edge = (r - core) / (1 - core);                    // 0 at the core's edge, 1 at the tip's
    const falloff = 0.96 * (1 - smooth(0, 1, edge));
    return n < edge * 0.85 ? falloff * 0.2 : falloff;         // bites, more of them further out
  }
  if (tip === "pencil") {
    const core = TIP_CORE.pencil;
    return (r <= core ? 0.95 : 0.95 * (1 - smooth(core, 1, r))) * (0.88 + 0.12 * n);
  }
  if (tip === "round") return r <= TIP_CORE.round ? 1 : 1 - smooth(TIP_CORE.round, 1, r);
  if (tip === "speck") return Math.exp(-6 * r * r);
  return Math.exp(-3.2 * r * r) * (1 - smooth(0.85, 1, r));  // soft: a brush, the smudge
}

/** How far the steadying string reaches, in wall pixels, for each setting of "steady hand". */
export const STEADY = Object.freeze([0, 5, 12, 26]);

/** A small, fast, seeded random number generator (mulberry32): the same seed always gives the same numbers. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from a string (a stroke's id), for seeding. */
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Steady hand: the brush is pulled along by the pointer on a string `radius` long, so it moves only when the pointer has
 * gone further than that, and only by the difference. Small wobbles never reach the paint, and corners come out round.
 * `push` returns the brush positions the sample produced (none, while the string is slack); `finish` brings the brush to
 * where the pointer ended, so the line still ends where the hand stopped.
 */
export class Steady {
  constructor(radius = 0) {
    this.r = Math.max(0, radius);
    this.at = null;
    this.pointer = null;
  }

  push({ x, y, p = 0.5 }) {
    this.pointer = { x, y, p };
    if (!this.at) { this.at = { x, y, p }; return [{ ...this.at }]; }
    const dx = x - this.at.x;
    const dy = y - this.at.y;
    const d = Math.hypot(dx, dy);
    if (d <= this.r) { this.at.p += (p - this.at.p) * 0.35; return []; }
    const k = this.r ? (d - this.r) / d : 1;
    this.at = { x: this.at.x + dx * k, y: this.at.y + dy * k, p };
    return [{ ...this.at }];
  }

  finish() {
    if (!this.pointer || !this.at) return [];
    const dx = this.pointer.x - this.at.x;
    const dy = this.pointer.y - this.at.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) return [];
    const n = Math.max(1, Math.ceil(d / Math.max(2, this.r / 2)));
    const out = [];
    for (let i = 1; i <= n; i++) out.push({ x: this.at.x + (dx * i) / n, y: this.at.y + (dy * i) / n, p: this.pointer.p });
    this.at = { ...this.pointer };
    return out;
  }
}

/**
 * A mouse has no pressure, so it is made from speed: a slow hand presses, a quick one skims, and the line thickens and
 * thins as a real stick of chalk does. A pen's own pressure is used as it is, never quite to nothing. `t` in milliseconds.
 */
export class Feel {
  constructor() { this.last = null; this.p = 0.75; }

  pressure({ x, y, t, pressure = 0.5, pointerType = "mouse" }) {
    if (pointerType === "pen" && pressure > 0) {
      this.last = { x, y, t };
      return Math.max(0.08, Math.min(1, pressure));
    }
    if (!this.last) { this.last = { x, y, t }; return this.p; }
    const dt = Math.max(1, t - this.last.t);
    const speed = Math.hypot(x - this.last.x, y - this.last.y) / dt;      // wall pixels per millisecond
    this.last = { x, y, t };
    const want = Math.max(0.45, Math.min(1, 1.05 - speed * 0.22));
    this.p += (want - this.p) * 0.25;
    return this.p;
  }
}

/** A point on the centripetal Catmull-Rom curve through p0..p3, between p1 (u = 0) and p2 (u = 1). */
function catmull(p0, p1, p2, p3, u) {
  const t01 = Math.max(1e-4, Math.hypot(p1.x - p0.x, p1.y - p0.y) ** 0.5);
  const t12 = Math.max(1e-4, Math.hypot(p2.x - p1.x, p2.y - p1.y) ** 0.5);
  const t23 = Math.max(1e-4, Math.hypot(p3.x - p2.x, p3.y - p2.y) ** 0.5);
  const m1 = (k) => (p2[k] - p1[k] + t12 * ((p1[k] - p0[k]) / t01 - (p2[k] - p0[k]) / (t01 + t12)));
  const m2 = (k) => (p2[k] - p1[k] + t12 * ((p3[k] - p2[k]) / t23 - (p3[k] - p1[k]) / (t12 + t23)));
  const h = (k) => {
    const a = 2 * p1[k] - 2 * p2[k] + m1(k) + m2(k);
    const b = -3 * p1[k] + 3 * p2[k] - 2 * m1(k) - m2(k);
    return ((a * u + b) * u + m1(k)) * u + p1[k];
  };
  return { x: h("x"), y: h("y"), p: p1.p + (p2.p - p1.p) * u };
}

/**
 * One stroke of a tool, fed a sample at a time. Each `add` returns the dabs it lays down: { x, y, size, flow, angle, seed,
 * dist } (dist is how far along the stroke the dab lies, for colours that change along a stroke). The curve runs one
 * sample behind the pointer (a smooth curve needs to know where the hand goes next), and `finish` lays down the rest.
 * The same samples and seed always give the same dabs, on any screen.
 */
export class Stroke {
  constructor({ tool = "chalk", size = null, flow = 1, steady = 0, seed = 1 } = {}) {
    this.def = TOOLS[tool] ?? TOOLS.chalk;
    this.tool = tool;
    this.size = Math.max(this.def.size.min, Math.min(this.def.size.max, size ?? this.def.size.initial));
    this.flowScale = Math.max(0, Math.min(1, flow));
    this.steady = new Steady(steady);
    this.seed = seed >>> 0;
    this.points = [];              // the steadied points the curve passes through, the last few kept
    this.prev = null;              // the last point of the curve laid out
    this.carry = 0;                // distance since the last dab
    this.dist = 0;                 // distance along the stroke
    this.count = 0;                // dabs so far
    this.dabs = 0;
  }

  add(sample) {
    const out = [];
    for (const p of this.steady.push(sample)) this.#through(p, out);
    return out;
  }

  finish() {
    const out = [];
    for (const p of this.steady.finish()) this.#through(p, out);
    // the curve's last stretch, to the last point, with nothing after it
    const pts = this.points;
    if (pts.length >= 2) {
      const n = pts.length;
      this.#segment(pts[n - 3] ?? pts[n - 2], pts[n - 2], pts[n - 1], pts[n - 1], out);
    } else if (pts.length === 1 && this.count === 0) {
      this.#dab(pts[0], 0, out);                       // a tap leaves a dot
    }
    return out;
  }

  #through(p, out) {
    const last = this.points[this.points.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.35) { last.p = p.p; return; }
    this.points.push(p);
    if (this.points.length > 4) this.points.shift();
    const pts = this.points;
    const n = pts.length;
    if (n === 1) { this.prev = { ...p }; this.#dab(p, 0, out); return; }
    if (n >= 3) this.#segment(pts[n - 4] ?? pts[n - 3], pts[n - 3], pts[n - 2], pts[n - 1], out);
  }

  /** Lay dabs along the curve from p1 to p2, finely, by distance. */
  #segment(p0, p1, p2, p3, out) {
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(len / 0.75));
    let last = this.prev ?? p1;
    for (let i = 1; i <= steps; i++) {
      const q = catmull(p0, p1, p2, p3, i / steps);
      const d = Math.hypot(q.x - last.x, q.y - last.y);
      this.carry += d;
      this.dist += d;
      const gap = this.#gap(q.p);
      while (this.carry >= gap) {
        this.carry -= gap;
        const back = this.carry;                         // how far past the dab's place the curve has gone
        const k = d > 0 ? Math.max(0, Math.min(1, 1 - back / d)) : 1;
        const at = { x: last.x + (q.x - last.x) * k, y: last.y + (q.y - last.y) * k, p: q.p };
        this.#dab(at, Math.atan2(q.y - last.y, q.x - last.x), out);
      }
      last = q;
    }
    this.prev = last;
  }

  #pressured(p) {
    const ps = this.def.pressure;
    return { size: 1 - ps.size + ps.size * p, flow: 1 - ps.flow + ps.flow * p };
  }

  #gap(p) {
    return Math.max(0.4, this.def.spacing * this.size * this.#pressured(p).size);
  }

  #dab(at, heading, out) {
    const r = rng(this.seed + this.count * 7919);
    this.count++;
    const def = this.def;
    const pressed = this.#pressured(at.p);
    // a line grows in from a point at its start, over `taper` of its own widths
    const taper = def.taper > 0 ? Math.min(1, 0.35 + (0.65 * this.dist) / (def.taper * this.size)) : 1;
    const size = Math.max(0.6, this.size * pressed.size * taper * (1 + def.jitter.size * (r() * 2 - 1)));
    const scatter = def.scatter * this.size;
    const angle = def.jitter.angle ? r() * Math.PI * 2 : heading;
    out.push({
      x: at.x + (r() * 2 - 1) * scatter,
      y: at.y + (r() * 2 - 1) * scatter,
      size,
      flow: Math.max(0, Math.min(1, def.flow * this.flowScale * pressed.flow)),
      angle,
      seed: (this.seed ^ Math.imul(this.count, 2654435761)) >>> 0,
      dist: this.dist
    });
  }
}

/** The dabs of a straight line from a to b (Shift-click from the end of the last line), with the tool's own spacing. */
export function lineDabs(a, b, opts = {}) {
  const s = new Stroke({ ...opts, steady: 0 });
  const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
  const out = [];
  for (let i = 0; i <= n; i++) out.push(...s.add({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n, p: a.p ?? 0.75 }));
  out.push(...s.finish());
  return out;
}

/** The bounds of a list of dabs, grown by their size, in wall pixels: what a stroke may have touched. */
export function dabBounds(dabs) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const d of dabs) {
    const r = d.size / 2 + 2;
    x0 = Math.min(x0, d.x - r); y0 = Math.min(y0, d.y - r);
    x1 = Math.max(x1, d.x + r); y1 = Math.max(y1, d.y + r);
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}

/* ---------------------------------------------------------------- colour */

/** "#rrggbb" to { h (0..360), s, v (0..1) }. */
export function hexToHsv(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: max ? d / max : 0, v: max };
}

/** { h, s, v } to "#rrggbb". */
export function hsvToHex({ h, s, v }) {
  const f = (k) => {
    const kk = (k + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(kk, 4 - kk, 1));
  };
  const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}

/** Magic chalk's rainbow: the colour of a dab `dist` wall pixels along a stroke that started in `hex`. */
export function rainbowAt(hex, dist, { every = 900 } = {}) {
  const hsv = hexToHsv(hex);
  return hsvToHex({ h: (hsv.h + (dist / every) * 360) % 360, s: Math.max(0.55, hsv.s), v: Math.max(0.85, hsv.v) });
}

/** A colour as "#rrggbb", or null when it is not one. */
export function cleanHex(value) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(value ?? "").trim());
  return m ? `#${m[1].toLowerCase()}` : null;
}
