/**
 * The GM's blocking strip (stage.md §7): under the chalk strip, one press per job, nothing that scrolls.
 *
 *   Life       the people of the scene go about their business (their routines), or stand where they are
 *   Board      the fight board: zones drawn plainly with who is in each, and the range bands between them
 *   Line, Huddle, Talk, Gang-up, Panel, Stand-off, Circle, Queue, Scatter
 *              a formation: press it, then click where on the floor they gather (or a person, for the one ganged up on
 *              or the one who speaks first); a double press puts it at the scene's own focus. It moves the cards the GM has
 *              selected (shift-click), or else everyone of the scene's own people
 *   Tidy       every loose card walks to its nearest free mark
 *   Places     everyone moved goes back to where the scene put them, and back to their routines
 *   Box here   then click the floor: the box of chalk goes there (a scene's authored spot for it)
 *   Edit stage show the marks and the corners of the zones as handles to drag (stage-editor.mjs)
 *   Keep       where they stand now (the selected, or everyone) is where the scene puts them from now on
 *   moments    the scene's authored blocking, if the adventure gave any (api.blocking.registerMoments)
 *
 * Under it, a line says what a press is waiting for ("Huddle: click the floor where they gather") and how many are
 * selected.
 */

import { NS } from "./scene-data.mjs";
import { FORMATIONS } from "../core/formations.mjs";
import { arrange, backToPlaces, keepPlaces, setChalkBox, tidyUp, lifeOn, boardOn, setLife, setBoard, momentsFor } from "./blocking.mjs";

const t = (key, data) => (data ? game.i18n.format(`STAGECRAFT.Blocking.${key}`, data) : game.i18n.localize(`STAGECRAFT.Blocking.${key}`));
const KEY = { line: "Line", huddle: "Huddle", talk: "Talk", gangup: "Gangup", panel: "Panel", standoff: "Standoff", circle: "Circle", queue: "Queue", scatter: "Scatter", audience: "Audience", position: "Position" };

