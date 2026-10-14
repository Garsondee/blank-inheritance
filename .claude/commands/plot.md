---
description: Before writing or changing anything about the story (a scene, a chapter, a person, a thread), read what canon holds about it and work inside the filing rules
argument-hint: "[what you're about to write or change]"
---

# Work on the story — `$ARGUMENTS`

The store and its rules: `canon/README.md` (the filing rules, D070) and `design/plot-timeline.md`.

## 1. Read before writing

- **Her edits on the timeline first.** If the conversation's start said she saved on the timeline, read that day's
  record (`canon/decisions`, `kind: timeline`): it is how she writes. `node tools/story/story.mjs note` lists her notes;
  answer each with `story note <Nn> --reply "..."` (add `--done` when it is dealt with). If the pre-edit hook stops an
  edit because she just changed that file, re-read it and make the edit on top of hers.
- `node tools/story/story.mjs context <id>` for every person, place, group, thread, chapter or scene you will touch. It
  gives ink first, then open questions, then pencil, her words, every use, what the table knows by the end of Episode
  One, and what must never be said. Do not search the old stores instead; they may be searched only for ideas.
- `node tools/story/story.mjs brief <chapter | scene>` for what is due there: what to tell, plant and hold back, the
  questions in play, the decisions not to settle, whether the chapter has a relax beat.
- `node tools/story/story.mjs when` for the order of everything; `node tools/story/story.mjs health` for what needs
  attention before the table gets there.

## 2. Write inside the rules

- **Play material never cites pencil.** If a scene needs a pencil fact, ask Ingram to ink it; until she does, the scene
  waits or does without it.
- **Open facts are hers.** Never settle one in passing, even when an answer seems obvious: name it, with your best
  candidate, and ask.
- **Ink is hers too.** Change an ink fact's words only to carry out her decision, and say so.
- Your own new ideas are pencil (`status: sketch · by: claude`), or ideas in `canon/ideas/` if they are alternatives.
  Extend a pencil fact that already says part of it rather than adding a near-duplicate (the pencil is merged down on
  purpose, D079, D080); a fact id you remember may have been merged into another, so take ids from `story context`.
- Changes go through `tools/story/edit.mjs`: `story edit`, `story ink`, `story pencil`, or the timeline page. A status
  changes only with a decision record that says so.
- Anything she says along the way is filed the same turn: `/lore`.

## 3. Finish

- `node tools/story/story.mjs check` (0 errors) and `node --test test/canon.test.mjs "test/story/*.test.mjs"`. An
  error that older words came back over hers is fixed with `story restore`, never by editing her day record.
- A changed canon scene gets its re-read (`canon/reread.md`, `<scene>.reread.md`) and `story build`.
- Report what changed in her terms, what is pencil for her to look at, and what is still open.
