// Tier 2 — Character Card social profiles for recurring NPCs, 2026-09-21.
//
// WHY THIS EXISTS. `design/npc-social-intel.md` designed the Character Card
// (Facts + SF2E's real five-step Attitude scale), `npc.schema.json` grew a
// `socialProfile` field for it, and then nobody filled one in: 39 NPCs, 39 with
// zero authored Facts. The gap was invisible because an empty optional field
// breaks nothing -- every other test passed while the system existed only as a
// schema and a design document.
//
// The bar is the schema's own: "only worth authoring for recurring NPCs the
// party will meet more than once." Recurring is judged across the campaign, not
// within one episode, so the test asks only about NPCs cast into two or more
// SCHEDULED scenes -- the same play-sequence gate `design/approvals-desk.md`
// uses to decide what is real enough to review.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const dataRoot = path.join(repoRoot, "data");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const EPISODES = ["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"];
const LADDER = new Set([13, 15, 17, 20]);
const ATTITUDES = new Set(["hostile", "unfriendly", "indifferent", "friendly", "helpful"]);

/** npcRef -> { scenes, speaks } across every scheduled scene in both episodes. */
function castCensus() {
  const cast = new Map();
  for (const episodeId of EPISODES) {
    const ep = read(path.join(dataRoot, "episodes", `${episodeId}.json`));
    for (const scene of ep.scenes) {
      if (!scene.briefRef) continue;
      const brief = read(path.join(dataRoot, "scene-briefs", `${scene.briefRef}.json`));
      for (const member of brief.cast ?? []) {
        if (!member.npcRef) continue;
        const entry = cast.get(member.npcRef) ?? { scenes: [], speaks: false };
        entry.scenes.push(scene.title);
        if (member.walkOn !== true) entry.speaks = true;
        cast.set(member.npcRef, entry);
      }
    }
  }
  return cast;
}

const CAST = castCensus();
const recurring = [...CAST].filter(([, v]) => v.scenes.length >= 2 && v.speaks).map(([id]) => id);

test("the census finds a real recurring cast -- this test's premise is not stale", () => {
  assert.ok(CAST.size >= 10, `only ${CAST.size} NPCs cast across both episodes`);
  assert.ok(recurring.length >= 5, `only ${recurring.length} recurring speaking NPCs found`);
});

test("every recurring speaking NPC has a Character Card with real Facts", () => {
  const missing = [];
  for (const id of recurring) {
    const p = path.join(dataRoot, "npcs", `${id}.json`);
    if (!existsSync(p)) { missing.push(`${id}: no NPC file at all`); continue; }
    const npc = read(p);
    const profile = npc.socialProfile;
    if (!profile) { missing.push(`${id}: no socialProfile (in ${CAST.get(id).scenes.length} scenes)`); continue; }
    if (!ATTITUDES.has(profile.attitude)) missing.push(`${id}: attitude "${profile.attitude}" is not on SF2E's scale`);
    if (!(profile.facts ?? []).length) missing.push(`${id}: socialProfile has no facts`);
  }
  assert.deepEqual(missing, [], `recurring NPCs without a usable Character Card:\n  ${missing.join("\n  ")}`);
});

test("every authored Fact is shaped so a GM can actually reveal it", () => {
  const bad = [];
  for (const id of recurring) {
    const p = path.join(dataRoot, "npcs", `${id}.json`);
    if (!existsSync(p)) continue;
    const npc = read(p);
    for (const f of npc.socialProfile?.facts ?? []) {
      if (!f.id || !f.text) { bad.push(`${id}: a fact is missing id or text`); continue; }
      if (f.revealed !== false) bad.push(`${id}/${f.id}: authored as already revealed -- a Fact starts hidden`);
      const t = f.revealTrigger;
      if (!t) { bad.push(`${id}/${f.id}: no revealTrigger, so it can never be learned`); continue; }
      const isCheck = typeof t.skill === "string" && t.dc !== undefined;
      const isNarrative = typeof t.narrative === "string" && t.narrative.length > 20;
      if (!isCheck && !isNarrative) bad.push(`${id}/${f.id}: revealTrigger is neither a check nor a usable narrative condition`);
      if (isCheck && typeof t.dc === "number" && !LADDER.has(t.dc))
        bad.push(`${id}/${f.id}: DC ${t.dc} is off the Chapter One ladder (13/15/17/20)`);
      // A Fact is a lever a player can use, not trivia. Anything this short is
      // a label rather than something a GM could act on.
      if (f.text.length < 40) bad.push(`${id}/${f.id}: text is ${f.text.length} chars -- a label, not a usable lever`);
    }
  }
  assert.deepEqual(bad, [], `malformed Facts:\n  ${bad.join("\n  ")}`);
});
