// Tier 2 — every haunt in canon (design/haunts.md, canon/decisions/D050.md, D051.md) holds to the
// foundation: the band, the place, a rest when it's a night's rest, regulars with a line for every
// attitude, a deck of at least eight mixed events whose rolls pay on all four degrees, attitude
// buttons that name real regulars, few plot and danger events, and rumour sets that deal.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ATTITUDES } from "../module/blank-inheritance/scripts/core/social-intel.mjs";
import { EVENT_KINDS } from "../module/blank-inheritance/scripts/core/event-deck.mjs";
import { REST_GRADE_IDS } from "../module/blank-inheritance/scripts/core/rest.mjs";
import { normalizeRumourSets, rumourSetProblems } from "../module/blank-inheritance/scripts/core/rumours.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(repoRoot, "canon", "scenes");
const haunts = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))
  .filter((s) => s.haunt);
const DEGREES = ["criticalSuccess", "success", "failure", "criticalFailure"];

test("REAL DATA: the ten night rests are haunts in canon", () => {
  const ids = new Set(haunts.map((h) => h.id));
  for (const id of ["general-hospital", "early-night", "bathhouse", "shrine-gate", "crew-mess", "card-game", "rumour-mill", "the-roof", "met-office", "night-shift"]) {
    assert.ok(ids.has(`rest--${id}`), `rest--${id} is not written yet`);
  }
});

test("REAL DATA: the hospital alone restores full HP, and gives nothing else", () => {
  for (const h of haunts.filter((x) => x.rest)) {
    assert.ok(REST_GRADE_IDS.includes(h.rest.hp), `${h.id}: unknown rest grade`);
    if (h.id === "rest--general-hospital") assert.equal(h.rest.hp, "full");
    else assert.notEqual(h.rest.hp, "full", `${h.id}: only the hospital is a full recovery (D050)`);
  }
  const hospital = haunts.find((h) => h.id === "rest--general-hospital");
  if (hospital) assert.ok(!hospital.events.some((e) => e.kind === "buff"), "the hospital gives no buff (D050)");
});

for (const h of haunts) {
  test(`REAL DATA: ${h.id} is built on the haunt foundation`, () => {
    assert.equal(h.spectrum, "downtime", "a haunt is a downtime scene");
    assert.ok(h.haunt.everyVisit?.length > 40, "says what is always true here");
    assert.ok(h.intro?.position?.locationRef, "is somewhere on the map");
    assert.ok(existsSync(path.join(repoRoot, "data", "locations", `${h.intro.position.locationRef}.json`)), `place ${h.intro.position.locationRef} is not on the map`);

    const regulars = (h.cast ?? []).filter((c) => !c.walkOn);
    assert.ok(regulars.length >= 2, "has at least two regulars");
    for (const r of regulars) {
      for (const a of ATTITUDES) assert.ok(r.brief?.byAttitude?.[a], `${r.id} has no line for ${a}`);
      assert.ok(ATTITUDES.includes(r.brief.attitude), `${r.id} has no starting attitude`);
      assert.ok((r.brief.questions ?? []).length >= 5, `${r.id} needs five likely questions`);
      assert.ok(r.brief.wants && r.brief.voice, `${r.id} needs a want and a voice`);
    }

    const events = h.events ?? [];
    assert.ok(events.length >= 8, `a deck of at least eight events (has ${events.length})`);
    assert.equal(new Set(events.map((e) => e.id)).size, events.length, "event ids are unique");
    const kinds = new Set(events.map((e) => e.kind));
    for (const e of events) assert.ok(EVENT_KINDS.includes(e.kind), `${e.id}: unknown kind ${e.kind}`);
    assert.ok(kinds.has("roll") && kinds.has("roleplay"), "mixes rolls and role-play");
    assert.ok(events.filter((e) => e.kind === "plot").length <= 1, "at most one plot event");
    assert.ok(events.filter((e) => e.kind === "danger").length <= 1, "at most one danger event");

    const regularIds = new Set(regulars.map((r) => r.id));
    for (const e of events) {
      if (e.kind === "roll" || (e.check && e.outcomes)) {
        for (const d of DEGREES) assert.ok(e.outcomes?.[d], `${e.id}: no ${d} outcome`);
      }
      for (const s of e.shifts ?? []) assert.ok(regularIds.has(s.regular), `${e.id}: shifts ${s.regular}, who is not a regular here`);
    }

    for (const set of normalizeRumourSets(h.rumours ?? [])) assert.deepEqual(rumourSetProblems(set), [], `${set.id}`);
    assert.ok(existsSync(path.join(dir, `${h.id}.reread.md`)), "has its re-read record");
  });
}

test("REAL DATA: the rumour mill has three sets for each of the first two episodes", () => {
  const mill = haunts.find((h) => h.id === "rest--rumour-mill");
  for (const episode of ["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"]) {
    const sets = (mill?.rumours ?? []).filter((r) => r.episode === episode).map((r) => r.set).sort();
    assert.deepEqual(sets, [1, 2, 3], episode);
  }
});
