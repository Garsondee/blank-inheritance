/**
 * Locking the camera for a theatre-of-the-mind scene.
 *
 * A staged scene is a picture, not a map. Nobody should be able to drag it
 * around, and a player who has scrolled the background half off screen is
 * looking at a bug as far as they are concerned.
 *
 * WHAT FOUNDRY v14.367 ACTUALLY OFFERS — checked in the real source, because
 * the obvious guesses are all wrong:
 *
 *   There is NO Scene field, NO setting and NO cancellable hook for this. The
 *   `canvasPan` hook exists (client/canvas/board.mjs:1775) but is dispatched
 *   with `Hooks.callAll`, which "can not be handled by returning false"
 *   (client/helpers/hooks.mjs:108-114) — and it fires AFTER `stage.pivot` and
 *   `stage.scale` have already been assigned (board.mjs:1763, :1767). So a
 *   hook can only ever correct the camera one frame late, visibly.
 *
 *   `Canvas#_constrainView` (board.mjs:1902) is the ONE choke point. Every
 *   pan and zoom in the application routes through `Canvas#pan`, which calls
 *   it at board.mjs:1759 before touching the stage, and `animatePan` calls it
 *   at :1806. A repo-wide search for `stage.pivot.set` / `stage.scale.set`
 *   across client/ returns exactly the two lines inside `pan`. Overriding it
 *   is therefore complete rather than a game of whack-a-mole across the seven
 *   input paths (wheel, right-drag, edge-drag, eight keybinds, resize,
 *   recenter, ping).
 *
 *   It is marked `@internal`, so this is undocumented API and a version
 *   upgrade could move it. That is what the contract test in
 *   test/tier3-contract.test.mjs is for: if the method stops existing, the
 *   suite says so loudly instead of the camera quietly coming unstuck.
 *
 * The default clamp is worth knowing even so: unmodified, Foundry lets the
 * pivot wander ±40% of a viewport beyond the canvas rect (board.mjs:1912-1915),
 * so "the scene is exactly the size of the image" does NOT stop dragging on
 * its own. It has to be replaced, not merely fitted.
 */

import { coverFrame } from "../core/camera-fit.mjs";

const MODULE_ID = "blank-inheritance";

/** The prototype method we replaced, so unlock is exact rather than approximate. */
let originalConstrainView = null;

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
function drawerInset() {
  const host = globalThis.document?.getElementById("bi-scene-runner");
  if (!host?.querySelector(".bi-runner-shell--open")) return 0;
  return Math.max(0, host.getBoundingClientRect().right);
}

/** True when this scene is meant to be staged rather than played on. */
export function isStagedScene(scene) {
  return Boolean(scene?.getFlag?.(MODULE_ID, "stage"));
}

/**
 * Pin the camera to the centre of the scene at cover scale.
 *
 * Idempotent: re-locking replaces the pin rather than stacking overrides, so
 * calling this on every canvasReady is safe.
 */
export function lockCamera() {
  if (!canvas?.ready) return false;

  const proto = Object.getPrototypeOf(canvas);
  if (typeof proto._constrainView !== "function") {
    console.warn("Blank Inheritance | Canvas#_constrainView is gone; the stage camera cannot be locked.");
    return false;
  }
  if (!originalConstrainView) originalConstrainView = proto._constrainView;

  proto._constrainView = function biStageConstrainView() {
    const d = this.dimensions;
    // COVER, not contain: a letterboxed picture with two black bands is a
    // slide, and this is meant to be the room the characters are standing
    // in. The cost is that a wide image loses a little off each side, which
    // is why the staged backgrounds are authored at 2:1 -- the crop lands in
    // the margins rather than through the middle of anything.
    //
    // Covers the part of the window the viewer can SEE: the whole window for
    // a player, the band right of the Scene Runner for a GM who has it open
    // (core/camera-fit.mjs#coverFrame). Centred on the SCENE rect, not the
    // padded canvas rect -- with padding 0 they are the same thing, but a
    // staged scene created by hand may not have padding 0, and the picture
    // should still be centred. Recomputed on every call rather than
    // captured, so a window resize or the drawer opening simply produces the
    // right answer the next time `pan` runs (Canvas#_onResize calls `pan` at
    // board.mjs:2460, which calls this; foundry/scene-runner.mjs calls
    // refitStageCamera when the drawer opens, shuts or is dragged).
    return (
      coverFrame({
        sceneX: d.sceneX,
        sceneY: d.sceneY,
        sceneWidth: d.sceneWidth,
        sceneHeight: d.sceneHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        leftInset: drawerInset()
      }) ?? { x: d.sceneX + d.sceneWidth / 2, y: d.sceneY + d.sceneHeight / 2, scale: 1 }
    );
  };

  // NOT ALSO CONFIG.Canvas.minZoom/maxZoom, though that is the obvious second
  // lever and the first version of this file pulled it. FOUND LIVE: those two
  // are read by Canvas##getDimensions (board.mjs:632-645) and BAKED INTO
  // `dimensions.scale.min/max` at draw time (board.mjs:1157). The next scene's
  // dimensions are computed BEFORE any hook we can listen on — canvasInit
  // fires at board.mjs:1170, thirteen lines too late — so a scene opened while
  // they were pinned kept the pinned zoom range after unlocking, and an
  // ordinary battle map came out frozen at the stage's cover scale. Measured:
  // scale stuck at 1.125 across three explicit zoom attempts.
  //
  // The override above already ignores the requested scale outright, so those
  // values were never doing any work — only harm.

  canvas.pan({});
  return true;
}

/** Put everything back exactly as it was. Safe to call when nothing is locked. */
export function unlockCamera() {
  if (!originalConstrainView) return false;
  const proto = Object.getPrototypeOf(canvas ?? {});
  if (proto) proto._constrainView = originalConstrainView;
  originalConstrainView = null;
  return true;
}

/** Lock or unlock to match the scene now on screen. The only thing hooks need to call. */
export function syncCameraToScene(scene = canvas?.scene) {
  if (isStagedScene(scene)) return lockCamera();
  return unlockCamera();
}

/**
 * Re-pin a locked camera after the space beside it changed — the Scene
 * Runner opening, shutting or being dragged wider. A plain `pan` rather than
 * `animatePan`: the override above ignores whatever position it is asked
 * for, so an animated pan would jump on its first frame anyway. A no-op on
 * an ordinary (unlocked) scene, where the GM owns the camera.
 */
export function refitStageCamera() {
  if (!originalConstrainView || !canvas?.ready) return false;
  canvas.pan({});
  return true;
}

/** Test seam: is the camera currently pinned? */
export function isCameraLocked() {
  return Boolean(originalConstrainView);
}
