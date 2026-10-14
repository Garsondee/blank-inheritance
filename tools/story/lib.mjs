// The canon tree's reader and checks (design/story-data-refactor.md).
//
// canon/ holds only material that has been through the re-read and is waiting for, or has passed, Ingram's
// full read. Everything outside canon/ is old until it is rebuilt here. This module reads the tree into one
// model (loadModel) and checks it (checkModel). checkModel is pure: the tests hand it small synthetic models.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { QUARTER_IDS } from "../../module/blank-inheritance/scripts/core/day-ring.mjs";
import { resolveAll, DEFAULT_BOOKS } from "../../module/blank-inheritance/scripts/core/timeline-when.mjs";
import { buildPlay, parseSceneNote } from "../../module/blank-inheritance/scripts/core/timeline-play.mjs";

import { checkObjectives } from "./objectives.mjs";
import { lf, csv, bars, parseMeta, sections, itemBody } from "./format.mjs";
import { loadPlot, checkPlot } from "./plot.mjs";
import { findTimelineReversions, parseDayEdits } from "./daybook.mjs";
import { aliasesOf, resolveAlias } from "./merges.mjs";
import { actorNotesFile } from "./actor-notes.mjs";
import { CARDS_HEADING, parseCards, checkCards } from "./cards.mjs";

export { parseMeta };

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// `sketch` is pencil (D070): plans, history and ideas Ingram hasn't gone through yet. Play material never cites it.
export const STATUSES = ["decided", "accepted", "proposal", "open", "provisional", "sketch", "cut"];
export const AUTHORS = ["ingram", "claude"];
// A decision record is Ingram's words (the default), an import (Claude's record of material brought into canon as
// pencil: never authority for ink), a merge (Claude's record of pencil pieces made into one, kept so it can be undone:
// never authority either), or a timeline day record (her edits on the timeline page, quoted).
export const DECISION_KINDS = ["decision", "import", "timeline", "merge"];
// Where the table is now. The checks look ahead to the end of this chapter's Book (the event horizon) and no further.
export const NOW_CHAPTER = 1;
// Two separate questions (D048): who in the world knows a fact, and when the table is told it. Something can be common
// knowledge in Kurose and still be held back from the players until a later scene.
export const KNOWN = ["everyone", "some", "few", "nobody"];
export const TOLD = /^(start|later|in:[a-z0-9-]+)$/;
export const TRUTH = ["yes", "no", "partly"];
export const TIMES = ["early morning", "morning", "late morning", "midday", "afternoon", "evening", "night", "flexible", "unknown"];
// The plan's rough time of day, down to the campaign's own four-quarter day ring (design/ux-doctrine.md §3/§7a,
// module/blank-inheritance/scripts/core/day-ring.mjs — imported, not copied, so the two can never drift). A scene
// with no fixed time (flexible, unknown) gets no quarter: the ring is never forced to move for one.
export const TIME_TO_QUARTER = Object.freeze({
  "early morning": "morning",
  morning: "morning",
  "late morning": "morning",
  midday: "afternoon",
  afternoon: "afternoon",
  evening: "evening",
  night: "night",
  flexible: null,
  unknown: null,
});
export function quarterForTime(time) {
  if (!(time in TIME_TO_QUARTER)) throw new Error(`quarterForTime: "${time}" is not one of TIMES`);
  return TIME_TO_QUARTER[time];
}
export const SCENE_STATES = ["approved", "awaiting-read", "old-draft", "unwritten"];
export const VERBS = ["add", "change", "cut", "accept", "decide", "open", "resolve", "pencil", "approve", "merge"];
// The status each verb leaves its item in. The latest one wins: decisions are history, so a later one may undo an
// earlier one, and a status can only change by a new record saying so.
export const VERB_STATUS = Object.freeze({ add: null, change: null, cut: "cut", accept: "accepted", decide: "decided", open: "open", resolve: null, pencil: "sketch", approve: null, merge: "sketch" });

// Paths that point into old material. Canon may not rely on them; decision records are history and exempt.
export const OLD_PATHS = [
  /(?<!canon\/)\bideas\//,
  /\bdesign\/(?!story-data-refactor\.md|gm-facing-prose-style\.md)[\w-]+\.md/,
  /\bdata\/(?:scene-briefs|challenges|npcs|locations|episodes|characters|antagonists|factions|encounters|subsystems)\//,
  /\bLEDGER\b/,
  /\bdossier-[a-z-]+\.md/,
  /\bbible\//,
];

