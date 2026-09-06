# Resonance and Bleed — a design investigation

**Status: analysis and recommendations, nothing decided.** Requested 2026-09-06: work out whether
these two are a good fit, how they fit, what needs reconsidering, what they do to the story, and
whether they produce interesting decisions. Everything critical below is offered in that spirit —
the invitation was explicitly to find things worth reconsidering, so this doesn't soften them.

Sources read: `design/design-bible.md` (the original two-tracks pitch), `data/campaign/config.json`,
`data/campaign/ground-roles.json`, `data/campaign/gm-notes.json`,
`data/episodes/episode-01-contact-unclassified.json`, `design/scale-and-chassis.md` §7, and SF2E's
own Hero Points and dying/wounded rules for comparison.

---

## 1. The short version

**Resonance is the stronger of the two, and its core idea is genuinely excellent.** Power expressed
as permission rather than as a bonus is the right answer for this system, and it's rarer than it
should be.

**Bleed is a good idea that is currently only half-built.** It has four inflows and essentially one
outflow, one threshold across ten points, and it's invisible to the player who's supposed to be
making decisions about it. As written it isn't a risk players manage; it's a countdown that arrives
on schedule.

**Together they form a genuinely strong engine** — there is no safe way to play, which is exactly
what the campaign wants. The gap is that only one of the two tracks currently has a full mechanical
life.

---

## 2. Resonance

### What works, and why it's the right call

**Power as permission, not as a bonus.** The `twoTracksPrinciple` line — *"the difference between a
well-synced and poorly-synced pilot is what they're allowed to do, not how good they are at doing
it"* — is the best single decision in the design. In a bounded-accuracy system, expressing a 0–100
resource as a modifier would wreck the maths: SF2E's DCs are tuned tight enough that a ±10 swing
makes encounters unrunnable. Gating *access* sidesteps that completely. You get a dramatic,
wide-range resource that never touches a single DC calculation. That's a real piece of design
skill and it should not be traded away for anything.

**It solves "Frames don't level up" elegantly.** *"A level-12 Frame at 30% Resonance is a level-12
character only allowed to use a fraction of their sheet."* Advancement becomes emotional rather than
numerical — you unlock yourself, not your gear. For a story about children bonded to excavated
machines, that's close to perfect.

**Band crossings are legible table moments.** Categorical changes are memorable in a way that
incremental bonuses never are. *"Reaching Harmonised for the first time, mid-fight, should be a
table moment"* is correct, and it's the kind of thing a group remembers a year later.

### Problem 1: "most of the campaign is played at 2 actions" is a bigger cost than it looks

This is the concern I'd raise first if we were sitting at a table.

SF2E is not a game where three actions is the default and two is a mild debuff. It is
*architecturally* a three-action system:

- Two-action activities — Ready, Area Fire, Sustain-plus-anything, most class activities — consume
  an entire turn at 2 actions, leaving no room to move, reposition, or react to anything.
- The turn shapes that make this system feel good (Strike/Strike/Move, Move/Strike/Raise,
  Stride/Stride/Strike) all need three.
- The multiple attack penalty is *itself* built around three attacks being possible-but-unwise. At
  2 actions the −10 attack never comes up, so an entire dimension of the system's tactical texture —
  "is the third swing worth it?" — simply never appears.

So the campaign's stated default isn't "somewhat harder SF2E." It's SF2E with roughly a third of its
tactical vocabulary removed, most of the time.

**The counter-argument is real and I want to state it fairly:** that *is* the fiction. Kids in
machines they don't control should feel constrained, and Harmonised should feel like a breakthrough
because it's rare. That's a coherent artistic choice.

But there's a difference between *feeling constrained* and *having fewer decisions to make*, and a
reduced action economy delivers both at once. The fiction wants the first. The system hands you the
second as a side effect, round after round, for most of the campaign.

**Worth considering:** make **3 actions the norm from Nominal upward**, and reserve 2 for Dead
Weight alone — a genuine failure state rather than the baseline. The band spread then rests on the
three levers already in the table and currently under-discussed: reaction access, ability tier, and
internal-power duration. Those are more than enough (see the next problem). This keeps everything
Resonance is *for* while not spending the campaign in a truncated version of the system.

### Problem 2: the band spread is wider than it reads on the page

Nobody had run these numbers, so here they are — total actions available across a fight, using the
config's own internal-power durations:

| Band | Actions/round | Rounds of power | Free Strikes | Total actions | vs Dead Weight |
|---|---|---|---|---|---|
| Dead Weight | 2 | 3.5 | 0 | 7 | 1.0x |
| Nominal | 2 | 6 | 0 | 12 | 1.7x |
| Harmonised | 3 | 8 | 0 | 24 | 3.4x |
| Absolute | 3 | 10 | 10 | 40 | **5.7x** |

**A 5.7x spread in total contribution, before ability tiers are counted at all.** For comparison,
that's a wider gap than four character levels in SF2E — expressed on one track, inside one tier, between
two players at the same table.

That isn't automatically wrong; a story about wildly uneven sync might want it. But two things
follow:

