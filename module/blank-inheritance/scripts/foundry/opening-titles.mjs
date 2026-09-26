/**
 * The opening titles — the Foundry-touching half (core/opening-titles.mjs is
 * the pure half, and says what this is for and the one rule it keeps: the
 * full cut never plays unless the person watching picked it; the GM's choice
 * of episode is core/episode-start.mjs).
 *
 * Ingram, 2026-09-26: "So when we start a session we watch the intro video,
 * then we cut to the episode title, then we fade into the first scene
 * automatically." What happens, in order:
 *
 *   1. The GM presses "Opening" on the session rail (or runs it from the
 *      Palette, or the module API). A confirm window asks first, because the
 *      whole table is about to see something (ux-doctrine Law 17). It checks
 *      that the video files are really on the server, and it asks what
 *      follows the opening: an episode (its title card, then its first
 *      scene), offered first the one the Scene Runner already has open, or
 *      nothing (the opening alone; nobody is moved).
 *   2. The GM's client broadcasts one message over the module socket and
 *      runs the same message locally (Foundry's socket never echoes to the
 *      sender, so the GM's own screen would otherwise be the one that missed
 *      it, exactly as foundry/audio-engine.mjs#broadcastAudio says). It
 *      points the Scene Runner at the episode, and a moment later makes the
 *      episode's first scene the active one for everyone, with no transition
 *      and pulling anyone looking elsewhere: by then every screen is behind
 *      its black curtain, so nobody sees the scene load.
 *   3. Every client, the GM's included, puts up a black full-screen curtain
 *      the moment the message arrives, then decides its own cut: a
 *      remembered choice plays straight away; otherwise the choice window
 *      opens above the curtain, with the reduced-motion cut as the focused,
 *      prominent default. Closing the window skips the opening, not what
 *      follows it.
 *   4. The chosen MP4 plays; then the episode's title card, the same for
 *      everyone; then, once this screen is drawing the scene, the curtain
 *      fades out over a second and a half onto it. Skip and Escape each skip
 *      whatever is playing in one press, and nothing can hold a screen on
 *      black for good. A browser that refuses to start video with sound
 *      without a click gets a "Play" button. A file that will not load is
 *      skipped quietly on a player's screen and reported to the GM by path.
 *   5. As the GM's own screen fades in, the scene's soundscape starts again
 *      from the top, so its music arrives with its picture rather than
 *      somewhere in the middle (it has been playing, silent under the titles'
 *      dip, since the scene was made active).
 *
 * Two settings: `openingVersion` (client scope, in Game Settings, so each
 * player can change or clear what they remembered) and `openingVideoFolder`
 * (world scope, which Foundry only shows a GM).
 */

