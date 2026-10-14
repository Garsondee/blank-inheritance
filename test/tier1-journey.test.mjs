// Tier 1 -- the journey model (core/journey.mjs): which legs the party walks, worked out from the Story the Location Editor already has.
//
// The campaign moves the party across the map in two ways and the model must describe exactly those: a CUT (the Scene Runner takes the table from one scene to the next
// and the marker walks between their places) and a DEPARTURE (a scene's outro puts a choice to the players and their pawns walk to what they chose, then, for a
// `then`, on to a place that gathers them again). Fixtures are synthetic documents shaped like the real ones (data/campaign/scene-set.json, data/episodes/*,
// data/scene-briefs/*); the real episodes are held by test/tier2-journey-corpus.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStory } from "../module/blank-inheritance/scripts/core/siting.mjs";
import { buildJourneyModel, dayTime, legById } from "../module/blank-inheritance/scripts/core/journey.mjs";

const locations = Object.fromEntries(["gate", "hall", "yard", "clinic", "bunks", "shop", "pier", "roof", "mess"].map((id) => [id, { id, name: id[0].toUpperCase() + id.slice(1), tier: "site", kind: "" }]));

/** An episode of five scenes: a plain cut, a free-choice departure that gathers at a muster, an arrival with a muster, and a run of cuts. */
function fixture() {
  const sceneSet = {
    scenes: [
      { id: "ss-gate", name: "The Gate", briefRef: "b-gate", locationRef: "gate", kind: "beat", order: 1 },
      { id: "ss-hall", name: "The Hall", briefRef: "b-hall", locationRef: "hall", kind: "beat", order: 2 },
      { id: "ss-hall-room", name: "The Hall Annex", briefRef: "b-hall", locationRef: "hall", kind: "sub", order: 3 },
      { id: "ss-yard", name: "The Yard", briefRef: "b-yard", locationRef: "yard", kind: "beat", order: 4 },
      { id: "ss-bunks", name: "The Bunks", briefRef: "b-bunks", locationRef: "bunks", kind: "beat", order: 5 },
      { id: "ss-shop", name: "The Shop", briefRef: "b-shop", locationRef: "shop", kind: "beat", order: 6 },
      { id: "ss-rest-clinic", name: "Rest: Clinic", briefRef: "b-rest-clinic", locationRef: "clinic", kind: "beat", group: "haunts", order: 1 },
      { id: "ss-rest-roof", name: "Rest: Roof", briefRef: "b-rest-roof", locationRef: "roof", kind: "beat", group: "haunts", order: 2 }
    ]
  };
  const episodes = [{
    id: "ep-one", title: "Episode One", dayRange: { start: 1, end: 2 },
    scenes: [
      { id: "c-gate", order: 1, title: "The Gate", briefRef: "b-gate", day: 1, quarter: "morning" },
      { id: "c-hall", order: 2, title: "The Hall", briefRef: "b-hall", day: 1, quarter: "morning" },
      { id: "c-yard", order: 3, title: "The Yard", briefRef: "b-yard", day: 1, quarter: "afternoon" },
      { id: "c-bunks", order: 4, title: "The Bunks", briefRef: "b-bunks", day: 1, quarter: "night" },
      { id: "c-shop", order: 5, title: "The Shop", briefRef: "b-shop", day: 2, quarter: "morning" }
    ]
  }];
  const briefs = {
    "b-gate": { id: "b-gate" },
    // a free-choice departure with a muster: two ways to spend the evening, then everyone gathers in the bunks
    "b-yard": { id: "b-yard", outro: { departure: { kind: "free", question: "Where do you spend the evening?", destinations: [
      { id: "clinic", label: "The clinic", placeRef: "clinic", briefRef: "b-rest-clinic" },
      { id: "roof", label: "The roof", placeRef: "roof", briefRef: "b-rest-roof" }
    ], then: { kind: "muster", placeRef: "bunks", briefRef: "b-bunks", label: "Lights out", question: "Lights out at ten." } } } },
    "b-hall": { id: "b-hall" },
    "b-bunks": { id: "b-bunks" },
    "b-shop": { id: "b-shop" },
    "b-rest-clinic": { id: "b-rest-clinic" },
    "b-rest-roof": { id: "b-rest-roof" }
  };
  return { sceneSet, episodes, briefs };
}

