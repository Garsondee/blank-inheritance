// Tier 1 -- which places the story uses, and by what (core/places-index.mjs): the index behind the Places tab and "move all uses".

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStory, readSlot, writeSlot } from "../module/blank-inheritance/scripts/core/siting.mjs";
import { buildPlacesIndex, bulkMovePlan, filterPlaces, placeKey, placementSignature, roleLabel, slotsOfStory } from "../module/blank-inheritance/scripts/core/places-index.mjs";
import { departureDocs, locations } from "./support/journey-fixture-world.mjs";

const storyOf = (placeOf, options = {}) => buildStory(departureDocs(placeOf), { locations, ...options });

test("every slot of the story is listed once, with the part it plays", () => {
  const story = storyOf(["west", "east", "west"]);
  const slots = slotsOfStory(story);
  const keys = slots.map((s) => s.slot.key);
  assert.equal(new Set(keys).size, keys.length, "a slot is never listed twice, even when the story offers it from two places");
  const roles = slots.map((s) => s.role);
  for (const role of ["scene", "option", "then"]) assert.ok(roles.includes(role), role);
  assert.equal(slots.filter((s) => s.role === "scene").length, 5, "three scenes of the episode and the two rest scenes of the haunts");
  assert.equal(slots.filter((s) => s.role === "option").length, 2);
  assert.equal(slots.filter((s) => s.role === "offered").length, 0, "the haunts' 'offered at' slots are the very option slots already listed");
});

test("a place used in several slots is one entry with all its uses, most used first", () => {
  const index = buildPlacesIndex(storyOf(["west", "east", "west"]), { locations });
  assert.equal(index[0].locationId, "west");
  assert.deepEqual(index[0].uses.map((u) => [u.rowTitle, u.role]), [["One", "scene"], ["Two", "then"], ["Three", "scene"]]);
  assert.deepEqual([index[0].scenes, index[0].choices], [2, 1]);
  assert.equal(index[0].name, "west");
  assert.equal(index[0].tier, "site");
  assert.deepEqual(index[0].groups, ["ep"]);
  const rest = index.find((e) => e.locationId === "road-mid-1");
  assert.deepEqual(rest.uses.map((u) => u.role).sort(), ["option", "scene"], "an option of the Two departure, and the rest scene's own place");
  assert.deepEqual([...new Set(rest.uses.map((u) => u.groupId))].sort(), ["ep", "haunts"]);
  assert.ok(index.every((e, i) => i === 0 || e.uses.length <= index[i - 1].uses.length), "sorted by use");
});

test("a use carries what the panel needs to show it and to write it: the slot key, the target, the row, the label and the role in words", () => {
  const index = buildPlacesIndex(storyOf(["west", "east", "west"]), { locations });
  const use = index.find((e) => e.locationId === "east").uses[0];
  assert.deepEqual({ slotKey: use.slotKey, role: use.role, roleLabel: use.roleLabel, rowTitle: use.rowTitle, label: use.label }, { slotKey: "scene:ss-2", role: "scene", roleLabel: "where the scene happens", rowTitle: "Two", label: "Happens at" });
  assert.deepEqual(use.target, { kind: "scene", sceneSetId: "ss-2" });
  assert.equal(use.pending, false);
  assert.equal(roleLabel("then"), "where everyone musters");
  assert.equal(roleLabel("nonsense"), "nonsense");
});

test("a slot with no place, or off the map on purpose, uses nothing; one with a place that does not exist is flagged broken", () => {
  const docs = departureDocs(["west", "east", "west"]);
  delete docs.sceneSet.scenes.find((s) => s.id === "ss-3").locationRef;
  docs.sceneSet.scenes.find((s) => s.id === "ss-1").locationRef = "ghost";
  const index = buildPlacesIndex(buildStory(docs, { locations }), { locations });
  assert.ok(!index.some((e) => e.uses.some((u) => u.slotKey === "scene:ss-3")), "no place, no use");
  const ghost = index.find((e) => e.locationId === "ghost");
  assert.equal(ghost.broken, true);
  assert.equal(ghost.name, "ghost");
});

test("a placement still waiting to be pulled is what the index sees, marked pending; a new place is indexed by the record that drew it", () => {
  const story = storyOf(["west", "east", "west"], { overrides: { "scene:ss-2": { locationId: "u-west", recordId: "r1" } } });
  const index = buildPlacesIndex(story, { locations });
  assert.ok(!index.some((e) => e.locationId === "east"), "nothing is at the old place once the one scene there has moved");
  const u = index.find((e) => e.locationId === "u-west");
  assert.equal(u.pending, true);
  assert.equal(u.uses[0].deployedLocationId, "east", "the deployed value is kept, for reverting");

  const fresh = buildPlacesIndex(storyOf(["west", "east", "west"], { overrides: { "scene:ss-2": { viaRecord: "r7", recordId: "r8" } }, newLocations: { r7: { name: "A new spot", tier: "point" } } }), { locations });
  const added = fresh.find((e) => e.key === "new:r7");
  assert.ok(added);
  assert.equal(added.name, "A new spot");
  assert.equal(added.tier, "point");
  assert.equal(added.locationId, null);
  assert.equal(added.viaRecord, "r7");
  assert.equal(placeKey({ locationId: null, viaRecord: "r7" }), "new:r7");
  assert.equal(placeKey({ locationId: null, viaRecord: null }), null);
});

