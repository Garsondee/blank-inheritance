/**
 * The opening titles — the Foundry-touching half (core/opening-titles.mjs is
 * the pure half, and says what this is for and the one rule it keeps: the
 * full cut never plays unless the person watching picked it).
 *
 * What happens, in order:
 *
 *   1. The GM presses "Opening" on the session rail (or runs it from the
 *      Palette, or the module API). A confirm window asks first, because the
 *      whole table is about to see something (ux-doctrine Law 17), and it
 *      checks that both video files are really on the server.
 *   2. The GM's client broadcasts one message over the module socket and
 *      runs the same message locally (Foundry's socket never echoes to the
 *      sender, so the GM's own screen would otherwise be the one that missed
 *      it, exactly as foundry/audio-engine.mjs#broadcastAudio says).
 *   3. Every client, the GM's included, decides for itself: a remembered
 *      choice plays straight away; otherwise the choice window opens, with
 *      the reduced-motion cut as the focused, prominent default. Closing the
 *      window plays nothing.
 *   4. The chosen MP4 plays in a full-screen player above everything. Skip
 *      and Escape each end it in one press; it closes itself at the end. A
 *      browser that refuses to start video with sound without a click gets a
 *      "Play" button. A file that will not load closes quietly on a player's
 *      screen and is reported to the GM by path.
 *
 * Two settings: `openingVersion` (client scope, in Game Settings, so each
 * player can change or clear what they remembered) and `openingVideoFolder`
 * (world scope, which Foundry only shows a GM).
 */

