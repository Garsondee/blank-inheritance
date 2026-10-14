// The one writer of canon's story files (design/plot-timeline.md §1, §5; D070).
//
// Every change to a fact, beat or idea goes through here: the timeline page's saves, the re-mark, the import and
// `story edit`. Each operation touches only the lines it changes and keeps the file's own line endings, so a no-op
// leaves a file byte for byte as it was. A status changes only through ink(), pencil() and cut(), and each needs the
// decision record that says so: typing an item's words never changes its status.
//
// An item lives in one of two places in its file:
//   a section   "## id" or "### id" (facts, beats, ideas), or a Book's "## Book N · Title" in plan/books.md
//   the head    the file's own "# Title" and the "key: value" lines under it (chapters, threads, questions); a
//               field there stays on its own line, and a new one joins the status line
//
// The text functions are pure (string in, string out). applyToFile() reads, edits and writes one file atomically.
import fs from "node:fs";
import path from "node:path";

import { parseMeta, bars } from "./format.mjs";
import { ROOT } from "./lib.mjs";
import { writeFileAtomic } from "../scene-edits/store.mjs";

const HEADING = /^#{1,3} /;
const KEY_LINE = /^[a-z][a-z-]*: /;
const ROW = /^- [^:]+: /;
/** The kinds of item whose fields sit in their file's head. */
export const HEAD_KINDS = Object.freeze(["chapter", "thread", "question"]);

export function splitLines(raw) {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  return { eol, lines: raw.split(/\r?\n/) };
}
export const joinLines = (lines, eol) => lines.join(eol);

/** The item's section: its heading line, its meta line and where the section ends. Throws if it isn't there. */
export function findItem(lines, id) {
  const start = lines.findIndex((l) => l.trimEnd() === `## ${id}` || l.trimEnd() === `### ${id}`);
  if (start < 0) throw new Error(`no item "${id}" in this file`);
  return sectionAt(lines, start, id);
}

function sectionAt(lines, start, id, { rows = false } = {}) {
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (HEADING.test(lines[i])) { end = i; break; }
  let meta = -1;
  for (let i = end - 1; i > start; i--) if (lines[i].startsWith("status:")) { meta = i; break; }
  if (meta < 0) throw new Error(`"${id}" has no "status: ..." line`);
  const words = [];
  for (let i = start + 1; i < meta; i++) if (lines[i].trim() && !(rows && ROW.test(lines[i]))) words.push(i);
  return { mode: "section", start, meta, end, keys: [meta], words, rows };
}

function headOf(lines, id) {
  const title = lines.findIndex((l) => l.trim());
  if (title < 0 || !lines[title].startsWith("# ")) throw new Error(`"${id}": the file's first line must be "# Title"`);
  let end = lines.length;
  for (let i = title + 1; i < lines.length; i++) if (lines[i].startsWith("## ")) { end = i; break; }
  const keys = [];
  const words = [];
  for (let i = title + 1; i < end; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    (KEY_LINE.test(t) ? keys : words).push(i);
  }
  const meta = keys.find((i) => "status" in parseMeta(lines[i].trim()));
  if (meta === undefined) throw new Error(`"${id}" has no "status: ..." line in its file's head`);
  return { mode: "head", start: title, meta, end, keys, words };
}

/**
 * Where an item is in its file's lines: { mode, start, meta (the status line), end, keys (lines holding its fields),
 * words (lines holding its words) }. `kind` (as tools/story/lib.mjs#itemIndex names it) says where to look: a chapter,
 * thread or question is its file's head, a Book is its "## Book N · Title" section, anything else its "## id" section.
 */
export function locate(lines, id, { kind = null } = {}) {
  if (HEAD_KINDS.includes(kind)) return headOf(lines, id);
  const book = kind === "book" || (!kind && /^book-[ivx]+$/.test(id)) ? id.match(/^book-([ivx]+)$/) : null;
  if (book) {
    const start = lines.findIndex((l) => l.startsWith(`## Book ${book[1].toUpperCase()} · `));
    if (start < 0) throw new Error(`no item "${id}" in this file`);
    return sectionAt(lines, start, id, { rows: true });
  }
  return findItem(lines, id);
}

