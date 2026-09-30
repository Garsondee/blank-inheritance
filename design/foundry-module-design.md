# Blank Inheritance — Foundry VTT Module: Concept Design

Design for the module that ships this campaign into Foundry VTT, keeps it in sync with the JSON authored in this repo, and runs session logistics. Concept-level: architecture and decisions, not code. Every technical claim here is backed by [foundry-technical-reference.md](foundry-technical-reference.md) — that document is the source of truth for exact field names/APIs; this one is the reasoning on top of it.

**2026-09-04 note:** originally written against `foundry/blank-inheritance/`. A second module scaffold (`module/blank-inheritance/`, a system-generated v14 package with compendium packs wired up) was created since, prompting a real reconciliation — see GitHub issue #70 and the amended §8 packs bullet below. The two were consolidated into one module directory, `module/blank-inheritance/` (issue #71, 2026-09-04/05); read any `foundry/blank-inheritance/` path below as `module/blank-inheritance/`.

Written against the user's seven numbered goals (reproduced inline as headers below), Foundry VTT v14.367, and sf2e v1.4.1.

---

## 0. The one decision everything else follows from

**Push and harvest are not the same operation, and pretending they are is where sync projects like this usually die.**

- **Push (repo → Foundry)** is automatic and authoritative. It runs whenever the GM clicks Sync in the module. It overwrites *authored* content without asking. This is where "reflavour all the monsters in Act 1" happens — edit JSON here, click Sync there, done.
- **Harvest (Foundry → repo)** is deliberate and GM-initiated. It never runs in the background. It pulls specific things worth keeping — a journal entry rewritten mid-session, a token layout arranged by hand — back down as files WinSCP carries home.

This asymmetry is why the design doesn't need a general three-way merge engine, a conflict-resolution UI, or a "last write wins" clock race. Every field on every generated document is one of four things, decided per-schema, not globally:

| Class | Owner | Push behaviour | Harvest behaviour |
|---|---|---|---|
| **Authored** | repo | always overwritten | never pulled |
| **Runtime** | Foundry | never touched | never pulled (it's session state, not content — current HP, active conditions, initiative, mid-combat token position) |
| **Promotable** | Foundry, once touched | *not* overwritten once a GM edit is detected, until harvested | GM can explicitly pull it back into the repo, which makes it "authored" again |
| **Lifecycle** | one named Foundry-side system | repo may only ever push the field's baseline value | **mandatory**, one-directional, no adjudication — the repo was never a legitimate second writer, so there is no conflict to detect in the first place |

Concretely: a Claimant's stat block is authored (I write it, it gets pushed, full stop). A scene's journal-page prose is promotable (I write the first draft; if the GM rewrites it live at the table, push must not clobber that until the GM says "yes, take this back"). A token's HP-during-combat is runtime (neither side ever touches the other's copy). A location's `authoring.status` is lifecycle (added 2026-09-18): repo-side generators may only ever emit `drafted`; the Foundry Approvals Desk is the sole system allowed to raise it, and whatever it writes simply overwrites the repo on harvest, every time, because `promotable`'s human-adjudicated-conflict machinery is solving a problem this field doesn't have — see [design/approvals-desk.md](approvals-desk.md) and [design/data-ownership.md](data-ownership.md), which generalises this fourth class into a project-wide, tested convention rather than a one-off exception to the three above.

Detecting "has this been touched in Foundry" needs no custom hashing infrastructure beyond what's described in §4 — it's the same mechanism as detecting "has this changed in the repo," just compared against the other side's last-known value.

Compendium packs sit outside this whole model on purpose — see the amended §8 bullet. They're a one-way, no-history "clean starting point" mechanism (a fresh world, or recovery), never the live sync path.

---

## Safety: why this can't corrupt the world, and the one gap that still needs closing

Raised as a serious, named concern (2026-09-04) — answered here concretely, grounded directly in Foundry v14's real source (`foundryvtt/Foundry Virtual Tabletop/resources/app/`), not by assurance.

### What a world actually is, on disk

