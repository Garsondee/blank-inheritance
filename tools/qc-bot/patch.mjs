/**
 * The QC bot's patches: a short list of operations on JSON files, each carrying the words it expects to find.
 *
 * It is the same idea, and the same merge function, as Ingram's own Scene Runner edits (design/scene-edits.md,
 * core/scene-edits.mjs#mergeRecord): an operation names a field, says what the field holds now (`before`) and what it
 * should hold (`after`), and is applied only if the file still says `before`. If somebody changed the line since the bot
 * looked, the result is a CLASH that is reported, never a silent overwrite. That is what lets the bot work on a copy of
 * the repo that may be a few days behind, and lets Ingram and Claude merge its work later without losing hers.
 *
 *   { "op": "set",    "file": "canon/challenges/c1e1-kit-issue.json", "path": "checks[the-stamp].skillOptions",
 *                     "before": ["crafting", "perception"], "after": ["crafting", "perception", "society"] }
 *   { "op": "set",    "file": "...", "path": "checks[the-stamp].bySkill.society", "before": null, "after": "..." }
 *   { "op": "insert", "file": "canon/scenes/x.json", "path": "temptations", "item": { "id": "...", "text": "..." }, "afterId": null }
 *   { "op": "remove", "file": "canon/scenes/x.json", "path": "temptations", "itemId": "..." }
 *   { "op": "create", "file": "data/npcs/new-person.json", "content": { ... } }
 *
 * A `path` is text ("checks[the-stamp].bySkill.society": a name, a list item by its id in brackets, or `#3` for the
 * fourth item of a list that has no ids) or an array of segments (`["bySkill", "academia-lore"]`, `{ "id": "the-stamp" }`).
 * `insert` may carry `idKey` (default `id`) for lists whose items are named by another field, as the NPC roster's are.
 *
 * Pure: documents in, documents out. The caller reads and writes files.
 */
import { mergeRecord, cloneDoc, sameValue, pathToString, wordDiff } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";

export { wordDiff, sameValue, cloneDoc };

export const OP_KINDS = Object.freeze(["set", "insert", "remove", "create"]);

