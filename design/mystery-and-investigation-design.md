# Mystery and Investigation Design

*Written 2026-09-13. One of eleven reference documents added to the narrative-craft library that began with the original five (see [narrative-theory-foundations.md](narrative-theory-foundations.md) for the series introduction). This one covers investigative play: how clues are found, how they are understood, how a table stalls or floods, and how a mystery is designed when different players permanently own different parts of it. It extends rather than repeats [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3 — that section handles redundancy of delivery, this one handles what happens after delivery succeeds. Not a decision document: nothing here overrides `ideas/story/blank-inheritance-v4.md`, `design/campaign-arc.md`, or `data/campaign/open-questions.json`. Gaps are named and left open.*

*Claims are tagged: **[E]** empirical, **[T]** theory (a named framework — vocabulary, not proof), **[C]** craft (practitioner consensus, often righter than theory and never measured), **[Q]** contested. Most of what follows is **[C]**.*

---

## 1. The GUMSHOE insight: failing to find a clue is never the interesting failure

Robin Laws's argument, made concrete in GUMSHOE (2007). **[C]** In a mystery the enjoyable work is *interpretation* — what a fact means, which account to believe, what to do next. *Acquisition* — rolling to see whether your character noticed the thing the scene was built around — produces nothing when it succeeds and stops the game when it fails. So core clues are delivered on reasonable action, and rolls buy extra benefit: an earlier warning, a better read, an advantage later. The counter-argument is real: for some tables the uncertainty of acquisition *is* the tension, and removing the find-roll makes investigation feel like a corridor of doors that all open. **[Q]** That is a question about where tension should live, and the answer is not to restore the find-roll but to make something else uncertain — what the clue costs, who else learns you have it, how long it stays useful.

**The rule: a clue the plot depends on is delivered on reasonable action; a roll decides how much more than the core clue you get.**

`design/encyclopaedia-checks.md` already implements this in SF2E's vocabulary — optional insight checks, always offered, with the rule that *"failure never costs anything mechanical."* The insight check is the extra; the core clue must not sit behind it. It goes further in the right direction by treating a wrong-but-plausible belief on a bad roll as acceptable, which turns a failed acquisition into interpretive material. The boundary is not marked anywhere: nothing in a scene brief distinguishes a check that hands out a core clue from one that hands out an extra.

## 2. Information is not understanding, and they fail differently

This is the spine. A table can hold every relevant fact and still not have the picture. Those are two failure states, they look alike, and their fixes are opposed. **[C]** **Missing information** is the party not having a fact; it is solved by more routes to the same fact, which is what the Three Clue Rule is for ([ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3). **Missing understanding** is the party having every fact and not connecting them; more routes do nothing, because supply is not the problem. It is solved by **juxtaposition** (two known facts placed together in one scene), **contradiction** (an account that cannot be true alongside one they hold), and **time** (a fact must sit before a later fact can recontextualise it). Telling them apart takes one question: ask the party to say aloud what they currently believe. If they cannot state a fact they were given, that is an information failure. If they state the facts accurately and draw no conclusion, that is a comprehension failure, and another clue makes it worse by enlarging a pile they already cannot read.

**The rule: diagnose which of the two failures you have before adding anything, because the fix for one worsens the other.** The cheapest fix for the second costs nothing to prepare: an NPC states two facts the party already holds in one sentence and draws no conclusion from them.

The campaign names this from the other direction. **Known Risk #2** (v4 §22) — *"if a chapter's beats stop landing as connected, the mystery reads as noise rather than a converging picture"* — is a comprehension failure, not a supply failure. Two existing pieces of machinery measure comprehension rather than supply: `design/objectives.md`'s log rule, *"an entry is added when the party LEARNS something, not when something happens,"* and `design/harvest-inference.md`'s rule that *"confidence tier travels with the entry."* The gap: `design/objectives.md` §5's **"Might go"** column computes *what have I stopped feeding?* Nothing answers *what have they been given and not used?*

## 3. Six kinds of clue, and why they do not behave alike

Treating "clue" as one category produces investigations that deliver at a uniform rate and land at a uniform pitch. These six behave differently enough to be budgeted separately. **[C]**

- **Physical evidence** exists independently of anyone's account of it, can be revisited, and requires trusting nobody. Cicada's stencils are the model: *"always at head height, always on a wall people stand in front of."*
- **Testimony** is inseparable from what the speaker wants, which makes it the richest type and the least reliable, and the unreliability is content. The v4 bible §13 makes it the campaign's method — the conference *"is reconstructed... through contradictory testimony."*
- **Absence** is something that should be there and is not. It is the hardest to deliver, because a gap cannot be noticed without a prior expectation of what fills it: the last sample of Inert 12 was *"never reported missing because it wasn't interesting enough to report."*
- **Anomaly** is something present that should not be, and it generates curiosity on its own and immediately — which is why v4 §16's principle, *"give them the anomaly before the question,"* governs the Observed and Cult threads above all. This is the structure [narrative-theory-foundations.md](narrative-theory-foundations.md) §4 calls curiosity-as-retrospection, and Chapter Two's graffiti *"dated the night before the strike"* is the clean instance.
- **Pattern** is visible only across instances and worth nothing before its threshold. The heist loop is the textbook case — *"nobody has ever laid the two columns of dates side by side"* — and the dossier drift is the other, requiring that *"the drift must be gradual enough that nobody spots the pattern until it is already personal."*
- **Corroboration** adds no information and changes the status of information already held, which makes it the type most often skipped in prep and the one that most reliably turns a theory into a working belief. Chapter Four is built on it: a second witness with no credibility describing the same thing unprompted, and an old photograph.

**The rule: budget the six separately, and never let a pattern clue be the only route to a conclusion, because it delivers nothing until its last instance lands.**

## 4. Red herrings, honestly assessed, and the safer substitute

A deliberate false lead is standard equipment in detective fiction and substantially riskier at a table. **[C]** A novel's reader spends twenty minutes on a red herring and turns the page; a table spends four hours, two players' spotlight time and a session's momentum, then discovers the session was designed to be wasted. The cost is not the wrong conclusion — it is the retrospective discovery that the GM built it that way. The substitute carries most of the benefit and little of the risk: **the true-but-misleading clue**, accurate information whose obvious reading is wrong and stays wrong only until more true information arrives. Nothing is planted false, the party is never lied to, and the correction extends the earlier work rather than invalidating it.

**The rule: do not plant falsehoods. Plant true facts whose obvious reading is incomplete, and make sure the completing fact is reachable.**

This campaign runs almost entirely on the substitute, which is a structural strength worth protecting. The party meets Cicada's non-resisting public wing first and generalises; `ideas/story/dossier-cicada.md` §12 states the intent outright — *"believers don't resist, contractors do. This is true and incomplete"* — and the correction *"recontextualise[s] what Chapter One taught them, rather than contradict it."* The Claimants' anomalies are the same technique at campaign scale, tabulated row by row in `ideas/story/dossier-observer.md` §10: every observation accurate, and the obvious reading of each wrong.

## 5. Fair play: a genre contract, and the test that operationalises it

Ronald Knox's decalogue (1929) and S. S. Van Dine's twenty rules (1928) are usually quoted as rules and are better read as a historical contract between a genre and its audience. **[C]** The specific prohibitions are period-bound and several are bad advice now; what survives is the contract underneath. **The audience must have been able to solve it** — the clues exist before the reveal, and they exist in the audience's hands. The tabletop translation is one requirement: a reveal must be reconstructible backwards from clues the party actually had access to, not clues in the GM's notes and not clues in a room they never entered.

**The practical test, applied after every reveal: name the three specific things the party saw that pointed at this. If you cannot name three, the reveal was not fair, and it does not become fair by being well delivered.** This is the Three Clue Rule checked from the far end — that rule audits supply before play, this audits receipt afterwards.

Two existing documents are already fair-play ledgers in the right shape: `ideas/story/dossier-observer.md` §10, which maps each seeded observation to its real cause one row at a time, and `ideas/story/dossier-cicada.md` §11, an availability ledger by chapter. The v4 bible §16 states the contract in the campaign's own words: *"every unexplained detail seeded early should be a fact a sharp table can reassemble later, never a thing withheld and then announced."* **Where the ledgers do not reach** is the operator half of the central reveal — that the cloud has Manako's personality rather than one of its own. [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3 audits the mechanism thread and finds well past three routes; the operator half rests on reading the Watcher's behaviour backwards, which is an interpretation rather than a clue.

## 6. Player knowledge and character knowledge

The gap between what a player has worked out and what their character could know is real, and policing it is usually a mistake. **[C/Q]** The deduction is the reward, so a player who assembles the picture and is told their character does not have it has been punished for the activity the mystery exists to produce. Enforcement is not possible anyway — what it produces is players performing an ignorance they do not have. And the table is one comprehending unit: six people build one theory in conversation, and partitioning that theory by character is bookkeeping nobody enjoys. The distinction worth keeping is between information a player should not *hold* and conclusions a player should not *state*; the first is a real design concern, the second is not worth managing.

**The rule: never restrict what a player may conclude from what they were shown. Restrict only what they are shown.**

This project draws the line correctly already. `design/objectives.md` §3's Law 11 treatment — *"a private objective is ABSENT from other clients, not hidden on them"* — enforces the first kind at the point of delivery rather than the point of behaviour. `design/npc-social-intel.md` §4 proposes that a revealed Fact is party-wide by default — the second kind, correctly declined, and flagged there as still open.

## 7. Three pacing failures, and how to recognise each while it happens

**The stall — no leads.** *Recognition rule: two consecutive player proposals are both some form of "go and ask someone else," or somebody asks aloud what they are supposed to be doing.* The second is unmistakable and arrives too late; the first is the early warning. [quests-objectives-and-threads.md](quests-objectives-and-threads.md) §6 names the adjacent trap, the breadcrumb chain, and the stall is what happens when even the breadcrumb runs out. The fix is not to hand over the answer but to have something arrive with its own want — an NPC comes to them, a consequence lands, the Directorate requires something. **[C]**

**The flood — too many leads at once.** More common than the stall in a six-thread campaign and much less often diagnosed, because the table looks busy. *Recognition rule: the party writes things down and does not refer to them again, or three new lines open in a session and none of the existing ones advance.* The fix is to let one node answer another rather than opening a seventh line.

**The held reveal — they have solved it and the GM keeps withholding.** The worst of the three and the least discussed, because from behind the screen it does not look like a failure. *Recognition rule: the party states the correct conclusion aloud and the fiction does not respond.* Once is a coincidence; twice teaches the table that thinking changes nothing, which is the most expensive lesson a mystery campaign can teach.

**The rule: when the party says the true thing out loud, the fiction answers it in the same session. Never hold a reveal that has already been reached.** The campaign states this for one case already — *"show it to them. Dread is fine; ambush is not"* (v4 §15, on the Mass Clock) — and it holds for every reveal, not only that one.

## 8. Designing for the table that gets there early

Smart players out-run planned reveals, and a six-player table is six chances a session for somebody to say the true thing four chapters ahead of schedule. [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3 raises this for one clue — the pre-dated graffiti, where a sharp table could reach *"the Cult can predict or is coordinated with the attacks"* in session three. The general version is worth preparing for deliberately, and the preparation is cheap. **For each major reveal, write one line answering: if they say it out loud in session three, what is still true, what is still unknown, and what becomes available?** Three clauses, a minute per reveal, and it converts the GM's worst live moment into a normal one. **[C]**

**The rule: an early correct conclusion is a reward. Confirm it, and spend the session on the next question up rather than on defending the schedule.**

The campaign has the instinct and half the machinery. The **Bifurcation Points table** (v4 §20) prepares downstream consequences for seven forks, and every one is a *choice* — find Nozomi, turn Nao in, break the sit-in, feed the stray. **There is no equivalent table for early conclusions**, which are at least as likely and harder to improvise around. The **Escalation Curve's hard gate** (§15) protects the antagonist's capability schedule and says nothing about the party's comprehension schedule. Named, not resolved.

## 9. The conspiracy board: when the wrong theory is better than the answer

Groups build elaborate theories, and the elaborate theory is frequently better than the real answer for a while — more dramatic, more connected, more satisfying. [narrative-theory-foundations.md](narrative-theory-foundations.md) §8 covers the mechanism: audiences construct causal coherence the material did not contain, readily and enthusiastically. **[T]** The wrong theory is better partly because it is *theirs*, assembled at the table by people arguing, and that authorship gap does not close by the real answer being good. Four moves, in order of use. **Do not confirm** — a nod or a conveniently agreeing NPC reads as confirmation and costs more later than it saves. **Do not crush** — telling a table their theory is wrong ends the theorising, which is the activity the campaign is made of. **Feed the next true fact**, which is the whole move, since a theory corrects itself against evidence provided evidence keeps arriving. **Let the wrong theory produce real behaviour with real consequences**, so the world responds coherently to what they actually did.

**The rule: do not confirm and do not deny. Deliver the next true fact and let the theory meet it.**

Stealing from the board is allowed where the invention is compatible and not yet contradicted, with one narrow constraint: the thesis (v4 §1, *"nobody in this campaign has ever done anything evil"*) is load-bearing and not available for revision to match a better guess. The campaign builds a conspiracy-board generator on purpose — the lens's hidden +0 to +8, with `ideas/story/dossier-observer.md` §16's standing instruction: *"Never confirm the lens modifier, the Mirror's lean, or the Mass Clock's exact position. The party reconstructs all three."* The Sceptics (v4 §12) are the demonstration from the other side: a correct theory with no corroboration is indistinguishable from a crank one.

## 10. Divided labour: permanent investigative lenses

Most investigations are designed for one undifferentiated party. A design that gives different players permanent, different lenses on the same mystery is divided-labour design. **[C]**

Four properties make it work: **permanent ownership**, because pattern recognition requires the same person seeing instance one and instance three; **non-overlapping evidence domains**; **a spread of clue types**, so the lenses do not all pay off at once; and **convergence rather than duplication** — one operation seen from several jobs.

Three costs. **Single points of failure** — permanent ownership and the Three Clue Rule pull against each other by construction, and the resolution is that **each lens should own a distinct route to a shared conclusion, not sole access to a conclusion.** **Rotation contradicts permanence** — a design that also rotates players between roles loses the same-person pattern recognition that made the lenses worth having. **Comprehension gets harder** — several people each holding a fraction of the picture makes §2's failure the default state, so **a scene in which the lenses report to each other is a requirement of this design, not a nicety.**

*(Cut 2026-09-20: the five ground roles, this campaign's worked example of the pattern. Removed from this document 2026-09-25.)*

## 11. The topic list, and tracking what was never asked

The Signals Liaison entry in v4 §13 (a ground role, since cut) carried a mechanism worth keeping on its own:

> **Foundry implementation:** each NPC carries a numbered topic list; when the players raise a subject, the GM ticks it and delivers that version. Ticked topics are recorded automatically and inform later sessions — including, usefully, what the party has never thought to ask.

The first half is a dialogue tool. The second half is a comprehension instrument. Nearly every investigative aid built for tabletop tracks what the party **has** — clue lists, evidence boards, journals, the objectives log. This tracks the **negative space**, which is the only direct evidence available about what the party has not understood. A topic nobody has raised across six sessions with four different NPCs is not an oversight to correct; it is a measurement of where the picture has a hole. **[C]**

**The rule: an unticked topic is data. Read the negative space before adding new clues, because it identifies which of §2's two failures you actually have.**

`design/objectives.md` §5's **"Up next"** column, computed as authored learnables minus logged ones, is the same idea one grain coarser, and its **"Might go"** dormancy detection is the same idea at arc level; the topic list is the finest grain and the only one measuring the party's curiosity rather than the GM's coverage. **The gap: it has no data home.** `data/schema/npc.schema.json`'s `socialProfile` carries `attitude` and a `facts` array with reveal triggers. A Fact is something the GM decides the party may learn; a topic is something the party decides to raise. There is no field for the second, no tick record, and nowhere for the never-asked list to live.

## 12. The specific problem of a mystery with no culprit

The genre trains an audience to look for a guilty party, and this campaign's thesis is that there is not one (v4 §1). A table conditioned by the genre treats the absence of a culprit as evidence the real one is undiscovered, and the propulsion an accusation would have provided disappears with it. **[C]**

**The rule: when the answer is a mechanism rather than a culprit, the mechanism must be satisfying on its own, because the moment of accusation never arrives to do that work.**

The campaign's answer is built and is the right one. `ideas/story/dossier-observer.md` §8's account of the Envoy — a body built to be polite in, shot at once, and a sensor system learning from the most consistent signal it had ever received — is a complete causal explanation that indicts nobody, and it converts from explanation into fact through one piece of testimony: Hori, the officer who fired, whom the party meets *"when they are ready to learn a great deal about the inciting incident"* (`ideas/story/bible/LEDGER.md` #31). A party that will not accept "no villain" will accept an eyewitness to the afternoon it happened.

---

*Related within this reference series: [ttrpg-campaign-and-session-craft.md](ttrpg-campaign-and-session-craft.md) §3 (the Three Clue Rule and its inversion — upstream of §2, §5 and §8) and §7 (secrets-and-clues prep); [narrative-theory-foundations.md](narrative-theory-foundations.md) §4 (curiosity as retrospection, which §3's anomaly clue is built on) and §8 (retrospective coherence, the mechanism behind §9); [quests-objectives-and-threads.md](quests-objectives-and-threads.md) §6 (the breadcrumb chain) and §7 (the learnable-count rule); [agency-and-player-choice.md](agency-and-player-choice.md) §6 (storylets); [pacing-and-the-responsive-campaign.md](pacing-and-the-responsive-campaign.md) §1 (responsiveness levels, which govern §7's held-reveal fix); [dialogue-and-character-voice.md](dialogue-and-character-voice.md) (testimony); [environmental-storytelling-and-place.md](environmental-storytelling-and-place.md) (physical evidence and absence, delivered through place); [mechanics-as-meaning.md](mechanics-as-meaning.md) (why removing the find-roll is itself a statement about the game).*

*Related in this project: `ideas/story/blank-inheritance-v4.md` §1, §12, §13, §15, §16–17, §19, §20, §22; `ideas/story/dossier-observer.md` §8, §10, §15, §16; `ideas/story/bible/LEDGER.md` #31; `ideas/story/dossier-cicada.md` §2, §7, §8, §11, §12; `design/encyclopaedia-checks.md`; `design/objectives.md` §4–§5; `design/harvest-inference.md`; `design/npc-social-intel.md` §4, §6; `data/schema/npc.schema.json`.*
