/**
 * The Director's panel — cueing scenes for the whole table.
 *
 * design/foundry-module-design.md §7: this is almost entirely native Foundry
 * primitives, confirmed directly against source
 * (foundryvtt/.../client/documents/scene.mjs) rather than assumed:
 *
 *   Scene#activate({viewOptions}) sets this scene `active: true`. Every
 *   OTHER client already auto-navigates to whichever scene is active --
 *   that propagation is core Foundry behaviour this file does not have to
 *   build. `activate()`'s own `pullUsers` option only re-pulls stragglers to
 *   an ALREADY-active scene (confirmed: `if (!this.active) pullUsers =
 *   false`) -- it is not what makes a fresh cue reach everyone.
 *
 *   Scene#pullUsers(users, viewOptions) is the separate lever for "look at
 *   what I'm looking at right now" WITHOUT changing the world's active
 *   scene -- called on canvas.scene (the GM's own current view), not on a
 *   target.
 *
 * No harvest, no state to own here beyond what Scene documents already are
 * -- this file is thinner than campaign-state.mjs/equipment-state.mjs
 * because there is genuinely less to it.
 */

import { sceneRows, transitionOptions, TRANSITION_TYPES, findSceneAuthoring, cueGateDecision } from "../core/director-panel.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { landingSceneId } from "./landing-scene.mjs";
import { fetchModuleJson } from "./io.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const MACRO_SOURCE_ID = "blank-inheritance-director-panel-macro";

/**
 * Low-level primitive: activate a scene, no policy attached. Deliberately
 * NOT gated by authoring status (issue #168) -- this is shared by an
 * automatic "never blocks arrival" advance path (scene-runner.mjs's
 * advanceAfterClose) and by travel.mjs's own final leg of a travel sequence,
 * neither of which should ever silently stop moving the table because
 * something is still drafted. Callers that represent a genuinely deliberate
 * "cue this specific scene" GM choice check the gate THEMSELVES first, via
 * checkCueGate below, and only call this once allowed or overridden -- see
 * #onCue in this file and #onCutTo/#onCueScene in scene-runner.mjs.
 */
export async function cueScene(sceneId, { transitionType, transitionDuration } = {}) {
  if (!game.user.isGM) return null;
  const scene = game.scenes.get(sceneId);
  if (!scene) return null;
  return scene.activate({ viewOptions: { transition: transitionOptions(transitionType, transitionDuration) } });
}

// The only two episode files that currently exist (CLAUDE.md's data/episodes/
// entry) -- kept as a small local list rather than a directory browse, same
// shape as sync.mjs's own REAL_EPISODE_PATHS, since a genuinely missing
// episode just means findSceneAuthoring finds no match (issue #166: "not
// found" already correctly means "no gate applies").
const EPISODE_PATHS_FOR_GATE = [
  "data/campaign/episodes/episode-c1s1-mothers-maiden-name.json",
  "data/campaign/episodes/episode-c1s2-scheduled-exercise.json"
];

/** Resolves a live Scene's `briefRef` flag back to its narrative scene's authoring block, or null if untracked. */
async function resolveSceneAuthoring(scene) {
  const briefRef = scene.getFlag(MODULE_ID, "briefRef");
  if (!briefRef) return null;
  const episodes = await Promise.all(
    EPISODE_PATHS_FOR_GATE.map((p) => fetchModuleJson(p).catch(() => null))
  );
  return findSceneAuthoring(episodes.filter(Boolean), briefRef);
}

/**
 * design/approvals-desk.md §3, issue #168: cueing a still-drafted scene is
 * gated, not silently allowed and not hard-blocked -- but ONLY at the
 * deliberate-choice call sites that opt into calling this (see cueScene's own
 * header for why it isn't baked into every scene transition). Exported so
 * scene-runner.mjs's #onCutTo/#onCueScene can share it rather than
 * reimplementing the same resolution.
 */
