# Roadmap

Technical work planned beyond the campaign document structure itself.

## 1. & 2. Foundry VTT module (sync + logistics, one module)

These turned out to be one module, not two — `foundry/blank-inheritance/`, decided when actually designing it. It ships the campaign JSON and the module code together (one WinSCP push deploys both), syncs `/data` into Foundry documents (Scenes, Actors, JournalEntries, Playlists), supports pulling GM edits back down, and runs session logistics (time tracking, a director's panel for cueing scenes/transitions/music).

- **Design**: [design/foundry-module-design.md](design/foundry-module-design.md) — architecture and decisions.
- **Reference**: [design/foundry-technical-reference.md](design/foundry-technical-reference.md) — the exact Foundry v14 / sf2e APIs the design relies on, verified against local source trees.
- **Status**: designed, directory skeleton exists (`foundry/blank-inheritance/`), no generation/sync code written yet. See the design doc's §9 for the staged build order — core push pipeline first, director's panel and cold-open sequence last.

Run manually, on demand. Not automatic, not LLM-mediated for the actual document mutation — that's the whole reason this project stores everything as JSON.

## 3. Encounter simulator

A simple simulator for Starfinder 2E encounters — run a simulated fight, examine the results, and use that to tune Claimant builds and Frame ability-band assignments. The schemas (`encounter.schema.json`, `challenge.schema.json`, `subsystem.schema.json`, `reference/tables/`) already carry the numbers this would need.

**Status: a first real slice exists.** `tools/battle-simulator/` — a legality-enforcing engine (real dice via a seeded PRNG, a rules layer that rejects illegal moves rather than trusting callers not to propose them) scoped specifically to the scale-and-chassis ruleset (design/scale-and-chassis.md), not general SF2E. Built 2026-08-22 to demonstrate that ruleset before committing to it, with its output viewable as a scrubbable Artifact. Adversarially tested by five independent agents; see `test/battle-simulator/` for the resulting regression suite. What remains long-term/unbuilt: personnel-scale (ground-role) simulation, a general (non-scale-and-chassis-specific) SF2E mode, and folding `challenge.schema.json`/`subsystem.schema.json` data in directly rather than hand-authored scenario files.
