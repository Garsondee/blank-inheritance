/**
 * Raw perception for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../engine/vision.mjs, with Scale Disparity removed entirely. That check exists only because a
 * Frame/vehicle can be `scaleBlind` to Medium-or-smaller creatures (the retired two-scale design (deleted 2026-09-25)
 * §8/§10) — a distinction that only makes sense when a "scale" axis exists to be blind across.
 * Every combatant in this tree is an ordinary SF2E PC or NPC, all on the same scale; there is
 * nothing here for a scale-disparity check to ever fire on, so it isn't ported at all rather than
 * kept as permanently-dead code.
 *
 * What's left is exactly the general-purpose mechanism: an optional flat vision-range limit (the
 * `vision` field stays opt-in — no field means unlimited range within Line of Effect, same
 * default as the Frame-scale file) plus Line of Effect via this tree's own reused `terrain.mjs`.
 * This file only ever answers "can X currently perceive Y, right now" — never "does X remember Y"
 * (that's `knowledge/belief.mjs`, reused directly once this file exists, per the plan).
 */
import { distanceFeet } from "./grid.mjs";
import { lineOfEffect } from "./terrain.mjs";

/**
 * Can `observer` (at `observerPos`) currently perceive `target` (at `targetPos`) right now?
 * Folds together a defined vision range and Line of Effect (a wall that blocks targeting blocks
 * seeing for the same reason — this engine's binary wall model doesn't distinguish SF2E's Line of
 * Effect from Line of Sight, Player Core pg. 418 vs 419, since without partial obstruction there
 * is nothing for the two concepts to differ on here).
 */
export function canPerceive(observer, observerPos, target, targetPos, walls) {
  const range = observer.vision?.range;
  if (range != null && distanceFeet(observerPos, targetPos) > range) return false;
  if (!lineOfEffect(observerPos, targetPos, walls)) return false;
  return true;
}

/** Whether ANY living member of `positions`/`combatants` filtered to `side` can currently perceive `target`. */
export function anyoneOnSideCanPerceive(side, state, targetId) {
  const target = state.combatants.get(targetId);
  const targetPos = state.positions.get(targetId);
  if (!target || !targetPos) return false;
  for (const [id, c] of state.combatants) {
    if (c.side !== side || c.currentHP <= 0 || id === targetId) continue;
    const pos = state.positions.get(id);
    if (pos && canPerceive(c, pos, target, targetPos, state.walls)) return true;
  }
  return false;
}
