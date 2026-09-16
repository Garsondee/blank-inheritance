# Testing Strategy — making correctness survive its own success

**Status: bootstrapped and green, 2026-08-22.** Tiers 0–4 exist and pass (`npm test`, 32 tests, ~1 second). The two known bugs below (ajv `$ref` resolution, diagnostic-sync re-runnability) are fixed and covered. Tier 4 (mocked-adapter tests, added same day) found a real bug in itself within the first run — see its section below; that's the kind of thing this tier is for. Tier 5 (live) is still the v0 diagnostic script, generalized slightly (each case now runs in isolation) but not yet the full registry-based harness described there; that remains a real next step, not done.

Standing policy for all code in this project, adopted deliberately and early (2026-08-22, immediately after the first diagnostic sync passed). The premise, stated by the user: *projects like this live and die on whether we make smart sustainable decisions about how we create code, and every feature needs an automated test proving it still works three versions from now.*

This document is the answer to "how do we build success into the approach," and it is meant to be **read before writing any new module code**, not consulted after something breaks.

---

## 0. Name the actual failure mode first

Generic testing advice is worthless here. The specific ways this project would die:

1. **Foundry or sf2e changes its data model.** We write `system.attributes.ac.value`; sf2e v1.6 renames or restructures it. Nothing errors — Foundry accepts unknown keys and silently drops them. Actors generate "fine," look subtly wrong on the sheet, and nobody notices until mid-session. **This is the big one.** It is silent, delayed, and arrives on someone else's schedule.
2. **The iteration loop is too slow to test anything.** Right now, verifying a one-line change means: WinSCP push → enable module → click macro → read console → interpret. That's minutes per attempt, over a network, with a human in the loop. Nobody writes thorough tests against a loop like that, so nobody writes tests at all.
3. **The campaign data outgrows the generators.** `data/` will hold hundreds of files. A field added to one episode JSON breaks a generator that only ever ran against three test fixtures.
4. **Context loss.** This codebase is built across many sessions, with an assistant that forgets. Undocumented invariants don't survive. A rule that only lives in one conversation is already gone.

Every tier below exists to kill a specific one of those. Nothing below is there because testing is generically virtuous.

---

## 1. The load-bearing decision: a pure core and a thin adapter

**Almost everything valuable this module does is a pure data transformation.** `creature.json` → an sf2e Actor data object is a function of its input and nothing else: no network, no browser, no game state. The same is true of ID derivation, content hashing, scene assembly, dialogue-tree resolution, and inline-check string building.

Only a thin outer shell genuinely needs Foundry: `Actor.create()`, `FilePicker`, `Hooks`, `game`, `ui`, `canvas`.

So the code splits in two, and the split is enforced, not merely encouraged:

```
foundry/blank-inheritance/scripts/     (as built, 2026-08-22)
  core/            ← ZERO Foundry globals. Plain ES modules. Runs in Node.
    ids.mjs                 deriveFoundryId, contentHash
    validate.mjs             validateActor, validateScene (re-read vs. intended)
    report.mjs               summarizeReport, reportToHtml
    generators/
      creature.mjs          source JSON  →  npc Actor data
      character.mjs         source JSON  →  character Actor data
      scene.mjs             source JSON  →  Scene data
  foundry/         ← the ONLY place globals may appear
    io.mjs                  fetch/FilePicker wrappers (fetchModuleJson, ensureDirectory, writeReportFile)
    sync.mjs                orchestration: teardown, run each case isolated, hand results to Foundry
  blank-inheritance.mjs     entry point: hooks + api wiring only

test/                                  (repo root, not part of the deployed module)
  setup.mjs               Node-only crypto.subtle/File polyfills — see the gotcha below
  tier0-architecture.test.mjs
  tier1-generators.test.mjs
  tier2-data-corpus.test.mjs
  tier3-contract.test.mjs
  tier4-mocked-adapter.test.mjs
  support/
    sf2e-template.mjs      shared template-resolution logic — tier 3 AND the mock both use this
    mock-foundry.mjs        the tier-4 mock, verified against real Foundry source (see tier 4 below)
  golden/                  committed expected generator output
  fixtures/                verified-versions.json, frozen real sf2e examples, module manifest reuse
```

(The self-test runner named `selftest.mjs` in earlier drafts of this doc didn't get built as a separate file — tier 5 is still `foundry/sync.mjs`'s `runDiagnosticTestSync`, just with the case-isolation and teardown fixes below. A real registry-based harness remains a future step, not done.)

**The rule:** nothing under `core/` may reference `game`, `ui`, `canvas`, `Hooks`, `Actor`, `Scene`, `Macro`, `ChatMessage`, `FilePicker`, or `foundry`. That rule is itself a test (§3, tier 0) — a scan of `core/` for those identifiers. It fails the build if someone reaches for a global to save five minutes.

