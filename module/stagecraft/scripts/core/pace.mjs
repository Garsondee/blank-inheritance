/**
 * How often the stage draws. Pure.
 *
 * Left alone the stage draws at the display's refresh rate, whatever it is (144 times a second on a fast monitor), and
 * draws just as hard when nothing on it is moving. A table's evening is long, and a laptop's fan and battery are felt.
 * Two rules, both the player's to turn off:
 *
 *   - **The player's own cap.** Foundry has a Maximum Framerate setting (10 to 60, and none at all in its Maximum
 *     performance mode); the stage obeys it, and never goes past 60 unless Foundry has been told to be uncapped.
 *   - **Easing off when still.** While nothing on the stage moves (no card walking or held, nobody painting or touching the
 *     pointer, no bang) the stage draws at half that, 30 a second, which the lamps' flicker and the drifting dust do not
 *     need more than; the moment anything moves it is back to full rate, and stays there for a moment after.
 */

export const PACE = Object.freeze({
  cap: 60,             // frames a second when Foundry says nothing
  idle: 30,            // frames a second when nothing moves
  wake: 1500,          // ms at full rate after the last movement
  walking: 0.5,        // how far a card must have gone between two frames to count as walking, in the stage's units (a unit is under a pixel)
  still: 0.02,         // how far a stick's grip or a fall (both 0 to 1) must change between two frames to count as moving
  early: 1.5           // ms of slack: a frame this much before it is due is taken, so a 60 Hz display holds 60
});

/** The frame-rate cap Foundry's settings ask for: a number of frames a second, or Infinity when Foundry is uncapped. */
export function capFrom({ fps, mode = null, max = null } = {}) {
  const set = Number.isFinite(Number(fps)) && Number(fps) > 0 ? Number(fps) : PACE.cap;
  if (max !== null && mode === max && set >= 60) return Infinity;       // Foundry's Maximum performance mode lets the display lead
  return Math.max(10, Math.min(60, set));
}

export class Pace {
  constructor({ cap = PACE.cap, idle = PACE.idle, wake = PACE.wake, easing = true } = {}) {
    this.cap = cap;
    this.idle = idle;
    this.wake = wake;
    this.easing = easing;       // false: never ease off (the player turned it off)
    this.awakeUntil = -Infinity;
    this.next = -Infinity;      // when the next frame is due
  }

  /** Something moved, or was touched: full rate until `wake` ms after `now`. */
  poke(now) {
    this.awakeUntil = Math.max(this.awakeUntil, now + this.wake);
  }

  /** Is the stage at full rate at `now`? */
  active(now) {
    return !this.easing || now < this.awakeUntil;
  }

  /** The ms between frames at `now` (0: as fast as the display goes). */
  gap(now) {
    const rate = this.active(now) ? this.cap : Math.min(this.cap, this.idle);
    return rate === Infinity ? 0 : 1000 / rate;
  }

  /** Should the frame the browser has just offered, at `now`, be drawn? */
  due(now) {
    return now >= this.next - PACE.early;
  }

  /** A frame was drawn at `now`: when the next is due. A schedule, not a stopwatch, so a 144 Hz display holds 60 on average. */
  drew(now) {
    const gap = this.gap(now);
    if (!gap) { this.next = now; return; }
    this.next = this.next + gap < now - gap ? now : this.next + gap;
  }

  /**
   * What to multiply the time between two drawn frames by to read it as a frame rate against the full rate: easing off
   * draws every 33 ms by choice, which is not a slow computer. 1 at full rate.
   */
  scale(now) {
    const full = this.cap === Infinity ? 0 : 1000 / this.cap;
    const g = this.gap(now);
    return full && g ? full / g : 1;
  }
}

/**
 * What of every card says the stage is really moving, as numbers: where it stands (a walk, a formation, an arrival), its
 * stick (`grip`: in a hand, here or on another screen) and whether it is going down. The cards' ambient life (breathing, a
 * small bob, a lean, a hop now and then) is deliberately left out: measured on a still stage it changes by up to a pixel a
 * frame and would keep the stage at full rate for ever, and it looks the same at 30 a second.
 */
export function poseOf(cards) {
  const out = new Float32Array(cards.length * 4);
  let i = 0;
  for (const c of cards) {
    out[i++] = c.x ?? 0; out[i++] = c.z ?? 0; out[i++] = c.grip ?? 0; out[i++] = c.down ?? 0;
  }
  return out;
}

/**
 * Did any card's pose change by more than a threshold between two `poseOf`s (or did the cast change)? A card that has
 * nearly arrived creeps the last stretch on a spring, for ten seconds or more at a hundredth of a unit a frame (found
 * 2026-10-04 on the bench: a stage nobody touched stayed at full rate until the last card had stopped creeping); a creep
 * of under half a unit a frame is a fraction of a pixel, looks the same at 30 a second, and is stillness.
 */
export function moved(before, after, { walking = PACE.walking, still = PACE.still } = {}) {
  if (!before || before.length !== after.length) return before !== null && before !== undefined;
  for (let i = 0; i < after.length; i++) {
    const eps = i & 2 ? still : walking;            // each card is [x, z, grip, down]: the first two are places, the last two fractions
    if (Math.abs(after[i] - before[i]) > eps) return true;
  }
  return false;
}
