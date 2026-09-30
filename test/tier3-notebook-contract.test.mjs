// Tier 3 — the wiring that makes the party notebook work at a real table.
//
// The rules are tested in tier1-notebook.test.mjs. What these read is the glue
// that only real use exposed, each one found or proven live on 2026-09-29 with
// two seats (a GM and a Player) in the local Foundry:
//
//   - the editor is Foundry's own COLLABORATIVE element, so two players can type
//     in one page at once;
//   - the page's own sheet is guarded, or the first edit from another player
//     throws before it is applied (proven both ways);
//   - the index and the editor are separate parts, so somebody else's save never
//     rebuilds the editor under a player who is typing;
//   - access is Foundry's ownership, repaired at login by raising levels (the
//     `-=` deletion syntax is refused on the ownership field);
//   - a person's page follows the stage, a concealed person gets none, and the
//     Director's crowded deck is left alone.
//
// design/notebook.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(moduleRoot, ...parts), "utf8");

const app = read("scripts", "foundry", "notebook.mjs");
const store = read("scripts", "foundry", "notebook-store.mjs");
const stage = read("scripts", "foundry", "stage.mjs");
const main = read("scripts", "blank-inheritance.mjs");
const commandBar = read("scripts", "foundry", "command-bar.mjs");
const palette = read("scripts", "foundry", "director-palette.mjs");
const editorTemplate = read("templates", "notebook", "editor.hbs");
const indexTemplate = read("templates", "notebook", "index.hbs");
const frameTemplate = read("templates", "stage", "frame.hbs");
const identTemplate = read("templates", "console", "deck", "deck-ident.hbs");
const directorTemplate = read("templates", "console", "deck", "deck-director.hbs");
const manifest = JSON.parse(read("module.json"));

test("the editor is Foundry's collaborative ProseMirror element, bound to the page by its UUID", () => {
  assert.match(editorTemplate, /<prose-mirror\b[^>]*\bname="text\.content"/);
  assert.match(editorTemplate, /<prose-mirror\b[^>]*\bcollaborate\b/, "without `collaborate` two players cannot write in one page together");
  assert.match(editorTemplate, /data-document-uuid="\{\{selected\.uuid\}\}"/);
});

