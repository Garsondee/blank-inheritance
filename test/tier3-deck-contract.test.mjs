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
const directorBar = readFileSync(path.join(moduleRoot, "scripts", "foundry", "director-bar.mjs"), "utf8");
const sceneRunnerAdapter = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const deckDirectorTemplate = readFileSync(path.join(moduleRoot, "templates", "console", "deck", "deck-director.hbs"), "utf8");
const entry = readFileSync(path.join(moduleRoot, "scripts", "blank-inheritance.mjs"), "utf8");

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

test("each kanji sits on its own solid backing plate, generously bigger than the glyph itself (regression: the bare glyph crossed an arc/collar seam)", () => {
  // FOUND LIVE 2026-09-17, against the real server: a bare glyph with no
  // backing sits directly on whatever the bezel ring is doing at that exact
  // point, and the collar's own edge bleeding through right at the ring's
  // top crossed straight through a character. One flat plate under it fixes
  // that regardless of the exact seam, so this only checks the plate is
  // real and big enough to matter — not the tight glass/arc margins above,
  // which are about the bare glyph and are deliberately not reapplied here.
  assert.ok(
    ORB_BEZEL.glyphBackingRadius > ORB_BEZEL.glyphSize / 2,
    "the backing plate is no bigger than the glyph's own bounding box — it would not cover the seam"
  );
  assert.ok(
    ORB_BEZEL.glyphBackingRadius < ORB_BEZEL.glyphRadius,
    "the backing plate is big enough to reach the bezel's own centre — it has grown past a small plate"
  );

  const orbTemplate = readFileSync(
    path.join(moduleRoot, "templates", "console", "deck", "deck-orb.hbs"), "utf8"
  );
  const backingLine = orbTemplate.match(/<circle class="bi-orb__glyph-backing"[^>]*>/);
  assert.ok(backingLine, "deck-orb.hbs no longer draws a backing circle for the bezel kanji");
  assert.match(backingLine[0], /cx="\{\{this\.labelX\}\}"/, "the backing circle no longer shares the glyph's own x");
  assert.match(backingLine[0], /cy="\{\{this\.labelY\}\}"/, "the backing circle no longer shares the glyph's own y");
  // The circle must be emitted BEFORE the text in source order, or SVG paint
  // order puts the plate on top of the glyph instead of behind it.
  const backingIndex = orbTemplate.indexOf(backingLine[0]);
  const textIndex = orbTemplate.indexOf('<text class="bi-orb__glyph"');
  assert.ok(backingIndex >= 0 && textIndex > backingIndex, "the backing circle no longer paints before the glyph text");

  assert.match(components, /\.bi-orb__glyph-backing\s*\{[^}]*fill:/, "no fill is declared for .bi-orb__glyph-backing");
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

test("the scene runner drawer takes the whole screen height once it is actually open (regression: ~190px dead strip below it, 2026-09-20)", () => {
  // FOUND LIVE 2026-09-20 at 1280x720: the open drawer's own bottom edge
  // stopped at y=531 to clear the deck's height, but fitDeck's leftReserve
  // (deck.mjs above, only set while the drawer is open) already pushes the
  // deck's own left edge clear of the drawer's right edge by at least
  // `margin` -- guaranteed by deckFit's own arithmetic (the same guarantee
  // tier1-deck-layout.test.mjs's "never slide under Foundry's roster"
  // checks, generalised to any leftReserve). So the reservation below only
  // protects the CLOSED drawer's idle box; the OPEN drawer never needs it.
  assert.match(rule(bridge, "body.bi-theme #bi-scene-runner"), /bottom:\s*calc\(var\(--bi-bar-height\)\s*\+\s*12px\)/,
    "the closed drawer's own idle box must still clear the deck's corner");
  assert.match(
    rule(bridge, "body.bi-theme:has(#bi-scene-runner .bi-runner-shell--open) #bi-scene-runner"),
    /bottom:\s*0/,
    "the OPEN drawer must reach the bottom of the screen -- fitDeck already keeps the deck clear of it horizontally"
  );
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

test("the hotbar rampart's gap corrects for its two end clusters being different widths (regression: right macro flank sat left of true centre)", () => {
  // FOUND LIVE 2026-09-17, against the real server: Foundry's own #hotbar
  // carries #hotbar-controls-left (mute, menu — 2 icons) AND
  // #hotbar-controls-right (page nav, lock, clear — 4 icons). Centering the
  // whole row as one box only lands the 5/6 gap on --bi-orb-center if both
  // end clusters are equal width, and they are not — so the gap (and the
  // whole right-hand macro flank) sat left of the orb's true centre.
  assert.match(deckAdapter, /getElementById\("hotbar-controls-left"\)/, "fitDeck no longer measures the left hotbar cluster");
  assert.match(deckAdapter, /getElementById\("hotbar-controls-right"\)/, "fitDeck no longer measures the right hotbar cluster");
  assert.match(deckAdapter, /setProperty\("--bi-hotbar-left-w"/);
  assert.match(deckAdapter, /setProperty\("--bi-hotbar-right-w"/);

  const hotbarRule = bridge.match(/#hotbar\s*\{[^}]*\}/);
  assert.ok(hotbarRule, "#hotbar's own fixed-position rule is missing");
  assert.match(
    hotbarRule[0],
    /transform:\s*translateX\(calc\(-50%\s*\+\s*\(var\(--bi-hotbar-right-w,\s*0px\)\s*-\s*var\(--bi-hotbar-left-w,\s*0px\)\)\s*\/\s*2\)\)/,
    "the transform no longer corrects for the two end clusters' real width difference"
  );

  // Cleanup on unmount must match what fitDeck now sets, or a deck that
  // unmounts mid-session leaves a stale correction behind for the next thing
  // that reads these two variables.
  const cleanupList = deckAdapter.match(/for \(const prop of \[([^\]]*)\]\)\s*style\.removeProperty/);
  assert.ok(cleanupList, "fitDeck's unmount cleanup list is missing");
  assert.match(cleanupList[1], /--bi-hotbar-left-w/, "unmount cleanup no longer clears --bi-hotbar-left-w");
  assert.match(cleanupList[1], /--bi-hotbar-right-w/, "unmount cleanup no longer clears --bi-hotbar-right-w");
});

test("the Director's script is a pill on the deck's own shoulder, not only a floating circle (regression: Ingram's own feedback against the real server)", () => {
  // "the scene runner button needs to be part of the main UI not a circle
  // off on its own" — 2026-09-17. .bi-runner-toggle keeps working (the
  // fallback if the deck ever fails to mount, same as .bi-phone-btn/
  // .bi-console-btn), but the deck itself must carry its own door in, and
  // that floating fallback must not show up a second time while the deck
  // is mounted.
  assert.match(deckDirectorTemplate, /data-action="openRunner"/, "deck-director.hbs no longer offers an openRunner pill");
  assert.match(directorBar, /openRunner:\s*DirectorBar\.#onOpenRunner/, "DirectorBar no longer wires the openRunner action");
  assert.match(directorBar, /import\s*\{[^}]*toggleSceneRunner[^}]*\}\s*from\s*"\.\/scene-runner\.mjs"/);
  assert.match(sceneRunnerAdapter, /export function toggleSceneRunner/, "scene-runner.mjs no longer exports a plain toggle for the deck pill to call");

  const hideRule = bridge.match(/:has\(#bi-command-bar\.bi-deck\)[^{]*\{\s*display:\s*none;\s*\}/s);
  assert.ok(hideRule, "no rule hides the legacy floating buttons while the deck is mounted");
  assert.match(hideRule[0], /\.bi-runner-toggle/, ".bi-runner-toggle is no longer hidden while the deck carries its own pill");
});

test("the Sound Desk's own floating button is hidden the same way, now the deck has its own Sound pill (2026-09-18)", () => {
  const hideRule = bridge.match(/:has\(#bi-command-bar\.bi-deck\)[^{]*\{\s*display:\s*none;\s*\}/s);
  assert.ok(hideRule);
  assert.match(hideRule[0], /\.bi-desk-btn/, ".bi-desk-btn is no longer hidden while the deck carries its own Sound pill — a redundant second door back on screen");
});

test("the Deck is not blind to Sound Desk or the Stage (2026-09-18 unification): it reads their state and can open the desk", () => {
  // deckDirectorFor() must actually read directorState() and the current
  // scene's own stage flag, not just the session clock it always had.
  assert.match(deckAdapter, /import\s*\{\s*directorState\s*\}\s*from\s*"\.\/audio-director\.mjs"/, "deck.mjs no longer reads the audio director's state");
  assert.match(deckAdapter, /audio\.music\[0\]\?\.name\s*\?\?\s*audio\.ambience\[0\]\?\.name/, "deckDirectorFor no longer surfaces what's actually playing");
  assert.match(deckAdapter, /canvas\?\.scene\?\.getFlag\(MODULE_ID,\s*"stage"\)\?\.cast\?\.length/, "deckDirectorFor no longer surfaces the staged cast count");

  // The template must actually render both, and offer a real door into the desk.
  assert.match(deckDirectorTemplate, /director\.audio\.nowPlaying/, "deck-director.hbs no longer shows the now-playing chip");
  assert.match(deckDirectorTemplate, /director\.staged/, "deck-director.hbs no longer shows the staged-count chip");
  assert.match(deckDirectorTemplate, /data-action="openSoundDesk"/, "deck-director.hbs no longer offers an openSoundDesk pill");

  // And the action has to actually go somewhere real.
  assert.match(directorBar, /openSoundDesk:\s*DirectorBar\.#onOpenSoundDesk/, "DirectorBar no longer wires the openSoundDesk action");
  assert.match(directorBar, /import\s*\{[^}]*toggleSoundDesk[^}]*\}\s*from\s*"\.\/sound-desk\.mjs"/);
});

test("the Deck's Staged and Playing chips actually get told to refresh, not just computed correctly once (regression: found live 2026-09-18 — a demo staged an NPC and the chip kept reading zero until something UNRELATED repainted the deck)", () => {
  const stageListener = entry.match(/Hooks\.on\("updateScene", \(scene, changed\) => \{\s*if \(scene\?\.id !== canvas\?\.scene\?\.id\) return;\s*if \(!foundry\.utils\.hasProperty\(changed, `flags\.\$\{MODULE_ID\}\.stage`\)\) return;[\s\S]*?\n\}\);/);
  assert.ok(stageListener, "could not find the stage-cast updateScene listener");
  assert.match(stageListener[0], /refreshCommandBar\(\["right"\]\)/, "a stage-cast change no longer refreshes the Deck's own right shoulder — the Staged chip will show stale data until something else happens to repaint it");

  const activateListener = entry.match(/Hooks\.on\("updateScene", \(scene, changed\) => \{\s*if \(changed\?\.active !== true\) return;[\s\S]*?\n\}\);/);
  assert.ok(activateListener, "could not find a scene-activation updateScene listener refreshing the deck");
  assert.match(activateListener[0], /refreshCommandBar\(\["right"\]\)/, "a scene activation no longer refreshes the Deck's own right shoulder — the Playing chip will show stale data after SCENE -> MAP -> SCENE lands on the destination");
});
