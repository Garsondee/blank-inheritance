// Tier 3 — the Cast drawer's "one-click DC-plus-degree-of-success recording
// per subject," 2026-09-19 (design/ux-doctrine.md §10.7).
//
// Found genuinely missing, not just imperfect: `person.hbs`'s `coercible`
// list — the one topic type real authored data actually attaches a
// `challengeRef` to (confirmed by scanning every scene brief: `willDiscuss`
// never carries one, `coercible` does twice, in c1e1-canteen and
// c1e1-intake-medicals) — rendered as plain, unclickable text. A GM wanting
// to press a coercible topic had to leave the Scene Runner, find the right
// challenge by hand, and post the check manually; recording how it landed
// meant a free-text log line rather than the structured, tallyable record a
// beat's own check already gets.
//
// This mirrors beat.hbs/scene-runner.mjs's own #decorateBeat / #onPostCheck /
// #onRecordOutcome as closely as the shape allows, deliberately: a GM who has
// learned the beat interaction should not have to learn a second one for a
// topic. The one real difference is storage — a topic's degree lives in its
// own `state.topics` bag, never `state.ticked`, because a coercible topic is
// a side conversation, not a beat that gates branching.
//
// scene-runner.mjs and person.hbs are read as source/markup rather than
// mounted, matching every other tier3-scene-runner-*-contract.test.mjs in
// this project (ApplicationV2 destructures foundry.applications.api at
// module scope, and this feature's own #onPostTopicCheck/#onRecordTopicOutcome
// touch ChatMessage.create/game.settings, neither modelled deeply enough by
// test/support/mock-foundry.mjs to execute this behaviourally either).

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

