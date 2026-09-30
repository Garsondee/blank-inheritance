# The Directorate's discipline scale, and disobeying a direct order

*Written 2026-09-29, from `canon/decisions/D053.md`. A recurring mechanic, not a one-scene beat: Assembly is where
the table first hears the rules stated out loud, but every later scene that offers the party a direct order is a
chance to use this.*

## What Ingram asked for

> "We need to explain to the players, in character in the assembly scene why the players will get to choose between
> the gym, lessons, rifle training or spending time in the library. We should try to build an in universe
> understanding of The Directorate as this combination of school and military, defenders and also bureaucrats. All
> I'm suggesting is that we give the players as part of the speech the rules, the Directorate considers disobeying a
> direct order to be a serious crime, it sees breaking curfew as a very minor one. We should then give the group
> chances to disobey a direct order and if they choose to do so we put them in front of someone higher up and make
> them explain themselves and fight their case, turning a cool story moment into a higher stakes one. Players who
> choose to disobey an order won't immediately be rewarded with a positive result, it might suck to be them for a
> bit, but they can be proven right in their choosing to disobey and the rewards are always greater for doing the
> ethical thing. This means we get the drama of a bit of EVA but it means we give characters a real chance to stand
> apart or do the difficult right thing or stand up against an authority figure who is wrong."

## The shape

**The Directorate is a school and a military at once, and Assembly is where it says so out loud.** Not shown by
implication — stated, in the speech, in the Directorate's own voice: this is why a candidate's day splits between
the gym, lessons, rifle training and the library, because the institution is simultaneously raising them, arming
them, and keeping records on them. Say it plainly rather than trust the schedule alone to communicate it.

**The speech also states the discipline scale**, in character: disobeying a direct order is a serious crime;
breaking curfew is a very minor one. This is worldbuilding-as-rules-explanation — the table hears the actual stakes
of a choice before they make it, the same way a real institution's induction briefing would say it.

**This is not a new invention from nothing.** `data/campaign/open-questions.json#night-excursion-consequences`
(resolved 2026-09-20) already covers the curfew end of this scale: getting back undetected after hours is a real
skill roll, being caught the first time is very minor and punishment never gets harsh even later, and the GM tracks
privately who chooses to be a rebel and folds that into how the character is treated going forward — **the record
is the real consequence, not the penalty.** `data/locations/candidate-gate.json` already builds this into the
Candidate Gate: every sign-out is logged, permanently, and that log is "the raw material for a later administrative
consequence." Disobeying a direct order sits well above curfew-breaking on the same ladder — a serious crime, not a
very minor one — and gets its own mechanic: the hearing.

## The hearing

When a player character disobeys a direct order, they go in front of someone higher up and have to explain
themselves and fight their case. Concretely:

- **It is a real scene**, not a skipped consequence. The character makes their case; the NPC hearing it responds to
  the actual argument, not to a fixed script.
- **The officer hearing the case is a warm, competent adult**, per `design/research/evangelion/tone-guardrail.md`'s
  quarantine list (item 4: "our campaign needs warm, competent adults"). They believe in the rule they're enforcing,
  for reasons that make sense from inside the institution — not a caricature to be righteously defeated. They can
  be shown to be wrong about this specific case without the scene reading as institutional failure across the
  board; see `feedback_directorate_secretive_not_evil` and `feedback_npcs_own_their_mistakes` (a senior NPC can be
  wrong and take responsibility for it, including resigning or stepping aside, without every senior NPC being
  wrong).
- **No immediate reward.** The short-term result can genuinely cost the character something — this is not a hoop to
  jump through on the way to a guaranteed win.
- **The character can be proven right later**, and when they are, the reward for having done the ethical thing is
  bigger than the reward for simple compliance would have been. This is the actual promise, stated so it can be
  kept: disobedience isn't free, but being right and disobedient pays out more than being compliant ever would.
- **Checks against `feedback_penalties_cost_risk_not_choice`:** a hearing's cost has to be a *dynamic, recoverable*
  state the player is managing (a black mark that can be worked off, a temporary loss of trust that reopens a door
  later, a harder DC on one specific kind of check until it's earned back) — never a permanent reduction in what the
  character is allowed to do. The drawback should raise the stakes of the choice they already made, not shrink the
  menu of choices available to them afterward.

## Why "a bit of EVA" fits here without breaking tone

The campaign's tone is locked to Giant Robo, not Evangelion (`feedback_tone_giant_robo_not_eva`), and the
Evangelion research shelf exists to be mined for structure, never register (`design/research/evangelion/tone-
guardrail.md`). This mechanic borrows exactly the shelf's intended piece: **an institution that is simultaneously
employer, guardian and hazard** (`the-institution-that-uses-children.md`), which Giant Robo doesn't supply and this
campaign needs. It does not borrow any quarantined element — no despair as a destination, no adults who all fail,
no reluctance as the pilot's engine, no withdrawal from plot into interiority. The hearing produces real
institutional friction and a real chance to stand apart, inside a scene that stays warm, plain-spoken, and ends
with the character able to act again.

## Open

- The exact ladder between curfew (very minor) and disobeying a direct order (serious): what sits in between, and
  whether it needs naming now or can wait until a scene actually needs it.
- What a hearing costs mechanically — a specific dynamic state, not yet chosen.
- Assembly itself is `old-draft` (see `canon/plan/chapter-01.md`) and hasn't been rebuilt in `canon/scenes/` yet;
  this design is ready for whenever that rebuild happens, but rebuilding Assembly itself is a separate task, not
  done as part of writing this doc.