Why this is the load-bearing decision: it converts failure mode #2 from "unavoidable" to "mostly irrelevant." The majority of real bugs live in the transformation logic, and the transformation logic becomes testable in **milliseconds, offline, with no Foundry at all**. What's left in the adapter is plumbing thin enough to be verified by the slow in-Foundry tier without that tier needing to be exhaustive.

**Verified gotcha, not assumed:** `core/ids.mjs` uses `crypto.subtle`, which is a real global inside Foundry. Node 18.16 ships the same SubtleCrypto implementation but does not expose it as a bare `globalThis.crypto` in `.mjs`/`--test` contexts the way a browser does (Node 19+ does this automatically). The fix belongs in the *test* environment, not the production code: `test/setup.mjs` polyfills `globalThis.crypto` from `node:crypto`'s `webcrypto` export, and every test file that touches `core/ids.mjs` imports it first. `core/ids.mjs` itself must never import `node:crypto` directly — that would break it the moment it actually loads inside Foundry, which has no Node built-ins.

A useful side effect: the current `blank-inheritance.mjs` already has this shape by accident (`buildCreatureActorData`, `deriveFoundryId`, `contentHash`, `buildSceneData` are all pure; `runDiagnosticTestSync` is the adapter). The refactor is separation, not redesign — and doing it now, while the module is ~300 lines of freshly-verified code, is the cheapest this will ever be.

---

## 2. Tooling: `node:test`, and nothing else

Node 18.16.0 and npm 9.5.1 are present locally; there is no `package.json` yet.

**Use Node's built-in test runner (`node --test` + `node:assert`). Add no test dependencies.**

The reasoning is specifically about the three-versions-from-now problem: a Jest/Vitest/ajv dependency tree is itself a thing that rots, needs upgrading, and breaks on Node upgrades. This project is a solo, local, long-lived, intermittently-touched codebase. A test suite that runs with zero `npm install` will still run in three years; one with 400 transitive dependencies probably won't. The one exception worth making is a JSON Schema validator (§3, tier 2), because hand-rolling schema validation is strictly worse than depending on `ajv` — and even that should be a `devDependency` the tests skip gracefully without.

`package.json` exists to declare `"type": "module"` and a `test` script. That's all.

---

## 3. The tiers

Ordered by speed. Run in this order; a slow tier should never be the first place a bug is found.

### Tier 0 — Architecture lint (instant)
A test that scans `core/` for forbidden Foundry globals, and scans all module code for known-deprecated APIs (e.g. the bare `FilePicker` global, deprecated since v13, removed in v15 — we already hit this once).

Catches: architectural drift, and an entire *class* of deprecation bug, before it reaches a live instance.

### Tier 1 — Pure generator unit tests (milliseconds)
Feed a fixture JSON to a generator, assert the output. Includes **golden-file snapshots**: expected output committed to git, so an unintended change shows up as a readable diff in review rather than as strange behavior at the table.

Catches: the overwhelming majority of real logic bugs. This is where most test-writing effort goes.

### Tier 2 — Data corpus validation (fast)
Two things, over *every real file in `data/`*, not just fixtures:
- each file validates against its declared `$schema`;
- each file runs through its generator without throwing, producing schema-valid output.

Catches: failure mode #3 — new campaign content that outgrows the generators. Cost is roughly twenty lines and it scales for free as `data/` grows to hundreds of files.

> **Blocker cleared, 2026-08-22:** `$id`/`$ref` paths in `data/schema/` resolved under VS Code but not under `ajv` — `sf2e-common.schema.json`'s own `$id` didn't match the `"common/sf2e-common.schema.json"` path every other schema referenced it by. Fixed by changing the one `$id` to match (every referencing `$ref` was already consistent, so nothing else needed to change). Verified: all 15 real files under `data/` now validate. See `ideas/entries/schema-ref-ajv-compatibility.json` (status `done`).

### Tier 3 — Contract tests against the local source trees (fast, and the key insight)
This is the tier that specifically kills failure mode #1, and it's only possible because `gamesystems/sf2e/` and `foundryvtt/` are checked out locally. **We can verify our output against the real data model without a running Foundry.**

Two complementary techniques, because — verified directly, 2026-08-22 — neither alone is sufficient:

**(a) Against `template.json`, for Actor fields.** Every field path our NPC generator writes is confirmed present: `attributes.ac.value`, `attributes.hp.value`/`.max`, `perception.mod`, `saves.{fortitude,reflex,will}.value`, plus `abilities`, `skills`, `traits`, `details`. A test asserts each path we write still exists.

