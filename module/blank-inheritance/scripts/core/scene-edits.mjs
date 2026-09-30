/**
 * Scene edits -- Ingram's rewrites of a scene, made in the Scene Runner on
 * the live server, carried home into the repo, and never overwritten by old
 * content. design/scene-edits.md is the whole design; this is its logic.
 *
 * WHY IT EXISTS. Ingram, 2026-09-27: "I ONLY WILL REWRITE SCENES ON THE REMOTE
 * SERVER. We need to make sure that things I rewrite don't get overwritten by
 * the old content as a critical requirement." Before this, the Scene Runner
 * read the scene files a deploy puts on the server and nothing else, so there
 * was nowhere to rewrite a scene at all, and every deploy would have replaced
 * anything written there.
 *
 * THE SHAPE, IN ONE PARAGRAPH. Every change is one immutable RECORD: which
 * file, which field (a path that names beats by id, never by position), the
 * words she saw, and her new words. The Runner writes records into the
 * module's storage/ folder on the server, the one folder no deploy overwrites
 * or prunes. It lays every record not yet in the repo over the deployed text
 * (overlayDocs), so her version shows at once, after a reload and after every
 * deploy. My side pulls the records down and merges them into data/
 * (mergeRecord); the LEDGER (data/campaign/scene-edits.json) says which are
 * merged. A merged record still guards its field: if the server or the repo
 * ever shows an OLDER version of it, the Runner puts hers back
 * ("server-behind") and the deploy refuses (findReversions).
 *
 * Pure: no Foundry globals, no filesystem, no clock and no randomness of its
 * own -- callers pass `at` and `rand` in. Shared by foundry/scene-edits.mjs
 * (the Runner) and tools/scene-edits/ (the pull, the merge and the guards).
 */

export const RECORD_KIND = "scene-edit";
export const RECORD_VERSION = 1;
export const RECORD_PREFIX = "scene-edit-";

/**
 * set    -- one field's new value
 * insert -- a new item in a list (a beat, a line to write down, a temptation)
 * remove -- an item taken out of a list
 * move   -- a beat moved to after another one (or to the top)
 * note   -- a note for Claude, attached to the scene or to one part of it;
 *           never applied to the data, only ever read and acted on
 * withdraw -- takes back one of her own notes
 */
export const EDIT_OPS = Object.freeze(["set", "insert", "remove", "move", "note", "withdraw"]);

/** Ledger states. A record with no ledger entry is pending. */
export const LEDGER_STATES = Object.freeze({
  // In the repo, word for word (or resolved in her favour after a clash).
  MERGED: "merged",
  // Replaced by a later, deliberate decision -- hers, given in chat, or a
  // clash she settled for the other version. Never overlaid, never guarded.
  SUPERSEDED: "superseded",
  // A note that has been acted on. `reply` says what was done.
  DONE: "done",
  // A note she took back.
  WITHDRAWN: "withdrawn"
});

/**
 * The two kinds of file the Runner shows and so can edit: the scene brief and
 * the check files its beats use. The id rule is CLAUDE.md's own (one file per
 * entity, kebab-case id), which also keeps a file name safe to put into a path
 * or a remote shell command without escaping.
 */
const FILE_PATTERN = /^(scene-briefs|challenges)\/[a-z0-9][a-z0-9-]*$/;

/**
 * Keys an edit may never write, at any depth. `id` and `type` are identity;
 * `authoring` is the lifecycle block only the Approvals Desk and the Sign-Off
 * may write (design/data-ownership.md); `$schema` is plumbing; and every
 * `...Ref`/`...Refs` is the wiring between files, which is structure rather
 * than words. The Runner never offers any of these -- this makes a bad record
 * fail loudly instead of quietly rewiring a scene.
 */
const FORBIDDEN_KEYS = new Set(["id", "type", "authoring", "$schema", "review"]);
const isForbiddenKey = (key) => FORBIDDEN_KEYS.has(key) || /Refs?$/.test(key);

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;
const RECORD_ID_PATTERN = /^\d{8}T\d{9}Z-[A-Za-z0-9]{4,16}$/;
const FILENAME_PATTERN = /^scene-edit-(\d{8}T\d{9}Z-[A-Za-z0-9]{4,16})\.json$/;

