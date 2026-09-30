/**
 * The party notebook — the window.
 *
 * design/notebook.md. One window for the whole table: an index of every page
 * on the left (people the party has met, and any article a player starts) and
 * the page itself on the right, written in Foundry's own collaborative editor
 * so several players can type in the same page at the same moment.
 *
 * Opened four ways: by clicking a portrait on the stage (straight to that
 * person's page), from the Notes key on every deck, from the N key, and from
 * Foundry's own journal list, where the notebook is an ordinary entry.
 *
 * TWO PARTS, AND THE SPLIT MATTERS. The index re-renders whenever anyone saves
 * anything. The editor renders only when the selected page changes. If they
 * were one part, every other player's save would rebuild the editor under
 * somebody who is typing.
 *
 * Saving: Foundry's server autosaves a collaborative page only every 30 to 300
 * seconds and NOT when the last editor leaves, so this window also writes the
 * page itself: a few seconds after the last keystroke, when the page changes,
 * and when the window closes.
 */

import {
  ARTICLE_KINDS,
  FILTERS,
  KIND_META,
  NOTE_KINDS,
  agoLabel,
  canDeletePage,
  canRetitle,
  indexModel,
  isPersonPage,
  nameOfUser,
  selectionFor
} from "../core/notebook.mjs";
import { openCharacterCard } from "./character-card.mjs";
import {
  createArticle,
  deletePage,
  ensureNotebook,
  ensurePersonPage,
  guardPageSheet,
  notebookEntry,
  pageById,
  pageViews,
  renamePage,
  savePageText,
  scheduleNotebookExport,
  setPageKind,
  syncActiveStagedPeople
} from "./notebook-store.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/notebook`;
const AUTOSAVE_MS = 4000;
const REFRESH_MS = 350;

export class Notebook extends HandlebarsApplicationMixin(ApplicationV2) {
  #selectedId = null;
  #filter = "all";
  #query = "";
  #focusTitle = false;
  #autosave = null;
  #refresh = null;

  static DEFAULT_OPTIONS = {
    id: "bi-notebook",
    tag: "section",
    classes: ["bi-notebook-window"],
    window: {
      title: "BLANKINHERITANCE.Notebook.WindowTitle",
      icon: "fa-solid fa-book-open",
      resizable: true
    },
    position: { width: 960, height: 680 },
    actions: {
      select: Notebook.#onSelect,
      newArticle: Notebook.#onNewArticle,
      setFilter: Notebook.#onSetFilter,
      deletePage: Notebook.#onDeletePage,
      openCard: Notebook.#onOpenCard
    }
  };

  static PARTS = {
    index: { template: `${TEMPLATE_ROOT}/index.hbs`, scrollable: [".bi-notebook__list"] },
    editor: { template: `${TEMPLATE_ROOT}/editor.hbs` }
  };

