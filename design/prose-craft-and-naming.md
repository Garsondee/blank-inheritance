# Prose Craft and Naming

*Written 2026-09-13. The last of eleven reference documents added to this library today, and the one that closes the expansion — sixteen in all, counting the original five ([narrative-theory-foundations.md](narrative-theory-foundations.md), [agency-and-player-choice.md](agency-and-player-choice.md), [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md), [quests-objectives-and-threads.md](quests-objectives-and-threads.md), [pacing-and-the-responsive-campaign.md](pacing-and-the-responsive-campaign.md)). The rest of the series is about what to put in front of a table. This one is about the sentences — how long they run, which verbs weaken them, how much description survives being heard once, and how the things in them get named. It is organised around the two registers this repo writes in and keeps them separate throughout, because a rule that improves one damages the other.*

*Not a decision document. Nothing here overrides the v4 bible, `ideas/story/bible/`, `design/campaign-arc.md`, or any open question in `data/campaign/open-questions.json`. Gaps are named plainly and left open. Naming the city, the Directorate, the Gap and the rest is Ingram's creative call, and a reference document does not get to fill those in.*

Claims are tagged: **[E]** empirical (tested, with the strength stated honestly), **[T]** theory (vocabulary, not proof), **[C]** craft (practitioner consensus, often righter than theory and never measured), **[Q]** contested. **Prose craft is overwhelmingly [C]**, and it is tagged that way rather than inflated.

---

## 1. The two registers, and the rule that separates them

**GM-facing instructional prose** is read by one person, mid-sentence, while six people wait — scene briefs, beat text, `lore.summary`, NPC briefs, schema descriptions. Its job is to be understood on one pass. **Evocative prose** is read or paraphrased aloud — `intro.readAloud`, `outro.readAloud`, `lore.playerFacing`, artefact bodies. Its job is to put one image in six heads.

**The hard standing rule governs the first: anything a GM reads while running a game must be plainly instructional. Full sentences. The instruction stated outright. Nothing that requires already knowing the scene to decode.** It came from a direct correction (2026-09-09) after a beat was written as *"Twelve walls, one shift, no supervision... The clock is the scene."* The named failure modes make a usable checklist: noun fragments with no verb; pronouns with no referent; instructions that omit the instruction (a beat that meant *ask for a Perception check* and never said so); designer theses posing as guidance; cleverness that reads as a joke. The accepted shape is **one actionable line per beat, detail peekable underneath** — in `data/scene-briefs/episode-c1s1--intake-medicals.json` the `the-queue` beat reads *"Go round the table once. Every player says one thing in character before anything else happens,"* with the reason in a separate `direction` field.

**The split is encoded in the data model, which is the strongest thing this repo does on the subject.** `data/schema/location.schema.json` divides `lore` into `summary`, `playerFacing` and `gmOnly`, and `summary`'s own description says it is "a GM-facing paragraph: what this place is, in plain instructional sentences." **Gap, stated and not resolved:** that description points at "design/gm-facing prose style" as if it were a file, and no file of that name exists in `design/`.

**One distinction the repo applies but has never written down:** telegraphic prose is fine in a document read in prep and wrong in one read at the table. `ideas/story/blank-inheritance-v4.md` §19's **Seeds, unremarked:** line — *"no approach vector; contact time-stamped before the alert"* — is two noun fragments, exactly the forbidden shape, and correct there because the bible is reread in an armchair. The variable is whether the reader can stop and think.

---

## 2. Show, don't tell — including when telling is correct

Followed literally, the rule produces bloated scenes. **[C]** The honest version: **dramatise what the audience must feel, summarise what they only need to know.** Showing costs table-time and buys emotional weight; telling costs almost nothing and buys information. Telling is correct for **transition**, for **compressing time**, and for **anything that is not the point of the scene**.

**The test: if you would be disappointed the table did not feel it, show it. If you would only be annoyed they did not know it, tell it.**

The repo runs the split cleanly. §18's timeline tells two hundred years in a table, because the party needs to know it and will never be in it. §19 gives each chapter one **Image:** line and shows only that — *"dawn, a Frame kneeling in the shallows, still holding the statue's bronze hand."*

`ideas/story/bible/locations/the-gnoll-statue.md` applies it at its sharpest by refusing both. The guard pose and the feral, lolling-tongued expression are described in full; whether the sculptor made the second dignified is never resolved, in narration or by an NPC, because Ingram's instruction is that the players decide. The entry states it as a prohibition: describe both with equal weight and stop.

