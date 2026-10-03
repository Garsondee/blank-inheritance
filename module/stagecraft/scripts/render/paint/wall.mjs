/**
 * The wall's pixels (chalk.md §5): every painter's layer as tiles of pixels, the whole wall as the stage shows it (each
 * layer laid over the one before), and the strokes being painted right now. The core decides where paint goes
 * (core/brush.mjs) and how the wall is cut up (core/chalk.mjs); this puts it on the page's canvases.
 *
 * A stroke is painted into a buffer of its own while it is being made, and laid into its painter's layer when it ends,
 * so a stroke never darkens where it crosses itself, the wall's grain sits still under it (chalk catches on the wall,
 * not on the stick), and a stroke kept to the chalk zones stops exactly at a zone's edge. Rubbing out is a stroke too: a
 * buffer of what to take away. A smudge and a fill change their painter's layer directly.
 *
 * Kept quick on purpose (Ingram, 2026-10-03: "Chalk is really good but very laggy"; chalk.md §11): a dab only marks the
 * part of a tile it touched, and the wall is laid together once a frame (`flush`, which the host calls before it draws),
 * only where something changed, on canvases kept from frame to frame; a tile is turned into a picture to keep off the
 * main thread (`encodeTile`); and magic chalk's glow is blurred at a quarter of the size.
 */

import { tileRect, tilesFor, layerOrder } from "../../core/chalk.mjs";
import { TOOLS, tipAlpha, rng, rainbowAt, dabBounds } from "../../core/brush.mjs";

const TIP_PX = 96;                 // a tip is drawn once at this size and scaled for each dab
const GRAIN_PX = 256;              // the wall's grain repeats every this many pixels
const VARIANTS = 4;                // chalk tips come in a few shapes, so no two dabs bite alike
const FILL_ALPHA = 48;             // paint at least this solid is a line a fill stops at
const FILL_MOST = 0.3;             // a fill that would cover more of the wall than this is not filling a shape
const RAINBOW_STEP = 15;           // magic chalk's rainbow moves on a step of hue every this many pixels (60 to a turn)
const TIP_CACHE = 320;             // coloured tips kept at once
const GLOW_SCALE = 4;              // magic chalk's glow is blurred at a quarter of the size: it is soft anyway

const make = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
// the wall's canvases are drawn where the browser chooses (the graphics card, mostly): read back only to be kept, to pick
// a colour or to fill
const ctxOf = (c) => c.getContext("2d", globalThis.__chalkSoftware ? { willReadFrequently: true } : undefined);

