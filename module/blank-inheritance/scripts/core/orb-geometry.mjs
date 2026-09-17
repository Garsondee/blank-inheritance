/**
 * The central instrument's fixed geometry — pure constants, one place.
 *
 * Three drawings have to agree with each other and with the stylesheet: the
 * printed VU face (an SVG in a 200-unit box), the needle and its pivot (CSS
 * percentages of the glass), and the bezel ring (an SVG in a 100-unit box).
 * Each was once right on its own and wrong against its neighbours, so the
 * numbers live here, and test/tier3-deck-contract.test.mjs checks them against
 * each other and against bi-tokens.css / bi-components.css.
 */

/**
 * The printed VU face, in its 200-unit viewBox (core/vu-meter.mjs#vuFace).
 * The needle's CSS pivot (.bi-orb__pivot top 62%) is pivotY / size, and the
 * needle reaches just past the major ticks (radius + majorTick).
 */
export const ORB_FACE = Object.freeze({
  size: 200,
  pivotX: 100,
  pivotY: 124,
  radius: 70,
  sweep: 100,
  labelCount: 5,
  minorPerGap: 3,
  majorTick: 8,
  minorTick: 4,
  labelGap: 12,
  bandWidth: 5
});

/** Printed type on the face, in face units. */
export const ORB_FACE_TYPE = Object.freeze({ num: 12, sign: 15, gauge: 12, gaugeY: 103 });

/**
 * The bezel ring, in a 100-unit viewBox drawn at --bi-orb-bezel. Arcs are cut
 * by core/day-ring.mjs#ringSlices at `size` and translated by `offset`, so
 * their centre is the viewBox centre; one glyph per arc sits at `glyphRadius`,
 * between the glass's edge and the arcs' inner edge.
 */
export const ORB_BEZEL = Object.freeze({ size: 98, offset: 1, thickness: 2.8, gapDeg: 9, glyphRadius: 43.4, glyphSize: 5.2 });

/**
 * The caption engraved round the top of the silver collar (the day, or the
 * round), in the collar's own 100-unit viewBox drawn at --bi-orb-collar. The
 * baseline sits just outside the bezel so the letters rise into the collar's
 * rim band; `size` is the letter height in those units.
 */
export const ORB_ENGRAVING = Object.freeze({ radius: 46.4, fromDeg: -62, toDeg: 62, size: 3.3 });

/** The four quarters of the day as single kanji — structural type (visual-identity §1b). */
export const QUARTER_GLYPHS = Object.freeze({ morning: "朝", afternoon: "昼", evening: "夕", night: "夜" });

/** The action budget round the bezel in a fight: three actions and a reaction. */
export const ACTION_GLYPHS = Object.freeze(["1", "2", "3", "R"]);

/** How far the selector detent dots sit from the dial's centre, in its 100-unit box. */
export const DETENT_RADIUS = 44;