import {
  DEFAULT_VIDEO_FOLDER,
  OPENING_DUCK,
  OPENING_MESSAGES,
  OPENING_VERSIONS,
  OVERLAY_STATES,
  PREFERENCE_ASK,
  REEL_PARTS,
  REVEAL_FADE_MS,
  SCENE_CUE_DELAY_MS,
  SCENE_HOLD,
  chainFromRequest,
  choiceContext,
  classifyPlayRejection,
  decideOpening,
  episodeTitlePath,
  failureNoticeKey,
  failureReport,
  hiddenCutTransition,
  holdOrReveal,
  mediaFailureReason,
  openingLogText,
  openingVideoPath,
  overlayStep,
  partLabels,
  playRequest,
  preflightFindings,
  reelEnding,
  reelFor,
  resolveChoice,
  resolveVideoFolder,
  validateFailureReport
} from "../core/opening-titles.mjs";
import { defaultStartId, episodeStarts, missingTitleCards, startChoiceContext, startChoiceHtml } from "../core/episode-start.mjs";
// Deliberately NOT command-bar.mjs (for the log entry's mode stamp) and not a
// static import of scene-runner.mjs: command-bar's imports reach the scene
// runner, which reaches back to the session rail and the Palette only through
// dynamic imports, precisely to keep a static cycle out
// (foundry/scene-runner.mjs#relayoutAroundRunner). Both of those import this
// file, so it stays out of that graph and reaches the runner the same way,
// dynamically. A log entry's mode is optional.
import { recordLogEntry } from "./session-log.mjs";
import { duckBeds } from "./audio-engine.mjs";
import { applySoundscape } from "./audio-director.mjs";
import { cueScene } from "./director-panel.mjs";
import { fetchModuleJson, listModuleJsonIds } from "./io.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const SOCKET = `module.${MODULE_ID}`;
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/opening`;
export const SETTING_VERSION = "openingVersion";
export const SETTING_FOLDER = "openingVideoFolder";

/** Where the episode files are staged under the module (foundry/scene-runner.mjs reads the same folder). */
const EPISODE_DIR = "data/campaign/episodes";

/** How long the player takes to fade in and out; matches --bi-dur-servo in bi-tokens.css. */
const FADE_MS = 260;
/**
 * How long the GM waits, at most, between pressing the key and seeing the
 * confirm window, while the files are checked. A check that runs out claims
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

/** True while the GM's own press is between the key and the broadcast (the confirm window is open). */
let pressing = false;

/**
 * GM only. Asks first (pass `{ confirm: false }` from a macro that has
 * already asked), logs the moment, then starts the titles on every screen.
 * Returns whether it was sent.
 *
 * `episode` picks what follows the opening without the window: an episode id,
 * or null for the opening alone. Left out, it is whatever the window would
 * have offered first (the Scene Runner's episode).
 */
export async function playOpeningForTable({ confirm = true, episode } = {}) {
  if (!game.user?.isGM) return false;
  // One press at a time: a double click on the rail key must not open two
  // confirm windows, or send the table two sets of titles.
  if (pressing) return false;
  pressing = true;
  try {
    const setup = await loadStartSetup();
    let chosen = episode === undefined ? setup.selectedId : String(episode ?? "");
    if (confirm) {
      const answer = await confirmOpening(setup, chosen);
      if (!answer) return false;
      chosen = answer.episodeId;
    }
    const start = setup.starts.find((s) => s.episodeId === chosen) ?? null;
    if (chosen && !start) console.warn(`Blank Inheritance | Opening titles: there is no episode "${chosen}" to follow them, so the opening plays alone.`);

    const request = playRequest(foundry.utils.randomID(16), { episodeId: start?.episodeId ?? null, sceneId: start?.sceneId ?? null });
    // A pin on the session rail and a line in the log, as a side effect of
    // doing it (doctrine Law 15). Never awaited: a log that fails to save
    // must not hold the titles back.
    recordLogEntry({
      text: openingLogText({ episodeTitle: start?.title ?? null }),
      nowIso: new Date().toISOString(),
      scene: canvas?.scene?.name ?? null
    }).catch((err) => console.warn("Blank Inheritance | Could not log the opening titles:", err));
    if (start) followEpisode(start);

    game.socket.emit(SOCKET, request);
    receiveOpening(request, game.user.id).catch((err) => console.error("Blank Inheritance | Opening titles failed:", err));
    if (start?.sceneId) setTimeout(() => cueFirstScene(start.sceneId), SCENE_CUE_DELAY_MS);
    return true;
  } finally {
    pressing = false;
  }
}

/**
 * Everything the confirm window offers: every episode the module carries,
 * each with the scene it opens on, and the one to offer first (the Scene
 * Runner's own episode). Nothing here can stop the titles: an episode file
 * that will not load is left out, and with none at all the window offers the
 * opening alone.
 */
async function loadStartSetup() {
  const [episodes, currentEpisodeId] = await Promise.all([loadEpisodes(), runnerEpisode()]);
  const starts = episodeStarts(episodes, sceneDescriptors());
  return { starts, selectedId: defaultStartId(starts, currentEpisodeId) };
}

async function loadEpisodes() {
  const ids = await listModuleJsonIds(EPISODE_DIR);
  const docs = await Promise.all(
    ids.map((id) =>
      fetchModuleJson(`${EPISODE_DIR}/${id}.json`).catch((err) => {
        console.warn(`Blank Inheritance | Opening titles: could not load the episode "${id}":`, err);
        return null;
      })
    )
  );
  return docs.filter(Boolean);
}

async function runnerEpisode() {
  try {
    const runner = await import("./scene-runner.mjs");
    return runner.runnerEpisodeId?.() ?? "";
  } catch {
    return "";
  }
}

/** The world's scenes that were built from a scene brief, as plain data for core#openingSceneFor. */
function sceneDescriptors() {
  return (game.scenes?.contents ?? [])
    .map((scene) => ({
      id: scene.id,
      briefRef: scene.getFlag(MODULE_ID, "briefRef") ?? null,
      kind: scene.getFlag(MODULE_ID, "kind") ?? null,
      sort: scene.sort ?? 0,
      active: scene.active === true
    }))
    .filter((scene) => scene.briefRef);
}

/**
 * Law 17: "Confirm anything the players will see." One window, one press,
 * and "Play for everyone" is the only press it needs: what follows the
 * opening is already chosen when it opens. It also says, before anything is
 * sent, if a file is missing or the scene is not built, so the GM learns it
 * here rather than from six screens going quiet. Resolves to
 * `{ episodeId }` ("" for the opening alone), or null when not confirmed.
 */
async function confirmOpening(setup, selectedId) {
  const folder = currentFolder();
  const [missing, missingTitles] = await Promise.all([preflight(folder), preflightTitles(folder, setup.starts)]);
  const esc = (text) => foundry.utils.escapeHTML(String(text));
  const loc = (key) => esc(game.i18n.localize(key));
  const warnings = missing
    .map((m) => `<p class="bi-opening-confirm__missing">${esc(game.i18n.format("BLANKINHERITANCE.OpeningTitles.Confirm.Missing", { path: m.path }))}</p>`)
    .join("");
  const then = startChoiceHtml(
    startChoiceContext({ starts: setup.starts, selectedId, missingTitles, folder, format: (key, data) => game.i18n.format(key, data) })
  );
  const content = `<p>${loc("BLANKINHERITANCE.OpeningTitles.Confirm.Body")}</p>`
    + `<p><em>${loc("BLANKINHERITANCE.OpeningTitles.Confirm.BodyHint")}</em></p>${warnings}${then}`;
  const answer = await foundry.applications.api.DialogV2.confirm({
    window: { title: "BLANKINHERITANCE.OpeningTitles.Confirm.Title", icon: "fa-solid fa-film" },
    position: { width: 480 },
    content,
    yes: {
      label: "BLANKINHERITANCE.OpeningTitles.Confirm.Yes",
      icon: "fa-solid fa-play",
      callback: (event, button) => ({ episodeId: String(button?.form?.elements?.episode?.value ?? "") })
    },
    no: { label: "BLANKINHERITANCE.OpeningTitles.Confirm.No" },
    render: (event, dialog) => wireStartChoice(dialog?.element)
  }).catch(() => null);
  return answer && typeof answer === "object" ? answer : null;
}

/** The sentence under the choice follows it: each option carries its own. */
function wireStartChoice(root) {
  const select = root?.querySelector?.('select[name="episode"]');
  const detail = root?.querySelector?.(".bi-opening-confirm__detail");
  if (!select || !detail) return;
  select.addEventListener("change", () => {
    detail.textContent = select.selectedOptions?.[0]?.dataset?.detail ?? "";
  });
}

/** Both opening files, checked in parallel with HEAD requests; see core#preflightFindings for what counts. */
async function preflight(folder) {
  const checks = await Promise.all(
    Object.values(OPENING_VERSIONS).map(async (version) => {
      const path = openingVideoPath(folder, version);
      return { version, path, status: await headStatus(path) };
    })
  );
  return preflightFindings(checks);
}

/** Every offered episode's title card, the same way. */
async function preflightTitles(folder, starts) {
  const checks = await Promise.all(
    starts.map(async ({ episodeId }) => {
      const path = episodeTitlePath(folder, episodeId);
      return { episodeId, path, status: await headStatus(path) };
    })
  );
  return missingTitleCards(checks);
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

/**
 * The Scene Runner follows the episode the titles start: its open episode and
 * scene become this one's first, so its running order (and the scene it
 * advances to next) is the episode now being played. Never awaited, and
 * never able to stop the titles.
 */
function followEpisode(start) {
  import("./scene-runner.mjs")
    .then(async (runner) => {
      await runner.setRunnerEpisode?.(start.episodeId, start.briefRef ?? null);
      runner.refreshSceneRunner?.();
    })
    .catch((err) => console.warn("Blank Inheritance | Could not point the Scene Runner at the episode:", err));
}

/**
 * The episode's first scene, made active for everyone under the curtains:
 * the Director's own low-level cue (foundry/director-panel.mjs#cueScene), with
 * no transition of its own (the curtain's fade is the transition) and
 * pulling everyone, so a scene that is already active (Episode One opens on
 * the landing scene) still brings anyone looking elsewhere. The Approvals
 * Desk's reminder is in the confirm window, which is where this was chosen.
 */
async function cueFirstScene(sceneId) {
  try {
    await cueScene(sceneId, { transition: hiddenCutTransition(), pullUsers: true });
  } catch (err) {
    console.warn(`Blank Inheritance | Opening titles: could not make the episode's first scene (${sceneId}) active:`, err);
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
 *
 * The two templates are compiled now, once, so the curtain can go up the
 * moment a press arrives rather than after a round trip to fetch its markup.
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
  foundry.applications.handlebars
    .loadTemplates([`${TEMPLATE_ROOT}/overlay.hbs`, `${TEMPLATE_ROOT}/choice.hbs`])
    .catch((err) => console.warn("Blank Inheritance | Could not preload the opening-titles templates:", err));
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

  // The curtain first, before anything is asked: the GM's client makes the
  // episode's first scene active a moment from now, and no screen may be
  // showing the board when it changes underneath.
  const overlay = await raiseCurtain(decision.id, chainFromRequest(payload), senderId === game.user?.id);
  if (!overlay) return;

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
    // A closed window is null: no opening plays (core#reelFor adds one only
    // for a real version), and the title card and the scene still follow.
    version = outcome.play;
  }
  await runReel(overlay, version);
}