/** An item's words and fields as its file holds them now: the raw field strings, before any parsing. */
export function readItem(raw, id, opts = {}) {
  const { lines } = splitLines(raw);
  const at = locate(lines, id, opts);
  const meta = {};
  for (const i of at.keys) Object.assign(meta, parseMeta(lines[i].trim()));
  return { text: at.words.map((i) => lines[i]).join(" ").replace(/\s+/g, " ").trim(), meta };
}

/** "status: x · by: y · source: z": keys in their old order, a new `by` straight after status, other new keys last. */
export function formatMeta(meta, previousOrder = []) {
  const keys = Object.keys(meta).filter((k) => meta[k] !== null && meta[k] !== undefined && meta[k] !== "");
  const order = [];
  for (const k of previousOrder) if (keys.includes(k) && !order.includes(k)) order.push(k);
  for (const k of keys) if (!order.includes(k)) {
    if (k === "by" && order.includes("status")) order.splice(order.indexOf("status") + 1, 0, k);
    else order.push(k);
  }
  if (order.includes("status")) { order.splice(order.indexOf("status"), 1); order.unshift("status"); }
  return order.map((k) => `${k}: ${meta[k]}`).join(" · ");
}

function editMeta(lines, id, change, opts = {}) {
  const at = locate(lines, id, opts);
  if (at.mode === "section") {
    const old = parseMeta(lines[at.meta]);
    lines[at.meta] = formatMeta(change({ ...old }), Object.keys(old));
    return lines;
  }
  // The head: every field stays on the line it is on, in its place; a new one joins the status line.
  const perLine = at.keys.map((i) => ({ i, keys: Object.keys(parseMeta(lines[i].trim())) }));
  const old = {};
  for (const p of perLine) Object.assign(old, parseMeta(lines[p.i].trim()));
  const next = change({ ...old });
  const keep = (k) => next[k] !== null && next[k] !== undefined && next[k] !== "";
  const placed = new Set(perLine.flatMap((p) => p.keys));
  const statusLine = perLine.find((p) => p.i === at.meta);
  for (const k of Object.keys(next)) {
    if (placed.has(k) || !keep(k)) continue;
    if (k === "by" && statusLine.keys.includes("status")) statusLine.keys.splice(statusLine.keys.indexOf("status") + 1, 0, k);
    else statusLine.keys.push(k);
  }
  for (const p of [...perLine].sort((a, b) => b.i - a.i)) {
    const keys = p.keys.filter(keep);
    if (!keys.length) lines.splice(p.i, 1);
    else lines[p.i] = keys.map((k) => `${k}: ${next[k]}`).join(" · ");
  }
  return lines;
}

const sourcesWith = (m, source) => {
  const list = (m.source || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.includes(source)) list.push(source);
  return list.join(", ");
};

/** Set one field of an item's meta line (`null` removes it). Never the status: that is ink(), pencil() and cut(). */
export function setField(raw, id, key, value, opts = {}) {
  if (key === "status" || key === "by") throw new Error(`"${key}" changes only through ink() or pencil(), with a decision record`);
  if (!/^[a-z][a-z-]*$/.test(key)) throw new Error(`"${key}" is not a field name`);
  if (value !== null && /[·\r\n]/.test(String(value))) throw new Error(`a field's value may not hold "·" or a line break`);
  const { eol, lines } = splitLines(raw);
  editMeta(lines, id, (m) => { if (value === null || String(value).trim() === "") delete m[key]; else m[key] = String(value).trim(); return m; }, opts);
  return joinLines(lines, eol);
}

/** Replace an item's words with one line of text. Its status and every other field stay as they were. */
export function setText(raw, id, text, opts = {}) {
  const words = String(text).replace(/\s+/g, " ").trim();
  if (!words) throw new Error("an item needs its words");
  if (words.startsWith("status:") || HEADING.test(words)) throw new Error('an item\'s words may not start with "status:" or a heading');
  const { eol, lines } = splitLines(raw);
  const at = locate(lines, id, opts);
  if (at.mode === "head" || at.rows) {
    if (at.mode === "head" && KEY_LINE.test(words)) throw new Error('these words may not start like a field ("word: ..."): reword the start');
    if (at.rows && ROW.test(words)) throw new Error('these words may not start like a row ("- label: ..."): reword the start');
    const where = at.words.length ? at.words[0] : at.mode === "head" ? at.keys[at.keys.length - 1] + 1 : at.meta;
    for (const i of [...at.words].sort((a, b) => b - a)) lines.splice(i, 1);
    lines.splice(where, 0, words);
    return joinLines(lines, eol);
  }
  let first = at.start + 1;
  while (first < at.meta && !lines[first].trim()) first++;
  lines.splice(first, at.meta - first, words);
  return joinLines(lines, eol);
}

