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
 * snap-and-weld, district focus dimming, and (this pass) marquee (drag-box)
 * and lasso (freehand) multi-select -- draw.js's own "select-items" marquee
 * kind and its "lasso" tool, restricted here to session items only (no
 * not-yet-adopted real building can be swept in the same gesture yet -- that
 * needs the buildings index, Phase 2/3, not yet built, design doc §8).
 *
 * Coordinates: everything here is the Scene's own canvas pixels --
 * `event.interactionData.origin` already gives Foundry canvas coordinates
 * directly, so (unlike draw.js, which had to manage its own CRS.Simple
 * image-pixel<->latlng mapping) there is no coordinate translation to do
 * while drawing at all. The one conversion this design still needs --
 * scene pixels -> master-image pixels -- happens once, at save time,
 * in foundry/location-editor.mjs, via the already-built toImagePoint().
 */

import { addDraftItem, emptySession, isValidSession, itemsInPolygon, itemsInRect, linkItemToLocation, MODE_TIERS, modeForTier, pointInRing, removeItem, sessionItemList, updateItemFields, updateItemGeometry } from "../core/location-editor.mjs";
import { fetchModuleJson, writeStorageJson } from "./io.mjs";

// InteractionLayer is Foundry's own base class for a canvas layer with real
// user interaction -- the same one Regions/Drawings/Walls extend, exposed to
// module authors under the `foundry` namespace the same way
// `foundry.applications.api.ApplicationV2` already is elsewhere in this
// module (foundry/admin-panel.mjs). Not a bare global: this class lives under
// `client/canvas/layers/base/`, re-exported through `foundry.canvas.layers`.
const { InteractionLayer } = foundry.canvas.layers;

const MODULE_ID = "blank-inheritance";
const SESSION_STORAGE_NAME = "location-draw-session.json";

const TIER_STYLE = {
  region: { color: 0xac8a4d, weight: 3, fillAlpha: 0.10 },
  site: { color: 0xd1402a, weight: 2, fillAlpha: 0.18 },
  point: { color: 0xd1402a, weight: 2, fillAlpha: 0.30 }
};
const SELECTED_STYLE = { color: 0x4fc8d8, weight: 3, fillAlpha: 0.25 };
const LOCKED_STYLE = { color: 0x3d6b47, weight: 2, fillAlpha: 0.22 };
const DRAFT_STYLE = { color: 0x4fc8d8, weight: 2, fillAlpha: 0.12 };
// A real, already-promoted region loaded as the Bisect tool's own cut
// target -- amber, matching the advisory-text colour elsewhere in this
// panel (bi-components.css's --warn), since it reads the same way: "real,
// informational, not something you can reshape directly here."
const REFERENCE_STYLE = { color: 0xe0a24a, weight: 2 };

// draw.js's own tuned constant -- 22.5 degrees, relative to the first drawn
// edge, not a compass direction (design doc §3.2). Unchanged.
const ANGLE_SNAP_STEP = Math.PI / 8;
const CIRCLE_DRAFT_POINTS = 32;
const CLICK_VS_DRAG_PX = 4;
const HIT_PIN_RADIUS_PX = 15;
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

