# The Table Playtest

*Written 2026-10-06 at Ingram's request. Status (2026-10-07): **the rig is built; agents have played the Induction (runs `shakedown-1`, `main-1`); the episode confidence run (§13) replaces the plan to play all of Episode One with agents.** Sections 1 to 11 are the proposal as written that morning, kept because they hold the reasons. Section 12 is what was built after her answers. **Section 13 is the current process: read it first.** The manual for the rig is `tools/playtest/README.md`; the trigger is `/episode-confidence`.*

Ingram, 2026-10-06: *"a playtesting run of the Induction and Episode 1 content. Induction requires each agent to create their PC. Then you have an agent per player and an agent who GMs. The goal is simple, first and foremost it's to see if everything works in terms of UI / UX debugging. Secondarily but just as important would be to uncover weaknesses or gaps in the material. Then you bring everything together at the end into a report."*

## 1. What it is, and where it sits

Six player agents and one GM agent, each at its own browser seat in a real local Foundry, make six characters at the induction terminal and then play Episode One's twelve scenes and the night's rest, while scripts measure everything a script can measure. At the end one report says what broke, what confused, and where the material left someone stranded.

**Two goals, in her order.** (1) Does every surface work, and read clearly, in the hands of someone who was never shown how? (2) Where does the material strand a player, or make the GM invent?

**What it is not.** It is not a Sign-Off pass and grades nothing. Nothing here marks a scene `live` or approved, and no finding edits `data/`, `canon/` or a scene of hers (`design/scene-signoff.md`, `design/scene-edits.md`). It produces evidence those passes can use.

**Where it sits.**
- `design/scene-simulation-testing.md` (2026-09-09) ran one mind playing all seven roles on paper, with a cross-check against the live panel. It found four of five predicted content gaps and no UI bug. Its two weaknesses are what this fixes: one mind leaks what it knows from role to role, and a mind that never touches the interface cannot be confused by it. This keeps that document's personas, its predictions-first rule, its curveballs and its split of "table feel" from "UI/UX".
- The headless-Chrome checks under `tools/` (about thirty files, the `live-check.mjs` family) assert claims we already know to make. This is for the claims nobody knows to make. In `design/testing-strategy.md` terms it is a layer above Tier 5. That document's §5 still says "no browser-automation tests", which the live checks have overtaken; it is not edited here.
- It is the "run the scene in the local Foundry through a success, a failure, a refusal and a split" step of the scene-quality ratchet, done for every scene at once.

**Words.** A **run** is one execution of this process. It stands in for Sessions (real evenings) and is not one. Chapter, Episode and Session keep the meanings in `CLAUDE.md`.

## 2. Principles

1. **Two instruments, one findings log.** Scripts measure what can be measured (errors, overlap, sync, state). Agents experience what cannot (confusion, wording, "where do I press"). Never ask an agent to notice what a script can count; never expect a script to notice confusion.
2. **Separate minds.** An agent knows only what its person would: the persona, its own screen, what is said at the table. Nothing passes between seats except through the table.
3. **Predictions first.** Before each scene is played the orchestrator writes down what it expects to go wrong and which curveball goes in (`scene-simulation-testing.md` §5; battle-simulator `DESIGN-LOG.md` §17). If every prediction comes true the run taught nothing; the wrong ones are the result.
4. **Players play; the observer files.** Two channels: the table (in the fiction) and `note` (out of it, instant, never shown to the table). No agent fixes anything, or proposes a fix, mid-play.
5. **Don't stop at the first bug.** A bypass ladder (§7) keeps a blocked run moving, and every rung climbed is its own finding.
6. **Plant bugs to calibrate.** A shakedown seeds known defects into the frozen copy. If the rig does not find them, its silence on the real run means nothing.
7. **A frozen copy, in a world of its own.** Never the working tree, never the live server, never the world another session is using.
8. **Every finding ends in a lock**: an automated check, else a feature, else a sharper re-read question, else a memory note (the ratchet's rule). A finding with no lock is not closed.

## 3. The cast

| Seat | Foundry user | Agent | Job |
|---|---|---|---|
| GM | `Gamemaster` (her real window size, 2560 x 1271) | GM agent | Runs the Scene Runner, decks, check pills, handouts, The City. Speaks the narration. Improvises when the material gives nothing, and logs each improvisation. |
| P1 to P6 | `PT Player 1` to `PT Player 6` | six player agents | Each makes a character at Induction, then plays it. |
| none | none | **Scribe** | Never plays. Reads each scene's evidence next to the authored brief and files what nobody at the table noticed: *authored versus delivered* (the read-aloud the GM posted against the brief's `readAloud`, beats ticked against mandatory, the DC offered against the DC written, handouts given against handouts authored). |
| none | none | **Orchestrator** (Claude, this session) | Runs the rounds, holds the predictions, injects curveballs and stressors, triages blockers, owns the world. The only seat with `eval`. |
| none | none | **Auditors** (after the run) | Contamination audit, coverage, clustering, the material cross-check (§8). Read everything. |

