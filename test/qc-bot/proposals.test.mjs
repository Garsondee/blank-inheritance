// What makes a report fit to hand over (tools/qc-bot/proposals.mjs). Every rule protects Ingram's time or her words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROPOSAL_KINDS, finalizeReport, lintReport, proposalFingerprint, reportPath } from "../../tools/qc-bot/proposals.mjs";
import { CHALLENGE_ID, SCENE_ID, cleanup, makeReport, makeRepo, proseProposal, routeProposal } from "./fixture.mjs";

const lint = (root, report, opts = {}) => lintReport(report, { root, declined: new Set(), ...opts });
const errorsOf = (root, report, opts) => lint(root, report, opts).errors;

test("a well-formed report about the files as they are is clean", () => {
  const root = makeRepo();
  const { errors, warnings } = lint(root, makeReport(), { file: reportPath(`qc-${SCENE_ID}-2026-10-14-1`) });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  cleanup(root);
});

test("an empty report is fine: a scene can be good as it is", () => {
  const root = makeRepo();
  assert.deepEqual(errorsOf(root, makeReport({ proposals: [] })), []);
  cleanup(root);
});

test("the report must say what the scene does before it says what to change", () => {
  const root = makeRepo();
  const errors = errorsOf(root, makeReport({ overview: { why: "", walkthrough: "x" } }));
  assert.ok(errors.some((e) => /overview\.why/.test(e)));
  assert.ok(errors.some((e) => /overview\.leadsTo/.test(e)));
  cleanup(root);
});

test("the id, scene and path agree, and the scene must be a canon scene", () => {
  const root = makeRepo();
  assert.ok(errorsOf(root, makeReport({ id: "not-an-id" })).some((e) => /id must look like/.test(e)));
  assert.ok(errorsOf(root, makeReport({ scene: "other-scene" })).some((e) => /id says the scene is/.test(e) || /not a canon scene/.test(e)));
  assert.ok(errorsOf(root, makeReport(), { file: "reviews/qc/reports/elsewhere/x.json" }).some((e) => /belongs at/.test(e)));
  cleanup(root);
});

test("at most five proposals change play material, and eight in all", () => {
  const root = makeRepo();
  const many = (n, kind = "prose") => Array.from({ length: n }, (_, i) => proseProposal({ id: `p-${i}`, rank: i + 1, kind, ops: [{ op: "set", file: `canon/scenes/${SCENE_ID}.json`, path: "notes", before: "Prep notes.", after: `v${i}` }] }));
  assert.ok(errorsOf(root, makeReport({ proposals: many(6) })).some((e) => /limit is 5/.test(e)));
  const housekeeping = Array.from({ length: 9 }, (_, i) => ({ id: `n-${i}`, kind: "note", title: "x", rank: i + 1, confidence: "low", why: "y", recommendation: "z" }));
  assert.ok(errorsOf(root, makeReport({ proposals: housekeeping })).some((e) => /in all/.test(e)));
  cleanup(root);
});

test("every proposal gives the context for the decision: the text fields, a kind, a rank, a confidence", () => {
  const root = makeRepo();
  const errors = errorsOf(root, makeReport({ proposals: [routeProposal({ why: "", decisionAsk: " ", confidence: "sure", kind: "dance" })] }));
  for (const field of ["why is required", "decisionAsk is required", "confidence must be", "kind must be one of"]) assert.ok(errors.some((e) => e.includes(field)), field);
  assert.ok(PROPOSAL_KINDS.includes("route"));
  cleanup(root);
});

