// Tier 1 -- the Story list with its journeys (core/story-lines.mjs): the way between two scenes drawn between them, the badge by each option, and a place that is
// no place for a token to stand flagged where it is picked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { legInfo, storyLines } from "../module/blank-inheritance/scripts/core/story-lines.mjs";
import { analyseDeparture } from "./support/journey-fixture-world.mjs";

const OPEN = { openGroups: new Set(["ep"]), openRows: new Set(["scene:ep:c2"]) };
const linesOf = (placeOf, ui = {}) => {
  const { story, model, analysis } = analyseDeparture(placeOf);
  return { story, model, analysis, lines: storyLines(story, { ...OPEN, journey: { model, analysis }, ...ui }) };
};
const types = (lines) => lines.map((l) => l.type);

test("without journeys the list is exactly what it was: no leg lines, no badges", () => {
  const { story } = analyseDeparture();
  const plain = storyLines(story, OPEN);
  assert.ok(!types(plain).includes("leg"));
  for (const line of plain.filter((l) => l.type === "slot")) {
    assert.deepEqual(line.legs, []);
    assert.equal(line.legSummary, null);
    assert.equal(line.placeProblem, null);
  }
  assert.deepEqual(storyLines(story, { ...OPEN, journey: null }), plain);
});

test("the way the party gets to a scene from the one before is a line between the two, with its distance, time and ways of moving", () => {
  const { lines, model } = linesOf(["west", "east", "west"]);
  const leg = lines.find((l) => l.type === "leg");
  assert.ok(leg, "a leg line");
  const at = lines.indexOf(leg);
  assert.equal(lines[at - 1].title, "One", "after the scene it comes from");
  assert.equal(lines[at + 1].title, "Two", "before the scene it arrives at");
  assert.equal(leg.legId, model.legs[0].id);
  assert.equal(leg.status, "routed");
  assert.match(leg.distance, /^3\.9 km$/);
  assert.match(leg.time, /^\d+ s$/);
  assert.match(leg.modes, /car/);
  assert.equal(leg.worst, null);
  assert.equal(leg.watchable, true);
  assert.equal(lines.filter((l) => l.type === "leg").length, 1, "the first scene is not arrived at, and the third is reached by the departure's `then`");
});

test("an option's journey is a badge on its own line; a muster that several journeys end at carries a summary", () => {
  const { lines } = linesOf(["west", "east", "west"]);
  const options = lines.filter((l) => l.type === "slot" && l.role === "option");
  assert.equal(options.length, 2);
  for (const option of options) {
    assert.equal(option.legs.length, 1);
    assert.equal(option.legs[0].kind, "option");
    assert.match(option.legs[0].distance, /km|m$/);
    assert.equal(option.legSummary, null);
  }
  const then = lines.find((l) => l.type === "slot" && l.role === "then");
  assert.deepEqual(then.legs, []);
  assert.equal(then.legSummary.count, 2);
  assert.equal(then.legSummary.watchable, true);
  assert.ok(then.legSummary.firstLegId.startsWith("leg:then:"));
});

test("a journey with something wrong with it carries the worst severity and a class to colour it by", () => {
  const { lines } = linesOf(["west", "bay", "west"]);
  const leg = lines.find((l) => l.type === "leg");
  assert.equal(leg.worst, "error");
  assert.equal(leg.worstClass, "bi-story__leg--error");
  const then = lines.find((l) => l.type === "slot" && l.role === "then");
  assert.ok(["error", "warn", null].includes(then.legSummary.worst));
});

test("a place that is no place to stand is flagged on the scene and on every slot that holds it, with the reason", () => {
  const { lines } = linesOf(["west", "bay", "west"]);
  const scene = lines.find((l) => l.type === "scene" && l.title === "Two");
  assert.equal(scene.placeProblem, "error");
  assert.match(scene.placeProblemText, /stand in the water/);
  const fine = lines.find((l) => l.type === "scene" && l.title === "One");
  assert.equal(fine.placeProblem, null);
  const ok = linesOf(["west", "east", "west"]).lines.find((l) => l.type === "scene" && l.title === "Two");
  assert.equal(ok.placeProblem, null);
  assert.equal(ok.placeProblemText, null);
});

test("notes about a place (an area as a stop) are not flagged; only warnings and errors are", () => {
  const { story, model, analysis } = analyseDeparture(["west", "east", "west"]);
  analysis.places.get("scene:ss-2").issues.push({ id: "area-stop", severity: "info", text: "an area" });
  const lines = storyLines(story, { ...OPEN, journey: { model, analysis } });
  assert.equal(lines.find((l) => l.type === "scene" && l.title === "Two").placeProblem, null);
});

test("routes can be switched off", () => {
  const off = linesOf(["west", "east", "west"], { routes: false });
  assert.ok(!types(off.lines).includes("leg"));
  assert.ok(off.lines.filter((l) => l.type === "slot").every((l) => l.legs.length === 0 && l.legSummary === null));
});

test("narrowed to problems, the list keeps only what is wrong: no leg lines when every journey can be walked, the broken journey and the scenes round it when one cannot", () => {
  const good = linesOf(["west", "east", "west"], { onlyGaps: true });
  assert.deepEqual(good.lines, [], "nothing is wrong, so nothing is listed");
  const bad = linesOf(["west", "bay", "west"], { onlyGaps: true });
  assert.ok(types(bad.lines).includes("leg"), "the broken journey");
  assert.equal(bad.lines.filter((l) => l.type === "leg").every((l) => l.worst === "error"), true);
  assert.ok(bad.lines.some((l) => l.type === "scene" && l.title === "Two"), "and the scene it ends at");
  assert.ok(!bad.lines.some((l) => l.type === "scene" && l.title === "One"), "a scene with nothing wrong is left out");
  const placeless = linesOf(["west", null, "west"], { onlyGaps: true });
  assert.ok(placeless.lines.some((l) => l.type === "scene" && l.gap), "a gap still counts as a problem without any journey");
  const noJourneys = analyseDeparture(["west", null, "west"]);
  assert.ok(storyLines(noJourneys.story, { ...OPEN, onlyGaps: true }).some((l) => l.type === "scene" && l.gap), "and as it always did");
});

test("the legs on the map and the leg playing are marked", () => {
  const { model, analysis } = analyseDeparture();
  const first = model.legs[0];
  const info = legInfo(first, analysis.legs.get(first.id), { shownLegIds: new Set([first.id]), playingLegIds: new Set([first.id]) });
  assert.equal(info.shown, true);
  assert.equal(info.playing, true);
  const other = legInfo(model.legs[1], analysis.legs.get(model.legs[1].id), { shownLegIds: new Set([first.id]) });
  assert.equal(other.shown, false);
  assert.equal(other.playing, false);
  const none = legInfo(first, null);
  assert.equal(none.status, "pending");
  assert.equal(none.watchable, false);
});

test("a scene with no place or no way to it is still a line in the list, and says why its journey cannot be walked", () => {
  const { lines } = linesOf(["west", null, "west"]);
  const leg = lines.find((l) => l.type === "leg");
  assert.equal(leg.status, "unplaced");
  assert.equal(leg.worst, "error");
  assert.equal(leg.watchable, false);
  assert.equal(leg.distance, "", "no distance for a journey that is not routed");
  assert.equal(leg.modes, "");
});
