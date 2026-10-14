// Ingram's decisions on the bot's proposals (tools/qc-bot/decisions.mjs): kept in her words, never lost, never raised again once declined.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DECISIONS_DIR, REPORTS_DIR, fullPath, readJson, writeJson } from "../../tools/qc-bot/lib.mjs";
import { declinedFingerprints, findProposal, importDecisions, listReports, markApplied, pending, readDecisions, recordDecision, reviewedHashes } from "../../tools/qc-bot/decisions.mjs";
import { finalizeReport } from "../../tools/qc-bot/proposals.mjs";
import { SCENE_ID, cleanup, makeReport, makeRepo, proseProposal, routeProposal } from "./fixture.mjs";

function withReport(over = {}) {
  const root = makeRepo();
  const report = finalizeReport(makeReport(over));
  const file = `${REPORTS_DIR}/${SCENE_ID}/2026-10-14-1.json`;
  writeJson(root, file, report);
  return { root, report, file };
}

test("reports are listed oldest first, and a broken file does not stop the rest", () => {
  const { root } = withReport();
  writeJson(root, `${REPORTS_DIR}/${SCENE_ID}/2026-10-15-1.json`, makeReport({ id: `qc-${SCENE_ID}-2026-10-15-1`, generatedAt: "2026-10-15T09:00:00Z", proposals: [] }));
  fs.writeFileSync(fullPath(root, `${REPORTS_DIR}/${SCENE_ID}/2026-10-16-1.json`), "{ not json");
  assert.deepEqual(listReports(root).map((r) => r.report.id), [`qc-${SCENE_ID}-2026-10-14-1`, `qc-${SCENE_ID}-2026-10-15-1`]);
  assert.equal(findProposal(root, routeProposal().id).proposal.title, routeProposal().title);
  assert.equal(findProposal(root, "no-such"), null);
  cleanup(root);
});

test("a decision keeps her words exactly, and changing her mind loses nothing", () => {
  const { root } = withReport();
  const id = routeProposal().id;
  const note = "I like the idea but not the Society line.\r\nIt sounds like a lecture.";
  const first = recordDecision(root, { proposalId: id, decision: "discuss", note, via: "page", decidedAt: "2026-10-15T10:00:00Z" });
  assert.equal(first.record.note, "I like the idea but not the Society line.\nIt sounds like a lecture.");
  assert.equal(first.record.reportId, `qc-${SCENE_ID}-2026-10-14-1`);
  assert.ok(first.record.fingerprint);
  assert.equal(recordDecision(root, { proposalId: id, decision: "discuss", note, via: "page" }).changed, false, "the same decision twice changes nothing");
  const second = recordDecision(root, { proposalId: id, decision: "accept", note: "Fine, with a shorter line.", decidedAt: "2026-10-16T10:00:00Z" });
  assert.equal(second.record.decision, "accept");
  assert.equal(second.record.history.length, 1);
  assert.equal(second.record.history[0].decision, "discuss");
  assert.equal(readDecisions(root).get(id).decision, "accept");
  cleanup(root);
});

test("a decision must be one of three and about a proposal that exists", () => {
  const { root } = withReport();
  assert.throws(() => recordDecision(root, { proposalId: routeProposal().id, decision: "maybe" }), /accept, decline, discuss/);
  assert.throws(() => recordDecision(root, { proposalId: "no-such", decision: "accept" }), /No report holds/);
  cleanup(root);
});

test("a declined proposal's fingerprint is remembered, an accepted one's is not", () => {
  const { root, report } = withReport();
  recordDecision(root, { proposalId: report.proposals[0].id, decision: "decline", note: "No." });
  recordDecision(root, { proposalId: report.proposals[1].id, decision: "accept" });
  assert.deepEqual([...declinedFingerprints(root)], [report.proposals[0].fingerprint]);
  cleanup(root);
});

test("what the scene has been reviewed at includes the state after accepted changes were applied", () => {
  const { root, report } = withReport();
  assert.deepEqual([...reviewedHashes(root, SCENE_ID)], ["abc123"]);
  recordDecision(root, { proposalId: report.proposals[0].id, decision: "accept" });
  markApplied(root, report.proposals[0].id, { hashAfter: "after-1" });
  assert.deepEqual([...reviewedHashes(root, SCENE_ID)].sort(), ["abc123", "after-1"]);
  assert.equal(readJson(root, `${DECISIONS_DIR}/${report.proposals[0].id}.json`).applied.hashAfter, "after-1");
  assert.throws(() => markApplied(root, "undecided-one"), /no decision/);
  cleanup(root);
});

