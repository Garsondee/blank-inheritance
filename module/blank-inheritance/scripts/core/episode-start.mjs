/**
 * Starting an episode with the opening titles — the pure half of the GM's
 * choice (foundry/opening-titles.mjs is the adapter; core/opening-titles.mjs
 * is what every screen then does with the press).
 *
 * Ingram, 2026-09-26: "So when we start a session we watch the intro video,
 * then we cut to the episode title, then we fade into the first scene
 * automatically."
 *
 * So the GM's confirm window, the one that already asks before the titles
 * play (ux-doctrine Law 17), also asks what follows them:
 *
 *   an EPISODE   its title card, then its first scene. Offered first is the
 *                episode the Scene Runner already has open (its world
 *                setting `runnerEpisode`: the module's one existing notion
 *                of "the current episode"); with none open, the first
 *                episode in play order. Starting one also points the runner
 *                at it, so the next scene it advances to is that episode's.
 *   NOTHING      the opening alone, and nobody is moved. The way to replay
 *                the titles mid-session without changing scene.
 *
 * "The first scene" is the episode's own running order (data/episodes/,
 * `scenes[]`, lowest `order` with a scene brief), the same order the Scene
 * Runner advances through; its Foundry scene is the one foundry/scene-build.mjs
 * stamped with that brief's `briefRef` flag, the main room before any sub-room.
 *
 * No Foundry, no DOM.
 */

import { PROMOTABLE_STATUSES, SEALABLE_STATUSES } from "./promote.mjs";
import { episodeTitlePath, isEpisodeId, isMissingStatus, isSceneId } from "./opening-titles.mjs";

const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const numberOr = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/* ---------------------------------------------------------------------- */
/*  The episode's first scene                                              */
/* ---------------------------------------------------------------------- */

/**
 * The first entry of an episode's running order: its `scenes[]` that name a
 * scene brief, by `order` (a missing order counts as 0, exactly as the Scene
 * Runner's own advance does), ties kept in authored order. Null when the
 * episode has no scenes yet.
 */
export function firstEpisodeScene(episode) {
  const scenes = (Array.isArray(episode?.scenes) ? episode.scenes : [])
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => scene && text(scene.briefRef));
  if (!scenes.length) return null;
  scenes.sort((a, b) => numberOr(a.scene.order, 0) - numberOr(b.scene.order, 0) || a.index - b.index);
  const first = scenes[0].scene;
  return { briefRef: text(first.briefRef), title: text(first.title) ?? text(first.briefRef), authoring: first.authoring ?? null };
}

/**
 * The Foundry scene a brief opens in, out of the world's scenes described as
 * plain `{ id, briefRef, kind, sort, active }`. A brief can own several (a
 * main room and its sub-rooms, scene-set.json's `kind: "sub"`); the main room
 * is where it opens, then the lowest `sort`. Null when none is built yet.
 */
export function openingSceneFor(briefRef, scenes = []) {
  if (!text(briefRef)) return null;
  const candidates = (Array.isArray(scenes) ? scenes : []).filter((s) => s && s.briefRef === briefRef && isSceneId(s.id));
  if (!candidates.length) return null;
  const rank = (s) => (s.kind === "sub" ? 1 : 0);
  return [...candidates].sort((a, b) => rank(a) - rank(b) || numberOr(a.sort, 0) - numberOr(b.sort, 0) || a.id.localeCompare(b.id))[0];
}

/* ---------------------------------------------------------------------- */
/*  The episodes the GM can start                                          */
/* ---------------------------------------------------------------------- */

const PLAY_ORDER = /^episode-c(\d+)e(\d+)(?:-|$)/;

/**
 * Where an episode falls in the campaign, from its id: Chapter, then Episode
 * ("episode-c1e2-..." is Chapter 1's second). Compared as numbers, so Chapter
 * 10 comes after Chapter 2. An id without that shape sorts last.
 */
