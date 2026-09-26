/**
 * The opening titles — the pure half.
 *
 * Every session opens with the campaign's title sequence
 * (design/opening-titles.md), rendered in two cuts:
 *
 *   FULL     fast cuts, strobing and flashing lights, rapid movement.
 *   REDUCED  the same song and pictures, fewer cuts, gentle movement and no
 *            flashing at all.
 *
 * Ingram's brief (2026-09-26): "provide players with a button that will
 * clearly explain that one video is the full ... intro and the other one is a
 * reduced motion and zero flashing version... When I start the episode the
 * players should get a dialogue which lets them pick which one they prefer,
 * with an option to remember. This seems like a good safety thing."
 *
 * THE ONE RULE everything in this file serves: the full cut never plays
 * unless the person watching picked it, either just now in the choice window
 * or earlier with "Remember my choice". Not because the GM pressed a key, not
 * because a setting held a malformed value, not because a socket message
 * named a version. Every path below that is not an explicit "full" ends at
 * "ask" or at nothing.
 *
 * foundry/opening-titles.mjs owns the settings, the socket, the window and
 * the video element. This file decides what a client does when the GM starts
 * the titles, what a socket message must look like to be believed, which file
 * to fetch, what the choice window offers, and how the full-screen player
 * moves between loading, playing, waiting for a click and closed.
 *
 * WHAT FOLLOWS THE OPENING (2026-09-26). Ingram: "So when we start a session
 * we watch the intro video, then we cut to the episode title, then we fade
 * into the first scene automatically." So one press is a reel: the opening
 * (each viewer's own cut, or none), then the episode's title card (one short
 * video, the same for everyone, no flashing), then the player fades out onto
 * the episode's first scene, which the GM's client has already made active
 * underneath it. The second half of this file is that reel: the title card's
 * path, the parts in order, when a screen may fade in, and how a missing
 * title card is reported. Which episode and which scene is the GM's choice,
 * made in core/episode-start.mjs.
 *
 * No Foundry, no DOM, no timers.
 */

import { SILENCE_DB } from "./audio-mix.mjs";

/* ---------------------------------------------------------------------- */
/*  Versions and the per-player preference                                 */
/* ---------------------------------------------------------------------- */

export const OPENING_VERSIONS = Object.freeze({ FULL: "full", REDUCED: "reduced" });

const VERSIONS = new Set(Object.values(OPENING_VERSIONS));

export function isOpeningVersion(value) {
  return VERSIONS.has(value);
}

/** The per-player setting's default: nothing remembered, so ask. */
export const PREFERENCE_ASK = "ask";

/**
 * Every value the per-player setting may hold, in the order the Game Settings
 * dropdown shows them: asking first, then the safe cut, then the full one.
 */
export const OPENING_PREFERENCES = Object.freeze([PREFERENCE_ASK, OPENING_VERSIONS.REDUCED, OPENING_VERSIONS.FULL]);

/**
 * A stored preference, made safe. Anything that is not exactly one of the
 * three known values (a typo, "FULL" in capitals, null, an object left behind
 * by some older build) reads as "ask", never as a version.
 */
export function normalisePreference(value) {
  return OPENING_PREFERENCES.includes(value) ? value : PREFERENCE_ASK;
}

/* ---------------------------------------------------------------------- */
/*  The socket messages                                                    */
/* ---------------------------------------------------------------------- */

/**
 * Both ride the module's one shared socket (`module.blank-inheritance`), next
 * to the audio and downtime messages, so the prefix is how a listener knows
 * the message is its own.
 */
export const OPENING_MESSAGES = Object.freeze({
  PLAY: "opening.play",
  FAILED: "opening.failed"
});

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * An episode's id, the way data/episodes/ writes it: lower-case kebab-case
 * ("episode-c1e1-mothers-maiden-name"). Nothing else is believed, because the
 * id becomes part of a file path: no dots, no slashes, no "?" or "#".
 */
const EPISODE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isEpisodeId(value) {
  return typeof value === "string" && value.length <= 128 && EPISODE_ID_PATTERN.test(value);
}

