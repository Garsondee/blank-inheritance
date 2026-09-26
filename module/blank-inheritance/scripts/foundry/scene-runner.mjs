/**
 * The scene runner — the GM's script, on screen, while they improvise.
 *
 * Reads authored scene briefs (data/schema/scene-brief.schema.json) and
 * renders them as a printed running order down the left of the screen: who
 * is in the scene and how they talk, what has to happen, what can be handed
 * over, and what the clock says. Everything it decides lives in
 * core/scene-brief.mjs; this file is the Foundry half — where the data comes
 * from, where run state is kept, and what a click does.
 *
 * GM-ONLY BY CONSTRUCTION. Nothing here is ever instantiated on a player's
 * client, the same way DirectorBar never is (doctrine Law 11 — redaction is
 * removal, not hiding). There is deliberately no `if (isGM)` inside the
 * template.
 *
 * ⚠ THE BRIEFS THEMSELVES ARE NOT SECRET. They are fetched over plain HTTP
 * from the module directory, so any logged-in client could request the URL.
 * That is an accepted trade (2026-09-09: "We don't need to firewall
 * information from players"), and the isGM guard on the fetch below is an
 * honest soft boundary rather than a real one. Anything that genuinely must
 * not reach a client belongs in a GM-only JournalEntry with
 * ownership.default NONE — see foundry/social-store.mjs, which does exactly
 * that for authored NPC facts.
 */

import {
  beatsWithState,
  castFor,
  clockState,
  choiceLogSubject,
  displayName,
  emptyRunState,
  hiddenAdjustment,
  noteCounts,
  noteTargetFor,
  notesForBeat,
  outcomeLogSubject,
  outcomeTally,
  pacing,
  sectionStates,
  shouldOfferClose,
  postedDc,
  sceneRunnerState,
  temptationLogSubject,
  triggerLogSubject
} from "../core/scene-brief.mjs";
import {
  beatDetailOpen,
  checkResultFrom,
  episodeSteps,
  isTopicKey,
  nowBeatId,
  resultsByKey,
  roomLabel,
  runnerPhase,
  runnerRollOption,
  runnerWidthCss,
  sceneStartedAt,
  shouldAutoRecord,
  toggleDetail,
  widthFractionFrom
} from "../core/runner-view.mjs";
import { decorateInlineTriggers, escapeHtml } from "../core/inline-triggers.mjs";
import { renderProse } from "../core/emphasis.mjs";
import { checkLabel, checkSkills, enrichersFor } from "../core/roll-intent.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { needsTravel } from "../core/travel-trigger.mjs";
import { fetchModuleJson, listModuleImageIds } from "./io.mjs";
import { fitDeck } from "./deck.mjs";
import { currentEntries, recordLogEntry } from "./session-log.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { removeFromStage, summonToStage } from "./stage.mjs";
import { runTravelSequence } from "./travel.mjs";
import { applySoundscape, fireEvent } from "./audio-director.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";
import { openEquipmentPanel } from "./equipment-panel.mjs";
import { equipmentGrantsForScene } from "./equipment-state.mjs";
import { loadRulesIndex } from "./rules-index.mjs";
import { searchRules } from "../core/rules-search.mjs";
import { registerRunnerThemeSetting, currentRunnerTheme, setRunnerTheme } from "./runner-theme.mjs";
import { isDiagnosticName } from "../core/diagnostic-content.mjs";

/**
 * A beat's `gmTool.id` (#176) resolves through here, never through a free
 * string the panel would have to trust — an unrecognised id renders no
 * button at all rather than silently failing when clicked, so a typo in the
 * data is caught by looking at the panel, not by a player waiting on a GM
 * who's clicking a dead button. Add a tool here the same day it's authored
 * onto a beat; a beat naming an id not listed here is a data bug to fix, not
 * a case to handle gracefully.
 */
const GM_TOOLS = {
  "equipment-locker": openEquipmentPanel
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/runner`;

/** Ordered best-to-worst, the way an outcome table is always written. */
const DEGREE_LABELS = Object.freeze([
  ["criticalSuccess", "BLANKINHERITANCE.Runner.CritSuccess"],
  ["success", "BLANKINHERITANCE.Runner.Success"],
  ["failure", "BLANKINHERITANCE.Runner.Failure"],
  ["criticalFailure", "BLANKINHERITANCE.Runner.CritFailure"]
]);

const SETTING_EPISODE = "runnerEpisode";
const SETTING_BRIEF = "runnerBrief";
const SETTING_RUNS = "runnerRuns";
const SETTING_FOLDS = "runnerFolds";
const SETTING_WIDTH = "runnerWidth";
const SETTING_NOW = "runnerNow";

/* ---------------------------------------------------------------- */
/*  Settings                                                         */
/* ---------------------------------------------------------------- */

/**
 * Three world settings, all GM-written.
 *
 * `runnerRuns` is keyed by brief id and holds tick state — the same shape
 * core/scene-brief.mjs's emptyRunState() defines, and the same storage idiom
 * foundry/splash.mjs uses for `splashedPortraits`. World scope rather than
 * client, because which beats have happened is a fact about the campaign
 * rather than about one browser, and a GM who reloads mid-scene must land
 * back on the same page they left.
 */
export function registerSceneRunnerSettings() {
  game.settings.register(MODULE_ID, SETTING_EPISODE, { scope: "world", config: false, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTING_BRIEF, { scope: "world", config: false, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTING_RUNS, { scope: "world", config: false, type: Object, default: {} });
  // Which sections this GM keeps open. CLIENT scope, unlike the run state
  // beside it: how one person likes their script laid out is not a fact about
  // the campaign, and a second GM must not inherit it.
  game.settings.register(MODULE_ID, SETTING_FOLDS, { scope: "client", config: false, type: Object, default: {} });
  // How wide this GM has dragged the drawer, as a fraction of the window (0
  // means "the stylesheet's default"). CLIENT scope for the same reason as
  // the folds: it is about one screen, and Ingram's is a 4K display at 150%
  // scaling while the next GM's may not be.
  game.settings.register(MODULE_ID, SETTING_WIDTH, {
    scope: "client",
    config: false,
    type: Number,
    default: 0,
    onChange: () => {
      applyRunnerWidth();
      relayoutAroundRunner();
    }
  });
  // Which beat this GM was running in each scene, so a page reload comes
  // back to the same "now" marker instead of re-deriving it from the most
  // recent tick (which, after a side check was recorded, is the wrong beat).
  // CLIENT scope: it is where one GM's eye was, not a fact about the campaign.
  game.settings.register(MODULE_ID, SETTING_NOW, { scope: "client", config: false, type: Object, default: {} });
  // Light/dark, shared with the Close Scene dialogue -- see foundry/runner-theme.mjs.
  registerRunnerThemeSetting();
}

const nowMemory = () => {
  try {
    return game.settings.get(MODULE_ID, SETTING_NOW) ?? {};
  } catch {
    return {};
  }
};

/**
 * Put this GM's own drawer width on the page, or take it off again so the
 * stylesheet's default (--bi-runner-width in bi-tokens.css) applies. Written
 * on <body> because everything that has to clear the drawer — Foundry's own
 * left column, the stage, the console window — reads the same variable.
 */
function applyRunnerWidth() {
  let fraction = 0;
  try {
    fraction = Number(game.settings.get(MODULE_ID, SETTING_WIDTH)) || 0;
  } catch {
    fraction = 0;
  }
  const css = runnerWidthCss(fraction);
  if (css) document.body.style.setProperty("--bi-runner-width", css);
  else document.body.style.removeProperty("--bi-runner-width");
}

/**
 * Everything that sits beside the drawer, fitted to where its edge is now:
 * the deck (fitDeck measures the drawer directly), the session rail (which
 * runs from Foundry's left column, and that column moves with the drawer) and
 * a staged scene's camera (which centres the picture in the part of the
 * screen the GM can actually see).
 *
 * Run once immediately and once more after Foundry's left column has
 * finished its own 250ms slide (bi-foundry-bridge.css), because the rail
 * measures that column and would otherwise fit itself to where it was
 * mid-animation. Dynamic imports, not static ones: session-rail.mjs imports
 * the command bar, which imports this file, and a module cycle that only
 * works because nothing touches a binding during evaluation is one edit away
 * from not working.
 */
function relayoutAroundRunner({ settle = true } = {}) {
  fitDeck();
  import("./session-rail.mjs").then((m) => m.fitRail?.()).catch(() => {});
  import("./stage-camera.mjs").then((m) => m.refitStageCamera?.()).catch(() => {});
  if (settle) setTimeout(() => relayoutAroundRunner({ settle: false }), 320);
}

const currentEpisodeId = () => game.settings.get(MODULE_ID, SETTING_EPISODE) || "";
const currentBriefId = () => game.settings.get(MODULE_ID, SETTING_BRIEF) || "";
const allRuns = () => game.settings.get(MODULE_ID, SETTING_RUNS) ?? {};
const folds = () => { try { return game.settings.get(MODULE_ID, SETTING_FOLDS) ?? {}; } catch { return {}; } };

export function runStateFor(briefId) {
  return allRuns()[briefId] ?? emptyRunState();
}

async function writeRunState(briefId, next) {
  if (!game.user.isGM) return;
  await game.settings.set(MODULE_ID, SETTING_RUNS, { ...allRuns(), [briefId]: next });
}

/* ---------------------------------------------------------------- */
/*  Loading authored content                                         */
/* ---------------------------------------------------------------- */

// Repo data/<dir>/ lands under the module as data/campaign/<dir>/ — except
// data/campaign/ itself, which doubles (see foundry/campaign-state.mjs's own
// note on why that is not a typo).
const dataPath = (dir, id) => `data/campaign/${dir}/${id}.json`;

const cache = new Map();

async function loadJson(dir, id) {
  if (!id) return null;
  const key = `${dir}/${id}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const doc = await fetchModuleJson(dataPath(dir, id));
    cache.set(key, doc);
    return doc;
  } catch (err) {
    console.warn(`Blank Inheritance | Could not load ${key}:`, err);
    cache.set(key, null);
    return null;
  }
}

/** Drops every cached file. The seam for re-reading after a content push. */
export function resetSceneRunnerCache() {
  cache.clear();
}

/**
 * Apply a scene's own soundscape, if one has been authored for it — most
 * scenes across the wider campaign will not have one yet, and that is the
 * ordinary case, not a problem: checked against the loaded index first so
 * picking an unscored scene is a silent no-op rather than a caught
 * exception on every click. design/audio-system.md §5.1.
 */
export async function applySceneAudio(briefId) {
  if (!briefId || !game.user?.isGM) return;
  try {
    const audio = cachedAudio() ?? (await loadAudio());
    if (!audio?.soundscapes?.has(briefId)) return;
    await applySoundscape(briefId);
  } catch (err) {
    console.error(`Blank Inheritance | Could not apply this scene's soundscape "${briefId}":`, err);
  }
}

/**
 * Fire whatever audio cue is bound to a beat just being ticked (the "beat"
 * trigger, design/audio-system.md §5.3) — the same event a marker or a
 * scene-activation fires, so a beat with no cue authored against it costs
 * nothing beyond the lookup `fireEvent` already does internally.
 */
export async function fireBeatAudio(briefId, beatId) {
  if (!briefId || !beatId || !game.user?.isGM) return;
  try {
    await fireEvent({ on: "beat", brief: briefId, beat: beatId });
  } catch (err) {
    console.error(`Blank Inheritance | Could not fire this beat's audio cue ("${beatId}"):`, err);
  }
}

/**
 * Everything one scene needs, fetched together.
 *
 * Challenges are loaded by walking the beats rather than the episode's own
 * `challengeRefs`, so a brief that references one the episode entry forgot
 * to list still resolves — the panel's job is to render what the brief says,
 * not to police the episode file.
 */
async function loadScene(briefId) {
  const brief = await loadJson("scene-briefs", briefId);
  if (!brief) return null;
  primeStagePortraits().catch(() => {}); // best-effort; art is decoration here

  const [episode, subsystem] = await Promise.all([
    loadJson("episodes", brief.episodeRef),
    loadJson("subsystems", brief.clockRef)
  ]);

  const challengeIds = [...new Set((brief.beats ?? []).map((b) => b.challengeRef).filter(Boolean))];
  const challenges = Object.fromEntries(
    (await Promise.all(challengeIds.map(async (id) => [id, await loadJson("challenges", id)]))).filter(([, c]) => c)
  );

  // A beat that IS a fight (`encounterRef`, two of them in the real data
  // today) gets the encounter's own headline in its detail -- what is coming
  // and how hard -- instead of nothing at all, which is what it had before.
  const encounterIds = [...new Set((brief.beats ?? []).map((b) => b.encounterRef).filter(Boolean))];
  const encounters = Object.fromEntries(
    (await Promise.all(encounterIds.map(async (id) => [id, await loadJson("encounters", id)]))).filter(([, e]) => e)
  );

  return { brief, episode, subsystem, challenges, encounters };
}

