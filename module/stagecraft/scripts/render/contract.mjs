/**
 * What every renderer provides (renderer.md §8.1). A backend turns a snapshot of the stage into a picture and answers
 * a few questions about it; it knows nothing about Foundry, the network or the campaign.
 *
 *   mount(element, options)   take over a place on the page. `options.quality` is a tier name.
 *   unmount()                 give it back
 *   async load(description, skin, people)   build the painting, rig, set pieces, lights and the first cards
 *   resize(width, height, ratio)            the place changed size
 *   setView(view)             look through another view (core/look.mjs `viewOf`): the screen panned or zoomed. `resize`
 *                             puts the plain cover (rigspace.mjs `viewFor`) back until a view is given again
 *   setQuality(tier)          "high" or "low"
 *   draw(snapshot, dt)        draw this moment. `snapshot` is Stage#snapshot()
 *   addCard(person) / removeCard(id)        the cast changed
 *   refreshCard(person)       optional: a card's words changed (a name learned, a line of text edited): draw its face again.
 *                             A skin is handed `helpers.titleBlock` (render/titleblock.mjs) to lay them out with
 *   pick(x, y)                what is under this point (viewport px): { kind: "card", id } or null
 *   floorAt(x, y, height)     the floor coordinates { x, z } of a viewport point, on a plane `height` above the floor
 *   project(world)            where a world point { X, Y, Z } falls, in viewport px: { x, y, k }
 *   capture(options)          a still image of the stage (a Blob)
 *   stats()                   { calls, triangles, textures, geometries } for the tests and the HUD
 *   dispose()                 free everything this backend made
 *   capabilities              what it can do, by name; features ask this and never the backend's name
 *
 * A backend with the `chalk` capability also shows the painted wall and the box of chalk (chalk.md §5):
 *
 *   setChalkTiles(wall, keys, full)   these tiles of the wall (render/paint/wall.mjs) changed; `full`: show it all afresh
 *   setChalkHidden(hidden) / setChalkBox(visible) / setChalkBoxAt([fx, fy])   (the box moves clear of what covers it)
 *   paintingAt(x, y)          the point of the painting under a viewport point (fractions), or null
 *   paintingColour(fx, fy)    the painting's own colour there, "#rrggbb", for the colour picker
 *   pick(x, y) also answers { kind: "chalk", colour } (a stick), { kind: "magic" } and { kind: "eraser" }
 */

export const TIERS = Object.freeze(["high", "low", "flat"]);

export const CAPABILITIES = Object.freeze([
  "lights", "shadows", "post", "particles", "marks", "zoneOutlines", "chalk", "camera", "capture", "footlights"
]);

const METHODS = ["mount", "unmount", "load", "resize", "setView","setQuality", "draw", "addCard", "removeCard", "pick", "floorAt", "project", "capture", "stats", "dispose"];

/** Throws a plain sentence if an object is not a backend. Used by the registry and by tests. */
export function assertBackend(b, name = "backend") {
  for (const m of METHODS) if (typeof b?.[m] !== "function") throw new Error(`${name} does not provide ${m}()`);
  if (!b.capabilities || typeof b.capabilities !== "object") throw new Error(`${name} does not declare its capabilities`);
  for (const k of Object.keys(b.capabilities)) if (!CAPABILITIES.includes(k)) throw new Error(`${name} declares an unknown capability "${k}"`);
  return b;
}

/** What a tier switches off. `flat` is a different backend; this is about the three.js one. */
export function tierSettings(tier) {
  if (tier === "low") return { post: false, shadows: false, msaa: 0, pixelRatioCap: 1, maxPixels: 4_000_000, dust: 120, sparks: 24, footlights: false };
  return { post: true, shadows: true, msaa: 4, pixelRatioCap: 2, maxPixels: 8_500_000, dust: 420, sparks: 48, footlights: true };
}

/**
 * The pixel ratio a picture of w x h window pixels is drawn at: the display's own, up to the tier's cap, and no more than
 * keeps the picture within the tier's pixel budget (8.5 million: a 4K screen at its own scale, which nobody sees beyond;
 * a 1440p window on a display scaled to 2 would be 14.7 million). The fill cost of the lit stage, and the video memory of its
 * multisampled targets, grow with the pixels. Never below 1 (or below what the display asks, if that is less): a window is
 * never drawn at less than one picture pixel to a page pixel for the sake of the budget.
 */
export function pixelRatioFor(width, height, dpr, { pixelRatioCap = 2, maxPixels = Infinity } = {}) {
  const want = Math.min(Number(dpr) > 0 ? Number(dpr) : 1, pixelRatioCap);
  const fit = Math.sqrt(maxPixels / Math.max(1, width * height));
  return Math.max(Math.min(1, want), Math.min(want, fit));
}
