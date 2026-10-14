// The timeline page's saves (design/plot-timeline.md §5, D070).
//
// A save is a list of operations on canon's items, each carrying what the page showed when she made it (`before`):
//
//   { op: "field",  id, field, before, value }   one field of an item ("" or null removes it); never status or by
//   { op: "text",   id, before, value }          an item's words
//   { op: "ink",    id, before, verb? }          pencil to ink: decide (her words) or accept (Claude's)
//   { op: "pencil", id, before, by? }            ink back to pencil
//   { op: "cut",    id, before, retire? }        struck, its wording retired (an idea is rejected instead)
//   { op: "park",   id }                         seen in review, left in pencil for now
//   { op: "note",   id, text }                   a note for Claude
//   { op: "mergeok", id, merge }                 a merge of Claude's looks right to her (the merged item's id, "D081#M3")
//   { op: "unmerge", id, merge }                 put a merge's originals back, exactly as they were
//
// Each operation is checked against what its file holds now, the rule of core/scene-edits.mjs#mergeRecord: merged,
// already (the file already says it), clash (it changed since she looked) or refused. A save is all or nothing: one
// clash or refusal and nothing is written. What is written goes through tools/story/edit.mjs, is quoted in her day
// record (tools/story/daybook.mjs), and is checked: a save that would add a new error to `story check` is rolled
// back whole, while errors that were already there never block her.
import fs from "node:fs";
import path from "node:path";

import { loadModel, checkModel, itemIndex, build } from "../story/lib.mjs";
import { readItem, setField, setText, addSource, ink, pencil, cut, reopen } from "../story/edit.mjs";
import { IDEA_STATES } from "../story/plot.mjs";
import { claimDayRecord, appendEdits, nextNoteId, parkedOf, allEdits } from "../story/daybook.mjs";
import { mergesOf } from "../story/merges.mjs";
import { unmergeFiles, markUndone } from "../story/merge.mjs";
import { SAVES_LOG, readSaves } from "../story/timeline-state.mjs";
import { writeFileAtomic, acquireLock } from "../scene-edits/store.mjs";

export { readSaves };
export const OPS = Object.freeze(["field", "text", "ink", "pencil", "reopen", "cut", "park", "note", "mergeok", "unmerge"]);
// Provenance and status have their own ways in: status and by through ink, pencil and cut; source and from never.
const NOT_FIELDS = new Set(["status", "by", "source", "from"]);
const MAX_OPS = 200;
const MAX_NOTE = 4000;

const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Today's date where she is: the day record is her day, not UTC's. */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const errorKeys = (problems) => new Set(problems.filter((p) => p.level === "error").map((p) => `${p.where}\n${p.message}`));

