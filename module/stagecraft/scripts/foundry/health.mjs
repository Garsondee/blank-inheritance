/**
 * How each screen at the table is coping (core/health.mjs), in Foundry. Every screen drawing a stage measures its own
 * frames (`HealthMeter`) and reports now and then over the module's socket; the GM's screen gathers the reports into a small
 * board (`HealthBoard`) behind one pill in the strip: a dot that is green when everyone is fine, amber when someone is
 * slow, red when someone is struggling, and a list, when it is opened, of every player: the picture they are on, the frame
 * rate, the graphics card. The GM sees a computer that cannot keep up in the first minutes, not after a session.
 */

import { HEALTH, frameStats, makeReport, readReport, board } from "../core/health.mjs";
import { webglInfo } from "../render/choose.mjs";
import { chosenTier } from "./settings.mjs";

const t = (key, data) => (data ? game.i18n.format(`STAGECRAFT.Health.${key}`, data) : game.i18n.localize(`STAGECRAFT.Health.${key}`));

/** Measures this screen and reports it. */
export class HealthMeter {
  constructor(host) {
    this.host = host;
    this.intervals = [];            // the last frame intervals, ms
    this.lastAt = null;
    this.timer = setInterval(() => this.send(), HEALTH.every);
    this.first = setTimeout(() => this.send(), 4000);
    this.later = null;
  }

  stop() {
    clearInterval(this.timer);
    clearTimeout(this.first);
    clearTimeout(this.later);
  }

  /** One frame was drawn at `now` (the page's clock, ms). */
  frame(now) {
    if (this.lastAt !== null) {
      this.intervals.push(now - this.lastAt);
      if (this.intervals.length > HEALTH.window) this.intervals.shift();
    }
    this.lastAt = now;
  }

  /** This screen, as a report. */
  report() {
    const h = this.host;
    return makeReport({
      backend: h.backend?.name, tier: h.backend?.name === "flat" ? "flat" : chosenTier(),
      stats: frameStats(this.intervals), probe: h.speed?.last?.median ?? null,
      gpu: webglInfo().renderer, dpr: window.devicePixelRatio, size: [h.root?.clientWidth ?? 0, h.root?.clientHeight ?? 0],
      losses: h.losses, failures: h.guard?.total ?? 0, hidden: document.hidden === true, scene: h.scene?.name
    });
  }

  send() {
    const h = this.host;
    if (!h.running || !h.channel) return;
    const report = this.report();
    h.healthBoard?.take(game.user.id, report);                   // the GM's own screen is on the board too: the socket does not echo
    h.channel.send({ type: "health", ...report });
  }

  /** Something about this screen changed (a new picture, a verdict): say so soon, not at the next report. */
  changed() {
    clearTimeout(this.later);
    this.later = setTimeout(() => this.send(), 1200);
  }

  /** A message from the channel: the GM asks everyone to report (a little apart, so seven do not answer in the same moment). */
  receive(message) {
    if (message?.op !== "ask") return;
    clearTimeout(this.later);
    this.later = setTimeout(() => this.send(), 100 + Math.random() * 1200);
  }
}

/** The GM's board. */
export class HealthBoard {
  constructor(host) {
    this.host = host;
    this.table = new Map();                      // user id -> { report, at }
    this.el = document.createElement("div");
    this.el.className = "stagecraft-health";
    this.el.innerHTML = `<button type="button" class="pill" aria-expanded="false"><i class="dot"></i><span></span></button><div class="panel" hidden><p class="line"></p><ul></ul></div>`;
    host.root.append(this.el);
    this.pill = this.el.querySelector(".pill");
    this.panel = this.el.querySelector(".panel");
    this.pill.addEventListener("click", this.#toggle);
    this.timer = setInterval(() => this.render(), 5000);
    this.render();
  }

  dispose() {
    clearInterval(this.timer);
    this.pill?.removeEventListener("click", this.#toggle);
    this.el?.remove();
    this.el = null;
  }

  /** A report from `from` (the server's word for who sent it), or this GM's own. */
  take(from, report) {
    this.table.set(from, { report, at: Date.now() });
    this.render();
  }

  receive(message, from) {
    const report = readReport(message);
    if (report) this.take(from, report);
  }

  #toggle = () => {
    const open = this.panel.hidden;
    this.panel.hidden = !open;
    this.pill.setAttribute("aria-expanded", open ? "true" : "false");
    // when it is opened, everyone is asked to say how they are now
    if (open) { this.host.channel?.send({ type: "health", op: "ask" }); this.host.health?.send(); }
    this.render();
  };

  /** Put the list away (Escape). Returns true if it was open, so the key is not also taken by something else. */
  close() {
    if (!this.el || this.panel.hidden) return false;
    this.panel.hidden = true;
    this.pill.setAttribute("aria-expanded", "false");
    return true;
  }

  render() {
    if (!this.el) return;
    const people = game.users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }));
    const b = board(people, this.table, Date.now());
    this.pill.dataset.level = b.level;
    this.pill.title = b.line;
    this.pill.querySelector("span").textContent = t("Label", { n: b.chips.length - b.counts.stale, of: b.chips.length });
    if (this.panel.hidden) return;
    this.panel.querySelector(".line").textContent = b.line;
    const list = this.panel.querySelector("ul");
    list.replaceChildren(...b.chips.map((c) => {
      const li = document.createElement("li");
      li.dataset.level = c.level;
      li.title = c.tip;
      const name = document.createElement("b");
      name.textContent = c.name;
      const how = document.createElement("span");
      how.textContent = c.text;
      li.append(name, how);
      return li;
    }));
  }
}
