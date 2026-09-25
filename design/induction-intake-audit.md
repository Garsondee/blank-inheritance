# Induction Intake Audit — Coverage and Question Load

*Written 2026-09-18, at Ingram's request: a complete audit pass on the induction terminal's
narrative/identity content, against two questions — (1) do we get a full picture of the character,
the way a reasonable university/military induction would try to, and (2) are we asking too many RP
questions across too many subjects, where fewer focused ones plus one big optional field would serve
better. Analysis and recommendation, not a decision — see §5.*

---

## 0. Scope

**In scope:** Page 7 (Finishing Details) and Page 8 (The Eight Questions) of
`module/blank-inheritance/scripts/foundry/induction-terminal.mjs` — the identity fields, the three
"banal" texture questions, and the bible's eight intake questions. This is the narrative half of the
terminal.

**Out of scope:** Pages 2–6 (ancestry, background, class, attribute boosts, portrait) are real SF2E
mechanical chargen, already grounded against `tools/character-builder/derive.mjs` and the SRD, and
raise a completeness/load question of a totally different kind (get the crunch right vs. don't
over-ask). Not audited here. The medical scene with Shucks Mordant (`design/induction.md` §3) asks
its own two or three questions, but it's GM-run tabletop roleplay, not a form field — noted below
only where it overlaps with what the terminal already asks, so the two don't duplicate each other.

**Sources read:** `design/induction.md`, `design/induction-terminal.md`,
`data/campaign/induction-intake-prompts.json` + its schema, `data/schema/kid.schema.json`,
`module/blank-inheritance/templates/induction/page7-finishing.hbs` and `page8-questions.hbs`,
`module/blank-inheritance/scripts/core/induction-intake.mjs`,
`ideas/entries/character-creation-intake-form.json` (the accepted idea this feature was built from),
and `design/character-creation-and-progression.md` §1–3, which already did a first pass on the eight
questions specifically and is cited rather than repeated below.

---

## 1. Current inventory — every field the terminal asks, today

**Page 7 — Finishing Details** (identity, chip-assisted free text unless noted):

