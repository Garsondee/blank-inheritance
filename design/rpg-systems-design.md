# RPG Systems Design — what makes a rule good

*Written 2026-09-13. Part of the reference library that began with five documents on narrative and GM craft ([narrative-theory-foundations.md](narrative-theory-foundations.md), [agency-and-player-choice.md](agency-and-player-choice.md), [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md), [quests-objectives-and-threads.md](quests-objectives-and-threads.md), [pacing-and-the-responsive-campaign.md](pacing-and-the-responsive-campaign.md)). That library covered how stories work and how to run them; it covered nothing about how to design a rule. This one covers resolution curves, bounded accuracy, degrees of success, action economy, incentives, failure design, complexity budget, trap options, writing usable rules text, and when a subsystem earns its place. Its closest sibling is [mechanics-as-meaning.md](mechanics-as-meaning.md), which covers what a rule* argues *— this one covers whether it* works. *Build systems and progression belong to [character-creation-and-progression.md](character-creation-and-progression.md).*

***This is not a decision document.** Nothing here overrides the v4 story bible, `design/campaign-arc.md`, or any entry in `data/campaign/open-questions.json`. The Time Economy and Contact Pool numbers are cited as they stand in `config.json`, provisional rather than locked. Where a live design question would benefit from the theory, this document says so and stops.*

Every claim is tagged: **[E]** empirical (tested), **[T]** theory (a framework — vocabulary, not proof), **[C]** craft (practitioner consensus from shipped games and thousands of tables, often righter than theory and never measured), **[Q]** contested. Most systems-design knowledge is honestly **[C]**. It is not inflated here.

---

## 1. The shape of the probability curve is the feel of the system

Resolution systems differ far less in their fiction than in the distribution they hand you, and the distribution is what players feel across a hundred rolls. **[T/C]**

- **Linear d20.** Every outcome equally likely, so a modifier is worth exactly 5% everywhere. Each roll is a large swing and the dice out-vote competence regularly.
- **Dice pools** (roll N, count successes). Binomial, so adding dice raises the mean *and* tightens the spread. A pool separates *whether* from *how much* — the success count is a magnitude, free, with no second roll.
- **2d6 bell curves.** Triangular, so a modifier's worth depends on where the target sits: moving it from 8 to 7 is +16.7%, from 13 to 12 is +2.8%. Competence becomes reliable and upsets rare. The PbtA band on top — **10+ full success, 7–9 success with a cost, 6- a miss the GM moves on** — is the most copied structure in modern design because the middle band is the most likely single outcome, making "you get it, but" the default texture of play.
- **Roll-under.** Roll-over with the arithmetic pre-done: the number on the sheet *is* the answer. The cost is ergonomic — it inverts the "high is good" instinct the rest of the table runs on, including damage.
- **Blackjack** (as close to a target as possible without going over). Rare, and worth knowing as the one common way to make trying too hard a mechanical risk.
- **Diceless** (Amber's stat comparison, Dread's Jenga tower). Removes variance or replaces it with a physical, accumulating one. The decision becomes the whole drama.

**Choose the curve for the feeling you want a hundred rolls from now, not for the feeling of one roll.** None of these properties can be bolted onto a curve that lacks it.

SF2E is flat d20 and this campaign inherits that. The **Contact Pool** (`data/campaign/config.json`) uses the flatness deliberately: 1d20 each morning, triggering on a 20, target dropping by 1 per quiet morning — exactly +5% of dread per day, which is why players can read the pressure honestly.

## 2. Bounded accuracy, tight bands, and why a level gap is a real problem

"Bounded accuracy" names two nearly opposite designs and the confusion causes real arguments. **[C]** In D&D 5e it means level barely enters the numbers, so a low-level monster stays a threat. In PF2E and SF2E it means the opposite: **level is added to almost every number** (`reference/tables/dc-and-check-math.json`: trained = level + 2, expert = level + 4, upward), so the band of things that can meaningfully interact is narrow and the maths inside it is tuned extremely tight. This document says **tight-band** for that kind. It buys precise encounter budgeting and meaningful +1s — DC by level runs 15 at level 1 to 30 at level 12 — and costs everything outside the band, which stops working at all. A +1 matters more here because of the crit rule (§3): with critical success at DC+10 on a flat d20, **a single +1 buys 5% more hits and 5% more criticals at once**.

