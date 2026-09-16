# harvest/

Pulled off the live Foundry server by `node tools/module-sync/sync-harvest.mjs`.
Read-only in that direction: nothing here is ever pushed back.

- **`sessions/<date>.json`** — the Director's own log bar, one file per real-world
  day. What the GM typed while running the game: what a moment *meant*, which is
  the one thing no amount of mechanical logging can reconstruct. Tracked in git.
- **`chat-<date>.json`** — every chat message Foundry's own log recorded that
  day, normalized by `module/blank-inheritance/scripts/core/chat-export.mjs`
  (real `@Check` roll outcomes, bare `@Actor`/`@Item`/`@UUID` references, plain
  text otherwise). Written flat under `storage/` on the server (no `chat/`
  subfolder — see that file's own header for the real, live-found Foundry bug
  this sidesteps), so it lands flat here too once pulled. Tracked in git for now,
  same reasoning as `sessions/` — reconsider if it turns out too voluminous.
- **`inference/`** — `tools/module-sync/review-harvest.mjs`'s own output:
  `sessions/` + `chat-*.json` run through
  `module/blank-inheritance/scripts/core/harvest-inference.mjs`'s three-tier
  classifier (design/harvest-inference.md). Regenerable from the two sources
  above on demand (`node tools/module-sync/review-harvest.mjs [--date
  YYYY-MM-DD]`), gitignored like `test-reports/`.
- **`test-reports/`** — diagnostics written by the module's sync self-test.
  Regenerated constantly, gitignored.

This is a staging area, not an archive. Per `design/foundry-module-design.md` §4,
promoting anything from here into the canonical `data/` files is a deliberate
human step — "did the GM's version improve on the authored one" is a judgement
call, not a merge algorithm's job. `review-harvest.mjs`'s "RESOLVED" list and
disambiguation batch are exactly that judgement call made easier, never automatic.
