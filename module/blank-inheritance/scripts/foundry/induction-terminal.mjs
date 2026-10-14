/**
 * The induction terminal — character creation, run as a diegetic scene.
 *
 * Session zero: a player logs into Foundry with no character yet and is
 * walked through the Directorate's own induction questionnaire. What comes
 * out the other end is a real Actor, with a "basic but viable" sheet --
 * class feats/spells are deliberately left for the real character sheet
 * afterward, not handled here. See design/induction-terminal.md for the
 * full page-by-page design; this file and its templates now build all nine
 * pages: Page 1 (orientation), Page 2 (ancestry), Page 3 (background),
 * Page 4 (class), Page 5 (attribute boosts), Page 6 (portrait), Page 7
 * (finishing details), Page 8 (the eight questions) and Page 9 (review &
 * confirm), plus two keyed pages that sit between the numbered ones: the
 * Service Agreement ("agreement", second) and the out-of-character page for
 * the person playing ("player", between Page 8 and Review -- what they enjoy,
 * what they don't, what they hope to do, what sort of force they want to be;
 * design/induction-terminal.md §4). Two pages touch the real world: Page 6 uploads a cropped image
 * (#uploadCroppedPortrait, via scripts/foundry/io.mjs) and Page 9 creates
 * the real Actor (#createCharacterActor) -- every other page only ever
 * writes to this.state. The Page 5→6→7 chain is real now too; no page's
 * Continue temporarily skips another one anymore.
 *
 * #createCharacterActor's own Actor.create call goes through
 * ./induction-relay.mjs, not a bare Actor.create -- a plain Player does not
 * have Foundry's ACTOR_CREATE permission by default, so a real player's own
 * client cannot perform that one call directly. See that file's header for
 * the full live-verified permission trail and why the fix is a GM relay
 * rather than a permission-config change.
 *
 * PLAYER-FACING BY CONSTRUCTION, unlike the scene runner (GM-only) and the
 * command bar (seat-dependent) -- any user may open this, including a GM
 * previewing it, so there is no isGM guard anywhere in this file. Design
 * doc §6/§8's own "opens automatically for a user with no character yet, on
 * login" is now built too (blank-inheritance.mjs's own ready hook, non-GM
 * only) -- found live 2026-09-16, running a full session-0 walkthrough as a
 * genuine new player: with only the manual API entry point, nothing at all
 * told a real player how to reach this terminal (no macro, no journal
 * content-link visible to a fresh Player-role account -- the module's own
 * macros are all GM-owned, and the one player-visible journal page is a
 * narrative prop, not a way in). createInductionTerminalMacroIfMissing
 * below is the backup manual path, same shape as every other panel's own
 * macro, for a player who closes this before finishing.
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

import { fetchModuleJson, fetchModuleText } from "./io.mjs";
import { loadAgreement, mountAgreementView, effectiveZoom } from "./induction-agreement-view.mjs";
import { stepOrder, trackerSteps, canJumpTo, laterStep, remainingPicks } from "../core/induction-flow.mjs";
import { draftKey, hasProgress, serializeDraft, restoreDraft, resumeStep } from "../core/induction-draft.mjs";
import { readingTime, wordCount } from "../core/agreement-layout.mjs";
import { resolveSlots, claimedAbilities, isLegalPick, isFixedSlot } from "../core/boost-slots.mjs";
import {
  OUTPUT_WIDTH, OUTPUT_HEIGHT,
  coverScale, initialCropState, panBy, zoomTo, cropSourceRect,
  sliderValueToScale, scaleToSliderValue
} from "../core/induction-portrait.mjs";
import {
  isAncestryChoiceComplete,
  resolveAncestryIngredients,
  groupAncestries,
  filterAncestries
} from "../core/induction-ancestry.mjs";
import {
  isBackgroundChoiceComplete,
  resolveBackgroundIngredients,
  groupBackgroundsByRarity,
  filterBackgrounds
} from "../core/induction-background.mjs";
import { isClassChoiceComplete, resolveClassIngredients } from "../core/induction-class.mjs";
import { applyRuleChoices, decorateRuleChoices, pickedChoiceLabels, remainingChoices } from "../core/induction-rule-choices.mjs";
import { FALLBACK_SKILL_SLUGS } from "../core/skills.mjs";
import { FREE_BOOST_SLOTS, isFreeBoostsComplete, resolveFreeBoosts, toggleFreeBoost, abilityTally } from "../core/induction-attributes.mjs";
import { isReviewComplete, stripGrantItemRules } from "../core/induction-review.mjs";
import {
  insertSuggestion,
  isFinishingComplete,
  addLanguage,
  removeLanguage,
  buildLanguageSuggestions,
  summarizeIntakeAnswers
} from "../core/induction-intake.mjs";
import { buildBioUpdate } from "../core/induction-bio.mjs";
import { getPath, setPath } from "../core/state-path.mjs";
import { requestActorCreation, requestActorDeletion, requestPortraitUpload } from "./induction-relay.mjs";
import { claimKeyboardFor } from "./keyboard-focus.mjs";
import { deriveFoundryId } from "../core/ids.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/induction`;

const ABILITY_KEYS = {
  str: "PF2E.AbilityStr", dex: "PF2E.AbilityDex", con: "PF2E.AbilityCon",
  int: "PF2E.AbilityInt", wis: "PF2E.AbilityWis", cha: "PF2E.AbilityCha"
};
/** sf2e's own three-letter forms ("Str"), for Review's attribute strip. */
const ABILITY_SHORT_KEYS = {
  str: "PF2E.AbilityId.str", dex: "PF2E.AbilityId.dex", con: "PF2E.AbilityId.con",
  int: "PF2E.AbilityId.int", wis: "PF2E.AbilityId.wis", cha: "PF2E.AbilityId.cha"
};
const SIZE_KEYS = {
  tiny: "PF2E.ActorSizeTiny", sm: "PF2E.ActorSizeSmall", med: "PF2E.ActorSizeMedium", lg: "PF2E.ActorSizeLarge"
};
// Index 0-4 = untrained..legendary (sf2e's real proficiency scale). Spelled
// out literally, not built from a template string -- same lang-key-coverage
// reason as #page7Context's own comment on this.
const RANK_KEYS = [
  "PF2E.ProficiencyLevel0", "PF2E.ProficiencyLevel1", "PF2E.ProficiencyLevel2",
  "PF2E.ProficiencyLevel3", "PF2E.ProficiencyLevel4"
];
const ATTACK_CATEGORIES = [
  { key: "simple", labelKey: "BLANKINHERITANCE.Induction.Page4.AttackSimple" },
  { key: "martial", labelKey: "BLANKINHERITANCE.Induction.Page4.AttackMartial" },
  { key: "advanced", labelKey: "BLANKINHERITANCE.Induction.Page4.AttackAdvanced" },
  { key: "unarmed", labelKey: "BLANKINHERITANCE.Induction.Page4.AttackUnarmed" }
];
const DEFENSE_CATEGORIES = [
  { key: "unarmored", labelKey: "BLANKINHERITANCE.Induction.Page4.DefenseUnarmored" },
  { key: "light", labelKey: "BLANKINHERITANCE.Induction.Page4.DefenseLight" },
  { key: "medium", labelKey: "BLANKINHERITANCE.Induction.Page4.DefenseMedium" },
  { key: "heavy", labelKey: "BLANKINHERITANCE.Induction.Page4.DefenseHeavy" }
];
/** Must match .bi-portrait__viewport/.bi-portrait__chooser's CSS px size exactly -- the crop math only produces a correct source rect if the box it was computed against is the box actually on screen. */
const PORTRAIT_BOX = { width: 220, height: 330 };
/** A soft sanity cap, not a real limit -- protects against a wildly wrong file pick (an unrelated multi-hundred-MB file), not a meaningful photo size. */
const PORTRAIT_MAX_FILE_BYTES = 20 * 1024 * 1024;

/** A catalogue description's first sentence, as a one-line summary on a picker card. */
function firstSentence(text) {
  const s = String(text ?? "").trim();
  const m = s.match(/^.+?[.!?](?=\s|$)/);
  return m ? m[0] : s;
}

const abilityLabel = (key) => game.i18n.localize(ABILITY_KEYS[key] ?? key);
const sizeLabel = (key) => game.i18n.localize(SIZE_KEYS[key] ?? key);
const rankLabel = (rank) => game.i18n.localize(RANK_KEYS[rank] ?? RANK_KEYS[0]);
/** Reuses sf2e's own PF2E.Skill.<Name> keys (ux-doctrine.md §11) -- verified against gamesystems/sf2e/lang/en.json's real nested shape, see #page3Context's own history with this. */
const skillLabel = (slug) => game.i18n.localize(`PF2E.Skill.${slug.charAt(0).toUpperCase()}${slug.slice(1)}`);
/** A background's or class's own question (core/induction-rule-choices.mjs): a skill's name is localized, any other option shows the catalogue's own label. */
const choiceLabel = (key, label) => (FALLBACK_SKILL_SLUGS.includes(key) ? skillLabel(key) : label);

/**
 * Titlecase per word, not just the string's first letter -- ancestry
 * languages like "sarcesian-signed" (and the catalogue's own plain-lowercase
 * "common") need every word capitalised. Shared by #decorateAncestry
 * (Page 2's own languagesLabel/visionLabel) and #page7Context (the language
 * widget's ancestry-derived suggestion chips) -- both display the exact
 * same raw catalogue strings and must not disagree on their casing.
 */
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------------------------------------------------------------- */
/*  Campaign data (data/campaign/campaign/*.json -- the doubled       */
/*  segment is real, see foundry/campaign-state.mjs's own note)       */
/* ---------------------------------------------------------------- */

let ancestryCataloguePromise = null;

/**
 * Fetched once per client session and cached -- 51 entries, not re-fetched
 * on every page visit. `failed` is on the returned object (not just logged)
 * so the caller can show a real error state instead of an empty list that
 * silently looks like "there are simply no ancestries" -- found live
 * 2026-09-09, nothing distinguished those two cases before.
 */
function loadAncestryCatalogue() {
  ancestryCataloguePromise ??= fetchModuleJson("data/campaign/campaign/ancestry-catalogue.json").catch((err) => {
    console.error("Blank Inheritance | Could not load the ancestry catalogue:", err);
    ancestryCataloguePromise = null; // let the next page-render retry rather than sticking on a failed fetch forever
    return { ancestries: [], failed: true };
  });
  return ancestryCataloguePromise;
}

let backgroundCataloguePromise = null;

/** Same cache/failed-flag pattern as loadAncestryCatalogue, for Page 3's real background list. */
function loadBackgroundCatalogue() {
  backgroundCataloguePromise ??= fetchModuleJson("data/campaign/campaign/background-catalogue.json").catch((err) => {
    console.error("Blank Inheritance | Could not load the background catalogue:", err);
    backgroundCataloguePromise = null;
    return { backgrounds: [], failed: true };
  });
  return backgroundCataloguePromise;
}

let classCataloguePromise = null;

/** Same cache/failed-flag pattern as loadAncestryCatalogue, for Page 4's real class list. */
function loadClassCatalogue() {
  classCataloguePromise ??= fetchModuleJson("data/campaign/campaign/class-catalogue.json").catch((err) => {
    console.error("Blank Inheritance | Could not load the class catalogue:", err);
    classCataloguePromise = null;
    return { classes: [], failed: true };
  });
  return classCataloguePromise;
}

let intakePromptsPromise = null;

/** Same cache/failed-flag pattern as loadAncestryCatalogue, for Pages 7-8's suggestion-chip content. */
function loadIntakePrompts() {
  intakePromptsPromise ??= fetchModuleJson("data/campaign/campaign/induction-intake-prompts.json").catch((err) => {
    console.error("Blank Inheritance | Could not load the induction intake prompts:", err);
    intakePromptsPromise = null;
    return {
      genderIdentityOptions: [], pronounOptions: [], appearanceOptions: [],
      personalFile: [], personality: [], openQuestions: [], playerQuestions: [], freeform: null, failed: true
    };
  });
  return intakePromptsPromise;
}

/**
 * Player Core pg. 97 (reference/srd/player-core/134-languages.json) --
 * the Common Ancestry Languages + Common Regional Languages tables,
 * hand-transcribed same as ancestry-catalogue.json is for ancestries (the
 * SRD mirror is never synced to Foundry, so it can't be fetched live).
 * Deliberately excludes the Uncommon Extraplanar table (Aklo, Chthonian,
 * etc.) as too exotic for a default suggestion chip -- still reachable via
 * the widget's own free-text "Add" field.
 */
const CURATED_LANGUAGES = [
  "Common", "Kasatha", "Pahtra",
  "Akitonian", "Brethedan", "Castrovelian", "Diasporan", "Draconic", "Eoxian", "Trinary", "Vercite", "Vesk"
];

