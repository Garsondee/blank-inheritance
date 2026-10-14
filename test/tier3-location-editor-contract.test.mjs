// Tier 3 -- the Location Editor's contract with Foundry, read as source (the same way every other
// tier3-*-contract.test.mjs in this project reads the panel/layer files it guards: ApplicationV2 and the canvas
// are not modelled deeply enough by test/support/mock-foundry.mjs to mount a real render).
//
// Each rule below is a thing that was WRONG in the first version of the editor and invisible to every test it
// had, found only when the GM tried it in a real browser (design/location-editor.md §10 phase 7). The behaviour
// itself is executed in test/tier4-location-draw-layer.test.mjs; this file keeps the wiring those tests cannot
// see, and checks the Foundry source the wiring leans on where that is on disk.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(moduleRoot, ...parts), "utf8");
const layer = read("scripts", "foundry", "location-draw-layer.mjs");
const panel = read("scripts", "foundry", "location-editor.mjs");
const template = read("templates", "location-editor", "panel.hbs");
const css = read("styles", "bi-components.css");
const foundryRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "client");
const haveFoundry = existsSync(path.join(foundryRoot, "helpers", "interaction", "client-keybindings.mjs"));

/** The source of one method (a `name(` at two-space indent, to the next two-space-indented `}`). */
function method(source, signature) {
  const start = source.search(signature);
  assert.ok(start >= 0, `could not find ${signature}`);
  const end = source.indexOf("\n  }\n", start);
  assert.ok(end > start, `could not find the end of ${signature}`);
  return source.slice(start, end + 4);
}

