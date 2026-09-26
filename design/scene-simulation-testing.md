# Scene Simulation Testing

*Written 2026-09-09. A protocol for finding out whether a scene brief and the console that runs it
actually hold up — by playing the whole table solo, on purpose, including the parts that go wrong.*

---

## 1. Why, and the discipline this borrows

Ingram, 2026-09-09: *"The best way to prove that we've got a good concept is you actually run it,
you play all the roles at once, you simulate roleplaying but you also do rounds where you simulate
potential problems and see how scenes would hold up to curve balls."*

This project has already done exactly this once, on the combat-AI side. The battle simulator's design log
(`tools/battle-simulator/DESIGN-LOG.md`) §16 ran a deliberately maximal stress-test scenario and found six real, previously-invisible bugs —
and §17 states the rule this document borrows outright: *"Predictions were written down **before**
any of it was run, because a battery whose expectations are set after seeing the results proves
nothing."* Everything below is that same discipline applied to scenes and the panel instead of
combatants and a grid.

**This is also the concrete shape of the create → analyse → critique → evolve workflow** for
content that has no automated test that can judge "is this fun and clear," which is most of what a
scene brief actually is.

---

## 2. Four tiers of evidence, borrowed from the same document

| Tier | Question | Strength | Catches |
|---|---|---|---|
| 0. Schema + render | Does it validate and assemble without throwing? | Necessary, very weak — a scene of nothing but empty strings can pass this | Broken refs, malformed data |
| 1. Cold read | Can a GM read it once and know what to do? | Weak-to-medium, cheap | Cryptic prose, wrong reading order (found the hard way earlier this session) |
| 2. Self-play dry run | Does it survive being actually run, badly, by people not following the script? | Strong — the only tier that exercises branches, invented approaches, and refusal | Missing fallbacks, dead ends, beats with no real weight |
| 3. Live-UI cross-check | Does the panel actually do what the transcript says it does? | Strongest — nothing here can be narrated around | UI bugs the narrative tier is blind to by construction |

Tier 0 is `test/tier1-scene-brief.test.mjs` and `tier2-data-corpus.test.mjs`, already built. Tier 1
is the read-aloud critique pass already used on Act 1 Scene 1 earlier this session. **Tiers 2 and 3
are what this document adds**, and tier 3 only means anything once tier 2 has produced concrete
claims to check.

---

## 3. The persona roster

**One GM voice (mine), six player personas, fixed rather than reinvented per run** so results are
comparable across scenes. Deliberately not six versions of "engaged roleplayer" — the point is
coverage of how real, different people actually behave at a table, including the two kinds most
likely to break an authored scene.

- **CASTER (Diplomacy-first).** Reads the room, tries the socially obvious approach, engages
  every `willDiscuss`/`willNotDiscuss` topic offered. The persona a scene "wants."
- **BRUTE.** Impatient, physical, skips ahead. Tests whether a social scene has anything for a
  player who doesn't want to talk.
- **RULES-LAWYER.** Asks for the DC before rolling, cross-references what's on the sheet, presses
  on exactly-worded permissions. Tests whether the authored DC ladder actually holds up read
  literally.
- **LATERAL THINKER.** Invents an approach nothing in the challenge file lists. **The single most
  important persona in the roster** — every scene brief in this project claims "if a player invents
  something, price it on the same ladder," and this is the persona that actually forces that claim
  to be used rather than just written down.
- **QUIET ONE.** Says little, watches, picks up on things nobody addressed directly (the doctor's
  pause, the clerk's flat delivery). Tests whether passive/observational content (a `secret` check,
  a `direction` note) has anywhere to land for a player who isn't driving the scene.
- **CHAOS AGENT.** Deliberately off-script — refuses a beat outright, walks away, does the thing the
  brief clearly didn't expect. Tests whether "players will surprise the GM" (the strategy layer's
  own stated design principle) actually survives contact.

Run order and dialogue are improvised in the moment, the way a real table is — this is a
role-play, not a script read.

---

## 4. The curveball

**At least one deliberate injection per run**, decided before the transcript starts (declared with
the predictions, §5), never invented mid-transcript to rescue a boring run. A curveball is something
the scene brief does not explicitly anticipate: two personas colluding against the intended read of
a beat, a persona refusing a mandatory beat outright, an approach that should legitimately succeed
at a DC nothing on the ladder was built for.

**The test is not "does the GM survive it" — it always can, GMs improvise for a living.** The test
is **"does the authored material make surviving it easy, or does the GM have to invent everything
from nothing."** A scene that only works when nobody pushes on it has not actually been proven.

---

## 5. Predictions, written down first

Per §1's borrowed rule, this section is written and saved **before** the transcript in §6 exists.
Reading §6 knowing these were locked first is the whole point — if every prediction turns out
right, the exercise proved nothing; the interesting result is which ones are wrong.

**Scene under test: `episode-c1e1--intake-medicals` (Act 1, Scene 1).** Already live-verified for
mechanics (ticks, spends, artefact grant all confirmed working against the real panel). This run is
testing the CONTENT and the READING ORDER, not the plumbing.

**Predictions:**

1. **The `one-at-a-time` beat will expose a real data-shape gap.** It is authored as ONE beat, but
   the scene needs SIX private conversations, each different, played by six different personas. I
   predict the brief has no way to express "this happens once per player, with per-player content,"
   and the transcript will have to invent all six conversations from the single `direction` note
   with no data support — which is fine for a GM improvising live, but means the brief is not
   actually carrying the content it claims to for this beat.
