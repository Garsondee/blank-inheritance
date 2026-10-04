/**
 * The box of chalk, at a table (chalk.md). It joins the rules (core/chalk.mjs: where chalk may be used), the brush
 * (core/brush.mjs: how a hand becomes paint), the wall's pixels (render/paint/wall.mjs), the memory (chalk-store.mjs:
 * every painter's layer kept in the world), the tools (chalk-kit.mjs) and the pointer.
 *
 * Paint shows the moment it is put down. When a stroke ends, the tiles it touched are kept in the world with the step
 * that takes them back. Everyone else sees the stroke as it is being painted, sent across live; when the kept tiles
 * reach them, the live copy gives way to them. Nothing waits on anything: a slow save never holds up a hand.
 */

import { NS } from "./scene-data.mjs";
import { effectivePolicy, allowedAt, boxVisible, paintMask, wallGrid, toWall, PALETTE, stepId } from "../core/chalk.mjs";
import { TOOLS, STEADY, Stroke, Feel, lineDabs, dabBounds, hashSeed, cleanHex } from "../core/brush.mjs";
import { pointInPolygon } from "../core/zones.mjs";
import { RasterWall, encodeTile } from "../render/paint/wall.mjs";

const SEND_EVERY = 45;               // milliseconds between the live sends of a stroke's samples
const LIVE_TIMEOUT = 5000;           // a live stroke whose kept paint never comes is let go after this long
const PREFS = "stagecraft.chalk.prefs";

