// Tier 1 -- "what would that do to the journeys?" (core/journey-whatif.mjs): a placement judged before it is made, and a pin judged under the cursor.

import { test } from "node:test";
import assert from "node:assert/strict";
import { compareLegs, previewAt, summariseLeg, whatIf, worstOf } from "../module/blank-inheritance/scripts/core/journey-whatif.mjs";
import { analyseDeparture, deps, departureDocs, locations, POINTS, run } from "./support/journey-fixture-world.mjs";

const sceneTwo = { kind: "scene", sceneSetId: "ss-2" };
const input = (placeOf, changes, extra = {}) => ({ docs: departureDocs(placeOf), locations, changes, deps, ...extra });

test("moving a scene into the bay makes the journeys that touch it worse, and says the token would stand in the water", () => {
  const result = whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "bay" }]));
  const ids = result.legs.map((l) => l.id);
  assert.ok(ids.some((id) => id.startsWith("leg:cut:")), "the cut that brings the party to the scene");
  assert.ok(result.legs.some((l) => l.kind === "option"), "and the options that leave it");
  assert.equal(result.worse, true);
  assert.ok(result.errors > 0);
  assert.ok(result.places.some((p) => p.id === "water-stop" && p.severity === "error"), "the place itself");
  const cut = result.legs.find((l) => l.kind === "cut");
  assert.equal(cut.change, "worse");
  assert.ok(cut.after.errors > cut.before.errors);
  assert.equal(cut.before.status, "routed");
});

test("moving a scene out of the bay makes them better", () => {
  const result = whatIf(input(["west", "bay", "west"], [{ target: sceneTwo, locationId: "east" }]));
  assert.equal(result.better, true);
  assert.equal(result.worse, false);
  const cut = result.legs.find((l) => l.kind === "cut");
  assert.equal(cut.change, "better");
  assert.ok(cut.before.errors > 0 && cut.after.errors === 0);
  assert.equal(result.places.length, 0, "the new place is a good one");
});

test("moving a scene to where it already is changes nothing", () => {
  const result = whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "east" }]));
  assert.ok(result.legs.every((l) => l.change === "same"));
  assert.equal(result.worse, false);
  assert.equal(result.better, false);
});

test("only the journeys that touch what is staged are judged, and the staged placements already waiting stay in the picture", () => {
  const fresh = whatIf(input(["west", "east", "west"], [{ target: { kind: "scene", sceneSetId: "ss-3" }, locationId: "u-west" }]));
  assert.deepEqual(fresh.legs.map((l) => l.kind), ["then", "then"], "scene Three is only the end of the two `then` legs (and the scene Two → Three cut it is reached by is not a leg)");
  assert.ok(fresh.legs.every((l) => l.label.includes("Muster")));
  // a placement waiting to be pulled is part of "before"
  const pending = whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "east" }], { overrides: { "scene:ss-2": { locationId: "bay", recordId: "r1" } } }));
  const cut = pending.legs.find((l) => l.kind === "cut");
  assert.ok(cut.before.errors > 0, "before is the bay, as the editor shows it now");
  assert.equal(cut.after.errors, 0);
});

test("several slots can be moved at once, as 'move all uses' does", () => {
  const result = whatIf(input(["west", "east", "west"], [
    { target: { kind: "scene", sceneSetId: "ss-1" }, locationId: "u-west" },
    { target: { kind: "scene", sceneSetId: "ss-3" }, locationId: "u-east" },
    { target: { kind: "destination", briefRef: "b2", destinationId: "$then" }, locationId: "u-east" }
  ]));
  assert.ok(result.legs.length >= 3);
  assert.ok(result.legs.every((l) => ["better", "worse", "same"].includes(l.change)));
  assert.ok(result.legs.some((l) => l.label.startsWith("One →")), "the cut out of the first scene");
});

