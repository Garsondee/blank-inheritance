# The party notebook

*Written 2026-09-29, built and verified the same day. A shared place where the whole table writes at once.
Companion to [`theatre-of-the-mind-staging.md`](theatre-of-the-mind-staging.md) (the stage the people appear
on) and [`foundry-technical-reference.md`](foundry-technical-reference.md) (the Foundry facts it stands on).*

---

## 1. What was asked

Ingram, 2026-09-29, verbatim:

> *"First of all Foundry VTT has very strong and working way to make EVERYTHING accessible to the people
> who are allowed to access it. It has a very strong ownership system so what you've discovered is a flaw
> in our system not a bug in Foundry. We need to work with Foundry and it's systems to make everything the
> appropriate level of access, even changing that access when players should newly be able to access
> something or check something."*
>
> *"You know what would be genuinely a great and useful feature. A shared note taking app which can be
> summoned by clicking on a portrait and which allows any player to write or edit notes on any NPC. The
> idea being that we allow players to add notes during the session to encourage them to use the in engine
> interface for note taking which means that notes are always where they need to be. If Taka turns up
> someone could write a fun note about them and write down what they think they are doing, then when Taka
> turns up in a later scene his notes from previous sessions are there for players to read. This involves
> creating a note making app that allows a whole group to write at once so it's not a small feature but I
> think it has huge value. We should go further, we should put a 'note' button for players to use on their
> UIs and make this a combined note taking space which players can use to write into with the ability to
> create articles easily."*

Two things follow, and they are the whole design:

1. **Access is Foundry's own ownership system, and it is granted when the table newly gains a reason to
   have it.** (§2)
2. **One shared notebook**, opened from a portrait or a Notes key, where several players write in the same
   page together, with a page for everyone the party has met and articles anyone can start. (§3 to §6)

---

## 2. Access: ownership is the model

The notebook is **one Foundry `JournalEntry` whose default ownership is OWNER.** That single field is the
whole access rule:

| Who | What Foundry then lets them do |
|---|---|
| Every player | read, edit, add a page, delete a page (a page's own ownership inherits the entry's) |
| The GM | the same, and repair the entry |

Because Foundry's own document permissions carry it, there is nothing of ours to keep in step. Change the
one field and every open client changes with it, live (proven, §7).

**Access is granted at the moment someone is met.** A person's page does not exist until the stage
reveals them. The GM's client watches the stage's *published* cast (never the concealed one) and creates a
page for each NPC newly revealed. Its title is whatever the table currently calls them
([`design/theatre-of-the-mind-staging.md`](theatre-of-the-mind-staging.md) §12.2), and the moment the table
learns a name the page is retitled. So a note written about "the attendant" is still there, under her real
name, when the table learns it. A concealed person is never given a page, and clicking the Director's ghost
frame of one is refused with a notice.

**Backfill is limited to what the table can see.** At GM login the stage the table is looking at (the active
scene) gets its pages, for a world where people were staged before the notebook existed. Other scenes'
published casts are deliberately not swept up: they hold whatever a past session or a test run left, and a
page is visible to every player, so a person could appear in front of the table before they are met in the
story. Everyone else gets a page when they are next revealed, or on the first click on their portrait.

