/**
 * Grid math. One square = 50 feet — 10x PF2e/SF2e's default 5ft tactical
 * grid, a deliberate reskin (2026-08-22, Ingram's call) so the map can
 * plausibly read as a whole city, its suburbs, and the foothills beyond,
 * not a 220ft test lot. Every combatant's Speed/range/reach in
 * data/combatants.mjs was scaled by the same 10x alongside this constant,
 * so square-counts-per-turn — and therefore how many rounds anything takes
 * to happen — are IDENTICAL to before the rescale; only the feet numbers
 * that appear in logs/UI got bigger and more cinematic. The diagonal rule
 * below keeps PF2e/SF2e's real 5-10-5 alternating pattern, just at 10x
 * (50-100-50-...) — same shape, reskinned unit, not a new rule.
 */

const FEET_PER_SQUARE = 50;

/** Chebyshev square-distance between two grid cells (max axis difference). */
function squareDistance(a, b) {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

/**
 * PF2e/SF2e 5-10-5 diagonal distance in feet between two grid cells.
 * Every other diagonal step costs double.
 */
export function distanceFeet(a, b) {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);
  const diagonal = Math.min(dx, dy);
  const straight = Math.max(dx, dy) - diagonal;
  // Half of the diagonal steps cost 10ft instead of 5ft, alternating starting with 5ft.
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

export function isInBounds(pos, gridSize) {
  return pos.col >= 0 && pos.row >= 0 && pos.col < gridSize.cols && pos.row < gridSize.rows;
}

/**
 * Reach in feet for a Strike — no reach trait means melee/adjacent-only
 * (one square, i.e. FEET_PER_SQUARE — the SF2E default "adjacent" range
 * reskinned to this map's 50ft squares), a "reach-N" trait overrides it
 * with its own already-10x'd feet value (e.g. the Claimant's Sweep is
 * "reach-300", ten squares, not the pre-rescale "reach-30").
 */
export function reachFeetForStrike(strike) {
  const reachTrait = (strike.traits ?? []).find((t) => /^reach-\d+$/.test(t));
  if (reachTrait) return Number(reachTrait.split("-")[1]);
  return FEET_PER_SQUARE; // adjacent
}

export { FEET_PER_SQUARE };