The retired scale-and-chassis design proved the consequence rather than asserting it. A level-12 Claimant (+26, 3d10+14) against a level-1 kid (AC 17, 18 HP) hits on everything and **crits on everything but a natural 1** — about 60 damage against an 18 HP maximum, which exceeds double max HP and kills outright under the massive-damage rule rather than dropping the kid to dying. Reversed, the kid at +7 against AC 33 succeeds only on a natural 20, needing roughly **770 attack rolls** to clear 270 HP. Its conclusion: *"This is not a tuning problem; a 11-level gap is outside the ±4 band the entire system is built on"* — verified against `reference/tables/encounter-and-rewards-math.json`, whose usable range is party level −4 to +4.

**In a tight-band system a level gap is not a flavour difference needing a bonus; it is a category error.** This campaign's answer, since 2026-09-20, is to remove the gap rather than bridge it: pilot and machine share one level, and threats scale with the party (`open-questions.json#frame-scale-starting-level`).

## 3. Degrees of success are a real shipped rule, and they are a design tool

This is not homebrew and must never be re-invented. Verified in `reference/tables/dc-and-check-math.json` (from `gm-core/702-difficulty-classes.json` and `player-core/326-checks.json`), SF2E resolves every check into **four** tiers: **critical success** at result ≥ DC + 10, **success** at ≥ DC, **failure** below DC, **critical failure** at ≤ DC − 10. A natural 20 shifts one degree better and a natural 1 one degree worse, **applied after the numbers are compared** — so against a very high DC a natural 20 may only convert failure to success, and with a high enough modifier a natural 1 can still be a critical success.

Four graded outcomes cost nothing extra at the table and are worth far more than two. A binary system forces the GM to invent the interesting outcomes; a graded one pre-authorises them, and critical failure in particular lets a system have consequences without the GM choosing to be harsh. **[C]**

The repo uses this well: `challenge.schema.json` routes outcomes through `degreeOfSuccessOutcome` rather than a success boolean, and `subsystem.schema.json`'s `poolEffects` are **sparse per degree** so "this outcome does nothing" is the cheap default. One correction recorded in `design/npc-social-intel.md` is worth repeating so it does not recur: that document was briefed to build a five-tier table ("crit fail, fail, neutral, succeed, crit succeed") and correctly did not, because **SF2E has four tiers, not five**. "Neutral" is what plain Failure already means on real actions like Make an Impression and Request.

**When authoring any new check, write all four degrees or deliberately write +0 into one, and never invent a fifth.**

## 4. The three-action economy as a case study in elegant design

`reference/srd/player-core/470-encounter-mode.json` (Player Core pg. 428): *"Regain your 3 actions and 1 reaction,"* with no carryover — *"you can't 'save' actions or reactions from one turn to use during the next turn."*

The elegance is not the number three. It is that almost everything a character can do is priced in the same unit, so every ability is comparable to every other without a conversion table, and a turn becomes a small knapsack problem a player can hold in their head. The **multiple attack penalty** stops that knapsack having a single correct answer: the second attack in a turn takes −5 and the third or later −10 (−4/−8 with an agile weapon), calculated per-attack from the weapon used, resetting each turn, never applying to reactions. The third Strike is legal, available, and usually bad — which makes it a decision rather than a default.

**The design goal of an action economy is a menu, not an optimum. If one turn shape is correct nearly every round, the economy has collapsed into a script and the resource is doing no work.**

This campaign had that argument when a two-action default was proposed, and the structural case against it generalises: two-action activities consume a whole turn, the turn shapes the system is built around all need three, and — the sharpest observation — **the −10 attack never comes up, so the "is the third swing worth it?" decision never appears.** Three actions stayed the norm.

## 5. Players optimise what is rewarded, so the reward declares the subject

The most reliable lever in the discipline and the least often used on purpose. **[C]** A group finds and repeats whatever the system pays for, regardless of what the setting text says the game is about. XP for gold makes a heist game; XP for monsters makes a clearing game. The reward schedule is a statement of subject matter, and the table reads it faster and more accurately than any paragraph of tone guidance.

**Before adding any reward, ask what a player who wants it will do more of, and check that you want more of it.** Noticing that your reward creates an exploit, and pricing the exploit, is the whole job.

## 6. Failure design: what it should cost, and the death spiral

