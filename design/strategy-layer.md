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
4. **DEBRIEF** — what they did moves the tracks. The Observer takes its turn. Tomorrow's board is
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

At maximum, the cloud self-organises and stops needing Manako. **This is not a loss condition.**
It is worse and better: the option of *correcting* the Observer expires, and whatever it has
become by then is what it permanently is.

**Show the number to the players from Chapter 5.** The bible is explicit — dread is fine, ambush
is not. Before Chapter 5 they see its effects without the number.

**The design consequence that matters:** prevention beats reaction. Stopping a demonstration is
worth more than winning the fight that demonstration causes. A party that only ever responds to
alarms loses ground every week while winning every battle, and should be able to *see* that
happening.

### COMPREHENSION — the enemy's tech tree *(bible §15, already designed)*

Eight rungs, one per chapter, from *what exists* to *there are people*. **The party's own conduct
advances it.** Fight it and it learns that fighting is the job. Every victory by force teaches the
correct lesson badly.

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
| 0 | **Recruits** | Do as you are told. Ground roles only. Frame time is drills. |
| 1 | **Cadets** | Choose your own duty assignment. Requisition minor equipment without a countersignature. |
| 2 | **Duty Section** | Self-deploy to a Contact without waiting for an order. Speak to detainees. |
| 3 | **Officers** | Direct other units. Call a city asset — a tram halted, a street closed, a district's power rerouted. |
| 4 | **Command** | Overrule a Directorate decision once per chapter. Request sealed records and be given them. |
| 5 | **Prodigies** | The city does what they say, and the adults in the room look at them first. |

**Why this is the right spine for this campaign specifically.** The Directorate's founding sin is
information suppression as a reflex. Its whole cast is people who were right and not believed —
Rika for forty years, Hori alone with it, Manako until it broke him, Taka after Chapter 3. The
campaign's stated theme is *who gets believed*. **Clearance is being believed, made countable.**
Climbing it is the party succeeding where every one of those people failed, which is why the arc
feels like escalation rather than promotion.

Rungs are gated by chapter as well as cost, so nobody buys Prodigies in Chapter 2.

### BONDS — the reward currency *(new, and load-bearing against tone drift)*

The bible says plainly: *"The reward is bonds. Not survival, not victory. What the players should
have at the end is each other."* If that is the reward, it should be a number, or it will be the
first thing dropped when a session runs long.

Bonds rise from Anchor time, side plots, small good days, and one character putting themselves out
for another. They are spent on:

- letting somebody reach a berserking pilot who cannot be reached (Taka, Chapter 3);
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

## 4. The Observer's turn

At each debrief the Observer does **one** thing, and it is a function of three tracked numbers
rather than GM whim:

- **What** it does is drawn from its current **Comprehension** rung. It cannot reach for a
  category it has not been taught.
- **How** it does it is drawn from the **Mirror** — the party's own mercy-to-lethality ratio. A
  merciful party gets probes that look and withdraw. A brutal party gets things built to kill,
  because it is trying to be good at the job it was shown.
- **How big** it is comes from **Mass**.

This is the Dark Event slot, and it is better than XCOM's because the players caused all three
inputs. When the Mirror becomes visible in Chapter 7, the realisation available to them is not
*the GM was escalating*, it is *we taught it this*.

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
- **It must not make the warm parts optional.** Bonds exists precisely so that Anchor scenes and
  small good days are a resource rather than a luxury.
- **It must not turn the Observer into a villain with a plan.** Its turn is a function of three
  numbers. It has no intent, and the moment it appears to have one, the campaign's thesis breaks.

---

## 9. Build order

1. **Scene intro/outro fields** in `scene-brief.schema.json`. Small, and unblocks everything.
2. **Artefacts** — a scene outcome that flips a journal page's ownership to the players. The
   reveal machinery already exists in `foundry/scene-runner.mjs`; this is the permanent variant of
   it, and it is the piece Ingram asked for directly.
3. **The five tracks** as world state, with a GM-facing readout in the console and a
   player-facing readout for the ones they are allowed to see.
4. **Clearance rungs** — permanent, purchased with Standing, gated by chapter.
5. **The Observer's turn** as a derived suggestion at debrief, never an automatic action.
6. **Combined operations**, last, and only if the rest is not already enough.

---

*Related: `ideas/story/blank-inheritance-v4.md` §6 (the Mirror), §15 (escalation and the Mass
Clock), §16–17 (threads), §20 (bifurcations), §21 (peril roster), §22 (risks);
`design/ux-doctrine.md` §3, §7a, §10.7; `ideas/entries/redacted-document-chain.json`;
`ideas/entries/phone-app-suite.json`; `data/campaign/config.json`.*