  /* -------------------------------------------------------------- */
  /*  Context                                                        */
  /* -------------------------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const ready = Boolean(notebookEntry());
    const pages = pageViews();
    this.#selectedId = selectionFor(pages, this.#selectedId);
    const model = indexModel(pages, { filter: this.#filter, query: this.#query, selectedId: this.#selectedId });

    const chips = FILTERS.map((id) => ({
      id,
      icon: id === "all" ? "fa-solid fa-layer-group" : KIND_META[id].icon,
      label: game.i18n.localize(id === "all" ? "BLANKINHERITANCE.Notebook.All" : KIND_META[id].labelKey),
      count: model.counts[id],
      on: model.filter === id
    }));

    const view = pages.find((page) => page.id === this.#selectedId) ?? null;
    if (view) guardPageSheet(pageById(view.id));
    return { ready, index: model, chips, selected: view ? this.#describe(view) : null };
  }

  /** The chosen page, with everything the editor's header needs worked out. */
  #describe(view) {
    const user = { id: game.user.id, isGM: game.user.isGM };
    const person = isPersonPage(view);
    const onStage = person ? canvas?.scene?.getFlag(MODULE_ID, "stage")?.cast?.find((m) => m.portraitId === view.subject) : null;
    const people = game.users.map((u) => ({ id: u.id, name: u.name }));
    return {
      ...view,
      isPerson: person,
      canRetitle: canRetitle(view),
      canDelete: canDeletePage(view, user),
      kindLabel: game.i18n.localize(KIND_META[view.kind].labelKey),
      kindIcon: KIND_META[view.kind].icon,
      kinds: canRetitle(view)
        ? ARTICLE_KINDS.map((value) => ({
            value,
            label: game.i18n.localize(KIND_META[value].labelKey),
            selected: value === view.kind
          }))
        : null,
      written: this.#writtenLine(view, people),
      cardActorId: onStage?.actorId ?? null
    };
  }

  #writtenLine(view, people) {
    const ago = agoLabel(view.modified, Date.now(), game.i18n.lang);
    const name = nameOfUser(view.modifiedBy, people);
    if (!ago) return game.i18n.localize("BLANKINHERITANCE.Notebook.WrittenNobody");
    return name
      ? game.i18n.format("BLANKINHERITANCE.Notebook.Written", { name, ago })
      : game.i18n.format("BLANKINHERITANCE.Notebook.WrittenAgo", { ago });
  }

  /* -------------------------------------------------------------- */
  /*  Rendering and listeners                                        */
  /* -------------------------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners?.(partId, element, options);
    if (partId === "index") this.#attachIndex(element);
    if (partId === "editor") this.#attachEditor(element);
  }

  #attachIndex(element) {
    const search = element.querySelector(".bi-notebook__search");
    search?.addEventListener("input", (event) => {
      this.#query = event.target.value;
      clearTimeout(this.#refresh);
      this.#refresh = setTimeout(() => this.render({ parts: ["index"] }), 150);
    });
  }

  #attachEditor(element) {
    const pageId = element.querySelector("[data-page-id]")?.dataset.pageId ?? element.dataset.pageId;
    const page = pageId ? pageById(pageId) : null;
    if (!page) return;
    guardPageSheet(page);

    // On the element itself, not on the window: when a page is swapped this
    // element is removed, its own last save fires as it goes, and a listener up
    // on the window would no longer be one of its ancestors to hear it.
    const prose = element.querySelector("prose-mirror");
    prose?.addEventListener("change", (event) => {
      savePageText(pageId, event.currentTarget.value).catch((err) =>
        console.error("Blank Inheritance | Could not save the notebook page:", err)
      );
    });

    element.querySelector(".bi-notebook__title")?.addEventListener("change", async (event) => {
      try {
        await renamePage(pageId, event.target.value);
      } catch (err) {
        console.error("Blank Inheritance | Could not retitle:", err);
      }
      // A blank or over-long title is cleaned up before it is filed; show what was kept.
      event.target.value = pageById(pageId)?.name ?? event.target.value;
    });

    element.querySelector(".bi-notebook__kind")?.addEventListener("change", (event) => {
      setPageKind(pageId, event.target.value).catch((err) => console.error("Blank Inheritance | Could not refile:", err));
    });

    if (this.#focusTitle) {
      this.#focusTitle = false;
      const title = element.querySelector(".bi-notebook__title");
      title?.focus();
      title?.select?.();
    }
  }

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    this.#autosave = setInterval(() => this.#flush(), AUTOSAVE_MS);
  }

  /** @override */
  _onClose(options) {
    clearInterval(this.#autosave);
    clearTimeout(this.#refresh);
    this.#flush();
    if (game.user.isGM) scheduleNotebookExport();
    super._onClose?.(options);
  }

  /** Write whatever is typed in the editor to its page. A no-op when nothing changed. */
  #flush() {
    this.element?.querySelector("prose-mirror")?.save?.();
  }

  /* -------------------------------------------------------------- */
  /*  Public                                                         */
  /* -------------------------------------------------------------- */

  /** Remember which page to show next time this renders, without rendering. */
  pick(pageId) {
    if (pageId) this.#selectedId = pageId;
  }

  /** Show one page, without rebuilding anything but the editor. */
  select(pageId) {
    if (!pageId) return;
    this.#selectedId = pageId;
    if (!this.rendered) return;
    this.element.querySelectorAll(".bi-notebook__item").forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.pageId === pageId);
    });
    return this.render({ parts: ["editor"] });
  }

  /** Somebody saved something: bring the index up to date, and the header's "last written" line. */
  refresh() {
    if (!this.rendered) return;
    clearTimeout(this.#refresh);
    this.#refresh = setTimeout(() => {
      this.render({ parts: ["index"] });
      this.#updateHeader();
    }, REFRESH_MS);
  }

  /**
   * The header follows the page (who wrote it last, and its title, which the
   * stage changes when the table learns a name) without touching the editor
   * beneath it. A title box somebody is typing in is left alone.
   */
  #updateHeader() {
    const view = pageViews().find((page) => page.id === this.#selectedId);
    if (!view || !this.element) return;
    const line = this.element.querySelector("[data-written]");
    if (line) line.textContent = this.#writtenLine(view, game.users.map((u) => ({ id: u.id, name: u.name })));
    const title = this.element.querySelector(".bi-notebook__title");
    if (!title || document.activeElement === title) return;
    if (title.tagName === "INPUT") {
      if (title.value !== view.name) title.value = view.name;
    } else if (title.textContent.trim() !== view.name) {
      title.textContent = view.name;
    }
  }

  /* -------------------------------------------------------------- */
  /*  Actions                                                        */
  /* -------------------------------------------------------------- */

  static #onSelect(event, target) {
    this.select(target.dataset.pageId);
  }

  static async #onNewArticle() {
    const kind = ARTICLE_KINDS.includes(this.#filter) ? this.#filter : NOTE_KINDS.NOTE;
    const page = await createArticle({ kind });
    if (!page) return;
    this.#selectedId = page.id;
    this.#focusTitle = true;
    await this.render({ parts: ["index", "editor"] });
  }

  static #onSetFilter(event, target) {
    this.#filter = FILTERS.includes(target.dataset.filter) ? target.dataset.filter : "all";
    return this.render({ parts: ["index"] });
  }

  static async #onDeletePage() {
    const id = this.#selectedId;
    const page = pageById(id);
    if (!page) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("BLANKINHERITANCE.Notebook.DeleteTitle") },
      content: `<p>${game.i18n.format("BLANKINHERITANCE.Notebook.DeleteConfirm", { name: foundry.utils.escapeHTML(page.name) })}</p>`,
      rejectClose: false
    });
    if (!confirmed) return;
    this.#selectedId = null;
    await deletePage(id);
    await this.render({ parts: ["index", "editor"] });
  }

  static #onOpenCard(event, target) {
    return openCharacterCard(target.dataset.actorId);
  }
}

