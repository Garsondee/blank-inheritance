---
description: Run the Sign-Off on one scene — the four-pass review that ends with it cleared for the table
argument-hint: "[scene id | 'board' | nothing for the next scene in play order]"
---

# The Sign-Off — `$ARGUMENTS`

Read `design/scene-signoff.md` before the first pass of a session. It is the procedure; this is the
trigger. `data/campaign/signoff-checklist.json` is the content — the checks, by pass, with their
severity and their source.

## Start

```bash
node tools/scene-signoff/console.mjs
```

- **No argument** → print the board, then begin the scene it names under "Next up".
- **`board`** → print the board and stop. Nothing else.
- **A scene id** → that scene (`episode-c1e1--kit-issue`, or just `kit-issue`).

Then read the scene's own check report and the scene brief itself:

```bash
node tools/scene-signoff/console.mjs --scene <id>
node tools/scene-audit/audit.mjs <id>
```

## The report is the deliverable — open it before the first pass

Write `reviews/<id>.json` (shape: `data/schema/scene-review.schema.json`), then render and publish:

```bash
node tools/scene-signoff/report.mjs <id>
```

Then publish `reviews/<id>.html` with the **Artifact** tool — one artifact per scene, favicon 🖋️ —
and give Ingram the link. **Re-render and republish as soon as each pass is written.** She reads the
page, not the chat, so a pass that only exists in a message has not been delivered.

The JSON is the source and is tracked; the HTML is generated and gitignored. Prose fields take a
small markdown subset: `**bold**`, `*italic*`, `` `code` ``, `### heading`, `> quote`, `- list`.
Structure everything else as data — `findings` with a `severity` and `before`/`after`, `declined`,
`judgedFine`, `applied` — because that is what the page can render as cards, stripes and diffs
instead of paragraphs.

**Fill in `asks` first and keep it current.** Plain questions naming the specific thing asked — never
a check id, never "this needs your input". A review that says "P3 is unresolved" has done the work
and delivered none of it. Mark `blocking: true` when the seal genuinely waits on it. If there is
nothing to ask, leave the array empty and the page says so.

**Only record a `CLEAR` Ingram has actually given.** `FIX`, `STOP` and `BLOCKED` are findings and go
straight onto the record; `CLEAR` is assent, so it stays a `proposed` verdict in the JSON until she
answers.

## The four passes — one output each, in this order, and stop between them

Ingram reads each output and answers before the next one starts. Never run two passes in one
message. Never start a pass she has not asked for.

**1. Comprehension.** Run the scene at her, in one output, start to finish, as flowing narration —
the thing you would actually do, in order. Verbatim on everything a GM says out loud: the opening
read-aloud, every NPC's first line, every choice as the players would hear it, every roll with its
skill, its DC and all four degrees of success. Flag every point you would have to improvise. Do not
raise craft findings here — they are pass 4's. End with one unhedged line: `CLEAR`, `FIX`, or `STOP`.

**2. Completeness.** The required checks as a pass/fail table, then at most five recommended ones,
ranked, each with what it adds and what it costs — **and name the recommended checks you are
deliberately declining, with the reason.** A required check that is wrong for this scene gets waived,
not satisfied. End with `CLEAR` or `FIX`.

**3. Place.** Render the map sheet and send it with `SendUserFile`:

```bash
python tools/scene-signoff/place.py --scene <id>
python tools/scene-signoff/place.py --scene <id> --candidates   # when it has no location yet
```

Two panels — SITE and SITUATION — captioned. Then set what the brief claims about the place against
what the map actually shows. If there is no location, bring a ranked shortlist and a recommendation;
never quietly pick one. If nothing on the map fits, ask her to draw it. End with `CLEAR`, `FIX`, or
`BLOCKED`.

**4. Quality.** At most five findings, ranked by how much each would change what happens at the
table, each with the current text and the proposed replacement. **Apply the obvious ones and show the
diff as done**; anything touching meaning, reveal timing or character goes in the proposed list and
waits. Then name what you considered and judged fine. End with `CLEAR`, `FIX`, or `STOP`.

**Two rounds of `FIX` per pass, no more.** On the third run, every remaining finding is either applied
or dropped with a one-line reason, and the pass clears. This is the rule that makes the job finishable.

## Record every verdict as it happens

```bash
node tools/scene-signoff/seal.mjs pass <id> <pass> <verdict> --note "..." --rounds N
node tools/scene-signoff/seal.mjs waive <id> <checkId> --why "..."
node tools/scene-signoff/seal.mjs show <id>
```

When all four are `CLEAR` and Ingram says so — and only then:

```bash
node tools/scene-signoff/seal.mjs seal <id> --by Ingram
```

It refuses an incomplete record, so the record has to be real. If a pass returns `STOP`, stop the
whole sign-off and say what would have to change.

## The standing rules this process runs under

- **Be decisive.** Five findings, ranked, with the non-issues named, and a verdict in one line.
  "Here are fourteen observations" is not a review.
- Never write what the table feels, concludes or will do.
- `design/gm-facing-prose-style.md` governs anything read at the table.
- Tone is Giant Robo: warm, funny, uplifting, comedy load-bearing. Dark is allowed; depressing is a
  failure state.
- Every mystery plant needs a stated real answer and a recall check.
- Never prescribe the approach — set up the task, guarantee the outcome, let the players own the how.
- Count the corpus, not just the scene: a scene can read clean while one skill sits on two thirds of
  all checks.

## When the episode is finished

Once every scene in an episode is `live`, run the episode-level pass: the emotional-arrow sequence and
its runs, skill and activity variety across the whole episode, required-beat traceability, cast
coherence across the roster, and whether the reveals are spent in a sensible order.
`design/scene-audit.md` §9 and §10 have the method.
