// Tier 1 — the opening titles' pure half (scripts/core/opening-titles.mjs).
//
// Ingram's brief, 2026-09-26: the opening titles come in a full cut (fast
// cuts, strobing, flashing, rapid movement) and a reduced-motion cut with no
// flashing at all, and when she starts the episode every player gets a
// window that clearly explains both and lets them pick, with an option to
// remember. "This seems like a good safety thing."
//
// The assertion that matters most here is the safety one: THE FULL CUT NEVER
// PLAYS UNLESS THE PLAYER PICKED IT. It is tested from every side it could
// leak in by: a malformed stored preference, a socket message that names a
// version, a message a player (not the GM) sent, a window that was closed.
//
// Since 2026-09-26 the press is a reel ("we watch the intro video, then we
// cut to the episode title, then we fade into the first scene
// automatically"): the second half of this file covers what follows the
// opening on each screen. The GM's own choice of episode and scene is
// test/tier1-episode-start.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SILENCE_DB } from "../module/blank-inheritance/scripts/core/audio-mix.mjs";
import {
  DEFAULT_VIDEO_FOLDER,
  EPISODE_TITLE_FOLDER,
  FAILURE_REASONS,
  OPENING_DUCK,
  OPENING_FILES,
  OPENING_LOG_TEXT,
  OPENING_MESSAGES,
  OPENING_PREFERENCES,
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
  isEpisodeId,
  isMissingStatus,
  isOpeningVersion,
  isSceneId,
  mediaFailureReason,
  normalisePreference,
  openingChoiceModel,
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
  validateFailureReport,
  validatePlayRequest
} from "../module/blank-inheritance/scripts/core/opening-titles.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const lang = JSON.parse(readFileSync(path.join(here, "..", "module", "blank-inheritance", "lang", "en.json"), "utf8"));
const resolveKey = (key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), lang);

const FROM_GM = { senderIsGM: true };
const request = playRequest("abc123DEF456ghi7");

/* ---------------------------------------------------------------- */
/*  The one rule: full only when the player picked it                */
/* ---------------------------------------------------------------- */

test("a stored preference is believed only when it is exactly ask, reduced or full; anything else asks", () => {
  assert.deepEqual([...OPENING_PREFERENCES], ["ask", "reduced", "full"], "the order Game Settings shows: ask, then the safe cut, then full");
  for (const good of OPENING_PREFERENCES) assert.equal(normalisePreference(good), good);
  for (const bad of [undefined, null, "", "FULL", "Full", " full", "full ", "yes", 1, true, ["full"], { version: "full" }]) {
    assert.equal(normalisePreference(bad), PREFERENCE_ASK, `${JSON.stringify(bad)} must read as "ask"`);
  }
});

test("the GM's broadcast asks everyone who has not remembered a choice, and plays a remembered one straight away", () => {
  assert.deepEqual(decideOpening({ payload: request, ...FROM_GM, preference: "ask" }), { action: "ask", id: request.id });
  assert.deepEqual(decideOpening({ payload: request, ...FROM_GM, preference: "reduced" }), { action: "play", id: request.id, version: "reduced" });
  assert.deepEqual(decideOpening({ payload: request, ...FROM_GM, preference: "full" }), { action: "play", id: request.id, version: "full" });
  assert.equal(decideOpening({ payload: request, ...FROM_GM }).action, "ask", "no stored preference at all means ask");
});

test("no malformed preference ever turns into the full cut", () => {
  for (const preference of [undefined, null, "", "FULL", "Full", " full", "full ", ["full"], { version: "full" }, true, 1, "reduced-motion"]) {
    const decision = decideOpening({ payload: request, ...FROM_GM, preference });
    assert.equal(decision.action, "ask", `preference ${JSON.stringify(preference)} should ask, got ${JSON.stringify(decision)}`);
    assert.notEqual(decision.version, OPENING_VERSIONS.FULL);
  }
});

test("a socket message that names a version cannot choose it for anyone", () => {
  const smuggled = { ...request, version: "full", preference: "full", remember: true };
  assert.deepEqual(decideOpening({ payload: smuggled, ...FROM_GM, preference: "ask" }), { action: "ask", id: request.id });
  assert.deepEqual(decideOpening({ payload: smuggled, ...FROM_GM, preference: "reduced" }), { action: "play", id: request.id, version: "reduced" });
  assert.deepEqual(validatePlayRequest(smuggled), { ok: true, request: { type: OPENING_MESSAGES.PLAY, id: request.id } },
    "the accepted request is rebuilt field by field; nothing extra rides through");
  assert.deepEqual(Object.keys(playRequest("x1")), ["type", "id"], "the GM's own message carries no version to begin with");
});

