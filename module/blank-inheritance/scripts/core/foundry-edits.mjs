/**
 * Documents Ingram has edited directly in Foundry -- never deleted, never
 * rewritten. design/scene-edits.md §7.
 *
 * Two things the module makes from the repo used to overwrite whatever she
 * had changed in them, silently:
 *   - an episode's journal, deleted and rebuilt whenever its source changed
 *     (foundry/sync.mjs#runRealJournalCase);
 *   - a handout in Papers, its text rewritten from the scene on every
 *     "Show again" (foundry/handouts.mjs#upsertPages).
 * Her critical requirement (2026-09-27) is that nothing she rewrites is
 * overwritten by old content, wherever she rewrote it. So each of these
 * remembers a fingerprint of the words it last wrote -- taken AFTER Foundry
 * stored them, because Foundry's server cleans HTML on the way in and a
 * fingerprint of what was sent would never match -- and a document whose
 * words no longer match it has been edited in Foundry: it is kept, and a copy
 * is filed into storage/ for tools/scene-edits to bring home, where I fold it
 * into the repo by hand.
 *
 * Pure: the fingerprint itself is core/ids.mjs#contentHash, run by the caller.
 */

/** A journal's words, in page order: what a GM edit changes. */
export function journalWords(pages = []) {
  const list = Array.isArray(pages) ? pages : [];
  return [...list]
    .sort((a, b) => (a?.sort ?? 0) - (b?.sort ?? 0))
    .map((page) => ({ name: page?.name ?? "", content: page?.text?.content ?? page?.src ?? "" }));
}

/** A page's words: its text, or the picture it shows. */
export function pageWords(page) {
  return { name: page?.name ?? "", content: page?.text?.content ?? page?.src ?? "" };
}

/**
 * Whether a document has been edited in Foundry since the module last wrote
 * it. A document with no fingerprint yet predates this check and is taken as
 * unedited (the caller records one); Ingram confirmed on 2026-09-27 she had
 * not edited anything in Foundry before this existed.
 */
export function editedSinceWritten(currentFingerprint, writtenFingerprint) {
  return Boolean(writtenFingerprint) && currentFingerprint !== writtenFingerprint;
}

export const DOCUMENT_EDIT_PREFIX = "foundry-edit-";

/** The storage/ file a kept document is filed under: one per document, the latest state. */
export function documentEditFilename(kind, sourceId) {
  const safe = (text) => String(text ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "unnamed";
  return `${DOCUMENT_EDIT_PREFIX}${safe(kind)}-${safe(sourceId)}.json`;
}

/**
 * What is filed for me: which document, where it came from in the repo, and
 * her words as Foundry holds them now.
 */
export function documentEditSnapshot({ kind, sourceId, name, words, source = null, at }) {
  return { kind: "foundry-document-edit", version: 1, document: kind, sourceId, source, name, words, at };
}
