/**
 * The start-up speed test (core/speed.mjs), run by the host: left on Automatic, the first stage a computer draws is its own
 * test. For a moment each frame is timed with the wait for the graphics card to have finished it, the frames are judged, and
 * a computer that cannot hold the lit stage is moved down: one step after two "slow" verdicts a minute apart, to the plain
 * stage at once if it is a crawl. What was found is kept in the browser (foundry/speed-store.mjs) so the next scene, and the
 * next session, start at the right tier without testing again. A player who chose their own tier is never tested or moved.
 */

import { SPEED, SpeedProbe, judge, decide } from "../core/speed.mjs";
import { NS } from "./scene-data.mjs";
import { tierSetting, chosenTier } from "./settings.mjs";
import { readSpeed, keepSpeed } from "./speed-store.mjs";
import { webglInfo } from "../render/choose.mjs";

/** The limits, with any a test of the bench has laid over them (`globalThis.__stagecraftSpeed`, never set at a table). */
export const limitsNow = () => ({ ...SPEED, ...(globalThis.__stagecraftSpeed ?? {}) });

export class SpeedTest {
  constructor(host) {
    this.host = host;
    this.probe = null;            // the probe being fed this moment, or null
    this.strikes = 0;             // "slow" verdicts in a row
    this.last = null;             // { verdict, median, at } of the most recent test, for the health report
    this.timer = null;
  }

  /** Is this computer to be tested at all: on Automatic, drawing in 3D, and not already known to run well here? */
  get wanted() {
    if (tierSetting() !== "auto") return false;
    if (this.host.backend?.name !== "three") return false;
    const kept = readSpeed();
    return !(kept && kept.ok);
  }

  /** Begin when the stage has settled. Safe to call again (a rebuilt picture): it starts over only if a test is still wanted. */
  start() {
    this.cancel();
    if (!this.wanted) return;
    this.timer = setTimeout(() => this.#begin(), limitsNow().settle);
  }

  cancel() {
    clearTimeout(this.timer);
    this.timer = null;
    this.probe = null;
  }

  #begin() {
    this.timer = null;
    if (!this.host.running || !this.wanted) return;
    this.probe = new SpeedProbe(limitsNow());
  }

  /** The host feeds a frame's cost (ms) while a test is running (`probe` is not null). */
  feed(cost, now) {
    const probe = this.probe;
    if (!probe) return;
    probe.push(cost, now);
    if (probe.done) this.#judged(probe);
  }

  #judged(probe) {
    this.probe = null;
    const limits = limitsNow();
    const result = probe.result();
    const verdict = judge(result, { limits, patient: probe.elapsed >= limits.patience });
    const tier = chosenTier();
    this.last = { verdict, median: Math.round(result.median * 10) / 10, at: Date.now() };
    console.info(`${NS} | speed test: a frame costs ${this.last.median} ms at the median (${result.n} frames, ${webglInfo().renderer || "unknown graphics"}): ${verdict}`);
    this.host.health?.changed();
    const step = decide({ tier, verdict, strikes: this.strikes, limits });
    this.strikes = step.strikes;
    if (step.to) { this.#down(step.to, verdict); return; }
    if (verdict === "ok") { keepSpeed({ ok: true }); return; }
    // one "slow" is a doubt: look again in a minute, and only two in a row move a computer down
    if (verdict === "slow") this.timer = setTimeout(() => this.#begin(), limits.again);
  }

  #down(to, verdict) {
    keepSpeed({ tier: to });
    ui.notifications?.info(game.i18n.localize(to === "flat" ? "STAGECRAFT.Notify.SpeedFlat" : "STAGECRAFT.Notify.SpeedLow"));
    console.info(`${NS} | speed test: this computer is moved down to the ${to} stage (${verdict})`);
    this.host.rebuild().catch((err) => console.warn(`${NS} | could not draw the lighter stage`, err));
  }
}
