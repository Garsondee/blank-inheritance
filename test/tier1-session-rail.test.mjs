// Tier 1 — the session rail across the top of the GM's screen
// (scripts/core/session-rail.mjs). Ingram's brief, 2026-09-23: see how much
// time is left, where we are in the session, and mark it when scenes change
// or the log records something.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MARK_TEXT,
  clockLabel,
  minutesOfDay,
  parseClock,
  railMarks,
  railModel,
  railPct,
  railTicks,
  railWindow,
  sceneBands
} from "../module/blank-inheritance/scripts/core/session-rail.mjs";

const at = (h, m = 0) => h * 60 + m;
const MONDAY = railWindow(); // 19:30–22:30, drawn 19:00–23:30

test("parseClock reads 24-hour HH:MM and refuses anything that would silently move the evening", () => {
  assert.equal(parseClock("19:30"), 1170);
  assert.equal(parseClock("7:05"), 425);
  assert.equal(parseClock(" 24:00 "), 1440, "a session may run to midnight");
  for (const bad of ["7.30", "19:3", "25:00", "24:30", "19:60", "", null, "seven"]) {
    assert.throws(() => parseClock(bad), /parseClock/, `accepted ${JSON.stringify(bad)}`);
  }
});

test("clockLabel and minutesOfDay round-trip a time of day", () => {
  assert.equal(clockLabel(1170), "19:30");
  assert.equal(clockLabel(1440 + 15), "00:15", "past midnight wraps rather than printing 24:15");
  assert.equal(minutesOfDay(new Date(2026, 8, 21, 20, 15, 30)), 20 * 60 + 15.5);
});

test("the rail draws the session with a lead-in and an overrun, capped at midnight because the log is one file a day", () => {
  assert.deepEqual(MONDAY, { start: at(19), end: at(23, 30), sessionStart: at(19, 30), sessionEnd: at(22, 30) });
  const late = railWindow({ sessionStart: "21:00", sessionEnd: "23:45" });
  assert.equal(late.end, 1440);
  assert.throws(() => railWindow({ sessionStart: "22:00", sessionEnd: "21:00" }), /must end after it starts/);
});

test("railPct clamps to the rail's own ends", () => {
  assert.equal(railPct(at(19), MONDAY), 0);
  assert.equal(railPct(at(23, 30), MONDAY), 100);
  assert.equal(railPct(at(18), MONDAY), 0);
  assert.equal(railPct(at(23, 59), MONDAY), 100);
  assert.equal(railPct(at(21, 15), MONDAY), 50);
});

test("ticks every half hour, labelled only on the hour", () => {
  const ticks = railTicks(MONDAY);
  assert.deepEqual(ticks.filter((t) => t.major).map((t) => t.label), ["19:00", "20:00", "21:00", "22:00", "23:00"]);
  assert.ok(ticks.filter((t) => !t.major).every((t) => t.label === null));
  assert.equal(ticks.length, 10);
});

test("scene bands merge consecutive events in one scene, end where the next scene begins, and the last runs to now", () => {
  const bands = sceneBands([
    { minutes: at(19, 40), scene: "Intake Medicals" },
    { minutes: at(19, 55), scene: "Intake Medicals" },
    { minutes: at(20, 20), scene: "Kit Issue" },
    { minutes: at(20, 25), scene: null },
    { minutes: at(20, 50), scene: "Kit Issue" }
  ], MONDAY, at(21, 5));
  assert.deepEqual(bands.map((b) => [b.scene, b.from, b.to, b.current]), [
    ["Intake Medicals", "19:40", "20:20", false],
    ["Kit Issue", "20:20", "21:05", true]
  ]);
  assert.equal(bands[0].length, "40m");
  assert.deepEqual(bands.map((b) => b.shade), [0, 1], "neighbouring bands alternate shade so they never read as one");
});

test("a scene that began before the lead-in still shows as the band the evening opened in", () => {
  const [band] = sceneBands([{ minutes: at(17, 0), scene: "Landing" }], MONDAY, at(19, 45));
  assert.equal(band.startPct, 0);
  assert.equal(band.current, true);
});

test("pins: one per entry inside the window, a Mark drawn as a mark, a tag kept; nothing before the lead-in or in the future", () => {
  const marks = railMarks([
    { minutes: at(18, 30), text: "before the table sat down" },
    { minutes: at(19, 45), text: "The goon wants papers." },
    { minutes: at(20, 0), tag: "decision", text: "They bluff." },
    { minutes: at(20, 5), text: MARK_TEXT },
    { minutes: at(22, 0), text: "the future" }
  ], MONDAY, at(20, 10));
  assert.deepEqual(marks.map((m) => [m.time, m.kind]), [["19:45", "entry"], ["20:00", "tag"], ["20:05", "mark"]]);
  assert.equal(marks[1].tag, "decision");
});

test("railModel says how long is left in the rail's own short words, in all three phases", () => {
  const before = railModel({ nowMinutes: at(19, 10), window: MONDAY });
  assert.equal(before.phase, "before");
  assert.equal(before.remaining, "Starts in 20m");
  assert.equal(before.percent, 0);

  const during = railModel({ nowMinutes: at(21, 0), window: MONDAY });
  assert.equal(during.phase, "during");
  assert.equal(during.remaining, "1h 30m left");
  assert.equal(during.percent, 50);

  const after = railModel({ nowMinutes: at(22, 50), window: MONDAY });
  assert.equal(after.phase, "after");
  assert.equal(after.remaining, "20m over");
  assert.equal(after.percent, 100);
});

test("railModel's geometry agrees with itself: the session span, the overrun and the needle", () => {
  const m = railModel({ nowMinutes: at(21, 15), window: MONDAY, entries: [{ minutes: at(21, 0), text: "x", scene: "Canteen" }] });
  assert.equal(m.sessionStartPct, railPct(at(19, 30), MONDAY));
  assert.equal(Math.round((m.sessionStartPct + m.sessionWidthPct) * 100) / 100, m.sessionEndPct);
  assert.equal(Math.round((m.sessionEndPct + m.overPct) * 100) / 100, 100, "the overrun runs from the session's end to the rail's end");
  assert.equal(m.nowPct, 50);
  assert.equal(m.currentScene, "Canteen", "a log entry's own scene stamp is enough to say where we are");
  assert.equal(m.clock, "21:15");
  assert.equal(m.sessionLabel, "19:30–22:30");
});
