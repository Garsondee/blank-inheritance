// Tier 1 -- where the story happens (module/blank-inheritance/scripts/core/siting.mjs and story-lines.mjs).
// design/location-editor.md §12. The Story list's whole model: which scene is where, what has no place, what the
// players choose between, and what a change would touch.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applySiting,
  buildStory,
  DEPARTURE,
  destinationTarget,
  linkedSlots,
  overridesFromRecords,
  positionTarget,
  readSlot,
  sceneTarget,
  searchPlaces,
  targetKey,
  THEN,
  validTarget,
  writeSlot
} from "../module/blank-inheritance/scripts/core/siting.mjs";
import { chipOf, groupSummary, slotIndex, storyLines } from "../module/blank-inheritance/scripts/core/story-lines.mjs";
import { makeRecord, validateRecord } from "../module/blank-inheritance/scripts/core/location-editor.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clone = (v) => JSON.parse(JSON.stringify(v));

const LOCATIONS = Object.fromEntries([
  ["gate", "The Gate", "site"], ["infirmary", "The Infirmary", "site"], ["hall", "Town Hall", "site"], ["bath", "The Bathhouse", "site"],
  ["district", "The District", "region"], ["drain", "The Drain", "point"], ["stores", "The Stores", "site"]
].map(([id, name, tier]) => [id, { id, name, tier, kind: "" }]));

