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

*(Cut 2026-09-20: this subsection's case that the campaign expresses power as permission rather
than bonus, which rested on Resonance and on the two-scale model's untargetable kids. Removed from
this document 2026-09-25.)* The question it ended on still governs the player console (§4,
Law 10): *what may I do right now, and what will it cost?* If a player has to ask that question
out loud, the interface has failed.

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

*Obligation:* the interface must never show one Strike button and expect a human to subtract. This
is mechanical, certain, changes mid-turn, and is the single most common arithmetic error at real
tables. **The sf2e system already computes it** as real strike variants (§11), so the obligation on
us is to give those variants a large, fixed home — presentation, not computation.

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

### Damage caps actions

Degraded caps a Frame or vehicle at **2 actions**; Critical caps it at **1**; Hulked is 0. This is the
lever chosen to make machines feel different from people: a kid never loses actions to damage; a Frame
does. *(Recorded in `config.json`'s `frameEconomy.damageStateEffects`. It comes from the retired
two-scale design and hasn't been re-confirmed since lockstep; `open-questions.json#frame-damage-action-caps`.)*

*Obligation:* the action tray must show the *real* current budget and, on demand, *why* it is what
it is. "2 actions — Degraded" is a complete explanation. Three greyed pips with no reason is not.

### Some things cannot be rolled, so they must be clocks

The Contact Pool runs on quiet mornings. The session bar we already built is a countdown.

*Obligation:* **the clock is a first-class interface component**, not ad-hoc text. Several
unrelated systems in this campaign resolve into "a stated number of rounds/days remaining," and
they should all render the same way so players learn to read one thing.

### Downtime is the segment mechanic — the same system GitHub issue #109 was asking about

An earlier draft of this section called downtime "a menu with a visible budget of 2." That was too
small an idea, and it turned out to already have a name: the sign-up/multi-group/time-segment
mechanic from an early session-flow draft (tracked as GitHub issue #109; the draft itself was retired
on 2026-09-25 once this section and the built scene set had absorbed it), which that issue's own
text says has "no existing mechanical precedent anywhere in this repo." Confirmed as one system,
not two related ones, on 2026-09-06 — the full procedure #109's open questions were waiting on:

> "The players will always be given more options of what to do in a time slot than they have
> actions available to do those things. Some activities should always be available during the day
> like repairing your frame, attending school lessons, certain fun or useful activities and
> alongside all of these will be important encounters that either are specific to a student or an
> event that the whole group needs to attend to progress the story... The idea more than anything
> is to allow the group to split up and do different things during the day and then once everyone
> has locked in their answers I'll go through them in a logical order, doing the content and RP for
> those events one by one, ticking them off as complete and logging what happened afterwards, once
> we've gone through the entire group we'll have finished a time segment, the display will rotate
> around, gong noise/ticking grandfather clock noise, then a banner header will declare in bold
> impressive type 'Day 6: Tuesday - Morning'..."

That single description, plus four follow-up answers the same day, replaces everything the earlier
draft of this section guessed at.

#### Four independent properties, not four fixed kinds

The first draft of this section modelled activities as a closed enum of four kinds. Asking directly
whether operations and personal missions are quarter-windowed like school events got the answer
**"depends on the scene"** — and surfaced a shape this document hadn't separated out at all: combat
encounters, and "almost all combats," default to **mandatory, whole-group**, sometimes at a
required time and sometimes at a time the group chooses. A fixed enum can't hold that; four
independent properties every activity carries can:

| Property | Values | Decides |
|---|---|---|
| **Mandatory?** | yes / no | Law 21 — must be visually unmistakable if yes |
| **Costs a slice?** | yes / no | Law 20 — the test is passive vs a real event, never "is it mandatory" |
| **Scope** | one player / a chosen subset / whole group | who's pulled into the resulting scene |
| **Timing** | fixed quarter(s) / open until it expires | how it renders on the ring |

**Mandatory and slot-consuming are two different tests, not one — Law 20.** The test that actually
decides whether something costs a slice, settled 2026-09-06 in these exact words: *"If it's truly
passive then no time is used, but if it's a real event/encounter/activity then it has to take a time
slot."* A mandatory thing can be free (a broadcast nobody can skip, but nobody has to *do* anything
about it) or slot-consuming (a forced Summons that spends a slice on the player's behalf, not one
they chose to spend). Never conflate the two questions in the interface.

**A mandatory event must be visually unmistakable before it's opened — Law 21.** The user's own
lead-in to the whole taxonomy: *"we want to make sure that these mandatory events are easy to
understand as such."* Not a footnote — a standalone requirement.

The four names this document already uses stay, as vocabulary for the table rather than as an
enum the data model enforces — the common combinations of the properties above:

| Common shape | Mandatory | Costs a slice | Scope | Timing |
|---|---|---|---|---|
| **Standing activity** — Frame repair, school | no | **yes**, confirmed over free/background | one, or several who picked the same thing | fixed — **school is morning and afternoon only**, corrected from the brief's own looser first wording |
| **Scheduled scene** — an operation, a personal mission | no | yes | one or a subset, the GM's call per scene | **either** — some operations have a required time, others are open until they expire |
| **Story event / most combat encounters** | **yes** | yes, if it's a real event | **whole group**, the default for combat | either, set per scene |
| **Witnessed moment** — a conversation, a news report | usually | **no** | whole group | the story's own schedule |

**A surprise can override a commitment.** *"Some events will be surprises that prevent optional
activities"* — a mandatory story event landing on a segment where a player already locked something
in can bump that choice out. Per Law 19's own standard, the override must be shown, not silently
substituted: a player should see that their Frame repair got bumped by the Summons, not just find a
different scene waiting when the segment resolves.

#### Four discretionary slots, not two

Corrected 2026-09-06, superseding `config.json`'s existing `discretionarySlicesPerDay: 2`
(`data/campaign/config.json` now updated to match, with a note on why): *"There are four
discretionary slots during the day and players will always be able to pick which ones they want to
take part in."* The old number predates the four-quarter day ring this session designed; now that
the day has a real shape, the natural granularity is one real choice per quarter — every quarter is
live, not two "real" ones and two dead ones.

#### Working without rest gets visibly harder, then involuntary

A genuinely new mechanic, confirmed 2026-09-06, that gives "always available" a real cost of its
own:

> "night activities could have negative effects because working all the way through the day with no
> rest period should trigger a test to see how tired the character is and that test should simply
> get harder each segment until they either sleep or fall unconscious and lose the time slot."