test("a change must carry a patch, and a question or note must not", () => {
  const root = makeRepo();
  assert.ok(errorsOf(root, makeReport({ proposals: [routeProposal({ ops: [] })] })).some((e) => /needs a patch/.test(e)));
  const q = { id: "q-1", kind: "question", title: "Should it end here?", rank: 1, confidence: "medium", now: "a", change: "b", why: "c", touches: "d", risk: "e", recommendation: "f", decisionAsk: "g", options: [{ label: "Yes", what: "stops" }, { label: "No", what: "goes on" }] };
  assert.deepEqual(errorsOf(root, makeReport({ proposals: [q] })), []);
  assert.ok(errorsOf(root, makeReport({ proposals: [{ ...q, ops: routeProposal().ops }] })).some((e) => /cannot carry a patch/.test(e)));
  assert.ok(errorsOf(root, makeReport({ proposals: [{ ...q, options: [{ label: "Only", what: "one" }] }] })).some((e) => /at least two options/.test(e)));
  cleanup(root);
});

test("a patch that no longer matches the file is an error and names what the file says now", () => {
  const root = makeRepo();
  const stale = routeProposal({ ops: [{ op: "set", file: `canon/challenges/${CHALLENGE_ID}.json`, path: "checks[read-the-form].skillOptions", before: ["crafting"], after: ["crafting", "society"] }] });
  const errors = errorsOf(root, makeReport({ proposals: [stale] }));
  assert.ok(errors.some((e) => /expected .* to say something else/.test(e)), errors.join("\n"));
  cleanup(root);
});

test("the report may not reach outside the bot's write surface", () => {
  const root = makeRepo();
  const bad = (file) => errorsOf(root, makeReport({ proposals: [proseProposal({ ops: [{ op: "set", file, path: "notes", before: null, after: "x" }] })] }));
  assert.ok(bad("tools/story/lib.mjs").some((e) => /outside what the QC bot may change/.test(e)));
  assert.ok(bad("canon/world/nobu.md").some((e) => /outside/.test(e)));
  assert.ok(bad(`canon/scenes/${SCENE_ID}.reread.md`).some((e) => /outside/.test(e)));
  assert.ok(bad("data/npcs/nobu.json").some((e) => /may not be changed/.test(e)), "an existing person is never edited");
  assert.ok(bad(`data/scene-briefs/${SCENE_ID}.json`).some((e) => /built copy/.test(e)));
  cleanup(root);
});

test("a new person is created as drafted, with a matching file name, and nothing else", () => {
  const root = makeRepo();
  const create = (content) => makeReport({ proposals: [{ ...proseProposal({ kind: "npc", id: "npc-1", ops: [{ op: "create", file: "data/npcs/kiku.json", content }] }) }] });
  assert.deepEqual(errorsOf(root, create({ id: "kiku", type: "npc", authoring: { status: "drafted" } })), []);
  assert.ok(errorsOf(root, create({ id: "kiku", type: "npc", authoring: { status: "sound" } })).some((e) => /as drafted/.test(e)));
  assert.ok(errorsOf(root, create({ id: "somebody-else", type: "npc", authoring: { status: "drafted" } })).some((e) => /id must match/.test(e)));
  cleanup(root);
});

test("a patch that moves the scene's direction is refused, and the reason names the part", () => {
  const root = makeRepo();
  const mover = proseProposal({ ops: [{ op: "set", file: `canon/scenes/${SCENE_ID}.json`, path: "outro.endsWhen", before: "They leave.", after: "They stay." }] });
  const errors = errorsOf(root, makeReport({ proposals: [mover] }));
  assert.ok(errors.some((e) => /direction/.test(e) && /outro\.endsWhen/.test(e)), errors.join("\n"));
  const dc = routeProposal({ ops: [{ op: "set", file: `canon/challenges/${CHALLENGE_ID}.json`, path: "checks[read-the-form].dc.value", before: 15, after: 20 }] });
  assert.ok(errorsOf(root, makeReport({ proposals: [dc] })).some((e) => /direction/.test(e)));
  cleanup(root);
});

test("two proposals may not edit the same part, so any subset can be accepted", () => {
  const root = makeRepo();
  const a = proseProposal({ id: "a-1", rank: 1 });
  const b = proseProposal({ id: "b-1", rank: 2, ops: [{ op: "set", file: `canon/scenes/${SCENE_ID}.json`, path: "beats[the-exit].text", before: "They leave.", after: "Another version." }] });
  assert.ok(errorsOf(root, makeReport({ proposals: [a, b] })).some((e) => /both change/.test(e)));
  cleanup(root);
});

