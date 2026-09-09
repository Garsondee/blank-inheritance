/**
 * The induction terminal — character creation, run as a diegetic scene.
 *
 * Session zero: a player logs into Foundry with no character yet and is
 * walked through the Directorate's own induction questionnaire. What comes
 * out the other end is a real Actor, with a "basic but viable" sheet --
 * class feats/spells are deliberately left for the real character sheet
 * afterward, not handled here. See design/induction-terminal.md for the
 * full page-by-page design; this file and its templates currently build
 * Page 1 (orientation) and Page 2 (ancestry).
 *
 * PLAYER-FACING BY CONSTRUCTION, unlike the scene runner (GM-only) and the
 * command bar (seat-dependent) -- any user may open this, including a GM
 * previewing it, so there is no isGM guard anywhere in this file. The
 * eventual "opens automatically for a characterless user" trigger is NOT
 * built yet (design doc §8) -- for now this is opened deliberately, the
 * same "once-per-session action, lives on the API" idiom openSceneRunner
 * already uses.
 *
 * PAGE SWAPPING: static PARTS declares one template per page, but only ONE
 * of them is ever the active render target at a time, under a constant
 * partId ("page") -- _configureRenderParts below picks which page's
 * template that id points at. A constant partId is what makes
 * HandlebarsApplicationMixin's own _replaceHTML *swap* the rendered
 * content (find the existing [data-application-part="page"] node, replace
 * it) instead of *stacking* a second element beside a first that a
 * per-page partId (page1, page2, ...) would leave behind unremoved -- see
 * that mixin's _replaceHTML/_configureRenderParts for why.
 */

import { fetchModuleJson } from "./io.mjs";
import {
  resolveSlots,
  isAncestryChoiceComplete,
  groupAncestries,
  filterAncestries
} from "../core/induction-ancestry.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/induction`;

const ABILITY_KEYS = {
  str: "PF2E.AbilityStr", dex: "PF2E.AbilityDex", con: "PF2E.AbilityCon",
  int: "PF2E.AbilityInt", wis: "PF2E.AbilityWis", cha: "PF2E.AbilityCha"
};
const SIZE_KEYS = {
  tiny: "PF2E.ActorSizeTiny", sm: "PF2E.ActorSizeSmall", med: "PF2E.ActorSizeMedium", lg: "PF2E.ActorSizeLarge"
};
const abilityLabel = (key) => game.i18n.localize(ABILITY_KEYS[key] ?? key);
const sizeLabel = (key) => game.i18n.localize(SIZE_KEYS[key] ?? key);

/* ---------------------------------------------------------------- */
/*  Campaign data (data/campaign/campaign/*.json -- the doubled       */
/*  segment is real, see foundry/campaign-state.mjs's own note)       */
/* ---------------------------------------------------------------- */

let ancestryCataloguePromise = null;

/** Fetched once per client session and cached -- 51 entries, not re-fetched on every page visit. */
function loadAncestryCatalogue() {
  ancestryCataloguePromise ??= fetchModuleJson("data/campaign/campaign/ancestry-catalogue.json").catch((err) => {
    console.error("Blank Inheritance | Could not load the ancestry catalogue:", err);
    ancestryCataloguePromise = null; // let the next page-render retry rather than sticking on a failed fetch forever
    return { ancestries: [] };
  });
  return ancestryCataloguePromise;
}

