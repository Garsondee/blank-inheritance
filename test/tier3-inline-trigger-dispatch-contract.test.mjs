// Tier 3 — inline scene-runner triggers and choicePoint actually wired up
// (design/scene-triggers-and-depth.md §2, Build Items 1-3).
//
// core/inline-triggers.mjs's own parser is unit-tested in isolation
// (tier1-inline-triggers.test.mjs). This is the other half: that
// scene-runner.mjs actually calls it while decorating a beat, that a fired
// trigger dispatches to the SAME existing functions the beat's own action
// row already uses (never a second, parallel implementation), and that a
// picked choicePoint option is recorded and logged the same way an outcome
// degree already is.
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

function fn(name, source = src) {
  const m = source.match(new RegExp(`static async #${name}\\(event, target\\) \\{[\\s\\S]*?\\n {2}\\}`));
  return m ? m[0] : null;
}

test("decorateInlineTriggers is imported and actually used to build decoratedText/decoratedReadAloud", () => {
  // Matches the NAME rather than the whole import statement. The statement also
  // pulls in `escapeHtml` now, for the direction/note emphasis path, and pinning
  // the exact spelling failed on an addition that left this contract's own
  // intent -- the parser is imported and used -- completely intact.
  assert.match(
    src,
    /import \{[^}]*\bdecorateInlineTriggers\b[^}]*\} from "\.\.\/core\/inline-triggers\.mjs"/,
    "no longer imports the parser"
  );
  const decorate = src.match(/#decorateBeat\(beat, brief, challenges, entries = \[\]\) \{[\s\S]*?\n {2}\}/);
  assert.ok(decorate, "#decorateBeat is missing from scene-runner.mjs");
  assert.match(decorate[0], /decorateInlineTriggers\(beat\.text, beat\.triggers, beat\.id\)/, "beat.text is no longer run through the trigger parser");
  assert.match(decorate[0], /decorateInlineTriggers\(beat\.readAloud, beat\.triggers, beat\.id\)/, "beat.readAloud is no longer run through the trigger parser");
  assert.match(decorate[0], /decoratedText/);
  assert.match(decorate[0], /decoratedReadAloud/);
});

