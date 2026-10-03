// Tier 4 -- the Location Editor's draw layer, EXECUTED (not read as source) against a small stand-in for
// the Foundry/PIXI surface it touches. design/location-editor.md §10 phase 7.
//
// Why this exists: the first version of the editor "passed" every test and was completely unusable the
// first time the GM tried it in a real browser. Its tests called handlers directly, one at a time, and so
// never replayed what Foundry's MouseInteractionManager actually does to a layer on a left-drag:
//
//     dragLeftStart -> dragLeftMove* -> dragLeftDrop -> dragLeftCancel      (the cancel ALWAYS follows a drop)
//
// The layer destroyed its preview Graphics in the drop AND again in the cancel; PIXI's second destroy
// throws, inside the manager's own cancel(), which skips the manager's state reset -- and every later pan
// and click on the canvas was dead until reload. The PIXI stand-in below throws on a second destroy for
// exactly that reason, and the sequences below are the ones Foundry runs.
//
// What this is NOT: a model of Foundry. Every behaviour of the stand-ins was read out of the real source
// (client/canvas/interaction/mouse-handler.mjs, client/canvas/board.mjs, client/canvas/layers/base/
// interaction-layer.mjs, client/applications/ui/scene-controls.mjs) and the live behaviour is checked in
// a real browser by the GM workflow in design/location-editor.md; this only keeps the sequences from
// regressing.

import { afterEach, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lang = JSON.parse(readFileSync(path.join(repoRoot, "module", "blank-inheritance", "lang", "en.json"), "utf8"));
const hubDocs = {
  // two real-shaped location documents on a 5000px-wide master image; the hub scene is 10000px wide, so scale 2
  district: { id: "district", name: "The District", tier: "region", kind: "district", rank: 3, depth: "named", authoring: { status: "drafted" }, derived: { imagePx: [[[100, 100], [900, 100], [900, 900], [100, 900]]], centroidPx: [500, 500] } },
  hall: { id: "hall", name: "Town Hall", tier: "site", kind: "civic", rank: 2, depth: "named", authoring: { status: "drafted" }, derived: { imagePx: [[[400, 400], [500, 400], [500, 500], [400, 500]]], centroidPx: [450, 450] } },
  drain: { id: "drain", name: "The Drain", tier: "point", kind: "", rank: 1, depth: "named", authoring: { status: "drafted" }, derived: { imagePx: null, centroidPx: [2000, 2000] } }
};

/* ------------------------------------------------------------------ */
/*  Fake timers (node:test's mock.timers needs Node 20; this repo is on 18) */
/* ------------------------------------------------------------------ */

const clock = { now: 0, next: 1, queue: [], real: null };
const fakeTimers = {
  enable() {
    clock.now = 0;
    clock.queue = [];
    clock.real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
    globalThis.setTimeout = (fn, ms = 0) => { const id = clock.next++; clock.queue.push({ id, at: clock.now + ms, fn }); return id; };
    globalThis.clearTimeout = (id) => { clock.queue = clock.queue.filter((t) => t.id !== id); };
  },
  reset() {
    if (!clock.real) return;
    globalThis.setTimeout = clock.real.setTimeout;
    globalThis.clearTimeout = clock.real.clearTimeout;
    clock.real = null;
  },
  tick(ms) {
    const until = clock.now + ms;
    for (;;) {
      const due = clock.queue.filter((t) => t.at <= until).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      clock.queue = clock.queue.filter((t) => t !== due);
      clock.now = Math.max(clock.now, due.at);
      due.fn();
    }
    clock.now = until;
  }
};

/* ------------------------------------------------------------------ */
/*  A minimal PIXI                                                      */
/* ------------------------------------------------------------------ */

const live = { graphics: 0 };

class DisplayObject {
  constructor() {
    this.children = [];
    this.parent = null;
    this.destroyed = false;
    this.visible = true;
    this.alpha = 1;
    this.position = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } };
    this.scale = { x: 1, y: 1, set(x, y = x) { this.x = x; this.y = y; } };
    this.anchor = { set() {} };
    this.handlers = new Map();
  }
  addChild(child) { child.parent = this; this.children.push(child); return child; }
  removeChild(child) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); child.parent = null; return child; }
  removeChildren() { const out = this.children; this.children = []; for (const c of out) c.parent = null; return out; }
  on(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); return this; }
  off(type, fn) { this.handlers.set(type, (this.handlers.get(type) ?? []).filter((f) => f !== fn)); return this; }
  destroy() {
    // Real PIXI: SmoothGraphics#destroy reads this._geometry.refCount, null after the first destroy.
    if (this.destroyed) throw new TypeError("Cannot read properties of null (reading 'refCount')");
    this.destroyed = true;
    live.graphics -= 1;
  }
}
class Container extends DisplayObject {}
class Graphics extends DisplayObject {
  constructor() {
    super();
    live.graphics += 1;
    this.lines = [];
    this.polygons = [];
    this.circles = [];
    this.holes = 0;
  }
  clear() { this.lines = []; this.polygons = []; this.circles = []; return this; }
  lineStyle(width, color, alpha) { this.lines.push({ width, color, alpha }); return this; }
  beginFill() { return this; }
  endFill() { return this; }
  beginHole() { this.holes += 1; return this; }
  endHole() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  closePath() { return this; }
  drawPolygon(points) { this.polygons.push(points); return this; }
  drawCircle(x, y, r) { this.circles.push({ x, y, r }); return this; }
}
class Text extends DisplayObject {
  constructor(text, style) { super(); this.text = text; this.style = style; }
}
class Circle { constructor(x, y, r) { Object.assign(this, { x, y, r }); } }

