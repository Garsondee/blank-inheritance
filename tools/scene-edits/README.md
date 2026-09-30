# scene-edits

Brings Ingram's Scene Runner edits home from the live server, merges them into `data/`, and keeps them
there. The design, and why each rule exists, is [design/scene-edits.md](../../design/scene-edits.md).

```
npm run edits                      pull new edits and merge them (the default)
npm run edits -- status            what is waiting: clashes, notes, anything reverted (offline)
npm run edits -- log [--scene id]  every edit she has made, as before/after text
npm run edits -- check             exit 1 if the repo holds older words than hers anywhere
npm run edits -- restore           put her words back wherever that happened
npm run edits -- resolve <id> --hers                      settle a clash her way
npm run edits -- resolve <id> --mine --reason "..."       keep the repo's version (ask her first)
npm run edits -- done <note id> --reply "what was done"   answer one of her notes
npm run edits -- supersede <id> --reason "..."            a later decision of hers replaces an edit
npm run edits -- pull --from <folder>                     read a local storage/ instead of the server
```

It also runs by itself, so none of this usually needs typing:

- **at the start of every conversation** (`session-start.mjs`, a SessionStart hook in
  `.claude/settings.json`). What she changed is printed there, as before/after text: read it;
- **before any Edit/Write of `data/scene-briefs|challenges|episodes/`** (`pre-edit.mjs`, a PreToolUse
  hook, at most once a minute). If her edits just landed in that file the edit is stopped: re-read
  it and redo the edit on top of hers;
- **as the first step of `npm run deploy`**, which also refuses to deploy while the repo holds
  older words than hers.

## Files

- `edits.mjs`: the CLI, and `runPull` / `status` / `checkReversions` / `sceneEditsForDeploy`.
- `inbox.mjs`: where records come from: the server over SSH (read-only, via
  `tools/module-sync/remote.mjs`), or a folder. Every file is checked against the server's own hash.
- `merge.mjs`: merging, settling clashes, answering notes, restoring. Pure over documents.
- `report.mjs`: the before/after digest.
- `store.mjs`: the only file here that touches the disk: data files (layout and line endings kept),
  the ledger, `harvest/scene-edits/`, `harvest/foundry-edits/`, the merge lock.
- `session-start.mjs`, `pre-edit.mjs`, `state.mjs`: the two hooks and their once-a-minute memory.

The rules themselves live in `module/blank-inheritance/scripts/core/scene-edits.mjs`, shared with the Runner.

Tests: `npm run test:scene-edits`. `test/scene-edits/tools.test.mjs` runs both hooks for real as
subprocesses against a scratch repo (`BI_SCENE_EDITS_ROOT`, `BI_SCENE_EDITS_FROM`, `BI_SCENE_EDITS_STATE`
point them there); nothing in the tests touches the server or this repo's data.