const modelOf = (docs, options = {}) => { const story = buildStory(docs, { locations, ...options }); return { story, model: buildJourneyModel(story) }; };
const byKind = (legs, kind) => legs.filter((l) => l.kind === kind);

test("dayTime puts a day and a quarter on one growing number, and knows when a scene has no day", () => {
  assert.equal(dayTime(1, "morning"), 4);
  assert.equal(dayTime(1, "night"), 7);
  assert.equal(dayTime(2, "morning"), 8);
  assert.ok(dayTime(1, "evening") < dayTime(2, "morning"));
  assert.equal(dayTime(3, undefined), 12, "a day with no quarter is the start of that day");
  assert.equal(dayTime(undefined, "morning"), null);
  assert.equal(dayTime(NaN, "morning"), null);
});

test("an episode becomes one group; haunts and strays are not journeys of their own", () => {
  const { model } = modelOf(fixture());
  assert.deepEqual(model.groups.map((g) => g.id), ["ep-one"]);
  assert.equal(model.groups[0].kind, "episode");
  assert.equal(model.groups[0].title, "Episode One");
  assert.deepEqual(model.groups[0].stops.map((s) => s.title), ["The Gate", "The Hall", "The Yard", "The Bunks", "The Shop"], "its scenes in play order, rooms not counted");
});

test("a cut joins each scene to the next, with both places, a stable id and the two days", () => {
  const { model } = modelOf(fixture());
  const cuts = byKind(model.groups[0].legs, "cut");
  // gate > hall and hall > yard are plain cuts; the yard has a departure, so no cut leaves it; the party gathers at the bunks and the next cut goes on from there
  assert.deepEqual(cuts.map((l) => l.label), ["The Gate → The Hall", "The Hall → The Yard", "The Bunks → The Shop"]);
  const first = cuts[0];
  assert.equal(first.id, "leg:cut:scene:ep-one:c-gate>scene:ep-one:c-hall");
  assert.equal(first.from.locationId, "gate");
  assert.equal(first.to.locationId, "hall");
  assert.equal(first.from.name, "Gate");
  assert.equal(first.kind, "cut");
  assert.deepEqual(first.timing.from, { day: 1, quarter: "morning", t: 4 });
  assert.deepEqual(first.timing.to, { day: 1, quarter: "morning", t: 4 });
  assert.equal(first.settle, null);
});

test("a departure makes one leg per option from the scene's own place, and one `then` leg per option on to the muster", () => {
  const { model } = modelOf(fixture());
  const legs = model.groups[0].legs;
  const options = byKind(legs, "option");
  const thens = byKind(legs, "then");
  assert.deepEqual(options.map((l) => [l.from.locationId, l.to.locationId, l.label]), [
    ["yard", "clinic", "The Yard: The clinic"],
    ["yard", "roof", "The Yard: The roof"]
  ]);
  assert.deepEqual(thens.map((l) => [l.from.locationId, l.to.locationId, l.label]), [
    ["clinic", "bunks", "The clinic → Lights out"],
    ["roof", "bunks", "The roof → Lights out"]
  ]);
  assert.ok(options.every((l) => l.rowKey === "scene:ep-one:c-yard"), "each leg says which scene's departure it belongs to");
});

test("legs come out in play order: each scene's own legs where it falls, and a departure's options before its `then` legs", () => {
  const { model } = modelOf(fixture());
  assert.deepEqual(model.groups[0].legs.map((l) => l.kind), ["cut", "cut", "option", "then", "option", "then", "cut"]);
  assert.equal(model.legs.length, 7, "the flat list is every group's legs");
  assert.deepEqual(model.groups[0].legs.map((l) => l.rowKey.split(":").pop()), ["c-hall", "c-yard", "c-yard", "c-yard", "c-yard", "c-yard", "c-shop"]);
});

