# The story data refactor, and the scene re-read

*Drafted 2026-09-27 by Claude, at Ingram's request. Ingram answered §14 the same day (`canon/decisions/D047.md`), and
the pilot is running: §16 says what's built. Ingram has paused work in other Claude conversations until this is
settled. Tracked as GitHub #207.*

What Ingram asked, in her words:

> "Are we storing information about the adventure/lore/history/characters etc etc correctly for this sort of work?
> What I want to consider is if there is a better way to work with the story data that would help you to keep all
> the facts and information straight and correct."

> "We're considering a big refactor of how we store the data AND if we do that we have a chance to start with a
> clean copy of that data and build only on the back of good decisions."

> "Can we create a checklist like process to make sure that scenes go through a series of tests where you re-read
> them after you write them and ask yourself simple questions like 'Does this section of the scene actually
> contribute anything useful for the GM running this scene for their players?' Because at the moment we
> accidentally produce scenes which can end up littered with strange artefacts of our current process or produce
> scenes with elements that just don't do anything fun, useful or interesting for either the GM or the players.
> Lots of scenes lack skill rolls and skill rolling is a HUGE amount of the SF2E process, if we don't give the
> players skills to roll then scenes are just conversations... if a scene is a conversation then how much is that
> character going to be willing to say at that point? What questions might the group ask them and how would that
> character respond? We have a scene like the Intake Medicals for example, but this brings up another hole where we
> have a scene but I don't have the NPC stat block for Shucks for example. A scene with a missing NPC means that if
> the group thinks about or does something unexpected I have no stat block to respond with."

**Part A** changes how the story is stored, so its facts stay straight. **Part B** adds a re-read that every scene
goes through after it's written. Part B can start before Part A is finished, and the two are built to work
together.

---

## 1. The evidence

