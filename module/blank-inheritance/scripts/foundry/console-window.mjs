/**
 * The Console — the full mimetic sheet/dashboard surface, opened from its
 * own chassis button exactly the way foundry/phone.mjs opens the comm
 * device (same `.bi-terminal` chrome, same singleton mount/toggle idiom).
 *
 * One shared shell, seat-dependent tab list: every seat gets the five
 * sheet tabs (Overview/Skills/Strikes/Spells/Gear), reading through
 * `consoleActor()` for a player and `actorForSeat(DIRECTOR)` — whatever is
 * selected on canvas, falling back to the GM's own character — for a GM.
 * A GM therefore gets the FULL sheet of whatever token is selected, not a
 * cut-down version, which is what "quickly roll from whatever token" and
 * "access to all sorts of other things" both actually need. Three more
 * tabs (Party/Hub/Log) are GM-only, appended rather than replacing anything.
 *
 * Design doctrine this owes: design/ux-doctrine.md Law 18 (never recompute
 * what sf2e already computes — every number here is read off the live
 * actor, nothing is re-derived) and design/visual-identity.md's Paper/Glass
 * split (this whole surface is GLASS — numbers and controls; a feat or
 * spell's own rules text is left to its own item sheet rather than
 * reproduced here, so this never turns into a second, drifting copy of a
 * document Foundry already renders correctly in Paper).
 */

import { SEATS } from "../core/console-model.mjs";
import { consoleActor, actorForSeat, rollCheck, rollStrike, castSpell } from "./rolls.mjs";
import { sheetOverview, sheetSkillGroups, sheetStrikes, sheetSpellcasting, sheetInventory, sheetFeats, creditsOnHand } from "./sheet-data.mjs";
import { hasAnySpell, nonEmptySpellBlocks } from "../core/sheet-model.mjs";
import { partyOverviewData } from "./party.mjs";
import { currentEntries } from "./session-log.mjs";
import { formatLogEntriesForDisplay } from "../core/phone.mjs";
import { openDirectorPanel } from "./director-panel.mjs";
import { openSceneRunner } from "./scene-runner.mjs";
import { openEquipmentPanel } from "./equipment-panel.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { openInductionTerminal } from "./induction-terminal.mjs";
import { selectCastRow } from "./cast.mjs";
import { refreshCommandBar } from "./command-bar.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/console/window`;

/** Whichever actor this seat's sheet tabs are about — the one Foundry-touching decision every tab builder below shares. */
function resolveActor() {
  return game.user.isGM ? actorForSeat(SEATS.DIRECTOR) : consoleActor();
}

async function buildOverviewTab() {
  const actor = resolveActor();
  return { actor: actor ? { id: actor.id, name: actor.name } : null, overview: actor ? sheetOverview(actor) : null };
}

async function buildSkillsTab() {
  const actor = resolveActor();
  return { actor: actor ? { id: actor.id, name: actor.name } : null, groups: sheetSkillGroups(actor) };
}

async function buildStrikesTab() {
  const actor = resolveActor();
  return { actor: actor ? { id: actor.id, name: actor.name } : null, strikes: actor ? sheetStrikes(actor) : [] };
}

async function buildSpellsTab() {
  const actor = resolveActor();
  const allBlocks = actor ? await sheetSpellcasting(actor) : [];
  return { actor: actor ? { id: actor.id, name: actor.name } : null, blocks: nonEmptySpellBlocks(allBlocks), hasSpells: hasAnySpell(allBlocks) };
}

async function buildGearTab() {
  const actor = resolveActor();
  return {
    actor: actor ? { id: actor.id, name: actor.name } : null,
    inventory: actor ? sheetInventory(actor) : [],
    feats: actor ? sheetFeats(actor) : [],
    credits: actor ? creditsOnHand(actor) : 0
  };
}

async function buildPartyTab() {
  return partyOverviewData();
}

/** GM-only launcher tiles onto the panels that already exist as their own real windows — the console becomes a hub onto them rather than a second copy of them. */
const HUB_TILES = [
  { id: "director-panel", labelKey: "BLANKINHERITANCE.Console.Window.Hub.DirectorPanel", faIcon: "fa-solid fa-clapperboard", open: () => openDirectorPanel() },
  { id: "scene-runner", labelKey: "BLANKINHERITANCE.Console.Window.Hub.SceneRunner", faIcon: "fa-solid fa-film", open: () => openSceneRunner() },
  { id: "equipment", labelKey: "BLANKINHERITANCE.Console.Window.Hub.Equipment", faIcon: "fa-solid fa-toolbox", open: () => openEquipmentPanel() },
  { id: "scene-close", labelKey: "BLANKINHERITANCE.Console.Window.Hub.SceneClose", faIcon: "fa-solid fa-clapperboard", open: () => openSceneCloseDialogue() },
  { id: "induction", labelKey: "BLANKINHERITANCE.Console.Window.Hub.Induction", faIcon: "fa-solid fa-id-card", open: () => openInductionTerminal() }
];

async function buildHubTab() {
  return { tiles: HUB_TILES.map((t) => ({ id: t.id, labelKey: t.labelKey, faIcon: t.faIcon })) };
}

async function buildLogTab() {
  return { entries: formatLogEntriesForDisplay(currentEntries()) };
}

