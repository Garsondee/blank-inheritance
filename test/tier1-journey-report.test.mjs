// Tier 1 -- the journey report (core/journey-report.mjs): the text the Location Editor copies for the chat and `npm run journeys` prints.

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatJourneyReport, mainRoadLine, summaryLine } from "../module/blank-inheritance/scripts/core/journey-report.mjs";

// a hand-made analysis: one episode, three legs (a cut that routes, a cut with an error, an option with a warning), some notes
const story = { groups: [{ id: "ep", rows: [{ key: "scene:ep:a", title: "Arrival" }, { key: "scene:ep:b", title: "The Hall" }, { key: "scene:ep:c", title: "The Yard" }] }] };
const model = { groups: [{ id: "ep", title: "Episode One", legs: [
  { id: "l1", kind: "cut", label: "Arrival → The Hall" },
  { id: "l2", kind: "cut", label: "The Hall → The Yard" },
  { id: "l3", kind: "option", label: "The Yard: The roof" }
] }] };
const routed = (metres, seconds, mode) => ({ status: "routed", issues: [], metres, seconds, realMinutes: metres / 8 / 60, modes: [{ mode, metres }] });
const analysis = {
  legs: new Map([["l1", routed(3100, 21, "car")], ["l2", { status: "unplaced", issues: [{ id: "unplaced", severity: "error" }] }], ["l3", { ...routed(900, 7, "walk"), issues: [{ id: "settle", severity: "warn" }] }]]),
  issues: [
    { id: "unplaced", severity: "error", text: "The Yard has no place yet, so this scene of this journey is nowhere.", hint: "Pick, draw or pin its place.", groupId: "ep", rowKey: "scene:ep:c", slotKey: "scene:e1-yard", legId: "l2" },
    { id: "settle", severity: "warn", text: "The Yard: The roof: the party stops at Roof, but Rest happens 400 m away.", hint: "Make the two the same place.", groupId: "ep", rowKey: "scene:ep:c", slotKey: "destination:b-yard:roof", legId: "l3" },
    { id: "area-stop", severity: "info", text: "The Hall is an area: tokens go to its middle.", hint: "Drop a pin.", groupId: "ep", rowKey: "scene:ep:b", slotKey: "scene:e1-hall", legId: null }
  ],
  groups: [{ id: "ep", title: "Episode One", scenes: 3, unplaced: 1, legs: 3, routed: 2, same: 0, offmap: 0, errors: 1, warns: 1, infos: 1, main: { legs: 1, metres: 3100, seconds: 21, realMinutes: 6.5 }, optionLegs: 1, metres: 4000, seconds: 28, realMinutes: 8, verdict: "broken" }]
};
const world = { story, model, analysis };

test("the report opens with the verdict and the counts, then lists errors before warnings, each with its scene, slot and a way out", () => {
  const { text, errors, warns, infos } = formatJourneyReport(world);
  assert.deepEqual([errors, warns, infos], [1, 1, 1]);
  const lines = text.split("\n");
  assert.equal(lines[0], "# Journeys: Episode One");
  assert.equal(lines[1], "Verdict: broken: the party cannot complete it");
  assert.match(lines[2], /3 scenes · 3 journeys \(2 routed\) · 1 error · 1 warning · 1 note$/);
  assert.match(text, /1 scene has no place yet\./);
  assert.match(text, /Main road \(scene to scene\): 1 journey · 3\.1 km · 21 s to watch · about 7 min in the story/);
  assert.match(text, /Players' choices add 1 more journey, one per option\./);
  assert.ok(text.indexOf("## Errors (1)") < text.indexOf("## Warnings (1)"));
  assert.match(text, /- \[unplaced\] The Yard has no place yet/);
  assert.match(text, /where: scene "The Yard" · slot scene:e1-yard/);
  assert.match(text, /try: Pick, draw or pin its place\./);
});

test("notes are counted, not listed, until asked for", () => {
  const quiet = formatJourneyReport(world).text;
  assert.doesNotMatch(quiet, /area-stop/);
  assert.match(quiet, /\(1 note not listed; ask for them with --notes\)/);
  const loud = formatJourneyReport(world, { notes: true }).text;
  assert.match(loud, /## Notes \(1\)/);
  assert.match(loud, /\[area-stop\] The Hall is an area/);
  assert.doesNotMatch(loud, /notes not listed/);
});

test("every journey can be listed in play order, with its distance, watch time and modes, and the worst thing said about it", () => {
  const { text } = formatJourneyReport(world, { legs: true });
  assert.match(text, /## Every journey, in play order/);
  assert.match(text, / 1\. Arrival → The Hall {2}\[cut\] {2}3\.1 km · 21 s · car 3\.1 km/);
  assert.match(text, / 2\. The Hall → The Yard {2}\[cut\] {2}unplaced {2}\(error\)/);
  assert.match(text, / 3\. The Yard: The roof {2}\[option\] {2}900 m · 7 s · walk 900 m {2}\(warn\)/);
});

test("one episode can be asked for by id; an unknown id gives an empty report, not a crash", () => {
  assert.match(formatJourneyReport(world, { groupId: "ep" }).text, /# Journeys: Episode One/);
  const none = formatJourneyReport(world, { groupId: "nope" });
  assert.equal(none.text.trim(), "");
  assert.deepEqual([none.errors, none.warns, none.infos], [0, 0, 0]);
});

test("a continuous episode with nothing to report says so plainly", () => {
  const clean = { story, model, analysis: { legs: new Map(), issues: [], groups: [{ ...analysis.groups[0], unplaced: 0, errors: 0, warns: 0, infos: 0, verdict: "continuous", optionLegs: 0 }] } };
  const { text } = formatJourneyReport(clean);
  assert.match(text, /Verdict: continuous: the party can walk every journey/);
  assert.doesNotMatch(text, /## Errors|## Warnings/);
  assert.doesNotMatch(text, /no place yet/);
  assert.doesNotMatch(text, /Players' choices/);
});

test("the count line and the main road line are the same words in the report and on the panel, with plurals right", () => {
  const base = { scenes: 1, legs: 1, routed: 1, same: 0, offmap: 0, errors: 0, warns: 0, infos: 0, main: { legs: 0 } };
  assert.equal(summaryLine(base), "1 scene · 1 journey (1 routed) · 0 errors · 0 warnings · 0 notes");
  assert.equal(summaryLine({ ...base, scenes: 12, legs: 29, routed: 27, same: 1, offmap: 1, errors: 1, warns: 2, infos: 11 }), "12 scenes · 29 journeys (27 routed, 1 at one place, 1 off the map) · 1 error · 2 warnings · 11 notes");
  assert.equal(mainRoadLine(base), null);
  assert.equal(mainRoadLine({ main: { legs: 1, metres: 900, seconds: 7, realMinutes: 0.4 } }), "1 journey · 900 m · 7 s to watch · about 1 min in the story");
  assert.equal(mainRoadLine({ main: { legs: 8, metres: 18286, seconds: 153.7, realMinutes: 60.2 } }), "8 journeys · 18.3 km · 2 min 34 s to watch · about 60 min in the story");
});