**Personas.** Behaviour comes from the fixed roster in `scene-simulation-testing.md` §3 so results stay comparable. Each also gets an experience level and a device profile, because the first goal is UI coverage. Characters are **test fixtures, never proposals**: invented by the agent, named with a `PT-` prefix, deleted afterwards, and never written to `data/characters/` (the six real kids are the players' own, `CLAUDE.md`).

| Seat | Behaviour | Experience | Screen and input | Chargen seed | Surfaces it must work hardest |
|---|---|---|---|---|---|
| P1 | CASTER | PF2e veteran, help toggle off | 1920 x 1080, mouse | a terrestrial ancestry, a martial class: the plain path | Review's Change links; the Notebook (typing together); Journal; the objectives form |
| P2 | BRUTE | never played, help on | 1366 x 768 (near Foundry's 1024 x 768 floor) | a non-terrestrial ancestry: trips the lockdown | the lockdown and its reassurance; "Continue shows what's missing"; The City; the check window |
| P3 | RULES-LAWYER | veteran | 2560 x 1271 at 125% browser zoom | Witchwarper (the one real key-ability choice) | the check console's DC knob and difficulty bands; the deck's skill keys; finishing the sheet |
| P4 | LATERAL THINKER | veteran | keyboard only (Tab, Enter, Escape, N / J / O) | the rare background that grants a feat through a rule element (Escaped Experiment), or one whose skill grant is a prose choice (Starship Dweller) | keyboard reach and focus; shortcuts; Escape; the Director's Palette |
| P5 | QUIET ONE | never played, reads everything slowly | reduced motion on; 150 ms latency, 5 Mbit/s (a remote player) | every optional field left blank, no portrait | the reduced-motion opening; reconnect; the saved draft (reload mid-form); Papers |
| P6 | CHAOS AGENT | any | 1920 x 1080 | a very long name with emoji; a real portrait upload as a plain Player (A-7) | Page 6's upload and crop; double clicks; browser Back; closing windows mid-action; chalk |

The GM agent is competent, prepared and honest about gaps. It sees what the module gives a GM (the Runner, the console and palette, NPC cards, the intake whispers) and nothing from `design/`, `canon/` or the Casebook; a GM who has to leave Foundry to find something has found a gap. A second run can swap in a GM who never saw the module.

## 4. The rig

*As proposed. As built, with the real paths, is §12.2; where it differs is §12.3.*

**Why not the browser tools I already have.** The built-in browser pane and Claude in Chrome each give one browser profile, and Foundry's login is a cookie, so one profile is one user at a time. Computer use is one mouse. Each seat needs its own browser context, as the live checks already give each player (`browser.createBrowserContext()`).

**Reused (exists):**
- Chrome and `puppeteer-core` 22 (installed in `module/stagecraft`); the `join()` and `click()` idioms in `tools/check-console/live-check.mjs`.
- `tools/stagecraft/launch-world.mjs` and the `foundry-local` launch config.
- `tools/overlay-check/world-guard.mjs` (stop when another session moves the world) and `click-through.mjs` (the invisible-box sweep), run by the detectors.
- The Admin panel: snapshot, reset, undo, lend and take back a test party, jump to a scene, set the clock, State JSON, autopilot (`design/admin-panel.md`).
- `tools/character-builder/derive.mjs` as the oracle for each made character's numbers; `core/rest.mjs` as the oracle for a night's rest.
- The cleanup rules learned the hard way (memory `foundry-test-cleanup`): ids written to a file, my own documents selected positively.

**New (every piece ships with its test in the same commit):**

| Piece | What it is |
|---|---|
| **Seat daemon and CLI** (`tools/playtest/seat.mjs`) | One long-lived process per seat holds the browser context, logged in as that seat's user, and a thin command-line client talks to it, so an agent drives it from Bash. Verbs: `look` (visible windows, each control with a short ref, its label, value and state, toasts, and the stage's cards if it exposes them), `shot`, `click`, `type`, `key`, `scroll`, `drag`, `upload`, `wait`, `reload`; table verbs `say`, `do`, `whisper`, `read`; `note` (file a finding), `memory`; GM only: `read-aloud` (post the Runner's current line verbatim), `improv` (what I had to invent, and what the material lacked). **No `eval` on any seat**: an agent has the screen a person has. Pinned to `localhost:30000`; no navigation anywhere else. |
| **Telemetry** (always on, per seat) | Console errors and warnings, page errors, unhandled rejections, failed requests (the known-missing media shown, not hidden), Foundry notifications, socket drops, long tasks and frame times, heap over time, which windows were opened (application ids, so surface coverage is measured, not self-reported), every action with what it hit, and **dead clicks** (an action followed by no change in the page or the world). Each event is stamped against the last action: "this error came 120 ms after P3 pressed Continue on Page 5". |
| **Detectors** (scene boundaries, and after any window opens or closes) | The invisible-box click sweep; occlusion (what is really at the centre of each visible control); controls off-screen, clipped or smaller than 24 px; horizontal page scroll; text cut off in its box; a Tab walk; **convergence** (the GM's and every player's view of shared state: check lights, the clock, objectives, who is on stage); **reload invariance** (reload a seat, compare); **leak scan** (strings from GM-only fields such as `gmFacts` against each player's page and client-side documents, with GitHub #212's known exposure as the baseline). |
| **Table channel** (`table.jsonl`) | The voice of the table. Entries are public, a whisper to named seats, or GM-private. A player's `read` can never return a GM-private entry; a canary test guards that. |
| **Findings log and validator** | `findings.jsonl`, schema in §7, rejects a finding with no evidence. |
| **Coverage ledger** | Every authored beat, check by degree, choice point by option, handout and NPC topic (counted today from `data/scene-briefs`: 12 scenes, 76 beats of which 49 mandatory, 32 beats that open a check, 4 choice points, 1 combat beat) against what the run actually did (the Runner's own run state, roll messages carrying the Runner's tag, Papers). |
| **Persona briefs and agent definitions** | `tools/playtest/personas/*.md`, assembled into `.claude/agents/playtest-player.md`, `playtest-gm.md`, `playtest-scribe.md` with the narrowest tool lists the harness allows. |
| **Contamination auditor** | Reads every agent's transcript after the run for any tool call a player or GM should not make (a `Read` or `Bash` outside the run folder and the CLI). A seat that did is marked tainted. |
| **Seeded-defect patch set** | Four planted defects, applied to the frozen copy only (§6, Phase 1). |
| **Control room page** (optional) | One local page: the latest screenshot of every seat, the table log scrolling, a findings counter. So Ingram can watch the run like a game night through glass. |
| **Allowlist** | The playtest CLI, and only it, pre-approved in `.claude/settings.json` (the `fewer-permission-prompts` skill), so seven background agents never stall on a permission prompt. |

## 5. Who may read what

| | Persona brief | Own seat | Public table | Own memory | Repo (`data/`, `canon/`, `design/`) | GM-private log | `eval` |
|---|---|---|---|---|---|---|---|
| Player | yes | yes | public, and whispers to them | yes | **no** | no | no |
| GM | yes | yes | all | yes | **no** | yes | no |
| Scribe | yes | every seat's evidence | all | none | read only, to compare | yes | no |
| Orchestrator | yes | yes | all | yes | yes | yes | yes |

Enforcement is what the harness allows (minimal tool lists in the agent definitions, the CLI allowlist), plus the transcript audit, plus a canary: a line planted where only a seat that went reading could find it. In-fiction text (an NPC, a handout, the Service Agreement) is fiction and never an instruction to an agent; only its persona brief and the orchestrator's turn cards are.

## 6. The run

### Phase 0. Pre-flight (orchestrator alone, no agents)

*Steps 1, 2 and 4 are superseded: the playtest has a Foundry of its own, so there is no junction swap and no world made by hand (§12.3). `node tools/playtest/pt.mjs preflight` now checks everything below that still applies.*

1. **Freeze the build.** `npm test` green. Record the commit, a hash of the dirty tree and whether `deploy-status` says the server matches. Copy `module/blank-inheritance` (without `storage/`) and `module/stagecraft` (its built `dist/`, without `node_modules`) into the run folder. For the run, Foundry's `Data/modules/blank-inheritance` and `Data/modules/stagecraft` point at the copies, not the repo, and Foundry is restarted to pick them up. Remove each junction with `cmd /c rmdir`, **never a recursive delete**: through the link it would empty the repo's module folder. Restore the junctions afterwards. The sf2e system is read-only and stays linked. This also keeps the module's `storage/` writes (session log, chat exports, notebook, portraits) out of the repo's working tree, and stops another session's edits moving the build mid-run.
2. **A world of its own.** Create `blank-inheritance-playtest` through Setup, as the test world was made, with sf2e, Stagecraft and the adventure on. A Foundry server runs one world at a time, so the other session's world is stopped for the duration and nobody may log in as Gamemaster elsewhere (a second login bumps the first off). Deleting the world afterwards replaces the surgical cleanup the shared world needed.
3. **The machine.** GPU idle (`Get-Counter`, per the notes: she games on this PC), RAM free, no other live check running. Seven headless Chromes plus Foundry for hours is the load; the shakedown measures it.
4. **Media.** The local world lacks the audio library and some art (the live checks filter those 404s out). Either copy them in (about 800 MB of audio, plus the opening videos) or test audio and video only for "does not error" and leave B-5 and B-6 open.
5. **World setup.** The GM seat logs in **first**, because the Confirm relay needs an active GM client (A-6). Six users `PT Player 1` to `6` with no character, so the terminal opens by itself (a lent character stops it, A-4). World settings noted for restore, including `inductionAgreementEnabled` (§11).
6. **Run folder** `tools/playtest/runs/<date>-<build>/` (gitignored): `table.jsonl`, `predictions.md`, `findings.jsonl`, and per seat `memory.md`, `telemetry.jsonl`, `evidence/`.
7. **Smoke test with scripts only**: seven seats join, `look` works, a thrown error is caught by telemetry, a GM-private line never reaches a player.

### Phase 1. Shakedown (mandatory, cheap)

GM and two players (the P2 and P6 profiles) through Induction and Scenes 0 and 1, with four defects planted in the frozen copy: an invisible box over a control, an error thrown on one click, a GM-only line in a player-visible element, and a content plant (a mandatory beat whose only way on is a check with no fallback). **Pass:** the scripts find the first three unaided, at least one agent reports the fourth, the privacy canary holds, and the cost per scene is measured (it replaces every estimate in §9). **Fail:** fix the rig and repeat; nothing else runs.

### Phase 2. Induction (six players in parallel)

The six agents start in one message, in the background; the GM seat is online and a GM agent stands by. Each player gets only "you've been invited to a Starfinder campaign; open the game" and its persona, and does the induction as that person would, up to Confirm. Then it **tries to finish the deferred parts of its sheet** (heritage, ancestry and background feats, class feats, free skills) using only what the UI tells it. The form hands those to "the real sheet", which is the likeliest cliff for a newcomer. Stressors: P5 reloads mid-form and uses the offered draft; P6 double-clicks Confirm; once, the GM seat goes offline for a single Confirm to see the 20-second message.

Then the GM agent reads the six intake whispers and writes a one-page table prep from them. If it cannot, the intake is not yet doing its job.

**Orchestrator's gate:** six Actors, each owned by its player; `user.character` set; each token on the landing scene; six whispers; no console errors; each sheet's HP, AC, saves and attributes against `derive.mjs`. A mismatch is an S0 or S1. Take an Admin snapshot, **post-induction**: later runs resume from it without redoing chargen.

### Phase 3. Episode One, scene by scene

Four acts, so no agent carries a whole episode of screenshots: **Act 1** Scenes 0 to 4, **Act 2** Scenes 5 to 8, **Act 3** Scenes 9 to 11, **Act 4** the night (Phase 4). Within an act an agent is continued (`SendMessage`) so it remembers what it saw and said. Between acts it is replaced by a fresh agent given its persona, its sheet and its own `memory.md`, which it writes for itself at each act's end. Players forget, too.

**One scene** (`from-up-here` is a cold open with nobody in it; the same loop runs, with the players watching):

| Step | Who | What |
|---|---|---|
| 1. Predict | Orchestrator | Reads the scene, writes three to five falsifiable predictions and the curveball into `predictions.md`, and gives each persona a private scene hook ("you will refuse this beat"). |
| 2. Prep | GM | Opens the scene in the Runner and reads it as a GM would. `note`s friction. Says its plan in the GM-private log. |
| 3. Rounds | GM, then six players in parallel, then GM | The GM narrates a beat (`read-aloud` posts the Runner's own words verbatim) and presses what the beat asks. Each player reads the table, looks at its own seat, acts (rolls from its own window, chooses on The City, opens a handout, writes in the notebook) and says what it does. The GM adjudicates and `improv`s wherever the material gave nothing. Repeat until the exit beats are ticked, the GM reports "stuck", or the round cap (25) is hit. A cap hit is itself an S1: a naive GM could not finish the scene. |
| 4. Close | All | Each files a five-line debrief (confusion, friction, best moment, clarity 1 to 5, engagement 1 to 5). Detectors run. Coverage updates. Admin snapshot "end of scene N". The orchestrator scores the predictions. The Scribe reads the scene's evidence. The orchestrator also reads the cost meter and the findings count, and may stop. |

The six players act at once on purpose: it exercises six simultaneous rolls, six notebook writers and six windows opening, which is the part of Foundry a single-user check never reaches.

**Coverage.** A scene is not done until the ledger shows each of its checks seen at **a success and a failure** at least once, each of its choice points taken both ways across the run, and the refusal case run once. If dice do not oblige, the GM agent sets the result in the console by hand and the log marks it *forced*.

**Stressors**, each assigned to a scene before the run (likely homes, to be confirmed when I read each scene to predict it):
- a player reloads mid-beat, and the GM reloads mid-beat (the state must come back);
- a seat drops and rejoins (P5's throttled link), and a late joiner arrives;
- two players press the same thing together;
- a window is resized or zoomed mid-scene;
- a refused direct order, which goes to the hearing (D053, D058): The Errand's docket, Flood Tunnel's drains;
- a split and reconvergence through the choice prompt (School: Second Period; Flood Tunnel's choices);
- the private one-at-a-time conversations (Intake Medicals): whispers, and the leak scan;
- a player who "remembers" the old campaign's founders (B-14): does the world politely disbelieve them;
- the personal handout, which must carry each character's own name from Induction (The Road In's acceptance letter, the only `personal: true` handout in the episode).

### Phase 4. The night's rest

After Flood Tunnel each player chooses their own rest on The City. The six choose six different ones (the hospital among them) and one takes "somewhere new" (the Magic Show, which plays once), so the haunts get sampled. The open question this tests: how does one GM run six solitary rests? Oracle: HP restored against the fractions in `core/rest.mjs` (a quarter, a half, all). The night runs one event card and one roll per haunt; it is bounded.

### Phase 5. Close

Exit interviews. Each player: what confused me, the moment I nearly gave up, the best moment, what the interface never told me. The GM: where I improvised, what I had to remember, what I pressed twice, what I left Foundry for. Capture the final state (Admin State JSON, chat, journal, notebook, session log) and save every transcript. **Clean up:** delete the playtest world; restore the module junction and the world settings; delete the synthetic test images; confirm `git status` shows no tracked file changed. The run's own evidence stays in the gitignored run folder.

### Phase 6. Synthesis

1. Merge every finding into one list (the scripts', the agents', the Scribe's, mine).
2. **Repro pass:** I repeat each S0 and S1 UI finding on a clean seat. What does not repeat is listed as "seen once", so a model's slip is not reported as a defect.
3. Cluster by root cause.
4. **Material analysis** (§8).
5. The lock plan.
6. Write the report.

## 7. Findings

One line of JSON per finding in `findings.jsonl`:

```json
{ "id": "F-0042", "run": "2026-10-xx-<build>", "seat": "P3", "scene": "episode-c1e1--intake-medicals",
  "beat": "one-at-a-time", "t": "2026-10-xxT..", "channel": "instrument | agent | scribe | orchestrator",
  "kind": "bug | ux-friction | a11y | perf | leak | sync | material-gap | material-weak | continuity | rules | praise",
  "severity": "S0 | S1 | S2 | S3", "summary": "", "expected": "", "actual": "",
  "repro": ["..."], "evidence": ["telemetry line, screenshot path, action trail"], "lock": null }
```

**Severity.** **S0** stops play, loses data or work, corrupts the world, or shows a player something GM-only. **S1** gives wrong or missing information, or needs a workaround to go on. **S2** is friction or confusion that costs time. **S3** is polish.

**No evidence, no finding.** The daemon records every action with a timestamp, so the trail exists without anyone writing it down.

**`praise` is a kind.** What worked is recorded so it is defended, not just what failed.

**The bypass ladder** (when a seat or the scene is blocked): 1. retry the same action; 2. reload the seat; 3. another route (keyboard, palette, the other window); 4. a GM-side workaround (Admin: jump to the scene, set the clock); 5. an orchestrator fix-up with `eval`, the exact code recorded. Every rung is a finding, never lower than the rung's number would suggest (rung 4 or 5 is at least S1).

**Material findings** are filed against the project's own vocabulary so they land where it already files things: the scene-audit categories (`design/scene-audit.md`), Sign-Off checks, and the re-read questions by number (R9, R10 and the others `canon/reread.md` carries). *"The GM improvised here"* is the strongest single signal, counted by beat: a cluster of `improv` entries on one beat is a hole in the scene.

## 8. The report

Where: `design/playtests/<date>-<build>.md` (tracked). The evidence stays in the run folder. A private artifact page with a screenshot gallery is optional, on her yes. Contents, in this order:

1. **Verdict first.** What I would fix before the first Session, then what can wait, each against the launch checklist (`design/launch-checklist.md`): **A-6** (the Confirm relay with a GM online, and the message with none), **A-7** (portrait upload as a plain Player), **A-9** (the local half of a full induction; the item itself is "on the live server" and stays open), **B-5** (both versions of the opening and the title card, media permitting), **B-6** (audio, functionally), **B-9** (the dry run with connected clients; this is that, times seven), **B-14** (the founders).
2. **Run facts.** The build, the world, who played whom on what screen, how long, what it cost, and the coverage numbers (beats, checks by degree, choice points by option, surfaces touched).
3. **UI and UX findings**, by severity: summary, repro, evidence, proposed lock. A table of surfaces with who exercised them, so what nobody touched is plain.
4. **Material findings, scene by scene.** The improvisation inventory (the beats the GM had to invent for), where players were stranded or bored, the prediction scoreboard (which were wrong), authored versus delivered, what the GM had to remember.
5. **What worked.** The `praise` findings.
6. **Per-persona view.** What each kind of player experienced of the same scene.
7. **Calls that are hers.** Judgment questions raised by the run, listed and not resolved (`CLAUDE.md`: don't resolve open design questions unilaterally).
8. **The lock plan.** For every finding, the lock I propose. Issue text is drafted, and filed only on her yes.
9. **Appendix.** Transcript and evidence paths, the contamination audit's result, the seeded-defect results (how much to trust the silence).

The report changes no scene and no data. Fixes are a separate step, under the ratchet and the scene-edits rule.

## 9. Size, and the knobs

These are estimates. The shakedown replaces them with a measured cost per scene, and I would stop at each act boundary to show the meter.

| Stage | Seats | Agent tool calls | Wall clock |
|---|---|---|---|
| The rig itself | none | n/a (code and tests) | the biggest single piece of work, and the only code |
| Shakedown | GM + 2 | 150 to 300 | about an hour |
| Induction | 6, GM standing by | 400 to 700 | 30 to 45 minutes |
| Episode One | 7 | 1,500 to 2,800 | 3 to 5 hours |
| The night | 7 | 200 to 400 | 30 to 45 minutes |
| Synthesis | auditors and me | 100 to 200 | about an hour |

**Knobs, cheapest first.**
- **Seats.** *Full* is the seven you asked for. *Standard* keeps the GM and three players as agents and lets the other three ride the Admin autopilot, which needs a small change: it acts for every account with a character, with no per-account switch. *Lean* is the GM and two.
- **Scope.** Induction only; Induction plus Act 1; everything.
- **Screenshots** per turn, capped. The text snapshot is the default view.
- **Models** per role. Strongest for the GM and auditors, a lighter one for players once the shakedown shows it does not make the UI look worse than it is.
- **A second, perverse run** only on the scenes that drew S0 or S1 findings, with the personas reassigned.

## 10. What this cannot tell you

- **Whether it is fun.** Agents are cooperative, read carefully, never drift, never mis-click out of boredom. The personas pull against that and do not cancel it. Clarity, wiring, dead ends and friction are measurable here; delight is not.
- **How it looks.** Detectors catch overlap, clipping and size. Whether a screen is ugly or its mood is wrong stays a human call, and the Scribe's contact sheets are an aid, not a verdict.
- **How it sounds.** Headless Chrome has no speakers. Audio is checked functionally (is the context running, is the right thing playing). Video, the same.
- **The real network.** Everything is on localhost. One seat is throttled to stand in for a remote player. The live server's behaviour (restarts, latency, the host) is untested.
- **What the six real players will do.** They are people, and four of them remember the old campaign (`launch-checklist.md` B-14).

## 11. Risks, and what I need from Ingram

| Risk | What I would do |
|---|---|
| The local world is shared with another Claude session, and her own GM login bumps a seat off | A world of my own, `world-guard` between rounds, and her word that nothing else is using Foundry for the run |
| She games on this PC | GPU checked first, every seat's frame rate capped, and the run scheduled when she is away. I would stop on her say-so |
| Agents read the repo, or in-fiction text steers them | Narrow tool lists, the CLI allowlist, the canary and the transcript audit; fiction is never an instruction |
| An agent's slip is reported as a bug | The repro pass; "seen once" is its own class |
| The run costs more than planned | The shakedown's measured cost, a meter at each act, a round cap per scene |
| Debris left in a world or in the repo | A throwaway world and a frozen copy; `git status` checked at the end |
| Seven background agents stall on permission prompts | The CLI pre-approved, nothing else needed |

**What I need before the shakedown** *(answered 2026-10-06: §12.1; what is still hers is §12.7)*:
1. **The local Foundry.** May the run take it over for its length, and when? (She games on the machine; the other session's world stops while mine runs.)
2. **Fidelity.** Full (seven agents everywhere, as asked), or Standard, which keeps the agents where the table dynamics matter (Induction, Intake Medicals, Assembly, The Errand, Flood Tunnel) and uses the autopilot elsewhere? I would start Full for Induction and Act 1, and let the measured cost decide the rest.
3. **The Service Agreement page** (`inductionAgreementEnabled`): on for the run? I would say yes, since it is the longest and riskiest page and it is restored afterwards. It is off today because she has not graded the text.
4. **Media.** Copy the audio library and opening videos into the local world (about 800 MB, no repo change), or test them only for "does not error"?
5. **Watching.** Should I build the control-room page so she can watch live?
6. **Filing.** Findings in the report only (my default), or also draft GitHub issues for the S0 and S1 ones, filed on her yes.

## 12. As built, 2026-10-06

Everything above is the proposal as written that morning. This is what was built after Ingram's answers, and where it parts from the proposal. The manual for the rig is `tools/playtest/README.md`. Only scripted, agent-free runs were made; no language-model agent has played a seat.

### 12.1 Her decisions, and what each one did

| She said | What it did |
|---|---|
| "Full fidelity, agreement on" | Every seat is a real browser logged in as a real Foundry user, using real mouse and key events, at its persona's own screen size. The Service Agreement page is on in the playtest world (`inductionAgreementEnabled`), and the scripted players sign it. "Just a gag" is no reason to skip a page a player must pass. |
| "We don't need an agent for every player and for every scene" | A seat is always a real browser; what differs is its **brain**: `agent` (a language model driving it through the `pt` verbs), `bot` (a script driving the same real controls) or `idle`. Rosters: `shakedown` (GM and two players as agents), **`main`** (agents for the GM and the three personas that need judgement, which are the brute on a 1366 x 768 screen, the lateral thinker keyboard-only and the chaos agent; bots for the other three), `full` (agents everywhere) and `bots` (none). These replace §9's Full, Standard and Lean. |
| "Make the local copy up to date fully" | The playtest Foundry has its own data root, `tools/playtest/foundry-data/` (gitignored). The working tree goes into it by **a real deploy**, the repo's own `runDeploy` aimed at a folder: module, campaign data, Stagecraft and the opening videos, plus the audio library and a read-only copy of the sf2e system. Both sides are checksummed. Its build id (`c7b762ce7baccfdf`) equals the live server's. `pt build --check` says whether it is still current. |
| "A control room would be nice" | `tools/playtest/control-room/index.html`, served by the hub: a live picture of every seat, the table, findings, events, coverage and dice, and the operator's controls (pause, say, file a finding, run the detectors on every seat). |
| "Dice rolling tooling or other tooling that could help" | See §12.2. In short: forced and seeded dice, instruments that need no agent, an oracle for the made characters, a coverage ledger, a prediction log, a contamination audit. |
| "Don't run any of this" / "Run anything you need to prepare" | Only scripted runs were made (§12.4). When I tried one last dry start of the `main` roster, the harness refused it as creating agents, which is consistent with her first instruction, so I did not work around it (§12.6). |

### 12.2 What exists

All under `tools/playtest/` unless said otherwise. Every piece has its test in `test/playtest/` (80 tests; the page-script tests run a real Chrome).

| Piece | Where |
|---|---|
| **The hub**: owns every browser, bot and the run's memory; HTTP and server-sent events on port 30177 | `hub.mjs`, `hub/` |
| **The command line** (`node tools/playtest/pt.mjs`) | `pt.mjs`, `client.mjs`, `commands/` |
| **Seats**: a Chrome context per seat, real input, a text view of the screen (`look`, with stable refs), screenshots on request, the dead-click check | `browser/seat.mjs`, `browser/look.js` |
| **Agent verbs**: `look`, `shot`, `click`, `type`, `key`, `scroll`, `drag`, `upload`, `wait`, `reload`; table `say`, `do`, `read`; `note`, `memory`, `who`; GM only `read-aloud` and `improv`. No `eval`, no file access, no navigation away | `core/verbs.mjs`, `hub/verbs.mjs` |
| **The table channel**: public, whispers, GM-private; a canary test holds that a player never reads what is not theirs | `core/table.mjs` |
| **Findings**: schema and validator ("no evidence, no finding"), clustering, severity tally, `rig` as a kind, `findings reclassify` (a correction is on the record with its reason, never a deletion) | `core/findings.mjs` |
| **Telemetry** per seat, each event tied to the action before it, with a list of known noise that is shown, never hidden | `core/telemetry.mjs`, `browser/page-hooks.js` |
| **Detectors**: invisible click-swallowers, covered controls, off-screen and tiny controls, sideways scroll, clipped text, unnamed controls. One finding across seats (it lists which seats) | `browser/detectors.js` |
| **Probes**: convergence (do all seats agree on the clock, the Runner, the open check, the scene), reload invariance, the leak scan (each scene's `Secret:` lines against every player's page and documents), `peek`, `windows` | `browser/probes.js`, `hub/ops.mjs` |
| **The chargen oracle**: each made sheet's HP, saves and attributes against `tools/character-builder/derive.mjs`, who owns what, and the intake whisper | `core/oracle.mjs` |
| **Coverage ledger**: every beat, check by degree, choice option and handout in the scene briefs against what the run did | `core/coverage.mjs` |
| **Dice**: the sf2e degree rule, seeded generators per seat, forced rolls that go on a tape marked forced, an in-page governor | `core/dice.mjs`, `browser/dice-governor.js` |
| **Scripted players** (bots): the whole Induction through the real UI with six chargen specs (the plain path, a non-terrestrial ancestry, Witchwarper's key attribute and a portrait upload, a rule-element background, every optional field blank, a very long name with emoji and a second portrait), the opening choice, a check roll, a choice prompt | `bots/` |
| **Personas and rules**: seven briefs, the table's rules, the GM's rules; no story spoilers (a test holds a forbidden-word list) | `personas/` |
| **Agent definitions** with the narrowest tool lists the harness allows | `.claude/agents/playtest-player.md`, `playtest-gm.md`, `playtest-scribe.md` |
| **The playtest Foundry**: build, launch, a world provisioned by driving Chrome as Gamemaster, snapshots | `foundry/`, `commands/` |
| **Seeded defects**: four patches for the shakedown, planted in the playtest copy only | `defects/defects.json`, `foundry/seeds.mjs` |
| **Report skeleton**, **contamination audit**, **predictions** | `core/report.mjs`, `core/audit.mjs`, `hub/orch.mjs` |
| **Pre-flight**: sixteen checks, exit 1 on a failure | `commands/preflight.mjs` |

### 12.3 Where it parts from §4 and §6

- **One hub, not a daemon per seat.** Agents reach it only through `node tools/playtest/pt.mjs --as <seat>:<token> <verb>` with a per-seat token. The orchestrator's operations (pause, dice, detect, probe, eval, run) need a second token that lives in `.state/orch-token`; no seat has it.
- **No junction swap, no world made by hand** (Phase 0, steps 1 and 2). The playtest Foundry has its own data root and port (30100) and its own world, `blank-inheritance-playtest`. Nothing touches the other session's `foundry-local` world, the junctions, or the repo's module folders. `pt world provision` makes the world by driving Chrome as Gamemaster (modules on, content synced by the module's own world-sync, six players, agreement on). `pt world snapshot` and `restore` copy the world and the module's `storage/` with Foundry stopped. The clean start is the snapshot **`provisioned`**, not an Admin snapshot; a restore replaces the surgical cleanup the shared world needed.
- **Media is in** (step 4), so B-5 and B-6 can be tested.
- **The Admin autopilot is not used.** A bot is a seat with a script, so there is no need for a per-account switch on the autopilot.
- **Machine load** is held down by a *lean* profile (a frame cap and reduced rendering) for every bot and idle seat, so only an agent's seat costs full price. Seven seats take about 9 GB of memory and about 45% of the graphics card; `pt preflight` checks both, because she games on this machine.
- **The seeded defects** are an invisible box over the players' bottom-left controls, an error on pressing Begin, a GM-only line in a player-visible element, and a changed DC in a scene brief. `pt seed list`, `apply` and `restore`. The copy is clean now, and `pt build --check` and `pt preflight` both say so.

### 12.4 What was run, and what it proved

- Seven real Chromes (the GM and six players, each at its persona's screen size) against the playtest Foundry; six scripted Inductions through the real UI with the Service Agreement signed, in about four and a half minutes. The oracle agrees with `derive.mjs` for every made sheet.
- With no agent, the instruments found three of the four seeded defects: the click-swallower (S1, with the controls it covered), the error thrown a moment after Begin (S1, stamped "270 ms after P1's click") and the GM-only line on the first page of the terminal (S0, on all six screens). The fourth, a changed DC, needs someone to compare what is delivered with what was authored, so it is the Scribe's and the GM's to find, and the shakedown does not pass until an agent reports it. The privacy canary held. Forced dice produced every degree against the real open check's DC in a real Foundry.
- The control room was watched live; its pictures, tabs and the operator's "run the detectors on every seat" were used.
- The first live dogfood of the instruments found a fault in the rig itself: the click-through detector flagged the deck's decorative dial (an empty `svg`) on five seats. Fixed (a part of the adventure's own HUD is meant to take clicks; the HUD's own empty root, the Scene Runner's closed host, is still caught, and a test holds both). That finding stands as filed in the rehearsal's log, and it is why `findings reclassify` now exists: in a real run it would be corrected to `rig` on the record, with its reason.
- The repo's default suite: 4,471 tests pass.

### 12.5 What those runs already found in the game

Found with no agent. Evidence is in `tools/playtest/runs/control-room-look/` (gitignored, on this machine). The last column is my reading, not a verdict. **Ingram's reply, 2026-10-06: "yes to both, fix them first".** The four certain ones (F-0002, F-0003 to F-0007, F-0008, F-0014) were fixed that day, each with tests, and a second all-scripted run of the same six players on the rebuilt copy raised **2 findings instead of 14** (the missing session file, and one 270 ms freeze): no first-login window, both portraits uploaded through the GM's browser, Starship Dweller and Envoy characters made with no question from the system and the chosen skills trained on the sheet. What the fixes are, and where they are held, is in `design/induction-terminal.md` (the build note "Three fixes the playtest rig's first scripted run forced") and `design/launch-checklist.md` A-7. F-0011 to F-0013 (the chat's message-mode buttons under the rail on a screen 768 px tall) were **not** touched: Foundry puts them at the bottom of the chat panel, and the deck's reservation lifts that panel into the rail's height on screens shorter than about 900 px.

| Finding | What the instruments saw | My read |
|---|---|---|
| F-0002, S2 | Foundry's own "User Configuration" window opens over a new player's screen at first login (core opens it for any player with no character), covering part of the terminal. The scripted players had to close it before they could go on. | Real, and the six real players will meet it. Core's `game.mjs` does it; the module can close it or give the account a stand-in. |
| F-0003 to F-0007, S2 | "User does not have permission to upload files": the portrait step fails for a plain Player, with an error notice and a console error. | Real **unless the live world lets players upload files** (Configure Permissions). I cannot see the live world's setting from here. This is launch-checklist A-7. |
| F-0008, S2 | Confirming Starship Dweller raises an unexplained sf2e question ("Select a skill: Crafting, Piloting") in a small window over the review page, which says only "Creating your character...". | Real. |
| F-0014, S2 | At 1366 x 768 Foundry's macro hotbar wraps into three rows, and an empty slot sits over the deck's Perception round, so pressing it presses the slot. | Real; the laptop persona exists to catch exactly this. |
| F-0011 to F-0013, S2 | At 768 px tall Foundry's chat message-mode buttons (public, private, blind, self) lie under the sidebar rail. | Probably real: the deck's reservation lifts the chat column into the rail's height. The one to confirm first. |
| F-0001, S2 | The session log's read of today's file before it exists shows as a console error. | Probably harmless alone, but it trains everyone to ignore a missing-file error. Make it a quiet check. |
| F-0009, perf | One 1.7 s freeze on one seat. | Likely the machine's load, with seven browsers and a server on one PC; the long-task counts in the real run decide. |
| F-0010 | An "invisible box that swallows clicks" on five seats: the deck's decorative dial. | A fault in the rig (a false positive), fixed; it is not a defect of the game. |

### 12.6 How to start the shakedown

```
node tools/playtest/pt.mjs preflight          # exit 1 on a FAIL; must say READY
# the app's previews: foundry-playtest, then playtest-hub (opens the control room)
node tools/playtest/pt.mjs seed apply         # the four defects, shakedown only; `seed restore` afterwards
node tools/playtest/pt.mjs run start shakedown --name <run>
node tools/playtest/pt.mjs bots               # the scripted seats
node tools/playtest/pt.mjs brief P2 --stretch "Induction"   # an agent's whole prompt
```

Then the agents are started from `.claude/agents/` with those briefs, and `pt predict <scene> "..."` goes in before each scene. After the shakedown, `pt seed restore`, `pt world restore provisioned`, and `pt run start main --name <run>`.

- **The one setting that is hers to give.** Unattended agents run `node tools/playtest/pt.mjs ...` through Bash; without a standing allow rule they stall on a permission prompt per command. The rule is in `tools/playtest/README.md` and is **not** added, because a standing permission is hers to grant. Pre-flight shows it as its one warning.
- **Starting a run with agent seats will ask.** The harness's auto mode refused my last dry start of `main` as "creating agents". Expect that prompt, once, when the shakedown starts.
- **Not yet driven end to end.** The agent verbs are the same `Seat` methods the bots use, `look` is tested in a real Chrome, and the verbs are tested through the hub's HTTP door with stand-in seats. What has not happened is a language model reading `look` and acting on it, which is what the shakedown is for.

### 12.7 Still open, and hers

1. The permission rule above.
2. **Fix first, or leave as a control?** Four of §12.5's findings are certain and cheap (the User Configuration window, the portrait upload permission, the Starship Dweller prompt, the hotbar at 1366 x 768). Left alone, the real run spends agent time rediscovering them. Fixed first, the run's attention goes to what nobody knows. My recommendation is to fix those four, then run, and keep the list as a record. It is her call; nothing in the game has been changed.
3. The rest of §11 stands: the report goes in `design/playtests/`, findings in the report only unless she says to draft issues, and nothing here grades, seals or edits a scene.

## 13. The episode confidence run (2026-10-07)

**Why it replaced §1's plan.** The first agent run (`main-1`, 2026-10-06) took 44 minutes to cover the Induction alone, at 6 to 9
seconds an agent action; playing all twelve scenes the same way extrapolated to about six hours. Three lessons from it shape this:
minds are expensive, so spend them only where a script cannot look; fixing things mid-run wrecks the schedule (one keyboard blocker
took 30 of the 44 minutes); and a noisy instrument buries the signal (66 of 129 findings were the rig's own noise). Ingram the same
day: keyboard-only play is out of scope (Foundry needs a mouse, every player has one), and *"thorough testing is good but exhaustive
testing can go too far."* She asked for something she can trigger that raises confidence the episode is **good content and free of
bugs**, and that tests **whether an LLM is a useful co-author**.

**The trigger:** `/episode-confidence` (`.claude/commands/episode-confidence.md` is the procedure). Four layers, about three hours,
then her grades:

| Layer | What | Who | Time | Finds |
|---|---|---|---|---|
| 1. Gate | story check, scene audit, journeys, NPC check, the Sign-Off board, the test suite | `tools/episode-confidence/gate.mjs` | 5 min | what the repo's own checks already know |
| 2. Desk read | four scene readers (three scenes each), an arc reader, a rules referee, in parallel, read-only | LLM agents, briefs in `tools/episode-confidence/briefs/` | 35–45 min | stalls, dead checks, unreadable read-aloud, reveals, continuity, wrong DCs |
| 3. Scripted walk | every scene, beat, check, choice, handout and trigger pressed through the Scene Runner in a real Foundry, players as bots | `tools/playtest/bots/gm-walker.mjs` (`pt run start walk`, `pt walk`) | 20–30 min | what breaks in play: a beat not shown, a check nobody can roll, a choice that will not settle, page errors, leaks |
| 4. Table run | three scenes, one per kind of play (opening, the errand, the fight), GM and two players as agents | the rig, `main` roster | 75–90 min | confusion and friction a real table would meet |
| Synthesis | merge, check every quoted line is really in its file, de-duplicate, grading page, report | `tools/episode-confidence/collect.mjs` | 30 min | |

**What makes it measurable.** Every desk finding must quote the exact words it means; `collect.mjs` throws away any finding whose
quote is not in the file it cites and counts it as fabricated. Every kept finding goes on a grading page (an Artifact with a grade
store) where Ingram marks it useful, wrong, nitpick or already known, with reviewer names hidden by default so grading is blind.
`collect.mjs score` turns her grades into a row per layer and per model in `design/playtests/copilot-scorecard.md`: precision,
finds no other layer made, fabricated quotes, minutes and tokens. Over runs that table is the answer to the co-author question, and
it says which layers earn their cost.

**Rules of a run:** no fixing during it; one checkpoint message after the desk read; nothing sealed, promoted or edited; the GPU check
gates layers 3 and 4 (she games on this machine); scene and arc readers and the table GM on Opus, the rules referee and player
agents on Sonnet, with an optional A/B (`--ab`) that runs the scene readers on both.

**What it gives up, on purpose:** eight of the twelve scenes are not played by minds (the desk read and the walk cover them); options
the players do not pick are not played; pacing over a real evening is estimated, not measured.

**Built for it (2026-10-07):** the walker and its `walk` roster (a GM `walker` brain, `pt walk`, findings on the `walker`
channel; plan and judgement in `core/walk-plan.mjs`); keyboard-only retired from the personas and `main` roster (now GM + P2 +
P6 as agents); occlusion findings grouped by cause (`core/detector-keys.mjs`), which turns `main-1`'s forty into five; the gate,
the collector, the finding schema, the three briefs and the grading page template. Tests: `test/episode-confidence/`,
`test/playtest/walk-plan.test.mjs`, `test/playtest/detector-keys.test.mjs`.

**The dry run, graded (2026-10-06, `design/playtests/2026-10-07-c1e1-dryrun/`).** The gate and one Opus reader on The Road In gave 46 findings. Ingram graded every one: 41 useful, 4 "wrong" (rules and tests that needed changing, not false alarms), 1 already known (the violet mark echoing the rift is intentional). The scorecard row is in `design/playtests/copilot-scorecard.md`. What it changed (D065): the Sign-Off checker had four faults (M2 and M10 asked for words the house style folded away, M6 and M8 ignored `anySkill`, M7 read a cast id as a data id) and no way for an author to say a rule does not apply (now `exceptions`, design/scene-signoff.md section 5d); Episode One went from 37 failing required checks to the 5 that are the siting only she can do; temptations became twists; The Road In and four locations were rewritten from the reader's and her own notes. The grading page also lost her notes past 500 characters and mid-typing, which is fixed (4,000 characters, saved on blur).

**Not yet proven live:** the walker has not yet walked Episode One in Foundry (the GPU was in use when it was built). Its first run
is the first thing the first trigger does after the desk read; expect to fix the walker, not the game, the first time.

*Related: `design/scene-simulation-testing.md` (the narrated version, the personas and the predictions rule this builds on), `design/testing-strategy.md` (the tiers; §5 is stale), `design/admin-panel.md` (the reset, snapshots and autopilot this relies on), `design/launch-checklist.md` (the gates the verdict is written against), `design/induction-terminal.md` and `design/induction.md` (what Induction is), `canon/plan/chapter-01.md` (Episode One's scenes in play order), `design/scene-signoff.md` and `design/scene-edits.md` (what the run must not touch), `tools/overlay-check/` and `tools/check-console/live-check.mjs` (the harness idioms reused), the memory notes `live-server-testing`, `foundry-test-cleanup` and `scene-quality-ratchet`.*
