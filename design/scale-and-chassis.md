# Scale and Chassis — how level-1 kids and level-12 Frames share a battlefield

The single hardest mechanical problem in this campaign, and the proposal for solving it. Written 2026-08-22, prompted by a design conversation between Ingram and Flippa (a player who also GMs and reads the maths well) in which she correctly identified that *"level 1 players will just die"* and proposed making the kids level-14 statblocks instead.

Every number in this document is taken from the real SF2E tables in `reference/srd/` and `reference/tables/`, or from real published vehicle stat blocks on Archives of Nethys. Where a number is a deliberate deviation from the system's own guidance, it is labelled as one and justified. Nothing here is eyeballed.

---

## 1. The problem, proven

Take a level-12 Claimant with a **high** Strike attack bonus and **high** Strike damage (GM Core creature-building tables): **+26 to hit, 3d10+14 damage (avg 30)**. Put a level-1 kid in front of it. A level-1 PC in armour has roughly **AC 17, 18 HP**.

**Claimant attacks the kid:**
- To hit needs d20 ≥ 17 − 26 = **−9**. Every roll hits.
- To crit needs a total ≥ 27, i.e. d20 ≥ 1. **Every roll crits**, except a natural 1 (which downgrades one step to a normal hit).
- Result: **95% critical hit for ~60 damage, 5% normal hit for ~30.**
- 60 damage against 18 max HP exceeds double max HP, which triggers PF2e/SF2e's massive-damage rule: the kid is **killed outright**, not knocked to dying.

So a single Strike from a single Claimant kills a kid outright, 95% of the time.

**The kid attacks back:** a level-1 PC has roughly **+7** to hit. The Claimant's AC (high) is **33**. Needs d20 ≥ 26 — numerically impossible; only a natural 20 succeeds via the degree-shift rule, so **5%**. At ~7 damage per hit against **270 HP**, that's 39 hits, or roughly **770 attack rolls**.

The kid is simultaneously *instantly dead* and *entirely ineffective*. Both directions confirmed against the real tables. This is not a tuning problem; a 11-level gap is outside the ±4 band the entire system is built on (`reference/tables/encounter-and-rewards-math.json` puts the usable range at party level −4 to +4).

### Why not just do what Flippa suggested

Her fix works mathematically. A level-14 statblock with **extreme** saves (+30) against a level-12 **high** spell DC (32) succeeds on a 2, and with **high** AC (36) is hit by a +26 Strike only 55% of the time rather than auto-critted. The maths is sound and she was right to reach for it.

The reason to route around it: it puts the survivability **in the person**. Once a kid *is* a level-14 statblock, that's a permanent property of them — it can't be lost, spent, chosen at a briefing, damaged, repaired, or upgraded. It solves the survival problem and closes off the campaign's entire resource economy at the same time.

Ingram's counter-instinct — vehicles as a second kind of chassis, at the same level as Frames — puts the survivability **in the machine**. A machine can be destroyed, repaired, swapped, argued for, and lost. That turns the fix into the campaign's central loop instead of a patch on a stat block. This document builds out that version.

---

## 2. The one principle

> **A personnel-scale number never appears on the same side of a comparison as a Frame-scale number.**

Not "rarely". Never. Every apparent exception below is really one of three legal conversions.

This is not new to this document — `data/campaign/ground-roles.json` already states it:

> *"Ground-role DCs are set by the task the kid is attempting, not by the enemy's level. A level-1 kid never rolls against a level-12 Claimant's DC."*

and `data/campaign/config.json` already names the single deliberate exception:

> *"Resolve the push with a check using the kid's own stats… this is the one place the level-1 sheet does direct, real work inside a level-12 scene."*

The original design got this right. What follows extends the same rule to cover vehicles and the Frame-scale battlefield, which the original didn't have to think about.

---

## 3. Three layers

**Frame scale** — everything is level 12+ and within ±4 of everything else, so SF2E's maths runs completely untouched:
- **Frames**: PC statblocks (per the design bible), level 12, rising to 20
- **Chassis/vehicles**: SF2E *vehicle* stat blocks — objects with AC, Hardness, HP, Broken Threshold
- **Claimants**: creature statblocks

**Personnel scale** — everything is level 1–8 and within ±4 of everything else, so the maths runs untouched here too:
- Kids on foot, human antagonists, hazards, the Cicada organisation's people

**The interface** — exactly three legal ways a personnel-scale character affects a Frame-scale fight:

1. **Be crew.** You're inside a chassis; the *chassis's* numbers are what get rolled. You are not a target.
2. **Ground Role check at your own level's DC, granting a Frame-scale effect.** You roll DC 15 because you're level 1; the *effect* lands at level 12.
3. **A clock.** For danger that would otherwise demand a save you mathematically cannot make, the answer is a stated countdown, not a d20.

Anything that doesn't fit one of those three isn't allowed on the map.

---

## 4. Why SF2E's vehicle rules are already most of the answer

`reference/srd/gm-core/1197-vehicles.json` turns out to do more of this work than expected:

- **Vehicles are objects.** They have **Hardness** — flat damage reduction on every instance of damage. This *is* Flippa's "resistance to anything but mech damage", already RAW, with no new rule.
- **"If a vehicle needs to attempt a saving throw that isn't listed, the pilot attempts a piloting check at the same DC instead."** Ingram's sports-car-dodges-the-blast intuition is already in the book.
- **Enclosed vehicles give occupants greater cover, "or might prevent attacks entirely."** The APC protecting its passengers is RAW.
- **Broken** (at half HP): −2 AC/saves/collision DC, +5 to all piloting DCs, **halved Speed**. A built-in death spiral that warns a player to withdraw.
- **Collision damage** with a save DC, and **Run Over**, give a chassis a real offensive option that isn't a Strike.

### Calibrating against real published vehicles

