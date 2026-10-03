# Scene requirements: the Standard

*Drafted 2026-10-01 at Ingram's request. **A proposal**: when she approves it (with her changes), it becomes a
decision in `canon/decisions/` and version 1 of the Standard. Companions: [`stage.md`](stage.md) (the
stage systems these requirements feed) and [`situation-scenes.md`](situation-scenes.md) (the third kind of scene).*

---

## 0. In short

- **A scene is eligible for play** when it meets every *required* item for its **shape** at the current version of
  this Standard, and Ingram has approved it in canon.
- **Four shapes**: Short, Open, Situation, Fight (§3). The requirements differ by shape, so a short connective scene
  is not asked for the machinery of an investigation.
- **The requirements are numbered** (SR-A1 to SR-J5), and each says how it is checked: by `story check` and the tests
  where a machine can tell, by the re-read and Ingram's read where only a person can.
- **The new layer is staging** (group D): blocking, zones, subscenes, blueprints, name captions, and a rig for each painting. No scene has it yet, so
  **every built scene falls below this Standard**, as Ingram expected. They keep running at the table with an amber
  badge until they are rebuilt; nothing ever blocks a session.
- **This is one standard, not a fourth checklist.** The re-read stays the method, the Standard is the specification,
  and §9 proposes how the Sign-Off folds into it.

---

## 1. Why now

Ingram, 2026-10-01:

> "We need a formal list of requirements document for scenes and we need to start getting serious about that. The
> theatre of the mind enhancements I have in mind represent a massive leap up in content so this new level of
> requirements mean our old scenes would fail that and need to be modified to be eligible for play."

