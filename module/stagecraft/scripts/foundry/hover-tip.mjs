/**
 * The full words of a card, on hover. A card's title block fits its name and the line of text under it to a plate the size of
 * a thumbnail, and a long text is cut there; held over a card for a moment, the pointer reads all of it, in the page's own
 * type (the browser breaks the lines, in any language). Only a card that has more to say than its plate shows gets one
 * (core/titleblock.mjs `tipFor`), never while a card is being carried or chalk is in hand, and it goes when the pointer
 * moves off, presses, or the stage is torn down.
 */

import { tipFor } from "../core/titleblock.mjs";

const DELAY = 450;          // ms the pointer rests on a card before it speaks
const GAP = 16;             // px between the pointer and the tip

export class HoverTip {
  constructor(host) {
    this.host = host;
    this.el = null;
    this.id = null;
    this.timer = null;
  }

  /** The pointer is over card `id` (or over nothing, `null`) at these page coordinates. */
  hover(id, x, y) {
    if (id !== this.id) {
      this.hide();
      this.id = id;
      if (id) this.timer = setTimeout(() => this.#show(x, y), DELAY);
      this.at = { x, y };
      return;
    }
    this.at = { x, y };
    if (this.el?.classList.contains("shown")) this.#place(x, y);
  }

  /** Away it goes: the pointer left, pressed, or something else has the hand. */
  hide() {
    clearTimeout(this.timer);
    this.timer = null;
    this.id = null;
    this.el?.classList.remove("shown");
  }

  dispose() {
    this.hide();
    this.el?.remove();
    this.el = null;
  }

  #show(x, y) {
    this.timer = null;
    const host = this.host;
    if (!this.id || !host.running || host.dragging || host.chalk?.inHand) return;
    const tip = tipFor(host.stage?.cards.get(this.id)?.person);
    if (!tip) return;
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "stagecraft-tip";
      this.el.setAttribute("role", "tooltip");
      host.root.append(this.el);
    }
    this.el.replaceChildren();
    const name = document.createElement("div");
    name.className = "tip-name";
    name.textContent = tip.name;
    this.el.append(name);
    if (tip.text) {
      const text = document.createElement("div");
      text.className = "tip-text";
      text.textContent = tip.text;
      this.el.append(text);
    }
    this.el.classList.add("shown");
    this.#place(this.at?.x ?? x, this.at?.y ?? y);
  }

  /** Beside the pointer, below and to the right of it, and kept inside the window. */
  #place(x, y) {
    const el = this.el;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(8, Math.min(x + GAP, window.innerWidth - w - 8));
    const top = y + GAP + h > window.innerHeight - 8 ? Math.max(8, y - GAP - h) : y + GAP;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }
}
