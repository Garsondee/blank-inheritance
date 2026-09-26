/**
 * The Director's deck: a BOARD. Many creatures, one row each.
 *
 * Constructed only on a GM's client. That is the point — a player's browser
 * never instantiates this class, so GM-only content is absent rather than
 * hidden, which is the standard doctrine Law 11 holds every surface to.
 *
 * The key banks and the central instrument are filled by the shared chassis
 * (command-bar.mjs) for whatever token is selected. This seat owns its two
 * shoulders — who is here (cast) and what just happened (log) — and the one
 * key on the instrument a player's deck does not carry: winding the day.
 */

import { CommandBar, currentMode, refreshCommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";
import { actorForSeat, postInlineCheck, rollCheck } from "./rolls.mjs";
import { selectCastRow } from "./cast.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { recordLogEntry } from "./session-log.mjs";
import { quarterAt, quarterIndex } from "../core/day-ring.mjs";
import { advanceSegment } from "./campaign-state.mjs";
import { deckCastFor, deckDirectorFor } from "./deck.mjs";
import { toggleSceneRunner } from "./scene-runner.mjs";
import { toggleSoundDesk } from "./sound-desk.mjs";
import { toggleDirectorPalette } from "./director-palette.mjs";
import { toggleDemoRunner } from "./demo-runner.mjs";

export class DirectorBar extends CommandBar {
  static SEAT = SEATS.DIRECTOR;

  static CAN_WIND_CLOCK = true;

  static DEFAULT_OPTIONS = {
    classes: ["bi-deck--director"],
    actions: {
      rollCheck: DirectorBar.#onRollCheck,
      selectCast: DirectorBar.#onSelectCast,
      openCard: DirectorBar.#onOpenCard,
      castPage: DirectorBar.#onCastPage,
      advanceSegment: DirectorBar.#onAdvanceSegment,
      openRunner: DirectorBar.#onOpenRunner,
      openSoundDesk: DirectorBar.#onOpenSoundDesk,
      openPalette: DirectorBar.#onOpenPalette,
      openDemo: DirectorBar.#onOpenDemo,
      // The Turn key under the right flank drives the encounter on this seat
      // only (core/deck-combat.mjs#turnKeyState). A player's deck carries
      // End Turn instead, wired on PlayerBar — never these three.
      joinCombat: DirectorBar.#onJoinCombat,
      startCombat: DirectorBar.#onStartCombat,
      nextTurn: DirectorBar.#onNextTurn
    }
  };

  /**
   * Which page of the cast board is showing, and which turn it last followed.
   * Client memory — a hand position (foundry/deck.mjs#deckCastFor).
   */
  #castMemory = { page: 0, turnKey: null };

  /** @override */
  async _decorateZone(zone) {
    if (zone.id === "cast") {
      zone.cast = deckCastFor(this.#castMemory);
      return;
    }
    if (zone.id === "director") {
      zone.director = deckDirectorFor();
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Enter submits. Deliberately a keydown listener rather than a <form>:
    // a form inside the chassis invites Foundry's own submit handling and a
    // stray Enter anywhere else on the deck reloading the field.
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

  /** The cast board's hardware page keys. Clamped by core/deck-layout.mjs#pageOf. */
  static #onCastPage(event, target) {
    this.#castMemory.page = Math.max(0, this.#castMemory.page + Number(target.dataset.step || 0));
    this.render({ parts: ["left"] });
  }

  /**
   * Click rolls it. Ctrl rolls it secretly. Shift asks the table.
   *
   * Shift deliberately does NOT mean what it means on a character sheet
   * here — sf2e uses it to invert the roll-dialog setting. On the
   * Director's deck the far more common intent is "somebody roll this",
   * so it posts an inline check instead. The sheet still has the original
   * behaviour, and the player seat is untouched.
   */
  static async #onRollCheck(event, target) {
    const slug = target.dataset.slug;
    if (!slug) return;
    // With nothing selected the whole bank asks the table (2026-09-23): the
    // same post shift has always made, now the plain press too, because
    // there is no one creature for a plain press to roll for.
    const actor = actorForSeat(DirectorBar.SEAT);
    if (event?.shiftKey || !actor) {
      await postInlineCheck({ slug, label: target.dataset.label ?? null });
      return;
    }
    await rollCheck({ actor, slug, event });
  }

  /**
   * The Director's script, as a pill on the deck's own right shoulder rather
   * than a floating circle bolted on beside it — Ingram's direct feedback,
   * 2026-09-17, against the real server: "the scene runner button needs to
   * be part of the main UI, not a circle off on its own." Same toggle
   * chassis scene-runner.mjs already has; this just gives it a second, deck-
   * native door in alongside its own standalone toggle button.
   */
  static #onOpenRunner() {
    toggleSceneRunner();
  }

  /**
   * The Deck's own door into the Sound Desk — 2026-09-18: the Deck should be
   * one true control surface, not blind to what Sound Desk is doing (it now
   * reads directorState() for the now-playing chip above; this is the other
   * half, actually reaching the controls). Same pill idiom as openRunner.
   */
  static #onOpenSoundDesk() {
    toggleSoundDesk();
  }

  /**
   * The Director's Palette (Ctrl+K) — one search box over every scene, cast
   * member, cue and Foundry command — given a key on the deck so it is
   * findable by hand, not only by someone who remembers the shortcut.
   */
  static #onOpenPalette() {
    toggleDirectorPalette();
  }

  /**
   * The demo/walkthrough runner's own door — 2026-09-23, Ingram: "I think
   * you need to put that into the UI for the GM only." It used to be a
   * separate floating round button (.bi-demo-runner-btn, now hidden while
   * the deck is mounted); this is the deck-native pill in its place, same
   * idiom as openRunner/openSoundDesk. mountDemoRunner's own isGM guard
   * already refuses to construct the panel for anyone else, and this action
   * is only ever wired on DirectorBar (never PlayerBar or the shared
   * chassis), so a player's deck carries no way to reach it at all.
   */
  static #onOpenDemo() {
    toggleDemoRunner();
  }

  /**
   * Put the selected tokens into an encounter — Foundry's own
   * createCombatants, which builds the encounter first when there is none.
   * The same thing the token HUD's "toggle combat" does, for a whole
   * selection in one press.
   */
  static async #onJoinCombat() {
    const tokens = (canvas?.tokens?.controlled ?? []).map((t) => t.document).filter((d) => !d.inCombat);
    if (!tokens.length) return;
    await foundry.utils.getDocumentClass("Token").createCombatants(tokens);
  }

  static async #onStartCombat() {
    await game.combat?.startCombat();
  }

  /**
   * Pass the turn on. Ctrl ends the encounter instead, through Foundry's own
   * endCombat, which asks for confirmation itself — a mis-press costs a
   * dialog, never a fight.
   */
  static async #onNextTurn(event) {
    const combat = game.combat;
    if (!combat) return;
    if (event?.ctrlKey || event?.metaKey) {
      await combat.endCombat();
      return;
    }
    await combat.nextTurn();
  }
}
