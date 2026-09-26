// Tier 1 — Approvals Desk #169: the play-sequence set. Pure logic
// (core/play-sequence.mjs), tested first against small synthetic fixtures
// for precision, then against the real data/ tree per the issue's own
// explicit demand ("test against the real tree").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computePlaySequenceSet, flattenPlaySequenceSet } from "../module/blank-inheritance/scripts/core/play-sequence.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const dataRoot = path.join(repoRoot, "data");

function drafted(id, extra = {}) {
  return { id, authoring: { status: "drafted" }, ...extra };
}
function sound(id, extra = {}) {
  return { id, authoring: { status: "sound" }, ...extra };
}

test("computePlaySequenceSet: includes a scene's encounter, its creatures, a challenge's participant NPC, a subsystem, cast NPCs, and the scene's own location", () => {
  const episode = {
    id: "ep",
    scenes: [{
      order: 1, id: "s1", title: "Scene One",
      authoring: { status: "sound" }, // the scene's own prose is fine; other sub-items still gate independently
      encounterRef: "enc1", challengeRefs: ["ch1"], subsystemRef: "sub1", briefRef: "brief1"
    }]
  };
  const catalog = {
    episodes: [episode],
    encounters: { enc1: drafted("enc1", { creatures: [{ creatureRef: "cr1" }] }) },
    creatures: { cr1: drafted("cr1") },
    challenges: { ch1: drafted("ch1", { participants: ["npc1"] }) },
    subsystems: { sub1: drafted("sub1") },
    npcs: { npc1: drafted("npc1") },
    sceneBriefs: { brief1: { cast: [{ npcRef: "npc2" }] } },
    npcs2: {},
    locations: { loc1: drafted("loc1") },
    sceneSetByBriefRef: { brief1: { locationRef: "loc1" } }
  };
  catalog.npcs.npc2 = drafted("npc2");

  const shifts = computePlaySequenceSet(catalog);
  assert.equal(shifts.length, 1);
  const ids = shifts[0].items.map((i) => `${i.type}:${i.id}`);
  assert.deepEqual(new Set(ids), new Set([
    "encounter:enc1", "creature:cr1", "challenge:ch1", "npc:npc1", "subsystem:sub1", "npc:npc2", "location:loc1"
  ]));
  // The scene itself is "sound", so its OWN episode-scene entry must not appear.
  assert.ok(!ids.includes("episode-scene:s1"));
});

test("computePlaySequenceSet: an already-sound or already-final item is excluded even though it's reachable", () => {
  const episode = { id: "ep", scenes: [{ order: 1, id: "s1", title: "S1", encounterRef: "enc1" }] };
  const catalog = { episodes: [episode], encounters: { enc1: sound("enc1") } };
  const shifts = computePlaySequenceSet(catalog);
  assert.equal(shifts.length, 0, "a scene with nothing drafted in it produces no shift at all -- not an empty one");
});

test("computePlaySequenceSet: dependsOn is NEVER a source of inclusion, however many drafted things name it", () => {
  // "the-lonely-bunker" is drafted and reachable from nowhere. Three OTHER
  // drafted, reachable items all declare it in dependsOn. It must still never
  // appear -- design/approvals-desk.md §1's own rule, and issue #169's
  // explicit test ask.
  const episode = { id: "ep", scenes: [{ order: 1, id: "s1", title: "S1", challengeRefs: ["ch1", "ch2", "ch3"] }] };
  const catalog = {
    episodes: [episode],
    challenges: {
      ch1: drafted("ch1", { authoring: { status: "drafted", dependsOn: ["the-lonely-bunker"] } }),
      ch2: drafted("ch2", { authoring: { status: "drafted", dependsOn: ["the-lonely-bunker"] } }),
      ch3: drafted("ch3", { authoring: { status: "drafted", dependsOn: ["the-lonely-bunker"] } })
    },
    locations: { "the-lonely-bunker": drafted("the-lonely-bunker") }
  };
  const shifts = computePlaySequenceSet(catalog);
  const flat = flattenPlaySequenceSet(shifts);
  assert.ok(!flat.some((i) => i.id === "the-lonely-bunker"), "an unscheduled item must never enter the set via dependsOn, no matter how many drafted items reference it");
});

