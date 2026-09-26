# Blank Inheritance — 空白相続 (Kuuhaku Souzoku)
## Starfinder 2E Mecha/School Design Bible

A six-player, one-GM Starfinder Second Edition campaign. Each player runs two characters: a school-age kid and a multi-storey combat mech. This document is self-contained.

## Elevator Pitch

Six players, one GM, Starfinder Second Edition. Each player runs two characters: a kid (starts at level 1, seventeen years old, legally draft-eligible for the city's civil defense corps) and a Frame — a multi-storey combat mech, fixed at level 12, built as a full PC with its own class. The kids' school lives, relationships, and personal choices directly gate how much of their Frame's power they can actually use in a fight. Same emotional shape as Neon Genesis Evangelion, run through Starfinder's bounded-accuracy math instead of anime logic — "legally distinct" setting and mechanics throughout.

## System Notes (read this first)

Starfinder Second Edition has no official mech rules — this system is bespoke. (Starfinder Tech Core, the next major rulebook, adds starship combat and tech classes but not mechs.) The game inherits Pathfinder 2e's math: attack bonus, AC, DCs, and HP scale tightly and predictably with level, and the four degrees of success amplify small numeric gaps into large narrative ones. A level gap much past 4–5 becomes "cannot participate," not "outmatched." This one fact drives almost every design decision below:

The level 1 children basically get to pick character classes as you would normally do so. The idea is that the mechs start at level 12 and are also PC character stat blocks but we'll change them for flavour so that they describe a giant mech's actions and not a small person.

- A level-1 kid cannot be given a numeric bonus that meaningfully affects a level-12 fight, and shouldn't be — that breaks bounded accuracy.
- A level-12 Frame cannot be treated as gear worn by a level-1 kid — item bonuses stack on the wielder's own proficiency, so a Frame-as-equipment would still swing like a level-1 character. The Frame has to be its own character.
- The gap between kid and Frame is a feature, not something to balance away. The system's job is to make both halves matter without ever letting them touch the same math.

## Characters

### The Kid

- Level 1 at campaign start, seventeen years old.
- Age is load-bearing: seventeen is the age the city's charter allows conscription into civil defense roles. The kids are here legally. Nobody is breaking a rule to put them in a cockpit — that's the horror register: procedural, not criminal.
- Advances by narrative milestone (roughly one level per major arc/Contact event), not XP budget.

### The Frame

- Fixed at level 12 through the opening arc. Built as a full PC using a standard SF2e class — not a monster stat block, not upscaled gear. Pick a class, build it exactly as any level-12 PC, then reflavor: a Strike is a building-sized fist, a spell is a kilometre-wide effect. Don't fret the scale abstraction — it's intentional, and the numbers underneath stay untouched.
- Every player has their own Frame, personalized and customizable over time (see Repair Economy below).
- Frames don't level up. They advance by unlocking access to abilities they already statistically have, gated by Resonance. A level-12 Frame at 30% Resonance is a level-12 character only allowed to use a fraction of their sheet.
- Frame class can be player-chosen, or assigned by the Directorate's psychological profiling — a verdict on the kid, not a preference of theirs. (Open question — see below. Not yet locked.)

## Core Mechanic: Two Tracks

Every pilot runs on two independent numbers. Neither ever produces a numeric combat bonus larger than +2 — the difference between a well-synced and poorly-synced pilot is what they're allowed to do, not how good they are at doing it.

### Resonance — capability (0–100%)

Gates action economy and ability access.

| Band | Range | Actions/turn | Reaction | Abilities available | Internal power duration |
|---|---|---|---|---|---|
| Dead Weight | Below 40% | 2 | None | Baseline only | 3–4 rounds |
| Nominal | 40–65% | 2 | Yes | + Attuned | 6 rounds |
| Harmonised | 65–85% | 3 | Yes | + Resonant | 8 rounds |
| Absolute | 85%+ | 3, plus one free Strike/round ignoring multiple attack penalty | Yes | + Absolute | 10 rounds |

Sort each Frame's class abilities into these four bands at chargen. A Dead Weight Frame should still be competent — a big, dangerous, slow thing, not a joke.

Most of the campaign is played at 2 actions. Reaching Harmonised for the first time, mid-fight, should be a table moment.

Duration is the pacing tool: once internal power runs out, the Frame is dead weight until reconnected. Ground crew's Umbilical Control role (below) buys more of it.

### Bleed — cost and instability (0–10)

Rises from: pushing Resonance (below), taking Frame damage, plug/psychological distress, Suppression (below).

At Bleed 10, the Frame goes berserk: GM takes the sheet for 1d4 rounds, damage output roughly doubles, targeting stops discriminating between friend, foe, and terrain. Don't narrate this from the cockpit — the player doesn't get to watch it happen to them.

Pushing: a pilot may raise Resonance mid-scene by accepting Bleed. Resolve the push with a check using the kid's own stats (a Will save, a relevant skill) — this is the one place the level-1 sheet does direct, real work inside a level-12 scene.

## Anchors and Suppression

### Anchors

Each kid has 2–3 player-written Anchors: a person, a belief, a need. These are the GM's primary lever.

- A scene that affirms an Anchor raises that kid's baseline Resonance.
- A scene that violates one lowers it.

### Suppression

If a player declines an Anchor-relevant conflict specifically to protect their deployability (plays their kid unrealistically conflict-avoidant to stay combat-ready), that costs Bleed instead of Resonance.

This closes the obvious exploit: without it, rational players make their kids blandly nice to everyone and the emotional game dies fast. With it, both doors cost something — having the fight costs capability, swallowing it costs stability.

(Open question: is a pilot's own Bleed total visible to them, or GM-only? Not yet decided.)

## Ground Roles

On any given Contact, not every kid is piloting. The ones who aren't play at ground level, in real danger, with real agency — never touching combat math directly.

Rule: ground-role DCs are set by the task the kid is attempting, not by the enemy's level. A level-1 kid never rolls against a level-12 Claimant's DC. Ground encounters use hazards and environment, never enemy statblocks — a level-1 party should never trade blows with a Claimant directly.

| Role | Domain | What it does |
|---|---|---|
| Sensor Operator | Information | Recall Knowledge checks reveal the Claimant's weaknesses, resistances, immunities. Each success = one true fact the pilot can act on. |
| Umbilical Control | The clock | Success converts an external round of effort into a saved internal-power round for the Frame. |
| Evacuation Marshal | Casualties | Runs the civilian casualty track. Failures here become next episode's Resonance penalties. |
| Structural Command | Terrain | Demolition charges, sluice gates, controlled collapses. Changes the map mid-fight. |
| Signals Liaison | The pilot | Talks the pilot down: reduces Bleed, or holds a slipping Resonance band. Strongest when they share an Anchor with their pilot. |

Rotate these roles fight to fight. Nobody should play the same one twice in a row once the roster settles.

## The Frame Roster and Repair Economy

- Six Frames, one per player. Fixed level 12, PC-classed, customizable over time.
- Frame HP is a campaign resource, not an encounter resource. Frames do not heal between fights. They move down a damage-state track: Operational → Degraded → Critical → Hulked.
- Repairing a step costs technician-days, drawn from a single shared weekly pool the Directorate allocates.
- Frame modification/customization draws from the exact same pool. Repairing a friend's Frame and upgrading your own compete directly for the same finite resource — this is the primary economic tension of downtime.
- Not all six Frames are necessarily deployable at once. A Degraded or Critical Frame may be riskier or unable to launch. When a Contact only calls for two or three Frames, the players choose the subset — the GM never has to force this; the repair economy does it for them.
- A Frame that reaches Hulked can stay Hulked. Permanent loss of a personal Frame is on the table from the start (foreshadow it early, so when it happens it reads as the campaign keeping a promise, not GM cruelty).

## The Hangar

Beyond the six active PC Frames, the Directorate's hangar holds a larger graveyard of legacy units — many already seriously damaged, decommissioned, or never successfully synced to anyone. These exist to:

- Give the setting history before session one.
- Be a long-term technician-day sink: bringing one online is possible, and always costs something else.
- Seed mystery — one of these units is plausibly tied to whoever was originally meant to pilot on Day 1 (see below).
- Offer a possible replacement path if a PC's own Frame is ever permanently Hulked, without that having to be decided now.

## Time Economy

Each day: mandatory school and mandatory harmonics/sync training eat most of it. Players get two discretionary time slices per day. More options exist than slices to spend them on — that gap is the entire engine of downtime play.

| Option | Effect | Cost |
|---|---|---|
| Sync Training | Nudges baseline Resonance upward, slowly | 1 slice |
| Frame Modification | Customize loadout/tuning | 1+ slices, from the shared technician-day pool |
| Repair Advocacy | Push a Frame back up the damage-state track | 1+ slices, from the same pool |
| Anchor Time | Scene with an Anchor — a chance to affirm it (or risk it) | 1 slice |
| Investigation | Pull a thread | 1+ slices, often spans several days |
| Analysis Duty | Read the sensor archive: reveals the current Contact Pool state, or pushes the floor back (delays the next possible Contact) | 1 slice |
| Rest | Recover; protects against burnout at GM's discretion | 1 slice |

## The Contact Pool

Governs when Claimants show up, from Day 7 onward (the opening arc is hand-placed and doesn't roll — see Campaign Opening). Bounded on both ends by design: players are never punished with a zero-warning attack, and tension never gets an indefinite escape hatch either.

Starting numbers (tune freely — these are a proposed baseline, not fixed):

- Floor: no Contact can trigger within 2 quiet days of the last one. No roll happens during this window at all.
- From day 3 post-Contact: roll 1d20 each morning. Contact triggers on a 20. The target number drops by 1 for each additional quiet morning (20, then 19+, then 18+…) — visible, predictable, escalating.
- Ceiling: if Contact hasn't triggered by the 8th quiet morning (target would be 13+), it happens automatically. The pool can never coast forever.
- Analysis Duty either reveals the current target number to the players, or spends a slice to push the floor back by a fixed number of days (a guaranteed delay). Either way, tactical certainty is purchased with personal time — the same currency as everything else in this game.

### False Contact

Three distinct flavors, all costing the same disrupted evening as a real one:

- **Type A — genuine false positive.** Full scramble, nothing there. Teaches players early that the cost of readiness isn't only the Claimants — the system itself has a price.
- **Type B — role reversal.** The scramble is real, but what needs help is people, not a fight. The Frames end up rescuing "children" (evacuees, civilians, possibly off-duty kids) rather than the other way around. Same adrenaline shape, subverted resolution.
- **Type C — first contact with the Watcher.** A false or ambiguous response that is actually the first evidence of a second, invisible antagonist (see Antagonists). Doesn't resolve as combat — resolves as an investigation hook, and shouldn't be closed out quickly.

## Building the Opposition

Claimants are built as standard SF2e creatures via normal creature-building guidelines, leveled to the Frame's tier (12, to start the campaign) — never to the kids' level. A Claimant statblock is never something a ground-level kid should be rolling against directly.

## Antagonists

### Claimants

The working name for the enemy, replacing "Angels." Deliberately legal/bureaucratic register — announced by classification code, never named: "Claimant Three, contact confirmed." Frames the war as a property dispute humanity is losing, and quietly seeds the eventual question of what the Frames themselves are a claim on. (Optional lore hook: escheat — property reverting to the state when no rightful heir exists — is a clean legal metaphor for what "the Gap" excavation actually is, if you want to lean into it later.)

### The Watcher (working name)

An invisible, city-hovering, manipulating presence, first glimpsed through a Type C False Contact. Not a fight resolved in a single session — a long-arc antagonist dealt with through investigation and ground-level play rather than a Frame encounter. Leave this thread open through the whole opening arc.

## The Directorate and Its People

The organisation running all this is a chartered civil-defence directorate operating under its own oversight council — legitimate, procedural, not a hidden conspiracy so much as an institution that doesn't fully understand what it's excavated either.

Three poles, deliberately not a stable binary:

- **The Commander** — mission above the individuals carrying it out.
- **The Caretaker** — tries, misguidedly, to give the kids something like a normal adolescence. Every accommodation they win costs technician-days from the same pool that repairs and upgrades Frames — kindness has a visible, charged line item.
- **The Transparency Advocate** — believes the kids should be told everything, immediately. Right in principle, destructive in practice. Exists so the players never have an obviously correct ally among the adults. (Open question — keep as written, rename, or cut. See below.)

## GM Running Notes

Small techniques worth keeping as house rules:

- Never place a Contact event during a free period. Time it to interrupt whatever a player just spent slices investing in. The fight isn't the interruption of their life — their life is what the fight keeps eating.
- Read harmonics numbers aloud, flatly, in front of everyone. Institutions describing a kid's worst day as a percentage is the horror register this campaign runs on.
- Don't narrate the berserk state (Bleed 10) from inside the cockpit. The player doesn't get to watch it happen to them.
- On Day 1, let the adults visibly not have a plan. Rehearsed procedure failing on contact sets the tone for every institution in the setting from that point on.

## Campaign Opening

### Episode One — Day 1: "Contact, Unclassified"

Only one Frame launches. The other five kids play ground roles simultaneously, in real danger, on the same clock. Cut between a level-12 initiative order and a level-1 one.

1. **Ordinary Tuesday.** All six kids, one mundane scene. Lightly press one Anchor per player. Nothing happens — this scene exists so scene 8 hurts.
2. **The alert.** Sirens, automated evacuation, a shape in the sky the public feeds have already stopped showing. The adults don't know what to do either.
3. **Ground layer.** Five level-1 kids navigate a collapsing arcology toward shelter. Three decision points, each costing time on a visible clock, each optionally helping someone else. Sets each kid's starting Resonance and confirms their Anchors through play rather than character-sheet fiat.
4. **The summons.** One kid is pulled to pilot — and was explicitly not the intended pilot. The Directorate's actual choice is unavailable, injured, or otherwise off the board. This kid is a contingency, not a chosen one.
5. **The refusal.** Let them say no, and mean it if they do. Cut back to the ground layer, mid-danger, and let that player watch the consequence play out among the other five characters — not an abstract city.
6. **The plug.** Slow this down. The first harmonics number is read aloud, flatly, by an adult who has done this before.
7. **The fight.** Three rounds, two actions, internal-power duration ticking down visibly. The Claimant is immune to damage until its interdiction field is broken; the field's weak point is only visible from ground level — the other five spot it and call it up, making the non-piloting players load-bearing inside a level-12 fight while they remain level 1. Round three: Bleed hits 10. GM takes the sheet. The Frame wins. Don't describe it from the cockpit.
8. **The cost.** Immediately — not next session. Something the ground five spent the whole episode protecting is gone, specifically because of how the fight was won.
9. **Debrief.** A sterile room. The ratio read out loud as a bare number. Then the second gut-punch: the other five learn their own Frames were assigned weeks ago. Nobody told them.

No downtime on Day 1. One continuous day — makes Day 2's sudden abundance of scheduling feel like a different game.

**First Pilot** — hand this to your most rules-fluent player; they're best placed to improvise inside a system they don't yet fully control.

- Advantage: starts at 68% Resonance (Harmonised, three actions from round one). In-fiction, this is dissociation reading as high sync, not talent — something is wrong, and that's why it works.
- Disadvantage: a real injury from the opening impairs ground scenes, and they permanently lose one discretionary slice per day to ongoing medical obligations.
- Their 68% was bought with Bleed and decays toward baseline over time. They'll spend the opening arc chasing a number they got for free exactly once.

(Open question: do the other five know the pilot in scene 7 is one of their own, or do they just see a machine? Ignorance is more frightening; knowledge is more binding. Not yet decided.)

### Days 2–5 — The Squeeze

Mandatory school/training plus two discretionary slices per day (menu above). Seed exactly one dangling thread: who was originally meant to be in that chair on Day 1? Don't resolve it yet. Let at least one multi-day investment (an Investigation, a Frame Modification) get interrupted or destroyed by a scheduled emergency partway through — the squeeze should occasionally actually squeeze.

### Episode Two — Day 6: "Second Contact"

Two Frames deploy, chosen by the players from whatever the repair-day economy left standing. The remaining four kids take ground roles — rotate assignments so nobody repeats a role from Day 1.

Design requirement for this fight: two Frames at two actions each cannot win it. Two Frames where at least one reaches Harmonised (65%+) can. The path to that threshold should be discoverable and earned in play — visible, costly, and not simply granted by the GM.

End of Day 6: kids level up to 2. Frames do not level — they remain fixed at 12, advancing only through Resonance bands and unlocks.

### Day 7 Onward

The hand-placed opening arc ends. The Contact Pool takes over as the procedural engine driving the rest of the campaign.

## Open Design Questions

Not yet locked — flagging so nothing gets decided by accident:

1. **Bleed visibility.** Does a pilot see their own running Bleed total, or is it GM-only?
2. **Day 1 pilot's choice on Day 6.** Do they get a genuine, viable option to sit out the second Contact? If yes, what does refusal actually cost — and is it survivable as a choice, or does the story punish it into a non-choice?
3. **Frame class assignment.** Psych-profile "verdict" the kid didn't choose, or player-selected? The verdict version is stronger characterisation but takes a build choice away from the player.
4. **Ratio publication.** Are all six Resonance percentages read aloud and ranked at weekly harmonics testing (public, competitive, cruel), or kept private to each pilot?
5. **Third NPC pole.** Keep the Transparency Advocate as written, reshape them, or cut back to a two-pole Commander/Caretaker structure?
6. **Permanent Hulk commitment.** Is at least one Frame's permanent loss a planned campaign beat, or left to emerge from play?
7. **Ground-five knowledge on Day 1.** Do they know the pilot is one of their own during the fight itself, or only after?

## Naming Placeholders

Not yet named — referred to functionally throughout this document:

- The Directorate (organisation name) — *resolved 2026-09-23, see `data/factions/directorate.json`: 特別対策本部 (Tokubetsu Taisaku Honbu)*
- The city
- The Gap (the missing span of history predating the setting — a Second Impact analogue)
- The six kids and their six Frames
- The Watcher (antagonist working name)