function fixture() {
  return {
    sceneSet: {
      scenes: [
        { id: "e1-from-above", name: "From Above", kind: "landing", group: "episode-one", order: 0, briefRef: "brief-above", locationRef: null },
        { id: "e1-road", name: "The Road", kind: "beat", group: "episode-one", order: 1, briefRef: "brief-road", locationRef: "gate", locationNote: "Because." },
        { id: "e1-medicals", name: "Medicals", kind: "beat", group: "episode-one", order: 2, briefRef: "brief-medicals", locationRef: "infirmary", approximate: true, locationNote: "PROPOSED." },
        { id: "e1-medicals-exam", name: "Exam Room", kind: "sub", group: "episode-one", order: 3, briefRef: "brief-medicals", locationRef: "infirmary" },
        { id: "e1-rest", name: "The Night", kind: "beat", group: "episode-one", order: 4, briefRef: "brief-night", locationRef: null },
        { id: "haunt-bath", name: "The Bathhouse", kind: "place", group: "haunts", order: 1, briefRef: "rest--bath", locationRef: "bath" },
        { id: "haunt-lantern", name: "The Lantern", kind: "place", group: "haunts", order: 2, briefRef: "rest--lantern", locationRef: null },
        { id: "the-city", name: "The City", kind: "hub", group: "the-city", order: 1, briefRef: null, locationRef: null },
        { id: "stray", name: "A Stray", kind: "beat", group: "episode-two", order: 9, briefRef: null, locationRef: "stores" }
      ]
    },
    episodes: [
      { id: "ep-1", title: "Episode One", dayRange: { start: 0, end: 1 }, scenes: [
        { order: 2, id: "medicals", title: "Medicals", briefRef: "brief-medicals", day: 1, quarter: "morning", authoring: { status: "drafted" } },
        { order: 0, id: "above", title: "From Above", briefRef: "brief-above" },
        { order: 1, id: "road", title: "The Road", briefRef: "brief-road", day: 0, quarter: "morning" },
        { order: 3, id: "night", title: "The Night", briefRef: "brief-night" }
      ] }
    ],
    briefs: {
      "brief-above": { id: "brief-above", outro: {} },
      "brief-road": {
        id: "brief-road",
        intro: { position: { locationRef: "gate", state: "together" } },
        outro: { position: { locationRef: null, state: "together" } }
      },
      "brief-medicals": { id: "brief-medicals", intro: { position: { locationRef: "gate", state: "together" } }, outro: { position: { locationRef: "infirmary", state: "together" } } },
      "brief-night": {
        id: "brief-night",
        outro: {
          departure: {
            kind: "free",
            question: "Where do you spend the night?",
            destinations: [
              { id: "bath", label: "The Bathhouse", placeRef: "bath", briefRef: "rest--bath" },
              { id: "lantern", label: "The Lantern", placeRef: null, briefRef: "rest--lantern" },
              { id: "drain", label: "Down the drain", placeRef: "no-such-place", briefRef: null }
            ],
            then: { kind: "muster", placeRef: "gate", briefRef: "brief-road", label: "Back at the gate" }
          }
        }
      },
      "rest--bath": { id: "rest--bath", intro: { position: { locationRef: "bath", state: "together" } }, outro: { position: { locationRef: "bath", state: "together" } } },
      "rest--lantern": { id: "rest--lantern", outro: {} }
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Targets and slots                                                   */
/* ------------------------------------------------------------------ */

test("a target is a scene, a destination or a travel position, and has a stable key", () => {
  assert.equal(targetKey(sceneTarget("e1-road")), "scene:e1-road");
  assert.equal(targetKey(destinationTarget("brief-night", "bath")), "destination:brief-night:bath");
  assert.equal(targetKey(destinationTarget("brief-night", THEN)), "destination:brief-night:$then");
  assert.equal(targetKey(positionTarget("brief-road", "outro")), "position:brief-road:outro");
  for (const bad of [null, {}, { kind: "scene" }, { kind: "position", briefRef: "x", which: "middle" }, { kind: "destination", briefRef: "x" }, { kind: "nope" }]) {
    assert.equal(validTarget(bad), false, JSON.stringify(bad));
    assert.throws(() => targetKey(bad));
  }
});

test("readSlot reads each kind of slot, and says whether the slot is there at all", () => {
  const docs = fixture();
  assert.deepEqual(readSlot(docs, sceneTarget("e1-road")), { exists: true, value: "gate", offMap: null });
  assert.deepEqual(readSlot(docs, sceneTarget("e1-rest")), { exists: true, value: null, offMap: null });
  assert.deepEqual(readSlot(docs, sceneTarget("nope")), { exists: false, value: null, offMap: null });
  assert.deepEqual(readSlot(docs, positionTarget("brief-road", "outro")), { exists: true, value: null });
  assert.deepEqual(readSlot(docs, positionTarget("brief-above", "intro")), { exists: false, value: null });
  assert.deepEqual(readSlot(docs, destinationTarget("brief-night", "bath")), { exists: true, value: "bath" });
  assert.deepEqual(readSlot(docs, destinationTarget("brief-night", THEN)), { exists: true, value: "gate" });
  assert.deepEqual(readSlot(docs, destinationTarget("brief-night", "ghost")), { exists: false, value: null });
  assert.deepEqual(readSlot(docs, destinationTarget("brief-road", "x")), { exists: false, value: null }, "a scene with no departure has no destinations");
});

test("writeSlot puts a place in a slot and says what was there; it never invents a slot", () => {
  const docs = fixture();
  assert.deepEqual(writeSlot(docs, sceneTarget("e1-rest"), "hall"), { ok: true, before: null });
  assert.equal(docs.sceneSet.scenes.find((s) => s.id === "e1-rest").locationRef, "hall");
  assert.deepEqual(writeSlot(docs, positionTarget("brief-road", "outro"), "gate"), { ok: true, before: null });
  assert.equal(docs.briefs["brief-road"].outro.position.locationRef, "gate");
  assert.deepEqual(writeSlot(docs, destinationTarget("brief-night", "lantern"), "hall"), { ok: true, before: null });
  assert.deepEqual(writeSlot(docs, destinationTarget("brief-night", THEN), "hall"), { ok: true, before: "gate" });
  assert.equal(docs.briefs["brief-night"].outro.departure.then.placeRef, "hall");
  assert.deepEqual(writeSlot(docs, sceneTarget("e1-rest"), null), { ok: true, before: "hall" }, "a slot can be emptied");
  const before = JSON.stringify(docs);
  assert.equal(writeSlot(docs, positionTarget("brief-above", "intro"), "gate").ok, false, "no position object, so it is not written into existence");
  assert.equal(writeSlot(docs, destinationTarget("brief-night", "ghost"), "gate").ok, false);
  assert.equal(writeSlot(docs, sceneTarget("e1-rest"), "Not A Location!").ok, false);
  assert.equal(JSON.stringify(docs), before, "a refused write changes nothing");
});

test("a departure-level placeRef (the muster shorthand) is a slot too", () => {
  const docs = { briefs: { b: { outro: { departure: { kind: "muster", placeRef: "gate", briefRef: "x" } } } } };
  assert.deepEqual(readSlot(docs, destinationTarget("b", DEPARTURE)), { exists: true, value: "gate" });
  assert.equal(writeSlot(docs, destinationTarget("b", DEPARTURE), "hall").ok, true);
  assert.equal(docs.briefs.b.outro.departure.placeRef, "hall");
});

test("applySiting on a scene clears 'approximate' and replaces the old reasoning with what actually happened", () => {
  const docs = fixture();
  const done = applySiting(docs, sceneTarget("e1-medicals"), "hall", { date: "2026-10-01", locationName: "Town Hall" });
  assert.deepEqual(done, { ok: true, before: "infirmary", changed: ["sceneSet"] });
  const entry = docs.sceneSet.scenes.find((s) => s.id === "e1-medicals");
  assert.equal(entry.locationRef, "hall");
  assert.equal("approximate" in entry, false, "the GM has chosen: it is not a proposal any more");
  assert.match(entry.locationNote, /Town Hall \(hall\)/);
  assert.match(entry.locationNote, /2026-10-01/);
  assert.match(entry.locationNote, /infirmary/, "what it used to be is not lost");
  assert.doesNotMatch(entry.locationNote, /PROPOSED/, "the old reasoning described a place the scene no longer has");
});

test("applySiting keeps the GM's own words when she gives a reason, and leaves the note alone when the place did not change", () => {
  const docs = fixture();
  applySiting(docs, sceneTarget("e1-road"), "hall", { note: "  Closer to the tram.  " });
  assert.equal(docs.sceneSet.scenes.find((s) => s.id === "e1-road").locationNote, "Closer to the tram.");
  const same = fixture();
  applySiting(same, sceneTarget("e1-road"), "gate");
  assert.equal(same.sceneSet.scenes.find((s) => s.id === "e1-road").locationNote, "Because.");
});

test("applySiting on a destination or a position names the brief it changed", () => {
  const docs = fixture();
  assert.deepEqual(applySiting(docs, destinationTarget("brief-night", "bath"), "hall").changed, ["brief:brief-night"]);
  assert.deepEqual(applySiting(docs, positionTarget("brief-road", "intro"), "hall").changed, ["brief:brief-road"]);
});

/* ------------------------------------------------------------------ */
/*  The story                                                           */
/* ------------------------------------------------------------------ */

test("the story lists episodes in play order, each scene in its own order, with day and quarter", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const episode = story.groups.find((g) => g.id === "ep-1");
  assert.deepEqual(episode.rows.map((r) => r.title), ["From Above", "The Road", "Medicals", "The Night"]);
  assert.deepEqual(episode.rows.map((r) => r.order), [0, 1, 2, 3]);
  assert.equal(episode.rows[1].when, "Day 0 · morning");
  assert.equal(episode.rows[2].status, "drafted");
  assert.equal(episode.subtitle, "Days 0-1");
});

test("each scene shows its place, and says plainly when it has none", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const [above, road, medicals, night] = story.groups.find((g) => g.id === "ep-1").rows;
  assert.equal(road.place.state, "ok");
  assert.equal(road.place.location.name, "The Gate");
  assert.equal(night.place.state, "gap");
  assert.equal(night.sceneGap, true);
  assert.equal(above.place.state, "offmap", "a view from above is deliberately nowhere; it is not a gap");
  assert.equal(above.sceneGap, false);
  assert.equal(medicals.place.state, "approximate", "a proposal is flagged, not hidden");
});

test("a place that points at a location that does not exist is broken, not blank", () => {
  const docs = fixture();
  docs.sceneSet.scenes.find((s) => s.id === "e1-road").locationRef = "ghost-town";
  const road = buildStory(docs, { locations: LOCATIONS }).groups[0].rows[1];
  assert.equal(road.place.state, "broken");
  assert.equal(road.sceneGap, true, "it will not draw on the map, so it is a gap that needs fixing");
});

test("rooms of a scene are listed under it, not as scenes of their own", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const medicals = story.groups[0].rows[2];
  assert.deepEqual(medicals.rooms.map((r) => r.label), ["Exam Room"]);
  assert.equal(medicals.hasChildren, true);
  assert.equal(story.groups.flatMap((g) => g.rows).filter((r) => r.title === "Exam Room").length, 0);
});

