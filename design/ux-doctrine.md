# UX Doctrine — what the interface is actually for

**Status: the lodestone for UI work.** `design/visual-identity.md` decides how things *look*; this
decides what is *there*, how big it is, and where it lives. When the two conflict, this one wins —
a beautiful console that makes a turn slower has failed at the only job it has.

Everything mechanical below is cited to `reference/srd/` or to this campaign's own `data/`. Where
something is judgment rather than rules, it is labelled as judgment. That distinction is
load-bearing: a lodestone that quietly mixes opinion into citation stops being useful the first
time someone checks it.

---

## 1. The answer, in one page

### What SF2E's UX actually is

Most systems can be described by their maths. SF2E is better described by what the maths *costs
a human to run in real time*.

Three facts, each cited below, combine into the whole problem:

1. **A turn is three actions and one reaction** — a small, uniform, constantly-repeating budget.
2. **The modifiers on any given roll are many, and they change within a single turn** — the
   multiple attack penalty moves twice per turn on its own.
3. **There are four degrees of success, set ten apart** — so a ±2 is never noise. Being wrong by
   2 changes real outcomes about 10% of the time, and changes crit outcomes as often as it
   changes hits.

Put those together and you get the thesis:

> **SF2E's numbers are too tight, and too many, to be handled by a human at speed. The
> interface's job is to own the arithmetic completely — so that the player's entire attention
> goes to the only thing that was ever actually theirs: choosing how to spend three actions.**

This is why "just show the character sheet" is the wrong shape. A sheet is a *record* of numbers.
What a player needs at the table is not the record — it is the *one number that applies right
now*, already assembled, on a button.

### And what the GM's UX is

The GM is not playing a character, so the same doctrine does not transfer. A GM is running an
encounter across many creatures at once, and their scarce resource is attention, not information.
The rulebook states the GM's priorities directly, and they read like a UI specification:

> Answering questions quickly and decisively whenever possible · Building anticipation for what
> happens next · Emphasizing thrilling action and setting a rapid pace · **Letting players know
> when they're up, and preferably also when they're "on deck" to go next** · Showing the
> immediate consequences of actions
>
> — `reference/srd/gm-core/610-running-encounters.json` (GM Core p. 24)

So:

> **The GM interface's job is to make the next thing obvious** — whose turn, what that creature
> does, what number the party needs to beat, and what just changed as a result.

There is a second half to that job, which only becomes visible once you ask what a campaign needs
*between* sessions rather than during one: **the session has to record itself**, because what it
meant is the input to writing the next one and it evaporates within a day. §10 is the full design
for the Director's console and treats both halves as one problem.

### And what this campaign adds

This campaign has, independently and repeatedly, expressed power as **permission rather than
bonus**. It says so outright:

> "Neither ever produces a numeric combat bonus larger than +2 — the difference between a
> well-synced and poorly-synced pilot is **what they're allowed to do**, not how good they are at
> doing it."
>
> — `data/campaign/config.json`, `twoTracksPrinciple`

Resonance does not give you +2; it gives you a third action, or takes your reaction away
entirely. Damage does not worsen your attack rolls; it caps your actions. Scale disparity does
not make a kid harder to hit; it makes them *untargetable*. Every one of these is a permission.

**Therefore the console is, above all else, a permissions display.** The single question it must
answer instantly, at all times, is: *what may I do right now, and what will it cost?*

If a player has to ask that question out loud, the interface has failed.

---

## 2. What the rules actually demand

These are not preferences. Each one creates a specific obligation for the interface.

### The turn is a checklist, and the rulebook writes it out

`reference/srd/player-core/470-encounter-mode.json` (Player Core p. 427–428) defines three steps.
Two of them are pure bookkeeping that tables forget constantly:

**Start of turn** — reduce your ongoing effect durations by 1 and end any that hit 0; use any free
action or reaction triggered by "your turn begins"; **roll a recovery check if dying**; then
regain 3 actions and 1 reaction.

**End of turn** — end effects that last until end of turn; **take persistent damage, then roll the
flat check to end it**; roll any ongoing affliction saves; **then** decrement conditions like
frightened.

*Obligation:* the console runs these two checklists. Not as a reference page — as prompts, at the
moment they are due. Persistent damage and frightened decrements are the two most-forgotten
things in the game and both are fully automatable.

### An unspent reaction is destroyed

> "If you haven't spent your reaction from your last turn, you lose it — you can't 'save' actions
> or reactions from one turn to use during the next turn."
> — Player Core p. 427

*Obligation:* reactions must be surfaced *on other people's turns*, when their triggers occur. A
player who ends a round holding an unused reaction after a legal trigger fired was failed by the
interface, not by their own attention.

### The multiple attack penalty moves twice inside a single turn

> "Your second attack takes a −5 penalty, and any subsequent attacks take a −10 penalty... You
> can use a weapon with the agile trait to reduce your multiple attack penalty."
> — `reference/srd/player-core/228-weapons.json` (Player Core p. 253)

It is untyped, so it stacks with everything else, including range penalties
(`reference/srd/player-core/326-checks.json`, p. 392).

