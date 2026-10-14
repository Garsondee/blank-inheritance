// Tier 3 — the attribute each skill adds is sf2e's own (D063).
//
// The deck groups its skill keys into sections by attribute and tints each key
// with it (core/deck-layout.mjs#SKILL_SECTIONS, core/skills.mjs#SKILL_ATTRIBUTES).
// The table is written out in core/ because core may not touch Foundry, so this
// test reads the shipped system's own CONFIG.PF2E.skills out of
// gamesystems/sf2e/sf2e.mjs and holds the two together: a system update that
// moved a skill to another attribute fails here instead of quietly filing the
// key under the wrong section. gamesystems/ is gitignored, so without it this
// skips loudly rather than passing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SKILL_ATTRIBUTES } from "../module/blank-inheritance/scripts/core/skills.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const sf2eBundle = path.join(here, "..", "gamesystems", "sf2e", "sf2e.mjs");

/** sf2e's `skills: Object.freeze({ slug: { label, attribute }, ... })`, read as text. */
function shippedSkillAttributes(source) {
  const start = source.indexOf("skills: Object.freeze({");
  assert.ok(start >= 0, "sf2e.mjs no longer has a `skills: Object.freeze({` block (CONFIG.PF2E.skills)");
  const block = source.slice(start, source.indexOf("}),", start));
  return Object.fromEntries([...block.matchAll(/(\w+): \{\s*label: `PF2E\.Skill\.\w+`,\s*attribute: `(\w+)`\s*\}/g)].map((m) => [m[1], m[2]]));
}

test("every skill's attribute is the one sf2e's own CONFIG.PF2E.skills gives it", (t) => {
  if (!existsSync(sf2eBundle)) {
    t.skip("gamesystems/sf2e/sf2e.mjs not present locally (gitignored): skipping loudly rather than failing or silently passing.");
    return;
  }
  const shipped = shippedSkillAttributes(readFileSync(sf2eBundle, "utf8"));
  assert.equal(Object.keys(shipped).length, 18, `read ${Object.keys(shipped).length} skills out of sf2e.mjs, expected eighteen`);
  assert.deepEqual(SKILL_ATTRIBUTES, shipped);
});
