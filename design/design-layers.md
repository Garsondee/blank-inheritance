# Design Layers — build the SF2E baseline first, then add ours on top

**Status: a standing methodological commitment, issued 2026-09-06.** Not a proposal. The user's
framing, which is the whole argument:

> "Foremost and most important I think we need to try and imagine this adventure without Bleed and
> Resonance and get that right FIRST and only then introduce these elements over the top. Why?
> Because the SF2E combat is solid, it's been mathematically designed to be very good and fun, so
> we build all our campaign with the basics in mind first and we 'simulate' and 'playtest' the
> adventure using only the core SF2E concepts first and if it's playable then we know we're in safe
> waters to tinker with things that are unique to this adventure."

This governs `downtime-activities.md`, `ux-doctrine.md`, `strategy-layer.md` and every encounter
that ever gets authored. Where any of them conflicts with the sequencing here, this wins.

---

## The actual reason this matters: attribution of failure

The obvious reading is "don't break what Paizo tested." That's true but it's the smaller half.

The bigger half is that **building everything at once destroys your ability to diagnose.** If a
fight is unfun and the table is simultaneously running homebrew machine sheets, a homebrew
strategy layer and a bespoke downtime economy, there is no way to know which one did it. You end up
tuning several systems against one symptom.

Layering converts the campaign into a controlled experiment. Get the baseline provably good, add one
layer, re-check. **If a problem appears after a layer goes on, the layer is the suspect — never the
foundation.** That rule is only available to you if you built in that order.

---

## The layers

| Layer | Contains | Must be true before moving on |
|---|---|---|
| **0 — Pure SF2E** | The kids as ordinary SF2E characters at their own level. Three actions. Standard skills, conditions, saves, encounter budgets. No bespoke anything. | A session runs and is *good*, just less distinctive. Encounters are survivable and interesting on SF2E's own maths. |
| **1 — The machine sheets** | Frames and vehicles as PC-grade character sheets that amplify the pilot's own sheet (hardness, high AC), at the pilot's level, in lockstep (GitHub #196; `open-questions.json#vehicle-and-frame-rules-model`). | Frame-scale fights produce good fights, and the pilot's own sheet still matters inside the machine. |
| **2 — The campaign economy** | Time Economy, the four-quarter day, downtime activities, the Frame upgrade budget, the Contact Pool. | Progression and pacing feel right across several in-fiction weeks. Nobody is starved or trivially ahead. |
| **3 — The strategy layer** | `strategy-layer.md`: the five tracks, Clearance rungs, the Watcher's turn at debrief, Bonds, artefacts. | It never eats table time and never replaces an SF2E resolution (its own §8). |

*(Cut 2026-09-20: the old Layer 1, the two-scale model's "scale interface", and the old Layer 3,
the emotional overlay of Resonance, Bleed, Anchors and Suppression. Removed from this document
2026-09-25.)*

Layer 1 is genuinely structural rather than flavour: a Frame fight needs the machine sheets, so it
isn't optional. But it is still validated the same way — does it produce good fights, measured
before anything else goes on top.

---

## The removability test

A layer is a real overlay only if you can delete it and still have a playable game. If you can't,
it isn't an overlay — it's load-bearing, and it belongs further down the stack where it gets
validated earlier and more carefully.

*(The test was first applied to Resonance, Bleed and the scale interface, all cut on 2026-09-20.
Removed from this document 2026-09-25.)*

---

## What "simulate and playtest" means here, precisely

`tools/battle-simulator/` already rolls real d20s through a legality-enforcing SF2E engine, which
makes it the natural instrument for Layer 0 validation (its frame-scale half was removed on
2026-09-19, so Layer 1 has no simulator yet). One important limit, learned the hard way earlier in
this project and worth restating so it isn't over-trusted:

- **Good for:** is this encounter survivable, is the XP budget right, do the damage-state penalties
  bite at the right time. Questions with numeric answers.
- **Not evidence for:** whether something is *fun*, how often a human would actually use an action,
  or anything about pacing and attention at a real table. The simulator's gaps look like findings
  if you let them. Those questions need people.

So Layer 0/1 get simulated. Layer 2/3 get played.

---

## Consequences worth stating out loud

**Encounters are authored as pure SF2E encounters first.** An encounter's stat blocks, XP budget and
terrain should be defensible with zero reference to anything homebrew.

**Three actions is the baseline, not the reward.** Three actions is what a normally-functioning
Frame has, because three actions is what SF2E is built around. Designing encounters against a
2-action assumption would mean designing against a degraded system on purpose.

**The prototype console should be able to run a Layer 0 fight.** `design/ui/` should show a working
SF2E turn — actions, strikes with the real multiple attack penalty, conditions — before it shows any
homebrew readout. If the console only makes sense with the homebrew switched on, the layering isn't
real in the interface either.

**When something feels wrong, check the layer you added last.** That's the whole point.
