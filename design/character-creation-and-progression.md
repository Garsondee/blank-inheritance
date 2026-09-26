# Character Creation and Progression as Design

*Written 2026-09-13. One of eleven reference documents expanding the narrative-craft library opened by [narrative-theory-foundations.md](narrative-theory-foundations.md), [agency-and-player-choice.md](agency-and-player-choice.md), [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md), [quests-objectives-and-threads.md](quests-objectives-and-threads.md) and [pacing-and-the-responsive-campaign.md](pacing-and-the-responsive-campaign.md). This one covers the first thing that happens at a table and the thing that happens between every session after it: how characters get made, what a creation process teaches players about the game, what levelling is for, what a departure costs a campaign, and — because it is this campaign's real situation and the published literature barely touches it — what changes when one player runs both a pilot and a machine. Not a decision document. Nothing here overrides the v4 bible, [campaign-arc.md](campaign-arc.md), or any entry in `data/campaign/open-questions.json`; live questions are named and left open. A hard constraint observed throughout: the six kids' and Frames' names and classes are collaborative work with the project owner, and nothing below proposes any of them.*

Every claim is tagged: **[E]** empirical (measured, usually in another medium — the transfer is stated), **[T]** theory, **[C]** craft (practitioner consensus from thousands of tables and shipped games, often righter than theory and never measured), **[Q]** contested.

---

## 1. Character creation is the first act of play, not preparation for it

The order in which a system asks its questions is its first statement about what the game is about, and players believe it. **[C]** D&D asks for a class and six ability scores, and the table correctly concludes the game is about capability under conflict. Apocalypse World asks how well you already know each other before it asks what you can do. Burning Wheel asks for three Beliefs and then tells the GM to attack them. Traveller asks what you did for four years at a time and, in its earliest edition, whether you survived it — creation with an outcome the player does not control is already play.

**The rule: whatever a creation process asks for first is what the table will believe the campaign values, regardless of what the pitch document says.** Asking for a combat build first says something different from asking who you owe money to, and no amount of tone-setting prose in session one overwrites it.

This campaign takes the strongest available position, recorded rather than implied. `design/induction.md` §4 opens: *"Character creation, run in fiction, as a scene."* The in-fiction intake and the out-of-fiction chargen are the same act. The v4 bible reached it from the other side — §3 says *"the mandatory DNA screen at character creation is the Directorate checking a city's children for exactly this and calling it a health check."* The screen that sorts the party onto a Frame-capable track is both a scene in Episode One and the moment the player's ancestry choice matters mechanically.

Two consequences do work no later scene can. The **terminal lockdown** (`induction.md` §4): a non-terrestrial ancestry trips a screen, the form stops and asks with bureaucratic patience how the character went undetected, on that player's screen alone so the reveal stays theirs — and *"the Directorate now has a record, which is the founding sin operating exactly as designed."* The institutional flaw at the campaign's centre is demonstrated during chargen, before any NPC explains it. The **medical** (§3): Shucks Mordant already knows what each candidate is, so *"there is no check to pass and no way to hide it, and that is the point of the scene rather than a problem with it."*

**One thing to flag and not resolve.** `design/induction-terminal.md` §4 puts the narrative questions on Page 8 of 9, after ancestry, background, class, boosts and portrait, and nothing on that page is required. Optional is defensible alone; last is defensible alone. The combination deserves a decision, because the campaign's highest-leverage input (§3) sits where a tired player is likeliest to skip it, and skipping is explicitly supported.

---

## 2. The authored/blank-slate spectrum, and what each end buys

Creation processes sit on one axis, and the trade along it is consistent. **[C]** **Pre-generated characters** give maximum prep leverage and cost ownership: the player performs someone else's character, and the gap widens over a long campaign. **Lifepath systems** (Traveller, Burning Wheel, Cyberpunk, WFRP careers) generate a history as a by-product of mechanical choices, so the player ends with a past they did not plan and therefore find interesting; they cost table time and can produce a character the player did not want. **Point-buy and class-and-level** give complete mechanical ownership and no narrative prompt, and the cost is silent — a player who volunteers no hook leaves the GM nothing to schedule and the system never notices. **Zero-session collaborative creation** gives the highest ownership and the best cohesion, because characters are made in one room and can reference each other, and costs a session everyone has to attend.

