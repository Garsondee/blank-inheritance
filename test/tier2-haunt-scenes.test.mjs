// Tier 2 -- every haunt is a real Scene. The Scene Runner only opens a brief
// through the active Scene's `briefRef` flag, the Director's Palette only cuts
// to Scenes, and The City's departures land on Scenes, so a haunt that exists
// only as a scene brief cannot be run, jumped to, or chosen. Found 2026-10-01:
// all twelve haunts (eleven night rests and the Magic Show) were briefs with no
// Scene, which no test noticed because nothing asked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));

const sceneSet = readJson("data/campaign/scene-set.json");
const registry = readJson("data/campaign/asset-registry.json").assets;
const briefsDir = path.join(repoRoot, "data", "scene-briefs");
const haunts = readdirSync(briefsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => readJson(`data/scene-briefs/${f}`))
  .filter((b) => b.haunt);

test("there are haunts to check", () => {
  assert.ok(haunts.length >= 12, `expected the twelve known haunts, found ${haunts.length}`);
});

for (const haunt of haunts) {
  test(`${haunt.id} is a Scene in the scene set, with a backdrop that exists`, () => {
    const scenes = sceneSet.scenes.filter((s) => s.briefRef === haunt.id);
    assert.equal(scenes.length, 1, `${haunt.id} needs exactly one Scene in data/campaign/scene-set.json (briefRef), found ${scenes.length}`);
    const scene = scenes[0];

    assert.equal(scene.kind, "place", "a haunt is a place, not a beat of the session");
    assert.equal(scene.name, haunt.title, "the Scene is called what the brief is called");
    assert.ok(sceneSet.groups.some((g) => g.id === scene.group), `group ${scene.group} does not exist`);

    const asset = registry.find((a) => a.id === scene.art);
    assert.ok(asset, `art id "${scene.art}" is not in the asset registry, so nothing would stage it`);
    assert.ok(["scenes", "locations"].includes(asset.category), "the scene stager only reads scenes and locations");
    assert.ok(existsSync(path.join(repoRoot, "module/blank-inheritance/assets/scenes", `${scene.art}.webp`)), `backdrop ${scene.art}.webp has not been staged into the module (python tools/stage-scenes/stage_scenes.py)`);
  });

  test(`${haunt.id}: its Scene's blurb is player-facing and short`, () => {
    const scene = sceneSet.scenes.find((s) => s.briefRef === haunt.id);
    assert.ok(scene.blurb && scene.blurb.length > 20 && scene.blurb.length < 240, "a one-sentence description a newcomer could know");
  });
}

test("the haunts group is a menu, not a sequence", () => {
  const group = sceneSet.groups.find((g) => g.id === "haunts");
  assert.ok(group, "a Haunts group exists");
  assert.equal(group.numbered, false, "haunts are not numbered 01, 02, ... as if they were a running order");
});

test("a haunt's location, where it has one, is a real location file", () => {
  for (const h of haunts) {
    const scene = sceneSet.scenes.find((s) => s.briefRef === h.id);
    if (scene.locationRef) assert.ok(existsSync(path.join(repoRoot, "data/locations", `${scene.locationRef}.json`)), `${h.id}: location ${scene.locationRef} has no file`);
  }
});