test("a drawn place that has not been pulled yet is a stand-in the staged placement can point at", () => {
  const withNew = (point) => ({ ...deps, pointOf: (e) => (e.viaRecord === "r9" ? point : deps.pointOf(e)) });
  const base = input(["west", "east", "west"], [{ target: sceneTwo, viaRecord: "r9" }], { newLocations: { r9: { name: "A new spot", tier: "point" } } });
  const good = whatIf({ ...base, deps: withNew({ x: 3900, y: 300 }) });
  assert.equal(good.errors, 0, JSON.stringify(good.places) + JSON.stringify(good.legs.map((l) => l.after.issues)));
  const bad = whatIf({ ...base, deps: withNew(POINTS.bay) });
  assert.ok(bad.errors > 0);
  assert.equal(bad.places.find((p) => p.id === "water-stop").severity, "error");
});

test("marking a scene off the map is a change too: its journeys have nothing to walk", () => {
  const result = whatIf(input(["west", "east", "west"], [{ target: sceneTwo, offMap: "memory" }]));
  assert.ok(result.legs.every((l) => l.after.status === "offmap" || l.after.status === "routed" || l.after.status === "same"));
  const cut = result.legs.find((l) => l.kind === "cut");
  assert.equal(cut.after.status, "offmap");
  assert.equal(cut.before.status, "routed");
  assert.equal(compareLegs(cut.before, cut.after), "worse", "no journey to watch is worse than one");
});

test("compareLegs ranks by routing, errors, warnings and then a clearly shorter way", () => {
  const leg = (status, errors, warns, metres) => ({ status, errors, warns, infos: 0, metres });
  assert.equal(compareLegs(leg("routed", 1, 0, 100), leg("routed", 0, 0, 100)), "better");
  assert.equal(compareLegs(leg("routed", 0, 0, 100), leg("routed", 0, 1, 100)), "worse");
  assert.equal(compareLegs(leg("unplaced", 1, 0, 0), leg("routed", 0, 0, 500)), "better");
  assert.equal(compareLegs(leg("routed", 0, 0, 1000), leg("routed", 0, 0, 800)), "better", "a fifth shorter");
  assert.equal(compareLegs(leg("routed", 0, 0, 1000), leg("routed", 0, 0, 950)), "same", "within a tenth is the same");
  assert.equal(compareLegs(leg("routed", 0, 0, 1000), leg("routed", 0, 0, 1200)), "worse");
  assert.equal(compareLegs(leg("same", 0, 0, 0), leg("routed", 0, 0, 800)), "same", "no length to compare");
});

test("a leg summarised is the badge, the counts, the issues' words and the route to draw", () => {
  const s = summariseLeg(run("rail-start", "dry-e"));
  assert.equal(s.status, "routed");
  assert.ok(s.errors >= 2 && s.badge.worst === "error");
  assert.ok(s.issues.every((i) => i.id && i.severity && i.text));
  assert.ok(s.runs.length > 0 && s.from && s.to);
  const none = summariseLeg(null);
  assert.deepEqual([none.status, none.errors, none.metres, none.runs.length], ["none", 0, 0, 0]);
});

/* ---------------------------------------------------------------- under the cursor */

test("a pin under the cursor is judged as the end of every journey that reaches the slot, and the start of every one that leaves it", () => {
  const { model } = analyseDeparture();
  const slotKey = "scene:ss-2";
  const here = previewAt({ model, slotKey, point: { x: 3500, y: 160 }, deps });
  assert.deepEqual(here.map((p) => [p.kind, p.side]), [["cut", "to"], ["option", "from"], ["option", "from"]], "arrives by the cut; leaves by each option");
  assert.ok(here.every((p) => p.summary.status === "routed"));
  const cut = here[0];
  assert.ok(cut.summary.metres > 3400 && cut.summary.metres < 3700, `about 3.5 km from the road's west end: ${cut.summary.metres}`);
  assert.equal(cut.summary.errors, 0);
  const sea = previewAt({ model, slotKey, point: POINTS.bay, deps });
  assert.ok(sea[0].summary.errors > 0, "a pin in the bay says so for the journey that ends there");
  assert.equal(worstOf(sea.map((p) => p.summary)), "error");
  assert.equal(worstOf(here.map((p) => p.summary)), null);
  assert.equal(worstOf([]), null);
});

