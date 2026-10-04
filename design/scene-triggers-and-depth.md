# Scene Triggers and Depth — the authoring framework and the button language

**Status: proposal + build log, started 2026-09-20.** Requested the same day: rewrite every Episode One and Two scene for depth and width — more things players can do, more lore behind rolls, single-sentence temptation prompts — and build the interface that makes a much longer scene brief still runnable live, including buttons embedded *inline*, mid-sentence, in the GM's read-aloud text, each one logging itself with a timestamp. Also asked for: a visual-novel-style NPC presence display working correctly in every scene, and a tracked list of NPCs still missing things (art, most often).

**Read this before touching a scene brief or the Scene Runner template.** It replaces ad hoc scene-writing with a repeatable pass, and it defines the exact authoring syntax for inline triggers — get the syntax wrong and it silently fails to render rather than erroring, so precision here saves real time later.

---

## 0. What already existed before this document — corrected assumptions

A full architecture pass (2026-09-20) found this campaign's own tooling further along than assumed at the start of this work. Read this section before assuming anything below needs building from zero.

- **The visual-novel NPC card is built, not proposed.** `design/theatre-of-the-mind-staging.md` — portrait frames, three arrival tiers (Quiet/Announced/Splash), a GM-only vault with player-facing redaction enforced structurally, faction-themed frames, up to three keys per frame. `ideas/entries/in-scene-character-portrait-frames.json`'s own `"in-progress"` status is stale; treat the staging doc's build log as current truth.
- **The Character Card (Facts/Attitude) is built, not proposed.** `design/npc-social-intel.md`'s whole pipeline — schema, GM vault storage, the card window, attitude buttons, reveal buttons — is real and wired to the portrait frames. `data/schema/npc.schema.json`'s `socialProfile` field has existed with **zero NPCs using it**. The gap here is content, not code.
- **`choicePoint` is schema-complete and authored in two real scenes already, and renders nothing.** `beat.hbs` never reads it. This is the fastest real win available and is Build Item 1 below.
- **Read-aloud text is 100% static prose today.** No inline markup, no token parser, confirmed by direct inspection of every template. This is the genuinely new piece — Build Item 2.
- **`recordLogEntry` (`foundry/session-log.mjs`) is already the one shared, generic logging function**, timestamped, reused by every existing subsystem. Everything new in this document calls through it. Nothing here invents a second log.
- **`walkOn: true` is aspirational.** The schema comment says a walk-on "does not offer to stage a portrait." No code enforces that. Resolved in §4.
- **Nothing tracks NPC asset gaps.** `asset-registry.json` is explicitly positive-only ("the only durable record that an assignment happened") by its own design. A gap tracker is a new, separate, small store — Build Item 4.
- **The Scene Runner is explicitly exempt from the GLASS/PAPER register** (`ux-doctrine.md` §7b/§10.3a) — free to be judged on legibility alone. New visual language below is not bound by that split.

---

## 1. The Ten Questions — the authoring pass

Applied to one scene at a time, in this order, against the scene's *current* brief. Each question names the schema field(s) it fills. The goal every time is the same: could a GM run this scene entirely from the brief, with real width (more than one way to spend attention) and real depth (things worth a roll to learn)?

