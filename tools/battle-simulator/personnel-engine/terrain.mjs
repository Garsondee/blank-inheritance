/**
 * Terrain (design doc §19). Verified during planning: `terrain.mjs` has ZERO imports — every
 * function operates purely on col/row cells and wall-vertex coordinates, never referencing feet or
 * FEET_PER_SQUARE anywhere. Walls, `edgesBetween`, `moveBlockedBetween`, `lineOfEffect` are exactly
 * as scale-agnostic as `resolve.mjs`/`rng.mjs` — same reasoning `ground-layer/` already relies on
 * for those two. A real re-export, not a copy: any future fix (e.g. a corner-cutting bug like
 * §15p's) is inherited here automatically rather than needing to be ported twice.
 *
 * MOVED 2026-09-19 from `../engine/terrain.mjs` to `../shared/terrain.mjs`: the frame-scale engine
 * it used to live alongside was deleted (unapproved, stale content per Ingram's direct instruction),
 * but this module itself was never frame-specific — it moved with its sibling scale-agnostic
 * utilities (resolve.mjs, rng.mjs, factions.mjs) rather than being deleted with the frame-only
 * engine/ai it used to sit next to.
 */
export * from "../shared/terrain.mjs";