Everything here was measured on 2026-09-27, after seven rounds of editing the Casebook (LEDGER #40 to #46).

**One fact lives in many places.**
- The story is about 1 MB of prose in 31 documents under `ideas/story/`, plus 331 data files that carry GM notes.
- One subject, many retellings: Manako is written about in 55 files, the tea house in 30, Rand in 25, Inert 12 in 11.
- About 140 dated correction notes ("Superseded…", "Rewritten…") are layered into the lore and data, and nearly
  280 "proposal" and "canon" labels are written into the prose itself.
- The node registry, built to stop exactly this, covers 99 items.

**Decisions don't reach everywhere they should.** Every round was carried into the files by hand, and a final
sweep still found stale material in more than 40 files. Roughly half of it couldn't be found by searching for words:
- The Long Afternoon had Manako "there, on a Thursday, exactly as he said he would be". The line he'd said it in
  had been removed from The Errand, and nothing linked the two.
- Episode Two said "a fortnight ago" in three scenes and "yesterday" in another. No file records which day each
  scene happens on, so nothing could catch it.
- Two files still had the mitflits speak of the Observer "flatly and without fear" after LEDGER #40 changed it,
  because the fix had been a note beside the old sentence rather than a rewrite.

**Who decided what gets lost.** After a few retellings, Ingram's words, Claude's proposals and older generated
material all read the same.
- An older lore table had the Sorters "set people down courteously". The twenty-chapter outline's retelling had
  people drowning at the water's edge. Nothing recorded who added that, or whether anyone approved it. Ingram cut
  it in LEDGER #46: "things that LLMs got wrong".
- In round 1 Claude contradicted LEDGER #32, which it hadn't found. It also told Ingram that "magic fading" was its
  own invention, when it came from the v4 bible.

**The files read at the start of every conversation are stale too.** `CLAUDE.md` (71 KB) and the memory index
(19 KB) both retell story facts. `CLAUDE.md` still says Episode Two is a stub with one scene; it has fifteen.

**The lore never reaches Foundry.** The bible, the dossiers and the LEDGER live in `ideas/story/`, which the
deploy doesn't send. Ingram set the finish line for the data-fragmentation crisis on 2026-09-13: one structured
store, uploaded to Foundry and usable inside it. We're not there.

**The built scenes** (Episodes One and Two: 27 scenes, 148 beats):
- 61 distinct checks in total, about two per scene for six players. Three scenes have none.
- 20 NPCs appear in scenes, and none of them has a stat block. None of the 42 NPC files has one.
- 35 fields the GM reads at the table carry leftovers of how we work, in 17 of the 27 scenes: decision numbers,
  "cut on 2026-09-27", "An older version of this note said otherwise", "NOT A PLANT ANY MORE". Some of these Claude
  added this week, while cutting the charter's black bar.
- Speaking NPCs have topics they'll discuss, one they won't, a voice and sample lines. None has a list of the
  questions the party will probably ask, with the answers.

## 2. What works, and stays

- **The LEDGER**, because it keeps Ingram's exact words. It becomes the decision records (§4.1).
- **Editing rounds of four questions.** A good pace, and it forces priorities.
- **The Casebook** as the one readable overview Ingram reacts to. It becomes generated (§4.5).
- **Tests** as the way rules are enforced.
- **The Sign-Off** as Ingram's gate for scenes, and the rule that only drafted content is written until she grades it.
- **The node registry's idea**, that a fact is referenced rather than copied. Canon absorbs it; it doesn't run
  alongside.

---

# Part A. Storing the story

## 3. The idea: four kinds of information, kept apart

Today one document often holds four different things: what Ingram decided, what's true in the world, what happens
at the table, and Claude's suggestions. Each gets its own home:

| Kind | What it is | Where it lives | Who writes it |
|---|---|---|---|
| **Decisions** | Ingram's words, and what they change | `canon/decisions/` | Claude, recording Ingram |
| **Facts** | What's true in the world, as short statements | `canon/world/` | Claude, only from decisions |
| **The plan** | Chapters, episodes and scenes in play order | `canon/plan/` | Claude, as drafts |
| **Play material** | Scenes and challenges, rebuilt one at a time | `canon/scenes/`, `canon/challenges/` | Claude, approved by Ingram's full read |

The tree is `canon/` (`canon/README.md` has its rules). Play material is copied into `data/`, where Foundry reads it,
by `story build`. Everything else is **generated** from these four and never edited by hand (§4.5). "Canon" below means
the facts in `canon/world/`.

This replaces the story stores rather than adding one more: the v4 bible, Chapter One v2, the dossiers, the master
timeline, the bible folder, the story sections of `campaign-arc.md`, the story ideas and the lore library all end
up in canon or in the archive (§6.2).

## 4. The parts

### 4.1 Decisions

One file per decision, numbered as the LEDGER is: `D046.md` is LEDGER #46. The existing 46 entries are split
mechanically, keeping every word.

Each decision records:
- **The question**, in a sentence or two.
- **Ingram's words, verbatim.** The only authority in the whole store.
- **Changes**: the canon facts it adds, changes or cuts, by ID.
- **Claude's readings**: anything Claude proposed while filing it, each as a canon fact with status `proposal`.

Illustrative:

```markdown
# D046 · 2026-09-27 · Rand accepted; the Errand's two places; the Sorters cut

**Asked:** whether people really drown in Chapter 2.

**Ingram:** "That sounds like it's incredibly badly aligned, it sounds like the opposite of what we
want. Look for any and all references and get rid of them, then we'll need to rethink that whole
section / concept."

**Changes**
- cut `watcher.g1-sorters` · never again: "Sorters"
- open `watcher.g1` · decide before Chapter 2 is written (GitHub #206)
- accept `rand.why-it-acts` · proposed in D043
```

A tool reads the Changes list and applies it (§4.6).

### 4.2 Canon

One file per person, place, group, thing or event. Each holds **facts**: single statements that are true now.

**What a fact records:**
- **ID**: `entity.slug`, short and readable, such as `manako.gives-name`.
- **Text**: one or two plain sentences, present tense. No history.
- **Status**:
  - `decided`: Ingram decided it.
  - `accepted`: Claude proposed it and Ingram approved it.
  - `proposal`: Claude's, waiting for Ingram.
  - `open`: a question, with the possible answers and the chapter that needs it decided. Until then it stays quiet
    (LEDGER #42: past Episode Two, answers can wait).
  - `provisional`: in a built scene that hasn't passed Sign-Off.
  - `cut`: kept only as a marker (§4.7).
- **Source**: the decision behind it, a source record (material Ingram gave as a whole document, kept in
  `canon/sources/`), or the built scene it comes from. A fact keeps every detail of the words it comes from; it is
  split, never summarised (D048: the first extraction lost half of the rift).
- **Who knows it, and when the table hears it**: two separate fields, since Ingram's read of Scene 0 held back things
  everyone in Kurose knows (D048). `known` is the world: `everyone`, `some`, `few` or `nobody`. `told` is the table:
  `start`, `in:<scene>`, or `later`.
- **True, or only believed.** Most facts are simply true. Some are beliefs: the Directorate's official line, the
  school textbook's version, what Cicada preaches. A belief names who holds it and links to what's actually true.
  Much of this campaign's mystery lives in that gap.
- **When**, for events: an in-world date (years before the campaign starts) or a campaign day.

**Notes** sit below the facts: how someone talks, how to play them, what they're for. Notes aren't checked line by
line; the section carries one status.

**How big is a fact?** One statement that could be true or false on its own, and that more than one place relies on
or a player could learn. Texture (a tic, the smell of a room) is a note.

Illustrative:

```markdown
# Manako

- `manako.chemist`: He was a Directorate chemist, and he'll say so.
    decided D045 · players: The Errand
- `manako.gives-name`: He gives his real name freely.
    decided D045 · players: The Errand
- `manako.hazed`: The Directorate hazed him the same way when he was new. He came back empty-handed,
  was laughed at, and has spent years thinking about what he should have done.
    decided D045 · players: The Errand
- `manako.number`: A player who impresses him, or is especially kind to him, gets his phone number.
    decided D045 · players: The Errand
- `manako.late-arc`: Where he is in Books IV and V, and whether he's alive.
    open D042 · decide when Book IV is prepared

## Notes
Voice, how to play him, what the scene needs from him. (provisional: The Errand)
```

And a belief, in the Envoy's file:

```markdown
- `envoy.directorate-line`: HELD BY the Directorate: "a cultist was killed during a confrontation in
  which someone magically summoned a monster." Not true; see `envoy.what-happened`.
    decided D035 · players: the records, Chapter 2
```

### 4.3 The plan

Chapters and episodes as outlines: for each chapter, what happens at the table, the choices, what can be found out,
and what the Watcher does. Each step cites the facts it plants or reveals. Casebook version 8 is the seed: its
Chapter 1 follows the built scenes, and its Chapters 2 to 20 are drafts, in which every claim becomes a canon fact,
a proposal or an open question.

The Mystery Ledger's plants and payoffs become two fields on a fact: where it's hinted, and where it's revealed.

**Every scene gets a rough day and time of day in the plan** (Ingram, D047): early morning, morning, late morning,
midday, afternoon, evening or night, or `flexible` or `unknown` when a scene has no fixed time. The chronology lives in one
place, the plan, not in each scene. `canon/plan/chapter-01.md` has all 27 scenes of Chapter 1.

### 4.4 Play material

Scene briefs, challenges, encounters, NPC files and handouts **stay where they are, in the shape Foundry reads**.
They gain:
- **Cited facts.** A beat that states or relies on a load-bearing fact carries `facts: [...]`. The GM still reads
  plain words; the IDs are for the tools.
- **Beats name their facts**: `facts` for what a beat tells the table, `gmFacts` for what its GM notes rely on.
- **A rough day and time**, kept in the plan (§4.3).
- **NPC stat blocks and conversation maps** (Part B, §9.4 and §9.5).

NPC files keep what Foundry needs (stat block, portrait, Character Card). Their story text is generated from canon,
so an NPC's description stops being another retelling. Under the data-ownership rule, the canon builder becomes the
only writer of those fields.

Later, perhaps: scene briefs written as Markdown and compiled to the same JSON. Most of Claude's editing slips this
week were in long prose inside JSON strings. Not part of the first cut.

### 4.5 Generated, never edited by hand

- **The Casebook.** Its truth, words, who's-who and plants sections read from canon; its chapter cards read from
  the plan.
- **A dossier per entity**: its facts and notes, laid out to read like a document, for Ingram.
- **The timeline**, from the `when` fields.
- **What the players know by a given scene**: every fact revealed up to that point. The no-contamination check uses
  it, and it's handy at the table.
- **Lore journals in Foundry**: one journal entry per entity. The GM pages hold everything. The player pages show
  only facts marked `everyone` or `players`, and facts already revealed. The Character Card's facts become a view of
  the same canon. This is what meets the crisis finish line.
- **The LEDGER index**, from the decision files.

### 4.6 Tools

Small command-line tools with no dependencies, like the rest of the repo, each with tests:
- `story show <entity>`: current facts, with status and source, and where each is used. Claude reads this before
  writing about, or asking about, anything.
- `story where <fact>`: every line that cites a fact.
- `story apply D047`: applies a decision's changes, then lists every citing line that now needs a look. The checks
  fail until each one is updated, or confirmed as unaffected.
- `story check`: every rule in §4.7. It also runs with the tests.
- `story digest <scene>`: what a scene tells the table and relies on, with its approval hash.
- `story build` and `story time`: copy canon scenes into `data/`; list time words per scene beside the plan.
- *Not built yet:* a line in the start-of-conversation summary (proposals waiting, open facts due soon, stale citations).

### 4.7 Checks

Automated tests:
1. **Cut wording never comes back.** A cut fact keeps the phrases that must not return. They fail anywhere outside
   the decision records.
2. **Every citation resolves**, and no play material cites a cut fact.
3. **Every canon fact has a source.** Without one, it's unconfirmed and can't be cited.
4. **No early reveals.** Read-aloud text, handouts and anything else players see may only state what the players
   know by that scene. Ingram's no-contamination rule, made mechanical.
5. **Time agrees.** "Yesterday", "this morning", "a fortnight ago" and "N years ago" in the prose match the scene
   calendar. *Built as a report, not a pass/fail check* (`story time`): a word like "yesterday" can refer to anything,
   so the re-read reads the report (R14).
6. **Status words agree.** Prose that calls a fact a proposal, accepted, awaiting or canon matches its real status.
   *Not built yet.*
7. **The quarantine is read-only.** *Not built yet: there is no quarantine folder until the move (§6.2).*

Also built: **canon points at nothing old** (paths into the old stores fail); **an approval goes stale** when its
scene or challenges change; **the `data/` copies are exact**; **the plan is valid** (times from the list, every canon
scene in it); **decisions agree with the facts they change**.

### 4.8 Scope: everything a scene depends on

Ingram, D047: *"If we only do this for Story then won't everything start to slide out of sync again?"* So everything
a scene depends on comes through `canon/` with it: its places, its NPCs and their stat blocks, its challenges, its
handouts, its art. It comes in when its scene does, in play order (§6.3), and the approval's hash covers it (§6.2).
What stays outside is what isn't campaign content: code and tests, the rules reference and Foundry's own packs, and the
Craft Library and research shelves (reference, never decisions).

## 5. How an editing round works afterwards

1. Claude picks questions from open facts, and from archive material the next chapter needs. For each topic it
   shows the current facts, their status, who decided them, and where they're used.
2. Ingram answers.
3. Claude writes the decision record: her words, and the changes.
4. `story apply` makes the changes and lists every affected line. The checks fail until each one is dealt with.
5. Claude fixes those lines. The checks pass, and the Casebook and the Foundry journals rebuild.

There is no separate sweep afterwards: step 4 is the sweep.

## 6. The clean start

### 6.1 What counts as a good decision

Ingram, D047: *"The best way to know if a decision is the right one is if I read the whole of Scene 0 and then say
'It's good, let's use that'."* So:
- **Her own words** are decisions: the decision records (D001 to D046 split word for word from the LEDGER; new ones
  from D047) and the resolved open questions.
- **A scene is approved when she has read all of it and said it's good.** Until then its content is `provisional`, and
  anything Claude added is a `proposal`. Her approval is a decision record, which marks the scene's facts decided.
- **Her improvements while reading** go into the scene, and whatever the re-read should have caught goes into the
  re-read (`canon/reread.md`), so the process learns from each scene instead of her rewriting everything.

Everything else starts **unconfirmed**, and can't be cited.

### 6.2 The quarantine: telling old from new

Ingram, D047: *"If you don't find a way to quarantine the old how will you ever be able to tell the difference
between the old and new?"* The answer has three parts.

1. **Old or new is a question of where a file is.** Inside `canon/` is new: decided, or plainly marked as waiting for
   Ingram. Everything outside it is old until it's rebuilt inside. Nothing in `canon/` may point at old material, and
   the check fails if it does. That holds from the first day of the pilot.
2. **Whatever a scene depends on is rebuilt with it**, and its approval records a hash of the scene and its
   challenges; the pilot builds that much, and the same hash will cover the places, NPCs and handouts as each comes in.
   After approval, any change shows up as needing Ingram's read again. **Ingram's example, a bad gazetteer location
   for the next place the group goes:** the place comes into canon when its scene is rebuilt; she sees it at that
   scene's read (the map crop, as the Sign-Off's Place pass does now); and if the gazetteer changes it afterwards, the
   hash no longer matches and the scene is flagged. The gazetteer stays the drawing tool; canon holds what she
   approved.
3. **The physical move, once Episode One is rebuilt.** The old stores move under `quarantine/` in one step: the v4
   bible, Chapter One v2, the dossiers, the master timeline, the bible folder, the story sections of `campaign-arc.md`,
   the story ideas, the lore library, and every design document not on a short list of live ones (process: testing,
   UX doctrine, audio, handouts, deploy, and this one). Searches skip `quarantine/` by default, `CLAUDE.md` and memory
   stop pointing into it, and play material in `data/` becomes build output from `canon/`. Waiting until Episode One is
   rebuilt keeps Foundry working throughout: until then the old scenes are what it plays.

Nothing is deleted. The quarantine can be searched for ideas; nothing may cite it; and a claim leaves it only when
Ingram decides on it. `design/design-bible.md` stays frozen where it is.

### 6.3 Triage in play order

No giant review. The Approvals Desk rule already says something enters review only when it's cast into a scheduled
scene. When a chapter is being prepared, Claude pulls what it needs from the archive and brings it to Ingram in
small batches, each with where it came from and a recommendation: keep, change or cut. Anything the table won't
reach for months stays archived until then.

The first batch is what Episodes One and Two need.

### 6.4 The files read at the start of every conversation

`CLAUDE.md` and the memory index keep rules, maps and pointers, and stop retelling the story. The memories that
restate story facts (about 30) become pointers into canon. This matters more than it looks: those files are read
at the start of every conversation, so a stale fact there misleads everything that follows.

---

# Part B. The scene re-read

## 7. The problem

Ingram's words are at the top of this document. The evidence is in §1: 61 checks across 27 scenes, no stat block
for any of the 20 NPCs in them, no prepared answers to the questions a table will ask, and 35 process leftovers in
the text the GM reads.

There is already a lot of checking: the Sign-Off has 78 questions, 34 of them automated. None of them asks whether a
section earns its place, whether the players get enough to roll, what an NPC will and won't say, or whether every
NPC present can be rolled against. The Sign-Off's recommended items (a landmark, a temptation, a time-limited offer,
a strategy-layer move, a secret modifier, an insight check, a named walk-on) can also nudge a scene towards carrying
every element whether or not it helps. The re-read is the counterweight.

