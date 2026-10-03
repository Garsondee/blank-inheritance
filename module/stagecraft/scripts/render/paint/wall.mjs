/**
 * The wall's pixels (chalk.md §5): every painter's layer as tiles of pixels, the whole wall as the stage shows it (each
 * layer laid over the one before), and the strokes being painted right now. The core decides where paint goes
 * (core/brush.mjs) and how the wall is cut up (core/chalk.mjs); this puts it on the page's canvases.
 *
 * A stroke is painted into a buffer of its own while it is being made, and laid into its painter's layer when it ends,
 * so a stroke never darkens where it crosses itself, the wall's grain sits still under it (chalk catches on the wall,
 * not on the stick), and a stroke kept to the chalk zones stops exactly at a zone's edge. Rubbing out is a stroke too: a
 * buffer of what to take away. A smudge and a fill change their painter's layer directly.
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

const make = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const ctxOf = (c) => c.getContext("2d");

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
  constructor() { this.noise = null; this.by = new Map(); }

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
}

/** Fill a whole canvas with a pattern placed so that it sits still on the wall, under a composite operation. */
function patternOver(ctx, image, wallX, wallY, w, h, op) {
  const p = ctx.createPattern(image, "repeat");
  if (!p) return;
  p.setTransform?.(new DOMMatrix().translate(-wallX, -wallY));
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
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
    this.dirty = new Set();
    this.loads = new Map();           // `${by}|${key}` -> the source being loaded, so a later one wins
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
      for (const key of layer.tiles.keys()) this.dirty.add(key);
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
    this.#flush();
  }

  ensureLayer(by, since = Date.now()) {
    if (!this.layers.has(by)) this.setLayers([...[...this.layers.values()].map((l) => ({ by: l.by, since: l.since })), { by, since }]);
    return this.layers.get(by);
  }

  #allDirty(layer) { for (const key of layer.tiles.keys()) this.dirty.add(key); }

  /** What a layer's tile holds, as kept in the world (a picture's data URL, or null for no paint). */
  sourceOf(by, key) { return this.layers.get(by)?.sources.get(key) ?? null; }

  /** This screen made this picture of a tile and is keeping it: when the world sends it back, there is nothing to load. */
  noteSource(by, key, source) {
    const layer = this.layers.get(by);
    if (!layer) return;
    layer.sources.set(key, source ?? null);
    if (!source) { layer.tiles.delete(key); this.dirty.add(key); this.#flush(); }
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
    this.dirty.add(key);
    this.#flush();
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
      this.dirty.add(key);
      if (source) await this.setTile(by, key, source);
    }));
    this.#flush();
  }

  /** Keep paint to these shapes (the chalk zones, fractions of the painting), or let it go anywhere (null). */
  setMask(shapes) {
    const next = shapes?.length ? shapes.map((poly) => poly.map(([fx, fy]) => [fx * this.grid.w, fy * this.grid.h])) : null;
    if (JSON.stringify(next) === JSON.stringify(this.mask)) return;
    this.mask = next;
    this.maskTiles.clear();
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
      buffer: new Map(), processed: new Map(), touched: new Set(), dabs: [], carried: null, before: new Map()
    };
    this.strokes.set(id, stroke);
    return stroke;
  }

  /** Lay dabs (core/brush.mjs) into a stroke. */
  paint(id, dabs) {
    const s = this.strokes.get(id);
    if (!s || !dabs.length) return;
    for (const dab of dabs) {
      s.dabs.push(dab);
      if (s.def.kind === "smudge") this.#smudge(s, dab);
      else this.#stamp(s, dab);
    }
    this.#flush();
  }

  #bufferTile(s, key) {
    let c = s.buffer.get(key);
    if (!c) {
      const rect = tileRect(this.grid, key);
      c = make(rect.w, rect.h);
      s.buffer.set(key, c);
    }
    return c;
  }

  #touch(s, key) {
    s.touched.add(key);
    s.processed.delete(key);
    this.dirty.add(key);
  }

  #stamp(s, dab) {
    const r = dab.size / 2;
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
        const x = ctxOf(this.#bufferTile(s, key));
        for (const p of specks) {
          if (p.x < rect.x - 4 || p.y < rect.y - 4 || p.x > rect.x + rect.w + 4 || p.y > rect.y + rect.h + 4) continue;
          x.globalAlpha = p.alpha;
          x.drawImage(tip, p.x - rect.x - p.size / 2, p.y - rect.y - p.size / 2, p.size, p.size);
        }
        x.globalAlpha = 1;
        this.#touch(s, key);
      }
      return;
    }
    const tipName = s.def.tip ?? "round";
    const variant = tipName === "chalk" ? dab.seed % VARIANTS : 0;
    const tip = this.tips.coloured(tipName, variant, colour);
    for (const key of keys) {
      const rect = tileRect(this.grid, key);
      const x = ctxOf(this.#bufferTile(s, key));
      x.save();
      x.globalAlpha = dab.flow;
      x.translate(dab.x - rect.x, dab.y - rect.y);
      if (dab.angle) x.rotate(dab.angle);
      x.drawImage(tip, -r, -r, r * 2, r * 2);
      x.restore();
      this.#touch(s, key);
    }
  }

  /** What a stroke's buffer lays down on a tile: with the wall's grain, kept to the zones. Cached until it changes. */
  #processedTile(s, key) {
    let c = s.processed.get(key);
    if (c) return c;
    const buf = s.buffer.get(key);
    if (!buf) return null;
    const rect = tileRect(this.grid, key);
    c = make(rect.w, rect.h);
    const x = ctxOf(c);
    x.drawImage(buf, 0, 0);
    if (s.def.grain > 0 && s.def.kind !== "erase") patternOver(x, this.grain.canvas(s.def.grain), rect.x, rect.y, rect.w, rect.h, "destination-in");
    const mask = s.def.kind === "erase" ? null : this.#maskTile(key);
    if (mask) { x.globalCompositeOperation = "destination-in"; x.drawImage(mask, 0, 0); x.globalCompositeOperation = "source-over"; }
    s.processed.set(key, c);
    return c;
  }

  /** The finger: carries the paint it passes over (from the whole wall) and lays it down a little further on. */
  #smudge(s, dab) {
    const size = Math.max(4, Math.ceil(dab.size));
    const x0 = Math.round(dab.x - size / 2);
    const y0 = Math.round(dab.y - size / 2);
    const here = this.#read(x0, y0, size, size);
    if (!s.carried) { s.carried = here; return; }
    if (s.carried.width !== size) {
      const resized = make(size, size);
      ctxOf(resized).drawImage(s.carried, 0, 0, size, size);
      s.carried = resized;
    }
    // what is laid down: what the finger carries, through a soft round tip
    const put = make(size, size);
    const px = ctxOf(put);
    px.drawImage(s.carried, 0, 0);
    px.globalCompositeOperation = "destination-in";
    px.drawImage(this.tips.shape("soft", 0), 0, 0, size, size);
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
      this.dirty.add(key);
    }
    // and picks up some of what is here, so the colour drags and fades
    const cx = ctxOf(s.carried);
    cx.globalAlpha = 0.28;
    cx.drawImage(here, 0, 0);
    cx.globalAlpha = 1;
  }

  /** A rectangle of the whole wall as it is shown, into a canvas of its own. */
  #read(x0, y0, w, h) {
    const out = make(w, h);
    const ox = ctxOf(out);
    for (const key of tilesFor(this.grid, { x0, y0, x1: x0 + w, y1: y0 + h })) {
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
    }
    for (const key of s.touched) this.dirty.add(key);
    for (const tiles of changed.values()) for (const key of tiles.keys()) this.dirty.add(key);
    this.#flush();
    return changed;
  }

  /** Throw a stroke away (Escape in the middle of one; a remote stroke whose paint has arrived). */
  drop(id) {
    const s = this.strokes.get(id);
    if (!s) return;
    this.strokes.delete(id);
    for (const key of s.touched) this.dirty.add(key);
    this.#flush();
  }

  /** Magic chalk's glow: a soft halo of the stroke's own colour, laid under it. Returns the tiles it reached. */
  #glow(s, layer) {
    const box = dabBounds(s.dabs);
    if (!box) return [];
    const spread = Math.max(6, Math.min(40, (s.dabs[0]?.size ?? 8) * 1.6));
    const x0 = Math.floor(box.x0 - spread * 2);
    const y0 = Math.floor(box.y0 - spread * 2);
    const w = Math.ceil(box.x1 - box.x0 + spread * 4);
    const h = Math.ceil(box.y1 - box.y0 + spread * 4);
    const whole = make(w, h);
    const wx = ctxOf(whole);
    for (const key of s.touched) {
      const p = this.#processedTile(s, key);
      if (!p) continue;
      const rect = tileRect(this.grid, key);
      wx.drawImage(p, rect.x - x0, rect.y - y0);
    }
    const halo = make(w, h);
    const hx = ctxOf(halo);
    hx.filter = `blur(${spread}px)`;
    hx.drawImage(whole, 0, 0);
    hx.filter = "none";
    const keys = tilesFor(this.grid, { x0, y0, x1: x0 + w, y1: y0 + h });
    for (const key of keys) {
      const rect = tileRect(this.grid, key);
      let t = layer.tiles.get(key);
      if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
      const tx = ctxOf(t);
      tx.globalAlpha = 0.85;
      tx.drawImage(halo, x0 - rect.x, y0 - rect.y);
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
      for (const key of tilesFor(this.grid, { x0: cx - size, y0: cy - size, x1: cx + size, y1: cy + size })) {
        const rect = tileRect(this.grid, key);
        let t = layer.tiles.get(key);
        if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
        const x = ctxOf(t);
        x.save();
        x.translate(cx - rect.x, cy - rect.y);
        x.rotate(rand() * 0.6);
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
    // tuck the fill a little under the lines round it, so no gap shows at their soft edges
    const grow = 2;
    x0 = Math.max(0, x0 - grow); y0 = Math.max(0, y0 - grow); x1 = Math.min(W - 1, x1 + grow); y1 = Math.min(H - 1, y1 + grow);
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const n = parseInt(colour.slice(1), 16);
    const [cr, cg, cb] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const shape = make(bw, bh);
    const sx = ctxOf(shape);
    const img = sx.createImageData(bw, bh);
    for (let yy = 0; yy < bh; yy++) {
      for (let xx = 0; xx < bw; xx++) {
        const gx = x0 + xx;
        const gy = y0 + yy;
        let on = 0;
        for (let dy = -grow; dy <= grow && !on; dy++) {
          const ry = gy + dy;
          if (ry < 0 || ry >= H) continue;
          for (let dx = -grow; dx <= grow; dx++) {
            const rx = gx + dx;
            if (rx >= 0 && rx < W && mask[ry * W + rx]) { on = 1; break; }
          }
        }
        if (!on) continue;
        const o = (yy * bw + xx) * 4;
        img.data[o] = cr; img.data[o + 1] = cg; img.data[o + 2] = cb; img.data[o + 3] = Math.round(255 * opacity);
      }
    }
    sx.putImageData(img, 0, 0);
    if (grain > 0) patternOver(sx, this.grain.canvas(grain), x0, y0, bw, bh, "destination-in");
    const layer = this.ensureLayer(by);
    const changed = new Map();
    for (const key of tilesFor(this.grid, { x0, y0, x1, y1 })) {
      const rect = tileRect(this.grid, key);
      let piece = make(rect.w, rect.h);
      const pc = ctxOf(piece);
      pc.drawImage(shape, x0 - rect.x, y0 - rect.y);
      const mask2 = this.#maskTile(key);
      if (mask2) { pc.globalCompositeOperation = "destination-in"; pc.drawImage(mask2, 0, 0); pc.globalCompositeOperation = "source-over"; }
      let t = layer.tiles.get(key);
      if (!t) { t = make(rect.w, rect.h); layer.tiles.set(key, t); }
      const tx = ctxOf(t);
      tx.globalCompositeOperation = "destination-over";        // under whatever this painter has already put here
      tx.drawImage(piece, 0, 0);
      tx.globalCompositeOperation = "source-over";
      piece = null;
      changed.set(key, t);
      this.dirty.add(key);
    }
    this.#flush();
    return { ok: true, changed, area: count };
  }

  /** The colour of the paint at a point of the wall, or null where there is none to speak of. */
  pick(x, y) {
    const key = tilesFor(this.grid, { x0: x, y0: y, x1: x, y1: y })[0];
    const t = key ? this.composite.get(key) : null;
    if (!t) return null;
    const rect = tileRect(this.grid, key);
    const d = ctxOf(t).getImageData(Math.floor(x - rect.x), Math.floor(y - rect.y), 1, 1).data;
    if (d[3] < 60) return null;
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  /* ---------------------------------------------------------------- the whole wall */

  /** Lay every layer of a tile together, with any strokes being painted into it at their painter's place. */
  #recomposite(key) {
    const rect = tileRect(this.grid, key);
    const strokes = [...this.strokes.values()].filter((s) => s.touched.has(key));
    let out = this.composite.get(key) ?? null;
    let drew = false;
    const target = () => {
      if (!out) { out = make(rect.w, rect.h); this.composite.set(key, out); }
      return ctxOf(out);
    };
    if (out) ctxOf(out).clearRect(0, 0, out.width, out.height);
    for (const by of this.order) {
      const layer = this.layers.get(by);
      const tile = layer.tiles.get(key);
      const erasers = strokes.filter((s) => s.def.kind === "erase" && (s.by === by || s.everyone));
      if (tile) {
        const x = target();
        if (erasers.length) {
          const tmp = make(rect.w, rect.h);
          const tx = ctxOf(tmp);
          tx.drawImage(tile, 0, 0);
          tx.globalCompositeOperation = "destination-out";
          for (const s of erasers) { const m = this.#processedTile(s, key); if (m) { tx.globalAlpha = s.opacity; tx.drawImage(m, 0, 0); } }
          x.drawImage(tmp, 0, 0);
        } else {
          x.drawImage(tile, 0, 0);
        }
        drew = true;
      }
      for (const s of strokes) {
        if (s.by !== by || s.def.kind === "erase" || s.def.kind === "smudge") continue;
        const p = this.#processedTile(s, key);
        if (!p) continue;
        const x = target();
        x.globalAlpha = s.opacity * (s.live ? 0.9 : 1);
        x.drawImage(p, 0, 0);
        x.globalAlpha = 1;
        drew = true;
      }
    }
    if (!drew && out) { this.composite.delete(key); out = null; }
  }

  #flush() {
    if (!this.dirty.size) return;
    const keys = new Set(this.dirty);
    this.dirty.clear();
    for (const key of keys) this.#recomposite(key);
    this.onChange(keys);
  }

  /** Every tile with paint, for a picture being built afresh. */
  keys() { return [...this.composite.keys()]; }

  /** Forget everything (the scene is going). */
  clear() {
    const keys = new Set([...this.composite.keys()]);
    this.layers.clear();
    this.order = [];
    this.composite.clear();
    this.strokes.clear();
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
    const x = c.getContext("2d", { willReadFrequently: true });
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

/** A tile as a small picture to keep in the world (WebP where the browser can make one), or null when it has no paint. */
export function encodeTile(canvas) {
  if (!canvas) return null;
  const d = ctxOf(canvas).getImageData(0, 0, canvas.width, canvas.height).data;
  let any = false;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 3) { any = true; break; }
  if (!any) return null;
  const webp = canvas.toDataURL("image/webp", 0.92);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}
