# The Sign-Off

*Written 2026-09-22, from Ingram's brief. The last gate before a scene is run: a conversation, one
scene at a time, that ends with the material being ready for actual players to enjoy. Ingram's own
words for the grade — "it's done."*

Her brief, quoted because three sentences in it decide the design:

> "I need you to design a process that we will use to give scenes a final seal of approval which is
> required to be done before we run anything live. This is a process between you and me, a back and
> forth discussion and analysis... **you need to be incisive and decisive about each scene, what
> might improve the scene and when understand when the job is done.**"

> "If you have to change our review and grading process now is the time to rethink it from the
> ground up... **this is meant to be the final assessment before we stop tinkering. We also have to
> imagine the process itself changing and growing more complex as we learn about failure states we
> hadn't thought of** or come across quality control problems."

> "The Gazetteer allows me to place buildings and define them. That should also be a requirement for
> every single scene... **if it doesn't have a location then it's not finished yet.** You have full
> permission to find a suitable building, but you need to show me a screenshot of its location with
> context so that I can see it and help decide if it's the right call."

Three things follow, and the rest of this document is the consequences: the process needs a
**terminator**, it needs to be **versioned**, and **Place is a pass, not a bullet point**.

---

## 1. The finding the design is built on

Every grading mechanism this project has built works, and none of them has graded anything.

| Store | Items | Ever promoted |
|---|---|---|
| `data/locations/` | 232 | **0** |
| `data/npcs/` | 43 | **0** |
| `data/challenges/` | 24 | **0** |
| `data/episodes/` scenes | 26 | **0** |
| everything else in `data/` | ~30 | **0** |

`design/approvals-desk.md` diagnosed this once already, for the gazetteer's dead review mode, and
built the fix: play-sequence intake, a guarded `promote()`, keyboard grading, `sound`/`final`. All of
it exists and is tested. The count is still zero.

So the diagnosis was incomplete. The Desk's model is **one item, one read, one keystroke** — and that
is the right model for a shed nobody will visit. It is the wrong model for the only content that
actually matters, because **nobody can grade an NPC in isolation.** Reading Nobu's brief cold answers
nothing. Reading Nobu *in the fifteen minutes of Kit Issue, in the scene where the table meets him*,
answers everything, and answers it for his location and his challenge at the same time.

That gives the Sign-Off its scope, and it is a genuine improvement rather than a parallel system:

> **The scene is the unit of review, because the scene is the unit of play.** A scene cleared here
> carries everything it casts with it. Twenty-six conversations clear the whole 281-item backlog,
> and each one is a conversation worth having.

The Desk keeps its job — the fast queue, the bulk, anything that never appears in a scene. This is
the deep pass for the things that do. `module/blank-inheritance/scripts/core/play-sequence.mjs`
already groups the corpus into per-scene "shifts" for exactly this reason; the Sign-Off is what
happens inside one shift.

---

## 2. Where the record lives, and why not on the brief

A scene's status already lives on the episode's own scene entry — `episode.scenes[].authoring` —
because that is what `play-sequence.mjs` grades and what `episode.schema.json`'s own comment says it
is for: *"a scene is the unit the Approvals Desk actually grades, since it's the unit the table
actually sits down to."*

The Sign-Off record goes there too, and **not** on the scene brief, for one reason: a second home for
the same fact is the failure mode this repo is already in a standing crisis about. Two copies of a
scene's status would drift, and `design/data-ownership.md` exists because that exact thing nearly
happened with `authoring.status` in September. So:

- **`data/episodes/<id>.json` → `scenes[].authoring`** — status, and the `review` block: the four
  pass verdicts, the checklist version, the waivers, who sealed it and when.
- **`data/scene-briefs/<id>.json`** — the content. No status field at all. Nothing to drift.
- **`data/campaign/scene-set.json` → `locationRef`** — the scene's link to the world map. Already
  there, already read by `play-sequence.mjs`, so Place needs no new field either.

**No new storage bin. No new vocabulary.** One new enum value, and one new block on a shape that
already existed.

---

## 3. One rung, and it is called `live`

Ingram was asked whether "live grade" meant the ladder's `final`, and answered: *"I mean the material
is ready for actual players to enjoy. It's done."*

So a scene has one destination, `live`, and it means exactly that sentence. The existing
`sound`/`final` split is right for the Desk and wrong here: it separates *the substance is right*
from *the words are right*, which is a real distinction for a location blurb nobody reads out, and
no distinction at all for a runnable scene. Running a scene needs both. Splitting it would create
a rung that is never the answer.

| Status | Means | Grants |
|---|---|---|
| `drafted` | Written. Unread. | Nothing. Not citable, not syncable, not player-visible. |
| `live` | All four passes cleared, Ingram sealed it. | **Run it at the table as written.** |
| `cut` | Read and killed. A decision, not a failure. | — |

