/**
 * Where a scene sits between story and downtime -- the Scene Runner's banner
 * (canon/decisions/D050.md, points 7 and 13).
 *
 * Ingram, 2026-09-29: "We probably need a large banner colour for the scene
 * runner and a system for informing me where this scene lies in that
 * spectrum." Three bands:
 *
 *   story    -- plot beats, run as written. The things that happen are the
 *               things the scene is for.
 *   mixed    -- a story frame with events drawn from a deck inside it.
 *   downtime -- relaxed and low stakes: role-play, rest, events from the
 *               deck. Nothing here is required to happen.
 *
 * A scene brief states its band in `spectrum`. One that says nothing is a
 * story scene, which is what every scene written before this existed is.
 */

export const SPECTRUM = Object.freeze({
  story: Object.freeze({
    id: "story",
    labelKey: "BLANKINHERITANCE.Runner.Spectrum.story.Label",
    hintKey: "BLANKINHERITANCE.Runner.Spectrum.story.Hint",
    icon: "fa-solid fa-book-open"
  }),
  mixed: Object.freeze({
    id: "mixed",
    labelKey: "BLANKINHERITANCE.Runner.Spectrum.mixed.Label",
    hintKey: "BLANKINHERITANCE.Runner.Spectrum.mixed.Hint",
    icon: "fa-solid fa-layer-group"
  }),
  downtime: Object.freeze({
    id: "downtime",
    labelKey: "BLANKINHERITANCE.Runner.Spectrum.downtime.Label",
    hintKey: "BLANKINHERITANCE.Runner.Spectrum.downtime.Hint",
    icon: "fa-solid fa-mug-hot"
  })
});

export const SPECTRUM_IDS = Object.freeze(Object.keys(SPECTRUM));

/** A brief's band. Anything unrecognised, or nothing, is a story scene. */
export function spectrumOf(brief) {
  return SPECTRUM[brief?.spectrum] ?? SPECTRUM.story;
}
