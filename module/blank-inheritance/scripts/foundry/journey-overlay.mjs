/**
 * The journeys drawn on the Campaign Map, and played (design/location-editor.md section 16).
 *
 * This is what the Location Editor's Journeys tab shows on the canvas: every route of an episode as a line by the way it is travelled (dotted on foot, solid by
 * road, heavier by rail), a glow under any that has a problem, numbered stops where the scenes are, a highlighted journey with arrows, and -- on Play -- a token
 * that moves exactly as the game's token will (core/journey-timeline.mjs: the game's own hops, at the game's own pace), leaving the line it has covered bright
 * behind it. It also draws the route a pin dropped under the cursor would give.
 *
 * It draws; it decides nothing. The journeys and their timeline are handed in (foundry/journey-data.mjs, core/journey-timeline.mjs), and the layer lends it a
 * container, the zoom and the camera (`host`). Everything is declared in screen pixels and converted with `host.px`, like every other drawing of the editor, and
 * redrawn when the zoom changes. Playback is driven by the canvas's own ticker, never by re-rendering the panel: the panel hears of progress through `onTick`
 * (at most every TICK_MS) and updates its scrubber in place.
 */

import { arrowsAlong, boundsOf, dashPolyline, PROBLEM_COLORS, styleForMode, unionBox } from "../core/journey-draw.mjs";
import { SPEEDS, timelineAt, travelledPoints } from "../core/journey-timeline.mjs";

const TICK_MS = 66;                    // how often the panel hears of progress while playing
const FRAME_DURATION_MS = 700;         // the camera's move to a new step
const ARROW_SPACING_PX = 90;           // screen pixels between direction arrows
const STOP_RADIUS_PX = 11;
const TOKEN_RADIUS_PX = 12;
const FAINT = 0.42;                    // a journey not being looked at
const CHOICE_FAINTER = 0.55;           // the journeys the players choose between are drawn lighter than the main road
const LABEL_ZOOM = 0.45;               // zoomed in at least this far, every stop is named; further out, only the ends of what is being looked at
const GLOW_ALPHA = 0.55;

const flatten = (points) => points.flatMap((p) => [p.x, p.y]);

/** Destroy a display object once, tolerating one that is already gone (PIXI throws on a second destroy). */
function dispose(object) {
  if (!object || object.destroyed) return;
  object.parent?.removeChild?.(object);
  object.destroy();
}

export class JourneyOverlay {
  #host;
  #container = null;
  #layers = null;                       // { preview, routes, focus, trail, stops, tokens } Graphics, made once per container
  #texts = [];                          // Text objects of the last draw, destroyed with it
  #legs = new Map();                    // id -> { id, kind, label, runs: [{ mode, points }], worst, from, to }
  #stops = [];                          // [{ n, point, title }]
  #highlight = new Set();               // leg ids drawn bold with arrows
  #showAll = true;                      // whether the legs that are not highlighted are drawn at all
  #labels = true;                       // label the stops
  #preview = null;                      // { point, legs: [{ runs, worst }] } or null
  #player = null;                       // { timeline, t, playing, speed, follow, onTick, onEnd, lastTickAt, framedStep }
  #tick = (delta) => this.#onTicker(delta);

  /**
   * `host`: `px(screenPixels)` and `scale()` for sizes that stay the same on screen, `toScene(imagePoint)` for the calibration (null before it is known),
   * `frame(box, { duration })` to move the camera to a box in scene pixels, `ticker` (`add(fn)` / `remove(fn)`; fn gets the elapsed ms) for animation, and
   * optionally `now()` (ms) for the progress throttle.
   */
  constructor(host) {
    this.#host = host;
  }

  /** Give the overlay the container to draw in (the layer builds a fresh one every time the scene is drawn). */
  attach(container) {
    this.#teardownDrawing();
    this.#container = container;
    if (container) {
      const make = () => container.addChild(new PIXI.Graphics());
      this.#layers = { preview: make(), routes: make(), focus: make(), trail: make(), stops: make(), tokens: make() };
    }
    this.redraw();
  }

