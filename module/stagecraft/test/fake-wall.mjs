// A stand-in for the chalk wall's pixels (render/paint/wall.mjs), for testing the controller without a browser: each tile
// of a layer holds a "picture" that is only the names of the strokes that painted it, joined by "+". It keeps the real
// wall's promises that the controller leans on (which tiles a stroke touched, what changed on commit, a layer's sources,
// live strokes kept apart from layers) and nothing else. The real pixels are checked in a browser by
// tools/stagecraft/bench/chalk-check.mjs.

import { tilesFor } from "../scripts/core/chalk.mjs";
import { TOOLS } from "../scripts/core/brush.mjs";

export class FakeWall {
  constructor({ grid, onChange = () => {} }) {
    this.grid = grid;
    this.onChange = onChange;
    this.layers = new Map();          // by -> { by, since, tiles: Map<key, { content }>, sources: Map<key, string|null> }
    this.strokes = new Map();
    this.composite = new Map();
    this.mask = undefined;
    this.fills = [];
    this.fillAnswer = null;           // what fill() answers, set by a test
    this.pickAnswer = null;           // what pick() answers
  }

  setLayers(list) {
    const want = new Set(list.map((l) => l.by));
    for (const s of this.strokes.values()) want.add(s.by);
    for (const by of [...this.layers.keys()]) if (!want.has(by)) this.layers.delete(by);
    for (const l of list) {
      const have = this.layers.get(l.by);
      if (have) have.since = l.since ?? have.since;
      else this.layers.set(l.by, { by: l.by, since: l.since ?? 0, tiles: new Map(), sources: new Map() });
    }
    this.#show();
  }

  ensureLayer(by, since = Date.now()) {
    if (!this.layers.has(by)) this.layers.set(by, { by, since, tiles: new Map(), sources: new Map() });
    return this.layers.get(by);
  }

  sourceOf(by, key) { return this.layers.get(by)?.sources.get(key) ?? null; }

  noteSource(by, key, source) {
    const l = this.layers.get(by);
    if (!l) return;
    l.sources.set(key, source ?? null);
    if (!source) l.tiles.delete(key);
  }

  liveStrokes() { return [...this.strokes.values()].filter((s) => s.live); }

  async setTile(by, key, source) {
    const l = this.ensureLayer(by);
    if ((l.sources.get(key) ?? null) === (source ?? null)) return false;
    await Promise.resolve();                       // a picture takes a moment to decode
    const live = this.layers.get(by);
    if (!live) return false;
    live.sources.set(key, source ?? null);
    if (source) live.tiles.set(key, { content: source }); else live.tiles.delete(key);
    this.#show();
    return true;
  }

  async revert(by, keys) {
    const l = this.layers.get(by);
    if (!l) return;
    for (const key of keys) {
      const s = l.sources.get(key) ?? null;
      if (s) l.tiles.set(key, { content: s }); else l.tiles.delete(key);
    }
    this.#show();
  }

  setMask(shapes) { this.mask = shapes; }

  begin(options) {
    this.ensureLayer(options.by);
    const s = { ...options, dabs: [], touched: new Set() };
    this.strokes.set(options.id, s);
    return s;
  }

  paint(id, dabs) {
    const s = this.strokes.get(id);
    if (!s || !dabs.length) return;
    for (const d of dabs) {
      s.dabs.push(d);
      for (const k of tilesFor(this.grid, { x0: d.x - d.size / 2, y0: d.y - d.size / 2, x1: d.x + d.size / 2, y1: d.y + d.size / 2 })) s.touched.add(k);
    }
    this.#show();
  }

  commit(id) {
    const s = this.strokes.get(id);
    if (!s) return new Map();
    this.strokes.delete(id);
    const changed = new Map();
    const note = (by, key, canvas) => { if (!changed.has(by)) changed.set(by, new Map()); changed.get(by).set(key, canvas); };
    if (TOOLS[s.tool].kind === "erase") {
      const layers = s.everyone ? [...this.layers.values()] : [this.layers.get(s.by)].filter(Boolean);
      for (const key of s.touched) for (const l of layers) if (l.tiles.has(key)) { l.tiles.delete(key); note(l.by, key, null); }
    } else {
      const l = this.layers.get(s.by);
      for (const key of s.touched) {
        const before = l.tiles.get(key)?.content;
        const tile = { content: before ? `${before}+${id}` : id };
        l.tiles.set(key, tile);
        note(s.by, key, tile);
      }
    }
    this.#show();
    return changed;
  }

  drop(id) {
    if (!this.strokes.delete(id)) return;
    this.#show();
  }

  fill(request) {
    this.fills.push(request);
    const answer = this.fillAnswer ?? { ok: false, reason: "open", changed: new Map() };
    if (answer.ok) {
      const l = this.ensureLayer(request.by);
      for (const [key, tile] of answer.changed) l.tiles.set(key, tile);
      this.#show();
    }
    return answer;
  }

  pick() { return this.pickAnswer; }

  keys() { return [...this.composite.keys()]; }

  clear() {
    this.layers.clear();
    this.strokes.clear();
    this.#show();
  }

  /** What a layer shows, as { key: content }: for the tests. */
  tilesOf(by) { return Object.fromEntries([...(this.layers.get(by)?.tiles ?? new Map())].map(([k, t]) => [k, t.content])); }

  #show() {
    const keys = new Set(this.composite.keys());
    this.composite.clear();
    for (const l of this.layers.values()) for (const k of l.tiles.keys()) this.composite.set(k, true);
    for (const s of this.strokes.values()) for (const k of s.touched) this.composite.set(k, true);
    for (const k of this.composite.keys()) keys.add(k);
    this.onChange(keys);
  }
}

/** The fake wall's pictures are their own contents. */
export const fakeEncode = (canvas) => canvas?.content ?? null;
