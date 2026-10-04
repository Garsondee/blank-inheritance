// Tier 1 — core/beat-autofire.mjs: one press per moment (2026-10-04, D059).
//
// Found starting The Road In in the live Runner: three presses and a confirm,
// and the letter shown with no objective given. Now showing a beat's handout
// gives that beat's objective, and marking a beat done fires its objective
// chips (on a pass, for a check), with un-marking undoing what it did.
// Entrances, name reveals and handouts are never fired by a tick.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  UNDO_ACT,
  chipsToFireOnDone,
  chipsToFireOnHandout,
  firedTriggerIds,
  undoFor
} from "../module/blank-inheritance/scripts/core/beat-autofire.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const beat = {
  id: "the-counter",
  triggers: [
    { id: "nobu-appears", kind: "npc-enter", npcRef: "nobu" },
    { id: "enrolment-kit", kind: "objective", act: "tick", objectiveRef: "c1e1-report-for-enrolment", partRef: "kit" },
    { id: "close-enrolment", kind: "objective", act: "close", objectiveRef: "c1e1-report-for-enrolment" }
  ]
};

test("marking a beat done fires its objective chips in authored order, and never an entrance", () => {
  assert.deepEqual(chipsToFireOnDone(beat).map((t) => t.id), ["enrolment-kit", "close-enrolment"]);
});

test("a check beat fires its chips only on a pass: 'line powered' is not true on a failed power check", () => {
  const check = { id: "power-the-line", triggers: [{ id: "drains-powered", kind: "objective", act: "tick", objectiveRef: "c1e1-storm-drains", partRef: "power" }] };
  assert.equal(chipsToFireOnDone(check, { degree: "success" }).length, 1);
  assert.equal(chipsToFireOnDone(check, { degree: "criticalSuccess" }).length, 1);
  assert.equal(chipsToFireOnDone(check, { degree: "failure" }).length, 0);
  assert.equal(chipsToFireOnDone(check, { degree: "criticalFailure" }).length, 0);
});

test("a chip already pressed never fires twice, and one authored auto:false never fires by itself", () => {
  assert.deepEqual(chipsToFireOnDone(beat, { fired: new Set(["enrolment-kit"]) }).map((t) => t.id), ["close-enrolment"]);
  const hatch = { id: "the-hatch", triggers: [{ id: "docket-in-time", kind: "objective", act: "tick", objectiveRef: "c1e1-the-docket", partRef: "back-by-1900", auto: false }] };
  assert.equal(chipsToFireOnDone(hatch).length, 0, "being in by nineteen hundred depends on how it went");
});

test("showing a handout gives the give chips on the beat it was shown from, or the beat that names it", () => {
  const beats = [
    { id: "the-letter", handoutRef: "acceptance-letter", triggers: [{ id: "give-enrolment", kind: "objective", act: "give", objectiveRef: "c1e1-report-for-enrolment" }] },
    { id: "other", triggers: [{ id: "show", kind: "reveal-handout", handoutRef: "map" }, { id: "give-map", kind: "objective", act: "give", objectiveRef: "o-map" }, { id: "tick-map", kind: "objective", act: "tick", objectiveRef: "o-map", partRef: "p" }] }
  ];
  assert.deepEqual(chipsToFireOnHandout(beats, "acceptance-letter").chips.map((t) => t.id), ["give-enrolment"], "from the Kit list, matched by the beat's handoutRef");
  assert.deepEqual(chipsToFireOnHandout(beats, "map").chips.map((t) => t.id), ["give-map"], "matched by an inline reveal-handout chip; only gives, never a tick");
  assert.equal(chipsToFireOnHandout(beats, "acceptance-letter", { fired: new Set(["give-enrolment"]) }).chips.length, 0);
  assert.equal(chipsToFireOnHandout(beats, "nothing").beat, null);
});

test("un-marking undoes what marking did, newest first, where an undo exists", () => {
  const fired = [
    { id: "a", act: "give", objectiveRef: "o" },
    { id: "b", act: "tick", objectiveRef: "o", partRef: "p" },
    { id: "c", act: "close", objectiveRef: "o" }
  ];
  assert.deepEqual(undoFor(fired).map((f) => [f.id, f.undo]), [["c", "reopen"], ["b", "untick"]], "a give cannot be taken back: the players have seen it");
  assert.equal(UNDO_ACT.strike, "untick");
  assert.deepEqual(undoFor(undefined), []);
});

test("a chip pressed by hand is read back from the log by its beat and id, and an auto-fired one is not", () => {
  const entries = [
    { context: { subject: "the-counter::trigger::nobu-appears" } },
    { context: { subject: "the-counter::auto::enrolment-kit" } },
    { context: { subject: "other::trigger::x" } }
  ];
  assert.deepEqual([...firedTriggerIds(entries, "the-counter")], ["nobu-appears"]);
});

test("REAL DATA: auto:false is set only on objective chips, and every objective chip's act has an undo rule", () => {
  for (const file of readdirSync(path.join(ROOT, "canon", "scenes")).filter((f) => f.endsWith(".json"))) {
    const brief = JSON.parse(readFileSync(path.join(ROOT, "canon", "scenes", file), "utf8"));
    for (const b of brief.beats ?? []) {
      for (const t of b.triggers ?? []) {
        if ("auto" in t) assert.equal(t.kind, "objective", `${file} ${b.id}/${t.id}: auto is an objective chip's field`);
        if (t.kind === "objective") assert.ok(t.act in UNDO_ACT, `${file} ${b.id}/${t.id}: act ${t.act}`);
      }
    }
  }
});

test("REAL DATA: the three Episode One chips that depend on how it went never fire by themselves", () => {
  const hatch = JSON.parse(readFileSync(path.join(ROOT, "canon", "scenes", "episode-c1e1--the-tram-back.json"), "utf8")).beats.find((b) => b.id === "the-hatch");
  assert.deepEqual(chipsToFireOnDone(hatch).map((t) => t.id), ["close-docket"]);
  const waders = JSON.parse(readFileSync(path.join(ROOT, "canon", "scenes", "episode-c1e1--the-walk-down.json"), "utf8")).beats.find((b) => b.id === "the-waders");
  assert.deepEqual(chipsToFireOnDone(waders).map((t) => t.id), ["drains-waders"]);
});
