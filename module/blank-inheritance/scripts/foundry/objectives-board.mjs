/**
 * The GM's objectives board — gathering what core/objectives-board.mjs needs, for the Console's Objectives tab.
 *
 * The given objectives come from the Objectives journal; the chips from the Runner's current episode's scene briefs
 * (fetched once and cached, like the Runner's own); the authored files for every objective a chip names. GM only: the
 * authored files include hidden parts and the giver's real want, and only the GM's screen shows them.
 */

import { boardModel, chipIndex } from "../core/objectives-board.mjs";
import { currentMoment } from "./campaign-state.mjs";
import { fetchModuleJson } from "./io.mjs";
import { loadAuthored, objectiveStates } from "./objectives-store.mjs";

const MODULE_ID = "blank-inheritance";
const cache = new Map();

async function json(path) {
  if (cache.has(path)) return cache.get(path);
  const doc = await fetchModuleJson(path).catch(() => null);
  cache.set(path, doc);
  return doc;
}

const setting = (key) => {
  try {
    return game.settings.get(MODULE_ID, key) || "";
  } catch {
    return "";
  }
};

/** The episode's scenes as `{ id, title, order, brief }`, in play order. */
async function episodeBriefs(episodeId) {
  const episode = episodeId ? await json(`data/campaign/episodes/${episodeId}.json`) : null;
  const scenes = (episode?.scenes ?? []).filter((s) => s.briefRef);
  const briefs = await Promise.all(scenes.map((s) => json(`data/campaign/scene-briefs/${s.briefRef}.json`)));
  return scenes.map((s, i) => ({ id: s.briefRef, title: s.title, order: s.order ?? i, brief: briefs[i] })).filter((b) => b.brief);
}

/** Everything the board draws, for the GM. */
export async function objectivesBoardData() {
  const states = objectiveStates();
  const briefs = await episodeBriefs(setting("runnerEpisode"));
  const chips = chipIndex(briefs);
  const ids = [...new Set([...chips.map((c) => c.objectiveRef), ...states.filter((s) => s.source === "story").map((s) => s.id)])];
  const authored = Object.fromEntries((await Promise.all(ids.map(async (id) => [id, await loadAuthored(id)]))).filter(([, doc]) => doc));
  const model = boardModel({ states, authored, chips, currentSceneRef: setting("runnerBrief") || null, moment: currentMoment() });
  const scene = briefs.find((b) => b.id === setting("runnerBrief"));
  return { ...model, scene: scene?.title ?? null, hasEpisode: briefs.length > 0 };
}

/** Drop cached briefs after a deploy, alongside the Runner's own cache. */
export function resetObjectivesBoardCache() {
  cache.clear();
}