| Field | Required? | Subject |
|---|---|---|
| Name | **Yes** — the only required field in the whole terminal | Identity |
| Pronouns | No | Identity |
| Gender identity | No | Identity |
| Appearance notes | No | Physical description |
| Languages (multi-value tag list) | No | Mechanical (feeds `derive.mjs`'s input shape directly) |
| Banal Q1 — "What's the first thing you unpack, and the last?" | No | Packing/logistics texture |
| Banal Q2 — "What do you actually think of the canteen food?" | No | Institutional-life texture |
| Banal Q3 — "Who's the first person here whose name you bothered to learn?" | No | Social-starter texture |

**Page 8 — The Eight Questions** (bible §20, verbatim, chip-assisted free text, all optional):

| # | Text | Subject |
|---|---|---|
| 1 | Who do you love, and what would you never tell them? | Relationship + secret |
| 2 | What are you good at that has nothing to do with piloting? | Skill (its mechanical hook, ground-role affinity, was cut 2026-09-20) |
| 3 | What did you want to be, before the draft notice? | Motivation / counterfactual life |
| 4 | Who in this city owes you something? Who do you owe? | Relationship + obligation web |
| 5 | What is the smallest thing that would make today a good day? | Values / comfort (reward flag) |
| 6 | What do you not want the Directorate to know about you? | Secret / vulnerability |
| 7 | Name someone who thinks you are better than you are. | Relationship (external validation) |
| 8 | What do you find funny? | Tone/register request |

**Total: 15 distinct text fields** (1 required, 14 optional), touching at least **12 different
subjects**, spread across two consecutive pages with nothing but a language tag-list to break up the
typing. Nowhere in the terminal is there a single open "tell us anything else" field.

---

## 2. Question 1 — do we get a full picture of the character?

### What's genuinely well covered

- **Relationships and obligations** — three separate angles (Q1 intimate/secret, Q4
  transactional/plot-hook, Q7 external/aspirational). Generous, arguably the most generous category.
- **A non-combat competence** (Q2; the mechanical destination it was written for, ground-role
  affinity, was cut 2026-09-20).
- **Motivation-adjacent material** (Q3), **a comfort lever the GM can actually use** (Q5), **an
  institutional vulnerability** (Q6), and **a tone/register request aimed at the player, not the
  character** (Q8) — `design/character-creation-and-progression.md` §3 already read this set closely
  and called it "unusually well built" as a flag system; that analysis isn't repeated here, only
  relied on.
- **Physical presentation** — portrait (Page 6) plus free-text appearance notes (Page 7) together do
  the job a physical-description field would.
- **Identity** — name, pronouns, gender identity, languages are all captured, with a real
  representation-aware suggestion list behind pronouns/gender.

### Real gaps found

1. **`kid.schema.json` has a `concept` field — "one or two sentence character concept" — that the
   terminal never writes to.** Page 1 tells the player to *arrive* with a concept in mind ("what to
   have ready... a character concept, nothing more") but never actually captures it as text anywhere
   in Pages 1–9. A field exists in the data model for exactly the thing a big catch-all box would
   naturally fill (see §4) — right now it's dead schema.
2. **`age` is never asked.** The schema field defaults to 17 and nothing in the terminal offers a way
   to change it, yet `design/induction.md` §1 spends a dedicated subsection on this exact point —
   *"Age is not a barrier... two intake streams in one building, and some of these six may be
   considerably older than the local kids"* — a thematic point the form has no mechanism to express.
3. **No hometown/place-of-origin field exists anywhere** — not in the terminal, not in the schema.
   `induction.md` §1 names *"where they came from"* as one of three things each player defines for
   their own volunteer story (alongside what they left and why they came), and it's arguably the most
   on-theme fact missing from the whole form: *"some come from a long way off, some from a few valleys
   over, but none of them are at home here."* Right now that's nowhere to write down.
4. **"Why did you volunteer" isn't directly asked.** Q3 is adjacent (a pre-draft dream job) but isn't
   the same question as "why did you sign up for this specifically," and `induction.md` §1 treats
   *"why this"* as one of the three defining pieces of a volunteer's story. Softer gap than the other
   three — arguably intentional, since the acceptance-letter beat (which opens The Road In and goes
   round the table, run live) may already be where this is meant to surface, not the terminal.
   Flagged, not asserted as a bug.

### A correctness issue on top of the gaps (surfacing existing analysis, not new)

`character-creation-and-progression.md` §3 already found this and it belongs in this audit because it
affects "full and accurate," not just "full": **Q3 ("before the draft notice") and Q4 ("who in this
city") both carry premises the campaign overturned on 2026-09-09** — the party are now *volunteers,
not conscripts*, and *every PC is new to the city* (`induction.md` §1). Both questions still have an
honest reading (an acceptance letter stands in for a draft notice; "this city" can mean the city they
came *from*), but the wording ships verbatim from a bible draft that predates that retcon, and nobody
has reconciled the two documents yet.

### Verdict on Question 1

Emotionally and relationally rich, but **missing baseline biographical
facts a real induction form collects as a matter of course** — age and origin — and missing the one
field (`concept`) the schema already has a slot for. Not a case of asking the wrong things; a case of
three quick facts and one open box never making it from design into the build.

---

## 3. Question 2 — are we asking too many RP questions, across too many subjects?

**Short answer: yes**, and the shape of the problem is specific enough to fix precisely rather than
just "cut some."

### Where the load actually comes from

- **Volume:** 15 text fields, 12+ subjects, two consecutive pages, no mechanical page in between to
  break the typing up the way Pages 2–5's point-and-click selection does.
- **A relational cluster that's really one subject asked three times.** Q1, Q4 and Q7 are all "who
  matters to you," from three angles (secret-bond / obligation-and-debt / external-belief). Each is
  individually well-crafted — the pairing in Q1 specifically, the built-in deadline in Q4 — but taken
  together they read as three passes at the same well rather than three different wells, which is
  exactly the "too many questions on too many different subjects" feeling even though each one is
  defensible alone.
- **The three "banal" questions carry the least design weight of anything on either page.** Unlike the
  Eight (bible §20, cross-referenced against side-plots/vulnerabilities, analysed in the craft
  library), the banal questions were added later (2026-09-10) as *"a few light banal texture
  questions"* at Ingram's direct request, with no stated campaign hook. They're pleasant and low-
  stakes on their own, but they're pure added volume sitting directly before the Eight rather than
  after a break — three extra boxes to fill before the "real" ones even start.
- **The highest-value content is positioned to be skipped, not just to be long.**
  `character-creation-and-progression.md` §1 already flagged this and it compounds the load problem:
  Page 8 — *"the campaign's highest-leverage input"* — is both **last** and **fully optional**,
  *"where a tired player is likeliest to skip it, and skipping is explicitly supported."* A player who
  has just typed answers to 7 identity/texture fields on Page 7 hits 8 more free-text boxes on Page 8
  with no signal that these matter more than the ones before them.

### The catch-all field isn't a new idea — it's the part of the original design that never got built

`ideas/entries/character-creation-intake-form.json` — the accepted idea this whole feature descends
from — named this directly, before the Eight Questions were even in the picture:

> *"A free-text backstory prompt invites players to write as much or as little as they want about
> their character... explicitly framed as a chance to gush about their character concept."*

That single open field is what got supplanted, over the course of two build passes, by 3 banal
questions + the bible's 8 — good content individually, but the option to just write freely instead of
answering a checklist never shipped. Asking for it now isn't scope creep; it's closing a gap between
the accepted design and the built one.

---

## 4. Recommendation (a proposal — see §5 for what needs your call first)

1. **Cut the three banal questions as separate boxes.** They're the newest content, the least
   load-bearing (no campaign hook cited anywhere, unlike every one of the Eight), and the first three
   boxes a fatigued player hits. Cutting them takes the terminal from 11 discrete question-boxes to 8
   without touching a single word of bible-sourced content.
2. **Add one big, genuinely optional free-text field** — "Anything else about your character you'd
   like to tell us" — with no suggestion chips (this one's the player's, not a prompt to fill in).
   Wire it to a new `intake.freeform` string in `kid.schema.json`, right next to the existing `banal`/
   `questions` arrays, and have it double as the never-built `concept` capture (§2, gap 1) — one field
   answering both audit questions at once: it's the missing "full picture in your own words" slot, and
   it's the "fewer questions, one big box" the RP-load side is asking for.
3. **Add two short, non-essay fields to Page 7** to close the biographical gaps: `age` (a number
   input, default 17, editable — matching the schema's existing `minimum: 17`) and a short "where are
   you from" text field (a fact, not a prompt — a line, not a paragraph). Neither adds to the RP-fatigue
   problem; they're quick facts, not narrative essays.
4. **Fix the two stale-premise questions** (Q3's "draft notice," Q4's "who in this city") to match the
   settled volunteers/everyone's-new premise — a wording correction, not a content change, and one
   `character-creation-and-progression.md` already flagged as needing a decision.
5. **The Eight themselves are the one thing I'm not proposing to touch.** They're sourced verbatim from
   the story bible and both `induction-terminal.md` and the prompts schema say explicitly "do not
   invent new ones" / "do not alter the wording." If you want to go further than cutting the banal
   three — trim the Eight down to a smaller focused set, or reorder/require a couple of them so the
   highest-value content isn't both last and skippable — that's a call on locked narrative content, not
   a form-design fix, and it's yours to make, not mine to guess at.

Net effect of 1–4 alone: 11 question-boxes → 8 fixed questions + 1 open box + 2 quick facts. Fewer
discrete asks, the completeness gaps closed, nothing bible-sourced touched without you weighing in.

---

## 5. What I'd need from you before implementing any of this

- **Cut the banal three, yes/no** — and if not cut, should they move, or is "cut" the whole point?
- **The freeform field** — happy with it doubling as `concept`, or do you want those kept separate
  (a short "concept" line up near Name on Page 7, distinct from a longer freeform box on/after Page 8)?
- **Age and hometown fields** — add both, one, or neither? Any objection to plain short-text/number
  inputs (no suggestion chips) for these, versus chip-assisted like everything else?
- **The Q3/Q4 wording fix** — fix now (mechanical correction to match the settled premise), or leave
  as-is pending a broader look at the Eight?
- **The Eight's count/order/required-ness** — explicitly your call per §4 point 5. I can implement
  whatever you land on; I'm not proposing a specific cut here.

---

## 6. The revision — brief given 2026-09-18

Ingram's direction after reading §1–5: **cut the banal questions, compress the related ones, get under
half the current number of optional open questions, preserve everything that makes an SF2E character,
and fill sf2e's own optional biography fields from this form.** Stated goal for what the questions are
for: *"let players think about their characters and tell us a bit of information so that we start
understanding what they are interested in, what they want to achieve and getting hooks for other
things that are happening in their lives."*

### 6a. sf2e's real biography fields — checked against the system, not assumed

Every field below is real, verified in `gamesystems/sf2e/template.json` and the shipped character
sheet templates, with sf2e's own English labels from `gamesystems/sf2e/lang/en.json`.

**Character tab** (`templates/actors/character/tabs/character.hbs`, the "background" subsection):

| Path | Label | Type |
|---|---|---|
| `system.details.gender.value` | Gender/Pronouns | string |
| `system.details.age.value` | Age | string (**not** a number — our `kid.schema.json` types it as integer ≥17) |
| `system.details.ethnicity.value` | Ethnicity | string |
| `system.details.nationality.value` | Nationality | string |
| `system.details.languages.value` | Languages | array of **slugs** (`"common"`), not display labels |

**Biography tab** (`templates/actors/character/tabs/biography.hbs`), in sf2e's own four sections:

| Section | Path | Label | Type |
|---|---|---|---|
| Appearance | `system.details.biography.appearance` | Appearance | rich text |
| Appearance | `system.details.height.value` | Height | string |
| Appearance | `system.details.weight.value` | Weight | string |
| Backstory | `system.details.biography.backstory` | Backstory | rich text |
| Backstory | `system.details.biography.birthPlace` | Birth Place | string |
| Personality | `system.details.biography.attitude` | Attitude | string |
| Personality | `system.details.biography.beliefs` | Beliefs | string |
| Personality | `system.details.biography.edicts` | Edicts | array of strings |
| Personality | `system.details.biography.anathema` | Anathema | array of strings |
| Personality | `system.details.biography.likes` | Likes | string |
| Personality | `system.details.biography.dislikes` | Dislikes | string |
| Personality | `system.details.biography.catchphrases` | Catchphrases | string |
| Campaign | `system.details.biography.campaignNotes` | Notes | rich text |
| Campaign | `system.details.biography.allies` | Allies | rich text |
| Campaign | `system.details.biography.enemies` | Enemies | rich text |
| Campaign | `system.details.biography.organizations` | Organizations | rich text |

Each of the four sections carries its own `visibility` flag — **`appearance` defaults to visible to
other players, and `backstory`, `personality` and `campaign` default to hidden.** That is sf2e's own
answer to "who sees what I wrote," and it lines up exactly with `induction.md` §2's rule that the
reveal belongs to the player. The form should say which bucket an answer lands in rather than leaving
players to guess.

### 6b. The finding that reframes the job: today we write none of it

`#createCharacterActor` (`induction-terminal.mjs:1457`) creates the Actor with
`system: { abilities: null, details: { level: { value: 1 } } }` and nothing else. Name and portrait
land; ancestry/background/class Items are embedded; free boosts and HP are set. **Pronouns, gender
identity, appearance and languages are collected on Page 7 and never reach the character sheet at
all** — they live only in our own wizard state and the intake flag. Languages are the sharpest case,
because that one is a genuinely mechanical sf2e field, not flavour.

So "fill in the sf2e bio fields" is two jobs, not one: wiring up four fields we already ask for, and
deciding which of the remaining sixteen are worth asking for.

### 6c. The design rule that makes the arithmetic work

**sf2e's own split between rich-text fields and one-line fields tells us which prompts should be
essays and which should be quick chip-assisted lines.** Follow the system's shape: `likes`,
`dislikes`, `attitude`, `catchphrases`, `beliefs`, `birthPlace` are one-liners; `backstory`, `allies`,
`enemies`, `organizations`, `campaignNotes` are prose. That lets the biggest bio-field coverage gain
arrive as short facts rather than as more open questions — the count Ingram wants halved is the open
questions, and those are the expensive ones.

Two of the current eight survive precisely because of this rule: **Q5 (the smallest good day) becomes
`Likes`** and **Q8 (what you find funny) becomes a one-line register note** — both preserved, neither
spending an essay slot.

### 6d. The set, as settled with Ingram 2026-09-18 — BUILT the same day

Shipped and verified live; see `design/induction-terminal.md` §8's own 2026-09-18 build-status
paragraph for the implementation detail and the live-verification record.

Revised in conversation from the first draft of this section: catchphrases and "what makes you laugh"
cut outright, allies/enemies combined into one deliberately open question, the "what do you want"
question confirmed and **re-aimed at the player rather than the character**, and all four §2 gaps
folded in.

**Group 1 — Personal File** (short fields, chips, all optional but Name): Name → `Actor.name`;
Pronouns → `details.gender.value`; Gender identity → our `genderIdentity`; Age → `details.age.value`;
Height/Weight → `details.height/weight.value`; Where you're from → `biography.birthPlace`; Languages →
`details.languages.value` (needs slugification, see 6a); Appearance → `biography.appearance`.

**Group 2 — Personality** (one-liners, chips, sf2e's own block): the smallest thing that makes a day
good → `likes` *(old Q5)*; something that gets on your nerves → `dislikes`; how you come across on
first meeting → `attitude`; something you believe and would argue about → `beliefs`; what you're good
at that has nothing to do with piloting → our intake *(old Q2, whose ground-role destination was cut
2026-09-20)*.

**Group 3 — In Your Own Words** (the open questions, four of them, all optional):

1. Who's in your life? Friends, family, people you owe, people who would rather not see you again. →
   `allies` *(old Q1 + Q4 + Q7, deliberately left open rather than split into two fields)*
2. What were you part of before this — a school, a trade, a crew, a family — and why did you leave it
   to come here? → `organizations` *(old Q3's job, plus §2's fourth gap, and neither stale premise)*
3. What would you rather the Directorate didn't know about you? → `campaignNotes`, GM-only *(old Q6,
   near-verbatim)*
4. **To you, the player:** what do you want out of this? Is there something you have always wanted to
   do with a character and never got the chance to? → our `intake` *(new)*

**Plus the box:** "Anything else. As much or as little as you like." → `backstory`, and the never-built
`concept` capture from `character-creation-intake-form.json`.

**Count: 11 open questions → 4, plus one freeform box.** Fifteen of sf2e's twenty-one biography fields
get filled; the other six are deliberate (6e).

### 6e. What this costs, and the six fields left empty

- **Question 4 stopped being a departure when it became player-facing.**
  `character-creation-and-progression.md` §3 notes the bible's eight pointedly ask nothing about
  *character* ambition and calls that the campaign's thesis statement. Aiming the question at the
  player instead — what do you want to play — leaves that stance untouched and answers the brief.
- **It also replaces the register channel that old Q8 was carrying.** The craft doc rates "what do you
  find funny" as load-bearing against v4 §22's Known Risk #5 (tone drift). Cutting it is safe
  *because* Question 4 asks the same thing at a higher altitude: a player who says what they have
  always wanted to play has told the GM more about register than a joke preference would.
- **Old Q7's specific angle is gone.** "Someone who thinks you are better than you are" was an
  external witness whose disappointment costs something — the cheapest non-violent stake available.
  Question 1 keeps the people and loses that shape. Recoverable later as a chip on Question 1 if it
  is missed.
- **Six sf2e fields are deliberately left for the real character sheet:** `catchphrases` and
  `ethnicity` (cut on Ingram's call and as recommended — the first is not how players write
  characters, the second reads badly beside an ancestry pick), `edicts` and `anathema` (deity-shaped,
  awkward in a secular institution, and `beliefs` carries the same weight in one line), `enemies` (the
  cost of combining Question 1 — the sheet keeps the split for anyone who wants it), and `nationality`
  (`birthPlace` is the one that earns its place).
- **`organizations` should pre-fill itself** with the Directorate cadet entry — the form filling in
  its own line is a free diegetic beat, and it means the field is never empty.
- **Two real implementation notes:** sf2e stores `age` as a string while `kid.schema.json` types it as
  an integer ≥17, and `details.languages.value` holds slugs (`"common"`) while Page 7 currently
  title-cases for display — that transform has to be reversed on the way to the Actor.

---

*Related: `design/induction.md` (the narrative design), `design/induction-terminal.md` (the technical
build, page by page), `design/character-creation-and-progression.md` §1–3 (the prior analysis this
audit builds on rather than repeats), `data/campaign/induction-intake-prompts.json` (the actual
question/suggestion content), `data/schema/kid.schema.json` (`concept`, `age`, `intake`),
`ideas/entries/character-creation-intake-form.json` (the accepted idea the freeform-field
recommendation restores), `gamesystems/sf2e/template.json` + `templates/actors/character/tabs/`
(the real biography data model §6a is grounded in).*