/** The rectangle `r` (any numbers; null for all of it) as whole pixels inside a w x h tile. */
function whole(r, w, h) {
  if (!r) return { x: 0, y: 0, w, h };
  const x0 = Math.max(0, Math.floor(r.x0));
  const y0 = Math.max(0, Math.floor(r.y0));
  const x1 = Math.min(w, Math.ceil(r.x1));
  const y1 = Math.min(h, Math.ceil(r.y1));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
const union = (a, b) => (!a || !b ? null : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

/** Smooth noise over a square of `size` pixels from a grid of `cells` random values (0..1), wrapping round if asked. */
function valueNoise(size, cells, r, wrap = false) {
  const n = cells + 1;
  const grid = new Float32Array(n * n);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  if (wrap) for (let i = 0; i < n; i++) { grid[i * n + cells] = grid[i * n]; grid[cells * n + i] = grid[i]; }
  const out = new Float32Array(size * size);
  const s = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells;
    const y0 = Math.floor(gy);
    const fy = s(gy - y0);
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const x0 = Math.floor(gx);
      const fx = s(gx - x0);
      const a = grid[y0 * n + x0];
      const b = grid[y0 * n + x0 + 1];
      const c = grid[(y0 + 1) * n + x0];
      const d = grid[(y0 + 1) * n + x0 + 1];
      out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

/** The tips of the tools, drawn once each, and in each colour once they are asked for. */
class Tips {
  constructor() { this.shapes = new Map(); this.tinted = new Map(); }

  shape(tip, variant = 0) {
    const key = `${tip}:${variant}`;
    let c = this.shapes.get(key);
    if (c) return c;
    c = make(TIP_PX, TIP_PX);
    const x = ctxOf(c);
    const img = x.createImageData(TIP_PX, TIP_PX);
    const r = rng(9001 + variant * 131 + tip.charCodeAt(0));
    const coarse = valueNoise(TIP_PX, 7, r);
    const fine = valueNoise(TIP_PX, 30, r);
    const half = TIP_PX / 2;
    for (let j = 0; j < TIP_PX; j++) {
      for (let i = 0; i < TIP_PX; i++) {
        const k = j * TIP_PX + i;
        const a = tipAlpha(tip, Math.hypot(i + 0.5 - half, j + 0.5 - half) / half, coarse[k] * 0.7 + fine[k] * 0.3);
        const o = k * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
        img.data[o + 3] = Math.round(a * 255);
      }
    }
    x.putImageData(img, 0, 0);
    this.shapes.set(key, c);
    return c;
  }

  coloured(tip, variant, hex) {
    const key = `${tip}:${variant}:${hex}`;
    let c = this.tinted.get(key);
    if (c) return c;
    if (this.tinted.size > TIP_CACHE) this.tinted.delete(this.tinted.keys().next().value);
    c = make(TIP_PX, TIP_PX);
    const x = ctxOf(c);
    x.drawImage(this.shape(tip, variant), 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = hex;
    x.fillRect(0, 0, TIP_PX, TIP_PX);
    this.tinted.set(key, c);
    return c;
  }
}

/** The wall's grain: a texture that repeats, how much paint a spot of the wall takes. Fixed to the wall, not the stroke. */
class Grain {
  constructor() { this.noise = null; this.by = new Map(); this.patterns = new Map(); }

  canvas(strength) {
    const k = Math.round(Math.max(0, Math.min(1, strength)) * 20) / 20;
    let c = this.by.get(k);
    if (c) return c;
    if (!this.noise) {
      const r = rng(77);
      const big = valueNoise(GRAIN_PX, 16, r, true);
      const small = valueNoise(GRAIN_PX, 64, r, true);
      this.noise = big.map((v, i) => Math.max(0, Math.min(1, v * 0.45 + small[i] * 0.55 + (r() - 0.5) * 0.25)));
    }
    c = make(GRAIN_PX, GRAIN_PX);
    const x = ctxOf(c);
    const img = x.createImageData(GRAIN_PX, GRAIN_PX);
    for (let i = 0; i < this.noise.length; i++) {
      const o = i * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round((1 - k * this.noise[i] ** 1.4) * 255);
    }
    x.putImageData(img, 0, 0);
    this.by.set(k, c);
    return c;
  }

  /** The grain as a pattern placed so that it sits still on the wall under a canvas whose corner is wall pixel (wx, wy). */
  pattern(ctx, strength, wx, wy) {
    const key = `${strength}|${wx}|${wy}`;
    let p = this.patterns.get(key);
    if (p) return p;
    p = ctx.createPattern(this.canvas(strength), "repeat");
    p?.setTransform?.(new DOMMatrix().translate(-wx, -wy));
    if (p) this.patterns.set(key, p);
    return p;
  }
}

export class RasterWall {
  /**
   * `grid` is core/chalk.mjs `wallGrid`. `onChange(keys)` is told which tiles of the whole wall changed; the backend
   * shows `composite.get(key)` for each (a tile with no paint is not there).
   */
  constructor({ grid, onChange = () => {} }) {
    this.grid = grid;
    this.onChange = onChange;
    this.layers = new Map();          // painter (a user's id) -> { by, since, tiles: Map<key, canvas>, sources: Map<key, dataUrl> }
    this.order = [];
    this.composite = new Map();
    this.strokes = new Map();         // stroke id -> a stroke being painted, here or (seen live) by someone else
    this.tips = new Tips();
    this.grain = new Grain();
    this.mask = null;                 // the chalk zones' shapes in wall pixels, when paint is kept to them
    this.maskTiles = new Map();
    this.dirty = new Map();           // tile key -> the part of it to lay together again (tile pixels), or null for all of it
    this.loads = new Map();           // `${by}|${key}` -> the source being loaded, so a later one wins
    this.scratch = null;              // a tile-sized canvas kept for laying a layer under an eraser
    this.pending = false;
  }

  /**
   * Make every tool's tip and the wall's grain ahead of the first stroke, one at a time while the browser is idle (made at
   * the first dab, they were a stall of a few tenths of a second on a slow machine, on every screen that saw it).
   */
  warmUp() {
    const jobs = [];
    for (let v = 0; v < VARIANTS; v++) jobs.push(() => this.tips.shape("chalk", v));
    for (const tip of ["pencil", "round", "soft", "speck"]) jobs.push(() => this.tips.shape(tip, 0));
    for (const def of Object.values(TOOLS)) if (def.grain > 0) jobs.push(() => this.grain.canvas(def.grain));
    const idle = globalThis.requestIdleCallback ?? ((fn) => setTimeout(fn, 30));
    const next = () => {
      const job = jobs.shift();
      if (!job) return;
      try { job(); } catch { /* a tip is made at the first dab instead */ }
      idle(next);
    };
    idle(next);
  }

  /* ---------------------------------------------------------------- what to lay together, and when */

  /** Mark part of a tile (tile pixels; null for all of it) to be laid together again at the next flush. */
  #dirty(key, part = null) {
    const had = this.dirty.get(key);
    this.dirty.set(key, had === undefined ? part : union(had, part));
    this.#schedule();
  }

  #schedule() {
    if (this.pending) return;
    this.pending = true;
    const later = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 16));
    later(() => this.flush());
  }

  /**
   * Lay together every tile that changed since the last flush, and tell the picture. The host calls this once a frame,
   * before it draws, so new paint is on the screen the frame it was made; it also runs by itself once a frame.
   */
  flush() {
    this.pending = false;
    if (!this.dirty.size) return;
    const work = [...this.dirty];
    this.dirty.clear();
    for (const [key, part] of work) this.#recomposite(key, part);
    this.onChange(new Set(work.map(([key]) => key)));
  }

  /* ---------------------------------------------------------------- layers */

  /**
   * The painters of this wall: [{ by, since }]. A layer that is gone takes its paint with it, except one with a stroke
   * being painted into it (a painter's first stroke, before the world has a page for their layer).
   */
  setLayers(list) {
    const want = new Set(list.map((l) => l.by));
    for (const s of this.strokes.values()) want.add(s.by);
    for (const [by, layer] of this.layers) {
      if (want.has(by)) continue;
      for (const key of layer.tiles.keys()) this.#dirty(key);
      this.layers.delete(by);
    }
    for (const l of list) {
      const have = this.layers.get(l.by);
      if (have) { if (Number.isFinite(l.since) && l.since !== have.since) { have.since = l.since; this.#allDirty(have); } continue; }
      this.layers.set(l.by, { by: l.by, since: l.since ?? Date.now(), tiles: new Map(), sources: new Map() });
    }
    const before = this.order.join("|");
    this.order = layerOrder([...this.layers.values()]).map((l) => l.by);
    if (before !== this.order.join("|")) for (const layer of this.layers.values()) this.#allDirty(layer);
  }

  ensureLayer(by, since = Date.now()) {
    if (!this.layers.has(by)) this.setLayers([...[...this.layers.values()].map((l) => ({ by: l.by, since: l.since })), { by, since }]);
    return this.layers.get(by);
  }

  #allDirty(layer) { for (const key of layer.tiles.keys()) this.#dirty(key); }

  /** What a layer's tile holds, as kept in the world (a picture's data URL, or null for no paint). */
  sourceOf(by, key) { return this.layers.get(by)?.sources.get(key) ?? null; }

  /** This screen made this picture of a tile and is keeping it: when the world sends it back, there is nothing to load. */
  noteSource(by, key, source) {
    const layer = this.layers.get(by);
    if (!layer) return;
    layer.sources.set(key, source ?? null);
    if (!source) { layer.tiles.delete(key); this.#dirty(key); }
  }

  /** The strokes being painted by someone else on this screen's wall, seen live: their ids by painter. */
  liveStrokes() { return [...this.strokes.values()].filter((s) => s.live); }

  /** A layer's tile, from the picture kept in the world. A tile that already shows this picture is left alone. */
  async setTile(by, key, source) {
    const layer = this.ensureLayer(by);
    if ((layer.sources.get(key) ?? null) === (source ?? null)) return false;
    const ticket = `${by}|${key}`;
    this.loads.set(ticket, source ?? null);
    let image = null;
    if (source) {
      image = new Image();
      image.src = source;
      try { await image.decode(); } catch { return false; }
    }
    if (this.loads.get(ticket) !== (source ?? null)) return false;      // a newer picture for this tile arrived meanwhile
    this.loads.delete(ticket);
    const live = this.layers.get(by);
    if (!live) return false;
    live.sources.set(key, source ?? null);
    if (!source) live.tiles.delete(key);
    else {
      const rect = tileRect(this.grid, key);
      let c = live.tiles.get(key);
      if (!c) { c = make(rect.w, rect.h); live.tiles.set(key, c); }
      const x = ctxOf(c);
      x.clearRect(0, 0, c.width, c.height);
      x.drawImage(image, 0, 0);
    }
    this.#dirty(key);
    return true;
  }

  /** Put a layer's tiles back to what is kept in the world (a smudge given up half way, a save that failed). */
  async revert(by, keys) {
    const layer = this.layers.get(by);
    if (!layer) return;
    await Promise.all([...keys].map(async (key) => {
      const source = layer.sources.get(key) ?? null;
      layer.sources.delete(key);
      layer.tiles.delete(key);
      this.#dirty(key);
      if (source) await this.setTile(by, key, source);
    }));
  }

  /** Keep paint to these shapes (the chalk zones, fractions of the painting), or let it go anywhere (null). */
  setMask(shapes) {
    const next = shapes?.length ? shapes.map((poly) => poly.map(([fx, fy]) => [fx * this.grid.w, fy * this.grid.h])) : null;
    if (JSON.stringify(next) === JSON.stringify(this.mask)) return;
    this.mask = next;
    this.maskTiles.clear();
    this.maskBoxes = next?.map((poly) => {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      return { poly, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    }) ?? null;
  }

  /**
   * Can a dab at (x, y) of radius r leave paint inside the chalk zones? A dab that cannot is never laid down at all, so a
   * stroke painted outside the zones costs nothing, and every tile a stroke does touch is sure to hold paint.
   */
  #inMask(x, y, r) {
    if (!this.maskBoxes) return true;
    for (const m of this.maskBoxes) {
      if (x + r < m.x0 || x - r > m.x1 || y + r < m.y0 || y - r > m.y1) continue;
      const p = m.poly;
      let inside = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i];
        const [xj, yj] = p[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        // within r of this edge?
        const dx = xj - xi;
        const dy = yj - yi;
        const t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(xi + t * dx - x, yi + t * dy - y) <= r) return true;
      }
      if (inside) return true;
    }
    return false;
  }

  #maskTile(key) {
    if (!this.mask) return null;
    let c = this.maskTiles.get(key);
    if (c) return c;
    const rect = tileRect(this.grid, key);
    c = make(rect.w, rect.h);
    const x = ctxOf(c);
    x.fillStyle = "#fff";
    x.translate(-rect.x, -rect.y);
    for (const poly of this.mask) {
      x.beginPath();
      poly.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.closePath();
      x.fill();
    }
    this.maskTiles.set(key, c);
    return c;
  }

  /* ---------------------------------------------------------------- strokes */

  /**
   * Start a stroke. `by` is whose layer it goes into; `colour` "#rrggbb"; `magic` { rainbow, glow, sparkle } for magic
   * chalk; `opacity` how much a whole stroke can lay down; `everyone` lets an eraser rub out every layer (the GM's).
   */
  begin({ id, by, tool = "chalk", colour = "#f2ecdc", opacity = null, magic = null, everyone = false, live = false }) {
    const def = TOOLS[tool] ?? TOOLS.chalk;
    this.ensureLayer(by);
    const stroke = {
      id, by, tool, def, colour, magic: def.magic ? { rainbow: false, glow: false, sparkle: false, ...(magic ?? {}) } : null,
      opacity: opacity ?? def.opacity, everyone: def.kind === "erase" && everyone, live,
      buffer: new Map(), processed: new Map(), stale: new Map(), touched: new Set(), dabs: [], carried: null
    };
    this.strokes.set(id, stroke);
    return stroke;
  }

  /** Lay dabs (core/brush.mjs) into a stroke. The wall shows them at the next flush (once a frame). */
  paint(id, dabs) {
    const s = this.strokes.get(id);
    if (!s || !dabs.length) return;
    for (const dab of dabs) {
      s.dabs.push(dab);
      if (s.def.kind === "smudge") this.#smudge(s, dab);
      else this.#stamp(s, dab);
    }
  }

  #bufferTile(s, key, rect) {
    let c = s.buffer.get(key);
    if (!c) {
      c = make(rect.w, rect.h);
      s.buffer.set(key, c);
    }
    return c;
  }

  /** A stroke changed part of a tile (`part`, tile pixels): its processed tile and the wall there are out of date. */
  #touch(s, key, part) {
    s.touched.add(key);
    const had = s.stale.get(key);
    s.stale.set(key, had === undefined ? part : union(had, part));
    this.#dirty(key, part);
  }

  #stamp(s, dab) {
    const r = dab.size / 2;
    if (s.def.kind !== "erase" && !this.#inMask(dab.x, dab.y, r + 1)) return;      // all of it would be masked away
    const keys = tilesFor(this.grid, { x0: dab.x - r - 2, y0: dab.y - r - 2, x1: dab.x + r + 2, y1: dab.y + r + 2 });
    // the rainbow's colour changes every RAINBOW_STEP pixels, so its tips can be kept rather than made afresh at every dab
    const colour = s.def.kind === "erase" ? "#ffffff" : s.magic?.rainbow ? rainbowAt(s.colour, Math.round(dab.dist / RAINBOW_STEP) * RAINBOW_STEP) : s.colour;
    if (s.def.kind === "spray") {
      const rand = rng(dab.seed);
      const n = Math.max(1, Math.round((s.def.particles ?? 30) * dab.flow));
      const specks = [];
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const d = r * Math.pow(rand(), 0.75);
        specks.push({ x: dab.x + Math.cos(a) * d, y: dab.y + Math.sin(a) * d, size: 1.2 + rand() * 2.4, alpha: 0.3 + rand() * 0.6 });
      }
      const tip = this.tips.coloured("speck", 0, colour);
      for (const key of keys) {
        const rect = tileRect(this.grid, key);
        const x = ctxOf(this.#bufferTile(s, key, rect));
        for (const p of specks) {
          if (p.x < rect.x - 4 || p.y < rect.y - 4 || p.x > rect.x + rect.w + 4 || p.y > rect.y + rect.h + 4) continue;
          x.globalAlpha = p.alpha;
          x.drawImage(tip, p.x - rect.x - p.size / 2, p.y - rect.y - p.size / 2, p.size, p.size);
        }
        x.globalAlpha = 1;
        this.#touch(s, key, { x0: dab.x - r - 4 - rect.x, y0: dab.y - r - 4 - rect.y, x1: dab.x + r + 4 - rect.x, y1: dab.y + r + 4 - rect.y });
      }
      return;
    }
    const tipName = s.def.tip ?? "round";
    const variant = tipName === "chalk" ? dab.seed % VARIANTS : 0;
    const tip = this.tips.coloured(tipName, variant, colour);
    const cos = dab.angle ? Math.cos(dab.angle) : 1;
    const sin = dab.angle ? Math.sin(dab.angle) : 0;
    for (const key of keys) {
      const rect = tileRect(this.grid, key);
      const x = ctxOf(this.#bufferTile(s, key, rect));
      const cx = dab.x - rect.x;
      const cy = dab.y - rect.y;
      x.setTransform(cos, sin, -sin, cos, cx, cy);
      x.globalAlpha = dab.flow;
      x.drawImage(tip, -r, -r, r * 2, r * 2);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalAlpha = 1;
      this.#touch(s, key, { x0: cx - r - 2, y0: cy - r - 2, x1: cx + r + 2, y1: cy + r + 2 });
    }
  }

  /**
   * What a stroke's buffer lays down on a tile: with the wall's grain, kept to the zones. Kept from frame to frame, and
   * made again only where the stroke has painted since it was last made.
   */
  #processedTile(s, key) {
    const buf = s.buffer.get(key);
    if (!buf) return null;
    let c = s.processed.get(key);
    const stale = s.stale.get(key);
    if (c && stale === undefined) return c;
    const rect = tileRect(this.grid, key);
    let part = stale ?? null;
    if (!c) { c = make(rect.w, rect.h); s.processed.set(key, c); part = null; }
    s.stale.delete(key);
    const b = whole(part, rect.w, rect.h);
    if (!b.w || !b.h) return c;
    const x = ctxOf(c);
    x.save();
    x.beginPath();
    x.rect(b.x, b.y, b.w, b.h);
    x.clip();
    x.clearRect(b.x, b.y, b.w, b.h);
    x.drawImage(buf, 0, 0);
    if (s.def.grain > 0 && s.def.kind !== "erase") {
      const p = this.grain.pattern(x, Math.round(Math.max(0, Math.min(1, s.def.grain)) * 20) / 20, rect.x, rect.y);
      if (p) { x.globalCompositeOperation = "destination-in"; x.fillStyle = p; x.fillRect(b.x, b.y, b.w, b.h); }
    }
    const mask = s.def.kind === "erase" ? null : this.#maskTile(key);
    if (mask) { x.globalCompositeOperation = "destination-in"; x.drawImage(mask, 0, 0); }
    x.restore();
    return c;
  }

  /**
   * The finger: carries the paint it passes over (from the whole wall) and lays it down a little further on. The wall it
   * reads is the one last laid together (at most a frame old: the finger's own last few dabs are not picked up again until
   * the next frame, which nobody can see), into canvases kept for the stroke, so a dab makes nothing new.
   */
  #smudge(s, dab) {
    const size = Math.max(4, Math.ceil(dab.size));
    const x0 = Math.round(dab.x - size / 2);
    const y0 = Math.round(dab.y - size / 2);
    if (s.here?.width !== size) { s.here = make(size, size); s.put = make(size, size); }
    const here = this.#readInto(s.here, x0, y0);
    if (!s.carried) { s.carried = make(size, size); ctxOf(s.carried).drawImage(here, 0, 0); return; }
    if (s.carried.width !== size) {
      const resized = make(size, size);
      ctxOf(resized).drawImage(s.carried, 0, 0, size, size);
      s.carried = resized;
    }
    // what is laid down: what the finger carries, through a soft round tip
    const put = s.put;
    const px = ctxOf(put);
    px.globalCompositeOperation = "copy";
    px.drawImage(s.carried, 0, 0);
    px.globalCompositeOperation = "destination-in";
    px.drawImage(this.tips.shape("soft", 0), 0, 0, size, size);
    px.globalCompositeOperation = "source-over";
    const layer = this.layers.get(s.by);
    for (const key of tilesFor(this.grid, { x0, y0, x1: x0 + size, y1: y0 + size })) {
      const rect = tileRect(this.grid, key);
      let t = layer.tiles.get(key);
      if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
      const tx = ctxOf(t);
      tx.globalAlpha = Math.max(0.05, Math.min(1, s.def.flow * dab.flow * 1.4));
      tx.drawImage(put, x0 - rect.x, y0 - rect.y);
      tx.globalAlpha = 1;
      s.touched.add(key);
      this.#dirty(key, { x0: x0 - rect.x - 1, y0: y0 - rect.y - 1, x1: x0 - rect.x + size + 1, y1: y0 - rect.y + size + 1 });
    }
    // and picks up some of what is here, so the colour drags and fades
    const cx = ctxOf(s.carried);
    cx.globalAlpha = 0.28;
    cx.drawImage(here, 0, 0);
    cx.globalAlpha = 1;
  }

  /** A rectangle of the whole wall as it is shown, into a canvas of its own (laid together first, to the last dab). */
  #read(x0, y0, w, h) {
    const keys = tilesFor(this.grid, { x0, y0, x1: x0 + w, y1: y0 + h });
    if (keys.some((key) => this.dirty.has(key))) this.flush();
    return this.#readInto(make(w, h), x0, y0);
  }

  /** The wall as last laid together, from (x0, y0), into `out` (cleared first). */
  #readInto(out, x0, y0) {
    const ox = ctxOf(out);
    ox.clearRect(0, 0, out.width, out.height);
    for (const key of tilesFor(this.grid, { x0, y0, x1: x0 + out.width, y1: y0 + out.height })) {
      const t = this.composite.get(key);
      if (!t) continue;
      const rect = tileRect(this.grid, key);
      ox.drawImage(t, rect.x - x0, rect.y - y0);
    }
    return out;
  }

  /**
   * End a stroke here: lay it into its painter's layer (or, rubbing out, take it out of the layers it may touch) and
   * return what changed: Map<by, Map<key, canvas | null>> (null where a tile has no paint left).
   */
  commit(id) {
    const s = this.strokes.get(id);
    if (!s) return new Map();
    this.strokes.delete(id);
    const changed = new Map();
    const note = (by, key, canvas) => { if (!changed.has(by)) changed.set(by, new Map()); changed.get(by).set(key, canvas); };
    if (s.def.kind === "smudge") {
      const layer = this.layers.get(s.by);
      for (const key of s.touched) note(s.by, key, layer?.tiles.get(key) ?? null);
    } else if (s.def.kind === "erase") {
      const layers = s.everyone ? [...this.layers.values()] : [this.layers.get(s.by)].filter(Boolean);
      for (const key of s.touched) {
        const mask = this.#processedTile(s, key);
        for (const layer of layers) {
          const t = layer.tiles.get(key);
          if (!t || !mask) continue;
          const x = ctxOf(t);
          x.globalCompositeOperation = "destination-out";
          x.globalAlpha = s.opacity;
          x.drawImage(mask, 0, 0);
          x.globalCompositeOperation = "source-over";
          x.globalAlpha = 1;
          note(layer.by, key, t);
        }
      }
    } else {
      const layer = this.layers.get(s.by);
      const keys = new Set(s.touched);
      if (s.magic?.glow) for (const key of this.#glow(s, layer)) keys.add(key);
      for (const key of s.touched) {
        const p = this.#processedTile(s, key);
        if (!p) continue;
        const rect = tileRect(this.grid, key);
        let t = layer.tiles.get(key);
        if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
        const x = ctxOf(t);
        x.globalAlpha = s.opacity;
        x.drawImage(p, 0, 0);
        x.globalAlpha = 1;
      }
      if (s.magic?.sparkle) for (const key of this.#sparkle(s, layer)) keys.add(key);
      for (const key of keys) note(s.by, key, layer.tiles.get(key) ?? null);
      // paint only ever adds, and only dabs that reach the zones are laid down: every tile here holds paint, so nobody
      // has to read it back to find out (`encodeTile`'s `sure`)
      changed.painted = true;
    }
    for (const key of s.touched) this.#dirty(key);
    for (const tiles of changed.values()) for (const key of tiles.keys()) this.#dirty(key);
    return changed;
  }

  /** Throw a stroke away (Escape in the middle of one; a remote stroke whose paint has arrived). */
  drop(id) {
    const s = this.strokes.get(id);
    if (!s) return;
    this.strokes.delete(id);
    for (const key of s.touched) this.#dirty(key);
  }

  /**
   * Magic chalk's glow: a soft halo of the stroke's own colour, laid under it. Blurred at a quarter of the size (a blur
   * this soft looks the same, and a long stroke's halo at full size was most of the pause when the pointer came up).
   * Returns the tiles it reached.
   */
  #glow(s, layer) {
    const box = dabBounds(s.dabs);
    if (!box) return [];
    const spread = Math.max(6, Math.min(40, (s.dabs[0]?.size ?? 8) * 1.6));
    const x0 = Math.floor(box.x0 - spread * 2);
    const y0 = Math.floor(box.y0 - spread * 2);
    const w = Math.ceil(box.x1 - box.x0 + spread * 4);
    const h = Math.ceil(box.y1 - box.y0 + spread * 4);
    const k = GLOW_SCALE;
    const sw = Math.max(1, Math.ceil(w / k));
    const sh = Math.max(1, Math.ceil(h / k));
    const small = make(sw, sh);
    const wx = ctxOf(small);
    wx.imageSmoothingQuality = "medium";
    for (const key of s.touched) {
      const p = this.#processedTile(s, key);
      if (!p) continue;
      const rect = tileRect(this.grid, key);
      wx.drawImage(p, (rect.x - x0) / k, (rect.y - y0) / k, rect.w / k, rect.h / k);
    }
    const halo = make(sw, sh);
    const hx = ctxOf(halo);
    hx.filter = `blur(${spread / k}px)`;
    hx.drawImage(small, 0, 0);
    hx.filter = "none";
    const keys = tilesFor(this.grid, { x0, y0, x1: x0 + w, y1: y0 + h });
    for (const key of keys) {
      const rect = tileRect(this.grid, key);
      let t = layer.tiles.get(key);
      if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
      const tx = ctxOf(t);
      tx.globalAlpha = 0.85;
      tx.imageSmoothingQuality = "medium";
      tx.drawImage(halo, x0 - rect.x, y0 - rect.y, sw * k, sh * k);
      tx.globalAlpha = 1;
    }
    return keys;
  }

  /** Magic chalk's sparkle: small four-pointed glints along the stroke. Returns the tiles they fell on. */
  #sparkle(s, layer) {
    const rand = rng(s.dabs[0]?.seed ?? 5);
    const keys = new Set();
    let next = 20 + rand() * 40;
    for (const dab of s.dabs) {
      if (dab.dist < next) continue;
      next = dab.dist + 45 + rand() * 70;
      const size = Math.max(6, dab.size * (1.2 + rand() * 1.2));
      const cx = dab.x + (rand() - 0.5) * dab.size * 1.5;
      const cy = dab.y + (rand() - 0.5) * dab.size * 1.5;
      const turn = rand() * 0.6;
      for (const key of tilesFor(this.grid, { x0: cx - size, y0: cy - size, x1: cx + size, y1: cy + size })) {
        const rect = tileRect(this.grid, key);
        let t = layer.tiles.get(key);
        if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
        const x = ctxOf(t);
        x.save();
        x.translate(cx - rect.x, cy - rect.y);
        x.rotate(turn);
        x.fillStyle = "rgba(255,252,240,0.95)";
        x.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const rr = i % 2 ? size * 0.16 : size;
          x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        x.closePath();
        x.fill();
        x.restore();
        keys.add(key);
      }
    }
    return keys;
  }

  /* ---------------------------------------------------------------- one-click tools */

  /**
   * Fill the shape around a point of the wall with a colour, on `by`'s layer, under any paint already there. The shape is
   * whatever paint on the wall (anyone's) closes round the point. Returns { ok, reason?, changed: Map<key, canvas> }.
   */
  fill({ x, y, by, colour, opacity = TOOLS.fill.opacity, grain = TOOLS.fill.grain }) {
    const { w: W, h: H } = this.grid;
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= W || py >= H) return { ok: false, reason: "outside", changed: new Map() };
    this.flush();
    const all = this.#read(0, 0, W, H);
    const data = ctxOf(all).getImageData(0, 0, W, H).data;
    const solid = (i) => data[i * 4 + 3] >= FILL_ALPHA;
    if (solid(py * W + px)) return { ok: false, reason: "on-paint", changed: new Map() };
    const mask = new Uint8Array(W * H);
    const stack = [[px, py]];
    let count = 0;
    let x0 = px;
    let x1 = px;
    let y0 = py;
    let y1 = py;
    const most = W * H * FILL_MOST;
    while (stack.length) {
      const [sx, sy] = stack.pop();
      let lx = sx;
      while (lx > 0 && !solid(sy * W + lx - 1) && !mask[sy * W + lx - 1]) lx--;
      let rx = sx;
      while (rx < W - 1 && !solid(sy * W + rx + 1) && !mask[sy * W + rx + 1]) rx++;
      for (let i = lx; i <= rx; i++) {
        const k = sy * W + i;
        if (mask[k] || solid(k)) continue;
        mask[k] = 1;
        count++;
      }
      if (count > most) return { ok: false, reason: "open", changed: new Map() };
      x0 = Math.min(x0, lx); x1 = Math.max(x1, rx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      for (const ny of [sy - 1, sy + 1]) {
        if (ny < 0 || ny >= H) continue;
        let inRun = false;
        for (let i = lx; i <= rx; i++) {
          const k = ny * W + i;
          const open = !mask[k] && !solid(k);
          if (open && !inRun) { stack.push([i, ny]); inRun = true; } else if (!open) inRun = false;
        }
      }
    }
    // tuck the fill a little under the lines round it, so no gap shows at their soft edges: grown two pixels every way,
    // across and then down (the same square, in a tenth of the time)
    const grow = 2;
    x0 = Math.max(0, x0 - grow); y0 = Math.max(0, y0 - grow); x1 = Math.min(W - 1, x1 + grow); y1 = Math.min(H - 1, y1 + grow);
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const across = new Uint8Array(bw * bh);
    for (let yy = 0; yy < bh; yy++) {
      const row = (y0 + yy) * W;
      for (let xx = 0; xx < bw; xx++) {
        const gx = x0 + xx;
        for (let dx = -grow; dx <= grow; dx++) {
          const rx = gx + dx;
          if (rx >= 0 && rx < W && mask[row + rx]) { across[yy * bw + xx] = 1; break; }
        }
      }
    }
    const n = parseInt(colour.slice(1), 16);
    const [cr, cg, cb] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const shape = make(bw, bh);
    const sx = ctxOf(shape);
    const img = sx.createImageData(bw, bh);
    const alpha = Math.round(255 * opacity);
    for (let yy = 0; yy < bh; yy++) {
      for (let xx = 0; xx < bw; xx++) {
        let on = 0;
        for (let dy = -grow; dy <= grow; dy++) {
          const ry = yy + dy;
          if (ry >= 0 && ry < bh && across[ry * bw + xx]) { on = 1; break; }
        }
        if (!on) continue;
        const o = (yy * bw + xx) * 4;
        img.data[o] = cr; img.data[o + 1] = cg; img.data[o + 2] = cb; img.data[o + 3] = alpha;
      }
    }
    sx.putImageData(img, 0, 0);
    if (grain > 0) {
      const p = this.grain.pattern(sx, Math.round(Math.max(0, Math.min(1, grain)) * 20) / 20, x0, y0);
      if (p) { sx.globalCompositeOperation = "destination-in"; sx.fillStyle = p; sx.fillRect(0, 0, bw, bh); sx.globalCompositeOperation = "source-over"; }
    }
    const layer = this.ensureLayer(by);
    const changed = new Map();
    const piece = make(this.grid.tile, this.grid.tile);
    const pc = ctxOf(piece);
    for (const key of tilesFor(this.grid, { x0, y0, x1, y1 })) {
      const rect = tileRect(this.grid, key);
      pc.clearRect(0, 0, piece.width, piece.height);
      pc.drawImage(shape, x0 - rect.x, y0 - rect.y);
      const mask2 = this.#maskTile(key);
      if (mask2) { pc.globalCompositeOperation = "destination-in"; pc.drawImage(mask2, 0, 0); pc.globalCompositeOperation = "source-over"; }
      let t = layer.tiles.get(key);
      if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
      const tx = ctxOf(t);
      tx.globalCompositeOperation = "destination-over";        // under whatever this painter has already put here
      tx.drawImage(piece, 0, 0, rect.w, rect.h, 0, 0, rect.w, rect.h);
      tx.globalCompositeOperation = "source-over";
      changed.set(key, t);
      this.#dirty(key);
    }
    return { ok: true, changed, area: count };
  }

  /** The colour of the paint at a point of the wall, or null where there is none to speak of. */
  pick(x, y) {
    this.flush();
    const key = tilesFor(this.grid, { x0: x, y0: y, x1: x, y1: y })[0];
    const t = key ? this.composite.get(key) : null;
    if (!t) return null;
    const rect = tileRect(this.grid, key);
    const d = ctxOf(t).getImageData(Math.floor(x - rect.x), Math.floor(y - rect.y), 1, 1).data;
    if (d[3] < 60) return null;
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  /* ---------------------------------------------------------------- the whole wall */

  /** A tile-sized canvas kept for laying a layer under an eraser, without making one each time. */
  #scratchTile() {
    this.scratch ??= make(this.grid.tile, this.grid.tile);
    return this.scratch;
  }

  /**
   * Lay every layer of a tile together, with any strokes being painted into it at their painter's place: all of it, or
   * only `part` (tile pixels), where something changed.
   */
  #recomposite(key, part = null) {
    const rect = tileRect(this.grid, key);
    const strokes = [...this.strokes.values()].filter((s) => s.touched.has(key));
    if (!strokes.length && !this.order.some((by) => this.layers.get(by)?.tiles.has(key))) {
      this.composite.delete(key);
      return;
    }
    let out = this.composite.get(key);
    if (!out) { out = make(rect.w, rect.h); this.composite.set(key, out); part = null; }
    const b = whole(part, rect.w, rect.h);
    if (!b.w || !b.h) return;
    const x = ctxOf(out);
    x.save();
    x.beginPath();
    x.rect(b.x, b.y, b.w, b.h);
    x.clip();
    x.clearRect(b.x, b.y, b.w, b.h);
    for (const by of this.order) {
      const layer = this.layers.get(by);
      const tile = layer.tiles.get(key);
      const erasers = strokes.filter((s) => s.def.kind === "erase" && (s.by === by || s.everyone));
      if (tile) {
        if (erasers.length) {
          const tmp = this.#scratchTile();
          const tx = ctxOf(tmp);
          tx.save();
          tx.beginPath();
          tx.rect(b.x, b.y, b.w, b.h);
          tx.clip();
          tx.clearRect(b.x, b.y, b.w, b.h);
          tx.drawImage(tile, 0, 0);
          tx.globalCompositeOperation = "destination-out";
          for (const s of erasers) { const m = this.#processedTile(s, key); if (m) { tx.globalAlpha = s.opacity; tx.drawImage(m, 0, 0); } }
          tx.restore();
          x.drawImage(tmp, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h);
        } else {
          x.drawImage(tile, 0, 0);
        }
      }
      for (const s of strokes) {
        if (s.by !== by || s.def.kind === "erase" || s.def.kind === "smudge") continue;
        const p = this.#processedTile(s, key);
        if (!p) continue;
        x.globalAlpha = s.opacity * (s.live ? 0.9 : 1);
        x.drawImage(p, 0, 0);
        x.globalAlpha = 1;
      }
    }
    x.restore();
  }

  /** Every tile with paint, for a picture being built afresh. */
  keys() {
    this.flush();
    return [...this.composite.keys()];
  }

  /** Forget everything (the scene is going). */
  clear() {
    const keys = new Set([...this.composite.keys()]);
    this.layers.clear();
    this.order = [];
    this.composite.clear();
    this.strokes.clear();
    this.dirty.clear();
    this.onChange(keys);
  }
}

