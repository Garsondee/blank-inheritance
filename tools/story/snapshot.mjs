// Canon as plain data (design/plot-timeline.md §4): what the timeline page and the core timeline model read.
//
// {
//   version, presentYear, now: { chapter }, canonHash,
//   books:     [{ id, book, numeral, title, from, to, text, rows, status, by, source }]
//   entities:  [{ id, title, kind, notes }]
//   facts:     [{ id, entity, text, status, by, source, known, told, when, payoff, threads, heldBy, isTrue, truth,
//                 candidates, decideBy, retire, zone, origin }]
//   decisions: [{ id, date, title, kind, quotes: [paragraphs of her words], changes: [{ verb, target, rest }] }]
//   scenes:    [{ id, title, episode, chapter, day, time, state, inCanon, beats: [{ id, title, facts, gmFacts }] }]  (the plan's rows)
//   chapters:  [{ id, n, title, book, rank, text, status, by, source, beats: [{ id, text, status, by, source, kind, pace, threads, when }] }]
//   threads, questions, ideas: as tools/story/plot.mjs reads them, without line numbers
//   citations: { id: [{ file, at, as }] }
//   order:     { id: seq }   play order across the campaign (lib.mjs#playOrder)
// }
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { loadModel, citations, playOrder, NOW_CHAPTER, ROOT } from "./lib.mjs";
import { parseMeta } from "./format.mjs";
import { formatMeta } from "./edit.mjs";
import { allEdits } from "./daybook.mjs";
import { mergesOf, parseWas, itemHash, resolveAlias } from "./merges.mjs";
import { PRESENT_YEAR } from "../../module/blank-inheritance/scripts/core/timeline-when.mjs";

/** Her words in a decision record: every quoted paragraph ("> ..."), joined line by line. */
export function quotesOf(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith(">")) {
      const words = line.replace(/^>\s?/, "");
      if (!cur) { cur = []; out.push(cur); }
      cur.push(words);
    } else cur = null;
  }
  return out.map((p) => p.join("\n").trim()).filter(Boolean);
}

/**
 * What an import record says it kept out or softened, one string per bullet in its "## Conflicts" section, so the
 * timeline can put each in front of Ingram instead of leaving it in a Markdown file (D079). Bold marks are dropped.
 */
export function conflictsOf(text) { return bulletsOf(text, "Conflicts"); }

/** The bullets of one "## Heading" section of a record, each as one string (a bullet may run over several lines). */
export function bulletsOf(text, heading) {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  let on = false;
  let fence = false;
  const block = [];
  for (const line of lines) {
    if (/^```/.test(line)) fence = !fence;
    if (!fence && /^## /.test(line)) { on = line.trim() === `## ${heading}`; continue; }
    if (on) block.push(line);
  }
  const out = [];
  let open = false;
  for (const line of block) {
    if (/^- /.test(line)) { out.push(line.slice(2).trim()); open = true; }
    else if (!line.trim()) open = false;
    else if (open && /^\s+\S/.test(line)) out[out.length - 1] += ` ${line.trim()}`;
  }
  return out.map((s) => s.replace(/\*\*/g, ""));
}

/**
 * Every merge of Claude's on record (tools/story/merge.mjs), with what the page needs to show it: the pieces as they
 * were, whether the merged item has been edited since, whether she has said it looks right, and why it was made.
 */
export function mergesView(model) {
  const looksRight = new Set(allEdits(model).filter((e) => e.op === "mergeok").map((e) => e.merge));
  const facts = new Map(model.world.flatMap((e) => e.facts.map((f) => [f.id, f])));
  const ideas = new Map((model.ideas || []).map((i) => [i.id, i]));
  return mergesOf(model).map((m) => {
    const hit = (m.kind === "idea" ? ideas : facts).get(m.kept);
    const now = hit ? itemHash(hit.text, formatMeta(hit.meta, Object.keys(hit.meta))) : null;
    return {
      ref: m.ref, record: m.record, no: m.no, kind: m.kind, kept: m.kept, why: m.why, state: m.state, undone: m.undone,
      pieces: m.absorbed.map((id) => {
        const was = m.was.get(id);
        if (!was) return { id, text: "", by: null, known: null, told: null, when: null };
        const w = parseWas(was);
        let meta = {};
        try { meta = parseMeta(w.meta); } catch { /* the original's meta line is shown as is */ }
        return { id, text: w.text, by: meta.by || null, known: meta.known || null, told: meta.told || null, when: meta.when || null, state: meta.state || null };
      }),
      accepted: looksRight.has(m.ref),
      edited: Boolean(hit) && now !== m.after,
      gone: !hit,
    };
  });
}

/** A hash of every file under canon/, so a published copy can say which canon it was made from. */
export function canonHash(root = ROOT) {
  const h = crypto.createHash("sha256");
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else h.update(`${path.relative(root, full).split(path.sep).join("/")}\n`).update(fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n"));
    }
  };
  walk(path.join(root, "canon"));
  return h.digest("hex").slice(0, 16);
}