/** The part of an encounter file worth a line on the beat that starts it. */
function encounterSummary(encounter) {
  if (!encounter) return null;
  return {
    name: encounter.name ?? encounter.id,
    threat: encounter.intendedThreatLevel ?? null,
    creatures: (encounter.creatures ?? []).map((c) => ({
      count: c.count ?? 1,
      name: c.name ?? c.creatureRef ?? "?",
      level: c.level ?? null
    }))
  };
}

/**
 * Every Foundry Scene built against this brief, in build order.
 *
 * Matched on the scene's own `briefRef` flag, which foundry/scene-build.mjs
 * writes from data/campaign/scene-set.json -- so a picture added to the
 * manifest turns up here with no change to this file.
 */
function backdropsFor(briefId) {
  if (!briefId) return [];
  return game.scenes
    .filter((scene) => scene.getFlag(MODULE_ID, "briefRef") === briefId)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((scene) => ({
      id: scene.id,
      name: scene.name,
      isCurrent: scene.active,
      // The sub-rooms read as secondary, because the main room is the one
      // the scene opens in and the others are cuts away from it.
      isSub: scene.getFlag(MODULE_ID, "kind") === "sub"
    }));
}

/**
 * Stamp a brief's run state as closed, so leaving it never asks again.
 *
 * Kept in run state rather than anywhere new: "this scene has been closed" is
 * exactly what run state is for, and the session log already holds the closure
 * itself.
 */
async function markClosed(briefId) {
  if (!briefId || !game.user?.isGM) return;
  const state = runStateFor(briefId);
  await writeRunState(briefId, { ...state, closedAt: new Date().toISOString() });
}

/**
 * SCENE -> MAP -> SCENE, fired the moment a scene is confirmed CLOSED
 * (`blank-inheritance.sceneClosed`, complete === true) rather than only from
 * the runner's own backdrop thumbnails.
 *
 * Found live 2026-09-18 (Ingram, testing Kit Issue): closing a scene did
 * nothing beyond the bookkeeping dialogue -- the table never actually moved.
 * `#onCutTo` already drives the whole travel ritual, but only for a backdrop
 * belonging to whichever brief happens to be loaded; there was no path from
 * "I have just finished this scene" to "take the table to the next one."
 * This is that path: find the next scene in the CURRENT episode's own order,
 * find its built backdrop, and cut there exactly the way #onCutTo would.
 *
 * Never blocks on a missing next scene or a not-yet-built backdrop -- same
 * "never blocks arrival" philosophy as travel.mjs itself. A closure that
 * should leave the table where it is -- an unfinished scene, or a PANIC
 * verdict -- never calls this at all; only the caller decides that, by only
 * calling this when the closure's own `advances` was true.
 */
async function advanceAfterClose(closedBriefId) {
  if (!closedBriefId || !game.user?.isGM) return;
  const episode = await loadJson("episodes", currentEpisodeId());
  const scenes = (episode?.scenes ?? [])
    .filter((s) => s.briefRef)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const closedIndex = scenes.findIndex((s) => s.briefRef === closedBriefId);
  const next = closedIndex >= 0 ? scenes[closedIndex + 1] : null;
  if (!next) return; // last scene in the episode -- nothing authored to advance to

  const targetSceneId = backdropsFor(next.briefRef)[0]?.id;
  if (!targetSceneId) return; // the next scene has no built Scene document yet

  const fromRef = game.scenes.active?.getFlag(MODULE_ID, "locationRef") ?? null;
  const toRef = game.scenes.get(targetSceneId)?.getFlag(MODULE_ID, "locationRef") ?? null;

  if (needsTravel(fromRef, toRef)) {
    await runTravelSequence(fromRef, toRef, targetSceneId);
  } else {
    const { cueScene } = await import("./director-panel.mjs");
    await cueScene(targetSceneId);
  }
}

/**
 * The stage portrait id for one of a brief's cast members.
 *
 * A cast member is authored content (an npcRef or a label), not an Actor, so
 * it gets the same `summon-<id>` shape the summon panel uses for real Actors
 * -- one namespace on the stage means "is this person already up?" is a single
 * lookup wherever they came from.
 */
function stageIdFor(member) {
  return String(member?.npcRef ?? member?.id ?? member?.displayName ?? "unknown");
}

/**
 * The id the STAGE stores them under.
 *
 * core/stage-layout.mjs#castMemberFromDescriptor prepends "summon-" to the
 * descriptor id itself, so the descriptor gets the RAW id and only this
 * function knows about the prefix. Passing an already-prefixed id produced
 * "summon-summon-shucks-mordant" — found live, first click.
 */
function portraitIdFor(member) {
  return `summon-${stageIdFor(member)}`;
}

/**
 * Which stage portraits the module actually ships, by id.
 *
 * Browsed once per page rather than per render, and per cast member it is a
 * plain Set lookup. A brief's cast member has no Actor to take an `img` from
 * — that is the whole difference between them and the summon panel's rows —
 * so without this they stage as a nameplate over an empty frame.
 */
let stagePortraitIds = null;
async function primeStagePortraits() {
  if (stagePortraitIds) return stagePortraitIds;
  stagePortraitIds = new Set(await listModuleImageIds("assets/stage"));
  return stagePortraitIds;
}

function stagePortraitFor(id) {
  return stagePortraitIds?.has(id) ? `modules/${MODULE_ID}/assets/stage/${id}.webp` : undefined;
}

/** Who is currently standing on the scene the table is looking at. */
function stagedPortraitIds() {
  const cast = canvas?.scene?.getFlag(MODULE_ID, "stage")?.cast ?? [];
  return new Set(cast.map((m) => m.portraitId));
}

/**
 * Every real Actor worth offering to summon — party members first (what a
 * Director reaches for constantly), then every other character actor.
 *
 * Folded in here 2026-09-18 from what used to be its own standalone panel
 * ("a way to summon any character to any theatre of the mind scene", Ingram
 * 2026-09-17) — Ingram's own later call was that the summon UI belongs
 * inside the script a GM is already looking at, not a second floating
 * button. Distinct from the brief's own `cast` (portraitIdFor/stagedPortraitIds
 * above): this offers EVERY real Actor in the world, not just the ones this
 * scene's author named.
 *
 * isDiagnosticName excludes self-labelled scratch Actors (found live
 * 2026-09-19: the real world's "TEST FIXTURE — Map Journey PC" set and a "ZZ
 * TEST CHARACTER" left the GM scrolling past eight throwaway entries to reach
 * a real NPC) — the exact opposite of "as little prep as possible."
 */
function summonableActors() {
  const partyIds = new Set((game.actors.party?.members ?? []).map((a) => a.id));
  const actors = game.actors.contents.filter((a) => a.type === "character" && !isDiagnosticName(a.name));
  const onStage = stagedPortraitIds();
  const row = (actor) => ({
    id: actor.id,
    name: actor.name,
    img: actor.img,
    isPc: actor.hasPlayerOwner,
    onStage: onStage.has(`summon-${actor.id}`)
  });
  const party = actors.filter((a) => partyIds.has(a.id)).map(row);
  const others = actors.filter((a) => !partyIds.has(a.id)).sort((a, b) => a.name.localeCompare(b.name)).map(row);
  return { party, others };
}

/** The one check a beat names, out of its challenge's handful. */
function checkFor(beat, challenges) {
  const challenge = challenges[beat.challengeRef];
  if (!challenge) return null;
  const checks = challenge.checks ?? [];
  return (beat.checkRef ? checks.find((c) => c.id === beat.checkRef) : checks[0]) ?? null;
}

/**
 * Who the TABLE can see on the scene they are looking at, by name — the
 * published stage, whoever put them there (a brief's own cast, a summon, a
 * trigger in the prose, the stage's own controls). The runner lists them at
 * the top of its people column with a way to take each one off again, which
 * nothing in the old panel offered for a brief's own cast at all.
 */
function onStageNow() {
  const cast = canvas?.scene?.getFlag(MODULE_ID, "stage")?.cast ?? [];
  return cast
    .filter((member) => member?.portraitId)
    .map((member) => ({ portraitId: member.portraitId, label: member.label ?? member.portraitId, isPc: member.kind === "pc" }));
}

/**
 * The roll option a check posted from this brief carries, so the result a
 * player rolls from it can find its way back to the beat (or topic) that
 * asked (core/runner-view.mjs#runnerRollOption). An id that could not be put
 * safely into an enricher posts the check untagged rather than not at all —
 * the table still gets its check, the runner just cannot record it by itself.
 */
function rollTagFor(briefId, key) {
  try {
    return [runnerRollOption(briefId, key)];
  } catch (err) {
    console.warn("Blank Inheritance | Posting this check without a runner tag:", err);
    return [];
  }
}

/** One chat message read as a result of a check this runner posted, or null. */
function resultFromMessage(message) {
  return checkResultFrom({
    flags: message?.flags ?? null,
    speakerAlias: message?.speaker?.alias ?? message?.alias ?? null,
    messageId: message?.id ?? null,
    timestamp: message?.timestamp ?? null,
    total: message?.rolls?.[0]?.total ?? null
  });
}

/**
 * Every result the table has rolled against this brief's checks, read back
 * out of the chat log — the log is the record, so the runner shows it rather
 * than keeping a second copy. Only the most recent few hundred messages are
 * read: a result that old belongs to a scene long closed.
 */
function tableRollResults(briefId) {
  if (!briefId) return [];
  const results = [];
  for (const message of (game.messages?.contents ?? []).slice(-400)) {
    const result = resultFromMessage(message);
    if (result?.briefId === briefId) results.push(result);
  }
  return results;
}

/**
 * Record a rolled result against the beat (or coercible topic) that asked
 * for it.
 *
 * Called automatically when a tagged result arrives (the createChatMessage
 * hook below) and by the "Use this" button on a beat's list of rolls
 * (`force`). The automatic path only ever FILLS a gap — core/runner-view.mjs
 * #shouldAutoRecord: nothing recorded yet, or the same character rerolling
 * the roll that was recorded — and never overwrites the GM's own call. The
 * written tick carries who rolled it, so the panel can say "Success · Aiko"
 * and the next reroll by Aiko can replace it.
 *
 * Only ever acts on the brief the GM has open: a result for a scene they have
 * since left is still in the chat log and still listed if they go back, but
 * it does not reach into another scene's run state behind their back.
 */
async function recordRollResult(result, { force = false } = {}) {
  if (!result || !game.user?.isGM) return false;
  const briefId = currentBriefId();
  if (!briefId || result.briefId !== briefId) return false;
  const state = runStateFor(briefId);
  const at = new Date().toISOString();
  const stamp = { at, degree: result.degree, via: "roll", actorId: result.actorId, by: result.name, messageId: result.messageId };
  const who = result.name ? `${result.name}: ` : "";

  if (isTopicKey(result.key)) {
    const recorded = state.topics?.[result.key] ?? null;
    if (recorded?.messageId === result.messageId && recorded?.degree === result.degree) return false;
    if (!force && !shouldAutoRecord(result, recorded)) return false;
    await writeRunState(briefId, { ...state, topics: { ...state.topics, [result.key]: stamp } });
    await recordLogEntry({
      text: `${who}${result.degree} on a conversation check.`,
      nowIso: at,
      scene: canvas?.scene?.name ?? null,
      subject: outcomeLogSubject(result.key, result.degree)
    }).catch((err) => console.error("Blank Inheritance | Could not log that rolled outcome:", err));
  } else {
    const scene = await loadScene(briefId);
    const beat = (scene?.brief?.beats ?? []).find((b) => b.id === result.key);
    if (!beat) return false;
    const recorded = state.ticked?.[result.key] ?? null;
    if (recorded?.messageId === result.messageId && recorded?.degree === result.degree) return false;
    if (!force && !shouldAutoRecord(result, recorded)) return false;
    await writeRunState(briefId, { ...state, ticked: { ...state.ticked, [result.key]: stamp } });
    fireBeatAudio(briefId, result.key);
    const check = checkFor(beat, scene?.challenges ?? {});
    await recordLogEntry({
      text: `${who}${result.degree} on ${check?.name ?? beat.text ?? beat.id}.`,
      nowIso: at,
      scene: canvas?.scene?.name ?? null,
      subject: outcomeLogSubject(result.key, result.degree)
    }).catch((err) => console.error("Blank Inheritance | Could not log that rolled outcome:", err));
    // Open on the consequence, exactly as a clicked degree does.
    active?.markResolved(result.key);
  }
  refreshSceneRunner();
  return true;
}

/* ---------------------------------------------------------------- */
/*  The panel                                                        */
/* ---------------------------------------------------------------- */

