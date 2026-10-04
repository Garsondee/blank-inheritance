/**
 * Can this computer draw the stage? Pure.
 *
 * Stagecraft draws at one of three tiers (renderer.md §5.1): high (lights, shadows, glow), low (lights only) and flat (a
 * plain 2D canvas). Left on Automatic the module picks the first from what Foundry's own performance mode says, and a
 * machine with no graphics card at all is sent to flat straight away (render/choose.mjs). That leaves the computers that
 * have a card too weak for the lit stage, which nothing can tell until the stage is drawn. So the first scene of a session
 * is its own test: for a moment the host times what the player actually gets, how often a new picture arrives while the stage
 * is drawing as fast as it is allowed, and this file judges the numbers.
 *
 * What is judged is the rate pictures are DELIVERED against what the display and Foundry's own cap allow, not what a draw
 * costs. The first version timed the draw plus a wait for the graphics card to be done with it (a one-pixel read back), and
 * a game using 97% of the same card made the lit stage "cost" 22 ms where it costs 6 (2026-10-04): the wait is latency, and
 * anything else on the card inflates it, while the pictures still arrive.
 *
 * A computer is only moved down on evidence, and the evidence has to be seen twice: a reading of "slow" or "very slow" is a
 * doubt, a second a minute later (when whatever was busy has had time to finish) confirms it, and only then does the tier
 * drop, one step, or to the plain stage when both readings were "very slow". A drop is remembered for half a day, not for
 * ever, so one busy evening does not decide for good (foundry/speed-store.mjs). Nothing here ever raises a tier within a
 * session, and a player who chose a tier is never moved (the host does not even test them).
 */

export const SPEED = Object.freeze({
  ignore: 30,          // pictures at the start to throw away: shaders compile and pictures upload on the first few
  take: 90,            // gaps between pictures measured
  least: 30,           // fewer than this many is no verdict at all
  fineMs: 20,          // a picture at least this often (50 a second) is fine, whatever the display
  slowRatio: 1.4,      // otherwise: a gap this many times what the display (or Foundry's cap) allows is slow ...
  veryRatio: 2.2,      // ... and this many, very slow
  display: 1000 / 60,  // the display's refresh interval, when none was seen
  patience: 12000,     // ms: a test still short of `take` gaps by now is given the verdict it deserves
  settle: 4000,        // ms after the stage is up, and Foundry is ready, before the test begins: nothing else is starting
  again: 45000,        // ms between the two readings that must agree before a tier drops
  keepHours: 12        // how long a drop is remembered before the computer is tested afresh
});

export const TIER_ORDER = Object.freeze(["high", "low", "flat"]);

/** The tier one step down, or null at the bottom. */
export const lowerTier = (tier) => TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? null;

/** The lower of two tiers: a stored limit can only ever pull a tier down. */
export const lowestOf = (a, b) => (TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b);

const median = (sorted) => (sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0);

/**
 * The refresh rates displays have, in Hz, slowest first: a measured pace is taken to be the slowest of these that it is not
 * too quick for. (No 50, 48 or 24: a busy 60 Hz display would be read as one of them.)
 */
const REFRESH = Object.freeze([30, 60, 72, 75, 90, 100, 120, 144, 165, 240]);

/**
 * The display's own refresh interval (ms), from the gaps between a handful of animation frames seen before the stage drew
 * anything. The page is busy while the stage is being built, which only ever makes a gap longer, never shorter than the
 * display allows, so it is a low quantile that is taken (a fifth of the gaps are as short as this), not the median, and it
 * is read as the refresh rate it must be: a gap of 17.4 ms is a 60 Hz display, one of 25 ms a busy 60 Hz display. A page too
 * busy to say (gaps of a tenth of a second) or too few to trust is the usual 60 Hz.
 */
