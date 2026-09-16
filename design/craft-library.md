# The Craft Library — index and router

*Written 2026-09-13. This is the index to the sixteen craft reference documents in `design/`. It exists to answer one question quickly: **I am about to write something — which documents should I read first?** Use §1 as a lookup table, not as reading material. The library covers narrative theory, game and TTRPG design, and fantasy/science-fiction writing convention, gathered because this campaign's own design was already arriving at a lot of it independently and it is worth having the theory alongside the instinct.*

*Nothing in this library is a decision document. No document here overrides `ideas/story/blank-inheritance-v4.md`, the per-entity bible at `ideas/story/bible/`, `design/campaign-arc.md`, `design/scale-and-chassis.md`, or any entry in `data/campaign/open-questions.json`. Where a library document touches a live design question it names it and stops.*

---

## 1. The router — what am I writing?

Find the row that matches the task. Read the **primary** documents in full before writing; consult the **secondary** ones if the specific problem named comes up.

| I am about to write… | Primary | Secondary |
|---|---|---|
| **A scene** (any kind) | `narrative-theory-foundations.md`, `pacing-and-the-responsive-campaign.md` | `environmental-storytelling-and-place.md` (if place matters), `dialogue-and-character-voice.md` (if people talk) |
| **An NPC** | `quests-objectives-and-threads.md` §1–2 (the want), `dialogue-and-character-voice.md` | `character-creation-and-progression.md`, `npc-social-intel.md` (outside this library), `research/giant-robo/npc-archetype-catalogue.md` (an archetype to build on) |
| **A villain, an enemy faction, or a recurring antagonist** | `research/giant-robo/the-recurring-antagonist-engine.md`, `research/giant-robo/the-magnificent-ten-as-an-org-chart.md` (both outside this library — see §5) | `quests-objectives-and-threads.md` §1–2, `agency-and-player-choice.md` (a disclosed escape, never a hidden one) |
| **A location** | `environmental-storytelling-and-place.md`, `worldbuilding-craft.md` | `prose-craft-and-naming.md`, `japanese-narrative-conventions.md`, `location-depth.md` + `location-rank.md` (outside this library) |
| **A quest, Contact, side plot or objective** | `quests-objectives-and-threads.md`, `agency-and-player-choice.md` §6 (storylets) | `mystery-and-investigation-design.md`, `pacing-and-the-responsive-campaign.md` §2 (delayed consequence) |
| **A mystery, clue, reveal or investigation thread** | `mystery-and-investigation-design.md`, `ttrpg-campaign-and-session-craft.md` §3 (Three Clue Rule) | `narrative-theory-foundations.md` §4 (anomaly before question) |
| **A session or chapter** | `ttrpg-campaign-and-session-craft.md`, `pacing-and-the-responsive-campaign.md` | `strategy-and-downtime-design.md` (if downtime is in it), `japanese-narrative-conventions.md` §2 (jo-ha-kyū, and that it nests) |
| **A choice, dilemma or branch point** | `agency-and-player-choice.md`, `pacing-and-the-responsive-campaign.md` §5 (the checklist) | `mechanics-as-meaning.md` |
| **A rule, mechanic or subsystem** | `rpg-systems-design.md`, `mechanics-as-meaning.md` | `design-layers.md` (outside this library), `reference/srd/` for exact SF2E wording |
| **Downtime, the strategy layer, an economy** | `strategy-and-downtime-design.md` | `rpg-systems-design.md`, `mechanics-as-meaning.md` §7 (a game is about what it pays for) |
| **Character creation, progression, a sheet** | `character-creation-and-progression.md` | `rpg-systems-design.md`, `induction.md` (outside this library) |
| **Dialogue, an NPC's voice, a topic list** | `dialogue-and-character-voice.md` | `japanese-narrative-conventions.md` (register and honorifics), `prose-craft-and-naming.md` |
| **Lore, history, an institution, a species** | `worldbuilding-craft.md` | `japanese-narrative-conventions.md`, `science-fiction-and-mecha-conventions.md`, and **always** `ideas/story/bible/` first |
| **Anything mecha, or a Frame at scale** | `science-fiction-and-mecha-conventions.md` | `science-fiction-and-mecha-conventions.md` §11 (rendering scale in prose), `environmental-storytelling-and-place.md` §7 (theatre of the mind), `scale-and-chassis.md` (outside this library) |
| **Anything set in the city, school, or era** | `japanese-narrative-conventions.md` | `worldbuilding-craft.md`, `environmental-storytelling-and-place.md` |
| **Player-facing description read at the table** | `prose-craft-and-naming.md`, `environmental-storytelling-and-place.md` | `japanese-narrative-conventions.md` |
| **GM-facing instructions or prep** | `prose-craft-and-naming.md` §1 (the two registers) | `ttrpg-campaign-and-session-craft.md` §7 (prep philosophy) |
| **A name for anything** | `prose-craft-and-naming.md` §11–13 (sound, table distinctiveness, tracked placeholders) | `japanese-narrative-conventions.md` §7 (order and ownership), and check `data/campaign/naming-placeholders.json` first |

