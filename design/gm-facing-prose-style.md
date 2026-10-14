# GM-Facing Prose Style

**Status: standing rule, written 2026-09-21.** This file fills a vacancy `prose-craft-and-naming.md` §1 named and left open: `location.schema.json` points at "design/gm-facing prose style" as though it were a file, and no such file existed. Everything a GM reads while running a scene is governed here.

**Read this before writing or editing any scene brief, episode file, location `summary`, or NPC brief.** It is not a style preference. It is a specification for text that has to work under a cognitive load the writer never experiences.

---

## 0. Most important first (D056)

Write the Scene Runner the way an expert in adventure prep would write it for Ingram: concise, precise, plain, and in the order she needs it. The reader is her, mid-scene, with six people waiting. She knows how to run a table and deliver a line. She doesn't need persuading, history or reasons. She needs the next move, then the catch.

**Three looks.** Each must be complete on its own.

| Look | Time | What it reads | What it must give |
|---|---|---|---|
| Glance | 1 second | The beat line | What happens, or what she does. Verb first. |
| Look | 5 seconds | The first line under it | The one thing that breaks the scene if missed. |
| Read | 30 seconds | The rest | What to do if…, the secret, the results. |

Anything that serves none of the three stays out of the Runner.

**Ten rules.**
1. Start with the verb. *Describe a utility machine*, not *THIS IS A GEN 1 FRAME*.
2. Put the condition first, then the action. *If no arrival fits: put it in one random player's spotlight.*
3. Say it once, where it's used. A rule that matters in one beat lives in that beat and nowhere else.
4. Write it as it is now. Never "no longer", "now", "replaced", "the old version", "Ingram asked".
5. Say what to do. Keep a "don't" only when the mistake is likely and breaks the scene.
6. Give a secret as a fact, in a sentence or two. No lore lectures.
7. Name things the way she'd say them at the table: no file names, ledger or decision numbers, beat ids or tool names.
8. Leave the delivery, and the table's reaction, to her.
9. Write full sentences. No fragments.
10. Stay inside the budget. If it doesn't fit, it's two beats, a list, or prep notes.

**The test for every sentence:** if I deleted this, would Ingram do anything differently at the table? If not, it goes to prep notes, or nowhere.

**Budgets.**

| Field | Its one job | Budget |
|---|---|---|
| Beat line (`text`) | What happens, or what she does | 25 words: it must fit the two lines a folded beat shows |
| `direction` | How to deliver it, only when that matters | 40 words |
| `note` | Labelled lines (below) | 80 words, 25 a line |
| Check result | What they get, per degree or skill | 40 words |
| `goal` | What is true when the scene ends | 30 words |
| `howToPlay` | The scene's shape, with at most one bold rule | 40 words |
| Ending | `endsWhen` / `transition.line` / `writeDown` | 15 words / 20 words / 3 items |
| Handout card | One line per detail a player might ask about | 25 words a line |
| `reactionPrompts` | What to rate afterwards | 3 prompts |
| Whole scene | All of the above, not counting read-aloud, check results or cast cards | about 900 words |

**Five labels for a note,** in sentence case at the start of a line, one line each. They replace §4's ALL-CAPS sections.

| Label | Holds |
|---|---|
| `Do` | The instruction, when the beat line needs a second sentence. |
| `If …` | What to do when something happens: "If they ask…", "If nobody…", "If it goes wrong…". The label is the condition; the line is the action. |
| `Secret` | What only the GM knows, as a fact. Never read aloud. |
| `Plant` | What they must see, and how often. Never the payoff. |
| `Watch for` | The one likely mistake. Rare. |

**Where things go instead.**

| To keep | Put it in |
|---|---|
| Why a beat is built this way | Prep notes (`notes`): the Casebook shows them, the Runner doesn't |
| A rule about the world | A canon fact in `canon/world/` |
| What a later scene must not reveal | A canon fact with `told: later`, which `story check` enforces |
| What changed, and why | The commit message, and the message to Ingram |
| A rule the Runner can show (required, whole table, free roll) | A data field the Runner shows as a chip |

The rest of this document still holds where it doesn't conflict with §0. Where it does, §0 wins.

---

