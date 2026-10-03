# Chapter 1 · the plan

Every scene in play order, with a rough day and time of day, and its state.

- **Day 0** is the days before intake, when each character arrives. **Day 1** is the first day of intake (Episode One). **Days 2 and 3** are Episode Two.
- **Time** is rough: early morning, morning, late morning, midday, afternoon, evening, night, or flexible or unknown when a scene has no fixed time.
- **State**: awaiting-read (rebuilt in canon, waiting for Ingram to read all of it), approved (she has, and said it's good), old-draft (not yet rebuilt; the old version still runs in Foundry), unwritten.

## Episode One: Mother's Maiden Name

| # | Scene | Id | Day | Time | State | Note |
|---|---|---|---|---|---|---|
| 0 | From Up Here | `episode-c1e1--from-up-here` | — | early morning | awaiting-read | The camera's view. Nobody is anywhere yet. |
| 1 | The Road In | `episode-c1e1--the-road-in` | 0 | morning | awaiting-read | Each arrives on their own morning, in the days before intake. |
| 2 | Intake Medicals | `episode-c1e1--intake-medicals` | 1 | morning | awaiting-read |  |
| 3 | Assembly | `episode-c1e1--assembly` | 1 | late morning | awaiting-read |  |
| 4 | School: First Period | `episode-c1e1--school-first-period` | 1 | midday | awaiting-read |  |
| 5 | Kit Issue | `episode-c1e1--kit-issue` | 1 | afternoon | awaiting-read |  |
| 6 | School: Second Period | `episode-c1e1--school-second-period` | 1 | afternoon | awaiting-read |  |
| 7 | The Errand | `episode-c1e1--the-errand` | 1 | afternoon | awaiting-read | Due back by nineteen-hundred. |
| 8 | The Tram Back | `episode-c1e1--the-tram-back` | 1 | evening | awaiting-read | The requisition goes in before nineteen hundred. |
| 9 | Canteen | `episode-c1e1--canteen` | 1 | evening | awaiting-read | Supper. Dock C at twenty-one hundred. |
| 10 | The Walk Down | `episode-c1e1--the-walk-down` | 1 | night | awaiting-read |  |
| 11 | Flood Tunnel Clearance | `episode-c1e1--flood-tunnel` | 1 | night | awaiting-read | Ends on each player's choice of rest. |

## Episode Two: Scheduled Exercise

| # | Scene | Id | Day | Time | State | Note |
|---|---|---|---|---|---|---|
| 0 | As Discussed | `episode-c1e2--as-discussed` | 2 | morning | old-draft |  |
| 1 | The Board | `episode-c1e2--the-board` | 2 | morning | old-draft | Mid-morning. |
| 2 | School: Period One | `episode-c1e2--school-period-one` | 2 | late morning | old-draft |  |
| 3 | Slack Water | `episode-c1e2--slack-water` | 2 | midday | old-draft | Low tide. |
| 4 | School: Period Two | `episode-c1e2--school-period-two` | 2 | afternoon | old-draft |  |
| 5 | The Long Afternoon | `episode-c1e2--the-long-afternoon` | 2 | afternoon | old-draft | Until evening muster. |
| 6 | The Override | `episode-c1e2--the-override` | 2 | evening | old-draft | Evening muster. |
| 7 | The Night Off | `episode-c1e2--the-night-off` | 2 | night | old-draft | From muster into the night. |
| 8 | Zero Six Hundred | `episode-c1e2--zero-six-hundred` | 3 | early morning | old-draft | 0600. |
| 9 | Familiarisation | `episode-c1e2--familiarisation` | 3 | early morning | old-draft | 0700. |
| 10 | The Exercise | `episode-c1e2--the-exercise` | 3 | morning | old-draft |  |
| 11 | Unidentified Contact | `episode-c1e2--unidentified-contact` | 3 | morning | old-draft | First plot 0841. |
| 12 | First Contact | `episode-c1e2--first-contact` | 3 | morning | old-draft |  |
| 13 | The Hammer | `episode-c1e2--the-hammer` | 3 | evening | old-draft | An hour before dark. |
| 14 | The Names Are Still Up | `episode-c1e2--the-names-are-still-up` | 3 | night | old-draft | After dark. |

## The night's rest

After Flood Tunnel Clearance each player chooses their own rest on The City (D050); almost all come back after The
Names Are Still Up. Every one restores a fraction of maximum HP, and only the hospital restores all of it. Ingram approved all ten (D051);
each is written as a haunt (a place the group comes back to) and waits for her read.

| # | Scene | Id | Day | Time | State | Note |
|---|---|---|---|---|---|---|
| 1 | The General Hospital | `rest--general-hospital` | 1 | night | awaiting-read | Full HP, nothing else. |
| 2 | An Early Night | `rest--early-night` | 1 | night | awaiting-read | Half. The bunk. |
| 3 | The Bathhouse | `rest--bathhouse` | 1 | night | awaiting-read | Half, and temporary HP. |
| 4 | The Shrine Gate | `rest--shrine-gate` | 1 | night | awaiting-read | A quarter, and a fortune drawn. |
| 5 | The Crew Mess | `rest--crew-mess` | 1 | night | awaiting-read | A quarter. The bar. |
| 6 | The Card Game | `rest--card-game` | 1 | night | awaiting-read | A quarter, and a gamble. |
| 7 | The Rumour Mill | `rest--rumour-mill` | 1 | night | awaiting-read | A quarter, and rumours. |
| 8 | The Roof | `rest--the-roof` | 1 | night | awaiting-read | Half, and the city by night. |
| 9 | The Night Observer | `rest--met-office` | 1 | night | awaiting-read | A quarter, and tomorrow's weather. |
| 10 | The Night Shift | `rest--night-shift` | 1 | night | awaiting-read | A quarter, and a night's pay. |
| 11 | The Paper Lantern | `rest--the-paper-lantern` | 1 | night | awaiting-read | A quarter. The civilian bar, off base. |

### Somewhere new

A player can choose somewhere new instead of a rest they know, without knowing what or where it is (D052). On the
first night, it is the Magic Show, which plays once.

| # | Scene | Id | Day | Time | State | Note |
|---|---|---|---|---|---|---|
| 1 | The Magic Show | `discovery--the-magic-show` | 1 | night | awaiting-read | The first discovery (D052). |

### The ten, as approved (D051)

HP is a fraction of each character's maximum (`core/rest.mjs`): a quarter, a half or all of it. None uses three
quarters yet. Rolls are against the level-based DC for the party's level. Buffs are SF2E's own: temporary HP, Hero
Points, status and circumstance bonuses, and conditions such as Sickened and Fatigued.

1. **The General Hospital** (`general-hospital`). The sober choice: a ward bed and a night nurse. Full HP, no buff and
   no roll. Its deck is the ward at night: a garrison soldier with a broken wrist who won't say how, a night nurse
   doing the crossword aloud, a patient who talks in their sleep.
2. **An Early Night** (`row-c-block-3`). Back to the bunk in the overflow block where half the furniture hasn't
   arrived. Half HP. Its deck is the dormitory: a snorer, a homesick roommate, a lights-out inspection, the rattle of
   the one radiator.
3. **The Bathhouse** (`the-bathhouse-447`). The big public bath. Half HP, and automatically temporary HP equal to your
   level until your next rest. Its deck is the regulars: dockworkers, a retired Frame fitter with stories, the
   attendant who runs the place like a ship.
4. **The Shrine Gate** (`the-shrine-gate-444`). A small roadside shrine nobody built on purpose. A quarter HP, and
   each character draws a fortune: a great blessing gives a Hero Point, a blessing a +1 status bonus to one check
   before their next rest, an ordinary one a line to keep, and a curse is tied to the rope and left behind. Its deck
   is who else comes to a shrine at night.
5. **The Crew Mess** (`the-crew-mess`). The bar: where the repair crews drink when a refit finishes. A quarter HP.
   Make an Impression to be stood a drink: on a success the crews talk about the machines; on a critical success a
   crew chief remembers your name. In the morning, a Fortitude save or Sickened 1 until you've eaten breakfast. The
   character who keeps choosing this over the hospital is telling you something.
6. **The Card Game** (`row-f-block-5`). A game that has been running, with rotating players, for longer than anyone
   remembers. A quarter HP. Deception, Thievery or Society to win a pot that grows with level; a critical failure
   means you owe someone. The regulars know every candidate on the island.
7. **The Rumour Mill** (`row-b-block-8`). Sitting up late with second-termers trading theories about the screening
   tests. A quarter HP. Society or Diplomacy (Gather Information) for rumours, some right and some wrong; the GM
   decides which. Its deck is the rumours themselves.
8. **The Roof** (`row-e-block-9`). Up the maintenance ladder nobody has locked, with the whole city below. Half HP.
   Perception to learn the city by its lights (which district is which); on a success a +1 status bonus to Will
   saves until your next rest. Its deck is who else is up there.
9. **The Night Observer** (`the-met-office`). Keeping the night observer company as they read the instruments on the
   roof. A quarter HP. Nature or Survival to learn tomorrow's weather and tides; on a critical success a +1
   circumstance bonus to one check tomorrow that the weather or the sea affects. Room for two.
10. **The Night Shift** (`no-1-machine-shop`). Working through the night on a repair. A quarter HP. Earn Income with
    Crafting, on SF2E's own table, and the night crew explain what they're taking apart. A critical failure leaves you
    Fatigued until your next rest. Room for three.

### An eleventh, added later

Added 2026-09-29, outside D051's original ten, at Ingram's direct request for a proper civilian "good time" haunt
off base to sit alongside the on-base Crew Mess.

11. **The Paper Lantern** (`the-paper-lantern`, not yet sited on the real gazetteer map). A civilian izakaya in
    Kurose's entertainment quarter, where rank doesn't matter past the noren curtain. A quarter HP. Make an
    Impression to stand the counter a round, same shape as the Crew Mess; in the morning, a Fortitude save or
    Sickened 1 until breakfast. Its own thread, not the Crew Mess's: the walk back after curfew (a very minor
    infraction, D053 -- never worse than an awkward morning), and the base creeping further into the quarter every
    season. Its deck is the counter: Kiku the keeper (Dwarf), Sanzo the wandering musician who never quite leaves
    (Goblin), and Tama the young waitress who's never once been past the checkpoint (Leshy).

## Throughlines to carry into the rebuilds

- **The old town is on the waterfront** (D048). Four old scenes put it on a hill above the harbour road: The Errand (a
  street drops down to the harbour road below it), School: First Period (the hill is where the old town had to stop),
  Unidentified Contact (the contacts are on the harbour edge below it) and First Contact (the harbour road below it,
  with side streets climbing to it). Fix each one as it's rebuilt.
- **The founders' names come out in play, after Scene 0** (D048): a history lesson or another event, with a roll, and
  perhaps a second place that tells it from another angle. Intake Medicals comes first, and Shucks's badge (MORDANT)
  and his "Yes, that one" there were written for players who had just heard the names. Rebuild it with that in mind.
- **Why the Directorate came to Kurose** is the question Scene 0 leaves open. The answer, Rupiah asking the gods, is a
  drop for around Episode 3 or 4 (D048).
- **Cicada comes out piecemeal**, as the party looks into it (D048).
