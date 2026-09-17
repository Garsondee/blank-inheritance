// Tier 3 — the deck's contract with itself and with its stylesheet.
//
// The deck (design/visual-identity.md, "The deck") is one mounted panel drawn
// at an authored size and scaled whole. That only works if a handful of
// numbers that live in DIFFERENT files agree: the panel size in core and in
// the tokens, the module widths against the panel width, the orb's geometry
// against the needle's CSS, the kanji size against the 12px floor. Every
// assertion here pins a relationship, and several pin one that was found
// broken live on 2026-09-17.
//
// Needs no source trees; always runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DECK_REFERENCE } from "../module/blank-inheritance/scripts/core/deck-layout.mjs";
import { ORB_BEZEL, ORB_ENGRAVING, ORB_FACE, QUARTER_GLYPHS } from "../module/blank-inheritance/scripts/core/orb-geometry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const tokens = stripComments(readFileSync(path.join(moduleRoot, "styles", "bi-tokens.css"), "utf8"));
const componentsRaw = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const components = stripComments(componentsRaw);
const bridge = stripComments(readFileSync(path.join(moduleRoot, "styles", "bi-foundry-bridge.css"), "utf8"));
const deckAdapter = readFileSync(path.join(moduleRoot, "scripts", "foundry", "deck.mjs"), "utf8");
const commandBar = readFileSync(path.join(moduleRoot, "scripts", "foundry", "command-bar.mjs"), "utf8");

function px(name) {
  const m = tokens.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)px`));
  assert.ok(m, `bi-tokens.css no longer declares ${name} in px`);
  return Number(m[1]);
}

/**
 * The body of the first rule whose WHOLE selector is `selector` — anchored to
 * the start of a rule, so `.x[data-empty] .bi-orb__needle` is not mistaken
 * for `.bi-orb__needle`.
 */
function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no rule for ${selector}`);
  return m[1];
}

function percent(body, property) {
  const m = body.match(new RegExp(`(?:^|[;\\s])${property}:\\s*(-?\\d+(?:\\.\\d+)?)%`));
  assert.ok(m, `no ${property} percentage in rule`);
  return Number(m[1]);
}

/* ---------------------------------------------------------------- */
/*  The panel                                                        */
/* ---------------------------------------------------------------- */

test("core's DECK_REFERENCE and the tokens describe the same panel", () => {
  // deckFit scales by DECK_REFERENCE; the stylesheet draws at the tokens. If
  // they disagree, the panel is scaled for one size and drawn at another.
  assert.equal(px("--bi-deck-width"), DECK_REFERENCE.width);
  assert.equal(px("--bi-deck-height"), DECK_REFERENCE.faceplate);
  assert.equal(px("--bi-deck-crown"), DECK_REFERENCE.crown);
});

test("the five modules and two cheeks are symmetric and sum exactly to the panel width", () => {
  const sum = 2 * px("--bi-deck-cheek") + 2 * px("--bi-deck-outer") + 2 * px("--bi-deck-inner") + px("--bi-deck-spine");
  assert.equal(sum, px("--bi-deck-width"));
  const deck = rule(components, ".bi-deck");
  assert.match(deck, /grid-template-columns:\s*calc\(var\(--bi-deck-outer\)\s*\+\s*var\(--bi-deck-inner\)\)\s*var\(--bi-deck-spine\)\s*calc\(var\(--bi-deck-inner\)\s*\+\s*var\(--bi-deck-outer\)\)/,
    "the deck's columns are no longer outer+inner | spine | inner+outer — the mirror is broken");
});

test("the panel's row is pinned to its height, not sized by its tallest module (regression: 221px modules in a 196px panel)", () => {
  // FOUND LIVE 2026-09-17: with an auto row, a module whose content wanted
  // 221px silently grew the whole row, and the bottom row of skill keys and
  // every pill key hung off the bottom of the window.
  assert.match(rule(components, ".bi-deck"), /grid-template-rows:\s*minmax\(0,\s*1fr\)/);
  assert.match(rule(components, ".bi-deck__side"), /min-height:\s*0/);
  assert.match(rule(components, ".bi-deck__spine"), /min-height:\s*0/);
});

