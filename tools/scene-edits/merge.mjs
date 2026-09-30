/**
 * Bringing Ingram's edits into the repo, and keeping them there.
 * design/scene-edits.md §4-§5.
 *
 * Pure orchestration over core/scene-edits.mjs: every function here takes the
 * documents it works on (or a loader for them) and hands back what changed,
 * and edits.mjs does the reading and writing. That keeps the rules -- a clash
 * is never settled by a machine, nothing old ever comes back -- testable on
 * plain objects (test/scene-edits/).
 */

import {
  applyRecord,
  cloneDoc,
  fieldKey,
  findReversions,
  LEDGER_STATES,
  mergeRecord,
  pathToString,
  resolvePath,
  sameValue,
  sortRecords
} from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";

const { MERGED, SUPERSEDED, DONE, WITHDRAWN } = LEDGER_STATES;

/** A loader that reads each file once and hands back the same object after, so a run's edits accumulate. */
export function documentCache(load) {
  const docs = new Map();
  return {
    get(file) {
      if (!docs.has(file)) docs.set(file, load(file));
      return docs.get(file);
    },
    loaded: docs
  };
}

/**
 * Merge every record the ledger has not settled yet, oldest first.
 *
 * A clean edit goes in word for word. One the repo already says is marked
 * merged. A CLASH (the repo changed that line after she saw it) and an edit
 * with nowhere to go are left unsettled: no ledger entry, so the Runner keeps
 * showing hers, and the report brings both versions to a person. Notes wait
 * for me with no entry until I answer them; a note she took back is closed.
 *
 * @param {object} args
 * @param {object[]} args.records  every harvested record
 * @param {object} args.ledger
 * @param {{get: (file: string) => object|null}} args.docs  documentCache over the repo
 * @param {() => string} [args.now]
 * @returns {{ledger: object, touched: Set<string>, results: object[]}}
 */
export function mergePending({ records, ledger, docs, now = () => new Date().toISOString() }) {
  const next = { ...ledger, entries: { ...(ledger?.entries ?? {}) } };
  const touched = new Set();
  const results = [];
  const withdrawnNotes = new Set(records.filter((r) => r.op === "withdraw").map((r) => r.noteId));

  for (const record of sortRecords(records)) {
    if (next.entries[record.id]) continue;
    const at = now();
    if (record.op === "note") {
      if (withdrawnNotes.has(record.id)) {
        next.entries[record.id] = { state: WITHDRAWN, at };
        results.push({ record, result: "withdrawn" });
      } else {
        results.push({ record, result: "note" });
      }
      continue;
    }
    if (record.op === "withdraw") {
      next.entries[record.id] = { state: MERGED, at };
      if (!next.entries[record.noteId]) next.entries[record.noteId] = { state: WITHDRAWN, at };
      results.push({ record, result: "withdraw" });
      continue;
    }

    const doc = docs.get(record.file);
    if (!doc) {
      results.push({ record, result: "unplaceable", reason: `${record.file} is not in the repo` });
      continue;
    }
    const outcome = mergeRecord(doc, record);
    if (outcome.result === "merged") {
      touched.add(record.file);
      const entry = { state: MERGED, at };
      if (record.op === "set" && !sameValue(outcome.replaced, record.before)) entry.replaced = outcome.replaced ?? null;
      next.entries[record.id] = entry;
      if (record.op === "set" && record.file.startsWith("scene-briefs/") && pathToString(record.path) === "title") {
        const renamed = renameInEpisode({ docs, briefFile: record.file, from: record.before, to: record.after });
        if (renamed) {
          touched.add(renamed);
          outcome.alsoRenamedIn = renamed;
        }
      }
    } else if (outcome.result === "already") {
      next.entries[record.id] = { state: MERGED, at, note: "the repo already said this" };
    }
    results.push({ record, ...outcome });
  }
  return { ledger: next, touched, results };
}

/**
 * A scene's title is said twice: on its brief, and on its entry in the
 * episode's running order (which the Runner's scene list reads). When she
 * renames a scene, both change -- but only where the episode still says what
 * she saw, so a title somebody has already changed there is left alone.
 */
function renameInEpisode({ docs, briefFile, from, to }) {
  const brief = docs.get(briefFile);
  const episodeFile = brief?.episodeRef ? `episodes/${brief.episodeRef}` : null;
  const episode = episodeFile ? docs.get(episodeFile) : null;
  if (!episode) return null;
  const briefId = briefFile.slice("scene-briefs/".length);
  const entry = (episode.scenes ?? []).find((scene) => scene?.briefRef === briefId);
  if (!entry || !sameValue(entry.title, from)) return null;
  entry.title = to;
  return episodeFile;
}

/**
 * The records the ledger has not settled, grouped the way a person settles
 * them: all the unsettled edits to one field together, newest last.
 */
