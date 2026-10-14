---
description: Work through the QC bot's reports with Ingram: bring them home, open the inbox, take in her decisions, merge what she accepted, talk through the rest
argument-hint: "[scene id | report id]"
---

# QC merge — `$ARGUMENTS`

The design is `design/qc-bot.md`. The bot (in the cloud) pushes a branch `qc/<date>-<scene>` per scene with a report and one
commit per proposal. This is the procedure for merging **by decision, together with Ingram**. Never merge a bot branch with git,
and never check one out in this working tree: the auto-sync watcher would deploy its unapproved changes within seconds.

## 0. Her edits first (always)

```bash
npm run edits
```

Her Scene Runner edits come home before anything is applied. A patch that meets a line she changed is reported as a clash and
not applied, but do not rely on that alone.

## 1. See what the bot pushed

```bash
git fetch origin
git branch -r --list "origin/qc/*"
node tools/qc-bot/qc.mjs status
```

For each new branch, check it **without checking it out**:

```bash
node tools/qc-bot/qc.mjs guard --base origin/master --head origin/qc/<branch>
```

Any VIOLATION means the bot went outside its write surface: do not bring anything home, and tell Ingram what it touched.

## 2. Bring the reports home (reports only, never the patches)

```bash
git checkout origin/qc/<branch> -- reviews/qc/reports/<scene id>/
node tools/qc-bot/qc.mjs lint reviews/qc/reports/<scene id>/<file>.json
```

`lint` applies every patch to the files as they are now: an error means master moved since the bot looked. Tell her which
proposal and why, and ask the bot's next run to redo it (it will, because the queue sees the scene changed) or fix the
proposal yourself if it is a one-line change. Commit the report files (`.json` and `.md`) to master on their own.

## 3. Open the inbox

```bash
node tools/qc-bot/qc.mjs page
```

Publish `reviews/qc/inbox.html` as a private Artifact: `capabilities: { db: {}, user: {} }`, the title and icon of the first
publish, and the address recorded in `reviews/qc/published.json`. If that file names an address, update **that** artifact in
place (read it first; never publish a second copy). After the first publish, do one `ArtifactData` `list` of the `decisions`
collection to prove the store answers. Tell her the link and what the page does in two lines.

## 4. Take in her decisions

When she says she has decided (or a decision came by chat):

- From the page: `ArtifactData` `list` of `decisions` with `out_dir` set to a scratch folder (one `<proposal id>.json` per
  decision), then `node tools/qc-bot/qc.mjs decisions import <scratch folder>/decisions`. A decision someone pressed in a view
  with no store comes by Copy decisions as one JSON file: import that file the same way.
- From chat: `node tools/qc-bot/qc.mjs decide <proposal id> accept|decline|discuss --note "<her words, exactly>"`
  (`--via chat`). Never tidy her words.

Her reasons are kept verbatim in `reviews/qc/decisions/`; the bot reads every one before it proposes anything again.

## 5. Merge what she accepted

```bash
node tools/qc-bot/qc.mjs apply reviews/qc/reports/<scene id>/<file>.json --accepted --reread
```

This applies only the accepted patches, onto the files as they are now, rebuilds the canon copies, runs the story check,
stamps each proposal applied, and adds a "Revision" entry (with her notes) to the scene's re-read record. A line printed as
`NOT applied` is a clash or a check failure: read why, and settle it with her. Then:

```bash
node tools/story/story.mjs check
node --test "test/qc-bot/*.test.mjs"
npm test
git diff --stat
```

Show her the diff in plain words, then commit: the report files, the decisions, the changed canon and built copies, the
re-read record. Say that the auto-sync will deploy it. **A scene that was approved is reopened by the change**: say so.

## 6. The ones she wants to talk about, and the questions

- `discuss`: talk it through in chat (her note is in `reviews/qc/decisions/<id>.json`). When she has decided, record it with
  `qc decide ... --note` in her words, then apply it as in step 5 if she accepted.
- A `question` proposal has no patch. Her `choice` is the answer: carry it out as ordinary work (for example edit the plan row
  with `node tools/story/story.mjs edit`, or add a person to a scene as a normal change with its own re-read), and record in
  the decision's note what was done. Plan rows and canon facts are changed only the way she changes them: her words first.

## 7. Tidy up

Republish the inbox (step 3) so the decided items drop out of the default view. Offer to delete the merged remote branches
(`git push origin --delete qc/<branch>`) and **ask first**: it cannot be undone.

## Rules

- She decides; the bot proposes. Never apply a proposal she has not accepted.
- Never reword her notes, her edits or a decision record.
- If a proposal she accepted no longer applies, tell her; do not rewrite it to fit.
- Say loudly whenever a merge touches words she wrote (`design/scene-edits.md`).