test("nothing on the deck scrolls — no overflow:auto/scroll in its styles, no scrollable parts", () => {
  const start = componentsRaw.indexOf("10. THE DECK");
  assert.ok(start >= 0, "could not find the deck's section in bi-components.css");
  const next = componentsRaw.slice(start).search(/\n\/\* =+\s*\n\s*11\./);
  const section = stripComments(next >= 0 ? componentsRaw.slice(start, start + next) : componentsRaw.slice(start));
  assert.doesNotMatch(section, /overflow(?:-[xy])?:\s*(?:auto|scroll)/, "a deck style scrolls — page it or put it on a selector instead");
  assert.doesNotMatch(commandBar, /scrollable\s*:/, "a deck part declares scrollable");

  const deckTemplates = path.join(moduleRoot, "templates", "console", "deck");
  for (const file of readdirSync(deckTemplates)) {
    const hbs = readFileSync(path.join(deckTemplates, file), "utf8");
    assert.doesNotMatch(hbs, /class="[^"]*\bbi-(?:checks|cast__rows|log__recent)\b/,
      `${file} uses a scrolling class from the retired bar`);
  }
});

test("every deck control that swaps state declares transition: none (regression: keys sliding between states)", () => {
  // Foundry's base <button> rule animates `all` over .5s, which made a
  // photographed two-state control visibly SLIDE (reported live 2026-09-17).
  for (const selector of [
    ".bi-deck-key", ".bi-deck-round", ".bi-deck-pill__cap", ".bi-deck-map", ".bi-deck-selector__knob",
    ".bi-deck-selector__knob::before", ".bi-orb__hit", ".bi-deck-cast__row", ".bi-deck-cast__card"
  ]) {
    assert.match(rule(components, selector), /transition:\s*none/, `${selector} can animate between states`);
  }
});

/* ---------------------------------------------------------------- */
/*  The central instrument                                           */
/* ---------------------------------------------------------------- */

test("the orb's foot stays inside the faceplate, and its rings nest (regression: the collar overhung the bottom edge)", () => {
  const collar = px("--bi-orb-collar");
  const bezel = px("--bi-orb-bezel");
  const glass = px("--bi-orb-glass");
  assert.ok(collar - px("--bi-deck-crown") <= px("--bi-deck-height") - 4,
    "the collar reaches the faceplate's bottom edge — raise the crown or shrink the collar");
  assert.ok(collar <= px("--bi-deck-spine"), "the collar is wider than the spine carrying it");
  assert.ok(glass < bezel && bezel < collar, "the glass, bezel and collar no longer nest");
});

test("the needle pivots at the printed face's pivot and ends just past its major ticks", () => {
  const pivotPct = (ORB_FACE.pivotY / ORB_FACE.size) * 100;
  assert.equal(percent(rule(components, ".bi-orb__pivot"), "top"), pivotPct);
  const needle = rule(components, ".bi-orb__needle");
  assert.equal(percent(needle, "bottom"), 100 - pivotPct);
  const reach = (percent(needle, "height") / 100) * ORB_FACE.size;
  const ticks = ORB_FACE.radius + ORB_FACE.majorTick;
  assert.ok(reach >= ticks && reach <= ticks + 6,
    `the needle reaches ${reach} face units; the ticks end at ${ticks} — it should just pass them, not sweep over the numbers`);
});

test("the bezel's kanji are at least 12px on screen, and sit between the glass and the arcs", () => {
  const bezel = px("--bi-orb-bezel");
  const glass = px("--bi-orb-glass");
  // design/visual-identity.md §1b: Japanese text never renders below 12px.
  assert.ok(ORB_BEZEL.glyphSize * (bezel / 100) >= 12, "the quarter kanji render under the 12px floor");
  const glassEdge = (glass / bezel) * 50;
  const arcsInner = ORB_BEZEL.size / 2 - ORB_BEZEL.thickness;
  assert.ok(ORB_BEZEL.glyphRadius - ORB_BEZEL.glyphSize / 2 >= glassEdge, "the kanji run under the glass");
  assert.ok(ORB_BEZEL.glyphRadius + ORB_BEZEL.glyphSize / 2 <= arcsInner, "the kanji run into the lit arcs");
  assert.equal(ORB_BEZEL.offset * 2 + ORB_BEZEL.size, 100, "the arcs are no longer centred in the bezel's viewBox");
  assert.deepEqual(Object.keys(QUARTER_GLYPHS), ["morning", "afternoon", "evening", "night"]);
});

