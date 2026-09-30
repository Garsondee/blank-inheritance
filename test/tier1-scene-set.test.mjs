// Tier 1 — the scene set's own planning (scripts/core/generators/scene-set.mjs):
// what a bad manifest is caught saying, and the order and navigation flags the
// built scenes come out with. (The campaign map's Note pins were retired
// 2026-09-28 -- design/world-map-destinations.md -- and their tests with them.)
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
  computeDisplayPrefixes,
  pinJournalPage,
  sceneSetPlan,
  validateSceneSet
} from "../module/blank-inheritance/scripts/core/generators/scene-set.mjs";
import { sceneCalibration, toScenePoint } from "../module/blank-inheritance/scripts/core/travel-animation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));

const manifest = readJson("data/campaign/scene-set.json");
const locations = new Map();
for (const ref of [...new Set(manifest.scenes.map((s) => s.locationRef).filter(Boolean))]) {
  const file = `data/locations/${ref}.json`;
  if (existsSync(path.join(repoRoot, file))) locations.set(ref, readJson(file));
}

test("the shipped scene set is internally consistent", () => {
  assert.deepEqual(validateSceneSet(manifest, { locations }), []);
});

test("every scene's artwork actually exists in the module", () => {
  const root = manifest.artRoot.replace("modules/blank-inheritance/", "module/blank-inheritance/");
  for (const scene of manifest.scenes) {
    const file = path.join(repoRoot, root, `${scene.art}.webp`);
    assert.ok(existsSync(file), `${scene.id} names art "${scene.art}.webp", which is not in ${root}`);
  }
});

test("a place on the hub honours a real Scene's own tile origin, not just its scale — the exact bug found live 2026-09-23", () => {
  // The real remote hub scene: four full-resolution tiles at
  // (6200,6200)/(12400,6200)/(6200,12400)/(12400,12400), each 6200 wide --
  // see core/travel-animation.mjs's own header for how this was found and
  // confirmed against the real Tile documents. The FIRST fix (this test's
  // own original version) still used a scale-only round-trip through this
  // same tile data and called it proven; it wasn't. Real Tiles are
  // centre-anchored by Foundry's own default (anchorX/anchorY 0.5,
  // common/documents/tile.mjs), so a real Tile's x/y is NOT its top-left
  // corner, and the origin this test asserts is (3100,3100) — half a tile
  // width/height inside the naive (6200,6200) reading — not the (6200,6200)
  // this test wrongly asserted the first time.
  const tiles = [
    { x: 6200, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } },
    { x: 12400, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } },
    { x: 6200, y: 12400, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } },
    { x: 12400, y: 12400, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } }
  ];
  const calibration = sceneCalibration(tiles, 18600, 12400);
  assert.deepEqual(calibration, { originX: 3100, originY: 3100, scale: 1 });

  const location = { id: "x", derived: { centroidPx: [6200, 6200] } };
  const at = toScenePoint({ x: location.derived.centroidPx[0], y: location.derived.centroidPx[1] }, calibration);
  assert.deepEqual(at, { x: 9300, y: 9300 });
  assert.notDeepEqual(
    at,
    { x: location.derived.centroidPx[0], y: location.derived.centroidPx[1] },
    "a scale-only transform with no origin is the bug this replaces, not the fix"
  );
});

test("a hub that still lists map pins is refused: they were retired, and would silently do nothing", () => {
  const stale = {
    groups: [{ id: "g", name: "G" }],
    scenes: [
      { id: "a", name: "A", art: "a", group: "g", kind: "landing" },
      { id: "hub", name: "Hub", art: "m", group: "g", kind: "hub", pins: [{ sceneRef: "a" }] }
    ]
  };
  const problems = validateSceneSet(stale, { locations: new Map() });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /pins were retired/);
  const hub = manifest.scenes.find((s) => s.kind === "hub");
  assert.ok(!("pins" in hub), "the shipped hub carries no pins: destinations are each scene brief's outro.departure");
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
  // Was e1-the-road-in until 2026-09-24, when Ingram asked for a "Scene 0"
  // GM speech ahead of it: From Up Here, order 0, now sorts first AND is the
  // landing scene. The Road In follows it directly.
  assert.equal(names[0], "e1-from-up-here", "the landing scene sorts first");
  assert.equal(names[1], "e1-the-road-in", "The Road In comes straight after the opening speech");
  assert.ok(names.indexOf("the-city") > names.indexOf("e1-flood-tunnel"), "Episode One comes before The City");

  const sub = plans.find((p) => p.sourceId === "e1-canteen-tables");
  assert.equal(sub.data.navigation, false, "a sub-room must not take a navigation tab");
  const beat = plans.find((p) => p.sourceId === "e1-canteen");
  assert.equal(beat.data.navigation, true);

  // Exactly one landing scene, and it is the one a new player should meet.
  // Moved from The Road In to From Up Here 2026-09-24 (see above) -- the
  // schema allows one landing, so The Road In became an ordinary beat.
  assert.deepEqual(plans.filter((p) => p.isLanding).map((p) => p.sourceId), ["e1-from-up-here"]);
  assert.equal(plans.find((p) => p.sourceId === "e1-the-road-in").kind, "beat", "The Road In is a beat now, not a second landing scene");
});

