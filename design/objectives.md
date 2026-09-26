# Objectives

*Written 2026-09-09. A floating tracker for both seats, an accumulating log of what the party has
learned, and — the part that matters most — a discipline for how objective arcs get written.*

---

## 1. What this is

A small floating box, on screen for players and for the GM, listing the objectives currently in
play as **one short sentence each**. Clicking a sentence opens the long version: **a log that grows
as the party learns things.**

When an objective closes, it collapses into **a single paragraph telling the whole story of that
arc**. Completed objectives stay readable. By the end of a chapter the party has, in one place, a
history of the adventure written out of what they actually found rather than what was planned for
them.

Ingram, 2026-09-09: *"This is both a guiding principle for how to design objective arcs but also
provides a summary history of the whole adventure as the group progresses through it."*

**Both halves of that sentence matter, and the first one is the reason to build it.**

---

## 2. The design discipline it imposes

If every objective must end as a coherent paragraph, then writing one requires knowing its shape
before play. That is a constraint on authoring, and it is a good one.

An objective is authored as four things:

- **Opens on** — what puts it on the board. A scene, a discovery, somebody asking.
- **Learnable** — the discrete things the party *can* find out. Each becomes a log entry the moment
  it is learned. Not a checklist of tasks; a list of facts that can be acquired.
- **Closes when** — what actually counts as done, stated plainly enough to recognise at the table.
- **Suggested resolution** — a draft of the closing paragraph, written ahead as a prompt.

**The test this gives you for free: an objective with one learnable is not an arc, it is an errand.**
Two is thin. Three or more and it has a shape. That is checkable in data, the same way the
two-aspect rule is.

**The resolution paragraph is written by the GM at closing time, not generated.** The authored
suggestion is a prompt sitting next to the real log, because what actually happened will not be
what was predicted and the paragraph should describe the former. Bible §20 says it plainly:
prediction is a courtesy, responsiveness is the actual strength.

---

## 3. Four kinds, two axes

Ingram named four buckets — public and private, group and personal. Underneath they are two
independent properties, and keeping them independent avoids a combinatorial mess:

- **Audience** — everyone, or a named list of players. This is the mechanical one.
- **Owner** — the party, or one character. This is presentational.

| | Group | Personal |
|---|---|---|
| **Public** | *Find out what the cicada stencils mean.* Everybody sees it. | *Get your sister into the school.* Everyone knows they are doing it. |
| **Private** | A secret two of them share. Rare, and the interesting one. | *Nobody here knows what you are.* Only that player sees it at all. |

**A private objective is ABSENT from other clients, not hidden on them.** Doctrine Law 11:
redaction is removal. The same allow-list pattern the staged cast, the downtime board and the
social store all already use — a player's client must never hold another player's secret, because
anything a client holds is one devtools panel away from being read.

**Personal objectives are what make the intake questionnaire pay off.** Every answer to bible §20's
eight questions is a side plot seed or a vulnerability; each of those is a personal
objective waiting to be written, and the tracker is where the player is reminded it exists.

---

## 4. The log, and how sparing it should be

**An entry is added when the party LEARNS something, not when something happens.** That distinction
is the whole discipline. A fight is not a log entry. What the fight told them is.

Ingram: *"We use this sparely but consistently."* Consistency matters more than frequency — a log
that gets three entries in one scene and none for two sessions teaches the players that it is
decorative.

Each entry carries what was learned, when, and which scene it came from. The scene reference is
what makes the completed history readable later, and it is free at write time.

**Rule of thumb: if a player would write it down, log it. If they would not, do not.**

---

## 5. The GM's view: three columns

The GM needs a different shape from the players — Ingram asked for *what's just happened, what's up
next, and where things might go.*

| Column | What is in it | Where it comes from |
|---|---|---|
| **Just happened** | The most recent log entries across every objective, newest first. | The log itself. |
| **Up next** | Active objectives, each showing the learnables not yet acquired. | Authored `learnable` minus logged. |
| **Might go** | Objectives with nothing scheduled to advance them, plus the chapter's bifurcation points. | Dormancy detection, and bible §20's fork table. |

**The third column is the one worth building carefully.** It answers the question a GM actually has
during prep — *what have I stopped feeding?* — and it is computable: an objective whose remaining
learnables appear in no upcoming scene has gone dormant, and the tracker can say so without being
asked. That is the same job as the note about trails needing to be visible in prep, generalised.

---

## 6. Freeform sections

Some stretches of play have no authored objectives at all, and the tracker must not punish that.
Three things must be doable live, in seconds, without touching a data file:

1. **Create an objective**, with a title and an audience. Nothing else required.
2. **Append a log entry** to any objective.
3. **Close one**, writing the resolution paragraph then or leaving it for later.

An objective created live has no authored learnables and no suggested resolution, and that is a
complete, valid objective. The authored fields exist to make prep better, not to make live
creation impossible.

This is the same interaction the GM log bar already has — type, enter, done — and it should feel
identical, because a GM mid-scene has exactly one gesture available.

---

## 7. Register

**Glass for the tracker, paper for the log**, which is the split `visual-identity.md` §5c already
established for the terminal and which the scene runner uses in reverse.

- The floating box is an **instrument**: always on, glanceable, a machine reporting current state.
  Legend face, readout numerals, the same hardware as the command bar.
- The expanded log is a **document**: the record of what the party has worked out, in their own
  accumulating words. Paper stock, book serif, dated entries.

A completed objective's resolution paragraph is the most paper-ish thing in the module. It is the
campaign's own history, and it should look like something somebody wrote down rather than something
a system emitted.

---

## 8. Where it plugs into what exists

- **Scene briefs already prompt for this.** `outro.writeDown` asks the questions next session's
  writing will want answered, and `carryForward` names what to carry. Those are the *prompts*; a log
  entry is the *record*. The outro should be able to name which objective an answer feeds.
- **The harvest should carry it home.** Resolution paragraphs are high-value narrative written at
  the table, and they are exactly what I want to read before writing the next chapter.
  `tools/module-sync/sync-harvest.mjs` already pulls `storage/`; objectives belong in it.
- **Threads.** Every objective should tag to one of the six (bible §16), so a chapter can be checked
  for a thread that has quietly stopped being fed.
- **Naming collision to avoid:** `subsystem.schema.json` already has an `objectives[]` field meaning
  something else entirely — Infiltration's "clear N of these obstacles". Different concept, and the
  new one should not be called that in the same breath.

---

## 9. Build order, when it is built

1. **Schema and pure core.** The objective shape, audience filtering, dormancy detection, and the
   learned-versus-learnable diff. All testable with no Foundry.
2. **The player tracker.** Floating, glass, one line per objective, collapsible. Law 11 enforced by
   projection before publication, never by a template conditional.
3. **The expanded log**, in paper.
4. **Live create/append/close** for the GM.
5. **The GM's three columns.**
6. **Harvest**, so resolutions come home.

---

*Related: `design/ux-doctrine.md` (Law 11, the log bar, §10.7); `design/strategy-layer.md`;
`design/induction.md`; `ideas/story/blank-inheritance-v4.md` §16 (threads), §20 (the intake quiz
and the bifurcation table); `ideas/entries/chat-log-knowledge-base.json`;
`ideas/entries/player-and-gm-journals-context-ingestion.json`.*