## 8. When it runs

- **Every time Claude writes or edits a scene**, before telling Ingram it's done. Claude re-reads the scene as a GM
  who has never seen this repo, answers every question in §9, fixes what fails, and runs the automated checks.
- **At Sign-Off, as its first pass**, recorded by the Sign-Off tool with the checklist version, so it can't be
  skipped quietly. The seal tool already refuses a scene whose passes aren't all clear.
- **Once over all 27 built scenes**, as the first job after the pilot (§10).

## 9. The questions

### 9.1 Does every part earn its place?

For each section, beat and note:
- **What does the GM do with this at the table?**
- **What does a player get from it?** Something to do, decide, roll, learn, keep or laugh at.
- **Would the scene be worse without it?** This is the removability test from `design-layers.md`, applied to a
  scene.

If a part gives the GM and the players nothing, cut it. If it helps Claude or the design but not the table, move it
to the scene's `notes`. The Sign-Off's recommended items are ideas to consider, not boxes to fill: each one stays
only if it passes this question in this scene.

### 9.2 Is it clean?

Nothing the GM reads at the table mentions how the scene was made:
- no decision or LEDGER numbers, no names of who decided, no dates of changes;
- no "used to", "no longer", "an older version said", "cut on…", and no mention of ideas that were removed. If
  something was cut, it simply isn't there;
