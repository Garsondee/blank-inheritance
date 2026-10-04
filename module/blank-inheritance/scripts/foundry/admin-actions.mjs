/**
 * The admin panel's hands: reset, snapshot and undo, the test party, the
 * clock, a jump to any scene, and the City. core/admin.mjs decides what each
 * of these means; this file only reads and writes Foundry. GM only, every
 * export -- each checks for itself rather than trusting the button.
 *
 * WHAT A RESET NEVER TOUCHES, whatever is ticked: Ingram's scene edits (the
 * scene-edit records in storage/, and every scene brief), authored content
 * (NPCs, locations, the Social Intel vault's facts, the scene set itself),
 * the session log's files, and any document a GM made by hand. Handouts
 * already given out are taken back rather than deleted, so an edit Ingram
 * made to one in Foundry survives (core/foundry-edits.mjs); showing the
 * handout again gives it back.
 *
 * A reset writes a snapshot to storage/ FIRST and refuses to go on if that
 * write fails. "Undo the last reset" puts back everything the snapshot holds.
 */

import {
  RESET_SETTINGS,
  SNAPSHOT_KIND,
  SNAPSHOT_VERSION,
  START_EPISODE_ID,
  episodeStart,
  normalizeResetOptions,
  resetPlan,
  resetValues,
  snapshotFilename,
  snapshotProblems,
  testPartyPlan
} from "../core/admin.mjs";
import { normalizeMoment } from "../core/day-ring.mjs";
import { restoredOwnership } from "../core/ownership.mjs";
import { fetchModuleJson, writeStorageJson } from "./io.mjs";
import { ensureDowntimeVault, setMoment } from "./campaign-state.mjs";
import { cancelCityDeparture, openCityDeparture, sceneForBrief } from "./city-state.mjs";
import { ensureStageVault } from "./stage.mjs";
import { notebookEntry } from "./notebook-store.mjs";
import { clearObjectives, restoreObjectives, snapshotObjectives } from "./objectives-store.mjs";
import { stopAllAudio } from "./audio-director.mjs";
import { landingSceneId } from "./landing-scene.mjs";
import { recordLogEntry } from "./session-log.mjs";
import { refreshSceneRunner, resetSceneRunnerCache, setRunnerEpisode } from "./scene-runner.mjs";
import { cueScene } from "./director-panel.mjs";

const MODULE_ID = "blank-inheritance";
const SOCKET = `module.${MODULE_ID}`;
export const SETTING_SNAPSHOT = "adminSnapshot";
export const SETTING_TEST_PARTY = "adminTestParty";
const EPISODE_IDS = Object.freeze(["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"]);

export function registerAdminSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_SNAPSHOT, { scope: "world", config: false, type: Object, default: {}, onChange });
  game.settings.register(MODULE_ID, SETTING_TEST_PARTY, { scope: "world", config: false, type: Object, default: {}, onChange });
}

const isGM = () => Boolean(game.user?.isGM);
const dataPath = (dir, id) => `data/campaign/${dir}/${id}.json`;
const flag = (doc, key) => doc?.getFlag?.(MODULE_ID, key);

/* ------------------------------------------------------------------ */
/*  What the world is made of, as a reset sees it                      */
/* ------------------------------------------------------------------ */

/** Scenes the campaign's scene set built (they carry a `kind`); demo and hand-made scenes are left alone. */
const campaignScenes = () => game.scenes.filter((s) => typeof flag(s, "kind") === "string");
const pawnTokens = () => game.scenes.contents.flatMap((scene) => scene.tokens.filter((t) => flag(t, "pawn")).map((t) => ({ scene, token: t })));
const handoutEntries = () => game.journal.filter((j) => flag(j, "handout"));
const inductionActors = () => game.actors.filter((a) => flag(a, "intake"));

export async function loadEpisode(id) {
  return fetchModuleJson(dataPath("episodes", id), { fresh: true });
}

export async function loadEpisodes() {
  const out = [];
  for (const id of EPISODE_IDS) {
    try {
      out.push(await loadEpisode(id));
    } catch (err) {
      console.warn(`Blank Inheritance | Admin could not read episode ${id}:`, err);
    }
  }
  return out;
}

export async function startOfAdventure() {
  return episodeStart(await loadEpisode(START_EPISODE_ID));
}

