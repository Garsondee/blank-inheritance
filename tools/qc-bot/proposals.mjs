/**
 * A QC report: its shape, and the checks the bot runs on its own work before it pushes.
 *
 * A report is one JSON file per review of one scene (reviews/qc/reports/<scene>/<date>-<n>.json). The bot writes the
 * words (the overview and, for each proposal, what it is, why, what else it touches, what the bot would do and the
 * decision it needs from Ingram), and the patch that makes the change. This file decides whether that report is fit
 * to hand over. Every rule here exists to protect Ingram's time or her words:
 *
 *  - at most five proposals that change play material, so a report can be read in one sitting;
 *  - every patch must apply cleanly to the files as they are now, and each proposal must apply on its own, so she can
 *    accept any subset;
 *  - no patch may move the scene's direction (anchors.mjs), take a route away, or touch anything outside the bot's
 *    write surface (lib.mjs);
 *  - two proposals may not edit the same part, so one cannot be accepted and quietly break another;
 *  - a proposal she already declined is not raised again, unless it says how it differs (`revisits` + `revisitReason`);
 *  - a change to an approved scene must say that accepting it reopens the approval.
 *
 * Pure of git and the network: it reads the repo's files and returns problems.
 */
import { anchorViolations, describeViolation } from "./anchors.mjs";
import { applyOps, opProblem, pathText, pathsOverlap } from "./patch.mjs";
import { REPORTS_DIR, canonSourceOf, kindOfFile, readJsonIf, sha, stable, writeProblem } from "./lib.mjs";
import { declinedFingerprints, listReports } from "./decisions.mjs";

export const REPORT_KIND = "qc-report";
export const REPORT_VERSION = 1;
export const PROPOSAL_KINDS = Object.freeze(["route", "result", "prose", "npc", "housekeeping", "question", "note"]);
/** These carry a patch. A question is a decision only Ingram can make, and a note is something the bot noticed: neither changes a file. */
export const PATCH_KINDS = new Set(["route", "result", "prose", "npc", "housekeeping"]);
/** These change what is played, so they are the ones counted against the limit of five. */
export const CAPPED_KINDS = new Set(["route", "result", "prose", "npc"]);
export const MAX_CAPPED = 5;
export const MAX_TOTAL = 8;
export const TEXT_FIELDS = Object.freeze(["now", "change", "why", "touches", "risk", "recommendation", "decisionAsk"]);

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Scene ids may carry a double hyphen (episode-c1e1--kit-issue, rest--bathhouse).
const REPORT_ID = /^qc-([a-z0-9]+(?:-{1,2}[a-z0-9]+)*)-(\d{4}-\d{2}-\d{2})-(\d+)$/;
const filled = (s) => typeof s === "string" && s.trim().length > 0;

/** Where a report lives, from its id: qc-<scene>-<date>-<n> -> reviews/qc/reports/<scene>/<date>-<n>.json. */
export function reportPath(reportId) {
  const m = REPORT_ID.exec(reportId ?? "");
  return m ? `${REPORTS_DIR}/${m[1]}/${m[2]}-${m[3]}.json` : null;
}

/** What a proposal is about, independent of how it is worded: its kind, the parts it touches and what they said. */
export function proposalFingerprint(p) {
  const targets = (p.ops ?? []).map((o) => {
    let where = "";
    try {
      where = o.op === "create" ? o.file : `${o.file}::${pathText(o.path)}`;
    } catch {
      where = `${o.file}::?`;
    }
    const was = o.op === "set" ? o.before : o.op === "remove" ? (o.itemId ?? o.item) : o.op === "insert" ? null : null;
    return [o.op, where, was ?? null];
  });
  return sha(stable({ kind: p.kind, targets, title: targets.length ? null : String(p.title ?? "").trim().toLowerCase() }));
}

/** A copy of the report with the fields the tool computes filled in: each proposal's fingerprint, and the scene's hash if the bot left it out. */
export function finalizeReport(report, { hash } = {}) {
  const out = JSON.parse(JSON.stringify(report));
  if (!out.sceneHash && hash) out.sceneHash = hash;
  for (const p of out.proposals ?? []) p.fingerprint = proposalFingerprint(p);
  return out;
}