test("a pin for a slot no journey touches previews nothing, and the real legs are left as they were", () => {
  const { model } = analyseDeparture();
  assert.deepEqual(previewAt({ model, slotKey: "scene:ss-h1", point: { x: 10, y: 10 }, deps }), []);
  assert.deepEqual(previewAt({ model, slotKey: "scene:nope", point: { x: 10, y: 10 }, deps }), []);
  const before = JSON.stringify(model.legs.map((l) => [l.id, l.from.locationId, l.to.locationId]));
  previewAt({ model, slotKey: "scene:ss-2", point: POINTS.bay, deps });
  assert.equal(JSON.stringify(model.legs.map((l) => [l.id, l.from.locationId, l.to.locationId])), before, "a preview never changes the model");
});

/* ---------------------------------------------------------------- the words */

import { viewOfWhatIf } from "../module/blank-inheritance/scripts/core/journey-whatif.mjs";

test("a what-if in words: the headline, the journeys that changed first, before and after, and the new place's own problems", () => {
  const worse = viewOfWhatIf(whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "bay" }])));
  assert.equal(worse.summary, "worse");
  assert.match(worse.headline, /journeys? worse/);
  assert.equal(worse.legs[0].change, "worse");
  assert.match(worse.legs[0].before, /km|m ·/);
  assert.ok(worse.legs[0].issues.some((i) => i.severity === "error"));
  assert.ok(worse.places.some((p) => /water/.test(p.text)));
  const better = viewOfWhatIf(whatIf(input(["west", "bay", "west"], [{ target: sceneTwo, locationId: "east" }])));
  assert.equal(better.summary, "better");
  assert.match(better.headline, /better/);
  assert.deepEqual(better.places, []);
  const same = viewOfWhatIf(whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "east" }])));
  assert.equal(same.summary, "same");
  assert.match(same.headline, /every one can be walked|none better or worse/);
});

test("a what-if that touches nothing says so, and one with no result is nothing", () => {
  assert.equal(viewOfWhatIf(null), null);
  const none = viewOfWhatIf({ legs: [], places: [], errors: 0, warns: 0 });
  assert.equal(none.headline, "No journey touches this place.");
  assert.equal(none.summary, "same");
});

test("a long list of touched journeys is cut short and says how many are left out", () => {
  const leg = (i, change) => ({ id: `l${i}`, label: `Leg ${i}`, kind: "option", change, before: { status: "routed", badge: { distance: "1 km", time: "5 s" }, errors: 0, issues: [] }, after: { status: "routed", badge: { distance: "2 km", time: "9 s" }, errors: change === "worse" ? 1 : 0, issues: change === "worse" ? [{ id: "x", severity: "error", text: "bad" }] : [] } });
  const many = viewOfWhatIf({ legs: Array.from({ length: 12 }, (_, i) => leg(i, i % 3 === 0 ? "worse" : "same")), places: [], errors: 4, warns: 0 });
  assert.equal(many.legs.length, 8);
  assert.equal(many.more, 4);
  assert.equal(many.legs[0].change, "worse", "the ones that got worse are listed first");
  assert.equal(many.summary, "worse");
});

test("the summary comes with its class already built, because the template check only reads templates", () => {
  assert.equal(viewOfWhatIf(whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "bay" }]))).summaryClass, "bi-story__whatif--worse");
  assert.equal(viewOfWhatIf({ legs: [], places: [], errors: 0, warns: 0 }).summaryClass, "bi-story__whatif--same");
});

test("a journey whose words do not change says them once", () => {
  const same = viewOfWhatIf(whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "east" }])));
  assert.ok(same.legs.length > 0 && same.legs.every((l) => l.unchanged === true));
  const moved = viewOfWhatIf(whatIf(input(["west", "east", "west"], [{ target: sceneTwo, locationId: "bay" }])));
  assert.ok(moved.legs.some((l) => l.unchanged === false));
});