---

## 3. Specificity, and the telling detail

**One precise noun beats three adjectives.** **[C]** A *weighbridge* does work "a large weighing machine for heavy goods" does not. Adjectives modify a thing the listener must first construct; a precise noun hands them the constructed thing.

**A telling detail is one concrete fact that implies a situation the writer never states.** **[C]** It works because audiences infer aggressively and enjoy it — the retrospective coherence [narrative-theory-foundations.md](narrative-theory-foundations.md) §8 describes. **Specificity also reads as authority** **[C]**: a writer who names the exact thing is read as someone who has been there, and that works just as well for invented material.

The repo's best examples are one clause long. *"Outside, it has started to rain on forty bicycles"* (`episode-c1s1--intake-medicals.json`, `outro.readAloud`) — the number carries the whole intake, and nobody is told how many candidates there are. A hand-lettered sign reading FORMS FIRST - NO EXCEPTIONS is taped over an older sign *in better handwriting* reading MEDICALS FIRST, and the whole institution is in the better handwriting.

**The rule: prefer the detail that permits an inference to the sentence that states the conclusion.** §19's Chapter One Founders note is the discipline in three sentences — *"The statue is Hyuck. Nobody says so. A plaque exists, if anyone looks."*

---

## 4. Description economy — the ceiling, and what goes under it

This is the most practically valuable section here, because the constraint is real and most writing advice ignores it.

**A description spoken aloud is heard once and cannot be reread.** Immediate-memory work puts the number of independent chunks a listener holds at around four rather than the popularly cited seven; Cowan's revision of Miller is the better-supported figure, and it comes from recall tasks, not from people listening to a GM. **[E, with that caveat]** The application to table narration is craft. **[C]** The direction of the finding is not in doubt.

**Hard working ceiling: three sentences for anything read aloud as a scene-opening description.** Three is not magic. It is the largest number that reliably survives being heard once by six people who are also looking at a map, a sheet, and each other.

**The structure that fits inside three sentences:**

1. **Where you are and what is happening.** Concrete, present tense, no adjective stack.
2. **One telling detail.** One precise noun or one specific number. Not three. One.
3. **The thing that is moving, or about to ask for a decision.** This sentence hands the scene back to the players.

**Describe through function and use, not appearance.** **[C]** *"A public weighing station for cart and handbarrow traffic moving goods through the quarter"* (`data/locations/the-weighbridge-450.json`) is one sentence with one adjective and the place is completely legible. The fourth adjective in a stack adds nothing and costs a slot.

Two checks against the repo, one of which breaks the ceiling and is right to. `episode-c1s1--intake-medicals.json`'s `outro.readAloud` is exactly three sentences and lands. Its `intro.readAloud` is seven sentences in four paragraphs, and works because of the technique worth extracting: **write above the ceiling only when the passage is built as separable units that can be dropped live.** Each paragraph is independently complete — the queue and the eleven minutes; the six of them; the man saying "other arm"; the two signs — so the GM can stop after any one.

`data/locations/deep-storage.json`'s `lore.playerFacing` runs five sentences and is also right, because it is not read-aloud text. The schema calls it "what a player would see/hear on arrival" — a reservoir the GM draws three sentences out of. **A `playerFacing` field is stock; a `readAloud` field is a performance.** The repo does not say this anywhere, and the two fields look similar enough that they will be written the same way by anyone who has not been told.

---

## 5. Sentence rhythm, because it is heard and not read

**Vary sentence length, and put the short sentence after the long ones.** **[C]** A run of same-length sentences flattens into noise regardless of content.

**Emphasis falls at the end of a sentence.** **[T/E]** This is end-focus from functional linguistics: English puts given information early and new information late, and sentences are processed faster when that order holds. The processing finding is solid; the leap to "hits harder" is craft. **[C]** **Put the word you want remembered last** — *"It is taped over an older sign, in better handwriting, that says MEDICALS FIRST."*

**Readability formulas correlate with comprehension but measure a symptom.** **[E, routinely overstated]** Shortening every sentence to improve a score does not improve comprehension, and the GM-facing rule says the opposite where they conflict: prefer a longer sentence readable once to a shorter one that must be read twice.

