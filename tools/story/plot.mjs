// The plot's own files in canon (design/plot-timeline.md §3, D070): threads, questions, ideas, the five Books and the
// chapters' beats. Facts stay in world/ (lib.mjs); these say how the story moves through them.
//
//   canon/threads/<id>.md     a thread or front: its lane, impulse and doom, its rise and fall, its clocks
//   canon/questions/<id>.md   what the table wonders: the answer, the misdirection, and the roads to it
//   canon/ideas/<topic>.md    brainstorms and "what ifs", each live, parked, adopted or rejected
//   canon/plan/books.md       the five Books and their chapters
//   canon/plan/chapter-NN.md  a chapter: its header, then "### beat--slug" beats under "## Beats"
//
// Pure parsers and one check (checkPlot), in the shape of objectives.mjs.
import fs from "node:fs";
import path from "node:path";

import { lf, csv, bars, sections, itemBody, parseHead, statusBlock } from "./format.mjs";
import { parseWhen, ROMAN } from "../../module/blank-inheritance/scripts/core/timeline-when.mjs";

export const THREAD_KINDS = ["front", "thread"];
export const BEAT_KINDS = ["event", "reveal", "choice", "flashback", "end"];
export const PACES = ["up", "down", "lateral"];
export const IDEA_STATES = ["live", "parked", "adopted", "rejected"];
// The six kinds of clue (design/mystery-and-investigation-design.md §3).
export const CLUE_KINDS = ["physical", "testimony", "absence", "anomaly", "pattern", "corroboration"];

const listFiles = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort() : []);

// ---- threads

export function parseThread(text, id) {
  const file = `threads/${id}.md`;
  const { head, list } = sections(text, 2);
  const h = parseHead(head, file);
  const clocks = [];
  // "## By Book": one line per Book, "- I: what the thread does in Book I" (the Casebook's weave, made from canon).
  const byBook = {};
  for (const s of list) {
    if (s.heading === "By Book") {
      for (const l of s.body) {
        const r = l.match(/^- ([IVX]+): (.+)$/);
        if (r) byBook[ROMAN.indexOf(r[1].toLowerCase()) + 1] = r[2].trim();
      }
      continue;
    }
    const m = s.heading.match(/^Clock · (.+)$/);
    if (!m) continue;
    const items = s.body.map((l) => l.match(/^- `?([a-z0-9-]+(?:\.[a-z0-9-]+)?)`?\s*$/)?.[1]).filter(Boolean);
    clocks.push({ name: m[1].trim(), items, line: s.line });
  }
  return {
    id, file, title: h.title, text: h.text,
    kind: h.meta.kind || null,
    lane: h.meta.lane || null,
    order: h.meta.order === undefined ? null : Number(h.meta.order),
    entities: csv(h.meta.entities),
    impulse: h.meta.impulse || null,
    doom: h.meta.doom || null,
    intensityRaw: h.meta.intensity || null,
    intensity: parseIntensity(h.meta.intensity),
    byBook,
    clocks,
    ...statusBlock(h.meta),
    meta: h.meta,
  };
}

/** "1 1 2 2 | 3 4 3 4 | ..." -> one value per chapter, 0 to 5, null for "." (not sketched). Bad tokens become NaN. */
export function parseIntensity(raw) {
  if (!raw) return [];
  return raw.split("|").flatMap((g) => g.trim().split(/\s+/).filter(Boolean)).map((t) => (t === "." ? null : /^[0-5]$/.test(t) ? Number(t) : NaN));
}

// ---- questions

export function parseQuestion(text, id) {
  const file = `questions/${id}.md`;
  const { head, list } = sections(text, 2);
  const h = parseHead(head, file);
  const roads = [];
  for (const s of list) {
    if (s.heading !== "Roads") continue;
    s.body.forEach((l, i) => {
      const m = l.match(/^- (.+)$/);
      if (!m) return;
      const parts = m[1].split(" · ").map((p) => p.trim().replace(/^`|`$/g, ""));
      const core = parts[0] === "core";
      if (core) parts.shift();
      roads.push({ core, kind: parts[0] || null, fact: parts[1] || null, note: parts.slice(2).join(" · ") || null, line: s.line + 1 + i });
    });
  }
  return {
    id, file, title: h.title, text: h.text,
    answer: h.meta.answer || null,
    misdirect: h.meta.misdirect || null,
    raised: h.meta.raised || null,
    answered: h.meta.answered || null,
    roads,
    ...statusBlock(h.meta),
    meta: h.meta,
  };
}

