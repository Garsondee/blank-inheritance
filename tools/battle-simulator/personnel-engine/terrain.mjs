/**
 * Terrain, reused directly from the Frame-scale engine (design doc §19). Verified during
 * planning: `engine/terrain.mjs` has ZERO imports — every function operates purely on col/row
 * cells and wall-vertex coordinates, never referencing feet or FEET_PER_SQUARE anywhere. Walls,
 * `edgesBetween`, `moveBlockedBetween`, `lineOfEffect` are exactly as scale-agnostic as
 * `resolve.mjs`/`rng.mjs` — same reasoning `ground-layer/` already relies on for those two. A
 * real re-export, not a copy: any future fix to the Frame-scale terrain engine (e.g. a corner-
 * cutting bug like §15p's) is inherited here automatically rather than needing to be ported twice.
 */
export * from "../engine/terrain.mjs";