**Reading aloud is the only reliable test, and there is no substitute.** **[C]** Clauses that fight the breath, repeated sounds and accidental rhyme are invisible on the page and obvious in the mouth. §19's **Image:** lines are single sentences of clearly varied shape; the Founders note quoted in §3 is long-short-short.

---

## 6. Filtering, and the verbs that add distance

**A filter is a perception verb placed between the audience and the thing.** *She saw the door open.* The filter verbs are see, hear, notice, feel, watch, realise, seem, appear.

**Removing the filter moves the listener from the observer's position into the scene.** *The door opened.* **[C]** The effect is small per sentence and large across a passage, because filters accumulate into a report about someone perceiving things rather than things happening. **Default to cutting the filter in read-aloud text.** The repo already does: *"Somewhere ahead a man is saying 'other arm' over and over in exactly the same tone"* — not *you hear a man saying*. `deep-storage.json` writes *"the air runs cold and smells of oil and old paper"*, a property of the place rather than an act of smelling.

**Keep the filter when the act of perceiving is itself the event.** That exception matters more here than in most projects, because this campaign makes perception a mechanical act and a Perception check is a scene in which noticing is the whole content. `ideas/story/bible/characters/nozomi.md` is the clear case: the `overhear-the-search` check in `data/challenges/c1s1-the-medical.json` must stay a fragment even on a critical success, half-catching a name and a mismatched word. **Filter that deliberately, because the uncertainty of the perceiving is the information.**

---

## 7. Free indirect discourse, briefly

**Free indirect discourse is narration that takes a character's vocabulary and judgements without quotation and without a "he thought."** *He would sign the slip himself. It was quicker.* The second sentence is his opinion in the narrator's grammar. **[T]** The effect on perceived closeness is craft rather than measured. **[C]**

**The useful application here is institutional: a dossier or location entry can be written in the vocabulary of the organisation that produced it without claiming to be a quoted document.** That carries the institution's blind spots as texture a GM can hear, instead of a note saying "the Directorate is bureaucratic." `data/locations/the-time-office.json` does it lightly, reporting the works' own grievance in its own voice and attributing it to nobody: *"the argument about whose fault a late card is has been running for decades."*

**It is an opportunity here, not an established practice, and it collides with the standing GM-facing rule**, because attribution is exactly the decoding work that rule forbids at the table. **The safe division: use it in bible entries, dossiers and `gmOnly` text, which are read in prep. Keep it out of beat text and `readAloud`.** Speech craft proper is [dialogue-and-character-voice.md](dialogue-and-character-voice.md)'s subject.

---

## 8. The passive voice, honestly

**The passive voice is not a fault.** The blanket prohibition is the most repeated bad advice in English prose instruction, and largely repeated by people who cannot reliably identify a passive. **[Q]** The real finding is more interesting: passives are slower to process than actives **in isolation**, but the cost disappears — and can reverse — when the discourse context makes the patient the topic. **[E]** If the previous sentence was about the door, *the door was opened* is the easier sentence.

**Use the passive when the object matters more than the actor, when the actor is genuinely unknown, or when the actor is being deliberately removed.** The third case is the one that matters here.

**Institutional prose uses the passive to delete agents, and this campaign is about an institution that buried its own diagnosis. The passive voice is thematically load-bearing in this project, not a style error to correct.** `ideas/story/blank-inheritance-v4.md` §1 states the thesis: the Directorate "diagnosed itself as *children with guns*, buried the diagnosis, and became it," and its founding sin "is not cruelty. It is information suppression as a reflex." §2 records Aoi as "Filed by the Directorate as an unnamed casualty" — a sentence whose grammar performs the filing. `ideas/entries/redacted-document-chain.json` (status `accepted`) builds a whole progression on documents existing at several clearances, with redaction implemented as removal at generation time. Those documents are institutional prose and should read like it.

**The division to hold: the bible names the agent; the artefact removes him.** The v4 bible writes in the active about the suppression, tracing every secret to a named, frightened person. When a GM note and an in-world artefact describe the same event, the note says who and the artefact says that it was determined. Chapter One's single death is the test case: the bible says a man is killed by a Claimant moving an obstacle out of its way and names the cost precisely. The casualty list the party later reads is a list.

**Where the passive is a genuine fault: GM-facing instructional text.** "A Perception check should be called for" is worse than "Ask for a Perception check." In the instructional register, name the actor and put the verb early.

---

## 9. Clichés and the stock phrase

