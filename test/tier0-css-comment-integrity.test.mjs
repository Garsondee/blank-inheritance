// Tier 0 — every module stylesheet's comments actually close where a human
// meant them to, not wherever the first `*` immediately followed by `/`
// happens to fall.
//
// Found live 2026-09-19, verified against a real browser's own CSSOM before
// this test existed: a bi-components.css doctrine comment contained the
// prose "--bi-paper-*/--bi-bone tokens" (no spaces around the slash) --
// perfectly ordinary prose, and also a perfectly real CSS comment-close
// token sitting in the middle of it. The comment closed ~30 lines early;
// everything up to its REAL, intended close became live (invalid) CSS text;
// the parser's error recovery silently discarded the next real rule as
// collateral damage. No console error, no build failure -- a whole theme's
// light mode just quietly had no background. See test/support/css-lint.mjs's
// own header for the full diagnosis, including the browser console commands
// that proved it (this file's own first draft hit the identical bug in its
// own JS block comment, describing the CSS bug -- see that file's git
// history for the demonstration neither of us needs repeated).
//
// This does not (and without a real CSS parser, cannot) prove every comment
// closes where intended -- it proves the two mechanical symptoms that kind
// of mistake produces: a brace-balance shift, or a known-critical selector
// silently failing to open a rule where the source clearly still says it
// should. Extend the CRITICAL_SELECTORS list below whenever a similarly
// easy-to-silently-lose rule is added.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ruleSelectors, braceBalance, stripCssComments } from "./support/css-lint.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const stylesDir = path.join(repoRoot, "module", "blank-inheritance", "styles");
const cssFiles = readdirSync(stylesDir).filter((name) => name.endsWith(".css"));

test("every module stylesheet has balanced braces once comments and strings are correctly removed", () => {
  for (const name of cssFiles) {
    const text = readFileSync(path.join(stylesDir, name), "utf8");
    const { finalDepth, wentNegative } = braceBalance(text);
    assert.equal(finalDepth, 0, `${name}: braces do not balance (ended at depth ${finalDepth}) -- a comment likely closed somewhere it shouldn't have`);
    assert.equal(wentNegative, false, `${name}: brace depth went negative at some point -- an unmatched closing brace, real or one a swallowed comment exposed`);
  }
});

// Selectors that MUST open a rule in bi-components.css -- each entry is
// [selector text as ruleSelectors() would report it, expected minimum count].
// .bi-runner/.bi-scene-close's shared token rule is exactly the one this
// bug ate; it and the dark override are both real, separate rules using the
// same selector text as .bi-runner's own layout rule and the min-type rule,
// so the count is 2, not 1.
const CRITICAL_SELECTORS = [
  [".bi-runner, .bi-scene-close__body", 2],
  [".bi-runner[data-bi-theme=\"dark\"], .bi-scene-close__body[data-bi-theme=\"dark\"]", 1]
];

test("bi-components.css: every critical shared-theme selector still opens a real rule, not silently eaten by an earlier comment", () => {
  const text = readFileSync(path.join(stylesDir, "bi-components.css"), "utf8");
  const selectors = ruleSelectors(text).map((s) => s.replace(/\s+/g, " ").trim());
  for (const [selector, minCount] of CRITICAL_SELECTORS) {
    const count = selectors.filter((s) => s === selector).length;
    assert.ok(count >= minCount, `expected "${selector}" to open at least ${minCount} rule(s), found ${count}`);
  }
});

test("bi-components.css: the shared light-theme token rule is immediately followed by its first real token, not orphaned comment prose", () => {
  const text = readFileSync(path.join(stylesDir, "bi-components.css"), "utf8");
  const stripped = stripCssComments(text);
  const idx = stripped.indexOf(".bi-runner, .bi-scene-close__body {");
  assert.ok(idx >= 0, "the shared token rule's opening is missing entirely once comments are correctly removed");
  const body = stripped.slice(idx, idx + 200).replace(/\s+/g, " ");
  assert.match(body, /--sr-bg:\s*#f3efe4/, "the light-theme --sr-bg value no longer immediately follows the rule's own opening -- something is sitting between them again");
});
