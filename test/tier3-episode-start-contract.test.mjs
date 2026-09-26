// Tier 3 — the opening titles as the start of a session: the wiring from the
// GM's press to the episode's first scene, pinned against its own module
// files and against the real Foundry source it leans on.
//
// Ingram, 2026-09-26: "So when we start a session we watch the intro video,
// then we cut to the episode title, then we fade into the first scene
// automatically." The pure choices are tier1-episode-start and the second
// half of tier1-opening-titles; the opening's own wiring (settings, socket,
// the choice window, Skip and Escape) is tier3-opening-titles-contract. This
// file checks what the chain added: which episode and scene the GM's window
// offers and sends, how the scene is changed under the curtain, when each
// screen may fade in, the sound that arrives with it, and that every Foundry
// behaviour it depends on still behaves that way.
//
// Read as source rather than mounted, like every other tier3-*-contract test
// here: the adapter destructures foundry.applications.api at module scope and
// drives a <video>, neither of which plain Node has.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { REVEAL_FADE_MS, isSceneId } from "../module/blank-inheritance/scripts/core/opening-titles.mjs";
import { episodeStarts, startChoiceContext, startChoiceHtml } from "../module/blank-inheritance/scripts/core/episode-start.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...p) => readFileSync(path.join(moduleRoot, ...p), "utf8");
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const adapter = read("scripts", "foundry", "opening-titles.mjs");
const runner = read("scripts", "foundry", "scene-runner.mjs");
const directorPanel = read("scripts", "foundry", "director-panel.mjs");
const audioDirector = read("scripts", "foundry", "audio-director.mjs");
const sceneBuild = read("scripts", "foundry", "scene-build.mjs");
const sceneSetPlan = read("scripts", "core", "generators", "scene-set.mjs");
const palette = read("scripts", "foundry", "director-palette.mjs");
const overlayTemplate = read("templates", "opening", "overlay.hbs");
const components = stripCssComments(read("styles", "bi-components.css"));
const lang = JSON.parse(read("lang", "en.json"));

