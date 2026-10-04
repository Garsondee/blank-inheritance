# Objectives

*First written 2026-09-09 from Ingram's brief and never built. Rewritten and built 2026-10-04 (D057), from her second
brief and the plan she approved ("Go with your recommendations and start building"). The plan, with mockups, is the
artifact "Blank Inheritance Objectives".*

---

## 1. What was asked

Ingram, 2026-10-04, with a screenshot of a spy game's objectives screen:

> "It would be really nice to give the players a way to track their objectives (and write their own on a per group and
> / or per character basis. … Ideally the objectives would be visible in the players view for every scene, with the
> ability to fold them away so they are tiny, fold them out so they are a single line for major objectives and then
> fold further out to give much better explanations of what is needed. … the whole of Episode 1 might only have three
> objectives for the group. Objectives must follow a strict RP rule, they must be given by someone, with an objective
> which makes sense from that person's perspective and they must clearly show which things are requirements and which
> are just optional. Make it pretty too, with a separate button for bringing up a bigger 'Journal' page."

From 9 September, still true: *"This is both a guiding principle for how to design objective arcs but also provides a
summary history of the whole adventure as the group progresses through it."*

---

## 2. The rule

**Every objective is given by someone in the world, in their own words, makes sense from their side, and marks every
part required or optional.** The rule is enforced three ways: by `story check` for authored objectives (§7), by the
form for players' own (§5), and by two Sign-Off checks for the scene that gives one (M28, M29).

**Three kinds, by who gave it.** The kind is shown as a stamp, in words too.

| Mark | Kind | Means |
|---|---|---|
| 命 | Order | The chain of command. A **direct** order (given in person by a superior) says so and prints what refusing it costs, in the Deputy Director's words (D053). Refusing becomes a choice the table can see it is making. |
| 頼 | Request | Anyone else asked. It can be turned down. |
| 志 | Own | A character decided it. Their player wrote it. |

**Parts.** ◆ **Required**: what the giver needs done; only these count towards progress. ◇ **Optional**: would please
them, or is a better way; always labelled OPTIONAL in words, never blocks. A part can carry whose idea it was when that
isn't the giver ("Manako's idea"). A part can be **hidden** until revealed, **struck out** when the table learns it
cannot be done (with why), or **earned** by a roll.

