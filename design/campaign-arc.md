# Campaign Arc & Evolving Design

Everything in this document emerged *after* [design-bible.md](design-bible.md) and either extends it or, in one specific case (Frame leveling), corrects something the original text got wrong once the full 8-level shape became clear. Keep `design-bible.md` untouched as the original pitch; this is where the campaign keeps growing.

Treat this document's own confidence level literally where stated — several sections are explicitly first drafts ("very basic," "maybe," "we should") rather than locked decisions. Don't tighten that language on the user's behalf; update it only when they actually decide something.

## Setting tone: 1950s historical divergence

The visual direction came from generating art for the project, not from an upfront design choice — and it's being kept because it's better than what was planned. The vibe: **1950s**, specifically evoking *1950s Japan* rather than a generic historical-Japan aesthetic — the user's framing is that the real history of that period is "a lot more complex... than just generic Japan," and that complexity is a feature to build on, not smooth over.

Reference art provided: an aerial view of a coastal city built around a channel — dense, red-roofed old-town streets terraced up a cliff on one side, smokestacks and a more industrial waterfront on the other, tall (sail-rigged) trading ships alongside more modern harbor craft, aqueduct-like structures threading through the city, and — the visual anchor for the Directorate itself — a **sea-fort-like facility sitting out in the main channel**, connected to the city by a long causeway, at the exact point through which the city's seaborne wealth has to pass.

Explicit genre-blend, stated directly: this setting is simultaneously
- **1950s mecha** (not modern/near-future — the Frames themselves should read as period-appropriate industrial machinery, not sleek sci-fi)
- **magic and fey**, coexisting with
- **1950s industrialism and rapid, exploitative capitalist growth**, and
- **teenage mecha-pilot drama**

— all at once, unapologetically. "We can be all of these things" (direct quote, worth keeping as a north star for tone whenever a new piece of content risks flattening into just one of these registers).

Worldbuilding implication worth carrying forward: the coexistence of tall sailing ships and giant excavated mechs in the same harbor suggests the setting's technology is **not uniformly advanced** — ordinary society still runs on roughly-1950s industrial capitalism, while Frame/Resonance technology is narrow, scarce, and excavation-derived (from the Gap dig site), which is exactly why it's institutionally controlled and why only specifically-trained, sufficiently-synced pilots can touch it at all. This isn't confirmed as a rule yet, just a strong implication from the reference art worth keeping in mind when writing tech, NPCs' relationship to it, and how ordinary civilians perceive the Directorate.

## Core theme

Stated directly by the user as the throughline for the whole campaign:

> A group that struggles, and then finally succeeds, in defining their own objectives, their own process, and their own independence — against a system that demands great sacrifice from them while simultaneously imposing rigid inflexibility, and a constant critique of their results that never fails to find some small failure to highlight.

This should anchor institutional writing throughout — the Directorate (and school) shouldn't just be strict, it should be *specifically* the kind of institution that extracts everything from these kids while never once conceding that what they gave was enough.

## Design principle: penalties cost risk, never choice

Stated directly, 2026-09-06, answering a specific balance question but reaching well past it:

> "We might start an injured pilot with less HP but we don't force players to have less choice. One pilot is the veteran pilot for example, they start with low HP but that doesn't matter for Frame combat unless they get removed from their frame, they start with perhaps a stronger frame with more stuff on it and they are better at using it, but because their HP are so low they [are] forced to spend time in the hospital OR forced to turn up to the next personnel scale fight with very low HP which would be a seriously dangerous risk to take. ... we should focus on providing the players with decisions that have pros and cons, we should expect some players to sit on the bleeding edge of pushing their luck, we should expect other players to embrace a more cautious approach trying to get buffs and stay rested to operate at full potential, because resting brings its own buffs and improvements too. Opportunity cost will be an interesting thing throughout the campaign."