Foundry v14 stores world documents in **LevelDB** (via the `classic-level` package), *not* NeDB and *not* flat JSON files — NeDB only appears as a one-time legacy migration path for worlds that predate v13 (`dist/database/backend/server-document.mjs`'s `_migrateNEDBToLevelDB()`). A world's `data/` folder holds one LevelDB environment per top-level collection (`data/actors/`, `data/scenes/`, `data/journal/`, …) — a write-ahead log plus periodically-compacted sorted-string-tables plus a manifest (`dist/database/backend/level-database.mjs`). **There is no "one file = one Actor" to safely open and hand-edit.** Embedded documents (an Actor's Items, say) aren't separate files either — they live as key-prefixed sublevels multiplexed inside their parent's own store (`server-document.mjs`'s `_getDBKey()`/`formatKey()`).

### Why raw file access is never safe — running or stopped

- It's a log-structured merge tree. "Editing just this document" means correctly reimplementing LevelDB's key encoding, sublevel-prefixing, and write path by hand — there's no partial shortcut.
- A raw copy or edit while Foundry holds the store open races Foundry's own internal write serialization (a `Semaphore(1)` per store) and bypasses the OS-level `LOCK` file entirely. Torn, interleaved writes from an uncoordinated second process are exactly how a store like this corrupts.
- Foundry's own code treats "an embedded document survives after its parent doesn't" as an anticipated failure shape, not a hypothetical — it walks and cleans these up on every connect (`deleteOrphanDocuments()`). That's precisely the kind of corruption a naive raw edit produces.
- Foundry ships exactly one recovery path (`ClassicLevel.repair()`, auto-retried once on a failed open) — and repair works by rebuilding the manifest from whatever SST files it can still parse, **discarding the rest**. It can bring a corrupted store back online; it does not guarantee your data survives.

### Why the Document API, from a live GM session, is the safe path

Every legitimate write — this module's `Actor.create()`/`Scene.create()` calls, the GM's own UI, and even Foundry's own `Adventure` import (confirmed by reading `client/documents/adventure.mjs` directly) — funnels through the exact same server-side choke point: `ServerDatabaseBackend#_createDocuments`/`#_updateDocuments`/`#_deleteDocuments`. That single path guarantees, for every write: serialization through the store's semaphore, schema validation and cleaning before anything touches disk, correct sublevel bookkeeping for embedded documents, and one atomic batched LevelDB transaction per operation. **This project's sync script has always called only this API, from inside a real GM-authenticated session — never a raw file — and that is exactly right. Keep it that way permanently; there is no reason to ever change it.**

### The rules this produces

1. **All world-document writes go through the Document API**, called from a live, GM-authenticated Foundry session — never raw file access, never headless/offline.
2. **Back up the whole `worlds/<world-id>/` folder before any sync run that touches real content — with Foundry stopped.** Nothing else guards against a mistake; Foundry has no built-in world versioning or snapshot feature. A copy taken while Foundry is running risks capturing a torn mid-write/mid-compaction snapshot; a copy taken while stopped is an ordinary, fully safe file operation.
3. **Keep validating by reread after every write** (already Stage-1 policy, `core/validate.mjs`).
4. **Keep deterministic IDs + `keepId: true`** (already the design) — this is the same id-based create-vs-update idiom Foundry's own `Adventure` importer uses internally (`prepareImport`'s `collection.has(d._id)` partition), not a workaround bolted on from outside.

### The one real gap, and why it matters starting now

At today's scale — 3 test documents in the Stage-1 diagnostic — a throw partway through leaves whatever was already created sitting in the world with no rollback. Survivable at that scale. It stops being survivable the moment a sync creates dozens of documents for a real scene (journals, NPCs, tokens, a playlist). **Before the sync pipeline scales past its current diagnostic, it needs either a dry-run/preview mode, transactional batching (create everything, commit/report success only once all of it validates), or at minimum a clear partial-failure report naming exactly what was and wasn't created** — tracked as its own issue precisely because this is where "GM edits a document, syncs, and something's silently half-wrong" would actually happen.

---

## 1. "I write the adventure here, it uploads and updates automatically"

### Where the campaign lives
The module ships the campaign *inside itself* (per the existing `foundry/blank-inheritance/` skeleton: `data/` for authored JSON, `assets/` for binaries, both WinSCP targets). One push carries code and content together — no separate deployment step for "the adventure" versus "the module."

### Deriving Foundry IDs from repo IDs — the load-bearing trick
Foundry document IDs must be exactly 16 alphanumeric characters, and — confirmed in the technical reference — **creating a document with an explicit `_id` and `keepId: true` is fully supported**, with embedded-document IDs preserved automatically. So: every entity's Foundry ID is a deterministic hash of its repo `id` string (e.g. `"claimant-three"` → a fixed 16-char digest, stable forever).