test("only a GM can start the titles: a message a player sent is ignored, whatever their setting says", () => {
  for (const senderIsGM of [false, undefined, null, "true", 1]) {
    const decision = decideOpening({ payload: request, senderIsGM, preference: "full" });
    assert.deepEqual(decision, { action: "ignore", reason: "not-from-gm", id: request.id });
  }
});

test("a window closed without choosing plays nothing and saves nothing", () => {
  for (const closed of [null, undefined, {}, { remember: true }, { version: null, remember: true }]) {
    assert.deepEqual(resolveChoice(closed), { play: null, remember: null });
  }
  for (const unknown of ["FULL", "reduced-motion", "", 1]) {
    assert.deepEqual(resolveChoice({ version: unknown, remember: true }), { play: null, remember: null });
  }
});

test("a pick plays that cut, and is saved only when Remember was ticked", () => {
  assert.deepEqual(resolveChoice({ version: "reduced", remember: false }), { play: "reduced", remember: null });
  assert.deepEqual(resolveChoice({ version: "reduced", remember: true }), { play: "reduced", remember: "reduced" });
  assert.deepEqual(resolveChoice({ version: "full", remember: true }), { play: "full", remember: "full" });
  assert.deepEqual(resolveChoice({ version: "full" }), { play: "full", remember: null });
  assert.deepEqual(resolveChoice({ version: "full", remember: "yes" }), { play: "full", remember: null }, "only a real tick saves");
});

/* ---------------------------------------------------------------- */
/*  The socket message                                               */
/* ---------------------------------------------------------------- */

test("anything that is not a well-formed play request is ignored, with the reason", () => {
  const cases = [
    [null, "not-an-object"],
    [[], "not-an-object"],
    ["opening.play", "not-an-object"],
    [{ type: "audio.oneshot", id: "abc" }, "wrong-type"],
    [{ type: "downtime-request" }, "wrong-type"],
    [{ type: OPENING_MESSAGES.PLAY }, "bad-id"],
    [{ type: OPENING_MESSAGES.PLAY, id: "" }, "bad-id"],
    [{ type: OPENING_MESSAGES.PLAY, id: "has space" }, "bad-id"],
    [{ type: OPENING_MESSAGES.PLAY, id: "x".repeat(65) }, "bad-id"],
    [{ type: OPENING_MESSAGES.PLAY, id: 42 }, "bad-id"]
  ];
  for (const [payload, reason] of cases) {
    assert.deepEqual(decideOpening({ payload, ...FROM_GM, preference: "full" }), { action: "ignore", reason }, JSON.stringify(payload));
  }
});

test("playRequest builds a message its own validator accepts, and refuses an unusable id", () => {
  assert.deepEqual(request, { type: "opening.play", id: "abc123DEF456ghi7" });
  assert.equal(validatePlayRequest(request).ok, true);
  for (const bad of ["", "a b", null, undefined, "x".repeat(65), "semi;colon"]) {
    assert.throws(() => playRequest(bad), /playRequest/, JSON.stringify(bad));
  }
  assert.ok(Object.values(OPENING_MESSAGES).every((type) => type.startsWith("opening.")),
    "every message type carries the prefix the shared socket's listeners filter on");
});

test("a copy of a message this screen already acted on is ignored, from a list or a Set", () => {
  assert.deepEqual(decideOpening({ payload: request, ...FROM_GM, handled: [request.id] }), { action: "ignore", reason: "duplicate", id: request.id });
  assert.deepEqual(decideOpening({ payload: request, ...FROM_GM, handled: new Set([request.id]) }), { action: "ignore", reason: "duplicate", id: request.id });
  assert.equal(decideOpening({ payload: request, ...FROM_GM, handled: ["someOtherId"] }).action, "ask");
});

test("a second press while this screen is still choosing or watching does not stack a second window or video", () => {
  assert.deepEqual(decideOpening({ payload: request, ...FROM_GM, preference: "reduced", busy: true }), { action: "ignore", reason: "busy", id: request.id });
});

/* ---------------------------------------------------------------- */
/*  Where the files are                                              */
/* ---------------------------------------------------------------- */

test("the default folder and the two file names are the ones the brief names", () => {
  assert.equal(DEFAULT_VIDEO_FOLDER, "blank-inheritance-video");
  assert.deepEqual({ ...OPENING_FILES }, { full: "opening-full.mp4", reduced: "opening-reduced.mp4" });
  assert.equal(openingVideoPath(DEFAULT_VIDEO_FOLDER, "full"), "blank-inheritance-video/opening-full.mp4");
  assert.equal(openingVideoPath(DEFAULT_VIDEO_FOLDER, "reduced"), "blank-inheritance-video/opening-reduced.mp4");
  assert.equal(openingVideoPath(undefined, "reduced"), "blank-inheritance-video/opening-reduced.mp4", "an unset folder is the default");
});

