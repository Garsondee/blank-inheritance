// Tier 2 — who is already there (2026-10-04, D060). A cast member marked `present` is standing on the stage when the scene
// is first opened (core/stage-wings.mjs#presentOnOpen). That only makes sense for someone who has somewhere to stand on the
// stage the brief opens on, and who has no entrance of their own: a person who is announced, splashes, or walks on from a
// chip in a beat has to wait in the wings for it. This reads every canon scene and the stages file.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rawStageId } from "../module/blank-inheritance/scripts/core/stage-names.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scenes = readdirSync(path.join(ROOT, "canon", "scenes")).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(ROOT, "canon", "scenes", f), "utf8")));
const sceneSet = JSON.parse(readFileSync(path.join(ROOT, "data", "campaign", "scene-set.json"), "utf8"));
const stages = JSON.parse(readFileSync(path.join(ROOT, "module", "blank-inheritance", "stagecraft", "stages.json"), "utf8"));
const schema = JSON.parse(readFileSync(path.join(ROOT, "data", "schema", "scene-brief.schema.json"), "utf8"));

const present = scenes.flatMap((brief) => (brief.cast ?? []).filter((m) => m.present === true).map((member) => ({ brief, member })));

test("the schema declares `present`, a yes/no on a cast member", () => {
  assert.equal(schema.properties.cast.items.properties.present?.type, "boolean");
});

test("Episode One has people already there, and only where the scene opens on them", () => {
  assert.ok(present.length >= 5, `only ${present.length} present people`);
  assert.ok(present.every(({ member }) => typeof member.present === "boolean"));
});

test("everyone present has a place on the stage their brief opens on", () => {
  const problems = [];
  for (const { brief, member } of present) {
    const main = (sceneSet.scenes ?? []).filter((s) => s.briefRef === brief.id && s.kind !== "sub");
    const placed = main.some((s) => Array.isArray(stages.stages?.[s.id]?.places?.[rawStageId(member)]));
    if (!placed) problems.push(`${brief.id}: ${member.id} has no place on ${main.map((s) => s.id).join(", ") || "any main scene"}`);
  }
  assert.deepEqual(problems, []);
});

test("nobody present has an entrance of their own: no announcement, no splash, no chip that brings them on", () => {
  const problems = [];
  for (const { brief, member } of present) {
    if (member.arrival === "announced" || member.arrival === "splash") problems.push(`${brief.id}: ${member.id} arrives ${member.arrival}`);
    const triggers = [...(brief.intro?.triggers ?? []), ...(brief.beats ?? []).flatMap((b) => b.triggers ?? [])];
    if (triggers.some((t) => t.kind === "npc-enter" && t.npcRef === member.id)) problems.push(`${brief.id}: ${member.id} has an entrance chip`);
  }
  assert.deepEqual(problems, []);
});
