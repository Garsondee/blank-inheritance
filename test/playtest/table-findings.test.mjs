/**
 * The table channel and the findings log (tools/playtest/core/table.mjs, findings.mjs, args.mjs).
 *
 * The most important thing here is the first test: what keeps the minds separate is that a player can never be handed what only the GM
 * or a whisper's recipients may see. A canary string in a GM-private entry must never appear in any player's reading, whatever they ask for.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { KINDS, makeEntry, readFor, render, renderMany, visibleTo } from "../../tools/playtest/core/table.mjs";
import { SEVERITIES, clusterFindings, makeFinding, nextId, parseKind, parseSeverity, reclassify, similarity, sortFindings, tally } from "../../tools/playtest/core/findings.mjs";
import { parseArgs } from "../../tools/playtest/core/args.mjs";

const CANARY = "CANARY-the-doctor-already-knows-everything";
const build = () => {
  const entries = [];
  const add = (input) => {
    const r = makeEntry(input, { n: entries.length + 1, now: "2026-10-06T10:00:00Z" });
    assert.equal(r.ok, true, r.error);
    entries.push(r.entry);
  };
  add({ seat: "GM", kind: "gm", text: "The queue shuffles forward." });
  add({ seat: "GM", kind: "private", text: `Secret: ${CANARY}` });
  add({ seat: "P1", kind: "whisper", to: ["P3"], text: "pass the note to P3" });
  add({ seat: "P2", kind: "say", text: "I ask the clerk about the form." });
  add({ seat: "ORCH", kind: "system", text: "Scene 2 begins." });
  return entries;
};

test("a player is never handed a GM-private entry or a whisper they are not part of (the canary)", () => {
  const entries = build();
  for (const seat of ["P1", "P2", "P3", "P4", "P5", "P6"]) {
    for (const opts of [{}, { since: 0, limit: 1000 }, { limit: 1 }]) {
      const text = renderMany(readFor(entries, seat, opts).entries);
      assert.ok(!text.includes(CANARY), `${seat} must never read the GM's private note`);
    }
  }
  assert.ok(renderMany(readFor(entries, "GM").entries).includes(CANARY), "the GM reads their own private note");
  assert.ok(renderMany(readFor(entries, "ORCH").entries).includes(CANARY), "staff see everything");
  assert.ok(renderMany(readFor(entries, "SCRIBE").entries).includes("pass the note"), "the Scribe sees whispers");
});

test("a whisper reaches its author and its recipients only", () => {
  const whisper = build().find((e) => e.kind === "whisper");
  assert.equal(visibleTo(whisper, "P1"), true);
  assert.equal(visibleTo(whisper, "P3"), true);
  assert.equal(visibleTo(whisper, "P2"), false);
  assert.equal(visibleTo(whisper, "GM"), false, "even the GM does not overhear a note passed between players");
});

test("entries are validated: a kind, some words, and recipients only for a whisper", () => {
  const ctx = { n: 1, now: "t" };
  assert.match(makeEntry({ seat: "P1", kind: "shout", text: "x" }, ctx).error, /unknown kind/);
  assert.match(makeEntry({ seat: "P1", kind: "say", text: "   " }, ctx).error, /nothing to say/);
  assert.match(makeEntry({ seat: "P1", kind: "whisper", text: "psst" }, ctx).error, /whisper to/);
  assert.match(makeEntry({ seat: "P1", kind: "say", text: "hi", to: ["P2"] }, ctx).error, /only a whisper/);
  assert.match(makeEntry({ seat: "P1", kind: "say", text: "x".repeat(4001) }, ctx).error, /too long/);
  assert.deepEqual(KINDS.includes("private"), true);
});

test("readFor gives what is new, the latest when there is too much, and the last number", () => {
  const entries = build();
  const { entries: after2, last } = readFor(entries, "P2", { since: 2 });
  assert.deepEqual(after2.map((e) => e.n), [4, 5]);
  assert.equal(last, 5);
  const { entries: tail, skipped } = readFor(entries, "P2", { limit: 2 });
  assert.equal(tail.length, 2);
  assert.equal(skipped, 1, "P2 could see 3 entries (GM, their own, system) and was shown 2");
});

test("render reads like a table: speech, action, narration, whisper", () => {
  const [gm, , whisper, say] = build();
  assert.match(render(gm), /^\[1\] GM: The queue/);
  assert.match(render(say), /^\[4\] P2 says: I ask/);
  assert.match(render(whisper), /P1 whispers to P3/);
  assert.match(render({ n: 9, seat: "P4", who: "Dax", kind: "do", text: "leans on the counter." }), /Dax \(P4\) leans/);
  assert.match(renderMany(build(), { maxChars: 60 }), /earlier entr/);
});

test("severity and kind words are forgiving, and a finding without evidence from an agent is refused", () => {
  assert.equal(parseSeverity("s1"), "S1");
  assert.equal(parseSeverity("3"), "S3");
  assert.equal(parseSeverity("blocker"), "S0");
  assert.equal(parseSeverity("meh"), null);
  assert.equal(parseKind("friction"), "ux-friction");
  assert.equal(parseKind("gap"), "material-gap");
  assert.equal(parseKind("nonsense"), null);
  const ctx = { id: "F-0001", run: "r", now: "t", channel: "agent", seat: "P2" };
  const refused = makeFinding({ kind: "bug", severity: "S1", summary: "A button does nothing" }, ctx);
  assert.equal(refused.ok, false);
  assert.match(refused.errors.join(" "), /no evidence, no finding/);
  const ok = makeFinding({ kind: "bug", severity: "S1", summary: "A button does nothing", repro: "press it" }, { ...ctx, autoEvidence: ["seats/P2/evidence/x.png"] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.finding.repro, ["press it"]);
  assert.equal(makeFinding({ kind: "bug", severity: "S1", summary: "x" }, { ...ctx, channel: "instrument" }).ok, true, "an instrument carries its own evidence");
  assert.match(makeFinding({ kind: "bug", severity: "S9", summary: "x" }, { ...ctx, channel: "instrument" }).errors.join(), /severity/);
  assert.match(makeFinding({ kind: "bug", severity: "S1", summary: "x".repeat(301) }, { ...ctx, channel: "instrument" }).errors.join(), /too long/);
});

test("ids count on, findings sort worst first, and the tally counts both ways", () => {
  assert.equal(nextId([]), "F-0001");
  assert.equal(nextId([{ id: "F-0007" }, { id: "F-0003" }]), "F-0008");
  const fs = [
    { id: "F-1", severity: "S2", kind: "bug", t: "2" },
    { id: "F-2", severity: "S0", kind: "leak", t: "3" },
    { id: "F-3", severity: "S2", kind: "a11y", t: "1" }
  ];
  assert.deepEqual(sortFindings(fs).map((f) => f.id), ["F-2", "F-3", "F-1"]);
  const t = tally(fs);
  assert.equal(t.total, 3);
  assert.equal(t.bySeverity.S2, 2);
  assert.equal(t.byKind.bug, 1);
  assert.deepEqual(SEVERITIES, ["S0", "S1", "S2", "S3"]);
});

test("a finding the orchestrator understood better is corrected on the record, and a fault in the rig is never counted as the game's", () => {
  const f = { id: "F-0010", kind: "bug", severity: "S1", summary: "An empty invisible element swallows clicks: svg", t: "1" };
  const fixed = reclassify(f, { kind: "harness", severity: "S3", reason: "the deck's decorative dial, a detector false positive" }, { now: "2026-10-06T00:00:00Z" });
  assert.equal(fixed.ok, true);
  assert.equal(fixed.finding.kind, "rig", "a word for the kind is understood");
  assert.equal(fixed.finding.severity, "S3");
  assert.deepEqual(fixed.finding.reclassified, [{ at: "2026-10-06T00:00:00Z", from: { kind: "bug", severity: "S1" }, to: { kind: "rig", severity: "S3" }, reason: "the deck's decorative dial, a detector false positive" }]);
  assert.equal(f.kind, "bug", "the original is not touched");
  assert.equal(reclassify(fixed.finding, { severity: "S2", reason: "second thoughts" }, { now: "t2" }).finding.reclassified.length, 2, "the history is kept, not replaced");
  assert.match(reclassify(f, { kind: "rig" }, { now: "t" }).errors.join(), /reason is required/);
  assert.match(reclassify(f, { kind: "nonsense", reason: "x" }, { now: "t" }).errors.join(), /kind must be one of/);
  assert.match(reclassify(f, { severity: "S9", reason: "x" }, { now: "t" }).errors.join(), /severity/);
  assert.match(reclassify(f, { reason: "x" }, { now: "t" }).errors.join(), /nothing to change/);
  const t = tally([f, fixed.finding, { id: "F-0011", kind: "bug", severity: "S2", t: "2" }]);
  assert.equal(t.total, 2, "the rig fault is not a finding about the game");
  assert.equal(t.rig, 1);
  assert.equal(t.bySeverity.S3, 0, "and does not raise a severity count");
  assert.equal(t.byKind.rig, 1);
});

test("one cause reported nine ways clusters to one, and different causes do not", () => {
  const f = (id, summary, kind = "bug", scene = "s1") => ({ id, kind, severity: "S2", summary, scene, t: id });
  const clusters = clusterFindings([f("a", "The Continue button does nothing on the ancestry page"), f("b", "Pressing Continue on the ancestry page does nothing"), f("c", "The notebook text cannot be selected", "ux-friction"), f("d", "A different bug: the check window covers the map")]);
  assert.equal(clusters.length, 3);
  assert.equal(clusters.find((c) => c.members.length === 2).members.map((m) => m.id).join(), "a,b");
  assert.ok(similarity("the same words here", "the same words here") === 1);
  assert.equal(similarity("", "anything"), 0);
});

test("the argument parser handles valued flags, booleans, repeats and --", () => {
  const { flags, positionals } = parseArgs(["click", "--right", "--into", "r4", "--repro", "a", "--repro", "b", "--no-clear", "--scale=0.5", "--", "--literal"], { valued: ["into", "repro", "scale"] });
  assert.deepEqual(positionals, ["click", "--literal"]);
  assert.equal(flags.right, true);
  assert.equal(flags.into, "r4");
  assert.deepEqual(flags.repro, ["a", "b"]);
  assert.equal(flags.clear, false);
  assert.equal(flags.scale, "0.5");
  assert.equal(parseArgs(["--into"], { valued: ["into"] }).flags.into, true, "a valued flag with nothing after it is just present");
  assert.deepEqual(parseArgs(["words", "with", "spaces"]).positionals, ["words", "with", "spaces"]);
});