test("the index is narrowed by a name, an id or a scene, and to places shared by more than one slot", () => {
  const index = buildPlacesIndex(storyOf(["west", "east", "west"]), { locations });
  assert.deepEqual(filterPlaces(index, { query: "EAS" }).map((e) => e.locationId), ["east"]);
  assert.deepEqual(filterPlaces(index, { query: "three" }).map((e) => e.locationId), ["west"], "by the title of a scene that uses it");
  assert.deepEqual(filterPlaces(index, { query: "happens at" }).length > 0, true, "or by the slot's own label");
  assert.equal(filterPlaces(index, { query: "zzz" }).length, 0);
  assert.equal(filterPlaces(index, {}).length, index.length);
  const shared = filterPlaces(index, { shared: true });
  assert.ok(shared.length > 0 && shared.every((e) => e.uses.length >= 2));
  assert.ok(shared.length < index.length);
});

/* ---------------------------------------------------------------- moving everything at one place */

test("moving every use of a place yields one write per slot, each remembering what the editor saw there", () => {
  const story = storyOf(["west", "east", "west"]);
  const index = buildPlacesIndex(story, { locations });
  const west = index.find((e) => e.locationId === "west");
  const { writes, skipped } = bulkMovePlan(story, { slotKeys: west.uses.map((u) => u.slotKey), choice: { locationId: "u-east" } });
  assert.deepEqual(skipped, []);
  assert.deepEqual(writes.map((w) => w.key), west.uses.map((u) => u.slotKey));
  assert.ok(writes.every((w) => w.before === "west" && w.beforeVia === null));
  assert.deepEqual(writes.map((w) => w.isScene), [true, false, true], "two scenes and a muster");
  assert.deepEqual(writes[0].target, { kind: "scene", sceneSetId: "ss-1" });
  assert.deepEqual(writes[1].target, { kind: "destination", briefRef: "b2", destinationId: "$then" });
  assert.equal(writes[0].label, "One · Happens at");
});

test("a slot already at the destination, one that is not in the story, and a place off the map are each reported, never written", () => {
  const story = storyOf(["west", "east", "west"]);
  const { writes, skipped } = bulkMovePlan(story, { slotKeys: ["scene:ss-1", "scene:ss-2", "scene:nope"], choice: { locationId: "east" } });
  assert.deepEqual(writes.map((w) => w.key), ["scene:ss-1"]);
  assert.deepEqual(skipped, [{ key: "scene:ss-2", reason: "already there" }, { key: "scene:nope", reason: "not in the story" }]);
  const off = bulkMovePlan(storyOf(["west", "east", "west"], { overrides: { "scene:ss-1": { locationId: null, offMap: "memory", recordId: "r" } } }), { slotKeys: ["scene:ss-1"], choice: { offMap: "memory" } });
  assert.deepEqual(off.skipped, [{ key: "scene:ss-1", reason: "already there" }]);
  assert.deepEqual(bulkMovePlan(story, { slotKeys: undefined, choice: { locationId: "east" } }), { writes: [], skipped: [] });
});

test("moving a slot that is itself waiting on a drawn place remembers that record as what it saw", () => {
  const story = storyOf(["west", "east", "west"], { overrides: { "scene:ss-1": { viaRecord: "r7", recordId: "r8" } }, newLocations: { r7: { name: "A new spot", tier: "point" } } });
  const { writes } = bulkMovePlan(story, { slotKeys: ["scene:ss-1"], choice: { locationId: "east" } });
  assert.equal(writes[0].before, null, "the new place has no id yet");
  assert.equal(writes[0].beforeVia, "r7", "so the pull compares against the record that drew it");
});

test("the writes are exactly what applying the move to the documents does: every slot ends at the destination, none other is touched", () => {
  const docs = departureDocs(["west", "east", "west"]);
  const story = buildStory(docs, { locations });
  const west = buildPlacesIndex(story, { locations }).find((e) => e.locationId === "west");
  const { writes } = bulkMovePlan(story, { slotKeys: west.uses.map((u) => u.slotKey), choice: { locationId: "u-east" } });
  const before = JSON.parse(JSON.stringify(docs));
  for (const write of writes) assert.equal(writeSlot(docs, write.target, "u-east").ok, true);
  for (const write of writes) assert.equal(readSlot(docs, write.target).value, "u-east");
  assert.equal(readSlot(docs, { kind: "scene", sceneSetId: "ss-2" }).value, readSlot(before, { kind: "scene", sceneSetId: "ss-2" }).value, "a scene at another place is left alone");
  const after = buildPlacesIndex(buildStory(docs, { locations }), { locations });
  assert.ok(!after.some((e) => e.locationId === "west"), "nothing is left at the old place");
  assert.equal(after.find((e) => e.locationId === "u-east").uses.length, writes.length);
});

test("the placement signature changes when any place changes and only then, so an analysis can be cached by it", () => {
  const a = placementSignature(storyOf(["west", "east", "west"]));
  assert.equal(placementSignature(storyOf(["west", "east", "west"])), a, "the same placements, the same signature");
  assert.notEqual(placementSignature(storyOf(["west", "bay", "west"])), a, "a scene moved");
  assert.notEqual(placementSignature(storyOf(["west", "east", "west"], { overrides: { "scene:ss-2": { locationId: "east", recordId: "r1" } } })), a === "" ? "" : "x", "any signature is not empty");
  const off = placementSignature(storyOf(["west", "east", "west"], { overrides: { "scene:ss-1": { locationId: null, offMap: "memory", recordId: "r" } } }));
  assert.notEqual(off, a, "off the map is a change");
  const pending = placementSignature(storyOf(["west", "east", "west"], { overrides: { "scene:ss-2": { viaRecord: "r7", recordId: "r8" } }, newLocations: { r7: { name: "n", tier: "point" } } }));
  assert.notEqual(pending, a);
  assert.ok(a.includes("scene:ss-1=west|"));
});
