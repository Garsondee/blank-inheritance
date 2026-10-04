// Tier 3 — the Close Scene dialogue's three verdicts, and the layout
// guarantee that the rebuild exists to provide.
//
// REWRITTEN 2026-09-22. This file used to pin the "row of 0-10 buttons"
// feature of 2026-09-19 end to end. That feature was cut, because it is what
// broke the dialogue: Ingram hit it live on a five-prompt scene and could not
// finish closing it — "Scene close UI has grown so massive I cannot
// comprehend it and I cannot even scroll down to hit accept. This is a
// dangerous error since it would kill a session."
//
// So the contract this file pins now is the replacement, in Ingram's own
// terms: three big buttons at the bottom (Panic! / Note / Positive), each one
// a complete close, and A VERDICT ROW THAT CANNOT BE PUSHED OFF SCREEN. The
// last of those is the regression test for the reported bug, and it is
// structural rather than visual on purpose — a screenshot proves one window
// size, a capped grid with one scrolling child proves all of them.
//
// scene-runner.mjs and scene-close.mjs destructure `foundry.applications.api`
// at module scope, so — matching every other tier3-*-contract.test.mjs in
// this project — this reads the real source rather than mounting the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const runnerSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const closeSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-close.mjs"), "utf8");
const closeHbs = readFileSync(path.join(moduleRoot, "templates", "console", "scene-close.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "scene-brief.schema.json"), "utf8"));

/**
 * Source with its comments removed. Every "X is gone" assertion below has to
 * read this rather than the raw file: the rebuild's own headers name what was
 * cut and why, deliberately and at length, and a test that cannot tell a
 * historical note from live code would force those explanations to be deleted
 * to stay green -- which is the opposite of what this project wants.
 */
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const closeCode = codeOnly(closeSrc);
const closeMarkup = closeHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");

/** The rule the whole rebuild turns on. Asserted here so a future "just one more field" edit fails a test instead of failing a session. */
test("REGRESSION (2026-09-22, found live): the verdict row is the last thing in the body, and nothing above it can grow the dialogue past its cap", () => {
  // Three rows, middle one collapsible, hard max-height: the verdict footer
  // physically cannot be displaced.
  const body = css.match(/^\.bi-scene-close__body \{[^}]*\}/m);
  assert.ok(body, ".bi-scene-close__body has no rule at all");
  assert.match(body[0], /display:\s*grid/, "the body must be a grid, so its rows can be capped independently");
  assert.match(body[0], /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/, "head / columns / verdicts, with only the middle row allowed to shrink");
  assert.match(body[0], /max-height:/, "without a max-height the body grows until the verdict row leaves the screen -- the exact reported bug");
  // Found while measuring the rebuilt layout, 2026-09-22: a viewport-relative
  // cap with no floor collapses the dialogue to its head and its verdict row
  // whenever `vh` resolves to something degenerate (a 0-height viewport, as a
  // headless render reports). The buttons survive and the scene becomes
  // unreadable, which is worse than the bug this rebuild fixed.
  const maxHeight = body[0].match(/max-height:\s*([^;]+);/)?.[1] ?? "";
  if (/\dvh/.test(maxHeight)) {
    assert.match(maxHeight, /^max\(\s*\d+px\s*,/, `max-height "${maxHeight}" scales with the viewport but has no pixel floor -- wrap it in max(<floor>px, ...)`);
  }

  // Exactly one scrolling element, and it is the read-only recap.
  const recap = css.match(/^\.bi-scene-close__recap \{[^}]*\}/m);
  assert.ok(recap, ".bi-scene-close__recap has no rule");
  assert.match(recap[0], /overflow-y:\s*auto/, "the recap must scroll inside itself rather than pushing the page down");
  assert.match(recap[0], /min-height:\s*0/, "without min-height:0 a grid/flex child refuses to shrink and scrolls its parent instead");

  // The template's own order backs the grid up.
  const verdictsAt = closeHbs.indexOf('class="bi-scene-close__verdicts"');
  const columnsAt = closeHbs.indexOf('class="bi-scene-close__columns"');
  assert.ok(columnsAt > -1 && verdictsAt > columnsAt, "the verdict footer must come after the two columns in the template");
});

test("the dialogue asks for a WIDE window, not a tall one -- Ingram's own correction", () => {
  const position = closeSrc.match(/position:\s*\{[^}]*\}/);
  assert.ok(position, "DEFAULT_OPTIONS.position is missing");
  const width = Number(position[0].match(/width:\s*(\d+)/)?.[1]);
  assert.ok(width >= 760, `the close dialogue is ${width}px wide; the old 420px single column is what made it unreadably tall`);
  assert.match(closeHbs, /class="bi-scene-close__columns"/, "the body is not split into columns at all");
  assert.match(css, /\.bi-scene-close__columns \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax/, "the columns are not actually side by side");
});