| Vehicle | Level | AC | Fort | Hardness | HP (BT) | Collision | Piloting DC |
|---|---|---|---|---|---|---|---|
| [Turboglider](https://2e.aonsrd.com/equipment/vehicles/1-turboglider) | 1 | 12 | +6 | 5 | 15 (7) | 1d8 (DC 15) | 14 |
| [Enercycle](https://2e.aonsrd.com/equipment/vehicles/7-enercycle) | 1 | 11 | +6 | 5 | 14 (7) | 2d4 (DC 15) | 15 |
| [Enercopter](https://2e.aonsrd.com/equipment/vehicles/3-enercopter) | 5 | 18 | +12 | 10 | 80 (40) | 3d10 (DC 20) | 20 |

Against the GM Core by-level tables, the pattern is consistent:
- **AC ≈ creature "Low" AC, minus 1–2.** (L1: Low 13 vs 11–12. L5: Low 19 vs 18.) Vehicles are easy to hit — they're big and can't dodge. Hardness, not AC, is their defence.
- **Saves ≈ Low-to-Moderate.** (L1 Low +4 / Mod +7 vs +6. L5 Mod +12 vs +12 exactly.)
- **HP ≈ Low-to-Moderate for level.** (L1 Low 16–14 vs 14–15. L5 Mod 78–72 vs 80.)
- **Collision DC and piloting DC = the standard DC for the vehicle's level** (`dcByLevel`: L1 = 15, L5 = 20). Both confirmed exactly.
- **Hardness: 5 at level 1, 10 at level 5.**

At level 12 that gives a baseline of roughly **AC 28, HP ~160 (Low), Fort/Ref by role from the saves table, collision DC 30**.

---

## 5. The two deliberate deviations

Both are small, both are flagged, and the design does not work without them.

### Deviation 1: Handling DC is decoupled from chassis level

**The problem:** RAW, piloting DC = standard DC for the vehicle's level. A level-12 vehicle would be **DC 30**. A level-1 kid has about **+7** in Piloting. They cannot drive their own vehicle.

**The fix:** split the stat in two.
- **Chassis Level (12)** drives everything the *Claimant* interacts with: AC, saves, Hardness, HP, collision damage.
- **Handling DC (15–20)** is what the *kid* rolls against, set to the personnel band.

**Why it's justified in fiction, not just convenient:** the Directorate mass-produces these for conscripted teenagers. Ease of operation is a design requirement. And it immediately pays off as a *characterful* stat rather than a fudge — a **commandeered civilian sports car has a higher Handling DC than a military APC**, because nobody designed it for a frightened 15-year-old. That's a real trade the player feels.

### Deviation 2: Frame-scale chassis list a Reflex save

RAW says vehicles have *"typically only Fortitude"* — "typically" being explicit permission to vary. Every Frame-scale chassis here lists **both Fort and Reflex**.

Without this, area attacks fall through to the pilot's own Piloting check against a level-12 DC (a kid at +7 vs DC 32 — a 5% success rate, i.e. an execution). With it, the *chassis* dodges, at level-12 numbers, exactly as Ingram described. It also becomes the main axis of difference between chassis classes.

### Also adjusted, within normal budget

The **sports car sits below the HP/Hardness curve and above it on Speed and Reflex.** That's an ordinary stat-budget trade of the same kind creature-building already does (trading AC for HP), not a deviation from a rule. §7 shows the trade actually balances.

---

## 6. Real chassis

Names are placeholders. All are **Chassis Level 12**, rising with the Frames automatically (decided 2026-08-22).

**Four axes, not three.** Chassis are balanced across *survivability*, *speed/capacity*, *utility*, and — added 2026-08-22 — **vision** (see `ideas/entries/vision-as-chassis-axis.json`). Vision inverts the armour trade: the least protected chassis usually sees best, because sight loss is a physical consequence of armour. Frames themselves have **poor vision** — they are enormously powerful and nearly blind, which is why the Day 1 episode can require that the interdiction field's weak point be "only visible from ground level." A Frame without spotters is a giant swinging at what it is told about.

> Vision values below are design intent. The exact Foundry token vision/detection configuration must be verified against the local `foundryvtt/` tree before it's treated as implemented.

### "Kingfisher" Pursuit Coupe — *the sports car*
*Vehicle 12 · Large · tech*

**Price** 40,000 cr · **Space** 15 ft long, 8 ft wide, 5 ft high
**Crew** 1 pilot · **Passengers** 1
**Handling DC** 18 (Piloting) — *civilian build; twitchy, never meant for this*
**AC** 29 · **Fort** +19 (Low) · **Ref** +25 (High)
**Hardness** 12 · **HP** 70 (BT 35) · **Immunities** object immunities
**Speed** 120 feet (motorized)
**Collision** 3d10 (DC 30)

**Vision** Good — wide angle, moderate range. *Nothing is in the way.*
**Open-topped.** Occupants get lesser cover only (standard cover against attackers at ground level).
**Outrun.** If the pilot spends their entire turn on Drive actions, the coupe cannot be targeted by reactions triggered by its movement.

Trades durability for reach and sight: it crosses the map in a round, reliably takes *zero* damage from a near miss, and can actually see what it's driving past.

### "Hod" Armoured Carrier — *the APC*
*Vehicle 12 · Huge · tech*

**Price** 52,000 cr · **Space** 25 ft long, 10 ft wide, 10 ft high
**Crew** 1 pilot · **Passengers** 6
**Handling DC** 15 (Piloting) — *built to be driven by anyone who's had one lesson*
**AC** 27 · **Fort** +25 (High) · **Ref** +16 (Terrible)
**Hardness** 16 · **HP** 150 (BT 75) · **Immunities** object immunities
**Speed** 40 feet (motorized)
**Collision** 4d10 (DC 30)

**Vision** Poor — narrow angle, short range. *Buttoned up; you are looking through a slit.*
**Enclosed.** Occupants have greater cover, and cannot be targeted by Frame-scale area effects at all while the carrier is above its Broken Threshold.
**Firing Ports.** Up to two passengers may make personnel-scale attacks without losing greater cover.

The mobile safe square. Slow enough that where you park it is a real commitment — and blind enough that parking it well requires somebody else's eyes.

### "Ladle" Recovery Rig — *field repair*
*Vehicle 12 · Huge · tech*

**Price** 61,000 cr · **Space** 25 ft long, 12 ft wide, 11 ft high
**Crew** 1 pilot · **Passengers** 3
**Handling DC** 16 (Piloting)
**AC** 26 · **Fort** +22 (Moderate) · **Ref** +19 (Low)
**Hardness** 14 · **HP** 120 (BT 60) · **Immunities** object immunities
**Speed** 50 feet (motorized)
**Collision** 3d10 (DC 30)

**Field Repair** ⌛⌛ (two actions, crew member, requires the rig adjacent to a Frame): Crafting check against the rig's **Handling DC (16)** — a personnel-scale DC, per §2.
- **Critical success** restore 40 HP to the Frame · **Success** restore 25 · **Failure** restore 10 · **Critical failure** nothing, and the rig is Marked (§8).
- **The cost, and the point:** every point restored this way is **borrowed against the shared technician-day pool** in `config.json`'s Frame economy. Field repair doesn't create capability, it *moves it forward in time* — you are spending next week's repair budget to survive tonight. That plugs straight into the existing "repairing a friend's Frame and upgrading your own compete for the same finite resource" tension, and makes the rig's presence a strategic decision made at the briefing, not a free heal.

**Vision** Moderate.

### "Vesper" Observation Helicopter — *the glass cockpit*
*Vehicle 12 · Huge · tech*

**Price** 58,000 cr · **Space** 30 ft long, 10 ft wide, 12 ft high
**Crew** 1 pilot · **Passengers** 3
**Handling DC** 19 (Piloting) — *the hardest thing on the roster to fly*
**AC** 29 · **Fort** +16 (Terrible) · **Ref** +25 (High)
**Hardness** 8 · **HP** 85 (BT 42) · **Immunities** object immunities
**Speed** fly 150 feet (motorized)
**Collision** 3d10 (DC 30)

**Vision** Excellent — long range, wide angle, unobstructed. *Altitude and glass.*
**Falls.** Per RAW, a destroyed flying vehicle falls and everyone aboard takes falling damage. This is the real price of the helicopter and should never be softened.

Built to Ingram's spec: by far the greatest speed, the lowest Hardness, high Reflex, **critically low Fortitude**. That last one has teeth, because Fortitude is a vehicle's *default* save under RAW — anything that doesn't target Reflex targets the helicopter's worst number. It survives roughly as many area attacks as the others (~4.8), but it is the only chassis where losing that gamble also drops the crew out of the sky.

---

## 7. Action economy — resolved, not new

The contradiction flagged when the Day 1 fight was built: design-bible.md line 193 says the opening fight is *"three rounds, two actions,"* while line 201's First Pilot rule states *"68% Resonance (Harmonised, **three actions** from round one)."*

**Resolved 2026-08-22: the Day 1 pilot has three actions.** And this needed no new rule — it was already sitting in `config.json`'s Resonance band table, just not cross-referenced clearly enough:

| Band | Actions |
|---|---|
| Dead Weight (<40%) | 2 |
| Nominal (40-65%) | 2 |
| Harmonised (65-85%) | 3 |
| Absolute (85%+) | 3 + a free Strike |

Two actions is what a pilot gets below Harmonised — it is not a special "emergency mode," it is simply what most of the Resonance range produces. Three actions is what a *well-synced* pilot gets. The First Pilot starts at 68% specifically so they open the campaign already past that line. Line 193 was describing the campaign's normal texture; line 201 is a stated, deliberate exception to it, and the exception is what actually governs scene 7.

The framing worth keeping for the table: **entering a Contact under-synced is a choice with a face** — skipping Sync Training, launching stressed, launching hurt. Two actions isn't a debuff applied to you; it's the shape of a pilot who didn't have time to get right before the siren went.

---

## 8. Damage-state degradation — machines break differently than people

A direct instruction, and a real design gap this closes: *"I like the idea of Frames under half health performing worse... Frames and vehicles get worse as they get damaged, which makes them feel different to just characters."*

SF2E's own vehicle rules already do a version of this — the RAW **Broken** state (at half HP): −2 to AC/saves/collision DC, +5 to piloting DCs, **halved Speed**. That's real, already-published, and becomes the floor this builds from. What RAW doesn't have: a warning stage before Broken, and nothing at all for Frames (which use the PC damage-state track in `config.json` — Operational → Degraded → Critical → Hulked — as a pure repair-economy label with no combat effect until now).

**The unifying idea:** both tracks become one shared four-stage curve, keyed to % of max HP, applying identically to Frames and vehicles. Its sharpest tool is the one that makes this feel mechanically distinct from a personnel character: **damage caps your actions, the same lever Resonance already uses.** A level-1 kid never loses actions from taking damage — HP is HP until they drop. A Frame or chassis does, because it is a machine coming apart, not a person enduring. That is the actual, felt difference this whole document keeps promising and hasn't yet delivered until now.

| Stage | HP band | AC / Saves | Speed | Hardness | Action cap |
|---|---|---|---|---|---|
| **Operational** | 100–67% | — | — | — | (Resonance/Handling governs, as normal) |
| **Degraded** | 66–34% | −2 | ×¾ | — | **2**, regardless of Resonance band |
| **Critical** | 33–1% | −4 *(matches RAW Broken exactly)* | ×½ *(matches RAW Broken exactly)* | ×½ | **1** |
| **Hulked / Destroyed** | 0 | — | 0 | — | 0 — out of the fight |

Critical's AC/Speed penalties are deliberately identical to vehicles' existing RAW Broken values — this isn't a new invention at that stage, it's naming the stage that already existed and giving it the one thing RAW left out: an action cap. Degraded is the new warning tier, pitched at half of Critical's penalty. Hardness loss at Critical (armour plating failing, not just structure) is the one place this genuinely goes beyond RAW, and it compounds fast: a Critical Kingfisher (Hardness 12→6) suddenly eats far more from every hit that lands, which is exactly the "spiraling toward death" feel a wounded giant machine should have.

A Frame or chassis that's Degraded or Critical can still act — it's worse, not disabled — which keeps "should I keep fighting or fall back" a real question with a real cost on both sides, all the way down.

## 8a. The unlimited-supply tier

A second explicit instruction: *"we provide vehicles which are very very basic and unlimited in supply so that players can always choose one of those no matter what, but we also have much better more powerful vehicles… the consequences for getting destroyed or badly damaged are much more serious."*

This is a genuine fifth thing chassis are now balanced on, alongside survivability/speed/utility/vision: **stakes**. Losing a Kingfisher, a Hod, a Ladle, or a Vesper should hurt — they're acquired, upgraded, named. Below all of them sits a tier that exists specifically so a player is never mechanically locked out of the vehicle layer, and so throwing one away tactically is always an option with a floor under it.

### "Runabout" Utility Chassis — *always available, no stakes*
*Vehicle 12 · Large · tech*

**Price** — Directorate-issued, replaced on request; not meaningfully purchased or lost from a player's economy
**Space** 14 ft long, 7 ft wide, 6 ft high · **Crew** 1 pilot · **Passengers** 2
**Handling DC** 17 (Piloting) — *reliable, unglamorous, exactly as easy to fly as it needs to be and no easier*
**AC** 25 · **Fort** +19 (Low) · **Ref** +19 (Low) — *no standout stat, on purpose*
**Hardness** 8 · **HP** 60 (well below every named chassis) · **Immunities** object immunities
**Speed** 50 feet (motorized) · **Vision** Poor
**Collision** 3d10 (DC 30)

Deliberately mediocre on every axis rather than specialized on any — the point is not that it's a *good* option, the point is that it is always *an* option. A Runabout survives roughly 2 area attacks (vs. the named chassis' ~5), which is correct: losing one should sting less than being caught without a vehicle at all, and should sting less than losing a Kingfisher.

---

## 9. The maths, demonstrated

Reference antagonist: **level 12 Claimant**, high across the board — **AC 33, HP 270, Strike +26 for 3d10+14 (avg 30), Fort +25 / Ref +22 / Will +22, area attack DC 32** (the "high" spell DC for level 12) dealing ~40 on a failed basic Reflex save.

### (a) Personnel weapons cannot hurt a chassis — and that's automatic

A kid's level-2 sidearm deals about **3** damage (1d4 + tracking). Against **Hardness 12**: **0**.
A serious level-8 personnel weapon deals about **18** (2d8+9). Against Hardness 12: **6** — so 12 hits to break a coupe.

Small arms are effectively irrelevant against Frame-scale armour, with no special rule written. But note it's *not quite* zero at the top of the personnel band: a determined, well-equipped infantry force can eventually threaten a light chassis. That's a feature — it keeps human antagonists from being pure scenery.

### (b) A Claimant that *decides* to swat the sports car kills it

+26 vs AC 29: misses on 1–2 (10%), hits on 3–12 (50%), crits on 13+ (40%).
Damage past Hardness 12: hit **18**, crit **48**. Expected per attack: (0.5 × 18) + (0.4 × 48) = **28.2**.

**70 HP ÷ 28.2 ≈ 2.5 attacks.** One Claimant turn, if it has a multi-attack routine, is enough. The correct player response is *never be the thing it's looking at* — which is what §8 makes a real choice rather than GM mercy.

### (c) Area attacks — the actual threat model, and where the classes diverge

Basic Reflex save vs **DC 32**, ~40 damage (crit success 0 / success half / failure full / crit failure double), then Hardness applies.

**Kingfisher (Ref +25):** crit success on 17+ (20%), success on 7–16 (50%), failure on 2–6 (25%), crit failure on a natural 1 (5%).
→ (0.05 × 68) + (0.25 × 28) + (0.50 × 8) + (0.20 × 0) = **14.4 per blast** · 70 HP ÷ 14.4 ≈ **4.9 blasts**

**Hod (Ref +16):** crit success only on a natural 20 (5%), success on 16–19 (20%), failure on 7–15 (45%), crit failure on 1–6 (30%).
→ (0.30 × 64) + (0.45 × 24) + (0.20 × 4) + (0.05 × 0) = **30.8 per blast** · 150 HP ÷ 30.8 ≈ **4.9 blasts**

**Ladle (Ref +19):** → **23.7 per blast** · 120 HP ÷ 23.7 ≈ **5.1 blasts**

**All three survive the same number of area attacks — ~5 — by completely opposite means.** That wasn't reverse-engineered; it fell out of picking role-appropriate stats off the standard tables. It's the check that none of the three is a trap pick. What actually differs is *variance* (the coupe often takes nothing and occasionally takes 68; the carrier grinds down predictably) and everything outside the damage math — Speed 120 vs 40, capacity 1 vs 6, cover, utility.

For comparison, a level-12 **Frame** (PC statblock, ~AC 31, ~170 HP, no Hardness) takes about **33 per Claimant Strike** and lasts **~5 Strikes**. Everything on the Frame-scale map has a similar time-to-kill, which is what makes it read as one coherent battlefield rather than two glued together.

### (d) The kid's contribution — the number that matters most

A level-1 kid, trained, +4 key attribute: **+7**. Ground Role DC is the standard DC for **the kid's own level** — DC 15.
→ Needs 8+: **65% success, 15% critical success.**

At level 8, that's roughly +17 against DC 24 — **70%**. The kid's competence stays meaningful across the entire campaign because both sides of the comparison scale together.

Now the payoff. The Sensor Operator role (already in `ground-roles.json`) converts a success into *"one true fact the pilot can act on"* — a revealed weakness. Level-appropriate weakness values at level 12 run **8–15** (`reference/tables/dc-and-check-math.json`). Take **10**:

> A Frame landing 3 attacks a round over a 4-round fight = 12 hits × 10 = **120 extra damage**, against a Claimant with **270 HP**.

**A level-1 kid with a radio contributes ~44% of a Claimant's health bar**, and never once rolls against a Frame-scale DC. That is the whole answer to *"non-pilot students must not be second-line"*, expressed as arithmetic.

For the other roles, the calibrated ceiling is the **Aid** action's own numbers: **+1 circumstance (+2 on a critical success)**. Sanity check that it matters — Claimant +26 vs Frame AC 31 needs a 5; at AC 32 it needs a 6. That's a 5% swing per attack, ~8 attacks a fight. Real, not warping.

---

## 10. Targeting: making "beneath its notice" a rule, not a ruling

Ingram: *"The huge opponents aren't targetting tiny vehicles unless they have good reason to do so."* Correct instinct, but as GM fiat it's arbitrary and players can't plan around it. Two rules make it a choice:

**Scale Disparity.** A Frame-scale creature's **Strikes can only target Large or larger** — Frames and chassis. Personnel-scale characters on foot **cannot be Struck by a Claimant at all**. To threaten personnel it must use an area effect (which allows a save) or spend a full action on a deliberate sweep.

**Marked.** Loud actions make your chassis **Marked** until the end of your next turn, and a Marked chassis can be Struck normally. Marking actions include: Structural Command demolitions, Umbilical Control tethering, Field Repair on a critical failure, Run Over, and any deliberate attempt to draw fire.

That converts survival from *GM leniency* into *player risk management* — and it makes "I'll draw it off you" an actual, costed, heroic move rather than a line of dialogue.

## 11. When your chassis dies

Per RAW a vehicle at 0 HP is destroyed. The crew is now on the Frame-scale map on foot.

By Scale Disparity they can't be Struck. But an area attack would still demand a save at DC 32 that a kid cannot make — so, per §3's third conversion, **dismounted personnel do not roll saves at Frame scale.** Instead the GM states a clock, out loud:

> *"The Claimant sweeps again at the end of its next turn. You need cover, a chassis, or off this map before then."*

This is where Flippa's *"compared to a mech, a human does have legendary agility"* lives — narratively you are diving through rubble and it looks superhuman. Mechanically it's a countdown rather than a d20, because +4 against DC 32 isn't a roll, it's an execution with extra steps. Failing the clock means **out of the fight**, not necessarily dead — recovery is exactly what the Evacuation Marshal role is for.

---

## 12. What this plugs into

- **`ground-roles.json`** — unchanged and vindicated; its DC rule is the foundation this is built on. The five roles now also have a chassis to operate from.
- **`config.json` Frame economy** — chassis join Frames on the Operational → Degraded → Critical → Hulked track and compete for the same technician-day pool. Field Repair borrows against it directly.
- **Time Economy** — the hangar/briefing choice ("speed or armour, how many Frames do we launch") becomes a real decision because the chassis roster is a real resource.
- **`mech-physical-classification-and-equipment`** (ideas/) — this gives that accepted idea its mathematical frame: chassis classes differ by Speed / Hardness / Reflex / capacity / utility, on a shared budget.
- **8-level lockstep arc** — chassis rise 12 → 20 with Frames and kids. Because *every* comparison is now intra-scale, the maths never has to be revisited.

---

## 13. Decisions and remaining questions

**Decided 2026-08-22:**
- **Chassis level automatically with Frames**, in lockstep. Every comparison stays intra-scale permanently; the maths never needs revisiting.
- **Reserve chassis are allowed, and vehicles are a full parallel progression path.** Players find, buy, and upgrade vehicles exactly as they do Frames — and *"some players might hardly bother with frames."* This is a real scope expansion: the vehicle layer is not a support tier, it is a second complete way to play the campaign.
- **Chassis classes should feel dramatically different**, not merely differ statistically. The Vesper is the worked example of how far to push it.
- **Vision is a fourth balancing axis** (`ideas/entries/vision-as-chassis-axis.json`).

**Still open — Ingram's calls, not mine:**
1. **Is Marked purely opt-in, or can a Claimant's own abilities apply it?** The second is scarier and gives Claimants real counter-play against a party that never exposes itself.
2. **How much technician-day debt is one Field Repair worth?** Needs to hurt enough to be a decision. Not costed here — it's a dial on the existing economy, so it should be set alongside those numbers rather than in isolation.
3. **Should the sports car be commandeered rather than issued?** The Handling DC 18 detail implies a story: it isn't Directorate kit. Possibly the first thing a player *negotiates* for through the correspondence system.
4. **What does the chassis acquisition economy look like** now that vehicles are a full progression path — credits, in-fiction negotiation, battlefield salvage, or all three?
5. **Does anything break if a player invests almost entirely in vehicles?** Day 1 assumes exactly one Frame launches and Day 6 assumes two; a vehicle-focused player is fine there, but the assumption should be checked before it becomes load-bearing later.

---

## 14. Speed and distance at city scale — the fix for a real design failure

The first simulated battle (§ below, and `tools/battle-simulator/`) exposed a genuine problem, not a rounding error: **Vesper, a helicopter, dealt 111 damage to the Claimant. The Frame dealt 44.** The "small" vehicle outdamaged the Frame by more than 2.5×, on its own accounting for two-thirds of a 165 HP target. Asked directly — *if vehicles are this capable, why worry about Frames at all?* — there was no good answer, because nothing in the ruleset up to this point actually built the asymmetry the fiction requires. Two root causes, both fixed here:

1. **Weapon parity.** Every chassis got a "Mounted Sidearm" at nearly the Frame's own numbers (+24 vs +25 to hit, 3d8+12 vs 2d12+17 damage — GM Core's own **Moderate** tier for both). Nothing distinguished a car's gun from a building-sized melee weapon.
2. **No real distance.** The test map was 220ft across. Every chassis reached firing position within one round regardless of Speed — so Speed, the entire point of building fast/slow chassis in the first place, never got to matter.

The fix is the same for both: **the city is huge, and that has to be load-bearing, not flavor.**

### 14a. Arrival waves — Speed decides who's even IN the fight, not just who hits first

A Contact doesn't happen next door. Modeled here as **4 miles from the launch point** — a real megacity distance, close enough to resolve in a session, far enough that "who gets there" is a genuine question. Rather than simulate the full cross-city transit round-by-round (at real-world speeds that would mean the Frame arriving on round 100+, useless for actual play), transit is abstracted into **arrival waves** — the same kind of compression the Contact Pool already uses for "several quiet days" without simulating every hour. The *order* is derived honestly from each chassis's real approximate cross-city performance; the exact round numbers are a deliberately compressed pacing device, not a literal translation, and that's stated here rather than presented as more precise than it is.

| Chassis | Real-world cross-city pace (approx.) | Arrives |
|---|---|---|
| Vesper (helicopter, flies straight over traffic) | ~150 mph | **Round 1** |
| Kingfisher (sports car, road-bound but fast) | ~100 mph | **Round 2** |
| Runabout (ordinary utility vehicle, city traffic) | ~50 mph | **Round 3** |
| **Frame** (building-sized; a powered stride over/through obstacles no wheeled chassis can shortcut) | not a road speed at all — see note below | **Round 3** |
| Hod (APC, heavy, slower) | ~40 mph | **Round 4** |
| Ladle (recovery rig, heaviest ground vehicle) | ~35 mph | **Round 4** |

This is the actual mechanical answer to the drama you're asking for: **the vehicles are alone with the Claimant for the first two rounds.** Not because the GM says so — because Speed, the stat that was supposed to matter and didn't, now decides who's even present. A non-arrived combatant doesn't get a turn; the round log says so explicitly rather than silently skipping them.

**Revised 2026-08-22, after the first fully-wired simulation.** The original table put the Frame at Round 6, reasoning from a literal "walking pace ~20mph." Running it end-to-end showed why that was wrong in practice, not just in principle: with an 8-round fight, a Round-6 Frame gets exactly one round of action — and by then Vesper and Kingfisher alone, given five uncontested rounds of support fire, had already taken the Claimant most of the way to 0 HP. The Frame arrived, landed a token hit, and the fight was already over. That's the SAME bug this whole section exists to fix, just relocated from "per-hit damage" to "rounds of uncontested access" — vehicles were still the ones winning the fight, only slower. The honest fix isn't a literal mph number (the compression was already stated as a pacing device, not a translation) — it's picking an arrival beat that actually produces the scene being designed for: vehicles hold the line alone, then the Frame arrives with real rounds left to be decisive. Round 3 does that; Round 6 didn't, regardless of what a straight mph-to-round conversion said.

### 14b. Scale-Hardness — a Claimant shrugs off small arms the way a tank shrugs off rifle rounds

New Claimant stat: **Scale-Hardness 15**, applied only to Strikes carrying the `mounted` trait (i.e. vehicle-mounted weapons) — never to a Frame's own weapon. This is the same Hardness concept vehicles already use for their own armor, applied the other direction: a building-scale creature's mass and toughness simply aren't proportionate to a car-mounted gun, the same way a tank shrugs off small-arms fire that would matter against an infantryman. It composes with (and is checked after) the Interdiction Field's binary immunity — while the field holds, nothing gets through regardless of scale; once it's down, scale is what decides how much of a hit actually registers.

### 14c. Vehicle weapons retuned to GM Core's own Low tier

GM Core's Strike Damage guidance is explicit that this is the correct tier for a support combatant, not an improvised nerf: *"more versatile creatures, such as ones that can cast some spells and aren't meant to primarily get their damage through Strikes, go one category lower... low for agile and ranged Strikes."* Vehicles are exactly that case. Retuned from Moderate to **Low** at level 12: attack **+20** (was +24), damage **3d6+10, avg 20** (was 3d8+12, avg 25) — GM Core's own table, not eyeballed.

**Combined effect, worked through:** a vehicle hit post-field-break is `20 (raw) + 15 (weakness) − 15 (Scale-Hardness) = 20` — real, but a Frame hit is `30 + 15 − 0 = 45`, better than double. Pre-weakness (or against a Claimant with no field mechanic at all), a vehicle hit is `20 − 15 = 5` — a slow grind, clearly secondary. A vehicle **critical**, though, still lands hard (`~41 raw doubled, +15, −15 ≈ 41`) — vehicles can have a real, exciting, lucky moment in a fight; they just can't be relied on to grind a Claimant down through sheer numbers the way five of them did before this fix.

### 14d. What vehicles are actually FOR — new actions, not just weaker guns

A weaker gun isn't a role. Two new vehicle-available actions, built directly into the simulator:

**Spot** *(1 action)* — call out a target's patterns to an ally, granting their next Strike a +2 circumstance bonus to the attack roll. This is the direct mechanism for *"vehicles enable Frames to become their optimal Claimant-defeating tools"* — a vehicle's job, once the Frame is on-scene, is to make the Frame's hits land, not to out-damage it. Ties to the already-accepted vision-as-chassis-axis idea: the chassis with the best vision is the one best positioned to do this.

**Evacuate** *(2 actions, must be 30ft+ from the Claimant)* — peel off to get civilians clear, contributing to the same Shelter Evacuation pool `data/subsystems/day-1-ground-layer.json` already tracks for the personnel-scale ground team. This is a real trade-off, not a freebie: a vehicle spending its turn here is a vehicle not shooting and not spotting, and it has to physically be away from the fight to do it. It's the mechanism for *"helping protect the people of the city directly."*

**Noted, not yet built:** Power Reroute / infrastructure interaction (opening a barrier, cutting power to something, creating a hazard) — genuinely distinct from a Ground Role kid doing similar work on foot (a vehicle can reach and act on infrastructure across a much larger area, much faster), but needs its own concrete design pass rather than being squeezed in alongside this fix. Tracked as a natural next addition, not assumed.

### 14e. The ground layer is now actually simulated, not assumed

Through 14d, `fieldBreaksAtRound` in the simulator was still a scripted assumption — "the ground team did their job at round 2." As of `tools/battle-simulator/ground-layer/resolve-ground-layer.mjs`, it's a real result: five real level-1 kid stat blocks (`tools/battle-simulator/data/kid-fixtures/` — SF2E Adventure Pregens, one per Player Core class, reflavoured but mechanically untouched, extracted directly from `gamesystems/sf2e/packs/` and re-derived via `tools/character-builder/`) roll real d20s against `data/subsystems/day-1-ground-layer.json`'s actual DC 15 obstacles. Whether Field Integrity ever reaches 6, and on which round, now depends on the dice — including the real possibility, previously foreclosed, that it never breaks at all inside the ground team's 3-round window. The five kids split into a Spot/Shepherd lane once per scene, sized proportionally to the two pools' own win targets (6:8 → roughly 2:3 of five kids), each using whichever of their own skills best fits their lane — a neutral stand-in for the trolley-problem choice `day-1-ground-layer.json`'s own notes insist stays a human table's call, not something to soften or resolve in code.

This is the same "borrow a pregen, reflavour it" shortcut path noted as valuable alongside a real from-scratch process — `tools/character-builder/derive.mjs` implements the actual Player Core chargen steps (ability boosts and their +4 level-1 cap, HP, Perception, saves, skills, AC, Class DC, each cited to its exact page), and is verified correct by reproducing all six Player Core pregens' own published HP totals exactly, not just self-consistently. The same engine is meant to run the real six kids' character creation later; the pregen fixtures are ingredients for this simulator, not a proposal for who those six kids are.

### 14f. City scale for real: 10x distances, shared deployment, real initiative, and a checked action-economy ledger

Four related changes, all landed together (2026-08-22) because each one exposed the next while being built and tested against the real simulator — this section is the honest record of that, not a tidied-up design note written after the fact.

**10x distances, as a reskin.** `engine/grid.mjs`'s `FEET_PER_SQUARE` moved from 5 to 50 — ten times PF2e/SF2e's default tactical-grid unit. Every Speed, weapon `rangeIncrement`, and `reach-N` trait in `data/combatants.mjs` and the real Claimant file (`data/antagonists/claimants/contact-unclassified.json`) was multiplied by the same 10x, so square-counts-per-turn — and therefore how many rounds anything takes — are IDENTICAL to before the rescale. Only the feet numbers that show up in logs and the UI got bigger and more cinematic, which is exactly what "even if we're just reskinning it" asked for: the map can now plausibly read as a city, its suburbs, and the foothills beyond, without re-tuning a single balance number.

**Round 0 deployment replaces arrival waves.** §14a's `arrivesOnRound` lookup table — hand-authored round numbers standing in for cross-city travel — is gone. Every combatant now deploys at a real, shared starting position at "Round 0" (before the clock starts) and simply moves at its own (now-10x'd) Speed from round 1 on; arrival timing is an emergent result of real movement, not an authored abstraction. This is strictly better at solving the exact problem arrival waves existed for (§14a's "100+ rounds if simulated literally" concern) — because distance and Speed now share the same 10x rescale, real simulated movement costs the SAME number of rounds a lookup table would have guessed at, so there's no reason left to guess. Party combatants deploy together at the offshore fort anchoring downtown, in the darker structure at the map's bottom-left (`assets/battle-map.jpg`) — a tight cluster of adjacent squares, not stacked on one. The Claimant deploys a real distance away, in the foothills at the map's far side, and Advances on an objective near that same downtown core.

Getting here surfaced two real, unrelated bugs in the party AI's movement heuristic (`computeDestination`, `ai/party-ai.mjs`), both invisible at the old scale because starting positions were always close enough that the heuristic's flaws never had room to matter:
1. It budgeted a flat "N squares = N × FEET_PER_SQUARE" — the exact class of bug the adversarial workflow already found and fixed in `engine.mjs`'s Advance handler (a flat per-square cost undercounts a real 5-10-5 diagonal path). Fixed the same way: walk one square at a time and check the real cumulative `distanceFeet` against the actual Speed budget.
2. Along a purely orthogonal approach (dx=0 or dy=0 — the common case once everyone launches from one shared cluster), its two "lateral" fallback candidates degenerated into duplicates of the blocked straight-ahead square, leaving zero real alternatives — one teammate parked in the way could stick a mover (the Frame, repeatedly, in practice) at spawn for the rest of the fight. Fixed by adding real perpendicular sidestep candidates, plus a hard iteration cap as a defensive backstop against any pathological formation hanging the search.

**Real initiative — and Frames are worse at it.** `initiativeOrder` used to just be `scenario.combatants`' array order: no dice at all. Every combatant now rolls d20 + its own `initiativeModifier` once, at the top of the battle (Player Core pg. 427, "Step 1: Roll Initiative"), sorted highest-first. Per GM Core pg. 236, a vehicle's pilot "can usually roll an appropriate piloting skill... for initiative," and Player Core pg. 427 explicitly allows initiative to use a non-Perception check when the fiction calls for it — so vehicles use their own Reflex (already the stat their agility identity was built on: Vesper/Kingfisher 25, Hod 16), while the Reference Frame gets a distinct, explicitly LOW `initiativeModifier` (10) — deliberately below every vehicle's, representing servo lag and raw bulk at the start of a fight, separate from its Reflex SAVE (21, unchanged — dodging an area blast once already moving is a different thing from getting moving in the first place). A differently-built "agile mech" archetype could reasonably set this close to or above 20; the reference Frame deliberately isn't one. Verified statistically (`test/battle-simulator/engine.test.mjs`), not just for one lucky/unlucky seed: across 30 seeds, the Frame beats both agile vehicles' initiative in under 30% of them.

**A checked action-economy ledger.** Every turn now closes with `turnLog.actionAccounting` — `{available, spent, held, heldReason}` — stating what every action point the combatant started its turn with was actually spent on, or exactly why it wasn't. This isn't just a display field: `accountForActions()` in `engine.mjs` THROWS if the numbers don't add up (points spent that exceed what was available, or points held with no recorded reason) — the same "fail loudly, at the source" discipline the legality layer already applies to illegal moves, now applied to the action economy itself. The artifact's new character-sheet panel (below) renders this ledger directly per turn, and the screen log gets a one-line summary too.

**The character sheet panel.** The replay UI's roster panel was always a compact HP-bar summary; it now sits alongside a full sheet for whichever combatant is acting, showing exactly where every number in the narration comes from: AC, HP, Hardness (+ Scale-Hardness where relevant), effective (damage-state-adjusted) Speed, the initiative roll broken into `d20 + modifier`, saves, Strikes with their full attack/damage line and traits, Resonance Band or Field Repair stats where relevant, and the turn's action-point ledger. Frame-scale combatants (Claimant/Frame/vehicles) are GM Core-style flat authored stat blocks by design — real SF2E monster/vehicle rules don't derive their AC from parts the way a PC sheet does — so the sheet shows exactly the numbers that exist rather than fabricating a breakdown that isn't real. An initiative strip above the map shows the whole roll-off at a glance, and Round 0 is now a real, visible step in the scrubber, narrating every combatant's starting position before round 1 begins.

## 14g. Real rules first, then decide what to bend — and the Claimant becomes an actual threat

Ingram's instruction, verbatim in spirit: treat the actual SF2E rules as law, verify them directly against the SRD mirror rather than trust recall, and only THEN decide what this simulator deliberately bends. Re-checked directly against `reference/srd/` (not assumed): action economy (Player Core pg. 427, "you regain 3 actions and 1 reaction" — matches what was already built), Multiple Attack Penalty (Player Core pg. 11, "-5 on the second attack... -10 on the third" — matches). One real, confirmed gap turned up: **range increment penalties were never implemented at all.**

**The range-penalty gap.** Player Core pg. 254, verbatim: "Attack rolls beyond a weapon's range increment take a -2 penalty for each additional multiple of that increment between you and the target. Attacks beyond the sixth range increment are impossible." `checkStrikeRange` only ever enforced the second half (the hard cutoff at the 6th increment) — the actual -2/-4/-6/-8/-10 accuracy penalty for every increment short of that was simply never applied. Combined with vehicle weapon ranges that had been (wrongly) scaled 10x along with the rest of the map in §14f, this is exactly how a helicopter's ordinary sidearm ended up landing an undamaged hit from a distance that should have been a near-impossible shot — Ingram's own words, "impossibly far to hit." Fixed with `rangeIncrementPenalty()` in `legality.mjs`, verified against Player Core's own worked example (a 60ft pistol: 0 inside 60ft, -2 to 120ft, -4 to 180ft) as a direct unit test, and wired into every Strike's roll alongside MAP.

**Weapon ranges corrected — a reskin was applied to the wrong axis.** §14f's reasoning ("scale distance and Speed together, square-counts stay identical") is right for movement, wrong for a weapon's range increment, which is a property of the gun, not the map. Real SF2E catalog data (`gamesystems/sf2e/packs/equipment`, not invented) puts personal sidearms/rifles at 30-120ft regardless of battlefield size. Vehicle sidearms now use real, unscaled numbers (60-100ft) — short relative to the new city-scale map on purpose, so closing distance is a real cost again and the range penalty above has real room to bite.

**Limited-use long-range ordnance.** Two vehicles (Vesper, Hod) now each carry one expensive, single-use long-range weapon (Rocket Pod / Heavy Ordnance Round — GM Core's Moderate tier, the pre-§14c-nerf numbers, justified here by scarcity instead of an accuracy cut) with real reach across the map (2000ft increment). `strike.usesRemaining` is a new, general mechanism — `checkStrikeLegal` refuses to fire a Strike at 0 remaining, `attemptAction` decrements it on a successful shot — reusable for any future limited-consumable weapon, not special-cased to just these two. The Frame's melee weapon needs neither a range increment nor ammo at all, which is the asymmetry Ingram asked for directly: a Frame's answer to long range is closing the distance, not conserving rounds. Replacing a spent shot is a between-missions funding problem the campaign's existing credit economy already has a home for — not something this single-encounter simulator models.

**Is the Claimant an actual threat? It wasn't.** Direct question, direct answer: across every run before this fix, the Claimant dealt exactly 0 damage unless a party combatant happened to end a move exactly adjacent (triggering Claim as a reaction). Root cause in `claimant-ai.mjs`: Advance costs 2 of its 3 actions; the 3rd was hardcoded to `return null` — never even considered a Strike. Scale-Blind's own text ("Strikes can only target Large or larger creatures and objects") implies it CAN Strike proactively; "it is not fighting the Frame — the Frame is in the way" reads as "whatever ends up in reach gets hit," not "only by accident." Fixed: Advance still comes first, unconditional and unchanged, but if anything Large+ is within Sweep's reach afterward, the spare 3rd action now Strikes it. Verified statistically, not on one good-looking run: across 8 seeds, the Claimant now both attempts Strikes and lands real damage in every one (`test/battle-simulator/claimant-ai.test.mjs`).

**A stalemate found BY fixing the above, and fixed in turn.** A 20-seed statistical check (exactly the "continue your adversarial checks" instruction) run immediately after the Claimant fix found something worse than the drama problem it solved: 13 of 20 seeds ground out to a generic "timeout" with the party mechanically unable to deal ANY damage for the back half of the fight. Cause: `ground-layer/`'s field-break roll has a real, designed chance of never succeeding within its fixed 3-round window (§14e) — and once that happens, nothing can ever lift the Interdiction Field for the rest of THIS encounter either. Before the Claimant fix, that just meant a harmless stand-off; after it, it meant 5+ more rounds of the Claimant landing real Strikes while the party could do nothing back at all — not drama, just removed agency. Fixed with a new, honest `"stalemate"` outcome in `checkOutcome`: detected the moment every living opposition combatant is permanently immune (no scripted event left that could change it) rather than grinding out rounds that can no longer produce a different result. One further bug caught fixing THIS: a naive version fired the stalemate at round 1 even when the ground team's real 3-round window hadn't played out in-fiction yet, because a failed roll means `scriptedEvents` is empty from the very start, not "empty because round 3 already passed." Fixed with `scenario.stalemateNotBeforeRound` — a scenario builder's own domain knowledge about how long its "real, in-fiction" uncertainty window actually is.

**An open finding, not fixed, flagged instead:** across that same 20-seed check, the ground team's roll broke the field in only 6/20 (30%). The 2-Spot/3-Shepherd lane split (§14e) sizes Field Integrity's effort proportionally to its 6-of-14 share of the two pools' combined target — but 2 kids × 3 rounds × ~0.8 expected value per action ≈ 4.8 expected, structurally *below* the 6 needed, before variance even enters it. That's not a bug — the ground-layer math has always been honest about "this is not achievable" as the whole point of the subsystem — but a 70% stalemate rate is a real number worth Ingram seeing and deciding on, not something to quietly retune without being asked.

**Deployment clumping and a UI bug, both found by actually looking.** Every party combatant's Round 0 position is now 2 squares (100ft) from a shared center in a "+"-plus-one-diagonal formation, not 1 — found by rendering the actual map and measuring: token radii (14-22px) are large enough relative to the map's ~30px grid squares that immediately adjacent tokens visually overlapped even on genuinely distinct squares. Separately, the active-combatant ring in the map view was sweeping a wide arc across the whole board instead of spinning in place — `transform-origin: center` on an SVG element without `transform-box: fill-box` resolves against the SVG viewport's own origin (0,0 of the whole canvas), not the ring's local center. One CSS property (`transform-box: fill-box`) fixes it.

## 14h. A real decision-making framework, for both sides — "don't half-ass this"

Ingram's instruction after a battle-log screenshot raised a real question (the Claimant's action ledger showed two Advances then a Strike, with no visible reason the Strike should have landed on anything) — first as a request for "something like a decision tree," then, mid-turn, escalated explicitly: *"Don't half ass this. We need the best possible system for automating SF2E combats. We need to run simulations and lots of them, so you need good ways to generate those decisions that make sense and which work towards either the enemies goals or the players. This is a big thing, not a small thing to consider."* That's the mandate this section covers: replace `claimant-ai.mjs`'s and `party-ai.mjs`'s hand-written if-chains — accurate as far as they went, but a different bespoke policy per combatant id — with one shared, genuinely reasoned framework usable for either side.

**The architecture: utility AI, not a behavior tree.** Rejected a full behavior-tree/blackboard system as unjustified complexity for what this project actually needs (a handful of roles, one opposition combatant, no need for composite selectors or persistent blackboard state). Built instead as four small, separately-tested layers:

- `ai/considerations.mjs` — pure expected-value math (`expectedStrikeDamage`, `expectedRepairHealing`, `hitProbability`, …), every one of them reusing the engine's own `degreeOfSuccess` resolver directly rather than re-deriving hit-chance logic independently — the same discipline `rangeIncrementPenalty` and `multipleAttackPenalty` already model: one source of truth for "how likely is this to land," read by both the resolver and the AI. Cross-checked in `considerations.test.mjs` by manually re-deriving `degreeProbabilities`' output via a parallel loop over all 20 d20 faces.
- `ai/candidates.mjs` — enumerates every realistic action a combatant could take this turn (Strike per weapon per legal target, Move-toward-a-goal, Spot, Evacuate, Repair, Advance), each pre-filtered through the REAL `legality.mjs` checks (never reimplemented) and pre-scored via `considerations.mjs`, carrying a plain-language `reason` built from the real numbers behind the choice.
- `ai/profiles.mjs` — named weight tables (`ATTACKER`, `SPOTTER`, `EVACUATOR`, `REPAIRER`, `RELENTLESS_ADVANCER`) that turn a candidate's raw value into a final score. Role assignment (`profileFor`) is still explicit and capability-driven (Vesper by id, `canEvacuate`/`repairBonus` as real data flags — see below), not an emergent "discover the best role" system; what's new is that a role is now a *table of numbers*, not a separate code path.
- `ai/utility-ai.mjs` — the orchestrator: generate candidates, weight by profile, propose the highest score (or `null` if nothing clears 0 — an honest "hold" is better than a doomed action). `claimant-ai.mjs` and `party-ai.mjs` are now thin wrappers over this one function, kept as named files only so each side's behavior still has its own test file and header comment.

**Capability, not identity — two real data fixes.** Runabout's Evacuate eligibility and the Ladle's Repair eligibility used to be `combatant.id === "runabout"` checks inside the AI. Generating candidates uniformly for every combatant (weights, not branching, is what makes SPOTTER/ATTACKER/etc. behave differently) meant `checkEvacuateLegal`'s total absence of a capability gate — anyone standing 300ft clear could mechanically Evacuate — would otherwise let a Frame propose evacuating civilians. Fixed by adding a real `canEvacuate: true` flag to Runabout's own data (`data/combatants.mjs`) and gating on it in `candidates.mjs`, the same pattern Repair already had for free via `repairBonus`/`handlingDC`. A narrative fact (this rig has passenger capacity) now lives in the rig's own data, not inferred from its name by the AI.

**A limited-use weapon needed more than marginal-value scoring.** The straightforward utility-AI answer to "is this Strike worth taking" — `expectedStrikeDamage`, full stop — correctly makes a doomed strike against an immune target score exactly 0, which was hoped to retire §14g's hand-coded "don't fire the missile at an immune target" special case as an emergent consequence of honest math. It did. But the FIRST version of "is a limited-use weapon worth spending" (its value minus the best free alternative's value) wasn't steep enough: the Rocket Pod's genuinely-better attack bonus and damage die still cleared a positive marginal value even at point-blank range, where the free sidearm was a perfectly adequate shot — Ingram's own framing ("expensive to use... a terrible waste if they miss... players will have to find the funding to replace it") is a conservation policy, not a pure optimization target. Fixed with a `CONSERVATION_MULTIPLIER` reserve price (`candidates.mjs`): a limited-use weapon only counts value *above double* the best free option's value, so a modest edge never justifies spending it, but a target the free weapon genuinely can't reach (or can barely hit) still gets the limited weapon's full, undiscounted value. Verified directly in `candidates.test.mjs`, not just inferred from the aggregate stats.

**The two bugs a first statistical check actually found.** Per-turn re-verification is now standard practice on this project (§14g's stalemate finding was the first example); running it again on this milestone surfaced two real, high-impact bugs neither test suite nor a single-seed glance had caught:

1. `computeDestination` built its path by re-aiming toward the goal at every internal step, so it could bend around a nearby obstacle over several iterations — but `checkMoveLegality` only ever validates a "move" action as ONE STRAIGHT HOP from the turn's actual start position, with no idea a bent path was ever walked. A destination that looked reachable step-by-step was often rejected outright, holding the whole rest of the turn on an "AI proposed an illegal move" error — invisible with the old single-opponent hardcoded destination, constant once move-toward-target candidates started aiming at genuinely varied points. Redesigned to walk one FIXED direction per candidate (trying the primary line first, then a small set of alternates only if the very first square is blocked), so every square between start and result is checked as part of computing the result — a destination this function returns is now, by construction, always reachable in the one straight hop the engine will actually validate.
2. Every move-candidate generator passed the combatant's FULL `effective.speed` to `computeDestination`, ignoring `turnState.feetMoved` (feet already spent by an earlier action this same turn) — so a combatant's second move proposal in one turn was budgeted as if the first had never happened, guaranteed to overshoot and get rejected. Fixed with a `remainingSpeedFeet()` helper subtracting `feetMoved` from the effective budget, used at all three call sites.

Both were real, pre-existing structural gaps in `computeDestination` (inherited unchanged from §14d's party-ai.mjs, not introduced this session) that the new framework's more varied move-toward-target destinations exposed constantly instead of rarely. Fixed, then reverified: a 20-seed statistical check before the fixes showed real combatants going idle for entire rounds on repeated illegal-move errors; the same 20 seeds after showed **zero illegal-action proposals**, an outcome split (6 party-victory / 14 stalemate) matching §14g's established baseline exactly, and comparable damage totals (Claimant ~35.9 avg dealt, Frame ~30.8 avg dealt per battle) — the framework rewrite preserved the already-verified shape of the fight rather than quietly changing it.

**The decision overlay — showing the numbers, not just logging them.** Ingram's other explicit ask from the same turn: *"I'd like the UI to show arrows / lines to show the distance where a move started and ended and the range of weapon attacks, this helps to visually confirm the actions are landing sensibly."* Added to the artifact's map view: a dashed line with an arrowhead for each legal move/Advance this step (start → end), a solid line (color-coded gold/green/grey for crit/hit/miss) from attacker to target for each legal Strike, and a faint dashed ring around the attacker at the strike's own clean range. Positions are replayed incrementally through the step's own action list (starting from the combatant's position at the end of the *previous* step) rather than read once from the final snapshot, since a turn that moves then strikes needs the attacker's position at the time of the strike, not wherever it ends up if it moves again afterward. The feet-to-pixel conversion and reach-extraction logic (`artifact/geometry.mjs`) is pulled out as a real, independently node:test-tested module — spliced into the published artifact's inline script by `build.mjs` (export keywords stripped) so the artifact stays one self-contained HTML file — specifically because a silent scale bug here would defeat the entire point of building it. Verified end-to-end in-browser (not just unit-tested): rendered a real strike, confirmed the line's class matched the roll's degree, confirmed the range ring's radius converted correctly (a 2000ft increment measured exactly 1200px against the map's real 30px/50ft scale).

**An open finding, not fixed, flagged instead:** `checkMoveLegality` caps a combatant's TOTAL movement for the whole turn at one `effectiveSpeed`, regardless of how many separate Move/Stride actions are spent getting there — e.g. a combatant with 3 actions and nothing else to do cannot Stride three separate times for 3x Speed the way actual SF2E rules allow (Stride: "you move up to your Speed," with no stated per-turn cap on repeating it). This wasn't touched this session — `candidates.mjs`'s fix was to make the AI correctly *respect* this existing cap, not to question whether the cap itself is right — but it's very likely why so many turns in the 20-seed check held with genuinely nothing to do (302/459 turns, concentrated in early rounds spent closing distance): a party that could multi-Stride would close on the Claimant faster and get to act sooner. Whether this is a deliberate simplification worth keeping (many VTTs make exactly this trade for track-ability) or a real fidelity gap worth fixing is a rules-law-vs-bent-law call in the same spirit as §14g's opening instruction — Ingram's to make, not something to change unilaterally mid-framework-build.

## 14i. Reading the actual transcript, not just the aggregate stats

Ingram's instruction, verbatim: *"The roster should reflect the actual initiative rolls. Start with everyone on the field, that's 0, then roll initiative on each character, then organise the roster based on this order, then walk through the simulation. Go through the log of your last simulation. It's a hilarious mess. It needs fixing."* A direct instruction to read a real transcript end to end rather than trust aggregate pass/fail numbers — §14h's 20-seed statistical check proved the SHAPE of the fight (outcome split, damage totals, zero illegal actions) was right, but never once printed out and actually read a full turn-by-turn transcript the way a person paging through the artifact would. Doing that surfaced two real bugs the statistics had no way to catch.

**The roster panel and the initiative strip disagreed with each other.** `log.roster` (the artifact's roster panel, and the Round 0 deployment listing) was built by iterating `scenario.combatants` in scenario-authoring order; `log.initiativeOrder` was computed one line earlier in the same function from a REAL roll, and the actual turn loop already correctly walks `initiativeOrder` — but nothing ever reordered `roster` to match. The result: two panels on the same screen telling a viewer two different stories about who acts when, and a Round 0 listing that didn't match the fight that followed it. Fixed at the source in `engine.mjs` rather than patching each display: `roster` is now built by iterating `initiativeOrder` itself (looking each combatant up by id), not `scenario.combatants`. A plain JS object preserves string-key insertion order, so this one change is enough for every `Object.entries(roster)`/`Object.keys(roster)` call site in the artifact to inherit the correct order automatically — the roster panel and the Round 0 deployment listing needed no changes of their own. Verified in `engine.test.mjs`: `Object.keys(log.roster)` now equals `log.initiativeOrder` exactly, across many seeds, with an explicit check that at least one seed's real roll actually differs from authoring order (proving the fix tracks a real roll, not a coincidence).

**Kingfisher spent entire battles oscillating in place, never landing a single hit.** Reading the transcript turn by turn (not just totals) showed Kingfisher — a combatant with ample Speed and a working ranged weapon — spending all five rounds of a fight moving its full Speed budget every single turn without ever getting into range: round 2 to `(15,10)`, round 3 back to `(31,26)`, round 4 back to `(15,10)`, round 5 back to `(31,26)` — bouncing between the same two points, never converging, never once striking. Root cause: `computeDestination`'s `extend()` (redesigned in §14h to fix the bent-path/illegal-move bug) walked a FIXED compass direction — one of only 8 possible headings — for the entire remaining Speed budget, stopping only on bounds, occupancy, budget, or reaching standoff range. Since a real target is almost never exactly on one of those 8 headings, walking the full budget in a straight fixed direction sails right past the point of closest approach and can end up much FARTHER from the target than the start — and each following round, recomputing a fresh direction from that now-overshot position, overshoots the other way. §14h's own statistical check never caught this because it only measured aggregate damage and illegal-action counts, and this bug produces neither — it produces a combatant that always takes a perfectly *legal* action, just a pointless one, forever.

Fixed by making `extend()` refuse to take a step that doesn't strictly reduce distance to the target — the walk now stops the instant it would start moving away, using only as much of the budget as actually helps, rather than blindly spending the whole budget because the road kept going. Verified in `candidates.test.mjs` with two tests: one confirming a single call toward an off-axis target (not on a clean 8-way line) always ends up closer than it started, and one reproducing the oscillation directly — two successive calls toward the same target must never have the second one end up farther away than the first, the exact pattern Kingfisher exhibited. Re-ran the real scenario after the fix: Kingfisher converges steadily and starts landing hits by round 3; a fresh 20-seed statistical check afterward shows the outcome split (6/14) and zero-illegal-action count unchanged from §14h's baseline, with every party combatant that carries a weapon now dealing real, non-zero average damage across the batch (Frame 36.3, Claimant 30.5, Vesper 8.7, Hod 7.5, Kingfisher 5.5) — Kingfisher going from a silent zero to a real, if modest, contributor is the actual headline result of this fix, not visible in any total that was already being tracked.

**The lesson, stated plainly because it's the second time it's mattered this session:** a statistical check proves the AGGREGATE shape of a fight is right; it does not prove any INDIVIDUAL combatant's turn-by-turn behavior makes sense. Both are needed. §14h's adversarial re-check (multi-seed stats) and this section's transcript read-through (one full battle, read start to finish) are complementary, not substitutes for each other — see the updated `feedback_battle_sim_statistical_verification` memory.

## 14j. An honest measurement for "no wasted actions"

Ingram's instruction, verbatim: *"We need a system that only validates if everyone uses 100% of their actions because in SF2E it is very very very rare to run out entirely of things to do and less so on a map without walls."* Built `analysis/action-utilization.mjs`: `auditActionUtilization(log)` walks every turn in a completed battle log and classifies each held action point via engine.mjs's own `heldReason` strings (already computed by `accountForActions`, never re-derived) into `legitimate` (Stunned, reduced to 0 HP mid-turn, a real damage-state action-cap drop — genuine SF2E consequences) or `noActionFound`/`illegalProposal`/`unknown` — the categories this audit exists to surface, not excuse. `assertFullActionUtilization(log)` is the hard gate version: throws, listing every flagged turn by name, if anything falls outside `legitimate`.

Run against the escort scenario (§14i's baseline, unchanged by everything built in §14k below, since none of those combatants carry spells): **54.3% utilization — 19 of 35 turns held an action point for "no legal action found," not a genuine mechanical reason.** Every combatant was affected, including the Frame. This is the honest number Ingram's instruction was asking for, not a reassuring one — deliberately reported as-is rather than tuned to look better, per this project's standing practice on balance-relevant findings.

## 14k. Spells and class abilities — "can you cast a spell? do you know your spell list?"

Ingram's question, after asking to see a real playthrough and getting the 54.3% number above: *"Can you cast a spell? Do you know your spell list? Can you use a character ability? ... We need to define roles, abilities, spells and start giving the players options."* Direct diagnosis: every combatant in the simulator (five vehicles, the Reference Frame, the Claimant) had only ever had weapon Strikes and a handful of generic vehicle actions (Move/Spot/Evacuate/Repair/Advance) to choose from — not because SF2E lacks spells and class features, but because this simulator had never modeled them at all. The design bible (line 30) is explicit that a Frame is "built as a full PC using a standard SF2e class... a spell is a kilometre-wide effect" — a spellcasting Frame is squarely inside the original design, not a new idea.

**Grounded in real data, not invented.** Researched first rather than guessed: `reference/srd/`'s spellcasting rules (Player Core's Cast a Spell action varies per spell 1-3 actions, not a fixed cost; cantrips auto-heighten to half level rounded up; GM Core pg. 126's Spell DC/Attack Modifier table gives real level-12 numbers — High tier, a primary caster: DC 32, attack +24) and — critically — real spell/ability CONTENT extracted (`tools/pack-extractor/`, the same mechanism `tools/character-builder/` already uses for the kid fixtures) from the level-1 Mystic pregen ("Lunar-17") in `gamesystems/sf2e/packs/paizo-pregens`: **Eldritch Lance** (a real attack cantrip — "make a ranged spell attack roll against the target's AC, crit doubles," Heightened +1d6/rank, printed 2d6 at rank 1 → 7d6 at the auto-heightened rank 6 a level-12 caster gets) and **Transfer Vitality** (a real class ability — "transfer up to 10 Hit Points... into yourself or a bonded creature," no roll at all, +10 at 5th/10th/15th/20th level → 30 HP at level 12). Neither is invented; both are the actual Player Core text, scaled by the actual SF2E rules for doing so. A real, useful gap surfaced in the process: the six existing kid-fixtures include a Witchwarper and a Mystic (two of SF2E's two full spellcasting classes) but neither has ANY spell/ability data — `tools/character-builder/`'s whole pipeline (`derive.mjs`, `extract-pregen.mjs`) never derives spells or class features for any class, a real, documented gap (not this turn's to close — kids "never touch combat math directly" per `ground-roles.json`, so this was a deliberate, reasoned scope boundary from an earlier turn, not an oversight) left for whenever kid-side combat modeling is actually needed.

**Engine: spellAttack and healAbility as real, parallel action types**, not strikes-in-disguise. `checkSpellAttackLegal`/`checkHealAbilityLegal`/`checkSpellRange` (legality.mjs) mirror `checkStrikeLegal`/`checkFieldRepairLegal` closely but handle what's genuinely different: a spell's own variable action cost (not hardcoded to 1 like a Strike) and a flat range boundary (`checkSpellRange` — no accuracy-penalized increment the way a ranged weapon has; Player Core spells simply state a maximum range). `resolveStrike` is reused directly for spell-attack resolution rather than duplicated — Player Core's "ranged spell attack roll against AC, crit doubles" is exactly the same degree-of-success shape a Strike already resolves. A spell with the attack trait shares the SAME multiple-attack-penalty counter as an ordinary Strike (`turnLog.strikesAttempted`), matching the real rule that any attack-trait action counts toward MAP together, not per-type.

**candidates.mjs: strikes and spells unified into one attack pool, not a parallel near-duplicate generator.** `collectAttackOptions()` merges `combatant.strikes` and `combatant.spells`; `generateStrikeCandidates` scores both through the same `expectedStrikeDamage` math and the same §14h reserve-price conservation logic — meaning a limited-use SPELL competing against a free Strike (or a free cantrip) gets the same "only counts value above 2x the best free option" scrutiny automatically, with no separate mechanism to keep in sync. `generateHealAbilityCandidates` (parallel to `generateRepairCandidates`, but range-gated rather than adjacency-gated, and can target the caster's own HP — Transfer Vitality's real text: "yourself or a bonded creature"). A new `HYBRID_CASTER` profile (damage:1, repair:0.3) fixes a real gap the plain `ATTACKER` profile would have created: `ATTACKER`'s `repair:0` means a heal ability would simply never be considered, so a fighting caster needed its own profile rather than inheriting one built before heal abilities existed.

**Two real bugs found building this, both fixed and tested, not one.** (1) A test-helper bug in my own new tests — `makeSpellcaster()` was missing `...overrides`, so two "different" combatants silently collided on the same id and only one survived the state Map — caught because the resulting crash pointed at the real code, and tracing it down to the test fixture itself (not the engine) took real verification rather than assuming the newer code was at fault. (2) A genuine engine bug, found by the Mystic Frame healing itself mid-turn: `runTurn`'s mid-turn re-derivation of `effective.actionsAvailable` (§14g/§14i's fix for a REACTION shrinking the action cap mid-turn) had no floor preventing the opposite case — a self-heal pushing a damage-state band back UP mid-turn (e.g. Degraded's 2 actions back to Operational's 3), which an unclamped re-derivation let grant a 4th action point the turn never started with. `accountForActions` correctly caught this as a genuine overspend rather than silently accepting it. Fixed by clamping the mid-turn value at the turn's OWN starting budget (`Math.min(effective.actionsAvailable, startEffective.actionsAvailable)`) — real SF2E rule: a turn's action budget is fixed the moment it begins; a benefit gained mid-turn takes effect next turn, not this one. Nothing could trigger this path before a self-targeting heal ability existed, so it was a real, previously-unreachable gap, not a regression.

**A real interpretive finding, resolved but flagged, not hidden.** Eldritch Lance's authentic Player Core range is 30ft — shorter than ONE grid square at this map's already-established 10x rescale (`FEET_PER_SQUARE=50`), which would make a nominally "ranged" spell attack functionally worse than melee. Unlike vehicle weapons (§14g, deliberately kept at their real unscaled range as mundane guns meant to be short relative to the city-scale map), a Frame-scale spell has explicit textual support for scaling UP with the rest of the reflavoring — the same design-bible sentence that licenses "a Strike is a building-sized fist" also says "a spell is a kilometre-wide effect." Rescaled 10x here (30ft→300ft, and Transfer Vitality's 60ft→600ft for the same reason, applied consistently rather than spell-attack-specifically) — 300ft lands exactly on par with the Claimant's own Sweep reach, which reads as fitting rather than arbitrary. This is a real, deliberate interpretive call about how spell range should scale that diverges from the vehicle-weapon precedent — worth Ingram's eyes if he wants it revisited, not something to treat as settled just because it's shipped.

**Verified statistically AND by reading a real transcript (both, per §14i's own lesson).** A dedicated `scenarios/mystic-frame-solo.mjs` (a clean 1v1, no support vehicles, so the caster's own decisions read clearly) across 20 seeds: 122 spell casts, 38 heals, **zero illegal-action proposals**, outcomes `{party-defeat: 5, party-victory: 7, timeout: 8}` (a solo Frame vs the Claimant is a genuinely close fight — expected, not a bug, given the whole campaign design assumes Frames fight WITH support, not alone) and **69.0% action utilization** (§14j's audit), up from the escort scenario's 54.3% with the SAME audit tool, on a combatant whose entire kit is exactly two real abilities. The remaining gap is honestly explained, not hand-waved: a level-12 PC's real character sheet has far more than two known actions (more spells at more ranks, more feats, skill actions like Recall Knowledge) — this test fixture was scoped to prove the SYSTEM works, not to hand-author an entire character sheet, so some "nothing left worth doing" turns remain and are expected until a fuller kit exists. Read a full transcript end to end (seed 18, `test/battle-simulator/`'s new coverage plus a real render via the artifact): the Mystic opens by healing itself after an early Sweep hit, closes distance, opens up with Eldritch Lance the instant the Interdiction Field collapses at round 3, keeps casting through two Stunned rounds, takes real damage from Sweep including two crits, heals again mid-fight rather than only ever attacking, and closes it out with a critical Eldritch Lance for the kill — a coherent, readable fight with real tactical give-and-take, not a scripted march. 280/280 tests passing project-wide.

## 14l. The six kids and six Frames — a first draft, not a lock-in

Ingram's instruction, verbatim: *"Give the six kids and Frames real names, classes, and Anchors - the most fully we simulate things the better."* Every other layer of this project's own documentation flags this exact decision as collaborative creative work reserved for Ingram, not something to fill in unilaterally — CLAUDE.md, `data/characters/kids/README.md` and `frames/README.md`, and `build-kid-fixture.mjs`'s own header comment (written in an earlier session, specifically anticipating this moment: *"the six real kids are collaborative creative work with Ingram... these are simulator ingredients, not a proposal for who they are"*). Given a direct, explicit instruction now overriding that standing default, proceeded — but every file's `status` field says **DRAFT, proposed 2026-08-22, open to full revision**, not a locked decision, and nothing here should be read as more final than that framing states.

**The six kids** (`data/characters/kids/`) are built via `tools/character-builder/derive.mjs` directly — CLAUDE.md's own stated aspiration for how the real six should eventually be built, not the pregen-borrowing shortcut the synthetic test fixtures use. That shortcut was tried first and ruled out on inspection: all six Adventure Pregens turn out to be non-human SF2E ancestries (Ysoki, Kasatha, Vesk, Khizar, Android, Skittermander) — a real mismatch for "ordinary 1950s Japanese teenagers." Built instead as Human (a documented, uniform ability-boost pattern — key ability to +4, one secondary to +2, three others to +1 — and a uniform trained-everywhere proficiency baseline, both flagged honestly in each file's own notes as a reasonable simplification rather than pack-verified per-class data, since `reference/srd/` doesn't mirror the individual class writeups). Setting grounded in `design/campaign-arc.md`'s own tone section — 1950s Japan specifically, not generic historical Japan, "a lot more complex... than just generic Japan" in Ingram's own words — which is why one kid (Kaneda Masaru / Yoon Jae-won) carries a zainichi Korean identity thread (a tsūmei/assumed-name tension that was real, documented social fabric of that exact era), written with real interiority and a dignified Anchor, not as decoration.

**The six Frames** (`data/characters/frames/`) are grounded in GM Core's real level-12 creature-building tables (pg. 121-126: AC, Strike Attack Bonus, Strike Damage, Saving Throws, Perception, Hit Points — all pulled and cited directly, not recalled), scoped the same way the Mystic Frame test fixture already was: ONE signature Strike/spell/ability each, a real playable outline rather than an exhaustive feat-by-feat level-12 build (that would need `derive.mjs`-equivalent tooling extended to level 12, a real, separate undertaking, not attempted here). Tier choices follow the tables' own guidance rather than a flat default — Wakaba (Operative) uses the guidance's own explicitly-named "moderate attack, extreme damage" Operative pairing; Akatsuki and Tsukikage (the two casters) use Low AC/HP per "low AC typically fits spellcasters, who compensate with spell selection." **Tsukikage reuses the exact same real, pack-extracted content already proven in the battle simulator** (`makeMysticFrame()`, §14k) — Eldritch Lance and Transfer Vitality, the same Player Core text, now with AC/HP updated to the real table numbers (30/160) instead of that fixture's earlier ad hoc approximation (28/150); the test fixture itself is untouched, since it's separately serving as tested stress-test infrastructure, not this campaign's actual roster. Every kid-Frame pairing deliberately uses a DIFFERENT class than its pilot (a full 6-class permutation, no repeats) rather than matching — Hiroshi's diplomacy pilots a blunt-force Soldier Frame, Yumiko's bluntness pilots a support Envoy Frame, and so on — each written as a real, if brief, point of narrative contrast rather than an arbitrary label. One real capability gap flagged rather than forced: Hibari's Envoy signature ability (Rally the Line, a real support/command feature) is documented but not battle-simulator-wired, since a genuine buff-granting action type wasn't built this pass — Spot already proves the mechanism works, just not yet generalized to a class feature.

**Verified, not just written.** All twelve files validate against `kid.schema.json`/`frame.schema.json` (including `sf2e-common.schema.json`'s shared `pcStatblock`), confirmed via a direct ajv check. A genuinely useful bonus: `test/tier2-data-corpus.test.mjs` already generically walks all of `data/` (not just kid/frame files specifically) validating schema conformance AND running every file through the real Foundry Actor-data generators (`foundry/blank-inheritance/scripts/core/generators/`) without needing a single new test written — all twelve new files pass both checks as part of the existing 280-test suite, meaning they're not just schema-shaped JSON but actually generate into valid Foundry documents through the module's already-verified Stage 1 pipeline.

## 14m. "Explain WHY alongside WHAT" — the Roleplaying & Decision-Making section

Ingram's instruction, verbatim: *"We need it to explain WHY the character did what they did alongside actually explaining what they did. Perhaps we could visually represent the three actions on screen as three boxes and then have the contents turn up in those boxes (which sometimes combine to show actions with multi action point costs) so that I can see at a glance the order and the specific actions taken by each character each round."*

**The WHY half was already computed, just never shown.** Every legal action has carried a real `decisionReason` string since §14h/§14k — the actual mechanical rationale behind the AI's choice (e.g. "Eldritch Lance vs Contact, Unclassified: attack +24 vs AC 33 -> 26.1 expected damage"), threaded through `engine.mjs` into the log. Nothing in the UI ever displayed it. This section is that fix, not a new mechanism: a real `Roleplaying & Decision-Making` panel now sits between the turn controls and the detailed screen log, with two parts — a **round overview** (every combatant's turn so far this round, one row each, in initiative order) and a **Why This Turn** block giving the currently-viewed turn's reasoning in full, readable prose.

**The box UI is real, not approximated.** Each action in a row renders as a box sized by `flex-grow` to its actual action-point cost — a 2-action spell visibly spans twice the width of a 1-action Move, a 2-action Advance or Evacuate likewise — reusing `actionCost()`/`renderLedger`'s existing pattern (the character-sheet panel already had this for one combatant at a time; the round overview generalizes it across everyone who's acted this round). Verified directly in-browser against the real escort scenario: a 7-combatant round rendered as 7 rows, with Kingfisher's three separate Move actions (found earlier this session, §14i) showing as three genuinely separate boxes in order ("Move 50ft", "Move 1050ft", "Move 50ft") — exactly Ingram's "if the character moves three times I want three separate move actions" ask, confirmed structurally rather than assumed.

**A real bug found building this, fixed at the source.** `actionCost()` was a hardcoded per-type lookup table (`{repair:2, evacuate:2, advance:2}`, else 1) written before `spellAttack`/`healAbility` existed — both have a genuinely VARIABLE cost (a spell's own `actions` field), so the table silently reported Eldritch Lance's real 2-action cost as 1, undersizing its box to look identical to a plain Move. Fixed at the source rather than patched in the UI: all eight of `engine.mjs`'s legal-action branches now log their real `actionsCost` directly on the result (1 for Strike/Move/Spot, 2 for Repair/Evacuate/Advance, `spell.actions`/`ability.actions` for the two variable-cost types), and the artifact reads that field first, falling back to the old table only for results that predate it. Two new regression tests confirm this (`engine.test.mjs`) — one proving a 2-action spell logs `actionsCost:2` next to an ordinary Strike's `1`, one for a heal ability.

**A second, unrelated but real gap found and fixed in the same pass:** the scenario tab bar was two hardcoded buttons with hardcoded click handlers, written before `mystic-frame-solo` (§14k) existed as a third scenario — meaning that scenario had been reachable only via the browser console since the moment it was added, with no actual UI path to it. Fixed by generating tabs from `RUNS.runs`' own keys instead of a fixed list, so a future scenario addition can't silently repeat this. Confirmed in-browser: all three tabs now render and switch correctly.

**Scoped out of this pass, flagged rather than rushed:** Ingram's "better yet" — animating tokens sliding across the map at a measured pace so a turn visually replays instead of jumping between snapshots. This is a genuinely separate, sizable front-end task (CSS/JS position interpolation, a play/pause/pacing control, coordinating the decision-overlay lines' timing with token motion, and reconciling "watch it animate" with the existing scrubber's instant-jump-to-any-step model) — not attempted here rather than shipped half-working and unverified. The multi-arrow-per-move and box-sizing pieces (the concrete, testable half of the ask) are done and verified; real animation is the next real step, not silently dropped.

282/282 tests passing project-wide.

## 15. The AI rebuild — diagnosis and frozen baseline

Ingram, 2026-08-23, after reading a real transcript: *"You'll also see a Claimant who uses two actions to walk forwards but not a third without any logical reason. Your AI is still busted... Stop a moment. Think... go think about how this sort of thing is actually done in real life."*

That instruction was correct, and the honest answer is that §14h's utility AI is **architecturally** wrong rather than buggy. Three independent root causes, established by measurement rather than inspection:

### 15a. What was actually measured

`tools/battle-simulator/analysis/metrics.mjs` (new) exists because §14j's action-utilization audit turned out to answer a **gameable** question. The Runabout scores 100% utilization by alternating two always-legal filler verbs — fully utilized by accident of having something trivially legal to do, not by playing well. Optimising against utilization alone would reward adding more filler. So the metrics module measures several things that are hard to game at once: utilization, idle-turn rate, **verb diversity**, **decision entropy** (Shannon, over the action mix), damage, and illegal-proposal count. The last two of those are what actually caught the failure.

**Frozen baseline — the pre-rebuild AI, 4 scenarios × 20 seeds (seeds 1000-1019), captured 2026-08-23 before any code changed:**

```
GLOBAL   runs=80  outcomes={party-victory:61, stalemate:10, party-defeat:5, timeout:4}
         utilization=57.1%   idleTurnRate=20.3%   illegalProposals=0
         verbDiversity=4.85 (min per combatant 0)   decisionEntropy=1.924 bits
         distinctPlaySignatures=62/80 (77.5%)   meanRounds=5.7

  vesper            util= 32.2%  idle=59.3%  verbs=2 [spot,strike]
  ladle             util= 38.0%  idle=53.1%  verbs=2 [move,repair]
  hod               util= 44.2%  idle=44.2%  verbs=2 [spot,strike]
  claimant-one      util= 60.2%  idle= 0.0%  verbs=2 [advance,strike]
  frame-mystic-test util= 67.8%  idle= 9.0%  verbs=3 [healAbility,move,spellAttack]
  frame-reference   util= 75.3%  idle= 0.0%  verbs=3 [move,spot,strike]
  kingfisher        util= 83.2%  idle= 0.0%  verbs=3 [move,spot,strike]
  runabout          util=100.0%  idle= 0.0%  verbs=2 [evacuate,move]
```

Per-scenario utilization: five-vehicles 54.8%, melee-draws-fire 58.3%, mystic-solo 66.4%, reduced-force 48.9%. In `reduced-force` the Ladle idles **79%** of its turns.

**No combatant, in any scenario, at any seed, ever used more than three distinct action types.** That single number is the clearest statement of the problem.

### 15b. The three root causes

1. **Rules infidelity — the largest single contributor.** `legality.mjs` charged movement against a cumulative *per-turn* Speed budget (`feetAlreadyMovedThisTurn + stepDistance > effectiveSpeed`). Real SF2E's Stride is one action for up to your full Speed, repeatable — three Strides is 3× Speed. Under the old rule, "spend three actions closing distance" was **mechanically impossible**: after one move, every further move that turn was illegal, so the AI correctly found nothing to do and held. Compounding it, we implemented ~8 action types against the SRD's 24+ basic actions (`player-core/383-actions.json`, pg. 406) — the AI had almost nothing to choose *from*, which is the direct cause of the ≤3-verb ceiling.

2. **No world model.** `grid.mjs` (66 lines) was the entire spatial model: a bounding rectangle plus a list of occupied cells. No terrain, walls, cover, LOS, or pathfinding. `computeDestination` was a greedy 7-direction compass walk that produced three separately-diagnosed bugs (§14h bent-path, §14i overshoot oscillation, stale speed budget). Every move candidate scored a flat `value: 1` — a brilliant flanking move and a pointless shuffle were **numerically identical**.

3. **Greedy single-action selection.** `utility-ai.mjs` scored `weight × value` over dimensionally-inconsistent magnitudes — expected damage ~26, civilians 9.0, a flat 1 for all movement, `directive: 1000` for the Claimant. The weights *were* the entire normalization mechanism, hand-tuned to keep the comparison from being nonsense. And because it chose one action at a time with no concept of a turn, the Claimant's held third point had **three independent locks**: `candidates.mjs` hard-blocked move candidates for anything with an `objective`; `RELENTLESS_ADVANCER.positioning` was `0` so a move would score 0 anyway; and a full-Speed Advance left `remainingSpeedFeet` at 0.

### 15c. What the field actually does

Researched rather than recalled. Turn-based tactical combat is a *combinatorial-action, stochastic, partially-observable, multi-agent* game, and each adjective has its own literature: **Hierarchical Portfolio Search** (Churchill & Buro; shipped in *Prismata*, the closest published analogue) and **NaiveMCTS / LSI** (Ontañón, µRTS) for the combinatorial turn; **Information Set MCTS** (Cowling et al.) and determinization/PIMC for hidden information; **Bayesian occupancy filters** for tracking unseen enemies; **Dijkstra maps / flow fields** (Brogue) and **influence maps** for space; **shadowcasting** for FOV; and AlphaZero-style policy+value nets as the ceiling.

The honest verdict for this project: the apex is **not** AlphaZero. This is a GM's diagnostic instrument, not a competitive engine — it needs to play *plausibly, variably, and legibly*, because the question being asked is "would this encounter be interesting and appropriately deadly," and a superhuman optimizer answers a different question. Target: plan search over a well-built world model, with a tunable competence knob.

The load-bearing architectural point: **everything below the decision layer is shared by every rung of that ladder.** Build the world model, forward model, and evaluation properly and the decision algorithm becomes swappable — greedy → plan search → MCTS → learned — with nothing underneath rewritten. The original mistake was building a decision layer on a weak substrate.