test("the options the players choose between, and the muster after them, are slots under the scene that offers them", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const night = story.groups[0].rows[3];
  assert.equal(night.options.kind, "free");
  assert.equal(night.options.question, "Where do you spend the night?");
  assert.deepEqual(night.options.items.map((i) => [i.label, i.state]), [["The Bathhouse", "ok"], ["The Lantern", "gap"], ["Down the drain", "broken"]]);
  assert.equal(night.options.then.label, "Back at the gate");
  assert.equal(night.options.then.state, "ok");
  assert.equal(night.gaps, 3, "the scene's own gap, an empty option and a broken one");
});

test("travel points show only where the scene wrote them, and an empty one is a gap", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const road = story.groups[0].rows[1];
  assert.deepEqual(road.positions.map((p) => [p.label, p.state]), [["Opens at", "ok"], ["Closes at", "gap"]]);
  assert.equal(story.groups[0].rows[0].positions.length, 0, "a scene that wrote no position is not given one");
  assert.equal(story.groups[0].counts.pointGaps, 1);
});

test("haunts are their own group, each one showing where the story offers it", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const haunts = story.groups.find((g) => g.kind === "haunts");
  assert.deepEqual(haunts.rows.map((r) => r.title), ["The Bathhouse", "The Lantern"]);
  const bath = haunts.rows[0];
  assert.equal(bath.place.location.name, "The Bathhouse");
  assert.equal(bath.offeredIn.length, 1);
  assert.equal(bath.offeredIn[0].label, "Offered at the end of The Night");
  assert.equal(bath.offeredIn[0].optionLabel, "The Bathhouse");
  assert.equal(haunts.rows[1].offeredIn.length, 1);
  assert.equal(haunts.counts.gaps, 1, "the Lantern has no place");
});

