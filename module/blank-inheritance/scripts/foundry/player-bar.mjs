/**
 * The player's deck: a SHEET. One character, deep.
 *
 * Thin on purpose — the seat is the entire difference, and every consequence
 * of it is worked out in core/console-model.mjs. If this file ever grows a
 * branch on isGM, the split has been broken: see design/ux-doctrine.md's rule
 * that a GM console is never a player console with more buttons.
 *
 * The key banks and the central instrument are filled by the shared chassis
 * (command-bar.mjs). This seat owns its two shoulders: who I am (ident) and
 * what I can choose between (selectors).
 */

import { CommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";
import { actorForSeat, rollCheck, rollStrike } from "./rolls.mjs";
import { requestOffer } from "./campaign-state.mjs";
import { toggleConsoleWindow } from "./console-window.mjs";
import { deckIdentFor, deckSelectorsFor } from "./deck.mjs";

export class PlayerBar extends CommandBar {
  static SEAT = SEATS.PLAYER;

  // `classes` arrays CONCATENATE up the inheritance chain rather than
  // replacing (application.mjs:459-461), so this adds to .bi-deck.
  static DEFAULT_OPTIONS = {
    classes: ["bi-deck--player"],
    actions: {
      rollCheck: PlayerBar.#onRollCheck,
      rollLore: PlayerBar.#onRollCheck,
      rollStrike: PlayerBar.#onRollStrike,
      selectorStep: PlayerBar.#onSelectorStep,
      takeOffer: PlayerBar.#onTakeOffer,
      openSheet: PlayerBar.#onOpenSheet
    }
  };

  /**
   * Where each rotary selector was left. Client memory, deliberately: which
   * lore a player last dialled up is a hand position, not campaign state.
   */
  #selectorIndices = { lore: 0, downtime: 0, strike: 0 };

  /** @override */
  async _decorateZone(zone, _layout, { mode, actor, checks }) {
    if (zone.id === "ident") {
      zone.ident = deckIdentFor(actor);
      return;
    }
    if (zone.id === "selectors") {
      zone.selectors = await deckSelectorsFor(actor, { mode, indices: this.#selectorIndices, checks });
    }
  }

  /** @override */
  _stepSelector(selector, delta) {
    if (!(selector in this.#selectorIndices)) return;
    this.#selectorIndices[selector] = Math.max(0, this.#selectorIndices[selector] + delta);
    this.render({ parts: ["right"] });
  }

  /**
   * `this` is the application instance; ApplicationV2 binds it when it
   * dispatches a [data-action] click (application.mjs).
   */
  static async #onRollCheck(event, target) {
    if (!target.dataset.slug) return;
    await rollCheck({ actor: actorForSeat(PlayerBar.SEAT), slug: target.dataset.slug, event });
  }

  static async #onRollStrike(event, target) {
    await rollStrike({
      actor: actorForSeat(PlayerBar.SEAT),
      actionIndex: Number(target.dataset.actionIndex),
      variantIndex: Number(target.dataset.variantIndex),
      event
    });
  }

  /**
   * A click on a knob turns it one detent: the right half clockwise, the left
   * half back, the way a hand reaches for a real selector. A keyboard press
   * (event.detail 0 — no pointer position to read) steps clockwise; the arrow
   * keys step either way (foundry/deck.mjs).
   */
  static #onSelectorStep(event, target) {
    let delta = 1;
    if (event.detail > 0) {
      const rect = target.getBoundingClientRect();
      delta = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
    }
    this._stepSelector(target.dataset.selector, delta);
  }

  /**
   * Spend this quarter's slice — or take it back by clicking the same offer
   * again. One control, both directions.
   *
   * Fire and forget: the write happens on the GM's client and comes back as a
   * world-setting change, which repaints every deck at the table including
   * this one. Repainting here as well would show the player a result their
   * teammates cannot see yet.
   */
  static async #onTakeOffer(event, target) {
    if (!target.dataset.offerId) return;
    await requestOffer(target.dataset.offerId);
  }

  static #onOpenSheet() {
    toggleConsoleWindow();
  }
}
