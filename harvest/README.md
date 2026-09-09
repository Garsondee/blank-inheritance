# harvest/

Pulled off the live Foundry server by `node tools/module-sync/sync-harvest.mjs`.
Read-only in that direction: nothing here is ever pushed back.

- **`sessions/<date>.json`** — the Director's own log bar, one file per real-world
  day. What the GM typed while running the game: what a moment *meant*, which is
  the one thing no amount of mechanical logging can reconstruct. Tracked in git.
- **`test-reports/`** — diagnostics written by the module's sync self-test.
  Regenerated constantly, gitignored.

This is a staging area, not an archive. Per `design/foundry-module-design.md` §4,
promoting anything from here into the canonical `data/` files is a deliberate
human step — "did the GM's version improve on the authored one" is a judgement
call, not a merge algorithm's job.