**The structure is settled; the numbers are not, and this document does not invent them.** Each
segment worked without resting makes the next fatigue check harder than the last; failing enough of
them ends in involuntary unconsciousness and the loss of that segment's slot — the character
doesn't choose to stop, the fiction stops them. Per Law 19, the rising difficulty must be visible
*before* it forces a rest, never discovered at the moment someone drops. The nearest real rule, for
grounding rather than for numbers: PC2E's own exploration rules already give an unrested character
`fatigued` at 16 hours (`reference/srd/player-core/489-exploration-mode.json`, PC p. 432) — this
homebrew escalates past that flat threshold into a real per-segment curve with no RAW precedent,
exactly what Law 16 says to automate hardest once it has real numbers. **Tracked as an open
question** (`fatigue-escalation-formula`, `data/campaign/open-questions.json`) rather than guessed
at here — including which save it uses; Fortitude is the likely fit given how this SRD already
handles endurance, but that's a proposal, not a decision made in this document. A concrete proposal
now exists — a four-stage Exhaustion track built entirely from real conditions (Fatigued → +Slowed
1 → +Stupefied 1 → Unconscious), plus a DC-15-escalating-by-5 Fortitude check — in
[`design/downtime-activities.md`](downtime-activities.md) §1. Still a proposal, not resolved here.

**Rest is a real menu with real payoffs, not a fallback.** Confirmed the same day, stated with real
enthusiasm: resting is "both legal and encouraged," and different rest *types* carry different
SF2E-relevant bonuses — a quiet option that recovers more HP, hospital care that targets HP and
clears debuffs specifically, going out with friends for a social-side bonus, "a whole host" more.
**This document does not invent that roster.** It's explicitly future collaborative design, not
something to fill in to look complete — the same standing rule CLAUDE.md already states for the six
kids' names, applied here to rest types. What the interface needs regardless of the final list:
rest spends a slice like any other choice, presents as a **sub-menu** of named options rather than
one generic button, and — reasonably, though not yet confirmed — is likely what resets a climbing
fatigue check back down. **Tracked as an open question** (`rest-activity-roster`, same file),
linked to the fatigue question above since the two are clearly related. Three named starting
options, each grounded in a real rule (Long-Term Rest's doubled HP recovery, Treat Wounds, and a
social-check bonus for the social option), are proposed in `design/downtime-activities.md` §2 —
still a proposal, not a lock.

#### Commit, then resolve — a real two-phase gate, not a queue

**Phase 1 — commit.** Every player locks in their choice for the segment independently, before the
GM opens any of them. Nobody is pulled into a scene while others are still deciding.

**Phase 2 — resolve.** Once everyone has committed, the GM works through the locked-in list one at
a time — a real scene, full RP, closed with the scene-close dialogue (§10.3a) — and each closure
logs itself for free (§10.3), the same mechanics already designed for any other scene. "Ticking them
off as complete" is a literal UI requirement, not a metaphor.

**Identical picks resolve as one scene**, confirmed 2026-09-06 over resolving each player
separately: if three players commit to the same lesson, the GM runs it once, live, with all three
present — one scene-close dialogue, one outcome, one log entry, participants listed together. This
is a real data-model consequence: a committed instance is keyed by *(activity, segment)* with a
**set** of participants, not one row per player.

**The GM's resolution queue is pre-sorted, not a flat list**, confirmed 2026-09-06 — story-mandatory
first, then personal missions, then shared/group activities, as a default the GM can freely
reorder. The system suggests; it never locks the order in.

**Segment complete → the ceremony.** Once every committed item is resolved, the transition is worth
designing as a real moment, not a state change: the display rotates, a sound cue plays — a gong, or
a ticking grandfather clock — then a bold banner declares the new moment, *"Day 6: Tuesday —
Morning,"* visible to the whole table, not the GM alone. This is the day ring's own rotation (§7a)
made literal — advancing one quarter *is* this ceremony, not an animation bolted on beside it. See
§7a for where it lives and what it reuses.

#### Scope: the whole campaign, confirmed

Settled 2026-09-06, closing #109's own first open question directly: this mechanic runs for the
**entire campaign** — the hand-authored episodes and the procedural Contact Pool phase alike. The
Contact Pool stays exactly what it already was: a separate, independently-firing daily trigger
deciding *whether* a Claimant shows up, layered on top of downtime rather than replacing how
downtime itself is spent.

*Obligation, and it is a substantial one:* the interface must make **six things visible at once** —
what is on offer, which quarters it's eligible in, whether it costs a slice, what expires soonest,
what it costs to let something lapse (Law 19), and whether it's mandatory (Law 21, and visually, not
just in a tooltip). Miss any one of those and the mode stops being a decision and becomes a guess.
Rising fatigue (above) is the seventh, on the player's own permissions plate rather than the ring.

*Data this needs and does not have.* `episode.schema.json`'s scene shape currently carries only
`order`, `title`, `description` and refs to an encounter, challenge or subsystem. This mechanic
implies at minimum: a `kind` (the common shapes above, as a label, not an enum the code branches
on), independent `mandatory` and `costsSlice` flags (Law 20), a `scope` (one / subset / whole
group), a `timing` mode (fixed quarter(s) or open-until-expiry) with the relevant window or expiry,
a consequence-if-missed, `participants` as a **set** rather than a single assignee (personal
missions happen to always resolve to a set of one), a `visibility` flag (default visible with
content; `private` shows to no one but the participants, per §7a), a resolution-order priority hint
for the GM's queue, and the closed list of outcomes the scene-close dialogue offers (§10.3a). A
character also needs a `segmentsSinceRest` counter and, once the open questions above resolve, a
`restType` the player last took. Also worth noting: `order` presumes a fixed sequence, which is
right for the authored Episode One and wrong for scheduled play, where scenes are offered rather than
sequenced. Designing those fields is a data
task, not this document's, but the interface cannot be built before they exist.

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

**There are exactly two shapes, and there will not be a third.** Confirmed 2026-09-06: *"There are
only two shapes, player and GM."* A player in a Frame and a player on foot are the same kind of
user in different seats — the same person may be in a Frame one scene and on the ground the next,
and that is a costume change (§7b), not a different console. This closes the door on a third shape
being built from either of these two.

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
  (`tools/battle-simulator/DESIGN-LOG.md` §14), so raw footage is actively unhelpful to intuition.
