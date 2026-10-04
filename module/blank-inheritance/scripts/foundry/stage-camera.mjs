/**
 * The camera on a theatre-of-the-mind scene: where it starts, and where it goes
 * back to when the GM's Scene Runner opens beside it.
 *
 * It used to be PINNED: a staged scene was treated as a picture nobody should
 * move, by replacing Foundry's `Canvas#_constrainView` so every pan and zoom
 * came back to the same cover frame. Ingram, 2026-10-04: "We currently lock
 * the camera position and zoom during scenes but that's a bad idea. Let's free
 * the user to pan and zoom in and out again." So nothing is overridden any
 * more: Foundry's own wheel, drag and keys work on a staged scene exactly as
 * on any other, and this file only ever MOVES the camera, through Foundry's
 * public `pan`/`animatePan`, at two moments:
 *
 *   - when the scene is drawn: the picture starts framed (core/camera-fit.mjs
 *     #stageFrame), since Foundry's own `initial` view cannot know about the
 *     drawer;
 *   - when the drawer opens, shuts or is dragged wider (foundry/scene-runner.mjs
 *     relayoutAroundRunner): "when the scene runner is opened it would be great
 *     if the camera zoomed out and repositioned the scene so that it fits as
 *     best as possible in the width remaining" (Ingram, same day).
 *
 * Stagecraft scenes are not drawn by Foundry's canvas at all; their camera is
 * Stagecraft's own (its core/look.mjs), told about the
 * drawer through foundry/stagecraft-bridge.mjs. This file is for the
 * adventure's older staged scenes, drawn by Foundry.
 */

import { stageFrame } from "../core/camera-fit.mjs";

const MODULE_ID = "blank-inheritance";

/**
 * How much of the window, from its left edge, the GM's Scene Runner covers
 * right now — 0 on every player's client (the runner is never mounted there)
 * and whenever the drawer is shut.
 *
 * The drawer HOST never moves; only its inner shell slides (see
 * foundry/deck.mjs#fitDeck, which reads it the same way), so the host's
 * right edge is where the drawer's edge is once it has finished opening —
 * the right answer to give a camera being set at the moment it opens.
 */
export function drawerInset() {
  const host = globalThis.document?.getElementById("bi-scene-runner");
  if (!host?.querySelector(".bi-runner-shell--open")) return 0;
  return Math.max(0, host.getBoundingClientRect().right);
}

/** True when this scene is meant to be staged rather than played on. */
export function isStagedScene(scene) {
  return Boolean(scene?.getFlag?.(MODULE_ID, "stage"));
}

/** The frame for the staged scene on screen now, beside the drawer if it is open; null if there is none. */
function frameNow() {
  if (!canvas?.ready || !isStagedScene(canvas.scene)) return null;
  const d = canvas.dimensions;
  return stageFrame({
    sceneX: d.sceneX,
    sceneY: d.sceneY,
    sceneWidth: d.sceneWidth,
    sceneHeight: d.sceneHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    leftInset: drawerInset()
  });
}

/**
 * A staged scene has just been drawn: start it framed. Nothing is held — the
 * viewer can pan and zoom away at once. A no-op on an ordinary scene, where
 * Foundry's own `initial` view (or the viewer's remembered one) stands.
 */
export function syncCameraToScene() {
  const frame = frameNow();
  if (!frame) return false;
  canvas.pan(frame);
  return true;
}

/**
 * The space beside the camera changed — the Scene Runner opened, shut or was
 * dragged wider: glide a staged scene back to the frame that fits what is left.
 * A no-op on an ordinary scene, where the GM owns the camera.
 */
export function refitStageCamera() {
  const frame = frameNow();
  if (!frame) return false;
  canvas.animatePan({ ...frame, duration: 400 });
  return true;
}