/**
 * A Foundry document id: sixteen letters and digits, exactly the test
 * Foundry's own isValidId makes (common/data/validators.mjs; pinned by
 * test/tier3-episode-start-contract.test.mjs). Derived ids (core/ids.mjs,
 * sixteen hex characters) pass it too.
 */
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9]{16}$/;

export function isSceneId(value) {
  return typeof value === "string" && DOCUMENT_ID_PATTERN.test(value);
}

/**
 * The GM's broadcast: "the titles are starting". It carries an id (so a copy
 * that arrives twice is recognised) and, when the GM chose an episode, what
 * follows the opening: the episode (whose title card every screen plays
 * next) and the Foundry scene to fade into. It does NOT carry a version.
 * Which cut plays is each player's own decision, made on their own screen, so
 * there is nothing in this message for anyone to set.
 */
export function playRequest(id, { episodeId = null, sceneId = null } = {}) {
  const text = String(id ?? "");
  if (!ID_PATTERN.test(text)) throw new Error(`playRequest: not a usable request id, "${id}"`);
  const request = { type: OPENING_MESSAGES.PLAY, id: text };
  if (episodeId != null) {
    if (!isEpisodeId(episodeId)) throw new Error(`playRequest: not an episode id, "${episodeId}"`);
    request.episode = episodeId;
  }
  if (sceneId != null) {
    if (!isSceneId(sceneId)) throw new Error(`playRequest: not a scene id, "${sceneId}"`);
    request.scene = sceneId;
  }
  return request;
}

/**
 * Whether a socket message is a real play request. The accepted request is
 * rebuilt field by field rather than passed through, so anything extra that
 * rode along (a `version: "full"`, say) is dropped here and can never reach
 * the decision below. An episode or a scene that is present but malformed
 * refuses the whole message: the GM's own client can never send one, so it
 * means a tampered or mismatched sender, not a press to half-honour.
 */
export function validatePlayRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, reason: "not-an-object" };
  if (payload.type !== OPENING_MESSAGES.PLAY) return { ok: false, reason: "wrong-type" };
  if (typeof payload.id !== "string" || !ID_PATTERN.test(payload.id)) return { ok: false, reason: "bad-id" };
  const request = { type: OPENING_MESSAGES.PLAY, id: payload.id };
  if (payload.episode != null) {
    if (!isEpisodeId(payload.episode)) return { ok: false, reason: "bad-episode" };
    request.episode = payload.episode;
  }
  if (payload.scene != null) {
    if (!isSceneId(payload.scene)) return { ok: false, reason: "bad-scene" };
    request.scene = payload.scene;
  }
  return { ok: true, request };
}

/**
 * What follows the opening for one press, read from the same checked
 * message: the episode whose title card plays next and the scene to fade
 * into, each null when the GM chose none (or the message is not believed).
 */
export function chainFromRequest(payload) {
  const check = validatePlayRequest(payload);
  if (!check.ok) return { episodeId: null, sceneId: null };
  return { episodeId: check.request.episode ?? null, sceneId: check.request.scene ?? null };
}

/* ---------------------------------------------------------------------- */
/*  What one client does when the GM starts the titles                     */
/* ---------------------------------------------------------------------- */

/**
 * The decision, on one client, for one incoming message.
 *
 *   payload      the socket message (or the GM's own copy, run locally)
 *   senderIsGM   whether the user who SENT it is a GM. Foundry's server
 *                attributes every module-socket message to the user whose
 *                socket sent it (the second argument a listener receives);
 *                the adapter looks that user up. A player cannot start the
 *                titles on everyone's screen by writing to the socket.
 *   preference   this client's stored setting, raw; normalised here
 *   busy         a choice window or the player is already up on this client
 *   handled      ids this client has already acted on
 *
 * Returns one of:
 *   { action: "ignore", reason }
 *   { action: "ask", id }                 show the choice window
 *   { action: "play", id, version }       a remembered choice: play it now
 */