/** Check and apply every op on in-memory copies of the files. Pure apart from reading files. */
function run(root, model, items, ops, decision, date) {
  const files = new Map();
  const text = (rel) => {
    if (!files.has(rel)) files.set(rel, fs.readFileSync(path.join(root, rel), "utf8"));
    return files.get(rel);
  };
  const results = [];
  const edits = [];
  const parked = new Set(parkedOf(model));
  const noteTargets = new Set([...items.keys(), ...model.plan.map((r) => r.scene), ...model.world.map((e) => e.id), "timeline"]);
  let noteN = Number(nextNoteId(model).slice(1));
  // Her own words on an item in this same save make an ink hers (decide), whoever wrote it first.
  const wordsByHer = new Set(ops.filter((o) => o && o.op === "text").map((o) => o.id));
  const merges = new Map(mergesOf(model).map((m) => [m.ref, m]));
  const looksRight = new Set(allEdits(model).filter((e) => e.op === "mergeok").map((e) => e.merge));

  ops.forEach((op, i) => {
    const say = (result, extra = {}) => results.push({ i, op: op?.op, id: op?.id, result, ...extra });
    if (!op || typeof op !== "object" || !OPS.includes(op.op)) return say("refused", { message: `unknown operation ${JSON.stringify(op?.op)}` });
    if (typeof op.id !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(op.id)) return say("refused", { message: "an operation needs the id of what it changes" });

    if (op.op === "note") {
      const words = String(op.text ?? "").trim();
      if (!words) return say("refused", { message: "a note needs its words" });
      if (words.length > MAX_NOTE) return say("refused", { message: `a note is at most ${MAX_NOTE} characters` });
      if (!noteTargets.has(op.id)) return say("refused", { message: `no item, scene or entity ${op.id}` });
      const note = `N${noteN++}`;
      edits.push({ op: "note", note, id: op.id, text: words });
      return say("merged", { note });
    }

    if (op.op === "mergeok" || op.op === "unmerge") {
      const m = merges.get(String(op.merge));
      if (!m) return say("refused", { message: `no merge ${op.merge}` });
      if (m.kept !== op.id) return say("refused", { message: `${op.merge} made ${m.kept}, not ${op.id}` });
      if (m.state !== "live") return say(op.op === "unmerge" ? "already" : "refused", { message: `${op.merge} was undone` });
      if (op.op === "mergeok") {
        if (looksRight.has(m.ref)) return say("already");
        looksRight.add(m.ref);
        edits.push({ op: "mergeok", id: op.id, merge: m.ref });
        return say("merged");
      }
      const io = { read: (r) => text(`canon/${r}`), write: (r, t) => { files.set(`canon/${r}`, t); } };
      const out = unmergeFiles(io, m);
      if (!out.ok) return say("refused", { message: out.reason, clash: Boolean(out.clash) });
      const recordRel = `canon/decisions/${m.record}.md`;
      files.set(recordRel, markUndone(text(recordRel), m, date));
      edits.push({ op: "unmerge", id: op.id, merge: m.ref });
      return say("merged", { restored: m.absorbed });
    }

    const hit = items.get(op.id);
    if (!hit) return say("refused", { message: `no item ${op.id}` });
    const opts = { kind: hit.kind };
    const rel = hit.file;
    let cur;
    try { cur = readItem(text(rel), op.id, opts); } catch (e) { return say("refused", { message: e.message }); }
    const status = cur.meta.status;
    // `after` says what a status change left behind, so the page can undo it exactly.
    const change = (fn, edit, after = {}) => {
      try {
        files.set(rel, addSource(fn(text(rel)), op.id, decision, opts));
      } catch (e) { return say("refused", { message: e.message }); }
      edits.push(edit);
      return say("merged", after);
    };

    switch (op.op) {
      case "field": {
        const field = String(op.field || "");
        if (!/^[a-z][a-z-]*$/.test(field) || NOT_FIELDS.has(field)) return say("refused", { message: `"${field}" isn't a field the page sets` });
        const want = op.value === null || op.value === undefined ? "" : norm(op.value);
        if (/[·]/.test(want)) return say("refused", { message: 'a field may not hold "·"' });
        if (hit.kind === "idea" && field === "state" && !IDEA_STATES.includes(want)) return say("refused", { message: `an idea's state is one of ${IDEA_STATES.join(", ")}` });
        const now = norm(cur.meta[field]);
        if (now === want) return say("already");
        if (now !== norm(op.before)) return say("clash", { current: cur.meta[field] ?? null });
        return change((t) => setField(t, op.id, field, want || null, opts), { op: "field", id: op.id, field, before: cur.meta[field] ?? "", value: want }, { field, was: cur.meta[field] ?? "", value: want });
      }
      case "text": {
        const want = norm(op.value);
        if (!want) return say("refused", { message: "an item needs its words" });
        if (cur.text === want) return say("already");
        if (cur.text !== norm(op.before)) return say("clash", { current: cur.text });
        return change((t) => setText(t, op.id, want, opts), { op: "text", id: op.id, before: cur.text, value: want }, { was: cur.text, value: want });
      }
      case "ink": {
        if (hit.kind === "idea") return say("refused", { message: "an idea is never inked: adopting it turns it into facts or beats, so leave Claude a note" });
        if (status === "decided" || status === "accepted") return say("already");
        if (status !== op.before) return say("clash", { current: status });
        // An open question is settled by her answer: her words on it in this same save, and then it is hers (decided).
        if (status === "open" && !wordsByHer.has(op.id)) return say("refused", { message: `${op.id} is open: it is settled by an answer, so give the answer in the same save` });
        if (!["sketch", "proposal", "provisional", "cut", "open"].includes(status)) return say("refused", { message: `${op.id} is ${status}, so there is nothing to ink` });
        const verb = status === "open" ? "decide" : ["decide", "accept"].includes(op.verb) ? op.verb : wordsByHer.has(op.id) || cur.meta.by === "ingram" ? "decide" : "accept";
        return change((t) => ink(t, op.id, { decision, verb, world: hit.kind === "fact", kind: hit.kind }), { op: "ink", id: op.id, verb }, { status: verb === "decide" ? "decided" : "accepted", was: status, by: cur.meta.by || null });
      }
      case "pencil": {
        if (hit.kind === "idea") return say("already");
        if (status === "sketch") return say("already");
        if (status !== op.before) return say("clash", { current: status });
        if (status === "open") return say("refused", { message: `${op.id} is open: it is a question for her, neither ink nor pencil` });
        const by = ["ingram", "claude"].includes(op.by) ? op.by : status === "decided" ? "ingram" : "claude";
        return change((t) => pencil(t, op.id, { decision, by, world: hit.kind === "fact", kind: hit.kind }), { op: "pencil", id: op.id }, { status: "sketch", was: status, by });
      }
      case "reopen": {
        if (hit.kind === "idea") return say("refused", { message: "an idea has no answer to take back" });
        if (status === "open") return say("already");
        if (status !== op.before) return say("clash", { current: status });
        if (!["decided", "accepted"].includes(status)) return say("refused", { message: `${op.id} is ${status}: only an answered question is reopened` });
        return change((t) => reopen(t, op.id, { decision, world: hit.kind === "fact", kind: hit.kind }), { op: "reopen", id: op.id }, { status: "open", was: status, by: null });
      }
      case "cut": {
        const retire = (Array.isArray(op.retire) ? op.retire : String(op.retire || "").split("|")).map((s) => norm(s)).filter(Boolean);
        if (hit.kind === "idea") {
          if (cur.meta.state === "rejected") return say("already");
          if (norm(cur.meta.state) !== norm(op.before) && norm(status) !== norm(op.before)) return say("clash", { current: cur.meta.state ?? null });
          const old = cur.meta.retire || "";
          const list = [...new Set([...old.split("|").map((s) => s.trim()).filter(Boolean), ...retire])].join(" | ");
          try {
            let out = setField(text(rel), op.id, "state", "rejected", opts);
            if (list && list !== norm(old)) out = setField(out, op.id, "retire", list, opts);
            files.set(rel, addSource(out, op.id, decision, opts));
          } catch (e) { return say("refused", { message: e.message }); }
          edits.push({ op: "field", id: op.id, field: "state", before: cur.meta.state ?? "", value: "rejected" });
          if (list && list !== norm(old)) edits.push({ op: "field", id: op.id, field: "retire", before: old, value: list });
          return say("merged", { state: "rejected", stateWas: cur.meta.state ?? "", retire: list || "", retireWas: old });
        }
        if (status === "cut") return say("already");
        if (status !== op.before) return say("clash", { current: status });
        const retireNow = [...new Set([...String(cur.meta.retire || "").split("|").map((s) => s.trim()).filter(Boolean), ...retire])].join(" | ");
        return change((t) => cut(t, op.id, { decision, retire, kind: hit.kind }), { op: "cut", id: op.id, retire }, { status: "cut", was: status, by: cur.meta.by || null, retire: retireNow, retireWas: cur.meta.retire || "" });
      }
      case "park": {
        if (hit.kind === "idea") {
          if (cur.meta.state === "parked") return say("already");
          return change((t) => setField(t, op.id, "state", "parked", opts), { op: "field", id: op.id, field: "state", before: cur.meta.state ?? "", value: "parked" }, { state: "parked", stateWas: cur.meta.state ?? "" });
        }
        if (status !== "sketch") return say("refused", { message: `only pencil is parked; ${op.id} is ${status}` });
        if (parked.has(op.id)) return say("already");
        parked.add(op.id);
        edits.push({ op: "park", id: op.id });
        return say("merged");
      }
      default:
        return say("refused", { message: `unknown operation ${op.op}` });
    }
  });
  const blocked = results.filter((r) => r.result === "clash" || r.result === "refused");
  return { ok: blocked.length === 0, files, edits, results, blocked };
}