/** The body of a top-level function, up to its closing brace in column 0. */
function fn(source, name) {
  const m = source.match(new RegExp(`(?:export )?(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `no function ${name}`);
  return m[0];
}

/** The declarations of one CSS rule (the first whose selector is exactly `selector`). */
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = components.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no CSS rule for ${selector}`);
  return m[1];
}

/* ---------------------------------------------------------------- */
/*  The GM's press                                                   */
/* ---------------------------------------------------------------- */

test("the press asks first, then sends the chosen episode and its scene, then cues the scene once every curtain is up", () => {
  const body = fn(adapter, "playOpeningForTable");
  const order = [
    "await loadStartSetup()",
    "await confirmOpening(setup, chosen)",
    "playRequest(foundry.utils.randomID(16), { episodeId: start?.episodeId ?? null, sceneId: start?.sceneId ?? null })",
    "openingLogText({ episodeTitle: start?.title ?? null })",
    "if (start) followEpisode(start);",
    "game.socket.emit(SOCKET, request);",
    "receiveOpening(request, game.user.id)",
    "if (start?.sceneId) setTimeout(() => cueFirstScene(start.sceneId), SCENE_CUE_DELAY_MS);"
  ];
  let last = -1;
  for (const step of order) {
    const at = body.indexOf(step);
    assert.ok(at > last, `"${step}" is missing or out of order`);
    last = at;
  }
  assert.match(body, /if \(!answer\) return false;/, "a window that is not confirmed sends nothing and moves nobody");
  assert.match(body, /let chosen = episode === undefined \? setup\.selectedId : String\(episode \?\? ""\);/,
    "a macro may name the episode (or null for the opening alone); left out, it is what the window would offer first");
});

test("the confirm window offers the choice, reads it back from its own form, and keeps its sentence in step", () => {
  const body = fn(adapter, "confirmOpening");
  assert.match(body, /DialogV2\.confirm\(/);
  assert.match(body, /startChoiceHtml\(\s*startChoiceContext\(\{ starts: setup\.starts, selectedId, missingTitles, folder, format: \(key, data\) => game\.i18n\.format\(key, data\) \}\)\s*\)/);
  assert.match(body, /callback: \(event, button\) => \(\{ episodeId: String\(button\?\.form\?\.elements\?\.episode\?\.value \?\? ""\) \}\)/,
    "the pressed button's own form holds the select");
  assert.match(body, /render: \(event, dialog\) => wireStartChoice\(dialog\?\.element\)/);
  assert.match(body, /return answer && typeof answer === "object" \? answer : null;/, "Not now (false) and a closed window (null) both mean no");
  assert.match(body, /preflightTitles\(folder, setup\.starts\)/, "every offered title card is checked before anything is sent");
  const wire = fn(adapter, "wireStartChoice");
  assert.match(wire, /select\[name="episode"\]/);
  assert.match(wire, /\.bi-opening-confirm__detail/);
  assert.match(wire, /detail\.textContent = select\.selectedOptions\?\.\[0\]\?\.dataset\?\.detail \?\? "";/, "textContent: the sentence is never parsed as markup");
  assert.match(fn(adapter, "preflightTitles"), /episodeTitlePath\(folder, episodeId\)[\s\S]*missingTitleCards\(checks\)/);
});

test("the window offers the Scene Runner's own episode first, from the same episode files the runner reads", () => {
  assert.match(adapter, /const EPISODE_DIR = "data\/campaign\/episodes";/);
  assert.match(runner, /const dataPath = \(dir, id\) => `data\/campaign\/\$\{dir\}\/\$\{id\}\.json`;/);
  assert.match(runner, /loadJson\("episodes", currentEpisodeId\(\)\)/, "the runner's episodes live in that same folder");
  const setup = fn(adapter, "loadStartSetup");
  assert.match(setup, /episodeStarts\(episodes, sceneDescriptors\(\)\)/);
  assert.match(setup, /defaultStartId\(starts, currentEpisodeId\)/);
  assert.match(fn(adapter, "runnerEpisode"), /runner\.runnerEpisodeId\?\.\(\)/);
  assert.match(runner, /export function runnerEpisodeId\(\) \{\s*try \{\s*return currentEpisodeId\(\);/);
});

test("the runner is reached only dynamically, so this file stays out of the command bar's import graph", () => {
  assert.doesNotMatch(adapter, /from "\.\/scene-runner\.mjs"/);
  assert.ok((adapter.match(/import\("\.\/scene-runner\.mjs"\)/g) ?? []).length >= 2);
});

test("starting an episode points the Scene Runner at it without opening the drawer or touching the sound", () => {
  const follow = fn(adapter, "followEpisode");
  assert.match(follow, /runner\.setRunnerEpisode\?\.\(start\.episodeId, start\.briefRef \?\? null\)/);
  assert.match(follow, /runner\.refreshSceneRunner\?\.\(\)/);
  const set = fn(runner, "setRunnerEpisode");
  assert.match(set, /if \(!game\.user\?\.isGM \|\| typeof episodeId !== "string" \|\| !episodeId\) return false;/);
  assert.match(set, /game\.settings\.set\(MODULE_ID, SETTING_EPISODE, episodeId\)/);
  assert.match(set, /if \(typeof briefId === "string"\) await game\.settings\.set\(MODULE_ID, SETTING_BRIEF, briefId\);/);
  assert.match(set, /else if \(switching\) await game\.settings\.set\(MODULE_ID, SETTING_BRIEF, ""\);/);
  assert.doesNotMatch(set, /toggle\(|mountSceneRunner\(|applySceneAudio\(/);
  assert.match(fn(runner, "openSceneRunner"), /if \(typeof episodeId === "string" && episodeId\) \{\s*await setRunnerEpisode\(episodeId, briefId\);\s*\}/,
    "openSceneRunner is the same write plus the drawer, not a second copy of it");
});

test("the first scene is found by the flags the scene set writes", () => {
  const describe = fn(adapter, "sceneDescriptors");
  assert.match(describe, /briefRef: scene\.getFlag\(MODULE_ID, "briefRef"\)/);
  assert.match(describe, /kind: scene\.getFlag\(MODULE_ID, "kind"\)/);
  assert.match(describe, /active: scene\.active === true/);
  assert.match(sceneBuild, /await scene\.setFlag\(MODULE_ID, "briefRef", plan\.briefRef\);/);
  assert.match(sceneBuild, /await scene\.setFlag\(MODULE_ID, "kind", plan\.kind\);/);
  assert.match(sceneSetPlan, /sort: \(scene\.order \?\? 0\) \* 100/, "a scene's sort is the manifest's own order, so a main room sorts before the sub-rooms listed after it");
});

test("the scene changes under the curtain through the Director's own cue: no transition, and everyone pulled", () => {
  assert.match(fn(adapter, "cueFirstScene"), /await cueScene\(sceneId, \{ transition: hiddenCutTransition\(\), pullUsers: true \}\);/);
  const cue = fn(directorPanel, "cueScene");
  assert.match(cue, /\{ transitionType, transitionDuration, transition, pullUsers = false \} = \{\}/, "every other caller passes neither, and cues as before");
  assert.match(cue, /viewOptions: \{ transition: transition \?\? transitionOptions\(transitionType, transitionDuration\) \}/);
  assert.match(cue, /pullUsers\s*\n?\s*\}\);/);
  assert.match(cue, /if \(!game\.user\.isGM\) return null;/);
});

/* ---------------------------------------------------------------- */
/*  Every screen                                                     */
/* ---------------------------------------------------------------- */

test("every screen raises its curtain before it asks anything, and knows whether it is the GM who pressed", () => {
  const body = fn(adapter, "receiveOpening");
  const raised = body.indexOf("await raiseCurtain(decision.id, chainFromRequest(payload), senderId === game.user?.id)");
  assert.ok(raised > 0 && raised < body.indexOf("await askForVersion()"), "the scene may change underneath at any moment after the press");
  assert.match(body, /if \(!overlay\) return;/);
});

test("the curtain is the player, black and silent, before any video, and Skip on it closes the choice window", () => {
  const curtain = fn(adapter, "raiseCurtain");
  assert.match(curtain, /root\.dataset\.state = "curtain";/);
  assert.match(curtain, /overlay\.duckTimer = setInterval\(duck, OPENING_DUCK\.refreshMs\);/, "the music dips from the curtain on, and stays down through the title card");
  assert.match(curtain, /if \(!part\) \{\s*if \(event === "skip"\) skipBetweenParts\(overlay\);\s*return;\s*\}/);
  const skip = fn(adapter, "skipBetweenParts");
  assert.match(skip, /if \(overlay\.phase === "holding"\) reveal\(overlay\);/, "Skip in the hold fades in at once");
  assert.match(skip, /else if \(overlay\.phase === "curtain"\) activeChoice\?\.close\(\);/, "Skip on the curtain skips the opening, as closing the window does");
});

test("a late play() rejection answers only for the part that made it, never for the title card after it", () => {
  const curtain = fn(adapter, "raiseCurtain");
  const start = curtain.match(/const start = \(\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? "";
  assert.match(start, /const owner = overlay\.part;/);
  assert.ok(start.indexOf("if (overlay.part !== owner) return;") < start.indexOf("classifyPlayRejection(err)"),
    "a failed opening's rejection arrives after its error event has already moved the reel on");
});

test("each part starts from black: the last part's frame is let go before the next part is current", () => {
  const part = fn(adapter, "playPart");
  const released = part.indexOf('video.removeAttribute("src");');
  const current = part.indexOf("overlay.part = { ...part, state: OVERLAY_STATES.LOADING, done: resolve };");
  const sourced = part.indexOf("video.src = part.path;");
  assert.ok(released > 0 && current > released && sourced > current, "released, then made current, then given its source");
});

test("a double click on the Opening key opens one confirm window, not two", () => {
  const body = fn(adapter, "playOpeningForTable");
  assert.match(body, /if \(pressing\) return false;\s*pressing = true;\s*try \{/);
  assert.match(body, /\} finally \{\s*pressing = false;\s*\}/, "and the key works again however the press ended");
});

test("the templates are compiled once on every screen, so the curtain goes up without a round trip", () => {
  assert.match(fn(adapter, "registerOpeningSocket"),
    /foundry\.applications\.handlebars\s*\.loadTemplates\(\[`\$\{TEMPLATE_ROOT\}\/overlay\.hbs`, `\$\{TEMPLATE_ROOT\}\/choice\.hbs`\]\)/);
});

test("a screen fades in only once it is drawing the named scene, polled on a timer, never on animation frames", () => {
  const hold = fn(adapter, "holdForScene");
  assert.match(hold, /sceneId: overlay\.chain\.sceneId,/);
  assert.match(hold, /viewedSceneId: canvas\?\.scene\?\.id \?\? null,/);
  assert.match(hold, /ready: canvas\?\.ready === true,/);
  assert.match(hold, /loading: canvas\?\.loading === true,/);
  assert.match(hold, /drawsScenes: canvas\?\.initialized === true,/);
  assert.match(hold, /if \(decision\.action === "reveal"\) reveal\(overlay\);/);
  assert.match(hold, /overlay\.holdTimer = setInterval\(check, SCENE_HOLD\.pollMs\);/);
  assert.match(hold, /overlay\.root\.dataset\.state = OVERLAY_STATES\.LOADING;/, "the hold shows Loading…");
  assert.doesNotMatch(adapter.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""), /requestAnimationFrame/,
    "rAF never runs on a hidden tab: a backgrounded screen would hold forever");
  assert.match(fn(adapter, "endReel"), /if \(reelEnding\(overlay\.chain\)\.kind === "close"\) \{\s*closeOverlay\(overlay\);\s*return;\s*\}\s*holdForScene\(overlay\);/);
});

test("the reveal hands back the keys and the music at its first frame, and the GM who pressed restarts the scene's sound", () => {
  assert.match(fn(adapter, "reveal"), /finish\(overlay, \{ fadeMs: REVEAL_FADE_MS, revealing: true \}\);/);
  assert.match(fn(adapter, "closeOverlay"), /finish\(overlay, \{ fadeMs: FADE_MS, revealing: false \}\);/);
  const finish = fn(adapter, "finish");
  const order = [
    "overlay.ending = true;",
    'document.removeEventListener("keydown", overlay.onKey, true);',
    "clearInterval(overlay.duckTimer);",
    "clearInterval(overlay.holdTimer);",
    'overlay.root.classList.add("is-revealing");',
    'overlay.root.classList.remove("is-shown");',
    "setTimeout(() => {"
  ];
  let last = -1;
  for (const step of order) {
    const at = finish.indexOf(step);
    assert.ok(at > last, `"${step}" is missing or out of order`);
    last = at;
  }
  assert.match(finish, /if \(overlay\.conductor\) startSceneSound\(overlay\.chain\.sceneId\);/);
  assert.match(finish, /\}, fadeMs \+ 40\);/);
});

test("the scene's sound is the soundscape the audio director binds it by, restarted from the top", () => {
  const sound = fn(adapter, "startSceneSound");
  assert.match(sound, /game\.scenes\?\.get\(sceneId\)\?\.getFlag\(MODULE_ID, "audio"\)\?\.soundscape/);
  assert.match(sound, /applySoundscape\(bound\)/);
  assert.match(audioDirector, /const bound = scene\.getFlag\(MODULE_ID, "audio"\)\?\.soundscape;/, "the same flag audio-director.mjs#onSceneActivated reads");
  assert.match(sceneBuild, /await scene\.setFlag\(MODULE_ID, "audio", \{ soundscape: plan\.briefRef \}\);/);
  // Re-applying restarts a track that is already playing (restart defaults to true), which is what makes it start from the top.
  assert.match(audioDirector, /export async function playMusicTrack\(assetId, \{ fadeMs = DEFAULT_FADE_MS, loop = true, from = 0, restart = true \} = \{\}\)/);
  assert.match(audioDirector, /if \(playlist\.sounds\.get\(sound\.id\)\?\.playing && \(restart \|\| from > 0\)\)/);
  assert.match(fn(audioDirector, "applySoundscape"), /playMusicTrack\(plan\.music\.assetId, \{ fadeMs: fade, loop: plan\.music\.loop, from: plan\.music\.from \}\)/);
});

test("a title card that will not play is reported by episode, and the GM's notice says so", () => {
  const report = fn(adapter, "reportFailure");
  assert.match(report, /part: part\.part,/);
  assert.match(report, /episodeId: part\.episodeId,/);
  assert.match(report, /if \(game\.user\?\.isGM\) noteFailure\(report, null\);\s*else game\.socket\.emit\(SOCKET, report\);/);
  const note = fn(adapter, "noteFailure");
  assert.match(note, /const title = report\.part === REEL_PARTS\.TITLE;/);
  assert.match(note, /BLANKINHERITANCE\.OpeningTitles\.Failed\.TitlePlayer/);
  assert.match(note, /BLANKINHERITANCE\.OpeningTitles\.Failed\.TitleOwn/);
});

test("each part names itself on the player: its label, its Skip hint and its click-to-play button", () => {
  const part = fn(adapter, "playPart");
  assert.match(part, /const labels = partLabels\(part\.part\);/);
  assert.match(part, /root\.querySelector\("\.bi-opening__play-label"\)/);
  assert.match(overlayTemplate, /<button type="button" class="bi-opening__play"><i class="fa-solid fa-play" aria-hidden="true"><\/i> <span class="bi-opening__play-label">\{\{play\}\}<\/span><\/button>/);
  assert.match(rule(".bi-opening__play-label"), /white-space:\s*nowrap/);
});

/* ---------------------------------------------------------------- */
/*  The stylesheet                                                   */
/* ---------------------------------------------------------------- */

test("the reveal is the player's own plain fade, slowed to core's number, and lets clicks through", () => {
  const reveal = rule(".bi-opening.is-revealing");
  assert.match(reveal, new RegExp(`transition-duration:\\s*${REVEAL_FADE_MS}ms`), "the CSS and core/opening-titles.mjs#REVEAL_FADE_MS must agree");
  assert.match(reveal, /pointer-events:\s*none/);
  assert.doesNotMatch(reveal, /animation/);
  assert.match(rule(".bi-opening"), /transition:\s*opacity var\(--bi-dur-servo\) linear/, "an opacity fade and nothing else");
});

test("the choice window opens above the curtain and still under Foundry's notifications", () => {
  assert.match(rule(".bi-opening-choice-window"), /z-index:\s*var\(--z-index-tooltip, 9999\) !important/,
    "only !important beats the inline z-index ApplicationV2#bringToFront writes (pinned below)");
  assert.match(rule(".bi-opening"), /z-index:\s*calc\(var\(--z-index-tooltip, 9999\) - 1\)/, "the curtain, one under the choice window");
  for (const cls of ["bi-opening-confirm__then", "bi-opening-confirm__detail"]) assert.match(components, new RegExp(`\\.${cls}\\s*\\{`), `.${cls} has no rule`);
});

test("the GM's own words describe the whole sequence", () => {
  const titles = lang.BLANKINHERITANCE.OpeningTitles;
  assert.match(titles.RailHint, /title card/);
  assert.match(titles.RailHint, /first scene/);
  assert.match(titles.Settings.FolderHint, /episode-titles/, "the folder setting names where the title cards go");
  assert.match(palette, /id: "table\.opening"[^\n]*hint: "every screen, then an episode's title card and first scene \(asks first\)"/);
});

/* ---------------------------------------------------------------- */
/*  What Foundry itself must keep doing (the local source trees)     */
/* ---------------------------------------------------------------- */

const appRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const available = existsSync(appRoot);
const skip = available ? false : "the local foundryvtt/ tree is absent (gitignored): Foundry-behaviour contracts not checked";
const readApp = (rel) => readFileSync(path.join(appRoot, rel), "utf8");
const importApp = (rel) => import(pathToFileURL(path.join(appRoot, rel)).href);

test("Scene#activate carries the view options to every screen, and pulls everyone only to a scene that is already active", { skip }, () => {
  const scene = readApp("client/documents/scene.mjs");
  const activate = scene.match(/async activate\(\{viewOptions=\{\}, pullUsers=false, updateData, updateOptions\}=\{\}\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(activate, "Scene#activate's signature changed");
  assert.match(activate, /if \( !this\.active \) pullUsers = false;/);
  assert.match(activate, /updateOptions = \{\.\.\.updateOptions, viewOptions\};/);
  assert.match(activate, /if \( pullUsers \) this\.pullUsers\(game\.users, viewOptions\);/);
  assert.match(scene, /_onActivate\(active, operation\) \{\s*if \( active \) this\.view\(operation\.viewOptions\);/,
    "each screen views the newly active scene with the GM's view options, hidden cut included");
  assert.match(scene, /game\.socket\.emit\("pullToScene", this\.id, user\.id, viewOptions\);/);
  assert.match(readApp("client/documents/collections/scenes.mjs"), /static #pullToScene\(sceneId, viewOptions\) \{\s*const scene = game\.scenes\.get\(sceneId\);\s*if \( scene \) scene\.view\(viewOptions\);/);
});

test("Scene#view redraws only a different scene, with those options, and refuses while the board is loading", { skip }, () => {
  const view = readApp("client/documents/scene.mjs").match(/async view\(options=\{\}\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(view);
  assert.match(view, /if \( canvas\.loading \) \{/, "a screen mid-load keeps its old scene, which is why the hold has a timeout");
  assert.match(view, /const sceneChanged = canvas\.scene\?\.id !== this\.id;/);
  assert.match(view, /canvas\._viewOptions = options;\s*await canvas\.draw\(this\);/);
});

test("the board is ready, then its transition starts, then it stops loading: what the hold waits for", { skip }, () => {
  const board = readApp("client/canvas/board.mjs");
  const draw = board.match(/async #draw\(nextScene\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(draw, "Canvas#draw's private worker changed");
  const at = (text, from = 0) => draw.indexOf(text, from);
  const notReady = at("this.#ready = false;");
  const loading = at("this.loading = true;");
  const ready = at('Hooks.call("canvasReady", this);');
  const transition = at("this.#animateTransition(priorScene).finally(() => this.root.visible = true);");
  const loaded = at("this.loading = false;", transition);
  assert.ok(notReady > 0 && loading > notReady && ready > loading && transition > ready && loaded > transition,
    "ready === true and loading === false together mean the new scene is drawn and its transition has begun");
  for (const getter of [/get ready\(\) \{\s*return this\.#ready;/, /get initialized\(\) \{\s*return this\.#initialized;/, /get scene\(\) \{\s*return this\.#scene;/]) {
    assert.match(board, getter);
  }
  assert.match(board, /\n {2}loading = false;/);
});

test("a view option whose transition type is null plays no transition at all: the hidden cut", { skip }, () => {
  const board = readApp("client/canvas/board.mjs");
  const animate = board.match(/async #animateTransition\(priorScene\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(animate);
  assert.match(animate, /const explicitTransition = this\._viewOptions\.transition;/);
  assert.match(animate, /const transition = explicitTransition \?\? this\.scene\.transition;/, "an explicit { type: null } wins over the scene's own transition");
  assert.match(animate, /const transitionType = transition\.type \?\? null;/);
  assert.match(animate, /let shouldPlayTransition = !!transitionType &&/);
  assert.match(animate, /else this\.transition\._reset\(\);/);
});

test("core's scene id test is Foundry's own isValidId", { skip }, async () => {
  const { isValidId } = await importApp("common/data/validators.mjs");
  for (const id of ["a1b2c3d4e5f60718", "ABCDEFGHIJKLMNOP", "short", "a1b2c3d4e5f607189", "a1b2c3d4-5f60718", "", "aB3dE5gH7jK9mN1p"]) {
    assert.equal(isSceneId(id), isValidId(id), id);
  }
});

test("DialogV2.confirm resolves to the yes button's own callback, defaults to no, and runs a render hook", { skip }, () => {
  const dialog = readApp("client/applications/api/dialog.mjs");
  assert.match(dialog, /const result = \(await button\?\.callback\?\.\(event, target, this\)\) \?\? button\?\.action;/,
    "the callback gets the pressed button element, whose .form holds the select");
  const confirm = dialog.match(/static async confirm\(\{yes=\{\}, no=\{\}, \.\.\.config\}=\{\}\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(confirm);
  assert.match(confirm, /action: "yes", label: "COMMON\.Yes", icon: "fa-solid fa-check", callback: \(\) => true\s*\}, yes\)/, "our yes callback replaces the default one");
  assert.match(confirm, /action: "no"[^}]*default: true/, "Enter still means Not now");
  assert.match(dialog, /if \( typeof render === "function" \) \{\s*dialog\.addEventListener\("render", event => render\(event, dialog\)\);/);
  assert.match(dialog, /else options\.content = foundry\.utils\.cleanHTML\(String\(options\.content\)\);/, "the window's content is cleaned (checked next)");
});

test("every element and attribute of the choice survives Foundry's cleanHTML", { skip }, async () => {
  const { ALLOWED_HTML_TAGS, ALLOWED_HTML_ATTRIBUTES } = await importApp("common/constants.mjs");
  const allowedAttr = (tag, name) =>
    [...(ALLOWED_HTML_ATTRIBUTES["*"] ?? []), ...(ALLOWED_HTML_ATTRIBUTES[tag] ?? [])].some((pattern) =>
      new RegExp(`^${pattern.replaceAll("*", ".*")}$`).test(name));
  const starts = episodeStarts(
    [{ id: "episode-c1e1-a", title: "A", scenes: [{ order: 0, title: "S", briefRef: "b" }] }],
    [{ id: "a1b2c3d4e5f60718", briefRef: "b", kind: "beat", sort: 0, active: false }]
  );
  const html = startChoiceHtml(startChoiceContext({ starts, selectedId: "episode-c1e1-a", folder: "v" }));
  let tags = 0;
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*>/g)) {
    const [, tag, attrs] = m;
    assert.ok(ALLOWED_HTML_TAGS.includes(tag), `<${tag}> would be stripped out of the confirm window`);
    for (const a of attrs.matchAll(/\s([^\s=>]+)(?:="[^"]*")?/g)) {
      assert.ok(allowedAttr(tag, a[1]), `${tag}[${a[1]}] would be stripped out of the confirm window`);
    }
    tags += 1;
  }
  assert.ok(tags >= 6, "expected the label, select, options and paragraph");
});

test("loadTemplates caches compiled templates, so a later render needs no round trip", { skip }, () => {
  const hbs = readApp("client/applications/handlebars.mjs");
  assert.match(hbs, /export async function getTemplate\(path, id=path\) \{\s*if \( id in Handlebars\.partials \) return Handlebars\.partials\[id\];/);
  assert.match(hbs, /export async function loadTemplates\(paths\) \{[\s\S]*?: paths\.map\(p => getTemplate\(p\)\);/);
  assert.match(readApp("client/applications/_module.mjs"), /export \* as handlebars from "\.\/handlebars\.mjs";/, "reached as foundry.applications.handlebars");
});

test("ApplicationV2 writes each window's z-index inline, which is why the choice window's rule needs !important", { skip }, () => {
  const app = readApp("client/applications/api/application.mjs");
  assert.match(app, /this\.#element\.style\.zIndex = String\(this\.#position\.zIndex\);/);
  const css = readApp("public/css/foundry2.css");
  const value = (name) => Number(css.match(new RegExp(`${name}:\\s*(\\d+);`))?.[1]);
  assert.ok(value("--z-index-tooltip") < value("--z-index-notification"), "a GM notice still shows over the choice window and the curtain");
});
