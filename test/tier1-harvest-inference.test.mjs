// Tier 1 — the harvest-inference classifier (core/harvest-inference.mjs).
// Milliseconds, no Foundry, no network. See that file's header for the
// honest scope note on why Tier 2's scene-context pairing degrades
// gracefully rather than being faked.

import { test } from "node:test";
import assert from "node:assert/strict";

import { TIER, classifyMessage, inferSession } from "../module/blank-inheritance/scripts/core/harvest-inference.mjs";

function checkRecord({ speaker = "Kimura Etsuko", author = "Player One", slug = "stealth", outcome = "success", dc = 15, at = "2026-09-16T20:00:00.000Z" } = {}) {
  return { id: "m1", at, author, speaker, text: "", rolls: [{ formula: "1d20+5", total: 17 }], check: { type: "skill-check", slug, outcome, dc }, links: [] };
}
function linkRecord({ speaker = "Gamemaster", type = "Actor", ref = "abc123", label = "The Commander", at = "2026-09-16T20:05:00.000Z" } = {}) {
  return { id: "m2", at, author: speaker, speaker, text: "", rolls: [], check: null, links: [{ type, ref, label }] };
}
function plainRecord(text = "Just some roleplay.") {
  return { id: "m3", at: "2026-09-16T20:10:00.000Z", author: "Player One", speaker: null, text, rolls: [], check: null, links: [] };
}

test("classifyMessage: a message with harvestKind set is trusted outright, Tier 1, bypassing check/link inference entirely", () => {
  const record = { id: "m9", at: "2026-09-16T20:30:00.000Z", author: "Gamemaster", speaker: null, text: "Q: Who do you love?\nA: My sister.", rolls: [], check: null, links: [], harvestKind: "intake-answers" };
  const result = classifyMessage(record);
  assert.equal(result.tier, TIER.HIGH);
  assert.equal(result.kind, "intake-answers", "the candidate's own kind is whatever harvestKind named, not a fixed 'check'/'link' value");
  assert.equal(result.summary, record.text, "the full text passes through untouched -- no reformatting, unlike the check/link summaries");
});

test("classifyMessage: harvestKind wins even if the SAME message also happens to carry a check or links", () => {
  const record = { id: "m10", at: "2026-09-16T20:31:00.000Z", author: "Gamemaster", speaker: null, text: "narrative text", rolls: [], check: { type: "skill-check", slug: "stealth", outcome: "success", dc: 15 }, links: [{ type: "Actor", ref: "x", label: "Someone" }], harvestKind: "intake-answers" };
  const result = classifyMessage(record);
  assert.equal(result.kind, "intake-answers");
  assert.equal(Array.isArray(result), false, "must return the single narrative candidate, not the links array shape");
});

test("classifyMessage: a structured check with no expectedSkills hint is Tier 1, trusted on its own terms", () => {
  const result = classifyMessage(checkRecord());
  assert.equal(result.tier, TIER.HIGH);
  assert.equal(result.kind, "check");
  assert.match(result.summary, /Kimura Etsuko rolled Stealth: success \(DC 15\)\./);
});

test("classifyMessage: a check against a skill NOT in the supplied expectedSkills set drops to Tier 2", () => {
  const result = classifyMessage(checkRecord({ slug: "survival" }), { expectedSkills: new Set(["stealth", "diplomacy"]) });
  assert.equal(result.tier, TIER.MEDIUM);
});

test("classifyMessage: a check against a skill that IS in expectedSkills stays Tier 1", () => {
  const result = classifyMessage(checkRecord({ slug: "stealth" }), { expectedSkills: new Set(["stealth", "diplomacy"]) });
  assert.equal(result.tier, TIER.HIGH);
});

test("classifyMessage: every real outcome value produces a readable label, not a raw camelCase string", () => {
  assert.match(classifyMessage(checkRecord({ outcome: "criticalSuccess" })).summary, /critical success/);
  assert.match(classifyMessage(checkRecord({ outcome: "criticalFailure" })).summary, /critical failure/);
  assert.match(classifyMessage(checkRecord({ outcome: "failure" })).summary, /: failure/);
});