- **Who is present must be listed**, because it cannot be seen. That listing now has a real shape:
  the **Character Card** (`design/npc-social-intel.md`), a GM-toggled popup showing exactly who is
  in a scene, with GM-only full visibility and a player-facing view redacted to only what's been
  learned — Law 11 applied to a person rather than a document.

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
   the Time Economy. These are Director Mode's existing job.

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
│  damage state    │   and why   │  target, AC,  │  Strike  +12         │
│  HP              │   it is 2   │  off-guard?   │  Stride  25 ft       │
│                  │             │  or the scene │  ── tier 2 row ──    │
│                  │             │               │  [ my repertoire ]   │
└───────────────────────────────────────────────────────────────────────┘
```

**Zone contracts:**

| Zone | Encounter | Exploration | Downtime |
|---|---|---|---|
| Who I am | damage state, HP | same, quieter | condition, fatigue since last rest |
| Budget | action pips + reaction | *hidden* | **4 slices, one per quarter** |
| What I face | current target | the scene / who's present | the day ring, and what is on it (§7a) |
| What I may do | Tier 1 + 2 + repertoire | exploration activities + skills | available scenes + Time Economy options |
| Who else | initiative order + on deck | party roster | who else has committed their slices |

Note what the day ring does to the Downtime column. It is not a menu bolted into the "what I may
do" zone; it takes the **dome**, because in downtime the thing you are dealing with *is* the shape
of the day. That is the same rule the dome follows everywhere else, applied honestly.

The dome — the console's most prominent element — always shows **the thing you are currently
dealing with**: your target in a fight, the scene in exploration, the active combatant for a GM.
That is a single rule producing a mode-appropriate answer every time, and it puts the highest-value
information in the highest-value real estate.

### 7a. The day ring

Requested 2026-09-06: *"I like the big circular display, we should put a ring divided into four
sections around this circle which tracks the current time of day, day's being split into four
sections, morning, noon, evening, night."*

The dome gets a **ring divided into four quarters — morning, noon, evening, night — with the
current quarter lit.** It is a good fit for more than decoration, because two of the campaign's own
systems are already keyed to the day rather than the hour:

- The **Time Economy** gives one discretionary slice per quarter, four a day (§3) — the ring isn't
  adjacent to that resource, it *is* its shape: what's committed and what's still open can be seen
  at a glance instead of tracked on paper. This turns a resource that used to live only in a config
  file into something a player can *look at* while deciding.
- The **Contact Pool** rolls on quiet *mornings*, with Contact forced from the eighth. A ring that
  knows what quarter it is knows when that roll is due.

**And it is the board the scheduling game is played on.** Given §3's time-of-day scenes, the ring
stops being a readout and becomes the primary downtime interface. Available scenes sit against the
quarters they are eligible for, so the shape of the day and the shape of the choice are the same
picture:

- **Each pending scene is a marker on the ring**, placed against its eligible quarters or spanning
  all four if it's open until it expires (§3's `timing` property). A school event sits fixed on
  morning and afternoon only; most operations and personal missions float across the whole ring
  with an expiry badge, because the players choose when.
- **The common shapes read differently at a glance** (§3's table) — mandatory story events most of
  all, per Law 21, distinct enough in the fiction that they should read without a label.
- **Whether it costs a slice is part of the at-a-glance read**, not something discovered by opening
  it — a free witnessed moment and a slice-costing scheduled scene must never look the same marker.
- **Urgency is the second visual channel.** How many days a thing has left before it lapses is the
  information that actually drives the decision, so it cannot be buried in a tooltip.
- **Contention is the point, so show it.** Two things eligible in the same quarter, with four slices
  and (usually) more candidates than that, *is* the game. The ring should make a conflict obvious
  rather than letting a
  player discover it after committing.
- **Personal missions are visible by default, with content, to the whole party.** Settled
  2026-09-06: *"Players should be able to see exactly where other players are going unless the
  mission is private/hidden only visible to the player who went."* So the default on every
  player's ring is full visibility of every teammate's pending personal mission, including what it
  is, not merely that one exists — that "something's going on with them" table tension is the
  default experience, not an exception. **Privacy is per-mission, not per-player**: an individual
  mission can be flagged private, and when it is, it disappears entirely for everyone except the
  player who took it — not shown-but-redacted, genuinely absent, the same "removal, not a CSS
  trick" standard the redaction machinery already holds documents to (Law 11). This is a real field
  the schema needs (§3's list gains `visibility` alongside kind/quarters/expiry). On the Director's
  board every mission is visible regardless of its flag, since the GM already runs everyone's.

That also resolves how slices and quarters relate, which was previously open: quarters carry
*eligibility* and slices are the *budget*, so a scene constrains when it can be taken and the four
slices constrain how much can be taken at all. Even at one slice per quarter this stays a real
constraint, not a trivial one: a fixed-window activity can only ever spend the specific quarter's
slice it's eligible in, never a different quarter's — wanting two morning-only things is a real
conflict even with slices to spare elsewhere in the day.

**Two clocks, and they must never be confused.** The ring is the *fiction's* time of day. The
session bar along the top is the *table's* real elapsed evening (§10, and already built). They are
deliberately different instruments in different places: one wraps the dome and moves in four steps,
the other is a thin horizontal bar and moves continuously. Anything that would let them be read as
the same clock is a bug.

#### The ring's own rotation is the segment-transition ceremony

Not a separate feature — the same event, described from two directions. §3 gives the full mechanic
(commit-then-resolve, the ceremony's three beats); this is where it physically happens.

- **The ring turns.** Advancing a quarter is a real rotation of the ring itself, not a value simply
  flipping to the next label — the visual the user asked for and the mechanical beat #109's own
  description ends on are the same motion.
- **A sound cue plays** — a gong, or a ticking grandfather clock — marking the moment distinctly
  from any other transition in the console.
- **A bold banner declares the new moment** — *"Day 6: Tuesday — Morning"* — to the whole table,
  not the GM's screen alone. The chassis already has a chevron-ended banner/marquee system built
  for scene notices (`.bi-banner`, `design/visual-identity.md`); that is the component this reuses
  rather than a new one invented for this one purpose.
- **This is the moment, not a side effect of it.** It fires only when every committed item in the
  segment has been resolved (§3) — the ring does not advance quietly in the background while a
  scene is still being played.

### 7b. Scale is a costume change, not a data filter

Also settled 2026-09-06: *"We might change the UI quite a bit between personnel scale scenes and
frame scale scenes, that would be a lot of fun."*

Take that literally, and the answer to *how* different turns out to be already sitting in the
project. Asked how far apart the two costumes should sit, the user said:

> "Lots. We could have completely unique interfaces with the frame scale one being the current
> design, radar dishes, metal panels. Then the personnel scale we do with a different paper
> aesthetic. That sounds nice."

**Frame scale is GLASS. Personnel scale is PAPER.** Those are not new looks that need inventing;
they are the two type registers `design/visual-identity.md` §1 already established and already
built. The Frame console is the current chassis — radar dishes, metal panels, phosphor, Chakra
Petch and Oxanium. The personnel console is the register the Standing Order documents and the
Medical Report already use — Spectral, Shippori Mincho, Special Elite, stamps, form rows, ruled
paper.

This is the best kind of design answer, because it is free and it means something:

- **It costs almost nothing.** Both registers exist, are tested, and are in the stylesheet.
- **It characterises without a word of exposition.** In a Frame you are inside a war machine. On
  the ground you are a child with a duty folder, a timetable and a form to fill in. The interface
  says which one you are before anyone narrates it.

What still does **not** change: the zones. Muscle memory is the entire reason zones are stable, and
a costume change that relocated the action tray would cost more than it earns. The same information
lives in the same place; it is rendered on paper instead of behind glass.

One thing to get right when this is built, a real risk rather than a hypothetical:

1. **Paper must not lose affordance.** The GLASS register makes it obvious what is pressable. A
   paper aesthetic can quietly stop looking interactive, which would be a direct violation of Law 7.
   Printed forms have their own vocabulary for this — boxes to tick, ruled fields, carbon-copy
   duplicates, rubber stamps landing when something is committed — and that vocabulary should do
   the work rather than pressing glass buttons onto paper.

The transition between the two is worth spending something on, since it is the moment the fiction
changes. Foundry ships thirteen `canvas.transition` effects that cost nothing to use.

⚠ **One named exception, 2026-09-19: the Scene Runner panel and the scene-close dialogue it opens
(§10.3a) are no longer PAPER.** Corrected live, reacting to a screenshot of the NPC gallery: *"We're
not even locked to the paper look. The goal is comprehension and understandability."* Both now use
their own `--sr-*` token system (light/dark, switchable) judged on legibility alone. This is a
narrow, deliberate carve-out for the one surface a GM stares at continuously while running a table —
everywhere else in this section, the GLASS/PAPER split stands as written.

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
8. *(Cut 2026-09-20: never put a personnel-scale number beside a Frame-scale number, the two-scale
   model's rule for its level gap, which lockstep removed. Removed from this document 2026-09-25; the
   number is kept so the laws after it keep their citations.)*
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
16. **Automate hardest the rules we invented ourselves.** A published rule has a rulebook, a page
    number, and a game system that already implements it. Ours has none of those, so for homebrew
    the software is the reference implementation, not a convenience over one. See §10.4.
17. **Confirm anything the players will see.** Not because the console is unsure, but because the
    table cannot un-see it. Activating a scene, revealing a document, pushing a check.
18. **Never recompute what sf2e already computes.** Multiple attack penalty, persistent damage,
    conditions, flanking, off-guard, degree of success and initiative are all in the shipped system.
    Our job for those is presentation. A proposal to recompute one is a bug in the proposal. See §11.
19. **Nothing expires without its cost having been visible first.** If letting a scene lapse debuffs
    a player, they must have been able to see that it would, and roughly when, before it happened.
    A timer whose consequence is only revealed on expiry is a gotcha, not a decision. This covers
    every clock in the campaign, not only scheduled scenes.
20. **Mandatory and slot-consuming are two different tests, not one.** Whether something is
    unmissable and whether it costs a daily slice answer to different rules — passive-vs-real-event
    decides the slice, never "is it mandatory." Conflating the two questions in the interface is a
    bug even when it happens to give the right answer on a given scene. See §3.
21. **A mandatory event must be visually unmistakable before it's opened.** Not discovered by
    reading it, not a subtle border colour — recognisable at a glance: it cannot be one icon among
    twelve, it needs to read instantly.

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
| **Pilot ID / Status** | Becomes the *permissions* plate: damage state and action cap, spelled out. |

### Fix

- **The skill list is wrong.** The Checks pod has ten keys (Per, Ath, Ste, Dip, Occ, Cra, Med, Soc,
  Nat, Pil) — nine skills plus Perception, which is a statistic rather than a skill but is
  correctly a button. SF2E's fixed skill list is **eighteen**: `CONFIG.PF2E.skills` in the
  shipped system, read directly 2026-09-06. (An earlier draft of this section said nineteen,
  counting Lore as one of them. **Lore is not fixed** — lores are per-actor Items that
  surface as extra `actor.skills` entries carrying `.lore`, so the real list is the eighteen
  plus whatever that character happens to have, and must never be hardcoded.)
  The pod is missing nine of the eighteen: **Computers** — a Starfinder signature skill, and
  the one behind Hack and Access Infosphere — plus Acrobatics, Arcana, Deception,
  Intimidation, **Performance**, Religion, Survival and Thievery. Performance was missing from
  the earlier version of this list too.
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

- Per-MAP Strike buttons — **surfaced from sf2e's own strike variants, not computed here.** An
  earlier draft of this document called computing them "the highest-value single change available."
  That was wrong, and checking the shipped system rather than assuming is what caught it: sf2e
  already builds MAP-adjusted strike variants natively (§11). The value was never in the
  arithmetic; it is in giving those variants a large, fixed, unmissable home, which the current
  three-key row does not.
- On-deck indicator.
- The **day ring** around the dome — four quarters, current one lit, and the board that downtime
  scheduling is played on (§7a), including its own rotation as the segment-transition ceremony
  (sound cue, then a bold table-wide banner — reuse `.bi-banner`, don't invent a second one).
- The **scene-close dialogue** (§10.3a) and the **scene board / resolution queue** in the
  Director's Scene drawer (§10.7) — pre-sorted mandatory-first, identical picks pre-clustered.
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
doing, never a job of its own.** When the GM applies damage, that is a log entry. When they cue a
scene, that is a log entry. The mechanical record writes itself in full, for free, because the
console is the thing mediating the actions.

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

**The mechanical track carries a confidence marker, because it will not always be certain.** Rolls
go through Foundry and are read back out of its chat log, per the user's answer on 2026-09-06: *"If
there is a roll, it goes via the Foundry VTT system... If the roll isn't associated with anything
then we just have to guess, if it's surrounded by other people rolling a skill challenge we can
guess. I'll try and fill in the blanks."* So an entry originating from an issued check is certain —
we know who, what skill, against what DC, to what degree, and why. A bare roll typed into chat is
not; we know only who and what number. Between those sits a real middle case worth building for:
**rolls clustered in time during a single challenge can be attributed by proximity**, at reduced
confidence. The end-of-session review surfaces whatever is still unattributed, in a short list, for
the GM to fill in. Confidence is recorded rather than smoothed over, because a guess presented as a
fact is exactly the kind of thing that later gets cited as though it were observed.

**The Director's log is itself attribution evidence, not just a separate stream.** A raw roll with
no attached check and a `reaction`-tagged log entry landing the same minute are not two unrelated
facts about the same moment; the entry is context the attribution pass should use. This costs
nothing extra to build — both already carry timestamps — and it is the difference between "unknown
roll, 14, at 20:03" and "unknown roll, 14, at 20:03, right after 'the guard nearly spots them.'"

**On the player journals, settled 2026-09-06: the players are not told.** The user's reasoning is
that the campaign's premise is surveillance and the players do not yet know it, so disclosure would
spoil the thing the campaign is about. The stated mitigation is that no real personal data goes in:
*"None of them will be using this interface to store real personal data and I'll warn them not to do
that."* Two things follow for the design rather than for the ethics, which are the user's call and
have been made. First, **that warning is a precondition of the feature, not an afterthought** — the
journal should not ship before it is given. Second, the interface should reinforce it by framing
the journal unmistakably in-fiction, as a character's file rather than a personal notes app, since
a field that looks like a diary invites diary content. There is also a pleasing alignment worth
noticing: in a campaign about an organisation that reads your file, a tool that quietly reads your
file is thematically correct.

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

**One surface, deliberately not Foundry's chat**, settled 2026-09-06:

> "I'd rather have a separate interface to the chat log just so that I'm always 100% sure of what
> I'm doing and we can customise this chatlog to do clever things which is easier if we make a
> separate section."

Both halves of that are right, and the first is a safety argument worth stating plainly: a GM
typing private notes into the same box that broadcasts to the table will eventually send a secret
to the table. A separate, visually distinct, GM-only field makes that **impossible by construction**
rather than a thing to be careful about — the same reasoning that makes the whole console GM-only
in §10.5. The second half buys the freedom for entries to be typed, linked, and mechanically live,
which a chat command could never do cleanly.

An earlier draft of this section proposed a Foundry chat command as a second access path. It is
withdrawn for the reason above.

### 10.3a The scene-close dialogue

> ⚠ **PARTLY SUPERSEDED 2026-09-22, by Ingram, reacting to the built dialogue live.** She could not
> finish closing a scene with it: *"Scene close UI has grown so massive I cannot comprehend it and I
> cannot even scroll down to hit accept. This is a dangerous error since it would kill a session."*
> On The Road In the dialogue had grown to roughly sixty-six interactive targets — a completion
> checkbox, four endings, five costs, a notes box and **fifty-five 0-10 rating buttons** (five
> authored prompts × an eleven-button scale) — stacked in one 420px-wide column with the Confirm
> button pushed off the bottom of the screen.
>
> **Two things in this section are now dead, and one governing rule replaces them.**
>
> 1. **"Forced" is reversed.** The required-dropdown gate below is exactly what strands a GM in a
>    popup mid-session, and a gate that can do that is a worse failure than a missing field. The new
>    rule is **one press closes a scene**: a single required verdict, and every other field —
>    ending, carries-forward, notes — optional and incapable of blocking it.
> 2. **The 0-10 reaction scale is cut** (the "fourth capability" paragraph further down). Its
>    content is not: a scene's authored `reactionPrompts` are now the **agenda** for the in-depth
>    session review, recorded verbatim on the log entry when the GM flags a scene, so the questions
>    get asked properly afterwards instead of rated at speed during play.
> 3. **The cost axis is cut too**, for a second and independent reason: three of the seven costs
>    this section named (Bleed, an Anchor violated, and the Frame/technician economy around them)
>    belong to systems CUT on 2026-09-20, so the picker was offering consequences that no longer
>    exist — and the dialogue's footer was reporting "Anchors violated so far" off a dead counter.
>
> **What replaces the accept button: three big buttons at the foot of a wide, height-capped
> dialogue**, Ingram's own set and her own order —
>
> | Verdict | Means | Flags a review? | Table moves on? |
> |---|---|---|---|
> | **Panic!** | Something is going wrong right now. Eventually this reaches an LLM that helps correct things mid-session; for now it records and flags. | yes | **no** — a GM in trouble must not be teleported to the next location |
> | **Note** | Go through this scene in depth in the session review. Its authored prompts become the questions asked. | yes | yes |
> | **Positive** | It went well enough to call done; strong feedback would be manufactured. | no | yes |
>
> Red → amber → green, so the row reads as a severity scale rather than needing to be read as words.
> The layout rule is structural and tested: the body is a three-row grid (head / two columns /
> verdicts) with a hard `max-height`, and the **only** element permitted to scroll is the read-only
> recap inside its own column. Nothing above the verdict row can grow, so nothing can displace it.
>
> **What survives this section unchanged:** the scene boundary as the right moment to capture (the
> reasoning in the next paragraph is still correct — it is only the *amount* asked for that was
> wrong); the free-text notes; Law 15's "advances state, does not merely record", now honoured by
> one real counter (scenes flagged for review, which the review actually consumes) instead of two
> mocked ones; the unspent-setup and `sceneHighlights` recap, which was always the good half; and
> the "not locked to PAPER" register correction at the end.
>
> Current truth lives in `module/blank-inheritance/scripts/core/scene-close.mjs`'s header and
> `test/tier3-scene-close-review-contract.test.mjs`, whose first test is the regression test for the
> off-screen accept button. Read those before changing this dialogue; read what follows as the
> reasoning that got us here, not as the spec.

The log bar handles capture *during* a scene at zero friction. Scene boundaries get the opposite
treatment, and this is the user's own design, given 2026-09-06:

> "When changing scenes we can bring up a dialogue that lets me mark if a scene is complete, if it
> is then I'm forced to select from dropdowns what the result of the scene was. There will also be
> a text box for adding my own notes."

The word doing the work is **forced**. This is the one place in the whole design where friction is
wanted, and the instinct is right: a scene boundary is a natural pause, the GM has just finished a
coherent unit and has not yet forgotten it, and the outcome is the single highest-value piece of
data the whole corpus will collect. Everywhere else the interface gets out of the way; here it
stands in the doorway.

**The dialogue, on cueing the next scene:**

1. **Is this scene complete?** If no, it stays open and carries forward — an unfinished scene is a
   real state, not an error, and the campaign will have plenty of them.
2. **If complete: what was the result?** A small number of dropdowns, required.
3. **Notes.** Free text, optional, into the same log as everything else.

**The dropdowns must be short and identical every time.** Four to six options is a decision; twenty
is a form, and a form at a scene boundary will start getting dismissed by the third session. Two
axes cover most of it — how it ended, and what it cost — with the campaign's own costs as the
second list, since those are the ones that carry forward: casualties, Frame damage,
technician-days, time, or nothing.

**Where the options come from.** For authored scenes, from the scene's own data, so a fight offers
fight outcomes and a negotiation offers negotiation outcomes. The vocabulary itself is the user's
to set and belongs in the schema alongside the other scheduling fields §3 lists as missing. For
improvised scenes there has to be a generic fallback, because improvisation is a first-class mode
here and a dialogue that only works for prepared material would be worse than none.

**And it advances state, it does not merely record.** This is Law 15 at its clearest. Closing the
scene honestly *is* the mechanical act, so there is no separate bookkeeping step afterwards and no
way for the record and the campaign state to drift apart.

This also settles what a scene-break suggestion looks like, which was previously undecided: the
suggestions §10.4 promises — an unspent setup, pacing against the session bar, a scene about to
expire — belong in this same dialogue. It is already the moment the GM's attention
is at a boundary, and putting them anywhere else would mean interrupting twice. **Built and live,
2026-09-19: the unspent-setup suggestion** (`core/scene-close.mjs#openSetups`, cross-scene, newest
first) **alongside a second, related recap this section didn't originally ask for** —
`sceneHighlights()` surfaces the closing scene's own `decision:`/`reaction:`/`thread:`/`npc:`/`rule:`
-tagged log lines right where the GM is about to write the notes a future session gets written from,
so what already got typed live during the scene doesn't have to be re-typed at the close. The other
suggestion, a scene about to expire, remains unbuilt; it depends on the four-quarter Time Economy.
**"Pacing against the session bar" is now actively retired, not merely unbuilt**: it would mean nudging the GM to wrap up on a clock, which the user's
own later standing order explicitly rules out — sessions organise mini-arcs and run until content
runs out, never against a runtime.

