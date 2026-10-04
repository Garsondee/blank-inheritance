/**
 * The Journal — the bigger page (design/objectives.md §4, D057 §3).
 *
 * Four tabs, Q and E between them as in Ingram's reference: Objectives (the list on the left with the selected one's
 * parts beneath it, its giver, their words and what we've learned on the right), Papers (every handout this player
 * holds), People (everyone the party has met, from the notebook) and Record (each closed objective as its paragraph).
 *
 * Opened from the player's deck (the Journal key), the J key, the tracker's own J, and the GM's Palette. Players write
 * their own objectives here, on a form that asks who and why before what (validateDraft); they tick and close their
 * own, and only the GM changes one the story gave (D057 §8).
 */

import { validateDraft, journalModel, recordModel, canEdit } from "../core/objectives.mjs";
import { currentMoment } from "./campaign-state.mjs";
import { QUARTERS } from "../core/day-ring.mjs";
import { actOnObjective, deleteOwnObjective, fileOwnObjective, objectiveStates, objectivesEntry } from "./objectives-store.mjs";
import { SETTING_SEEN, SETTING_TRACKED } from "./objectives-tracker.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const TEMPLATE = `modules/${MODULE_ID}/templates/journal/journal.hbs`;
const TABS = ["objectives", "papers", "people", "record"];
const MARK = `modules/${MODULE_ID}/assets/ui/handouts/directorate-mark.webp`;
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const TAB_KEYS = Object.freeze({
  objectives: "BLANKINHERITANCE.Journal.Tab.objectives",
  papers: "BLANKINHERITANCE.Journal.Tab.papers",
  people: "BLANKINHERITANCE.Journal.Tab.people",
  record: "BLANKINHERITANCE.Journal.Tab.record"
});
const ERROR_KEYS = Object.freeze({
  giver: "BLANKINHERITANCE.Journal.Form.Error.giver",
  why: "BLANKINHERITANCE.Journal.Form.Error.why",
  required: "BLANKINHERITANCE.Journal.Form.Error.required"
});
const getSetting = (key) => {
  try {
    return game.settings.get(MODULE_ID, key) || null;
  } catch {
    return null;
  }
};
const plain = (html, max = 220) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const initials = (name) => String(name ?? "?").replace(/^(the|section officer|deputy)\s+/i, "").split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

/** The characters at the table, for the giver list: a character can be their own giver (Own). */
function partyNames() {
  return game.users.filter((u) => !u.isGM && u.character).map((u) => u.character.name);
}