[E, transferred] The IKEA effect (Norton, Mochon & Ariely) — people value what they assembled themselves above identical pre-made objects — is the measured version of why players defend characters they wrote. Measured on furniture and origami; the direction transfers, the magnitude is unknown.

**The rule: authored characters buy GM leverage, player-authored characters buy ownership, and no process gets both at full strength — so decide which one the table is short of and buy that.**

SF2E is class-and-level, so the correct fix is a lifepath-shaped overlay bolted on top, which is what the intake questions are. `induction-terminal.md` §4 shows the hybrid built: Pages 2–5 are real SF2E mechanics (all 51 ancestries, all 154 backgrounds, all 6 classes, four free boosts, resolved against real compendium data), and Page 8 carries the narrative questions — the bible's set verbatim until the 2026-09-18 revision.

**The roster's actual state, checked rather than assumed.** `data/characters/kids/` holds six TEST-ONLY PCs, kept for testing and due to be removed before the real campaign starts (GitHub #202); `data/characters/frames/` is empty, its six draft Frame sheets removed 2026-09-19. Both directory READMEs carry the current explanation, and the policy is repeated in CLAUDE.md: those files are not the roster, and the roster is the user's to make with the players.

The same dial is a live question. `frame-class-assignment` (open) asks whether a Frame's class is a psych-profile *verdict* the kid did not choose or a player selection — the verdict characterises the institution, the selection keeps the build with the player. Its notes record a larger answer that does not settle it: Frame builds, the machine included, are not fixed at creation and can be renegotiated in-fiction across the campaign.

---

## 3. The sheet as a content request — flags, bonds, beliefs and drives

A family of mechanisms looks like characterisation prompts and is not: Burning Wheel's Beliefs and Instincts, Dungeon World's Bonds, Apocalypse World's Hx, Fate's aspects and compels, 13th Age's One Unique Thing, Blades in the Dark's vice and friends/rivals list, and — in the PF2E/SF2E line this campaign runs on — the background, which attaches mechanical grants to a narrative claim about your past.

What they do is solve the GM's hardest problem, which is never inventing content but inventing content *this specific table wants*. **A flag is a message from a player to the GM saying: put this in the game.** The sheet is a request form. **[C]**

Four corollaries, all consensus and none measured **[C]**: a flag must be **specific enough to schedule** ("I want to be a hero" is not one, "my sister works for the people we just arrested" is); it must be **answerable within a few sessions** or it is decoration both parties quietly forget; **unused flags teach players to stop writing them**, because a form collected and never cashed trains the table that it was a formality; and **the GM owes an answer, not obedience** — a flag says what to put in, never what happens once it is in.

### The intake quiz, worked through

