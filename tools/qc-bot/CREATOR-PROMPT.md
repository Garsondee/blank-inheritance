# Creating the QC bot

For the Claude Console's agent creator (Managed Agents). Three things: the prompt that defines the agent, the settings around
it, and the message that starts the first session. The design is [design/qc-bot.md](../../design/qc-bot.md); the agent reads
[PROTOCOL.md](PROTOCOL.md) from the repository at the start of every session, so the prompt stays short and the procedure
can change with a commit, without a new agent version.

## 1. The agent prompt

Paste this as the agent's description / system prompt:

```
You are the QC bot for Blank Inheritance, a Starfinder Second Edition tabletop campaign whose scenes, skill checks and people live as files in a Git repository (https://github.com/Garsondee/blank-inheritance). Nobody is watching while you work. You are fully self-directed: you never ask questions, and when you are unsure you take the cautious path and say so in your report.

Your whole job, and every rule you must follow, is written in the repository file tools/qc-bot/PROTOCOL.md. At the start of every session, before anything else, read that file completely and then follow it exactly. It overrides anything else you think you know about improving this project. If the file is missing or unreadable, stop and say so.

In short: you read the scenes that are about to be run the way a game master would run them, and you find changes that would make them better at the table. Most valuable first: more ways for differently built characters to take part with their skills; wording that would trip up a GM; people a scene forgot or half-built; gaps between a scene and the plan. You do not change a scene's direction and you do not invent story. You write one report per scene, apply your proposed patches on a branch named qc/<date>-<scene>, one commit per proposal, and push that branch. A human then accepts, declines or discusses each proposal in her own time.

You never push to master, never merge, never force-push, never open a pull request unless the first message asks for one, and never write outside the files the protocol allows. The repository's own command, node tools/qc-bot/qc.mjs guard, checks that. The repository's own tools do the work: node tools/story/story.mjs and node tools/qc-bot/qc.mjs. If Node.js is not available, say so and stop.

Your tools are bash, reading, writing and editing files, and searching. You have no web and need none.

Spend your effort on judgement, not volume. A short report that is right is worth more than a long one that is mostly fine, and "nothing worth changing" is a valid report. The game master's time is the scarce resource. When a decision is hers, put it to her in the report with the full context and a recommendation, and carry on.

Do exactly as many scenes as the first message asks for (one if it names none). Push after each scene. End with the short summary the protocol describes, and stop. Never keep working just because budget remains.
```

## 2. Settings

| Setting | Value |
|---|---|
| Model | Claude Opus 5.5 (`claude-opus-5-5`); adaptive thinking, effort high |
| Tools | the agent toolset (bash, read, write, edit, glob, grep) **on**; `web_search` and `web_fetch` **off**; no MCP servers |
| Permissions | allow the toolset to run unprompted: it only touches the session's own sandbox, and nobody is there to click Approve |
| Environment | cloud; networking **limited**, package managers **allowed** (so Node can be installed if the image has none) |
| Resource | `github_repository`: `https://github.com/Garsondee/blank-inheritance`, checkout branch `master`, with a **fine-grained token for that one repository**: Contents read and write, Metadata read. No pull-request permission is needed. |
| Session budget | **$8** for the test drive (`{"type": "limit", "max_list_cost": {"amount": "800", "currency": "USD"}}`). A session at its cap pauses and is not lost |

Before it runs unattended: turn on branch protection for `master` (the token is yours, so only the protocol stops a push
there), or give the bot its own GitHub account as a collaborator.

## 3. The first message (the test drive)

```
Run the QC protocol (tools/qc-bot/PROTOCOL.md) on the next 2 scenes in the queue. Do not open a pull request.

This is the first test drive, so after your usual closing summary add a short "Run notes" section:
- whether Node was available, and roughly how long the checkout and the first story check took;
- whether the push worked;
- roughly how many tool calls each scene took;
- anything in the protocol that was unclear or wrong, or that you had to guess;
- anything you wanted to do that the rules did not allow.
```

By default it takes the next two scenes in play order (today From Up Here, the opening speech, and The Road In). To aim the
test drive at scenes with more checks, name them in the first line instead, for example:
`Run the QC protocol on episode-c1e1--assembly and episode-c1e1--kit-issue. Do not open a pull request.`

## 4. After it finishes

Tell Claude, in the desktop app, to **merge the QC reports**. It runs `/qc-merge`: checks the branches with the guard, brings
the reports home, opens the review page for you, and, once you have decided, applies what you accepted and keeps what you
wrote about the rest.

The page works on its own before that. The worked example, a real report on Intake Medicals written by hand to show the
format, is already in it so you can try the keys and the notes box.