export class SceneRunner extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-scene-runner",
    tag: "div",
    classes: ["bi-runner-host"],
    window: { frame: false, positioned: false },
    actions: {
      toggle: SceneRunner.#onToggle,
      toggleBeat: SceneRunner.#onToggleBeat,
      recordOutcome: SceneRunner.#onRecordOutcome,
      openBeat: SceneRunner.#onOpenBeat,
      openGmTool: SceneRunner.#onOpenGmTool,
      spend: SceneRunner.#onSpend,
      cueScene: SceneRunner.#onCueScene,
      cutTo: SceneRunner.#onCutTo,
      jumpToSummon: SceneRunner.#onJumpToSummon,
      openPalette: SceneRunner.#onOpenPalette,
      toggleTheme: SceneRunner.#onToggleTheme,
      stagePerson: SceneRunner.#onStagePerson,
      closeScene: SceneRunner.#onCloseScene,
      postCheck: SceneRunner.#onPostCheck,
      postTopicCheck: SceneRunner.#onPostTopicCheck,
      recordTopicOutcome: SceneRunner.#onRecordTopicOutcome,
      revealHandout: SceneRunner.#onRevealHandout,
      revealHandoutSolo: SceneRunner.#onRevealHandoutSolo,
      grantArtefact: SceneRunner.#onGrantArtefact,
      summonActor: SceneRunner.#onSummonActor,
      dismissActor: SceneRunner.#onDismissActor,
      fireTrigger: SceneRunner.#onFireTrigger,
      recordChoice: SceneRunner.#onRecordChoice,
      useTemptation: SceneRunner.#onUseTemptation,
      // The 2026-09-24 redesign's own controls.
      toggleBeatDetail: SceneRunner.#onToggleBeatDetail,
      toggleBookend: SceneRunner.#onToggleBookend,
      togglePerson: SceneRunner.#onTogglePerson,
      toggleShowAll: SceneRunner.#onToggleShowAll,
      unstagePerson: SceneRunner.#onUnstagePerson,
      useRoll: SceneRunner.#onUseRoll,
      focusRules: SceneRunner.#onFocusRules,
      noteTag: SceneRunner.#onNoteTag,
      nudgeClock: SceneRunner.#onNudgeClock
    }
  };

  // All three partials declared here rather than only referenced from
  // panel.hbs: `templates` is what preloads them AND registers each under
  // its full path, which is the name the {{> "..."}} lookups use.
  //
  // Every column scrolls on its own (the script, the people, the kit), so
  // each is listed: ApplicationV2 puts a listed element's scroll position
  // back after a re-render, and this panel re-renders on every tick.
  static PARTS = {
    panel: {
      template: `${TEMPLATE_ROOT}/panel.hbs`,
      templates: [`${TEMPLATE_ROOT}/person.hbs`, `${TEMPLATE_ROOT}/beat.hbs`, `${TEMPLATE_ROOT}/summon-row.hbs`],
      scrollable: [".bi-runner__cols", ".bi-runner__script", ".bi-runner__side", ".bi-runner__people", ".bi-runner__kit"]
    }
  };

  /** Same idiom as the command bar and the stage. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /**
   * @override
   * The drawer's own open/closed state changes what the deck has to clear
   * (foundry/deck.mjs#fitDeck reads it directly), and toggling never adds or
   * removes a child of #interface — the MutationObserver that otherwise keeps
   * the deck fitted would never see a class change deep inside this panel.
   */
  _onRender(context, options) {
    super._onRender?.(context, options);
    fitDeck();
    // The first paint is when the drawer's width first becomes real, so the
    // rail and a staged camera are fitted to it here once, and after that
    // only when the drawer opens, shuts or is dragged (#onToggle, the grip).
    if (!this.#laidOut) {
      this.#laidOut = true;
      applyRunnerWidth();
      relayoutAroundRunner();
    }

    // <details> does the folding itself; this only remembers the choice, and
    // deliberately does NOT re-render — re-rendering on open would fight the
    // element's own animation and lose the GM's scroll position. A toggle
    // that already matches what is stored (Chromium also fires `toggle` for
    // a fold that is merely inserted open) writes nothing.
    for (const fold of this.element.querySelectorAll(".bi-runner__section--fold")) {
      fold.addEventListener("toggle", () => {
        const id = fold.dataset.section;
        if (!id || !game.user.isGM || folds()[id] === fold.open) return;
        game.settings.set(MODULE_ID, SETTING_FOLDS, { ...folds(), [id]: fold.open }).catch(() => {});
      });
    }

    // Enter saves. Bound here rather than as a data-action because the field
    // is a text input, not a button, and a note must never need a second click.
    const input = this.element.querySelector(".bi-runner__note-input");
    input?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      SceneRunner.#onNote.call(this, event);
    });

    const rulesInput = this.element.querySelector(".bi-runner__rules-input");
    rulesInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      SceneRunner.#onSearchRules.call(this, event);
    });

    // A beat's row and a person's name are role="button" rather than real
    // buttons (they hold real buttons of their own, the tick and the inline
    // trigger chips, which a <button> may not). ApplicationV2 only turns
    // CLICKS into actions, so Enter and Space are given the same meaning here
    // — but only when the row itself has focus, never a chip inside it.
    for (const row of this.element.querySelectorAll('[role="button"][data-action]')) {
      row.addEventListener("keydown", (event) => {
        if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        row.click();
      });
    }

    const grip = this.element.querySelector(".bi-runner__grip");
    grip?.addEventListener("pointerdown", (event) => this.#beginResize(event));
    grip?.addEventListener("dblclick", () => game.settings.set(MODULE_ID, SETTING_WIDTH, 0).catch(() => {}));

    this.#startTimer();
  }

  /** @override — the running clock must not outlive the panel it writes into. */
  _onClose(options) {
    super._onClose?.(options);
    clearInterval(this.#timer);
    this.#timer = null;
  }

  /** Whether the first render has fitted everything around the drawer yet. */
  #laidOut = false;

  /** The interval that keeps the scene clock current between renders. */
  #timer = null;

  /**
   * Keep the header's scene clock honest between renders.
   *
   * The panel only re-renders when something happens, and twenty quiet
   * minutes of conversation is exactly when a GM glances up to see how long
   * this has been going. Rewrites the one element's text in place every
   * twenty seconds rather than re-rendering the whole panel under the GM's
   * cursor.
   */
  #startTimer() {
    clearInterval(this.#timer);
    this.#timer = null;
    const clock = this.element.querySelector("[data-pace-started]");
    if (!clock?.dataset.paceStarted) return;
    const tick = () => {
      const pace = pacing({ startedAt: clock.dataset.paceStarted, runsAbout: clock.dataset.paceRuns || null });
      const value = clock.querySelector(".bi-runner__timer-value");
      if (value && pace.label) value.textContent = pace.label;
      clock.classList.toggle("bi-runner__timer--over", pace.isOver === true);
    };
    this.#timer = setInterval(tick, 20000);
  }

  /**
   * Drag the drawer's right edge to make it wider or narrower.
   *
   * Ingram asked for the runner to be wider (2026-09-24); how much wider is a
   * question about one screen, so the answer is a handle rather than a new
   * fixed number. The width is written to --bi-runner-width live while the
   * pointer moves (so Foundry's left column, the stage and the deck all follow
   * the edge), and saved when it is let go. Double-clicking the handle goes
   * back to the default.
   */
  #beginResize(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const grip = event.currentTarget;
    // Capture keeps the drag alive when the pointer outruns the 10px grip. It
    // throws for a pointer the browser no longer considers active (a synthetic
    // or already-released one); the drag still works without it while the
    // pointer stays over the grip, so a failure here must not abort the drag.
    try {
      grip.setPointerCapture?.(event.pointerId);
    } catch {
      /* uncapturable pointer — carry on uncaptured */
    }
    document.body.classList.add("bi-runner-resizing");
    let fraction = null;
    let frame = 0;
    const move = (moveEvent) => {
      fraction = widthFractionFrom(moveEvent.clientX, window.innerWidth);
      if (fraction === null) return;
      document.body.style.setProperty("--bi-runner-width", runnerWidthCss(fraction));
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          relayoutAroundRunner({ settle: false });
        });
      }
    };
    const end = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", end);
      grip.removeEventListener("pointercancel", end);
      document.body.classList.remove("bi-runner-resizing");
      if (fraction !== null) game.settings.set(MODULE_ID, SETTING_WIDTH, fraction).catch(() => {});
      relayoutAroundRunner();
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  }

  /** The loaded scene, kept so the action handlers do not re-fetch on every click. */
  _scene = null;

  /**
   * Whether the drawer is open. Closed by default -- a GM who has not opened
   * an episode should not permanently lose a third of the screen to an empty
   * "No scene chosen" panel; the toggle button is always visible either way.
   */
  #open = false;

  /** The Rules drawer's own state (design/ux-doctrine.md §10.7) -- last query typed and what it found, kept across renders the same way #open is. */
  #rulesQuery = "";
  #rulesResults = [];

  /**
   * How this GM has the CURRENT scene laid out: which beat they said they are
   * on, which rows and people they opened or shut by hand, and whether they
   * overrode the opening/ending sections' own phase. Instance memory rather
   * than a setting — it is about the next ten minutes of one scene, and a
   * fresh scene starts from the defaults (the "now" beat open, everything
   * else one line). Reset whenever the brief changes.
   */
  #view = { briefId: null, focusId: null, lastNowId: null, resolvedId: null, opened: [], closed: [], people: {}, bookends: {} };

  #viewFor(briefId) {
    if (this.#view.briefId !== briefId) {
      this.#view = { briefId, focusId: null, lastNowId: nowMemory()[briefId] ?? null, resolvedId: null, opened: [], closed: [], people: {}, bookends: {} };
    }
    return this.#view;
  }

  /**
   * The GM just did something on this beat — posted its check, fired one of
   * its triggers, brought it in. That is the beat they are running, whatever
   * the authored order says.
   */
  #focus(beatId) {
    if (!beatId || beatId === "intro" || beatId === "outro") return;
    this.#viewFor(currentBriefId()).focusId = beatId;
  }

  /** @override */
  async _prepareContext() {
    const briefId = currentBriefId();
    const episodeId = currentEpisodeId();
    const loaded = briefId ? await loadScene(briefId) : null;
    this._scene = loaded;

    // Summoning is a general GM action against whatever scene the table is
    // looking at, independent of the brief's own content -- available even
    // when no brief is loaded at all, exactly like the standalone panel this
    // replaced always was.
    const { party, others } = summonableActors();
    const summon = { hasScene: !!canvas?.scene, sceneName: canvas?.scene?.name ?? null, party, others };

    // The scene list comes from the episode either way, so a GM who has
    // opened an episode but not yet picked a scene still gets somewhere to
    // click rather than a dead panel.
    const episode = loaded?.episode ?? (await loadJson("episodes", episodeId));
    const scenes = (episode?.scenes ?? [])
      .filter((s) => s.briefRef)
      .map((s) => ({ order: s.order, title: s.title, briefRef: s.briefRef, isCurrent: s.briefRef === briefId }));
    // The same running order as a row of steps in the header -- closed scenes
    // marked, this one and the next one named, every one still a cue button.
    const runs = allRuns();
    const steps = episodeSteps(scenes, {
      currentBriefId: briefId,
      closedIds: Object.keys(runs).filter((id) => runs[id]?.closedAt)
    });
    const sections = sectionStates(folds());

    if (!loaded) {
      return {
        open: this.#open,
        theme: currentRunnerTheme(),
        themeIsDark: currentRunnerTheme() === "dark",
        scenes,
        steps,
        summon,
        onStageNow: onStageNow(),
        rules: { query: this.#rulesQuery, results: this.#rulesResults },
        episodeTitle: episode?.title ?? null,
        beats: [],
        cast: [],
        handouts: [],
        carryForward: [],
        spends: [],
        backdrops: [],
        sections
      };
    }

    const { brief, subsystem, challenges } = loaded;
    const runState = runStateFor(briefId);
    const state = sceneRunnerState({ brief, subsystem, runState, locationKey: brief.sceneRef });
    const entries = currentEntries();
    // Only worth asking for once there's an outro to show it in -- every
    // scene without a Kit-Issue-shaped equipment moment gets an empty array
    // back and renders nothing extra, no per-scene special-casing needed.
    const equipmentGrants = state.outro ? await equipmentGrantsForScene(canvas?.scene?.name ?? null) : [];

    // Where the GM is: the beat they are on, which rows are open, and which
    // part of the scene (opening / running / ending) the table is in.
    const view = this.#viewFor(briefId);
    const nowId = nowBeatId(state.beats, {
      focusId: view.focusId,
      previousId: view.lastNowId,
      lastTickedId: noteTargetFor(state.beats, runState)?.id ?? null
    });
    if (nowId !== view.lastNowId) {
      view.lastNowId = nowId;
      if (game.user?.isGM) game.settings.set(MODULE_ID, SETTING_NOW, { ...nowMemory(), [briefId]: nowId }).catch(() => {});
    }
    // An act that no longer holds the marker (its beat is done, or was never
    // live) is spent; forget it, so un-ticking that beat later cannot snap
    // the marker back to it.
    if (view.focusId && view.focusId !== nowId) view.focusId = null;
    const phase = runnerPhase(state.progress, runState);
    const rolls = resultsByKey(tableRollResults(briefId));
    const beats = state.beats.map((beat) => this.#withView(this.#decorateBeat(beat, brief, challenges, entries), { nowId, view, sections, runState, rolls }));
    const nowBeat = beats.find((beat) => beat.isNow) ?? null;
    const startedAt = sceneStartedAt(runState);

    // The rooms this brief was built with, named for a button rather than
    // for the Scene Directory, and whether the TABLE is actually in one of
    // them -- a GM reading one scene while the players look at another is a
    // real state, and the panel says so rather than letting it pass unseen.
    const backdrops = backdropsFor(briefId).map((backdrop) => ({ ...backdrop, label: roomLabel(backdrop.name, brief.title) }));
    const activeScene = game.scenes?.active ?? null;
    const tableElsewhere = backdrops.length && activeScene && !backdrops.some((b) => b.isCurrent)
      ? { sceneName: activeScene.name, targetId: backdrops[0].id }
      : null;
    const position = steps.findIndex((step) => step.isCurrent);

    return {
      ...state,
      // The actual PICTURES for this brief -- every Scene the scene set built
      // against it, main room and sub-rooms alike, so cutting to "the
      // examination room" is one click rather than a hunt through the sidebar.
      backdrops,
      tableElsewhere,
      position: position >= 0 ? game.i18n.format("BLANKINHERITANCE.Runner.SceneOf", { n: position + 1, total: steps.length }) : null,
      // Where a note typed right now would land, shown next to the field so
      // the GM can see it before they commit rather than after.
      noteTarget: noteTargetFor(state.beats, runState),
      rules: { query: this.#rulesQuery, results: this.#rulesResults },
      theme: currentRunnerTheme(),
      themeIsDark: currentRunnerTheme() === "dark",
      sections,
      phase,
      pacing: { ...pacing({ startedAt, runsAbout: brief.runsAbout }), startedAt },
      // One segment per required beat, so "how far through" reads at a glance
      // rather than as a fraction to work out.
      requiredSegments: state.beats
        .filter((beat) => beat.mandatory)
        .map((beat) => ({ done: beat.state === "done", ruledOut: beat.state === "notTaken" })),
      // `**bold**` in the one field every brief uses it in (26 of 26) used to
      // reach the GM as literal asterisks -- the same fix emphasis.mjs made for
      // `direction` and `note`.
      howToPlayHtml: brief.howToPlay ? renderProse(brief.howToPlay, escapeHtml) : null,
      introOpen: view.bookends.intro ?? phase === "opening",
      outroOpen: view.bookends.outro ?? phase === "ending",
      showAll: sections.detail === true,
      // `scenes`/`open` LAST, after the spread: sceneRunnerState has no
      // scenes or open-state of its own, but either growing one later must
      // not silently be shadowed by it.
      episodeTitle: episode?.title ?? null,
      beats,
      // A scene's own opening narration is often the first place an NPC is
      // glimpsed (design/scene-triggers-and-depth.md §2 extended to intro/
      // outro after finding Shucks's own intro needed exactly this) -- same
      // decoration a beat's text/readAloud already gets, just scoped as
      // beatId "intro" since there is no real beat to attach it to.
      intro: state.intro ? { ...state.intro, decoratedReadAloud: this.#decorateSceneReadAloud(state.intro, "intro") } : null,
      // Law 15 ("recording is a side effect of doing, never a separate
      // task"): found live 2026-09-19, an outro's own writeDown prompts
      // asked the GM to recall things by memory (what each player picked)
      // that the note bar had likely already captured live, tagged to this
      // same scene. Surfaced here rather than solved by auto-checking off
      // prompts -- the log's own text is free-form prose, matching it to a
      // specific prompt is a GM judgment call, not a string comparison.
      outro: state.outro
        ? {
            ...state.outro,
            decoratedReadAloud: this.#decorateSceneReadAloud(state.outro, "outro"),
            alreadyLogged: entries.filter((e) => e.context?.scene === canvas?.scene?.name).map((e) => ({ text: e.text, tag: e.tag ?? null })),
            // #178, the same Law 15 fix as alreadyLogged above, for the
            // specific case a writeDown prompt asks about equipment: real
            // grant records instead of a GM's memory of who took what.
            // "issue" and "bonus" (Nobu's free extra, marked at grant time
            // via the panel's own toggle) are kept apart rather than
            // flattened into one list, since Kit Issue's two writeDown
            // prompts ask about them separately.
            equipmentIssued: equipmentGrants.filter((g) => !g.isBonus),
            equipmentBonus: equipmentGrants.filter((g) => g.isBonus),
            onwardsHtml: renderProse(state.outro.onwards ?? "", escapeHtml) || null
          }
        : null,
      cast: state.cast.map((member) => {
        const portraitId = portraitIdFor(member);
        // Whoever the beat being run is ABOUT opens on their own, so their
        // voice and what they will and will not say sit beside the line the
        // GM is reading, not two screens away in a closed fold.
        const inBeat = Boolean(nowBeat?.npcRef && nowBeat.npcRef === member.id);
        return {
          ...member,
          brief: {
            ...(member.brief ?? {}),
            coercible: (member.brief?.coercible ?? []).map((topic, index) =>
              this.#decorateCoercibleTopic(topic, member.id, index, brief, challenges, runState)
            )
          },
          portraitId,
          // Whether this person is already standing on the scene the table is
          // looking at, so the key can say "on stage" instead of offering to put
          // them there twice.
          onStage: stagedPortraitIds().has(portraitId),
          inBeat,
          isOpen: view.people[member.id] ?? inBeat,
          portrait: member.img ?? stagePortraitFor(stageIdFor(member)) ?? null,
          initial: String(member.displayName ?? "?").trim().charAt(0).toUpperCase() || "?"
        };
      }),
      onStageNow: onStageNow(),
      scenes,
      steps,
      summon,
      open: this.#open
    };
  }

  /**
   * The redesign's per-beat view fields, on top of #decorateBeat's content
   * ones: whether this is the beat the GM is on, whether its detail is open,
   * who it is about, what was recorded and by whom, and every result the
   * table has rolled against it.
   */
  #withView(beat, { nowId, view, sections, runState, rolls }) {
    const tick = runState.ticked?.[beat.id] ?? null;
    const degreeLabel = (degree) => {
      const entry = DEGREE_LABELS.find(([key]) => key === degree);
      return entry ? game.i18n.localize(entry[1]) : degree;
    };
    let recorded = null;
    if (beat.degree) recorded = tick?.by ? `${degreeLabel(beat.degree)} · ${tick.by}` : degreeLabel(beat.degree);
    else if (beat.choice) recorded = (beat.choicePoint?.options ?? []).find((o) => o.id === beat.choice)?.label ?? beat.choice;
    const member = beat.npcRef ? castFor(this._scene?.brief, beat.npcRef) : null;
    return {
      ...beat,
      isNow: beat.id === nowId,
      isOpen: beatDetailOpen(beat.id, { nowId, resolvedId: view.resolvedId, opened: view.opened, closed: view.closed, showAll: sections.detail === true, done: beat.isDone }),
      npcName: member ? displayName(member) : null,
      recorded,
      recordedDegree: beat.degree ?? null,
      encounter: beat.encounterRef ? encounterSummary(this._scene?.encounters?.[beat.encounterRef]) : null,
      rolls: (rolls.get(beat.id) ?? []).map((result) => ({
        ...result,
        label: degreeLabel(result.degree),
        isRecorded: Boolean(tick?.messageId && tick.messageId === result.messageId)
      }))
    };
  }

  /**
   * The same inline-trigger decoration a beat's own text/readAloud gets
   * (#decorateBeat below), for the two places outside a beat that also carry
   * authored readAloud prose: a scene's intro and outro. `sectionId` is
   * "intro"/"outro", standing in for a beatId in both the chip's own dataset
   * and the log's structured subject -- there is no real beat to scope by.
   */
  #decorateSceneReadAloud(section, sectionId) {
    const { html, unknownIds } = decorateInlineTriggers(section?.readAloud, section?.triggers, sectionId);
    for (const id of unknownIds) {
      console.error(`Blank Inheritance | This brief's ${sectionId} names trigger "${id}" in its readAloud, which isn't in ${sectionId}.triggers[].`);
    }
    return html;
  }

  /**
   * Everything the beat template needs, precomputed.
   *
   * State becomes four booleans rather than a string the template switches
   * on, because the tier-0 class lint can only see a class name written
   * literally outside a Handlebars expression — `bi-runner__beat--{{state}}`
   * would be invisible to it, and an undefined modifier class fails silently
   * as unstyled markup rather than as an error.
   */
  #decorateBeat(beat, brief, challenges, entries = []) {
    const check = checkFor(beat, challenges);
    const handout = beat.handoutRef ? (brief.handouts ?? []).find((h) => h.id === beat.handoutRef) ?? null : null;

    const baseDc = check?.dc?.value ?? null;
    const adjustment = hiddenAdjustment(brief.gmModifiers ?? [], {
      challengeRef: beat.challengeRef,
      locationKey: brief.sceneRef
    });
    const dc = postedDc(baseDc, adjustment);

    const notes = notesForBeat(entries, beat.id);

    // Inline `<trig id="..."/>` tokens become real buttons at the exact word
    // they were authored at (design/scene-triggers-and-depth.md §2). Any id
    // the prose names but `triggers[]` doesn't define renders loudly in the
    // panel itself (inline-triggers.mjs's own doctrine), but a typo is still
    // worth a console line too, the same courtesy #onOpenGmTool gives a bad
    // toolId, since a GM mid-scene may not be looking at the exact word.
    const { html: decoratedText, unknownIds: unknownInText } = decorateInlineTriggers(beat.text, beat.triggers, beat.id);
    const { html: decoratedReadAloud, unknownIds: unknownInReadAloud } = beat.readAloud
      ? decorateInlineTriggers(beat.readAloud, beat.triggers, beat.id)
      : { html: null, unknownIds: [] };
    for (const id of [...unknownInText, ...unknownInReadAloud]) {
      console.error(`Blank Inheritance | Beat "${beat.id}" text names trigger "${id}", which isn't in this beat's own triggers[].`);
    }

    return {
      ...beat,
      decoratedText,
      decoratedReadAloud,
      // `direction` and `note` carry authored emphasis too -- house style
      // sanctions one bold span per field for the instruction that breaks the
      // scene if missed (design/gm-facing-prose-style.md §8 rule 9). They reach
      // the template through a triple-stache, so they are escaped HERE.
      decoratedDirection: beat.direction ? renderProse(beat.direction, escapeHtml) : null,
      decoratedNote: beat.note ? renderProse(beat.note, escapeHtml) : null,
      choicePoint: beat.choicePoint
        ? {
            ...beat.choicePoint,
            options: (beat.choicePoint.options ?? []).map((option) => ({
              ...option,
              isPicked: beat.choice === option.id
            }))
          }
        : null,
      // What the GM wrote down while this beat was happening. Read back out of
      // the session log by subject -- the log is the record, and the runner
      // shows it rather than keeping a second copy.
      notes: notes.map((entry) => ({ text: entry.text, tag: entry.tag ?? null })),
      noteCount: notes.length,
      isDone: beat.state === "done",
      isPending: beat.state === "pending",
      isConditional: beat.state === "conditional",
      isNotTaken: beat.state === "notTaken",
      isSolo: beat.delivery === "solo",
      isPassive: beat.delivery === "passive",
      // Encyclopaedia checks (design/encyclopaedia-checks.md) get their own
      // stamp treatment so a GM scanning the beat list can see at a glance
      // which checks are free to offer -- failure never costs anything on
      // one of these, unlike an ordinary check.
      isInsight: check?.insight === true,
      whenLabel: beat.when?.condition ?? null,
      handout,
      // Four, never five. A plain Failure with no listed effect is what
      // reads as "neutral" at a table; SF2E has no fifth rung.
      //
      // Each degree carries its AUTHORED CONSEQUENCE (the challenge's own
      // `outcomes`, present on all 64 checks in the real data) -- which the
      // panel never showed before 2026-09-24. The GM saw four bare buttons and
      // had to remember, or go and find, what a crit fail actually did.
      outcomes: check
        ? DEGREE_LABELS.map(([degree, key]) => ({
            degree,
            label: game.i18n.localize(key),
            consequence: check.outcomes?.[degree] ?? null,
            isPicked: beat.degree === degree,
            isOther: Boolean(beat.degree) && beat.degree !== degree
          }))
        : [],
      check: check
        ? {
            name: check.name ?? check.id,
            dc,
            skills: check.anySkill ? game.i18n.localize("BLANKINHERITANCE.Runner.AnySkill") : (check.skillOptions ?? []).join(" / "),
            label: checkLabel(check, dc, game.i18n.localize("BLANKINHERITANCE.Runner.AnySkill")),
            // The GM sees what was done to the number; the players never will.
            title: adjustment
              ? `${check.name ?? check.id} — DC ${baseDc} ${adjustment > 0 ? "−" : "+"}${Math.abs(adjustment)} here`
              : (check.name ?? check.id),
            // What a DIFFERENT skill actually gets, when authored -- most
            // checks correctly leave this out (same outcome whichever skill
            // reached it). See core/roll-intent.mjs#enrichersFor's own header
            // for the companion fix (every skill is now actually postable).
            bySkill: check.bySkill
              ? Object.entries(check.bySkill).map(([skill, text]) => ({ skill, text }))
              : null,
            // How many times each degree has actually landed, across every
            // attempt ever logged -- shown only once there is at least one,
            // so a check nobody has rolled yet doesn't clutter the line.
            // Same DEGREE_LABELS order/wording as the outcome-recording
            // buttons themselves, for one consistent vocabulary.
            tally: (() => {
              const counts = outcomeTally(entries, beat.id);
              if (Object.values(counts).every((n) => n === 0)) return null;
              return DEGREE_LABELS.map(([degree, key]) => ({
                degree,
                label: game.i18n.localize(key),
                count: counts[degree] ?? 0
              }));
            })()
          }
        : null
    };
  }

  /**
   * A coercible topic that names a challengeRef gets the same post-check /
   * record-degree treatment as a beat's own check above -- design doc
   * §10.7's Cast drawer, "one-click DC-plus-degree-of-success recording per
   * subject." Only `coercible` ever actually carries a challengeRef in real
   * authored data (`willDiscuss` never does, checked across every scene
   * brief) -- a topic with none is returned unchanged and renders exactly as
   * it always has, plain text.
   *
   * Keyed by `<castId>:coercible:<index>` rather than an authored id, since a
   * topic has never needed one before this -- stable as long as an author
   * doesn't reorder the array, the same assumption every index-keyed thing
   * elsewhere in this schema already makes.
   */
  #decorateCoercibleTopic(topic, castId, index, brief, challenges, runState) {
    if (!topic?.challengeRef) return topic;
    const check = checkFor(topic, challenges);
    if (!check) return topic;

    const topicKey = `${castId}:coercible:${index}`;
    const baseDc = check.dc?.value ?? null;
    const adjustment = hiddenAdjustment(brief.gmModifiers ?? [], {
      challengeRef: topic.challengeRef,
      locationKey: brief.sceneRef
    });
    const dc = postedDc(baseDc, adjustment);
    const pickedDegree = runState.topics?.[topicKey]?.degree ?? null;

    return {
      ...topic,
      topicKey,
      outcomes: DEGREE_LABELS.map(([degree, key]) => ({
        degree,
        label: game.i18n.localize(key),
        consequence: check.outcomes?.[degree] ?? null,
        isPicked: pickedDegree === degree
      })),
      check: {
        dc,
        label: checkLabel(check, dc, game.i18n.localize("BLANKINHERITANCE.Runner.AnySkill")),
        title: adjustment
          ? `${check.name ?? check.id} — DC ${baseDc} ${adjustment > 0 ? "−" : "+"}${Math.abs(adjustment)} here`
          : (check.name ?? check.id)
      }
    };
  }

  /* --- actions -------------------------------------------------- */

  static async #onToggleBeat(event, target) {
    const briefId = currentBriefId();
    const beatId = target.dataset.beatId;
    const state = runStateFor(briefId);
    const ticked = { ...state.ticked };

    if (ticked[beatId]) {
      delete ticked[beatId];
    } else {
      ticked[beatId] = { at: new Date().toISOString() };
      fireBeatAudio(briefId, beatId);
    }

    // When the scene actually BEGAN, which is the first thing ticked rather
    // than the moment the brief was opened — a GM reads ahead long before
    // they run anything, and pacing measured from reading is a lie.
    const startedAt = state.startedAt ?? ticked[beatId]?.at ?? null;
    await writeRunState(briefId, { ...state, ticked, ...(startedAt ? { startedAt } : {}) });
    // A beat marked done folds back to its one struck line, and so does the
    // last check's consequence: ticking the next thing is the GM saying they
    // have moved on from it.
    const view = this.#viewFor(briefId);
    view.opened = view.opened.filter((id) => id !== beatId);
    view.resolvedId = null;
    this.render({});
  }

  /**
   * Record how a check actually came out.
   *
   * Ticks the beat as a side effect, because a check that produced a degree
   * self-evidently happened — asking the GM to click twice for one event is
   * the kind of bookkeeping doctrine §10.1 says will simply not get done.
   * Clicking the same degree again clears it back to an untouched beat.
   *
   * Also logs the degree, one entry per attempt -- run state's own
   * `ticked[beatId]` only ever keeps the LATEST outcome, which is right for
   * branching (a beat is either gated open or not, by its current state) but
   * wrong for the question "how many times has this actually landed on each
   * degree" (requested 2026-09-19). The log is append-only, so this is the
   * one place that history can live without a run-state schema change.
   * core/scene-brief.mjs#outcomeTally reads it back out.
   */
  static async #onRecordOutcome(event, target) {
    const briefId = currentBriefId();
    const beatId = target.dataset.beatId;
    const degree = target.dataset.degree;
    const state = runStateFor(briefId);
    const ticked = { ...state.ticked };

    if (ticked[beatId]?.degree === degree) {
      delete ticked[beatId];
    } else {
      ticked[beatId] = { at: new Date().toISOString(), degree };
      fireBeatAudio(briefId, beatId);
      // Keep this beat open on its consequence (core/runner-view.mjs
      // #beatDetailOpen's one exception) — the GM is about to say it.
      this.#viewFor(briefId).resolvedId = beatId;
      // Awaited, and BEFORE the render below -- a fire-and-forget write here
      // raced the very next render's own read of the log (found live: the
      // tally never appeared on the first click, only after a second
      // unrelated re-render had given the write time to land).
      const beat = this.#beat(beatId);
      const check = beat ? checkFor(beat, this._scene?.challenges ?? {}) : null;
      try {
        await recordLogEntry({
          text: `${degree} on ${check?.name ?? beat?.text ?? beatId}.`,
          nowIso: new Date().toISOString(),
          scene: canvas?.scene?.name ?? null,
          subject: outcomeLogSubject(beatId, degree)
        });
      } catch (err) {
        console.error("Blank Inheritance | Could not log that outcome:", err);
      }
    }

    await writeRunState(briefId, { ...state, ticked });
    this.render({});
  }

  /**
   * Record which way a `choicePoint` actually went (design/scene-triggers-and-depth.md
   * §2.4, ux-doctrine.md Law 21) -- same toggle-and-log shape as
   * #onRecordOutcome just above: clicking the same option again clears it
   * back to undecided, and `ticked[beatId]` is replaced wholesale rather than
   * merged, matching that same precedent (a beat is authored as either a
   * check or a choice, never both, so there is nothing to lose).
   */
  static async #onRecordChoice(event, target) {
    const briefId = currentBriefId();
    const beatId = target.dataset.beatId;
    const optionId = target.dataset.optionId;
    const state = runStateFor(briefId);
    const ticked = { ...state.ticked };

    if (ticked[beatId]?.choice === optionId) {
      delete ticked[beatId];
    } else {
      ticked[beatId] = { at: new Date().toISOString(), choice: optionId };
      fireBeatAudio(briefId, beatId);
      this.#viewFor(briefId).resolvedId = beatId;
      const beat = this.#beat(beatId);
      const option = (beat?.choicePoint?.options ?? []).find((o) => o.id === optionId);
      try {
        await recordLogEntry({
          text: `${option?.label ?? optionId}${beat?.choicePoint?.label ? ` — ${beat.choicePoint.label}` : ""}.`,
          nowIso: new Date().toISOString(),
          scene: canvas?.scene?.name ?? null,
          subject: choiceLogSubject(beatId, optionId)
        });
      } catch (err) {
        console.error("Blank Inheritance | Could not log that choice:", err);
      }
    }

    await writeRunState(briefId, { ...state, ticked });
    this.render({});
  }

  /**
   * Mark one scene-level temptation as having actually been said at the
   * table (design/scene-triggers-and-depth.md §3). Unlike a beat trigger or
   * a choicePoint, nothing here gates or brands anything -- a temptation can
   * be reused as often as the GM likes, so this only ever logs, it never
   * writes run state, and there is nothing on screen for it to change.
   */
  static async #onUseTemptation(event, target) {
    const temptationId = target.dataset.temptationId;
    const temptation = (this._scene?.brief?.temptations ?? []).find((t) => t.id === temptationId);
    if (!temptation) {
      console.error(`Blank Inheritance | Used temptation "${temptationId}", which is no longer in this brief's own temptations[].`);
      return;
    }
    try {
      await recordLogEntry({
        text: `Temptation used: ${temptation.text}`,
        nowIso: new Date().toISOString(),
        scene: canvas?.scene?.name ?? null,
        subject: temptationLogSubject(temptationId)
      });
    } catch (err) {
      console.error("Blank Inheritance | Could not log that temptation:", err);
    }
  }

  static async #onOpenBeat(event, target) {
    const briefId = currentBriefId();
    const state = runStateFor(briefId);
    const beatId = target.dataset.beatId;
    if (state.opened.includes(beatId)) return;
    await writeRunState(briefId, { ...state, opened: [...state.opened, beatId] });
    // Bringing a beat in means it is happening now.
    this.#focus(beatId);
    this.render({});
  }

  /**
   * Open or fold one beat's detail. The row itself is the button (a
   * role="button" div, since it holds the tick and trigger chips, which a
   * real <button> may not contain).
   *
   * Opening a later beat to read ahead does NOT move the "now" marker: the
   * GM is peeking, and the beat they are running stays open beside it.
   */
  static #onToggleBeatDetail(event, target) {
    // A drag across the text to select it is reading, not a request to fold.
    if (String(globalThis.getSelection?.() ?? "").trim()) return;
    const view = this.#viewFor(currentBriefId());
    const isOpen = target.getAttribute("aria-expanded") === "true";
    Object.assign(view, toggleDetail(target.dataset.beatId, isOpen, view));
    this.render({});
  }

  /** Open or fold the opening or the ending section, overriding its own phase for the rest of this scene. */
  static #onToggleBookend(event, target) {
    const section = target.dataset.section;
    if (section !== "intro" && section !== "outro") return;
    const view = this.#viewFor(currentBriefId());
    view.bookends = { ...view.bookends, [section]: target.getAttribute("aria-expanded") !== "true" };
    this.render({});
  }

  /** Open or fold one cast member's card. */
  static #onTogglePerson(event, target) {
    const castId = target.dataset.castId;
    if (!castId) return;
    const view = this.#viewFor(currentBriefId());
    view.people = { ...view.people, [castId]: target.getAttribute("aria-expanded") !== "true" };
    this.render({});
  }

  /**
   * Every beat's detail at once, or back to one line each. How a script is
   * read the afternoon before, not how it is run — so it is remembered per
   * GM (the folds setting), and off by default.
   */
  static async #onToggleShowAll() {
    await game.settings.set(MODULE_ID, SETTING_FOLDS, { ...folds(), detail: !(folds().detail === true) });
    this.render({});
  }

  /**
   * Take one portrait off the stage the table is looking at — a brief's own
   * cast member, a summoned Actor, anyone. The old panel could put a brief's
   * cast ON the stage but had no way to take them off again short of a
   * trigger in the prose.
   */
  static async #onUnstagePerson(event, target) {
    const scene = canvas?.scene;
    const portraitId = target.dataset.portraitId;
    if (!scene || !portraitId) return;
    await removeFromStage(scene, portraitId);
    this.render({});
  }

  /**
   * Use one particular rolled result as the beat's (or topic's) outcome — the
   * GM's pick when more than one player rolled, or overriding the result that
   * recorded itself. Reads the result back out of the real chat message rather
   * than trusting the button's own copy of it.
   */
  static async #onUseRoll(event, target) {
    const message = game.messages?.get(target.dataset.messageId);
    const result = message ? resultFromMessage(message) : null;
    if (!result) return;
    await recordRollResult(result, { force: true });
  }

  /** The header's Rules key: bring the search box into view and put the cursor in it. */
  static #onFocusRules() {
    const input = this.element?.querySelector(".bi-runner__rules-input");
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }

  /**
   * Start a note with one of the log's own tags (core/log-entry.mjs's
   * LOG_TAGS) — the typed `decision:` prefix the log already understands,
   * one click instead of remembered. Replaces a tag already there rather than
   * stacking two, and leaves the cursor at the end, ready to type.
   */
  static #onNoteTag(event, target) {
    const input = this.element?.querySelector(".bi-runner__note-input");
    const tag = target.dataset.tag;
    if (!input || !tag) return;
    const rest = input.value.replace(/^[a-z]+:\s*/i, "");
    input.value = `${tag}: ${rest}`;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /**
   * A result arrived and recorded itself against this beat (the chat hook
   * below): keep the beat open on its consequence, the same as a recorded
   * click would.
   */
  markResolved(beatId) {
    if (!beatId) return;
    this.#viewFor(currentBriefId()).resolvedId = beatId;
  }

  /** A beat's own `gmTool` button (#176) -- looked up in GM_TOOLS, never called from a raw string the template made up. */
  static #onOpenGmTool(event, target) {
    const tool = GM_TOOLS[target.dataset.toolId];
    if (!tool) {
      console.error(`Blank Inheritance | Beat data names gmTool "${target.dataset.toolId}", which isn't in scene-runner.mjs's own GM_TOOLS registry.`);
      return;
    }
    tool();
  }

  /**
   * Fire one inline `<trig id="..."/>` chip (design/scene-triggers-and-depth.md
   * §2) -- the same five jobs a beat's own action row already offers (stage a
   * cast member, reveal a handout, open a GM tool, post a check, or just mark
   * a moment), reached from the exact word in the prose that calls for it
   * instead of only a click below the text. Every kind is a thin dispatch to
   * a function that already exists elsewhere in this file (doctrine Law 18,
   * applied to our own code this time) -- nothing here recomputes anything.
   *
   * Logging is NOT unconditional the way §2.3 first put it: a kind with its
   * own cancel/fail path (reveal-handout's confirm dialog, post-check's own
   * try/catch) only logs once the thing actually happened, per §2.5 -- "a
   * false mechanical record is worse than a missing one." A kind with no such
   * path (npc-enter/npc-exit/gm-tool/note) logs unconditionally, same as
   * every other trigger.
   */
  static async #onFireTrigger(event, target) {
    const beatId = target.dataset.beatId;
    const triggerId = target.dataset.triggerId;
    const brief = this._scene?.brief;
    const beat = this.#beat(beatId);
    // "intro"/"outro" are not real beats -- a scene's own opening/closing
    // narration has nowhere else to attach a trigger, so those two ids are
    // matched against the brief's own intro.triggers/outro.triggers instead
    // (design/scene-triggers-and-depth.md §2, extended for intro/outro).
    const triggerSource =
      beat?.triggers ?? (beatId === "intro" ? brief?.intro?.triggers : beatId === "outro" ? brief?.outro?.triggers : null) ?? [];
    const trigger = triggerSource.find((t) => t.id === triggerId);
    if (!trigger) {
      console.error(`Blank Inheritance | Fired trigger "${triggerId}" on beat "${beatId}", which no longer names it in that beat's own triggers[].`);
      return;
    }
    // Firing something from a beat's own prose means that beat is being run.
    this.#focus(beatId);

    const logFired = () =>
      recordLogEntry({
        text: trigger.label ?? trigger.id,
        nowIso: new Date().toISOString(),
        scene: canvas?.scene?.name ?? null,
        subject: triggerLogSubject(beatId, triggerId)
      }).catch((err) => console.error("Blank Inheritance | Could not log that trigger:", err));

    switch (trigger.kind) {
      case "npc-enter": {
        const scene = canvas?.scene;
        if (!scene) {
          ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Runner.NoSceneToStage"));
          return;
        }
        const member = castFor(brief, trigger.npcRef);
        if (!member) {
          console.error(`Blank Inheritance | Trigger "${triggerId}" names npcRef "${trigger.npcRef}", which isn't in this brief's cast.`);
          return;
        }
        // The exact call #onStagePerson already makes by hand, just fired
        // from inline prose instead of a Cast-fold click -- see its own
        // comments above for why each field is shaped the way it is.
        await summonToStage(scene, {
          id: stageIdFor(member),
          name: displayName(member),
          img: member.img ?? stagePortraitFor(stageIdFor(member)),
          isPc: false,
          sting: trigger.arrival || member.arrival || undefined
        });
        await logFired();
        this.render({});
        return;
      }
      case "npc-exit": {
        const scene = canvas?.scene;
        if (!scene) return;
        const member = castFor(brief, trigger.npcRef);
        if (!member) {
          console.error(`Blank Inheritance | Trigger "${triggerId}" names npcRef "${trigger.npcRef}", which isn't in this brief's cast.`);
          return;
        }
        await removeFromStage(scene, portraitIdFor(member));
        await logFired();
        this.render({});
        return;
      }
      case "reveal-handout": {
        let users = null;
        if (trigger.solo) {
          const user = await pickOnePlayer();
          if (!user) return;
          users = [user];
        }
        const revealed = await revealHandout(trigger.handoutRef, this._scene, users);
        if (revealed) await logFired();
        return;
      }
      case "gm-tool": {
        const tool = GM_TOOLS[trigger.toolId];
        if (!tool) {
          console.error(`Blank Inheritance | Trigger "${triggerId}" names gmTool "${trigger.toolId}", which isn't in scene-runner.mjs's own GM_TOOLS registry.`);
          return;
        }
        tool();
        await logFired();
        return;
      }
      case "post-check": {
        const challenges = this._scene?.challenges ?? {};
        const check = checkFor({ challengeRef: beat?.challengeRef, checkRef: trigger.checkRef }, challenges);
        if (!check) {
          console.error(`Blank Inheritance | Trigger "${triggerId}" names checkRef "${trigger.checkRef}", which isn't in beat "${beatId}"'s own challenge.`);
          return;
        }
        const dc = postedDc(
          check.dc?.value ?? null,
          hiddenAdjustment(brief.gmModifiers ?? [], { challengeRef: beat?.challengeRef, locationKey: brief.sceneRef })
        );
        try {
          await ChatMessage.create({ content: enrichersFor({ skillOptions: checkSkills(check), dc, options: rollTagFor(brief.id, beatId) }) });
          await logFired();
        } catch (err) {
          console.error("Blank Inheritance | Could not post that check:", err);
          ui.notifications.warn(String(err?.message ?? err));
        }
        return;
      }
      case "note":
      default:
        await logFired();
    }
  }

  /**
   * Move a scene's clock by hand, one step (2026-09-24).
   *
   * Authored spends are the named, costed moves ("interview a shopkeeper:
   * -1 wall"); this is the GM's own hand on the dial for everything else —
   * the compactor grinding another round, a player buying a turn back. The
   * Compactor Cycle authors no spends at all, so before this its clock could
   * not move in the runner. Clamped to the pool's own floor and ceiling, and
   * written to the log like any other thing that changed the scene.
   */
  static async #onNudgeClock(event, target) {
    const briefId = currentBriefId();
    const subsystem = this._scene?.subsystem;
    const delta = Math.sign(Number(target.dataset.delta) || 0);
    const state = runStateFor(briefId);
    const clock = subsystem ? clockState(subsystem, state) : null;
    if (!clock || !delta) return;
    if ((delta > 0 && !clock.canRaise) || (delta < 0 && !clock.canLower)) return;
    const adjust = { ...(state.adjust ?? {}), [clock.poolId]: (Number(state.adjust?.[clock.poolId]) || 0) + delta };
    await writeRunState(briefId, { ...state, adjust });
    const after = clockState(subsystem, { ...state, adjust });
    recordLogEntry({
      text: `${after.name}: ${clock.current} → ${after.current}.`,
      nowIso: new Date().toISOString(),
      scene: canvas?.scene?.name ?? null,
      subject: `clock::${clock.poolId}`
    }).catch((err) => console.error("Blank Inheritance | Could not log that clock change:", err));
    this.render({});
  }

  // Spends are a LIST, not a set: interviewing a second shopkeeper costs
  // another wall, and deduplicating would make every repeat free.
  static async #onSpend(event, target) {
    const briefId = currentBriefId();
    const state = runStateFor(briefId);
    await writeRunState(briefId, { ...state, spent: [...state.spent, target.dataset.spendId] });
    this.render({});
  }

  /**
   * Cut the whole table to one of this brief's backdrops.
   *
   * SCENE -> MAP -> SCENE (data/campaign/scene-set.json's own rule): when the
   * scene being left and the one being cut to carry different `locationRef`
   * flags (foundry/scene-build.mjs stamps every real Scene with its own),
   * the table goes by way of the campaign map, watching the party's marker
   * travel between the two real places first. A cut within the same
   * location — a sub-room, or nothing has activated yet — stays the plain
   * cut it always was.
   */
  static async #onCutTo(event, target) {
    const targetSceneId = target.dataset.sceneId;
    // issue #168: a deliberate "cut to this scene" click is exactly the kind
    // of cue the Approvals Desk gate is for -- checked and, if needed,
    // confirmed BEFORE deciding whether to travel or cut directly, since
    // neither branch should run at all if the GM declines.
    const { cueScene, checkCueGate, confirmDraftedSceneCue } = await import("./director-panel.mjs");
    const gate = await checkCueGate(targetSceneId);
    if (!gate.allowed && !(await confirmDraftedSceneCue(gate.status))) return;

    const fromRef = game.scenes.active?.getFlag(MODULE_ID, "locationRef") ?? null;
    const toRef = game.scenes.get(targetSceneId)?.getFlag(MODULE_ID, "locationRef") ?? null;

    if (needsTravel(fromRef, toRef)) {
      await runTravelSequence(fromRef, toRef, targetSceneId);
    } else {
      await cueScene(targetSceneId);
    }
    this.render({});
  }

  /**
   * Put one of the scene's own cast on the stage the table is looking at.
   *
   * #onSummonActor below does this for any real Actor in the world; this does
   * it for the people the BRIEF names, who mostly have no Actor at all -- which
   * is the common case in a theatre-of-the-mind scene and the one that
   * previously meant leaving the script to go and find them.
   */
  static async #onStagePerson(event, target) {
    const scene = canvas?.scene;
    if (!scene) return ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Runner.NoSceneToStage"));
    const member = (this._scene?.brief?.cast ?? []).find((m) => portraitIdFor(m) === target.dataset.portraitId);
    if (!member) return;
    await summonToStage(scene, {
      id: stageIdFor(member),
      // core's own displayName, not a second fallback chain: it is what the
      // panel's heading uses, and a stage that labels someone differently from
      // the script beside it is worse than either label alone. It also keeps
      // the naming-placeholder rule (an unnamed NPC shows their role).
      name: displayName(member),
      img: member.img ?? stagePortraitFor(stageIdFor(member)),
      isPc: false,
      // The brief's own authored arrival tier (scene-brief.schema.json's
      // `arrival`) fires Announced/Splash automatically on the beats that
      // called for it, rather than depending on the Director remembering to
      // click it live — castMemberFromDescriptor falls back to "quiet" for
      // null/undefined, same as a plain summon.
      sting: member.arrival || undefined
    });
    this.render({});
  }

  /**
   * Summon ANY real Actor onto the stage — folded in 2026-09-18 from what
   * used to be its own standalone panel+button (Ingram's own call: the
   * summon UI belongs inside the script a GM is already looking at, not a
   * second floating thing). Distinct from #onStagePerson above: this reaches
   * every Actor in the world, not just the ones this scene's own brief named.
   */
  static async #onSummonActor(event, target) {
    const actor = game.actors.get(target.dataset.actorId);
    if (!actor || !canvas?.scene) return;
    await summonToStage(canvas.scene, {
      id: actor.id,
      name: actor.name,
      img: actor.img,
      actorId: actor.id,
      isPc: actor.hasPlayerOwner
    });
    this.render({});
  }

  static async #onDismissActor(event, target) {
    if (!canvas?.scene) return;
    await removeFromStage(canvas.scene, `summon-${target.dataset.actorId}`);
    this.render({});
  }

  /**
   * One line about what just happened, attached to the beat that just happened.
   *
   * Straight into the session log with the beat as its `subject`, which is
   * what `recordLogEntry` already carries that field for. No dialogue, no
   * confirmation: doctrine §10.3's whole argument is that capture during a
   * scene has to cost nothing or it stops happening.
   */
  /**
   * design/ux-doctrine.md §10.7's Rules drawer: "a search box over the...
   * locally mirrored SRD articles... buildable today and answers the
   * rulebook's own first-listed GM priority, answering questions quickly and
   * decisively." Same type-and-press-enter idiom as the note bar (§10.3:
   * "Type. Press enter. Done.") -- one shape for both, rather than a second
   * interaction a GM has to learn.
   */
  static async #onSearchRules(event) {
    const input = this.element.querySelector(".bi-runner__rules-input");
    const query = input?.value?.trim() ?? "";
    this.#rulesQuery = query;
    this.#rulesResults = query ? searchRules(await loadRulesIndex(), query) : [];
    this.render({});
  }

  static async #onNote(event) {
    const input = this.element.querySelector(".bi-runner__note-input");
    const text = input?.value?.trim();
    if (!text) return;
    const briefId = currentBriefId();
    const target = noteTargetFor(beatsWithState(this._scene?.brief ?? {}, runStateFor(briefId)), runStateFor(briefId));
    try {
      await recordLogEntry({
        text,
        nowIso: new Date().toISOString(),
        scene: canvas?.scene?.name ?? null,
        subject: target?.id ?? briefId
      });
      input.value = "";
      this.render({});
    } catch (err) {
      console.error("Blank Inheritance | Could not record the note:", err);
      ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Console.Log.SaveFailed"));
    }
  }

  static #onOpenPalette() {
    import("./director-palette.mjs").then((m) => m.toggleDirectorPalette());
  }

  /**
   * Pick a scene from the episode's own running order AND cue it — one
   * action, not two. Doctrine §10.7 always described the scene list as
   * having "a cue button" per entry; until 2026-09-19 this only ever loaded
   * the brief for reading, leaving the actual Foundry canvas wherever it
   * already was. A GM who wanted to both read AND show a scene had to pick
   * it here, THEN separately hunt down that brief's own backdrop thumbnail
   * (which only appears after the switch) and click that too — a real,
   * reported gap ("the scene tells me to do something and I can't see an
   * immediate way to do that" — Ingram, 2026-09-19, about a different
   * button, but the same disease).
   *
   * Ordering is deliberate: the brief switches and renders FIRST (a GM reads
   * ahead long before they run anything — core/scene-brief.mjs#pacing's own
   * reasoning), so the close dialogue (if offered) appears immediately at
   * the moment of leaving, not stalled behind a 20-30s map crossing. The
   * table's own journey happens after, via the identical needsTravel/
   * runTravelSequence path #onCutTo already uses.
   */
  static async #onCueScene(event, target) {
    const leaving = currentBriefId();
    const briefId = target.dataset.briefId ?? "";
    if (!briefId || briefId === leaving) return;

    await game.settings.set(MODULE_ID, SETTING_BRIEF, briefId);
    applySceneAudio(briefId);
    this.render({});

    // design/ux-doctrine.md §10.3a puts the close dialogue "on cueing the next
    // scene", and calls it the one place friction is wanted. Offered AFTER the
    // switch rather than blocking it: a GM moving on should move on, and an
    // unfinished scene is a real state the dialogue itself handles ("it stays
    // open and carries forward").
    if (leaving && shouldOfferClose(runStateFor(leaving))) {
      const brief = this._scene?.brief?.id === leaving ? this._scene.brief : null;
      openSceneCloseDialogue({ briefRef: leaving, title: brief?.title ?? leaving, mode: brief?.mode ?? null, reactionPrompts: brief?.reactionPrompts ?? [] });
    }

    // THEN move the table, if the new brief has a built Scene at all — a
    // script-only brief with nothing built yet is a legitimate state (most
    // of Session 0/1's own content predates this pipeline), and switching
    // to one must never throw or block on a missing backdrop.
    const targetSceneId = backdropsFor(briefId)[0]?.id;
    if (!targetSceneId || game.scenes.active?.id === targetSceneId) return;

    // issue #168: same gate as #onCutTo, checked after the GM's own brief
    // view has already switched (the ordering this function's own header
    // explains) but before the TABLE is shown anything.
    const { cueScene, checkCueGate, confirmDraftedSceneCue } = await import("./director-panel.mjs");
    const gate = await checkCueGate(targetSceneId);
    if (!gate.allowed && !(await confirmDraftedSceneCue(gate.status))) return;

    const fromRef = game.scenes.active?.getFlag(MODULE_ID, "locationRef") ?? null;
    const toRef = game.scenes.get(targetSceneId)?.getFlag(MODULE_ID, "locationRef") ?? null;
    if (needsTravel(fromRef, toRef)) {
      await runTravelSequence(fromRef, toRef, targetSceneId);
    } else {
      await cueScene(targetSceneId);
    }
  }

  /** Light/dark, shared with the Close Scene dialogue (2026-09-19 redesign) — see foundry/runner-theme.mjs. */
  static async #onToggleTheme() {
    await setRunnerTheme(currentRunnerTheme() === "dark" ? "light" : "dark");
    this.render({});
  }

  /** Open the always-available Summon section and bring it into view — the header's own one-tap entry point into it, per Law 7. */
  static #onJumpToSummon() {
    const details = this.element.querySelector('.bi-runner__section[data-section="summon"]');
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** The explicit act, from the foot of the running order where a GM finishes. */
  static #onCloseScene() {
    openSceneCloseDialogue({
      briefRef: currentBriefId(),
      title: this._scene?.brief?.title ?? null,
      mode: this._scene?.brief?.mode ?? null,
      reactionPrompts: this._scene?.brief?.reactionPrompts ?? []
    });
  }

  /**
   * Post the check for the table to roll.
   *
   * The DC posted is already adjusted by any hidden modifier, so the player
   * rolls against a number nobody tells them and we never touch their sheet
   * (Law 18 — never recompute what sf2e already computes; the `@Check`
   * enricher is sf2e's own, with 1,586 uses in the shipped compendia).
   *
   * EVERY listed skill option is posted, not just the first — found live
   * 2026-09-19: the button already shows all of them ("PERCEPTION / MEDICINE
   * / SOCIETY 17"), but only ever posted Perception. `enrichersFor` posts
   * one real inline check per skill, joined by "or", so whichever character
   * actually has Society rolls Society.
   */
  static async #onPostCheck(event, target) {
    const beat = this.#beat(target.dataset.beatId);
    const check = beat ? checkFor(beat, this._scene?.challenges ?? {}) : null;
    if (!check) return;

    const brief = this._scene.brief;
    const dc = postedDc(check.dc?.value ?? null, hiddenAdjustment(brief.gmModifiers ?? [], {
      challengeRef: beat.challengeRef,
      locationKey: brief.sceneRef
    }));
    // Posting a beat's check is running that beat.
    this.#focus(beat.id);

    try {
      // Tagged with this brief and beat, so the result a player rolls from it
      // records itself here (the createChatMessage hook below).
      await ChatMessage.create({ content: enrichersFor({ skillOptions: checkSkills(check), dc, options: rollTagFor(brief.id, beat.id) }) });
      this.render({});
    } catch (err) {
      console.error("Blank Inheritance | Could not post that check:", err);
      ui.notifications.warn(String(err?.message ?? err));
    }
  }

  /** The raw, authored coercible topic this many-selectors-deep action targets — re-read from `this._scene.brief` fresh, same discipline as `#beat` above, never trusted from a stale render. */
  #coercibleTopic(castId, index) {
    const member = this._scene?.brief?.cast?.find((m) => m.id === castId);
    return member?.brief?.coercible?.[index] ?? null;
  }

  /** Post a coercible topic's own check — identical body to #onPostCheck, addressed by castId+index instead of a beatId, since a topic is not a beat. */
  static async #onPostTopicCheck(event, target) {
    const topic = this.#coercibleTopic(target.dataset.castId, Number(target.dataset.topicIndex));
    const check = topic ? checkFor(topic, this._scene?.challenges ?? {}) : null;
    if (!check) return;

    const brief = this._scene.brief;
    const dc = postedDc(check.dc?.value ?? null, hiddenAdjustment(brief.gmModifiers ?? [], {
      challengeRef: topic.challengeRef,
      locationKey: brief.sceneRef
    }));
    const topicKey = `${target.dataset.castId}:coercible:${Number(target.dataset.topicIndex)}`;

    try {
      await ChatMessage.create({ content: enrichersFor({ skillOptions: checkSkills(check), dc, options: rollTagFor(brief.id, topicKey) }) });
    } catch (err) {
      console.error("Blank Inheritance | Could not post that check:", err);
      ui.notifications.warn(String(err?.message ?? err));
    }
  }

  /**
   * Record how a coercible topic's check actually came out — the other half
   * of #onPostTopicCheck, mirroring #onRecordOutcome's own shape but writing
   * to `state.topics`, never `state.ticked`: a topic is a side conversation,
   * not a beat, and must never participate in beat-branch logic. Clicking
   * the same degree again clears it, same toggle behaviour as a beat.
   */
  static async #onRecordTopicOutcome(event, target) {
    const briefId = currentBriefId();
    const castId = target.dataset.castId;
    const index = target.dataset.topicIndex;
    const topicKey = `${castId}:coercible:${index}`;
    const degree = target.dataset.degree;
    const state = runStateFor(briefId);
    const topics = { ...state.topics };

    if (topics[topicKey]?.degree === degree) {
      delete topics[topicKey];
    } else {
      topics[topicKey] = { at: new Date().toISOString(), degree };
      const topic = this.#coercibleTopic(castId, Number(index));
      try {
        await recordLogEntry({
          text: `${degree} on "${topic?.topic ?? topicKey}".`,
          nowIso: new Date().toISOString(),
          scene: canvas?.scene?.name ?? null,
          subject: outcomeLogSubject(topicKey, degree)
        });
      } catch (err) {
        console.error("Blank Inheritance | Could not log that outcome:", err);
      }
    }

    await writeRunState(briefId, { ...state, topics });
    this.render({});
  }

  /**
   * Hand something over for keeps.
   *
   * Different in kind from revealing a handout, and the difference is the whole
   * point. A handout is SHOWN — Foundry opens it with temporary ownership that
   * reverts the moment the player closes the window. An artefact is GIVEN: its
   * ownership is written to the database, it appears in their own journal
   * directory, and it is still there in Chapter 7 when somebody re-reads it and
   * notices the thing they walked past in Chapter 1.
   *
   * One-way on purpose. There is no ungrant here and there is none in
   * core/scene-brief.mjs either — un-showing something six people have already
   * read is not a thing software can do, and a button that pretended otherwise
   * would be worse than no button.
   */
  static async #onGrantArtefact(event, target) {
    const briefId = currentBriefId();
    const artefactId = target.dataset.artefactId;
    const artefact = (this._scene?.brief?.artefacts ?? []).find((a) => a.id === artefactId);
    if (!artefact) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("BLANKINHERITANCE.Runner.Grant") },
      content: `<p>${game.i18n.format("BLANKINHERITANCE.Runner.GrantConfirm", { title: artefact.title })}</p>
                <p><em>${game.i18n.localize("BLANKINHERITANCE.Runner.GrantConfirmHint")}</em></p>`
    }).catch(() => false);
    if (!confirmed) return;

    try {
      const page = await ensureHandoutPage(artefact);
      if (!page) return;

      // The permanent half: written to the database rather than granted for the
      // life of one window. OBSERVER, not OWNER -- they can read it and cannot
      // edit it, which is the right grade for a document somebody else wrote.
      await page.parent.update({ "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });

      // And show it once, immediately, so the moment of getting it is a moment
      // rather than something they find later in a directory.
      await foundry.documents.collections.Journal.show(page, { force: true, users: [] });

      const state = runStateFor(briefId);
      if (!state.granted.includes(artefactId)) {
        await writeRunState(briefId, { ...state, granted: [...state.granted, artefactId] });
      }
      ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.Granted", { title: artefact.title }));
      this.render({});
    } catch (err) {
      console.error("Blank Inheritance | Could not hand over that artefact:", err);
      ui.notifications.error(String(err?.message ?? err));
    }
  }

  static #onRevealHandout(event, target) {
    return revealHandout(target.dataset.handoutId, this._scene, null);
  }

  static async #onRevealHandoutSolo(event, target) {
    const user = await pickOnePlayer();
    if (!user) return;
    return revealHandout(target.dataset.handoutId, this._scene, [user]);
  }

  #beat(beatId) {
    const brief = this._scene?.brief;
    if (!brief) return null;
    return beatsWithState(brief, runStateFor(brief.id)).find((b) => b.id === beatId) ?? null;
  }

  get open() {
    return this.#open;
  }

  /** Open or close the drawer from outside its own button, same idiom as Phone/ConsoleWindow. */
  toggle() {
    SceneRunner.#onToggle.call(this);
  }

  static #onToggle() {
    this.#open = !this.#open;
    // Opening or shutting the drawer moves the edge everything else fits
    // against — the deck, the rail, a staged scene's camera.
    Promise.resolve(this.render({})).then(() => relayoutAroundRunner());
  }
}