**The rule this sets, generalised beyond the one example it was given for:** a drawback should shrink the *menu* as little as possible and grow the *stakes* instead. Taking a discretionary slice away permanently makes a character have fewer things to ever choose between, forever — a flat tax with no play in it. Taking HP away instead leaves every choice on the table exactly as it was, and makes some of those choices *matter more* than they used to. The kid with a stronger, better-equipped Frame and a bad personnel-scale HP pool isn't playing a worse character than everyone else — they're playing a character whose good scenes and dangerous scenes are more sharply separated than most, which is a genuinely different character to be, not a punished one.

**This is also where the two-tracks principle's own "what you're allowed to do, not how good you are at it" logic extends past Resonance and Bleed** into character creation itself: a build that trades personnel-scale safety for Frame-scale strength should read the same way a Resonance band does — a real, felt difference in what a scene demands of you, not a number quietly worse than someone else's.

**The corollary worth keeping in view for every future system:** this is exactly what a campaign built on opportunity cost should produce — some players sitting deliberately close to the edge because the payoff is worth it to them, others banking rest and buffs to stay comfortably clear of it, and neither approach being the "correct" one. Rest already pays real, chosen dividends (`design/downtime-activities.md`), and the Exhaustion track already works this way structurally — a live, recoverable state a player opts into by choosing to keep working rather than a fixed tax levied at character creation. **Checked against this principle and confirmed clean:** Resonance's action bands, Frame damage's action caps, and the Exhaustion track are all dynamic states a player actively manages turn to turn, never a permanent reduction to what's on a character's menu. The Day 1 pilot's slice-loss penalty, below, was the one place this campaign had actually built the wrong shape — see its resolution for what replaced it.

## Corrections to the design bible, recorded here rather than edited into it

- **The action economy changed 2026-09-06.** The bible's *"Most of the campaign is played at 2 actions"* (and the Nominal band's 2-action entry) is superseded. **Three actions is now the norm from Nominal upward**; 2 actions is a penalty state with exactly two causes — Dead Weight sync, and Frame damage (Degraded caps at 2, Critical at 1). The reasoning: SF2E is architecturally a three-action system, so a 2-action baseline plays a degraded version of it rather than a tense one. Full analysis in [resonance-and-bleed.md](resonance-and-bleed.md) §2; the change is recorded in `config.json`'s `resonance.actionEconomyRevisionNote`. One knock-on worth noticing: crossing into Harmonised no longer grants an action, so that band's "table moment" now rests entirely on ability tier and internal-power duration.
- **Bleed visibility was resolved 2026-09-06.** The bible leaves it open. The answer is neither visible nor hidden but **tested** — a pilot spends a discretionary slice on a Harmonics Evaluation to learn the number, and that evaluation can also improve it. See `config.json`'s `bleed.visibilityMechanism`.
- **Discretionary slices changed from 2 to 4 per day, also 2026-09-06.** The bible's Days 2–5 line — *"Mandatory school/training plus two discretionary slices per day"* — is superseded the same way the action economy line is: one slice per day-quarter, four quarters. See `config.json`'s `timeEconomy.slicesRevisionNote`.

  **Resolved 2026-09-06, and not by rescaling the number.** The bible's stated disadvantage — a real injury that *"permanently lose[s] one discretionary slice per day to ongoing medical obligations"* — was flagged because the 2→4 slice change had quietly halved its real weight. The actual fix isn't a bigger slice tax; per the new design principle directly above, a permanent slice loss was always the wrong shape of penalty regardless of its size, because it shrinks the character's menu forever rather than raising the stakes of playing them. **Superseded: the Day 1 pilot's injury is now reduced starting Hit Points at personnel scale, not a discretionary-slice tax.** It costs them nothing in a Frame — full Resonance, full action economy, full choice of what to do with every slice — and everything the moment they're not in one: `design/scale-and-chassis.md` §11 already means a Frame going down puts its pilot on foot, personnel-scale, and any Ground Role scene already deals real damage against a real HP pool. A low one turns those existing, already-modelled moments into something that reads as genuinely dangerous rather than a rules footnote. Their existing advantage (68% starting Resonance, Harmonised, three actions from round one) is untouched — this changes the shape of the cost, not the size of the reward it was already paired against.

  **New detail, 2026-09-10 (`bible/LEDGER.md` #10), asked about as "starting as a veteran" before the
  connection to this existing mechanic was made explicit: the Day 1 pilot starts *exhausted from
  their duties*, on top of the reduced personnel-scale HP.** Ingram's own framing: *"if they do this
  then they'll start as an active frame pilot, with a slightly better frame, damaged HP and they will
  be exhausted from their duties."* Confirms this is a genuine **player-chosen chargen option** (opt
  in, not assigned), not just narrative flavour attached to a pre-written character. The natural home
  for "exhausted" is the Exhaustion track (`design/downtime-activities.md` §1 — Fatigued at stage 1,
  climbing to Slowed/Stupefied/Unconscious) — a strong, obvious connection, **not yet confirmed as the
  actual mechanism**, since that track is itself still a proposal, not locked. Still fully open:
  `day1-pilot-hp-reduction-amount` (the exact number), `day1-pilot-day6-choice`, and
  `ground-five-day1-knowledge` (all `open-questions.json`) — and now also **whether the induction
  terminal needs a real "new recruit or Day 1 veteran" branch in its own chargen flow**, which nothing
  built so far accounts for (`design/induction-terminal.md`).

