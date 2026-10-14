# Blank Inheritance — Foundry VTT Module

This directory **is** the Foundry module. Its contents map 1:1 onto `Data/modules/blank-inheritance/` on the Foundry server, so a WinSCP sync of this folder is the entire deployment step — no build, no packaging.

```
module/blank-inheritance/   →   <FoundryData>/Data/modules/blank-inheritance/
```

**2026-09-04 consolidation note:** this directory used to be `foundry/blank-inheritance/`. Two module scaffolds existed briefly — a real, Foundry-generated v14 package with better branding and a full compendium-pack manifest, and the original tested one — and got merged after a real architecture decision (GitHub issue #70): the manifest `id` stays `"blank-inheritance"` deliberately, because every deterministic-id derivation, flag scope, and FilePicker path in the tested code below is keyed to that id — changing it would invalidate the golden test fixtures and every document created by the 2026-08-22 live run for no functional benefit. Compendium packs were dropped from the manifest for now (none are populated yet) — see the amended §8 of `design/foundry-module-design.md` for when/why they come back.

**2026-09-05 correction:** the consolidation briefly renamed this directory to `mythica-machina-blank-inheritance-adventure-module` for nicer branding, while keeping `id: "blank-inheritance"` in the manifest. That combination is invalid — Foundry's real package loader (confirmed by reading `dist/packages/package.mjs` and independently confirmed live) rejects a module outright, with no partial/degraded mode, if the directory name doesn't exactly match the manifest `id`. It sat broken on the live server for about a day before a service restart's error log caught it (`Invalid module "blank-inheritance" detected in directory "mythica-machina-blank-inheritance-adventure-module"`). Renamed back to `blank-inheritance` to match the id, an invariant now enforced by an automated test (`test/tier0-architecture.test.mjs`) so it can't silently regress again.

Full design rationale: [`design/foundry-module-design.md`](../../design/foundry-module-design.md) (now includes a **Safety** section — read it before touching anything that writes to a live world). Exact Foundry/sf2e API facts behind those decisions: [`design/foundry-technical-reference.md`](../../design/foundry-technical-reference.md). Session-structure design (landing page, the city map hub, scene transitions): `data/campaign/scene-set.json` and [`design/ux-doctrine.md`](../../design/ux-doctrine.md) §3.

## Current status: real campaign content now syncs live, alongside the diagnostic

Two sync entry points exist now, both sharing the same core generators/hash-skip machinery (`scripts/foundry/sync.mjs`) but pointed at different content:

- **`runDiagnosticTestSync`** — the original pipeline health-check: one test NPC Actor, one test PC Actor, one Scene, one JournalEntry, all from `data/_test-fixtures/`. **Run against a live Foundry instance 2026-09-05 — 22/22 checks passed** (GH issue #114 added the JournalEntry case; that run also caught and fixed a real bug where the persisted report file silently failed to write even though the clipboard copy succeeded — see `writeReportFile`'s comment in `scripts/foundry/io.mjs`).
- **`runRealContentSync`** (GH issue #82, 2026-09-05; opened up to every npc 2026-09-29) — the real thing: **every file in `data/npcs/`**, discovered by directory listing rather than a hand-maintained shortlist (`REAL_NPC_PATHS` used to name exactly three — Shucks Mordant, Nobu, the Intake Medicals clerk — until Ingram asked for every npc to have a real Actor and a GM-only reference token, regardless of how far its own content has been reviewed; see `sync.mjs`'s own comment, where that list used to live, for the full reasoning) as NPC Actors, and every real episode (`data/episodes/*.json`) as a JournalEntry (one page per authored scene beat, via `episodeToJournalSource`). Each Actor's token-ring subject and portrait `img` are resolved automatically too, by file-existence convention against whatever `tools/token-ring/`'s two staging scripts most recently wrote (wired into `npm run deploy`) — no per-npc code edit, ever. **Each Actor's sheet text is generated from canon (D080, 2026-10-07):** `details.blurb` is one line from the NPC file's role and affiliation, `details.publicNotes` is that same line and never a fact (a player may be able to read public notes), and `details.privateNotes` (GM only) is the person's settled canon facts, split into what the table is told and what is held back, with their open decisions flagged "not decided yet" and a count of the pencil left out (`core/actor-notes.mjs` renders it). It reads `data/campaign/actor-notes.json`, which `story build` makes from `canon/world/` and the NPC files' `canon` links; the sync fetches it once per run, it is part of each Actor's source hash (so a canon change rebuilds the Actor), and with the file absent every Actor keeps its blurb. The NPC files' old `description` prose is retired. **Deliberately does not touch the six kid sheets** — they are TEST ONLY fixtures, to be removed before Session 0/1 (GitHub #202); the real six are made by the players at induction. There are no Frame sheets to sync: the six drafts were deleted 2026-09-19. **No longer syncs a Claimant, as of 2026-09-19** — `data/antagonists/claimants/contact-unclassified.json` and the whole frame-scale battle simulator it was also the single source of truth for were deleted, unapproved and stale, at Ingram's direct instruction; a creature/Claimant still goes through `runRealCreatureCase`, still gated on `authoring.status` (a combat stat block is different, still-sensitive content from a social NPC's blurb) — `sync.mjs`'s own comment records how to restore the case once a new, approved Claimant exists.
- **`buildSceneSet` / `retireOrphanedScenes`** (`scene-build.mjs`, 2026-09-18/19; hidden reference tokens added 2026-09-29) — the real Scene documents: reads `data/campaign/scene-set.json`, creates or updates (never replaces — a GM's own tokens/walls/lights on a scene this pipeline built are refreshed in place, never destroyed) every scene, folder, map pin and the player-facing pin journal it names, then removes any scene THIS pipeline previously created whose entry has since been removed from the manifest. Provably safe to run unattended: a scene with no flag of ours, or one merely *adopted* (recognised as a pre-existing hand-built scene, like the real production "Campaign Map") rather than created, is never touched by the removal half regardless of what the manifest says. For every scene it builds or updates (never an adopted one), it also places a **hidden**, actor-linked Token for each npc named in that scene brief's `cast[]` — never sent to a player's client (`Token#hidden`, the same mechanism `design/theatre-of-the-mind-staging.md` §4 names as correct), purely so the GM can click straight into an NPC's sheet during Theatre of Mind play.

Split into a pure core and a thin Foundry-touching adapter, enforced by an automated test suite (repo root `test/`, run with `npm test`) — see [`design/testing-strategy.md`](../../design/testing-strategy.md) for why and how:
- `scripts/core/` — `ids.mjs`, `validate.mjs`, `report.mjs`, `generators/{creature,character,scene,journal}.mjs`. Zero Foundry globals; runs and is unit-tested in plain Node.
- `scripts/foundry/` — `io.mjs` (FilePicker/fetch/clipboard wrappers), `sync.mjs` (the real/diagnostic content sync entry points; teardown-before-setup so re-running is safe, each case isolated so one failure doesn't hide the others), `scene-build.mjs` (the real Scene set, same idempotent/isolated shape). The only place Foundry globals may appear.
- `scripts/blank-inheritance.mjs` — thin entry point: hooks + macro creation, including starting the world sync (below).

**To run it:** you normally do not. The auto-sync watcher (`tools/module-sync/autosync.mjs`, started by every Claude Code session in this repo; `npm run autosync -- status`) runs the deploy below by itself, a few seconds after edits stop (2026-10-07, Ingram: local changes always reach the server). `npm run deploy` from the repo root forces one now. It checks that the module can load, pushes this folder, the real campaign content and the opening-title videos, verifies every file on both sides, and writes the build stamp last (see `tools/module-sync/README.md`). Never push a hand-picked subset: that is how a `module.json` once reached the server without the stylesheet it names, and Foundry rejected the whole module. Enable the module in your world (it requires the `sf2e` system). Two ways to trigger a sync:
- **Automatic, no confirmation — the world sync** (`scripts/core/world-sync.mjs` decides, `scripts/foundry/world-sync.mjs` acts; 2026-09-27). Every deploy (`npm run deploy`, `tools/module-sync/deploy.mjs`) writes a build stamp last, at `data/campaign/build.json`. The world remembers which build it was last brought up to. When a GM's page loads, and every 90 seconds while one is open, a different build means the world updates itself, in this order:
  1. the content sync (quietly, over every episode the stamp lists);
  2. the scene set built or refreshed;
  3. scenes the adventure no longer has removed;
  4. temporary scenes removed;
  5. empty duplicate scenes removed;
  6. stray scenes set aside;
  7. Actors and journals made from sources that no longer exist retired.

  Then one whispered card says what changed. Only the active GM's page ever acts, and nothing in it ever activates a scene. A deploy that includes new module code makes an open page ask for a reload (F5) rather than apply new content with old code. A changed `module.json` file list asks for a world relaunch, because Foundry reads the manifest only at launch.

  This replaced `runAutomaticSync` (2026-09-19, Ingram: "I wouldn't even see a dialogue that I have to confirm... it just updates, adds or removes scenes to get us to the current state of the adventure"). That hung off the first `canvasReady`, which Foundry never fires when no scene is active. It also redid everything, clipboard write included, at every login, and never noticed a deploy that landed mid-session.
- **Manual, any time:** **"Blank Inheritance: Update the World"** runs the world sync on demand (`api.runWorldSync()`). It is the old "Build the scene set" macro, retargeted in place at the same id. Also: **"Blank Inheritance: Sync Campaign Content"** (the content half alone, with its own chat report and clipboard copy) and **"Blank Inheritance: Run Test Sync"** (the diagnostic health-check).

Either sync:
1. Runs every case, reporting results in a whispered chat message.
2. Writes a full JSON report to `storage/test-reports/`.
3. **Copies the full report to the clipboard**, as a plain-text block — a short human-readable summary followed by the report as JSON. This is the reporting half of the two-way link with Claude: paste the clipboard contents straight into the chat for review. If the clipboard copy fails (no permission, non-HTTPS context), the chat message says so and the JSON report file is still the fallback.

Safe to re-run — it tears down its own previous documents first, and the hash-skip logic (#113) means an unchanged document isn't touched at all on a repeat run.

Test fixtures live in `data/_test-fixtures/` — clearly-marked synthetic data (`TEST FIXTURE —` name prefixes), not real campaign content, and only ever used by `runDiagnosticTestSync`.

## What lives here

| Path | Contents | In git? |
|---|---|---|
| `module.json` | Foundry package manifest — needs `socket: true` and `persistentStorage: true`, see design doc §1/§4 | yes |
| `data/_test-fixtures/` | Synthetic diagnostic-only fixtures, not real campaign content. **Push-only**: wiped and re-pushed on every deploy, never written to by Foundry. | yes |
| `data/campaign/` | The real campaign content (episodes, creatures, NPCs, characters...), landed here by `tools/module-sync/sync-campaign-data.mjs` from repo-root `/data` — **not committed under this folder in git**, since repo-root `/data` is already the one source of truth and this would just be a second, driftable copy of it. Exists only on the deployed server. | **no** |
| `storage/` | Not in this repo — lives only on the Foundry server, under `.../storage/` there. Harvested GM edits land here (`storage/harvest/`) and survive module updates. WinSCP pulls it down; nothing here is authored locally. | n/a |
| `scripts/` | Module JavaScript | yes |
| `styles/`, `templates/`, `lang/` | UI stylesheets, Handlebars templates, localization | yes |
| `assets/` | Images, audio, video | **no** — large binaries, synced by WinSCP but not committed |
| `packs/` | Compendium packs — currently empty. Reserved for one-way, no-history "clean starting point" content only, per issue #70's decision. Never the live sync path for campaign content — see the Safety section of `design/foundry-module-design.md`. | yes (LevelDB binaries once populated — `.gitattributes` marks `packs/**` binary) |

The campaign data lands *inside* the module's own directory tree on the server (`data/campaign/`) so the module's own `fetchModuleJson` can reach it exactly like it reaches the test fixtures — pushed there by a separate tool (`tools/module-sync/sync-campaign-data.mjs`) rather than living in this git-tracked folder, since repo-root `/data` is the one real source of truth. There's no precomputed manifest to hand-maintain — the module hashes each real file at sync time and compares against a flag on the corresponding Foundry document (design doc §1).

## Asset conventions

| Directory | Purpose |
|---|---|
| `assets/unassigned/` | Drop zone. New art lands here unsorted; it gets reviewed, assigned a purpose, and moved into one of the directories below. |
| `assets/scenes/` | Scene background art |
| `assets/tokens/` | Token art (creatures, Frames, NPCs) |
| `assets/portraits/` | Actor portraits / character art |
| `assets/ui/` | Interface art — landing page, panel chrome, icons |
| `assets/video/` | Cinematic intro/outro footage. Authored as Tiles placed on a scene, not scene-background video — a Scene's own background video always loops with no exposed control, only Tiles support `loop:false` (design doc §7). |
| `assets/audio/mood/<mood>/` | Rotating pools by mood — several tracks per mood, shuffled |
| `assets/audio/cues/` | One-shot stings and scene-specific cues |

Everything under `assets/` is referenced from `data/` JSON by path relative to the module root (e.g. `assets/scenes/arcology-collapse.webp`), which is also how Foundry resolves it at runtime.

## Sync model, in one paragraph

The repo is the source of truth for **authored** content; Foundry is the source of truth for **runtime** state; a third class, **promotable**, covers things Foundry can edit (journal prose, token layout) without losing them to the next push. Pushing (repo → Foundry) is automatic and authoritative for authored fields: the module hashes each `data/` file at sync time and compares against a flag stored on the corresponding Foundry document (IDs are deterministically derived from each entity's repo `id`, so this is idempotent and needs no lookup table). Pulling (Foundry → repo) is a deliberate, GM-initiated *harvest* of promotable content worth keeping — never a background two-way sync. That asymmetry is the central design decision; see [`design/foundry-module-design.md`](../../design/foundry-module-design.md) §0 for why, and §4 for exactly how harvested content gets back to this machine (`storage/`, not `data/`). **All world-document writes go through Foundry's own Document API, from a live GM session — never a raw file edit** — see that doc's Safety section for exactly why that distinction is load-bearing.
