/**
 * Keeping the world in step with the content on the server -- the half that
 * talks to Foundry. The deciding lives in core/world-sync.mjs; the building is
 * done by functions that already existed and are each idempotent (the content
 * sync, the scene set, the scene retirements). This runs them in order, each in
 * its own try so one failing step never cancels the rest, and reports once.
 *
 * WHEN IT RUNS, with nobody pressing anything:
 *   - when a GM's page finishes loading, if the build on the server is not the
 *     one this world was last brought up to;
 *   - while a GM is logged in, whenever a new deploy lands (checked every 90
 *     seconds; a small request that normally comes back "not modified").
 * And whenever a GM asks: the "Blank Inheritance: Update the World" macro, or
 * game.modules.get("blank-inheritance").api.runWorldSync().
 *
 * Only the active GM's page ever acts, so two GMs can never race each other
 * into the same scene.
 *
 * REPLACES runAutomaticSync (blank-inheritance.mjs, 2026-09-19), which ran on
 * the first canvasReady of every GM login. Two things were wrong with that,
 * both found on 2026-09-27: Foundry never fires canvasReady when no scene is
 * active (client/canvas/board.mjs's #drawBlank path), so a world with no active
 * scene never synced; and it could not know whether the world was already up
 * to date, so it redid everything, with a clipboard write and a chat card, at
 * every login -- while never noticing a deploy that landed mid-session.
 */

import {
  BUILD_STAMP_PATH,
  changesSince,
  decideWorldSync,
  describeChanges,
  episodePathsFor,
  keptEditedDocuments,
  noticeText,
  orphanedSyncedDocuments,
  WATCH_INTERVAL_MS,
  worldSyncCardHtml,
  worldSyncToast
} from "../core/world-sync.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { journalEditedInFoundry, managedSourceIds, runRealContentSync } from "./sync.mjs";
import { buildSceneSet, quarantineStrayScenes, retireDuplicateScenes, retireOrphanedScenes, retireTemporaryScenes } from "./scene-build.mjs";
import { refreshAudio } from "./audio-store.mjs";
import { syncAudioPlaylists } from "./audio-playlists.mjs";
import { fetchModuleJson } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const SETTING = "worldSync";
// The id of the macro that used to build only the scenes ("Build the scene
// set"). Kept, so the macro already in a GM's hotbar is retargeted in place
// rather than a second one appearing beside it.
const MACRO_SOURCE_ID = "scene-set-macro";
const SCENE_SET_PATH = "data/campaign/campaign/scene-set.json";

let inFlight = null;
/** The stamp as it was when this page loaded; null when the server had none. */
let loadedBuild = null;
/** The build a reload/relaunch notice has already been shown for, so it is said once. */
let noticedBuildId = null;
let watchTimer = null;
let beforeApplyHook = null;

export function registerWorldSyncSettings() {
  // What this world was last brought up to. World-scoped: it is a fact about
  // the world's documents, not about one browser.
  game.settings.register(MODULE_ID, SETTING, { scope: "world", config: false, type: Object, default: {} });
}

/** The world's own record: { buildId, appliedAt, trigger }. */
export function worldSyncState() {
  return game.settings.get(MODULE_ID, SETTING) ?? {};
}

/**
 * The build stamp on the server, or null when there is none (a server last
 * deployed before stamps existed) or it cannot be read. Always revalidated:
 * Foundry serves module files with Cache-Control: no-cache and an ETag, so an
 * unchanged stamp costs one "304 Not Modified".
 */
export async function readBuildStamp() {
  try {
    const response = await fetch(foundry.utils.getRoute(`modules/${MODULE_ID}/${BUILD_STAMP_PATH}`), { cache: "no-cache" });
    if (!response.ok) return null;
    const stamp = await response.json();
    return typeof stamp?.id === "string" ? stamp : null;
  } catch {
    return null;
  }
}

/**
 * Bring the world up to date if the content on the server is newer than it.
 *
 * @param {{trigger?: "login"|"poll"|"manual"}} [options]
 * @returns {Promise<object|null>}  the report, or null when nothing was done
 */
