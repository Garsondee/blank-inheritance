// "Every NPC needs a stat block" (Ingram, 2026-10-05), held as a test over the real data: everyone cast in an Episode One scene or in a
// haunt, and every card the stage summons, either has a statblock generated from data/campaign/npc-roster.json or is a creature that
// already had one (the roster's `existing`). The statblocks in data/npcs are exactly what the roster generates (never hand-edited), and
// nothing is above `drafted`. When Episode Two or a new haunt is written, this fails until its people are in the roster.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, plan } from "../tools/npc-generator/apply.mjs";
import { existingFor } from "../module/blank-inheritance/scripts/core/npc-generator/cards.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repo, rel), "utf8"));
const data = load();
const byId = new Map(data.roster.people.map((p) => [p.npcId, p]));

/** Every scene whose people need stats: the Episode One scenes (in the episode file's list), every haunt and the Magic Show. */
function scenes() {
  const episode = readJson("data/episodes/episode-c1e1-mothers-maiden-name.json");
  const ids = new Set((episode.scenes ?? []).map((s) => s.briefRef).filter(Boolean));
  for (const f of readdirSync(path.join(repo, "canon", "scenes"))) if (/^(rest--|discovery--).*\.json$/.test(f)) ids.add(f.replace(/\.json$/, ""));
  return [...ids].map((id) => ({ id, brief: readJson(`canon/scenes/${id}.json`) }));
}

test("the scenes whose people need stats are found, and there are some (Episode One's twelve, ten haunts and the Magic Show)", () => {
  const found = scenes();
  assert.ok(found.length >= 22, `${found.length} scenes`);
  assert.ok(found.some((s) => s.id === "episode-c1e1--kit-issue"));
  assert.ok(found.some((s) => s.id === "rest--the-paper-lantern"));
  assert.ok(found.some((s) => s.id === "discovery--the-magic-show"));
});

test("everyone cast in those scenes has a roster row and a statblock in their data/npcs file", () => {
  const missing = [];
  for (const { id, brief } of scenes()) {
    for (const m of brief.cast ?? []) {
      const npc = m.npcRef ?? m.id;
      if (!npc) continue;
      if (!byId.has(npc)) { missing.push(`${id}: ${npc} has no row in data/campaign/npc-roster.json`); continue; }
      const file = path.join(repo, "data", "npcs", `${npc}.json`);
      if (!existsSync(file)) { missing.push(`${id}: data/npcs/${npc}.json does not exist`); continue; }
      if (!JSON.parse(readFileSync(file, "utf8")).statblock) missing.push(`${id}: data/npcs/${npc}.json has no statblock (run npm run npcs)`);
    }
  }
  assert.deepEqual(missing, []);
});

test("every roster row says where the person appears, and each of those scenes exists and casts them (or, for a foe, names the fight)", () => {
  const bad = [];
  for (const p of data.roster.people) {
    for (const sceneId of p.appearsIn) {
      const file = path.join(repo, "canon", "scenes", `${sceneId}.json`);
      if (!existsSync(file)) { bad.push(`${p.npcId}: no canon scene ${sceneId}`); continue; }
      if (p.stub) continue;
      const scene = JSON.parse(readFileSync(file, "utf8"));
      if (!(scene.cast ?? []).some((m) => (m.npcRef ?? m.id) === p.npcId)) bad.push(`${p.npcId} is not cast in ${sceneId}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("every card the stage can summon has a statblock behind it: a roster person, or a creature that already had one", () => {
  const stages = readJson("module/blank-inheritance/stagecraft/stages.json");
  const unmatched = [];
  for (const [key, entry] of Object.entries(stages.stages)) {
    for (const [trigger, spec] of Object.entries(entry.onTrigger ?? {})) {
      for (const who of spec.summon ?? []) {
        if (existingFor(who.id, data.roster.existing)) continue;
        if (byId.has(who.id)) continue;
        unmatched.push(`${key} / ${trigger}: ${who.id}`);
      }
    }
  }
  assert.deepEqual(unmatched, []);
});

test("a creature that already has a statblock is not generated, and points at the compendium actor the encounter names", () => {
  for (const e of data.roster.existing) {
    assert.equal(byId.has(e.id), false, `${e.id} is in both lists`);
    assert.match(e.compendium, /^Compendium\.[\w-]+\.[\w-]+\.Actor\.\w+$/);
  }
  const centipede = data.roster.existing.find((e) => e.id === "giant-centipede");
  const encounter = readJson("data/encounters/c1e1-flood-tunnel.json");
  assert.equal(centipede.compendium, encounter.creatures.find((c) => c.name === "Giant Centipede").compendium);
  for (const n of [1, 2, 3, 4, 5, 6]) assert.ok(existingFor(`giant-centipede-${n}`, data.roster.existing), `card ${n}`);
});

test("the statblocks in data/npcs are exactly what the roster generates, and everything stays drafted", () => {
  const changes = plan(data);
  const stale = changes.filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after)).map((c) => c.npcId);
  assert.deepEqual(stale, [], "run: npm run npcs (the statblocks are derived; change the roster, not the files)");
  assert.equal(data.roster.authoring.status, "drafted");
  assert.equal(data.archetypes.authoring.status, "drafted");
  for (const c of changes) assert.equal(c.after.authoring.status, "drafted", c.npcId);
});

test("generating a statblock changes nothing about a person but their statblock", () => {
  for (const c of plan(data)) {
    if (c.created) continue;
    const { statblock, ...rest } = c.after;
    const { statblock: _was, ...before } = c.before;
    assert.deepEqual(rest, before, c.npcId);
  }
});