**A fourth capability, added 2026-09-19, genuinely beyond this section's original scope: the
reaction-review scale.** Ingram's own request, given reacting to the built dialogue rather than in
the original 2026-09-06 conversation this section quotes: *"every scene carries a complex section
which is designed for this scene closing dialogue to read... try to cover all the likely outcomes of
a scene, we then try to cover some ways the scene might go badly... a simple row of 10 -> 0 number
buttons and the ability to rank how well the group responded to each element... we could also use
the same scale for things like how happy something made the group or how angry another thing made
them."* A scene brief now optionally authors `reactionPrompts` — one sentence per likely outcome, bad
turn, or specific moment worth checking the table's reaction to — and the dialogue renders each as an
0-10 button row (`core/scene-close.mjs#REACTION_SCALE`). One shared scale for every prompt rather
than a separate outcome-picker plus a mood-slider, deliberately: the prompt's own wording carries
what a 0 vs. a 10 means, the same way this section's own dropdown labels always have. A prompt
nobody taps is dropped, not defaulted to zero — silence means "didn't come up," matching how the
setup/highlight recap above already treats an untagged log line. The scored result rides alongside
the log line rather than replacing free-text notes, which stay exactly as this section originally
specified them.

**The visual register is no longer fixed to this document's own §7b split, for this dialogue and the
Scene Runner panel it opens from specifically.** Corrected 2026-09-19, reacting to a live screenshot
of the NPC gallery ("needs a lot of work... pick a high readability and easy to comprehend design...
comprehension is key"), then explicitly overriding §7b's PAPER/GLASS assignment when the obvious next
step reached for it: *"We're not even locked to the paper look. The goal is comprehension and
understandability. Rapid access to information. First order retrieval."* Both surfaces now share a
`--sr-*` CSS custom-property token system (`bi-components.css`) judged purely on legibility, with a
real dark theme (default) and light theme, toggled per-client and persisted
(`foundry/runner-theme.mjs`) so the two can never disagree. §7b's split still governs everywhere
else; this is a named, deliberate exception for the one surface a GM stares at continuously while
running a table, not a reopening of the register question generally.

**One shape, not two flows — but not one uniform weight either.** Asked directly whether a routine
pick like Frame repair skips the dialogue entirely, the answer, 2026-09-06: *"Everything goes
through the same dialogue but we signpost things and automate things where possible."* So every
committed activity — Frame repair included — opens the same dialogue, never a lighter alternate
flow the GM has to learn a second shape for. What differs is how much of it is already filled in
when it opens: Frame repair is squarely something the campaign invented (§10.4's "automate hard"
band), so it can arrive with its outcome pre-selected and the technician-day cost already applied,
needing one click to confirm rather than a real adjudication — while an operation or a story event,
whose outcome is a judgment call, opens genuinely blank. One dialogue shape throughout; §10.4's
existing bands decide how much of it a given activity walks in with already filled.

### 10.4 What automates

The policy is the user's, given 2026-09-06, and it is more decisive than the certainty-based model
an earlier draft of this section proposed:

> "We automate everything that would make the GMs life easier, we automate **anything which we make
> the rules up for**, and we generally automate things which aren't in any way linked to artistic
> choice. I'm a big fan of automation in TTRPG games."

The middle clause is the sharp one, and it is the right instinct for a reason worth spelling out.
**A published rule has a rulebook, a page number, and a game system that already implements it. A
rule we invented has none of those.** For homebrew, the software is not a convenience layer over an
existing reference — it *is* the reference implementation. An un-automated homebrew rule is one the
GM has to remember, explain, and adjudicate consistently across months of play, which is how
homebrew quietly dies at real tables. So the campaign's own inventions get automated hardest, not
last.

That produces three bands, and it happens to line up with what is and is not already built (§11):

**Automate hard, because we invented it and nothing else will.**
Damage state resolving to an action cap. Contact Pool target by quiet morning, and the
forced-Contact ceiling. Frame damage-state track and the shared technician-day pool. Time Economy
slices. Every clock.

**Automate by delegation, because sf2e already does it.**
Multiple attack penalty, persistent damage and its flat check, condition values and their
decrements, off-guard, flanking, degree of success, initiative, hit point arithmetic. All verified
present in the shipped system (§11). Our job here is *presentation*, never computation — and any
proposal to recompute one of these is a bug in the proposal.

**Never automate, because it is an artistic choice.**
Whether a check is warranted at all. Casualty outcomes as narrative. Every pacing decision. The
console may *offer* here — an ad-hoc DC gets the table value pre-filled and freely overridden — but
it never decides.

**One thing still gets a confirm rather than silence: anything the players will see.**
`Scene#activate()` pulls every connected client's view. Revealing a document, issuing a check, and
pushing a handout are all irreversible in the only way that matters, which is that the table has
already seen it. Loudness here is not about the console's confidence in the arithmetic; it is about
the action reaching people.

**Proactivity is bounded by the user's answer: silent during a scene, offers at scene breaks.**
What it offers at a break: a `setup` nobody has taken, pacing against the session bar, a Frame
that will not be deployable next Contact. The one standing exception is a small always-visible
pacing readout, because that is ambient rather than an interruption — and Law 14 already allows
only two interruptions, neither of which is a suggestion.

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

with a campaign extension for one row type — a Frame also shows damage state and its resulting
action cap.

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
  which the module design already confirmed need no custom code. Closing one opens §10.3a.

  🟡 **PARTLY BUILT, 2026-09-09** — `foundry/scene-runner.mjs`, driven by a new
  `scene-brief.schema.json`. What exists: the current scene's prep, the episode's scene list as a
  picker, a tickable beat checklist with real branching, per-NPC conversational briefs (the Cast
  drawer's dialogue panel, below, arrived here first because a GM improvising needs it in the same
  place as the beats), a visible clock, and staged handout reveals. What does not: the cue button,
  the scene board's pending/expiry half, and the resolution queue.

  ⚠ **Two departures from this section, both deliberate, both Ingram's call.** It is a **left**
  drawer, not this column layout's right one — the right belongs to Foundry's own sidebar, which
  this module has a standing policy of not fighting — and it sits beside the existing command bar
  rather than inside a full-screen three-column console, so §12's settled "full screen" answer is
  now "full screen eventually, a drawer today". It is also **all PAPER**, where the rest of the
  console is glass; see §12's answered question 3 for what that turned out to teach.

  **REBUILT 2026-09-24 as a wide, columned drawer** (Ingram: *"Reconsider it carefully... it needs
  to be wider to get more contents on screen and so the actual 'scene' part will have to shrink for
  the GM again"*; her screen is 4K at 150% display scaling, a 2560px page, where the old 560px cap
  made the runner a strip down a fifth of it). What it is now, and why:
  - **Width**: about 43% of the window by default (`--bi-runner-width`), draggable at its right edge,
    remembered per GM as a share of the window, double-click to reset. Never so wide the canvas can't
    hold the deck. Foundry's left column, the stage portraits, the session rail, the console window and
    a staged scene's camera all fit themselves beside it — the camera now covers the band the GM can
    see, centred there, instead of leaving the middle of the room behind the drawer.
  - **Layout**: a header that never scrolls (scene, clock, required-beat segments, the episode's
    running order as numbered steps with this scene and the next named, the rooms, Close this scene),
    then columns chosen by the drawer's own width (container queries): the *script* (goal, opening,
    running order, ending, Close this scene again at the foot), the *people* (who is on stage now with
    a way to take each off, the clock, the temptations, a card per cast member) and the *kit*
    (handouts, things to keep, summon anyone, the rules search), then the note bar.
  - **One line per beat, the beat being run open** — the "one actionable line, detail peekable
    underneath" shape settled on 2026-09-09, which the old panel never delivered (it printed every beat
    in full). The "now" marker follows the GM: the beat they last acted on, else the one it was on
    while still live, else the next live beat after the last one ticked. The opening opens itself until
    something has happened; the ending opens itself once every required beat is done.
  - **Each degree of success shows its authored consequence**, pressed to record it. Every one of the
    64 checks in the data has per-degree outcome text; the panel had never shown any of it.
  - **Rolls come back by themselves.** Every check the runner posts carries a roll option naming its
    brief and beat; the result a player rolls from it records itself against that beat when nothing is
    recorded yet (never over the GM's own call), every result is listed on the beat, and any can be
    used instead with one press. This is §11 applied: sf2e computes the degree, the runner only reads it.
  - **Moved 2026-10-05 (D061): a check is a pill in the beat's own words, and runs in the check
    console.** Ingram: *"a dedicated UI that opens up when a skill check is required ... the dialogue is
    per challenge, but allows a range of different solutions to that challenge."* The card above (the
    outcome buttons, the per-player rows, the list of rolls, the by-skill notes, the tally) is gone from
    the drawer; all of it lives in the console (`foundry/check-console.mjs`, `core/check-console.mjs`,
    `core/check-pill.mjs`), built from the deck's own hardware: the DC on a knob whose scale is banded
    by how hard each DC is for the party's level, the ways as pill keys, and a bank of six tall lights
    along the bottom, lit in each result's colour as it lands (D062, which replaced D061's gems); each
    player's own window has the same bank, with the ways as their skill keys. Rolls still record
    themselves against the beat by its tag, exactly as above.
  - **The person the current beat is about opens beside it**, with their voice and lines.
  - **Clocks can be moved by hand** (+/−, clamped to the pool), read against their ceiling when they
    fill up, and name the threshold now in force and the next one coming (Law 19).
  Full reasoning in `scripts/core/runner-view.mjs` and the header of `templates/runner/panel.hbs`;
  pinned by `test/tier1-runner-view.test.mjs` and `test/tier3-scene-runner-rebuild-contract.test.mjs`.
  This drawer is also the **scene board**: every pending scene the players have not taken, with its
  kind, its eligible quarters, its expiry and who it belongs to (§3). The player's day ring shows
  them their own choices; this shows the GM the whole board, including what is about to lapse and
  what that will cost — which is the information a GM needs to decide whether to let it lapse or
  push it back in front of them. Once every player has committed for the segment, this same drawer
  becomes the **resolution queue** (§3): the locked-in list, pre-sorted mandatory-first, identical
  picks already clustered into one entry with their participants listed together, each row opening
  straight into the scene-close dialogue and disappearing from the queue — not the board — once
  ticked off. The queue emptying is what fires the segment-transition ceremony (§7a).