## 1. The one rule everything else follows from

**The variable is whether the reader can stop and think.**

A designer reading in prep can re-read a sentence, follow a citation, hold a caveat open, and come back tomorrow. A GM two hours into a session, with six people waiting, cannot do any of those things. The same words serve one reader and fail the other.

Every field in a scene brief has exactly one of these readers. Writing for the wrong one is the single most common defect in this corpus, and it is invisible to the person writing, because the writer is always the designer.

**Test before writing any sentence: is this read in prep, or mid-scene?** If mid-scene, it must be a plain instruction — full sentence, verb present, instruction stated outright, decodable by someone who has not read the file before.

---

## 2. The field contract

| Field | Reader | When | What belongs | What never belongs |
|---|---|---|---|---|
| `text` | GM | mid-scene, skimmed | One actionable line. What happens or what the GM does. | Rationale, history, citations |
| `readAloud` | Table | spoken aloud | Prose built to be said. Three sentences (§5). | Anything the GM must silently filter out first |
| `direction` | GM | mid-scene | How to deliver it, only when that is critical (D048). Usually empty. | Reasons, provenance, dates, "this used to be" |
| `note` | GM | mid-scene, glanced | Labelled lines: Do, If…, Secret, Plant, Watch for (§0, §4). | Change history, justification chains, design reasons |
| `notes` (file-level) | Designer | prep only | Standing rules for the scene, casting reasoning, open flags. | Dated changelog entries |
| `summary` | Designer | prep only | What the scene is, in plain sentences. | — |
| `cast[].brief` | GM | mid-scene, improvising | A generator (§6). | A script |
| `intro.landmark` | GM | mid-scene | One object, one sentence. | Restating what `firstThing`/`readAloud` already said |

**A field holding content for the wrong reader is a defect even when every fact in it is true.**

---

## 3. Provenance does not live in the artefact

This project has strong, correct anti-staleness instincts — the Node Registry, `data-ownership.md`, the habit of flagging corrections. Those instincts produced the defect, by generalising "annotate every change" to files that are read aloud under pressure.

**Where each kind of provenance actually belongs:**

| You want to record | It goes in |
|---|---|
| Why this changed | The git commit message |
| A fact that two files both need | A Node, referenced by `nodeRefs` — never restated |
| A decision that is still open | `open-questions.json` |
| Reasoning behind a design | The relevant `design/` document |
| What you just changed, for Ingram | Your message to her. Not the file. |

"Flag it loudly" means *report it to Ingram plainly in conversation*. It has never meant "leave a marker in the artefact."

**Banned outright from any GM-facing field:**
- Date stamps (`Added 2026-09-19`, `REVISED 2026-09-20`, `Corrected 2026-09-13`)
- Status labels (`STALE`, `CORRECTED`, `REVISED`, `NEW`)
- `this used to say X` / `this previously claimed Y` in any phrasing
- Justification chains — more than one citation to establish one small fact
- File-path citations where a Node reference or a plain statement would do

**Why, not just what:** negation requires representation. To process "this used to be a tannoy and is now the Section Officer," a GM must first construct the tannoy, then delete it. The discarded version gets rehearsed on every read. A beat that opens that way builds the wrong scene first, in the reader's head, every single time.

---

## 4. The shape of a `note`

Notes carry the heaviest load and drift worst. A note is a few labelled lines, in the order the GM needs them, using §0's five labels (`Do`, `If …`, `Secret`, `Plant`, `Watch for`) in sentence case. The line that breaks the scene if missed comes first. No provenance, ever, and no ALL-CAPS section headings.

A note over §0's budget is a defect regardless of content quality: split it, or move what isn't needed at the table into the scene's prep `notes`.

---

## 5. Read-aloud

