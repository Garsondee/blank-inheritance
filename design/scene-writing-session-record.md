# What a full scene-writing pass on two episodes actually found

A record of one sustained pass over Episodes One and Two, kept because the
findings are now scattered across a dozen files and nothing says why any of them
happened. Read it before the next episode is written.

It is not a changelog. Git has that. It is the set of defects worth expecting
again, and the checks that did and did not catch them.

---

## 1. The measurement that reframed everything

Ingram supplied a set of scenes another model had rewritten, and asked for a diff
against the originals. Keyed by scene id rather than array index — the first
attempt compared indices and reported two fields "lost" that were both present,
because the episode had grown from 9 scenes to 11.

| | changed | added | deleted |
|---|---|---|---|
| fields across 12 files | 120 | **0** | **0** |

**It added nothing and removed nothing. It only rewrote prose.**

What it stripped, by class:

| defect | before | after | removed |
|---|---|---|---|
| date stamps | 76 | 6 | 92% |
| `REBUILT`/`REVISED`/`NEW`/`ADDED`/`CORRECTED` labels | 29 | 0 | **100%** |
| correction archaeology | 11 | 2 | 82% |
| verbatim quotes of Ingram | 15 | 6 | 60% |
| file-path citations | 50 | 23 | 54% |

Roughly **one word in eight** of the original prose was changelog.

The clearest single comparison, `intake-medicals :: beats[the-flag].note`, 1,915
characters:

