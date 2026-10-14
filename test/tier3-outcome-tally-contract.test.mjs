// Tier 3 — the Scene Runner's own wiring for the outcome tally, 2026-09-19.
//
// Requested by Ingram: "It would be nice to record how many Crit success,
// success, neutral, fail, crit fails we get for each challenge." Pure
// counting logic is tier1-outcome-tally.test.mjs; this pins the adapter's
// two halves — every recorded degree actually writing one log entry per
// attempt, and the tally actually being read back out for the GM to see.
//
// 2026-10-05: both halves moved with the check into the check console. A
// degree marked there (recordMarkedOutcome) or set by hand for a player
// (recordHandResult) logs under outcomeLogSubject, as a rolled one does
// (recordRollResult); the Runner hands the console the tally, and the console
// prints it on each degree's row.
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
const checkCss = readFileSync(path.join(moduleRoot, "styles", "bi-check.css"), "utf8");

const moduleFn = (name) => src.match(new RegExp(`async function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0] ?? null;

test("a degree marked as the outcome logs one entry per NEW degree, keyed by outcomeLogSubject", () => {
  assert.match(src, /import \{[\s\S]*?outcomeLogSubject[\s\S]*?outcomeTally[\s\S]*?\} from "\.\.\/core\/scene-brief\.mjs"/, "no longer imports both outcome-tally helpers from core");
  const fn = moduleFn("recordMarkedOutcome");
  assert.ok(fn, "recordMarkedOutcome is missing from scene-runner.mjs");
  assert.match(fn, /recordLogEntry\(\{/, "no longer writes a log entry when a degree is recorded");
  assert.match(fn, /subject: outcomeLogSubject\(session\.key, degree\)/, "the logged entry no longer carries the outcome-subject shape outcomeTally reads back out");
  // Marking the same degree again clears it, and must NOT log a second,
  // contradictory entry: the write belongs only to the branch that SET it.
  assert.match(fn, /if \(set\) \{\s*\n\s*await recordLogEntry/, "the log write is no longer only on the branch that sets a new degree");
});

test("a result set by hand and a result rolled log the same way", () => {
  const hand = moduleFn("recordHandResult");
  assert.ok(hand, "recordHandResult is missing from scene-runner.mjs");
  assert.match(hand, /if \(degree\) \{\s*\n\s*await recordLogEntry\(\{[^)]*subject: outcomeLogSubject\(session\.key, degree\)/);
  const rolled = src.match(/async function recordRollResult\(result, \{ force = false \} = \{\}\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(rolled, /subject: outcomeLogSubject\(result\.key, result\.degree\)/);
});

test("the Runner hands the console the tally, read from the real session log", () => {
  const provider = src.match(/setCheckConsoleProvider\(\{[\s\S]*?\n\}\);/)?.[0];
  assert.ok(provider);
  assert.match(provider, /tally: outcomeTally\(currentEntries\(\), session\.key\)/, "the tally is no longer derived from the real log entries");
  assert.match(consoleSrc, /tally: Number\(ctx\.tally\?\.\[degree\]\) \|\| 0/, "the console no longer puts each degree's count on its row");
});

test("the console prints a count only where there is history, and it is styled", () => {
  assert.match(gmHbs, /\{\{#if this\.tally\}\} <span class="bi-check__tally"[^>]*>×\{\{this\.tally\}\}<\/span>\{\{\/if\}\}/);
  assert.match(checkCss, /\.bi-check__tally\s*\{/);
});
