// The review page (tools/qc-bot/page.mjs and page/template.html): the data it carries, and that it can be opened safely.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { REPORTS_DIR, writeJson } from "../../tools/qc-bot/lib.mjs";
import { buildPage, embedJson, pageData } from "../../tools/qc-bot/page.mjs";
import { recordDecision } from "../../tools/qc-bot/decisions.mjs";
import { finalizeReport } from "../../tools/qc-bot/proposals.mjs";
import { SCENE_ID, cleanup, makeReport, makeRepo, proseProposal, routeProposal } from "./fixture.mjs";

function withReports() {
  const root = makeRepo();
  const first = finalizeReport(makeReport({ model: "claude-opus-5-5 (a note after the model)", proposals: [routeProposal(), proseProposal(), { id: "n-1", kind: "note", title: "Noticed", rank: 3, confidence: "low", why: "w", recommendation: "r" }] }));
  writeJson(root, `${REPORTS_DIR}/${SCENE_ID}/2026-10-14-1.json`, first);
  const second = finalizeReport(makeReport({ id: `qc-${SCENE_ID}-2026-10-20-1`, generatedAt: "2026-10-20T09:00:00Z", proposals: [] }));
  writeJson(root, `${REPORTS_DIR}/${SCENE_ID}/2026-10-20-1.json`, second);
  return { root, first, second };
}

test("the page carries every report, newest first, each proposal with the exact words that change", () => {
  const { root } = withReports();
  const data = pageData({ root, now: "2026-10-21T00:00:00Z" });
  assert.deepEqual(data.reports.map((r) => r.id), [`qc-${SCENE_ID}-2026-10-20-1`, `qc-${SCENE_ID}-2026-10-14-1`]);
  const r = data.reports[1];
  assert.equal(r.model, "claude-opus-5-5", "the long note after the model name is not shown as a chip");
  assert.deepEqual(r.proposals.map((p) => p.rank), [1, 2, 3]);
  const route = r.proposals[0];
  assert.equal(route.ops.length, 2);
  assert.ok(route.ops[0].segments.some((s) => s.op === "add" && s.text === "society"), "a new route shows as added");
  assert.equal(route.ops[1].segments.map((s) => s.text).join(""), "Forms like this one are issued by one office.");
  assert.equal(route.decision, null);
  cleanup(root);
});

test("a decision already in the repo comes with its note, so the page opens where Ingram left off", () => {
  const { root, first } = withReports();
  recordDecision(root, { proposalId: first.proposals[0].id, decision: "decline", note: "Too many Crafting rolls.", via: "chat", decidedAt: "2026-10-15T08:00:00Z" });
  const route = pageData({ root }).reports[1].proposals[0];
  assert.deepEqual(route.decision, { decision: "decline", note: "Too many Crafting rolls.", choice: null, decidedAt: "2026-10-15T08:00:00Z", reportId: first.id, scene: SCENE_ID });
  cleanup(root);
});

test("data goes into the page without any way to end the script element or confuse the parser", () => {
  const nasty = { text: "</script><script>alert(1)</script> & <!-- \u{2028}\u{2029} --> \"quoted\" \\ backslash" };
  const text = embedJson(nasty);
  assert.ok(!text.includes("<"), "no angle bracket survives");
  assert.ok(!text.includes(">") && !text.includes("&"));
  assert.ok(!/[\u{2028}\u{2029}]/u.test(text), "no line separator survives");
  assert.deepEqual(JSON.parse(text), nasty, "and it still reads back as exactly the same data");
});

test("the built page is a whole document body with the data in place, a title, and a script that parses", () => {
  const { root } = withReports();
  const html = buildPage({ root, now: "2026-10-21T00:00:00Z" });
  assert.match(html, /^<title>QC Inbox<\/title>/);
  assert.ok(!html.includes("/*__DATA__*/"), "the placeholder was replaced");
  assert.ok(html.includes(routeProposal().id), "a proposal id is in the page");
  const script = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
  assert.doesNotThrow(() => new Function(script), "the page script parses");
  assert.equal((html.match(/<script>/g) ?? []).length, 1, "exactly one script element: the data cannot have opened another");
  cleanup(root);
});

test("the page uses the shared store the way the capability asks: one subscription, writes on a decision, a fallback when it is not there", () => {
  const template = fs.readFileSync(fileURLToPath(new URL("../../tools/qc-bot/page/template.html", import.meta.url)), "utf8");
  assert.equal((template.match(/\.onSnapshot\(/g) ?? []).length, 1, "subscribe once, never from render");
  assert.match(template, /claude\?\.use\?\.\("db"\)/);
  assert.match(template, /collection\("decisions"\)\.doc\(id\)\.set\(/);
  assert.match(template, /canStore/, "it knows when the view cannot keep anything");
  assert.match(template, /Copy decisions/);
  assert.match(template, /prefers-color-scheme: dark/);
  assert.match(template, /:root\[data-theme="dark"\]/);
});
