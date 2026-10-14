# The Scene Audit

*Written 2026-09-18, at Ingram's request: a process to run before any scene or story beat counts as
complete. An audit, using the Craft Library and the two research shelves to generate the actual
questions, asked before signoff — not to demand perfection, but to make sure everything gets
**considered**. Full raw research behind the curated list below lives in
[scene-audit-question-bank.md](scene-audit-question-bank.md), so nothing found while building this
gets lost even where it didn't make the working checklist.*

---

## 1. What this is, and what it isn't

**This is a checklist, not a review.** `design/scene-simulation-testing.md` already exists and does
something adjacent but much heavier: six personas actually play through a scene, a deliberate
curveball gets thrown, and predictions are locked before the transcript runs. That protocol is
expensive — it took a full session to run once, against one scene — and it's the right tool for
finding out whether a scene *survives contact*. This audit is not that. It's meant to run in minutes,
against every scene, using the same craft-library diagnostics that already justified real fixes
elsewhere in this project, so that most of what a self-play dry run would eventually catch gets
caught earlier and cheaper, before a scene ever needs the expensive treatment.

They stack, and each proves something different:

| Tier | Instrument | Catches | Cost |
|---|---|---|---|
| 0 | Schema + render (`test/tier1-scene-brief.test.mjs`, `tier2-data-corpus.test.mjs`) | Broken refs, malformed data | Free, automatic |
| **1 — this document** | **The audit checklist** | **Craft gaps a schema can't see: an unlegible want, a missing landmark, an unrewarded value, a mandatory beat with no refusal floor** | **Minutes, every scene** |
| 2 | Self-play dry run (`scene-simulation-testing.md`) | Whether the scene survives an adversarial table | A session, reserved for scenes worth the cost |
| 3 | Live-UI cross-check | UI bugs the narrative tier is blind to by construction | Minutes, once tier 2 has concrete claims to check |

This document also isn't a second Approvals Desk. `design/approvals-desk.md` already owns the
question "is this scene allowed to go live" — `drafted → sound → final`, cleared by Ingram alone, in
play-sequence order. This audit answers a narrower, earlier question: **is this scene well-built by
the standards this project has already researched and written down?** That's exactly the split
`craft-library.md` §4 already draws for the library itself — *"the bible answers is this consistent,
this library answers is this well-built"* — extended one step further: the library says what
well-built means, this audit is the concrete, repeatable act of checking a specific scene against it.
A scene that clears this audit still isn't `sound`; it's just no longer carrying a craft gap nobody
looked for. **In practice, this is very likely the concrete work that makes a fast `sound` read
possible at all** — see §7.

**Nothing here is a gate that blocks writing.** Per the standing approvals-desk doctrine, drafted
content may be built on before it's reviewed, provided the dependency is recorded. The audit runs
*after* a scene is drafted, and most of what it finds should just get fixed on the spot — see §7 for
which findings are simple craft fixes versus genuine judgment calls that need Ingram specifically.

---

## 2. The scene-level checklist

Every scene gets the **core** questions (§2.1) — eight categories, chosen to be the smallest set that
still touches wiring, character, agency, place, tone, prose and mechanics without becoming a chore to
run every time. **Conditional modules** (§2.2) apply only when a scene actually has the relevant
content — a scene with no antagonist doesn't need the villain-craft questions run against it, and
running them anyway is exactly the kind of box-ticking that makes a checklist stop getting read.

### 2.1 Core checklist — every scene, every time

**A. Wiring — is it connected to anything?**
1. Does `carriesIn` (or its narrative equivalent) change something concrete about how this scene
   plays, rather than reading identically no matter what came before it? *[narrative-theory-foundations.md,
   causal connectivity [E]]*
2. For every new location, NPC, event, or character action, can you state the transition,
   relationship, cause, or want it depends on? *[narrative-theory-foundations.md, the five-dimension
   event-index [E]]*
3. Does `transition`/`onwards` give the next scene a concrete, sayable, in-fiction reason to happen —
   not just a description of what happens there? *[scene-brief.schema.json's own field note, added
   after this project's own real gap: Kit Issue's outro pointed at the wrong scene for a week]*

**B. NPC want & voice**
4. For every speaking NPC, including walk-ons, can you state their want in one sentence — and does
   every line they get serve it? *[dialogue-and-character-voice.md [C]]*
5. Which of the nine motivations (Knowledge / Comfort / Reputation / Serenity / Protection / Conquest
   / Wealth / Ability / Equipment) is each NPC chasing — could you name it without checking?
   *[quests-objectives-and-threads.md, the nine-motivation diagnostic [E]]*
6. Are NPCs differentiated by rhythm, refusal, or what they retreat to under pressure, not just a
   swappable verbal tic? *[dialogue-and-character-voice.md [C]]*
7. Does the first line introducing a new NPC actually tell the table what they're like?
   *[Evangelion/what-makes-it-tick.md, the Sadamoto silhouette test]*

**C. Agency & consequence**
8. Does any outcome get quietly ensured regardless of what the players choose, while implying the
   choice mattered? *[agency-and-player-choice.md, the narrative paradox [T]]*
9. For every beat marked `mandatory`, is there an authored answer for a player refusing it outright —
   not just a fallback for nobody noticing it? *[found live in this project's own dry run of this
   exact scene, 2026-09-09 — see §4]*
10. Does every optional beat give at least one plausible player type a real reason to take it, or does
    it only work for the specific play style it was written for? *[same source]*
11. If a player invents an approach off the authored ladder, does the ladder's own pricing convention
    actually resolve which band it falls in, or does slotting a genuinely new approach still need a
    live judgment call the brief doesn't own up to needing? *[same source, generalized]*
12. Will the player actually notice each consequence that lands, and is something later scheduled to
    make it matter again? *[agency-and-player-choice.md, discernible + integrated [T]]*

**D. Structural shape**
13. If the last two beats were both "go somewhere, ask someone something," does this one introduce a
    want, a complication, a cost, or an actual answer — not another pointer? *[quests-objectives-and-threads.md,
    the breadcrumb chain]*