- **Three sentences, hard ceiling** (`prose-craft-and-naming.md` §4): where you are and what is happening; one telling detail; the thing that is moving or about to ask for a decision. Exceed it only when the passage is built as separable units a GM can drop live.
- **Lead with a sense other than sight** (`environmental-storytelling-and-place.md` §7).
- **Three details on entry, a fourth held in reserve.** Pick by function: one orients, one is evidence, one is an affordance. Three atmospheric details make a mood, and a mood cannot be acted on.
- **One landmark to orbit.** Theatre of the mind fails silently without it — a position relative to nothing is not a position.
- **On a return visit, describe the delta only.**
- **Keep a location's vocabulary fixed.** Synonym variation reads as good prose and behaves as new information.
- **Give the artefact, never the conclusion drawn from it.** Design for inference, not delivery.
- **Never write what the table feels, concludes, or will do.** Build the situation and stop. (Standing rule; see `feedback_never_predict_player_response` in project memory.)

---

## 6. An NPC brief is a generator, not a script

The players will not say the cue line. A script is close to useless at the table.

What actually works (`dialogue-and-character-voice.md` §7):
- **A want**, in one clause, stated before any line is written. What do they want *out of this conversation*.
- **An opener** that is their agenda, not the GM's.
- **A register.**
- **Three to six samples spread by function** — an opener, a refusal, a moment of warmth, one under pressure — not the character's six best lines.
- **Hard lines with their reasons.** The reason is what lets a GM improvise the refusal in voice instead of just saying no.
- **A negative specification**: what this character must never sound like, written as a test rather than a mood. *"If a line could be read in Shucks' voice without sounding wrong, it is the wrong line for Nobu."*

**The only test that matters: can the GM answer an unanticipated seventh question in this character's voice?**

Differentiate by rhythm, refusal, and what a character retreats to under pressure. A verbal tic is transplantable and ranks last; a cast differentiated only by tics sounds like one person doing voices.

---

## 7. Failure modes, named

Craft-library modes to check against — each is a real, diagnosed way scenes go wrong:

- **Breadcrumb chain** — steps whose only content is locating the next step.
- **The errand** — an objective with one learnable. Two is thin; three or more has a shape.
- **Quantum beat** — prepared content that would land identically regardless of what the party did.
- **Exposition in a costume** — a line with no want under it.
- **The space that tells** — a detail whose only function is explaining the location.
- **Texture displacing consequence** — five vivid details and no answer to "what do the players *do* here."
- **Aphorism-as-instruction** — "kindness is a currency here" is not an instruction. State the instruction.
- **Dialogue-as-instruction** — an NPC line that exists to convey a design note is a brief leaking through a mouth.
- **Run of consecutive downs** — four or five in a row is a fault to fix, not a mood to accept.
- **The flat session** — no identifiable peak.

**Modes this project has actually committed, added here so they are checkable:**

- **Audience collapse** — designer content in a GM field. The defect this document exists for.
- **Correction archaeology** — the file arguing with its own past.
- **Triple-statement** — the same detail in `firstThing`, `readAloud` and `landmark`. Say it once, in the field whose job it is.
- **Duplicate read-aloud** — the same text in an `intro.readAloud` and a beat, so the GM reads it to the table twice.
- **Style attractor** — a construction that colonises the corpus during revision passes. `"X's own Y"` reached 69 uses before anyone noticed; the two newest files had zero, which is how it was identified as an editing artefact rather than a voice.
- **Field-path clobber** — bulk-editing by JSON path and writing the right value to the wrong index. A structural diff will not catch it, because structure is intact and only prose changed. Verify by checking whether any two prose fields became identical twins, and whether any unique content vanished entirely.

---

## 8. The lint list

Mechanically checkable. Run before considering a scene done:

1. No date stamps in any GM-facing field.
2. No `STALE` / `CORRECTED` / `REVISED` / `NEW` labels.
3. No "this used to" / "previously said" constructions.
4. `"X's own Y"` only where genuinely contrastive.
5. Straight quotes and `--` throughout. No curly quotes, no em-dashes — they render inconsistently in the Scene Runner.
6. No prose field byte-identical to another prose field in the same file.
7. `readAloud` at most three sentences, or explicitly built as droppable units.
8. Every `note` over ~600 chars has labelled sections.
9. One bold span per field at most, reserved for an instruction that breaks the scene if missed. **`**bold**` and `*italic*` genuinely render** in `text`, `readAloud`, `direction` and `note` — `module/blank-inheritance/scripts/core/emphasis.mjs`, applied strictly after HTML-escaping. Nothing else does: no links, no headings, no lists, no code spans. For a long `note`, structure it with the ALL-CAPS labels of §4 rather than reaching for markdown that is not there.
10. No detail stated in more than one of `firstThing` / `readAloud` / `landmark`.
11. No beat `readAloud` identical to the scene's own intro `readAloud`.

