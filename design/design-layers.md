# Design Layers — build the SF2E baseline first, then add ours on top

**Status: a standing methodological commitment, issued 2026-09-06.** Not a proposal. The user's
framing, which is the whole argument:

> "Foremost and most important I think we need to try and imagine this adventure without Bleed and
> Resonance and get that right FIRST and only then introduce these elements over the top. Why?
> Because the SF2E combat is solid, it's been mathematically designed to be very good and fun, so
> we build all our campaign with the basics in mind first and we 'simulate' and 'playtest' the
> adventure using only the core SF2E concepts first and if it's playable then we know we're in safe
> waters to tinker with things that are unique to this adventure."

This governs `scale-and-chassis.md`, `resonance-and-bleed.md`, `downtime-activities.md`,
`ux-doctrine.md` and every encounter that ever gets authored. Where any of them conflicts with the
sequencing here, this wins.

---

## The actual reason this matters: attribution of failure

The obvious reading is "don't break what Paizo tested." That's true but it's the smaller half.

The bigger half is that **building everything at once destroys your ability to diagnose.** If a
fight is unfun and the table is simultaneously running homebrew action economy, a homebrew
instability track, a homebrew scale interface and a bespoke downtime economy, there is no way to
know which one did it. You end up tuning six systems against one symptom.

Layering converts the campaign into a controlled experiment. Get the baseline provably good, add one
layer, re-check. **If a problem appears after a layer goes on, the layer is the suspect — never the
foundation.** That rule is only available to you if you built in that order.

---

## The layers

| Layer | Contains | Must be true before moving on |
|---|---|---|
| **0 — Pure SF2E** | Level-1 kids and level-12 Frames as ordinary SF2E characters. Three actions. Standard skills, conditions, saves, encounter budgets. No Resonance, no Bleed, no Anchors, no bespoke anything. | A session runs and is *good*, just less distinctive. Encounters are survivable and interesting on SF2E's own maths. |
| **1 — The scale interface** | `scale-and-chassis.md`: the three legal interfaces, damage states, Marked, clocks in place of unrollable saves. | Kid-and-Frame fights produce good fights. The two scales coexist without either becoming spectators. |
| **2 — The campaign economy** | Time Economy, the four-quarter day, downtime activities, Frame upgrade points, the Contact Pool. | Progression and pacing feel right across several in-fiction weeks. Nobody is starved or trivially ahead. |
| **3 — The emotional overlay** | Resonance, Bleed, Anchors, Suppression. | The campaign's actual soul — added last, onto a system already known to work. |

Layer 1 is genuinely structural rather than flavour: you cannot put a level-1 kid and a level-12
Claimant on one map without *some* rule, so it isn't optional. But it is still validated the same
way — does it produce good fights, measured before anything else goes on top.

---

## The removability test

A layer is a real overlay only if you can delete it and still have a playable game. If you can't,
it isn't an overlay — it's load-bearing, and it belongs further down the stack where it gets
validated earlier and more carefully.

Applying that test honestly to what exists today:

- **Delete Resonance** → Frames have three actions and their full class sheet. Plays fine. It is a
  true overlay. ✅
- **Delete Bleed** → Pushing loses its cost and the horror loses its teeth, but nothing structural
  collapses. True overlay. ✅
- **Delete the scale interface** → a level-1 kid rolls against DC 32 and the campaign stops
  working. Load-bearing, correctly placed at Layer 1, not Layer 3. ✅

That the two signature mechanics both pass is genuinely good news: it means this campaign's
distinctive parts really are additive, and the layering plan is achievable rather than aspirational.

---

## What "simulate and playtest" means here, precisely

`tools/battle-simulator/` already rolls real d20s through a legality-enforcing SF2E engine, which
makes it the natural instrument for Layer 0 and Layer 1 validation. One important limit, learned
the hard way earlier in this project and worth restating so it isn't over-trusted:

- **Good for:** is this encounter survivable, is the XP budget right, does the scale interface
  produce fights where both sides matter, do the damage-state penalties bite at the right time.
  Questions with numeric answers.
- **Not evidence for:** whether something is *fun*, how often a human would actually use an action,
  or anything about pacing and attention at a real table. The simulator's gaps look like findings
  if you let them. Those questions need people.

So Layer 0/1 get simulated. Layer 2/3 get played.

---

## Consequences worth stating out loud

**Encounters are authored as pure SF2E encounters first.** An encounter's stat blocks, XP budget and
terrain should be defensible with zero reference to Resonance. Resonance then changes what a given
pilot is *allowed to do* inside a fight that was already balanced without it.

**A Frame at full sync is the baseline, not the reward.** This is the sharpest practical consequence
of the 2026-09-06 action-economy change. Three actions is what a normally-functioning Frame has,
because three actions is what SF2E is built around. Dead Weight sync and heavy damage are the
*penalties* that take you below it. Designing encounters against a 2-action assumption would mean
designing against a degraded system on purpose.

**The prototype console should be able to run a Layer 0 fight.** `design/ui/` should show a working
SF2E turn — actions, strikes with the real multiple attack penalty, conditions — before it shows a
Resonance band or a Bleed gauge. If the console only makes sense with the homebrew switched on, the
layering isn't real in the interface either.

**When something feels wrong, check the layer you added last.** That's the whole point.
