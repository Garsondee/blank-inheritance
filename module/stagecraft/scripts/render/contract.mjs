/**
 * What every renderer provides (renderer.md §8.1). A backend turns a snapshot of the stage into a picture and answers
 * a few questions about it; it knows nothing about Foundry, the network or the campaign.
 *
 *   mount(element, options)   take over a place on the page. `options.quality` is a tier name.
 *   unmount()                 give it back
 *   async load(description, skin, people)   build the painting, rig, set pieces, lights and the first cards
 *   resize(width, height, ratio)            the place changed size
 *   setQuality(tier)          "high" or "low"
 *   draw(snapshot, dt)        draw this moment. `snapshot` is Stage#snapshot()
 *   addCard(person) / removeCard(id)        the cast changed
 *   pick(x, y)                what is under this point (viewport px): { kind: "card", id } or null
 *   floorAt(x, y, height)     the floor coordinates { x, z } of a viewport point, on a plane `height` above the floor
 *   project(world)            where a world point { X, Y, Z } falls, in viewport px: { x, y, k }
 *   capture(options)          a still image of the stage (a Blob)
 *   stats()                   { calls, triangles, textures, geometries } for the tests and the HUD
 *   dispose()                 free everything this backend made
 *   capabilities              what it can do, by name; features ask this and never the backend's name
 */

export const TIERS = Object.freeze(["high", "low", "flat"]);

export const CAPABILITIES = Object.freeze([
  "lights", "shadows", "post", "particles", "marks", "zoneOutlines", "chalk", "camera", "capture", "footlights"
]);

const METHODS = ["mount", "unmount", "load", "resize", "setQuality", "draw", "addCard", "removeCard", "pick", "floorAt", "project", "capture", "stats", "dispose"];

/** Throws a plain sentence if an object is not a backend. Used by the registry and by tests. */
export function assertBackend(b, name = "backend") {
  for (const m of METHODS) if (typeof b?.[m] !== "function") throw new Error(`${name} does not provide ${m}()`);
  if (!b.capabilities || typeof b.capabilities !== "object") throw new Error(`${name} does not declare its capabilities`);
  for (const k of Object.keys(b.capabilities)) if (!CAPABILITIES.includes(k)) throw new Error(`${name} declares an unknown capability "${k}"`);
  return b;
}

/** What a tier switches off. `flat` is a different backend; this is about the three.js one. */
export function tierSettings(tier) {
  if (tier === "low") return { post: false, shadows: false, msaa: 0, pixelRatioCap: 1, dust: 120, sparks: 24, footlights: false };
  return { post: true, shadows: true, msaa: 4, pixelRatioCap: 2, dust: 420, sparks: 48, footlights: true };
}
