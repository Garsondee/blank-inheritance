# Scene Edits: Ingram rewrites scenes in the Runner, and nothing old overwrites them

*Built 2026-09-27, at Ingram's request. Code: `module/blank-inheritance/scripts/core/scene-edits.mjs`,
`core/scene-edit-sheet.mjs`, `core/foundry-edits.mjs`, `foundry/scene-edits.mjs`, the edit sheet in
`foundry/scene-runner.mjs` and `templates/runner/edit*.hbs`, and `tools/scene-edits/` on this side.*

## 0. The request

Ingram, 2026-09-27: *"I want to start reading scenes in the scene runner and if I see something wrong
I don't want to have to describe it I just want to edit it ideally."* Then, approving this design:
*"Ideally I would go into Scene 0 'From Up Here' and edit the whole scene to fit what I want to say.
You'd then be able to pick up on those changes automatically, you'd have a process to make sure you
check for any changes on the remote server first. I ONLY WILL REWRITE SCENES ON THE REMOTE SERVER. We
need to make sure that things I rewrite don't get overwritten by the old content as a critical
requirement, something that works smoothly with your editing process and which makes this process
easier for you. You should ideally even see what I edit, because if I edit enough stuff you might
start to see patterns in how I prefer to write and create scenes which helps you to create future
ones."*

Her first idea was an Edit button whose Save produced a text prompt to paste to Claude. Kept for the
changes that need Claude (§3, notes), without the copy and paste: a prompt lives only in a clipboard
until it is pasted, and the Runner would have gone on showing the old line until it was applied and
deployed.

## 1. What was true before

- The Scene Runner reads the scene files a deploy puts on the server (`data/campaign/scene-briefs/`),
  not Foundry documents. There was nothing in it to edit, and every deploy replaces those files.
- The documents she *could* edit in Foundry were copies the module overwrote: an episode's journal
  was deleted and rebuilt whenever its source changed (`foundry/sync.mjs#runRealJournalCase`), and a
  Papers handout was rewritten from the scene on every "Show again" (`foundry/handouts.mjs`).
- Nothing carried a Foundry edit back to the repo. The harvest half of the sync (GitHub #81, designed
  in `foundry-module-design.md` §0 and §4) was never built beyond pulling the session log, and that
  pull was run by hand and forgotten.

## 2. The shape

1. **She edits in the Runner.** The Edit key swaps the script for the edit sheet (§3).
2. **Each change is one immutable record** (§4), saved the moment she leaves the box, as its own file
   in the module's `storage/` on the server: the one folder no deploy overwrites or prunes and no
   module update deletes.
3. **The Runner lays her records over the deployed files** every time it loads a scene, so her
   version shows at once, after a reload, and after every deploy (§5.1).
4. **My side pulls the records home** into `harvest/scene-edits/` and merges them into `data/` word
   for word (§5.2), automatically: at the start of every conversation, before any edit of a scene file,
   and as the first step of `npm run deploy` (§5.4).
5. **The ledger** (`data/campaign/scene-edits.json`) records what is merged. It deploys with the
   campaign data, so the Runner stops marking an edit once it is in the repo.
6. **A guard** refuses to let the repo go back to older words than hers: the deploy refuses and the
   test suite fails (§5.3).

The repo stays the one true copy. The Runner becomes a place she can write to it from.

## 3. The edit sheet

The whole scene as text boxes, in running order (`core/scene-edit-sheet.mjs`):

- the scene: title, goal, summary, how to play it, how long it runs;
- the opening: where, the first thing they notice, read-aloud, landmark, hold in reserve, carries-in;
- every beat as a card: its line, "only if", read-aloud, direction, note, Required, who it is for;
  the check it asks for (name, DC and all four outcomes, plus any per-skill lines), edited in the
  check file itself and flagged when other scenes share that file; any choice and its options;
- the ending: ends when, read-aloud, the line that moves them on, onwards, write-down lines, carry forward;
- people: name shown, role, wants, opens with, voice, lines to steal, what they will and will not
  discuss, what can be moved on;