- **Rules** — a search box over the 205 locally mirrored SRD articles in `reference/srd/`. This is
  buildable today and answers the rulebook's own first-listed GM priority, *answering questions
  quickly and decisively*. Results are short, with the page citation, because a GM mid-scene needs
  an answer and a reference, not an article. **Superseded 2026-10-04 (D060):** Ingram found the box
  little use ("The rules search box isn't very useful either"), because it asks the GM to think of
  the word first. The Runner now offers **Rules in this scene**, every rule the scene's own words
  name (its fight's creatures, the conditions and actions its beats, checks and clock mention, SRD
  rules such as difficult terrain), each one press to the system's own card or the article
  (`core/scene-rules.mjs`, generated glossary `data/rules-glossary.json`). The free search moved to
  the Palette, where the GM already types: `rule flanking`.
- **Cast** — every NPC's **Character Card** (`design/npc-social-intel.md`): full-visibility Facts
  list, current Attitude, and the reveal control that marks a Fact learned. For important
  conversations, the same card opens straight into the dialogue panel already specified in
  `ideas/entries/dialogue-management-panel.json`: player goals, the NPC's goals, hard lines they
  will not cross, what is coercible, and a list of subjects each with a DC and one-click
  degree-of-success recording. Those recorded outcomes are log entries like any other, and a
  revealed Fact is too, via the log bar's existing `npc` tag.