export class InductionTerminal extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-induction-terminal",
    tag: "div",
    classes: ["bi-induction-host"],
    window: { frame: false, positioned: false },
    actions: {
      begin: InductionTerminal.#onBegin,
      back: InductionTerminal.#onBack,
      pickAncestry: InductionTerminal.#onPickAncestry,
      changeAncestry: InductionTerminal.#onChangeAncestry,
      pickBoost: InductionTerminal.#onPickBoost,
      pickFlaw: InductionTerminal.#onPickFlaw,
      continueFromAncestry: InductionTerminal.#onContinueFromAncestry
    }
  };

  // One entry per page. Only ONE is ever rendered at a time -- see
  // _configureRenderParts below, which is what actually decides that.
  static PARTS = {
    page1: {
      template: `${TEMPLATE_ROOT}/page1-orientation.hbs`
    },
    page2: {
      template: `${TEMPLATE_ROOT}/page2-ancestry.hbs`,
      scrollable: [".bi-induction__page"]
    }
  };

  /** All in-progress choices. Nothing here touches Foundry until Page 9's real confirm (design doc §6). */
  state = {
    page: 1,
    ancestry: {
      id: null,
      filter: "",
      boostPicks: [], // parallel to the FREE boost slots only, see core/induction-ancestry.mjs
      flawPicks: []
    }
  };

  /** The loaded catalogue, kept so action handlers don't re-fetch on every click. */
  _ancestries = [];

  /**
   * @override
   * MUST stay synchronous -- _configureRenderOptions calls this without
   * awaiting it (`Object.freeze(this._configureRenderParts(options))`), so
   * an async override here would freeze a Promise instead of the parts
   * record and silently break every render after the first.
   */
  _configureRenderParts(options) {
    const key = `page${this.state.page}`;
    const source = this.constructor.PARTS[key] ?? this.constructor.PARTS.page1;
    return { page: { ...source, templates: source.templates ?? [] } };
  }

  /** Same idiom as the scene runner, the command bar, and the stage. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const base = { userName: game.user?.name ?? "" };
    if (this.state.page === 2) return { ...base, ...(await this.#page2Context()) };
    return base;
  }

  async #page2Context() {
    const catalogue = await loadAncestryCatalogue();
    this._ancestries = catalogue.ancestries ?? [];

    const filtered = filterAncestries(this._ancestries, this.state.ancestry.filter);
    const { terrestrial, alienCoded } = groupAncestries(filtered);
    const toRow = (a) => ({ id: a.id, name: a.name, nameLower: a.name.toLowerCase() });

    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id) ?? null;

    return {
      filterValue: this.state.ancestry.filter,
      ancestryGroups: { terrestrial: terrestrial.map(toRow), alienCoded: alienCoded.map(toRow) },
      selected: ancestry ? this.#decorateAncestry(ancestry) : null,
      isComplete: isAncestryChoiceComplete(ancestry, this.state.ancestry.boostPicks, this.state.ancestry.flawPicks)
    };
  }

  /** Everything Page 2's template needs about the chosen ancestry, precomputed. */
  #decorateAncestry(ancestry) {
    const decorateSlots = (slots, picks) => {
      const { resolved } = resolveSlots(slots, picks);
      let pickIndex = 0;
      return slots.map((slot, slotIndex) => {
        if (slot.length === 1) return { fixed: true, fixedLabel: abilityLabel(slot[0]) };
        const picked = resolved[slotIndex] ?? null;
        pickIndex += 1;
        return {
          fixed: false,
          options: slot.map((ability) => ({
            ability,
            label: abilityLabel(ability),
            picked: ability === picked,
            slotIndex
          }))
        };
      });
    };

    return {
      id: ancestry.id,
      name: ancestry.name,
      description: ancestry.description,
      hp: ancestry.hp,
      sizeLabel: sizeLabel(ancestry.size),
      speed: ancestry.speed,
      languagesLabel: ancestry.languages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(", "),
      visionLabel: ancestry.vision.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      terrestrial: ancestry.terrestrial,
      hasFlaws: ancestry.flaws.length > 0,
      boostSlots: decorateSlots(ancestry.boosts, this.state.ancestry.boostPicks),
      flawSlots: decorateSlots(ancestry.flaws, this.state.ancestry.flawPicks)
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.#bindFilter();
  }

  /**
   * The live ancestry-name filter: plain DOM show/hide, not an
   * application re-render per keystroke. A full render on every keystroke
   * would fight the user for cursor position (the Handlebars mixin restores
   * FOCUS after a re-render, not caret position) for a box whose result is
   * cheap to compute without going through _prepareContext at all -- 51
   * items is nothing to filter directly in the browser.
   */
  #bindFilter() {
    const field = this.element?.querySelector("[data-induction-filter]");
    if (!field || field.dataset.biBound) return;
    field.dataset.biBound = "1";

    field.addEventListener("input", () => {
      this.state.ancestry.filter = field.value;
      const query = field.value.trim().toLowerCase();
      const items = this.element.querySelectorAll("[data-induction-name]");
      let anyVisible = false;
      items.forEach((item) => {
        const matches = !query || item.dataset.inductionName.includes(query);
        item.hidden = !matches;
        if (matches) anyVisible = true;
      });
      const noMatches = this.element.querySelector("[data-induction-no-matches]");
      if (noMatches) noMatches.hidden = anyVisible;
    });
  }

  /* --- actions -------------------------------------------------- */

  static async #onBegin(_event, _target) {
    this.state.page = 2;
    this.render({});
  }

  static async #onBack(_event, _target) {
    this.state.page = 1;
    this.render({});
  }

  static async #onPickAncestry(_event, target) {
    this.state.ancestry.id = target.dataset.ancestryId;
    this.state.ancestry.boostPicks = [];
    this.state.ancestry.flawPicks = [];
    this.render({});
  }

  static async #onChangeAncestry(_event, _target) {
    this.state.ancestry.id = null;
    this.state.ancestry.boostPicks = [];
    this.state.ancestry.flawPicks = [];
    this.render({});
  }

  static async #onPickBoost(_event, target) {
    const slotIndex = Number(target.dataset.slotIndex);
    this.#setFreePick(this.state.ancestry.boostPicks, this.#freeSlotPosition("boosts", slotIndex), target.dataset.ability);
    this.render({});
  }

  static async #onPickFlaw(_event, target) {
    const slotIndex = Number(target.dataset.slotIndex);
    this.#setFreePick(this.state.ancestry.flawPicks, this.#freeSlotPosition("flaws", slotIndex), target.dataset.ability);
    this.render({});
  }

  /**
   * Which position in the picks array a given slot occupies -- picks are
   * parallel to the free slots only (core/induction-ancestry.mjs), so a
   * slot's own index among ALL slots isn't its index among free ones
   * whenever a fixed slot comes before it.
   */
  #freeSlotPosition(kind, slotIndex) {
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id);
    const slots = ancestry?.[kind] ?? [];
    return slots.slice(0, slotIndex).filter((slot) => slot.length > 1).length;
  }

  #setFreePick(picks, position, value) {
    const next = [...picks];
    next[position] = value;
    if (picks === this.state.ancestry.boostPicks) this.state.ancestry.boostPicks = next;
    else this.state.ancestry.flawPicks = next;
  }

  /**
   * Page 3 (Background) is not built yet -- same "log rather than no-op
   * silently" idiom as Page 1's Begin, so trying this before the rest of
   * the form exists is visibly informative rather than looking broken.
   */
  static async #onContinueFromAncestry(_event, _target) {
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id);
    if (!isAncestryChoiceComplete(ancestry, this.state.ancestry.boostPicks, this.state.ancestry.flawPicks)) return;
    console.log(
      `Blank Inheritance | Induction terminal: ancestry "${ancestry?.name}" confirmed -- ` +
      "Page 3 (Background) is not built yet. See design/induction-terminal.md for the full page-by-page design."
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
 * Open the terminal, always starting at Page 1 -- deliberately trivial
 * today, since there is no per-user state to seed first (a returning
 * user's in-progress page isn't persisted yet, design doc §6). Kept as its
 * own exported function anyway, matching openSceneRunner's shape, since a
 * later page adds real setup here and callers should not have to change
 * which function they call when that lands.
 */
export function openInductionTerminal() {
  return mountInductionTerminal();
}
