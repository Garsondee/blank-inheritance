# Downtime Activities & Conditions — tying loose ideas to real SF2E outcomes

**Status: a proposal, not a lock.** Requested 2026-09-06: independent research into how the
exhaustion track and the rest/activity menu — both left as structural placeholders in
`design/ux-doctrine.md` §3 and tracked as `fatigue-escalation-formula`/`rest-activity-roster` in
`data/campaign/open-questions.json` — could resolve into real, cited SF2E mechanics. Everything
below is a concrete suggestion built on real rules, offered for reaction, not decided here. Naming
a rest activity is exactly the kind of creative call CLAUDE.md already reserves for the user (the
same rule that keeps this project from inventing the six kids' names) — the difference is these
now come with real numbers attached, so a yes/no/tweak is a fast conversation instead of a blank
page.

**A real gap closed to get here.** Ten SF2E conditions this design needs — Clumsy, Drained,
Encumbered, Enfeebled, Fatigued, Quickened, Sickened, Slowed, Stunned, Stupefied — were named only
in passing in `reference/srd/player-core/504-conditions-appendix.json`'s grouping lists and had
never been individually mirrored. Fetched fresh from `2e.aonsrd.com` (the same source every other
file in `reference/srd/` already cites) and added as ten new files in the same format, same
directory, same schema. `reference/` is gitignored — this is a local extension of the mirror,
not a commit, exactly like the 235 files already there.

---

## 1. Exhaustion — one new homebrew track, built entirely from real conditions

The user's own spec: a check that gets harder each segment worked without rest, ending in
involuntary unconsciousness. Rather than a single hidden pass/fail flag, the natural shape —
matching how Resonance and Bleed already work, and matching Law 19's "nothing expires without its
cost being visible first" — is a **visible, stepped value-condition**, each step a real bundle of
conditions rather than an invented effect:

| Exhaustion | Trigger | Effect |
|---|---|---|
| **0** | baseline | none |
| **1** | 1st segment worked past a natural rest point | **Fatigued** — −1 status to AC and saves; can't use exploration-trait activities while traveling |
| **2** | 2nd consecutive segment | Fatigued **+ Slowed 1** — lose 1 action when actions are regained |
| **3** | 3rd consecutive segment | Fatigued + Slowed 1 **+ Stupefied 1** — a status penalty to Int/Wis/Cha checks and DCs, spellcasting now risks disruption |
| **4** | 4th, or any failed check at 3 | **Unconscious** — can't act, −4 status to AC/Perception/Reflex, blinded, off-guard, falls prone; loses that segment's slot involuntarily |

Every named effect is cited, not invented: `reference/srd/player-core/condition-{15-fatigued,
36-slowed, 38-stupefied, 40-unconscious}.json`.

**Why Slowed at step 2, specifically.** Losing an action to fatigue is the exact lever the Frame
side already uses for damage (`design/ux-doctrine.md` §3, "damage caps actions") — a tired kid and
a Degraded Frame fail in the same shape, action economy first, everything else second. That
parallel wasn't planned; it fell out of picking the condition that actually matches the fiction.

**A concrete proposal for the check itself**, since the open question asks for one: **Fortitude**,
DC 15 for the first check, +5 per additional consecutive segment (15 / 20 / 25 / 30...). Grounded in
the existing Simple DC table (`reference/srd/gm-core/702-difficulty-classes.json` — untrained 10,
trained 15, expert 20...) rather than a number pulled from nowhere: DC 15 reads as "a basic feat of
endurance," and the same table's own spacing supplies the escalation for free. This is a
recommendation, not the resolved answer — it's exactly what the open question is still waiting on.

**Resetting.** Simplest version: any rest clears Exhaustion to 0. Richer version, tied to §2 below:
a recovery-focused rest clears it fully; a rest chosen for a different payoff (the social option)
only knocks it down by 1, since going out with friends genuinely isn't the same as sleeping. Both
are offered; picking between them is the same call as the rest roster itself.

**The Frame side doesn't need a new system — it already has this.** Internal power duration
(3-4/6/8/10 rounds by Resonance band) already is a Frame's exhaustion clock: run out, and the Frame
is dead weight until reconnected, the mechanical-scale twin of a kid collapsing unconscious. Nothing
to add there; worth stating plainly so nobody builds a second exhaustion system for Frames that
duplicates one already shipped.

---

## 2. Buffs — real bonus mechanisms, not invented ones

Three bonus types already govern every SF2E buff (`reference/srd/player-core/326-checks.json`,
PC p. 392): **circumstance** (situational — cover, flanking), **item** (from equipment), **status**
(from a spell or beneficial effect). A downtime reward should always be one of these three, never a
bespoke fourth kind — that keeps every reward legible against a system players already know.

### Rest, with three named types and a real mechanical hook each

| Rest type | Flavour | Real mechanic | Exhaustion |
|---|---|---|---|
| **Lights Out** | a genuinely quiet block, alone | **Long-Term Rest**'s existing doubled recovery — Con mod (min 1) × level × 2 HP, instead of the normal daily × 1 (`player-core/493-downtime-mode.json`, PC p. 433) | clears fully |
| **Sick Bay** | the clinic, an NPC medic on duty | **Treat Wounds**, run on the resting kid: critical success 4d8 HP + loses wounded, success 2d8 HP + loses wounded (`player-core/skill-10-medicine.json`) | clears fully |
| **Night Out** | clubbing, karaoke, anyone who'll have you | **−1 Bleed** (Bleed's own sources already include "Plug/psychological distress" — this is its plain narrative opposite, not a new resource) + a +2 circumstance bonus to the next social check or Anchor-Time scene | −1 only — you didn't actually sleep |