/* ------------------------------------------------------------------ */
/*  A minimal Foundry                                                   */
/* ------------------------------------------------------------------ */

const saved = {};
let layer = null;
let LocationDrawLayer = null;
let panCalls = [];
let animated = [];
let moveHandlers = [];
let uploads = [];
let hooksSeen = [];
let controlsActivated = [];

class InteractionLayer extends Container {
  #active = false;
  static get layerOptions() { return {}; }
  get active() { return this.#active; }
  activate() {
    this.#active = true;
    this.activation = this._activate();
    return this;
  }
  deactivate() {
    if (!this.#active) return this;
    this.#active = false;
    this._deactivate();
    return this;
  }
  async _draw() {}
  async _tearDown() { for (const c of this.removeChildren()) if (!c.destroyed) c.destroy(); }
  _activate() {}
  _deactivate() {}
}

function installFoundry({ scale = 0.1 } = {}) {
  for (const key of ["foundry", "game", "canvas", "ui", "Hooks", "PIXI", "CONFIG", "requestAnimationFrame", "fetch", "File"]) saved[key] = globalThis[key];
  panCalls = [];
  animated = [];
  moveHandlers = [];
  uploads = [];
  hooksSeen = [];
  controlsActivated = [];
  const classes = new Set();
  const hub = {
    id: "hub",
    width: 10000,
    tiles: { contents: [] },
    getFlag: (scope, key) => (key === "sourceId" ? "the-city" : undefined)
  };
  globalThis.PIXI = { Container, Graphics, Text, Circle };
  globalThis.File = class { constructor(parts, name, opts) { this.parts = parts; this.name = name; this.opts = opts; } };
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.CONFIG = { Canvas: { layers: {} } };
  globalThis.Hooks = { on: (name, fn) => { hooksSeen.push(name); return fn; }, callAll() {} };
  globalThis.ui = { controls: { activate: async (options) => { controlsActivated.push(options); } } };
  globalThis.foundry = {
    canvas: { layers: { InteractionLayer } },
    utils: { getRoute: (p) => `/${p}` },
    applications: {
      apps: {
        FilePicker: {
          implementation: {
            browse: async (_source, target) => ({ files: Object.keys(hubDocs).map((id) => `${target}/${id}.json`) }),
            uploadPersistent: async (_module, dir, file) => { uploads.push({ dir, name: file.name, body: JSON.parse(file.parts[0]) }); return { path: `${dir}/${file.name}` }; }
          }
        }
      }
    }
  };
  globalThis.game = {
    user: { isGM: true },
    i18n: { localize: (key) => key.split(".").reduce((n, p) => n?.[p], lang) ?? key, format: (key) => key },
    scenes: { find: (fn) => (fn(hub) ? hub : undefined), get: () => hub },
    keybindings: { register() {} }
  };
  globalThis.fetch = async (url) => {
    const u = String(url);
    const json = (body) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes("campaign-map.json")) return json({ image: { width: 5000 }, metresPerPixel: 1 });
    const hit = u.match(/locations\/([^/]+)\.json/);
    if (hit && hubDocs[hit[1]]) return json(hubDocs[hit[1]]);
    return { ok: false, status: 404, json: async () => ({}) };
  };
  globalThis.canvas = {
    scene: hub,
    stage: {
      scale: { x: scale, y: scale },
      pivot: { x: 5000, y: 5000 },
      listeners: new Map(),
      on(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); return this; },
      off(type, fn) { this.listeners.get(type)?.delete(fn); return this; },
      emit(type) { for (const fn of [...(this.listeners.get(type) ?? [])]) fn({ type }); }
    },
    app: { view: { classList: new Set(), addEventListener() {}, removeEventListener() {} }, renderer: { resolution: 1 }, screen: { width: 1280, height: 800 } },
    canvasCoordinatesFromClient: (p) => ({ x: (p.x - 640) / globalThis.canvas.stage.scale.x + globalThis.canvas.stage.pivot.x, y: (p.y - 400) / globalThis.canvas.stage.scale.y + globalThis.canvas.stage.pivot.y }),
    animatePan: (view) => { animated.push(view); return Promise.resolve(true); },
    mousePosition: { x: 0, y: 0 },
    pan: (view) => { panCalls.push(view); },
    registerMouseMoveHandler: (fn) => { moveHandlers.push(fn); },
    tokens: { activate() {} },
    locationDraw: null
  };
  globalThis.canvas.app.view.classList.add = function add(...names) { for (const n of names) Set.prototype.add.call(this, n); };
  globalThis.canvas.app.view.classList.remove = function remove(...names) { for (const n of names) this.delete(n); };
  void classes;
}

