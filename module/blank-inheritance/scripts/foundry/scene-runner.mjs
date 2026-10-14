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
  conditionLabelShown,
  episodeSteps,
  goalOpen,
  isTopicKey,
  nowBeatId,
  roomLabel,
  runnerPhase,
  runnerWidthCss,
  scenePosition,
  sceneStartedAt,
  shouldAutoRecord,
  statDcs,
  toggleDetail,
  widthFractionFrom
} from "../core/runner-view.mjs";
import { carryInsWithNames, partyStrip, withResult, PASSING } from "../core/runner-party.mjs";
import { chipsToFireOnDone, chipsToFireOnHandout, firedTriggerIds, undoFor } from "../core/beat-autofire.mjs";
import { toldCount, toldSoFar } from "../core/table-knows.mjs";
import { clockStepOnRound, creatureLines, roundEnded } from "../core/fight-setup.mjs";
import { combatForFight, setUpFight } from "./fight-setup.mjs";
import { partyMemberRecords } from "./runner-party.mjs";
import { decorateInlineTriggers, escapeHtml } from "../core/inline-triggers.mjs";
import { renderProse } from "../core/emphasis.mjs";
import { parseNoteLines } from "../core/note-lines.mjs";
import { checkSkills } from "../core/roll-intent.mjs";
import { checkPillHtml, decorateWithCheck, waysInWords } from "../core/check-pill.mjs";
import { DEGREES as CONSOLE_DEGREES } from "../core/check-console.mjs";
import { currentCheck, gmLights, openCheckConsole, setCheckConsoleProvider, showCheckConsole, wayLabel } from "./check-console.mjs";
import { openLocationEditorOnMap } from "./location-editor.mjs";
import { needsTravel } from "../core/travel-trigger.mjs";
import { fetchModuleJson, listModuleImageIds } from "./io.mjs";
import { fitDeck } from "./deck.mjs";
import { currentEntries, recordLogEntry } from "./session-log.mjs";
import { runObjectiveTrigger, undoObjectiveAct } from "./objectives-runner.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { readKnownNames, removeFromStage, revealName, summonToStage } from "./stage.mjs";
import { isNameProtected, knownSet, rawStageId, stageIdFor } from "../core/stage-names.mjs";
import { runTravelSequence } from "./travel.mjs";
import { applySoundscape, fireEvent } from "./audio-director.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";
import { openEquipmentPanel } from "./equipment-panel.mjs";
import { fileHandout, handoutStates } from "./handouts.mjs";
import { equipmentGrantsForScene } from "./equipment-state.mjs";
import { rulesInScene } from "../core/scene-rules.mjs";
import { loadRulesGlossary, openRule } from "./rules-glossary.mjs";
import { portraitIdFor, primeStagePortraits, resetStageCastCache, stagePortraitFor, summonDescriptorFor, tellName } from "./stage-cast.mjs";
import { registerRunnerThemeSetting, currentRunnerTheme, setRunnerTheme } from "./runner-theme.mjs";
import { editSheet } from "../core/scene-edit-sheet.mjs";
import { fieldKey, newItemId, normalizeText, parseFieldKey, resolvePath, sameValue } from "../core/scene-edits.mjs";
import { loadSceneEdits, overlayScene, resetSceneEditsCache, saveSceneEdit, sceneEditsState } from "./scene-edits.mjs";
import { currentMoment, setMoment } from "./campaign-state.mjs";
import { QUARTER_IDS, normalizeMoment, quarterIndex } from "../core/day-ring.mjs";
import { cityArrivals, cityRoster, cityState, hasPawns, onCitySceneClosed, participantsFor, reassignCityPlayer, sendPartyTo } from "./city-state.mjs";
import { promptOptions, recordedChoiceLabel, settlePrompt } from "../core/choice-prompt.mjs";
import { choiceTallyFor, closeChoicePrompt, openChoicePrompt } from "./choice-prompt.mjs";
import { spectrumOf } from "../core/scene-spectrum.mjs";
import {
  applyRest,
  chooseRumourSet,
  conditionContext,
  deckContext,
  dealRumoursFor,
  drawFor,
  putBackFor,
  registerDeckSettings,
  regularsContext,
  restContext,
  rumourContext,
  shiftRegularFor,
  toggleSetbackFor,
  toggleUpgradeFor,
  witnessFor
} from "./runner-rest-deck.mjs";

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

/** The per-player row's four small keys: best to worst, the same order. */

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
  // Each event deck's drawn and witnessed events (core/event-deck.mjs, D050).
  registerDeckSettings(() => refreshSceneRunner());
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
 * the scene's camera, staged or Stagecraft: it glides to fit the whole width
 * of the picture into the part of the screen the GM can actually see
 * (Ingram, 2026-10-04), and from there the GM pans and zooms freely.
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
  import("./stagecraft-bridge.mjs").then((m) => m.fitStageBesideRunner?.()).catch(() => {});
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

/**
 * Drops every cached file. The seam for re-reading after a content push --
 * which is also when the scene-edits ledger may have changed (a deploy that
 * carried merged edits), so her edits are re-listed too.
 */
export function resetSceneRunnerCache() {
  cache.clear();
  resetSceneEditsCache();
  resetStageCastCache();
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

  // Ingram's edits, laid over the deployed files (design/scene-edits.md).
  // Always, not only while editing: running a scene she has rewritten means
  // running her words, and an old deploy must never put the old ones back.
  // A beat she added may use a check file the deployed brief never named,
  // so the check files are gathered again from the overlaid beats.
  await loadSceneEdits().catch((err) => console.error("Blank Inheritance | Could not load scene edits:", err));
  let shown = overlayScene({ brief, challenges });
  const extraIds = [...new Set((shown.brief?.beats ?? []).map((b) => b.challengeRef).filter((id) => id && !(id in challenges)))];
  if (extraIds.length) {
    for (const [id, doc] of await Promise.all(extraIds.map(async (id) => [id, await loadJson("challenges", id)]))) if (doc) challenges[id] = doc;
    shown = overlayScene({ brief, challenges });
  }

  return { brief: shown.brief, deployedBrief: brief, episode, subsystem, challenges: shown.challenges, encounters, edits: shown };
}

/**
 * The part of an encounter file worth a line on the beat that starts it: what
 * is coming, how hard, each creature's stat line (2026-10-04: the card used to
 * say only "6x Giant Centipede L-1"), and whether the fight is set up yet.
 */
