/**
 * Pure geometry helpers for the artifact's decision overlay (design doc
 * §14h) — the feet<->pixel conversion and weapon-reach extraction behind
 * the move/strike lines and range rings drawn on the map. Pulled out as a
 * real, independently-tested module (rather than left as inline <script>
 * logic, like most of template.html's rendering functions) specifically
 * because this is the one part of the overlay where a silent scale bug
 * would defeat the whole point of building it: Ingram's ask was to
 * visually CONFIRM a distance is real, so the distance math itself needs
 * its own proof, not just a glance at a rendered image.
 *
 * build.mjs splices this file's source directly into template.html's
 * inline script (stripping the `export` keywords, since a published
 * artifact must stay a single self-contained HTML file with no external
 * script references) — this file is the source of truth either way.
 */

export const GRID = 44;
export const MAP_PX = 1320;
export const CELL = MAP_PX / GRID;
export const FEET_PER_SQUARE = 50; // must match tools/battle-simulator/engine/grid.mjs

/** Grid cell {col,row} -> pixel {x,y} at the center of that cell. */
export function posToPx(pos) {
  return { x: (pos.col + 0.5) * CELL, y: (pos.row + 0.5) * CELL };
}

/** A real-world feet distance -> the equivalent pixel length on the map, at this map's scale. */
export function feetToPx(feet) {
  return (feet / FEET_PER_SQUARE) * CELL;
}

/**
 * Mirrors engine/grid.mjs's reachFeetForStrike exactly for a melee Strike
 * (a reach-N trait, or one square/adjacent-only if none) — kept as a
 * parallel implementation rather than an import because the artifact is
 * plain inline JS with no module loader once published, not because the
 * logic is meant to diverge; the cross-check test below guards against drift.
 */
export function reachFeetForStrikeLocal(strike) {
  if (strike.strikeType === "melee") {
    const reachTrait = (strike.traits || []).find((t) => /^reach-\d+$/.test(t));
    return reachTrait ? Number(reachTrait.split("-")[1]) : FEET_PER_SQUARE;
  }
  return strike.rangeIncrement ?? null;
}

/**
 * The range-ring radius for ANY attack/heal option — a ranged Strike's
 * rangeIncrement (via reachFeetForStrikeLocal above), a melee Strike's
 * reach, or a spell/ability's own flat `.range` (design doc §14k — checked
 * FIRST, since a spell has no strikeType at all and would otherwise fall
 * through to rangeIncrement and read as null). Mirrors the same
 * range-then-reach logic ai/evaluate/state-value.mjs's usefulRangeFeet
 * uses for the AI's own candidate generation, for the same "don't let the
 * visual silently drift from what the AI actually reasoned about" reason
 * the rest of this module exists.
 */
export function cleanRangeFeetLocal(item) {
  if (item.range != null) return item.range;
  return reachFeetForStrikeLocal(item);
}