/* ---------------------------------------------------------------- */
/*  Handouts                                                         */
/* ---------------------------------------------------------------- */

/**
 * Ask which single player should see something.
 *
 * This is the whole point of the `solo` delivery: the alternative a GM
 * reaches for otherwise is a separate chat channel, which strands the rest
 * of the table for as long as it takes. Foundry can put a document in front
 * of exactly one person, in the room, in seconds.
 */
async function pickOnePlayer() {
  const players = game.users.filter((u) => u.active && !u.isGM);
  if (!players.length) {
    ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Runner.NoPlayers"));
    return null;
  }
  // Escaped by hand rather than through a helper: a user's display name is
  // player-supplied text going into markup, and this is not the place to
  // find out which escaping utility this Foundry version exposes.
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const options = players.map((u) => `<option value="${u.id}">${escape(u.name)}</option>`).join("");
  const chosen = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("BLANKINHERITANCE.Runner.PickPlayer") },
    content: `<p>${game.i18n.localize("BLANKINHERITANCE.Runner.PickPlayerHint")}</p><select name="user">${options}</select>`,
    ok: { callback: (event, button) => button.form.elements.user.value }
  }).catch(() => null);
  return chosen ?? null;
}

/**
 * Put a document in front of the table, or one person.
 *
 * ALWAYS behind a confirm, never automatic — Law 17: "Confirm anything the
 * players will see... revealing a document, pushing a check." The panel does
 * every part of the preparation so that the confirm is one deliberate click
 * at the moment the GM chooses, which is the whole of "easy" without any of
 * "automatic".
 *
 * The push is transient by design: Foundry opens the journal on the target's
 * screen with temporary ownership that reverts when they close it, so
 * showing something is not the same act as filing it in their records.
 */
