/**
 * The GM's strip along the top of a stage: its master switches. Everything on it is real for every screen at once,
 * because each button writes to the scene's own flags or to the chalk journal, which Foundry sends to everyone.
 *
 *   Hands off no one but a GM can move a card (a hearing, a speech, a death); a player carrying one puts it down
 *   Chalk     as the scene says -> off -> zones only -> anywhere (the GM's override of a serious scene, or the reverse)
 *   Freeze    keep the wall, take the chalk away
 *   Undo      take the newest stroke off the wall, whoever drew it
 *   Wipe      clear the wall
 *   Hide      put the wall out of sight without losing it
 */

import { NS, handsOff } from "./scene-data.mjs";
import { nextOverride } from "../core/chalk.mjs";

const t = (key, data) => (data ? game.i18n.format(`STAGECRAFT.Bar.${key}`, data) : game.i18n.localize(`STAGECRAFT.Bar.${key}`));

const BUTTONS = ["hands", "mode", "freeze", "undo", "wipe", "hide"];

export class StageBar {
  constructor(host) {
    this.host = host;
    this.el = document.createElement("div");
    this.el.className = "stagecraft-bar";
    this.el.setAttribute("role", "toolbar");
    this.el.setAttribute("aria-label", t("Label"));
    this.el.innerHTML = BUTTONS.map((act) => `<button type="button" data-act="${act}"></button>`).join("");
    host.root.append(this.el);
    this.el.addEventListener("click", this.#click);
    this.refresh();
  }

  dispose() {
    this.el?.removeEventListener("click", this.#click);
    this.el?.remove();
    this.el = null;
  }

  get #scene() { return this.host.scene; }
  get #live() { return this.#scene.flags?.[NS]?.live ?? {}; }

  /** Show the state the scene is in now. */
  refresh() {
    if (!this.el) return;
    const chalk = this.host.chalk;
    if (!chalk) { this.el.hidden = true; return; }
    this.el.hidden = false;
    const policy = chalk.policy();
    const override = this.#live.chalk?.mode ?? null;
    const set = (act, text, { on = false, tip = "", disabled = false } = {}) => {
      const b = this.el.querySelector(`[data-act="${act}"]`);
      b.textContent = text;
      b.title = tip;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("on", on);
      b.disabled = disabled;
    };
    set("hands", t("Hands.Label"), { on: handsOff(this.#scene), tip: t("Hands.Tip") });
    set("mode", override ? t("Mode.Set", { mode: t(`Mode.${override}`) }) : t("Mode.Scene", { mode: t(`Mode.${policy.mode}`) }), { on: !!override, tip: t("Mode.Tip") });
    set("freeze", t("Freeze.Label"), { on: policy.locked, tip: t("Freeze.Tip") });
    set("undo", t("Undo.Label"), { tip: t("Undo.Tip"), disabled: !chalk.store.ready });
    set("wipe", t("Wipe.Label"), { tip: t("Wipe.Tip"), disabled: !chalk.store.ready });
    set("hide", t("Hide.Label"), { on: this.#live.chalkHidden === true, tip: t("Hide.Tip") });
  }

  #click = (event) => {
    const button = event.target.closest("button[data-act]");
    if (!button || button.disabled) return;
    this.#act(button.dataset.act).catch((err) => console.warn(`${NS} | the stage bar could not do "${button.dataset.act}"`, err));
  };

  async #act(act) {
    const scene = this.#scene;
    const chalk = this.host.chalk;
    const store = chalk?.store;
    if (act === "hands") {
      await scene.update({ [`flags.${NS}.live.handsOff`]: !handsOff(scene) });
    } else if (act === "mode") {
      await scene.update({ [`flags.${NS}.live.chalk.mode`]: nextOverride(this.#live.chalk?.mode) });
    } else if (act === "freeze") {
      await scene.update({ [`flags.${NS}.live.chalk.locked`]: !chalk.policy().locked });
    } else if (act === "hide") {
      await scene.update({ [`flags.${NS}.live.chalkHidden`]: !(this.#live.chalkHidden === true) });
    } else if (act === "undo") {
      // the newest stroke on the whole wall, whoever made it (each layer keeps what its last strokes covered)
      await store.undo(scene.id);
    } else if (act === "wipe") {
      const yes = await foundry.applications.api.DialogV2.confirm({
        window: { title: t("Wipe.Title") },
        content: `<p>${t("Wipe.Ask")}</p>`,
        yes: { default: false }
      });
      if (yes) await store.wipe(scene.id);
    }
    this.refresh();
  }
}
