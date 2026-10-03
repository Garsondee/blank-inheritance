/**
 * Where chalk is kept (chalk.md §4.2): one Foundry journal entry that every player owns, with a page for each scene and
 * painter. A page is that painter's layer of the wall: the tiles that have paint on them, each a small picture, and a
 * short history of what those tiles held before each of the last strokes made on it, so a stroke can be taken back.
 *
 * A painter writes only their own page, so two people painting at once never overwrite each other; a GM may write any
 * (to rub out, take back or wipe anyone's). Every tile and every step of history is its own key, written and deleted on
 * its own, so two writes to one page a moment apart never lose each other either. Because it is a world document it
 * survives a reload, a session and a server restart, and no GM has to be online for paint to be kept.
 *
 * Since 2026-10-03 (the second edition, raster chalk). A page of the first edition (lines of points, `strokes`) cannot be
 * shown any more; a GM's client removes them.
 */

import { NS, rawStage, isStageScene, actingGM } from "./scene-data.mjs";
import { effectivePolicy, newestStep, overflowSteps, validTileKey, wallGrid, HISTORY } from "../core/chalk.mjs";

export const ENTRY_NAME = "Stagecraft chalk";
export const FORMAT = 2;

/** Chalk's writes ask Foundry to redraw nothing: nobody reads these pages in a window (chalk.md §11). */
const QUIET = Object.freeze({ render: false });

/**
 * Take one key out of an object in a document update: Foundry 14's ForcedDeletion (`_del`) where it has one, the older
 * "-=key" form elsewhere (Foundry 14 still takes it, with a warning in the console every time).
 */
function remove(update, path, key) {
  if (globalThis._del !== undefined) update[`${path}.${key}`] = globalThis._del;
  else update[`${path}.-=${key}`] = null;
}

export class ChalkStore {
  #queue = Promise.resolve();

