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
export const ORB_BEZEL = Object.freeze({
  size: 98, offset: 1, thickness: 2.8, gapDeg: 9, glyphRadius: 43.4, glyphSize: 5.2,
  // A backing plate behind each kanji (added live 2026-09-17, Ingram's own
  // feedback against the real server): with no plate the glyph sits directly
  // on whatever the bezel ring paints there, which is not one flat colour —
  // an arc's own fill, an arc/arc seam, dust texture and (right at the very
  // top of the ring) the collar's edge all cross through the same small
  // area, and a stroke of any one of those can cut straight through a
  // character's own strokes. A small solid disc, same colour as the ring's
  // own base fill, guarantees a flat field under the glyph regardless of
  // what the ring is doing there. Sized to comfortably contain glyphSize's
  // em-box (~0.7x) with a hair of margin, not derived — there being no third
  // thing this has to agree with, unlike glyphRadius/glyphSize above.
  glyphBackingRadius: 3.7
});

/**
 * The caption engraved round the top of the silver collar (the day, or the
 * round), in the collar's own 100-unit viewBox drawn at --bi-orb-collar. The
 * baseline sits just outside the bezel so the letters rise into the collar's
 * rim band; `size` is the letter height in those units.
 */
export const ORB_ENGRAVING = Object.freeze({ radius: 46.4, fromDeg: -62, toDeg: 62, size: 3.3 });

/**
 * The second engraving, round the BOTTOM of the collar (2026-09-23): the
 * subject's armour class, speed and level — the three numbers a GM asks for
 * most that the instrument did not otherwise show. Set on
 * core/deck-layout.mjs#arcPathUnder, so its letters rise inward from the
 * collar's outer rim; the baseline therefore sits near the rim and the
 * letters' tops stop short of the bezel (tested).
 */
export const ORB_ENGRAVING_UNDER = Object.freeze({ radius: 49.3, spanDeg: 100, size: 3.1 });

/**
 * Two annunciators printed on the dial face either side of the pivot, in the
 * face's 200-unit box (2026-09-23, "the central display is fun but we can get
 * more info into it"): hero points on the left, the dying track on the
 * right. Both sit BELOW the pivot's height, where the needle — which only
 * ever sweeps the upper half — can never cross them, and above the readout
 * window. `lampPitch` is the centre-to-centre spacing of the lamps.
 */
export const ORB_ANNUNCIATORS = Object.freeze({
  labelY: 116,
  lampY: 125,
  lampRadius: 2.9,
  lampPitch: 8.5,
  heroX: 58,
  dyingX: 142,
  labelSize: 7.5
});

/** The four quarters of the day as single kanji — structural type (visual-identity §1b). */
export const QUARTER_GLYPHS = Object.freeze({ morning: "朝", afternoon: "昼", evening: "夕", night: "夜" });

/** The action budget round the bezel in a fight: three actions and a reaction. */
export const ACTION_GLYPHS = Object.freeze(["1", "2", "3", "R"]);

/** How far the selector detent dots sit from the dial's centre, in its 100-unit box. */
export const DETENT_RADIUS = 44;