test("a scene of the episode that a departure's option leads to has no cut of its own: the `then` already takes the party on from it", () => {
  const docs = fixture();
  // the hall's own departure sends them to the bunks scene or the shop scene (both in the episode), then to the yard
  docs.briefs["b-hall"] = { id: "b-hall", outro: { departure: { kind: "free", question: "Where next?", destinations: [
    { id: "bunks", label: "The bunks", placeRef: "bunks", briefRef: "b-bunks" },
    { id: "shop", label: "The shop", placeRef: "shop", briefRef: "b-shop" }
  ], then: { kind: "muster", placeRef: "yard", briefRef: "b-yard", label: "Evening muster" } } } };
  const { model } = modelOf(docs);
  const cuts = byKind(model.groups[0].legs, "cut").map((l) => l.label);
  assert.ok(!cuts.includes("The Bunks → The Shop"), "the bunks and the shop are reached by the hall's departure; their way on is its `then`");
  assert.ok(!cuts.some((c) => c.startsWith("The Hall →")), "the hall has a departure, so no cut leaves it");
  assert.deepEqual(byKind(model.groups[0].legs, "then").slice(0, 2).map((l) => l.label), ["The bunks → Evening muster", "The shop → Evening muster"]);
});

test("a leg whose destination leads to a scene somewhere else says so, for the check that the party stops where the scene opens", () => {
  const docs = fixture();
  // the clinic option leads to a scene that really happens at the shop
  docs.sceneSet.scenes.find((s) => s.id === "ss-rest-clinic").locationRef = "shop";
  const { model } = modelOf(docs);
  const clinic = byKind(model.groups[0].legs, "option").find((l) => l.to.locationId === "clinic");
  assert.deepEqual(clinic.settle && { title: clinic.settle.title, locationId: clinic.settle.locationId }, { title: "Rest: Clinic", locationId: "shop" });
  const roof = byKind(model.groups[0].legs, "option").find((l) => l.to.locationId === "roof");
  assert.equal(roof.settle.locationId, "roof", "a scene at the very place the party stops is still named: the checker compares the two");
});

test("two options that lead to the same scene are a rotation scene played at every destination on purpose: no settle", () => {
  const docs = fixture();
  docs.briefs["b-yard"].outro.departure.destinations = [
    { id: "clinic", label: "The clinic", placeRef: "clinic", briefRef: "b-rest-roof" },
    { id: "roof", label: "The roof", placeRef: "roof", briefRef: "b-rest-roof" }
  ];
  const { model } = modelOf(docs);
  for (const leg of byKind(model.groups[0].legs, "option")) assert.equal(leg.settle, null);
});

test("an arrival makes each way of arriving a leg from where that player comes in to the muster", () => {
  const docs = fixture();
  docs.sceneSet.scenes.push({ id: "ss-pier", name: "The Pier", briefRef: "b-pier", locationRef: "pier", kind: "beat", order: 7 });
  docs.briefs["b-gate"] = { id: "b-gate", outro: { departure: { kind: "arrive", question: "How do you arrive?", destinations: [
    { id: "train", mode: "train", label: "By train", placeRef: "clinic" },
    { id: "ferry", mode: "ferry", label: "By ferry", placeRef: "pier" }
  ], then: { kind: "muster", placeRef: "gate", briefRef: "b-hall", label: "The Gate", question: "Report to the gate." } } } };
  const { model } = modelOf(docs);
  const arrivals = byKind(model.groups[0].legs, "arrival");
  assert.deepEqual(arrivals.map((l) => [l.label, l.from.locationId, l.to.locationId, l.mode]), [
    ["By train → The Gate", "clinic", "gate", "train"],
    ["By ferry → The Gate", "pier", "gate", "ferry"]
  ]);
  assert.equal(byKind(model.groups[0].legs, "option").length, 2, "the yard's own departure is untouched");
  assert.equal(model.groups[0].legs.filter((l) => l.kind === "cut" && l.from.title === "The Gate").length, 0, "the gate has a departure, so no cut leaves it");
});