*Obligation:* this is the highest-value automation available anywhere in the system. It is
mechanical, it is certain, it changes mid-turn, and it is the single most common arithmetic error
at real tables. The interface must never show one Strike button and expect a human to subtract.

### Off-guard is −2 and is everywhere

Off-guard is a −2 circumstance penalty to AC
(`reference/srd/player-core/condition-28-off-guard.json`). Flanking imposes it, but *only against
melee attacks from the two flanking creatures specifically*
(`reference/srd/player-core/423-flanking.json`, p. 417) — while other sources apply it
universally.

*Obligation:* off-guard is relational, not a flag on a token. The interface must resolve it
*per attacker, per target, per attack type* and fold the result into the displayed number.

### Four degrees of success make the margin meaningful

Beating a DC by 10 is a critical success; missing by 10 is a critical failure.

*Obligation:* show the margin, never a bare verdict. "31 vs AC 24 — hit by 7" tells a player they
were three short of a crit, which is information they will use on their very next action.
"Hit" throws that away.

### Three modes of play, defined by the rules

| Mode | Time scale | What a player chooses | Cite |
|---|---|---|---|
| **Encounter** | 6-second rounds | 3 actions + 1 reaction, per turn | PC p. 427 |
| **Exploration** | minutes / 10-min blocks | *one* exploration activity, held continuously | PC p. 430 |
| **Downtime** | days | long-term activities | PC p. 433 |

These are genuinely different games with different verbs. The exploration activity list is real
and closed enough to be a menu — Analyze Environment, Avoid Notice, Defend, Detect Magic, Follow
the Expert, Hustle, Install Upgrade, Investigate, Livestream, Recharge, Repeat a Spell, Scout,
Search, plus the skill activities (`reference/srd/gm-core/646-running-exploration.json`, GM Core
p. 34–38).

*Obligation:* the console must know which mode it is in, and shed what the mode cannot use. An
action-pip tray in downtime is noise. An exploration-activity picker during a fight is noise.

### The GM's most frequent question has a table behind it

Simple DCs (untrained 10 / trained 15 / expert 20 / master 30 / legendary 40) and DCs by level
(level 0 = 14, level 1 = 15, level 12 = 30, level 20 = 40), plus adjustments — all in
`reference/srd/gm-core/702-difficulty-classes.json` (GM Core p. 52).

*Obligation:* "what's the DC?" should be answered by a control, not by memory or a page-flip. The
rulebook's own first GM priority is *answering questions quickly and decisively*.

### The universal action vocabulary is small

From `reference/srd/player-core/383-actions.json` (Player Core p. 406–410), the **Basic Actions**
available to anyone are: Aid `[reaction]`, Crawl, Delay `[free]`, Drop Prone, Escape, Interact,
Leap, Ready `[2]`, Release `[free]`, Seek, Sense Motive, Stand, Step, Stride, Strike, Take Cover.

The **Specialty Basic Actions**, each gated on having something, are: Area Fire `[2]`, Auto-Fire,
Arrest a Fall `[reaction]`, Avert Gaze, Burrow, Dismiss, Fly, Grab an Edge `[reaction]`, Mount,
Point Out, Push Off, Raise a Shield, Sustain, Switch Hands.

Two things worth flagging because they differ from Pathfinder instincts:

- **Aid is a reaction in SF2E**, not a two-part prepare-then-react.
- **Area Fire is a basic action**, and it is a *save* against your class DC, with no attack roll.
  Starfinder's action bar is not Pathfinder's with guns bolted on; area and auto-fire are core
  vocabulary and deserve first-class placement for anyone holding a weapon with those traits.

*Obligation:* this list is short enough to be *complete* on screen for the actions a given
character can currently take. There is no excuse for hiding a legal basic action behind a search.

---

## 3. What this campaign adds

### Resonance is the action-economy governor, not a flavour gauge

`data/campaign/config.json` sets, per band: **actions per turn**, **whether you have a reaction at
all**, **which tier of abilities is unlocked**, and **how many rounds of internal power you have**.

| Band | Actions | Reaction | Abilities | Internal power |
|---|---|---|---|---|
| Dead Weight (<40%) | 2 | **none** | Baseline only | 3–4 rounds |
| Nominal (40–64%) | 2 | yes | + Attuned | 6 rounds |
| Harmonised (65–84%) | 3 | yes | + Resonant | 8 rounds |
| Absolute (85%+) | 3 + free Strike ignoring MAP | yes | + Absolute | 10 rounds |

*Obligation:* Resonance belongs in the permissions readout, not in a vitals panel. Four separate
consequences hang off one number, and a pilot must be able to see all four without doing a lookup.
"Most of the campaign is played at 2 actions" (`bandDesignNote`) means **three pips is the
exception, not the default** — the tray must be honest about that.

### Damage caps actions

`design/scale-and-chassis.md` §8: Degraded caps a Frame or chassis at **2 actions**; Critical caps
it at **1**; Hulked is 0. This is explicitly the lever chosen to make machines feel different from
people — a kid never loses actions to damage; a Frame does.

