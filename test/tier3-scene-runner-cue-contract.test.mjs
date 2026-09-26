// Tier 3 — the Scene Runner's top-menu redesign, 2026-09-19.
//
// Found live (Ingram, running Kit Issue): "the scene runner is tucked up the
// top left corner... needs a fully featured menu system at the top which
// doesn't scroll." Three concrete, confirmed sub-gaps this closes:
//
//   1. Picking a scene from the running order only ever loaded its script —
//      moving the table there was a SEPARATE, undiscoverable click on that
//      brief's own backdrop thumbnail, which only appeared after the first
//      click. #onCueScene merges both into one action.
//   2. Close Scene lived at the very bottom of a long scrollable document.
//      It is now a real, fixed Tier-1 button in the header (Law 7).
//   3. Summon required scrolling into the document and opening a fold. It
//      now has a one-tap entry point in the same fixed row.
//
// scene-runner.mjs and panel.hbs are read as source/markup rather than
// mounted, matching every other tier3-*-contract.test.mjs in this project
// (ApplicationV2 destructures foundry.applications.api at module scope).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const panel = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

test("picking a scene from the running order both loads its brief AND cues its own backdrop, in one action", () => {
  assert.doesNotMatch(src, /pickScene:\s*SceneRunner\.#on/, "the old two-step pickScene action is still wired");
  assert.match(src, /cueScene:\s*SceneRunner\.#onCueScene/, "#onCueScene is not wired as the cueScene action");

  const fn = src.match(/static async #onCueScene\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onCueScene is missing from scene-runner.mjs");
  assert.match(fn[0], /SETTING_BRIEF, briefId/, "no longer switches which brief is loaded");
  assert.match(fn[0], /backdropsFor\(briefId\)/, "no longer resolves the target brief's own built backdrop");
  assert.match(fn[0], /needsTravel\(fromRef, toRef\)/, "no longer checks whether the crossing needs the map ritual");
  assert.match(fn[0], /runTravelSequence\(fromRef, toRef, targetSceneId\)/, "no longer drives the real SCENE -> MAP -> SCENE sequence");
  assert.match(fn[0], /shouldOfferClose\(runStateFor\(leaving\)\)/, "no longer offers the scene-close dialogue when leaving a run scene — doctrine §10.3a");
});

test("the running order's own buttons call cueScene, not the old pickScene", () => {
  const sceneButton = panel.match(/<button type="button" class="bi-runner__scene"[\s\S]*?<\/button>/);
  assert.ok(sceneButton, "the running-order button markup is missing from panel.hbs");
  assert.match(sceneButton[0], /data-action="cueScene"/, "the running order still points at the old two-step action");
});

test("Close Scene and Summon are real Tier-1 buttons in the fixed header, not inside the scrollable body", () => {
  const head = panel.match(/<header class="bi-runner__head">[\s\S]*?<\/header>/);
  assert.ok(head, "the header block is missing from panel.hbs");
  assert.match(head[0], /class="bi-runner__tier1-btn bi-runner__tier1-btn--close"[\s\S]*?data-action="closeScene"/, "Close Scene is no longer a Tier-1 header button");
  assert.match(head[0], /data-action="jumpToSummon"/, "Summon's one-tap header entry point is gone");

  // And the OLD locations are actually gone, not merely duplicated -- a
  // closebar at the bottom of the scroll AND a new header button would mean
  // two ways to do the same thing, which doctrine explicitly rejects.
  assert.doesNotMatch(panel, /bi-runner__closebar/, "the old bottom-of-scroll closebar is still in panel.hbs");
});

test("jumpToSummon opens the summon fold and scrolls it into view", () => {
  assert.match(src, /jumpToSummon:\s*SceneRunner\.#onJumpToSummon/, "jumpToSummon is not wired as an action");
  const fn = src.match(/static #onJumpToSummon\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onJumpToSummon is missing from scene-runner.mjs");
  assert.match(fn[0], /data-section="summon"/);
  assert.match(fn[0], /\.open = true/);
  assert.match(fn[0], /scrollIntoView/);
});

test("the Palette is demoted to a small, icon-only, visually secondary control at the end of the Tier-1 row", () => {
  const tier1 = panel.match(/<div class="bi-runner__tier1">[\s\S]*?<\/div>/);
  assert.ok(tier1, "the Tier-1 row is missing from panel.hbs");
  assert.match(tier1[0], /class="bi-runner__tier1-palette"/, "the Palette is no longer styled as the row's secondary control");
  // Icon-only: no visible text label sitting next to the icon inside the
  // button (the old version rendered the localized label inline).
  const paletteBtn = tier1[0].match(/<button type="button" class="bi-runner__tier1-palette"[\s\S]*?<\/button>/);
  assert.ok(paletteBtn);
  assert.doesNotMatch(paletteBtn[0], /Runner\.Palette"\}\}\s*<\/button>|>\{\{localize "BLANKINHERITANCE\.Runner\.Palette"\}\}</, "the Palette button still prints its label inline instead of icon-only");
});

test("every new Tier-1 class is real, styled CSS — not just markup", () => {
  for (const cls of [".bi-runner__tier1", ".bi-runner__tier1-btn", ".bi-runner__tier1-btn--close", ".bi-runner__tier1-palette"]) {
    assert.match(css, new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{|" + cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[,{]"), `${cls} has no rule in bi-components.css`);
  }
});

test("Scene Goals and Entering the Scene are the real, localized section labels now", () => {
  assert.equal(en.BLANKINHERITANCE.Runner.Goal, "Scene Goals");
  assert.equal(en.BLANKINHERITANCE.Runner.Intro, "Entering the Scene");
});

test("the intro fold renders a landmark and a held-in-reserve detail when a brief authors them", () => {
  const introFold = panel.match(/data-section="intro"[\s\S]*?<\/details>/);
  assert.ok(introFold, "the intro fold is missing from panel.hbs");
  assert.match(introFold[0], /intro\.landmark/, "the landmark field is never rendered");
  assert.match(introFold[0], /intro\.holdInReserve/, "the held-in-reserve field is never rendered");
  // Held back really means held back: a second, nested, closed-by-default
  // <details> is the actual mechanism, not just a paragraph with a label.
  assert.match(introFold[0], /<details class="bi-runner__reserve">/, "holdInReserve is not gated behind its own closed fold");
});

test("the opening is open whenever it is needed -- before anything has happened -- and the ending once every required beat is done", () => {
  // 2026-09-19 made "Entering the Scene" a headline section, open by default.
  // 2026-09-24 keeps that for the moment it matters (nothing marked yet) and
  // folds it to one line once the scene is running, so it stops pushing the
  // running order down; the ending does the mirror image. A GM's own press
  // on either overrides the phase for the rest of that scene.
  assert.match(src, /introOpen:\s*view\.bookends\.intro \?\? phase === "opening"/);
  assert.match(src, /outroOpen:\s*view\.bookends\.outro \?\? phase === "ending"/);
  assert.match(panel, /data-action="toggleBookend" data-section="intro"/);
  assert.match(panel, /data-action="toggleBookend" data-section="outro"/);
});

test("the outro fold renders the transition's mechanism, line, and a scatter-risk warning when authored", () => {
  const outroFold = panel.match(/data-section="outro"[\s\S]*?<\/details>/);
  assert.ok(outroFold, "the outro fold is missing from panel.hbs");
  assert.match(outroFold[0], /outro\.transition\.mechanism/, "the transition's mechanism is never rendered");
  assert.match(outroFold[0], /outro\.transition\.line/, "the transition's own sayable line is never rendered");
  assert.match(outroFold[0], /outro\.transition\.scatterRisk/, "the scatter-risk flag is never checked");
  assert.match(outroFold[0], /bi-runner__transition--scatter/, "there is no visual distinction for a transition that could split the party");
});
