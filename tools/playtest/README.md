# The playtest rig

A table of real browsers, each logged in as its own Foundry user, played by agents and scripts, watched by instruments, run from one control room. It plays the Induction terminal and Episode One in a local, throwaway copy of the deployed game and reports what broke, what confused, and where the material left someone stranded. The process, and why it is shaped this way, is [design/playtest-process.md](../../design/playtest-process.md). This is the manual.

Ingram's decisions, 2026-10-06: the Service Agreement page is **on** (it is a gag, but the page must be exercised for real); the local copy is **fully** current, media included; a **control room**; dice tooling and anything else that helps; and "we don't need an agent for every player and for every scene", so the brain behind a seat is a choice (below).

## What is where

| Thing | Where | Notes |
|---|---|---|
| The playtest Foundry | `foundry-data/` (gitignored) | its own data root, port **30100**, world `blank-inheritance-playtest`. A deploy of the working tree (the repo's own `runDeploy`, aimed at a folder), a copy of the system, the audio and the opening videos. |
| The hub | `hub.mjs` + `hub/`, port **30177** | owns the browser, the seats, the bots and the run's memory. Started from the app's `playtest-hub` preview, which opens the control room. |
| The control room | `control-room/index.html` | seats with live pictures, the table, findings, events, coverage, dice, and the operator's controls (pause, say, file a finding, run the detectors). |
| A run | `runs/<name>/` (gitignored) | `table.jsonl`, `findings.jsonl`, `actions.jsonl`, `improv.jsonl`, `dice.jsonl`, `coverage.json`, `predictions.md`, `seats/<id>/{telemetry.jsonl,memory.md,evidence/}`. |
| World snapshots | `snapshots/` (gitignored) | `provisioned` is the clean start: modules on, content built, six players, no characters, agreement on. |
| The cast | `personas/` | `personas.json`, one brief per persona, the table's rules (`_rules.md`, `_rules-gm.md`). |
| Agent definitions | `../../.claude/agents/playtest-{player,gm,scribe}.md` | the narrowest tool lists the harness allows. |
| Seeded defects | `defects/defects.json` | four known bugs planted in the playtest copy for the shakedown. |

## The brain behind a seat

A **seat** is always a real browser as a real user, so the table is full-sized and the multi-client behaviour is real. What differs is the **brain**: `agent` (an LLM driving the seat through the `pt` verbs: judgement, confusion, improvisation; the expensive part), `bot` (a script driving the same real controls: routine, no judgement, no cost) or `idle`; the GM seat alone can also be a `walker` (`bots/gm-walker.mjs`: a script that runs a whole episode through the Scene Runner). `pt run roster <kind>` previews a table: `main` (recommended: agents for the GM, P2 and P6, bots for the rest; keyboard-only play went out of scope on 2026-10-06), `shakedown`, `full` (an agent in every seat), `bots` (none), `walk` (the walker and six player bots). The episode confidence run, `/episode-confidence` (design/playtest-process.md §13), uses `walk` and `main`.

## Start to finish

```
node tools/playtest/pt.mjs init                      # once: test files, data root, world manifest, git baseline
node tools/playtest/pt.mjs build [--repo-staging]    # the playtest copy, verified against this working tree (about 10 minutes the first time: art staging)
# the app's previews: foundry-playtest, then playtest-hub
node tools/playtest/pt.mjs world provision           # first time only: modules on, content built, six players, agreement on
node tools/playtest/pt.mjs world snapshot provisioned   # with Foundry stopped
node tools/playtest/pt.mjs preflight                 # everything that must be true; exit 1 on a FAIL
node tools/playtest/pt.mjs run start main --name <run>
node tools/playtest/pt.mjs bots                      # start the scripted seats
node tools/playtest/pt.mjs walk [--episode <id>] [--scenes a,b]   # in a `walk` run: the scripted GM walks the episode; `pt walk status` for progress, walk.json when done
node tools/playtest/pt.mjs brief P2 --stretch "Induction"   # an agent's brief: pass it as the agent's whole prompt
```

During a run (the operator's commands; no seat can use them):

| | |
|---|---|
| `status`, `findings [--severity S1] [--kind bug]`, `findings show F-0012`, `findings add "..." --kind ... --severity ...`, `findings lock F-0012 "a check in ..."`, `findings reclassify F-0010 --kind rig --reason "why"` (an instrument that cried wolf is corrected on the record, never deleted) | the board and the log |
| `table system "Scene 2 begins."`, `pause "reason"`, `resume`, `predict <scene> "what I expect to go wrong"` | the table (write the prediction BEFORE the scene) |
| `detect [seat]`, `probe convergence`, `probe leak`, `probe characters --landing "<scene>"`, `probe reload <seat>`, `probe peek <seat>`, `coverage`, `shots --label scene-3` | the instruments |
| `dice arm <seat> --degree <crit-fail\|fail\|success\|crit-success> [--dc N] [--natural N] [--count N]`, `dice arm --all-players ...`, `dice seed <seed\|off>`, `dice tape`, `dice status`, `dice clear` | the dice |
| `eval <seat> "<js>"` | the one door into the game's internals; logged |
| `run stop`, `report [--run name]`, `audit --transcript <file> --seat P2`, `cleanup` | the end |

## The dice

Every seat's `CONFIG.Dice.randomUniform` draws from a generator seeded by `"<seed>:<seat>"`, so a run replays. `dice arm` makes **that seat's next d20 on a roll** a chosen degree against the open check's DC (or against `--dc`), or an exact `--natural`: the face is chosen by sf2e's own degree rule (natural 20 and 1 move a step; asserted by `test/playtest/dice.test.mjs`) and avoids a 1 or 20 unless asked (`--prefer extreme`). A roll the oracle cannot serve (no DC, a roll with other dice in it, a degree out of reach) is left natural and the plan stays armed. **Every roll is on the tape with whether it was forced**; the coverage ledger counts forced degrees as seen and as forced.

## What an agent gets

A text view of its screen (`look`: windows, what they say, every control with a ref and its state), pictures only when it asks (`shot`), real clicks, typing and keys, the table (`say`, `do`, `read`), its own notes (`memory`), and `note` for a problem or a pleasure (a screenshot and its last actions are attached for it). It has no way to read the game's data, run code in the page or open a file. `tools/playtest/personas/_rules.md` is what it is told. The GM also has `read-aloud` (post the Runner's open beat's text verbatim) and `improv` (log what it had to invent: the strongest signal about the material).

## The instruments (no agent needed)

Telemetry per seat (console, page errors, failed requests, Foundry notices, socket drops, long tasks, windows opened, dead clicks), each event tied to the action before it; detectors (invisible click-swallowers, covered controls, off-screen and tiny controls, clipped text, unnamed controls); convergence (do all seats agree on the clock, the Runner, the open check, the scene?); reload invariance; the leak scan (the scenes' own `Secret:` lines against every player's visible page and documents); the chargen oracle (each made character's sheet against `tools/character-builder/derive.mjs`, and who owns what); coverage (every beat, check degree, choice option and handout against what the run did).

## Rules the rig keeps

- The playtest copy is **a deploy**: what a deploy would put on the live server, verified by hash on both sides, from this working tree. It is never the working tree itself, and nothing is ever sent to the live server.
- Seats act with **real input events**, never by calling a handler.
- A seat knows only its screen and its table. The table (`core/table.mjs`) never hands a player a GM-private entry or a whisper they are not part of (a canary test holds it).
- Every finding needs evidence; known noise is shown, never hidden; a fault in the rig is `kind: rig`, never counted as the game's.
- Forced dice are always marked as forced.

## Permissions

Agents run `node tools/playtest/pt.mjs ...` through the Bash tool. Unless that command is pre-approved, seven background agents stall on permission prompts. The rule is in `.claude/settings.json` (Ingram gave it, 2026-10-06; `pt preflight` warns if it goes missing):

```json
{ "permissions": { "allow": ["Bash(node tools/playtest/pt.mjs:*)", "Read(tools/playtest/runs/**)"] } }
```

**The agent definitions** (`.claude/agents/playtest-{player,gm,scribe}.md`) are read when a Claude Code session starts. In a session that began before they were written the harness does not know them ("Agent type 'playtest-player' not found"), so there the agents are `general-purpose` ones whose whole prompt is the brief (`pt brief <seat> --stretch "..." --out tools/playtest/runs/<run>/seats/<seat>/brief.md`, then "read your brief there and follow it"). They then have every tool rather than Bash and Read, so the rules are kept by the brief and checked after the run by `pt audit` against the agent's transcript.

## Tests

`node test/support/run-tests.mjs test/playtest` (about 15 seconds; the browser tests skip, loudly, where Chrome is missing). The chargen specs, the seeded defects and the persona files are held against the real catalogues, the real module and the real scenes, so they fail when those move.