/* ------------------------------------------------------------------ */
/*  The snapshot                                                       */
/* ------------------------------------------------------------------ */

async function takeSnapshot(options) {
  const downtime = await ensureDowntimeVault();
  const stageVault = await ensureStageVault();
  const hubLike = game.scenes.contents;
  return {
    kind: SNAPSHOT_KIND,
    version: SNAPSHOT_VERSION,
    takenAt: new Date().toISOString(),
    takenBy: game.user.name,
    options,
    settings: Object.fromEntries(RESET_SETTINGS.map((key) => [key, foundry.utils.deepClone(game.settings.get(MODULE_ID, key))])),
    downtimePrivate: foundry.utils.deepClone(flag(downtime, "private") ?? []),
    cityPrivate: foundry.utils.deepClone(flag(downtime, "cityPrivate") ?? []),
    stageCasts: foundry.utils.deepClone(flag(stageVault, "casts") ?? {}),
    stageNames: foundry.utils.deepClone(flag(stageVault, "names") ?? {}),
    sceneStage: campaignScenes().filter((s) => flag(s, "stage")).map((s) => ({ sceneId: s.id, value: foundry.utils.deepClone(flag(s, "stage")) })),
    journeys: hubLike.filter((s) => flag(s, "activeJourney")).map((s) => ({ sceneId: s.id, value: foundry.utils.deepClone(flag(s, "activeJourney")) })),
    travelTokens: hubLike.flatMap((s) =>
      s.tokens
        .filter((t) => flag(t, "travelDestination") || flag(t, "travelPath"))
        .map((t) => ({ sceneId: s.id, tokenId: t.id, destination: flag(t, "travelDestination") ?? null, path: flag(t, "travelPath") ?? null }))
    ),
    social: game.actors.filter((a) => flag(a, "social")).map((a) => ({ actorId: a.id, value: foundry.utils.deepClone(flag(a, "social")) })),
    papers: handoutEntries().map((j) => ({ entryId: j.id, ownership: foundry.utils.deepClone(j.toObject().ownership) })),
    pawns: pawnTokens().map(({ scene, token }) => ({ sceneId: scene.id, data: token.toObject() })),
    // Every page, whole, so undo can put back exactly what was cleared.
    notebook: options.clearNotebook ? (notebookEntry()?.pages.contents ?? []).map((page) => page.toObject()) : [],
    // Every objective page, whole (design/objectives.md), so undo puts them back with their own ids.
    objectives: options.clearObjectives ? snapshotObjectives() : [],
    chat: options.clearChat ? game.messages.contents.map((m) => m.toObject()) : [],
    actors: options.deleteInductionCharacters
      ? inductionActors().map((a) => ({ data: a.toObject(), userIds: game.users.filter((u) => u.character?.id === a.id).map((u) => u.id) }))
      : [],
    activeSceneId: game.scenes.active?.id ?? null
  };
}

async function saveSnapshot(snapshot) {
  const file = snapshotFilename(snapshot.takenAt);
  await writeStorageJson("", file, snapshot);
  await game.settings.set(MODULE_ID, SETTING_SNAPSHOT, {
    file,
    takenAt: snapshot.takenAt,
    counts: { chat: snapshot.chat.length, actors: snapshot.actors.length, papers: snapshot.papers.length, pawns: snapshot.pawns.length }
  });
  return file;
}

export function lastSnapshot() {
  const stored = game.settings.get(MODULE_ID, SETTING_SNAPSHOT) ?? {};
  return typeof stored.file === "string" ? stored : null;
}

/* ------------------------------------------------------------------ */
/*  Reset                                                              */
/* ------------------------------------------------------------------ */

const OWNERSHIP = () => CONST.DOCUMENT_OWNERSHIP_LEVELS;

/** Every player key on an ownership map, and the default, set to NONE: only a GM can see it. GM keys are kept. */
function revoked(ownership = {}) {
  const out = { ...ownership, default: OWNERSHIP().NONE };
  for (const key of Object.keys(ownership)) {
    if (key !== "default" && !game.users.get(key)?.isGM) out[key] = OWNERSHIP().NONE;
  }
  return out;
}

