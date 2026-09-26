# The Node Registry

*Written 2026-09-19, from Ingram's direct request after the Episode One redesign work surfaced real
staleness live: "How can we change the way we work to remove the possibility of the story generating
stale nodes? ... create a reliable system that YOU are forced by process to work within which is
designed to avoid you accidentally creating the same content twice or leaving a stale concept on the
table for too long." Extended the same day, second message, with four decisions — §10 — that turn part
of this from proposal into build. **No longer "nothing here is built":** the memory system carrying
this process is redesigned (§14), and `mitflits.md`, the schema, and a working generator + test exist
— see each decision section for exactly what shipped versus what's still designed-not-built.*

---

## 1. The evidence, first

Two real bugs surfaced yesterday, both the same root cause wearing different clothes.

**Bug A — three files, three different answers to one question.** "When does the violet cicada mark
pay off?" `data/scene-briefs/episode-c1e1--the-road-in.json` says *"pays off Ch5."*
`data/scene-briefs/episode-c1e1--the-errand.json` says *"payoff chapter is currently unassigned."*
`ideas/story/blank-inheritance-ch1-v2.md` §5 says the entire payoff column was **deliberately
cleared** when six episodes of drafted content were deleted, and to *"reassign these deliberately when
the chapter is rebuilt, rather than inheriting an old schedule."* The Road In is the stale one — it
kept a fact from a schedule that no longer exists, because nothing told it the schedule changed.

**Bug B — a JSON data file disagreeing with the design doc that corrected it.**
`data/episodes/episode-c1e1-mothers-maiden-name.json` still describes the flood-tunnel scene ending
with the party *"realising, over the water, that they were all flagged."* `ch1-v2.md` §6 — written
during the same rebuild that cleared the Mystery Ledger — explicitly corrects this: they climb out
*"already knowing they were all flagged... that discovery happened this morning at Intake Medicals,
not here."* The episode file is the actual data the module runs on, and it has been wrong since the
correction was written, because the correction happened in a different file with no link back to the
one that needed to change.

Both bugs are the same shape: **a fact got copied into a second file instead of referenced from one,
the canonical version changed, and the copy had no way of knowing it was now wrong.**

