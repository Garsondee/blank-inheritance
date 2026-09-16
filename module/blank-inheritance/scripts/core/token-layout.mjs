/**
 * Where a freshly-created character's token lands on the landing scene —
 * pure arithmetic, no Foundry. A simple evenly-spaced row rather than
 * anything cleverer: six real players is the whole realistic range here,
 * and a row across the open floor in front of the lobby's double doors
 * (artwork/locations/directorate-headquarters--lobby.png) reads fine at
 * that scale without needing collision detection or a real layout engine.
 */

const SPACING = 150;
/** Fraction down the scene's height the row sits at -- roughly where the lobby art's open floor is, below the doors and the light spilling under them. */
const ROW_HEIGHT_FRACTION = 0.78;

/**
 * `index` is how many tokens are already on the scene (0 for the first
 * arrival) -- callers pass the scene's own current token count, so each new
 * arrival takes the next open slot in the row rather than guessing at who's
 * already there.
 */
export function nextTokenPosition(index, sceneWidth, sceneHeight) {
  const centeredOffset = index - 2.5; // centers a run of 6 (indices 0-5) on the midpoint
  return {
    x: Math.round(sceneWidth / 2 + centeredOffset * SPACING),
    y: Math.round(sceneHeight * ROW_HEIGHT_FRACTION)
  };
}
