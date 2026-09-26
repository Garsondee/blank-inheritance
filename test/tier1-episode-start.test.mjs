// Tier 1 — starting an episode with the opening titles: the GM's choice
// (scripts/core/episode-start.mjs).
//
// Ingram, 2026-09-26: "So when we start a session we watch the intro video,
// then we cut to the episode title, then we fade into the first scene
// automatically." The GM's confirm window picks the episode (offering the
// Scene Runner's own episode first) and so the scene the titles fade into:
// the episode's first scene in its own running order, in the Foundry scene
// the scene set built for it. This file checks those choices, and checks
// them against the real episodes and the real scene set, because a title
// sequence that fades into the wrong room is the failure worth catching.
//
// What each screen then does with the press is tier1-opening-titles.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  START_FIELD_ID,
  START_KEYS,
  defaultStartId,
  episodePlayOrder,
  episodeStarts,
  escapeMarkup,
  firstEpisodeScene,
  missingTitleCards,
  openingSceneFor,
  startChoiceContext,
  startChoiceHtml,
  unclearedStatus
} from "../module/blank-inheritance/scripts/core/episode-start.mjs";
import { DEFAULT_VIDEO_FOLDER } from "../module/blank-inheritance/scripts/core/opening-titles.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const lang = JSON.parse(readFileSync(path.join(repoRoot, "module", "blank-inheritance", "lang", "en.json"), "utf8"));
const resolveKey = (key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), lang);
/** game.i18n.format's own substitution, for reading the real sentences. */
const realFormat = (key, data = {}) => String(resolveKey(key)).replace(/\{(\w+)\}/g, (whole, name) => (name in data ? String(data[name]) : whole));

const episodesDir = path.join(repoRoot, "data", "episodes");
const realEpisodes = readdirSync(episodesDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(path.join(episodesDir, name), "utf8")));
const sceneSet = JSON.parse(readFileSync(path.join(repoRoot, "data", "campaign", "scene-set.json"), "utf8"));

/** The scene set as the world's scenes would describe it: every manifest scene with a brief, a fake id each. */
const realSceneDescriptors = (sceneSet.scenes ?? [])
  .filter((s) => s.briefRef)
  .map((s, i) => ({ id: `scene${String(i).padStart(11, "0")}`, briefRef: s.briefRef, kind: s.kind, sort: (s.order ?? 0) * 100, active: false, name: s.name }));

const id16 = (n) => `s${String(n).padStart(15, "0")}`;

/* ---------------------------------------------------------------- */
/*  The episode's first scene                                        */
/* ---------------------------------------------------------------- */

test("an episode's first scene is the lowest order that names a brief, as the Scene Runner advances", () => {
  const episode = {
    scenes: [
      { order: 3, title: "Third", briefRef: "b3" },
      { order: 1, title: "No brief yet" },
      { order: 2, title: "Second", briefRef: "b2", authoring: { status: "drafted" } },
      { order: 2, title: "Also second, authored later", briefRef: "b2b" }
    ]
  };
  assert.deepEqual(firstEpisodeScene(episode), { briefRef: "b2", title: "Second", authoring: { status: "drafted" } }, "a tie keeps authored order");
  assert.equal(firstEpisodeScene({ scenes: [{ title: "No order", briefRef: "b0" }, { order: 1, briefRef: "b1" }] }).briefRef, "b0",
    "a missing order counts as 0, exactly as scene-runner.mjs#advanceAfterClose sorts");
  assert.equal(firstEpisodeScene({ scenes: [{ order: 0, briefRef: "b0" }] }).title, "b0", "an untitled scene is named by its brief");
  for (const none of [null, undefined, {}, { scenes: [] }, { scenes: [{ order: 0 }, null, "x"] }, { scenes: "nope" }]) {
    assert.equal(firstEpisodeScene(none), null, JSON.stringify(none));
  }
});

test("a brief opens in its main room, never a sub-room, then the lowest sort", () => {
  const scenes = [
    { id: id16(1), briefRef: "b", kind: "sub", sort: 100 },
    { id: id16(2), briefRef: "b", kind: "beat", sort: 300 },
    { id: id16(3), briefRef: "b", kind: "beat", sort: 200 },
    { id: id16(4), briefRef: "other", kind: "beat", sort: 0 },
    { id: "not-an-id", briefRef: "b", kind: "beat", sort: 0 }
  ];
  assert.equal(openingSceneFor("b", scenes).id, id16(3));
  assert.equal(openingSceneFor("b", scenes.filter((s) => s.kind === "sub")).id, id16(1), "a brief built only as a sub-room still opens there");
  assert.equal(openingSceneFor("missing", scenes), null);
  assert.equal(openingSceneFor("", scenes), null);
  assert.equal(openingSceneFor("b", undefined), null);
});

