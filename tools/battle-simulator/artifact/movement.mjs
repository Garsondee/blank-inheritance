/**
 * Real per-turn movement geometry for the replay viewer — extracted out of template.html's inline
 * script (design doc §15m's own precedent, matching geometry.mjs/steps.mjs/library.mjs) so this
 * real, non-trivial logic is covered by node:test instead of only ever being exercised by clicking
 * through the UI.
 *
 * Design doc §26 — Ingram's own report: "tokens push straight through walls... special attention to
 * moving accurately through doorways and around building corners." Root cause: every move-type
 * action used to contribute exactly ONE waypoint (its own endpoint) to the token's glide path and
 * the decision-overlay's move line — correct only because Frame-scale's movement generators
 * genuinely never bend (constant-direction lattice walks), but personnel-scale's wall-aware
 * Dijkstra routing (personnel-engine/decide.mjs's pathfindingDestinationToward/Away, ported from
 * design doc §16) DOES produce real bent multi-segment paths around corners and through doorways.
 * The ENGINE always validated that real path (checkMoveLegality's own `path` param) — it just
 * wasn't being LOGGED, so the viewer had no way to draw or animate anything but a straight line
 * between endpoints, visually cutting through whatever the real move had legitimately routed
 * around. Fixed at the source (engine.mjs, both scales, now logs `action.path`) and consumed here.
 */

/**
 * How many real waypoints (beyond the leg's own start) one move-type action contributes: every
 * point in its own logged `path` after the first (which duplicates the action's start position),
 * or just its endpoint `to` when no real path was logged — a wall-less scenario's straight-line
 * fallback (personnel-engine/decide.mjs's stepToward, or any Frame-scale move today), where
 * [from,to] already IS the real route, same as before this function existed.
 */
export function actionLegs(action) {
  return action.path?.length > 1 ? action.path.slice(1) : [action.to];
}

/**
 * The sequence of grid positions the acting combatant occupies THIS step, start to finish, plus a
 * parallel per-leg TIME WEIGHT — shared by the decision overlay (draws a line per REAL leg) and the
 * token animator (glides through the same waypoints at the same pace), so the two can never show a
 * different path for the same turn. Returns null when there's nothing to animate (not a turn step,
 * or no prior step to anchor the starting position to).
 *
 * `steps` is passed explicitly (not read off a module-level global) so this stays a pure function —
 * template.html's own inline script passes its own `steps` array in unchanged.
 *
 * Each real ACTION still gets a fixed total visual "beat", regardless of how many real segments it
 * needed — `legWeights[i]` is `1 / (that action's own leg count)`, so a 4-segment detour around a
 * corner takes the same total time a single straight leg used to, rather than 4x longer; the caller
 * multiplies this weight by its own live playback-speed-adjusted duration at animation time rather
 * than a stale speed being baked in here.
 */
export function combatantWaypoints(steps, stepIdx) {
  const step = steps[stepIdx];
  if (!step || step.kind !== "turn") return null;
  const priorStep = steps[stepIdx - 1];
  const startPos = priorStep?.snapshot?.[step.combatantId]?.position;
  if (!startPos) return null;
  const positions = [startPos];
  const legWeights = [];
  for (const action of step.actions || []) {
    if (action.legal === false) continue;
    if (action.type === "move" || action.type === "advance" || action.type === "step") {
      const legs = actionLegs(action);
      for (const p of legs) { positions.push(p); legWeights.push(1 / legs.length); }
    }
  }
  return { positions, legWeights };
}