/* ---------------------------------------------------------------------- */
/*  The choice window                                                      */
/* ---------------------------------------------------------------------- */

/**
 * Two big, fully explained buttons and a "Remember" box. An ordinary module
 * window (the bridge themes it like every other), not a DialogV2: a DialogV2
 * button is one line of plain text, and each of these needs a name and a
 * sentence saying what it contains. It opens above the curtain
 * (`.bi-opening-choice-window` in bi-components.css).
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
/*  The full-screen player: curtain, videos, hold, reveal                  */
/* ---------------------------------------------------------------------- */

/**
 * The player, up and black, with nothing playing yet: the curtain. Every
 * listener is attached here, before any video is given a source, so no
 * error can slip past unheard. The one `step` below routes every event and
 * every Skip: to the video playing (core#overlayStep), or, between videos, to
 * the curtain (Skip closes the choice window, which skips the opening) or the
 * hold (Skip fades in at once).
 *
 * `conductor` is true on the screen of the GM who pressed the key: the one
 * that restarts the scene's sound as its picture arrives.
 */
async function raiseCurtain(requestId, chain, conductor) {
  if (activeOverlay) return null;
  const overlay = {
    requestId,
    chain,
    conductor,
    root: null,
    video: null,
    phase: "curtain",
    part: null,
    ending: false,
    onKey: null,
    duckTimer: null,
    holdTimer: null,
    holdStart: 0,
    start: null
  };
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
    if (activeOverlay === overlay) activeOverlay = null;
    return null;
  }

  const video = root.querySelector(".bi-opening__video");
  overlay.root = root;
  overlay.video = video;
  root.dataset.state = "curtain";

  const step = (event, reason = "unknown") => {
    if (overlay.ending) return;
    const part = overlay.part;
    if (!part) {
      if (event === "skip") skipBetweenParts(overlay);
      return;
    }
    const next = overlayStep(part.state, event);
    part.state = next.state;
    if (next.report) reportFailure(overlay, part, reason);
    if (next.close) {
      overlay.part = null;
      try {
        video.pause();
      } catch {
        // Already stopped.
      }
      part.done();
    } else {
      root.dataset.state = next.state;
    }
  };

  const start = () => {
    // A rejected play() can arrive after its part is over (a failed opening's
    // error event moves the reel on first, and the promise rejects after), so
    // each attempt answers only for the part that made it; otherwise the
    // title card would be blamed for the opening's missing file.
    const owner = overlay.part;
    let attempt;
    try {
      attempt = video.play();
    } catch (err) {
      attempt = Promise.reject(err);
    }
    Promise.resolve(attempt).catch((err) => {
      if (overlay.part !== owner) return;
      const kind = classifyPlayRejection(err);
      if (kind === "blocked") step("blocked");
      else if (kind === "error") step("error", mediaFailureReason(video.error?.code));
    });
  };
  overlay.start = start;

  video.addEventListener("playing", () => step("playing"));
  video.addEventListener("waiting", () => step("waiting"));
  video.addEventListener("ended", () => step("ended"));
  video.addEventListener("error", () => step("error", mediaFailureReason(video.error?.code)));
  root.querySelector(".bi-opening__skip")?.addEventListener("click", () => step("skip"));
  root.querySelector(".bi-opening__play")?.addEventListener("click", () => {
    step("retry");
    start();
  });

  // Escape skips in one press. Captured on the document so it runs before
  // Foundry's own keyboard handler (a bubbling listener on window, in
  // client/helpers/interaction/keyboard-manager.mjs), and every other key
  // stops here too: nothing under the titles (pause, token movement, a
  // macro) hears a key pressed while they play. Default actions still run,
  // so Tab and Enter on the Skip button, and on the choice window's own
  // buttons above the curtain, work as they should.
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

  document.body.append(root);
  root.focus({ preventScroll: true });
  // A style read between the append and the class change makes the fade run
  // from transparent rather than starting already opaque.
  void root.offsetWidth;
  root.classList.add("is-shown");
  return overlay;
}