export function episodePlayOrder(episodeId) {
  const match = PLAY_ORDER.exec(String(episodeId ?? ""));
  return match ? [Number(match[1]), Number(match[2])] : [Infinity, Infinity];
}

function byPlayOrder(a, b) {
  const [ac, ae] = episodePlayOrder(a.episodeId);
  const [bc, be] = episodePlayOrder(b.episodeId);
  if (ac !== bc) return ac < bc ? -1 : 1;
  if (ae !== be) return ae < be ? -1 : 1;
  return a.episodeId.localeCompare(b.episodeId);
}

/**
 * A scene's authoring status worth a line in the confirm window, or null.
 * Cleared means the Desk's grades (sound, final) or the Sign-Off's seal
 * (live, the rung a scene is actually cleared on: design/scene-signoff.md).
 * A scene with no authoring block at all is not tracked, so it says nothing.
 */
export function unclearedStatus(authoring) {
  const status = text(authoring?.status);
  if (!status) return null;
  return [...PROMOTABLE_STATUSES, ...SEALABLE_STATUSES].includes(status) ? null : status;
}

/**
 * Every episode the GM could start, in play order, each with the scene it
 * opens on. `episodes` are the episode files as loaded (anything without a
 * usable id is dropped, and a repeated id counts once); `scenes` are the
 * world's scenes as plain descriptors (see openingSceneFor).
 */
export function episodeStarts(episodes = [], scenes = []) {
  const seen = new Set();
  const starts = [];
  for (const episode of Array.isArray(episodes) ? episodes : []) {
    const episodeId = episode?.id;
    if (!isEpisodeId(episodeId) || seen.has(episodeId)) continue;
    seen.add(episodeId);
    const first = firstEpisodeScene(episode);
    const built = first ? openingSceneFor(first.briefRef, scenes) : null;
    starts.push({
      episodeId,
      title: text(episode.title) ?? episodeId,
      briefRef: first?.briefRef ?? null,
      sceneTitle: first?.title ?? null,
      sceneId: built?.id ?? null,
      sceneActive: built?.active === true,
      status: unclearedStatus(first?.authoring)
    });
  }
  return starts.sort(byPlayOrder);
}

/**
 * Which option the confirm window starts on: the episode the Scene Runner has
 * open, if it is one of these; otherwise the first in play order; with no
 * episodes at all, "" (the opening alone).
 */
export function defaultStartId(starts = [], currentEpisodeId = "") {
  const list = Array.isArray(starts) ? starts : [];
  if (currentEpisodeId && list.some((s) => s.episodeId === currentEpisodeId)) return currentEpisodeId;
  return list[0]?.episodeId ?? "";
}

/**
 * Which episodes' title cards the server says are not there. `checks` are
 * `{ episodeId, path, status }` from a HEAD request each; the same rule as the
 * opening's own check (core/opening-titles.mjs#isMissingStatus): only a
 * definite 404 or 410 counts, never a check that could not be made.
 */
export function missingTitleCards(checks = []) {
  return (Array.isArray(checks) ? checks : [])
    .filter((c) => c && isEpisodeId(c.episodeId) && isMissingStatus(c.status))
    .map((c) => c.episodeId);
}

/* ---------------------------------------------------------------------- */
/*  The "Then" choice in the GM's confirm window                           */
/* ---------------------------------------------------------------------- */

/** Written out in full, so test/tier0-architecture's key lint checks every one. */
export const START_KEYS = Object.freeze({
  label: "BLANKINHERITANCE.OpeningTitles.Confirm.Then",
  option: "BLANKINHERITANCE.OpeningTitles.Confirm.ThenEpisode",
  optionNoScene: "BLANKINHERITANCE.OpeningTitles.Confirm.ThenEpisodeOnly",
  optionNothing: "BLANKINHERITANCE.OpeningTitles.Confirm.ThenNothing",
  detail: "BLANKINHERITANCE.OpeningTitles.Confirm.DetailEpisode",
  detailHere: "BLANKINHERITANCE.OpeningTitles.Confirm.DetailEpisodeHere",
  detailNoScene: "BLANKINHERITANCE.OpeningTitles.Confirm.DetailEpisodeNoScene",
  detailNothing: "BLANKINHERITANCE.OpeningTitles.Confirm.DetailNothing",
  titleMissing: "BLANKINHERITANCE.OpeningTitles.Confirm.TitleMissing",
  sceneNotBuilt: "BLANKINHERITANCE.OpeningTitles.Confirm.SceneNotBuilt",
  noScenes: "BLANKINHERITANCE.OpeningTitles.Confirm.NoScenes",
  sceneStatus: "BLANKINHERITANCE.OpeningTitles.Confirm.SceneStatus"
});