test("a folder is cleaned up the way a GM is likely to type or pick it", () => {
  const cases = [
    ["", DEFAULT_VIDEO_FOLDER],
    ["   ", DEFAULT_VIDEO_FOLDER],
    [null, DEFAULT_VIDEO_FOLDER],
    ["/", DEFAULT_VIDEO_FOLDER],
    ["blank-inheritance-video", "blank-inheritance-video"],
    ["/blank-inheritance-video/", "blank-inheritance-video"],
    ["./videos//titles/", "videos/titles"],
    ["videos\\titles", "videos/titles"],
    [" my videos/titles ", "my videos/titles"],
    ["https://cdn.example.com/bi/videos/", "https://cdn.example.com/bi/videos"],
    ["HTTPS://cdn.example.com", "HTTPS://cdn.example.com"]
  ];
  for (const [raw, folder] of cases) {
    const resolved = resolveVideoFolder(raw);
    assert.equal(resolved.folder, folder, JSON.stringify(raw));
    assert.equal(resolved.valid, true, JSON.stringify(raw));
  }
  assert.equal(openingVideoPath("https://cdn.example.com/bi/videos/", "full"), "https://cdn.example.com/bi/videos/opening-full.mp4");
});

test("a folder that cannot be used falls back to the default and says why, rather than stopping the titles", () => {
  const cases = [
    ["../secret", "climbs-out"],
    ["videos/../../x", "climbs-out"],
    ["https://cdn.example.com/../x", "climbs-out"],
    ["C:\\Videos", "not-a-data-path"],
    ["file:///home/videos", "not-a-data-path"],
    ["data:video/mp4;base64,AAAA", "not-a-data-path"],
    ["videos?x=1", "query-or-fragment"],
    ["videos#top", "query-or-fragment"]
  ];
  for (const [raw, reason] of cases) {
    assert.deepEqual(resolveVideoFolder(raw), { folder: DEFAULT_VIDEO_FOLDER, valid: false, reason }, JSON.stringify(raw));
  }
  assert.equal(openingVideoPath("../secret", "reduced"), "blank-inheritance-video/opening-reduced.mp4");
});

test("an unknown version is a programming error, never a path", () => {
  for (const bad of ["FULL", "", undefined, "ask", "opening-full"]) {
    assert.throws(() => openingVideoPath(DEFAULT_VIDEO_FOLDER, bad), /unknown version/, JSON.stringify(bad));
    assert.equal(isOpeningVersion(bad), false);
  }
});

/* ---------------------------------------------------------------- */
/*  The choice window                                                */
/* ---------------------------------------------------------------- */

test("the window offers reduced motion first, as the one default, and never pre-selects the full cut", () => {
  const model = openingChoiceModel();
  assert.deepEqual(model.options.map((o) => o.version), ["reduced", "full"]);
  assert.deepEqual(model.options.filter((o) => o.isDefault).map((o) => o.version), ["reduced"], "exactly one default, and it is the safe one");
  assert.equal(model.options.find((o) => o.version === "full").isDefault, false);
  assert.equal(model.remember.checked, false, "nothing is remembered unless the player ticks it");
  assert.equal(model.remember.name, "remember");
});

test("every word the window shows is a real key in lang/en.json", () => {
  const model = openingChoiceModel();
  const keys = [model.titleKey, model.introKey, model.remember.labelKey, model.closeHintKey, ...model.options.flatMap((o) => [o.labelKey, o.detailKey])];
  for (const key of keys) assert.equal(typeof resolveKey(key), "string", `${key} is not a string in lang/en.json`);
});

test("choiceContext localises the model and keeps its order and its flags", () => {
  const context = choiceContext((key) => `<${key}>`);
  assert.equal(context.title, "<BLANKINHERITANCE.OpeningTitles.Title>");
  assert.deepEqual(context.options.map((o) => [o.version, o.isDefault, o.isReduced, o.isFull]), [
    ["reduced", true, true, false],
    ["full", false, false, true]
  ]);
  assert.equal(context.options[1].detail, "<BLANKINHERITANCE.OpeningTitles.Full.Detail>");
  assert.deepEqual(context.remember, { name: "remember", checked: false, label: "<BLANKINHERITANCE.OpeningTitles.Remember>" });

  const real = choiceContext((key) => resolveKey(key));
  assert.equal(real.options[0].label, "Reduced motion");
  assert.equal(real.options[1].label, "Full opening");
});

/* ---------------------------------------------------------------- */
/*  The words: plain, exact, and no outside references               */
/* ---------------------------------------------------------------- */

