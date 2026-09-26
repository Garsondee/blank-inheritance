/**
 * The Director's log — the Foundry-touching half.
 *
 * Writes to `storage/sessions/<date>.json`, which is the one directory that
 * survives a module update (`persistentStorage: true` in module.json) and the
 * one the content pipeline already harvests back into the repo.
 *
 * Not a chat message and not a Journal: a private GM note must never be one
 * mis-click away from the table seeing it, and doctrine §10 keeps the
 * GM-written "what it meant" stream separate from the machine-written "what
 * happened" one on purpose.
 *
 * Found live 2026-09-17: `buffer`/`loadedFile` below are page-lifetime state.
 * A GM who reloads (or whose tab closes) while a persist() is still in flight
 * loses that entry with zero indication — the re-fetch on the new page load
 * replaces the buffer with whatever last actually made it to disk, and the
 * lost entry existed nowhere else. `hasPendingWrite()` plus the `beforeunload`
 * guard in `installUnloadGuard()` is the mitigation: it cannot force an
 * in-flight upload to finish (nothing can, once a real navigation tears the
 * page down), but it turns a silent loss into a browser-native "leave site?"
 * prompt the GM can actually act on.
 */

import { appendEntry, sessionFileName, stampEntry } from "../core/log-entry.mjs";
import { ensureDirectory, fetchModuleJson, tryListModuleJsonIds, writeStorageJson } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const DIR_NAME = "sessions";

/**
 * The whole session's entries, held in memory.
 *
 * Every write persists the entire array rather than appending to the file,
 * because Foundry's file API has no append. That is fine at this size (a long
 * evening is a few hundred short lines) and it has a useful property: a write
 * that fails leaves the buffer intact, so the next entry re-persists
 * everything and the failure heals itself instead of silently losing a note.
 */
let buffer = [];
let loadedFile = null;

/**
 * Set for the whole span of a recordLogEntry call — load-if-needed, append,
 * AND persist, not just the network call — because the GM has no way to tell
 * those phases apart and none of them is safe to interrupt. A counter, not a
 * boolean, so two entries submitted close together both have to settle
 * before this clears. See hasPendingWrite().
 */
let pendingWrites = 0;

/**
 * Whether `ensureDirectory` has already proven the storage path exists this
 * page-load. io.mjs's own writeStorageJson doc comment names this exact
 * file as the reason that function takes a pre-ensured directory: "callers
 * that write repeatedly (the session log) should not pay for it on every
 * line" — but persist() below was calling ensureDirectory on every single
 * entry regardless, a multi-segment mkdir walk that only ever needs to
 * happen once, and which widened the reload-race window this file's header
 * describes for no benefit. Only set true AFTER a successful writeStorageJson
 * (not merely after ensureDirectory returns, since ensureDirectory itself
 * swallows every error it hits — see its own doc comment), so a genuine
 * failure still retries from scratch next time instead of caching a false
 * positive.
 */
let directoryEnsured = false;

let unloadGuardInstalled = false;

/** Reset in-memory state. Exported for tests and for a hard reload. */
export function resetSessionLog() {
  buffer = [];
  loadedFile = null;
  pendingWrites = 0;
  directoryEnsured = false;
  unloadGuardInstalled = false;
}

export function currentEntries() {
  return buffer;
}

/**
 * An entry's stamp as the table reads it: LOCAL wall-clock HH:MM, 24-hour.
 * The stored `at` is an ISO string, i.e. UTC — slicing it (as
 * core/phone.mjs#formatLogEntriesForDisplay's `time` does) reads an hour
 * early all British summer. Every surface that shows a log line to a person
 * (the deck, Comms, the Console's Log tab) formats through this one
 * function, so they can never disagree about when something happened
 * (they did, 2026-09-23: "03:35 PM" on the deck, "14:35" in the Console).
 */
