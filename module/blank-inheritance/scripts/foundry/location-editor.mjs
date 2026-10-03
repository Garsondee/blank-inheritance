/**
 * The Location Editor: drawing and authoring data/locations/*.json inside
 * Foundry (design/location-editor.md). GM-only, an ordinary framed window
 * like the Admin Panel, not part of the deck.
 *
 * The actual drawing happens on `foundry/location-draw-layer.mjs`, a ported
 * ~ tools/gazetteer/static/draw.js engine running as a real Foundry canvas
 * layer -- NOT Foundry's own native Region tool (design doc's revision
 * history explains why at length; short version: Regions are a coarse,
 * grid-oriented gameplay primitive with none of the precision this needs,
 * and sharing one Foundry document type between location authoring and
 * whatever else Regions get used for live is a real way to break a session).
 * This file only shows/edits metadata for whichever session item is
 * currently selected on that layer, and writes a harvest record
 * (foundry/location-edits.mjs) when the GM saves.
 */

import {
  applyFieldsToDoc,
  CLASSIFICATIONS,
  cutBoundaryMeetings,
  DEPTHS,
  emptyFields,
  fieldsEdited,
  fieldsFromLocationDoc,
  geometryForRecord
} from "../core/location-editor.mjs";
import { TOOL_DEFS, toolsForMode, toolSurvivesModeChange } from "../core/location-draw-tools.mjs";
import { chipOf, groupSummary, slotIndex, storyLines } from "../core/story-lines.mjs";
import { linkedSlots, OFF_MAP_REASONS, offMapLabel, searchPlaces } from "../core/siting.mjs";
import { itemGeometryChanged } from "../core/location-published.mjs";
import { check as checkDepth } from "../core/depth.mjs";
import { check as checkShape, metrics as shapeMetrics } from "../core/shape.mjs";
import { toImagePoint, toScenePoint } from "../core/travel-animation.mjs";
import { loadLocationEdits, pendingRecordsFor, saveLocationEdit } from "./location-edits.mjs";
import { fetchModuleJson } from "./io.mjs";
import { hubCalibration } from "./location-published.mjs";
import { buildStoryView, loadStoryInputs, resetStoryCache, storyOverrides } from "./location-story.mjs";
import { campaignMapMetresPerPixel, hubScene } from "./travel.mjs";
import { deriveFoundryId } from "../core/ids.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const MACRO_SOURCE_ID = "macro-location-editor";
const LOCATION_PATH = (id) => `data/campaign/locations/${id}.json`;
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

function textareaLines(value) {
  return String(value ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
}

function setDeep(obj, path, value) {
  const keys = path.split(".");
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]] ??= {};
  node[keys[keys.length - 1]] = value;
}

const STORY_UI_KEY = "bi-location-story-ui";

/** Which episodes and scenes the GM had open, kept in this browser only: a convenience, never data. */
function readStoryUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORY_UI_KEY) ?? "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

function writeStoryUi(state) {
  try {
    localStorage.setItem(STORY_UI_KEY, JSON.stringify(state));
  } catch {
    // private window, blocked storage: the list simply opens at its defaults next time
  }
}