1. Pilots fielded together should sit within a band or two of each other, or the low one is a
   spectator in their own fight.
2. It's a strong argument for the previous recommendation. If 3 actions were standard from Nominal,
   the spread compresses to roughly 2.2x on action count and the *ability tiers* carry the rest —
   which is the lever that should be carrying it anyway, since that's the one that expresses "you
   are allowed to be more of yourself."

### Problem 3: the threshold cliff

64% and 65% are one point apart and separated by a full action per round plus two rounds of power.
If Resonance moves in small increments from Anchor scenes, a single mundane conversation can halve
or double someone's combat contribution — which makes the GM's Anchor lever more mechanically
consequential than any tactical choice a player makes during the fight itself.

Two softenings, either of which works:

- **Hysteresis.** Once you've reached a band, you don't drop out of it until you fall 5+ points
  below the line. Stops flickering across a boundary between scenes.
- **Make crossing the line the thing you push for.** This is what Pushing already is, and it argues
  for making Pushing *more* available rather than less — it's the moment where the cliff becomes a
  player decision instead of a GM-side accident.

### What Resonance does to the story

This is the part I'd protect at almost any cost. Resonance makes the campaign's central question
mechanical: **how much of yourself will you spend to be useful?** Pilots get better by being
emotionally open, which means the Directorate's institutional interest and the kid's own wellbeing
point the same direction — right up until they violently don't. That's a horror premise expressed as
a stat, and very few games manage it.

