/**
 * Randomized arc-based deployment (design doc §35 — Ingram's own ask): *"We shouldn't always spawn
 * our two sides in the same places, we should spawn them randomly within two randomly chosen arcs
 * with a distance between each other. If a token starts being able to see an opponent token then
 * that's not a valid starting point."*
 *
 * Replaces a hand-picked SETUPS entry (personnel-test-complex.mjs's own DIAGONAL_SW_NE/
 * DIAGONAL_NW_SE/NORTH_SOUTH_ENDS) with a genuinely procedural one: pick two directions from the
 * map's own center, far enough apart that the two sides don't spawn adjacent to each other, walk
 * each direction out to near the map's boundary, cluster each side's combatants there, and reject
 * the whole attempt — re-rolling with fresh random draws, still fully seeded/reproducible — if ANY
 * combatant on one side would start with real Line of Effect to ANY combatant on the other. That
 * last check is the actual point: a real "find each other first" opening, not just a randomized-
 * looking one that might still start in plain sight of each other by chance.
 *
 * Deliberately map-agnostic (grid size + walls are both parameters, nothing here is specific to the
 * two-building complex map) so this can be reused by any personnel-scale scenario builder, present
 * or future, that wants varied openings instead of a fixed lineup.
 */
import { isInBounds, isOccupied } from "../personnel-engine/grid.mjs";
import { lineOfEffect, moveBlockedBetween } from "../personnel-engine/terrain.mjs";

/** Where a ray from `center` at `angleRad` exits an axis-aligned box of half-width/half-height
 * `halfW`/`halfH` centered on `center` — a standard ray-to-box-edge intersection. Used to turn "a
 * random direction" into "a real point near the map's boundary in that direction." */
export function rayToBoxEdge(center, angleRad, halfW, halfH) {
  const dx = Math.cos(angleRad), dy = Math.sin(angleRad);
  const candidates = [];
  if (dx !== 0) {
    const t = halfW / Math.abs(dx);
    if (Math.abs(dy * t) <= halfH + 1e-9) candidates.push(t);
  }
  if (dy !== 0) {
    const t = halfH / Math.abs(dy);
    if (Math.abs(dx * t) <= halfW + 1e-9) candidates.push(t);
  }
  const t = Math.min(...candidates);
  return { col: center.col + dx * t, row: center.row + dy * t };
}

/** Places `count` combatants near `anchor`, one per cell, walking outward from a small fixed
 * offset ring (matching the tight little clusters the existing hand-picked SETUPS already use —
 * e.g. DIAGONAL_SW_NE's {1,26},{2,27},{1,28}) rather than scattering them — a deployed squad
 * arrives together, not spread across the map. Each candidate cell is checked in-bounds, not
 * already taken (by this side's own earlier picks or by `avoid`), and not sealed off from the
 * anchor by a wall (defensive — this project's own history has a real "spawned inside a sealed
 * cover block" bug, tools/battle-simulator/DESIGN-LOG.md §24). Returns null (never partial) if `count`
 * cells can't all be found within the offset ring, so a caller can cleanly retry elsewhere instead
 * of silently deploying fewer combatants than asked for. */
const CLUSTER_OFFSETS = [
  { dc: 0, dr: 0 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 0, dr: -1 },
  { dc: 1, dr: 1 }, { dc: -1, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 },
  { dc: 2, dr: 0 }, { dc: 0, dr: 2 }, { dc: -2, dr: 0 }, { dc: 0, dr: -2 }
];
export function clusterPositions(anchor, count, gridSize, avoid, walls) {
  const anchorCell = { col: Math.round(anchor.col), row: Math.round(anchor.row) };
  const picked = [];
  for (const { dc, dr } of CLUSTER_OFFSETS) {
    if (picked.length >= count) break;
    const p = { col: anchorCell.col + dc, row: anchorCell.row + dr };
    if (!isInBounds(p, gridSize)) continue;
    if (isOccupied(p, [...avoid, ...picked])) continue;
    if ((dc !== 0 || dr !== 0) && moveBlockedBetween(anchorCell, p, walls)) continue;
    picked.push(p);
  }
  return picked.length === count ? picked : null;
}

/**
 * @param {object} args
 * @param {{cols:number, rows:number}} args.gridSize
 * @param {Array} args.walls - Foundry Wall-schema segments
 * @param {number} args.partyCount
 * @param {number} args.oppositionCount
 * @param {() => number} args.rng - a seeded RNG (e.g. engine/rng.mjs's makeRng(seed)) — NEVER
 *   Math.random(); deployment must be exactly as reproducible per-seed as everything else in this
 *   project. Deliberately a SEPARATE stream from the battle's own combat-dice rng, matching
 *   decide.mjs's own decisionRng precedent (drawing from the battle's own stream would desync
 *   every subsequent real die roll the instant the deployment algorithm itself changed).
 * @param {number} [args.maxAttempts=300]
 * @param {number} [args.margin=2] - how far inset from the map's true edge a side's anchor point
 *   lands; kept small on purpose so combatants stay in the open exterior band real maps like
 *   personnel-test-complex.mjs's already reserve outside their buildings (MARGIN=3 there), never
 *   pushed into a wall.
 * @param {number} [args.minArcSeparationDeg=90] - the two sides' directions from center are always
 *   at least this many degrees apart (in whichever rotational direction is shorter), so a "random"
 *   pair of arcs can't land right next to each other by chance.
 * @returns {{partyPositions: Array, oppositionPositions: Array, attempts: number}}
 */
export function generateRandomArcDeployment({
  gridSize, walls, partyCount, oppositionCount, rng,
  maxAttempts = 300, margin = 2, minArcSeparationDeg = 90
}) {
  const center = { col: gridSize.cols / 2, row: gridSize.rows / 2 };
  const halfW = gridSize.cols / 2 - margin;
  const halfH = gridSize.rows / 2 - margin;
  // A real, if approximate, "the two sides must actually be far apart" floor — the angular
  // separation above already does most of this work, but two boundary points at, say, exactly 90°
  // apart can still land close to a shared corner; this is the explicit backstop for that case.
  const minCenterDistance = Math.min(halfW, halfH);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const angleA = rng() * Math.PI * 2;
    const sepDeg = minArcSeparationDeg + rng() * (360 - 2 * minArcSeparationDeg);
    const angleB = angleA + (sepDeg * Math.PI) / 180;

    const anchorA = rayToBoxEdge(center, angleA, halfW, halfH);
    const anchorB = rayToBoxEdge(center, angleB, halfW, halfH);
    if (Math.hypot(anchorA.col - anchorB.col, anchorA.row - anchorB.row) < minCenterDistance) continue;

    const partyPositions = clusterPositions(anchorA, partyCount, gridSize, [], walls);
    if (!partyPositions) continue;
    const oppositionPositions = clusterPositions(anchorB, oppositionCount, gridSize, partyPositions, walls);
    if (!oppositionPositions) continue;

    const anyLos = partyPositions.some((p) => oppositionPositions.some((o) => lineOfEffect(p, o, walls)));
    if (anyLos) continue;

    return { partyPositions, oppositionPositions, attempts: attempt };
  }
  throw new Error(`generateRandomArcDeployment: no valid no-initial-Line-of-Effect deployment found in ${maxAttempts} attempts — the map may be too open, or partyCount/oppositionCount too large for the cluster offset ring.`);
}