export function displayInterval(gaps, limits = SPEED) {
  const s = (gaps ?? []).filter((g) => Number.isFinite(g) && g > 0).sort((a, b) => a - b);
  if (s.length < 8) return limits.display;
  const low = s[Math.floor(s.length * 0.2)];
  if (low < 1000 / 244 || low > 1000 / 28) return limits.display;
  const hz = REFRESH.find((rate) => 1000 / rate <= low * 1.05);
  return hz ? 1000 / hz : limits.display;
}

/** Is a remembered drop still to be believed at `now`? (`at` is when it was found, in ms.) */
export function dropStands(at, now = Date.now(), limits = SPEED) {
  return Number.isFinite(at) && now - at >= 0 && now - at < limits.keepHours * 3600 * 1000;
}

/** Drawn pictures are fed in one at a time, by the clock's time at each; `result()` says what the gaps between them showed. */
export class SpeedProbe {
  constructor(limits = SPEED) {
    this.limits = limits;
    this.seen = 0;
    this.gaps = [];
    this.began = null;
    this.previous = null;
  }

  /** A picture was drawn at `now` (ms). */
  push(now) {
    this.began ??= now;
    this.elapsed = now - this.began;
    const gap = this.previous === null ? null : now - this.previous;
    this.previous = now;
    if (gap === null || ++this.seen <= this.limits.ignore) return;
    if (Number.isFinite(gap) && gap >= 0 && this.gaps.length < this.limits.take) this.gaps.push(gap);
  }

  /** Enough gaps were measured, or the test has run out of patience. */
  get done() {
    return this.gaps.length >= this.limits.take || (this.elapsed ?? 0) >= this.limits.patience;
  }

  /** { n, median, p90 }, over the gaps measured so far. */
  result() {
    const s = [...this.gaps].sort((a, b) => a - b);
    return { n: s.length, median: median(s), p90: s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))] : 0 };
  }
}

/**
 * "ok", "slow", "very-slow" or "unknown" (too few pictures: a hidden tab, a stage that was torn down). A test that ran out of
 * patience with some pictures but too few (less than ten a second, however long it waited) is a very slow machine.
 * `display` is the display's refresh interval and `cap` the most pictures a second the stage is allowed (Foundry's own
 * setting, Infinity when it is uncapped): a stage drawing every 33 ms is fine on a display that shows 30 a second, or when
 * Foundry was asked for 30, and slow on one that shows 60. Nothing better than sixty a second is ever asked for: a fast
 * display with Foundry uncapped is not a reason to call a stage delivering forty a second a crawl.
 */
export function judge(result, { limits = SPEED, display = null, cap = 60, patient = false } = {}) {
  if (result.n < limits.least) return patient && result.n >= 8 ? "very-slow" : "unknown";
  if (result.median <= limits.fineMs) return "ok";
  const asked = Number.isFinite(cap) && cap > 0 ? Math.min(cap, 60) : 60;
  const allowed = Math.max(1000 / asked, display ?? limits.display);
  const ratio = result.median / allowed;
  if (ratio > limits.veryRatio) return "very-slow";
  if (ratio > limits.slowRatio) return "slow";
  return "ok";
}

/**
 * What to do with a verdict: { to, strikes, hard }. `to` is the tier to drop to (null: stay); `strikes` how many "slow" or
 * "very-slow" readings in a row the machine has now had and `hard` how many of those were "very-slow" (carry both to the
 * next test). One reading is a doubt. The second confirms it: one step down, or to the plain stage when both were very
 * slow. A reading of "ok" clears the doubt. A computer already on flat has nowhere to go.
 */
export function decide({ tier, verdict, strikes = 0, hard = 0 }) {
  if (tier === "flat" || tier == null) return { to: null, strikes: 0, hard: 0 };
  if (verdict === "ok") return { to: null, strikes: 0, hard: 0 };
  if (verdict !== "slow" && verdict !== "very-slow") return { to: null, strikes, hard };    // unknown: no evidence either way
  const s = strikes + 1;
  const h = hard + (verdict === "very-slow" ? 1 : 0);
  if (s < 2) return { to: null, strikes: s, hard: h };
  return { to: h >= 2 ? "flat" : lowerTier(tier), strikes: 0, hard: 0 };
}