All eleven are enforced by `test/tier2-scene-prose-style.test.mjs`, over `data/scene-briefs/` and `data/episodes/` — the two things read while a session is actually running. Design docs, `ideas/` and the bible are prep-time reading and are deliberately not linted; provenance genuinely belongs in those.

### 8b. The structural rules

The rules above police how a sentence is written. These four police whether the scene is *built*, and live in the same test file for the same reason — each guards a defect that looks fine in the commit that introduces it and only reads as a pattern across the corpus.

12. **No line predicts what the players will feel, conclude or do.** The hardest standing rule on the project (see `feedback_never_predict_player_response`): build the environment, never assert the reaction. A GM reading "the party will find this funny" has been handed an expectation their actual table is about to fail to meet. Enforced against subject-plus-interiority constructions (`the players will realise`, `the table finds it`, `the party decides`).
13. **Every cast member has a `wants`, and it does not restate their `role`.** "Depth is free, wants are not" (`quests-objectives-and-threads.md`). Length is explicitly *not* the signal — "To get back to her floor" is four seconds of characterisation and does more work than a paragraph would. The defect is a want that paraphrases the role, which leaves a GM nothing to play against.
14. **Every optional beat has a `when.condition`.** An optional beat with no stated trigger is one the GM has to decide whether to run while the table is waiting, and the Scene Runner cannot tell them who it is for.
15. **No two files share a near-identical `note` or `direction`.** Rule 6 catches byte-identical twins inside one file; this catches the slower failure, where a good sentence gets pasted into the next scene until it is a corpus-wide tic.
16. **An `intro.readAloud` over three sentences is built as three or more droppable units** (blank-line separated). §5 permits exceeding the ceiling only for a passage a GM can cut live; a single seven-sentence block is not that, it is something they must either read whole or improvise out of mid-breath.
17. **Every speaking cast member has a `willNotDiscuss` entry.** §6: without one, a GM improvising an unanticipated question has nothing to refuse with, and the character answers everything — which is how an NPC stops being a person and becomes a lookup table. Cast marked `walkOn: true` are exempt, and deliberately so: a silent figure visible in a line with their rank legible has no lines to refuse with, and writing some for them would be the actual defect.

18. **No provenance in text the GM reads — but pointers to what they need are not provenance.** This is the rule the date-stamp ban was only one symptom of, and it was derived by actually running the diff of the twelve scene files another model was asked to clean up (see §8e). Of its 120 changes, **51 — 43% — were removing provenance from GM-facing text and nothing else.**

    The line is *whose question does this sentence answer*:

    | Provenance — cut it | Pointer — keep it |
    |---|---|
    | When it was written or changed (`New 2026-09-20`, `REDESIGNED 2026-09-19`) | Where to read something before running it (`Read quarantine/ideas/story/dossier-cicada.md §3 and §4 before running this`) |
    | What it used to be, and why it is not that any more | Where a thing the GM will need actually lives (`See data/campaign/equipment-catalogue.json`) |
    | Which memory key or design doc justified the decision (`see feedback_design_before_characters_exist in project memory`) | Which document owns a fact that is still open |
    | An SRD quote proving the rule is real (`GM Core's own surrender guidance: "one side might surrender when…", reference/srd/gm-core/610-running-encounters.json`) | The plain instruction that quote was defending (`Demoralize works exactly as normal`) |
    | Why the beat exists at all (`Added so the missing-stock plant has a way to be FOUND by a player who investigates…`) | What the beat does at the table |

    Provenance is about the **document's history**. A pointer is about the **GM's next action**. The first belongs in git and in the design docs; the second belongs exactly where it is. Nine repo paths survive in the current corpus and every one of them is the second kind.

### 8c. What the lint cannot check, and must not be made to

Three craft rules were tried as tests and pulled, because the false-positive rate was high enough that a real author would learn to ignore the failure:

