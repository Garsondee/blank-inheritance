// Tier 1 — notes taken while a scene runs (scripts/core/scene-brief.mjs):
// which beat a note attaches to, and reading them back out of the log.

import { test } from "node:test";
import assert from "node:assert/strict";

import { noteCounts, noteTargetFor, notesForBeat } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

const beats = [
  { id: "the-queue", text: "Go round the table once." },
  { id: "form-12b", text: "Hand out Form 12-B." },
  { id: "the-flag", text: "Tell each of them privately." }
];

const entry = (text, subject, tag = null) => ({ text, tag, context: { subject } });

test("a note attaches to the beat most recently ticked", () => {
  const runState = {
    ticked: {
      "the-queue": { at: "2026-09-18T10:00:00.000Z" },
      "form-12b": { at: "2026-09-18T10:05:00.000Z" }
    }
  };
  const target = noteTargetFor(beats, runState);
  assert.equal(target.id, "form-12b", "the later tick wins, not the later beat in the list");
  assert.equal(target.text, "Hand out Form 12-B.");
});

test("order in the list never overrides order in time", () => {
  // Ticking an EARLIER beat last is normal -- a GM goes back. The note
  // belongs to what they just marked, not to whatever sits lowest.
  const runState = {
    ticked: {
      "the-flag": { at: "2026-09-18T10:00:00.000Z" },
      "the-queue": { at: "2026-09-18T10:09:00.000Z" }
    }
  };
  assert.equal(noteTargetFor(beats, runState).id, "the-queue");
});

test("nothing ticked yet means the note belongs to the scene, not to a beat", () => {
  assert.equal(noteTargetFor(beats, { ticked: {} }), null);
  assert.equal(noteTargetFor(beats, {}), null);
  assert.equal(noteTargetFor([], { ticked: { x: { at: "now" } } }), null, "a tick for a beat that is not in this brief is not a target");
});

test("a degree recorded on a beat still counts as ticking it", () => {
  const runState = { ticked: { "form-12b": { at: "2026-09-18T10:05:00.000Z", degree: "success" } } };
  assert.equal(noteTargetFor(beats, runState).id, "form-12b");
});

test("notes are read back out of the log by subject, oldest first", () => {
  const entries = [
    entry("Kubo appeared", "form-12b", "npc"),
    entry("they all compared forms", "the-flag"),
    entry("second thought on the form", "form-12b")
  ];
  const got = notesForBeat(entries, "form-12b");
  assert.deepEqual(got.map((e) => e.text), ["Kubo appeared", "second thought on the form"]);
  assert.equal(got[0].tag, "npc", "the leading token doctrine §10.3 parses survives into the margin");
  assert.deepEqual(notesForBeat(entries, "nothing-here"), []);
  assert.deepEqual(notesForBeat(entries, null), [], "a scene-level note must not leak into every beat");
});

test("an entry with no subject belongs to nobody in particular", () => {
  const entries = [entry("general remark", null), entry("about the form", "form-12b")];
  assert.deepEqual(noteCounts(entries), { "form-12b": 1 });
});

test("counts are per beat, for the running order's margin", () => {
  const entries = [entry("a", "x"), entry("b", "x"), entry("c", "y")];
  assert.deepEqual(noteCounts(entries), { x: 2, y: 1 });
  assert.deepEqual(noteCounts([]), {});
});

/* ---------------------------------------------------------------- */
/*  Folding the panel                                                */
/* ---------------------------------------------------------------- */

import { RUNNER_SECTIONS, sectionOpen, sectionStates } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

test("the panel opens on what gets used every minute, not on what is read once", () => {
  // Measured: Intake Medicals was 5,293px of panel in a 655px window, with
  // the running order below two screens of read-once material.
  const open = RUNNER_SECTIONS.filter((s) => s.open).map((s) => s.id);
  const shut = RUNNER_SECTIONS.filter((s) => !s.open).map((s) => s.id);
  assert.ok(open.includes("beats"), "the running order is the one thing that must never be hidden");
  assert.ok(open.includes("goal"), "the goal is short and is the point");
  assert.ok(shut.includes("cast"), "the cast's full briefs are looked up when someone speaks");
  assert.ok(shut.includes("outro"), "how it ends is needed once, at the end");
  assert.ok(shut.includes("intro"), "and 'getting in' is read once, out loud, at the top — leaving it open kept the beats below the fold");
});

test("a GM's own toggle beats the default, in both directions", () => {
  assert.equal(sectionOpen("cast", {}), false, "closed by default");
  assert.equal(sectionOpen("cast", { cast: true }), true, "opened by the GM stays open");
  assert.equal(sectionOpen("beats", { beats: false }), true === false, "and a GM may close even the beats");
});