`sound` and `final` stay in the enum for every other entity type. A scene is simply never promoted to
them.

### Who may write it

`authoring.status: "live"` and the `review` block have exactly one legal writer:
`tools/scene-signoff/seal.mjs`, through `seal()` in `core/promote.mjs`. This is declared in
`data/schema/common/authoring.schema.json`'s owner `$comment` and enforced by
`test/tier1-writer-audit.test.mjs`, the same canary that guards the Desk's own values.
`assertNotPromotedStatus()` now refuses `live` alongside `sound` and `final`, so no generator, sync
path or bulk edit can emit it.

**Enforcement by construction, not by discipline.** `seal()` refuses any scene whose record does not
show all four passes `CLEAR`. The record is written one pass at a time, as the conversation happens.
So "I sealed a scene we never actually talked about" is not a thing I can do, and Ingram does not have
to trust that I didn't — the same principle the Desk applies to a queue, applied to a conversation.

---

## 3b. Ask the question, not the check id

A correction from Ingram, 2026-09-22, and it is a process failure rather than a phrasing one. The
first dry run ended: *"that's the Place pass artefact, and P3 is the one check I can't clear."* Her
reply:

> *"Saying 'that's the Place pass artefact, and P3 is the one check I can't clear' leaves out the bit
> of the sentence where I find out what you are asking me to help you clear..."*

A review that names a check id and stops has done all the work and delivered none of it. So:

> **Every check that needs Ingram is stated as a plain question naming the specific thing being
> asked — never as a check id, never as "this needs your input".** The report has a dedicated
> section for them, near the top, and it is the first thing written. If there is nothing to ask, it
> says so explicitly rather than sitting empty.

"Is the Candidate Gate the right building for The Road In — the guard booth on the landward side of
the causeway?" is a question. "P3 is unresolved" is a status.

**Extended the same day, after the first report's asks were still too thin.** Ingram: *"you need to
give me full context for decisions you want me to make, it's still a bit confusing what question 1 is
asking me to decide/confirm."* Naming the thing was necessary and not sufficient. So every ask now
carries four parts, and `scene-review.schema.json` **refuses one that does not**:

| Part | Is |
|---|---|
| `question` | The decision, answerable without reading anything below it. |
| `current` | What is true right now — the state of the data, the lore, the map. |
| `options` | At least two, each with what choosing it commits to, costs and forecloses. |
| `recommendation` | Which one I would take, and why. |

Two options is the minimum because **a question with one option is a request for permission**, and
should be phrased as one. And stating a recommendation is not pre-empting the decision — it is the
difference between handing over a question and handing over homework.

---

## 3c. A long-horizon payoff is suspect until it has been reviewed

The most expensive finding of the first two dry runs, and it is a standing rule rather than a check's
footnote. Ingram, 2026-09-22:

> *"You need to treat any very long term consequences or payoffs as potentially suspect until it's
> been part of an actual review itself."*

What provoked it: The Road In's Frame sighting seeded Mystery Ledger #11, *"A Frame moves more gently
than ordered"*, off a **Gen 1** utility mech whose critical success showed it *"moving carefully."*
Both halves were wrong. Gen 1 Frames are clanky, horrible-to-drive rust buckets — century-and-a-half-
old crude human reconstructions from a single bisected fragment. The grace in #11 is the **Gen 2**
tell, and it comes from hyper-advanced Mitflit biotechnology; almost nobody has ever seen a Gen 2
operated.

**That plant survived three drafts and two audits, and my own Quality pass called its reveal timing
"right, and the thing I checked hardest."** It did so by reading a reference number instead of a
source. A `mystery-ledger-11` in a file looks exactly like evidence that somebody once thought about
Ledger #11, and it is not.

So **M27, required**: every long-horizon payoff a scene claims must be verified against its own source
dossier *in the current review*, naming the document and the section. An inherited plant carries no
credit. A reference number is not a reason.

The fix that followed is also the general shape: Ingram's instruction was *"change what is learnt"*,
not soften it. The critical success now buys the **baseline** — you can see the pilot correcting every
movement — because you cannot notice grace without having seen clank. The scene now earns the Gen 2
moment instead of pre-empting it, which is a better scene than the one with the wrong plant in it.

---

## 3a. The tool is scaffolding; the reading is the review

**Ingram, 2026-09-22:** *"Many of the tests you will have to perform cannot be done programmatically
and instead are best judged by your LLM like analytics."*

That is the governing proportion, and it is worth stating as a number: of 63 checks, 28 are
mechanised and **35 are answered by reading.** The 28 clear date stamps, broken refs, missing fields
and DCs off the ladder out of the way. They cannot tell you whether a scene is any good, and the
first two dry runs proved it — both runs' most valuable findings came from reading the scene, and in
both cases every mechanical check on that scene was green.