- handouts and things they keep (a handout's text shows the markup the file stores);
- GM notes, temptations and after-scene prompts.

Empty fields are there to be written: Scene 0's opening has no read-aloud, and the box is on the sheet.
Every box holds exactly the stored words, `**bold**` and the `<trig id="..."/>` markers that make a
line's buttons included, so what she edits is what is saved and nothing is lost in a round trip
through rendered HTML.

Saving has no button. A box saves when she leaves it; a one-line box saves on Enter and a longer one on
Ctrl+Enter; Esc puts the box back. A box being typed in survives any re-render (a roll arriving, the
stage changing), and its words are also kept in the browser until saved, so a page that goes away
mid-sentence gives them back.

Structure: a beat can be added between any two, moved up or down, and removed, with "Put it back" until
the removal is merged. Plain lists (write-down lines, lines to steal, temptations, after-scene prompts)
take added and removed lines. Anything else, like "cut this person" or "make this a check", is a
**note for Claude**, pinned to the scene or a beat. Notes come home the same way. I act on them and
answer with `npm run edits -- done <id> --reply "..."`, and the Runner shows the reply on the note.

Marks, always a word as well as a colour: *not in the repo yet* (amber edge), *Claude changed this after
you saw it* (a clash, §5.2), *the server had an older version* (§5.1), *not saved yet*, *didn't save*.
The Edit key carries a count of her edits not yet in the repo.

## 4. Records, and where they live

One JSON file per change, `scene-edit-<time>-<random>.json`:

```json
{ "kind": "scene-edit", "version": 1, "id": "20260927T155217978Z-Lqwcmr", "at": "...", "by": "Ingram",
  "op": "set", "file": "scene-briefs/episode-c1e1--from-up-here", "briefId": "episode-c1e1--from-up-here",
  "path": ["beats", {"id": "come-east"}, "readAloud"], "before": "…", "after": "…" }
```

- `op` is `set` (a field), `insert`, `remove` or `move` (an item in a list), `note`, or `withdraw` (a
  note she took back).
- `path` names beats and other items **by id**, never by position, so a beat added by someone else
  cannot redirect her edit. Plain lines with no ids are addressed by position, and the words she saw
  make a shifted line a clash, never a silent write to the wrong one.
- `before` is what she saw: the deployed text with her own earlier edits applied. A second edit to the
  same line chains onto the first.
- Records are immutable and never edited. A correction is a new record.
- An edit may never touch `id`, `type`, `authoring`, `review`, `$schema` or any `…Ref` field. Identity,
  lifecycle and the wiring between files are not words (`validateRecord` refuses them, and so does the
  merge).

| Where | What | Written by |
|---|---|---|
| server `storage/scene-edit-*.json` | every record, as made | the Runner (`foundry/scene-edits.mjs`) |
| `harvest/scene-edits/` (tracked) | every record, byte for byte as pulled, hash-checked | `tools/scene-edits` |
| `data/campaign/scene-edits.json` (deployed) | the ledger: merged / superseded / done / withdrawn | `tools/scene-edits` only |
| `data/scene-briefs/`, `data/challenges/` | her words, merged | `tools/scene-edits` (a merge), and me |
| `canon/scenes/`, `canon/challenges/` | her words, merged, for a scene canon has rebuilt | `tools/scene-edits` (a merge), instead of the row above |

## 5. Keeping them

### 5.1 In the Runner: hers always shows

`core/scene-edits.mjs#overlayDocs`. A **pending** record (no ledger entry) is always applied, whatever
the deployed file says. A **superseded** record is never applied.

A **merged** record's words are already in the deployed files, and three things keep it that way:
- both pushes send the ledger **last** in the data channel (`stage-campaign-data.mjs#ledgerLast`), so it
  never calls an edit merged before the file holding her words has arrived;
- every push refuses to send older words than hers (§5.3);
- the Runner therefore does not fetch settled records at all, only pending ones and answered notes, so a
  page load does not grow slower as the campaign's edits pile up.

A merged record already in a page's memory from before a deploy is applied only where the deployed file
is *behind* it, meaning it still says what she replaced. It never undoes a later, deliberate change,
because new words are not her old words.

### 5.2 In the repo: a merge never writes over words she did not see

`core/scene-edits.mjs#mergeRecord`. A record goes in word for word only where the repo still says what
she saw. If the repo changed after she looked, that is a **clash**. Nothing is written either way, the
Runner keeps showing hers, and the pull reports both versions. A person settles it:
`npm run edits -- resolve <id> --hers` puts hers in; `--mine --reason "…"` keeps the repo's and needs
her agreement on record. A clash is never settled by a machine. Renaming a scene also renames it in the
episode's running order, where that still says the old title.

### 5.3 The guard: nothing old comes back

`core/scene-edits.mjs#findReversions`. For every field she changed, the repo must not hold any older
version of it: what she replaced, or what a settled clash replaced. A beat she added must still be there;
a beat she removed must still be gone. Checked by:

- `npm run deploy`, which **refuses** before sending anything (`--no-edits` skips only the pull, never
  this check);
- the test suite (`test/tier2-scene-edits-corpus.test.mjs`) against the real repo;
- every pull, whose report puts it under CRITICAL.

`npm run edits -- restore` puts her words back. A later change of mine to a line of hers is allowed,
because new words are not old words. It is my rule to say so loudly
(`feedback_her_server_edits_are_latest` in memory).

### 5.4 Pulled first, automatically

- **Every conversation starts with a pull** (`tools/scene-edits/session-start.mjs`, a SessionStart
  hook). Her new edits are merged before any work begins, and printed where I read them.
- **Every edit of a scene file waits for one** (`tools/scene-edits/pre-edit.mjs`, a PreToolUse hook on
  Edit/Write/MultiEdit of `data/scene-briefs|challenges|episodes/`, at most once a minute). If her
  edits just landed in that file, my edit is stopped, because it was planned against old text: I
  re-read and redo it on top of hers. An unsettled clash in that file stops it too. The ledger and
  the harvested files refuse hand edits outright.
- **Every deploy starts with one** (`tools/module-sync/deploy.mjs`, step 0), so what it sends already
  holds her words.

Only one merge runs at a time (a lock in `harvest/scene-edits/`), because several conversations can
start at once.

### 5.5 A scene under canon: the merge writes into `canon/`, not `data/`

Found 2026-09-27, testing this system for real on Scene 0 -- the first scene rebuilt in the new canon
tree (`design/story-data-refactor.md`), which requires `data/scene-briefs|challenges/<id>.json` to stay
a byte-identical copy of `canon/scenes|challenges/<id>.json` and errors otherwise. Before this fix, a
merge wrote her words straight into `data/`, same as any other scene. The next routine `story build`
would have overwritten them with the old canon text -- the one thing this whole system exists to
prevent -- and canon's own check would then have flagged the resulting mismatch as if it were a mistake
of mine, with no sign her edit was ever there.

The fix (`tools/scene-edits/edits.mjs#canonFilePath`, `#repoDocs`): before writing, a merge asks whether
`canon/scenes|challenges/<id>.json` exists for that file. If it does, that is the copy it merges into,
and `data/` is resynced from canon (`tools/story/lib.mjs#build`) in the same step, so canon's invariant
is never seen broken -- not even between two lines of a script. If it does not, nothing changes: the
merge writes straight into `data/`, as it always did, for every scene canon has not touched yet. A scene
already `approved` (canon/README.md) that she then edits is correctly flagged as needing her read again,
the same as any other change to it -- an edit is not a review (§9), even hers.

Tested in `test/scene-edits/canon-reconciliation.test.mjs`: a canon-tracked scene's edit lands in
`canon/`, `data/` matches byte for byte in the same pull, and a second edit right after finds no clash
(the merge compares against the canon copy, never a stale `data/` one).

## 6. Seeing what she changes

Every pull prints each new edit as a word-level before/after: what she cut and what she added. A line
she rewrote almost entirely is shown as old and new text in full. `npm run edits -- log [--scene <id>]`
replays every edit she has ever made, oldest first. The records in `harvest/scene-edits/` are tracked in
git: they are the record of her corrections, and the best evidence of how she writes. Patterns go into
`feedback_ingram_writing_patterns` in memory, and future scenes are written to them.

## 7. Documents edited directly in Foundry

`core/foundry-edits.mjs`. The episode journals and the Papers handouts remember a fingerprint of the words
the module last wrote into them. The fingerprint is taken **after** Foundry stored them, because Foundry's
server cleans HTML on the way in and a fingerprint of what was *sent* would never match. A document whose
words no longer match has been edited in Foundry:

- a journal is **kept**, not deleted and rebuilt, even when its source leaves the repo. The update card
  lists it under "Kept your edits";
- a handout page keeps her text on "Show again" (its ownership still widens), and she is told;
- either way a copy of her words is filed into `storage/foundry-edit-<kind>-<id>.json`. The pull brings
  it to `harvest/foundry-edits/` and reports it under EDITED IN FOUNDRY, and I fold it into the repo by
  hand.

A kept journal stays hers until she deletes it. It then comes back from the repo at the next update.
Journals from before this check had no fingerprint. Ingram confirmed on 2026-09-27 she had not edited
anything in Foundry yet, so each takes one at its next unchanged sync.

## 8. Ownership (design/data-ownership.md)

No field gains a second owner. The Runner writes **records**, and only into `storage/`. `tools/scene-edits`
is the sole writer of the ledger and the harvested files. The schema says so (`scene-edits.schema.json`'s
`OWNER:`), and the pre-edit hook refuses a hand edit. A merge is an authored-content write that arrives
through the repo, the same class as me editing the file. Lifecycle fields (`authoring`, `review`) cannot
be named by a record at all. Editing is not approving: an edit leaves a scene's status where it was, and
a live scene she edits stays live.

## 9. What this deliberately does not do

- Change wiring: which check a beat uses, which person it is about, what triggers exist. Those are notes.
- Edit NPC, location or episode files from the sheet, apart from the episode title that follows a renamed
  scene.
- Settle a clash automatically, in either direction.
- Delete anything on the server. Records stay in `storage/`; the ledger is what retires them.
- Replace the Sign-Off. An edit is not a review.

## 10. Tests

`test/tier1-scene-edits.test.mjs` (the rules, including the CRITICAL reversion cases),
`tier1-scene-edit-sheet.test.mjs`, `tier1-foundry-edits.test.mjs`, `tier2-scene-edits-corpus.test.mjs`
(the real repo), `tier3-scene-edit-sheet-contract.test.mjs`, `tier4-scene-edits-adapter.test.mjs`,
`tier4-kept-journal.test.mjs`, the new cases in `tier4-handouts.test.mjs` and
`test/module-sync/deploy.test.mjs`, and `test/scene-edits/tools.test.mjs`, which runs both hooks for real
as subprocesses against a scratch repo. `npm run test:scene-edits` runs them all.

## 11. Status

Built and tested 2026-09-27. Verified live in the local Foundry copy of the world: an edit saved as a record,
survived a reload, a beat added, removed and put back, a note sent, and the running view followed. The
full pull-and-merge loop was proven on a scratch copy of the repo, changing nothing but her two edits byte
for byte. Deployed the same day. Her first real use is rewriting Scene 0, "From Up Here".