/** Add a decision (or other source) to an item's sources, once. */
export function addSource(raw, id, source, opts = {}) {
  const { eol, lines } = splitLines(raw);
  editMeta(lines, id, (m) => { m.source = sourcesWith(m, source); return m; }, opts);
  return joinLines(lines, eol);
}

// ---- moving a world fact across the "## Pencil" line

const pencilIndex = (lines) => lines.findIndex((l) => l.trimEnd() === "## Pencil");

/** Lift an item's block (heading to meta line) out of the file, with one blank line after it. */
function takeBlock(lines, id) {
  const at = findItem(lines, id);
  const block = lines.slice(at.start, at.meta + 1);
  let cut = at.meta + 1;
  while (cut < at.end && !lines[cut].trim()) cut++;
  lines.splice(at.start, cut - at.start);
  return block;
}

/** Drop trailing blank lines (and the final newline). */
function trimEnd(lines) {
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}
/** End the file with exactly one newline. */
function tidyEnd(lines) {
  trimEnd(lines);
  lines.push("");
  return lines;
}

/** Move a world fact to the end of the file, below the "## Pencil" line (made if missing). */
export function moveBelowPencil(raw, id) {
  const { eol, lines } = splitLines(raw);
  const block = takeBlock(lines, id);
  trimEnd(lines);
  if (pencilIndex(lines) < 0) lines.push("", "## Pencil");
  lines.push("", ...block);
  tidyEnd(lines);
  return joinLines(lines, eol);
}