test("a scene no episode or haunt list reaches is still shown, and the map hub is not a scene", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const other = story.groups.find((g) => g.kind === "other");
  assert.deepEqual(other.rows.map((r) => r.title), ["A Stray"]);
  assert.equal(story.groups.flatMap((g) => g.rows).some((r) => r.title === "The City"), false);
});

test("an episode scene with no Foundry scene yet is unbuilt, which is a gap", () => {
  const docs = fixture();
  docs.episodes[0].scenes.push({ order: 9, id: "later", title: "Later", briefRef: "brief-later" });
  const row = buildStory(docs, { locations: LOCATIONS }).groups[0].rows.at(-1);
  assert.equal(row.unbuilt, true);
  assert.equal(row.sceneGap, true);
  assert.equal(row.place, null);
});

test("counts and totals add up", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const episode = story.groups[0].counts;
  assert.deepEqual({ scenes: episode.scenes, placed: episode.placed, offmap: episode.offmap, gaps: episode.gaps, approximate: episode.approximate, options: episode.options, optionGaps: episode.optionGaps }, { scenes: 4, placed: 2, offmap: 1, gaps: 1, approximate: 1, options: 3, optionGaps: 2 });
  assert.equal(story.totals.scenes, 4 + 2 + 1);
  assert.equal(story.totals.gaps, 2);
});

/* ------------------------------------------------------------------ */
/*  What the GM chose but the repo has not heard yet                    */
/* ------------------------------------------------------------------ */

test("a waiting placement is shown over what is deployed, marked as waiting, and a gap it fills stops being one", () => {
  const key = targetKey(sceneTarget("e1-rest"));
  const story = buildStory(fixture(), { locations: LOCATIONS, overrides: { [key]: { locationId: "hall", recordId: "r1" } } });
  const night = story.groups[0].rows[3];
  assert.equal(night.place.locationId, "hall");
  assert.equal(night.place.deployedLocationId, null, "what is deployed is still known");
  assert.equal(night.place.pending, true);
  assert.equal(night.place.recordId, "r1");
  assert.equal(night.place.state, "ok");
  assert.equal(night.sceneGap, false);
  assert.equal(story.groups[0].counts.pending, 1);
});

test("a waiting placement at a place drawn but not pulled yet shows the new place's name", () => {
  const key = targetKey(sceneTarget("e1-rest"));
  const story = buildStory(fixture(), {
    locations: LOCATIONS,
    overrides: { [key]: { viaRecord: "draw-1", recordId: "r2" } },
    newLocations: { "draw-1": { name: "The New Shed", tier: "site" } }
  });
  const slot = story.groups[0].rows[3].place;
  assert.equal(slot.state, "pending-new");
  assert.equal(slot.location.name, "The New Shed");
  assert.equal(slot.viaRecord, "draw-1");
  assert.equal(chipOf(slot).text, "The New Shed (new)");
});

test("a waiting 'no place' empties the slot", () => {
  const key = targetKey(sceneTarget("e1-road"));
  const story = buildStory(fixture(), { locations: LOCATIONS, overrides: { [key]: { locationId: null, recordId: "r3" } } });
  assert.equal(story.groups[0].rows[1].place.state, "gap");
});

test("a waiting placement stops an 'approximate' flag showing: the GM has chosen", () => {
  const key = targetKey(sceneTarget("e1-medicals"));
  const story = buildStory(fixture(), { locations: LOCATIONS, overrides: { [key]: { locationId: "hall", recordId: "r4" } } });
  assert.equal(story.groups[0].rows[2].place.state, "ok");
});

test("overridesFromRecords: the newest record for a target wins; a record at a drawn place waits for that place's id", () => {
  const target = sceneTarget("e1-rest");
  const records = [
    { id: "a", op: "site", target, locationId: "gate", viaRecord: null },
    { id: "b", op: "site", target, locationId: "hall", viaRecord: null },
    { id: "c", op: "site", target: sceneTarget("e1-road"), locationId: null, viaRecord: "draw-9" },
    { id: "d", op: "update", target: null }
  ];
  const waiting = overridesFromRecords(records);
  assert.deepEqual(waiting[targetKey(target)], { locationId: "hall", recordId: "b" });
  assert.deepEqual(waiting[targetKey(sceneTarget("e1-road"))], { viaRecord: "draw-9", recordId: "c" });
  const resolved = overridesFromRecords(records, { resolveVia: (id) => (id === "draw-9" ? "the-new-shed" : null) });
  assert.deepEqual(resolved[targetKey(sceneTarget("e1-road"))], { locationId: "the-new-shed", recordId: "c" });
});

