# module-sync

Verified pushes to the live Foundry server — see GitHub issue #112 and epic #118.

## Deploy: the one command (2026-09-27)

```
npm run deploy            # push everything, verify it, stamp it
npm run deploy:check      # the same comparison, sending nothing
npm run deploy -- --prune # also delete server files the repo no longer has
```

`deploy.mjs` is how anything reaches the server now. In order:

0. **Ingram's scene edits** (`tools/scene-edits`, [design/scene-edits.md](../../design/scene-edits.md)). Her Scene Runner edits are pulled off the server and merged into `data/` first, so the deploy carries them. The deploy **refuses** if the repo holds older words than any of her merged edits. `--no-edits` skips the pull, never the check. The scene-edits ledger is always sent last in the data channel.
0. **Preflight** (`preflight.mjs`). Refuses to push a module Foundry could not load: a `module.json` naming a file that is not there, an id that does not match its folder, a relative import of a missing file, a bare import, a script that does not parse, a missing literal `templates/*.hbs`, a language file that does not parse. A scene in `scene-set.json` with no picture is a warning, not a refusal.
0. **Art** (`tools/token-ring/crop_ring_subject.py` + `stage_npc_portraits.py`, 2026-09-29). Runs the staging scripts (and, since 2026-10-01, `tools/stage-scenes/stage_scenes.py` for Scene backdrops) against `data/campaign/asset-registry.json` before anything is gathered to send, so a portrait registered there and pushed with this one command is genuinely finished: no separate manual step to circle-crop a token-ring subject or resize an Actor/frame portrait. **Refuses the deploy** on any failure (including a registered portrait missing from disk) — a silent partial miss here is exactly the unreliable result this step exists to end. `--no-art` skips it.
1. **module**: `module/blank-inheritance/` → `Data/modules/blank-inheritance/` (never `storage/`, never the local `data/campaign/` copy — this is also where the art step's own output, `assets/tokens/` and `assets/stage/`, gets picked up and sent).
2. **data**: the campaign-data allow-list (`stage-campaign-data.mjs`'s `campaignDataSources`) → `.../data/campaign/`.
3. **video**: the finished opening titles and every episode title card → `Data/blank-inheritance-video/`, under the names `core/opening-titles.mjs` plays them by. Drafts in the renders folder are never taken.
4. **prune** (only with `--prune`): deletes files the server has and the repo does not. Never `storage/`, never the stamp, never video.
5. **stamp**: `data/campaign/build.json`, written LAST and only when every channel verified. Its `id` fingerprints everything pushed; `history` remembers the last 30 deploys and what each changed.

Each channel sends only what differs, then re-hashes both sides. Audio is not a channel: `tools/audio-pipeline upload` owns it.

**Why one command.** Until 2026-09-27 each session pushed whichever part it had touched, sometimes as a hand-picked subset. The server drifted days behind: Scene 0 ("From Up Here", authored 24 September) and the opening-title videos never reached it. Then a subset push on 26 September sent a `module.json` naming `styles/bi-agreement.css` without the stylesheet. At the next world launch Foundry rejected the whole module, and every macro failed with `Cannot read properties of undefined (reading 'api')`. **Never push a subset again.** If the working tree holds someone else's unfinished work, preflight is what stands between it and a broken server. Anything preflight lets through still loads.

**What the stamp does.** The module watches it (`scripts/core/world-sync.mjs`, `scripts/foundry/world-sync.mjs`). When a GM logs in, or within 90 seconds of a deploy while one is logged in, a new `id` means the world brings itself up to date, with no macro:

- journals and actors re-synced;
- every scene built or refreshed;
- scenes the adventure no longer has removed, along with temporary scenes and empty duplicates;
- stale synced documents retired.

Then one whispered card says what changed. If the new build includes new module code, an open page asks for a reload (F5) instead of applying it with old code. If `module.json`'s file list changed, the world needs a relaunch, and both this script and the module say so.

**At session start**, `deploy-status.mjs` (wired into `.claude/settings.json`) prints one line: up to date, or how many files have changed since the last deploy from this machine (`.last-deploy.json`, gitignored). It runs offline and takes about half a second.

## Auto-sync: nobody runs the deploy (2026-10-07)

Ingram: *"I ALWAYS want changes in the local folders to be reflected in the remote server automatically and every time ... I don't want to deploy things to the remote server."* So `autosync.mjs` is a background watcher that runs the deploy above by itself. It adds no new way of sending files: everything `deploy.mjs` refuses (a module Foundry could not load, a stale Stagecraft bundle, a repo that holds older words than Ingram's), it still refuses.

```
npm run autosync -- status    # what it is doing, what it pushed last, why a push was refused
npm run autosync -- pause     # hold every push (changes stay queued); `resume` lets them go
npm run autosync -- log       # the last lines of tools/module-sync/.autosync/autosync.log
npm run autosync -- start     # make sure it is running (the SessionStart hook does this)
npm run autosync -- stop
```

**What it watches** (`autosync-plan.mjs`, `WATCH_ROOTS` + `classifyPath`): the module (not `storage/`, not its local `data/campaign/` mirror), the files Stagecraft ships, the allow-listed campaign `data/`, `canon/`, the finished opening-title renders, and `audio/library/`. Editor droppings, `.git`, `node_modules` and anything else are ignored.

**When it pushes.** A burst of edits has to go quiet for 30 seconds (audio: 60), and two deploys never start closer than 2 minutes apart (the module re-syncs the world after each deploy, which interrupts a table in play). It decides *whether* to deploy by comparing file hashes with `.last-deploy.json`, never because "an event happened": a save with no change, or the deploy's own staged art, starts nothing. It also ignores watcher events where a file's size and modified time did not move, because on this machine (NTFS last-access updates on) merely reading a file reports a change.

**What it does around the deploy:**

1. canon or world facts changed -> `node tools/story/story.mjs build` (the idempotent canon-to-`data/` copy).
2. Stagecraft's bundle older than its sources, or a dev build -> `node module/stagecraft/tools/build.mjs`.
3. `deploy.mjs`, with `--no-video` unless a video changed and `--no-art` unless `asset-registry.json` changed (the art step takes minutes). **Never `--prune`**: deleting server files stays a deliberate `npm run deploy -- --prune`.
4. Audio is its own lane: `audio-pipeline.mjs upload` (incremental, verified) when the processed library's size-and-time fingerprint changes.

**When it fails** (preflight refuses, the connection drops) it keeps the work pending and retries after 30 s, 1, 2, 5 and then every 10 minutes; any new edit cancels the wait, because the person may just have fixed it. `status` prints the reason. A safety-net comparison runs every 10 minutes for events a watcher drops (a `git checkout`, a buffer overflow).

**Lifetime.** One daemon at a time, however many sessions start at once (an exclusive lock plus a heartbeat in `.autosync/state.json`, so a reused pid after a reboot is not mistaken for it). The SessionStart hook in `.claude/settings.json` starts it; it keeps running after the session ends. Edits made while no session has been opened since a reboot are picked up when the next one starts, or by `npm run autosync -- start`.

Tests: the decisions are pure (`autosync-plan.mjs`, `test/module-sync/autosync-plan.test.mjs`). `autosync.mjs` itself is the adapter (watchers, child processes, a lock), exercised by running it against the server, like `remote.mjs`.

## The individual pushes

The scripts below still work on their own; `deploy.mjs` supersedes them for anything going to the live server.

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

A third script pulls the other way:

```
node tools/module-sync/sync-harvest.mjs
```

Downloads the module's `storage/` directory OFF the server into `harvest/`, then verifies it the same way — re-hashing both sides independently and refusing to call a run successful on an exit code alone. `storage/` is the one directory a module update does not delete (manifest `persistentStorage: true`), which is why `design/foundry-module-design.md` §4 put harvested content there: everything the table produces lands in it, starting with the GM's own session log.

**Read-only against the server.** It never deletes, moves or rewrites anything remote. Promotable content travels Foundry-to-repo only, and merging any of it into the canonical `data/` files is a deliberate human step — see §4's reasoning on why that is not a merge algorithm's job.

One subtlety, tested rather than commented: harvest calls `diffChecksums` with the **server** in the first position, because on a pull the server is the source of truth rather than the destination. That inverts what two of its four result fields mean — `onlyLocal` becomes "on the server, did not arrive" and `onlyRemote` becomes "in the repo, no longer on the server". `summarizeDiff` is deliberately not reused for the same reason: its wording is written for a push and would state the exact opposite here.

## Why this is safe

This only pushes files onto disk in the module's `data`/`scripts` folders — it never touches a live Foundry document. Per `design/foundry-module-design.md`'s Safety section, that's a meaningfully lower risk level than the actual in-Foundry Sync step, which has to go through Foundry's Document API. Getting files onto the server and turning them into live documents are two different levels of trust; this tool is only the first one.

## Structure (core/adapter split, same convention as the rest of this project)

- `checksums.mjs` — pure parsing/diffing, zero I/O. Fully unit tested (`test/module-sync/checksums.test.mjs`).
- `local-hash.mjs` — real filesystem reads, no network. Deterministic, testable against a fixture directory (`test/module-sync/local-hash.test.mjs`).
- `remote.mjs` — the only file allowed to shell out to `plink`/`pscp`. Not unit tested (needs a real key, a real reachable server, PuTTY installed at a fixed path) — Tier-5-equivalent, exercised by actually running the tool, not by CI. Uses `execFile` with an argument array rather than a shell string, specifically to avoid the nested-quoting bugs that bit earlier scratchpad versions of this script.
- `sync-module.mjs` — the CLI entry point wiring the above together, for the module code.
- `stage-campaign-data.mjs` — real filesystem reads/copies, no network. Unit tested against a fixture directory (`test/module-sync/stage-campaign-data.test.mjs`).
- `sync-campaign-data.mjs` — the CLI entry point for the campaign data, wiring `stage-campaign-data.mjs` plus the same checksum/upload pieces above together.
- `preflight.mjs` — the "can this module load?" checks. Filesystem reads, plus `node --check` per script. Tested against fixture trees and against the real module on every run (`test/module-sync/preflight.test.mjs`).
- `build-stamp.mjs` — pure: fingerprints, the stamp's shape, its history (`test/module-sync/build-stamp.test.mjs`).
- `deploy.mjs` — the one command. Its orchestration is tested offline against an in-memory server (`test/module-sync/deploy.test.mjs`).
- `deploy-status.mjs` — the session-start line (`test/module-sync/deploy-status.test.mjs`).

`remote.mjs` also has `uploadFiles` (sources from anywhere, one file at a time), `deleteRemoteFiles` (named files only, refusing any path that could escape its quotes or directory) and `readRemoteText`.

## Known limitations

- This is overwrite-and-verify, not a mirror. A file deleted locally is reported as "only remote" but is **not** deleted from the server — deleting something that turns out to still matter is a worse failure mode than a harmless stale file sitting there. `deploy.mjs --prune` is the one deliberate exception (standing permission from Ingram, 2026-09-19, "be careful and cautious"): run `npm run deploy:check` first, confirm each "only on the server" file really is dead (git shows it deleted on purpose, nothing still loads it), then prune.
- Uploads happen one file at a time, not via a single recursive `pscp -r`. Found by hand, 2026-09-05: a single recursive push reliably *creates* files that don't exist remotely yet, but does not reliably *update* files that already exist there from a previous sync — confirmed reproducible (two files edited in the same run were silently left at their old content after a recursive push reported success), and confirmed fixed by uploading each file individually instead. Slower for a directory with many files, but the checksum verification step is what caught this in the first place — "the copy command exited 0" was never actually proof.
