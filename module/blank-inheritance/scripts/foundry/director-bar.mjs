/**
 * The Director's console: a BOARD. Many creatures, one row each.
 *
 * Constructed only on a GM's client. That is the point — a player's browser
 * never instantiates this class, so GM-only content is absent rather than
 * hidden, which is the standard doctrine Law 11 holds every surface to.
 */

import { CommandBar, refreshCommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";
import { actorForSeat, checkGroupsFor, postInlineCheck, rollCheck } from "./rolls.mjs";
import { castForScene, selectCastRow } from "./cast.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { currentEntries, loadSessionLog, recordLogEntry } from "./session-log.mjs";
import { currentMode } from "./command-bar.mjs";
import { ringState, quarterAt, quarterIndex } from "../core/day-ring.mjs";
import { advanceSegment, currentMoment } from "./campaign-state.mjs";

export class DirectorBar extends CommandBar {
  static SEAT = SEATS.DIRECTOR;

  static DEFAULT_OPTIONS = {
    classes: ["bi-bar--director"],
    actions: {
      rollCheck: DirectorBar.#onRollCheck,
      selectCast: DirectorBar.#onSelectCast,
      openCard: DirectorBar.#onOpenCard,
      advanceSegment: DirectorBar.#onAdvanceSegment
    }
  };

  /** @override */
  async _decorateZone(zone) {
    if (zone.hidden) return;

    // The clock is the Director's to move, and only theirs. The zone is
    // identical on both seats except for this one control — which is the
    // right shape: a player watches the same instrument, they just cannot
    // wind it.
    if (zone.id === "dome") {
      zone.ring = ringState(currentMoment());
      zone.canAdvance = true;
      return;
    }

    if (zone.id === "checks") {
      const actor = actorForSeat(DirectorBar.SEAT);
      zone.subject = actor?.name ?? null;
      zone.groups = checkGroupsFor(actor);
      zone.canPost = true;
      return;
    }

    if (zone.id === "cast") {
      Object.assign(zone, castForScene());
      return;
    }

    if (zone.id === "log") {
      zone.entries = currentEntries().slice(-3).reverse();
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);

    // Enter submits. Deliberately a keydown listener rather than a <form>:
    // a form inside the chassis invites Foundry's own submit handling and a
    // stray Enter anywhere else in the bar reloading the field.
    // _onRender fires for ANY part re-render, including ones that leave this
    // element untouched -- so without a guard the log field collects a second
    // listener every time the cast board repaints, and one Enter submits twice.
    const field = this.element?.querySelector("[data-bi-log-input]");
    if (!field || field.dataset.biBound) return;
    field.dataset.biBound = "1";

    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      const text = field.value;
      field.value = "";
      DirectorBar.#submitLog(text).catch((err) =>
        console.error("Blank Inheritance | Could not record a log entry:", err)
      );
    });
  }

  /**
   * The GM types the meaning; the console attaches the context. Running the
   * session and recording it are one act (doctrine Law 15), so this never
   * opens a dialog and never asks for a field.
   */
  static async #submitLog(text) {
    const actor = actorForSeat(DirectorBar.SEAT);
    const entry = await recordLogEntry({
      text,
      nowIso: new Date().toISOString(),
      scene: canvas?.scene?.name ?? null,
      mode: currentMode(),
      subject: actor?.name ?? null
    });
    if (entry) refreshCommandBar(["right"]);
  }

  /**
   * Wind the clock on one quarter.
   *
   * Auto-logs, because advancing the day IS a session event and doctrine Law 15
   * says running the session and recording it are one act — a GM should never
   * have to remember to write down that the evening started.
   *
   * The louder half of the ceremony (a `.bi-banner` drop, a sound cue) is
   * deliberately NOT here: that machinery belongs to the sting work specified
   * in design/theatre-of-the-mind-staging.md §5, and building a second,
   * parallel notice path now would mean tearing one out later.
   */
  static async #onAdvanceSegment() {
    const change = await advanceSegment(1);
    if (!change) return;
    const { before, after, newDay } = change;
    await recordLogEntry({
      text: newDay
        ? `Day ${after.day} begins — ${quarterAt(quarterIndex(after.quarter)).id}.`
        : `${quarterAt(quarterIndex(after.quarter)).id} of day ${after.day}.`,
      nowIso: new Date().toISOString(),
      scene: canvas?.scene?.name ?? null,
      mode: currentMode(),
      subject: `day ${before.day} ${before.quarter}`
    });
    refreshCommandBar();
  }

  static async #onSelectCast(event, target) {
    selectCastRow(target.dataset.tokenId);
  }

  static async #onOpenCard(event, target) {
    openCharacterCard(target.dataset.actorId);
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