test("every real episode opens on a scene the scene set actually builds, as a main room", () => {
  assert.ok(realEpisodes.length >= 2, "expected the episodes in data/episodes/");
  for (const episode of realEpisodes) {
    const first = firstEpisodeScene(episode);
    assert.ok(first, `${episode.id} has no scene with a brief, so its titles would have nowhere to fade`);
    const built = openingSceneFor(first.briefRef, realSceneDescriptors);
    assert.ok(built, `${episode.id}'s first scene (${first.briefRef}) has no entry in data/campaign/scene-set.json, so the titles would fade back to wherever the table is`);
    assert.notEqual(built.kind, "sub", `${episode.id} would open in a sub-room`);
  }
});

/* ---------------------------------------------------------------- */
/*  The episodes the GM can start                                    */
/* ---------------------------------------------------------------- */

test("episodes are offered in play order, Chapter then Episode, compared as numbers", () => {
  assert.deepEqual(episodePlayOrder("episode-c1e2-scheduled-exercise"), [1, 2]);
  assert.deepEqual(episodePlayOrder("episode-c10e1-later"), [10, 1]);
  assert.deepEqual(episodePlayOrder("pilot"), [Infinity, Infinity]);
  const starts = episodeStarts([
    { id: "episode-c10e1-ten", title: "Ten" },
    { id: "episode-c2e1-two", title: "Two" },
    { id: "episode-c1e2-one-b", title: "One B" },
    { id: "zz-special", title: "Special" },
    { id: "episode-c1e1-one-a", title: "One A" }
  ]);
  assert.deepEqual(starts.map((s) => s.title), ["One A", "One B", "Two", "Ten", "Special"]);
});

test("each episode start says what it opens on, and anything unusable is left out", () => {
  const scenes = [
    { id: id16(1), briefRef: "e1-first", kind: "landing", sort: 0, active: true },
    { id: id16(2), briefRef: "e2-first", kind: "beat", sort: 100, active: false }
  ];
  const starts = episodeStarts(
    [
      { id: "episode-c1e1-a", title: "  A Title ", scenes: [{ order: 0, title: "First", briefRef: "e1-first", authoring: { status: "drafted" } }] },
      { id: "episode-c1e2-b", scenes: [{ order: 1, title: "Opens", briefRef: "e2-first", authoring: { status: "live" } }] },
      { id: "episode-c1e3-c", title: "Unbuilt", scenes: [{ order: 1, title: "Nowhere", briefRef: "not-built" }] },
      { id: "episode-c1e4-d", title: "Empty", scenes: [] },
      { id: "episode-c1e1-a", title: "Duplicate" },
      { id: "../bad", title: "Bad" },
      null,
      "nope"
    ],
    scenes
  );
  assert.deepEqual(starts, [
    { episodeId: "episode-c1e1-a", title: "A Title", briefRef: "e1-first", sceneTitle: "First", sceneId: id16(1), sceneActive: true, status: "drafted" },
    { episodeId: "episode-c1e2-b", title: "episode-c1e2-b", briefRef: "e2-first", sceneTitle: "Opens", sceneId: id16(2), sceneActive: false, status: null },
    { episodeId: "episode-c1e3-c", title: "Unbuilt", briefRef: "not-built", sceneTitle: "Nowhere", sceneId: null, sceneActive: false, status: null },
    { episodeId: "episode-c1e4-d", title: "Empty", briefRef: null, sceneTitle: null, sceneId: null, sceneActive: false, status: null }
  ]);
  assert.deepEqual(episodeStarts(undefined, undefined), []);
});

test("a scene's status is worth a line only while it is not cleared: the Desk's grades or the Sign-Off's seal clear it", () => {
  for (const cleared of ["sound", "final", "live"]) assert.equal(unclearedStatus({ status: cleared }), null, cleared);
  assert.equal(unclearedStatus({ status: "drafted" }), "drafted");
  assert.equal(unclearedStatus({ status: "needs-lore" }), "needs-lore");
  for (const untracked of [null, undefined, {}, { status: "" }]) assert.equal(unclearedStatus(untracked), null, JSON.stringify(untracked));
});