const STEPS = {
  async city() {
    await cancelCityDeparture();
    const byScene = new Map();
    for (const { scene, token } of pawnTokens()) byScene.set(scene, [...(byScene.get(scene) ?? []), token.id]);
    for (const [scene, ids] of byScene) await scene.deleteEmbeddedDocuments("Token", ids);
  },

  async settings(ctx) {
    await stopAllAudio({ fadeMs: 800 }).catch((err) => console.warn("Blank Inheritance | Admin could not stop the audio:", err));
    const values = resetValues(ctx.start);
    for (const key of RESET_SETTINGS) await game.settings.set(MODULE_ID, key, values[key]);
    resetSceneRunnerCache();
  },

  async downtime() {
    const vault = await ensureDowntimeVault();
    if (vault) await vault.setFlag(MODULE_ID, "private", []);
    // Every connected player forgets their own private bookings too.
    for (const user of game.users) if (!user.isGM) game.socket.emit(SOCKET, { type: "downtime-private", userId: user.id, commitments: [] });
  },

  async papers() {
    for (const entry of handoutEntries()) {
      const ownership = entry.toObject().ownership ?? {};
      await entry.update({ ownership: revoked(ownership) });
    }
  },

  async stage() {
    const vault = await ensureStageVault();
    const casts = flag(vault, "casts") ?? {};
    const scenes = campaignScenes();
    // setFlag merges objects, so a key cannot be removed from the vault by
    // writing it without that key; an empty cast is what "nobody on stage" is.
    const emptied = Object.fromEntries(scenes.filter((s) => casts[s.id]).map((s) => [s.id, []]));
    if (vault && Object.keys(emptied).length) await vault.setFlag(MODULE_ID, "casts", emptied);
    // Which real names the table has been told is campaign knowledge like the
    // cast itself: back to the start means nobody has been introduced yet.
    if (vault && Object.keys(flag(vault, "names") ?? {}).length) await vault.unsetFlag(MODULE_ID, "names");
    for (const scene of scenes) if (flag(scene, "stage")) await scene.unsetFlag(MODULE_ID, "stage");
  },

  async social() {
    for (const actor of game.actors) if (flag(actor, "social")) await actor.unsetFlag(MODULE_ID, "social");
  },

  async travel() {
    for (const scene of game.scenes) {
      if (flag(scene, "activeJourney")) await scene.unsetFlag(MODULE_ID, "activeJourney");
      for (const token of scene.tokens) {
        if (flag(token, "travelDestination")) await token.unsetFlag(MODULE_ID, "travelDestination");
        if (flag(token, "travelPath")) await token.unsetFlag(MODULE_ID, "travelPath");
      }
    }
  },

  /**
   * Empty the party notebook's pages. The notebook entry itself stays (it is
   * the one place every player may write, at OWNER), and the stage brings a
   * person's page back the next time they are revealed.
   */
  async notebook() {
    const entry = notebookEntry();
    const ids = entry?.pages.map((page) => page.id) ?? [];
    if (ids.length) await entry.deleteEmbeddedDocuments("JournalEntryPage", ids);
  },

  /** Clear every objective. The entry stays; the start of Episode One has none given. */
  async objectives() {
    await clearObjectives();
  },

  async chat() {
    await ChatMessage.implementation.deleteDocuments([], { deleteAll: true });
  },

  async combats() {
    if (game.combats.size) await Combat.implementation.deleteDocuments([], { deleteAll: true });
  },

  async induction() {
    const actors = inductionActors();
    for (const user of game.users) if (actors.some((a) => a.id === user.character?.id)) await user.update({ character: null });
    if (actors.length) await Actor.implementation.deleteDocuments(actors.map((a) => a.id));
  },

  async scene(ctx) {
    const target = sceneForBrief(ctx.start.briefId) ?? game.scenes.get(await landingSceneId());
    if (target) await cueScene(target.id);
  },

  async log(ctx) {
    await recordLogEntry({
      text: `Admin: the world was reset to the start of ${ctx.episodeTitle}. Undo is available from the admin panel.`,
      nowIso: new Date().toISOString(),
      scene: game.scenes.active?.name ?? null
    }).catch((err) => console.warn("Blank Inheritance | Admin could not log the reset:", err));
  }
};

/**
 * Reset the world to the start of the adventure. Returns the steps that ran
 * and any that failed; a failed step is reported and the rest still run,
 * except the snapshot, whose failure stops everything before anything changes.
 */