*Obligation:* the action tray must show the *real* current budget and, on demand, *why* it is what
it is. "2 actions — Degraded" is a complete explanation. Three greyed pips with no reason is not.

### Some things cannot be rolled, so they must be clocks

§3 and §11 of scale-and-chassis: dismounted personnel at Frame scale **do not roll saves**, because
+4 against DC 32 is not a roll. Instead the GM states a countdown out loud. Internal power duration
is a countdown. The Contact Pool runs on quiet mornings. The session bar we already built is a
countdown.

*Obligation:* **the clock is a first-class interface component**, not ad-hoc text. Several
unrelated systems in this campaign resolve into "a stated number of rounds/days remaining," and
they should all render the same way so players learn to read one thing.

### Marked is a binary life-or-death state

Loud actions make a chassis **Marked** until the end of its next turn, and only a Marked chassis
can be Struck by a Frame-scale creature at all (§10).

*Obligation:* Marked cannot be one condition icon among twelve. It changes whether you are a legal
target. It gets its own unmissable state.

### Never mix scales in one readout

The campaign's hardest rule — *"a personnel-scale number never appears on the same side of a
comparison as a Frame-scale number"* — has a direct interface consequence. A kid's +7 must never be
displayed adjacent to a Claimant's DC 32 in a way that invites comparison. Ground-role checks are
rolled at **the kid's own level's DC**, and the *effect* lands at Frame scale
(`data/campaign/ground-roles.json`).

*Obligation:* ground crew and pilots get different readouts, not the same readout with different
numbers in it.

### Downtime is already a solved UI problem

Two discretionary slices per day, seven options
(`data/campaign/config.json`, `timeEconomy`). "More options exist than slices to spend them on —
that gap is the entire engine of downtime play."

*Obligation:* downtime is a menu with a visible budget of 2. That is the entire screen. It should
be the easiest mode to build and should not be allowed to sprawl.

---

## 4. The two shapes: a sheet and a board

This is the most important structural claim in this document.

|  | Player | GM |
|---|---|---|
| Subject | **one** character | **many** creatures |
| Depth needed | deep | shallow, per creature |
| Shape | a **sheet** — panels around one subject | a **board** — one row per combatant |
| Core question | *what may I do?* | *what happens next?* |
| Most repeated act | spend an action | apply damage to a thing |
| Failure mode | can't find my own button | lost track of who's hurt |

**A GM console must never be built as a player console with more buttons.** The GM's problem is
breadth: six PCs plus three to eight adversaries is up to fourteen things with HP and conditions.
That is a table with rows, sorted by initiative, with the *active* row expanded and everything else
compressed to one line. It is a master-detail view driven by initiative rather than by selection.

This is the same conclusion already reached for Director Mode, and for the same reason: GM tooling
is a different object, not a skin.

---

## 5. What the player is doing

### Ranked by frequency — labelled as judgment

There is no telemetry behind this ordering. It is judgment from how the rules are shaped: which
actions are universal, which are gated, and which appear in the turn structure itself. It is stated
as a ranking so it can be *argued with and corrected*, which is more useful than leaving it
implicit in a layout.

**Tier 1 — the spine. Always visible, largest targets, fixed position, never moves.**
Strike (as *separate pre-computed buttons per MAP step*), Stride, Step, and the action budget
itself. Plus Cast a Spell for anyone who can, since for a caster it occupies the same slot in the
turn that Strike does for a martial.

**Tier 2 — the support verbs. Visible, smaller, one row.**
Seek, Take Cover, Interact (draw / reload), Raise a Shield, Aid, Escape, Stand, Recall Knowledge,
Demoralize, and — for anyone holding the traits — Area Fire and Auto-Fire. Recall Knowledge and
Demoralize are *skill* actions rather than basic actions, but they are used at combat frequency and
belong at combat distance.

**Tier 3 — your own repertoire. One tap, categorised.**
Class feats, spells, items, chassis systems. This is where character identity lives, so it must be
reachable in one action but must not crowd out the spine that everyone shares.

**Tier 4 — the tail. Accordion or search.**
Delay, Ready, Point Out, Sense Motive, Switch Hands, Release, Crawl, Drop Prone, Avert Gaze, Leap,
Mount, Dismiss, Sustain, Arrest a Fall, Grab an Edge, Burrow, Fly, Push Off.

Note that Tier 4 is longer than Tiers 1–3 combined, and almost nobody will miss it. That is the
whole argument for tiering, made concrete.

### The turn as a state machine

The player console has exactly five states. Building it as five explicit states rather than one
screen with conditional bits is how "always the correct information" gets enforced structurally
rather than by discipline.