export async function checkCueGate(sceneId, { override = false } = {}) {
  const scene = game.scenes.get(sceneId);
  if (!scene) return { allowed: true, status: null, gated: false };
  const authoring = await resolveSceneAuthoring(scene);
  return cueGateDecision(authoring, { override });
}

/** Shared confirm dialog for a gated cue, used by every deliberate-choice call site. Returns true if the GM chose to proceed anyway. */
export async function confirmDraftedSceneCue(status) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("BLANKINHERITANCE.Director.DraftedSceneTitle") },
    content: `<p>${game.i18n.format("BLANKINHERITANCE.Director.DraftedSceneBody", { status })}</p>`
  }).catch(() => false);
}

/** Pulls every currently-connected player to whatever the GM is looking at right now, without touching the world's active scene. */
export async function pullEveryoneHere({ transitionType, transitionDuration } = {}) {
  if (!game.user.isGM) return null;
  const target = canvas?.scene;
  if (!target) return null;
  return target.pullUsers(game.users, transitionOptions(transitionType, transitionDuration));
}

export class DirectorPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  #transitionType = "";

  static DEFAULT_OPTIONS = {
    id: "bi-director-panel",
    tag: "section",
    classes: ["bi-director-panel"],
    window: {
      title: "BLANKINHERITANCE.Director.PanelTitle",
      icon: "fa-solid fa-clapperboard",
      resizable: true
    },
    position: { width: 360, height: "auto" },
    actions: {
      cue: DirectorPanel.#onCue,
      pullEveryone: DirectorPanel.#onPullEveryone,
      setTransition: DirectorPanel.#onSetTransition,
      closeScene: DirectorPanel.#onCloseScene,
      goHome: DirectorPanel.#onGoHome
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/director-panel.hbs` }
  };

  /** @override */
  async _prepareContext() {
    return {
      scenes: sceneRows([...game.scenes]),
      transitions: TRANSITION_TYPES.map((t) => ({ ...t, current: t.id === this.#transitionType })),
      transitionType: this.#transitionType,
      isGM: game.user.isGM
    };
  }

  static async #onCue(event, target) {
    const sceneId = target.dataset.sceneId;
    const gate = await checkCueGate(sceneId);
    if (!gate.allowed && !(await confirmDraftedSceneCue(gate.status))) return;

    await cueScene(sceneId, { transitionType: this.#transitionType || undefined });
    this.render();
  }

  static async #onPullEveryone() {
    await pullEveryoneHere({ transitionType: this.#transitionType || undefined });
  }

  static #onSetTransition(event, target) {
    this.#transitionType = target.dataset.transitionType || "";
    this.render();
  }

  /**
   * design/ux-doctrine.md §10.3a: the scene-close dialogue belongs at a
   * scene boundary, which this panel already is. A distinct button rather
   * than auto-opening on every Cue click -- §10.3a's own "not complete" path
   * means closing is a real, separate decision from moving on, not a gate
   * in front of it.
   */
  static #onCloseScene() {
    openSceneCloseDialogue();
  }

  /** design/foundry-module-design.md §7's own "persistent Home button" -- the landing scene is idle home base between beats, cued the same way as any other scene. */
  static async #onGoHome() {
    await cueScene(await landingSceneId(), { transitionType: this.#transitionType || undefined });
    this.render();
  }
}

let open = null;

export function openDirectorPanel() {
  if (!game.user?.isGM) return null;
  if (open?.rendered) {
    open.bringToFront();
    return open;
  }
  open = new DirectorPanel();
  open.render({ force: true });
  return open;
}

export async function createDirectorPanelMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId(MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Director.MacroName"),
      type: "script",
      img: "icons/svg/clockwork.svg",
      command: `await game.modules.get("${MODULE_ID}").api.openDirectorPanel();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the director's panel macro.");
}

/** Repaints an open panel when scene state changes elsewhere (activated from another client, a Scene created/deleted). */
export function refreshDirectorPanel() {
  if (open?.rendered) open.render();
  return open;
}
