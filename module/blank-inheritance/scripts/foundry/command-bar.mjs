/**
 * The campaign console — the Foundry-touching half.
 *
 * The deck: ONE mounted instrument panel across the bottom of the screen,
 * present in every scene (design/visual-identity.md, "The deck"). Not a
 * floating window: it is chrome, and chrome does not get dragged around or
 * closed by accident.
 *
 * Every decision about WHAT goes on it is made by core/console-model.mjs, and
 * every piece of arithmetic about how it is drawn by core/deck-layout.mjs and
 * core/vu-meter.mjs. This file only reads live Foundry state, hands it over,
 * and puts the answer in the document. See design/testing-strategy.md §1.
 */

import { consoleLayout, resolveMode } from "../core/console-model.mjs";
import { actorForSeat } from "./rolls.mjs";
import { togglePhone } from "./phone.mjs";
import { toggleConsoleWindow } from "./console-window.mjs";
import { afterDeckRender, deckChecksFor, deckOrbFor, fitDeck, toggleActionPip } from "./deck.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/console`;

/**
 * The face partial for each content variant core/console-model.mjs resolves.
 *
 * Two variants may share one partial when they are the same hardware showing
 * different content — the player's selectors read downtime offers in theatre
 * of the mind and strikes in a fight, on the same two knobs. Every value is
 * preloaded through PARTS[].templates below, which is what registers it as a
 * Handlebars partial (loadTemplates keys partials by full path, so the lookup
 * in the track templates uses the path verbatim).
 */
const ZONE_PARTIALS = Object.freeze({
  ident: `${TEMPLATE_ROOT}/deck/deck-ident.hbs`,
  checks: `${TEMPLATE_ROOT}/deck/deck-checks.hbs`,
  orb: `${TEMPLATE_ROOT}/deck/deck-orb.hbs`,
  downtime: `${TEMPLATE_ROOT}/deck/deck-selectors.hbs`,
  strikes: `${TEMPLATE_ROOT}/deck/deck-selectors.hbs`,
  cast: `${TEMPLATE_ROOT}/deck/deck-cast.hbs`,
  director: `${TEMPLATE_ROOT}/deck/deck-director.hbs`
});

const PARTIAL_PATHS = Object.freeze([...new Set(Object.values(ZONE_PARTIALS))]);

/**
 * Which mode the live world is in.
 *
 * The scale flag is read off the viewed scene rather than the active one, so
 * a GM previewing a Frame-scale map gets the Frame-scale deck without having
 * to activate it for the table. `null` is the honest answer for an unflagged
 * scene, and resolveMode degrades that to the pure-SF2E baseline.
 *
 * The GM's "in initiative but actually talking" override is deliberately not
 * wired yet: resolveMode already accepts and tests it, but there is no
 * control to set it, and registering a setting nobody can reach would just be
 * clutter in the settings panel.
 */
export function currentMode() {
  const viewed = canvas?.scene ?? game.scenes?.current ?? null;
  return resolveMode({
    combatStarted: game.combat?.started ?? false,
    sceneScale: viewed?.getFlag(MODULE_ID, "scale") ?? null,
    gmOverride: null
  });
}

/**
 * The shared chassis. Subclassed once per seat rather than branched inside,
 * so a player's client never constructs the GM's board at all — doctrine
 * Law 11 (redaction is removal, not hiding) as a structural property rather
 * than something the templates have to keep remembering.
 *
 * The chassis DOES fill the modules both seats carry identically — the two key
 * banks and the central instrument — because they are the same hardware on
 * either side of the table; only whose numbers they show differs, and that is
 * actorForSeat's job. What a seat may additionally do with the instrument is a
 * static property of the seat (CAN_WIND_CLOCK), never a check on the user.
 */
