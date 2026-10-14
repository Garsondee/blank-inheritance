# canon

The campaign's story, in one place. Everything the adventure holds about its world, its past and its plans is written
here once; the Casebook, the timeline, Foundry's lore and Claude's context are all made from it. The designs are
`design/story-data-refactor.md` (D047) and `design/plot-timeline.md` (D070).

## The filing rules

Every kind of story material has one home (D070: "strict rules about how to store adventure story elements and ideas,
brainstorming, lore discussions").

| What it is | Its one home | Ink or pencil |
|---|---|---|
| Ingram's words: answers, rulings, lore she states, her edits and notes on the timeline | `decisions/`, word for word, the same turn | the authority |
| A whole document she gives | `sources/` | the authority |
| A fact about the world: a person, place, group, thing, event or piece of history | `world/<entity>.md` | ink or pencil |
| What happens when: Books, chapters, episodes, beats, the order of scenes | `plan/` | ink or pencil |
| Play material: scenes, checks, fights, hazards, objectives | `scenes/`, `challenges/`, `encounters/`, `subsystems/`, `objectives/` | ink |
| A thread or front | `threads/` | ink or pencil |
| A question the table pursues, and the clues that answer it | `questions/` | ink or pencil |
| A decision Ingram still has to make | an `open` fact in the file of what it is about, never a separate list | open |
| An idea, a brainstorm, a "what if", alternatives | `ideas/<topic>.md`, each idea live, parked, adopted or rejected | always pencil |
| A lore discussion | no transcript: what she said becomes a decision, and what Claude proposed becomes pencil facts or ideas, listed in that decision | as its parts |
| Craft, research, the rules mirror | `design/`, `design/research/`, `reference/` | never holds a story fact; may cite canon ids |
| The Casebook, the timeline, told facts, NPC and location story text, Foundry's lore | made from canon, never edited by hand | a copy |
| The old stores: everything outside canon that holds story | where they are, until they move to `quarantine/` | searched for ideas, never cited |

**The rules**, and what holds each one:

1. **One home.** A story statement lives in exactly one place, and everywhere else cites its id. (Citations must resolve.)
2. **Nowhere else.** No story fact goes in `CLAUDE.md`, memory, design documents, `ideas/entries/` (features only, from
   now on), code comments, or the chat alone. A memory may point at canon; it never states a story fact.
3. **The same turn.** When Ingram states lore, its decision record and everything it creates are written before the
   turn ends, and `story check` runs. (`/lore`)
4. **Every item carries** an id, a status and a source, and pencil carries its author (`by:`). (`story check`)
5. **A status rises only by her word:** a decision with `decide` (her words) or `accept` (Claude's, approved) in its
   `## Changes`. Editing an item's words never changes its status. (`story check`)
6. **Rejected stays rejected.** A cut fact or a rejected idea keeps its wording under `retire:`, and nothing may bring it
   back. (`story check`)
7. **Brainstorms and discussions end filed.** A brainstorm ends with its ideas in `ideas/`, each with a state, and one
   line saying where everything went. A lore discussion ends with its decision record. (`/lore`)

## Ink and pencil

- **Ink** is what Ingram has gone through: Episode One and the induction as they stand (D070), and whatever she decides
  from now on.
- **Pencil** (`status: sketch`) is everything else: plans, history and ideas waiting for her to go through them. Her own
  earlier words carry `by: ingram`, and Claude's carry `by: claude`.
- **Pencil may be read, discussed and drawn on the timeline, but play material never cites it.** A scene that needs a
  pencil fact asks her to ink it first.
- **Pencil becomes ink only by her word:** `decide <id>` or `accept <id>` in a decision's `## Changes`. Once the
  timeline page is built, its **Ink it** writes that decision for her.
- **An open fact is neither.** It is a question she still has to answer, wherever it sits.
- **In a world file, ink comes first.** A line `## Pencil` divides the file: below it, only pencil and open facts.

## Old and new

- **Everything in `canon/` is either decided by Ingram or plainly marked as waiting for her.**
- **Everything outside `canon/` is old.** It may be searched for ideas. It may never be cited. When something old is
  needed, it is rebuilt here, and it goes through Ingram's read like anything new.
- **Nothing in `world/`, `plan/`, `threads/`, `questions/`, `ideas/`, `scenes/` or `challenges/` may point at old
  material.** The check enforces it. Decision records are history, and may.

## What lives here

- `decisions/`: one file per decision. D001 to D046 were split word for word from the old LEDGER on 2026-09-27, which
  is now frozen. New decisions start at D047 and have Ingram's words under `## Ingram` (quoted, verbatim), what they
  settle, and a `## Changes` list (below).
- `sources/`: material Ingram gave as a whole document rather than as an answer, such as S001, her First Impact
  dossier as first filed. A source record says where the original is and which parts of it still stand.
- `world/`: one file per person, place, group, thing or event. Each holds **facts**: single statements that are true
  now, each with a status, a source, who in the world knows it, and when the table is told it.
- `plan/`: each chapter's episodes and scenes in play order, with a rough day and time of day and each scene's state;
  `plan/books.md`, the five Books; and the chapters still to come as beats (`chapter-NN.md`, below).
  A scene's row may carry a note after its state: why the table comes to it (Arrive), what the players do (Do or Choose),
  what they learn (Learn) and where it leads (Next), each labelled and separated by ` // `, in plain words. The timeline
  shows it when the scene is selected. A scene of chapter 2 or later has no day (`—`) and sits in its chapter in plan
  order; Book I is planned this way, scene by scene, with the leads of each chapter chosen in any order (D085).
  **The note also routes the scene (D086),** with more labelled parts after the prose, which the Timeline draws as a flow:
  `After: <scene id>, <scene id>, group:<name>` (what it follows; the `episode-` prefix may be left off; with none, it
  follows the row above), `Branch: any order` or `Branch: needs the tug yard ledger` (how the players reach it),
  `Group: <name>` (a name other rows can follow as a whole), `Stack: yes` (many scenes of one group draw as one card until
  opened, for the night's rests), `Kind: plot | downtime | light` (how heavy the scene is: **every row says**) and
  `Fight: yes`. **Two scenes that follow the same thing stand one above the other, and mean the players may take them in
  either order; a scene that follows another stands one column to its right and never overlaps it.** `story check` and
  `test/tier1-timeline-play.test.mjs` fail on an `After:` that names no scene, a cycle, or a row without a `Kind:`.
- `threads/`, `questions/` and `ideas/`: how the story moves through the facts (below).
- `scenes/` and `challenges/`: scenes that have been through the re-read, in the same JSON shape Foundry reads.
  `node tools/story/story.mjs build` copies them into `data/`. **Edit the canon copy, never the `data/` one**: the check
  fails if they differ.
- `objectives/`: what someone in the world asks of the party (design/objectives.md, D057): the giver, their words, every
  part required or optional. `story build` copies them to `data/objectives/`; the scenes carry the chips that give, tick,
  reveal, strike and close them, and `story check` holds them to the rule.
- `encounters/` and `subsystems/`: a scene's fight and its running hazard or clock, rebuilt like its checks (D058), so
  the numbers a scene runs on go through the same read as its words. `story build` copies them to `data/encounters/` and
  `data/subsystems/`; a scene's approval covers them too. One still outside canon is only a note.
- **Generated from canon, never edited by hand** (`story build` writes them, `story check` fails if they are stale):
  `data/campaign/told-facts.json` (what a scene tells the table, for the Scene Runner's "the table knows" drawer) and
  `data/campaign/open-decisions.json` (every open fact, for the Approvals Desk's count of what is still Ingram's: she
  answers them on the timeline's Decisions view, and the old `open-questions.json` keeps only design and mechanics
  questions, the story ones closed there with a pointer to the fact they became; D079) and
  `data/campaign/actor-notes.json` (what each NPC's Actor sheet says: the person's settled facts, told or held back, their
  open decisions flagged and a count of pencil never written out; an NPC file's `canon` field says which entity, or which
  person inside a group entity, is theirs; the NPC files carry no story prose since D080, and their old `description`s
  are in `quarantine/data/npc-descriptions.json`).
- `scenes/<id>.reread.md`: the record of each scene's re-read: every question, the answer, and what changed.
- `reread.md`: the questions every scene is re-read against. It grows whenever Ingram's reading finds something it
  should have caught.

## A fact

```
## founders.level
The four founders are level 15: impossibly powerful against a level-1 party.
status: decided · source: D047 · known: nobody · told: later
```

The heading is the fact's id: the file's own id, a dot, and a short slug. Then the text, one or two plain sentences,
present tense, no history. Then one line of details:

- **status**: `decided` (Ingram decided it), `accepted` (Claude proposed it and she approved), `proposal` (Claude's,
  inside material she is reading now, such as a scene waiting for her read), `open` (a question: list `candidates`
  and `decide-by`), `provisional` (in a scene that hasn't passed her read yet), `sketch` (pencil: not yet gone through,
  below the file's `## Pencil` line, with `by: ingram` or `by: claude`), or `cut` (kept only so its wording can't come
  back: list it under `retire`).
- **by**: on a sketch, whose words it is: `ingram` (it restates her words in the decision it cites) or `claude`.
- **source**: the decision (`D047`) or source record (`S001`) behind it or, for provisional facts and proposals, the
  canon scene it comes from. A fact keeps every detail of the words it comes from: split it into several facts rather
  than summarise.
- **known**: who in the world knows it: `everyone` (common knowledge in Kurose), `some`, `few` or `nobody`.
- **told**: when the table hears it: `start` (from Scene 0), `in:<scene id>`, or `later` (not scheduled yet). The two
  are separate because something everyone in Kurose knows can still be held back from the players (D048). A beat may
  only tell the table what is told by that scene.
- **held-by**, **true**, **truth**: for a belief rather than a fact, such as the city's view of the founders' painting.
  `true: no` or `true: partly` must link the truth.
- **when**: for events, roughly when, in plain words (below).
- **payoff**: on a planted fact, the fact it pays off. The plant's `told` is where it is planted, and the payoff's
  `told` is where it pays off; the check warns when a payoff comes before its plant.
- **threads**: the threads a fact belongs to, beyond its own entity's.
- **from**: on imported pencil, the short key its import record resolves to where it came from.

`## Notes` in a world file is free text (how someone talks, how to play them). It isn't checked line by line.

## When

Dates are plain words, counted from Day 1 of intake. The present year is 4921 AR (D070).

```
when: about 200 years ago                              a rough point
when: 44 to 40 years ago                               a span
when: about 1000 years after generation-ship.crashed   hung from another fact: it moves with it
when: day 1, late morning                              Episode One, with the plan's times of day
when: chapter 6, late        when: book iv             the campaign ahead, by play order
when: about 15 years ago | about 1 year ago            an open fact: one date per candidate
when: 4721 AR                                          a year (4721 AR is exactly 200 years ago)
```

Units are days, weeks, months and years. The check reads every `when` and follows every anchor.

## Threads, questions, ideas, Books and beats

Every one of these carries a status line like a fact's (`status`, `by` on pencil, `source`), and pencil may be any of
them.

A **thread** (`threads/<id>.md`): a storyline, or a front (a force with its own impulse and an end it is heading for).
A fact joins it through its entity, or through `threads:`.

```
# Manako and Cicada
kind: front
lane: people · order: 2 · entities: manako, cicada
impulse: To be believed: make the city look up and see what is in its sky.
doom: The city sees it, and the thing in it learns what being seen is worth.
intensity: 1 1 2 2 | 3 4 3 4 | 5 4 5 5 | 4 5 5 | . . . . .
status: sketch · by: claude · source: D071

## Clock · Cicada goes public
- cicada.violet-marks
- beat--police-clash
```

`kind` is `front` or `thread`. `lane` is the strand the timeline reads the thread in (D086): `watcher`, `cicada`, `crime`,
`city`, `directorate`, `mitflits` or `past` (or `play` for the party itself, which is "At the table" and has no strand). A
world file's head may say `lane:` too, for a person or place no thread holds; otherwise an entity follows the first thread
that lists it, then its kind. `intensity` (optional) is the rise and fall, one value per chapter from 0 to 5, grouped
by Book; `.` is not sketched yet. A clock's steps are facts, beats or scenes; a step fills when it is told or played.
A `## By Book` section says what the thread does in each Book, one `- I: ...` line each.

A **question** (`questions/<id>.md`): what the table wonders, its answer, the belief that misleads, and the roads to
it. A road is one of the six kinds of clue (physical, testimony, absence, anomaly, pattern, corroboration); the `core`
road must reach the table and is never behind a roll. Inside the current Book the check asks for three roads, of more
than one kind, never a pattern clue alone, one of them core, and none told after the answer.

```
# Who wrote Cicada?
answer: manako.cicada
misdirect: cicada.leaderless
raised: in:episode-c1e1--the-errand
answered: in:chapter-12
status: sketch · by: claude · source: D071

## Roads
- core · physical · manako.part-number-hand
- testimony · manako.disgrace-records
```

A road is a fact, or a beat (a moment the table lives through, such as a fight that opens against their own plan).

An **idea** (`ideas/<topic>.md`): a brainstorm, a "what if", an alternative. Always pencil, never a fact.

```
## idea--the-donors-raid
A raid threatens one of the mayor's donors, and the mayor quietly asks the party to look the other way.
status: sketch · by: claude · source: D068 · state: live · threads: city · when: book ii
```

`state` is `live`, `parked`, `adopted` (with `became:`, the facts or beats it turned into) or `rejected` (with
`retire:`, the wording that must not come back).

The **Books** (`plan/books.md`): `## Book I · Grunt Work`, then `- label: words` rows, its words, and a status line
ending `chapters: 1 to 4`. Together they cover every chapter from 1.

A **chapter still to come** (`plan/chapter-NN.md`): a header, then its beats under `## Beats`.

```
# Chapter 6 · The Show
book: II · rank: Duty Section, Clearance 2 · status: sketch · by: claude · source: D071
Kiri's show: a whole hall looks up through treated lenses.

## Beats

### beat--the-sky-full-of-eyes
Through the lenses the audience sees the sky over Kurose black with eyes on stalks.
status: sketch · by: claude · source: D071 · kind: reveal · pace: down · threads: watcher
```

A beat's `kind` is `event`, `reveal`, `choice`, `flashback` or `end`; its `pace` is `up`, `down` or `lateral` (the
sawtooth). Beat ids carry no chapter, so moving a beat is a cut and paste. `fork: yes` marks one of the campaign's real
branches. `reveals: <fact id>` says the beat is where the table would learn an ink fact still `told: later`: a sketched
plan never edits an ink fact, so it points at it from here instead. `scene: <plan scene id>` (the `episode-` prefix may
be left off) says which scene of the chapter the beat happens in, and the timeline sets its note under that scene's card;
`story check` refuses a scene that is not in the plan, or is in another chapter, and a beat with none (a flashback
between chapters) is "somewhere in the chapter". A chapter with no scenes planned yet is drawn as one card. A chapter may end with `## Notes` for the GM. A fact may be `told: in:chapter-06` or
`told: in:beat--the-sky-full-of-eyes`: play order runs chapter by chapter, through each chapter's scenes, then its beats.

## A decision's Changes

One line per item: `- verb \`id\``, then any words. The verbs: `add`, `change` (words or details, never the status),
`cut` (to `cut`), `accept` (to `accepted`), `decide` (to `decided`), `open` (to `open`), `resolve` (an open question
answered), `pencil` (to `sketch`), and `approve <scene> hash <hash>`. The latest decision about an item sets the status
it must have, so no status changes by hand.

A decision is Ingram's words by default. Three other kinds say so in a line under the title:

- `kind: import`: Claude's record of material brought into canon as pencil (its `add` and `pencil` lines only). It
  needs no quotes and is never authority for ink.
- `kind: merge`: Claude's record of pencil pieces of one thing made one (`tools/story/merge.mjs`, D080). It has no
  quotes, is never authority for ink, and its only Changes verb is `merge <kept id> ← <the pieces>`. Each merge keeps
  every original section and every line it rewrote, so it undoes exactly; never edit one by hand (the pre-edit hook
  refuses). The merged item keeps every source and `from:` key of its pieces, and an older record that names a piece
  still finds it, through the merge's alias.
- `kind: timeline`: one day of Ingram's edits on the timeline page, each quoted as she set it (a word changed, a field
  set, inked, cut, parked, back to pencil, a note for Claude). Only the page writes one: never edit it by hand (the
  pre-edit hook refuses), and `story check` fails on any line it can't read back. It is her words, so it is authority
  for what she inks; every item she touches cites it. Nothing older may come back over what she set there: the check
  fails on it, and `story restore` puts hers back.

## A scene's beats

Each beat lists `facts` (what it tells the table) and `gmFacts` (what its GM notes rely on). The check makes sure
every one exists, isn't cut, and, for `facts`, that the players may know it by this scene.

## How a scene is approved

1. Claude writes or edits the scene in `scenes/`, re-reads it against `reread.md`, records the re-read in
   `scenes/<id>.reread.md`, runs `story build` and `story check`, and marks it `awaiting-read` in the plan.
2. Ingram reads all of it, in the Casebook.
3. Her changes go into the scene. Anything the re-read should have caught goes into `reread.md`.
4. When she says it's good, a decision records her words and `approve <scene id> hash <hash>` (from
   `story digest <scene id>`), and the plan marks the scene `approved`. From then on, any change to the scene or its
   challenges shows up as needing her read again.

## Tools

```
node tools/story/story.mjs show <entity>     every fact about it, and where each is used
node tools/story/story.mjs where <fact>      every line that relies on one fact
node tools/story/story.mjs check             every rule (also run by test/canon.test.mjs)
node tools/story/story.mjs apply <Dnnn>      a decision's changes, checked, with every line they touch
node tools/story/story.mjs build             copy canon scenes, challenges, objectives, encounters and subsystems into data/
node tools/story/story.mjs time              "yesterday", "this morning" etc. per scene, beside the plan's day and time
node tools/story/story.mjs digest <scene>    what a scene tells the table and relies on, with its hash
node tools/story/story.mjs context <id>      everything canon holds about one thing: ink, open, pencil, her words,
                                             where it's used, what the table knows, what must never be said
node tools/story/story.mjs brief <chapter|scene>   what to tell, plant and hold back there, and what's still open
node tools/story/story.mjs when              the whole timeline as text, era by era
node tools/story/story.mjs health            what needs attention before the table reaches it
node tools/story/story.mjs edit <id> <field> <value>        change one detail (`text` for its words); never the status
node tools/story/story.mjs ink <id> <Dnnn> decide|accept    pencil to ink, by a decision in Ingram's words
node tools/story/story.mjs pencil <id> <Dnnn> ingram|claude ink to pencil, by a decision
node tools/story/story.mjs note [Nn --reply "..." | --done] her notes from the timeline, and the answer to one
node tools/story/story.mjs restore           put back what she set on the timeline wherever older words came back
node tools/story/merge.mjs check <proposal.json...>   which merges would pass the rules, and why the others would not
node tools/story/merge.mjs apply <proposal.json...>   make the ones that pass, in one `kind: merge` record
node tools/story/merge.mjs list              every merge on record, live or undone
node tools/story/merge.mjs undo <D081#M3|D081>   put the originals back exactly as they were
```

**A merge** (D079, D080) makes one item of pencil pieces that were one thing, so the pencil is a manageable amount to go
through. The rules the tool holds: only pencil in one file (never ink, an open decision or a cut item); the pieces
agree on who wrote them, who in the world knows them, when the table is told, and on payoff; their `when` is the same or
only one has one; her own words are only ever joined as she said them, never reworded; the merged words keep every
number, name and quoted phrase and nearly all the other words; nothing she has edited, parked or left a note on is
merged away; no scene, check or objective names a piece. Where two items disagree it is a conflict for her, never a
merge. The timeline page shows each merge under its item (the pieces as they were) and in the Merges list, with
**Looks right**, Edit and **Undo this merge**; her choice is quoted in her day record.

**A card** (D083) groups pencil facts about one thing without changing any of them: it is a `## Cards` section at the END of
an entity's world file (`### Title`, then one `- entity.fact-id` line per member). Every fact keeps its own id, words,
author, who knows it, when the table is told and sources, so a card can't lose anything and removing it restores the
file; the check refuses a member that isn't a pencil fact of that file, a fact in two cards, or a title that is a claim
(a title is a label: at most nine words, no full stop). A fact that is inked or merged away drops out of its card (a
merged item takes its pieces' place, and undoing the merge puts the pieces back). The timeline page shows an entity's
pencil by card and `story context` prints it by card. `node tools/story/cards-write.mjs <spec.json>` writes them, and
proves the file outside the section is byte for byte what it was. New pencil goes loose until it is filed in a card.

`npm run timeline` opens the whole story as one horizontal timeline on http://localhost:4193/, following canon as it
changes (`design/plot-timeline.md`). It is also where Ingram edits: words and fields in the inspector, Ink it, Cut,
Park, notes for Claude, pencil dragged along time, undo, and going through the pencil one item at a time; each save
goes into that day's `kind: timeline` record. `npm run timeline -- --sandbox` is the same page on a scratch copy of
canon, to try it without touching the real one; `npm run timeline -- export` makes the read-only copy for claude.ai,
and `npm run timeline -- copy` shows that copy locally as claude.ai serves it.

**When she has edited on the timeline**, the conversation's start says so; read her day record (it is how she
writes), answer her notes with `story note`, and if the pre-edit hook stops an edit because she just changed that
file, re-read it and make the edit on top of hers.

**Read `story context` before writing anything about a person, place, thread or chapter**, instead of searching: it
is everything canon holds, in the order to trust it. Every change to canon's story files goes through
`tools/story/edit.mjs` (the commands above, the timeline page, the import), which touches only the lines it changes.
