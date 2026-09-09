/**
 * The induction terminal — character creation, run as a diegetic scene.
 *
 * Session zero: a player logs into Foundry with no character yet and is
 * walked through the Directorate's own induction questionnaire. What comes
 * out the other end is a real Actor, with a "basic but viable" sheet --
 * class feats/spells are deliberately left for the real character sheet
 * afterward, not handled here. See design/induction-terminal.md for the
 * full page-by-page design; this file and its templates build only Page 1
 * (orientation) and the shell application the rest will be added to.
 *
 * PLAYER-FACING BY CONSTRUCTION, unlike the scene runner (GM-only) and the
 * command bar (seat-dependent) -- any user may open this, including a GM
 * previewing it, so there is no isGM guard anywhere in this file. The
 * eventual "opens automatically for a characterless user" trigger is NOT
 * built yet (design doc §8) -- for now this is opened deliberately, the
 * same "once-per-session action, lives on the API" idiom openSceneRunner
 * already uses.
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/induction`;

export class InductionTerminal extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-induction-terminal",
    tag: "div",
    classes: ["bi-induction-host"],
    window: { frame: false, positioned: false },
    actions: {
      begin: InductionTerminal.#onBegin
    }
  };

  // One part today. Page 2 onward (design doc §4) each add their own entry
  // here and their own template file under templates/induction/, the same
  // way scene-runner.mjs's PARTS grew one part per real need rather than
  // being pre-declared for pages that don't exist yet.
  static PARTS = {
    page1: {
      template: `${TEMPLATE_ROOT}/page1-orientation.hbs`
    }
  };

  /** Same idiom as the scene runner, the command bar, and the stage. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    return {
      userName: game.user?.name ?? ""
    };
  }

  /**
   * Page 1 collects nothing and has nowhere to advance to yet -- Page 2
   * (Ancestry) doesn't exist. Logs rather than no-ops silently, so trying
   * this before the rest of the form is built is visibly informative
   * rather than looking broken or unresponsive.
   */
  static async #onBegin(_event, _target) {
    console.log(
      "Blank Inheritance | Induction terminal: Begin clicked -- Page 2 (Ancestry) is not built yet. " +
      "See design/induction-terminal.md for the full page-by-page design."
    );
  }
}

/* ---------------------------------------------------------------- */
/*  The singleton                                                    */
/* ---------------------------------------------------------------- */

let active = null;

export function getInductionTerminal() {
  return active;
}

export function mountInductionTerminal() {
  if (!active) active = new InductionTerminal();
  active.render({ force: true });
  return active;
}

export function refreshInductionTerminal() {
  active?.render({});
  return active;
}

export function unmountInductionTerminal() {
  active?.close();
  active = null;
}

/**
 * Open the terminal. Deliberately trivial today -- mountInductionTerminal
 * IS the whole job while there is only one page and no per-user state to
 * seed first. Kept as its own exported function anyway, matching
 * openSceneRunner's shape, since every later page adds real setup here
 * (which page a returning user left on, etc.) and callers should not have
 * to change which function they call when that lands.
 */
export function openInductionTerminal() {
  return mountInductionTerminal();
}