1. **The opening.** Is there a `landmark` — one fixture everyone can state a position against? Does `firstThing` give a concrete image, not a mood? (`intro`)
2. **The cast.** Who's already here, and who *could* arrive — even someone not in the original draft? Does every cast member have a real `wants`, not a placeholder? (`cast[]`)
3. **The mandatory core.** What's the smallest set of beats that must happen for this scene to have done its job? Everything else this pass adds is on top of this, never instead of it. (`beats[].mandatory`, `goal`)
4. **Width — what else can they try?** This is the question most likely to be under-answered in an existing brief. For every mandatory beat, is there at least one optional beat nearby that rewards a different approach — talking instead of rolling, looking instead of asking, a skill nobody expected to matter? More optional beats is close to always correct. (`beats[]`, `kind: "action"|"check"`)
5. **Depth — what's behind a roll?** Lore, a Fact about someone (`npc.schema.json#socialProfile.facts`), a piece of world information, an Encyclopaedia-style check that costs nothing to attempt. Does every recurring NPC in this scene have at least one authored Fact now, even if it isn't revealed here? (`beats[].challengeRef`, `socialProfile.facts`)
6. **A real choice.** Is there a moment here that deserves formalizing as a `choicePoint` — several real options, stated plainly, `allowsInventedOption: true`? Not every scene needs one. A scene that already has an obvious fork and isn't using this field should get one now that it renders. (`beats[].choicePoint`)
7. **A temptation.** One sentence the GM can say out loud, unprompted, if the table stalls or nobody's biting on the obvious hook — small, low-commitment, never mandatory. (`temptations[]`, new field, §5)
8. **Triggers — what needs a button, and where inline?** Every NPC arrival/exit, every moment-of-reveal, every "this is the beat where X happens" gets a `trigger`, and at least the load-bearing ones get placed *inline*, at the exact word in the prose where the GM should press it — not bundled at the end of the beat. (`beats[].triggers[]`, §2)
9. **Connective tissue.** Does `carriesIn` actually change something if a specific prior scene happened? Does `outro.transition` give a real, sayable reason to move on? Are relevant Nodes referenced (`nodeRefs`) rather than restated? (`intro.carriesIn`, `outro.transition`, `nodeRefs`)
10. **The close.** Is `outro.writeDown` asking for the things next session's writing will actually want? Do `reactionPrompts` cover the real likely outcomes, not just the happy path? (`outro`, `reactionPrompts`)

**Order matters less than coverage.** A GM (or Claude, writing) can jump around; the point of numbering is so nothing gets skipped, not that it's a strict pipeline.

---

## 2. Inline triggers — the button language

### 2.1 The authoring syntax

A beat gains a new array, `triggers[]` — one entry per thing a GM might press. Each trigger has a stable `id`, scoped to the beat (unique within it, like `checkRef` inside a `challengeRef`).

Inside `text` or `readAloud`, an author places a token at the exact point the button should appear:

```
"readAloud": "Taka arrives <trig id=\"taka-enters\"/> and claims all six of them as his table before the plates are cleared."
```

`<trig id="ID"/>` — deliberately matching the redaction pipeline's own `<redact c="n">` tag shape (`core/redact.mjs`) rather than inventing a new bracket style, and for the exact same stated reasons that pipeline already ruled out the alternatives: `{{...}}` collides with Handlebars (even though the raw string itself is never re-parsed by it, a future reader would reasonably assume it might be) and `[[...]]` collides with Foundry's own inline-roll syntax. One difference from `<redact>`: a trigger wraps nothing, so it is self-closing rather than an open/close pair around hidden content.

Processed by a new pure function, `decorateInlineTriggers(text, triggers)` (`core/inline-triggers.mjs`), mirroring `redactHtml`'s own shape: a regex tag match, a per-token replace, and the same "assert nothing unprocessed survives" safety net — except where redaction fails *silently unsafe* (a leaked secret) and therefore must throw, an unrecognised trigger id here fails *loudly visible* instead (`⚠ trig:unknown-id` rendered as literal text), matching the existing `gmTool` convention that a typo in authored data should be obvious from looking at the panel, never a dead click discovered mid-scene.

### 2.2 What a trigger can be

```jsonc
{
  "id": "taka-enters",
  "kind": "npc-enter" | "npc-exit" | "reveal-handout" | "gm-tool" | "post-check" | "note",
  "npcRef": "taka",              // npc-enter / npc-exit
  "arrival": "announced",        // npc-enter only — reuses the existing sting tiers, default "quiet"
  "handoutRef": "form-12b",      // reveal-handout
  "toolId": "equipment-locker",  // gm-tool — matched against the existing GM_TOOLS registry
  "checkRef": "...",             // post-check — posts the existing sf2e @Check enricher
  "label": "Taka arrives",       // short GM-facing tooltip/log text
  "solo": false                  // reveal-handout / note only — mirrors existing delivery:"solo"
}
```