A fourth, offered as the shape a "whole host" more should take rather than as a fixed proposal:
**Workshop** — tinkering, building, taking something apart to see how it works. A small circumstance
bonus to the next Crafting-flavoured check. −1 Exhaustion.

**Why nothing here reaches for Quickened.** It was tempting — an extra action is the single most
legible "you're at your best" reward in the system. It's also a genuinely large combat buff for a
downtime pick to hand out for free, and the campaign already reserves that exact reward for
Absolute-band Resonance (`config.json`, 85%+: "3 actions + one free Strike ignoring MAP"). Handing
the same shape of power out from a rest menu would compete with the thing Resonance exists to make
feel earned. Kept out on purpose, not overlooked.

### Frame-side buffs draw on the campaign's own economy, not on borrowed SF2E mechanics

The kids are vanilla SF2E characters, so their rewards can borrow SF2E's own toolkit directly. A
Frame's economy is homebrew top to bottom (Resonance, Bleed, technician-days, damage states), so its
downtime rewards should spend *within* that economy rather than import an unrelated SF2E mechanic:

- **Simulator Drills** *(new)* — a slice, no technician-days. A circumstance bonus to the Frame's
  initiative or its first Strike at the next Contact. "Rehearsal," mechanically real.
- **Cockpit Customization** *(new)* — Crafting-flavoured, a technician-day or two. A small
  circumstance bonus to the Will save `config.json`'s push mechanic already calls for ("resolve the
  push with a check using the kid's own stats — a Will save, a relevant skill"). A cockpit that
  feels like home makes the push easier to survive.
- **Pilot Conditioning** *(new)* — Athletics/Fortitude-flavoured, the *kid's* own body training to
  endure the plug. Reduces the Bleed cost of the next push by 1, or grants a circumstance bonus to
  that push's own check. The one place a personnel-scale activity buys a Frame-scale outcome
  directly — worth flagging against `design/ux-doctrine.md` Law 8 (never mix scale numbers in one
  *readout*): this is a scale *interface*, exactly the kind `design/scale-and-chassis.md` §3
  already sanctions (a Ground Role check at personnel level producing a Frame-scale effect), not a
  violation of it.

---

## 3. Non-story activities — a real skill hook for each

Not every downtime pick needs to be a scene. Grounded in SF2E's own skill list so different kids'
different strengths get somewhere to shine outside combat:

| Activity | Skill hook | What actually happens |
|---|---|---|
| **Part-Time Job** | **Earn Income**, any trained skill | Real numbers, not flavour text: task level 0-1 for a level-1 kid pays **1-2 credits/day, trained** (`2e.aonsrd.com/rules/710-earn-income`'s Income Earned table — level 0 pays 1, level 1 pays 2). Deliberately modest; a kid's part-time job should feel like one. |
| **Sick Bay Volunteer** | **Medicine** — Treat Wounds/Treat Disease, run *by* the kid on a teammate | Same real table as §2's Sick Bay rest, run the other direction — a Medicine-trained kid can be useful to the party for free. |
| **Study Group** | **Recall Knowledge** / Lore | A circumstance bonus to the next relevant Recall Knowledge check — "did the reading." |
| **Athletics Club** | **Athletics** | A circumstance bonus to the next Fortitude save, or shaves the DC on the *next* Exhaustion check — conditioning buys real resilience. |
| **Drama Club** | **Deception** (Impersonate) or **Performance** | Social-skill flavour; Performance can also Earn Income (same table as above). |
| **Newsroom** | **Diplomacy** (Gather Information) or **Society** | Feeds `thread`-tagged log entries directly — this activity's natural output is exactly what the log bar's `thread` tag already models. |
| **Quiet Hobby Time** | none | No check, no payout — included on purpose. Not every choice should be optimised, and a menu that only ever rewards should be treated as a bug, not a feature. |

---

## 4. What this settles, and what it still doesn't

**Genuinely new grounding, ready to build against:** the Exhaustion stage table (§1), the DC/check
proposal for the escalation, three named rest types with real mechanical payoffs (§2), Frame-side
reward ideas that spend the campaign's own economy rather than import SF2E's, and seven named
non-story activities each tied to a real skill.

**Still the user's call, not resolved by this document:** whether the specific names/flavour above
are the ones that ship, whether Fortitude/DC 15/+5 is the right escalation or just a reasonable
starting guess, and whether Exhaustion resets fully on any rest or only on the recovery-focused
ones. `data/campaign/open-questions.json`'s two entries now carry a note pointing here rather than
sitting empty — still `status: open`, since a proposal isn't the same thing as a decision.

**Not touched here on purpose:** the exact `rest-activity-roster` this doesn't lock in is still a
"whole host" per the original brief — three named types plus one illustrative fourth is a strong
start, not a claim that four is the final number.