test("legsBySlot finds the legs that end at a slot, and legBeforeRow the cut that brings the party to a scene", () => {
  const { story, model } = modelOf(fixture());
  const hall = story.groups[0].rows.find((r) => r.title === "The Hall");
  const yard = story.groups[0].rows.find((r) => r.title === "The Yard");
  assert.equal(model.legBeforeRow.get(hall.key).label, "The Gate → The Hall");
  assert.equal(model.legBeforeRow.get(yard.key).label, "The Hall → The Yard");
  assert.equal(model.legBeforeRow.get(story.groups[0].rows[0].key), undefined, "the first scene is not arrived at by a cut");
  const clinicSlot = yard.options.items.find((i) => i.locationId === "clinic");
  assert.deepEqual(model.legsBySlot.get(clinicSlot.key).map((l) => l.kind), ["option"]);
  const muster = yard.options.then;
  assert.deepEqual(model.legsBySlot.get(muster.key).map((l) => l.kind), ["then", "then"]);
});

test("a scene with no place, or with a place still waiting to be pulled, is carried into its legs as it is, so the checker can say what is wrong", () => {
  const docs = fixture();
  delete docs.sceneSet.scenes.find((s) => s.id === "ss-hall").locationRef;
  const { model } = modelOf(docs);
  const cut = model.groups[0].legs[0];
  assert.equal(cut.to.state, "gap");
  assert.equal(cut.to.locationId, null);
  const next = model.groups[0].legs[1];
  assert.equal(next.from.state, "gap");

  // the GM has chosen a place that the repo has not heard about yet: the model describes the journeys as the editor has them now
  const hallKey = "scene:ss-hall";
  const withPending = modelOf(fixture(), { overrides: { [hallKey]: { locationId: "mess", recordId: "r1" } } });
  const first = withPending.model.groups[0].legs[0];
  assert.equal(first.to.locationId, "mess");
  assert.equal(first.to.pending, true);
  const viaNew = modelOf(fixture(), { overrides: { [hallKey]: { viaRecord: "r2", recordId: "r3" } }, newLocations: { r2: { name: "New spot", tier: "point" } } });
  const fresh = viaNew.model.groups[0].legs[0];
  assert.equal(fresh.to.state, "pending-new");
  assert.equal(fresh.to.viaRecord, "r2");
  assert.equal(fresh.to.name, "New spot");
});

test("a scene that is off the map on purpose keeps its reason; its legs are not gaps", () => {
  const docs = fixture();
  docs.sceneSet.scenes.find((s) => s.id === "ss-hall").offMap = { reason: "in-transit" };
  delete docs.sceneSet.scenes.find((s) => s.id === "ss-hall").locationRef;
  const { model } = modelOf(docs);
  const cut = model.groups[0].legs[0];
  assert.equal(cut.to.state, "offmap");
  assert.equal(cut.to.offMapReason, "in-transit");
});

test("a story with no episodes has no journeys, and nothing here throws on an empty or missing story", () => {
  assert.deepEqual(buildJourneyModel({ groups: [] }).legs, []);
  assert.deepEqual(buildJourneyModel(null).groups, []);
  assert.deepEqual(buildJourneyModel(undefined).legs, []);
});

test("a journey is found by its id in whichever episode it belongs to, so a button in the Story list can open that episode", () => {
  const docs = fixture();
  docs.episodes.push({ id: "ep-two", title: "Episode Two", dayRange: { start: 3, end: 3 }, scenes: [{ id: "d-gate", order: 1, title: "Gate Again", briefRef: "b-gate2", day: 3, quarter: "morning" }, { id: "d-hall", order: 2, title: "Hall Again", briefRef: "b-hall2", day: 3, quarter: "afternoon" }] });
  docs.sceneSet.scenes.push({ id: "ss-gate2", name: "Gate Again", briefRef: "b-gate2", locationRef: "gate", kind: "beat", order: 8 }, { id: "ss-hall2", name: "Hall Again", briefRef: "b-hall2", locationRef: "hall", kind: "beat", order: 9 });
  docs.briefs["b-gate2"] = { id: "b-gate2" };
  docs.briefs["b-hall2"] = { id: "b-hall2" };
  const { model } = modelOf(docs);
  assert.deepEqual(model.groups.map((g) => g.id), ["ep-one", "ep-two"]);
  const second = model.groups[1].legs[0];
  assert.equal(legById(model, second.id).groupId, "ep-two");
  assert.equal(legById(model, model.groups[0].legs[0].id).groupId, "ep-one");
  assert.equal(legById(model, "leg:nothing"), null);
  assert.equal(legById(null, second.id), null);
});