function uninstallFoundry() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
}

async function makeLayer(options) {
  installFoundry(options);
  ({ LocationDrawLayer } = await import(`../module/blank-inheritance/scripts/foundry/location-draw-layer.mjs?${Math.random()}`));
  layer = new LocationDrawLayer();
  globalThis.canvas.locationDraw = layer;
  await layer._draw({});
  return layer;
}

/* ------------------------------------------------------------------ */
/*  What Foundry hands a drag callback                                  */
/* ------------------------------------------------------------------ */

const point = (x, y) => ({ x, y });
/** The PIXI event + the manager's interactionData for one phase of a drag. */
function dragEvent({ origin, destination = origin, screenOrigin = point(0, 0), global = screenOrigin, shift = false, ctrl = false }) {
  return { shiftKey: shift, ctrlKey: ctrl, global, interactionData: { origin, destination, screenOrigin } };
}

/** A pick-tool click as Foundry delivers it: the press reports a click, the release is what picks. */
function clickPick(l, p, { shift = false } = {}) {
  l._onClickLeft({ interactionData: { origin: p }, shiftKey: shift });
  globalThis.canvas.stage.emit("pointerup");
}

/** Let the layer's own async work (its first activation, the existing-locations fetch) finish before the globals it uses are removed. */
async function drain() {
  await layer?.activation;
  for (let i = 0; i < 50 && layer?.publishedSummary.state === "loading"; i++) await new Promise((r) => setImmediate(r));
  fakeTimers.tick(1000);
  await new Promise((r) => setImmediate(r));
}