test("all three verdicts are rendered from core's own list, each with its own explanation, and NONE of them is ever disabled", () => {
  assert.match(closeSrc, /import \{[^}]*VERDICT_OPTIONS[^}]*\} from "\.\.\/core\/scene-close\.mjs"/, "VERDICT_OPTIONS is no longer imported -- the buttons would be hand-written");
  const prepareContext = closeSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(prepareContext, "_prepareContext is missing from the SceneCloseDialogue class");
  assert.match(prepareContext[0], /verdicts:\s*VERDICT_OPTIONS\.map\(/, "_prepareContext does not pass the real verdict list to the template");
  // Each button's colour modifier is a literal class in the template, gated
  // on a precomputed boolean -- the idiom runner/beat.hbs and
  // stage/banner.hbs already use, so tier0-architecture.test.mjs's class
  // lint can actually see it. A concatenated `--{{id}}` would render
  // unstyled and pass silently.
  for (const flag of ["isPanic", "isNote", "isPositive"]) {
    assert.match(prepareContext[0], new RegExp(flag + ":"), `_prepareContext does not precompute ${flag}`);
  }
  for (const modifier of ["panic", "note", "positive"]) {
    assert.ok(closeMarkup.includes(`bi-scene-close__verdict--${modifier}`), `the ${modifier} button has no literal modifier class`);
  }

  assert.match(closeHbs, /\{\{#each verdicts\}\}/, "the verdict row is not generated from the list");
  assert.match(closeHbs, /data-action="verdict"/);
  assert.match(closeHbs, /data-verdict-id="\{\{this\.id\}\}"/, "a verdict button never names which verdict it is");
  assert.match(closeHbs, /\{\{localize this\.subLabelKey\}\}/, "each button's own one-line explanation is missing");

  // The old dialogue's Confirm button was disabled until two dropdowns were
  // set. A disabled control is exactly how a GM gets stranded.
  assert.doesNotMatch(closeMarkup, /disabled/, "nothing in the close dialogue may ever render disabled");
  assert.doesNotMatch(closeCode, /canConfirm/, "the canConfirm gate is gone -- a button that exists here must always work");
});

test("pressing a verdict IS the confirm: one handler, one press, and the dialogue closes", () => {
  assert.match(closeSrc, /verdict:\s*SceneCloseDialogue\.#onVerdict/, "verdict is not wired as a DEFAULT_OPTIONS action");
  const handler = closeSrc.match(/static async #onVerdict\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(handler, "#onVerdict is missing");
  assert.match(handler[0], /target\.dataset\.verdictId/);
  assert.match(handler[0], /canCloseScene\(\{ verdict \}\)/, "the pressed verdict is not validated against core's own list before it writes");
  assert.match(handler[0], /confirmSceneClosure\(/, "the press does not actually close the scene");
  assert.match(handler[0], /this\.close\(\)/, "the dialogue does not dismiss itself, so a GM still has to find the X");
  assert.doesNotMatch(closeHbs, /data-action="confirm"/, "a separate Confirm button survives -- that is the control that went off-screen");
});

test("a flagged closure records the scene's own prompts as a real review agenda on the log entry, not a score", () => {
  const confirmFn = closeSrc.match(/export async function confirmSceneClosure\([\s\S]*?\n\}/);
  assert.ok(confirmFn, "confirmSceneClosure is missing");
  assert.match(confirmFn[0], /summarizeClosure\(\{ verdict, ending, carriesForward, notes, reactionPrompts \}\)/, "confirmSceneClosure no longer forwards everything the verdict needs into core");
  assert.match(confirmFn[0], /review:\s*result\.review/, "the review agenda is never attached to the session-log entry, so a flagged scene reaches the review with no questions");
  assert.match(confirmFn[0], /delta\.reviewFlags/, "the review counter never moves -- Law 15 wants a closure to change something real");
});

test("both scene-runner.mjs call sites that open the close dialogue pass the leaving/current brief's own reactionPrompts, which are now the review agenda", () => {
  const cueSceneFn = runnerSrc.match(/static async #onCueScene\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(cueSceneFn, "#onCueScene is missing from scene-runner.mjs");
  assert.match(cueSceneFn[0], /reactionPrompts:\s*brief\?\.reactionPrompts/, "closing the LEAVING scene no longer passes its own reactionPrompts");

  const closeSceneFn = runnerSrc.match(/static #onCloseScene\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(closeSceneFn, "#onCloseScene is missing from scene-runner.mjs");
  assert.match(closeSceneFn[0], /reactionPrompts:\s*this\._scene\?\.brief\?\.reactionPrompts/, "the explicit Close Scene button no longer passes the current brief's reactionPrompts");

  assert.match(closeSrc, /setContext\(\{ briefRef = null, title = null, mode = null, reactionPrompts = \[\](?:, writeDown = \[\])? \}/, "setContext no longer accepts reactionPrompts");
  assert.match(closeSrc, /export function openSceneCloseDialogue\(\{ briefRef = null, title = null, mode = null, reactionPrompts = \[\](?:, writeDown = \[\])? \}/, "openSceneCloseDialogue no longer accepts/forwards reactionPrompts");
});

test("the 0-10 rating grid is GONE, not hidden behind a flag -- it is what made the dialogue unusable", () => {
  for (const gone of ["setReactionScore", "REACTION_SCALE", "reactionScores", "review-btn", "review-scale"]) {
    assert.ok(!closeCode.includes(gone), `foundry/scene-close.mjs still references "${gone}" in live code`);
    assert.ok(!closeMarkup.includes(gone), `scene-close.hbs still references "${gone}" in live markup`);
  }
  assert.ok(!("ReviewLabel" in en.BLANKINHERITANCE.SceneClose), "a dead ReviewLabel key survives in en.json");
  assert.ok(!("ReviewHint" in en.BLANKINHERITANCE.SceneClose), "a dead ReviewHint key survives in en.json");
});

test("the cost picker is GONE too, along with the two mocked counters its dead options fed", () => {
  for (const gone of ["costOptionsFor", "COST_OPTIONS", "setCost", "anchorViolations", "casualties"]) {
    assert.ok(!closeCode.includes(gone), `foundry/scene-close.mjs still references "${gone}" in live code, and it named a CUT system`);
  }
  assert.ok(!closeMarkup.includes("setCost"), "the cost chip row survives in the template");
  assert.ok(!("Cost" in en.BLANKINHERITANCE.SceneClose), "the whole SceneClose.Cost key block should be gone");
  assert.match(en.BLANKINHERITANCE.SceneClose.Counters, /review/i, "the footer counter should report the review pile, not Anchors violated");
});

test("scene-close.hbs stays a balanced, small template -- the whole point is that it fits on one screen", () => {
  const withoutComments = closeHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `scene-close.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);

  // Nine interactive targets: 4 endings + 1 carries-forward + 1 notes box +
  // 3 verdicts. The old form had roughly sixty-six.
  const buttonLoops = (withoutComments.match(/\{\{#each (endings|verdicts)\}\}/g) ?? []).length;
  assert.equal(buttonLoops, 2, "exactly two generated button rows: the four endings and the three verdicts");
  assert.ok(!/\{\{#each this\.scale\}\}/.test(withoutComments), "a nested per-row button scale is back -- that is the barrage");
});

test("every optional field says so out loud, so a flustered GM knows they can skip all of it", () => {
  assert.equal(typeof en.BLANKINHERITANCE.SceneClose.Optional, "string");
  const optionalMarkers = (closeHbs.match(/BLANKINHERITANCE\.SceneClose\.Optional/g) ?? []).length;
  assert.ok(optionalMarkers >= 2, "the ending row and the notes box should both be marked optional");
});

test("the verdict buttons read as a severity scale in CSS, using the shared --sr-* tokens rather than one-off colours", () => {
  assert.match(css, /\.bi-scene-close__verdict--panic \{[^}]*var\(--sr-accent\)/);
  assert.match(css, /\.bi-scene-close__verdict--note \{[^}]*var\(--sr-warn\)/);
  assert.match(css, /\.bi-scene-close__verdict--positive \{[^}]*var\(--sr-good\)/);
  // Filled --sr-warn/--sr-good surfaces need their own readable ink, defined
  // per theme -- this is the first place in the file to use them as a
  // background rather than as text.
  for (const token of ["--sr-warn-ink", "--sr-good-ink"]) {
    assert.ok((css.match(new RegExp(token + ":", "g")) ?? []).length >= 2, `${token} must be defined in BOTH the light and dark token blocks`);
  }
});

test("en.json carries every localisation key the three verdicts introduced", () => {
  const v = en.BLANKINHERITANCE.SceneClose.Verdict;
  assert.ok(v, "SceneClose.Verdict is missing entirely");
  for (const key of ["Panic", "PanicSub", "Note", "NoteSub", "Positive", "PositiveSub"]) {
    assert.equal(typeof v[key], "string", `SceneClose.Verdict.${key} is missing`);
    assert.ok(v[key].length > 0);
  }
  assert.match(v.Panic, /!/, "Ingram's own label for it is \"Panic!\"");
  assert.equal(typeof en.BLANKINHERITANCE.SceneClose.ConfirmedFlagged, "string", "a flagged close should say so in its notification, not look identical to a clean one");
});

test("scene-brief.schema.json documents reactionPrompts as the review AGENDA now, not a rating scale", () => {
  const field = schema.properties.reactionPrompts;
  assert.ok(field, "scene-brief.schema.json no longer defines reactionPrompts");
  assert.equal(field.type, "array");
  const item = field.items;
  assert.deepEqual(new Set(item.required), new Set(["id", "text"]));
  assert.match(field.description, /review/i, "the schema should say these are now the agenda for the session review");
  assert.match(field.description, /writeDown/, "the schema should say how this differs from outro.writeDown, or a future author will duplicate one as the other");
  assert.doesNotMatch(field.description, /renders each as a row of 0-10 buttons/, "the schema still describes the retired rating UI as live behaviour");
});
