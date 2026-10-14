/**
 * The collector (tools/episode-confidence/collect.mjs): a run folder of gate and desk files merged into one numbered findings list,
 * fabricated quotes dropped and counted, the grading page built with the data in it, and the scorecard appended.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildPage, fromRig, merge } from "../../tools/episode-confidence/collect.mjs";

const scene = "episode-c1e1--the-road-in";
const sceneText = JSON.stringify({ intro: { readAloud: "The coach stops at the gate. A sergeant with a clipboard waves you down." } });
const read = (p) => (p === `canon/scenes/${scene}.json` ? sceneText : null);

function runDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "confidence-"));
  writeFileSync(path.join(dir, "gate.json"), JSON.stringify({ episode: "episode-c1e1-mothers-maiden-name", findings: [{ channel: "gate", source: "journeys", kind: "bug", severity: "S2", summary: "Tokens would stand in the water", scene }] }));
  mkdirSync(path.join(dir, "desk"));
  const quote = (q, extra = {}) => ({ scene, kind: "content", severity: "S2", summary: `About: ${q}`, quote: q, file: `canon/scenes/${scene}.json`, proposal: { type: "fix", text: "x" }, ...extra });
  writeFileSync(path.join(dir, "desk", "scene-reader-1.json"), JSON.stringify({ reviewer: "scene-reader-1", model: "opus", scenes: [scene], verdicts: { [scene]: { verdict: "close", why: "Strong opening; the sergeant stalls." } }, findings: [quote("A sergeant with a clipboard waves you down"), quote("A colonel salutes the coach smartly"), { kind: "vibes" }] }));
  return dir;
}

test("merge keeps verified findings, drops invented quotes and invalid entries, and records the verdicts", () => {
  const dir = runDir();
  const r = merge({ dir, read });
  assert.equal(r.stats.raw, 4);
  assert.equal(r.stats.invalid, 1);
  assert.equal(r.stats.dropped, 1, "the colonel is not in the scene");
  assert.equal(r.stats.kept, 2);
  assert.deepEqual(r.findings.map((f) => f.id), ["C-0001", "C-0002"]);
  assert.equal(r.stats.byChannel.desk.dropped, 1);
  assert.equal(r.stats.verdicts[scene][0].verdict, "close");
  assert.equal(readFileSync(path.join(dir, "findings.jsonl"), "utf8").trim().split("\n").length, 2);
  assert.match(readFileSync(path.join(dir, "dropped.jsonl"), "utf8"), /colonel/);
});

test("rig findings: the walker's keep their channel, the table's become 'table', rig faults and praise stay out", () => {
  assert.equal(fromRig({ kind: "rig", channel: "instrument" }), null);
  assert.equal(fromRig({ kind: "praise", channel: "agent" }), null);
  assert.equal(fromRig({ kind: "bug", channel: "walker", seat: "GM" }).channel, "walker");
  assert.equal(fromRig({ kind: "material-gap", channel: "agent", seat: "P2" }).channel, "table");
});

test("the grading page carries every kept finding, and no finding's text can close its script", () => {
  const dir = runDir();
  writeFileSync(path.join(dir, "desk", "scene-reader-2.json"), JSON.stringify({ reviewer: "scene-reader-2", model: "sonnet", scenes: [scene], findings: [{ scene, kind: "craft", severity: "S3", summary: "Ends with </script><b>oops</b>", quote: "The coach stops at the gate", file: `canon/scenes/${scene}.json`, proposal: { type: "question", text: "?" } }] }));
  merge({ dir, read });
  const html = readFileSync(buildPage({ dir }), "utf8");
  assert.ok(!html.includes("/*__DATA__*/null"), "the data went in");
  assert.ok(!html.includes("</script><b>oops"), "a finding's text is escaped");
  assert.match(html, /<title>Grades confidence-/);
  const json = html.slice(html.indexOf("const DATA = ") + 13, html.indexOf(";\nconst GRADES"));
  assert.equal(JSON.parse(json).findings.length, 3);
});