// ---- ideas

export function parseIdeas(text, topic) {
  const file = `ideas/${topic}.md`;
  const { head, list } = sections(text, 2);
  const h = parseHead(head, file);
  const ideas = [];
  for (const s of list) {
    if (!s.heading.startsWith("idea--")) continue;
    const { text: words, meta } = itemBody(s.body, `${file} → ${s.heading}`);
    ideas.push({
      id: s.heading, topic, file, line: s.line, text: words,
      state: meta.state || null,
      threads: csv(meta.threads),
      when: meta.when || null,
      became: csv(meta.became),
      retire: bars(meta.retire),
      ...statusBlock(meta),
      meta,
    });
  }
  return { topic, file, title: h.title, text: h.text, ideas };
}

// ---- the five Books

export function parseBooks(text) {
  const file = "plan/books.md";
  const { head, list } = sections(text, 2);
  const h = parseHead(head, file);
  const books = [];
  for (const s of list) {
    const m = s.heading.match(/^Book ([IVX]+) · (.+)$/);
    if (!m) continue;
    const rows = [];
    const rest = [];
    for (const l of s.body) {
      const r = l.match(/^- ([^:]+): (.+)$/);
      if (r) rows.push([r[1].trim(), r[2].trim()]);
      else rest.push(l);
    }
    const { text: words, meta } = itemBody(rest, `${file} → Book ${m[1]}`);
    const span = (meta.chapters || "").match(/^(\d+) to (\d+)$/);
    books.push({
      id: `book-${m[1].toLowerCase()}`, book: ROMAN.indexOf(m[1].toLowerCase()) + 1, numeral: m[1], title: m[2].trim(), line: s.line,
      from: span ? Number(span[1]) : null, to: span ? Number(span[2]) : null,
      text: words, rows, ...statusBlock(meta), meta,
    });
  }
  return { title: h.title, text: h.text, books };
}

// ---- chapters and their beats