- no build status ("the button isn't built yet"). Say what to do instead: "hand the player the number on a note";
- no pointers to design documents, unless the GM needs to read them to run the scene.

**Automated:** the existing `tier2-no-provenance-in-play-text` test gains these patterns. It would have caught all 35.

### 9.3 Do the players roll?

SF2E is played through checks. A scene without them is a conversation or a cutscene.
- **Every beat where a PC acts offers a check**, or says why not.
- **No fixed target** (Ingram, D047: "It can be organic"). Instead, four questions for every scene: would it be
  improved by a skill roll; does a dilemma the group faces resolve through rolls; does a critical failure escalate;
  is there a way forward from a failure; and what extra does a critical success give?
- **Conversations run on checks.** Asking, persuading, lying, reading someone and pressuring them are all rolls:
  Request, Make an Impression, Lie, Sense Motive, Coerce, Demoralize, Gather Information and Recall Knowledge. Each
  NPC's conversation map (§9.4) says which apply.
- **Every roll changes something** on each degree of success: what the players get, see or lose. A roll that
  changes nothing gets cut.
- **The skills vary** across the scene and its neighbours (Sign-Off Q9 already asks this).

**Automated:** all four degrees of success written for every check. How many rolls a scene needs is a judgment
the re-read makes, not a number.

