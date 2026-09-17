// Tier 1 — the scene set's own planning (scripts/core/generators/scene-set.mjs):
// where a map pin lands, what a bad manifest is caught saying, and the order
// and navigation flags the built scenes come out with.
//
// Runs against the REAL data/campaign/scene-set.json and the REAL gazetteer
// locations it names, so this doubles as a corpus test: authoring a scene
// against a location that does not exist fails here, not in a live world
// half an hour before a session.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PIN_CROWDING_PX,
  hubPinPlan,
  pinJournalPage,
  pinPosition,
  sceneSetPlan,
  validateSceneSet
} from "../module/blank-inheritance/scripts/core/generators/scene-set.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));

const manifest = readJson("data/campaign/scene-set.json");
const locations = new Map();
for (const ref of [...new Set(manifest.scenes.map((s) => s.locationRef).filter(Boolean))]) {
  const file = `data/locations/${ref}.json`;
  if (existsSync(path.join(repoRoot, file))) locations.set(ref, readJson(file));
}

test("the shipped scene set is internally consistent and every pin has somewhere real to sit", () => {
  assert.deepEqual(validateSceneSet(manifest, { locations }), []);
});

test("every scene's artwork actually exists in the module", () => {
  const root = manifest.artRoot.replace("modules/blank-inheritance/", "module/blank-inheritance/");
  for (const scene of manifest.scenes) {
    const file = path.join(repoRoot, root, `${scene.art}.webp`);
    assert.ok(existsSync(file), `${scene.id} names art "${scene.art}.webp", which is not in ${root}`);
  }
});

test("a pin is placed from its location's own centroid, scaled, then nudged", () => {
  const location = { id: "x", derived: { centroidPx: [7000, 6500] } };
  assert.deepEqual(pinPosition(location, 0.5), { x: 3500, y: 3250 });
  assert.deepEqual(pinPosition(location, 0.5, [-70, 40]), { x: 3430, y: 3290 });
  assert.deepEqual(pinPosition(location, 1), { x: 7000, y: 6500 });
  assert.throws(() => pinPosition({ id: "y", derived: {} }, 0.5), /centroidPx/);
  assert.throws(() => pinPosition(location, 0), /mapScale/);
});

test("crowded pins are REPORTED, never silently shoved apart", () => {
  // The two campus buildings really are eleven pixels apart on the map.
  const crowded = {
    groups: [{ id: "g", name: "G" }],
    scenes: [
      { id: "a", name: "A", art: "a", group: "g", kind: "landing", locationRef: "one" },
      { id: "b", name: "B", art: "b", group: "g", kind: "beat", locationRef: "two" },
      { id: "hub", name: "Hub", art: "m", group: "g", kind: "hub", mapScale: 0.5, pins: [{ sceneRef: "a" }, { sceneRef: "b" }] }
    ]
  };
  const near = new Map([
    ["one", { id: "one", derived: { centroidPx: [6962, 6486] } }],
    ["two", { id: "two", derived: { centroidPx: [6944, 6500] } }]
  ]);
  const problems = validateSceneSet(crowded, { locations: near });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /overlap — give one an offsetPx/);

  // And an offset silences it, because the author has now said where it goes.
  crowded.scenes[2].pins[1].offsetPx = [80, 80];
  assert.deepEqual(validateSceneSet(crowded, { locations: near }), []);
  assert.ok(PIN_CROWDING_PX >= 32, "the crowding threshold should be at least Foundry's minimum icon size");
});

test("a manifest that names a missing location, a missing group or two landing scenes is caught", () => {
  const broken = {
    groups: [{ id: "g", name: "G" }],
    scenes: [
      { id: "a", name: "A", art: "a", group: "nope", kind: "landing" },
      { id: "b", name: "B", art: "b", group: "g", kind: "landing", locationRef: "ghost" },
      { id: "a", name: "dupe", art: "c", group: "g", kind: "beat" }
    ]
  };
  const problems = validateSceneSet(broken, { locations: new Map() });
  assert.ok(problems.some((p) => /group "nope", which does not exist/.test(p)));
  assert.ok(problems.some((p) => /location "ghost", which is not in the gazetteer/.test(p)));
  assert.ok(problems.some((p) => /duplicate scene id "a"/.test(p)));
  assert.ok(problems.some((p) => /2 scenes claim to be the landing scene/.test(p)));
});