- **"Lead with a sense other than sight."** Silence, a bell, a noise like crickets and "quieter going back" are all correct non-visual openers, and no word list catches them. Check it by reading.
- **"Every mandatory check has a refusal floor."** The permission is written a dozen different ways ("nobody has to roll", "silence is a valid answer", "say nothing and it costs nothing") and pattern-matching it flags good scenes.
- **`intro.landmark` and `outro.tracks` being present.** Both are correctly absent sometimes — a six-place montage has nothing shared to orbit, and a scene set before the institution exists has nothing on the strategy layer to move. Where absence is deliberate, say so in the file's own `notes` so the next audit stops there instead of re-raising it.

**A rule that blocks correct writing gets switched off, and then it protects nothing.** Prefer a narrow rule with no false positives over a broad one with a few.

### 8d. Known attractors — check these by reading, at the end of a writing pass

Not lints. These are constructions that are *correct once and a tic by the third use*, and no rule can tell the difference. The reliable method is to dump every `readAloud` in an episode into one place and read it as a body — every one of these was found that way and by nothing else.

| Construction | Where it goes wrong |
|---|---|
| `X, which is Y` as a trailing clause | Three landed in one short scene, each fine alone. Together the GM hears the rhythm before the content. |
| `Nobody is…` / `Nobody has…` opening a sentence | Became the default way to close a quiet beat — six across one episode. Two are the right line; the rest were reflex. |
| `not X so much as Y` | Two adjacent scenes. Ratcheted at one, in the lint, because it is distinctive enough to notice. |
| `X's own Y` | Reached 69 uses before anyone noticed. Now capped at 20 and falling. |
| `I would like you to ___` | **A voice collapse, not a tic — the worse kind.** Four uses across three scenes, spoken by three *different* institutional adults, always at the exact moment that scene delivered its point, and twice inside one speech. One writer's hand showing through three characters. One was kept (the Signals teacher pointing at their own word choice, which is the only one doing work); the rest were rebuilt in each character's own register, and all three got sharper for it — the Deputy Director states a distinction instead of requesting understanding, the Transparency Advocate says "write it down". |
| `It is the first time that…` | Four uses. The narrator telling the table which moment is significant instead of handing them the fact. Two survived: one literal and physical (a tide), one that is about an NPC's behaviour rather than the party's feelings. The other two were replaced with the concrete thing — "Nobody has told you what time to be at the bottom" — which also removes a quiet breach of the never-predict-player-response rule. |

**The procedure, at the end of a pass:** count the constructions, look at every instance in context, keep the one or two that genuinely earn it, and rebuild the rest. Do not fix them all — an attractor at two uses is a voice, and only at five is it a habit.

**How to find the ones nobody has named yet.** Counting known constructions only finds known constructions. Dump every `readAloud` in both episodes into one body — 121 blocks, about 6,600 words — and run an n-gram sweep for any 4-to-6 word phrasing that repeats three or more times across two or more different scenes. Most of what comes back is deliberate callback (the tram "with its doors open", the chalk "board by the door") and should be left alone. What you are looking for is the row where the *same rhetorical move* appears in the mouths of different characters. That is what turned up `I would like you to`, which no rule and no lint would have caught, because every individual instance is well written.

**Mechanics attract too, and worse.** A prose attractor makes the GM hear a rhythm. A *skill* attractor changes who at the table gets to act: on 2026-09-21 Society was on 41 of 62 checks across both episodes and never the only option, which is the shape that quietly makes one player the answer to everything. Same procedure, different corpus — count it across all the challenges at once, because in any single scene it looks like exactly one check. See `design/scene-audit.md` §10, and `test/tier2-skill-spread.test.mjs`, which fails at 40%.

---

### 8e. The diff that produced rule 18

Ingram had another model clean up twelve of these scene files and supplied both sides. Running the diff is the single most useful hour of process work on this document, and the numbers are the reason:

| | |
|---|---|
| fields changed | **120** |
| fields added | **0** |
| fields deleted | **0** |
| median field length | 558 chars → 490 (**−12%**) |
| changes that only removed provenance | **51 of 120 — 43%** |