test("every Foundry-called interaction callback is guarded, so a bug costs a console error and never the canvas", () => {
  for (const name of ["_onClickLeft", "_onClickLeft2", "_onDragLeftStart", "_onDragLeftMove", "_onDragLeftDrop", "_onDragLeftCancel"]) {
    const body = method(layer, new RegExp(`\\n  ${name}\\(`));
    assert.match(body, /this\.#guard(Async)?\(/, `${name} runs outside #guard: an exception inside it skips MouseInteractionManager's own state reset and wedges the canvas`);
  }
});

test("the drag preview is owned by the layer, never stashed on Foundry's per-gesture interactionData", () => {
  // The first version did `event.interactionData.locPreview = graphics` and destroyed it in both the drop and the
  // cancel that always follows -- the second destroy threw inside MouseInteractionManager#cancel.
  assert.doesNotMatch(layer, /interactionData\.\w*[Pp]review/);
  const end = method(layer, /\n  #endDrag\(/);
  assert.match(end, /this\.#dragPreview = null/);
  assert.match(end, /!preview\.destroyed/, "a second end of the same drag must not destroy twice");
});

test("the dock group hands Foundry tools as an object, built by core/location-draw-tools.mjs", () => {
  assert.match(method(layer, /\n {2}static prepareSceneControls\(/), /buildDockControl\(/);
  assert.doesNotMatch(layer, /tools:\s*\[/, "an array of tools reads to Foundry as tools named 0, 1, 2 ...");
});

test("no tool, button or lang key still uses the name 'select' (Foundry's canvas reserves it)", () => {
  assert.doesNotMatch(template, /data-tool="select"/);
  assert.doesNotMatch(layer, /#tool\s*=\s*"select"/);
  assert.doesNotMatch(layer, /setTool\([^)]*"select"/);
  assert.doesNotMatch(panel, /setTool\([^)]*"select"/);
  assert.doesNotMatch(panel, /selectTool\("select"\)/);
});

test("the panel's tool buttons come from the shared vocabulary, not a hand-kept second list", () => {
  assert.match(template, /\{\{#each tools\}\}/);
  assert.match(panel, /toolsForMode\(/);
});

test("the dock's onToolChange only acts on the tool being ENTERED", () => {
  const dock = method(layer, /\n {2}static prepareSceneControls\(/);
  assert.match(dock, /onToolChange:\s*\(event, tool, active\)\s*=>\s*\{\s*if \(active\)/, "Foundry also calls onToolChange for the tool being left, when ui.controls.tool is already the next group's");
});

test("opening the panel claims the canvas once; a later render never snatches it back", () => {
  const wire = method(panel, /\n {2}#wireLayer\(/);
  assert.doesNotMatch(wire, /\.activate\(/, "#wireLayer runs on every render and must not activate the layer itself");
  assert.match(wire, /if \(!this\.#claimed\)/);
  assert.match(method(panel, /\n {2}#claimCanvas\(/), /layer\.activate\(/);
});

test("closing the panel returns the canvas to Tokens", () => {
  assert.match(method(panel, /\n {2}_onClose\(/), /canvas\.tokens\?\.activate\(\)/);
});

test("Escape: the panel only REFUSES to close; cancelling is the layer's, or Foundry falls through to its main menu", () => {
  const close = method(panel, /\n {2}async close\(/);
  assert.match(close, /closeKey/);
  assert.match(close, /hasEscapableState/);
  assert.doesNotMatch(close, /cancelInProgress|clearSelection|_onDismissKey/, "cancelling in close() leaves the layer nothing to handle, so Foundry reports 'unhandled' and opens the main menu");
  const dismiss = method(layer, /\n {2}_onDismissKey\(/);
  assert.match(dismiss, /this\.cancelInProgress\(\)/);
  assert.match(dismiss, /this\.clearSelection\(\)/);
});

test("Foundry's Escape still asks every window to close first and the active layer second, then opens its menu", { skip: !haveFoundry && "Foundry source tree not on disk" }, () => {
  const keys = readFileSync(path.join(foundryRoot, "helpers", "interaction", "client-keybindings.mjs"), "utf8");
  const dismiss = keys.slice(keys.indexOf("static async #onDismiss"));
  const windows = dismiss.indexOf("app.close({closeKey: true})");
  const layerCase = dismiss.indexOf("layer._onDismissKey(context.event)");
  const menu = dismiss.indexOf("ui.menu.toggle()", layerCase); // the LAST case; an earlier one closes an already-open menu
  assert.ok(windows > 0 && layerCase > windows && menu > layerCase, "client-keybindings.mjs#onDismiss changed shape -- re-derive foundry/location-editor.mjs#close and the layer's _onDismissKey");
  assert.match(dismiss, /\.then\(\(\) => !app\.rendered\)/, "Foundry counts a window as dealt with only if it really closed");
});

test("Foundry's drag manager still resets its own state AFTER the cancel callback (why the callbacks must not throw)", { skip: !haveFoundry && "Foundry source tree not on disk" }, () => {
  const mouse = readFileSync(path.join(foundryRoot, "canvas", "interaction", "mouse-handler.mjs"), "utf8");
  const cancel = mouse.slice(mouse.indexOf("  cancel(event) {"));
  const callbackAt = cancel.indexOf("this.callback(action, event)");
  const resetAt = cancel.indexOf("this.interactionData = {}");
  assert.ok(callbackAt > 0 && resetAt > callbackAt, "MouseInteractionManager#cancel no longer resets its state after the cancel callback -- the guard rationale may have changed");
  assert.match(mouse, /this\.state = this\.states\.DROP;/, "a drop is followed by cancel(): the layer's drop and cancel must both be safe");
});

test("only the handles container is built interactive; every other drawing container goes through #passive", () => {
  const draw = method(layer, /\n {2}async _draw\(/);
  for (const name of ["#publishedContainer", "#shapesContainer", "#referenceContainer", "#draftContainer", "#overlayContainer"]) {
    assert.ok(draw.includes(`this.${name} = this.addChild(this.#passive(new PIXI.Container()))`), `${name} must be passive`);
  }
  assert.ok(draw.includes("this.#handlesContainer = this.addChild(new PIXI.Container())"), "the handles container is the one interactive container");
  assert.match(method(layer, /\n {2}#passive\(/), /eventMode = "none"/);
});

test("the cursor classes the layer sets exist in the stylesheet", () => {
  for (const cls of ["bi-loc-crosshair", "bi-loc-grabbing"]) {
    assert.match(layer, new RegExp(`"${cls}"`), `${cls} is not applied by the layer`);
    assert.match(css, new RegExp(`#board\\.${cls}\\s*\\{[^}]*cursor:[^}]*!important`), `${cls} has no !important cursor rule (PIXI sets the cursor inline)`);
  }
});

test("zoom redraws are wired: a canvasPan hook feeds onViewChange", () => {
  assert.match(layer, /Hooks\.on\("canvasPan"/);
  assert.match(layer, /onViewChange\(view\?\.scale\)/);
});

test("saving only writes what changed: geometry for a reshaped region, fields when they differ, nothing for a look", () => {
  const save = method(panel, /\n {2}static async #onSave\(/);
  assert.match(save, /fieldsEdited\(/);
  assert.match(save, /itemGeometryChanged\(/);
  assert.match(save, /NothingChanged/);
  assert.match(save, /markItemSaved/, "a saved outline must become the new 'as opened' or a second Save writes it again");
});

test("the panel's selected item is the layer's LIVE one, never the snapshot it was handed at selection time", () => {
  // Dragging a handle replaces the item in the layer's session without the panel hearing about each drag. Reading the
  // snapshot meant Save wrote the outline the item had when it was SELECTED, not the one the GM had just reshaped.
  const getter = method(panel, /\n {2}get #selectedItem\(/);
  assert.match(getter, /canvas\.locationDraw\?\.getSession\?\.\(\)\.items/);
  assert.match(panel, /this\.#selectedItems = this\.#selectedItems\.map\(/, "onSessionChange must refresh the selection from the new list, not just filter the stale one");
});

/* ------------------------------------------------------------------ */
/*  The Story tab (design/location-editor.md §12)                       */
/* ------------------------------------------------------------------ */

const storyTpl = read("templates", "location-editor", "story.hbs");
const navTpl = read("templates", "location-editor", "nav.hbs");
const journeysTpl = read("templates", "location-editor", "journeys.hbs");
const placesTpl = read("templates", "location-editor", "places.hbs");

test("every data-action in the panel's templates is a registered action, and every action is used", () => {
  const used = new Set();
  for (const tpl of [template, storyTpl, navTpl, journeysTpl, placesTpl]) for (const m of tpl.matchAll(/data-action="([A-Za-z]+)"/g)) used.add(m[1]);
  const block = panel.slice(panel.indexOf("actions: {"), panel.indexOf("static PARTS"));
  const registered = new Set([...block.matchAll(/^\s+([A-Za-z]+): LocationEditorApplication\./gm)].map((m) => m[1]));
  assert.deepEqual([...used].filter((a) => !registered.has(a)), [], "a button with no handler does nothing, silently");
  assert.deepEqual([...registered].filter((a) => !used.has(a)), [], "an action no template can reach is dead code");
});

test("the panel is five parts: the tab bar (with the player bar and the pin card), the Story, the Journeys, the Places and the map tools, each hidden when it is not the current tab", () => {
  assert.match(panel, /nav: \{ template: `modules\/\$\{MODULE_ID\}\/templates\/location-editor\/nav\.hbs` \}/);
  assert.match(panel, /story: \{ template/);
  assert.match(panel, /journeys: \{ template/);
  assert.match(panel, /places: \{ template/);
  assert.match(storyTpl, /<div class="bi-story"\{\{#unless \(eq tab "story"\)\}\} hidden\{\{\/unless\}\}>/);
  assert.match(journeysTpl, /<div class="bi-journeys"\{\{#unless \(eq tab "journeys"\)\}\} hidden\{\{\/unless\}\}>/);
  assert.match(placesTpl, /<div class="bi-places"\{\{#unless \(eq tab "places"\)\}\} hidden\{\{\/unless\}\}>/);
  assert.match(template, /\{\{#unless \(eq tab "map"\)\}\} hidden\{\{\/unless\}\}/);
  assert.match(css, /\.bi-location-editor \[hidden\] \{ display: none !important; \}/, "the part's own display rule must not defeat [hidden]");
});

test("the focus highlight is a passive container, above everything else", () => {
  const draw = method(layer, /\n {2}async _draw\(/);
  assert.ok(draw.includes("this.#focusContainer = this.addChild(this.#passive(new PIXI.Container()))"));
  assert.ok(draw.indexOf("#focusContainer") > draw.indexOf("#overlayContainer"), "added last, so it draws on top");
});

test("a placement is only ever written as 'site' records after a confirm, linked slots only if ticked", () => {
  const confirm = method(panel, /\n {2}static async #onConfirmStage\(/);
  assert.match(confirm, /op: "site"/);
  assert.match(confirm, /staged\.linked\.filter\(\(l\) => l\.checked\)/);
  assert.match(confirm, /before: write\.before, beforeVia: write\.beforeVia/);
  for (const name of ["#onPickOnMap", "#onClearSlot", "#onStagePick"]) {
    assert.doesNotMatch(method(panel, new RegExp(String.raw`\n {2}static (async )?${name}\(`)), /saveLocationEdit/, `${name} only stages; the confirm writes`);
  }
});

test("a place drawn for a scene goes straight to the placement confirm, naming the record that drew it", () => {
  const save = method(panel, /\n {2}static async #onSave\(/);
  assert.match(save, /this\.#drawFor/);
  assert.match(save, /viaRecord: record\.id/);
});

test("the pull applies 'site' records through the shared core and never touches a location file for them", () => {
  const merge = readFileSync(path.join(repoRoot, "tools", "location-sync", "merge.mjs"), "utf8");
  assert.match(merge, /if \(record\.op === "site"\) return applySiteRecord\(/);
  const siting = readFileSync(path.join(repoRoot, "tools", "location-sync", "siting.mjs"), "utf8");
  assert.match(siting, /core\/siting\.mjs/);
  assert.doesNotMatch(siting, /locations\/\$\{/, "a placement writes scene data, not locations");
});

test("the Story reads the same deployed paths the Scene Runner and the world map read", () => {
  const story = read("scripts", "foundry", "location-story.mjs");
  assert.match(story, /data\/campaign\/campaign\/scene-set\.json/);
  assert.match(story, /data\/campaign\/episodes/);
  assert.match(story, /data\/campaign\/scene-briefs/);
  const cityLayer = read("scripts", "foundry", "city-layer.mjs");
  assert.match(cityLayer, /data\/campaign\/campaign\/scene-set\.json/, "if the Scene Set moves, both must move");
});

/* ------------------------------------------------------------------ */
/*  Journeys, Places and the quick pin (design/location-editor.md section 16) */
/* ------------------------------------------------------------------ */

const journeysJs = read("scripts", "foundry", "location-journeys.mjs");
const pinJs = read("scripts", "foundry", "location-pin.mjs");
const placesJs = read("scripts", "foundry", "location-places.mjs");
const overlayJs = read("scripts", "foundry", "journey-overlay.mjs");
const dataJs = read("scripts", "foundry", "journey-data.mjs");
const journeysCss = read("styles", "bi-journeys.css");
const lang = JSON.parse(read("lang", "en.json"));

test("the journey overlay is a passive container between the hover outline and the focus highlight, so a line never hides a label and never takes a click", () => {
  const draw = method(layer, /\n {2}async _draw\(/);
  assert.ok(draw.includes("this.#journeyContainer = this.addChild(this.#passive(new PIXI.Container()))"));
  assert.ok(draw.indexOf("#overlayContainer") < draw.indexOf("#journeyContainer") && draw.indexOf("#journeyContainer") < draw.indexOf("#focusContainer = "));
  assert.match(draw, /this\.#journey\?\.attach\(this\.#journeyContainer\)/, "each scene's new container is handed to the overlay");
  assert.match(method(layer, /\n {2}async _tearDown\(/), /this\.#journey\?\.detach\(\)/, "a scene change must release the ticker before Foundry destroys the container");
});

test("leaving the editor takes the journeys, a waiting pin and a playing token off the canvas", () => {
  const quit = method(layer, /\n {2}quit\(/);
  assert.match(quit, /this\.disarmPin\(\{ cancelled: true \}\)/);
  assert.match(quit, /this\.#journey\?\.clear\(\)/);
  assert.match(method(layer, /\n {2}_deactivate\(/), /this\.#journey\?\.setVisible\(false\)/, "another layer taking over pauses the playback");
  assert.match(panel, /this\.#pin\.cancel\(\{ quiet: true \}\)/, "closing the panel ends a pin being placed");
});

test("a pin waiting for its click is an Escape-able state, ends with any other tool, and its click is the pick tool's own release", () => {
  assert.match(method(layer, /\n {2}hasEscapableState\(/), /this\.#pinArm/);
  assert.match(method(layer, /\n {2}_onDismissKey\(/), /this\.disarmPin\(\{ cancelled: true \}\)/);
  assert.match(method(layer, /\n {2}setTool\(/), /this\.disarmPin\(\{ cancelled: true \}\)/);
  assert.match(method(layer, /\n {2}#pickAt\(/), /if \(this\.#pinArm\)/, "the pin is taken on release, so a drag still pans the map");
  assert.match(method(layer, /\n {2}#onMouseMove\(/), /this\.#pinArm\?\.onMove/);
});

test("the camera and the clock are the canvas's: playback runs on its ticker and never re-renders the panel", () => {
  assert.doesNotMatch(overlayJs, /setInterval|setTimeout|requestAnimationFrame/, "the overlay animates on the canvas ticker only");
  assert.match(layer, /canvas\.app\.ticker\.add\(tick\)/);
  assert.match(layer, /canvas\.app\.ticker\.remove\(tick\)/);
  const paint = method(journeysJs, /\n {2}#paint\(/);
  assert.doesNotMatch(paint, /rerender|\.render\(/, "a render of the whole window every frame is what this must never do");
  assert.match(paint, /querySelector/, "the bar is updated in place");
  const pinPaint = method(pinJs, /\n {2}#paint\(/);
  assert.doesNotMatch(pinPaint, /rerender|\.render\(/);
});

test("the journeys are planned by the router the tokens walk with, on the very same graph object", () => {
  assert.match(dataJs, /routerFor\(graph\)/);
  assert.match(dataJs, /loadTravelGraph/);
  const travel = read("scripts", "foundry", "travel.mjs");
  assert.match(travel, /export async function loadTravelGraph/);
  assert.match(travel, /routerFor\(graph\)\.plan\(/, "foundry/travel.mjs routes with the same cached router");
});

test("a placement staged in the Story is judged against the journeys before it is confirmed, and judging writes nothing", () => {
  const judge = method(panel, /\n {2}#judgeStaged\(/);
  assert.match(judge, /whatIfFor\(/);
  assert.doesNotMatch(judge, /saveLocationEdit/);
  assert.match(method(panel, /\n {2}#stagePlace\(/), /this\.#judgeStaged\(\)/);
  assert.match(method(panel, /\n {2}static #onToggleLinked\(/), /this\.#judgeStaged\(\)/, "ticking a linked slot changes what the journeys become");
  assert.doesNotMatch(read("scripts", "core", "journey-whatif.mjs"), /saveLocationEdit|writeStorageJson/, "the what-if is pure");
});

test("a quick pin writes exactly what the long way writes: one 'create' for a point, one 'site' per slot pointing at it, and only on Place", () => {
  const confirm = method(pinJs, /\n {2}async confirm\(/);
  assert.match(confirm, /op: "create", tier: "point"/);
  assert.match(confirm, /op: "site"[^}]*viaRecord: record\.id/);
  assert.match(confirm, /before: slot\.before, beforeVia: slot\.beforeVia/, "each slot remembers what the editor saw, for the pull's clash check");
  for (const name of ["start", "#onMove", "#onPick", "#show", "toggleSnap", "move", "cancel"]) {
    const body = method(pinJs, new RegExp(String.raw`\n {2}(async )?${name.replace("#", "#")}\(`));
    assert.doesNotMatch(body, /saveLocationEdit/, `${name} only previews; the confirm writes`);
  }
  assert.match(panel, /static #onConfirmPin\(\)\s*\{\s*return this\.#pin\.confirm\(\)/);
});

test("moving everything at a place writes one 'site' record per ticked slot, and only on confirm", () => {
  const confirm = method(placesJs, /\n {2}async confirm\(/);
  assert.match(confirm, /for \(const write of plan\.writes\)/);
  assert.match(confirm, /op: "site"/);
  assert.match(confirm, /before: write\.before, beforeVia: write\.beforeVia/);
  for (const name of ["startBulk", "toggleSlot", "choose", "stagePick", "#recompute", "pickOnMap", "pinForAll"]) {
    assert.doesNotMatch(method(placesJs, new RegExp(String.raw`\n {2}(async )?${name}\(`)), /saveLocationEdit/, `${name} only previews`);
  }
});

test("the Story's 'Drop a pin' is the one-step card; the long way is still there for a building", () => {
  assert.match(storyTpl, /data-action="quickPin"/);
  assert.doesNotMatch(storyTpl, /data-action="drawFor" data-kind="point"/);
  assert.match(storyTpl, /data-action="drawFor" data-kind="site"/);
});

test("the controllers reach the panel only through the bridge it lends them, and the panel builds them before first use", () => {
  assert.match(panel, /#journeys = new LocationJourneys\(this\.#bridge\(\)\)/);
  assert.match(panel, /#places = new LocationPlaces\(this\.#bridge\(\)\)/);
  assert.match(panel, /#pin = new LocationPin\(this\.#bridge\(\)\)/);
  for (const [name, source] of [["location-journeys", journeysJs], ["location-pin", pinJs], ["location-places", placesJs]]) {
    assert.doesNotMatch(source, /canvas\.locationDraw/, `${name} asks for the layer through the host`);
    assert.doesNotMatch(source, /foundry\.applications/, `${name} is not an application`);
  }
});

test("the stylesheet ships, is in the manifest, balances its braces, and has a rule for every class the new templates use", () => {
  const manifest = JSON.parse(read("module.json"));
  assert.ok(manifest.styles.includes("styles/bi-journeys.css"));
  assert.equal((journeysCss.match(/\{/g) ?? []).length, (journeysCss.match(/\}/g) ?? []).length);
  const used = new Set();
  for (const tpl of [navTpl, journeysTpl, placesTpl]) for (const m of tpl.matchAll(/class="([^"]+)"/g)) for (const c of m[1].replace(/\{\{[^}]*\}\}/g, " ").split(/\s+/)) if (/^bi-(jbar|pin|journeys|places)/.test(c)) used.add(c);
  const missing = [...used].filter((c) => !journeysCss.includes(`.${c}`));
  assert.deepEqual(missing, [], "a class the templates use that no rule styles");
  for (const c of ["bi-story__leg", "bi-story__leg-badge", "bi-story__place-problem", "bi-story__whatif"]) assert.ok(journeysCss.includes(`.${c}`), c);
});

test("every language key the new templates and controllers use exists", () => {
  const has = (key) => key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), lang) !== undefined;
  const missing = [];
  for (const [name, source] of [["nav", navTpl], ["story", storyTpl], ["journeys", journeysTpl], ["places", placesTpl], ["panel", panel]]) {
    for (const m of source.matchAll(/["'](BLANKINHERITANCE\.LocationEditor\.[A-Za-z.]+)["']/g)) if (!has(m[1])) missing.push(`${name}: ${m[1]}`);
  }
  for (const [name, source, prefix] of [["journeys", journeysJs, "Journeys"], ["pin", pinJs, "Pin"], ["places", placesJs, "Places"]]) {
    for (const m of source.matchAll(/\bL\("([A-Za-z.]+)"/g)) if (!has(`BLANKINHERITANCE.LocationEditor.${prefix}.${m[1]}`)) missing.push(`${name}: ${prefix}.${m[1]}`);
  }
  for (const m of layer.matchAll(/["'](BLANKINHERITANCE\.LocationEditor\.[A-Za-z.]+)["']/g)) if (!has(m[1])) missing.push(`layer: ${m[1]}`);
  assert.deepEqual(missing, [], "a key with no text shows as its own name on the panel");
});