/** Replays the manager's transitions for a left-drag: start, moves, drop, then the cancel that always follows a drop. */
async function runDrag(l, { from, to, screenFrom = point(0, 0), screenTo = point(50, 50), shift = false, ctrl = false, moves = 3 }) {
  const events = [];
  const make = (dest, glob) => dragEvent({ origin: from, destination: dest, screenOrigin: screenFrom, global: glob, shift, ctrl });
  if (!l._canDragLeftStart(null, make(from, screenFrom))) return { refused: true };
  l._onDragLeftStart(make(from, screenFrom));
  for (let i = 1; i <= moves; i++) {
    const t = i / moves;
    const dest = point(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    const glob = point(screenFrom.x + (screenTo.x - screenFrom.x) * t, screenFrom.y + (screenTo.y - screenFrom.y) * t);
    l._onDragLeftMove(make(dest, glob));
    events.push(dest);
  }
  await l._onDragLeftDrop(make(to, screenTo));
  l._onDragLeftCancel(make(to, screenTo));
  return { refused: false, events };
}


describe("the draw layer under Foundry's real drag sequence", () => {
  beforeEach(async () => {
    fakeTimers.enable();
    await makeLayer();
  });
  afterEach(async () => {
    await drain();
    fakeTimers.reset();
    uninstallFoundry();
  });

  test("the sequence that wedged the canvas -- drag, drop, then the cancel that always follows -- no longer throws, for every drag tool", async () => {
    layer.activate();
    await layer.activation;
    const draftContainer = layer.children[3]; // published, shapes, reference, DRAFT, handles, overlay
    for (const tool of ["pick", "rect", "circle"]) {
      layer.setTool(tool);
      const result = await runDrag(layer, { from: point(1000, 1000), to: point(1400, 1300), shift: tool === "pick" });
      assert.equal(result.refused, false, `${tool} is a drag tool`);
      assert.equal(draftContainer.children.length, 0, `${tool}: the drag's preview is gone, destroyed exactly once (the stand-in throws on a second destroy)`);
    }
  });

  test("a cancel with no drag behind it, and a cancel twice, are both harmless", async () => {
    layer.activate();
    await layer.activation;
    layer.setTool("rect");
    assert.doesNotThrow(() => layer._onDragLeftCancel(dragEvent({ origin: point(0, 0) })));
    assert.doesNotThrow(() => layer._onDragLeftCancel(dragEvent({ origin: point(0, 0) })));
    layer._onDragLeftStart(dragEvent({ origin: point(10, 10) }));
    layer._onDragLeftMove(dragEvent({ origin: point(10, 10), destination: point(60, 60) }));
    assert.doesNotThrow(() => layer._onDragLeftCancel(dragEvent({ origin: point(10, 10) })));
    assert.doesNotThrow(() => layer._onDragLeftCancel(dragEvent({ origin: point(10, 10) })));
    assert.equal(layer.hasEscapableState(), false, "nothing left in flight");
  });

  test("a throw inside a drag callback is contained: Foundry's manager must never see it", async () => {
    layer.activate();
    await layer.activation;
    const failing = dragEvent({ origin: point(0, 0), screenOrigin: point(0, 0), global: point(5, 5) });
    layer.setTool("pick");
    layer._onDragLeftStart(failing);
    const original = globalThis.canvas.pan;
    globalThis.canvas.pan = () => { throw new Error("boom"); };
    const errors = mock.method(console, "error", () => {});
    try {
      assert.doesNotThrow(() => layer._onDragLeftMove(failing));
      assert.equal(errors.mock.callCount(), 1, "reported to the console instead");
    } finally {
      errors.mock.restore();
      globalThis.canvas.pan = original;
    }
    assert.doesNotThrow(() => layer._onDragLeftCancel(failing));
  });

  test("the pick tool pans: absolute from where the drag began, at the current zoom", async () => {
    layer.activate();
    await layer.activation;
    layer.setTool("pick");
    // zoom 0.1: a 50px screen drag right/down moves the map's pivot 500 scene px back left/up
    await runDrag(layer, { from: point(3000, 3000), to: point(3500, 3500), screenFrom: point(100, 100), screenTo: point(150, 150), moves: 5 });
    assert.equal(panCalls.length, 5);
    const last = panCalls.at(-1);
    assert.equal(last.x, 5000 - 500);
    assert.equal(last.y, 5000 - 500);
    assert.equal(panCalls[0].x, 5000 - 100, "each step is measured from the START, so a dropped or merged event cannot drift");
  });

  test("a pan drops nothing into the session and leaves no preview", async () => {
    layer.activate();
    await layer.activation;
    layer.setTool("pick");
    await runDrag(layer, { from: point(0, 0), to: point(100, 100), screenTo: point(10, 10) });
    assert.equal(Object.keys(layer.getSession().items).length, 0);
    assert.equal(uploads.length, 0, "no autosave for a pan");
  });

  test("the rect tool draws: a drag becomes one drafted item in the session, and is autosaved", async () => {
    layer.activate();
    await layer.activation;
    layer.setPendingTier("site");
    layer.setTool("rect");
    await runDrag(layer, { from: point(1000, 1000), to: point(1400, 1300) });
    const items = Object.values(layer.getSession().items);
    assert.equal(items.length, 1);
    assert.equal(items[0].tier, "site");
    assert.deepEqual(items[0].geometry.ringPx[0], [1000, 1000]);
    assert.equal(uploads.length, 1);
    assert.equal(layer.selectedIds.length, 1, "what was just drawn is selected");
  });

  test("a sliver is not a rectangle -- the threshold is screen pixels, so it holds at every zoom", async () => {
    layer.activate();
    await layer.activation;
    layer.setTool("rect");
    // 2 screen px at zoom 0.1 is 20 scene px: a click-sized drag still counts as no drag at all
    await runDrag(layer, { from: point(1000, 1000), to: point(1000.2, 1000.2) });
    assert.equal(Object.keys(layer.getSession().items).length, 0);
  });

  test("shift-drag with the pick tool boxes a selection; ctrl as well adds to it", async () => {
    layer.activate();
    await layer.activation;
    layer.setPendingTier("site");
    layer.setTool("rect");
    await runDrag(layer, { from: point(100, 100), to: point(200, 200) });
    await runDrag(layer, { from: point(1000, 1000), to: point(1100, 1100) });
    const [a, b] = Object.values(layer.getSession().items).map((i) => i.localId);
    layer.setTool("pick");
    layer.clearSelection();
    await runDrag(layer, { from: point(0, 0), to: point(300, 300), shift: true });
    assert.deepEqual(layer.selectedIds, [a]);
    await runDrag(layer, { from: point(900, 900), to: point(1200, 1200), shift: true, ctrl: true });
    assert.deepEqual([...layer.selectedIds].sort(), [a, b].sort());
  });

  test("a click-only tool refuses the drag up front, so the manager never enters one", () => {
    layer.activate();
    for (const tool of ["polygon", "lasso", "point", "bisect"]) {
      layer.setTool(tool);
      assert.equal(layer._canDragLeftStart(null, {}), false, tool);
    }
    for (const tool of ["pick", "rect", "circle"]) {
      layer.setTool(tool);
      assert.equal(layer._canDragLeftStart(null, {}), true, tool);
    }
  });
});

describe("the draw layer's dock, tools and escape behaviour", () => {
  beforeEach(async () => {
    fakeTimers.enable();
    await makeLayer();
  });
  afterEach(async () => {
    await drain();
    fakeTimers.reset();
    uninstallFoundry();
  });

  test("the dock group's tools are an object keyed by name, none of them one Foundry's canvas reserves", () => {
    const control = LocationDrawLayer.prepareSceneControls();
    assert.equal(Array.isArray(control.tools), false);
    assert.deepEqual(Object.keys(control.tools), ["pick", "lasso", "polygon", "rect", "circle", "point", "bisect"]);
    for (const [name, tool] of Object.entries(control.tools)) assert.equal(tool.name, name);
    assert.ok(control.activeTool in control.tools);
    assert.equal(control.name, "locationDraw");
    for (const reserved of ["select", "target"]) assert.ok(!(reserved in control.tools), reserved);
  });

  test("entering a dock tool sets the layer's tool; LEAVING one does not reset it to whatever the next group's tool is", () => {
    const control = LocationDrawLayer.prepareSceneControls();
    control.onToolChange(null, { name: "polygon" }, true);
    assert.equal(layer.tool, "polygon");
    control.onToolChange(null, { name: "select" }, false); // the first version reset the layer to the NEXT group's tool here
    assert.equal(layer.tool, "polygon");
    layer.setTool("select"); // nothing outside the layer's own vocabulary can become a tool
    assert.equal(layer.tool, "pick");
  });

  test("Escape: a half-clicked polygon is abandoned first; with nothing in flight it is not the layer's to take", async () => {
    layer.activate();
    await layer.activation;
    layer.setTool("polygon");
    assert.equal(layer.hasEscapableState(), false);
    assert.equal(layer._onDismissKey(), false);
    layer._onClickLeft({ interactionData: { origin: point(10, 10) }, shiftKey: false });
    layer._onClickLeft({ interactionData: { origin: point(300, 10) }, shiftKey: false });
    assert.equal(layer.hasEscapableState(), true);
    assert.equal(layer._onDismissKey(), true);
    assert.equal(layer.hasEscapableState(), false);
  });

  test("Escape with a selection and nothing in flight lets go of the selection; the Escape after that is not the layer's", async () => {
    layer.activate();
    await layer.activation;
    for (let i = 0; i < 50 && layer.publishedSummary.state !== "ok"; i++) await new Promise((r) => setImmediate(r));
    layer.setPendingTier("site");
    layer.setTool("pick");
    clickPick(layer, point(900, 900)); // opens the hall
    assert.equal(layer.selectedIds.length, 1);
    assert.equal(layer.hasEscapableState(), true, "a panel Escape must fall through to the layer while something is selected");
    assert.equal(layer._onDismissKey(), true);
    assert.equal(layer.selectedIds.length, 0);
    assert.equal(layer.hasEscapableState(), false, "now Escape may close the panel");
    assert.equal(layer._onDismissKey(), false);
  });

  test("a layer that is not the active one has nothing for Escape to take, selection or not", async () => {
    layer.activate();
    await layer.activation;
    layer.setTool("polygon");
    layer._onClickLeft({ interactionData: { origin: point(10, 10) }, shiftKey: false });
    assert.equal(layer.hasEscapableState(), true);
    layer.deactivate();
    assert.equal(layer.hasEscapableState(), false, "deactivating abandons the draft and the panel stays closable");
    assert.equal(layer._onDismissKey(), false);
  });

  test("every drawing container is invisible to PIXI hit-testing; only the handles container takes events", () => {
    // PIXI 7 hit-tests "auto" children of an interactive parent, and one hit stops the search beneath it: the
    // hover highlight above the handles swallowed every press on a handle inside the hovered building.
    const [published, shapes, reference, draft, handles, overlay] = layer.children;
    for (const container of [published, shapes, reference, draft, overlay]) {
      assert.equal(container.eventMode, "none");
      assert.equal(container.interactiveChildren, false);
    }
    assert.notEqual(handles.eventMode, "none");
    assert.notEqual(handles.interactiveChildren, false);
  });

  test("a polygon clicked out and finished lands in the session as a drafted item", async () => {
    layer.activate();
    await layer.activation;
    layer.setPendingTier("site");
    layer.setTool("polygon");
    for (const p of [point(100, 100), point(500, 100), point(500, 400)]) layer._onClickLeft({ interactionData: { origin: p }, shiftKey: true });
    assert.equal(layer.finishDraftKey(), true);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(Object.keys(layer.getSession().items).length, 1);
  });

  test("the cursor class follows the tool: crosshair to draw, a closed hand while panning, nothing for the pick tool at rest", async () => {
    layer.activate();
    await layer.activation;
    const classes = globalThis.canvas.app.view.classList;
    layer.setTool("polygon");
    assert.ok(classes.has("bi-loc-crosshair"));
    layer.setTool("pick");
    assert.ok(!classes.has("bi-loc-crosshair"));
    layer._onDragLeftStart(dragEvent({ origin: point(0, 0), screenOrigin: point(0, 0) }));
    assert.ok(classes.has("bi-loc-grabbing"));
    layer._onDragLeftCancel(dragEvent({ origin: point(0, 0) }));
    assert.ok(!classes.has("bi-loc-grabbing"));
    layer.deactivate();
    assert.ok(!classes.has("bi-loc-crosshair") && !classes.has("bi-loc-grabbing"));
  });
});

describe("what already exists on the map", () => {
  beforeEach(async () => {
    fakeTimers.enable();
    await makeLayer();
    layer.activate();
    await layer.activation;
    // loadPublished runs off _activate; let its fetches resolve
    for (let i = 0; i < 30 && layer.publishedSummary.state !== "ok"; i++) await new Promise((r) => setImmediate(r));
  });
  afterEach(async () => {
    await drain();
    fakeTimers.reset();
    uninstallFoundry();
  });

  test("activating the layer is enough to load and draw every deployed location", () => {
    const summary = layer.publishedSummary;
    assert.equal(summary.state, "ok");
    assert.equal(summary.onHub, true);
    assert.deepEqual(summary.counts, { region: 1, site: 1, point: 1 });
    const container = layer.children[0];
    assert.equal(container.visible, true);
    assert.ok(container.children.length >= 2, "a Graphics per polygon tier and one for pins -- not one per location");
  });

  test("the outlines are drawn in SCREEN pixels: a 2.5px line at zoom 0.1 is 25 scene px", () => {
    const [regionGraphics] = layer.children[0].children;
    assert.equal(regionGraphics.lines.at(-1).width, 2.5 / 0.1);
  });

  test("zooming redraws them at the new size (debounced), and panning alone does not", () => {
    const before = layer.children[0].children[0];
    layer.onViewChange(0.1); // pan: same scale
    fakeTimers.tick(500);
    assert.equal(layer.children[0].children[0], before, "a pan does not rebuild anything");
    globalThis.canvas.stage.scale.x = 1;
    globalThis.canvas.stage.scale.y = 1;
    layer.onViewChange(1);
    fakeTimers.tick(500);
    const after = layer.children[0].children[0];
    assert.notEqual(after, before);
    assert.equal(after.lines.at(-1).width, 2.5);
  });

  test("clicking a building with the pick tool opens it into the session (selected, locked, only looked at)", () => {
    let selected = null;
    layer.configure({ onSelectionChange: (items) => { selected = items; } });
    layer.setPendingTier("site");
    layer.setTool("pick");
    // the hall is at image px 400..500 -> scene px 800..1000
    clickPick(layer, point(900, 900));
    const items = Object.values(layer.getSession().items);
    assert.equal(items.length, 1);
    assert.equal(items[0].locationId, "hall");
    assert.equal(items[0].peek, true);
    assert.equal(items[0].locked, true);
    assert.equal(selected.length, 1);
    assert.equal(layer.publishedSummary.counts.site, 1, "still counted; it is just drawn as a session item now");
  });

  test("in Areas mode a click where a region and a building overlap opens the region; clicking only the building opens that", () => {
    layer.setPendingTier("region");
    layer.setTool("pick");
    clickPick(layer, point(900, 900));
    assert.equal(Object.values(layer.getSession().items)[0].locationId, "district");
    layer.clearSelection();
    // a spot the district does not cover, a pin, picks the pin even in Areas mode (nothing in-mode is there)
    clickPick(layer, point(4000, 4000));
    assert.equal(Object.values(layer.getSession().items)[0].locationId, "drain");
  });

  test("an OPENED region does not swallow a click on a building inside it in Places mode, but still answers for ground with no building", async () => {
    layer.setPendingTier("region");
    layer.setTool("pick");
    clickPick(layer, point(1500, 1500)); // inside the district, clear of the hall (scene px 800..1000)
    const districtItem = Object.values(layer.getSession().items)[0];
    assert.equal(districtItem.locationId, "district");
    await layer.setItemFields(districtItem.localId, { name: "touched" }); // an edited item is kept, not let go of
    layer.setPendingTier("site");
    clickPick(layer, point(900, 900)); // the hall: in-mode, so it beats the bigger open district under the same point
    const selected = layer.getSession().items[layer.selectedId];
    assert.equal(selected.locationId, "hall");
    assert.ok(layer.getSession().items[districtItem.localId], "the edited district is still in the session");
    clickPick(layer, point(1500, 1500)); // no building here: nothing in-mode, so the open district answers
    assert.equal(layer.getSession().items[layer.selectedId].locationId, "district");
  });

  test("a location that was only looked at is let go of when something else is picked or the ground is clicked", () => {
    layer.setPendingTier("site");
    layer.setTool("pick");
    clickPick(layer, point(900, 900));
    assert.equal(Object.keys(layer.getSession().items).length, 1);
    clickPick(layer, point(8000, 8000));
    assert.equal(Object.keys(layer.getSession().items).length, 0, "nothing left behind by looking around");
  });

  test("hiding a tier hides its outlines and stops it being clickable", () => {
    layer.setPendingTier("site");
    layer.setTool("pick");
    layer.setPublishedVisible("site", false);
    clickPick(layer, point(900, 900));
    assert.equal(Object.values(layer.getSession().items)[0].locationId, "district", "the building is hidden, so the click falls through to the district");
  });

  test("hovering outlines the location under the pointer and labels it; leaving clears both", () => {
    const hover = moveHandlers[0];
    assert.equal(typeof hover, "function", "the layer registered a mouse-move handler");
    layer.setTool("pick");
    layer.setPendingTier("site");
    hover.call(layer, point(900, 900));
    const overlay = layer.children[5];
    assert.equal(overlay.children.length, 2, "an outline and a label");
    assert.match(overlay.children[1].text, /Town Hall/);
    hover.call(layer, point(8000, 8000));
    assert.equal(overlay.children.length, 0);
  });

  test("deactivating hides the existing-locations layer; reactivating shows it again", () => {
    layer.deactivate();
    assert.equal(layer.children[0].visible, false);
    layer.activate();
    assert.equal(layer.children[0].visible, true);
  });

  test("a scene change that is not the hub draws nothing and offers nothing to click", () => {
    layer.setPendingTier("site");
    layer.setTool("pick");
    globalThis.canvas.scene = { id: "somewhere-else" };
    assert.equal(layer.publishedSummary.onHub, false);
    clickPick(layer, point(900, 900));
    assert.equal(Object.keys(layer.getSession().items).length, 0);
  });
  test("pressing on a building and dragging pans the map and selects nothing", async () => {
    layer.setPendingTier("site");
    layer.setTool("pick");
    // the press lands on the hall (the click callback), then the pointer drags: the pick must be abandoned
    layer._onClickLeft({ interactionData: { origin: point(900, 900) }, shiftKey: false });
    layer._onDragLeftStart(dragEvent({ origin: point(900, 900), screenOrigin: point(10, 10) }));
    layer._onDragLeftMove(dragEvent({ origin: point(900, 900), destination: point(950, 950), screenOrigin: point(10, 10), global: point(60, 60) }));
    await layer._onDragLeftDrop(dragEvent({ origin: point(900, 900), destination: point(950, 950) }));
    layer._onDragLeftCancel(dragEvent({ origin: point(900, 900) }));
    globalThis.canvas.stage.emit("pointerup");
    assert.equal(Object.keys(layer.getSession().items).length, 0, "nothing was opened");
    assert.equal(panCalls.length, 1, "the map moved");
  });

  test("a press that is released outside the canvas picks nothing, now or at the next release", () => {
    layer.setPendingTier("site");
    layer.setTool("pick");
    layer._onClickLeft({ interactionData: { origin: point(900, 900) }, shiftKey: false });
    globalThis.canvas.stage.emit("pointerupoutside");
    globalThis.canvas.stage.emit("pointerup");
    assert.equal(Object.keys(layer.getSession().items).length, 0);
  });

  test("changing tool between the press and the release abandons the pick", () => {
    layer.setPendingTier("site");
    layer.setTool("pick");
    layer._onClickLeft({ interactionData: { origin: point(900, 900) }, shiftKey: false });
    layer.setTool("polygon");
    globalThis.canvas.stage.emit("pointerup");
    assert.equal(Object.keys(layer.getSession().items).length, 0);
  });
  test("'show the whole map' frames every visible location: centred on their box, scaled to fill the screen with a margin", () => {
    assert.equal(layer.fitToPublished(), true);
    assert.equal(animated.length, 1);
    const view = animated[0];
    // locations span scene px 200..1800 (district, scale 2) and the pin at 4000: box x 200..4000, y 200..4000
    assert.equal(view.x, (200 + 4000) / 2);
    assert.equal(view.y, (200 + 4000) / 2);
    assert.ok(Math.abs(view.scale - (800 / 3800) * 0.9) < 1e-9, `scale ${view.scale}`);
  });

  test("a hidden tier is not framed", () => {
    layer.setPublishedVisible("point", false);
    layer.fitToPublished();
    // without the far pin the box is just the district (scene px 200..1800): height is the tighter axis, 800/1600
    assert.equal(animated[0].x, (200 + 1800) / 2);
    assert.ok(Math.abs(animated[0].scale - 0.5 * 0.9) < 1e-9, `scale ${animated[0].scale}`);
  });

  test("entering the editor with nothing in view brings the camera to the locations; with one in view it leaves it alone", async () => {
    // already on screen (the default stub camera sees everything): no move
    layer.deactivate();
    animated.length = 0;
    layer.activate();
    await layer.activation;
    assert.equal(animated.length, 0, "a deliberately placed camera is not yanked");
    // park the camera far away, re-enter: now it is brought in, once
    layer.deactivate();
    globalThis.canvas.stage.pivot.x = 900000;
    globalThis.canvas.stage.pivot.y = 900000;
    layer.activate();
    await layer.activation;
    assert.equal(animated.length, 1);
    layer.fitToPublished({ onlyIfNothingInView: true });
    assert.equal(animated.length, 2, "an explicit call with the camera still far away frames again; only entry is once-per-entry");
  });
  test("assign: the next click on an existing location is handed back instead of opened; Shift picks the area", () => {
    const picks = [];
    layer.setPendingTier("site");
    layer.setTool("pick");
    layer.armAssign({ label: "Kit Issue", onPick: (p) => picks.push(p) });
    assert.equal(layer.assignArmed, true);
    clickPick(layer, point(900, 900)); // the hall, which is also inside the district
    assert.deepEqual(picks, [{ locationId: "hall", name: "Town Hall", tier: "site" }]);
    assert.equal(layer.assignArmed, false, "one click ends the wait");
    assert.equal(Object.keys(layer.getSession().items).length, 0, "nothing was opened into the session");
    layer.armAssign({ label: "x", onPick: (p) => picks.push(p) });
    clickPick(layer, point(900, 900), { shift: true });
    assert.equal(picks[1].locationId, "district", "Shift-click takes the area under the pointer");
  });

  test("assign: a place already open in the session can still be picked, and clicking empty ground keeps waiting", () => {
    const picks = [];
    layer.setPendingTier("site");
    layer.setTool("pick");
    clickPick(layer, point(900, 900)); // opens the hall
    layer.armAssign({ label: "x", onPick: (p) => picks.push(p) });
    clickPick(layer, point(9000, 9000)); // nothing there
    assert.equal(layer.assignArmed, true);
    assert.equal(picks.length, 0);
    clickPick(layer, point(900, 900));
    assert.equal(picks[0].locationId, "hall");
  });

  test("assign: Escape or another tool abandons the wait and tells whoever asked", () => {
    let cancelled = 0;
    layer.setTool("pick");
    layer.armAssign({ label: "x", onPick() {}, onCancel: () => cancelled++ });
    assert.equal(layer.hasEscapableState(), true);
    assert.equal(layer._onDismissKey(), true);
    assert.equal(cancelled, 1);
    assert.equal(layer.assignArmed, false);
    layer.armAssign({ label: "x", onPick() {}, onCancel: () => cancelled++ });
    layer.setTool("polygon");
    assert.equal(cancelled, 2);
    layer.armAssign({ label: "x", onPick() {}, onCancel: () => cancelled++ });
    layer.deactivate();
    assert.equal(cancelled, 3);
  });

  test("focus: outlines one location, labels it and brings the camera; an unknown one clears it", () => {
    const focusContainer = layer.children.at(-1);
    assert.equal(focusContainer.eventMode, "none", "the highlight takes no part in hit-testing");
    assert.equal(layer.focusLocation("hall", { label: "Kit Issue" }), true);
    assert.equal(layer.focusedId, "hall");
    assert.equal(focusContainer.children.length, 2, "an outline and a label");
    assert.match(focusContainer.children[1].text, /Kit Issue[\s\S]*Town Hall/);
    assert.equal(animated.length, 1);
    assert.ok(animated[0].scale <= 2.5, "never zoomed absurdly close");
    assert.equal(layer.focusLocation("hall", { pan: false }), true);
    assert.equal(animated.length, 1, "pan: false leaves the camera alone");
    assert.equal(layer.focusLocation("no-such-place"), false);
    assert.equal(layer.focusedId, null);
    assert.equal(focusContainer.children.length, 0);
    layer.focusLocation("drain");
    layer.clearFocus();
    assert.equal(focusContainer.children.length, 0);
  });

  test("focus is redrawn at the new size after a zoom, like everything else", () => {
    layer.focusLocation("hall", { pan: false });
    const before = layer.children.at(-1).children[0];
    globalThis.canvas.stage.scale.x = 1;
    layer.onViewChange(1);
    fakeTimers.tick(500);
    assert.notEqual(layer.children.at(-1).children[0], before);
  });
});
