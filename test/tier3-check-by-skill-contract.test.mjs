// Tier 3 — a check's own listed skills can carry genuinely different
// consequences, not just a same-outcome flavour pick. 2026-09-19.
//
// Found live (Ingram, auditing Episode One's mechanical depth): checks
// offering several skills (The Errand's storekeeper: diplomacy/deception/
// intimidation/society) all resolved to the exact same outcome table
// regardless of which was rolled -- short of this project's own settled
// 2026-09-09 commitment ("multiple named SF2E actions per obstacle, each
// with its own DC and its own consequence, so players are pushed to think
// laterally"). Paired with the companion fix in core/roll-intent.mjs
// (#186/#184: every listed skill is now actually postable, not just the
// first) -- this is what makes posting all four skills worth doing at all.
//
// scene-runner.mjs/beat.hbs are read as source/markup rather than mounted,
// matching every other tier3-*-contract.test.mjs in this project.

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
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");

test("a check's bySkill map is decorated onto the beat as a real array the template can iterate", () => {
  const decorate = src.match(/#decorateBeat\(beat, brief, challenges, entries = \[\], runState = null\) \{[\s\S]*?\n {2}\}/);
  assert.ok(decorate, "#decorateBeat is missing from scene-runner.mjs");
  assert.match(decorate[0], /bySkill:\s*check\.bySkill/, "check.bySkill is no longer read off the raw challenge data");
  assert.match(decorate[0], /Object\.entries\(check\.bySkill\)/, "bySkill is no longer converted to a template-iterable shape");
});

test("beat.hbs renders the by-skill breakdown right under the check button, and the block is correctly balanced", () => {
  assert.match(beatHbs, /check\.bySkill/, "bySkill is never referenced in beat.hbs");
  assert.match(beatHbs, /class="bi-runner__by-skill"/);
  assert.match(beatHbs, /class="bi-runner__by-skill-name"/);

  // Structural sanity: every #if/#each in the file (outside its own leading
  // comment, which literally quotes "{{#if}}" as documentation prose and
  // would otherwise produce a false mismatch) is properly closed. This is
  // the exact check that caught a real off-by-one while building this
  // feature -- an extra {{/if}} had closed the outer check-guard early.
  const withoutComments = beatHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `beat.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test(".bi-runner__by-skill is real, styled CSS", () => {
  assert.match(css, /\.bi-runner__by-skill\s*\{/);
  assert.match(css, /\.bi-runner__by-skill-name\s*\{/);
});

// REAL DATA: every check this project has deliberately given a bySkill table
// (as opposed to the many multi-skill checks left correctly flat, per the
// schema's own "inventing a difference where the fiction doesn't call for
// one is worse than not having this field at all") -- add to this list
// alongside the data whenever a new one is authored, so the sweep this was
// built for (#183) stays covered by a test instead of by memory.
const CHECKS_WITH_BY_SKILL = [
  { file: "c1e1-the-errand.json", checkId: "the-storekeeper" },
  { file: "c1e1-the-errand.json", checkId: "read-the-old-man" },
  { file: "c1e1-the-errand.json", checkId: "the-mark-again" },
  { file: "c1e1-the-road-in.json", checkId: "a-mark-at-head-height" }
];

for (const { file, checkId } of CHECKS_WITH_BY_SKILL) {
  test(`REAL DATA: ${file}#${checkId} has a genuinely different consequence per listed skill, not N copies of the same line`, () => {
    const challenge = JSON.parse(readFileSync(path.join(repoRoot, "data", "challenges", file), "utf8"));
    const check = challenge.checks.find((c) => c.id === checkId);
    assert.ok(check, `${checkId} is missing from ${file}`);
    assert.ok(check.bySkill, `${checkId} has no bySkill table`);

    for (const skill of check.skillOptions) {
      assert.ok(check.bySkill[skill], `bySkill has nothing authored for "${skill}", which is still listed in skillOptions`);
    }
    const texts = Object.values(check.bySkill);
    assert.equal(new Set(texts).size, texts.length, "two skills share byte-identical bySkill text -- that's a same-outcome flavour pick, not a real difference");
  });
}
