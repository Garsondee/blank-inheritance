# The Induction Terminal — technical design

*Written 2026-09-09. Design only — nothing here is built yet (confirmed by a live audit of
`module/blank-inheritance/scripts/`: zero code, despite `design/induction.md` §4 and GitHub issues
#96/#45 tracking the concept). This document is the missing technical layer: what the form actually
asks, in what order, and how it becomes a real Foundry Actor.*

---

## 1. What's already decided — read before designing anything here

Everything below is settled elsewhere. This document adds nothing to the narrative design; it only
answers "how does this actually get built."

**Timing (`design/induction.md` §4, confirmed via `project_induction_and_newcomers` memory):** this
is **session zero**, completed before the table ever meets — a real Foundry login flow, not a scene
the GM runs live. `induction.md`'s own phrase "run in fiction, as a scene" means the *framing* is
diegetic (a Directorate terminal, not a bare OOC form), not that the GM narrates it in real time.
Bible §20 confirms independently: *"Session zero, before anything else."*

**The eight real questions (`blank-inheritance-v4.md` §20) — do not invent new ones:**

1. Who do you love, and what would you never tell them?
2. What are you good at that has nothing to do with piloting? *(→ ground-role affinity, likely a side plot)*
3. What did you want to be, before the draft notice?
4. Who in this city owes you something? Who do you owe?
5. What is the smallest thing that would make today a good day? *(the campaign's cheapest, most reliable emotional lever)*
6. What do you not want the Directorate to know about you?
7. Name someone who thinks you are better than you are.
8. What do you find funny? *(tells the GM what register that player wants)*

Every answer becomes an Anchor, a side-plot seed, or a vulnerability — this is not flavor text, it's
campaign-shaping input (`ideas/entries/character-creation-intake-form.json`, accepted).

**The help toggle (`induction.md` §4):** every question has an in-character layer (what the form
asks) and an out-of-character layer (what it's *for*, and how to answer it well) — per-player,
remembered, same one-line-plus-peekable-detail idiom as the scene runner. **Refined 2026-09-09**
(this conversation): the OOC layer should do double duty — clarify narrative *purpose* where a
question is narrative (question 1: "this is asking who you're connected to; a good answer names one
person and one obligation"), and clarify SF2E *mechanics* where a question is mechanical (an
attribute-boost step: "this permanently raises one of six numbers that drive almost every roll you
make — pick the one your concept leans on hardest"). One toggle, two different jobs depending on
what it's sitting next to. See §4 below for exactly where each kind applies.

**The alien-lockdown easter egg (`induction.md` §4):** selecting a non-terrestrial ancestry trips
the screen into bureaucratic lockdown, demanding to know how they've evaded detection for seventeen
years. Fires on that player's screen only — the table sees someone go quiet, not why. Not a
punishment; filing, not fear.

**Everyone presents human/elf/halfling/etc. at the table regardless of what's picked here
(`induction.md` §2).** This form asks for the character's *real* ancestry — the mechanically
meaningful one, the one that can trip the lockdown — not a "disguised as" field. The disguise is
pure roleplay layered on top by the player; nothing in the sheet needs a separate cosmetic-ancestry
field. Flagged as my own read, not something explicitly stated anywhere — confirm before building.

**Equipment is explicitly OUT of scope here.** Real SF2E chargen's Step 8 (Buy Equipment) is handled
live, at the table, by Kit Issue (`data/scene-briefs/episode-c1s1--kit-issue.json`,
`data/campaign/equipment-catalogue.json`) — decided 2026-09-09, same conversation that built that
scene. The terminal produces a character with no starting gear; Kit Issue fills that in during
Session One itself. Ground role selection is equally out of scope, for the same reason.

---

## 2. The computational core already exists — don't rebuild it

`tools/character-builder/derive.mjs` is a complete, tested, pure SF2E level-1 derivation engine,
grounded in `reference/srd/player-core/64-character-creation.json` cited by page. It already exports
everything the terminal needs to turn raw choices into a real sheet:

- `deriveAbilityModifiers` — the real four-step order (ancestry boosts/flaw → background boosts →
  class key ability → four free boosts), including the level-1 clamp-at-+4 rule.
- `deriveHP`, `derivePerception`, `deriveSavingThrows`, `deriveSkills`, `deriveArmorClass`,
  `deriveClassDC`, `deriveStrikeAttackBonus`, `deriveSpellAttack`, `deriveSpellDC`.

**The terminal's job is narrower than it first looks: collect the right raw ingredients, then hand
them to functions that already exist and are already correct.** No new chargen math should be
written for this feature. `tools/character-builder/extract-pregen.mjs` is the existing bridge from
raw Foundry ancestry/background/class *Item* documents down to the "ingredients" shape `derive.mjs`
consumes — the same bridge pattern applies here, just fed by a player's live choices instead of a
pregen's authored ones.

**Real option data source:** `gamesystems/sf2e/packs/ancestries`, `packs/backgrounds`, `packs/classes`
(raw compendium packs — same LevelDB-via-live-Foundry-query technique already used this session for
the equipment catalogue and the Giant Centipede). No flat extracted list exists yet; building one is
implementation work, not part of this design pass.

---

## 3. Real SF2E chargen, mapped to what this form actually needs

Player Core's own ten steps (`64-character-creation.json`), with Step 8 removed per §1 above:

| # | Step | In scope here? |
|---|---|---|
| 1 | Create a Concept | Light-touch — see §4 Page 1 |
| 2 | Start Building Attribute Modifiers | Yes — folded into Page 5 |
| 3 | Select an Ancestry | Yes — Page 2, **triggers the lockdown** |
| 4 | Pick a Background | Yes — Page 3 |
| 5 | Choose a Class | Yes — Page 4 |
| 6 | Finish Attribute Modifiers | Yes — Page 5 (four free boosts) |
| 7 | Record Class Details | Yes — Page 6, **the hardest scope problem, see §5** |
| 8 | Buy Equipment | **Out of scope — Kit Issue's job** |
| 9 | Calculate Modifiers | Automatic — `derive.mjs`, not a page a player fills in |
| 10 | Finishing Details | Yes — Page 7 |

The eight narrative questions (§1) aren't a Player Core step at all — they're this campaign's own
addition, and get their own page (Page 8).

---

## 4. The form, page by page

Modeled directly on `scene-runner.mjs` — same `HandlebarsApplicationMixin(ApplicationV2)` pattern,
`static PARTS` for multi-template composition (one part per page below, swapped rather than all
mounted at once), `static DEFAULT_OPTIONS`, private static `#onX` action handlers. A GM has never
needed to be in the room for this to work; unlike the scene runner, this application is **player-
constructed, not GM-mounted** — opens automatically for a user with no character yet, on login.

| Page | What it collects | Help-toggle content |
|---|---|---|
| **1. The Letter** | Pure framing, no input — the same acceptance-letter beat `data/scene-briefs/episode-c1s1--the-road-in.json` already establishes, shown here as the terminal's own cold-open. One continue button. | None needed — this page has nothing to clarify. |
| **2. Ancestry** | Real ancestry (mechanical). **Selecting non-terrestrial flips a hidden flag and queues the lockdown sub-flow** (see §6). | OOC: what this actually changes (boosts/flaw, HP, size, speed, ancestry feats) — mechanical register. |
| **3. Background** | Real background. | OOC: what this changes (two boosts, a skill, a background feat) — mechanical register. |
| **4. Class** | Real class. | OOC: what this changes (key ability, HP per level, saves, class DC, weapon/armor proficiencies) — mechanical register. |
| **5. Attribute Boosts** | Ancestry/background/class boosts apply automatically (read-only display, sourced from Pages 2-4); then four player-chosen free boosts. | OOC: "this permanently raises one of six numbers that drive almost every roll you make" — mechanical register, since this is the single most consequential page. |
| **6. Class Details** | Class feat(s), spell selection if the class casts, any class-specific starting choice. **Scope risk — see §5.** | OOC: mechanical, per-choice ("this feat lets you..."). |
| **7. Finishing Details** | Character name, pronouns, appearance notes, languages. | Mostly self-explanatory; toggle probably unnecessary here. |
| **8. The Eight Questions** | Bible §20's real quiz, verbatim, free-text answers. | OOC: narrative-purpose register — what each answer is *for* in campaign terms (§1's parentheticals above are the actual copy to use). |
| **9. Review** | Full derived sheet via `derive.mjs`, read-only, a single confirm button. | N/A. |

**The alien-lockdown sub-flow (Page 2 only, that player's screen only):** on confirming a
non-terrestrial ancestry, Page 2 doesn't advance normally — it locks, shows a bureaucratic
"anomaly detected" state, and asks 2-3 follow-up questions no other player sees, per `induction.md`
§4's three rules (per-player only, funny not punitive, the Directorate now has a record). Content
for these follow-ups isn't written yet — flagged as real remaining work, not solved by this doc.

---

## 5. The hardest open problem: Page 6, Class Details

Player Core's real Step 7 varies enormously by class — a Solarian's stance choice, a Witchwarper's
paradigm, a caster's spell list, a martial class's single starting feat pick from a short list. This
is the one page that can't be handled generically the way Pages 2-5 can.

**Proposed approach, for discussion, not decided:** the same curated-menu pattern already proven at
Kit Issue — a short, class-specific, GM-curated list of starting options per class (mirroring
`data/campaign/equipment-catalogue.json`'s "real SF2E rules, shorter list" shape) rather than
exposing each class's full real options. Keeps the page buildable without hand-authoring every
class's entire feat tree, at the cost of narrowing player choice at exactly the step SF2E itself
treats as most build-defining. Flagging rather than deciding — this is a real design tradeoff, not
an implementation detail.

---

## 6. Data flow and where it writes

1. Pages 2-7 collect raw choices into application state (not yet a real Actor).
2. Page 9 calls `derive.mjs`'s functions against that state to compute the full sheet, and displays
   it for confirmation — nothing is written to Foundry before this point.
3. On confirm, a real `Actor` document is created via Foundry's Document API (never raw file access
   — the established Safety principle, `design/foundry-module-design.md`'s Safety section), using
   `kid.schema.json`'s shape and `module/blank-inheritance/scripts/core/generators/character.mjs`
   (the generator that already exists, per the earlier readiness audit, exercised only against a
   synthetic fixture so far — this would be its first real use).
4. **The eight questions' answers need to leave Foundry and reach this repo for the GM/Claude to
   actually use them.** This is `ideas/entries/character-creation-intake-form.json`'s own named v1
   scope: session-boundary latency, write now, sync and read between sessions. The harvest/inbound
   sync mechanism this depends on **does not exist yet** (GitHub issue #140's own audit — only a
   docstring). The terminal can capture the answers into the Actor (e.g. as flags or a journal page)
   regardless; getting them back to `data/` for actual use is a separate, currently-unbuilt
   dependency, not something this design closes.

---

## 7. Open questions — not decided here

1. **Page 6's exact shape** (§5) — curated menu vs. full real options, per class.
2. **The lockdown follow-up questions' actual content** — three rules exist (§4/§6), no copy yet.
3. **Is backstory (the eight questions) editable later**, or one-time? Named open in the idea file,
   still open.
4. **Full vs. curated ancestry/background/class lists** — Kit Issue curated equipment on a real
   design rationale (Directorate-issue feels boring/standard on purpose); does the same logic apply
   to chargen options, or should this be the real full SF2E catalog? Different question, not
   automatically the same answer.
5. **Where the eight questions' answers live once captured** — Actor flags, a journal page, both —
   pending on how the eventual harvest sync (issue #140) is actually built.

---

## 8. What this document deliberately does not do

No code, no `.hbs` templates, no `PARTS` object literally written out — per the explicit instruction
this design was requested under ("research, design first"). The next step, once this is reviewed, is
building Page 1 and the shell application against this shape, the same incremental way the scene
runner itself was built.

---

*Related: `design/induction.md` (the narrative design this is the technical half of),
`ideas/entries/character-creation-intake-form.json`, `ideas/entries/terminal-login-landing-page.json`
(a related but separate, larger idea — the ongoing in-fiction phone/intranet system, not this
one-time chargen flow), `tools/character-builder/derive.mjs`, `module/blank-inheritance/scripts/foundry/scene-runner.mjs`
(the architectural model), GitHub issues #96, #45, #140.*
