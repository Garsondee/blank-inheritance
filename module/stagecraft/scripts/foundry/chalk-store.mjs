/**
 * Where chalk is kept (chalk.md §4.2): one Foundry journal entry that every player owns, with a page for each scene
 * and drawer, holding that drawer's strokes. A player writes only their own pages, so two people drawing at once never
 * overwrite each other; every client reads every page of the scene and merges them. The GM can delete or edit any page.
 * Because it is a world document it survives a reload, a session and a server restart, and no GM has to be online to
 * save a stroke.
 *
 * Writes go through one queue, so two strokes drawn a moment apart never read the same old page and lose one of them,
 * and a first stroke never makes two pages. The core (`core/chalk.mjs`) knows nothing about any of this.
 */

import { NS, rawStage, isStageScene, actingGM } from "./scene-data.mjs";
import { mergePages, effectivePolicy } from "../core/chalk.mjs";

export const ENTRY_NAME = "Stagecraft chalk";
export const PAGE_CAP = 40;           // strokes per page, so one update stays small

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

  #pagesOf(sceneId) {
    return (this.entry?.pages ?? []).filter((p) => p.getFlag(NS, "chalk")?.scene === sceneId);
  }

  /** Every stroke of a scene, merged from every page, in a stable order. */
  strokes(sceneId) {
    return mergePages(this.#pagesOf(sceneId).map((p) => ({ strokes: p.getFlag(NS, "chalk")?.strokes ?? [] })));
  }

  /** Run a write after every write before it, whatever happens to them. */
  #then(work) {
    const run = this.#queue.then(work);
    this.#queue = run.catch(() => {});
    return run;
  }

  /** Add a stroke to the drawer's own page for this scene, starting a new page when the last one is full. */
  append(sceneId, stroke) {
    return this.#then(async () => {
      const entry = this.entry;
      if (!entry) return false;
      const mine = this.#pagesOf(sceneId).filter((p) => p.getFlag(NS, "chalk")?.by === game.user.id);
      const page = mine.find((p) => (p.getFlag(NS, "chalk")?.strokes?.length ?? 0) < PAGE_CAP);
      if (page) {
        const strokes = [...(page.getFlag(NS, "chalk").strokes ?? []), stroke];
        await page.update({ [`flags.${NS}.chalk.strokes`]: strokes });
      } else {
        await entry.createEmbeddedDocuments("JournalEntryPage", [{
          name: `chalk ${sceneId} ${game.user.name}`, type: "text", text: { content: "" },
          flags: { [NS]: { chalk: { scene: sceneId, by: game.user.id, n: mine.length, strokes: [stroke] } } }
        }]);
      }
      return true;
    });
  }

  /** Remove strokes by id from whichever pages hold them. */
  remove(sceneId, ids) {
    const gone = new Set(ids);
    return this.#then(async () => {
      for (const page of this.#pagesOf(sceneId)) {
        const data = page.getFlag(NS, "chalk");
        const next = (data?.strokes ?? []).filter((s) => !gone.has(s.id));
        if (next.length === (data?.strokes ?? []).length || !page.isOwner) continue;
        await page.update({ [`flags.${NS}.chalk.strokes`]: next });
      }
    });
  }

  /** The GM's wipe: every stroke of a scene, or only one drawer's. */
  wipe(sceneId, { by = null } = {}) {
    if (!game.user.isGM) return Promise.resolve();
    return this.#then(async () => {
      for (const page of this.#pagesOf(sceneId)) {
        const data = page.getFlag(NS, "chalk");
        if (by && data?.by !== by) continue;
        if (!(data?.strokes ?? []).length) continue;
        await page.update({ [`flags.${NS}.chalk.strokes`]: [] });
      }
    });
  }

  /** The strokes a user drew in a scene, newest last: for the GM's undo. */
  strokesBy(sceneId, userId) {
    return this.strokes(sceneId).filter((s) => s.by === userId);
  }

  /** `fn(sceneId)` when a scene's strokes changed; `fn(null)` when the entry itself changed. Returns an unsubscribe. */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #tell(sceneId) {
    for (const fn of this.listeners) fn(sceneId);
  }

  #pageChanged(page) {
    if (page.parent?.id !== this.entry?.id) return;
    const scene = page.getFlag(NS, "chalk")?.scene;
    if (scene) this.#tell(scene);
  }

  #entryChanged(entry) {
    if (entry.getFlag(NS, "chalk") === true) this.#tell(null);
  }

  /** The acting GM's client removes a deleted scene's pages (a second GM doing it at once would find them already gone). */
  #sceneDeleted(scene) {
    if (!actingGM() || !scene?.id) return;
    this.#then(async () => {
      const ids = this.#pagesOf(scene.id).map((p) => p.id);
      if (ids.length) await this.entry.deleteEmbeddedDocuments("JournalEntryPage", ids);
    }).catch((err) => {
      if (/does not exist/.test(err?.message ?? "")) return;        // another GM's screen got there first
      console.warn(`${NS} | could not clear the chalk of a deleted scene`, err);
    });
  }
}
