/**
 * The Director's console: a BOARD. Many creatures, one row each.
 *
 * Constructed only on a GM's client. That is the point — a player's browser
 * never instantiates this class, so GM-only content is absent rather than
 * hidden, which is the standard doctrine Law 11 holds every surface to.
 */

import { CommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";
import { actorForSeat, checkGroupsFor, postInlineCheck, rollCheck } from "./rolls.mjs";

export class DirectorBar extends CommandBar {
  static SEAT = SEATS.DIRECTOR;

  static DEFAULT_OPTIONS = {
    classes: ["bi-bar--director"],
    actions: {
      rollCheck: DirectorBar.#onRollCheck
    }
  };

  /** @override */
  _decorateZone(zone) {
    if (zone.id !== "checks" || zone.hidden) return;
    const actor = actorForSeat(DirectorBar.SEAT);
    zone.subject = actor?.name ?? null;
    zone.groups = checkGroupsFor(actor);
    zone.canPost = true;
  }

  /**
   * Click rolls it. Ctrl rolls it secretly. Shift asks the table.
   *
   * Shift deliberately does NOT mean what it means on a character sheet
   * here — sf2e uses it to invert the roll-dialog setting. On the
   * Director's bar the far more common intent is "somebody roll this",
   * so it posts an inline check instead. The sheet still has the original
   * behaviour, and the player seat is untouched.
   */
  static async #onRollCheck(event, target) {
    const slug = target.dataset.slug;
    if (event?.shiftKey) {
      await postInlineCheck({ slug, label: target.getAttribute("title") });
      return;
    }
    await rollCheck({ actor: actorForSeat(DirectorBar.SEAT), slug, event });
  }
}