So the discipline is: **run the tool first to stop wasting attention on mechanical faults, then do
the actual review by reading.** A pass output that is mostly a restatement of the console is a pass
that did not happen. The console's own footer says this, on every scene report, on purpose.

---

## 4. The five passes

Ingram named three and invited more. Place became the fourth, and the Seam the fifth -- added on 2026-09-22 while the process was being applied, which is the version mechanism working rather than a defect in the original design. Place is a pass rather than a checklist item because it produces a physical artefact (an image), it is the only pass whose verdict is genuinely hers rather than mine, and it is the only one that can legitimately wait on her. The Seam is a pass because its subject is not a scene at all.

**Order is load-bearing.** Comprehension gates everything: if the story does not work there is no
point auditing fields or polishing sentences. Place runs *before* Quality because **a location that
changes changes the prose written about it** — polishing a description of a room before knowing which
room it is means writing it twice. The Seam runs after Place, because a journey is only measurable once both ends are settled, and before Quality, because fixing a seam changes the prose.

### Pass 1 — Comprehension

**I run the scene at you, in one output, start to finish.** Not a summary and not a field-by-field
tour: the thing I would actually do, in order, as flowing narration. Verbatim on everything a GM says
out loud — the opening read-aloud, every NPC's first line, every choice as the players would hear it,
every roll with its skill, its DC and what all four degrees of success do. Every point where I would
have to improvise, flagged as such.

Verdict: `CLEAR` / `FIX` / `STOP`. **A `STOP` here ends the sign-off** — the scene needs rewriting or
cutting, and there is nothing to gain from checking the spelling of a scene that should not exist.

Stopping rule: this pass clears the moment you say you understand the scene and want it to exist. It
is **not** a quality pass and may not raise craft findings — those are pass 4's, and mixing them is
how one output becomes three.

### Pass 2 — Completeness

The required checks as a pass/fail table — mostly mechanical, run by the tool — then the recommended
ones as a ranked shortlist of at most five, each with what it would add and what it would cost. **And
every recommended check I am deliberately declining, named out loud with its reason**, because a
silent omission and a considered decline look identical from your side and are not the same thing.

Verdict: `CLEAR` / `FIX`.

Stopping rule: clear when the required table is green. **Recommended items are offers, not debt.**
Declining all of them is a legitimate `CLEAR`. A required check can be waived instead of satisfied —
`the-walk-down` has no skill check because it is a deliberate relax beat — but a waiver goes on the
record with its reason, because the reason is worth more to the next reader than a suppression flag.

### Pass 3 — Place

**The map crop, sent as an image: two panels, captioned.** `SITE` is the footprint and the block
around it — *is this the right building?* `SITUATION` is three kilometres across with the site
crosshaired — *is this the right part of the city?* One zoom answers one of those and hides the
other; a tight crop of the wrong district looks perfectly reasonable. The caption carries the
location's name, id, grid reference, area, tier, depth, rank, region and status, so the image is
self-contained.

Then: **what the brief claims about the place, set against what the map actually shows.** If the
intro says "beside the barrier", the barrier should be visible. When it isn't, either the prose or
the map is lying, and both are cheap to fix now.

If the scene has no location, I bring a shortlist — the best candidates on the real map, ranked, with
their grid references — and a recommendation. I do not quietly pick one: a guess recorded as a fact is
how a map stops being trustworthy, which is `scene-set.schema.json`'s own rule. If nothing on the map
fits, I ask you to draw one.

Verdict: `CLEAR` / `FIX` / `BLOCKED`. `BLOCKED` means it is waiting on you to draw, place or decide —
a legitimate resting state. The sign-off carries on to pass 4; only the seal waits.

**Place runs in both directions — added 2026-09-22.** Ingram: *"take this as a chance to update the
Gazetteer so that both the story scenes and the map stay in lockstep and both stay accurate and
detailed, enriched by each other."* Reading the map to check a scene is half the job. The other half
is that **the scene almost always knows something the location file does not**, and if that never
lands in the file it dies when the review closes. So `P11`, required: whatever this pass establishes
about the place gets written back into `data/locations/<id>.json`. `P12` files a gazetteer request
when the answer needs her to draw or place something.

The Road In's own pass proved it immediately — confirming the Candidate Gate produced a page of real
detail (what the roster does and why it echoes the letter, what the sign-out ledger costs, and that
the hand-corrected curfew figure is **not** a clue so nobody builds a reveal on it) none of which
existed in the location file.