test("the window starts on the Scene Runner's own episode, else the first in play order, else the opening alone", () => {
  const starts = episodeStarts([{ id: "episode-c1e2-b" }, { id: "episode-c1e1-a" }]);
  assert.equal(defaultStartId(starts, "episode-c1e2-b"), "episode-c1e2-b");
  assert.equal(defaultStartId(starts, ""), "episode-c1e1-a");
  assert.equal(defaultStartId(starts, "episode-c9e9-gone"), "episode-c1e1-a", "a runner episode that no longer exists is not offered");
  assert.equal(defaultStartId([], "episode-c1e1-a"), "");
  assert.equal(defaultStartId(undefined), "");
});

test("the real campaign offers Episode One first, fading into From Up Here", () => {
  const starts = episodeStarts(realEpisodes, realSceneDescriptors);
  assert.equal(starts[0].episodeId, "episode-c1e1-mothers-maiden-name");
  assert.equal(starts[0].title, "Mother's Maiden Name (Again)");
  assert.equal(starts[0].briefRef, "episode-c1e1--from-up-here");
  assert.equal(starts[0].sceneTitle, "From Up Here");
  assert.ok(starts[0].sceneId, "and it is built");
  assert.equal(defaultStartId(starts, ""), "episode-c1e1-mothers-maiden-name");
});

test("a title card counts as missing only when the server says so, for a real episode id", () => {
  const checks = [
    { episodeId: "episode-c1e1-a", path: "p1", status: 404 },
    { episodeId: "episode-c1e2-b", path: "p2", status: 200 },
    { episodeId: "episode-c1e3-c", path: "p3", status: 410 },
    { episodeId: "episode-c1e4-d", path: "p4", status: null },
    { episodeId: "episode-c1e5-e", path: "p5", status: 500 },
    { episodeId: "../bad", path: "p6", status: 404 },
    null
  ];
  assert.deepEqual(missingTitleCards(checks), ["episode-c1e1-a", "episode-c1e3-c"]);
  assert.deepEqual(missingTitleCards(undefined), []);
});

/* ---------------------------------------------------------------- */
/*  The "Then" choice in the confirm window                          */
/* ---------------------------------------------------------------- */

const sample = [
  { episodeId: "episode-c1e1-a", title: "A", briefRef: "a1", sceneTitle: "Here Already", sceneId: id16(1), sceneActive: true, status: "drafted" },
  { episodeId: "episode-c1e2-b", title: "B", briefRef: "b1", sceneTitle: "Somewhere", sceneId: id16(2), sceneActive: false, status: "drafted" },
  { episodeId: "episode-c1e3-c", title: "C", briefRef: "c1", sceneTitle: "Unbuilt", sceneId: null, sceneActive: false, status: null },
  { episodeId: "episode-c1e4-d", title: "D", briefRef: null, sceneTitle: null, sceneId: null, sceneActive: false, status: null },
  { episodeId: "episode-c1e5-e", title: "E", briefRef: "e1", sceneTitle: "Cleared", sceneId: id16(5), sceneActive: false, status: null }
];

test("one option per episode, then 'nothing', and exactly one is selected", () => {
  const context = startChoiceContext({ starts: sample, selectedId: "episode-c1e2-b", folder: DEFAULT_VIDEO_FOLDER });
  assert.deepEqual(context.options.map((o) => o.value), ["episode-c1e1-a", "episode-c1e2-b", "episode-c1e3-c", "episode-c1e4-d", "episode-c1e5-e", ""]);
  assert.deepEqual(context.options.filter((o) => o.selected).map((o) => o.value), ["episode-c1e2-b"]);
  assert.equal(context.label, START_KEYS.label);
  assert.equal(context.detail, context.options[1].detail, "the sentence shown is the selected option's");

  for (const selectedId of ["", "episode-c9e9-gone", undefined]) {
    const none = startChoiceContext({ starts: sample, selectedId, folder: DEFAULT_VIDEO_FOLDER });
    assert.deepEqual(none.options.filter((o) => o.selected).map((o) => o.value), [""], `${JSON.stringify(selectedId)} selects "nothing"`);
    assert.equal(none.detail, START_KEYS.detailNothing);
  }
  assert.deepEqual(startChoiceContext().options.map((o) => [o.value, o.selected]), [["", true]], "no episodes at all: the opening alone");
});