test("the plan orders by group then order, and keeps sub-rooms off the navigation bar", () => {
  const plans = sceneSetPlan(manifest, (id) => `id-${id}`);
  const names = plans.map((p) => p.sourceId);
  assert.equal(names[0], "s1-the-road-in", "the landing scene sorts first");
  assert.ok(names.indexOf("the-city") > names.indexOf("s1-flood-tunnel"), "Session One comes before The City");

  const sub = plans.find((p) => p.sourceId === "s1-canteen-tables");
  assert.equal(sub.data.navigation, false, "a sub-room must not take a navigation tab");
  const beat = plans.find((p) => p.sourceId === "s1-canteen");
  assert.equal(beat.data.navigation, true);

  // Exactly one landing scene, and it is the one a new player should meet.
  assert.deepEqual(plans.filter((p) => p.isLanding).map((p) => p.sourceId), ["s1-the-road-in"]);
});

test("scene data carries the v14 shape: background on the level, padding 0, gridless", () => {
  const plan = sceneSetPlan(manifest, (id) => `id-${id}`).find((p) => p.sourceId === "s1-the-road-in");
  assert.equal(plan.data.padding, 0, "a padded scene draws the art inside a grey border");
  assert.equal(plan.data.levels[0].background.src, "modules/blank-inheritance/assets/scenes/episode-c1s1--the-road-in.webp");
  assert.equal(plan.data.background, undefined, "background is not a Scene field in v14 — writing it there does nothing");
  assert.equal(plan.data.grid.type, 0);
  assert.equal(plan.data.tokenVision, false);

  const hub = sceneSetPlan(manifest, (id) => `id-${id}`).find((p) => p.sourceId === "the-city");
  assert.equal(hub.data.width, 6200, "the map ships at the half-scale 6200px derivative");
  assert.equal(hub.data.height, 6200);
});

test("map pins point at a journal page and use texture, not the retired icon field", () => {
  const hub = manifest.scenes.find((s) => s.kind === "hub");
  const pins = hubPinPlan(hub, manifest, {
    locations,
    journalFor: (sourceId) => ({ entryId: "J", pageId: `page-${sourceId}` })
  });
  assert.equal(pins.length, hub.pins.length);
  const roadIn = pins.find((p) => p.sceneRef === "s1-the-road-in");
  assert.equal(roadIn.data.text, "The Road In");
  assert.equal(roadIn.data.entryId, "J");
  assert.equal(roadIn.data.pageId, "page-s1-the-road-in");
  assert.ok(roadIn.data.texture?.src, "a Note carries its image on `texture` in v14");
  assert.equal(roadIn.data.icon, undefined);
  assert.equal(roadIn.data.global, true, "a pin nobody has a token near must still be visible");
  assert.ok(Number.isInteger(roadIn.data.x) && Number.isInteger(roadIn.data.y), "Note x/y are integer fields");
});

test("a pin's journal page says where it is and never what is waiting there", () => {
  const page = pinJournalPage(
    { name: "Flood Tunnel Clearance", blurb: "Ferry stages and chandlers." },
    { name: "The Old Landing", derived: { ref: "C2·98" } }
  );
  assert.equal(page.name, "Flood Tunnel Clearance");
  assert.match(page.text.content, /Ferry stages and chandlers\./);
  assert.match(page.text.content, /The Old Landing/);
  assert.match(page.text.content, /C2·98/);
  // Written from the manifest's own blurb only: nothing can reach in here
  // from the scene brief, which is where the centipedes are written down.
  assert.doesNotMatch(page.text.content, /centipede/i);
});

test("every blurb on a player-facing pin is written, not left to a placeholder", () => {
  const hub = manifest.scenes.find((s) => s.kind === "hub");
  for (const pin of hub.pins) {
    const target = manifest.scenes.find((s) => s.id === pin.sceneRef);
    assert.ok(target.blurb && target.blurb.length > 40, `${pin.sceneRef} is pinned on the map with no blurb for a player to read`);
  }
});

test("a proposed location match is labelled as proposed rather than asserted", () => {
  for (const scene of manifest.scenes) {
    if (!scene.locationNote) continue;
    assert.match(scene.locationNote, /PROPOSED/, `${scene.id}'s locationNote should say plainly that it is a guess`);
  }
  // The two we know are guesses today.
  const flagged = manifest.scenes.filter((s) => s.locationNote).map((s) => s.id).sort();
  assert.deepEqual(flagged, ["s1-flood-tunnel", "s1-kit-issue"]);
});
