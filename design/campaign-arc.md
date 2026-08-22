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

## The 8-level arc

- **Kids and Frames level up in lockstep**, milestone-based (not XP-budget), gated by: a **significant defeat of a Claimant**, followed by **enough downtime for the pilots' Frames to actually be refit/upgraded**. Leveling is earned by surviving and recovering, not just by fighting.
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