test("each option's sentence says what the table will see, including anything missing on the way", () => {
  const context = startChoiceContext({ starts: sample, selectedId: "", missingTitles: ["episode-c1e2-b"], folder: DEFAULT_VIDEO_FOLDER });
  const byValue = Object.fromEntries(context.options.map((o) => [o.value, o]));
  // Already on the first scene: it fades back into it, and a scene nobody is being moved to needs no status line.
  assert.equal(byValue["episode-c1e1-a"].detail, START_KEYS.detailHere);
  assert.equal(byValue["episode-c1e1-a"].label, START_KEYS.option);
  // Moving the table to a drafted scene says so, and a missing card says which file.
  assert.equal(byValue["episode-c1e2-b"].detail, [START_KEYS.detail, START_KEYS.sceneStatus, START_KEYS.titleMissing].join(" "));
  // Not built yet: it fades back to where everyone is, and says why.
  assert.equal(byValue["episode-c1e3-c"].detail, [START_KEYS.detailNoScene, START_KEYS.sceneNotBuilt].join(" "));
  assert.equal(byValue["episode-c1e4-d"].detail, [START_KEYS.detailNoScene, START_KEYS.noScenes].join(" "));
  assert.equal(byValue["episode-c1e4-d"].label, START_KEYS.optionNoScene);
  assert.equal(byValue["episode-c1e5-e"].detail, START_KEYS.detail, "a cleared scene, a card on the server: nothing to add");
  assert.equal(byValue[""].label, START_KEYS.optionNothing);
});

test("every key the choice uses is real, and every placeholder in its sentences is filled", () => {
  for (const [name, key] of Object.entries(START_KEYS)) assert.equal(typeof resolveKey(key), "string", `${name}: ${key} is not a string in lang/en.json`);
  const context = startChoiceContext({ starts: sample, selectedId: "episode-c1e2-b", missingTitles: sample.map((s) => s.episodeId), folder: DEFAULT_VIDEO_FOLDER, format: realFormat });
  for (const option of context.options) {
    assert.doesNotMatch(option.label, /\{\w+\}/, `a placeholder left in "${option.label}"`);
    assert.doesNotMatch(option.detail, /\{\w+\}/, `a placeholder left in "${option.detail}"`);
    assert.doesNotMatch(option.detail, /BLANKINHERITANCE\./, "a raw key on screen");
  }
  const b = context.options.find((o) => o.value === "episode-c1e2-b");
  assert.equal(b.label, "B: its title card, then Somewhere");
  assert.match(b.detail, /title card for B, then fades into Somewhere/);
  assert.match(b.detail, /Somewhere is still marked “drafted”/);
  assert.match(b.detail, /blank-inheritance-video\/episode-titles\/episode-c1e2-b\.mp4/, "the missing card is named by its real path");
});

test("the real Episode One reads plainly in the window", () => {
  const starts = episodeStarts(realEpisodes, realSceneDescriptors);
  const context = startChoiceContext({ starts, selectedId: "episode-c1e1-mothers-maiden-name", folder: DEFAULT_VIDEO_FOLDER, format: realFormat });
  const one = context.options.find((o) => o.selected);
  assert.equal(one.label, "Mother's Maiden Name (Again): its title card, then From Up Here");
  assert.match(one.detail, /^After the opening, every screen shows the title card for Mother's Maiden Name \(Again\), then fades into From Up Here\./);
});

test("the field is a labelled select named 'episode', each option carrying its own sentence, all of it escaped", () => {
  const tricky = [{ episodeId: "episode-c1e1-a", title: `"Quoted" <b>bold</b> & 'single'`, briefRef: "a1", sceneTitle: "S", sceneId: id16(1), sceneActive: false, status: null }];
  const context = startChoiceContext({ starts: tricky, selectedId: "episode-c1e1-a", folder: DEFAULT_VIDEO_FOLDER, format: realFormat });
  const html = startChoiceHtml(context);
  assert.match(html, new RegExp(`<label for="${START_FIELD_ID}">Then</label>`));
  assert.match(html, new RegExp(`<select name="episode" id="${START_FIELD_ID}">`));
  assert.equal((html.match(/<option /g) ?? []).length, 2);
  assert.equal((html.match(/ selected>/g) ?? []).length, 1);
  assert.match(html, /<option value="episode-c1e1-a" data-detail="[^"]*" selected>/);
  assert.match(html, /<option value="" data-detail="[^"]*">Nothing more: stay on this scene<\/option>/);
  assert.doesNotMatch(html, /<b>|"Quoted"|'single'/, "a title can never break out of its attribute or add markup");
  assert.match(html, /&quot;Quoted&quot; &lt;b&gt;bold&lt;\/b&gt; &amp; &#39;single&#39;/);
  assert.match(html, /<p class="bi-opening-confirm__detail">After the opening/);
  assert.equal(escapeMarkup(null), "");
});