- **Campaign** — the slow clocks. Contact Pool, Frame damage states, technician-days, casualty
  track, Time Economy. Director Mode already prototypes three of these.
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

## 11. What Foundry and sf2e already do

Settled 2026-09-06, and it governs everything above:

> "This module will just interface with Foundry VTT. The more things we do via Foundry VTT and SF2E
> the less we have to worry about ourselves. What we are building here is just the prototype, a
> quick way to see what the experience would feel like for players and GM, before we build the
> working version in Foundry."

### The prototype is for feel, not for function

`design/ui/` is a **feel prototype**. It exists to answer "is this the right experience" before
anyone builds the real thing inside Foundry. That changes how it should be judged: the question is
whether it conveys the experience, never whether it is production-ready. It is allowed to fake
anything, and faking is cheaper than the real integration by a wide margin.

It also means the prototype should not grow a second implementation of anything Foundry owns. When
in doubt, mock it convincingly and move on.

### What the shipped system already provides

Checked directly against the local `gamesystems/sf2e/` tree rather than assumed. All of the
following are present in the shipped bundle:

| Already implemented | Evidence |
|---|---|
| **Multiple attack penalty**, as real strike variants | `attackNumber` → `mapIncreases`, and `map:increases:N` roll options |
| **Persistent damage** | ~423 references, by far the densest of these |
| **Off-guard** and **flanking** | ~151 and ~43 references; flanking is detected, not hand-flagged |
| **Conditions**, including valued ones | a `ConditionManager`, plus named conditions such as frightened |
| **Degree of success** | ~43 references |
| **Initiative and combatants** | ~200 and ~88 references |
| **Flat checks** | ~15 references |