const PART = /^([A-Za-z$_][A-Za-z0-9_$-]*)?((?:\[[A-Za-z0-9][A-Za-z0-9_-]*\]|#\d+)*)$/;

/** A path as segments. Throws on text it does not understand. */
export function parseOpPath(input) {
  if (Array.isArray(input)) {
    for (const s of input) {
      const ok = typeof s === "string" || (s && typeof s.id === "string") || (s && Number.isInteger(s.index));
      if (!ok) throw new Error(`Not a path segment: ${JSON.stringify(s)}`);
    }
    if (!input.length) throw new Error("Empty path");
    return input;
  }
  if (typeof input !== "string" || !input) throw new Error(`Not a path: ${JSON.stringify(input)}`);
  const out = [];
  for (const part of input.split(".")) {
    const m = PART.exec(part);
    if (!m || (!m[1] && !m[2])) throw new Error(`Not a path: ${JSON.stringify(input)}`);
    if (m[1]) out.push(m[1]);
    for (const sel of m[2].match(/\[[^\]]+\]|#\d+/g) ?? []) out.push(sel.startsWith("#") ? { index: Number(sel.slice(1)) } : { id: sel.slice(1, -1) });
  }
  return out;
}

/** The text form of a path, for people. */
export const pathText = (input) => pathToString(parseOpPath(input));

/** True when one path is the same place as, or inside, the other. Used to catch two proposals editing the same part. */
export function pathsOverlap(a, b) {
  const x = parseOpPath(a);
  const y = parseOpPath(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) if (JSON.stringify(x[i]) !== JSON.stringify(y[i])) return false;
  return true;
}

/** Fields no patch may write, at any depth: identity, lifecycle and the plumbing around them (core/scene-edits.mjs). */
export const FORBIDDEN_SEGMENTS = new Set(["id", "type", "authoring", "$schema", "review"]);

/** Why an operation's shape is wrong, or null. Does not look at any file. */
export function opProblem(op) {
  if (!op || typeof op !== "object") return "an operation must be an object";
  if (!OP_KINDS.includes(op.op)) return `unknown operation "${op.op}" (use ${OP_KINDS.join(", ")})`;
  if (typeof op.file !== "string" || !op.file) return "an operation needs a file";
  if (op.op === "create") {
    if (!op.content || typeof op.content !== "object" || Array.isArray(op.content)) return "create needs the whole file as an object in `content`";
    return null;
  }
  let segments;
  try {
    segments = parseOpPath(op.path);
  } catch (e) {
    return e.message;
  }
  const last = segments.at(-1);
  if (segments.some((s) => typeof s === "string" && ["authoring", "review", "$schema"].includes(s))) return `${pathText(op.path)} is lifecycle or plumbing, which no patch may write`;
  if (op.op === "set" && typeof last === "string" && FORBIDDEN_SEGMENTS.has(last)) return `${pathText(op.path)} is identity, which no patch may write`;
  if (op.op === "set" && !("before" in op)) return "set needs `before` (the words it expects to find; null when the field does not exist yet)";
  if (op.op === "set" && !("after" in op)) return "set needs `after`";
  if (op.op === "insert" && (op.item === undefined || op.item === null)) return "insert needs an `item`";
  if (op.op === "remove" && op.itemId == null && op.item == null) return "remove needs `itemId`, or the `item` it expects to find";
  return null;
}

const STATUS = { merged: "merged", already: "already", clash: "clash", unplaceable: "unplaceable", note: "unplaceable" };

/**
 * Apply operations to parsed documents. `docs` maps a repo path to its parsed JSON (absent = undefined). Nothing in
 * `docs` is changed: the changed copies come back in `docs` of the result, keyed the same way.
 *
 * @returns {{ ok: boolean, results: Array<{index:number, op:string, file:string, path:string|null, status:'merged'|'already'|'clash'|'unplaceable', reason?:string, current?:any}>, docs: Record<string, any>, created: string[] }}
 *   `ok` is true when every operation merged or was already in place.
 */
export function applyOps(docs, ops) {
  const work = {};
  const created = [];
  const get = (file) => {
    if (!(file in work)) work[file] = docs[file] === undefined ? undefined : cloneDoc(docs[file]);
    return work[file];
  };
  const results = ops.map((op, index) => {
    const base = { index, op: op?.op, file: op?.file, path: op?.path != null ? safePathText(op.path) : null };
    const bad = opProblem(op);
    if (bad) return { ...base, status: "unplaceable", reason: bad };
    try {
      return { ...base, ...applyOne(get, work, created, op) };
    } catch (e) {
      return { ...base, status: "unplaceable", reason: e.message };
    }
  });
  return { ok: results.every((r) => r.status === "merged" || r.status === "already"), results, docs: work, created };
}

function safePathText(p) {
  try {
    return pathText(p);
  } catch {
    return String(p);
  }
}

function applyOne(get, work, created, op) {
  if (op.op === "create") {
    const existing = get(op.file);
    if (existing === undefined) {
      work[op.file] = cloneDoc(op.content);
      created.push(op.file);
      return { status: "merged" };
    }
    return sameValue(existing, op.content) ? { status: "already" } : { status: "clash", reason: "a file is already there and says something different", current: existing };
  }
  const doc = get(op.file);
  if (doc === undefined) return { status: "unplaceable", reason: `${op.file} does not exist` };
  const path = parseOpPath(op.path);
  let record;
  if (op.op === "set") {
    record = { op: "set", path, before: op.before ?? null, after: op.after };
  } else if (op.op === "insert") {
    const early = dedupeInsert(doc, path, op);
    if (early) return early;
    record = { op: "insert", path, item: cloneDoc(op.item), afterId: op.afterId, atIndex: op.atIndex };
  } else {
    record = { op: "remove", path, itemId: op.itemId, item: op.item, atIndex: op.atIndex };
  }
  const r = mergeRecord(doc, record);
  return { status: STATUS[r.result] ?? "unplaceable", ...(r.reason ? { reason: r.reason } : {}), ...(r.current !== undefined ? { current: r.current } : {}) };
}

/** Lists of plain values, and lists named by a field other than `id`, are not de-duplicated by the shared merge: do it here. */
function dedupeInsert(doc, path, op) {
  const found = walk(doc, path);
  if (!Array.isArray(found)) return null;
  const idKey = op.idKey ?? "id";
  if (op.item === null || typeof op.item !== "object") return found.some((x) => sameValue(x, op.item)) ? { status: "already" } : null;
  if (idKey === "id") return null;
  const existing = found.find((x) => x && x[idKey] === op.item[idKey]);
  if (!existing) return null;
  return sameValue(existing, op.item) ? { status: "already" } : { status: "clash", reason: `${op.item[idKey]} is already there and says something different`, current: existing };
}

function walk(doc, path) {
  let cur = doc;
  for (const seg of path) {
    if (cur == null) return undefined;
    if (typeof seg === "string") cur = cur[seg];
    else if (seg.id !== undefined) cur = Array.isArray(cur) ? cur.find((x) => x && x.id === seg.id) : undefined;
    else cur = Array.isArray(cur) ? cur[seg.index] : undefined;
  }
  return cur;
}

const isWords = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

/** A list of plain words compared item by item, so "crafting, perception" becoming "crafting, perception, society" shows only society as new. */
function listDiff(before, after) {
  const parts = [...before.map((x) => [after.includes(x) ? "same" : "del", x]), ...after.filter((x) => !before.includes(x)).map((x) => ["add", x])];
  const out = [];
  parts.forEach(([op, text], i) => {
    if (i) out.push({ op: "same", text: ", " });
    out.push({ op, text });
  });
  return out;
}

/** The words an operation changes, as segments for a reader: [{op:'same'|'del'|'add', text}]. */
export function opDiff(op) {
  if (op.op === "create") return [{ op: "add", text: `a new file, ${op.file}` }];
  if (op.op === "set") return isWords(op.before) && isWords(op.after) ? listDiff(op.before, op.after) : wordDiff(show(op.before), show(op.after));
  if (op.op === "insert") return wordDiff("", show(op.item));
  return wordDiff(show(op.item ?? op.itemId), "");
}

/**
 * A value as a reader sees it: text as it is, a list of plain words as "a, b, c", an object of lines as one "name: line"
 * per entry (the per-skill lines of a check), anything else as JSON.
 */
export function show(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((x) => typeof x === "string")) return value.join(", ");
  if (value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((x) => typeof x === "string")) {
    return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join("\n");
  }
  return JSON.stringify(value);
}

/** One line for a person: what an operation does and where. */
export function describeOp(op) {
  const where = op.op === "create" ? op.file : `${op.file} · ${safePathText(op.path)}`;
  return `${op.op === "set" ? (op.before == null ? "adds" : "changes") : op.op === "insert" ? "adds an item to" : op.op === "remove" ? "removes an item from" : "creates"} ${where}`;
}
