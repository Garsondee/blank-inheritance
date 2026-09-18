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
  displayName,
  emptyRunState,
  hiddenAdjustment,
  noteCounts,
  noteTargetFor,
  notesForBeat,
  pacing,
  sectionStates,
  shouldOfferClose,
  postedDc,
  sceneRunnerState
} from "../core/scene-brief.mjs";
import { enricherFor } from "../core/roll-intent.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson, listModuleImageIds } from "./io.mjs";
import { fitDeck } from "./deck.mjs";
import { currentEntries, recordLogEntry } from "./session-log.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { summonToStage } from "./stage.mjs";
import { applySoundscape, fireEvent } from "./audio-director.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";

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

  return { brief, episode, subsystem, challenges };
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

/** The one check a beat names, out of its challenge's handful. */
function checkFor(beat, challenges) {
  const challenge = challenges[beat.challengeRef];
  if (!challenge) return null;
  const checks = challenge.checks ?? [];
  return (beat.checkRef ? checks.find((c) => c.id === beat.checkRef) : checks[0]) ?? null;
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
      spend: SceneRunner.#onSpend,
      pickScene: SceneRunner.#onPickScene,
      cutTo: SceneRunner.#onCutTo,
      openPalette: SceneRunner.#onOpenPalette,
      stagePerson: SceneRunner.#onStagePerson,
      closeScene: SceneRunner.#onCloseScene,
      postCheck: SceneRunner.#onPostCheck,
      revealHandout: SceneRunner.#onRevealHandout,
      revealHandoutSolo: SceneRunner.#onRevealHandoutSolo,
      grantArtefact: SceneRunner.#onGrantArtefact
    }
  };

  // Both partials declared here rather than only referenced from panel.hbs:
  // `templates` is what preloads them AND registers each under its full path,
  // which is the name the {{> "..."}} lookups use.
  static PARTS = {
    panel: {
      template: `${TEMPLATE_ROOT}/panel.hbs`,
      templates: [`${TEMPLATE_ROOT}/person.hbs`, `${TEMPLATE_ROOT}/beat.hbs`],
      scrollable: [".bi-runner__scroll"]
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

    // Enter saves. Bound here rather than as a data-action because the field
    // is a text input, not a button, and a note must never need a second click.
    // <details> does the folding itself; this only remembers the choice, and
    // deliberately does NOT re-render — re-rendering on open would fight the
    // element's own animation and lose the GM's scroll position.
    for (const fold of this.element.querySelectorAll(".bi-runner__section--fold")) {
      fold.addEventListener("toggle", () => {
        const id = fold.dataset.section;
        if (!id || !game.user.isGM) return;
        game.settings.set(MODULE_ID, SETTING_FOLDS, { ...folds(), [id]: fold.open }).catch(() => {});
      });
    }

    const input = this.element.querySelector(".bi-runner__note-input");
    input?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      SceneRunner.#onNote.call(this, event);
    });
  }

  /** The loaded scene, kept so the action handlers do not re-fetch on every click. */
  _scene = null;

  /**
   * Whether the drawer is open. Closed by default -- a GM who has not opened
   * an episode should not permanently lose a third of the screen to an empty
   * "No scene chosen" panel; the toggle button is always visible either way.
   */
  #open = false;

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

    if (!loaded) {
      return { open: this.#open, scenes, episodeTitle: episode?.title ?? null, beats: [], cast: [], handouts: [], carryForward: [], spends: [], backdrops: [], sections: sectionStates(folds()) };
    }

    const { brief, subsystem, challenges } = loaded;
    const runState = runStateFor(briefId);
    const state = sceneRunnerState({ brief, subsystem, runState, locationKey: brief.sceneRef });
    const entries = currentEntries();

    return {
      ...state,
      // The actual PICTURES for this brief -- every Scene the scene set built
      // against it, main room and sub-rooms alike, so cutting to "the
      // examination room" is one click rather than a hunt through the sidebar.
      backdrops: backdropsFor(briefId),
      // Where a note typed right now would land, shown next to the field so
      // the GM can see it before they commit rather than after.
      noteTarget: noteTargetFor(state.beats, runState),
      sections: sectionStates(folds()),
      pacing: pacing({ startedAt: runState.startedAt ?? null, runsAbout: brief.runsAbout }),
      // `scenes`/`open` LAST, after the spread: sceneRunnerState has no
      // scenes or open-state of its own, but either growing one later must
      // not silently be shadowed by it.
      episodeTitle: episode?.title ?? null,
      beats: state.beats.map((beat) => this.#decorateBeat(beat, brief, challenges, entries)),
      cast: state.cast.map((member) => ({
        ...member,
        brief: member.brief ?? {},
        portraitId: portraitIdFor(member),
        // Whether this person is already standing on the scene the table is
        // looking at, so the key can say "on stage" instead of offering to put
        // them there twice.
        onStage: stagedPortraitIds().has(portraitIdFor(member))
      })),
      scenes,
      open: this.#open
    };
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

    return {
      ...beat,
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
      outcomes: check
        ? DEGREE_LABELS.map(([degree, key]) => ({
            degree,
            label: game.i18n.localize(key),
            isPicked: beat.degree === degree
          }))
        : [],
      check: check
        ? {
            label: `${(check.skillOptions ?? []).join(" / ")} ${dc ?? ""}`.trim(),
            // The GM sees what was done to the number; the players never will.
            title: adjustment
              ? `${check.name ?? check.id} — DC ${baseDc} ${adjustment > 0 ? "−" : "+"}${Math.abs(adjustment)} here`
              : (check.name ?? check.id)
          }
        : null
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
    this.render({});
  }

  /**
   * Record how a check actually came out.
   *
   * Ticks the beat as a side effect, because a check that produced a degree
   * self-evidently happened — asking the GM to click twice for one event is
   * the kind of bookkeeping doctrine §10.1 says will simply not get done.
   * Clicking the same degree again clears it back to an untouched beat.
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
    }

    await writeRunState(briefId, { ...state, ticked });
    this.render({});
  }

  static async #onOpenBeat(event, target) {
    const briefId = currentBriefId();
    const state = runStateFor(briefId);
    const beatId = target.dataset.beatId;
    if (state.opened.includes(beatId)) return;
    await writeRunState(briefId, { ...state, opened: [...state.opened, beatId] });
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

  /** Cut the whole table to one of this brief's backdrops. */
  static async #onCutTo(event, target) {
    const { cueScene } = await import("./director-panel.mjs");
    await cueScene(target.dataset.sceneId);
    this.render({});
  }

  /**
   * Put one of the scene's own cast on the stage the table is looking at.
   *
   * The summon panel already does this for real Actors; this does it for the
   * people the BRIEF names, who mostly have no Actor at all -- which is the
   * common case in a theatre-of-the-mind scene and the one that previously
   * meant leaving the script to go and find them.
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
      isPc: false
    });
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

  static async #onPickScene(event, target) {
    const leaving = currentBriefId();
    const briefId = target.dataset.briefId ?? "";
    await game.settings.set(MODULE_ID, SETTING_BRIEF, briefId);
    applySceneAudio(briefId);
    this.render({});

    // design/ux-doctrine.md §10.3a puts the close dialogue "on cueing the next
    // scene", and calls it the one place friction is wanted. Offered AFTER the
    // switch rather than blocking it: a GM moving on should move on, and an
    // unfinished scene is a real state the dialogue itself handles ("it stays
    // open and carries forward"). Only for a scene actually RUN — flicking
    // between briefs to read them must not nag.
    if (leaving && leaving !== briefId && shouldOfferClose(runStateFor(leaving))) {
      const brief = this._scene?.brief?.id === leaving ? this._scene.brief : null;
      openSceneCloseDialogue({ briefRef: leaving, title: brief?.title ?? leaving });
    }
  }

  /** The explicit act, from the foot of the running order where a GM finishes. */
  static #onCloseScene() {
    openSceneCloseDialogue({ briefRef: currentBriefId(), title: this._scene?.brief?.title ?? null });
  }

  /**
   * Post the check for the table to roll.
   *
   * The DC posted is already adjusted by any hidden modifier, so the player
   * rolls against a number nobody tells them and we never touch their sheet
   * (Law 18 — never recompute what sf2e already computes; the `@Check`
   * enricher is sf2e's own, with 1,586 uses in the shipped compendia).
   */
  static async #onPostCheck(event, target) {
    const beat = this.#beat(target.dataset.beatId);
    const check = beat ? checkFor(beat, this._scene?.challenges ?? {}) : null;
    if (!check) return;

    const slug = (check.skillOptions ?? [])[0];
    const brief = this._scene.brief;
    const dc = postedDc(check.dc?.value ?? null, hiddenAdjustment(brief.gmModifiers ?? [], {
      challengeRef: beat.challengeRef,
      locationKey: brief.sceneRef
    }));

    try {
      await ChatMessage.create({ content: enricherFor({ slug, dc }) });
    } catch (err) {
      console.error("Blank Inheritance | Could not post that check:", err);
      ui.notifications.warn(String(err?.message ?? err));
    }
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
    this.render({});
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
async function revealHandout(handoutId, scene, users) {
  const handout = (scene?.brief?.handouts ?? []).find((h) => h.id === handoutId);
  if (!handout) return;

  const who = users?.length
    ? game.users.get(users[0])?.name ?? "?"
    : game.i18n.localize("BLANKINHERITANCE.Runner.Everyone");

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("BLANKINHERITANCE.Runner.Reveal") },
    content: `<p>${game.i18n.format("BLANKINHERITANCE.Runner.RevealConfirm", { title: handout.title, who })}</p>
              <p><em>${game.i18n.localize("BLANKINHERITANCE.Runner.RevealConfirmHint")}</em></p>`
  }).catch(() => false);
  if (!confirmed) return;

  try {
    if (handout.imagePath) {
      foundry.documents.collections.Journal.showImage(handout.imagePath, {
        title: handout.title,
        users: users ?? []
      });
    } else {
      const page = await ensureHandoutPage(handout);
      if (!page) return;
      await foundry.documents.collections.Journal.show(page, { force: true, users: users ?? [] });
    }
    ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.Revealed", { title: handout.title, who }));
  } catch (err) {
    console.error("Blank Inheritance | Could not reveal that handout:", err);
    ui.notifications.error(String(err?.message ?? err));
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
// fires once rather than every time.
Hooks.on("blank-inheritance.sceneClosed", ({ briefRef } = {}) => {
  if (!briefRef) return;
  markClosed(briefRef).then(() => refreshSceneRunner()).catch(() => {});
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
  (active ?? mountSceneRunner())?.toggle();
  return active;
}

export function unmountSceneRunner() {
  active?.close();
  active = null;
}

/**
 * Load an episode's running order AND open the drawer to show it — the
 * once-per-session action. Loading content without also opening the drawer
 * would be a silent no-op from the GM's point of view.
 */
export async function openSceneRunner(episodeId, briefId = "") {
  if (!game.user?.isGM) return null;
  resetSceneRunnerCache();
  await game.settings.set(MODULE_ID, SETTING_EPISODE, episodeId ?? "");
  await game.settings.set(MODULE_ID, SETTING_BRIEF, briefId ?? "");
  if (briefId) applySceneAudio(briefId);
  const runner = mountSceneRunner();
  if (runner && !runner.open) runner.toggle();
  return runner;
}
