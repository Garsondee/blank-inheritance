// Tier 3 — the induction terminal's UI pass (2026-09-25), checked at source level, same approach as the
// other tier3 contract tests: every button in every page template reaches a real handler, saved forms
// are wired the way core/induction-draft.mjs assumes (offered, never silently resumed, never written to
// the server, cleared on confirm), Review's Change links point at real steps, the "what's missing" line
// can be updated without a render, and the portrait crop reads pointer movement in the terminal's own
// pixels. The pure logic behind all of this is in test/tier1-induction-flow.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STEPS } from "../module/blank-inheritance/scripts/core/induction-flow.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOD = path.join(ROOT, "module/blank-inheritance");
// Normalised to LF: some module files are CRLF on this machine, and the regexes below read lines.
const read = (rel) => fs.readFileSync(path.join(MOD, rel), "utf8").replace(/\r\n/g, "\n");
const terminal = read("scripts/foundry/induction-terminal.mjs");
const TEMPLATE_DIR = "templates/induction";
const templates = Object.fromEntries(
  fs.readdirSync(path.join(MOD, TEMPLATE_DIR)).filter((f) => f.endsWith(".hbs")).map((f) => [f, read(`${TEMPLATE_DIR}/${f}`)])
);
const lang = JSON.parse(read("lang/en.json")).BLANKINHERITANCE.Induction;