The usual rule says avoid clichés because they are unoriginal. **The more useful version: a stock phrase stops the listener from seeing anything.** **[C]** Familiar phrases are processed as single units and do not reconstruct into an image. There is modest neuroimaging support for novel figurative language recruiting more processing than conventionalised language, and conventionalisation happens fast. **[E/Q]** A cliché is not offensive, it is transparent.

**The test is not "have I heard this before." It is "does this produce an image."** *"The queue has not moved in eleven minutes"* is unremarkable phrasing and produces a very specific picture. **The category to watch hardest here is the genre stock phrase**, because a mecha campaign sits on forty years of them — the hangar bathed in red light, the knuckles white on the controls, the ominous silence before the alarm.

The repo's defence is written into `ideas/story/bible/locations/the-gnoll-statue.md`, which takes the most cliché-prone object available — a weathered monument with an unreadable plaque — and refuses every default. It is not hushed. Pigeons sit on it and kids climb it. The entry calls it "unremarkable civic furniture, not a hushed monument" and says so as an instruction, then forbids the next cliché in line: never over-explain who Hyuck was. `ideas/story/bible/locations/the-rock.md` does the same for a borrowed register, commissioning an "EVA vibe" for a classification aesthetic and scoping it immediately — the mundane carpark beside nine Frame-sized cells is tonal juxtaposition, not horror. **Scoping a borrowed register to exactly the thing it is borrowed for is what stops it becoming a stock atmosphere.**

---

## 10. Writing to be read aloud

**A GM will paraphrase anything they cannot say smoothly, and the paraphrase is what the table actually receives.** **[C]** Pronounceability is a functional requirement.

- **Keep clauses short enough to say in one breath.** Three nested subordinate clauses parse on the page and collapse in the mouth.
- **Avoid constructions that only work visually** — parentheses, stacked em-dash asides, semicolons doing structural work. A reader sees a parenthesis. A listener cannot.
- **Check for accidental sound collisions.** Repeated initial consonants and near-rhymes are invisible while writing.
- **Read it aloud before it ships.**

Shucks Mordant's instructions in `episode-c1s1--intake-medicals.json` set the standard — single words, *"Arm. Other arm. Look at the light, not at me."* His `voice` entry records the tic as a rule, so a GM can generate more live. **Give the GM a rule they can improvise from, not only lines they must deliver.**

**Gap, named and not resolved.** The six Frames are `Akatsuki`, `Hibari`, `Kurogane`, `Suzukaze`, `Tsukikage`, `Wakaba` (`data/characters/frames/`). Each is recorded with kanji and a literal gloss, which is good practice and not the issue. The issue is that four are four syllables, several carry clusters an English-speaking GM will stumble over under pressure, and **no short forms, callsigns or radio abbreviations are recorded anywhere.** A table will invent them in session one, and whatever it invents is what the campaign will use for eight chapters. Whether to author them is a creative call and is not made here.

---

## 11. Naming, part one: sound, and the system that holds it

**Sound carries connotation, and the effect is real and cross-cultural.** The bouba/kiki correspondence — rounded vowels and voiced continuants read as soft, sharp stops and high front vowels as angular — replicates across many languages and in pre-literate children. **[E]** **The leap from that to "this name sounds cold" is craft.** **[C]** Sound symbolism is a weak aggregate pressure, easily overwhelmed by what a listener already associates with a name.

**Consistency within a naming system matters more than the quality of any individual name.** **[C]** A perfect name belonging to no system reads as an intrusion; six ordinary names that plainly come from the same place read as a world.

**The v4 bible states its own doctrine outright in §2's opening paragraph, as a system rule with a stated reason:** *"Given names for the young and the outsiders, surnames for the institution — the Directorate's register is audibly colder than the school's. Mitflit names stay odd and English-whimsical."* That applies phonaesthetics at the level of name *class* rather than name *sound*, which survives any individual name changing. The sub-systems hold — the institution (ODA, NOBU, SHUCKS MORDANT, RUPIAH, UME, SATORU), the mitflits (ANABALA, BOBBIN, PIP, with §2 recording that Bobbin is "named like a tool, because that is what he was made into"), and the PCs: surname-plus-given-name for the kids, single Japanese common nouns with kanji and gloss for the Frames — Akatsuki (暁, "Daybreak"), Hibari (雲雀, "Skylark"), Kurogane (黒鉄, "Black Iron"), Suzukaze (涼風, "Cool Breeze"), Tsukikage (月影, "Moon-shadow"), Wakaba (若葉, "Young Leaf").

