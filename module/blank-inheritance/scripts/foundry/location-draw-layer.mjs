/**
 * The Location Editor's drawing engine -- a faithful port of
 * `tools/gazetteer/static/draw.js` onto Foundry's own canvas, as a real
 * `InteractionLayer` (the same base class Foundry's own Regions/Drawings
 * layers extend, so activating this claims exclusive canvas interaction the
 * same sanctioned way and never fights the Token layer or anything else).
 * design/location-editor.md §3 is the design and the reasoning for why this
 * exists instead of reusing Foundry's native Region tool -- read it first.
 *
 * PHASE 1 (design doc §10): polygon click-to-place with angle-snap,
 * rectangle/circle single-drag drafts, point placement, click-to-select an
 * existing item. PHASE 2: vertex/midpoint drag handles, neighbour-vertex-
 * snap-and-weld, district focus dimming, marquee (drag-box) and lasso
 * (freehand) multi-select. PHASE 7 (this rewrite, 2026-10-01): everything that
 * made the first version unusable in a real browser -- see "What the first
 * version got wrong" below -- plus the layer of EXISTING locations (all 236
 * deployed files drawn on the map, hover-labelled, click to open for editing).
 *
 * Coordinates: everything here is the Scene's own canvas pixels --
 * `event.interactionData.origin` already gives Foundry canvas coordinates
 * directly, so (unlike draw.js, which had to manage its own CRS.Simple
 * image-pixel<->latlng mapping) there is no coordinate translation to do
 * while drawing at all. The one conversion this design still needs --
 * scene pixels -> master-image pixels -- happens once, at save time,
 * in foundry/location-editor.mjs, via the already-built toImagePoint().
 *
 * Sizes: every line weight, dot, handle and hit target below is declared in
 * SCREEN pixels and converted with #px(), because the Campaign Map is
 * thousands of scene pixels across and is usually viewed at a zoom well below
 * 0.2 -- a 2-scene-pixel line is a fifth of a screen pixel there, which is to
 * say invisible. Shapes re-render (debounced) when the zoom changes.
 *
 * What the first version got wrong (found when the GM actually tried it, none
 * of it by the direct-handler-call tests that had "verified" it):
 *  - Its dock group handed Foundry an ARRAY of tools; the dock keys tools by
 *    name, so every tool was called "0".."6" and `game.activeTool` was null.
 *  - Its default tool was named "select", which Foundry's own canvas reserves
 *    for its rubber-band (core/location-draw-tools.mjs holds both lessons).
 *  - A left-drag created a preview Graphics, destroyed it on drop, and
 *    destroyed it AGAIN on the cancel Foundry always sends after a drop; the
 *    second destroy throws inside MouseInteractionManager#cancel, which skips
 *    its own state reset, leaving `canvas.currentMouseManager` stuck and every
 *    later pan/click dead. Every callback below is now idempotent and guarded
 *    so a bug here can never wedge the canvas again.
 *  - It never drew what already existed, and drew its own shapes at a fixed
 *    scene-pixel weight.
 */

import { addDraftItem, emptySession, isValidSession, itemsInPolygon, itemsInRect, linkItemToLocation, MODE_TIERS, modeForTier, pointInRing, removeItem, sessionItemList, updateItemFields, updateItemGeometry } from "../core/location-editor.mjs";
import { buildDockControl, DEFAULT_TOOL, DRAG_TOOLS, normaliseTool, TOOL_DEFS } from "../core/location-draw-tools.mjs";
import { adoptPublished, boxesOverlap, fitView, hitTestPublished, publishedBounds, publishedVisible, releasePeeked } from "../core/location-published.mjs";
import { fetchModuleJson, writeStorageJson } from "./io.mjs";
import { adoptBuilding, adoptedBuildingIds, buildingAsShape, buildingPick } from "../core/buildings-index.mjs";
import { loadPublishedInScene } from "./location-published.mjs";
import { loadBuildingsInScene } from "./buildings-index.mjs";

// InteractionLayer is Foundry's own base class for a canvas layer with real
// user interaction -- the same one Regions/Drawings/Walls extend, exposed to
// module authors under the `foundry` namespace the same way
// `foundry.applications.api.ApplicationV2` already is elsewhere in this
// module (foundry/admin-panel.mjs). Not a bare global: this class lives under
// `client/canvas/layers/base/`, re-exported through `foundry.canvas.layers`.
const { InteractionLayer } = foundry.canvas.layers;

const MODULE_ID = "blank-inheritance";
const SESSION_STORAGE_NAME = "location-draw-session.json";
const DRAG_TOOL_SET = new Set(DRAG_TOOLS);

// Line weights are SCREEN pixels (see the header); colours are the old tool's.
const TIER_STYLE = {
  region: { color: 0xac8a4d, weight: 3, fillAlpha: 0.10 },
  site: { color: 0xd1402a, weight: 2, fillAlpha: 0.18 },
  point: { color: 0xd1402a, weight: 2, fillAlpha: 0.30 }
};
const SELECTED_STYLE = { color: 0x4fc8d8, weight: 3, fillAlpha: 0.25 };
const LOCKED_STYLE = { color: 0x3d6b47, weight: 2, fillAlpha: 0.22 };
const DRAFT_STYLE = { color: 0x4fc8d8, weight: 2, fillAlpha: 0.12 };
// What already exists. Brighter than the session's own colours so the
// deployed map reads at a glance, and a different hue per tier so a district
// outline is never mistaken for a building.
const PUBLISHED_STYLE = {
  region: { color: 0xf0c24a, weight: 2.5, fillAlpha: 0.07 },
  site: { color: 0xff6a4d, weight: 1.75, fillAlpha: 0.16 },
  point: { color: 0xff6a4d, radius: 6 }
};
const HOVER_COLOR = 0xffffff;
const FOCUS_COLOR = 0xff2bd6; // the place the Story list is showing: unmistakably not any tier's colour
// A real, already-promoted region loaded as the Bisect tool's own cut
// target -- amber, matching the advisory-text colour elsewhere in this
// panel (bi-components.css's --warn), since it reads the same way: "real,
// informational, not something you can reshape directly here."
const REFERENCE_STYLE = { color: 0xe0a24a, weight: 2 };

// draw.js's own tuned constant -- 22.5 degrees, relative to the first drawn
// edge, not a compass direction (design doc §3.2). Unchanged.
const ANGLE_SNAP_STEP = Math.PI / 8;
const CIRCLE_DRAFT_POINTS = 32;
const CLICK_VS_DRAG_SCREEN_PX = 4;
const HIT_PIN_RADIUS_SCREEN_PX = 15;
const HIT_BUILDING_SLOP_SCREEN_PX = 6; // a thin building clicked a hair off still counts (core/buildings-index.mjs hit)
const MAX_BUILDINGS_DRAWN = 6000; // zoomed out, only the largest footprints are drawn: a screen of 50,000 outlines is noise and a slow frame
const BUILDING_STYLE = { color: 0x7fb2ff, line: 0xb9d7ff, fillAlpha: 0.12, lineAlpha: 0.8 };
// draw.js's own tuned constants (design doc §3.2) -- unchanged. Weld
// tolerance is compared directly against scene-px deltas with no zoom
// adjustment on purpose: whether two vertices were meant to be the same
// point is a fact about the DATA, not about how far apart they look right
// now. Snap radius (a click/drag target) is the opposite -- a screen-space
// feel that must stay constant at every zoom, so it's converted to scene px
// per use via #snapRadius().
const WELD_TOLERANCE_PX = 5;
const SNAP_RADIUS_SCREEN_PX = 40;
const HANDLE_RADIUS = 7;
const MIDPOINT_RADIUS = 5;
const RERENDER_DEBOUNCE_MS = 90;
const STATUS_THROTTLE_MS = 80;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Nearest point on segment ab to p, clamped to the segment's ends -- draw.js#closestOnSegment. */
function closestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return { x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy };
}

/** Runs `fn` with its latest call's arguments at most once per animation frame -- draw.js#rafThrottle, unchanged reasoning. */
function rafThrottle(fn) {
  let scheduled = false;
  let latestArgs = [];
  return (...args) => {
    latestArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...latestArgs);
    });
  };
}

function polygonArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[i], p1 = ring[(i + 1) % ring.length];
    area += p0.x * p1.y - p1.x * p0.y;
  }
  return Math.abs(area) / 2;
}

function rectRing(a, b) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}

function circleRing(center, edge, n = CIRCLE_DRAFT_POINTS) {
  const r = distance(center, edge);
  const ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ring.push({ x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) });
  }
  return ring;
}

const flat = (ring) => ring.flatMap((p) => [p.x, p.y]);

/** Destroy every child of a container, tolerating a container (or a child) that has already been destroyed. */
function emptyContainer(container) {
  if (!container || container.destroyed) return;
  for (const child of container.removeChildren()) {
    if (!child.destroyed) child.destroy();
  }
}

export class LocationDrawLayer extends InteractionLayer {
  #tool = DEFAULT_TOOL;
  #drafting = null; // { points: [{x,y}], mode: "polygon" } -- rect/circle never set this, they're one drag each; lasso reuses this same state, see #finishLasso
  #drag = null; // the left-drag in flight: { kind: "pan"|"marquee"|"shape", ... } -- null between gestures
  #dragPreview = null; // the one preview Graphics a marquee/shape drag draws into; owned HERE so every path that ends a drag can clear it exactly once
  #session = emptySession();
  #selectedIds = new Set();
  #shapesContainer;
  #publishedContainer;
  #draftContainer;
  #handlesContainer;
  #referenceContainer;
  #overlayContainer;
  #focusContainer; // the one place the Story list is pointing at (foundry/location-editor.mjs)
  #referenceRegion = null; // { locationId, ringScene: [{x,y}, ...] } -- a real, already-promoted region loaded for the Bisect tool, design doc §10 phase 2c
  #published = []; // every deployed location as a scene-px shape (core/location-published.mjs), for the hub scene
  #publishedSceneId = null;
  #publishedFailed = [];
  #publishedState = "idle"; // idle | loading | ok | no-hub | error
  #buildings = null; // { sceneId, index } -- every real building of the map laid on the hub scene (core/buildings-index.mjs), or null
  #buildingsState = "idle"; // idle | loading | ok | no-hub | missing | error
  #buildingsTruncated = false; // the last draw left out the smaller footprints (too many on screen)
  #buildingsDrawn = null; // the scene box the buildings were last drawn for: panning inside it needs no redraw
  #showBuildings = true; // the panel's switch for the real-building outlines
  #buildingsContainer;
  #assignTarget = "places"; // what a pick for a scene may take: "places" (a building, a pin) or "areas" (a district); Shift takes the other
  #visibility = { region: true, site: true, point: true };
  #fitted = false; // has the camera been framed on the existing locations since this layer was last drawn on a scene?
  #hover = null; // the published shape under the cursor, or null
  #focus = null; // { locationId, label } -- what the Story list is showing the GM on the map, or null
  #assign = null; // { label, onPick, onCancel } -- waiting for the GM to click the place a scene should happen at, or null
  #pendingPick = null; // a pick-tool press waiting to see whether it becomes a click (select on release) or a drag (pan) -- { p: {x, y}, additive }
  #hoverLabel = null;
  #renderedScale = null;
  #rerenderTimer = null;
  #statusTimer = null;
  #statusWanted = "";
  #statusShown = "";
  #onSessionChange = null;
  #onSelectionChange = null;
  #onStatus = null;
  #onBisectReady = null;
  #onPublishedChange = null;
  #getViewInset = null;
  #sessionLoaded = false;
  #pendingTier = "site";
  #mouseMoveHandler = (position) => this.#onMouseMove(position);
  #leaveHandler = () => this.#setHover(null);

