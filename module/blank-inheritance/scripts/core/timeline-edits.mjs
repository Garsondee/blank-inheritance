/**
 * Editing the plot timeline (design/plot-timeline.md §4 and §5, D070): which fields each kind of item offers, the
 * operations a save sends (tools/timeline/ops.mjs reads them), the undo of a save, the words a drag writes back, the
 * queue for going through the pencil, and which items changed between two snapshots (so Claude's edits can be lit up
 * as they arrive). Pure: no file access, no DOM, no Foundry, so the page and a Foundry window can share it.
 */
import { wordsForDays, PARTS } from "./timeline-when.mjs";

export const INK = Object.freeze(["decided", "accepted", "provisional", "proposal"]);
export const isInk = (status) => INK.includes(status);
export const isPencil = (status) => status === "sketch";

const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Every item in a snapshot that a save can change, by id: { kind, item }. */
export function itemsById(snap) {
  const m = new Map();
  for (const f of snap.facts || []) m.set(f.id, { kind: "fact", item: f });
  for (const c of snap.chapters || []) {
    m.set(c.id, { kind: "chapter", item: c });
    for (const b of c.beats || []) m.set(b.id, { kind: "beat", item: { ...b, chapter: c.id, n: c.n } });
  }
  for (const t of snap.threads || []) m.set(t.id, { kind: "thread", item: t });
  for (const q of snap.questions || []) m.set(q.id, { kind: "question", item: q });
  for (const i of snap.ideas || []) m.set(i.id, { kind: "idea", item: i });
  for (const b of snap.books || []) m.set(b.id, { kind: "book", item: b });
  return m;
}

// The fields the inspector offers, per kind: [field, label, hint]. Status, by, source and from are never fields: a
// status moves only through Ink it, back to pencil and Cut, and provenance is the tools' to keep.
const WHEN = ["when", "When", "about 40 years ago · 44 to 40 years ago · 4721 AR · day 1, late morning · chapter 6, late · book iv"];
const THREADS = ["threads", "Threads", "thread ids, separated by commas"];
const TOLD = (field, label) => [field, label, "start · later · in:<scene, chapter or beat id>"];
export const FIELDS = Object.freeze({
  fact: [WHEN, ["known", "Who in the world knows it", "everyone · some · few · nobody"], TOLD("told", "When the table hears it"), ["payoff", "Pays off", "the fact it plants"], THREADS],
  belief: [["held-by", "Believed by", "who holds it"], ["true", "Is it true?", "yes · no · partly"], ["truth", "The truth", "the fact that is true"]],
  open: [["candidates", "Her candidates", "answers separated by |"], ["decide-by", "Decide by", "when it must be settled"]],
  beat: [["kind", "Kind", "event · reveal · choice · flashback · end"], ["pace", "Pace", "up · down · lateral"], WHEN, THREADS, ["reveals", "Reveals", "facts still told later, by id"], ["fork", "A fork", "yes, or empty"]],
  chapter: [["rank", "Rank", "the party's rank"], ["learn", "They learn", "what the table learns"], ["book", "Book", "I to V"]],
  thread: [["impulse", "It wants", ""], ["doom", "Where it ends if nobody stops it", ""], ["lane", "Lane", "people · places · …"], ["order", "Order", "a number"], ["entities", "Who and what", "entity ids, separated by commas"], ["intensity", "Rise and fall", "0 to 5 per chapter, . for not sketched, | between Books"]],
  question: [["answer", "The answer", "a fact id"], ["misdirect", "What misleads", "a fact id"], TOLD("raised", "First wondered"), TOLD("answered", "Can be known")],
  idea: [["state", "State", "live · parked · adopted · rejected"], WHEN, THREADS, ["became", "It became", "fact or beat ids"], ["retire", "Never say", "wording, separated by |"]],
  book: [["chapters", "Chapters", "N to M"]],
});

/** The fields to offer for one item: its kind's, plus a belief's or an open fact's when it is one. */
export function fieldsFor(entry) {
  const out = [...(FIELDS[entry.kind] || [])];
  if (entry.kind === "fact") {
    const meta = entry.item.meta || {};
    if (meta["held-by"] !== undefined) out.push(...FIELDS.belief);
    if (entry.item.status === "open") out.push(...FIELDS.open);
  }
  return out;
}

/** The ops for what she changed in the inspector: her words and every field whose value differs from the file's. */
export function editOps(entry, { text = null, fields = {} } = {}) {
  const ops = [];
  const id = entry.item.id;
  if (text !== null && norm(text) && norm(text) !== norm(entry.item.text)) ops.push({ op: "text", id, before: entry.item.text, value: norm(text) });
  for (const [field, value] of Object.entries(fields)) {
    const before = entry.item.meta?.[field] ?? "";
    if (norm(value) !== norm(before)) ops.push({ op: "field", id, field, before, value: norm(value) });
  }
  return ops;
}

/**
 * The ops that answer an open question: her answer replaces its words, the candidates and the deadline go (they were
 * the question), `when` becomes the one date she means, and it is decided: all one save, so one undo takes it back.
 */
