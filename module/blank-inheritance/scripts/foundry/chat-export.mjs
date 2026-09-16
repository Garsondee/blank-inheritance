/**
 * Chat export — the Foundry-touching half.
 *
 * Everything design/harvest-inference.md's Tier 1 and Tier 3 signals need
 * (a real @Check roll's outcome, a bare @Item/@UUID/@Actor link) already
 * exists in Foundry's own chat log; nothing exported it to storage/ for
 * sync-harvest.mjs to ever pull down. This is that export.
 *
 * Same buffer/load/append/persist-whole-file shape as session-log.mjs, and
 * for the identical reason: Foundry's file API has no append, so the whole
 * day's buffer is rewritten each time, which makes a failed write
 * self-healing on the next message rather than silently losing one.
 *
 * Written straight into storage/ (no subfolder), with a `chat-` filename
 * prefix instead of a `chat/` directory — deliberately, not an oversight.
 * foundry/io.mjs's own writeStorageFile doc comment records a real,
 * live-found bug: Foundry's createDirectory can throw a false EEXIST for a
 * genuinely-new subdirectory on at least this v14.367/Windows install. A
 * background export running on every chat message is exactly the caller
 * that "cannot risk landing in a subdirectory that never actually gets
 * created" — session-log.mjs's own storage/sessions/ predates that finding
 * and is proven working, so it is left alone, but nothing new should repeat
 * the risk when the documented workaround (flat storage/ + a distinctive
 * prefix) costs nothing.
 *
 * GM-only by construction (registerChatExportHooks no-ops for a player) —
 * every connected client receives the same createChatMessage hook, and
 * only one of them should ever write the file.
 */

import { normalizeMessage } from "../core/chat-export.mjs";
import { fetchModuleJson, writeStorageJson } from "./io.mjs";

const FILE_PREFIX = "chat-";

function fileNameFor(isoTimestamp) {
  const day = String(isoTimestamp ?? "").slice(0, 10);
  return `${FILE_PREFIX}${day}.json`;
}

let buffer = [];
let loadedFile = null;

/** Reset in-memory state. Exported for tests and for a hard reload. */
export function resetChatExport() {
  buffer = [];
  loadedFile = null;
}

export function currentChatRecords() {
  return buffer;
}

/** Same "missing file is the normal case" handling as session-log.mjs#loadSessionLog. */
async function loadChatExport(nowIso) {
  const filename = fileNameFor(nowIso);
  if (loadedFile === filename) return buffer;

  try {
    const existing = await fetchModuleJson(`storage/${filename}`);
    buffer = Array.isArray(existing?.entries) ? existing.entries : [];
  } catch {
    buffer = [];
  }
  loadedFile = filename;
  return buffer;
}

/**
 * A live ChatMessage document -> the plain-data shape core/chat-export.mjs's
 * normalizeMessage expects. The one place this file reaches into a
 * Document's own fields, kept small and separate from the persistence logic
 * below so the two can be reasoned about (and tested) independently.
 */
function plainDataFor(message) {
  const actorName = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.name ?? null : null;
  return {
    id: message.id,
    timestamp: message.timestamp ?? null,
    authorName: message.author?.name ?? null,
    speakerName: actorName ?? message.speaker?.alias ?? null,
    flavor: message.flavor ?? "",
    content: message.content ?? "",
    rolls: message.rolls ?? [],
    flags: message.flags ?? {}
  };
}

async function persist(nowIso) {
  const filename = fileNameFor(nowIso);
  await writeStorageJson("", filename, { date: filename.replace(FILE_PREFIX, "").replace(/\.json$/, ""), world: game.world?.id ?? null, entries: buffer });
}

/** Appends one message's normalized record and persists the whole day's buffer, self-healing on the next message if this write fails. */
export async function exportChatMessage(message) {
  if (!game.user.isGM) return null;
  const nowIso = new Date().toISOString();
  await loadChatExport(nowIso);

  const record = normalizeMessage(plainDataFor(message));
  buffer = [...buffer, record];

  try {
    await persist(nowIso);
  } catch (err) {
    console.error("Blank Inheritance | Could not persist the chat export:", err);
  }
  return record;
}

export function registerChatExportHooks() {
  if (!game.user?.isGM) return;
  Hooks.on("createChatMessage", (message) => {
    exportChatMessage(message).catch((err) => console.error("Blank Inheritance | Chat export failed for one message:", err));
  });
}
