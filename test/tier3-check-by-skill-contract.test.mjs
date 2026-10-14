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
// 2026-10-05: the breakdown moved with the check, from the card under the beat
// to the check console (foundry/check-console.mjs), where the GM reads it beside
// the ways before anyone rolls. The Runner reads it off the check file again for
// every repaint (checkOfSession), never from the shared setting.
//
// The sources and templates are read as text rather than mounted, matching
// every other tier3-*-contract.test.mjs in this project.

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
const gmHbs = readFileSync(path.join(moduleRoot, "templates", "check-console", "gm.hbs"), "utf8");
const beatHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "beat.hbs"), "utf8");
const checkCss = readFileSync(path.join(moduleRoot, "styles", "bi-check.css"), "utf8");

test("a check's results per way reach the console's Results: tabs for the ways, each degree's own result for the way shown (D062)", () => {
  const provider = src.match(/setCheckConsoleProvider\(\{[\s\S]*?\n\}\);/)?.[0];
  assert.ok(provider, "the Runner no longer tells the console about its checks");
  assert.match(provider, /bySkill: found\.check\.bySkill \?\? null/, "check.bySkill is no longer read off the raw challenge data");
  assert.match(consoleSrc, /const byWay = hasWayResults\(ctx\);/);
  assert.match(consoleSrc, /const result = shownWay \? resultFor\(ctx, shownWay, degree\)/, "each row reads the way shown's own result");
  assert.match(consoleSrc, /tabs: byWay \? session\.skills\.map\(\(slug\) => \(\{ slug, label: wayLabel\(slug\), on: slug === shownWay \}\)\) : \[\]/);
  // "(the same for every way)" only means something when some way has results of its own per degree: under a check
  // whose ways each have one line, it was printed on every row (found in the live screenshot, 2026-10-05).
  assert.match(consoleSrc, /const perDegree = hasPerDegreeWays\(ctx\);/);
  assert.match(consoleSrc, /shared: perDegree && !result\.own && Boolean\(result\.text\),/);
});

test("the console's Results show the ways as tabs, a way's own line as a note, and say when a degree is the same for every way; its blocks are balanced", () => {
  assert.match(gmHbs, /<section class="bi-deck__cell bi-check__results">[\s\S]*?\{\{localize "BLANKINHERITANCE\.CheckConsole\.Results"\}\}/, "the section is called Results");
  assert.match(gmHbs, /\{\{#each results\.tabs\}\}[\s\S]*?data-action="showResults" data-slug="\{\{this\.slug\}\}"/);
  assert.match(gmHbs, /\{\{#if results\.note\}\}<p class="bi-check__note">/);
  assert.match(gmHbs, /\{\{#if this\.shared\}\} <em class="bi-check__shared">/);
  // Structural sanity, the check that once caught an extra {{/if}} closing the outer check-guard early.
  for (const hbs of [gmHbs, beatHbs]) {
    const withoutComments = hbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
    const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
    const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
    assert.equal(opens, closes, `unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
  }
});

test("the Results' tabs and notes are real, styled CSS", () => {
  assert.match(checkCss, /\.bi-check \.bi-check__tab \{/);
  assert.match(checkCss, /\.bi-check \.bi-check__tab\.is-on \{/);
  assert.match(checkCss, /\.bi-check__note \{/);
  assert.match(checkCss, /\.bi-check__shared \{/);
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