### 9.4 How much will each person say?

For every NPC the party can talk to, a **conversation map**:
- **Attitude** at the start of the scene, on SF2E's five steps (hostile, unfriendly, indifferent, friendly,
  helpful), and what moves it.
- **What they say freely**, in their voice.
- **What they say on a check**: the skill, the DC (from their stat block), and what success and critical success
  give.
- **What they won't say at this point**, and the line they deflect with.
- **The questions the group will probably ask, with the answers**, five to eight, in the NPC's voice. Include the
  obvious ones ("Who are you?", "What's going on?", "Why us?") and whatever the scene's hook invites. In Intake
  Medicals that means at least: "Are you *the* Shucks Mordant, the founder?", "What's wrong with my blood?" and
  "What's wrong with your hand?"
- The answers cite canon facts, so they can't contradict a decision or reveal something early.

The cast briefs already hold part of this: topics they'll discuss (`willDiscuss`), what they won't (`willNotDiscuss`),
what a check can get (`coercible`), a voice and sample lines. The map extends those fields with the likely questions
and answers, the check tier and the numbers. It doesn't create a parallel structure.

**Automated:** every speaking NPC has a map with at least five questions answered.

### 9.5 Can every NPC be rolled against?

Every NPC present in a scene has a stat block, even if nobody plans to fight them, because the social rolls use
their numbers. In SF2E (Player Core, in `reference/srd/`):