/* ------------------------------------------------------------------ */
/*  Moving things together                                              */
/* ------------------------------------------------------------------ */

test("linked slots: the places that agree with a haunt's today, in its brief and in the option that offers it", () => {
  const docs = fixture();
  const links = linkedSlots(docs, sceneTarget("haunt-bath"));
  assert.deepEqual(links.map((l) => l.key).sort(), [
    "destination:brief-night:bath",
    "position:rest--bath:intro",
    "position:rest--bath:outro"
  ]);
  assert.ok(links.every((l) => l.defaultChecked && l.value === "bath"));
});

test("linked slots only include the ones that currently agree, so nothing is moved that was already different", () => {
  const docs = fixture();
  docs.briefs["rest--bath"].outro.position.locationRef = "hall";
  const links = linkedSlots(docs, sceneTarget("haunt-bath"));
  assert.equal(links.some((l) => l.key === "position:rest--bath:outro"), false);
  assert.equal(links.some((l) => l.key === "position:rest--bath:intro"), true);
});

test("linked slots work from an option too, and a sibling room that agrees is offered but not ticked", () => {
  const docs = fixture();
  const fromOption = linkedSlots(docs, destinationTarget("brief-night", "bath"));
  assert.deepEqual(fromOption.map((l) => l.key).sort(), ["position:rest--bath:intro", "position:rest--bath:outro", "scene:haunt-bath"]);
  const rooms = linkedSlots(docs, sceneTarget("e1-medicals"));
  const exam = rooms.find((l) => l.key === "scene:e1-medicals-exam");
  assert.ok(exam, "the exam room agrees with the main scene");
  assert.equal(exam.defaultChecked, false, "a room is not always the building it is in");
  assert.equal(rooms.find((l) => l.key === "position:brief-medicals:outro").defaultChecked, true);
});

test("a slot with nothing in it has nothing agreeing with it", () => {
  assert.deepEqual(linkedSlots(fixture(), sceneTarget("e1-rest")), []);
});

test("linked slots see a waiting placement, so a second change follows the first", () => {
  const docs = fixture();
  const overrides = { [targetKey(sceneTarget("haunt-bath"))]: { locationId: "hall", recordId: "r1" }, [targetKey(destinationTarget("brief-night", "bath"))]: { locationId: "hall", recordId: "r1" } };
  const links = linkedSlots(docs, sceneTarget("haunt-bath"), { overrides });
  assert.deepEqual(links.map((l) => l.key), ["destination:brief-night:bath"]);
});

/* ------------------------------------------------------------------ */
/*  Finding a place by name                                             */
/* ------------------------------------------------------------------ */

test("searchPlaces ranks names that start with the text, then names that contain it, then ids", () => {
  const locations = { a: { id: "a", name: "The Bathhouse", tier: "site" }, b: { id: "b", name: "Bath Road", tier: "region" }, "bath-store": { id: "bath-store", name: "Stores", tier: "site" }, z: { id: "z", name: "Unrelated", tier: "site" } };
  assert.deepEqual(searchPlaces(locations, "bath").map((r) => r.name), ["Bath Road", "The Bathhouse", "Stores"]);
  assert.deepEqual(searchPlaces(locations, "").length, 0);
  assert.deepEqual(searchPlaces(locations, "bath", { tiers: ["site"] }).map((r) => r.name), ["The Bathhouse", "Stores"]);
  assert.equal(searchPlaces(locations, "bath", { limit: 1 }).length, 1);
});

test("searchPlaces also offers a place drawn but not yet pulled, by the record that drew it", () => {
  const found = searchPlaces({}, "shed", { extra: [{ recordId: "draw-1", name: "The New Shed", tier: "site" }] });
  assert.deepEqual(found, [{ id: null, recordId: "draw-1", name: "The New Shed", tier: "site", kind: "", pending: true }]);
});

/* ------------------------------------------------------------------ */
/*  The records                                                         */
/* ------------------------------------------------------------------ */

const base = { at: "2026-10-01T12:00:00.000Z", rand: "abc123", by: "Gamemaster" };

test("a 'site' record carries its target, what it was placed at, and what the editor saw; no tier or geometry", () => {
  const record = makeRecord({ ...base, op: "site", target: sceneTarget("e1-rest"), locationId: "hall", before: null, note: "Closer to the tram." });
  assert.deepEqual(validateRecord(record), []);
  assert.equal(record.tier, null);
  assert.equal(record.geometry, null);
  assert.equal(record.viaRecord, null);
  assert.equal(record.beforeVia, null);
  assert.equal(record.note, "Closer to the tram.");
});