The `ratio-publication` open question is load-bearing here. If those six percentages are read aloud
and ranked weekly, Resonance stops being a character stat and becomes a **public score of how
emotionally available a child is, assigned by an institution.** That is the single cruellest and
best use of this mechanic available, and `gm-notes.json` already leans that way (*"read harmonics
numbers aloud, flatly, in front of everyone"*).

---

## 3. Bleed

### What works

**Suppression is a genuinely clever anti-exploit.** Recognising that "roleplay for power" creates an
incentive to play it safe, and closing that door by making safety cost too, is a real designer's
move. *"Both doors cost something: having the fight costs capability, swallowing it costs
stability."*

**The narration rule is craft-level.** *"Don't narrate this from the cockpit — the player doesn't
get to watch it happen to them."* That converts a mechanical event into a horror beat, and it
implicitly cuts to the other five players, keeping the table engaged during the one moment the
pilot has no agency. Keep this exactly as written.

**Scripting berserk into Day 1 is good pedagogy.** Episode 1 scene 7 puts it in the first fight of
the campaign: show the ceiling immediately, so every later Bleed point carries weight.

### Problem 1: Bleed has four inflows and essentially no outflow

Searched the whole repo for this. Sources of Bleed: pushing Resonance, taking Frame damage,
plug/psychological distress, Suppression. Three of those four fire constantly — Frames take damage
every fight, distress happens whenever the story is working, and Suppression fires precisely when
players *avoid* content.

Reductions found: exactly one — Signals Liaison *"talks the pilot down: reduces Bleed"* — with no
magnitude, no rate, no cap. No downtime recovery, no per-session reset, no decay. (Note: Resonance
*does* have decay-toward-baseline, mentioned in the Day 1 pilot's rules. Bleed has nothing
equivalent.)

**Consequence: Bleed is a ratchet, so berserk isn't a risk — it's a countdown.** If a pilot nets
even +1 Bleed per session, berserk arrives on a schedule no player decision meaningfully changes.
That silently converts an intended *decision system* ("is this push worth it?") into a *pacing
device* ("berserk fires roughly every N sessions"). Episode 1 confirms the reading: berserk there is
authored, not risked.

A doom clock you can only slow is a legitimate and effective structure — Blades in the Dark and Ten
Candles both run on it. But it should be **chosen deliberately**, and if chosen, the interesting
decision changes shape: not *"can I avoid berserk"* but *"can I choose when it lands, and spend it
somewhere it costs least?"* That's a genuinely good decision space — but it only exists if the
player can see the number.

### Problem 2: Bleed 1 through 9 do nothing

Ten points of tracked resource, one threshold, at the very top. Points 1–9 have no mechanical
expression whatsoever. That's a lot of bookkeeping for zero feedback, and it means the track is
invisible in play right up until it detonates. Compare Resonance, where four bands keep the number
meaningful at all times.

**This is the highest-value, lowest-cost fix available on either track.** Give Bleed two or three
intermediate thresholds — and the thematically correct thing for them to do is **eat what Resonance
grants**, so the two tracks finally interact somewhere other than the endpoint:

| Bleed | Effect |
|---|---|
| 4+ | Lose your reaction — the first thing Resonance grants above Dead Weight |
| 7+ | Effective Resonance band drops one step for ability access |
| 10 | Berserk, as written |

Now Bleed is felt continuously, it directly opposes Resonance instead of running parallel to it, and
the push becomes properly tense: *pushing buys you a band now and costs you a band later.* That's a
real decision with both sides visible.

### Problem 3: hiding Bleed makes the push undecidable

Pushing is a trade — Resonance now for Bleed later. **A trade where you can't see one side of the
ledger isn't a decision, it's a gamble.** Since the brief for this whole investigation was
"interesting and impactful decisions," this matters directly.

The case for hiding it is real: not knowing how close you are to losing yourself is scarier. But
that's scarier *for the character* while removing agency *from the player*, which is usually the
wrong trade.

**Recommended answer to the `bleed-visibility` open question: show the pilot a band, not a number.**
Stable / Strained / Critical. Enough to price a push honestly, not enough to count down precisely to
berserk. It also happens to be exactly what a 1950s-instrument Directorate would fit to a cockpit —
a three-light gauge, not a digital readout — which lands perfectly in the console's existing visual
idiom.

### Problem 4: Suppression asks the GM to judge intent

*"Declines an Anchor-relevant conflict specifically to protect their deployability."* To apply that,
the GM has to decide *why* a player did something and then penalise them for the motive. That risks
playing as an accusation at the table, and it punishes what might be a legitimate character choice —
some kids genuinely are conflict-avoidant.

**Softer version, same pressure:** don't judge intent, judge *pattern*. If a kid's Anchors go
untouched for N scenes, Bleed rises — regardless of why. Mechanical, impersonal, produces the same
"you can't just not engage" force, and nobody at the table ever has to say the word metagaming.

---

## 4. How they fit together

Stated plainly, the loop is:

```
Anchors (fiction) ──► Resonance (capability) ──► survival
Push (choice)     ──► Bleed (instability)    ──► loss of self
Suppression (avoidance) ──► Bleed
```

**The genuinely excellent part: there is no safe play.** Engage, and Anchors can be violated and
Resonance falls. Disengage, and Suppression charges Bleed. Push to compensate, and Bleed climbs
faster. The only stable strategy is to actually play the emotional game — which is exactly what the
campaign is about. That's the same engine the best PbtA games run on, and it was arrived at
independently here.

**The gap: only one of the two has a full mechanical life.** Resonance has four bands, defined
grants, a push mechanic, decay, and a GM lever. Bleed has one threshold and one undefined reducer.
They're presented as twin tracks; right now one is a system and the other is a timer. Closing that
asymmetry is the highest-leverage work available on this pair.

---

## 5. Fit with SF2E specifically

**Resonance fits unusually well.** Permission-gating never touches bounded accuracy. Action economy
is already SF2E's central resource, so modulating it speaks the system's native language. And
ability-tier gating maps cleanly onto class feats, which are already discrete unlockable packets —
sorting a Frame's feats into four bands at chargen is a real, buildable job, not a hand-wave.

**Bleed fits less naturally**, because SF2E has no precedent for a persistent cross-session
psychological track. Its closest structural analogue is **dying/wounded**, and that comparison is
instructive, because dying/wounded is well built:

| | dying/wounded | Bleed (as written) |
|---|---|---|
| Visible steps | 4, all meaningful | 10, only the last one does anything |
| Escalating memory | wounded makes future dying worse | none |
| Escape valve | Hero Points can cancel death | none |
| Recovery | defined and reliable | one undefined reducer |

Modelling Bleed's *structure* on wounded/dying — visible steps, escalating consequence, an expensive
out — would make it feel native to SF2E rather than bolted on.

**One unexplored interaction worth a thought: Hero Points.** SF2E already has a session-scoped
metacurrency awarded for selfless or daring acts, spendable to cheat death. Anchors reward very
similar behaviour on a campaign timescale, so both currencies will often fire on the same moments.
Two questions fall out of that:

1. **Should a Hero Point be spendable to avert berserk**, the way it can avert death? That gives
   loss-of-self the same mechanical dignity as death, and hands players exactly one precious,
   expensive out — which the track currently lacks entirely.
2. Should affirming an Anchor also grant a Hero Point? Probably not — that's double-dipping — but
   the overlap is worth being deliberate about rather than discovering at the table.

---

## 6. Recommendations, ranked by value over cost

1. **Give Bleed intermediate thresholds that eat Resonance's grants.** Smallest change, largest
   effect. Fixes the dead 1–9 range and makes the two tracks genuinely interact.
2. **Show the pilot a Bleed band, not a number.** Turns the push from a gamble into a decision, and
   fits the console's gauge aesthetic. This is a concrete answer to the existing `bleed-visibility`
   question.
3. **Define Bleed's sinks.** At minimum a number on Signals Liaison's reduction plus a downtime
   route. Otherwise berserk is a schedule, not a risk — which may be fine, but should be on purpose.
4. **Reconsider 2 actions as the campaign's default.** Three from Nominal up, 2 for Dead Weight
   only; let ability tiers and duration carry the band spread.
5. **Replace Suppression's intent test with a pattern test.** Same pressure, no accusation.
6. **Consider Hero Points as the berserk escape valve.** One out, expensive, thematically apt.
7. **Add hysteresis at band boundaries** so a single scene can't flicker someone across the
   Harmonised line in both directions.

None of these are decisions. Items 1–4 in particular are significant enough to want a real answer
rather than an assumption, and they're now tracked as open questions.
