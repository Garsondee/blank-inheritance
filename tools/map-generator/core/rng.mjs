/**
 * Seeded PRNG for the map generator, plus hierarchical sub-seeding.
 *
 * `makeRng` is deliberately the SAME mulberry32 as the battle simulator's
 * `tools/battle-simulator/engine/rng.mjs`, duplicated rather than imported on
 * purpose: the two tools are independent (the simulator must stay runnable
 * without the map generator and vice versa), and mulberry32 is a dozen lines
 * of published algorithm, so a cross-tool import would buy nothing and couple
 * two things that should be free to move.
 *
 * What IS new here is `subSeed`. The map generator's whole updatability story
 * (see ideas/entries/procedural-city-map-generator.json) rests on being able to
 * regenerate any SUBTREE of the world identically — terrain, then roads, then
 * one specific block's parcels — without a global counter whose value depends
 * on generation order. `subSeed` derives a child seed from a parent seed plus a
 * path of labels, so `subSeed(seed, 'city', 'block', 42)` is stable no matter
 * what else was generated first, or whether it was generated at all.
 */

export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a stable child seed from a parent seed and a path of labels.
 *
 * Order-independent and collision-resistant enough for our purposes (FNV-1a
 * over the path, mixed with the parent seed). The same path always yields the
 * same seed, which is what makes "regenerate just this block" possible.
 */
export function subSeed(seed, ...path) {
  let h = 0x811c9dc5 ^ (seed >>> 0);
  for (const part of path) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    // Separator, so ('ab','c') and ('a','bc') differ.
    h ^= 0x2f;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Uniform in [min, max). */
export function uniform(rng, min, max) {
  return min + rng() * (max - min);
}

/**
 * Standard normal via Box-Muller. Terrain noise wants Gaussian rather than
 * uniform perturbation — uniform noise has hard edges in its distribution that
 * survive erosion as faint grid artefacts.
 */
export function gaussian(rng) {
  let u = 0;
  while (u === 0) u = rng(); // log(0) guard
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