/**
 * Returns whether the handout was actually shown -- `false` for a missing
 * handout, a cancelled confirm, or a thrown error, so a caller that logs a
 * trigger press (scene-triggers-and-depth.md §2.5) can tell a real reveal
 * from a GM who backed out of the confirm dialog. Existing callers below
 * ignore the return value, same as before this was added.
 */
async function revealHandout(handoutId, scene, users) {
  const handout = (scene?.brief?.handouts ?? []).find((h) => h.id === handoutId);
  if (!handout) return false;

  const who = users?.length
    ? game.users.get(users[0])?.name ?? "?"
    : game.i18n.localize("BLANKINHERITANCE.Runner.Everyone");

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("BLANKINHERITANCE.Runner.Reveal") },
    content: `<p>${game.i18n.format("BLANKINHERITANCE.Runner.RevealConfirm", { title: handout.title, who })}</p>
              <p><em>${game.i18n.localize("BLANKINHERITANCE.Runner.RevealConfirmHint")}</em></p>`
  }).catch(() => false);
  if (!confirmed) return false;

  try {
    if (handout.imagePath) {
      foundry.documents.collections.Journal.showImage(handout.imagePath, {
        title: handout.title,
        users: users ?? []
      });
    } else {
      const page = await ensureHandoutPage(handout);
      if (!page) return false;
      await foundry.documents.collections.Journal.show(page, { force: true, users: users ?? [] });
    }
    ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.Revealed", { title: handout.title, who }));
    return true;
  } catch (err) {
    console.error("Blank Inheritance | Could not reveal that handout:", err);
    ui.notifications.error(String(err?.message ?? err));
    return false;
  }
}

