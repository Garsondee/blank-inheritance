# Quests, Objectives, and Threads

*Written 2026-09-13. Fourth of five narrative/game-design reference documents (see [narrative-theory-foundations.md](narrative-theory-foundations.md) for the series introduction). Where the previous document covers campaign-scale craft, this one is about the individual unit of content — a Contact, a side plot, a downtime scene, an NPC's want — and what the research says actually separates a mission that feels authored from one that feels generated. The short version, which the rest of this document exists to justify: **the difference is never structural complexity. It's whether every step has a legible want behind it.** None of this is a decision document — nothing here overrides `ideas/story/blank-inheritance-v4.md`, `campaign-arc.md`, or any open question in `data/campaign/open-questions.json`.*

---

## 1. The only large empirical study of quest structure, and its one finding worth building around

Doran and Parberry (2011) analyzed over 750 human-authored quests across four MMORPGs (EverQuest, World of Warcraft, EVE Online, Vanguard) and found that quests decompose into three layers: **[E]**

- **A motivation** — the NPC's single most important underlying concern. Nine of them, observed across the whole corpus: **Knowledge, Comfort, Reputation, Serenity, Protection, Conquest, Wealth, Ability, Equipment.**
- **A strategy** — a way of addressing that motivation, expressed as a short verb-noun pair ("kill pests," "rescue NPC," "deliver item for study").
- **A sequence of atomic actions** — a small, closed set of verbs (goto, get, give, kill, listen, report, use, and about a dozen others), each with a plain precondition and postcondition ("give": *you have something, they're there* → *they have it, you don't*).

The paper's own most important discovery isn't the taxonomy — it's what happened when they built a generator from it. **Depth in a quest is created almost entirely by two recursions: "you don't know where it is yet" and "you don't have it yet."** A three-step strategy becomes a twenty-step quest purely by repeatedly asking "but how do you know where *that* is?" And their own generated example — an NPC wants information, so the player asks person A, who sends them to person B, who sends them to person C, who finally has the answer — is structurally sound and reads as exactly the hollow fetch-chain the hobby complains about. Their hand-analyzed *human-authored* example, using the **identical recursive structure**, doesn't read that way, because at every intermediate step the NPC being visited **also has their own legible want** — the assistant needs bandages before he'll help, so *he* has an errand too. Same skeleton, same recursion depth. The only variable that changed was whether a want existed at every node.

**This is the single most load-bearing craft finding in this whole document, and it's worth stating as a rule rather than an observation: depth is free, wants are not, and depth without a want at every step produces exactly the errand-feeling content everyone at every table has learned to dread.**

Applied directly to this campaign: it already gets this right at the top level (nobody in the cast wants nothing — the v4 bible's Cast section states a want for every named character in a single clause each), and the discipline worth carrying forward is applying the same test to *incidental* NPCs invented live at the table. Before an improvised NPC sends the party anywhere, one sentence — what does this person actually want, right now, independent of the party — is what separates them from being a signpost.

## 2. The nine motivations as a fast diagnostic, and where this campaign already sits on the distribution

The corpus's motivation distribution is itself informative: five motivations (Conquest, Equipment, Knowledge, Protection, Serenity) account for roughly 89% of all quests studied; Wealth, Comfort, and Ability together account for under 5%. That skew describes the commercial MMO genre specifically — a game built around combat and gear — not the possibility space of what a want can be. **The under-represented three are exactly the motivations that make a place feel inhabited rather than fought over**, and they're worth reaching for deliberately, since a genre-typical want distribution will drift toward the well-worn 89% by default.

As a fast, closed-vocabulary check for any new NPC, ask which of the nine they're chasing:

| Motivation | Where this campaign already uses it well |
|---|---|
| Knowledge | Rika's forty years of investigation; the Sensor Operator role entire |
| Comfort | Ume's accommodations for the kids, charged against the technician-day pool |
| Reputation | Rupiah's public face; the classmates who "went to a magic show" and now carry a label they never earned |
| Serenity | Hori, forty years carrying a name nobody else knows; Nobu's whole arc of paying a debt |
| Protection | The entire Directorate's stated founding purpose |
| Conquest | Manako's revenge list — the pivot point where the cult's motivation *changes category*, from Knowledge/Reputation (witness) to Conquest (revenge) |
| Wealth | Underused, currently — a genuinely open lane for a future side plot or an improvised NPC |
| Ability | The stray, and Pip's desire to prove mitflits belong in cockpits |
| Equipment | The repair economy's whole competitive-allocation structure |

Wealth is worth flagging as genuinely open lane, not a gap in the design — a smuggling, black-market, or resource-scarcity side plot rooted in plain economic want would sit comfortably alongside everything else here and currently has no strong existing claim on it.

## 3. Aarseth's triad — a one-breath check for any single mission's shape

Espen Aarseth's quest taxonomy reduces most game missions to three combinable constraints: **place** (get somewhere), **time** (before something), **objective** (achieve or obtain something). **[T]** Almost every mission is some combination — place-only is exploration, place+time is a chase, objective+time is a heist, all three together is a raid. This maps directly onto this campaign's own primitives without needing anything new: **place** is location/travel, **time** is the Mass Clock or a scene-local pressure, **objective** is a learnable, a rescue, or a Claimant's defeat/capture/dispersal.

The practical use is as a fast diagnostic when a Contact or a downtime scene feels flat: **which of the three constraints is actually live?** A Contact with no time pressure and no specific objective beyond "fight the Claimant" is place-only, which is fine occasionally (Chapter 3 is explicitly "the only chapter that plays as a straight mecha show… let them enjoy it") but would feel thin as a default. The campaign's stronger set pieces already stack multiple constraints deliberately — Chapter 6's causeway/repair-pool/sea-fort assault is place (three separate targets) plus objective (protect the logistics chain) plus an implicit time pressure (the sit-in and the Mass Clock both running underneath it).

## 4. The five-room structure — a fast one-session template, not a rule

The **five-room dungeon** (Johnn Four) is the most durable small-scale mission template in the hobby: entrance/guardian, a puzzle or roleplay challenge, a trick or setback, the climax, the reward or revelation. **[C]** Its actual value isn't the room count — it's that it forces **at least three different kinds of challenge into one short arc**, which is a built-in variety guarantee against a mission accidentally being five fights in a row or five conversations in a row.

Read as a *function sequence* rather than five literal locations, it's a genuinely useful fast-prep skeleton for an improvised Contact or a one-off downtime scene when there isn't time to design one from scratch: something that hooks them in (a guardian/threshold), something that isn't combat (a puzzle, a negotiation, a piece of investigation), a reversal that raises the stakes partway through, the actual confrontation, and a beat that delivers payoff — a revelation, a reward, or (per this campaign's own register) a moment of found-family warmth. It isn't a replacement for the Thread Grid's authored beats; it's a fallback shape for the sessions where something needs to be built in five minutes rather than five days.

