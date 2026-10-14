/**
 * The Places tab: which places the story uses, and moving every use of one to another in one go (design/location-editor.md section 16).
 *
 * "Can we easily change a whole location from one place to another?" The Candidate Gate is where one scene happens, where a muster gathers everyone, where a way
 * of arriving ends and where the party stands as another scene opens: five slots. Changing them one at a time is how a map stops adding up. This lists the places
 * the story uses with every use under each (core/places-index.mjs), and "Move all..." turns one place into another across the slots the GM leaves ticked, showing
 * what that does to every journey first (core/journey-whatif.mjs) before writing one "site" record per slot, exactly as the single placement does.
 *
 * `host` is what the panel lends it: `rerender()`, `element()`, `view()`, `inputs()`, `layer()`, `ensureMap()`, `journeys()`, `pin()`, `openSlot(slotKey)`, `run(labelKey, fn)`,
 * `notify(level, text)`.
 */

import { buildPlacesIndex, bulkMovePlan, filterPlaces } from "../core/places-index.mjs";
import { searchPlaces } from "../core/siting.mjs";
import { viewOfWhatIf } from "../core/journey-whatif.mjs";
import { saveLocationEdit } from "./location-edits.mjs";

const NS = "BLANKINHERITANCE";
const K = `${NS}.LocationEditor.Places`;
const L = (key, data) => (data ? game.i18n.format(`${K}.${key}`, data) : game.i18n.localize(`${K}.${key}`));
const TIER_WORD = Object.freeze({ site: "building", region: "area", point: "pin" });
const SEARCH_DEBOUNCE_MS = 220;

export class LocationPlaces {
  #host;
  #query = "";
  #shared = false;
  #open = null;           // the place key whose uses are listed
  #bulk = null;           // { fromKey, fromName, slotKeys: Set, choice, search, target, whatIf }
  #refocus = false;

  constructor(host) {
    this.#host = host;
  }

