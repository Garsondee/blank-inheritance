// Tier 2 — every carry-in's `who` points at something real (2026-10-04, D059).
//
// A carry-in names its characters by looking up an earlier beat's results, a
// choice's picks, a person card's check, a condition, an item or an arrival
// (core/runner-party.mjs). A `who` naming a beat that was renamed, an option
// that was cut or a scene that comes LATER would quietly resolve to nobody, so
// the GM would be told "nobody" about something that happened. This reads every
// canon scene and checks each reference exists, and comes before.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scenes = new Map(
  readdirSync(path.join(ROOT, "canon", "scenes"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const doc = JSON.parse(readFileSync(path.join(ROOT, "canon", "scenes", f), "utf8"));
      return [doc.id, doc];
    })
);
const episode = JSON.parse(readFileSync(path.join(ROOT, "data", "episodes", "episode-c1e1-mothers-maiden-name.json"), "utf8"));
const orderOf = new Map((episode.scenes ?? []).map((s) => [s.briefRef, s.order]));
const DEGREES = new Set(["criticalSuccess", "success", "failure", "criticalFailure"]);
// sf2e's own condition slugs (gamesystems/sf2e conditions pack); the ones a carry-in can name.
const CONDITIONS = new Set(["fatigued", "frightened", "sickened", "clumsy", "drained", "enfeebled", "stupefied", "slowed", "stunned", "off-guard", "prone", "wounded", "dying", "doomed", "blinded", "dazzled", "deafened"]);

function checkSource(source, { scene, at }) {
  const where = `${scene.id} → ${at}`;
  if (Array.isArray(source.anyOf)) {
    assert.ok(source.anyOf.length >= 2, `${where}: anyOf with fewer than two sources is just a source`);
    for (const inner of source.anyOf) checkSource(inner, { scene, at });
    return;
  }
  const keys = Object.keys(source);
  if (source.condition) {
    assert.ok(CONDITIONS.has(source.condition), `${where}: "${source.condition}" is not an sf2e condition slug`);
    return;
  }
  if (source.hasItem || source.lacksItem) {
    const words = source.hasItem ?? source.lacksItem;
    assert.ok(Array.isArray(words) && words.length && words.every((w) => typeof w === "string" && w.trim()), `${where}: item words`);
    return;
  }
  if (source.arrival) {
    const destinations = scenes.get("episode-c1e1--the-road-in")?.outro?.departure?.destinations ?? [];
    assert.ok(destinations.some((d) => d.id === source.arrival), `${where}: nobody can arrive by "${source.arrival}"`);
    return;
  }
  assert.ok(source.briefRef, `${where}: a source needs briefRef, condition, hasItem, lacksItem, arrival or anyOf (has ${keys.join(", ")})`);
  const from = scenes.get(source.briefRef);
  assert.ok(from, `${where}: no canon scene ${source.briefRef}`);
  if (orderOf.has(scene.id) && orderOf.has(source.briefRef)) {
    assert.ok(orderOf.get(source.briefRef) < orderOf.get(scene.id), `${where}: ${source.briefRef} comes after this scene, so it cannot have happened yet`);
  }
  if (source.topicKey) {
    const [castId, kind, index] = source.topicKey.split(":");
    assert.equal(kind, "coercible", `${where}: a topicKey is <castId>:coercible:<n>`);
    const member = (from.cast ?? []).find((m) => m.id === castId);
    assert.ok(member?.brief?.coercible?.[Number(index)]?.challengeRef, `${where}: ${source.topicKey} is not a conversation check in ${source.briefRef}`);
  } else {
    const beat = (from.beats ?? []).find((b) => b.id === source.beatRef);
    assert.ok(beat, `${where}: no beat ${source.beatRef} in ${source.briefRef}`);
    if (source.options) {
      const ids = new Set((beat.choicePoint?.options ?? []).map((o) => o.id));
      for (const o of source.options) assert.ok(ids.has(o), `${where}: ${source.beatRef} has no option "${o}"`);
    } else {
      assert.ok(beat.challengeRef, `${where}: ${source.beatRef} has no check, so it has no degrees to read`);
    }
  }
  for (const d of source.degrees ?? []) assert.ok(DEGREES.has(d), `${where}: "${d}" is not an SF2E degree of success`);
}

test("every carry-in's who points at a real, earlier beat, choice, check, condition, item or arrival", () => {
  let checked = 0;
  for (const scene of scenes.values()) {
    for (const [i, carry] of (scene.intro?.carriesIn ?? []).entries()) {
      if (!carry.who) continue;
      checkSource(carry.who, { scene, at: `carriesIn[${i}] "${carry.when}"` });
      checked += 1;
    }
  }
  assert.ok(checked >= 13, `expected Episode One's thirteen carry-ins with a who, found ${checked}`);
});

test("a carry-in's tag is a few words, short enough for the party strip", () => {
  for (const scene of scenes.values()) {
    for (const carry of scene.intro?.carriesIn ?? []) {
      if (!carry.tag) continue;
      assert.ok(carry.tag.split(/\s+/).length <= 4 && carry.tag.length <= 24, `${scene.id}: "${carry.tag}" is too long for a tag`);
      assert.ok(carry.who, `${scene.id}: "${carry.tag}" has a tag but no who, so it can never be shown beside anyone`);
    }
  }
});

test("every carry-in into the drains names its characters: the scene the party walks into with the most riding on it", () => {
  const flood = scenes.get("episode-c1e1--flood-tunnel");
  for (const carry of flood.intro.carriesIn) {
    assert.ok(carry.who, `"${carry.when}" has no who`);
    assert.ok(carry.tag, `"${carry.when}" has no tag for the party strip`);
  }
});