## 5. The Thread Grid is already doing story sifting, by hand

**Story sifting** (the technique behind curated emergent-narrative systems, following James Ryan's curationist thesis discussed in [narrative-theory-foundations.md](narrative-theory-foundations.md) §8) is the practice of running a set of *patterns* over a chronicle of events and surfacing the subsequences that form an actually interesting shape — a reversal, a setup-and-payoff, a character's first and last appearance. **[T]**

The Thread Grid's **"Thread landings"** section (v4 bible §17) is exactly this technique, done by a human author rather than a system, and it's worth recognizing precisely because it means the discipline behind it generalizes to any future thread this campaign adds. Each landing is a hand-picked pattern match across the whole timeline: *the stray* is a setup-and-payoff pattern spanning Chapters 3 through 8 (raised in kindness, becomes the argument that reaches Manako); *the Hand's archive* is a two-century Chekhov's-gun pattern (an unbroken record, finally read); *School — they graduate* is a tonal-contrast pattern (the warmest possible scene, deliberately placed inside the most dangerous possible moment). None of these were generated automatically — they were selected, by an author, from everything that could have happened, specifically because they made a satisfying shape. That's the whole of story sifting, and the discipline worth carrying forward for anything improvised at the table is the same one objectives.md already states for its own log: **note what happened, and periodically ask which threads-in-progress are quietly forming a pattern worth landing on deliberately**, rather than letting every thread simply run until the campaign ends.

The practical version of this, usable at the table or in prep: after any session, in addition to `objectives.md`'s own log, it's worth asking — did anything that happened tonight *rhyme* with something from an earlier session (the same kind of failure, the same kind of choice, the same image)? A rhyme noticed early can be aimed at deliberately as a landing; a rhyme noticed only in hindsight is still worth naming out loud to the table, because audiences (per the retrospective-coherence finding in [narrative-theory-foundations.md](narrative-theory-foundations.md) §8) will often have already half-noticed it themselves.

## 6. The breadcrumb chain, named, so it's easy to catch

Combining §1's finding with the fetch-chain failure mode it identifies: a **breadcrumb chain** is a run of steps whose only content is locating the *next* step — "ask A where B is, ask B where C is" — with no want, no obstacle, and no consequence attached to any individual link. It's the most common failure mode in improvised investigation content specifically, because it's the path of least resistance when a GM needs to stall for information without having fully planned the reveal yet.

The fast self-check while improvising: **if the last two things a player character did were both "go somewhere and ask someone a question," the next beat needs to be something other than another question** — a want, a complication, a cost, or the actual answer. This campaign's existing investigation design mostly avoids the trap already because its clues are concrete and consequential rather than purely directional (the museum fragment, the graffiti, the photograph are all *things*, not merely pointers to the next person to ask) — worth keeping explicitly in mind as a standard to hold any newly improvised investigative thread to.

## 7. `objectives.md`'s authoring discipline, read against all of the above

Reading `objectives.md`'s own stated design rule — "**an objective with one learnable is not an arc, it is an errand. Two is thin. Three or more and it has a shape**" — against this document's findings makes clear it's not an arbitrary threshold. It's independently reproducing three separate results at once: the Three Clue Rule's redundancy logic ([ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3), the want-legibility finding above (an errand is exactly a quest that never had — or never revealed — anyone's actual want), and the causal-connectivity result from [narrative-theory-foundations.md](narrative-theory-foundations.md) §2 (a single learnable has nothing to connect to; three or more create the possibility of one recontextualizing another). That's an unusually strong convergence of independent theoretical support for a single authoring rule, and it's worth treating as settled craft rather than a stylistic preference the next time it's tempting to ship a thin, one-learnable objective under time pressure.

---

*The library has since expanded beyond these five — see **[craft-library.md](craft-library.md)** for the full index and a router from writing task to document.*

*Related within this reference series: [narrative-theory-foundations.md](narrative-theory-foundations.md) §2 (causal connectivity, the theoretical basis for §7 above) and §8 (retrospective coherence, the basis for §5's story sifting); [agency-and-player-choice.md](agency-and-player-choice.md) §6 (storylets — the structural vocabulary this document's individual missions are instances of); [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3 (the Three Clue Rule, extended here) and §7 (secrets-and-clues prep, the source material this document's missions are built from).*

*Related in this project: `objectives.md` (analyzed directly in §7); `ideas/story/blank-inheritance-v4.md` §2 (Cast — every named character's want, already stated per §1's discipline), §13 (the ground roles as investigative lenses), §17 (the Thread Grid and Thread landings, analyzed in §5).*