/**
 * The Foundry page a handout shows.
 *
 * An authored `body` is materialised into a real JournalEntry on first
 * reveal, under a deterministic id — so a handout that exists only for one
 * scene needs no separate file, no sync run, and no manual setup, and
 * editing the brief and re-pushing updates it in place rather than leaving a
 * second copy behind.
 */
async function ensureHandoutPage(handout) {
  const entryId = await deriveFoundryId(`handout-${handout.id}`);
  let entry = game.journal.get(entryId);

  if (!entry) {
    entry = await JournalEntry.create(
      {
        _id: entryId,
        name: handout.title,
        // GM-only until a reveal explicitly puts it in front of someone.
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
        flags: { [MODULE_ID]: { sourceId: handout.id } }
      },
      { keepId: true }
    );
  }
  if (!entry) return null;

  const name = handout.pageName ?? handout.title;
  const existing = entry.pages.find((p) => p.name === name);
  const content = handout.body ?? "";

  if (existing) {
    if (content && existing.text?.content !== content) await existing.update({ "text.content": content });
    return existing;
  }
  const [created] = await entry.createEmbeddedDocuments("JournalEntryPage", [
    { name, type: "text", text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML } }
  ]);
  return created ?? null;
}

/* ---------------------------------------------------------------- */
/*  The singleton                                                    */
/* ---------------------------------------------------------------- */