test("what the review page collected can be taken in, in any of the shapes it comes out as", () => {
  const { root, report } = withReport();
  const [a, b] = report.proposals.map((p) => p.id);
  const fromDocs = importDecisions(root, { docs: [{ id: a, data: { decision: "accept", note: "Yes", decidedAt: "2026-10-15T10:00:00Z" } }, { id: "stranger", data: { decision: "accept" } }] });
  assert.deepEqual(fromDocs.recorded, [a]);
  assert.deepEqual(fromDocs.unknown, ["stranger"]);
  const keyed = importDecisions(root, { [a]: { decision: "accept", note: "Yes" }, [b]: { decision: "decline", note: "No" }, junk: { nothing: true } });
  assert.deepEqual(keyed.unchanged, [a]);
  assert.deepEqual(keyed.recorded, [b]);
  assert.deepEqual(keyed.skipped, ["junk"]);
  assert.equal(readDecisions(root).get(a).via, "page");
  cleanup(root);
});

test("the command line takes in a folder of decisions, one file per proposal, as the shared store exports them", async () => {
  const { root, report } = withReport();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-import-"));
  const [a, b] = report.proposals.map((p) => p.id);
  fs.writeFileSync(path.join(dir, a + ".json"), JSON.stringify({ decision: "accept", note: "Yes.", choice: null, decidedAt: "2026-10-15T10:00:00Z" }));
  fs.writeFileSync(path.join(dir, b + ".json"), JSON.stringify({ decision: "decline", note: "No: too long.", choice: null, decidedAt: "2026-10-15T10:05:00Z" }));
  fs.writeFileSync(path.join(dir, "readme.txt"), "ignored");
  // the same reading the command does, run on this temp repo
  const input = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]));
  const summary = importDecisions(root, input);
  assert.deepEqual(summary.recorded.sort(), [a, b].sort());
  assert.equal(readDecisions(root).get(b).note, "No: too long.");
  fs.rmSync(dir, { recursive: true, force: true });
  cleanup(root);
});

test("a question is answered by choosing one of its options, and a note needs no decision", () => {
  const question = { id: "q-1", kind: "question", title: "Should it end here?", rank: 3, confidence: "medium", now: "a", change: "b", why: "c", touches: "d", risk: "e", recommendation: "f", decisionAsk: "g", options: [{ label: "A. Yes", what: "stops" }, { label: "B. No", what: "goes on" }] };
  const note = { id: "n-1", kind: "note", title: "Noticed", rank: 4, confidence: "low", why: "w", recommendation: "r" };
  const { root } = withReport({ proposals: [routeProposal(), proseProposal(), question, note] });
  assert.throws(() => recordDecision(root, { proposalId: "q-1", decision: "accept" }), /is a question: answer it by choosing one of its options \(A\. Yes \| B\. No\)/);
  assert.throws(() => recordDecision(root, { proposalId: "q-1", decision: "accept", choice: "C. Maybe" }), /is a question/);
  const ok = recordDecision(root, { proposalId: "q-1", decision: "accept", choice: "B. No", note: "Goes on." });
  assert.equal(ok.record.choice, "B. No");
  assert.equal(recordDecision(root, { proposalId: "q-1", decision: "decline", note: "None of these." }).record.choice, undefined, "declining every option keeps no choice");
  assert.equal(recordDecision(root, { proposalId: "q-1", decision: "discuss" }).record.decision, "discuss");
  assert.equal(recordDecision(root, { proposalId: routeProposal().id, decision: "accept", choice: "ignored" }).record.choice, undefined, "only a question carries a choice");
  assert.throws(() => recordDecision(root, { proposalId: "n-1", decision: "accept" }), /is a note: it needs no decision/);
  const summary = importDecisions(root, { "q-1": { decision: "accept" }, "n-1": { decision: "accept" } });
  assert.equal(summary.invalid.length, 2, "the page and the importer refuse what the command refuses");
  cleanup(root);
});

test("pending: what nobody has decided, what is flagged to discuss, and what is accepted but not applied", () => {
  const { root, report } = withReport({ proposals: [routeProposal(), proseProposal(), { id: "n-1", kind: "note", title: "Noticed", rank: 3, confidence: "low", why: "x", recommendation: "y" }] });
  const [a, b] = [report.proposals[0].id, report.proposals[1].id];
  let p = pending(root);
  assert.deepEqual(p.undecided.map((r) => r.id).sort(), [a, b].sort(), "a note needs no decision");
  recordDecision(root, { proposalId: a, decision: "accept" });
  recordDecision(root, { proposalId: b, decision: "discuss", note: "Talk me through it." });
  p = pending(root);
  assert.deepEqual(p.acceptedNotApplied.map((r) => r.id), [a]);
  assert.deepEqual(p.discuss.map((r) => r.note), ["Talk me through it."]);
  assert.deepEqual(p.undecided, []);
  markApplied(root, a, {});
  assert.deepEqual(pending(root).acceptedNotApplied, []);
  cleanup(root);
});
