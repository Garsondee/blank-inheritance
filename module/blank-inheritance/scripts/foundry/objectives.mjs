/**
 * Objectives — the wiring (design/objectives.md, D057). Three calls from the module's entry point:
 *
 *   registerObjectives()   init: the tracker's client settings, the O and J keys, and the hooks that keep the tracker,
 *                          the Journal and the harvest export current
 *   startObjectives()      ready: the GM's client makes sure the entry exists (and repairs page ownership); every
 *                          client mounts the tracker
 *   remountObjectives()    canvasReady: the tracker re-asserts itself, as the deck and the rail do
 */

import { MODULE_ID } from "../core/objectives.mjs";
import { ensureObjectives, objectivesEntry, onObjectivePageCreated, scheduleObjectivesExport } from "./objectives-store.mjs";
import { mountObjectivesTracker, refreshObjectivesTracker, registerObjectivesTrackerSettings, SETTING_SIZE } from "./objectives-tracker.mjs";
import { refreshJournal, toggleJournal } from "./journal.mjs";
import { nextSize } from "../core/objectives.mjs";

const isObjectivePage = (page) => Boolean(page?.parent) && page.parent === objectivesEntry();

export function registerObjectives() {
  registerObjectivesTrackerSettings();

  game.keybindings.register(MODULE_ID, "objectivesSize", {
    name: game.i18n.localize("BLANKINHERITANCE.Objectives.KeySize"),
    editable: [{ key: "KeyO" }],
    onDown: () => {
      const size = game.settings.get(MODULE_ID, SETTING_SIZE);
      game.settings.set(MODULE_ID, SETTING_SIZE, nextSize(size));
      return true;
    }
  });
  game.keybindings.register(MODULE_ID, "journal", {
    name: game.i18n.localize("BLANKINHERITANCE.Journal.Keybinding"),
    editable: [{ key: "KeyJ" }],
    onDown: () => {
      toggleJournal();
      return true;
    }
  });

  const changed = (page) => {
    if (!isObjectivePage(page)) return;
    refreshObjectivesTracker();
    refreshJournal();
    scheduleObjectivesExport();
    // the GM's board in the Console (lazy: the Console imports half the module)
    if (game.user.isGM) import("./console-window.mjs").then((m) => m.refreshConsoleWindow()).catch(() => {});
  };
  Hooks.on("createJournalEntryPage", (page) => {
    if (isObjectivePage(page)) onObjectivePageCreated(page);
    changed(page);
  });
  Hooks.on("updateJournalEntryPage", changed);
  Hooks.on("deleteJournalEntryPage", changed);
  // The notebook's people and the Papers feed the Journal's other tabs.
  Hooks.on("updateJournalEntry", () => refreshJournal());
  // A fight folds the tracker to its tab, and it comes back after.
  for (const hook of ["combatStart", "updateCombat", "deleteCombat"]) Hooks.on(hook, () => refreshObjectivesTracker());
  // A deadline's chip warms with the world's clock.
  Hooks.on("updateSetting", (setting) => {
    if (setting?.key === `${MODULE_ID}.campaignMoment`) {
      refreshObjectivesTracker();
      refreshJournal();
    }
  });
}

export async function startObjectives() {
  if (game.user.isGM) await ensureObjectives();
  mountObjectivesTracker();
}

export function remountObjectives() {
  mountObjectivesTracker();
}