| The player's action | Their roll | Against the NPC's |
|---|---|---|
| Lie | Deception | Perception DC |
| Request, Make an Impression | Diplomacy | Will DC |
| Coerce, Demoralize | Intimidation | Will DC |
| Sense Motive | Perception (the GM rolls it in secret) | Deception DC |

So anyone the party can talk to needs at least a level, Perception, Will, a Deception DC, the skills they're good
at, and their attitude. Anyone who could plausibly fight or be fought needs a full SF2E creature stat block (the
`combatStatblock` shape the repo already has): AC, HP, saves and strikes. A named stand-in is fine where it fits: a
creature from the sf2e compendium, reskinned, which the pack reader can already pull.

**Decided (D047):** stat blocks are made with Ingram, and non-combat NPCs get no special actions or features. The
four founders are **level 15**: impossibly powerful against a level-1 party, and still surpassable by the group in
the end. The flashbacks will need PC stat blocks for Rupiah, Shucks, Anabala and Hyuck, built from their old
character sheets.

**The NPC generator.** Ingram: *"we'll have to create an 'NPC Generator' you can work with to create archetypes.
Doing this will require you to do a big analysis of how SF2E creates it's stat curves."* GM Core builds creatures from
tables of values by level (Perception, skills, AC, saves, HP, attack and damage, spell DCs), each at bands from
terrible to extreme. The generator reads those tables from `reference/`, takes a level and an archetype (which bands
each number sits in), and returns a stat block in the repo's `combatStatblock` shape: for a non-combat NPC, just the
numbers the social rolls need. It has to exist before the first scene with speaking NPCs is rebuilt, which is Intake
Medicals, Scene 2.

**Automated:** every NPC cast in a scene has a stat block, and every speaking NPC has the social numbers.

### 9.6 What if they do something unexpected?