  get bulkActive() {
    return Boolean(this.#bulk);
  }

  /* ---------------------------------------------------------------- what the template draws */

  context() {
    const view = this.#host.view();
    const inputs = this.#host.inputs();
    if (!view || !inputs) return { ready: false, query: this.#query, shared: this.#shared, rows: [], count: 0, bulk: null };
    const index = buildPlacesIndex(view.story, { locations: inputs.locations });
    const rows = filterPlaces(index, { query: this.#query, shared: this.#shared });
    const analysis = this.#host.journeys().result?.analysis;
    const problemOf = (entry) => {
      const issues = entry.uses.flatMap((u) => analysis?.places.get(u.slotKey)?.issues ?? []).filter((i) => i.severity !== "info");
      const worst = issues.some((i) => i.severity === "error") ? "error" : issues.length ? "warn" : null;
      return { problem: worst, problemText: issues.find((i) => i.severity === worst)?.text ?? null };
    };
    return {
      ready: true, query: this.#query, shared: this.#shared, count: index.length, shown: rows.length,
      rows: rows.map((entry) => ({
        key: entry.key, name: entry.name, tier: entry.tier, tierWord: TIER_WORD[entry.tier] ?? entry.tier ?? "", kind: entry.kind,
        useCount: entry.uses.length, scenes: entry.scenes, choices: entry.choices, pending: entry.pending, broken: entry.broken,
        open: entry.key === this.#open, moving: this.#bulk?.fromKey === entry.key, canShow: Boolean(entry.locationId), ...problemOf(entry),
        uses: entry.key === this.#open ? entry.uses.map((u) => ({ slotKey: u.slotKey, rowTitle: u.rowTitle, groupTitle: u.groupTitle, roleLabel: u.roleLabel, label: u.label, pending: u.pending })) : []
      })),
      bulk: this.#bulkContext(index, inputs)
    };
  }

  #bulkContext(index, inputs) {
    const b = this.#bulk;
    if (!b) return null;
    const entry = index.find((e) => e.key === b.fromKey);
    if (!entry) return null;
    const view = this.#host.view();
    const extra = Object.entries(view.newLocations).map(([recordId, fresh]) => ({ recordId, ...fresh }));
    const suggestions = b.search && !b.choice
      ? searchPlaces(inputs.locations, b.search, { limit: 8, extra }).map((s) => ({ ...s, chipTier: TIER_WORD[s.tier] ?? s.tier }))
      : [];
    const checked = entry.uses.filter((u) => b.slotKeys.has(u.slotKey));
    return {
      fromName: entry.name, uses: entry.uses.map((u) => ({ slotKey: u.slotKey, rowTitle: u.rowTitle, roleLabel: u.roleLabel, label: u.label, checked: b.slotKeys.has(u.slotKey) })),
      checkedCount: checked.length, choice: b.choice ? { name: b.choice.name || "(unnamed)", tierWord: TIER_WORD[b.choice.tier] ?? b.choice.tier ?? "", isNew: Boolean(b.choice.viaRecord) } : null,
      search: b.search, suggestions, pickBuildings: b.target === "places", pickAreas: b.target === "areas", armed: Boolean(this.#host.layer()?.assignArmed),
      whatIf: viewOfWhatIf(b.whatIf), canMove: Boolean(b.choice) && checked.length > 0
    };
  }

  /* ---------------------------------------------------------------- the page */

  bindDom(root) {
    const query = root.querySelector('[name="placesQuery"]');
    if (query) {
      let timer = null;
      query.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => { this.#query = query.value; this.#refocus = "query"; this.#host.rerender(); }, SEARCH_DEBOUNCE_MS);
      });
    }
    const search = root.querySelector('[name="bulkSearch"]');
    if (search) {
      let timer = null;
      search.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => { if (this.#bulk) { this.#bulk.search = search.value; this.#refocus = "search"; this.#host.rerender(); } }, SEARCH_DEBOUNCE_MS);
      });
    }
    const focusName = this.#refocus === "query" ? "placesQuery" : this.#refocus === "search" ? "bulkSearch" : null;
    if (focusName) {
      this.#refocus = false;
      const el = root.querySelector(`[name="${focusName}"]`);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  setShared(on) {
    this.#shared = Boolean(on);
    this.#host.rerender();
  }

  toggleOpen(key) {
    this.#open = this.#open === key ? null : key;
    this.#host.rerender();
  }

  /** Show the place on the map. */
  async show(key) {
    const view = this.#host.view();
    const entry = view ? buildPlacesIndex(view.story, { locations: this.#host.inputs().locations }).find((e) => e.key === key) : null;
    if (!entry?.locationId) return;
    const layer = await this.#host.ensureMap();
    if (!layer) return;
    if (!layer.focusLocation(entry.locationId, { label: entry.name })) this.#host.notify("info", game.i18n.localize("BLANKINHERITANCE.LocationEditor.Story.NotDrawable"));
  }

  /* ---------------------------------------------------------------- moving everything at a place */

  startBulk(key) {
    const view = this.#host.view();
    if (!view) return;
    const entry = buildPlacesIndex(view.story, { locations: this.#host.inputs().locations }).find((e) => e.key === key);
    if (!entry) return;
    this.#host.layer()?.disarmAssign?.();
    this.#open = key;
    this.#bulk = { fromKey: key, fromName: entry.name, slotKeys: new Set(entry.uses.map((u) => u.slotKey)), choice: null, search: "", target: "places", whatIf: null };
    this.#host.rerender();
  }

  toggleSlot(slotKey) {
    const b = this.#bulk;
    if (!b) return;
    if (b.slotKeys.has(slotKey)) b.slotKeys.delete(slotKey);
    else b.slotKeys.add(slotKey);
    this.#recompute();
    this.#host.rerender();
  }

  setTarget(target) {
    if (!this.#bulk) return;
    this.#bulk.target = target === "areas" ? "areas" : "places";
    this.#host.layer()?.setAssignTarget?.(this.#bulk.target);
    this.#host.rerender();
  }

  /** The next click on the map is where everything goes. */
  async pickOnMap() {
    const b = this.#bulk;
    if (!b) return;
    const layer = await this.#host.ensureMap();
    if (!layer) return;
    layer.armAssign({
      label: L("MoveAllLabel", { name: b.fromName }),
      target: b.target,
      onPick: (pick) => {
        if (pick.building) {
          this.#host.notify("info", L("AdoptFirst"));
        } else {
          this.choose({ locationId: pick.locationId, name: pick.name, tier: pick.tier });
          layer.focusLocation(pick.locationId, { label: b.fromName, pan: false });
        }
        this.#host.rerender();
      },
      onCancel: () => this.#host.rerender()
    });
    this.#host.rerender();
  }

  /** A place for everything to move to: an existing one (`locationId`) or one drawn but not pulled (`viaRecord`). */
  choose(choice) {
    const b = this.#bulk;
    if (!b) return;
    b.choice = choice;
    b.search = "";
    this.#recompute();
    this.#host.rerender();
  }

  stagePick(dataset) {
    const { locationId = null, recordId = null, name = "", tier = null } = dataset;
    this.choose(locationId ? { locationId, name, tier } : { viaRecord: recordId, name, tier });
    if (locationId) this.#host.layer()?.focusLocation?.(locationId, { label: this.#bulk?.fromName ?? "" });
  }

  clearChoice() {
    if (!this.#bulk) return;
    this.#bulk.choice = null;
    this.#bulk.whatIf = null;
    this.#host.layer()?.journey?.setPreview(null);
    this.#host.rerender();
  }

  /** Pin a new place for all the ticked uses. */
  async pinForAll() {
    const b = this.#bulk;
    const view = this.#host.view();
    if (!b || !view) return;
    const plan = bulkMovePlan(view.story, { slotKeys: [...b.slotKeys], choice: { viaRecord: "__new__" } });
    if (!plan.writes.length) return;
    await this.#host.pin().start({
      slots: plan.writes.map((w) => ({ key: w.key, target: w.target, label: w.label, rowTitle: w.rowTitle, before: w.before, beforeVia: w.beforeVia, isScene: w.isScene })),
      title: L("PinForAll", { name: b.fromName, count: plan.writes.length }),
      defaultName: `${b.fromName} (meeting point)`
    });
  }

  cancelBulk() {
    this.#bulk = null;
    const layer = this.#host.layer();
    layer?.disarmAssign?.();
    layer?.clearFocus?.();
    layer?.journey?.setPreview(null);
    this.#host.rerender();
  }

  /** What every journey that touches the ticked slots would become, drawn on the map and listed in the card. */
  #recompute() {
    const b = this.#bulk;
    const view = this.#host.view();
    if (!b?.choice || !view) {
      if (b) b.whatIf = null;
      this.#host.layer()?.journey?.setPreview(null);
      return;
    }
    const plan = bulkMovePlan(view.story, { slotKeys: [...b.slotKeys], choice: b.choice });
    const changes = plan.writes.map((w) => (b.choice.viaRecord ? { target: w.target, viaRecord: b.choice.viaRecord } : { target: w.target, locationId: b.choice.locationId }));
    b.whatIf = this.#host.journeys().whatIfFor(changes);
    const overlay = this.#host.layer()?.journey;
    const result = this.#host.journeys().result;
    const point = result && result.deps.pointOf({ locationId: b.choice.locationId ?? null, viaRecord: b.choice.viaRecord ?? null });
    if (overlay && b.whatIf && point) overlay.setPreview({ point, legs: b.whatIf.legs.map((l) => ({ runs: l.after.runs, worst: l.after.errors ? "error" : l.after.warns ? "warn" : null })) });
  }

  /** Write one "site" record per ticked slot. Nothing is applied to the scenes until `npm run locations` pulls them home. */
  async confirm() {
    const b = this.#bulk;
    const view = this.#host.view();
    if (!b?.choice || !view) return;
    const plan = bulkMovePlan(view.story, { slotKeys: [...b.slotKeys], choice: b.choice });
    if (!plan.writes.length) {
      this.#host.notify("info", game.i18n.localize("BLANKINHERITANCE.LocationEditor.Story.AlreadyThere"));
      return;
    }
    await this.#host.run("BLANKINHERITANCE.LocationEditor.Saving", async () => {
      for (const write of plan.writes) {
        await saveLocationEdit({
          op: "site", target: write.target, locationId: b.choice.locationId ?? null, viaRecord: b.choice.viaRecord ?? null, offMap: null,
          before: write.before, beforeVia: write.beforeVia, note: null
        });
      }
      this.#host.notify("info", game.i18n.format("BLANKINHERITANCE.LocationEditor.Story.Saved", { count: plan.writes.length }));
      this.#bulk = null;
      this.#host.layer()?.journey?.setPreview(null);
      this.#host.layer()?.clearFocus?.();
    });
  }
}
