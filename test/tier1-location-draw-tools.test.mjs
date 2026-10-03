// Tier 1 -- the Location Editor's tool vocabulary and its dock group
// (module/blank-inheritance/scripts/core/location-draw-tools.mjs). design/location-editor.md §10 phase 7.
//
// The first version of the editor named its default tool "select" (which Foundry's canvas reserves for its own
// rubber-band, silently stealing every left-drag) and handed the scene-controls dock an ARRAY of tools (the dock
// keys tools by name, so they were called "0".."6" and its click handler crashed). Both are checked here against
// the real Foundry source where it is on disk, so a Foundry upgrade that changes either rule fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDockControl,
  DEFAULT_TOOL,
  DRAG_TOOLS,
  normaliseTool,
  RESERVED_TOOL_NAMES,
  TOOL_DEFS,
  TOOLS,
  toolsForMode,
  toolSurvivesModeChange
} from "../module/blank-inheritance/scripts/core/location-draw-tools.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const lang = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));
const resolveKey = (key) => key.split(".").reduce((node, part) => node?.[part], lang);
const foundryRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "client");
const haveFoundry = existsSync(path.join(foundryRoot, "canvas", "board.mjs"));

test("no tool takes a name Foundry's canvas reserves for its own rubber-band", () => {
  for (const reserved of RESERVED_TOOL_NAMES) assert.ok(!TOOLS.includes(reserved), reserved);
  assert.ok(TOOLS.includes(DEFAULT_TOOL));
  assert.equal(DEFAULT_TOOL, "pick");
});

test("the reserved names really are the ones Foundry's canvas branches on (so the rule above cannot rot)", { skip: !haveFoundry && "Foundry source tree not on disk" }, () => {
  const board = readFileSync(path.join(foundryRoot, "canvas", "board.mjs"), "utf8");
  const matches = board.match(/\["select", "target"\]\.includes\(game\.activeTool\)/g) ?? [];
  assert.ok(matches.length >= 2, "board.mjs no longer dispatches left-drags on game.activeTool being select/target -- re-read it and update RESERVED_TOOL_NAMES");
  assert.deepEqual([...RESERVED_TOOL_NAMES].sort(), ["select", "target"]);
});

test("the dock keys tools by name, the way SceneControls reads them", { skip: !haveFoundry && "Foundry source tree not on disk" }, () => {
  const controls = readFileSync(path.join(foundryRoot, "applications", "ui", "scene-controls.mjs"), "utf8");
  assert.match(controls, /Object\.entries\(control\.tools\)/, "SceneControls no longer iterates control.tools as an object");
  assert.match(controls, /this\.control\.tools\[event\.target\.dataset\.tool\]/, "SceneControls no longer looks a clicked tool up by name");
});

test("every tool has a button label, an idle hint and an icon, and every key exists in lang/en.json", () => {
  for (const tool of TOOLS) {
    const def = TOOL_DEFS[tool];
    assert.ok(def, tool);
    assert.equal(typeof resolveKey(def.title), "string", `${tool}: ${def.title}`);
    assert.equal(typeof resolveKey(def.hint), "string", `${tool}: ${def.hint}`);
    assert.match(def.icon, /^fa-/);
  }
  assert.deepEqual(Object.keys(TOOL_DEFS), [...TOOLS]);
});

test("the dock group: tools are an object keyed by their own name, ordered, with a real default", () => {
  const control = buildDockControl({ visible: true, callbacks: { onChange() {}, onToolChange() {} } });
  assert.equal(Array.isArray(control.tools), false, "an array would make every tool's name its index");
  assert.deepEqual(Object.keys(control.tools), [...TOOLS]);
  const orders = Object.values(control.tools).map((t) => t.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.equal(new Set(orders).size, orders.length, "tools sort by order, so two sharing one are unstable");
  for (const [name, tool] of Object.entries(control.tools)) assert.equal(tool.name, name);
  assert.ok(control.activeTool in control.tools);
  assert.equal(control.name, "locationDraw");
  assert.equal(control.layer, "locationDraw", "the layer name Foundry activates must be the one registered in CONFIG.Canvas.layers");
  assert.equal(control.visible, true);
  assert.equal(typeof control.onChange, "function");
  assert.equal(typeof control.onToolChange, "function");
  assert.equal(buildDockControl({ visible: false }).visible, false);
});

test("the drag tools are tools, and the others are clicks only", () => {
  for (const tool of DRAG_TOOLS) assert.ok(TOOLS.includes(tool));
  assert.deepEqual([...DRAG_TOOLS].sort(), ["circle", "pick", "rect"]);
});

test("normaliseTool: anything that is not a tool name is the default, never an invented tool", () => {
  assert.equal(normaliseTool("polygon"), "polygon");
  for (const bad of ["select", "target", "", null, undefined, 3, "Polygon"]) assert.equal(normaliseTool(bad), "pick", String(bad));
});

test("toolsForMode: Areas can bisect, Places buildings draw shapes, Places pins only drop points; everyone can pick and lasso", () => {
  const areas = toolsForMode("areas");
  assert.ok(areas.includes("bisect") && areas.includes("polygon") && !areas.includes("point"));
  const sites = toolsForMode("places", "site");
  assert.ok(sites.includes("rect") && !sites.includes("bisect") && !sites.includes("point"));
  const pins = toolsForMode("places", "point");
  assert.deepEqual(pins, ["pick", "lasso", "point"]);
  for (const list of [areas, sites, pins]) assert.ok(list.includes("pick") && list.includes("lasso"));
  for (const list of [areas, sites, pins]) for (const tool of list) assert.ok(TOOLS.includes(tool));
});

test("a tool the new mode does not offer does not survive a mode change", () => {
  assert.equal(toolSurvivesModeChange("bisect", "places", "site"), false);
  assert.equal(toolSurvivesModeChange("point", "places", "site"), false);
  assert.equal(toolSurvivesModeChange("polygon", "places", "site"), true);
  assert.equal(toolSurvivesModeChange("pick", "areas", "site"), true);
});
