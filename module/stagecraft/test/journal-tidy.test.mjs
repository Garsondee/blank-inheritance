// The chalk journal is the module's, not the table's: players do not meet it in the Journal list; a GM does.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installFoundry, OWNER } from "./fake-foundry.mjs";

const { tidyJournalDirectory } = await import("../scripts/foundry/journal-tidy.mjs");

let world;
beforeEach(() => { world = installFoundry({ user: { id: "p", name: "P", isGM: false } }); });

/** A list of rows like Foundry's Journal directory, each removable. */
function list(...entryIds) {
  const rows = entryIds.map((id) => ({ id, removed: false, remove() { this.removed = true; } }));
  return {
    rows,
    querySelectorAll(selector) {
      const m = selector.match(/^\[data-entry-id="(.+)"\]$/);
      return m ? rows.filter((r) => r.id === m[1] && !r.removed) : [];
    }
  };
}

async function withChalkEntry() {
  return JournalEntry.create({ name: "Stagecraft chalk", flags: { stagecraft: { chalk: true } }, ownership: { default: OWNER } });
}

test("a player does not see the chalk journal in the Journal list, and everything else stays", async () => {
  const chalk = await withChalkEntry();
  const notes = await JournalEntry.create({ name: "Notes", ownership: { default: OWNER } });
  const directory = list(notes.id, chalk.id);
  assert.equal(tidyJournalDirectory(null, directory), 1);
  assert.deepEqual(directory.rows.map((r) => r.removed), [false, true]);
});

test("a GM still sees it, to look at it or delete it", async () => {
  const chalk = await withChalkEntry();
  world.user.isGM = true;
  const directory = list(chalk.id);
  assert.equal(tidyJournalDirectory(null, directory), 0);
  assert.equal(directory.rows[0].removed, false);
});

test("with no chalk journal yet, or no list to tidy, nothing happens and nothing throws", async () => {
  assert.equal(tidyJournalDirectory(null, list("x")), 0);
  await withChalkEntry();
  assert.equal(tidyJournalDirectory(null, null), 0);
  assert.equal(tidyJournalDirectory(null, {}), 0);
});