// A world file. Line 1 is "# Title", then "kind: x". Each fact is a "## entity.slug" section: its text, then
// one meta line starting "status:". A section without a dot in its name ("## Notes") is free text.
// A "## Pencil" line divides the file (D070): above it ink, below it only pencil (sketch) and open facts.
export function parseWorld(text, id) {
  text = lf(text);
  const title = (text.match(/^# (.+)$/m) || [])[1];
  if (!title) throw new Error(`${id}: the first line must be "# Title"`);
  const kind = ((text.match(/^kind: (.+)$/m) || [])[1] || "").trim();
  // Screen layout only: which strand of the timeline the entity is drawn in (core/timeline-lanes.mjs). Read from the head, above the first fact.
  const lane = (text.split(/^## /m)[0].match(/^lane: (.+)$/m) || [])[1]?.trim() || null;
  const facts = [];
  const notes = {};
  let zone = "ink";
  let pencilLine = null;
  let cards = [];
  const cardProblems = [];
  for (const s of sections(text, 2).list) {
    const name = s.heading;
    if (name === CARDS_HEADING) { const r = parseCards(s.body, id); cards = r.cards; cardProblems.push(...r.problems); continue; }
    if (name === "Pencil") {
      if (pencilLine !== null) throw new Error(`${id}: the "## Pencil" line appears twice`);
      if (s.body.some((l) => l.trim())) throw new Error(`${id}: the "## Pencil" line stands alone; put pencil facts under their own "## entity.slug" headings`);
      zone = "pencil";
      pencilLine = s.line;
      continue;
    }
    if (!name.includes(".")) { notes[name] = s.body.join("\n").trim(); continue; }
    let body;
    try { body = itemBody(s.body, `${id}: fact ${name}`); } catch { throw new Error(`${id}: fact ${name} must end with its "status: ..." line`); }
    const meta = body.meta;
    facts.push({
      id: name,
      entity: id,
      text: body.text,
      status: meta.status,
      by: meta.by || null,
      source: csv(meta.source),
      known: meta.known || null,
      told: meta.told || null,
      heldBy: meta["held-by"] || null,
      isTrue: meta.true || null,
      truth: meta.truth || null,
      when: meta.when || null,
      payoff: meta.payoff || null,
      threads: csv(meta.threads),
      origin: meta.from || null,
      retire: bars(meta.retire),
      candidates: bars(meta.candidates),
      decideBy: meta["decide-by"] || null,
      zone,
      line: s.line,
      meta,
    });
  }
  return { id, title, kind, lane, facts, notes, pencilLine, cards, cardProblems };
}

// A decision record: "# D047 · date · title". A record split from the old log says so on its "source:" line and
// keeps its own layout. A new record has "## Ingram" (her words, quoted) and "## Changes" (one verb per line).
// A "kind:" line before the first section marks an import record or a timeline day record (DECISION_KINDS).
export function parseDecision(text, file) {
  text = lf(text);
  const head = text.split("\n")[0].match(/^# (D\d{3}) · ([^·]+?) · (.+)$/);
  if (!head) throw new Error(`${file}: the first line must be "# Dnnn · date · title"`);
  const split = /^source: split word for word from LEDGER #\d+$/m.test(text);
  const kind = (text.split(/^## /m)[0].match(/^kind: ([a-z-]+)\s*$/m) || [])[1] || "decision";
  const ingram = (text.split(/^## Ingram$/m)[1] || "").split(/^## /m)[0];
  const changes = [];
  const changeBlock = (text.split(/^## Changes$/m)[1] || "").split(/^## /m)[0];
  for (const m of changeBlock.matchAll(/^- (\w+) `?([a-z0-9-]+(?:\.[a-z0-9-]+)?)`?(.*)$/gm)) {
    changes.push({ verb: m[1], target: m[2], rest: m[3].trim() });
  }
  return { id: head[1], date: head[2].trim(), title: head[3].trim(), file, split, kind, quotes: (ingram.match(/^> /gm) || []).length, changes, text };
}

// The chapter plan: a Markdown table per episode.
// | # | Scene | Id | Day | Time | State |
export function parsePlan(text, file) {
  text = lf(text);
  const rows = [];
  let episode = null;
  text.split("\n").forEach((line, i) => {
    const h = line.match(/^## (.+)$/);
    if (h) { episode = h[1].trim(); return; }
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`?([a-z0-9-]+)`?\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!m) return;
    const day = m[4] === "—" ? null : Number(m[4]);
    // What follows the state is the row's note: what happens, why the table comes to it, what they can choose, where it leads.
    const note = line.slice(m[0].length).replace(/\|\s*$/, "").trim();
    rows.push({ file, episode, order: Number(m[1]), title: m[2], scene: m[3], day, dayRaw: m[4], time: m[5], state: m[6], note, line: i });
  });
  return rows;
}

const listFiles = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort() : []);

export function loadModel(root = ROOT) {
  const c = (p) => path.join(root, "canon", p);
  const model = { root, decisions: [], sources: [], world: [], plan: [], scenes: [], challenges: [], objectives: [], encounters: [], subsystems: [], built: {}, problems: [] };
  // Source records: material Ingram gave as a whole document (S001...), kept beside the decisions.
  for (const f of listFiles(c("sources"), ".md")) {
    const head = lf(fs.readFileSync(c("sources/" + f), "utf8")).split("\n")[0].match(/^# (S\d{3}) · ([^·]+?) · (.+)$/);
    if (!head) { model.problems.push({ level: "error", where: "sources/" + f, message: 'the first line must be "# Snnn · date · title"' }); continue; }
    model.sources.push({ id: head[1], file: f, title: head[3].trim() });
  }
  for (const f of listFiles(c("decisions"), ".md")) {
    try { model.decisions.push(parseDecision(fs.readFileSync(c("decisions/" + f), "utf8"), f)); }
    catch (e) { model.problems.push({ level: "error", where: "decisions/" + f, message: e.message }); }
  }
  // An item that was merged into another (D080): its old id still stands in older records' Changes lines.
  try { model.aliases = aliasesOf(model.decisions); } catch (e) { model.aliases = new Map(); model.problems.push({ level: "error", where: "decisions", message: "a merge record can't be read: " + e.message }); }
  for (const f of listFiles(c("world"), ".md")) {
    try { model.world.push({ ...parseWorld(fs.readFileSync(c("world/" + f), "utf8"), f.replace(/\.md$/, "")), raw: lf(fs.readFileSync(c("world/" + f), "utf8")) }); }
    catch (e) { model.problems.push({ level: "error", where: "world/" + f, message: e.message }); }
  }
  for (const f of listFiles(c("plan"), ".md")) {
    const raw = fs.readFileSync(c("plan/" + f), "utf8");
    model.plan.push(...parsePlan(raw, f));
    (model.planRaw ||= {})[f] = lf(raw);
  }
  // The plot's own files (plot.mjs): threads, questions, ideas, the Books and the chapters' beats.
  {
    const plot = loadPlot(root);
    Object.assign(model, { threads: plot.threads, questions: plot.questions, ideaFiles: plot.ideaFiles, ideas: plot.ideas, chapters: plot.chapters, books: plot.books, plotRaw: plot.raw });
    model.problems.push(...plot.problems);
  }
  // A scene's fight (encounters) and its running hazard or clock (subsystems) are rebuilt in canon like its checks,
  // so the numbers a scene runs on go through the same read as its words.
  for (const [kind, dir, dataDir] of [
    ["scenes", "scenes", "data/scene-briefs"],
    ["challenges", "challenges", "data/challenges"],
    ["objectives", "objectives", "data/objectives"],
    ["encounters", "encounters", "data/encounters"],
    ["subsystems", "subsystems", "data/subsystems"],
  ]) {
    for (const f of listFiles(c(dir), ".json")) {
      const raw = fs.readFileSync(c(dir + "/" + f), "utf8");
      let json = null;
      try { json = JSON.parse(raw); } catch (e) { model.problems.push({ level: "error", where: `${dir}/${f}`, message: "not valid JSON: " + e.message }); continue; }
      model[kind].push({ file: f, id: f.replace(/\.json$/, ""), raw, json });
      const built = path.join(root, dataDir, f);
      model.built[`${dataDir}/${f}`] = { source: raw, copy: fs.existsSync(built) ? fs.readFileSync(built, "utf8") : null };
    }
  }
  // The words of every fact a canon scene says out loud, for the Scene Runner's
  // "the table knows" drawer (module core/table-knows.mjs). Generated here so it
  // can never drift from canon/world/; `check` fails when it is out of date.
  {
    const where = "data/campaign/told-facts.json";
    const built = path.join(root, where);
    model.built[where] = { source: toldFactsFile(model), copy: fs.existsSync(built) ? fs.readFileSync(built, "utf8") : null };
  }
  // Every decision still hers (canon's open facts), for the Approvals Desk's tray: the story half of what
  // open-questions.json used to hold, generated so it cannot drift from canon (D079).
  {
    const where = "data/campaign/open-decisions.json";
    const built = path.join(root, where);
    model.built[where] = { source: openDecisionsFile(model), copy: fs.existsSync(built) ? fs.readFileSync(built, "utf8") : null };
  }
  // What each NPC's Actor sheet shows: the person's ink facts with their open decisions flagged, built from canon, in place
  // of the old story prose of data/npcs/*.json (D080). tools/story/actor-notes.mjs.
  {
    const where = "data/campaign/actor-notes.json";
    const built = path.join(root, where);
    model.built[where] = { source: actorNotesFile(model, root), copy: fs.existsSync(built) ? fs.readFileSync(built, "utf8") : null };
  }
  // Live play data outside canon, scanned only for retired wording. CLAUDE.md is read at the start of every
  // conversation, so retired wording may not come back there either (canon/README.md, filing rule 6).
  model.liveText = {};
  for (const dir of ["data/scene-briefs", "data/challenges"]) {
    for (const f of listFiles(path.join(root, dir), ".json")) model.liveText[`${dir}/${f}`] = fs.readFileSync(path.join(root, dir, f), "utf8");
  }
  if (fs.existsSync(path.join(root, "CLAUDE.md"))) model.liveText["CLAUDE.md"] = fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8");
  model.oldScenes = new Set(listFiles(path.join(root, "data/scene-briefs"), ".json").map((f) => f.replace(/\.json$/, "")));
  return model;
}

/**
 * data/campaign/told-facts.json: every fact some canon scene's beat says out
 * loud (its `facts`, never its `gmFacts`), with its words and what it is about.
 * The Scene Runner lists the ones the table has heard so far.
 */
export function toldFactsFile(model) {
  const told = new Set();
  for (const s of model.scenes) for (const b of s.json?.beats || []) for (const id of b.facts || []) told.add(id);
  const byId = new Map();
  for (const e of model.world) for (const f of e.facts) byId.set(f.id, { fact: f, entity: e });
  const facts = {};
  for (const id of [...told].sort()) {
    const hit = byId.get(id);
    if (hit) facts[id] = { text: hit.fact.text, about: hit.entity.title };
  }
  const doc = {
    $schema: "../schema/told-facts.schema.json",
    $comment: "GENERATED by `node tools/story/story.mjs build` from canon/world/*.md: the words of every fact a canon scene's beat says out loud. Never edit by hand; the Scene Runner's 'the table knows' drawer reads it.",
    facts
  };
  return JSON.stringify(doc, null, 2) + "\n";
}

/**
 * data/campaign/open-decisions.json: every open fact in canon, in the shape the Approvals Desk already reads for
 * open-questions.json ({ questions: [{ id, question, status }] }), so the Desk's "waiting on Ingram" count follows
 * canon and the timeline's Decisions view instead of a second list.
 */
export function openDecisionsFile(model) {
  const titles = new Map(model.world.map((e) => [e.id, e.title]));
  const questions = [];
  for (const e of model.world) {
    for (const f of e.facts) {
      if (f.status !== "open") continue;
      questions.push({ id: f.id, question: f.text, status: "open", about: titles.get(e.id) || e.id, candidates: f.candidates || [], decideBy: f.decideBy || null });
    }
  }
  const doc = {
    $schema: "../schema/open-decisions.schema.json",
    $comment: "GENERATED by `node tools/story/story.mjs build` from the open facts in canon/world/*.md. Never edit by hand: answer a decision on the plot timeline (Decisions view); the Approvals Desk reads this file for its count.",
    id: "open-decisions",
    questions,
  };
  return JSON.stringify(doc, null, 2) + "\n";
}

// A scene's approval covers the scene, every canon challenge, encounter and subsystem its beats use, and the words of
// every fact its beats cite (D070): changing a fact a scene relies on reopens that scene for Ingram's read.
export function sceneHash(model, sceneId) {
  const scene = model.scenes.find((s) => s.id === sceneId);
  if (!scene) return null;
  const h = crypto.createHash("sha256").update(lf(scene.raw));
  for (const [key, kind] of [["challengeRef", "challenges"], ["encounterRef", "encounters"], ["subsystemRef", "subsystems"]]) {
    const refs = [...new Set((scene.json.beats || []).map((b) => b[key]).filter(Boolean))].sort();
    for (const r of refs) { const doc = (model[kind] || []).find((c) => c.id === r); if (doc) h.update("\n--" + r + "--\n" + lf(doc.raw)); }
  }
  const cited = [...new Set((scene.json.beats || []).flatMap((b) => [...(b.facts || []), ...(b.gmFacts || [])]))].sort();
  if (cited.length) {
    const byId = factIndex(model);
    for (const id of cited) { const f = byId.get(id); if (f) h.update(`\n--fact:${id}--\n${f.text}`); }
  }
  return h.digest("hex").slice(0, 16);
}

export function factIndex(model) {
  const byId = new Map();
  for (const e of model.world) for (const f of e.facts) byId.set(f.id, f);
  return byId;
}

/**
 * Every item in canon that a decision can change or a citation can name, by id: facts, beats, chapters, threads,
 * questions, ideas and Books. Scenes are separate (model.scenes).
 */
export function itemIndex(model) {
  const byId = new Map();
  for (const e of model.world) for (const f of e.facts) byId.set(f.id, { kind: "fact", item: f, file: `canon/world/${e.id}.md` });
  for (const c of model.chapters || []) {
    byId.set(c.id, { kind: "chapter", item: c, file: `canon/${c.file}` });
    for (const b of c.beats) byId.set(b.id, { kind: "beat", item: b, file: `canon/${b.file}` });
  }
  for (const t of model.threads || []) byId.set(t.id, { kind: "thread", item: t, file: `canon/${t.file}` });
  for (const q of model.questions || []) byId.set(q.id, { kind: "question", item: q, file: `canon/${q.file}` });
  for (const i of model.ideas || []) byId.set(i.id, { kind: "idea", item: i, file: `canon/${i.file}` });
  for (const b of model.books || []) byId.set(b.id, { kind: "book", item: b, file: "canon/plan/books.md" });
  return byId;
}

/**
 * Play order across the whole campaign: each chapter in turn, its plan's scenes in the order the file lists them, then
 * its beats. `planned` is every id a `told: in:<id>` may name.
 */
export function playOrder(model) {
  const order = new Map();
  let seq = 0;
  const pad = (n) => String(n).padStart(2, "0");
  const fileChapter = (file) => Number((file.match(/^chapter-(\d+)\.md$/) || [])[1]);
  const numbers = new Set([...model.plan.map((r) => fileChapter(r.file)).filter(Number.isInteger), ...(model.chapters || []).map((c) => c.n)]);
  const rowsWithoutChapter = model.plan.filter((r) => !Number.isInteger(fileChapter(r.file)));
  for (const r of rowsWithoutChapter) if (!order.has(r.scene)) order.set(r.scene, seq++);
  for (const n of [...numbers].sort((a, b) => a - b)) {
    order.set(`chapter-${pad(n)}`, seq++);
    for (const r of model.plan.filter((x) => fileChapter(x.file) === n)) if (!order.has(r.scene)) order.set(r.scene, seq++);
    const ch = (model.chapters || []).find((c) => c.n === n);
    for (const b of ch?.beats || []) order.set(b.id, seq++);
  }
  return { order, planned: new Set(order.keys()) };
}

// Every place a fact (or any item) is relied on: scene beats (facts or gmFacts), belief links, payoffs, questions'
// answers and roads, threads' clocks, what an idea became, and decision changes.
export function citations(model) {
  const out = new Map();
  const add = (id, where) => { if (!out.has(id)) out.set(id, []); out.get(id).push(where); };
  for (const s of model.scenes) for (const b of s.json.beats || []) {
    for (const f of b.facts || []) add(f, { file: `canon/scenes/${s.file}`, at: b.id, as: "facts" });
    for (const f of b.gmFacts || []) add(f, { file: `canon/scenes/${s.file}`, at: b.id, as: "gmFacts" });
  }
  for (const o of model.objectives || []) for (const f of o.json?.facts || []) add(f, { file: `canon/objectives/${o.file}`, at: o.id, as: "objective" });
  for (const e of model.world) for (const f of e.facts) {
    if (f.truth) add(f.truth, { file: `canon/world/${e.id}.md`, at: f.id, as: "truth" });
    if (f.payoff) add(f.payoff, { file: `canon/world/${e.id}.md`, at: f.id, as: "payoff" });
  }
  for (const q of model.questions || []) {
    if (q.answer) add(q.answer, { file: `canon/${q.file}`, at: q.id, as: "answer" });
    if (q.misdirect) add(q.misdirect, { file: `canon/${q.file}`, at: q.id, as: "misdirect" });
    for (const r of q.roads) if (r.fact) add(r.fact, { file: `canon/${q.file}`, at: q.id, as: r.core ? "core road" : "road" });
  }
  for (const t of model.threads || []) for (const cl of t.clocks) for (const i of cl.items) add(i, { file: `canon/${t.file}`, at: `clock: ${cl.name}`, as: "clock" });
  for (const c of model.chapters || []) for (const b of c.beats) for (const r of b.reveals || []) add(r, { file: `canon/${b.file}`, at: b.id, as: "reveal" });
  for (const i of model.ideas || []) for (const b of i.became) add(b, { file: `canon/${i.file}`, at: i.id, as: "became" });
  for (const d of model.decisions) for (const ch of d.changes) if (ch.verb !== "approve") add(ch.target, { file: `canon/decisions/${d.file}`, at: ch.verb, as: "change" });
  return out;
}

export function checkModel(model) {
  const problems = [...(model.problems || [])];
  const err = (where, message) => problems.push({ level: "error", where, message });
  const warn = (where, message) => problems.push({ level: "warn", where, message });
  const decisions = new Map(model.decisions.map((d) => [d.id, d]));
  const sources = new Map((model.sources || []).map((s) => [s.id, s]));
  const scenes = new Map(model.scenes.map((s) => [s.id, s]));
  const facts = new Map();
  const { order, planned } = playOrder(model);
  // Her words: a decision record that isn't an import, or a source record. Only these make anything ink.
  const isAuthority = (s) => (/^D\d{3}$/.test(s) && decisions.has(s) && !["import", "merge"].includes(decisions.get(s).kind || "decision")) || (/^S\d{3}$/.test(s) && sources.has(s));
  const isSource = (s) => (/^D\d{3}$/.test(s) ? decisions.has(s) : /^S\d{3}$/.test(s) ? sources.has(s) : scenes.has(s));
  const placeOf = (told) => (told === "start" ? -1 : /^in:/.test(told || "") && order.has(told.slice(3)) ? order.get(told.slice(3)) : Infinity);

  // Decisions
  for (const d of model.decisions) {
    if (d.file !== d.id + ".md") err(`decisions/${d.file}`, `file name must be ${d.id}.md`);
    const kind = d.kind || "decision";
    if (!DECISION_KINDS.includes(kind)) err(`decisions/${d.file}`, `unknown kind "${kind}" (use: ${DECISION_KINDS.join(", ")})`);
    if (!d.split) {
      if (!["import", "merge"].includes(kind) && d.quotes === 0) err(`decisions/${d.file}`, `a new decision needs Ingram's words, quoted under "## Ingram"`);
      for (const ch of d.changes) if (!VERBS.includes(ch.verb)) err(`decisions/${d.file}`, `unknown change "${ch.verb}"`);
      if (kind === "import") for (const ch of d.changes) if (!["add", "pencil"].includes(ch.verb)) err(`decisions/${d.file}`, `an import record only brings material in as pencil; "${ch.verb} ${ch.target}" needs a decision in Ingram's words`);
      if (kind === "merge") for (const ch of d.changes) if (ch.verb !== "merge") err(`decisions/${d.file}`, `a merge record only merges pencil; "${ch.verb} ${ch.target}" needs a decision in Ingram's words`);
    }
  }

  // Cards: groups of pencil facts, which change nothing about the facts in them (cards.mjs)
  for (const e of model.world) {
    for (const m of e.cardProblems || []) err(`world/${e.id}.md → Cards`, m);
    const own = new Map(e.facts.map((f) => [f.id, f]));
    for (const p of checkCards(e.id, e.cards || [], own, (id) => resolveAlias(model.aliases, id))) problems.push({ level: p.level, where: `world/${e.id}.md → Cards`, message: p.message });
  }

  // World facts
  for (const e of model.world) {
    for (const f of e.facts) {
      const at = `world/${e.id}.md → ${f.id}`;
      if (facts.has(f.id)) err(at, "this fact id is used twice");
      facts.set(f.id, f);
      if (f.id.split(".")[0] !== e.id) err(at, `a fact's id must start with its file's id ("${e.id}.")`);
      if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(f.id)) err(at, "a fact id is entity.slug, lower case with hyphens");
      if (!STATUSES.includes(f.status)) err(at, `unknown status "${f.status}"`);
      if (!f.text) err(at, "a fact needs its text");
      if (!KNOWN.includes(f.known)) err(at, `unknown "known" value "${f.known}" (who in the world knows it: ${KNOWN.join(", ")})`);
      if (!TOLD.test(f.told || "")) err(at, `"told" must be start, later, or in:<scene id> (when the table hears it); found "${f.told}"`);
      else if (f.told.startsWith("in:") && !planned.has(f.told.slice(3))) err(at, `told in ${f.told.slice(3)}, which isn't in the plan`);
      if (f.source.length === 0) err(at, "every fact needs a source: a decision, a source record, or the scene it comes from");
      for (const s of f.source) {
        if (/^D\d{3}$/.test(s)) { if (!decisions.has(s)) err(at, `source ${s} is not a decision record`); }
        else if (/^S\d{3}$/.test(s)) { if (!sources.has(s)) err(at, `source ${s} is not a source record`); }
        else if (!scenes.has(s)) err(at, `source ${s} is not a decision, a source record, or a scene in canon`);
      }
      if (["decided", "accepted", "cut"].includes(f.status) && !f.source.some(isAuthority)) err(at, `a ${f.status} fact must cite the decision or source record that made it so (an import record is not one)`);
      if (f.status === "provisional" && !f.source.some((s) => scenes.has(s))) err(at, "a provisional fact must cite the scene it comes from");
      if (f.status === "open" && f.candidates.length === 0 && !f.decideBy) warn(at, "an open fact should list the candidate answers or say when it must be decided");
      // Pencil (D070)
      if (f.status === "sketch") {
        if (!AUTHORS.includes(f.by)) err(at, `pencil needs "by: ingram" or "by: claude"`);
        if (f.zone && f.zone !== "pencil") err(at, `pencil belongs below the file's "## Pencil" line`);
        if (f.by === "ingram" && !f.source.some(isAuthority)) err(at, `"by: ingram" must cite the decision or source record that holds her words`);
        // A canon scene tells only ink, so a pencil fact can't be scheduled for one.
        if (/^in:/.test(f.told || "") && scenes.has(f.told.slice(3))) err(at, `pencil can't be told in ${f.told.slice(3)}: a canon scene tells only ink (point it at a later plan, or ask Ingram to ink it)`);
      } else {
        if (f.by) err(at, `"by:" is only for pencil (sketch)`);
        if (f.zone === "pencil" && !["open", "cut"].includes(f.status)) err(at, `only pencil and open facts go below the "## Pencil" line; this one is ${f.status}`);
      }
      if (f.heldBy) {
        if (!TRUTH.includes(f.isTrue)) err(at, `a belief needs "true: yes | no | partly"`);
        if (f.isTrue !== "yes" && !f.truth) err(at, "a belief that isn't simply true must link to the truth");
      }
      if (f.status === "cut" && f.retire.length === 0) warn(at, "a cut fact should list the wording that must not come back (retire)");
      for (const t of f.threads || []) if (!(model.threads || []).some((x) => x.id === t)) warn(at, `thread ${t} is not in canon/threads`);
    }
  }
  for (const f of facts.values()) {
    const at = `world/${f.entity}.md → ${f.id}`;
    if (f.truth && !facts.has(f.truth)) err(at, `truth ${f.truth} does not exist`);
    if (f.payoff) {
      const p = facts.get(f.payoff);
      if (!p) err(at, `payoff ${f.payoff} is not a canon fact`);
      else if (placeOf(p.told) < placeOf(f.told)) warn(at, `pays off (${f.payoff}, told: ${p.told}) before it is planted (told: ${f.told})`);
    }
  }

  // Dates: every when reads, and anchors resolve without going round in a circle
  {
    const whens = new Map();
    for (const f of facts.values()) if (f.when) whens.set(f.id, f.when);
    for (const c of model.chapters || []) for (const b of c.beats) if (b.when) whens.set(b.id, b.when);
    for (const i of model.ideas || []) if (i.when) whens.set(i.id, i.when);
    const books = (model.books || []).length ? model.books.map((b) => ({ book: b.book, from: b.from, to: b.to })) : DEFAULT_BOOKS;
    for (const p of resolveAll(whens, { books }).problems) {
      const f = facts.get(p.id);
      err(f ? `world/${f.entity}.md → ${p.id}` : p.id, `when: ${p.message}`);
    }
  }

  // The plan
  for (const r of model.plan) {
    const at = `plan/${r.file} → ${r.scene}`;
    if (!TIMES.includes(r.time)) err(at, `unknown time "${r.time}" (use: ${TIMES.join(", ")})`);
    if (!SCENE_STATES.includes(r.state)) err(at, `unknown state "${r.state}"`);
    if (r.dayRaw !== "—" && !Number.isInteger(r.day)) err(at, `day must be a whole number or "—"`);
    if (["approved", "awaiting-read"].includes(r.state) && !scenes.has(r.scene)) err(at, `a scene marked ${r.state} must be in canon/scenes`);
    if (r.state === "old-draft" && model.oldScenes && !model.oldScenes.has(r.scene)) err(at, "no such scene brief");
  }
  // The routing in the notes (D086): each row's After/Branch/Kind parts must name real scenes, and the flow they make must not loop.
  const rowChapter = (file) => Number((file.match(/^chapter-(\d+)\.md$/) || [])[1]) || 1;
  const flow = buildPlay({ scenes: model.plan.map((r) => ({ id: r.scene, title: r.title, episode: r.episode, chapter: rowChapter(r.file), day: r.day ?? null, time: r.time, state: r.state, note: r.note || "" })), chapters: [], threads: [], entities: [], facts: [], questions: [] });
  const rowOf = new Map(model.plan.map((r) => [r.scene, r]));
  for (const p of flow.problems) err(`plan/${rowOf.get(p.id)?.file || "?"} → ${p.id}`, p.message);
  for (const r of model.plan) if (r.note && !parseSceneNote(r.note).kind) warn(`plan/${r.file} → ${r.scene}`, 'no "Kind: plot | downtime | light" in the note: the Timeline draws it as lighter');
  for (const s of model.scenes) if (!order.has(s.id)) err(`scenes/${s.file}`, "every canon scene must appear in the plan");

  // Scenes: citations, early reveals, dependencies
  for (const s of model.scenes) {
    const here = order.has(s.id) ? order.get(s.id) : Infinity;
    for (const b of s.json.beats || []) {
      const at = `scenes/${s.file} → ${b.id}`;
      for (const key of ["facts", "gmFacts"]) {
        for (const id of b[key] || []) {
          const f = facts.get(id);
          if (!f) { err(at, `cites ${id}, which is not a canon fact`); continue; }
          if (f.status === "cut") err(at, `cites ${id}, which is cut`);
          if (f.status === "sketch") err(at, `cites ${id}, which is pencil: play material never cites pencil, so ask Ingram to ink it first`);
          if (key === "facts") {
            const reveal = (f.told || "").match(/^in:(.+)$/);
            const ok = f.told === "start" || (reveal && order.has(reveal[1]) && order.get(reveal[1]) <= here);
            if (!ok) err(at, `tells the table ${id}, which the players aren't told by this scene (told: ${f.told})`);
          }
        }
      }
      for (const [k, v] of [["challengeRef", b.challengeRef], ["npcRef", b.npcRef], ["encounterRef", b.encounterRef], ["subsystemRef", b.subsystemRef], ["handoutRef", b.handoutRef]]) {
        if (!v) continue;
        if (k === "challengeRef") {
          const ch = model.challenges.find((c) => c.id === v);
          if (!ch) warn(at, `${k} ${v} is not in canon yet`);
          else if (b.checkRef && !(ch.json.checks || []).some((x) => x.id === b.checkRef)) err(at, `checkRef ${b.checkRef} is not a check in ${v}`);
        } else if (k === "encounterRef" || k === "subsystemRef") {
          const kind = k === "encounterRef" ? "encounters" : "subsystems";
          if (!(model[kind] || []).some((d) => d.id === v)) warn(at, `${k} ${v} is not in canon yet`);
        } else warn(at, `${k} ${v} is not in canon yet`);
      }
    }
    for (const c of s.json.cast || []) if (c.npcRef) warn(`scenes/${s.file}`, `cast npcRef ${c.npcRef} is not in canon yet`);
    if (s.json.intro?.position?.locationRef) warn(`scenes/${s.file}`, `locationRef ${s.json.intro.position.locationRef} is not in canon yet`);
  }

  problems.push(...checkObjectives(model, { scenes, facts, order }));
  for (const o of model.objectives || []) for (const id of o.json?.facts || []) {
    if (facts.get(id)?.status === "sketch") err(`objectives/${o.file}`, `cites ${id}, which is pencil: play material never cites pencil, so ask Ingram to ink it first`);
  }

  // The plot's own files: threads, questions, ideas, the Books and the chapters' beats
  {
    const items = itemIndex(model);
    const knownIds = new Set([...items.keys(), ...order.keys(), ...scenes.keys()]);
    const books = model.books || [];
    const nowBook = books.find((b) => NOW_CHAPTER >= b.from && NOW_CHAPTER <= b.to);
    const horizon = nowBook ? nowBook.to : DEFAULT_BOOKS[0].to;
    problems.push(...checkPlot(model, { facts, planned, order, isSource, isAuthority, entities: new Set(model.world.map((e) => e.id)), horizon, knownIds }));
  }

  // A fact scheduled for a scene that's in canon should actually be told there.
  for (const f of facts.values()) {
    const m = (f.told || "").match(/^in:(.+)$/);
    if (!m || !scenes.has(m[1])) continue;
    if (!(scenes.get(m[1]).json.beats || []).some((b) => (b.facts || []).includes(f.id))) warn(`world/${f.entity}.md → ${f.id}`, `scheduled to be told in ${m[1]}, which doesn't tell it yet`);
  }

  // Canon relies on nothing old
  const scanOld = (where, text) => {
    for (const re of OLD_PATHS) { const m = text.match(re); if (m) err(where, `points at old material ("${m[0]}"); rebuild what it needs in canon instead`); }
  };
  for (const e of model.world) scanOld(`world/${e.id}.md`, e.raw || "");
  for (const [f, raw] of Object.entries(model.planRaw || {})) scanOld(`plan/${f}`, raw);
  for (const [f, raw] of Object.entries(model.plotRaw || {})) if (!f.startsWith("plan/")) scanOld(f, raw);
  for (const s of model.scenes) scanOld(`scenes/${s.file}`, s.raw);
  for (const c of model.challenges) scanOld(`challenges/${c.file}`, c.raw);
  for (const o of model.objectives || []) scanOld(`objectives/${o.file}`, o.raw);
  for (const e of model.encounters || []) scanOld(`encounters/${e.file}`, e.raw);
  for (const s of model.subsystems || []) scanOld(`subsystems/${s.file}`, s.raw);

  // Cut wording never comes back: not from a cut fact, and not from a rejected idea
  const retired = [];
  for (const f of facts.values()) if (f.status === "cut") for (const p of f.retire) retired.push({ fact: f.id, phrase: p });
  for (const i of model.ideas || []) if (i.state === "rejected") for (const p of i.retire) retired.push({ fact: i.id, phrase: p });
  const withoutOwn = (raw) => (raw || "").split(/^##+ /m).filter((sec) => !retired.some((r) => sec.startsWith(r.fact))).join("## ");
  const texts = [
    ...model.scenes.map((s) => [`canon/scenes/${s.file}`, s.raw]),
    ...model.challenges.map((c) => [`canon/challenges/${c.file}`, c.raw]),
    ...Object.entries(model.planRaw || {}).map(([f, raw]) => [`canon/plan/${f}`, withoutOwn(raw)]),
    ...Object.entries(model.plotRaw || {}).filter(([f]) => !f.startsWith("plan/")).map(([f, raw]) => [`canon/${f}`, withoutOwn(raw)]),
    ...model.world.map((e) => [`canon/world/${e.id}.md`, withoutOwn(e.raw)]),
    ...Object.entries(model.liveText || {}),
  ];
  for (const { fact, phrase } of retired) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    for (const [where, text] of texts) if (re.test(text)) err(where, `uses "${phrase}", retired with ${fact}`);
  }

  // Built copies: data/ holds exact copies of canon scenes and challenges
  for (const [where, { source, copy }] of Object.entries(model.built || {})) {
    if (copy === null) err(where, "missing: run `node tools/story/story.mjs build`");
    else if (lf(copy) !== lf(source)) err(where, "differs from its canon source: run `node tools/story/story.mjs build`, and edit the canon copy, never this one");
  }

  // Decisions agree with the items they change, and approvals still match the scene. A status changes only by a
  // record saying so, and the latest record wins: so an edit that raises a status by hand fails here (D070).
  {
    const items = itemIndex(model);
    const latest = new Map();
    for (const d of [...model.decisions].sort((a, b) => a.id.localeCompare(b.id))) {
      for (const ch of d.changes) {
        const at = `decisions/${d.file} → ${ch.verb} ${ch.target}`;
        if (ch.verb === "approve") {
          const hash = (ch.rest.match(/hash ([0-9a-f]{16})/) || [])[1];
          if (!scenes.has(ch.target)) { err(at, "no such canon scene"); continue; }
          if (!hash) { err(at, `an approval records the scene's hash ("hash <16 hex>")`); continue; }
          const now = sceneHash(model, ch.target);
          if (now !== hash) err(at, `the scene has changed since this approval (approved ${hash}, now ${now}): it needs Ingram's read again`);
          continue;
        }
        // An older record may name an item that a later merge folded into another: follow it there.
        const target = resolveAlias(model.aliases, ch.target);
        const hit = items.get(target);
        if (!hit) { err(at, ch.target.includes(".") ? "no such fact" : "no such item"); continue; }
        if (!hit.item.source.includes(d.id)) err(at, `the ${hit.kind} should cite ${d.id} as a source`);
        let want = VERB_STATUS[ch.verb] ?? null;
        if (ch.verb === "add" && (d.kind || "decision") === "import") want = "pencil or open";
        if (want) latest.set(target, { at, want });
      }
    }
    for (const [target, { at, want }] of latest) {
      const status = items.get(target).item.status;
      const ok = want === "pencil or open" ? ["sketch", "open"].includes(status) : status === want;
      if (!ok) err(at, `expected status ${want === "pencil or open" ? "sketch or open" : want}, found ${status}${status === "decided" || status === "accepted" ? ": only a decision in Ingram's words (decide, accept) inks an item" : ""}`);
    }
    // Her timeline day records: every line quoted is one the page can read back, and nothing older comes back over
    // what she set (tools/story/daybook.mjs, the scene-edits rule applied to canon).
    for (const d of model.decisions.filter((x) => x.kind === "timeline")) {
      const quoted = (d.text.replace(/\r\n/g, "\n").split(/^## Ingram$/m)[1] || "").split(/^## /m)[0].split("\n").filter((l) => l.startsWith("> ")).length;
      const read = parseDayEdits(d.text).length;
      if (read !== quoted) err(`decisions/${d.file}`, `${quoted - read} quoted line(s) the timeline can't read back: a day record is written by the timeline page, never by hand`);
    }
    for (const r of findTimelineReversions(model, items)) {
      err(`decisions/${r.record}.md → ${r.id}`, `${r.field === "text" ? "its words" : r.field} went back to older wording ("${r.found}") over what Ingram set on the timeline ("${r.expected}"): \`node tools/story/story.mjs restore\` puts hers back`);
    }
  }
  // A scene marked approved has an approval on record
  for (const r of model.plan) {
    if (r.state !== "approved") continue;
    const ok = model.decisions.some((d) => d.changes.some((ch) => ch.verb === "approve" && ch.target === r.scene));
    if (!ok) err(`plan/${r.file} → ${r.scene}`, "marked approved, but no decision approves it");
  }
  return problems;
}

// Relative time words in a scene's text, with the plan's day and time beside them. A report for the re-read.
export const TIME_WORDS = /\b(yesterday|last night|this morning|this afternoon|this evening|tonight|tomorrow|(?:a|one|two|three|four|five|six|several) (?:days?|nights?|weeks?) ago|a fortnight ago|weeks ago|days ago)\b/gi;
export function timeReport(model, root = ROOT) {
  const out = [];
  for (const r of model.plan) {
    const canonScene = model.scenes.find((s) => s.id === r.scene);
    const p = path.join(root, "data/scene-briefs", r.scene + ".json");
    const raw = canonScene ? canonScene.raw : fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
    const hits = [...new Set((raw.match(TIME_WORDS) || []).map((w) => w.toLowerCase()))];
    out.push({ scene: r.scene, day: r.dayRaw, time: r.time, words: hits });
  }
  return out;
}

/**
 * Write the plan's day and quarter onto every episode's own scene entries (`data/episodes/*.json`), the file the
 * Scene Runner already reads to find "the next scene" (`foundry/scene-runner.mjs#advanceAfterClose`). Idempotent,
 * like `build`: a scene whose plan row hasn't changed is left untouched, byte for byte.
 *
 * A scene with no day in the plan (Scene 0 — narration before anyone is anywhere) gets neither field: nothing ever
 * closes INTO it, so it is never a target `setMoment` needs a real day for.
 */
export function syncQuarters(model, root = ROOT) {
  const byBrief = new Map(model.plan.map((r) => [r.scene, r]));
  const changed = [];
  const episodesDir = path.join(root, "data", "episodes");
  for (const file of fs.existsSync(episodesDir) ? fs.readdirSync(episodesDir).filter((f) => f.endsWith(".json")) : []) {
    const p = path.join(episodesDir, file);
    const raw = fs.readFileSync(p, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const doc = JSON.parse(raw);
    let touched = false;
    for (const entry of doc.scenes || []) {
      const row = entry.briefRef ? byBrief.get(entry.briefRef) : null;
      if (!row || row.day === null) continue;
      const quarter = quarterForTime(row.time);
      if (entry.day !== row.day || entry.quarter !== quarter) {
        entry.day = row.day;
        entry.quarter = quarter;
        touched = true;
      }
    }
    if (!touched) continue;
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    fs.writeFileSync(p, eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text);
    changed.push(`data/episodes/${file}`);
  }
  return changed;
}

export function build(model, root = ROOT) {
  const changed = [];
  for (const [where, { source, copy }] of Object.entries(model.built)) {
    if (copy !== null && lf(copy) === lf(source)) continue;
    fs.mkdirSync(path.dirname(path.join(root, where)), { recursive: true });
    fs.writeFileSync(path.join(root, where), source);
    changed.push(where);
  }
  return changed;
}
