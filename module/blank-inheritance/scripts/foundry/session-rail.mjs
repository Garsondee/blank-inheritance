/**
 * The session rail — the Foundry-touching half (core/session-rail.mjs is the
 * pure half, and says what the rail is for).
 *
 * A thin strip across the top of the GM's screen: tonight's real session on
 * a clock-time track, the scenes it has passed through as bands, every log
 * entry as a pin, a needle at now, and how long is left. One key on it: Mark,
 * which drops a pin (and a line in the log) in one press.
 *
 * GM-only, and not by hiding: a player's client never constructs this class,
 * the same way it never constructs the Director's deck (Law 11 as structure).
 *
 * Three jobs, all thin: read the log and the scene timeline, read the two
 * session-time settings, hand them to core. Mounted like the deck — a direct
 * child of #interface, never inside #ui-middle (whose transform breaks
 * position: fixed; see foundry/deck.mjs#escapeHotbarFromUiMiddle).
 */

import { minutesOfDay, railModel, railWindow, MARK_TEXT } from "../core/session-rail.mjs";
import { currentEntries, recordLogEntry } from "./session-log.mjs";
import { currentMode } from "./command-bar.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE = `modules/${MODULE_ID}/templates/console/session-rail.hbs`;
const TICK_MS = 20000;

/* ---------------------------------------------------------------------- */
/*  Settings                                                               */
/* ---------------------------------------------------------------------- */

/**
 * The evening's times are the GM's own, on the GM's own machine — client
 * scope, like the rest of the GM's meta-tools. Defaults are the real Monday
 * table (core/session-clock.mjs's own 7:30–10:30).
 */
export function registerSessionRailSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, "sessionStart", {
    name: "BLANKINHERITANCE.SessionRail.Settings.StartName",
    hint: "BLANKINHERITANCE.SessionRail.Settings.StartHint",
    scope: "client",
    config: true,
    type: String,
    default: "19:30",
    onChange
  });
  game.settings.register(MODULE_ID, "sessionEnd", {
    name: "BLANKINHERITANCE.SessionRail.Settings.EndName",
    hint: "BLANKINHERITANCE.SessionRail.Settings.EndHint",
    scope: "client",
    config: true,
    type: String,
    default: "22:30",
    onChange
  });
  game.settings.register(MODULE_ID, "showSessionRail", {
    name: "BLANKINHERITANCE.SessionRail.Settings.ShowName",
    hint: "BLANKINHERITANCE.SessionRail.Settings.ShowHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange
  });
}

/**
 * The window the rail draws. A setting typed wrong (not HH:MM, or an end
 * before the start) falls back to the defaults rather than taking the rail
 * down — and says so once in the console, because a silently-ignored setting
 * is the worst kind.
 */
function currentWindow() {
  const start = game.settings.get(MODULE_ID, "sessionStart");
  const end = game.settings.get(MODULE_ID, "sessionEnd");
  try {
    return railWindow({ sessionStart: start, sessionEnd: end });
  } catch (err) {
    console.warn(`Blank Inheritance | Session rail: ignoring session times "${start}"–"${end}" (${err.message}); using 19:30–22:30.`);
    return railWindow();
  }
}

/* ---------------------------------------------------------------------- */
/*  The scene timeline                                                     */
/* ---------------------------------------------------------------------- */

/**
 * When each scene was activated for the table, kept in the GM's own browser
 * (one list per local day). Deliberately NOT written to the session log: a
 * scene change is already visible in the log's own per-entry scene stamp,
 * and the Palette and Scene Runner log their own cuts — a second writer
 * would put every cut in the log twice. This list only fills the gaps (a
 * scene switched from Foundry's own navigation with nothing logged after).
 *
 * localStorage can be missing or throw (private windows, blocked storage);
 * every access is wrapped, and the rail still draws from the log alone.
 */
