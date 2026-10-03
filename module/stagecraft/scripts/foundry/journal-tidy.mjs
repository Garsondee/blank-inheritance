/**
 * The chalk is kept in a journal entry (chalk-store.mjs), because that is the one place Foundry lets every player write
 * and every client read, and it survives a reload. The table did not make it and should not meet it: its pages are
 * named after scenes and hold nothing a person can read. So it is left out of the Journal list for players. A GM still
 * sees it (to look, or to delete it, which clears every wall).
 */

import { NS } from "./scene-data.mjs";

/** Take the chalk entry out of a rendered Journal list for anyone who is not a GM. Returns how many rows it removed. */
export function tidyJournalDirectory(application, element, { user = game.user, journal = game.journal } = {}) {
  if (user?.isGM || !element?.querySelectorAll) return 0;
  const entry = journal?.find((e) => e.getFlag(NS, "chalk") === true);
  if (!entry) return 0;
  const rows = [...element.querySelectorAll(`[data-entry-id="${entry.id}"]`)];
  for (const row of rows) row.remove();
  return rows.length;
}

export function hideChalkJournal() {
  Hooks.on("renderJournalDirectory", (application, element) => tidyJournalDirectory(application, element));
}