**If there is no time to read anything, read the twelve heuristics at the end of `pacing-and-the-responsive-campaign.md` §6.** They compress the whole library into what can be held in mind while improvising.

## 2. The three shelves

### Narrative and interactive-story theory

- **[narrative-theory-foundations.md](narrative-theory-foundations.md)** — how stories work in a reader's head, independent of any game system. Fabula/syuzhet, causal connectivity (importance is wiring, not prose quality), the five event indices, suspense/curiosity/surprise, information gaps, the actantial model, retrospective coherence.
- **[agency-and-player-choice.md](agency-and-player-choice.md)** — what agency actually is and what it costs. The narrative paradox and its four honest answers, the Mirror as a correctly-built drama manager, agency-as-matching, meaningful play, the illusion-of-agency finding, storylets.
- **[environmental-storytelling-and-place.md](environmental-storytelling-and-place.md)** — how place carries story. Jenkins's four modes, space as evidence, the memory palace, absence and wear, spatial rhythm as pacing, and how to do all of it in prose at a theatre-of-the-mind table.
- **[mechanics-as-meaning.md](mechanics-as-meaning.md)** — what a rule argues. Procedural rhetoric, MDA, ludonarrative dissonance and its inverse, incentive design, what mechanising a thing signals, and the removability test.
- **[dialogue-and-character-voice.md](dialogue-and-character-voice.md)** — how people talk. Wants under dialogue, subtext, voice differentiation, exposition delivery, dialogue systems in games, and what an NPC prep entry needs for a GM to improvise inside it.

### TTRPG design and table craft

- **[ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md)** — table-tested GM technique. Prep situations not plots, the Three Clue Rule, fronts and clocks, fail-forward, the railroading debate, prep philosophy, campaign shapes, player types, safety tools.
- **[quests-objectives-and-threads.md](quests-objectives-and-threads.md)** — the individual unit of content. The want-legibility finding (depth is free, wants are not), the nine motivations, Aarseth's triad, the five-room structure, the breadcrumb chain, story sifting.
- **[pacing-and-the-responsive-campaign.md](pacing-and-the-responsive-campaign.md)** — session and arc rhythm, and the library's synthesis. The four responsiveness levels, delayed consequence, the pacing sawtooth, peak–end, the meaningful-choice checklist, and twelve compressed heuristics.
- **[rpg-systems-design.md](rpg-systems-design.md)** — what makes a rule good. Resolution systems and curve shape, bounded accuracy, degrees of success, the action economy, failure design and death spirals, complexity budget, and writing usable rules text.
- **[mystery-and-investigation-design.md](mystery-and-investigation-design.md)** — investigation structure. The GUMSHOE insight, information versus understanding, clue taxonomy, red herrings honestly assessed, fair play, pacing an investigation, and divided-labour investigation.
- **[character-creation-and-progression.md](character-creation-and-progression.md)** — the first act of play. The authored/blank-slate spectrum, flags and bonds as content requests, group cohesion, what levelling is for, and the dual-character problem this campaign actually has.
- **[strategy-and-downtime-design.md](strategy-and-downtime-design.md)** — the layer above a session. Why a strategy layer exists, the XCOM shape, opportunity cost as content, faction clocks, base building, downtime activity design, scheduling as a game, and rest as pacing.

### Fantasy and science-fiction writing convention

