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
 */

import { appendEntry, sessionFileName, stampEntry } from "../core/log-entry.mjs";
import { ensureDirectory, fetchModuleJson, writeStorageJson } from "./io.mjs";

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

/** Reset in-memory state. Exported for tests and for a hard reload. */
export function resetSessionLog() {
  buffer = [];
  loadedFile = null;
}

export function currentEntries() {
  return buffer;
}

/**
 * Load today's file if it exists, so a GM who reloads mid-evening continues
 * the same log rather than starting a second one that overwrites the first.
 * A missing file is the normal case at the start of a session, not an error.
 */
export async function loadSessionLog(nowIso) {
  const filename = sessionFileName(nowIso);
  if (loadedFile === filename) return buffer;

  try {
    const existing = await fetchModuleJson(`storage/${DIR_NAME}/${filename}`);
    buffer = Array.isArray(existing?.entries) ? existing.entries : [];
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
 */
export async function recordLogEntry({ text, nowIso, scene = null, mode = null, subject = null }) {
  const entry = stampEntry({
    text,
    at: nowIso,
    scene,
    mode,
    subject,
    author: game.user?.name ?? null
  });
  if (!entry) return null;

  await loadSessionLog(nowIso);
  buffer = appendEntry(buffer, entry);

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

  return entry;
}

async function persist(nowIso) {
  const filename = sessionFileName(nowIso);
  await ensureDirectory(`modules/${MODULE_ID}/storage/${DIR_NAME}`);
  await writeStorageJson(DIR_NAME, filename, {
    date: filename.replace(/\.json$/, ""),
    world: game.world?.id ?? null,
    entries: buffer
  });
}
