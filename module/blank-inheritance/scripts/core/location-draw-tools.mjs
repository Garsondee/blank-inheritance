/**
 * The Location Editor's tool vocabulary -- one list, shared by Foundry's own
 * scene-controls dock, the panel's tool buttons and the draw layer, so the
 * three can never drift apart again (design/location-editor.md §10 phase 7).
 *
 * Pure: no Foundry globals. test/tier1-location-draw-tools.test.mjs holds it.
 *
 * Two things this file exists to make impossible:
 *
 *  1. A tool named "select" or "target". Foundry's canvas treats those two
 *     names as ITS OWN rubber-band tools (client/canvas/board.mjs: every drag
 *     dispatch begins `["select", "target"].includes(game.activeTool)` and
 *     takes a branch that never reaches the active layer). A layer tool that
 *     borrows the name silently loses every left-drag to Foundry. The first
 *     version of this editor called its default tool "select".
 *  2. A dock whose `tools` is an array. SceneControls keys tools by name
 *     (`Object.entries(control.tools)`, `control.tools[event.target.dataset.tool]`),
 *     so an array reads as tools called "0", "1", ... and the dock's own click
 *     handler crashes on `undefined.button`.
 */

/** Every tool the editor has, in dock order. */
export const TOOLS = Object.freeze(["pick", "lasso", "polygon", "rect", "circle", "point", "bisect"]);

/** What is active when the editor opens: look around, click a shape to open it, drag to pan. */
export const DEFAULT_TOOL = "pick";

/** Names Foundry's own canvas reserves -- see the file header. A tool may never take one. */
export const RESERVED_TOOL_NAMES = Object.freeze(["select", "target"]);

/** Tools whose gesture is a left-button DRAG (everything else is clicks only). */
export const DRAG_TOOLS = Object.freeze(["pick", "rect", "circle"]);

/**
 * Presentation: the button's lang key, the idle hint's lang key and the icon.
 * The keys are written out in full on purpose -- test/tier0-architecture's
 * localisation check scans the source for literal keys, and a key built from
 * a template string would be invisible to it (and to a typo).
 */
export const TOOL_DEFS = Object.freeze({
  pick: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Select", hint: "BLANKINHERITANCE.LocationEditor.Hint.pick", icon: "fa-solid fa-arrow-pointer" }),
  lasso: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Lasso", hint: "BLANKINHERITANCE.LocationEditor.Hint.lasso", icon: "fa-solid fa-lasso" }),
  polygon: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Polygon", hint: "BLANKINHERITANCE.LocationEditor.Hint.polygon", icon: "fa-solid fa-draw-polygon" }),
  rect: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Rect", hint: "BLANKINHERITANCE.LocationEditor.Hint.rect", icon: "fa-regular fa-square" }),
  circle: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Circle", hint: "BLANKINHERITANCE.LocationEditor.Hint.circle", icon: "fa-regular fa-circle" }),
  point: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Point", hint: "BLANKINHERITANCE.LocationEditor.Hint.point", icon: "fa-solid fa-location-dot" }),
  bisect: Object.freeze({ title: "BLANKINHERITANCE.LocationEditor.Tool.Bisect", hint: "BLANKINHERITANCE.LocationEditor.Hint.bisect", icon: "fa-solid fa-scissors" })
});

/** Anything that is not a tool name becomes the default -- never a throw, never an invented tool. */
export function normaliseTool(name) {
  return TOOLS.includes(name) ? name : DEFAULT_TOOL;
}

/**
 * Which tools the panel offers in a mode (design doc §2's table): Areas draws
 * regions and is the only mode that can bisect one; Places draws buildings
 * (polygon/rect/circle) or pins (point), per the shape-kind toggle.
 */
export function toolsForMode(mode, placesShapeKind = "site") {
  if (mode === "areas") return ["pick", "lasso", "polygon", "rect", "circle", "bisect"];
  return placesShapeKind === "point" ? ["pick", "lasso", "point"] : ["pick", "lasso", "polygon", "rect", "circle"];
}

/** Is `tool` still on offer once the mode (or shape kind) changes? If not the editor falls back to the default. */
export function toolSurvivesModeChange(tool, mode, placesShapeKind) {
  return toolsForMode(mode, placesShapeKind).includes(tool);
}

/**
 * The scene-controls definition for the editor's dock group. Tools are an
 * object keyed by name (see the header); `callbacks` are the live
 * `onChange`/`onToolChange` handlers, passed in so this file stays pure.
 */
export function buildDockControl({ visible, callbacks = {} } = {}) {
  const tools = {};
  TOOLS.forEach((name, index) => {
    const def = TOOL_DEFS[name];
    tools[name] = { name, order: index + 1, title: def.title, icon: def.icon };
  });
  return {
    name: "locationDraw",
    order: 20,
    title: "BLANKINHERITANCE.LocationEditor.ControlGroup",
    layer: "locationDraw",
    icon: "fa-solid fa-draw-polygon",
    visible: Boolean(visible),
    activeTool: DEFAULT_TOOL,
    tools,
    ...callbacks
  };
}
