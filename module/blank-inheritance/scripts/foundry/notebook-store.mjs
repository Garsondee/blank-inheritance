/**
 * The party notebook's documents — the Foundry-touching half of
 * core/notebook.mjs. Everything here reads or writes JournalEntry documents;
 * the rules for what to write live in core.
 *
 * Kept free of anything that runs at load time (no ApplicationV2, no `foundry`
 * global outside a function) so the stage can import it, as it imports
 * foundry/stage-store.mjs, without dragging an Application class in.
 *
 * ACCESS IS FOUNDRY'S OWN. The notebook is one JournalEntry whose default
 * ownership is OWNER, so every player may read, write and add pages, and
 * Foundry's collaborative editor lets several of them type in one page at
 * once. A person's page appears when they are revealed on the stage, which is
 * when the table newly gains access to them. Nothing here is a secret and
 * nothing is stored anywhere but ordinary world documents; see
 * design/notebook.md.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import {
  DEFAULT_TITLE,
  MODULE_ID,
  NOTEBOOK_SOURCE_ID,
  NOTE_FLAG,
  NOTE_KINDS,
  exportPayload,
  newArticleTitle,
  notebookEntryData,
  ownershipRepair,
  pageCreateData,
  pageView,
  planPersonPages,
  titleFor
} from "../core/notebook.mjs";
import { writeStorageJson } from "./io.mjs";

const EXPORT_FILE = "notebook.json";
const EXPORT_DELAY_MS = 20000;

/** Page writes are done one at a time so two quick stage changes cannot both decide a page is missing. */
let queue = Promise.resolve();
const serial = (job) => {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
};

/* ------------------------------------------------------------------ */
/*  The notebook entry                                                 */
/* ------------------------------------------------------------------ */

/** The notebook's JournalEntry, or null before a GM has opened the world. */
export function notebookEntry() {
  return game.journal?.find((entry) => entry.getFlag(MODULE_ID, "sourceId") === NOTEBOOK_SOURCE_ID) ?? null;
}

/**
 * GM only. Make sure the notebook exists and still lets everyone write in it.
 *
 * Runs at every GM login, so an entry someone re-permissioned by hand is put
 * back: the one thing this whole feature depends on is that default ownership
 * is OWNER, and it is repaired rather than trusted.
 */
export async function ensureNotebook() {
  if (!game.user.isGM) return notebookEntry();
  const existing = notebookEntry();
  if (existing) {
    const repair = ownershipRepair(existing.ownership);
    if (repair) await existing.update({ ownership: repair });
    return existing;
  }
  const id = await deriveFoundryId(NOTEBOOK_SOURCE_ID);
  return JournalEntry.create(notebookEntryData({ id }), { keepId: true });
}

/* ------------------------------------------------------------------ */
/*  Reading pages                                                      */
/* ------------------------------------------------------------------ */

/** One page as the plain view core works with. */
export function viewOfPage(page) {
  const flags = page.getFlag(MODULE_ID, NOTE_FLAG) ?? {};
  const stats = page._stats ?? {};
  return pageView({
    id: page.id,
    uuid: page.uuid,
    name: page.name,
    kind: flags.kind,
    subject: flags.subject,
    img: flags.img,
    author: flags.author,
    html: page.text?.content ?? "",
    created: stats.createdTime,
    modified: stats.modifiedTime,
    modifiedBy: stats.lastModifiedBy
  });
}

export function pageViews() {
  return (notebookEntry()?.pages?.contents ?? []).map(viewOfPage);
}

export function pageById(id) {
  return notebookEntry()?.pages?.get(id) ?? null;
}

/** The page about one stage portrait, if the table has written one. */
export function pageForSubject(subject) {
  if (!subject) return null;
  return (
    notebookEntry()?.pages?.contents.find((page) => page.getFlag(MODULE_ID, NOTE_FLAG)?.subject === subject) ?? null
  );
}

/* ------------------------------------------------------------------ */
/*  Writing pages                                                      */
/* ------------------------------------------------------------------ */

/** Any player: start an article. It is titled so it cannot be mistaken for another. */
export async function createArticle({ kind = NOTE_KINDS.NOTE, title = DEFAULT_TITLE } = {}) {
  const entry = notebookEntry();
  if (!entry) return null;
  const unique = newArticleTitle(
    entry.pages.map((page) => page.name),
    titleFor(title)
  );
  const [page] = await entry.createEmbeddedDocuments("JournalEntryPage", [
    pageCreateData({ title: unique, kind, author: game.user.id })
  ]);
  return page ?? null;
}

/**
 * The page for one person, made if it is missing. Any player may call this (a
 * click on a portrait), and so may the GM's stage sync. The page id is derived
 * from the subject, so the two can race and still only ever make one page: the
 * loser's create is refused as a duplicate and it simply finds the winner's.
 */
