// The QC bot against the real repo (tier 2): every report and decision on disk is well-formed, the files the bot writes
// round-trip byte for byte, and the focus names a real episode.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DECISIONS_DIR, FOCUS_FILE, REPORTS_DIR, ROOT, fullPath, readJson } from "../../tools/qc-bot/lib.mjs";
import { listReports, readDecisions } from "../../tools/qc-bot/decisions.mjs";
import { lintReport, proposalFingerprint, reportPath } from "../../tools/qc-bot/proposals.mjs";
import { renderReport } from "../../tools/qc-bot/report.mjs";
import { loadModel } from "../../tools/qc-bot/model.mjs";

const reports = listReports(ROOT);

test("the focus is a list of real plan episodes", () => {
  const focus = readJson(ROOT, FOCUS_FILE);
  assert.ok(Array.isArray(focus.episodes) && focus.episodes.length > 0);
  const model = loadModel(ROOT);
  const headings = new Set(model.plan.map((r) => r.episode));
  for (const e of focus.episodes) assert.ok(headings.has(e), `${e} is not an episode heading in canon/plan/`);
});

test("every report on disk is well-formed: the right place, a real scene, clean against the rules", () => {
  const seenIds = new Set();
  for (const { file, report } of reports) {
    const { errors } = lintReport(report, { root: ROOT, applyCheck: false, declined: new Set(), file });
    assert.deepEqual(errors, [], `${file}: ${errors.join("; ")}`);
    assert.equal(file, reportPath(report.id));
    for (const p of report.proposals) {
      assert.ok(!seenIds.has(p.id), `proposal id ${p.id} is used in two reports`);
      seenIds.add(p.id);
      assert.equal(p.fingerprint, proposalFingerprint(p), `${p.id}: the stored fingerprint is stale (run qc lint --write)`);
    }
  }
});

test("every report has its Markdown copy, and the copy is the report as it is now", () => {
  for (const { file, report } of reports) {
    const md = file.replace(/\.json$/, ".md");
    assert.ok(fs.existsSync(fullPath(ROOT, md)), `${md} is missing (run qc render)`);
    assert.equal(fs.readFileSync(fullPath(ROOT, md), "utf8"), renderReport(report), `${md} is out of date (run qc render)`);
  }
});

test("every decision is about a proposal that exists, carries its fingerprint, and keeps Ingram's note", () => {
  const byId = new Map(reports.flatMap(({ report }) => report.proposals.map((p) => [p.id, { p, report }])));
  for (const [id, d] of readDecisions(ROOT)) {
    assert.ok(byId.has(id), `${DECISIONS_DIR}/${id}.json is about a proposal no report holds`);
    const { p, report } = byId.get(id);
    assert.equal(d.reportId, report.id);
    assert.equal(d.scene, report.scene);
    assert.equal(d.fingerprint, p.fingerprint);
    assert.ok(["accept", "decline", "discuss"].includes(d.decision));
    assert.equal(typeof d.note, "string");
    if (p.kind === "question" && d.decision === "accept") assert.ok(p.options.some((o) => o.label === d.choice), `${id}: the chosen option is not one of the question's options`);
  }
});

test("a report folder is named for its scene, and a scene is a canon scene", () => {
  const dir = fullPath(ROOT, REPORTS_DIR);
  if (!fs.existsSync(dir)) return;
  for (const scene of fs.readdirSync(dir)) assert.ok(fs.existsSync(fullPath(ROOT, `canon/scenes/${scene}.json`)), `${REPORTS_DIR}/${scene} is not a canon scene`);
});

test("the files the bot writes round-trip byte for byte, so a patch changes only the lines it means to", () => {
  for (const [dir, ext] of [["canon/scenes", ".json"], ["canon/challenges", ".json"], ["data/npcs", ".json"], ["data/campaign/npc-roster.json", null]]) {
    const files = ext ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`) : [dir];
    for (const rel of files) {
      const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(JSON.stringify(JSON.parse(raw), null, 2) + "\n", raw.replace(/\r\n/g, "\n"), `${rel} would change when the bot rewrites it`);
    }
  }
});
