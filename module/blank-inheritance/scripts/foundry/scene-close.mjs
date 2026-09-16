/**
 * The scene-close dialogue — the Foundry-touching half.
 *
 * Two mocked-but-real world-setting counters (casualties, Anchor
 * violations) are the "visibly changes something" half of Law 15 — see
 * core/scene-close.mjs's header for why only these two costs move anything,
 * and why nothing here reaches into Resonance or a real casualty-track
 * system that doesn't exist yet. Closing a scene also writes a real entry
 * through foundry/session-log.mjs — the SAME log the always-on bar input
 * writes to (design/ux-doctrine.md §10.3a: "a text box for adding my own
 * notes" into "the same log as everything else").
 *
 * GM-only throughout: closing a scene is Director's-panel-adjacent
 * bookkeeping, not something a player screen ever needs.
 */

import { canCloseScene, summarizeClosure, ENDING_OPTIONS, COST_OPTIONS } from "../core/scene-close.mjs";
import { recordLogEntry } from "./session-log.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const SETTING_CASUALTIES = "sceneCloseCasualties";
const SETTING_ANCHOR_VIOLATIONS = "sceneCloseAnchorViolations";

export function registerSceneCloseSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_CASUALTIES, { scope: "world", config: false, type: Number, default: 0, onChange });
  game.settings.register(MODULE_ID, SETTING_ANCHOR_VIOLATIONS, { scope: "world", config: false, type: Number, default: 0, onChange });
}

export function currentCounters() {
  return {
    casualties: game.settings.get(MODULE_ID, SETTING_CASUALTIES) ?? 0,
    anchorViolations: game.settings.get(MODULE_ID, SETTING_ANCHOR_VIOLATIONS) ?? 0
  };
}

/** GM only. The actual mechanical act (Law 15) -- validates, logs, and bumps whichever mocked counter the cost names. */
export async function confirmSceneClosure({ complete, ending, cost, notes }) {
  if (!game.user.isGM) return null;
  const result = summarizeClosure({ complete, ending, cost, notes });
  if (!result.ok) return result;

  await recordLogEntry({ text: result.logLine, nowIso: new Date().toISOString() });

  if (result.delta.casualties) {
    await game.settings.set(MODULE_ID, SETTING_CASUALTIES, currentCounters().casualties + result.delta.casualties);
  }
  if (result.delta.anchorViolations) {
    await game.settings.set(
      MODULE_ID,
      SETTING_ANCHOR_VIOLATIONS,
      currentCounters().anchorViolations + result.delta.anchorViolations
    );
  }
  return result;
}

export class SceneCloseDialogue extends HandlebarsApplicationMixin(ApplicationV2) {
  #complete = true;
  #ending = null;
  #cost = null;

  static DEFAULT_OPTIONS = {
    id: "bi-scene-close",
    tag: "section",
    classes: ["bi-scene-close"],
    window: { title: "BLANKINHERITANCE.SceneClose.Title", icon: "fa-solid fa-clapperboard", resizable: false },
    position: { width: 380, height: "auto" },
    actions: {
      toggleComplete: SceneCloseDialogue.#onToggleComplete,
      setEnding: SceneCloseDialogue.#onSetEnding,
      setCost: SceneCloseDialogue.#onSetCost,
      confirm: SceneCloseDialogue.#onConfirm
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/scene-close.hbs` }
  };

  /** @override */
  async _prepareContext() {
    const legality = canCloseScene({ complete: this.#complete, ending: this.#ending, cost: this.#cost });
    return {
      complete: this.#complete,
      endings: ENDING_OPTIONS.map((o) => ({ ...o, current: o.id === this.#ending })),
      costs: COST_OPTIONS.map((o) => ({ ...o, current: o.id === this.#cost })),
      counters: currentCounters(),
      canConfirm: legality.ok
    };
  }

  static #onToggleComplete() {
    this.#complete = !this.#complete;
    this.render();
  }

  static #onSetEnding(event, target) {
    this.#ending = target.dataset.endingId;
    this.render();
  }

  static #onSetCost(event, target) {
    this.#cost = target.dataset.costId;
    this.render();
  }

  static async #onConfirm() {
    const notesField = this.element.querySelector("[data-scene-close-notes]");
    const result = await confirmSceneClosure({
      complete: this.#complete,
      ending: this.#ending,
      cost: this.#cost,
      notes: notesField?.value ?? ""
    });
    if (!result?.ok) return; // canConfirm already gates this in the UI; a null/failed result is a no-op, not a silent-looking success
    ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.SceneClose.Confirmed"));
    this.close();
  }
}

export function openSceneCloseDialogue() {
  if (!game.user?.isGM) return null;
  const dialogue = new SceneCloseDialogue();
  dialogue.render({ force: true });
  return dialogue;
}