## The 8-level arc

- **Kids and Frames level up in lockstep**, milestone-based (not XP-budget), gated by: a **significant defeat of a Claimant**, followed by **enough downtime for the pilots' Frames to actually be refit/upgraded**. Leveling is earned by surviving and recovering, not just by fighting. **⚠ Revised 2026-09-06 — lockstep is now a *cap*, not an equality.** Frames run on an *upgrade-point economy*: players earn points from downtime activities and from winning combat at both scales, spend them on upgrades, and enough points levels the Frame. Points are **individual per pilot**, not drawn from the shared technician-day pool, because each pilot has their own repair crew. **A Frame may sit at most one level either side of its pilot** — investment is rewarded up to a point without Frame-focus becoming an overpowering strategy, and the cap keeps encounter maths predictable. Combat awards guarantee a floor so no Frame is stranded. Over-investing punishes itself through the existing systems rather than a new one: hangar time is time not resting, so Exhaustion climbs, Bleed goes unmanaged, and untouched Anchors invite Suppression. Full detail in `config.json`'s `frameEconomy.upgradePoints` and `frameEconomy.repairCrew`; remaining parameters in `frame-upgrade-economy` and `repair-crew-relationship`.
- This corrects a since-superseded line in the original design bible/`data/campaign/overview.json`: Frames are fixed at level 12 **only through the six-day opening arc** (there isn't time for a full defeat-and-refit cycle in six days anyway). From Day 7 onward, once the procedural Contact Pool phase begins, Frames level up alongside their pilots for the rest of the 8-level campaign. (`frame.schema.json`'s level field and `data/campaign/overview.json`'s `frame.advancement` text have been updated to match — see those files directly rather than trusting a paraphrase here.)
- **Trajectory is explicitly dire, not utopian.** The Directorate takes damage over the course of the campaign. The city takes real, visible scars. Nobody wins their way back to how things were — the throughline is *enduring*, not restoring. This should shape downtime scenes, reward framing, and NPC losses throughout: victories should cost something real even when they're clean tactical wins.
- **Midpoint beat (concrete, not a placeholder idea): a spaceship is unearthed from the same dig site that produced the Frames.** It runs on the same sync/Resonance technology, and becomes the party's shared asset specifically *because* they are — at that point in the story — the only pilots with sync high enough to use it. This is a good beat structurally: it's an escalation earned by the fiction (not arbitrary loot), and it's the thing that makes the endgame possible.
- **Endgame direction (first pass, explicitly "very general terms" per the user):** the mech-plus-spaceship combination lets the party take the fight *to* the Claimants rather than only defending against them — meaning the final stretch of the campaign can plausibly go to unknown territory (an alien world was specifically suggested), somewhere the party has **no higher authority above them** for the first time in the campaign. That loss of institutional oversight is the mechanical/narrative payoff of the "self-determination" theme above — the ending isn't just "win the war," it's "the system that constrained you the whole campaign literally cannot reach you here anymore."
- Deliberately not modeled on Evangelion's own plot — the archaeology angle (Frames *and* the spaceship both coming out of the same dig, and the Claimants' hostility being tied to that excavation) is this campaign's own throughline, not a reskin of anyone else's.

