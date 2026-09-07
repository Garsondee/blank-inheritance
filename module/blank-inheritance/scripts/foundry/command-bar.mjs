/**
 * The campaign console — the Foundry-touching half.
 *
 * A single persistent bar across the bottom of the screen, present in every
 * scene. Not a floating window: it is chrome, and chrome does not get dragged
 * around or closed by accident.
 *
 * Every decision about WHAT goes on it is made by core/console-model.mjs.
 * This file only reads live Foundry state, hands it over, and puts the answer
 * in the document. See design/testing-strategy.md §1.
 */

import { consoleLayout, resolveMode } from "../core/console-model.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/console`;

/**
 * The content partial for each zone that HAS one yet.
 *
 * Keyed by the content-variant name core/console-model.mjs resolves, and
 * deliberately sparse: a zone whose stage has not been built is absent here
 * and renders as the labelled shell instead. Adding a key is how a stage
 * lands. Every value is preloaded through PARTS[].templates below, which is
 * what registers it as a Handlebars partial (loadTemplates keys partials by
 * full path, so the lookup in the track templates uses the path verbatim).
 */
const ZONE_PARTIALS = Object.freeze({
  skills: `${TEMPLATE_ROOT}/zone-checks.hbs`,
  board: `${TEMPLATE_ROOT}/zone-cast.hbs`,
  bar: `${TEMPLATE_ROOT}/zone-log.hbs`,
  "day-ring": `${TEMPLATE_ROOT}/zone-dome.hbs`,
  schedule: `${TEMPLATE_ROOT}/zone-segment.hbs`
});

/**
 * Which mode the live world is in.
 *
 * The scale flag is read off the viewed scene rather than the active one, so
 * a GM previewing a Frame-scale map gets the Frame-scale bar without having
 * to activate it for the table. `null` is the honest answer for an unflagged
 * scene, and resolveMode degrades that to the pure-SF2E baseline.
 *
 * The GM's "in initiative but actually talking" override is deliberately not
 * wired yet: resolveMode already accepts and tests it, but there is no
 * control to set it until the Director's bar grows one, and registering a
 * setting nobody can reach would just be clutter in the settings panel.
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
 */
export class CommandBar extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Subclasses set this to a value from core/console-model.mjs's SEATS. */
  static SEAT = null;

  static DEFAULT_OPTIONS = {
    id: "bi-command-bar",
    tag: "aside",
    // .bi-bar is the three-track grid itself (bi-components.css), so the
    // application root element IS the chassis rather than wrapping it. Safe
    // because application.mjs:460 only prepends the "application" class when
    // window.frame is true, which it is not here.
    classes: ["bi-bar"],
    window: { frame: false, positioned: false }
  };

  /**
   * One part per grid track, and this set never changes.
   *
   * ApplicationV2's _replaceHTML only replaces or appends the parts present
   * in a render result — a part dropped from the descriptor set is never
   * removed from the DOM. So mode must not vary this map. It varies what the
   * tracks CONTAIN, and an empty track renders hidden. Getting this wrong
   * leaves stale zones on screen after a mode change, which looks like a
   * rendering glitch and is really an architecture mistake.
   */
  static PARTS = {
    left: {
      template: `${TEMPLATE_ROOT}/track-left.hbs`,
      templates: Object.values(ZONE_PARTIALS),
      scrollable: [".bi-cast__rows"]
    },
    instrument: {
      template: `${TEMPLATE_ROOT}/instrument.hbs`,
      templates: Object.values(ZONE_PARTIALS)
    },
    // Selectors a given seat does not render are simply skipped —
    // _preSyncPartState null-guards every one (handlebars-application.mjs).
    right: {
      template: `${TEMPLATE_ROOT}/track-right.hbs`,
      templates: Object.values(ZONE_PARTIALS),
      scrollable: [".bi-checks", ".bi-log__recent"]
    }
  };

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
    const layout = consoleLayout(currentMode(), this.constructor.SEAT);
    for (const track of Object.values(layout.tracks)) {
      for (const zone of track.zones) {
        zone.template = ZONE_PARTIALS[zone.partial] ?? null;
        // Awaited in a plain loop rather than gathered with Promise.all: zones
        // are single digits, and a rejected decorator should take down the one
        // render rather than leaving the others half-applied.
        await this._decorateZone(zone, layout);
      }
    }
    return layout;
  }

  /**
   * Hook for a seat to attach a zone's own data. Base does nothing: the
   * chassis knows where zones go, never what is in them.
   *
   * May be async — the segment zone reads campaign content off disk.
   */
  async _decorateZone(_zone, _layout) {}
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
 * Re-render the mounted bar, optionally only some tracks.
 *
 * Never mark a track `root: true` in PARTS — that forces a full re-render and
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
}
