/**
 * The party notebook — the pure half.
 *
 * design/notebook.md. One shared place where the whole table writes at once:
 * a page for every person the party has met, and any article a player cares to
 * start (a place, a clue, a plan, a plain note). It lives in Foundry's own
 * JournalEntry, so Foundry's ownership levels decide who may read and write,
 * and Foundry's collaborative editor lets several people type in the same
 * page together.
 *
 * ACCESS IS GRANTED WHEN SOMEONE IS MET, NOT BEFORE. A person's page is
 * created the moment they are revealed on the stage, titled with whatever the
 * table currently calls them (core/stage-names.mjs), and renamed when the
 * table learns the real name. So a note written about "the attendant" is
 * still there, under her name, once the table knows it.
 *
 * This file owns: the shape of a page, who a page is about, the index a player
 * browses (grouped, filtered, searched), which pages to create or rename when
 * the stage changes, who may delete what, and the export the harvest pulls.
 * The Foundry half (foundry/notebook-store.mjs, foundry/notebook.mjs) only
 * reads and writes documents.
 *
 * No Foundry, no DOM, no clock: `now` is always passed in.
 */

export const MODULE_ID = "blank-inheritance";

/** CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER, mirrored so this file needs no Foundry globals. */
export const OWNER = 3;

export const NOTEBOOK_SOURCE_ID = "party-notebook";
export const NOTEBOOK_NAME = "The Party Notebook";

/** The key everything about a page is filed under in its module flags. */
export const NOTE_FLAG = "notebook";

export const NOTE_KINDS = Object.freeze({
  PERSON: "person",
  PLACE: "place",
  CLUE: "clue",
  PLAN: "plan",
  NOTE: "note"
});

/** What a player may start by hand. A person's page is only ever made by the stage. */
export const ARTICLE_KINDS = Object.freeze([NOTE_KINDS.NOTE, NOTE_KINDS.PLACE, NOTE_KINDS.CLUE, NOTE_KINDS.PLAN]);

/** Display order, icon and label for each kind. Order is the order of the index's sections. */
export const KIND_META = Object.freeze({
  person: Object.freeze({ order: 0, icon: "fa-solid fa-user", labelKey: "BLANKINHERITANCE.Notebook.Kind.person" }),
  place: Object.freeze({ order: 1, icon: "fa-solid fa-location-dot", labelKey: "BLANKINHERITANCE.Notebook.Kind.place" }),
  clue: Object.freeze({ order: 2, icon: "fa-solid fa-magnifying-glass", labelKey: "BLANKINHERITANCE.Notebook.Kind.clue" }),
  plan: Object.freeze({ order: 3, icon: "fa-solid fa-route", labelKey: "BLANKINHERITANCE.Notebook.Kind.plan" }),
  note: Object.freeze({ order: 4, icon: "fa-solid fa-note-sticky", labelKey: "BLANKINHERITANCE.Notebook.Kind.note" })
});

export const KIND_LIST = Object.freeze(Object.keys(KIND_META).sort((a, b) => KIND_META[a].order - KIND_META[b].order));

/** The filter chips: everything, then each kind. */
export const FILTERS = Object.freeze(["all", ...KIND_LIST]);

export const TITLE_MAX = 80;
export const DEFAULT_TITLE = "Untitled note";

/* ------------------------------------------------------------------ */
/*  Text                                                               */
/* ------------------------------------------------------------------ */

const ENTITIES = Object.freeze({ "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" });