test("the page's own sheet is guarded before the editor mounts, and only while it is not open", () => {
  assert.match(store, /export function guardPageSheet\(/);
  assert.match(store, /\["_onNewSteps", "_onAutosave"\]/, "both handlers Foundry reaches for `this.form` in must be guarded");
  assert.match(store, /if \(!this\.rendered\) return undefined/, "an OPEN sheet must keep its own behaviour");
  assert.match(app, /if \(view\) guardPageSheet\(pageById\(view\.id\)\)/, "the guard must be in place before the editor can receive a step");
});

test("the index and the editor are separate parts, and only selection rebuilds the editor", () => {
  assert.match(app, /index: \{ template: `\$\{TEMPLATE_ROOT\}\/index\.hbs`/);
  assert.match(app, /editor: \{ template: `\$\{TEMPLATE_ROOT\}\/editor\.hbs` \}/);
  assert.match(app, /this\.render\(\{ parts: \["index"\] \}\)/, "somebody else's save re-renders the index only");
  assert.match(app, /return this\.render\(\{ parts: \["editor"\] \}\)/, "choosing a page rebuilds the editor only");
  assert.doesNotMatch(app, /refresh\(\)\s*\{[^}]*parts: \["editor"\]/, "a live update must never rebuild the editor");
});

test("the window writes the page itself, because the server autosaves late and not when the last editor leaves", () => {
  assert.match(app, /setInterval\(\(\) => this\.#flush\(\), AUTOSAVE_MS\)/);
  assert.match(app, /prose\?\.addEventListener\("change"/, "the change listener sits on the element, which is what is removed when a page is swapped");
  assert.match(app, /savePageText\(pageId, event\.currentTarget\.value\)/);
});

test("access is Foundry's ownership: one entry at OWNER, repaired at login by raising levels", () => {
  assert.match(store, /ownershipRepair\(existing\.ownership\)/);
  assert.match(store, /JournalEntry\.create\(notebookEntryData\(\{ id \}\), \{ keepId: true \}\)/);
  assert.doesNotMatch(store, /-=/, "Foundry refuses the -= syntax on the ownership field");
});

test("a person's page is derived by id, so the GM's sync and a player's click cannot make two", () => {
  assert.match(store, /deriveFoundryId\(`notebook-person:\$\{subject\}`\)/);
  assert.match(store, /\{ keepId: true \}\);\s*return page \?\? pageForSubject\(subject\)/);
});

test("the stage feeds the notebook from the PUBLISHED cast and never lets it block a stage write", () => {
  assert.match(stage, /syncPeoplePages\(published\)\.catch\(/);
  assert.match(store, /planPersonPages\(people, members\)/);
});

test("the login backfill covers only the stage the table is looking at, never every scene's leftover cast", () => {
  assert.match(store, /export function syncActiveStagedPeople\(\)/);
  assert.match(store, /game\.scenes\?\.active\?\.getFlag\(MODULE_ID, "stage"\)/);
  assert.doesNotMatch(store, /for \(const scene of game\.scenes/, "a scene the party has not reached may hold a test run's cast, and a page is visible to every player");
  assert.match(app, /await syncActiveStagedPeople\(\);/);
});

test("clicking a portrait opens the notebook, and a concealed frame is refused", () => {
  assert.match(frameTemplate, /class="bi-frame__scope" data-action="openNotes"/);
  assert.match(frameTemplate, /data-action="openCard"/, "the Character Card is still one key away");
  assert.match(frameTemplate, /data-concealed="\{\{#if concealed\}\}true\{\{else\}\}false\{\{\/if\}\}"/);
  assert.match(stage, /openNotes: StageOverlay\.#onOpenNotes/);
  assert.match(stage, /if \(concealed === "true"\) \{[\s\S]*?return null;/);
});

test("players get a Notes key on their deck, and the Director's full deck is left alone", () => {
  assert.match(identTemplate, /data-action="openNotebook"/);
  assert.match(identTemplate, /class="bi-deck__pills bi-deck__pills--tight"/, "five pills need the tight row");
  assert.match(commandBar, /openNotebook: CommandBar\.#onOpenNotebook/);
  assert.doesNotMatch(directorTemplate, /openNotebook/, "a seventh pill pushed the Director's last key off its row (found live)");
  assert.match(palette, /id: "panel\.notebook"/, "the GM reaches the notebook from the Palette");
  assert.match(palette, /!j\.getFlag\(MODULE_ID, "notebook"\)/, "the notebook must not be offered as a handout to pop up on every screen");
});

test("the N key, the hooks and the GM's setup are registered", () => {
  assert.match(app, /game\.keybindings\.register\(MODULE_ID, "notebook"/);
  assert.match(app, /editable: \[\{ key: "KeyN" \}\]/);
  for (const hook of ["createJournalEntryPage", "updateJournalEntryPage", "deleteJournalEntryPage"]) {
    assert.match(app, new RegExp(`Hooks\\.on\\("${hook}"`), `${hook} must refresh an open notebook and schedule the export`);
  }
  assert.match(main, /registerNotebook\(\);/);
  assert.match(main, /await startNotebook\(\);/);
});

test("the admin reset clears the notebook and its snapshot and undo bring every page back", () => {
  const actions = read("scripts", "foundry", "admin-actions.mjs");
  assert.ok(
    actions.includes('notebook: options.clearNotebook ? (notebookEntry()?.pages.contents ?? []).map((page) => page.toObject()) : []'),
    "the snapshot must keep every page, whole, when the notebook is cleared"
  );
  assert.match(actions, /async notebook\(\) \{[\s\S]*?deleteEmbeddedDocuments\("JournalEntryPage", ids\)/);
  assert.match(
    actions,
    /await attempt\("notebook", async \(\) => \{[\s\S]*?createEmbeddedDocuments\("JournalEntryPage", missing, \{ keepId: true \}\)/,
    "undo must put the pages back with their own ids"
  );
  assert.doesNotMatch(actions, /notebookEntry\(\)\??\.delete\(\)/, "the entry itself stays: it is the one place every player may write");
});

test("the notebook's stylesheet is registered with the module", () => {
  assert.ok(manifest.styles.includes("styles/bi-notebook.css"));
});

test("deleting is offered only where it is meant, and the confirm names what will go", () => {
  assert.match(editorTemplate, /\{\{#if selected\.canDelete\}\}/);
  assert.match(app, /DialogV2\.confirm/);
  assert.match(app, /foundry\.utils\.escapeHTML\(page\.name\)/, "a page title is player-written and must be escaped in the dialog");
});

test("the index shows a hint for an unopened notebook, an empty one and a search with no matches", () => {
  assert.match(indexTemplate, /Notebook\.NotOpen/);
  assert.match(indexTemplate, /Notebook\.Empty/);
  assert.match(indexTemplate, /Notebook\.NoMatches/);
});