export function decideOpening({ payload, senderIsGM = false, preference = PREFERENCE_ASK, busy = false, handled = [] } = {}) {
  const check = validatePlayRequest(payload);
  if (!check.ok) return { action: "ignore", reason: check.reason };
  const { id } = check.request;
  if (senderIsGM !== true) return { action: "ignore", reason: "not-from-gm", id };
  const seen = handled instanceof Set ? handled : new Set(Array.isArray(handled) ? handled : []);
  if (seen.has(id)) return { action: "ignore", reason: "duplicate", id };
  // One at a time: a second press while this screen is still choosing or
  // watching must not stack a second window or a second video on top.
  if (busy) return { action: "ignore", reason: "busy", id };
  const preferred = normalisePreference(preference);
  if (preferred === PREFERENCE_ASK) return { action: "ask", id };
  return { action: "play", id, version: preferred };
}

/* ---------------------------------------------------------------------- */
/*  Where the videos live                                                  */
/* ---------------------------------------------------------------------- */

/**
 * The folder, relative to Foundry's data root, that the two files are served
 * from. It sits beside the audio library's own `blank-inheritance-audio/`,
 * outside the module directory for the same reason: a module update replaces
 * the module folder, and a large video should not ride along with every code
 * change.
 */
export const DEFAULT_VIDEO_FOLDER = "blank-inheritance-video";

export const OPENING_FILES = Object.freeze({
  [OPENING_VERSIONS.FULL]: "opening-full.mp4",
  [OPENING_VERSIONS.REDUCED]: "opening-reduced.mp4"
});

/**
 * The world setting's folder, cleaned up, or the default with a reason when
 * it cannot be used. Never throws: a mistyped setting must not stop the
 * titles, so it falls back to the default and the adapter tells the GM once.
 *
 * Accepted: a path inside the data root ("blank-inheritance-video",
 * "videos/titles", with or without leading or trailing slashes, Windows
 * backslashes included), or a full http(s) address for a folder hosted
 * elsewhere (Foundry's own S3 storage hands out those).
 *
 * Refused: ".." (a path that climbs out of wherever it starts), "?" or "#"
 * (the browser would read the rest as a query or a fragment, not a file
 * name), and any other scheme or drive letter ("C:/…", "file:", "data:").
 */
