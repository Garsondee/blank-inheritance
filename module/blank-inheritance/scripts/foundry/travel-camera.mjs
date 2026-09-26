/**
 * The travel camera — every connected client follows the crossing, not
 * just whoever's screen happened to already be pointed at the right spot.
 *
 * Built 2026-09-23 from Ingram's own live reaction to the first real
 * crossing: "the arrow is white on a pale coloured map... the camera was
 * extremely zoomed out... if the group splits so does their view of the
 * map." The framing math itself is core/camera-fit.mjs's own pure
 * fitPointsToViewport; this file is only the wiring — WHICH points a given
 * viewer should be framed on, and calling the one real Foundry API that
 * moves a camera.
 *
 * REWRITTEN the same day from Ingram's own follow-up report: "the camera
 * keeps the token roughly in view but it does so by making about 10 small
 * sharp jerky camera moves... all done in a single smooth Bezier curved
 * camera animation." The ORIGINAL design re-fit the camera independently on
 * every single `updateToken` event — a fresh, unrelated target every
 * ~100-1500ms (one per hop), each interrupting whatever pan was already
 * mid-flight. This version computes ONE curve (core/travel-camera-path.mjs)
 * for the WHOLE journey up front and drives it by elapsed wall-clock time,
 * one requestAnimationFrame tick at a time, calling the instant `canvas.pan`
 * rather than `canvas.animatePan` — the smoothing is this file's own now,
 * not Foundry's internal tween queue fighting itself every hop.
 *
 * WHY A SCENE FLAG, NOT A SOCKET BROADCAST. Foundry already replicates
 * every document update to every connected client on its own — that is the
 * entire realtime layer this module is built on top of everywhere else. A
 * bespoke socket message here would be a second, parallel channel carrying
 * the same fact a Scene update already carries, and a second channel is a
 * second place for the two to drift. `foundry/travel.mjs` stamps ONE
 * `activeJourney` flag on the hub Scene, once, before it starts moving any
 * token — every client's `updateScene` hook fires off the SAME replicated
 * write and computes the SAME curve from it independently; no client asks
 * another client anything.
 *
 * WHY OWNERSHIP DECIDES WHOSE VIEW FOLLOWS WHAT. "If the group splits so
 * does their view" needs a per-viewer answer to "which leg is MINE," and
 * Foundry already has exactly that concept — Document#isOwner, the same
 * permission a player's own controlled token already uses. A GM, or anyone
 * who owns no travelling token yet (true of every viewer today, since the
 * six real PCs don't exist yet), gets the wide shot: every leg in this
 * journey, framed together.
 */

import { fitPointsToViewport } from "../core/camera-fit.mjs";
import { buildCameraKeyframes, cameraAtProgress } from "../core/travel-camera-path.mjs";

const MODULE_ID = "blank-inheritance";
const JOURNEY_FLAG = "activeJourney";

function viewport() {
  const screen = canvas?.app?.renderer?.screen;
  return screen ? { width: screen.width, height: screen.height } : null;
}

/**
 * Is this token a real, in-motion travel token — the generic marker
 * `ensureTravelToken` creates, OR one of the six demo candidates
 * `core/demo-party.mjs`'s own plan moves (foundry/demo-runner.mjs's
 * converge-on-gate step) — anything a table is meant to actually watch
 * cross the map, as opposed to any other Token that happens to sit on the
 * hub scene. Still used by foundry/travel-trail.mjs's own trail-drawing
 * hook — unchanged by this file's own camera rewrite.
 */
export function isTravelling(token) {
  return token.getFlag(MODULE_ID, "kind") === "travel-marker" || token.getFlag(MODULE_ID, "demoParty") === true;
}

/** Pan/zoom THIS client's camera to fit a plain list of scene-space points. Safe to call for a scene that isn't the one currently on screen — it just does nothing. Used for one-off framing (the demo's own establishing shot) — a real in-progress journey uses runJourneyAnimation below instead. */
export function frameCameraOn(scene, points, { durationMs = 1000 } = {}) {
  if (!canvas?.ready || canvas.scene?.id !== scene.id) return;
  const view = viewport();
  if (!view) return;
  const fit = fitPointsToViewport(points, view.width, view.height);
  if (!fit) return;
  canvas.animatePan({ ...fit, duration: durationMs });
}