export function parseChapter(text, file) {
  const n = Number((file.match(/^chapter-(\d+)\.md$/) || [])[1]);
  const id = `chapter-${String(n).padStart(2, "0")}`;
  const { head } = sections(text, 2);
  const h = parseHead(head, `plan/${file}`);
  const beats = [];
  const beatSections = sections(text, 3).list.filter((s) => s.heading.startsWith("beat--"));
  for (const s of beatSections) {
    // A beat's body stops at the next heading of any level.
    const cut = s.body.findIndex((l) => /^#{1,3} /.test(l));
    const body = cut < 0 ? s.body : s.body.slice(0, cut);
    const { text: words, meta } = itemBody(body, `plan/${file} → ${s.heading}`);
    beats.push({
      id: s.heading, chapter: id, n, file: `plan/${file}`, line: s.line, text: words,
      kind: meta.kind || null,
      pace: meta.pace || null,
      threads: csv(meta.threads),
      when: meta.when || null,
      // Facts this beat would let the table learn when their own `told` can't say so yet: an ink fact still
      // `told: later` is never edited by a sketched plan, so the plan points at it from here.
      reveals: csv(meta.reveals),
      fork: meta.fork || null,
      ...statusBlock(meta),
      meta,
    });
  }
  const t = h.title.match(/^Chapter (\d+) · (.+)$/);
  return {
    id, n, file: `plan/${file}`, title: t ? t[2].trim() : h.title, heading: h.title, text: h.text,
    book: h.meta.book || null,
    rank: h.meta.rank || null,
    learn: h.meta.learn || null,
    beats,
    ...statusBlock(h.meta),
    meta: h.meta,
  };
}

export function loadPlot(root) {
  const c = (p) => path.join(root, "canon", p);
  const plot = { threads: [], questions: [], ideaFiles: [], ideas: [], chapters: [], books: [], booksTitle: null, raw: {}, problems: [] };
  const read = (rel) => { const raw = lf(fs.readFileSync(c(rel), "utf8")); plot.raw[rel] = raw; return raw; };
  const guard = (rel, fn) => { try { fn(); } catch (e) { plot.problems.push({ level: "error", where: rel, message: e.message }); } };
  for (const f of listFiles(c("threads"), ".md")) guard(`threads/${f}`, () => plot.threads.push(parseThread(read(`threads/${f}`), f.replace(/\.md$/, ""))));
  for (const f of listFiles(c("questions"), ".md")) guard(`questions/${f}`, () => plot.questions.push(parseQuestion(read(`questions/${f}`), f.replace(/\.md$/, ""))));
  for (const f of listFiles(c("ideas"), ".md")) guard(`ideas/${f}`, () => {
    const parsed = parseIdeas(read(`ideas/${f}`), f.replace(/\.md$/, ""));
    plot.ideaFiles.push(parsed);
    plot.ideas.push(...parsed.ideas);
  });
  if (fs.existsSync(c("plan/books.md"))) guard("plan/books.md", () => { const b = parseBooks(read("plan/books.md")); plot.books = b.books; plot.booksTitle = b.title; });
  for (const f of listFiles(c("plan"), ".md").filter((x) => /^chapter-\d+\.md$/.test(x))) guard(`plan/${f}`, () => plot.chapters.push(parseChapter(read(`plan/${f}`), f)));
  plot.chapters.sort((a, b) => a.n - b.n);
  return plot;
}

// ---- the check

/**
 * Every rule for the plot's files. `ctx` comes from lib.mjs#checkModel: the facts, the planned ids (scenes, chapters,
 * beats), play order, which source ids hold Ingram's words, and the horizon (the last chapter the checks look ahead to).
 */
export function checkPlot(model, ctx) {
  const problems = [];
  const err = (where, message) => problems.push({ level: "error", where, message });
  const warn = (where, message) => problems.push({ level: "warn", where, message });
  const { facts, planned, order, isSource, isAuthority, entities, horizon, knownIds } = ctx;
  const told = (v) => /^(start|later|in:[a-z0-9-]+)$/.test(v || "");
  const placeOf = (v) => (v === "start" ? -1 : v?.startsWith("in:") && order.has(v.slice(3)) ? order.get(v.slice(3)) : Infinity);
  const chapterOfPlace = (v) => {
    if (!v?.startsWith("in:")) return v === "start" ? 1 : Infinity;
    const id = v.slice(3);
    const ch = (model.chapters || []).find((c) => c.id === id || c.beats.some((b) => b.id === id));
    if (ch) return ch.n;
    if ((model.plan || []).some((r) => r.scene === id)) return 1;
    return Infinity;
  };

  const statusOk = (at, item, { pencilOnly = false } = {}) => {
    const STATUSES = ["decided", "accepted", "proposal", "open", "provisional", "sketch", "cut"];
    if (!STATUSES.includes(item.status)) { err(at, `unknown status "${item.status}"`); return; }
    if (pencilOnly && item.status !== "sketch") err(at, `this is always pencil: status must be sketch, not ${item.status}`);
    if (item.status === "sketch" && !["ingram", "claude"].includes(item.by)) err(at, 'pencil needs "by: ingram" or "by: claude"');
    if (item.status !== "sketch" && item.by) err(at, '"by:" is only for pencil (sketch)');
    if (!item.source.length) err(at, "every item needs a source");
    for (const s of item.source) if (!isSource(s)) err(at, `source ${s} is not a decision, a source record, or a scene in canon`);
    if (["decided", "accepted", "cut"].includes(item.status) && !item.source.some(isAuthority)) err(at, `a ${item.status} item must cite a decision in Ingram's words (an import record is not one)`);
    if (item.status === "sketch" && item.by === "ingram" && !item.source.some(isAuthority)) err(at, '"by: ingram" must cite the decision or source record that holds her words');
  };
  const whenOk = (at, when) => { if (!when) return; try { parseWhen(when); } catch (e) { err(at, `when: ${e.message}`); } };

  // Books: contiguous chapters from 1
  let next = 1;
  for (const b of model.books || []) {
    const at = `plan/books.md → Book ${b.numeral}`;
    statusOk(at, b);
    if (b.book < 1) err(at, "a Book is numbered I to V");
    if (b.from === null || b.to === null) { err(at, 'a Book needs "chapters: N to M"'); continue; }
    if (b.from !== next) err(at, `starts at chapter ${b.from}; expected ${next}`);
    if (b.to < b.from) err(at, "ends before it starts");
    next = b.to + 1;
  }
  const chapterCount = (model.books || []).length ? next - 1 : null;

  // Chapters and beats
  const beatIds = new Set();
  const revealedBy = new Map();
  const allBeats = new Set((model.chapters || []).flatMap((c) => c.beats.map((b) => b.id)));
  for (const c of model.chapters || []) {
    const at = `${c.file}`;
    if (!Number.isInteger(c.n) || c.n < 1) { err(at, 'a chapter file is "chapter-NN.md"'); continue; }
    const hasRows = (model.plan || []).some((r) => r.file === `chapter-${String(c.n).padStart(2, "0")}.md`);
    if (c.status === null) { if (!hasRows) err(at, 'a chapter sketch needs a "status:" line in its header'); }
    else statusOk(at, c);
    if (c.book && !(model.books || []).some((b) => b.numeral === c.book)) err(at, `book ${c.book} is not in plan/books.md`);
    if (c.book && (model.books || []).length) {
      const b = model.books.find((x) => x.numeral === c.book);
      if (b && (c.n < b.from || c.n > b.to)) err(at, `chapter ${c.n} is not in Book ${c.book} (chapters ${b.from} to ${b.to})`);
    }
    if (chapterCount && c.n > chapterCount) err(at, `the Books end at chapter ${chapterCount}`);
    for (const b of c.beats) {
      const bat = `${c.file} → ${b.id}`;
      if (!/^beat--[a-z0-9-]+$/.test(b.id)) err(bat, "a beat id is beat--slug, lower case with hyphens");
      if (beatIds.has(b.id)) err(bat, "this beat id is used twice");
      beatIds.add(b.id);
      statusOk(bat, b);
      if (!BEAT_KINDS.includes(b.kind)) err(bat, `kind must be one of ${BEAT_KINDS.join(", ")}`);
      if (b.pace && !PACES.includes(b.pace)) err(bat, `pace must be one of ${PACES.join(", ")}`);
      for (const t of b.threads) if (!(model.threads || []).some((x) => x.id === t)) warn(bat, `thread ${t} is not in canon/threads`);
      whenOk(bat, b.when);
      // `scene:` is the scene of the plan a beat happens in: the timeline sets the beat's note under that scene's card (D086).
      // A beat with none belongs to the chapter as a whole (a flashback between chapters, say).
      const sceneRef = b.meta?.scene;
      if (sceneRef) {
        const row = (model.plan || []).find((r) => r.scene === sceneRef || r.scene === `episode-${sceneRef}`);
        if (!row) err(bat, `scene ${sceneRef} is not a scene in the plan`);
        else if (row.file !== `chapter-${String(c.n).padStart(2, "0")}.md`) err(bat, `scene ${sceneRef} is in ${row.file}, not in this chapter: a beat sits under a scene of its own chapter`);
      }
      for (const r of b.reveals || []) {
        const f = facts.get(r);
        if (!f) err(bat, `reveals ${r}, which is not a canon fact`);
        else if (f.told !== "later") err(bat, `reveals ${r}, which is already told ${f.told}: a beat reveals only a fact still told later`);
        else if (revealedBy.has(r)) err(bat, `reveals ${r}, which ${revealedBy.get(r)} already reveals`);
        else revealedBy.set(r, b.id);
      }
    }
  }

  // Threads
  for (const t of model.threads || []) {
    const at = t.file;
    statusOk(at, t);
    if (!THREAD_KINDS.includes(t.kind)) err(at, `kind must be one of ${THREAD_KINDS.join(", ")}`);
    if (t.order !== null && !Number.isFinite(t.order)) err(at, "order must be a number");
    for (const e of t.entities) if (!entities.has(e)) warn(at, `entity ${e} has no canon/world file yet`);
    if (t.intensity.some((v) => Number.isNaN(v))) err(at, 'intensity is one value per chapter: 0 to 5, or "." for not sketched');
    else if (chapterCount && t.intensity.length && t.intensity.length !== chapterCount) err(at, `intensity has ${t.intensity.length} values; the Books have ${chapterCount} chapters`);
    for (const cl of t.clocks) {
      if (!cl.items.length) warn(at, `clock "${cl.name}" has no steps`);
      for (const i of cl.items) if (!knownIds.has(i)) err(at, `clock "${cl.name}" names ${i}, which is not a fact, beat, scene, chapter or idea`);
    }
  }

  // Questions
  for (const q of model.questions || []) {
    const at = q.file;
    statusOk(at, q);
    if (!q.answer) err(at, 'a question needs "answer: <fact id>"');
    else if (!facts.has(q.answer)) err(at, `answer ${q.answer} is not a canon fact`);
    if (q.misdirect && !facts.has(q.misdirect)) err(at, `misdirect ${q.misdirect} is not a canon fact`);
    for (const [k, v] of [["raised", q.raised], ["answered", q.answered]]) {
      if (!v) continue;
      if (!told(v)) err(at, `${k} must be start, later, or in:<scene, chapter or beat>`);
      else if (v.startsWith("in:") && !planned.has(v.slice(3))) err(at, `${k} ${v.slice(3)}, which isn't in the plan`);
    }
    for (const r of q.roads) {
      if (!CLUE_KINDS.includes(r.kind)) err(at, `a road's kind must be one of ${CLUE_KINDS.join(", ")} (found "${r.kind}")`);
      if (!r.fact || !(facts.has(r.fact) || allBeats.has(r.fact))) err(at, `road ${r.fact} is not a canon fact or beat`);
    }
    // The Three Clue Rule, only for questions answered inside the horizon: past it, answers wait on purpose.
    if (chapterOfPlace(q.answered) <= horizon) {
      if (q.roads.length < 3) warn(at, `only ${q.roads.length} road(s) to the answer: give it three`);
      if (q.roads.length && new Set(q.roads.map((r) => r.kind)).size === 1) warn(at, "every road is the same kind of clue");
      if (q.roads.length && q.roads.every((r) => r.kind === "pattern")) warn(at, "a pattern clue is the only road: it delivers nothing until its last instance lands");
      if (q.roads.length && !q.roads.some((r) => r.core)) warn(at, "no road is marked core (the one that must reach the table, never behind a roll)");
      const ans = placeOf(q.answered);
      for (const r of q.roads) {
        const f = facts.get(r.fact);
        const when = f ? placeOf(f.told) : order.has(r.fact) ? order.get(r.fact) : Infinity;
        if (when > ans) warn(at, `road ${r.fact} is told after the answer`);
      }
    }
  }

  // Ideas: always pencil
  const ideaIds = new Set();
  for (const i of model.ideas || []) {
    const at = `${i.file} → ${i.id}`;
    if (!/^idea--[a-z0-9-]+$/.test(i.id)) err(at, "an idea id is idea--slug, lower case with hyphens");
    if (ideaIds.has(i.id)) err(at, "this idea id is used twice");
    ideaIds.add(i.id);
    statusOk(at, i, { pencilOnly: true });
    if (!IDEA_STATES.includes(i.state)) err(at, `state must be one of ${IDEA_STATES.join(", ")}`);
    if (i.state === "adopted" && !i.became.length) err(at, 'an adopted idea names what it became ("became: <ids>")');
    for (const b of i.became) if (!knownIds.has(b)) err(at, `became ${b}, which is not a fact, beat, thread or question`);
    if (i.state === "rejected" && !i.retire.length) warn(at, "a rejected idea should list the wording that must not come back (retire)");
    for (const t of i.threads) if (!(model.threads || []).some((x) => x.id === t)) warn(at, `thread ${t} is not in canon/threads`);
    whenOk(at, i.when);
  }
  return problems;
}