/* -------------------------------------------------------------------------- */
/*  Paths                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A path is an array of segments: a property name (string), an item in a list
 * by its id (`{id}`), or an item in a list by position (`{index}`) -- the last
 * only for lists whose items carry no id (lines to write down, voice samples).
 * Position is fragile when a list changes underneath it, which is why every
 * record also carries the words she saw: a mismatch is a clash, never a
 * silent write to the wrong line.
 *
 * The string form is for the page and for people:
 *   beats[come-east].readAloud     intro.carriesIn#0.when
 */
export function pathToString(path = []) {
  let out = "";
  for (const segment of path) {
    if (typeof segment === "string") out += out ? `.${segment}` : segment;
    else if (segment && typeof segment.id === "string") out += `[${segment.id}]`;
    else if (segment && Number.isInteger(segment.index)) out += `#${segment.index}`;
    else throw new Error(`Not a path segment: ${JSON.stringify(segment)}`);
  }
  return out;
}

/** The inverse of pathToString. Throws on anything it did not write. */
export function parsePath(text) {
  const path = [];
  if (!text) return path;
  for (const part of String(text).split(".")) {
    const match = /^([A-Za-z$][A-Za-z0-9_$]*)?((?:\[[a-z0-9][a-z0-9-]*\]|#\d+)*)$/i.exec(part);
    if (!match || (!match[1] && !match[2])) throw new Error(`Not a path: ${JSON.stringify(text)}`);
    if (match[1]) path.push(match[1]);
    for (const selector of match[2].match(/\[[^\]]+\]|#\d+/g) ?? []) {
      path.push(selector.startsWith("#") ? { index: Number(selector.slice(1)) } : { id: selector.slice(1, -1) });
    }
  }
  return path;
}

/** "scene-briefs/x::beats[a].text" -- the one string the page uses to name a field. */
export function fieldKey(file, path) {
  return `${file}::${pathToString(path)}`;
}

export function parseFieldKey(key) {
  const at = String(key ?? "").indexOf("::");
  if (at < 0) throw new Error(`Not a field key: ${JSON.stringify(key)}`);
  return { file: key.slice(0, at), path: parsePath(key.slice(at + 2)) };
}

/**
 * Walk a path. For the last segment the value may be undefined (a field that
 * has never been written is still a place to write); every segment before it
 * must exist.
 *
 * @returns {{ok: true, value: any, container: object|any[], key: string|number}
 *   | {ok: false, reason: string, depth: number}}
 */
export function resolvePath(doc, path) {
  if (!Array.isArray(path) || !path.length) return { ok: false, reason: "empty path", depth: 0 };
  let container = doc;
  for (let depth = 0; depth < path.length; depth++) {
    const segment = path[depth];
    const last = depth === path.length - 1;
    let key;
    if (typeof segment === "string") {
      if (!container || typeof container !== "object" || Array.isArray(container)) {
        return { ok: false, reason: `"${pathToString(path.slice(0, depth))}" is not an object`, depth };
      }
      key = segment;
    } else if (segment && typeof segment.id === "string") {
      if (!Array.isArray(container)) return { ok: false, reason: `"${pathToString(path.slice(0, depth))}" is not a list`, depth };
      key = container.findIndex((item) => item && item.id === segment.id);
      if (key < 0) return { ok: false, reason: `nothing called "${segment.id}" in ${pathToString(path.slice(0, depth)) || "the file"}`, depth };
    } else if (segment && Number.isInteger(segment.index)) {
      if (!Array.isArray(container)) return { ok: false, reason: `"${pathToString(path.slice(0, depth))}" is not a list`, depth };
      if (segment.index < 0 || segment.index >= container.length) {
        return { ok: false, reason: `${pathToString(path.slice(0, depth))} has no item ${segment.index + 1}`, depth };
      }
      key = segment.index;
    } else {
      return { ok: false, reason: `not a path segment: ${JSON.stringify(segment)}`, depth };
    }
    if (last) return { ok: true, value: container[key], container, key };
    container = container[key];
  }
  return { ok: false, reason: "unreachable", depth: path.length };
}

/** Structured copy, so an overlay never writes into the cached deployed file. */
export function cloneDoc(doc) {
  return doc === undefined ? undefined : JSON.parse(JSON.stringify(doc));
}

/**
 * Whether two values are the same for every purpose here. Missing, null and
 * the empty string are one value: a field nobody has written and a field she
 * cleared read identically on the page, and treating them as different would
 * turn "she cleared an empty field" into a clash.
 */
export function sameValue(a, b) {
  const blank = (v) => v === undefined || v === null || v === "";
  if (blank(a) && blank(b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return a === b;
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * What a text box's contents mean as a stored value: line endings made plain,
 * and whatever blank run a text box leaves at the very end dropped. Nothing
 * else about her words is touched -- not inner spacing, not punctuation.
 */
export function normalizeText(text) {
  return String(text ?? "").replace(/\r\n?/g, "\n").replace(/\s+$/, "");
}

/* -------------------------------------------------------------------------- */
/*  Records                                                                   */
/* -------------------------------------------------------------------------- */

/** "2026-09-27T18:15:30.123Z" + "a1b2c3" -> "20260927T181530123Z-a1b2c3". Sorts by time as a string. */
export function recordIdFor(at, rand) {
  const compact = String(at).replace(/[-:.]/g, "");
  const id = `${compact}-${rand}`;
  if (!RECORD_ID_PATTERN.test(id)) throw new Error(`Cannot make a record id from at=${JSON.stringify(at)} rand=${JSON.stringify(rand)}`);
  return id;
}

export const recordFilename = (record) => `${RECORD_PREFIX}${record.id}.json`;

/** The record id a storage file name carries, or null for any other file. */
export function recordIdFromFilename(name) {
  const match = FILENAME_PATTERN.exec(String(name ?? "").split("/").pop());
  return match ? match[1] : null;
}

/**
 * Build one record. Every op carries who and when; the rest depends on the op.
 *
 * @param {object} spec
 * @param {string} spec.op        one of EDIT_OPS
 * @param {string} spec.file      "scene-briefs/<id>" or "challenges/<id>"
 * @param {string} spec.briefId   the scene she was editing (a check file can serve several)
 * @param {Array}  [spec.path]    set: the field; insert/remove/move: the list; note: the anchor ([] = the scene)
 * @param {string} spec.at        ISO time
 * @param {string} spec.rand      a few random letters, from the caller
 * @param {string} [spec.by]      the user's name
 */
export function makeRecord(spec) {
  const { op, file, briefId, path = [], at, rand, by = null } = spec;
  const base = { kind: RECORD_KIND, version: RECORD_VERSION, id: recordIdFor(at, rand), at, by, op, file, briefId, path };
  let record;
  switch (op) {
    case "set":
      record = { ...base, before: spec.before ?? null, after: spec.after ?? null };
      break;
    case "insert":
      record = { ...base, afterId: spec.afterId ?? null, atIndex: spec.atIndex ?? null, item: spec.item };
      break;
    case "remove":
      // `afterId` is where it stood (the item before it), so putting it back
      // puts it back in the same place.
      record = { ...base, itemId: spec.itemId ?? null, atIndex: spec.atIndex ?? null, item: spec.item ?? null, afterId: spec.afterId ?? null };
      break;
    case "move":
      record = { ...base, itemId: spec.itemId, afterId: spec.afterId ?? null };
      break;
    case "note":
      record = { ...base, text: normalizeText(spec.text) };
      break;
    case "withdraw":
      record = { ...base, noteId: spec.noteId };
      break;
    default:
      throw new Error(`Unknown edit op: ${JSON.stringify(op)}`);
  }
  const problems = validateRecord(record);
  if (problems.length) throw new Error(`A ${op} record would be invalid: ${problems.join("; ")}`);
  return record;
}

/**
 * Everything wrong with a record, as sentences. Empty means usable. Run on
 * every record the Runner is about to write AND every record the pull brings
 * home, so a malformed file on the server is refused by name rather than
 * merged into the wrong place.
 */
export function validateRecord(record) {
  const problems = [];
  if (!record || typeof record !== "object") return ["not an object"];
  if (record.kind !== RECORD_KIND) problems.push(`kind is ${JSON.stringify(record.kind)}, not "${RECORD_KIND}"`);
  if (record.version !== RECORD_VERSION) problems.push(`version ${JSON.stringify(record.version)} is not ${RECORD_VERSION}`);
  if (!RECORD_ID_PATTERN.test(String(record.id))) problems.push(`id ${JSON.stringify(record.id)} is malformed`);
  if (typeof record.at !== "string" || Number.isNaN(Date.parse(record.at))) problems.push("at is not a time");
  if (!EDIT_OPS.includes(record.op)) problems.push(`op ${JSON.stringify(record.op)} is unknown`);
  if (!FILE_PATTERN.test(String(record.file))) problems.push(`file ${JSON.stringify(record.file)} is not a scene brief or a check file`);
  if (typeof record.briefId !== "string" || !ID_PATTERN.test(record.briefId)) problems.push("briefId is missing");
  if (!Array.isArray(record.path)) problems.push("path is not a list");
  else {
    try {
      pathToString(record.path);
    } catch (err) {
      problems.push(err.message);
    }
    const forbidden = record.path.find((s) => typeof s === "string" && isForbiddenKey(s));
    if (forbidden) problems.push(`"${forbidden}" is not something an edit may change`);
  }
  switch (record.op) {
    case "set":
      if (!record.path?.length) problems.push("a set needs a field");
      if (typeof record.path?.at?.(-1) !== "string" && !Number.isInteger(record.path?.at?.(-1)?.index)) {
        problems.push("a set must name a field or a numbered line, not a whole item");
      }
      if (!isPlainValue(record.after) || !isPlainValue(record.before)) problems.push("a set only carries text, numbers, true/false or nothing");
      break;
    case "insert":
      if (!record.item || (typeof record.item === "object" && !Array.isArray(record.item) && record.item.id !== undefined && !ID_PATTERN.test(String(record.item.id)))) {
        problems.push("an insert needs an item with a usable id");
      }
      if (record.item && typeof record.item === "object" && Object.keys(record.item).some(isForbiddenOnNewItem)) {
        problems.push("a new item may not carry wiring (refs) or a status");
      }
      break;
    case "remove":
      if (record.itemId == null && !Number.isInteger(record.atIndex)) problems.push("a remove needs an item id or a position");
      break;
    case "move":
      if (typeof record.itemId !== "string") problems.push("a move needs the item's id");
      break;
    case "note":
      if (!record.text) problems.push("a note needs words");
      break;
    case "withdraw":
      if (!RECORD_ID_PATTERN.test(String(record.noteId))) problems.push("a withdraw needs the note's id");
      break;
    default:
      break;
  }
  return problems;
}

const isPlainValue = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
const isForbiddenOnNewItem = (key) => key !== "id" && isForbiddenKey(key);

/** Records in the order they were made. `at` first; the id breaks a tie the same way on every machine. */
export function sortRecords(records = []) {
  return [...records].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.at < b.at ? -1 : 1));
}

/* -------------------------------------------------------------------------- */
/*  Applying one record                                                       */
/* -------------------------------------------------------------------------- */

function listAt(doc, path) {
  if (!path.length) return { ok: false, reason: "no list named" };
  const found = resolvePath(doc, path);
  if (!found.ok) return found;
  if (!Array.isArray(found.value)) {
    if (found.value === undefined || found.value === null) {
      // A list nobody has started yet (a scene with no temptations) is still
      // somewhere to add the first one.
      found.container[found.key] = [];
      return { ok: true, list: found.container[found.key] };
    }
    return { ok: false, reason: `${pathToString(path)} is not a list` };
  }
  return { ok: true, list: found.value };
}

function indexOfItem(list, record) {
  if (record.itemId != null) return list.findIndex((item) => item && item.id === record.itemId);
  // A plain list (lines to write down): the item she saw, at the place she saw
  // it if it is still there, otherwise the first equal line anywhere.
  if (Number.isInteger(record.atIndex) && sameValue(list[record.atIndex], record.item)) return record.atIndex;
  return list.findIndex((item) => sameValue(item, record.item));
}

/**
 * Apply one record to a document IN PLACE, the way the Runner shows it: hers
 * wins, whatever is there now. Returns what happened, so the page can mark it.
 *
 *   applied      -- written
 *   already      -- the document already says this
 *   unplaceable  -- the field or item it names is gone (reason says which)
 *   note         -- a note or a withdrawal: nothing to write
 *
 * `clash` is true when the document held something other than both what she
 * saw and what she wrote -- somebody changed it after she looked.
 */
export function applyRecord(doc, record) {
  switch (record.op) {
    case "set": {
      const found = resolvePath(doc, record.path);
      if (!found.ok) return { status: "unplaceable", reason: found.reason, clash: false };
      const current = found.value;
      if (sameValue(current, record.after)) return { status: "already", clash: false };
      const clash = !sameValue(current, record.before);
      found.container[found.key] = record.after;
      return { status: "applied", clash };
    }
    case "insert": {
      const at = listAt(doc, record.path);
      if (!at.ok) return { status: "unplaceable", reason: at.reason, clash: false };
      const list = at.list;
      const itemId = record.item && typeof record.item === "object" ? record.item.id : undefined;
      if (itemId !== undefined && list.some((item) => item && item.id === itemId)) return { status: "already", clash: false };
      let index;
      if (itemId !== undefined) {
        if (record.afterId === null || record.afterId === undefined) index = 0;
        else {
          const anchor = list.findIndex((item) => item && item.id === record.afterId);
          // The beat it followed is gone: keep her beat rather than lose it,
          // at the end, and say so.
          if (anchor < 0) {
            list.push(cloneDoc(record.item));
            return { status: "applied", clash: true, reason: `the item it followed ("${record.afterId}") is gone, so it went at the end` };
          }
          index = anchor + 1;
        }
      } else {
        index = Number.isInteger(record.atIndex) && record.atIndex <= list.length ? record.atIndex : list.length;
      }
      list.splice(index, 0, cloneDoc(record.item));
      return { status: "applied", clash: false };
    }
    case "remove": {
      const at = listAt(doc, record.path);
      if (!at.ok) return { status: "unplaceable", reason: at.reason, clash: false };
      const index = indexOfItem(at.list, record);
      if (index < 0) return { status: "already", clash: false };
      const clash = record.item != null && !sameValue(at.list[index], record.item);
      at.list.splice(index, 1);
      return { status: "applied", clash };
    }
    case "move": {
      const at = listAt(doc, record.path);
      if (!at.ok) return { status: "unplaceable", reason: at.reason, clash: false, code: "missing-list" };
      const list = at.list;
      const from = list.findIndex((item) => item && item.id === record.itemId);
      if (from < 0) return { status: "unplaceable", reason: `nothing called "${record.itemId}" to move`, clash: false, code: "missing-item" };
      if (record.afterId === null ? from === 0 : list[from - 1]?.id === record.afterId) return { status: "already", clash: false };
      const [item] = list.splice(from, 1);
      let to = 0;
      if (record.afterId !== null) {
        const anchor = list.findIndex((it) => it && it.id === record.afterId);
        if (anchor < 0) {
          list.splice(from, 0, item);
          return { status: "unplaceable", reason: `the item it should follow ("${record.afterId}") is gone`, clash: false, code: "missing-anchor" };
        }
        to = anchor + 1;
      }
      list.splice(to, 0, item);
      return { status: "applied", clash: false };
    }
    case "note":
    case "withdraw":
      return { status: "note", clash: false };
    default:
      return { status: "unplaceable", reason: `unknown op ${record.op}`, clash: false };
  }
}

/**
 * Whether a document is BEHIND a record that is already merged: it shows what
 * she saw before her edit, not what she wrote. On the server that means an
 * old deploy (or a deploy caught halfway); either way the Runner must still
 * show her version.
 */
export function isBehind(doc, record) {
  switch (record.op) {
    case "set": {
      const found = resolvePath(doc, record.path);
      return found.ok && !sameValue(found.value, record.after) && sameValue(found.value, record.before);
    }
    case "insert": {
      const at = resolvePath(doc, record.path);
      const list = at.ok && Array.isArray(at.value) ? at.value : [];
      const itemId = record.item && typeof record.item === "object" ? record.item.id : undefined;
      return itemId !== undefined ? !list.some((item) => item && item.id === itemId) : false;
    }
    case "remove": {
      const at = resolvePath(doc, record.path);
      if (!at.ok || !Array.isArray(at.value)) return false;
      if (record.itemId != null) return at.value.some((item) => item && item.id === record.itemId);
      return false; // a plain line can legitimately come back; only an id proves it is the same one
    }
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  The overlay: what the Runner shows                                         */
/* -------------------------------------------------------------------------- */

const ledgerState = (ledger, id) => ledger?.entries?.[id]?.state ?? null;

/**
 * Lay her records over the deployed files, the way the Runner shows a scene.
 *
 *  - a PENDING record (no ledger entry) is always applied: hers wins;
 *  - a MERGED record is applied only where the deployed file is behind it
 *    (isBehind) -- an old or half-finished deploy -- and never otherwise, so a
 *    later deliberate change in the repo is not undone by an old record;
 *  - a SUPERSEDED record is never applied.
 *
 * @param {Record<string, object>} docs  deployed files by "scene-briefs/<id>" / "challenges/<id>"
 * @param {object[]} records  every record, any file
 * @param {object} [ledger]   data/campaign/scene-edits.json
 * @returns {{docs: Record<string, object>, marks: Record<string, object>, problems: object[], notes: object[]}}
 *   marks: by fieldKey (a field) or `${file}::${list}[${itemId}]` (an item), what the page should flag
 */
export function overlayDocs(docs = {}, records = [], ledger = null) {
  const out = {};
  for (const [file, doc] of Object.entries(docs)) if (doc) out[file] = cloneDoc(doc);
  const marks = {};
  const problems = [];
  const notes = [];
  const withdrawn = new Set();

  const valid = [];
  for (const record of records) {
    const invalid = validateRecord(record);
    if (invalid.length) problems.push({ recordId: record?.id ?? null, file: record?.file ?? null, path: null, reason: `unreadable edit: ${invalid.join("; ")}` });
    else valid.push(record);
  }
  const sorted = sortRecords(valid);
  for (const record of sorted) if (record.op === "withdraw") withdrawn.add(record.noteId);

  for (const record of sorted) {
    const state = ledgerState(ledger, record.id);
    if (record.op === "note") {
      if (withdrawn.has(record.id) || state === LEDGER_STATES.WITHDRAWN) continue;
      notes.push({ ...record, state: state ?? "pending", reply: ledger?.entries?.[record.id]?.reply ?? null });
      continue;
    }
    if (record.op === "withdraw") continue;
    const doc = out[record.file];
    if (!doc) continue; // a file this view has not loaded
    if (state === LEDGER_STATES.SUPERSEDED) continue;

    let mark;
    if (state === LEDGER_STATES.MERGED) {
      if (!isBehind(doc, record)) continue;
      const result = applyRecord(doc, record);
      if (result.status !== "applied") continue;
      mark = "server-behind";
    } else {
      const result = applyRecord(doc, record);
      if (result.status === "unplaceable") {
        problems.push({ recordId: record.id, file: record.file, path: pathToString(record.path), reason: result.reason });
        continue;
      }
      mark = result.clash ? "clash" : "pending";
    }
    const key = markKey(record);
    // A later record on the same field decides its mark, except that a clash
    // is never hidden by a quieter mark after it.
    if (marks[key]?.state === "clash" && mark === "pending") continue;
    marks[key] = { state: mark, recordId: record.id, at: record.at, op: record.op };
  }
  return { docs: out, marks, problems, notes };
}

/** Where a record's mark goes on the page: the field it set, or the item it added, removed or moved. */
export function markKey(record) {
  if (record.op === "set") return fieldKey(record.file, record.path);
  const itemId = record.itemId ?? (record.item && typeof record.item === "object" ? record.item.id : null);
  return itemId ? `${fieldKey(record.file, record.path)}[${itemId}]` : fieldKey(record.file, record.path);
}

/* -------------------------------------------------------------------------- */
/*  The merge: what my side writes into the repo                              */
/* -------------------------------------------------------------------------- */

/**
 * Merge one record into a repo document IN PLACE. Stricter than the overlay:
 * the Runner can show hers over anything, but a repo file only takes a record
 * where it still says what she saw -- everything else is a CLASH that a person
 * settles (tools/scene-edits resolve), and nothing is overwritten either way.
 *
 *   merged       -- written, word for word
 *   already      -- the repo already says this (merged before, or the same edit made twice)
 *   clash        -- the repo changed after she looked; nothing written
 *   unplaceable  -- the field or item is gone from the repo; nothing written
 *   note         -- a note or a withdrawal; for me to read, not to write
 *
 * `replaced` is what the field held before a merge, kept for the reversion guard.
 */
export function mergeRecord(doc, record) {
  switch (record.op) {
    case "set": {
      const found = resolvePath(doc, record.path);
      if (!found.ok) return { result: "unplaceable", reason: found.reason };
      if (sameValue(found.value, record.after)) return { result: "already" };
      if (!sameValue(found.value, record.before)) return { result: "clash", current: found.value };
      const replaced = found.value ?? null;
      found.container[found.key] = record.after;
      return { result: "merged", replaced };
    }
    case "insert": {
      const at = resolvePath(doc, record.path);
      const list = at.ok && Array.isArray(at.value) ? at.value : null;
      const itemId = record.item && typeof record.item === "object" ? record.item.id : undefined;
      if (list && itemId !== undefined) {
        const existing = list.find((item) => item && item.id === itemId);
        if (existing) return sameValue(existing, record.item) ? { result: "already" } : { result: "clash", current: existing };
        if (record.afterId != null && !list.some((item) => item && item.id === record.afterId)) {
          return { result: "clash", reason: `the item it followed ("${record.afterId}") is not in the repo` };
        }
      }
      const applied = applyRecord(doc, record);
      if (applied.status === "unplaceable") return { result: "unplaceable", reason: applied.reason };
      return { result: applied.status === "already" ? "already" : "merged", replaced: null };
    }
    case "remove": {
      const at = resolvePath(doc, record.path);
      if (!at.ok) return { result: "unplaceable", reason: at.reason };
      if (!Array.isArray(at.value)) return { result: "unplaceable", reason: `${pathToString(record.path)} is not a list` };
      const index = indexOfItem(at.value, record);
      if (index < 0) return { result: "already" };
      if (record.item != null && !sameValue(at.value[index], record.item)) return { result: "clash", current: at.value[index] };
      const [removed] = at.value.splice(index, 1);
      return { result: "merged", replaced: removed };
    }
    case "move": {
      const applied = applyRecord(doc, record);
      // The beat it should follow is gone from the repo: the structure changed
      // under her, which is a person's call. The beat itself gone: nothing to move.
      if (applied.status === "unplaceable") return { result: applied.code === "missing-anchor" ? "clash" : "unplaceable", reason: applied.reason };
      return { result: applied.status === "already" ? "already" : "merged", replaced: null };
    }
    case "note":
    case "withdraw":
      return { result: "note" };
    default:
      return { result: "unplaceable", reason: `unknown op ${record.op}` };
  }
}

/* -------------------------------------------------------------------------- */
/*  The guard: nothing old comes back                                          */
/* -------------------------------------------------------------------------- */

/**
 * Every place a repo document has gone BACK to an older version of something
 * she changed -- her critical requirement, checked mechanically. Runs at the
 * start of every deploy (which refuses on any), in the test suite against the
 * real data, and in the session-start summary.
 *
 * Per field, her latest merged value is what the repo must hold; the words
 * she replaced (and anything a clash resolution replaced) are "older". A field
 * holding an older value is a reversion. A field holding something NEW is a
 * later deliberate change and is allowed (it is reported elsewhere, never
 * silently). Superseded records are out of it entirely.
 *
 * @param {Record<string, object>} docs  repo documents by file
 * @param {object[]} records  every record pulled home
 * @param {object} ledger
 * @returns {Array<{file: string, path: string, recordId: string, kind: string, expected: any, found: any}>}
 */
export function findReversions(docs = {}, records = [], ledger = null) {
  const out = [];
  const merged = sortRecords(records).filter((r) => ledgerState(ledger, r.id) === LEDGER_STATES.MERGED);

  // Fields: the chain of merged sets per field, oldest first.
  const chains = new Map();
  for (const record of merged.filter((r) => r.op === "set")) {
    const key = fieldKey(record.file, record.path);
    if (!chains.has(key)) chains.set(key, []);
    chains.get(key).push(record);
  }
  for (const [key, chain] of chains) {
    const latest = chain.at(-1);
    const doc = docs[latest.file];
    if (!doc) continue;
    const found = resolvePath(doc, latest.path);
    if (!found.ok) continue; // the whole item is gone -- the item checks below speak for that
    if (sameValue(found.value, latest.after)) continue;
    const older = [];
    for (const record of chain) {
      older.push(record.before);
      const replaced = ledger?.entries?.[record.id]?.replaced;
      if (replaced !== undefined) older.push(replaced);
    }
    if (older.some((value) => !sameValue(value, latest.after) && sameValue(value, found.value))) {
      out.push({ file: latest.file, path: pathToString(latest.path), key, recordId: latest.id, kind: "field", expected: latest.after, found: found.value });
    }
  }

  // Items with ids: the last merged insert/remove for each decides whether it should exist.
  const lastByItem = new Map();
  for (const record of merged.filter((r) => r.op === "insert" || r.op === "remove")) {
    const itemId = record.op === "insert" ? record.item?.id : record.itemId;
    if (!itemId) continue;
    lastByItem.set(`${record.file}::${pathToString(record.path)}[${itemId}]`, { record, itemId });
  }
  for (const [key, { record, itemId }] of lastByItem) {
    const doc = docs[record.file];
    if (!doc) continue;
    const found = resolvePath(doc, record.path);
    const list = found.ok && Array.isArray(found.value) ? found.value : [];
    const present = list.some((item) => item && item.id === itemId);
    if (record.op === "insert" && !present) {
      out.push({ file: record.file, path: `${pathToString(record.path)}[${itemId}]`, key, recordId: record.id, kind: "added-item-missing", expected: record.item, found: null });
    }
    if (record.op === "remove" && present) {
      out.push({ file: record.file, path: `${pathToString(record.path)}[${itemId}]`, key, recordId: record.id, kind: "removed-item-back", expected: null, found: list.find((i) => i?.id === itemId) });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  New ids                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * An id for something she adds: a readable prefix and a few random letters
 * from the caller, never colliding with an id already in the list.
 */
export function newItemId(prefix, existingIds = [], rand = "x") {
  const taken = new Set(existingIds);
  const base = `${prefix}-${String(rand).toLowerCase().replace(/[^a-z0-9]/g, "") || "x"}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

/* -------------------------------------------------------------------------- */
/*  Seeing what changed                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A word-level diff: which words she kept, cut and added. What my side prints
 * when her edits come home -- design/scene-edits.md §6, "so I can see how she
 * writes" -- and what the log command replays.
 *
 * @returns {Array<{op: "same"|"del"|"add", text: string}>}
 */
export function wordDiff(before, after) {
  const a = tokenize(before);
  const b = tokenize(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const out = [];
  const push = (op, text) => {
    if (!text) return;
    const last = out.at(-1);
    if (last && last.op === op) last.text += text;
    else out.push({ op, text });
  };
  push("same", a.slice(0, start).join(""));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  if (midA.length * midB.length > 4_000_000) {
    // Too long to align word by word; a whole-block replacement is still honest.
    push("del", midA.join(""));
    push("add", midB.join(""));
  } else {
    const rows = midA.length + 1;
    const cols = midB.length + 1;
    const table = new Uint32Array(rows * cols);
    for (let i = midA.length - 1; i >= 0; i--) {
      for (let j = midB.length - 1; j >= 0; j--) {
        table[i * cols + j] = midA[i] === midB[j] ? table[(i + 1) * cols + j + 1] + 1 : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < midA.length && j < midB.length) {
      if (midA[i] === midB[j]) {
        push("same", midA[i]);
        i++;
        j++;
      } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) {
        push("del", midA[i++]);
      } else {
        push("add", midB[j++]);
      }
    }
    while (i < midA.length) push("del", midA[i++]);
    while (j < midB.length) push("add", midB[j++]);
  }
  push("same", a.slice(endA).join(""));
  return out;
}

function tokenize(text) {
  if (text === null || text === undefined) return [];
  return String(text).match(/\s+|[^\s]+/g) ?? [];
}

/** "kept [-cut-]{+added+} kept" -- the plain-text form of wordDiff. */
export function diffToText(segments) {
  return segments.map((s) => (s.op === "same" ? s.text : s.op === "del" ? `[-${s.text}-]` : `{+${s.text}+}`)).join("");
}

/** How much of a field changed: the share of its words that were cut or added. */
export function changeShare(segments) {
  let changed = 0;
  let total = 0;
  for (const s of segments) {
    const words = (s.text.match(/[^\s]+/g) ?? []).length;
    total += words;
    if (s.op !== "same") changed += words;
  }
  return total ? changed / total : 0;
}

/**
 * One line a person can read for a record: what she did, where. Used by the
 * session-start digest and the log command.
 */
export function describeRecord(record) {
  const where = pathToString(record.path) || "the scene";
  switch (record.op) {
    case "set":
      return `rewrote ${where}`;
    case "insert":
      return `added ${record.item?.id ? `"${record.item.id}" to ` : "a line to "}${where}`;
    case "remove":
      return `removed ${record.itemId ? `"${record.itemId}" from ` : "a line from "}${where}`;
    case "move":
      return `moved "${record.itemId}" ${record.afterId ? `after "${record.afterId}"` : "to the top"} in ${where}`;
    case "note":
      return `left a note on ${where}: "${record.text}"`;
    case "withdraw":
      return `took back note ${record.noteId}`;
    default:
      return `${record.op} ${where}`;
  }
}