test("a 'site' record can name the place by the record that drew it, or empty the slot", () => {
  assert.deepEqual(validateRecord(makeRecord({ ...base, op: "site", target: sceneTarget("e1-rest"), viaRecord: "2026-10-01T123626108Z-a8s4Wo" })), []);
  assert.deepEqual(validateRecord(makeRecord({ ...base, op: "site", target: sceneTarget("e1-rest"), before: "gate" })), [], "neither: the slot is emptied");
  assert.deepEqual(validateRecord(makeRecord({ ...base, op: "site", target: sceneTarget("e1-rest"), viaRecord: "r", beforeVia: "r0" })), []);
});

test("a malformed 'site' record is refused with a reason", () => {
  const ok = makeRecord({ ...base, op: "site", target: sceneTarget("e1-rest"), locationId: "hall" });
  assert.ok(validateRecord({ ...ok, target: { kind: "scene" } }).some((p) => /target/.test(p)));
  assert.ok(validateRecord({ ...ok, viaRecord: "r" }).some((p) => /not both/.test(p)));
  assert.ok(validateRecord({ ...ok, geometry: { rings: [] } }).some((p) => /geometry/.test(p)));
  assert.ok(validateRecord({ ...ok, fields: {} }).some((p) => /fields/.test(p)));
  assert.ok(validateRecord({ ...ok, before: 4 }).some((p) => /before/.test(p)));
  assert.ok(validateRecord({ ...ok, note: 4 }).some((p) => /note/.test(p)));
});

test("the other ops' records keep exactly the shape they always had", () => {
  const record = makeRecord({ ...base, op: "update", locationId: "x", tier: "site", fields: {}, before: {} });
  assert.deepEqual(Object.keys(record), ["kind", "version", "id", "at", "by", "op", "locationId", "tier", "draftId", "geometry", "fields", "before"]);
  assert.throws(() => makeRecord({ ...base, op: "create", geometry: {}, fields: {} }), /unknown tier/, "only a site record may leave out its tier");
});

/* ------------------------------------------------------------------ */
/*  The story as lines                                                  */
/* ------------------------------------------------------------------ */

const UI = { openGroups: new Set(["ep-1", "haunts"]), openRows: new Set() };

test("a closed group shows just its header; an open one shows its scenes in order", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const closed = storyLines(story, { openGroups: new Set() });
  assert.deepEqual(closed.map((l) => l.type), ["group", "group", "group"]);
  const open = storyLines(story, { openGroups: new Set(["ep-1"]) });
  assert.deepEqual(open.filter((l) => l.type === "scene").map((l) => l.title), ["From Above", "The Road", "Medicals", "The Night"]);
});

test("an opened scene shows its rooms, its options (under a question) and its travel points", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const lines = storyLines(story, { ...UI, openRows: new Set(["scene:ep-1:night", "scene:ep-1:medicals", "scene:ep-1:road"]) });
  const types = lines.map((l) => `${l.type}${l.role ? `:${l.role}` : ""}`);
  assert.ok(types.includes("header"), "the question the players answer");
  assert.equal(lines.filter((l) => l.role === "option").length, 3);
  assert.equal(lines.filter((l) => l.role === "then").length, 1);
  assert.equal(lines.filter((l) => l.role === "room").length, 1);
  assert.equal(lines.filter((l) => l.role === "position").length, 2 + 2, "the road's two and medicals' two");
  const header = lines.find((l) => l.type === "header");
  assert.equal(header.text, "Where do you spend the night?");
  assert.equal(header.detail, "each player chooses");
});

test("haunts show where the story offers them when opened", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const lines = storyLines(story, { ...UI, openRows: new Set(["haunt:haunt-bath"]) });
  assert.equal(lines.filter((l) => l.role === "offered").length, 1);
});

test("'only what needs a place' hides every scene without a gap, and opens the ones that have one", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const lines = storyLines(story, { onlyGaps: true });
  const scenes = lines.filter((l) => l.type === "scene").map((l) => l.title);
  assert.ok(scenes.includes("The Night"));
  assert.ok(scenes.includes("The Road"), "a closing travel point with nothing in it counts");
  assert.equal(scenes.includes("From Above"), false, "off the map by design is not a gap");
  assert.equal(scenes.includes("Medicals"), false);
  const slots = lines.filter((l) => l.type === "slot");
  assert.ok(slots.length > 0 && slots.every((l) => l.chip.state === "gap" || l.chip.state === "broken"), "an opened scene shows only its gaps");
});