For each scene, one line for each plausible departure, with the stat block to use:
- they attack someone, or someone attacks them;
- they refuse, walk out, or stay behind;
- they lie, steal, sneak or break in;
- they follow someone, or split up;
- they ask about something the scene didn't plan for. The conversation map covers most of this; otherwise the NPC
  doesn't know, and says so.

The scene doesn't script what happens. It gives the GM something to stand on: who reacts, how, and what gets rolled.

**Automated:** every scene has the list, or says why it doesn't need one.

### 9.7 Is it fun?

- Is there one thing a player would retell afterwards? (Sign-Off Q13.)
- Does this scene do something no other scene does?
- Does every player get a moment?

### 9.8 Does it read right?

- Plain GM-facing prose, per the standing style rule.
- Every load-bearing fact cited, and nothing revealed early. This is automated once canon exists.
- Read the read-aloud out loud (Sign-Off Q1).

### 9.9 The re-read, as a list

The living list is `canon/reread.md` (version 2: twenty-five questions. Version 1's fifteen covered everything in
§9.1 to §9.8 plus Ingram's four roll questions and the plan's time of day; version 2 added ten from Ingram's read of
Scene 0: directions only when critical, no negatives, answers that could be questions, clipped lines, coined words,
length, places, and using all of her detail). It lives there, not here, so there is one copy; it
grows a question whenever Ingram's reading of a scene finds something it missed. Each scene's answers are kept
beside it, in `canon/scenes/<id>.reread.md`.

## 10. What this means for the built scenes

The first re-read of Episodes One and Two has to supply:
- **Stat blocks for 20 NPCs**: Shucks, the Section Officer, Hulda, the Comms Officer, Taka, the Deputy Director, the
  Young One, Nobu, Manako, the teachers, the clerks, the Range Safety Officer and the rest, each at a level Ingram
  agrees.
- **Conversation maps for 40 speaking parts**, across the 27 scenes.
- **More rolls** wherever a roll would improve the scene (§9.3).
- **The 35 leftovers** removed from what the GM reads.
- **A "what if they do something unexpected" list** for each scene.

It's real work, and the stat blocks and conversation maps are most of it. They're also what lets the GM say yes to
whatever the table tries.

---

## 11. How this makes Claude more reliable

| What went wrong | What fixes it |
|---|---|
| A decision's copies had to be found by searching, which misses paraphrases and knock-on effects | One home per fact; citations; `story apply` lists every affected line |
| Old claims stayed live beside correction notes | Canon states only what's true now; history lives in the decision records and git |
| Claude's fills and older generated material read as Ingram's decisions | Every fact carries a status and a source; unconfirmed material can't be cited |
| Claude contradicted a decision it didn't find | `story show` before asking: every decision on the topic, in one place |
| Claude reuses whatever it has just read, rejected ideas included | Claude's default reading is confirmed canon; the archive is opt-in |
| Claude's memory resets between conversations and is summarised within long ones | The list of affected lines is computed, not remembered |
| Status labels drifted, or sat on the wrong sentence | Status is a field, and a check compares the prose to it |
| Scenes disagreed about what day it was | Scene days, the timeline, and a check |
| Cut ideas crept back | Cut wording is a failing test |
| Process leftovers in text the GM reads | The re-read, and the extended provenance test |
| Scenes without rolls, prepared answers or stat blocks | The re-read, with automated minimums |
| Editing slips in long JSON prose | Canon in Markdown; later, perhaps scenes too |

## 12. How to get there

Ingram's pause on other work is the window for this.

**Step 0: the pilot**, one scene per output, in play order (D047). It started with From Up Here, Scene 0, not
Intake Medicals as first proposed here: Scene 0 is the true first scene, and choosing by example instead of by the
episode's own order was exactly the kind of slip this refactor exists to stop. §16 has what's built.

**Step 1: rebuild Episode One, scene by scene**, each through the re-read and Ingram's read, bringing in the facts,
places, NPCs and stat blocks it needs. (The LEDGER is already split into decision records.)

**Step 2: the quarantine move** (§6.2), then Episode Two the same way. Slim `CLAUDE.md` and the memory index.

**Step 3: generate the views.** The Casebook, the dossiers, the timeline, and the Foundry lore journals. The
journals are module work, alongside epics #102 and #118.

**Step 4: triage in play order from then on**, chapter by chapter.

Other Claude conversations can resume when Ingram says so, working in the new structure.