export function resolveVideoFolder(raw) {
  const input = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  const text = input.trim().replace(/\\/g, "/");
  const fallback = (reason) => ({ folder: DEFAULT_VIDEO_FOLDER, valid: false, reason });
  if (!text) return { folder: DEFAULT_VIDEO_FOLDER, valid: true, reason: null };
  if (/[?#]/.test(text)) return fallback("query-or-fragment");

  const web = /^(https?:\/\/[^/]+)(\/.*)?$/i.exec(text);
  if (web) {
    const segments = (web[2] ?? "").split("/").filter((s) => s && s !== ".");
    if (segments.includes("..")) return fallback("climbs-out");
    return { folder: [web[1], ...segments].join("/"), valid: true, reason: null };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return fallback("not-a-data-path");

  const segments = text.split("/").filter((s) => s && s !== ".");
  if (segments.includes("..")) return fallback("climbs-out");
  if (!segments.length) return { folder: DEFAULT_VIDEO_FOLDER, valid: true, reason: null };
  return { folder: segments.join("/"), valid: true, reason: null };
}

/**
 * The path a client fetches: "blank-inheritance-video/opening-reduced.mp4".
 * Relative to the page, exactly like the audio library's own paths, so it
 * resolves under Foundry's route prefix (if one is set) the way every other
 * data-root file does. An unknown version is a programming error, not a
 * setting a player can reach, so it throws.
 */
export function openingVideoPath(folder, version) {
  if (!isOpeningVersion(version)) throw new Error(`openingVideoPath: unknown version "${version}"`);
  return `${resolveVideoFolder(folder).folder}/${OPENING_FILES[version]}`;
}

/** The subfolder of the video folder that holds one title card per episode. */
export const EPISODE_TITLE_FOLDER = "episode-titles";

/**
 * An episode's title card: "blank-inheritance-video/episode-titles/
 * episode-c1e1-mothers-maiden-name.mp4", named by the `id` of the episode's
 * own file in data/episodes/. One file per episode and one version for
 * everyone: the card has no flashing, so there is nothing to choose. An id
 * that is not an episode id is a programming error, never a path.
 */
export function episodeTitlePath(folder, episodeId) {
  if (!isEpisodeId(episodeId)) throw new Error(`episodeTitlePath: not an episode id, "${episodeId}"`);
  return `${resolveVideoFolder(folder).folder}/${EPISODE_TITLE_FOLDER}/${episodeId}.mp4`;
}

/* ---------------------------------------------------------------------- */
/*  The choice window                                                      */
/* ---------------------------------------------------------------------- */

/**
 * What the choice window offers, as localisation keys.
 *
 * Two options, REDUCED FIRST: it is the button that already has focus when
 * the window opens (so Enter picks it), the first in reading order, and the
 * one drawn as the prominent silver plate. Full is never the default and is
 * never pre-selected; it is chosen only by a deliberate click on it. The
 * "Remember" box starts unticked, so nothing is saved that was not asked for.
 *
 * Closing the window is the third answer, and it plays nothing.
 */
export function openingChoiceModel() {
  return {
    titleKey: "BLANKINHERITANCE.OpeningTitles.Title",
    introKey: "BLANKINHERITANCE.OpeningTitles.Intro",
    options: [
      {
        version: OPENING_VERSIONS.REDUCED,
        isDefault: true,
        labelKey: "BLANKINHERITANCE.OpeningTitles.Reduced.Label",
        detailKey: "BLANKINHERITANCE.OpeningTitles.Reduced.Detail"
      },
      {
        version: OPENING_VERSIONS.FULL,
        isDefault: false,
        labelKey: "BLANKINHERITANCE.OpeningTitles.Full.Label",
        detailKey: "BLANKINHERITANCE.OpeningTitles.Full.Detail"
      }
    ],
    remember: { name: "remember", checked: false, labelKey: "BLANKINHERITANCE.OpeningTitles.Remember" },
    closeHintKey: "BLANKINHERITANCE.OpeningTitles.CloseHint"
  };
}

/**
 * The window's render context: the model with every key run through
 * `localize` (Foundry's own, in the adapter). The per-version booleans exist
 * so the template can write its modifier classes as literal words inside
 * {{#if}} blocks, which tier0-architecture's class lint can see.
 */
export function choiceContext(localize = (key) => key) {
  const model = openingChoiceModel();
  return {
    title: localize(model.titleKey),
    intro: localize(model.introKey),
    options: model.options.map((option) => ({
      version: option.version,
      isDefault: option.isDefault,
      isReduced: option.version === OPENING_VERSIONS.REDUCED,
      isFull: option.version === OPENING_VERSIONS.FULL,
      label: localize(option.labelKey),
      detail: localize(option.detailKey)
    })),
    remember: { name: model.remember.name, checked: model.remember.checked, label: localize(model.remember.labelKey) },
    closeHint: localize(model.closeHintKey)
  };
}

/**
 * What the window's answer means. `result` is `{ version, remember }` from a
 * button press, or null when the window was closed. Returns the version to
 * play (or null: play nothing) and the value to save (or null: save nothing).
 */
export function resolveChoice(result) {
  const version = result?.version;
  if (!isOpeningVersion(version)) return { play: null, remember: null };
  return { play: version, remember: result.remember === true ? version : null };
}

/* ---------------------------------------------------------------------- */
/*  The full-screen player                                                 */
/* ---------------------------------------------------------------------- */

export const OVERLAY_STATES = Object.freeze({
  LOADING: "loading",
  PLAYING: "playing",
  BLOCKED: "blocked",
  CLOSED: "closed"
});

/**
 * One step of the player's life. `event` is one of:
 *
 *   "playing"  the video is actually running
 *   "waiting"  it stalled to buffer
 *   "blocked"  the browser refused to start it without a click (autoplay
 *              rules: a remembered choice starts with no click behind it)
 *   "retry"    the viewer clicked "Play" on the blocked screen
 *   "ended"    it reached the end
 *   "skip"     Skip, or Escape
 *   "error"    the file is missing or would not play
 *
 * Returns `{ state, close, report }`: `close` asks the adapter to take the
 * player down, `report` to tell the GM (only a failure is reported; a skip is
 * somebody's choice). Once closed, nothing reopens it and nothing is reported
 * twice: the error event and the rejected play() of one missing file both
 * arrive, and only the first may act.
 */
export function overlayStep(state, event) {
  const to = (next, { close = false, report = false } = {}) => ({ state: next, close, report });
  if (state === OVERLAY_STATES.CLOSED) return to(OVERLAY_STATES.CLOSED);
  switch (event) {
    case "playing":
      return to(OVERLAY_STATES.PLAYING);
    case "waiting":
      return to(state === OVERLAY_STATES.BLOCKED ? OVERLAY_STATES.BLOCKED : OVERLAY_STATES.LOADING);
    case "blocked":
      return to(OVERLAY_STATES.BLOCKED);
    case "retry":
      return to(OVERLAY_STATES.LOADING);
    case "ended":
    case "skip":
      return to(OVERLAY_STATES.CLOSED, { close: true });
    case "error":
      return to(OVERLAY_STATES.CLOSED, { close: true, report: true });
    default:
      return to(state);
  }
}

/**
 * Why a `video.play()` promise was rejected, by the DOMException's name:
 * NotAllowedError is the browser's autoplay rule (show the click-to-play
 * screen); AbortError is our own skip pausing a video that was still starting
 * (nothing to do); anything else, NotSupportedError included, means the file
 * cannot play.
 */
export function classifyPlayRejection(error) {
  const name = error?.name ?? "";
  if (name === "NotAllowedError") return "blocked";
  if (name === "AbortError") return "ignore";
  return "error";
}

/** A MediaError's code as a word, for the console and the GM's report. */
export function mediaFailureReason(code) {
  return { 1: "aborted", 2: "network", 3: "decode", 4: "unavailable" }[code] ?? "unknown";
}

/**
 * While the titles play, Foundry's own music and ambience dip out of the way
 * through the audio engine's duck (foundry/audio-engine.mjs#duckBeds), all
 * the way to the mixer's silence floor. The duck is re-armed every
 * `refreshMs` with a hold a little longer than that, so the beds stay down
 * for exactly as long as the player is up and come back on their own a
 * moment after it closes, however it closed: no second "un-duck" call
 * exists to be forgotten.
 */
export const OPENING_DUCK = Object.freeze({ depthDb: SILENCE_DB, holdMs: 1600, refreshMs: 1000 });

/** The session-log line the GM's press writes (a pin on the session rail). */
export const OPENING_LOG_TEXT = "Played the opening titles.";

/**
 * The same line when the press went on to an episode: one pin, naming both,
 * rather than two pins stacked on the same second of the rail.
 */
export function openingLogText({ episodeTitle = null } = {}) {
  const title = typeof episodeTitle === "string" ? episodeTitle.trim() : "";
  if (!title) return OPENING_LOG_TEXT;
  return `Played the opening titles and the episode title: ${title}${/[.!?]$/.test(title) ? "" : "."}`;
}

/* ---------------------------------------------------------------------- */
/*  Telling the GM when a file will not play                               */
/* ---------------------------------------------------------------------- */

export const FAILURE_REASONS = Object.freeze(["aborted", "network", "decode", "unavailable", "unknown"]);

/**
 * A player's screen could not play its cut. It closes quietly there (the
 * player is not shown an error), and this report goes to the GM, whose
 * screen names the path so the file can be fixed.
 *
 * The episode's title card reports the same way, marked `part: "title"` and
 * carrying the episode instead of a version (a title card has no version);
 * that screen goes straight on to the fade. An opening report keeps the
 * shape it always had, with no `part` at all.
 */
export function failureReport({ requestId, part = null, version, episodeId, path, reason }) {
  const common = {
    type: OPENING_MESSAGES.FAILED,
    requestId: String(requestId ?? ""),
    path: String(path ?? ""),
    reason: FAILURE_REASONS.includes(reason) ? reason : "unknown"
  };
  if (part === REEL_PARTS.TITLE) return { ...common, part: REEL_PARTS.TITLE, episode: episodeId };
  return { ...common, version };
}

const usablePath = (value) => typeof value === "string" && Boolean(value) && value.length <= 512;

export function validateFailureReport(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, reason: "not-an-object" };
  if (payload.type !== OPENING_MESSAGES.FAILED) return { ok: false, reason: "wrong-type" };
  if (typeof payload.requestId !== "string" || !ID_PATTERN.test(payload.requestId)) return { ok: false, reason: "bad-id" };
  const reason = FAILURE_REASONS.includes(payload.reason) ? payload.reason : "unknown";
  if (payload.part === REEL_PARTS.TITLE) {
    if (!isEpisodeId(payload.episode)) return { ok: false, reason: "bad-episode" };
    if (!usablePath(payload.path)) return { ok: false, reason: "bad-path" };
    return {
      ok: true,
      report: { type: OPENING_MESSAGES.FAILED, requestId: payload.requestId, part: REEL_PARTS.TITLE, episode: payload.episode, path: payload.path, reason }
    };
  }
  if (payload.part != null && payload.part !== REEL_PARTS.OPENING) return { ok: false, reason: "bad-part" };
  if (!isOpeningVersion(payload.version)) return { ok: false, reason: "bad-version" };
  if (!usablePath(payload.path)) return { ok: false, reason: "bad-path" };
  return {
    ok: true,
    report: {
      type: OPENING_MESSAGES.FAILED,
      requestId: payload.requestId,
      version: payload.version,
      path: payload.path,
      reason
    }
  };
}

/**
 * One GM notice per file per press. Six players who all picked a missing
 * file are one problem, not six notices on top of the GM's own titles.
 */
export function failureNoticeKey(report) {
  return `${report?.requestId ?? ""}|${report?.path ?? ""}`;
}

/**
 * The GM's confirm window checks both files before anything is sent. Only a
 * definite "not there" (404 or 410) counts as missing. A check that could not
 * be made at all (a network error, a timeout, a cross-origin host refusing to
 * say) claims nothing: a false alarm at the start of a session is worse than
 * silence, and each screen's own failure report still catches a real miss.
 *
 * `checks` are `{ version, path, status }`, status an HTTP status or null.
 */
export function preflightFindings(checks = []) {
  return (Array.isArray(checks) ? checks : [])
    .filter((c) => c && isOpeningVersion(c.version) && isMissingStatus(c.status))
    .map((c) => ({ version: c.version, path: c.path }));
}

/** The one rule both pre-flight checks share: only the server saying "not here" counts. */
export function isMissingStatus(status) {
  return status === 404 || status === 410;
}

/* ---------------------------------------------------------------------- */
/*  The reel: the opening, the episode title card, then the scene          */
/* ---------------------------------------------------------------------- */

export const REEL_PARTS = Object.freeze({ OPENING: "opening", TITLE: "title" });

/**
 * What one screen plays for one press, in order.
 *
 *   version    the opening cut this viewer picked or remembered, or null.
 *              Only a real version adds the opening, so a closed choice
 *              window (null) skips the opening and nothing else: the title
 *              card still follows. THE ONE RULE above is untouched here,
 *              because this function never chooses a version, it only
 *              plays the one the viewer's own choice produced.
 *   episodeId  the episode the GM started, or null: no title card.
 */
export function reelFor({ folder, version = null, episodeId = null } = {}) {
  const parts = [];
  if (isOpeningVersion(version)) parts.push({ part: REEL_PARTS.OPENING, version, path: openingVideoPath(folder, version) });
  if (isEpisodeId(episodeId)) parts.push({ part: REEL_PARTS.TITLE, episodeId, path: episodeTitlePath(folder, episodeId) });
  return parts;
}

/**
 * The words the player shows for each part, as localisation keys: its name
 * for a screen reader, the Skip key's hint, and the click-to-play label.
 */
export function partLabels(part) {
  if (part === REEL_PARTS.TITLE) {
    return {
      labelKey: "BLANKINHERITANCE.OpeningTitles.Episode.Label",
      skipHintKey: "BLANKINHERITANCE.OpeningTitles.Episode.SkipHint",
      playGateKey: "BLANKINHERITANCE.OpeningTitles.Episode.PlayGate"
    };
  }
  return {
    labelKey: "BLANKINHERITANCE.OpeningTitles.Title",
    skipHintKey: "BLANKINHERITANCE.OpeningTitles.SkipHint",
    playGateKey: "BLANKINHERITANCE.OpeningTitles.PlayGate"
  };
}

/**
 * "At its end the overlay fades out over about 1.5 seconds, revealing the
 * episode's first scene." The stylesheet's `.bi-opening.is-revealing` rule
 * carries the same number (pinned by test/tier3-episode-start-contract).
 */
export const REVEAL_FADE_MS = 1500;

/**
 * How a reel ends. A press that named an episode (or a scene) fades out onto
 * the scene, over REVEAL_FADE_MS, even when its title card was missing or
 * skipped. The opening on its own just closes, exactly as it always did.
 */
export function reelEnding({ episodeId = null, sceneId = null } = {}) {
  return episodeId || sceneId ? { kind: "reveal", fadeMs: REVEAL_FADE_MS } : { kind: "close" };
}

/**
 * How long the GM's client waits, after starting the titles, before it makes
 * the episode's first scene active. Every screen puts its black curtain up
 * the moment the message arrives (well under a second), so by then nobody
 * can see the scene change underneath; and the opening runs for a minute and
 * a half, so every screen has finished drawing it long before it is shown.
 */
export const SCENE_CUE_DELAY_MS = 1500;

/**
 * The scene change itself has no transition of its own: Foundry plays none
 * when the view options name a transition whose type is null (client/canvas/
 * board.mjs, #animateTransition). The curtain's own fade is the transition
 * the table sees. A fresh object on every call, because Foundry keeps the view
 * options it is handed.
 */
export function hiddenCutTransition() {
  return { type: null };
}

/** How often a screen that has finished its videos checks for the scene, and when it stops waiting. */
export const SCENE_HOLD = Object.freeze({ pollMs: 250, timeoutMs: 20000 });

/**
 * Whether a screen whose videos are over may fade in yet. It holds on black
 * (showing "Loading…") until its own board is showing the scene the GM named,
 * fully drawn, so a viewer who skipped everything never watches it load.
 *
 *   sceneId        the scene the press named, or null
 *   viewedSceneId  the scene this screen is drawing
 *   ready          the board has finished drawing it
 *   loading        the board is still busy (textures, a transition)
 *   drawsScenes    false when this screen draws no board at all (Foundry's
 *                  own "no canvas" mode): there is nothing to wait for
 *   waitedMs       how long it has held so far
 *
 * It never holds forever: after `timeoutMs` it fades in on whatever is
 * there, and Skip or Escape ends the hold at once.
 */
export function holdOrReveal({
  sceneId = null,
  viewedSceneId = null,
  ready = false,
  loading = false,
  drawsScenes = true,
  waitedMs = 0,
  timeoutMs = SCENE_HOLD.timeoutMs
} = {}) {
  if (!sceneId) return { action: "reveal", reason: "no-scene" };
  if (drawsScenes === false) return { action: "reveal", reason: "no-board" };
  if (viewedSceneId === sceneId && ready === true && loading !== true) return { action: "reveal", reason: "scene-shown" };
  if (!(waitedMs < timeoutMs)) return { action: "reveal", reason: "timed-out" };
  return { action: "hold" };
}