**And this isn't a one-off.** `CLAUDE.md` itself — the single most-read file in this repo — has needed
this exact correction repeatedly: the Frame-leveling note ("design bible got this wrong once the full
8-level shape became clear"), the ux-doctrine #119 line ("corrected here 2026-09-16 since this line had
drifted stale"), the mechanical-content line ("this line used to say it was locked; that was wrong and
was corrected 2026-09-13"), and the summary line for the retired Resonance-and-Bleed design doc, which
carried a built-in warning not to trust itself (*"check open-questions.json for current status rather than
trusting this line... a rebuild may reopen them"*). A project this well-maintained still keeps finding
the same disease. That's not a discipline problem. It's a missing structure.

---

## 2. The pattern already exists, five times, unconnected

This is the strongest argument for building something, and it isn't a hypothetical — it's an
inventory of things already in this repo, each independently reinvented because nothing unified them:

| Where | Shape | What's missing |
|---|---|---|
| `data/campaign/open-questions.json` | id / question / status / resolution / relatedRefs / notes | Referenced by `openQuestionRef` — works, but only from schema-validated data, never from prose |
| `data/campaign/naming-placeholders.json` | id / label / description / finalName | Same shape, same gap, separate file |
| `npc.schema.json`'s `socialProfile.facts` | id / text / revealTrigger / revealed / revealedNote | Per-NPC, schema-validated, but invisible outside that one NPC's own file — no cross-file index |
| `ideas/story/bible/*.md`'s "Open questions" + "OPEN" sections | Prose, per-entity | Not addressable by ID, not queryable across files — `mitflits.md`'s own OPEN section (the Frame-core question) is a perfect, real example: a setup, a real tension, and no enumerated candidates, just "under active discussion" |
| `ideas/story/bible/*.md`'s "Appearances so far" | A numbered list, appended to every time a decision touches that entity | **This is almost exactly what you just described** — it's the right instinct, already working, just not machine-readable and not extended to the "candidate resolutions" idea |
| `ch1-v2.md` §5, the Mystery Ledger | A plant → payoff table | Referenced by scene briefs as a plain text string ("Mystery Ledger #6"), which is how Bug A happened — the string isn't a real link, so nothing checks it |
| Twice, in this session alone | `episode-one-redesign.md` §5's Young-One fork; `scene-audit.md`'s flagged findings | Both are exactly "a setup with enumerated candidate resolutions, not yet nailed to a scene" — invented fresh, on the spot, because there was no existing shape to reach for |

Seven instances of the same underlying idea, none aware of the others. This is the identical failure
`design/data-ownership.md` §1 found for field ownership — *"the pattern, seen twice in one
afternoon"* — one level up, in narrative content instead of schema fields. The fix should be the same
shape of fix: **name the pattern once, give it one shared form, and make the existing instances either
adopt it or explicitly stay separate for a stated reason** — not invent an eighth thing.

---

## 3. The unit: a Node

A **Node** is one piece of canonical truth or one open decision, with exactly one place it lives.
Everything in the table above already fits this shape without forcing:

```
id            stable, kebab-case, permanent once assigned (never reused after retirement)
title         one line
status        open | resolved | superseded
setup         what's already true, and what's actually being asked — the thing a bible entry's
              own "Read this first" already does, formalized
candidates    OPTIONAL. Present when there are genuine, enumerable alternative resolutions.
              Each candidate has its own id (id/candidate-id), its own text, and its own status:
              live | adopted | rejected
resolution    null until status moves off "open." Set once, alongside which candidate (if any)
              was adopted. NEVER a reason to delete the rejected candidates — per LEDGER.md's own
              existing rule, a rejected option stays visible as "considered and moved past," not erased
constraint    OPTIONAL. A standing rule any resolution must honor (mitflits.md already has one of
              these — "a mitflit must never read as a vehicle" — currently floating, unattached to
              anything a resolution could be checked against)
lastTouched   date of the most recent edit to this specific node
referencedBy  GENERATED, never hand-written — see §5
```

**A question fits this with `candidates` empty** — `resolution` just holds the answer once given,
exactly like `open-questions.json` already works today. **A fork fits this with two or more live
candidates.** **A revealable NPC fact fits this too** — `status: open` until revealed, `resolution`
set the moment it's learned at the table, which is a small but real upgrade on the current
`socialProfile.facts` shape: today a Fact's reveal is invisible outside its own NPC file; as a Node
it would show up in the same index as everything else. One shape, not three, matching how this
project already prefers a single shared shape with an optional bag over forcing everything into a
predetermined taxonomy (`subsystem.schema.json`'s `subsystemSpecific`, `scene-brief.schema.json`'s
`when` clause).

---

## 4. Where a Node actually lives

**Not a new flat-file bin.** You described this precisely: *"every important story arc related to
Mitflits will have a section within that file dedicated to it."* That's the right call, and it's the
one that keeps this from becoming storage bin #44 in a project already carrying a declared,
unresolved fragmentation crisis (`project_ongoing_crisis_data_fragmentation`) — a Node authored inside
`mitflits.md` is one more section of a file that already exists, not a new store.

Concretely, a new `## Arcs` section in the entity file it most belongs to, one Node per `###` heading,
fields as bolded labels underneath — structured enough for a script to parse reliably, plain enough to
read exactly like the rest of the bible already does. Retrofitting `mitflits.md`'s own existing OPEN
section into this shape, using nothing invented, only what's already written there:

```markdown
## Arcs

### `arc-mitflit-frame-core-link` — does a Frame's living core relate to mitflits?
**Status:** open · **Last touched:** 2026-09-13 (LEDGER #15, Q1)
**Setup:** `dossier-first-impact.md` §8 establishes each Frame's core as biomechanical, "mitflit-scale
and alive," shaping itself into a seat for its pilot. The Thread Grid has a captured mitflit weeping
at a Frame's hand. §9 has Bobbin's people entering a Frame un-extractably. None of these have been
tied together, and you flagged the danger directly: *"I do and don't like parts of the idea that
Mitflits are mechs and vice versa. It feels like a way to cheapen the race."*
**Candidates:**
- **`a` — no connection; coincidence of scale.** The core just happens to be mitflit-sized. [live]
- **`b` — Frame cores ARE (or contain) mitflits**, explaining Bobbin's strike and the weeping mitflit
  directly. [live — this is the one your stated worry lands hardest on]
- **`c` — cores are grown FROM willing mitflit transformation, historically**, which is what the
  strike is actually protesting. [live]
**Constraint:** any resolution must keep a mitflit reading as a person, never a vehicle or component.
**Referenced by:** *(generated)*
```

*(Since resolved, 2026-09-24, LEDGER #34, with none of these three candidates adopted: Gen 1 Frames have no
core, and the Gen 2 core is biomechanical mitflit technology, not a living mitflit. The live Node is in
`mitflits.md`; the block above is kept only to show the format.)*

Nothing about this is new information. It's the same paragraph the file already has, given a stable
address so it can be pointed at instead of re-read-and-summarized from scratch the next time
something needs to touch it.

---

## 5. How other files point at a Node instead of copying it

A new plural field, `nodeRefs: string[]`, added to `scene-brief.schema.json`, `episode.schema.json`,
and wherever else genuinely needs it — generalizing the existing `openQuestionRef` /
`namingPlaceholderRef` convention rather than replacing it (those two stay exactly as they are; no
churn on tested fields for its own sake).

**Bug A, fixed the way this system would have caught it:** The Road In's beat currently carries the
prose *"Mystery Ledger #6, pays off Ch5"* as a plain string. Replace it with
`"nodeRefs": ["mystery-ledger-6"]`, and delete the copied claim about *when* it pays off — that fact
now lives in exactly one place (the Node itself, `status: open`, `resolution: null`), and both The
Road In and The Errand point at the same one instead of each asserting their own copy.

**The generated index** (a script, not a hand-maintained file, mirroring how `data/audio/library.json`
is already "GENERATED by the pipeline, rewritten in full every run" — a real precedent in this repo for
"a summary that can't go stale because it's rebuilt from source every time, never hand-edited"):

1. Scan `ideas/story/bible/**/*.md` and `ideas/story/dossier-*.md` for `### \`<id>\`` blocks in this
   shape.
2. Load `open-questions.json` and `naming-placeholders.json` as additional Nodes — same shape already,
   just structured JSON instead of structured markdown.
3. Scan every `data/**/*.json` file for `nodeRefs`, `openQuestionRef`, and `namingPlaceholderRef`
   values, and build the reverse index — which files actually point at which Node.
4. Cross-check: any reference that points at an id not found in step 1–2 is a **broken reference** —
   the one piece of this that's fully, mechanically testable today, in the same `node --test` suite as
   everything else, no exceptions, per the standing rule that every feature ships with a test.
5. Emit one generated file — every Node, its status, its candidates, its source location, who
   references it. Sortable by `status: open` first (this is the literal answer to *"we always know how
   many different origins or endings we have floating around in the system"*), and by `lastTouched`
   oldest-first (a cheap, honest staleness-candidate list: anything open and untouched for a long
   stretch is worth a second look, not proof of a problem).

---

## 6. What this actually fixes, against your own two named failure modes

**"Leaving a stale concept on the table for too long."** Directly targeted by §5's generated index —
`status: open`, sorted by `lastTouched`, is a five-second answer to "what's still hanging" instead of a
re-read of forty files. And reference integrity (§5.4) is the mechanical fix for exactly Bug A's shape:
once a fact is a `nodeRefs` pointer instead of a copied sentence, there is only one place left for it
to go stale in.

**"Accidentally creating the same content twice."** Only partly solved by structure — see §8 for the
honest limit. What structure *can* do: make checking cheap enough that checking is genuinely the fast
path, not the slow one. Querying a single generated index for every existing Node touching "mitflits"
or "the Young One" before writing anything new about them is one script run, not a full re-read. The
workflow commitment in §7 is what makes that the default action instead of an optional extra step.

---

## 7. The part that has to be a habit, not just a schema

You asked for a system *you're* forced by process to work within, and the honest answer is that a
markdown convention and a generated index can't compile-error a piece of prose. What they can do is
make the disciplined path the cheap path, and this project already has the muscle for exactly this
kind of standing rule — the same weight class as *"check `ideas/entries/` before starting speculative
new work"* and *"check LEDGER.md before asking a lore question."* Proposed to sit alongside them:

- **Before writing anything that touches a tracked entity or concept, query the current generated
  index first.** Not "I remember reading that file earlier this session" — the actual regenerated
  index, since regenerating it is one cheap script run.
- **A Node that gets resolved or advanced by a piece of writing gets updated in the same turn**, never
  "I'll come back to that" — the same discipline `LEDGER.md` already states as its own rule #2/#3, and
  the same one this project already applies to code: a feature and its test land together, not in
  sequence.
- **When new content might plausibly duplicate an existing Node, search before writing, not after.**
  The index makes the search cost one grep instead of a cold re-read; the rule makes doing that search
  the default rather than something to remember.

---

## 8. Red team — what this doesn't fix

Written against my own proposal, matching how `approvals-desk.md` §7 and `data-ownership.md` §6 both
red-team themselves before calling anything settled.

**It doesn't stop me from writing new unlinked prose that duplicates a Node.** The reference-integrity
test (§5.4) only catches a *broken* link — a reference pointing at nothing. It cannot catch a *missing*
link — new prose that quietly restates something a Node already tracks, without ever mentioning the
Node. That's a genuine gap, not a rounding error, and §7's workflow habit is the only real defense
against it; nothing here makes it compile-checkable.

**Bug B doesn't fully fit this system, and pretending otherwise would be dishonest.** The episode
file's duplicate reveal wasn't an *open question* two files disagreed about — it was a completed
narrative fact, independently asserted in two places, where one got corrected and the other didn't.
Node-referencing fixes this only if the episode file's scene description had been written to point at
Intake Medicals' own authoritative treatment instead of re-describing the ending in its own words. The
generalizable lesson is broader than "add a Node": **a scene/episode `description` field should say
what a scene is *for*, not re-assert specific narrative beats a scene brief or design doc already owns
more specifically** — closer to `data-ownership.md`'s territory (which file is the authoritative writer
of this fact) than to this document's. Worth its own short pass, separately, once this is agreed.

**A possible, imperfect mitigation for the gap above — flagged as worth trying, not promised.** A Node
could optionally carry a short `watchTerms` list (distinctive phrases strongly tied to it — for the
cicada-mark Node, something like `"pays off Ch"` or `"Mystery Ledger #6"`). A script scans prose and
data files for those terms appearing *without* an adjacent `nodeRefs` pointer, and flags the file for
human review. This will have real false positives and real false negatives. Its value isn't proof —
it's turning "reread everything by hand" into "review this short flagged list," which is still a large
time saving even done imperfectly. Worth building once the core system is proven, not on day one.

**A third bug class, found live 2026-09-19, that neither mechanism above catches: a stale *absence*
claim.** `ideas/story/blank-inheritance-ch1-v2.md` claimed the flood-tunnel scene brief "is not yet
written as a brief" — and had, per `git log` (`f843579`, `0d7d40b`), been wrong about that for at
least six days, since the file was built and adversarially fixed on 2026-09-09, before this document's
own 2026-09-13 status banner was written. Neither the reference-integrity test (§5.4, which only
validates *positive* pointers) nor the episode-completeness test (`tier2-data-corpus.test.mjs`, which
only checks whether a structured ref resolves) would ever have caught this — the reference was never
broken, because the file was real the whole time. The bug lived entirely in a sentence of free prose in
a different file, asserting something's absence rather than pointing at its presence. Caught only
because a subagent, dispatched on the false premise that the file didn't exist, independently checked
git history before writing anything — good practice, not a system guarantee. **The taxonomy is now
three, not two:** duplicated facts (Bug A, §1), broken references (§5.4), and stale absence claims
(this one) — a lint scanning for completion/absence phrases ("not yet written," "doesn't exist,"
similar) paired with a specific file reference, cross-checked against the real filesystem, is the
proposed mitigation; see `tools/node-registry/` for whether it's been built yet — checking that
directly is exactly the discipline this paragraph is about, not trusting this sentence.

**Built 2026-09-19: `tools/node-registry/detect-stale-claims.mjs`**, tested in
`test/stale-claims.test.mjs` (a real-corpus assertion of zero HIGH-confidence hits, plus a synthetic
regression test proving the detector can still find the exact shape of the flood-tunnel bug). Two
confidence tiers on purpose — HIGH means the referenced path provably exists despite the absence
claim; LOW is a human/AI review list, not a gate, since most LOW hits are ordinary true statements
about genuinely unwritten things. Went through three rounds of false-positive reduction before landing
there: paragraph-splitting (a bullet list with no blank lines reads as one giant "paragraph") replaced
with sentence-boundary windowing; then a `isBareParentheticalCitation()` heuristic for this project's
two dominant citation idioms (`(design/x.md)` and "see \`design/x.md\`"); then one residual semantic
false positive (a path cited as a sentence's grammatical subject, not as evidence for an unrelated
absence claim) resolved via a documented `KNOWN_FALSE_POSITIVES` allowlist, the same pattern
`tier2-data-corpus.test.mjs` already used for `EXCLUDED_PATH_SEGMENTS`. Wired into the SessionStart
hook alongside the generator — see §14's own status update.

**It does not consolidate the ~43-bin fragmentation crisis, and doesn't claim to.** That inventory and
its resolution stay your own architectural call, exactly as the standing memory on it already states.
This is narrower and complementary, the same relationship `data-ownership.md` has to that crisis —
*"it does not consolidate the bins... it is the mechanism that stops the crisis from growing a 44th
bin."* This document's equivalent claim: it doesn't consolidate anything, but a fact that's referenced
from one Node instead of copied into three files is strictly easier to migrate later, whenever that
migration actually happens.

**Authoring overhead is real.** A proper Node block takes longer to write than a sentence. Not every
detail deserves one — the bible's own existing rule for when an entity earns a file ("recurs across
multiple scenes, or is sensitive enough that a wrong guess has real cost") is the right filter here
too: a Node is for something genuinely at risk of being restated elsewhere, or a real open fork with
candidates worth tracking — not a promotion for every passing fact.

---

## 9. Staging

Small first, same instinct as `design-layers.md` and `approvals-desk.md` §8 — each stage should be
useful alone even if nothing after it gets built.

1. **Agree the shape.** This document. Nothing changes yet.
2. **One pilot file.** Retrofit `mitflits.md`'s own existing OPEN section into the format in §4 —
   your own example, already written, already reviewed by you as "under active discussion." Lowest
   possible risk, and it proves the shape reads naturally rather than as machinery bolted onto prose.
3. **The generator + the reference-integrity test.** Real code, scoped to the one pilot file plus
   `open-questions.json` and `naming-placeholders.json`, so the pipeline gets proven before it scales.
   Ships with a test, per the standing rule — this stage is the easiest one to make fully mechanical.
4. **`nodeRefs` on `scene-brief.schema.json` and `episode.schema.json`**, and Bug A retrofitted for
   real — The Road In and The Errand both pointing at one real `mystery-ledger-6` Node instead of two
   disagreeing copies. Proof the system catches what it's for.
5. **Roll out to the rest of the bible incrementally**, prioritized by where staleness risk is
   actually highest — Manako (the campaign's own stated linchpin) and the full Mystery Ledger's other
   twelve rows.
6. **The `watchTerms` heuristic**, only once 2–5 are proven and only if it still seems worth the
   complexity.

---

## 10. Decided, 2026-09-19

Ingram's four answers, and what each one actually changes.

1. **"Actual hyperlinks would be very useful for the scene runner, literally linking to the same
   files that you use when writing scenes. Are mitflits mentioned in the scene runner? Then they get
   a clickable link."** Bigger than the plain `nodeRefs` id string §5 proposed — real, clickable, live
   in Foundry. Grounded and detailed in §11.
2. **"Combine them."** `open-questions.json` and `naming-placeholders.json` become one file. Detailed
   in §12, including why the physical merge waited on a citation sweep. Merged 2026-09-19.
3. **"Sure. But we backup things where possible just in case."** — her answer to whether the
   `watchTerms` heuristic (§8) is worth building: yes, and any tooling that writes to multiple files
   needs its own backup discipline first, separate from ordinary single-file edits. Detailed in §13.
4. **"Take a very strong pass over your memory of this project and make front and center the new
   process... redesign your memory... we build what tests we can to try and detect when files get
   old, when files become orphaned... automatically run that to flag issues to the LLM when it starts
   doing stuff."** The memory redesign is done — §14 lists exactly what changed. The automatic-flagging
   mechanism is designed in §14 and sequenced behind the generator existing.

---

## 11. Decision 1 — real hyperlinks into Foundry

**This is not a new mechanism to invent.** `scene-brief.schema.json`'s own `handouts[].journalRef`
field already resolves a repo id to a real Foundry `JournalEntry` through "the module's own
deterministic-id derivation" — confirmed live and tested since Stage 1. Foundry's own inline-enricher
syntax, `@UUID[...]{label}`, is confirmed real against 12,428 actual pack documents
(`design/foundry-technical-reference.md`), the same family as sf2e's own `@Check[...]`/`@Damage[...]`.
And the deterministic-id design is specifically built so a reference resolves correctly *whether or
not the target document exists yet* — no lookup table, no creation-order dependency
(`design/foundry-module-design.md`, "cross-references resolve without a lookup table").

So the path is: **every entity file that carries a Node (or is one) gets the same deterministic
Foundry id everything else in the sync pipeline already gets**, generating a `JournalEntryPage` the
same way a purely-social NPC with no statblock already becomes one today (portrait as image, bio as
`text.markdown` — confirmed a separate field from HTML, not auto-derived, so a bible file's own prose
can be pushed close to verbatim). A Node's setup/candidates render as part of that page, GM-only
(these are drafted, not `sound`/`final` — see `approvals-desk.md`).

**Two layers, not one, and only the first is real work available now:**

- **Authoring-time linking (buildable immediately, no new module code).** When I write scene-runner
  content that names a tracked entity, I write `@UUID[JournalEntry.<deterministic-id>]{Mitflits}`
  instead of plain text — a habit, not a feature, and it works the moment the entity has a
  deterministic id at all.
- **Auto-detection — "are mitflits mentioned, then they get a link," without anyone writing the tag.**
  This is genuinely new module code: a custom TextEditor enricher, registered the same way sf2e
  registers its own (`@Check`, `@Damage`), that scans rendered scene-runner text against the generated
  Node/entity index and wraps recognized mentions in real links at render time. Real, precedented,
  buildable — and real module code, which the standing rule says to check in before writing
  (`CLAUDE.md`: "check with the user before writing actual module code"). Sequenced after the
  generator (§14) exists to scan against; not attempted in this pass.

**Honest gap right now:** no Episode One content currently mentions mitflits — they're deliberately
absent from Chapter One's opening episodes (`mitflits.md`'s own tone section). This mechanism is
real and grounded, but its first live test will be whichever scene first names a tracked entity that
already has a Node.

---

## 12. Decision 2 — combining the registries

**Shape:** `naming-placeholders.json`'s ten entries fold into `open-questions.json` as ordinary Nodes
— a naming gap is structurally a Node with `candidates: []` until someone proposes options, and
`resolution` holds the chosen name once set, which is exactly `finalName` under a different name.
Keeping the established, more heavily-referenced filename (`open-questions.json`, ~30 entries and
actively cited throughout `CLAUDE.md` and `design/`) costs less than renaming it, per the same "the
cheapest this change will ever be" logic `approvals-desk.md` §2 used for its own vocabulary change.

**Field convention:** `openQuestionRef` and `namingPlaceholderRef` keep working — resolving against
the same combined store — rather than forcing an immediate rename everywhere they're already used.
New authoring uses `nodeRefs` going forward. No breaking change on day one.

**Why the merge itself hasn't happened yet:** `open-questions.json` is cited from a lot of places,
including plain-prose anchors like `open-questions.json#resonance-playability` scattered through
`CLAUDE.md` and several design docs, not just the structured `openQuestionRef` field. A silent merge
risks breaking a citation nobody's tracking. **A read-only citation sweep is running now** — every
`openQuestionRef`/`namingPlaceholderRef` value, every prose `file.json#id` citation, and every script
that reads either file directly, so the actual merge is a precise, verified migration instead of a
guess. Its findings land in a follow-up pass, not silently folded into this document.

*(Done 2026-09-19: the merge happened. `naming-placeholders.json` survives only as an empty stub whose
`status` line points here, and all ten ids live in `open-questions.json`.)*

---

## 13. Decision 3 — backup discipline for automated tooling

**Where this doesn't apply:** ordinary edits I make directly, one file and one judgment call at a
time, are already covered by the existing standing permission to change anything and report it
loudly — git history is the safety net there, and it's a good one.

**Where it does:** a script that writes to many files unattended — the mitflit-style retrofit sweep,
a future `watchTerms` auto-fix — is a different risk shape, and Ingram's *"just in case"* is the right
instinct. Concretely, before such a script writes anything:

1. **Refuse to run against a dirty working tree.** This repo routinely has other sessions' unrelated
   uncommitted work live in the tree; a bulk script touching "everything that matches a pattern" must
   not risk clobbering work it doesn't know about.
2. **Checkpoint first.** A commit (or, for a dry-run-first tool, an explicit snapshot) immediately
   before the write pass, so a bad automated edit is `git diff`/`git revert`, not a forensic
   reconstruction from memory of what used to be there.
3. **Report the diff, not just "done."** The same loud-reporting standard as any other change, scaled
   to however many files a bulk pass actually touched.

Not built as a standalone tool yet — folded into how the generator/retrofit script in §14 actually
runs, since that's the first tool this applies to.

---

## 14. Decision 4 — the memory redesign, and automatic flagging

**Done, this pass — not a future stage:**

- New dedicated memory file, mirroring the two sibling systems: `project_node_registry.md`.
- `feedback_lore_bible_discipline.md` — added a fifth addition: query the generated Node index before
  writing anything touching a tracked entity, and update a Node in the same turn it's resolved or
  advanced, the same discipline `LEDGER.md` already states for questions and answers.
- `feedback_change_anything_flag_loudly.md` — added the backup-for-automated-tooling nuance from §13.
- `project_ongoing_crisis_data_fragmentation.md` — cross-referenced as a second, complementary
  mitigation alongside `project_field_ownership`, mirroring that entry's own wording exactly.
- `MEMORY.md`'s index — a new line, positioned directly after Field Ownership and The Approvals Desk,
  keeping the standing-infrastructure cluster together at the top rather than buried mid-list.
- This document's own header, and `CLAUDE.md`'s directory-structure bullet (written the same session,
  before these four decisions landed).

**"Detect when files get old, when files become orphaned" — what's mechanically real:**

- **Old:** the generated index (§5) already sorts by `lastTouched`; nothing more to build, just to run.
- **Orphaned — new, not in the original proposal.** The reverse-index the generator already computes
  (§5.3, which files reference which Node) makes the opposite check free: any Node with an EMPTY
  `referencedBy` list is a candidate orphan — authored, never linked to, possibly stale by neglect
  rather than by contradiction. Flagged, not auto-deleted; some Nodes are legitimately unreferenced
  (a fresh, not-yet-used arc).
- **Broken references:** unchanged from §5.4 — the one piece that was always fully mechanical.

**"Automatically run that to flag issues to the LLM when it starts doing stuff":** the real mechanism
is a Claude Code `SessionStart` hook (configured via the `update-config` skill, which exists
specifically for wiring this kind of automated behavior into `settings.json` — the harness runs it,
not me, which is the actual "forced by process" Ingram asked for) that runs the generator and injects
its summary — count of open Nodes, count of orphans, count of broken refs, oldest-untouched — as
context at the start of a session. **Sequenced deliberately after the generator itself exists**,
since there's nothing real to hook yet; wiring the hook is the next concrete step once §14's script is
proven, not attempted in this same pass for that reason.

**Built and wired 2026-09-19.** `tools/node-registry/session-start-summary.mjs` combines the
generator's index (§5) and the stale-claims detector (§8's addendum) into one short report — silent
(prints nothing beyond nothing worth flagging) when everything's clean, itemized when it isn't.
`.claude/settings.json` (new file, this session — project-scoped on purpose, since this is repo
infrastructure everyone working on it should get, not a personal preference) now runs it on every
`SessionStart`. One live caveat worth recording rather than assuming away: this session's own file
watcher was already running before `.claude/settings.json` existed, so this exact session cannot prove
the hook fires live — SessionStart hooks fire only at session boundaries anyway, so that's inherent to
the mechanism, not a defect in this wiring. It will fire the next time a session actually starts.

---

*Related: `design/data-ownership.md` (the sibling proposal for WHO writes a contested field — this one
is about WHERE a contested fact canonically lives); `design/approvals-desk.md` (the staged-rollout
pattern this borrows); `ideas/story/bible/README.md` and `LEDGER.md` (the existing conventions this
generalizes rather than replaces); `project_ongoing_crisis_data_fragmentation` (the bigger, separate
crisis this doesn't claim to solve); `design/episode-one-redesign.md` (paused, resuming once this is
agreed); `ideas/story/bible/species/mitflits.md` (the pilot file — check its own `## Arcs` section and
`test/node-registry.test.mjs` for current build status rather than trusting this document, which
moves slower than the code).*