test("the slot being changed gets an editor line right under it", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const lines = storyLines(story, { ...UI, editing: "scene:e1-rest" });
  const at = lines.findIndex((l) => l.type === "scene" && l.title === "The Night");
  assert.equal(lines[at].editing, true);
  assert.equal(lines[at + 1].type, "editor");
  assert.equal(lines[at + 1].slotKey, "scene:e1-rest");
  const options = storyLines(story, { ...UI, openRows: new Set(["scene:ep-1:night"]), editing: "destination:brief-night:lantern" });
  const slotAt = options.findIndex((l) => l.slotKey === "destination:brief-night:lantern");
  assert.equal(options[slotAt + 1].type, "editor");
});

test("chips say what the place is, and only a drawable place can be shown on the map", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const lines = storyLines(story, UI);
  const road = lines.find((l) => l.title === "The Road");
  assert.deepEqual([road.chip.text, road.chip.tier, road.focusable], ["The Gate", "building", true]);
  const night = lines.find((l) => l.title === "The Night");
  assert.deepEqual([night.chip.text, night.focusable, night.chip.cls], ["No place yet", false, "bi-story__chip--gap"]);
  assert.equal(chipOf(null).text, "No Foundry scene yet");
});

test("slotIndex finds any slot's scene by key, and the group summary reads plainly", () => {
  const story = buildStory(fixture(), { locations: LOCATIONS });
  const index = slotIndex(story);
  assert.equal(index.get("destination:brief-night:bath").row.title, "The Night");
  assert.equal(index.get("scene:haunt-bath").group.kind, "haunts");
  assert.equal(groupSummary({ scenes: 1, gaps: 0, optionGaps: 0, pointGaps: 0, approximate: 0, pending: 0 }), "1 scene");
  assert.equal(groupSummary({ scenes: 12, gaps: 2, optionGaps: 1, pointGaps: 3, approximate: 1, pending: 2 }), "12 scenes · 2 without a place · 1 option without a place · 3 travel points empty · 1 approximate · 2 waiting to be pulled");
});

/* ------------------------------------------------------------------ */
/*  The real campaign                                                   */
/* ------------------------------------------------------------------ */

function realDocs() {
  const read = (p) => JSON.parse(readFileSync(path.join(repoRoot, p), "utf8"));
  const docs = { sceneSet: read("data/campaign/scene-set.json"), briefs: {}, episodes: [] };
  for (const f of readdirSync(path.join(repoRoot, "data", "scene-briefs"))) docs.briefs[f.replace(/\.json$/, "")] = read(`data/scene-briefs/${f}`);
  for (const f of readdirSync(path.join(repoRoot, "data", "episodes"))) docs.episodes.push(read(`data/episodes/${f}`));
  const locations = {};
  for (const f of readdirSync(path.join(repoRoot, "data", "locations"))) {
    const d = read(`data/locations/${f}`);
    locations[d.id] = { id: d.id, name: d.name, tier: d.tier, kind: d.kind };
  }
  return { docs, locations };
}

test("the real campaign builds a story: every episode scene is listed once, in order, with the haunts as their own group", () => {
  const { docs, locations } = realDocs();
  const story = buildStory(docs, { locations });
  const episodes = story.groups.filter((g) => g.kind === "episode");
  assert.equal(episodes.length, docs.episodes.length);
  for (const group of episodes) {
    const episode = docs.episodes.find((e) => e.id === group.id);
    assert.deepEqual(group.rows.map((r) => r.title), [...episode.scenes].sort((a, b) => a.order - b.order).map((s) => s.title ?? s.id));
  }
  const haunts = story.groups.find((g) => g.kind === "haunts");
  assert.equal(haunts.rows.length, docs.sceneSet.scenes.filter((s) => s.group === "haunts").length);
  assert.ok(haunts.rows.length >= 11);
});

test("in the real campaign a placement that names a location that does not exist belongs to a scene that is itself waiting for a place", () => {
  // The Paper Lantern's travel points name "the-paper-lantern", a location nobody has drawn yet; the scene itself has
  // no place either. That is the Story list doing its job (a gap to fill), and the only way a broken name is allowed
  // to appear: a name pointing nowhere on a scene that IS placed would be an error in the data.
  const { docs, locations } = realDocs();
  const story = buildStory(docs, { locations });
  const stray = [];
  for (const [key, { slot, row }] of slotIndex(story)) {
    if (slot.state === "broken" && row.place?.state !== "gap") stray.push(`${key} -> ${slot.locationId}`);
  }
  assert.deepEqual(stray, [], "a placement that points nowhere is invisible on the map and cannot be opened");
});

test("every slot the story shows is really there in the documents, so a placement can always be written", () => {
  const { docs, locations } = realDocs();
  const story = buildStory(docs, { locations });
  for (const [key, { slot }] of slotIndex(story)) assert.equal(slot.exists, true, key);
  assert.ok(slotIndex(story).size > 100);
});

