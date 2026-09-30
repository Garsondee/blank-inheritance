// Tier 2 -- every authored departure in the REAL scene briefs (design/world-map-destinations.md §8.1).
//
// A departure is played on the map: a destination whose place does not exist has nowhere to stand, one whose
// scene does not exist has nothing to run, and a beat tagged for a destination nobody can pick is a beat that can
// never be shown. This holds all of that against the real data, so a rename anywhere fails here the same day.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KINDS, CHOOSING_KINDS, normalizeDeparture } from "../module/blank-inheritance/scripts/core/departures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const briefDir = path.join(repoRoot, "data", "scene-briefs");
const briefs = new Map(
  readdirSync(briefDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(path.join(briefDir, f), "utf8"))])
);
const placeExists = (ref) => existsSync(path.join(repoRoot, "data", "locations", `${ref}.json`));
const withDepartures = [...briefs.entries()].filter(([, b]) => b.outro?.departure);

test("REAL DATA: the first departures are authored where the table splits and regroups", () => {
  const byId = Object.fromEntries(withDepartures.map(([id, b]) => [id, b.outro.departure.kind]));
  assert.equal(byId["episode-c1e1--the-road-in"], "arrive", "The Road In asks how each of them arrives");
  assert.equal(byId["episode-c1e2--school-period-two"], "free", "The Long Afternoon is a free quarter");
  assert.equal(byId["episode-c1e2--the-override"], "free", "The Night Off is each player's own evening");
});

for (const [id, brief] of withDepartures) {
  test(`REAL DATA: ${id}'s departure points at real places and real scenes`, () => {
    const raw = brief.outro.departure;
    assert.ok(KINDS.includes(raw.kind), `unknown kind "${raw.kind}"`);
    const d = normalizeDeparture(raw, { sourceBriefId: id });
    if (CHOOSING_KINDS.includes(d.kind)) assert.ok(d.destinations.length >= 2, "a choice needs at least two destinations");
    assert.ok(d.question, "a departure the players see needs its question");
    const ids = new Set();
    for (const dest of d.destinations) {
      assert.ok(!ids.has(dest.id), `destination id "${dest.id}" is used twice`);
      ids.add(dest.id);
      assert.ok(dest.placeRef && placeExists(dest.placeRef), `${dest.id}: place "${dest.placeRef}" is not in data/locations/`);
      if (d.kind === "arrive") assert.ok(dest.mode, `${dest.id}: an arrival needs its mode (its emblem)`);
      else assert.ok(dest.briefRef && briefs.has(dest.briefRef), `${dest.id}: scene "${dest.briefRef}" does not exist`);
      assert.ok(dest.label && dest.label !== dest.id, `${dest.id}: needs a label the players can read`);
      assert.ok(dest.blurb, `${dest.id}: needs a line for its card`);
    }
    if (d.then) {
      assert.ok(d.then.placeRef && placeExists(d.then.placeRef), `then: place "${d.then.placeRef}" is not in data/locations/`);
      assert.ok(d.then.briefRef && briefs.has(d.then.briefRef), `then: scene "${d.then.briefRef}" does not exist`);
    }
  });
}

test("REAL DATA: every beat tagged for a destination names one the party can actually pick on the way in", () => {
  const leadingInto = new Map();
  for (const [, brief] of withDepartures) {
    for (const dest of brief.outro.departure.destinations ?? []) {
      if (!dest.briefRef) continue;
      if (!leadingInto.has(dest.briefRef)) leadingInto.set(dest.briefRef, new Set());
      leadingInto.get(dest.briefRef).add(dest.id);
    }
  }
  const orphans = [];
  for (const [id, brief] of briefs) {
    for (const beat of brief.beats ?? []) {
      for (const destId of beat.forDestination ?? []) {
        if (!leadingInto.get(id)?.has(destId)) orphans.push(`${id} → ${beat.id} → ${destId}`);
      }
    }
  }
  assert.deepEqual(orphans, []);
});

test("REAL DATA: every scene's art has its small thumbnail for the destination cards (tools/scene-thumbs)", () => {
  const sceneSet = JSON.parse(readFileSync(path.join(repoRoot, "data", "campaign", "scene-set.json"), "utf8"));
  const thumbs = path.join(repoRoot, "module", "blank-inheritance", "assets", "scenes", "thumbs");
  const missing = sceneSet.scenes.filter((s) => s.art && s.kind !== "hub" && !existsSync(path.join(thumbs, `${s.art}.webp`))).map((s) => s.art);
  assert.deepEqual(missing, [], "run `python tools/scene-thumbs/make_thumbs.py`");
});

test("REAL DATA: a departure that splits the party says so honestly in its transition (S9)", () => {
  for (const [id, brief] of withDepartures) {
    if (brief.outro.departure.kind === "free") assert.equal(brief.outro.transition?.scatterRisk, true, `${id}: a free departure is a scatter risk by definition`);
  }
});