2. **LATERAL THINKER will beat the DC ladder rather than use it.** I predict they will propose an
   approach to "what does irregular mean" that is not one of the five authored checks (asking a
   different candidate who already knows, or claiming the box themselves before Shucks announces
   it) and that pricing it will require real GM judgement the brief's own ladder note does not fully
   resolve — because "costs something real" is stated as a principle, not worked through as an
   example for a genuinely new approach.
3. **CHAOS AGENT refusing the medical outright will have nowhere to go.** The brief marks
   `one-at-a-time` and `the-flag` as `mandatory: true`. I predict there is no authored answer for
   "the character refuses to be examined," and the transcript will have to invent a consequence
   (a black mark, a second appointment) that doesn't exist anywhere in the data.
4. **The clerk and Form 12-B will underperform relative to how they read on paper.** The joke is
   good in isolation; I predict it will feel disconnected from the rest of the scene in an actual
   run — nothing else references it, so QUIET ONE and BRUTE will have no reason to engage it at all,
   and it will sit as an optional beat nobody takes.
5. **The all-six realisation will land fine.** Of everything in the scene, I predict this is the one
   beat that needs no fixing — the three ranked fallbacks already cover every way a table could fail
   to notice on their own.

---

## 6. Report format

Two sections, kept separate on purpose — a UI bug and a content problem want different fixes, and
conflating them is how a real bug ends up "fixed" by rewriting prose instead of code.

- **Table feel.** What did the transcript actually surface — dead ends, beats nobody had a reason to
  take, places the ladder didn't resolve, curveball damage. Judged against the predictions in §5,
  not in the abstract.
- **UI/UX.** For every clickable claim the transcript makes (a tick, a recorded outcome, a reveal, a
  grant), the tier-3 check against the live panel, and its actual result — pass, or a real finding.

Findings that change data go back through create → analyse → critique → evolve on the content
itself. Findings that change the schema or the adapter become normal commits, same as any other bug
found live this session.

---

## 6a. The first run — against predictions, not after them

Run 2026-09-09, same session the predictions in §5 were committed. Full transcript is
`docs/simulations/episode-c1e1--intake-medicals-2026-09-09.md`; excerpted findings below.

### Predictions vs. what happened

| # | Predicted | Result |
|---|---|---|
| 1 | `one-at-a-time` has no data structure for six different private conversations | **CONFIRMED.** All six were invented at the table from one `direction` note. Not wrong to leave this to GM improvisation, but the brief has no worked example of what "two or three questions each" sounds like for six different players, and should. |
| 2 | Lateral Thinker beats the ladder rather than uses it | **CONFIRMED, with a sharper edge than predicted.** Fen asked a bystander rather than Shucks. Pricing it required a real judgement call the ladder note doesn't pre-answer: which skill, and is a bystander "the obvious way" or something else? Priced at DC 15 on the spot. Worked, but needed invention the doc claims is already resolved. |
| 3 | Chaos Agent refusing outright has nowhere to go | **CONFIRMED exactly.** Nothing anywhere addresses a flat refusal of a `mandatory` beat. Improvised a cost ("no kit issue this afternoon") that happened to work; a less confident GM has no floor here at all. |
| 4 | Form 12-B underperforms relative to how it reads on paper | **CONFIRMED.** Landed for exactly one persona (the one built to engage NPCs) and was invisible to the other five, who had a form to fill in and no reason to linger. |
| 5 | The all-six realisation needs no fix | **CONFIRMED — but conditionally.** It only landed cleanly because the queue beat had already done its bonding work. A table that rushed the opener would likely need fallback #1 or #2 more often than the brief's confidence implies. |

**Four of five predictions confirmed outright; the fifth confirmed with a caveat the prediction
itself didn't anticipate.** That is itself informative — it means the read that produced these
predictions (a GM who has now written and reviewed a lot of this content) is tracking real gaps
correctly, which is worth knowing before trusting the same read on unreviewed scenes.

### Tier 3 — live UI cross-check

Every mechanical claim the transcript made was then performed against the actual running panel,
not narrated: reset run state to empty, ticked `the-queue`/`one-at-a-time`/`the-flag`/`all-six`
(all four mandatory beats, matching the transcript exactly), recorded a `success` outcome on
`what-does-irregular-mean` standing in for Fen's invented approach, and left `the-form-itself`
untouched since nobody attempted it in the transcript.

**Result: exact match, no discrepancies.** Progress read `4/4`; the four ticked beats rendered
`--done --mandatory`; the untouched conditional beat stayed `--conditional`, unpressed; the
artefact stayed un-granted and its grant button stayed live. Nothing here found a UI bug — this
run's findings are entirely tier-2 (content), not tier-3 (panel) — which is itself a real result:
the plumbing built and live-verified earlier this session held up under a genuinely adversarial
narrative run, not just the happy-path clicks that first proved it worked.

### What this changes

Three of the four confirmed findings point at the same underlying gap: **`mandatory: true` states
that a beat must happen, but nothing in the schema carries what happens if a player declines, and
nothing carries per-persona variation for a beat that structurally repeats once per player.**
Neither is a UI problem. Both are schema/authoring gaps, and both are now real backlog rather than
things a GM has to reinvent live every time — tracked in the issue this run's own findings opened
(see the repo's issue tracker, same day).

## 7. Not yet a tool

This is a documented procedure, run by hand, not a one-command Skill. Worth revisiting once it has
been run a few more times and the shape has stopped changing — see #136-adjacent tracking issue.

---

*Related: `tools/battle-simulator/DESIGN-LOG.md` §16-17 (the methodology this borrows);
`design/strategy-layer.md` (create → analyse → critique → evolve);
`data/scene-briefs/episode-c1e1--intake-medicals.json` (the scene under test).*
