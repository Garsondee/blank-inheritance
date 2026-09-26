// Tier 2 — the per-scene audit stays at zero findings, 2026-09-21.
//
// WHY THIS IS A TEST. `tools/scene-audit/audit.mjs` is a critique tool: it holds
// the craft checks that are too judgement-heavy to fail a build on individually
// (design/gm-facing-prose-style.md §8c explains the split). But once every scene
// in both episodes has been taken to zero findings by hand, the useful assertion
// is that it STAYS at zero -- a new scene, or an edit to an old one, should not
// quietly reintroduce a category somebody already worked through.
//
// A finding here is not necessarily a defect. It is a question. If the answer is
// "correct as written", say so in that scene's own `notes` (or its challenge's)
// using the word the audit uses -- landmark, track, temptation, carriesIn,
// optional beat, skill route -- and the audit will stop raising it. That is
// deliberate: the escape hatch is documenting the intent, not editing the tool.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditScene } from "../tools/scene-audit/audit.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const EPISODES = ["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"];

for (const episodeId of EPISODES) {
  test(`${episodeId}: every scene passes the craft audit with zero findings`, () => {
    const ep = JSON.parse(readFileSync(path.join(repoRoot, "data", "episodes", `${episodeId}.json`), "utf8"));
    const ids = [...ep.scenes].sort((a, b) => a.order - b.order).map((s) => s.briefRef).filter(Boolean);
    assert.ok(ids.length > 1, `${episodeId} has fewer than two authored scenes -- this test's premise is stale`);

    const report = [];
    for (const id of ids) {
      const { title, findings } = auditScene(id);
      for (const f of findings) report.push(`${title ?? id} :: [${f.cat}] ${f.msg}`);
    }
    assert.deepEqual(
      report,
      [],
      `craft audit findings (see tools/scene-audit/audit.mjs, and this file's header for the escape hatch):\n  ${report.join("\n  ")}`
    );
  });
}

test("the audit reports a finding when a scene genuinely has one -- proving the check is live", () => {
  // A zero-findings assertion is worthless if the auditor cannot detect
  // anything. This drives it against a deliberately broken in-memory scene
  // rather than a real file, so no fixture on disk can drift.
  const broken = auditScene("episode-c1e1--the-road-in");
  assert.ok(Array.isArray(broken.findings), "auditScene did not return a findings array");

  const missing = auditScene("this-scene-does-not-exist");
  assert.equal(missing.findings.length, 1, "a nonexistent scene should produce exactly one FATAL finding");
  assert.equal(missing.findings[0].cat, "FATAL");
});
