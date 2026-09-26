# The Watcher's files (GM-only)

One file per player character: **what the Watcher has actually observed about them**, and nothing else.

The Watcher is the campaign's adversary, and Claude plays it (`ideas/story/dossier-observer.md` §2; LEDGER #31, #32).
These files are the hard gate that keeps it fair. It may only plan against what is recorded here as known.

## The rules, enforced in code

`module/blank-inheritance/scripts/core/watcher-file.mjs` does this, and `test/tier1-watcher-file.test.mjs` checks it:

- **The fiction only.** Every observation names an in-fiction source: a Recall Knowledge check one of its children
  rolled openly, a fight it watched, or an in-character message, letter, phone use or journal entry on the substrate it
  reads. Anything flagged out of character is refused. **Nothing real about a player is ever recorded**, even if a
  player puts it into the system by mistake.
- **A failed check teaches it nothing.** A critically failed check is recorded as a **mistaken belief**. It will act
  on it, and the party can exploit that.
- **The gate.** `canExploit` opens only for true, recorded knowledge.

## Never synced

`data/watcher/` is deliberately **not** in the campaign-data sync allow-list
(`tools/module-sync/stage-campaign-data.mjs`), so these files never reach the Foundry server, where a player's browser
could fetch them. A test fails if anyone adds it. The players are not told their messages are read (LEDGER #31, D14),
and nothing on the server may tell them.

## Shape

`data/schema/watcher-file.schema.json`. File name: `<subjectRef>.json`, e.g. the kid's own id. There are no files yet,
because the six player characters don't exist yet. Filling them from the session harvest (chat log, correspondence,
combat logs) is the next step, and is not built.