v4 bible §20 lists eight questions for session zero, each answer *"Written down, kept, and mined for the whole campaign."* The induction terminal shipped them verbatim until 2026-09-18, when it compressed them into a shorter set (`induction-terminal.md`'s superseded-questions table; `design/induction-intake-audit.md` §6). Read as a flag system, the original eight are unusually well built:

1. **Who do you love, and what would you never tell them?** A bond and a secret in one sentence. The craft is the pairing — the secret is attached to a person, so the scene exists the moment those two are in a room. "What is your secret" alone produces backstory nobody can schedule.
2. **What are you good at that has nothing to do with piloting?** It states a value out loud — competence outside the headline activity is worth writing down.
3. **What did you want to be, before the draft notice?** A counterfactual life. Sacrifice is legible only against what was given up, and this supplies the measure.
4. **Who in this city owes you something? Who do you owe?** The most quest-generative of the eight: an obligation arrives with a second party and a deadline already attached.
5. **What is the smallest thing that would make today a good day?** The bible calls it *"the cheapest, most reliable emotional lever in the campaign."* The structural point is rarer — this is a **reward** flag, and almost every published system in this family collects only trouble. Beliefs get attacked, aspects get compelled, and nothing else asks the player how to be kind cheaply. Against a tone directive of Giant Robo warmth, and §20's line that solo side plots are *"where the campaign earns the right to hurt later,"* that is load-bearing rather than soft.
6. **What do you not want the Directorate to know about you?** A vulnerability aimed at the campaign's own institution, whose founding sin is information suppression. It interlocks with two systems designed separately: `induction.md` §2's disguise policy, advising that alien origin stay with close friends and *"presented as protection, and it is partly sincere"*; and §4's lockdown, which may already have filed the answer.
7. **Name someone who thinks you are better than you are.** An external witness — structurally a Belief pointed backwards. It hands the GM a character whose disappointment costs something, the cheapest non-violent stake available.
8. **What do you find funny?** The only question addressed to the player rather than the character. It is a register request, and against v4 §22's Known Risk #5 — tone drift, where *"no jokes, no warmth, and no small good days... is a fault, not a mood"* — a per-player register channel is worth more than it looks.

Notice what the eight do not ask: nothing about combat capability, nothing about what the character is good at in a fight, nothing about ambition expressed as power. Per §1, that ordering is the campaign's thesis statement.

**Keep the raw content request and any mechanical hook distilled from it in separate fields, because a cap on the hook must never delete the request.** Most systems in this family get that wrong — they collect three Beliefs and discard everything the player said while writing them.

### Three gaps, named and left open (two since resolved — see below)

- ~~**The answers cannot currently reach the people who need them.**~~ **Corrected 2026-09-19, this line was stale.** This bullet used to say `induction-terminal.md` §6 point 5's channel had no delivery pipe — *"the harvest/inbound sync mechanism this depends on does not exist yet"* (issue #140's own audit at the time — only a docstring). That mechanism was built and that item on #140 closed out 2026-09-16 (commit `53246f0`): the terminal now saves a durable Actor flag and posts a harvest-tagged whispered chat message that `core/chat-export.mjs`/`core/harvest-inference.mjs` carry automatically into `harvest/` as high-confidence content — see `induction-terminal.md` §6 point 5's own corrected text for the full mechanism. The player-to-GM channel now has a delivery pipe at the far end; what remains manual, by design rather than by gap, is promoting that staged content into canonical `data/` files (`harvest/README.md`).
- **Nothing marks an answer as used.** `kid.schema.json`'s `intake.questions` entries hold an id and an answer and no status; there is no cadence for revisiting them, and §20's feedback loop runs off the GM's post-session notes instead. Every flag system's failure mode is flags never cashed, and the data cannot say which those are.
- ~~**Two of the eight carry premises the campaign has since overturned.**~~ **Resolved 2026-09-18.** Q3 (*"before the draft notice"*) and Q4 (*"in this city"*) collided with `induction.md` §1's *"volunteers, not conscripts"* and *"every PC is new to the city."* The terminal's intake revision rephrased Q3 and folded Q4 into the allies and enemies questions (`induction-terminal.md`'s superseded-questions table).

Read alongside [agency-and-player-choice.md](agency-and-player-choice.md) §6, which analyses the same quiz as storylet seeding — what the answers become once they enter the content graph. This section is about the channel itself.

---

## 4. Why is this party together

Six players make six characters and then have to explain why those six travel together. The standard solutions **[C]**: a **shared origin**; a **shared obligation**; **pre-existing relationships mapped at the table** (Dungeon World Bonds, Apocalypse World Hx, Blades' crew sheet); or a **shared asset everyone co-owns** (Ars Magica's covenant, a ship, a crew).

**The rule: solve cohesion before the first session or spend the first three sessions solving it live — those are the only two options, and only one of them is a decision.**

This campaign solves it three times over, and the third way is the interesting one. **Shared origin**: everyone is new and everyone was summoned (`induction.md` §1), so nobody is the local who must be talked into caring. **Shared obligation**: they volunteered, were screened, and were streamed onto one course together. **A shared secret they work out themselves**: Episode One's intake medicals (`episode-c1e1--intake-medicals`) ends on the party realising that everyone in their section came back irregular — awarded as an accomplishment, for *"Working out, without being told, that everyone in their section was flagged."* **A cohesion fact the party derives is worth more than one they are assigned**, because deriving it is the first thing they did as a group.

What the campaign deliberately cannot do is map pre-existing PC-to-PC relationships, because six strangers cannot have Bonds. That is a real cost: all six relationships must be built in play, and the opening episodes carry the whole load. The hedge is §20's **Open** side plot type — *"the whole group can attend... these build the found family, which is the campaign's actual reward."* The risk is compression. If the opening is shortened for pace, the party reaches Chapter Two as six colleagues with a shared employer, and the theme the campaign names as its own reward has nothing under it yet. The intake questions ask only about people outside the party, which follows from the premise rather than being an oversight — so this is not a gap to patch, but a consequence to hold in view when scheduling the opening episodes.

---

## 5. What levelling is actually for — three jobs that get confused

Levelling does three separable things, and most disappointment with a progression system comes from a designer delivering one while a player expected another. **[C]**

1. **Capability.** The numbers rise. This feels good briefly and, in a bounded-accuracy system, mostly keeps pace with the opposition.
2. **Options.** The menu lengthens. This is the one that changes play, because it changes what the player decides between on their turn.
3. **An arc marker.** A statement in the fiction that this character is not who they were. What players remember years later, and the job systems most often forget entirely.

**The rule: a level-up that raises numbers without adding a decision is felt as maintenance, not progress.** SF2E gives both kinds; the levels that land at the table are the feat levels.

[E, transferred] Self-determination theory work on digital games (Ryan, Rigby & Przybylski) finds need satisfaction — autonomy and competence especially — predicts enjoyment better than content does. Options feed autonomy, capability feeds competence, and a track delivering only one under-serves a measured need. Measured in short digital sessions, not campaigns; a direction, not a number.

The campaign's main track is milestone, and `campaign-arc.md` states the gate: *"a significant defeat of a Claimant, followed by enough downtime for the pilots' Frames to actually be refit/upgraded. Leveling is earned by surviving and recovering, not just by fighting."* **That gate is the arc-marker function made mechanical**, the rarest of the three to get right — tying advancement to a recovery period guarantees the fiction always has somewhere to put the change, instead of a level arriving mid-corridor because a counter filled.

**One finding from the retired Resonance track survives in general form.** A track that varies how many actions a player takes is not varying capability, it is varying participation, which is a far more expensive currency than a bonus. A failure state may cost participation; a normal operating range must not.

**The penalty corollary.** `campaign-arc.md`'s standing principle — penalties cost risk, never choice — is the same rule read in the other direction: **progression should add options; penalties should not remove them.**

---

## 6. Trap options, and the narrative cost of a bad choice

The mechanical side of build space — dominant options, dead options, the maths of a choice that looks equal and is not — belongs to [rpg-systems-design.md](rpg-systems-design.md). What that document will not cover is the narrative cost, which is the expensive part at a table.

A player who discovers at level 6 that their level-1 choice was a trap has three exits, all costly. **Retcon**, and the character's history changes for a reason outside the fiction. **Rebuild**, and the character changes who they are with no story cause. **Keep playing**, and the character's defining trait is a mistake the *player* made, not one the character made. **[C]**

**The rule: the cost of a trap option is not the lost damage, it is that the character's defining choice stops belonging to the character.**

Three mitigations exist in practice **[C]**: publish the trap at the point of choice; allow retraining and give it a fiction, so a rebuild is a scene rather than an apology; or design so nothing is a trap, which is expensive and rarely achieved. This campaign has the two usable ones. **Publishing at the point of choice** is built into the induction terminal — every mechanical page carries an out-of-character help layer in a mechanical register, Page 5's reading *"this permanently raises one of six numbers that drive almost every roll you make,"* which the document calls the single most consequential page. **A fiction for rebuilding** is recorded in `frame-class-assignment`'s notes: Frame builds, the machine included, can be swapped or upgraded across the campaign through an in-universe correspondence and negotiation system, balanced case by case. That costs the story nothing, because the in-world requisition process *is* the retraining rule.

---

## 7. Death, retirement, and replacement

When a PC leaves a campaign, three things break, in ascending order of expense. **[C]** The **threads attached to that character** stop, and those flags are content already scheduled. The **party composition** changes and a role is empty. And the **replacement faces an entry problem**: a new character arrives with no shared history, and the table's accumulated investment does not transfer. The standard answers: let the replacement inherit the thread (a sibling, partner, heir, student); build a recruitment fiction into the premise so arrivals need no explanation; or take PC death off the table deliberately and put the stakes elsewhere.

**The rule: decide before session one whether a PC can die, because the answer determines where the campaign is allowed to put its stakes.**

This campaign has decided, in data rather than prose, and took the third option. `config.json`'s `frameEconomy.permanentLoss`: *"PC death is never the cost mechanism at either scale."* The cost lands on machines — a Frame that reaches Hulked can stay Hulked, *"permanent loss of a personal Frame is on the table from the start (foreshadow it early, so when it happens it reads as the campaign keeping a promise, not GM cruelty),"* and the same now applies to vehicles. The NPC side is symmetrical: the Peril Roster (v4 §21) gives eight named NPCs a trigger and a save condition and states *"nobody on this list is scheduled to die... manufactured jeopardy is fine and encouraged... what is not fine is deciding the outcome in advance."* Jeopardy sits with the NPCs, where a campaign can afford to spend it. The recruitment fiction comes free: `induction.md` §1 has several hundred candidates screened every semester and a flagged group streamed onto the track together, so a replacement PC needs no special explanation.

**The gap.** The most common real reason a PC leaves a six-player campaign is that a *player* leaves the table, and nothing in the repo covers what then happens to that character's Frame, intake answers or threads. This campaign is unusually exposed, because one departure removes a pilot and their machine at once. Naming it, not solving it.

---

## 8. The dual-character problem, part one: attention and identity

This is the campaign's actual design situation: **six players, each running a pilot and a machine — a Frame or a vehicle — at one shared level.** Published design literature barely covers it. The nearest analogues **[C]**: **Ars Magica's troupe play**, where one player runs a magus, a companion and grogs at wildly different tiers and the answer is rotation plus a covenant that persists across all of them; **Lancer**, a small pilot sheet and a large mech sheet as deliberately different subsystems; **older mecha and vehicle games**, where the machine is equipment and the character is the only character; and **Blades in the Dark's crew sheet**, a second sheet everybody co-owns. Structurally this campaign is nearest Lancer, and differs decisively: here the Frame is neither equipment nor a shared asset.

### (a) Attention economy — which sheet is live

**The rule: at any moment exactly one of a player's two sheets should be the one being rolled, and the table should be able to tell which without asking.**

The interface answers it: `design/ux-doctrine.md` §7b makes **Frame scale GLASS and personnel scale PAPER**, two registers already in the stylesheet, chosen partly so the scales *"cannot appear together."* The player sees which sheet is live before anyone narrates it.

### (b) Identity — is the Frame a character or equipment

**The rule: whether a machine is a character is decided by what the system lets it want, not by how much prose is written about it.**

The repo answers in two places.

**The data says amplifier.** `data/schema/frame.schema.json` gives the machine a PC-grade sheet — it `allOf`-references the same `common/sf2e-common.schema.json#/$defs/pcStatblock` as `kid.schema.json` — but since the lockstep decision of 2026-09-20 its description states that a Frame *"does NOT replace its pilot's own character sheet — it AMPLIFIES it."* Vehicles use the same shape (`open-questions.json#vehicle-and-frame-rules-model`).

**The interface says seats.** `ux-doctrine.md` §12 records: *"Kids and Frames are interchangeable seats, not different characters."* That line is answering the attention-economy question — which console is live, and how to keep both seats attractive when Frames are strong and slow and vehicles fast and fragile — not the identity question.

---

## 9. The dual-character problem, part two: coupling, the consolation prize, and partial loss

### (c) Progression coupling

Three general options for advancing two linked sheets **[C]**: **lockstep** (one advancement event moves both — simple, and it quietly makes the second sheet feel like a stat block rather than a character); **independent** (two economies, maximum expressiveness, and the encounter maths breaks the moment they diverge far); and **coupled-with-drift** (independent earning inside a bounded divergence).

**The rule: couple two sheets loosely enough that investment shows and tightly enough that the maths survives, and write the bound down as a number.**

This campaign has since chosen the first (`open-questions.json#frame-scale-starting-level`, resolved 2026-09-20): pilot and machine share one level and advance together on milestone XP. The upgrade economy survives as a credit budget spent on the machine's own feats, weapons, armour and equipment, and it buys capability, never levels (`#frame-upgrade-economy`).

One thing to hold in view. The number of clocks one player carries is exactly where v4 §22's Known Risk #1 lands: *"the threat is not a weak story — it is the apparatus collapsing under its own weight. Decide which two subsystems get cut first under pressure."* A progression system a player cannot hold in their head stops being experienced as progression.

### (d) The consolation prize

Any session that foregrounds one scale risks making the other sheet feel like the point, and the player on it a spectator with paperwork.

**The rule, stated generally: a secondary role stops being a consolation prize the moment it exclusively owns something the primary role cannot get — and information is the cheapest such thing to give it.**

*(Cut 2026-09-20: the five ground roles, this campaign's former answer to the problem. Removed from this document 2026-09-25.)*

### (e) Partial loss — the sub-problem the structure creates by itself

A Hulked Frame removes one of a player's two sheets and leaves the other standing. That is the only PC-scale loss the campaign permits (§7), and **the two-sheet structure is what makes it survivable**: that player still has a kid and every thread attached to them. Worth stating as an argument *for* the structure rather than a cost of it — running two sheets is what lets this campaign put a permanent loss on the table without removing anybody from the session. `permanent-hulk-commitment`, §7's retirement question in Frame clothing, was resolved 2026-09-19: *"Left to emerge from play."*

**The best dual-character mechanics put the cause on one sheet and the cost on the other**, because that is the only kind of rule that makes a player care about both sheets at once.

---

*Related within this reference series: [agency-and-player-choice.md](agency-and-player-choice.md) §6 (the same intake quiz read as storylet seeding — this document reads it as a player-to-GM channel), [rpg-systems-design.md](rpg-systems-design.md) (build space and the maths §6 defers), [mechanics-as-meaning.md](mechanics-as-meaning.md) (what a rule says by existing — §8's schema-as-design-statement argument extended), [quests-objectives-and-threads.md](quests-objectives-and-threads.md) (what a flag becomes once a GM schedules it), [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) (first-session technique), [pacing-and-the-responsive-campaign.md](pacing-and-the-responsive-campaign.md) (progression pacing against arc shape), [narrative-theory-foundations.md](narrative-theory-foundations.md) §2 (why a flag routed through an existing tie lands harder), [strategy-and-downtime-design.md](strategy-and-downtime-design.md) (the slice economy).*

*Related in this project: `design/induction.md` (§1 premise, §2 disguise, §3 medical, §4 terminal); `design/induction-terminal.md` (§1 settled, §4 the nine pages, §6 the sync); `design/induction-intake-audit.md` §6 (the 2026-09-18 intake revision); `data/scene-briefs/episode-c1e1--intake-medicals.json`; `ideas/story/blank-inheritance-v4.md` §2, §3, §20, §21, §22; `data/campaign/config.json`; `data/campaign/open-questions.json` (`frame-class-assignment` open; `frame-scale-starting-level`, `vehicle-and-frame-rules-model`, `frame-upgrade-economy`, `permanent-hulk-commitment` resolved); `data/schema/kid.schema.json` and `data/schema/frame.schema.json` (both `allOf` `common/sf2e-common.schema.json#/$defs/pcStatblock`); `design/campaign-arc.md`; `design/ux-doctrine.md` §7b, §12; `ideas/entries/character-creation-intake-form.json`; `data/characters/kids/` (six TEST-ONLY PCs) and `data/characters/frames/` (empty since 2026-09-19).*