export function answerOps(entry, { text, when = "" }) {
  const it = entry.item;
  const words = norm(text);
  if (!words) throw new Error("an answer needs its words");
  const ops = [{ op: "text", id: it.id, before: it.text, value: words }];
  for (const field of ["candidates", "decide-by"]) if (norm(it.meta?.[field])) ops.push({ op: "field", id: it.id, field, before: it.meta[field], value: "" });
  const before = it.meta?.when ?? "";
  if (norm(when) !== norm(before)) ops.push({ op: "field", id: it.id, field: "when", before, value: norm(when) });
  ops.push({ op: "ink", id: it.id, before: "open" });
  return ops;
}

/** What "Ink it" makes of an item: decided for her words (or her edit in the same save), accepted for Claude's. */
export function inkVerb(entry, { herWords = false } = {}) {
  return herWords || entry.item.by === "ingram" ? "decide" : "accept";
}

/** May this item be dragged along time? Only pencil, and only what a `when` places (ink is locked against a stray drag). */
export function draggable(entry) {
  if (!entry) return false;
  if (entry.kind === "idea") return Boolean(entry.item.when);
  if (!isPencil(entry.item.status)) return false;
  if (!entry.item.when || entry.item.when.includes("|")) return false;
  return ["fact", "beat"].includes(entry.kind);
}

const sig2 = (n) => {
  if (n < 100) return Math.max(1, Math.round(n));
  const p = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
};

/**
 * The `when` words for a point on the strip, as a drop writes them: rough in the deep past, by time of day in the
 * episodes, by chapter and part of it in the campaign ahead.
 */
export function dragWhen(position) {
  if (!position) return null;
  if (position.scale === "chapters") {
    const n = Math.max(1, Math.floor(position.at));
    const frac = position.at - n;
    const part = Object.entries(PARTS).reduce((best, [w, f]) => (Math.abs(f - frac) < Math.abs(best[1] - frac) ? [w, f] : best))[0];
    return `chapter ${n}, ${part}`;
  }
  const days = position.at;
  if (days >= -1) return wordsForDays(days);
  const years = -days / 365.25;
  if (years >= 1.5) {
    const n = sig2(years);
    return `about ${n} year${n === 1 ? "" : "s"} ago`;
  }
  return wordsForDays(days);
}

/**
 * The undo of a save: the ops that put back what it changed, from the save's own results (the server says what each
 * status change left behind). A save with something that can't be put back (a note, a park, an open question cut)
 * says so, and its undo restores the rest.
 * @returns {{ ops: object[], complete: boolean }}
 */
export function undoOf(ops, results) {
  const out = [];
  let complete = true;
  ops.forEach((op, i) => {
    const r = (results || []).find((x) => x.i === i);
    if (!r || r.result !== "merged") return;
    switch (op.op) {
      case "field": out.push({ op: "field", id: op.id, field: op.field, before: r.value ?? norm(op.value), value: r.was ?? op.before ?? "" }); break;
      case "text": out.push({ op: "text", id: op.id, before: r.value ?? norm(op.value), value: r.was ?? op.before }); break;
      case "ink":
        if (r.was === "open") out.push({ op: "reopen", id: op.id, before: r.status });
        else if (r.was === "sketch" || r.was === "proposal" || r.was === "provisional") out.push({ op: "pencil", id: op.id, before: r.status, by: r.by || "claude" });
        else if (r.was === "cut") out.push({ op: "cut", id: op.id, before: r.status });
        else complete = false;
        break;
      case "pencil": out.push({ op: "ink", id: op.id, before: "sketch", verb: r.was === "decided" ? "decide" : "accept" }); break;
      case "cut":
        if (r.state === "rejected") {
          out.push({ op: "field", id: op.id, field: "state", before: "rejected", value: r.stateWas || "live" });
          if (norm(r.retire) !== norm(r.retireWas)) out.push({ op: "field", id: op.id, field: "retire", before: r.retire, value: r.retireWas || "" });
        } else if (r.was === "sketch" || isInk(r.was)) {
          if (norm(r.retire) !== norm(r.retireWas)) out.push({ op: "field", id: op.id, field: "retire", before: r.retire, value: r.retireWas || "" });
          out.push(r.was === "sketch" ? { op: "pencil", id: op.id, before: "cut", by: r.by || "claude" } : { op: "ink", id: op.id, before: "cut", verb: r.was === "decided" ? "decide" : "accept" });
        } else complete = false;
        break;
      case "park":
        if (r.state === "parked") out.push({ op: "field", id: op.id, field: "state", before: "parked", value: r.stateWas || "live" });
        else complete = false;
        break;
      default: complete = false;
    }
  });
  return { ops: out.reverse(), complete };
}

// ---- going through the pencil

export const REVIEW_GROUPS = Object.freeze(["thread", "entity", "chapter", "author", "source"]);

