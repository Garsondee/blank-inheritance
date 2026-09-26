# The Induction Terminal — technical design

*Written 2026-09-09, revised same day after scope refinement. Design only — nothing here is built
yet (confirmed by a live audit of `module/blank-inheritance/scripts/`: zero code, despite
`design/induction.md` §4 and GitHub issues #96/#45 tracking the concept). This document is the
missing technical layer: what the form actually asks, in what order, and how it becomes a real
Foundry Actor.* *(Since built: all nine pages by 2026-09-10, with Pages 7 and 8 rebuilt 2026-09-18; see §8.)*

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

**The eight questions (`blank-inheritance-v4.md` §20) — SUPERSEDED 2026-09-18. Read
[induction-intake-audit.md](induction-intake-audit.md) §6 before touching Page 7 or 8.**

This section used to read "do not invent new ones" and list bible §20's eight questions as the fixed
content of Page 8. **That instruction is retired, on Ingram's direct call**, after an audit found
that the form was asking fifteen separate free-text questions across twelve subjects, that none of
what it collected reached the real sf2e character sheet, and that the single large catch-all box from
the original accepted idea had never been built. The eight questions are still the ancestor of what
is there now, and none of their material was thrown away — it was compressed:

| Bible §20's question | Where it is now |
|---|---|
| 1. Who do you love, and what would you never tell them? | Open question 1 (allies), combined |
| 4. Who in this city owes you something? Who do you owe? | Open questions 1 and 2 (allies/enemies), combined |
| 7. Name someone who thinks you are better than you are. | Open question 1 (allies), combined |
| 3. What did you want to be, before the draft notice? | Open question 3 (organizations), rephrased — the old wording contradicted the settled volunteers-not-conscripts premise |
| 6. What do you not want the Directorate to know about you? | Open question 4, near-verbatim |
| 2. What are you good at that has nothing to do with piloting? | Page 7's Personality block, as a one-liner |
| 5. What is the smallest thing that would make today a good day? | Page 7's Personality block → sf2e's own `Likes` field |
| 8. What do you find funny? | **Cut**, on Ingram's call — its register-request job is done better by the new out-of-character question |

Every answer still becomes a side-plot seed or a vulnerability — this is not flavor text,
it's campaign-shaping input for future episode generation
(`ideas/entries/character-creation-intake-form.json`, accepted). **New since 2026-09-18: every answer
also lands on a real sf2e biography field**, declared per-prompt as a `bioPath` in
`data/campaign/induction-intake-prompts.json` and applied by `core/induction-bio.mjs`. Nothing this
form collects is allowed to go unrecorded.

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
live, at the table, by Kit Issue (`data/scene-briefs/episode-c1e1--kit-issue.json`,
`data/campaign/equipment-catalogue.json`) — decided 2026-09-09.

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
implementation work, not part of this design pass. *(Since built: `data/campaign/ancestry-catalogue.json`,
`background-catalogue.json` and `class-catalogue.json`; see §8.)*

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
| **1. Orientation** | Not just flavor text anymore — a real explanation, before anything is asked: what this terminal is, what the player is about to do, roughly how long it takes, and what to have ready (a character concept, nothing more — this is explicitly stated so nobody logs in unprepared). The acceptance-letter beat (already in `data/scene-briefs/episode-c1e1--the-road-in.json`) opens it. **Since the 2026-09-25 UI pass it also offers back a form in progress** (name, what they are, where they stopped, when) with Continue This Form / Start Again — offered, never silently resumed; see §8. | This page IS the OOC layer, by design — no toggle needed. |
| **1b. Service Agreement (FORM 1-B)** — **built, off by default** | The absurdly long agreement, shown once, second, only while the world setting `inductionAgreementEnabled` is on (off until Ingram grades the text). Its own design: [induction-agreement.md](induction-agreement.md). Keyed `"agreement"`, not renumbered into the nine: the tracker's numbers are display positions (`core/induction-flow.mjs`), so page ids never moved. Never a tracker link — seen once, at signing. | N/A. |
| **2. Ancestry** — **built** | Real ancestry (mechanical), all 51, grouped Terrestrial-Presenting/Alien-Coded with a live name filter (2026-09-09 decision: "full catalogue, grouped/searchable" over a curated shortlist). Boost/flaw choice slots resolved against the real compendium data (`data/campaign/ancestry-catalogue.json`); heritage and ancestry feat are **not** picked here — see §5, extended. **Selecting non-terrestrial flips a hidden flag and queues the lockdown sub-flow (Page 6a, not yet built — Page 2 itself only shows a short, reassuring note in the same spot).** | OOC: what this changes (boosts/flaw, HP, size, speed) — mechanical register, plus an explicit statement that an ancestry feat comes next, on the real character sheet, same as class feats. |
| **3. Background** — **built** | Real background (mechanical), all 154, grouped Common/Uncommon/Rare with a live name filter — the axis that actually matters at this scale, same "full catalogue, grouped/searchable" decision as Page 2. Boost slots resolved against the real compendium data (`data/campaign/background-catalogue.json`); trained skills, Lore skill(s) and the granted background feat are shown read-only, **not** picked here — some real backgrounds phrase their skill grant as a genuine prose choice the flat data can't represent, and the feat itself is deferred to the real character sheet, same reasoning as ancestry feat/heritage. | OOC: mechanical (two boosts, one or two trained skills, a skill feat) — plus the same "a skill feat comes next, on the real character sheet" statement Page 2 makes for ancestry feat. |
| **4. Class** — **built** | Real class — the pick only, all 6 (`data/campaign/class-catalogue.json`, extracted live from `gamesystems/sf2e/packs/classes`). A flat list, not grouped/filtered — 6 items is the honest fit, unlike ancestry's 51 or background's 154. Key ability is one boost slot (core/boost-slots.mjs, shared with ancestry/background) — fixed for five classes, a real choice for Witchwarper (Charisma or Intelligence). Trained skills, weapon/armor proficiencies shown read-only; the free skill count ("plus N more of your choice") and class features/feats/spells are explicitly deferred (§1/§5). | OOC: mechanical (key ability, HP per level, saves, proficiencies) — plus a plain statement that feats/spells come next, on the real character sheet, not lost or skipped, and that Class DC starts Trained for every class at level 1. |
| **5. Attribute Boosts** — **built** | Four free boosts, the fourth real consumer of the shared boost-slot machinery (core/boost-slots.mjs) — no catalogue, no picker/resolver two-state, shown as **one row of six toggles** since the 2026-09-25 UI pass (four identical open slots that must all differ are the same choice as "pick four different attributes"). **Each row now shows the running modifier and where it came from** (ancestry +1, ancestry flaw −1, background +1, class +1, chosen here +1 — `abilityTally`): the original "Pages 2-4's boosts are NOT re-shown here" meant the single most consequential page was made blind, with the player flipping back three pages to see where their numbers would land. Display only: the sheet's real numbers still come from sf2e on confirm. The four free boosts must differ from each other, but may legally repeat an ability those earlier pages already boosted — a separate step, per Player Core's own "different ability at the same time" rule. | OOC: "this permanently raises one of six numbers that drive almost every roll you make" — the single most consequential page. |
| **6. Portrait** — **built** | Upload via Foundry's real system, then crop client-side to the project's own established **2:3 ratio** (`design/theatre-of-the-mind-staging.md` — the same ratio every other staged portrait already uses, so a new character doesn't look inconsistent next to the cast that already exists). A photo can also be **dropped onto the page**, and the crop box works from the keyboard (arrows move, + and − zoom) and the mouse wheel (2026-09-25). Genuinely optional — Continue is never gated on it, same treatment as every Page 7/8 field except Page 7's name, and Foundry's own default silhouette makes skipping it a real, unpenalized path. **Scoped down from the original plan, deliberately: the lockdown passing-portrait dual-collection (§4a) is NOT built this pass** — matches Page 2's own existing minimal treatment (a short reassuring note, not the full sub-flow) rather than the table's original "this page also collects the passing portrait" line. | OOC: why the crop matters (visual consistency across the roster), not a mechanical explanation. |
| **7. Finishing Details** — **built, rebuilt 2026-09-18** | Short answers only, in four sections echoing sf2e's own Biography tab: **Personal particulars** (name — still the only required field — pronouns, gender identity, age, height, weight, where you're from), **Appearance**, **Languages**, and **Personality** (the smallest good day, a dislike, how you come across, a belief, what you're good at that isn't piloting). Every field pairs free text with a row of illustrative suggestion chips that insert into the same box on click — never a separate/binding choice. Languages are a real multi-value tag list (add/remove), suggested from the character's own ancestry plus a curated common-language list (Player Core pg. 97), with a free-text "Add" escape hatch. The three "banal" texture questions that used to live here were cut. | Per-field, where the prompt has a real purpose worth stating (age's no-upper-limit note, birthplace, the good-day lever, the competence question). |
| **8. In Your Own Words** — **built, rebuilt 2026-09-18** | Five open questions (allies, enemies, what you were part of and why you left it, what you'd rather the Directorate didn't know, and an out-of-character question to the player about what they want to play), plus **one large catch-all box** — `character-creation-intake-form.json`'s original "write as much or as little as you want" prompt, finally built, writing to sf2e's own Backstory. Nothing is required — leaving every box blank and continuing is a real, supported path. The out-of-character question is visually tagged so nobody answers it in voice by mistake. | OOC: narrative-purpose register, per question — what each answer is *for* in campaign terms, and which of them the other players can see. |
| **9. Review & Confirm** — **built** | A read-only summary of every choice, NOT a computed sheet. **Since 2026-09-25 it opens on the character as a whole** (photo, name, "Vesk Soldier · Smuggler", the six attribute modifiers — the same display-only tally as Page 5), and every section carries a **Change** that jumps straight back to the page that set it, with "Back to review" on every page once Review has been reached; sections left blank say so. NOT a computed sheet was resolved 2026-09-10, see the build-status paragraph below for why the original "full derived sheet via `derive.mjs`" plan turned out to be architecturally wrong. One Confirm button. On confirm: creates a real Actor, embeds the real ancestry/background/class compendium Items with the player's boost/key-ability selections pre-set, so sf2e's own derived-data engine computes AC/HP/skills/saves live, exactly like a real character sheet. Token placement and the landing page remain open (§7 item 1 — no lobby scene concept exists yet). | N/A. |

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
3. **Corrected 2026-09-10, after live investigation — Page 9 does NOT call `derive.mjs`.** The original
   plan (this line, until today) assumed the terminal would compute a full derived sheet itself and
   write the numbers to the Actor. That's architecturally wrong for a real sf2e `character` Actor:
   shipped characters store `system.abilities` as `null` and have no flat `system.attributes.ac` at
   all — AC/HP/skills/saves are computed **live** by sf2e's own derived-data engine from embedded
   ancestry/background/class Items, never stored as numbers (confirmed by a real regression test,
   `test/tier1-generators.test.mjs`'s "deliberately does not write system.abilities or attributes.ac"
   case, and independently by `design/foundry-module-design.md` §2). Page 9 instead displays a
   read-only summary of the player's raw CHOICES (not a computed preview), and on confirm embeds the
   real compendium Items directly — the real numbers appear on Foundry's own already-correct character
   sheet the moment those Items land, with zero derivation math duplicated in this terminal.
   `derive.mjs` remains genuinely unreachable from browser code as things stand (it lives outside
   `module/blank-inheritance/`, and nothing in this repo's tooling bridges that gap) — moot now that
   Page 9 doesn't need it, but worth recording since the original plan assumed otherwise without ever
   checking.
4. **On confirm:** a real `Actor` document is created via Foundry's Document API (never raw file
   access — the established Safety principle, `design/foundry-module-design.md`'s Safety section).
   `core/generators/character.mjs` (mentioned here as "so far only exercised against a synthetic
   fixture") turned out not to be the right tool either — it deliberately writes only identity/level,
   by design, for the same reason `derive.mjs` doesn't apply (see point 3). Page 9's own
   `#createCharacterActor` creates the Actor directly instead; see its build-status paragraph below
   for the full real recipe. **Corrected 2026-09-25, this line was stale:** it said token placement and the landing page
   were unbuilt. They exist: `foundry/induction-relay.mjs` places the new Actor's token on the
   landing scene (`foundry/landing-scene.mjs`'s `placeActorOnLandingScene`) as part of creating it,
   which is what Page 9's "your token is already waiting on the landing scene" success line says.
   §7 item 1 below predates that and should be read in the same light.
5. **The eight questions' answers need to leave Foundry and reach this repo for the GM/Claude to
   actually use them** — the whole point of goal 7 (context for future episode generation). This is
   `ideas/entries/character-creation-intake-form.json`'s own named v1 scope: session-boundary
   latency, write now, sync and read between sessions. **Corrected 2026-09-19, this line was
   stale:** this used to say the harvest/inbound sync mechanism **does not exist yet** (GitHub issue
   #140's own audit at the time — only a docstring), but that specific item on #140 (still open
   overall as the Session 0/1 epic) was closed out 2026-09-16 (commit `53246f0`, "Session zero's
   backstory answers no longer vanish into the void"): Page 9 now sets a durable
   `blank-inheritance.intake` Actor flag and posts a GM-whispered chat message tagged
   `harvestKind: "intake-answers"` (`#persistIntakeAnswers` in `induction-terminal.mjs`), which
   `core/chat-export.mjs` carries into the harvest pipeline automatically and
   `core/harvest-inference.mjs` trusts outright as high-confidence content, no inference needed. The
   answers do now reach this repo, staged under `harvest/` once a GM runs
   `sync-harvest.mjs`/`review-harvest.mjs`; promoting that staged content into canonical `data/`
   files remains a deliberate human step by design (`harvest/README.md`), not an unbuilt dependency.

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
7. ~~The exact terrestrial/alien-coded boundary.~~ **Resolved 2026-09-26 by Ingram:** "If it wasn't a PF2E
   ancestry then it's an alien one." The campaign is set on Golarion (#34), so an ancestry that is also one
   of PF2e's is one of Golarion's own peoples and needs no disguise. Checked against Archives of Nethys' PF2e
   list, ten of the 51 are terrestrial: Human, Elf, Dwarf, Gnome, Halfling, Goblin, Orc, Leshy, Android and
   Ysoki (PF2e's ratfolk under their own name). Dragonkin (PF2e's dragonet is a different people) and Nuar
   (a cousin of PF2e's minotaur) stay alien. The old answer — only the five classics, with Orc and Goblin
   left out — is gone; `test/tier1-induction-ancestry.test.mjs` carries the PF2e list and checks all 51.
8. **A whole unbuilt branch, found 2026-09-10: "new recruit" vs. "the Day 1 pilot."**
   `design/campaign-arc.md`'s already-extensive Day 1 pilot material (reduced personnel-scale HP, a
   stronger Frame, now also confirmed "exhausted from their duties") is a real, **player-chosen**
   chargen path (`bible/LEDGER.md` #10) — one of the six may opt to start the campaign as an already-
   active, veteran pilot rather than a fresh recruit. Nothing built so far (Pages 1-5, 7-9) has a fork
   for this; every page assumes the standard new-recruit flow. Needs a real design pass of its own
   before Page 4 (Class) or Page 9 (Review) can be considered complete — a veteran's "basic but viable"
   sheet plausibly needs different defaults than a recruit's. `day1-pilot-hp-reduction-amount` (the
   exact number) is still open in `open-questions.json` and blocks finishing this properly.
9. ~~Page 7's gender-identity suggestion list is a judgment call.~~ **Confirmed 2026-09-10:** "Two-Spirit"
   stays off `genderIdentityOptions` — Ingram agreed directly. The field is always free text too, so
   nothing was ever blocked; this only ever affected what's pre-populated as a suggestion.
10. **The ancestry and background descriptions name SF2E's own setting — found 2026-09-25, GitHub
   #203.** Pages 2-3 show the compendium's own text. **Ancestries: resolved the same day** (Ingram:
   "Trim the ancestry text"). Seven descriptions were trimmed, by deletion only — Android, Gnome,
   Human, Kasatha, Nuar, Osharu, Pahtra — removing the words that assume the Gap has happened, the
   Pact Worlds exist, Golarion is lost (Human's "loss of their home world, Golarion") or the Drift
   exists. Each keeps SF2E's original as `sourceDescription`, and `test/tier1-induction-ancestry.test.mjs`
   fails if a later-era phrase comes back or a trim ever adds a word. The other twelve first counted only
   name planets of Golarion's own solar system (Akiton, Castrovel, Eox, Bretheda…), which are this
   campaign's setting (#34), so they stay. **Backgrounds: still open.** 53 of 154 are the same kind of
   problem, but many are *named* after places (Absalom Local, Eoxian Local, Starfinder Hopeful), so
   trimming their sentences can't fix them — they need hiding, renaming or rewriting instead. Ingram's call.

---

## 8. Build status

This design was requested "research, design first" — no code — and stayed that way through the first
draft. **That has changed: all nine pages are now built** — Page 1 (Orientation), Page 2 (Ancestry),
Page 3 (Background), Page 4 (Class), Page 5 (Attribute Boosts), Page 6 (Portrait), Page 7 (Finishing
Details), Page 8 (The Eight Questions) and Page 9 (Review & Confirm) — against exactly this shape, the
same incremental way the scene runner itself was built. The Page 1→9 chain is fully real end to end now
too: every page's Continue/Back goes to its actual neighbor, with no temporary skip anywhere anymore
(Page 6's own build-status paragraph below has the one real gap this surfaced — Page 7's Back still
pointed at Page 5, not Page 6, a leftover from before Page 6 existed that the forward-direction fix
never caught). The induction terminal produces a real, playable character end to end, portrait included.

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
**temporarily** jumped straight to Page 7. That temporary redirect has since moved twice more, each
time to the newest built page — Page 3 owned it briefly, then Page 4 (see its own build-status
paragraph below); Page 2 → 3 and Page 3 → 4 are both real now. Page 8's Continue is the stub, matching
Page 2's former idiom exactly.

`kid.schema.json` gained `pronouns`, `genderIdentity`, `appearance` (all optional/nullable strings) and
`intake.banal[]`/`intake.questions[]` (raw Q&A, `{id, answer}` pairs) — deliberately **not** merged into
`anchors` (the Anchors system was cut 2026-09-20).

Covered by the generic tier0 architecture tests for the UI shell (templates/lang/CSS) plus dedicated
pure-logic suites for both the ancestry choice resolution and the intake suggestion/language logic.

**Page 4, built 2026-09-10:** `templates/induction/page4-class.hbs` plus
`module/blank-inheritance/scripts/core/induction-class.mjs`, `data/campaign/class-catalogue.json` +
`data/schema/class-catalogue.schema.json` (all 6 real SF2E classes, extracted live from
`gamesystems/sf2e/packs/classes`), `Induction.Page4.*` lang keys. A flat list, not grouped/filtered —
6 items is the honest fit for a small catalogue, unlike ancestry's 51 or background's 154. Key ability
reuses the exact same boost-slot machinery as ancestry/background (`resolveSlots`, wrapped to a
one-element slots array), since it's structurally identical: fixed for five classes, a real free choice
for Witchwarper (Charisma or Intelligence) — proving the earlier boost-slots.mjs/state-path.mjs
extractions pay off on their third real consumer with zero new picking logic. Trained skills and
weapon/armor proficiency ranks reuse sf2e's own `PF2E.Skill.<Name>`/`PF2E.ProficiencyLevel<N>`
localization keys; a proficiency category renders plainly at Trained (the universal floor) and only
calls out its rank when genuinely higher (e.g. Operative's guns at Expert), and an untrained category
is omitted rather than shown as noise. The free skill count and class features/feats/spells stay
explicitly deferred, same reasoning as ancestry feat/heritage and background feat.

**A real, shared defense-in-depth gap was found and fixed live, adversarially testing this page:**
`claimedAbilities` alone only rejects an ability a SIBLING slot has already resolved -- it never
validated that a brand-new pick even belongs to its OWN slot's option list, since the real template
never renders a button for an illegal ability in the first place. A fabricated `pickClassKeyAbility`
target with `ability: "str"` (not a legal Witchwarper option) reached `state.class.keyAbilityPicks`
unrejected. Fixed with a new pure `isLegalPick(slot, ability)` in `core/boost-slots.mjs`, checked in
`#pickFreeSlot` before `claimedAbilities` runs at all -- this is the SHARED picker (ancestry boosts,
ancestry flaws, background boosts, class key ability), so the fix and its regression test cover all
four call sites at once, not just the one that surfaced it. Verified live both ways: the forged illegal
pick is now rejected, and a legitimate pick immediately after still succeeds.

All four pages' Continue/Back chain verified live end to end: Page 2 → 3 → 4 → 7 → 4 → 3, state intact
in both directions at every step (Soldier's fixed key ability needs no pick at all and still gates
Continue correctly; Witchwarper's real choice gates correctly until picked).

**Page 5, built 2026-09-10:** `templates/induction/page5-attributes.hbs` plus
`module/blank-inheritance/scripts/core/induction-attributes.mjs`, `Induction.Page5.*` lang keys. No new
data file, no catalogue, no picker/resolver two-state -- four identical, fully-open boost slots
(`FREE_BOOST_SLOTS`, a plain constant) shown directly, the fourth real consumer of
`core/boost-slots.mjs`'s shared machinery (ancestry boosts, ancestry flaws, background boosts, class
key ability, now this) with zero new picking logic. `#pickFreeSlot` and `isLegalPick` (found fixing
Page 4's own adversarial gap) both apply here unchanged. The generic `resolveSlots`/`claimedAbilities`
mechanics are already covered by `test/tier1-induction-ancestry.test.mjs`; the new test file only
covers what's Page-5-specific (the four-identical-slots shape, and that a free boost legally CAN repeat
an ability ancestry/background/class already boosted, since Player Core's "different ability at the
same time" rule only constrains the four free boosts against each other). Page 4's Continue now goes to
the real Page 5; Page 5's own Continue temporarily jumps to Page 7 until Page 6 exists, the same
temporary-skip role Page 4's Continue held until this page was built. Verified live end to end
(Page 4 → 5 → 7 → 5 → 4, state intact both directions), including a repeat of Page 4's adversarial
forged-pick check against this page's own claimed-ability set -- confirmed rejected, exactly as
`isLegalPick`'s regression test predicts for any of the four call sites, not just the one that
originally surfaced it.

Page 6 was not built yet at this point; its own build paragraph is below.

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

**Page 9, built 2026-09-10 — the capstone, and the hardest page in this terminal by a wide margin.**
Ingram chose "full correctness" when the original plan (a derived-sheet preview computed by this
terminal, written to the Actor) turned out to be architecturally wrong — see §6 point 3's own
correction. What "full correctness" actually required took two full rounds of live investigation
before a single line of Page 9 code was written:

- **Where the math runs.** `tools/character-builder/derive.mjs` is unreachable from browser code —
  it lives outside `module/blank-inheritance/`, and nothing in this repo's tooling (checked
  `tools/module-sync/` file by file) ever bridges that gap. Moot in the end: real sf2e `character`
  Actors store `system.abilities` as `null` and compute AC/HP/skills/saves **live** from embedded
  ancestry/background/class Items, never as stored numbers — confirmed by a real regression test
  (`test/tier1-generators.test.mjs`) already guarding `core/generators/character.mjs` against writing
  flat fields. So Page 9 doesn't compute a sheet at all; it displays the player's raw CHOICES
  read-only, and lets sf2e's own engine do the real math the instant the real Items land.
- **How sf2e itself applies an ancestry/background/class.** No `ChoiceSet`/rule-element machinery is
  involved (verified against the real compendium JSON, not assumed) — a boost selection is a plain
  write to `system.boosts.<slot>.selected` (or `system.keyAbility.selected` for a class), read by
  each Item type's own `prepareActorData()` every data-prep cycle. Confirmed by reading sf2e's actual
  `AttributeBuilder` application source (`gamesystems/sf2e/sf2e.mjs`) — the same write path this
  terminal now uses directly, skipping the dialog UI entirely since the player already made these
  choices on Pages 2-5.
- **A real, reproducible hang, found live.** Embedding a compendium Item with its own `system.items`
  grant descriptors intact (background's granted feat, and especially a class's full list of class
  features across every level 1-20) triggers what a live console trace showed as a repeating
  compendium-reindex loop that never returns — isolated by process of elimination across five
  disposable test Actors (each created, inspected, then deleted) down to Soldier's 18-entry grant
  list specifically. The fix turned out to already match this terminal's own standing policy: strip
  `system.items` before embedding and never call `createGrantedItems()` at all — ancestry feat,
  background feat, and every class feature/feat/spell are deferred to the real character sheet, the
  exact same principle already applied consistently since Page 2. Background's Lore skill (not
  covered by sf2e's own trainedSkills-value auto-apply) is created as its own `type: "lore"` Item
  instead. A second live finding: a freshly created Actor's `system.attributes.hp.value` ships at the
  sf2e schema's own generic default, not the character's just-derived max — Page 9 explicitly syncs
  it after everything else lands.
- **The validated recipe**, run live end to end on a real test character (Human/Smuggler/Soldier,
  boosts resolved, four free boosts, then deleted): every computed number matched hand-calculated
  expectations exactly — ability modifiers, the HP breakdown ("Ancestry HP +8, Class HP +10,
  Constitution +2"), AC, Class DC ("Base DC 10, Constitution +2, Trained +3"), and Smuggler's Stealth
  training auto-applying with zero extra code. `#createCharacterActor` (in
  `module/blank-inheritance/scripts/foundry/induction-terminal.mjs`) resolves every choice through
  the existing throwing `resolveXIngredients` functions before touching the world at all, fetches the
  three real compendium Items live (`game.packs.get("sf2e.<type>").getDocuments()`, matched against
  the catalogue's own `id` against each document's real `system.slug` — the catalogues never stored a
  UUID, so this resolves one at confirm time), embeds them with `{keepId: true, render: false}`
  (`render: false` matters — its absence was the proximate trigger for a full sheet-render hang
  distinct from the grant-list hang above, also found live), and deletes the Actor and re-throws on
  any failure after creation rather than leaving a half-built character in the world (verified live
  with a deliberately broken class id: clean error shown, zero orphaned Actor, and the exact same
  attempt succeeded immediately after fixing the id — the failure path doesn't get "stuck"). A second
  defense-in-depth gap was found and fixed the same pass: nothing stopped `#onConfirmCharacter` from
  running a second time after a successful creation (the template hides the button, but the handler
  itself didn't check) — would have silently created a duplicate Actor from the same state; fixed
  with an explicit `createdActorId` guard, verified live by invoking the action directly a second time
  post-success and confirming no second Actor appeared.
- **A second, separate auto-grant mechanism, found the same day capturing this doc's own screenshot
  gallery — `GrantItem` rule elements.** Escaped Experiment (a real, rare background) grants its
  "Canny Acumen" feat this way rather than through `system.items` — a genuinely different mechanism
  clearing `system.items = {}` does nothing to stop, undetected by the first hang investigation
  because Smuggler/Soldier/Witchwarper (the classes/backgrounds already tested) don't use it at all.
  Canny Acumen itself carries a `ChoiceSet` (which proficiency to boost), so embedding Escaped
  Experiment unstripped popped a real interactive dialog mid-embed — not a hang this time, but the
  same practical failure on a real player's screen: Confirm silently stuck on a popup they don't
  understand until someone clicks it. Fixed with a pure, tested `stripGrantItemRules()`
  (`core/induction-review.mjs`) filtering only `GrantItem` entries out of `system.rules` before
  embedding, leaving unrelated rules (e.g. an ancestry's own `ActiveEffectLike` flag) untouched —
  verified live by re-running the exact Escaped Experiment build that triggered this: clean, no
  dialog, "Canny Acumen" correctly absent from the finished Actor. Also confirmed, on the same
  re-test, that Vesk's own real `-1 Wisdom` flaw correctly reduced a doubly-boosted Wisdom from +2 to
  +1 — the ancestry-flaw application path, never specifically exercised before (Human has none),
  works exactly as designed.
- **Deliberately out of scope, same as everywhere else in this terminal:** Heritage (a required
  sibling pick in real Player Core chargen, confirmed it never touches ability boosts at all so its
  absence doesn't break anything mechanical), every class feature/feat/spell, the ancestry and
  background feats, and the "N more skills of your choice" free skill counts (confirmed live that
  sf2e's own data model has **no tracking mechanism for these at all** — purely advisory text; a
  player just sets `skills.<x>.rank` directly on the real sheet, with no record of which source
  granted it). Token placement and a landing page remain unbuilt — no lobby scene concept exists yet
  (§7 item 1); Page 9's success state is the end of the line for now.

Verified live end to end: the full Page 8 → 9 → 8 routing chain; the review summary displays every
collected field correctly (identity, resolved ancestry/background/class boosts by name, the four free
boosts, banal and eight-questions answers); Confirm creates a real, mechanically correct Actor;
re-opening the terminal and building a second character works identically. `npm run test:ui` green
throughout — `test/tier1-induction-review.test.mjs` covers the one genuinely pure piece
(`isReviewComplete`'s gate logic); the Actor-creation sequence itself isn't unit-testable (it's
entirely Foundry Document API calls) and was validated live instead, per this paragraph.

**Page 6, built 2026-09-10 — the last page, and a genuinely new capability (real file upload,
client-side image cropping) with no precedent anywhere in this codebase.** `core/induction-portrait.mjs`
is the pure half: cover-scale/pan/zoom/clamp geometry and the zoom-slider's [0,1]-normalized ↔ raw-scale
conversion, all hand-derived and hand-verified in `test/tier1-induction-portrait.test.mjs` (every
expected value computed independently by hand, not just asserted against the implementation) — the
adapter's live interaction code (a native `<input type="file">` reused across all three states via a
wrapping `<label>`, Pointer Events drag-to-pan with `setPointerCapture`, a normalized zoom slider) writes
the resulting crop straight to the preview `<img>`'s own `style.transform` on every move, never through
`this.render()`, same reasoning as every other high-frequency interaction in this terminal (Page 2's live
filter, Pages 7-8's suggestion chips). Output is a fixed 512x768 (2:3, matching `design/
theatre-of-the-mind-staging.md`) canvas draw from the crop's own source rectangle, exported WebP-first
(quality 0.86, matching `tools/stage-assets/stage_assets.py`'s own precedent) with a PNG fallback, then
uploaded via a new `io.mjs` export, `writeStorageFile` — the same `uploadPersistent` primitive
`writeStorageJson` already used for JSON, generalized to an arbitrary Blob. Deliberately scoped down from
§4's table: the lockdown's passing-portrait dual-collection (§4a) is NOT built this pass, matching Page
2's own existing minimal treatment of the same sub-flow. Genuinely optional throughout — Continue is
never gated on having a portrait at all.

**A real, live-discovered, upstream Foundry bug, not a bug in this codebase:** `createDirectory` throws a
false "EEXIST: file already exists" for a directory that demonstrably does not exist yet, on this Foundry
v14.367/Windows install, for every fresh directory tried — confirmed against the real filesystem directly
(`Test-Path`), against Foundry's own `FilePicker.browse` (which correctly agrees nothing is there), and,
decisively, through Foundry's own first-party "Create Subfolder" UI button in a real File Picker dialog
(not just this module's code) — so `ensureDirectory`'s walk-and-catch pattern (fine for a directory that
genuinely already exists) can never actually create a NEW one on this install. Root cause is out of reach
(the server process isn't in this repo's read-only local mirror), so the fix is a live-verified
workaround, not a patch to Foundry: Page 6 uploads straight into `storage/` itself (`dirName: ""`,
already guaranteed to exist once persistentStorage is enabled) with a distinctive `portrait-` filename
prefix doing the organizing job a real subfolder would otherwise do, calling no `ensureDirectory` at all.
`writeStorageFile` also now reads its return path straight off the server's own response (`result.path`)
instead of hand-building `${dirName}/${filename}`, both because that's the authoritative value and
because a hand-built template would have rendered a doubled slash for an empty `dirName` specifically.
Both the bug and the fix are recorded on `writeStorageFile`'s own doc comment in `io.mjs` for the next
person who needs a new persistent-storage subdirectory and hits the same wall.

**A second real bug, found live clicking through the actual Back chain rather than only jumping pages via
state (which is how most of this session's page-to-page testing had been done for speed):** Page 7's Back
button still pointed at Page 5, skipping Page 6 entirely — a leftover from Pages 7-8's own build round,
before Page 6 existed, when 5→7 was the temporary skip. `#onContinueFromAttributes` (the forward
direction) was correctly restored to point at Page 6 the moment it was built, carrying its own TEMPORARY
comment as a reminder; `#onBackFromFinishing` (the backward direction) carried no such comment and was
simply never revisited. Fixed to `this.state.page = 6`; every page's Back/Continue now correctly
round-trips to its immediate neighbor in both directions, verified live end to end (Page 5 → 6 → 7 → 6 →
5, all four transitions via real button clicks, not direct state assignment).

Verified live end to end, using a real uploaded and cropped image throughout (a synthetic canvas-drawn
test image, injected as a real `File` via `DataTransfer` — the standard technique for driving a native
file input from outside a real user gesture, exercising the actual `change` listener rather than
bypassing it): the empty → cropping → uploading → done → remove → empty state cycle; the invalid-file-type
rejection path; drag-to-pan and the zoom slider both matching hand-computed pixel values exactly,
including a zoom applied AFTER a drag (confirming the two compose correctly, not just independently); a
full character creation (Human/Smuggler/Soldier/"Nova Ashworth II") with the uploaded portrait carried all
the way through Page 9's Confirm into `Actor#img`, then opened the real sf2e character sheet and confirmed
the portrait actually renders there, correctly, alongside the correct AC/HP/saves — the first live proof
that Page 6's output and Page 9's Actor-creation pipeline actually agree with each other, not just each
verified in isolation. `npm run test:ui` 504/504.

**Pages 7 and 8 rebuilt, 2026-09-18 — the compression pass, and the biography write-back.** Driven by
[induction-intake-audit.md](induction-intake-audit.md), which found three things: the form asked
fifteen free-text questions across twelve subjects; `#createCharacterActor` wrote `name`, `img` and
`level` to the Actor and **nothing else**, so pronouns, gender identity, appearance and languages were
collected and silently dropped; and the large catch-all box from the accepted idea had never been
built. Open questions went from eleven to five (the three banal ones cut, the relational three
combined, two survivors demoted to one-liners rather than cut), and a new pure module,
`core/induction-bio.mjs`, maps everything the form collects onto real sf2e biography fields. The
mapping is data-driven — every prompt in `induction-intake-prompts.json` declares its own `bioPath`,
and a test fails if any prompt lacks one, so "we gathered it and dropped it" cannot recur quietly.
Fifteen of sf2e's twenty-one biography fields are filled; the other six are deliberate and documented
in the audit's §6e.

Three implementation details worth not rediscovering: sf2e's six **rich-text** biography fields
(`appearance`, `backstory`, `campaignNotes`, `allies`, `enemies`, `organizations` — its own
`Actor.htmlFields` list) drop bare newlines, so answers are escaped and wrapped in real paragraph
markup while the plain-string fields beside them must **not** be; `details.languages.value` holds
slugs, so Page 7's display title-casing has to be reversed, and a hand-typed language sf2e doesn't
know goes to `details.languages.details` rather than being dropped by the choice-validated field; and
several prompts deliberately share one destination (`campaignNotes` carries three), so each
contribution is written under its own `<h4>` heading, computed from the prompt definitions rather than
from which answers happen to be filled.

Verified live end to end on a real character (Vesk / Smuggler / Witchwarper, every field on every page
filled, deliberately named as a test): all four Page 7 sections and both Page 8 groups render, the
suggestion chips append rather than overwrite, the out-of-character tag shows, Page 9 summarises all
fourteen short answers plus the five questions and the box, and Confirm produced an Actor whose real
sf2e sheet shows every field in its right place — Appearance with Height/Weight, Backstory
paragraph-broken correctly through ProseMirror, Birth Place, the full Personality block, and Campaign
notes carrying three headed contributions with the out-of-character one labelled. Catchphrases, Edicts
and Anathema are correctly empty. The mechanical half was re-checked against hand arithmetic and is
unchanged: Str +1 / Dex +2 / Con +2 / Int +3 / Wis 0 / Cha +1, HP 20, AC 15, Class DC 16, Perception
+3, Smuggler's Stealth training and Piracy Lore both applied. `npm run test:ui` 992/992,
`npm run test:fast` 447/447, and the new tier-3 contract test proves every path the terminal writes
exists on sf2e's real character template.

**UI/UX pass, 2026-09-25** — the whole terminal, page by page and as one flow (Ingram: "give the whole
interface a pass, give the whole process a pass of improvement… focus on UI / UX"). What a player now
sees and does:

- **One fixed frame.** Header and tracker pinned at the top, the action bar pinned at the bottom, only
  the body between them scrolls — Continue is never below the fold, and the card no longer jumps in
  height from page to page. The whole terminal scales with the screen (`--bi-zoom`, 1 → 1.45 at a
  2560×1440 CSS page), as a share of it rather than a pixel cap.
- **A tracker you can use.** Every step's name is shown ("Step 5 of 9 · Attributes"); finished steps are
  links, forward only over ground already covered and never past an unfinished page
  (`core/induction-flow.mjs`); the agreement is never a link. Once Review has been reached, every
  page offers **Back to review**.
- **Continue shows you what's missing** — GitHub #162 item 4, Ingram's own pattern: "let the click
  evaluate the form, then move the camera/scroll back up to the first missing field and point it out
  there — not just block silently or show a generic error." Continue is never greyed out on a page the
  player can finish. Clicked early, it scrolls to the first missing thing (the list, if nothing is
  chosen; the first choice slot with no pick; the attribute rows; the Name field), marks it like a
  highlighter stroke, writes the reason just above it ("One more choice to make.", "Your character
  needs a name to continue.") and moves focus into it; any pick clears the mark. The same reason also
  sits beside Continue as a quiet hint, updated live as the name is typed. Confirm, the one button that
  touches the real world, still stays disabled until Review is complete.
- **Pick and read side by side.** Ancestry, Background and Class keep the list on the left and the
  chosen option's details on the right, each column scrolling on its own, so browsing is click-click-
  click instead of pick → read → Change → pick. The old Change buttons (and their handlers) are gone.
  Each ancestry chip carries a one-line hint (HP, size, speed); each class is a card with its first
  sentence and its key ability, so a player new to SF2E can choose without opening all six.
- **Attributes you can see** (Page 5, above): one row of six toggles with the running total and its
  sources; a fifth pick is refused, "N of 4 chosen" counts.
- **Portrait:** drop a photo onto the page; arrows/+/−/wheel work the crop. A real bug fixed: on a
  zoomed screen a drag moved the photo 1.45× faster than the pointer, because pointer movement is in
  screen pixels and the crop in the terminal's own — now divided by the effective zoom.
- **Review opens on the character** (Page 9, above), with a Change on every section.
- **A form in progress survives a reload.** Twenty to thirty minutes of choices used to exist only in
  the open window; a reload, a crash or a stray close lost everything, and the characterless-player
  auto-open then started again at Page 1. The form now saves as the player goes
  (`core/induction-draft.mjs`: every choice kept, anything only true for a moment dropped, versioned,
  laid over a blank form on the way back in so a field added later still has its default) to a
  **client-scoped setting — the player's own browser, never the server**, so half-written answers are
  never broadcast to anyone. Page 1 then **offers** it back: never silently resumed, which is exactly
  what the 2026-09-09 reset in `mountInductionTerminal` was built to stop. Continue reopens where it
  stopped, or on the first earlier step that isn't finished (a form saved before the agreement was
  switched on reopens on the agreement); Start Again asks once before throwing it away. Cleared when
  the character is created.
- **Housekeeping.** The default state is defined once (`freshInductionState`) instead of twice by hand;
  every page opens at its top with focus on its title; picking the same option twice no longer
  re-renders.

Verified in `tools/induction-terminal/preview.html` — the real module code, templates, styles and
catalogues on a small Foundry shim (`foundry-shim.mjs`, served by `serve.py`, launch config
"agreement-preview"), so the local Foundry world another user had open was never touched — at
1280×800 and 2560×1440: a full click-through from Page 1 to an enabled Confirm with the agreement on
(ten steps), save → reload → Continue / Start Again, Change → edit → Back to review, a dropped photo,
keyboard pan and zoom, and a zoomed drag measured against the expected distance. **Not re-verified
against a live Foundry world or the live server this pass**, and nothing has been pushed: the Confirm
path itself is unchanged apart from clearing the saved form. Tests:
`test/tier1-induction-flow.test.mjs` (step order, jump rules, saved forms),
`test/tier1-induction-attributes.test.mjs` (toggle and tally), `test/tier3-induction-ui-wiring.test.mjs`
(every button reaches a handler, the saved-form wiring, Review's Change targets, the zoomed drag).

---

*Related: `design/induction.md` (the narrative design this is the technical half of),
`design/ux-doctrine.md` §11 (why class feats/spells are correctly out of scope),
`design/theatre-of-the-mind-staging.md` (the real 2:3 portrait ratio this must match),
`ideas/entries/character-creation-intake-form.json`, `ideas/entries/terminal-login-landing-page.json`,
`ideas/entries/in-scene-character-portrait-frames.json`, `tools/character-builder/derive.mjs`,
`module/blank-inheritance/scripts/foundry/scene-runner.mjs` (the architectural model),
`module/blank-inheritance/scripts/foundry/io.mjs` (the real upload precedent), GitHub issues #96,
#45, #140.*