export class BlockingBar {
  constructor(host) {
    this.host = host;
    this.armed = null;               // the formation waiting for a click on the floor
    this.el = document.createElement("div");
    this.el.className = "stagecraft-bar stagecraft-blocking";
    this.el.setAttribute("role", "toolbar");
    this.el.setAttribute("aria-label", t("Label"));
    this.el.innerHTML = `
      <div class="row">
        <button type="button" data-act="life"></button>
        <button type="button" data-act="board"></button>
        <span class="sep"></span>
        ${FORMATIONS.map((k) => `<button type="button" data-act="form" data-kind="${k}"></button>`).join("")}
        <span class="sep"></span>
        <button type="button" data-act="tidy"></button>
        <button type="button" data-act="places"></button>
        <button type="button" data-act="keep"></button>
        <button type="button" data-act="boxhere"></button>
        <button type="button" data-act="edit"></button>
      </div>
      <div class="row moments" hidden></div>
      <div class="hint" hidden></div>`;
    host.root.append(this.el);
    this.el.addEventListener("click", this.#click);
    this.el.addEventListener("dblclick", this.#double);
    this.refresh();
  }

  dispose() {
    this.el?.removeEventListener("click", this.#click);
    this.el?.removeEventListener("dblclick", this.#double);
    this.el?.remove();
    this.el = null;
  }

  get #scene() { return this.host.scene; }

  /** Show the state the scene is in now. */
  refresh() {
    if (!this.el) return;
    const scene = this.#scene;
    const set = (button, text, { on = false, tip = "" } = {}) => {
      button.textContent = text;
      button.title = tip;
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.classList.toggle("on", on);
    };
    set(this.el.querySelector('[data-act="life"]'), t("Life.Label"), { on: lifeOn(scene), tip: t("Life.Tip") });
    set(this.el.querySelector('[data-act="board"]'), t("Board.Label"), { on: boardOn(scene), tip: t("Board.Tip") });
    for (const b of this.el.querySelectorAll('[data-act="form"]')) {
      const k = b.dataset.kind;
      set(b, t(`Form.${KEY[k]}.Label`), { on: this.armed === k, tip: `${t(`Form.${KEY[k]}.Tip`)} ${t("Form.How")}` });
    }
    set(this.el.querySelector('[data-act="tidy"]'), t("Tidy.Label"), { tip: t("Tidy.Tip") });
    set(this.el.querySelector('[data-act="places"]'), t("Places.Label"), { tip: t("Places.Tip") });
    set(this.el.querySelector('[data-act="keep"]'), t("Keep.Label"), { tip: t("Keep.Tip") });
    set(this.el.querySelector('[data-act="boxhere"]'), t("Box.Label"), { on: this.armed === "box", tip: t("Box.Tip") });
    set(this.el.querySelector('[data-act="edit"]'), t("Edit.Label"), { on: !!this.host.editor?.on, tip: t("Edit.Tip") });
    const moments = momentsFor(scene);
    const row = this.el.querySelector(".moments");
    row.hidden = !moments.length;
    row.innerHTML = moments.map((m, i) => `<button type="button" data-act="moment" data-i="${i}" title="${escape(m.tip ?? "")}">${escape(m.label)}</button>`).join("");
    this.moments = moments;
    this.#hint();
  }

  /** The line under the strip: what a press is waiting for, and the selection. */
  #hint() {
    const hint = this.el.querySelector(".hint");
    const n = this.host.selected?.size ?? 0;
    const parts = [];
    if (this.armed) parts.push(this.armed === "box" ? t("Box.Armed") : t("Armed", { name: t(`Form.${KEY[this.armed]}.Label`) }));
    if (n) parts.push(t("Selected", { n }));
    hint.hidden = !parts.length;
    hint.textContent = parts.join(" · ");
  }

  /** The selection changed (shift-click on a card). */
  selectionChanged() { if (this.el) this.#hint(); }

  /** Put the waiting formation away (Escape, a right click, or it was used). */
  disarm() {
    if (!this.armed) return false;
    this.armed = null;
    this.refresh();
    return true;
  }

  /**
   * A click on the stage while a formation is waiting: on a card, that card is who it is about (the one ganged up on, the
   * one who speaks first) and where it gathers; on the floor, that is where. Returns true when the click was taken.
   */
  async placeArmed({ card = null, at = null }) {
    const kind = this.armed;
    if (!kind) return false;
    this.disarm();
    if (kind === "box") {
      // the box of chalk goes where the floor was clicked (a click on a card is not a place)
      if (at) await setChalkBox(this.#scene, at);
      return true;
    }
    const ids = this.host.selected?.size ? [...this.host.selected] : null;
    const opts = { ids, focus: card ?? at ?? null };
    if (card && kind === "gangup") opts.target = card;
    if (card && kind === "talk") opts.speakers = [card, ...(ids ?? []).filter((id) => id !== card)];
    if (ids && kind === "talk" && !card) opts.speakers = ids.slice(0, 2);
    // a card the GM named or selected is part of it, even one of the party's
    if (card || ids) opts.party = true;
    if (card && ids && !ids.includes(card)) opts.ids = [...ids, card];
    await arrange(this.#scene, kind, opts, this.host);
    return true;
  }

  #click = (event) => {
    const button = event.target.closest("button[data-act]");
    if (!button || button.disabled) return;
    this.#act(button).catch((err) => console.warn(`${NS} | the blocking strip could not do "${button.dataset.act}"`, err));
  };

  /** A double press on a formation puts it at the scene's own focus, without waiting for a click. */
  #double = (event) => {
    const button = event.target.closest('button[data-act="form"]');
    if (!button) return;
    this.armed = null;
    const ids = this.host.selected?.size ? [...this.host.selected] : null;
    arrange(this.#scene, button.dataset.kind, { ids, party: !!ids }, this.host)
      .then(() => this.refresh())
      .catch((err) => console.warn(`${NS} | the formation could not be made`, err));
  };

  async #act(button) {
    const scene = this.#scene;
    const act = button.dataset.act;
    if (act === "life") await setLife(scene, !lifeOn(scene));
    else if (act === "board") await setBoard(scene, !boardOn(scene));
    else if (act === "form") { this.armed = this.armed === button.dataset.kind ? null : button.dataset.kind; }
    else if (act === "tidy") await tidyUp(scene, this.host);
    else if (act === "places") await backToPlaces(scene);
    else if (act === "edit") { this.host.editor?.toggle(); }
    else if (act === "boxhere") { this.armed = this.armed === "box" ? null : "box"; }
    else if (act === "keep") {
      // the selected cards, or everyone: where they stand now is where the scene puts them from now on
      const ids = this.host.selected?.size ? [...this.host.selected] : null;
      const yes = await foundry.applications.api.DialogV2.confirm({
        window: { title: t("Keep.Title") },
        content: `<p>${t(ids ? "Keep.AskSome" : "Keep.AskAll", { n: ids?.length ?? 0 })}</p>`,
        yes: { default: false }
      });
      if (yes) {
        const n = await keepPlaces(scene, this.host, ids);
        ui.notifications?.info(t("Keep.Done", { n }));
      }
    }
    else if (act === "moment") await this.moments?.[Number(button.dataset.i)]?.run?.(scene);
    this.refresh();
  }
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
