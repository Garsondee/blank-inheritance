/**
 * The induction terminal — character creation, run as a diegetic scene.
 *
 * Session zero: a player logs into Foundry with no character yet and is
 * walked through the Directorate's own induction questionnaire. What comes
 * out the other end is a real Actor, with a "basic but viable" sheet --
 * class feats/spells are deliberately left for the real character sheet
 * afterward, not handled here. See design/induction-terminal.md for the
 * full page-by-page design; this file and its templates currently build
 * Page 1 (orientation), Page 2 (ancestry), Page 3 (background), Page 4
 * (class), Page 7 (finishing details) and Page 8 (the eight questions).
 * Pages 5-6 and 9 don't exist yet -- Page 4's own Continue temporarily
 * jumps straight to Page 7, see that handler's own comment.
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
import { resolveSlots, claimedAbilities, isLegalPick } from "../core/boost-slots.mjs";
import {
  isAncestryChoiceComplete,
  groupAncestries,
  filterAncestries
} from "../core/induction-ancestry.mjs";
import {
  isBackgroundChoiceComplete,
  groupBackgroundsByRarity,
  filterBackgrounds
} from "../core/induction-background.mjs";
import { isClassChoiceComplete } from "../core/induction-class.mjs";
import {
  insertSuggestion,
  isFinishingComplete,
  addLanguage,
  removeLanguage,
  buildLanguageSuggestions
} from "../core/induction-intake.mjs";
import { getPath, setPath } from "../core/state-path.mjs";

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
const abilityLabel = (key) => game.i18n.localize(ABILITY_KEYS[key] ?? key);
const sizeLabel = (key) => game.i18n.localize(SIZE_KEYS[key] ?? key);
const rankLabel = (rank) => game.i18n.localize(RANK_KEYS[rank] ?? RANK_KEYS[0]);
/** Reuses sf2e's own PF2E.Skill.<Name> keys (ux-doctrine.md §11) -- verified against gamesystems/sf2e/lang/en.json's real nested shape, see #page3Context's own history with this. */
const skillLabel = (slug) => game.i18n.localize(`PF2E.Skill.${slug.charAt(0).toUpperCase()}${slug.slice(1)}`);

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
      banalQuestions: [], eightQuestions: [], failed: true
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
      pickAncestry: InductionTerminal.#onPickAncestry,
      changeAncestry: InductionTerminal.#onChangeAncestry,
      pickBoost: InductionTerminal.#onPickBoost,
      pickFlaw: InductionTerminal.#onPickFlaw,
      continueFromAncestry: InductionTerminal.#onContinueFromAncestry,
      pickBackground: InductionTerminal.#onPickBackground,
      changeBackground: InductionTerminal.#onChangeBackground,
      pickBackgroundBoost: InductionTerminal.#onPickBackgroundBoost,
      continueFromBackground: InductionTerminal.#onContinueFromBackground,
      backFromBackground: InductionTerminal.#onBackFromBackground,
      pickClass: InductionTerminal.#onPickClass,
      changeClass: InductionTerminal.#onChangeClass,
      pickClassKeyAbility: InductionTerminal.#onPickClassKeyAbility,
      continueFromClass: InductionTerminal.#onContinueFromClass,
      backFromClass: InductionTerminal.#onBackFromClass,
      continueFromFinishing: InductionTerminal.#onContinueFromFinishing,
      backFromFinishing: InductionTerminal.#onBackFromFinishing,
      addLanguage: InductionTerminal.#onAddLanguage,
      removeLanguage: InductionTerminal.#onRemoveLanguage,
      addLanguageCustom: InductionTerminal.#onAddLanguageCustom,
      continueFromQuestions: InductionTerminal.#onContinueFromQuestions,
      backFromQuestions: InductionTerminal.#onBackFromQuestions
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
    },
    page3: {
      template: `${TEMPLATE_ROOT}/page3-background.hbs`,
      scrollable: [".bi-induction__page"]
    },
    page4: {
      template: `${TEMPLATE_ROOT}/page4-class.hbs`,
      scrollable: [".bi-induction__page"]
    },
    page7: {
      template: `${TEMPLATE_ROOT}/page7-finishing.hbs`,
      scrollable: [".bi-induction__page"]
    },
    page8: {
      template: `${TEMPLATE_ROOT}/page8-questions.hbs`,
      scrollable: [".bi-induction__page"]
    }
  };

  /** All in-progress choices. Nothing here touches Foundry until Page 9's real confirm (design doc §6). */
  state = {
    page: 1,
    ancestry: {
      id: null,
      filter: "",
      boostPicks: [], // parallel to the FREE boost slots only, see core/boost-slots.mjs
      flawPicks: []
    },
    background: {
      id: null,
      filter: "",
      boostPicks: [] // backgrounds have no flaws (Player Core: "two boosts... no flaw")
    },
    class: {
      id: null,
      keyAbilityPicks: [] // one slot (core/induction-class.mjs); empty until a free key ability needs a pick
    },
    finishing: {
      name: "",
      pronouns: "",
      genderIdentity: "",
      appearance: "",
      languages: [],
      banalAnswers: {} // keyed by induction-intake-prompts.json's banalQuestions[].id
    },
    intake: {
      questions: {} // keyed by induction-intake-prompts.json's eightQuestions[].id
    }
  };

  /** The loaded catalogues, kept so action handlers don't re-fetch on every click. */
  _ancestries = [];
  _backgrounds = [];
  _classes = [];

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
    const base = { userName: game.user?.name ?? "", trackerSteps: this.#trackerSteps() };
    if (this.state.page === 2) return { ...base, ...(await this.#page2Context()) };
    if (this.state.page === 3) return { ...base, ...(await this.#page3Context()) };
    if (this.state.page === 4) return { ...base, ...(await this.#page4Context()) };
    if (this.state.page === 7) return { ...base, ...(await this.#page7Context()) };
    if (this.state.page === 8) return { ...base, ...(await this.#page8Context()) };
    return base;
  }

  /**
   * The routing-slip progress tracker every page's header shows (design
   * doc §4's own page table, all nine entries -- shown even for the ones
   * not built yet, so "you are on step 3 of 9" reads honestly rather than
   * only ever showing however many pages happen to exist so far). Computed
   * once in the shared base context so every page template gets it for
   * free, rather than each page's own #pageNContext() repeating it.
   */
  #trackerSteps() {
    const labels = [
      "Orientation", "Ancestry", "Background", "Class", "Attributes",
      "Portrait", "Finishing", "Questions", "Review"
    ];
    return labels.map((label, index) => {
      const number = index + 1;
      const isDone = number < this.state.page;
      const isCurrent = number === this.state.page;
      return { number, label, isDone, isCurrent, isUpcoming: !isDone && !isCurrent };
    });
  }

  async #page2Context() {
    const catalogue = await loadAncestryCatalogue();
    this._ancestries = catalogue.ancestries ?? [];

    const filtered = filterAncestries(this._ancestries, this.state.ancestry.filter);
    const { terrestrial, alienCoded } = groupAncestries(filtered);
    const toRow = (a) => ({ id: a.id, name: a.name, nameLower: a.name.toLowerCase() });

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
    const toRow = (b) => ({ id: b.id, name: b.name, nameLower: b.name.toLowerCase() });

    const background = this._backgrounds.find((b) => b.id === this.state.background.id) ?? null;

    return {
      loadFailed: catalogue.failed === true,
      filterValue: this.state.background.filter,
      backgroundGroups: { common: common.map(toRow), uncommon: uncommon.map(toRow), rare: rare.map(toRow) },
      selected: background ? this.#decorateBackground(background) : null,
      isComplete: isBackgroundChoiceComplete(background, this.state.background.boostPicks)
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
      boostSlots
    };
  }

  async #page4Context() {
    const catalogue = await loadClassCatalogue();
    this._classes = catalogue.classes ?? [];
    const cls = this._classes.find((c) => c.id === this.state.class.id) ?? null;

    return {
      loadFailed: catalogue.failed === true,
      classes: this._classes.map((c) => ({ id: c.id, name: c.name })),
      selected: cls ? this.#decorateClass(cls) : null,
      isComplete: isClassChoiceComplete(cls, this.state.class.keyAbilityPicks)
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
      keyAbilitySlot
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

    const promptFields = [
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
      ...prompts.banalQuestions.map((q) => this.#decoratePromptField({
        id: q.id, statePath: `finishing.banalAnswers.${q.id}`, label: q.text, isTextarea: true, suggestions: q.suggestions
      })),
      this.#decoratePromptField({
        id: "appearance", statePath: "finishing.appearance",
        label: game.i18n.localize("BLANKINHERITANCE.Induction.Page7.AppearanceLabel"), isTextarea: true,
        suggestions: prompts.appearanceOptions
      })
    ];

    return {
      loadFailed: prompts.failed === true,
      nameField,
      promptFields,
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
    const promptFields = prompts.eightQuestions.map((q) => this.#decoratePromptField({
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
  #decoratePromptField({ id, statePath, label, isTextarea = false, suggestions = [], helpBody = null }) {
    const elementId = `bi-prompt-${id}`;
    const separator = isTextarea ? "\n\n" : ", ";
    return {
      id,
      statePath,
      elementId,
      isTextarea,
      label,
      value: getPath(this.state, statePath),
      suggestions: (suggestions ?? []).map((text) => ({ text, targetElementId: elementId, separator })),
      helpBody,
      syncKey: helpBody ? `help-${id}` : null
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    this.#bindFilter();
    this.#bindPromptFields();
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
        if (field.dataset.promptField === "finishing.name") this.#syncContinueFromFinishingDisabled();
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
        if (field.dataset.promptField === "finishing.name") this.#syncContinueFromFinishingDisabled();
      });
    }
  }

  /** Direct DOM toggle, not a render -- Page 7's Name field is the only thing gating Continue, and it must react on every keystroke. */
  #syncContinueFromFinishingDisabled() {
    const button = this.element?.querySelector('[data-action="continueFromFinishing"]');
    if (button) button.disabled = !isFinishingComplete(this.state.finishing);
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
    if (!isAncestryChoiceComplete(ancestry, this.state.ancestry.boostPicks, this.state.ancestry.flawPicks)) return;
    this.state.page = 3;
    this.render({});
  }

  static async #onPickBackground(_event, target) {
    this.state.background.id = target.dataset.backgroundId;
    this.state.background.boostPicks = [];
    this.render({});
  }

  static async #onChangeBackground(_event, _target) {
    this.state.background.id = null;
    this.state.background.boostPicks = [];
    this.render({});
  }

  static async #onContinueFromBackground(_event, _target) {
    const background = this._backgrounds.find((b) => b.id === this.state.background.id);
    if (!isBackgroundChoiceComplete(background, this.state.background.boostPicks)) return;
    this.state.page = 4;
    this.render({});
  }

  static async #onBackFromBackground(_event, _target) {
    this.state.page = 2;
    this.render({});
  }

  static async #onPickClass(_event, target) {
    this.state.class.id = target.dataset.classId;
    this.state.class.keyAbilityPicks = [];
    this.render({});
  }

  static async #onChangeClass(_event, _target) {
    this.state.class.id = null;
    this.state.class.keyAbilityPicks = [];
    this.render({});
  }

  static async #onPickClassKeyAbility(_event, target) {
    const cls = this._classes.find((c) => c.id === this.state.class.id);
    this.#pickFreeSlot("class.keyAbilityPicks", cls ? [cls.keyAbility] : [], target);
  }

  /**
   * TEMPORARY: Pages 5-6 (Attribute Boosts/Portrait) don't exist yet.
   * Jumping straight to Page 7 keeps the terminal click-through testable
   * end to end rather than dead-ending here -- restore this to
   * `this.state.page = 5; this.render({})` once Page 5 is built (the same
   * temporary-skip role Page 3's own Continue held until Page 4 existed).
   * See design/induction-terminal.md §8.
   */
  static async #onContinueFromClass(_event, _target) {
    const cls = this._classes.find((c) => c.id === this.state.class.id);
    if (!isClassChoiceComplete(cls, this.state.class.keyAbilityPicks)) return;
    this.state.page = 7;
    this.render({});
  }

  static async #onBackFromClass(_event, _target) {
    this.state.page = 3;
    this.render({});
  }

  static async #onContinueFromFinishing(_event, _target) {
    if (!isFinishingComplete(this.state.finishing)) return;
    this.state.page = 8;
    this.render({});
  }

  static async #onBackFromFinishing(_event, _target) {
    this.state.page = 4;
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

  /**
   * Page 9 (Review & Confirm) is not built yet -- same "log rather than
   * no-op silently" idiom as Page 2's own former stub.
   */
  static async #onContinueFromQuestions(_event, _target) {
    console.log(
      "Blank Inheritance | Induction terminal: the Eight Questions confirmed -- " +
      "Page 9 (Review & Confirm) is not built yet. See design/induction-terminal.md for the full page-by-page design."
    );
  }

  static async #onBackFromQuestions(_event, _target) {
    this.state.page = 7;
    this.render({});
  }
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
 */
export function mountInductionTerminal() {
  if (!active) active = new InductionTerminal();
  // Mirrors the class field's own default state literal above exactly --
  // the two must be kept in sync by hand (found live 2026-09-09, the first
  // time this reset existed at all: it's the one place a NEW state
  // sub-object has to be added twice, once here and once as the class
  // field's own default).
  else {
    active.state = {
      page: 1,
      ancestry: { id: null, filter: "", boostPicks: [], flawPicks: [] },
      background: { id: null, filter: "", boostPicks: [] },
      class: { id: null, keyAbilityPicks: [] },
      finishing: { name: "", pronouns: "", genderIdentity: "", appearance: "", languages: [], banalAnswers: {} },
      intake: { questions: {} }
    };
  }
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