test("the bezel's kanji are in the bundled fonts' vocabulary, so no player sees a fallback face or a missing glyph", () => {
  // tools/font-pipeline/fonts.json: UI-profile Japanese faces carry only the
  // kanji listed in uiKanji. 朝昼夕夜 were missing when the bezel first
  // rendered (2026-09-17) and only showed because this Windows machine had a
  // system Japanese font to fall back on.
  const manifest = JSON.parse(readFileSync(path.resolve(here, "..", "tools", "font-pipeline", "fonts.json"), "utf8"));
  for (const glyph of Object.values(QUARTER_GLYPHS)) {
    assert.ok(manifest.uiKanji.includes(glyph), `${glyph} is on the bezel but not in fonts.json uiKanji — add it and rebuild the fonts`);
  }
  const gothic = tokens.match(/--bi-font-gothic:\s*"([^"]+)"/);
  assert.ok(gothic, "could not read the first family of --bi-font-gothic");
  const family = manifest.families.find((f) => f.name === gothic[1]);
  assert.ok(family && family.profile !== "latin", `${gothic[1]} (the bezel's face) is not a bundled Japanese face`);
  assert.match(rule(components, ".bi-orb__glyph"), /font-family:\s*var\(--bi-font-gothic\)/);
});

test("the collar's engraved caption sits in the rim band — clear of the bezel, inside the collar's edge", () => {
  const bezelEdge = (px("--bi-orb-bezel") / px("--bi-orb-collar")) * 50;
  assert.ok(ORB_ENGRAVING.radius >= bezelEdge, "the caption's baseline runs under the bezel");
  assert.ok(ORB_ENGRAVING.radius + ORB_ENGRAVING.size <= 50, "the caption's letters run off the collar's edge");
  assert.ok(ORB_ENGRAVING.toDeg - ORB_ENGRAVING.fromDeg < 180, "the caption arc wraps past the collar's shoulders");
});

/* ---------------------------------------------------------------- */
/*  Living inside Foundry                                            */
/* ---------------------------------------------------------------- */

test("the fit writes the deck's full on-screen height to --bi-bar-height, which every reservation reads", () => {
  assert.match(deckAdapter, /setProperty\("--bi-bar-height", `\$\{fit\.crownHeight\}px`\)/,
    "fitDeck no longer publishes the crown height — the hotbar and side columns would sit behind the orb");
  assert.match(bridge, /#ui-bottom\s*\{[^}]*padding-bottom:\s*calc\(var\(--bi-bar-height\)/);
});

test("Foundry's roster and chat input stand on top of the deck instead of over it (regression: chat input over the right shoulder)", () => {
  // FOUND LIVE 2026-09-17: #chat-notifications' input sat on the deck's
  // right shoulder with the sidebar collapsed.
  const lifted = bridge.match(/([^{}]*#ui-left-column-1[^{}]*#ui-right-column-1[^{}]*)\{([^}]*)\}/);
  assert.ok(lifted, "no rule lifts #ui-left-column-1 and #ui-right-column-1 above the deck");
  assert.match(lifted[1], /:has\(#bi-command-bar\.bi-deck\)/, "the lift must only apply while the deck is mounted");
  assert.match(lifted[2], /padding-bottom:\s*calc\(var\(--bi-bar-height\)\s*\/\s*var\(--ui-scale/,
    "the lift must be the deck's height, divided back into the scaled columns' own coordinates");
});

test("the fit reserves the sidebar, which runs the full height of the screen", () => {
  assert.match(deckAdapter, /getElementById\("sidebar"\)/);
  assert.match(deckAdapter, /rightReserve/);
});
