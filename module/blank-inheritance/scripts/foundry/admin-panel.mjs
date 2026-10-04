/**
 * The admin panel: a GM-only window for doing unusual things to every system
 * this module has added to Foundry (Ingram, 2026-09-28). It is a testing tool,
 * not part of running a session, so it is an ordinary framed Foundry window
 * rather than part of the deck.
 *
 * Sections, top to bottom, in the order a test run uses them:
 *   Start over   -- reset to the start of Episode One, and undo that.
 *   The players  -- lend test characters to empty accounts; the autopilot
 *                   switches and one-press stand-in actions.
 *   Time         -- set the day ring exactly, or step it on.
 *   Jump         -- open any scene: Runner, backdrop and clock together.
 *   The City     -- open any authored departure; cancel; clear pawns.
 *   The world    -- update from the last deploy, rebuild scenes, stop sound.
 *   State        -- what every system holds right now, and a JSON copy of it.
 *
 * Everything it does lives in admin-actions.mjs and admin-autopilot.mjs; this
 * file only draws and asks. The way in from the main screen is the red Admin
 * key (admin-button.mjs), which opens and closes this window by its id.
 */

import { RESET_DEFAULTS, STRATEGIES, adminPanelSize, normalizeResetOptions, resetPlan } from "../core/admin.mjs";
import { QUARTERS } from "../core/day-ring.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { copyTextToClipboard } from "./io.mjs";
import {
  authoredDepartures,
  collectState,
  jumpToScene,
  lastSnapshot,
  lendTestParty,
  loadEpisodes,
  openAuthoredDeparture,
  removeAllPawns,
  resetToStart,
  returnTestParty,
  setClock,
  testPartyRecord,
  undoLastReset
} from "./admin-actions.mjs";
import {
  autopilotActivity,
  autopilotSettings,
  bookForEveryone,
  pickForEveryone,
  rollLastCheckForEveryone,
  setAutopilot
} from "./admin-autopilot.mjs";
import { advanceSegment } from "./campaign-state.mjs";
import { cancelCityDeparture, cityState } from "./city-state.mjs";
import { stopAllAudio } from "./audio-director.mjs";
import { runWorldSync } from "./world-sync.mjs";
import { buildSceneSet } from "./scene-build.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const MACRO_SOURCE_ID = "macro-admin-panel";
// Keys are written out in full so test/tier0-architecture.test.mjs can check every one exists.
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/** The label of each reset step, as the confirmation lists it. Literal keys so the lang test checks each one. */
const STEP_KEYS = Object.freeze({
  snapshot: "BLANKINHERITANCE.Admin.Step.snapshot",
  city: "BLANKINHERITANCE.Admin.Step.city",
  settings: "BLANKINHERITANCE.Admin.Step.settings",
  downtime: "BLANKINHERITANCE.Admin.Step.downtime",
  papers: "BLANKINHERITANCE.Admin.Step.papers",
  stage: "BLANKINHERITANCE.Admin.Step.stage",
  social: "BLANKINHERITANCE.Admin.Step.social",
  travel: "BLANKINHERITANCE.Admin.Step.travel",
  notebook: "BLANKINHERITANCE.Admin.Step.notebook",
  objectives: "BLANKINHERITANCE.Admin.Step.objectives",
  chat: "BLANKINHERITANCE.Admin.Step.chat",
  combats: "BLANKINHERITANCE.Admin.Step.combats",
  induction: "BLANKINHERITANCE.Admin.Step.induction",
  scene: "BLANKINHERITANCE.Admin.Step.scene",
  log: "BLANKINHERITANCE.Admin.Step.log"
});

const OPTION_KEYS = Object.freeze({
  clearChat: "BLANKINHERITANCE.Admin.Option.clearChat",
  endCombats: "BLANKINHERITANCE.Admin.Option.endCombats",
  cutToStart: "BLANKINHERITANCE.Admin.Option.cutToStart",
  deleteInductionCharacters: "BLANKINHERITANCE.Admin.Option.deleteInductionCharacters",
  clearNotebook: "BLANKINHERITANCE.Admin.Option.clearNotebook",
  clearObjectives: "BLANKINHERITANCE.Admin.Option.clearObjectives"
});