**And any location a scene touches owes real depth.** `P6` was recommended and got waved past on The
Road In as "location work, not scene work". Ingram rejected that split: *"if a location is in a scene
even for a moment we should write that down in its own detailed location file so that if we ever come
back here we don't contradict an earlier scene in this location."* It is now **required**, on the
ladder `design/location-depth.md` already defines — `sketch` for a place the scene merely points at,
`scene` for one a beat happens in. The anti-contradiction record is the point; the prose is the means.

Stopping rule: clear when you have looked at the crop and said the siting is right. **Your eye on the
image is the check.** My opinion of the siting is only the proposal.

### Pass 4 — Seam

**Added 2026-09-22, and it is the first pass whose subject is a join rather than a scene.** Ingram
noticed the gap while the process was being applied:

> *"It occurs to me that we should make a careful note to check if this scene and the next scene have
> valid start and end locations for the whole party... the group will mostly travel together to the
> same place and will sometimes split up, we need to ask ourselves between scenes some important
> questions and add them to the process."*

Nothing in four passes compared a scene to the one it leads into. Both scenes could review perfectly
and the join between them be a journey the GM has to invent live — which is precisely where
`scene-brief.schema.json` already says a session runs rough.

**The output is two joins, each stated as a movement:** where the previous scene leaves every PC, how
they get here, and where this scene leaves them for the next one. Then what carries across physically
— kit, documents, injuries, information — and what is deliberately dropped. If the party can arrive
or leave in pieces, how the GM runs that and how they recombine.

### It is a coordinate, not a mood — corrected the same day

The first version of this pass tracked only togetherness, which was a miscommunication. Ingram:

> *"I don't want to just track if the group splits or merges, I want to literally have a set of
> coordinates for the players to move between and that needs to happen between EVERY scene change.
> Players start at X, then end up at Y. The plan is to cut to the world map, automatically, between
> every scene change."*

**And that cut is already built.** `foundry/scene-runner.mjs` calls `core/travel-trigger.mjs`'s
`needsTravel` at three sites; when it fires, `foundry/travel.mjs` plans a real route across the road
graph with `core/travel-route.mjs`'s Dijkstra router and animates it with `core/travel-animation.mjs`.
The runner never closes — brief switches, close dialogue, map crossing, fade into the next scene.

So the missing half was never the animation. It was that **a scene edge had no coordinate to be at.**

`needsTravel` returns false when *either* side is null, and that is the worst possible shape for a
gap: no error, no warning, the table is simply somewhere else next beat and the GM covers it. The
first leg report measured it — **7 of 25 scene changes cut to the map; 17 are silent hard cuts.**

**So the fields are `intro.position` and `outro.position`**, each a `locationRef` first and a state
second. The `locationRef` is a real point: `derived.centroidPx` on the 12400×12400 sheet at 1px = 1m.

| State | Means | Owes a coordinate |
|---|---|---|
| `scattered` | Off-map, positions not tracked. | **No** — the one exemption |
| `individual` | Each PC at a different real place. | Yes, one each |
| `converging` | Travelling toward one place, not yet arrived. | Yes |
| `together` | All at the one location, one token to move. | Yes |
| `split` | Two or more known groups — more than one thing moves on the map. | Yes, one per group |

`scattered` exists because Ingram offered it for exactly one edge: *"have the group's starting
locations just be 'Scattered' for The Road In and then from that point onwards we track their
location."* Six separate mornings in six unstated towns is genuinely off-map, and it is the only
place in the campaign where that is true. Every other null coordinate is a broken map cut.

**`node tools/scene-signoff/console.mjs --travel`** prints all 25 legs: where each starts, where it
ends, how far, and whether the cut fires.

Ten checks, and **five of them are mechanical**, including one genuinely new capability: the painted
sheet is 1px = 1m, so the tool measures the **straight-line distance between consecutive scenes'
locations** and reports it against the scene's own runtime. "Is this journey possible in the time
allowed" stops being a matter of opinion. The first run measured The Road In and Intake Medicals at
**23 metres apart** — plausible for a campus checkpoint and its intake hall, and exactly the kind of
fact only a measurement surfaces.

`seamStatesReachable` is the check that does the most work: `individual` cannot become `together`
without a `converging` step or a **stated time skip**, so six people in six towns cannot be in one
room next beat. The Road In passes it because its outro says outright *"Time skips a few days on its
own."*

Verdict: `CLEAR` / `FIX` / `STOP`. A `STOP` means the two scenes cannot both be true as written — the
order is wrong, or one of them has to move.

Stopping rule: clear when both joins are stated as movements a GM could narrate without inventing
anything, and every PC has a position at each edge. **The first and last scenes of an episode each
have one open edge; say so rather than inventing a neighbour for them** — the backward-looking checks
report `n/a` on scene one rather than being answered with a guess.

### And the campaign's own starting positions