Fail-forward is covered in [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md). The question left over is what a failure state should *cost*. The usable currencies are resources, position, time, information, and relationship; all five leave the player playing. **[C]** The currency to avoid is participation itself.

**"You lose a turn" is the weakest failure in any system, because it takes payment in the one thing the player came for.** It is uncorrelated with the fiction — nothing in a story looks like a competent person standing motionless for six seconds — and it compounds, since a player who lost a turn is behind and likelier to lose the next. Where a system needs a stun, the good versions are graded and short: SF2E's stunned is a value that eats actions, not a skipped turn. This repo met the bad version in its own code: the personnel-scale battle simulator (`tools/battle-simulator/personnel-engine/`) once shipped a bug recorded as *"Stunned was never a value, it was 'skip N whole turns'"*, since fixed.

**The death spiral** is the structural relative: a penalty that makes further failure likelier. Spirals are not automatically wrong — they are how a fight acquires momentum instead of resolving as a coin flip at the last moment — but an unannounced one punishes and an unbounded one is unplayable. SF2E ships two controlled ones: dying/wounded, which escalates with memory and has both a Hero Point escape valve and a defined recovery; and vehicle **Broken** at half HP, a built-in warning to withdraw. The retired scale-and-chassis design built a deliberate spiral on top and was honest about it — a four-stage machine-damage curve capping actions at 2 then 1 and halving Hardness at Critical, which it said *"compounds fast"* and intended to. Three things made it designed rather than a trap, and they generalise: the first stage existed purely as a **warning tier**, the effects were legible from the HP bar, and the exit stayed open — a damaged machine *"can still act — it's worse, not disabled."*

`design/campaign-arc.md`'s **"penalties cost risk, never choice"** (2026-09-06) constrains the other side: *"a drawback should shrink the menu as little as possible and grow the stakes instead."* The load-bearing distinction is **recoverable and managed** versus **permanent and levied**, which is how that document checks the Exhaustion track and finds it clean despite its temporarily reducing what a character can do. That is the campaign's call; it is restated here because anyone applying the principle to a *new* penalty needs to know which half of it does the work.

## 7. Depth, complexity, and the working-memory budget

Depth and complexity are routinely confused and they trade against each other. **[C]** **Depth** is the number of decisions that stay interesting after you understand the system. **Complexity** is what the rules cost in attention — how much must be held, looked up, or remembered. Depth can be **emergent** (few rules, combinatorially rich — chess, the three-action economy) or **authored** (many rules, each hand-made — a large feat catalogue). Emergent depth is cheaper per unit and harder to aim; authored depth is precise and expensive. Most good systems use emergent depth for the core loop and authored depth for character identity.

**The real constraint is the table's working memory, not the page count.** A rule that lives on the character sheet, in a visible clock, or in the interface costs almost nothing. A rule that lives in a book, in the GM's head, or in a modifier that must be recalled three turns later costs a great deal even when it is one sentence long.

That is the argument `design/ux-doctrine.md` is built on — SF2E's numbers are too tight and too many to be run by a human at speed, so the interface owns the arithmetic and the player spends their attention on choosing three actions. It does not simplify the system; it relocates the cost. Its §11 applies the same logic to implementation: **sf2e already implements MAP, persistent damage, flanking, off-guard, conditions, degree of success and initiative, so never rebuild those.** The same budget favours **reusing levers instead of adding them**: a new effect that spends an existing currency costs less attention than a third currency.

## 8. The layering methodology and the removability test

`design/design-layers.md` is a genuine local contribution to systems-design methodology. Its stack puts pure SF2E at Layer 0 and the campaign's own systems in layers above it, with the campaign economy (Time Economy, the four-quarter day, downtime, the Contact Pool) at Layer 2. The other two layers it named — Layer 1, the scale interface, and Layer 3, Resonance, Bleed, Anchors and Suppression — were cut 2026-09-20.

The stated reason is not reverence for Paizo's testing. It is **attribution of failure**: *"If a fight is unfun and the table is simultaneously running homebrew action economy, a homebrew instability track, a homebrew scale interface and a bespoke downtime economy, there is no way to know which one did it."* That generalises past this campaign. Layering converts a design into a controlled experiment, and the rule it buys — *"If a problem appears after a layer goes on, the layer is the suspect — never the foundation"* — is only available if you built in that order.