/**
 * @param {object} report
 * @param {{ root: string, applyCheck?: boolean, planState?: string|null, declined?: Set<string>, otherIds?: Set<string>, file?: string }} opts
 *   applyCheck: also apply every patch to the files as they are now. Off for a report already merged, whose patches are in place.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function lintReport(report, { root, applyCheck = true, planState = null, declined = declinedFingerprints(root), otherIds = null, file = null } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!report || typeof report !== "object") return { errors: ["the report is not a JSON object"], warnings };
  if (report.kind !== REPORT_KIND) err(`kind must be "${REPORT_KIND}"`);
  if (report.version !== REPORT_VERSION) err(`version must be ${REPORT_VERSION}`);
  const idMatch = REPORT_ID.exec(report.id ?? "");
  if (!idMatch) err(`id must look like qc-<scene>-<YYYY-MM-DD>-<n> (got ${JSON.stringify(report.id)})`);
  else if (idMatch[1] !== report.scene) err(`id says the scene is ${idMatch[1]} but scene is ${report.scene}`);
  if (file && report.id && reportPath(report.id) !== file) err(`this report belongs at ${reportPath(report.id)}, not ${file}`);
  if (!filled(report.scene) || !readJsonIf(root, `canon/scenes/${report.scene}.json`)) err(`scene ${JSON.stringify(report.scene)} is not a canon scene`);
  for (const k of ["title", "model", "generatedAt"]) if (!filled(report[k])) err(`${k} is required`);
  if (filled(report.generatedAt) && Number.isNaN(Date.parse(report.generatedAt))) err("generatedAt is not a date");
  if (!filled(report.sceneHash)) err("sceneHash is required (run `qc lint --write` to fill it in)");

  const ov = report.overview ?? {};
  for (const k of ["why", "walkthrough", "leadsTo"]) {
    if (!filled(ov[k])) err(`overview.${k} is required: it is how Ingram learns what the scene does before she reads a single proposal`);
    else if (ov[k].length > 1600) warn(`overview.${k} is ${ov[k].length} characters: shorter is easier to read`);
  }

  const proposals = Array.isArray(report.proposals) ? report.proposals : [];
  if (!Array.isArray(report.proposals)) err("proposals must be a list (it may be empty: a scene can be fine as it is)");
  const capped = proposals.filter((p) => CAPPED_KINDS.has(p.kind)).length;
  if (capped > MAX_CAPPED) err(`${capped} proposals change play material; the limit is ${MAX_CAPPED} so a report can be read in one sitting`);
  if (proposals.length > MAX_TOTAL) err(`${proposals.length} proposals in all; the limit is ${MAX_TOTAL}`);

  const seen = new Set();
  const ranks = new Set();
  const opsByProposal = [];
  for (const p of proposals) {
    const at = `proposal ${p?.id ?? "(no id)"}`;
    if (!p || !ID.test(p.id ?? "")) {
      err(`${at}: id must be lowercase words joined by hyphens`);
      continue;
    }
    if (seen.has(p.id)) err(`${at}: id used twice in this report`);
    seen.add(p.id);
    if (otherIds?.has(p.id)) err(`${at}: another report already uses this id`);
    if (!PROPOSAL_KINDS.includes(p.kind)) err(`${at}: kind must be one of ${PROPOSAL_KINDS.join(", ")}`);
    if (!filled(p.title)) err(`${at}: title is required`);
    else if (p.title.length > 90) warn(`${at}: the title is ${p.title.length} characters; ninety or fewer reads as a heading`);
    if (!Number.isInteger(p.rank) || p.rank < 1) err(`${at}: rank must be 1 or more`);
    else if (ranks.has(p.rank)) err(`${at}: rank ${p.rank} is used twice`);
    else ranks.add(p.rank);
    if (!["high", "medium", "low"].includes(p.confidence)) err(`${at}: confidence must be high, medium or low`);
    for (const f of p.kind === "note" ? ["why", "recommendation"] : TEXT_FIELDS) {
      if (!filled(p[f])) err(`${at}: ${f} is required`);
      else if (p[f].length > 900) warn(`${at}: ${f} is ${p[f].length} characters`);
    }
    if (p.kind === "question") {
      if (!Array.isArray(p.options) || p.options.length < 2 || p.options.some((o) => !filled(o?.label) || !filled(o?.what))) err(`${at}: a question needs at least two options, each with a label and what it commits to`);
    }
    if (p.revisits && !filled(p.revisitReason)) err(`${at}: revisits ${p.revisits} but does not say how this differs from what Ingram declined`);

    const ops = Array.isArray(p.ops) ? p.ops : [];
    if (PATCH_KINDS.has(p.kind) && !ops.length) err(`${at}: a ${p.kind} proposal needs a patch (ops)`);
    if (!PATCH_KINDS.has(p.kind) && ops.length) err(`${at}: a ${p.kind} cannot carry a patch: it is something only Ingram can decide, or something the bot noticed`);
    if (planState === "approved" && ops.length && !p.reopensApproval) err(`${at}: the scene is approved, so a patch must say (reopensApproval: true) that accepting it reopens that approval`);
    ops.forEach((op, i) => {
      const where = `${at} op ${i + 1}`;
      const bad = opProblem(op);
      if (bad) return err(`${where}: ${bad}`);
      if (canonSourceOf(op.file)) return err(`${where}: ${op.file} is a built copy; patch ${canonSourceOf(op.file)} and the build will follow`);
      const writeBad = writeProblem(op.file, op.op === "create" ? "A" : "M");
      if (writeBad) err(`${where}: ${writeBad}`);
      if (op.op === "create" && op.content?.id !== op.file.replace(/^.*\//, "").replace(/\.json$/, "")) err(`${where}: the new file's id must match its file name`);
      if (op.op === "create" && /^data\/npcs\//.test(op.file) && op.content?.authoring?.status !== "drafted") err(`${where}: a new person is created as drafted (authoring.status), never above it`);
    });
    opsByProposal.push({ p, ops });

    if (declined.has(proposalFingerprint(p)) && !p.revisits) err(`${at}: Ingram already declined a proposal about these same words. Do not raise it again; if you think a different change is worth it, set revisits and revisitReason`);
  }

  // Two proposals must not edit the same part: she can accept any subset.
  for (let a = 0; a < opsByProposal.length; a++) {
    for (let b = a + 1; b < opsByProposal.length; b++) {
      for (const x of opsByProposal[a].ops) {
        for (const y of opsByProposal[b].ops) {
          if (x?.file !== y?.file || opProblem(x) || opProblem(y)) continue;
          if (x.op === "create" || y.op === "create" || pathsOverlap(x.path, y.path)) err(`proposals ${opsByProposal[a].p.id} and ${opsByProposal[b].p.id} both change ${x.file}${x.op === "create" ? "" : ` · ${pathText(x.path)}`}: split them or merge them into one`);
        }
      }
    }
  }

  if (applyCheck) {
    for (const { p, ops } of opsByProposal) {
      if (!ops.length || ops.some((o) => opProblem(o))) continue;
      const docs = {};
      for (const f of new Set(ops.map((o) => o.file))) docs[f] = readJsonIf(root, f);
      const res = applyOps(docs, ops);
      const at = `proposal ${p.id}`;
      res.results.forEach((r) => {
        if (r.status === "clash") err(`${at}: op ${r.index + 1} expected ${r.path ?? r.file} to say something else (it now reads ${JSON.stringify(r.current)?.slice(0, 120)})`);
        else if (r.status === "unplaceable") err(`${at}: op ${r.index + 1} cannot be placed: ${r.reason}`);
      });
      if (res.results.length && res.results.every((r) => r.status === "already")) warn(`${at}: every part of it is already in place`);
      for (const f of Object.keys(res.docs)) {
        const kind = kindOfFile(f);
        if (!kind || !docs[f] || !res.docs[f]) continue;
        for (const v of anchorViolations(kind, docs[f], res.docs[f])) err(`${at}: it moves the scene's direction, which only Ingram may do (${describeViolation(v)}). Make it a question instead`);
      }
    }
  }

  return { errors, warnings };
}

/** Every proposal id already used by a report other than this one. */
export function otherReportIds(root, reportId) {
  const ids = new Set();
  for (const { report } of listReports(root)) if (report.id !== reportId) for (const p of report.proposals ?? []) ids.add(p.id);
  return ids;
}
