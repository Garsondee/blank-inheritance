/**
 * Dropping a pin for a scene, in one go (design/location-editor.md section 16).
 *
 * "What if I want to place a map pin somewhere on the map and have the tokens go there?" Until now that was a chain: choose "Drop a pin", change to the Map tab,
 * pick the point tool, click, fill in a form that insists on a note, Save, go back to the Story, confirm the placement. This is the same result in one card: press
 * Pin on the map, move the cursor (the routes the tokens would walk to and from that spot, and whether it is somewhere a token can stand, show as it moves),
 * click, name it if you like, and Place. It writes exactly the records the long way writes -- a "create" for a new pin and one "site" record for each slot that
 * now points at it -- so `npm run locations` needs nothing it did not already do.
 *
 * It can pin for several slots at once (the Places tab's "move everything here"), which is why it holds a list of slots, not one.
 *
 * `host` is what the panel lends it: `rerender()`, `element()`, `layer()`, `ensureMap()`, `journeys()` (foundry/location-journeys.mjs), `run(labelKey, fn)`,
 * `notify(level, text)`.
 */

import { emptyFields } from "../core/location-editor.mjs";
import { defaultPinName, quickPinFields } from "../core/journey-points.mjs";
import { placeIssues } from "../core/journey-checks.mjs";
import { previewAt } from "../core/journey-whatif.mjs";
import { toImagePoint, toScenePoint } from "../core/travel-animation.mjs";
import { saveLocationEdit } from "./location-edits.mjs";

const NS = "BLANKINHERITANCE";
const K = `${NS}.LocationEditor.Pin`;
const L = (key, data) => (data ? game.i18n.format(`${K}.${key}`, data) : game.i18n.localize(`${K}.${key}`));
const SNAP_REACH_PX = 500;           // a spot this far from a street or a rail (map-image pixels) is not snapped onto it
const round1 = (n) => Math.round(n * 10) / 10;

export class LocationPin {
  #host;
  #state = null;      // { slots, title, defaultName, stage: "arming" | "placed", name, note, snap, point (map-image px) | null, lines, worst }

  constructor(host) {
    this.#host = host;
  }

  get active() {
    return Boolean(this.#state);
  }

  /** The pin card for the panel, or null when no pin is being placed. */
  context() {
    const s = this.#state;
    if (!s) return null;
    return {
      title: s.title, placed: s.stage === "placed", arming: s.stage === "arming", name: s.name, defaultName: s.defaultName, note: s.note, snap: s.snap,
      count: s.slots.length, many: s.slots.length > 1, lines: s.lines, worst: s.worst, hasLines: s.lines.length > 0
    };
  }

  /**
   * Start placing a pin for `slots` (`[{ key, target, label, slotLabel, rowTitle, before, beforeVia, isScene }]`): wait for the click on the map.
   * `title` heads the card; `defaultName` is the name the pin gets if none is typed.
   */
  async start({ slots, title, defaultName }) {
    if (!slots?.length) return;
    const layer = await this.#host.ensureMap();
    if (!layer) return;
    this.cancel({ quiet: true });
    this.#state = { slots, title, defaultName: defaultName || defaultPinName(slots[0].rowTitle, slots[0].slotLabel ?? ""), stage: "arming", name: "", note: "", snap: false, point: null, lines: [], worst: null };
    this.#arm(layer);
    this.#host.rerender();
  }

  #arm(layer) {
    layer.armPin({
      label: this.#state.title,
      onMove: (scenePoint) => this.#onMove(scenePoint),
      onPick: (scenePoint) => this.#onPick(scenePoint),
      onCancel: () => this.#onCancelled()
    });
  }

  /* ---------------------------------------------------------------- the cursor */

  /** A scene point -> the map-image point a token would stand at: snapped onto the nearest street or rail when asked and one is near. */
  #imagePoint(scenePoint) {
    const calibration = this.#host.layer()?.calibration;
    if (!calibration) return null;
    const image = toImagePoint(scenePoint, calibration);
    if (!this.#state?.snap) return image;
    const node = this.#host.journeys().result?.deps.router.nearestNode(image);
    return node && node.dist <= SNAP_REACH_PX ? { x: node.x, y: node.y } : image;
  }

  #onMove(scenePoint) {
    if (!this.#state || this.#state.stage !== "arming") return;
    const point = this.#imagePoint(scenePoint);
    if (point) this.#show(point);
  }