> **Was:** "PLANT - mystery ledger #1, payoff chapter deliberately unassigned
> (ch1-v2.md §5's whole payoff column was cleared 2026-09-13 and hasn't been
> reassigned; this note previously claimed 'pays off Chapter 6', stale for the
> same reason…"
>
> **Became:** "HOW TO PLAY IT. Shucks runs this screen personally on every
> intake, and he is under a completely ordinary operational-security order not to
> name the Directorate's compatible pilots before the Directorate does."

One told the GM the history of the note. The other told the GM how to play the
beat.

**The lesson is not "write better prose."** It is that the structure was sound
and every structural check kept reporting clean while the real defect sat in
front of it. A green audit is not evidence that a scene is good.

---

## 2. Defects that only appear when scenes are read as a body

None of these were findable one file at a time, and none are lintable without an
unacceptable false-positive rate.

**Style attractors.** A construction is correct once and a tic by the fifth use.
`X's own Y` reached 69 uses before anyone noticed. `not X so much as Y` was caught
at two, in adjacent scenes. `Nobody is…` became the default way to close a quiet
beat — eight across one episode, added without re-counting.

*The procedure, from `gm-facing-prose-style.md` §8d:* at the end of a writing
pass, count each construction, look at every instance in context, keep the one or
two that genuinely earn it, rebuild the rest. **Do not fix them all** — two is a
voice, five is a habit.

*And a trap:* swapping `Nobody` for `No one` is a synonym, not a rebuild. The
construction is identical and the tic just moves.

**A brief that previews instead of generating.** Five cast members had voice
samples that appeared verbatim in the same scene's read-alouds. Every field was
individually good; the brief simply gave a GM nothing for the question the scene
never anticipated. Only visible by asking what is left *after* the script runs
out.

**Chronology inside a scene.** School: Period One ran its diegetic warning — a
student punished for arguing with the textbook — *before* the passage was read.
He was objecting to something the table had not heard.

**A door with nothing behind it.** Episode One records "WHICH PC HOLDS THE
CONTACT ROUTE. This is the single most important thing to record in Episode One."
Episode Two gated it correctly and then offered, on a menu where every other entry
had a specific authored return: *"Returns: whatever the city returns."*

**A payoff asserted in one file only.** Four of eight new checks claimed a payoff
where the receiving scene had no beat, no check, or already gave the same thing
away free. Writing "PAYS OFF AT THE TRAM" feels like wiring and is a sentence.
*Rule: open the named file, confirm the receiving end exists, and add a
`carriesIn` there so the link is visible from both ends.*

---

## 3. Content authored against a feature that did not exist

Twice, one level apart:

- **80 bold spans across 16 files** rendered as literal asterisks. The style doc
  sanctioned one bold span per field; nothing implemented it.
  Fixed: `core/emphasis.mjs`, applied strictly after HTML-escaping.
- **Nine Character Cards** with Facts no GM could see. `social-store.mjs`'s own
  comment said the authored side "is generated from `data/npcs/*.json` by the sync
  pipeline." That step was never written.
  Fixed: `core/authored-profile.mjs` + `syncAuthoredProfile()`.

**Before authoring against a documented feature, confirm something renders it.**

---

## 4. Two verification habits that failed silently

Both looked like they were working.

1. A lint appended by shell heredoc had `\b` written as a literal backspace
   character, so the regex matched nothing. It passed while catching zero of three
   real violations sitting in the corpus.
2. `npm test | tail -20 | grep "^not ok"` — `tail` discards the failure lines
   before grep sees them. Two runs reported counts with no names.

**Rules that came out of it:** never write code containing backslashes through a
heredoc; prove a test red against known-bad input before trusting it green; grep
before you truncate.

---

## 5. What a rule may and may not do

Three craft checks were tried as tests and **pulled** for false positives:
non-visual openers (silence and a bell are correct openers no word list catches),
refusal floors (written a dozen valid ways), and required landmarks (a six-town
montage has nothing to orbit).

**A rule that blocks correct writing gets switched off, and then it protects
nothing.** Prefer a narrow rule with no false positives. Where a scene is
deliberately missing something an audit looks for, say so in that scene's own
`notes` — `tools/scene-audit/audit.mjs` reads them and stops.

The same trap inside the tooling: the audit's payoff check held a hardcoded list
of scene titles and flagged a correct claim the moment a scene was added. It now
derives titles from the episodes.

---

## 6. Where the two episodes ended up

| | Episode One | Episode Two |
|---|---|---|
| Scenes | 11 | 15 |
| Beats with read-aloud | 29/62 (47%) | 49/81 (60%) |
| Spoken prose | 2,668 words | 3,958 words |
| Craft audit | 0 findings | 0 findings |
| Emotional arrows | `~ + + ~ + + - ~ +/- ~ +` | `- +/- ~ +/- + + +/- + + + ~ - - -/+ ~` |
| Authored table time | 3¼–4¼ h | 5–6¼ h |

121 read-alouds, no construction above five uses. Date stamps and status labels
at zero across 513k characters of play-facing text.

**The table-time figures are each scene's own estimate and have never been
checked against a real table.** The ratios between scenes are more trustworthy
than the totals.

---

## 7. The two encounters, and what they already occupy

Checked against each other rather than individually, because two fights across
two episodes should not be the same fight. They are not — and the contrast is
worth stating so the third one does not accidentally repeat either.

| | Flood Tunnel Clearance | First Contact |
|---|---|---|
| Scale | personnel | Frame |
| Threat | moderate | severe |
| Enemies | **6 × level -1** — many and weak | **3 × level 2** — few and strong |
| Space | one enclosed room, **shrinking** | 200 yards of open road |
| Objective | clear the drains | **empty the road of civilians**, not destroy anything |
| Pressure | a compactor closing in — positional | forty people in the way — tactical and moral |
| Light | dark, one amber source | daylight |

Both are authored as a situation, a map and a set of behaviours rather than as
stat blocks, and both reskin existing creatures instead of statting new ones.

**What is now taken:** the swarm-in-a-shrinking-box, and the protect-the-crowd in
a long open lane. A third encounter that is *few strong enemies in an open space
where the objective is to destroy them* would be First Contact with the interest
removed.

**The third shape is now authored:** `data/encounters/c1e3-the-call-out.json`.
One enemy, indoors, with a real vertical axis — a generating hall with walkways
at twelve and thirty feet and a working gantry crane. The party arrives *second*,
by order rather than by choice, and the thing inside wants something in the
building rather than wanting them. A pilot standing on the first walkway is
eye-to-eye with a machine on the floor, which is the first time the two scales
have had a tactical reason to separate.

It is deliberately only Moderate and singular, which is the risk the first two
encounters avoided by using numbers. The mitigation is that the building gives
the party far more options than a road did, and no result requires beating it —
driving it out, containing it under the crane, or letting it finish and leave all
resolve the encounter.

**It is not placed in an episode yet**, and its own notes say so. What it was
looking for, and why it skipped the one turbine housing rebuilt after First
Impact, are undecided and belong with `arc-contacts-that-never-travelled`.

---

## 8. The method, stated plainly

**Run the lint and the audit first. Then read the scene yourself, start to
finish, before calling it done.**

The automated checks only find mechanical problems: date stamps, broken
references, missing fields, a DC off the ladder. They are worth running first
because they clear that noise out of the way. They are not evidence that a scene
is any good.

Three of this pass's most useful findings came from reading, and no tool found
any of them:

- 80 bold spans rendering on screen as literal asterisks.
- Nine Character Cards with no path to anything that could display them.
- A menu option — holding the most important thing recorded in Episode One —
  that read "Returns: whatever the city returns."

Every check reported clean the whole time.

---

*Related: `gm-facing-prose-style.md` (the standard and its lint list),
`scene-audit.md` §8–§9 (the per-scene loop, its escape hatch, the emotional-arrow
pass), `craft-library.md` (the theory these checks are derived from).*