test("From Up Here, the 2026-09-24 opening speech: the one landing scene, its own art, no map pin", () => {
  // Ingram asked for a "Scene 0" before The Road In: a long GM speech over
  // one high-altitude picture of Kurose that sets up the world and hands
  // straight into The Road In.
  const landings = manifest.scenes.filter((s) => s.kind === "landing");
  assert.deepEqual(landings.map((s) => s.id), ["e1-from-up-here"], "exactly one landing scene, and it is the opening speech");

  const entry = landings[0];
  assert.equal(entry.group, "episode-one");
  assert.equal(entry.order, 0, "order 0 is what makes it a prologue ahead of scene one");
  assert.equal(entry.briefRef, "episode-c1e1--from-up-here", "the brief id is what binds its soundscape and the Scene Runner to it");

  const plan = sceneSetPlan(manifest, (id) => `id-${id}`).find((p) => p.sourceId === "e1-from-up-here");
  assert.equal(plan.data.name, "00. From Up Here");
  assert.equal(plan.cleanName, "From Up Here");
  assert.equal(plan.data.levels[0].background.src, "modules/blank-inheritance/assets/scenes/episode-c1e1--from-up-here.webp");
  assert.equal(plan.data.navigation, true, "the landing scene keeps its navigation tab");

  // The whole city from the edge of the sky is not a place anyone stands:
  // no locationRef, and therefore no pin on the campaign map -- the same
  // "none rather than a guessed one" rule the manifest's own notes apply.
  assert.ok(!entry.locationRef, "From Up Here is a view of the whole city, not one gazetteer location");

});