**It rewrote prose and touched nothing structural.** Not one beat added, not one removed, not one reordered, no check retargeted. Which is exactly why every structural tool on this project kept reporting clean while the real defect sat untouched: **roughly one field in four that it touched, it touched only to delete provenance.**

Keyed by id, never by array index. An index-keyed diff on this same data previously reported two fields "lost" that were both present, because the episode had grown from nine scenes to eleven.

Three representative pairs, which is what turned the count into rule 18:

> **`canteen / takas-entrance.direction`**
> *Before:* "REDESIGNED 2026-09-19 (see design/episode-one-redesign.md and feedback_design_before_characters_exist in project memory) — this used to be Taka assigning each player a specific invented nickname, which needed the GM to characterise six unknown players correctly, live…"
> *After:* "The warmth comes from INCLUSION, not labelling."
> The GM was being made to read the discarded design before reaching the current one.

> **`flood-tunnel / drive-them-off.direction`**
> *Before:* "Nothing bespoke to adjudicate — Demoralize works exactly as normal (GM Core's own surrender guidance: 'one side might surrender when almost all its members are defeated or if spells or skills thoroughly demoralize them,' reference/srd/gm-core/610-running-encounters.json)."
> *After:* "Nothing bespoke to adjudicate. Demoralize works exactly as normal."
> The citation was proving the rule to the reader instead of telling them what to do.

> **`the-errand / the-shelves.note`**
> *Before:* "Added so the missing-stock plant has a way to be FOUND by a player who investigates rather than only by one who happens to make small talk…"
> *After:* "This puts the gaps in front of the eyes of a player who looks without being told to."
> The first explains why the beat exists. The second tells the GM what it does.

`test/tier2-no-provenance-in-play-text.test.mjs` enforces the four tells that survive this rule — a memory key in play text, an SRD citation standing in for a ruling, deferred design discussion, and archaeology naming the discarded version. Run against the originals that model was handed, it finds nine. Against the current corpus, none.

---

## 9. Variety, for a set of scenes

A session is not a list of good scenes; it is a sequence that has to feel varied. Vary deliberately along these axes (drawn from `quests-objectives-and-threads.md` §4, `pacing-and-the-responsive-campaign.md` §3, `environmental-storytelling-and-place.md` §5/§7, `mystery-and-investigation-design.md` §3):

- **Kind of challenge** — never five conversations or five fights in a row.
- **Scene texture** — personal spotlight, slow one-on-one, fast transactional, social problem-solving, loud-then-cold, physical, investigative.
- **Emotional arrow** — mark each beat up/down/lateral and read the sequence. Alternate them.
- **A designed breather** — at least one scene per session whose entire job is relax, authored as deliberately as the climax, with its own description.
- **Mission constraints** — place / time / objective. Vary which are live.
- **Clue type** — physical evidence, testimony, absence, anomaly, pattern, corroboration. Budget the six separately.
- **Responsiveness** — many cheap acknowledgements, few diversions, one transform.
- **Scale register** — Frame scale is glass, personnel scale is paper. Two scales means two descriptions of the same place, and they must not sound alike.
- **Sentence shape** — vary length, and put the short sentence after the long ones.
- **Player-type coverage** — check which player type each optional beat is actually for. Coverage decays silently as a menu grows.

---

## 10. Pre-flight, compact

If there is time for nothing else, run these seven:

1. Is every GM-facing line a plain instruction a stranger could act on mid-scene?
2. Does anything here record history that belongs in git, a Node, or my message to Ingram?
3. What do the players actually **do**? If the honest answer is "watch," rewrite it.
4. Does every NPC, including walk-ons, have a want I can state in one clause?
5. Does the read-aloud give a fact rather than a conclusion, and stop at three sentences?
6. If a player refuses a mandatory beat, is there an authored answer?
7. Against the last two scenes: is this a different texture, a different challenge kind, a different emotional arrow?

---

*Related: `prose-craft-and-naming.md` (the research this operationalises, and the §1 gap this file closes), `dialogue-and-character-voice.md` §7–§8, `environmental-storytelling-and-place.md` §7, `scene-audit.md` (the fuller pre-signoff checklist — this file is the writing standard, that one is the review gate), `ux-doctrine.md` (how the Scene Runner renders what is written here).*
