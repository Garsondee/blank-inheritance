---
description: File what Ingram just said about the story (lore, an idea, an answer, the end of a lore discussion or brainstorm) the same turn, by canon/README.md's filing rules
argument-hint: "[her words, if not already in the message]"
---

# File it — `$ARGUMENTS`

The filing rules are in `canon/README.md` (D070). When Ingram states lore, offers an idea, answers a story question, or a
lore discussion or brainstorm ends, **everything is filed before the turn ends**, then `story check` runs. Do every step
without asking; ask only about a real fork (two of her own statements that disagree, a name she has not given), and even
then file your best reading as pencil and say so.

## 1. Read what is there first

- `node tools/story/story.mjs show <entity>` for every person, place, group or thing her words touch, and
  `node tools/story/story.mjs where <fact>` for any fact they change.
- Old material outside `canon/` may be searched for ideas. It is never cited, and never edited to match.
- Look for conflicts with ink. Her newest words win over her older ones only when they plainly mean to replace them;
  otherwise ask. Claude's earlier wording always gives way to hers.

## 2. The decision record

- **Number:** the next free `Dnnn` in `canon/decisions/`, checked just before writing (other sessions add records too).
- `# Dnnn · YYYY-MM-DD · a title that says what was settled`, then an `asked:` line (what she was answering, or
  "nothing: she gave this unprompted").
- `## Ingram`: her words, quoted, **verbatim**: typos kept, nothing trimmed but whole unrelated paragraphs. If she
  corrected herself in the same turn, quote that too.
- `## Settled`: numbered, only what her words say, in plain sentences.
- `## Claude's readings, marked`: every reading of an unclear word, every link Claude made to existing canon, and what
  is **not decided and not invented** (names, places, timing).
- `## Changes`: one line per item: `add`, `change`, `cut`, `open`, `resolve`, `decide`, `accept`, `pencil`.

## 3. Facts, ideas and questions

- **A fact that only restates her words is ink:** `status: decided`, its source the new record, in the entity's
  `canon/world/<entity>.md` above the `## Pencil` line. Keep every detail; split rather than summarise.
- **What Claude reads into her words, adds or proposes is pencil:** `status: sketch · by: claude`, below `## Pencil`.
- **An idea she offers as an idea** ("we could…", "maybe", "fun idea"): a `## idea--slug` in `canon/ideas/<topic>.md`,
  `state: live`, not a fact.
- **Something she still has to decide:** an `open` fact with `candidates` and `decide-by`, in the file of what it is
  about. A missing name is `open` `<entity>.name`; while the Approvals Desk reads `data/campaign/open-questions.json`,
  add it there too, with the same id.
- **Keep the pencil small (D079, D080).** Before adding a pencil fact, read what the entity already holds: if one
  pencil fact already says part of it, extend that fact instead of writing a near-duplicate beside it, and write one fact
  per thing the table learns at one time (same `known`, same `told`). `node tools/story/merge.mjs` joins pieces of one
  thing later, so every piece you split off is work for it. Never reword or merge facts of hers (`by: ingram`) yourself.
- **Never** put a story fact in `CLAUDE.md`, memory, a design document, `ideas/entries/` or a code comment. A memory may
  point at canon.
- A new person, place, group or thing gets its own `canon/world/<id>.md` (`# Title`, `kind:`), never a paragraph in
  someone else's file.

## 4. Check and finish

- `node tools/story/story.mjs check` must show 0 errors; `node --test test/canon.test.mjs` must pass.
- If a canon scene changed, re-read it (`canon/reread.md`, `<scene>.reread.md`) and run `story build`.
- If anything under `data/` changed, run the tests and `npm run deploy` (Ingram: deploy at the end, don't ask).
- Offer to update the Casebook.
- **Report in her terms:** what she said in one line; what was filed where, one line per file; every reading she should
  check; what is still open.

## A brainstorm or a lore discussion

Nothing is kept as a transcript. At its end: each idea goes into `canon/ideas/` with a state (live, parked, adopted
with `became:`, rejected with `retire:`); whatever she decided goes into a decision record as above; and the report's
last line says where everything went.
