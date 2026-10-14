// Tier 3 — a check puts EVERY listed skill to the table, and "Bring this in" explains itself.
//
// Found live 2026-09-19 (Ingram): a check button already listed several
// skills ("PERCEPTION / MEDICINE / SOCIETY 17") but clicking it only ever
// posted the first. Separately, "Bring this in" had no tooltip explaining
// what it does. Both fixed in the same pass; this is the record that they
// stay fixed.
//
// 2026-10-05: a check is no longer posted from a card under the beat. Its pill
// in the beat's line opens the check console (foundry/check-console.mjs), which
// offers every way the check can be met as a key on each player's window, and
// posts every one of them when the GM also posts it to chat. The promise is
// the same: every listed skill, never the first alone.
//
// scene-runner.mjs destructures `foundry.applications.api` at module scope,
// so — matching every other tier3-*-contract.test.mjs in this project —
// this reads the real source rather than mounting the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const consoleSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "check-console.mjs"), "utf8");
const beatHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "beat.hbs"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

test("a check is put to the table with every skill it lists, not just the first", () => {
  const spec = src.match(/function checkSpecFor\(scene, key\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(spec, "checkSpecFor is missing from scene-runner.mjs");
  // checkSkills(check) is core/roll-intent.mjs's own "every skill this check
  // offers" (the whole skillOptions list, or every skill for an any-skill check).
  assert.equal((spec.match(/skills: checkSkills\(check\),/g) ?? []).length, 2, "a beat's check and a person's topic both offer checkSkills(check)");
  assert.doesNotMatch(spec, /checkSkills\(check\)\s*\[0\]|skillOptions\s*\?\?\s*\[\]\s*\)\s*\[0\]/, "still slices out only the first skill option somewhere");
  assert.match(src, /import \{[^}]*\bcheckSkills\b[^}]*\} from "\.\.\/core\/roll-intent\.mjs"/);
});

test("each player's window offers every way as its own key, and posting to chat posts every one", () => {
  const player = readFileSync(path.join(moduleRoot, "templates", "check-console", "player.hbs"), "utf8");
  assert.match(player, /\{\{#each ways\}\}[\s\S]*?data-action="roll" data-slug="\{\{this\.slug\}\}"/, "a player no longer gets a key per way");
  assert.match(consoleSrc, /const ways = session\.skills\.map\(\(slug\) => \{/, "the player's keys are no longer every way the check offers");
  const post = consoleSrc.match(/async function postToChat\(session\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(post, "postToChat is missing from foundry/check-console.mjs");
  assert.match(post, /session\.skills\s*\n?\s*\.map\(\(slug\) => enricherFor\(/, "posting to chat no longer posts an inline check per way");
  assert.match(post, /anySkillCard\(\{\s*skillOptions: session\.skills,/, "an any-skill check no longer posts every skill as one card");
});

test("the \"Bring this in\" button has a real tooltip explaining its effect", () => {
  const button = beatHbs.match(/<button type="button" class="bi-runner__stamp" data-action="openBeat"[\s\S]*?<\/button>/);
  assert.ok(button, "the openBeat button is missing from beat.hbs");
  assert.match(button[0], /title="\{\{localize 'BLANKINHERITANCE\.Runner\.OpenHint'\}\}"/, "openBeat's button lost its tooltip");
  assert.match(en.BLANKINHERITANCE.Runner.OpenHint, /\S/, "OpenHint has no real localized text");
});