/**
 * The choice as the window shows it: one option per episode, then "nothing",
 * each with the sentence that says exactly what the table will see after the
 * opening, including anything missing on the way. `format(key, data)` is
 * Foundry's game.i18n.format in the adapter; the default returns the key, so
 * tests can read which sentence was picked.
 *
 * Exactly one option is selected: the one asked for, or "nothing" when that
 * is not among them.
 */
export function startChoiceContext({ starts = [], selectedId = "", missingTitles = [], folder, format = (key) => key } = {}) {
  const missing = new Set(Array.isArray(missingTitles) ? missingTitles : []);
  const options = (Array.isArray(starts) ? starts : []).map((start) => {
    const scene = start.sceneTitle;
    const data = { title: start.title, scene };
    const notes = [];
    let detailKey = START_KEYS.detail;
    if (!start.sceneId) {
      detailKey = START_KEYS.detailNoScene;
      notes.push(scene ? format(START_KEYS.sceneNotBuilt, data) : format(START_KEYS.noScenes, data));
    } else if (start.sceneActive) {
      detailKey = START_KEYS.detailHere;
    } else if (start.status) {
      notes.push(format(START_KEYS.sceneStatus, { ...data, status: start.status }));
    }
    if (missing.has(start.episodeId)) notes.push(format(START_KEYS.titleMissing, { ...data, path: episodeTitlePath(folder, start.episodeId) }));
    return {
      value: start.episodeId,
      label: format(scene ? START_KEYS.option : START_KEYS.optionNoScene, data),
      detail: [format(detailKey, data), ...notes].join(" "),
      selected: start.episodeId === selectedId
    };
  });
  options.push({
    value: "",
    label: format(START_KEYS.optionNothing, {}),
    detail: format(START_KEYS.detailNothing, {}),
    selected: false
  });
  if (!options.some((o) => o.selected)) options[options.length - 1].selected = true;
  const chosen = options.find((o) => o.selected);
  return { label: format(START_KEYS.label, {}), options, detail: chosen.detail };
}

/** Text and attribute values, escaped for markup (quotes included: every value here sits in an attribute somewhere). */
export function escapeMarkup(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The field's id in the confirm window (one window at a time, so one id). */
export const START_FIELD_ID = "bi-opening-confirm-then";

/**
 * The field's markup: a labelled <select name="episode"> whose options each
 * carry their own sentence in `data-detail`, and the sentence for the one
 * selected, which the adapter swaps as the choice changes. Only elements and
 * attributes Foundry's DialogV2 keeps through its own cleanHTML (label, select,
 * option, data-*, class, id; pinned by test/tier3-episode-start-contract).
 */
export function startChoiceHtml(context) {
  const esc = escapeMarkup;
  const options = (context?.options ?? [])
    .map((o) => `<option value="${esc(o.value)}" data-detail="${esc(o.detail)}"${o.selected ? " selected" : ""}>${esc(o.label)}</option>`)
    .join("");
  return (
    `<div class="form-group bi-opening-confirm__then">`
    + `<label for="${START_FIELD_ID}">${esc(context?.label)}</label>`
    + `<div class="form-fields"><select name="episode" id="${START_FIELD_ID}">${options}</select></div>`
    + `</div>`
    + `<p class="bi-opening-confirm__detail">${esc(context?.detail)}</p>`
  );
}