test("scene data carries the v14 shape: background on the level, padding 0, gridless", () => {
  const plan = sceneSetPlan(manifest, (id) => `id-${id}`).find((p) => p.sourceId === "e1-the-road-in");
  assert.equal(plan.data.padding, 0, "a padded scene draws the art inside a grey border");
  assert.equal(plan.data.levels[0].background.src, "modules/blank-inheritance/assets/scenes/episode-c1e1--the-road-in.webp");
  assert.equal(plan.data.background, undefined, "background is not a Scene field in v14 — writing it there does nothing");
  assert.equal(plan.data.grid.type, 0);
  assert.equal(plan.data.tokenVision, false);

  const hub = sceneSetPlan(manifest, (id) => `id-${id}`).find((p) => p.sourceId === "the-city");
  assert.equal(hub.data.width, 12400, "the map ships at full resolution across four real Tiles, not the old 6200px half-scale derivative");
  assert.equal(hub.data.height, 12400);
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

/* ------------------------------------------------------------------ */
/*  Display-order prefixes (2026-09-18: Foundry's own sidebar sorts       */
/*  alphabetically, not by our `sort` field — Ingram's own live finding)  */
/* ------------------------------------------------------------------ */

test("computeDisplayPrefixes: a real beat sequence numbers its beats and letters its subs off the beat they follow", () => {
  const ordered = [
    { id: "a", group: "g", kind: "landing" },
    { id: "b", group: "g", kind: "beat" },
    { id: "b-sub", group: "g", kind: "sub" },
    { id: "c", group: "g", kind: "beat" },
    { id: "c-sub-1", group: "g", kind: "sub" },
    { id: "c-sub-2", group: "g", kind: "sub" },
    { id: "d", group: "g", kind: "beat" }
  ];
  const prefixes = computeDisplayPrefixes(ordered);
  assert.equal(prefixes.get("a"), "01");
  assert.equal(prefixes.get("b"), "02");
  assert.equal(prefixes.get("b-sub"), "02a");
  assert.equal(prefixes.get("c"), "03");
  assert.equal(prefixes.get("c-sub-1"), "03a");
  assert.equal(prefixes.get("c-sub-2"), "03b");
  assert.equal(prefixes.get("d"), "04");
});

test("computeDisplayPrefixes: restarts at 01 for each new group, so folders read as their own sequence", () => {
  const ordered = [
    { id: "a", group: "one", kind: "beat" },
    { id: "b", group: "one", kind: "beat" },
    { id: "c", group: "two", kind: "beat" }
  ];
  const prefixes = computeDisplayPrefixes(ordered);
  assert.equal(prefixes.get("a"), "01");
  assert.equal(prefixes.get("b"), "02");
  assert.equal(prefixes.get("c"), "01", "a new group must restart its own count, not continue the previous one's");
});

test("computeDisplayPrefixes: an order-0 scene is a prologue, '00', and does not renumber anything after it", () => {
  // Added 2026-09-24 with From Up Here, Ingram's "Scene 0" ahead of The Road
  // In. Keyed on order 0, not on kind: the landing scene moved the same day,
  // but "which scene is the landing" and "this comes before scene one" are
  // two separate facts.
  const ordered = [
    { id: "zero", group: "g", kind: "landing", order: 0 },
    { id: "zero-sub", group: "g", kind: "sub", order: 0 },
    { id: "one", group: "g", kind: "beat", order: 1 },
    { id: "two", group: "g", kind: "beat", order: 2 },
    { id: "other", group: "h", kind: "beat", order: 1 }
  ];
  const prefixes = computeDisplayPrefixes(ordered);
  assert.equal(prefixes.get("zero"), "00");
  assert.equal(prefixes.get("zero-sub"), "00a", "a room inside the prologue letters off it like any other beat");
  assert.equal(prefixes.get("one"), "01", "the scene that was already first stays 01");
  assert.equal(prefixes.get("two"), "02");
  assert.equal(prefixes.get("other"), "01");
  // "00" still string-sorts ahead of everything, which is the whole point.
  const asStrings = ordered.filter((s) => s.group === "g").map((s) => prefixes.get(s.id));
  assert.deepEqual([...asStrings].sort(), asStrings);
});

test("computeDisplayPrefixes: place and hub kinds number the same way beats do", () => {
  const ordered = [
    { id: "ext", group: "hq", kind: "place" },
    { id: "lobby", group: "hq", kind: "place" },
    { id: "map", group: "the-city", kind: "hub" }
  ];
  const prefixes = computeDisplayPrefixes(ordered);
  assert.equal(prefixes.get("ext"), "01");
  assert.equal(prefixes.get("lobby"), "02");
  assert.equal(prefixes.get("map"), "01");
});

test("computeDisplayPrefixes: string-sorts correctly at the real Episode One scale, and would keep doing so past 9 beats", () => {
  const ordered = [
    { id: "s1", group: "g", kind: "landing" },
    { id: "s2", group: "g", kind: "beat" },
    { id: "s3", group: "g", kind: "beat" },
    { id: "s4", group: "g", kind: "beat" },
    { id: "s5", group: "g", kind: "beat" },
    { id: "s6", group: "g", kind: "beat" },
    { id: "s7", group: "g", kind: "beat" },
    { id: "s8", group: "g", kind: "beat" },
    { id: "s9", group: "g", kind: "beat" },
    { id: "s10", group: "g", kind: "beat" },
    { id: "s11", group: "g", kind: "beat" }
  ];
  const prefixes = computeDisplayPrefixes(ordered);
  const asStrings = ordered.map((s) => prefixes.get(s.id));
  const sorted = [...asStrings].sort();
  assert.deepEqual(sorted, asStrings, "zero-padding must make the STRING sort match the intended play order past 9 items");
});

test("sceneSetPlan: the real Episode One scenes carry the exact ordering prefix a GM would expect, and it's on the Scene document's own name", () => {
  // Updated 2026-09-22 when scene-set.json grew from 9 scenes to the real 26
  // (GitHub #189): Assembly, School: First Period and School: Second Period
  // were missing entirely, so this test's own numbers were built against an
  // incomplete manifest. Kit Issue moving from "03." to "05." is not a
  // regression -- Assembly and School: First Period now correctly sit between
  // Intake Medicals and it, matching the episode's own real scene order
  // (data/episodes/episode-c1e1-mothers-maiden-name.json).
  const plans = sceneSetPlan(manifest, (id) => `id-${id}`);
  const byId = Object.fromEntries(plans.map((p) => [p.sourceId, p]));
  // Added 2026-09-24: From Up Here, Ingram's "Scene 0" GM speech, sits ahead
  // of The Road In as "00." -- and nothing below it renumbers.
  assert.equal(byId["e1-from-up-here"].data.name, "00. From Up Here");
  assert.equal(byId["e1-the-road-in"].data.name, "01. The Road In");
  assert.equal(byId["e1-intake-medicals"].data.name, "02. Intake Medicals");
  assert.equal(byId["e1-intake-medicals-exam"].data.name, "02a. Intake Medicals — The Examination Room");
  assert.equal(byId["e1-assembly"].data.name, "03. Assembly");
  assert.equal(byId["e1-school-first-period"].data.name, "04. School: First Period");
  assert.equal(byId["e1-kit-issue"].data.name, "05. Kit Issue");
  assert.equal(byId["e1-school-second-period"].data.name, "06. School: Second Period");
  assert.equal(byId["e1-the-errand"].data.name, "07. The Errand");
  assert.equal(byId["e1-the-errand-tea-house"].data.name, "07a. The Errand — The Tea House");
  assert.equal(byId["e1-the-errand-alley"].data.name, "07b. The Errand — The Alley");
  assert.equal(byId["e1-the-tram-back"].data.name, "08. The Tram Back");
  assert.equal(byId["e1-canteen"].data.name, "09. Canteen");
  assert.equal(byId["e1-canteen-tables"].data.name, "09a. Canteen — The Long Tables");
  assert.equal(byId["e1-the-walk-down"].data.name, "10. The Walk Down");
  assert.equal(byId["e1-flood-tunnel"].data.name, "11. Flood Tunnel Clearance");
  assert.equal(byId["e1-flood-tunnel-generator"].data.name, "11a. Flood Tunnel — The Generator Room");
  assert.equal(byId["e1-flood-tunnel-machine"].data.name, "11b. Flood Tunnel — The Machine Room");
  // A different group (episode-two, now fifteen beats) restarts its own count.
  assert.equal(byId["e2-as-discussed"].data.name, "01. As Discussed");
  assert.equal(byId["e2-the-names-are-still-up"].data.name, "15. The Names Are Still Up");
});

test("sceneSetPlan: cleanName is never prefixed — a player-facing pin/journal must not show GM bookkeeping", () => {
  const plans = sceneSetPlan(manifest, (id) => `id-${id}`);
  const kitIssue = plans.find((p) => p.sourceId === "e1-kit-issue");
  assert.equal(kitIssue.cleanName, "Kit Issue");
  assert.equal(kitIssue.data.name, "05. Kit Issue");
});

test("a proposed location match is labelled as proposed rather than asserted", () => {
  // `approximate` (data/schema/scene-set.schema.json) is the schema's own
  // authoritative "this locationRef is a guess" flag -- the Sign-Off's own
  // P2 check reads it directly (tools/scene-signoff/checklist.mjs). A
  // locationNote's mere existence is NOT that signal, and neither is the
  // word "PROPOSED" appearing in its prose: e1-the-tram-back, e2-as-discussed,
  // e1-assembly and several other scenes all carry a locationNote that states
  // a CONFIRMED fact about a real locationRef, not a guess. Key off
  // `approximate` itself rather than sniffing the note's text.
  for (const scene of manifest.scenes) {
    if (!scene.approximate) continue;
    assert.ok(scene.locationRef, `${scene.id} is flagged approximate but names no locationRef to be approximate about`);
    assert.ok(scene.locationNote, `${scene.id} is flagged approximate but carries no locationNote explaining the guess`);
  }
  // Nothing in the current manifest is flagged approximate. e1-flood-tunnel
  // and e1-the-walk-down still read PROPOSED in their own locationNote prose
  // (a real, tracked siting gap -- The Old Landing is the right district but
  // not the exact chamber/gate the briefs describe) but do not carry
  // `approximate: true` to match; that is a campaign-data call for Ingram to
  // make, not something for this test to paper over.
  const flagged = manifest.scenes.filter((s) => s.approximate).map((s) => s.id).sort();
  assert.deepEqual(flagged, []);
});