const STRATEGY_KEYS = Object.freeze({
  random: "BLANKINHERITANCE.Admin.Strategy.random",
  spread: "BLANKINHERITANCE.Admin.Strategy.spread",
  together: "BLANKINHERITANCE.Admin.Strategy.together"
});

const escape = (s) => foundry.utils.escapeHTML(String(s ?? ""));

export class AdminPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  #resetOptions = { ...RESET_DEFAULTS };
  #busy = null;
  #episodes = null;
  #departures = null;
  #jumpEpisode = null;

  static DEFAULT_OPTIONS = {
    id: "bi-admin",
    classes: ["bi-admin", "bi-scope"],
    window: { title: "BLANKINHERITANCE.Admin.Title", icon: "fa-solid fa-screwdriver-wrench", resizable: true },
    // Only a fallback: openAdminPanel sizes the window to the screen it opens
    // on (core/admin.mjs#adminPanelSize). Opened near the top rather than
    // centred: centred at 2560x1440, its foot sat over the console deck's orb.
    position: { width: 1100, height: 760, top: 70 },
    actions: {
      reset: AdminPanel.#onReset,
      undo: AdminPanel.#onUndo,
      lend: AdminPanel.#onLend,
      giveBack: AdminPanel.#onGiveBack,
      pickNow: AdminPanel.#onPickNow,
      rollNow: AdminPanel.#onRollNow,
      bookNow: AdminPanel.#onBookNow,
      setClock: AdminPanel.#onSetClock,
      nextQuarter: AdminPanel.#onNextQuarter,
      jump: AdminPanel.#onJump,
      openDeparture: AdminPanel.#onOpenDeparture,
      cancelDeparture: AdminPanel.#onCancelDeparture,
      removePawns: AdminPanel.#onRemovePawns,
      worldSync: AdminPanel.#onWorldSync,
      rebuildScenes: AdminPanel.#onRebuildScenes,
      stopAudio: AdminPanel.#onStopAudio,
      copyState: AdminPanel.#onCopyState
    }
  };

  static PARTS = {
    // "" = the part's own root element is the scroller (.bi-admin__body is the
    // part's one top-level element), so a re-render keeps where the GM had scrolled to.
    body: { template: `modules/${MODULE_ID}/templates/admin/panel.hbs`, scrollable: [""] }
  };

  async _prepareContext() {
    this.#episodes ??= await loadEpisodes();
    this.#departures ??= await authoredDepartures();
    this.#jumpEpisode ??= this.#episodes[0]?.id ?? null;

    const state = collectState();
    const autopilot = autopilotSettings();
    const snapshot = lastSnapshot();
    const moment = state.moment ?? { day: 1, quarter: "morning" };
    const roster = state.roster;
    const jumpEpisode = this.#episodes.find((e) => e.id === this.#jumpEpisode) ?? this.#episodes[0] ?? null;

    return {
      busy: this.#busy,
      state,
      stateJson: JSON.stringify(state, null, 2),
      clock: {
        day: moment.day,
        quarters: QUARTERS.map((q) => ({ id: q.id, label: game.i18n.localize(q.labelKey), selected: q.id === moment.quarter }))
      },
      resetOptions: Object.entries(OPTION_KEYS).map(([id, labelKey]) => ({ id, labelKey, checked: this.#resetOptions[id] })),
      snapshot: snapshot
        ? { takenAt: new Date(snapshot.takenAt).toLocaleString(), undone: Boolean(snapshot.undoneAt), counts: snapshot.counts ?? {} }
        : null,
      roster: {
        total: roster.length,
        withCharacter: roster.filter((r) => r.character).length,
        list: roster,
        lent: Object.keys(testPartyRecord()).length
      },
      autopilot: {
        ...autopilot,
        strategies: STRATEGIES.map((id) => ({ id, labelKey: STRATEGY_KEYS[id], selected: id === autopilot.strategy }))
      },
      activity: autopilotActivity(),
      episodes: this.#episodes.map((e) => ({ id: e.id, title: e.title ?? e.id, selected: e.id === jumpEpisode?.id })),
      jumpScenes: [...(jumpEpisode?.scenes ?? [])]
        .filter((s) => s.briefRef)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => ({ briefRef: s.briefRef, label: `${String(s.order ?? "").padStart(2, "0")}. ${s.title ?? s.briefRef}` })),
      departures: this.#departures.map((d) => ({ briefId: d.briefId, label: `${d.title} (${d.kind})` })),
      departureOpen: Boolean(cityState().departure)
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    for (const box of root.querySelectorAll("[data-reset-option]")) {
      box.addEventListener("change", () => {
        this.#resetOptions = normalizeResetOptions({ ...this.#resetOptions, [box.dataset.resetOption]: box.checked });
      });
    }
    for (const box of root.querySelectorAll("[data-autopilot]")) {
      box.addEventListener("change", () => setAutopilot({ [box.dataset.autopilot]: box.checked }));
    }
    root.querySelector("[data-autopilot-strategy]")?.addEventListener("change", (event) => setAutopilot({ strategy: event.target.value }));
    root.querySelector("[data-jump-episode]")?.addEventListener("change", (event) => {
      this.#jumpEpisode = event.target.value;
      this.render();
    });
  }

  /** Run one action with the panel marked busy, and tell the GM how it went. */
  async #run(labelKey, fn) {
    if (this.#busy) return;
    this.#busy = game.i18n.localize(labelKey);
    this.render();
    try {
      return await fn();
    } catch (err) {
      console.error("Blank Inheritance | Admin action failed:", err);
      ui.notifications.error(L("BLANKINHERITANCE.Admin.Failed", { what: game.i18n.localize(labelKey), error: err.message }));
      return null;
    } finally {
      this.#busy = null;
      this.render();
    }
  }

  static async #onReset() {
    const plan = resetPlan(this.#resetOptions);
    const items = plan
      .map((s) => `<li>${escape(game.i18n.localize(STEP_KEYS[s.id]))}${s.undoable === false ? ` <em>${escape(L("BLANKINHERITANCE.Admin.NotUndoable"))}</em>` : ""}</li>`)
      .join("");
    const confirmed = await DialogV2.confirm({
      window: { title: L("BLANKINHERITANCE.Admin.Reset.ConfirmTitle"), icon: "fa-solid fa-rotate-left" },
      content: `<p>${escape(L("BLANKINHERITANCE.Admin.Reset.ConfirmLead"))}</p><ol class="bi-admin__plan">${items}</ol><p>${escape(L("BLANKINHERITANCE.Admin.Reset.ConfirmKept"))}</p>`,
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;
    const result = await this.#run("BLANKINHERITANCE.Admin.Reset.Busy", () => resetToStart(this.#resetOptions));
    if (!result) return;
    if (!result.ok && result.reason === "no-snapshot") ui.notifications.error(L("BLANKINHERITANCE.Admin.Reset.NoSnapshot"));
    else if (result.failed?.length) ui.notifications.warn(L("BLANKINHERITANCE.Admin.Reset.Partial", { steps: result.failed.map((f) => f.id).join(", ") }));
    else ui.notifications.info(L("BLANKINHERITANCE.Admin.Reset.Done"));
  }

  static async #onUndo() {
    const confirmed = await DialogV2.confirm({
      window: { title: L("BLANKINHERITANCE.Admin.Undo.ConfirmTitle"), icon: "fa-solid fa-clock-rotate-left" },
      content: `<p>${escape(L("BLANKINHERITANCE.Admin.Undo.ConfirmLead", { when: this.element.querySelector("[data-snapshot-when]")?.textContent ?? "" }))}</p>`,
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;
    const result = await this.#run("BLANKINHERITANCE.Admin.Undo.Busy", () => undoLastReset());
    if (!result) return;
    if (result.failed?.length) ui.notifications.warn(L("BLANKINHERITANCE.Admin.Undo.Partial", { steps: result.failed.map((f) => f.id).join(", ") }));
    else ui.notifications.info(L("BLANKINHERITANCE.Admin.Undo.Done"));
  }

  static async #onLend() {
    const plan = await this.#run("BLANKINHERITANCE.Admin.Party.Lend", () => lendTestParty());
    if (plan) ui.notifications.info(L("BLANKINHERITANCE.Admin.Party.Lent", { count: plan.length }));
  }

  static async #onGiveBack() {
    const count = await this.#run("BLANKINHERITANCE.Admin.Party.GiveBack", () => returnTestParty());
    if (count !== null) ui.notifications.info(L("BLANKINHERITANCE.Admin.Party.Returned", { count }));
  }

  static async #onPickNow() {
    const n = await this.#run("BLANKINHERITANCE.Admin.Autopilot.PickNow", () => pickForEveryone());
    if (n !== null) ui.notifications.info(L("BLANKINHERITANCE.Admin.Autopilot.Picked", { count: n }));
  }

  static async #onRollNow() {
    const n = await this.#run("BLANKINHERITANCE.Admin.Autopilot.RollNow", () => rollLastCheckForEveryone());
    if (n !== null) ui.notifications.info(L("BLANKINHERITANCE.Admin.Autopilot.Rolled", { count: n }));
  }

  static async #onBookNow() {
    const n = await this.#run("BLANKINHERITANCE.Admin.Autopilot.BookNow", () => bookForEveryone());
    if (n !== null) ui.notifications.info(L("BLANKINHERITANCE.Admin.Autopilot.Booked", { count: n }));
  }

  static async #onSetClock() {
    const day = Number(this.element.querySelector("[data-clock-day]")?.value);
    const quarter = this.element.querySelector("[data-clock-quarter]")?.value;
    await this.#run("BLANKINHERITANCE.Admin.Clock.Set", () => setClock(day, quarter));
  }

  static async #onNextQuarter() {
    await this.#run("BLANKINHERITANCE.Admin.Clock.Next", () => advanceSegment(1));
  }

  static async #onJump() {
    const episodeId = this.element.querySelector("[data-jump-episode]")?.value;
    const briefId = this.element.querySelector("[data-jump-scene]")?.value;
    const found = await this.#run("BLANKINHERITANCE.Admin.Jump.Go", () => jumpToScene(episodeId, briefId));
    if (found === false) ui.notifications.warn(L("BLANKINHERITANCE.Admin.Jump.NoBackdrop"));
  }

  static async #onOpenDeparture() {
    const briefId = this.element.querySelector("[data-departure]")?.value;
    await this.#run("BLANKINHERITANCE.Admin.City.Open", () => openAuthoredDeparture(briefId));
  }

  static async #onCancelDeparture() {
    await this.#run("BLANKINHERITANCE.Admin.City.Cancel", () => cancelCityDeparture());
  }

  static async #onRemovePawns() {
    const n = await this.#run("BLANKINHERITANCE.Admin.City.RemovePawns", () => removeAllPawns());
    if (n !== null) ui.notifications.info(L("BLANKINHERITANCE.Admin.City.PawnsRemoved", { count: n }));
  }

  static async #onWorldSync() {
    await this.#run("BLANKINHERITANCE.Admin.World.Sync", () => runWorldSync({ trigger: "manual" }));
  }

  static async #onRebuildScenes() {
    await this.#run("BLANKINHERITANCE.Admin.World.Rebuild", () => buildSceneSet({ notify: true }));
  }

  static async #onStopAudio() {
    await this.#run("BLANKINHERITANCE.Admin.World.StopAudio", () => stopAllAudio({ fadeMs: 800 }));
  }

  static async #onCopyState() {
    try {
      await copyTextToClipboard(JSON.stringify(collectState(), null, 2));
      ui.notifications.info(L("BLANKINHERITANCE.Admin.State.Copied"));
    } catch (err) {
      ui.notifications.warn(L("BLANKINHERITANCE.Admin.State.CopyFailed", { error: err.message }));
    }
  }
}

let open = null;

export function openAdminPanel() {
  if (!game.user?.isGM) return null;
  if (open?.rendered) {
    open.bringToFront();
    return open;
  }
  open = new AdminPanel({ position: adminPanelSize({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }) });
  open.render({ force: true });
  return open;
}

export function refreshAdminPanel() {
  if (open?.rendered) open.render();
}

export async function createAdminMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId(MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: L("BLANKINHERITANCE.Admin.MacroName"),
      type: "script",
      img: "icons/svg/wrench.svg",
      command: `await game.modules.get("${MODULE_ID}").api.openAdminPanel();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the Admin Panel macro.");
}
