# The QC bot

*Designed and built 2026-10-14, from Ingram's briefs the same day. A scheduled agent in the cloud that reads the scenes about
to be run, finds ways to make them better without changing their direction, notices what was missed when they were written,
and hands everything to Ingram as proposals she accepts, declines or discusses. Nothing it proposes changes a scene until she
has decided and Claude has merged it with her.*

Where things live: the bot's own briefing is [tools/qc-bot/PROTOCOL.md](../tools/qc-bot/PROTOCOL.md); the prompt that
creates it is [tools/qc-bot/CREATOR-PROMPT.md](../tools/qc-bot/CREATOR-PROMPT.md); its tools are `tools/qc-bot/` (one command,
`node tools/qc-bot/qc.mjs`); its reports and her decisions are [reviews/qc/](../reviews/qc/README.md); the tests are
`test/qc-bot/`; the local routine for merging with her is `/qc-merge`.

## 1. What she asked for, in her words

Quoted because each sentence decided something.

> "I'd like to make an agent which works automatically to keep improving this project but sticking to things that it can do
> entirely remotely and entirely self directed. Ideally it would focus on making sure the prose for scenes was good, that the
> scenes had good skill roll options and plenty of them."

> "The goal here would be to produce a quality control bot who reads scenes critically, looks for ways to improve them, does
> chores and housekeeping work, improves the quality of options of a scene without trying to change the direction of it and
> with the NPC generation it would also do work that might have been missed when creating the scene originally."

> "A note on 'Inked' scenes, it should be allowed to read those too and suggest improvements because even an inked scene could
> probably be made better. Once we begin the actual adventure we'd need to make sure it stops bothering to edit scenes which
> have been completed because that would waste time."

> "Ideally this bot would suggest what it would do first, producing an easy to read report which focuses on giving me a solid
> understanding of how the scene works and how it would change it to improve it so that I can get a clear changelog of what
> the LLM is proposing. The language used by it should be aimed more as a casual discussion where the priority is making sure
> that I'm given the full context for decisions alongside the actual decision, making it easier for me to understand the
> reasoning and impact of it's decisions."

> "Can we get it to apply it's changes to the online repo and then we work through merging intelligently together? Ideally I'd
> love to be able to have an interface to accept, decline or discuss changes. That's a good way for me to flag the things I
> like and don't like and explain why."

> "The played label is something we should plan for and I will tell you very very clearly when we are at T- one week to the
> actual session. ... The 'Scene Close' button is perfect but for now we should be treating Scene Close as just a testing
> process because it's likely over a month before we'll be running this."

> "I will use Opus, the bot should focus on the scenes which are about to be run rather than worrying about much later
> scenes."

The budget is $100 a month of API credit. Her standing rule on agents (2026-10-07) is one at a time, with results made
durable as they arrive; the bot is one agent, one scene at a time, pushing after each.

## 2. How it works

```
 the bot, in the cloud                      Claude, here, with Ingram
 ─────────────────────                      ─────────────────────────
 qc queue  ─► the scenes about to be run
 reads the scene, its checks, its plan row, her decisions
 writes ONE report per scene (JSON)
 qc apply --commit-each  ─► a branch qc/<date>-<scene>: one commit per proposal
 pushes the branch                      ──►  /qc-merge
                                              guard the branch, without checking it out
                                              bring the REPORT files home (never the patches)
                                              qc page  ─► the inbox (a private Artifact)
                                                         Ingram: Accept / Decline / Discuss, and why
                                              qc decisions import  ─► reviews/qc/decisions/
                                              qc apply --accepted  ─► the accepted patches, onto the files as they are NOW,
                                                         a clash reported and never overwritten
                                              a Revision entry in the scene's re-read record; tests; commit
 reads her decisions next run  ◄─────────── her reasons, in her own words
```

Three choices in it are deliberate:

- **The bot applies its changes on a branch in the online repo, and merging is by decision, not by git.** The bot's commits
  are a readable record (one per proposal, named for it). What is merged is each accepted proposal's patch, applied to the
  current files with the words it expected to find checked first (`tools/qc-bot/patch.mjs`, built on the same merge as her
  Scene Runner edits). A cloud copy cannot see Scene Runner edits she has not brought home, so git alone could silently revert
  her words; the patch check cannot.
- **A bot branch is never checked out in the working tree.** The auto-sync watcher deploys anything that changes there, so an
  unapproved change would reach the live server within seconds. `qc guard --head origin/qc/...` and a path-only checkout
  of the report files do the work without it.