export class LocationEditorApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  #tab = "story"; // "story": the episodes and haunts, scene by scene. "map": the drawing tools.
  #storyInputs = null; // { docs, locations } once loaded
  #storyLoading = false;
  #storyError = null;
  #uiSeeded = false;
  #openGroups = new Set();
  #openRows = new Set();
  #onlyGaps = false;
  #editing = null; // the slot key whose place is being changed
  #search = "";
  #refocusSearch = false;
  #offMapOpen = false; // showing the list of reasons a scene may need no place
  #scrollToEditor = false; // bring the change-this-place card into view on the next render: the list is long and the card opens under its row
  #staged = null; // a place chosen for a slot, waiting for the GM to confirm
  #drawFor = null; // { slotKey, label, kind }: drawing a new building or pin for a slot
  #focusKey = null;
  #mode = "areas";
  #placesShapeKind = "site";
  #items = []; // this session's draft items, from the draw layer's onSessionChange
  #selectedItems = []; // every currently multi-selected session item, from the draw layer's onSelectionChange
  #fields = emptyFields();
  #loadedFields = null; // what was on disk when this item's fields were loaded -- the "before" for an update record
  #loadedDoc = null; // the full fetched location document (Claude-owned fields included), null for a not-yet-linked draft -- the depth advisory check's own subject, §6's "as if saved" doc
  #busy = null;
  #problems = [];
  #status = "";
  #bisectTargetId = null; // the real, already-promoted region currently loaded as the Bisect tool's own cut target -- design doc §10 phase 2c
  #bisectTargetName = null;
  #bisectRingImagePx = null;
  #bisectInputError = "";
  #claimed = false; // has this panel already put the canvas into the editor? only the first render does -- see #wireLayer

  /**
   * The sole selected item, or null when zero or several are selected --
   * everything below that only makes sense for exactly one item (the field
   * form, Save) reads this instead of #selectedItems directly.
   *
   * Always the layer's LIVE copy. The items the layer hands the panel on a
   * selection are snapshots, and dragging a handle replaces the item in the
   * layer's session without the panel hearing about each drag -- so reading the
   * snapshot meant Save wrote (and the shape advice measured) the outline the
   * item had when it was SELECTED, not the one the GM had just reshaped it to.
   */
  get #selectedItem() {
    const snapshot = this.#selectedItems.length === 1 ? this.#selectedItems[0] : null;
    if (!snapshot) return null;
    return canvas.locationDraw?.getSession?.().items?.[snapshot.localId] ?? snapshot;
  }

  static DEFAULT_OPTIONS = {
    id: "bi-location-editor",
    classes: ["bi-location-editor", "bi-scope"],
    window: { title: "BLANKINHERITANCE.LocationEditor.Title", icon: "fa-solid fa-map-location-dot", resizable: true },
    position: { width: 540, height: 820, top: 70, left: 100 },
    actions: {
      setTab: LocationEditorApplication.#onSetTab,
      toggleGroup: LocationEditorApplication.#onToggleGroup,
      toggleScene: LocationEditorApplication.#onToggleScene,
      toggleOnlyGaps: LocationEditorApplication.#onToggleOnlyGaps,
      refreshStory: LocationEditorApplication.#onRefreshStory,
      focusSlot: LocationEditorApplication.#onFocusSlot,
      editSlot: LocationEditorApplication.#onEditSlot,
      pickOnMap: LocationEditorApplication.#onPickOnMap,
      cancelArm: LocationEditorApplication.#onCancelArm,
      drawFor: LocationEditorApplication.#onDrawFor,
      cancelDraw: LocationEditorApplication.#onCancelDraw,
      clearSlot: LocationEditorApplication.#onClearSlot,
      stagePick: LocationEditorApplication.#onStagePick,
      toggleLinked: LocationEditorApplication.#onToggleLinked,
      confirmStage: LocationEditorApplication.#onConfirmStage,
      cancelStage: LocationEditorApplication.#onCancelStage,
      offMapMenu: LocationEditorApplication.#onOffMapMenu,
      stageOffMap: LocationEditorApplication.#onStageOffMap,
      setMode: LocationEditorApplication.#onSetMode,
      setShapeKind: LocationEditorApplication.#onSetShapeKind,
      setTool: LocationEditorApplication.#onSetTool,
      toggleTier: LocationEditorApplication.#onToggleTier,
      fitMap: LocationEditorApplication.#onFitMap,
      selectItem: LocationEditorApplication.#onSelectItem,
      deleteItem: LocationEditorApplication.#onDeleteItem,
      deleteSelected: LocationEditorApplication.#onDeleteSelected,
      loadBisectTarget: LocationEditorApplication.#onLoadBisectTarget,
      clearBisectTarget: LocationEditorApplication.#onClearBisectTarget,
      save: LocationEditorApplication.#onSave,
      refresh: LocationEditorApplication.#onRefresh
    }
  };

  static PARTS = {
    nav: { template: `modules/${MODULE_ID}/templates/location-editor/nav.hbs` },
    story: { template: `modules/${MODULE_ID}/templates/location-editor/story.hbs`, scrollable: [".bi-story"] },
    body: { template: `modules/${MODULE_ID}/templates/location-editor/panel.hbs`, scrollable: [".bi-location-editor__body"] }
  };

  /**
   * Escape means "abandon what I am doing" first and "close this window"
   * second. Foundry's Escape handler (client-keybindings.mjs#onDismiss) asks
   * EVERY open window to close(closeKey) first, and only if none really
   * closed does it ask the active canvas layer (_onDismissKey) -- so a
   * polygon half-clicked out on the map would be lost along with the panel.
   * Refusing the close while the layer has something to abandon makes
   * Foundry fall through to the layer, which does the abandoning itself.
   *
   * This must NOT cancel anything here. The first version did, so by the time
   * Foundry reached the layer there was nothing left for it to cancel, it
   * reported "not handled", and Foundry carried on to its last case and
   * opened the main menu on top of the editor (found live, 2026-10-01).
   */
  async close(options = {}) {
    if (options?.closeKey && canvas.locationDraw?.hasEscapableState?.()) return this;
    return super.close(options);
  }

  /** Closing the panel leaves the editor: the canvas goes back to Tokens, rather than staying in a drawing layer with no window to say so. */
  _onClose(options) {
    super._onClose?.(options);
    this.#claimed = false;
    canvas.locationDraw?.disarmAssign?.();
    canvas.locationDraw?.clearFocus?.();
    if (canvas.locationDraw?.active) canvas.tokens?.activate();
  }

  /**
   * Put the canvas into the editor, once, when the panel opens -- the same
   * claim selecting Foundry's own Region/Drawing tool makes, without which
   * InteractionLayer.active stays false (Tokens stays the active layer) and
   * every click on the canvas keeps going to Tokens instead of here.
   *
   * ONLY once per opening. The first version did this on EVERY render, so a
   * GM who switched to another dock group while the panel stayed open had
   * the canvas snatched straight back the next time anything re-rendered it.
   */
  #claimCanvas(layer) {
    // The layer's own pendingTier defaults to "site" and has no idea what
    // mode this panel opened in -- found live: opening straight into Areas
    // mode (the panel's own default) and drawing immediately produced a
    // SITE, not a region, because nothing had told the layer "areas" yet.
    layer.setPendingTier(this.#mode === "areas" ? "region" : this.#placesShapeKind);
    layer.activate({ tool: layer.tool });
  }

  /** Wire this panel to the draw layer's callbacks. Runs on every render and only ever replaces callbacks, so it is safe to repeat. */
  #wireLayer() {
    const layer = canvas.locationDraw;
    if (!layer) return;
    layer.configure({
      onSessionChange: (items) => {
        this.#items = items;
        this.#selectedItems = this.#selectedItems.map((s) => items.find((i) => i.localId === s.localId)).filter(Boolean);
        this.render();
      },
      onSelectionChange: (items) => this.#loadSelection(items),
      onStatus: (text) => {
        this.#status = text;
        this.render();
      },
      onBisectReady: (points) => this.#onBisectReady(points),
      onPublishedChange: () => this.render(),
      // so "fit the map" frames it beside this window, not behind it
      getViewInset: () => ({ left: this.rendered ? (this.element?.getBoundingClientRect?.().right ?? 0) : 0 })
    });
    this.#items = layer.getSession ? Object.values(layer.getSession().items).sort((a, b) => a.localId.localeCompare(b.localId)) : [];
    if (!this.#claimed) {
      this.#claimed = true;
      this.#claimCanvas(layer);
    }
  }

  async _prepareContext() {
    await loadLocationEdits();
    const layer = canvas.locationDraw;
    const onHubScene = canvas?.scene && (await hubScene())?.id === canvas.scene.id;
    const pending = this.#selectedItem ? pendingRecordsFor(this.#selectedItem.localId) : [];
    const advice = await this.#computeAdvice(this.#selectedItem);
    const tool = layer?.tool ?? "pick";
    const published = layer?.publishedSummary ?? null;
    return {
      tab: this.#tab,
      story: this.#tab === "story" ? this.#storyContext(layer) : null,
      drawFor: this.#drawFor ? { label: this.#drawFor.label, kind: this.#drawFor.kind } : null,
      busy: this.#busy,
      mode: this.#mode,
      placesShapeKind: this.#placesShapeKind,
      onHubScene: Boolean(onHubScene),
      tool,
      tools: toolsForMode(this.#mode, this.#placesShapeKind).map((name) => ({
        name,
        active: name === tool,
        icon: TOOL_DEFS[name].icon,
        title: L(TOOL_DEFS[name].title)
      })),
      status: this.#status || L(TOOL_DEFS[tool]?.hint ?? TOOL_DEFS.pick.hint),
      published: published && {
        loading: published.state === "loading",
        failedToLoad: published.state === "error",
        noHub: published.state === "no-hub",
        ready: published.state === "ok",
        onHub: published.onHub,
        counts: published.counts,
        total: published.total,
        failed: published.failed,
        visibility: published.visibility
      },
      items: this.#items.map((i) => ({
        localId: i.localId,
        tier: i.tier,
        locked: i.locked,
        linked: Boolean(i.locationId),
        selected: this.#selectedItems.some((s) => s.localId === i.localId),
        label: i.name || i.fields?.name || `(unnamed ${i.tier})`
      })),
      selected: this.#selectedItem
        ? { localId: this.#selectedItem.localId, tier: this.#selectedItem.tier, locked: this.#selectedItem.locked, locationId: this.#selectedItem.locationId }
        : null,
      selectedCount: this.#selectedItems.length,
      multiSelected: this.#selectedItems.length > 1,
      fields: {
        ...this.#fields,
        tagsText: (this.#fields.tags ?? []).join(", "),
        hooksText: (this.#fields.scene?.hooks ?? []).join("\n"),
        activitiesText: (this.#fields.scene?.activities ?? []).join("\n")
      },
      ranks: [1, 2, 3, 4, 5],
      classifications: CLASSIFICATIONS.map((c) => ({ value: c ?? "", label: c ?? "(undeclared)", selected: c === this.#fields.classification })),
      depths: DEPTHS.map((d) => ({ value: d, selected: d === this.#fields.depth })),
      pendingCount: pending.length,
      problems: this.#problems,
      depthAdvice: advice.depth,
      shapeAdvice: advice.shape,
      bisectTargetId: this.#bisectTargetId,
      bisectTargetName: this.#bisectTargetName,
      bisectInputError: this.#bisectInputError
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    if (!canvas.locationDraw?.getSession) {
      // The layer registers at module init, but a scene change can outrun it on first paint.
      setTimeout(() => this.#wireLayer(), 0);
    } else {
      this.#wireLayer();
    }
    const root = this.element;
    if (this.#tab === "story" && !this.#storyInputs && !this.#storyLoading && !this.#storyError) queueMicrotask(() => this.#loadStory());
    const search = root.querySelector('[name="storySearch"]');
    if (search) {
      let timer = null;
      search.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.#search = search.value;
          this.#refocusSearch = true;
          this.render();
        }, 220);
      });
      if (this.#refocusSearch) {
        this.#refocusSearch = false;
        search.focus();
        search.setSelectionRange(search.value.length, search.value.length);
      }
    }
    if (this.#scrollToEditor) {
      this.#scrollToEditor = false;
      root.querySelector(".bi-story__editor")?.scrollIntoView({ block: "nearest" });
    }
    const stagedNote = root.querySelector('[name="stagedNote"]');
    if (stagedNote) stagedNote.addEventListener("input", () => { if (this.#staged) this.#staged.note = stagedNote.value; });
    const bind = (name, path, transform = (v) => v) => {
      const el = root.querySelector(`[name="${name}"]`);
      if (!el) return;
      el.addEventListener("change", async () => {
        const value = el.type === "checkbox" ? el.checked : el.value;
        setDeep(this.#fields, path, transform(value));
        if (this.#selectedItem) await canvas.locationDraw?.setItemFields(this.#selectedItem.localId, this.#fields);
      });
    };
    bind("name", "name", (v) => (v.trim() ? v : null));
    bind("nameJa", "nameJa", (v) => (v.trim() ? v : null));
    bind("kind", "kind");
    bind("tagsText", "tags", (v) => v.split(",").map((s) => s.trim()).filter(Boolean));
    bind("rank", "rank", (v) => (v ? Number(v) : null));
    bind("classification", "classification", (v) => (v ? v : null));
    bind("depth", "depth");
    bind("lore.summary", "lore.summary");
    bind("lore.playerFacing", "lore.playerFacing");
    bind("lore.gmOnly", "lore.gmOnly");
    bind("hooksText", "scene.hooks", textareaLines);
    bind("activitiesText", "scene.activities", textareaLines);
    bind("note", "note");
    // placesShapeKind's own radio inputs are wired via data-action="setShapeKind"
    // (see #onSetShapeKind) rather than a manual listener here -- this used
    // to bind with a plain (singular) querySelector, which attaches to only
    // the FIRST of the two same-named radios, so choosing "point" here
    // silently never fired anything and every new Places-mode shape kept
    // coming out a site. Found live testing district-focus dimming.
  }

  /** `items` is the draw layer's whole multi-selection (0, 1, or several) -- the field form only ever loads for exactly one; 0 or several show the empty/batch views instead (design doc's own "several selected, no single ring to edit" rule, applied here to the metadata form for the same reason). */
  async #loadSelection(items) {
    this.#selectedItems = items;
    this.#problems = [];
    const item = this.#selectedItem;
    this.#loadedDoc = null;
    if (item?.locationId) {
      try {
        const doc = await fetchModuleJson(LOCATION_PATH(item.locationId), { fresh: true });
        this.#loadedDoc = doc;
        this.#fields = fieldsFromLocationDoc(doc);
      } catch (err) {
        console.warn(`Blank Inheritance | Location Editor could not load "${item.locationId}":`, err);
        this.#fields = emptyFields();
      }
    } else {
      this.#fields = item?.fields ?? emptyFields();
    }
    this.#loadedFields = item ? JSON.parse(JSON.stringify(this.#fields)) : null;
    this.render();
  }

  /**
   * Depth/shape advisory checks -- design doc §8/§10's own tracked gap.
   * Both are pure once their Foundry-only inputs (the scene calibration, the
   * map's real metres-per-pixel) are resolved, and neither ever blocks Save:
   * this panel only ever writes `drafted` content (§6, the Approvals Desk
   * doctrine), so there is no gate here to enforce, only advice to show, the
   * same "missing/overweight/orphaned are advice, not a verdict" rule
   * depth.py's own docstring states. Recomputed on every render (called from
   * _prepareContext, itself already re-run after every field edit via the
   * session round-trip `bind()` starts) rather than cached, so it can never
   * go stale after a keystroke the way a cache filled only at selection time
   * would.
   */
  async #computeAdvice(item) {
    if (!item) return { depth: null, shape: null };
    const doc = applyFieldsToDoc(this.#loadedDoc ?? {}, this.#fields);
    const depth = checkDepth(doc);
    let shape = null;
    // Point-tier has no footprint to measure at all; a region/site with the
    // panel's own polygon geometry does.
    if (item.geometry.kind === "polygon") {
      const calibration = await this.#currentCalibration();
      if (calibration) {
        const ringImg = item.geometry.ringPx
          .map(([x, y]) => toImagePoint({ x, y }, calibration))
          .map((p) => [p.x, p.y]);
        const metresPerPx = await campaignMapMetresPerPixel();
        const m = shapeMetrics(ringImg, { metresPerPx });
        shape = checkShape(this.#fields.depth, m);
      }
    }
    return { depth, shape };
  }

  async #currentCalibration() {
    return (await hubCalibration())?.calibration ?? null;
  }

  async #buildGeometry(item) {
    const calibration = await this.#currentCalibration();
    if (!calibration) return { ok: false, problems: ["Could not calibrate against the Campaign Map scene."], geometry: null };
    if (item.geometry.kind === "point") {
      const [x, y] = item.geometry.pointPx;
      const img = toImagePoint({ x, y }, calibration);
      return { ok: true, problems: [], geometry: { rings: [], point: [img.x, img.y] } };
    }
    const shell = item.geometry.ringPx.map(([x, y]) => toImagePoint({ x, y }, calibration));
    const holes = (item.geometry.holesPx ?? []).map((h) => h.map(([x, y]) => toImagePoint({ x, y }, calibration)));
    return geometryForRecord(item.tier, [{ shell, holes }]);
  }

  async #run(labelKey, fn) {
    if (this.#busy) return;
    this.#busy = game.i18n.localize(labelKey);
    this.render();
    try {
      return await fn();
    } catch (err) {
      console.error("Blank Inheritance | Location Editor action failed:", err);
      ui.notifications.error(L("BLANKINHERITANCE.LocationEditor.Failed", { error: err.message }));
      return null;
    } finally {
      this.#busy = null;
      this.render();
    }
  }

  static async #onSetMode(event, target) {
    this.#mode = target.dataset.mode === "places" ? "places" : "areas";
    canvas.locationDraw?.setPendingTier(this.#mode === "areas" ? "region" : this.#placesShapeKind);
    await this.#keepToolValid();
    this.render();
  }

  static async #onSetShapeKind(event, target) {
    this.#placesShapeKind = target.dataset.shapeKind === "point" ? "point" : "site";
    canvas.locationDraw?.setPendingTier(this.#placesShapeKind);
    await this.#keepToolValid();
    this.render();
  }

  /** A tool the new mode does not offer (Bisect outside Areas, Point outside the pin kind) must not stay active invisibly. */
  async #keepToolValid() {
    const layer = canvas.locationDraw;
    if (layer && !toolSurvivesModeChange(layer.tool, this.#mode, this.#placesShapeKind)) await this.#selectTool("pick");
  }

  /**
   * Choose a tool. The layer's own setTool() is the source of truth for what
   * the canvas does; the dock is told as well so its highlight and
   * `game.activeTool` follow (Foundry's canvas dispatches drags on the active
   * TOOL name -- see core/location-draw-tools.mjs).
   */
  async #selectTool(tool) {
    const layer = canvas.locationDraw;
    if (!layer) return;
    layer.setTool(tool);
    try {
      if (layer.active) await ui.controls.activate({ control: "locationDraw", tool: layer.tool });
      else layer.activate({ tool: layer.tool });
    } catch (err) {
      console.warn("Blank Inheritance | Location Editor could not sync the scene-controls dock:", err);
    }
  }

  static async #onSetTool(event, target) {
    await this.#selectTool(target.dataset.tool);
    this.render();
  }

  static #onToggleTier(event, target) {
    canvas.locationDraw?.setPublishedVisible(target.dataset.tier, target.checked);
  }

  /** Bring the camera to everything that is drawn -- the whole map when all of it is showing. */
  static #onFitMap() {
    if (!canvas.locationDraw?.fitToPublished()) ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.Published.NothingToFit"));
  }

  static #onSelectItem(event, target) {
    canvas.locationDraw?.selectItem(target.dataset.localId ?? null);
  }

  static async #onDeleteItem(event, target) {
    const id = target.dataset.localId;
    if (!id) return;
    await this.#run("BLANKINHERITANCE.LocationEditor.Deleting", () => canvas.locationDraw?.deleteItem(id));
  }

  static async #onRefresh() {
    await this.#run("BLANKINHERITANCE.LocationEditor.Refreshing", async () => {
      await loadLocationEdits({ refresh: true });
      // A pull may have just rewritten the locations on disk; show them as they are now.
      await canvas.locationDraw?.loadPublished({ refresh: true });
    });
  }

  static async #onDeleteSelected() {
    await this.#run("BLANKINHERITANCE.LocationEditor.Deleting", () => canvas.locationDraw?.deleteSelected());
  }

  /**
   * The Bisect tool's own "which region" step, design doc §10 phase 2c: a
   * GM types a real, already-promoted region's own id (the same id its
   * `data/locations/<id>.json` filename uses) and this fetches it, checks
   * it's actually a region, and hands its outline to the draw layer as a
   * reference to cut against -- converted to scene px here (the one place
   * this panel already does that conversion elsewhere too, #currentCalibration)
   * since the layer itself only ever works in scene px, same as every
   * session item's own geometry.
   */
  static async #onLoadBisectTarget() {
    const input = this.element.querySelector('[name="bisectTargetInput"]');
    const id = (input?.value ?? "").trim();
    if (!id) return;
    await this.#run("BLANKINHERITANCE.LocationEditor.Bisect.Loading", async () => {
      let doc;
      try {
        doc = await fetchModuleJson(LOCATION_PATH(id), { fresh: true });
      } catch (err) {
        this.#bisectInputError = L("BLANKINHERITANCE.LocationEditor.Bisect.NotFound", { id });
        return;
      }
      if (doc.tier !== "region") {
        this.#bisectInputError = L("BLANKINHERITANCE.LocationEditor.Bisect.NotARegion", { id });
        return;
      }
      // derived.imagePx, not geometry.rings (lon/lat, the canonical space) --
      // the same distinction apply_geometry.py's own _apply_split had to get
      // right, see that file's comment on exactly this.
      const imagePx = doc.derived?.imagePx?.[0];
      if (!imagePx) {
        this.#bisectInputError = L("BLANKINHERITANCE.LocationEditor.Bisect.NoGeometry", { id });
        return;
      }
      const calibration = await this.#currentCalibration();
      if (!calibration) {
        this.#bisectInputError = "Could not calibrate against the Campaign Map scene.";
        return;
      }
      const ringScene = imagePx.map(([x, y]) => toScenePoint({ x, y }, calibration));
      canvas.locationDraw?.loadReferenceRegion(id, ringScene);
      this.#bisectTargetId = id;
      this.#bisectTargetName = doc.name || id;
      this.#bisectRingImagePx = imagePx;
      this.#bisectInputError = "";
    });
  }

  static #onClearBisectTarget() {
    canvas.locationDraw?.clearReferenceRegion();
    this.#bisectTargetId = null;
    this.#bisectTargetName = null;
    this.#bisectRingImagePx = null;
    this.#bisectInputError = "";
    this.render();
  }

  /**
   * The Bisect tool's own finish -- the draw layer hands back a finished cut
   * line (scene px, at least two points) once the GM presses Enter or
   * double-clicks; this converts it to image px and writes the "split"
   * harvest record. Never auto-confirmed further than this: pressing Enter
   * to finish the LINE already reads as the confirmation (matching every
   * other tool's own Enter-to-commit), so there is no second "are you sure"
   * step on top of it, only the two-round FIX-style safety `npm run
   * locations` itself provides if the cut turns out not to actually divide
   * the region in two (design doc §10 phase 2c's own disclosed limitation:
   * that can only be known once shapely actually runs, repo-side).
   */
  async #onBisectReady(points) {
    if (!this.#bisectTargetId) {
      ui.notifications.warn(L("BLANKINHERITANCE.LocationEditor.Bisect.NoTarget"));
      return;
    }
    await this.#run("BLANKINHERITANCE.LocationEditor.Bisect.Cutting", async () => {
      const calibration = await this.#currentCalibration();
      if (!calibration) {
        ui.notifications.error("Could not calibrate against the Campaign Map scene.");
        return;
      }
      const cutPointsImagePx = points
        .map((p) => toImagePoint(p, calibration))
        .map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]);
      // Refused here, live, rather than only when the pull runs: a cut that
      // does not meet the boundary exactly twice can never split the region.
      // The reference stays loaded so the GM can simply draw another.
      const meetings = cutBoundaryMeetings(this.#bisectRingImagePx ?? [], cutPointsImagePx);
      if (meetings !== 2) {
        ui.notifications.warn(L("BLANKINHERITANCE.LocationEditor.Bisect.BadCut", { count: meetings }));
        return;
      }
      await saveLocationEdit({
        op: "split", locationId: this.#bisectTargetId, tier: "region",
        geometry: { cutPointsImagePx }, fields: null, before: null
      });
      ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.Bisect.Saved", { id: this.#bisectTargetId }));
      console.log(`Blank Inheritance | Location Editor queued a bisect of "${this.#bisectTargetId}" -- pull with npm run locations to actually cut it.`);
      canvas.locationDraw?.clearReferenceRegion();
      await this.#selectTool("pick");
      this.#bisectTargetId = null;
      this.#bisectTargetName = null;
      this.#bisectRingImagePx = null;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  The Story tab (design/location-editor.md §12)                        */
  /* ------------------------------------------------------------------ */

  async #loadStory({ refresh = false } = {}) {
    if (this.#storyLoading) return;
    this.#storyLoading = true;
    this.#storyError = null;
    this.render();
    try {
      if (refresh) resetStoryCache();
      this.#storyInputs = await loadStoryInputs({ refresh });
    } catch (err) {
      console.error("Blank Inheritance | Location Editor could not load the story:", err);
      this.#storyError = err.message;
    } finally {
      this.#storyLoading = false;
      this.render();
    }
  }

  /** The deployed scene data with the GM's waiting placements laid over it, or null before it has loaded. */
  #storyView() {
    return this.#storyInputs ? buildStoryView(this.#storyInputs.docs, this.#storyInputs.locations) : null;
  }

  /** First time through: reopen what the GM had open; failing that, open whatever has a gap in it so the problems are the first thing seen. */
  #seedStoryUi(story) {
    if (this.#uiSeeded) return;
    this.#uiSeeded = true;
    const saved = readStoryUi();
    if (saved) {
      this.#openGroups = new Set(saved.groups ?? []);
      this.#openRows = new Set(saved.rows ?? []);
      this.#onlyGaps = Boolean(saved.onlyGaps);
      return;
    }
    const flagged = story.groups.filter((g) => g.counts.gaps > 0 || g.counts.optionGaps > 0);
    for (const group of flagged.length ? flagged : story.groups.slice(0, 1)) this.#openGroups.add(group.id);
  }

  #persistStoryUi() {
    writeStoryUi({ groups: [...this.#openGroups], rows: [...this.#openRows], onlyGaps: this.#onlyGaps });
  }

  #storyContext(layer) {
    const base = { loading: this.#storyLoading, error: this.#storyError, lines: [], summary: "", onlyGaps: this.#onlyGaps, problems: [], pendingCount: 0, armed: null, editor: null };
    const view = this.#storyView();
    if (!view) return base;
    this.#seedStoryUi(view.story);
    const lines = storyLines(view.story, { openGroups: this.#openGroups, openRows: this.#openRows, onlyGaps: this.#onlyGaps, editing: this.#editing, focused: this.#focusKey });
    const entry = this.#editing ? slotIndex(view.story).get(this.#editing) : null;
    const extra = Object.entries(view.newLocations).map(([recordId, fresh]) => ({ recordId, ...fresh }));
    const suggestions = entry && this.#search && !this.#staged
      ? searchPlaces(this.#storyInputs.locations, this.#search, { limit: 8, extra }).map((s) => ({ ...s, chipTier: { site: "building", region: "area", point: "pin" }[s.tier] ?? s.tier }))
      : [];
    const armed = layer?.assignArmed ? { label: entry ? `${entry.row.title} · ${entry.slot.label}` : "" } : null;
    return {
      ...base,
      summary: groupSummary(view.story.totals),
      lines,
      problems: view.problems,
      pendingCount: view.pendingCount,
      armed,
      editor: entry
        ? {
          slotKey: entry.slot.key, label: `${entry.row.title} · ${entry.slot.label}`, search: this.#search, suggestions, staged: this.#stagedView(), armed: Boolean(armed),
          canClear: entry.slot.state !== "gap" && entry.slot.state !== "offmap",
          canOffMap: entry.slot.target.kind === "scene",
          offMapOpen: this.#offMapOpen,
          reasons: OFF_MAP_REASONS.map((r) => ({ ...r, current: entry.slot.offMapReason === r.id }))
        }
        : null
    };
  }

  #stagedView() {
    const s = this.#staged;
    if (!s) return null;
    return {
      label: s.label,
      from: s.from,
      clear: s.locationId === null && !s.viaRecord && !s.offMap,
      offMap: s.offMap ? offMapLabel(s.offMap) : null,
      name: s.name || "(unnamed)",
      isNew: Boolean(s.viaRecord),
      isScene: s.isScene,
      note: s.note,
      linked: s.linked.map((l) => ({ key: l.key, label: l.label, checked: l.checked })),
      anyLinked: s.linked.length > 0
    };
  }

  #editEntry() {
    const view = this.#storyView();
    return view && this.#editing ? (slotIndex(view.story).get(this.#editing) ?? null) : null;
  }

  /** The map, ready to be pointed at: the editor's layer active and the Campaign Map scene showing. Null (with a warning) when it is not. */
  async #ensureMap() {
    const layer = canvas.locationDraw;
    const hub = await hubScene();
    if (!layer || !hub || canvas.scene?.id !== hub.id) {
      ui.notifications.warn(L("BLANKINHERITANCE.LocationEditor.NotOnHub"));
      return null;
    }
    if (!layer.active) layer.activate({ tool: layer.tool });
    return layer;
  }

  /**
   * A place has been chosen for a slot: show what that would change -- the
   * other slots that agree with it today, and may be moved with it -- and wait
   * for the GM to confirm. Nothing is written yet.
   */
  #stagePlace(entry, choice) {
    const { slot, row } = entry;
    const same = choice.offMap ? (!slot.locationId && slot.offMapReason === choice.offMap)
      : choice.locationId ? choice.locationId === slot.locationId
        : choice.viaRecord ? false : (slot.locationId === null && !slot.offMapReason);
    if (same) {
      ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.Story.AlreadyThere"));
      return;
    }
    const { overrides } = storyOverrides();
    const linked = choice.offMap ? [] : linkedSlots(this.#storyInputs.docs, slot.target, { overrides })
      .map((l) => ({ key: l.key, target: l.target, label: l.label, value: l.value, checked: l.defaultChecked }));
    this.#staged = {
      slotKey: slot.key,
      target: slot.target,
      label: `${row.title} · ${slot.label}`,
      from: chipOf(slot).text,
      locationId: choice.locationId ?? null,
      viaRecord: choice.viaRecord ?? null,
      offMap: choice.offMap ?? null,
      name: choice.name ?? "",
      tier: choice.tier ?? null,
      before: slot.locationId,
      beforeVia: slot.location?.pending ? slot.viaRecord : null,
      linked,
      note: "",
      isScene: slot.target.kind === "scene"
    };
    this.#editing = slot.key;
    this.#offMapOpen = false;
    this.#scrollToEditor = true;
    this.#tab = "story";
    this.#search = "";
  }

  static #onSetTab(event, target) {
    this.#tab = target.dataset.tab === "map" ? "map" : "story";
    this.render();
  }

  static #onToggleGroup(event, target) {
    const id = target.dataset.group;
    if (this.#openGroups.has(id)) this.#openGroups.delete(id);
    else this.#openGroups.add(id);
    this.#persistStoryUi();
    this.render();
  }

  static #onToggleScene(event, target) {
    const key = target.dataset.row;
    if (this.#openRows.has(key)) this.#openRows.delete(key);
    else this.#openRows.add(key);
    this.#persistStoryUi();
    this.render();
  }

  static #onToggleOnlyGaps(event, target) {
    this.#onlyGaps = Boolean(target.checked);
    this.#persistStoryUi();
    this.render();
  }

  static async #onRefreshStory() {
    await this.#loadStory({ refresh: true });
  }

  /** "Show me where that is": outline it on the map, label it, bring the camera to it. */
  static async #onFocusSlot(event, target) {
    const view = this.#storyView();
    const entry = view ? slotIndex(view.story).get(target.dataset.slotKey) : null;
    if (!entry?.slot.locationId) return;
    const layer = await this.#ensureMap();
    if (!layer) return;
    this.#focusKey = entry.slot.key;
    const label = entry.slot === entry.row.place ? entry.row.title : `${entry.row.title} · ${entry.slot.label}`;
    if (!layer.focusLocation(entry.slot.locationId, { label })) ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.Story.NotDrawable"));
    this.render();
  }

  static #onEditSlot(event, target) {
    const key = target.dataset.slotKey;
    this.#editing = this.#editing === key ? null : key;
    this.#scrollToEditor = Boolean(this.#editing);
    this.#search = "";
    this.#staged = null;
    canvas.locationDraw?.disarmAssign?.();
    this.render();
  }

  /** "Pick on the map": the next click on an existing building, pin or (with Shift) area is the place. */
  static async #onPickOnMap() {
    const entry = this.#editEntry();
    if (!entry) return;
    const layer = await this.#ensureMap();
    if (!layer) return;
    layer.armAssign({
      label: `${entry.row.title} · ${entry.slot.label}`,
      onPick: (pick) => {
        this.#stagePlace(entry, { locationId: pick.locationId, name: pick.name, tier: pick.tier });
        layer.focusLocation(pick.locationId, { label: entry.row.title, pan: false });
        this.render();
      },
      onCancel: () => this.render()
    });
    this.render();
  }

  static #onCancelArm() {
    canvas.locationDraw?.disarmAssign({ cancelled: true });
  }

  /** Draw a new building (or drop a new pin) for this slot: over to the map tab with the right tool, and back here to confirm once it is saved. */
  static async #onDrawFor(event, target) {
    const entry = this.#editEntry();
    if (!entry) return;
    const kind = target.dataset.kind === "point" ? "point" : "site";
    this.#drawFor = { slotKey: entry.slot.key, label: `${entry.row.title} · ${entry.slot.label}`, kind };
    this.#tab = "map";
    this.#mode = "places";
    this.#placesShapeKind = kind;
    canvas.locationDraw?.disarmAssign?.();
    canvas.locationDraw?.setPendingTier(kind);
    await this.#selectTool(kind === "point" ? "point" : "polygon");
    this.render();
  }

  static #onCancelDraw() {
    this.#drawFor = null;
    this.#tab = "story";
    this.render();
  }

  static #onOffMapMenu() {
    this.#offMapOpen = !this.#offMapOpen;
    this.render();
  }

  static #onStageOffMap(event, target) {
    const entry = this.#editEntry();
    if (entry) this.#stagePlace(entry, { locationId: null, offMap: target.dataset.reason, name: "" });
    this.render();
  }

  static #onClearSlot() {
    const entry = this.#editEntry();
    if (entry) this.#stagePlace(entry, { locationId: null, name: "" });
    this.render();
  }

  /** A search suggestion was clicked: an existing location by id, or one drawn but not yet pulled by the record that drew it. */
  static #onStagePick(event, target) {
    const entry = this.#editEntry();
    if (!entry) return;
    const { locationId = null, recordId = null, name = "", tier = null } = target.dataset;
    this.#stagePlace(entry, locationId ? { locationId, name, tier } : { viaRecord: recordId, name, tier });
    if (locationId) canvas.locationDraw?.focusLocation?.(locationId, { label: entry.row.title });
    this.render();
  }

  static #onToggleLinked(event, target) {
    const link = this.#staged?.linked.find((l) => l.key === target.dataset.key);
    if (link) link.checked = Boolean(target.checked);
    this.render();
  }

  static #onCancelStage() {
    this.#staged = null;
    canvas.locationDraw?.clearFocus?.();
    this.render();
  }

  /** Write the placement: one "site" record for the slot and one for each linked slot the GM left ticked. Nothing is applied to the scene data until `npm run locations` pulls them home. */
  static async #onConfirmStage() {
    const staged = this.#staged;
    if (!staged) return;
    await this.#run("BLANKINHERITANCE.LocationEditor.Saving", async () => {
      const writes = [
        { target: staged.target, before: staged.before, beforeVia: staged.beforeVia, note: staged.isScene ? (staged.note.trim() || null) : null },
        ...staged.linked.filter((l) => l.checked).map((l) => ({ target: l.target, before: l.value, beforeVia: null, note: null }))
      ];
      for (const write of writes) {
        await saveLocationEdit({
          op: "site", target: write.target, locationId: staged.locationId, viaRecord: staged.viaRecord, offMap: staged.offMap,
          before: write.before, beforeVia: write.beforeVia, note: write.note
        });
      }
      ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.Story.Saved", { count: writes.length }));
      this.#staged = null;
      this.#editing = null;
    });
  }

  static async #onSave() {
    if (this.#selectedItems.length > 1) {
      ui.notifications.warn(L("BLANKINHERITANCE.LocationEditor.SelectExactlyOne"));
      return;
    }
    if (!this.#selectedItem) {
      ui.notifications.warn(L("BLANKINHERITANCE.LocationEditor.NothingSelected"));
      return;
    }
    const item = this.#selectedItem;
    const isNew = !item.locationId;
    // An existing location that was only opened and looked at has nothing to
    // save; so does one whose only "change" is its note. A locked site/point
    // never gets reshaped once promoted (draw.js's drawHandles rule: only a
    // region's border keeps needing tidying against its neighbours), and
    // tools/location-sync/apply_geometry.py#_apply_geometry refuses a
    // non-region geometry record outright, so geometry is only ever written
    // for a region whose outline actually moved.
    const edited = isNew ? [] : fieldsEdited(this.#loadedFields, this.#fields);
    const reshaped = !isNew && item.tier === "region" && itemGeometryChanged(item);
    if (!isNew && !edited.length && !reshaped) {
      ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.NothingChanged"));
      return;
    }
    // The note says what a new location is, or why an existing one's fields
    // changed; a region that was only reshaped needs none.
    if ((isNew || edited.length) && !this.#fields.note?.trim()) {
      this.#problems = [L("BLANKINHERITANCE.LocationEditor.NoteRequired")];
      this.render();
      return;
    }
    await this.#run("BLANKINHERITANCE.LocationEditor.Saving", async () => {
      const geomResult = isNew || reshaped ? await this.#buildGeometry(item) : { ok: true, problems: [], geometry: null };
      if (!geomResult.ok) {
        this.#problems = geomResult.problems;
        return;
      }
      if (isNew) {
        const record = await saveLocationEdit({
          op: "create", tier: item.tier, locationId: null, draftId: item.localId,
          geometry: geomResult.geometry, fields: this.#fields, before: null
        });
        ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.SavedNew"));
        console.log(`Blank Inheritance | Location Editor saved a new "${item.tier}" as record ${record.id} -- pull with npm run locations to mint its real id.`);
        // Drawn FOR a scene: the next step is putting that scene there, on the Story list.
        if (this.#drawFor) {
          const drawFor = this.#drawFor;
          this.#drawFor = null;
          const view = this.#storyView();
          const entry = view ? slotIndex(view.story).get(drawFor.slotKey) : null;
          if (entry) this.#stagePlace(entry, { viaRecord: record.id, name: this.#fields.name ?? "", tier: item.tier });
          this.#tab = "story";
        }
      } else {
        if (reshaped) {
          await saveLocationEdit({
            op: "geometry", tier: item.tier, locationId: item.locationId, draftId: item.localId,
            geometry: geomResult.geometry, fields: null, before: null
          });
          // What was just saved is the new "as opened": a second Save must not write it again.
          await canvas.locationDraw?.markItemSaved(item.localId);
        }
        if (edited.length) {
          await saveLocationEdit({
            op: "update", tier: item.tier, locationId: item.locationId, draftId: item.localId,
            geometry: null, fields: this.#fields, before: this.#loadedFields ?? emptyFields()
          });
          this.#loadedFields = JSON.parse(JSON.stringify(this.#fields));
        }
        ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.Saved"));
      }
      this.#problems = [];
    });
  }
}

let open = null;

export function openLocationEditor() {
  if (!game.user?.isGM) return null;
  if (open?.rendered) {
    open.bringToFront();
    return open;
  }
  open = new LocationEditorApplication();
  open.render({ force: true });
  return open;
}

export function refreshLocationEditor() {
  if (open?.rendered) open.render();
}

let hooksRegistered = false;

/** Registered once at module init; the panel's own onHubScene check needs a fresh render whenever the GM's canvas scene changes. */
export function registerLocationEditorHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  Hooks.on("canvasReady", () => refreshLocationEditor());
}

export async function createLocationEditorMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId(MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: L("BLANKINHERITANCE.LocationEditor.MacroName"),
      type: "script",
      img: "icons/svg/city.svg",
      command: `await game.modules.get("${MODULE_ID}").api.openLocationEditor();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the Location Editor macro.");
}