export class InductionTerminal extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-induction-terminal",
    tag: "div",
    classes: ["bi-induction-host"],
    window: { frame: false, positioned: false },
    actions: {
      begin: InductionTerminal.#onBegin,
      back: InductionTerminal.#onBack,
      signAgreement: InductionTerminal.#onSignAgreement,
      backFromAgreement: InductionTerminal.#onBackFromAgreement,
      jumpToStep: InductionTerminal.#onJumpToStep,
      returnToReview: InductionTerminal.#onReturnToReview,
      resumeDraft: InductionTerminal.#onResumeDraft,
      startAgain: InductionTerminal.#onStartAgain,
      keepDraft: InductionTerminal.#onKeepDraft,
      discardDraft: InductionTerminal.#onDiscardDraft,
      pickAncestry: InductionTerminal.#onPickAncestry,
      pickBoost: InductionTerminal.#onPickBoost,
      pickFlaw: InductionTerminal.#onPickFlaw,
      continueFromAncestry: InductionTerminal.#onContinueFromAncestry,
      pickBackground: InductionTerminal.#onPickBackground,
      pickBackgroundBoost: InductionTerminal.#onPickBackgroundBoost,
      pickBackgroundChoice: InductionTerminal.#onPickBackgroundChoice,
      continueFromBackground: InductionTerminal.#onContinueFromBackground,
      backFromBackground: InductionTerminal.#onBackFromBackground,
      pickClass: InductionTerminal.#onPickClass,
      pickClassKeyAbility: InductionTerminal.#onPickClassKeyAbility,
      pickClassChoice: InductionTerminal.#onPickClassChoice,
      continueFromClass: InductionTerminal.#onContinueFromClass,
      backFromClass: InductionTerminal.#onBackFromClass,
      toggleFreeBoost: InductionTerminal.#onToggleFreeBoost,
      continueFromAttributes: InductionTerminal.#onContinueFromAttributes,
      backFromAttributes: InductionTerminal.#onBackFromAttributes,
      removePortrait: InductionTerminal.#onRemovePortrait,
      confirmPortraitCrop: InductionTerminal.#onConfirmPortraitCrop,
      continueFromPortrait: InductionTerminal.#onContinueFromPortrait,
      backFromPortrait: InductionTerminal.#onBackFromPortrait,
      confirmCharacter: InductionTerminal.#onConfirmCharacter,
      finishInduction: InductionTerminal.#onFinishInduction,
      backFromReview: InductionTerminal.#onBackFromReview,
      continueFromFinishing: InductionTerminal.#onContinueFromFinishing,
      backFromFinishing: InductionTerminal.#onBackFromFinishing,
      addLanguage: InductionTerminal.#onAddLanguage,
      removeLanguage: InductionTerminal.#onRemoveLanguage,
      addLanguageCustom: InductionTerminal.#onAddLanguageCustom,
      continueFromQuestions: InductionTerminal.#onContinueFromQuestions,
      backFromQuestions: InductionTerminal.#onBackFromQuestions,
      continueFromPlayer: InductionTerminal.#onContinueFromPlayer,
      backFromPlayer: InductionTerminal.#onBackFromPlayer
    }
  };

  // One entry per page. Only ONE is ever rendered at a time -- see
  // _configureRenderParts below, which is what actually decides that.
  static PARTS = {
    page1: {
      template: `${TEMPLATE_ROOT}/page1-orientation.hbs`,
      scrollable: [".bi-induction__body"]
    },
    // The Service Agreement (design/induction-agreement.md): shown second, but keyed by name rather than
    // a number so none of the nine numbered pages, or their handlers, had to be renumbered around it.
    pageagreement: {
      template: `${TEMPLATE_ROOT}/page1b-agreement.hbs`
    },
    page2: {
      template: `${TEMPLATE_ROOT}/page2-ancestry.hbs`,
      scrollable: [".bi-induction__body", "[data-picker-list]", "[data-picker-detail]"]
    },
    page3: {
      template: `${TEMPLATE_ROOT}/page3-background.hbs`,
      scrollable: [".bi-induction__body", "[data-picker-list]", "[data-picker-detail]"]
    },
    page4: {
      template: `${TEMPLATE_ROOT}/page4-class.hbs`,
      scrollable: [".bi-induction__body", "[data-picker-list]", "[data-picker-detail]"]
    },
    page5: {
      template: `${TEMPLATE_ROOT}/page5-attributes.hbs`,
      scrollable: [".bi-induction__body"]
    },
    page6: {
      template: `${TEMPLATE_ROOT}/page6-portrait.hbs`,
      scrollable: [".bi-induction__body"]
    },
    page7: {
      template: `${TEMPLATE_ROOT}/page7-finishing.hbs`,
      scrollable: [".bi-induction__body"]
    },
    page8: {
      template: `${TEMPLATE_ROOT}/page8-questions.hbs`,
      scrollable: [".bi-induction__body"]
    },
    // The out-of-character page for the person playing: keyed by name like the agreement, sits just before Review.
    pageplayer: {
      template: `${TEMPLATE_ROOT}/page8b-player.hbs`,
      scrollable: [".bi-induction__body"]
    },
    page9: {
      template: `${TEMPLATE_ROOT}/page9-review.hbs`,
      scrollable: [".bi-induction__body"]
    }
  };

  /** All in-progress choices. Nothing here touches Foundry until Page 9's real confirm (design doc §6). */
  state = freshInductionState();

  /**
   * A saved form found on open, waiting on Page 1 for the player to continue it or throw it away
   * ({ state, savedAt }, core/induction-draft.mjs's restoreDraft). Never resumed silently: while this is
   * set nothing is saved over it, so the empty form behind it can't overwrite the one being offered.
   */
  _savedDraft = null;

  /** Page 1's second step for Start Again: the saved form is only thrown away after a confirming click. */
  _confirmingDiscard = false;

  /** The pending save, so a burst of typing writes once, a moment after it stops. */
  _draftTimer = null;

  /** The loaded catalogues, kept so action handlers don't re-fetch on every click. */
  _ancestries = [];
  _backgrounds = [];
  _classes = [];

  /**
   * Page 6's in-progress crop session: a chosen-but-not-yet-uploaded file,
   * its object URL, natural size, and live pan/zoom state ({scale,
   * offsetX, offsetY} -- see core/induction-portrait.mjs). Deliberately NOT
   * part of `state`, same reasoning as _ancestries above: this is working/
   * interaction data mutated directly by drag and zoom-slider listeners on
   * every pointermove, never a discrete "choice" the rest of the terminal
   * (or Page 9's review) needs to reason about -- only the committed
   * result (state.portrait.path) is. Cleared, and its objectUrl revoked,
   * on a successful upload, a fresh file pick, or a remount.
   */
  _portraitCropSession = null;

  /** The mounted FORM 1-B canvas viewer ({ stats, destroy, root }), only while page 2 is showing. */
  _agreementView = null;

  /** @override */
  _onClose(options) {
    // Closing mid-sentence still keeps the sentence: the pending save runs now rather than never.
    if (this._draftTimer) this.#saveDraftNow();
    this.#releaseAgreementView();
    super._onClose?.(options);
  }

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
    // The catalogues are cached promises: loading all three up front costs nothing after the first
    // page, and lets the tracker and the "what's missing" line judge every page, not just this one.
    await Promise.all([loadAncestryCatalogue(), loadBackgroundCatalogue(), loadClassCatalogue()]).then(([a, b, c]) => {
      this._ancestries = a.ancestries ?? this._ancestries;
      this._backgrounds = b.backgrounds ?? this._backgrounds;
      this._classes = c.classes ?? this._classes;
    });
    const order = this.#stepOrder();
    this.state.furthest = laterStep(this.state.furthest ?? 1, this.state.page, order);

    const page = this.state.page;
    const pageContext =
      page === 1 ? this.#page1Context()
      : page === "agreement" ? await this.#pageAgreementContext()
      : page === 2 ? await this.#page2Context()
      : page === 3 ? await this.#page3Context()
      : page === 4 ? await this.#page4Context()
      : page === 5 ? this.#page5Context()
      : page === 6 ? this.#page6Context()
      : page === 7 ? await this.#page7Context()
      : page === 8 ? await this.#page8Context()
      : page === "player" ? await this.#pagePlayerContext()
      : page === 9 ? await this.#page9Context()
      : {};

    const steps = this.#trackerSteps();
    const current = steps.find((s) => s.isCurrent);
    return {
      userName: game.user?.name ?? "",
      trackerSteps: steps,
      trackerLabel: current
        ? game.i18n.format("BLANKINHERITANCE.Induction.Tracker.StepOf", { n: current.number, total: steps.length, label: current.label })
        : "",
      blocker: this.#blocker(),
      canReturnToReview: this.#canReturnToReview(),
      ...pageContext
    };
  }

  /** Display order, by page id. The agreement slots in second, only when the world setting shows it. */
  #stepOrder() {
    return stepOrder({ agreement: agreementPageEnabled() });
  }

  /** Whether a page's own requirements are met, judged from state alone (core/induction-flow.mjs asks). */
  #isStepComplete(id) {
    const s = this.state;
    switch (id) {
      case 1: return true;
      case "agreement": return s.agreement.signed || !agreementPageEnabled();
      case 2: return isAncestryChoiceComplete(this._ancestries.find((a) => a.id === s.ancestry.id) ?? null, s.ancestry.boostPicks, s.ancestry.flawPicks);
      case 3: return isBackgroundChoiceComplete(this._backgrounds.find((b) => b.id === s.background.id) ?? null, s.background.boostPicks, s.background.choices);
      case 4: return isClassChoiceComplete(this._classes.find((c) => c.id === s.class.id) ?? null, s.class.keyAbilityPicks, s.class.choices);
      case 5: return isFreeBoostsComplete(s.attributes.freeBoostPicks);
      case 6: return !s.portrait.uploading;
      case 7: return isFinishingComplete(s.finishing);
      case 8: return true;
      case "player": return true; // nothing on the player's page is required
      case 9: return isReviewComplete(s);
      default: return false;
    }
  }

  /**
   * The routing-slip progress tracker every page's header shows. Steps the player has already finished
   * (and, once they've been further, any finished step up to there) are buttons: a player can jump back
   * to fix something and come straight back, instead of paging through everything in between.
   */
  #trackerSteps() {
    return trackerSteps({
      order: this.#stepOrder(),
      current: this.state.page,
      furthest: this.state.furthest ?? this.state.page,
      isComplete: (id) => this.#isStepComplete(id)
    });
  }

  /** Once a player has reached Review, every earlier page offers a way straight back to it. */
  #canReturnToReview() {
    return this.state.page !== 9 && canJumpTo(9, {
      order: this.#stepOrder(), current: this.state.page, furthest: this.state.furthest ?? this.state.page,
      isComplete: (id) => this.#isStepComplete(id)
    });
  }

  /**
   * Continue with something still missing, as Ingram asked for in GitHub #162 (item 4): "let the click
   * evaluate the form, then move the camera/scroll back up to the first missing field and point it out
   * there -- not just block silently or show a generic error." So Continue is never greyed out on a page
   * a player can finish; clicking it early scrolls to the first missing thing, marks it, puts the reason
   * right above it and moves focus into it. The next render (any pick) clears the mark.
   */
  #pointAtMissing() {
    const root = this.element;
    const target = this.#firstMissingElement();
    if (!root || !target) return;
    root.querySelectorAll(".bi-induction__missing").forEach((el) => el.classList.remove("bi-induction__missing"));
    root.querySelectorAll("[data-missing-note]").forEach((el) => el.remove());
    target.classList.add("bi-induction__missing");
    const message = this.#blocker();
    if (message) {
      const note = document.createElement("p");
      note.className = "bi-induction__missing-note";
      note.dataset.missingNote = "";
      note.setAttribute("role", "alert");
      note.textContent = message;
      target.prepend(note);
    }
    // Smooth scrolling runs on animation frames, which a hidden page never gets -- it would stall there.
    const still = document.visibilityState === "hidden" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const behavior = still ? "auto" : "smooth";
    // A list column scrolls on its own: its top (the filter, the first options) is what's missing.
    const scrolls = /(auto|scroll)/.test(getComputedStyle(target).overflowY) && target.scrollHeight > target.clientHeight;
    if (scrolls) target.scrollTo({ top: 0, behavior });
    target.scrollIntoView({ block: scrolls ? "nearest" : "center", behavior });
    const focusable = target.matches("input, textarea") ? target : target.querySelector(
      "[data-induction-filter], input:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([aria-pressed=\"true\"])"
    );
    focusable?.focus({ preventScroll: true });
  }

  /**
   * The first thing on this page that stops Continue: the list, if nothing is chosen yet; otherwise the
   * first choice slot with no pick (fixed slots never count); the attribute rows; the Name field.
   */
  #firstMissingElement() {
    const root = this.element;
    if (!root) return null;
    const s = this.state;
    const openSlot = () => [...root.querySelectorAll("[data-picker-detail] .bi-induction__slot")]
      .find((slot) => slot.querySelector(".bi-induction__options") && !slot.querySelector(".bi-induction__option--picked"));
    const list = () => root.querySelector("[data-picker-list]");
    switch (s.page) {
      case 2: return s.ancestry.id ? openSlot() ?? null : list();
      case 3: return s.background.id ? openSlot() ?? null : list();
      case 4: return s.class.id ? openSlot() ?? null : list();
      case 5: return root.querySelector(".bi-induction__tally");
      case 7: {
        const name = root.querySelector('[data-prompt-field="finishing.name"]');
        return name?.closest(".bi-prompt-field") ?? name;
      }
      default: return null;
    }
  }

  /** The one-line reason Continue can't go on yet, shown beside it. Null when nothing is missing. */
  #blocker() {
    const s = this.state;
    const say = (key, data) => game.i18n.format(BLOCKER_KEYS[key], data ?? {});
    switch (s.page) {
      case 2: {
        const ancestry = this._ancestries.find((a) => a.id === s.ancestry.id);
        if (!ancestry) return say("PickAncestry");
        const left = remainingPicks(ancestry.boosts, s.ancestry.boostPicks) + remainingPicks(ancestry.flaws, s.ancestry.flawPicks);
        return left ? say(left === 1 ? "OneMorePick" : "MorePicks", { count: left }) : null;
      }
      case 3: {
        const background = this._backgrounds.find((b) => b.id === s.background.id);
        if (!background) return say("PickBackground");
        const left = remainingPicks(background.boosts, s.background.boostPicks) + remainingChoices(background.choices, s.background.choices);
        return left ? say(left === 1 ? "OneMorePick" : "MorePicks", { count: left }) : null;
      }
      case 4: {
        const cls = this._classes.find((c) => c.id === s.class.id);
        if (!cls) return say("PickClass");
        if (remainingPicks([cls.keyAbility], s.class.keyAbilityPicks)) return say("PickKeyAbility");
        const choicesLeft = remainingChoices(cls.choices, s.class.choices);
        return choicesLeft ? say(choicesLeft === 1 ? "OneMorePick" : "MorePicks", { count: choicesLeft }) : null;
      }
      case 5: {
        const left = remainingPicks(FREE_BOOST_SLOTS, s.attributes.freeBoostPicks);
        return left ? say(left === 1 ? "OneMoreAttribute" : "MoreAttributes", { count: left }) : null;
      }
      case 6: return s.portrait.uploading ? say("Uploading") : null;
      case 7: return isFinishingComplete(s.finishing) ? null : say("NeedName");
      case 9: return isReviewComplete(s) || s.review.createdActorId ? null : say("ReviewIncomplete");
      default: return null;
    }
  }

  /**
   * Page 1's only moving part: a saved form, if one was found on open, summed up so the player can tell
   * which form it is before choosing -- who (the name, or "unnamed"), what (ancestry, class, background),
   * where they stopped, and when.
   */
  #page1Context() {
    const draft = this._savedDraft;
    if (!draft) return { savedDraft: null };
    const s = draft.state;
    const ancestry = this._ancestries.find((a) => a.id === s.ancestry.id)?.name;
    const cls = this._classes.find((c) => c.id === s.class.id)?.name;
    const background = this._backgrounds.find((b) => b.id === s.background.id)?.name;
    const order = this.#stepOrder();
    const at = order.findIndex(([id]) => id === s.page);
    let when = null;
    try {
      // The browser's own locale (undefined), not Foundry's language code: "en" alone reads as US dates.
      if (draft.savedAt) when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(draft.savedAt));
    } catch { when = null; }
    return {
      savedDraft: {
        name: s.finishing.name.trim() || game.i18n.localize("BLANKINHERITANCE.Induction.Resume.Unnamed"),
        what: [[ancestry, cls].filter(Boolean).join(" "), background].filter(Boolean).join(" · "),
        where: at >= 0
          ? game.i18n.format("BLANKINHERITANCE.Induction.Resume.Where", { n: at + 1, total: order.length, label: order[at][1] })
          : null,
        when: when ? game.i18n.format("BLANKINHERITANCE.Induction.Resume.When", { time: when }) : null
      },
      confirmingDiscard: this._confirmingDiscard
    };
  }

  /** Saves the form a moment after the last change, so a burst of typing writes once. */
  #saveDraftSoon() {
    clearTimeout(this._draftTimer);
    this._draftTimer = setTimeout(() => this.#saveDraftNow(), 400);
  }

  /**
   * Writes the form to the player's own browser. Never while a saved form is still being offered on Page 1
   * (the empty form behind it would overwrite it), never an empty form, and a finished one is cleared.
   */
  #saveDraftNow() {
    clearTimeout(this._draftTimer);
    this._draftTimer = null;
    if (this._savedDraft) return;
    if (this.state.review.createdActorId) {
      writeStoredDraft(null);
      return;
    }
    if (hasProgress(this.state)) writeStoredDraft(serializeDraft(this.state));
  }

  /** FORM 1-B's page context: only the reading-time line and whether the text loaded. The text itself never enters the template. */
  async #pageAgreementContext() {
    try {
      const doc = await loadAgreement(fetchModuleText);
      return { agreementReady: true, agreementReadingTime: readingTime(doc.words ?? wordCount(doc.blocks)) };
    } catch (err) {
      console.error("Blank Inheritance | The Service Agreement could not be loaded.", err);
      return { agreementReady: false, agreementError: game.i18n.localize("BLANKINHERITANCE.Induction.Agreement.LoadError") };
    }
  }

  /** Mounts the canvas viewer on the agreement page; tears it down on every other page. */
  async #bindAgreementView() {
    const root = this.element?.querySelector("[data-agreement-root]");
    if (!root) { this.#releaseAgreementView(); return; }
    if (this._agreementView?.root === root) return;
    this.#releaseAgreementView();
    try {
      const doc = await loadAgreement(fetchModuleText);
      if (!root.isConnected) return;
      this._agreementView = Object.assign(mountAgreementView(root, doc), { root });
      root.querySelector("[data-agreement-viewport]")?.focus({ preventScroll: true });
    } catch (err) {
      console.error("Blank Inheritance | The Service Agreement viewer failed to mount.", err);
    }
  }

  #releaseAgreementView() {
    this._agreementView?.destroy();
    this._agreementView = null;
  }

  async #page2Context() {
    const catalogue = await loadAncestryCatalogue();
    this._ancestries = catalogue.ancestries ?? [];

    const filtered = filterAncestries(this._ancestries, this.state.ancestry.filter);
    const { terrestrial, alienCoded } = groupAncestries(filtered);
    const toRow = (a) => ({
      id: a.id, name: a.name, nameLower: a.name.toLowerCase(),
      isSelected: a.id === this.state.ancestry.id,
      hint: `${a.hp} HP · ${sizeLabel(a.size)} · ${a.speed} ft.`
    });

    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id) ?? null;

    return {
      loadFailed: catalogue.failed === true,
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
      return slots.map((slot, slotIndex) => {
        if (slot.length === 1) return { fixed: true, fixedLabel: abilityLabel(slot[0]) };
        const picked = resolved[slotIndex] ?? null;
        // Player Core: boosts (and separately flaws) granted at the same
        // time must each land on a different ability -- a fixed sibling
        // slot's ability, or another free slot's already-made pick, is off
        // the table here too. Found live 2026-09-09: nothing enforced this
        // before, so e.g. Human's two free boosts could both go to "str".
        const claimed = claimedAbilities(slots, picks, slotIndex);
        return {
          fixed: false,
          options: slot.map((ability) => ({
            ability,
            label: abilityLabel(ability),
            picked: ability === picked,
            claimed: claimed.has(ability) && ability !== picked,
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
      languagesLabel: (ancestry.languages ?? []).map((l) => titleCase(l.replace(/-/g, " "))).join(", "),
      visionLabel: titleCase((ancestry.vision ?? "normal").replace(/-/g, " ")),
      terrestrial: ancestry.terrestrial,
      hasFlaws: ancestry.flaws.length > 0,
      boostSlots: decorateSlots(ancestry.boosts, this.state.ancestry.boostPicks),
      flawSlots: decorateSlots(ancestry.flaws, this.state.ancestry.flawPicks)
    };
  }

  async #page3Context() {
    const catalogue = await loadBackgroundCatalogue();
    this._backgrounds = catalogue.backgrounds ?? [];

    const filtered = filterBackgrounds(this._backgrounds, this.state.background.filter);
    const { common, uncommon, rare } = groupBackgroundsByRarity(filtered);
    const toRow = (b) => ({
      id: b.id, name: b.name, nameLower: b.name.toLowerCase(),
      isSelected: b.id === this.state.background.id,
      hint: [...(b.trainedSkills ?? []).map(skillLabel), ...(b.loreSkills ?? [])].join(" · ")
    });

    const background = this._backgrounds.find((b) => b.id === this.state.background.id) ?? null;

    return {
      loadFailed: catalogue.failed === true,
      filterValue: this.state.background.filter,
      backgroundGroups: { common: common.map(toRow), uncommon: uncommon.map(toRow), rare: rare.map(toRow) },
      selected: background ? this.#decorateBackground(background) : null,
      isComplete: isBackgroundChoiceComplete(background, this.state.background.boostPicks, this.state.background.choices)
    };
  }

  /** Everything Page 3's template needs about the chosen background, precomputed. */
  #decorateBackground(background) {
    const { resolved } = resolveSlots(background.boosts, this.state.background.boostPicks);
    const claimed = (slotIndex) => claimedAbilities(background.boosts, this.state.background.boostPicks, slotIndex);
    const boostSlots = background.boosts.map((slot, slotIndex) => {
      if (slot.length === 1) return { fixed: true, fixedLabel: abilityLabel(slot[0]) };
      const picked = resolved[slotIndex] ?? null;
      return {
        fixed: false,
        options: slot.map((ability) => ({
          ability,
          label: abilityLabel(ability),
          picked: ability === picked,
          claimed: claimed(slotIndex).has(ability) && ability !== picked,
          slotIndex
        }))
      };
    });

    // Some real backgrounds list TWO entries in trainedSkills or loreSkills
    // meaning "choose one of these", not "grants both" -- e.g. Spike
    // Larcenist's real text is "trained in Thievery and EITHER Absalom
    // Station Lore OR Underworld Lore". A flat ", "-joined row reads as
    // "grants both" regardless of which is true, actively misleading a
    // player for the "choose one" case. Found live 2026-09-10 by picking
    // Spike Larcenist and comparing the summary row against its own
    // description directly above it. joinNames flags 2+ entries as a
    // choice (" or ") rather than silently presenting it as a grant.
    const joinNames = (names) => (names.length > 1 ? names.join(" or ") : names.join(", "));

    return {
      id: background.id,
      name: background.name,
      rarity: background.rarity,
      isUncommon: background.rarity === "uncommon",
      isRare: background.rarity === "rare",
      description: background.description,
      trainedSkillsLabel: joinNames((background.trainedSkills ?? []).map(skillLabel)),
      trainedSkillsAreChoice: (background.trainedSkills ?? []).length > 1,
      hasTrainedSkills: (background.trainedSkills ?? []).length > 0,
      loreSkillsLabel: joinNames(background.loreSkills ?? []),
      loreSkillsAreChoice: (background.loreSkills ?? []).length > 1,
      hasLoreSkills: (background.loreSkills ?? []).length > 0,
      hasNamedSkills: (background.trainedSkills ?? []).length > 0 || (background.loreSkills ?? []).length > 0,
      feat: background.feat,
      hasChoices: (background.choices ?? []).length > 0,
      choiceGroups: decorateRuleChoices(background.choices, this.state.background.choices, { labelOf: choiceLabel }),
      boostSlots
    };
  }

  async #page4Context() {
    const catalogue = await loadClassCatalogue();
    this._classes = catalogue.classes ?? [];
    const cls = this._classes.find((c) => c.id === this.state.class.id) ?? null;

    return {
      loadFailed: catalogue.failed === true,
      classes: this._classes.map((c) => ({
        id: c.id, name: c.name,
        isSelected: c.id === this.state.class.id,
        tagline: firstSentence(c.description),
        meta: game.i18n.format("BLANKINHERITANCE.Induction.Page4.CardMeta", { key: c.keyAbility.map(abilityLabel).join(" or "), hp: c.hp })
      })),
      selected: cls ? this.#decorateClass(cls) : null,
      isComplete: isClassChoiceComplete(cls, this.state.class.keyAbilityPicks, this.state.class.choices)
    };
  }

  /** Everything Page 4's template needs about the chosen class, precomputed. */
  #decorateClass(cls) {
    const { resolved } = resolveSlots([cls.keyAbility], this.state.class.keyAbilityPicks);
    const picked = resolved[0] ?? null;
    const keyAbilitySlot = cls.keyAbility.length === 1
      ? { fixed: true, fixedLabel: abilityLabel(cls.keyAbility[0]) }
      : {
          fixed: false,
          options: cls.keyAbility.map((ability) => ({
            ability, label: abilityLabel(ability), picked: ability === picked, slotIndex: 0
          }))
        };

    const additionalSkillsNote = cls.trainedSkills.additional > 0
      ? game.i18n.format("BLANKINHERITANCE.Induction.Page4.PlusMoreSkills", { count: cls.trainedSkills.additional })
      : null;

    // A category shows plainly at "trained" (the expected floor); a HIGHER
    // rank is a genuine specialization worth calling out (e.g. Operative's
    // guns at Expert). Untrained (rank 0) categories are simply omitted --
    // Envoy has zero weapon proficiency above unarmed/simple, and showing
    // "Advanced Weapons: Untrained" for every class would be noise, not signal.
    const proficiencySummary = (ranks, categories) => categories
      .filter(({ key }) => ranks[key] > 0)
      .map(({ key, labelKey }) => {
        const label = game.i18n.localize(labelKey);
        return ranks[key] > 1 ? `${label} (${rankLabel(ranks[key])})` : label;
      })
      .concat(cls.attacks?.otherName && categories === ATTACK_CATEGORIES
        ? [`${cls.attacks.otherName} (${rankLabel(cls.attacks.otherRank)})`]
        : [])
      .join(", ");

    return {
      id: cls.id,
      name: cls.name,
      description: cls.description,
      hp: cls.hp,
      perceptionLabel: rankLabel(cls.perception),
      fortitudeLabel: rankLabel(cls.savingThrows.fortitude),
      reflexLabel: rankLabel(cls.savingThrows.reflex),
      willLabel: rankLabel(cls.savingThrows.will),
      trainedSkillsLabel: cls.trainedSkills.fixed.map((slug) => skillLabel(slug)).join(", "),
      hasTrainedSkills: cls.trainedSkills.fixed.length > 0,
      additionalSkillsNote,
      attacksLabel: proficiencySummary(cls.attacks, ATTACK_CATEGORIES),
      defensesLabel: proficiencySummary(cls.defenses, DEFENSE_CATEGORIES),
      keyAbilitySlot,
      hasChoices: (cls.choices ?? []).length > 0,
      choiceGroups: decorateRuleChoices(cls.choices, this.state.class.choices, { labelOf: choiceLabel })
    };
  }

  /**
   * No catalogue to fetch (unlike Pages 2-4) -- the four slots are a fixed
   * constant (core/induction-attributes.mjs's FREE_BOOST_SLOTS), so this
   * needs no await at all, unlike every other #pageNContext.
   */
  #page5Context() {
    const picks = (this.state.attributes.freeBoostPicks ?? []).filter(Boolean);
    const full = picks.length >= FREE_BOOST_SLOTS.length;
    const attributeRows = this.#abilityRows().map((row) => ({
      ...row,
      picked: picks.includes(row.ability),
      disabled: full && !picks.includes(row.ability)
    }));
    return {
      attributeRows,
      freePickedCount: picks.length,
      isComplete: isFreeBoostsComplete(this.state.attributes.freeBoostPicks)
    };
  }

  /**
   * Every attribute's running modifier and its sources, from whatever has been chosen so far on Pages
   * 2-5 (core/induction-attributes.mjs's abilityTally). Shown on Page 5 and again on Review, so a player
   * sees where their numbers land before committing. Display only: the real sheet's numbers are still
   * computed by sf2e from the embedded Items on confirm (design doc §6).
   */
  #abilityRows() {
    const s = this.state;
    const safe = (slots, picks) => { try { return resolveSlots(slots ?? [], picks ?? []).resolved; } catch { return []; } };
    const ancestry = this._ancestries.find((a) => a.id === s.ancestry.id);
    const background = this._backgrounds.find((b) => b.id === s.background.id);
    const cls = this._classes.find((c) => c.id === s.class.id);
    const rows = abilityTally({
      ancestryBoosts: ancestry ? safe(ancestry.boosts, s.ancestry.boostPicks) : [],
      ancestryFlaws: ancestry ? safe(ancestry.flaws, s.ancestry.flawPicks) : [],
      backgroundBoosts: background ? safe(background.boosts, s.background.boostPicks) : [],
      classKey: cls ? safe([cls.keyAbility], s.class.keyAbilityPicks)[0] ?? null : null,
      freeBoosts: (s.attributes.freeBoostPicks ?? []).filter(Boolean)
    });
    const FROM = {
      ancestry: "BLANKINHERITANCE.Induction.Page5.From.Ancestry",
      flaw: "BLANKINHERITANCE.Induction.Page5.From.Flaw",
      background: "BLANKINHERITANCE.Induction.Page5.From.Background",
      class: "BLANKINHERITANCE.Induction.Page5.From.Class",
      free: "BLANKINHERITANCE.Induction.Page5.From.Free"
    };
    return rows.map(({ ability, mod, parts }) => ({
      ability,
      label: abilityLabel(ability),
      short: game.i18n.localize(ABILITY_SHORT_KEYS[ability]),
      modLabel: mod > 0 ? `+${mod}` : mod < 0 ? `\u2212${Math.abs(mod)}` : "0",
      partsLabel: parts.map((part) => game.i18n.localize(FROM[part.from])).join(" · "),
      isRaised: mod > 0,
      isLowered: mod < 0
    }));
  }

  /**
   * No catalogue fetch either, same reason as #page5Context -- everything
   * here is either the committed upload result (state.portrait) or the
   * live crop session (_portraitCropSession). Never gates Continue: a
   * portrait is optional, same treatment as every Page 7/8 field except
   * Page 7's name (design doc's own "optional, no wrong answer" pattern,
   * extended here since nothing in the design doc ever said this one was
   * required, and Foundry's own default silhouette makes "skip it" a real,
   * unpenalized path rather than a broken one).
   */
  #page6Context() {
    const session = this._portraitCropSession;
    const shared = {
      portraitPath: this.state.portrait.path,
      portraitUploading: this.state.portrait.uploading,
      portraitError: this.state.portrait.error
    };
    if (!session) return { isCropping: false, ...shared };

    const cover = coverScale(session.naturalWidth, session.naturalHeight, PORTRAIT_BOX.width, PORTRAIT_BOX.height);
    return {
      isCropping: true,
      cropImageUrl: session.objectUrl,
      // The transform this renders is only the STARTING point for a fresh
      // crop session -- every live drag/zoom after that writes straight to
      // the DOM (#paintPortraitCropTransform), never through a render. This
      // still has to stay correct for the re-renders THAT DO happen mid-crop
      // (the uploading/error states below), which read the same live
      // session.crop this paints from, so the two never disagree.
      cropOffsetXNeg: -session.crop.offsetX,
      cropOffsetYNeg: -session.crop.offsetY,
      cropScale: session.crop.scale,
      cropZoomSliderValue: scaleToSliderValue(session.crop.scale, cover),
      ...shared
    };
  }

  async #page7Context() {
    const prompts = await loadIntakePrompts();
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id) ?? null;

    // Each key spelled out literally, not built from a template string --
    // the repo-wide lang-key coverage test statically scans source text for
    // dotted BLANKINHERITANCE key references, so a `${key}`-interpolated
    // helper here would only ever contribute its own unresolvable static
    // prefix (found live authoring this very page -- see git history).
    const nameField = this.#decoratePromptField({
      id: "name", statePath: "finishing.name",
      label: game.i18n.localize("BLANKINHERITANCE.Induction.Page7.NameLabel")
    });

    // Three named groups rather than one flat list (2026-09-18): the template
    // renders them under sf2e's own biography headings, so a player can see
    // that these short fields ARE their character sheet rather than a
    // parallel questionnaire that happens to look like one.
    const identityFields = [
      this.#decoratePromptField({
        id: "pronouns", statePath: "finishing.pronouns",
        label: game.i18n.localize("BLANKINHERITANCE.Induction.Page7.PronounsLabel"),
        suggestions: prompts.pronounOptions
      }),
      this.#decoratePromptField({
        id: "gender-identity", statePath: "finishing.genderIdentity",
        label: game.i18n.localize("BLANKINHERITANCE.Induction.Page7.GenderIdentityLabel"),
        suggestions: prompts.genderIdentityOptions
      }),
      ...(prompts.personalFile ?? []).map((q) => this.#decoratePromptField({
        id: q.id, statePath: `finishing.personalFile.${q.id}`, label: q.text,
        suggestions: q.suggestions, helpBody: q.purposeNote
      }))
    ];

    const appearanceField = this.#decoratePromptField({
      id: "appearance", statePath: "finishing.appearance",
      label: game.i18n.localize("BLANKINHERITANCE.Induction.Page7.AppearanceLabel"), isTextarea: true,
      suggestions: prompts.appearanceOptions
    });

    const personalityFields = (prompts.personality ?? []).map((q) => this.#decoratePromptField({
      id: q.id, statePath: `finishing.personality.${q.id}`, label: q.text,
      suggestions: q.suggestions, helpBody: q.purposeNote
    }));

    return {
      loadFailed: prompts.failed === true,
      nameField,
      identityFields,
      appearanceField,
      personalityFields,
      languages: this.state.finishing.languages,
      languageSuggestions: buildLanguageSuggestions(
        (ancestry?.languages ?? []).map((l) => titleCase(l.replace(/-/g, " "))),
        CURATED_LANGUAGES,
        this.state.finishing.languages
      ),
      isComplete: isFinishingComplete(this.state.finishing)
    };
  }

  async #page8Context() {
    const prompts = await loadIntakePrompts();
    const promptFields = (prompts.openQuestions ?? []).map((q) => this.#decoratePromptField({
      id: q.id,
      statePath: `intake.questions.${q.id}`,
      label: `${q.number}. ${q.text}`,
      isTextarea: true,
      suggestions: q.suggestions,
      helpBody: q.purposeNote,
      outOfCharacter: q.outOfCharacter === true
    }));
    // The catch-all box, kept out of the numbered list on purpose: it is not
    // a sixth question, it is the place for everything the five did not ask
    // (design/induction-intake-audit.md §3 -- this was in the original
    // accepted idea and never got built until now).
    const freeformField = prompts.freeform
      ? this.#decoratePromptField({
        id: prompts.freeform.id,
        statePath: "intake.freeform",
        label: prompts.freeform.text,
        isTextarea: true,
        suggestions: prompts.freeform.suggestions,
        helpBody: prompts.freeform.purposeNote
      })
      : null;
    return { loadFailed: prompts.failed === true, promptFields, freeformField };
  }

  /**
   * The page for the person playing (Ingram, 2026-10-01): out-of-character questions about what they
   * enjoy, what they don't, what they hope to do and what sort of force they want to be, so the GM can
   * build a game that is fun for THEM. Same chip + free-text view-model as Pages 7-8; answers live in the
   * same `intake.questions` map, keyed by prompt id. Every question is out of character, so the page says
   * so once, in its header and first line, instead of tagging each field. Nothing here is required.
   */
  async #pagePlayerContext() {
    const prompts = await loadIntakePrompts();
    const promptFields = (prompts.playerQuestions ?? []).map((q) => this.#decoratePromptField({
      id: q.id,
      statePath: `intake.questions.${q.id}`,
      label: `${q.number}. ${q.text}`,
      isTextarea: true,
      suggestions: q.suggestions,
      helpBody: q.purposeNote
    }));
    return { loadFailed: prompts.failed === true, promptFields };
  }

  /**
   * A read-only summary of every choice made across Pages 1-8 -- NOT a
   * computed sheet. This terminal never re-implements sf2e's own AC/HP/
   * skill/save math (design doc §2's "collect the right raw ingredients,
   * hand them to functions that already exist" — here, that function is
   * sf2e's own derived-data engine, not a local one): the real numbers
   * appear on the real character sheet the moment #createCharacterActor
   * embeds the real ancestry/background/class Items, which is what
   * "review" actually confirms here -- the CHOICES, not a preview of math
   * this page deliberately doesn't compute itself.
   */
  async #page9Context() {
    const prompts = await loadIntakePrompts();
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id) ?? null;
    const background = this._backgrounds.find((b) => b.id === this.state.background.id) ?? null;
    const cls = this._classes.find((c) => c.id === this.state.class.id) ?? null;

    const resolvedLabels = (slots, picks) => resolveSlots(slots, picks).resolved
      .filter((ability) => ability != null)
      .map((ability) => abilityLabel(ability));

    // "trained in Piloting": what a background's or class's own question was answered with, as the review reads it.
    const choicePhrases = (picked) => picked.map(({ kind, label }) => (kind === "skill" ? game.i18n.format("BLANKINHERITANCE.Induction.Page9.TrainedIn", { skill: label }) : label));

    const answerRows = (questions, answers) => questions
      .map((q) => ({ prompt: q.text ?? q.prompt, answer: getPath({ a: answers }, `a.${q.id}`) }))
      .filter((row) => row.answer);

    return {
      loadFailed: prompts.failed === true,
      portraitPath: this.state.portrait.path,
      summaryLine: [[ancestry?.name, cls?.name].filter(Boolean).join(" "), background?.name].filter(Boolean).join(" · "),
      attributeRows: this.#abilityRows(),
      ancestryName: ancestry?.name ?? null,
      ancestryBoostLabels: ancestry ? resolvedLabels(ancestry.boosts, this.state.ancestry.boostPicks) : [],
      ancestryFlawLabels: ancestry ? resolvedLabels(ancestry.flaws, this.state.ancestry.flawPicks) : [],
      backgroundName: background?.name ?? null,
      backgroundBoostLabels: background ? resolvedLabels(background.boosts, this.state.background.boostPicks) : [],
      backgroundChoiceLabels: background ? choicePhrases(pickedChoiceLabels(background.choices, this.state.background.choices, { labelOf: choiceLabel })) : [],
      className: cls?.name ?? null,
      classKeyAbilityLabel: cls ? resolvedLabels([cls.keyAbility], this.state.class.keyAbilityPicks)[0] : null,
      classChoiceLabels: cls ? choicePhrases(pickedChoiceLabels(cls.choices, this.state.class.choices, { labelOf: choiceLabel })) : [],
      freeBoostLabels: resolvedLabels(FREE_BOOST_SLOTS, this.state.attributes.freeBoostPicks),
      name: this.state.finishing.name,
      pronouns: this.state.finishing.pronouns || null,
      genderIdentity: this.state.finishing.genderIdentity || null,
      appearance: this.state.finishing.appearance || null,
      languages: this.state.finishing.languages,
      hasLanguages: this.state.finishing.languages.length > 0,
      personalFileAnswers: answerRows(prompts.personalFile, this.state.finishing.personalFile),
      personalityAnswers: answerRows(prompts.personality, this.state.finishing.personality),
      questionAnswers: answerRows(prompts.openQuestions, this.state.intake.questions),
      freeformAnswer: (this.state.intake.freeform ?? "").trim() || null,
      // The short heading, not the full question: a couple of these carry explanatory sentences.
      playerAnswers: answerRows(
        (prompts.playerQuestions ?? []).map((q) => ({ id: q.id, text: q.heading ?? q.text })),
        this.state.intake.questions
      ),
      isComplete: isReviewComplete(this.state),
      confirming: this.state.review.confirming,
      error: this.state.review.error,
      createdActorId: this.state.review.createdActorId,
      createdActorName: this.state.review.createdActorId ? game.actors.get(this.state.review.createdActorId)?.name : null
    };
  }

  /**
   * The suggestion-chip + free-text view-model shared by Page 7 and Page 8
   * (design doc's requirement: every RP-response field gets a list of
   * suggested answers AS WELL AS a free-text box). One shape, so both
   * templates {{#each}} over it identically -- adding a 9th banal question
   * or a per-question help note is a pure content edit in
   * induction-intake-prompts.json, never a template/adapter change.
   *
   * `helpBody` is Page 8-only (its per-question OOC purpose toggle); Page
   * 7's fields omit it. `syncKey` must be UNIQUE per field, not a shared
   * literal like Page 2's single "help" -- Foundry's data-sync state is a
   * flat dictionary keyed by that literal attribute value, so eight
   * identical data-sync="help" toggles on Page 8 would all collapse onto
   * one tracked entry.
   */
  #decoratePromptField({ id, statePath, label, isTextarea = false, suggestions = [], helpBody = null, outOfCharacter = false }) {
    const elementId = `bi-prompt-${id}`;
    const separator = isTextarea ? "\n\n" : ", ";
    return {
      id,
      statePath,
      elementId,
      isTextarea,
      label,
      outOfCharacter,
      value: getPath(this.state, statePath),
      suggestions: (suggestions ?? []).map((text) => ({ text, targetElementId: elementId, separator })),
      helpBody,
      syncKey: helpBody ? `help-${id}` : null
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    // Foundry eats Tab and the arrow, +, - and Page keys for itself (Cycle View, the camera) unless the focused element says the keys are its own; the
    // form's buttons and its crop area are not inside a <form>, so without this a player on the keyboard alone could not press Begin (foundry/keyboard-focus.mjs).
    if (this._keyboardRoot !== this.element) {
      this._keyboardRoot = this.element;
      claimKeyboardFor(this.element);
    }
    this.#arriveOnPage();
    this.#bindFilter();
    this.#bindPromptFields();
    this.#bindPortraitCropper();
    this.#bindAgreementView();
    this.#saveDraftSoon();
  }

  /**
   * A NEW page opens at its top, with focus on its title. Foundry's part-state sync carries the scroll
   * position across every re-render of the "page" part -- right for a re-render of the same page (pick a
   * chip, stay where you were), wrong for a page change, which used to open the next page wherever the
   * last one had been scrolled to (found in the 2026-09-25 UI pass: Background opened mid-list).
   */
  #arriveOnPage() {
    if (this._resetDetailScroll && this._renderedPage === this.state.page) {
      const detail = this.element?.querySelector("[data-picker-detail]");
      if (detail) detail.scrollTop = 0;
      this._resetDetailScroll = false;
    }
    if (this._renderedPage === this.state.page) return;
    this._renderedPage = this.state.page;
    for (const el of this.element?.querySelectorAll("[data-induction-body], [data-picker-list], [data-picker-detail]") ?? []) el.scrollTop = 0;
    this._resetDetailScroll = false;
    const title = this.element?.querySelector(".bi-doc__title");
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    }
  }

  /**
   * The live name filter shared by Page 2 (ancestry) and Page 3
   * (background): plain DOM show/hide, not an application re-render per
   * keystroke. A full render on every keystroke would fight the user for
   * cursor position (the Handlebars mixin restores FOCUS after a
   * re-render, not caret position) for a box whose result is cheap to
   * compute without going through _prepareContext at all -- even 154 items
   * is nothing to filter directly in the browser.
   *
   * Generalized 2026-09-10 (was ancestry-only, hardcoding
   * `this.state.ancestry.filter`) via a `data-filter-path` attribute each
   * page's own filter input carries -- same dotted-path idiom as Pages
   * 7-8's prompt fields.
   */
  #bindFilter() {
    const field = this.element?.querySelector("[data-induction-filter]");
    if (!field || field.dataset.biBound) return;
    field.dataset.biBound = "1";

    field.addEventListener("input", () => {
      setPath(this.state, field.dataset.filterPath, field.value);
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

  /**
   * Pages 7-8's free-text fields and their suggestion chips. Same reasoning
   * as #bindFilter: typing and suggestion-insert both write straight to
   * state via plain DOM listeners, never `this.render()` -- a render mid-
   * edit fights the Handlebars mixin's own focus-restore, which restores
   * FOCUS but never caret position. Harmless no-op on any other page (the
   * querySelectorAll below simply matches nothing).
   *
   * Suggestion clicks use ONE delegated listener on the page root rather
   * than one per chip -- it survives a language-widget re-render (a real
   * `this.render()`, see #onAddLanguage etc.) with no per-chip rebinding.
   */
  #bindPromptFields() {
    const root = this.element;
    if (!root) return;

    root.querySelectorAll("[data-prompt-field]").forEach((field) => {
      if (field.dataset.biBound) return;
      field.dataset.biBound = "1";
      field.addEventListener("input", () => {
        setPath(this.state, field.dataset.promptField, field.value);
        if (field.dataset.promptField === "finishing.name") this.#syncFinishingBlocker();
        this.#saveDraftSoon();
      });
    });

    if (!root.dataset.biPromptBound) {
      root.dataset.biPromptBound = "1";
      root.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-prompt-suggestion]");
        if (!chip) return;
        const field = document.getElementById(chip.dataset.promptTarget);
        if (!field) return;
        // .value = ... does NOT dispatch an 'input' event, so the write to
        // state below is not optional -- without it the inserted text would
        // show on screen but vanish on the next real render.
        const next = insertSuggestion(field.value, chip.dataset.suggestionText, chip.dataset.promptSeparator);
        field.value = next;
        setPath(this.state, field.dataset.promptField, next);
        field.focus();
        if (typeof field.setSelectionRange === "function") field.setSelectionRange(next.length, next.length);
        if (field.dataset.promptField === "finishing.name") this.#syncFinishingBlocker();
        this.#saveDraftSoon();
      });
    }
  }

  /**
   * Page 7's Name field is the only thing it needs, and it's typed, not clicked -- so no render happens
   * as it fills. The "what's missing" line beside Continue follows it on every keystroke (without this,
   * a typed name left the line saying a name was needed; found in the 2026-09-25 UI pass), and once there
   * is a name, the mark Continue put on the field (#pointAtMissing) comes off.
   */
  #syncFinishingBlocker() {
    const blocker = this.element?.querySelector("[data-induction-blocker]");
    const text = this.#blocker() ?? "";
    if (blocker) {
      blocker.textContent = text;
      blocker.hidden = !text;
    }
    if (!text) {
      this.element?.querySelectorAll(".bi-induction__missing").forEach((el) => el.classList.remove("bi-induction__missing"));
      this.element?.querySelectorAll("[data-missing-note]").forEach((el) => el.remove());
    }
  }

  /**
   * Page 6's file input, drag-to-pan, and zoom slider. Same reasoning as
   * #bindFilter/#bindPromptFields: every one of these fires far too often
   * (a slider's `input` event, a pointermove during a drag) to route
   * through `this.render()` without fighting the interaction it's
   * responding to -- panning/zooming write straight to _portraitCropSession
   * and repaint the preview's CSS transform directly
   * (#paintPortraitCropTransform). A harmless no-op on any other page.
   */
  #bindPortraitCropper() {
    const fileInput = this.element?.querySelector("[data-portrait-file-input]");
    if (fileInput && !fileInput.dataset.biBound) {
      fileInput.dataset.biBound = "1";
      fileInput.addEventListener("change", () => this.#onPortraitFileChosen(fileInput));
    }

    const zoom = this.element?.querySelector("[data-portrait-zoom]");
    if (zoom && !zoom.dataset.biBound) {
      zoom.dataset.biBound = "1";
      zoom.addEventListener("input", () => this.#onPortraitZoomInput(zoom));
    }

    const viewport = this.element?.querySelector("[data-portrait-viewport]");
    if (viewport && !viewport.dataset.biBound) {
      viewport.dataset.biBound = "1";
      this.#bindPortraitDrag(viewport);
      this.#bindPortraitKeysAndWheel(viewport);
    }

    const dropZone = this.element?.querySelector("[data-portrait-drop]");
    if (dropZone && !dropZone.dataset.biBound) {
      dropZone.dataset.biBound = "1";
      this.#bindPortraitDrop(dropZone);
    }
  }

  /**
   * A photo dragged from the desktop onto the portrait area starts a crop, same as Choose Photo -- the
   * way most people expect to hand a page an image (UI pass, 2026-09-25). stopPropagation keeps the drop
   * away from Foundry's own document-level drop handling, which would otherwise swallow it.
   */
  #bindPortraitDrop(zone) {
    const hasFile = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    let depth = 0; // dragenter/dragleave fire for every child crossed; count them so the highlight doesn't flicker
    zone.addEventListener("dragenter", (event) => {
      if (!hasFile(event)) return;
      event.preventDefault();
      depth += 1;
      zone.classList.add("bi-portrait--drop-target");
    });
    zone.addEventListener("dragover", (event) => {
      if (!hasFile(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = this.state.portrait.uploading ? "none" : "copy";
    });
    zone.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) zone.classList.remove("bi-portrait--drop-target");
    });
    zone.addEventListener("drop", (event) => {
      if (!hasFile(event)) return;
      event.preventDefault();
      event.stopPropagation();
      depth = 0;
      zone.classList.remove("bi-portrait--drop-target");
      this.#startPortraitCrop(event.dataTransfer.files?.[0]);
    });
  }

  /**
   * The crop without a mouse: arrow keys move the photo (Shift for bigger steps), + and - zoom; the mouse
   * wheel zooms too. The zoom slider was already keyboard-reachable, but panning was drag-only.
   */
  #bindPortraitKeysAndWheel(viewport) {
    const nudgeZoom = (delta) => {
      const slider = this.element?.querySelector("[data-portrait-zoom]");
      if (!slider) return;
      slider.value = String(Math.min(1, Math.max(0, Number(slider.value) + delta)));
      this.#onPortraitZoomInput(slider);
    };
    viewport.addEventListener("keydown", (event) => {
      const session = this._portraitCropSession;
      if (!session) return;
      const step = event.shiftKey ? 40 : 10;
      // Same direction as a drag (core/induction-portrait.mjs's panBy): the photo moves the way the arrow points.
      const pan = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (pan) {
        event.preventDefault();
        session.crop = panBy(session.crop, pan[0], pan[1], session.naturalWidth, session.naturalHeight, PORTRAIT_BOX.width, PORTRAIT_BOX.height);
        this.#paintPortraitCropTransform();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        nudgeZoom(0.05);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        nudgeZoom(-0.05);
      }
    });
    viewport.addEventListener("wheel", (event) => {
      if (!this._portraitCropSession) return;
      event.preventDefault();
      nudgeZoom(event.deltaY < 0 ? 0.04 : -0.04);
    }, { passive: false });
  }

  /**
   * A newly chosen file becomes a fresh crop session, cover-scaled and
   * centered (core/induction-portrait.mjs's initialCropState). Guarded
   * against an upload already in flight both here AND by the template's
   * own `disabled` on the file input while portrait.uploading -- otherwise
   * picking a second file mid-upload would let the first upload's own
   * success handler revoke the SECOND session's still-in-use object URL
   * out from under it once it resolves (found reasoning through the async
   * ordering while building this, not live -- same defense-in-depth
   * instinct as every other guarded action in this file).
   */
  async #onPortraitFileChosen(fileInput) {
    const file = fileInput.files?.[0];
    fileInput.value = ""; // choosing the SAME file again must still fire 'change'
    await this.#startPortraitCrop(file);
  }

  /** A photo from either way in -- the file picker or a drop onto the page -- becomes a fresh crop session. */
  async #startPortraitCrop(file) {
    if (!file || this.state.portrait.uploading) return;

    if (!file.type.startsWith("image/")) {
      this.state.portrait.error = game.i18n.localize("BLANKINHERITANCE.Induction.Page6.InvalidFileType");
      this.render({});
      return;
    }
    if (file.size > PORTRAIT_MAX_FILE_BYTES) {
      this.state.portrait.error = game.i18n.localize("BLANKINHERITANCE.Induction.Page6.FileTooLarge");
      this.render({});
      return;
    }

    this.#clearPortraitCropSession();
    this.state.portrait.error = null;

    const objectUrl = URL.createObjectURL(file);
    let naturalWidth, naturalHeight;
    try {
      ({ naturalWidth, naturalHeight } = await this.#loadImageSize(objectUrl));
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      this.state.portrait.error = err?.message ?? String(err);
      this.render({});
      return;
    }

    this._portraitCropSession = {
      file, objectUrl, naturalWidth, naturalHeight,
      crop: initialCropState(naturalWidth, naturalHeight, PORTRAIT_BOX.width, PORTRAIT_BOX.height)
    };
    this.render({});
  }

  /** A plain Image load, off-DOM, just to read the file's real pixel size before building the initial crop state. */
  #loadImageSize(objectUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not read that as an image."));
      img.src = objectUrl;
    });
  }

  /** Revokes the session's object URL before dropping it -- every path that replaces or ends a crop session goes through this, never a bare `= null`. */
  #clearPortraitCropSession() {
    if (this._portraitCropSession) URL.revokeObjectURL(this._portraitCropSession.objectUrl);
    this._portraitCropSession = null;
  }

  /** The zoom slider is a normalized [0,1] value, not a raw scale -- see induction-portrait.mjs's own comment on why. */
  #onPortraitZoomInput(zoomEl) {
    const session = this._portraitCropSession;
    if (!session) return;
    const cover = coverScale(session.naturalWidth, session.naturalHeight, PORTRAIT_BOX.width, PORTRAIT_BOX.height);
    const nextScale = sliderValueToScale(Number(zoomEl.value), cover);
    session.crop = zoomTo(session.crop, nextScale, session.naturalWidth, session.naturalHeight, PORTRAIT_BOX.width, PORTRAIT_BOX.height);
    this.#paintPortraitCropTransform();
  }

  /**
   * Pointer Events, not separate mouse/touch handlers -- unifies both under
   * one listener set and works on the Electron/Chromium client this
   * project targets either way. setPointerCapture keeps the drag going
   * even if the pointer leaves the viewport mid-drag, avoiding the classic
   * "pointerup outside the element never fires" bug a plain mouseup would have.
   */
  #bindPortraitDrag(viewport) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    viewport.addEventListener("pointerdown", (event) => {
      if (!this._portraitCropSession) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      viewport.classList.add("bi-portrait__viewport--dragging");
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const session = this._portraitCropSession;
      if (!session) return;
      // Screen pixels to the terminal's own CSS pixels: on a big screen the terminal is CSS-zoomed
      // (bi-components.css), and an undivided delta moved the photo faster than the pointer.
      const zoom = effectiveZoom(viewport) || 1;
      const dx = (event.clientX - lastX) / zoom;
      const dy = (event.clientY - lastY) / zoom;
      lastX = event.clientX;
      lastY = event.clientY;
      session.crop = panBy(session.crop, dx, dy, session.naturalWidth, session.naturalHeight, PORTRAIT_BOX.width, PORTRAIT_BOX.height);
      this.#paintPortraitCropTransform();
    });

    const endDrag = () => {
      dragging = false;
      viewport.classList.remove("bi-portrait__viewport--dragging");
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
  }

  /** Writes the crop <img>'s transform directly -- the live-drag/zoom counterpart to #page6Context's own render-time computation of the same values. */
  #paintPortraitCropTransform() {
    const session = this._portraitCropSession;
    const img = this.element?.querySelector("[data-portrait-crop-image]");
    if (!session || !img) return;
    img.style.transform = `translate(${-session.crop.offsetX}px, ${-session.crop.offsetY}px) scale(${session.crop.scale})`;
  }

  /* --- actions -------------------------------------------------- */

  static async #onBegin(_event, _target) {
    if (this._savedDraft) return; // Page 1 shows Continue / Start Again instead while a saved form is on offer
    // The agreement comes first, once. Signed, it's never shown again for this character.
    this.state.page = agreementPageEnabled() && !this.state.agreement.signed ? "agreement" : 2;
    this.render({});
  }

  static async #onBack(_event, _target) {
    this.state.page = 1;
    this.render({});
  }

  /** I AGREE: the only way on (Ingram, 2026-09-25). Records when, how long, and how far down they read. */
  static async #onSignAgreement(_event, _target) {
    const stats = this._agreementView?.stats() ?? { secondsOnPage: null, furthestRead: null };
    this.state.agreement = { signed: true, signedAt: new Date().toISOString(), ...stats };
    this.#releaseAgreementView();
    this.state.page = 2;
    this.render({});
  }

  static async #onBackFromAgreement(_event, _target) {
    this.#releaseAgreementView();
    this.state.page = 1;
    this.render({});
  }

  /** A finished tracker step: go straight there. Re-checked here, not just trusted from the button. */
  static async #onJumpToStep(_event, target) {
    const raw = target?.dataset?.step;
    // Numbered pages are numbers; the keyed ones ("agreement", "player") stay strings.
    const step = /^\d+$/.test(String(raw)) ? Number(raw) : raw;
    const allowed = canJumpTo(step, {
      order: this.#stepOrder(), current: this.state.page, furthest: this.state.furthest ?? this.state.page,
      isComplete: (id) => this.#isStepComplete(id)
    });
    if (!allowed) return;
    this.#releaseAgreementView();
    this.state.page = step;
    this.render({});
  }

  static async #onReturnToReview(_event, _target) {
    if (!this.#canReturnToReview()) return;
    this.state.page = 9;
    this.render({});
  }

  /**
   * Continue a saved form: its choices come back, and it reopens where it stopped -- or on the first
   * earlier step that isn't finished (core/induction-draft.mjs's resumeStep), such as the agreement if
   * it was switched on after the form was saved.
   */
  static async #onResumeDraft(_event, _target) {
    const draft = this._savedDraft;
    if (!draft) return;
    this._savedDraft = null;
    this._confirmingDiscard = false;
    this.state = draft.state;
    this.state.page = resumeStep(this.state.page, { order: this.#stepOrder(), isComplete: (id) => this.#isStepComplete(id) });
    this.render({});
  }

  /** Start Again asks first: the saved form is only thrown away by the second click. */
  static async #onStartAgain(_event, _target) {
    if (!this._savedDraft) return;
    this._confirmingDiscard = true;
    this.render({});
  }

  static async #onKeepDraft(_event, _target) {
    this._confirmingDiscard = false;
    this.render({});
  }

  /** Throws the saved form away and begins a new one, exactly as Begin would. */
  static async #onDiscardDraft(_event, _target) {
    if (!this._savedDraft || !this._confirmingDiscard) return;
    this._savedDraft = null;
    this._confirmingDiscard = false;
    writeStoredDraft(null);
    this.state = freshInductionState();
    this.state.page = agreementPageEnabled() ? "agreement" : 2;
    this.render({});
  }

  static async #onPickAncestry(_event, target) {
    if (target.dataset.ancestryId === this.state.ancestry.id) return;
    this._resetDetailScroll = true;
    this.state.ancestry.id = target.dataset.ancestryId;
    this.state.ancestry.boostPicks = [];
    this.state.ancestry.flawPicks = [];
    this.render({});
  }

  static async #onPickBoost(_event, target) {
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id);
    this.#pickFreeSlot("ancestry.boostPicks", ancestry?.boosts ?? [], target);
  }

  static async #onPickFlaw(_event, target) {
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id);
    this.#pickFreeSlot("ancestry.flawPicks", ancestry?.flaws ?? [], target);
  }

  static async #onPickBackgroundBoost(_event, target) {
    const background = this._backgrounds.find((b) => b.id === this.state.background.id);
    this.#pickFreeSlot("background.boostPicks", background?.boosts ?? [], target);
  }

  /**
   * An answer to a question the chosen background asks (Starship Dweller: Crafting or Piloting). The terminal asks it here, and writes
   * it into the Item before it is embedded, so Foundry opens no window of its own at Confirm (core/induction-rule-choices.mjs).
   */
  static async #onPickBackgroundChoice(_event, target) {
    const background = this._backgrounds.find((b) => b.id === this.state.background.id);
    this.#pickRuleChoice("background.choices", background?.choices ?? [], target);
  }

  /** The same for the class (Envoy: Deception, Diplomacy or Intimidation). */
  static async #onPickClassChoice(_event, target) {
    const cls = this._classes.find((c) => c.id === this.state.class.id);
    this.#pickRuleChoice("class.choices", cls?.choices ?? [], target);
  }

  /**
   * Records one answer. Refuses a key that is not one of that question's own options, as #pickFreeSlot does for a boost: the page
   * never renders a button for one, so only a stale render or a forged target could send it.
   */
  #pickRuleChoice(picksPath, choices, target) {
    const { flag, key } = target.dataset;
    const choice = choices.find((c) => c.flag === flag);
    if (!choice?.options.some((option) => option.key === key)) return;
    getPath(this.state, picksPath)[flag] = key;
    this.render({});
  }

  /**
   * Shared by every free-boost/flaw picker (ancestry's two, background's
   * one). `picksPath` is a dotted state path -- generalized 2026-09-10 when
   * background became a third consumer, replacing a two-array identity
   * comparison (#setFreePick) that could only ever tell ancestry.boostPicks
   * apart from ancestry.flawPicks, nothing else.
   *
   * Refuses a pick a sibling slot has already claimed even if the button's
   * disabled attribute were somehow bypassed (a stale render, direct DOM
   * manipulation) -- the template's `claimed` flag is the primary defense,
   * this is the second one, since an illegal double-boost silently reaching
   * derive.mjs is a real rules bug, not just a UI nicety.
   *
   * Also refuses an ability that isn't even a member of the target slot's
   * own option list -- found live 2026-09-10 (adversarial-testing Page 4's
   * key-ability picker with a fabricated target: `claimedAbilities` alone
   * only rejects an ability another slot has ALREADY resolved, it never
   * validates that a brand-new pick belongs to ITS OWN slot in the first
   * place, since the real template never renders a button for an illegal
   * ability at all -- this closes that gap for a forged target on all
   * three real callers (ancestry boosts/flaws, background boosts, class
   * key ability), not just the one that surfaced it.
   */
  #pickFreeSlot(picksPath, slots, target) {
    const slotIndex = Number(target.dataset.slotIndex);
    const ability = target.dataset.ability;
    if (!isLegalPick(slots[slotIndex] ?? [], ability)) return;
    const picks = getPath(this.state, picksPath);
    if (claimedAbilities(slots, picks, slotIndex).has(ability)) return;
    // picks is parallel to the FREE slots only (core/boost-slots.mjs), so a
    // slot's own index among ALL slots isn't its index among free ones
    // whenever a fixed slot comes before it.
    const position = slots.slice(0, slotIndex).filter((slot) => slot.length > 1).length;
    const next = [...picks];
    next[position] = ability;
    setPath(this.state, picksPath, next);
    this.render({});
  }

  static async #onContinueFromAncestry(_event, _target) {
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id);
    if (!isAncestryChoiceComplete(ancestry, this.state.ancestry.boostPicks, this.state.ancestry.flawPicks)) return this.#pointAtMissing();
    this.state.page = 3;
    this.render({});
  }

  static async #onPickBackground(_event, target) {
    if (target.dataset.backgroundId === this.state.background.id) return;
    this._resetDetailScroll = true;
    this.state.background.id = target.dataset.backgroundId;
    this.state.background.boostPicks = [];
    this.state.background.choices = {};
    this.render({});
  }

  static async #onContinueFromBackground(_event, _target) {
    const background = this._backgrounds.find((b) => b.id === this.state.background.id);
    if (!isBackgroundChoiceComplete(background, this.state.background.boostPicks, this.state.background.choices)) return this.#pointAtMissing();
    this.state.page = 4;
    this.render({});
  }

  static async #onBackFromBackground(_event, _target) {
    this.state.page = 2;
    this.render({});
  }

  static async #onPickClass(_event, target) {
    if (target.dataset.classId === this.state.class.id) return;
    this._resetDetailScroll = true;
    this.state.class.id = target.dataset.classId;
    this.state.class.keyAbilityPicks = [];
    this.state.class.choices = {};
    this.render({});
  }

  static async #onPickClassKeyAbility(_event, target) {
    const cls = this._classes.find((c) => c.id === this.state.class.id);
    this.#pickFreeSlot("class.keyAbilityPicks", cls ? [cls.keyAbility] : [], target);
  }

  static async #onContinueFromClass(_event, _target) {
    const cls = this._classes.find((c) => c.id === this.state.class.id);
    if (!isClassChoiceComplete(cls, this.state.class.keyAbilityPicks, this.state.class.choices)) return this.#pointAtMissing();
    this.state.page = 5;
    this.render({});
  }

  static async #onBackFromClass(_event, _target) {
    this.state.page = 3;
    this.render({});
  }

  static async #onToggleFreeBoost(_event, target) {
    this.state.attributes.freeBoostPicks = toggleFreeBoost(this.state.attributes.freeBoostPicks, target?.dataset?.ability);
    this.render({});
  }

  static async #onContinueFromAttributes(_event, _target) {
    if (!isFreeBoostsComplete(this.state.attributes.freeBoostPicks)) return this.#pointAtMissing();
    this.state.page = 6;
    this.render({});
  }

  static async #onBackFromAttributes(_event, _target) {
    this.state.page = 4;
    this.render({});
  }

  static async #onRemovePortrait(_event, _target) {
    this.state.portrait.path = null;
    this.state.portrait.error = null;
    this.render({});
  }

  /**
   * The one other action in this terminal (besides Page 9's Confirm) that
   * touches the real world. Guarded against a second concurrent upload the
   * same way Page 9's confirm guards against a second Actor -- the
   * template already disables this button while uploading, this is the
   * defense-in-depth re-check.
   */
  static async #onConfirmPortraitCrop(_event, _target) {
    const session = this._portraitCropSession;
    if (!session || this.state.portrait.uploading) return;
    this.state.portrait.uploading = true;
    this.state.portrait.error = null;
    this.render({});

    try {
      this.state.portrait.path = await this.#uploadCroppedPortrait(session);
      this.#clearPortraitCropSession();
    } catch (err) {
      console.error("Blank Inheritance | Induction terminal: portrait upload failed:", err);
      this.state.portrait.error = err?.message ?? String(err);
    } finally {
      this.state.portrait.uploading = false;
      this.render({});
    }
  }

  static async #onContinueFromPortrait(_event, _target) {
    this.state.page = 7;
    this.render({});
  }

  static async #onBackFromPortrait(_event, _target) {
    this.state.page = 5;
    this.render({});
  }

  /**
   * Draws the crop session's current source rectangle (core/
   * induction-portrait.mjs's cropSourceRect) from the live preview <img>
   * into a fixed OUTPUT_WIDTH x OUTPUT_HEIGHT canvas, exports it, and
   * uploads it via io.mjs -- the only module allowed to touch Foundry's
   * file-access globals, per that file's own header.
   *
   * Writes straight into storage/ itself (dirName: "", a distinctive
   * "portrait-" filename prefix doing the organizing a real subfolder
   * would otherwise do) rather than a storage/portraits/ subdirectory,
   * and calls no ensureDirectory at all -- found live building this page:
   * createDirectory is unreliable on this Foundry install for any fresh
   * directory (see writeStorageFile's own doc comment in io.mjs for the
   * full finding, confirmed even through Foundry's own first-party
   * "Create Subfolder" UI, not just this module's code). storage/ itself
   * is already guaranteed to exist once persistentStorage is enabled, so
   * writing straight into it sidesteps the broken call entirely rather
   * than working around it.
   */
  async #uploadCroppedPortrait(session) {
    const img = this.element?.querySelector("[data-portrait-crop-image]");
    if (!img) throw new Error("The crop preview isn't available — try choosing the photo again.");

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    const { sx, sy, sWidth, sHeight } = cropSourceRect(session.crop, PORTRAIT_BOX.width, PORTRAIT_BOX.height);
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    const { blob, mimeType, extension } = await this.#exportCanvasBlob(canvas);
    const filename = `portrait-${foundry.utils.randomID()}.${extension}`;
    // A plain Player's own client may not upload (FILES_UPLOAD): the GM's client does, over the relay, like Page 9's Actor.create.
    return requestPortraitUpload({ filename, blob, mimeType });
  }

  /** WebP first -- matches tools/stage-assets/stage_assets.py's own precedent (Foundry serves it natively, PIXI loads it as a texture with no special handling); a PNG fallback for a browser build that can't encode WebP. */
  async #exportCanvasBlob(canvas) {
    const toBlob = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    const webp = await toBlob("image/webp", 0.86);
    if (webp) return { blob: webp, mimeType: "image/webp", extension: "webp" };
    const png = await toBlob("image/png");
    if (png) return { blob: png, mimeType: "image/png", extension: "png" };
    throw new Error("This browser could not export the cropped image.");
  }

  static async #onContinueFromFinishing(_event, _target) {
    if (!isFinishingComplete(this.state.finishing)) return this.#pointAtMissing();
    this.state.page = 8;
    this.render({});
  }

  static async #onBackFromFinishing(_event, _target) {
    // Was `= 5` from when this was written (Pages 7-8's own build round,
    // before Page 6 existed) -- the forward skip (#onContinueFromAttributes)
    // got restored when Page 6 landed, but this backward one was missed at
    // the time since it never carried its own TEMPORARY comment. Found
    // live testing Page 6's own Back/Continue seam, clicking through the
    // real chain rather than only jumping pages via state.
    this.state.page = 6;
    this.render({});
  }

  static async #onAddLanguage(_event, target) {
    this.state.finishing.languages = addLanguage(this.state.finishing.languages, target.dataset.language);
    this.render({});
  }

  static async #onRemoveLanguage(_event, target) {
    this.state.finishing.languages = removeLanguage(this.state.finishing.languages, target.dataset.language);
    this.render({});
  }

  static async #onAddLanguageCustom(_event, _target) {
    const input = this.element?.querySelector("[data-langlist-input]");
    if (!input) return;
    this.state.finishing.languages = addLanguage(this.state.finishing.languages, input.value);
    input.value = "";
    this.render({});
  }

  static async #onContinueFromQuestions(_event, _target) {
    this.state.page = "player";
    this.render({});
  }

  static async #onBackFromQuestions(_event, _target) {
    this.state.page = 7;
    this.render({});
  }

  /** Nothing on the player's page is required, so Continue never points at anything missing. */
  static async #onContinueFromPlayer(_event, _target) {
    this.state.page = 9;
    this.render({});
  }

  static async #onBackFromPlayer(_event, _target) {
    this.state.page = 8;
    this.render({});
  }

  static async #onBackFromReview(_event, _target) {
    this.state.page = "player";
    this.render({});
  }

  /**
   * The one action in this whole terminal that touches the real world.
   * Guarded three ways: isReviewComplete gates the button itself; this
   * handler re-checks it (defense in depth, same reasoning as every other
   * confirm gate here); #createCharacterActor re-resolves every choice
   * through its own throwing resolveXIngredients call BEFORE creating
   * anything, so a state reachable only by skipping the UI (direct state
   * mutation, a future routing bug) still can't produce a half-built Actor.
   */
  static async #onConfirmCharacter(_event, _target) {
    // The template already hides this button once createdActorId is set --
    // this guard is for the same reason every other one in this file
    // exists: don't trust that the only way in is through the button that
    // happens to currently be rendered. Without it, a second invocation
    // (a stale click queued before re-render, direct console access) would
    // silently create a SECOND actor from the same state.
    if (!isReviewComplete(this.state) || this.state.review.confirming || this.state.review.createdActorId) return;
    this.state.review.confirming = true;
    this.state.review.error = null;
    this.render({});

    try {
      const actor = await this.#createCharacterActor();
      this.state.review.createdActorId = actor.id;
      writeStoredDraft(null); // the form is finished: nothing left to offer back
    } catch (err) {
      console.error("Blank Inheritance | Induction terminal: character creation failed:", err);
      this.state.review.error = err?.message ?? String(err);
    } finally {
      this.state.review.confirming = false;
      this.render({});
    }
  }

  /**
   * GH #162: once a character exists, the only way off Page 9 was "Back" —
   * which does nothing useful once the Actor is already created, and left
   * the terminal with no way to dismiss it at all. The terminal is a one-shot
   * flow, not a persistent toggle panel like Phone/Deck, so finishing really
   * closes it (unmountInductionTerminal's own `active?.close()`) rather than
   * just hiding it — a player who has just finished character creation is
   * done with this UI for good.
   */
  static async #onFinishInduction(_event, _target) {
    unmountInductionTerminal();
  }

  /**
   * The validated recipe (design/induction-terminal.md's own Page 9
   * build-status paragraph has the full live-verification trail this came
   * from -- summarized here): resolve every choice, fetch the three real
   * compendium Items, strip their OWN further-item grants (class features/
   * background feat/ancestry feat -- deferred to the real character sheet,
   * the same principle already applied to every other feat/spell pick in
   * this terminal; leaving them attached is ALSO what caused a real,
   * reproducible indefinite hang live-testing this page, isolated to
   * Soldier's 18-entry class-feature grant list processing on embed), embed
   * them with the player's boost/key-ability selections pre-set, add the
   * background's Lore skill as its own Item (background's trainedSkills.lore
   * is NOT covered by the same auto-apply sf2e uses for trainedSkills.value),
   * write the four free boosts onto the Actor directly (Player Core Step 6
   * isn't tied to any Item), then sync current HP to the newly-computed max
   * (a fresh Actor's system.attributes.hp.value ships at the sf2e schema's
   * generic default, not the character's own just-derived max -- confirmed
   * live, not assumed).
   *
   * On any failure after the Actor exists, deletes it rather than leaving a
   * half-built character in the world -- then re-throws so the caller shows
   * the real error instead of silently losing it.
   */
  async #createCharacterActor() {
    const ancestry = this._ancestries.find((a) => a.id === this.state.ancestry.id);
    const background = this._backgrounds.find((b) => b.id === this.state.background.id);
    const cls = this._classes.find((c) => c.id === this.state.class.id);

    // Throws (and creates nothing) if any prior page's choice doesn't
    // actually resolve cleanly -- see this method's own doc comment.
    resolveAncestryIngredients(ancestry, this.state.ancestry.boostPicks, this.state.ancestry.flawPicks);
    resolveBackgroundIngredients(background, this.state.background.boostPicks, this.state.background.choices);
    resolveClassIngredients(cls, this.state.class.keyAbilityPicks, this.state.class.choices);
    resolveFreeBoosts(this.state.attributes.freeBoostPicks);

    const slotSelections = (field, resolved) => Object.fromEntries(
      resolved.map((ability, i) => [`${field}.${i}.selected`, ability]).filter(([, a]) => a != null)
    );

    const ancestrySelections = {
      ...slotSelections("boosts", resolveSlots(ancestry.boosts, this.state.ancestry.boostPicks).resolved),
      ...slotSelections("flaws", resolveSlots(ancestry.flaws, this.state.ancestry.flawPicks).resolved)
    };
    const backgroundSelections = slotSelections("boosts", resolveSlots(background.boosts, this.state.background.boostPicks).resolved);
    const classSelections = isFixedSlot(cls.keyAbility)
      ? {}
      : { "keyAbility.selected": resolveSlots([cls.keyAbility], this.state.class.keyAbilityPicks).resolved[0] };

    const [ancestryUuid, backgroundUuid, classUuid] = await Promise.all([
      this.#resolveCompendiumUuid("ancestries", ancestry.id),
      this.#resolveCompendiumUuid("backgrounds", background.id),
      this.#resolveCompendiumUuid("classes", cls.id)
    ]);

    // Actor.create needs the Assistant/GM role by Foundry's own default
    // permission configuration (confirmed live against this project's own
    // test world, not assumed -- see foundry/induction-relay.mjs's header),
    // which a real player will not have. requestActorCreation runs this
    // directly when called from the GM's own client (unchanged from before);
    // for anyone else it travels to the GM's client and grants ownership to
    // the requesting player as part of that same create.
    const actor = await requestActorCreation({
      name: this.state.finishing.name.trim(),
      type: "character",
      // Omitted entirely when no portrait was uploaded -- Foundry's own
      // default (a generic silhouette) is a real, unpenalized path per
      // Page 6's own "optional" framing, not a gap this has to fill in.
      ...(this.state.portrait.path ? { img: this.state.portrait.path } : {}),
      system: { abilities: null, details: { level: { value: 1 } } }
    });

    try {
      const [ancestrySrc, backgroundSrc, classSrc] = await Promise.all([
        this.#prepareAbcSource(ancestryUuid, ancestrySelections),
        this.#prepareAbcSource(backgroundUuid, backgroundSelections, this.state.background.choices),
        this.#prepareAbcSource(classUuid, classSelections, this.state.class.choices)
      ]);
      await actor.createEmbeddedDocuments("Item", [ancestrySrc, backgroundSrc, classSrc], { keepId: true, render: false });

      if (background.loreSkills.length) {
        await actor.createEmbeddedDocuments(
          "Item",
          background.loreSkills.map((name) => ({ type: "lore", name, system: { proficient: { value: 1 } } })),
          { render: false }
        );
      }

      await actor.update({ "system.build.attributes.boosts.1": this.state.attributes.freeBoostPicks });
      await actor.update({ "system.attributes.hp.value": actor.system.attributes.hp.max });

      // Everything this form collected goes onto the real sf2e biography
      // (core/induction-bio.mjs). Before 2026-09-18 pronouns, gender,
      // appearance and languages were gathered on Page 7 and written
      // nowhere -- see design/induction-intake-audit.md §6b. Non-fatal for
      // the same reason as the intake answers below: a mechanically correct
      // Actor with an unfilled Biography tab is a far smaller problem than
      // losing the whole character to a failed text write.
      try {
        const bioUpdate = buildBioUpdate({
          prompts: await loadIntakePrompts(),
          finishing: this.state.finishing,
          intake: this.state.intake,
          // sf2e validates languages against its own list; anything a player
          // typed by hand that isn't in it goes to the free-text companion
          // field instead of being silently dropped.
          knownLanguageSlugs: Object.keys(CONFIG.PF2E?.languages ?? {})
        });
        if (Object.keys(bioUpdate).length) await actor.update(bioUpdate);
      } catch (err) {
        console.error("Blank Inheritance | Could not write this character's biography fields:", err);
      }

      // Session-zero's whole point (design/induction.md) is the backstory
      // prompts, not the sheet math above -- but until now the answers had
      // nowhere to go once this method returned (GitHub #96/#45's own open
      // question, and #140's audit named it directly). Never fatal to
      // character creation: a real, playable Actor with no saved backstory
      // is a smaller problem than losing the whole character over a
      // whisper failing.
      try {
        await this.#persistIntakeAnswers(actor);
      } catch (err) {
        console.error("Blank Inheritance | Could not persist this character's intake answers:", err);
      }

      // The other half of the same permission gap requestActorCreation works
      // around: a plain Player CAN update their own User document's
      // `character` field directly (confirmed in common/documents/user.mjs's
      // own #canUpdate -- only permissions/passwordSalt/name/role are
      // restricted, and name/role only for non-Assistants), so this needs no
      // relay. Attempted after everything else succeeds and never fatal --
      // same "don't lose the whole character over one non-essential write"
      // reasoning as #persistIntakeAnswers just above. Without this the rest
      // of the console (the command bar, the equipment locker's "acting as
      // self") has no way to know which Actor is this player's own.
      try {
        await game.user.update({ character: actor.id });
      } catch (err) {
        console.error("Blank Inheritance | Could not set this as your own character:", err);
      }

      return actor;
    } catch (err) {
      await requestActorDeletion(actor.id).catch(() => {});
      throw err;
    }
  }

  /**
   * The durable copy is the Actor flag -- queryable, survives independently
   * of chat retention/pruning. The whispered ChatMessage alongside it is
   * what actually gets this into the harvest pipeline for free: it lands in
   * foundry/chat-export.mjs's own createChatMessage hook exactly like any
   * other message, no second export mechanism needed. Whispered to every
   * GM specifically (not `game.user.id` -- the player who just created this
   * character is who's logged in here, and this is written for the GM to
   * read, same as Page 9's own review step already frames the whole flow).
   */
  async #persistIntakeAnswers(actor) {
    const prompts = await loadIntakePrompts();
    const { text, hasContent } = summarizeIntakeAnswers({
      prompts,
      questions: this.state.intake.questions,
      freeform: this.state.intake.freeform,
      personalFile: this.state.finishing.personalFile,
      personality: this.state.finishing.personality
    });

    await actor.setFlag(MODULE_ID, "intake", {
      questions: this.state.intake.questions,
      freeform: this.state.intake.freeform,
      personalFile: this.state.finishing.personalFile,
      personality: this.state.finishing.personality
    });
    // FORM 1-B: when they signed, how long they spent on it, and how far down they scrolled (0-1).
    // An in-fiction record for NPCs to remark on later (design/induction-agreement.md).
    if (this.state.agreement.signed) await actor.setFlag(MODULE_ID, "agreement", { ...this.state.agreement });

    if (!hasContent) return;
    const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
    if (!gmIds.length) return; // no GM connected to whisper to -- the flag above is still saved
    await ChatMessage.create({
      content: `<h3>${actor.name} — intake answers</h3><pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
      whisper: gmIds,
      // core/chat-export.mjs's own harvestKind flag -- this content is
      // always worth surfacing in the harvest report, never a candidate for
      // "does this ordinary message contain a check/link" inference.
      flags: { [MODULE_ID]: { harvestKind: "intake-answers" } }
    });
  }

  /** `fromUuid` needs the real compendium document id -- resolved from our own catalogue's `id` (a kebab slug) against the live compendium's own `system.slug`, same field the catalogue extraction itself keyed on. */
  async #resolveCompendiumUuid(packName, slug) {
    const pack = game.packs.get(`sf2e.${packName}`);
    const docs = await pack.getDocuments();
    const doc = docs.find((d) => d.system.slug === slug);
    if (!doc) throw new Error(`Could not find "${slug}" in the sf2e.${packName} compendium.`);
    return doc.uuid;
  }

  /**
   * Fetch a real compendium Item and prepare it for embedding: strip its
   * own further-item grants (see #createCharacterActor's doc comment for
   * why) and pre-set whichever boost-slot/key-ability selections the
   * player actually made, at the exact system-data paths sf2e's own
   * AttributeBuilder application writes to live (verified against
   * gamesystems/sf2e/sf2e.mjs directly, not guessed).
   */
  async #prepareAbcSource(uuid, selections, choicePicks = {}) {
    const doc = await fromUuid(uuid);
    if (!doc) throw new Error(`Could not resolve compendium item "${uuid}".`);
    const source = doc.toObject();
    source.system.items = {};
    // The player's answer goes into each ChoiceSet before the Item is embedded, so Foundry has no question left to ask in a window of its
    // own (core/induction-rule-choices.mjs). Before the grants are stripped: a question that only fed a grant is dropped along with it.
    source.system.rules = stripGrantItemRules(applyRuleChoices(source.system.rules, choicePicks));
    for (const [path, value] of Object.entries(selections)) {
      foundry.utils.setProperty(source.system, path, value);
    }
    return source;
  }
}

/* ---------------------------------------------------------------- */
/*  State                                                            */
/* ---------------------------------------------------------------- */

/**
 * A blank form. The ONE definition of the terminal's default state: the class field and every reset
 * both call this. It used to be written out twice, once as the class field and once in
 * mountInductionTerminal's reset, "kept in sync by hand" -- every new sub-object had to be added in
 * both places (found live 2026-09-09) -- and a saved draft is now laid over it as well
 * (core/induction-draft.mjs), which a third copy would only have made worse.
 */
function freshInductionState() {
  return {
    page: 1,
    furthest: 1, // the furthest step reached, so finished steps up to there stay one click away
    // FORM 1-B. Signed once, never shown again for this character (Ingram: "only at signing").
    agreement: { signed: false, signedAt: null, secondsOnPage: null, furthestRead: null },
    ancestry: {
      id: null,
      filter: "",
      boostPicks: [], // parallel to the FREE boost slots only, see core/boost-slots.mjs
      flawPicks: []
    },
    background: {
      id: null,
      filter: "",
      boostPicks: [], // backgrounds have no flaws (Player Core: "two boosts... no flaw")
      choices: {} // answers to the questions the background asks, by the question's flag (core/induction-rule-choices.mjs); an open map the saved form keeps whole
    },
    class: {
      id: null,
      keyAbilityPicks: [], // one slot (core/induction-class.mjs); empty until a free key ability needs a pick
      choices: {} // the same for the class's own questions (Envoy)
    },
    attributes: {
      freeBoostPicks: [] // core/induction-attributes.mjs's four free boosts, compact and in pick order
    },
    portrait: {
      path: null, // the full Foundry-relative path once uploaded, e.g. "modules/blank-inheritance/storage/portraits/<id>.webp"
      uploading: false,
      error: null
    },
    finishing: {
      name: "",
      pronouns: "",
      genderIdentity: "",
      appearance: "",
      languages: [],
      personalFile: {}, // keyed by induction-intake-prompts.json's personalFile[].id (age, height, weight, birth-place)
      personality: {} // keyed by its personality[].id (likes, dislikes, attitude, beliefs, good-at)
    },
    intake: {
      questions: {}, // keyed by induction-intake-prompts.json's openQuestions[].id
      freeform: "" // the single large catch-all box -> sf2e's own Backstory field
    },
    review: {
      confirming: false, // true only while #createCharacterActor's own await chain is in flight
      error: null,
      createdActorId: null
    }
  };
}

/**
 * Saved forms (core/induction-draft.mjs) live in a client-scoped setting: the player's own browser,
 * never the server, so a half-written answer is never broadcast to the table or readable by anyone
 * else. One entry per world and user, keyed by draftKey().
 */
export const SETTING_DRAFTS = "inductionDrafts";

function currentDraftKey() {
  return draftKey(game.world?.id ?? "world", game.userId ?? game.user?.id ?? "user");
}

function readStoredDrafts() {
  try {
    const all = game.settings.get(MODULE_ID, SETTING_DRAFTS);
    return all && typeof all === "object" ? all : {};
  } catch {
    return {};
  }
}

/** Writes (or, given null, removes) this user's saved form. Never throws: a form that can't be saved still works. */
function writeStoredDraft(draft) {
  const warn = (err) => console.warn("Blank Inheritance | Induction terminal: could not save the form in progress:", err);
  const all = { ...readStoredDrafts() };
  const key = currentDraftKey();
  if (draft) all[key] = draft;
  else if (key in all) delete all[key];
  else return;
  try {
    Promise.resolve(game.settings.set(MODULE_ID, SETTING_DRAFTS, all)).catch(warn);
  } catch (err) {
    warn(err);
  }
}

/** This user's saved form, laid over a blank one, or null if there isn't one worth offering. */
function readSavedDraft() {
  return restoreDraft(readStoredDrafts()[currentDraftKey()], freshInductionState());
}

/* ---------------------------------------------------------------- */
/*  The singleton                                                    */
/* ---------------------------------------------------------------- */

let active = null;

export function getInductionTerminal() {
  return active;
}

/**
 * Resets state every call, even when reusing an existing instance --
 * openInductionTerminal's own doc comment promises "always starting at Page
 * 1," which was false for a second invocation before this fixed it (found
 * live 2026-09-09: re-opening mid-flow silently resumed wherever state had
 * been left, with no visible way to tell that had happened).
 *
 * A saved form is still never resumed silently: it's looked up here and
 * OFFERED on Page 1, where the player sees which form it is and chooses to
 * continue it or start again (#page1Context, #onResumeDraft).
 */
export function mountInductionTerminal() {
  if (!active) active = new InductionTerminal();
  else {
    // A stale crop session (object URL and all) belongs to whatever
    // character was mid-portrait last time this instance was open --
    // revoke it explicitly rather than letting a fresh Page 6 visit
    // silently inherit it (a leaked blob: URL, not a functional bug, but
    // the same "don't let one character's working state bleed into the
    // next" reasoning as every field being reset below).
    if (active._portraitCropSession) URL.revokeObjectURL(active._portraitCropSession.objectUrl);
    active._portraitCropSession = null;
    active.state = freshInductionState();
  }
  active._savedDraft = readSavedDraft();
  active._confirmingDiscard = false;
  active.render({ force: true });
  return active;
}

/** The "what's missing" lines beside a disabled Continue, spelled out in full so the lang-key test can see them. */
const BLOCKER_KEYS = {
  PickAncestry: "BLANKINHERITANCE.Induction.Blocker.PickAncestry",
  PickBackground: "BLANKINHERITANCE.Induction.Blocker.PickBackground",
  PickClass: "BLANKINHERITANCE.Induction.Blocker.PickClass",
  PickKeyAbility: "BLANKINHERITANCE.Induction.Blocker.PickKeyAbility",
  OneMorePick: "BLANKINHERITANCE.Induction.Blocker.OneMorePick",
  MorePicks: "BLANKINHERITANCE.Induction.Blocker.MorePicks",
  OneMoreAttribute: "BLANKINHERITANCE.Induction.Blocker.OneMoreAttribute",
  MoreAttributes: "BLANKINHERITANCE.Induction.Blocker.MoreAttributes",
  Uploading: "BLANKINHERITANCE.Induction.Blocker.Uploading",
  NeedName: "BLANKINHERITANCE.Induction.Blocker.NeedName",
  ReviewIncomplete: "BLANKINHERITANCE.Induction.Blocker.ReviewIncomplete"
};

/**
 * The world setting that shows FORM 1-B, the Service Agreement, as the terminal's second page.
 * Off by default: the text is drafted, and nothing drafted reaches a player until Ingram has graded it
 * (design/approvals-desk.md). The GM turns it on in Configure Settings once it's approved.
 */
export const SETTING_AGREEMENT = "inductionAgreementEnabled";

export function registerInductionSettings() {
  game.settings.register(MODULE_ID, SETTING_AGREEMENT, {
    name: "BLANKINHERITANCE.Induction.Agreement.SettingName",
    hint: "BLANKINHERITANCE.Induction.Agreement.SettingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, SETTING_DRAFTS, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
}

function agreementPageEnabled() {
  try { return game.settings.get(MODULE_ID, SETTING_AGREEMENT) === true; } catch { return false; }
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
 * Open the terminal, always starting at Page 1 -- which offers the player's
 * saved form back, if they have one (mountInductionTerminal). Kept as its
 * own exported function, matching openSceneRunner's shape, so callers never
 * have to change which function they call when opening grows more setup.
 */
export function openInductionTerminal() {
  return mountInductionTerminal();
}

const MACRO_SOURCE_ID = "blank-inheritance-induction-terminal-macro";

/**
 * The manual way in, alongside the automatic one (blank-inheritance.mjs's
 * own ready hook) -- same "macro as backup for the trigger that opens this
 * automatically" shape as every other panel's own createXMacroIfMissing.
 * Needed for real: a player who closes the terminal before finishing (or
 * whose auto-open never fired, e.g. a GM manually clearing their character)
 * has no other way back in, since nothing else in this world links to it.
 */
export async function createInductionTerminalMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId(MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Induction.MacroName"),
      type: "script",
      img: "icons/svg/vault.svg",
      command: `await game.modules.get("${MODULE_ID}").api.openInductionTerminal();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the induction terminal macro.");
}
