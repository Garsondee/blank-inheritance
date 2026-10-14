---
description: Run the episode confidence check — the machine gate, LLM desk reviewers, a scripted walk of every scene in Foundry, agents playing three scenes, and a graded findings page
argument-hint: "[episode id] [--layers gate,desk,walk,table] [--scenes a,b,c] [--ab]"
---

# Episode confidence — `$ARGUMENTS`

The design is `design/playtest-process.md` §13. This file is the procedure. Defaults: episode
`episode-c1e1-mothers-maiden-name`, all four layers, table scenes `the-road-in`, `the-errand` and `flood-tunnel`.
`--ab` runs the desk read twice, on Opus and on Sonnet, over the same scenes (about 30 minutes and 0.5M tokens more).

The goal is two answers for Ingram: **is this episode good and bug-free**, and **is an LLM a useful co-author**. The second is
answered only by her grades, so every finding must be worth her time to grade.

## Run rules (they are why this is three hours, not six)

- **Never fix during the run.** A finding is filed and the run goes on. A blocker that stops every seat ends that layer; report it
  and go to the next layer. Fixes come after she grades.
- **One checkpoint message only**, after the desk read: time used so far, what the gate and desk found in one paragraph, and the
  re-quote for the rest. Then carry on without waiting, unless the re-quote is more than a third over.
- **Nothing is sealed or promoted.** Findings feed the Sign-Off; this never writes `live` or `authoring.status`.
- **Never edit a scene, challenge or NPC** during the run, and never Ingram's words.
- **The GPU.** Ingram games on this machine. If the preflight's GPU check fails, run the gate and desk layers and stop before the
  walk; say so.
- **Model per agent** (the Agent tool's `model`): scene and arc readers and the table GM on `opus`; the rules referee and the
  player agents on `sonnet`. Record it; the scorecard is per model.

## 0. Start (2 minutes)

```bash
npm run edits
```

Her Scene Runner edits come home first. Then make the run folder: `RUN=design/playtests/<today>-c1e1` (add `-2` and so on if it
exists). Note the start time; every layer's minutes go in `$RUN/costs.json` as `{ "<layer>": { "minutes": n, "tokens": n } }`.

## 1. Gate (5 minutes, no LLM)

```bash
node tools/episode-confidence/gate.mjs --episode <episode> --out $RUN
```

Read the printed summary. Its findings go to the reviewers so they do not re-find them.

## 2. Desk read (35–45 minutes, six agents in parallel, read-only)

Split the episode's scenes, in play order, into four groups of three. Launch these six `general-purpose` agents **in one message**,
each with its brief file's text as the prompt, placeholders filled:

| Agent | Brief | Model | Placeholders |
|---|---|---|---|
| scene-reader-1..4 | `tools/episode-confidence/briefs/scene-reader.md` | opus | `{{REVIEWER}}`, `{{MODEL}}`, `{{SCENES}}` (its three brief ids, one per line), `{{OUT}}` = `$RUN/desk/scene-reader-N.json`, `{{GATE}}` (the gate findings on its scenes, one line each, or "nothing") |
| arc-reader | `briefs/arc-reader.md` | opus | `{{MODEL}}`, `{{OUT}}` = `$RUN/desk/arc-reader.json` |
| rules-referee | `briefs/rules-referee.md` | sonnet | `{{MODEL}}`, `{{OUT}}` = `$RUN/desk/rules-referee.json` |

With `--ab`, launch the four scene readers a second time on `sonnet`, writing `scene-reader-N-sonnet.json`.

When all are back:

```bash
node tools/episode-confidence/collect.mjs merge --dir $RUN
```

A reviewer whose file is missing or fails the schema is reported as a rig fault, not retried. Check each reviewer kept its brief:
list the files it opened (`grep -o '"file_path":"[^"]*"'` on its transcript, `subagents/agent-<id>.jsonl`). A reviewer that opened a
scene's `.reread.md`, `reviews/` or `design/playtests/` has its findings struck (`pt audit` is for player seats, not reviewers).
**Send the checkpoint message now.**

## 3. Scripted walk (20–30 minutes, no LLM)

Skip with `--layers` or if the GPU is busy.

```bash
node tools/playtest/pt.mjs world restore provisioned
node tools/playtest/pt.mjs build --no-art
```

Start the `foundry-playtest` and `playtest-hub` previews (preview_start), then:

```bash
node tools/playtest/pt.mjs preflight
node tools/playtest/pt.mjs run start walk --name <run>-walk
node tools/playtest/pt.mjs walk --episode <episode>
```

Poll `pt walk status` no more often than every five minutes (use Monitor or a background until-loop, never foreground sleep).
When it says Done: `pt coverage`, `pt probe convergence`, `pt run stop`.

## 4. Table run (75–90 minutes, agents)

```bash
node tools/playtest/pt.mjs world restore provisioned
node tools/playtest/pt.mjs run start main --name <run>-table
```

The table is a GM agent (opus) and two player agents, P2 the brute and P6 the chaos agent (sonnet); the other seats are bots
(`pt bots`). For each of the three scenes, in play order:

1. Put the table in the scene: `pt eval GM` with `import("/modules/blank-inheritance/scripts/foundry/admin-actions.mjs").then(m => m.lendTestParty().then(() => m.jumpToScene("<episode>", "<brief id>")))`.
2. `pt predict <scene> "..."`: what you expect to go wrong, before it is played.
3. Brief and launch the GM and the two players (`pt brief GM --stretch "<scene>" --out ...`, the same for P2 and P6), with
   the turn card: play this one scene naturally to its end; at most two probes (reload, double press, odd input) per seat.
4. **Caps:** 25 minutes per scene, 40 for the fight. Stop a scene early after 10 minutes with nothing new above S3.
5. Afterwards: `pt audit` on each agent's transcript (`~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl`).
   A finding from an agent that broke its brief is struck.

After the first scene, re-quote. If the pace is more than a third over, stop the table run and say so.

Then `pt run stop`, `pt world restore provisioned`, and stop both previews.

## 5. Synthesis (about 30 minutes)

```bash
node tools/episode-confidence/collect.mjs merge --dir $RUN --rig-run <run>-walk --rig-run <run>-table
node tools/episode-confidence/collect.mjs page --dir $RUN
```

Publish `$RUN/grading.html` as a new Artifact: `capabilities: { db: {}, user: {} }`, icon `checklist`, one-line description.
Then do one `ArtifactData` `list` of the `grades` collection (it should be empty) to prove the store answers.

Write `$RUN/report.md`, in this order:
1. **A verdict per scene**: ready / close / not-ready, from the desk verdicts and what the walk and the table saw.
2. **The top findings**: at most ten, most severe first, each with its id on the grading page.
3. **Proposed fixes**: obvious ones (to apply once she has graded them) apart from questions (meaning, reveal timing, tone,
   character), which are hers.
4. **What was not covered**: scenes not played by minds, options not taken, layers skipped and why.
5. **Cost**: minutes and tokens per layer.

Reply with the page link, the report path and the per-scene verdicts in five lines or fewer.

## 6. After she grades

When she says she has graded:
1. `ArtifactData` `list` of `grades` into `$RUN/grades.json` as `{ "<finding id>": "<grade>" }`.
2. Run:

   ```bash
   node tools/episode-confidence/collect.mjs score --dir $RUN --grades $RUN/grades.json --costs $RUN/costs.json
   ```

   This appends the scorecard to `design/playtests/copilot-scorecard.md`.
3. Then fix what she graded useful, scene by scene, through the normal rules (canon first, `story build`, the re-read, tests,
   `npm run deploy`).
