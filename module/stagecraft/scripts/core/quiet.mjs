/**
 * A moment of quiet. Pure.
 *
 * Keeping a stroke (reading its tiles back from the graphics card, encoding them, writing the journal) is work that stalls
 * the graphics card for a few frames. Done at the instant the pointer comes up it lands between two strokes of a doodle,
 * right where the next one starts (found 2026-10-04: every stroke end was three or four frames of 21 to 28 ms). So the work
 * waits for the hand to pause: `whenQuiet()` resolves once nothing has been painted for `rest` ms, or at the latest `most`
 * ms after it was asked for, or at once on `release()` (Ctrl+Z, putting the chalk away, leaving the page: something is
 * about to need what is waiting).
 */

export class Quiet {
  constructor({ rest = 450, most = 2500, now = () => performance.now(), later = (fn, ms) => setTimeout(fn, ms), cancel = (id) => clearTimeout(id) } = {}) {
    this.rest = rest;
    this.most = most;
    this.now = now;
    this.later = later;
    this.cancel = cancel;
    this.last = -Infinity;           // when something was last painted
    this.waiting = [];               // { resolve, deadline }
    this.timer = null;
  }

  /** Something was painted (a stroke began, grew or ended): the quiet starts again. */
  note() {
    this.last = this.now();
    if (this.waiting.length) this.#arm();
  }

  /** A promise that resolves when the hand has been still for `rest` ms, at the latest `most` ms from now. */
  whenQuiet() {
    return new Promise((resolve) => {
      this.waiting.push({ resolve, deadline: this.now() + this.most });
      this.#arm();
    });
  }

  /** Whatever is waiting goes now. */
  release() {
    const all = this.waiting;
    this.waiting = [];
    this.#disarm();
    for (const w of all) w.resolve();
  }

  /** How many are waiting (for tests and the bench). */
  get pending() { return this.waiting.length; }

  #disarm() {
    if (this.timer !== null) { this.cancel(this.timer); this.timer = null; }
  }

  #arm() {
    this.#disarm();
    if (!this.waiting.length) return;
    const now = this.now();
    const quietAt = this.last + this.rest;
    const soonest = Math.min(...this.waiting.map((w) => w.deadline));
    const at = Math.min(quietAt, soonest);
    this.timer = this.later(() => this.#check(), Math.max(0, at - now));
  }

  #check() {
    this.timer = null;
    const now = this.now();
    const quiet = now - this.last >= this.rest;
    const go = [];
    this.waiting = this.waiting.filter((w) => {
      if (quiet || now >= w.deadline) { go.push(w); return false; }
      return true;
    });
    for (const w of go) w.resolve();
    this.#arm();
  }
}