let active = null;

export function getSceneRunner() {
  return active;
}

/**
 * Mount for a GM, and for nobody else.
 *
 * The seat check is here rather than inside the class so a player's browser
 * never constructs it at all — the same structural guarantee the command bar
 * gets from choosing DirectorBar or PlayerBar once, at mount.
 */
// A confirmed closure stamps the brief it closed, so the prompt on leaving
// fires once rather than every time -- and, when the closure was a clean
// one, carries the table onward.
//
// `advances` rather than `complete` as of the 2026-09-22 dialogue rebuild:
// core/scene-close.mjs now folds BOTH reasons to stay put into one field --
// an unfinished scene ("carries forward", the original reason) and a PANIC
// verdict, which means the GM is in trouble right now and teleporting the
// table to the next location is the last thing that should happen. Deriving
// that rule a second time here is exactly how the two would drift.
Hooks.on("blank-inheritance.sceneClosed", ({ briefRef, advances } = {}) => {
  if (!briefRef) return;
  markClosed(briefRef)
    .then(() => (advances ? advanceAfterClose(briefRef) : null))
    .then(() => refreshSceneRunner())
    .catch((err) => console.error("Blank Inheritance | Could not advance after closing the scene:", err));
});

/**
 * The table's own active scene is what actually decides what the panel
 * shows — not only its own picker.
 *
 * Found live 2026-09-18: cutting to a scene through anything OTHER than the
 * runner's own #onCutTo (a map pin's @Scene link, the Director's Panel,
 * Foundry's native Scene Directory) left the panel showing whatever brief
 * was picked last, or genuinely blank if none ever was this session — even
 * though the newly-active scene already carries its own `briefRef` flag
 * (foundry/scene-build.mjs stamps it on every real scene at build time).
 * `loadScene`'s own episode lookup already reads `brief.episodeRef` directly
 * off the loaded brief rather than the stored SETTING_EPISODE (see
 * `_prepareContext` above), so fixing SETTING_BRIEF alone is enough to bring
 * the whole panel — beats, cast, the episode's own scene list — back in
 * sync; nothing else needs correcting.
 */