const openingStrings = [];
(function collect(node, where) {
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string") openingStrings.push([`${where}.${key}`, value]);
    else collect(value, `${where}.${key}`);
  }
})(lang.BLANKINHERITANCE.OpeningTitles, "OpeningTitles");

test("the full cut's warning says exactly what is in it and who it is not suitable for", () => {
  const full = lang.BLANKINHERITANCE.OpeningTitles.Full.Detail;
  for (const fact of [/fast cuts/i, /strob/i, /flashing/i, /rapid movement/i, /photosensitive epilepsy/i, /sensitive to flashing or motion/i]) {
    assert.match(full, fact);
  }
  const reduced = lang.BLANKINHERITANCE.OpeningTitles.Reduced.Detail;
  for (const fact of [/same song and pictures/i, /fewer cuts/i, /gentle movement/i, /no flashing/i]) assert.match(reduced, fact);
  assert.match(lang.BLANKINHERITANCE.OpeningTitles.Remember, /Game Settings/, "the player is told where to change a remembered choice");
});

test("nothing the titles' windows say names an outside work, studio, real place or decade", () => {
  // The standing rule for anything players see (LEDGER #24): no real works,
  // no real places, no real decades. The titles are an homage, and the
  // sources behind it stay GM-facing (design/opening-titles.md).
  const forbidden = [
    /evangelion/i, /neon genesis/i, /gainax/i, /tatsunoko/i, /\bkhara\b/i, /giant robo/i, /zankoku/i, /\bthesis\b/i,
    /\bjapan/i, /\btokyo\b/i, /\bkobe\b/i, /\bosaka\b/i, /\bchina\b/i,
    /\b(?:18|19|20)\d\d\b/, /\b\d0['’]?s\b/i, /\b(?:fifties|sixties|seventies|eighties|nineties)\b/i
  ];
  assert.ok(openingStrings.length > 20, "expected the OpeningTitles block to be collected");
  for (const [where, text] of openingStrings) {
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${where}: "${text}"`);
  }
});

/* ---------------------------------------------------------------- */
/*  The full-screen player                                           */
/* ---------------------------------------------------------------- */

test("the player loads, plays, ends and closes; skip and end close without telling the GM", () => {
  const { LOADING, PLAYING, BLOCKED, CLOSED } = OVERLAY_STATES;
  assert.deepEqual(overlayStep(LOADING, "playing"), { state: PLAYING, close: false, report: false });
  assert.deepEqual(overlayStep(PLAYING, "waiting"), { state: LOADING, close: false, report: false });
  assert.deepEqual(overlayStep(PLAYING, "ended"), { state: CLOSED, close: true, report: false });
  assert.deepEqual(overlayStep(LOADING, "skip"), { state: CLOSED, close: true, report: false });
  assert.deepEqual(overlayStep(BLOCKED, "skip"), { state: CLOSED, close: true, report: false }, "Skip works on the click-to-play screen too");
  assert.deepEqual(overlayStep(PLAYING, "something-else"), { state: PLAYING, close: false, report: false });
});

test("a blocked autoplay waits for a click, and the click starts it", () => {
  const { LOADING, BLOCKED } = OVERLAY_STATES;
  assert.deepEqual(overlayStep(LOADING, "blocked"), { state: BLOCKED, close: false, report: false });
  assert.deepEqual(overlayStep(BLOCKED, "waiting"), { state: BLOCKED, close: false, report: false }, "a stall must not hide the Play button");
  assert.deepEqual(overlayStep(BLOCKED, "retry"), { state: LOADING, close: false, report: false });
});

test("a file that will not play closes the player and is reported exactly once", () => {
  const first = overlayStep(OVERLAY_STATES.LOADING, "error");
  assert.deepEqual(first, { state: OVERLAY_STATES.CLOSED, close: true, report: true });
  // The error event and the rejected play() of one missing file both arrive.
  const second = overlayStep(first.state, "error");
  assert.deepEqual(second, { state: OVERLAY_STATES.CLOSED, close: false, report: false });
  for (const event of ["playing", "waiting", "blocked", "retry", "ended", "skip"]) {
    assert.deepEqual(overlayStep(OVERLAY_STATES.CLOSED, event), { state: OVERLAY_STATES.CLOSED, close: false, report: false }, `closed stays closed on ${event}`);
  }
});

test("a rejected play() is read by its DOMException name", () => {
  assert.equal(classifyPlayRejection({ name: "NotAllowedError" }), "blocked");
  assert.equal(classifyPlayRejection({ name: "AbortError" }), "ignore", "our own skip pausing a starting video is not a failure");
  assert.equal(classifyPlayRejection({ name: "NotSupportedError" }), "error");
  assert.equal(classifyPlayRejection(new Error("anything")), "error");
  assert.equal(classifyPlayRejection(undefined), "error");
});

test("a MediaError code becomes a word", () => {
  assert.deepEqual([1, 2, 3, 4, 7, undefined].map(mediaFailureReason), ["aborted", "network", "decode", "unavailable", "unknown", "unknown"]);
  assert.ok([1, 2, 3, 4, 9].map(mediaFailureReason).every((reason) => FAILURE_REASONS.includes(reason)));
});

test("the music ducks all the way down, and the duck is re-armed before it can lapse", () => {
  assert.equal(OPENING_DUCK.depthDb, SILENCE_DB);
  assert.ok(OPENING_DUCK.holdMs > OPENING_DUCK.refreshMs, "each re-arm must land before the previous hold runs out");
  assert.equal(typeof OPENING_LOG_TEXT, "string");
});

/* ---------------------------------------------------------------- */
/*  Telling the GM                                                   */
/* ---------------------------------------------------------------- */

test("a failure report round-trips, drops anything extra, and refuses what it cannot name", () => {
  const report = failureReport({ requestId: request.id, version: "reduced", path: "blank-inheritance-video/opening-reduced.mp4", reason: "unavailable" });
  assert.deepEqual(validateFailureReport({ ...report, extra: "<script>" }), { ok: true, report });
  assert.equal(failureReport({ requestId: request.id, version: "full", path: "x.mp4", reason: "made-up" }).reason, "unknown");
  assert.equal(validateFailureReport({ ...report, reason: "made-up" }).report.reason, "unknown");
  for (const [bad, reason] of [
    [null, "not-an-object"],
    [{ ...report, type: OPENING_MESSAGES.PLAY }, "wrong-type"],
    [{ ...report, requestId: "a b" }, "bad-id"],
    [{ ...report, version: "FULL" }, "bad-version"],
    [{ ...report, path: "" }, "bad-path"],
    [{ ...report, path: "x".repeat(513) }, "bad-path"]
  ]) {
    assert.deepEqual(validateFailureReport(bad), { ok: false, reason }, JSON.stringify(bad)?.slice(0, 80));
  }
});

test("one GM notice per file per press, however many screens it failed on", () => {
  const a = failureReport({ requestId: "r1", version: "reduced", path: "v/opening-reduced.mp4", reason: "unavailable" });
  const b = failureReport({ requestId: "r1", version: "reduced", path: "v/opening-reduced.mp4", reason: "network" });
  const c = failureReport({ requestId: "r1", version: "full", path: "v/opening-full.mp4", reason: "unavailable" });
  const d = failureReport({ requestId: "r2", version: "reduced", path: "v/opening-reduced.mp4", reason: "unavailable" });
  assert.equal(failureNoticeKey(a), failureNoticeKey(b));
  assert.notEqual(failureNoticeKey(a), failureNoticeKey(c));
  assert.notEqual(failureNoticeKey(a), failureNoticeKey(d), "a later press is a new chance to find the file");
});

test("the GM's pre-flight check only calls a file missing when the server says so", () => {
  const checks = [
    { version: "full", path: "v/opening-full.mp4", status: 404 },
    { version: "reduced", path: "v/opening-reduced.mp4", status: 200 }
  ];
  assert.deepEqual(preflightFindings(checks), [{ version: "full", path: "v/opening-full.mp4" }]);
  assert.deepEqual(preflightFindings([{ version: "reduced", path: "p", status: 410 }]), [{ version: "reduced", path: "p" }]);
  for (const status of [200, 206, 304, 403, 500, 503, null, undefined]) {
    assert.deepEqual(preflightFindings([{ version: "full", path: "p", status }]), [], `status ${status} claims nothing`);
  }
  assert.deepEqual(preflightFindings([{ version: "FULL", path: "p", status: 404 }, null]), []);
  assert.deepEqual(preflightFindings(undefined), []);
});

test("both pre-flight checks share one rule: only a 404 or a 410 means missing", () => {
  assert.deepEqual([404, 410].map(isMissingStatus), [true, true]);
  for (const status of [200, 206, 304, 403, 500, 503, 0, null, undefined, "404"]) {
    assert.equal(isMissingStatus(status), false, `status ${JSON.stringify(status)}`);
  }
});

/* ================================================================ */
/*  What follows the opening: the episode title card, then the scene */
/* ================================================================ */

const EPISODE = "episode-c1e1-mothers-maiden-name";
const SCENE = "a1b2c3d4e5f60718"; // sixteen hex characters: what core/ids.mjs#deriveFoundryId makes
const withChain = playRequest("abc123DEF456ghi7", { episodeId: EPISODE, sceneId: SCENE });

// Every real episode file, read the way the module stages them (data/episodes/ -> data/campaign/episodes/).
const episodesDir = path.join(here, "..", "data", "episodes");
const realEpisodes = readdirSync(episodesDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({ file: name, doc: JSON.parse(readFileSync(path.join(episodesDir, name), "utf8")) }));

test("a play request can name the episode and the scene that follow, and the validator keeps exactly those", () => {
  assert.deepEqual(withChain, { type: "opening.play", id: "abc123DEF456ghi7", episode: EPISODE, scene: SCENE });
  assert.deepEqual(validatePlayRequest(withChain), { ok: true, request: withChain });
  assert.deepEqual(chainFromRequest(withChain), { episodeId: EPISODE, sceneId: SCENE });
  assert.deepEqual(chainFromRequest(request), { episodeId: null, sceneId: null }, "the opening alone names neither");
  assert.deepEqual(playRequest("x1", { episodeId: EPISODE }), { type: "opening.play", id: "x1", episode: EPISODE }, "an episode whose first scene is not built yet");

  const smuggled = { ...withChain, version: "full", title: "<script>", sceneName: "x" };
  assert.deepEqual(validatePlayRequest(smuggled), { ok: true, request: withChain }, "rebuilt field by field: nothing extra rides through");
});

test("an episode or scene that is present but malformed refuses the whole message, and the GM's side cannot build one", () => {
  const cases = [
    [{ episode: "../secret" }, "bad-episode"],
    [{ episode: "episode/../x" }, "bad-episode"],
    [{ episode: "Episode-C1E1" }, "bad-episode"],
    [{ episode: "episode.mp4" }, "bad-episode"],
    [{ episode: "a?b" }, "bad-episode"],
    [{ episode: "" }, "bad-episode"],
    [{ episode: 42 }, "bad-episode"],
    [{ scene: "short" }, "bad-scene"],
    [{ scene: "a1b2c3d4e5f60718x" }, "bad-scene"],
    [{ scene: "a1b2c3d4-5f60718" }, "bad-scene"],
    [{ scene: 1234567890123456 }, "bad-scene"]
  ];
  for (const [extra, reason] of cases) {
    const payload = { type: OPENING_MESSAGES.PLAY, id: "abc", ...extra };
    assert.deepEqual(validatePlayRequest(payload), { ok: false, reason }, JSON.stringify(extra));
    assert.deepEqual(decideOpening({ payload, ...FROM_GM, preference: "reduced" }), { action: "ignore", reason }, JSON.stringify(extra));
    assert.deepEqual(chainFromRequest(payload), { episodeId: null, sceneId: null });
  }
  assert.equal(validatePlayRequest({ type: OPENING_MESSAGES.PLAY, id: "abc", episode: null, scene: undefined }).ok, true, "null and absent both mean none");
  assert.throws(() => playRequest("abc", { episodeId: "../x" }), /episode id/);
  assert.throws(() => playRequest("abc", { sceneId: "nope" }), /scene id/);
});

test("the one rule holds with an episode attached: the message names no version, and a closed window adds no opening", () => {
  assert.equal("version" in withChain, false, "the GM's message still carries no version");
  assert.deepEqual(decideOpening({ payload: withChain, ...FROM_GM, preference: "ask" }), { action: "ask", id: withChain.id });
  assert.deepEqual(decideOpening({ payload: { ...withChain, version: "full" }, ...FROM_GM, preference: "reduced" }), { action: "play", id: withChain.id, version: "reduced" });
  assert.deepEqual(decideOpening({ payload: withChain, senderIsGM: false, preference: "full" }), { action: "ignore", reason: "not-from-gm", id: withChain.id });

  // A closed choice window resolves to null (resolveChoice): no opening part, the title card still follows.
  for (const closed of [null, undefined, "FULL", "ask", "", {}]) {
    const parts = reelFor({ folder: DEFAULT_VIDEO_FOLDER, version: closed, episodeId: EPISODE });
    assert.deepEqual(parts.map((p) => p.part), ["title"], `version ${JSON.stringify(closed)}`);
  }
  assert.ok(!reelFor({ version: "FULL" }).some((p) => p.part === REEL_PARTS.OPENING), "only a real version is ever played");
});

test("the title card's path is the video folder, then episode-titles, then the episode's id", () => {
  assert.equal(EPISODE_TITLE_FOLDER, "episode-titles");
  assert.equal(episodeTitlePath(DEFAULT_VIDEO_FOLDER, EPISODE), "blank-inheritance-video/episode-titles/episode-c1e1-mothers-maiden-name.mp4",
    "exactly the convention the brief names");
  assert.equal(episodeTitlePath(undefined, EPISODE), "blank-inheritance-video/episode-titles/episode-c1e1-mothers-maiden-name.mp4", "an unset folder is the default");
  assert.equal(episodeTitlePath("/videos/titles/", EPISODE), "videos/titles/episode-titles/episode-c1e1-mothers-maiden-name.mp4");
  assert.equal(episodeTitlePath("https://cdn.example.com/bi/", EPISODE), "https://cdn.example.com/bi/episode-titles/episode-c1e1-mothers-maiden-name.mp4");
  assert.equal(episodeTitlePath("../secret", EPISODE), "blank-inheritance-video/episode-titles/episode-c1e1-mothers-maiden-name.mp4", "a folder that cannot be used falls back, as the opening's does");
  for (const bad of ["../x", "", "Episode-One", "a/b", "a.mp4", "a?b", "a#b", null, undefined, 7, "-lead", "trail-", "two--dashes"]) {
    assert.throws(() => episodeTitlePath(DEFAULT_VIDEO_FOLDER, bad), /not an episode id/, JSON.stringify(bad));
    assert.equal(isEpisodeId(bad), false, JSON.stringify(bad));
  }
});

test("every real episode's id is one the title card path accepts, and names its own file", () => {
  assert.ok(realEpisodes.length >= 2, "expected the episodes in data/episodes/");
  for (const { file, doc } of realEpisodes) {
    assert.equal(isEpisodeId(doc.id), true, `${file}: id "${doc.id}"`);
    assert.equal(`${doc.id}.json`, file, `${file}: the id is the file name (CLAUDE.md's convention), so the card is findable from either`);
    assert.equal(episodeTitlePath(DEFAULT_VIDEO_FOLDER, doc.id), `blank-inheritance-video/episode-titles/${doc.id}.mp4`);
  }
});

test("a scene id is Foundry's own shape: sixteen letters and digits", () => {
  for (const good of [SCENE, "ABCDEFGHIJKLMNOP", "0123456789abcdef", "aB3dE5gH7jK9mN1p"]) assert.equal(isSceneId(good), true, good);
  for (const bad of ["", "short", `${SCENE}0`, "a1b2c3d4e5f6071-", "a1b2c3d4e5f6071_", null, undefined, 1234567890123456]) {
    assert.equal(isSceneId(bad), false, JSON.stringify(bad));
  }
});

test("the reel is the opening, then the title card, each only when it applies", () => {
  assert.deepEqual(reelFor({ folder: DEFAULT_VIDEO_FOLDER, version: "reduced", episodeId: EPISODE }), [
    { part: "opening", version: "reduced", path: "blank-inheritance-video/opening-reduced.mp4" },
    { part: "title", episodeId: EPISODE, path: "blank-inheritance-video/episode-titles/episode-c1e1-mothers-maiden-name.mp4" }
  ]);
  assert.deepEqual(reelFor({ version: "full" }), [{ part: "opening", version: "full", path: "blank-inheritance-video/opening-full.mp4" }],
    "the opening alone, exactly as before");
  assert.deepEqual(reelFor({ version: null, episodeId: null }), [], "a closed window and no episode: nothing plays");
  assert.deepEqual(reelFor(), []);
  assert.deepEqual(reelFor({ version: "reduced", episodeId: "../x" }).map((p) => p.part), ["opening"], "a bad episode adds no card");
});

test("each part names itself with real words: a screen reader label, the Skip hint, the click-to-play label", () => {
  const opening = partLabels(REEL_PARTS.OPENING);
  const title = partLabels(REEL_PARTS.TITLE);
  assert.notDeepEqual(opening, title);
  assert.deepEqual(partLabels("anything-else"), opening, "anything unknown reads as the opening");
  for (const labels of [opening, title]) {
    for (const key of Object.values(labels)) assert.equal(typeof resolveKey(key), "string", `${key} is not a string in lang/en.json`);
  }
  assert.equal(resolveKey(title.labelKey), "Episode title");
  assert.match(resolveKey(title.skipHintKey), /Esc/, "the Skip hint names its key");
});

test("a press that named an episode fades into its scene over 1.5 seconds; the opening alone just closes", () => {
  assert.equal(REVEAL_FADE_MS, 1500, "\"fades out over about 1.5 seconds\"");
  assert.deepEqual(reelEnding({ episodeId: EPISODE, sceneId: SCENE }), { kind: "reveal", fadeMs: 1500 });
  assert.deepEqual(reelEnding({ episodeId: EPISODE, sceneId: null }), { kind: "reveal", fadeMs: 1500 }, "no built scene: still fades, back onto where everyone is");
  assert.deepEqual(reelEnding({ episodeId: null, sceneId: null }), { kind: "close" });
  assert.deepEqual(reelEnding(), { kind: "close" });
});

test("the scene changes under the curtain with no transition of its own, and after every curtain is up", () => {
  const cut = hiddenCutTransition();
  assert.deepEqual(cut, { type: null }, "Foundry plays no transition for a null type (pinned in tier3)");
  assert.notEqual(hiddenCutTransition(), cut, "a fresh object each time: Foundry keeps the view options it is handed");
  assert.ok(SCENE_CUE_DELAY_MS > 260, "after the curtain's own 260 ms fade-in has finished");
  assert.ok(SCENE_CUE_DELAY_MS <= 5000, "long before the opening (a minute and a half) ends");
});

test("a screen whose videos are over holds on black until it is drawing the scene, and never forever", () => {
  const base = { sceneId: SCENE, viewedSceneId: SCENE, ready: true, loading: false, drawsScenes: true, waitedMs: 0 };
  assert.deepEqual(holdOrReveal(base), { action: "reveal", reason: "scene-shown" });
  assert.deepEqual(holdOrReveal({ ...base, viewedSceneId: "zzzzzzzzzzzzzzzz" }), { action: "hold" }, "still on the old scene");
  assert.deepEqual(holdOrReveal({ ...base, ready: false }), { action: "hold" }, "still drawing");
  assert.deepEqual(holdOrReveal({ ...base, loading: true }), { action: "hold" }, "drawn but still loading");
  assert.deepEqual(holdOrReveal({ ...base, viewedSceneId: null, waitedMs: SCENE_HOLD.timeoutMs }), { action: "reveal", reason: "timed-out" });
  assert.deepEqual(holdOrReveal({ ...base, viewedSceneId: null, waitedMs: SCENE_HOLD.timeoutMs - 1 }), { action: "hold" });
  assert.deepEqual(holdOrReveal({ ...base, sceneId: null, viewedSceneId: null }), { action: "reveal", reason: "no-scene" }, "no scene named: nothing to wait for");
  assert.deepEqual(holdOrReveal({ ...base, viewedSceneId: null, drawsScenes: false }), { action: "reveal", reason: "no-board" }, "a screen that draws no board");
  assert.deepEqual(holdOrReveal({ sceneId: SCENE, waitedMs: Number.NaN }), { action: "reveal", reason: "timed-out" }, "a broken clock cannot strand anyone");
  assert.ok(SCENE_HOLD.pollMs > 0 && SCENE_HOLD.pollMs < SCENE_HOLD.timeoutMs);
});

test("a title card that will not play is reported by episode and path, and checked like the opening's", () => {
  const report = failureReport({ requestId: "r1", part: "title", episodeId: EPISODE, path: "v/episode-titles/x.mp4", reason: "unavailable" });
  assert.deepEqual(report, { type: "opening.failed", requestId: "r1", part: "title", episode: EPISODE, path: "v/episode-titles/x.mp4", reason: "unavailable" });
  assert.equal("version" in report, false, "a title card has no version");
  assert.deepEqual(validateFailureReport({ ...report, version: "full", extra: "<script>" }), { ok: true, report }, "rebuilt field by field");
  for (const [bad, reason] of [
    [{ ...report, episode: "../x" }, "bad-episode"],
    [{ ...report, episode: undefined }, "bad-episode"],
    [{ ...report, path: "" }, "bad-path"],
    [{ ...report, path: "x".repeat(513) }, "bad-path"],
    [{ ...report, requestId: "a b" }, "bad-id"],
    [{ ...report, part: "credits" }, "bad-part"]
  ]) {
    assert.deepEqual(validateFailureReport(bad), { ok: false, reason }, JSON.stringify(bad).slice(0, 80));
  }
  // The opening's own report is unchanged: no part, and "opening" named outright is the same thing.
  const opening = failureReport({ requestId: "r1", part: "opening", version: "reduced", path: "v/opening-reduced.mp4", reason: "network" });
  assert.deepEqual(opening, { type: "opening.failed", requestId: "r1", version: "reduced", path: "v/opening-reduced.mp4", reason: "network" });
  assert.equal(validateFailureReport({ ...opening, part: "opening" }).ok, true);
  assert.notEqual(failureNoticeKey(report), failureNoticeKey(opening), "one GM notice per file: the card and the opening are two files");
});

test("the log line names the episode when the press started one", () => {
  assert.equal(openingLogText(), OPENING_LOG_TEXT);
  assert.equal(openingLogText({ episodeTitle: "  " }), OPENING_LOG_TEXT);
  assert.equal(openingLogText({ episodeTitle: "Mother's Maiden Name (Again)" }), "Played the opening titles and the episode title: Mother's Maiden Name (Again).");
  assert.equal(openingLogText({ episodeTitle: "What Now?" }), "Played the opening titles and the episode title: What Now?", "no doubled full stop");
  assert.doesNotMatch(openingLogText({ episodeTitle: "x" }), /^[a-z]+:/i, "never read as a tagged log line (core/log-entry.mjs#parseLogLine)");
});