**Grounding in real language costs research and buys checkability. Inventing costs nothing and buys nothing verifiable.** **[C]** In a setting derived from a real place, inventing carries a specific hazard: a fabricated Japanese-looking name that is not a real word reads as wrong to anyone who speaks the language, cannot be checked, and cannot be given a meaning without inventing that too. **This repo has chosen the grounded path and should keep choosing it.** §2 glosses names as it introduces them: UME is the plum blossom, "the flower that opens in winter before anything else"; KIRI is a stage name meaning "mist"; SHINOBU is "to endure, and also to hide. Both meanings apply."

**One observable pattern break, flagged and not resolved.** Five of six Frame names are nature, weather or light words; `Kurogane` ("Black Iron") is a materials word. No file records whether the break is deliberate. Japanese naming specifics belong to [japanese-narrative-conventions.md](japanese-narrative-conventions.md).

---

## 12. Naming, part two: distinctiveness at the table

**This is the constraint almost all naming advice ignores, and the one that bites every session.** Names in a TTRPG are transmitted by voice, held across weeks, and recalled under social pressure by people also tracking a fight. The relevant finding is the **phonological similarity effect**: items that sound alike are markedly harder to hold and recall in sequence, and the effect is driven by sound rather than meaning. **[E]** It is robust and old. Applying it to NPC names is craft. **[C]**

**The rule: two names in simultaneous play must differ in their first stressed syllable, not merely their first letter.** *Kaneda* and *Kimura* share a letter and not a syllable, which is survivable. *Nobu* and *Nozomi* share both, which is not. **A second, cheaper rule: vary the shape** — two syllables against four, consonant-final against vowel-final.

**Checked against the cast as written** (`ideas/story/blank-inheritance-v4.md` §2 plus `data/characters/kids/`), this is a real finding rather than a hypothetical:

- **Three N names.** NOBU (Quartermaster), NOZOMI (Missing Pilot), NAO (Classmate). Nobu and Nozomi share their first syllable and do not sit far apart in play — Nobu runs Kit Issue in Session One and chairs the Sizing Board in Session Two, and a fragment of Nozomi surfaces on a Perception check in that same Session One scene. **This is the collision most likely to cost real table confusion, and it will do it in the first session.**
- **Four S names.** SATORU, SHUCKS MORDANT, SHINOBU KUDO, plus the PC Sato Hiroshi. Shucks and Shinobu share an initial cluster and are linked in the fiction, so those names will appear in one conversation.
- **Four K names.** KIRI, KUDO, plus the PCs Kaneda Masaru and Kimura Etsuko, who are in every scene together for eight chapters.
- **One sound pair on one thread.** DOCTOR RIKA and KIRI, both two syllables built from /ri/ and /ki/.

**None of that is a defect to be fixed here, and no replacement names are proposed.** Renaming is Ingram's call, several of these names carry meanings chosen for the character, and inventing lore names is forbidden by standing repo rule. It is recorded because it is checkable, invisible on the page and audible at the table — and because the repo has already made exactly this correction once. `ideas/story/bible/characters/nozomi.md` records that she was called "Kai" in early drafts and that **the name is now banned campaign-wide**, with the ban written into the file rather than left to memory. The Frames pass cleanly, and so do the kids' given names; the collisions are all in surnames and the adult cast.

**One break that breaks for a reason, which is the standard to hold.** `data/characters/kids/kaneda-masaru.json` records the name as *"Kaneda Masaru (Yoon Jae-won, 윤재원, privately)"* — a tsūmei used at school and at the Directorate, with a different name on his family's records. The break *is* the character: his concept field says nobody at school knows both halves of him and he has strong opinions about who gets to. **A name that breaks the pattern should break it for a reason, and the reason should be recorded in the file.**

---

## 13. Naming, part three: institutions, designations, and the tracked placeholder

**A naming convention is evidence about the organisation that made it, and players read it as such without being told to.** **[C]** What an institution names, what it merely numbers, and what it refuses to name are all legible.