test("a proposal Ingram declined is not raised again unless it says how it differs", () => {
  const root = makeRepo();
  const p = routeProposal();
  const declined = new Set([proposalFingerprint(p)]);
  assert.ok(errorsOf(root, makeReport({ proposals: [p] }), { declined }).some((e) => /already declined/.test(e)));
  const rewording = routeProposal({ title: "Another way to read it", change: "Worded differently.", ops: [{ ...p.ops[0], after: ["crafting", "perception", "occultism"] }, p.ops[1]] });
  assert.ok(errorsOf(root, makeReport({ proposals: [rewording] }), { declined }).some((e) => /already declined/.test(e)), "a different 'after' on the same words is still the same ask");
  const revisit = { ...p, revisits: "old-1", revisitReason: "She said the Society line was the problem, so this uses Occultism and a shorter line." };
  assert.deepEqual(errorsOf(root, makeReport({ proposals: [revisit] }), { declined }), []);
  assert.ok(errorsOf(root, makeReport({ proposals: [{ ...p, revisits: "old-1" }] }), { declined }).some((e) => /does not say how this differs/.test(e)));
  cleanup(root);
});

test("an approved scene's patches must say that accepting them reopens the approval", () => {
  const root = makeRepo();
  assert.ok(errorsOf(root, makeReport(), { planState: "approved" }).some((e) => /reopens/.test(e)));
  const marked = makeReport({ proposals: [routeProposal({ reopensApproval: true }), proseProposal({ reopensApproval: true })] });
  assert.deepEqual(errorsOf(root, marked, { planState: "approved" }), []);
  assert.deepEqual(errorsOf(root, makeReport(), { planState: "awaiting-read" }), []);
  cleanup(root);
});

test("ids are unique within a report and across reports", () => {
  const root = makeRepo();
  const dup = makeReport({ proposals: [routeProposal(), proseProposal({ id: routeProposal().id })] });
  assert.ok(errorsOf(root, dup).some((e) => /used twice/.test(e)));
  assert.ok(errorsOf(root, makeReport(), { otherIds: new Set([routeProposal().id]) }).some((e) => /another report already uses/.test(e)));
  cleanup(root);
});

test("finalizing fills the scene hash and a fingerprint that depends on what a proposal is about, not how it is worded", () => {
  const report = makeReport({ sceneHash: undefined });
  const done = finalizeReport(report, { hash: "deadbeef" });
  assert.equal(done.sceneHash, "deadbeef");
  assert.ok(done.proposals.every((p) => /^[0-9a-f]{16}$/.test(p.fingerprint)));
  assert.equal(report.proposals[0].fingerprint, undefined, "the input is not changed");
  const reworded = { ...routeProposal(), title: "Something else entirely", why: "Other words." };
  assert.equal(proposalFingerprint(reworded), proposalFingerprint(routeProposal()));
  const elsewhere = routeProposal({ ops: [{ ...routeProposal().ops[0], path: "checks[read-the-form].bySkill" }] });
  assert.notEqual(proposalFingerprint(elsewhere), proposalFingerprint(routeProposal()));
});

test("scene ids with a double hyphen make report ids and paths (regression: the first real scene id failed the pattern)", () => {
  assert.equal(reportPath("qc-episode-c1e1--kit-issue-2026-10-14-1"), "reviews/qc/reports/episode-c1e1--kit-issue/2026-10-14-1.json");
  assert.equal(reportPath("qc-rest--bathhouse-2026-11-02-3"), "reviews/qc/reports/rest--bathhouse/2026-11-02-3.json");
  assert.equal(reportPath("nonsense"), null);
});

test("a report whose patches are already merged lints clean when apply-checking is off", () => {
  const root = makeRepo();
  const merged = makeReport();
  assert.deepEqual(errorsOf(root, merged, { applyCheck: false }), []);
  cleanup(root);
});