test("computePlaySequenceSet: needs-lore is excluded too -- that's the out-tray's queue (design/approvals-desk.md §6), not this one", () => {
  const episode = { id: "ep", scenes: [{ order: 1, id: "s1", title: "S1", encounterRef: "enc1" }] };
  const catalog = { episodes: [episode], encounters: { enc1: { id: "enc1", authoring: { status: "needs-lore" } } } };
  assert.equal(computePlaySequenceSet(catalog).length, 0);
});

test("computePlaySequenceSet: the same item cast into two scenes is de-duplicated -- only the EARLIER shift gets it, and a scene left with nothing outstanding produces no shift at all", () => {
  const episode = {
    id: "ep",
    scenes: [
      { order: 1, id: "s1", title: "S1", briefRef: "b1" },
      { order: 2, id: "s2", title: "S2", briefRef: "b2" }
    ]
  };
  const catalog = {
    episodes: [episode],
    npcs: { recurring: drafted("recurring") },
    sceneBriefs: {
      b1: { cast: [{ npcRef: "recurring" }] },
      b2: { cast: [{ npcRef: "recurring" }] }
    }
  };
  const shifts = computePlaySequenceSet(catalog);
  assert.equal(shifts.length, 1, "s2 has nothing left outstanding once s1 claims the shared NPC -- it must not appear as an empty shift (the counter must stay honest and small, design/approvals-desk.md §5)");
  assert.equal(shifts[0].sceneId, "s1");
  assert.deepEqual(shifts[0].items.map((i) => i.id), ["recurring"]);
});

test("computePlaySequenceSet: episodes sort by dayRange.start (nulls last), scenes sort by order regardless of authoring order", () => {
  const laterEpisode = { id: "later", dayRange: { start: 9 }, scenes: [{ order: 1, id: "s", title: "S", encounterRef: "e-later" }] };
  const unplacedEpisode = { id: "unplaced", dayRange: null, scenes: [{ order: 1, id: "s", title: "S", encounterRef: "e-unplaced" }] };
  const nextEpisode = {
    id: "next", dayRange: { start: 1 }, scenes: [
      { order: 2, id: "second", title: "Second", encounterRef: "e-second" },
      { order: 1, id: "first", title: "First", encounterRef: "e-first" }
    ]
  };
  // Distinct encounter ids per scene, so nothing dedupes away and the shift
  // ARRAY's own order is what proves priority -- deliberately authored here
  // out of priority order (later, unplaced, next) to prove sorting is real.
  const catalog = {
    episodes: [laterEpisode, unplacedEpisode, nextEpisode],
    encounters: {
      "e-later": drafted("e-later"), "e-unplaced": drafted("e-unplaced"),
      "e-second": drafted("e-second"), "e-first": drafted("e-first")
    }
  };
  const shifts = computePlaySequenceSet(catalog);
  assert.deepEqual(shifts.map((s) => `${s.episodeId}/${s.sceneId}`), ["next/first", "next/second", "later/s", "unplaced/s"]);
});

test("computePlaySequenceSet: an unresolved ref (points at an id nobody has a file for) is silently skipped, not a thrown error", () => {
  const episode = { id: "ep", scenes: [{ order: 1, id: "s1", title: "S1", encounterRef: "does-not-exist" }] };
  assert.doesNotThrow(() => computePlaySequenceSet({ episodes: [episode] }));
  assert.deepEqual(computePlaySequenceSet({ episodes: [episode] }), []);
});

test("computePlaySequenceSet: a challenge participant that is a free-text role name (not a real npc id) is silently skipped", () => {
  const episode = { id: "ep", scenes: [{ order: 1, id: "s1", title: "S1", challengeRefs: ["ch1"] }] };
  const catalog = { episodes: [episode], challenges: { ch1: drafted("ch1", { participants: ["Sensor Operator"] }) }, npcs: {} };
  const shifts = computePlaySequenceSet(catalog);
  assert.deepEqual(flattenPlaySequenceSet(shifts).map((i) => i.id), ["ch1"], "no npc entry should appear for a role name that isn't a real id");
});

test("flattenPlaySequenceSet: flattens shifts into one ordered list, tagging each item with its shift context", () => {
  const shifts = [
    { order: 1, episodeId: "ep", sceneId: "s1", items: [{ type: "npc", id: "a" }] },
    { order: 2, episodeId: "ep", sceneId: "s2", items: [{ type: "npc", id: "b" }, { type: "location", id: "c" }] }
  ];
  const flat = flattenPlaySequenceSet(shifts);
  assert.equal(flat.length, 3);
  assert.deepEqual(flat.map((i) => i.id), ["a", "b", "c"]);
  assert.equal(flat[2].sceneId, "s2");
  assert.equal(flat[2].shiftOrder, 2);
});