The case that provoked the pass is the hardest one, and its answer is a shape rather than a fact. The
Road In is six separate mornings in six separate places, and **the six PCs do not exist yet**. So the
origins are recorded as *player-authored, not pre-set*: each player invents their own home and journey
at the table, the GM writes down what they say, and that record is the campaign's only account of
where these six started. The single constraint is the letter's — somewhere reachable by the Monday it
names, on transport a candidate could afford.

Inventing six hometowns for people who have not been made would pre-empt induction, which is the one
thing that must not happen. Recording the rule costs nothing and answers the check.

### Pass 5 — Quality

**At most five findings, ranked by how much each would change what happens at the table**, each with
the current text and a proposed replacement side by side. Then the things I considered and judged
fine, named — so that silence is not mistaken for inattention.

Per your answer: **I apply the obvious ones and show you the diff as done.** A flat description, a
missing vocal tic, a dead read-aloud, a line that reads written rather than spoken. Anything touching
meaning, reveal timing or character goes in the proposed list and waits for you.

The checks this pass reads by hand are the ones that matter most and mechanise least: does the
read-aloud put a body in the room; does every NPC want something other than to advance the plot; does
someone from an earlier scene come back and get used; is the mechanical shape saying the same thing as
the fiction; **and for every fact this scene discloses, is this the right amount, in the right way, at
the right time.** That last one is the hardest question on the list and the one you flagged as most
important. A reveal spent early cannot be spent again.

Verdict: `CLEAR` / `FIX` / `STOP`. `STOP` here is rarer and means the scene is well-built but not
worth running.

### Who may record which verdict

Settled 2026-09-22, during the second dry run, because it is what makes §3's enforcement claim
actually hold rather than merely sound good:

> **`FIX`, `STOP` and `BLOCKED` are findings, and I record them myself. `CLEAR` is assent, and only
> Ingram gives it.** A pass I believe is clear sits unrecorded, with my proposed verdict stated in
> the report, until she answers.

`seal()` already refuses any scene whose four passes are not all `CLEAR`. Combined with the rule
above, that means **a seal cannot be reached without four separate acts of assent from Ingram** — not
by discipline, and not by my restraint, but because the only path that writes `live` demands four
records only she can create. The Place pass's one exception proves the shape: she confirmed the
Candidate Gate siting from the crop, so `place = CLEAR` is on the record and never has to be asked
again.

Stopping rule, and it is the most important sentence in this document:

> **Two rounds of `FIX`, no more.** On the third pass through, every remaining finding is either
> applied or dropped with a one-line reason, and the pass clears.

A reviewer that can always find something will always find something. Without a hard terminator this
process would produce a scene that is never finished and a collaborator who stops asking for reviews.
The cap is what makes "the job is done" a fact rather than an aspiration. Being decisive is the
deliverable, not a manner: **five findings, ranked, with the non-issues named, and a stated verdict in
one unhedged line.** "Here are fourteen observations" is not a review.

---

## 5. How the process is allowed to grow

Ingram asked for this specifically: *"we have to imagine the process itself changing and growing more
complex as we learn about failure states we hadn't thought of."* A promise to remember would not
survive the month, so it is a mechanism instead.

**The checklist is data, it is versioned, and a seal records the version it cleared.**

`data/campaign/signoff-checklist.json` holds every check: an id, its pass, `required` or
`recommended`, the question, why it exists, the craft document or decision it comes from, the
evaluator that automates it if one can, and — for anything added later — `addedIn` and
`addedBecause`. A scene's `review.checklistVersion` records what it was measured against.

So when a session goes wrong in a way nobody predicted:

1. Add check #Q17 with `addedBecause: "<what actually happened>"`, and bump `version`.
2. The console immediately reports every sealed scene as **stale against Q17 specifically.**
3. Re-clearing one is a thirty-second look at Q17 alone — not a fresh review.

That is the difference between a gate and a process that learns. Nothing already sealed silently
becomes wrong, and nothing already sealed has to be re-read in full.

**When to bump the version:** adding a check, or raising one from recommended to required — the two
changes that can make an already-sealed scene wrong. Rewording a question, fixing a false-positive
regex, adding a `why`: no bump, because none of those changes what a scene had to satisfy. Bump when
unsure; a few cheap re-checks cost less than hidden staleness.

**And checks can be removed.** Every check carries a `why`, which makes it arguable, which makes it
removable when it stops earning its place.

Two decisions already on the record, both 2026-09-22, the day the checklist was written:

- **Q14, Q15 and Q16 were proposed for cutting and Ingram kept all three.** I had flagged them as the
  most likely dead weight — delayed payoff, the bad-then-pushback squeeze, and ludonarrative
  resonance — on the grounds that a recommended check which is easy to answer "no" to may just be
  noise. Her answer was "all good, keep them." They stay, and this note exists so the argument is not
  had twice.