  /** The container is going (the scene is being torn down): stop playing and forget it, without touching it again. */
  detach() {
    this.#stopTicker();
    this.#player = null;
    this.#texts = [];
    this.#layers = null;
    this.#container = null;
  }

  /** Show or hide the whole overlay (it follows the editor being the active layer). */
  setVisible(visible) {
    if (this.#container && !this.#container.destroyed) this.#container.visible = Boolean(visible);
    if (!visible) this.pause();
  }

  /* ---------------------------------------------------------------- what is drawn */

  /**
   * `legs`: `[{ id, kind, label, runs: [{ mode, points }] (map-image px), worst: "error" | "warn" | "info" | null, ends: [fromSlotKey, toSlotKey] }]`;
   * `stops`: `[{ n, point, title, slotKey }]`.
   */
  setJourneys({ legs = [], stops = [] } = {}) {
    this.#legs = new Map(legs.map((leg) => [leg.id, leg]));
    this.#stops = stops;
    for (const id of [...this.#highlight]) if (!this.#legs.has(id)) this.#highlight.delete(id);
    this.redraw();
  }

  /** Which journeys are drawn bold with arrows (ids), and whether the rest are drawn faintly or not at all. */
  setHighlight(ids, { showAll = this.#showAll } = {}) {
    this.#highlight = new Set(ids ?? []);
    this.#showAll = showAll;
    this.redraw();
  }

  setStopLabels(on) {
    this.#labels = Boolean(on);
    this.redraw();
  }

  /** Nothing drawn, nothing playing. */
  clear() {
    this.stop();
    this.#legs = new Map();
    this.#stops = [];
    this.#highlight = new Set();
    this.#preview = null;
    this.redraw();
  }

  /** The box round some journeys in scene pixels, or null: where the camera should go to show them. */
  boxOf(ids) {
    let box = null;
    for (const id of ids ?? []) {
      const leg = this.#legs.get(id);
      if (!leg) continue;
      for (const run of leg.runs) box = unionBox(box, boundsOf(this.#toScene(run.points)));
    }
    return box;
  }

  /** Move the camera to show some journeys. Returns false when there is nothing to show. */
  frameLegs(ids) {
    const box = this.boxOf(ids);
    if (!box) return false;
    this.#host.frame(box, { duration: FRAME_DURATION_MS });
    return true;
  }

  /** Move the camera to show a point and what is round it (map-image px); `radius` is how much ground to show either side, in the same pixels. */
  framePoint(point, radius = 350) {
    const at = this.#host.toScene(point);
    if (!at) return false;
    const r = radius * (this.#host.toScene({ x: 1, y: 0 })?.x - this.#host.toScene({ x: 0, y: 0 })?.x || 1);
    this.#host.frame({ x0: at.x - r, y0: at.y - r, x1: at.x + r, y1: at.y + r }, { duration: FRAME_DURATION_MS });
    return true;
  }

  /** The route a pin under the cursor would give: `{ point (map-image px), legs: [{ runs, worst }] }`, or null to clear it. */
  setPreview(preview) {
    this.#preview = preview ?? null;
    this.#drawPreview();
  }

  /* ---------------------------------------------------------------- playing */

  /**
   * Start playing a timeline (core/journey-timeline.mjs#buildTimeline). `follow` is "frame" (the camera moves to each step's journeys as it begins) or "stay".
   * `onTick(info)` hears `{ t, total, stepIndex, phase, finished, step }` as it plays; `onEnd()` when it reaches the end.
   */
  play(timeline, { startAt = 0, speed = 1, follow = "frame", onTick = null, onEnd = null } = {}) {
    this.stop();
    if (!timeline?.steps?.length) return false;
    this.#player = { timeline, t: Math.min(Math.max(0, startAt), timeline.totalMs), playing: true, speed, follow, onTick, onEnd, lastTickAt: -Infinity, framedStep: -1 };
    this.#host.ticker.add(this.#tick);
    this.#advance(0, { force: true });
    return true;
  }

  pause() {
    const p = this.#player;
    if (!p || !p.playing) return;
    p.playing = false;
    this.#stopTicker();
    this.#notify({ force: true });
  }

  resume() {
    const p = this.#player;
    if (!p || p.playing) return;
    if (p.t >= p.timeline.totalMs) p.t = 0;           // played to the end: Play starts again
    p.playing = true;
    p.framedStep = -1;
    this.#host.ticker.add(this.#tick);
    this.#notify({ force: true });
  }

  toggle() {
    if (this.#player?.playing) this.pause();
    else this.resume();
  }

  /** Jump to a time (ms into the timeline), whether playing or paused. */
  seek(t) {
    const p = this.#player;
    if (!p) return;
    p.t = Math.min(Math.max(0, t), p.timeline.totalMs);
    this.#advance(0, { force: true });
  }

  setSpeed(speed) {
    if (this.#player && SPEEDS.includes(speed)) this.#player.speed = speed;
  }

  setFollow(follow) {
    if (this.#player) { this.#player.follow = follow === "stay" ? "stay" : "frame"; this.#player.framedStep = -1; }
  }

  /** Stop and take the token and its trail off the map. */
  stop() {
    this.#stopTicker();
    const had = Boolean(this.#player);
    this.#player = null;
    if (had) this.#drawPlayback(null);
  }

  get state() {
    const p = this.#player;
    if (!p) return { active: false, playing: false, t: 0, total: 0, stepIndex: -1, speed: 1, follow: "frame" };
    const at = timelineAt(p.timeline, p.t);
    return { active: true, playing: p.playing, t: p.t, total: p.timeline.totalMs, stepIndex: at?.stepIndex ?? -1, speed: p.speed, follow: p.follow };
  }

  /* ---------------------------------------------------------------- drawing */

  /** Draw everything again at the current zoom (the editor calls this when the zoom has settled). */
  redraw() {
    this.#drawJourneys();
    this.#drawPreview();
    this.#drawPlayback(this.#player ? timelineAt(this.#player.timeline, this.#player.t) : null);
  }

  #alive() {
    return Boolean(this.#container && !this.#container.destroyed && this.#layers);
  }

  #toScene(points) {
    const out = [];
    for (const p of points) {
      const s = this.#host.toScene(p);
      if (s) out.push(s);
    }
    return out;
  }

  #teardownDrawing() {
    for (const text of this.#texts) dispose(text);
    this.#texts = [];
    if (this.#layers && this.#container && !this.#container.destroyed) for (const g of Object.values(this.#layers)) dispose(g);
    this.#layers = null;
  }

  #text(label, { x, y, size = 13, fill = 0xffffff, stroke = 0x10161c, anchor = [0.5, 0.5], parent = null }) {
    const text = new PIXI.Text(label, { fontFamily: "Signika, sans-serif", fontSize: size, fontWeight: "700", fill, stroke, strokeThickness: 4, lineJoin: "round" });
    text.resolution = globalThis.canvas?.app?.renderer?.resolution ?? 1;
    text.scale.set(1 / this.#host.scale());
    text.anchor.set(anchor[0], anchor[1]);
    text.position.set(x, y);
    (parent ?? this.#container).addChild(text);
    this.#texts.push(text);
    return text;
  }

  #clearTexts() {
    for (const text of this.#texts) dispose(text);
    this.#texts = [];
  }

  /** One polyline of a route in its way of moving: dotted for walking, solid otherwise. */
  #stroke(g, points, mode, { alpha = 1, extra = 0, color = null } = {}) {
    if (points.length < 2) return;
    const style = styleForMode(mode);
    g.lineStyle(this.#host.px(style.weight + extra), color ?? style.color, alpha);
    if (style.dash && color === null) {
      for (const [a, b] of dashPolyline(points, this.#host.px(style.dash[0]), this.#host.px(style.dash[1]))) {
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
      return;
    }
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  }

  #drawJourneys() {
    if (!this.#alive()) return;
    const { routes, focus, stops } = this.#layers;
    routes.clear();
    focus.clear();
    stops.clear();
    // texts of the journeys and the stops are redrawn with them; the playback and preview have none of their own
    this.#clearTexts();
    const highlight = this.#highlight;
    const drawLeg = (g, leg, alpha, bold) => {
      const runs = leg.runs.map((run) => ({ mode: run.mode, points: this.#toScene(run.points) }));
      const glow = leg.worst === "error" || leg.worst === "warn";
      if (glow) for (const run of runs) this.#stroke(g, run.points, "car", { alpha: GLOW_ALPHA * alpha, extra: bold ? 6 : 4, color: PROBLEM_COLORS[leg.worst] });
      for (const run of runs) this.#stroke(g, run.points, run.mode, { alpha, extra: bold ? 1.5 : 0 });
      return runs;
    };
    if (this.#showAll) {
      const base = highlight.size ? FAINT * 0.6 : 0.8;
      for (const leg of this.#legs.values()) if (!highlight.has(leg.id)) drawLeg(routes, leg, leg.kind === "cut" ? base : base * CHOICE_FAINTER, false);
    }
    for (const id of highlight) {
      const leg = this.#legs.get(id);
      if (!leg) continue;
      const runs = drawLeg(focus, leg, 1, true);
      // arrows along the whole journey, in white, so which way it goes is never a guess
      const all = runs.flatMap((r) => r.points);
      focus.lineStyle(this.#host.px(2.2), 0xffffff, 0.95);
      const size = this.#host.px(5);
      for (const a of arrowsAlong(all, this.#host.px(ARROW_SPACING_PX))) {
        const dx = Math.cos(a.angle);
        const dy = Math.sin(a.angle);
        focus.moveTo(a.x - dx * size - dy * size * 0.85, a.y - dy * size + dx * size * 0.85);
        focus.lineTo(a.x + dx * size, a.y + dy * size);
        focus.lineTo(a.x - dx * size + dy * size * 0.85, a.y - dy * size - dx * size * 0.85);
      }
    }
    // the stops: a numbered disc where each scene is, named where it is looked at (or everywhere once zoomed in far enough to read them)
    const looked = new Set();
    for (const id of highlight) for (const key of this.#legs.get(id)?.ends ?? []) looked.add(key);
    const zoomedIn = this.#host.scale() >= LABEL_ZOOM;
    for (const stop of this.#stops) {
      const at = this.#host.toScene(stop.point);
      if (!at) continue;
      stops.lineStyle(this.#host.px(2), 0xffffff, 1);
      stops.beginFill(0x1b2530, 0.94);
      stops.drawCircle(at.x, at.y, this.#host.px(STOP_RADIUS_PX));
      stops.endFill();
      this.#text(String(stop.n), { x: at.x, y: at.y, size: 12 });
      if (this.#labels && stop.title && (zoomedIn || looked.has(stop.slotKey))) this.#text(stop.title, { x: at.x, y: at.y - this.#host.px(STOP_RADIUS_PX + 4), size: 12, anchor: [0.5, 1] });
    }
  }

  #drawPreview() {
    if (!this.#alive()) return;
    const g = this.#layers.preview;
    g.clear();
    const preview = this.#preview;
    if (!preview) return;
    for (const leg of preview.legs) {
      const worst = leg.worst;
      for (const run of leg.runs) {
        const points = this.#toScene(run.points);
        if (worst === "error" || worst === "warn") this.#stroke(g, points, "car", { alpha: GLOW_ALPHA, extra: 5, color: PROBLEM_COLORS[worst] });
        this.#stroke(g, points, run.mode, { alpha: 0.95, extra: 0.5 });
      }
    }
    const at = this.#host.toScene(preview.point);
    if (!at) return;
    const r = this.#host.px(9);
    g.lineStyle(this.#host.px(3), 0xffffff, 1);
    g.beginFill(0xd1402a, 0.95);
    g.drawCircle(at.x, at.y, r);
    g.endFill();
    g.lineStyle(this.#host.px(2), 0xffffff, 0.9);
    g.moveTo(at.x - r * 2, at.y);
    g.lineTo(at.x - r * 1.2, at.y);
    g.moveTo(at.x + r * 1.2, at.y);
    g.lineTo(at.x + r * 2, at.y);
    g.moveTo(at.x, at.y - r * 2);
    g.lineTo(at.x, at.y - r * 1.2);
    g.moveTo(at.x, at.y + r * 1.2);
    g.lineTo(at.x, at.y + r * 2);
  }

  /** The tokens and the part of each route already covered, for a timeline state (or nothing). */
  #drawPlayback(state) {
    if (!this.#alive()) return;
    const { trail, tokens } = this.#layers;
    trail.clear();
    tokens.clear();
    if (!state || !this.#player) return;
    const step = this.#player.timeline.steps[state.stepIndex];
    for (const token of state.tokens) {
      const leg = step.legs.find((l) => l.legId === token.legId);
      if (!leg) continue;
      // the ground covered so far, bright, in the way it was covered
      this.#drawCovered(trail, leg.motion, token, this.#toScene(travelledPoints(leg.motion, token)));
      const at = this.#host.toScene({ x: token.x, y: token.y });
      if (!at) continue;
      const style = styleForMode(token.mode);
      tokens.lineStyle(this.#host.px(3.5), 0xffffff, 1);
      tokens.beginFill(style.color, 1);
      tokens.drawCircle(at.x, at.y, this.#host.px(TOKEN_RADIUS_PX));
      tokens.endFill();
      if (token.done) {
        tokens.lineStyle(this.#host.px(2), style.color, 0.9);
        tokens.drawCircle(at.x, at.y, this.#host.px(TOKEN_RADIUS_PX + 5));
      }
    }
  }

  /** The covered part of a route, drawn hop by hop in each hop's own way of moving. */
  #drawCovered(g, motion, token, coveredScene) {
    if (coveredScene.length < 2) return;
    // The covered polyline has one point per hop begun, the last at the token itself: its stretches are the hops, in order, each in its own colour.
    for (let h = 0; h <= token.hopIndex && h < motion.hops.length && h + 1 < coveredScene.length; h++) {
      const color = styleForMode(motion.hops[h].mode).color;
      this.#stroke(g, [coveredScene[h], coveredScene[h + 1]], motion.hops[h].mode, { alpha: 1, extra: 2, color });
    }
  }

  /* ---------------------------------------------------------------- the clock */

  #onTicker(deltaMs) {
    const p = this.#player;
    if (!p || !p.playing) return;
    this.#advance(deltaMs * p.speed);
  }

  #advance(ms, { force = false } = {}) {
    const p = this.#player;
    if (!p) return;
    p.t = Math.min(p.timeline.totalMs, p.t + ms);
    const state = timelineAt(p.timeline, p.t);
    this.#drawPlayback(state);
    if (state && p.follow === "frame" && state.stepIndex !== p.framedStep) {
      p.framedStep = state.stepIndex;
      this.frameLegs(p.timeline.steps[state.stepIndex].legs.map((l) => l.legId));
    }
    if (p.t >= p.timeline.totalMs && p.playing) {
      p.playing = false;
      this.#stopTicker();
      this.#notify({ force: true });
      p.onEnd?.();
      return;
    }
    this.#notify({ force });
  }

  #notify({ force = false } = {}) {
    const p = this.#player;
    if (!p?.onTick) return;
    const now = this.#host.now?.() ?? globalThis.performance?.now?.() ?? Date.now();
    if (!force && now - p.lastTickAt < TICK_MS) return;
    p.lastTickAt = now;
    const at = timelineAt(p.timeline, p.t);
    p.onTick({ t: p.t, total: p.timeline.totalMs, stepIndex: at?.stepIndex ?? -1, phase: at?.phase ?? "dwell", finished: p.t >= p.timeline.totalMs, step: at ? p.timeline.steps[at.stepIndex] : null, playing: p.playing });
  }

  #stopTicker() {
    this.#host.ticker.remove(this.#tick);
  }
}