/** Move a world fact up into the ink: straight after the last ink fact, or before the first section. */
export function moveAbovePencil(raw, id) {
  const { eol, lines } = splitLines(raw);
  const block = takeBlock(lines, id);
  const pencil = pencilIndex(lines);
  const limit = pencil < 0 ? lines.length : pencil;
  let insertAt = -1;
  for (let i = 0; i < limit; i++) {
    if (/^## [a-z0-9-]+\.[a-z0-9-]+\s*$/.test(lines[i])) insertAt = findItem(lines, lines[i].slice(3).trim()).meta + 1;
  }
  if (insertAt < 0) {
    const firstSection = lines.findIndex((l) => l.startsWith("## "));
    insertAt = firstSection < 0 ? lines.length : firstSection;
    lines.splice(insertAt, 0, ...block, "");
  } else {
    lines.splice(insertAt, 0, "", ...block);
  }
  tidyEnd(lines);
  return joinLines(lines, eol);
}

// ---- status changes: only with the decision that makes them

const needDecision = (decision, what) => { if (!/^D\d{3}$/.test(decision || "")) throw new Error(`${what} needs the decision record that does it`); };

/**
 * Pencil an item (status sketch), crediting its author and citing the decision that pencilled it. A world fact also
 * moves below the "## Pencil" line.
 */
export function pencil(raw, id, { decision, by, world = false, kind = null }) {
  needDecision(decision, "pencilling");
  if (!["ingram", "claude"].includes(by)) throw new Error('pencil needs "by: ingram" or "by: claude"');
  const { eol, lines } = splitLines(raw);
  editMeta(lines, id, (m) => { m.status = "sketch"; m.by = by; m.source = sourcesWith(m, decision); return m; }, { kind });
  const out = joinLines(lines, eol);
  return world ? moveBelowPencil(out, id) : out;
}

/**
 * Ink an item: `decide` makes it decided (her words), `accept` makes it accepted (Claude's, approved). It cites the
 * decision, loses its `by`, and a world fact moves above the "## Pencil" line.
 */
export function ink(raw, id, { decision, verb, world = false, kind = null }) {
  if (!/^D\d{3}$/.test(decision || "")) throw new Error("inking needs the decision record in Ingram's words that does it");
  if (!["decide", "accept"].includes(verb)) throw new Error('ink with "decide" or "accept"');
  const { eol, lines } = splitLines(raw);
  editMeta(lines, id, (m) => { m.status = verb === "decide" ? "decided" : "accepted"; delete m.by; m.source = sourcesWith(m, decision); return m; }, { kind });
  const out = joinLines(lines, eol);
  return world ? moveAbovePencil(out, id) : out;
}

/**
 * Reopen an item (status open), citing the decision that does it: how an answer is taken back. A world fact also moves
 * below the "## Pencil" line, where open questions sit.
 */
export function reopen(raw, id, { decision, world = false, kind = null }) {
  needDecision(decision, "reopening");
  const { eol, lines } = splitLines(raw);
  editMeta(lines, id, (m) => { m.status = "open"; delete m.by; m.source = sourcesWith(m, decision); return m; }, { kind });
  const out = joinLines(lines, eol);
  return world ? moveBelowPencil(out, id) : out;
}

/**
 * Cut an item: it stays where it is, struck (status cut), citing the decision, and the wording that must never come
 * back joins its `retire` list (canon/README.md, filing rule 6). An idea is never cut: it is rejected (its `state`).
 */
export function cut(raw, id, { decision, retire = [], kind = null }) {
  needDecision(decision, "cutting");
  if (kind === "idea") throw new Error("an idea is rejected (state: rejected), not cut");
  const phrases = (Array.isArray(retire) ? retire : String(retire || "").split("|")).map((s) => String(s).trim()).filter(Boolean);
  for (const p of phrases) if (/[·|\r\n]/.test(p)) throw new Error('wording to retire may not hold "·", "|" or a line break');
  const { eol, lines } = splitLines(raw);
  editMeta(lines, id, (m) => {
    m.status = "cut";
    delete m.by;
    m.source = sourcesWith(m, decision);
    const list = bars(m.retire);
    for (const p of phrases) if (!list.includes(p)) list.push(p);
    if (list.length) m.retire = list.join(" | ");
    return m;
  }, { kind });
  return joinLines(lines, eol);
}

/** Add a new item at the end of a file: `## id` (or `### id`), its words, its meta line. */
export function appendItem(raw, { id, text, meta, level = 2, pencilZone = false }) {
  if (!meta?.status) throw new Error("a new item needs its status");
  const { eol, lines } = splitLines(raw);
  if (lines.some((l) => l.trimEnd() === `${"#".repeat(level)} ${id}`)) throw new Error(`"${id}" is already in this file`);
  trimEnd(lines);
  if (pencilZone && pencilIndex(lines) < 0) lines.push("", "## Pencil");
  lines.push("", `${"#".repeat(level)} ${id}`, String(text).replace(/\s+/g, " ").trim(), formatMeta(meta));
  tidyEnd(lines);
  return joinLines(lines, eol);
}

/** Append lines to a decision record's "## Changes" list (made at the end if missing). */
export function addChanges(raw, changeLines) {
  const { eol, lines } = splitLines(raw);
  let at = lines.findIndex((l) => l.trimEnd() === "## Changes");
  if (at < 0) { trimEnd(lines); lines.push("", "## Changes"); at = lines.length - 1; }
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) if (/^## /.test(lines[i])) { end = i; break; }
  let last = end - 1;
  while (last > at && !lines[last].trim()) last--;
  const existing = new Set(lines.slice(at + 1, end).map((l) => l.trim()));
  const fresh = changeLines.filter((l) => !existing.has(l.trim()));
  if (last === at) lines.splice(at + 1, 0, "", ...fresh);
  else lines.splice(last + 1, 0, ...fresh);
  tidyEnd(lines);
  return joinLines(lines, eol);
}

/** Read a canon file, apply text operations in order, and write it atomically only if something changed. */
export function applyToFile(relative, ops, { root = ROOT } = {}) {
  const abs = path.join(root, relative);
  const before = fs.readFileSync(abs, "utf8");
  let after = before;
  for (const op of ops) after = op(after);
  if (after !== before) writeFileAtomic(abs, after);
  return { changed: after !== before, before, after };
}