14. For every intermediate NPC between the party and their actual goal, can you state that NPC's own
    want, independent of the party? *[quests-objectives-and-threads.md, "depth is free, wants are
    not" [E]]*

**E. Place & evidence**
15. Does any descriptive detail exist only to explain the location, rather than being an artefact the
    players have to infer something from? *[environmental-storytelling-and-place.md [C]]*
16. Does the on-screen description lead with a non-visual sense, orient against one stated landmark,
    and — on a return visit — describe only the delta? *[environmental-storytelling-and-place.md [C];
    matches the schema's own `landmark`/`holdInReserve` fields]*
17. For an institution or location with something to hide, is there at least one absence, repair, or
    worn surface written before any of its actual secrets? *[environmental-storytelling-and-place.md [C]]*

**F. Tone calibration (Giant Robo, not Evangelion)**
18. Does any low point, setback, or antagonist function as a destination the scene dwells in, or as
    something it moves through? *[Evangelion/tone-guardrail.md]*
19. If an adult authority figure fails or lets a PC down here, is at least one other adult on-page
    competent and not failing? *[Evangelion/tone-guardrail.md]*
20. Does dark or heavy content stay warm/uplifting rather than sliding into depressing, with comedy in
    the main line rather than quarantined to a separate "silly" scene? *[Giant Robo/ham-and-sincerity.md;
    feedback_tone_giant_robo_not_eva]*
21. What did the players actually get to **do** in this scene — and if the honest answer is "watch,"
    has it been rewritten? *[Evangelion/tone-guardrail.md §6]*

**G. Prose & naming**
22. Does any GM-facing instruction contain a verbless fragment, a referent-less pronoun, or an
    instruction that never states the actual instruction? *[prose-craft-and-naming.md [C]]*
23. Do any two names appearing together in this scene share a first stressed syllable or similar
    shape, risking real confusion at the table? *[prose-craft-and-naming.md [E]/[C] — flagged live:
    Nobu/Nozomi]*
24. Does read-aloud text hold up read aloud — no breath-length failures, no visual-only constructions
    — and does a hard proper noun have a spoken short form? *[prose-craft-and-naming.md [C]]*
25. Is a genre-stock phrase doing the work here, or does the line still produce a concrete image?
    *[prose-craft-and-naming.md [C]/[E,Q]]*

**H. Mechanics grounding**
26. Does any new drawback here permanently shrink a character's menu of options, rather than raising
    the stakes of a dynamic, recoverable risk? *[campaign-arc.md, "penalties cost risk, never choice"]*

### 2.2 Conditional modules — run when the scene has the content for it

**Recurring antagonist / villain** *(a named antagonist appears, revealed or not)*
- Was the escape/survival mechanism shown in-fiction, not just narrated after the fact?
- Does this appearance cost the villain something visible, and does it leave the players something
  concrete and usable next time?
- Does the entrance Announce → Assert → Act, with players able to respond before combat is forced?
- If the antagonist runs a council/cabal, does its code have a known exception, and would losing one
  member leave a vacancy rather than collapsing the organisation?
*[Giant Robo/the-recurring-antagonist-engine.md, the-magnificent-ten-as-an-org-chart.md]*

**Mystery / clue / investigation** *(a scene plants or resolves a mystery-ledger item)*
- Can the eventual answer be reached three independent ways, or does it hinge on one check by one
  person on one night?
- Is the clue a short, portable fact discoverable by whatever method the table invents, rather than
  tied to one specific path?
- Has the actual answer been written down somewhere reachable through play, not only in GM notes?
- If a fact could mislead, is it true-but-incomplete rather than a planted falsehood?
*[ttrpg-campaign-and-session-craft.md §3; mystery-and-investigation-design.md; Evangelion/withheld-information-and-the-ending-problem.md]*

**New mechanic, check, or resource**
- Can you state in one sentence the claim about the world this mechanic enacts?
- What would a pure optimizer do repeatedly because of this reward, and is that person recognizable
  as a protagonist of this story?
- Does every degree of success get stated (or deliberately left silent), without inventing a fifth
  "neutral" tier?
*[mechanics-as-meaning.md; rpg-systems-design.md §3]*

**Downtime / strategy layer**
- Does this option produce a decision, interact with something else on the menu, and avoid strictly
  dominating another option?
- After this scene, can a player name something they wanted and didn't get?
*[strategy-and-downtime-design.md §3, §6]*

**Character creation / chargen**
- Does the question order say what we want the table to believe the campaign values?
- Does this scene cash in at least one existing player-written flag, not just collect new ones?
*[character-creation-and-progression.md §1, §3]*

**Recurring symbol or mark**
- Has it been decided and written down whether this mark decodes to real meaning, or is it filed as
  deliberate decoration?
- Does it appear consistently — same shade, same height, same description — everywhere it's meant to?
*[Evangelion/borrowed-symbolism.md]*

**Institution showing its face**
- Does the institution's wrongdoing read as an accumulation of individually-defensible decisions by
  sympathetic professionals, rather than one villainous act?
- Is any harm here grounded in an ordinary, defensible reason rather than simple malice?
*[Evangelion/the-institution-that-uses-children.md; worldbuilding-craft.md §8]*

---

## 3. The session/arc-level checklist

A session is not just its scenes summed. Several of the findings in §5 below are only visible once
you look across all of Episode One's scenes at once — no single scene brief contains them.

**A. Jo-ha-kyū & tonal rhythm**
1. Plotting the session's major beats up/down/lateral, is there a deliberately-designed relax beat,
   not just a run of consecutive downs? *[pacing-and-the-responsive-campaign.md, the sawtooth [C]]*
2. Does the session end faster than it opens, rather than trailing into slow tidying-up?
   *[japanese-narrative-conventions.md §2]*
3. What was this session's single most intense moment — and if nothing clearly qualifies, has that
   absence been noticed? *[pacing-and-the-responsive-campaign.md, peak-end [E]]*
4. Does the session's own shape nest correctly inside the campaign's larger jo-ha-kyū, or does it
   borrow the wrong register for where the arc actually is? *[japanese-narrative-conventions.md §2]*

**B. Required beats & design requirements**
5. Does every item in the episode's `requiredBeats` and `designRequirement` actually get delivered by
   at least one constituent scene, traceably — not just "probably"? *[episode.schema.json's own
   fields]*
6. Is there a stated theme or value this session cares about with no mechanical reward attached — and
   if so, is it losing by default to something that does pay? *[mechanics-as-meaning.md, incentive
   design [C]]*

**C. NPC cast coherence**
7. Across the session's full adult NPC cast, does each one have a distinct, nameable want — or would
   two of them blur if you swapped their dialogue? *[dialogue-and-character-voice.md +
   quests-objectives-and-threads.md, checked across the roster, not just per-scene]*
8. Does the cast include at least one warm, competent, succeeding adult — not every institutional
   adult failing, deflecting, or withholding? *[Evangelion/npc-archetype-catalogue.md §7,
   tone-guardrail.md]*

**D. Thread & clue tracking**
9. For every plant seeded this session, is its eventual payoff chapter actually assigned, or still
   unassigned? *[ttrpg-campaign-and-session-craft.md, "every mystery introduced is a debt"]*
10. Does the same recurring mark or symbol appear with visual consistency across every scene it's used
    in this session? *[Evangelion/borrowed-symbolism.md]*

**E. Systems grounding (Layer 0 first)**
11. Does the session's combat encounter stand up as a defensible pure-SF2E encounter — stat blocks, XP
    budget, terrain — before any of this campaign's own systems are layered on? *[design-layers.md]*

**F. Structural variety**
12. Does the session contain at least three genuinely different kinds of challenge, not five
    conversations or five fights in a row? *[quests-objectives-and-threads.md, the five-room
    structure [C]]*
13. Is at least one scene authored on purpose as a breather with nothing at stake? *[environmental-storytelling-and-place.md,
    spatial rhythm [C]]*

**G. Tone across the whole arc**
14. Taken together, do this session's institutional-friction beats cumulatively read as "the system
    fails you and nothing else," or does something in the session balance that? *[synthesis of
    Evangelion/tone-guardrail.md + the-institution-that-uses-children.md against Giant Robo's warmth
    requirement]*
15. Does the session hold at least one moment of genuine multi-character ensemble teamwork, not just
    parallel private spotlights? *[Evangelion/npc-archetype-catalogue.md §7]*

**H. Completeness**
16. Does every scene the episode's `scenes[]` array references by `briefRef` actually resolve to a
    written file? *[episode.schema.json]*
17. Does every item in the episode's `danglingThreads` carry a sense of who owns it and when it gets
    picked up, even if the exact chapter isn't fixed yet? *[episode file's own field]*

