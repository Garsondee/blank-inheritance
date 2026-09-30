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
  fieldsFromLocationDoc,
  geometryForRecord
} from "../core/location-editor.mjs";
import { check as checkDepth } from "../core/depth.mjs";
import { check as checkShape, metrics as shapeMetrics } from "../core/shape.mjs";
import { sceneCalibration, toImagePoint, toScenePoint } from "../core/travel-animation.mjs";
import { loadLocationEdits, pendingRecordsFor, saveLocationEdit } from "./location-edits.mjs";
import { fetchModuleJson } from "./io.mjs";
import { campaignMapImageWidth, campaignMapMetresPerPixel, hubScene } from "./travel.mjs";
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

export class LocationEditorApplication extends HandlebarsApplicationMixin(ApplicationV2) {
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

  /** The sole selected item, or null when zero or several are selected -- everything below that only makes sense for exactly one item (the field form, Save) reads this instead of #selectedItems directly. */
  get #selectedItem() {
    return this.#selectedItems.length === 1 ? this.#selectedItems[0] : null;
  }

  static DEFAULT_OPTIONS = {
    id: "bi-location-editor",
    classes: ["bi-location-editor", "bi-scope"],
    window: { title: "BLANKINHERITANCE.LocationEditor.Title", icon: "fa-solid fa-map-location-dot", resizable: true },
    position: { width: 460, height: 780, top: 70, left: 100 },
    actions: {
      setMode: LocationEditorApplication.#onSetMode,
      setShapeKind: LocationEditorApplication.#onSetShapeKind,
      setTool: LocationEditorApplication.#onSetTool,
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
    body: { template: `modules/${MODULE_ID}/templates/location-editor/panel.hbs`, scrollable: [".bi-location-editor__body"] }
  };

  /** Wire this panel to the draw layer's callbacks. Called once, right after construction. */
  #wireLayer() {
    const layer = canvas.locationDraw;
    if (!layer) return;
    // Opening the panel claims the canvas the same way selecting Foundry's
    // own Region/Drawing tool does -- without this, InteractionLayer.active
    // stays false (Tokens stays the active layer) and every click on the
    // canvas keeps going to Tokens instead of here. Found live: the panel's
    // own setTool() only ever changed internal state, never actually
    // claimed the layer, so clicking the canvas silently did nothing.
    if (!layer.active) layer.activate({ tool: layer.tool ?? "select" });
    // The layer's own pendingTier defaults to "site" and has no idea what
    // mode this panel opened in -- found live: opening straight into Areas
    // mode (the panel's own default) and drawing immediately produced a
    // SITE, not a region, because nothing had told the layer "areas" yet.
    layer.setPendingTier(this.#mode === "areas" ? "region" : this.#placesShapeKind);
    layer.configure({
      onSessionChange: (items) => {
        this.#items = items;
        this.#selectedItems = this.#selectedItems.filter((s) => items.find((i) => i.localId === s.localId));
        this.render();
      },
      onSelectionChange: (items) => this.#loadSelection(items),
      onStatus: (text) => {
        this.#status = text;
        this.render();
      },
      onBisectReady: (points) => this.#onBisectReady(points)
    });
    this.#items = layer.getSession ? Object.values(layer.getSession().items).sort((a, b) => a.localId.localeCompare(b.localId)) : [];
  }

  async _prepareContext() {
    await loadLocationEdits();
    const layer = canvas.locationDraw;
    const onHubScene = canvas?.scene && (await hubScene())?.id === canvas.scene.id;
    const pending = this.#selectedItem ? pendingRecordsFor(this.#selectedItem.localId) : [];
    const advice = await this.#computeAdvice(this.#selectedItem);
    return {
      busy: this.#busy,
      mode: this.#mode,
      placesShapeKind: this.#placesShapeKind,
      onHubScene: Boolean(onHubScene),
      tool: layer?.tool ?? "select",
      status: this.#status,
      items: this.#items.map((i) => ({
        localId: i.localId,
        tier: i.tier,
        locked: i.locked,
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
    const scene = await hubScene();
    if (!scene) return null;
    const width = await campaignMapImageWidth();
    if (!width) return null;
    const tiles = (scene.tiles?.contents ?? []).map((t) => ({
      x: t.x, y: t.y, width: t.width, height: t.height,
      texture: { anchorX: t.texture?.anchorX, anchorY: t.texture?.anchorY }
    }));
    return sceneCalibration(tiles, scene.width, width);
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

  static #onSetMode(event, target) {
    this.#mode = target.dataset.mode === "places" ? "places" : "areas";
    canvas.locationDraw?.setPendingTier(this.#mode === "areas" ? "region" : this.#placesShapeKind);
    this.render();
  }

  static #onSetShapeKind(event, target) {
    this.#placesShapeKind = target.dataset.shapeKind === "point" ? "point" : "site";
    canvas.locationDraw?.setPendingTier(this.#placesShapeKind);
    this.render();
  }

  static #onSetTool(event, target) {
    // setTool() only, not activate({tool}) again -- #wireLayer already
    // claimed the layer once when the panel opened. Found live: calling
    // Foundry's own activate({tool}) a SECOND time (switching tools on an
    // already-active layer) reaches into ui.controls.activate(), which
    // crashes inside Foundry's own private #onChangeTool (`Cannot read
    // properties of undefined (reading 'button')") -- its scene-controls
    // sidebar machinery expects a tool that has already been through ITS
    // OWN render pass, which mine never has, since this panel is the real
    // control surface and Foundry's native left-edge dock for this layer is
    // never shown. My own tool highlighting is entirely this panel's own
    // concern; Foundry's canvas dispatch already routes every click to
    // whichever layer is `active`, which does not depend on which tool
    // ui.controls itself thinks is selected.
    canvas.locationDraw?.setTool(target.dataset.tool ?? "select");
    this.render();
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
      canvas.locationDraw?.setTool("select");
      this.#bisectTargetId = null;
      this.#bisectTargetName = null;
      this.#bisectRingImagePx = null;
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
    if (!this.#fields.note?.trim()) {
      this.#problems = [L("BLANKINHERITANCE.LocationEditor.NoteRequired")];
      this.render();
      return;
    }
    await this.#run("BLANKINHERITANCE.LocationEditor.Saving", async () => {
      const item = this.#selectedItem;
      const geomResult = await this.#buildGeometry(item);
      if (!geomResult.ok) {
        this.#problems = geomResult.problems;
        return;
      }
      const isNew = !item.locationId;
      if (isNew) {
        const record = await saveLocationEdit({
          op: "create", tier: item.tier, locationId: null, draftId: item.localId,
          geometry: geomResult.geometry, fields: this.#fields, before: null
        });
        ui.notifications.info(L("BLANKINHERITANCE.LocationEditor.SavedNew"));
        console.log(`Blank Inheritance | Location Editor saved a new "${item.tier}" as record ${record.id} -- pull with npm run locations to mint its real id.`);
      } else {
        // Matches the old tool's own rule (draw.js's drawHandles: a locked
        // site/point never gets reshaped once promoted, only a region's
        // border keeps needing tidying against its neighbours) -- and
        // tools/location-sync/apply_geometry.py#_apply_geometry refuses a
        // non-region geometry record outright, so this guard keeps a stray
        // save from ever producing one to refuse in the first place.
        if (item.tier === "region") {
          await saveLocationEdit({
            op: "geometry", tier: item.tier, locationId: item.locationId, draftId: item.localId,
            geometry: geomResult.geometry, fields: null, before: null
          });
        }
        await saveLocationEdit({
          op: "update", tier: item.tier, locationId: item.locationId, draftId: item.localId,
          geometry: null, fields: this.#fields, before: this.#loadedFields ?? emptyFields()
        });
        this.#loadedFields = JSON.parse(JSON.stringify(this.#fields));
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