// Line numbers stay behind; `meta` (each field exactly as its file holds it) comes along, so the page can say what it
// saw when it saves a change (tools/timeline/ops.mjs checks `before` against the file).
const strip = (o) => { const { line, ...rest } = o; return rest; };

/** Every card: its title, and the pencil facts in it that still exist (a member a merge absorbed is followed to the item that holds it). */
export function cardsView(model) {
  const out = [];
  for (const e of model.world) {
    const pencil = new Set(e.facts.filter((f) => f.status === "sketch").map((f) => f.id));
    for (const c of e.cards || []) {
      const members = [...new Set(c.members.map((m) => resolveAlias(model.aliases, m)).filter((id) => pencil.has(id)))];
      out.push({ id: c.id, entity: e.id, title: c.title, members });
    }
  }
  return out;
}

export function snapshot(model = loadModel(), { root = ROOT } = {}) {
  const { order } = playOrder(model);
  const cardOf = new Map(cardsView(model).flatMap((c) => c.members.map((id) => [id, c.id])));
  const cites = citations(model);
  const canonScenes = new Map(model.scenes.map((s) => [s.id, s]));
  return {
    version: 1,
    presentYear: PRESENT_YEAR,
    now: { chapter: NOW_CHAPTER },
    canonHash: canonHash(root),
    books: (model.books || []).map(strip),
    entities: model.world.map((e) => ({ id: e.id, title: e.title, kind: e.kind, lane: e.lane || null, notes: e.notes })),
    cards: cardsView(model),
    facts: model.world.flatMap((e) => e.facts.map((f) => ({
      id: f.id, entity: f.entity, text: f.text, status: f.status, by: f.by || null, source: f.source, known: f.known, told: f.told,
      when: f.when, payoff: f.payoff || null, threads: f.threads || [], heldBy: f.heldBy, isTrue: f.isTrue, truth: f.truth,
      candidates: f.candidates, decideBy: f.decideBy, retire: f.retire, zone: f.zone, origin: f.origin || null, meta: f.meta, card: cardOf.get(f.id) || null,
    }))),
    decisions: model.decisions.map((d) => ({ id: d.id, date: d.date, title: d.title, kind: d.kind || "decision", asked: (d.text.match(/^asked: (.+)$/m) || [])[1] || null, quotes: quotesOf(d.text), conflicts: ["import", "merge"].includes(d.kind) ? conflictsOf(d.text) : [], left: d.kind === "merge" ? bulletsOf(d.text, "Not merged") : [], overlaps: d.kind === "merge" ? bulletsOf(d.text, "Possible overlaps across files") : [], changes: d.changes })),
    merges: mergesView(model),
    scenes: model.plan.map((r) => {
      const s = canonScenes.get(r.scene);
      return {
        id: r.scene, title: r.title, episode: r.episode, chapter: Number((r.file.match(/^chapter-(\d+)\.md$/) || [])[1]) || null,
        day: r.day, time: r.time, state: r.state, note: r.note || "", inCanon: Boolean(s),
        beats: s ? (s.json.beats || []).map((b) => ({ id: b.id, title: b.title || null, facts: b.facts || [], gmFacts: b.gmFacts || [] })) : [],
      };
    }),
    chapters: (model.chapters || []).map((c) => ({ ...strip(c), beats: c.beats.map(strip) })),
    threads: (model.threads || []).map((t) => ({ ...strip(t), clocks: t.clocks.map(({ line, ...c }) => c) })),
    questions: (model.questions || []).map((q) => ({ ...strip(q), roads: q.roads.map(({ line, ...r }) => r) })),
    ideas: (model.ideas || []).map(strip),
    citations: Object.fromEntries([...cites.entries()]),
    order: Object.fromEntries(order),
  };
}