**Typed lines came from the story; handwritten lines were written by players** (visual-identity.md's "a person wrote
it" register).

**What optional parts pay (D057 §6):** only what the giver says or implies, plus a step of attitude with a regular
through the existing ▲▼ (design/haunts.md). No hidden XP: accomplishments stay in their scenes. Shucks's 30 XP for
noticing all six were flagged can never be an objective, because it is for working it out unprompted.

**An objective never decides a choice.** It says what was asked, never how (The Errand's quiet-or-loud filing is the
table's).

---

## 3. The tracker

On every screen, top right, left of the sidebar and of the chat pop-up column (the session rail's edge rule), and for
the GM under the rail. Three sizes, by its switch, a click on its title, or **O**:

- **Folded**: a tab: a lamp, OBJECTIVES, how many are open, the tracked one's deadline.
- **One line each**: mark, title, progress pips (required parts only), deadline chip.
- **Explained**: each one with its giver, their quoted words, every part with what is needed, and a direct order's
  cost.

It shows **the section's objectives and the player's own character's**; everyone else's are in the Journal. The GM's
tracker shows all of them. **One tracked**, amber, first: the player's choice (click a line, or T in the Journal), else
the section's soonest deadline. **New things glow, nothing pops up**: the lamp lights and up to two ribbons say what
happened (new, updated, done), for twelve seconds, then the player has seen it (doctrine Law 14). **A fight folds it to
the tab** and the chosen size comes back after (Laws 6, 13). **Deadlines run on the world's clock** (the orb's Day N ·
quarter): the chip turns solid when that quarter arrives (Law 19). Hidden until the first objective exists. Each
player's size, tracked objective and last look are client settings, so they are their own and a reset never touches
them. Stagecraft keeps cards clear of it (the bridge's cover list).

Code: `scripts/foundry/objectives-tracker.mjs`, `templates/objectives/tracker.hbs`, `styles/bi-objectives.css`.

---

## 4. The Journal

A bigger window, from the player's deck (the **Journal** key, the sixth: 231 of 252 px), **J**, the tracker's own J,
and the GM's Palette. It borrows the reference's arrangement: tabs across the top (**Q** and **E** between them while
it is the window in front, caught before Foundry's own Q and E), the objective's name large on the left with its parts
beneath, the detail on the right with the giver's words as a slip of paper, and 以上 with the Directorate's mark at the
end of an order's brief.

- **Objectives**: the section's, yours, and the others' (shown unless "only me"). The detail: giver, their words, what's
  needed, a direct order's cost, what we've learned (the log), Track this, and **Our plan for it**, which opens a plan
  page titled after it in the party notebook: the table's thinking lives where notes already live. A player ticks,
  closes and deletes their own; only the GM changes a given one (D057 §8).
- **Papers**: every handout this player holds (design/handouts.md), as a shelf.
- **People**: the notebook's person pages as faces, with what each person gave; a click opens their notebook page.
- **Record**: each closed objective as its paragraph, oldest first, on paper; then the **loose ends**: optional parts
  still open when their objective closed (Manako's "come back and say how it went" lands here, D057 §7).

Code: `scripts/foundry/journal.mjs`, `templates/journal/journal.hbs`.

---

## 5. Writing your own

In the Journal, **＋ Write your own** or **W**. A ruled page in blue pen. It asks **who wants this** (anyone met, one of
the party, or the writer's own character), **what they said**, **why, in their eyes**, then **what must be done** (◆)
and **what would be good** (◇), **by when**, **whose** (mine or Section Nine's) and **who sees it**. It will not file
without a giver, their reason and one required part (`validateDraft`). The writer's own character as giver makes it
Own; anyone else makes it a request, or an order if the player says it was one.

**"Only me" is honest.** Foundry does not let a player set ownership, so the page is created without one and the GM's
client gives it its level as it arrives (and repairs every page at login): hidden from the other players' screens, not
from their browsers (GitHub #212). The form says so. A page filed while no GM is connected is visible until one is.

**The GM's live objective**: the same form from the GM's Journal makes one in seconds (the 9 September design's live
creation), read-only for players like a given one.

---

## 6. How it works with everything else

- **Scene Runner**: one trigger kind, `objective`, with five acts: **give** (◆, asks first, Law 17; a second press
  changes nothing), **tick** (✓), **reveal** (+), **strike** (✕) and **close** (■, asks for the Record's paragraph with
  the authored suggestion already in the box). Each logs only when something changed and fires the existing
  `blankInheritance.triggerFired` hook. A soft cue (Foundry's own interface channel, so each player's volume rules) on
  give and close only (D057 §9). `scripts/foundry/objectives-runner.mjs`.
- **Store**: one JournalEntry, "Objectives" (`sourceId: party-objectives`, no `sourceHash`, so world sync leaves it
  alone), default OWNER so players may add pages; one page per objective, its state in
  `flags.blank-inheritance.objective`, plus a readable copy for Foundry's own journal view. Given pages: OBSERVER.
  `scripts/foundry/objectives-store.mjs`.
- **Nothing secret on a page.** The giver's real want, the notes and any hidden part stay in the data file; a hidden part
  is written onto the page only when revealed (`fromAuthored`, `applyAct`).
- **Admin panel**: "Reset to the start of Episode One" clears every objective (on by default), snapshot first; Undo puts
  them back with their own ids.
- **Harvest**: the GM's client files `storage/objectives.json` 20 seconds after a change. The closing paragraphs and what
  players wrote come home for writing the next episode. Like the notebook, that puts them in the Watcher's reach (D031,
  D037); nothing on screen says so.
- **Deploy**: `data/objectives/` is in `SYNCED_CAMPAIGN_DIRS`.
- **Sign-Off**: checklist v7 adds M28 (the giver is on stage saying it, at the chip) and M29 (every chip sits where it
  happens and reveals no choice early).
- **Not to confuse**: `subsystem.schema.json`'s `objectives[]` is Infiltration's obstacle list, a different thing.

---

## 7. Authoring

An objective is `canon/objectives/<id>.json` (schema `data/schema/objective.schema.json`), copied to
`data/objectives/` by `node tools/story/story.mjs build`. Its scenes carry the chips. `story check`
(`tools/story/objectives.mjs`) holds it to the rule:

- the giver is in the giving scene's cast, or it came on that scene's handout;
- its `said` is word for word in that scene (fragments between " … ");
- every part is marked, at least one is required; a struck part has its note;
- a direct order with a deadline states its cost (Law 19);
- every required part is ticked or struck somewhere, a hidden one revealed somewhere, and it is closed somewhere;
- nothing happens to it before it is given; its words tell only facts that scene may tell;
- `want.motivation` is one of the nine (quests-objectives-and-threads.md §2);
- **no more than four group objectives in one episode** ("we won't do anything silly like an objective per scene");
- given and closed in one scene is flagged: an errand, not an objective.

**A log entry only when the party learns something** (9 September, kept): not when something happens.

---

## 8. Episode One's three (drafts, awaiting Ingram's read)

| Objective | Giver | Given | Closes |
|---|---|---|---|
| Report for enrolment | The Deputy Director, by letter (Form 1-A) | The Road In, with the letter | Kit Issue, when Nobu issues the uniforms |
| Collect the levelling bubble | Section Officer Vetch, direct order, 19:00 | Kit Issue, with the docket | The Tram Back, the requisition in at the hatch |
| Clear the storm drain | Section Officer Vetch, direct order, 21:00 | Canteen | Flood Tunnel Clearance, reporting to Vetch at the top |

The docket's "collect from the instrument makers" is struck in The Errand ("There's nothing in the bubble"), and
Manako's way, a requisition against the docket, is revealed in its place. Personal requests from the night's regulars
(Kaede's knee by dawn) are extra, given live from the haunt panel.

---

## 9. Tests

- `test/tier1-objectives.test.mjs`: the pure rules (`scripts/core/objectives.mjs`).
- `test/tier2-objectives-canon.test.mjs`: every canon rule fires on a broken copy of the real model.
- `test/tier4-objectives.test.mjs`: the store and the Runner's acts against the mock journal, including the ownership
  regression found live.
- `test/tier3-objectives-contract.test.mjs`: the wiring (handlers, mounting, keys, dispatcher, deploy, Stagecraft).
- **Live**: `node tools/objectives/live-check.mjs` drives the local Foundry with a GM and a real player in two browsers:
  19 checks, screenshots in `design/ui/shots/objectives/`. First run, 2026-10-04, found two real bugs (the Journal's
  tab action collided with ApplicationV2's own `tab`; the ownership repair locked a writer out of their own Section Nine
  objective), both fixed and covered.

---

## 10. Not built yet

- The Console's GM board (Just happened, Up next, Might go) and a session-start line on what's open.
- A GM form field for giving a live objective to one character (the GM's form makes Section Nine's).
- Adding a learned line to the log from the Runner (the log is in the state and the Journal shows it; no chip writes it
  yet).
- Linking an objective to the Paper it came on, in the Journal's detail.
- Tagging an objective to a thread (left out: the thread list is outside canon).

*Related: `design/ux-doctrine.md` (Laws 6, 11, 13, 14, 17, 19; §7a for personal missions' visibility),
`design/directorate-discipline.md`, `design/haunts.md`, `design/handouts.md`, `design/notebook.md`,
`design/quests-objectives-and-threads.md`, `canon/decisions/D057.md`.*