> **Gotcha, verified, do not skip:** `template.json` uses template inheritance. Both `character` and `npc` declare `"templates": ["common"]`, and `Actor.templates.common.details.level.value` is where PC level actually lives — `Actor.character.details.level` is **`undefined`** on its own. A naive path check fails on correct code. **The contract test must resolve `templates` inheritance before checking.**

**(b) Against real shipped compendium data, for everything else.** `template.json` is **partial**: only 15 of the 25 declared `Item.types` have entries, and `melee` — which our strike generator produces — is **not among them** (sf2e defines it in code DataModels instead). So for Items, ground truth is real shipped examples from the sf2e packs: assert our generated field paths are a subset of those a genuine sf2e `melee` Item uses.

Technique (b) generalizes better and should be preferred where both are available; (a) is cheaper and reads more clearly for Actors.

**Version pinning belongs here.** Record the verified Foundry and sf2e versions in a small JSON file; a test asserts the local trees still match. Upgrading becomes a deliberate act — bump the pin, re-run tier 3, fix what it reports — instead of silent drift. That is precisely the "still working three versions from now" guarantee, and it converts an invisible future failure into a loud present one.

> Because `gamesystems/` and `foundryvtt/` are gitignored, tier 3 must **skip loudly with an explanatory message** when those trees are absent — never fail (misleading on a fresh clone), never skip silently (invisible loss of the most valuable tier).

### Tier 4 — Mocked-adapter tests (fast, added 2026-08-22)
`foundry/io.mjs` and `foundry/sync.mjs` are the one piece of code tier 0–3 structurally can't reach — they're the adapter layer *by design* (§1), so they touch real Foundry globals. Before this tier existed, they had zero automated coverage; only a live run proved they worked.

`test/support/mock-foundry.mjs` is a small in-memory simulation of exactly the globals that adapter touches (`game`, `ui`, `Hooks`, `Actor`/`Scene`/`Macro`/`ChatMessage`, `foundry.utils.getRoute`, `foundry.applications.apps.FilePicker`, `fetch`). The rule that makes this trustworthy rather than a liability: **every behavior in the mock is either read directly out of the real Foundry source in `foundryvtt/`, directly observed against the live server, or explicitly labeled as a simplification.** Concretely verified against source (not guessed) while building it:
- `LocalFileStorage#createDirectory` (`dist/files/local.mjs`) calls bare `fs.mkdirSync(o)` — no `{recursive: true}` — confirming the ENOENT bug's root cause exactly, not just its symptom.
- The same file's `#upload` does `if (!fs.existsSync(i)) throw new Error(...)` — so `uploadPersistent` has the identical parent-must-exist rule, and `client/applications/apps/file-picker.mjs` confirms that server-side throw surfaces at the client level as a returned `false`, not a re-thrown error.
- `uploadPersistent` looks up `game.modules.get(packageId)` and requires `persistentStorage: true` on it *before* attempting the upload at all — the mock reads this from the project's real `module.json` rather than hardcoding it, so removing that flag from the manifest would fail this tier the same way it fails in real Foundry.