test("writing a slot's own value back changes nothing, for every real slot", () => {
  const { docs, locations } = realDocs();
  const story = buildStory(docs, { locations });
  const before = JSON.stringify(docs);
  const copy = clone(docs);
  for (const [, { slot }] of slotIndex(story)) {
    const wrote = writeSlot(copy, slot.target, slot.deployedLocationId);
    assert.equal(wrote.ok, true, slot.key);
  }
  assert.equal(JSON.stringify(copy), before);
});

test("in the real campaign every option offered in a departure that leads to a haunt is listed under that haunt", () => {
  const { docs, locations } = realDocs();
  const haunts = buildStory(docs, { locations }).groups.find((g) => g.kind === "haunts");
  const offered = haunts.rows.flatMap((r) => r.offeredIn.map((s) => s.key));
  const direct = [];
  for (const [briefId, brief] of Object.entries(docs.briefs)) {
    for (const d of brief.outro?.departure?.destinations ?? []) {
      if (haunts.rows.some((r) => r.briefRef === d.briefRef)) direct.push(`destination:${briefId}:${d.id}`);
    }
  }
  assert.deepEqual([...offered].sort(), [...direct].sort());
});

/* ------------------------------------------------------------------ */
/*  Off the map on purpose                                              */
/* ------------------------------------------------------------------ */

import { isOffMapReason, OFF_MAP_REASONS, offMapLabel } from "../module/blank-inheritance/scripts/core/siting.mjs";

test("there is a real list of reasons a scene needs no place, each with a label and a hint, and ids are unique", () => {
  assert.ok(OFF_MAP_REASONS.length >= 15);
  assert.equal(new Set(OFF_MAP_REASONS.map((r) => r.id)).size, OFF_MAP_REASONS.length);
  for (const r of OFF_MAP_REASONS) assert.ok(r.id && r.label && r.hint, r.id);
  for (const id of ["view-from-above", "in-transit", "remote", "memory", "off-world", "another-map", "out-of-character", "unknown"]) assert.ok(isOffMapReason(id), id);
  assert.equal(isOffMapReason("because"), false);
  assert.equal(offMapLabel("remote"), "A call, message or broadcast");
});

test("a scene marked off the map is not a gap, and says why; placing it later drops the mark", () => {
  const docs = fixture();
  assert.equal(applySiting(docs, sceneTarget("e1-rest"), null, { offMap: "in-transit", date: "2026-10-01" }).ok, true);
  const entry = docs.sceneSet.scenes.find((s) => s.id === "e1-rest");
  assert.deepEqual(entry.offMap, { reason: "in-transit" });
  assert.match(entry.locationNote, /On the move/);
  const row = buildStory(docs, { locations: LOCATIONS }).groups[0].rows[3];
  assert.equal(row.place.state, "offmap");
  assert.equal(row.place.offMapReason, "in-transit");
  assert.equal(row.sceneGap, false);
  assert.equal(chipOf(row.place).text, "Off the map: On the move");
  applySiting(docs, sceneTarget("e1-rest"), "hall");
  assert.equal("offMap" in docs.sceneSet.scenes.find((s) => s.id === "e1-rest"), false);
});

test("only a scene can be off the map, only with a known reason, and never with a place as well", () => {
  const docs = fixture();
  assert.equal(applySiting(docs, positionTarget("brief-road", "outro"), null, { offMap: "remote" }).ok, false);
  assert.equal(applySiting(docs, sceneTarget("e1-rest"), null, { offMap: "nonsense" }).ok, false);
  assert.equal(applySiting(docs, sceneTarget("e1-rest"), "hall", { offMap: "remote" }).ok, false);
  const ok = makeRecord({ ...base, op: "site", target: sceneTarget("e1-rest"), offMap: "remote" });
  assert.deepEqual(validateRecord(ok), []);
  assert.ok(validateRecord({ ...ok, offMap: "nonsense" }).length);
  assert.ok(validateRecord({ ...ok, locationId: "hall" }).length);
  assert.ok(validateRecord({ ...ok, target: positionTarget("b", "intro") }).length);
});

test("a waiting off-map choice shows over the deployed place, and the From Above landing stays off the map by default", () => {
  const key = targetKey(sceneTarget("e1-road"));
  const story = buildStory(fixture(), { locations: LOCATIONS, overrides: { [key]: { locationId: null, offMap: "remote", recordId: "r" } } });
  assert.equal(story.groups[0].rows[1].place.state, "offmap");
  assert.equal(story.groups[0].rows[1].place.pending, true);
  assert.equal(chipOf(buildStory(fixture(), { locations: LOCATIONS }).groups[0].rows[0].place).text, "Off the map: A view from above");
  assert.equal(overridesFromRecords([{ id: "z", op: "site", target: sceneTarget("e1-road"), locationId: null, offMap: "remote" }])[key].offMap, "remote");
});
