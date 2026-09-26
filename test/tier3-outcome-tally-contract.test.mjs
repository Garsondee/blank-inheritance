// Tier 3 — the Scene Runner's own wiring for the outcome tally, 2026-09-19.
//
// Requested by Ingram: "It would be nice to record how many Crit success,
// success, neutral, fail, crit fails we get for each challenge." Pure
// counting logic is tier1-outcome-tally.test.mjs; this pins the adapter's
// two halves — #onRecordOutcome actually writing one log entry per attempt,
// and #decorateBeat actually reading the tally back out for the template.
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

test("#onRecordOutcome logs one entry per NEW degree recorded, keyed by outcomeLogSubject", () => {
  assert.match(src, /import \{[\s\S]*?outcomeLogSubject[\s\S]*?outcomeTally[\s\S]*?\} from "\.\.\/core\/scene-brief\.mjs"/, "no longer imports both outcome-tally helpers from core");
  const fn = src.match(/static async #onRecordOutcome\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onRecordOutcome is missing from scene-runner.mjs");
  assert.match(fn[0], /recordLogEntry\(\{/, "no longer writes a log entry when a degree is recorded");
  assert.match(fn[0], /subject:\s*outcomeLogSubject\(beatId, degree\)/, "the logged entry no longer carries the outcome-subject shape outcomeTally reads back out");

  // Un-ticking (clicking the same degree again) must NOT log a second,
  // contradictory entry -- the write belongs only to the branch that sets a
  // NEW ticked[beatId], same as fireBeatAudio right beside it.
  const setBranch = fn[0].match(/\} else \{[\s\S]*?\n {4}\}/);
  assert.ok(setBranch, "could not isolate the 'set a new degree' branch");
  assert.match(setBranch[0], /recordLogEntry/, "the log write is not inside the same branch as fireBeatAudio");
});

test("#decorateBeat computes check.tally from the real session log, using the same DEGREE_LABELS order as the outcome buttons", () => {
  const decorate = src.match(/#decorateBeat\(beat, brief, challenges, entries = \[\]\) \{[\s\S]*?\n {2}\}/);
  assert.ok(decorate);
  assert.match(decorate[0], /outcomeTally\(entries, beat\.id\)/, "tally is no longer derived from the real log entries passed into decorateBeat");
  assert.match(decorate[0], /DEGREE_LABELS\.map/, "tally no longer reuses the same label vocabulary as the outcome-recording buttons");
  assert.match(decorate[0], /every\(\(n\) => n === 0\)/, "a check with zero attempts logged no longer suppresses an all-zero tally row");
});

test("beat.hbs renders the tally only when there's real history, and the balance is correct", () => {
  assert.match(beatHbs, /check\.tally/, "check.tally is never referenced in beat.hbs");
  assert.match(beatHbs, /class="bi-runner__tally"/);

  const withoutComments = beatHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `beat.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test(".bi-runner__tally is real, styled CSS", () => {
  assert.match(css, /\.bi-runner__tally\s*\{/);
  assert.match(css, /\.bi-runner__tally-item--hit\s*\{/);
});
