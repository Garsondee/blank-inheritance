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

## 10. Open questions — the user's calls, not mine

1. **How much automation is wanted?** This doctrine argues the interface should own the arithmetic.
   The far end of that is the console rolling and applying everything; the near end is it only
   *displaying* correct numbers while humans still roll dice. Both are consistent with the thesis.
   Where on that line?
2. **Does the ground crew get a console of their own?** The five Ground Roles have real agency but
   no combat vocabulary. Their interface is closer to a GM board than to a pilot's sheet, which
   would make it a *third* shape.
3. **Is Bleed player-visible?** Still `pilotVisibility: null` in config, still an open question,
   and it decides whether Bleed appears on the pilot's own permissions plate or only on the
   Director's board.
4. **One console for kid and Frame, or two?** Law 8 says never mix the scales in one readout. It
   does not settle whether that means two modes of one console or two separate objects.
5. **How much of this belongs in Foundry's own UI versus ours?** Some of these obligations —
   initiative, damage application — are things Foundry and the sf2e system already do. Replacing
   working machinery has a cost, and this document deliberately does not assume we should.

---

## 11. How to use this document

- Before adding anything to the chassis, check it against **Law 13**. Most things belong in the
  terminal.
- Before defending a layout, check it against **Law 7**. If a Tier 1 action is not the biggest
  thing on screen, the layout is wrong regardless of how it looks.
- When this document and `design/visual-identity.md` disagree, this one wins, and the disagreement
  should be recorded in both.
- When a claim here turns out to be wrong at a real table, change it here first, then change the
  UI. A lodestone that quietly diverges from practice is worse than none.