**The admin reset clears the notebook by default** (its pages are about the run being thrown away, and a
test NPC's page would otherwise sit in front of real players), with the snapshot keeping every page whole so
"Undo the last reset" puts them back with their own ids (verified live). The entry itself always stays.

**The login repair.** At every GM login the entry is checked and put back: default OWNER, and any per-user
entry below OWNER (which would quietly lock one player out) raised to OWNER. Verified live by breaking it
(`default: 1`, one player at 0) and watching that player's open client regain edit at once. Foundry
refuses the `-=` key-deletion syntax on the ownership field, so the repair raises levels rather than
deleting keys.

**The caveat that stays true.** Ownership decides what a user may *do*. It does not decide what their
browser is *sent*: a Player-role client held every NONE-ownership document in full (foundry-technical-
reference.md, GitHub #212). So nothing secret is ever written into the notebook, and nothing here relies on
a document being hidden. That is by design: the notebook is the table's own shared writing.

---

## 3. The pieces

| Piece | File | Role |
|---|---|---|
| Rules | `scripts/core/notebook.mjs` | The shape of a page, the index (grouped, filtered, searched), which pages the stage should create or retitle, who may delete what, the ownership repair, the harvest export. Pure, no Foundry. |
| Documents | `scripts/foundry/notebook-store.mjs` | Reads and writes the entry and its pages; the sheet guard; the export. Safe to import without Foundry. |
| The window | `scripts/foundry/notebook.mjs` | The ApplicationV2 window, the N key, the hooks. |
| Templates | `templates/notebook/index.hbs`, `editor.hbs` | Two parts. |
| Look | `styles/bi-notebook.css` | Steel index beside ruled paper written in blue pen, on the campaign's tokens and its handwriting face. |
| The stage | `scripts/foundry/stage.mjs` | Syncs people pages after every stage write; a portrait opens the notebook. |

**Data.** A page is a text `JournalEntryPage` with `flags.blank-inheritance.notebook = { kind, subject?,
img?, author? }`.

- `kind` is `person` (made by the stage), or one of `place`, `clue`, `plan`, `note` (started by a player).
- `subject` (a person page) is the stage's **published portrait id**, which every client already has. It is
  never an npc id, so a protected person's page carries nothing the stage does not.
- A person page's id is derived from its subject, so the GM's sync and a player's click racing to make it
  can only ever make one.

---

## 4. Using it

- **Click a portrait.** The notebook opens on that person's page: the whole table's notes about them from
  every session so far, and a place to add more. The Character Card is still one key away (the frame's Card
  key, and a button in the page header for anyone with a sheet).
- **The Notes key** on every player's deck (between Gear and Comms), **the N key** for anyone, and the
  **Palette** ("Notebook") for the GM. The Director's deck is deliberately left alone: a seventh key pushed
  its last one off the row (found live).
- **New article** starts a page titled "Untitled note" with the title selected. Retitle it, file it under
  Place, Clue, Plan or Note, and write. A person's page is titled by the stage and cannot be retitled by
  hand.
- **The index** groups pages by kind, most recently written first, with a search over titles and text and
  filter chips whose counts stay honest for the whole notebook.
- **Deleting** is offered to whoever wrote an article, and to the GM for anything; a person's page belongs
  to the table.

---

## 5. Writing together

The writing is Foundry's own collaborative ProseMirror element (`<prose-mirror collaborate>`), the same
markup Foundry's journal pages use. Several players type in one page at once, see each other's changes
within a second, and see who else is in the page (the badges in the editor's menu). Three things had to be
built around it, each learned from source and then proven live:

1. **The page's own sheet is guarded.** Every incoming step calls `page.sheet._onNewSteps()`, which reaches
   for `this.form`, undefined for a sheet that was never opened, so it throws before the step is applied.
   Hosting the editor in our own window means that sheet never is opened. Without the guard the two
   editors silently drift apart (proven: the GM's editor stopped receiving); with it back they catch up on
   everything missed.
2. **The window saves the page itself.** Foundry's server autosaves a collaborative page only every 30 to
   300 seconds and not when the last editor leaves. The window writes it a few seconds after typing, when
   the page changes and when it closes.
3. **The editor is its own part.** The index re-renders whenever anyone saves; the editor is rebuilt only
   when the selected page changes. One part would rebuild the editor under whoever is typing.

---

## 6. Where the notes go

- **To the players:** back into the same pages, next scene and next session. A player who loads the world
  fresh sees everything already written (proven live).
- **To the GM and to the writing:** the GM's client files the whole notebook as `storage/notebook.json` a
  few seconds after any change (and when the window closes), where `tools/module-sync/sync-harvest.mjs`
  already pulls the module's storage folder home. It carries each page's title, kind, author, last editor,
  plain text and HTML. It is what the harvest idea
  ([`ideas/entries/player-and-gm-journals-context-ingestion.json`](../ideas/entries/player-and-gm-journals-context-ingestion.json))
  wanted for the shared half: notes are always where they need to be, and they reach the record without
  anyone copying them.
- **The world sync leaves it alone.** It retires only documents carrying both `sourceId` and `sourceHash`;
  the notebook carries only the first, and a test pins that.

---

## 7. Verified live (two seats, one GM and one Player, in the local Foundry, 2026-09-29)

| Check | Result |
|---|---|
| Notebook created at GM login with default OWNER | yes |
| NPC revealed on stage gets a page titled with the table's name for them; a protected person's page carries the alias and the anonymous portrait, no real name | yes |
| Player is OWNER of the notebook and every page; can update | yes |
| Portrait click opens the notebook on that person's page (player and GM) | yes |
| Two people typing in one page, one at each end, at the same moment | both editors identical; saved page holds both |
| Guard removed, then restored | edits stop arriving, then the editor catches up |
| Player starts an article, retitles it, files it as a Clue, writes in it | GM's index updated live without disturbing the page they were on |
| Author sees delete, non-author does not; delete needs a confirm | yes |
| Learning a name retitles the page on both clients; open header follows; notes kept | yes |
| Concealed frame click | refused with a notice; no page |
| Ownership broken (default 1, one player at 0) then GM login repair | fixed; the locked-out player's open client regained edit |
| Notes key, N key, portrait click while already open on another page | all toggle or switch; one editor at a time |
| Admin reset with the notebook option, then "Undo the last reset" | pages emptied, entry kept at OWNER; undo restored both pages with their own ids, kinds and text |
| Fresh load as a player | earlier notes all present |
| Harvest export as the GM | `storage/notebook.json` written with authors and text |
| Deck pill rows, both seats, at 1600 wide | player: five caps inside the row, 13 px apart; Director: unchanged, six, none overflowing |

Found and fixed by looking: index rows centred instead of left-aligned; rows too short for their portraits
(Foundry gives every button a fixed height); the Director's deck overflowing with a seventh key; the header
not following a retitle; a first repair using a syntax Foundry refuses.

---

## 8. Not built, for later

- **Private notes** (one player's own page). Ownership can hide a page from the interface, but not keep it
  off another player's browser (§2), so a private page would need a different mechanism and an honest label.
- **Links between pages** (`[[Kazue]]`), and a "mentions" view.
- **A marker on a portrait** when its page has notes, and a first-line preview on hover.
- **Notes attached to places** on the world map, and to haunts.
- **A note count for the GM's between-session report**, from the export.
- **Undo for a deleted article** (an "archived" state instead of removal).
