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

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SILENCE_DB } from "../module/blank-inheritance/scripts/core/audio-mix.mjs";
import {
  DEFAULT_VIDEO_FOLDER,
  FAILURE_REASONS,
  OPENING_DUCK,
  OPENING_FILES,
  OPENING_LOG_TEXT,
  OPENING_MESSAGES,
  OPENING_PREFERENCES,
  OPENING_VERSIONS,
  OVERLAY_STATES,
  PREFERENCE_ASK,
  choiceContext,
  classifyPlayRejection,
  decideOpening,
  failureNoticeKey,
  failureReport,
  isOpeningVersion,
  mediaFailureReason,
  normalisePreference,
  openingChoiceModel,
  openingVideoPath,
  overlayStep,
  playRequest,
  preflightFindings,
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
