# module-sync

Verified push of the Foundry module directory to the live server. Replaces manual WinSCP for this half of the content pipeline — see GitHub issue #112 and epic #118.

```
node tools/module-sync/sync-module.mjs
```

Uploads `module/mythica-machina-blank-inheritance-adventure-module/` to the server's `Data/modules/` folder, then independently re-hashes every file on **both** sides (SHA-256, via Node's own `crypto` locally and `sha256sum` remotely) and reports exactly what matches — never trusts a "the copy succeeded" exit code alone.

Add `--dry-run` to compare against the server without uploading anything first (useful to see what a real run would change).

## Why this is safe

This only pushes files onto disk in the module's `data`/`scripts` folders — it never touches a live Foundry document. Per `design/foundry-module-design.md`'s Safety section, that's a meaningfully lower risk level than the actual in-Foundry Sync step, which has to go through Foundry's Document API. Getting files onto the server and turning them into live documents are two different levels of trust; this tool is only the first one.

## Structure (core/adapter split, same convention as the rest of this project)

- `checksums.mjs` — pure parsing/diffing, zero I/O. Fully unit tested (`test/module-sync/checksums.test.mjs`).
- `local-hash.mjs` — real filesystem reads, no network. Deterministic, testable against a fixture directory (`test/module-sync/local-hash.test.mjs`).
- `remote.mjs` — the only file allowed to shell out to `plink`/`pscp`. Not unit tested (needs a real key, a real reachable server, PuTTY installed at a fixed path) — Tier-5-equivalent, exercised by actually running the tool, not by CI. Uses `execFile` with an argument array rather than a shell string, specifically to avoid the nested-quoting bugs that bit earlier scratchpad versions of this script.
- `sync-module.mjs` — the CLI entry point wiring the above together.

## Known limitations

- This is overwrite-and-verify, not a mirror. A file deleted locally is reported as "only remote" but is **not** deleted from the server — deleting something that turns out to still matter is a worse failure mode than a harmless stale file sitting there. Remove stale remote files by hand once you've confirmed they're really not needed.
- Uploads happen one file at a time, not via a single recursive `pscp -r`. Found by hand, 2026-09-05: a single recursive push reliably *creates* files that don't exist remotely yet, but does not reliably *update* files that already exist there from a previous sync — confirmed reproducible (two files edited in the same run were silently left at their old content after a recursive push reported success), and confirmed fixed by uploading each file individually instead. Slower for a directory with many files, but the checksum verification step is what caught this in the first place — "the copy command exited 0" was never actually proof.