- **[worldbuilding-craft.md](worldbuilding-craft.md)** — sub-creation and secondary belief, the iceberg, Le Guin on register, Sanderson's laws, consistency versus wonder, the worldbuilding trap, cultures that disagree with themselves, institutions, logistics, deep time, and adapting an existing setting.
- **[science-fiction-and-mecha-conventions.md](science-fiction-and-mecha-conventions.md)** — the novum and cognitive estrangement, the one-big-lie discipline, technobabble, and the mecha genre's own grammar: super versus real robot, the sortie ritual, rendering scale in prose, the pilot–machine relationship, and what the enemy is for.
- **[japanese-narrative-conventions.md](japanese-narrative-conventions.md)** — kishōtenketsu, jo-ha-kyū, ma, mono no aware, honorifics and register shift, naming conventions, 1950s Shōwa texture, the school story, giri and ninjō, and respect versus pastiche.
- **[prose-craft-and-naming.md](prose-craft-and-naming.md)** — sentence-level craft. The two registers this project writes in, show/tell stated properly, specificity, description economy and its table ceiling, rhythm, the passive voice as an institutional tool, writing to be read aloud, and naming craft.

## 3. How these documents are written

Four conventions hold across the library:

- **Claims carry an evidence tag.** **[E]** empirical (peer-reviewed or at least tested), **[T]** theory (a scholarly framework — useful vocabulary, not proof), **[C]** craft (practitioner consensus from thousands of tables or shipped games, often righter than theory and never measured), **[Q]** contested or weak. Craft is the most common tag and is not a lesser one; it is an honest one.
- **Every section does double duty.** It explains an idea, then checks it against what this campaign already does, citing real files and sections. Where the campaign already gets something right, the document says so specifically.
- **Gaps are named and left open.** A library document may identify a risk or an unanswered question. It may not answer one. Live questions belong in `data/campaign/open-questions.json` and are the project owner's calls.
- **GM-facing prose is plain.** Instructional sentences, no aphorism. The one exception is quoted character speech, which may be as oblique as people are.

## 4. What this library is not

It is not a source of campaign facts. For what is true in the world, read `ideas/story/blank-inheritance-v4.md`, the per-entity bible at `ideas/story/bible/`, and `ideas/story/bible/LEDGER.md` for questions already asked and answered. The bible answers *is this consistent?*; this library answers *is this well-built?* Both checks are required and neither substitutes for the other.

It is also not a rules reference. For exact SF2E mechanics, wording and numbers, use the local mirror at `reference/srd/` and the pre-extracted numeric tables in `reference/tables/`, which are more reliable than recalling the system from memory.

## 5. Adjacent shelves — source research

Separate from this library, and governed by the same discipline, `design/research/` holds **source research**: close reading of the works this campaign's tone is drawn from, gathered to feed specific creative tasks. A research shelf answers *how did somebody else build this, and what is portable?* — it is neither craft theory nor lore, and it decides nothing.

- **[research/giant-robo/README.md](research/giant-robo/README.md)** — *Giant Robo: The Day the Earth Stood Still* (1992–1998), the series this campaign's tone is locked to. Ten thematic documents and thirty-two character files: the recurring-antagonist engine, the enemy org chart, the wuxia epithet convention, the Water Margin and Three Kingdoms figures behind the heroes, the buried-atrocity structure, and an archetype catalogue. **Read it for tone, for villains who recur, for allies, and for names.**
- **[research/evangelion/README.md](research/evangelion/README.md)** — *Neon Genesis Evangelion* (1995–96, plus *The End of Evangelion*). Twelve thematic documents and twenty-one character files, gathered to fill the gaps the first shelf could not: school life and the ordinary day, an institution whose treatment of its children is the subject, sixteen enemies built as puzzles with sixteen different solutions, operational texture, relationships that degrade, and a naming method. **Read it for structure — never for register.** This campaign's tone is locked to Giant Robo and explicitly not to this series, so the shelf opens with a guardrail document listing what is quarantined, and every file in it repeats the rule.

Research shelves tag their claims **[S]** source / **[R]** reading / **[U]** suggested use, rather than this library's **[E]/[T]/[C]/[Q]**, because the question they answer is different: what the source actually contains, what to make of it, and what might transfer.

**When the two shelves disagree, take structure from one and temperature from the other.** `research/evangelion/npc-archetype-catalogue.md` §8 is the cross-shelf table: tone and recurring villains and warm adults from Giant Robo; school, institution, peer rivals and encounter design from Evangelion; names and the machine-as-character from both. Between them the two shelves hold fifty-three archetype rows.

---

*Related in this project: `ideas/story/bible/README.md` (the per-entity bible discipline and its mandatory "what NOT to do" sections); `ideas/story/bible/LEDGER.md` (the append-only record of lore questions already answered — check before asking); `data/campaign/open-questions.json` (the live design questions this library may inform but never resolve); `design/ux-doctrine.md` (the lodestone for interface work); `design/design-layers.md` (build Layer 0 first, then overlay).*