/** Skip with no video playing: on the curtain it closes the choice window (skipping the opening); in the hold it fades in now. */
function skipBetweenParts(overlay) {
  if (overlay.phase === "holding") reveal(overlay);
  else if (overlay.phase === "curtain") activeChoice?.close();
}

/** Every part this screen plays for the press, in order (core#reelFor), then the ending. */
async function runReel(overlay, version) {
  const parts = reelFor({ folder: currentFolder(), version, episodeId: overlay.chain.episodeId });
  for (const part of parts) {
    if (overlay.ending) return;
    await playPart(overlay, part);
  }
  endReel(overlay);
}

/**
 * One video, start to finish: resolves when it ends, is skipped, or will not
 * play. Its source is set here, only ever onto the listeners raiseCurtain
 * attached, and its words (for a screen reader, the Skip key, the click-to-
 * play button) are its own.
 */
function playPart(overlay, part) {
  return new Promise((resolve) => {
    if (overlay.ending) return resolve();
    const { root, video } = overlay;
    // Let go of the last part's frame first, so the next one starts from
    // black rather than from the opening's final picture. No source at all
    // raises no error (nothing to load), and no part is current yet.
    if (video.hasAttribute("src")) {
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        // Nothing to release.
      }
    }
    overlay.phase = "part";
    overlay.part = { ...part, state: OVERLAY_STATES.LOADING, done: resolve };
    const labels = partLabels(part.part);
    root.setAttribute("aria-label", game.i18n.localize(labels.labelKey));
    root.querySelector(".bi-opening__skip")?.setAttribute("aria-label", game.i18n.localize(labels.skipHintKey));
    const gate = root.querySelector(".bi-opening__play-label");
    if (gate) gate.textContent = game.i18n.localize(labels.playGateKey);
    root.dataset.state = OVERLAY_STATES.LOADING;
    video.volume = musicVolume();
    video.src = part.path;
    overlay.start();
  });
}