export function localClock(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/**
 * True while a recordLogEntry call is still working. The beforeunload guard
 * below reads this to decide whether to warn; tests read it to confirm the
 * exact window the reload-race bug lived in.
 */
export function hasPendingWrite() {
  return pendingWrites > 0;
}

/**
 * Warn, via the browser's own native "leave site?" prompt, if a reload or tab
 * close happens while a write is still in flight. A mitigation, not a
 * guarantee — it cannot force an async uploadPersistent to finish once a real
 * navigation tears the page down, and a hard crash or force-quit gets no
 * warning at all. What it does buy: the ordinary case (a GM hits reload, or
 * closes the tab) now surfaces a choice instead of a silent loss.
 */
function installUnloadGuard() {
  if (unloadGuardInstalled) return;
  unloadGuardInstalled = true;
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  window.addEventListener("beforeunload", (event) => {
    if (!hasPendingWrite()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

/**
 * Load today's file if it exists, so a GM who reloads mid-evening continues
 * the same log rather than starting a second one that overwrites the first.
 * A missing file is the normal case at the start of a session, not an error.
 */
export async function loadSessionLog(nowIso) {
  installUnloadGuard();
  const filename = sessionFileName(nowIso);
  if (loadedFile === filename) return buffer;

  // Ask what is there before asking for it. The catch below already handled a
  // missing file correctly, but the browser still logged the 404 -- and a red
  // line in the console on the first evening of a new day reads as breakage.
  // Reported as exactly that, 2026-09-18.
  buffer = [];
  try {
    const stem = filename.replace(/\.json$/i, "");
    const present = await tryListModuleJsonIds(`storage/${DIR_NAME}`);
    // null means the listing itself failed, so fall back to fetching: skipping
    // the read there would silently lose a log that does exist.
    if (present === null || present.includes(stem)) {
      const existing = await fetchModuleJson(`storage/${DIR_NAME}/${filename}`);
      buffer = Array.isArray(existing?.entries) ? existing.entries : [];
    }
  } catch {
    buffer = [];
  }
  loadedFile = filename;
  return buffer;
}

/**
 * Record one typed line with the context the GM did not have to type.
 *
 * Returns the stamped entry, or null when the line was empty — a stray Enter
 * must not write a blank record.
 *
 * `review`, added 2026-09-22 for the rebuilt Close Scene dialogue, rides as
 * a sibling key on the entry rather than inside `stampEntry`'s own `context`
 * shape — that shape is a tested, stable contract shared by every OTHER log
 * entry this file ever writes, most of which have nothing to do with a scene
 * closing. Omitted entirely when absent, so an ordinary typed line looks
 * exactly as it always has.
 *
 * It replaces the `reactionScores` key of 2026-09-19, whose 0-10 rating grid
 * was cut with the dialogue rebuild (see core/scene-close.mjs's header). The
 * structured payload is now the scene's own authored prompts as an AGENDA for
 * a later in-depth review rather than a set of scores taken mid-session —
 * questions to ask afterwards, not numbers tapped while flustered. Logs
 * already written with `reactionScores` keep it; nothing reads it back.
 */
export async function recordLogEntry({ text, nowIso, scene = null, mode = null, subject = null, review = null }) {
  const stamped = stampEntry({
    text,
    at: nowIso,
    scene,
    mode,
    subject,
    author: game.user?.name ?? null
  });
  if (!stamped) return null;
  const entry = review ? { ...stamped, review } : stamped;

  pendingWrites += 1;
  try {
    await loadSessionLog(nowIso);
    buffer = appendEntry(buffer, entry);
    // Tell whoever draws the log that it grew — the deck's log shoulder and
    // the session rail's pins (2026-09-23). Found live: an entry written by
    // the Scene Runner or the Palette never reached the deck's log until
    // something unrelated repainted it, because only the deck's OWN input
    // refreshed it. Fired before the write, since the buffer is already the
    // truth the moment the entry is appended.
    globalThis.Hooks?.callAll("blank-inheritance.logEntry", entry);

    try {
      await persist(nowIso);
    } catch (err) {
      // Keep the entry in the buffer: the next line re-persists everything, so a
      // transient failure costs nothing as long as the GM keeps typing. Telling
      // them is still right — a log that has silently stopped saving is worse
      // than one that says so.
      console.error("Blank Inheritance | Could not persist the session log:", err);
      ui.notifications?.warn(game.i18n.localize("BLANKINHERITANCE.Console.Log.SaveFailed"));
    }
  } finally {
    pendingWrites -= 1;
  }

  return entry;
}

async function persist(nowIso) {
  const filename = sessionFileName(nowIso);
  if (!directoryEnsured) {
    await ensureDirectory(`modules/${MODULE_ID}/storage/${DIR_NAME}`);
  }
  await writeStorageJson(DIR_NAME, filename, {
    date: filename.replace(/\.json$/, ""),
    world: game.world?.id ?? null,
    entries: buffer
  });
  directoryEnsured = true;
}