export async function runWorldSync({ trigger = "manual" } = {}) {
  if (!game.user?.isGM) {
    if (trigger === "manual") ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.WorldSync.NotGM"));
    return null;
  }
  // Automatic runs only ever happen on ONE GM's page (core's own idiom, see
  // campaign-state.mjs). A GM who asks by hand is always obeyed.
  if (trigger !== "manual" && game.users?.activeGM && !game.users.activeGM.isSelf) return null;
  if (inFlight) return inFlight;
  inFlight = syncOnce(trigger).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function syncOnce(trigger) {
  const serverBuild = await readBuildStamp();
  const appliedBuildId = worldSyncState().buildId ?? null;
  const decision = decideWorldSync({ trigger, serverBuild, appliedBuildId, loadedBuild, loadedManifest: game.modules.get(MODULE_ID) });

  if (!decision.apply) {
    if (decision.notice && noticedBuildId !== serverBuild?.id) {
      noticedBuildId = serverBuild?.id ?? null;
      const text = noticeText(decision.notice, serverBuild);
      ui.notifications.warn(text, { permanent: true });
      await ChatMessage.create({ content: `<p>${text}</p>`, whisper: [game.user.id] });
    } else if (trigger === "manual" && !decision.notice) {
      ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.WorldSync.AlreadyCurrent"));
    }
    console.log(`Blank Inheritance | World sync (${trigger}): ${decision.reason}`);
    return null;
  }

  console.log(`Blank Inheritance | World sync (${trigger}): ${decision.reason}`);
  ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.WorldSync.Updating"));
  const report = await applyBuild({ trigger, serverBuild, appliedBuildId, notice: decision.notice });

  // Recorded even when a step reported a problem: the problems are in the card,
  // and a build that is retried every 90 seconds would bury them in repeats.
  // "Update the World" re-runs it on demand.
  await game.settings.set(MODULE_ID, SETTING, { buildId: serverBuild?.id ?? null, appliedAt: new Date().toISOString(), trigger });
  noticedBuildId = null;

  await ChatMessage.create({ content: worldSyncCardHtml(report), whisper: [game.user.id] });
  ui.notifications.info(worldSyncToast(report));
  return report;
}

/** Everything that brings the world up to date, in order, each step isolated. */
async function applyBuild({ trigger, serverBuild, appliedBuildId, notice }) {
  const report = {
    trigger,
    build: serverBuild ? { id: serverBuild.id, deployedAt: serverBuild.deployedAt, warnings: serverBuild.warnings ?? [] } : null,
    appliedBuildId,
    notice,
    scenes: {},
    documents: { removed: [] },
    changes: null,
    problems: []
  };
  const step = async (label, fn) => {
    try {
      return await fn();
    } catch (err) {
      console.error(`Blank Inheritance | World sync: ${label} failed:`, err);
      report.problems.push(`${label} failed: ${err?.message ?? err}`);
      return null;
    }
  };

  // Stale caches first: the scene build binds soundscapes from the audio
  // library, and the Scene Runner reads briefs through its own cache.
  await step("refreshing the audio library", () => refreshAudio());
  // The actual Playlist/PlaylistSound documents Foundry plays from: built once
  // (audio-playlists.mjs#ensureAudioPlaylists) and otherwise inert, so a later
  // change here -- a track reserved for a moment, a soundscape repointed --
  // never took effect on its own. Found live 2026-09-27: Ingram picked a new
  // overture track, the data deployed and verified clean, and the old one kept
  // playing, because nothing had told the *documents* to catch up. This step
  // is what a deploy was always missing: syncAudioPlaylists() already only
  // writes what actually changed, so running it on every sync costs nothing
  // when nothing did.
  const audio = await step("syncing the audio playlists", () => syncAudioPlaylists({ notify: false }));
  await step("clearing the Scene Runner's cache", async () => beforeApplyHook?.());

  const episodePaths = episodePathsFor(serverBuild);
  const content = await step("the content sync", () => runRealContentSync({ quiet: true, episodePaths }));
  const built = await step("building the scenes", () => buildSceneSet({ notify: false }));
  const orphans = await step("removing scenes the adventure no longer has", () => retireOrphanedScenes({ notify: false }));
  const temporary = await step("removing temporary scenes", () => retireTemporaryScenes({ notify: false }));
  const duplicates = await step("removing empty duplicate scenes", () => retireDuplicateScenes({ notify: false }));
  const strays = await step("setting aside stray scenes", () => quarantineStrayScenes({ notify: false }));
  const documents = await step("removing old documents", () => retireOrphanedDocuments(content, episodePaths));
  await step("updating the macro", () => ensureWorldSyncMacro());

  report.audio = { created: audio?.created ?? [], updated: audio?.updated ?? [], removed: audio?.removed ?? [] };
  report.problems.push(...(audio?.problems ?? []));

  report.scenes = {
    created: built?.created ?? [],
    updated: built ? built.updated.length : undefined,
    pinsRetired: built?.pinsRetired ?? 0,
    removed: orphans?.removed ?? [],
    temporary: temporary?.removed ?? [],
    duplicates: duplicates?.removed ?? [],
    quarantined: strays?.moved ?? []
  };
  report.documents = { removed: documents?.removed ?? [], kept: [...keptEditedDocuments(content), ...(documents?.kept ?? [])] };
  report.problems.push(
    ...(built?.problems ?? []),
    ...contentProblems(content),
    ...[orphans, temporary, duplicates, strays].flatMap((r) => (r?.kept ?? []).filter((k) => /could not/.test(k))),
    ...(documents?.problems ?? [])
  );

  if (serverBuild) {
    const since = changesSince(serverBuild, appliedBuildId);
    report.changes = { known: since.known, ...describeChanges(since.changed, { names: await briefNames() }) };
  }
  return report;
}

/** Content cases that did not sync cleanly. Withheld (still drafted) content is not a problem. */
function contentProblems(content) {
  if (!content) return [];
  const problems = content.fatalError ? [`content sync: ${content.fatalError}`] : [];
  for (const result of content.results ?? []) {
    if (result.withheld) continue;
    const failed = (result.checks ?? []).filter((c) => !c.pass);
    if (failed.length) problems.push(`content: "${result.sourceId}" did not sync cleanly (${failed.map((c) => c.label).join("; ")})`);
  }
  return problems;
}

/** A scene brief's id -> its scene's own name, for the card. */
async function briefNames() {
  try {
    const manifest = await fetchModuleJson(SCENE_SET_PATH);
    const names = new Map();
    for (const scene of manifest.scenes ?? []) {
      if (scene.briefRef && scene.kind !== "sub" && !names.has(scene.briefRef)) names.set(scene.briefRef, scene.name);
    }
    return names;
  } catch {
    return new Map();
  }
}

/**
 * Delete the Actors and JournalEntries the content sync made from sources that
 * no longer exist (core/world-sync.mjs#orphanedSyncedDocuments says which).
 *
 * Fail-safe: when the content sync did not finish every case, its idea of
 * what is still live cannot be trusted enough to delete by, so nothing is.
 */
async function retireOrphanedDocuments(content, episodePaths) {
  if (!content || content.fatalError || (content.results ?? []).some((r) => r.foundryType === "Case")) {
    return { removed: [], problems: ["old documents were left alone this time: the content sync did not finish cleanly"] };
  }
  const live = managedSourceIds(episodePaths);
  const candidates = [...game.actors, ...game.journal].map((doc) => ({
    doc,
    id: doc.id,
    name: doc.name,
    sourceId: doc.getFlag(MODULE_ID, "sourceId"),
    sourceHash: doc.getFlag(MODULE_ID, "sourceHash")
  }));
  const removed = [];
  const kept = [];
  const problems = [];
  for (const entry of orphanedSyncedDocuments(candidates, live)) {
    // Its source is gone from the repo, but Ingram has edited it here: an
    // edit of hers is never deleted (design/scene-edits.md §7).
    if (await journalEditedInFoundry(entry.doc)) {
      kept.push(entry.name);
      continue;
    }
    try {
      await entry.doc.delete();
      removed.push(`${entry.name} (${entry.doc.documentName === "JournalEntry" ? "journal" : "actor"})`);
    } catch (err) {
      problems.push(`could not remove the old ${entry.doc.documentName} "${entry.name}": ${err?.message ?? err}`);
    }
  }
  return { removed, kept, problems };
}

/**
 * The one macro a GM needs: "Blank Inheritance: Update the World". Created or
 * retargeted in place at the old "Build the scene set" macro's own id.
 */
export async function ensureWorldSyncMacro() {
  const id = await deriveFoundryId(MACRO_SOURCE_ID);
  const data = {
    name: game.i18n.localize("BLANKINHERITANCE.WorldSync.MacroName"),
    type: "script",
    img: "icons/svg/direction.svg",
    command: `await game.modules.get("${MODULE_ID}").api.runWorldSync();`
  };
  const existing = game.macros.get(id);
  if (!existing) return Macro.create({ _id: id, ...data }, { keepId: true });
  if (existing.name !== data.name || existing.command !== data.command) await existing.update({ name: data.name, command: data.command });
  return existing;
}

/**
 * Start keeping the world up to date: bring it up to date now if it needs it,
 * then watch for new deploys for as long as the page is open. GM only.
 *
 * @param {object} [options]
 * @param {() => unknown} [options.beforeApply]  run before an update applies
 *   (blank-inheritance.mjs passes the Scene Runner's cache reset, which this
 *   file cannot import without dragging the whole runner UI in with it)
 */
export async function startWorldSync({ beforeApply = null } = {}) {
  if (!game.user?.isGM) return;
  beforeApplyHook = beforeApply;
  loadedBuild = await readBuildStamp();
  try {
    await runWorldSync({ trigger: "login" });
  } finally {
    if (!watchTimer) {
      watchTimer = setInterval(() => {
        runWorldSync({ trigger: "poll" }).catch((err) => console.error("Blank Inheritance | World sync (poll) failed:", err));
      }, WATCH_INTERVAL_MS);
    }
  }
}
