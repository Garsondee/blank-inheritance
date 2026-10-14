// Tier 3 — the Cast drawer's "one-click DC-plus-degree-of-success recording
// per subject," 2026-09-19 (design/ux-doctrine.md §10.7).
//
// Found genuinely missing, not just imperfect: `person.hbs`'s `coercible`
// list — the one topic type real authored data actually attaches a
// `challengeRef` to (confirmed by scanning every scene brief: `willDiscuss`
// never carries one, `coercible` does) — rendered as plain, unclickable text.
//
// A topic's check works exactly the way a beat's does, deliberately: a GM who
// has learned the beat interaction should not have to learn a second one for
// a topic. Since 2026-10-05 that interaction is the pill (core/check-pill.mjs)
// that opens the check console (foundry/check-console.mjs). The one real
// difference is storage — a topic's degree lives in its own `state.topics`
// bag, never `state.ticked`, because a coercible topic is a side
// conversation, not a beat that gates branching.
//
// scene-runner.mjs and person.hbs are read as source/markup rather than
// mounted, matching every other tier3-scene-runner-*-contract.test.mjs in
// this project (ApplicationV2 destructures foundry.applications.api at
// module scope).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const person = readFileSync(path.join(moduleRoot, "templates", "runner", "person.hbs"), "utf8");

const moduleFn = (name) => src.match(new RegExp(`(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0] ?? null;

test("a coercible topic with a challengeRef is decorated with its check's pill, keyed by castId+index rather than a beat id", () => {
  const fn = src.match(/#decorateCoercibleTopic\(topic, castId, index, brief, challenges, runState\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#decorateCoercibleTopic is missing from scene-runner.mjs");
  assert.match(fn[0], /if \(!topic\?\.challengeRef\) return topic;/, "a topic with no challengeRef must be returned unchanged, not given a check it was never authored with");
  assert.match(fn[0], /const check = checkFor\(topic, challenges\);/, "no longer reuses the same checkFor() a beat's own check goes through");
  assert.match(fn[0], /const topicKey = `\$\{castId\}:coercible:\$\{index\}`;/, "the topic key is no longer castId+coercible+index -- this MUST stay in sync with checkSpecFor's own key");
  assert.match(fn[0], /const picked = runState\.topics\?\.\[topicKey\]\?\.degree \?\? null;/, "no longer reads its persisted degree from state.topics");
  assert.match(fn[0], /check: \{ pill: checkPill\(\{ key, check, dc, words: null, lights \}\) \}/, "the topic no longer carries its check's pill");
  assert.match(fn[0], /const key = `topic:\$\{castId\}:\$\{index\}`;/);
});

test("cast is decorated with coercible topics BEFORE being handed to the template, in _prepareContext", () => {
  assert.match(
    src,
    /coercible: \(member\.brief\?\.coercible \?\? \[\]\)\.map\(\(topic, index\) =>\s*\n\s*this\.#decorateCoercibleTopic\(topic, member\.id, index, brief, challenges, runState\)\s*\n\s*\)/,
    "the cast mapping in _prepareContext no longer decorates brief.coercible with #decorateCoercibleTopic"
  );
});

test("a topic's pill puts its check to the table the same way a beat's does, under the same topic key", () => {
  const spec = moduleFn("checkSpecFor");
  assert.ok(spec, "checkSpecFor is missing");
  assert.match(spec, /if \(key\.startsWith\("topic:"\)\) \{/);
  assert.match(spec, /const topic = member\?\.brief\?\.coercible\?\.\[index\] \?\? null;/);
  // The key its rolls are tagged with must be the SAME key #decorateCoercibleTopic
  // builds and the run state keeps, or a rolled result would land nowhere.
  assert.match(spec, /key: `\$\{castId\}:coercible:\$\{index\}`,/);
  assert.match(spec, /source: \{ kind: "topic", briefId: brief\.id, castId, index \},/);
  assert.match(spec, /blind: check\.secret === true/, "a topic's check whose critical failure is a belief must roll blind, as a beat's does");
});

test("a topic's result is written to state.topics, never state.ticked -- a topic must never participate in beat-branch logic", () => {
  for (const name of ["recordHandResult", "recordMarkedOutcome"]) {
    const fn = moduleFn(name);
    assert.ok(fn, `${name} is missing`);
    const topicBranch = fn.match(/if \(isTopicKey\(session\.key\)\) \{[\s\S]*?\n {2}\} else \{/)?.[0];
    assert.ok(topicBranch, `${name} no longer treats a topic apart from a beat`);
    assert.match(topicBranch, /const topics = \{ \.\.\.state\.topics \};/, "no longer copies state.topics as its own bag");
    assert.doesNotMatch(topicBranch, /ticked/, "a topic must never touch state.ticked -- that would make it silently gate beat branching");
    assert.match(topicBranch, /await writeRunState\(briefId, \{ \.\.\.state, topics \}\);/, "no longer persists the updated topics bag");
  }
});

test("a topic's result logs through the same outcomeLogSubject/recordLogEntry pipeline a beat's does, so it is tallyable identically", () => {
  for (const name of ["recordHandResult", "recordMarkedOutcome"]) {
    assert.match(moduleFn(name), /subject: outcomeLogSubject\(session\.key, degree\)/, `${name} no longer tags the log entry with outcomeLogSubject`);
  }
});

test("the pill's press is wired on DEFAULT_OPTIONS.actions", () => {
  assert.match(src, /openCheck:\s*SceneRunner\.#onOpenCheck,/, "openCheck is no longer wired as an action");
  assert.match(src, /static async #onOpenCheck\(event, target\) \{\s*\n\s*const spec = checkSpecFor\(this\._scene, target\.dataset\.checkKey\);/);
});

test("person.hbs only offers the pill on a coercible topic that actually has a check, and never on willDiscuss (real data: only coercible ever carries a challengeRef)", () => {
  const willDiscussBlock = person.match(/\{\{#each brief\.willDiscuss\}\}[\s\S]*?\{\{\/each\}\}/);
  assert.ok(willDiscussBlock, "could not find the willDiscuss each-block in person.hbs");
  assert.doesNotMatch(willDiscussBlock[0], /check\.pill|data-action="openCheck"/, "willDiscuss must not offer a check -- no willDiscuss entry in any real scene brief carries a challengeRef");
  const coercibleBlock = person.match(/\{\{#each brief\.coercible\}\}[\s\S]*?\{\{\/each\}\}/);
  assert.ok(coercibleBlock, "could not find the coercible each-block in person.hbs");
  assert.match(coercibleBlock[0], /\{\{#if check\}\}\s*\n\s*<div class="bi-runner__topic-check">\{\{\{check\.pill\}\}\}<\/div>\s*\n\s*\{\{\/if\}\}/, "the coercible block no longer gates its pill behind {{#if check}}");
});

test("person.hbs carries no hand-built outcome buttons any more, and none of the invalid {{../@index}} syntax", () => {
  // Regression, found live 2026-09-19: `{{../@index}}` is NOT valid Handlebars
  // -- Foundry's own parser rejected it outright ("Expecting 'ID', got
  // 'DATA'"), which took the whole panel down.
  assert.doesNotMatch(person, /\{\{\.\.\/@index\}\}/, "the invalid {{../@index}} syntax is back -- this fails to parse in real Foundry, not just a style nit");
  assert.doesNotMatch(person, /data-action="(?:postTopicCheck|recordTopicOutcome)"/, "the old post and record stamps are back beside the pill");
});
