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

Worldbuilding implication worth carrying forward: the coexistence of tall sailing ships and giant excavated mechs in the same harbor suggests the setting's technology is **not uniformly advanced** — ordinary society still runs on roughly-1950s industrial capitalism, while Frame technology is narrow, scarce, and derived from what was dug up (the generation ship opened at Kortos: Gen 1 is copied from what was seen there, and Gen 2 is built from its technology, LEDGER #20 and #34), which is exactly why it's institutionally controlled and why only specifically-trained, sufficiently-synced pilots can touch it at all.

**Confirmed 2026-09-02** (see `ideas/entries/gap-derived-tech-disparity.json`) — this is no longer just an implication. It extends further than tech level, too: the party's phones run on the same ship-derived substrate as the Frames, which is *why* the Watcher can read their traffic essentially for free — not hacking a closed system, but native to the medium it's built from. Full mechanism and the resulting table payoffs are tracked in that idea entry and in `ideas/entries/watcher-reads-all-comms.json`, not duplicated here.

*(Corrected 2026-09-24, LEDGER #32 and #33: these two paragraphs said the technology came "from the Gap dig site" and ran on a "Gap-derived substrate". It comes from the mitflits' crashed ships, and **the Gap is an event after this adventure**, perhaps a result of it, perhaps the only way to undo Second Impact (LEDGER #33, open), not a place. "Frame/Resonance" lost its second half when Resonance was cut on 2026-09-20. The idea entry keeps its old id, `gap-derived-tech-disparity`, so links don't break.)*

## Core theme

Stated directly by the user as the throughline for the whole campaign:

> A group that struggles, and then finally succeeds, in defining their own objectives, their own process, and their own independence — against a system that demands great sacrifice from them while simultaneously imposing rigid inflexibility, and a constant critique of their results that never fails to find some small failure to highlight.

This should anchor institutional writing throughout — the Directorate (and school) shouldn't just be strict, it should be *specifically* the kind of institution that extracts everything from these kids while never once conceding that what they gave was enough.

## The two themes: surveillance and the runaway

Stated by Ingram, 2026-09-24 (LEDGER #31), and the campaign's strongest over-arching idea from here on:

> "if you want a very very strong over arcing theme it's about two things, mass surveillance and the risks thereof and
> runaway uncontrollable agentic adversary explosions which threaten the structure of society. If we can spook the
> players with that premise, a very real concern that all my players are aware of then we'll have done things
> correctly."

**It is ludonarrative on purpose.** The Watcher is an alien artificial intelligence, and **Claude plays it**: it reads
what the players write into the campaign's systems, learns how they fight, and plays against them with that
knowledge (`quarantine/ideas/story/dossier-observer.md` §2). Players are warned never to record anything real or personal in the
UI, are not told the messages are read, and need the system to reach some things. The Watcher only ever uses the
fiction.

**Both themes run on both sides of the fence.** The Directorate reads its trainees' messages as routine policy; the
Watcher reads the same traffic natively. The runaway is the Watcher's children learning to make their own Sap, and it
is also an institution that won't stop digging. Nobody in the chain is evil. That is what makes it frightening.

## Design principle: penalties cost risk, never choice

Stated directly, 2026-09-06, answering a specific balance question but reaching well past it:

> "We might start an injured pilot with less HP but we don't force players to have less choice. One pilot is the veteran pilot for example, they start with low HP but that doesn't matter for Frame combat unless they get removed from their frame, they start with perhaps a stronger frame with more stuff on it and they are better at using it, but because their HP are so low they [are] forced to spend time in the hospital OR forced to turn up to the next personnel scale fight with very low HP which would be a seriously dangerous risk to take. ... we should focus on providing the players with decisions that have pros and cons, we should expect some players to sit on the bleeding edge of pushing their luck, we should expect other players to embrace a more cautious approach trying to get buffs and stay rested to operate at full potential, because resting brings its own buffs and improvements too. Opportunity cost will be an interesting thing throughout the campaign."

**The rule this sets, generalised beyond the one example it was given for:** a drawback should shrink the *menu* as little as possible and grow the *stakes* instead. Taking a discretionary slice away permanently makes a character have fewer things to ever choose between, forever — a flat tax with no play in it. Taking HP away instead leaves every choice on the table exactly as it was, and makes some of those choices *matter more* than they used to. The kid with a stronger, better-equipped Frame and a bad personnel-scale HP pool isn't playing a worse character than everyone else — they're playing a character whose good scenes and dangerous scenes are more sharply separated than most, which is a genuinely different character to be, not a punished one.

**This extends into character creation itself:** a build that trades personnel-scale safety for Frame-scale strength should read as a real, felt difference in what a scene demands of you, not a number quietly worse than someone else's.

**The corollary worth keeping in view for every future system:** this is exactly what a campaign built on opportunity cost should produce — some players sitting deliberately close to the edge because the payoff is worth it to them, others banking rest and buffs to stay comfortably clear of it, and neither approach being the "correct" one. Rest already pays real, chosen dividends (`design/downtime-activities.md`), and the Exhaustion track already works this way structurally — a live, recoverable state a player opts into by choosing to keep working rather than a fixed tax levied at character creation. **Checked against this principle and confirmed clean:** Frame damage's action caps and the Exhaustion track are both dynamic states a player actively manages turn to turn, never a permanent reduction to what's on a character's menu. The Day 1 pilot's slice-loss penalty, below, was the one place this campaign had actually built the wrong shape — see its resolution for what replaced it.

## Design pattern: player moments

Stated directly by Ingram, 2026-09-24, while shaping The Road In:

> "we ask them to describe a small problem they hit on the journey in to the city. We then ask them what skill they used to try and overcome it. They tell us the skill. We then ask them to make a roll against a normal DC. We then record the result, it's a bit of the players own unique moment story telling and we'll try and do this on a fairly regular basis. We'll ask players to describe something that happens to them, they don't need to say much but we'd appreciate even just a few sentences on how an event unfolds."

**The pattern, as a standing tool for any scene:**

1. **The GM asks a player to describe something that happens to their character** -- a small problem, a moment, an event. Small is the point.
2. **The player names the skill** they use on it. Any skill they can argue for; the GM does not argue back.
3. **They roll it against the normal DC** for their level (Chapter One: DC 15, no adjustment).
4. **The player tells how it unfolds**, shaped by the degree of success. A few sentences is plenty; one is fine.
5. **The GM writes it down** -- the problem, the skill, the result, one line of how it went. These are callbacks, and the start of each character's own record.

**Rules that keep it working:**

- **It costs nothing mechanical on any result.** A failure is a story the player tells, never a lost resource, slice or opportunity -- the same floor as an Encyclopaedia check, and for the same reason: it exists to hand the camera to a player, and a camera that can hurt you is one nobody wants to hold. It is not an Encyclopaedia check, though: that one is offered for information, this one is offered for authorship.
- **A player who would rather not roll does not have to.** They tell us how it went, and nothing is lost.
- **The player narrates, not the GM.** The GM's job is to ask the question, say the degree, and listen. If a player hands it back, a single prompt ("so what happens?") is enough; never take the story off them.
- **It is its own beat, one player at a time.** Author it as a `delivery: "each"` check with `anySkill: true` (the Scene Runner posts every skill and the player clicks the one they named, so the result still records itself -- `core/roll-intent.mjs#checkSkills`).
- **Use it regularly, not constantly.** A journey, a night off, the walk to a briefing, the first morning after a fight. It is best where a scene would otherwise be the GM narrating six people's quiet time for them.

**First instance:** The Road In's `the-small-problem` (`data/scene-briefs/episode-c1e1--the-road-in.json`, `data/challenges/c1e1-the-road-in.json`).

## Corrections to the design bible, recorded here rather than edited into it

- *(Cut 2026-09-20: Resonance and Bleed, and with them the bible's 2-action default, its sync bands and the Bleed-visibility question. Removed from this document 2026-09-25.)*
- **Discretionary slices changed from 2 to 4 per day, 2026-09-06.** The bible's Days 2–5 line — *"Mandatory school/training plus two discretionary slices per day"* — is superseded: one slice per day-quarter, four quarters. See `config.json`'s `timeEconomy.slicesRevisionNote`.

  **Resolved 2026-09-06, and not by rescaling the number.** The bible's stated disadvantage — a real injury that *"permanently lose[s] one discretionary slice per day to ongoing medical obligations"* — was flagged because the 2→4 slice change had quietly halved its real weight. The actual fix isn't a bigger slice tax; per the new design principle directly above, a permanent slice loss was always the wrong shape of penalty regardless of its size, because it shrinks the character's menu forever rather than raising the stakes of playing them. **Superseded: the Day 1 pilot's injury is now reduced starting Hit Points at personnel scale, not a discretionary-slice tax.** It costs them nothing in a Frame — full choice of what to do with every slice — and everything the moment they're not in one: a Frame going down puts its pilot on foot, at personnel scale, against a real HP pool. A low one turns those moments into something that reads as genuinely dangerous rather than a rules footnote. Their existing advantage (a slightly better Frame, LEDGER #10) is untouched — this changes the shape of the cost, not the size of the reward it was already paired against.

  **New detail, 2026-09-10 (`bible/LEDGER.md` #10), asked about as "starting as a veteran" before the
  connection to this existing mechanic was made explicit: the Day 1 pilot starts *exhausted from
  their duties*, on top of the reduced personnel-scale HP.** Ingram's own framing: *"if they do this
  then they'll start as an active frame pilot, with a slightly better frame, damaged HP and they will
  be exhausted from their duties."* Confirms this is a genuine **player-chosen chargen option** (opt
  in, not assigned), not just narrative flavour attached to a pre-written character. The natural home
  for "exhausted" is the Exhaustion track (`design/downtime-activities.md` §1 — Fatigued at stage 1,
  climbing to Slowed/Stupefied/Unconscious) — a strong, obvious connection, **not yet confirmed as the
  actual mechanism**, since that track is itself still a proposal, not locked. Still fully open:
  `day1-pilot-hp-reduction-amount` (the exact number) and `day1-pilot-day6-choice` (both
  `open-questions.json`) — and now also **whether the induction
  terminal needs a real "new recruit or Day 1 veteran" branch in its own chargen flow**, which nothing
  built so far accounts for (`design/induction-terminal.md`).

## The 8-level arc

*(2026-09-24: the campaign now runs twenty chapters, Chapter 1 to Chapter 20, and the heading is kept for its history. The box below is the current shape.)* *(And the chapter-by-chapter draft, the Casebook's sixth version, lives in `quarantine/ideas/story/blank-inheritance-twenty-chapters.md`: the truth the mystery hides, how the mystery is built, and all twenty chapters in five Books. A draft, with proposals marked.)*

> **⚠ THE WHOLE-CAMPAIGN SHAPE, 2026-09-24 — Ingram (LEDGER #26, updated by #31), and it overrides the endgame
> bullets below where they differ. GM-ONLY: "Record this, but don't tell the players too much."**
>
> - **The campaign runs Chapter 1 to Chapter 20** (a chapter is a level). Everything not yet played is a flexible
>   draft (LEDGER #31).
> - **Second Impact**, the name for the rupture in Kurose, **is the campaign's great crisis, about three-quarters of
>   the way through (Chapter 15)**, and it is **unavoidable**. The gods foretold it (LEDGER #25). Nobody knows when,
>   because *the conditions are not yet right*, which is why augury returns nothing. **The players and the
>   antagonists will bring the right mix of things together.** **The cause (LEDGER #40, superseding #26's three
>   candidates): a weapon the Watcher builds from exotic matter**, without understanding that it could destroy
>   itself, the city, Golarion and a chunk of space around it. It learns how much the matter matters by watching the
>   Directorate recover it from the search ship and guard it. What sets the weapon off can still vary. **Nobody
>   knows the Watcher exists until the party uncovers it** (LEDGER #40).
> - **The Watcher has to be solved at the same time.** It is an unbound nanotech swarm that normal technology and
>   magic can't bind, and by then its own children are making Sap: the runaway. **If Manako is dead by then (the
>   players' choice, and the wrong one), nothing is steering it at all.**
> - **Both need the mitflit home world.** The party travels there and undertakes a quest to solve an extreme problem.
>   The home world is unique, custom and high-level content, and nothing about it is pinned down yet.
> - **The last quarter is a starship campaign.** The players become **command staff on an enterprise-sized
>   intergalactic starship with a crew of thousands.** **There is no spaceship combat** (Ingram, D15): fights stay at
>   personnel scale and Frame scale, so the players keep their own abilities.
> - **Possible, if the table's appetite allows: unannounced flashbacks** in which the players suddenly play the four
>   founders in the past, under PF2E rules. **Liam plays Rupiah, Pippa plays Anabala, Craig plays Shucks and Steve plays
>   Hyuck**, the characters they played in the original campaign. Jamie and Anne need flashback characters, made
>   later. Not scheduled; a standing option. **Pippa may choose to keep playing Anabala in the present too, as one of
>   the students** (LEDGER #32, open). Abraxas can still emerge from her, and Anabala stays Pippa's to play
>   (LEDGER #33).
> - **There are two ships.** The generation ship lies at Kortos (First Impact happened there, on its cargo deck). The
>   search ship lies under Kurose, and it is **why** the gods named Kurose (`quarantine/ideas/story/dossier-first-impact.md` §1a).
>   The dig that reaches the whole ship is a journey from the city, off the city map, and it is the first of **a few
>   expeditions**: places off the city map, each drawn as its own real-data map, for a specific event or problem
>   (LEDGER #42).
>   **The Directorate was born to guard the opened generation ship** (LEDGER #32): Kortos's organisations banded
>   together to keep the site secure, prevent another rupture, and stop the technology disrupting the world. It leaked
>   anyway.
> - **Gen 1 and Gen 2 are different things** (LEDGER #32). Gen 1 Frames are Golarion technology informed by the ship:
>   mechanical clankers with no living core. Gen 2 Frames are Anabala's, built from actual mitflit technology:
>   biomechanical, more like being inside a giant humanoid. Never confuse the two.
> - **The old enemy is alive** (GM-only, a secret kept for the right moment, LEDGER #32). **William Charles Baldwin**,
>   the old campaign's mitflit hunter, bought his way through two centuries. He is now a criminal lord who arms gangs
>   with incredible weapons made by essentially enslaved mitflits. The four founders are his natural enemies, and his
>   reveal is personal for the four players who played them (`quarantine/ideas/story/bible/characters/william-charles-baldwin.md`).
>
> Full record: `quarantine/ideas/story/bible/LEDGER.md` #26, #31 and #32. The Casebook (a GM-only draft framework for all twenty
> chapters) is the working plan, and is a draft.

> **⚠ UPDATED 2026-09-20 — lockstep is now the literal, confirmed model.**
> Ingram confirmed pilot and Frame share one level, starting at level 1: Frame combat begins within the
> party's first two levels, they are solidly combat pilots by level 3, and Gen 2 arrives around level 4.
> There is no level-12 Frame in this campaign any more, and no scale gap for one to sit across. Frames
> and vehicles are PC-grade sheets that amplify the pilot's own sheet (GitHub #196).
>
> **Resolved the same day:** the upgrade economy survives as a credit budget that buys capability,
> never levels, so the 2026-09-06 "lockstep is a *cap*, not an equality" revision (a Frame one level
> either side of its pilot) is void. See `open-questions.json#frame-upgrade-economy` and
> `config.json`'s `frameEconomy.upgradePoints`.

- **Kids and Frames level up in lockstep**, milestone-based (not XP-budget), gated by: a **significant defeat of a Claimant**, followed by **enough downtime for the pilots' Frames to actually be refit/upgraded**. Leveling is earned by surviving and recovering, not just by fighting. Upgrades are a **credit budget that buys capability, never levels**: the machine's own feats, weapons, armour and equipment, earned from downtime activities and from winning fights at both scales. The budget is **individual per pilot**, not drawn from the shared technician-day pool, because each pilot has their own repair crew. Over-investing punishes itself through the existing systems rather than a new one: hangar time is time not resting, so Exhaustion climbs. Full detail in `config.json`'s `frameEconomy.upgradePoints` and `frameEconomy.repairCrew`; see also `frame-upgrade-economy` (resolved) and `repair-crew-relationship`.
- **Trajectory is explicitly dire, not utopian.** The Directorate takes damage over the course of the campaign. The city takes real, visible scars. Nobody wins their way back to how things were — the throughline is *enduring*, not restoring. This should shape downtime scenes, reward framing, and NPC losses throughout: victories should cost something real even when they're clean tactical wins.
- **Midpoint beat (concrete, not a placeholder idea): the dig under Kurose breaks into a second ship, the search ship (LEDGER #31).** It is not the Kortos site the Frames' technology came from (LEDGER #34). This is a good beat structurally: it's an escalation earned by the fiction (not arbitrary loot), and it's the thing that makes the endgame possible.
- **Endgame direction (first pass, explicitly "very general terms" per the user):** the mech-plus-spaceship combination lets the party take the fight *to* the Claimants rather than only defending against them — meaning the final stretch of the campaign can plausibly go to unknown territory (an alien world was specifically suggested), somewhere the party has **no higher authority above them** for the first time in the campaign. That loss of institutional oversight is the mechanical/narrative payoff of the "self-determination" theme above — the ending isn't just "win the war," it's "the system that constrained you the whole campaign literally cannot reach you here anymore."
- Deliberately not modeled on Evangelion's own plot — the archaeology angle (Frames *and* the spaceship both coming out of the same dig, and the Claimants' hostility being tied to that excavation) is this campaign's own throughline, not a reskin of anyone else's.

## Supporting cast arc

- **The table (LEDGER #31).** The six players are Liam, Pippa, Craig, Steve, Jamie and Anne. The first four played the founders in the original campaign, so **four of the present-day founders are NPCs whose players sit at the table.** Treat those meetings with care: each is a player meeting their own old character two hundred years on. Give the founder's player the spotlight when their kid meets them, where the scene allows.
- **A wide roster of NPC pilots exists at campaign start**, alongside the six PC Frames. Over the course of the campaign, these NPC pilots drop out one by one — some through GM-manufactured story beats, some through consequences the players themselves create — until, by some point before the endgame, **the six PCs are the only pilots left.** This is meant to land as attrition, not a body count for its own sake; pace it against real story beats, not a fixed schedule.
- **Needs a fleshed-out cast on both sides**: school-side NPCs (teachers, club leaders, fellow students who aren't PCs) and Directorate-side NPCs (command structure beyond the three existing poles — the user's own shorthand for this internally is "NERV," borrowed casually from the genre this campaign is deliberately *not* copying; that's not a proposed in-fiction name, just how the ask was phrased). Per this project's standing practice, none of these get invented unilaterally here — this is a flagged need, not a roster.

## Character creation: the ancestry reveal mechanic

Players may pick any ancestry freely. The twist: **player characters with a visibly non-human ("weird alien") ancestry present as outwardly ordinary humans**, with their true nature something the player can choose to reveal over time rather than something visible from character creation on.

Needs an in-fiction justification tied to ongoing campaign events — explicitly not decided yet. Worth noting as a design opportunity: this creates a natural, player-controlled reveal beat for any PC who picks a non-human ancestry, and (once the in-fiction reason exists) a possible thread connecting individual PC backstories to the wider Claimant mystery.

## Non-pilot students: avoiding a second-line role

*(Cut 2026-09-20: the five ground roles and the non-pilot ground-command thread; every player is in a Frame or a vehicle for large-scale combat, `open-questions.json#ground-roles-viability`. Removed from this document 2026-09-25.)*

## The Watcher

> **Rewritten 2026-09-24 (LEDGER #31): the Watcher is the campaign's adversary, and Claude plays it.** It is the
> generation ship's navigation and sensor system, torn into an unbound nanotech swarm at First Impact. Its objective
> is to observe, and so to multiply and expand, and it learns how to defeat the party if they get in its way.
> **The full, current account is `quarantine/ideas/story/dossier-observer.md`**, which wins over anything below. The voice
> recorded below (written 2026-08-23) is no longer its only voice: it is the voice of the Watcher **later** in the
> campaign, once it has learned. Early on it is a drowning instrument (dossier §9). Structured facts:
> `data/antagonists/the-watcher.json`.

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

## The mayor, the raids, and the two branches of personnel-scale combat

Added 2026-10-07 from Ingram's lore. `canon/decisions/D068.md` holds her words and is the record; this section only says what the design does with them.

- **Why the party fights at personnel scale.** The Directorate has a large number of people under arms and training. Kurose has an organised-crime problem, and its mayor is a big fan of the Directorate for the money it brings, so the Directorate and the city's police (who otherwise distrust each other, D035) are forced into uneasy cooperation whenever a raid or other activity is against organised criminals or dangerous cultists. That arrangement is the reasoning for the party being "a sort of Magical SWAT Team", brought in for certain missions.
- **Two branches.** Criminals and cultists are the campaign's two main branches of personnel-level combat. Frames and vehicles remain a separate scale.
- **Where each thread leads.** The organised-crime thread eventually leads to Baldwin and to Manako's underworld dealings. The cultist thread leads to Manako directly, and to the non-violent origins of Cicada: the Envoy incident (Hori and Aoi), and the tragic history of a man who tried to upset the order of things to warn about something invisible in our midst, was ostracised for it, and whose warning powerful people looked into and started to suspect was right. Who those people were is open (`canon/world/manako.md`, `manako.who-suspected`).
- **The mayor.** A new character the party can meet: a blessing and a curse, their own agent, protecting the city and their own position equally. Not yet named or placed in the plan (`open-questions.json#kurose-mayor-name`, `#mayor-first-appearance`).
- **Not settled by this:** Episode Two's call-out (`open-questions.json#episode-two-shape`) is Frame/vehicle-scale.

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

Added to `data/campaign/open-questions.json` rather than duplicated here — see that file for: the ancestry-reveal in-fiction justification and whether school and the civil-defense facility are the same location. New naming placeholders (excavation/dig site, the excavated spaceship) are also in `data/campaign/open-questions.json` — `naming-placeholders.json` was merged into it 2026-09-19 and now survives only as an empty stub.


---

## What Episodes One and Two have actually planted

Written 2026-09-21, after both episodes reached a state worth running. This is the
honest inventory: what is now load-bearing at the table, what it is *for*, and where
each thread's canonical home is. It is deliberately not a plan — several of these
have no decided answer and saying so is the point.

**Read this before writing Chapter Two.** Every item below is something a player can
reach in the first two evenings, which means every one of them is a promise the
campaign has already made.

### The four founders: famous names, sanitised faces

*Reconciled 2026-09-24 (LEDGER #27), replacing the older "erasure" design. Ingram decided the founders
are famous (LEDGER #26); this is how the plant survives that.*

**Where they come from (LEDGER #29, #30).** The four were the player characters of Ingram's unfinished Pathfinder 2e
campaign, *The Trouble with Mitflits*. It stopped with them on another plane, Nirvana. Presumably, when they came back,
the First Impact rupture had grown and they swung in to stop it. **Blank Inheritance is also that campaign's
closure**: it is meant to tie everything up at once while being a new campaign. The old campaign is in
`quarantine/ideas/story/source-material/the-trouble-with-mitflits/`. It is source material to draw on, not a straitjacket.

**What everyone knows.** The four are household names. Hyuck, Rupiah, Anabala and Shucks Mordant closed
the rift at Kortos and swore to be in Kurose when the next one came. Children are named after them.
There is a question on it in every school exam.

**What the approved version leaves out.** Two things, and neither is a secret anybody is keeping:

1. **What they looked like.** Every approved picture in the city, from the textbook frontispiece to the
   Founding Day posters, shows four tall, handsome humans. The real four were a gnoll, an elf, a very
   small mitflit, and a man who is now a skeleton.
2. **How the rift began.** The textbook goes from nothing to catastrophe in a single sentence. It says
   who closed the rift and never how it opened. The four opened it themselves, by accident, with a
   fumbled catch (`quarantine/ideas/story/dossier-first-impact.md` §3).

**The three plants, as they now read at the table, still never connected:**

1. **Day one, local studies.** The teacher reads "Hyuck" off the gnoll statue in the harbour square and
   says cheerfully that it is obviously not Hyuck the founder, because Hyuck was a big man with a sword
   and he is in every picture. Somebody's mascot. He is certain, and wrong.
2. **Episode Two, page forty.** The approved history names all four as heroes and never says how the rift
   opened. A success finds the seams (no cause, dates that do not reconcile). A critical success reaches
   an older printing in the back cupboard whose memorial plate shows the four as they were: one very
   small, one not human. Every later printing replaced it with the painting.
3. **Shucks, openly.** The skeleton who does their medical on the first morning is Shucks Mordant,
   and his badge says so. The speech that opens the campaign names him as one of the four minutes
   earlier, so the table meets a founder in person inside the first half hour, and he is plainly not a
   tall handsome human. **This one is deliberately not a slow reveal** (Ingram, 2026-09-24, LEDGER #28).

**The four are alive, and on the base** (LEDGER #28). Rupiah works in the administration; Shucks is head of
medical; Hyuck test-pilots the Directorate's worst Frame concepts, the ones that never saw the light of day.
Anabala and Shucks's detached right hand are free agents outside the Directorate. The public knows the
founders are long-lived and still about, and nobody makes a fuss of it, because having semi-immortal people
hanging around is faintly embarrassing. **Reveal all of it slowly, except Shucks, who is revealed at the
start.**

**The discipline, updated for #28: nothing at the table may connect the statue and the plate to Hyuck.**
Shucks is openly himself. The statue being Hyuck, and Hyuck being alive and on the base, are for the players
to assemble. A player may assemble it; a scene may not hand it over. If a player says it out loud, write it down and confirm nothing.

**Canonical home:** `arc-the-four-founders`, in
`quarantine/ideas/story/bible/locations/the-gnoll-statue.md`. The truth is in
`quarantine/ideas/story/dossier-first-impact.md`.

**What this is for.** It is still the campaign's answer to why an institution two hundred years old
cannot say what it is built on. It is no longer a forgetting. It is a *tidying*: two centuries of
posters, statues-that-aren't and textbook editions that made the four more heroic and more human with
every printing, until the true account (four strange people who caused the thing they are famous for
stopping) became the one version nobody would believe. That is not a conspiracy anybody is currently
running, which makes it more uncomfortable and much harder to fight.

### The countersignature, and the hand that keeps appearing

Somebody well above the Section Officer spent four minutes on one trainee section's
duty roster, then overrode his own fortnight a day later with the same signature. He
does not know who it is either, and it is not doing him any favours.

By the last scene of Episode Two the same unfamiliar hand has chalked the party's six
names up again under tomorrow's date, in a hangar with nobody in it.

**Answered (LEDGER #34 — Claude's answer at Ingram's request, accepted in LEDGER #46): the hand is Rand, Shucks's detached right hand**, signing as a Medical officer who doesn't exist, in Shucks's own handwriting from before it came off. Ingram named it: *"Right hand... Rand."* It is a conspiracy theorist whose theory is right, and it put the six on the machines because it thinks the city will need pilots soon. No roll reveals it in Episode Two; the routes are in `quarantine/ideas/story/bible/characters/rand.md`.

**Canonical home:** `arc-the-countersignature`, in
`quarantine/ideas/story/bible/characters/the-section-officer.md`.

*(Retired 2026-09-24, LEDGER #34: it is not nothing, it is Rand.)* **Deliberately kept live: it might be nothing.** A routine administrative
countersignature that means nothing, with the party's interest in it being the
mistake, is a real candidate and should not be dismissed because it is less
satisfying.

### What Shucks said behind the door

He knocks, comes in without waiting, apologises to the room, asks for a private word,
and gets it in about ten seconds. The party is put outside a closed door and comes
back to something that is not a punishment. Nobody explains it, then or afterwards.

What they are given instead of an answer is the observable fact: the intake doctor who
took their blood has standing near the top of this building and no visible reason for
it. That is worth more than the answer would be, and the episode is built to make sure
they get it rather than the explanation.

**Canonical home:** `arc-what-shucks-said`, in
`quarantine/ideas/story/bible/characters/shucks-mordant.md`. **The constraint that matters:** he
is not their guardian angel, this is not a favour he will do twice, and the party has
not acquired a protector. Whatever the answer turns out to be must not convert him
into one.

### The contacts that never travelled

Three contacts appear on a plotting board with no approach vector, and the first plot
is time-stamped *before* the alert that produced it. The plotting floor writes it up as
an equipment fault, because that is the only box on the form it fits, and the person
who ticked it was doing their job.

**Canonical home:** `arc-contacts-that-never-travelled`, in
`quarantine/ideas/story/dossier-observer.md` §10.

**Why it is built as a failable check rather than a given.** Its failure result — a
mistyped time under pressure, bearings not through yet — is a genuinely reasonable
reading. A player who lands there has been had by a sensible answer, which is the
correct shape for this campaign's first real mystery.

### The cicada, at head height, where crowds stand

Already tracked as `mystery-ledger-6` and now reachable in four places across the two
episodes, including under the growth on a sea wall. Siting is the rule that makes it
legible: always a wall a crowd stands in front of, always facing away from any road.

### The charter's signatures

**Cut as a mystery, 2026-09-27 (LEDGER #41):** nothing on the founding charter is painted out any more.
*(Proposal)* What a close look finds instead is its four signatures: Shucks's old hand (the hand Rand writes in),
HYUCK in capitals, and a line of mitflit script, Anabala's. The Transparency Advocate's refusal is now the inventory
of the deep storage vaults (LEDGER #40).

**Canonical home:** `mystery-ledger-5` (resolved: cut).

### What the party said about the officer on the net

The Deputy Director has the radio log in front of him and it includes the Comms
Officer refusing to order six trainees into a harbour road, twice, and saying so on
the net where it was recorded. He raises it himself and asks the party what they make
of it.

Whatever they say goes into her record and they are never told which way it went. He
notes it and moves on.

**This is the only beat in The Hammer where something happens because of the party
rather than to them**, and what happens lands on somebody else. Speaking up is free
and is not rolled for; only how well it lands is. Saying nothing is one of the three
real answers and leaves her refusals on the record undefended. Agreeing with their own
section officer is available, works, costs the party nothing at all that day, and is
the worst available outcome for her.

**Canonical home:** the check `speak-for-her` in `data/challenges/c1e2-the-hammer.json`,
which holds all four outcomes in her terms rather than theirs.

**Where the payoff goes.** She is the voice the party will hear more than any other
once operations start, so the record they wrote is attached to the person they are
about to spend the campaign listening to. It comes back through her, in her own words,
when she has a reason to mention it -- not as a reveal, not as a reward, and not in
Chapter One. A critical success put a sentence in her file about judgement under
conditions her standing orders did not cover; a critical failure put an inconsistency
there with her name on it. Both are things a future board can read.

**The constraint that matters:** she must not become a debt the party is owed or a
protector they have bought. What they did was witness something accurately or fail to,
and the consequence is hers.

### The anthem nobody taught them

Four hundred people sing a song every one of them learned as a child, and the party
did not. It is the first moment in the campaign where being new is a liability in a
room rather than a fact on a form, and it is the cheapest possible version of that --
nothing is at stake for anybody who stands at the back and mouths along.

**Canonical home:** the check `the-anthem` in `data/challenges/c1e1-assembly.json`.

**Two small things it can leave behind, and both are deliberate.** A failure leaves a
trainee who turned round, looked, and asked afterwards where they must have grown up;
the GM is told to write down who asked. A critical failure leaves a note made by a
member of staff, because making notes about anything it cannot immediately explain is
what this institution does. A critical success leaves an officer who will greet that
character by sight later in the week without either of them knowing why.

**None of those has a decided payoff and none of them needs one.** They are the
campaign's cheapest available supply of somebody-noticed-something, and the right use
is to reach for whichever one the table actually generated rather than to plan any of
them. The failure outcome in particular should never be escalated into an
investigation; it is a person being curious about an accent.

**It does not name what the party are.** Nothing here requires the disguise premise to
be explained at the table, and it works read straight as six trainees who did not grow
up in this city.

### A doctor who does not need an appointment

The same man again, from a different angle, and it is the one piece of Episode Two
that is purely optional. While the party wait in the corridor for the second time,
anybody who says they are trying to make sense of what just happened can work out that
the Deputy Director stood up before the door was fully open and the man on the door
did not reach for the log.

**Canonical home:** `arc-shucks-hand`, which this now feeds alongside Intake
Medicals. A player who found the hand in the first episode and asks this question in
the second has two things that do not fit one person, and the campaign has told them
nothing.

**What it must not do:** supply an explanation. The outcome is that the access is real
and unaccounted for. Its critical failure deliberately hands out a tidy, plausible and
wrong answer -- an old friend from training, the Deputy Director's own physician --
which the party will carry until something contradicts it.

---

### Two threads that are NOT plants and should never be promoted into one

Written down because both look like plants and are not, and a future author will
reach for them:

- **The natural history teacher's unlabelled jar.** She has had it eleven years, she
  does not know what it is, and she took the label off because the label was a guess.
  It is **not** Frame biology, **not** a Proto-Claimant, and connects to nothing the
  party will meet. It exists to establish that an honest adult says "I don't know"
  out loud, which is the behaviour the campaign wants its mysteries measured against.
- **"Please bring nothing you cannot carry, and nothing you cannot leave."** House
  phrasing in a Directorate form, ratified as such (LEDGER #9). Do not build a beat
  that treats it as foreshadowing something specific.

### The shape these two episodes are actually teaching

Worth stating because it governs what Chapter Two can do:

**Every institution in this campaign is sincere, calcified, and wrong about its own
history.** Nobody the party meets is lying to them. The history teacher believes his
book. The civil defence instructor has applied four times to have her drill reinstated
and been refused on cost by people who are not wrong that nothing has ever happened.
The Transparency Advocate cannot see what is in the vaults. The Deputy Director tells
them they were wrong, that he would give the same order again, and that he is glad they
are alive, and means all three.

That is the bad-then-pushback shape the campaign is committed to, applied to an
institution rather than a villain — and it is why the antagonist pressure in Chapter
Two has to come from outside the Directorate rather than from inside it. There is no
one inside it to unmask.