Those are grep counts against a bundled file, so they are evidence of presence rather than a map of
the API. That is enough for the decision they inform, which is *do not rebuild this*.

And from Foundry itself, all previously verified in `design/foundry-module-design.md`: the
`@Check[skill|dc:N]` inline enricher (confirmed against 1,586 real uses in the shipped compendia),
`Scene#activate()` and `pullUsers()`, thirteen native `canvas.transition` effects, native
Scene-to-Playlist binding, per-user document permissions, and a `storage/` directory that survives
module updates.

**Almost everything this document asks for on the RAW side already exists.** The player console's
job for those is to give them a better home, not a second implementation. That is Law 18, and §10.4
sorts automation accordingly.

### What only we can build

Everything the campaign invented, because nothing else will ever implement it: the Frame
damage-state track and its action caps, the shared technician-day pool, the Contact Pool, False
Contact types, the Time Economy and the day ring, and the whole Director's corpus in §10.

Plus the look, which is `design/visual-identity.md`'s job and is not a thing any system ships.

That is a short list against a long one, and it is the correct division. It is also why §10.4
automates the homebrew hardest: it is the only part where we are the reference implementation.

---

## 12. Open questions — the user's calls, not mine

**All sixteen questions this document has raised are now answered.** They are recorded in the
sections they govern; this is the index, so that nothing gets silently re-litigated.