- **Three checks were cut the same day**, all for the same reason — they flagged good writing. `"the kind of X that Y"` and `"less X than Y"` are ordinary
English, not tics. Word-repetition detection caught Nobu's *"sign there, there, and—"*, which is
deliberate comic rhythm, and two legitimate uses of anadiplosis. A check that fires on correct work
teaches a reviewer to skim a whole category, which is worse than not having it.

---

## 5a. The consequence radar

Ingram's own addition, 2026-09-22: *"a sort of radar for if a scene should have short, medium or long
term consequences and where we should note those down."*

Three horizons, each with exactly one home — and the homes already existed:

| Horizon | Means | Recorded in |
|---|---|---|
| **Short** | The GM writes it down tonight, before the table goes home. | `outro.writeDown` |
| **Medium** | It lands within a few episodes and the party can act on it. | `carryForward`, `offers`, `outro.tracks` with a delta |
| **Long** | A campaign-scale plant whose payoff may not be assigned yet. | a Node, via `nodeRefs` |

**The rule is not "have more consequences." It is that every consequence has exactly one recorded
home, chosen by horizon.** A long-horizon plant recorded in prose instead of on a Node is the drift
bug this project has actually had: The Road In's own beat claimed "pays off Ch5" while the Ledger's
payoff column had been cleared (`design/node-registry.md` §11, Bug A). M23 now fails a scene that
names a payoff chapter or a numbered Ledger entry in prose; M26 prompts more softly when a beat
plants something with no Node at all.

### The field collision this had to settle first

`carryForward` and `outro.writeDown` carried **word-for-word identical purpose clauses** in the
schema — "the questions next session's writing will want answered" — and were used 2 and 26 times
respectively. Two names for one field, drifting, which is the thing `design/data-ownership.md`
exists to stop. Rather than delete the near-unused one, they are now split by horizon: `writeDown`
is tonight, `carryForward` is the next writing pass. The horizons are declared in
`scene-brief.schema.json` itself.

### What the radar said about the corpus, the first time it ran

```
Horizons: 85 short, 11 medium, 20 long across the corpus; 11 scene(s) at one horizon only
```

**The middle horizon is nearly empty.** 85 things to write down tonight, 20 campaign-scale plants,
and eleven things in between — nine of which sit in five scenes. `offers` is used by **zero** of 26
scenes, so the Time Economy scheduling game currently has nothing feeding it, and `artefacts` by one.

**Whether that is a fault is a campaign judgment, not a checklist one**, which is why M24 is
`recommended` and not `required`. An opening day that is scheduled end to end legitimately owes the
party nothing in the middle distance. Fifteen scenes across two episodes owing nothing is a different
claim, and it belongs to the episode seal. The radar reports it; it does not decide it.

It also found a real gap on its first run: the bible's Mystery Ledger table has twelve entries and
its own prose says Episode One plants **#1, #6, #7, #9, #10 and #11** — but only #5, #6, #7, #9 and
#10 have Nodes. **#1 and #11 are planted in shipped scene files with nowhere to record their
status.** That is exactly the class of thing the Node Registry was built to prevent, found by asking
the radar's question.

---

## 5b. Not applicable is a third answer

A check that cannot apply to a scene must not be answered. The second dry run found **7 of 63
checks unanswerable for The Road In** — four about NPC voice and wants in a scene with no NPCs, two
about returning to earlier play in the campaign's first scene, one about a decision point the scene
does not contain. A manual check had no way to say so, which left two bad options: invent an answer,
or skip it silently. **A silently skipped check is indistinguishable from a forgotten one**, which is
the exact fault the M5 fix had removed a few hours earlier.

So `n/a` is a first-class state, and it is **not** a waiver:

| | Says | Visible as |
|---|---|---|
| waived | This applies and I am declining it, for this reason. | a decision on the board |
| n/a | This cannot apply here. | a line in the report's own section |

Most cases are decided **once, structurally, for the whole corpus** by a check's own
`appliesWhenAuto` predicate — `hasSpeakingCast`, `notTheFirstScene`, `hasChoicePoint`,
`beatsAreSequential`. That beats hand-marking every montage and every relax beat, and it means the
answer is consistent across scenes instead of depending on who ran the review. Anything those cannot
reach is recorded per scene on `review.notApplicable`, always with a reason.

**What the shape of that gap says about the checklist:** it was drawn from the craft library, which
assumes scenes with people in them making decisions. A montage, a relax beat and a solo scene are
structurally different animals, and about a ninth of the checklist does not fit the first one. Expect
more of this as the passes meet more scene shapes — that is the versioning mechanism working, not a
defect in it.

---

## 5d. Exceptions an author writes (2026-10-07, D065)