test("a coercible topic with a challengeRef is decorated with a real check, keyed by castId+index rather than a beat id", () => {
  const fn = src.match(/#decorateCoercibleTopic\(topic, castId, index, brief, challenges, runState\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#decorateCoercibleTopic is missing from scene-runner.mjs");
  assert.match(fn[0], /if \(!topic\?\.challengeRef\) return topic;/, "a topic with no challengeRef must be returned unchanged, not given a check it was never authored with");
  assert.match(fn[0], /const check = checkFor\(topic, challenges\);/, "no longer reuses the same checkFor() a beat's own check goes through");
  assert.match(fn[0], /const topicKey = `\$\{castId\}:coercible:\$\{index\}`;/, "the topic key is no longer castId+coercible+index -- this MUST stay in sync with #onRecordTopicOutcome's own key construction below");
  assert.match(fn[0], /const pickedDegree = runState\.topics\?\.\[topicKey\]\?\.degree \?\? null;/, "no longer reads its persisted degree from state.topics");
});

test("cast is decorated with coercible topics BEFORE being handed to the template, in _prepareContext", () => {
  assert.match(
    src,
    /coercible: \(member\.brief\?\.coercible \?\? \[\]\)\.map\(\(topic, index\) =>\s*\n\s*this\.#decorateCoercibleTopic\(topic, member\.id, index, brief, challenges, runState\)\s*\n\s*\)/,
    "the cast mapping in _prepareContext no longer decorates brief.coercible with #decorateCoercibleTopic"
  );
});

test("#onPostTopicCheck posts a real inline check the same way #onPostCheck does, addressed by castId+topicIndex", () => {
  const fn = src.match(/static async #onPostTopicCheck\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onPostTopicCheck is missing");
  assert.match(fn[0], /this\.#coercibleTopic\(target\.dataset\.castId, Number\(target\.dataset\.topicIndex\)\)/, "no longer resolves the topic from castId/topicIndex dataset attributes");
  // 2026-09-24: the posted check also carries the runner's roll tag (brief +
  // topic key), so the result the table rolls records itself against the
  // topic — see tier3-runner-roll-capture-contract.test.mjs.
  // checkSkills(check), not check.skillOptions: #onPostCheck resolves a
  // check's skills through core/roll-intent.mjs's checkSkills, and this must
  // stay the same way (the assertion was stale from 2026-09-26's big commit).
  assert.match(fn[0], /ChatMessage\.create\(\{ content: enrichersFor\(\{ skillOptions: checkSkills\(check\), dc, options: rollTagFor\(brief\.id, topicKey\) \}\) \}\)/, "no longer posts a real sf2e inline check the same way #onPostCheck does");
  // The key it tags with must be the SAME key #onRecordTopicOutcome and
  // #decorateCoercibleTopic build, or a rolled result would land nowhere.
  assert.match(fn[0], /const topicKey = `\$\{target\.dataset\.castId\}:coercible:\$\{Number\(target\.dataset\.topicIndex\)\}`;/);
});

test("#onRecordTopicOutcome writes to state.topics, never state.ticked -- a topic must never participate in beat-branch logic", () => {
  const fn = src.match(/static async #onRecordTopicOutcome\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onRecordTopicOutcome is missing");
  assert.match(fn[0], /const topics = \{ \.\.\.state\.topics \};/, "no longer copies state.topics as its own bag");
  assert.doesNotMatch(fn[0], /state\.ticked/, "#onRecordTopicOutcome must never touch state.ticked -- that would make a topic's outcome silently gate beat branching");
  assert.match(fn[0], /await writeRunState\(briefId, \{ \.\.\.state, topics \}\);/, "no longer persists the updated topics bag");
});

test("#onRecordTopicOutcome logs through the exact same outcomeLogSubject/recordLogEntry pipeline a beat's own outcome does, so it is tallyable and filterable identically", () => {
  const fn = src.match(/static async #onRecordTopicOutcome\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.match(fn[0], /subject: outcomeLogSubject\(topicKey, degree\)/, "no longer tags the log entry with outcomeLogSubject, the same beat outcomes reuse for their own tally");
});

test("both new actions are wired on DEFAULT_OPTIONS.actions, alongside postCheck/recordOutcome", () => {
  assert.match(src, /postTopicCheck:\s*SceneRunner\.#onPostTopicCheck,/, "postTopicCheck is no longer wired as an action");
  assert.match(src, /recordTopicOutcome:\s*SceneRunner\.#onRecordTopicOutcome,/, "recordTopicOutcome is no longer wired as an action");
});

test("person.hbs only offers the check/outcome buttons on a coercible topic that actually has one, and never on willDiscuss (real data: only coercible ever carries a challengeRef)", () => {
  const willDiscussBlock = person.match(/\{\{#each brief\.willDiscuss\}\}[\s\S]*?\{\{\/each\}\}/);
  assert.ok(willDiscussBlock, "could not find the willDiscuss each-block in person.hbs");
  assert.doesNotMatch(
    willDiscussBlock[0],
    /data-action="postTopicCheck"/,
    "willDiscuss must not offer a check button -- no willDiscuss entry in any real scene brief carries a challengeRef"
  );
  const coercibleBlock = person.match(/\{\{#each brief\.coercible\}\}[\s\S]*?\{\{\/each\}\}/);
  assert.ok(coercibleBlock, "could not find the coercible each-block in person.hbs");
  assert.match(coercibleBlock[0], /\{\{#if check\}\}/, "the coercible block no longer gates its check UI behind {{#if check}} -- a topic with no challengeRef would render a broken button");
  assert.match(coercibleBlock[0], /data-action="postTopicCheck"/);
  assert.match(coercibleBlock[0], /data-action="recordTopicOutcome"/);
});

test("person.hbs addresses the person two context levels up from the nested outcomes each, correctly reaching past both the coercible-topic and the if-check levels", () => {
  // {{#if}} does not push a Handlebars context, {{#each}} does -- the real
  // nesting from the outcomes button back to the person is exactly two
  // #each levels (brief.coercible, then outcomes), hence ../../id, not ../id
  // (which is what the shallower beat.hbs -- whose own top-level partial
  // context already IS the beat -- correctly uses instead).
  assert.match(person, /data-cast-id="\{\{\.\.\/\.\.\/id\}\}"/, "the outcome button's data-cast-id no longer climbs two context levels back to the person");
  // Regression, found live 2026-09-19: `{{../@index}}` is NOT valid Handlebars
  // -- Foundry's own parser rejected it outright ("Expecting 'ID', got
  // 'DATA'"), which took the whole panel down (ApplicationV2 renders no
  // fallback DOM on a template parse failure). The private @index variable
  // has to come FIRST, the parent-hop second: `{{@../index}}`.
  assert.doesNotMatch(person, /\{\{\.\.\/@index\}\}/, "the invalid {{../@index}} syntax is back -- this fails to parse in real Foundry, not just a style nit");
  assert.match(person, /data-topic-index="\{\{@\.\.\/index\}\}"/, "the outcome button's data-topic-index no longer reads the parent each's own @index via the correct {{@../index}} syntax");
});
