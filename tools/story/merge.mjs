#!/usr/bin/env node
// The intelligent merge (design/plot-timeline.md §8 step 7; Ingram, D079 and D080): pencil items that are pieces of one
// thing become one thing, so the pencil is a manageable amount to go through.
//
//   node tools/story/merge.mjs check <proposal.json...>      say which merges would pass, and why the others would not
//   node tools/story/merge.mjs apply <proposal.json...>      make the ones that pass, in one merge record (kind: merge)
//   node tools/story/merge.mjs list                          every merge on record, live or undone
//   node tools/story/merge.mjs undo <D081#M3 | D081>         put the originals back exactly as they were
//
// A proposal is one agent's reading of one file (one entity's facts, or one topic's ideas):
//
//   { "entity": "cicada", "kind": "fact",
//     "merges": [{ "into": "cicada.the-faithful", "from": ["cicada.faithful", "cicada.faithful-believe"],
//                  "text": "...", "why": "three pieces of one description" }],
//     "notMerged": [{ "ids": ["a.x", "a.y"], "why": "same subject, but one is known by some and one by few" }],
//     "conflicts": [{ "ids": ["a.p", "a.q"], "why": "P says ...; Q says ..." }],
//     "overlaps":  [{ "ids": ["a.m", "b.n"], "why": "says the same thing from another file" }] }
//
// A proposal with "crossFile": true may take its pieces from any file (any entity's facts, any topic's ideas): the merged
// item lives in the file named by "entity" (its new id starts with it), and each original goes back to its own file on
// undo. The same rules apply, so pieces in different files merge only when they agree on who wrote them, who knows them,
// when the table is told and the rest.
//
// The rules a merge must pass (D079: pencil into pencil only; nothing lost; where two items disagree it is her call):
//   - every piece is pencil (status sketch) in the same file: never ink, never an open decision, never cut;
//   - the pieces agree on who wrote them (by), who in the world knows them (known), when the table is told (told), and
//     on payoff; their `when` is the same or only one has one; no other field (a belief's truth, candidates) is in play;
//   - her own words (by: ingram) are only ever joined as she said them, never reworded;
//   - the merged words keep every number, name and quoted phrase of the pieces, and nearly all their other words;
//   - nothing she edited or left a note on on the timeline is merged away;
//   - no scene, check or objective names a piece, and nothing but a list entry or a field names it elsewhere in canon.
// Every source and `from:` key of the pieces goes to the merged item, so the coverage proof still holds. The record
// keeps each original section, so a merge undoes exactly. The whole run is checked and rolled back if it adds an error.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT, loadModel, checkModel, build } from "./lib.mjs";
import { csv, lf } from "./format.mjs";
import { findItem, formatMeta, readItem, splitLines, joinLines } from "./edit.mjs";
import { allEdits } from "./daybook.mjs";
import { mergesOf, itemHash, MERGE_KINDS } from "./merges.mjs";
import { writeFileAtomic, acquireLock } from "../scene-edits/store.mjs";

export const MAX_WORDS = 170;
// Fields a merge knows how to combine. Anything else on a piece (a belief's truth, candidates, a retire list) is a
// reason to leave it alone.
const FACT_FIELDS = new Set(["status", "by", "source", "from", "known", "told", "when", "threads", "payoff"]);
const IDEA_FIELDS = new Set(["status", "by", "source", "from", "state", "when", "threads", "became"]);

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter(Boolean).length;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * An id as a whole token: `a.b` does not match inside `a.b-c`, `x.a.b` or an old source key like `b-char:a.b`, but does at
 * the end of a sentence.
 */
const tokenRe = (id) => new RegExp(`(?<![a-z0-9.:-])${escapeRe(id)}(?![a-z0-9-])(?!\\.[a-z0-9])`, "g");

// The fields that say where an item came from name old sources (`from: b-char:manako.voice`, `source: D071`), never
// other items: a merge never reads or rewrites them, so the coverage proof still holds.
const PROVENANCE = new Set(["from", "source"]);
const isKeyLine = (line) => /^[a-z][a-z-]*: /.test(line);
/** A line with its provenance fields blanked: only what is left can name an item. */
const mentionable = (line) => (isKeyLine(line) ? line.split(" · ").map((seg) => (PROVENANCE.has(seg.slice(0, seg.indexOf(":"))) ? "" : seg)).join(" · ") : line);
/** A line with each id in `gone` replaced by `kept`, outside its provenance fields. */
function rewriteLine(line, gone, kept) {
  const swap = (s) => gone.reduce((t, id) => t.replace(tokenRe(id), kept), s);
  if (!isKeyLine(line)) return swap(line);
  return line.split(" · ").map((seg) => (PROVENANCE.has(seg.slice(0, seg.indexOf(":"))) ? seg : swap(seg))).join(" · ");
}

// ---- the words a merge may not lose