One `kind`, matching one job, reusing an existing function every time:
- **`npc-enter`** calls the existing `summonToStage()` with the trigger's own `arrival` tier — the exact call `#onStagePerson` already makes by hand today, just fired from inline prose instead of a Cast-fold click.
- **`npc-exit`** calls the existing `removeFromStage()`.
- **`reveal-handout`** calls the existing reveal-handout action.
- **`gm-tool`** calls the existing `GM_TOOLS` lookup — no new registry, this *is* that registry, reached from a new place.
- **`post-check`** calls the existing `roll-intent.mjs` enricher path.
- **`note`** writes a plain log line with no other side effect — for triggers that exist purely to mark a moment ("this is when the mood should visibly shift") with nothing mechanical attached.

**Nothing here recomputes anything.** Every kind is a thin dispatch to a function that already exists (doctrine Law 18, applied to our own code this time rather than sf2e's). The only genuinely new code is the parser that turns `{{trig:ID}}` into a real button, and the one new dispatch table connecting a `kind` to its existing function.

### 2.3 Logging — Law 12 and Law 15, applied literally

Every trigger press calls the existing `recordLogEntry`, unconditionally, before or alongside whatever else it does:

```js
recordLogEntry({
  text: trigger.label,
  tag: null,                                    // mechanical, not a GM-typed note — see below
  subject: `trigger::${beatId}::${trigger.id}`,  // same structured-subject convention as outcomeLogSubject
  scene, mode
})
```

This is a **mechanical log entry** in the existing corpus's own vocabulary (`ux-doctrine.md` §10.2) — "what happened," written by the machine, not "what it meant." It carries no `decision`/`reaction`/etc. tag by default, because the GM did not type a sentence; they pressed a button whose meaning is already fully described by its own label. A GM who wants to record what a trigger *meant* still has the log bar for that, same as always — this doesn't replace the Director's log, it feeds the mechanical one, exactly the same relationship a degree-of-success tick already has to the log.

**This is the literal mechanism behind "so that I can tell you exactly what happened and when."** A full session's trigger log, read back afterward, is a timestamped list of every NPC entrance, every reveal, every GM-tool opened, in the order they actually happened at the table — the "build a picture of the episode" ask, satisfied by the log already being built for an unrelated reason.

### 2.4 The visual language — the Scene Runner's own tokens, not the glass-panel keys

Corrected once the actual CSS was checked rather than assumed: `design/visual-identity.md` §3f's four-key language (`.bi-key--go`/`--info`/`--caution`/`--anchor`) belongs to the *other* register, the physical mimetic control panel — wrong visual weight entirely for a small chip sitting inline in a paragraph, and moot anyway since §10.3a already exempts the Scene Runner from that register. **This panel already has its own semantic tokens**, `--sr-good`/`--sr-info`/`--sr-warn` (`bi-components.css`, defined for both themes), already in use by `.bi-runner__stamp--insight` (good) and `.bi-runner__stamp--tool` (info) — a trigger chip is a smaller sibling of those same stamps, not a new system:

| kind | token | why |
|---|---|---|
| `npc-enter` | `--sr-good` | someone moving into the scene, same family as an Encyclopaedia check's own "safe, positive" colour |
| `npc-exit` | `--sr-good`, outline/dimmed variant | same family, opposite direction — distinguished by glyph direction, not a new hue |
| `reveal-handout` | `--sr-info` | retrieves information — the exact colour `--tool` stamps already use |
| `post-check` | `--sr-info` | same — a check surfaces information about the world |
| `gm-tool` | `--sr-warn` | opens something consequential (the equipment locker changes party state) |
| `note` | `--sr-text-dim`, no accent colour | a marker, not an action with a consequence |
| *(unrecognised id)* | a bold, unmissable warning treatment — this is the one case worth being loud about, since it's a real authoring bug | |

**Shape carries what colour can't.** All triggers render as a small inline chip, sitting in the text flow at the point they were authored — not a full button, since Law 7's "nothing important is more than one tap away" is about *reach*, not size, and a paragraph full of full-sized buttons would fail Law 14 ("an interface that shouts constantly is one nobody reads") before a GM had read three lines. A chip is `[name ▸]` for enter, `[name ◂]` for exit, `[⟳]` for a check, `[▤]` for a reveal, `[⚙]` for a GM tool.

**`choicePoint` gets a different treatment entirely, deliberately louder** — per Law 21 ("a mandatory event must be visually unmistakable"), a real disclosed choice is rarer and higher-stakes than an inline trigger, and should read as a distinct bordered block below the relevant text, not a chip inside it: the label, then one button per option in the existing neutral/`--go` style, then a visible "or something else entirely" affordance when `allowsInventedOption` is true. This was already the schema's own intent (`choicePoint` was designed as a block-level thing, not inline) — Build Item 1 below just makes it actually appear.

### 2.4a The choice prompt — one button, every player picks (2026-10-04)

Ingram, 2026-10-04, on the Local Studies / Workshop Induction split: it "needs to be a single button the GM presses which brings up the choices for players to pick something. We always include a third choice button that players can opt for which covers things that went unexpectedly." And, once built: every place the group is offered a choice, above all where it **splits and comes back together**, must use it, now and going forward.

**How it works.** A beat that carries a `choicePoint` shows the GM one **Ask the players** button. Pressing it opens a window on every player's screen: the question, a button per option, and **Something else**, always last, whether or not `allowsInventedOption` is set (that flag no longer decides it). Players see each other's picks arrive and can change or take back their own. The Runner shows the GM who has picked what. **Close and record** stores the most-picked option as the beat's `choice` and the whole split as `picks`, and logs one line per option naming who took it. The old per-option GM buttons are folded away under it, for deciding by hand. Code: `core/choice-prompt.mjs`, `foundry/choice-prompt.mjs`, the one world setting `choicePrompt` (cleared by an admin reset).

**Two texts per option, never confused.** `consequence` is the GM's: what it does, often the right answer or a hidden reaction. It is never shown to a player and never put in the shared record. `blurb` is the players': one plain line on their button, written to spoil nothing, no check, no DC, no number. Every canon option must carry one (`test/tier2-choice-prompt-corpus.test.mjs`).

**The 2026-10-04 audit of every scene** (24 canon scenes, 15 old Episode Two drafts) found the group offered a choice or split in these places:

| scene | where | state |
|---|---|---|
| School: First Period / Second Period | each player picks a room | already a choice; blurbs added |
| The Errand | how to file the requisition | already a choice; blurbs added |
| Flood Tunnel Clearance | the panels, the jam, or the ladder | **was prose; now `split-the-job`.** The fight's ending was already a choice |
| The Night Shift | the bench, the pit or the crane | **was a prose question; now a choice** |
| The Magic Show | hand up, stay seated, slip out at the finale | **was prose; now a choice** |
| Flood Tunnel's night, The Road In | where to spend the night, how to arrive | The City's departure picker, the right tool for a move *between* scenes |

**Recorded gaps, not fixed here.**
- **Haunt event cards cannot host a choice.** `choicePoint` exists on `beats[]` only; `events[]` has `additionalProperties: false`. The night rests' real group decisions (the dilemma events: the bathhouse offer, the petition, the lockers, the padlock, the new boy's report, the shrine's letter, the Magic Show's glamour song) and their danger events (press or retreat), plus the Rumour Mill's expedition and the Roof's padlock splits, live in event cards. Supporting them means `events[].choicePoint`, and options that carry their own attitude shifts so the pick drives the ▲▼ buttons (today a dilemma's `shifts` hard-code one branch and the note says "reverse by hand"). That is a design call for Ingram, not an edit.
- **The Episode Two drafts** (outside canon, due to be rebuilt scene by scene) have gaps the audit listed: The Board's `book-it`, First Contact's route off the road, The Hammer's comms beat, Familiarisation's second question (which machine). When each is rebuilt in canon it carries a choice from the start. Their existing choices need blurbs then.
- **"Say nothing, don't prompt" beats.** Three drafts tell the GM to let silence do the work (a refused credit, the hold-or-go decision, the comms beat). The button is itself a prompt, so there the GM presses it only after the silence.
- Two small mismatches the audit noticed in passing: The Paper Lantern is not among Flood Tunnel's night destinations, and the departure has no capacity field (the Met Office holds two, the Night Shift three, in prose only).

### 2.5 What this deliberately does not do

No trigger silently changes campaign state without the log entry (Law 12). No trigger fires on page load or on a timer — every one is a GM click (Law 17, "confirm anything the players will see," extended here to cover anything the *log* will see too, on the theory that a false mechanical record is worse than a missing one). No trigger recomputes sf2e's own math. Nothing here is mandatory to use — a scene brief with zero `triggers[]` renders and runs exactly as it does today; this is additive.

---

## 3. The temptation list

A new, optional, scene-level field, `temptations[]` — not tied to any one beat, because the whole point is that a GM reaches for one *whenever* the table needs a nudge, not at a scripted moment:

```jsonc
"temptations": [
  { "id": "ask-nobu-for-more", "text": "Nobu's clearly got more in the back than the docket says — worth asking?" }
]
```

One sentence, in the GM's own voice, ready to say out loud unprompted. Never mandatory, never logged as anything beyond an ordinary `note`-kind trigger if the author wants one attached to the moment it got used. Doctrine-wise this is the same shape as an Encyclopaedia check's own "costs nothing, purely optional" convention, moved from a mechanical check into pure GM prose — the cheapest possible way to add width to a scene that's gone quiet.

---

## 4. `walkOn` — resolved

The schema's own comment said a walk-on "does not offer to stage a portrait." Never enforced. **Resolved 2026-09-20: walk-ons still get a Quiet-tier stage frame if the GM chooses to put them up, but never a `splash` and never an inline `npc-enter` trigger is authored for one** — the distinction that actually matters is *effort spent authoring*, not *capability offered*. A three-line foreman doesn't need an inline entrance trigger written for him; if a GM wants to put his portrait up anyway, nothing should stop them. `walkOn` remains a hint to the author ("don't bother writing entrance staging for this one"), not a capability restriction in the running code.

---

## 5. The NPC gap tracker

**Built.** `data/generated/npc-asset-gaps.json` — generated by `tools/npc-gaps/generate.mjs` (matching the Node Registry's own "generated, never hand-edited" convention, including living under `data/generated/` rather than `data/campaign/`, since it's a computed report over the rest of the repo and has no meaningful `$schema` to declare — `test/tier2-data-corpus.test.mjs`'s own documented exclusion) that diffs every `data/npcs/*.json` file against `asset-registry.json`'s `assignedTo` entries and reports, per NPC: has a portrait been assigned (`hasPortrait`), has a `socialProfile` with at least one Fact been authored (`hasSocialProfile`/`factCount`), is `name` still null (`nameIsPlaceholder`). Regenerate on demand rather than maintaining by hand: `node tools/npc-gaps/generate.mjs`. As of first run (2026-09-20): 37 NPCs, 30 with no portrait, all 37 with zero authored Facts, 34 still naming placeholders — the honest starting picture this whole pass exists to improve.

---

## 6. Build ledger

Kept current as work lands. 🟡 = partly built, ✅ = built and tested, ⬜ = not started.

| Item | Status |
|---|---|
| 1. Render `choicePoint` (schema already exists, two real scenes already author it) | ✅ `#decorateBeat`/`beat.hbs`/`#onRecordChoice`, tested (tier3-inline-trigger-dispatch-contract) |
| 2. Inline `<trig id="...">` parser + `triggers[]` schema + dispatch table + chip rendering | ✅ `core/inline-triggers.mjs` (tier1), `#onFireTrigger` dispatch (tier3) |
| 3. Trigger presses call `recordLogEntry` with structured subject | ✅ `triggerLogSubject`/`choiceLogSubject`, gated on real success per §2.5 |
| 4. `walkOn` behaviour documented and left as an authoring hint, not enforced | ✅ (this document) |
| 5. NPC gap tracker, generated | ✅ `tools/npc-gaps/generate.mjs` → `data/generated/npc-asset-gaps.json`, tested |
| 6. `temptations[]` schema field + rendering | ✅ `sceneRunnerState`, `#onUseTemptation`, always-visible panel section, tested |
| 7. Apply the Ten Questions to all 9 existing Episode One/Two scene briefs | ✅ all 9 Episode One scenes done, see per-scene table below |
| 8. Author the remaining ~9 Episode Two scene briefs from scratch, using this framework from the start | ⬜ *(Episode Two's scene briefs have since been written, `data/scene-briefs/episode-c1e2--*.json`; this row was not updated as they landed.)* |

**Item 7, per scene** (Episode One's own running order). A scene passing the Ten Questions does NOT mean all ten fields got new content — several questions correctly answer "already right, don't add" for a given scene shape (a landmark makes no sense across six separate locations; a montage scene shouldn't grow more optional width once pacing notes already warn against it). The table records what was actually decided, not a checkbox count.

| Scene | Status | What changed |
|---|---|---|
| 1. `episode-c1e1--the-road-in` | ✅ | One temptation (`what-did-you-leave`) for a thin spotlight. Cast/landmark/width/choicePoint/triggers all deliberately left alone — a six-location montage scene, correctly shaped differently from a located conversation. |
| 2. `episode-c1e1--intake-medicals` | ✅ | `intro.landmark`; `intro.triggers` (new capability, see below) with an `npc-enter` for Shucks glimpsed inside the intro's own readAloud; `npc-enter` for the clerk on `form-12b`; one temptation. Width/depth left alone — already exceptionally wide (6 optional beats around 4 mandatory) and deep (3 separate Node threads) before this pass; adding more would have diluted a model scene, not improved it. |
| 3. `episode-c1e1--assembly` | ✅ | `npc-enter` for the Deputy Director on `the-address`; one temptation nudging toward the easy-to-miss `read-the-room` check. Cast/width/depth/choicePoint left alone — already four named NPCs and four optional checks; the three walk-on NPCs (Section Officer, Hulda Brack, Comms Officer) deliberately did NOT get inline triggers, per §4's own walkOn resolution. |
| 4. `episode-c1e1--kit-issue` | ✅ | `intro.landmark`; `npc-enter` for Nobu on `the-counter`; one temptation inviting a player to work Nobu for something extra without breaking `the-extra-thing`'s own "never offer it unprompted" rule. Width deliberately left alone — the scene's whole design is brisk and low-stakes, and more optional content would fight its own pacing note. |
| 5. `episode-c1e1--the-errand` | ✅ | `intro.landmark` added; new optional beat `the-shelves` (free environmental plant, no check, per this scene's own established zero-check-near-Manako design); `npc-enter` triggers for Manako and the storekeeper; `note` trigger on `the-mark-again`; two temptations. Live-verified in Foundry. Depth (Q5) deliberately left alone beyond what already exists — the challenge file's own notes explicitly rule out a catalogue-naming knowledge check as a way to shortcut reaching Manako, so no new check was added there. |
| 6. `episode-c1e1--the-tram-back` | ✅ | One temptation, formalizing a suggestion that already existed loose in the beat's own `direction` text ("ask what Manako was like") into a real, clickable, loggable prompt. Everything else deliberately untouched — this is one of the two smallest scenes in the episode by design. |
| 7. `episode-c1e1--canteen` | ✅ | `intro.landmark`; `npc-enter` triggers for Taka (splash arrival) and the Section Officer on their own entrance beats; one temptation for the easy-to-forget `recall-the-drains` Encyclopaedia check. Cast/width/depth/choicePoint-shape left alone — already four named NPCs and three optional beats, and `the-announcement`'s whole point is that no choice is offered, so no choicePoint belongs there. |
| 8. `episode-c1e1--the-walk-down` | ✅ | `npc-enter` for Taka's optional send-off, for consistency with his other two appearances. Deliberately nothing else — this scene's own note says it "should not also be doing narrative work," and no hidden suggestion existed in its prose worth formalizing into a temptation the way Tram Back's did. |
| 9. `episode-c1e1--flood-tunnel` | ✅ | One `note` trigger marking the moment the fight actually starts (`nest-wakes`) — timestamped combat-start is real value for "build a picture of the episode" even with no NPC to stage. One temptation nudging toward `sizing-up-the-nest`. Everything else deliberately left alone — this scene already received its own comprehensive pass 2026-09-19 (refusal floors, the three-way `choicePoint`, landmark/holdInReserve, tracks) and adding more would have been padding, not improvement. |

**A pattern worth naming, found repeatedly across this pass:** the scenes that needed the LEAST new content were the ones already praised elsewhere in this project for their craft (Intake Medicals, The Errand, Flood Tunnel, Assembly) — width and depth were already real there, so the Ten Questions mostly confirmed rather than added. The scenes needing the most (Kit Issue, Canteen) were ones with fewer named NPCs given the staging treatment yet, not ones lacking content. **Also worth naming: two capability gaps found only by actually authoring content, not by reading the design doc.** (1) `intro.readAloud`/`outro.readAloud` had no way to carry a `<trig>` token at all until Intake Medicals' own intro needed to glimpse Shucks mid-narration — §2 was originally beat-scoped only; `intro.triggers[]`/`outro.triggers[]` (same shape, scoped as beatId `"intro"`/`"outro"`) now exist in the schema, `#decorateSceneReadAloud` decorates both, and `#onFireTrigger` falls back to them when no real beat matches. (2) `revealHandout`'s pre-existing early returns were bare `return;` until reveal-handout-kind triggers needed a real boolean to gate logging on (§2.5's "a false record is worse than a missing one") — now returns `true`/`false` on every path; existing callers were unaffected since neither previously read the return value. Both are tested (tier3-intro-outro-triggers-contract, tier3-inline-trigger-dispatch-contract).

**Live-verified 2026-09-20** in the local licensed Foundry test instance, against a real running scene (`episode-c1e1--the-errand`, beat `the-old-man`'s new `manako-appears` trigger + beat `how-to-file-it`'s pre-existing `choicePoint` + two new scene-level `temptations`): the inline chip rendered mid-sentence exactly where authored, clicking it staged Manako's portrait card on the theatre-of-the-mind stage and wrote a `the-old-man::trigger::manako-appears` log entry; picking a choicePoint option applied the `--picked` style, ticked the beat (progress counter moved 0/6 → 1/6), wrote a `how-to-file-it::choice::quietly` log entry, and clicking the same option again correctly toggled it back off; clicking a temptation's "Said this" wrote a `temptation::ask-what-he-thinks` log entry without touching run state or gating anything, confirmed reusable. **Found and fixed in passing, local-only:** the licensed local Foundry install's own copy of campaign data (`module/blank-inheritance/data/campaign/`, junctioned into `Data/modules/blank-inheritance/`) was still the pre-terminology-sweep `c1s1`/`c1s2` naming — refreshed via `stageCampaignData()` (`tools/module-sync/stage-campaign-data.mjs`) copied straight over the gitignored local mirror, no SSH involved. This is local-dev-environment staleness only; the remote server and repo-root `data/` were never affected, and nothing here has been pushed to the remote yet.

Related: `design/ux-doctrine.md` (governs every decision above), `design/theatre-of-the-mind-staging.md` (the system triggers dispatch into), `design/npc-social-intel.md` (the Character Card content this pass should also be writing), `design/visual-identity.md` §3f (the colour vocabulary reused rather than replaced), `design/craft-library.md` (still the source for scene *quality*, not superseded by the Ten Questions above — both checks apply).
