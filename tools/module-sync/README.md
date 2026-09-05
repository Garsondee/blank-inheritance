# module-sync

Verified push of the Foundry module directory to the live server. Replaces manual WinSCP for this half of the content pipeline — see GitHub issue #112 and epic #118.

```
node tools/module-sync/sync-module.mjs
```

Uploads `module/blank-inheritance/` to the server's `Data/modules/` folder, then independently re-hashes every file on **both** sides (SHA-256, via Node's own `crypto` locally and `sha256sum` remotely) and reports exactly what matches — never trusts a "the copy succeeded" exit code alone.

Add `--dry-run` to compare against the server without uploading anything first (useful to see what a real run would change).

A second, separate script pushes the campaign's real content:

```
node tools/module-sync/sync-campaign-data.mjs
```

Stages an explicit allow-list of repo-root `data/` subdirectories (see `stage-campaign-data.mjs`'s `SYNCED_CAMPAIGN_DIRS`) into a fresh temp folder — a single, clean "sync content" directory — then verified-pushes *that*, the same way as above, to `Data/modules/blank-inheritance/data/campaign/`. Kept separate from the module-code push above since code and data change on different cadences. Deliberately does **not** push `data/` wholesale: `data/map/` alone is 115MB+ of `tools/city-map`'s own unrelated GIS source data, and an allow-list (not an exclude-list) means a new, unrelated top-level `data/` directory added later silently stays out by default, rather than silently landing on a live game server by default.

## Why this is safe

This only pushes files onto disk in the module's `data`/`scripts` folders — it never touches a live Foundry document. Per `design/foundry-module-design.md`'s Safety section, that's a meaningfully lower risk level than the actual in-Foundry Sync step, which has to go through Foundry's Document API. Getting files onto the server and turning them into live documents are two different levels of trust; this tool is only the first one.

## Structure (core/adapter split, same convention as the rest of this project)

- `checksums.mjs` — pure parsing/diffing, zero I/O. Fully unit tested (`test/module-sync/checksums.test.mjs`).
- `local-hash.mjs` — real filesystem reads, no network. Deterministic, testable against a fixture directory (`test/module-sync/local-hash.test.mjs`).
- `remote.mjs` — the only file allowed to shell out to `plink`/`pscp`. Not unit tested (needs a real key, a real reachable server, PuTTY installed at a fixed path) — Tier-5-equivalent, exercised by actually running the tool, not by CI. Uses `execFile` with an argument array rather than a shell string, specifically to avoid the nested-quoting bugs that bit earlier scratchpad versions of this script.
- `sync-module.mjs` — the CLI entry point wiring the above together, for the module code.
- `stage-campaign-data.mjs` — real filesystem reads/copies, no network. Unit tested against a fixture directory (`test/module-sync/stage-campaign-data.test.mjs`).
- `sync-campaign-data.mjs` — the CLI entry point for the campaign data, wiring `stage-campaign-data.mjs` plus the same checksum/upload pieces above together.

## Known limitations

- This is overwrite-and-verify, not a mirror. A file deleted locally is reported as "only remote" but is **not** deleted from the server — deleting something that turns out to still matter is a worse failure mode than a harmless stale file sitting there. Remove stale remote files by hand once you've confirmed they're really not needed.
- Uploads happen one file at a time, not via a single recursive `pscp -r`. Found by hand, 2026-09-05: a single recursive push reliably *creates* files that don't exist remotely yet, but does not reliably *update* files that already exist there from a previous sync — confirmed reproducible (two files edited in the same run were silently left at their old content after a recursive push reported success), and confirmed fixed by uploading each file individually instead. Slower for a directory with many files, but the checksum verification step is what caught this in the first place — "the copy command exited 0" was never actually proof.