function encounterSummary(encounter, { clockAuto = true, hasClock = false } = {}) {
  if (!encounter) return null;
  const creatures = creatureLines(encounter);
  const combat = combatForFight(encounter.id);
  return {
    id: encounter.id,
    name: encounter.name ?? encounter.id,
    threat: encounter.intendedThreatLevel ?? null,
    creatures,
    canSetUp: creatures.some((c) => c.canSetUp),
    isSetUp: Boolean(combat),
    round: combat?.round ?? null,
    hasClock,
    clockAuto
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
  // The City decides first (design/world-map-destinations.md): the next group's
  // turn after a split, the muster once every group is done, or this scene's own
  // departure -- a choice on the map instead of the next scene in order. When it
  // handles the move, the episode's running order below does not run.
  try {
    const closedBrief = await loadJson("scene-briefs", closedBriefId);
    if (await onCitySceneClosed(closedBriefId, closedBrief)) return;
  } catch (err) {
    console.error("Blank Inheritance | The City could not take this scene's departure; following the running order instead:", err);
  }
  const episode = await loadJson("episodes", currentEpisodeId());
  const scenes = (episode?.scenes ?? [])
    .filter((s) => s.briefRef)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const closedIndex = scenes.findIndex((s) => s.briefRef === closedBriefId);
  const next = closedIndex >= 0 ? scenes[closedIndex + 1] : null;
  if (!next) return; // last scene in the episode -- nothing authored to advance to

  await advanceMomentTo(next);

  const targetSceneId = backdropsFor(next.briefRef)[0]?.id;
  if (!targetSceneId) return; // the next scene has no built Scene document yet

  const fromRef = game.scenes.active?.getFlag(MODULE_ID, "locationRef") ?? null;
  const toRef = game.scenes.get(targetSceneId)?.getFlag(MODULE_ID, "locationRef") ?? null;

  // Once the characters have pawns on The City, a sent departure walks them --
  // each from wherever they stand -- instead of the old single party marker.
  if (hasPawns() && toRef) {
    await sendPartyTo(toRef, targetSceneId);
  } else if (needsTravel(fromRef, toRef)) {
    await runTravelSequence(fromRef, toRef, targetSceneId);
  } else {
    const { cueScene } = await import("./director-panel.mjs");
    await cueScene(targetSceneId);
  }
}

/**
 * The day ring follows the authored story, not only the downtime scheduling game -- design/ux-doctrine.md §7a's own
 * ruling: "the ring is the fiction's time of day." Ingram, 2026-09-28: closing a scene should move the clock to
 * match the next one automatically, rather than a GM remembering to click "advance" by hand.
 *
 * `next.day`/`next.quarter` come from data/episodes/*.json's own scene entries (written by
 * `node tools/story/story.mjs quarters` from canon/plan/chapter-NN.md); a scene with neither -- Scene 0's
 * narration, or one the plan marks flexible/unknown -- never forces the clock, so this is a no-op for it.
 *
 * Guarded on an actual change, not left to `setMoment` to no-op silently: `registerCampaignSettings`'s `onChange`
 * (blank-inheritance.mjs) fires the segment-advance sound cue and refreshes the command bar on every client for
 * ANY write to this setting, so calling it on the seven-in-eleven Episode One transitions that don't cross a
 * quarter boundary would mean the ceremony firing on scenes that never asked for it.
 */
async function advanceMomentTo(next) {
  if (!Number.isInteger(next?.day) || !next?.quarter || !game.user?.isGM) return;
  const before = currentMoment();
  if (before.day === next.day && before.quarter === next.quarter) return;
  // Forward only. The clock is now also moved when any scene is cut to (a group's
  // turn after a split, a muster, a cue from the palette), and a GM stepping back
  // into an earlier scene must never wind the day backwards.
  const absolute = (m) => (normalizeMoment(m).day - 1) * QUARTER_IDS.length + quarterIndex(normalizeMoment(m).quarter);
  if (absolute(next) <= absolute(before)) return;
  await setMoment({ day: next.day, quarter: next.quarter });
}

/**
 * The Party block's content, once a departure has split the party and the
 * groups are being run: the queue (who is in each group, which one is on now)
 * and every player's destination, changeable. Null otherwise -- the block is
 * only there while it has something to say.
 */
function partyContext(briefId) {
  const state = cityState();
  const departure = state.departure;
  if (!departure || !state.queue?.length) return null;
  const labels = new Map(departure.destinations.map((d) => [d.id, d.label]));
  const roster = cityRoster();
  const names = new Map(roster.map((m) => [m.userId, m.characterName || m.name]));
  return {
    question: departure.question ?? null,
    queue: state.queue.map((entry) => ({
      label: entry.destinationIds.map((id) => labels.get(id) ?? id).join(" · "),
      names: entry.userIds.map((uid) => names.get(uid)).filter(Boolean).join(", "),
      done: entry.done,
      isNow: entry.key === state.currentKey,
      isHere: entry.briefRef === briefId
    })),
    players: roster.map((m) => ({
      userId: m.userId,
      name: names.get(m.userId),
      options: departure.destinations.map((d) => ({ id: d.id, label: d.label, selected: state.assignment?.[m.userId] === d.id }))
    }))
  };
}

/** A scene was cut to: move the clock to that scene's own day and quarter, if it has one (forward only). */
async function advanceMomentToBrief(briefRef) {
  const episode = await loadJson("episodes", currentEpisodeId());
  const entry = (episode?.scenes ?? []).find((s) => s.briefRef === briefRef);
  if (entry) await advanceMomentTo(entry);
}

// A brief cast member's stage descriptor, stage id and portrait (summonDescriptorFor, portraitIdFor,
// stagePortraitFor) live in foundry/stage-cast.mjs (2026-10-04), shared with the stage's own wings
// (foundry/stagecraft-bridge.mjs) so the two cannot build the same person two ways.

/** Who is currently standing on the scene the table is looking at. */
function stagedPortraitIds() {
  const cast = canvas?.scene?.getFlag(MODULE_ID, "stage")?.cast ?? [];
  return new Set(cast.map((m) => m.portraitId));
}

/** The one check a beat names, out of its challenge's handful. */
function checkFor(beat, challenges) {
  const challenge = challenges[beat.challengeRef];
  if (!challenge) return null;
  const checks = challenge.checks ?? [];
  return (beat.checkRef ? checks.find((c) => c.id === beat.checkRef) : checks[0]) ?? null;
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

  if (!isTopicKey(result.key)) {
    const scene = await loadScene(briefId);
    const beat = (scene?.brief?.beats ?? []).find((b) => b.id === result.key);
    if (!beat) return false;
    // Every character's own result, whoever rolled first (2026-10-04): a
    // later scene's carry-ins name them (core/runner-party.mjs). A reroll by
    // the same character replaces theirs.
    let results = state.results ?? {};
    const mine = results?.[result.key]?.[result.actorId];
    if (result.actorId && !(mine?.messageId === result.messageId && mine?.degree === result.degree)) {
      results = withResult(results, result.key, result.actorId, { degree: result.degree, name: result.name, at, via: "roll", messageId: result.messageId });
    }
    const recorded = state.ticked?.[result.key] ?? null;
    const same = recorded?.messageId === result.messageId && recorded?.degree === result.degree;
    if (same || (!force && !shouldAutoRecord(result, recorded))) {
      if (results === (state.results ?? {})) return false;
      await writeRunState(briefId, { ...state, results });
      refreshSceneRunner();
      return true;
    }
    await writeRunState(briefId, { ...state, results, ticked: { ...state.ticked, [result.key]: stamp } });
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
    refreshSceneRunner();
    await beatAutomation(briefId, result.key, recorded, stamp);
    refreshSceneRunner();
    return true;
  }

  // A conversation check on a person's card keeps one result, with who rolled it.
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
  refreshSceneRunner();
  return true;
}

/* ---------------------------------------------------------------- */
/*  The check console (2026-10-05)                                   */
/* ---------------------------------------------------------------- */

/**
 * A check is put to the table from its pill in the prose (core/check-pill.mjs) and run in the check console
 * (foundry/check-console.mjs): the DC, the ways it can be met, each player's light. What the Runner keeps of it is
 * unchanged: a roll still records itself against its beat or topic through its tag (recordRollResult, above). What
 * the console cannot know (the check's name, what each degree means, which degree the scene recorded) it asks for
 * here, and a result the GM sets by hand, or a degree marked as the outcome, is written here.
 */

/** The open check, when it is this brief's check under this key (a beat id, or a person's topic key). */
function openCheckFor(briefId, key) {
  const session = currentCheck();
  return session && session.briefId === briefId && session.key === key ? session : null;
}

/** Is the check this pill opens the one open now? */
function pillIsOpen(key) {
  const briefId = currentBriefId();
  if (key.startsWith("beat:")) return currentCheck()?.source?.kind === "beat" && Boolean(openCheckFor(briefId, key.slice(5)));
  if (key.startsWith("topic:")) {
    const [, castId, index] = key.split(":");
    return Boolean(openCheckFor(briefId, `${castId}:coercible:${index}`));
  }
  return false;
}

/** A beat's lights: the open check's, or else each character's result kept on the beat. */
function beatLights(briefId, beatId, runState) {
  const open = openCheckFor(briefId, beatId);
  if (open) return gmLights(open);
  return Object.values(runState?.results?.[beatId] ?? {})
    .filter((r) => CONSOLE_DEGREES.includes(r?.degree))
    .map((r) => ({ state: r.degree, name: r.name ?? null }));
}

/** The pill a check carries in the prose: its words (or its ways), its DC, blind or not, and its lights. */
function checkPill({ key, check, dc, words = null, lights = [] }) {
  const or = game.i18n.localize("BLANKINHERITANCE.CheckConsole.Or");
  const ways = check.anySkill ? game.i18n.localize("BLANKINHERITANCE.Runner.AnySkill") : waysInWords(checkSkills(check).map(wayLabel), or);
  return checkPillHtml({
    key,
    words: words ?? `${ways} ${game.i18n.localize("BLANKINHERITANCE.CheckConsole.CheckWord")}`,
    dc,
    blind: check.secret === true,
    lights,
    open: pillIsOpen(key),
    title: check.name ?? check.id ?? "",
    blindLabel: game.i18n.localize("BLANKINHERITANCE.Runner.Blind")
  });
}

/** The DC a check is put to the table at: the authored one, moved by any hidden modifier on this scene. */
function dcFor(brief, holder, check) {
  return postedDc(check.dc?.value ?? null, hiddenAdjustment(brief.gmModifiers ?? [], { challengeRef: holder.challengeRef, locationKey: brief.sceneRef }));
}

/** What the console needs to put a check to the table, from a pill's key (`beat:<id>` or `topic:<castId>:<index>`). */
function checkSpecFor(scene, key) {
  const brief = scene?.brief;
  if (!brief || typeof key !== "string") return null;
  const challenges = scene.challenges ?? {};
  if (key.startsWith("beat:")) {
    const beat = (brief.beats ?? []).find((b) => b.id === key.slice(5));
    const check = beat ? checkFor(beat, challenges) : null;
    if (!check) return null;
    return {
      briefId: brief.id,
      key: beat.id,
      source: { kind: "beat", briefId: brief.id, beatId: beat.id, checkRef: null },
      skills: checkSkills(check),
      dc: dcFor(brief, beat, check),
      blind: check.secret === true
    };
  }
  if (key.startsWith("topic:")) {
    const [, castId, raw] = key.split(":");
    const index = Number(raw);
    const member = (brief.cast ?? []).find((m) => m.id === castId);
    const topic = member?.brief?.coercible?.[index] ?? null;
    const check = topic ? checkFor(topic, challenges) : null;
    if (!check) return null;
    return {
      briefId: brief.id,
      key: `${castId}:coercible:${index}`,
      source: { kind: "topic", briefId: brief.id, castId, index },
      skills: checkSkills(check),
      dc: dcFor(brief, topic, check),
      blind: check.secret === true
    };
  }
  return null;
}

/** The scene a check belongs to: the one the Runner has open, or loaded fresh (her edits laid over it either way). */
async function sceneOf(briefId) {
  if (!briefId) return null;
  return active?._scene?.brief?.id === briefId ? active._scene : loadScene(briefId);
}

/** The check a console session is running, read from its scene again: never trusted from the setting. */
async function checkOfSession(session) {
  const scene = await sceneOf(session?.briefId);
  const brief = scene?.brief;
  if (!brief) return null;
  const challenges = scene.challenges ?? {};
  if (session.source?.kind === "beat") {
    const beat = (brief.beats ?? []).find((b) => b.id === session.source.beatId);
    if (!beat) return null;
    const check = checkFor({ challengeRef: beat.challengeRef, checkRef: session.source.checkRef ?? beat.checkRef }, challenges);
    return check ? { check, beat, topic: null } : null;
  }
  if (session.source?.kind === "topic") {
    const member = (brief.cast ?? []).find((m) => m.id === session.source.castId);
    const topic = member?.brief?.coercible?.[session.source.index] ?? null;
    const check = topic ? checkFor(topic, challenges) : null;
    return check ? { check, beat: null, topic } : null;
  }
  return null;
}

/** A result the GM set by hand in the console, kept the way a rolled one is. `degree` null takes it back. */
async function recordHandResult(session, { userId, actorId, degree }) {
  const briefId = session.briefId;
  const state = runStateFor(briefId);
  const at = new Date().toISOString();
  const name = game.actors?.get(actorId)?.name ?? game.users?.get(userId)?.character?.name ?? game.users?.get(userId)?.name ?? "?";
  const found = await checkOfSession(session);
  const what = found?.check?.name ?? found?.topic?.topic ?? session.key;

  if (isTopicKey(session.key)) {
    // A person's conversation check keeps one result, with who it was.
    const topics = { ...state.topics };
    if (degree) topics[session.key] = { at, degree, via: "hand", actorId, by: name };
    else if (!topics[session.key]?.actorId || topics[session.key].actorId === actorId) delete topics[session.key];
    await writeRunState(briefId, { ...state, topics });
  } else {
    // Each character's own result on the beat (core/runner-party.mjs), and the
    // first result on a beat with none marks it done at that degree.
    const beatId = session.key;
    const results = withResult(state.results, beatId, actorId, degree ? { degree, name, at, via: "hand" } : null);
    const before = state.ticked?.[beatId] ?? null;
    let ticked = state.ticked;
    let after = before;
    if (degree && !before) {
      after = { at, degree, via: "hand", actorId, by: name };
      ticked = { ...state.ticked, [beatId]: after };
      fireBeatAudio(briefId, beatId);
    }
    await writeRunState(briefId, { ...state, results, ticked });
    active?.markResolved(beatId);
    if (after !== before) await beatAutomation(briefId, beatId, before, after);
  }
  if (degree) {
    await recordLogEntry({ text: `${name}: ${degree} on ${what}.`, nowIso: at, scene: canvas?.scene?.name ?? null, subject: outcomeLogSubject(session.key, degree) })
      .catch((err) => console.error("Blank Inheritance | Could not log that result:", err));
  }
  refreshSceneRunner();
}

/**
 * A degree marked in the console as how the check came out for the scene: the beat's (or topic's) one recorded
 * outcome, which its branches read. Marking the same degree again clears it.
 */
async function recordMarkedOutcome(session, degree) {
  const briefId = session.briefId;
  const state = runStateFor(briefId);
  const at = new Date().toISOString();
  const found = await checkOfSession(session);
  const what = found?.check?.name ?? found?.topic?.topic ?? found?.beat?.text ?? session.key;
  let set = false;

  if (isTopicKey(session.key)) {
    const topics = { ...state.topics };
    if (topics[session.key]?.degree === degree) delete topics[session.key];
    else {
      topics[session.key] = { at, degree };
      set = true;
    }
    await writeRunState(briefId, { ...state, topics });
  } else {
    const beatId = session.key;
    const ticked = { ...state.ticked };
    const before = ticked[beatId] ?? null;
    if (before?.degree === degree) delete ticked[beatId];
    else {
      ticked[beatId] = { at, degree };
      set = true;
      fireBeatAudio(briefId, beatId);
      // Keep the beat open on its consequence: the GM is about to say it.
      active?.markResolved(beatId);
    }
    await writeRunState(briefId, { ...state, ticked });
    await beatAutomation(briefId, beatId, before, ticked[beatId] ?? null);
  }
  if (set) {
    await recordLogEntry({ text: `${degree} on ${what}.`, nowIso: at, scene: canvas?.scene?.name ?? null, subject: outcomeLogSubject(session.key, degree) })
      .catch((err) => console.error("Blank Inheritance | Could not log that outcome:", err));
  }
  refreshSceneRunner();
}

setCheckConsoleProvider({
  async context(session) {
    if (!session?.briefId || session.source?.kind === "adhoc") return null;
    const found = await checkOfSession(session);
    if (!found) return null;
    const state = runStateFor(session.briefId);
    const recorded = isTopicKey(session.key) ? state.topics?.[session.key]?.degree : state.ticked?.[session.key]?.degree;
    return {
      title: found.check.name ?? found.check.id ?? found.topic?.topic ?? null,
      outcomes: found.check.outcomes ?? {},
      bySkill: found.check.bySkill ?? null,
      recordedDegree: recorded ?? null,
      // How many times each degree has landed on it, across every attempt the
      // log holds (Ingram, 2026-09-19: "record how many Crit success, success,
      // ... crit fails we get for each challenge"; core/scene-brief.mjs#outcomeTally).
      tally: outcomeTally(currentEntries(), session.key),
      canMark: true
    };
  },
  async record({ kind, session, userId, actorId, degree }) {
    if (!game.user?.isGM || !session?.briefId || !session.key) return;
    if (kind === "hand") await recordHandResult(session, { userId, actorId, degree });
    else if (kind === "outcome" && degree) await recordMarkedOutcome(session, degree);
  }
});

/**
 * One press per moment (core/beat-autofire.mjs, D059). When a beat becomes
 * done -- a tick, a pass recorded or rolled, a choice settled -- its objective
 * chips nobody has pressed fire by themselves, and what they did is kept on
 * the beat's own stamp (`ticked[beatId].fired`). When it stops being done
 * (un-ticked, or re-recorded as a failure) exactly those are undone. A pass
 * re-recorded as another pass keeps what it fired.
 *
 * An auto-fired chip is logged under its own subject (`::auto::`), not as a
 * press (`::trigger::`), so un-ticking and ticking again fires it again; a
 * chip the GM pressed by hand is never fired twice and never undone.
 */
async function beatAutomation(briefId, beatId, before, after) {
  if (!game.user?.isGM || !briefId || !beatId) return [];
  const firing = (tick) => Boolean(tick) && (!tick.degree || PASSING.includes(tick.degree));
  const wasFiring = firing(before);
  const nowFiring = firing(after);
  const sceneName = canvas?.scene?.name ?? null;
  const said = [];

  const keepOnStamp = async (fired) => {
    const latest = runStateFor(briefId);
    const tick = latest.ticked?.[beatId];
    if (!tick) return;
    const next = { ...tick };
    if (fired?.length) next.fired = fired;
    else delete next.fired;
    await writeRunState(briefId, { ...latest, ticked: { ...latest.ticked, [beatId]: next } });
  };

  if (wasFiring && !nowFiring && before?.fired?.length) {
    for (const entry of undoFor(before.fired)) {
      if (await undoObjectiveAct(entry, { scene: sceneName })) said.push(`↺ ${entry.label ?? entry.id}`);
    }
    await keepOnStamp(null);
  } else if (wasFiring && nowFiring && before?.fired?.length && !after?.fired) {
    await keepOnStamp(before.fired);
  } else if (nowFiring && !wasFiring) {
    const loaded = await loadScene(briefId);
    const beat = (loaded?.brief?.beats ?? []).find((b) => b.id === beatId);
    // Every objective chip on the beat is offered, pressed or not: the store
    // is idempotent (a second give or tick changes nothing and says so), so a
    // chip the GM already pressed by hand changes nothing here, and is never
    // put on the stamp to be undone.
    const chips = chipsToFireOnDone(beat, { degree: after?.degree ?? null });
    const fired = [];
    for (const chip of chips) {
      let changed = false;
      try {
        changed = await runObjectiveTrigger(chip, { scene: sceneName ?? loaded?.brief?.title ?? null, confirm: false, quiet: true });
      } catch (err) {
        console.error(`Blank Inheritance | Could not fire "${chip.id}" for beat "${beatId}":`, err);
      }
      if (!changed) continue;
      fired.push({ id: chip.id, act: chip.act, objectiveRef: chip.objectiveRef, partRef: chip.partRef ?? null, label: chip.label ?? chip.id });
      said.push(chip.label ?? chip.id);
      recordLogEntry({
        text: chip.label ?? chip.id,
        nowIso: new Date().toISOString(),
        scene: sceneName,
        subject: `${beatId}::auto::${chip.id}`
      }).catch((err) => console.error("Blank Inheritance | Could not log that objective:", err));
    }
    if (fired.length) await keepOnStamp(fired);
  }
  if (said.length) ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.AutoFired", { what: said.join(" · ") }));
  return said;
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
      openBeat: SceneRunner.#onOpenBeat,
      openGmTool: SceneRunner.#onOpenGmTool,
      spend: SceneRunner.#onSpend,
      cueScene: SceneRunner.#onCueScene,
      cutTo: SceneRunner.#onCutTo,
      openPalette: SceneRunner.#onOpenPalette,
      toggleTheme: SceneRunner.#onToggleTheme,
      stagePerson: SceneRunner.#onStagePerson,
      revealName: SceneRunner.#onRevealName,
      closeScene: SceneRunner.#onCloseScene,
      // 2026-10-05: a check's pill opens the check console on it; the header's
      // Check key opens one made up on the spot.
      openCheck: SceneRunner.#onOpenCheck,
      openAdhocCheck: SceneRunner.#onOpenAdhocCheck,
      openLocationEditor: SceneRunner.#onOpenLocationEditor,
      // D050: a relaxed scene's event deck, and a rest's healing.
      drawEvent: SceneRunner.#onDrawEvent,
      witnessEvent: SceneRunner.#onWitnessEvent,
      returnEvent: SceneRunner.#onReturnEvent,
      applyRest: SceneRunner.#onApplyRest,
      // D051: the rumour mill's sets and deals.
      rumourSet: SceneRunner.#onRumourSet,
      dealRumours: SceneRunner.#onDealRumours,
      shiftRegular: SceneRunner.#onShiftRegular,
      // D052: a haunt's own upgrades/setbacks, toggled by hand.
      toggleUpgrade: SceneRunner.#onToggleUpgrade,
      toggleSetback: SceneRunner.#onToggleSetback,
      revealHandout: SceneRunner.#onRevealHandout,
      revealHandoutSolo: SceneRunner.#onRevealHandoutSolo,
      grantArtefact: SceneRunner.#onGrantArtefact,
      fireTrigger: SceneRunner.#onFireTrigger,
      recordChoice: SceneRunner.#onRecordChoice,
      // One press puts a choicePoint to every player (foundry/choice-prompt.mjs).
      askPlayers: SceneRunner.#onAskPlayers,
      closePrompt: SceneRunner.#onClosePrompt,
      cancelPrompt: SceneRunner.#onCancelPrompt,
      useTemptation: SceneRunner.#onUseTemptation,
      // The 2026-09-24 redesign's own controls.
      toggleBeatDetail: SceneRunner.#onToggleBeatDetail,
      toggleBookend: SceneRunner.#onToggleBookend,
      togglePerson: SceneRunner.#onTogglePerson,
      toggleShowAll: SceneRunner.#onToggleShowAll,
      unstagePerson: SceneRunner.#onUnstagePerson,
      // 2026-10-04: one rule the scene's own words name, opened as the system's own card or the SRD article.
      openRule: SceneRunner.#onOpenRule,
      noteTag: SceneRunner.#onNoteTag,
      nudgeClock: SceneRunner.#onNudgeClock,
      // 2026-10-04 (D059): a fight set up in one press, and its clock rising by itself.
      setUpFight: SceneRunner.#onSetUpFight,
      toggleClockAuto: SceneRunner.#onToggleClockAuto,
      jumpToNow: SceneRunner.#onJumpToNow,
      // The edit sheet (design/scene-edits.md). Typing is saved by the
      // fields' own listeners (#bindEditSheet); these are its buttons.
      toggleEdit: SceneRunner.#onToggleEdit,
      editAddBeat: SceneRunner.#onEditAddBeat,
      editRemoveBeat: SceneRunner.#onEditRemoveBeat,
      editMoveBeat: SceneRunner.#onEditMoveBeat,
      editUndoRemove: SceneRunner.#onEditUndoRemove,
      editAddItem: SceneRunner.#onEditAddItem,
      editRemoveItem: SceneRunner.#onEditRemoveItem,
      editSaveNote: SceneRunner.#onEditSaveNote,
      editWithdrawNote: SceneRunner.#onEditWithdrawNote
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
      templates: [
        `${TEMPLATE_ROOT}/person.hbs`,
        `${TEMPLATE_ROOT}/beat.hbs`,
        `${TEMPLATE_ROOT}/edit.hbs`,
        `${TEMPLATE_ROOT}/edit-field.hbs`,
        `${TEMPLATE_ROOT}/edit-block.hbs`,
        `${TEMPLATE_ROOT}/edit-list.hbs`,
        `${TEMPLATE_ROOT}/edit-notes.hbs`
      ],
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
    // The Party block: move a player to another destination after Go, for a
    // player who changes their mind or a scene that calls for it (Ingram,
    // 2026-09-28). One change, no confirm; the pawn steps across on the map.
    for (const select of this.element.querySelectorAll("[data-bi-reassign]")) {
      select.addEventListener("change", () => {
        reassignCityPlayer(select.dataset.userId, select.value)
          .then(() => this.render())
          .catch((err) => console.error("Blank Inheritance | Could not move that player:", err));
      });
    }
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
    if (this.#editing) this.#bindEditSheet();
    else this.#watchNow(context);
  }

  /** The beat being run, for the "back to now" pill and the teleprompter scroll. */
  #nowWatch = { briefId: null, nowId: null, observer: null };

  /**
   * Keep the beat being run findable (2026-10-04). When the marker moves on
   * (the GM ticked the beat they were on), the next one is scrolled into
   * view if it is not already, the way a teleprompter scrolls; when the GM
   * scrolls away to read ahead, a pill at the top of the script says where
   * "now" is and takes them back with one press. Found running Episode One:
   * the beat to run next sat below the bottom edge of a 1600x900 screen.
   */
  #watchNow(context) {
    this.#nowWatch.observer?.disconnect?.();
    this.#nowWatch.observer = null;
    const pill = this.element.querySelector("[data-now-pill]");
    const nowEl = this.element.querySelector(".bi-runner__beat--now");
    const briefId = context?.id ?? null;
    const nowId = nowEl?.dataset?.beatId ?? null;
    const moved = this.#nowWatch.briefId === briefId && Boolean(this.#nowWatch.nowId) && Boolean(nowId) && this.#nowWatch.nowId !== nowId;
    this.#nowWatch.briefId = briefId;
    this.#nowWatch.nowId = nowId;
    if (pill) pill.hidden = true;
    if (!nowEl) return;
    const script = this.element.querySelector(".bi-runner__script");
    const scroller = script && getComputedStyle(script).overflowY === "auto" ? script : this.element.querySelector(".bi-runner__cols");
    if (moved && scroller) {
      const box = nowEl.getBoundingClientRect();
      const view = scroller.getBoundingClientRect();
      if (box.top < view.top || box.bottom > view.bottom) nowEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    if (!pill || typeof IntersectionObserver !== "function") return;
    this.#nowWatch.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        pill.hidden = entry.isIntersecting;
        pill.dataset.direction = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) ? "up" : "down";
      },
      { root: scroller ?? null, threshold: 0.01 }
    );
    this.#nowWatch.observer.observe(nowEl);
  }

  /**
   * @override
   * Foundry's own re-render already keeps the focus on a field it can find by
   * name, and the scroll position. It does not keep what was TYPED into that
   * field and not yet saved, nor where the caret was: a roll arriving or the
   * stage changing re-renders this panel at any moment, and without this her
   * half-written sentence would snap back to the saved one under her fingers.
   */
  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);
    const typing = priorElement.querySelector(".bi-edit textarea:focus, .bi-edit input:focus");
    if (typing?.name) {
      state.biTyping = { name: typing.name, value: typing.value, start: typing.selectionStart ?? null, end: typing.selectionEnd ?? null };
    }
  }

  /** @override — the other half of _preSyncPartState: put her words and her caret back. */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);
    const typing = state.biTyping;
    if (!typing) return;
    const field = [...newElement.querySelectorAll(".bi-edit textarea, .bi-edit input")].find((el) => el.name === typing.name);
    if (!field || field.type === "checkbox") return;
    if (field.value !== typing.value) {
      field.value = typing.value;
      field.closest(".bi-edit__field")?.classList.add("bi-edit__field--draft");
    }
    field.focus();
    if (typing.start !== null && typeof field.setSelectionRange === "function") {
      try {
        field.setSelectionRange(typing.start, typing.end ?? typing.start);
      } catch {
        /* a number box has no caret to put back */
      }
    }
  }

  /** @override — the running clock must not outlive the panel it writes into. */
  _onClose(options) {
    super._onClose?.(options);
    clearInterval(this.#timer);
    this.#timer = null;
    this.#nowWatch.observer?.disconnect?.();
    this.#nowWatch.observer = null;
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

  /**
   * Whether the script is showing the edit sheet (design/scene-edits.md).
   * Instance memory: a reload comes back to running the scene, the safe
   * default for a panel used mostly at the table. Nothing typed is lost by
   * that -- every box saves itself when she leaves it.
   */
  #editing = false;

  /** What went wrong with her last save, said at the top of the sheet until a save works. */
  #editError = null;

  /** Saves reach the server one at a time, in the order she made them. */
  #saveChain = Promise.resolve(true);

  /** A field to put the caret in after the next render: the line of a beat just added. */
  #focusAfterRender = null;

  /**
   * Everything the edit sheet draws: core/scene-edit-sheet.mjs's model for
   * this scene as the Runner shows it, plus what the sheet must say about
   * saving and about edits it could not place.
   */
  #editContext(loaded, state) {
    const npcNames = Object.fromEntries((state.cast ?? []).map((member) => [member.id, member.displayName ?? displayName(member)]));
    const sheet = editSheet({
      brief: loaded.brief,
      challenges: loaded.challenges,
      marks: loaded.edits?.marks ?? {},
      notes: loaded.edits?.notes ?? [],
      removed: loaded.edits?.removed ?? [],
      npcNames
    });
    if (!sheet) return null;
    return { ...sheet, error: this.#editError, listError: Boolean(sceneEditsState().listError), problems: loaded.edits?.problems ?? [] };
  }

  /** The document a field key names, as the Runner shows it now (her edits included). */
  #docFor(file) {
    const scene = this._scene;
    if (!scene?.brief) return null;
    if (file === `scene-briefs/${scene.brief.id}`) return scene.brief;
    if (file.startsWith("challenges/")) return scene.challenges?.[file.slice("challenges/".length)] ?? null;
    return null;
  }

  /**
   * Save one edit to the server, then show the scene with it. Queued behind
   * any save still in flight, so records carry the order she made them in.
   * `makeSpec` is a function building the record's spec from the scene as it
   * stands when its turn comes (or null: nothing to save). Resolves true when
   * the server has it, null when there was nothing to save; on failure, says
   * so at the top of the sheet and resolves false -- the words stay in their
   * box either way.
   */
  #saveEdit(makeSpec, field = null) {
    const briefId = currentBriefId();
    const run = async () => {
      // The spec is built HERE, once every earlier save has landed and the
      // scene has been reloaded with it -- so `before` is what she now sees,
      // her own previous edit included. Built at the moment she left the box,
      // a quick second edit to the same line (or a reworded beat removed at
      // once) would record her own words as a clash with themselves.
      const spec = typeof makeSpec === "function" ? makeSpec() : makeSpec;
      if (!spec) return null;
      this.#showSaving(true);
      try {
        await saveSceneEdit({ ...spec, briefId });
        this.#editError = null;
        forgetDraft(field?.dataset?.editKey);
        this._scene = await loadScene(briefId);
        return true;
      } catch (err) {
        console.error("Blank Inheritance | Could not save that edit to the server:", err);
        this.#editError = game.i18n.format("BLANKINHERITANCE.Runner.Edit.SaveFailed", { reason: err?.message ?? String(err) });
        field?.closest(".bi-edit__field")?.classList.add("bi-edit__field--failed");
        this.render({});
        return false;
      } finally {
        this.#showSaving(false);
      }
    };
    this.#saveChain = this.#saveChain.then(run, run);
    return this.#saveChain;
  }

  /** The small "Saving…" at the top of the sheet, shown while a save is in flight. */
  #showSaving(on) {
    const flag = this.element?.querySelector("[data-edit-saving]");
    if (flag) flag.hidden = !on;
  }

  /**
   * One field's box has lost focus (or a checkbox or list changed): save it if
   * it now says something the scene does not. `before` is what the Runner
   * showed -- her own last edit included -- so a second edit to the same line
   * chains onto the first rather than clashing with it.
   */
  async #commitField(input) {
    if (input.dataset.cancelled) {
      delete input.dataset.cancelled;
      forgetDraft(input.dataset.editKey);
      return;
    }
    let target;
    try {
      target = parseFieldKey(input.dataset.editKey);
    } catch {
      return;
    }
    // What she wrote is read now, from the box; what she saw is read when the
    // save's turn comes (#saveEdit).
    const kind = input.dataset.editKind;
    let after;
    if (kind === "flag") after = input.checked;
    else if (kind === "choice") after = input.value;
    else if (kind === "number") {
      // A DC is always a number in the check files' schema, so an emptied box
      // is refused rather than saved as nothing.
      const text = input.value.trim();
      if (text === "" || !Number.isFinite(Number(text))) {
        this.#editError = game.i18n.localize("BLANKINHERITANCE.Runner.Edit.BadNumber");
        this.render({});
        return;
      }
      after = Math.round(Number(text));
    } else after = normalizeText(input.value);

    let gone = null;
    const saved = await this.#saveEdit(() => {
      const doc = this.#docFor(target.file);
      if (!doc) return null;
      const found = resolvePath(doc, target.path);
      if (!found.ok) {
        gone = found.reason;
        return null;
      }
      const before = found.value ?? null;
      return sameValue(before, after) ? null : { op: "set", file: target.file, path: target.path, before, after };
    }, input);
    if (gone) {
      this.#editError = game.i18n.format("BLANKINHERITANCE.Runner.Edit.Gone", { reason: gone });
      this.render({});
      return;
    }
    if (saved === null) {
      forgetDraft(input.dataset.editKey);
      input.closest(".bi-edit__field")?.classList.remove("bi-edit__field--draft");
      return;
    }
    if (!saved) return;
    // Marked in place rather than re-rendered: a re-render here would take
    // the box she has just clicked into away from her mid-thought.
    const wrap = input.closest(".bi-edit__field");
    wrap?.classList.remove("bi-edit__field--draft", "bi-edit__field--failed");
    wrap?.classList.add("bi-edit__field--pending");
    const count = this.element?.querySelector("[data-edit-count]");
    const pending = this._scene?.edits?.pendingCount ?? 0;
    if (count && pending) {
      count.textContent = game.i18n.format("BLANKINHERITANCE.Runner.Edit.PendingCount", { n: pending });
      count.classList.remove("bi-edit__badge--done");
      count.classList.add("bi-edit__badge--pending");
    }
  }

  /**
   * Listeners the edit sheet's boxes need beyond ApplicationV2's click
   * actions: grow as she types, keep a draft in case the page goes away,
   * Esc to put a box back, Ctrl+Enter to save it, and saving when a box is
   * left (a checkbox or a list the moment it changes).
   */
  #bindEditSheet() {
    const sheet = this.element.querySelector(".bi-edit");
    if (!sheet) return;
    const briefId = currentBriefId();
    const draft = readDraft(briefId);

    for (const input of sheet.querySelectorAll("[data-edit-key]")) {
      const kind = input.dataset.editKind;
      if (input.tagName === "TEXTAREA") {
        if (draft?.key === input.dataset.editKey && draft.value !== input.value && document.activeElement !== input) {
          input.value = draft.value;
          input.closest(".bi-edit__field")?.classList.add("bi-edit__field--draft");
        }
        growToFit(input);
        input.addEventListener("input", () => {
          growToFit(input);
          rememberDraft(briefId, input);
          input.closest(".bi-edit__field")?.classList.add("bi-edit__field--draft");
        });
      }
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          const target = (() => {
            try {
              return parseFieldKey(input.dataset.editKey);
            } catch {
              return null;
            }
          })();
          const doc = target ? this.#docFor(target.file) : null;
          const found = doc ? resolvePath(doc, target.path) : null;
          if (found?.ok && kind !== "flag") input.value = found.value ?? "";
          input.dataset.cancelled = "1";
          input.closest(".bi-edit__field")?.classList.remove("bi-edit__field--draft");
          if (input.tagName === "TEXTAREA") growToFit(input);
          input.blur();
        } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey || kind === "line" || kind === "number")) {
          // A line is one line: Enter finishes it. Longer text takes Ctrl+Enter.
          event.preventDefault();
          input.blur();
        }
      });
      if (kind === "flag" || kind === "choice") input.addEventListener("change", () => this.#commitField(input));
      else input.addEventListener("blur", () => this.#commitField(input));
    }

    // The boxes that add a line or send a note: Ctrl+Enter presses their key.
    for (const box of sheet.querySelectorAll(".bi-edit__add-input, .bi-edit__note-input")) {
      growToFit(box);
      box.addEventListener("input", () => growToFit(box));
      box.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          box.value = "";
          growToFit(box);
          box.blur();
        } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          box.parentElement?.querySelector("button[data-action]")?.click();
        }
      });
    }

    if (this.#focusAfterRender) {
      const wanted = this.#focusAfterRender;
      this.#focusAfterRender = null;
      const field = [...sheet.querySelectorAll("[data-edit-key]")].find((el) => el.dataset.editKey === wanted);
      if (field) {
        field.scrollIntoView({ block: "center" });
        field.focus();
      }
    }
  }

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
        episodeTitle: episode?.title ?? null,
        beats: [],
        cast: [],
        handouts: [],
        carryForward: [],
        spends: [],
        backdrops: [],
        sections,
        editing: false,
        editPending: 0,
        edit: null
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
    // Whose real names the table has been told, for the Name key on each person.
    const namesTold = knownSet(await readKnownNames());

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
    // The party, read off the sheets, and whom each carry-in into this scene
    // applies to, looked up in the record (core/runner-party.mjs, 2026-10-04).
    let members = [];
    try {
      members = partyMemberRecords();
    } catch (err) {
      console.error("Blank Inheritance | Could not read the party for the Scene Runner:", err);
    }
    const carryIns = carryInsWithNames(state.intro?.carriesIn ?? [], { runs, members, arrivals: cityArrivals() });
    const decorated = state.beats.map((beat) =>
      this.#withView(this.#decorateBeat(beat, brief, challenges, entries, runState), { nowId, view, sections, runState, hasClock: Boolean(subsystem) })
    );
    // The City (design/world-map-destinations.md §7): who went where on the way
    // into this scene. A beat tagged for destinations shows the players who are
    // there; a beat for a destination nobody chose is not shown at all.
    const whoWent = participantsFor(briefId);
    const beats = Object.keys(whoWent).length
      ? decorated
          .filter((beat) => !beat.forDestination?.length || beat.forDestination.some((id) => whoWent[id]?.length))
          .map((beat) => (beat.forDestination?.length ? { ...beat, forNamesText: [...new Set(beat.forDestination.flatMap((id) => whoWent[id] ?? []))].join(", ") } : beat))
      : decorated;
    const cityParty = partyContext(briefId);
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
    // Whether each handout is already in the players' Papers, read off the
    // journal itself (foundry/handouts.mjs), so the button can say "show
    // again" rather than implying it has never been handed over.
    const filed = await handoutStates(state.handouts);

    return {
      ...state,
      // The actual PICTURES for this brief -- every Scene the scene set built
      // against it, main room and sub-rooms alike, so cutting to "the
      // examination room" is one click rather than a hunt through the sidebar.
      backdrops,
      tableElsewhere,
      // In the running order's own numbers: Episode One counts from 0, the
      // cold open, so "Scene 3 of 12" sat beside a button marked 2.
      position: position >= 0 ? (() => {
        const at = scenePosition(steps);
        return at ? game.i18n.format("BLANKINHERITANCE.Runner.SceneOf", { n: at.n, total: at.total }) : null;
      })() : null,
      // Where a note typed right now would land, shown next to the field so
      // the GM can see it before they commit rather than after.
      noteTarget: noteTargetFor(state.beats, runState),
      // The rules this scene's own words name (2026-10-04, core/scene-rules.mjs): the creatures its fights bring, the
      // conditions, actions and rules its beats, checks and clock mention, one press each. The free search is the Palette's.
      sceneRules: (this._sceneRules = rulesInScene({ brief, challenges, encounters: loaded.encounters ?? {}, subsystem }, await loadRulesGlossary())),
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
      // Read before the scene starts, then one line (core/runner-view.mjs#goalOpen).
      goalOpen: goalOpen(phase, view.bookends.goal ?? null),
      // The "back to now" pill's words: the beat being run, without its chips.
      nowLine: nowBeat ? String(nowBeat.text ?? "").replace(/<trig\b[^>]*\/>/gi, "").replace(/\s+/g, " ").trim() : null,
      partyStrip: partyStrip(members, carryIns),
      told: await this.#toldContext(scenes, briefId),
      showAll: sections.detail === true,
      // `scenes`/`open` LAST, after the spread: sceneRunnerState has no
      // scenes or open-state of its own, but either growing one later must
      // not silently be shadowed by it.
      episodeTitle: episode?.title ?? null,
      beats,
      party: cityParty,
      // Where this scene sits between story and downtime: the banner (D050).
      spectrum: spectrumOf(brief),
      deck: deckContext(brief, currentEpisodeId()),
      rest: restContext(brief),
      rumours: rumourContext(brief, currentEpisodeId()),
      haunt: brief.haunt ?? null,
      regulars: regularsContext(brief),
      condition: conditionContext(brief),
      // A scene's own opening narration is often the first place an NPC is
      // glimpsed (design/scene-triggers-and-depth.md §2 extended to intro/
      // outro after finding Shucks's own intro needed exactly this) -- same
      // decoration a beat's text/readAloud already gets, just scoped as
      // beatId "intro" since there is no real beat to attach it to.
      intro: state.intro ? { ...state.intro, carriesIn: carryIns, decoratedReadAloud: this.#decorateSceneReadAloud(state.intro, "intro", entries) } : null,
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
            decoratedReadAloud: this.#decorateSceneReadAloud(state.outro, "outro", entries),
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
          portrait: member.img ?? stagePortraitFor(rawStageId(member)) ?? null,
          // The Name key: only someone whose cast entry carries a `called`
          // line has a name to hold back, and the key reads "named" once told.
          nameProtected: isNameProtected(member),
          nameKnown: isNameProtected(member) ? namesTold.has(rawStageId(member)) : true,
          initial: String(member.displayName ?? "?").trim().charAt(0).toUpperCase() || "?",
          // The stopgap DCs in the card's head, beside the name, for the moment
          // a player lies to them or leans on them (core/runner-view.mjs#statDcs).
          stats: statDcs(member.brief?.statblock)
        };
      }),
      handouts: state.handouts.map((handout) => {
        const status = filed[handout.id] ?? { filed: false, table: false, userIds: [] };
        return { ...handout, filed: status.filed, filedToTable: status.table, filedCount: status.userIds.length };
      }),
      scenes,
      steps,
      open: this.#open,
      // The edit sheet (design/scene-edits.md): whether it is showing, how
      // many of her edits have not reached the repo yet (on the Edit key
      // either way), and the sheet itself.
      ...(() => {
        const edit = this.#editing ? this.#editContext(loaded, state) : null;
        return { editing: Boolean(edit), editPending: loaded.edits?.pendingCount ?? 0, edit };
      })()
    };
  }

  /**
   * What the table has been told so far this episode (core/table-knows.mjs):
   * the told facts' words (data/campaign/told-facts.json, generated by the
   * story build) and every beat ticked in every scene of the episode so far.
   */
  async #toldContext(scenes = [], briefId = null) {
    try {
      const file = await loadJson("campaign", "told-facts");
      const facts = file?.facts ?? {};
      const briefs = {};
      for (const scene of scenes) {
        const doc = scene.briefRef === briefId ? this._scene?.brief : await loadJson("scene-briefs", scene.briefRef);
        if (doc) briefs[scene.briefRef] = doc;
      }
      const groups = toldSoFar({ order: scenes, briefs, runs: allRuns(), facts });
      return { groups, count: toldCount(groups) };
    } catch (err) {
      console.error("Blank Inheritance | Could not gather what the table has been told:", err);
      return { groups: [], count: 0 };
    }
  }

  /**
   * The redesign's per-beat view fields, on top of #decorateBeat's content
   * ones: whether this is the beat the GM is on, whether its detail is open,
   * who it is about, what was recorded and by whom, and every result the
   * table has rolled against it.
   */
  #withView(beat, { nowId, view, sections, runState, hasClock = false }) {
    const tick = runState.ticked?.[beat.id] ?? null;
    const degreeLabel = (degree) => {
      const entry = DEGREE_LABELS.find(([key]) => key === degree);
      return entry ? game.i18n.localize(entry[1]) : degree;
    };
    let recorded = null;
    if (beat.degree) recorded = tick?.by ? `${degreeLabel(beat.degree)} · ${tick.by}` : degreeLabel(beat.degree);
    else if (beat.choice) recorded = recordedChoiceLabel(beat.choicePoint?.options, tick);
    const member = beat.npcRef ? castFor(this._scene?.brief, beat.npcRef) : null;
    return {
      ...beat,
      isNow: beat.id === nowId,
      isOpen: beatDetailOpen(beat.id, { nowId, resolvedId: view.resolvedId, opened: view.opened, closed: view.closed, showAll: sections.detail === true, done: beat.isDone }),
      npcName: member ? displayName(member) : null,
      choiceAsk: beat.choicePoint ? this.#askContext(beat.id) : null,
      recorded,
      recordedDegree: beat.degree ?? null,
      encounter: beat.encounterRef
        ? encounterSummary(this._scene?.encounters?.[beat.encounterRef], { clockAuto: runState.clockAuto !== false, hasClock: hasClock && Boolean(beat.subsystemRef) })
        : null
    };
  }

  /**
   * What the beat's choice block shows while the question is open on the
   * players' screens: how many have picked, and one row per player saying what
   * they chose (or that they have not). `isOpen: false` is the idle block, the
   * single "Ask the players" button.
   */
  #askContext(beatId) {
    const tally = choiceTallyFor(currentBriefId(), beatId);
    if (!tally) return { isOpen: false };
    return {
      isOpen: true,
      progress: game.i18n.format("BLANKINHERITANCE.ChoicePrompt.ProgressGM", { done: tally.done, total: tally.total }),
      rows: tally.rows.map((row) => ({ name: row.name, label: row.label, done: row.done, color: row.color }))
    };
  }

  /**
   * The same inline-trigger decoration a beat's own text/readAloud gets
   * (#decorateBeat below), for the two places outside a beat that also carry
   * authored readAloud prose: a scene's intro and outro. `sectionId` is
   * "intro"/"outro", standing in for a beatId in both the chip's own dataset
   * and the log's structured subject -- there is no real beat to scope by.
   */
  #decorateSceneReadAloud(section, sectionId, entries = []) {
    const { html, unknownIds } = decorateInlineTriggers(section?.readAloud, section?.triggers, sectionId, { fired: firedTriggerIds(entries, sectionId) });
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
  #decorateBeat(beat, brief, challenges, entries = [], runState = null) {
    const check = checkFor(beat, challenges);
    // Chips pressed by hand (the log) and chips its own tick fired
    // (core/beat-autofire.mjs) both show a tick on the chip.
    const fired = firedTriggerIds(entries, beat.id);
    for (const entry of runState?.ticked?.[beat.id]?.fired ?? []) fired.add(entry.id);
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
    // A beat with a check carries its pill in its own line, where the words ask
    // for it (core/check-pill.mjs): one press opens the check console on it.
    const decorate = (text) => decorateInlineTriggers(text, beat.triggers, beat.id, { fired });
    const { html: decoratedText, unknownIds: unknownInText } = check
      ? decorateWithCheck(beat.text, decorate, (words) => checkPill({ key: `beat:${beat.id}`, check, dc, words, lights: beatLights(brief.id, beat.id, runState) }))
      : decorate(beat.text);
    const { html: decoratedReadAloud, unknownIds: unknownInReadAloud } = beat.readAloud
      ? decorateInlineTriggers(beat.readAloud, beat.triggers, beat.id, { fired })
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
      // A note written as labelled lines (Do, Plant, Secret, Watch for, If ...) is laid out as a list, label
      // beside line, with a Secret marked so it is never read aloud (core/note-lines.mjs, D056). Anything
      // else stays the paragraph above.
      noteLines: (parseNoteLines(beat.note) ?? []).map((line) => ({
        label: line.label,
        html: renderProse(line.text, escapeHtml),
        isSecret: line.kind === "secret"
      })),
      // The authored options plus "Something else", always last and always
      // there (core/choice-prompt.mjs). Each one that was picked carries who
      // took it, so the table's split is readable after the prompt is closed.
      choicePoint: beat.choicePoint
        ? (() => {
            const nameOf = (userId) => game.users?.get(userId)?.character?.name ?? game.users?.get(userId)?.name ?? "?";
            const options = promptOptions(beat.choicePoint, { elseConsequence: game.i18n.localize("BLANKINHERITANCE.Runner.ChoiceInvented") });
            return {
              ...beat.choicePoint,
              options: options.map((option) => {
                const takers = Object.entries(beat.picks ?? {}).filter(([, id]) => id === option.id).map(([userId]) => nameOf(userId));
                return { ...option, isPicked: beat.choice === option.id || takers.length > 0, takers: takers.join(", ") };
              })
            };
          })()
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
      // Only when the line does not already say it ("If anyone studies the
      // water..." under "someone studies the water first" read it twice).
      whenLabel: conditionLabelShown(beat.when?.condition, beat.text) ? beat.when.condition : null,
      handout,
      // The check itself lives in the pill in the beat's line and the console
      // it opens (2026-10-05): the DC, the ways, each player's result and what
      // each degree means. The beat keeps only that it has one.
      check: check ? { name: check.name ?? check.id, dc, secret: check.secret === true } : null
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
    const picked = runState.topics?.[topicKey]?.degree ?? null;
    const key = `topic:${castId}:${index}`;
    const open = openCheckFor(brief.id, topicKey);
    const lights = open ? gmLights(open) : picked ? [{ state: picked }] : [];

    return {
      ...topic,
      topicKey,
      check: { pill: checkPill({ key, check, dc, words: null, lights }) }
    };
  }

  /* --- actions -------------------------------------------------- */

  static async #onToggleBeat(event, target) {
    const briefId = currentBriefId();
    const beatId = target.dataset.beatId;
    const state = runStateFor(briefId);
    const ticked = { ...state.ticked };
    const before = ticked[beatId] ?? null;

    if (before) {
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
    // Its objective chips fire, or are undone (D059, core/beat-autofire.mjs).
    if ((await beatAutomation(briefId, beatId, before, ticked[beatId] ?? null)).length) this.render({});
  }

  /**
   * Record which way a `choicePoint` actually went (design/scene-triggers-and-depth.md
   * §2.4, ux-doctrine.md Law 21) -- same toggle-and-log shape as a check's
   * outcome marked in the check console (recordMarkedOutcome): clicking the same option again clears it
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
    const before = ticked[beatId] ?? null;

    // Deciding it by hand ends any question still open on this beat: two
    // answers to one choice must never both stand.
    if (choiceTallyFor(briefId, beatId)) await closeChoicePrompt();

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
    if ((await beatAutomation(briefId, beatId, before, ticked[beatId] ?? null)).length) this.render({});
  }

  /**
   * The one button: put this beat's choicePoint to every player (a window on
   * each screen, foundry/choice-prompt.mjs). Ingram, 2026-10-04: the GM
   * presses one button and the players pick, with "Something else" always
   * offered last. Asking again replaces any question already open.
   */
  static async #onAskPlayers(event, target) {
    const beatId = target.dataset.beatId;
    const beat = this.#beat(beatId);
    if (!beat?.choicePoint) return;
    await openChoicePrompt({ briefId: currentBriefId(), beatId, choicePoint: beat.choicePoint });
    this.render({});
  }

  /**
   * Stop taking picks and record who went where: `ticked[beatId]` carries the
   * most-picked option as `choice` (what the run state has always held) and
   * the whole split as `picks`, and the log gets one line per option anyone
   * took, naming them. Nobody having picked records nothing.
   */
  static async #onClosePrompt(event, target) {
    const briefId = currentBriefId();
    const beatId = target.dataset.beatId;
    const tally = choiceTallyFor(briefId, beatId);
    if (!tally) {
      this.render({});
      return;
    }
    const prompt = tally.prompt;
    await closeChoicePrompt();
    const settled = settlePrompt(prompt);
    if (!settled) {
      ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.ChoicePrompt.NobodyPicked"));
      this.render({});
      return;
    }

    const state = runStateFor(briefId);
    const before = state.ticked?.[beatId] ?? null;
    const ticked = { ...state.ticked, [beatId]: { at: new Date().toISOString(), choice: settled.choice, picks: settled.picks } };
    fireBeatAudio(briefId, beatId);
    this.#viewFor(briefId).resolvedId = beatId;

    const nameOf = (userId) => game.users.get(userId)?.character?.name ?? game.users.get(userId)?.name ?? "?";
    for (const option of prompt.options) {
      const names = Object.entries(settled.picks).filter(([, id]) => id === option.id).map(([userId]) => nameOf(userId));
      if (names.length === 0) continue;
      try {
        await recordLogEntry({
          text: `${option.label} (${names.join(", ")})${prompt.question ? ` — ${prompt.question}` : ""}.`,
          nowIso: new Date().toISOString(),
          scene: canvas?.scene?.name ?? null,
          subject: choiceLogSubject(beatId, option.id)
        });
      } catch (err) {
        console.error("Blank Inheritance | Could not log that choice:", err);
      }
    }

    await writeRunState(briefId, { ...state, ticked });
    this.render({});
    if ((await beatAutomation(briefId, beatId, before, ticked[beatId])).length) this.render({});
  }

  /** Take the question off every screen and record nothing. */
  static async #onCancelPrompt(event, target) {
    if (choiceTallyFor(currentBriefId(), target.dataset.beatId)) await closeChoicePrompt();
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
    if (section !== "intro" && section !== "outro" && section !== "goal") return;
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

  /** One of the scene's rules, pressed: the system's own card for it (a condition, an action, a creature), or the SRD article. */
  static async #onOpenRule(event, target) {
    const rule = (this._sceneRules ?? []).find((r) => r.id === target.dataset.ruleId);
    if (rule) await openRule(rule);
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
    // other parts of the adventure (the Stagecraft bridge: the nest wakes, six centipedes) may act on a trigger being fired
    Hooks.callAll("blankInheritance.triggerFired", { briefId: brief?.id ?? null, beatId, trigger });

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
        await summonToStage(scene, summonDescriptorFor(member, trigger.arrival || member.arrival));
        await logFired();
        this.render({});
        return;
      }
      case "reveal-name": {
        // The table is told someone's real name, from the exact line where
        // they give it. Shift is not available on an inline chip, so an
        // authored `announce` is what asks for the banner.
        const member = castFor(brief, trigger.npcRef);
        if (!member) {
          console.error(`Blank Inheritance | Trigger "${triggerId}" names npcRef "${trigger.npcRef}", which isn't in this brief's cast.`);
          return;
        }
        if (!isNameProtected(member)) {
          ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.NameNotHidden", { name: displayName(member) }));
          return;
        }
        await revealName(rawStageId(member), { announce: Boolean(trigger.announce) });
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
        if (revealed) {
          await logFired();
          await this.#giveWithHandout(trigger.handoutRef, beatId);
          this.render({});
        }
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
          await openCheckConsole({
            briefId: brief.id,
            key: beatId,
            source: { kind: "beat", briefId: brief.id, beatId, checkRef: trigger.checkRef ?? null },
            skills: checkSkills(check),
            dc,
            blind: check.secret === true
          });
          await logFired();
        } catch (err) {
          console.error("Blank Inheritance | Could not put that check to the table:", err);
          ui.notifications.warn(String(err?.message ?? err));
        }
        return;
      }
      case "objective": {
        // design/objectives.md: give, tick, reveal, strike or close one. Give and close ask first; a press that
        // changes nothing (a second Give, a tick already made) is not logged.
        const changed = await runObjectiveTrigger(trigger, { scene: canvas?.scene?.name ?? brief?.title ?? null });
        if (changed) await logFired();
        this.render({});
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
   * Put one of the scene's own cast on the stage the table is looking at,
   * from their card in the script. The people the BRIEF names mostly have no
   * Actor at all, which is the common case in a theatre-of-the-mind scene.
   * The stage's own wings do the same from the stage itself, and find anyone
   * else (foundry/stagecraft-bridge.mjs, 2026-10-04).
   */
  static async #onStagePerson(event, target) {
    const scene = canvas?.scene;
    if (!scene) return ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Runner.NoSceneToStage"));
    const member = (this._scene?.brief?.cast ?? []).find((m) => portraitIdFor(m) === target.dataset.portraitId);
    if (!member) return;
    await summonToStage(scene, summonDescriptorFor(member, member.arrival));
    this.render({});
  }

  /**
   * Tell the table one person's real name. One press, known for the rest of
   * the campaign wherever they appear (foundry/stage.mjs#revealName). Shift
   * also drops the banner, the same modifier a reveal uses.
   */
  static async #onRevealName(event, target) {
    const member = (this._scene?.brief?.cast ?? []).find((m) => m.id === target.dataset.castId);
    if (!member || !isNameProtected(member)) return;
    await tellName({ nameKey: rawStageId(member), called: member.called, name: displayName(member) }, { announce: Boolean(event?.shiftKey) });
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
      openSceneCloseDialogue({ briefRef: leaving, title: brief?.title ?? leaving, mode: brief?.mode ?? null, reactionPrompts: brief?.reactionPrompts ?? [], writeDown: brief?.outro?.writeDown ?? [] });
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

  /** The explicit act, from the foot of the running order where a GM finishes. */
  static #onCloseScene() {
    openSceneCloseDialogue({
      briefRef: currentBriefId(),
      title: this._scene?.brief?.title ?? null,
      mode: this._scene?.brief?.mode ?? null,
      reactionPrompts: this._scene?.brief?.reactionPrompts ?? [],
      // The ending's own "Write down" questions, asked where the GM is already
      // writing about the scene (2026-10-04).
      writeDown: this._scene?.brief?.outro?.writeDown ?? []
    });
  }

  /** Draw one event from this scene's deck (core/event-deck.mjs). */
  static async #onDrawEvent() {
    const brief = this._scene?.brief;
    if (!brief) return;
    const drawn = await drawFor(brief, currentEpisodeId());
    if (!drawn) ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.Runner.Deck.Empty"));
    this.render();
  }

  /** The table saw it: it never comes up again. */
  static async #onWitnessEvent(event, target) {
    const brief = this._scene?.brief;
    if (!brief || !target.dataset.eventId) return;
    await witnessFor(brief, target.dataset.eventId);
    this.render();
  }

  /** Nobody saw it: back into the deck for another time. */
  static async #onReturnEvent(event, target) {
    const brief = this._scene?.brief;
    if (!brief || !target.dataset.eventId) return;
    await putBackFor(brief, target.dataset.eventId);
    this.render();
  }

  /**
   * Move a regular's attitude a step (D051): the ▲▼ beside each regular, or a
   * drawn event's own button, which carries its reason (the event's title).
   */
  static async #onShiftRegular(event, target) {
    const brief = this._scene?.brief;
    const change = Number(target.dataset.change);
    if (!brief || !target.dataset.regular || !Number.isInteger(change)) return;
    const why = target.dataset.eventId ? (brief.events ?? []).find((e) => e.id === target.dataset.eventId)?.title ?? null : game.i18n.localize("BLANKINHERITANCE.Runner.Regulars.ByHand");
    await shiftRegularFor(brief, target.dataset.regular, change, why);
    this.render();
  }

  /** Unlock (or re-lock) a haunt's upgrade by hand (D052). */
  static async #onToggleUpgrade(event, target) {
    const brief = this._scene?.brief;
    if (!brief || !target.dataset.upgradeId) return;
    await toggleUpgradeFor(brief, target.dataset.upgradeId);
    this.render();
  }

  /** Trigger (or clear) a haunt's setback by hand (D052). */
  static async #onToggleSetback(event, target) {
    const brief = this._scene?.brief;
    if (!brief || !target.dataset.setbackId) return;
    await toggleSetbackFor(brief, target.dataset.setbackId);
    this.render();
  }

  /** Switch the rumour mill to another of this episode's sets. */
  static async #onRumourSet(event, target) {
    const brief = this._scene?.brief;
    if (!brief || !target.dataset.setId) return;
    await chooseRumourSet(brief, target.dataset.setId);
    this.render();
  }

  /** Deal one player's three rumours for the degree they rolled (core/rumours.mjs). */
  static async #onDealRumours(event, target) {
    const brief = this._scene?.brief;
    if (!brief || !target.dataset.degree) return;
    await dealRumoursFor(brief, target.dataset.degree, currentEpisodeId());
    this.render();
  }

  /** Heal everyone this rest covers, by its fraction of their maximum HP (core/rest.mjs). */
  static async #onApplyRest() {
    const brief = this._scene?.brief;
    if (!brief) return;
    const results = await applyRest(brief);
    const text = results.map((r) => `${r.name} ${r.from}→${r.to}`).join(", ");
    ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.Rest.Applied", { who: text || "—" }));
    this.render();
  }

  /**
   * A check's pill, pressed: the check console opens on it (foundry/check-console.mjs), on the GM's screen and every
   * player's. Pressing the pill of the check already open just brings its window back.
   */
  static async #onOpenCheck(event, target) {
    const spec = checkSpecFor(this._scene, target.dataset.checkKey);
    if (!spec) return;
    // Putting a beat's check to the table is running that beat.
    if (spec.source.kind === "beat") this.#focus(spec.source.beatId);
    await openCheckConsole(spec);
    this.render({});
  }

  /** The header's Locations key: the Campaign Map first, then the Location Editor on it (location-editor.mjs#openLocationEditorOnMap). */
  static async #onOpenLocationEditor() {
    await openLocationEditorOnMap();
  }

  /** The header's Check key: the check that is open, or a new one made up on the spot (any skill, any DC). */
  static async #onOpenAdhocCheck() {
    if (currentCheck()) {
      showCheckConsole();
      return;
    }
    await openCheckConsole({ briefId: currentBriefId() || null, key: null, source: { kind: "adhoc" }, skills: [], dc: 15 });
  }

  /**
   * Hand something over for keeps.
   *
   * Since 2026-09-26 this is the same act as revealing a handout: both file
   * the document in the players' Papers and open it on their screens
   * (foundry/handouts.mjs). What an artefact adds is the record that the
   * party HOLDS it -- the "Held by the party" state and the run log -- and its
   * own confirm, which says it is permanent in so many words.
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

    const handed = await fileHandout(artefact, { audience: "table", confirm: false });
    if (!handed) return;

    const state = runStateFor(briefId);
    if (!state.granted.includes(artefactId)) {
      await writeRunState(briefId, { ...state, granted: [...state.granted, artefactId] });
    }
    ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.Granted", { title: artefact.title }));
    this.render({});
  }

  static async #onRevealHandout(event, target) {
    const revealed = await revealHandout(target.dataset.handoutId, this._scene, null);
    if (revealed) {
      await this.#giveWithHandout(target.dataset.handoutId, target.dataset.beatId ?? null);
      this.render({});
    }
    return revealed;
  }

  static async #onRevealHandoutSolo(event, target) {
    const user = await pickOnePlayer();
    if (!user) return false;
    const revealed = await revealHandout(target.dataset.handoutId, this._scene, [user]);
    if (revealed) {
      await this.#giveWithHandout(target.dataset.handoutId, target.dataset.beatId ?? null);
      this.render({});
    }
    return revealed;
  }

  /**
   * Showing a beat's handout gives the objective that beat gives (D059): the
   * acceptance letter IS the enrolment order, and the docket IS the errand.
   * Found starting The Road In: three presses and a confirm, and the letter
   * shown with no objective given. The handout's own confirm was the
   * deliberate act, so the give does not ask again. Logged as a press of the
   * chip, so the chip shows it happened.
   */
  async #giveWithHandout(handoutId, beatId = null) {
    const brief = this._scene?.brief;
    if (!brief || !handoutId) return [];
    // Offered whether or not the chip was pressed before: a second give
    // changes nothing (the store is idempotent) and is not logged.
    const { beat, chips } = chipsToFireOnHandout(brief.beats ?? [], handoutId, { beatId });
    if (!beat) return [];
    const said = [];
    for (const chip of chips) {
      let changed = false;
      try {
        changed = await runObjectiveTrigger(chip, { scene: canvas?.scene?.name ?? brief.title ?? null, confirm: false, quiet: true });
      } catch (err) {
        console.error(`Blank Inheritance | Could not give "${chip.objectiveRef}" with its handout:`, err);
      }
      if (!changed) continue;
      said.push(chip.label ?? chip.id);
      await recordLogEntry({
        text: chip.label ?? chip.id,
        nowIso: new Date().toISOString(),
        scene: canvas?.scene?.name ?? null,
        subject: triggerLogSubject(beat.id, chip.id)
      }).catch((err) => console.error("Blank Inheritance | Could not log that objective:", err));
    }
    if (said.length) ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.AutoFired", { what: said.join(" · ") }));
    return said;
  }

  /**
   * Set up the beat's fight (foundry/fight-setup.mjs): the creatures from the
   * compendium, a combat with the party, the creatures' initiative rolled for
   * the GM only, and the tracker opened. A second press finds the same fight.
   */
  static async #onSetUpFight(event, target) {
    const briefId = currentBriefId();
    const beat = this.#beat(target.dataset.beatId);
    const encounter = beat?.encounterRef ? this._scene?.encounters?.[beat.encounterRef] : null;
    if (!encounter) return;
    this.#focus(beat.id);
    const clockAuto = runStateFor(briefId).clockAuto !== false;
    try {
      const combat = await setUpFight(encounter, { briefId, beatId: beat.id, clockAuto });
      if (combat) {
        await recordLogEntry({
          text: game.i18n.format("BLANKINHERITANCE.Runner.FightSetup.Logged", { name: encounter.name ?? encounter.id }),
          nowIso: new Date().toISOString(),
          scene: canvas?.scene?.name ?? null,
          subject: `${beat.id}::fight`
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Blank Inheritance | Could not set up the fight:", err);
      ui.notifications.error(game.i18n.format("BLANKINHERITANCE.Runner.FightSetup.Failed", { reason: err?.message ?? String(err) }));
    }
    this.render({});
  }

  /**
   * Whether the scene's clock rises by itself as rounds end (the compactor's
   * own rule, "the GM advances it"). On by default; off for a table that wants
   * the simpler fight, which the subsystem itself allows.
   */
  static async #onToggleClockAuto() {
    const briefId = currentBriefId();
    const state = runStateFor(briefId);
    const next = !(state.clockAuto !== false);
    await writeRunState(briefId, { ...state, clockAuto: next });
    this.render({});
  }

  /** The "back to now" pill: the beat being run, scrolled into view. */
  static #onJumpToNow() {
    const nowEl = this.element?.querySelector(".bi-runner__beat--now");
    nowEl?.scrollIntoView({ block: "start", behavior: "smooth" });
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

  /* --- the edit sheet (design/scene-edits.md) ------------------- */

  static async #onToggleEdit() {
    this.#editing = !this.#editing;
    this.#editError = null;
    // Re-listed from the server each time the sheet opens, so an edit made in
    // another tab, or a deploy that has merged some, shows as it is now.
    if (this.#editing) await loadSceneEdits({ refresh: true }).catch(() => {});
    this.render({});
  }

  // Every button below hands #saveEdit a FUNCTION, not a finished spec: the
  // beats, lists and items it describes are read when the save's turn comes,
  // after any save still in flight has landed (see #saveEdit).

  /** A new beat, empty, where she pressed; the caret goes straight into its line. */
  static async #onEditAddBeat(event, target) {
    const afterId = target.dataset.afterId || null;
    let file = null;
    let id = null;
    const saved = await this.#saveEdit(() => {
      const brief = this._scene?.brief;
      if (!brief) return null;
      file = `scene-briefs/${brief.id}`;
      id = newItemId("beat", (brief.beats ?? []).map((b) => b.id), foundry.utils.randomID(5));
      return { op: "insert", file, path: ["beats"], afterId, item: { id, kind: "action", text: "", mandatory: false, delivery: "table" } };
    });
    if (!saved) return;
    this.#focusAfterRender = fieldKey(file, ["beats", { id }, "text"]);
    this.render({});
  }

  /** A beat out of the scene. The record keeps all of it, so "Put it back" restores it where it stood. */
  static async #onEditRemoveBeat(event, target) {
    const beatId = target.dataset.beatId;
    const saved = await this.#saveEdit(() => {
      const brief = this._scene?.brief;
      const beats = brief?.beats ?? [];
      const index = beats.findIndex((b) => b.id === beatId);
      if (index < 0) return null;
      return { op: "remove", file: `scene-briefs/${brief.id}`, path: ["beats"], itemId: beatId, item: beats[index], afterId: index > 0 ? beats[index - 1].id : null };
    });
    if (saved) this.render({});
  }

  static async #onEditMoveBeat(event, target) {
    const { beatId, afterId } = target.dataset;
    const saved = await this.#saveEdit(() => {
      const brief = this._scene?.brief;
      return brief ? { op: "move", file: `scene-briefs/${brief.id}`, path: ["beats"], itemId: beatId, afterId: afterId || null } : null;
    });
    if (saved) this.render({});
  }

  static async #onEditUndoRemove(event, target) {
    const recordId = target.dataset.recordId;
    const saved = await this.#saveEdit(() => {
      const removal = (this._scene?.edits?.removed ?? []).find((r) => r.recordId === recordId);
      return removal ? { op: "insert", file: removal.file, path: removal.path, afterId: removal.afterId ?? null, item: removal.item } : null;
    });
    if (saved) this.render({});
  }

  /** A line added to a list: plain text, or an item with an id of its own. */
  static async #onEditAddItem(event, target) {
    const box = target.parentElement?.querySelector("textarea");
    const text = normalizeText(box?.value ?? "");
    if (!text) {
      box?.focus();
      return;
    }
    let where;
    try {
      where = parseFieldKey(target.dataset.listKey);
    } catch {
      return;
    }
    const { plain, idPrefix, textKey } = target.dataset;
    const saved = await this.#saveEdit(() => {
      const doc = this.#docFor(where.file);
      if (!doc) return null;
      const found = resolvePath(doc, where.path);
      const list = found.ok && Array.isArray(found.value) ? found.value : [];
      if (plain === "true") return { op: "insert", file: where.file, path: where.path, atIndex: list.length, item: text };
      return {
        op: "insert",
        file: where.file,
        path: where.path,
        afterId: list.at(-1)?.id ?? null,
        item: { id: newItemId(idPrefix || "item", list.map((i) => i?.id), foundry.utils.randomID(5)), [textKey || "text"]: text }
      };
    });
    if (!saved) return;
    if (box) box.value = "";
    this.render({});
  }

  static async #onEditRemoveItem(event, target) {
    let where;
    try {
      where = parseFieldKey(target.dataset.listKey);
    } catch {
      return;
    }
    const { itemId, index: indexText } = target.dataset;
    const saved = await this.#saveEdit(() => {
      const doc = this.#docFor(where.file);
      const found = doc ? resolvePath(doc, where.path) : null;
      const list = found?.ok && Array.isArray(found.value) ? found.value : [];
      if (itemId) {
        const item = list.find((i) => i?.id === itemId);
        return item ? { op: "remove", file: where.file, path: where.path, itemId, item } : null;
      }
      const index = Number(indexText);
      if (!Number.isInteger(index) || index < 0 || index >= list.length) return null;
      return { op: "remove", file: where.file, path: where.path, atIndex: index, item: list[index] };
    });
    if (saved) this.render({});
  }

  /** A note for Claude, pinned where she wrote it. */
  static async #onEditSaveNote(event, target) {
    const box = target.parentElement?.querySelector("textarea");
    const text = normalizeText(box?.value ?? "");
    if (!text) {
      box?.focus();
      return;
    }
    let where;
    try {
      where = parseFieldKey(target.dataset.noteAnchor);
    } catch {
      return;
    }
    const saved = await this.#saveEdit({ op: "note", file: where.file, path: where.path, text });
    if (!saved) return;
    if (box) box.value = "";
    this.render({});
  }

  static async #onEditWithdrawNote(event, target) {
    const note = (this._scene?.edits?.notes ?? []).find((n) => n.id === target.dataset.noteId);
    if (!note) return;
    const saved = await this.#saveEdit({ op: "withdraw", file: note.file, path: note.path ?? [], noteId: note.id });
    if (saved) this.render({});
  }
}