export function unsettled(records, ledger) {
  return sortRecords(records).filter((r) => !ledger?.entries?.[r.id] && r.op !== "note" && r.op !== "withdraw");
}

/**
 * Settle a clash. `hers` puts her newest words for that field (or her
 * newest version of that item) into the repo whatever it says now; `mine`
 * keeps the repo as it is and marks her edits there superseded, with the
 * reason on record. Either way every unsettled edit to the same field is
 * settled together -- a half-settled chain would only clash again.
 *
 * @returns {{ledger: object, touched: Set<string>, settled: object[]}}
 */
export function resolveClash({ recordId, keep, reason = null, records, ledger, docs, now = () => new Date().toISOString() }) {
  const target = records.find((r) => r.id === recordId);
  if (!target) throw new Error(`No edit with id ${recordId}`);
  if (keep !== "hers" && keep !== "mine") throw new Error('Say which to keep: "hers" or "mine"');
  if (keep === "mine" && !reason) throw new Error("Keeping the repo's version over hers needs a reason on record (--reason)");
  const key = markTarget(target);
  const chain = unsettled(records, ledger).filter((r) => markTarget(r) === key);
  if (!chain.length) throw new Error(`Edit ${recordId} is already settled`);

  const next = { ...ledger, entries: { ...(ledger?.entries ?? {}) } };
  const touched = new Set();
  const at = now();
  const latest = chain.at(-1);
  for (const record of chain) {
    if (record !== latest) {
      next.entries[record.id] = { state: SUPERSEDED, at, reason: "replaced by her later edit to the same thing" };
    }
  }
  if (keep === "mine") {
    next.entries[latest.id] = { state: SUPERSEDED, at, reason };
  } else {
    const doc = docs.get(latest.file);
    if (!doc) throw new Error(`${latest.file} is not in the repo`);
    const current = latest.op === "set" ? resolvePath(doc, latest.path) : null;
    const applied = applyRecord(doc, latest);
    if (applied.status === "unplaceable") throw new Error(`Her edit has nowhere to go: ${applied.reason}`);
    touched.add(latest.file);
    next.entries[latest.id] = { state: MERGED, at, resolved: "hers", ...(current?.ok ? { replaced: current.value ?? null } : {}) };
  }
  return { ledger: next, touched, settled: chain };
}

/** What a record changes, as one key: a field, or an item in a list. */
function markTarget(record) {
  if (record.op === "set") return fieldKey(record.file, record.path);
  const itemId = record.itemId ?? record.item?.id ?? null;
  return `${fieldKey(record.file, record.path)}[${itemId ?? JSON.stringify(record.item)}]`;
}

/** Answer one of her notes; the Runner shows the reply on it. */
export function answerNote({ noteId, reply, records, ledger, now = () => new Date().toISOString() }) {
  const note = records.find((r) => r.id === noteId && r.op === "note");
  if (!note) throw new Error(`No note with id ${noteId}`);
  if (!reply) throw new Error("A note is answered with what was done (--reply)");
  return { ...ledger, entries: { ...(ledger?.entries ?? {}), [noteId]: { state: DONE, at: now(), reply } } };
}

/** Mark one edit superseded by a later decision -- hers, given in chat -- so the guard stops holding the repo to it. */
export function supersede({ recordId, reason, records, ledger, now = () => new Date().toISOString() }) {
  if (!records.some((r) => r.id === recordId)) throw new Error(`No edit with id ${recordId}`);
  if (!reason) throw new Error("Superseding one of her edits needs a reason on record (--reason)");
  return { ...ledger, entries: { ...(ledger?.entries ?? {}), [recordId]: { state: SUPERSEDED, at: now(), reason } } };
}

/**
 * Put her words back wherever the repo has gone back to older ones -- the
 * repair for what findReversions reports. Uses her newest merged record for
 * each place, applied as the Runner applies it (hers wins).
 */
export function restoreReversions({ records, ledger, docs }) {
  const all = {};
  for (const record of records) {
    if (!(record.file in all)) {
      const doc = docs.get(record.file);
      if (doc) all[record.file] = doc;
    }
  }
  const reversions = findReversions(all, records, ledger);
  const touched = new Set();
  const byId = new Map(records.map((r) => [r.id, r]));
  for (const reversion of reversions) {
    const record = byId.get(reversion.recordId);
    const result = applyRecord(all[record.file], record);
    if (result.status === "applied") touched.add(record.file);
  }
  return { reversions, touched };
}

/**
 * What would merging change right now, without writing anything -- for
 * `status` and for a dry-run deploy. Works on copies.
 */
export function previewMerge({ records, ledger, docs }) {
  const copies = documentCache((file) => {
    const doc = docs.get(file);
    return doc ? cloneDoc(doc) : null;
  });
  return mergePending({ records, ledger, docs: copies, now: () => "preview" });
}