---

## 4. Worked example — `episode-c1e1--intake-medicals`

Chosen deliberately: this is the one Episode One scene `scene-simulation-testing.md` already ran a
full adversarial dry run against, on 2026-09-09, and confirmed four real gaps. Running the checklist
against it first means the checklist itself gets checked against a known, already-verified answer key
before it's trusted on scenes nobody's play-tested yet. Full scene content is in
`data/scene-briefs/episode-c1e1--intake-medicals.json`; findings below cite beat/field names from
that file directly.

**A. Wiring — CLEAR.** `carriesIn` states plainly what changes ("this scene is a different first: the
first time any of them speak to each other. Do not repeat the arrival prompts here"). `the-flag` is
gated `after: one-at-a-time`; `all-six` is gated `after: the-flag`, with three explicit ranked
fallbacks if the realisation doesn't emerge on its own — stronger wiring than the checklist asks for.
`transition.line` is concrete and sayable.

**B. NPC want & voice — CLEAR, one exemplary.** Shucks's want ("to do forty medicals properly rather
than quickly... he has done ten thousand of these and is still interested in every one") is explicit
and every listed topic serves it; his one hard line is stated with a *why* ("He is forbidden, he
thinks the rule is stupid, and both show"). His nine-motivation fit doesn't sit cleanly on any of the
five genre-typical wants (Conquest/Equipment/Knowledge/Protection/Serenity) — closer to a personal
Ability/Serenity blend — which is itself a small, organic hit against the under-used-lane finding.
Opening line ("Name. Not the one on the form — the one you actually use") passes the silhouette test
cold.

**C. Agency & consequence — two CONFIRMED gaps, one partial.**
- **Q9 (mandatory-beat refusal floor): OPEN.** `one-at-a-time` and `the-flag` are both
  `mandatory: true`. Nothing in the brief answers "a character refuses the medical outright" —
  exactly what the 2026-09-09 dry run found: *"Nothing anywhere addresses a flat refusal of a
  mandatory beat... a less confident GM has no floor here at all."*
- **Q10 (optional-beat coverage): OPEN.** `form-12b` is `mandatory: false` and, per the dry run,
  *"landed for exactly one persona... and was invisible to the other five, who had a form to fill in
  and no reason to linger."* The joke is good in isolation; nothing else in the scene gives a
  non-NPC-engaging player a reason to take it.
- **Q11 (novel-approach pricing): PARTIAL.** `what-does-irregular-mean`'s note *does* generalize a DC
  ladder (13/15/17/20) for an invented approach — the mechanism exists, which is more than the other
  two findings can say. But the dry run still needed a live call ("which skill, and is a bystander
  'the obvious way' or something else?") to slot Fen's actual invented approach into a band. The
  ladder is necessary but not sufficient; categorizing a genuinely new approach still asks the GM to
  invent the thing the brief implies is already resolved.
- **Q12 (discernible + integrated): CLEAR.** The flag is told directly and privately (discernible) and
  explicitly tagged "PLANT — mystery ledger #1, pays off Chapter 6" (integrated, deferred at the
  standard distance). *(Stale then, and since fixed: that chapter belonged to a deleted draft. The brief
  now leaves the payoff chapter deliberately unassigned, as does the Mystery Ledger, `quarantine/ideas/story/blank-inheritance-ch1-v2.md` §5.)*

**D. Structural shape — CLEAR.** Not a breadcrumb repeat (the-road-in was personal spotlights, not
"go ask someone"); this scene introduces a want, a complication, and a real outcome. The one
intermediate NPC (the clerk) has a want proportionate to a walk-on.

**E. Place & evidence — one CLEAR exemplary, one fresh finding.**
- Form 12-B's pre-printed IRREGULAR checkbox is textbook evidence-not-exposition — *"the party is
  meant to notice a printer's decision, not a conspiracy"* — and the two-departments-haven't-spoken
  detail is an institutional wear-mark shown before any real secret. Both clear the bar precisely.
- **New finding, not previously flagged anywhere:** the scene's `intro` block never populates
  `landmark`. A queue is inherently spatial — who's ahead of whom, where the doctor's door actually
  is — and nothing anchors it. The schema's own field description warns this fails silently: *"theatre
  of the mind fails silently without this, because a position relative to nothing is not a
  position."* Worth a one-line fix (e.g., "the doctor's door, second from the end") next time this
  file is touched.

**F. Tone calibration — CLEAR.** No low point to dwell in; Shucks doesn't fail anyone; Form 12-B keeps
the institutional satire warm and load-bearing rather than quarantined. Players queue, banter, get
examined, and deduce something together — active throughout, no pure-witness stretch.

**G. Prose & naming — CLEAR.** No name collision within this scene. Read-aloud text scans fine aloud.
"Look at the light, not at me" is specific, not stock.

**H. Mechanics grounding — N/A.** No new permanent penalty.

**Mystery module — CLEAR, exemplary.** `all-six`'s three ranked fallbacks are a textbook Three Clue
Rule satisfaction, and the dry run independently confirmed it: *"needs no fixing... the one beat that
needs no fixing"* (with the caveat that it worked partly because bonding had already happened
earlier). `the-form-itself` is genuinely method-agnostic ("asking the clerk for a spare... works and
is funnier"). Shucks gives up one true thing even while deflecting the deeper question ("It's a
screen. Screens flag things. You're fine.") — exactly the withheld-information rule.

**Institution module — CLEAR, exemplary.** Form 12-B's redundant boxes are explicitly framed as
*"two centuries of an institution that has never been tested and has never thrown anything away"* —
cumulative administrative decay, not any one villain. The flag itself is framed as routine sorting
nobody thought to question, matching "ordinary flinches, not malice" precisely.

**Net result:** 2 confirmed open findings (already known from the dry run — this checklist would have
surfaced both *before* that run cost a session to produce them), 1 partial finding refined into a
sharper question, 1 brand-new finding (the missing `landmark`), and several passages worth explicitly
protecting as models for future scenes (Shucks's want, the all-six redundancy, Form 12-B's evidence
work). That's the pitch in miniature: cheaper than a dry run, and it still found something a dry run
missed.

### Spot-check — the Villain Craft module against `the-errand`

Intake-medicals has no antagonist, so the villain module doesn't apply there. `the-errand` does — it's
Manako's first appearance, deliberately undisclosed as the campaign's antagonist. Running the module
against it mostly returns **not yet applicable, correctly**: rules about a shown escape mechanism, a
paid cost, and Announce-Assert-Act assume a *revealed* antagonist's return appearance, and Manako
hasn't been revealed yet. What *is* checkable now already passes: the brief's own GM-only notes
independently police exactly what the module would ask for on a first, undisclosed appearance ("No
pause, no significant look, no watching them leave"), and the parting gift — a way to contact him
again — is precisely the module's rule 4 ("hand players something concrete and usable next time"),
arrived at independently. Worth carrying forward as a note for whenever Manako is eventually revealed
and recurs: rules 1, 3 and 5 (a shown escape, a paid cost, a consequence left on the record) become
live the moment he does.

---

## 5. Worked example — Episode One as a whole (`episode-c1e1-mothers-maiden-name`)

*Written earlier the same 2026-09-19 session, against the state of the episode at that point (five of
six scenes written, `flood-tunnel` outlined but not yet a brief). Corrected 2026-09-19, later the same
day: `flood-tunnel` was already real — built 2026-09-09 (`data/scene-briefs/episode-c1e1--flood-tunnel
.json`, commit `f843579`) — then further extended in the `/goal` pass that followed this audit, with
refusal floors, a `choicePoint`, and morale/surrender grounding. Findings below are corrected in place
where they were about flood-tunnel's absence specifically; nothing else in this worked example has been
re-run against the real, now-six-of-six-scene episode, and a fresh full audit of the flood-tunnel
brief's own content against §2's checklist is a legitimate follow-up this correction does NOT claim to
have done.*

**A. Jo-ha-kyū & tonal rhythm.**
- **OPEN, worth a conversation.** Scoring the five written scenes: the-road-in (curious/neutral),
  intake-medicals (warm, up), kit-issue (brisk, up), the-errand (mild sting → big win, net up),
  canteen (warm → deliberately cold ending). Four ups in a row, then one deliberate down — and then,
  per the episode's own transition, *straight into the fight* with nothing between the cold ending and
  combat. This is exactly the shape the pacing doc's own worked example flags as a missing scheduled
  relax beat. It might be intentional — momentum into the first fight is a real, legitimate choice —
  but it's worth being a decision rather than a default. **Not resolved here; flagged for you.**
- **Corrected 2026-09-19.** At the time this was written, the (then-unwritten) flood-tunnel scene was
  *planned* to end on "a long rest... realising, over the water, that they were all flagged" — a
  genuine tempo deceleration. The real, built brief does NOT do this: the episode file's flood-tunnel
  entry now explicitly reads *"the six of them do NOT re-realise they were all flagged here (that
  happened at Intake Medicals); the close is a new, escalated inference instead, per ch1-v2.md's own
  correction."* Confirmed by direct read. Still a tempo deceleration; the specific content changed.
- Episode One as the campaign's own "jo" — warm, procedural, low-stakes — is correctly pitched for
  where the campaign's arc actually is.

**B. Required beats & design requirements — CLEAR, cleanly traced.** All three `requiredBeats` trace
to actual content (the flag + all-six in intake-medicals; Manako's whole arc in the-errand). Every
`designRequirement` item holds across all five written briefs, including the negative one — no leaked
reference to Frames, the Watcher, Cicada, the mitflits, or the Gap anywhere in player-facing text.
- **OPEN finding.** Canteen's `outro.tracks` is an empty array (`[]`), despite the scene's entire
  content being Taka's introduction and the party's first contact with the wider trainee body — exactly
  what the `bonds` track exists to capture, and exactly what intake-medicals *did* award for its own
  bonding beat. This is the incentive-design principle showing up as a literal gap in real data: the
  session's stated value (making the table like each other) isn't mechanically rewarded in the one
  scene built entirely around it.

**C. NPC cast coherence — CLEAR, worth protecting.** Shucks, Nobu, Taka and Manako are all warm
adults, but warm via four genuinely different mechanisms — professionalism, momentum, assertion, and
starved sincerity, respectively. No two would blur if swapped. All four are competent and none fails a
PC, so there's no live risk of "all adults fail" *within this session* — though that's worth tracking
across the whole campaign, not just here, since Episode One is unusually adult-warm by design.

**D. Thread & clue tracking.**
- The flag → Chapter 6: assigned. The Frame-at-a-distance sighting → Ledger #11, Ch3/Ch6: assigned.
  *(Both were already stale: those chapters belonged to a deleted draft, and every Mystery Ledger
  payoff is unassigned, `quarantine/ideas/story/blank-inheritance-ch1-v2.md` §5.)*
- **OPEN.** The violet cicada mark → Ledger #6, and the-errand's own note says so directly: *"Payoff
  chapter is currently unassigned."* Surfaced here mainly to keep it from becoming invisible once it's
  no longer the newest thing written.
- The mark's visual consistency (same shade, same height) is explicitly instructed across both
  sightings — clean pass.

**E. Systems grounding.** *(Cut 2026-09-20: the ground roles. This finding, about Kit Issue declining to build on them, was removed from this document 2026-09-25.)*

**F. Structural variety — CLEAR.** Five distinct textures across five written scenes (personal
spotlight, slow one-on-one social, fast transactional, social problem-solving, loud-then-cold social)
before combat is even counted. Kit Issue and the-errand are both explicitly authored as deliberate
breathers.

**G. Tone across the whole arc — the same open question as §5A, from a different angle.** Three
institutional-friction beats this session: Form 12-B (played for a laugh, no cost), the fool's-errand
hazing (turned into a *win* for the party, at the officer's expense), and Canteen's flat no-choice
assignment (stays a real, unsoftened sting). Two of three resolve as "the system is absurd but
beatable" — correctly Giant-Robo-coded. The third doesn't resolve at all this session; it's a real
open sting by design ("don't let anyone talk their way out of it"). That's probably fine — it's one
beat, not a pattern — but it's the same beat identified in §5A as going straight into combat with no
cushion. Worth deciding together whether that's the intended shape or wants a small release valve
before the drain fight.

**H. Completeness — one RESOLVED, one still OPEN, both mechanical.**
- **RESOLVED 2026-09-19.** The episode's `scenes[]` entry for `flood-tunnel` carries
  `briefRef: "episode-c1e1--flood-tunnel"`, which was correctly flagged here as resolving to nothing —
  true when this was written, no longer true. The file exists; confirmed by direct read. Left in as a
  worked example of exactly the kind of gap this audit is good at catching mechanically, now with its
  own resolution as a second data point.
- Three of four `danglingThreads` carry no explicit ownership/timing note beyond prose context (the
  blacked-out charter paragraph has neither a Ledger number nor a stated chapter, unlike the cicada
  mark). Low urgency, but worth the same one-line discipline once it's touched again. *(The charter paragraph has since been cut, LEDGER #41.)* Unaffected by the
  flood-tunnel correction above — not re-checked as part of it.

**I. What this needs — corrected 2026-09-19.** The session's only real test of *mechanical* ensemble
teamwork — six PCs' actions combining tactically, not six private conversations with one NPC — was, at
the time this was written, an unwritten flood-tunnel fight. It is written now, and per §3's checklist
item 15 the built brief does give the fight a mechanical role split (compactor-cycle hazard control vs.
combat) rather than uniform attacking. Whether it actually lands as *ensemble* play at the table, and
whether it holds up against the rest of §2's checklist, is not something this correction verifies —
that's the fresh audit pass flagged at the top of §5, not done here.

---

## 6. What the checklist validates about itself

Two of intake-medicals's four already-confirmed dry-run gaps (mandatory-beat refusal, optional-beat
coverage) aren't derivable from the craft library at all — they're project-specific patterns that only
became visible by actually running the scene adversarially. They're in the checklist now because
they're real and confirmed, not because a shelf document said so; the citation for both is the dry run
itself. That's worth being honest about: **this checklist gets better by feeding real findings back
into it, the same create → analyse → critique → evolve loop this project already runs everywhere
else.** It isn't a finished artifact so much as a first, well-grounded draft of one.

---

## 7. Proposed mechanism — not built yet

Everything above is usable today, by hand, in conversation. Turning it into "runs automatically at
scene-generation time, attaches to the scene, clears only with Ingram" is a separate, smaller-than-it-
sounds build, once the checklist itself has been reviewed. Sketched here so the shape is on the record
before it's built — **none of this is implemented**.

**Most findings don't need Ingram at all.** Looking at what actually came out of §4–§5: the missing
`landmark`, the empty `tracks` array, the unresolved `briefRef` are concrete, mechanical, one-line
fixes — exactly the kind of thing already covered by *"you have full standing permission to write and
change anything... you try to flesh out carefully"* from `approvals-desk.md`'s founding brief. Routing
every single one of those through a human review queue would be the same mistake `approvals-desk.md`
§1 already diagnosed in the gazetteer's dead review mode: a queue nobody clears because most of it
doesn't need clearing. The audit should **fix what's fixable and only surface what's a genuine
judgment call** — §5A/§5G's "is the cold-into-combat transition intentional" is a real creative
question; a blank `landmark` field is not.

**The genuine judgment calls are `lifecycle` fields, same as `authoring.status`.** `design/data-ownership.md`
already names the shape: the repo may only ever write the baseline (here, `open`), and exactly one
authority — Ingram, in conversation, same as today — may write `cleared`. A real open finding
(§5A's pacing question) is a small, scene-or-session-scoped instance of exactly what
`data/campaign/open-questions.json` already holds; the honest move is very likely to **feed genuine
audit findings into that existing queue** rather than inventing a seventh one, which is precisely the
mistake `approvals-desk.md` §6 catalogued six other systems already making independently.

**Sketch, for when this gets built:**
- A generator runs the relevant checklist (core + whichever conditional modules the scene's content
  triggers) the moment a scene brief is drafted, same trigger point as everything else in the
  content pipeline.
- Each question resolves to `clear` (nothing wrong), `fixed` (a concrete craft fix, applied and
  recorded — no Ingram needed), or `open` (a real judgment call). Only `open` items need a human.
- `open` items file into `open-questions.json` if they're a standing design question worth tracking
  past this one scene, or stay scene-scoped and get cleared inline in conversation if they're a
  one-off ("is this OK as written, yes/no").
- The critique itself lives as a sibling file, `data/scene-audits/<episodeId>--<sceneId>.json`,
  mirroring how `scene-briefs/` already sits alongside `episodes/` — not embedded in the brief itself,
  so re-running the audit after a fix doesn't touch the content file's own diff.
- The Approvals Desk (once built) is a natural home for showing "N open audit findings" alongside a
  drafted scene, the same way it already proposes to show "what I was unsure about" per
  `approvals-desk.md` §4.

This is deliberately not built yet. It touches a schema, a generation-pipeline trigger point, and
(per `design/data-ownership.md`) needs an `OWNER:` declaration the moment it exists — worth Ingram's
actual sign-off on the shape before it's real, which is a fittingly recursive way for this particular
document to end.

---

## 8. Status of this document

**A proposal, not a decision**, same as everything upstream of it in this project. The two checklists
in §2–§3 are the actual deliverable asked for and are usable immediately, by hand. §4–§6 exist to
prove the checklist has real teeth rather than just plausible-sounding categories. §7 is a sketch, not
a build — the next real step is Ingram reading the checklist itself and telling me what's missing,
what's noise, and whether the §7 mechanism is the right shape before any of it becomes schema and code.

---

*Related: [scene-audit-question-bank.md](scene-audit-question-bank.md) (the full raw research this
distills); [craft-library.md](craft-library.md) (the source documents); [scene-simulation-testing.md](scene-simulation-testing.md)
(the heavier tier this sits beneath); [approvals-desk.md](approvals-desk.md) and [data-ownership.md](data-ownership.md)
(the sign-off and field-ownership conventions §7 borrows from); `data/campaign/open-questions.json`
(where genuine judgment-call findings should probably end up).*


---

## 8. The loop, and the tool that runs it

§1–§7 are the checklist. This is the procedure, and it is the thing that actually
gets a scene finished: **write → critique → fix → re-examine → fix → verdict**,
one scene at a time, not one pass across all of them.

### The tool

```bash
node tools/scene-audit/audit.mjs episode-c1e2--the-board
node tools/scene-audit/audit.mjs --episode episode-c1e2-scheduled-exercise
```

It runs the mechanical half of this document — wiring, NPC want and voice,
agency, place and read-aloud, variety, mechanics grounding, payoff integrity,
strategy-layer movement — and prints findings grouped by category so a finding
traces back to the craft document that motivated it.

**A finding is a question, not a defect.** That distinction is the whole design.
`test/tier2-scene-prose-style.test.mjs` holds the rules safe to fail a build on:
the ones with no false positives. This tool holds everything else, including
checks that will sometimes be wrong about a scene that is correct.

### The escape hatch, and why it is documentation rather than a flag

When the answer to a finding is "correct as written", say so in that scene's own
`notes` — or its challenge's — using the word the audit uses: *landmark, track,
temptation, carriesIn, optional beat, skill route*. The audit then stops raising
it.

This is deliberate. A scene that is deliberately missing something has a *reason*,
and the reason is worth more to the next reader than a suppression flag would be.
Three real examples now in the corpus:

- **The Road In** has no landmark and moves no track. A montage across six towns
  has nothing shared to orbit, and a scene set before the party has met the
  institution, each other or the city has nothing on the strategy layer to move.
- **Intake Medicals**' main ladder is five single-skill checks. That is five
  different *approaches* to one fact — asking him straight is Diplomacy, watching
  him is Perception, taking the form is Thievery — and widening each rung to four
  skills would make the five routes interchangeable and delete the design.
- **Assembly** has three cast members with no voice samples and no hard line. They
  are `walkOn: true`: silent figures visible in a line with their rank legible,
  and writing them dialogue here would be the actual defect.

### Then `test/tier2-scene-audit.test.mjs` holds the line

Once every scene in an episode has been taken to zero findings by hand, the useful
assertion is that it **stays** at zero. That test fails if a new scene, or an edit
to an old one, quietly reintroduces a category somebody already worked through.

### What the tool cannot do, and what found the last two defects

Both of the most interesting findings in the pass that produced this section came
from **reading the prose**, not from running anything:

- `"not X so much as Y"` appeared in two adjacent scenes. Two is where a
  construction stops being a choice and becomes a habit, so the ratchet went on at
  two — the previous attractor was caught at sixty-nine.
- A payoff can be perfectly wired and still be dull. Nothing mechanical tells you
  that a scene's central anomaly — three contacts with no approach vector, two time
  stamps in the wrong order — has no beat letting a player pull on it. That was
  four action beats and no curiosity reward, and it needed a new check, not a fix.

**Run the tool first, then read the scene yourself before calling it done.** The
tool clears the mechanical problems out of the way — date stamps, broken refs,
missing fields, a DC off the ladder. It cannot tell you whether the scene is any
good, and a clean report is not evidence that it is.


---

## 9. The emotional arrow pass

From `pacing-and-the-responsive-campaign.md` §6, heuristic 10: **"Alternate the
emotional arrows. A run of consecutive downs is a fault to fix, not a mood to
accept."**

This is an episode-level check and it cannot be automated, because the arrow is a
judgement about what the scene *does to the party* rather than anything in the
data. Run it by hand at the end of an episode: mark every scene `+`, `-`, `~`
(neutral/relax) or `+/-`, write the sequence out in one line, and read it.

### What the pass found

**Episode One** — `~ + + ~ + + - ~ +/- ~ +`
Longest run of downs: **1**. No fault. The shape is a warm opening day with one
sour patch in the middle (The Errand) and a win at the end.

**Episode Two, before the fix** — `- - ~ +/- + + +/- + + + ~ - - -/+ ~`
Longest run of downs: **2, at scenes 1 and 2** — the only such run in either
episode, sitting at the opening, which is the worst possible place for it. As
Discussed takes the credit for what they did; The Board then makes that theft
concrete as a fortnight of timetable.

### The fix, and the principle behind it

**The punishment was not softened.** The Board already contained a real gift — the
first unstructured time any of them has been given, because Episode One is
scheduled end to end and deliberately contains none. Every piece of that scene's
framing had buried it: *"by losing one"*, *"slots run out"*, *"let a slot get
taken"*. The single word carrying the gift was "Most."

The fix was to run the gift and the theft **as the same fact, in that order** —
they see an empty box with their own name against it, and then, thirty seconds
later, somebody quicker takes a slot they wanted. Both halves were already true.
Only one was reaching the GM.

**The general rule:** when a scene reads as a flat down, check first whether it
already contains its own up-note and the framing has hidden it. Adding a
consolation is a worse fix than surfacing something real that is already there.

### The cross-episode half

That gift only reads as a gift because of what Episode One does *not* contain.
The contrast is now stated in The Board's own `carriesIn`, so a GM running
Episode Two knows why an empty box is worth anything — which is the kind of
alignment that only shows up when both episodes are read as one body.

### Not every run of two is a fault

Re-running the pass after the fix gave `- +/- ~ +/- + + +/- + + + ~ - - -/+ ~`.
The opening run is gone. There is still a run of two at scenes 12–13 — Unidentified
Contact and First Contact — and it stays.

**The distinction heuristic 10 is actually about is drift, not descent.** The
opening pair was a run nobody chose: two scenes that each independently took
something from the party, landing back to back at the worst possible moment. The
climactic pair is authored — the turn, then the fight — and it is answered
immediately by The Hammer (`-/+`) and closed on a quiet scene (`~`).

A run of downs is a fault when it was drifted into and nothing resolves it. A
climax that descends for two scenes and then turns over is the shape working. **A
future arrow pass must not "fix" scenes 12–13.**

---

## 10. The corpus passes — what no per-scene check can see

Added 2026-09-21. Both episodes had already been taken to **zero findings** by
the per-scene audit and by the §8 loop, and the material still had a real
defect, because the defect only exists when you look at all 62 checks at once.

### 10a. The skill attractor

**Society was offered on 41 of 62 checks — 66% — across 22 of the 24 challenge
files.** It was never the only option on any of them.

Never-required-and-always-available is the worse shape, not the better one. It
teaches a table that whoever has the best modifier in that skill is the answer
to everything, and leaves nineteen other skills competing for the remaining
third. The *fictional* variety of the scenes survives that. The **player-facing
variety does not**, and player-facing variety is the point.

The fix was not to ban the skill. Society stayed wherever the thing being done
really is civic or institutional knowledge — reading a charter, a duty roster,
a signals report, a signing hierarchy, a curriculum — and went wherever it was
standing in for "this character is socially competent," which Diplomacy
(Gather Information), Perception (Sense Motive) and Deception already cover.
36 checks were rewritten. Where a check lost an option it gained one that
names what the character is actually doing, which is where the neglected
skills came back: Performance, Stealth and Thievery were on 3, 2 and 1 checks
respectively across two entire episodes.

**Pruning it then made Perception the attractor at 48%** — the identical
failure under a different name. Twelve further checks were pruned. The top
skill now sits at 35% across nineteen skills.

Guarded by `test/tier2-skill-spread.test.mjs`, which fails if any skill passes
40%, if fewer than fifteen distinct skills are in use, or if a single-skill
check appears outside the per-player medical scene (where eight of them are
deliberate — that scene is a menu of eight things *one* player can do, not
eight routes through one obstacle).

### 10b. The activity histogram, which is the harder one

A skill tally is a proxy. The thing it is standing in for is **what the player
actually does**, and two activities can wear different skill names and still
be the same act at the table.

When first measured, the corpus contained **14 "look at a thing and work out
what it really says" checks out of 62 — 23% of all player agency in two
episodes going through one verb.** It is a good verb and the campaign is about
institutions, so some concentration is correct. A fifth is too much, and no
per-scene audit can see it, because in any single scene it looks like exactly
one check.

Two passes brought it to **13 of 62 (21%)**, and the interesting part is what
each pass could and could not do.

**Assembly was the clear failure and was rebuilt.** All three of its checks
were the same act — read the line of staff, read the founding charter, hear
what the crowd is saying — so a player could spend twenty-five minutes
learning a great deal and changing nothing. Worse, its charter check duplicated
one in Intake Medicals, two scenes earlier in the same episode, and the
medical's is better: private, physical, one person, and noticing paint over a
paragraph is a different act from reading the text under it. The Assembly
charter check was deleted and the charter left on the wall as a second
sighting, which is free and better — the same document in public, above a
platform, with the redaction visible from the third row and four hundred
people not looking at it.

What replaced it is **an act, not a look**: the room sings an anthem that
everybody present learned as a child, and the party did not. Offered only to a
player who says they are doing something about it, never announced, nothing at
stake for anyone who stands there mouthing along. It is the first moment in
the campaign where being new is a liability in a room rather than a fact on a
form.

**The four "read a person" checks in Episode One were NOT cut**, because each
one establishes a character the campaign needs: Shucks in the medical, the
staff line at Assembly, Manako in the tea house, the Section Officer in the
canteen. Cutting a good check to improve a statistic is the wrong trade. What
was wrong was that three of the four shared the identical skill pair and a
synonymous name, so at the table they played as "roll Perception to read the
guy" four times in one evening. Each now has its own route for its own reason
— an organisation is read differently from a body, and a body differently from
a performance.

**The rule that came out of it:** when a verb clusters, first ask whether the
checks are redundant (Assembly's were — delete one, replace the other with an
act) or merely identical in execution (Episode One's person-reads were — give
each its own route). Only the first is a content problem. The second is a
presentation problem and is cheaper to fix than it looks.

### 10c. The method this generalises to

Before declaring a run of scenes finished, count something across all of them
that a single scene cannot show you:

1. **Skill spread** — is one skill on more than 40% of checks? (Automated.)
2. **Activity spread** — write down the verb for each check in plain words
   ("read a person", "climb a thing", "talk somebody round", "make something
   work"). Does one verb own more than a fifth of them?
3. **Mode spread** — Episode One is 8 social of 11 scenes; Episode Two is 7 of
   15 with three exploration and three downtime. The second is the better
   shape and the first is the older material.
4. **Check density against runtime** — a 20-minute scene with one check is a
   scene being talked at rather than played. The Hammer is the current example
   and is deliberate; a second one would not be.

### 10d. The measure that kept flagging good scenes

Three scenes in a row came up as "low agency" and all three were fine. The
measure was wrong, not the scenes, and the reason is worth keeping.

This campaign leans hard on a structure where the GM goes round the table and
gives each character their own version of one beat: six bespoke questions from
the Deputy Director in The Hammer, six crew chiefs in Familiarisation, six
physical states in Zero Six Hundred, six people saying one thing in character
in the medical queue. **That is six moments of spotlight, and every structural
measure counted it as one beat of narration.**

A structure no tool can see is a structure that eventually gets "fixed". So it
is named now: `delivery: "each"` in `scene-brief.schema.json`, alongside the
`table` / `solo` / `passive` that were already there. Eleven beats across both
episodes carry it.

`test/tier2-scene-agency-shape.test.mjs` holds both halves: the measure counts
`each` beats, and a new go-round written in prose but left untagged is caught
before it drags a scene under the threshold. It found two that had been missed
on the first sweep, one of them because the tagging pass judged the beat by its
id (`the-queue`) instead of reading its direction, which says in as many words
"go round the table once."

**Two more measurement failures in the same family, both worth remembering:**

- **A per-player check is not one check.** The Hammer was flagged as "twenty-
  five minutes with a single check" and that single check is six rolls with a
  different question for each character. Intake Medicals' eight single-skill
  checks are the same shape in reverse: a menu of eight things *one* player can
  do, not eight routes through one obstacle.
- **The biggest decision in two episodes was invisible.** Familiarisation's
  `the-pick` — which machine each character takes for the rest of the campaign
  — was an ordinary prose beat with no `choicePoint`, so nothing could see it
  and the scene read as low-agency at thirty to forty minutes long. Worse, one
  of its three legitimate options (take nothing and stay on the ground, a full
  track and not a consolation) existed only in the scene's notes and was not
  offered at the moment of choosing. It is a real `choicePoint` now, with all
  three tracks and their consequences stated, a refusal floor for a player who
  is not ready to decide, and priced guidance for the fourth option a table
  invents.

**The general lesson.** When a measure flags something, check the measure
against the thing before changing the thing. Two of the four scenes this pass
flagged needed no change at all, and one of the two that did need work needed
the opposite of what the flag implied — not more checks, but the decision it
already contained written down as a decision.

### 10e. The prose said it was a decision and the data did not

Four beats across both episodes described themselves, in their own GM
direction, as the scene's real decision — and carried no `choicePoint` at all.
In their own words:

- *"This is a real, cheap, consequential choice and it belongs to the players
  entirely."* (The Override)
- *"This is the scene and it is a real decision, not a test."* (As Discussed)
- *"This is the largest decision the party has made in the campaign so far and
  it belongs entirely to them."* (Unidentified Contact)
- and Familiarisation's `the-pick`, which said nothing of the kind and is the
  moment each character chooses the machine they will pilot for the rest of
  the campaign.

Two of those are the biggest decisions in either episode: which machine each
character takes, and whether six fifteen-year-olds disobey a direct order to
go and get forty people off a road.

**The prose was never wrong. The data just did not agree with it, and the
panel renders the data.** `choicePoint` exists precisely so the Scene Runner
shows the GM a fork visibly instead of burying it in a paragraph — it was
added for that reason, in those words. A fork that lives only in prose arrives
at the table as narration.

All four are real choicePoints now, with every option's consequence stated,
priced guidance for the option a table invents, and a refusal floor wherever
the beat is mandatory. Familiarisation's gained a third option that had been
sitting in the scene's notes rather than being offered at the moment of
choosing: take nothing, stay on the ground, and be a full participant for the
whole campaign.

Guarded by `test/tier2-choices-are-choices.test.mjs`, which also holds the
three beats that say something choice-shaped and are correctly plain prose —
a teacher describing an institution's choice, an optional beat about sitting
alone in a dark cab, and Slack Water's `the-wall`, where how six people spend
a window that is too short is the spine of a forty-minute scene rather than a
fork at one moment. That list is itself checked for rot, so it cannot quietly
become a place to dump findings.

**The method, again:** search the corpus for beats that *claim* something
about themselves and check whether the data backs the claim. It found this in
one pass, across twenty-six scenes, and no per-scene read had caught it in
four separate sittings.
