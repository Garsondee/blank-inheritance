/**
 * Faction relations (design doc §19). Verified during planning: `factions.mjs` has ZERO imports —
 * `isHostileTo`/`isAlliedWith`/`splitByRelation` operate purely on `side` string comparisons
 * ("party"/"opposition"/"neutral"), never referencing feet, grids, or anything scale-specific.
 * Exactly as scale-agnostic as `terrain.mjs`/`resolve.mjs`/`rng.mjs` — same reasoning applies, so
 * this is a real re-export, not a copy: any future fix or a fourth faction added there is inherited
 * here automatically.
 *
 * MOVED 2026-09-19 from `../engine/factions.mjs` to `../shared/factions.mjs`: the frame-scale
 * engine it used to live alongside was deleted (unapproved, stale content per Ingram's direct
 * instruction), but this module itself was never frame-specific — it moved with its sibling
 * scale-agnostic utilities (resolve.mjs, rng.mjs, terrain.mjs) rather than being deleted with the
 * frame-only engine/ai it used to sit next to.
 */
export * from "../shared/factions.mjs";
