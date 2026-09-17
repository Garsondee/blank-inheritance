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
