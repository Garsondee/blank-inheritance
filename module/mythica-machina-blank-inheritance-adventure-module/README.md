# Blank Inheritance — Foundry VTT Module

This directory **is** the Foundry module. Its contents map 1:1 onto `Data/modules/blank-inheritance/` on the Foundry server, so a WinSCP sync of this folder is the entire deployment step — no build, no packaging.

```
module/mythica-machina-blank-inheritance-adventure-module/   →   <FoundryData>/Data/modules/blank-inheritance/
```

**2026-09-04 consolidation note:** this directory used to be `foundry/blank-inheritance/`. Two module scaffolds existed briefly — this one (a real, Foundry-generated v14 package with better branding and a full compendium-pack manifest) and the original tested one — and got merged here after a real architecture decision (GitHub issue #70): the manifest `id` stays `"blank-inheritance"` deliberately, even though this folder has a different name, because every deterministic-id derivation, flag scope, and FilePicker path in the tested code below is keyed to that id — changing it would invalidate the golden test fixtures and every document created by the 2026-08-22 live run for no functional benefit. Compendium packs were dropped from the manifest for now (none are populated yet) — see the amended §8 of `design/foundry-module-design.md` for when/why they come back.

Full design rationale: [`design/foundry-module-design.md`](../../design/foundry-module-design.md) (now includes a **Safety** section — read it before touching anything that writes to a live world). Exact Foundry/sf2e API facts behind those decisions: [`design/foundry-technical-reference.md`](../../design/foundry-technical-reference.md). Session-structure design (landing page, overworld, outro): [`design/session-flow-and-overworld.md`](../../design/session-flow-and-overworld.md).

## Current status: diagnostic test sync, verified against a live instance, now with a two-way reporting loop

`scripts/` creates one test NPC Actor, one test PC Actor (identity fields only, see the comment in `buildCharacterActorData` for why), one Scene placing both, and one JournalEntry with two text pages, using the deterministic-ID and hash-flag mechanisms the real design calls for. **Run against a live Foundry instance 2026-08-22 — 15/15 checks passed** (the JournalEntry generator was added 2026-09-05, GH issue #114 — re-run the macro to get a fresh live count including it).

Split into a pure core and a thin Foundry-touching adapter, enforced by an automated test suite (repo root `test/`, run with `npm test`) — see [`design/testing-strategy.md`](../../design/testing-strategy.md) for why and how:
- `scripts/core/` — `ids.mjs`, `validate.mjs`, `report.mjs`, `generators/{creature,character,scene,journal}.mjs`. Zero Foundry globals; runs and is unit-tested in plain Node.
- `scripts/foundry/` — `io.mjs` (FilePicker/fetch/clipboard wrappers), `sync.mjs` (orchestration, teardown-before-setup so re-running is safe, each case isolated so one failure doesn't hide the others). The only place Foundry globals may appear.
- `scripts/blank-inheritance.mjs` — thin entry point: hooks + macro creation only.

**To run it:** WinSCP-push this whole folder to `<FoundryData>/Data/modules/blank-inheritance/`, enable the module in your world (requires the `sf2e` system active), then run the **"Blank Inheritance: Run Test Sync"** macro it creates on first load (GM only). It:
1. Runs every case, reporting results in a whispered chat message.
2. Writes a full JSON report to `storage/test-reports/`.
3. **Copies the full report to the clipboard**, as a plain-text block — a short human-readable summary followed by the report as JSON. This is the reporting half of the two-way link with Claude: after running the macro, paste the clipboard contents straight into the chat for review. If the clipboard copy fails (no permission, non-HTTPS context), the chat message says so and the JSON report file is still the fallback.

Safe to re-run — it tears down its own previous test documents first.

Test fixtures live in `data/_test-fixtures/` — clearly-marked synthetic data (`TEST FIXTURE —` name prefixes), not real campaign content. Not one of the six kids, not a real Claimant.

## What lives here

| Path | Contents | In git? |
|---|---|---|
| `module.json` | Foundry package manifest — needs `socket: true` and `persistentStorage: true`, see design doc §1/§4 | yes |
| `data/` | The campaign itself — every authored JSON document (episodes, scenes, creatures, journals, characters). **Push-only**: wiped and re-pushed on every deploy, never written to by Foundry. | yes |
| `storage/` | Not in this repo — lives only on the Foundry server, under `.../storage/` there. Harvested GM edits land here (`storage/harvest/`) and survive module updates. WinSCP pulls it down; nothing here is authored locally. | n/a |
| `scripts/` | Module JavaScript | yes |
| `styles/`, `templates/`, `lang/` | UI stylesheets, Handlebars templates, localization | yes |
| `assets/` | Images, audio, video | **no** — large binaries, synced by WinSCP but not committed |
| `packs/` | Compendium packs — currently empty. Reserved for one-way, no-history "clean starting point" content only, per issue #70's decision. Never the live sync path for campaign content — see the Safety section of `design/foundry-module-design.md`. | yes (LevelDB binaries once populated — `.gitattributes` marks `packs/**` binary) |

The campaign data lives *inside* the module on purpose: one WinSCP push carries both the code and the adventure it runs. There's no precomputed manifest to hand-maintain — the module hashes each `data/` file at sync time and compares against a flag on the corresponding Foundry document (design doc §1).

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