Hooks.on("updateScene", (scene, changed) => {
  if (!game.user?.isGM || changed?.active !== true) return;
  const briefRef = scene.getFlag(MODULE_ID, "briefRef");
  if (!briefRef || briefRef === currentBriefId()) return;
  game.settings
    .set(MODULE_ID, SETTING_BRIEF, briefRef)
    .then(() => refreshSceneRunner())
    .catch((err) => console.error("Blank Inheritance | Could not sync the Scene Runner to the newly active scene:", err));
});

/**
 * Keep what the panel says about the TABLE current when it changes from
 * anywhere else: who is on stage (the stage's own controls, a trigger, the
 * palette), and which room the table is in (a cut between two rooms of the
 * SAME brief, which the listener above deliberately ignores). Only while the
 * drawer is open — a shut drawer repaints itself when it is next opened.
 */
Hooks.on("updateScene", (doc, change) => {
  if (!game.user?.isGM || !active?.open) return;
  const ours = change?.flags?.[MODULE_ID];
  if (change?.active === true || (ours && Object.keys(ours).some((key) => key.replace(/^-=/, "") === "stage"))) {
    refreshSceneRunner();
  }
});

/**
 * A result the table rolled from a check this runner posted (tagged with its
 * brief and beat — see rollTagFor) records itself against that beat, filling
 * a gap and never overwriting the GM's own call (core/runner-view.mjs
 * #shouldAutoRecord). The GM still sees every result on the beat and can use
 * a different one with a click.
 *
 * Only the ACTIVE GM's client writes: with an assistant GM connected, both
 * clients hear the same message, and two writers would record it twice.
 */
Hooks.on("createChatMessage", (message) => {
  if (!game.user?.isGM) return;
  const result = resultFromMessage(message);
  if (!result) return;
  const activeGm = game.users?.activeGM;
  const writes = !activeGm || activeGm.id === game.user.id;
  (writes ? recordRollResult(result) : Promise.resolve(false))
    // A result that did not record itself (the beat already had an answer,
    // or this is an assistant GM's client) still belongs in the beat's list
    // of rolls, where the GM can use it instead — found live 2026-09-24: a
    // second player's roll arrived and the list never showed it.
    .then((recorded) => {
      if (!recorded && result.briefId === currentBriefId() && active?.open) refreshSceneRunner();
    })
    .catch((err) => console.error("Blank Inheritance | Could not record that roll against its beat:", err));
});

/** A deleted roll leaves the beat's list of results. */
Hooks.on("deleteChatMessage", (message) => {
  if (!game.user?.isGM || !active?.open) return;
  if (resultFromMessage(message)) refreshSceneRunner();
});

export function mountSceneRunner() {
  if (!game.user?.isGM) return null;
  if (!active) active = new SceneRunner();
  active.render({ force: true });
  return active;
}

export function refreshSceneRunner() {
  active?.render({});
  return active;
}

/**
 * Open/close from the deck's own pill key (deck-ident.hbs's `openRunner`
 * action) — the same "mount if needed, then flip" shape as togglePhone and
 * toggleConsoleWindow, so the Director's script is one of the deck's own
 * objects rather than a floating circle bolted on beside it (Ingram's direct
 * feedback, 2026-09-17, against the real server).
 */
export function toggleSceneRunner() {
  const runner = active ?? mountSceneRunner();
  if (runner && !runner.open) adoptActiveSceneBrief().finally(() => runner.toggle());
  else runner?.toggle();
  return active;
}

export function unmountSceneRunner() {
  active?.close();
  active = null;
}

/**
 * A runner opened with no scene chosen shows the scene the TABLE is on, if
 * that scene was built from a brief (foundry/scene-build.mjs stamps every
 * real scene with its `briefRef`). Found reading this file for the
 * 2026-09-24 redesign: opening the drawer cold showed "No scene chosen" while
 * the players sat in Intake Medicals, one lookup away from the right answer.
 * Never overrides a brief the GM already chose — reading ahead is real.
 */
async function adoptActiveSceneBrief() {
  if (!game.user?.isGM || currentBriefId()) return;
  const briefRef = game.scenes?.active?.getFlag(MODULE_ID, "briefRef");
  if (briefRef) await game.settings.set(MODULE_ID, SETTING_BRIEF, briefRef);
}

/**
 * Load an episode's running order AND open the drawer to show it — the
 * once-per-session action. Loading content without also opening the drawer
 * would be a silent no-op from the GM's point of view.
 *
 * Called with NO episode (the Console hub's own "Scene Runner" key does
 * exactly that), it only opens the drawer. It used to write the empty
 * episode and brief over whatever was loaded, so opening the runner from the
 * hub mid-session emptied it (found 2026-09-24). Changing episode without
 * naming a brief still clears the old brief, which belongs to the old one.
 */
export async function openSceneRunner(episodeId = null, briefId = null) {
  if (!game.user?.isGM) return null;
  resetSceneRunnerCache();
  if (typeof episodeId === "string" && episodeId) {
    await setRunnerEpisode(episodeId, briefId);
  }
  if (typeof briefId === "string" && briefId) applySceneAudio(briefId);
  await adoptActiveSceneBrief();
  const runner = mountSceneRunner();
  if (runner && !runner.open) runner.toggle();
  return runner;
}

/**
 * The episode the runner has open (its world setting), or "" when none ever
 * was. The opening titles' confirm window offers this episode first: it is
 * the module's one notion of "the episode we are on".
 */
export function runnerEpisodeId() {
  try {
    return currentEpisodeId();
  } catch {
    return "";
  }
}

/**
 * Point the runner at an episode (and, if named, one of its scenes) WITHOUT
 * opening the drawer or touching the sound: openSceneRunner above is this
 * plus the drawer. The opening titles call it when the GM starts an episode
 * with them (foundry/opening-titles.mjs#followEpisode), so the runner's
 * running order, and the scene advanceAfterClose moves on to, is the episode
 * the table is now watching. Changing episode without naming a scene clears
 * the old one's, which belongs to the old episode.
 */
export async function setRunnerEpisode(episodeId, briefId = null) {
  if (!game.user?.isGM || typeof episodeId !== "string" || !episodeId) return false;
  const switching = episodeId !== currentEpisodeId();
  await game.settings.set(MODULE_ID, SETTING_EPISODE, episodeId);
  if (typeof briefId === "string") await game.settings.set(MODULE_ID, SETTING_BRIEF, briefId);
  else if (switching) await game.settings.set(MODULE_ID, SETTING_BRIEF, "");
  return true;
}
