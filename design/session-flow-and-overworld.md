# Session Flow & the Overworld — Concept Design

Captures a session-structure vision described 2026-09-04 (GitHub issue #70's discussion) and maps it onto Foundry v14's real primitives. Companion to [foundry-module-design.md](foundry-module-design.md) (the module's push/sync/safety architecture) and [foundry-technical-reference.md](foundry-technical-reference.md) (source of truth for exact APIs). Concept-level: what to build and why it's shaped this way, not code.

## The flow, as described

1. **Session begins** on a landing page — players see a background image, and it's their entry point into the UI.
2. From there, an **overworld**: a huge satellite-style map (the real output of `tools/city-map/`) with map points showing encounters/locations players can reach.
3. Players **sign up** for an encounter — pick the map pin(s) they want to explore.
4. The GM asks the group "what are you doing?", players commit, and each committed group gets **pulled into a scene**.
5. A scene concludes; its **results get recorded**; that group returns to the overworld (or the GM moves on to running a different group's scene) until everyone active in that stretch has resolved their pick.
6. Once everyone is back in sync, the **time segment increments** — new map pins appear, and the cycle continues.
7. At the end of a session, the GM presses **Outro** — a special static scene with music plays, signaling the session has wrapped.

## What's genuinely new vs. what already exists

Research pass (2026-09-04) checked every piece of this against the existing design, schemas, and idea backlog before anything got proposed as new work — see the summary table.

| Piece | Status |
|---|---|
| Landing page as session entry | **Already designed** — `foundry-module-design.md` §7: "the landing page is a Scene, not a special screen," cued via the director's panel's persistent Home button. `ideas/entries/terminal-login-landing-page.json` (issue #47) independently designed the same entry point from the phone/terminal angle. |
| Overworld image | **Real asset already exists**, production export not yet run. `tools/city-map/` has produced real rendered PNGs of the Kurose map (real OSM + GSI DEM data, 1950s-styled) up to 12288×12288px. `design/map-generation.md` §8 specifies a final tiled-WebP delivery format that hasn't been executed yet — a working-render PNG is very likely good enough for a v1 Foundry Scene background; don't block on the production export. |
| Clickable map pins tied to encounters | **Genuinely new build**, but the pattern is already documented: `foundry-module-design.md` §3 calls out `Note` + `JournalEntryPage` as the native "background image with points of interest" mechanism. No pin-generation code exists yet. |
| Per-user/per-group pin visibility | **Native, unbuilt.** A `Note`'s visibility is controlled by its linked `JournalEntry`/`Page`'s own per-user ownership levels (NONE/LIMITED/OBSERVER/OWNER) — exactly the mechanism needed to reveal new pins to specific players as segments advance, with zero custom permission code. |
| Pulling a sub-group into a scene, recording results, returning to overworld | **Genuinely new orchestration**, built on native primitives. `Scene#pullUsers()`/`activate()`/`view()` (GM-only, real document updates) already do the multi-client "move these specific people to this scene" job; `Region` + `TeleportTokenRegionBehaviorType` is a movement-triggered alternative with the same group-pull + transition-FX machinery built in. Neither is wired to "click a pin" today. |
| Sign-up / commit mechanic, multi-group tracking, time-segment increment | **Genuinely new — no mechanical precedent anywhere in the repo.** See "The one real open design question" below. |
| Static outro scene with music | **Nearly free.** A `Scene`'s native `playlist`/`playlistSound` fields auto-start/stop via `game.playlists._onChangeScene` on activation — "press Outro → static scene, music plays" is close to zero custom code once the scene and playlist exist. Distinct from the harder *video* cold-open (issue #99), which needs a custom `ended`-listener; this is the simpler, static case and doesn't need that machinery. |

## Foundry primitives this builds on

- **Overworld Scene**: one `Scene`, `Level.background` set to a `tools/city-map` render, minimal/no grid (Theatre-of-Mind pattern, same as any other backdrop-heavy scene per `foundry-module-design.md` §3).
- **Map pins**: `Note` documents positioned over points of interest, each `entryId`/`pageId`-linked to a `JournalEntryPage` describing that location/encounter. Default double-click behavior opens the linked journal — for "click pin, go to scene" we hook `Hooks.on("activateNote", ...)` and, instead of (or in addition to) opening the journal, call the destination `Scene#activate({pullUsers: true})` or a narrower `pullUsers([specificUserIds])` for a sub-group. This is the one piece of genuinely custom event-handling this design needs — same category as the cold-open's `ended`-listener in `foundry-module-design.md` §7, not a new pattern.
- **Group pull with transition polish**: `Scene#pullUsers()`/`activate()` for GM-driven navigation (macro/hook-triggered), or `Region` + `TeleportTokenRegionBehaviorType` if a "walk your token onto the city icon" interaction ever feels better than a raw click — both ride the same built-in transition-effect catalog (`canvas.transition`, 13 effects) `foundry-module-design.md` §7 already uses for the director's panel.
- **Outro**: a `Scene` with `playlist`/`playlistSound` set, cued via the director's panel/Mimetic Controls exactly like any other scene — Foundry's native scene-activate music swap handles start/stop.
- **Recording results**: whatever a scene concludes with (subsystem pool outcomes, a Claimant defeated, a check's degree of success) already has a home in this project's existing structured-data thinking — the chat-log scraper (issue #42) and GM/player journals (issue #43) are the two existing mechanisms for turning "what happened in that scene" into durable, queryable state. The signup/time-segment layer below should write into the same place, not invent a third.

## The one real open design question — not decided here

The sign-up / multi-group / time-segment mechanic has **no existing mechanical precedent** in this repo. The closest analogues, checked directly and confirmed *not* to already do this:

- **The Contact Pool** (`data/campaign/config.json`, active from Day 7): a single, global, hidden escalating-d20 trigger the GM rolls each morning — one Contact or none, not a menu of concurrent options players choose between.
- **The Time Economy** (same file): 2 discretionary slices/day spent from a 7-item menu (sync-training, investigation, anchor-time, etc.) — a bureaucratic slice budget, not a spatial map, and nothing ties its increment to "all players have committed."
- **`episode.schema.json`'s `scenes[]`**: strictly linear (`order` only) — no branching, no parallel-group field, no "return to hub" concept.

Per this project's standing rule (CLAUDE.md: don't resolve open design questions unilaterally — surface them), here's what needs an actual answer before this layer gets built past its v1 scaffolding:

1. **Scope**: does the overworld/signup flow apply to the hand-placed Day 1–6 opening arc (currently strictly linear per-episode scenes), to the procedural Day 7+ Contact Pool phase, or both? These are different content shapes today.
2. **Relationship to the Contact Pool**: does the new pin/signup mechanic *replace* the single daily d20 trigger, or does it sit *on top of* it — e.g., Contact Pool still decides whether a Contact fires at all, and the overworld is how that Contact (and other concurrent downtime options) gets *presented and chosen from* once it does?
3. **What "a group" means**: always the whole party split along the existing Frame-pilot/ground-role pattern (Day 1 and Day 6's established shape), or arbitrary player-chosen sub-groups per segment?
4. **What happens if a group doesn't finish before the GM wants to advance the segment** — purely a table-side GM call, or does the system need to model it?

## Recommended v1 scope

Build the reusable primitives generically, prove them against the Stage-1 milestone's single locked scene, and leave the full state machine for its own follow-up once the questions above have real answers:

1. Overworld Scene + one or two Notes wired to the custom `activateNote` → `pullUsers()` hook (proves the click-to-travel mechanism end to end).
2. Outro Scene + bound Playlist, cued from the director's panel (proves the "press a button, get a static scene with music" bar — genuinely small).
3. Everything about signup state, multi-group tracking, and the time-segment counter stays **out of scope for the v1 proof** and becomes its own tracked design/build pass once scope questions 1–4 above are answered.

This keeps "prove a complex scene + the start of the Mimetic interface" achievable without first having solved the hardest new mechanic in the same pass.