/** Add one line to the log of saves, which the pre-edit hook reads (tools/story/pre-edit.mjs). */
function logSave(root, entry) {
  const file = path.join(root, SAVES_LOG);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let seq = 1;
  try { seq = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length + 1; } catch { /* the first save */ }
  fs.appendFileSync(file, `${JSON.stringify({ seq, ...entry })}\n`);
  return seq;
}

/**
 * One save, all or nothing.
 * @returns {{ ok: boolean, record?: string|null, results: object[], files?: string[], problems?: object[], error?: string, busy?: boolean }}
 */
export function applyOps(root, ops, { now = new Date() } = {}) {
  if (!Array.isArray(ops) || ops.length === 0) return { ok: false, results: [], error: "nothing to save" };
  if (ops.length > MAX_OPS) return { ok: false, results: [], error: `at most ${MAX_OPS} changes in one save` };
  const release = acquireLock(path.join(root, "harvest", "timeline"));
  if (!release) return { ok: false, results: [], busy: true, error: "another save is running: try again in a moment" };
  try {
    const model = loadModel(root);
    const items = itemIndex(model);
    // First on paper, with a stand-in record number: a clash or a refusal costs nothing.
    const dry = run(root, model, items, ops, "D999", localDate(now));
    if (!dry.ok) return { ok: false, results: dry.results, error: "nothing was saved: " + dry.blocked.map((r) => `${r.id} ${r.result === "clash" ? "changed since you looked" : `(${r.message})`}`).join("; ") };
    if (!dry.edits.length) return { ok: true, record: null, results: dry.results, files: [] };

    const baseline = errorKeys(checkModel(model));
    const claim = claimDayRecord(root, localDate(now));
    const live = run(root, model, items, ops, claim.id, localDate(now));
    const recordRel = path.relative(root, claim.file).split(path.sep).join("/");
    const originals = new Map();
    const restore = () => {
      for (const [rel, text] of originals) {
        if (text === null) { try { fs.unlinkSync(path.join(root, rel)); } catch { /* already gone */ } }
        else writeFileAtomic(path.join(root, rel), text);
      }
    };
    if (!live.ok) {
      if (claim.created) fs.unlinkSync(claim.file);
      return { ok: false, results: live.results, error: "canon changed while saving: nothing was saved" };
    }
    let rebuilt = [];
    try {
      for (const [rel, text] of live.files) {
        const abs = path.join(root, rel);
        const old = fs.readFileSync(abs, "utf8");
        if (old === text) continue;
        originals.set(rel, old);
        writeFileAtomic(abs, text);
      }
      const recordText = fs.readFileSync(claim.file, "utf8");
      originals.set(recordRel, claim.created ? null : recordText);
      writeFileAtomic(claim.file, appendEdits(recordText, live.edits));

      // A copy in data/ that only needs `story build` (the words of a told fact, say) is brought up to date below,
      // as the auto-sync would; anything else new is a reason to keep nothing.
      const after = loadModel(root);
      const built = new Set(Object.keys(after.built || {}));
      const fresh = checkModel(after).filter((p) => p.level === "error" && !built.has(p.where) && !baseline.has(`${p.where}\n${p.message}`));
      if (fresh.length) {
        restore();
        return { ok: false, results: live.results, problems: fresh, error: "nothing was saved: it would break canon's checks" };
      }
      rebuilt = build(after, root);
    } catch (e) {
      restore();
      return { ok: false, results: live.results, error: `nothing was saved: ${e.message}` };
    }
    const files = [...originals.keys()];
    logSave(root, { at: now.toISOString(), record: claim.id, files, rebuilt });
    return { ok: true, record: claim.id, results: live.results, files, rebuilt };
  } finally {
    release();
  }
}
