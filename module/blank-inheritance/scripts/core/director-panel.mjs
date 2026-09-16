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