export async function resetToStart(rawOptions = {}, { onStep = () => {} } = {}) {
  if (!isGM()) return { ok: false, reason: "not-gm" };
  const options = normalizeResetOptions(rawOptions);
  const plan = resetPlan(options);
  const episode = await loadEpisode(START_EPISODE_ID);
  const ctx = { options, start: episodeStart(episode), episodeTitle: episode?.title ?? START_EPISODE_ID };

  let file = null;
  try {
    file = await saveSnapshot(await takeSnapshot(options));
  } catch (err) {
    console.error("Blank Inheritance | Admin could not save a snapshot, so nothing was reset:", err);
    return { ok: false, reason: "no-snapshot", error: err.message };
  }

  const done = ["snapshot"];
  const failed = [];
  for (const step of plan.slice(1)) {
    onStep(step.id);
    try {
      await STEPS[step.id](ctx);
      done.push(step.id);
    } catch (err) {
      console.error(`Blank Inheritance | Admin reset step "${step.id}" failed:`, err);
      failed.push({ id: step.id, error: err.message });
    }
  }
  refreshSceneRunner();
  return { ok: failed.length === 0, file, done, failed };
}

/* ------------------------------------------------------------------ */
/*  Undo                                                               */
/* ------------------------------------------------------------------ */

export async function readLastSnapshot() {
  const pointer = lastSnapshot();
  if (!pointer) return null;
  const snapshot = await fetchModuleJson(`storage/${pointer.file}`, { fresh: true });
  const problems = snapshotProblems(snapshot);
  if (problems.length) throw new Error(`The snapshot ${pointer.file} cannot be used: ${problems.join("; ")}`);
  return snapshot;
}

/** Put back everything the last reset's snapshot holds. Ended combats are the one thing it cannot. */
export async function undoLastReset() {
  if (!isGM()) return { ok: false, reason: "not-gm" };
  const snapshot = await readLastSnapshot();
  if (!snapshot) return { ok: false, reason: "no-snapshot" };
  const failed = [];
  const attempt = async (id, fn) => {
    try {
      await fn();
    } catch (err) {
      console.error(`Blank Inheritance | Admin undo "${id}" failed:`, err);
      failed.push({ id, error: err.message });
    }
  };

  await attempt("settings", async () => {
    for (const [key, value] of Object.entries(snapshot.settings)) await game.settings.set(MODULE_ID, key, value);
    resetSceneRunnerCache();
  });
  await attempt("vaults", async () => {
    const downtime = await ensureDowntimeVault();
    await downtime?.setFlag(MODULE_ID, "private", snapshot.downtimePrivate ?? []);
    await downtime?.setFlag(MODULE_ID, "cityPrivate", snapshot.cityPrivate ?? []);
    const stageVault = await ensureStageVault();
    if (snapshot.stageCasts && Object.keys(snapshot.stageCasts).length) await stageVault?.setFlag(MODULE_ID, "casts", snapshot.stageCasts);
    if (snapshot.stageNames && Object.keys(snapshot.stageNames).length) await stageVault?.setFlag(MODULE_ID, "names", snapshot.stageNames);
  });
  await attempt("flags", async () => {
    for (const { sceneId, value } of snapshot.sceneStage ?? []) await game.scenes.get(sceneId)?.setFlag(MODULE_ID, "stage", value);
    for (const { sceneId, value } of snapshot.journeys ?? []) await game.scenes.get(sceneId)?.setFlag(MODULE_ID, "activeJourney", value);
    for (const { sceneId, tokenId, destination, path } of snapshot.travelTokens ?? []) {
      const token = game.scenes.get(sceneId)?.tokens.get(tokenId);
      if (destination) await token?.setFlag(MODULE_ID, "travelDestination", destination);
      if (path) await token?.setFlag(MODULE_ID, "travelPath", path);
    }
    for (const { actorId, value } of snapshot.social ?? []) await game.actors.get(actorId)?.setFlag(MODULE_ID, "social", value);
  });
  await attempt("papers", async () => {
    for (const { entryId, ownership } of snapshot.papers ?? []) await game.journal.get(entryId)?.update({ ownership });
  });
  await attempt("pawns", async () => {
    const byScene = new Map();
    for (const { sceneId, data } of snapshot.pawns ?? []) {
      const scene = game.scenes.get(sceneId);
      if (!scene || scene.tokens.get(data._id)) continue;
      byScene.set(scene, [...(byScene.get(scene) ?? []), data]);
    }
    for (const [scene, docs] of byScene) await scene.createEmbeddedDocuments("Token", docs, { keepId: true });
  });
  await attempt("actors", async () => {
    const missing = (snapshot.actors ?? []).filter(({ data }) => !game.actors.get(data._id));
    if (missing.length) await Actor.implementation.createDocuments(missing.map((a) => a.data), { keepId: true });
    for (const { data, userIds } of snapshot.actors ?? []) {
      for (const userId of userIds ?? []) await game.users.get(userId)?.update({ character: data._id });
    }
  });
  await attempt("notebook", async () => {
    const entry = notebookEntry();
    const missing = (snapshot.notebook ?? []).filter((data) => !entry?.pages.has(data._id));
    if (entry && missing.length) await entry.createEmbeddedDocuments("JournalEntryPage", missing, { keepId: true });
  });
  await attempt("objectives", async () => {
    await restoreObjectives(snapshot.objectives ?? []);
  });
  await attempt("chat", async () => {
    const missing = (snapshot.chat ?? []).filter((m) => !game.messages.get(m._id));
    if (missing.length) await ChatMessage.implementation.createDocuments(missing, { keepId: true });
  });
  await attempt("scene", async () => {
    const scene = snapshot.activeSceneId ? game.scenes.get(snapshot.activeSceneId) : null;
    if (scene && !scene.active) await cueScene(scene.id);
  });
  await attempt("log", () =>
    recordLogEntry({ text: `Admin: undid the reset taken at ${snapshot.takenAt}.`, nowIso: new Date().toISOString(), scene: game.scenes.active?.name ?? null })
  );
  await game.settings.set(MODULE_ID, SETTING_SNAPSHOT, { ...lastSnapshot(), undoneAt: new Date().toISOString() });
  refreshSceneRunner();
  return { ok: failed.length === 0, failed };
}