test("an unknown section opens rather than hiding itself", () => {
  // New content is likelier than something worth hiding, and a section that
  // silently never appears is the worst of the two failures.
  assert.equal(sectionOpen("something-new", {}), true);
});

test("sectionStates answers for every section at once, for a template that cannot call a function", () => {
  const states = sectionStates({ cast: true });
  assert.equal(Object.keys(states).length, RUNNER_SECTIONS.length);
  assert.equal(states.beats, true);
  assert.equal(states.cast, true, "the override is applied");
  assert.equal(states.outro, false);
  assert.deepEqual(sectionStates(), sectionStates({}), "no overrides is the same as empty overrides");
});

/* ---------------------------------------------------------------- */
/*  Offering to close                                                */
/* ---------------------------------------------------------------- */

import { shouldOfferClose } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

test("leaving a scene offers to close it only once it has actually been run", () => {
  // Doctrine §10.3a wants friction at the boundary — which is not the same
  // thing as friction every time a GM flicks between briefs to read them.
  assert.equal(shouldOfferClose({ ticked: {} }), false, "opened and read is not run");
  assert.equal(shouldOfferClose({}), false);
  assert.equal(shouldOfferClose({ ticked: { "the-queue": { at: "2026-09-18T10:00:00.000Z" } } }), true);
});

test("a scene already closed never asks again", () => {
  const run = { ticked: { "the-queue": { at: "2026-09-18T10:00:00.000Z" } }, closedAt: "2026-09-18T11:00:00.000Z" };
  assert.equal(shouldOfferClose(run), false, "its closure is already on record");
});

/* ---------------------------------------------------------------- */
/*  Pacing                                                           */
/* ---------------------------------------------------------------- */

import { expectedMinutes, pacing } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

test("the expected length is read out of the brief's own prose", () => {
  // These are the real strings the seven Session One briefs carry.
  assert.deepEqual(expectedMinutes("20-25 minutes"), { low: 20, high: 25 });
  assert.deepEqual(expectedMinutes("30-40 minutes, because every player gets a private scene"), { low: 30, high: 40 });
  assert.deepEqual(
    expectedMinutes("30-45 minutes with the optional hazard, 20-30 without"),
    { low: 30, high: 45 },
    "the headline range wins; a brief that qualifies itself afterwards still leads with a number"
  );
  assert.deepEqual(expectedMinutes("about 15 minutes"), { low: 15, high: 15 });
});

test("an unparseable length gets no readout rather than an invented one", () => {
  assert.equal(expectedMinutes("as long as it takes"), null);
  assert.equal(expectedMinutes(null), null);
  assert.equal(expectedMinutes(""), null);
  assert.equal(expectedMinutes("40-20 minutes"), null, "a backwards range is not a range");
});

test("pacing states the elapsed time against the expected window", () => {
  const startedAt = "2026-09-18T19:00:00.000Z";
  const at = (mins) => pacing({ startedAt, now: new Date(Date.parse(startedAt) + mins * 60000).toISOString(), runsAbout: "20-25 minutes" });

  assert.equal(at(5).state, "early");
  assert.equal(at(22).state, "inside");
  assert.equal(at(40).state, "over");
  assert.equal(at(22).label, "22 min · 20–25");
  assert.equal(at(22).elapsedMinutes, 22);
});

test("only running over is flagged, and only as a fact", () => {
  // A GM twelve minutes over on a scene the table is enjoying is not doing
  // anything wrong, so exactly one state carries any emphasis.
  const startedAt = "2026-09-18T19:00:00.000Z";
  const at = (mins) => pacing({ startedAt, now: new Date(Date.parse(startedAt) + mins * 60000).toISOString(), runsAbout: "20-25 minutes" });
  assert.equal(at(5).isOver, false);
  assert.equal(at(22).isOver, false);
  assert.equal(at(40).isOver, true);
});

test("a scene not yet started, or with no stated length, still answers safely", () => {
  const unstarted = pacing({ startedAt: null, runsAbout: "20-25 minutes" });
  assert.equal(unstarted.started, false);
  assert.equal(unstarted.label, "20–25 min", "it can still say what it expects");

  const noLength = pacing({ startedAt: "2026-09-18T19:00:00.000Z", now: "2026-09-18T19:10:00.000Z", runsAbout: "as long as it takes" });
  assert.equal(noLength.state, "running");
  assert.equal(noLength.label, "10 min");
  assert.equal(noLength.isOver, false);

  assert.equal(pacing({ startedAt: "not a date", now: "2026-09-18T19:10:00.000Z" }).started, false);
  assert.equal(pacing({}).started, false);
});
