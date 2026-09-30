# canon

The campaign's trusted material, rebuilt one scene at a time from Ingram's decisions. The design is
`design/story-data-refactor.md`; the decision that started it is `decisions/D047.md`.

## The rule

- **Everything in `canon/` is either decided by Ingram or plainly marked as waiting for her.**
- **Everything outside `canon/` is old.** It may be searched for ideas. It may never be cited. When something old is
  needed, it is rebuilt here, and it goes through Ingram's read like anything new.
- **Nothing in `world/`, `plan/`, `scenes/` or `challenges/` may point at old material.** The check enforces it.
  Decision records are history, and may.

## What lives here

- `decisions/`: one file per decision. D001 to D046 were split word for word from the old LEDGER on 2026-09-27, which
  is now frozen. New decisions start at D047 and have Ingram's words under `## Ingram` (quoted, verbatim), what they
  settle, and a `## Changes` list.
- `sources/`: material Ingram gave as a whole document rather than as an answer, such as S001, her First Impact
  dossier as first filed. A source record says where the original is and which parts of it still stand.
- `world/`: one file per person, place, group, thing or event. Each holds **facts**: single statements that are true
  now, each with a status, a source, who in the world knows it, and when the table is told it.
- `plan/`: each chapter's episodes and scenes in play order, with a rough day and time of day and each scene's state.
- `scenes/` and `challenges/`: scenes that have been through the re-read, in the same JSON shape Foundry reads.
  `node tools/story/story.mjs build` copies them into `data/`. **Edit the canon copy, never the `data/` one**: the check
  fails if they differ.
- `scenes/<id>.reread.md`: the record of each scene's re-read: every question, the answer, and what changed.
- `reread.md`: the questions every scene is re-read against. It grows whenever Ingram's reading finds something it
  should have caught.

## A fact

```
## founders.level
The four founders are level 15: impossibly powerful against a level-1 party.
status: decided · source: D047 · known: nobody · told: later
```

The heading is the fact's id: the file's own id, a dot, and a short slug. Then the text, one or two plain sentences,
present tense, no history. Then one line of details:

- **status**: `decided` (Ingram decided it), `accepted` (Claude proposed it and she approved), `proposal` (Claude's,
  waiting for her), `open` (a question: list `candidates` and `decide-by`), `provisional` (in a scene that hasn't
  passed her read yet), or `cut` (kept only so its wording can't come back: list it under `retire`).
- **source**: the decision (`D047`) or source record (`S001`) behind it or, for provisional facts and proposals, the
  canon scene it comes from. A fact keeps every detail of the words it comes from: split it into several facts rather
  than summarise.
- **known**: who in the world knows it: `everyone` (common knowledge in Kurose), `some`, `few` or `nobody`.
- **told**: when the table hears it: `start` (from Scene 0), `in:<scene id>`, or `later` (not scheduled yet). The two
  are separate because something everyone in Kurose knows can still be held back from the players (D048). A beat may
  only tell the table what is told by that scene.
- **held-by**, **true**, **truth**: for a belief rather than a fact, such as the city's view of the founders' painting.
  `true: no` or `true: partly` must link the truth.
- **when**: for events, roughly when.

`## Notes` in a world file is free text (how someone talks, how to play them). It isn't checked line by line.

## A scene's beats

Each beat lists `facts` (what it tells the table) and `gmFacts` (what its GM notes rely on). The check makes sure
every one exists, isn't cut, and, for `facts`, that the players may know it by this scene.

## How a scene is approved

1. Claude writes or edits the scene in `scenes/`, re-reads it against `reread.md`, records the re-read in
   `scenes/<id>.reread.md`, runs `story build` and `story check`, and marks it `awaiting-read` in the plan.
2. Ingram reads all of it, in the Casebook.
3. Her changes go into the scene. Anything the re-read should have caught goes into `reread.md`.
4. When she says it's good, a decision records her words and `approve <scene id> hash <hash>` (from
   `story digest <scene id>`), and the plan marks the scene `approved`. From then on, any change to the scene or its
   challenges shows up as needing her read again.

## Tools

```
node tools/story/story.mjs show <entity>     every fact about it, and where each is used
node tools/story/story.mjs where <fact>      every line that relies on one fact
node tools/story/story.mjs check             every rule (also run by test/canon.test.mjs)
node tools/story/story.mjs apply <Dnnn>      a decision's changes, checked, with every line they touch
node tools/story/story.mjs build             copy canon scenes and challenges into data/
node tools/story/story.mjs time              "yesterday", "this morning" etc. per scene, beside the plan's day and time
node tools/story/story.mjs digest <scene>    what a scene tells the table and relies on, with its hash
```
