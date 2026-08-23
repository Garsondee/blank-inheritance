/**
 * Faction relations, reused directly from the Frame-scale engine (design doc §19). Verified
 * during planning: `engine/factions.mjs` has ZERO imports — `isHostileTo`/`isAlliedWith`/
 * `splitByRelation` operate purely on `side` string comparisons ("party"/"opposition"/"neutral"),
 * never referencing feet, grids, or anything scale-specific. Exactly as scale-agnostic as
 * `terrain.mjs`/`resolve.mjs`/`rng.mjs` — same reasoning applies, so this is a real re-export, not
 * a copy: any future fix or a fourth faction added there is inherited here automatically.
 */
export * from "../engine/factions.mjs";
