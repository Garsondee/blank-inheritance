# The Character Card — persistent, learnable social intel on the cast

**Status: a proposal, grounded in real rules.** Requested 2026-09-06: a theatre-of-mind popup that
shows and hides characters, carries action buttons, and — the actual mechanical core — tracks what
the *players* have actually learned about how to handle a given character, gathered through play,
usable anywhere that character turns up for the rest of the campaign.

**This isn't a new idea out of nowhere.** It completes two things already on the books:
[`ideas/entries/in-scene-character-portrait-frames.json`](../ideas/entries/in-scene-character-portrait-frames.json)
(status `new`) already wanted "so that players can see who is in a theatre of the mind scene
immediately" and NPC portraits carrying characterisation cues — it just didn't yet have a mechanic
underneath the cues. [`ideas/entries/dialogue-management-panel.json`](../ideas/entries/dialogue-management-panel.json)
(status `accepted`) is the live, in-scene negotiation tool — subjects, DCs, degree-of-success
buttons. The Character Card is the **standing reference the dialogue panel reads from**: build one
once per NPC, and every future conversation with them — in any scene, any location — starts from
where the last one left off.

---

## 1. The two things this tracks, and why they're different

**Facts** — permanent, discrete, revealed one at a time. *"This character is easy to bribe."
"Needs to feel in control." "Never forgets an insult." "Doesn't want to talk about sad things."*
Each one is GM-authored ahead of time, hidden by default, and unlocked for good by a specific
trigger — usually a check, sometimes a narrative event. Once revealed, a Fact never re-hides. It's
knowledge, not a mood.

**Attitude** — a live, moving state, using SF2E's own real five-step scale rather than an invented
one: **Hostile → Unfriendly → Indifferent → Friendly → Helpful**
(`reference/srd/player-core/504-conditions-appendix.json`'s Attitudes group). This is what social
actions actually move. Make an Impression, Request and Coerce all shift it as part of their real
RAW outcomes (cited below) — nothing new needed here, just a place to keep the number between
scenes instead of the GM holding it in their head.

**Why the split matters:** a Fact is something a player *knows*. Attitude is something the NPC
*feels right now*, which can worsen even when a Fact is used correctly, exactly as written for
Coerce below. Conflating them would mean "learning a secret" and "being on good terms" are the same
kind of progress, and they aren't — you can know exactly how to manipulate someone who currently
hates you.

---

## 2. A precision worth stopping on: there is no fifth degree

The brief asked for *"crit fail, fail, neutral, succeed and crit succeed."* SF2E's real degree of
success is **four** tiers — critical failure, failure, success, critical success — never five.
Worth saying plainly rather than quietly building a table with an invented rung, since this project
has caught exactly this kind of drift before.

What's actually going on, checked against the real actions this maps onto:

- `reference/srd/player-core/skill-7-diplomacy.json`'s **Make an Impression** and **Request**: only
  Critical Success, Success, and Critical Failure are written out. A plain Failure has *no listed
  effect at all* — nothing changes, the conversation just doesn't land. That reads exactly like
  "neutral" in play, and it's real RAW, not an invention.
- `reference/srd/player-core/skill-8-intimidation.json`'s **Coerce** does write out all four,
  and even its *Success* costs something (the target does what you ask, then becomes unfriendly
  once the effect ends) — degree of success and Attitude moving are already the same mechanism in
  the books, not two separate systems bolted together.

So: **build the outcome table on the real four degrees**, and let "neutral" mean what it already
means in half of SF2E's own social actions — a Failure with no explicit consequence, not a
fabricated middle tier. Indifferent, on the Attitude ladder, is the actual neutral *state* if what's
wanted is a literal word for "neither".

---

## 3. Leveraging a known Fact — the outcome table, built on real actions

The user's own worked example is the design brief: *"the Director tells the PCs they must attend a
mandatory meeting but the good Dr is present in the same scene and a PC uses their inside
information to influence the Dr to change the mind of the directorate."* That's a **Request**, made
stronger by citing a known Fact as the approach.

| Degree | What happens | Grounded in |
|---|---|---|
| **Critical Success** | The Dr agrees without qualification, and — because the approach genuinely fit them — Attitude improves a step. | Request's crit success, plus Make an Impression's crit-success attitude shift |
| **Success** | The Dr agrees, but with limits or conditions. Attitude unchanged. | Request's plain success |
| **Failure** | The Dr doesn't budge. Nothing else happens — no attitude hit, no scene consequence. | Request/Make an Impression's silent Failure — genuinely neutral, not invented |
| **Critical Failure** | The Dr refuses, Attitude drops a step, **and if the Fact was misapplied — wrong read on what this person actually wants — they also grow more resistant to that specific approach from that player for a real, tracked duration.** | Request's crit-failure attitude drop, PLUS Coerce's real mechanic: a botched attempt grants "+4 circumstance bonus to saves against your Coerce actions for 1 week." Reuse that exact shape (a real DC bump, real duration) rather than inventing a vaguer "they're annoyed now." |

**A known, well-matched Fact should make the attempt genuinely stronger** — proposed as a **+2
circumstance bonus** to the check when the player's stated approach clearly uses a revealed Fact
(matches this project's own established small-bonus convention — the Night Out rest bonus in
`design/downtime-activities.md` is the same size). **Whether a given Fact actually fits the current
ask is a GM call, never automated** — the same "never automate — artistic choice" band
`design/ux-doctrine.md` §10.4 already draws the line at. Knowing someone is bribable doesn't help
you talk them out of a belief; the system can hand the player the bonus once the GM agrees the
approach lands, but it cannot decide that agreement for them.

**The critical-failure grudge is the mechanical form of "never forgets an insult."** That trait
from the brief isn't flavour text under this design — it's Coerce's real week-long resistance bonus,
reused as-is. A character with that Fact simply keeps the penalty active longer, or GM's call,
never truly clears it.

### Real neutral sits above this table, not inside it

Flagged after the first draft, and it's a genuine correction rather than a restatement of §2:
*"it's always a good idea to think about neutral because that's what would happen if a player
declined to roll or their results were not a full success or failure."* Two real cases, both
missing from the table above, and both more common at a table than any single row in it:

- **No check was ever attempted.** Most of a scene with a recurring NPC is just talking — nobody
  invokes a Fact, nobody rolls Request or Coerce. Nothing reveals, nothing shifts, nothing logs.
  This isn't a Failure (which requires an attempt that didn't land) and it isn't a row on the
  degree-of-success table at all — the table only exists once a check happens. It's the same shape
  `design/downtime-activities.md` already uses for Quiet Hobby Time: "no check, no payout,"
  included there on purpose, because a menu that only ever rewards is a bug.