The **removability test** is the sharper half: a layer is a real overlay only if deleting it still leaves a playable game.

The part worth generalising is that **failing the removability test is not a verdict against a mechanic; it is a routing instruction.** A mechanic that fails it belongs low in the stack, validated early and carefully instead of late and casually. A test that only said "this is too entangled" would be a complaint; a test that says where in the stack something belongs is a tool. One honest limit: removability is a binary test on a continuous property. It establishes that a layer is *structurally* removable — the remaining rules still resolve — and says nothing about whether the game left behind is the game you wanted.

**Build and validate in stack order, and when something feels wrong, suspect the layer you added last.** That document also states its own instrument's limits: `tools/battle-simulator/` answers questions with numeric answers and is *not evidence* for whether something is fun — *"The simulator's gaps look like findings if you let them."* Layer 0 gets simulated; the campaign's own layers get played.

## 9. A tracked resource needs intermediate states, or it is a countdown in disguise

A number you ask players to track earns its bookkeeping only if it changes what somebody does at **more than one value**. A resource with a single threshold produces no decisions below that threshold; it produces waiting. The player cannot price a trade against it, cannot plan around it, and gets no feedback that their choices are moving it. **[C]**

SF2E's own dying/wounded track shows the right shape — four visible steps, escalating memory, an escape valve, a defined recovery. The pattern also sits inside this repo. `data/subsystems/c1e1-compactor-cycle.json` runs an Encroachment pool from 0 to 5 with **a distinct authored effect at every one of its five values** — the live floor growing ring by ring — plus a stated `bounding` condition and a named trade: five meaningful states across five points.

**Before shipping a tracked number, name what it does at three different values. If you cannot, it is a clock, and it should be built and presented as one.**

A doom clock you can only slow is a legitimate structure — Blades in the Dark and Ten Candles both run on it — but it should be chosen deliberately, because it changes the interesting decision from *"can I avoid this"* to *"can I choose when it lands."*

## 10. Trap options and false choices

A **trap option** looks competitive and is not. A **false choice** looks like a choice but has a dominant answer, so the decision is only a delay. Both waste the most expensive thing a build system has, which is the player's attention at the moment they are most invested. **[C]** The test is one question: *would an informed player ever choose this on purpose?* If never, it is a trap. If always, its alternatives are.

