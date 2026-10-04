// Tier 3 — Post Check posts EVERY listed skill, and "Bring this in" explains itself.
//
// Found live 2026-09-19 (Ingram): a check button already listed several
// skills ("PERCEPTION / MEDICINE / SOCIETY 17") but clicking it only ever
// posted the first. Separately, "Bring this in" had no tooltip explaining
// what it does. Both fixed in the same pass; this is the record that they
// stay fixed.
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
const beatHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "beat.hbs"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

test("#onPostCheck posts every skill in skillOptions, not just the first", () => {
  const fn = src.match(/static async #onPostCheck\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onPostCheck is missing from scene-runner.mjs");
  // checkSkills(check) is core/roll-intent.mjs's own "every skill this check
  // offers" (the whole skillOptions list, or every skill for an any-skill
  // check). This assertion still named the older inline form after the
  // source moved to it, and failed at HEAD from 2026-09-26's big commit.
  // 2026-10-04 (D059): it posts through the shared checkMessageContent, whose ordinary shape is enrichersFor over
  // checkSkills(check) and whose any-skill shape is the compact card over the same list.
  assert.match(fn[0], /checkMessageContent\(check, \{ dc, briefId: brief\.id, key: beat\.id \}\)/, "no longer posts through the shared checkMessageContent");
  const content = src.match(/function checkMessageContent\(check, \{ dc, briefId, key \}\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(content, /enrichersFor\(\{\s*skillOptions:\s*checkSkills\(check\)/, "no longer builds the posted content from the FULL skillOptions list");
  assert.match(content, /const skills = checkSkills\(check\);/, "the any-skill card no longer offers every skill");
  assert.doesNotMatch(content, /checkSkills\(check\)\s*\[0\]/, "still slices out only the first skill option somewhere");
  assert.doesNotMatch(fn[0], /skillOptions\s*\?\?\s*\[\]\s*\)\s*\[0\]/, "still slices out only the first skill option somewhere");
  assert.doesNotMatch(fn[0], /checkSkills\(check\)\s*\[0\]/, "still slices out only the first skill option somewhere");
  assert.match(src, /import \{[^}]*\benrichersFor\b[^}]*\} from "\.\.\/core\/roll-intent\.mjs"/, "no longer imports the multi-skill enricher builder");
  assert.doesNotMatch(src, /import \{ enricherFor \} from/, "still imports the single-skill-only enricherFor directly, suggesting the old first-skill-only path may still be reachable");
});

test("the \"Bring this in\" button has a real tooltip explaining its effect", () => {
  const button = beatHbs.match(/<button type="button" class="bi-runner__stamp" data-action="openBeat"[\s\S]*?<\/button>/);
  assert.ok(button, "the openBeat button is missing from beat.hbs");
  assert.match(button[0], /title="\{\{localize 'BLANKINHERITANCE\.Runner\.OpenHint'\}\}"/, "openBeat's button lost its tooltip");
  assert.match(en.BLANKINHERITANCE.Runner.OpenHint, /\S/, "OpenHint has no real localized text");
});
