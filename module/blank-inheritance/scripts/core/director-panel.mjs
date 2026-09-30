/**
 * The Director's panel — the pure half.
 *
 * Scene cueing itself (design/foundry-module-design.md §7) is almost entirely
 * native Foundry primitives (Scene#activate, Scene#pullUsers, canvas's own
 * transition shader) called directly from the adapter — there is very little
 * campaign-specific LOGIC in "activate this scene". What's genuinely ours:
 * the list of transitions a GM can pick from, and shaping a raw Scene
 * document into what the panel actually renders.
 */

import { CLEARED_STATUSES } from "./promote.mjs";

/**
 * The 13 real transition types TextureTransitionFilter supports
 * (foundryvtt/.../client/canvas/rendering/filters/transition.mjs's own
 * #TYPES, confirmed against source rather than guessed from the design doc's
 * "13 effects (fade, glitch, hologram...)" prose). `null` (the default) means
 * "no override" — activate() with no transition falls back to whatever the
 * scene itself declares, or a hard cut.
 */
export const TRANSITION_TYPES = Object.freeze([
  { id: "fade", labelKey: "BLANKINHERITANCE.Director.Transition.Fade" },
  { id: "swirl", labelKey: "BLANKINHERITANCE.Director.Transition.Swirl" },
  { id: "waterDrop", labelKey: "BLANKINHERITANCE.Director.Transition.WaterDrop" },
  { id: "morph", labelKey: "BLANKINHERITANCE.Director.Transition.Morph" },
  { id: "crosshatch", labelKey: "BLANKINHERITANCE.Director.Transition.Crosshatch" },
  { id: "wind", labelKey: "BLANKINHERITANCE.Director.Transition.Wind" },
  { id: "waves", labelKey: "BLANKINHERITANCE.Director.Transition.Waves" },
  { id: "whiteNoise", labelKey: "BLANKINHERITANCE.Director.Transition.WhiteNoise" },
  { id: "hologram", labelKey: "BLANKINHERITANCE.Director.Transition.Hologram" },
  { id: "hole", labelKey: "BLANKINHERITANCE.Director.Transition.Hole" },
  { id: "holeSwirl", labelKey: "BLANKINHERITANCE.Director.Transition.HoleSwirl" },
  { id: "glitch", labelKey: "BLANKINHERITANCE.Director.Transition.Glitch" },
  { id: "dots", labelKey: "BLANKINHERITANCE.Director.Transition.Dots" }
]);

export const DEFAULT_TRANSITION_DURATION_MS = 1000;

/** viewOptions.transition for activate()/pullUsers(), or undefined for "no override" -- see SceneViewOptions in foundryvtt's own _types.mjs. */
export function transitionOptions(typeId, durationMs = DEFAULT_TRANSITION_DURATION_MS) {
  if (!typeId) return undefined;
  return { type: typeId, duration: durationMs };
}

/**
 * One row per real Foundry Scene, shaped for the template. `thumbUrl` can be
 * null (a Scene with no thumbnail generated yet) -- the template's job to
 * degrade that honestly, not this function's to fake one.
 */
export function sceneRows(scenes = []) {
  return scenes.map((scene) => ({
    id: scene.id,
    name: scene.name ?? scene.id,
    thumbUrl: scene.thumb ?? null,
    active: Boolean(scene.active)
  }));
}

/**
 * Finds the episode-scene (episode.schema.json's scenes[] entry, issue #166)
 * whose own `briefRef` matches a live Foundry Scene's `briefRef` flag
 * (stamped by scene-build.mjs at build time) -- the only key a Foundry Scene
 * document and the narrative scene it represents actually share; scene-set.json
 * entries and episode scenes have no shared `id`, only this.
 *
 * Returns null when no episode scene claims this briefRef at all -- a hub
 * scene, a pin journal, or anything else that isn't part of a scheduled beat.
 * Per design/approvals-desk.md §1, nothing outside a scheduled beat is
 * tracked by the Desk at all, so "not found" correctly means "no gate
 * applies," never "block."
 */
export function findSceneAuthoring(episodes, briefRef) {
  if (!briefRef) return null;
  for (const episode of episodes ?? []) {
    const match = (episode.scenes ?? []).find((scene) => scene.briefRef === briefRef);
    if (match) return match.authoring ?? null;
  }
  return null;
}

/**
 * design/approvals-desk.md §3: "not a silent allow, not a hard block."
 * `authoring` is whatever findSceneAuthoring returned above -- null (untracked,
 * or genuinely no gate for this scene) always allows. `override` always
 * allows too: a hard block would mean Ingram being away for a week stops the
 * GM from ever showing the group anything, the same worse-failure reasoning
 * promote()'s own escape hatch is built on.
 *
 * Cleared is core/promote.mjs's CLEARED_STATUSES, the same list the opening
 * titles' confirm window reads. A scene's only cleared rung is `live`, the
 * Sign-Off's seal, so a gate that knew only the Desk's grades asked "still
 * drafted?" about every sealed scene.
 */
export function cueGateDecision(authoring, { override = false } = {}) {
  if (override) return { allowed: true, status: authoring?.status ?? null, gated: false };
  if (!authoring) return { allowed: true, status: null, gated: false };
  if (CLEARED_STATUSES.includes(authoring.status)) return { allowed: true, status: authoring.status, gated: false };
  return { allowed: false, status: authoring.status ?? "drafted", gated: true };
}