- **Her reasons are the most valuable thing the bot receives.** Each decision keeps her note word for word. The bot reads
  every one before proposing anything and may not raise a declined proposal again.

## 3. What the bot may and may not do

**The direction lock** (`tools/qc-bot/anchors.mjs`). Improving options is not changing direction. A scene's direction is its
goal and `howToPlay`, which beats exist and in what order, which are mandatory and what each cites, who is in the room and
in what role, what the players are told and what is held back, how it ends and where it leads. A script compares the scene
before and after every patch and refuses one that moves any of it. A check's difficulty, flags and ids are locked too, and
routes may only be added to. What stays free: read-aloud and GM wording, a check's routes and per-skill lines, results,
twists, reaction prompts, a cast member's brief, handout wording, notes. Results and read-aloud carry meaning that no script
can verify, so a proposal that touches them says so (`touchesMeaning`) and she decides.

**The write surface** (`tools/qc-bot/lib.mjs`, checked by `qc guard`). Its own reports; the scene and check files in
`canon/` (changes only, never a new scene) and their built copies in `data/`; new people in `data/npcs/` (new files only);
the NPC roster; the files `story build` generates. Nothing else: not canon facts, plan rows, decisions, re-read records,
the module, the tools, the tests.

**Lanes, by what a scene is:**

| Scene | What the bot does |
|---|---|
| `awaiting-read` (rebuilt in canon, waiting for her read) | reviews it and proposes; nothing merges without her |
| `approved` (inked) | reviews it and proposes; every patch says plainly that accepting it reopens the approval |
| `old-draft`, `unwritten`, or outside the focus | not reviewed. Unwritten scenes in the focus are listed, never written |
| a field she edited in the Scene Runner | never patched; a question at most (`data/campaign/scene-edits.json`) |
| a scene whose report is waiting on her | not reviewed again until she decides |
| a scene reviewed twice with nothing accepted | quiet until the file changes |
| **played** | **planned, not built** (section 8) |

The focus is `reviews/qc/focus.json`: Episode One now. Move it by editing the file.

**What it looks for**, most valuable first (the full list is in the protocol): more ways in for differently built characters
(routes), the questions of `canon/reread.md` a scene fails with evidence, people (uncast speakers, a person with no file,
what each says freely and on a check), seams with the plan and the neighbouring scenes, and chores. It proposes at most five
changes to what is played, and eight things in all, per scene.

## 4. The tools (`node tools/qc-bot/qc.mjs ...`)

| Command | Who | What it does |
|---|---|---|
| `queue [--limit N] [--all] [--json]` | the bot | the scenes about to be run, in play order, and why the others are left alone |
| `npcs <scene>` | the bot | each person cast: file, stat block, roster, portrait |
| `lint <report> [--write]` | the bot | checks a report before it is pushed; `--write` fills the scene hash and fingerprints |
| `apply <report> --all --commit-each` | the bot | applies every patch on a `qc/` branch, rebuilds, runs the story check, one commit per proposal, and rolls back one that makes the check worse |
| `render <report>` | the bot | the Markdown copy |
| `guard [--base] [--head]` | both | did the branch change only what the bot may change? |
| `page [--out]` | Claude | builds the review page |
| `decide <proposal> accept\|decline\|discuss [--note] [--choice]` | Claude | records a decision given in chat; a question is accepted by choosing one of its options |
| `decisions import <file>` | Claude | takes in what the review page collected |
| `apply <report> --accepted [--reread]` | Claude | applies what she accepted, onto the current files, and adds a Revision to the re-read record |
| `status` | Claude | what is waiting on her, to discuss, to apply, and ready for the bot |

A report is checked against: the five-and-eight limits; every field that gives her the context for a decision; each patch
applying cleanly and on its own; no two proposals editing the same part; the direction lock; the write surface; a declined
proposal not being raised again (unless it says how it differs); a change to an approved scene saying it reopens the
approval; and `data/` copies never being patched directly.

## 5. The inbox (the review page)

`qc page` builds `reviews/qc/inbox.html`: every report, how the scene works, and each proposal as a card with what is there
now, the change, why, what else it touches, the risk, what the bot would do, the exact words that change (additions and cuts
marked), the decision it needs, three keys and a box for why. A question shows its options as the keys. Filters: waiting for
me, to discuss, accepted, declined, per scene. It is published as a private Artifact with the shared-store capability, so a
decision is saved the moment it is pressed and Claude reads it back with the artifact data tool; where the store is not
there the page keeps decisions in the browser and offers **Copy decisions**. The page's address is recorded in
`reviews/qc/published.json` so it is updated in place, not republished under a new link.