export class LocationDrawLayer extends InteractionLayer {
  #tool = "select";
  #drafting = null; // { points: [{x,y}], mode: "polygon" } -- rect/circle never set this, they're one drag each; lasso reuses this same state, see #finishLasso
  #session = emptySession();
  #selectedIds = new Set();
  #shapesContainer;
  #draftContainer;
  #handlesContainer;
  #referenceContainer;
  #referenceRegion = null; // { locationId, ringScene: [{x,y}, ...] } -- a real, already-promoted region loaded for the Bisect tool, design doc §10 phase 2c
  #onSessionChange = null;
  #onSelectionChange = null;
  #onStatus = null;
  #onBisectReady = null;
  #sessionLoaded = false;

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
    this.#shapesContainer = this.addChild(new PIXI.Container());
    this.#referenceContainer = this.addChild(new PIXI.Container());
    this.#draftContainer = this.addChild(new PIXI.Container());
    this.#handlesContainer = this.addChild(new PIXI.Container());
    if (this.#sessionLoaded) {
      this.#render();
      this.#renderHandles();
    }
    this.#renderReference();
  }

  static prepareSceneControls() {
    return {
      name: "locationDraw",
      order: 20,
      title: "BLANKINHERITANCE.LocationEditor.ControlGroup",
      layer: "locationDraw",
      icon: "fa-solid fa-draw-polygon",
      visible: Boolean(game.user?.isGM),
      onChange: (event, active) => {
        if (active) canvas.locationDraw?.activate();
      },
      onToolChange: () => canvas.locationDraw?.setTool(ui.controls.tool?.name ?? "select"),
      tools: [
        { name: "select", order: 1, title: "BLANKINHERITANCE.LocationEditor.Tool.Select", icon: "fa-solid fa-arrow-pointer" },
        { name: "lasso", order: 2, title: "BLANKINHERITANCE.LocationEditor.Tool.Lasso", icon: "fa-solid fa-lasso" },
        { name: "polygon", order: 3, title: "BLANKINHERITANCE.LocationEditor.Tool.Polygon", icon: "fa-solid fa-draw-polygon" },
        { name: "rect", order: 4, title: "BLANKINHERITANCE.LocationEditor.Tool.Rect", icon: "fa-regular fa-square" },
        { name: "circle", order: 5, title: "BLANKINHERITANCE.LocationEditor.Tool.Circle", icon: "fa-regular fa-circle" },
        { name: "point", order: 6, title: "BLANKINHERITANCE.LocationEditor.Tool.Point", icon: "fa-solid fa-location-dot" },
        { name: "bisect", order: 7, title: "BLANKINHERITANCE.LocationEditor.Tool.Bisect", icon: "fa-solid fa-scissors" }
      ]
    };
  }

  /** Wire the panel's reactions. Called once by foundry/location-editor.mjs after the layer exists. */
  configure({ onSessionChange, onSelectionChange, onStatus, onBisectReady } = {}) {
    this.#onSessionChange = onSessionChange ?? null;
    this.#onSelectionChange = onSelectionChange ?? null;
    this.#onStatus = onStatus ?? null;
    this.#onBisectReady = onBisectReady ?? null;
  }

  /**
   * A real, already-promoted region, loaded ON DEMAND as a reference outline
   * to cut against -- the Bisect tool's own answer to "which region", design
   * doc §10 phase 2c. Not a session item (it is never saved as a new draft
   * itself, and this layer's session is deliberately drafts-only, §3.4) and
   * not a general "every real location shown on the map" layer either (that
   * would need a buildings-index-style export this doesn't have, §7/§8) --
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
    this.cursor = this.#tool === "select" ? "default" : "crosshair";
    if (!this.#sessionLoaded) await this.#loadSession();
    this.#render();
    this.#renderHandles();
    this.#renderReference();
  }

  _deactivate() {
    this.#cancelDraft();
  }

  setTool(tool) {
    this.#cancelDraft();
    this.#tool = ["select", "lasso", "polygon", "rect", "circle", "point", "bisect"].includes(tool) ? tool : "select";
    this.cursor = this.#tool === "select" ? "default" : "crosshair";
  }

  get tool() {
    return this.#tool;
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
    this.#render();
    this.#renderHandles();
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
    this.#renderHandles();
    this.#onSelectionChange?.([...this.#selectedIds].map((id) => this.#session.items[id]).filter(Boolean));
  }

  /** Bulk-delete every currently multi-selected item in one autosave -- the batch panel's own delete action once more than one item is selected. */
  async deleteSelected() {
    for (const id of this.#selectedIds) this.#session = removeItem(this.#session, id);
    this.#selectedIds = new Set();
    await this.#saveSession();
    this.#render();
    this.#renderHandles();
    this.#onSelectionChange?.([]);
  }

  /** Called by the panel after it has saved an item's fields/geometry to the repo (§4) and knows the real id. */
  async markItemLinked(localId, locationId) {
    this.#session = linkItemToLocation(this.#session, localId, locationId);
    await this.#saveSession();
    this.#render();
  }

  async setItemFields(localId, fields) {
    this.#session = updateItemFields(this.#session, localId, fields);
    await this.#saveSession();
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence -- the session concept, design doc §3.4                */
  /* ------------------------------------------------------------------ */

  async #loadSession() {
    this.#sessionLoaded = true;
    try {
      const loaded = await fetchModuleJson(`storage/${SESSION_STORAGE_NAME}`, { fresh: true });
      if (isValidSession(loaded)) this.#session = loaded;
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
      this.#report("could not autosave -- see console");
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
      this.#report("a polygon needs at least three points");
      return;
    }
    const ring = this.#drafting.points.slice();
    this.#drafting = null;
    this.#draftContainer.removeChildren().forEach((c) => c.destroy());
    await this.#commitShape("polygon", ring);
  }

  #cancelDraft() {
    this.#drafting = null;
    this.#draftContainer.removeChildren().forEach((c) => c.destroy());
    this.cursor = this.#tool === "select" ? "default" : "crosshair";
    this.#report("");
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
      this.#report("a lasso needs at least three points");
      return;
    }
    const ring = this.#drafting.points.slice();
    this.#drafting = null;
    this.#draftContainer.removeChildren().forEach((c) => c.destroy());
    const ids = itemsInPolygon(sessionItemList(this.#session), ring);
    this.#setSelection(ids);
    this.#report(`${ids.length} item(s) selected`);
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
      this.#report("a cut needs at least two points");
      return;
    }
    const points = this.#drafting.points.slice();
    this.#drafting = null;
    this.#draftContainer.removeChildren().forEach((c) => c.destroy());
    this.#report("");
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
    this.#report(`drawn -- ${sessionItemList(this.#session).length} item(s) in this session`);
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
  }

  #pendingTier = "site";

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

  /** How many scene pixels 40 SCREEN pixels are right now -- a fixed image-px radius is a different-sized target at every zoom. */
  #snapRadius() {
    const scale = canvas.stage?.scale?.x || 1;
    return SNAP_RADIUS_SCREEN_PX / scale;
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

  /** The winning snap target for a region vertex at (x,y) -- an existing VERTEX beats an EDGE at equal distance (a shared corner is a stronger statement of intent than a point on a side). */
  #snapRegionPoint(excludeLocalId, x, y) {
    const tolerance = this.#snapRadius();
    let bestVertex = null, bestVertexDist = Infinity;
    let bestEdge = null, bestEdgeDist = Infinity;
    for (const item of sessionItemList(this.#session)) {
      if (item.localId === excludeLocalId || item.tier !== "region") continue;
      const ring = item.geometry.ringPx;
      if (!ring || ring.length < 3) continue;
      for (let i = 0; i < ring.length; i++) {
        const [vx, vy] = ring[i];
        const d = Math.hypot(vx - x, vy - y);
        if (d < bestVertexDist) { bestVertexDist = d; bestVertex = { x: vx, y: vy, localId: item.localId }; }
        const [nx, ny] = ring[(i + 1) % ring.length];
        const closest = closestOnSegment(x, y, vx, vy, nx, ny);
        const de = Math.hypot(closest.x - x, closest.y - y);
        if (de < bestEdgeDist) { bestEdgeDist = de; bestEdge = { x: closest.x, y: closest.y, localId: item.localId, segIndex: i }; }
      }
    }
    if (bestVertex && bestVertexDist <= tolerance) return { x: bestVertex.x, y: bestVertex.y, kind: "vertex", localId: bestVertex.localId };
    if (bestEdge && bestEdgeDist <= tolerance) return { x: bestEdge.x, y: bestEdge.y, kind: "edge", localId: bestEdge.localId, segIndex: bestEdge.segIndex };
    return null;
  }

  /** After a drag settles snapped onto ANOTHER region's EDGE, insert a real matching vertex there -- one drag makes a genuinely shared corner on both sides. A snap onto an existing VERTEX needs no split; the rings are already coincident there. */
  #splitTargetEdge(snapInfo) {
    if (!snapInfo || snapInfo.kind !== "edge") return;
    const target = this.#session.items[snapInfo.localId];
    if (!target?.geometry?.ringPx) return;
    const ring = [...target.geometry.ringPx];
    ring.splice(snapInfo.segIndex + 1, 0, [snapInfo.x, snapInfo.y]);
    this.#session = updateItemGeometry(this.#session, snapInfo.localId, { ...target.geometry, ringPx: ring });
  }

  #renderHandles() {
    for (const child of [...this.#handlesContainer.children]) child.destroy();
    this.#handlesContainer.removeChildren();
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

  #makeHandle(x, y, radius, fillColor) {
    const g = new PIXI.Graphics();
    g.lineStyle(2, 0xffffff, 1);
    g.beginFill(fillColor, 1);
    g.drawCircle(0, 0, radius);
    g.endFill();
    g.position.set(x, y);
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = new PIXI.Circle(0, 0, radius + 4);
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
      this.#report("a polygon needs at least three points");
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

  #hitTestAt(x, y) {
    let best = null, bestArea = Infinity;
    for (const item of sessionItemList(this.#session)) {
      if (item.geometry.kind === "point") {
        const [px, py] = item.geometry.pointPx;
        if ((px - x) ** 2 + (py - y) ** 2 <= HIT_PIN_RADIUS_PX ** 2) return item.localId;
        continue;
      }
      const ring = item.geometry.ringPx.map(([rx, ry]) => ({ x: rx, y: ry }));
      if (pointInRing(x, y, ring)) {
        const area = polygonArea(ring);
        if (area < bestArea) { bestArea = area; best = item.localId; }
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /*  Foundry interaction callbacks                                       */
  /* ------------------------------------------------------------------ */

  _onClickLeft(event) {
    const p = event.interactionData.origin;
    // A FederatedPointerEvent carries the native modifier keys directly per
    // the DOM UIEvent interface it implements; event.data.originalEvent is a
    // defensive fallback in case this Foundry build wraps it differently.
    const shiftKey = Boolean(event.shiftKey ?? event.data?.originalEvent?.shiftKey);
    if (this.#tool === "polygon" || this.#tool === "lasso" || this.#tool === "bisect") {
      this.#addDraftPoint(p, shiftKey);
      return;
    }
    if (this.#tool === "point") {
      this.#commitPoint([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
      return;
    }
    if (this.#tool === "select") {
      const hitId = this.#hitTestAt(p.x, p.y);
      if (shiftKey) {
        // A shift-click on empty background is a deliberate no-op -- it
        // leaves whatever multi-selection already exists alone, matching
        // draw.js#toggle's own single-item shift-click (there was never a
        // background case to consider there; a background click without
        // Shift already means "clear", so Shift's whole point is "don't").
        if (hitId) this.toggleSelection(hitId);
      } else {
        this.selectItem(hitId);
      }
    }
  }

  _onClickLeft2(event) {
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
      const screenDist = Math.hypot(last.x - prev.x, last.y - prev.y) * (canvas.stage?.scale?.x || 1);
      if (screenDist < 15) pts.pop();
    }
    if (this.#tool === "lasso") this.#finishLasso();
    else if (this.#tool === "bisect") this.#finishBisect();
    else this.#finishDraft();
  }

  /** rect/circle (Areas/Places drafting) and select (the marquee) each claim a single drag -- draw.js's own beginMarquee and beginShapeDraft shared exactly this trackDrag primitive for the same reason (design doc §3.1). */
  static #DRAG_TOOLS = new Set(["rect", "circle", "select"]);

  _onDragLeftStart(event) {
    if (!LocationDrawLayer.#DRAG_TOOLS.has(this.#tool)) return;
    event.interactionData.locStart = event.interactionData.origin;
    event.interactionData.locPreview = this.#draftContainer.addChild(new PIXI.Graphics());
  }

  _onDragLeftMove(event) {
    if (!LocationDrawLayer.#DRAG_TOOLS.has(this.#tool)) return;
    const start = event.interactionData.locStart;
    const end = event.interactionData.destination;
    if (!start || !end) return;
    const g = event.interactionData.locPreview;
    if (this.#tool === "select") {
      const ring = rectRing(start, end);
      g.clear();
      g.lineStyle(DRAFT_STYLE.weight, DRAFT_STYLE.color, 1);
      g.beginFill(DRAFT_STYLE.color, DRAFT_STYLE.fillAlpha);
      g.drawPolygon(ring.flatMap((pt) => [pt.x, pt.y]));
      g.endFill();
      this.#report("release to select the items inside the box -- hold Shift to add to the current selection");
      return;
    }
    const ring = this.#tool === "rect" ? rectRing(start, end) : circleRing(start, end);
    g.clear();
    g.lineStyle(DRAFT_STYLE.weight, DRAFT_STYLE.color, 1);
    g.beginFill(DRAFT_STYLE.color, DRAFT_STYLE.fillAlpha);
    g.drawPolygon(ring.flatMap((pt) => [pt.x, pt.y]));
    g.endFill();
    const dx = end.x - start.x, dy = end.y - start.y;
    this.#report(this.#tool === "circle"
      ? `radius ${Math.round(Math.hypot(dx, dy))}px -- release to finish`
      : `${Math.round(Math.abs(dx))}x${Math.round(Math.abs(dy))}px -- release to finish`);
  }

  async _onDragLeftDrop(event) {
    if (!LocationDrawLayer.#DRAG_TOOLS.has(this.#tool)) return;
    const start = event.interactionData.locStart;
    const end = event.interactionData.destination;
    event.interactionData.locPreview?.destroy();
    this.#report("");
    const isClick = !start || !end ||
      (Math.abs(end.x - start.x) < CLICK_VS_DRAG_PX && Math.abs(end.y - start.y) < CLICK_VS_DRAG_PX);
    if (this.#tool === "select") {
      // A plain click (no real drag) already ran through _onClickLeft's own
      // hit-test/toggle/clear logic above -- there is nothing left to do
      // here for that case, matching draw.js#beginMarquee's own up()
      // (a sub-4px release falls back to a bare hit-test rather than an
      // empty-box "select nothing").
      if (isClick) return;
      const shiftKey = Boolean(event.shiftKey ?? event.data?.originalEvent?.shiftKey);
      const rect = {
        x0: Math.min(start.x, end.x), y0: Math.min(start.y, end.y),
        x1: Math.max(start.x, end.x), y1: Math.max(start.y, end.y)
      };
      const ids = itemsInRect(sessionItemList(this.#session), rect);
      this.#setSelection(shiftKey ? [...this.#selectedIds, ...ids] : ids);
      this.#report(`${ids.length} item(s) ${shiftKey ? "added to the selection" : "selected"}`);
      return;
    }
    if (isClick) {
      this.#report(`drag to draw a ${this.#tool === "rect" ? "rectangle" : "circle"} -- a click alone has no size`);
      return;
    }
    const ring = this.#tool === "rect" ? rectRing(start, end) : circleRing(start, end);
    await this.#commitShape(this.#tool, ring);
  }

  _onDragLeftCancel(event) {
    event.interactionData?.locPreview?.destroy();
  }

  /** Enter/Escape/Backspace -- draw.js's own keyboard shortcuts for the draft session. Gated on this layer being active. */
  /**
   * Foundry's real "Escape"/dismiss dispatch -- InteractionLayer's own
   * override point (returns false by default), reached via
   * client-keybindings.mjs's Case 5 for the active layer. This used to be
   * a method called "_handleKeyDown" that nothing in Foundry has ever
   * called -- not a real override point, just a name that looked plausible
   * -- found live testing Lasso's own Enter-to-finish path (design doc §9).
   * Cancels an in-progress draft; with nothing drafting, this layer has
   * nothing of its own left to dismiss.
   */
  _onDismissKey(event) {
    if (!this.active || !this.#drafting) return false;
    this.#cancelDraft();
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
  _onDeleteKey(event) {
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
  /*  Rendering                                                           */
  /* ------------------------------------------------------------------ */

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
    for (const child of [...this.#shapesContainer.children]) child.destroy();
    this.#shapesContainer.removeChildren();
    for (const item of sessionItemList(this.#session)) {
      const g = new PIXI.Graphics();
      const dimmed = !this.#inFocus(item);
      const style = this.#selectedIds.has(item.localId) ? SELECTED_STYLE : item.locked ? LOCKED_STYLE : (TIER_STYLE[item.tier] ?? TIER_STYLE.site);
      g.alpha = dimmed ? 0.35 : 1;
      if (item.geometry.kind === "point") {
        const [x, y] = item.geometry.pointPx;
        g.lineStyle(2, style.color, 1);
        g.beginFill(style.color, 0.9);
        g.drawCircle(x, y, 7);
        g.endFill();
      } else {
        g.lineStyle(style.weight, style.color, 1);
        g.beginFill(style.color, dimmed ? style.fillAlpha * 0.4 : style.fillAlpha);
        g.drawPolygon(item.geometry.ringPx.flat());
        g.endFill();
      }
      this.#shapesContainer.addChild(g);
    }
  }

  /** The Bisect tool's own reference outline -- see loadReferenceRegion's own comment. */
  #renderReference() {
    if (!this.#referenceContainer) return;
    for (const child of [...this.#referenceContainer.children]) child.destroy();
    this.#referenceContainer.removeChildren();
    if (!this.#referenceRegion) return;
    const g = new PIXI.Graphics();
    g.lineStyle(REFERENCE_STYLE.weight, REFERENCE_STYLE.color, 1);
    const ring = this.#referenceRegion.ringScene;
    g.drawPolygon(ring.flatMap((p) => [p.x, p.y]));
    this.#referenceContainer.addChild(g);
  }

  #renderDraft() {
    for (const child of [...this.#draftContainer.children]) child.destroy();
    this.#draftContainer.removeChildren();
    if (!this.#drafting || this.#drafting.points.length === 0) return;
    const pts = this.#drafting.points;
    // Bisect draws an OPEN cut line -- draw.js's own isLineTool() carve-out
    // -- never closed or filled like a polygon/lasso ring, no matter how
    // many points it has.
    const isLine = this.#tool === "bisect";
    const g = new PIXI.Graphics();
    if (pts.length >= 2) {
      g.lineStyle(DRAFT_STYLE.weight, DRAFT_STYLE.color, 1);
      if (!isLine && pts.length >= 3) g.beginFill(DRAFT_STYLE.color, DRAFT_STYLE.fillAlpha);
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      if (!isLine && pts.length >= 3) { g.closePath(); g.endFill(); }
    }
    for (const p of pts) {
      g.beginFill(DRAFT_STYLE.color, 1);
      g.drawCircle(p.x, p.y, 4);
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

  #report(text) {
    this.#onStatus?.(text);
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