Ingram, grading the first episode confidence run: *"there has to be the ability to make intelligent exceptions to some rules"*. A required check could be waived only by the sealing review (`seal.mjs waive`) or, for a few recommended checks, by a sentence in the notes matched by a regex; neither is where an author is when writing the scene, and the first scene of the campaign was failing five checks that do not apply to a speech.

A scene brief may now carry:

```json
"exceptions": [ { "check": "M8", "why": "The opening scene is a speech with no rolls (D048), so there is no skill to vary." } ]
```

- It shows on the board and in the report as **`excepted`** with its reason. It is a decision on the record, never a silent pass, and it counts as neither a pass nor a failure.
- A reason under 20 characters, or an id that is not a check, is itself a failing result, **X1**.
- It reaches the checks that depend on it as a waiver does (excepting P1 clears P2, P4 and P6).
- **A scene with no place is not an exception**: mark it off the map (`offMap` in `scene-set.json`, the Location Editor's Story tab). The board counts that as placed on purpose.
- The sealing review keeps its own `waive` and `notApplicable`; an exception is the author saying it in the scene, and the Sign-Off still reads it.

The same day the checker stopped asking for what the house style retired: M2 and M10 read a scene's opening from its first beat when that beat is the speech and no longer need `firstThing`; M6 and M8 honour a check's `anySkill`; M7 reads a beat's `npcRef` as a member of the scene's own cast; M13 asks for a twist.

## 5c. One report per scene, shown section by section

Ingram, 2026-09-22: *"produce a template document for these reviews and when you finish a section of
a report you update and show me the document. This consistent artefact driven process allows you to
give me an easier time with the reading comprehension and if you use a template then it will be easy
for me to follow."*

And then, on seeing the first one as markdown:

> *"Reading huge amounts of basic text is what I spend a lot of my time doing and it's exhausting.
> Clearly accessible and strong visual language in a html template artefact would make it easier to
> see what's good, bad, what needs work, what you need from me."*

Followed immediately by the line that decides the design: **"Prioritise reading comprehension above
in universe style."**

```bash
node tools/scene-signoff/report.mjs <scene>     # renders reviews/<scene>.html from reviews/<scene>.json
```

Two files per scene in [`reviews/`](../reviews/): **the JSON is the source** (tracked; all the prose,
the asks, the findings, the diffs) and **the HTML is the build** (gitignored; regenerate, never edit).
The page then gets published as an Artifact so she can read it anywhere.

Section order is reading order: **the asks first**, then the four passes, then what was applied, then
the radar and the not-applicable list. The asks sit above the analysis because they are the only part
that blocks her, and they carry a count and a "blocks the seal" flag.

**What the page does that prose could not.** State is carried by shape and word, not only colour —
verdict chips, a severity stripe down each finding, a state tag on every check row. Findings render
as cards with before/after diffs, so an applied rewrite reads as a change rather than as a paragraph
describing one. Failing checks open by default and passing ones collapse, so a clean pass is one line
instead of a table. The radar is three bars, so an empty middle horizon is visible rather than
inferred.

The palette is `module/blank-inheritance/styles/bi-tokens.css` — the standing one-CSS-identity rule —
but per her second line it is there for **low glare, not for costume**: two faces, a warm ground,
generous leading, a 68-character measure, and no distressed typewriter face anywhere near running
text. The Directorate-form treatment was drafted and dropped for exactly that reason.

**Why the content is data rather than markers.** The first version kept prose and generated tables in
one markdown file behind `<!-- signoff:auto:* -->` comments. It worked, but a refresh could only ever
rewrite part of the page, and a report whose markers got edited away could not be refreshed at all.
With the prose in JSON there is nothing to preserve and nothing to clobber — re-render any time, and
the mechanical half can never be stale against the corpus.

**The report is not the record of record.** The authoritative review state stays on
`episode.scenes[].authoring.review`, which is what the console counts and what `seal()` checks. The
report is its readable face plus the reasoning. If they disagree, the episode file is right — the
`data-ownership.md` rule applied to a document.

---

## 6. The console

```bash
node tools/scene-signoff/console.mjs
```

Ingram asked for "a very quick to run test which then lets you know how many scenes we've drafted and
how many scenes are now confirmed live quality," and invited more. It reads the corpus once, runs only
the mechanical checks, and prints the board: every scene in play order, its status, four glyphs for
the four passes (`C+ M+ P! Q.`), and its flags. Then the totals, and **what to do next**.

Per the Desk's own rule, the bottom line says what the next move is, never how much is left. Other
modes: `--scene <id>` for one scene's full check report, `--blockers` for everything failing
corpus-wide, `--line` for the one-line session-start summary, `--json` for the data.

The first run, before any scene had been reviewed, reported real work rather than a clean bill:

```
26 scenes: 0 live, 0 in review, 26 drafted
Place:    15/26 sited on the map, 11 with no location
Checks:   21 required failing across the corpus
Next up:  episode-c1e1--the-road-in  (The Road In)
```

Eleven scenes with nowhere to happen, five dangling `npcRef`s (`clerk`, `storekeeper`,
`civil-defence-instructor`, `night-stand-cook`, `crew-chief`), two reveal beats with no read-aloud
written, one missing outro transition, and two scenes with no skilled check — one of which is
deliberate and will be waived. **Every one of those is a real finding, and `tools/scene-audit/audit.mjs`
reports all eleven Episode One scenes clean.** The two tools are not redundant: that one asks whether
a scene is well-built, and this one asks whether it is finished.

---

## 7. The loop

`/signoff` with no argument prints the board and starts the next scene in play order. `/signoff <scene>`
takes a named one. One scene, four passes, four outputs, in order — and the recording is a real command
after each:

```bash
node tools/scene-signoff/seal.mjs pass <scene> comprehension CLEAR --note "..."
node tools/scene-signoff/seal.mjs waive <scene> M18 --why "deliberate relax beat"
node tools/scene-signoff/seal.mjs seal <scene> --by Ingram
```

Sealing a scene is also what makes everything it casts citable, so the 281-item backlog drains as a
side effect of work worth doing. That promotion is recorded as a batch under the scene's own seal,
per `approvals-desk.md` §5's rule that a sweep must be legible as a sweep.

**The episode seal.** A scene cannot see the shape of the evening it sits in, so after every scene in
an episode is `live`, one further pass runs at episode level: the emotional-arrow sequence and its
runs, skill and activity variety across the whole episode rather than within a scene, required-beat
traceability, cast coherence across the roster, and whether the reveals are spent in a sensible order.
`design/scene-audit.md` §9 and §10 already establish why these cannot be per-scene checks — a corpus
audit found one skill sitting on 66% of all checks while every individual scene read clean.

### What this is beneath, and above

- **Above `tools/scene-audit/audit.mjs`** — that is the mechanical critique and runs inside pass 2.
  It cannot tell you whether a scene is any good, and a clean report from it is not evidence.
- **Beneath `design/scene-simulation-testing.md`** — the expensive self-play protocol. Escalate to it
  when a pass cannot settle whether something works at the table. Rare, and not required.
- **Alongside `design/scene-audit.md`** — that document is the question bank this checklist was drawn
  from, and stays the place to deepen a category. It asks "is this well-built." This asks "is this
  finished, and may we run it."

---

## 8. Red team

Written against my own proposal, per the standing create → analyse → critique → evolve workflow.

**Twenty-six conversations is a lot, and pass 1 is long.** Genuinely. The mitigation is that pass 1 is
the pass that saves the other three from being wasted, and that Place and Completeness are largely
tool-driven. But if this proves too heavy in practice the honest fix is to shorten Comprehension for
scenes that are obviously fine, not to skip Place or relax the terminator.

**The two-round cap could ship something mediocre.** It could. The alternative ships nothing, and a
scene at `live` is not frozen — a later session can reopen one, and a new check will flag it
automatically. The cap bounds one conversation, not the scene's whole future.

**I might use `BLOCKED` as an escape hatch.** A Place pass parked on "waiting for Ingram to draw
something" looks like progress and is not. The console counts blocked scenes separately for exactly
this reason, and a scene blocked for a long time should be read as my failure to find a candidate,
not yours to draw one.

**Sealing a scene promotes its cast, which is a lot of trust in one keystroke.** It is, and it is the
right amount: those items were read in the only context where they can be judged. It is recorded as a
batch so a fault traced back later can see it was cleared inside a scene review rather than read
individually.

**The checklist could bloat.** Sixty checks is near the limit of what is worth running every time.
Growth should mean *replacing* weak checks more often than adding new ones, and a check whose
`addedBecause` nobody can remember is the first to cut.

---

## 9. Status

**The process is in use; the tooling is built.** `tools/scene-signoff/` (console, seal path, the
Place renderer), `data/campaign/signoff-checklist.json` (version 7, dated 2026-10-04), the `live` rung and
the `review` block in `authoring.schema.json`, `seal()` in `core/promote.mjs`, and the tests in
`test/tier1-signoff.test.mjs` and `test/tier2-signoff-board.test.mjs` all exist and run.

No scene is `live`. The Road In went through the first dry run on 2026-09-22 and was sealed (checklist v5); that seal no
longer counts, because the scene was rewritten whole on 2026-10-01 (`reviews/` keeps the record). Since
2026-10-07 the board is also the first layer of the episode confidence run
(`design/playtest-process.md` section 13), whose first grading by Ingram corrected the checker itself
(section 5d) and took Episode One from 37 failing required checks (the gate's first reading) to 4, all of them siting.