test("classifyMessage: a missing DC is omitted from the summary, not rendered as 'DC null'", () => {
  const record = checkRecord({ dc: null });
  assert.doesNotMatch(classifyMessage(record).summary, /DC/);
});

test("classifyMessage: falls back to author when there is no speaker (e.g. a GM-triggered roll with no actor)", () => {
  const record = checkRecord({ speaker: null, author: "Gamemaster" });
  assert.match(classifyMessage(record).summary, /^Gamemaster rolled/);
});

test("classifyMessage: a bare link with no roll is Tier 3, verb-free, never asserts what happened", () => {
  const [result] = classifyMessage(linkRecord());
  assert.equal(result.tier, TIER.LOW);
  assert.equal(result.kind, "link");
  assert.match(result.summary, /The Commander was referenced by Gamemaster \(no action recorded\)\./);
  assert.doesNotMatch(result.summary, /\b(used|took|gave|cast|equipped)\b/i, "must never invent a verb for a bare link");
});

test("classifyMessage: multiple links in one message each become their own candidate", () => {
  const record = {
    ...linkRecord(),
    links: [
      { type: "Actor", ref: "a1", label: "Nobu" },
      { type: "Item", ref: "i1", label: "a medic kit" }
    ]
  };
  const results = classifyMessage(record);
  assert.equal(results.length, 2);
  assert.match(results[0].summary, /Nobu was referenced/);
  assert.match(results[1].summary, /a medic kit was referenced/);
});

test("classifyMessage: a link with no label falls back to a plain type+ref description", () => {
  const record = linkRecord({ label: null, type: "Item", ref: "xyz" });
  const [result] = classifyMessage(record);
  assert.match(result.summary, /^Item xyz was referenced/);
});

test("classifyMessage: ordinary roleplay text (no check, no link) is not a candidate at all -- null, not a low-confidence guess", () => {
  assert.equal(classifyMessage(plainRecord()), null);
});

test("inferSession: the GM's own log entries are always Tier 1, passed through as ground truth", () => {
  const { highConfidence } = inferSession({
    gmLogEntries: [{ at: "2026-09-16T19:00:00.000Z", text: "npc: the caretaker lies" }]
  });
  assert.equal(highConfidence.length, 1);
  assert.equal(highConfidence[0].tier, TIER.HIGH);
  assert.equal(highConfidence[0].kind, "gm-note");
  assert.equal(highConfidence[0].summary, "npc: the caretaker lies");
});

test("inferSession: splits chat records correctly between highConfidence and the batch", () => {
  const { highConfidence, batch } = inferSession({
    chatRecords: [checkRecord(), linkRecord(), plainRecord()]
  });
  assert.equal(highConfidence.length, 1, "the check result");
  assert.equal(batch.length, 1, "the bare link");
});

test("inferSession: an out-of-context check (via expectedSkills) lands in the batch, not highConfidence", () => {
  const { highConfidence, batch } = inferSession({
    chatRecords: [checkRecord({ slug: "survival" })],
    expectedSkills: new Set(["stealth"])
  });
  assert.equal(highConfidence.length, 0);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].tier, TIER.MEDIUM);
});

test("inferSession: both lists are sorted oldest-first by timestamp", () => {
  const late = checkRecord({ at: "2026-09-16T22:00:00.000Z" });
  const early = { ...checkRecord({ at: "2026-09-16T18:00:00.000Z" }), id: "early" };
  const { highConfidence } = inferSession({ chatRecords: [late, early] });
  assert.deepEqual(highConfidence.map((c) => c.at), ["2026-09-16T18:00:00.000Z", "2026-09-16T22:00:00.000Z"]);
});

test("inferSession: empty input is safe and produces empty lists", () => {
  assert.deepEqual(inferSession({}), { highConfidence: [], batch: [] });
  assert.deepEqual(inferSession(), { highConfidence: [], batch: [] });
});
