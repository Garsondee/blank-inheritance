/**
 * Grid math for the PERSONNEL-SCALE engine (design doc §19, "Pure RAW SF2E Validation").
 * One square = 5 feet — real, unscaled SF2E, per Ingram's direct instruction: "for these tests
 * you should use SF2E ranges and measurements for distance, not the massive x10 ones we've been
 * using elsewhere. We check to see if the AI works well in pure SF2E logic before changing that
 * logic to fit our adventure."
 *
 * Structurally identical to ../engine/grid.mjs (the Frame-scale, 50ft-square file this is ported
 * from) — same 5-10-5 diagonal rule, same helper shapes — ONLY the constant differs. Deliberately
 * a separate file rather than a parametrized version of the Frame-scale one: `engine/grid.mjs`'s
 * FEET_PER_SQUARE is a hardcoded module constant imported by 9 Frame-scale files, and threading a
 * runtime parameter through all of them would risk the 351 tests already passing at that scale.
 * Same precedent `ground-layer/` already established for exactly this kind of split
 * (design/scale-and-chassis.md §2).
 */

const FEET_PER_SQUARE = 5;

/** Chebyshev square-distance between two grid cells (max axis difference). */
function squareDistance(a, b) {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

/**
 * Real SF2E 5-10-5 diagonal distance in feet between two grid cells.
 * Every other diagonal step costs double.
 */
export function distanceFeet(a, b) {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);
  const diagonal = Math.min(dx, dy);
  const straight = Math.max(dx, dy) - diagonal;
  const cheapDiagonals = Math.ceil(diagonal / 2);
  const expensiveDiagonals = Math.floor(diagonal / 2);
  return (straight + cheapDiagonals) * FEET_PER_SQUARE + expensiveDiagonals * FEET_PER_SQUARE * 2;
}

export function isAdjacent(a, b) {
  return squareDistance(a, b) === 1;
}

export function cellKey(pos) {
  return `${pos.col},${pos.row}`;
}

export function isOccupied(pos, occupiedPositions) {
  return occupiedPositions.some((p) => p.col === pos.col && p.row === pos.row);
}

/**
 * Like isOccupied, but an occupant on the SAME side as `moverSide` doesn't block PASSING through
 * their square — a real SF2E movement rule (Player Core, general movement — Ingram's own direct
 * correction, design doc §24: "Characters can move through friendly character spaces per the
 * rules"). Only blocks when a DIFFERENT-side occupant is there. The "can't stop there" half of the
 * real rule is unaffected — that's still a plain isOccupied check against the actual destination
 * square, checked separately, since you can never END your move on top of anyone, ally included.
 * `occupiedPositions` entries need a `.side` field for this to mean anything; `moverSide == null`
 * (no side info supplied) falls back to isOccupied's original any-occupant rule rather than
 * silently treating every entry as passable.
 */
export function blocksPassage(pos, occupiedPositions, moverSide) {
  if (moverSide == null) return isOccupied(pos, occupiedPositions);
  return occupiedPositions.some((p) => p.col === pos.col && p.row === pos.row && p.side !== moverSide);
}

export function isInBounds(pos, gridSize) {
  return pos.col >= 0 && pos.row >= 0 && pos.col < gridSize.cols && pos.row < gridSize.rows;
}

/**
 * Reach in feet for a Strike — no reach trait means melee/adjacent-only (one square, i.e.
 * FEET_PER_SQUARE), a "reach-N" trait overrides it with its own real, unscaled feet value.
 */
export function reachFeetForStrike(strike) {
  const reachTrait = (strike.traits ?? []).find((t) => /^reach-\d+$/.test(t));
  if (reachTrait) return Number(reachTrait.split("-")[1]);
  return FEET_PER_SQUARE; // adjacent
}

export { FEET_PER_SQUARE };