const actionsBlock = terminal.match(/actions: \{([\s\S]*?)\n    \}/)?.[1] ?? "";
const registeredActions = new Set([...actionsBlock.matchAll(/^\s*(\w+): InductionTerminal\.#(\w+),?$/gm)].map((m) => m[1]));

test("every data-action in every induction page reaches a registered handler", () => {
  assert.ok(registeredActions.size > 20, "the actions map was found");
  for (const [file, source] of Object.entries(templates)) {
    for (const [, action] of source.matchAll(/data-action="(\w+)"/g)) {
      assert.ok(registeredActions.has(action), `${file} uses data-action="${action}" with no handler`);
    }
  }
});

test("every registered handler is actually defined", () => {
  for (const [, , method] of actionsBlock.matchAll(/^\s*(\w+): InductionTerminal\.#(\w+),?$/gm)) {
    assert.match(terminal, new RegExp(`static async #${method}\\(`), `#${method} is registered but never defined`);
  }
});

test("the default state is defined once and used by both the class field and the reset", () => {
  const defs = terminal.match(/agreement: \{ signed: false, signedAt: null, secondsOnPage: null, furthestRead: null \}/g) ?? [];
  assert.equal(defs.length, 1, "one definition of the blank form, not a hand-synced copy");
  assert.match(terminal, /function freshInductionState\(\) \{\n  return \{\n    page: 1,/);
  assert.match(terminal, /\n  state = freshInductionState\(\);/);
  const mount = terminal.match(/export function mountInductionTerminal\(\) \{[\s\S]*?\n}\n/)?.[0] ?? "";
  assert.match(mount, /active\.state = freshInductionState\(\);/);
});

test("saved forms: kept in the player's own browser (client scope), never in Configure Settings", () => {
  const reg = terminal.match(/export function registerInductionSettings\(\)[\s\S]*?\n}\n/)?.[0] ?? "";
  const drafts = reg.match(/game\.settings\.register\(MODULE_ID, SETTING_DRAFTS, \{[\s\S]*?\}\);/)?.[0] ?? "";
  assert.match(drafts, /scope: "client"/);
  assert.match(drafts, /config: false/);
  assert.match(drafts, /type: Object/);
});

test("saved forms: offered on Page 1 on every open, and never overwritten while on offer", () => {
  const mount = terminal.match(/export function mountInductionTerminal\(\) \{[\s\S]*?\n}\n/)?.[0] ?? "";
  assert.match(mount, /active\._savedDraft = readSavedDraft\(\);/);
  const save = terminal.match(/  #saveDraftNow\(\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(save, /if \(this\._savedDraft\) return;/, "the blank form behind an offered draft must never be saved over it");
  assert.match(save, /if \(hasProgress\(this\.state\)\) writeStoredDraft\(serializeDraft\(this\.state\)\);/);
  assert.match(terminal, /static async #onBegin[\s\S]{0,200}if \(this\._savedDraft\) return;/, "Begin can't start a second form over one on offer");
});

test("saved forms: Page 1 shows Continue and Start Again, and Start Again asks before throwing anything away", () => {
  const page1 = templates["page1-orientation.hbs"];
  for (const action of ["resumeDraft", "startAgain", "keepDraft", "discardDraft"]) {
    assert.match(page1, new RegExp(`data-action="${action}"`));
  }
  const discard = terminal.match(/static async #onDiscardDraft[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(discard, /if \(!this\._savedDraft \|\| !this\._confirmingDiscard\) return;/, "one click never throws a form away");
  assert.match(discard, /writeStoredDraft\(null\);/);
});

test("saved forms: saved as the player types and on close, and cleared once the character exists", () => {
  const prompt = terminal.match(/  #bindPromptFields\(\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.equal((prompt.match(/this\.#saveDraftSoon\(\);/g) ?? []).length, 2, "typing and suggestion clicks both save");
  assert.match(terminal, /_onClose\(options\) \{\n    \/\/[^\n]*\n    if \(this\._draftTimer\) this\.#saveDraftNow\(\);/);
  assert.match(terminal, /this\.state\.review\.createdActorId = actor\.id;\n      writeStoredDraft\(null\);/);
});

test("every string the new pieces use exists", () => {
  for (const key of ["Title", "Unnamed", "Where", "When", "Continue", "StartAgain", "DiscardWarning", "Keep", "Discard"]) {
    assert.equal(typeof lang.Resume[key], "string", `Resume.${key}`);
  }
  assert.match(lang.Resume.Where, /\{n\}[\s\S]*\{total\}[\s\S]*\{label\}/);
  for (const key of ["Photo", "StatsLabel", "Change", "ChangeWhat", "LeftBlank"]) assert.equal(typeof lang.Page9[key], "string", `Page9.${key}`);
  assert.match(lang.Page9.ChangeWhat, /\{what\}/);
  for (const key of ["ViewportLabel", "CropHint", "DropHint"]) assert.equal(typeof lang.Page6[key], "string", `Page6.${key}`);
});

test("Review: every Change jumps to a real step, and every step from Ancestry to Questions has one", () => {
  const review = templates["page9-review.hbs"];
  const targets = [...review.matchAll(/data-action="jumpToStep" data-step="(\w+)"/g)].map((m) => m[1]);
  const stepIds = new Set(STEPS.map(([id]) => String(id)));
  for (const target of targets) assert.ok(stepIds.has(target), `Change points at unknown step ${target}`);
  for (const step of ["2", "3", "4", "5", "6", "7", "8"]) assert.ok(targets.includes(step), `no Change back to step ${step}`);
  assert.ok(!targets.includes("agreement"), "the agreement is never re-opened");
});

test("Review: opens on the character -- photo, name, and the six attribute modifiers", () => {
  const review = templates["page9-review.hbs"];
  assert.match(review, /class="bi-induction__dossier"/);
  assert.match(review, /\{\{#if portraitPath\}\}<img src="\{\{portraitPath\}\}"/);
  assert.match(review, /\{\{#each attributeRows\}\}/);
  const context = terminal.match(/  async #page9Context\(\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(context, /attributeRows: this\.#abilityRows\(\),/);
  assert.match(context, /portraitPath: this\.state\.portrait\.path,/);
});

test("every page carries the \"what's missing\" line in the DOM, so it can change without a render", () => {
  for (const [file, source] of Object.entries(templates)) {
    assert.match(source, /<span class="bi-induction__blocker" role="status" data-induction-blocker \{\{#unless blocker\}\}hidden\{\{\/unless\}\}>\{\{blocker\}\}<\/span>/, file);
  }
  const sync = terminal.match(/  #syncFinishingBlocker\(\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(sync, /querySelector\("\[data-induction-blocker\]"\)/, "typing a name updates the line");
  assert.match(sync, /classList\.remove\("bi-induction__missing"\)/, "and takes Continue's mark off the field once it's filled");
  assert.match(read("styles/bi-components.css"), /\.bi-induction__blocker\[hidden\] \{ display: none; \}/);
});

test("portrait: a dropped photo takes the same path as a chosen one", () => {
  assert.match(templates["page6-portrait.hbs"], /<div class="bi-portrait" data-portrait-drop>/);
  const drop = terminal.match(/  #bindPortraitDrop\(zone\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(drop, /this\.#startPortraitCrop\(event\.dataTransfer\.files\?\.\[0\]\);/);
  assert.match(drop, /event\.stopPropagation\(\);/, "keeps the drop from Foundry's own document-level handling");
  assert.match(terminal, /async #onPortraitFileChosen\(fileInput\) \{[\s\S]{0,300}await this\.#startPortraitCrop\(file\);/);
});

test("portrait: a drag is read in the terminal's own pixels, divided by the CSS zoom big screens get", () => {
  const drag = terminal.match(/  #bindPortraitDrag\(viewport\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(drag, /const zoom = effectiveZoom\(viewport\) \|\| 1;/);
  assert.match(drag, /const dx = \(event\.clientX - lastX\) \/ zoom;/);
  assert.match(drag, /const dy = \(event\.clientY - lastY\) \/ zoom;/);
  assert.match(read("scripts/foundry/induction-agreement-view.mjs"), /export function effectiveZoom\(el\)/);
});

test("portrait: the crop box can be focused and worked from the keyboard", () => {
  assert.match(templates["page6-portrait.hbs"], /data-portrait-viewport tabindex="0" role="group" aria-label=/);
  const keys = terminal.match(/  #bindPortraitKeysAndWheel\(viewport\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) assert.match(keys, new RegExp(key));
  assert.match(keys, /addEventListener\("wheel"[\s\S]*\{ passive: false \}/, "the wheel can only zoom if it may preventDefault");
});

test("Continue is never greyed out on a page the player can finish; clicked early, it points at what's missing (GitHub #162)", () => {
  const pages = {
    "page2-ancestry.hbs": ["continueFromAncestry", "isAncestryChoiceComplete"],
    "page3-background.hbs": ["continueFromBackground", "isBackgroundChoiceComplete"],
    "page4-class.hbs": ["continueFromClass", "isClassChoiceComplete"],
    "page5-attributes.hbs": ["continueFromAttributes", "isFreeBoostsComplete"],
    "page7-finishing.hbs": ["continueFromFinishing", "isFinishingComplete"]
  };
  for (const [file, [action, check]] of Object.entries(pages)) {
    const button = templates[file].match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`))?.[0] ?? "";
    assert.ok(button, file + " has its Continue");
    assert.doesNotMatch(button, /disabled/, file + "'s Continue must stay clickable");
    const method = "#on" + action.charAt(0).toUpperCase() + action.slice(1);
    const start = terminal.indexOf("static async " + method + "(");
    const handler = start < 0 ? "" : terminal.slice(start, terminal.indexOf("\n  }\n", start));
    assert.ok(handler.includes("if (!" + check + "("), action + " checks its page");
    assert.ok(handler.includes(")) return this.#pointAtMissing();"), action + " points at what's missing");
  }
  // Confirm is the one real-world action: it stays disabled until Review is complete.
  assert.match(templates["page9-review.hbs"], /data-action="confirmCharacter" \{\{#unless isComplete\}\}disabled\{\{\/unless\}\}/);
});

test("pointing at what's missing: marked, explained right there, scrolled to, focused -- and never a smooth scroll that can stall", () => {
  const point = terminal.match(/  #pointAtMissing\(\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(point, /target\.classList\.add\("bi-induction__missing"\)/);
  assert.match(point, /note\.setAttribute\("role", "alert"\)/, "the reason is announced, not just drawn");
  assert.match(point, /note\.textContent = message;/);
  assert.match(point, /scrollIntoView\(/);
  assert.match(point, /focus\(\{ preventScroll: true \}\)/);
  assert.match(point, /document\.visibilityState === "hidden"/, "a smooth scroll needs animation frames a hidden page never gets");
  assert.match(point, /prefers-reduced-motion: reduce/);
  const first = terminal.match(/  #firstMissingElement\(\) \{[\s\S]*?\n  }\n/)?.[0] ?? "";
  for (const page of [2, 3, 4, 5, 7]) assert.match(first, new RegExp("case " + page + ":"), "page " + page + " knows its first missing thing");
  const css = read("styles/bi-components.css");
  assert.match(css, /\.bi-induction__missing \{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.bi-induction__missing \{ animation: none; \} \}/);
});