/** The words of a page, without its markup. Regex-based: no DOM here. */
export function plainText(html) {
  return String(html ?? "")
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/** A one-line preview for the index. Cut at a word, with an ellipsis, never mid-word. */
export function excerptOf(html, max = 110) {
  const text = plainText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** A title a player typed, made safe to file: no markup, one line, not too long, never empty. */
export function titleFor(raw, fallback = DEFAULT_TITLE) {
  const cleaned = String(raw ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_MAX)
    .trim();
  return cleaned || fallback;
}

/** "Untitled note", then "Untitled note 2", "Untitled note 3": a title no other page has. */
export function newArticleTitle(existingTitles = [], base = DEFAULT_TITLE) {
  const taken = new Set(existingTitles.map((title) => String(title).toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n < 10000; n += 1) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${taken.size + 1}`;
}

/* ------------------------------------------------------------------ */
/*  Documents                                                          */
/* ------------------------------------------------------------------ */

/**
 * The JournalEntry the whole notebook lives in.
 *
 * `ownership.default: OWNER` is the point of it: every player may read, write,
 * add pages and, through Foundry's collaborative editor, write in the same
 * page as somebody else at the same moment. A page's own ownership is left to
 * inherit this, so the level is set in exactly one place.
 */
export function notebookEntryData({ id } = {}) {
  const data = {
    name: NOTEBOOK_NAME,
    ownership: { default: OWNER },
    flags: { [MODULE_ID]: { sourceId: NOTEBOOK_SOURCE_ID, notebook: true } }
  };
  if (id) data._id = id;
  return data;
}

/** Whether an existing notebook entry still grants everyone the edit level it must. */
export function ownershipIsRight(ownership) {
  return ownershipRepair(ownership) === null;
}

/**
 * The update that puts a drifted notebook entry back to "everyone may write",
 * or null when it is already right. A per-user entry below OWNER overrides the
 * default for that one player, so it would quietly lock them out of the shared
 * notebook while everyone else could write. Each is set to OWNER rather than
 * deleted: verified live 2026-09-29 that Foundry's `-=key` deletion syntax is
 * refused on the ownership field, while setting a level is accepted.
 */
export function ownershipRepair(ownership) {
  const current = ownership ?? {};
  const update = {};
  if (Number(current.default) !== OWNER) update.default = OWNER;
  for (const [key, level] of Object.entries(current)) {
    if (key === "default") continue;
    if (Number(level) !== OWNER) update[key] = OWNER;
  }
  return Object.keys(update).length ? update : null;
}

/** The flags one page carries. Everything the Foundry half needs to file and find it. */
export function noteFlags({ kind = NOTE_KINDS.NOTE, subject = null, img = null, author = null } = {}) {
  const flags = { kind: KIND_LIST.includes(kind) ? kind : NOTE_KINDS.NOTE };
  if (subject) flags.subject = subject;
  if (img) flags.img = img;
  if (author) flags.author = author;
  return { [MODULE_ID]: { [NOTE_FLAG]: flags } };
}

/** The data to create one page with. `format: 1` is HTML, which the collaborative editor edits. */
export function pageCreateData({ title, kind = NOTE_KINDS.NOTE, subject = null, img = null, author = null, html = "" } = {}) {
  return {
    name: titleFor(title),
    type: "text",
    text: { content: html, format: 1 },
    flags: noteFlags({ kind, subject, img, author })
  };
}

/**
 * The plain view of one page that everything else in this file works with.
 * The Foundry half builds these from real documents; tests build them by hand.
 */
export function pageView(raw = {}) {
  return {
    id: raw.id ?? null,
    uuid: raw.uuid ?? null,
    name: raw.name ?? "",
    kind: KIND_LIST.includes(raw.kind) ? raw.kind : NOTE_KINDS.NOTE,
    subject: raw.subject ?? null,
    img: raw.img ?? null,
    author: raw.author ?? null,
    html: raw.html ?? "",
    created: Number(raw.created) || 0,
    modified: Number(raw.modified) || 0,
    modifiedBy: raw.modifiedBy ?? null
  };
}

export const isPersonPage = (view) => view?.kind === NOTE_KINDS.PERSON;

/* ------------------------------------------------------------------ */
/*  The stage feeds the notebook                                       */
/* ------------------------------------------------------------------ */

/**
 * What the notebook must do when the stage's published cast changes.
 *
 * `members` is the PUBLISHED cast (core/stage-layout.mjs#publishedCast), so a
 * concealed person is not in it and gets no page: access follows the reveal,
 * and a page's title is only ever the name the table has been told.
 *
 *   create — an NPC who is on stage and has no page yet. PCs are left to be
 *            made on demand (a click on their portrait), so a full party
 *            arriving does not put six pages of players in the People list.
 *   rename — anyone who has a page whose title is no longer what the table
 *            calls them, which is exactly what learning a name does.
 *
 * @param {Array<{id: string, name: string, subject: string}>} existing  person pages
 * @param {Array<{portraitId: string, label: string, img?: string, kind?: string}>} members
 */
export function planPersonPages(existing = [], members = []) {
  const bySubject = new Map(existing.map((page) => [page.subject, page]));
  const create = [];
  const rename = [];
  const seen = new Set();
  for (const member of members) {
    if (!member?.portraitId || !member.label || seen.has(member.portraitId)) continue;
    seen.add(member.portraitId);
    // The title as it is FILED (trimmed, capped), so a very long name is not
    // compared untrimmed against the trimmed page and renamed on every sync.
    const title = titleFor(member.label);
    const page = bySubject.get(member.portraitId);
    if (!page) {
      if (member.kind === "npc") create.push({ subject: member.portraitId, label: title, img: member.img ?? null });
    } else if (page.name !== title) {
      rename.push({ id: page.id, name: title });
    }
  }
  return { create, rename };
}

/* ------------------------------------------------------------------ */
/*  The index                                                          */
/* ------------------------------------------------------------------ */

function matchesQuery(view, words) {
  if (!words.length) return true;
  const haystack = `${view.name} ${plainText(view.html)}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * What the left-hand index shows: pages grouped by kind in a fixed order, most
 * recently written first inside each group, narrowed by a filter chip and a
 * search. Counts on the chips are always for the whole notebook (narrowed only
 * by the search), so a chip never lies about what is behind it.
 */
export function indexModel(pages = [], { filter = "all", query = "", selectedId = null } = {}) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const searched = pages.filter((view) => matchesQuery(view, words));

  const counts = { all: searched.length };
  for (const kind of KIND_LIST) counts[kind] = searched.filter((view) => view.kind === kind).length;

  const wanted = FILTERS.includes(filter) ? filter : "all";
  const shown = searched.filter((view) => wanted === "all" || view.kind === wanted);

  const groups = KIND_LIST.map((kind) => {
    const items = shown
      .filter((view) => view.kind === kind)
      .sort((a, b) => b.modified - a.modified || a.name.localeCompare(b.name))
      .map((view) => ({
        id: view.id,
        name: view.name,
        kind: view.kind,
        icon: KIND_META[view.kind].icon,
        excerpt: excerptOf(view.html),
        modified: view.modified,
        img: view.img,
        selected: view.id === selectedId
      }));
    return { kind, icon: KIND_META[kind].icon, labelKey: KIND_META[kind].labelKey, count: items.length, items };
  }).filter((group) => group.count > 0);

  return {
    groups,
    counts,
    filter: wanted,
    query: String(query ?? ""),
    total: pages.length,
    shown: shown.length,
    empty: pages.length === 0,
    noMatches: pages.length > 0 && shown.length === 0
  };
}

/** Which page to show: the one asked for if it exists, otherwise the first in the index. */
export function selectionFor(pages = [], selectedId = null, model = indexModel(pages)) {
  if (selectedId && pages.some((view) => view.id === selectedId)) return selectedId;
  return model.groups[0]?.items[0]?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  Who may do what                                                    */
/* ------------------------------------------------------------------ */

/**
 * Deleting is the one thing everyone technically CAN do (Foundry gives an
 * owner delete), so the interface offers it only where it is meant: an article
 * to whoever wrote it, and anything to the GM. A person's page belongs to the
 * table and only the GM may remove it.
 */
export function canDeletePage(view, user) {
  if (!view || !user) return false;
  if (user.isGM) return true;
  if (isPersonPage(view)) return false;
  return Boolean(view.author) && view.author === user.id;
}

/** A person's page is titled by the stage; only an article can be retitled by hand. */
export const canRetitle = (view) => Boolean(view) && !isPersonPage(view);

/* ------------------------------------------------------------------ */
/*  Time and names, for the interface and the export                   */
/* ------------------------------------------------------------------ */

/** "just now", "3 minutes ago", "yesterday": when a page was last written. */
export function agoLabel(then, now, locale = "en") {
  const at = Number(then);
  if (!at) return "";
  const seconds = Math.round((at - Number(now)) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const magnitude = Math.abs(seconds);
  if (magnitude < 45) return formatter.format(0, "second");
  if (magnitude < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (magnitude < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

/** A user's name from their id, or an empty string for someone who is gone. */
export function nameOfUser(userId, users = []) {
  return users.find((user) => user.id === userId)?.name ?? "";
}

/**
 * The whole notebook as one JSON document for the harvest (tools/module-sync/
 * sync-harvest.mjs pulls the module's storage/ directory home). It is how the
 * notes reach the GM and the writing sessions: written by the players, in the
 * campaign's own system, and kept where the rest of the table's record goes.
 */
export function exportPayload(pages = [], { users = [], now = 0 } = {}) {
  return {
    kind: "bi-notebook",
    version: 1,
    exportedAt: new Date(Number(now) || 0).toISOString(),
    pages: [...pages]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((view) => ({
        id: view.id,
        title: view.name,
        kind: view.kind,
        subject: view.subject,
        author: nameOfUser(view.author, users) || view.author || null,
        createdAt: view.created ? new Date(view.created).toISOString() : null,
        modifiedAt: view.modified ? new Date(view.modified).toISOString() : null,
        modifiedBy: nameOfUser(view.modifiedBy, users) || view.modifiedBy || null,
        text: plainText(view.html),
        html: view.html
      }))
  };
}
