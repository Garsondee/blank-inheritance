# Blank Inheritance — Foundry VTT Module

This directory **is** the Foundry module. Its contents map 1:1 onto `Data/modules/blank-inheritance/` on the Foundry server, so a WinSCP sync of this folder is the entire deployment step — no build, no packaging.

```
module/blank-inheritance/   →   <FoundryData>/Data/modules/blank-inheritance/
```

**2026-09-04 consolidation note:** this directory used to be `foundry/blank-inheritance/`. Two module scaffolds existed briefly — a real, Foundry-generated v14 package with better branding and a full compendium-pack manifest, and the original tested one — and got merged after a real architecture decision (GitHub issue #70): the manifest `id` stays `"blank-inheritance"` deliberately, because every deterministic-id derivation, flag scope, and FilePicker path in the tested code below is keyed to that id — changing it would invalidate the golden test fixtures and every document created by the 2026-08-22 live run for no functional benefit. Compendium packs were dropped from the manifest for now (none are populated yet) — see the amended §8 of `design/foundry-module-design.md` for when/why they come back.

**2026-09-05 correction:** the consolidation briefly renamed this directory to `mythica-machina-blank-inheritance-adventure-module` for nicer branding, while keeping `id: "blank-inheritance"` in the manifest. That combination is invalid — Foundry's real package loader (confirmed by reading `dist/packages/package.mjs` and independently confirmed live) rejects a module outright, with no partial/degraded mode, if the directory name doesn't exactly match the manifest `id`. It sat broken on the live server for about a day before a service restart's error log caught it (`Invalid module "blank-inheritance" detected in directory "mythica-machina-blank-inheritance-adventure-module"`). Renamed back to `blank-inheritance` to match the id, an invariant now enforced by an automated test (`test/tier0-architecture.test.mjs`) so it can't silently regress again.

Full design rationale: [`design/foundry-module-design.md`](../../design/foundry-module-design.md) (now includes a **Safety** section — read it before touching anything that writes to a live world). Exact Foundry/sf2e API facts behind those decisions: [`design/foundry-technical-reference.md`](../../design/foundry-technical-reference.md). Session-structure design (landing page, overworld, outro): [`design/session-flow-and-overworld.md`](../../design/session-flow-and-overworld.md).

## Current status: real campaign content now syncs live, alongside the diagnostic

Two sync entry points exist now, both sharing the same core generators/hash-skip machinery (`scripts/foundry/sync.mjs`) but pointed at different content:

- **`runDiagnosticTestSync`** — the original pipeline health-check: one test NPC Actor, one test PC Actor, one Scene, one JournalEntry, all from `data/_test-fixtures/`. **Run against a live Foundry instance 2026-09-05 — 22/22 checks passed** (GH issue #114 added the JournalEntry case; that run also caught and fixed a real bug where the persisted report file silently failed to write even though the clipboard copy succeeded — see `writeReportFile`'s comment in `scripts/foundry/io.mjs`).
- **`runRealContentSync`** (GH issue #82, 2026-09-05) — the real thing: the actual Claimant (`data/antagonists/claimants/contact-unclassified.json`) as a creature Actor, and every real episode (`data/episodes/*.json`) as a JournalEntry (one page per authored scene beat, via `episodeToJournalSource`). **Deliberately does not yet touch the six kids/Frames or the three NPCs** — both are still marked draft/placeholder in their own data, and finalizing that is a collaborative creative call for the user to make, not something the pipeline should do just because it's technically able to reach the files.

Split into a pure core and a thin Foundry-touching adapter, enforced by an automated test suite (repo root `test/`, run with `npm test`) — see [`design/testing-strategy.md`](../../design/testing-strategy.md) for why and how:
- `scripts/core/` — `ids.mjs`, `validate.mjs`, `report.mjs`, `generators/{creature,character,scene,journal}.mjs`. Zero Foundry globals; runs and is unit-tested in plain Node.
- `scripts/foundry/` — `io.mjs` (FilePicker/fetch/clipboard wrappers), `sync.mjs` (both sync entry points; teardown-before-setup so re-running is safe, each case isolated so one failure doesn't hide the others), `sync-dialog.mjs` (the GM-facing confirm prompt, see below). The only place Foundry globals may appear.
- `scripts/blank-inheritance.mjs` — thin entry point: hooks + macro creation only.

**To run it:** push this whole folder with `tools/module-sync/sync-module.mjs`, AND push the real campaign content with `tools/module-sync/sync-campaign-data.mjs` (separate script, separate cadence — see that tool's own README), enable the module in your world (requires the `sf2e` system active). Two ways to trigger a sync:
- **Automatic (GH issue #82):** the GM gets a confirm dialog as soon as the first scene finishes loading each session (`Hooks.once("canvasReady", ...)`, so it's once per login, not once per scene change) — confirming runs `runRealContentSync`.
- **Manual, any time after that:** two macros get created on first load (GM only) — **"Blank Inheritance: Sync Campaign Content"** (the real sync) and **"Blank Inheritance: Run Test Sync"** (the diagnostic health-check).

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
