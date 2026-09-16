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

import { sceneRows, transitionOptions, TRANSITION_TYPES } from "../core/director-panel.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const MACRO_SOURCE_ID = "blank-inheritance-director-panel-macro";

export async function cueScene(sceneId, { transitionType, transitionDuration } = {}) {
  if (!game.user.isGM) return null;
  const scene = game.scenes.get(sceneId);
  if (!scene) return null;
  return scene.activate({ viewOptions: { transition: transitionOptions(transitionType, transitionDuration) } });
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
      closeScene: DirectorPanel.#onCloseScene
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
    await cueScene(target.dataset.sceneId, { transitionType: this.#transitionType || undefined });
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