/** Everything still pencil that she hasn't parked or skipped: what review mode walks through. */
export function reviewItems(snap, { parked = [], skipped = [], includeParked = false } = {}) {
  const parkedSet = new Set(parked);
  const skip = new Set(skipped);
  const out = [];
  for (const [id, entry] of itemsById(snap)) {
    if (skip.has(id)) continue;
    if (entry.kind === "idea") { if (entry.item.state === "live" || (includeParked && entry.item.state === "parked")) out.push(entry); continue; }
    if (!isPencil(entry.item.status)) continue;
    if (!includeParked && parkedSet.has(id)) continue;
    out.push(entry);
  }
  return out;
}

function groupKey(snap, entry, by, threadOfEntity, chapterOfPlace) {
  const it = entry.item;
  switch (by) {
    case "author": return it.by === "ingram" ? ["ingram", "Your own words, waiting for a second look"] : ["claude", "Claude's, waiting for your read"];
    case "entity":
      if (entry.kind === "fact") return [`e:${it.entity}`, (snap.entities || []).find((e) => e.id === it.entity)?.title || it.entity];
      if (entry.kind === "beat") return [`c:${it.chapter}`, `Chapter ${it.n}`];
      return [`k:${entry.kind}`, { chapter: "Chapters", thread: "Threads", question: "Questions", idea: "Ideas", book: "Books" }[entry.kind] || entry.kind];
    case "chapter": {
      if (entry.kind === "beat") return [`c:${String(it.n).padStart(2, "0")}`, `Chapter ${it.n}`];
      if (entry.kind === "chapter") return [`c:${String(it.n).padStart(2, "0")}`, `Chapter ${it.n}`];
      const n = entry.kind === "fact" ? chapterOfPlace(it.told) : null;
      return n ? [`c:${String(n).padStart(2, "0")}`, `Chapter ${n}`] : ["z", entry.kind === "fact" ? "Not scheduled for the table yet" : "Not tied to a chapter"];
    }
    case "source": {
      if (it.by === "ingram") { const d = (it.source || []).find((s) => /^D\d{3}$/.test(s) && s !== "D071"); if (d) return [`d:${d}`, `Her words in ${d}`]; }
      const origin = String(it.origin || "").split(",")[0].trim();
      const m = origin.match(/^cb:([a-z]+)(?:\.(\d+)|(\d+))?/);
      if (m) return [`cb:${m[1]}`, `The Casebook: ${m[1]}`];
      return ["other", "Elsewhere"];
    }
    case "thread":
    default: {
      const t = (it.threads && it.threads[0]) || (entry.kind === "fact" ? threadOfEntity.get(it.entity) : null);
      if (t) return [`t:${t}`, (snap.threads || []).find((x) => x.id === t)?.title || t];
      if (entry.kind === "thread") return [`t:${it.id}`, it.title];
      return ["~", "No thread yet"];
    }
  }
}

/**
 * The review queue in groups: [{ key, title, items: [entry] }], groups in a steady order and items in reading order
 * (facts by entity, beats by chapter, the rest by id).
 */
export function reviewQueue(snap, { by = "thread", parked = [], skipped = [], includeParked = false } = {}) {
  const items = reviewItems(snap, { parked, skipped, includeParked });
  const threadOfEntity = new Map();
  for (const t of [...(snap.threads || [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))) for (const e of t.entities || []) if (!threadOfEntity.has(e)) threadOfEntity.set(e, t.id);
  const chapters = new Map((snap.chapters || []).map((c) => [c.id, c.n]));
  const beatChapter = new Map();
  for (const c of snap.chapters || []) for (const b of c.beats || []) beatChapter.set(b.id, c.n);
  const chapterOfPlace = (told) => {
    if (!/^in:/.test(told || "")) return null;
    const id = told.slice(3);
    return chapters.get(id) || beatChapter.get(id) || ((snap.scenes || []).some((s) => s.id === id) ? 1 : null);
  };
  const groups = new Map();
  for (const entry of items) {
    const [key, title] = groupKey(snap, entry, by, threadOfEntity, chapterOfPlace);
    if (!groups.has(key)) groups.set(key, { key, title, items: [] });
    groups.get(key).items.push(entry);
  }
  const rank = { fact: 0, chapter: 1, beat: 2, thread: 3, question: 4, idea: 5, book: 6 };
  const order = (e) => [rank[e.kind] ?? 9, e.item.entity || "", e.item.n ?? 0, e.item.id];
  for (const g of groups.values()) g.items.sort((a, b) => {
    const x = order(a), y = order(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  });
  const threadOrder = new Map((snap.threads || []).map((t) => [`t:${t.id}`, t.order ?? 99]));
  return [...groups.values()].sort((a, b) => (threadOrder.get(a.key) ?? 100) - (threadOrder.get(b.key) ?? 100) || a.key.localeCompare(b.key));
}

// ---- what changed

/** Ids whose words or fields differ between two snapshots, or that are new: what Claude just changed, to light up. */
export function changedIds(before, after) {
  if (!before) return [];
  const a = itemsById(before);
  const out = [];
  for (const [id, entry] of itemsById(after)) {
    const old = a.get(id);
    if (!old) { out.push(id); continue; }
    if (norm(old.item.text) !== norm(entry.item.text) || JSON.stringify(old.item.meta || {}) !== JSON.stringify(entry.item.meta || {})) out.push(id);
  }
  return out;
}