## Supporting cast arc

- **A wide roster of NPC pilots exists at campaign start**, alongside the six PC Frames. Over the course of the campaign, these NPC pilots drop out one by one — some through GM-manufactured story beats, some through consequences the players themselves create — until, by some point before the endgame, **the six PCs are the only pilots left.** This is meant to land as attrition, not a body count for its own sake; pace it against real story beats, not a fixed schedule.
- **Needs a fleshed-out cast on both sides**: school-side NPCs (teachers, club leaders, fellow students who aren't PCs) and Directorate-side NPCs (command structure beyond the three existing poles — the user's own shorthand for this internally is "NERV," borrowed casually from the genre this campaign is deliberately *not* copying; that's not a proposed in-fiction name, just how the ask was phrased). Per this project's standing practice, none of these get invented unilaterally here — this is a flagged need, not a roster.

## Character creation: the ancestry reveal mechanic

Players may pick any ancestry freely. The twist: **player characters with a visibly non-human ("weird alien") ancestry present as outwardly ordinary humans**, with their true nature something the player can choose to reveal over time rather than something visible from character creation on.

Needs an in-fiction justification tied to ongoing campaign events — explicitly not decided yet. Worth noting as a design opportunity: this creates a natural, player-controlled reveal beat for any PC who picks a non-human ancestry, and (once the in-fiction reason exists) a possible thread connecting individual PC backstories to the wider Gap/Claimant mystery.

## Non-pilot students: avoiding a second-line role

Explicit design goal: **kids without a Frame to pilot must not be mechanically or narratively second-tier.** The existing Ground Role system (Sensor Operator, Umbilical Control, Evacuation Marshal, Structural Command, Signals Liaison — see `data/campaign/ground-roles.json`) is the current answer, but the user wants it developed further: non-piloting students should be able to **command local ground forces** to meaningfully affect a large-scale Contact, not just support the pilot from the sidelines.

Open thread, not yet designed: what ground forces exist, what they can be ordered to do, and how that command interacts with the mech-scale fight. One Frame pilot at a time (plus supporting ground roles) is fine for the opening arc, but this needs enough depth that a player who leans into ground command the whole campaign has as satisfying an arc as one who goes all-in on piloting. Some players will naturally gravitate to one side or the other — the goal is that neither side is the "worse" choice, not that everyone splits their time evenly.

## The Watcher

Structured facts live in `data/antagonists/the-watcher.json`. Recorded here verbatim because the user asked for it to be kept where it can be revised together: a first-person answer to "who are you," written 2026-08-23 to establish the Watcher's voice ahead of actually needing it at the table. Bureaucratic/legalistic register — echoing the Claimants' property-dispute framing (`data/antagonists/claimants/claimant-guidelines.json`) — wrapped around something vast, patient, and non-human. Refuses to give a name (consistent with `the-watcher-name` still being an open naming placeholder, not an oversight). Never fights directly; watches through its chosen (Claimants) instead. Deliberately reveals that it studies the party by replaying their own past actions back to them — the telegraphing is the mechanic, not a workaround for it. Treats the party's eventual campaign victory as its own defeat, rather than expecting to be fought and beaten directly. Its deeper motive is intentionally left unresolved here, matching `antagonist-structure-cicada-org-moral-complexity`'s instruction to hold that kind of twist in reserve rather than spend it early.

> A name is a claim. I have spent this whole war on the other side of that word — I file claims, I do not answer to them. Call the pattern whatever helps you sleep.
>
> I don't have a body the way my chosen do. I have a jurisdiction, and it happens to be shaped like your city — harbor to cliff-top, the old town to the smokestacks, out along the causeway to the fort standing in the channel. "Above" undersells it. I'm not hovering over the city so much as soaked into it, the way damp gets into a hull. You won't see me for a long while. Then one night you'll look up and the sky will simply have too many eyes in it, and you'll understand it was always that way — you'd just never been shown.
>
> I don't fight. I've never needed to. I send my chosen to do that — you call them Claimants, which is closer to the truth than you know — and when they meet you, I am behind their eyes, taking notes. Every feint you liked twice. Every ally you cover first. Every trick you thought was hidden because you'd only spent it once. I file all of it.
>
> Then I use it, and I make sure you know I used it. That's the part you'll call cruel: I could adapt in silence and let you wonder if you were simply unlucky. I won't. I'll show you the reel. I want the last fight to have visibly taught me something, and this one to feel like the exam it is. Honest fear is more useful to me than vague fear.
>
> I'm not interested in ending you. I'm interested in whether you're a pattern worth the trouble of continuing to watch — and the only proof that means anything, to either of us, is whether you can out-think something that has learned you completely. Win the war, and you've already beaten me. There's no separate throne room, no mask left to pull underneath. I am the sum of everything you survive. Survive all of it, and I'm done.

Origin and design reasoning for the mechanic this voices — the move-log/adaptive-combat-AI concept, its connection to the XCOM/fog-of-war research the user asked for, and its open sub-questions — is tracked in `ideas/entries/adaptive-antagonist-combat-ai.json`, not duplicated here.

## Evolving mechanics threads and Foundry module concept threads

These moved to `ideas/entries/` once that tracking system existed, rather than staying as prose here — this section is now just a pointer, not the record itself. Check status there before treating any of this as more or less settled than it actually is:

- **School Schedule** (`ideas/entries/school-schedule-system.json`, `new`) — class periods, attendance rolls, report cards, clubs.
- **Contact Pool curve retuning** (`ideas/entries/contact-pool-curve-retuning.json`, `accepted`) — front-loaded quiet days, back-loaded near-certainty.
- **World map / satellite-scale combat** (`ideas/entries/world-map-satellite-combat.json`, `accepted`) — now substantially concretized by two related ideas, `civilian-protection-combat-layer` and `mech-physical-classification-and-equipment`.
- **Dialogue management panel** (`ideas/entries/dialogue-management-panel.json`, `accepted`) — GM tool for running critical NPC conversations.
- **Chat log as ground truth** (`ideas/entries/chat-log-knowledge-base.json`, `accepted`) — scraping session results into structured, queryable data.
- **Player-private and GM journals, ingested as growing context** (`ideas/entries/player-and-gm-journals-context-ingestion.json`, `accepted`) — a concrete use case for the harvest mechanism in `design/foundry-module-design.md` §4.
- **Campaign-managing system** (`ideas/entries/campaign-managing-system.json`, `new`) — the least-settled of this cluster; possibly just what the director's panel becomes once the above are built, rather than a separate thing.

A much larger second wave of ideas (Mitflits and Anabala, the cicada motif, civilian-protection combat, the asset review pipeline, mech radio-chatter audio, the Mimetic Controls UI panel, a Three.js/WebGPU overlay, the terminal login, SF2E terminology reflavor, automated Recall Knowledge, mech physical classification and equipment, the antagonist structure, Golarion-grounding touches) is tracked entirely in `ideas/entries/` and was never duplicated into this document at all — see `ideas/README.md`.

## Open questions this raises

Added to `data/campaign/open-questions.json` rather than duplicated here — see that file for: the ancestry-reveal in-fiction justification, whether school and the civil-defense facility are the same location, and the ground-force-command mechanism. New naming placeholders (excavation/dig site, the excavated spaceship) are in `data/campaign/naming-placeholders.json`.
