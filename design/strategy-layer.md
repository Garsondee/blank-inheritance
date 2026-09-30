# The Strategy Layer

*Written 2026-09-09. The campaign's XCOM-shaped upper deck: what the players decide between
sessions, what they spend, and how six schoolchildren become the people the city listens to.*

**This does not replace SF2E.** Combats are SF2E combats. Tunnel sections are SF2E exploration
with real attrition and real resting. Frame fights are SF2E with the numbers reskinned. The
strategy layer decides **which** encounters happen, **what is at stake in them**, and **what the
party is permitted to do** — never how a round resolves. Where a rule already exists in SF2E, use
it (doctrine Law 18).

---

## 1. Why this exists

Ingram, 2026-09-09: *"I want the players to feel like they are rapidly escalated from being
students to important civil defence officers to mecha-god-machine wielding prodigies. I'd like a
layer of strategy where we encourage our players to guide the path of the adventure."*

Most of the machinery for this is already written and scattered. The Mass Clock and the
comprehension rungs are in the story bible §15. The four-quarter day and the slice economy are in
`ux-doctrine.md` §3/§7a and built into the console. The technician-day pool is in
`config.json`. The Mirror is bible §6. **This document does not invent those. It assembles them
into one board and adds the three things genuinely missing:** a progression of authority, a
legible enemy turn, and a way for discovered truth to become a permanent possession.

---

## 2. The loop

One **Day** is one session and one strategic turn. Four quarters, as already built.

1. **BRIEFING** — the board shows what is on offer today, what expires tonight, and where the five
   tracks stand. Five minutes, out of character, at the table.
2. **COMMIT** — each player spends their quarter's slice. There are always more offers than
   slices. They argue. Do not rescue them from the choice.
3. **PLAY** — scenes resolve in SF2E. This is most of the session and the strategy layer is silent
   during it.
4. **DEBRIEF** — what they did moves the tracks. The Watcher takes its turn. Tomorrow's board is
   built from tonight's outcome.

The console already implements the day ring, the slice board with expiry, and the resolution
queue. What it does not yet show is the five tracks and the enemy's move.

---

## 3. The five tracks

Two run against the party, two belong to them, one is logistics. Keep the number at five. A sixth
track is a proposal to delete one of these.

### MASS — the doom clock *(bible §15, already designed)*

Rises with every use of Sap by anyone including the party, every Cicada demonstration, and the
column running unstopped. **Falls only when the party takes something off the board:** seized
canisters, a demonstration prevented rather than fought, the column interrupted.