import {
  DEFAULT_VIDEO_FOLDER,
  OPENING_DUCK,
  OPENING_LOG_TEXT,
  OPENING_MESSAGES,
  OPENING_VERSIONS,
  PREFERENCE_ASK,
  choiceContext,
  classifyPlayRejection,
  decideOpening,
  failureNoticeKey,
  failureReport,
  mediaFailureReason,
  openingVideoPath,
  overlayStep,
  playRequest,
  preflightFindings,
  resolveChoice,
  resolveVideoFolder,
  validateFailureReport
} from "../core/opening-titles.mjs";
// Deliberately NOT command-bar.mjs (for the log entry's mode stamp): its
// imports reach the scene runner, which reaches back to the session rail and
// the Palette only through dynamic imports, precisely to keep a static cycle
// out (foundry/scene-runner.mjs#relayoutAroundRunner). Both of those import
// this file, so it stays out of that graph. A log entry's mode is optional.
import { recordLogEntry } from "./session-log.mjs";
import { duckBeds } from "./audio-engine.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const SOCKET = `module.${MODULE_ID}`;
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/opening`;
export const SETTING_VERSION = "openingVersion";
export const SETTING_FOLDER = "openingVideoFolder";

/** How long the player takes to fade in and out; matches --bi-dur-servo in bi-tokens.css. */
const FADE_MS = 260;
/**
 * How long the GM waits, at most, between pressing the key and seeing the
 * confirm window, while both files are checked. A check that runs out claims
 * nothing (core#preflightFindings); each screen's own failure report still
 * catches a real miss.
 */
const PREFLIGHT_TIMEOUT_MS = 1500;

/* ---------------------------------------------------------------------- */
/*  Settings                                                               */
/* ---------------------------------------------------------------------- */

/**
 * `openingVersion` is client scope, so it is each player's own on their own
 * machine, and `config: true` puts it in Game Settings, which is where the
 * choice window's "Remember" line tells them they can change it.
 *
 * `openingVideoFolder` is world scope: Foundry's settings window only lists a
 * world setting to a user who may modify settings, which by default is the
 * GM alone (client/applications/settings/config.mjs). `filePicker: "folder"`
 * gives it Foundry's own folder browser.
 */
export function registerOpeningTitleSettings() {
  game.settings.register(MODULE_ID, SETTING_VERSION, {
    name: "BLANKINHERITANCE.OpeningTitles.Settings.VersionName",
    hint: "BLANKINHERITANCE.OpeningTitles.Settings.VersionHint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      ask: "BLANKINHERITANCE.OpeningTitles.Settings.Ask",
      reduced: "BLANKINHERITANCE.OpeningTitles.Settings.Reduced",
      full: "BLANKINHERITANCE.OpeningTitles.Settings.Full"
    },
    default: PREFERENCE_ASK
  });

  game.settings.register(MODULE_ID, SETTING_FOLDER, {
    name: "BLANKINHERITANCE.OpeningTitles.Settings.FolderName",
    hint: "BLANKINHERITANCE.OpeningTitles.Settings.FolderHint",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_VIDEO_FOLDER,
    filePicker: "folder"
  });
}

function currentPreference() {
  try {
    return game.settings.get(MODULE_ID, SETTING_VERSION);
  } catch {
    return PREFERENCE_ASK;
  }
}

let warnedFolder = null;

/**
 * The folder the files are fetched from. A setting typed wrong falls back to
 * the default rather than stopping the titles, and says so once: in the
 * console on every screen, and as a notice on the GM's.
 */
function currentFolder() {
  let raw = DEFAULT_VIDEO_FOLDER;
  try {
    raw = game.settings.get(MODULE_ID, SETTING_FOLDER);
  } catch {
    // Not registered yet (or a broken world setting): the default it is.
  }
  const resolved = resolveVideoFolder(raw);
  if (!resolved.valid && warnedFolder !== raw) {
    warnedFolder = raw;
    console.warn(`Blank Inheritance | Opening titles: the video folder "${raw}" is not usable (${resolved.reason}); using "${resolved.folder}".`);
    if (game.user?.isGM) {
      ui.notifications.warn(game.i18n.format("BLANKINHERITANCE.OpeningTitles.BadFolder", { folder: String(raw), fallback: resolved.folder }));
    }
  }
  return resolved.folder;
}

/**
 * The player's own music volume from Foundry's Playlists sidebar, which is
 * the gain Foundry itself puts on every piece of music (client/audio/helper.mjs
 * applies `globalPlaylistVolume` straight to the music context). The titles
 * are music, so they sit where that player has put music: the player's
 * volume settings stay their own override (design/audio-system.md).
 */
function musicVolume() {
  try {
    const volume = Number(game.settings.get("core", "globalPlaylistVolume"));
    return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
  } catch {
    return 1;
  }
}

/* ---------------------------------------------------------------------- */
/*  The GM's trigger                                                       */
/* ---------------------------------------------------------------------- */

/**
 * GM only. Asks first (pass `{ confirm: false }` from a macro that has
 * already asked), logs the moment, then starts the titles on every screen.
 * Returns whether it was sent.
 */
export async function playOpeningForTable({ confirm = true } = {}) {
  if (!game.user?.isGM) return false;
  if (confirm && !(await confirmOpening())) return false;

  const request = playRequest(foundry.utils.randomID(16));
  // A pin on the session rail and a line in the log, as a side effect of
  // doing it (doctrine Law 15). Never awaited: a log that fails to save must
  // not hold the titles back.
  recordLogEntry({
    text: OPENING_LOG_TEXT,
    nowIso: new Date().toISOString(),
    scene: canvas?.scene?.name ?? null
  }).catch((err) => console.warn("Blank Inheritance | Could not log the opening titles:", err));

  game.socket.emit(SOCKET, request);
  receiveOpening(request, game.user.id).catch((err) => console.error("Blank Inheritance | Opening titles failed:", err));
  return true;
}

/**
 * Law 17: "Confirm anything the players will see." One window, one press.
 * It also says, before anything is sent, if either file is missing, so the
 * GM learns it here rather than from six screens going quiet.
 */
async function confirmOpening() {
  const folder = currentFolder();
  const missing = await preflight(folder);
  const esc = (text) => foundry.utils.escapeHTML(String(text));
  const loc = (key) => esc(game.i18n.localize(key));
  const warnings = missing
    .map((m) => `<p class="bi-opening-confirm__missing">${esc(game.i18n.format("BLANKINHERITANCE.OpeningTitles.Confirm.Missing", { path: m.path }))}</p>`)
    .join("");
  const content = `<p>${loc("BLANKINHERITANCE.OpeningTitles.Confirm.Body")}</p>`
    + `<p><em>${loc("BLANKINHERITANCE.OpeningTitles.Confirm.BodyHint")}</em></p>${warnings}`;
  const answer = await foundry.applications.api.DialogV2.confirm({
    window: { title: "BLANKINHERITANCE.OpeningTitles.Confirm.Title", icon: "fa-solid fa-film" },
    content,
    yes: { label: "BLANKINHERITANCE.OpeningTitles.Confirm.Yes", icon: "fa-solid fa-play" },
    no: { label: "BLANKINHERITANCE.OpeningTitles.Confirm.No" }
  }).catch(() => false);
  return answer === true;
}

/** Both files, checked in parallel with HEAD requests; see core#preflightFindings for what counts. */
async function preflight(folder) {
  const checks = await Promise.all(
    Object.values(OPENING_VERSIONS).map(async (version) => {
      const path = openingVideoPath(folder, version);
      return { version, path, status: await headStatus(path) };
    })
  );
  return preflightFindings(checks);
}

async function headStatus(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREFLIGHT_TIMEOUT_MS);
  try {
    const response = await fetch(path, { method: "HEAD", cache: "no-store", signal: controller.signal });
    return response.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------------- */
/*  The socket                                                             */
/* ---------------------------------------------------------------------- */

/**
 * Every client. The module shares one socket between subsystems, so anything
 * that is not an `opening.*` message is someone else's and is left alone.
 *
 * Foundry's server relays a module-socket message with the SENDER's user id
 * as the listener's second argument (dist/server/sockets.mjs,
 * handleCustomSocket: `emit(event, data, this.user.id)`; pinned by
 * test/tier3-opening-titles-contract.test.mjs). That id, not anything inside
 * the message, is what says whether a GM sent it.
 */
export function registerOpeningSocket() {
  game.socket.on(SOCKET, (payload, senderId) => {
    const type = payload?.type;
    if (typeof type !== "string" || !type.startsWith("opening.")) return;
    if (type === OPENING_MESSAGES.PLAY) {
      receiveOpening(payload, senderId).catch((err) => console.error("Blank Inheritance | Opening titles failed:", err));
    } else if (type === OPENING_MESSAGES.FAILED) {
      receiveFailureReport(payload, senderId);
    }
  });
}

/** Ids this client has already acted on, newest last. A copy that arrives twice plays once. */
const handledIds = [];

function rememberHandled(id) {
  handledIds.push(id);
  if (handledIds.length > 32) handledIds.splice(0, handledIds.length - 32);
}

let activeChoice = null;
let activeOverlay = null;

async function receiveOpening(payload, senderId) {
  const decision = decideOpening({
    payload,
    senderIsGM: game.users?.get(senderId)?.isGM === true,
    preference: currentPreference(),
    busy: Boolean(activeChoice || activeOverlay),
    handled: handledIds
  });
  if (decision.action === "ignore") {
    if (!["duplicate", "busy"].includes(decision.reason)) {
      console.warn(`Blank Inheritance | Ignored an opening-titles message (${decision.reason}).`);
    }
    return;
  }
  rememberHandled(decision.id);

  let version = decision.version ?? null;
  if (decision.action === "ask") {
    const outcome = resolveChoice(await askForVersion());
    // Saved alongside, not before: the titles start the moment the player
    // picks, and the screen goes straight from "choosing" to "playing" with
    // no gap in between for a second press to slip through.
    if (outcome.remember) {
      game.settings.set(MODULE_ID, SETTING_VERSION, outcome.remember)
        .catch((err) => console.warn("Blank Inheritance | Could not remember the opening-titles choice:", err));
    }
    version = outcome.play;
  }
  if (!version) return; // the window was closed: nothing plays
  await playOpening(version, decision.id);
}

/* ---------------------------------------------------------------------- */
/*  The choice window                                                      */
/* ---------------------------------------------------------------------- */

/**
 * Two big, fully explained buttons and a "Remember" box. An ordinary module
 * window (the bridge themes it like every other), not a DialogV2: a DialogV2
 * button is one line of plain text, and each of these needs a name and a
 * sentence saying what it contains.
 */
class OpeningChoice extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    // Unique per window ({id} is Foundry's own placeholder): a second press
    // moments after a first window closed must not collide with the first
    // one while it is still animating shut.
    id: "bi-opening-choice-{id}",
    tag: "section",
    classes: ["bi-opening-choice-window"],
    window: { title: "BLANKINHERITANCE.OpeningTitles.Title", icon: "fa-solid fa-film", resizable: false, minimizable: false },
    position: { width: 540, height: "auto" },
    actions: {
      choose: OpeningChoice.#onChoose
    }
  };

  static PARTS = {
    body: { template: `${TEMPLATE_ROOT}/choice.hbs` }
  };

  /** Resolves the window's promise; cleared once used, so it answers exactly once. */
  #settle;

  constructor(settle, options = {}) {
    super(options);
    this.#settle = settle;
  }

  /** @override */
  async _prepareContext() {
    return choiceContext((key) => game.i18n.localize(key));
  }

  static async #onChoose(event, target) {
    const remember = this.element?.querySelector('input[name="remember"]')?.checked === true;
    this.#answer({ version: target?.dataset?.version ?? null, remember });
    await this.close();
  }

  #answer(result) {
    const settle = this.#settle;
    this.#settle = null;
    settle?.(result);
  }

  /** @override Closed any way at all (the X, Escape, a button): an unanswered window means "play nothing". */
  _onClose(options) {
    super._onClose?.(options);
    this.#answer(null);
  }
}

function askForVersion() {
  return new Promise((resolve) => {
    const app = new OpeningChoice((result) => {
      if (activeChoice === app) activeChoice = null;
      resolve(result);
    });
    activeChoice = app;
    app.render({ force: true }).catch((err) => {
      console.error("Blank Inheritance | Could not open the opening-titles choice:", err);
      if (activeChoice === app) activeChoice = null;
      resolve(null);
    });
  });
}

/* ---------------------------------------------------------------------- */
/*  The full-screen player                                                 */
/* ---------------------------------------------------------------------- */

async function playOpening(version, requestId) {
  if (activeOverlay) return;
  const path = openingVideoPath(currentFolder(), version);
  const overlay = { requestId, version, path, root: null, video: null, state: "loading", closed: false, onKey: null, duckTimer: null };
  activeOverlay = overlay;

  let root;
  try {
    const html = await foundry.applications.handlebars.renderTemplate(`${TEMPLATE_ROOT}/overlay.hbs`, {
      label: game.i18n.localize("BLANKINHERITANCE.OpeningTitles.Title"),
      loading: game.i18n.localize("BLANKINHERITANCE.OpeningTitles.Loading"),
      play: game.i18n.localize("BLANKINHERITANCE.OpeningTitles.PlayGate"),
      playHint: game.i18n.localize("BLANKINHERITANCE.OpeningTitles.PlayGateHint"),
      skip: game.i18n.localize("BLANKINHERITANCE.OpeningTitles.Skip"),
      skipHint: game.i18n.localize("BLANKINHERITANCE.OpeningTitles.SkipHint")
    });
    const holder = document.createElement("template");
    holder.innerHTML = html.trim();
    root = holder.content.firstElementChild;
  } catch (err) {
    console.error("Blank Inheritance | Could not build the opening-titles player:", err);
    activeOverlay = null;
    return;
  }

  const video = root.querySelector(".bi-opening__video");
  overlay.root = root;
  overlay.video = video;

  const step = (event, reason = "unknown") => {
    const next = overlayStep(overlay.state, event);
    overlay.state = next.state;
    root.dataset.state = next.state;
    if (next.report) reportFailure(overlay, reason);
    if (next.close) closeOverlay(overlay);
  };

  const start = () => {
    let attempt;
    try {
      attempt = video.play();
    } catch (err) {
      attempt = Promise.reject(err);
    }
    Promise.resolve(attempt).catch((err) => {
      const kind = classifyPlayRejection(err);
      if (kind === "blocked") step("blocked");
      else if (kind === "error") step("error", mediaFailureReason(video.error?.code));
    });
  };

  video.addEventListener("playing", () => step("playing"));
  video.addEventListener("waiting", () => step("waiting"));
  video.addEventListener("ended", () => step("ended"));
  video.addEventListener("error", () => step("error", mediaFailureReason(video.error?.code)));
  root.querySelector(".bi-opening__skip")?.addEventListener("click", () => step("skip"));
  root.querySelector(".bi-opening__play")?.addEventListener("click", () => {
    step("retry");
    start();
  });

  // Escape ends it in one press. Captured on the document so it runs before
  // Foundry's own keyboard handler (a bubbling listener on window, in
  // client/helpers/interaction/keyboard-manager.mjs), and every other key
  // stops here too: nothing under the titles (pause, token movement, a
  // macro) hears a key pressed while they play. Default actions still run,
  // so Tab and Enter on the Skip button work as they should.
  overlay.onKey = (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      step("skip");
    }
  };
  document.addEventListener("keydown", overlay.onKey, true);

  const duck = () => {
    try {
      duckBeds(OPENING_DUCK);
    } catch (err) {
      console.warn("Blank Inheritance | Could not dip the music under the opening titles:", err);
    }
  };
  duck();
  overlay.duckTimer = setInterval(duck, OPENING_DUCK.refreshMs);

  video.volume = musicVolume();
  document.body.append(root);
  root.focus({ preventScroll: true });
  // A style read between the append and the class change makes the fade run
  // from transparent rather than starting already opaque.
  void root.offsetWidth;
  root.classList.add("is-shown");

  video.src = path;
  start();
}

function closeOverlay(overlay) {
  if (overlay.closed) return;
  overlay.closed = true;
  if (activeOverlay === overlay) activeOverlay = null;
  document.removeEventListener("keydown", overlay.onKey, true);
  clearInterval(overlay.duckTimer);
  try {
    overlay.video.pause();
  } catch {
    // Already stopped.
  }
  overlay.root.classList.remove("is-shown");
  // setTimeout, never requestAnimationFrame: rAF is suspended outright on a
  // hidden tab, and a player left behind on a backgrounded screen would
  // never be removed (foundry/splash.mjs#nextPaint says the same).
  setTimeout(() => {
    overlay.video.removeAttribute("src");
    try {
      overlay.video.load(); // let go of the download and the decoder
    } catch {
      // Nothing to release.
    }
    overlay.root.remove();
  }, FADE_MS + 40);
}

/** Test/inspection seam: what this client is doing with the titles right now. */
export function openingTitlesState() {
  return {
    choosing: Boolean(activeChoice),
    playing: activeOverlay ? { version: activeOverlay.version, path: activeOverlay.path, state: activeOverlay.state } : null
  };
}

/* ---------------------------------------------------------------------- */
/*  When a file will not play                                              */
/* ---------------------------------------------------------------------- */

/**
 * A player's screen closes quietly and tells the GM; the GM's own screen
 * tells the GM directly. The player is never shown an error about a file
 * they cannot fix.
 */
function reportFailure(overlay, reason) {
  const report = failureReport({ requestId: overlay.requestId, version: overlay.version, path: overlay.path, reason });
  console.warn(`Blank Inheritance | Opening titles: could not play "${overlay.path}" (${report.reason}).`);
  if (game.user?.isGM) noteFailure(report, null);
  else game.socket.emit(SOCKET, report);
}

const notifiedFailures = new Set();

function receiveFailureReport(payload, senderId) {
  if (!game.user?.isGM) return;
  const check = validateFailureReport(payload);
  if (!check.ok) return;
  noteFailure(check.report, game.users?.get(senderId)?.name ?? "?");
}

/**
 * Permanent, not a five-second toast: it names a file that has to be put on
 * the server, and it may arrive while the GM is watching her own titles.
 */
function noteFailure(report, playerName) {
  const key = failureNoticeKey(report);
  if (notifiedFailures.has(key)) {
    if (playerName) console.warn(`Blank Inheritance | Opening titles: "${report.path}" also failed on ${playerName}'s screen.`);
    return;
  }
  notifiedFailures.add(key);
  const message = playerName
    ? game.i18n.format("BLANKINHERITANCE.OpeningTitles.Failed.Player", { path: report.path, name: playerName })
    : game.i18n.format("BLANKINHERITANCE.OpeningTitles.Failed.Own", { path: report.path });
  ui.notifications.error(message, { permanent: true });
}
