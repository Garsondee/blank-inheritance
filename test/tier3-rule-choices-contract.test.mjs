// Tier 3 — the contract between the induction terminal's answers to a background's or class's questions
// (core/induction-rule-choices.mjs) and sf2e's own ChoiceSet rule element.
//
// The terminal asks a question on its own page and writes the answer into the ChoiceSet's rule data as `selection` before the Item is
// embedded, so sf2e opens no "Select a skill" window mid-embed (found by the playtest rig, 2026-10-06, F-0008). That rests on four
// things inside the bundled system, which is not ours: that the rule element reads `selection` from its own source, that a selection
// matching one of its choices is taken as the answer without asking, that the window is what happens without one, and that the answer
// is written to the flag a following rule reads. None of it can be import-tested (sf2e.mjs dereferences Foundry globals at module
// scope), so this reads the shipped bundle as text and asserts the shapes are still there; a system upgrade that moves any of them
// fails here, not at a real player's Confirm.
//
// Skips loudly when the gitignored gamesystems/sf2e tree is absent (design/testing-strategy.md §3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FALLBACK_SKILL_SLUGS } from "../module/blank-inheritance/scripts/core/skills.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const bundlePath = path.join(repoRoot, "gamesystems", "sf2e", "sf2e.mjs");

function readBundle(t) {
  if (!existsSync(bundlePath)) {
    t.skip("gamesystems/sf2e/sf2e.mjs not present locally (gitignored): the rule-choice contract needs it, skipping loudly rather than failing or silently passing.");
    return null;
  }
  return readFileSync(bundlePath, "utf8");
}

test("the ChoiceSet rule element reads a `selection` from its own source", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;
  assert.match(
    bundle,
    /this\.selection = typeof (\w+)\.selection == `string` \|\| typeof \1\.selection == `number` \|\| \w+\(\1\.selection\) \? \1\.selection : null/,
    "ChoiceSetRuleElement no longer takes `selection` (a string, a number or an object) from the rule's own data"
  );
  assert.match(bundle, /class ChoiceSetRuleElement extends RuleElement \{\s*containsItems = !1;\s*selection = null;/);
});

test("a selection that matches one of the choices is the answer, and the window opens only without one", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;
  assert.match(
    bundle,
    /#getPreselection\((\w+)\) \{\s*return this\.selection === null \? null : \1\.find\(\((\w+)\) => \w+\(this\.selection, \2\.value\)\) \?\? null;\s*\}/,
    "ChoiceSet's preselection is no longer a comparison of `selection` with each choice's value: an object-valued answer may no longer match"
  );
  assert.match(
    bundle,
    /let (\w+) = this\.#getPreselection\(this\.choices\) \?\? await new PickAThingPrompt\(\{/,
    "ChoiceSet no longer tries the preselection before it opens the prompt"
  );
});

test("the answer is written to the flag the next rule reads, for a plain value and for an object alike", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;
  assert.match(bundle, /this\.item\.flags\.sf2e\.rulesSelections\[this\.flag\] = this\.selection/, "ChoiceSet no longer writes its selection to the item's rulesSelections flag when it is built");
  assert.match(bundle, /async preCreate\(\{ itemSource: e, ruleSource: t, tempItems: n \}\) \{/, "ChoiceSet's preCreate changed its arguments: re-read how it takes a preselection");
});

test("every skill the form can offer has a name in sf2e's own language file, which the terminal localizes an option from", (t) => {
  if (!readBundle(t)) return;
  // The skill list itself is held against the system by test/tier3-roll-contract.test.mjs and test/tier3-skill-attributes-contract.test.mjs.
  const lang = JSON.parse(readFileSync(path.join(repoRoot, "gamesystems", "sf2e", "lang", "en.json"), "utf8"));
  for (const slug of FALLBACK_SKILL_SLUGS) {
    const key = `${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    assert.ok(lang.PF2E?.Skill?.[key], `sf2e's language file has no PF2E.Skill.${key}`);
  }
});