function timelineKey(date = new Date()) {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${MODULE_ID}.sessionRail.${d}`;
}

function readTimeline() {
  try {
    const raw = window.localStorage?.getItem(timelineKey());
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function noteSceneActivated(sceneName, at = new Date()) {
  if (!sceneName) return;
  try {
    const list = readTimeline();
    if (list[list.length - 1]?.scene === sceneName) return;
    list.push({ at: at.toISOString(), scene: sceneName });
    window.localStorage?.setItem(timelineKey(at), JSON.stringify(list.slice(-200)));
  } catch {
    // Storage unavailable: the log's own scene stamps still draw the bands.
  }
}

/** Entries as core wants them: minutes since local midnight, today only. */
function railInputs(now) {
  const today = now.toDateString();
  const toMinutes = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()) || d.toDateString() !== today) return null;
    return minutesOfDay(d);
  };
  const entries = currentEntries()
    .map((e) => ({ minutes: toMinutes(e.at), tag: e.tag ?? null, text: e.text ?? "", scene: e.context?.scene ?? null }))
    .filter((e) => e.minutes !== null);
  const sceneEvents = readTimeline()
    .map((e) => ({ minutes: toMinutes(e.at), scene: e.scene }))
    .filter((e) => e.minutes !== null);
  return { entries, sceneEvents };
}

/* ---------------------------------------------------------------------- */
/*  The rail                                                               */
/* ---------------------------------------------------------------------- */

export class SessionRail extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-session-rail",
    tag: "aside",
    classes: ["bi-srail"],
    window: { frame: false, positioned: false },
    actions: {
      mark: SessionRail.#onMark
    }
  };

  static PARTS = {
    rail: { template: TEMPLATE }
  };

  #timer = null;

  /** Same mount as the deck: a direct child of #interface, replacing any same-id node. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const now = new Date();
    const span = currentWindow();
    const { entries, sceneEvents } = railInputs(now);
    return {
      rail: railModel({ nowMinutes: minutesOfDay(now), window: span, entries, sceneEvents }),
      hidden: !game.settings.get(MODULE_ID, "showSessionRail")
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    fitRail();
    // One clock per rail, not per render — the needle moves on its own.
    if (!this.#timer) this.#timer = setInterval(() => this.render(), TICK_MS);
  }

  /** @override */
  _onClose(options) {
    clearInterval(this.#timer);
    this.#timer = null;
    super._onClose?.(options);
  }

  /**
   * One press: a pin on the rail and a line in the log, stamped with the
   * scene and mode like every other entry. The log hook repaints the rail.
   */
  static async #onMark() {
    await recordLogEntry({
      text: MARK_TEXT,
      nowIso: new Date().toISOString(),
      scene: canvas?.scene?.name ?? null,
      mode: currentMode(),
      subject: null
    });
  }
}

/**
 * Where the rail may run: from just right of Foundry's scene navigation (a
 * column down the left in v14, starting 16px from the top) to just left of
 * the sidebar, whichever way the sidebar is open. Written as two CSS
 * properties on <body>, the same pattern fitDeck uses.
 */
export function fitRail() {
  const style = document.body.style;
  const viewport = window.innerWidth;
  const nav = document.getElementById("scene-navigation")?.getBoundingClientRect();
  const controls = document.getElementById("scene-controls")?.getBoundingClientRect();
  const leftEdge = Math.max(nav?.right ?? 0, controls?.right ?? 0, 96);
  // The right end stops at whichever comes first: the sidebar, or the column
  // Foundry pops chat notifications into beside it (#chat-notifications,
  // which a long whisper fills from the top — found live 2026-09-23 sitting
  // over the rail's right end).
  const edges = ["sidebar", "chat-notifications"]
    .map((id) => document.getElementById(id)?.getBoundingClientRect())
    .filter((r) => r && r.width > 0)
    .map((r) => r.left);
  const rightReserve = edges.length ? Math.max(0, viewport - Math.min(...edges)) : 0;
  style.setProperty("--bi-rail-left", `${Math.round(leftEdge + 14)}px`);
  style.setProperty("--bi-rail-right", `${Math.round(rightReserve + 14)}px`);
}

/* ---------------------------------------------------------------------- */
/*  The singleton                                                          */
/* ---------------------------------------------------------------------- */

let active = null;
let fittingInstalled = false;

/** Mount the rail on a GM's client, or re-assert it. A player's client never gets one. */
export function mountSessionRail() {
  if (!game.user?.isGM) return null;
  if (!active) active = new SessionRail();
  active.render({ force: true });
  if (!fittingInstalled) {
    fittingInstalled = true;
    window.addEventListener("resize", () => fitRail());
    Hooks.on("collapseSidebar", () => setTimeout(fitRail, 300));
  }
  return active;
}

export function refreshSessionRail() {
  active?.render();
}