// Each `template` is written as a fully static path literal, one per tab,
// on purpose — matching command-bar.mjs's own ZONE_PARTIALS convention
// rather than computing the path from `t.id`. tier0-architecture.test.mjs's
// "every template an application part names actually exists on disk" check
// only resolves a template string built from TEMPLATE_ROOT plus a literal
// suffix; a computed suffix (formerly `tab-${t.id}.hbs`) reads its own
// unsubstituted placeholder text and always fails, found live 2026-09-17
// running that suite. (This comment deliberately avoids writing that exact
// backtick pattern itself, which the same regex-based check also matches.)
const SHEET_TABS = [
  { id: "overview", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Overview", faIcon: "fa-solid fa-id-badge", template: `${TEMPLATE_ROOT}/tab-overview.hbs`, build: buildOverviewTab },
  { id: "skills", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Skills", faIcon: "fa-solid fa-bullseye", template: `${TEMPLATE_ROOT}/tab-skills.hbs`, build: buildSkillsTab },
  { id: "strikes", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Strikes", faIcon: "fa-solid fa-burst", template: `${TEMPLATE_ROOT}/tab-strikes.hbs`, build: buildStrikesTab },
  { id: "spells", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Spells", faIcon: "fa-solid fa-wand-sparkles", template: `${TEMPLATE_ROOT}/tab-spells.hbs`, build: buildSpellsTab },
  { id: "gear", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Gear", faIcon: "fa-solid fa-briefcase", template: `${TEMPLATE_ROOT}/tab-gear.hbs`, build: buildGearTab }
];
const DIRECTOR_ONLY_TABS = [
  { id: "party", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Party", faIcon: "fa-solid fa-people-group", template: `${TEMPLATE_ROOT}/tab-party.hbs`, build: buildPartyTab },
  { id: "hub", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Hub", faIcon: "fa-solid fa-grid-2", template: `${TEMPLATE_ROOT}/tab-hub.hbs`, build: buildHubTab },
  { id: "log", labelKey: "BLANKINHERITANCE.Console.Window.Tab.Log", faIcon: "fa-solid fa-clipboard-list", template: `${TEMPLATE_ROOT}/tab-log.hbs`, build: buildLogTab }
];

const TAB_TEMPLATES = Object.fromEntries([...SHEET_TABS, ...DIRECTOR_ONLY_TABS].map((t) => [t.id, t.template]));

export class ConsoleWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  #open = false;
  #activeTabId = "overview";

  static DEFAULT_OPTIONS = {
    id: "bi-console-window",
    tag: "div",
    classes: ["bi-console-window-standalone"],
    window: { frame: false, positioned: false },
    actions: {
      toggle: ConsoleWindow.#onToggle,
      switchTab: ConsoleWindow.#onSwitchTab,
      rollCheck: ConsoleWindow.#onRollCheck,
      rollStrike: ConsoleWindow.#onRollStrike,
      castSpell: ConsoleWindow.#onCastSpell,
      openHubTile: ConsoleWindow.#onOpenHubTile,
      selectPartyRow: ConsoleWindow.#onSelectPartyRow
    }
  };

  static PARTS = {
    body: { template: `${TEMPLATE_ROOT}/shell.hbs`, templates: Object.values(TAB_TEMPLATES) }
  };

  get tabs() {
    return game.user.isGM ? [...SHEET_TABS, ...DIRECTOR_ONLY_TABS] : SHEET_TABS;
  }

  /** Same idiom as command-bar.mjs/phone.mjs — persistent chrome mounts into #interface, not document.body. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const tabs = this.tabs;
    const active = tabs.find((t) => t.id === this.#activeTabId) ?? tabs[0];
    this.#activeTabId = active?.id ?? "overview";
    const data = active ? await active.build() : {};
    return {
      open: this.#open,
      isGM: game.user.isGM,
      titleKey: game.user.isGM ? "BLANKINHERITANCE.Console.Window.DirectorTitle" : "BLANKINHERITANCE.Console.Window.PlayerTitle",
      tabs: tabs.map((t) => ({ id: t.id, labelKey: t.labelKey, faIcon: t.faIcon, current: t.id === active?.id })),
      active: { id: active?.id ?? null, template: active ? TAB_TEMPLATES[active.id] : null, ...data }
    };
  }

  static #onToggle() {
    this.#open = !this.#open;
    this.render();
  }

  static #onSwitchTab(_event, target) {
    this.#activeTabId = target.dataset.tabId;
    this.render();
  }

  static async #onRollCheck(event, target) {
    await rollCheck({ actor: resolveActor(), slug: target.dataset.slug, event });
  }

  static async #onRollStrike(event, target) {
    await rollStrike({
      actor: resolveActor(),
      actionIndex: Number(target.dataset.actionIndex),
      variantIndex: Number(target.dataset.variantIndex),
      event
    });
  }

  static async #onCastSpell(_event, target) {
    await castSpell({
      actor: resolveActor(),
      entryIndex: Number(target.dataset.entryIndex),
      spellIndex: Number(target.dataset.spellIndex),
      groupId: target.dataset.groupId
    });
    this.render({ parts: ["body"] });
  }

  static #onOpenHubTile(_event, target) {
    HUB_TILES.find((t) => t.id === target.dataset.tileId)?.open();
  }

  /** A Party row doubles as a token-select shortcut, so clicking a hurt PC on the roster is the same one click as clicking their token would have been. */
  static #onSelectPartyRow(_event, target) {
    const token = canvas?.tokens?.placeables?.find((t) => t.actor?.id === target.dataset.actorId);
    if (!token) return;
    selectCastRow(token.id);
    refreshCommandBar(["right"]);
  }
}

let active = null;

/** Mount the console, or re-assert an already-mounted one — same lifecycle as the command bar and the phone. */
export function mountConsoleWindow() {
  if (!active) active = new ConsoleWindow();
  active.render({ force: true });
  return active;
}

/** Repaint the mounted console in place — cheap, and a no-op render on a closed-but-mounted panel, same as refreshCommandBar. */
export function refreshConsoleWindow() {
  active?.render();
}
