/**
 * Saved progress for the induction terminal (UI pass, 2026-09-25).
 *
 * Twenty to thirty minutes of choices used to live only in the open window: a reload, a crash or a
 * stray close threw the whole form away, and the characterless-player auto-open then started them
 * at Page 1 with nothing. The terminal now keeps a draft as the player goes and offers it back on
 * Page 1 -- OFFERS, never silently resumes. Silent resuming is exactly what the 2026-09-09 reset in
 * mountInductionTerminal was built to stop ("re-opening mid-flow silently resumed wherever state had
 * been left, with no visible way to tell that had happened"), so the player always sees the saved
 * form and chooses to continue it or throw it away.
 *
 * Pure: no Foundry, no DOM, no storage. The adapter (foundry/induction-terminal.mjs) owns where a
 * draft is kept -- a client-scoped setting, so it stays in the player's own browser and is never
 * written to the server or shown to anyone else.
 */

import { STEPS } from "./induction-flow.mjs";

/** Raised whenever the state's shape changes in a way an old draft can't be laid over safely. */
export const DRAFT_VERSION = 1;

/** One draft per world and user, so a second world or a shared browser never mixes two people's forms. */
export function draftKey(worldId, userId) {
  return `${worldId}/${userId}`;
}

/**
 * Fields that are only true at the moment they're set -- an upload in flight, an error on screen, a
 * filter typed into a list -- and must never come back from a save. createdActorId too: a finished
 * form is cleared, not kept.
 */
const TRANSIENT = {
  ancestry: ["filter"],
  background: ["filter"],
  portrait: ["uploading", "error"],
  review: ["confirming", "error", "createdActorId"]
};

const hasText = (value) => typeof value === "string" && value.trim() !== "";
const anyText = (map) => Object.values(map ?? {}).some(hasText);

/**
 * Whether the player has chosen or written anything yet. Opening the terminal, reading Page 1 and
 * closing it again isn't a form in progress, and must not be offered back as one.
 */
export function hasProgress(state) {
  if (!state || typeof state !== "object") return false;
  if (state.agreement?.signed) return true;
  if (state.ancestry?.id || state.background?.id || state.class?.id) return true;
  if ((state.attributes?.freeBoostPicks ?? []).some(Boolean)) return true;
  if (state.portrait?.path) return true;
  const f = state.finishing ?? {};
  if ([f.name, f.pronouns, f.genderIdentity, f.appearance].some(hasText)) return true;
  if ((f.languages ?? []).length > 0) return true;
  if (anyText(f.personalFile) || anyText(f.personality)) return true;
  return anyText(state.intake?.questions) || hasText(state.intake?.freeform);
}

/** A plain-data copy of the state with every transient field removed, stamped with a version and a time. */
export function serializeDraft(state, savedAt = new Date().toISOString()) {
  const copy = JSON.parse(JSON.stringify(state ?? {}));
  for (const [section, keys] of Object.entries(TRANSIENT)) {
    for (const key of keys) if (copy[section]) delete copy[section][key];
  }
  return { version: DRAFT_VERSION, savedAt, state: copy };
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isPrimitive = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Lays a saved value over a fresh default, key by key. Anything the save lacks keeps its default (so a
 * field added after the save still exists); anything the default doesn't know is dropped (so a field
 * removed since can't sneak back in). An empty object in the fresh state is an open map of answers
 * keyed by question id, and takes the saved map whole -- strings only.
 */
function overlay(base, saved) {
  if (Array.isArray(base)) return Array.isArray(saved) ? saved.filter(isPrimitive) : clone(base);
  if (isPlainObject(base)) {
    if (Object.keys(base).length === 0) {
      if (!isPlainObject(saved)) return {};
      return Object.fromEntries(Object.entries(saved).filter(([, v]) => typeof v === "string"));
    }
    const out = {};
    for (const [key, value] of Object.entries(base)) {
      out[key] = isPlainObject(saved) && key in saved ? overlay(value, saved[key]) : clone(value);
    }
    return out;
  }
  return isPrimitive(saved) ? saved : base;
}

/**
 * A stored draft laid over a fresh state. Returns null for anything that isn't a current-version draft
 * with real progress in it, so the caller only ever has to ask "is there one?".
 */
export function restoreDraft(stored, freshState) {
  if (!isPlainObject(stored) || stored.version !== DRAFT_VERSION || !isPlainObject(stored.state)) return null;
  const state = overlay(freshState, stored.state);
  return hasProgress(state) ? { state, savedAt: typeof stored.savedAt === "string" ? stored.savedAt : null } : null;
}

/**
 * Where a resumed form reopens: the page it was saved on, unless an earlier step isn't finished --
 * then that one, because the form never lets anyone stand past an unfinished step (induction-flow.mjs's
 * canJumpTo). That covers a draft saved before the agreement was switched on (it opens on the
 * agreement) and a catalogue that no longer has the ancestry the draft picked (it opens on Ancestry).
 * A saved page that isn't in the order any more opens on the next step that is.
 */
export function resumeStep(savedPage, { order, isComplete }) {
  const ids = order.map(([id]) => id);
  if (ids.length === 0) return savedPage;
  let at = ids.indexOf(savedPage);
  if (at < 0) {
    const full = STEPS.map(([id]) => id);
    const after = full.slice(full.indexOf(savedPage) + 1).find((id) => ids.includes(id));
    at = full.includes(savedPage) && after !== undefined ? ids.indexOf(after) : 0;
  }
  for (let i = 0; i < at; i++) if (!isComplete(ids[i])) return ids[i];
  return ids[at];
}