/** The opening alone closes as it always did; a press that went on to an episode holds for its scene, then fades in. */
function endReel(overlay) {
  if (overlay.ending) return;
  if (reelEnding(overlay.chain).kind === "close") {
    closeOverlay(overlay);
    return;
  }
  holdForScene(overlay);
}

/**
 * Black, with "Loading…", until this screen is drawing the scene the GM
 * named (core#holdOrReveal decides). Usually no wait at all: the scene was
 * made active under the curtain a minute and a half ago. Polled rather than
 * hooked, so a draw that finished between two checks is never missed, and
 * with a timer rather than requestAnimationFrame, which a hidden tab never
 * runs (foundry/splash.mjs#nextPaint says the same).
 */
function holdForScene(overlay) {
  overlay.phase = "holding";
  overlay.holdStart = Date.now();
  overlay.root.dataset.state = OVERLAY_STATES.LOADING;
  const check = () => {
    const decision = holdOrReveal({
      sceneId: overlay.chain.sceneId,
      viewedSceneId: canvas?.scene?.id ?? null,
      ready: canvas?.ready === true,
      loading: canvas?.loading === true,
      drawsScenes: canvas?.initialized === true,
      waitedMs: Date.now() - overlay.holdStart
    });
    if (decision.action === "reveal") reveal(overlay);
  };
  check();
  if (!overlay.ending) overlay.holdTimer = setInterval(check, SCENE_HOLD.pollMs);
}