The retired scale-and-chassis design (built on SF2E's own vehicle rules, which this campaign rejected on 2026-09-20) held the best worked example of trap-checking the repo produced, and the method outlives it. Three vehicle chassis with completely different stat profiles were run against one threat model — a DC 32 area attack for about 40 damage, resolved through the basic save degrees and then through Hardness — and all three survived roughly five blasts (14.4 damage per blast against 70 HP, 30.8 against 150, 23.7 against 120). The numbers were not reverse-engineered; they fell out of picking role-appropriate stats off the standard tables, and the stated purpose was *"the check that none of the three is a trap pick."* What differed was variance and everything outside the damage maths — speed, capacity, cover, vision, utility.

The same design's deliberate floor option was mediocre on every axis on purpose, surviving about two area attacks instead of five. It was not a trap, because its weakness was its stated function: *"The point is not that it's a good option, the point is that it is always an option."*

**A weak option is legitimate when its weakness is visible and its job is to be a floor, and a trap whenever a player could reasonably mistake it for a peer.** Build-system traps specifically — feat pitfalls, dead levels, progression pacing — belong to [character-creation-and-progression.md](character-creation-and-progression.md).

## 11. Writing rules text that people can actually use

This repo writes homebrew rules constantly, so this section is meant to be used.

**Write a procedure in this order, every time: name the action, state the cost, state the trigger, state the outcome, state the edge case.** That order matches how a rule is read under time pressure — a player scans for the name, checks whether they can afford it, checks whether it applies now, and only then reads what happens. Any other order forces a re-read.

Five supporting practices:

1. **Keyword discipline.** A defined term means exactly one thing everywhere in the document. If you need a second meaning, you need a second word. This is the highest-value habit in rules writing and the easiest to lose during a rewrite.
2. **Put the cost in the same unit as everything else.** Actions, slices, technician-days, points. A cost in a bespoke unit needs a conversion rule, and conversion rules are where rules text goes to die.
3. **Name the actor in every sentence.** "The pilot attempts", not "a check is attempted". Passive voice hides who rolls, which is the one thing the table needs.
4. **State edge cases last and separately.** An edge case woven into the main sentence doubles the reading cost of the common case.
5. **Plain instructional sentences only.** No aphorism, no flourish, no clever compression. State the instruction outright.

The retired scale-and-chassis design's **Field Repair** was the full shape: named action, cost stated as two actions plus a crew member plus adjacency, a check against a stated DC, all four degrees written out, then the economic edge case set apart.

**Before writing any mechanic, consult `reference/srd/` and `reference/tables/` rather than recalling SF2E from memory.** The mirror holds 245 real SRD articles, with the numbers pre-extracted as plain JSON. The failure mode of writing from memory is a rule that is nearly right, which is worse than one obviously wrong. One confirmed gap: no numeric Elite/Weak adjustment deltas have been found anywhere in the mirrored GM Core or Alien Core text, so elite/weak numbers are a GM judgment call rather than a verified rule until that note changes.

## 12. When a subsystem earns its place

A subsystem is a distinct minigame with its own procedure, pacing and currency. It is expensive: it costs teaching time and table attention, and it competes with the core loop players already know.

GM Core answers this directly and the answer is in the mirror. `reference/srd/gm-core/1125-deciding-to-use-a-subsystem.json` (pg. 205) says to use one for *"a component of the game that's meant to be at least a significant portion of a single session, when you want a different style of play than normal"*; to avoid it where it *"devolves into the PCs making a series of rolls that don't contribute to telling an interesting story"* or would *"predominantly favor a specific player character or class"*, leaving everyone else with nothing to do; and, flatly, *"Sometimes, a simple check is the right way to handle the scene, and that's okay!"*

**A subsystem earns its place only when it changes the style of play for a significant stretch. If it changes nothing except how many dice get rolled, it is a check.**

The repo has answered this structurally, which is the strongest form of an answer because it makes the discipline automatic. `data/schema/subsystem.schema.json` describes a victory-point subsystem — pools with a mode (accumulating or diminishing), obstacles whose degrees of success move them, graduated thresholds, an explicit `bounding`, and a `subsystemSpecific` bag for what does not generalise across Influence, Research, Chases, Infiltration and Hacking. `data/schema/challenge.schema.json` is deliberately lighter — *"one or a handful of DC'd checks with no persistent point pool"* — fitting one-off skill gauntlets. **The split between the two schemas is the decision procedure: if nothing persists between the checks, it is a challenge.** The discipline is holding: `data/` holds one campaign subsystem against two dozen challenges, and `data/challenges/c1e1-kit-issue.json` is two light narrative-only checks — a scene that could have been inflated and was not.

One local extension is worth naming: **`spends`**, an authored, check-free way to move a pool — *"Cost is authored because the GM prices the action, not the dice."* That fills a real gap in the RAW shape, since GM Core's subsystems are all obstacle-driven and a visible clock the players spend down has no DC anywhere in it. On combining subsystems, GM Core advises a long-term backdrop subsystem that shorter ones feed into — relevant to a campaign with a strategy layer, so see [strategy-and-downtime-design.md](strategy-and-downtime-design.md).

---

*Related within this reference series: [mechanics-as-meaning.md](mechanics-as-meaning.md) (the other half of every section above — what a rule argues thematically, where this one asks only whether it works), [character-creation-and-progression.md](character-creation-and-progression.md) (build systems and progression pacing, left out of §10), [strategy-and-downtime-design.md](strategy-and-downtime-design.md) (the Layer 2 economy §8 places in the stack), [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) (fail-forward, the table-side half of §6), [agency-and-player-choice.md](agency-and-player-choice.md) (why a false choice costs more than no choice, §10).*

*Related in this project: `design/design-layers.md` (all of §8); `design/campaign-arc.md` ("penalties cost risk, never choice", §6); `design/ux-doctrine.md` §11 (§7's complexity budget); `data/schema/subsystem.schema.json` and `data/schema/challenge.schema.json` (§12's decision procedure); `data/subsystems/c1e1-compactor-cycle.json` (the five-state pool §9 holds up as the pattern); `data/campaign/config.json` (the numbers cited throughout); `data/campaign/open-questions.json` (`frame-scale-starting-level`, the lockstep answer to §2); `reference/tables/dc-and-check-math.json` and `encounter-and-rewards-math.json` (the verified numbers behind §2–§5).*