| State | What the console leads with |
|---|---|
| **Idle** (not my turn, no trigger) | The initiative queue, with my position and distance-to-my-turn. Quiet. |
| **On deck** (I'm next) | Soft alert — rules-mandated. Let me plan: targets, my numbers, my budget. |
| **My turn** | The full action surface. Start-of-turn checklist fires first. Pips lit. |
| **Mid-turn** | Same, but MAP has moved and unaffordable actions are visibly unaffordable. |
| **Trigger** (any turn, reaction available) | **Interrupt.** The reaction, named, with its trigger stated. |

The **Trigger** state is the only one permitted to interrupt the player, and it exists because the
rules destroy unspent reactions.

### Theatre of the mind

The user named this case specifically, and it changes the answer. With no map:

- **The action list *is* the interface.** There is no token to click, so every affordance must be a
  named button. This is the strongest possible argument for the Tier 1/2 bar.
- **Range becomes a band, not a number.** Engaged / Near / Far, not "35 feet." This matters more
  here than in most campaigns because distances run at 10× the standard grid
  (`design/scale-and-chassis.md` §14), so raw footage is actively unhelpful to intuition.
- **Who is present must be listed**, because it cannot be seen.

This also aligns with the already-`accepted` requirement in
`ideas/entries/in-scene-ui-panel-mimetic-controls.json`, in the user's own words: common actions
and direct access to a player's own rolls, *"so that any improvisation is possible"* without
breaking flow to dig through sheets.

---

## 6. What the GM is doing

### Ranked by frequency — also judgment, but anchored

The rulebook's own GM priorities (§1) anchor the top of this list rather than my guessing at it.

1. **Signal whose turn it is, and who is on deck.** Explicitly a rules-stated priority.
2. **Apply damage to a creature.** The single most repeated physical act of running a fight.
3. **Run the active adversary's turn** — its attack routine with MAP already applied, its
   abilities, its reaction, and a tactics note saying what it *wants*.
4. **Answer "what's the DC?"** — the rulebook's first-listed priority. Needs simple DCs and
   DC-by-level on one control.
5. **Track conditions and durations across many creatures**, including what expires when.
6. **Adjudicate degree of success** — needs the margin, same as the player.
7. **Reveal information deliberately** — Recall Knowledge results in particular.
8. **Pace the session** — what the session bar now serves.
9. **Track the campaign's slow clocks** — Contact Pool, Frame damage states, technician-days,
   Bleed, Anchors, the Time Economy. These are Director Mode's existing job.

Items 1–7 are *in-encounter* and belong on the chassis. Items 8–9 are *between-turn* and belong in
the Director's terminal. That split is not arbitrary; it is Law 13 below.

### The board

One row per combatant, in initiative order, always visible:

`⟨initiative⟩ ⟨name⟩ ⟨HP bar + number⟩ ⟨conditions as chips⟩ ⟨damage entry⟩`

The active row expands to show the full action routine. Everything else stays one line. Rows for
creatures the party has not identified show what the *party* knows, not what the GM knows, so the
same board can be screen-shared without leaking.

### The log

`ideas/entries/in-scene-ui-panel-mimetic-controls.json` already asks for a **timestamped log of
what actually happened, authored live** — a proactive counterpart to scraping chat afterward. This
doctrine endorses it and adds a reason: it is also the honest source for post-session recaps and
for the campaign's own memory. Every roll and every applied consequence should land in it without
the GM typing anything.

---

## 7. One console, stable zones, swapped content

The temptation with three modes × two scales × three seats is to build many screens. Don't. Build
**one console with fixed zones**, and swap what each zone contains. Muscle memory then survives
every mode change — the same way Director Mode reuses the same button and the same panel to open a
completely different object.

```
┌── TOPRAIL ───── where · when · session clock ────────────────────────┐
│                                                                       │
│  ┌ WHO ELSE ┐                                      ┌ WHAT'S ON ME ┐   │
│  │ initiative│         THE SCENE / MAP             │ conditions,   │   │
│  │ + on deck │                                     │ as effects    │   │
│  └───────────┘                                     └───────────────┘   │
│                                                                       │
├── THE BAR ───────────────────────────────────────────────────────────┤
│  WHO I AM        │   BUDGET    │  WHAT I FACE  │  WHAT I MAY DO       │
│  permissions:    │   ⬤ ⬤ ⬤ ⟳   │  (the dome)   │  Strike  +17         │
│  Resonance band  │   and why   │  target, AC,  │  Strike  +12         │
│  damage state    │   it is 2   │  off-guard?   │  Stride  25 ft       │
│  Bleed · HP      │             │  or the scene │  ── tier 2 row ──    │
│                  │             │               │  [ my repertoire ]   │
└───────────────────────────────────────────────────────────────────────┘
```

**Zone contracts:**

| Zone | Encounter | Exploration | Downtime |
|---|---|---|---|
| Who I am | Resonance band, damage state, Bleed, HP | same, quieter | current condition only |
| Budget | action pips + reaction | *hidden* | **2 slices** |
| What I face | current target | the scene / who's present | — |
| What I may do | Tier 1 + 2 + repertoire | exploration activities + skills | the seven Time Economy options |
| Who else | initiative order + on deck | party roster | — |

The dome — the console's most prominent element — always shows **the thing you are currently
dealing with**: your target in a fight, the scene in exploration, the active combatant for a GM.
That is a single rule producing a mode-appropriate answer every time, and it puts the highest-value
information in the highest-value real estate.

---

## 8. The laws

Numbered so they can be cited in review. These are meant to settle arguments.

1. **Show the number that will actually be rolled.** If MAP, off-guard, cover, range, frightened,
   and a status bonus all apply, the button shows one number. The player never adds.
2. **Show the margin, not the verdict.** Four degrees of success make "hit by 7" strictly more
   useful than "hit."
3. **The action budget is the centrepiece, and it is not always three.** Show the real number, and
   show why on demand.
4. **An unspent reaction after a legal trigger is an interface failure**, because the rules destroy
   it.
5. **Conditions display as consequences, not names.** Preferably already folded into the numbers,
   with the condition shown as the *reason* for them.
6. **Nothing on screen that the current mode cannot use.**
7. **Frequency sets distance from the hand.** Tier 1 never moves. Nothing important is more than one
   tap away.
8. **Never put a personnel-scale number beside a Frame-scale number.** The campaign's hardest rule,
   applied to pixels.
9. **When the maths cannot honestly be rolled, show a clock.** Clocks are one component, used
   everywhere they apply.
10. **The player console answers "what may I do." The GM console answers "what happens next."**
    Neither is built from the other.
11. **Never show a player what their character has not learned.** Recall Knowledge gates creature
    information; the redaction machinery is this same principle applied to documents.
12. **Every roll and every consequence lands in the log without anyone typing.**
13. **The chassis is for what happens *inside* a turn. Everything else lives in the terminal.**
    This is the placement rule for every future feature, and it is the one that cures the riot.
14. **Interrupt only for the reaction trigger and the start of your turn.** Everything else is
    ambient. An interface that shouts constantly is one nobody reads.
15. **Recording is a side effect of doing, never a separate task.** If capturing the session is its
    own job, it will not get done, because the GM is the busiest person at the table. See §10.
16. **The console's confidence is visible in how loudly it acts.** Silent when the answer is
    certain, a confirm when the consequence is real, a suggestion when it needs judgment. Automation
    that is sometimes wrong is worse than none, because then everything has to be checked.

---

## 9. What this means for the current prototype

Applying Law 13 to what exists today. This is a proposal, not a change already made — nothing in
`design/ui/` has been altered by this document.

### Promote

| Module | Why |
|---|---|
| **Actions pod** | It is the game. It is currently one pod among ten, with a three-key row. It should be the largest thing on the bar, with per-MAP Strike buttons and a full Tier 2 row. |
| **Order of Battle rail** | This is the initiative queue. It needs an explicit **on deck** marker — rules-mandated, currently absent. |
| **Checks pod** | Directly serves the user's own "so that any improvisation is possible" requirement, and it is the whole interface in exploration mode. |
| **Pilot ID / Status** | Becomes the *permissions* plate: Resonance band with its four consequences spelled out, damage state, action cap. |

### Fix

- **The skill list is wrong.** The Checks pod has ten keys (Per, Ath, Ste, Dip, Occ, Cra, Med, Soc,
  Nat, Pil). SF2E has nineteen skills, and the pod is missing **Computers** — a Starfinder
  signature skill, and the one behind Hack and Access Infosphere — plus Acrobatics, Arcana,
  Deception, Intimidation, Religion, Survival, Thievery, and Lore.
- **Conditions** should render their effects, and should change the numbers on the action buttons.
- **Movement and Reactions pods** should merge into the action tray. Movement *is* an action;
  reactions belong beside the reaction pip.

### Move to the terminal (Law 13)

- **Audio mixer** — a few uses per session occupying prime chassis real estate.
- **Fortune** — flavour, not a turn action.
- **Most of the GM pod** — Director Mode already exists and is the right home.
- **View / camera controls** — Foundry's own job.

### Cut

- **Macros** — Foundry has a hotbar. Duplicating it is the definition of the riot.
- **Free dice** — in SF2E you roll *checks*, not naked dice. Keep a small damage-die tray at most,
  below the checks it serves.

### Add

- Per-MAP Strike buttons — the highest-value single change available.
- On-deck indicator.
- Start-of-turn and end-of-turn checklist prompts, especially persistent damage.
- A clock component.
- The GM's combatant board.
- Target context: AC if known, and whether the target is off-guard *to me, for this attack type*.

---

## 10. The Director's console

Everything above treats the GM briefly, as the other half of a contrast. This section is the real
design. Four preferences were settled by the user on 2026-09-06 and are quoted where they decide
something; the rest follows from them.

### 10.1 The thesis: running the session and recording it are one act

The player console's thesis was that the interface owns the arithmetic. The Director's console
needs a different one, because the GM's problem is not arithmetic. It is that **a session happens
once, and everything about it that matters for what comes next evaporates within about a day** —
unless capturing it costs nothing at the moment it happens.

> **Running the session and recording it must be the same act.** If recording is a second, separate
> task, it will not happen, because the GM is the busiest person at the table.

This has one strong consequence that shapes the entire design: **recording is a side effect of
doing, never a job of its own.** When the GM applies damage, that is a log entry. When they raise a
pilot's Bleed, that is a log entry. When they cue a scene, that is a log entry. The mechanical
record writes itself in full, for free, because the console is the thing mediating the actions.

That leaves exactly one thing a machine cannot supply: what any of it *meant*. Which is the one
thing the GM must type, and therefore the one thing that has to be effortless.

### 10.2 The corpus — what co-writing actually reads

The user's own description of the loop, which is more specific than "keep a log":

> "This becomes the log which you use and read to understand the session, how it went, you get to
> read the diary, you get to read messages between characters. When I finish the session I have a
> chat with you and you absorb that information too. We then use that info to build the next
> session."

So the thing being built is not a log. It is a **corpus with four independent sources**, and they
have deliberately different properties:

| Source | Written by | Tells you | Trust |
|---|---|---|---|
| **Mechanical log** | the machine | what *happened* | objective, complete, dull |
| **Director's log** | the GM, live | what it *meant* | interpretation, and the only source for it |
| **Player journals** | each player, privately | what they *thought* | private; pull-only, never pushed back |
| **In-fiction messages** | players, in character | what they *said to each other* | performance, not testimony |

Plus a fifth, later: the **post-session debrief**, a conversation with me that folds in whatever
the GM did not write down.

Three of these already exist as `accepted` ideas — `chat-log-knowledge-base` (structured check
results out of Foundry's chat), `player-and-gm-journals-context-ingestion` (private journals,
harvested by difference since last checked), and the correspondence thread that the terminal's
Messaging app already prototypes. **This section does not propose them. It proposes that they are
one system with one destination**, which is the thing none of them says on its own.

**Never conflate the first two.** The mechanical log is what happened; the Director's log is what
the GM believed it meant. When writing from this corpus, a disagreement between them is
information, not an error to reconcile.

### 10.3 The log bar

This is the heart of it, and the brief was explicit:

> "I always imagined it working where I type in a generic chat box and when I hit enter it gets
> time logged and you get key information about the scene I'm in at the time... I need a simple way
> to record notes, it can do more complex things or in more complex ways but **it needs to be
> instantly accessible and easy to use**."

**The design: one text field, permanently at the bottom of the screen, one keystroke from focus in
any view.** Type. Press enter. Done. That is the entire required interaction, and no feature is
ever allowed to stand in front of it.

**The GM types the meaning; the console attaches the context.** On enter, the entry is stamped with
everything the machine already knows and the GM should never have to write: wall-clock time,
elapsed session time, current episode and scene, mode, round number and whose turn it is if in
combat, which players are connected, and the last several lines of mechanical log. Eight typed
words become a fully situated record.

**Types are an accelerator, never a requirement.** The user chose typed one-line entries, so a
leading token sets the type; typing nothing but a sentence is always legal and produces a plain
note.

| Type | For | Also does something |
|---|---|---|
| *(untagged)* | anything | — |
| `decision` | what they chose, and over what | — |
| `reaction` | what landed, what didn't | — |
| `thread` | opened / closed / deliberately ignored | becomes next session's prep list |
| `anchor` | an Anchor pressed, and how it went | **offers the Resonance adjustment** |
| `setup` | something planted that nobody bit on | resurfaces at a later scene break |
| `npc` | a name, voice or fact improvised on the spot | added to the cast so it stays consistent |
| `rule` | an ad-hoc ruling made at the table | resurfaces when the same case recurs |

The last two are the ones GMs most need and least expect. Improvised NPC details and one-off
rulings are exactly what gets forgotten and then contradicted three sessions later, and both are
one line to capture.

An untagged entry gets a *guessed* type shown as a dismissible chip, correctable with one key and
ignorable entirely. The guess never blocks the enter key, and a session recorded entirely in
untagged sentences is still a good record — I can infer the structure afterwards. **The tags exist
to make the GM faster, not to make the record parseable.** If they ever feel like a form, they have
failed and should be removed.

Two access paths, because "instantly accessible" is the requirement and the console will not always
be the focused window:

1. The persistent bar in the Director's console.
2. A Foundry chat command, so the same entry can be typed into the chat box the GM already has
   open and already has muscle memory for.

### 10.4 What automates, and how loudly

The brief asked for automation of "things which might be tiresome or things that can be **easily
and reliably** automated." That qualifier is the whole design. Automation that is sometimes wrong
is worse than none, because the GM then has to check it, which costs more than doing it.

So automation is sorted by certainty, and **the console's confidence is visible in how loudly it
acts**:

**Tier A — deterministic, no judgment. Acts silently.**
Multiple attack penalty. Condition value decrements and duration countdowns at end of turn.
Persistent damage and its flat check. Recovery checks while dying. Initiative order and the on-deck
signal. Hit point arithmetic including hardness, resistance and weakness. Resonance band resolving
to actions, reaction and ability tier. Damage state resolving to an action cap. Contact Pool target
for a given quiet morning. DC by level and simple DC. Technician-day arithmetic. Encounter XP
budget. Internal-power duration. Ground-role rotation eligibility, which `ground-roles.json`
already states as a rule ("nobody should play the same one twice in a row") and which is therefore
something the console can simply offer correctly rather than the GM tracking.

**Tier B — deterministic but consequential. Acts on a confirm, showing its arithmetic.**
Applying damage to a creature. Death, dying and unconscious transitions. Advancing the Contact Pool
by a day. Berserk triggering at Bleed 10. And critically, **anything that changes what the players
see** — `Scene#activate()` pulls every connected client, so it is never silent.

**Tier C — needs judgment. Suggests, never acts.**
Whether a check is warranted at all. Any ad-hoc DC, where the console offers the table value and
the GM overrides freely. Whether an Anchor was affirmed or violated. Whether a player is
Suppressing, which requires reading intent and is explicitly a judgment about a person. Casualty
outcomes. Every pacing decision.

The line between B and C is the line between arithmetic and meaning, and it should be visible in
the interface, not just in this document.

**Proactivity is bounded by the user's answer: silent during a scene, offers at scene breaks.**
What it offers at a break: an Anchor untouched for several scenes, a `setup` nobody has taken,
pacing against the session bar, a Frame that will not be deployable next Contact. The one standing
exception is a small always-visible pacing readout, because that is ambient rather than an
interruption — and Law 14 already allows only two interruptions, neither of which is a suggestion.

### 10.5 The layout

The brief settles the shape:

> "The interface is a Foundry VTT module, so I can be looking at the admin version and players
> could be looking at a separate version. Given the amount of information it needs to impart it
> probably needs to be full screen."

Two consequences. First, **GM-only is structural, not careful** — Foundry already renders different
views per user, so the Director's console is simply never constructed for a player, and nothing
reaches a player except through a deliberate push (activating a scene, pulling users to a view,
issuing a check, revealing a document). Secrets are safe by construction rather than by the GM
remembering what is on screen.

Second, full screen. But a GM still needs the map at full size during tactical combat, so this is
**one console at two densities**, not two consoles:

- **Director view** — full screen, three columns. For prep, social scenes, between-scene work,
  campaign state, and anything information-heavy.
- **Table view** — map dominant, board collapsed to a strip. For tactical combat where tokens are
  being moved.

One key toggles them, and **the log bar is present in both**, because "instantly accessible" has to
survive the toggle.

```
┌── TOPRAIL ─── episode · scene · wall clock · session progress ─────────────┐
├────────────────┬────────────────────────────────┬──────────────────────────┤
│ BOARD          │            STAGE               │ DRAWER                   │
│                │                                │                          │
│ ── FRAME ────  │   the map — expands to full    │  one of:                 │
│ ▸ Frame 04  ▓▓ │   width in Table view          │   · active creature      │
│   Claimant  ▓▓ │                                │   · scene prep + cue     │
│                │   or, out of combat, the       │   · rules search         │
│ ── PERSONNEL ─ │   scene as the players see     │   · cast + dialogue      │
│   Cand 01   ▓  │   it right now                 │   · campaign state       │
│   Cand 03   ▓  │                                │   · log history          │
│                │                                │                          │
├────────────────┴────────────────────────────────┴──────────────────────────┤
│  19:47 · scene 4 · round 3 · Frame 04 on turn                              │
│  ▸ ______________________________________________________________   ⏎      │
└────────────────────────────────────────────────────────────────────────────┘
```

These are the same zones the player console uses, with different tenants — *who else* becomes the
board, *what I face* becomes the stage, *what I may do* becomes the drawer. That is deliberate:
§7's stable-zones rule is what lets a GM who has used the player console already know where to
look.

### 10.6 The board

One row per combatant, in initiative order, always visible in both densities:

`⟨init⟩ ⟨name⟩ ⟨HP⟩ ⟨conditions as chips⟩ ⟨damage entry⟩`

with campaign extensions per row type — a Frame also shows damage state and its resulting action
cap, a pilot shows Resonance band, and a kid on a Frame-scale map shows their clock rather than an
AC, because by §11 of scale-and-chassis they cannot be Struck at all.

**The board is grouped by scale, with a visible divider**, which is how Law 8 survives contact with
a shared initiative order. Frame-scale and personnel-scale combatants share an *order*; their
*numbers* never sit adjacent. This is the one place the two scales legitimately appear on one
screen, and the grouping is what keeps it honest.

Rows show what the *party* knows, not what the GM knows, so an unidentified creature reads as
unidentified. That is not only a screen-sharing safeguard; it is also the answer to "have they
learned this yet," which is otherwise a question the GM has to hold in their head all session.

### 10.7 The drawers

Context-swapped, one at a time, in the right column:

- **Active creature** — its routine with the multiple attack penalty already applied per attack,
  its abilities, its reaction, and a tactics line stating what it *wants*. A GM should never be
  reading a stat block and doing subtraction.
- **Scene** — prep for the current scene and the episode's scene list, each with a cue button.
  Cueing is `Scene#activate()` with one of the thirteen native `canvas.transition` effects, all of
  which the module design already confirmed need no custom code.
- **Rules** — a search box over the 205 locally mirrored SRD articles in `reference/srd/`. This is
  buildable today and answers the rulebook's own first-listed GM priority, *answering questions
  quickly and decisively*. Results are short, with the page citation, because a GM mid-scene needs
  an answer and a reference, not an article.
- **Cast** — NPCs, and for important conversations the dialogue panel already specified in
  `ideas/entries/dialogue-management-panel.json`: player goals, the NPC's goals, hard lines they
  will not cross, what is coercible, and a list of subjects each with a DC and one-click
  degree-of-success recording. Those recorded outcomes are log entries like any other.
- **Campaign** — the slow clocks. Contact Pool, Frame damage states, technician-days, Bleed,
  Anchors, casualty track, Time Economy. Director Mode already prototypes four of these.
- **Log** — the full history, filterable by type and scene. The review surface, and where a
  post-session pass happens if the GM wants one.

### 10.8 End of session

An explicit action, because the corpus needs a boundary to be useful:

1. Close the log and stamp the session.
2. Generate a digest — the mechanical summary, every Director's-log entry, and a diff of campaign
   state from session start to session end.
3. Harvest the player journals by *difference since last checked*, which is the mechanism
   `player-and-gm-journals-context-ingestion` already specifies, and which per
   `design/foundry-module-design.md` §4 must be **GM-triggered and Foundry-to-repo only** — private
   journal content is never pushed back or overwritten.
4. Land it in `storage/harvest/`, where the existing sync path already collects it.

The digest is then the thing the post-session conversation starts from, rather than the GM trying
to reconstruct four hours from memory while talking. **Proposed home in the repo:
`data/sessions/<date>.json`** — distinct from `data/episodes/`, because an episode is what was
planned and a session is what happened, and the whole point of this corpus is that those differ.

### 10.9 What this resolves

`ideas/entries/campaign-managing-system.json` is currently `new` and openly unsure whether it is a
real build item, saying it is "worth revisiting once a couple of the more concrete pieces actually
exist, to see if an umbrella is still needed or if it naturally falls out of the director's panel
work already designed."

**It falls out.** The Director's console *is* the umbrella: the dialogue panel is a drawer, journal
ingestion is a step in end-of-session, the chat-log scrape is the mechanical log, and scene-by-scene
planning is the Scene drawer. That idea does not need a separate build, and this section is what it
was waiting on. The status is left for the user to set rather than flipped here.

---

## 11. Open questions — the user's calls, not mine

**Settled 2026-09-06:** the Director's console is full-screen and GM-only, relying on Foundry's own
per-user rendering; narration is one always-available chat box that stamps its own context; entries
are typed one-liners with tags as an optional accelerator; and the console stays silent during a
scene, offering what it noticed at scene breaks. Those four are recorded in §10 and are closed.

Still genuinely open:

1. **How much automation is wanted?** §10.4 sorts automation by certainty, but the underlying
   question survives: does the console *roll*, or only display correct numbers while humans roll?
   The mechanical log is far richer if rolls flow through the system, which argues one way; the
   pleasure of rolling your own dice argues the other. A middle path exists, and it is probably the
   answer — the GM issues checks as `@Check` buttons, players click them, and the chat log is
   scraped, which captures everything without taking anyone's dice away.
2. **Does a raw roll count?** If a player types a plain roll command instead of clicking an issued
   check, the log gets a number with no context. Chase those, ignore them, or ask the GM to
   attribute them at the next scene break?
3. **Do the players know their journals are read?** The corpus in §10.2 includes private player
   journals, ingested to help write future episodes. That is a social question rather than a
   technical one and should be answered deliberately, not by default. It runs from telling them
   plainly, through per-player opt-in, to only ingesting entries a player marks as shareable.
4. **Does the log bar replace Foundry's chat or sit beside it?** §10.3 proposes both a dedicated bar
   and a chat command. If the chat command alone is enough, the bar is redundant and the screen gets
   simpler.
5. **Does the ground crew get a console of their own?** The five Ground Roles have real agency but
   no combat vocabulary. Their interface is closer to a Director's board than to a pilot's sheet,
   which would make it a *third* shape.
6. **Is Bleed player-visible?** Still `pilotVisibility: null` in config, still an open question,
   and it decides whether Bleed appears on the pilot's own permissions plate or only on the
   Director's board.
7. **One console for kid and Frame, or two?** Law 8 says never mix the scales in one readout. §10.6
   answers it for the Director's board, by grouping rows by scale under a single initiative order.
   It does not settle the player side.
8. **How much of this belongs in Foundry's own UI versus ours?** Some of these obligations —
   initiative, damage application, chat — are things Foundry and the sf2e system already do.
   Replacing working machinery has a cost, and this document deliberately does not assume we should.

---

## 12. How to use this document

- Before adding anything to the chassis, check it against **Law 13**. Most things belong in the
  terminal.
- Before defending a layout, check it against **Law 7**. If a Tier 1 action is not the biggest
  thing on screen, the layout is wrong regardless of how it looks.
- Before adding a GM feature, check it against **Law 15**. If it asks the GM to do bookkeeping as a
  task of its own rather than as a side effect of running the game, it will not get used.
- Before automating anything, place it in one of **§10.4's three tiers** and let that decide how
  loudly it acts. If you cannot place it confidently, it belongs in Tier C as a suggestion.
- When this document and `design/visual-identity.md` disagree, this one wins, and the disagreement
  should be recorded in both.
- When a claim here turns out to be wrong at a real table, change it here first, then change the
  UI. A lodestone that quietly diverges from practice is worse than none.