**sf2e-awareness, cheaply:** the mock's `Actor.create` runs incoming `system.*` field paths through `findInvalidActorFieldPaths` (`test/support/sf2e-template.mjs`) — the *same* function tier 3 uses, not a re-implementation, so the two checks can't silently drift. It deliberately does **not** attempt to simulate sf2e's derived-data computation (AC/saves computed from embedded Items) — reimplementing a real game system's logic would be a much larger, much riskier undertaking than this project needs, and tier 3 already covers what actually matters here (our output's field *shape* matching the real template).

**What this proves that nothing else does:** the orchestration logic itself — teardown-before-setup actually prevents id collisions on a second run, a failure in one case doesn't hide the other two, flags get set with the right values, the report assembles correctly. **What it still can't prove:** that real Foundry's `Actor.create` behaves the way the mock assumes beyond what's cited above, that documents actually render, that sheets open. That gap is tier 5's job, not this one's — a mock that overclaims confidence is worse than no mock.

> **Found by this tier on its first run, 2026-08-22:** the mock's Actor-validation didn't know about tier 3's `skills.*` exclusion (template.json declares `npc.skills` as an empty placeholder — see tier 3 above) and rejected a genuinely valid creature fixture. Not a bug in the generator or in `sync.mjs` — a bug in the mock itself, caused by the check existing in two places. Fixed by extracting `findInvalidActorFieldPaths` as the single shared implementation (used by both this tier and tier 3) specifically so this class of drift can't happen again.

### Tier 5 — In-Foundry self-test (slow, manual, last resort)
A generalization of the v0 diagnostic sync into a permanent, first-class harness: a registry of cases, each with setup / assert / **teardown**, running *all* cases rather than stopping at the first failure, writing a machine-readable report to `storage/` that WinSCP carries home for analysis.

Reserved for what genuinely cannot be tested outside a live instance: that `Actor.create({keepId: true})` really preserves the ID, that documents render, that sheets open, that `activate()` pulls clients.

> **Bug fixed, 2026-08-22:** the original diagnostic created documents and never removed them; because ids are deterministic, a second run collided with the first run's documents. Fixed with teardown-*before*-setup (delete any pre-existing document at that id, then create fresh) rather than teardown-after — the created documents still stay visible in Foundry for manual GM inspection after a run, which is how this has actually been used. Also fixed in the same pass: the three cases (creature, character, scene) originally shared one try/catch, so one case throwing silently skipped the rest; each now runs isolated via a small `runCase` wrapper, so a single failure is reported without hiding the other two cases' results. Both fixes are now also covered by tier 4's mocked run — this tier's job is confirming real Foundry agrees, not discovering the bug in the first place anymore.

---

## 4. The rules that keep it alive

Practices, not tooling — these are what actually decay.

1. **The test ships in the same commit as the feature.** Not "after," not "when there's time." A feature without a test is not finished. This is also recorded in `CLAUDE.md` so it survives context loss.
2. **Every bug becomes a regression test, at the moment it's fixed.** The two already found (`createDirectory` is not recursive; the bare `FilePicker` global is deprecated) are the first entries.
3. **If it can be a pure function, it must be.** Every piece of logic pushed into `core/` is logic that becomes cheap to verify forever. Logic left in the adapter is logic only testable through the slowest tier.
4. **Prefer real data over synthetic fixtures** once real campaign content exists. Synthetic fixtures test the generator against your assumptions; real data tests it against the campaign.
5. **A skipped test must announce itself.** Silent skips are how a suite becomes decorative.
6. **The default test command must stay fast enough to run on every save.** If it stops being fast, it stops being run — which is exactly what happened here: `npm test`/`node --test test/` grew, alongside the module and campaign-data tiers, into `test/battle-simulator/`'s 81 files, `test/city-map-editor/`, `test/map-generator/`, and `test/module-sync/`, and stopped being something anyone would run on every save without thinking about it (**found live 2026-09-05**, when running it mid-UI-iteration meant sitting through the combat simulator every time). `package.json` now has scoped scripts so the fast/relevant subset is a real, named command instead of something to remember by hand:

   | Script | Runs | Use when |
   |---|---|---|
   | `npm run test:ui` | tier0, tier1-redaction, tier3-theme-contract, tier3-fonts | touching CSS/HTML/console.js/redact.mjs/theme.mjs/the font pipeline |
   | `npm run test:module` | tier1-generators, tier2-data-corpus, tier3-contract, tier4-mocked-adapter | touching the campaign-data → Foundry-document generators |
   | `npm run test:fast` | everything above, plus character-builder/map-generator/module-sync/city-map-editor | a broad sanity check that still finishes in seconds |
   | `npm run test:battle-sim` | `test/battle-simulator/` (81 files) | changing `decide()`/`evaluateState`/the AI — the genuinely slow one |
   | `npm run test:character-builder` / `test:map-generator` / `test:module-sync` / `test:city-map-editor` | that one subject only | working in just that tool |
   | `npm run test:city-map` | the Python suite (`unittest`) | working in `tools/city-map/` — never part of `node --test`, see `tools/city-map/README.md` |
   | `npm test` | literally everything | before a real milestone, not a reflex |

---

## 5. Explicitly out of scope (for now)

Named so they aren't silently assumed:

- **No CI service.** This is a local repo with no remote configured. `npm test` plus, optionally, a git pre-commit hook is the whole story until that changes.
- **No browser-automation / end-to-end tests** driving a real Foundry through a headless browser. Real technique, wrong cost/benefit here — tiers 4 and 5 together cover the same ground at a fraction of the setup, and the GM is already in the loop.
- **No test coverage targets.** Coverage percentages measure the wrong thing on a codebase that is mostly data transformation; the corpus test in tier 2 is a better proxy for "are we actually exercising this."
- **No pixel-diffing.** Nothing here screenshots a render and compares it to a golden image. The visual-identity work (`design/visual-identity.md`) found a cheaper, higher-signal substitute for the specific failures that actually occurred: grep-level assertions on the CSS itself — a property that must/must not appear, a token that must be declared, a selector that must carry a specific class. That style of test has already caught four real, live bugs (a demo-only `aspect-ratio` baked into the shippable console class, `.bi-console`'s grid track sizing coming out wrong under `@container` queries, Japanese text rendered under a 12px legibility floor, and the Foundry bridge silently overriding the document typeface) before anyone had to notice them by eye. It is still not an assertion that pixels *look right* — that judgment stays human — but "the rule that would have prevented this exact bug now exists" is a real, cheap thing to keep doing.