  #onPick(scenePoint) {
    const s = this.#state;
    if (!s) return;
    const point = this.#imagePoint(scenePoint);
    if (!point) {
      this.cancel({ quiet: true });
      this.#host.rerender();
      return;
    }
    s.stage = "placed";
    s.point = point;
    this.#show(point);
    this.#host.rerender();
  }

  #onCancelled() {
    if (!this.#state) return;
    this.#clear();
    this.#host.rerender();
  }

  /** Preview the pin at a point: the routes on the map, the words in the card. */
  #show(point) {
    const s = this.#state;
    const result = this.#host.journeys().result;
    const overlay = this.#host.layer()?.journey;
    const lines = [];
    const rank = { error: 3, warn: 2 };
    let worst = null;
    const note = (severity, text) => {
      lines.push({ severity, text, icon: severity === "error" ? "fa-circle-xmark" : severity === "warn" ? "fa-triangle-exclamation" : "fa-check" });
      if ((rank[severity] ?? 0) > (rank[worst] ?? 0)) worst = severity;
    };
    if (!result) {
      note("info", L("NoJourneys"));
    } else {
      const here = { slotKey: null, rowKey: null, title: s.title, label: s.title, locationId: null, viaRecord: "pin", state: "pending-new", name: s.name || s.defaultName, tier: "point", pending: true, offMapReason: null };
      for (const issue of placeIssues(here, { point, landGrid: result.deps.landGrid })) if (issue.severity !== "info") note(issue.severity, issue.text);
      const byLeg = new Map();
      for (const slot of s.slots) for (const p of previewAt({ model: result.model, slotKey: slot.key, point, deps: result.deps })) byLeg.set(p.id, p);
      const previews = [...byLeg.values()];
      for (const p of previews) {
        const where = p.side === "to" ? L("Arrives") : L("Leaves");
        const problems = p.summary.issues.filter((i) => i.severity !== "info");
        if (p.summary.status === "routed") note(problems.some((i) => i.severity === "error") ? "error" : problems.length ? "warn" : "info", `${where}: ${p.summary.badge.distance} · ${p.summary.badge.time}`);
        else note("error", `${where}: ${p.summary.badge.statusText}`);
        for (const issue of problems.slice(0, 2)) note(issue.severity, issue.text);
      }
      if (!previews.length) note("info", L("NoJourneysTouch"));
      overlay?.setPreview({ point, legs: previews.map((p) => ({ runs: p.summary.runs, worst: p.summary.errors ? "error" : p.summary.warns ? "warn" : null })) });
    }
    s.lines = lines.slice(0, 8);
    s.worst = worst;
    this.#paint();
  }

  /** Update the readout under the cursor in place (a render of the window on every mouse move would be far too much). */
  #paint() {
    const s = this.#state;
    const root = this.#host.element();
    const list = root?.querySelector?.(".bi-pin__readout");
    if (!list || !s) return;
    list.replaceChildren(...s.lines.map((line) => {
      const li = document.createElement("li");
      li.className = `is-${line.severity}`;
      const icon = document.createElement("i");
      icon.className = `fa-solid ${line.icon}`;
      li.append(icon, document.createTextNode(` ${line.text}`));
      return li;
    }));
    list.closest(".bi-pin")?.setAttribute("data-worst", s.worst ?? "ok");
  }

  /* ---------------------------------------------------------------- the card */

  /** Wire the card's text boxes; called on every render of the panel. */
  bindDom(root) {
    const s = this.#state;
    if (!s) return;
    root.querySelector('[name="pinName"]')?.addEventListener("input", (event) => { s.name = event.target.value; });
    root.querySelector('[name="pinNote"]')?.addEventListener("input", (event) => { s.note = event.target.value; });
    // a card re-rendered while a pin is being placed shows the lines it had
    this.#paint();
  }

  toggleSnap(on) {
    if (!this.#state) return;
    this.#state.snap = Boolean(on);
    const layer = this.#host.layer();
    const at = this.#state.point ?? null;
    if (this.#state.stage === "placed" && at) {
      // re-snap the pin where it was put: from the scene point, not from the already snapped one
      const scene = layer?.calibration ? toScenePoint(at, layer.calibration) : null;
      const point = scene ? this.#imagePoint(scene) : at;
      if (point) { this.#state.point = point; this.#show(point); }
    }
  }

  /** Put the pin somewhere else: back to waiting for a click. */
  move() {
    const s = this.#state;
    const layer = this.#host.layer();
    if (!s || !layer) return;
    s.stage = "arming";
    this.#arm(layer);
    this.#host.rerender();
  }

  cancel({ quiet = false } = {}) {
    if (!this.#state) return;
    this.#host.layer()?.disarmPin();
    this.#clear();
    if (!quiet) this.#host.rerender();
  }

  #clear() {
    this.#state = null;
    this.#host.layer()?.journey?.setPreview(null);
  }

  /**
   * Write the pin and the placements: one "create" for the new point and one "site" record for each slot, each remembering what the editor saw there. Nothing is
   * applied to the scenes until `npm run locations` pulls them home.
   */
  async confirm() {
    const s = this.#state;
    if (!s || s.stage !== "placed" || !s.point) return;
    await this.#host.run("BLANKINHERITANCE.LocationEditor.Saving", async () => {
      const name = s.name.trim() || s.defaultName;
      const fields = quickPinFields({ name, note: s.note, scene: s.slots[0].rowTitle, base: emptyFields() });
      const record = await saveLocationEdit({
        op: "create", tier: "point", locationId: null, draftId: `quick-pin-${Date.now().toString(36)}`,
        geometry: { rings: [], point: [round1(s.point.x), round1(s.point.y)] }, fields, before: null
      });
      for (const slot of s.slots) {
        await saveLocationEdit({ op: "site", target: slot.target, locationId: null, viaRecord: record.id, offMap: null, before: slot.before, beforeVia: slot.beforeVia, note: null });
      }
      this.#host.notify("info", L("Saved", { name, count: s.slots.length }));
      this.#clear();
    });
  }
}