/* ------------------------------------------------------------------ */
/*  The test party                                                     */
/* ------------------------------------------------------------------ */

export function testPartyRecord() {
  const stored = game.settings.get(MODULE_ID, SETTING_TEST_PARTY);
  return stored && typeof stored === "object" ? stored : {};
}

/** Lend a character to every player account without one, so a GM alone has a roster. */
export async function lendTestParty() {
  if (!isGM()) return [];
  const plan = testPartyPlan({
    users: game.users.map((u) => ({ id: u.id, isGM: u.isGM, characterId: u.character?.id ?? null })),
    actors: game.actors.map((a) => ({ id: a.id, name: a.name, type: a.type, assignedTo: game.users.find((u) => u.character?.id === a.id)?.id ?? null }))
  });
  const record = { ...testPartyRecord() };
  for (const { userId, actorId } of plan) {
    const actor = game.actors.get(actorId);
    const user = game.users.get(userId);
    if (!actor || !user) continue;
    const previousLevel = actor.toObject().ownership?.[userId] ?? null;
    await actor.update({ [`ownership.${userId}`]: OWNERSHIP().OWNER });
    await user.update({ character: actorId });
    record[userId] = { actorId, previousLevel };
  }
  await game.settings.set(MODULE_ID, SETTING_TEST_PARTY, record);
  return plan;
}

/** Take back exactly what lendTestParty lent: the account's character and the ownership it granted. */
export async function returnTestParty() {
  if (!isGM()) return 0;
  const record = testPartyRecord();
  let returned = 0;
  for (const [userId, { actorId, previousLevel }] of Object.entries(record)) {
    const user = game.users.get(userId);
    if (user?.character?.id === actorId) await user.update({ character: null });
    const actor = game.actors.get(actorId);
    // Put back what was there. For a character this account never had, that is
    // NO ENTRY: the key leaves the map. It used to be written as INHERIT, which
    // loops forever behind an unlinked token (core/ownership.mjs) -- so the map
    // is replaced whole, the way Foundry's own ownership dialog saves it.
    if (actor) {
      const ownership = restoredOwnership(actor.toObject().ownership, userId, previousLevel);
      await actor.update({ ownership: foundry.data.operators.ForcedReplacement.create(ownership) });
    }
    returned++;
  }
  await game.settings.set(MODULE_ID, SETTING_TEST_PARTY, {});
  return returned;
}

