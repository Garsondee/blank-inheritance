/**
 * The start-up speed test (core/speed.mjs), run by the host: left on Automatic, the first stage a computer draws is its own
 * test. Once Foundry is up and the stage has settled, the stage is drawn as fast as it is allowed for a moment and the gaps
 * between its pictures are measured: what a player actually gets, against what their display and Foundry's own frame-rate
 * cap allow (which is what the display's pace is sampled for, while the stage is still being built and nothing of ours is
 * drawing). A computer that cannot hold the lit stage is moved down, but only when two readings a minute apart agree: one
 * step, or to the plain stage when both were a crawl. What was found is kept in the browser (foundry/speed-store.mjs) so the
 * next scene, and the next session, start at the right tier without testing again; a drop is forgotten after half a day. A
 * player who chose their own tier is never tested or moved.
 */

import { SPEED, SpeedProbe, judge, decide, displayInterval } from "../core/speed.mjs";
import { NS } from "./scene-data.mjs";
import { tierSetting, chosenTier } from "./settings.mjs";
import { readSpeed, keepSpeed } from "./speed-store.mjs";
import { webglInfo } from "../render/choose.mjs";

/** The limits, with any a test of the bench has laid over them (`globalThis.__stagecraftSpeed`, never set at a table). */
export const limitsNow = () => ({ ...SPEED, ...(globalThis.__stagecraftSpeed ?? {}) });

const tenth = (n) => Math.round(n * 10) / 10;

export class SpeedTest {
  constructor(host) {
    this.host = host;
    this.probe = null;            // the probe being fed this moment, or null
    this.strikes = 0;             // readings of "slow" or "very-slow" in a row
    this.hard = 0;                // ... and how many of them were "very-slow"
    this.last = null;             // { verdict, median, display, at } of the most recent test, for the health report
    this.timer = null;
    this.starting = null;
    this.gaps = [];               // gaps between animation frames seen while the stage was being built: the display's own pace
    this.watch = null;
    this.away = () => this.#away();
    document.addEventListener("visibilitychange", this.away);
    this.#watchDisplay();
  }

  /** Is this computer to be tested at all: on Automatic, drawing in 3D, and not already known to run well here? */
  get wanted() {
    if (tierSetting() !== "auto") return false;
    if (this.host.backend?.name !== "three") return false;
    const kept = readSpeed();
    return !(kept && kept.ok);
  }

  /**
   * How fast the display refreshes, as the gaps between a few animation frames while the stage was still being built (the
   * host is not running, so nothing of ours is being drawn). A page in the background has no frames, and says nothing.
   */
  #watchDisplay() {
    let previous = null;
    const step = (now) => {
      this.watch = null;
      if (previous !== null) this.gaps.push(now - previous);
      previous = now;
      if (this.gaps.length < 40 && !this.host.running) this.watch = requestAnimationFrame(step);
    };
    this.watch = requestAnimationFrame(step);
  }

  /** Begin once Foundry is up and the stage has settled. Safe to call again (a rebuilt picture): it starts over only if a test is still wanted. */
  start() {
    this.cancel();
    if (!this.wanted) return;
    const mine = (this.starting = {});
    const go = () => { if (this.starting === mine) this.timer = setTimeout(() => this.#begin(), limitsNow().settle); };
    if (game.ready) go(); else Hooks.once("ready", go);
  }

  cancel() {
    clearTimeout(this.timer);
    this.timer = null;
    this.probe = null;
    this.starting = null;
  }

  /** The stage is being taken down: nothing is left running. */
  stop() {
    this.cancel();
    if (this.watch !== null) cancelAnimationFrame(this.watch);
    this.watch = null;
    document.removeEventListener("visibilitychange", this.away);
  }

  #begin() {
    this.timer = null;
    if (!this.host.running || !this.wanted) return;
    if (document.hidden) { this.timer = setTimeout(() => this.#begin(), 2000); return; }   // a page put away draws nothing: wait for it
    this.probe = new SpeedProbe(limitsNow());
  }

  /** A page put away in the middle of a test: the pictures it did not draw say nothing about the computer, so it begins again when the page is back. */
  #away() {
    if (!document.hidden || !this.probe) return;
    this.probe = null;
    this.timer = setTimeout(() => this.#begin(), limitsNow().settle);
  }

  /** The host tells the time of every picture it draws; only a running test listens. */
  feed(now) {
    const probe = this.probe;
    if (!probe) return;
    probe.push(now);
    if (probe.done) this.#judged(probe);
  }

  #judged(probe) {
    this.probe = null;
    const limits = limitsNow();
    const result = probe.result();
    const display = displayInterval(this.gaps, limits);
    const verdict = judge(result, { limits, display, cap: this.host.pace?.cap ?? 60, patient: probe.elapsed >= limits.patience });
    const tier = chosenTier();
    this.last = { verdict, median: tenth(result.median), display: tenth(display), at: Date.now() };
    console.info(`${NS} | speed test: a picture every ${this.last.median} ms at the median (${result.n} gaps; the display allows ${this.last.display} ms, ${webglInfo().renderer || "unknown graphics"}): ${verdict}`);
    this.host.health?.changed();
    const step = decide({ tier, verdict, strikes: this.strikes, hard: this.hard });
    this.strikes = step.strikes;
    this.hard = step.hard;
    if (step.to) { this.#down(step.to, verdict); return; }
    if (verdict === "ok") { keepSpeed({ ok: true }); return; }
    // one reading is a doubt: look again in a minute, and only two in a row move a computer down
    if (verdict === "slow" || verdict === "very-slow") this.timer = setTimeout(() => this.#begin(), limits.again);
  }

  #down(to, verdict) {
    keepSpeed({ tier: to });
    ui.notifications?.info(game.i18n.localize(to === "flat" ? "STAGECRAFT.Notify.SpeedFlat" : "STAGECRAFT.Notify.SpeedLow"));
    console.info(`${NS} | speed test: this computer is moved down to the ${to} stage (${verdict}, twice)`);
    this.host.rebuild().catch((err) => console.warn(`${NS} | could not draw the lighter stage`, err));
  }
}
