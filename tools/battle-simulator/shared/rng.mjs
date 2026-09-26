/**
 * Seedable PRNG (mulberry32) for the battle simulator.
 *
 * Real per-die variance, not curated outcomes — but seeded, so a specific
 * run can be reproduced exactly for debugging, and a DIFFERENT seed (or a
 * different tactical script) is how "test different approaches" actually
 * works: same rules, same starting positions, different roll of the dice
 * or different decisions, compared side by side.
 *
 * Deliberately not Math.random(): this module is a plain Node script run
 * via Bash, never inside a Workflow script (where Math.random() is banned
 * for resumability reasons) — but a fixed, inspectable seed is simply
 * better engineering for a simulation tool regardless of that constraint.
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

/** Roll an n-sided die using the given rng function. Returns 1..n. */
export function rollDie(rng, sides) {
  return Math.floor(rng() * sides) + 1;
}

/** Roll "NdX+B" (e.g. "3d8+12") using the given rng. Returns { rolls, total }. */
export function rollFormula(rng, formula) {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(formula.trim());
  if (!match) throw new Error(`Not a valid dice formula: "${formula}"`);
  const [, countStr, sidesStr, bonusStr] = match;
  const count = Number(countStr);
  const sides = Number(sidesStr);
  const bonus = bonusStr ? Number(bonusStr) : 0;
  const rolls = Array.from({ length: count }, () => rollDie(rng, sides));
  const total = rolls.reduce((a, b) => a + b, 0) + bonus;
  return { rolls, bonus, total, formula };
}

/** A single d20 check roll. */
export function rollD20(rng) {
  return rollDie(rng, 20);
}