// --- against the real tree (issue #169's own explicit demand) --------------

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}
function loadAllById(relDir) {
  const dir = path.join(dataRoot, relDir);
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const content = readJson(path.join(dir, f));
    out[content.id] = content;
  }
  return out;
}

function buildRealCatalog() {
  const episodes = readdirSync(path.join(dataRoot, "episodes")).filter((f) => f.endsWith(".json")).map((f) => readJson(path.join(dataRoot, "episodes", f)));
  const sceneSet = readJson(path.join(dataRoot, "campaign", "scene-set.json"));
  const sceneSetByBriefRef = {};
  for (const s of sceneSet.scenes ?? []) if (s.briefRef) sceneSetByBriefRef[s.briefRef] = s;
  return {
    episodes,
    npcs: loadAllById("npcs"),
    challenges: loadAllById("challenges"),
    subsystems: loadAllById("subsystems"),
    encounters: loadAllById("encounters"),
    locations: loadAllById("locations"),
    sceneBriefs: loadAllById("scene-briefs"),
    creatures: {},
    sceneSetByBriefRef
  };
}

test("real tree: the play-sequence set is small and scene-shaped, not the 232-location wall design/approvals-desk.md §1 found", () => {
  const catalog = buildRealCatalog();
  const shifts = computePlaySequenceSet(catalog);
  const flat = flattenPlaySequenceSet(shifts);

  assert.ok(shifts.length > 0, "Episode One and Episode Two's stub both have real drafted content -- an empty set here would mean the traversal is broken, not that nothing needs review");

  // This used to be an absolute cap of 50, calibrated when Episode Two was a
  // stub with one authored scene. Wiring Episode Two's real scenes in took the
  // queue to 71, which is not the defect this test is about -- authoring more
  // content SHOULD put more in front of the reviewer. What must never happen is
  // the queue drifting toward the whole corpus. So the bar is now relative to
  // the corpus, and it does not need re-tuning every time a scene is written.
  const corpusSize =
    Object.keys(catalog.locations).length +
    Object.keys(catalog.npcs).length +
    Object.keys(catalog.challenges).length +
    Object.keys(catalog.encounters).length +
    Object.keys(catalog.subsystems).length;
  assert.ok(
    flat.length < corpusSize / 3,
    `the queue should stay a small fraction of the corpus -- got ${flat.length} of ${corpusSize} across ${shifts.length} shifts`
  );
  for (const shift of shifts) {
    assert.ok(shift.items.length <= 10, `${shift.episodeId}/${shift.sceneId} has ${shift.items.length} items -- a single scene's shift should stay single-digit, matching the design doc's own "twenty-minute job" sizing`);
  }
  // The durable guard: a shift is a twenty-minute job, so the mean must stay low
  // however much content exists.
  const mean = flat.length / shifts.length;
  assert.ok(mean < 5, `mean ${mean.toFixed(1)} items per shift -- a shift is meant to be a twenty-minute job`);

  // Specific real items, both directions.
  const flatIds = new Set(flat.map((i) => `${i.type}:${i.id}`));
  assert.ok(flatIds.has("npc:shucks-mordant"), "Shucks Mordant is genuinely cast into Intake Medicals");
  assert.ok(flatIds.has("encounter:c1e1-flood-tunnel"), "the Flood Tunnel encounter is genuinely part of Episode One");
  assert.ok(flatIds.has("subsystem:c1e1-compactor-cycle"), "the compactor-cycle subsystem runs alongside that same encounter");

  // Locations NOT cast into any real scene must never appear, however many
  // there are (210+ of the 232 are exactly this -- background map filler).
  assert.ok(!flatIds.has("location:the-rock"), "The Rock is not part of Episode One's real scenes and must not appear just because it exists");
  assert.ok(!flatIds.has("npc:the-rock-warden"), "the same for an NPC no Episode One scene actually casts");
});

test("real tree: The Walk Down is a deliberate relax beat with no challenge/encounter by design -- its shift (if any) must not fabricate one", () => {
  const catalog = buildRealCatalog();
  const shifts = computePlaySequenceSet(catalog);
  const walkDown = shifts.find((s) => s.sceneId === "the-walk-down");
  if (walkDown) {
    assert.ok(!walkDown.items.some((i) => i.type === "challenge" || i.type === "encounter"), "The Walk Down has no authored challenge/encounter -- nothing should be invented for it");
  }
});
