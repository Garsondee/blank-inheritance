/**
 * Notice queue — the banner's brain, without its body.
 *
 * A banner is a plate that drops out from under the top rail, sits for a
 * few seconds, and slides back. Only ONE is ever visible: two stacked plates
 * would eat the map, and a marker card placed under the lane would then be
 * under the second plate. So everything interesting is in the QUEUE — what
 * shows next, what jumps the queue, what merges, what gets dropped — and that
 * is pure state that can be tested without a timer or a DOM. The page owns
 * the timers and calls `dismiss()` when a plate's dwell ends.
 */

/** Dwell per kind, ms. An alarm stays longer than an advisory. */
export const NOTICE_DWELL = Object.freeze({ info: 4500, caution: 6500, alert: 8500 });

/** Rank decides who may pre-empt whom. */
export const NOTICE_RANK = Object.freeze({ info: 0, caution: 1, alert: 3 });

/** The cap word painted on the plate's brass. */
export const NOTICE_CAP = Object.freeze({ info: "Advisory", caution: "Caution", alert: "Alarm" });

export const NOTICE_KINDS = Object.freeze(Object.keys(NOTICE_RANK));

export class NoticeQueue {
  /**
   * @param {object} [opts]
   * @param {number} [opts.cap=4]           queued (not showing) notices kept
   * @param {number} [opts.mergeWindow=2000] identical text within this many ms merges
   */
  constructor({ cap = 4, mergeWindow = 2000 } = {}) {
    this.cap = cap;
    this.mergeWindow = mergeWindow;
    this.current = null;
    this.queue = [];
    this._seq = 0;
  }

  get pending() { return this.queue.length; }

  /**
   * Offer a notice. Returns what the page should do:
   *   show    — nothing was up; show this one now
   *   merge   — same text as the current plate, recently: bump its count
   *   preempt — this outranks the current plate: retire it, then show this
   *   queue   — wait behind the current plate
   * Kinds outside NOTICE_RANK throw: a typo must not quietly become "info".
   *
   * @param {{kind:string, text:string, sticky?:boolean}} notice
   * @param {number} [now] clock, ms — injectable for tests
   */
  push(notice, now = 0) {
    if (!(notice.kind in NOTICE_RANK)) throw new Error(`unknown notice kind: ${notice.kind}`);
    const n = { ...notice, id: ++this._seq, count: 1, at: now };

    if (this.current && this.current.text === n.text && now - this.current.at <= this.mergeWindow) {
      this.current.count += 1;
      this.current.at = now;
      return { action: "merge", notice: this.current };
    }
    if (!this.current) {
      this.current = n;
      return { action: "show", notice: n };
    }
    if (NOTICE_RANK[n.kind] > NOTICE_RANK[this.current.kind] && !this.current.sticky) {
      // The retired plate is not lost — it goes back to the front of the
      // line, so an advisory interrupted by an alarm still gets read.
      this.queue.unshift(this.current);
      this.current = n;
      this._trim();
      return { action: "preempt", notice: n };
    }
    this.queue.push(n);
    this._trim();
    return { action: "queue", notice: n };
  }

  /** The current plate has left. Returns the next one to show, or null. */
  dismiss() {
    this.current = this.queue.shift() || null;
    return this.current;
  }

  /** Over the cap, drop the lowest-ranked, oldest first. Never drop an alert. */
  _trim() {
    while (this.queue.length > this.cap) {
      let victim = -1;
      let lowest = Infinity;
      this.queue.forEach((q, i) => {
        const r = NOTICE_RANK[q.kind];
        if (r < lowest && q.kind !== "alert") { lowest = r; victim = i; }
      });
      if (victim === -1) break;
      this.queue.splice(victim, 1);
    }
  }
}

/**
 * Pick from a weighted pool with a caller-supplied random() so the test bed
 * can be deterministic. `pool` is [{weight, ...}].
 */
export function weightedPick(pool, random = Math.random) {
  const total = pool.reduce((s, p) => s + (p.weight ?? 1), 0);
  let r = random() * total;
  for (const p of pool) {
    r -= p.weight ?? 1;
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}