The project already checks a great deal (the re-read's twenty-five questions, the Sign-Off's seventy-eight checks,
`story check`'s fact rules, the prose lints). What it lacks is one place that says **what a scene must contain** to
be played, by kind of scene, with a version number. The stage work makes that urgent: zones, debuts and blueprints
are data a scene has to carry, and a scene without them gives the table nothing to see.

---

## 2. What "eligible for play" means

- **The report.** `node tools/story/story.mjs standard <scene>` lists every requirement for the scene's shape, with
  pass, fail or "read" (needs a person), and the version. `story check` runs it for every canon scene.
- **The Runner's badge.** A scene at the Standard shows nothing extra. A scene below it shows an amber badge ("Below
  standard: 6") on its line in the running order, and cueing it asks once for a confirm, the same way a drafted scene
  already does. **Never a hard block**: a session must never stop because a scene is missing a field (the one-press
  rule for anything used live).
- **Approval records the version.** When Ingram approves a scene, the decision records the Standard version she read
  it against. Raising the version marks approved scenes "stale against v2" for the new items only, and nothing
  else about them changes (the rule the Sign-Off's checklist versions already use).

---

## 3. The four shapes

A new scene field, `shape`, separate from the two that exist: `mode` says how SF2E resolves the scene (social,
exploration, combat...) and `spectrum` sets the Runner's banner (story, mixed, downtime). Shape says **how the scene
is built**.

| Shape | What it is | Examples (proposed, §7) |
|---|---|---|
| **Short** | One job, played through in order. The GM knows what happens; the table chooses how they meet it. | The Tram Back, The Walk Down, Assembly |
| **Open** | A place with no goal: a menu of things that can happen, and people with long memories. | the ten night rests, the Paper Lantern, the Magic Show |
| **Situation** | A goal with no script: a problem, places, people who want things, and pressure. The table decides how; the scene is prepared for the likely ways (`situation-scenes.md`). | The Errand, Intake Medicals, Kit Issue |
| **Fight** | A fight, on a battle map or in theatre-of-the-mind zones. | Flood Tunnel Clearance |

**Telling them apart**, in order: is it a fight with stat blocks? **Fight**. Is there a goal the party must reach?
If not, **Open**. If there is, does the party choose how, with more than one place to go, person to work or way to
try? **Situation**. Otherwise **Short**.

**Exceptions are recorded, not assumed.** Scene 0, From Up Here, is a Short scene with no rolls by decision (D048);
the Standard reads that decision and passes the scene on the items it covers.

---

## 4. The requirements

Columns: **Shapes** (S Short, O Open, Si Situation, F Fight; "all" for all four). **Level**: *R* required, *r*
recommended. **Checked by**: `auto` (a machine check that exists today), `auto+` (a machine check to build with this
Standard), `read` (the re-read, then Ingram's read), with the re-read question where one exists.

### A. When and where

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-A1 | The scene declares its shape. | all | R | auto+ |
| SR-A2 | It is in the plan with a day and a rough time, and every "yesterday" or "this morning" agrees (R14). | all | R | auto (`story check`, `story time`) |
| SR-A3 | It has a place on the map (`intro.position.locationRef`), or a decision says why not. | all | R | auto+ |
| SR-A4 | Every picture it shows is assigned art from the asset registry: the background and each subscene. | all | R | auto+ |
| SR-A5 | Its scene transition is declared (staging doc §11: "we ALWAYS use transitions"). | all | R | auto+ |
| SR-A6 | Its light is declared: outdoor, windowed or interior (staging doc §12.4). | all | r, then R when light ships | auto+ |
| SR-A7 | Every place agrees with the map and with the other scenes (R24). | all | R | read |

### B. The job

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-B1 | One sentence says what the scene is for (`goal`), and it compresses (R1; Sign-Off C1). | all | R | read |
| SR-B2 | It says how it ends (`outro.endsWhen`) and names its end states: at least one, and at least two for Situation and Fight (a good one and a fail-forward one). | all | R | auto+ count, read |
| SR-B3 | It names what carries forward (`carryForward`, `outro.writeDown`) for the scenes after it. | S, Si, F | R | read |
| SR-B4 | **The floor**: what is true however it goes, so the story can always continue (never by prescribing the approach). | Si | R | auto+ presence, read |
| SR-B5 | It is the length its job needs (R23). | all | R | read |

### C. The people

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-C1 | Every NPC present is a canon person with a portrait, or a deliberate silhouette that the scene says is deliberate. | all | R | auto+ |
| SR-C2 | Every NPC present has a stat block with at least Perception, Will and a Deception DC; anyone who could fight has a full combat stat block (R9). | all | R | auto+ |
| SR-C3 | Every NPC the party can talk to has a conversation map: starting attitude, wants, what they say freely, what a check gets (skill, DC, result), what they won't say (and how they deflect), and five to eight likely questions answered in their voice (R7, R8). | all | R | auto+ minimums, read |
| SR-C4 | Everyone whose name the table has not been told has a `called` line and a name timing: on arrival, at a trigger, or later (staging doc §12.2). | all | R | auto+ |
| SR-C5 | Everyone who may be met for the first time here has a **player-safe caption line** for their debut, never their `role` (stagecraft §3.4). | all | R | auto+, and the names leak test |
| SR-C6 | Everyone's entrance and exit can be worked out: a family, a signature, or a written choice (stagecraft §3.5). | all | r | auto+ |
| SR-C7 | Every NPC asks something of the party, not only gives (beat reciprocity). | S, Si, O | R | read |
| SR-C8 | An NPC who appears in other scenes is the same person here: their other scenes were re-read before casting. | all | R | read |

### D. Staging (new with this Standard)

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-D1 | **Default blocking**: a formation, and positions where they matter (stagecraft §5.7). | all | R | auto+ |
| SR-D2 | **Zones**: every place in the picture the party can go to, look at closely, or fight from is a zone with a name, a kind (door, spot, area, exit, track), a gate and a shape (stagecraft §8). | Si, F | R | auto+ |
| | | S, O | r | auto+ |
| SR-D3 | Every door zone leads somewhere: a subscene with art, another scene, or an exit. No dead doors. | all | R | auto+ |
| SR-D4 | Hidden zones and unknown rooms are absent from what players receive until revealed (Law 11). | all | R | auto+ (a leak test, like `leaksNames`) |
| SR-D5 | A building the party explores room by room (three rooms or more) has a **blueprint**: rooms, doors, stairs, exits, its outline from the location's real footprint (stagecraft §9). | Si, F | R | auto+ |
| SR-D6 | If the party can split up, the scene says what each group can find and how their time runs, and what happens when they regroup (stagecraft §8.5). | Si | R | read |
| SR-D7 | **Stage proof**: the staging is drawn to images (picture, zones, blocking, blueprint, name captions) for Ingram's read. | all | R once the proof tool exists | auto+ |
| SR-D8 | No caption, zone label or blueprint covers a face or a key, on a 1920 and a 2560 screen. | all | R | read (the stage proof) |
| SR-D9 | The picture it stands in has a **rig**: horizon, floor, depth, card size, clear-deck and lights (`diorama.md` §10). Made once per painting and shared by every scene that uses it. | all | R | auto+ |
| SR-D10 | Every place a card is put is on the floor and clear of the deck, and every set piece, zone outline and track point lies on the picture (`diorama.md` §2.4, §11.1). | all | R | auto+ |

### E. Play

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-E1 | Wherever a PC acts, a check is offered, or the scene says why not (R4). | all | R | read |
| SR-E2 | Every check has all four degrees of success written, and each one changes something (story-data-refactor §9.3). | all | R | auto+ |
| SR-E3 | A critical failure escalates, a failure has a way forward, a critical success gives something extra (R6). | all | R | auto+ presence, read |
| SR-E4 | A dilemma the group faces resolves through rolls (R5). | S, Si | R | read |
| SR-E5 | The skills vary across the scene and its neighbours (Sign-Off Q9). | all | r | auto+ |
| SR-E6 | **Unexpected moves**: one line each for attacking, refusing or walking out, lying, stealing, sneaking or breaking in, following someone, splitting up, and asking about something unplanned, saying who reacts and what is rolled (R10). | S, Si | R | auto+ presence, read |
| SR-E7 | DCs come from the level-based table (`reference/tables/`) unless the scene says why. | all | R | auto+ |

### F. Situation scenes ([`situation-scenes.md`](situation-scenes.md))

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-F1 | **The situation map**: every place (zone, room or subscene) has an arrival line (three sentences at most), who and what is there, and its look-closer checks. | Si | R | auto+ presence, read |
| SR-F2 | **Likely moves**: for every place, each of the twelve move families (situation-scenes §4.5) has at least one prepared response or a note that it doesn't apply there. | Si | R | auto+ coverage |
| SR-F3 | Every prepared response starts from "If they…", and gives the SF2E action or skill, the DC, the four outcomes, and what changes (a place, the clock, an attitude, a discovery). | Si | R | auto+ |
| SR-F4 | **Three routes**: every discovery the scene needs can be reached at least three different ways (different places, people or skills). | Si | R | auto+ count |
| SR-F5 | **The clock**: pressure is a visible clock, every tick has a cause in the fiction, and its cost is visible before it bites (Law 19). | Si with a deadline | R | auto+, read |
| SR-F6 | **Valves**: what moves the scene on if the table stalls (a temptation, someone who comes to them, the clock), and what happens if they ignore the goal. | Si | R | auto+ presence |
| SR-F7 | **No dead ends**: every prepared response leads back into the map or to an end state. | Si | R | auto+ (a graph check) |
| SR-F8 | **Simulated**: run against the persona roster with predictions written first; every miss became a response or a valve (scene-simulation-testing). | Si | r | read |
| SR-F9 | Nothing says what the table will do, think or feel (`feedback_never_predict_player_response`): preparation, never prediction. | Si | R | auto+ lint, read |

### G. Open scenes ([`haunts.md`](../haunts.md))

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-G1 | The deck: eight to twelve events, mixed kinds, no idea repeated within this place or across places. | O | R | auto+ count, read |
| SR-G2 | Every roll in the deck pays on all four degrees. | O | R | auto+ |
| SR-G3 | Regulars have a line for each of the five attitudes and doors (what their attitude opens and closes). | O | R | auto+ |
| SR-G4 | A danger event has a way out that isn't a fight, and a `fight` block (press, retreat, surrender) where it is one. | O | R | auto+ |
| SR-G5 | A night's rest has its rest block (how much HP, which buff). | O with a rest | R | auto+ |

### H. Fights

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-H1 | A defensible pure-SF2E encounter first: the XP budget from the level table (design-layers Layer 0). | F | R | auto+ |
| SR-H2 | Every foe has a full stat block and one line on what it is doing, and when it flees or gives up. | F | R | auto+, read |
| SR-H3 | A theatre-of-the-mind fight has its positions as zones, with range links (engaged, near, far) and terrain in SF2E's own terms (cover, difficult, hazardous). | F without a map | R | auto+ |
| SR-H4 | At least two ways to end it besides killing everything. | F | r | read |

### I. Words (the re-read)

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-I1 | Every part earns its place; directions only where critical; negatives only where critical; nothing prepared for something the scene's shape rules out (R1, R2, R16 to R18). | all | R | read |
| SR-I2 | Clean: nothing the GM reads mentions how the scene was made (R3). | all | R | auto (`tier2-no-provenance-in-play-text`), read |
| SR-I3 | Read-aloud sounds like a person talking, in full sentences, with every coined word explained the first time (R15, R21, R22). | all | R | read |
| SR-I4 | The GM-facing prose style (`gm-facing-prose-style.md`). | all | R | auto (`tier2-scene-prose-style`), read |
| SR-I5 | There is one thing a player would retell (R11). | all | R | read |
| SR-I6 | All of Ingram's detail on what it covers is used (R25). | all | R | read |

### J. Canon and safety

| Id | Requirement | Shapes | Level | Checked by |
|---|---|---|---|---|
| SR-J1 | Every fact it states is cited, and nothing is told before its time (R12, R13). | all | R | auto (`story check`) |
| SR-J2 | Nothing reaches the table before its reveal, and nothing player-facing names an outside work or a real place. | all | R | auto partly, read |
| SR-J3 | Every handout is filed to Papers with the players it goes to. | all | R | auto (`tier3-handouts-contract`) |
| SR-J4 | Published stage data never carries an unrevealed name, id or file path. | all | R | auto (`leaksNames`) |
| SR-J5 | Anything that flashes or moves fast has its calm version. | all | R | auto+ |

---

## 5. The matrix

How many items are required (R) or recommended (r) for each shape:

| Group | Short | Open | Situation | Fight |
|---|---|---|---|---|
| A. When and where | 6R 1r | 6R 1r | 6R 1r | 6R 1r |
| B. The job | 4R | 3R | 5R | 4R |
| C. The people | 7R 1r | 7R 1r | 7R 1r | 6R 1r |
| D. Staging | 7R 1r | 7R 1r | 10R | 9R |
| E. Play | 6R 1r | 4R 1r | 6R 1r | 4R 1r |
| F. Situation | – | – | 8R 1r | – |
| G. Open | – | 5R | – | – |
| H. Fights | – | – | – | 3R 1r |
| I. Words | 6R | 6R | 6R | 6R |
| J. Canon and safety | 5R | 5R | 5R | 5R |

(Counted from §4; the report in §2 computes it from the same data rather than this table.)

---

## 6. What has to be built to check it

- **`story check` rules** (`auto+` above): shape present; staging present and well formed; zones valid (closed
  shapes, known kinds and gates, names); every door leads somewhere; blueprint rooms connected through doors; caption
  lines present and player-safe; the painting has a well-formed rig; every place is on the floor and clear of the deck; `called` lines and name timings; four degrees on every check; DCs on the level
  table; the likely-moves coverage table; three routes per needed discovery; no dead ends; a cause on every clock
  tick; the "If they…" lint.
- **Tests** in `test/canon.test.mjs` for each rule, and a leak test for hidden zones and unknown rooms.
- **`story standard <scene>`**: the report.
- **Re-read questions for staging**, proposed as R26 to R30 for `canon/reread.md`:
  - R26 Look at the stage proof. Is any face or key covered, at either screen size?
  - R27 Does every zone's name say what the picture shows there?
  - R28 Could a player tell, from the picture and the labels alone, where they can go?
  - R29 For each place: what is the first thing a player will probably try here, and is it prepared?
  - R30 If the table splits, does every group have something to do?
- **The stage proof tool** (stagecraft §10): the lab's renderer, pointed at a canon scene.

---

## 7. The old scenes

All twenty-seven built scenes fall below this Standard, mostly on staging (D), stat blocks and conversation maps (C2,
C3, already known from story-data-refactor §10), and, for the situation-shaped ones, the situation map (F). They are
rebuilt in canon in play order anyway; each rebuild now meets the Standard.

Proposed shapes for Chapter 1 (Ingram's call, §10):

| Scene | Proposed shape | Why |
|---|---|---|
| From Up Here | Short (no rolls, D048) | one speech |
| The Road In | Short | each arrives on their own morning; one job each |
| Intake Medicals | Situation | stations, people to read, a flag to notice |
| Assembly | Short | a speech they can't interrupt |
| School: First Period, Second Period | Short | a lesson with moments |
| Kit Issue | Situation | a store, a storekeeper with wants, things to find |
| The Errand | Situation | a problem in the city, a deadline, several ways |
| The Tram Back | Short | connective |
| Canteen | Open | a room full of people, no goal |
| The Walk Down | Short | a deliberate relax beat |
| Flood Tunnel Clearance | Fight | three ways to end it |
| The ten night rests, The Paper Lantern | Open | haunts |
| The Magic Show | Open | a one-time discovery |

Until a scene is rebuilt it runs with the amber badge and a confirm.

---

## 8. Versions

- **v1** is this list as Ingram approves it.
- When a session finds a failure the Standard should have caught, a requirement is added (or tightened) and the
  version goes up. Approved scenes are marked stale against the new items only.
- A requirement keeps its id for good, as re-read questions do. New ones go at the end of their group.

---

## 9. One standard, not a fourth checklist

- **The re-read** (`canon/reread.md`) stays the method: how Claude reads a scene before Ingram does. Its questions
  are cited by the requirements they check.
- **The Standard** is the specification: what a scene must contain, by shape.
- **The Sign-Off** (`scene-signoff.md`): story-data-refactor §15 already proposes that, for canon scenes, Ingram's full
  read and the approval decision replace the seal. This proposes the next step: the Sign-Off's Completeness items move
  into the Standard (most already have; the rest are listed by the report as "from the Sign-Off"), its Place pass
  becomes the stage proof (SR-D7), and its Quality pass is the re-read. Her call.
- **`haunts.md`**'s writing rules are group G; `gm-facing-prose-style.md` is SR-I4.

---

## 10. Ingram's calls

1. **The four shapes** and the field name `shape`.
2. **Required and recommended**, item by item: anything to drop, demote or add.
3. **Below standard**: an amber badge and one confirm, never a block?
4. **The Sign-Off**: fold it into the Standard for canon scenes (§9)?
5. **The Chapter 1 shapes** in §7.
6. **Staging re-read questions** R26 to R30.
