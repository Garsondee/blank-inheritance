/**
 * The travel trail — every connected client draws the same route line,
 * for the same reason foundry/travel-camera.mjs follows the same
 * `updateToken` event instead of a bespoke broadcast: Foundry already
 * replicates the token's own position (and the `travelPath`/
 * `travelDestination` flags foundry/travel.mjs's own animateTokenAlongHops
 * stamps) to every client, so hooking that one real event keeps this and
 * the camera perfectly in sync with no second protocol to drift.
 *
 * Drawn on `canvas.controls` — the same layer Foundry's own Ruler, pings
 * and door controls use for ephemeral, per-client, non-scene-content
 * overlays (client/canvas/layers/controls.mjs). This is a visual aid, not
 * game state: it is never written to a Scene document, and it is rebuilt
 * from scratch (clearAllTrails) on every canvasReady, the same moment
 * Foundry itself tears down and rebuilds that whole layer for a new scene.
 */

import { splitTrail, MODE_COLOR } from "../core/travel-trail.mjs";
import { isTravelling } from "./travel-camera.mjs";

const MODULE_ID = "blank-inheritance";
const LINE_WIDTH = 6;
const TRAVELED_ALPHA = 0.9;
const REMAINING_ALPHA = 0.25;
const FALLBACK_COLOR = 0x9a9a9a; // an unmapped/unknown mode -- should not happen, never invents a specific one

const graphicsByTokenId = new Map();

function graphicsFor(tokenId) {
  let g = graphicsByTokenId.get(tokenId);
  if (!g || g.destroyed) {
    g = canvas.controls.addChild(new PIXI.Graphics());
    graphicsByTokenId.set(tokenId, g);
  }
  return g;
}

function drawSegments(g, segments, alpha) {
  for (const segment of segments) {
    const color = MODE_COLOR[segment.mode] ?? FALLBACK_COLOR;
    g.lineStyle(LINE_WIDTH, color, alpha);
    g.moveTo(segment.from.x, segment.from.y);
    g.lineTo(segment.to.x, segment.to.y);
  }
}

function drawTrail(tokenDoc) {
  const path = tokenDoc.getFlag(MODULE_ID, "travelPath");
  if (!Array.isArray(path) || path.length < 2) return;
  const { traveled, remaining } = splitTrail(path, { x: tokenDoc.x, y: tokenDoc.y });
  const g = graphicsFor(tokenDoc.id);
  g.clear();
  // Remaining first, so the solid travelled line always draws on top at
  // the shared boundary point rather than the faded one covering it.
  drawSegments(g, remaining, REMAINING_ALPHA);
  drawSegments(g, traveled, TRAVELED_ALPHA);
}

/** Remove one token's own trail graphics — a journey's marker/candidate being deleted, or a stale reference from a scene that no longer exists. */
export function clearTrail(tokenId) {
  const g = graphicsByTokenId.get(tokenId);
  if (g) {
    if (!g.destroyed) g.destroy();
    graphicsByTokenId.delete(tokenId);
  }
}

/** Every trail this client is currently tracking — canvasReady's own full reset (a new scene tears down and rebuilds canvas.controls itself, so any graphics reference from before is already stale). */
export function clearAllTrails() {
  for (const tokenId of [...graphicsByTokenId.keys()]) clearTrail(tokenId);
}

/** Wired once at module init (blank-inheritance.mjs) — every client, not only the GM, same as registerTravelCameraHook. */
export function registerTravelTrailHook() {
  Hooks.on("updateToken", (tokenDoc, changes) => {
    if (!("x" in changes) && !("y" in changes)) return;
    if (!isTravelling(tokenDoc)) return;
    drawTrail(tokenDoc);
  });
  Hooks.on("deleteToken", (tokenDoc) => clearTrail(tokenDoc.id));
  Hooks.on("canvasReady", () => clearAllTrails());
}