At maximum, the Watcher no longer needs Manako or any other human to feed it: its own children
make its Sap, which is the runaway (LEDGER #31, `ideas/story/dossier-observer.md` §16). **This is
not a loss condition.**

**Show the number to the players once they understand what Sap is** (Chapter 9 in the
twenty-chapter draft). The bible is explicit — dread is fine, ambush is not. Before then they see
its effects without the number.

**The design consequence that matters:** prevention beats reaction. Stopping a demonstration is
worth more than winning the fight that demonstration causes. A party that only ever responds to
alarms loses ground every week while winning every battle, and should be able to *see* that
happening.

### COMPREHENSION — the enemy's tech tree *(bible §15, already designed)*

Its rungs run from *what exists* to *there are people*, now paced across the twenty chapters as the
Watcher's generations (`ideas/story/blank-inheritance-twenty-chapters.md` Appendix C). **The
party's own conduct advances it.** Fight it and it learns that fighting is the job. Every victory
by force teaches the correct lesson badly.

**Hard gate, from the bible:** it cannot exploit a category the fiction has not established it
understands. This is a promise to the players and it must not be broken for drama.

### STANDING — institutional capital, and the escalation ladder *(new)*

**This is the students-to-prodigies axis, and it is the piece that was missing.**

Standing is the Directorate's willingness to let these six act. It rises when they are right in
public, complete sanctioned work well, or are advocated for by someone with weight (Satoru, Kudo,
Rupiah, Ume). It falls with insubordination, property damage, being publicly wrong, and going
off-book — *whether or not going off-book was correct.*

**Standing is banked legitimacy, spent to buy freedom.** That is the whole optimisation loop: do
the sanctioned thing well enough, often enough, to be allowed to do the unsanctioned thing when it
matters. A party that never earns Standing cannot act; a party that never spends it never
achieves anything.

Spend it on **Clearance** rungs, which are permanent:

| Rung | | What it unlocks |
|---|---|---|
| 0 | **Recruits** | Do as you are told. Frame time is drills. |
| 1 | **Cadets** | Choose your own duty assignment. Requisition minor equipment without a countersignature. |
| 2 | **Duty Section** | Self-deploy to a Contact without waiting for an order. Speak to detainees. |
| 3 | **Officers** | Direct other units. Call a city asset — a tram halted, a street closed, a district's power rerouted. |
| 4 | **Command** | Overrule a Directorate decision once per chapter. Request sealed records and be given them. |
| 5 | **Prodigies** | The city does what they say, and the adults in the room look at them first. |

**Why this is the right spine for this campaign specifically.** The Directorate's founding sin is
information suppression as a reflex. Its whole cast is people who were right and not believed —
Rika for forty years, Hori alone with it, Manako until it broke him. The
campaign's stated theme is *who gets believed*. **Clearance is being believed, made countable.**
Climbing it is the party succeeding where every one of those people failed, which is why the arc
feels like escalation rather than promotion.

Rungs are gated by chapter as well as cost, so nobody buys Prodigies in Chapter 2.

**How the top rungs happen in the fiction (LEDGER #42, 2026-09-27):** the party earns them by showing extraordinary
ability and judgement. The Deputy Director, the founders and the city all back them, and people whose judgement failed
resign and take full responsibility for their blunders. The result is promotion, and the freedom to decide how to
respond; the adults stay, and follow their lead.

### SITE CLASSIFICATION — a second, different axis *(new, 2026-09-12)*

Clearance rungs answer one question: given a party already knows a place exists, how far inside
may they go? They do not answer a different one Ingram raised while a new location (The Rock,
`data/locations/the-rock.json`) was being written: **does a place's existence get seen by anyone
who isn't specifically read into it at all** — not "how deep," but "is this on the map anyone
gets to look at in the first place."

**Classification is the property of the PLACE; Clearance is the standing of the PARTY.** A site's
`classification` field (`location.schema.json`) answers the first question; a party's Clearance
rung, checked against it, answers whether they currently get to know the place exists at all —
that check is a GM judgement call for now, not a formula, since only one site uses this so far.

Five tiers reuse the real Japanese document-classification ladder `redacted-document-chain`
(`ideas/entries/redacted-document-chain.json`) already built for text, generalised from documents
to places:

| Tier | | Meaning for a place |
|---|---|---|
| `public` | 公開 | Shown on any ordinary map, discussed freely. |
| `internal` | 部外秘 | Directorate business, not published outward, but an ordinary cadet knows it exists. |
| `secret` | 秘 | Existence known Directorate-wide; business inside it is not. |
| `classified` | 機密 | Existence known only above a working Clearance rung. |
| `top-secret` | 極秘 | Existence known to a short, specific list of people. |

**`omega-zero` sits above that ladder rather than extending it.** It is not "more top-secret" —
it is a different kind of secret, reserved for the vanishingly rare site whose existence is
unknown even to most Directorate *staff*, not merely restricted from outsiders. The Rock is the
first and, for now, the only site classified this way: "students and most staff being unaware of
its purpose and completely unaware of its secrets" (Ingram's own note). Spend this tier rarely —
if every interesting building turns out to be Omega-Zero, the word stops meaning anything.

Undeclared (`null`) is correct for nearly everything, including every location promoted before
2026-09-12 — this is an opt-in field, not a retrofit, and nothing currently promoted has been
assigned a tier. Most named districts and buildings have no reason to ever need one; the whole
point of most of the map is that it's the kind of place that shows up on a map.

### BONDS — the reward currency *(new, and load-bearing against tone drift)*

The bible says plainly: *"The reward is bonds. Not survival, not victory. What the players should
have at the end is each other."* If that is the reward, it should be a number, or it will be the
first thing dropped when a session runs long.

Bonds rise from side plots, small good days, and one character putting themselves out for another.
They are spent on:

- meeting a save condition on the peril roster (§21) that the dice did not meet;
- one automatic success on a check where the reason is a relationship.

**This is the enforcement mechanism for bible §22's risk 5** — tone drift toward grimness. A
chapter that generated no Bonds contained no warmth, and that is now visible on the board rather
than a thing the GM has to notice.

### TECHNICIAN-DAYS — logistics *(already in `config.json`)*

One shared weekly pool funding Frame repairs, Frame modifications, and every accommodation Ume
wins for the kids. Three things competing for one finite resource, one of which is *being kind to
children*. Leave this exactly as it is; it already works.

---

## 4. The Watcher's turn

At each debrief the Watcher does **one** thing, and it is a function of three tracked numbers
rather than GM whim:

- **What** it does is drawn from its current **Comprehension** rung. It cannot reach for a
  category it has not been taught.
- **How** it does it is drawn from the **Mirror** — the party's own mercy-to-lethality ratio. A
  merciful party gets probes that look and withdraw. A brutal party gets things built to kill,
  because that is the method it was shown. The Mirror changes its method, never its objective
  (LEDGER #31).
- **How big** it is comes from **Mass**.

This is the Dark Event slot, and it is better than XCOM's because the players caused all three
inputs. When the Mirror becomes visible (around Chapter 11 in the twenty-chapter draft), the
realisation available to them is not *the GM was escalating*, it is *we taught it this*.

**Players may pre-empt.** Spending slices on the right target before the debrief cancels or
redirects the move — the XCOM trade of "you can block this month's Dark Event, but only by not
doing something else you wanted."

---

## 5. Artefacts: making discovered truth permanent

Ingram, 2026-09-09: *"the thief option would actually make a journal that covers the medical page
public to all players, that way when a story beat reveals an artefact of lore the players can be
given permanent access to it via the phone."*

**A scene outcome can grant an artefact.** An artefact is a real Foundry JournalEntry page whose
ownership changes from GM-only to player-readable at the moment it is earned. It stays in their
possession for the rest of the campaign and is browsable on the phone.

Three properties make this worth building rather than just handing out lore:

1. **Earned, not given.** The pre-printed tick-box on Form 12-B is a fact about the Directorate
   that the party *took*. It reads differently from a fact they were told.
2. **It stacks with Clearance.** `ideas/entries/redacted-document-chain.json` (accepted) already
   specifies that every Directorate document exists at several clearance levels, implemented as
   **one Foundry page per level, gated by page ownership** — which is real in Foundry and already
   verified. So a Clearance rung does not only unlock permissions; it unlocks *less-redacted
   versions of documents the party already owns.* Re-reading an old document and finding more of
   it is one of the best feelings this campaign can offer, and the machinery for it exists.
3. **It is the players' own record.** Six players will not remember Chapter 2 by Chapter 7. The
   artefact shelf is the campaign's memory, held by them rather than by the GM.

---

## 6. Scene intro and outro

Every scene brief gains two required fields, because the joins between scenes are where a campaign
actually runs rough.

**INTRO — how to get in.** Where they are, how they arrived, the first thing they see, and — the
part that is usually missed — **what the previous scene's outcome changes about this one.** A
scene that reads identically whatever happened before it is not connected to anything.

**OUTRO — how to get out.** What ends the scene, what the party leaves holding, and specifically:

- which **artefacts** they earned;
- which **tracks** moved, and by how much;
- what goes on **tomorrow's board** as a result;
- what to write down (the tone ledger, per bible §7 running notes).

The outro is the strategy layer's only hook into the tactical layer. It is where a scene stops
being a scene and becomes a move on the board.

---

## 7. What rewards efficiency

The user's ask was that the system reward players who find efficient approaches and optimal uses
of their resources. Six mechanisms, five of which already exist:

1. **The DC ladder** *(scene scale)* — every approach costs either dice or consequences, never
   neither. A player who is bad at the obvious skill can still get there by paying a different
   price. See `scene-brief.schema.json`.
2. **Offers exceed slices** *(already built)* — triage is forced every single day.
3. **Expiry** *(already built, `expiresOn`)* — hoarding leads costs you leads.
4. **Standing as banked legitimacy** — the central loop. Earn it inside the rules, spend it
   outside them.
5. **Prevention beats reaction** — Mass falls for things stopped, not things won.
6. **Combined operations** *(new)* — when two or more players spend slices on the same objective,
   the second and subsequent slices are worth more than the first. Coordination is mechanically
   better than parallel effort, which is the behaviour worth teaching a six-player table.

---

## 8. What this must not become

- **It must not eat table time.** Briefing and debrief together are ten minutes. If the strategy
  layer regularly takes longer than that, cut a track.
- **It must not replace SF2E.** No custom combat, no custom skill resolution, no second dice
  system. Bible §22 lists apparatus collapse as risk 1, and names deciding *which two subsystems
  get cut first under pressure* as a live task. **Under pressure, cut Combined Operations first
  and Bonds second** — Bonds only after checking that the register has not gone grim without it.
- **It must not make the warm parts optional.** Bonds exists precisely so that solo scenes and
  small good days are a resource rather than a luxury.
- **It must not turn the Watcher into a villain.** Its turn is a function of three numbers. It has
  an objective, to observe, multiply and expand, but it is never evil (LEDGER #31); the moment it
  appears to be, the campaign's thesis breaks.

---

## 9. Build order

1. **Scene intro/outro fields** in `scene-brief.schema.json`. Small, and unblocks everything.
2. **Artefacts** — a scene outcome that flips a journal page's ownership to the players. The
   reveal machinery already exists in `foundry/scene-runner.mjs`; this is the permanent variant of
   it, and it is the piece Ingram asked for directly.
3. **The five tracks** as world state, with a GM-facing readout in the console and a
   player-facing readout for the ones they are allowed to see.
4. **Clearance rungs** — permanent, purchased with Standing, gated by chapter.
5. **The Watcher's turn** as a derived suggestion at debrief, never an automatic action.
6. **Combined operations**, last, and only if the rest is not already enough.

---

## 10. Chapter architecture: how a rung is actually earned

### The unit is the arc, not the session

**Corrected 2026-09-09, and the correction matters.** An earlier draft of this section sized
scenes to fill a three-hour session and derived a scene count per chapter from it. Ingram threw
that out:

> *"I'm in no way expecting a single playing session to achieve any amount of content. Groups will
> fluctuate between getting lots done and getting very little done during a session. Fights can
> take a lot of time to complete. So throw away any ideas of limiting yourself. The goal is to
> create the right number of scenes to tell the story arc, there's not a specific limit there's
> just a goal."*

**So do not count scenes per session.** A session is elastic and will not be the same twice. The
unit of design is **the arc** — *recruit to cadet* — and the question is always "what does that
transformation actually require", never "what fits in three hours".

One thing survives from the discarded version: **scenes vary enormously in length**, from a
five-minute image to a ninety-minute fight, and the short ones are the ones a schedule-driven
approach quietly drops. Write them anyway. They are where the world comes from.

### Five kinds of scene

| Kind | Length | Per session | What it is for |
|---|---|---|---|
| **Set piece** | 30–45 min | 1–2 | The encounter, the drill, the board hearing. The thing people remember. |
| **Pressure** | 15–20 min | 2–3 | A real decision with a real cost. Usually moves a track. |
| **Texture** | 5–10 min | 2–4 | One image, one joke, one plant. Often no checks at all. |
| **Solo** | 5–10 min | 1–2 | One player, their own life. This is where Bonds comes from. |
| **Downtime** | 10 min | 1 | The slice board. The strategy layer's own scene. |

**Texture scenes are the load-bearing ones for this campaign specifically**, and they are the
cheapest to write. They are where the breadcrumb trails live, and they are what stops the mystery
arriving as exposition. A texture scene is three sentences and a detail; nine of them across a
session is where the world comes from.

### A rung is won at a Board, not bought at a counter

Standing pays for a Clearance rung, but **Standing alone never grants one.** Each rung is won in a
scene: a hearing, a review, a panel of adults who have to be convinced. Run it in initiative, as a
social encounter with real stakes.

This matters for two reasons:

1. **Advancement becomes a scene rather than a number.** "You are Cadets now" is an announcement.
   Arguing your way through a review board while a Directorate officer reads your file back at you
   is a memory.
2. **It is the campaign's theme, again.** The subject is who gets believed. A Board is being
   believed, in a room, by people with the authority to say no. The party climbing this ladder is
   them succeeding where Rika, Hori and Manako each failed.

**Boards are also where Standing is visibly spent**, which makes the whole track legible without a
tutorial.

### Chapter One and its breadcrumb trails

*(Superseded 2026-09-24: a 2026-09-09 eight-part plan for Chapter One and its two breadcrumb
tables, built on the old eight-chapter shape, the cut ground roles, mitflits as bountied vermin
(against `ideas/story/bible/species/mitflits.md`) and a crowd seeing the sky in Chapter One. Chapter
One's plan and plants now live in `ideas/story/blank-inheritance-twenty-chapters.md` §5 and
Appendix B. Removed from this document 2026-09-25.)*

**The rule every breadcrumb obeys:** give them the anomaly before the question. Every unexplained
detail seeded must be a fact a sharp table can reassemble later, never a thing withheld and then
announced. A player who writes down "the lens didn't work" in Chapter One and understands why in
Chapter Six has had the best experience this campaign can offer.

### What this asks of the authoring format

- **Scenes must be writable in ten minutes.** A texture scene is a goal line, two beats and one
  NPC voice sample. If the schema demands more than that to validate, it is wrong.
- **A scene must be able to have no checks at all** and still be a scene.
- **Trails need to be visible in prep.** A future addition worth having: tagging a scene with which
  trail it feeds, so a chapter can be checked for a trail that has quietly stopped being laid.

---

*Related: `ideas/story/blank-inheritance-v4.md` §6 (the Mirror), §15 (escalation and the Mass
Clock), §16–17 (threads), §20 (bifurcations), §21 (peril roster), §22 (risks);
`design/ux-doctrine.md` §3, §7a, §10.7; `ideas/entries/redacted-document-chain.json`;
`ideas/entries/phone-app-suite.json`; `data/campaign/config.json`.*