## 6. Cost, and the test drive

Estimates, not measurements: a scene-sized report on Opus 5.5 ($4 and $20 per million tokens in and out) costs about $1 to
$2.50 including the read, the thinking and the tool turns, and one read of every scene is about $1. A pass over Episode One's
twelve scenes is $15 to $30, which leaves room in $100. Every session reports its own list cost, so the first run measures
it. The test drive runs two scenes with a hard cap on the session (Managed Agents lets a session carry a dollar budget; a
session at its cap pauses, it is not lost).

What the first run proves, in order: the repository mounts and Node is there; `story check` runs; the queue answers; the bot
can write, lint, apply, commit and push a branch; the report is in the voice she wants; the page and the merge routine take
it from there. The bot is asked to say at the end what in the protocol was unclear or wrong.

## 7. Setting it up (once)

1. **GitHub.** A fine-grained personal access token for `Garsondee/blank-inheritance` only, with Contents: read and write
   (and Metadata: read). Branch protection on `master` is advised before the bot runs unattended: the token is hers, so
   nothing but the protocol stops a push to `master`. For unattended use, a separate GitHub account for the bot is better.
2. **Console.** Create the agent from `tools/qc-bot/CREATOR-PROMPT.md` (Opus 5.5, the file tools and bash, web tools off, no
   MCP servers). Create a cloud environment with limited networking and package managers allowed (so Node can be installed
   if the image lacks it). Start a session with the repository as a resource (branch `master`, her token) and a dollar budget.
3. **First message:** the one in the creator file.

Nothing in the repository is secret, and no credential belongs in a report, a decision or a memory store.

## 8. The played label (planned, not built)

Today nothing has been run at the table. Ingram will say very clearly when the first session is one week away, and tells
Claude how it went afterwards. Until then **Scene Close is a test**: the bot ignores every Scene Close record, and no scene is
"done". When she says the week has come:

- A scene gets a **played** state with a date, separate from the plan's review states (`awaiting-read`, `approved`,
  `old-draft`, `unwritten`) and from `authoring.status` (`drafted`, `live`, `cut`), which say nothing about whether a scene has
  been run. The likely source is the Scene Close dialogue, which already records a verdict and notes in the session log
  (`harvest/sessions/`), with a hand override on the timeline. The exact shape is decided then, with her.
- The queue (`tools/qc-bot/queue.mjs`) skips a played scene in code, not in the bot's prompt, so a slip cannot make it touch
  history. That is the one place the rule is added.
- A haunt is a place the group returns to, so it has visits, not a played state, and is never frozen as a whole.
- After play begins the bot's job shifts toward continuity: reading what actually happened and checking that the scenes still
  to come fit it.

## 9. What is not built, and the limits

- The bot has not run. The repository's size (about 580 MB tracked, 3 MB of it canon; most of the rest is a 117 MB LFS
  GeoPackage and about 300 MB of map-layer images under `tools/city-map/export/`, none of which the bot needs) may make the
  mount slow. The first run's notes say how long it took; a slim copy of `canon/` and the story tools is the fallback.
- A cloud copy has no rules library (`reference/` is not in git) and no web. Rules claims rest on the model's knowledge and
  are marked with a confidence.
- Plan rows and canon facts are outside the write surface, so a seam between the plan and a scene is raised as a question.
  Keeping the timeline's notes in step with scenes is therefore done by Claude when she decides.
- Publishing the timeline page to claude.ai needs the artifact tool, which a cloud agent does not have; that stays a local
  chore.
- Ideas for later, in order of value: a weekly plain-language digest of story health (the told-but-unused facts, the questions
  with fewer than three roads); a read of every scene at once for repetition and drifting voices (about $1); a sweep of plan
  and canon notes for sentences that sound meaningful and say nothing; a portrait list ranked by when the table meets each
  person; the haunts and the Magic Show; turning a finding that repeats into an automatic check.

## 10. Tests

`test/qc-bot/` (run with `node --test "test/qc-bot/*.test.mjs"`, and part of `npm test`): the patch engine; the direction lock;
the report checks; decisions; applying, the commit-per-proposal, the branch guard and the Markdown; the queue; the page; and,
against the real repo, that every report and decision on disk is well-formed, every canon file round-trips byte for byte, and
this document, the protocol and the creator prompt agree with the tool.
