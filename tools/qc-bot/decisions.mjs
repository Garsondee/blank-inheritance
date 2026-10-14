/**
 * Reports, and what Ingram decided about each proposal in them.
 *
 * A decision is Ingram's: accept, decline or discuss, with her reason in her own words. Her reasons are the most useful
 * thing the bot ever receives, so a note is stored exactly as she wrote it (line endings aside) and the bot reads every
 * one before it proposes anything for that scene again. A declined proposal is never raised a second time unless the
 * words it is about have changed (canon/README.md rule 6, "rejected stays rejected", applied to the bot).
 *
 * One file per proposal in reviews/qc/decisions/, never edited by the bot (the write rules in lib.mjs do not allow it).
 * Written by `qc decide`, `qc decisions import` (what the review page collected) and `qc apply` (which stamps an
 * accepted proposal as applied).
 */
import fs from "node:fs";
import path from "node:path";
import { DECISIONS_DIR, REPORTS_DIR, exists, fullPath, lf, listFiles, readJson, writeJson } from "./lib.mjs";

export const DECISIONS = Object.freeze(["accept", "decline", "discuss"]);

/** Every report on disk, oldest first: [{ file, report }]. A file that cannot be read is skipped, not fatal. */
export function listReports(root) {
  const out = [];
  const base = fullPath(root, REPORTS_DIR);
  if (!fs.existsSync(base)) return out;
  for (const scene of fs.readdirSync(base).sort()) {
    if (!fs.statSync(path.join(base, scene)).isDirectory()) continue;
    for (const f of listFiles(root, `${REPORTS_DIR}/${scene}`, ".json")) {
      const file = `${REPORTS_DIR}/${scene}/${f}`;
      try {
        out.push({ file, report: readJson(root, file) });
      } catch {
        /* a half-written report is the bot's problem, not a reason to stop everything else */
      }
    }
  }
  return out.sort((a, b) => String(a.report.generatedAt ?? a.file).localeCompare(String(b.report.generatedAt ?? b.file)));
}

/** The proposal with this id, in whichever report holds it: { file, report, proposal } or null. */
export function findProposal(root, proposalId) {
  for (const entry of listReports(root)) {
    const proposal = (entry.report.proposals ?? []).find((p) => p.id === proposalId);
    if (proposal) return { ...entry, proposal };
  }
  return null;
}

/** All decisions by proposal id. */
export function readDecisions(root) {
  const map = new Map();
  for (const f of listFiles(root, DECISIONS_DIR, ".json")) {
    try {
      const d = readJson(root, `${DECISIONS_DIR}/${f}`);
      if (d?.proposalId) map.set(d.proposalId, d);
    } catch {
      /* skipped, as for reports */
    }
  }
  return map;
}

/** The fingerprints of everything Ingram declined: the bot may not propose the same change to the same words again. */
export function declinedFingerprints(root) {
  return new Set([...readDecisions(root).values()].filter((d) => d.decision === "decline" && d.fingerprint).map((d) => d.fingerprint));
}

/** Every scene hash a scene has been reviewed at, or left at after accepted changes were applied. */
export function reviewedHashes(root, sceneId, reports = listReports(root), decisions = readDecisions(root)) {
  const hashes = new Set();
  for (const { report } of reports) {
    if (report.scene !== sceneId) continue;
    if (report.sceneHash) hashes.add(report.sceneHash);
    if (report.result?.hashAfter) hashes.add(report.result.hashAfter);
  }
  for (const d of decisions.values()) if (d.scene === sceneId && d.applied?.hashAfter) hashes.add(d.applied.hashAfter);
  return hashes;
}

/**
 * Record a decision. Replaces the current one and keeps the earlier ones in `history`, so changing her mind loses
 * nothing. `proposalId` must belong to a report that exists.
 */