test("#decorateBeat decorates choicePoint options with isPicked, the same convention outcomes already uses", () => {
  const decorate = src.match(/#decorateBeat\(beat, brief, challenges, entries = \[\]\) \{[\s\S]*?\n {2}\}/);
  assert.match(decorate[0], /isPicked:\s*beat\.choice === option\.id/);
});

test("fireTrigger and recordChoice are both wired into the action registry", () => {
  assert.match(src, /fireTrigger:\s*SceneRunner\.#onFireTrigger/);
  assert.match(src, /recordChoice:\s*SceneRunner\.#onRecordChoice/);
});

test("#onFireTrigger dispatches every kind to the SAME existing function its non-inline counterpart uses, never a parallel implementation", () => {
  const body = fn("onFireTrigger");
  assert.ok(body, "#onFireTrigger is missing from scene-runner.mjs");

  assert.match(body, /case "npc-enter":/);
  assert.match(body, /castFor\(brief, trigger\.npcRef\)/, "npc-enter no longer resolves the cast member through the shared castFor helper");
  assert.match(body, /await summonToStage\(scene, summonDescriptorFor\(member, /, "npc-enter no longer calls the real summonToStage through the shared descriptor");
  assert.match(body, /summonDescriptorFor\(member, trigger\.arrival \|\| member\.arrival\)/, "a trigger-level arrival override no longer takes precedence over the cast member's own default");

  assert.match(body, /case "reveal-name":/);
  assert.match(body, /await revealName\(rawStageId\(member\), \{ announce: Boolean\(trigger\.announce\) \}\)/, "reveal-name no longer calls the real revealName");

  assert.match(body, /case "npc-exit":/);
  assert.match(body, /await removeFromStage\(scene, portraitIdFor\(member\)\)/, "npc-exit no longer calls the real removeFromStage");

  assert.match(body, /case "reveal-handout":/);
  assert.match(body, /revealHandout\(trigger\.handoutRef, this\._scene, users\)/, "reveal-handout no longer calls the shared revealHandout function");

  assert.match(body, /case "gm-tool":/);
  assert.match(body, /GM_TOOLS\[trigger\.toolId\]/, "gm-tool no longer resolves through the shared GM_TOOLS registry");

  assert.match(body, /case "post-check":/);
  assert.match(body, /checkFor\(\{ challengeRef: beat\?\.challengeRef, checkRef: trigger\.checkRef \}, challenges\)/, "post-check no longer resolves the check through the shared checkFor helper");
  assert.match(body, /await ChatMessage\.create\(\{ content: enrichersFor\(/, "post-check no longer posts through the real enrichersFor/ChatMessage path");

  assert.match(body, /case "note":/);
});

test("#onFireTrigger fails loudly (console.error) on an unrecognised trigger id, an unresolved npcRef, and an unregistered gmTool — never silently doing nothing", () => {
  const handler = fn("onFireTrigger");
  assert.ok(handler);
  const errors = handler.match(/console\.error\(/g) ?? [];
  assert.ok(errors.length >= 3, `expected at least 3 console.error call sites in #onFireTrigger (unknown trigger, unresolved npcRef x2, unregistered gmTool, unresolved checkRef), found ${errors.length}`);
});

test("a false mechanical log record is worse than a missing one (§2.5): reveal-handout and post-check only log once the action actually completed", () => {
  const handler = fn("onFireTrigger");
  assert.ok(handler);

  const revealCase = handler.match(/case "reveal-handout": \{[\s\S]*?\n {6}\}/);
  assert.ok(revealCase, "reveal-handout case is missing");
  assert.match(revealCase[0], /const revealed = await revealHandout\(/);
  assert.match(revealCase[0], /if \(revealed\) await logFired\(\);/, "reveal-handout logs unconditionally, even when the GM cancels the confirm dialog");

  const postCheckCase = handler.match(/case "post-check": \{[\s\S]*?\n {6}\}/);
  assert.ok(postCheckCase, "post-check case is missing");
  const tryBlock = postCheckCase[0].match(/try \{[\s\S]*?\} catch/);
  assert.ok(tryBlock, "post-check has no try/catch around the chat post");
  assert.match(tryBlock[0], /logFired\(\)/, "post-check's logFired call is not inside the try block, so a failed post would still log as if it succeeded");
});

test("revealHandout now signals success/failure so a caller can gate logging on it, and every existing early return was updated to match", () => {
  const revealFn = src.match(/async function revealHandout\(handoutId, scene, users\) \{[\s\S]*?\n\}/);
  assert.ok(revealFn, "revealHandout is missing");
  // Every bail-out path returns false now, not bare `return;` -- a caller
  // checking `if (revealed)` must see a real boolean on every path, not
  // undefined on some and true on others.
  assert.doesNotMatch(revealFn[0], /return;(?!\s*\/)/, "revealHandout still has a bare `return;` on some path instead of an explicit boolean");
  assert.match(revealFn[0], /return false;/);
  assert.match(revealFn[0], /return true;/);
});

test("every trigger press logs through triggerLogSubject, scoped by beat AND trigger id", () => {
  assert.match(src, /triggerLogSubject,?\s*\n/, "triggerLogSubject is no longer imported");
  const handler = fn("onFireTrigger");
  assert.match(handler, /subject:\s*triggerLogSubject\(beatId, triggerId\)/);
});

test("#onRecordChoice mirrors #onRecordOutcome's own toggle-and-log shape, keyed by choiceLogSubject", () => {
  assert.match(src, /choiceLogSubject,?\s*\n/, "choiceLogSubject is no longer imported");
  const handler = fn("onRecordChoice");
  assert.ok(handler, "#onRecordChoice is missing from scene-runner.mjs");
  assert.match(handler, /ticked\[beatId\]\?\.choice === optionId/, "clicking the same option again no longer toggles it off");
  assert.match(handler, /ticked\[beatId\] = \{ at: new Date\(\)\.toISOString\(\), choice: optionId \}/);
  assert.match(handler, /subject:\s*choiceLogSubject\(beatId, optionId\)/);
  assert.match(handler, /await writeRunState\(briefId, \{ \.\.\.state, ticked \}\);/);
  assert.match(handler, /this\.render\(\{\}\);/);
});

test("beat.hbs renders decoratedText/decoratedReadAloud as trusted HTML (triple-stache), not re-escaped plain text", () => {
  assert.match(beatHbs, /\{\{\{decoratedText\}\}\}/, "beat-text no longer renders the decorated (trigger-chip-spliced) field");
  assert.doesNotMatch(beatHbs, /\{\{text\}\}/, "beat.hbs still renders the raw, undecorated {{text}} somewhere");
  assert.match(beatHbs, /\{\{#if decoratedReadAloud\}\}<div class="bi-runner__read">\{\{\{decoratedReadAloud\}\}\}<\/div>\{\{\/if\}\}/);
});

test("beat.hbs renders a choicePoint as a distinct block with per-option recordChoice buttons and an invented-option hint", () => {
  const block = beatHbs.match(/\{\{#if choicePoint\}\}[\s\S]*?<\/div>\s*\{\{\/if\}\}/);
  assert.ok(block, "no choicePoint block in beat.hbs");
  assert.match(block[0], /class="bi-runner__choice"/);
  assert.match(block[0], /\{\{choicePoint\.label\}\}/);
  assert.match(block[0], /\{\{#each choicePoint\.options\}\}/);
  assert.match(block[0], /data-action="recordChoice"/);
  assert.match(block[0], /data-beat-id="\{\{\.\.\/id\}\}"/);
  assert.match(block[0], /data-option-id="\{\{id\}\}"/);
  assert.match(block[0], /bi-runner__choice-option--picked/);
  assert.match(block[0], /\{\{#if choicePoint\.allowsInventedOption\}\}/);
  assert.match(block[0], /BLANKINHERITANCE\.Runner\.ChoiceInvented/);
});

test("beat.hbs still has balanced Handlebars blocks after the decorated-text and choicePoint changes", () => {
  const withoutComments = beatHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `beat.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test("ChoiceInvented has real, non-empty localized text", () => {
  assert.match(en.BLANKINHERITANCE.Runner.ChoiceInvented, /\S/);
});

test("REAL DATA: every triggers[] id referenced inline in an authored scene brief resolves, and vice versa", async () => {
  const { referencedTriggerIds } = await import("../module/blank-inheritance/scripts/core/inline-triggers.mjs");
  const briefsDir = path.join(repoRoot, "data", "scene-briefs");
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(briefsDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const brief = JSON.parse(readFileSync(path.join(briefsDir, file), "utf8"));
    for (const beat of brief.beats ?? []) {
      const referenced = new Set(referencedTriggerIds(beat));
      const authored = new Set((beat.triggers ?? []).map((t) => t.id));
      for (const id of referenced) {
        assert.ok(authored.has(id), `${file}#${beat.id} text/readAloud references <trig id="${id}"/> but triggers[] doesn't define it`);
      }
      for (const id of authored) {
        assert.ok(referenced.has(id), `${file}#${beat.id} authors trigger "${id}" but no <trig id="${id}"/> token places it in text/readAloud (dead data)`);
      }
    }
  }
});