export class CommandBar extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Subclasses set this to a value from core/console-model.mjs's SEATS. */
  static SEAT = null;

  /** Whether this seat carries the key that winds the day on a quarter. */
  static CAN_WIND_CLOCK = false;

  static DEFAULT_OPTIONS = {
    id: "bi-command-bar",
    tag: "aside",
    // .bi-deck is the panel itself (bi-components.css §10), so the
    // application root element IS the faceplate rather than wrapping it. Safe
    // because application.mjs:460 only prepends the "application" class when
    // window.frame is true, which it is not here.
    classes: ["bi-deck"],
    window: { frame: false, positioned: false },
    actions: {
      openComms: CommandBar.#onOpenComms,
      openConsole: CommandBar.#onOpenConsole,
      toggleActionPip: CommandBar.#onToggleActionPip
    }
  };

  /**
   * One part per physical section of the panel, and this set never changes.
   *
   * ApplicationV2's _replaceHTML only replaces or appends the parts present
   * in a render result — a part dropped from the descriptor set is never
   * removed from the DOM. So mode must not vary this map. It varies what the
   * modules SHOW, and a shed module renders hidden.
   *
   * No part declares `scrollable`: nothing on the deck scrolls (tested).
   */
  static PARTS = {
    left: { template: `${TEMPLATE_ROOT}/track-left.hbs`, templates: PARTIAL_PATHS },
    instrument: { template: `${TEMPLATE_ROOT}/instrument.hbs`, templates: PARTIAL_PATHS },
    right: { template: `${TEMPLATE_ROOT}/track-right.hbs`, templates: PARTIAL_PATHS }
  };

  /** The actor the last render showed, so the instrument knows whose rolls to read out. */
  _deckSubjectId = null;

  /**
   * Mount into #interface rather than document.body.
   *
   * Core's own idiom for persistent chrome, not a workaround —
   * client/applications/ui/main-menu.mjs:93-100 does exactly this, and
   * bi-foundry-bridge.css positions #bi-command-bar on the assumption that it
   * is a direct child of #interface (that file's own comment explains why it
   * cannot live in #ui-middle: 60% wide, pointer-events:none). Replacing an
   * existing node of the same id keeps a re-mount idempotent, which is what
   * makes re-asserting on every canvasReady safe.
   */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const mode = currentMode();
    const seat = this.constructor.SEAT;
    const layout = consoleLayout(mode, seat);

    // Read once per render and shared by every module: the two banks and the
    // instrument's flanks are cut from ONE split, so a key can never appear
    // on both sides or on neither.
    const actor = actorForSeat(seat);
    const deck = { mode, actor, checks: deckChecksFor(actor) };
    this._deckSubjectId = actor?.id ?? null;

    for (const track of Object.values(layout.tracks)) {
      for (const zone of track.zones) {
        zone.template = ZONE_PARTIALS[zone.partial] ?? null;
        if (zone.hidden) continue;
        this.#decorateSharedZone(zone, deck);
        // Awaited in a plain loop rather than gathered with Promise.all: zones
        // are single digits, and a rejected decorator should take down the one
        // render rather than leaving the others half-applied.
        await this._decorateZone(zone, layout, deck);
      }
    }
    return layout;
  }

  #decorateSharedZone(zone, { mode, actor, checks }) {
    if (zone.partial === "checks") {
      const side = zone.track === "left" ? "left" : "right";
      zone.bank = { side, keys: checks[side].skills };
      return;
    }
    if (zone.partial === "orb") {
      zone.orb = deckOrbFor(actor, { mode, canAdvance: this.constructor.CAN_WIND_CLOCK, checks });
    }
  }

  /**
   * Hook for a seat to fill its own modules. Base does nothing: the outer
   * modules are where the two seats genuinely differ (a sheet vs a board).
   *
   * May be async — the downtime selector reads campaign content off disk.
   */
  async _decorateZone(_zone, _layout, _deck) {}

  /** A seat's rotary selectors step here, by wheel or by key. Base has none. */
  _stepSelector(_selector, _delta) {}

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    afterDeckRender(this, {
      isGM: game.user?.isGM ?? false,
      subjectId: this._deckSubjectId,
      onStep: (selector, delta) => this._stepSelector(selector, delta)
    });
  }

  static #onOpenComms() {
    togglePhone();
  }

  static #onOpenConsole() {
    toggleConsoleWindow();
  }

  /**
   * In a fight the instrument's bezel is the action budget, and each quarter
   * of it is a key: tap one to mark that action spent. Client-side only — it
   * is a finger on a list, not a rule, and sf2e already owns what actions a
   * creature actually has. Resets when that creature's turn comes round.
   */
  static #onToggleActionPip(event, target) {
    toggleActionPip(actorForSeat(this.constructor.SEAT), Number(target.dataset.index));
    this.render({ parts: ["instrument"] });
  }
}

/* ---------------------------------------------------------------------- */
/*  The singleton                                                          */
/* ---------------------------------------------------------------------- */

let active = null;

/** The mounted bar, or null. */
export function getCommandBar() {
  return active;
}

/**
 * Mount the bar, or re-assert an already-mounted one.
 *
 * Called on ready and again on every canvasReady. A scene change repaints
 * #board, a sibling of #interface, so it leaves us alone — but re-asserting
 * is cheap and means a future core change that DOES tear down #interface
 * cannot silently leave the table without a console.
 *
 * render({force: true}) rather than a bare render(): on an application that
 * has never rendered, a non-forced render is a silent no-op.
 */
export function mountCommandBar(BarClass) {
  if (active && active.constructor === BarClass) {
    active.render({ force: true });
    return active;
  }
  active?.close();
  active = new BarClass();
  active.render({ force: true });
  return active;
}

/**
 * Re-render the mounted bar, optionally only some parts.
 *
 * Never mark a part `root: true` in PARTS — that forces a full re-render and
 * defeats the point of asking for one.
 */
export function refreshCommandBar(parts = null) {
  if (!active) return null;
  active.render(parts ? { parts } : {});
  return active;
}

/** Remove the bar entirely, leaving nothing of ours in the DOM. */
export function unmountCommandBar() {
  active?.close();
  active = null;
  fitDeck();
}