**This repo has built a large, consistent institutional system, and it says something specific.** `data/locations/` holds 207 entries, overwhelmingly plain English function names, most carrying a building number: `the-weighbridge-450`, `the-water-office-454`, `the-tool-store-455`, `no-1-machine-shop`, `the-goods-office`, `the-time-office`, `deep-storage`. Housing is numbered twice over — `walled-house-no-1-422`, `instructors-row-no-1-394` carry both a position in a row and a building number. **Almost nothing on that island is named after a person.** The inference is exact: this organisation registers its buildings and does not commemorate them. It sits against the one civic monument the city has — a bronze gnoll in the harbour square with a plaque worn past reading, which nobody explains.

**Codenames are where naming does plot work.** §2 lists both names for the antagonist: **The Watcher**, "what the frightened city calls it," and **The Observer**, "what the mitflits call it. Plain, benign, technical. A job title, not a malevolence." The bible then states the consequence outright: *"The gap between these two words is the misunderstanding, and should function as an in-fiction clue."*

**The discipline of the tracked placeholder is the last thing here and the one most worth naming as good practice.** **[C]** Under deadline the pressure to invent a name and move on is enormous, and an invented name hardens fast — referenced once, into a second file, and within a week nobody can tell whether it was decided or defaulted. **The alternative is to leave the name unresolved and record that it is unresolved, where a later reader will find it.** This repo does that at three levels:

- **A dedicated register.** `data/campaign/naming-placeholders.json` holds eight entries — the Directorate's real name, the city, the Gap, the twelve PCs, the Watcher's working name, the dig site, the excavated spaceship, the school — each with `"finalName": null` and a description. The school entry carries a real working note: the campus and the civil-defence facility are one island but deliberately *not* co-sited, so a single name may still be wrong.
- **A repo-wide convention that `null` means "not yet decided," not "empty."** Unresolved fields carry a `namingPlaceholderRef` or `openQuestionRef` pointing at the tracked entry, so a reader who finds a hole also finds the reason for it. `data/schema/location.schema.json` carries `namingPlaceholderRef` as a first-class nullable field beside `name` and `nameJa`.
- **Working NPC stubs that are unnamed and still usable.** `data/npcs/registry-clerk.json` and `data/npcs/time-office-clerk.json` carry `"name": null` and `"status": "placeholder — not yet named or cast"`, plus a full `role` string. The six repair-crew chiefs (`data/npcs/repair-chief-*.json`) are the same, with Ingram's framing quoted in the file: "six lesser NPCs who may grow into bigger more interesting roles later."

**The reason this works is that a function name is already a usable table handle.** A GM can run "the Registry Clerk" and "the Goods Inwards Officer" for a whole session with no personal names, and the table will follow both perfectly. **An unnamed thing with a usable role name is not a gap. An invented name nobody ever decided on is.**

**The rule: when a name is not yet decided, record that it is not decided, give the thing a function name that can be spoken at a table, and stop. Do not invent under pressure, and do not silently re-guess a name that was already left open.**

---

*Related within this reference series: [narrative-theory-foundations.md](narrative-theory-foundations.md) §8 (retrospective coherence — why §3's telling detail works), [dialogue-and-character-voice.md](dialogue-and-character-voice.md) (speech craft, left out of §7 and §10), [environmental-storytelling-and-place.md](environmental-storytelling-and-place.md) (what to describe about a place, where this covers how the sentences work), [japanese-narrative-conventions.md](japanese-narrative-conventions.md) (name order and honorifics, which §11 defers), [worldbuilding-craft.md](worldbuilding-craft.md), [mystery-and-investigation-design.md](mystery-and-investigation-design.md), [science-fiction-and-mecha-conventions.md](science-fiction-and-mecha-conventions.md) (the genre stock phrases §9 warns about), [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md).*

*Related in this project: `data/campaign/naming-placeholders.json` (§13); `data/schema/location.schema.json` (§1's two registers, and the dangling "design/gm-facing prose style" pointer); `data/scene-briefs/episode-c1s1--intake-medicals.json` (the worked example in §1, §3, §4, §5, §6 and §10); `ideas/story/blank-inheritance-v4.md` §1, §2 (Cast), §6 and §24 (Register Notes), §19; `ideas/story/bible/README.md`; `ideas/story/bible/locations/the-gnoll-statue.md` and `the-rock.md`; `ideas/story/bible/characters/nozomi.md`, `nobu.md`, `taka.md`, `shucks-mordant.md`; `data/characters/kids/kaneda-masaru.json` (§12's pattern break); `data/locations/` (§13); `ideas/entries/redacted-document-chain.json` (§8); `design/objectives.md`.*