const samplers = new WeakMap();

/**
 * The colour of a painting at a point of it (fractions), as "#rrggbb": what the colour picker takes where there is no chalk.
 * The painting is copied once into a small canvas that can be read; null if it cannot be (a picture from elsewhere).
 */
export function samplePainting(image, fx, fy) {
  if (!image || !(fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1)) return null;
  let s = samplers.get(image);
  if (!s) {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih) return null;
    const w = Math.min(1024, iw);
    const h = Math.max(1, Math.round((w * ih) / iw));
    const c = make(w, h);
    const x = ctxOf(c);
    x.drawImage(image, 0, 0, w, h);
    s = { x, w, h };
    samplers.set(image, s);
  }
  try {
    const d = s.x.getImageData(Math.min(s.w - 1, Math.floor(fx * s.w)), Math.min(s.h - 1, Math.floor(fy * s.h)), 1, 1).data;
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return null;
  }
}

/** Has a tile any paint on it? */
function painted(canvas) {
  const d = ctxOf(canvas).getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 3) return true;
  return false;
}

/**
 * What a kept picture of a tile costs (the whole journal goes to every client that joins: chalk.md §11.2): lossy WebP at
 * 0.85 (a third smaller than at 0.92, and chalk is fuzzy anyway), and the picture's alpha rounded to ALPHA_LEVELS steps
 * (alpha is stored without loss and soft paint is mostly alpha: this is a fifth of what is left, and a step of 4 in 255 is
 * finer than the screen's own steps over a dark wall). The paint on this screen keeps its full alpha; only the kept
 * picture is rounded.
 */
