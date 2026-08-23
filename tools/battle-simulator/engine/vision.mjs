/**
 * Raw perception: can one combatant currently perceive another, right now,
 * from their current positions (design doc §15r). This is the engine-level
 * primitive belief.mjs's persistent per-side MEMORY is built on top of —
 * this file only ever answers "right now," never "do I remember."
 *
 * Implements the accepted `vision-as-chassis-axis` idea: "Frames are
 * enormously powerful and nearly blind... a Frame without spotters is a
 * giant swinging at what it's told about." That idea leaves OPEN which
 * specific mechanism (a flat range limit, an angle restriction, or a
 * detection-mode restriction) applies to which real chassis — a genuine
 * open design question, Ingram's call, not mine to resolve. What's built
 * here is the MECHANISM flexible enough to express range and scale-based
 * restriction; which real Frame/vehicle gets which profile is not decided
 * or assigned anywhere in this file.
 *
 * DELIBERATELY NOT BUILT: angle/facing-restricted vision (the idea's other
 * named option). That needs a facing/orientation concept no combatant or
 * movement code in this engine tracks today — building it would mean
 * inventing how every move action affects facing, a real feature in its
 * own right, not a small addition. `vision.angle` is accepted in the data
 * shape so it doesn't need a breaking change later, but is not yet
 * consumed by canPerceive.
 *
 * `vision` is an OPT-IN combatant field, exactly like walls: a combatant
 * with no `vision` field perceives everything within Line of Effect,
 * unlimited range — the default, and the state of every current fixture.
 */
import { distanceFeet } from "./grid.mjs";
import { lineOfEffect } from "./terrain.mjs";

/**
 * Scale-Blind (design/scale-and-chassis.md §8/§10) already means "cannot
 * perceive or target" a Medium-or-smaller creature — see checkScaleTargeting's
 * own existing message text, which says exactly that. This is the SAME
 * restriction, reused for raw perception rather than only attack targeting;
 * it is not a new rule, just this file completing what the flag's own name
 * already promised.
 */
function blockedByScaleDisparity(observer, target) {
  return Boolean(observer.scaleBlind) && ["tiny", "small", "medium"].includes(target.size);
}

/**
 * Can `observer` (at `observerPos`) currently perceive `target` (at
 * `targetPos`) right now? Folds together every restriction that can block
 * perception: Scale Disparity, a defined vision range, and Line of Effect
 * (a wall that blocks targeting blocks seeing for the same reason — this
 * engine's binary wall model doesn't distinguish SF2E's Line of Effect from
 * Line of Sight, Player Core pg. 418 vs 419, since without partial
 * obstruction there is nothing for the two concepts to differ on here).
 */
export function canPerceive(observer, observerPos, target, targetPos, walls) {
  if (blockedByScaleDisparity(observer, target)) return false;
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