/* ------------------------------------------------------------------ */
/*  The clock, a jump, the City                                        */
/* ------------------------------------------------------------------ */

/** Set the day ring exactly -- backwards too, which nothing else in the module will do. */
export async function setClock(day, quarter) {
  if (!isGM()) return null;
  return setMoment(normalizeMoment({ day, quarter }));
}

/**
 * Put the table in any scene: the Runner opens on it, its backdrop is cued,
 * and the clock is set to the moment the episode dates it to.
 */
export async function jumpToScene(episodeId, briefId) {
  if (!isGM() || !episodeId || !briefId) return false;
  await setRunnerEpisode(episodeId, briefId);
  const episode = await loadEpisode(episodeId);
  const entry = (episode?.scenes ?? []).find((s) => s.briefRef === briefId);
  if (entry && Number.isInteger(entry.day) && entry.quarter) await setClock(entry.day, entry.quarter);
  const scene = sceneForBrief(briefId);
  if (scene) await cueScene(scene.id);
  refreshSceneRunner();
  return Boolean(scene);
}

/** Every departure authored on a scene brief in the two episodes, with the scene that follows it. */
export async function authoredDepartures() {
  const out = [];
  for (const episode of await loadEpisodes()) {
    const scenes = [...(episode.scenes ?? [])].filter((s) => s.briefRef).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const [i, scene] of scenes.entries()) {
      let brief = null;
      try {
        brief = await fetchModuleJson(dataPath("scene-briefs", scene.briefRef), { fresh: true });
      } catch {
        continue;
      }
      if (!brief?.outro?.departure) continue;
      out.push({
        briefId: brief.id,
        title: brief.title ?? brief.id,
        kind: brief.outro.departure.kind,
        departure: brief.outro.departure,
        nextBriefRef: scenes[i + 1]?.briefRef ?? null
      });
    }
  }
  return out;
}

export async function openAuthoredDeparture(briefId) {
  if (!isGM()) return null;
  const found = (await authoredDepartures()).find((d) => d.briefId === briefId);
  if (!found) return null;
  return openCityDeparture(found.departure, { sourceBriefId: found.briefId, nextBriefRef: found.nextBriefRef });
}

export async function removeAllPawns() {
  if (!isGM()) return 0;
  const found = pawnTokens();
  const byScene = new Map();
  for (const { scene, token } of found) byScene.set(scene, [...(byScene.get(scene) ?? []), token.id]);
  for (const [scene, ids] of byScene) await scene.deleteEmbeddedDocuments("Token", ids);
  return found.length;
}

/* ------------------------------------------------------------------ */
/*  What the world looks like right now                                */
/* ------------------------------------------------------------------ */

/** A plain picture of every system's state, for the panel and for "Copy as JSON". */
export function collectState() {
  const get = (key) => game.settings.get(MODULE_ID, key);
  const city = get("cityState") ?? {};
  const live = city.departure ?? null;
  // A handout is "given out" while anyone but a GM can see it: a player, or the default, above NONE.
  const isPlayerKey = (key) => key === "default" || (game.users.get(key) && !game.users.get(key).isGM);
  const shared = handoutEntries().filter((j) => Object.entries(j.toObject().ownership ?? {}).some(([key, level]) => isPlayerKey(key) && level > 0));
  return {
    at: new Date().toISOString(),
    moment: get("campaignMoment"),
    runner: { episode: get("runnerEpisode"), brief: get("runnerBrief"), scenesWithTicks: Object.keys(get("runnerRuns") ?? {}).length },
    activeScene: game.scenes.active?.name ?? null,
    city: {
      departure: live ? { kind: live.kind, status: live.status, question: live.question, picks: Object.keys(live.picks ?? {}).length } : null,
      queue: (city.queue ?? []).length,
      pawns: pawnTokens().length
    },
    commitments: (get("commitments") ?? []).length,
    handoutsGivenOut: shared.length,
    equipmentGrants: (get("equipmentGrants") ?? []).length,
    splashed: (get("splashedPortraits") ?? []).length,
    chatMessages: game.messages.size,
    combats: game.combats.size,
    roster: game.users.filter((u) => !u.isGM).map((u) => ({ name: u.name, character: u.character?.name ?? null, online: u.active })),
    testParty: Object.keys(testPartyRecord()).length,
    lastSnapshot: lastSnapshot()
  };
}