/**
 * Announce one journey to every connected client, in one write — called by
 * foundry/travel.mjs once every leg's own token is resolved and BEFORE any
 * of them starts moving. `legs` is `[{tokenId, start: {x,y}, end: {x,y},
 * durationMs}, ...]` — one entry per travelling token, in the SAME
 * scene-space animateTokenAlongHops itself animates in.
 */
export async function announceJourney(scene, legs) {
  await scene.setFlag(MODULE_ID, JOURNEY_FLAG, { startedAt: Date.now(), legs });
}

/** The legs THIS viewer should watch: a GM gets every leg in the journey; a player gets only the ones whose token they own, falling back to all of them if they own none yet (true of every viewer today, since the six real PCs don't exist yet) — same rule the old per-marker design used, applied to legs instead of live tokens. */
function relevantLegs(scene, legs) {
  if (game.user?.isGM) return legs;
  const owned = legs.filter((leg) => scene.tokens.get(leg.tokenId)?.isOwner);
  return owned.length > 0 ? owned : legs;
}

const running = new Map(); // sceneId -> stop()

function stopJourneyAnimation(sceneId) {
  running.get(sceneId)?.();
  running.delete(sceneId);
}

// Roughly 30fps -- plenty smooth for a camera drifting across a
// multi-second-to-multi-minute journey, and deliberately a plain
// `setTimeout` tick rather than `requestAnimationFrame`. Found live
// 2026-09-23, verifying this exact file: a real Chrome tab that isn't the
// OS-focused one fully SUSPENDS rAF callbacks -- they never fire again
// until the tab is refocused -- which would silently freeze a player's
// camera the moment they alt-tab away mid-crossing. `setTimeout` in a
// background tab is only throttled (Chrome clamps it to roughly once a
// second), never stopped outright, so the camera keeps advancing --
// slower, but never stuck -- and catches back up to full smoothness the
// moment the tab is visible again.
const TICK_MS = 33;

/**
 * Drive ONE journey's camera curve for its own real duration — one ticking
 * loop, started once, never re-triggered mid-flight by anything else this
 * journey's own tokens do. `journey` is exactly what announceJourney
 * stamped: `{startedAt, legs}`.
 */
function runJourneyAnimation(scene, journey) {
  stopJourneyAnimation(scene.id);

  const legs = relevantLegs(scene, journey.legs);
  if (legs.length === 0) return;
  const view = viewport();
  if (!view) return;
  const keyframes = buildCameraKeyframes(
    legs.map((l) => l.start),
    legs.map((l) => l.end),
    view.width,
    view.height
  );
  if (!keyframes) return;

  const durationMs = Math.max(1, ...legs.map((l) => l.durationMs));
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const t = Math.min(1, (Date.now() - journey.startedAt) / durationMs);
    if (canvas?.ready && canvas.scene?.id === scene.id) canvas.pan(cameraAtProgress(keyframes, t));
    if (t < 1) setTimeout(tick, TICK_MS);
    else running.delete(scene.id);
  };
  running.set(scene.id, () => {
    stopped = true;
  });
  tick();
}

/** Wired once at module init (blank-inheritance.mjs) — every client, not only the GM. */
export function registerTravelCameraHook() {
  Hooks.on("updateScene", (sceneDoc, changes) => {
    // `changes` only tells us the flag path was TOUCHED -- found live
    // 2026-09-23, a real crash on every single crossing ("Cannot read
    // properties of undefined (reading 'length')"): Foundry's own
    // updateScene diff does not reliably carry the FULL nested flag value
    // here, sometimes handing back an object with `startedAt` but no
    // `legs` at all. `getFlag` always returns the real, complete, just-
    // persisted document state regardless of whatever partial shape this
    // particular diff happened to carry -- the only value ever safe to
    // actually act on.
    if (changes.flags?.[MODULE_ID]?.[JOURNEY_FLAG] === undefined) return;
    const journey = sceneDoc.getFlag(MODULE_ID, JOURNEY_FLAG);
    if (!journey?.legs) return;
    runJourneyAnimation(sceneDoc, journey);
  });
}