/* ---------------------------------------------------------------- */
/*  Edit-sheet helpers                                               */
/* ---------------------------------------------------------------- */

/**
 * The words in the box being typed in, kept in this browser until the box is
 * saved -- so a page that goes away mid-sentence (a reload after a deploy, a
 * crash) gives them back next time the sheet opens rather than losing them.
 * One draft at a time: only one box is ever being typed in. Storage that
 * throws (a private window) costs only this safety net, never the edit.
 */
const DRAFT_STORAGE_KEY = "blank-inheritance.sceneEditDraft";

function rememberDraft(briefId, input) {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ briefId, key: input.dataset.editKey, value: input.value, at: Date.now() }));
  } catch {
    /* no storage: the box itself still holds the words */
  }
}

function readDraft(briefId) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null");
    return draft && draft.briefId === briefId ? draft : null;
  } catch {
    return null;
  }
}

function forgetDraft(key) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null");
    if (draft && (!key || draft.key === key)) window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* nothing to forget */
  }
}

/** A text box exactly as tall as its words, so the sheet reads like the scene rather than a form of scrollbars. */
function growToFit(box) {
  box.style.height = "auto";
  box.style.height = `${box.scrollHeight + 2}px`;
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
 * Hand a document to the table, or one person: it opens on their screens
 * now, and it stays in their Papers for the rest of the campaign.
 *
 * ALWAYS behind a confirm, never automatic — Law 17: "Confirm anything the
 * players will see... revealing a document, pushing a check." The panel does
 * every part of the preparation so that the confirm is one deliberate click
 * at the moment the GM chooses, which is the whole of "easy" without any of
 * "automatic".
 *
 * Kept, not transient, since 2026-09-26 (Ingram: "whenever we do that we also
 * make it so that this journal now is public to the players"). Everything
 * about how is foundry/handouts.mjs's job; this is only the brief lookup, so
 * every way of revealing (a beat's button, the Kit list, an inline trigger)
 * goes through one function.
 *
 * Returns whether the handout was actually handed over -- `false` for a
 * missing handout, a cancelled confirm, or a thrown error, so a caller that
 * logs a trigger press (scene-triggers-and-depth.md §2.5) can tell a real
 * reveal from a GM who backed out of the confirm dialog.
 */
async function revealHandout(handoutId, scene, users) {
  const handout = (scene?.brief?.handouts ?? []).find((h) => h.id === handoutId);
  if (!handout) return false;
  const handed = await fileHandout(handout, { audience: users?.length ? users : "table" });
  if (!handed) return false;
  return true;
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
  // Whatever cut to it -- a group's turn, a muster, the palette -- the clock
  // follows the scene the table is now in (forward only; advanceMomentTo).
  if (briefRef && game.users?.activeGM?.isSelf) {
    advanceMomentToBrief(briefRef).catch((err) => console.error("Blank Inheritance | Could not move the day ring to the new scene:", err));
  }
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
 * A result the table rolled for one of this runner's checks (tagged with its
 * brief and beat — foundry/check-console.mjs#checkRollOptions) records itself against that beat, filling
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

/**
 * The compactor rises by itself (2026-10-04): when a round of a fight set up
 * from the Runner ends, the clock of the scene it was set up from goes up one
 * (core/fight-setup.mjs#roundEnded, #clockStepOnRound), logged like a nudge by
 * hand, with the new threshold said out loud when one is crossed. Off when
 * the GM switched it off on the fight card. Only the active GM writes.
 */
Hooks.on("updateCombat", (combat, changed, options = {}) => {
  if (!game.user?.isGM || !("round" in (changed ?? {}))) return;
  const activeGm = game.users?.activeGM;
  if (activeGm && activeGm.id !== game.user.id) return;
  const fight = combat?.getFlag?.(MODULE_ID, "fight");
  if (!fight?.briefId) return;
  // The fight card says which round it is, so it is redrawn after any round
  // change, whether or not the clock moved.
  const work = roundEnded(changed.round, { direction: options?.direction ?? 1 }) ? advanceClockForRound(fight.briefId, changed.round) : Promise.resolve();
  work
    .catch((err) => console.error("Blank Inheritance | Could not move the scene's clock for the new round:", err))
    .finally(() => {
      if (active?.open) refreshSceneRunner();
    });
});

async function advanceClockForRound(briefId, round) {
  const state = runStateFor(briefId);
  if (state.clockAuto === false) return;
  const loaded = await loadScene(briefId);
  const subsystem = loaded?.subsystem;
  const clock = subsystem ? clockState(subsystem, state) : null;
  const step = clockStepOnRound(clock);
  if (!step) return;
  const adjust = { ...(state.adjust ?? {}), [clock.poolId]: (Number(state.adjust?.[clock.poolId]) || 0) + step };
  await writeRunState(briefId, { ...state, adjust });
  const after = clockState(subsystem, { ...state, adjust });
  const crossed = after.latest && after.latest !== clock.latest && after.latest.atValue !== clock.latest?.atValue ? after.latest : null;
  await recordLogEntry({
    text: `${after.name}: ${clock.current} → ${after.current} (round ${round}).`,
    nowIso: new Date().toISOString(),
    scene: canvas?.scene?.name ?? null,
    subject: `clock::${clock.poolId}`
  }).catch((err) => console.error("Blank Inheritance | Could not log that clock change:", err));
  ui.notifications.info(
    game.i18n.format("BLANKINHERITANCE.Runner.ClockRose", { name: after.name, value: after.current, limit: after.limit }) + (crossed ? ` ${crossed.effect}` : "")
  );
  refreshSceneRunner();
}

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