| # | Question | Answer | Where |
|---|---|---|---|
| 1 | Full-screen or docked? | Full screen, GM-only, using Foundry's per-user rendering | §10.5 |
| 2 | When is narration captured? | One always-available box; type and press enter | §10.3 |
| 3 | What shape is narration? | Typed one-liners, tags optional, never a form | §10.3 |
| 4 | How proactive? | Silent during a scene, offers at scene breaks | §10.4 |
| 5 | How much automation? | Everything not an artistic choice; homebrew hardest | §10.4 |
| 6 | Does the console roll? | No. Rolls go through Foundry and are read back out | §10.2 |
| 7 | Do raw rolls count? | Best-effort attribution by proximity; GM fills the blanks | §10.2 |
| 8 | Are players told journals are read? | No — the premise is surveillance and they do not know it | §10.2 |
| 9 | Log bar or Foundry chat? | A separate GM-only surface, so a secret cannot be broadcast | §10.3 |
| 10 | Does any seat get a third shape? | No. Two shapes only, player and GM | §4, Law 10 |
| 11 | Is GM-only data player-visible? (Asked about Bleed, cut 2026-09-20.) | Not initially — build visibility as a switch, not an assumption | below |
| 12 | One console across scales, or two? | One, but scale is a visible costume change | §7b |
| 13 | What does a scene break look like? | ~~A forced scene-close dialogue~~ — REVISED 2026-09-22: a wide, height-capped dialogue closed by one of three verdict buttons (Panic!/Note/Positive), with the ending, carries-forward and notes all optional | §10.3a |
| 14 | How far apart are the two costumes? | Far. Frame scale is GLASS, personnel scale is PAPER | §7b |
| 15 | Do slices map to quarters or float? | Quarters carry eligibility, slices carry the budget | §7a |
| 16 | Do other players see a teammate has a personal mission? | Visible with content by default; a per-mission `private` flag hides it from everyone but the assignee | §7a |

Three of those carry a consequence worth stating on its own:

- **GM-only data is "not visible to players *initially*."** That word is doing work. Build
  per-datum visibility as a **switch**, so that changing the answer later is a configuration change
  rather than a rewrite. The answer was first given about Bleed, cut 2026-09-20; it applies to
  anything currently GM-only.
- **Kids and Frames are interchangeable seats, not different characters.** *"Sometimes people will
  be in frames, sometimes not... the goal is to make both options attractive for different
  reasons. Frames are stronger but slower and vehicles are extremely fast but fragile and
  vulnerable."* That makes the choice itself a UI moment: at the point of choosing a seat, the
  console must make the trade legible — durability and force against speed and fragility — or the
  choice collapses into "take the Frame, it is better." Making both attractive is partly a balance
  problem and partly a presentation one, and the presentation half is this document's.
- **Two shapes, permanently.** Player and GM. A player on foot is a player in a different seat,
  not a third kind of user. Law 10 says neither console is built from the other; this closes the
  door on a third being built from either.

### What is still genuinely undecided

Every design question this document has raised is now answered (§12's table, sixteen for sixteen).
What is left is not a design question but implementation groundwork — things that need building or
choosing a vocabulary for, not deciding:

1. **~~The scene-outcome vocabulary itself.~~ ANSWERED 2026-09-22 by cutting most of it.** This
   entry described two short required dropdowns of four to six options each. There is now one
   optional four-option axis (how it ended) and one required three-option verdict — see §10.3a's
   banner. The cost vocabulary this entry was waiting on words for is gone: half of it named CUT
   systems, and the informational nuance the rest carried is captured properly by the Note verdict's
   review agenda instead of by a five-second tap.
2. **The scheduling fields.** §3 lists what the interface needs that `episode.schema.json` does not
   carry: kind, eligible quarters, expiry, consequence-if-missed, assignee, `visibility`, outcome
   list. That is a data task and it blocks building the day ring for real.
3. **~~How a paper interface signals that it is interactive.~~ ANSWERED, 2026-09-09, by building
   the screen** — which is what this entry said it would take. The scene runner (§10.7's Scene
   drawer, `foundry/scene-runner.mjs`) is a full paper surface with real controls on it, and the
   vocabulary that came out of it is: **paper signals interactivity the way paper does.** A printed
   box takes a tick, and the line it belongs to is struck through once worked. A decision that has
   been made carries ink; one still available is an outline. An action is a rubber stamp and it
   presses when clicked. Hovering shows the mark it would make, faintly, in pencil — the paper
   equivalent of a hover state. The sheet lifts a single pixel under a hand. Nothing glows, and
   nothing is a button pretending to be metal. Confirmed live in a real world at 1600x1000.

   The two things worth carrying forward: **hover previews the action rather than merely
   highlighting the target**, which is more informative than a glass hover and costs nothing; and
   **a struck-through line is better than a removed one** — what did not happen is part of what
   happened, and a GM re-reading the page wants to see the road not taken.

These three, plus everything else in this document, are now tracked as real work — see the
[`ux-prototype` epic, GitHub issue #119](https://github.com/Garsondee/blank-inheritance/issues/119),
which sequences all of it into ten build issues plus a lock-in review gate before any of it is
ported into the real Foundry module (that porting work is epic #102, not this one).

---

## 13. How to use this document

- Before adding anything to the chassis, check it against **Law 13**. Most things belong in the
  terminal.
- Before defending a layout, check it against **Law 7**. If a Tier 1 action is not the biggest
  thing on screen, the layout is wrong regardless of how it looks.
- Before adding a GM feature, check it against **Law 15**. If it asks the GM to do bookkeeping as a
  task of its own rather than as a side effect of running the game, it will not get used.
- Before automating anything, ask **§10.4's actual question: did we invent this rule, or did sf2e?**
  Ours gets automated hardest (Law 16); sf2e's gets presented, never recomputed (Law 18); an
  artistic judgment never gets automated at all. If it will reach the players, it also needs a
  confirm regardless of which band it's in (Law 17).
- When this document and `design/visual-identity.md` disagree, this one wins, and the disagreement
  should be recorded in both.
- When a claim here turns out to be wrong at a real table, change it here first, then change the
  UI. A lodestone that quietly diverges from practice is worse than none.