- **A resolved check the GM reads as not really mattering either way.** SF2E's own four degrees are
  the mechanical result; whether that result *narratively* moves anything is still the GM's call,
  same as everywhere else in this design (§10.4's "never automate — artistic choice" band). A
  technical Success at an awkward moment, or a Failure the GM decides genuinely doesn't cost
  anything this time, can both be played as neutral without that being a rules violation.

**Consequence for the Character Card:** the reveal control and the leverage buttons must never be
the *only* way to interact with an NPC's card. Most of the time it should sit there quietly, present
in the scene, doing nothing — logging nothing, changing nothing — while ordinary roleplay happens
around it. The mechanics in this document are for the moments a check is actually worth making, not
a requirement that one happen.

---

## 4. Revealing a Fact

Each Fact carries a **reveal trigger**, authored once per NPC:

- **Usually a check** — Sense Motive to read them cold, a successful social action during an
  unrelated conversation, a relevant Recall Knowledge.
- **Sometimes narrative** — reading a personnel file (which may itself be redacted; the redaction
  machinery already built this project is a real, available gate here, not a hypothetical one),
  a scene where the NPC lets something slip unprompted, a Gather Information result.

**Revealing is party-wide, proposed as the default.** Once one player learns it, the whole table
knows it from then on — matching how the muster board already treats "what the party knows" as one
shared flag rather than one per player. Worth confirming rather than assuming; see open questions.

**Revealing writes itself into the log for free.** The existing `npc` log-bar tag —
*"a name, voice or fact improvised on the spot, added to the cast so it stays consistent"*
(`design/ux-doctrine.md` §10.3) — already covers exactly this case. No new tag needed.

---

## 5. The Character Card itself

**Show/hide is the whole point, and it's Law 11 applied to people.** `design/ux-doctrine.md`'s Law
11 already states *"never show a player what their character has not learned"* — written for
Recall Knowledge and document redaction, and this is the same principle wearing a person's face
instead of a stat block or a page. The GM toggles a card into a theatre-of-mind scene the same way
markers get placed on the map; hidden means genuinely absent from the player-facing view, not
present-but-blank.

**Two visibilities of the same card, not two cards** — same split the combatant board already uses
(§10.6): the GM's own view is always the full, unredacted card; the player-facing view shows only
what's been revealed.

| Section | GM sees | Players see |
|---|---|---|
| Portrait & identity | always | always, while the card is shown |
| Attitude | the real word (Hostile…Helpful) | **narrated, not shown as text** — proposed default; a GM already conveys mood through how a scene reads, and exposing the literal ladder word removes some of that texture for no real gain |
| Facts | the complete authored list | only revealed ones, each earned in play |
| Quick actions | Request / Make an Impression / Coerce buttons, opening straight into the dialogue-management-panel's own DC-and-degree tracker, pre-filled with this NPC's Will DC | same buttons, player-initiated |
| Reveal control | a one-click "mark this Fact learned," which fires the log entry above | — |

**Automation, sorted the way §10.4 already sorts everything else:** computing the Will DC and
pre-filling the check, and applying a reveal and logging it once the GM confirms a check succeeded,
are both bookkeeping the console can simply own. Deciding whether a Fact fits the current ask, and
adjudicating what a Critical Success actually gets someone, are both artistic judgment and stay with
the GM — never automated, the same line §10.4 already draws.

---

## 6. Data this needs

`npc.schema.json` had no field for any of this when this was written; the `socialProfile` object
proposed here has since been added to it:

```
socialProfile: {
  attitude: "hostile" | "unfriendly" | "indifferent" | "friendly" | "helpful",
  facts: [
    {
      id, text,
      revealTrigger: { skill, dc } | { narrative: string },
      revealed: boolean,
      revealedNote: string | null   // when/how it was actually learned, filled in at the table
    }
  ]
}
```

Existing NPCs (`data/npcs/commander.json`, `caretaker.json`, `transparency-advocate.json`) already
suggest their own first Facts without anyone inventing anything — the Caretaker's own description
already states *"every accommodation they win costs technician-days from the same pool that repairs
and upgrades Frames — kindness has a visible, charged line item,"* which is close to being an
authored Fact already: *knowing to ask the Caretaker for something means understanding what it
costs them.* Worth writing the first real Facts for these three once this design is confirmed,
rather than here.

---

## 7. What's still open

1. **Party-wide reveal, or per-player?** Proposed party-wide (§4); genuinely worth confirming,
   since it changes whether "who was in the room" ever matters for what the table knows.
2. **Circumstance bonus size for a well-matched Fact.** Proposed +2, matching the existing
   Night Out precedent; not confirmed.
3. **Attitude shown to players at all, ever — even just on request?** Proposed narrated-only by
   default (§5); a table that wants the number could still see it.

None of these block building the card's shape — only its exact numbers and defaults.
