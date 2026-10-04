/**
 * Words on hover. Two kinds, both after the pointer has rested a moment and never while a card is carried or chalk is in hand:
 *
 *   - **A card's full words.** A card's title block fits its name and the line of text under it to a plate the size of a
 *     thumbnail, and a long text is cut there; held over such a card (core/titleblock.mjs `tipFor`) the pointer reads all of it.
 *   - **Who painted that.** For the GM, held over chalk on the wall: the name of whoever painted it ("who did that?").
 *
 * It goes when the pointer moves to something else, presses, or the stage is torn down.
 */

import { tipFor } from "../core/titleblock.mjs";

const DELAY = 450;          // ms the pointer rests before it speaks
const GAP = 16;             // px between the pointer and the tip

export class HoverTip {
  constructor(host) {
    this.host = host;
    this.el = null;
    this.key = null;
    this.say = null;
    this.timer = null;
  }

  /** The pointer is over a card (`id`) at these page coordinates, or over nothing (`null`). */
  hover(id, x, y) {
    this.#over(id, x, y, () => tipFor(this.host.stage?.cards.get(id)?.person));
  }

  /**
   * The pointer is over the wall at these page coordinates, in stage pixels `p`: it says who painted what is there, if the
   * viewer is the GM and there is paint. Keyed by a coarse cell of the wall, so moving on to other paint speaks again.
   */
  hoverWall(p, x, y) {
    if (!game.user.isGM || !this.host.chalk) return this.#over(null, x, y);
    this.#over(`wall:${Math.round(p.x / 24)}:${Math.round(p.y / 24)}`, x, y, () => {
      const who = this.host.chalk.painterAt(p);
      return who ? { name: game.i18n.format("STAGECRAFT.Chalk.PaintedBy", { name: who }), text: "" } : null;
    });
  }

  #over(key, x, y, say = null) {
    this.at = { x, y };
    if (key !== this.key) {
      this.hide();
      this.key = key;
      this.say = say;
      if (key) this.timer = setTimeout(() => this.#show(), DELAY);
      return;
    }
    if (this.el?.classList.contains("shown")) this.#place(x, y);
  }

  /** Away it goes: the pointer left, pressed, or something else has the hand. */
  hide() {
    clearTimeout(this.timer);
    this.timer = null;
    this.key = null;
    this.el?.classList.remove("shown");
  }

  dispose() {
    this.hide();
    this.el?.remove();
    this.el = null;
  }

  #show() {
    this.timer = null;
    const host = this.host;
    if (!this.key || !host.running || host.dragging || host.chalk?.inHand) return;
    const tip = this.say?.();
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
    this.#place(this.at.x, this.at.y);
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
