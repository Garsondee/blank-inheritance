# The Induction Terminal — technical design

*Written 2026-09-09, revised same day after scope refinement. Design only — nothing here is built
yet (confirmed by a live audit of `module/blank-inheritance/scripts/`: zero code, despite
`design/induction.md` §4 and GitHub issues #96/#45 tracking the concept). This document is the
missing technical layer: what the form actually asks, in what order, and how it becomes a real
Foundry Actor.*

---

## 1. What's already decided — read before designing anything here

Everything below is settled elsewhere. This document adds nothing to the narrative design; it only
answers "how does this actually get built."

**Timing (`design/induction.md` §4, confirmed via `project_induction_and_newcomers` memory):** this
is **session zero**, completed before the table ever meets — a real Foundry login flow, not a scene
the GM runs live. `induction.md`'s own phrase "run in fiction, as a scene" means the *framing* is
diegetic (a Directorate terminal, not a bare OOC form), not that the GM narrates it in real time.
Bible §20 confirms independently: *"Session zero, before anything else."*

**The scope is a *basic but viable* statblock, not a complete one.** Confirmed 2026-09-09: anything
too complex to handle generically in a form gets left for the player to finish afterward, on the
character's own real Actor sheet, once induction hands them a token. This isn't a shortfall — it's
the correct application of an already-standing principle. `design/ux-doctrine.md` §11: *"sf2e already
implements... never rebuild those."* Class feats and spell selection are exactly this: the real sf2e
character sheet already has working UI for picking them, so the terminal doesn't need to duplicate
it. See §5 below — this was flagged as the design's hardest open problem in an earlier draft of this
document, and it's resolved now, not by solving it, but by correctly deciding it isn't this form's
job.

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
campaign-shaping input for future session generation (`ideas/entries/character-creation-intake-form.json`,
accepted).

**The help toggle (`induction.md` §4), refined 2026-09-09:** every question has an in-character layer
and an out-of-character layer. The OOC layer does two different jobs depending on what it sits next
to: narrative *purpose* on the narrative pages ("this is asking who you're connected to; a good
answer names one person and one obligation"), and SF2E *mechanics* on the mechanical pages ("this
permanently raises one of six numbers that drives almost every roll you make"). Per-player,
remembered — same one-line-plus-peekable-detail idiom as the scene runner.

**Everyone presents human/elf/halfling/etc. at the table regardless of what's picked here
(`induction.md` §2).** This form asks for the character's *real* ancestry — the mechanically
meaningful one, the one that can trip the lockdown — not a "disguised as" field. The disguise itself
is roleplay layered on by the player, except for one real new piece: the **passing portrait** (§4,
Page 6) is an actual asset, not just narration.

**Equipment is explicitly OUT of scope here.** Real SF2E chargen's Step 8 (Buy Equipment) is handled
live, at the table, by Kit Issue (`data/scene-briefs/episode-c1s1--kit-issue.json`,
`data/campaign/equipment-catalogue.json`) — decided 2026-09-09. Ground role selection is equally out
of scope, for the same reason.

---

## 2. The computational core already exists — don't rebuild it

`tools/character-builder/derive.mjs` is a complete, tested, pure SF2E level-1 derivation engine,
grounded in `reference/srd/player-core/64-character-creation.json` cited by page. It already exports
everything the terminal needs for a *basic but viable* sheet:

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

**Real file-upload precedent already exists too** — see §4 Page 6.

---

## 3. Real SF2E chargen, mapped to what this form actually needs

Player Core's own ten steps (`64-character-creation.json`):

| # | Step | In scope here? |
|---|---|---|
| 1 | Create a Concept | Light-touch — folded into orientation, Page 1 |
| 2 | Start Building Attribute Modifiers | Yes — folded into Page 5 |
| 3 | Select an Ancestry | Yes — Page 2, **triggers the lockdown** |
| 4 | Pick a Background | Yes — Page 3 |
| 5 | Choose a Class | Yes — Page 4, **pick only, no feats/spells** |
| 6 | Finish Attribute Modifiers | Yes — Page 5 (four free boosts) |
| 7 | Record Class Details | **Deferred to the real Actor sheet, post-induction (§1)** |
| 8 | Buy Equipment | **Out of scope — Kit Issue's job** |
| 9 | Calculate Modifiers | Automatic — `derive.mjs`, not a page a player fills in |
| 10 | Finishing Details | Yes — Page 7 |

The eight narrative questions aren't a Player Core step at all — this campaign's own addition, Page
8. Portrait upload is genuinely new too — Player Core doesn't cover it — Page 6.

---

## 4. The form, page by page

Modeled on `scene-runner.mjs` — `HandlebarsApplicationMixin(ApplicationV2)`, `static PARTS` for
multi-template composition (one part per page, swapped rather than all mounted at once), `static
DEFAULT_OPTIONS`, private static `#onX` action handlers. Unlike the scene runner, this application is
**player-constructed, not GM-mounted** — opens automatically for a user with no character yet, on
login.

| Page | What it does | Help-toggle content |
|---|---|---|
| **1. Orientation** | Not just flavor text anymore — a real explanation, before anything is asked: what this terminal is, what the player is about to do, roughly how long it takes, and what to have ready (a character concept, nothing more — this is explicitly stated so nobody logs in unprepared). The acceptance-letter beat (already in `data/scene-briefs/episode-c1s1--the-road-in.json`) opens it. | This page IS the OOC layer, by design — no toggle needed. |
| **2. Ancestry** — **built** | Real ancestry (mechanical), all 51, grouped Terrestrial-Presenting/Alien-Coded with a live name filter (2026-09-09 decision: "full catalogue, grouped/searchable" over a curated shortlist). Boost/flaw choice slots resolved against the real compendium data (`data/campaign/ancestry-catalogue.json`); heritage and ancestry feat are **not** picked here — see §5, extended. **Selecting non-terrestrial flips a hidden flag and queues the lockdown sub-flow (Page 6a, not yet built — Page 2 itself only shows a short, reassuring note in the same spot).** | OOC: what this changes (boosts/flaw, HP, size, speed) — mechanical register, plus an explicit statement that an ancestry feat comes next, on the real character sheet, same as class feats. |
| **3. Background** — **built** | Real background (mechanical), all 154, grouped Common/Uncommon/Rare with a live name filter — the axis that actually matters at this scale, same "full catalogue, grouped/searchable" decision as Page 2. Boost slots resolved against the real compendium data (`data/campaign/background-catalogue.json`); trained skills, Lore skill(s) and the granted background feat are shown read-only, **not** picked here — some real backgrounds phrase their skill grant as a genuine prose choice the flat data can't represent, and the feat itself is deferred to the real character sheet, same reasoning as ancestry feat/heritage. | OOC: mechanical (two boosts, one or two trained skills, a skill feat) — plus the same "a skill feat comes next, on the real character sheet" statement Page 2 makes for ancestry feat. |
| **4. Class** | Real class — the pick only. Feats and spell selection explicitly deferred (§1). | OOC: mechanical (key ability, HP per level, saves, class DC, proficiencies) — plus a plain statement that feats/spells come next, on the real character sheet, not lost or skipped. |
| **5. Attribute Boosts** | Ancestry/background/class boosts apply automatically (read-only, sourced from Pages 2-4); four player-chosen free boosts. | OOC: "this permanently raises one of six numbers that drive almost every roll you make" — the single most consequential page. |
| **6. Portrait** | Upload via Foundry's real system, then crop client-side to the project's own established **2:3 ratio** (`design/theatre-of-the-mind-staging.md` — the same ratio every other staged portrait already uses, so a new character doesn't look inconsistent next to the cast that already exists). **If the lockdown fired on Page 2, this page also collects the passing portrait — a second upload+crop, or a pick from a curated gallery (§4a).** | OOC: why the crop matters (visual consistency across the roster), not a mechanical explanation. |
| **7. Finishing Details** — **built** | Name (the only required field), pronouns, gender identity, a few light "banal" texture questions, appearance notes, languages. Every field pairs free text with a row of illustrative suggestion chips that insert into the same box on click — never a separate/binding choice. Languages are a real multi-value tag list (add/remove), suggested from the character's own ancestry plus a curated common-language list (Player Core pg. 97), with a free-text "Add" escape hatch. | Minimal — mostly self-explanatory. |
| **8. The Eight Questions** — **built** | Bible §20's real quiz, verbatim, free-text answers, same suggestion-chip pattern as Page 7. Nothing is required — leaving every box blank and continuing is a real, supported path. | OOC: narrative-purpose register — what each answer is *for* in campaign terms, shown per-question where the bible states one explicitly. |
| **9. Review & Confirm** | Full derived sheet via `derive.mjs`, read-only, one confirm button. On confirm: creates the real Actor, places a token, hands off to the landing page (§6). | N/A. |

### 4a. The alien-lockdown sub-flow — expanded 2026-09-09

Fires on Page 2 only, on confirming a non-terrestrial ancestry, on **that player's screen only** —
the table sees someone go quiet, not why (`induction.md` §4's rule, unchanged).

**New this pass — the tone must be got right, or the joke breaks:**

- **The IC lockdown reads urgent and bureaucratic** — "how have you evaded detection for seventeen
  years," 2-3 follow-up questions no other player sees, all in the flat, patient voice of a form that
  has all the time in the world.
- **The OOC layer sitting right next to it must say the opposite, explicitly and plainly:** playing
  an alien character is *encouraged*, not a trap — and whether to ever reveal it at the table, to
  anyone, is a **personal decision belonging entirely to the player, with no wrong answer**, no
  matter how urgent the in-character wording sounds. This is `induction.md` §2's own principle ("the
  reveal belongs to the player, always") stated directly, at the exact moment the tone could most
  plausibly be misread as pressure. Don't rely on the player already having read that design
  document — say it here, in the form itself.
- **The passing portrait.** A genuinely new asset, not just narration: the player either uploads and
  crops a second portrait (same 2:3 pipeline as Page 6) or picks one from a curated gallery of
  "passing" options, representing how the character presents at the table before any reveal. Which
  portrait is "live" in a given scene later is a real open question (§7) — this page only collects
  the asset, it doesn't design when it's shown.

---

## 5. Resolved: class feats and spells are not this form's job

*(Kept as its own section, since an earlier draft of this document flagged this as the hardest open
problem — worth being explicit that it's now decided, not just quietly dropped.)*

Player Core's real Step 7 varies enormously by class — a Solarian's stance, a caster's spell list, a
martial's single starting feat from a short list. Rather than building a curated menu per class (the
Kit Issue equipment-catalogue pattern, considered and rejected here), the resolution is simpler:
**don't build this page at all.** The terminal produces a sheet with class chosen and every derived
number correct, but no class feats or spells picked. The player finishes that on the real sf2e
character sheet once their token is on the landing page (§6) — the system's own UI for this already
exists and is already correct, per `ux-doctrine.md` §11.

**Extended 2026-09-09, while building Page 2: the identical logic applies to Heritage and Ancestry
Feat, both real parts of Player Core's Step 3 ("Select an Ancestry").** Checked against the live
`sf2e.heritages` compendium (302 entries, a handful per ancestry — e.g. Dwarf alone has several) and
`sf2e.ancestry-features` (51 named feats, most cross-tagged to several ancestries by trait, e.g.
"Limited Telepathy" is legal for nine different species) — both are real menu picks that grant their
own rule text, structurally the same shape as a class feat, not a number `derive.mjs` needs. Page 2
resolves ancestry boosts/flaws (required — they feed ability modifiers directly) and stops there;
heritage and ancestry feat are picked on the real character sheet afterward, same as class feats and
spells. Not a new decision, the same one applied to the next case it obviously covers.

---

## 6. Data flow, and the handoff at the end

1. Pages 2-5 and 7-8 collect raw choices into application state. Page 6 collects and crops real
   image files.
2. **Portrait upload reuses `module/blank-inheritance/scripts/foundry/io.mjs`'s existing, verified
   pattern** — `FilePicker.implementation.uploadPersistent`, the same function `writeStorageJson`
   already calls for JSON, generalized to image files. `io.mjs` is *"the ONLY module in this project
   allowed to touch Foundry's file-access globals"* — the terminal must call into it, not touch
   `FilePicker` directly. The crop step itself is a client-side canvas operation before upload, new
   work with no existing precedent in this codebase.
3. Page 9 calls `derive.mjs`'s functions against the collected state to compute the full sheet, and
   displays it for confirmation — nothing is written to Foundry before this point.
4. **On confirm:** a real `Actor` document is created via Foundry's Document API (never raw file
   access — the established Safety principle, `design/foundry-module-design.md`'s Safety section),
   using `kid.schema.json`'s shape and the existing `core/generators/character.mjs` generator (so
   far only exercised against a synthetic fixture — this would be its first real use). **Then:** a
   token for that Actor is placed into a scene, and the player is routed to a landing page rather
   than dropped into the raw Foundry sidebar — matching `terminal-login-landing-page`'s own concept
   of booting into "either the campaign map or the player's personal terminal." **Which scene the
   token lands on is a real open question (§7)** — nothing currently defines a "lobby" or "dorm"
   scene for this purpose.
5. **The eight questions' answers need to leave Foundry and reach this repo for the GM/Claude to
   actually use them** — the whole point of goal 7 (context for future session generation). This is
   `ideas/entries/character-creation-intake-form.json`'s own named v1 scope: session-boundary
   latency, write now, sync and read between sessions. The harvest/inbound sync mechanism this
   depends on **does not exist yet** (GitHub issue #140's own audit — only a docstring). The
   terminal can capture the answers into the Actor (flags, or a journal page) regardless; getting
   them back to `data/` for actual use is a separate, currently-unbuilt dependency.

---

## 7. Open questions — not decided here

1. **Which scene a freshly-created token lands on.** No "lobby" or landing scene currently exists as
   a concept to place it in.
2. **How the passing-portrait gallery gets populated — corrected 2026-09-09, checked rather than
   assumed.** `artwork/in-tray/character-portraits/` already holds 183 files, not "none": a large
   library of generic 1950s-archetype portraits (military cadet, doctor, officer, street thug,
   school teacher, and more, hand-painted gouache style) that's a strong real fit for the "passing"
   gallery specifically, a dedicated `aliens/` subfolder (10 files) for true-form portraits, and even
   a few already-named campaign portraits (`Hyuck.png`, `Rupiah.png`, `ShucksMordant.png`). What's
   still open is curation and organization, not existence — nothing there is sorted for this purpose
   yet, and picking/tagging a real gallery subset is real work, just not a from-scratch asset
   commission.
3. **When the passing portrait is shown instead of the real one**, mechanically — a per-scene toggle
   the player controls, a GM-set default, something else. Page 6a only collects the asset; this is a
   separate, later design question about how the portrait system (`in-scene-character-portrait-frames`,
   `theatre-of-the-mind-staging.md`) actually consumes it.
4. **Is backstory (the eight questions) editable later**, or one-time? Still open from the original
   idea file.
5. **Full vs. curated ancestry/background/class lists — resolved for ancestry, 2026-09-09:** asked
   directly rather than assumed, since Kit Issue's curated-equipment rationale doesn't automatically
   transfer. Answer: **full catalogue, grouped/searchable** — all 51 real ancestries, split
   Terrestrial-Presenting/Alien-Coded with a live filter, not a hand-picked shortlist. Background and
   class lists are a separate question each, not automatically the same answer either way.
6. **The lockdown follow-up questions' actual content** — the tone rules are now clear (§4a), the
   actual copy for the 2-3 questions isn't written yet.
7. **The exact terrestrial/alien-coded boundary, in `data/campaign/ancestry-catalogue.json`'s
   `terrestrial` flag.** Currently just the five classic ancestries (Human, Elf, Dwarf, Gnome,
   Halfling); every other real SF2E ancestry, Orc and Goblin included, is tagged alien-coded. Orc and
   Goblin are the nearest real edge case — Earth-folklore-adjacent, but SF2E writes them as their own
   starfaring species with no stated Golarion-monsterfolk framing, so they were left on the
   alien-coded side rather than assumed in. A plain boolean per ancestry, trivial to correct.
8. **A whole unbuilt branch, found 2026-09-10: "new recruit" vs. "the Day 1 pilot."**
   `design/campaign-arc.md`'s already-extensive Day 1 pilot material (reduced personnel-scale HP, a
   stronger Frame, now also confirmed "exhausted from their duties") is a real, **player-chosen**
   chargen path (`bible/LEDGER.md` #10) — one of the six may opt to start the campaign as an already-
   active, veteran pilot rather than a fresh recruit. Nothing built so far (Pages 1-3, 7-8) has a fork
   for this; every page assumes the standard new-recruit flow. Needs a real design pass of its own
   before Page 4 (Class) or Page 9 (Review) can be considered complete — a veteran's "basic but viable"
   sheet plausibly needs different defaults than a recruit's. `day1-pilot-hp-reduction-amount` (the
   exact number) is still open in `open-questions.json` and blocks finishing this properly.
9. ~~Page 7's gender-identity suggestion list is a judgment call.~~ **Confirmed 2026-09-10:** "Two-Spirit"
   stays off `genderIdentityOptions` — Ingram agreed directly. The field is always free text too, so
   nothing was ever blocked; this only ever affected what's pre-populated as a suggestion.

---

## 8. Build status

This design was requested "research, design first" — no code — and stayed that way through the first
draft. **That has changed: the shell application, Page 1 (Orientation), Page 2 (Ancestry), Page 3
(Background), Page 7 (Finishing Details) and Page 8 (The Eight Questions) are now built**, against
exactly this shape, the same incremental way the scene runner itself was built.

**The shell:** `module/blank-inheritance/scripts/foundry/induction-terminal.mjs` — the
`InductionTerminal` ApplicationV2 class, the singleton mount/refresh/unmount/open functions, and page
swapping (`static PARTS` declares one template per page; `_configureRenderParts` picks which one is
the active render target, under a constant partId, so `HandlebarsApplicationMixin`'s own
`_replaceHTML` *swaps* the rendered page instead of stacking a new one beside a stale one). Registered
on `game.modules.get("blank-inheritance").api.openInductionTerminal` — deliberately not auto-mounted
on `ready` yet, since the "opens automatically for a characterless user" trigger (§6) isn't built.

**Page 1:** `templates/induction/page1-orientation.hbs`, reusing `.bi-doc`, `Induction.Page1.*` lang
keys.

**Page 2:** `templates/induction/page2-ancestry.hbs` plus `module/blank-inheritance/scripts/core/induction-ancestry.mjs`
(pure boost/flaw choice-slot resolution — no Foundry, tested against both hand-built fixtures and the
real catalogue in `test/tier1-induction-ancestry.test.mjs`), `data/campaign/ancestry-catalogue.json` +
`data/schema/ancestry-catalogue.schema.json` (all 51 real SF2E ancestries, extracted live from
`gamesystems/sf2e/packs/ancestries` — the same live-Foundry-query technique used earlier this session
for the equipment catalogue and the Giant Centipede), `Induction.Page2.*` lang keys. Ability names and
size labels reuse sf2e's own `PF2E.Ability*`/`PF2E.ActorSize*` localization keys rather than
duplicating them (`ux-doctrine.md` §11). Heritage and ancestry feat are deliberately not resolved here
— §5, extended.

**Page 3, built 2026-09-10:** `templates/induction/page3-background.hbs` plus
`module/blank-inheritance/scripts/core/induction-background.mjs`, `data/campaign/background-catalogue.json`
+ `data/schema/background-catalogue.schema.json` (all 154 real SF2E backgrounds, extracted live from
`gamesystems/sf2e/packs/backgrounds`), `Induction.Page3.*` lang keys. The generic boost/flaw slot
resolution itself (`resolveSlots`, `claimedAbilities`, `isFixedSlot`) moved out of
`induction-ancestry.mjs` into its own `core/boost-slots.mjs` this same pass, since background boosts
are structurally identical to ancestry's — re-exported from `induction-ancestry.mjs` so nothing else
had to change. The free-boost-slot picker (`#pickFreeSlot`) and the live-filter binding (`#bindFilter`)
were both generalized from ancestry-only (an identity-comparison hack, a hardcoded state path) to a
dotted-path mechanism (`core/state-path.mjs`, itself extracted from Pages 7-8's own `getPath`/`setPath`)
now shared by all three free-slot pickers and both filter boxes. Trained skills/Lore/feat are
informational only, never a resolved player choice — real background text like Starship Dweller's
"trained in the Crafting or Piloting skill" is a genuine prose choice the flat catalogue data can't
represent, and the description field is always the actual rule. A background listing two Lore (or
regular skill) names is flagged "(choose one)" and joined with "or" rather than a plain comma-joined
list, after live adversarial testing (Spike Larcenist) showed the naive join reading as "grants both"
when the real rule is "choose one" — found and fixed the same pass, before committing.

All three pages verified live in the local Foundry instance, including deliberate adversarial checks:
mount cleanly, no console errors beyond pre-existing environment noise unrelated to this module,
`.bi-doc` styling and layout render correctly, the live filters narrow correctly on both pages (special
characters, emoji, SQL-injection-shaped strings, a 500-character string — none broke the plain
substring filter), boost/flaw picking and the picked-state highlighting work (including the mid-choice
indexing case a manual trace caught before it ever ran — see the resolveSlots comment in the core
module, and Escaped Experiment's real 3-boost-slot shape, which needed no special-casing at all), a
forged pick bypassing the disabled attribute is still refused server-side (confirmed by calling the
action handler directly with a fabricated target), Continue stays disabled with nothing selected and
enables the instant a legal choice completes, and Back/Change/Continue all navigate correctly across
many transitions including the full Page 2→3→7→3→2 round trip, with no DOM stacking, duplication, or
state loss. Page 2's own OOC help `<details>` still stays open across a re-render and its alien-lockdown
note still appears only for non-terrestrial picks, unaffected by the `#bindFilter`/`#pickFreeSlot`
generalization. One pre-existing, non-blocking finding: `.bi-doc__meta`'s `white-space: nowrap` causes
real horizontal overflow below roughly 500px viewport width — but Foundry itself declares a 1024×768
minimum and warns "some features of the software will not work properly" below it, and there is zero
overflow at that floor or above, so this was left alone rather than editing a class shared across every
other `.bi-doc` surface in the module for a viewport size the platform itself doesn't support.

**Pages 7 and 8, built 2026-09-10** — new requirements, given directly: every RP-response field pairs
free text with a row of suggested answers a player can click to insert, gender identity gets a real
suggestion list (grounded in the story bible's own "all genders adjustable" line and the accepted
intake-form idea's "queer/LGBTQ+-aware" commitment), a few light "banal" texture questions sit alongside
the finishing details, and nothing on Page 8 is required. `scripts/core/induction-intake.mjs` (pure:
`insertSuggestion`, `isFinishingComplete`, the language add/remove/suggestion helpers, a dotted-path
get/set) plus `data/campaign/induction-intake-prompts.json` (the suggestion/question *content* —
deliberately a data file, not `lang/en.json` keys, since it's enumerable content parallel to a canonical
source, same reasoning as the ancestry catalogue) drive both pages' templates through one shared
view-model (`#decoratePromptField`), so adding a 9th banal question or a new suggestion is a content
edit, never a template/adapter change. The language widget is a second, genuinely different component —
a real multi-value tag list, suggested from the character's own chosen ancestry plus a curated
common-language list hand-transcribed from Player Core pg. 97 (`reference/srd/player-core/
134-languages.json`, never synced to Foundry so it can't be fetched live) — mapping onto
`kid.schema.json`'s existing `pcStatblock.languages` field with zero transformation.

Suggestion-click and typing are both plain DOM listeners, never `this.render()` mid-edit, same reasoning
as Page 2's own live-filter box (confirmed against Foundry's real `_preSyncPartState` source:
focus-restore never restores caret position). Page 8's eight per-question OOC help toggles each need a
**unique** `data-sync` value — copying Page 2's single `data-sync="help"` literal would only track one
of the eight correctly, since that state is a flat dictionary keyed by the literal attribute value; this
was verified live by opening two different questions' toggles simultaneously and confirming both stayed
open independently. A real display bug was also found and fixed live: an ancestry's own raw language
strings (`"common"`, lowercase, straight from the catalogue) need the same per-word title-casing Page
2's own `languagesLabel` already applies, or the language widget's ancestry-derived suggestion chips
read inconsistently with Page 2's own display of the identical data — `titleCase` is now a shared
module-scope helper instead of living only inside `#decorateAncestry`.

At the time these two pages were built, Pages 3-6 didn't exist yet, so Page 2's own Continue
**temporarily** jumped straight to Page 7. Page 3 was built the same day (see its own build-status
paragraph above) and now owns that temporary redirect instead — Page 2's Continue goes to the real
Page 3, Page 3's Continue temporarily jumps to Page 7 until Page 4 exists. Page 8's Continue is the
stub, matching Page 2's former idiom exactly.

`kid.schema.json` gained `pronouns`, `genderIdentity`, `appearance` (all optional/nullable strings) and
`intake.banal[]`/`intake.questions[]` (raw Q&A, `{id, answer}` pairs) — deliberately **not** merged into
`anchors`, which stays capped at 3 and a separate, later, collaborative concept; distilling an intake
answer into a real Anchor stays a human decision, not something this terminal does automatically.

Covered by the generic tier0 architecture tests for the UI shell (templates/lang/CSS) plus dedicated
pure-logic suites for both the ancestry choice resolution and the intake suggestion/language logic.
Pages 4-6 and 9 are not built — §4's table is still the plan for each.

**Presentation pass, 2026-09-10** — a progress tracker and a page-transition animation, added across
every built page at Ingram's direct request for "a nicely styled CSS form with bells and whistles."
The tracker is a routing-slip-style row of nine numbered stamps (`#trackerSteps()`, computed once in
the shared `_prepareContext` base context so every page template gets it for free) — done/current/
upcoming, shown in full even for pages not built yet so "step 3 of 9" reads honestly. Deliberately
numbered stamps, not a filled progress bar — a Directorate form's own control-number furniture, staying
in the PAPER register rather than borrowing a GLASS-side idiom. The page-transition animation needed no
JavaScript at all: `_replaceHTML` already replaces `.bi-induction__page` with a genuinely new DOM node
on every swap (the whole reason the page-swap architecture works), so a plain CSS `@keyframes` fade/rise
on that class re-fires on its own for every transition, and is already zeroed under
`prefers-reduced-motion` via the existing `--bi-dur-servo` token, no new media query needed.

---

*Related: `design/induction.md` (the narrative design this is the technical half of),
`design/ux-doctrine.md` §11 (why class feats/spells are correctly out of scope),
`design/theatre-of-the-mind-staging.md` (the real 2:3 portrait ratio this must match),
`ideas/entries/character-creation-intake-form.json`, `ideas/entries/terminal-login-landing-page.json`,
`ideas/entries/in-scene-character-portrait-frames.json`, `tools/character-builder/derive.mjs`,
`module/blank-inheritance/scripts/foundry/scene-runner.mjs` (the architectural model),
`module/blank-inheritance/scripts/foundry/io.mjs` (the real upload precedent), GitHub issues #96,
#45, #140.*