## 13. Costs and risks

- **Ingram's time is the bottleneck.** Triage comes in small batches in play order, but the stat blocks need her
  call on levels, and the conversation maps need her read.
- **The tooling has to be built and tested**: the fact reader, the checks, `apply`, the view builders and the
  Foundry journals. Rough estimate: a few days of focused work, more for the Foundry side.
- **A half-finished migration is the worst outcome.** It would leave two systems and a 44th store. So the switch
  happens one entity at a time: the old copy is archived the moment the new one exists, and the checks block edits
  to the archive.
- **The pipeline stays stable.** Play data keeps its paths and shape, so Foundry and the ~4,500 tests keep working.
  Scenes gain fields; nothing moves.
- **How big a fact is** can go wrong both ways: too small is noise, too large is paragraphs again. §4.2's rule gets
  tested in the pilot.
- **Losing good material.** Nothing is deleted. The archive stays searchable, and triage brings back what earns its
  place.
- **The re-read adds time to every scene.** It should: that's time now spent fixing things later, or at the table.

## 14. Decisions for Ingram: answered (D047)

1. **The pilot**: yes, one scene per output, in play order, starting with Scene 0.
2. **A good decision**: Ingram reads the whole scene and says it's good (§6.1).
3. **Triage in play order**: yes. The long-term story stays fluid on purpose.
4. **Rolls**: organic, with four questions (§9.3), not a number.
5. **Stat blocks**: made together; non-combat NPCs kept simple; an NPC generator from SF2E's stat curves; the
   founders are level 15 (§9.5).
6. **Scope**: everything a scene depends on, not just the story, with a quarantine for the old (§4.8, §6.2).
7. **Foundry lore journals**: in the first cut.
8. **Names**: Claude's choice. The tree is `canon/`; the old stores go to `quarantine/`.

## 15. Not settled here

- **How approval in canon relates to the Sign-Off tool.** Proposed: for a scene rebuilt in canon, Ingram's full read
  and the approval decision (with its hash) replace the seal. Her read is the Comprehension pass; the map crop
  remains the Place step for scenes with a location; the re-read replaces the Completeness and Quality passes. This is
  her call.
- **Whether scene briefs move to Markdown**, compiled to the same JSON. Not yet.
- **When the Foundry lore journals are built.** In the first cut (D047); the module work is still to schedule.

## 16. The pilot so far

Built on 2026-09-27, in this order:
- **`canon/`**, with its rules (`canon/README.md`) and the living re-read (`canon/reread.md`, version 1).
- **The decisions**: D001 to D046 split word for word from the LEDGER, which is now frozen; D047 records this
  round's answers.
- **The facts Scene 0 rests on**: 63 of them in 17 files in `canon/world/` (43 decided, 1 accepted, 8 provisional
  from the scene as written, 10 proposals, 1 open).
- **The plan**: `canon/plan/chapter-01.md`, all 27 scenes of Chapter 1 with a rough day and time and their state.
- **Scene 0, From Up Here**, rebuilt and re-read (`canon/scenes/episode-c1e1--from-up-here.reread.md`), with a new
  challenge for optional Recall Knowledge checks, built into `data/`. It's waiting for Ingram's read.
- **The tools**: `tools/story/` (`show`, `where`, `check`, `apply`, `build`, `time`, `digest`), with
  `test/canon.test.mjs` proving each rule fires.
- **The Casebook** moved out of a temporary folder into `tools/casebook/`, with a new Part Zero that shows the plan
  and every scene in canon in full, as the GM would run it, with its re-read.

**Ingram read Scene 0** and gave nineteen notes (D048), and named the country Minkai (D049). The scene was rewritten
as version 2: twice the length, mystery first (the founders unnamed, the prophecy and Cicada held back, why Kurose left
as a question), with no rolls, no questions and no directions. Its challenge is deleted. Facts gained `told` beside
`known`, and the first source record, S001, her First Impact dossier as first filed. Canon now holds 94 facts in 17
files (78 decided, 2 accepted, 12 provisional, 2 open). The re-read is version 2.

Next: Ingram's second read of Scene 0. Then Scene 1, The Road In. Before Scene 2, Intake Medicals, the NPC generator,
because that's the first scene with speaking NPCs. After Episode One, the physical move to `quarantine/`.