  constructor() {
    this.listeners = new Set();
    this.hooks = [];
    for (const name of ["createJournalEntryPage", "updateJournalEntryPage", "deleteJournalEntryPage"]) {
      this.hooks.push([name, Hooks.on(name, (page) => this.#pageChanged(page))]);
    }
    // the entry itself arriving (a GM logging in for the first time), changing hands or going: every scene re-reads
    for (const name of ["createJournalEntry", "updateJournalEntry", "deleteJournalEntry"]) {
      this.hooks.push([name, Hooks.on(name, (entry) => this.#entryChanged(entry))]);
    }
    // a scene that is deleted takes its chalk with it, so the journal never fills with walls nobody can reach
    this.hooks.push(["deleteScene", Hooks.on("deleteScene", (scene) => this.#sceneDeleted(scene))]);
    // a scene newly allowed to use chalk (flagged, or opened by the GM's strip) gets the journal made if it is not there yet
    for (const name of ["createScene", "updateScene"]) {
      this.hooks.push([name, Hooks.on(name, () => this.#wantedMaybe())]);
    }
    this.#retireFirstEdition();
  }

  dispose() {
    for (const [name, id] of this.hooks) Hooks.off(name, id);
    this.hooks = [];
    this.listeners.clear();
  }

  /** The entry, if a GM has made it yet. */
  get entry() {
    return game.journal?.find((e) => e.getFlag(NS, "chalk") === true) ?? null;
  }

  get ready() { return !!this.entry; }

  /** Does any stage scene in this world allow chalk (as its author wrote it, or as the GM has overridden it)? */
  static wanted() {
    return !!game.scenes?.some((scene) => isStageScene(scene) && effectivePolicy(rawStage(scene).chalk, scene.flags?.[NS]?.live?.chalk).mode !== "off");
  }

  static #making = null;

  /**
   * A GM makes the entry (and keeps everyone an owner of it). Players cannot. Callers ask only when chalk is wanted, so a
   * world that never uses chalk never gets one, and two asks at once make one entry.
   */
  static ensure() {
    if (!actingGM()) return Promise.resolve(null);
    return (ChalkStore.#making ??= ChalkStore.#ensure().finally(() => { ChalkStore.#making = null; }));
  }

  static async #ensure() {
    const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    let entry = game.journal.find((e) => e.getFlag(NS, "chalk") === true);
    if (!entry) entry = await JournalEntry.create({ name: ENTRY_NAME, flags: { [NS]: { chalk: true } }, ownership: { default: OWNER } });
    else if ((entry.ownership?.default ?? 0) < OWNER) await entry.update({ "ownership.default": OWNER });
    return entry;
  }

  #wantedMaybe() {
    if (!actingGM() || this.ready || !ChalkStore.wanted()) return;
    ChalkStore.ensure().catch((err) => console.warn(`${NS} | could not make the chalk journal`, err));
  }

  /** Every page of the second edition for a scene. */
  #pagesOf(sceneId) {
    return (this.entry?.pages ?? []).filter((p) => { const d = p.getFlag(NS, "chalk"); return d?.scene === sceneId && d?.v === FORMAT; });
  }

  #pageOf(sceneId, by) {
    return this.#pagesOf(sceneId).find((p) => p.getFlag(NS, "chalk")?.by === by) ?? null;
  }

  /** The layers of a scene: [{ by, since, tiles: { key: picture }, history: { id: step } }], in no particular order. */
  layers(sceneId) {
    return this.#pagesOf(sceneId).map((p) => {
      const d = p.getFlag(NS, "chalk");
      return { by: d.by, since: d.since ?? 0, tiles: { ...(d.tiles ?? {}) }, history: { ...(d.history ?? {}) } };
    });
  }

  /** Run a write after every write before it, whatever happens to them. */
  #then(work) {
    const run = this.#queue.then(work);
    this.#queue = run.catch(() => {});
    return run;
  }

  /**
   * Keep a painter's tiles: `tiles` is { key: picture | null } (null takes a tile away). With a `step` ({ id, at }), what
   * those tiles held before is kept too, so the stroke can be taken back. The layer's page is made at its first paint.
   */
  save(sceneId, { by = game.user.id, tiles, step = null, grid = null }) {
    return this.#then(async () => {
      const entry = this.entry;
      if (!entry) return false;
      const keys = Object.keys(tiles ?? {}).filter((key) => !grid || validTileKey(grid, key));
      if (!keys.length) return false;
      const page = this.#pageOf(sceneId, by);
      if (!page) {
        if (by !== game.user.id && !game.user.isGM) return false;
        const kept = Object.fromEntries(keys.filter((k) => tiles[k]).map((k) => [k, tiles[k]]));
        const history = step ? { [step.id]: { at: step.at, who: game.user.id, tiles: Object.fromEntries(keys.map((k) => [k, null])) } } : {};
        await entry.createEmbeddedDocuments("JournalEntryPage", [{
          name: `chalk ${sceneId} ${by}`, type: "text", text: { content: "" },
          flags: { [NS]: { chalk: { v: FORMAT, scene: sceneId, by, since: step?.at ?? Date.now(), tiles: kept, history } } }
        }], QUIET);
        return true;
      }
      const data = page.getFlag(NS, "chalk");
      const update = {};
      const root = `flags.${NS}.chalk`;
      for (const key of keys) {
        if (tiles[key]) update[`${root}.tiles.${key}`] = tiles[key];
        else if (data.tiles?.[key] !== undefined) remove(update, `${root}.tiles`, key);
      }
      if (step) {
        update[`${root}.history.${step.id}`] = { at: step.at, who: game.user.id, tiles: Object.fromEntries(keys.map((k) => [k, data.tiles?.[k] ?? null])) };
        for (const old of overflowSteps({ ...(data.history ?? {}), [step.id]: { at: step.at } }, HISTORY)) remove(update, `${root}.history`, old);
      }
      await page.update(update, QUIET);
      return true;
    });
  }

  /**
   * Take back the newest stroke: on the whole wall (the GM's Undo), or the newest `by` made (a painter's Ctrl+Z, which
   * never takes back what someone else did, even to their own layer). A stroke that touched several layers (a GM rubbing
   * out everyone's) is taken back from all of them. Returns { id, layers: { painter: { key: what it held } } }, what each
   * tile held before it was taken back (so it can be put back), or null when there is nothing to take back.
   */
  undo(sceneId, { by = null } = {}) {
    return this.#then(async () => {
      const pages = this.#pagesOf(sceneId);
      const layers = pages.map((p) => {
        const d = p.getFlag(NS, "chalk");
        const history = by ? Object.fromEntries(Object.entries(d.history ?? {}).filter(([, s]) => s?.who === by)) : d.history;
        return { by: d.by, history, page: p };
      });
      const newest = newestStep(layers);
      if (!newest) return null;
      const undone = {};
      for (const layer of layers) {
        const step = layer.history?.[newest.id];
        if (!step || !layer.page.isOwner) continue;
        const root = `flags.${NS}.chalk`;
        const data = layer.page.getFlag(NS, "chalk");
        const update = {};
        remove(update, `${root}.history`, newest.id);
        const held = {};
        for (const [key, before] of Object.entries(step.tiles ?? {})) {
          held[key] = data.tiles?.[key] ?? null;
          if (before) update[`${root}.tiles.${key}`] = before;
          else if (data.tiles?.[key] !== undefined) remove(update, `${root}.tiles`, key);
        }
        await layer.page.update(update, QUIET);
        undone[layer.by] = held;
      }
      return { id: newest.id, layers: undone };
    });
  }

  /** The GM's wipe: every layer of a scene, or only one painter's; their history goes too. */
  wipe(sceneId, { by = null } = {}) {
    if (!game.user.isGM) return Promise.resolve();
    return this.#then(async () => {
      for (const page of this.#pagesOf(sceneId)) {
        const data = page.getFlag(NS, "chalk");
        if (by && data?.by !== by) continue;
        const root = `flags.${NS}.chalk`;
        const update = {};
        for (const key of Object.keys(data?.tiles ?? {})) remove(update, `${root}.tiles`, key);
        for (const id of Object.keys(data?.history ?? {})) remove(update, `${root}.history`, id);
        if (Object.keys(update).length) await page.update(update, QUIET);
      }
    });
  }