  static get layerOptions() {
    return Object.assign(super.layerOptions, { name: "locationDraw" });
  }

  get hookName() {
    return LocationDrawLayer.name;
  }

  /**
   * Containers are built in `_draw()`, not the constructor -- Foundry's own
   * `CanvasLayer#draw()` calls `tearDown()` before every redraw once a layer
   * has drawn once (a scene change tears down and rebuilds the WHOLE canvas,
   * every layer included), and the default `_tearDown()` destroys every
   * child a layer has. A layer instance itself is only ever constructed
   * once; anything set up only in the constructor is gone after the first
   * scene switch. Found live: switching from the starting scene to the
   * Campaign Map left this layer reporting `active: true` and taking clicks
   * correctly, but with zero children and nothing ever visible again,
   * because nothing recreated the containers `_tearDown()` had just emptied.
   */
  async _draw(options) {
    await super._draw(options);
    // Bottom to top: what exists, this session's drawings, the bisect
    // reference, the in-flight draft, the handles, then the hover overlay.
    this.#buildingsContainer = this.addChild(this.#passive(new PIXI.Container()));
    this.#publishedContainer = this.addChild(this.#passive(new PIXI.Container()));
    this.#shapesContainer = this.addChild(this.#passive(new PIXI.Container()));
    this.#referenceContainer = this.addChild(this.#passive(new PIXI.Container()));
    this.#draftContainer = this.addChild(this.#passive(new PIXI.Container()));
    this.#handlesContainer = this.addChild(new PIXI.Container()); // the one container whose children ARE interactive
    this.#overlayContainer = this.addChild(this.#passive(new PIXI.Container()));
    // Last, so the Story list's highlight and its label sit above everything else.
    this.#focusContainer = this.addChild(this.#passive(new PIXI.Container()));
    this.#publishedContainer.visible = this.active;
    this.#buildingsContainer.visible = this.active;
    LocationDrawLayer.#registerCanvasHooks();
    canvas.registerMouseMoveHandler?.(this.#mouseMoveHandler, 0, this, true);
    if (this.#sessionLoaded) this.#renderAll();
    else this.#renderReference();
  }

  /**
   * Drawing containers take no part in hit-testing. PIXI 7 hit-tests a
   * non-interactive ("auto") child whenever its parent is interactive -- and
   * this layer is, while active -- and a hit on one STOPS the search for
   * anything beneath it. Found live: the hover highlight, drawn above the
   * handles, swallowed every press on a vertex handle lying inside the
   * hovered building, so dragging a region's corner panned the map instead.
   * "none" prunes the whole subtree from hit-testing.
   */
  #passive(container) {
    container.eventMode = "none";
    container.interactiveChildren = false;
    return container;
  }

  async _tearDown(options) {
    clearTimeout(this.#rerenderTimer);
    this.#rerenderTimer = null;
    this.#endDrag();
    this.#drafting = null;
    this.#hover = null;
    this.#hoverLabel = null;
    await super._tearDown(options);
    this.#publishedContainer = this.#shapesContainer = this.#referenceContainer = this.#buildingsContainer = null;
    this.#draftContainer = this.#handlesContainer = this.#overlayContainer = this.#focusContainer = null;
  }

  static #hooksRegistered = false;

  /** A zoom changes how big "a 2px line" is in scene px, so shapes must be redrawn -- panning alone never needs it. */
  static #registerCanvasHooks() {
    if (LocationDrawLayer.#hooksRegistered) return;
    LocationDrawLayer.#hooksRegistered = true;
    Hooks.on("canvasPan", (_canvas, view) => canvas.locationDraw?.onViewChange(view?.scale));
  }

  static prepareSceneControls() {
    return buildDockControl({
      visible: game.user?.isGM,
      callbacks: {
        onChange: (event, active) => {
          if (active) canvas.locationDraw?.activate();
        },
        // Called for the tool being LEFT (active false) as well as the one
        // being entered; only the latter may change anything. The first
        // version read ui.controls.tool here, which on leaving the group is
        // already the NEXT group's tool, and reset this layer's own to it.
        onToolChange: (event, tool, active) => {
          if (active) canvas.locationDraw?.setTool(tool?.name);
        }
      }
    });
  }

  /** Wire the panel's reactions. Called by foundry/location-editor.mjs on every render, so it only ever replaces callbacks. */
  configure({ onSessionChange, onSelectionChange, onStatus, onBisectReady, onPublishedChange, getViewInset } = {}) {
    this.#onSessionChange = onSessionChange ?? null;
    this.#onSelectionChange = onSelectionChange ?? null;
    this.#onStatus = onStatus ?? null;
    this.#onBisectReady = onBisectReady ?? null;
    this.#onPublishedChange = onPublishedChange ?? null;
    this.#getViewInset = getViewInset ?? null;
  }

  /**
   * A real, already-promoted region, loaded ON DEMAND as a reference outline
   * to cut against -- the Bisect tool's own answer to "which region", design
   * doc §10 phase 2c. Not a session item (it is never saved as a new draft
   * itself, and this layer's session is deliberately drafts-only, §3.4) --
   * just the one target the panel already fetched for its own field form,
   * handed across so there is something to see and click against.
   */
  loadReferenceRegion(locationId, ringScene) {
    this.#referenceRegion = { locationId, ringScene };
    this.#renderReference();
  }

  clearReferenceRegion() {
    this.#referenceRegion = null;
    this.#renderReference();
  }

  get referenceRegionId() {
    return this.#referenceRegion?.locationId ?? null;
  }

  async _activate() {
    this.#applyCursor();
    canvas.app?.view?.addEventListener?.("pointerleave", this.#leaveHandler);
    if (this.#publishedContainer) this.#publishedContainer.visible = true;
    if (!this.#sessionLoaded) await this.#loadSession();
    this.#renderAll();
    this.#report(this.#hintFor(this.#tool));
    if (this.#buildingsState === "idle") this.loadBuildings();
    if (this.#publishedState === "idle") this.loadPublished();
    else this.#fitOnEntry();
  }

  _deactivate() {
    this.#fitted = false;
    this.disarmAssign({ cancelled: true });
    this.#disarmPick();
    this.#endDrag();
    this.#cancelDraft({ quiet: true });
    this.#setHover(null);
    canvas.app?.view?.removeEventListener?.("pointerleave", this.#leaveHandler);
    // What already exists is only drawn while the editor is in use; the GM's
    // own session drawings stay visible (they are work in progress).
    if (this.#publishedContainer && !this.#publishedContainer.destroyed) this.#publishedContainer.visible = false;
    if (this.#buildingsContainer && !this.#buildingsContainer.destroyed) this.#buildingsContainer.visible = false;
    this.#applyCursor();
  }

  setTool(tool) {
    if (normaliseTool(tool) !== "pick") this.disarmAssign({ cancelled: true });
    this.#disarmPick();
    this.#endDrag();
    this.#cancelDraft({ quiet: true });
    this.#setHover(null);
    this.#tool = normaliseTool(tool);
    this.#applyCursor();
    this.#report(this.#hintFor(this.#tool));
  }

  get tool() {
    return this.#tool;
  }

  /**
   * Is there something Escape should abandon here -- a polygon being clicked
   * out, a drag in flight, or a selection to let go of? While there is, the
   * panel refuses Escape's "close" and Foundry falls through to
   * _onDismissKey. Only while the layer is the ACTIVE one: with the GM
   * working on another layer this layer's selection is not Escape's to take,
   * and the panel must stay closable.
   */
  hasEscapableState() {
    return this.active && Boolean(this.#assign || this.#drafting || this.#drag || this.#selectedIds.size);
  }

  /** Abandon whatever gesture is in flight (a draft or a drag). Selections are let go by _onDismissKey, one Escape later. */
  cancelInProgress() {
    this.#endDrag();
    this.#cancelDraft();
  }

  getSession() {
    return this.#session;
  }

  /** Replace the whole selection with exactly this one item (or clear it, for a null/missing id) -- a plain click or the panel's own item-list row, never additive. */
  selectItem(localId) {
    this.#setSelection(localId ? [localId] : []);
  }

  /** Add/remove exactly one id from the current multi-selection -- a shift-click on the canvas. */
  toggleSelection(localId) {
    if (!localId) return;
    const next = new Set(this.#selectedIds);
    if (next.has(localId)) next.delete(localId);
    else next.add(localId);
    this.#setSelection(next);
  }

  clearSelection() {
    this.#setSelection([]);
  }

  #setSelection(ids) {
    this.#selectedIds = new Set(ids);
    // Looking at an existing location opens it as a "peeked" item; the moment
    // something else is selected, any item that was only looked at is let go
    // of again so clicking around leaves nothing behind (core/location-published.mjs).
    const { session, released } = releasePeeked(this.#session, [...this.#selectedIds]);
    if (released.length) this.#session = session;
    this.#render();
    this.#renderPublished();
    this.#renderHandles();
    if (released.length) this.#onSessionChange?.(sessionItemList(this.#session));
    this.#onSelectionChange?.([...this.#selectedIds].map((id) => this.#session.items[id]).filter(Boolean));
  }

  /** The sole selected item's id, or null when zero or several are selected -- draw.js#selected's own "don't guess" rule (used by anything that only makes sense for exactly one item: the field form, vertex handles). */
  get selectedId() {
    return this.#selectedIds.size === 1 ? [...this.#selectedIds][0] : null;
  }

  get selectedIds() {
    return [...this.#selectedIds];
  }

  async deleteItem(localId) {
    this.#session = removeItem(this.#session, localId);
    this.#selectedIds.delete(localId);
    await this.#saveSession();
    this.#render();
    this.#renderPublished();
    this.#renderHandles();
    this.#onSelectionChange?.([...this.#selectedIds].map((id) => this.#session.items[id]).filter(Boolean));
  }

  /** Bulk-delete every currently multi-selected item in one autosave -- the batch panel's own delete action once more than one item is selected. */
  async deleteSelected() {
    for (const id of this.#selectedIds) this.#session = removeItem(this.#session, id);
    this.#selectedIds = new Set();
    await this.#saveSession();
    this.#render();
    this.#renderPublished();
    this.#renderHandles();
    this.#onSelectionChange?.([]);
  }

  /** Called by the panel after it has saved an item's fields/geometry to the repo (§4) and knows the real id. */
  async markItemLinked(localId, locationId) {
    this.#session = linkItemToLocation(this.#session, localId, locationId);
    await this.#saveSession();
    this.#render();
    this.#renderPublished();
  }

  /** An existing location's outline was just written out as a save record: that outline is now its "as opened", so a second Save does not write it again. */
  async markItemSaved(localId) {
    const item = this.#session.items[localId];
    if (!item) return;
    const baselineGeometry = JSON.parse(JSON.stringify(item.geometry));
    this.#session = { ...this.#session, items: { ...this.#session.items, [localId]: { ...item, baselineGeometry } } };
    await this.#saveSession();
  }

  async setItemFields(localId, fields) {
    this.#session = updateItemFields(this.#session, localId, fields);
    await this.#saveSession();
  }

  /* ------------------------------------------------------------------ */
  /*  What already exists                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * (Re)load every deployed location and draw it. Safe to call whenever --
   * the layer calls it itself the first time it is activated, so the dock
   * alone (no panel open) is enough to see the map's existing locations.
   */
  async loadPublished({ refresh = false } = {}) {
    this.#publishedState = "loading";
    this.#onPublishedChange?.(this.publishedSummary);
    try {
      const result = await loadPublishedInScene({ refresh });
      if (!result) {
        this.#published = [];
        this.#publishedSceneId = null;
        this.#publishedFailed = [];
        this.#publishedState = "no-hub";
      } else {
        this.#published = result.shapes;
        this.#publishedSceneId = result.sceneId;
        this.#publishedFailed = result.failed ?? [];
        this.#publishedState = "ok";
      }
    } catch (err) {
      console.error("Blank Inheritance | Location Editor could not load the existing locations:", err);
      this.#published = [];
      this.#publishedState = "error";
      this.#report("could not load the existing locations -- see console", { now: true });
    }
    this.#renderPublished();
    this.#fitOnEntry();
    this.#onPublishedChange?.(this.publishedSummary);
    return this.publishedSummary;
  }

  /**
   * (Re)load the real buildings of the map (data/campaign/map/buildings-index.json) and draw them. Called by the layer itself the first time
   * it is activated. A missing file is a state, not an error to throw at the GM: the editor works without it, the panel says so.
   */
  async loadBuildings({ refresh = false } = {}) {
    this.#buildingsState = "loading";
    this.#onPublishedChange?.(this.publishedSummary);
    try {
      const result = await loadBuildingsInScene({ refresh });
      if (!result) {
        this.#buildings = null;
        this.#buildingsState = "no-hub";
      } else {
        this.#buildings = result;
        this.#buildingsState = "ok";
      }
    } catch (err) {
      this.#buildings = null;
      const missing = /HTTP 404|Could not fetch/.test(String(err?.message));
      this.#buildingsState = missing ? "missing" : "error";
      if (!missing) console.error("Blank Inheritance | Location Editor could not load the real buildings:", err);
    }
    this.#renderBuildings();
    this.#onPublishedChange?.(this.publishedSummary);
    return this.buildingsSummary;
  }

  /** What the panel shows about the real-building outlines. */
  get buildingsSummary() {
    return {
      state: this.#buildingsState,
      onHub: this.#buildingsUsable(),
      count: this.#buildings?.index?.count ?? 0,
      shown: this.#showBuildings,
      truncated: this.#buildingsTruncated
    };
  }

  setBuildingsVisible(visible) {
    this.#showBuildings = Boolean(visible);
    this.#setHover(null);
    this.#renderBuildings();
    this.#onPublishedChange?.(this.publishedSummary);
  }

  #buildingsUsable() {
    return Boolean(this.#buildings) && canvas.scene?.id === this.#buildings.sceneId;
  }

  /** The scene box on screen now ({x0, y0, x1, y1}), or null when there is no screen to ask. */
  #viewBox() {
    const screen = canvas.app?.screen;
    if (!screen || !canvas.canvasCoordinatesFromClient) return null;
    const a = canvas.canvasCoordinatesFromClient({ x: 0, y: 0 });
    const b = canvas.canvasCoordinatesFromClient({ x: screen.width, y: screen.height });
    return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
  }

  /**
   * The real buildings in and around view: a faint outline and tint each, under everything else, so what can be picked or adopted is
   * visible. Zoomed out they are capped to the largest MAX_BUILDINGS_DRAWN; drawn for a box half a screen wider than the view, so a small
   * pan needs no redraw (onViewChange redraws when the view leaves the box). Dimmed while a pick is for an area.
   */
  #renderBuildings() {
    const container = this.#buildingsContainer;
    if (!container || container.destroyed) return;
    emptyContainer(container);
    container.visible = this.active;
    this.#buildingsDrawn = null;
    this.#buildingsTruncated = false;
    if (!this.active || !this.#buildingsUsable() || !(this.#showBuildings || this.#assign)) return;
    const view = this.#viewBox();
    if (!view) return;
    // drawn for a box a quarter of a screen wider than the view, so a small pan needs no redraw; if that is more than can be drawn, for the
    // view itself (every building on screen, redrawn as it pans); if even that is too many, the largest of them (the map says "zoom in")
    const w = view.x1 - view.x0, h = view.y1 - view.y0;
    let box = { x0: view.x0 - w / 4, y0: view.y0 - h / 4, x1: view.x1 + w / 4, y1: view.y1 + h / 4 };
    let list = this.#buildings.index.inBox(box);
    if (list.length > MAX_BUILDINGS_DRAWN) {
      box = view;
      list = this.#buildings.index.inBox(box);
    }
    if (list.length > MAX_BUILDINGS_DRAWN) {
      list = list.sort((a, b) => b.area - a.area).slice(0, MAX_BUILDINGS_DRAWN);
      this.#buildingsTruncated = true;
    }
    const adopted = adoptedBuildingIds(this.#session);
    const g = new PIXI.Graphics();
    g.alpha = this.#assign && this.#assignTarget === "areas" ? 0.3 : 1;
    g.lineStyle(this.#px(1.2), BUILDING_STYLE.line, BUILDING_STYLE.lineAlpha);
    g.beginFill(BUILDING_STYLE.color, BUILDING_STYLE.fillAlpha);
    for (const b of list) if (!adopted.has(b.id)) g.drawPolygon(flat(b.ringScene));
    g.endFill();
    container.addChild(g);
    this.#buildingsDrawn = this.#buildingsTruncated ? null : box;
  }

  /** The real building under (x, y), or null. */
  #buildingAt(x, y) {
    if (!this.#buildingsUsable()) return null;
    return this.#buildings.index.hit(x, y, { slop: this.#px(HIT_BUILDING_SLOP_SCREEN_PX) });
  }

  /**
   * Make a real building a draft place: its footprint becomes a new SITE in the session, named and noted from the map, selected so the
   * panel's form opens on it (the Save a drawn building goes through then writes it). `pick` is core/buildings-index.mjs#buildingPick's
   * `building`. Returns the session item.
   */
  adoptBuildingPick(pick) {
    const { session, item, adopted } = adoptBuilding(this.#session, pick);
    this.#session = session;
    this.#setSelection([item.localId]);
    this.#saveSession().catch(() => {});
    this.#renderBuildings();
    this.#report(`${item.name ?? "A real building"} -- ${adopted ? "adopted as a new place; name it and save" : "already adopted"}`, { now: true });
    return item;
  }

  /**
   * Opening the editor with the camera parked on empty ground (the usual case
   * on a map this size) looks exactly like "there is nothing here", so on
   * entering the editor the camera is brought to the locations -- but only
   * if none of them is in view, never yanking a camera the GM has
   * deliberately placed. Once per entry (_deactivate re-arms it).
   */
  #fitOnEntry() {
    if (this.#publishedState !== "ok" || !this.active || this.#fitted) return;
    this.#fitted = true;
    this.fitToPublished({ onlyIfNothingInView: true });
  }

  /**
   * Frame every visible existing location on screen -- the whole map when all
   * of it is showing. `onlyIfNothingInView` leaves the camera alone when any of
   * them is already in view. Returns whether the camera moved.
   */
  fitToPublished({ onlyIfNothingInView = false } = {}) {
    if (!this.#publishedUsable()) return false;
    const shown = this.#published.filter((s) => publishedVisible(s, this.#visibility));
    const box = publishedBounds(shown);
    const screen = canvas.app?.screen;
    if (!box || !screen) return false;
    if (onlyIfNothingInView) {
      const topLeft = canvas.canvasCoordinatesFromClient({ x: 0, y: 0 });
      const bottomRight = canvas.canvasCoordinatesFromClient({ x: screen.width, y: screen.height });
      const view = { x0: topLeft.x, y0: topLeft.y, x1: bottomRight.x, y1: bottomRight.y };
      if (shown.some((s) => boxesOverlap(s.bounds, view))) return false;
    }
    // A window over the left of the screen (the panel) must not hide half the map.
    const target = fitView(box, screen.width, screen.height, { insetLeft: this.#getViewInset?.()?.left ?? 0 });
    if (!target) return false;
    canvas.animatePan({ ...target, duration: 500 });
    return true;
  }

  /** What the panel shows about the existing-locations layer: counts per tier, anything that failed to load, and whether it is drawable on this scene. */
  get publishedSummary() {
    const counts = { region: 0, site: 0, point: 0 };
    for (const shape of this.#published) counts[shape.tier] = (counts[shape.tier] ?? 0) + 1;
    return {
      state: this.#publishedState,
      onHub: this.#publishedUsable(),
      counts,
      total: this.#published.length,
      failed: this.#publishedFailed.length,
      visibility: { ...this.#visibility },
      buildings: this.buildingsSummary
    };
  }

  /** Show or hide one tier of the existing locations ("region" | "site" | "point"). */
  setPublishedVisible(tier, visible) {
    if (!(tier in this.#visibility)) return;
    this.#visibility = { ...this.#visibility, [tier]: Boolean(visible) };
    this.#setHover(null);
    this.#renderPublished();
    this.#onPublishedChange?.(this.publishedSummary);
  }

  #publishedUsable() {
    return this.#published.length > 0 && canvas.scene?.id === this.#publishedSceneId;
  }

  #openLocationIds() {
    return new Set(Object.values(this.#session.items).map((item) => item.locationId).filter(Boolean));
  }

  /** The existing location under (x, y) that is visible, not already open in the session, and passes `include` (a tier filter). */
  #publishedAt(x, y, include = () => true) {
    if (!this.#publishedUsable()) return null;
    const open = this.#openLocationIds();
    return hitTestPublished(this.#published, x, y, {
      pinRadius: this.#px(HIT_PIN_RADIUS_SCREEN_PX),
      include: (shape) => publishedVisible(shape, this.#visibility) && !open.has(shape.id) && include(shape.tier)
    });
  }

  /**
   * What a click at (x, y) means: this session's own drawings and the existing
   * locations compete on ONE rule -- shapes in the current mode's tiers first
   * (a building in Places mode, a region in Areas mode), anything else only if
   * none of those is there; within a pass a pin beats a polygon and the
   * smallest polygon wins. Without the mode pass, an opened region (big, and
   * in the session) swallowed every click meant for a building inside it.
   * Returns `{ id }` (a session item), `{ shape }` (an existing location) or null.
   */
  #topHitAt(x, y) {
    const mode = modeForTier(this.#pendingTier) ?? "places";
    let first = true;
    for (const pass of [(tier) => MODE_TIERS[mode].includes(tier), () => true]) {
      const mine = this.#hitTestAt(x, y, pass);
      const theirs = this.#publishedAt(x, y, pass);
      const theirsHit = theirs ? { shape: theirs, area: theirs.pointScene ? 0 : theirs.area, dist: theirs.pointScene ? Math.hypot(theirs.pointScene.x - x, theirs.pointScene.y - y) : 0 } : null;
      const best = !mine ? theirsHit : !theirsHit ? mine : (mine.area < theirsHit.area || (mine.area === theirsHit.area && mine.dist <= theirsHit.dist)) ? mine : theirsHit;
      if (best) return best.id ? { id: best.id } : { shape: best.shape };
      // Places mode: no place of ours or the map's is here, but a real building may be: that is what a click adopts, and it comes before
      // falling back to the district around it (which is how a click on a building used to open the district instead)
      if (first && mode === "places") {
        const building = this.#buildingAt(x, y);
        if (building) return { building };
      }
      first = false;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence -- the session concept, design doc §3.4                */
  /* ------------------------------------------------------------------ */

  async #loadSession() {
    this.#sessionLoaded = true;
    try {
      const loaded = await fetchModuleJson(`storage/${SESSION_STORAGE_NAME}`, { fresh: true });
      if (isValidSession(loaded)) this.#session = releasePeeked(loaded, []).session;
    } catch {
      // No autosave yet is the ordinary state the first time this is opened.
      this.#session = emptySession();
    }
    this.#onSessionChange?.(sessionItemList(this.#session));
  }

  async #saveSession() {
    try {
      await writeStorageJson("", SESSION_STORAGE_NAME, this.#session);
    } catch (err) {
      console.error("Blank Inheritance | Could not autosave the location-draw session:", err);
      this.#report("could not autosave -- see console", { now: true });
    }
    this.#onSessionChange?.(sessionItemList(this.#session));
  }

  /* ------------------------------------------------------------------ */
  /*  Angle snap -- draw.js#angleSnapPoint, unchanged tuning              */
  /* ------------------------------------------------------------------ */

  #angleSnapPoint(p, suspended) {
    if (!this.#drafting || this.#drafting.points.length < 2 || suspended) return p;
    const pts = this.#drafting.points;
    const baseAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const last = pts[pts.length - 1];
    const dx = p.x - last.x, dy = p.y - last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return p;
    const steps = Math.round((Math.atan2(dy, dx) - baseAngle) / ANGLE_SNAP_STEP);
    const snappedAngle = baseAngle + steps * ANGLE_SNAP_STEP;
    return { x: last.x + dist * Math.cos(snappedAngle), y: last.y + dist * Math.sin(snappedAngle) };
  }

  /* ------------------------------------------------------------------ */
  /*  Draft lifecycle -- draw.js#startDraft/redrawDraft/finishDraft/etc.  */
  /* ------------------------------------------------------------------ */

  #startDraft(first) {
    this.#drafting = { points: [first] };
    this.#renderDraft();
  }

  #addDraftPoint(raw, suspendAngleSnap) {
    // Both kinds of snap are Region/Site's own polygon mode ONLY -- draw.js's
    // own angleSnapPoint comment is explicit that Lasso and Bisect "draw a
    // selection area and a cut, not a building, and keep the raw point
    // untouched." Found live while wiring Bisect: this used to check only
    // pendingTier (the PANEL's mode toggle, independent of which tool is
    // actually active), so a Lasso loop drawn while the panel happened to
    // still be in Areas mode had its own points silently snap-attracted to
    // nearby region borders -- nonsensical for a selection gesture.
    const isPolygonDraft = this.#tool === "polygon";
    const angled = isPolygonDraft ? this.#angleSnapPoint(raw, suspendAngleSnap) : raw;
    // Angle-snapped first, then (region tier only) checked against nearby
    // borders -- draw.js#placeDraftPoint's own order, unchanged: the two are
    // complementary, not competing. Found missing live: a FRESH region's own
    // vertices never snapped to an already-drawn neighbour at all -- only
    // editing an existing region's vertex did (#dragRingVertex) -- which
    // would have meant drawing a whole session of hand-tidy, hairline-sliver
    // borders exactly like the bug this mechanism exists to prevent.
    const p = isPolygonDraft && this.#pendingTier === "region" && !suspendAngleSnap
      ? (this.#snapRegionPoint(null, angled.x, angled.y) ?? angled)
      : angled;
    if (!this.#drafting) this.#startDraft(p);
    else {
      this.#drafting.points.push(p);
      this.#renderDraft();
    }
  }

  async #finishDraft() {
    if (!this.#drafting || this.#drafting.points.length < 3) {
      this.#report("a polygon needs at least three points", { now: true });
      return;
    }
    const ring = this.#drafting.points.slice();
    this.#drafting = null;
    emptyContainer(this.#draftContainer);
    await this.#commitShape("polygon", ring);
  }

  #cancelDraft({ quiet = false } = {}) {
    this.#drafting = null;
    emptyContainer(this.#draftContainer);
    this.#applyCursor();
    if (!quiet) this.#report(this.#hintFor(this.#tool), { now: true });
  }

  #undoPoint() {
    if (!this.#drafting) return;
    this.#drafting.points.pop();
    if (this.#drafting.points.length === 0) this.#cancelDraft();
    else this.#renderDraft();
  }

  /**
   * Lasso finishes into a SELECTION, never a saved shape -- it reuses the
   * same multi-click `#drafting` state polygon drafting uses (draw.js's own
   * POLYGON_DRAFT_TOOLS grouped "lasso" with "region"/"site" for exactly
   * this reason), just with a different ending. Session items only -- see
   * this file's own header comment and design doc §8's tracked gap.
   */
  #finishLasso() {
    if (!this.#drafting || this.#drafting.points.length < 3) {
      this.#report("a lasso needs at least three points", { now: true });
      return;
    }
    const ring = this.#drafting.points.slice();
    this.#drafting = null;
    emptyContainer(this.#draftContainer);
    const ids = itemsInPolygon(sessionItemList(this.#session), ring);
    this.#setSelection(ids);
    this.#report(`${ids.length} item(s) selected`, { now: true });
  }

  /**
   * Bisect finishes into a CUT LINE, handed to the panel for confirmation --
   * never saved directly, and never a session item either (there is no
   * "select it and edit metadata later" step for a cut the way a freshly
   * drawn shape gets; the panel decides what happens next, design doc §10
   * phase 2c). An OPEN line, unlike polygon/lasso: needs only two points
   * (reconcile.py#bisect_region's own minimum), and #renderDraft never
   * closes or fills it -- see that method's own tool check.
   */
  #finishBisect() {
    if (!this.#drafting || this.#drafting.points.length < 2) {
      this.#report("a cut needs at least two points", { now: true });
      return;
    }
    const points = this.#drafting.points.slice();
    this.#drafting = null;
    emptyContainer(this.#draftContainer);
    this.#report("", { now: true });
    this.#onBisectReady?.(points);
  }

  async #commitShape(mode, ring) {
    const tier = this.#tool === "polygon" || this.#tool === "rect" || this.#tool === "circle"
      ? (this.#pendingTier ?? "site")
      : "point";
    // ringPx is [x,y] pairs throughout the session/record/promotion pipeline
    // (matching the old tool's own convention, and what #buildGeometry in
    // foundry/location-editor.mjs and apply_geometry.py's
    // _item_from_geometry both expect) -- everything upstream of this point
    // (drafting, rectRing, circleRing) works in {x,y} objects, the shape
    // PIXI/Foundry itself hands back. Converted once, here, at the single
    // point a drawn shape actually enters the session. Found live: skipping
    // this made #buildGeometry's `([x, y]) => ...` array-destructure throw
    // "object is not iterable" the moment Save was pressed.
    const ringPx = ring.map((p) => [p.x, p.y]);
    const { session, item } = addDraftItem(this.#session, { tier, geometry: { kind: "polygon", ringPx, holesPx: [] } });
    this.#session = session;
    await this.#saveSession();
    this.#render();
    this.selectItem(item.localId);
    this.#report(`drawn -- ${sessionItemList(this.#session).length} item(s) in this session`, { now: true });
  }

  async #commitPoint(point) {
    const { session, item } = addDraftItem(this.#session, { tier: "point", geometry: { kind: "point", pointPx: point } });
    this.#session = session;
    await this.#saveSession();
    this.#render();
    this.selectItem(item.localId);
  }

  /** Which tier a newly-drawn polygon/rect/circle should take -- set by the panel's mode toggle (design doc §2). */
  setPendingTier(tier) {
    // Found live while wiring district-focus dimming: this used to collapse
    // anything that wasn't literally "region" down to "site", which meant
    // choosing "point" in Places mode silently could never take effect --
    // every new shape kept coming out a site regardless.
    this.#pendingTier = ["region", "site", "point"].includes(tier) ? tier : "site";
    this.#render();
    this.#renderPublished();
  }

  /* ------------------------------------------------------------------ */
  /*  Vertex/midpoint handles -- draw.js#drawHandles, ported              */
  /*                                                                      */
  /*  A locked site/point never gets handles (it reads as settled, and    */
  /*  no handles means no accidental reshape) -- a locked REGION is       */
  /*  deliberately exempted, since its border is shared tessellation      */
  /*  geometry that keeps needing tidying against its neighbours for as   */
  /*  long as more regions get drawn, unlike a building's footprint.      */
  /*  Snap-and-weld is region-only, and only while dragging a region's    */
  /*  own vertex: a site traced inside a district has no reason to weld   */
  /*  itself to the district's outline (draw.js's own rule, unchanged).   */
  /* ------------------------------------------------------------------ */

  /** How big something declared in screen pixels is in scene pixels right now -- a fixed scene-px size is a different-sized target at every zoom. */
  #px(screenPx) {
    return screenPx / this.#scale();
  }

  #scale() {
    return canvas.stage?.scale?.x || 1;
  }

  #snapRadius() {
    return this.#px(SNAP_RADIUS_SCREEN_PX);
  }

  #findWeldedVertices(excludeLocalId, x, y) {
    const welded = [];
    for (const item of sessionItemList(this.#session)) {
      if (item.localId === excludeLocalId || item.tier !== "region") continue;
      const ring = item.geometry.ringPx;
      if (!ring) continue;
      ring.forEach(([rx, ry], index) => {
        if (Math.abs(rx - x) < WELD_TOLERANCE_PX && Math.abs(ry - y) < WELD_TOLERANCE_PX) {
          welded.push({ localId: item.localId, index });
        }
      });
    }
    return welded;
  }

  /**
   * Every ring a region vertex could snap to: this session's regions, plus
   * the deployed regions that are not open in the session (their outline is
   * on the map, so a new border should meet it exactly). A deployed region is
   * only ever a snap TARGET -- never modified here, so no `localId` for it.
   */
  *#snapRings(excludeLocalId) {
    for (const item of sessionItemList(this.#session)) {
      if (item.localId === excludeLocalId || item.tier !== "region") continue;
      const ring = item.geometry.ringPx;
      if (ring && ring.length >= 3) yield { ring, localId: item.localId };
    }
    if (!this.#publishedUsable() || this.#visibility.region === false) return;
    const open = this.#openLocationIds();
    for (const shape of this.#published) {
      if (shape.tier !== "region" || open.has(shape.id)) continue;
      const shell = shape.ringsScene?.[0];
      if (shell && shell.length >= 3) yield { ring: shell.map((p) => [p.x, p.y]), localId: null };
    }
  }

  /** The winning snap target for a region vertex at (x,y) -- an existing VERTEX beats an EDGE at equal distance (a shared corner is a stronger statement of intent than a point on a side). */
  #snapRegionPoint(excludeLocalId, x, y) {
    const tolerance = this.#snapRadius();
    let bestVertex = null, bestVertexDist = Infinity;
    let bestEdge = null, bestEdgeDist = Infinity;
    for (const { ring, localId } of this.#snapRings(excludeLocalId)) {
      for (let i = 0; i < ring.length; i++) {
        const [vx, vy] = ring[i];
        const d = Math.hypot(vx - x, vy - y);
        if (d < bestVertexDist) { bestVertexDist = d; bestVertex = { x: vx, y: vy, localId }; }
        const [nx, ny] = ring[(i + 1) % ring.length];
        const closest = closestOnSegment(x, y, vx, vy, nx, ny);
        const de = Math.hypot(closest.x - x, closest.y - y);
        if (de < bestEdgeDist) { bestEdgeDist = de; bestEdge = { x: closest.x, y: closest.y, localId, segIndex: i }; }
      }
    }
    if (bestVertex && bestVertexDist <= tolerance) return { x: bestVertex.x, y: bestVertex.y, kind: "vertex", localId: bestVertex.localId };
    if (bestEdge && bestEdgeDist <= tolerance) return { x: bestEdge.x, y: bestEdge.y, kind: "edge", localId: bestEdge.localId, segIndex: bestEdge.segIndex };
    return null;
  }

  /** After a drag settles snapped onto ANOTHER region's EDGE, insert a real matching vertex there -- one drag makes a genuinely shared corner on both sides. A snap onto an existing VERTEX needs no split; the rings are already coincident there. A deployed region that is not open has no session item to split, so it is left alone. */
  #splitTargetEdge(snapInfo) {
    if (!snapInfo || snapInfo.kind !== "edge" || !snapInfo.localId) return;
    const target = this.#session.items[snapInfo.localId];
    if (!target?.geometry?.ringPx) return;
    const ring = [...target.geometry.ringPx];
    ring.splice(snapInfo.segIndex + 1, 0, [snapInfo.x, snapInfo.y]);
    this.#session = updateItemGeometry(this.#session, snapInfo.localId, { ...target.geometry, ringPx: ring });
  }

  #renderHandles() {
    emptyContainer(this.#handlesContainer);
    if (!this.#handlesContainer || this.#handlesContainer.destroyed) return;
    // Handles only make sense for exactly one selected item (draw.js's own
    // rule -- "several selected there is no single ring to edit, and the
    // batch panel" takes over instead); selectedId is null for both zero and
    // several selections, so this naturally suppresses handles for a
    // multi-select too, with no separate check needed.
    const soleId = this.selectedId;
    const item = soleId ? this.#session.items[soleId] : null;
    if (!item || this.#drafting) return;
    if (item.locked && item.tier !== "region") return;
    if (item.geometry.kind === "point") {
      this.#addPointHandle(item);
      return;
    }
    const ring = item.geometry.ringPx;
    ring.forEach((p, i) => this.#addVertexHandle(item, i, p));
    ring.forEach((p, i) => {
      const n = ring[(i + 1) % ring.length];
      this.#addMidpointHandle(item, i, [(p[0] + n[0]) / 2, (p[1] + n[1]) / 2]);
    });
  }

  #makeHandle(x, y, screenRadius, fillColor) {
    const g = new PIXI.Graphics();
    g.lineStyle(this.#px(2), 0xffffff, 1);
    g.beginFill(fillColor, 1);
    g.drawCircle(0, 0, this.#px(screenRadius));
    g.endFill();
    g.position.set(x, y);
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = new PIXI.Circle(0, 0, this.#px(screenRadius + 4));
    return g;
  }

  #addPointHandle(item) {
    const [x, y] = item.geometry.pointPx;
    const g = this.#makeHandle(x, y, HANDLE_RADIUS, 0x4fc8d8);
    let dragging = false;
    const onMove = rafThrottle((e) => {
      if (!dragging) return;
      const p = e.getLocalPosition(this);
      const pt = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
      this.#session = updateItemGeometry(this.#session, item.localId, { ...item.geometry, pointPx: pt });
      g.position.set(pt[0], pt[1]);
    });
    g.on("pointerdown", (e) => { e.stopPropagation(); dragging = true; canvas.stage.on("pointermove", onMove); });
    const stop = async () => {
      if (!dragging) return;
      dragging = false;
      canvas.stage.off("pointermove", onMove);
      await this.#saveSession();
    };
    g.on("pointerup", stop);
    g.on("pointerupoutside", stop);
    this.#handlesContainer.addChild(g);
  }

  #addVertexHandle(item, index, point) {
    const g = this.#makeHandle(point[0], point[1], HANDLE_RADIUS, 0x4fc8d8);
    let dragging = false;
    let welded = [];
    let lastSnap = null;
    const onMove = rafThrottle((e) => {
      if (!dragging) return;
      const p = e.getLocalPosition(this);
      this.#dragRingVertex(item.localId, index, p, g, welded, (snap) => { lastSnap = snap; });
    });
    g.on("pointerdown", (e) => {
      e.stopPropagation();
      // button 2 = right mouse button, per the DOM MouseEvent convention a
      // FederatedPointerEvent carries through -- checked directly on the
      // ordinary pointerdown rather than relying on a separate "rightdown"
      // event. Found live: whatever "rightdown" is in this Foundry/PIXI
      // build, right-clicking a handle never reached it (delete silently
      // did nothing); pointerdown fires for every button and reports which
      // one reliably, so branching on `.button` here is the safer bet.
      if (e.button === 2) {
        this.#deleteVertex(item.localId, index);
        return;
      }
      dragging = true;
      welded = item.tier === "region" ? this.#findWeldedVertices(item.localId, point[0], point[1]) : [];
      canvas.stage.on("pointermove", onMove);
    });
    const stop = async () => {
      if (!dragging) return;
      dragging = false;
      canvas.stage.off("pointermove", onMove);
      this.#splitTargetEdge(lastSnap);
      await this.#saveSession();
      this.#render();
      this.#renderHandles();
    };
    g.on("pointerup", stop);
    g.on("pointerupoutside", stop);
    // Suppress the browser's own context menu over a handle -- without
    // this, right-clicking to delete also pops a native menu on top.
    g.on("rightup", (e) => e.stopPropagation());
    this.#handlesContainer.addChild(g);
  }

  #addMidpointHandle(item, afterIndex, point) {
    const g = this.#makeHandle(point[0], point[1], MIDPOINT_RADIUS, 0x2f6a48);
    let dragging = false;
    let inserted = false;
    let welded = [];
    let lastSnap = null;
    const realIndex = () => afterIndex + 1;
    const onMove = rafThrottle((e) => {
      if (!dragging || !inserted) return;
      const p = e.getLocalPosition(this);
      this.#dragRingVertex(item.localId, realIndex(), p, g, welded, (snap) => { lastSnap = snap; });
    });
    g.on("pointerdown", (e) => {
      e.stopPropagation();
      dragging = true;
      const current = this.#session.items[item.localId];
      const ring = [...current.geometry.ringPx];
      ring.splice(realIndex(), 0, [point[0], point[1]]);
      this.#session = updateItemGeometry(this.#session, item.localId, { ...current.geometry, ringPx: ring });
      inserted = true;
      welded = item.tier === "region" ? this.#findWeldedVertices(item.localId, point[0], point[1]) : [];
      canvas.stage.on("pointermove", onMove);
    });
    const stop = async () => {
      if (!dragging) return;
      dragging = false;
      canvas.stage.off("pointermove", onMove);
      if (inserted) {
        this.#splitTargetEdge(lastSnap);
        await this.#saveSession();
        this.#render();
        this.#renderHandles();
      }
    };
    g.on("pointerup", stop);
    g.on("pointerupoutside", stop);
    this.#handlesContainer.addChild(g);
  }

  /** Shared by vertex and midpoint drags once a real ring index exists to move. */
  #dragRingVertex(localId, index, point, handleGraphic, welded, onSnap) {
    const item = this.#session.items[localId];
    if (!item) return;
    const snapped = item.tier === "region" ? this.#snapRegionPoint(localId, point.x, point.y) : null;
    onSnap(snapped);
    const finalPoint = snapped ? { x: snapped.x, y: snapped.y } : { x: point.x, y: point.y };
    const ring = item.geometry.ringPx.map((p, i) => (i === index ? [finalPoint.x, finalPoint.y] : p));
    this.#session = updateItemGeometry(this.#session, localId, { ...item.geometry, ringPx: ring });
    handleGraphic.position.set(finalPoint.x, finalPoint.y);
    for (const w of welded) {
      const other = this.#session.items[w.localId];
      if (!other) continue;
      const otherRing = other.geometry.ringPx.map((p, i) => (i === w.index ? [finalPoint.x, finalPoint.y] : p));
      this.#session = updateItemGeometry(this.#session, w.localId, { ...other.geometry, ringPx: otherRing });
    }
    // The shape outline redraws live on every throttled move; handle
    // positions are moved directly above rather than through a full
    // #renderHandles() rebuild, which would also refire nothing here (no
    // selection change) but would destroy/recreate every handle on every
    // frame for no reason.
    this.#render();
  }

  /** Right-click a vertex: remove it, and every welded neighbour's copy too -- a polygon (region or not) never drops below 3 points. */
  #deleteVertex(localId, index) {
    const item = this.#session.items[localId];
    if (!item) return;
    const ring = item.geometry.ringPx;
    const [x, y] = ring[index];
    const welded = item.tier === "region" ? this.#findWeldedVertices(localId, x, y) : [];
    if (ring.length <= 3 || welded.some((w) => this.#session.items[w.localId]?.geometry.ringPx.length <= 3)) {
      this.#report("a polygon needs at least three points", { now: true });
      return;
    }
    const nextRing = ring.filter((_, i) => i !== index);
    this.#session = updateItemGeometry(this.#session, localId, { ...item.geometry, ringPx: nextRing });
    for (const w of welded) {
      const other = this.#session.items[w.localId];
      const otherRing = other.geometry.ringPx.filter((_, i) => i !== w.index);
      this.#session = updateItemGeometry(this.#session, w.localId, { ...other.geometry, ringPx: otherRing });
    }
    this.#saveSession();
    this.#render();
    this.#renderHandles();
  }

  /* ------------------------------------------------------------------ */
  /*  Hit testing -- draw.js#hitTestAt, unchanged rule                    */
  /* ------------------------------------------------------------------ */

  /** This session's drawing under (x, y), as `{ id, area, dist }` (a pin within reach has area 0 and beats any polygon), or null. */
  #hitTestAt(x, y, include = () => true) {
    let best = null;
    const pinRadius = this.#px(HIT_PIN_RADIUS_SCREEN_PX);
    for (const item of sessionItemList(this.#session)) {
      if (!include(item.tier)) continue;
      if (item.geometry.kind === "point") {
        const [px, py] = item.geometry.pointPx;
        const dist = Math.hypot(px - x, py - y);
        if (dist <= pinRadius && (!best || best.area > 0 || dist < best.dist)) best = { id: item.localId, area: 0, dist };
        continue;
      }
      const ring = item.geometry.ringPx.map(([rx, ry]) => ({ x: rx, y: ry }));
      if (pointInRing(x, y, ring)) {
        const area = polygonArea(ring);
        if (!best || (best.area > 0 && area < best.area)) best = { id: item.localId, area, dist: 0 };
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /*  Foundry interaction callbacks                                       */
  /*                                                                      */
  /*  Every one of them is guarded (#guard): Foundry calls these inside   */
  /*  MouseInteractionManager transitions, and an exception thrown there  */
  /*  skips the manager's own state reset -- the canvas stays "mid-drag"  */
  /*  until reload. A bug in a drawing tool must cost a console error,    */
  /*  never the GM's ability to pan.                                      */
  /* ------------------------------------------------------------------ */

  #guard(label, fn) {
    try {
      return fn();
    } catch (err) {
      console.error(`Blank Inheritance | Location Editor ${label} failed:`, err);
      this.#report(`${label} failed -- see console`, { now: true });
      return undefined;
    }
  }

  async #guardAsync(label, fn) {
    try {
      return await fn();
    } catch (err) {
      console.error(`Blank Inheritance | Location Editor ${label} failed:`, err);
      this.#report(`${label} failed -- see console`, { now: true });
      return undefined;
    }
  }

  #shiftKey(event) {
    return Boolean(event?.shiftKey ?? event?.nativeEvent?.shiftKey ?? event?.data?.originalEvent?.shiftKey);
  }

  #ctrlKey(event) {
    return Boolean(event?.ctrlKey ?? event?.metaKey ?? event?.nativeEvent?.ctrlKey ?? event?.nativeEvent?.metaKey);
  }

  _onClickLeft(event) {
    this.#guard("click", () => {
      const p = event.interactionData.origin;
      // A FederatedPointerEvent carries the native modifier keys directly per
      // the DOM UIEvent interface it implements; event.data.originalEvent is a
      // defensive fallback in case this Foundry build wraps it differently.
      const shiftKey = this.#shiftKey(event);
      if (this.#tool === "polygon" || this.#tool === "lasso" || this.#tool === "bisect") {
        this.#addDraftPoint(p, shiftKey);
        return;
      }
      if (this.#tool === "point") {
        this.#commitPoint([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
        return;
      }
      if (this.#tool === "pick") this.#armPick(p, shiftKey);
    });
  }

  /**
   * Foundry reports a left "click" on the pointer's PRESS, before it can know
   * whether the pointer is about to drag. A map has to pan when you drag it
   * from anywhere -- including from the middle of a building -- without the
   * building being selected, so the pick tool waits: the press is remembered,
   * a drag cancels it (_onDragLeftStart), and only a release that never
   * became a drag picks.
   */
  #armPick(p, additive) {
    this.#disarmPick();
    this.#pendingPick = { p: { x: p.x, y: p.y }, additive };
    canvas.stage?.on?.("pointerup", this.#onPickRelease);
    canvas.stage?.on?.("pointerupoutside", this.#disarmPick);
  }

  #onPickRelease = () => {
    const pending = this.#pendingPick;
    this.#disarmPick();
    if (pending) this.#guard("pick", () => this.#pickAt(pending.p, pending.additive));
  };

  #disarmPick = () => {
    this.#pendingPick = null;
    canvas.stage?.off?.("pointerup", this.#onPickRelease);
    canvas.stage?.off?.("pointerupoutside", this.#disarmPick);
  };

  /**
   * A click with the pick tool: this session's own drawings first, then an
   * existing location (which is opened into the session, so it can be edited),
   * and empty ground clears the selection. Shift adds to / removes from the
   * selection instead -- a shift-click on empty ground deliberately does
   * nothing (draw.js#toggle's own rule: a plain background click already means
   * "clear", so Shift's whole point is "don't").
   */
  #pickAt(p, additive) {
    if (this.#assign) {
      this.#assignAt(p, additive);
      return;
    }
    const hit = this.#topHitAt(p.x, p.y);
    if (hit?.id) {
      if (additive) this.toggleSelection(hit.id);
      else this.selectItem(hit.id);
      return;
    }
    if (hit?.building) {
      this.adoptBuildingPick(buildingPick(hit.building).building);
      return;
    }
    const shape = hit?.shape;
    if (shape) {
      const { session, item } = adoptPublished(this.#session, shape);
      this.#session = session;
      this.#setSelection(additive ? [...this.#selectedIds, item.localId] : [item.localId]);
      this.#report(`${shape.name ?? shape.id} -- ${shape.tier}${shape.kind ? ` · ${shape.kind}` : ""}`, { now: true });
      return;
    }
    if (!additive) this.selectItem(null);
  }

  _onClickLeft2(event) {
    this.#guard("double-click", () => {
      if (!this.#drafting) return;
      // A double-click is, at the DOM/PIXI level, still a real first single
      // click followed by the double-click recognition -- _onClickLeft always
      // fires for that first click before this does, adding a real point
      // essentially on top of the one already there. Found live: finishing a
      // 4-point polygon by double-clicking its last corner produced a 5-point
      // ring, the last two points ~1px apart. Harmless to the shape's own
      // outline, but a real duplicate point all the same, and exactly the
      // kind of thing draw.js's own "does this reproduce the bug" review
      // habit exists to catch. Dropped here if it's clearly that phantom
      // click and not a real, deliberately tiny final segment.
      const pts = this.#drafting.points;
      // Bisect's own minimum is 2 points, not polygon/lasso's 3, so the same
      // phantom-point dedupe kicks in one point earlier for it.
      const dedupeAbove = this.#tool === "bisect" ? 2 : 3;
      if (pts.length > dedupeAbove) {
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        // A screen-space tolerance, not a flat scene-px one -- found live,
        // the hard way: at a zoomed-OUT view, two clicks a real ~22 scene-px
        // apart (the two halves of one double-click) looked like they landed
        // on the very same screen pixel, and a flat scene-px threshold small
        // enough to be safe at full zoom missed this one completely.
        const screenDist = Math.hypot(last.x - prev.x, last.y - prev.y) * this.#scale();
        if (screenDist < 15) pts.pop();
      }
      if (this.#tool === "lasso") this.#finishLasso();
      else if (this.#tool === "bisect") this.#finishBisect();
      else this.#finishDraft();
    });
  }

  /**
   * Left-drag, per tool: rect/circle draw a shape; the pick tool PANS the map
   * (the gazetteer's own feel -- drag the ground to move it) and Shift-drag
   * draws a selection box instead (Ctrl as well adds to the selection).
   * Every other tool is clicks only and refuses the drag up front, so the
   * manager never enters a drag it has no use for. Right-drag still pans
   * everywhere, as in all of Foundry.
   */
  _canDragLeftStart() {
    return DRAG_TOOL_SET.has(this.#tool);
  }

  _onDragLeftStart(event) {
    this.#guard("drag start", () => {
      this.#disarmPick();
      this.#endDrag();
      const data = event.interactionData;
      if (!data?.origin || !this.#draftContainer || this.#draftContainer.destroyed) return;
      const origin = { x: data.origin.x, y: data.origin.y };
      if (this.#tool === "pick" && !this.#shiftKey(event)) {
        const screen = data.screenOrigin ?? event.global;
        this.#drag = {
          kind: "pan",
          pivot: { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y },
          screen: { x: screen.x, y: screen.y }
        };
        this.#applyCursor();
        return;
      }
      this.#drag = { kind: this.#tool === "pick" ? "marquee" : "shape", origin };
      this.#dragPreview = this.#draftContainer.addChild(new PIXI.Graphics());
    });
  }

  _onDragLeftMove(event) {
    this.#guard("drag move", () => {
      const drag = this.#drag;
      if (!drag) return;
      if (drag.kind === "pan") {
        // Absolute from where the drag began (the pointer's screen position
        // against the pivot it started with), so the map stays exactly under
        // the cursor however many events arrive and however the throttle
        // slices them -- no accumulating drift, no feedback from the pan
        // itself moving the coordinates the next event is measured in.
        const scale = this.#scale();
        canvas.pan({
          x: drag.pivot.x - (event.global.x - drag.screen.x) / scale,
          y: drag.pivot.y - (event.global.y - drag.screen.y) / scale
        });
        return;
      }
      const end = event.interactionData?.destination;
      const g = this.#dragPreview;
      if (!end || !g || g.destroyed) return;
      const start = drag.origin;
      const ring = drag.kind === "marquee" || this.#tool === "rect" ? rectRing(start, end) : circleRing(start, end);
      g.clear();
      g.lineStyle(this.#px(DRAFT_STYLE.weight), DRAFT_STYLE.color, 1);
      g.beginFill(DRAFT_STYLE.color, DRAFT_STYLE.fillAlpha);
      g.drawPolygon(flat(ring));
      g.endFill();
      if (drag.kind === "marquee") {
        this.#report("release to select the items inside the box -- add Ctrl to add to the current selection");
        return;
      }
      const dx = end.x - start.x, dy = end.y - start.y;
      this.#report(this.#tool === "circle"
        ? `radius ${Math.round(Math.hypot(dx, dy))}px -- release to finish`
        : `${Math.round(Math.abs(dx))}x${Math.round(Math.abs(dy))}px -- release to finish`);
    });
  }

  _onDragLeftDrop(event) {
    return this.#guardAsync("drag drop", async () => {
      // Taken and cleared FIRST and synchronously: Foundry always follows a
      // drop with _onDragLeftCancel, and the first version destroyed the
      // preview in both -- the second destroy threw inside the manager.
      const drag = this.#drag;
      this.#endDrag();
      if (!drag || drag.kind === "pan") return;
      const start = drag.origin;
      const end = event.interactionData?.destination;
      this.#report("", { now: true });
      const tooSmall = this.#px(CLICK_VS_DRAG_SCREEN_PX);
      const isClick = !start || !end || (Math.abs(end.x - start.x) < tooSmall && Math.abs(end.y - start.y) < tooSmall);
      if (drag.kind === "marquee") {
        // A plain click (no real drag) already ran through _onClickLeft's own
        // hit-test/toggle/clear logic above -- there is nothing left to do
        // here for that case, matching draw.js#beginMarquee's own up()
        // (a sub-4px release falls back to a bare hit-test rather than an
        // empty-box "select nothing").
        if (isClick) return;
        const rect = {
          x0: Math.min(start.x, end.x), y0: Math.min(start.y, end.y),
          x1: Math.max(start.x, end.x), y1: Math.max(start.y, end.y)
        };
        const ids = itemsInRect(sessionItemList(this.#session), rect);
        const add = this.#ctrlKey(event);
        this.#setSelection(add ? [...this.#selectedIds, ...ids] : ids);
        this.#report(`${ids.length} item(s) ${add ? "added to the selection" : "selected"}`, { now: true });
        return;
      }
      if (isClick) {
        this.#report(`drag to draw a ${this.#tool === "rect" ? "rectangle" : "circle"} -- a click alone has no size`, { now: true });
        return;
      }
      const ring = this.#tool === "rect" ? rectRing(start, end) : circleRing(start, end);
      await this.#commitShape(this.#tool, ring);
    });
  }

  _onDragLeftCancel() {
    this.#guard("drag cancel", () => this.#endDrag());
  }

  /** End whatever left-drag is in flight, clearing its preview exactly once -- safe to call any number of times, in any state. */
  #endDrag() {
    const preview = this.#dragPreview;
    this.#drag = null;
    this.#dragPreview = null;
    if (preview && !preview.destroyed) {
      preview.parent?.removeChild(preview);
      preview.destroy();
    }
    this.#applyCursor();
  }

  /**
   * Foundry's real "Escape"/dismiss dispatch -- InteractionLayer's own
   * override point (returns false by default), reached via
   * client-keybindings.mjs's Case 5 for the active layer. This used to be
   * a method called "_handleKeyDown" that nothing in Foundry has ever
   * called -- not a real override point, just a name that looked plausible
   * -- found live testing Lasso's own Enter-to-finish path (design doc §9).
   * Cancels an in-progress draft; with nothing drafting, this layer has
   * nothing of its own left to dismiss. (An open panel gets Escape first and
   * would close; it asks hasEscapableState() before agreeing to.)
   */
  _onDismissKey() {
    if (!this.hasEscapableState()) return false;
    if (this.#assign) this.disarmAssign({ cancelled: true });
    else if (this.#drafting || this.#drag) this.cancelInProgress();
    else this.clearSelection();
    return true;
  }

  /**
   * Foundry's real "Delete"/Backspace dispatch -- the same InteractionLayer
   * override point Foundry's own layers use to delete a selected
   * placeable. While drafting, Backspace undoes the last placed point
   * instead, exactly draw.js's own Backspace behaviour -- just reached
   * through the correct Foundry hook this time, not the fake one above.
   * Not drafting: nothing of this layer's own for a keypress to delete (the
   * panel's own trash buttons own that), so this falls through untouched.
   */
  _onDeleteKey() {
    if (!this.active || !this.#drafting) return false;
    this.#undoPoint();
    return true;
  }

  /**
   * Enter -- finish the current draft. Foundry has no built-in layer
   * dispatch for this at all (only Escape/"dismiss" and Delete are real
   * InteractionLayer override points -- there is no "confirm" equivalent
   * anywhere in client-keybindings.mjs), so this is reached instead through
   * a real keybinding this module registers itself, registerLocationDrawKeybindings() below.
   */
  finishDraftKey() {
    if (!this.active || !this.#drafting) return false;
    if (this.#tool === "lasso") this.#finishLasso();
    else if (this.#tool === "bisect") this.#finishBisect();
    else this.#finishDraft();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  The Story list's two hooks into the map                             */
  /*                                                                      */
  /*  focus: "show me where that is" -- outline one location, label it,   */
  /*  bring the camera to it. assign: "put it THERE" -- the next click on */
  /*  an existing location is handed back instead of opening it.          */
  /* ------------------------------------------------------------------ */

  /**
   * What a pick for a scene's place may take at (x, y): `{ shape }` (an existing location) or `{ building }` (a real footprint that is not a
   * place yet), or null. Two targets, so a district is never taken by accident and a building is never out of reach (the first version
   * fell back to the district whenever no listed place was under the click, and real buildings were not on the map at all):
   *   "places"  a building or pin that already is a place, else a real building (adopted when chosen). Never a district.
   *   "areas"   a district. Nothing else.
   * `preferArea` (Shift) takes the other target for this one click.
   */
  #locationAt(x, y, preferArea) {
    const target = (this.#assignTarget === "areas") !== Boolean(preferArea) ? "areas" : "places";
    const pinRadius = this.#px(HIT_PIN_RADIUS_SCREEN_PX);
    const shown = (shape) => publishedVisible(shape, this.#visibility);
    if (target === "areas") {
      if (!this.#publishedUsable()) return null;
      const shape = hitTestPublished(this.#published, x, y, { pinRadius, include: (s) => shown(s) && s.tier === "region" });
      return shape ? { shape } : null;
    }
    if (this.#publishedUsable()) {
      const shape = hitTestPublished(this.#published, x, y, { pinRadius, include: (s) => shown(s) && s.tier !== "region" });
      if (shape) return { shape };
    }
    const building = this.#buildingAt(x, y);
    return building ? { building } : null;
  }

  /**
   * Wait for the GM to click the place something should happen at. The click is handed to `onPick(...)` and the wait ends: for a place that
   * exists, `{ locationId, name, tier }`; for a real building that is not one yet, `{ building, tier: "site", name }` (the caller adopts it).
   * Escape (or any other tool) ends it with `onCancel()`. `target` is "places" (a building or a pin; the default) or "areas"; Shift takes the
   * other for one click.
   */
  armAssign({ label = "", onPick, onCancel = null, target = "places" } = {}) {
    this.disarmAssign({ cancelled: true });
    if (!this.active) this.activate({ tool: "pick" });
    if (this.#tool !== "pick") this.setTool("pick");
    this.#assign = { label, onPick, onCancel };
    this.#assignTarget = target === "areas" ? "areas" : "places";
    this.clearSelection();
    this.#applyCursor();
    this.#renderAll();
    this.#report(game.i18n?.format?.("BLANKINHERITANCE.LocationEditor.Story.Armed", { label }) ?? "", { now: true });
  }

  /** Switch what the wait takes ("places" | "areas"): the outlines re-dim so what can be picked is what is bright. */
  setAssignTarget(target) {
    this.#assignTarget = target === "areas" ? "areas" : "places";
    this.#setHover(null);
    if (this.#assign) this.#renderAll();
    this.#onPublishedChange?.(this.publishedSummary);
  }

  get assignTarget() {
    return this.#assignTarget;
  }

  /** End the wait (the click was taken, or it was abandoned). `cancelled` also tells whoever asked. */
  disarmAssign({ cancelled = false } = {}) {
    const arm = this.#assign;
    if (!arm) return;
    this.#assign = null;
    this.#setHover(null);
    this.#applyCursor();
    this.#renderAll();
    this.#report(this.#hintFor(this.#tool), { now: true });
    if (cancelled) arm.onCancel?.();
  }

  get assignArmed() {
    return Boolean(this.#assign);
  }

  #assignAt(p, preferArea) {
    const hit = this.#locationAt(p.x, p.y, preferArea);
    if (!hit) {
      const areas = (this.#assignTarget === "areas") !== Boolean(preferArea);
      this.#report(game.i18n?.localize?.(areas ? "BLANKINHERITANCE.LocationEditor.Story.NoAreaThere" : "BLANKINHERITANCE.LocationEditor.Story.NothingThere") ?? "", { now: true });
      return;
    }
    const arm = this.#assign;
    this.disarmAssign();
    this.#guard("place", () => arm.onPick(hit.building
      ? buildingPick(hit.building)
      : { locationId: hit.shape.id, name: hit.shape.name ?? hit.shape.id, tier: hit.shape.tier }));
  }

  /**
   * Show the GM where a location is: outline it, label it with `label`, and
   * (unless `pan` is false) bring the camera to it beside the panel. Returns
   * false when the location is not drawable on this scene.
   */
  focusLocation(locationId, { label = "", pan = true } = {}) {
    const shape = this.#publishedUsable() ? this.#published.find((s) => s.id === locationId) : null;
    if (!shape) {
      this.clearFocus();
      return false;
    }
    this.#focus = { locationId, label };
    this.#renderFocus();
    if (pan) {
      const screen = canvas.app?.screen;
      const box = shape.pointScene
        ? { x0: shape.pointScene.x - 200, y0: shape.pointScene.y - 200, x1: shape.pointScene.x + 200, y1: shape.pointScene.y + 200 }
        : shape.bounds;
      if (screen && box) {
        const target = fitView(box, screen.width, screen.height, { margin: 0.4, insetLeft: this.#getViewInset?.()?.left ?? 0 });
        if (target) canvas.animatePan({ ...target, scale: Math.min(target.scale, 2.5), duration: 600 });
      }
    }
    return true;
  }

  clearFocus() {
    if (!this.#focus) return;
    this.#focus = null;
    this.#renderFocus();
  }

  get focusedId() {
    return this.#focus?.locationId ?? null;
  }

  #renderFocus() {
    const container = this.#focusContainer;
    if (!container || container.destroyed) return;
    emptyContainer(container);
    const focus = this.#focus;
    if (!focus || !this.active) return;
    const shape = this.#published.find((s) => s.id === focus.locationId);
    if (!shape || canvas.scene?.id !== this.#publishedSceneId) return;
    const g = new PIXI.Graphics();
    g.lineStyle(this.#px(4), FOCUS_COLOR, 1);
    if (shape.pointScene) {
      g.beginFill(FOCUS_COLOR, 0.25);
      g.drawCircle(shape.pointScene.x, shape.pointScene.y, this.#px(13));
      g.endFill();
    } else {
      g.beginFill(FOCUS_COLOR, 0.2);
      g.drawPolygon(flat(shape.ringsScene[0]));
      for (const hole of shape.ringsScene.slice(1)) {
        g.beginHole();
        g.drawPolygon(flat(hole));
        g.endHole();
      }
      g.endFill();
    }
    container.addChild(g);
    const anchor = shape.pointScene ?? { x: (shape.bounds.x0 + shape.bounds.x1) / 2, y: shape.bounds.y0 };
    const text = new PIXI.Text(`${focus.label ? `${focus.label}\n` : ""}${shape.name ?? shape.id}`, {
      fontFamily: "Signika, sans-serif", fontSize: 15, fontWeight: "700", fill: 0xffffff, stroke: 0x6b0f5a, strokeThickness: 5, lineJoin: "round", align: "center"
    });
    text.resolution = canvas.app?.renderer?.resolution ?? 1;
    text.scale.set(1 / this.#scale());
    text.anchor.set(0.5, 1);
    text.position.set(anchor.x, anchor.y - this.#px(shape.pointScene ? 18 : 8));
    container.addChild(text);
  }

  /* ------------------------------------------------------------------ */
  /*  Hover                                                               */
  /* ------------------------------------------------------------------ */

  /** Called by Foundry's own mouse-move dispatch (registered in _draw); only the pick tool hovers. */
  #onMouseMove(position) {
    if (!this.active || this.#tool !== "pick" || this.#drag) {
      if (this.#hover) this.#setHover(null);
      return;
    }
    this.#guard("hover", () => {
      if (this.#assign) {
        const found = this.#locationAt(position.x, position.y, false);
        this.#setHover(found?.building ? buildingAsShape(found.building) : found?.shape ?? null, position);
        return;
      }
      const hit = this.#topHitAt(position.x, position.y);
      this.#setHover(hit?.building ? buildingAsShape(hit.building) : hit?.shape ?? null, position);
    });
  }

  #setHover(shape, position) {
    const same = shape && this.#hover && shape.id === this.#hover.id;
    if (same) {
      if (position && this.#hoverLabel && !this.#hoverLabel.destroyed) this.#placeLabel(position);
      return;
    }
    this.#hover = shape ?? null;
    this.#renderHover(position);
  }

  #placeLabel(position) {
    const label = this.#hoverLabel;
    if (!label || label.destroyed) return;
    label.position.set(position.x + this.#px(14), position.y - this.#px(12));
  }

  #renderHover(position) {
    emptyContainer(this.#overlayContainer);
    this.#hoverLabel = null;
    const shape = this.#hover;
    if (!shape || !this.#overlayContainer || this.#overlayContainer.destroyed) return;
    const g = new PIXI.Graphics();
    g.lineStyle(this.#px(3), HOVER_COLOR, 1);
    if (shape.pointScene) {
      g.drawCircle(shape.pointScene.x, shape.pointScene.y, this.#px(11));
    } else {
      g.beginFill(HOVER_COLOR, 0.14);
      g.drawPolygon(flat(shape.ringsScene[0]));
      for (const hole of shape.ringsScene.slice(1)) {
        g.beginHole();
        g.drawPolygon(flat(hole));
        g.endHole();
      }
      g.endFill();
    }
    this.#overlayContainer.addChild(g);
    // a real building that is not a place yet: say what a click on it does
    const detail = [shape.tier, shape.kind, shape.tier === "building" ? (game.i18n?.localize?.("BLANKINHERITANCE.LocationEditor.Published.AdoptHint") ?? "") : ""].filter(Boolean).join(" · ");
    const label = new PIXI.Text(`${shape.name ?? shape.id}\n${detail}`, {
      fontFamily: "Signika, sans-serif",
      fontSize: 14,
      fontWeight: "600",
      fill: 0xffffff,
      stroke: 0x10161c,
      strokeThickness: 4,
      lineJoin: "round"
    });
    label.resolution = canvas.app?.renderer?.resolution ?? 1;
    label.scale.set(1 / this.#scale());
    label.anchor.set(0, 1);
    this.#overlayContainer.addChild(label);
    this.#hoverLabel = label;
    this.#placeLabel(position ?? shape.pointScene ?? { x: shape.bounds.x0, y: shape.bounds.y0 });
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                           */
  /* ------------------------------------------------------------------ */

  /** The zoom changed: redraw at the new scene-px size for each screen-px weight (debounced; panning alone never gets here). */
  onViewChange(scale) {
    // panning alone redraws only the real buildings, and only once the view leaves the box they were drawn for
    if (this.active && scale && scale === this.#renderedScale && this.#buildingsUsable() && !this.#rerenderTimer) {
      const view = this.#viewBox();
      const d = this.#buildingsDrawn;
      if (view && d && (view.x0 < d.x0 || view.y0 < d.y0 || view.x1 > d.x1 || view.y1 > d.y1)) {
        this.#rerenderTimer = setTimeout(() => {
          this.#rerenderTimer = null;
          this.#guard("redraw buildings after a pan", () => this.#renderBuildings());
        }, RERENDER_DEBOUNCE_MS);
      }
      return;
    }
    if (!this.active || !scale || scale === this.#renderedScale) return;
    clearTimeout(this.#rerenderTimer);
    this.#rerenderTimer = setTimeout(() => {
      this.#rerenderTimer = null;
      this.#guard("redraw after zoom", () => this.#renderAll());
    }, RERENDER_DEBOUNCE_MS);
  }

  #renderAll() {
    this.#renderedScale = this.#scale();
    this.#renderBuildings();
    this.#render();
    this.#renderPublished();
    this.#renderHandles();
    this.#renderDraft();
    this.#renderReference();
    this.#renderHover(canvas.mousePosition);
    this.#renderFocus();
  }

  /**
   * "Areas mode" dims every site/point; "Places mode" dims every region --
   * design doc §2's own table, and draw.js's district-focus dimming
   * (everything outside the focus fades toward the map, never disappears
   * outright, so "where am I relative to everything else" is never lost)
   * repurposed for the mode split this tool actually needs, rather than the
   * arbitrary one-district-at-a-time focus the old tool also had. An item
   * being edited stays at full strength regardless of mode, since selecting
   * it to look closer is a stronger statement of intent than the mode toggle.
   */
  #inFocus(item) {
    if (this.#selectedIds.has(item.localId)) return true;
    const mode = modeForTier(this.#pendingTier) ?? "places";
    return MODE_TIERS[mode].includes(item.tier);
  }

  #render() {
    if (!this.#shapesContainer || this.#shapesContainer.destroyed) return;
    emptyContainer(this.#shapesContainer);
    for (const item of sessionItemList(this.#session)) {
      const g = new PIXI.Graphics();
      const dimmed = !this.#inFocus(item);
      const style = this.#selectedIds.has(item.localId) ? SELECTED_STYLE : item.locked ? LOCKED_STYLE : (TIER_STYLE[item.tier] ?? TIER_STYLE.site);
      g.alpha = dimmed ? 0.35 : 1;
      if (item.geometry.kind === "point") {
        const [x, y] = item.geometry.pointPx;
        g.lineStyle(this.#px(2), style.color, 1);
        g.beginFill(style.color, 0.9);
        g.drawCircle(x, y, this.#px(7));
        g.endFill();
      } else {
        g.lineStyle(this.#px(style.weight), style.color, 1);
        g.beginFill(style.color, dimmed ? style.fillAlpha * 0.4 : style.fillAlpha);
        g.drawPolygon(item.geometry.ringPx.flat());
        g.endFill();
      }
      this.#shapesContainer.addChild(g);
    }
  }

  /**
   * Every deployed location that is visible and not already open in the
   * session, one fill+outline Graphics per polygon tier plus one for pins --
   * a few display objects, not 236. Tiers outside the current mode are dimmed,
   * never hidden (same rule as the session's own shapes).
   */
  #renderPublished() {
    const container = this.#publishedContainer;
    if (!container || container.destroyed) return;
    emptyContainer(container);
    container.visible = this.active;
    if (!this.#publishedUsable()) return;
    const open = this.#openLocationIds();
    const mode = this.#assign ? (this.#assignTarget === "areas" ? "areas" : "places") : (modeForTier(this.#pendingTier) ?? "places");
    const shown = this.#published.filter((s) => publishedVisible(s, this.#visibility) && !open.has(s.id));
    for (const tier of ["region", "site"]) {
      const shapes = shown.filter((s) => s.tier === tier && !s.pointScene);
      if (!shapes.length) continue;
      const style = PUBLISHED_STYLE[tier];
      const g = new PIXI.Graphics();
      g.alpha = MODE_TIERS[mode].includes(tier) ? 1 : 0.45;
      for (const shape of shapes) {
        g.lineStyle(0);
        g.beginFill(style.color, style.fillAlpha);
        g.drawPolygon(flat(shape.ringsScene[0]));
        for (const hole of shape.ringsScene.slice(1)) {
          g.beginHole();
          g.drawPolygon(flat(hole));
          g.endHole();
        }
        g.endFill();
      }
      g.lineStyle(this.#px(style.weight), style.color, 0.95);
      for (const shape of shapes) for (const ring of shape.ringsScene) g.drawPolygon(flat(ring));
      container.addChild(g);
    }
    const pins = shown.filter((s) => s.pointScene);
    if (pins.length) {
      const style = PUBLISHED_STYLE.point;
      const g = new PIXI.Graphics();
      g.alpha = MODE_TIERS[mode].includes("point") ? 1 : 0.45;
      g.lineStyle(this.#px(1.5), 0xffffff, 1);
      g.beginFill(style.color, 0.95);
      for (const pin of pins) g.drawCircle(pin.pointScene.x, pin.pointScene.y, this.#px(style.radius));
      g.endFill();
      container.addChild(g);
    }
  }

  /** The Bisect tool's own reference outline -- see loadReferenceRegion's own comment. */
  #renderReference() {
    if (!this.#referenceContainer || this.#referenceContainer.destroyed) return;
    emptyContainer(this.#referenceContainer);
    if (!this.#referenceRegion) return;
    const g = new PIXI.Graphics();
    g.lineStyle(this.#px(REFERENCE_STYLE.weight), REFERENCE_STYLE.color, 1);
    g.drawPolygon(flat(this.#referenceRegion.ringScene));
    this.#referenceContainer.addChild(g);
  }

  #renderDraft() {
    if (!this.#draftContainer || this.#draftContainer.destroyed) return;
    // A marquee/shape drag draws into the same container; a re-render must
    // not orphan its preview Graphics (the layer still owns and ends it).
    const keep = this.#dragPreview && !this.#dragPreview.destroyed ? this.#dragPreview : null;
    if (keep) keep.parent?.removeChild(keep);
    emptyContainer(this.#draftContainer);
    if (keep) this.#draftContainer.addChild(keep);
    if (!this.#drafting || this.#drafting.points.length === 0) return;
    const pts = this.#drafting.points;
    // Bisect draws an OPEN cut line -- draw.js's own isLineTool() carve-out
    // -- never closed or filled like a polygon/lasso ring, no matter how
    // many points it has.
    const isLine = this.#tool === "bisect";
    const g = new PIXI.Graphics();
    if (pts.length >= 2) {
      g.lineStyle(this.#px(DRAFT_STYLE.weight), DRAFT_STYLE.color, 1);
      if (!isLine && pts.length >= 3) g.beginFill(DRAFT_STYLE.color, DRAFT_STYLE.fillAlpha);
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      if (!isLine && pts.length >= 3) { g.closePath(); g.endFill(); }
    }
    for (const p of pts) {
      g.beginFill(DRAFT_STYLE.color, 1);
      g.drawCircle(p.x, p.y, this.#px(4));
      g.endFill();
    }
    this.#draftContainer.addChild(g);
    if (isLine) {
      this.#report(pts.length >= 2
        ? `${pts.length} points -- Enter to cut, Esc to cancel, Backspace to undo a point`
        : "1 point -- need at least 2, both ends on the region's own border");
      return;
    }
    if (pts.length >= 3) {
      const verb = this.#tool === "lasso" ? "select" : "finish";
      this.#report(`${pts.length} points · ${Math.round(polygonArea(pts))} px² -- Enter to ${verb}, Esc to cancel, Backspace to undo a point`);
    } else {
      this.#report(`${pts.length} point${pts.length === 1 ? "" : "s"} -- need at least 3`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cursor and status                                                   */
  /* ------------------------------------------------------------------ */

  /** The drawing tools show a crosshair over the whole map and a pan shows a closed hand (PIXI sets the cursor inline, so the stylesheet overrides it with !important -- styles/bi-components.css). */
  #applyCursor() {
    const list = canvas.app?.view?.classList;
    if (!list) return;
    list.remove("bi-loc-crosshair", "bi-loc-grabbing");
    if (!this.active) return;
    if (this.#drag?.kind === "pan") list.add("bi-loc-grabbing");
    else if (this.#tool !== "pick" || this.#assign) list.add("bi-loc-crosshair");
  }

  #hintFor(tool) {
    const key = TOOL_DEFS[tool]?.hint;
    return key ? (game.i18n?.localize?.(key) ?? "") : "";
  }

  /**
   * The panel re-renders on every status change, so a drag that reports its
   * size on every pointer move would re-render it dozens of times a second;
   * messages are coalesced to one per STATUS_THROTTLE_MS unless `now`.
   */
  #report(text, { now = false } = {}) {
    this.#statusWanted = text ?? "";
    const flush = () => {
      clearTimeout(this.#statusTimer);
      this.#statusTimer = null;
      if (this.#statusWanted === this.#statusShown) return;
      this.#statusShown = this.#statusWanted;
      this.#onStatus?.(this.#statusShown);
    };
    if (now) { flush(); return; }
    if (this.#statusTimer) return;
    this.#statusTimer = setTimeout(flush, STATUS_THROTTLE_MS);
  }
}

/** Registered once, from blank-inheritance.mjs's init hook. */
export function registerLocationDrawLayer() {
  CONFIG.Canvas.layers.locationDraw = { layerClass: LocationDrawLayer, group: "interface" };
}

/**
 * Enter, to finish a draft -- the one draft-session shortcut with no real
 * Foundry layer-dispatch point to reach through (see finishDraftKey's own
 * comment). Escape and Backspace reuse Foundry's own real "dismiss"/"delete"
 * dispatch instead (_onDismissKey/_onDeleteKey above) rather than adding
 * more custom keybindings here -- Backspace in particular is already core's
 * own "delete" keybinding (client-keybindings.mjs), so a second registration
 * on the same key would only risk firing twice.
 */
export function registerLocationDrawKeybindings() {
  game.keybindings.register(MODULE_ID, "location-draw-finish", {
    name: game.i18n.localize("BLANKINHERITANCE.LocationEditor.Keybinding.Finish"),
    editable: [{ key: "Enter" }],
    restricted: true,
    onDown: () => canvas.locationDraw?.finishDraftKey() ?? false
  });
}