/** The people the party has met: the notebook's person pages, as the table names them. */
function peopleMet() {
  const notebook = game.journal?.find((e) => e.getFlag(MODULE_ID, "sourceId") === "party-notebook");
  return (notebook?.pages?.contents ?? [])
    .filter((p) => p.getFlag(MODULE_ID, "notebook")?.kind === "person")
    .map((p) => ({ id: p.id, name: p.name, img: p.getFlag(MODULE_ID, "notebook")?.img ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every handout this player holds, from the Papers folder (design/handouts.md). */
function papersHeld() {
  return (game.journal?.contents ?? [])
    .filter((entry) => entry.folder?.name === "Papers" && entry.visible)
    .map((entry) => {
      const page = entry.pages?.contents?.[0];
      return { id: entry.id, name: entry.name, excerpt: plain(page?.text?.content, 260) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export class Journal extends HandlebarsApplicationMixin(ApplicationV2) {
  #tab = "objectives";
  #selectedId = null;
  #pick = null;
  #writing = false;
  #errors = [];
  #draft = {};
  #keys = null;

  static DEFAULT_OPTIONS = {
    id: "bi-journal",
    // The whole window is the form, so the write-your-own page submits through ApplicationV2's own handler.
    tag: "form",
    classes: ["bi-journal-window"],
    window: { title: "BLANKINHERITANCE.Journal.WindowTitle", icon: "fa-solid fa-book-bookmark", resizable: true },
    position: { width: 1100, height: 720 },
    actions: {
      showTab: Journal.#onTab,
      select: Journal.#onSelect,
      pick: Journal.#onPick,
      track: Journal.#onTrack,
      write: Journal.#onWrite,
      cancelWrite: Journal.#onCancelWrite,
      tickPart: Journal.#onTickPart,
      closeOwn: Journal.#onCloseOwn,
      deleteOwn: Journal.#onDeleteOwn,
      reopen: Journal.#onReopen,
      openPaper: Journal.#onOpenPaper,
      openPerson: Journal.#onOpenPerson,
      openPlan: Journal.#onOpenPlan
    },
    form: { handler: Journal.#onFile, submitOnChange: false, closeOnSubmit: false }
  };

  static PARTS = { journal: { template: TEMPLATE, scrollable: [".bi-journal__left", ".bi-journal__right", ".bi-journal__single"] } };

  get tab() {
    return this.#tab;
  }

  /** Show one objective (the GM's board opens a row here). */
  select(objectiveId) {
    this.#selectedId = objectiveId;
    this.#writing = false;
  }

  showTab(tab) {
    if (TABS.includes(tab)) this.#tab = tab;
    return this.render();
  }

  /** @override */
  async _prepareContext() {
    const user = { userId: game.user.id, isGM: game.user.isGM };
    const states = objectiveStates();
    const moment = currentMoment();
    const tabs = TABS.map((id) => ({ id, on: id === this.#tab, label: L(TAB_KEYS[id]) }));
    const ctx = { tabs, tab: this.#tab, isGM: game.user.isGM, ready: Boolean(objectivesEntry()), mark: MARK };
    ctx.tele = { day: game.i18n.format("BLANKINHERITANCE.Journal.Day", { day: moment.day }), quarter: game.i18n.localize(QUARTERS.find((q) => q.id === moment.quarter)?.labelKey ?? QUARTERS[0].labelKey) };

    if (this.#tab === "objectives") {
      const model = journalModel(states, { ...user, selectedId: this.#selectedId, trackedId: getSetting(SETTING_TRACKED), moment, lastSeenIso: getSetting(SETTING_SEEN) });
      this.#selectedId = model.selected?.id ?? null;
      const sel = model.selected;
      if (sel) {
        sel.editable = canEdit(sel, user);
        sel.ownEditable = sel.editable && sel.source === "player";
        sel.kindLabel = game.i18n.localize(sel.kindLabelKey);
        sel.faceText = initials(sel.giver?.name);
        sel.parts = sel.parts.map((p) => ({ ...p, isPick: p.id === this.#pick }));
        sel.isOrder = sel.kind === "order";
        sel.log = (sel.log ?? []).map((l) => ({ ...l }));
      }
      ctx.objectives = model;
      ctx.selected = sel;
      ctx.writing = this.#writing;
      if (this.#writing) {
        const mine = game.user.character?.name ?? null;
        ctx.form = {
          errors: this.#errors.map((e) => L(ERROR_KEYS[e])),
          draft: this.#draft,
          self: mine,
          party: partyNames().filter((n) => n !== mine),
          met: peopleMet().map((p) => p.name),
          isGM: game.user.isGM,
          canBeMine: Boolean(mine) || game.user.isGM
        };
      }
    } else if (this.#tab === "record") {
      ctx.record = recordModel(states, user);
    } else if (this.#tab === "papers") {
      ctx.papers = papersHeld();
    } else if (this.#tab === "people") {
      const givers = states.filter((s) => s.giver?.name);
      ctx.people = peopleMet().map((p) => ({
        ...p,
        faceText: initials(p.name),
        gave: givers.filter((s) => s.giver.name.toLowerCase() === p.name.toLowerCase()).map((s) => s.title)
      }));
    }
    return ctx;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    // Q and E between tabs, T to track, W to write, while the Journal is the window in front. Caught on the document in
    // the capture phase: Foundry's own keys listen on the window (Q and E raise and lower tokens, T targets, W pans), so
    // this runs first and keeps them; and a re-render that drops focus inside the window does not lose them (found live).
    if (!this.#keys) {
      this.#keys = (event) => {
        if (!this.rendered || ui.activeWindow !== this) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target?.closest?.("input, textarea, select, [contenteditable]")) return;
        const key = event.key.toLowerCase();
        if (key === "q" || key === "e") {
          const i = TABS.indexOf(this.#tab) + (key === "e" ? 1 : -1);
          this.#tab = TABS[(i + TABS.length) % TABS.length];
          this.render();
        } else if (key === "t" && this.#selectedId) {
          game.settings.set(MODULE_ID, SETTING_TRACKED, this.#selectedId);
        } else if (key === "w") {
          this.#tab = "objectives";
          this.#writing = true;
          this.render();
        } else return;
        event.preventDefault();
        event.stopPropagation();
      };
      document.addEventListener("keydown", this.#keys, true);
    }
  }

  /* -------------------------------------------------------------- */

  static #onTab(event, target) {
    this.#tab = TABS.includes(target.dataset.tab) ? target.dataset.tab : "objectives";
    this.#writing = false;
    return this.render();
  }

  static #onSelect(event, target) {
    this.#selectedId = target.dataset.objectiveId;
    this.#pick = null;
    this.#writing = false;
    return this.render();
  }

  static #onPick(event, target) {
    this.#pick = this.#pick === target.dataset.partId ? null : target.dataset.partId;
    return this.render();
  }

  static async #onTrack(event, target) {
    const id = target.dataset.objectiveId ?? this.#selectedId;
    if (id) await game.settings.set(MODULE_ID, SETTING_TRACKED, id);
    return this.render();
  }

  static #onWrite() {
    this.#writing = true;
    this.#errors = [];
    return this.render();
  }

  static #onCancelWrite() {
    this.#writing = false;
    this.#errors = [];
    this.#draft = {};
    return this.render();
  }

  static async #onTickPart(event, target) {
    const state = objectiveStates().find((s) => s.id === this.#selectedId);
    if (!state) return;
    const part = state.parts.find((p) => p.id === target.dataset.partId);
    if (!part) return;
    const act = part.state === "done" ? "untick" : "tick";
    await actOnObjective(state.source === "story" ? state.id : state.pageId, act, { partId: part.id, scene: canvas?.scene?.name ?? null });
  }

  static async #onCloseOwn() {
    const state = objectiveStates().find((s) => s.id === this.#selectedId);
    if (!state) return;
    const record = await foundry.applications.api.DialogV2.prompt({
      window: { title: L("BLANKINHERITANCE.Journal.CloseTitle") },
      content: `<p>${L("BLANKINHERITANCE.Journal.CloseHint")}</p><textarea name="record" rows="5" style="width:100%"></textarea>`,
      ok: { label: L("BLANKINHERITANCE.Journal.CloseOk"), callback: (ev, button) => button.form.elements.record.value }
    }).catch(() => null);
    if (record === null) return;
    await actOnObjective(state.source === "story" ? state.id : state.pageId, "close", { record, scene: canvas?.scene?.name ?? null });
  }

  static async #onDeleteOwn() {
    const state = objectiveStates().find((s) => s.id === this.#selectedId);
    if (!state || state.source !== "player") return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: L("BLANKINHERITANCE.Journal.DeleteTitle") },
      content: `<p>${L("BLANKINHERITANCE.Journal.DeleteConfirm", { title: foundry.utils.escapeHTML?.(state.title) ?? state.title })}</p>`
    }).catch(() => false);
    if (ok) await deleteOwnObjective(state.pageId);
  }

  static async #onReopen(event, target) {
    const state = objectiveStates().find((s) => s.id === target.dataset.objectiveId);
    if (state) await actOnObjective(state.source === "story" ? state.id : state.pageId, "reopen", {});
  }

  static #onOpenPaper(event, target) {
    game.journal.get(target.dataset.entryId)?.sheet?.render(true);
  }

  static async #onOpenPerson(event, target) {
    const { openNotebook } = await import("./notebook.mjs");
    return openNotebook({ pageId: target.dataset.pageId });
  }

  /** The table's own notes about an objective live in the notebook, as a plan page titled after it. */
  static async #onOpenPlan() {
    const state = objectiveStates().find((s) => s.id === this.#selectedId);
    if (!state) return;
    const { pageViews, createArticle } = await import("./notebook-store.mjs");
    const { openNotebook } = await import("./notebook.mjs");
    const existing = pageViews().find((p) => p.kind === "plan" && p.name === state.title);
    const page = existing ?? (await createArticle({ kind: "plan", title: state.title }));
    return openNotebook({ pageId: page?.id ?? null });
  }

  /** The form's submit: the rule first (validateDraft), then file it. */
  static async #onFile(event, form, formData) {
    const data = formData.object ?? {};
    const self = game.user.character?.name ?? null;
    const giverName = String(data.giver ?? "").trim();
    const draft = {
      giverName,
      giverIsSelf: Boolean(self) && giverName.toLowerCase() === self.toLowerCase(),
      giverIsParty: partyNames().some((n) => n.toLowerCase() === giverName.toLowerCase()),
      wasOrder: Boolean(data.wasOrder),
      said: data.said,
      why: data.why,
      required: [data.req1, data.req2],
      optional: [data.opt1],
      by: data.by,
      scope: data.scope === "group" || !self ? "group" : "character",
      visibility: data.visibility === "owner" ? "owner" : "all"
    };
    this.#draft = { ...data };
    this.#errors = validateDraft(draft);
    if (this.#errors.length) return this.render();
    const page = await fileOwnObjective(draft, { ownerName: self, scene: canvas?.scene?.name ?? null, asGM: game.user.isGM });
    this.#writing = false;
    this.#draft = {};
    this.#selectedId = page?.getFlag(MODULE_ID, "objective")?.id ?? this.#selectedId;
    return this.render();
  }
}

/* ------------------------------------------------------------------ */
/*  The singleton and wiring                                           */
/* ------------------------------------------------------------------ */

let active = null;

export function openJournal({ tab = null, select = null } = {}) {
  if (!active) active = new Journal();
  if (select) active.select(select);
  if (tab) active.showTab(tab);
  if (active.rendered) {
    active.bringToFront();
    return active;
  }
  return active.render({ force: true });
}

export function toggleJournal() {
  if (active?.rendered) return active.close();
  return openJournal();
}

export function refreshJournal() {
  if (active?.rendered) active.render();
}

export const getJournal = () => active;