/* ------------------------------------------------------------------ */
/*  The singleton                                                      */
/* ------------------------------------------------------------------ */

let active = null;

export function getNotebook() {
  return active;
}

/**
 * Open the notebook, optionally straight to one person's page.
 *
 * `subject` is a stage portrait id. The page is made if the table has not
 * written one yet: a click on a revealed person's portrait is the moment
 * access is granted. A CONCEALED person never gets a page (the caller refuses
 * before this is reached), because a page's title is visible to everyone.
 */
export async function openNotebook({ subject = null, label = null, img = null, kind = "npc", pageId = null } = {}) {
  if (!active) active = new Notebook();
  if (subject) {
    const page = await ensurePersonPage({ subject, label, img, kind });
    pageId = page?.id ?? pageId;
  }
  if (pageId) active.pick(pageId);
  if (active.rendered) {
    if (pageId) await active.select(pageId);
    active.bringToFront();
    return active;
  }
  return active.render({ force: true });
}

export function toggleNotebook() {
  if (active?.rendered) return active.close();
  return openNotebook();
}

/** Bring an open notebook up to date after a page changed. */
export function refreshNotebook() {
  active?.refresh();
}

/* ------------------------------------------------------------------ */
/*  Wiring                                                             */
/* ------------------------------------------------------------------ */

const isNotebookPage = (page) => page?.parent === notebookEntry();

/** init: the N key and the hooks that keep an open notebook and the harvest export current. */
export function registerNotebook() {
  game.keybindings.register(MODULE_ID, "notebook", {
    name: game.i18n.localize("BLANKINHERITANCE.Notebook.Keybinding"),
    editable: [{ key: "KeyN" }],
    onDown: () => {
      toggleNotebook();
      return true;
    }
  });

  const changed = (page) => {
    if (!isNotebookPage(page)) return;
    refreshNotebook();
    scheduleNotebookExport();
  };
  Hooks.on("createJournalEntryPage", changed);
  Hooks.on("updateJournalEntryPage", changed);
  Hooks.on("deleteJournalEntryPage", changed);
}

/**
 * ready, GM only: the notebook exists and grants everyone edit, and everyone
 * on the stage the table is looking at has a page (a world that had people
 * staged before the notebook was built gets them now; see
 * notebook-store.mjs#syncActiveStagedPeople for why only that stage).
 */
export async function startNotebook() {
  if (!game.user.isGM) return;
  await ensureNotebook();
  await syncActiveStagedPeople();
  scheduleNotebookExport();
}