/** The ending that fades onto the scene, over core's REVEAL_FADE_MS. */
function reveal(overlay) {
  finish(overlay, { fadeMs: REVEAL_FADE_MS, revealing: true });
}

/** The plain ending, for the opening on its own. */
function closeOverlay(overlay) {
  finish(overlay, { fadeMs: FADE_MS, revealing: false });
}

/**
 * Take the player down. The keys and the dip are handed back at the start of
 * the fade, not the end, and the fading player lets clicks through
 * (`.is-revealing`), so the table has the scene the moment they can see it.
 * The music comes back up on its own a moment later, since the dip is only
 * ever re-armed while the player is up (core#OPENING_DUCK).
 */
function finish(overlay, { fadeMs, revealing }) {
  if (overlay.ending) return;
  overlay.ending = true;
  overlay.phase = revealing ? "revealing" : "closing";
  if (activeOverlay === overlay) activeOverlay = null;
  document.removeEventListener("keydown", overlay.onKey, true);
  clearInterval(overlay.duckTimer);
  clearInterval(overlay.holdTimer);
  try {
    overlay.video.pause();
  } catch {
    // Already stopped.
  }
  if (revealing) {
    overlay.root.classList.add("is-revealing");
    if (overlay.conductor) startSceneSound(overlay.chain.sceneId);
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
  }, fadeMs + 40);
}

/**
 * The scene's own soundscape, started again from the top as its picture
 * arrives (audio-director.mjs#applySoundscape restarts a track that is already
 * playing). The same flag the audio director binds a scene's soundscape by
 * (foundry/scene-build.mjs writes it; audio-director.mjs#onSceneActivated
 * reads it). A scene with none keeps whatever is playing.
 */
function startSceneSound(sceneId) {
  if (!sceneId) return;
  const bound = game.scenes?.get(sceneId)?.getFlag(MODULE_ID, "audio")?.soundscape;
  if (!bound) return;
  applySoundscape(bound).catch((err) => console.warn(`Blank Inheritance | Could not start the scene's soundscape "${bound}":`, err));
}

/** Test/inspection seam: what this client is doing with the titles right now. */
export function openingTitlesState() {
  const overlay = activeOverlay;
  return {
    choosing: Boolean(activeChoice),
    phase: overlay?.phase ?? null,
    playing: overlay?.part
      ? { part: overlay.part.part, version: overlay.part.version ?? null, path: overlay.part.path, state: overlay.part.state }
      : null,
    episode: overlay?.chain?.episodeId ?? null,
    scene: overlay?.chain?.sceneId ?? null
  };
}

/* ---------------------------------------------------------------------- */
/*  When a file will not play                                              */
/* ---------------------------------------------------------------------- */

/**
 * A player's screen goes quietly on to what comes next and tells the GM; the
 * GM's own screen tells the GM directly. The player is never shown an error
 * about a file they cannot fix.
 */
function reportFailure(overlay, part, reason) {
  const report = failureReport({
    requestId: overlay.requestId,
    part: part.part,
    version: part.version,
    episodeId: part.episodeId,
    path: part.path,
    reason
  });
  console.warn(`Blank Inheritance | Opening titles: could not play "${part.path}" (${report.reason}).`);
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
  const title = report.part === REEL_PARTS.TITLE;
  const message = playerName
    ? game.i18n.format(title ? "BLANKINHERITANCE.OpeningTitles.Failed.TitlePlayer" : "BLANKINHERITANCE.OpeningTitles.Failed.Player", { path: report.path, name: playerName })
    : game.i18n.format(title ? "BLANKINHERITANCE.OpeningTitles.Failed.TitleOwn" : "BLANKINHERITANCE.OpeningTitles.Failed.Own", { path: report.path });
  ui.notifications.error(message, { permanent: true });
}