const TILE_QUALITY = 0.85;
const ALPHA_LEVELS = 64;

/**
 * Round the alpha of `data` (RGBA bytes) to `levels` steps, in place. A pixel with no paint stays with none. It refers to
 * nothing outside itself: the encoder's worker is given its text.
 */
export function roundAlpha(data, levels = 64) {
  const step = 255 / (levels - 1);
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(Math.round(data[i] / step) * step);
  return data;
}

/**
 * The worker that turns tiles into pictures: it is given a snapshot of a tile (an ImageBitmap, which the main thread makes
 * without reading the graphics card back), reads it back itself, says whether there is any paint on it, rounds its alpha
 * and encodes it.
 */
const ENCODER = `
const roundAlpha = ${roundAlpha.toString()};
self.onmessage = async (e) => {
  const { id, bitmap, sure, quality, levels } = e.data;
  try {
    const c = new OffscreenCanvas(bitmap.width, bitmap.height);
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bitmap, 0, 0);
    bitmap.close();
    const img = x.getImageData(0, 0, c.width, c.height);
    if (!sure) {
      let any = false;
      for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 3) { any = true; break; }
      if (!any) { self.postMessage({ id, url: null }); return; }
    }
    roundAlpha(img.data, levels);
    x.putImageData(img, 0, 0);
    let blob = await c.convertToBlob({ type: "image/webp", quality });
    if (blob.type !== "image/webp") blob = await c.convertToBlob({ type: "image/png" });
    self.postMessage({ id, url: new FileReaderSync().readAsDataURL(blob) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};`;

