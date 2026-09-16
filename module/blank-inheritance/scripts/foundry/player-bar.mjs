/**
 * The player's console: a SHEET. One character, deep.
 *
 * Thin on purpose — the seat is the entire difference, and every consequence
 * of it is worked out in core/console-model.mjs. If this file ever grows a
 * branch on isGM, the split has been broken: see design/ux-doctrine.md's rule
 * that a GM console is never a player console with more buttons.
 */

import { CommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";
import { actorForSeat, checkGroupsFor, rollCheck } from "./rolls.mjs";
import { ringState } from "../core/day-ring.mjs";
import { currentMoment, requestOffer, segmentContext } from "./campaign-state.mjs";

export class PlayerBar extends CommandBar {
  static SEAT = SEATS.PLAYER;

  // `classes` arrays CONCATENATE up the inheritance chain rather than
  // replacing (application.mjs:459-461), so this adds to .bi-bar.
  static DEFAULT_OPTIONS = {
    classes: ["bi-bar--player"],
    actions: {
      rollCheck: PlayerBar.#onRollCheck,
      takeOffer: PlayerBar.#onTakeOffer
    }
  };

  /** @override */
  async _decorateZone(zone) {
    if (zone.hidden) return;

    if (zone.id === "checks") {
      const actor = actorForSeat(PlayerBar.SEAT);
      zone.subject = actor?.name ?? null;
      zone.groups = checkGroupsFor(actor);
      return;
    }

    // No advance control: a player watches the clock, they do not move it.
    if (zone.id === "dome") {
      zone.ring = ringState(currentMoment());
      zone.canAdvance = false;
      return;
    }

    if (zone.id === "segment") {
      zone.segment = await segmentContext();
    }
  }

  /**
   * `this` is the application instance; ApplicationV2 binds it when it
   * dispatches a [data-action] click (application.mjs).
   */
  static async #onRollCheck(event, target) {
    await rollCheck({ actor: actorForSeat(PlayerBar.SEAT), slug: target.dataset.slug, event });
  }

  /**
   * Spend this quarter's slice — or take it back by clicking the same offer
   * again. One control, both directions, because "cancel" as a separate button
   * would double the size of a zone whose whole job is to be scannable.
   *
   * Fire and forget: the write happens on the GM's client and comes back as a
   * world-setting change, which repaints every bar at the table including this
   * one. Repainting here as well would show the player a result their
   * teammates cannot see yet.
   */
  static async #onTakeOffer(event, target) {
    await requestOffer(target.dataset.offerId);
  }
}