const STOP = new Set("about after again also because been before being both could does each even ever from have here into just like made make many more most much must never only other over some such than that their them then there these they this those through very were what when where which while who whom will with would your said says nobody every anyone else".split(" "));
const stem = (w) => {
  let x = w.toLowerCase().replace(/['’]s$/, "");
  for (const suf of ["ing", "ed", "es", "s", "ly"]) if (x.length > suf.length + 3 && x.endsWith(suf)) { x = x.slice(0, -suf.length); break; }
  return x;
};
/** Content stems of a text, and the tokens a merge must keep whatever it rewords: numbers, quoted phrases, names. */
export function contentOf(text) {
  const t = String(text);
  const all = new Set();
  const must = new Set();
  const re = /[A-Za-z0-9][A-Za-z0-9'’-]*/g;
  let m;
  while ((m = re.exec(t))) {
    const w = m[0];
    const before = t.slice(0, m.index).trimEnd();
    const sentenceStart = before === "" || /[.!?:"“”]$/.test(before);
    if (/\d/.test(w)) { must.add(w.toLowerCase()); all.add(w.toLowerCase()); continue; }
    if (/^[A-Z]/.test(w) && !sentenceStart && w.length > 1) must.add(stem(w));
    if (w.length >= 4 && !STOP.has(w.toLowerCase())) all.add(stem(w));
  }
  for (const q of t.matchAll(/"([^"]{3,})"/g)) must.add(`"${norm(q[1]).toLowerCase()}"`);
  return { all, must };
}

/** What the merged words lost of the pieces: [] when nothing important. */
export function lostWords(pieces, merged) {
  const have = contentOf(merged);
  const haveText = norm(merged).toLowerCase();
  const need = { all: new Set(), must: new Set() };
  for (const p of pieces) { const c = contentOf(p); c.all.forEach((x) => need.all.add(x)); c.must.forEach((x) => need.must.add(x)); }
  const missingMust = [...need.must].filter((x) => (x.startsWith('"') ? !haveText.includes(x.slice(1, -1)) : !have.all.has(x) && !have.must.has(x) && !haveText.includes(x)));
  const missing = [...need.all].filter((x) => !have.all.has(x) && !have.must.has(x));
  const recall = need.all.size ? 1 - missing.length / need.all.size : 1;
  return { missingMust, missing, recall };
}

/** Words the merged text has that none of the pieces had: a merge adds nothing. */
export function addedWords(pieces, merged) {
  const have = new Set();
  for (const p of pieces) contentOf(p).all.forEach((x) => have.add(x));
  const m = contentOf(merged).all;
  const added = [...m].filter((x) => !have.has(x));
  return { added, share: m.size ? added.length / m.size : 0 };
}

/** Pieces that share almost nothing with the others: a sign they are not one thing. */
export function strangers(pieces) {
  const sets = pieces.map((p) => contentOf(p).all);
  const out = [];
  sets.forEach((s, i) => {
    const others = new Set(sets.filter((_, j) => j !== i).flatMap((x) => [...x]));
    const shared = [...s].filter((x) => others.has(x)).length;
    if (shared < 2) out.push(i);
  });
  return out;
}

// ---- where an id is mentioned

const walk = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
};
/** Canon's files that can mention an item (decision records are history and never rewritten), relative to canon/. */
export function mentionFiles(root) {
  const base = path.join(root, "canon");
  return walk(base).map((f) => path.relative(base, f).split(path.sep).join("/")).filter((rel) => !rel.startsWith("decisions/") && /\.(md|json)$/.test(rel));
}
const PLAY = /^(scenes|challenges|encounters|subsystems|objectives)\//;
const FIELD_LINE = /^(status|[a-z][a-z-]*): |^- /;

// ---- one merge, planned on paper

/**
 * Plan one merge against canon as loaded. Returns { ok, reasons, plan }. Nothing is written. `claimed` is the set of
 * ids already used by earlier merges in the same run.
 */
export function planMerge(ctx, proposal, m, { recordId = "D999", claimed = new Set() } = {}) {
  const reasons = [];
  const kind = proposal.kind === "idea" ? "idea" : "fact";
  const FIELDS = kind === "idea" ? IDEA_FIELDS : FACT_FIELDS;
  const fail = (msg) => { reasons.push(msg); };
  const from = Array.isArray(m.from) ? [...new Set(m.from.map(String))] : [];
  if (from.length < 2) fail("a merge takes at least two pieces (from)");
  const idRe = kind === "idea" ? /^idea--[a-z0-9-]+$/ : /^[a-z0-9-]+\.[a-z0-9-]+$/;
  const into = String(m.into || "");
  if (!idRe.test(into)) fail(`"into" must be ${kind === "idea" ? "idea--slug" : "entity.slug"} (found "${into}")`);
  const container = kind === "idea" ? ctx.ideaFiles.get(proposal.entity) : ctx.entities.get(proposal.entity);
  if (!container) { fail(`no ${kind === "idea" ? "idea file" : "entity"} "${proposal.entity}"`); return { ok: false, reasons }; }
  if (kind === "fact" && into && !into.startsWith(`${proposal.entity}.`)) fail(`"into" must start with "${proposal.entity}."`);
  // A proposal may say crossFile: its pieces then come from any entity's file, and the merged item lives in the home
  // entity (the one "into" starts with), where the table will find it.
  const cross = Boolean(proposal.crossFile);
  const pieceFiles = {};
  const pieces = [];
  for (const id of from) {
    const found = cross ? (kind === "idea" ? ctx.ideasById : ctx.factsById).get(id) : null;
    const piece = cross ? found?.fact : container.items.find((x) => x.id === id);
    if (!piece) { fail(`${id} is not ${cross ? `${kind === "idea" ? "an idea" : "a fact"} in canon` : `in ${proposal.entity}`}`); continue; }
    pieceFiles[id] = cross ? found.file : container.file;
    if (claimed.has(id)) fail(`${id} is already in another merge`);
    if (kind === "fact") {
      if (piece.status !== "sketch") fail(`${id} is ${piece.status}: only pencil is merged`);
      else if (piece.zone !== "pencil") fail(`${id} is above the file's "## Pencil" line`);
    } else {
      if (!["live", "parked"].includes(piece.state)) fail(`${id} is ${piece.state}: only a live or parked idea is merged`);
      if (piece.status !== "sketch") fail(`${id} is ${piece.status}: an idea is always pencil`);
    }
    if (ctx.touched.has(id)) fail(`${id} has an edit or a note of hers on the timeline: it is left alone`);
    const cited = (ctx.cites.get(id) || []).filter((c) => PLAY.test(c.file.replace(/^canon\//, "")));
    if (cited.length) fail(`${id} is cited by play material (${cited[0].file})`);
    pieces.push(piece);
  }
  if (reasons.length) return { ok: false, reasons };
  if (into && !from.includes(into) && ctx.allIds.has(into)) fail(`${into} already exists: name one of the pieces, or a new id`);
  if (into && !from.includes(into) && claimed.has(into)) fail(`${into} is already used by another merge`);

  const metas = pieces.map((p) => p.meta);
  for (const p of pieces) for (const k of Object.keys(p.meta)) if (!FIELDS.has(k)) fail(`${p.id} has "${k}", which a merge does not handle: leave it alone`);
  // A piece's own fields may not name another piece of the same merge (a date anchored to it, a payoff): the merged item
  // would then point at itself.
  for (const p of pieces) for (const q of from) if (q !== p.id) {
    const re = tokenRe(q);
    for (const [k, v] of Object.entries(p.meta)) if (!PROVENANCE.has(k) && re.test(String(v))) fail(`${p.id}'s ${k} names ${q}, which is in the same merge`);
  }
  const same = (key, label = key) => {
    const vals = [...new Set(metas.map((x) => x[key] ?? ""))];
    if (vals.length > 1) fail(`the pieces differ in ${label} (${vals.map((v) => v || "none").join(" / ")}): leave them apart`);
    return vals[0] || "";
  };
  const by = same("by");
  let known = "";
  let told = "";
  let payoff = "";
  let state = "";
  if (kind === "fact") { known = same("known", "who knows it"); told = same("told", "when the table is told"); payoff = same("payoff"); }
  else state = same("state");
  const whens = [...new Set(metas.map((x) => x.when).filter(Boolean))];
  if (whens.length > 1) fail(`the pieces have different dates (${whens.join(" / ")}): that is a conflict for her, not a merge`);
  if (reasons.length) return { ok: false, reasons };

  // The words
  const text = norm(m.text);
  if (!text) fail("a merged item needs its words");
  if (/^(status:|#)/.test(text)) fail('the words may not start with "status:" or a heading');
  const n = words(text);
  const sum = pieces.reduce((a, p) => a + words(p.text), 0);
  if (n > MAX_WORDS) fail(`${n} words: a merged item is at most ${MAX_WORDS}, so keep these apart or merge fewer`);
  if (n > sum * 1.15 + 8) fail(`${n} words is longer than the pieces put together (${sum})`);
  if (by === "ingram") {
    for (const p of pieces) if (!norm(text).includes(norm(p.text))) fail(`her words are only joined, never reworded: ${p.id}'s words must appear exactly as she said them`);
  } else {
    const lost = lostWords(pieces.map((p) => p.text), text);
    if (lost.missingMust.length) fail(`the merged words lose: ${lost.missingMust.join(", ")} (numbers, names and quoted phrases must stay)`);
    if (lost.recall < 0.8) fail(`the merged words keep only ${Math.round(lost.recall * 100)}% of the pieces' content; missing: ${lost.missing.slice(0, 14).join(", ")}`);
  }
  for (const r of ctx.retired) if (new RegExp(`\\b${escapeRe(r.phrase)}\\b`, "i").test(text)) fail(`uses "${r.phrase}", retired with ${r.fact}`);
  if (reasons.length) return { ok: false, reasons };

  const warnings = [];
  const extra = addedWords(pieces.map((p) => p.text), text);
  if (by !== "ingram" && extra.added.length >= 5 && extra.share >= 0.2) warnings.push(`adds words none of the pieces had (${extra.added.slice(0, 10).join(", ")}): check it says nothing new`);
  if (pieces.length > 1) for (const i of strangers(pieces.map((p) => p.text))) warnings.push(`${pieces[i].id} shares almost nothing with the other pieces: check it is the same thing`);

  // Where they are mentioned: only a list entry or a field may name a piece; prose and play material may not
  const gone = from.filter((id) => id !== into);
  const keptId = into;
  const mentions = [];
  for (const id of gone) {
    for (const hit of ctx.mentions(id, pieceFiles, pieces)) {
      if (PLAY.test(hit.file)) fail(`${id} is named by play material (canon/${hit.file}:${hit.line + 1})`);
      else if (!FIELD_LINE.test(hit.text)) fail(`${id} is named in prose at canon/${hit.file}:${hit.line + 1}: ${norm(hit.text).slice(0, 80)}`);
      else mentions.push({ ...hit, id });
    }
  }
  if (reasons.length) return { ok: false, reasons };

  // The merged item's own fields
  // pieces in the home file come first, in file order, then the others as listed
  const inHome = (p) => pieceFiles[p.id] === container.file;
  const ordered = [...pieces].sort((a, b) => (inHome(b) ? 1 : 0) - (inHome(a) ? 1 : 0) || (inHome(a) && inHome(b) ? a.line - b.line : from.indexOf(a.id) - from.indexOf(b.id)));
  const first = ordered[0];
  const meta = { ...first.meta };
  meta.status = "sketch";
  const union = (key) => {
    const out = [];
    for (const p of ordered) for (const v of csv(p.meta[key])) if (!out.includes(v)) out.push(v);
    return out;
  };
  const sources = union("source");
  if (recordId && !sources.includes(recordId)) sources.push(recordId);
  meta.source = sources.join(", ");
  for (const key of kind === "idea" ? ["from", "threads", "became"] : ["from", "threads"]) { const u = union(key); if (u.length) meta[key] = u.join(", "); else delete meta[key]; }
  if (whens.length) meta.when = whens[0];
  if (kind === "fact") { if (known) meta.known = known; if (told) meta.told = told; if (payoff) meta.payoff = payoff; }
  const metaLine = formatMeta(meta, Object.keys(first.meta));
  return {
    ok: true,
    reasons,
    warnings,
    plan: { kind, entity: proposal.entity, file: container.file, pieceFiles, kept: keptId, absorbed: from, pieces, text, metaLine, why: norm(m.why), mentions, keptWasPiece: from.includes(into), words: { before: sum, after: n } },
  };
}

// ---- reading canon once for a whole run

function makeCtx(root, model) {
  const entities = new Map(model.world.map((e) => [e.id, { file: `world/${e.id}.md`, items: e.facts }]));
  const factsById = new Map(model.world.flatMap((e) => e.facts.map((f) => [f.id, { fact: f, file: `world/${e.id}.md` }])));
  const ideasById = new Map((model.ideaFiles || []).flatMap((f) => f.ideas.map((i) => [i.id, { fact: i, file: `ideas/${f.topic}.md` }])));
  const ideaFiles = new Map((model.ideaFiles || []).map((f) => [f.topic, { file: `ideas/${f.topic}.md`, items: f.ideas }]));
  const allIds = new Set([...model.world.flatMap((e) => e.facts.map((f) => f.id)), ...(model.ideas || []).map((i) => i.id), ...(model.chapters || []).flatMap((c) => [c.id, ...c.beats.map((b) => b.id)])]);
  const touched = new Set(allEdits(model).map((e) => e.id));
  const cites = new Map();
  for (const s of model.scenes) for (const b of s.json.beats || []) for (const f of [...(b.facts || []), ...(b.gmFacts || [])]) {
    if (!cites.has(f)) cites.set(f, []);
    cites.get(f).push({ file: `canon/scenes/${s.file}` });
  }
  for (const o of model.objectives || []) for (const f of o.json?.facts || []) {
    if (!cites.has(f)) cites.set(f, []);
    cites.get(f).push({ file: `canon/objectives/${o.file}` });
  }
  const retired = [];
  for (const e of model.world) for (const f of e.facts) if (f.status === "cut") for (const p of f.retire) retired.push({ fact: f.id, phrase: p });
  for (const i of model.ideas || []) if (i.state === "rejected") for (const p of i.retire) retired.push({ fact: i.id, phrase: p });
  const files = mentionFiles(root);
  const texts = new Map();
  const read = (rel) => { if (!texts.has(rel)) texts.set(rel, lf(fs.readFileSync(path.join(root, "canon", rel), "utf8"))); return texts.get(rel); };
  // Every line that names `id` outside the pieces' own sections.
  const mentions = (id, pieceFiles, pieces) => {
    const out = [];
    const re = tokenRe(id);
    for (const rel of files) {
      const lines = read(rel).split("\n");
      const skip = new Set();
      for (const p of pieces) if (pieceFiles[p.id] === rel) { try { const at = findItem(lines, p.id); for (let i = at.start; i <= at.meta; i++) skip.add(i); } catch { /* not in this file */ } }
      lines.forEach((text, i) => { if (!skip.has(i) && re.test(mentionable(text))) out.push({ file: rel, line: i, text }); re.lastIndex = 0; });
    }
    return out;
  };
  return { entities, factsById, ideasById, ideaFiles, allIds, touched, cites, retired, mentions };
}

// ---- proposals

export function readProposal(file) {
  const p = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!p || typeof p !== "object" || typeof p.entity !== "string" || !Array.isArray(p.merges)) throw new Error(`${file}: a proposal is { "entity": "...", "merges": [...] }`);
  if (p.kind && !MERGE_KINDS.includes(p.kind)) throw new Error(`${file}: kind must be one of ${MERGE_KINDS.join(", ")}`);
  return p;
}

/** Check every merge of every proposal against canon: { merges: [{ proposal, i, into, ok, reasons, plan }] }. */
export function checkProposals(root, proposals, { recordId = "D999" } = {}) {
  const model = loadModel(root);
  const ctx = makeCtx(root, model);
  const claimed = new Set();
  const merges = [];
  for (const proposal of proposals) {
    proposal.merges.forEach((m, i) => {
      const verdict = planMerge(ctx, proposal, m, { recordId, claimed });
      if (verdict.ok) { for (const id of m.from) claimed.add(id); claimed.add(m.into); }
      merges.push({ proposal, i, into: m.into, from: m.from, ...verdict });
    });
  }
  return { model, ctx, merges };
}

// ---- changing the text

const blockOf = (lines, id) => { const at = findItem(lines, id); return { at, block: lines.slice(at.start, at.meta + 1) }; };

/** Lift a section (heading to meta line) out, with the blank lines after it. Returns where it was. */
function removeBlock(lines, id) {
  const at = findItem(lines, id);
  let cut = at.meta + 1;
  while (cut < at.end && !lines[cut].trim()) cut++;
  lines.splice(at.start, cut - at.start);
  return at.start;
}
/** The "## " sections of a file, counting from 0: which one is `id`, or -1. */
function sectionNumber(lines, id) {
  let n = -1;
  for (const l of lines) if (/^## /.test(l)) { n++; if (l.trimEnd() === `## ${id}`) return n; }
  return -1;
}
/** The line a numbered "## " section starts on, or -1 when the file has fewer. */
function sectionLine(lines, n) {
  let k = -1;
  for (let i = 0; i < lines.length; i++) if (/^## /.test(lines[i])) { k++; if (k === n) return i; }
  return -1;
}
/** In a file's "## Cards" section, the member line naming `from` becomes one line per id of `to` (none already listed). */
function retargetCard(lines, from, to) {
  const at = lines.findIndex((l) => l.trimEnd() === "## Cards");
  if (at < 0) return;
  let end = lines.findIndex((l, i) => i > at && /^## /.test(l));
  if (end < 0) end = lines.length;
  const listed = new Set(lines.slice(at, end).map((l) => (l.match(/^[-*] `?([^`\s]+)`?\s*$/) || [])[1]).filter(Boolean));
  for (let i = at + 1; i < end; i++) {
    if ((lines[i].match(/^[-*] `?([^`\s]+)`?\s*$/) || [])[1] !== from) continue;
    const add = to.filter((id) => !listed.has(id));
    lines.splice(i, 1, ...add.map((id) => `- ${id}`));
    return;
  }
}
function tidy(lines) {
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  lines.push("");
  return lines;
}
/**
 * Put a merged item at the end of a file: a fact after the "## Pencil" line (made if the file has none), an idea simply
 * at the end of its topic's list.
 */
function appendBlock(lines, block, { pencil = true } = {}) {
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (pencil && !lines.some((l) => l.trimEnd() === "## Pencil")) lines.push("", "## Pencil");
  lines.push("", ...block, "");
}

/**
 * Do one planned merge on the files' text, and the mentions elsewhere. `files` is Map(rel -> text); returns the record
 * entry. The pieces may be in several files (a merge across files); the merged item goes where the first piece in its
 * home file was, or at the end of the home file's pencil if none was there.
 */
function doMerge(files, plan, root) {
  const home = plan.file;
  const get = (r) => { if (!files.has(r)) files.set(r, fs.readFileSync(path.join(root, "canon", r), "utf8")); return files.get(r); };
  const fileOf = (id) => plan.pieceFiles?.[id] || home;
  const byFile = new Map();
  for (const id of plan.absorbed) { const f = fileOf(id); if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(id); }
  if (!byFile.has(home)) byFile.set(home, []);
  const was = [];
  const mergedBlock = [`## ${plan.kept}`, plan.text, plan.metaLine, ""];
  for (const [rel, ids] of byFile) {
    const { eol, lines } = splitLines(get(rel));
    for (const id of ids) {
      const { at, block } = blockOf(lines, id);
      let end = at.meta + 1;
      while (end < at.end && !lines[end].trim()) end++;
      was.push({ id, file: rel, idx: sectionNumber(lines, id), blanks: end - (at.meta + 1), block: block.join("\n") });
    }
    const firstAt = ids.length ? Math.min(...ids.map((id) => findItem(lines, id).start)) : -1;
    for (const id of [...ids].sort((a, b) => findItem(lines, b).start - findItem(lines, a).start)) removeBlock(lines, id);
    if (rel === home) {
      if (firstAt >= 0) { lines.splice(Math.min(firstAt, lines.length), 0, ...mergedBlock); tidy(lines); }
      else appendBlock(lines, mergedBlock.slice(0, 3), { pencil: plan.kind !== "idea" });
    } else if (ids.length) tidy(lines);
    files.set(rel, joinLines(lines, eol));
  }
  was.sort((a, b) => plan.absorbed.indexOf(a.id) - plan.absorbed.indexOf(b.id));
  const after = itemHash(plan.text, plan.metaLine);
  // mentions elsewhere: a field or a list entry names the kept item now
  const refs = [];
  const gone = plan.absorbed.filter((id) => id !== plan.kept);
  const touchedFiles = [...new Set(plan.mentions.map((x) => x.file))];
  for (const r of touchedFiles) {
    const sp = splitLines(get(r));
    const edited = [];
    sp.lines.forEach((text, i) => {
      const next = rewriteLine(text, gone, plan.kept);
      if (next !== text) edited.push({ i, before: text, after: next });
    });
    // a list entry that now repeats an earlier one in its section is dropped instead
    const after = sp.lines.map((text, i) => edited.find((x) => x.i === i)?.after ?? text);
    const dropped = new Set();
    for (const e of edited) {
      if (!/^- /.test(e.after)) continue;
      let start = e.i;
      while (start > 0 && !/^#{1,3} /.test(sp.lines[start])) start--;
      for (let j = start + 1; j < e.i; j++) if (!dropped.has(j) && after[j] === e.after) { dropped.add(e.i); break; }
    }
    const out = [];
    sp.lines.forEach((text, i) => {
      const e = edited.find((x) => x.i === i);
      if (!e) { out.push(text); return; }
      if (dropped.has(i)) { refs.push({ file: r, line: i, before: e.before, after: null }); return; }
      refs.push({ file: r, line: i, before: e.before, after: e.after });
      out.push(e.after);
    });
    files.set(r, joinLines(out, sp.eol));
  }
  return { was, refs, after };
}

// ---- the record

const nowIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The next free D number, claimed by creating the file exclusively, so a chat session cannot take the same one. */
export function claimRecordNumber(root) {
  const dir = path.join(root, "canon", "decisions");
  fs.mkdirSync(dir, { recursive: true });
  let n = 1;
  for (const f of fs.readdirSync(dir)) { const m = f.match(/^D(\d{3})\.md$/); if (m) n = Math.max(n, Number(m[1]) + 1); }
  for (let tries = 0; tries < 50; tries++, n++) {
    const id = `D${String(n).padStart(3, "0")}`;
    const file = path.join(dir, `${id}.md`);
    try { fs.closeSync(fs.openSync(file, "wx")); return { id, file }; } catch (e) { if (e.code !== "EEXIST") throw e; }
  }
  throw new Error("could not claim a decision number");
}

function recordText({ id, date, title, asked, summary, entries, notMerged, conflicts, overlaps }) {
  const L = [];
  L.push(`# ${id} · ${date} · ${title}`, "kind: merge", "", `asked: ${asked} Claude's record: none of it is her words, and it is never authority for ink. Each merge can be undone from the timeline page (a merged item's inspector) or with \`node tools/story/merge.mjs undo ${id}#M1\`; the originals are kept below exactly as they were.`, "");
  L.push("## What was merged", "", ...summary, "");
  L.push("## Merges", "");
  for (const e of entries) {
    L.push(`### M${e.no} · ${e.plan.kept}`);
    L.push(`why: ${e.plan.why || "pieces of one thing"}`, `kind: ${e.plan.kind}`, `file: ${e.plan.file}`, `kept: ${e.plan.kept}`, `absorbed: ${e.plan.absorbed.join(", ")}`, "state: live", `after: ${e.after}`, "");
    for (const w of e.was) L.push(`\`\`\`was ${w.id} ${w.idx} ${w.blanks} ${w.file}`, ...w.block.split("\n"), "```", "");
    if (e.refs.length) L.push("```refs", ...e.refs.map((r) => JSON.stringify(r)), "```", "");
  }
  const section = (name, items) => { if (items.length) L.push(`## ${name}`, "", ...items.flatMap((x) => [`- ${x}`, ""])); };
  section("Not merged", notMerged);
  section("Conflicts", conflicts);
  section("Possible overlaps across files", overlaps);
  L.push("## Changes", "", ...entries.map((e) => `- merge \`${e.plan.kept}\` ← ${e.plan.absorbed.filter((x) => x !== e.plan.kept).join(", ")}`), "");
  return L.join("\n");
}

const errorKeys = (problems) => new Set(problems.filter((p) => p.level === "error").map((p) => `${p.where}\n${p.message}`));

/** The merges a set of new check errors point at: by the ids they name, or (failing that) the file they are in. */
function implicated(pending, fresh) {
  const out = new Set();
  for (const p of fresh) {
    const ids = new Set(`${p.where} ${p.message}`.match(/[a-z0-9-]+\.[a-z0-9-]+|beat--[a-z0-9-]+|idea--[a-z0-9-]+/g) || []);
    const quoted = [...String(p.message).matchAll(/"([^"]{3,})"/g)].map((q) => q[1].toLowerCase());
    for (const m of pending) if (ids.has(m.plan.kept) || m.plan.absorbed.some((id) => ids.has(id)) || m.plan.mentions.some((x) => ids.has(x.id))) out.add(m);
    for (const m of pending) if (quoted.some((q) => m.plan.text.toLowerCase().includes(q))) out.add(m);
  }
  return out;
}

/**
 * Make every merge that passes, in one record. Nothing else changes. The run is checked afterwards: a merge that would
 * add an error to `story check` is dropped (and reported) and the rest are made again; if the errors can't be traced to
 * a merge, nothing is changed at all.
 * @returns {{ ok: boolean, record?: string, applied: object[], rejected: object[], before?: number, after?: number, error?: string }}
 */
export function applyProposals(root, proposals, { now = new Date(), title = "The first merge: pieces of one thing become one thing", asked = 'Ingram, 2026-10-07 (D080): "begin the \'Great Merging\'".' } = {}) {
  const release = acquireLock(path.join(root, "harvest", "timeline"));
  if (!release) return { ok: false, applied: [], rejected: [], error: "another save is running: try again in a moment" };
  let originals = new Map();
  let claim = null;
  const restoreFiles = () => {
    for (const [rel, text] of originals) { if (text === null) { try { fs.unlinkSync(path.join(root, rel)); } catch { /* gone */ } } else writeFileAtomic(path.join(root, rel), text); }
    originals = new Map();
  };
  const dropClaim = () => { if (claim) { try { fs.unlinkSync(claim.file); } catch { /* gone */ } claim = null; } };
  try {
    const baselineModel = loadModel(root);
    const baseline = errorKeys(checkModel(baselineModel));
    const before = baselineModel.world.reduce((n, e) => n + e.facts.length, 0);
    claim = claimRecordNumber(root);
    const { merges } = checkProposals(root, proposals, { recordId: claim.id });
    const rejected = merges.filter((m) => !m.ok).map((m) => ({ entity: m.proposal.entity, into: m.into, from: m.from, reasons: m.reasons }));
    let pending = merges.filter((m) => m.ok);
    if (!pending.length) { dropClaim(); return { ok: false, applied: [], rejected, error: "no merge passed" }; }
    for (let round = 0; round < 8; round++) {
      const files = new Map();
      const entries = [];
      pending.forEach((m, i) => { entries.push({ no: i + 1, plan: m.plan, ...doMerge(files, m.plan, root) }); });
      for (const [rel, text] of files) {
        const abs = path.join(root, "canon", rel);
        const old = fs.readFileSync(abs, "utf8");
        if (old === text) continue;
        originals.set(`canon/${rel}`, old);
        writeFileAtomic(abs, text);
      }
      const byEntity = new Map();
      for (const e of entries) byEntity.set(e.plan.entity, (byEntity.get(e.plan.entity) || 0) + e.plan.absorbed.length - 1);
      const notMerged = proposals.flatMap((p) => (p.notMerged || []).map((x) => `**${p.entity}** (${(x.ids || []).join(", ")}): ${norm(x.why)}`));
      const conflicts = proposals.flatMap((p) => (p.conflicts || []).map((x) => `**${p.entity}** (${(x.ids || []).join(", ")}): ${norm(x.why)}`));
      const overlaps = proposals.flatMap((p) => (p.overlaps || []).map((x) => `**${p.entity}** (${(x.ids || []).join(", ")}): ${norm(x.why)}`));
      const fewer = entries.reduce((n, e) => n + e.plan.absorbed.length - 1, 0);
      const refusedAll = [...rejected, ...merges.filter((m) => m.dropped).map((m) => ({ into: m.into }))];
      const summary = [
        `${entries.length} merges across ${byEntity.size} files took ${entries.reduce((n, e) => n + e.plan.absorbed.length, 0)} pencil items down to ${entries.length}: ${fewer} fewer to go through.`,
        ...(refusedAll.length ? [`${refusedAll.length} proposed merge${refusedAll.length === 1 ? " was" : "s were"} refused by the rules and left as they were.`] : []),
        "",
        "Per file: " + [...byEntity].map(([k, v]) => `${k} −${v}`).join(", ") + ".",
      ];
      const recordBody = recordText({ id: claim.id, date: nowIso(now), title, asked, summary, entries, notMerged, conflicts, overlaps });
      originals.set(`canon/decisions/${claim.id}.md`, fs.readFileSync(claim.file, "utf8"));
      writeFileAtomic(claim.file, recordBody);
      const after = loadModel(root);
      const built = new Set(Object.keys(after.built || {}));
      const fresh = checkModel(after).filter((p) => p.level === "error" && !built.has(p.where) && !baseline.has(`${p.where}\n${p.message}`));
      if (!fresh.length) {
        build(after, root);
        return {
          ok: true,
          record: claim.id,
          applied: entries.map((e) => ({ ref: `${claim.id}#M${e.no}`, entity: e.plan.entity, kept: e.plan.kept, absorbed: e.plan.absorbed, words: e.plan.words, warnings: pending[e.no - 1].warnings || [] })),
          rejected,
          before,
          after: after.world.reduce((n, e) => n + e.facts.length, 0),
        };
      }
      // Something new is wrong: put every file back, set aside the merges the errors name, and make the rest again.
      restoreFiles();
      const bad = implicated(pending, fresh);
      if (!bad.size) { dropClaim(); return { ok: false, applied: [], rejected, problems: fresh, error: "nothing was merged: it would break canon's checks" }; }
      for (const m of bad) {
        m.dropped = true;
        rejected.push({ entity: m.proposal.entity, into: m.into, from: m.from, reasons: [`it would add a check error: ${fresh.find((p) => `${p.where} ${p.message}`.includes(m.plan.kept) || m.plan.absorbed.some((id) => `${p.where} ${p.message}`.includes(id)))?.message || fresh[0].message}`] });
      }
      pending = pending.filter((m) => !bad.has(m));
      if (!pending.length) { dropClaim(); return { ok: false, applied: [], rejected, error: "no merge passed the checks" }; }
    }
    restoreFiles();
    dropClaim();
    return { ok: false, applied: [], rejected, error: "nothing was merged: the checks kept finding new errors" };
  } catch (e) {
    restoreFiles();
    dropClaim();
    return { ok: false, applied: [], rejected: [], error: `nothing was merged: ${e.message}` };
  } finally {
    release();
  }
}

// ---- undoing

/** The merged item as the file holds it now: its hash, or null if it is not there. */
export function currentHash(raw, id, kind = "fact") {
  try { const it = readItem(raw, id, { kind: kind === "idea" ? "idea" : "fact" }); return itemHash(it.text, formatMeta(it.meta, Object.keys(it.meta))); } catch { return null; }
}

/** Reading and writing canon's files by their path under canon/, for unmergeFiles: over a Map of texts. */
export const mapIo = (files, root) => ({
  read: (r) => { if (!files.has(r)) files.set(r, fs.readFileSync(path.join(root, "canon", r), "utf8")); return files.get(r); },
  write: (r, text) => { files.set(r, text); },
});

/**
 * Put one merge's originals back, in the text of the files (`io` reads and writes them: mapIo, or the timeline save's own
 * copies). Each goes back to the file it came from, where it was. Returns { ok, restored } or { ok: false, reason,
 * clash? }. A refusal leaves every file as it was.
 */
export function unmergeFiles(io, merge) {
  const get = io.read;
  const set = io.write;
  if (merge.state !== "live") return { ok: false, reason: `${merge.ref} is already undone` };
  const now = currentHash(get(merge.file), merge.kept, merge.kind);
  if (!now) return { ok: false, reason: `${merge.kept} is not in ${merge.file} any more (a later merge or an edit moved it)` };
  if (merge.after && now !== merge.after) return { ok: false, clash: true, reason: `${merge.kept} has been edited since it was merged: its parts are kept in ${merge.record}.md if you want them back by hand` };
  const fileOf = (id) => merge.wasAt?.get(id)?.file || merge.file;
  // nothing is written until everything has worked: the new text of every file waits here
  const out = new Map();
  const text = (r) => (out.has(r) ? out.get(r) : get(r));
  for (const id of merge.absorbed) if (id !== merge.kept && splitLines(text(fileOf(id))).lines.some((l) => l.trimEnd() === `## ${id}`)) return { ok: false, reason: `${id} exists again: the merge cannot be undone cleanly` };
  // the mentions first
  for (const r of [...new Set(merge.refs.map((x) => x.file))]) {
    const sp = splitLines(text(r));
    const mine = merge.refs.filter((x) => x.file === r);
    const drops = mine.filter((y) => y.after === null).map((y) => y.line);
    const used = new Set();
    for (const x of mine.filter((y) => y.after !== null)) {
      // the line sits where it was, less the dropped lines above it
      const hint = x.line - drops.filter((d) => d < x.line).length;
      let at = sp.lines[hint] === x.after && !used.has(hint) ? hint : -1;
      for (let k = 0; at < 0 && k < sp.lines.length; k++) if (sp.lines[k] === x.after && !used.has(k)) at = k;
      if (at < 0) return { ok: false, clash: true, reason: `a line in canon/${r} that this merge rewrote has changed since: ${norm(x.after).slice(0, 80)}` };
      used.add(at);
      sp.lines[at] = x.before;
    }
    for (const x of mine.filter((y) => y.after === null).sort((a, b) => a.line - b.line)) sp.lines.splice(Math.min(x.line, sp.lines.length), 0, x.before);
    out.set(r, joinLines(sp.lines, sp.eol));
  }
  // the pieces: the merged item comes out of its home file, and each original goes back into its own
  const pieces = [];
  for (const id of merge.absorbed) {
    const b = merge.was.get(id);
    if (!b) return { ok: false, reason: `the record has no copy of ${id}` };
    const where = merge.wasAt?.get(id) || { idx: null, blanks: 1 };
    pieces.push({ id, block: b.split("\n"), idx: where.idx, blanks: where.blanks, file: fileOf(id) });
  }
  const files = [...new Set([merge.file, ...pieces.map((p) => p.file)])];
  for (const rel of files) {
    const { eol, lines } = splitLines(text(rel));
    let at = 0;
    if (rel === merge.file) at = removeBlock(lines, merge.kept);
    const mine = pieces.filter((p) => p.file === rel);
    // Each goes back where it was: by its section number, lowest first, so every later one finds its place already made.
    // (An old record without numbers puts the pieces together, where the merged item was.)
    if (mine.every((p) => Number.isInteger(p.idx))) {
      for (const p of [...mine].sort((a, b) => a.idx - b.idx)) {
        const line = sectionLine(lines, p.idx);
        const block = [...p.block, ...Array(p.blanks).fill("")];
        if (line >= 0) lines.splice(line, 0, ...block);
        else { while (lines.length && !lines[lines.length - 1].trim()) lines.pop(); lines.push("", ...block); }
      }
      if (!lines.length || lines[lines.length - 1] !== "") lines.push("");
    } else {
      lines.splice(Math.min(at, lines.length), 0, ...mine.flatMap((p) => [...p.block, ""]));
      tidy(lines);
    }
    // A card that named the merged item names the pieces that took its place (a card is only a group; it holds ids).
    if (rel === merge.file && !merge.absorbed.includes(merge.kept)) retargetCard(lines, merge.kept, mine.map((p) => p.id));
    out.set(rel, joinLines(lines, eol));
  }
  for (const [r, t] of out) set(r, t);
  return { ok: true, restored: merge.absorbed };
}

/** Mark a merge undone in its record and take its line out of the Changes. */
export function markUndone(raw, merge, date) {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let fence = false;
  const i = lines.findIndex((l) => { if (/^```/.test(l)) fence = !fence; return !fence && l.startsWith(`### M${merge.no} · `); });
  if (i < 0) throw new Error(`${merge.record} has no merge M${merge.no}`);
  for (let j = i + 1; j < lines.length && !/^#{2,3} /.test(lines[j]); j++) {
    if (lines[j].startsWith("state: ")) { lines[j] = "state: undone"; lines.splice(j + 1, 0, `undone: ${date}`); break; }
  }
  const out = lines.filter((l) => !l.startsWith(`- merge \`${merge.kept}\` ←`));
  return out.join("\n").split("\n").join(eol);
}

/**
 * Undo one merge (`D081#M3`) or every live merge of a record (`D081`), the latest first, exactly as the originals were.
 * A merge whose item she has edited since is not undone (the page says so and shows the parts).
 */
export function undoMerges(root, ref, { now = new Date() } = {}) {
  const release = acquireLock(path.join(root, "harvest", "timeline"));
  if (!release) return { ok: false, error: "another save is running: try again in a moment", undone: [] };
  const originals = new Map();
  const restore = () => { for (const [rel, text] of originals) writeFileAtomic(path.join(root, rel), text); };
  try {
    const model = loadModel(root);
    const baseline = errorKeys(checkModel(model));
    const all = mergesOf(model);
    const [rec, no] = String(ref).split("#M");
    const chosen = all.filter((m) => m.record === rec && (no === undefined || m.no === Number(no)) && m.state === "live").sort((a, b) => b.no - a.no);
    if (!chosen.length) return { ok: false, error: `no live merge ${ref}`, undone: [] };
    const files = new Map();
    const io = mapIo(files, root);
    const undone = [];
    const refused = [];
    for (const m of chosen) {
      const r = unmergeFiles(io, m);
      if (r.ok) undone.push(m); else refused.push({ ref: m.ref, reason: r.reason, clash: Boolean(r.clash) });
    }
    if (!undone.length) return { ok: false, error: refused.map((x) => `${x.ref}: ${x.reason}`).join("; "), refused, undone: [] };
    for (const [rel, text] of files) {
      const abs = path.join(root, "canon", rel);
      const old = fs.readFileSync(abs, "utf8");
      if (old !== text) { originals.set(`canon/${rel}`, old); writeFileAtomic(abs, text); }
    }
    const recFile = path.join(root, "canon", "decisions", `${rec}.md`);
    let recText = fs.readFileSync(recFile, "utf8");
    originals.set(`canon/decisions/${rec}.md`, recText);
    for (const m of undone) recText = markUndone(recText, m, nowIso(now));
    writeFileAtomic(recFile, recText);
    const after = loadModel(root);
    const built = new Set(Object.keys(after.built || {}));
    const fresh = checkModel(after).filter((p) => p.level === "error" && !built.has(p.where) && !baseline.has(`${p.where}\n${p.message}`));
    if (fresh.length) { restore(); return { ok: false, problems: fresh, error: "nothing was undone: it would break canon's checks", undone: [] }; }
    build(after, root);
    return { ok: true, undone: undone.map((m) => ({ ref: m.ref, kept: m.kept, restored: m.absorbed })), refused };
  } catch (e) {
    restore();
    return { ok: false, error: `nothing was undone: ${e.message}`, undone: [] };
  } finally {
    release();
  }
}

// ---- the command line

function main(argv) {
  const [cmd, ...rest] = argv;
  // --root <dir> works on a scratch copy of canon (a sandbox, a test), never the real one.
  const rootArg = argValue(argv, "--root");
  const root = rootArg ? path.resolve(rootArg) : ROOT;
  if (cmd === "check" || cmd === "apply") {
    const files = rest.filter((a, i) => !a.startsWith("--") && !["--root", "--title"].includes(rest[i - 1]));
    if (!files.length) { console.error(`usage: merge.mjs ${cmd} <proposal.json...>`); process.exit(2); }
    const proposals = files.map(readProposal);
    if (cmd === "check") {
      const { merges } = checkProposals(root, proposals);
      let ok = 0;
      for (const m of merges) {
        const head = `${m.proposal.entity} · ${m.into} ← ${(m.from || []).length} pieces`;
        if (m.ok) { ok++; console.log(`ok       ${head}  (${m.plan.words.before} → ${m.plan.words.after} words)`); for (const w of m.warnings || []) console.log(`           ? ${w}`); }
        else { console.log(`REFUSED  ${head}`); for (const r of m.reasons) console.log(`           - ${r}`); }
      }
      const pieces = merges.filter((m) => m.ok).reduce((n, m) => n + m.plan.absorbed.length, 0);
      console.log(`\n${ok} of ${merges.length} merges pass: ${pieces} items become ${ok} (${pieces - ok} fewer).`);
      process.exit(ok === merges.length ? 0 : 1);
    }
    const r = applyProposals(root, proposals, { title: argValue(rest, "--title") || undefined });
    if (!r.ok) { console.error(r.error); for (const x of r.rejected || []) console.error(` refused ${x.into}: ${x.reasons.join("; ")}`); for (const p of r.problems || []) console.error(` ${p.where}: ${p.message}`); process.exit(1); }
    console.log(`${r.record}: ${r.applied.length} merges; pencil and open facts ${r.before} → ${r.after}.`);
    for (const x of r.rejected) console.log(` refused ${x.into}: ${x.reasons.join("; ")}`);
    return;
  }
  if (cmd === "list") {
    for (const m of mergesOf(loadModel(root))) console.log(`${m.ref}  ${m.state === "live" ? "live  " : "undone"}  ${m.kept} ← ${m.absorbed.filter((x) => x !== m.kept).join(", ")}`);
    return;
  }
  if (cmd === "undo") {
    if (!rest[0]) { console.error("usage: merge.mjs undo <D081#M3 | D081>"); process.exit(2); }
    const r = undoMerges(root, rest[0]);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    for (const u of r.undone) console.log(`undone ${u.ref}: ${u.restored.join(", ")} are back`);
    for (const x of r.refused || []) console.log(`left ${x.ref}: ${x.reason}`);
    return;
  }
  console.error("usage: merge.mjs check|apply <proposal.json...> | list | undo <D081#M3 | D081>");
  process.exit(2);
}
const argValue = (args, name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main(process.argv.slice(2));
