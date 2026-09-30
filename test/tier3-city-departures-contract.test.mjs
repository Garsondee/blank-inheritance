// Tier 3 — the Foundry half of the world map destination system
// (design/world-map-destinations.md): foundry/city-state.mjs, city-pawns.mjs,
// city-layer.mjs, and the places the Scene Runner and the module's entry file
// hand work to them.
//
// Pinned by reading the source, the same way tier3-scene-build-contract.test.mjs
// pins scene-build.mjs: Foundry's query system, #hud, PIXI and Token hooks are
// not modelled by mock-foundry.mjs. The rules themselves are tested for real in
// tier1-departures.test.mjs; this file holds the wiring to Ingram's decisions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ARRIVAL_MODES, KINDS } from "../module/blank-inheritance/scripts/core/departures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (rel) => readFileSync(path.join(moduleRoot, rel), "utf8");

const state = read("scripts/foundry/city-state.mjs");
const pawns = read("scripts/foundry/city-pawns.mjs");
const layer = read("scripts/foundry/city-layer.mjs");
const runner = read("scripts/foundry/scene-runner.mjs");
const entry = read("scripts/blank-inheritance.mjs");
const lang = JSON.parse(read("lang/en.json"));
const css = read("styles/bi-components.css");

test("a player's pick goes to the active GM through Foundry's own query system, and comes back answered", () => {
  assert.match(state, /CONFIG\.queries\[QUERY_PICK\] = /, "the GM side no longer answers picks");
  assert.match(state, /CONFIG\.queries\[QUERY_MINE\] = /, "a reloaded player can no longer ask for their own private pick back");
  assert.match(state, /gm\.query\(QUERY_PICK,/, "a player's pick no longer asks the GM");
  assert.match(state, /game\.users\.activeGM/, "picks must go to the ACTIVE GM, not any GM");
  // Two players clicking the last place at once: one of them gets it.
  assert.match(state, /export function gmPick\([^)]*\) \{\s*return serially\(/, "GM-side picks are no longer resolved one at a time");
});

test("a private pick never reaches the world setting every client can read (Ingram: private leaves no trace)", () => {
  assert.match(state, /const VAULT_FLAG = "cityPrivate";/);
  assert.match(state, /ensureDowntimeVault/, "private picks no longer live on the GM-only vault");
  // The only write of the shared record takes the public result of applyPick.
  assert.match(state, /await writePrivate\(nextPrivate\);\s*await writeState\(\{ \.\.\.state, departure: result\.live \}\);/);
  assert.match(layer, /projectForViewer\(live,/, "the layer draws the raw record instead of this viewer's projection of it");
});

test("the shared record is one GM-written world setting that repaints every screen", () => {
  assert.match(state, /game\.settings\.register\(MODULE_ID, SETTING, \{ scope: "world", config: false, type: Object/);
  assert.match(entry, /registerCitySettings\(\(\) => \{[\s\S]*?refreshCityLayer\(\)[\s\S]*?refreshSceneRunner\(\);[\s\S]*?\}\);/, "a change to the record no longer repaints the map and the Runner");
  assert.match(entry, /registerCityConversation\(\(\) => refreshCityLayer\(\)\)/);
});

test("players cannot move a token on The City by hand; only the system moves pawns (Ingram, 2026-09-28)", () => {
  assert.match(pawns, /Hooks\.on\("preUpdateToken", \(tokenDoc, changes\) => \{\s*if \(game\.user\?\.isGM\) return;\s*if \(!isHubScene\(tokenDoc\.parent\)\) return;\s*if \("x" in changes \|\| "y" in changes \|\| "elevation" in changes\) return false;/);
  assert.match(pawns, /Hooks\.on\("preMoveToken", \(tokenDoc\) => \{\s*if \(game\.user\?\.isGM\) return;\s*if \(isHubScene\(tokenDoc\.parent\)\) return false;/);
  // Registered at init on every client: a guard is a client-side hook.
  assert.match(entry, /registerPawnGuards\(\);/);
  // A pawn is the character's own Actor-backed token, so the player's camera follows it.
  assert.match(pawns, /actor\.getTokenDocument\(/);
  assert.match(pawns, /deriveFoundryId\(`city-pawn-\$\{userId\}`\)/, "a pawn's id is no longer stable across rebuilds");
});

test("markers live in Foundry's own #hud and keep one size on screen at every zoom", () => {
  assert.match(layer, /canvas\.hud\?\.element \?\? document\.getElementById\("hud"\)/);
  assert.match(layer, /setProperty\("--bi-city-inv", String\(1 \/ /);
  assert.match(entry, /Hooks\.on\("canvasPan", \(\) => \{\s*onCityPan\(\);\s*\}\);/);
  assert.match(entry, /Hooks\.on\("canvasReady", \(\) => \{\s*mountCityLayer\(\)/);
  assert.match(entry, /Hooks\.on\("updateToken", \(tokenDoc\) => \{\s*onCityTokenMoved\(tokenDoc\);\s*\}\);/);
  // The stylesheet half: counter-scaled from the foot, and clickable inside a #hud that is not.
  assert.match(css, /\.bi-city-marker \{[^}]*transform-origin: 50% 100%;[^}]*transform: translate\(-50%, -100%\) scale\(var\(--bi-city-inv, 1\)\);/);
  assert.match(css, /\.bi-city-marker__pin \{[^}]*pointer-events: auto;/);
});

test("a surprise place shows its picture blurred and without colour, never plainly", () => {
  assert.match(layer, /d\.mystery \? "is-mystery" : ""/);
  assert.match(css, /\.bi-city-marker\.is-mystery \.bi-city-marker__medal img,\s*\.bi-city-card\.is-mystery \.bi-city-card__art img \{[^}]*filter: blur\([^)]*\) grayscale\(1\)/);
});

test("each chosen journey is drawn as a dashed line, marching, on the canvas", () => {
  assert.match(layer, /canvas\.controls\.addChild\(new PIXI\.Graphics\(\)\)/);
  assert.match(layer, /dashSegments\(line\.from, line\.to,/);
  assert.match(layer, /canvas\.app\.ticker\.add\(/);
});

test("the Scene Runner hands a closed scene to the city first, and moves pawns rather than the old travel marker", () => {
  const advance = runner.slice(runner.indexOf("async function advanceAfterClose("));
  const cityFirst = advance.indexOf("if (await onCitySceneClosed(closedBriefId, closedBrief)) return;");
  assert.ok(cityFirst > 0, "advanceAfterClose no longer asks the City first");
  assert.ok(cityFirst < advance.indexOf('loadJson("episodes"'), "the episode's running order runs before the City gets its say");
  assert.match(runner, /if \(hasPawns\(\) && toRef\)/);
  assert.match(runner, /sendPartyTo\(toRef, targetSceneId\)/);
  // The GM can still change anyone's destination after Go (Ingram's answer 3).
  assert.match(runner, /data-bi-reassign/);
  assert.match(runner, /reassignCityPlayer\(/);
});

test("every departure kind and every refusal reason has words on screen", () => {
  const city = lang.BLANKINHERITANCE.City;
  for (const kind of Object.values(KINDS)) {
    assert.equal(typeof city.Kind[kind], "string", `no label for departure kind "${kind}"`);
    assert.match(layer, new RegExp(`${kind}: "BLANKINHERITANCE\\.City\\.Kind\\.${kind}"`), `KIND_KEY has no entry for "${kind}"`);
  }
  const reasons = new Set();
  for (const src of [state, read("scripts/core/departures.mjs")]) {
    for (const m of src.matchAll(/reason: "([a-z-]+)"/g)) reasons.add(m[1]);
  }
  assert.ok(reasons.size >= 5, "expected the refusal reasons to be found in the source");
  for (const reason of reasons) {
    const camel = reason.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    assert.equal(typeof city.Refused[camel], "string", `a refusal "${reason}" would show a raw key`);
    assert.ok(layer.includes(`"BLANKINHERITANCE.City.Refused.${camel}"`), `REFUSED_KEY has no entry for "${reason}"`);
  }
});

test("the console API reaches the departures, for one nobody authored", () => {
  for (const name of ["openCityDeparture", "goCityDeparture", "cancelCityDeparture", "reassignCityPlayer", "cityState"]) {
    assert.match(entry, new RegExp(`^\\s*${name},?\\s*$`, "m"), `${name} is not on mod.api`);
  }
});

test("the layer never touches Foundry's own `ui` global except to post a notification (found live 2026-09-28)", () => {
  // A local object once shared the name, and after a rename removeAll() still
  // wrote `ui[key] = null` -- so the board and card were never taken down when
  // the table left The City, and Foundry's global was being written to.
  const uses = [...layer.matchAll(/(?<![.\w])ui(\??\.|\[)(\w*)/g)].map((m) => m[0]);
  assert.deepEqual(uses.filter((u) => !/^ui\??\.notifications$/.test(u)), [], `unexpected use of Foundry's ui global: ${uses.join(", ")}`);
  assert.match(layer, /function removeAll\(\) \{\s*for \(const key of \["markers", "board", "card", "arrival"\]\) \{\s*els\[key\]\?\.remove\(\);\s*els\[key\] = null;/);
});

test("found live: players read the whole hub, whatever vision the hand-built scene had", () => {
  const build = read("scripts/foundry/scene-build.mjs");
  // A player with no vision token saw a black screen; with a pawn, a circle round it.
  assert.match(build, /if \(plan\.kind === "hub" && \(adopted\.tokenVision \|\| adopted\.fog\?\.exploration\)\) \{\s*await adopted\.update\(\{ tokenVision: false, "fog\.exploration": false \}\);/);
  assert.match(pawns, /sight: \{ \.\.\.\(base\.sight \?\? \{\}\), enabled: false \}/, "a pawn limits what its player can see");
  assert.match(pawns, /export const PAWN_SQUARES = 3;/, "pawns went back to a one-square speck on a 12,400-pixel map");
});

test("found live: a first departure has pawns to draw lines from, and a gathering draws everyone's line", () => {
  // Opening a departure stands anyone without a pawn where the scene that opened it happened (never for an arrival).
  assert.match(state, /live\.kind !== "arrive" \? await standMissingPawns\(hub, state, sourceBriefId\) : \{\}/);
  assert.match(layer, /const gatherAt = vm\.choosing \? null : vm\.destinations\[0\]\?\.id \?\? null;/);
  assert.match(layer, /const destId = vm\.live\.picks\?\.\[m\.userId\] \?\? gatherAt;/);
});

test("found live: crowded markers are spread, and the card stays clear of the console deck", () => {
  assert.match(layer, /const lifts = declutter\(items\);/);
  assert.match(layer, /if \(zoom !== els\.spreadAt\) spreadMarkers\(\);/, "markers are not re-spread when the zoom changes");
  assert.match(css, /height: calc\(22px \+ var\(--bi-city-lift, 0px\)\);/);
  assert.match(layer, /document\.getElementById\("bi-command-bar"\)/);
  assert.match(layer, /deck\.querySelectorAll\("\.bi-orb"\)/);
  // A player with the arrival dialog open does not also get the board repeating its question.
  assert.match(layer, /function renderBoard\(vm\) \{\s*if \(arrivalOpen\(vm\)\) \{/);
});

test("every arrival mode has an icon -- two lists maintained in two files must not silently drift", () => {
  const iconBlock = layer.match(/const MODE_ICON = \{([\s\S]*?)\};/)?.[1] ?? "";
  for (const mode of ARRIVAL_MODES) {
    assert.match(iconBlock, new RegExp(`\\b${mode}:`), `city-layer.mjs's MODE_ICON has no entry for arrival mode "${mode}" -- it would draw as a plain pin`);
  }
});