export async function ensurePersonPage({ subject, label, img = null, kind = "npc" } = {}) {
  const entry = notebookEntry();
  if (!entry || !subject) return null;
  const existing = pageForSubject(subject);
  if (existing) return existing;
  const id = await deriveFoundryId(`notebook-person:${subject}`);
  const data = { _id: id, ...pageCreateData({ title: label ?? subject, kind: NOTE_KINDS.PERSON, subject, img, author: game.user.id }) };
  try {
    const [page] = await entry.createEmbeddedDocuments("JournalEntryPage", [data], { keepId: true });
    return page ?? pageForSubject(subject);
  } catch (err) {
    const raced = pageForSubject(subject);
    if (raced) return raced;
    throw err;
  }
}

/**
 * GM only. Bring the People list into line with who is on the stage: a page
 * for each NPC newly revealed, and the title of any page whose person the table
 * now calls something else. `members` is the PUBLISHED cast, so nobody
 * concealed is ever in it.
 */
export function syncPeoplePages(members = []) {
  if (!game.user.isGM) return Promise.resolve();
  return serial(async () => {
    const entry = notebookEntry();
    if (!entry) return;
    const people = entry.pages.contents
      .map(viewOfPage)
      .filter((view) => view.kind === NOTE_KINDS.PERSON && view.subject)
      .map((view) => ({ id: view.id, name: view.name, subject: view.subject }));
    const { create, rename } = planPersonPages(people, members);
    if (rename.length) {
      await entry.updateEmbeddedDocuments("JournalEntryPage", rename.map(({ id, name }) => ({ _id: id, name })));
    }
    for (const person of create) {
      await ensurePersonPage({ subject: person.subject, label: person.label, img: person.img, kind: "npc" });
    }
  });
}

/**
 * GM only. The people on the stage the table is looking at right now, e.g. at
 * login in a world where they were staged before the notebook existed.
 *
 * Only the ACTIVE scene, deliberately. Every other scene's published cast is
 * whatever its last session or test run left behind, and a page is visible to
 * every player: backfilling from all of them would put a person in front of
 * the table who has not been met in the story yet. Everyone else gets a page
 * when they are next revealed, or on the first click on their portrait.
 */
export function syncActiveStagedPeople() {
  return syncPeoplePages(game.scenes?.active?.getFlag(MODULE_ID, "stage")?.cast ?? []);
}

export async function renamePage(id, title) {
  const page = pageById(id);
  if (!page) return null;
  const name = titleFor(title, page.name);
  if (name === page.name) return page;
  return page.update({ name });
}

export async function setPageKind(id, kind) {
  const page = pageById(id);
  if (!page) return null;
  return page.update({ [`flags.${MODULE_ID}.${NOTE_FLAG}.kind`]: kind });
}

export async function deletePage(id) {
  return pageById(id)?.delete() ?? null;
}

/** Save an editor's contents to its page. Skips a page that is gone or already says exactly this. */
export async function savePageText(id, html) {
  const page = pageById(id);
  if (!page || page.text?.content === html) return null;
  return page.update({ "text.content": html });
}

/* ------------------------------------------------------------------ */
/*  Collaborative editing                                              */
/* ------------------------------------------------------------------ */

/**
 * Foundry's collaborative editor tells the page's OWN sheet about every step
 * another player types (`_onNewSteps`) and every server autosave
 * (`_onAutosave`), and those handlers reach for `this.form`, which is empty
 * for a sheet that has never been opened. Hosting the editor in our own window
 * means that sheet never is, so without this the first edit from another
 * player would throw before it was applied and the two screens would drift.
 * The guard leaves the sheet's behaviour untouched whenever it IS open.
 */
export function guardPageSheet(page) {
  const sheet = page?.sheet;
  if (!sheet || sheet.__biGuarded) return;
  for (const name of ["_onNewSteps", "_onAutosave"]) {
    const original = sheet[name];
    if (typeof original !== "function") continue;
    sheet[name] = function guarded(...args) {
      if (!this.rendered) return undefined;
      return original.apply(this, args);
    };
  }
  sheet.__biGuarded = true;
}

/* ------------------------------------------------------------------ */
/*  The export the harvest pulls                                       */
/* ------------------------------------------------------------------ */

let exportTimer = null;

/** GM only. Write the whole notebook to storage/notebook.json, where sync-harvest.mjs finds it. */
export async function exportNotebook() {
  if (!game.user.isGM || !notebookEntry()) return null;
  const users = game.users.map((user) => ({ id: user.id, name: user.name }));
  return writeStorageJson("", EXPORT_FILE, exportPayload(pageViews(), { users, now: Date.now() }));
}

/** GM only. Ask for an export soon; a burst of edits becomes one write. */
export function scheduleNotebookExport() {
  if (!game.user?.isGM) return;
  clearTimeout(exportTimer);
  exportTimer = setTimeout(() => {
    exportNotebook().catch((err) => console.warn("Blank Inheritance | Could not file the notebook for the harvest:", err));
  }, EXPORT_DELAY_MS);
}