  /** The painters of a scene who have kept any paint, for the GM. */
  painters(sceneId) {
    return this.layers(sceneId).filter((l) => Object.keys(l.tiles).length).map((l) => l.by);
  }

  /** `fn(sceneId, by)` when a painter's layer of a scene changed; `fn(null)` when the entry itself changed. Returns an unsubscribe. */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #tell(sceneId, by = null) {
    for (const fn of this.listeners) fn(sceneId, by);
  }

  #pageChanged(page) {
    if (page.parent?.id !== this.entry?.id) return;
    const data = page.getFlag(NS, "chalk");
    if (data?.v !== FORMAT) { this.#retireFirstEdition(); return; }
    if (data?.scene) this.#tell(data.scene, data.by);
  }

  #entryChanged(entry) {
    if (entry.getFlag(NS, "chalk") === true) { this.#tell(null); this.#retireFirstEdition(); }
  }

  /** The acting GM's client removes the pages of the first edition (lines of points), which nothing can show any more. */
  #retireFirstEdition() {
    if (!actingGM() || !this.entry) return;
    const old = (this.entry.pages ?? []).filter((p) => { const d = p.getFlag(NS, "chalk"); return d && d.v !== FORMAT; }).map((p) => p.id);
    if (!old.length) return;
    this.#then(() => this.entry.deleteEmbeddedDocuments("JournalEntryPage", old)).catch((err) => {
      if (!/does not exist/.test(err?.message ?? "")) console.warn(`${NS} | could not remove old chalk pages`, err);
    });
  }

  /** The acting GM's client removes a deleted scene's pages (a second GM doing it at once would find them already gone). */
  #sceneDeleted(scene) {
    if (!actingGM() || !scene?.id) return;
    this.#then(async () => {
      const ids = (this.entry?.pages ?? []).filter((p) => p.getFlag(NS, "chalk")?.scene === scene.id).map((p) => p.id);
      if (ids.length) await this.entry.deleteEmbeddedDocuments("JournalEntryPage", ids);
    }).catch((err) => {
      if (/does not exist/.test(err?.message ?? "")) return;        // another GM's screen got there first
      console.warn(`${NS} | could not clear the chalk of a deleted scene`, err);
    });
  }
}

/** The wall a scene's chalk is painted on (core/chalk.mjs `wallGrid`), from its stage description. */
export const gridOf = (description) => wallGrid(description.painting);