This one decision is what makes the rest of the sync design simple:
- **Push is idempotent.** Re-running sync against unchanged data touches nothing — the derived ID already exists, the hash already matches.
- **Cross-references resolve without a lookup table.** An episode's scene referencing `"journal": "journal-ep1-scene3"` computes the same Foundry ID every time, whether the target document exists yet or not (Foundry doesn't validate that a reference field points to something real — it just resolves to `null` until the target shows up, then resolves correctly). Creation order across entity types stops being a real constraint.
- **No separate ID-mapping file to maintain or go stale.**

### The sync operation itself
No manifest file to hand-maintain. On Sync:
1. The module walks `data/` via `FilePicker.browse` (recursing per-subfolder, since browse is one level at a time), `fetch()`-ing each JSON file it finds.
2. For each file, it reads the entity's own `id`/`type` fields, derives the target Foundry document, and computes a content hash (Foundry exposes no hashing utility — `SubtleCrypto.digest`, a standard browser API, fills that gap).
3. It compares that hash to a flag stored on the Foundry document itself: `flags["blank-inheritance"].sourceHash`. Flags are the right place for this — confirmed in the technical reference that bulk data must **not** go into `game.settings` (every world-scoped setting ships to every client on join with no size cap), whereas a flag lives with its document and is only loaded when that document is.
4. Mismatch (or document doesn't exist) → generate/update, respecting the field-ownership classes from §0. Match → skip.
5. A file present in the repo but whose derived document doesn't exist yet → create. A document that previously came from a repo file that's since been deleted → **flagged for review, never auto-deleted.** (Document *deletion* via the normal Actor/Scene/JournalEntry API is completely unrestricted — this is a policy choice, not a technical limitation. Silently deleting a GM's world content because a JSON file vanished is exactly the kind of surprise this design avoids.)

### Manifest requirements this implies
`module.json` needs `"socket": true` (for the director's panel's cross-client cues later — silently a no-op without it) and, per §4, `"persistentStorage": true` with a `storage/` directory declared. `relationships.systems` must require `sf2e`. Everything else is the standard fields documented in the technical reference §1.

---

## 2. "A system which can create scenes, PCs, NPCs and setup anything else Foundry might require"

This is where the sf2e research changes the plan the most. **PCs and NPCs are not the same kind of generation problem.**

### NPCs and Claimants: flat mapping (the easy case)
An sf2e `npc`-type Actor authors its final numbers directly — `system.abilities.*.mod`, `system.skills.<slug>.base`, `system.saves.*.value`, `system.attributes.ac.value`, all as plain totals, not proficiency ranks. This lines up almost exactly with this project's existing `creature.schema.json` (`combatStatblock`): the schema's computed `modifier` field *is* the sf2e total; `rank` is bookkeeping sf2e doesn't need but we keep for our own reference. Strikes map onto embedded `melee` Items nearly 1:1 (`attackBonus` → `bonus.value`, the `damage[]` array → sf2e's `damageRolls` map, `traits` → `traits.value`). Special abilities map onto embedded `action` Items. This is a mechanical, deterministic translation — the generator for Claimants is close to a pure data transform.

### Kids and Frames: derive from Items, don't compute fields
The research surfaced something the earlier schema design didn't anticipate: **every shipped sf2e `character` actor stores `system.abilities` as literally `null`.** AC, saves, and most proficiencies aren't actor fields at all — they're computed at runtime from embedded `ancestry`/`heritage`/`background`/`class`/`feat` Items. Writing computed numbers into a PC's system fields the way we would for an NPC would produce a sheet that displays wrong the moment sf2e recalculates anything.

So generating a `kid` or `frame` Actor means: create the Actor shell, then **create or link the real Items that produce those numbers**, and let sf2e's own derived-data engine do the arithmetic:
- Ancestry, background, and class that match a standard SF2E option become `@UUID` references into the sf2e compendia (29 packs, cataloged in the technical reference — e.g. `Compendium.sf2e.classes.Item.<id>`), not hand-authored data.
- Feats resolve to compendium UUIDs by name+category where possible; anything genuinely homebrew (unlikely for a kid, more plausible for Frame-specific reflavoring) gets authored as a bespoke Item.
- This is *more* generation work per character than a Claimant, but it's also what makes the sheet behave like a real, valid SF2E character instead of a static readout — feat prerequisites, proficiency math, everything sf2e's sheet code already does for free.

### Purely social NPCs (Commander, Caretaker, Transparency Advocate) don't need Actors
`npc.schema.json`'s `statblock` field is optional for exactly this reason. An NPC with no statblock becomes a `JournalEntryPage` (portrait as the page image, bio as the text) rather than a mostly-empty Actor. If a scene needs their visual presence, a `Note` pinned on the scene image and linked to that journal page does the job without a Token or Actor at all. Only NPCs that could plausibly roll dice get the full Actor treatment.

---

## 3. Scenes, Theatre of Mind, and the asset pipeline

### Theatre of Mind is a Scene + Notes, not a special mode
Confirmed in the technical reference: v14 moved scene backgrounds onto an embedded `Level` document (`background.src`, supports image or video), and Notes can be pinned anywhere on that image and linked to a specific `JournalEntryPage`. So "background image with journals laid out on the page" *is* the native Theatre-of-Mind pattern here — a Scene with one `Level`, minimal or no grid, and a handful of `Note`s positioned over points of interest, each pointing at the relevant journal content. No custom document type needed.

### The asset pipeline lives here, not in Foundry
This is a deliberate simplification against what the request originally described. Foundry's file API (confirmed in the technical reference) supports browsing and uploading, but **there is no move or delete operation for files** — "reorganizing" `assets/unassigned/` from inside Foundry would mean re-uploading bytes to a new path while leaving the stale original behind, with no way to clean it up.

So asset triage happens **here, before anything is pushed**: drop new art into `foundry/blank-inheritance/assets/unassigned/` locally, and sorting it into `scenes/`/`tokens/`/`portraits/`/`ui/`/`video/`/`audio/mood/`/`audio/cues/` is a repo-side authoring step (moving local files, updating the JSON that references them) — the same kind of work as writing a scene description, just with an image instead of text. WinSCP only ever pushes an already-organized structure. This also sidesteps a real technical limitation instead of working around it awkwardly at runtime.

**Update:** the raw intake side of this got more concrete after this doc was written — `artwork/` and `audio/` now exist as real, large in-tray libraries (see `ideas/entries/asset-review-pipeline.json`), and the intended workflow grew a step beyond what's described above: each asset gets AI-examined and described before a human confirms the description/purpose via some kind of review UI, *then* it moves to an organized location (audio additionally gets compressed to MP3 with the source WAV discarded). The "sorting is a repo-side authoring step, not a Foundry-runtime feature" conclusion above still holds — this just adds a cataloging-and-confirmation step before that sort happens. Not designed in detail yet; treat the idea entry as more current than this paragraph until it's folded in properly.

---

## 4. Bidirectional sync and the file-system question

This was flagged as open going in; it's resolved now, with one real constraint that shapes the whole module layout.

### The update-wipe trap, and the fix
Every module install/update deletes the entire module folder **except** a directory literally named `storage/`, and only if the manifest declares `"persistentStorage": true` (which also makes Foundry auto-create that directory, satisfying the "target must already exist" precondition for uploads). This means:

- `data/` is **push-only, read-only from Foundry's perspective** — seed content, safely wiped and re-pushed every deploy.
- `storage/` is where **harvested content and sync state live** — it survives updates, and `.json` overwrite there is explicitly permitted (confirmed: `.json` qualifies for the server's overwrite allowance; only the four manifest filenames are hard-blocked).
- **Deploy only via WinSCP, never Foundry's built-in module updater.** The updater is precisely the operation that triggers the wipe. `persistentStorage` is insurance against an accidental update, not the primary workflow.

### Harvest, mechanically
**2026-09-27: built for scenes, in a different shape. See [scene-edits.md](scene-edits.md).** A scene
brief is not a Foundry document, so it has no promotable fields to detect. Ingram edits it in the Scene
Runner's edit sheet. Each change is an immutable record in `storage/`, laid over the deployed files by
the Runner and merged into the repo by `tools/scene-edits`, automatically at conversation start, before
an edit of a scene file, and in `npm run deploy`. The promotable class below was realised for the episode
journals and Papers handouts: one edited in Foundry is kept, not rebuilt or rewritten, and filed for
folding in by hand (`core/foundry-edits.mjs`). The original plan follows.

A GM-facing action (a context-menu entry on a document, or a button in the director's panel — TBD at build time) triggers, for a specific document: read its current *promotable* field values, serialize to JSON, `FilePicker.implementation.uploadPersistent("blank-inheritance", "harvest/<entity-id>.json", file, {}, {notify: false})`. That lands in `storage/harvest/`, which WinSCP pulls down on the next sync pass. A future (or immediate, manual) step reviews and merges it into the canonical `data/` file — deliberately not automatic, since "did the GM's edit actually improve on the authored version" is a judgment call, not a merge algorithm's job.

### Conflict handling stays narrow on purpose
Because only *promotable* fields are ever subject to this at all — authored fields always lose to the repo, runtime fields are never compared — the only real conflict case is "this promotable field changed in both places since the last sync." That's detectable (repo hash changed *and* Foundry-side hash changed from the same baseline) and gets surfaced for a human decision rather than silently resolved either direction. *Lifecycle* fields (§0) are narrower still and need no detection step at all: the repo side is structurally forbidden from writing anything but the baseline, so there is nothing for its hash to have changed to — harvest just overwrites, unconditionally, every time.

---

## 5. Inline skill checks

sf2e's `@Check[...]` enricher (verified against 1,586 real uses in the shipped compendia, not just source code) is exactly the mechanism item 4 was asking for, and this project already has the data shape it needs: `challenge.schema.json`'s `check` — `skillOptions`, `dc.value`, `dc.adjustment`, per-degree `outcomes`.

Generating the button is a small, mechanical template, not a parser:
```
check.skillOptions[0] + check.dc.value  →  @Check[<skill>|dc:<value>]{<name>}
```
with `dc.adjustment` translating to a `traits:` rarity tag where one applies. This string gets embedded directly into whatever `JournalEntryPage.text.content` or `Note` text references that challenge (via the `challengeRefs` field already added to `episode.schema.json`'s scene shape). No new schema work is needed — the hard part (confirming the real syntax, parameter names, and that `basic`/`against`/`showDC` etc. all behave as expected) is already done and cited in the technical reference.

---

## 6. Mood and cues

This is close to free, structurally. Confirmed: Scene↔Playlist binding is fully native — a Scene's `playlist`/`playlistSound` fields, and Foundry's own `Playlists#_onChangeScene` automatically stops the previous scene's audio and starts the new one on activation. No custom playback code needed for the common case.

- **Mood pools** (`assets/audio/mood/<mood>/`, several tracks) become a `Playlist` with `mode: SHUFFLE`, one `PlaylistSound` per track, bound to a scene's `playlist` field.
- **Specific cues** (`assets/audio/cues/`) become a single `PlaylistSound`, bound to a scene's `playlistSound` field, which overrides the playlist for that scene.

Authoring this is just: generate the Playlist/PlaylistSound documents from the audio manifest, and set two fields per scene. The interesting design work already happened in §1 (the sync mechanism) and §3 (the asset pipeline that gets the files into the right folder in the first place).

---

## 7. The director's panel and the "TV show" feel

### The primitives, already native
- `Scene#activate({viewOptions})` — GM-only, real document update, pulls **every connected client** to the scene. This is "cue the next scene."
- `Scene#pullUsers(users, viewOptions)` — pulls specific users to the GM's *current* view without changing the world's active scene. The finer-grained lever, for "everyone look at this for a second" without committing to a scene change.
- `canvas.transition` — a genuine built-in cinematic transition system, **13 effects** (fade, glitch, hologram, hole, swirl, dots, and more), invoked declaratively by passing `transition: {type, duration}` inside `viewOptions` to either call above. This was going to be hand-rolled fade code; it isn't needed. A scene can also carry its own default transition so the caller doesn't have to specify one every time.

None of this needs custom sync/socket code — `activate()` is a document update, and document updates already propagate to every client through Foundry's normal channel.

### The panel itself
An `ApplicationV2` (the v14-current UI framework — AppV1 is deprecated, removal scheduled for v16) listing episodes/scenes/cues, each with a "Cue" action button wired via the standard `data-action` pattern. Concept-level layout, not final: scene list grouped by episode, a prominent "Landing Page" button, separate Intro/Outro triggers.

### The landing page is a Scene, not a special screen
Simplest option and the one that reuses everything above: a `Scene` whose only purpose is being the idle "home base" between beats, activated the same way as any other scene. The director's panel's persistent "Home" button is just `landingScene.activate({viewOptions: {transition: {...}}})`.

### The cold-open sequence, and the one real gotcha
A Scene's background video, confirmed, **always loops** — there's no exposed autoplay/loop control for it (hardcoded at the render call site). Only **Tiles** have a configurable `video.{loop, autoplay, volume}` block. So: the intro/outro cinematics are **Tiles placed on a scene**, not scene-background video, specifically so `loop: false` is available.

Auto-advancing when the video ends needs a small amount of real custom code, because **no core hook or event fires on video end** (confirmed: `ended`/`timeupdate` listeners exist nowhere in Foundry's client code for video, only audio). The module attaches its own `ended` listener to the tile's actual `<video>` element (reachable via `tile.sourceElement`) and, on that event, calls `activate()` on whatever scene comes next. This is genuinely the only place in the whole design that needs a bespoke event-driven mechanism rather than composing existing Foundry primitives — worth knowing going in, not a surprise mid-build.

### Fully automated encounter placement is explicitly out of scope for now
Item 6 said "eventually," and the schema reflects that honestly: `encounter.schema.json` currently describes *who* is in a fight (creature list, XP-budget inputs) but not *where* they stand on the map. Placing tokens automatically would need position data the schema doesn't carry yet. Treat first-pass token placement as a manual GM step in Foundry; add a `tokenPlacements` field and automate it once the rest of the pipeline is proven out.

---

## 8. What this explicitly doesn't try to do (v1)

Named here so they don't get silently assumed later:
- No automated token placement for encounters — schema doesn't carry positions yet (§7).
- **Amended 2026-09-04 (issue #70):** compendium packs are back in, but scoped narrowly — a **one-way, no-history "clean starting point"** mechanism only (an `Adventure` pack for a fresh-world quick import, plus per-type packs for static reference content that never needs promotable-field tracking), not the live sync path. Confirmed directly from source (`client/documents/adventure.mjs`) that `Adventure` import runs through the exact same `createDocuments`/`updateDocuments` Document-API path as everything else in this doc — it is safe in the sense §0's safety section means — but with **destructive full-replace semantics** for anything that already exists by id (`updateDocuments(..., {diff:false, recursive:false})`, which discards fields not present in the update and never deep-merges). That's precisely why it stays the wrong tool for the campaign's live, evolving, GM-editable content: the push/harvest/promotable field-ownership machinery in §0 is what protects a GM's live edits, and nothing about `Adventure` import respects that distinction. Packs and world-document sync are two coexisting, purpose-separated mechanisms from here on, not a replacement of either — everything else in this document (Scenes/Actors/JournalEntries as world documents, via `createDocuments`/`updateDocuments` with the field-ownership classing) still stands unchanged as the mechanism for actual campaign content.
- No general three-way merge — only *promotable* fields are ever subject to conflict detection, and conflicts are surfaced for a human, not auto-resolved.
- No victory-point subsystem live-tracking UI yet — `subsystem.schema.json` generates descriptive content (obstacle list with inline checks) fine today; a real pool-tracking panel with +/- controls is scoped as its own build item, not a byproduct of document generation.

---

## 9. Staged delivery

Roughly in dependency order; each stage should be independently useful, not a prerequisite-only waypoint.

1. **Manifest + minimal generator.** `module.json`, one script that reads a single `data/` JSON file and creates one Foundry document. Prove the deterministic-ID + hash-flag mechanism end to end on the simplest case: a Claimant → `npc` Actor (flat mapping, §2).
2. **Full document coverage.** Extend the generator to Scenes (Level/background, transition, playlist binding), JournalEntries, and social NPCs. Kids/Frames come last within this stage since they're the compendium-linking case, not the flat one.
3. **Inline checks + mood binding.** §5 and §6 — both are close to pure data-transform once stage 2's journal/scene generation exists to embed them into.
4. **Harvest.** `storage/` write-back, the promotable-field detection described in §4. Deliberately after push is solid, not alongside it.
5. **Director's panel.** Scene cueing, transitions, `pullUsers` — all native primitives, so this is mostly UI work once stages 1–2 exist.
6. **Cold open / outro.** The one stage with genuine custom event-handling (§7's `ended`-listener). Kept last because it depends on the panel existing and is the least reusable piece elsewhere.
7. **Later / explicitly deferred:** encounter token auto-placement, subsystem pool-tracking UI (§8).