const newId = () => `${(game.user?.id ?? "x").slice(0, 6)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** This player's choices, kept on this machine: the colour, each tool's size, steady hand, magic chalk's tricks. */
function loadPrefs() {
  try { return JSON.parse(globalThis.localStorage?.getItem(PREFS) ?? "null") ?? {}; } catch { return {}; }
}
function savePrefs(prefs) {
  try { globalThis.localStorage?.setItem(PREFS, JSON.stringify(prefs)); } catch { /* a private window keeps nothing */ }
}

export class ChalkController {
  /**
   * `makeWall(options)` makes the wall's pixels (render/paint/wall.mjs `RasterWall`) and `encode(canvas)` turns a tile
   * into a picture to keep; a test passes stand-ins. `send(message)` puts a message on the stage's channel, for the live
   * copy of a stroke on other screens.
   */
  constructor({ host, store, makeWall = (options) => new RasterWall(options), encode = encodeTile, send = () => {} }) {
    this.host = host;
    this.store = store;
    this.sceneId = host.scene.id;
    this.send = send;
    this.encode = encode;
    this.pointerListeners = new Set();
    this.grid = wallGrid(host.description.painting);
    this.wall = makeWall({ grid: this.grid, onChange: (keys) => this.host.backend?.setChalkTiles?.(this.wall, keys) });
    this.wall.warmUp?.();            // the tips and the grain, made while the browser is idle, not at the first dab
    const prefs = loadPrefs();
    this.colour = cleanHex(prefs.colour) ?? PALETTE.white;
    this.recent = (prefs.recent ?? []).map(cleanHex).filter(Boolean).slice(0, 10);
    this.sizes = { ...Object.fromEntries(Object.entries(TOOLS).map(([k, t]) => [k, t.size.initial])), ...(prefs.sizes ?? {}) };
    this.steady = Number.isInteger(prefs.steady) ? Math.max(0, Math.min(STEADY.length - 1, prefs.steady)) : 1;
    this.magic = { rainbow: false, glow: true, sparkle: false, ...(prefs.magic ?? {}) };
    this.tool = null;                // the tool in hand, or null when the chalk is in its box
    this.drawing = null;
    this.lastEnd = null;             // where this hand's last stroke ended, for a straight line (Shift-click)
    this.redoSteps = [];
    this.keeping = Promise.resolve();   // strokes being kept, one after another, in the order they were made
    this.remote = new Map();         // live strokes of other painters: id -> { by, stroke, ended, layers, timer }
    this.loading = new Map();        // painter -> their layer's pictures being put on the wall
    this.listeners = new Set();      // the kit, told when the hand changes
    this.unsubscribe = store.onChange((sceneId, by) => {
      if (sceneId === null) { this.refresh(); this.sync(); }                  // the journal itself arrived or changed
      else if (sceneId === this.sceneId) this.#layerChanged(by);
    });
  }

  stop() {
    this.unsubscribe?.();
    this.putAway();
    for (const r of this.remote.values()) clearTimeout(r.timer);
    this.remote.clear();
    this.listeners.clear();
    this.pointerListeners.clear();
    clearTimeout(this.flashTimer);
  }

  /** Be told where the pointer is while chalk is in hand (window px, or null): for the tip drawn round it. */
  onPointer(fn) { this.pointerListeners.add(fn); return () => this.pointerListeners.delete(fn); }
  #tellPointer(p) { for (const fn of this.pointerListeners) fn(p); }

  /** The backend was rebuilt: show the whole wall again. */
  reset() {
    this.putAway();
    this.host.backend?.setChalkTiles?.(this.wall, new Set(this.wall.keys()), true);
  }

  /** Be told when the hand changes (the tool, the colour, the size): `fn()`. Returns an unsubscribe. */
  onHand(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #tellHand() { for (const fn of this.listeners) fn(); }

  /* ---------------------------------------------------------------- the rules */

  /** The scene's authored policy with the GM's live override laid over it. */
  policy() {
    const live = this.host.scene.flags?.[NS]?.live?.chalk ?? null;
    return effectivePolicy(this.host.description.chalk, live);
  }

  get usable() {
    return this.store.ready && boxVisible(this.policy(), this.host.description.zones);
  }

  /** Show or hide the box and the wall to match the rules; put the chalk away if it may no longer be used. */
  refresh() {
    const policy = this.policy();
    const usable = this.usable;
    this.host.backend.setChalkBox(usable);
    if (!usable || policy.locked) this.putAway();
    this.host.backend.setChalkHidden(this.host.scene.flags?.[NS]?.live?.chalkHidden === true);
    this.wall.setMask(paintMask(policy, this.host.description.zones));
    return policy;
  }

  /** The chalk zones of the scene, when the rules say chalk goes only on them (else none: it goes anywhere, or nowhere). */
  chalkZones() {
    return this.policy().mode === "zones" ? this.host.description.zones.filter((z) => z.kind === "chalk") : [];
  }

  /* ---------------------------------------------------------------- the wall and the world */

  /** Make the wall show what the world keeps: every painter's layer, every tile. */
  sync() {
    const layers = this.store.layers(this.sceneId);
    this.#setLayers(layers);
    for (const layer of layers) this.#loadLayer(layer);
  }

  /** The wall's layers as the world keeps them, and this painter's own even before the world has a page for it. */
  #setLayers(layers) {
    const list = layers.map((l) => ({ by: l.by, since: l.since }));
    const mine = this.wall.layers.get(game.user.id);
    if (mine && !list.some((l) => l.by === game.user.id)) list.push({ by: mine.by, since: mine.since });
    this.wall.setLayers(list);
  }

  /** Show a layer's tiles as the world keeps them; when its pictures are all on the wall, live strokes kept in it give way. */
  #loadLayer(layer) {
    const known = this.wall.layers.get(layer.by);
    const keys = new Set([...Object.keys(layer.tiles), ...(known ? [...known.sources.keys()] : [])]);
    const jobs = [];
    for (const key of keys) {
      const want = layer.tiles[key] ?? null;
      if (this.wall.sourceOf(layer.by, key) === want) continue;
      jobs.push(this.wall.setTile(layer.by, key, want).catch((err) => console.warn(`${NS} | a tile of chalk could not be shown`, err)));
    }
    const job = Promise.all(jobs);
    this.loading.set(layer.by, job);
    job.then(() => {
      if (this.loading.get(layer.by) === job) this.loading.delete(layer.by);
      this.#settle();
    });
    return job;
  }

  #layerChanged(by) {
    const layers = this.store.layers(this.sceneId);
    const layer = layers.find((l) => l.by === by);
    if (!layer) { this.sync(); return; }
    if (!this.wall.layers.has(by) || this.wall.layers.get(by).since !== layer.since) this.#setLayers(layers);
    this.#loadLayer(layer);
  }

  /**
   * Someone else's live strokes give way to their kept paint once it is on this wall: a stroke is kept when every layer it
   * changed has its step (the step's id ends in the stroke's) and that layer's pictures have all been shown.
   */
  #settle() {
    if (!this.remote.size) return;
    const layers = new Map(this.store.layers(this.sceneId).map((l) => [l.by, l]));
    for (const [id, r] of this.remote) {
      if (!r.ended) continue;
      const kept = r.layers.every((by) => !this.loading.has(by) && Object.keys(layers.get(by)?.history ?? {}).some((k) => k.endsWith(`-${id}`)));
      if (kept) this.#dropRemote(id);
    }
  }

  /* ---------------------------------------------------------------- the hand */

  /** The tool in hand (null when the chalk is in its box). */
  get inHand() { return this.tool; }

  /** Take something from the box: a stick of chalk (a colour's name), the magic stick, or the eraser ("rub"). */
  take(item) {
    if (!this.usable) return;
    if (item === "rub") return this.choose(this.tool === "eraser" ? null : "eraser");
    if (item === "magic") return this.choose(this.tool === "magic" ? null : "magic");
    const hex = PALETTE[item];
    if (!hex) return;
    if (this.tool === "chalk" && this.colour === hex) return this.putAway();
    this.setColour(hex);
    this.choose("chalk");
  }

  /** Change tools (from the kit), or put the chalk away (null). */
  choose(tool) {
    if (!tool) return this.putAway();
    if (!TOOLS[tool] || !this.usable) return;
    if (this.drawing) this.cancel();
    this.tool = tool;
    this.host.root?.classList.add("stagecraft-chalk");
    this.#tellHand();
  }

  putAway() {
    if (this.drawing) this.cancel();
    this.tool = null;
    this.cursorZone = null;
    this.blocked = false;
    this.pointer = null;
    this.host?.root?.classList.remove("stagecraft-chalk");
    this.#hint(null);
    this.#tellPointer(null);
    this.#tellHand();
  }

  /** The colour in hand. `remember: false` while a picker is being dragged: only where it stops joins the recent colours. */
  setColour(hex, { remember = true } = {}) {
    const c = cleanHex(hex);
    if (!c) return;
    this.colour = c;
    if (remember) this.recent = [c, ...this.recent.filter((r) => r !== c)].slice(0, 10);
    this.#keep();
    this.#tellHand();
  }

  setSize(size, tool = this.tool) {
    const def = TOOLS[tool];
    if (!def || def.kind === "fill") return;
    this.sizes[tool] = Math.round(Math.max(def.size.min, Math.min(def.size.max, size)) * 10) / 10;
    this.#keep();
    this.#tellHand();
  }

  /** A size a step up or down ([ and ]): bigger steps for bigger tips. */
  nudgeSize(direction) {
    const s = this.sizes[this.tool];
    if (!Number.isFinite(s)) return;
    this.setSize(s + direction * Math.max(1, s * 0.15));
  }

  setSteady(level) {
    this.steady = Math.max(0, Math.min(STEADY.length - 1, level));
    this.#keep();
    this.#tellHand();
  }

  setMagic(changes) {
    this.magic = { ...this.magic, ...changes };
    this.#keep();
    this.#tellHand();
  }

  #keep() {
    savePrefs({ colour: this.colour, recent: this.recent, sizes: this.sizes, steady: this.steady, magic: this.magic });
  }

  /** Wall pixels per window pixel here, for drawing the tip's true size round the pointer. */
  scale(p) {
    const a = this.host.backend.paintingAt(p.x, p.y);
    const b = this.host.backend.paintingAt(p.x + 40, p.y);
    if (!a || !b) return null;
    const wall = Math.hypot((b.x - a.x) * this.grid.w, (b.y - a.y) * this.grid.h);
    return wall > 0 ? 40 / wall : null;
  }

  /* ---------------------------------------------------------------- the pointer */

  /** The pointer moved with chalk in hand (window px). */
  hover(p) {
    if (!this.tool) return;
    this.pointer = p;
    if (!p) { this.#hint(null); this.#tellPointer(null); return; }
    const at = this.host.backend.paintingAt(p.x, p.y);
    this.cursorZone = at ? (this.chalkZones().find((z) => pointInPolygon(z.shape, at.x, at.y))?.id ?? null) : null;
    this.blocked = TOOLS[this.tool].kind !== "erase" && !(at && allowedAt(this.policy(), this.host.description.zones, at.x, at.y));
    if (!this.flashTimer) this.#hint(this.blocked && !this.drawing ? p : null);
    this.#tellPointer(p);
  }

  /** A small line by the pointer, while the chalk would leave no mark there: where it does go. */
  #hint(p, text = null) {
    const root = this.host?.root;
    if (typeof root?.querySelector !== "function" || typeof document === "undefined") return;
    let el = root.querySelector(".stagecraft-chalk-hint");
    if (!p) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement("div"); el.className = "stagecraft-chalk-hint"; root.append(el); }
    const names = this.chalkZones().map((z) => z.name).filter(Boolean);
    el.textContent = text ?? (names.length
      ? game.i18n.format("STAGECRAFT.Chalk.OnlyOn", { where: names.join(", ") })
      : game.i18n.localize("STAGECRAFT.Chalk.NotHere"));
    el.style.left = `${Math.round(p.x + 22)}px`;
    el.style.top = `${Math.round(p.y + 18)}px`;
    el.hidden = false;
  }

  /** A note by the pointer for a moment: a fill that found no shape, a colour picked. */
  flash(p, text) {
    this.#hint(p, text);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => { this.flashTimer = null; this.#hint(null); }, 1800);
  }

  #wallPoint(sample) {
    const at = this.host.backend.paintingAt(sample.x, sample.y);
    return at ? toWall(this.grid, at.x, at.y) : null;
  }

  /** The name of whoever painted what is under a point of the stage (stage px), or null: for the GM's "who painted that?". */
  painterAt(p) {
    const at = this.#wallPoint(p);
    const by = at ? this.wall.whoAt(at.x, at.y) : null;
    return by ? (game.users.get(by)?.name ?? by) : null;
  }

  /** Who has painted on this scene, with how much: [{ by, name, tiles }], the most first, for the GM's "wipe one". */
  painters() {
    return this.store.layers(this.sceneId)
      .map((l) => ({ by: l.by, name: game.users.get(l.by)?.name ?? l.by, tiles: Object.keys(l.tiles).length }))
      .filter((l) => l.tiles > 0)
      .sort((a, b) => b.tiles - a.tiles);
  }

  /**
   * The pointer went down with chalk in hand. `sample` is { x, y (window px), pressure, pointerType, t, shift, alt, flip }.
   * Alt picks a colour; Shift draws a straight line from where the last stroke ended; the fill fills at once; a pen turned
   * round (`flip`, its eraser end) rubs out. Returns true when the stage should keep the pointer.
   */
  begin(sample) {
    if (!this.tool || !this.usable || this.policy().locked || this.drawing) return false;
    const at = this.#wallPoint(sample);
    if (!at) return false;
    if (sample.alt) { this.pickColour(sample); return false; }
    const tool = sample.flip ? "eraser" : this.tool;
    const def = TOOLS[tool];
    if (def.kind === "fill") { this.#fill(at, sample); return false; }
    if (sample.shift && this.lastEnd) { this.#straight(this.lastEnd, at, tool); return false; }
    const id = newId();
    const seed = hashSeed(id);
    const size = this.sizes[tool];
    const opts = { tool, size, steady: STEADY[this.steady], seed };
    const everyone = def.kind === "erase" && game.user.isGM === true;
    const magic = def.magic ? { ...this.magic } : null;
    this.wall.begin({ id, by: game.user.id, tool, colour: this.colour, magic, everyone });
    this.drawing = { id, stroke: new Stroke(opts), feel: new Feel(), opts, everyone, unsent: [], timer: null, at };
    this.send({ type: "chalk", op: "begin", scene: this.sceneId, id, tool, colour: this.colour, magic, everyone, size, steady: opts.steady, seed });
    this.extend(sample);
    return true;
  }

  /** One more sample of the pointer while painting (every coalesced event, for the smoothest line). */
  extend(sample) {
    const d = this.drawing;
    if (!d) return;
    const at = this.#wallPoint(sample);
    if (!at) return;
    const p = d.feel.pressure({ x: at.x, y: at.y, t: sample.t ?? performance.now(), pressure: sample.pressure, pointerType: sample.pointerType });
    const s = { x: Math.round(at.x * 10) / 10, y: Math.round(at.y * 10) / 10, p: Math.round(p * 100) / 100 };
    d.at = at;
    this.wall.paint(d.id, d.stroke.add(s));
    d.unsent.push(s);
    d.timer ??= setTimeout(() => this.#sendLive(), SEND_EVERY);
  }

  #sendLive() {
    const d = this.drawing;
    if (!d) return;
    d.timer = null;
    if (!d.unsent.length) return;
    this.send({ type: "chalk", op: "more", scene: this.sceneId, id: d.id, s: d.unsent.flatMap((x) => [x.x, x.y, x.p]) });
    d.unsent = [];
  }

  /**
   * The pointer came up: the stroke becomes paint in this painter's layer at once, and is kept a moment later. Pictures of
   * the tiles it changed are taken now and made off the main thread (making them on it was a pause of a quarter to half a
   * second at the end of every stroke: chalk.md §11).
   */
  end() {
    const d = this.drawing;
    if (!d) return Promise.resolve();
    this.wall.paint(d.id, d.stroke.finish());
    clearTimeout(d.timer);
    this.#sendLive();
    this.drawing = null;
    this.lastEnd = d.at;
    const box = dabBounds(this.wall.strokes.get(d.id)?.dabs ?? []);
    return this.#keepStroke(this.#picturesOf(this.wall.commit(d.id)), d.id, box, d.opts.tool, { live: true });
  }

  /** Escape in the middle of a stroke: it is thrown away. */
  cancel() {
    const d = this.drawing;
    if (!d) return;
    clearTimeout(d.timer);
    this.drawing = null;
    this.send({ type: "chalk", op: "cancel", scene: this.sceneId, id: d.id });
    const keys = this.wall.strokes.get(d.id)?.touched ?? new Set();
    this.wall.drop(d.id);
    if (TOOLS[d.opts.tool].kind === "smudge") this.wall.revert(game.user.id, keys).catch(() => {});
  }

  /**
   * The pictures of the tiles a stroke changed, taken now, made in the background: [[painter, [[key, Promise<picture>]]]].
   * A painting stroke's tiles are sure to hold paint (`changed.painted`), so they are not read back to check.
   */
  #picturesOf(changed) {
    const sure = changed.painted === true;
    return [...changed].map(([by, tiles]) => [by, [...tiles].map(([key, canvas]) => [key, Promise.resolve(this.encode(canvas, sure))])]);
  }

  /**
   * Keep a stroke's pictures (`#picturesOf`), strictly after every stroke before it, so the strokes of a quick hand are kept
   * in the order they were made and each step knows what its tiles held before it. `live`: the others were watching it
   * being painted, and are told when it ends which layers to wait for.
   */
  #keepStroke(pictures, strokeId, box, tool, { live = false } = {}) {
    const run = this.keeping.then(async () => {
      const work = await this.#changesOf(pictures);
      // the others are told which layers to wait for before their live copy gives way to what is kept
      if (live) this.send({ type: "chalk", op: "end", scene: this.sceneId, id: strokeId, layers: work.map(([by]) => by) });
      await this.#keepChanges(work, strokeId, box, tool);
    });
    this.keeping = run.catch((err) => console.warn(`${NS} | chalk could not be kept`, err));
    return run;
  }

  /**
   * What a stroke really changed, as pictures to keep: [[painter, { key: picture }, { key: what it held }]]. Only tiles
   * whose picture changed: a stroke that left nothing (painted outside the chalk zones, or a rub where there was no paint)
   * keeps nothing, and makes no page and no step (found live 2026-10-03).
   */
  async #changesOf(pictures) {
    const work = [];
    for (const [by, tiles] of pictures) {
      const made = await Promise.all(tiles.map(async ([key, picture]) => [key, await picture]));
      const kept = {};
      const before = {};
      for (const [key, picture] of made) {
        const was = this.wall.sourceOf(by, key);
        if (picture === was) continue;
        before[key] = was;
        kept[key] = picture;
      }
      if (Object.keys(kept).length) work.push([by, kept, before]);
    }
    return work;
  }

  /**
   * Keep what a stroke changed (`#changesOf`): each painter's tiles, with the step that takes them back. `box` is where the
   * stroke lay, in wall pixels, for the `stagecraft.chalk` hook ("Taka squints at the doodle").
   */
  async #keepChanges(work, strokeId, box = null, tool = this.tool) {
    if (!work.length) return;
    const now = Date.now();
    const step = { id: stepId(now, strokeId), at: now };
    this.redoSteps = [];
    for (const [by, pictures, before] of work) {
      for (const [key, picture] of Object.entries(pictures)) this.wall.noteSource(by, key, picture);
      try {
        await this.store.save(this.sceneId, { by, tiles: pictures, step, grid: this.grid });
      } catch (err) {
        console.warn(`${NS} | chalk could not be kept`, err);
        for (const [key, source] of Object.entries(before)) this.wall.noteSource(by, key, source);
        await this.wall.revert(by, Object.keys(before));
      }
    }
    const g = this.grid;
    const bounds = box ? { x0: Math.max(0, box.x0 / g.w), y0: Math.max(0, box.y0 / g.h), x1: Math.min(1, box.x1 / g.w), y1: Math.min(1, box.y1 / g.h) } : null;
    Hooks.callAll("stagecraft.chalk", { type: "chalk", scene: this.sceneId, by: game.user.id, tool, colour: this.colour, bounds });
  }

  /** A straight line from `from` to `to` (wall px), in one go: Shift-click from where the last stroke ended. */
  #straight(from, to, tool = this.tool) {
    const def = TOOLS[tool];
    if (def.kind === "smudge") return null;
    const id = newId();
    const opts = { tool, size: this.sizes[tool], seed: hashSeed(id) };
    const dabs = lineDabs({ ...from, p: 0.8 }, { ...to, p: 0.8 }, opts);
    this.wall.begin({ id, by: game.user.id, tool, colour: this.colour, magic: def.magic ? { ...this.magic } : null, everyone: def.kind === "erase" && game.user.isGM === true });
    this.wall.paint(id, dabs);
    this.lastEnd = to;
    const box = dabBounds(dabs);
    this.#keepStroke(this.#picturesOf(this.wall.commit(id)), id, box, tool).catch(() => {});
    return box;
  }

  #fill(at, sample) {
    const r = this.wall.fill({ x: at.x, y: at.y, by: game.user.id, colour: this.colour });
    if (!r.ok) {
      this.flash(sample, game.i18n.localize(r.reason === "open" ? "STAGECRAFT.Chalk.FillOpen" : "STAGECRAFT.Chalk.FillOnPaint"));
      return;
    }
    this.#keepStroke(this.#picturesOf(new Map([[game.user.id, r.changed]])), newId(), { x0: at.x - 1, y0: at.y - 1, x1: at.x + 1, y1: at.y + 1 }).catch(() => {});
  }

  /** Take the colour under the pointer: from the chalk on the wall, or, where there is none, from the painting. */
  pickColour(sample) {
    const at = this.host.backend.paintingAt(sample.x, sample.y);
    if (!at) return null;
    const w = toWall(this.grid, at.x, at.y);
    const hex = this.wall.pick(w.x, w.y) ?? this.host.backend.paintingColour?.(at.x, at.y) ?? null;
    if (hex) { this.setColour(hex); this.flash(sample, game.i18n.format("STAGECRAFT.Chalk.Picked", { colour: hex })); }
    return hex;
  }

  /* ---------------------------------------------------------------- taking back */

  /** Take back this painter's own newest stroke (Ctrl+Z), wherever it went (a GM's rubbing out went on others' layers). */
  async undo() {
    if (this.drawing) this.cancel();
    await this.keeping;                                     // a stroke still being kept is the newest: it is what goes
    const done = await this.store.undo(this.sceneId, { by: game.user.id });
    if (!done) return false;
    this.redoSteps.push(done.layers);
    return true;
  }

  /** Put back what the last undo took away (Ctrl+Shift+Z or Ctrl+Y). */
  async redo() {
    await this.keeping;
    const layers = this.redoSteps.pop();
    if (!layers) return false;
    const now = Date.now();
    const step = { id: stepId(now, newId()), at: now };
    for (const [by, tiles] of Object.entries(layers)) await this.store.save(this.sceneId, { by, tiles, step, grid: this.grid });
    return true;
  }

  /* ---------------------------------------------------------------- other painters, live */

  /** A message about someone else's stroke, from the stage's channel. */
  receive(message, from) {
    if (!message || message.scene !== this.sceneId || from === game.user.id) return;
    if (message.op === "begin") {
      if (!TOOLS[message.tool] || TOOLS[message.tool].kind === "smudge" || TOOLS[message.tool].kind === "fill") return;
      if (this.remote.has(message.id) || typeof message.id !== "string") return;
      const by = from;                                     // a live stroke is always on its sender's own layer
      // a GM's eraser may rub out everyone's; anyone else's only their own
      const everyone = message.everyone === true && game.users?.get(from)?.isGM === true;
      this.wall.begin({ id: message.id, by, tool: message.tool, colour: cleanHex(message.colour) ?? PALETTE.white, magic: message.magic ?? null, everyone, live: true });
      const stroke = new Stroke({ tool: message.tool, size: Number(message.size) || undefined, steady: Number(message.steady) || 0, seed: Number(message.seed) >>> 0 });
      this.remote.set(message.id, { by, stroke, ended: false, layers: [], timer: setTimeout(() => this.#dropRemote(message.id), 60000) });
    } else if (message.op === "more") {
      const r = this.remote.get(message.id);
      if (!r || r.ended || !Array.isArray(message.s)) return;
      const dabs = [];
      for (let i = 0; i + 2 < message.s.length; i += 3) dabs.push(...r.stroke.add({ x: Number(message.s[i]), y: Number(message.s[i + 1]), p: Number(message.s[i + 2]) }));
      this.wall.paint(message.id, dabs);
    } else if (message.op === "end") {
      const r = this.remote.get(message.id);
      if (!r || r.ended) return;
      this.wall.paint(message.id, r.stroke.finish());
      r.ended = true;
      r.layers = (Array.isArray(message.layers) ? message.layers : [r.by]).filter((by) => typeof by === "string");
      clearTimeout(r.timer);
      // the live copy goes when their kept paint is on this wall (perhaps already), or after a while if it never comes
      r.timer = setTimeout(() => this.#dropRemote(message.id), LIVE_TIMEOUT);
      this.#settle();
    } else if (message.op === "cancel") {
      this.#dropRemote(message.id);
    }
  }

  #dropRemote(id) {
    const r = this.remote.get(id);
    if (!r) return;
    clearTimeout(r.timer);
    this.remote.delete(id);
    this.wall.drop(id);
  }

  /** May chalk be used at this point of the painting? */
  allowedAt(at) {
    return allowedAt(this.policy(), this.host.description.zones, at.x, at.y);
  }
}
