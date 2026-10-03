/**
 * Can this computer draw the stage? Pure.
 *
 * Stagecraft draws at one of three tiers (renderer.md §5.1): high (lights, shadows, glow), low (lights only) and flat (a
 * plain 2D canvas). Left on Automatic the module picks the first from what Foundry's own performance mode says, and a
 * machine with no graphics card at all is sent to flat straight away (render/choose.mjs). That leaves the computers that
 * have a card too weak for the lit stage, which nothing can tell until the stage is drawn. So the first scene of a session
 * is its own test: for a moment the host measures what a frame COSTS (the draw, and the wait for the graphics card to have
 * finished it), which does not depend on how fast the display refreshes, and this file judges the numbers.
 *
 * A computer is only moved down on evidence: a verdict of "slow" has to be given twice, a minute apart, before the tier
 * drops one step; one of "very slow" (a frame costing more than the lit stage can ever be worth) drops it to flat at once.
 * Nothing here ever raises a tier, and a player who chose a tier is never moved (the host does not even test them).
 */

export const SPEED = Object.freeze({
  ignore: 30,          // frames at the start to throw away: shaders compile and pictures upload on the first few
  take: 90,            // frames measured
  least: 30,           // fewer than this many measured frames is no verdict at all
  slowMs: 20,          // a median frame costing more than this cannot hold 50 frames a second
  veryMs: 36,          // ... more than this cannot hold 28
  patience: 8000,      // ms: a test still short of `take` frames by now is given the verdict its frames deserve
  settle: 2500,        // ms after the stage is up before the test begins: pictures have loaded, nothing else is starting
  again: 45000         // ms between the two tests that must agree before a tier drops a step
});

export const TIER_ORDER = Object.freeze(["high", "low", "flat"]);

/** The tier one step down, or null at the bottom. */
export const lowerTier = (tier) => TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? null;

/** The lower of two tiers: a stored limit can only ever pull a tier down. */
export const lowestOf = (a, b) => (TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b);

const median = (sorted) => (sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0);

/** Frames are fed in one at a time; `result()` says what they showed. */
export class SpeedProbe {
  constructor(limits = SPEED) {
    this.limits = limits;
    this.seen = 0;
    this.costs = [];
    this.began = null;
  }

  /** One frame's cost in milliseconds, from the start of its draw to the card having finished it; `now` the clock (ms). */
  push(cost, now = 0) {
    this.began ??= now;
    this.elapsed = now - this.began;
    if (++this.seen <= this.limits.ignore) return;
    if (Number.isFinite(cost) && cost >= 0 && this.costs.length < this.limits.take) this.costs.push(cost);
  }

  /** Enough frames were measured, or the test has run out of patience. */
  get done() {
    return this.costs.length >= this.limits.take || (this.elapsed ?? 0) >= this.limits.patience;
  }

  /** { n, median, p90 }, over the frames measured so far. */
  result() {
    const s = [...this.costs].sort((a, b) => a - b);
    return { n: s.length, median: median(s), p90: s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : 0 };
  }
}

/**
 * "ok", "slow", "very-slow" or "unknown" (too few frames: a hidden tab, a stage that was torn down). A test that ran out of
 * patience with some frames but too few (less than ten a second, however long it waited) is a very slow machine.
 */
export function judge(result, { limits = SPEED, patient = false } = {}) {
  if (result.n < limits.least) return patient && result.n >= 8 ? "very-slow" : "unknown";
  if (result.median > limits.veryMs) return "very-slow";
  if (result.median > limits.slowMs) return "slow";
  return "ok";
}

/**
 * What to do with a verdict: { to, strikes }. `to` is the tier to drop to (null: stay), `strikes` how many "slow" verdicts
 * in a row the machine has now had (carry it to the next test). A computer already on flat has nowhere to go.
 */
export function decide({ tier, verdict, strikes = 0, limits = SPEED }) {
  if (tier === "flat" || tier == null) return { to: null, strikes: 0 };
  if (verdict === "very-slow") return { to: "flat", strikes: 0 };
  if (verdict === "slow") return strikes + 1 >= 2 ? { to: lowerTier(tier), strikes: 0 } : { to: null, strikes: strikes + 1 };
  if (verdict === "ok") return { to: null, strikes: 0 };
  return { to: null, strikes };                         // unknown: no evidence either way
}
