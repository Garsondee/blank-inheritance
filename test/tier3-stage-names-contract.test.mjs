// Tier 3 — the wiring that keeps a held-back name off the wire.
//
// The pure rules are tested in tier1-stage-names.test.mjs. What can quietly
// undo them is somebody rewiring a caller: publishing without the known-names
// set, summoning a protected person under their plain id, or importing the
// overlay class into a file a plain-Node test loads. These read the sources.
//
// design/theatre-of-the-mind-staging.md §12.2.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = path.join(repoRoot, "module", "blank-inheritance", "scripts");
const read = (...parts) => readFileSync(path.join(scripts, ...parts), "utf8");

const stage = read("foundry", "stage.mjs");
const store = read("foundry", "stage-store.mjs");
const runner = read("foundry", "scene-runner.mjs");
const build = read("foundry", "scene-build.mjs");
const admin = read("foundry", "admin-actions.mjs");
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "scene-brief.schema.json"), "utf8"));

test("the stage publishes through the known-names set, never the bare authored cast", () => {
  assert.match(stage, /publishedCast\(cast, await readKnownNames\(\)\)/);
  assert.doesNotMatch(stage, /publishedCast\(cast\)/, "a publish without the known-names set would show real names of protected people");
});

test("the Director's stage is built from presentCast, so both seats agree on who is who", () => {
  assert.match(stage, /presentCast\(authored, await readKnownNames\(\)\)/);
});

test("summoning a protected person copies their portrait under an anonymous name and drops it on failure", () => {
  assert.match(stage, /if \(member\.called && member\.img\)/);
  assert.match(stage, /await protectedArt\(member\.img, descriptor\.id\)/);
  assert.match(stage, /else delete member\.img/, "a failed copy must fall back to the silhouette, not to the real path");
});

test("a name is told through revealName, which republishes every scene that has that person and unmasks their tokens", () => {
  assert.match(stage, /export async function revealName\(/);
  assert.match(stage, /await markNameKnown\(nameKey, now\)/);
  assert.match(stage, /await writeAuthoredCast\(scene, next, layout\)/);
  assert.match(stage, /await unmaskReferenceTokens\(nameKey\)/);
});

test("the vault and name store live in a file that is safe to import without Foundry", () => {
  assert.doesNotMatch(store, /^const \{[^}]*\} = foundry\./m, "stage-store.mjs must not touch Foundry globals at load time");
  assert.doesNotMatch(store, /^class /m, "stage-store.mjs must not define the overlay class");
});

test("scene-build imports the store, never stage.mjs (which loads ApplicationV2 on import)", () => {
  assert.match(build, /from "\.\/stage-store\.mjs"/);
  assert.doesNotMatch(build, /from "\.\/stage\.mjs"/);
});

test("hidden reference tokens are keyed by the alias and held anonymous while a name is held back", () => {
  assert.match(build, /wantedActorIdByAlias\.set\(stageAlias\(npcId\), actorId\)/);
  assert.match(build, /return \{ name: member\.called, img: ANONYMOUS_TOKEN_IMAGE \}/);
});

test("the Runner files a protected person under the shared stageIdFor and looks up art by the plain id", () => {
  assert.match(runner, /from "\.\.\/core\/stage-names\.mjs"/);
  assert.doesNotMatch(runner, /^function stageIdFor\(/m, "the Runner must not keep its own stage id function");
  assert.match(runner, /stagePortraitFor\(rawStageId\(member\)\)/);
  assert.doesNotMatch(runner, /stagePortraitFor\(stageIdFor\(member\)\)/, "an aliased id has no portrait file: art is looked up by the plain id");
});

test("both summon paths go through the one descriptor builder", () => {
  const uses = runner.match(/summonToStage\(scene, summonDescriptorFor\(member, /g) ?? [];
  assert.equal(uses.length, 2, "the Cast fold's Stage key and the npc-enter trigger must both use summonDescriptorFor");
});

test("the admin reset and snapshot both cover which names have been told", () => {
  assert.match(admin, /stageNames: foundry\.utils\.deepClone\(flag\(stageVault, "names"\)/);
  assert.match(admin, /vault\.unsetFlag\(MODULE_ID, "names"\)/);
  assert.match(admin, /setFlag\(MODULE_ID, "names", snapshot\.stageNames\)/);
});

test("the scene-brief schema declares the fields a scene uses to hold a name back", () => {
  const cast = schema.properties.cast.items.properties;
  assert.ok(cast.called, "cast[].called is missing");
  assert.ok(cast.nameOnArrival, "cast[].nameOnArrival is missing");
  const kinds = schema.properties.beats.items.properties.triggers.items.properties;
  assert.ok(kinds.kind.enum.includes("reveal-name"), "beats' triggers no longer accept reveal-name");
  assert.ok(kinds.announce, "beats' triggers no longer accept announce");
});