export function recordDecision(root, { proposalId, decision, note = "", choice = null, via = "chat", decidedAt }) {
  if (!DECISIONS.includes(decision)) throw new Error(`A decision is one of ${DECISIONS.join(", ")} (got ${JSON.stringify(decision)})`);
  const found = findProposal(root, proposalId);
  if (!found) throw new Error(`No report holds a proposal called ${proposalId}`);
  const rel = `${DECISIONS_DIR}/${proposalId}.json`;
  const before = exists(root, rel) ? readJson(root, rel) : null;
  const at = decidedAt ?? new Date().toISOString();
  const text = lf(note).replace(/\s+$/, "");
  if (before && before.decision === decision && before.note === text && (before.choice ?? null) === (choice ?? null)) return { record: before, changed: false };
  const history = before ? [...(before.history ?? []), { decision: before.decision, ...(before.choice ? { choice: before.choice } : {}), note: before.note, decidedAt: before.decidedAt, via: before.via }] : [];
  const record = {
    kind: "qc-decision",
    version: 1,
    proposalId,
    reportId: found.report.id,
    scene: found.report.scene,
    fingerprint: found.proposal.fingerprint ?? null,
    decision,
    ...(choice ? { choice } : {}),
    note: text,
    decidedAt: at,
    via,
    ...(history.length ? { history } : {}),
    ...(before?.applied ? { applied: before.applied } : {}),
  };
  writeJson(root, rel, record);
  return { record, changed: true };
}

/** Stamp an accepted proposal as applied, with the scene's hash afterwards (so the queue does not re-review it for that). */
export function markApplied(root, proposalId, { at = new Date().toISOString(), hashAfter = null } = {}) {
  const rel = `${DECISIONS_DIR}/${proposalId}.json`;
  if (!exists(root, rel)) throw new Error(`There is no decision for ${proposalId} to mark applied`);
  const d = readJson(root, rel);
  writeJson(root, rel, { ...d, applied: { at, hashAfter } });
}

/**
 * Take in decisions collected elsewhere (the review page's shared database). Accepts a list of
 * { id | proposalId, decision, note, decidedAt } objects, or the same keyed by proposal id, or { docs: [...] }.
 */
export function importDecisions(root, input, { via = "page" } = {}) {
  const raw = Array.isArray(input) ? input : Array.isArray(input?.docs) ? input.docs : Object.entries(input ?? {}).map(([id, v]) => ({ id, ...v }));
  const summary = { recorded: [], unchanged: [], unknown: [], skipped: [] };
  for (const item of raw) {
    const data = item?.data && typeof item.data === "object" ? { ...item.data, id: item.id ?? item.data.id } : item;
    const proposalId = data?.proposalId ?? data?.id;
    if (!proposalId || !DECISIONS.includes(data?.decision)) {
      summary.skipped.push(proposalId ?? "(no id)");
      continue;
    }
    try {
      const { changed } = recordDecision(root, { proposalId, decision: data.decision, note: data.note ?? "", choice: data.choice ?? null, via, decidedAt: data.decidedAt });
      (changed ? summary.recorded : summary.unchanged).push(proposalId);
    } catch (e) {
      if (/No report holds/.test(e.message)) summary.unknown.push(proposalId);
      else throw e;
    }
  }
  return summary;
}

/** What is waiting: proposals nobody has decided, ones flagged for discussion, and accepted ones not yet applied. */
export function pending(root) {
  const decisions = readDecisions(root);
  const out = { undecided: [], discuss: [], acceptedNotApplied: [] };
  for (const { report } of listReports(root)) {
    for (const p of report.proposals ?? []) {
      if (p.kind === "note") continue;
      const d = decisions.get(p.id);
      const row = { id: p.id, scene: report.scene, reportId: report.id, title: p.title, kind: p.kind };
      if (!d) out.undecided.push(row);
      else if (d.decision === "discuss") out.discuss.push({ ...row, note: d.note });
      else if (d.decision === "accept" && !d.applied && (p.ops ?? []).length) out.acceptedNotApplied.push(row);
    }
  }
  return out;
}