let encoder;                       // the worker, once made; false where none can be made (then the main thread encodes)
let asked = 0;
const waiting = new Map();

function encoderWorker() {
  if (encoder !== undefined) return encoder;
  try {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") throw new Error("no workers here");
    encoder = new Worker(URL.createObjectURL(new Blob([ENCODER], { type: "text/javascript" })));
    encoder.onmessage = ({ data }) => {
      const w = waiting.get(data.id);
      if (!w) return;
      waiting.delete(data.id);
      if (data.error) w.fail(new Error(data.error)); else w.done(data.url);
    };
    encoder.onerror = () => { encoder = false; for (const w of waiting.values()) w.fail(new Error("the encoder stopped")); waiting.clear(); };
  } catch {
    encoder = false;
  }
  return encoder;
}

/**
 * A tile as a small picture to keep in the world (WebP where the browser can make one), or null when it has no paint.
 * Asynchronous, and kept off the main thread (chalk.md §11: making it there was a pause of a quarter to half a second when
 * the pointer came up): the tile is snapshotted the moment this is called, and read back and encoded by a worker. `sure`:
 * the tile is known to hold paint (`commit`'s `painted`), so nobody looks to find out.
 */
export function encodeTile(canvas, sure = false) {
  if (!canvas) return Promise.resolve(null);
  const worker = encoderWorker();
  if (!worker) return encodeHere(canvas, sure);
  const id = ++asked;
  const snapshot = createImageBitmap(canvas);         // the tile as it is now, whatever is painted on it next
  return new Promise((resolve) => {
    waiting.set(id, { done: resolve, fail: () => resolve(encodeNow(canvas)) });
    snapshot.then((bitmap) => worker.postMessage({ id, bitmap, sure, quality: TILE_QUALITY, levels: ALPHA_LEVELS }, [bitmap]))
      .catch(() => { waiting.delete(id); resolve(encodeHere(canvas, sure)); });
  });
}

/** A copy of a tile with its alpha rounded, for the main thread to encode (where there is no worker). */
function rounded(canvas) {
  const copy = make(canvas.width, canvas.height);
  const x = ctxOf(copy);
  x.drawImage(canvas, 0, 0);
  const img = x.getImageData(0, 0, copy.width, copy.height);
  roundAlpha(img.data, ALPHA_LEVELS);
  x.putImageData(img, 0, 0);
  return copy;
}

/** The same on the main thread, where there is no worker to do it. */
function encodeHere(canvas, sure) {
  if (!sure && !painted(canvas)) return Promise.resolve(null);
  const flat = rounded(canvas);
  if (typeof flat.toBlob !== "function" || typeof FileReader === "undefined") return Promise.resolve(encodeNow(flat));
  return new Promise((resolve) => {
    flat.toBlob((blob) => {
      if (!blob) { resolve(encodeNow(flat)); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(encodeNow(flat));
      reader.readAsDataURL(blob);
    }, "image/webp", TILE_QUALITY);
  });
}

function encodeNow(canvas) {
  const webp = canvas.toDataURL("image/webp", TILE_QUALITY);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}
