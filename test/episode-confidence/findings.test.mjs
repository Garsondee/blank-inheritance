/**
 * The episode confidence run's findings core (tools/episode-confidence/core/findings.mjs): the shared shape, the quote check that throws
 * away a reviewer's invented quotes, de-duplication across layers, and the scorecard that answers "is an LLM a useful co-author?".
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { dedupe, foldText, mapKind, normalizeFinding, numberFindings, scorecard, scorecardMarkdown, verifyQuote } from "../../tools/episode-confidence/core/findings.mjs";

const files = {
  "canon/scenes/episode-c1e1--the-road-in.json": JSON.stringify({ beats: [{ readAloud: "The coach stops at the gate. A sergeant with a clipboard waves you down \u{2014} \u{201C}Names?\u{201D}" }] }),
  "data/challenges/c1e1-the-road-in.json": JSON.stringify({ dc: 15 })
};
const read = (p) => files[p] ?? null;

const desk = (over = {}) => normalizeFinding({ scene: "episode-c1e1--the-road-in", kind: "content", severity: "S2", summary: "The sergeant has no line after Names", quote: "A sergeant with a clipboard waves you down", file: "canon/scenes/episode-c1e1--the-road-in.json", proposal: { type: "fix", text: "Give him a second line." }, ...over }, { channel: "desk", source: "scene-reader-1", model: "opus" }).finding;

test("a finding is normalised to one shape, and a bad one says every reason", () => {
  const ok = normalizeFinding({ kind: "material-gap", severity: "S1", summary: " x " }, { channel: "table" });
  assert.equal(ok.ok, true);
  assert.equal(ok.finding.kind, "content", "the rig's kinds map onto the confidence run's five");
  assert.equal(ok.finding.summary, "x");
  const bad = normalizeFinding({ kind: "vibes", severity: "S9" }, { channel: "nowhere" });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 4);
  assert.equal(mapKind("ux-friction"), "bug");
  assert.equal(mapKind("pacing"), "craft");
});

test("a quote copied from the file is verified, through JSON escapes and typographic quotes", () => {
  assert.equal(verifyQuote(desk(), read).verified, true);
  assert.equal(verifyQuote(desk({ quote: 'waves you down - "Names?"' }), read).verified, true, "dashes and curly quotes fold");
  assert.equal(foldText("A  B\\nC"), "a b c");
});

test("a quote the file does not contain is not verified, and says why", () => {
  const invented = verifyQuote(desk({ quote: "A corporal with a rifle bars the way" }), read);
  assert.equal(invented.verified, false);
  assert.match(invented.verifyNote, /not in the cited file/);
  const nowhere = verifyQuote(desk({ file: "canon/scenes/no-such.json" }), read);
  assert.equal(nowhere.verified, false);
  assert.match(nowhere.verifyNote, /does not exist/);
});

test("a canon scene's data/ twin counts as the same file", () => {
  const twin = verifyQuote(desk({ file: "data/scene-briefs/episode-c1e1--the-road-in.json" }), read);
  assert.equal(twin.verified, true);
});

test("a desk finding with no quote is unverifiable; a gate, walk or table finding needs none", () => {
  assert.equal(verifyQuote(desk({ quote: "" }), read).verified, false);
  const walk = normalizeFinding({ kind: "bug", severity: "S1", summary: "Beat x was never shown" }, { channel: "walker" }).finding;
  assert.equal(verifyQuote(walk, read).verified, null);
});

test("two findings about the same words merge, keeping the more severe and remembering who else found it", () => {
  const a = desk({ severity: "S3" });
  const b = normalizeFinding({ scene: "episode-c1e1--the-road-in", kind: "bug", severity: "S1", summary: "The sergeant stalls the scene", quote: "sergeant with a clipboard waves you down" }, { channel: "table", source: "agent P2" }).finding;
  const c = desk({ summary: "Something else entirely about the coach timetable", quote: "The coach stops at the gate" , scene: "episode-c1e1--assembly" });
  const kept = dedupe([a, b, c]);
  assert.equal(kept.length, 2);
  const merged = kept.find((f) => f.scene === "episode-c1e1--the-road-in");
  assert.equal(merged.severity, "S1");
  assert.equal(merged.channel, "table");
  assert.deepEqual(merged.duplicates.map((d) => d.channel), ["desk"]);
});

test("summaries that share most of their words merge even without quotes; different scenes never do", () => {
  const x = normalizeFinding({ scene: "s", kind: "bug", severity: "S2", summary: "The check console never closes after the rolls arrive" }, { channel: "walker" }).finding;
  const y = normalizeFinding({ scene: "s", kind: "bug", severity: "S2", summary: "After the rolls arrive the check console never closes" }, { channel: "table" }).finding;
  const z = normalizeFinding({ scene: "t", kind: "bug", severity: "S2", summary: "The check console never closes after the rolls arrive" }, { channel: "table" }).finding;
  assert.equal(dedupe([x, y, z]).length, 2);
});

test("findings are numbered by severity, then play order", () => {
  const f = (scene, severity) => normalizeFinding({ scene, kind: "bug", severity, summary: `${scene} ${severity}` }, { channel: "gate" }).finding;
  const out = numberFindings([f("b", "S2"), f("a", "S2"), f("b", "S0")], ["a", "b"]);
  assert.deepEqual(out.map((x) => `${x.id} ${x.summary}`), ["C-0001 b S0", "C-0002 a S2", "C-0003 b S2"]);
});

test("the scorecard counts precision per layer and per desk model, unique finds, and fabricated quotes", () => {
  const f1 = { ...desk(), id: "C-0001", duplicates: [] };
  const f2 = { ...desk({ model: "sonnet" }), id: "C-0002", model: "sonnet", duplicates: [{ channel: "table" }] };
  const f3 = { ...normalizeFinding({ kind: "bug", severity: "S1", summary: "w" }, { channel: "walker" }).finding, id: "C-0003", duplicates: [] };
  const rows = scorecard([f1, f2, f3], { "C-0001": "useful", "C-0002": "nitpick", "C-0003": "useful" }, { dropped: [desk(), desk()], costs: { walker: { minutes: 25, tokens: 0 } } });
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.equal(by["desk (opus)"].precision, 1);
  assert.equal(by["desk (opus)"].fabricated, 2);
  assert.equal(by["desk (sonnet)"].precision, 0);
  assert.equal(by["desk (sonnet)"].unique, 0, "a find another layer also made is not unique");
  assert.equal(by.walker.minutes, 25);
  const md = scorecardMarkdown(rows, { run: "r1", date: "2026-10-07" });
  assert.match(md, /### r1 \(2026-10-07\)/);
  assert.match(md, /\| desk \(opus\) \| 1 \| 1 \| 1 \| 0 \| 0 \| 0 \| 100% \| 1 \| 2 \|/);
});
