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

## 15h. Rules fidelity first: movement is per-action

Ingram's principle, verbatim: *"Always always aim to reproduce SF2E rules unless we are specifically choosing to break a rule... the action economy in SF and PF is particularly important to get right."*

`legality.mjs` charged movement against a cumulative **per-turn** Speed budget. Real SF2E's Stride is one action for up to your full Speed, and it repeats — three Strides is 3x Speed. Under the old rule, after one full-Speed move every further move that turn was illegal, so "spend three actions closing distance" was mechanically impossible and the AI correctly found nothing to do. Fixed: each movement action is capped at Speed independently.

**Instructive result: fixing the engine rule alone changed nothing measurable.** Utilization stayed at exactly 57.1%. The AI's own `remainingSpeedFeet` still subtracted feet already moved, so it never *asked* for a second move — the engine would have allowed it; the AI self-limited. Fixing both moved utilization to 60.0% and lifted the mobile combatants sharply (Frame 75.3% to 83.9%, Kingfisher 83.2% to 93.5%), while `vesper` got *worse*, because it still generated no move candidates at all.

Two tests were updated because they **encoded the deviation** — one asserted a combatant could not move twice in a turn, one asserted total per-turn displacement stayed within one Speed. Both now assert the correct rule.

## 15i-15k. The new decision layer, and three measured corrections

`ai/decide.mjs` replaces generate-candidates then `weight x value` then argmax. Every candidate is applied to a private sandbox running the real engine and scored as `evaluate(after) - evaluate(before)` — putting movement, attacking, healing and evacuating into one currency (hit points) for the first time. Legality is never re-derived: a candidate is legal iff the real engine accepts it.

Depth is deliberately **1**. Instrumenting the old system showed the median decision had **two** candidates; a beam search over two options is not a search. The generator and evaluator had to be fixed first, and search depth is now a parameter to be justified by measurement rather than assumed.

Three corrections, each found by measuring rather than reasoning:

1. **Symmetric threat pricing made the party refuse to fight.** With `threatExposure` at 0.55 against `offensiveReach` 0.75, a vehicle computed `0.75 x its own ~9 damage - 0.55 x the Claimant's ~30` and rationally concluded it should never approach. Utilization *fell* to 40.9% and party victories collapsed to 13/80. The error was pricing "damage I might take next round, if targeted, if they hit" as commensurate with "damage I deal now." Discounted to 0.12.

2. **The evaluator could not see Spot or Evacuate at all**, so both scored exactly 0 and the Runabout — whose entire designed role is evacuation — stopped evacuating. Added a `spotted` term and a `state.civiliansEvacuated` tally the engine now maintains.

3. **The evaluator was flat outside weapon range**, producing textbook degenerate movement: a real transcript showed the Frame doing move/move/move for four consecutive rounds, 900ft per round, never attacking — choosing arbitrarily among tied options, because `offensiveReach` and `threatExposure` are both zero out of range. Fixed with a **gated closing gradient** that applies only while short of one's own useful range and vanishes on arrival, so approach is worth exactly what it needs to be and cannot be farmed (an ungated version invites infinite kiting or infinite advancing).

Also removed: the `if (best.gain <= 0) return null` gate inherited from the old AI, which alone produced a quarter of all turns spent motionless. Holding is now what happens when the engine offers *nothing legal* — the only honest reason to hold.

**Measured result, 4 scenarios x 20 seeds, against the §15a frozen baseline:**

| | Baseline | Now |
|---|---|---|
| Action utilization | 57.1% | **89.0%** |
| Idle turn rate | 20.3% | **0.2%** |
| Min verbs per combatant | **0** | 3 |
| Distinct play signatures | 62/80 (77.5%) | **75/80 (93.8%)** |
| Illegal proposals | 0 | 0 |
| Sweep runtime | 74ms | 608ms |

**A real balance finding, surfaced rather than retuned: party victories fell from 61/80 to 37/80.** As far as I can establish this is not a regression but the consequence of correct rules — per-action movement lets the Claimant Advance *and* Stride, so it reaches the party far sooner, and its damage across the sweep rose from 5,247 to 11,436. The old per-turn cap was artificially protecting the party. Whether to re-tune the encounter now that the rules are right is a design decision, not something to fix by weakening the AI.

## 15m. Per-simulation log store and the reader

Ingram: *"we need to start organising the simulations into the reader so that we can read them back."* The old `battle-log.json` kept exactly one run per SCENARIO NAME — `output.runs[key]` — so re-running the same scenario at a different seed silently overwrote the previous run. There was no way to accumulate a library.

Replaced with `tools/battle-simulator/logs/` (gitignored, regenerable): one JSON file per `(scenario, seed)` pair, keyed by both — `runId({scenario,seed}) = "escort@1000"` — plus `logs/index.json`, a merged summary (outcome, rounds, utilization, verb diversity, illegal-proposal count, generated timestamp) that a later run only ever replaces its OWN entry in. `run-scenario.mjs` is now a real CLI (`--scenario=`, `--seed=1000-1019` or a comma list, `--roundLimit=`), with a no-args default reproducing the four canonical demo battles — `reduced-force.mjs` (built earlier, never wired to any runner) is now reachable and accumulating logs like everything else. `artifact/build.mjs` assembles every run the index holds into one embedded `RUNS` object; nothing is silently capped, and the build prints total size and run count. Measured: 22 runs (4 scenarios, a real seed spread) embed at 1.63MB total — the fixed 688KB map dominates; the run payload itself is under 1MB for 22 full battle logs, comfortably inside budget for hundreds more before delta-encoding per-turn snapshots would be worth the complexity.

`artifact/steps.mjs` (the turn-flattening logic) and `artifact/library.mjs` (the reader's filter/sort) were extracted as real, independently node:test-tested ES modules and spliced into the artifact at build time exactly as `geometry.mjs` already was — this is the established pattern for "real logic, not DOM glue" in this file.

## 15n. Token animation

The blocker, found before any of this AI work started: `svg.innerHTml = ...` tore down and rebuilt every token on every render, and a CSS transition requires the SAME element to persist across a value change. Tokens are now created once per run and updated in place — position lives entirely in the token group's own `transform`, so retargeting it is what animates (`transition: transform 0.42s` in CSS).

A turn is one scrubber step, and a turn can contain more than one movement action (move, then move again). Interpolating the whole step as one straight glide from start to end would be geometrically wrong whenever those two legs aren't collinear. Fixed by extracting `combatantWaypoints()` — the acting combatant's position at the start of the step, then each move/advance action's own destination, in order — shared by both the animator and the existing decision-overlay line-drawing so the two can never show a different path for one turn. This works WITHOUT the engine logging a real path, because every move/advance generator in this codebase (`stepToward`, the Advance handler) walks a single fixed `(dx,dy)` direction by construction — verified, not assumed — so each leg's lattice points already lie exactly on the straight line between its own endpoints.

Large jumps (scrubber drag, Start/End) snap every token instantly rather than gliding across the whole map — tracked by comparing the new step index against the last one actually rendered; anything other than a one-step delta is a jump. Single-step navigation (Prev/Next/Play) gets the full animated treatment.

**A real bug, found only by testing in an actual browser, not by reading the code.** The first leg of a multi-leg glide was kicked off via `requestAnimationFrame`, on the assumption that a paint-frame boundary was needed before starting the transition. `requestAnimationFrame` never fires for a tab that isn't being composited — confirmed directly by this project's own preview tooling refusing a screenshot with "the Browser pane is not displayed, so the page is not compositing frames" — so a token would silently stick at its start-of-turn position forever in exactly that situation. This is not only a test-harness artifact: real browsers commonly suspend rAF for backgrounded tabs too, so a user who alt-tabbed away mid-replay would have hit the same bug. Fixed by calling the first leg synchronously, right after the forced-reflow that `setTokenTransform`'s instant path already does — no timer needed, and one fewer thing that can silently never fire.

Two known UI bugs fixed in the same pass, since both were in code being rewritten anyway: an invalid `@media` block pasted into a comma-separated CSS selector list (silently dropped dark-mode active-tab coloring — moot now, since the tab bar itself was replaced by the library panel); and the global arrow-key handler had no `e.target` guard, so pressing an arrow key while the scrubber had focus double-stepped (native slider behavior plus the global listener both fired). Verified directly: dispatching a keydown targeted at the scrubber input now leaves the step unchanged (guarded), while the same event targeted at `document.body` advances normally.

Play/pause/speed transport added (none existed before — every navigation was previously instant and synchronous). A brief hit/heal flash on a token that took damage or healing this step gives the map real feedback beyond the roster HP bar, gated off entirely under `prefers-reduced-motion` alongside every other animation in this file.

All of the above was verified by driving the actual built artifact through a real browser (element persistence proven by tagging DOM nodes and confirming the same nodes survive a step change; multi-leg glide proven by checking the token's `transform` attribute at each intermediate leg against the exact expected pixel coordinates; the keyboard guard and play/pause lifecycle proven by dispatching real events and reading real button state) — consistent with this project's standing rule that a test suite proves correctness, not feature behavior, for UI work.

## 15o. Step — the one new basic action this pass, and why the others were deferred

Went back through Phase 1's originally-listed candidates (Take Cover, Seek, Aid, Point Out, Ready, Delay, Escape, Shove, Grapple, Raise a Shield, Sustain) against the SRD mirror with a stricter bar than before: a real, full definition block, not just the name appearing somewhere in the text. A cleaner extraction pass found several of these were **false positives** from the earlier survey — the string "Shove" and "Grapple" each appear exactly once in `player-core/383-actions.json`, both as a passing mention inside a DIFFERENT action's requirements text, not as their own defined entries. Neither is actually in this mirror.

Going through the real, fully-defined 29-action list against this project's own standing rule — reproduce SF2E faithfully, don't invent numbers the mirror doesn't supply — almost everything else was correctly out of reach for a different, specific reason each:

- **Take Cover, Seek, Point Out** — need terrain/cover or a detection/fog-of-war state (Phase 2/3), neither of which lands this pass.
- **Aid** — genuinely defined, but the rule text itself hands the hard part to the GM ("you must explain to the GM exactly how you're trying to help... they determine the DC"). Automating it faithfully would mean inventing a DC/skill-selection heuristic the rules don't specify — exactly the kind of unfounded invention this project's standing practice flags rather than silently supplies.
- **Ready, Delay** — both restructure turn ORDER (a readied action interrupts another combatant's turn; Delay moves your own initiative count), which this engine's turn loop isn't built for. A real feature, not a small one — deferred rather than half-built.
- **Escape, Grapple** — Escape needs something to escape FROM, and Grapple (which would impose that) isn't actually defined in the mirror at all (see above). Nothing to build against.
- **Raise a Shield, Sustain, Area Fire** — each needs a data field no current combatant fixture has (a wielded shield; a sustained-duration spell — checked, none exist; a weapon's area trait/tracking value/expend cost, plus a "class DC" concept that doesn't exist for this project's flat GM-Core-style Frame-scale stat blocks). Would mean inventing weapon data, not just AI work.
- **Drop Prone / Stand** — Drop Prone's own action text is present ("You fall prone") but the Prone CONDITION's actual mechanical effect (the AC/attack modifiers) is nowhere in this mirror — confirmed by direct search, not assumed. Implementing it would mean supplying those numbers from general knowledge, which this project's standing rule specifically warns against ("more reliable than general knowledge of the system, since exact numbers and wording matter here").

**Step** (Player Core pg. 410) cleared every bar: fully defined, needs no terrain, no fog-of-war, no turn-order change, no new data fields — and it interacts directly with the one reaction this engine already has. "Stepping doesn't trigger reactions, such as Reactive Strike" maps exactly onto Claim: closing the last square via Step, instead of Stride, is a real way to reach the Claimant without provoking it. "5 feet" in real SF2E's 5ft grid is one square; at this project's 10x-rescaled 50ft grid the faithful equivalent is one square here too (`FEET_PER_SQUARE`), matching §14f's own established scaling logic. Added as `checkStepLegality` (delegates occupancy/bounds/budget to `checkMoveLegality`, adds only the one-square cap), a new `attemptAction` branch that's identical to `move` except it never calls `checkReactionTriggers`, and a Step candidate in `decide.mjs`'s generator offered specifically when closing on a Large+ enemy.

Measured, 4 scenarios × 20 seeds: verb diversity rose from a mean of ~4.9 to **5.40**, and every single combatant in the corpus now uses Step at least once — including the Claimant itself, which picks it whenever it names a genuinely better destination than any move candidate, not merely for reaction-avoidance (verified directly: no party combatant carries a `reactions` field, so Step's only possible edge for the Claimant is ordinary positional value, not Claim-avoidance — confirmed against a real logged instance scoring 9.9 points above the alternatives on exactly that basis). Utilization held at 89.8%.

**Flagged, not silently accepted:** party victories moved 37/80 → 33/80 alongside this change. Since Step can only ever help the party (it's the only side with anything to gain from avoiding Claim) and never help the Claimant tactically beyond ordinary positioning, a systematic worsening from adding it would be surprising — the far more likely explanation is ordinary path-dependent variance in a chaotic, seed-driven simulation, where one differently-broken tie early in a battle cascades into a different game. Recorded here rather than either dismissed or chased further, so it's visible if a later, larger sweep shows the same direction.

## 15p-15q. The terrain engine: walls, pathfinding, Line of Effect

Built per Ingram's direction: *"I have a separate AI thinking about terrain, eventually we'll have a better terrain LOS system but for now it's fine to have combats on open fields to test basic concepts and you can always throw in some temporary walls for testing purposes."* Scope: build the ENGINE (walls, pathfinding, LOS), verify it against synthetic test walls, author no real city terrain. Multi-square footprints and influence maps — both in the original plan — were deliberately deferred: nothing in the current data model uses either, and building them now would be speculative infrastructure ahead of real demand.

**Terrain data model** (`engine/terrain.mjs`). Authored against Foundry VTT's own Wall schema on purpose — `c:[x0,y0,x1,y1]` in grid-vertex coordinates, `move`/`sight` as real `EDGE_SENSE_TYPES` values — so a wall authored here round-trips into the Foundry module unchanged, no translation layer to drift out of sync. Deliberately bounded scope: a wall is a **binary** blocker for movement and Line of Effect. SF2E's circumstance-bonus cover (+1/+2/+4 AC from partial obstruction, Player Core pg. 416) is **not** implemented — that needs to distinguish a partial obstruction from a full block, real nuance not worth guessing at ahead of any real terrain to validate it against. Line of Effect (binary: can you even target this at all) was judged the higher-leverage half and built first.

A real geometric bug found only by testing, not inspection: the first diagonal-corner-cutting check only examined the two edges adjacent to the *departure* cell, missing walls sitting on the *arrival* cell's own edges — a cell walled on all four sides was still reachable by cutting diagonally into it, since none of its own edges were ever checked. Fixed to check all four edges meeting at the shared corner vertex, verified both by a direct "fully enclosed cell" test and a symmetry test (same result regardless of travel direction).

**Pathfinding** (`ai/world/pathfind.mjs`). Real Dijkstra, wall + occupancy + bounds aware. The real complication: SF2E's 5-10-5 diagonal rule is **path-dependent** — every second diagonal costs double, and which one is "second" depends on how many diagonals came before it *on this specific path*. Reusing `distanceFeet` as a per-edge weight would silently price every diagonal as cheap (each isolated call starts its own alternation fresh), under-costing multi-diagonal routes. Fixed the textbook way: the search state is `(cell, diagonalParity)`, not just `cell` — twice as many nodes, still plain Dijkstra. Verified against the trusted reference: pathfinding's computed cost to nearby cells exactly matches `distanceFeet`'s own closed-form calculation on an open grid, for every tested combination of straight and diagonal legs.

**Integration — three call sites, each opt-in and zero-cost when a scenario has no walls (every scenario today):**
- `checkMoveLegality` gained wall-blocking on top of its existing occupancy check, walking the same path.
- `checkStrikeLegal`/`checkSpellAttackLegal` gained a Line of Effect check.
- `decide.mjs`'s candidate generation gained `bestDestinationToward`/`bestDestinationAway`, real-pathfinding siblings of the straight-line `stepToward`/`stepAway`, used only when `state.walls?.length` is true.

**A genuine infinite-oscillation bug, found only by running a real battle end-to-end, not by any unit test.** The first pathfinding-aware candidate generator found real routes correctly but *scored* them by straight-line `distanceFeet` — which stops correlating with true proximity right next to a wall. Two combatants cycled the **exact same four-round position sequence forever**, never converging, timing out on every seed tried. Root cause was actually two overlapping straight-line blind spots: the evaluator's closing-gradient term, and — the bigger contributor, given its much higher weight — `offensiveReach`/`threatExposure` seeing a phantom "I can hit them!" straight through solid terrain, pulling combatants toward positions pressed against a wall for a shot that could never legally be taken. Both were gated behind a cheap `lineOfEffect` check first (paid for free in the common case since it's O(walls) segment tests, not a search). That alone wasn't sufficient — `bestDestinationToward`/`bestDestinationAway` themselves still scored *candidate destinations* by straight-line distance even though the underlying cells were found via real, wall-respecting Dijkstra. Fixed with a proper flow field: a **second** Dijkstra run, from the *target* this time, gives true path-distance-to-target for every cell in one search (movement/occupancy blocking is direction-agnostic — verified — so "distance from X to the target" computed this way is exactly what "distance from the target to X" would be).

**Verified end-to-end**, not just in unit isolation: a real `runBattle` using the real (unscripted) `decide()` AI, two combatants split by a wall that's open only past row 15. Post-fix, the transcript shows both sides marching directly down their own side of the wall — zero backtracking — converging exactly at the opening, then fighting to a decisive conclusion. Zero illegal proposals. A 5-seed statistical check (not one lucky run, per this project's standing verification practice) confirms zero timeouts/oscillations across the sample. A separate, decoupled test proves LOS blocking specifically: a sight-only wall (`move: NONE`, `sight: NORMAL`) blocks a ranged strike straight through it while leaving movement completely unaffected — and the reverse, a move-only wall, leaves LOS completely unaffected.

**Flagged, not hidden: a real, measured performance cost.** The pathfinding-aware path costs roughly 2.5s per synthetic battle here (two-Dijkstra-calls-per-candidate adds up across many decisions), against a few milliseconds for the no-walls path. Every no-walls scenario in this project is provably unaffected (the full 4-scenario/20-seed sweep remains byte-identical to the pre-terrain baseline — same utilization, same verb diversity, same distinct-play-signature count), but real city terrain, once authored, will need this cost measured against actual scenario sizes before it's assumed acceptable. The natural next optimization, if it's ever needed, is memoizing the target-distance flow field across the several `bestDestinationToward` calls that share one `generateProposals` invocation — not attempted here, since correctness came first and the cost is currently paid by zero real scenarios.

## 15r-15s. Fog of war: perception and belief

Implements the accepted `vision-as-chassis-axis` idea's headline claim: *"Frames are enormously powerful and nearly blind... a Frame without spotters is a giant swinging at what it's told about."* That idea leaves genuinely open which specific mechanism (flat range limit, angle restriction, or a detection-mode/scale-based restriction) applies to which real chassis — Ingram's creative call, not resolved here. What's built is the **mechanism**, flexible enough to express range and scale-based restriction; no real Frame or vehicle is assigned a vision profile anywhere in this work.

**Raw perception** (`engine/vision.mjs`). `canPerceive(observer, target, walls)` folds together: Scale Disparity (reusing the **existing** `scaleBlind` flag — its own rejection message already said "cannot perceive or target," so extending it from attack-targeting to raw sight is completing what the flag already promised, not inventing a new concept), an opt-in `vision.range`, and Line of Effect (the same wall model attacks already use — this engine's binary walls don't distinguish SF2E's Line of Effect from Line of Sight, since without partial obstruction there's nothing for the two to differ on). Wired into `checkStrikeLegal`/`checkSpellAttackLegal` as a real legality gate, not just an AI self-restriction — consistent with this project's "the engine is the final arbiter" design. Deliberately **not built**: angle/facing-restricted vision, the idea's other named option — no movement code in this engine tracks a facing direction, and building that is a real feature in its own right, not a small addition. The data shape accepts `vision.angle` without a breaking change later; nothing consumes it yet.

**Belief** (`ai/knowledge/belief.mjs`) — persistent per-side memory, built on top of raw perception, answering "where do I go looking," not "can I hit them" (that stays gated by real-time perception, correctly and independently). Scoped deliberately narrow after the terrain work's own lesson: belief drives **movement/pursuit candidate generation only**, never the tactical evaluator's threat/reach scoring. Extending it to also inform tactical scoring is a real, deferred next step — not attempted here, given how easily a stale-but-plausible number produced a genuine bug (§15q) the last time this project reached for one, and attacks against an unseen enemy are already correctly rejected by legality regardless of what a stale belief might suggest.

**Deployment-seeding, found by testing the mechanism end-to-end, not by design upfront.** A first implementation started every side's belief completely empty, updated only by live perception. That broke immediately on any wall-split scenario: two sides that can't see each other from turn one (blocked by a wall, exactly like the terrain test scenario) would never generate a single belief entry for the other side, and therefore never look for each other — fog-of-war became "start knowing nothing," not "know the battlefield lineup, then lose track as vision is actually lost." Real tabletop combat doesn't work that way — everyone sees the initial deployment before position-specific Line of Effect quirks kick in. Fixed: a side's first-ever belief refresh seeds every living enemy at its true deployment position (marked not-currently-visible if not actually perceivable that instant); every refresh after that only updates entries for what's genuinely, currently perceivable, leaving everything else exactly where it was last confirmed. A later-arriving reinforcement that's never perceived correctly gets no entry at all — the seeding is one deployment-moment event, not repeated.

**Verified end-to-end** with the real, unscripted `decide()` AI, mirroring the terrain work's own discipline (a unit test proves one function; only a real battle proves the pieces cooperate):
- A near-blind unit (150ft vision) starting 3000ft from an enemy — far beyond its own sight — closes the distance and fights to a clean victory, but *only* because a teammate with 5000ft vision shares the belief. Alone (no spotter), the same unit still finds a *stationary* enemy via deployment-seeding, isolating what that mechanism buys on its own from genuine ongoing coverage.
- A scout that sees an enemy at deployment, watches it flee out of sight on round 1, and correctly keeps moving toward the enemy's *last known* square rather than freezing or wandering randomly.

**A real bug caught mid-verification, and worth naming precisely because of what it teaches**: the first "headline" transcript showed a unit reaching melee range then immediately retreating — reproducing the exact "best of 1 legal option, deeply negative" signature from the wall-oscillation bug. Direct inspection traced it to a units mismatch in the *test fixture itself* (`vision: { range: 2 }`, intended as "2 squares" but actually 2 feet — smaller than one square, making the Strike illegal even at point-blank range) — not an engine defect. Recorded here because it's a second confirmation of the same lesson §15q established: a forced, deeply-negative move is a reliable symptom worth investigating immediately, whatever its actual cause turns out to be.

Every no-walls, no-vision scenario remains provably byte-identical to the pre-fog-of-war baseline (351 battle-simulator tests pass; the full 4-scenario/20-seed sweep is unchanged: 89.8% utilization, 0 illegal proposals, 75/80 distinct play signatures).

## 15t. Retiring the old AI, and a real performance lesson found while doing it

Finished what the AI rebuild's own plan called for but never completed: `ai/candidates.mjs`, `ai/profiles.mjs`, and `ai/utility-ai.mjs` had been dead since decide.mjs replaced them, still sitting on disk and still covered by tests that exercised a deleted decision pipeline. `ai/considerations.mjs` — a compatibility re-export shim, its own header explicit that it "goes away with the rest of the old AI layer once the new evaluator lands" — was retired the same way, its still-valuable coverage merged into `resolve.test.mjs` (the real implementation's own test file) rather than lost.

Migrating `candidates.test.mjs` surfaced a genuine, previously-invisible gap: decide.mjs's `stepToward` walks exactly one fixed heading and returns null the instant its first step is blocked — no sidestep, unlike the deleted `computeDestination`, which tried up to 7 nearby compass headings before giving up. A teammate parked directly on the heading toward the only target on the map left a combatant with zero move candidates at all — a direct recurrence of "the Frame got stuck at spawn for multiple rounds," the exact bug this project fixed once already, just reintroduced in the new decision layer's own primitive.

**The first fix was wrong, and worth recording exactly why.** The obvious repair — fall back to real Dijkstra pathfinding (already built, already tested for walls) whenever the fast straight-line walk returns null — is architecturally clean and was easy to justify. It was also **catastrophically expensive**: a 20-seed sweep that normally runs in ~800ms took **over 90 seconds**. Two rounds of "tighten the gate" (only fall back when there's genuine remaining distance; only fall back for the *toward* case, not *away*, since `stepAway` has no cheap "already satisfied" exit and hits its only null case — a blocked first step — far more often than expected) each helped but didn't solve it, because the real problem wasn't *frequency*, it was **cost per call**: a full flow-field Dijkstra averages ~17ms, and `generateProposals` calls the toward-helper for every weapon range × every enemy, plus contact and melee standoffs — including, critically, a `standoffFeet: 0` "close to melee" call for every enemy already adjacent, which can *never* succeed (you cannot stand on an occupied square) and so hit the "blocked" fallback on **every single decision** for **every combatant already in melee range of anything** — nowhere near the rare edge case the fallback was written for.

Fixed properly by not reaching for the expensive tool at all: `stepToward` now tries up to 7 nearby compass headings itself — a handful of straight-line walks, costing microseconds — reviving the exact approach the deleted `computeDestination` used, which had already been proven performant. Real Dijkstra pathfinding stays exactly where it earns its cost: gated on `state.walls?.length`, genuinely rare, deliberately opt-in.

**Honest bookkeeping on the result.** Because this fixes a real gap in the *default* (no-walls) movement primitive, not just an opt-in feature, the 4-scenario/20-seed sweep is no longer byte-identical to the pre-fix baseline — utilization moved 89.8% → 90.2%, verb diversity 5.40 → 5.33, runtime ~800ms → ~830ms. Unlike every other change in this AI rebuild, that's the correct, expected signature of a genuine improvement to the common path, not a regression to chase back to exact parity.

**The lesson, stated plainly for next time:** a "just fall back to the general-purpose search" fix is only cheap if the SPECIFIC failure it's guarding is genuinely rare. Measure the frequency, not just the correctness, before reaching for the expensive tool — and when a fast path returns "nothing to do," check whether that's because the request was already satisfied (nothing wrong) before assuming it means "stuck" (something wrong needing an expensive rescue).

## 16. Stress-Test Mission One — deliberately maximal, and what it broke

Every scenario built through §15 was a controlled demonstration: one Claimant, at most 6-7 combatants, no more than one or two scenarios ever exercising walls at all. Ingram's direction after reviewing a real transcript of the current system (`mystic-frame-solo@555` — see below) was explicit and deliberately opposite: *"Build a new mission 1, maximum complexity, with the goal of stress testing your AI to find out what it fails at and then patching the system to try and fill that gap... Assume players and opponents will be trying to act optimally with few complete misplays, but not no misplays."* Also explicit: this is engineering, not the real Day 1 — `data/episodes/episode-01-contact-unclassified.json` and its encounter/subsystem files are untouched and stay exactly as designed (simple, tutorial-shaped, one Frame); `scenarios/stress-test-mission-one.mjs` is a separate, clearly-labeled test construct whose only job is finding gaps.

**Before any of this: the transcript that prompted it.** Running `mystic-frame-solo@555` — the existing scenario closest in shape to the real Day 1 fight (solo Frame vs. the real Claimant, scripted field-break) — produced a **party-defeat**, when the design scripts the Frame to win in every branch. Tracing why: the Claimant's Sweep strike had no marker distinguishing it from an ordinary action, so `generateProposals` offered it as a free standalone choice every turn — directly contradicting the statblock's own text, stated three times over: *"It is not fighting the Frame... It only Strikes via its Claim reaction... Blocking it is a choice the pilot has to actively make."* It attacked in 4 of 4 active rounds, landing 219 damage on a 150 HP Frame while the Frame, immune-blocked for two rounds, landed only 43. **Fix:** a `reactionOnly: true` flag on the Claimant's Sweep entry (`data/combatants.mjs`), read in exactly two places — `generateProposals` skips it when building standalone strike proposals, and a new `proactiveAttackOptions()` (attackOptions minus reactionOnly) replaces `attackOptions()` everywhere a combatant seeks range for *its own* attack (the `myRanges` computation, the closing gradient's `ranges`). `attackOptions()`/`bestExpectedDamage()` stay unfiltered everywhere threat is priced *against* something else, so everyone else's threatExposure still correctly respects that standing next to it is dangerous — only the Claimant's own proactive choice is blocked. Re-run on the same seed: zero proactive strikes across all 10 rounds, Claimant left at 16/165 HP at timeout (round limit too short for one lone caster, not a new problem). New invariant test in `claimant-ai.test.mjs` (`type` must never be `"strike"` on the Claimant's own turn) replaces the old one, which had been asserting the bug as a feature.

**Faction relations** (`engine/factions.mjs`, new). The stress-test scenario's four factions — party (2 Frames + 5-vehicle escort), the Claimant, a raider sub-faction (opposition, but a *normal*, killable, `decide()`-driven threat rather than the Claimant's scripted restraint), and a neutral civilian convoy fleeing to extraction — need a real third relation, not `side !== me.side`. Under that naive check a neutral unit reads as "enemy" to *both* sides: the party's evaluator would price protecting the convoy exactly backwards (spending `enemyDamage` to *want* its HP down), and `generateProposals` would legally offer the party a Strike against it. `isHostileTo`/`isAlliedWith`/`splitByRelation` state it as two explicit rules instead of a matrix: party is hostile only to opposition and treats neutral as its own to protect; opposition's hostility *widens* to include neutral (the raiders preying on an undefended convoy is the point). Threaded through `decide.mjs`'s `enemies`/`allies` split and `state-value.mjs`'s `evaluateState` the same way. Verified both as pure unit tests (`factions.test.mjs`) and end to end: across seeds, the raider sub-faction reliably damages the convoy, and no party combatant ever logs a strike or spell targeting one.

**A genuine performance catastrophe, found the moment this scenario first ran.** Every prior wall-aware scenario had 2-4 combatants; this one has 14. `decide()` for a single combatant took **5-15 seconds** — not milliseconds — making a full battle run un-runnable. Two separate, uncached full-grid Dijkstra floods, both previously invisible because nothing before this scenario ever called them often enough to notice:
1. `generateProposals` calls `bestDestinationToward`/`bestDestinationAway` up to ~4 times per enemy (per useful weapon range, close-to-contact, point-blank, disengage) — and each of those, on the wall-aware path, ran **two** fresh `reachableCells` flood-fills internally. With opposition now also hostile to neutral (widening the enemies list further), that's dozens of redundant full-grid searches per single decision. **Fix:** a `cache` Map created once per `generateProposals` call, threaded through every `bestDestinationToward`/`bestDestinationAway` call site, keyed on `(moverId, origin cell, budget)` — safe because occupancy is provably constant for the life of one `generateProposals` invocation.
2. `evaluateState`'s closing-gradient term calls `effectiveDistance`, which falls back to `pathCost` (a *third*, independent Dijkstra implementation, `ai/world/pathfind.mjs`) whenever line of effect is blocked — and `decide()` calls `evaluateState` once per candidate proposal, so this fired for every LOS-blocked ally-enemy pair, on every one of 20-40 proposals, every decision. **Fix:** a `WeakMap` cache keyed on `state.walls` itself (not per-call) — correct because `pathCost` is called here with `occupiedPositions: []` always, so its result depends only on `(from, to, gridSize, walls)`, all four of which are genuinely constant for an entire battle, and `cloneStateForPlanning` already shares `state.walls` by reference across every sandbox fork (its own documented contract) rather than cloning it.

Measured: 5-15s per `decide()` call down to 0.2-2.7s. As a side effect — since other existing tests exercise the same cold path in miniature — the **entire pre-existing 326-test suite** dropped from ~50s to ~5.7s, a ~9x speedup nobody was looking for. A full battle at this scenario's scale still costs real wall-clock time (~50-100s for 6-8 rounds even after both fixes, dominated now by ordinary per-decision overhead across ~200+ decisions rather than any single pathological call) — flagged, not chased further: the goal here was "runnable," not "fast," and further optimization (e.g. caching `evaluateState`'s own O(allies×enemies) loop) is real, separate engineering risk for a scenario that exists to find behavior bugs, not to be a benchmark.

**A combatant that never once moved, for an entire battle.** With performance fixed, the first full run showed both non-escorted neutral convoy vehicles proposing the exact same illegal move every single round, six rounds straight, position frozen from start to finish. Root cause: `pathfindingDestinationToward`'s real Dijkstra correctly finds a destination reachable via a *detour* around an obstacle (respecting occupancy, same as the legality check) — but only ever returned the destination cell, never the route. `checkMoveLegality` then validated the proposal by **re-deriving a straight line** from current position to that cell (`firstBlockedIntermediateSquare`, a simple compass-direction walk) — the wrong path to check for a move that was planned as a detour, since the straight line can cross exactly the obstacle the detour was routing around. Rejected forever, with no way to ever succeed, because the AI kept proposing the same (real, legal-via-detour) destination and the checker kept re-deriving the same (blocked) straight line. **Fix:** `reachableCells` already computes the full cell-by-cell path for every reachable cell (`{cost, path}`) — it just wasn't being surfaced. `pathfindingDestinationToward`/`Away` now attach that path to the returned destination; `checkMoveLegality` gained an optional `path` parameter that, when present, validates the *supplied* route instead of guessing one — every existing straight-line move (the overwhelming majority, and every scenario without walls) is completely unaffected, since no path is ever supplied for those. Verified both as isolated `checkMoveLegality` unit tests (a detour around a blocker on the straight line is accepted; a path that's *itself* blocked is still correctly rejected) and end to end: the same convoy vehicle now reaches its extraction point within 1-2 rounds. Caught the same class of bug a second time in the "step" action branch (candidates share the same wall-aware helper) — fixed identically, before it ever produced an observable symptom, since it's the same leak into `state.positions`/the battle log rather than a behavior difference.

**The most consequential finding: a melee Frame sitting within its own weapon's reach of three nearly-dead enemies — including the Claimant at 7/165 HP — for four consecutive rounds, choosing to reposition instead of striking any of them.** Not a hunch: reconstructed the exact battle state at the start of that decision from the log's own snapshot data, called `generateProposals`/`evaluateState` directly (the real functions, not a guess), and instrumented every one of `evaluateState`'s terms separately to compare "strike the Claimant" against the winning "Spot" proposal term by term. Two compounding, previously-invisible flaws, both only reachable when several allies are simultaneously in range of the same badly-hurt target — which needs enough combatants clustered together that no scenario before this one ever produced it:
1. **`offensiveReach` valued a target by its attacker's full weapon-damage potential, uncapped by how much HP the target actually had left.** A 7-HP Claimant that three-plus allies could all reach contributed as much "worth being able to hit this" credit as if it were at full HP — counted once per ally. Killing it deleted all of that credit at once: measured at **-44.14** points, more than `enemyDamage` (+7, correctly capped at the 7 HP actually available) and `actionDenial` (+8) gained back combined.
2. **The `objective` term was skipped entirely for dead combatants**, not merely frozen. The Claimant, mid-battle, was still meaningfully far from its own objective — a real, currently-earned `+27.50` credit to the party's score for "the threat hasn't reached its goal yet." Killing it didn't lock that credit in at its last position; it deleted the term outright, an additional real cost for winning.

Net effect, measured directly: striking the Claimant scored **-24.47** against Spot's **+4.00** — the evaluator ranked finishing off an already-doomed target *below* a support action that changes nothing about the board. **Fix, both small and precisely scoped:** `offensiveReach`'s per-pair contribution is now `Math.min(bestExpectedDamage(...), enemy.currentHP)` — reach against a healthy enemy is completely unaffected; reach against a nearly-dead one is worth only what's actually left to take. The objective loop's skip condition dropped `|| c.currentHP <= 0` — a dead objective-holder's position is frozen forever, so crediting wherever it died (rather than deleting the term) is not just "less wrong," it's the correct invariant: killing an objective-pursuing enemy can now never score worse than leaving it alive in that exact spot. Re-verified on the identical reconstructed decision: striking the Claimant now scores **+26.17**, decisively the best of 25 candidate proposals; the other two (non-lethal) strikes against wounded scavengers flipped from deeply negative to modestly positive too, confirming the fix generalizes rather than only patching the one measured case.

**What this mission proved, taken together.** Every one of the six findings above needed real scale — more combatants, real terrain, a genuinely mixed-HP battlefield — to become visible at all; every prior, smaller scenario was silently passing through the exact same code paths without ever exercising the conditions that broke them. That is the actual argument for building "maximum complexity" on purpose rather than incrementally: a system that only gets tested at the scale it was designed for never learns what it does at the scale it will actually face.

312 battle-simulator tests / 468 across the full repo, all passing.

## 17. The tactical benchmark — and the finding that the AI is not yet good

Built to answer Ingram's question directly: *"What would it take to convince you that we had strong AI working for turn taking decisions? How can we make tests that prove that we're getting closer towards a good system?"* Predictions were written down **before** any of it was run (reproduced in the scorecard below), because a battery whose expectations are set after seeing the results proves nothing.

### The honest answer to "what would convince me"

There is no ground truth for "the correct move" — nobody can write `assert.equal(decide(state), OPTIMAL)`. So conviction has to be assembled from tiers of evidence, each of which fails differently:

| Tier | Question | Strength | Status |
|---|---|---|---|
| 0. Legality/utilization | Does it act at all, legally? | Necessary, very weak — **a uniformly random bot scores ~100%** | passing since §15 |
| 1. Value-function sanity | Is the scoring function internally coherent? | Strong, cheap, deterministic | **built here**, found 1 major bug |
| 2. Behavioural signatures | Does it focus fire, respect MAP, prioritise threat? | Medium — measures style, not success | **built here**, 3 of 5 signatures poor |
| 3. Head-to-head vs baselines | Is any of that worth anything? | **Strongest available** — cannot be gamed | **built here, and it says NO** |
| 4. Distributional | Mirror matches ~50/50? Robust across shapes? | Strong for bias detection | partially built |
| 5. Qualitative | Do transcripts read like competent play? | Weak alone, essential as a cross-check | ongoing practice since §15 |

**Tier 3 is the one that matters, and it is the one this project did not have.** Everything through §16 was tier 0 and tier 5. That is precisely how an evaluator that scored *hurting an enemy* as bad for you survived a fully green 335-test suite twice.

### The apparatus

- **`analysis/tactical-metrics.mjs`** — six malfunction detectors, each with a named broken pole: focus fire (damage spreading), MAP discipline (swinging three times at a wall), oscillation (dithering), resource use (hoarding one-shot weapons), threat priority (proximity bias), engagement (passivity). A metric with no broken pole is a vanity metric and none were kept.
- **`ai/baselines.mjs`** — three deliberately naive policies (`random`, `nearest`, `greedy`) that reuse the real `generateProposals` and the real engine sandbox for legality, so the **only** variable is the selection rule. This isolates the sandbox-scored evaluator's contribution rather than confounding it with candidate generation.
- **`scenarios/archetypes.mjs`** — five encounter shapes, each costed against `reference/tables/encounter-and-rewards-math.json`'s real XP budget: swarm (8x level-8 lackeys, 80 XP moderate), solo boss (1x level-16, 160 XP extreme), mixed levels (level-14 artillery + 4x level-9 chaff, 140 XP), mirror, and range asymmetry. Deliberately **no walls** — terrain is covered by §16, and including it here would multiply runtime ~1000x and confound "chose well" with "pathed well".
- **`run-tactical-benchmark.mjs`** — behaviour mode and head-to-head mode, the latter with a **side-swap control**: every matchup is played twice, once with the real AI on each side. Without that control, a scenario's own side bias is indistinguishable from AI quality.

### The headline finding

**The real AI loses decisively to "attack whatever is nearest."**

| Archetype | vs random | vs nearest | vs greedy |
|---|---|---|---|
| swarm | 100% | **13%** | **13%** |
| mirror | 100% | **25%** | **8%** |

It comfortably beats uniform-random — so the machinery is doing *something* — and is then beaten roughly 4:1 by a policy that fits in ten lines. Two rounds of principled fixes (below) moved swarm from **0%** and mirror from **8%**, which is real progress and still nowhere near parity.

The other three archetypes turned out to have **no discriminating power at all**: solo-boss, mixed-levels and range-asymmetry each produced the exact pattern `real-as-party 0W-6L / real-as-opposition 6W-0L`, meaning the outcome was determined entirely by which side you were on, regardless of policy. That is a finding about **the scenario design**, not about the AI, and it is exactly what the side-swap control exists to expose. Mixed-levels in particular is unwinnable as built: the artillery outranges every party weapon except two single-use ordnance rounds, so the party cannot engage it at all. Those three need rebuilding before their numbers mean anything.

### Two real bugs found, both in the value function

**1. The monotonicity violation (the important one).** §16 had capped `offensiveReach`'s credit at the target's remaining HP, which fixed the single-attacker case and shipped with a test that passed. The cap was applied **per attacker-target pair**, so the caps summed: with N allies in range of one enemy, the score's gradient with respect to that enemy's HP is `+offensiveReach x N`, which beats `enemyDamage`'s `-1.0` as soon as N >= 2. Every multi-unit fight therefore still punished hurting a target — the direct cause of the 61% mid-turn target-switch rate and the 0-12 head-to-head loss. Fixed by capping the **total** credit per enemy, once, after summing across allies, which bounds the gradient at `offensiveReach` regardless of party size.

The property this violates is worth stating as a rule, because two separate bugs have now broken it:

> **Reducing an enemy's HP must never reduce your side's score.**

`test/battle-simulator/value-function-sanity.test.mjs` now asserts it directly, swept across ally counts 1-5 — the sweep is the test, since the single-ally case passed while the bug was live.

**2. The currency error.** With monotonicity fixed the AI still lost, and the action mix showed why: on one seed it spent **37 of 42 actions moving, took two attacks in a nine-round battle, and dealt 16 total damage** against the baseline's 959. `offensiveReach` at 0.75 priced *being able to* deal damage at three-quarters of *actually* dealing it — but threatening is far cheaper to buy, since one reposition can open several firing lines at once while an attack only ever hurts one target. Worse, once remaining HP is the binding constraint, an attack's net value falls to `(1.0 - 0.75) = 0.25` per point while a move that opens a new line still pays 0.75. Repositioning dominated attacking roughly 3:1. Lowering the weight to **0.2** restored the hierarchy — damage is the currency, position is a tiebreaker — and roughly tripled damage output.

### Prediction scorecard

Recorded before running, scored after. The meta-prediction was "at least two of eight will fail"; five did.

| # | Prediction | Result |
|---|---|---|
| P1 | Swarm focus-fire switchRate < 30% | **FAILED** — 61%, now 44% after fixes. Still spreading damage. |
| P2 | Third-attack share lower vs a high-AC boss than vs a low-AC swarm | **FAILED** — 11.7% vs 9.8%, i.e. slightly *higher*. No MAP awareness differential. |
| P3 | Threat-priority correlation > +0.3 | **FAILED HARD** — measured **-0.72**, actively preferring the harmless targets. Partly confounded (3 of 4 party units cannot reach the artillery at all), but the two units that *could* fire on it never did. |
| P4 | Mirror match ~50/50 | **PASSED, provisionally** — 4W/2L, then 6W/0L after the fixes. Six seeds is too few; 6/0 is ~3% under a fair coin and warrants a larger sweep. |
| P5 | Beats random >70%, nearest >60%, greedy >55% | **PARTIAL** — random 100% (passed decisively), nearest 13-25% (failed), greedy 8-13% (failed). |
| P6 | Limited-use resources spent >50% of the time | **FAILED, then FIXED** — 6/18 before, 14/18 in the swarm archetype after the monotonicity fix. Hoarding was a symptom of the same bug. |
| P7 | No oscillation (explorationRatio > 0.5) | **PASSED** — 0.50-0.75 across all archetypes. |
| P8 | Engages by round 3, always | **PASSED** — first damage on round 1 in every archetype, every seed. |

Confidence was highest that P5-vs-greedy would be a coin flip and lowest on P3; P3 was the worse failure and P5 came out worse than a coin flip. Both directions of error are recorded rather than smoothed, because the point of pre-registering is to be able to notice them.

### What is still wrong, stated as hypotheses rather than conclusions

The AI's attack share is 41-51% of actions against the baselines' 72-88%. It is still under-fighting, and the remaining suspects are **not yet tested**, so they are listed as hypotheses:

1. **`closing` at 3.0/square may still over-reward approach.** It is gated to vanish on arrival, but a melee unit's gate is only satisfied at 2 squares, so it pays a large gradient for most of the map.
2. **`spotted` at 4.0 is a risk-free, always-available filler.** An attack's value is variable and can score below 4; Spot's never does. That is the classic "safe small gain crowds out the correct risky play" shape.
3. **No kill-threshold term.** Expected value treats "guaranteed 10 damage" and "10% of 100" identically, so the evaluator cannot see that a specific attack would *finish* a target — which is exactly the judgement focus fire requires.

The right way to settle these is an **ablation sweep** — vary one weight at a time, measure head-to-head win rate against `greedy`, keep what wins — not more hand-tuning. That is the natural next piece of work and it is now cheap, because the apparatus to measure it exists.

### What would actually convince me

Concretely, and stated so it can be held to:

1. **Beats `greedy` above 60% across both directions on at least three discriminating archetypes.** Currently 8-13%. This is the single number that matters.
2. **Mirror matches land within statistical noise of 50/50 over 40+ seeds.** Currently untested at that sample size.
3. **Monotonicity and the other value-function invariants hold** — automated, and they now are.
4. **Focus-fire switch rate below ~25% in the swarm archetype**, with the baselines scoring worse on the same metric.
5. **Ablation shows every layer earns its place** — turn off belief, or the sandbox, or the closing gradient, and the win rate measurably drops. Any layer that can be removed for free is not paying for its complexity.
6. **Transcripts read as competent** to a human, as a cross-check that the numbers are not being satisfied in some degenerate way.

Right now items 1, 2, 4 and 5 are unmet. The system is **not** yet a strong turn-taking AI, and the honest summary is that it took building tier 3 to find that out — which is the strongest possible argument for having built it.

## 18. Fixing the archetype battery, and the ablation harness's first real catch

Two explicit follow-ups from §17: fix the three archetypes that showed zero discriminating power, then build the ablation harness the "what would convince me" list called for. Both done; the ablation harness immediately found and helped fix a real, measured bug in `closing`.

### Why solo-boss, mixed-levels, and range-asymmetry were broken

All three shared one root cause, only fully visible once checked line-by-line against the real tables: **`standardParty()` — reused from this project's pre-existing campaign fixtures (Reference Frame, Mystic Frame, Hod, Vesper) — was never validated as a fairly-built level-12 party.** Checked against `reference/srd/gm-core/1004-armor-class.json`'s real by-level bands, three of the four units had AC **below the level-12 Low band (30)** entirely. Against a level+4 solo boss's Moderate-to-High attack bonus, that alone made the fight unwinnable by any policy — measured as an identical outcome whether the party was played by the real AI, `nearest`, or `greedy`, which is exactly the "side determines the outcome, not policy" signature the side-swap control exists to catch.

**Fix: `data/archetype-fixtures.mjs` gained a proper benchmark party** — four units (Vanguard, Gunner, Scout, Support) built uniformly to GM Core's own level-12 bands (AC High=33 — "comparable to what a PC fighter would have", per the table's own text — HP Moderate=215, Attack High=+26, Damage Moderate=25avg), varying only weapon shape. `standardParty()` now returns these instead.

**Solo boss, separately, was tuned to the wrong difficulty tier.** Level 16 (party+4) is GM Core's own "extreme... a real chance the entire party could die" — i.e. an encounter the game itself expects to sometimes be unwinnable regardless of skill, a bad choice for an archetype meant to test whether skill matters. Downgraded to level 15 (party+3, severe/extreme: "the hardest encounters most groups have a GOOD CHANCE to defeat"), with real table numbers throughout (AC High=37, Attack Moderate=+28, Damage High=36avg, HP High=344).

**Mixed-levels, separately again, had an unreachable target.** The artillery's `rangeIncrement` was 1500ft — a real, unscaled SF2E siege-weapon number — against a party topping out at 300-400ft. "Close on the dangerous target" was never an available CHOICE for any policy to make well or badly; it was outside the reachable universe within any sane round limit. Reduced to 500ft. A second pass was needed after the first fix: the chaff sat directly in front of the artillery (same row band, ~750ft apart), so once anyone closed distance at all, proximity and danger became accidentally correlated and `nearest` could no longer be distinguished from good targeting. Repositioned the chaff into a genuine screen between the party and the artillery, which now sits well beyond them and off to a flank.

**Range-asymmetry had a plain stat mismatch**, not a scenario-geometry problem: the brawler (170 HP/AC30/+25/avg30dmg) was simply stronger than the skirmisher (90 HP/AC29/+22/avg23.5dmg) in every dimension, so whichever side got to be the brawler won regardless of policy. Both now share **identical** level-12 stats (AC33/HP215/+26/avg25), varying only melee-reach-100 vs ranged-range-300 — isolating the one variable the archetype exists to test.

### Results: real policy sensitivity, where there was none

At 6-8 seeds, side-swapped:

| Archetype | Before | After |
|---|---|---|
| solo-boss vs nearest | `0W-6L` / `6W-0L` (pure side sweep) | `4W-1L-3D` / `3W-3L-2D` (genuinely mixed) |
| mixed-levels vs nearest | `0W-6L` / `6W-0L` | `6W-0L-2D` / `0W-8L-0D` (party side still strong — see below) |
| range-asymmetry vs nearest | `6W-0L` / `0W-6L` (pure stat win) | `1W-7L-0D` / `3W-5L-0D` (genuinely mixed, and revealing) |

Solo-boss and range-asymmetry are now cleanly fixed — real back-and-forth fights (a full transcript of solo-boss shows the boss going 339→315→211→175→126→39→10→0 across 8 rounds while the party's own units drop to single-digit HP along the way, not a one-sided steamroll in either direction).

**Mixed-levels is honestly only partially fixed.** At a larger sample the party side still wins against `nearest`/`greedy` regardless of which policy controls it — a real, remaining finding, but a different one than before: it is no longer "outcome determined by side no matter what", it is "this specific 140 XP composition may simply be under-tuned relative to a properly-built level-12 party's raw power." That is a difficulty-tuning question, not a broken-test one, and is left honestly unresolved rather than papered over with a plausible-sounding fix that wasn't actually verified.

### The ablation harness (`run-ablation.mjs`)

Isolates ONE weight term at a time — zero it out, re-measure head-to-head win rate against `greedy` (the strongest baseline, per §17), report the delta. If a term's removal doesn't measurably hurt the win rate, it isn't earning the complexity it adds. Every ablation reuses the real `generateProposals`/sandbox/`greedy` machinery already built for §17 — the harness adds no new simulation path to trust.

**Scoped honestly, not silently:** belief/fog-of-war is NOT ablated. Every archetype in the battery is open-field with no `vision` field on any combatant, which makes belief a *provable* no-op in every one of these scenarios (`refreshBelief` falls back to ground truth when nothing restricts vision) — ablating a no-op would report "0% impact" and that would be true but misleading. Measuring belief's real contribution needs a vision-restricted scenario, out of scope for this battery on purpose, and the harness says so in its own output rather than letting a missing measurement read as a passing one.

### The first catch: `closing` was actively harmful, not just untested

§17 had flagged `closing` (3.0/square) as an untested hypothesis for the AI's continued under-fighting. The ablation harness turned that hypothesis into a number on the very first run: on range-asymmetry, **removing `closing` entirely raised win rate from 25% to 50%** — a term that helps more by deletion than by existing is not a tiebreaker, it is steering the wrong way.

The mechanism is the same currency error §17 fixed for `offensiveReach`: at weight 3.0, `closing` paid MORE for approaching than `offensiveReach` (already reduced to 0.2) pays for actually threatening once arrived, or than `enemyDamage` (1.0) pays for really dealing damage — so a unit already close enough to fight could still be pulled further out of position by a "one more square closer" credit worth more than acting.

**Tuning this honestly turned out to be non-monotonic at low seed counts**, worth recording rather than hiding: at fixed seeds, `closing=1.0` scored 36% and `closing=0.3` scored *worse* at 17% before `closing=0.75` and a larger 15-seed sample settled at 30-37% — genuinely mixed in both directions rather than a clean side-sweep. The exact optimal value was not resolved this session; a proper sweep (many values, a large seed count, held in one batch rather than sequential trial-and-error) is the honest next step, not a hand-picked number.

**What the fix could not risk breaking:** `closing` exists specifically because `offensiveReach`/`threatExposure` are both exactly 0 outside weapon range (§15k), so a unit with zero credit for approaching has no reason to close at all — the original, already-fixed "four consecutive rounds of move/move/move, never engaging" bug. A new regression test (`tactical-benchmark.test.mjs`) pins this directly: a unit starting outside its own range must still engage within a handful of rounds, so a future correction to this weight can never silently swing back into reintroducing the bug it was never trying to solve.

### An honest new finding, not chased further this session

At the larger 15-seed sample, both `swarm` and `mirror` showed the real AI losing to `nearest`/`greedy` at roughly 30-33% — worse than the smaller 6-seed samples in §17 suggested, and `swarm` specifically reproduced the exact side-sweep signature (`real-as-party` always wins, `real-as-opposition` always loses) that the earlier three archetypes needed real fixes for. This was not chased this session — it surfaces exactly the kind of thing a larger, dedicated sweep (not sequential single-value trial-and-error) should resolve, and is recorded here so it is visible rather than silently left for a future session to rediscover from scratch.

### Two pre-existing tests broke from the `closing` fix — both correctly, neither reverted

Lowering `closing` changed real behavior elsewhere in the suite, and both breakages were traced to
a concrete cause (HP/action traces, not assumption) before touching either test:

- **`claimant-ai.test.mjs`'s Claim-reaction test** required `totalDamage > 0` across 5 fixed seeds
  in `five-vehicles-one-frame.mjs`. At the new weight, units correctly stop at their OWN useful
  range (a reach-100 Frame two squares out, a 300ft-ranged vehicle at 300ft) instead of over-closing
  the extra square to literal adjacency for no reason — so Claim, which only fires on ending
  movement *adjacent*, legitimately stops firing across all 5 seeds (4 of which are also
  stalemates — the ground team's field-break roll genuinely failed, where closing on a permanently-
  immune target would be actively unwise). The underlying mechanism was never in doubt: it is
  already proven deterministically, independent of any tactical choice, in `engine.test.mjs`'s
  hand-built Claim fixtures. Weakened to the honest remaining claim: whenever Claim fires, it deals
  real, non-dud damage.
- **`stress-test-mission-one.test.mjs`'s convoy-movement test** required every neutral combatant to
  either move at least once or start at its extraction point. Traced via a per-turn HP snapshot: a
  45 HP, unarmed convoy vehicle was shot to 19 HP by one raider and finished off by a second, both
  *before its own initiative slot ever arrived* — `engine.mjs`'s round loop skips a 0-HP combatant
  outright, with no turn logged at all. That is `engine/factions.mjs`'s widened opposition
  hostility working exactly as designed ("the raider sub-faction preying on an undefended convoy is
  exactly the point" — this scenario's own header), not the pathing bug recurring. Widened the
  test to accept "died before its own turn" as the third legitimate outcome it always should have
  been.

Neither fix loosens the invariant that actually matters — both still fail loudly on a real
regression (Claim dealing zero damage when it does fire; a convoy combatant that GOT a turn, never
moved, and wasn't home free) while no longer treating a smarter, more efficient AI as broken.

### Where this leaves the "what would convince me" bar from §17

| Bar | §17 | §18 |
|---|---|---|
| Beats `greedy` >60% on 3+ discriminating archetypes | 8-13% (2 archetypes, both broken) | 30-37% (range-asymmetry, now a real test); still unmet |
| Mirror ~50/50 over 40+ seeds | untested at scale | tested at 15: **31%**, a real deficit, not noise — unmet, and newly concerning |
| Value-function invariants hold | built | still holds; monotonicity re-verified throughout |
| Focus-fire switch rate <25% | untested this session | not re-measured after the closing fix — flagged as the natural next check |
| Ablation shows every layer earns its place | not built | **built**, and it already changed the evaluator once |

The honest summary is the same shape as §17's: real, measured progress, real remaining gaps, and — this time — a working instrument that found a genuine bug on its first use rather than requiring another hand transcript-read to surface it.

## 19. Pure RAW SF2E Validation — a real pregen vs. a real NPC, at the real 5ft grid

Everything through §18 tests this project's OWN conjecture: hand-picked stat bands, checked against GM Core's by-level tables but still this project's own judgment about which band fits which role. Ingram's redirect: stop hand-picking, and prove the tactical AI against real, unmodified SF2E data on both sides — a real Paizo pregen character fighting a real bestiary monster, using only what their real sheets actually contain, at real SF2E distances rather than this campaign's 10x rescale. *"You don't invent data, you take real data from pregens and NPCs and only use that... You'll learn more from running things with real data first."* First matchup, already locked: **Lunar-17 (level-1 Mystic pregen) vs. Security Goon (level-1 NPC, `rulebook-bestiaries`)**.

A follow-up redirect substantially widened the testing ambition beyond a simple stand-in fight: *"Draw a building for example, with simple rooms and open doorways, then you can test pathfinding, how the AI reacts to being able to see things to attack vs not being able to see anything to attack."* That needs the real pathfinding/vision/belief machinery working at this new scale, not a toy policy — which settled the architecture question below in favor of porting, not rebuilding small.

### Architecture: PORT the proven Frame-scale AI stack to a 5ft grid, don't rebuild it small

`engine/grid.mjs`'s `FEET_PER_SQUARE = 50` is a hardcoded module constant, imported by 9 files. Threading a runtime distance parameter through all of them risked the (by now several-hundred) already-passing Frame-scale tests for no real gain; a genuinely separate module tree is the same precedent `ground-layer/` already established for exactly this reason (§2) — a personnel-scale number must never appear on the same side of a comparison as a Frame-scale one.

Checked every relevant module's ACTUAL imports before deciding reuse vs. port vs. rewrite, rather than assuming:

| Module | Imports `grid.mjs`? | Treatment |
|---|---|---|
| `resolve.mjs`, `rng.mjs`, `terrain.mjs`, `factions.mjs` | No — zero grid dependency | **Reused directly**, unmodified, via a bare re-export where there was anything to import at all (`terrain.mjs`, `factions.mjs`) |
| `vision.mjs`, `world/pathfind.mjs` | Yes, but the algorithm never references the constant's *value* | **Ported**: same file, grid import swapped |
| `knowledge/belief.mjs` | Indirectly, via its one import of `vision.mjs` | **Ported** (not re-exported) — a bare re-export would still transitively resolve to the FRAME-scale `vision.mjs`, silently pricing every perception check at the wrong scale |
| `legality.mjs`, `engine.mjs`, `combatant.mjs`, `decide.mjs`, `evaluate/state-value.mjs` | Yes, plus real Frame/vehicle/Day-1-only branches | **Ported with real trimming** — see below |

Net effect: mostly a port, not a fresh build. Algorithms carry over; only the distance unit and the Frame-only branches change.

### What got trimmed, and why each cut is real (not laziness)

`personnel-engine/` (new tree, 10 modules, never importing from `engine/`'s Frame-scale files — same isolation `ground-layer/` already enforces) drops everything that is Frame/vehicle/Claimant/Day-1-specific, because none of it exists for an ordinary SF2E PC or NPC:

- **The damage-state degradation track** (`combatant.mjs`) — Operational/Degraded/Critical/Hulked and its AC/speed/action-cap curve. A real level-1 Mystic or Security Goon has flat AC/Speed and the standard 3 actions until 0 HP, full stop — no intermediate band. This one trim cascades: `actionDenial` (state-value.mjs's reward for pushing an enemy across a damage-state breakpoint) has nothing left to reward, so it's gone too, and `snapshotState`/the roster no longer carry a `damageState` field at all.
- **Scale Disparity / `scaleBlind`** (`vision.mjs`, `legality.mjs`) — meaningful only when a "scale" axis exists to be disparate across. Every combatant in this tree is on the same scale.
- **Field Repair, Spot, Evacuate, Advance** (`legality.mjs`, `engine.mjs`, `decide.mjs`) — the Ladle's repair action, the vehicle-spots-for-the-Frame +2 mechanic, the civilian-evacuation action, and the Claimant's occupancy-ignoring scripted move. None of these exist for an ordinary SF2E creature; `state.civiliansEvacuated` and the `spotted` flag are gone from the state shape entirely, not just unused.
- **`checkReactionTriggers`** (the Claimant's Claim) — hardcoded to a Large+ size trigger and "the reactor's one and only reaction," which is real but Claimant-specific machinery, not a generic SF2E reaction-trigger system. **Deliberately NOT replaced with a guess**: Security Goon's real reaction (glimpsed in the raw pack data as something like "Get Back!") has its own real trigger condition that hasn't been extracted or read yet (Phase 2). Reactions stay visible on the roster — real authored data, for transcript honesty — but nothing fires them yet. A direct, unavoidable consequence: nothing in this engine can reduce a combatant's own HP *during its own turn* right now (only an opposing turn's attack can, always against a different combatant). The "re-derive effective stats every loop iteration, hard-stop if disabled" safety net stays anyway — free to keep, exactly right the day a reaction is wired in for real.
- **The Large+-gated Step-candidate heuristic** (`decide.mjs`) — existed solely to let the AI discover "close via Step, not Move" as the way to avoid provoking Claim. With zero reactions firing, Step and Move are currently behaviorally identical, so generating both would only double sandbox forks per decision for no behavioral difference. `checkStepLegality`/the `"step"` action type both still exist — this is only about what `generateProposals` bothers to manufacture on its own, revisited once a real reaction exists to avoid.
- **`stalemateNotBeforeRound`/the `immuneToAllDamage`-driven stalemate outcome** (`engine.mjs`) — the ground-layer Interdiction Field concept it exists for has no personnel-scale equivalent. `checkOutcome` here is party-victory / party-defeat / timeout, full stop.
- **`scriptedEvents`** — nothing in the current plan (a straight fight, no narrative triggers) needs a round-keyed event hook. Cut rather than kept "just in case," per this project's own standing rule against designing for hypothetical requirements.

**One real fix made in the porting itself, not just a copy:** the objective-progress term in the Frame-scale `state-value.mjs` divides by a literal `50` (`distanceFeet(pos, c.objective) / 50`) rather than the `FEET_PER_SQUARE` constant that same file imports and uses correctly one term above it, in the closing gradient — harmless there only because `FEET_PER_SQUARE` happens to equal 50 in that tree. Copying the literal blindly here would have silently scored objective progress in Frame-scale squares on a 5ft grid — a real 10x error. The port uses `FEET_PER_SQUARE` explicitly instead; the Frame-scale original's own inconsistency is flagged as a small standalone follow-up (spawned as its own background task, not fixed here — out of scope for this pass).

**A genuine open scale-sensitivity, recorded rather than silently re-tuned:** the closing-gradient term divides a real foot-gap by `FEET_PER_SQUARE` to get "squares still short of a shot" — at 5ft that's 10x more squares for the same foot-gap than the 50ft grid produced, so `closing`'s weight (carried over unchanged from `DEFAULT_WEIGHTS`) is explicitly NOT assumed to behave the same way here. This is exactly the kind of thing that needs its own measurement pass once a real personnel-scale fight exists to test against (§17-§18's ablation-harness discipline, reapplied at this scale) — not pre-emptively re-tuned without data.

### A real architecture clarification, found while writing the vision-gating test the plan itself called for

The plan's own language asked for proof that a blocked combatant "generates zero attack proposals." Writing that test directly against `generateProposals` failed — and reading the code explained why correctly, rather than the test being wrong to want the property at all: `generateProposals` is DELIBERATELY generous, exactly as the Frame-scale original already documented — it proposes a strike against every enemy, sighted or not, and leaves legality (including Line of Effect) to be checked downstream by the real sandboxed `checkStrikeLegal`. The actually load-bearing guarantee isn't "no candidate is generated," it's "`decide()` can never choose one that fails the sandbox" — which it can't, because illegal candidates are filtered out (`if (!result.legal) continue`) before scoring ever happens. Both properties are now pinned directly (`personnel-decide.test.mjs`): a raw strike candidate against an unseen enemy DOES exist in the proposal list, and `decide()` NEVER chooses it. Functionally identical to "recognizes it has nothing to attack" — achieved one layer later than the plan's own phrasing assumed, and now documented precisely rather than left as a mismatch between the plan's words and the code's real design.

### Phase 0 — the SRD skill-action mirror (done)

`reference/srd/player-core/167-skills.json` turned out to cover only the Skills chapter's *intro* — the real per-skill entries (Athletics's Grapple/Shove/Trip, Intimidation's Demoralize, Deception's Feint, all 19 skills' full untrained/trained actions with real Success/Failure/Critical text) were simply absent, not stubbed. The real content lives at a different, previously-uncited URL pattern (`https://2e.aonsrd.com/skills/N-name`, discovered via the site's own real listing at `/skills`) — fetched and mirrored all 19 as new sibling files (`reference/srd/player-core/skill-N-name.json`, same `srd-article` schema as the existing mirror), verbatim, with an honest inline caveat wherever a fetch returned incomplete data rather than inventing the missing text. `reference/srd/` total: 205 -> 224 files.

### Phase 1 — `personnel-engine/` (done, 117 tests, all green)

Ten modules: `grid.mjs`, `terrain.mjs` (re-export), `factions.mjs` (re-export), `combatant.mjs`, `legality.mjs`, `vision.mjs`, `world/pathfind.mjs`, `knowledge/belief.mjs`, `engine.mjs`, `evaluate/state-value.mjs`, `decide.mjs` — see each file's own header for its specific reuse/port/trim reasoning rather than duplicating it here.

Nine new test files (`test/battle-simulator/personnel-*.test.mjs`), same discipline as the Frame-scale suite: real positive AND negative cases per legality check, the monotonicity invariant re-verified at this scale and swept across ally counts 1-5 (`personnel-state-value.test.mjs`), the pathfinding diagonal-parity cross-check reproducing `distanceFeet` exactly (`personnel-pathfind.test.mjs`), and — the one the plan called for by name — a real `runBattle`+`decide()` end-to-end scenario on a genuine 2-room building with a single doorway (`personnel-synthetic-vision-scenario.test.mjs`): a pursuer with a solid wall between it and the only enemy proposes zero illegal strikes, routes through the one open gap, and lands real damage; the same building with the doorway ALSO sealed times out honestly with zero combat rather than faking a resolution; a separate pursuit test confirms belief correctly holds an enemy's last-known position once it flees out of sight.

### Phase 1b — the real battlemap (done, 125 tests total)

`data/personnel-test-facility.mjs`: three rooms (A/B/C), two doorways, real 5ft grid (14x16), Foundry Wall schema throughout, explicitly synthetic — not derived from the campaign map image, marked the same "TEST FIXTURE" way `data/kid-fixtures/` already is. Three named starting configurations matching the three behaviors Ingram asked for by name: `SAME_ROOM` (open sightline, direct engagement), `ADJACENT_ROOMS` (wall genuinely in the way, doorway nearby), `FAR_ROOMS` (two full rooms apart, no plausible sightline, requires routing through both doorways). Every claim about which setup has/lacks an initial sightline is checked directly against the real `lineOfEffect`/`pathCost` functions in `test/battle-simulator/personnel-test-facility.test.mjs`, not eyeballed against the layout diagram — an early hand-picked coordinate set was WRONG (two "center" points happened to sit exactly on a doorway's row, accidentally handing them an open sightline that defeated the point of the setup) and caught by writing that verification test, not by inspection.

**One real, previously-undocumented trap found while authoring the wall data, worth carrying forward:** `moveBlockedBetween` (movement/pathfinding) matches a wall's `c` array against one specific UNIT edge via exact endpoint equality, while `lineOfEffect` (sight) does true geometric line-intersection. A single long multi-cell wall segment (`c:[6,0,6,8]`) would correctly block sight across its whole span but would silently fail to block MOVEMENT except at the one exact unit edge that happens to match byte-for-byte — a real hand-authoring trap for anyone building a wall run without knowing this. Every wall in this map (and every wall-aware test in `personnel-*.test.mjs`) is built as a loop of unit-length edges, one per row/column crossed, specifically to avoid it. Follow-up done (2026-08-23): now documented directly on `engine/terrain.mjs`'s own header — the Frame-scale engine had the identical trap and nothing there documented it until now — with a regression test in `test/battle-simulator/terrain.test.mjs` ("DOCUMENTATION TRAP") proving both the failure (movement blocked at zero edges along a multi-unit segment, not "all but one" as the original phrasing above loosely suggested) and the fix.

### Phase 2 — real data extraction, both sides (done, 46 character-builder tests)

Every combat number for both fighters now traces to either a real Foundry field or a cited SF2E formula — none hand-picked. The exact raw data for both was pulled directly from the gitignored pack trees before any code was written (a dedicated research pass, not assumption), which is what let extraction/derivation code get the real field paths and gotchas right on the first pass rather than guessing:

**PC side (`tools/character-builder/`) — genuine derivation, not transcription**, since a `character`-type actor stores boost *choices*, never final numbers (`system.abilities` is literally `null` in the raw source). Extended `extract-pregen.mjs` to also surface weapon/spellcastingEntry/spell/feat/action items as raw ingredients, and added five new pure-formula functions to `derive.mjs` — `deriveStrikeAttackBonus`, `abilityForStrikeAttack`, `deriveStrikeDamageBonus`, `deriveSpellAttack`, `deriveSpellDC` — each cited against `reference/tables/dc-and-check-math.json`'s roll formulas. One of these needed a FRESH re-read of `reference/srd/player-core/349-damage-rolls.json` rather than trusted recall: melee Strike damage always adds Strength (even for a finesse weapon attacked with Dexterity — finesse changes only the attack roll), ranged Strike damage adds NO ability modifier unless thrown (full Str) or propulsive (half Str, neither of which any of Lunar-17's weapons have), and spell damage adds no ability modifier at all by default — three genuinely different rules easy to conflate, now each with its own function and citation rather than one over-generalized helper. `build-combat-pregen.mjs` (new) ties these into real Strike/spell objects; every number was cross-checked in `test/character-builder/build-combat-pregen.test.mjs` against the SAME raw data the initial research pass read independently, and matched exactly (attack +6 on all three weapons, spell attack +7, spell DC 17).

**NPC side (`tools/pack-extractor/extract-npc.mjs`, new) — a read-and-rename job**, confirmed exactly as expected: an `npc`-type actor's `system.abilities.*.mod` and `system.attributes`/`system.saves` are already final numbers, no derivation needed. One real, non-obvious gotcha found and now documented in the file itself: an NPC's real Strike numbers (`system.bonus.value`, `system.damageRolls`) live on a `melee`-type item, NOT the `weapon`-type item of the same name sitting right next to it (that one carries only flavor/traits/category, linked via `flags.sf2e.linkedWeapon`) — reading only `weapon`-type items, the naively obvious approach, would have silently produced zero usable combat data.

**A shared, deliberate scope cut on both sides, not a gap**: only ATTACK-ROLL actions are derived. Security Goon's real "License to Break Bones" (Fortitude DC 16, requires the target Prone, four distinct outcomes) and a save-based grenade in Lunar-17's own real kit are both captured as real, cited, DESCRIPTIVE data (`combatant.actions`) but never wired as a usable Strike — personnel-engine has no saving-throw-based action mechanism at all (checkStrikeLegal/checkSpellAttackLegal are both strictly attack-roll-vs-AC), and nothing in the raw weapon/action data structurally distinguishes "attack roll" from "target saves" without reading free-text description prose. Building fragile name-based or prose-parsing detection for two one-off cases would be exactly the kind of guessing this project's conventions warn against; hand-identifying by name with a citation, and stating the cut plainly, is the honest alternative. The same treatment applies to Security Goon's real "Get Back!" reaction and every reaction on the PC side of any future NPC/PC pair — captured as real authored data for transcript honesty, never mechanically wired (see Phase 1's own header note on this in `personnel-engine/engine.mjs`).

One more real, hand-transcribed number, clearly flagged as such rather than presented as a structured-field pull: Transfer Vitality's healing amount. Its raw Foundry data has an entirely empty `system.rules` array — "up to 10 Hit Points (minimum 1)... increases by 10 at 5th/10th/15th/20th level" exists ONLY as free-text description prose, with no numeric field anywhere to derive it from. `build-combat-pregen.mjs`'s `deriveTransferVitality` hardcodes 10 with a comment citing the exact source text — honest manual transcription of a real, verified number, not invention.

Both fixtures are generated once from live pack data and checked in as plain JSON (`tools/battle-simulator/data/raw-validation-fixtures/lunar-17.json` / `security-goon.json`, via `generate-raw-validation-fixtures.mjs`) — same "generate once, don't require the gitignored pack tree at battle time" pattern the ground-layer kid fixtures already established — with a test (`raw-validation-fixtures.test.mjs`) that fails if either file ever drifts from a fresh live re-derivation. Worth noting plainly: Lunar-17's real pregen name is ALSO already borrowed for the unrelated ground-layer kid fixture `test-fixture-umbilical-control.json` (combat fields deliberately NOT derived there, since a kid "never touches combat math directly" per that file's own header) — two genuinely different, non-colliding uses of the same real public SF2E pregen, not a duplicate or a conflict.

### Phase 3 — the fight itself (done)

`tools/battle-simulator/scenarios/personnel-lunar17-vs-security-goon.mjs`: zero invented numbers anywhere in the file — it only picks which of Phase 1b's three named setups to use and the round limit; every combat stat comes from the Phase 2 fixtures. Run across all three room configurations (`test/battle-simulator/personnel-lunar17-vs-security-goon.test.mjs`, 6 tests): zero illegal attack attempts across every seed checked (20 seeds on SAME_ROOM, 5 each on ADJACENT_ROOMS/FAR_ROOMS), a real spread of outcomes rather than a one-sided sweep, a real distribution of degrees of success (critical successes AND critical failures both confirmed present across a 10-seed sample), and Eldritch Lance/Transfer Vitality both confirmed as real, regularly-used tools rather than dead weight on the sheet.

**A full transcript was read qualitatively (seed 1, SAME_ROOM), not just measured** — the standing practice this project holds itself to. It reads like a coherent, legal SF2E fight a real table would recognize: Lunar-17 wins initiative (13 vs 1), opens with Eldritch Lance (d20 11+7=18 vs AC14, success, 2d6=12 real damage) then a 3rd-action Semi-Auto Pistol shot correctly carrying -5 MAP; the Security Goon replies with three Arc Pistol shots at the correct 0/-5/-10 MAP progression, including one natural 20 correctly resolved as a critical success with damage properly doubled (raw roll 4, applied 8), dropping Lunar-17 from 15 to 2 HP in one round — genuinely swingy, real dice, not curated. Round 2 she correctly triages: Transfer Vitality on herself FIRST (2 HP is an emergency), Eldritch Lance second. Later rounds show her reordering offense-before-heal when not in immediate danger (12/15, 9/15) versus heal-before-offense when critical (6/15) — a real, sensible tactical pattern emerging from the shared evaluator, not scripted per-combatant logic. A natural-1 critical-failure spell miss is correctly resolved via the one-step-worse shift rule. Transfer Vitality's overheal cap is respected exactly (9+10 correctly capped at 15, not 19). The fight ends round 5 at Eldritch Lance finishing the Goon from 9 to 0 HP. Neither combatant moved once in this particular transcript — correct, not a bug: SAME_ROOM places both fighters within Eldritch Lance's and Arc Pistol's shared 30ft range from deployment, so there was never a reason to.

### What's still ahead (as of the initial Phase 0-3 landing)

Everything in the approved plan (Phase 0 through Phase 3) is now built and tested. Real remaining scope, stated honestly rather than silently left implicit: only ONE matchup exists (Lunar-17 vs. Security Goon); only ATTACK-ROLL actions are usable (every save-based action on both sides is real, cited, and inert); only level 1; reactions are visible but never fire (see Phase 1's own note); and `closing`'s weight is carried over from Frame-scale unmeasured at this grid size (§19's Phase 1 section flags exactly why). Extending to a second matchup, a save-based action mechanism, or a real weight-tuning pass at this scale are the natural next steps, not attempted here — each is Ingram's call on priority, not something to start unprompted.

## 20. Saving throws, skill actions in combat, and the artifact viewer — the "keep expanding" pass

Direct follow-up instruction, immediately after §19 landed: *"Expand to saving throws and keep expanding the list of things that PCs and NPCs can do in the simulation... intimidate ends up being a reliable way of using an action point if the current round has a high MAP penalty already, but the even more optimal way of doing things is to try intimidating first, then attacking... Ideally I'd be able to see these combats playing out round by round, action by action, in the UI."* Three real deliverables, all shipped with tests.

### Saving-throw-based attacks (general mechanism)

The hard math already existed and was already tested — `resolveSave`/`basicSaveDamage`/`degreeProbabilities` have lived in `engine/resolve.mjs` since the ground-layer's own hazard saves, just never wired into the main engine's own action dispatch. Added `expectedSaveDamage` alongside them (the save-based twin of `expectedStrikeDamage`, same expected-value-over-all-four-degrees shape) and a new `"saveAttack"` action type through `personnel-engine/legality.mjs`/`engine.mjs`/`decide.mjs`/`evaluate/state-value.mjs` — reusing every one of those dice primitives unmodified. Proven on real data: Lunar-17's own Incendiary Grenade (Reflex, DC 17 — her real Class DC, matching the raw item's own `@Check[reflex|against:class]` text exactly), previously the textbook example of what Phase 2 explicitly skipped.

**A save-based attack never counts toward Multiple Attack Penalty** — Player Core's MAP is specifically an attack-*roll* penalty, and a saveAttack has no attacker roll at all (the target rolls). This is the same reason Demoralize (below) costs nothing extra late in a turn, and it's now a directly tested invariant, not an assumption.

**A real bug found by MEASURING behavior, not by inspection**: `deriveSaveAttacks` originally never read a weapon's real `system.quantity`, so Lunar-17's actual single grenade got treated as infinite ordnance — a 10-seed sample showed her throwing it 31 times and Eldritch Lance usage collapsing from 37 casts to 4. Fixed by reading the real quantity into `usesRemaining`; re-measured afterward (37 Eldritch Lance casts, 10 grenade throws — exactly one per fight across 10 seeds). Pinned as its own regression test. The same "measure the actual emergent behavior, don't just trust the mechanism" discipline that caught §17's original evaluator bugs caught this one too.

### Demoralize, Frightened, and an honest finding about what the AI actually does with it

Intimidation's Demoralize (Player Core pg. 200, mirrored verbatim — a genuine SRD gap of the same shape Phase 0 already closed for the 19 skills, now closed for Frightened too at `reference/srd/player-core/condition-18-frightened.json`) is a full, real skill check against the target's Will DC, applying Frightened 1/2 on success/critical success. Frightened's real text — "a status penalty equal to this value to all your checks **and DCs**" — means it correctly reduces BOTH the frightened creature's own attack rolls AND their own AC (they become easier to hit, not just worse at hitting), decaying by 1 at the end of their own turn, exactly per the mirrored rule. Both directions are live-tested end to end, not just unit-tested in isolation.

**The evaluator change is genuinely elegant, not a bolted-on special case**: `bestExpectedDamage` now folds a combatant's own `frightened` value into their attack modifier, and `combatant.mjs`'s `resolveEffectiveStats` already folds it into AC — meaning the EXISTING `offensiveReach`/`threatExposure` terms automatically start valuing a frightened target correctly the instant `target.frightened` is set, with no new weight term needed. Also never counts toward MAP, for the same reason as saveAttack — the actual mechanism behind Ingram's own "Demoralize costs nothing extra even after two Strikes" observation.

**An honest, measured finding, not silently patched over**: under the CURRENT `DEFAULT_WEIGHTS` (unchanged from Frame-scale, already flagged in §19 as unmeasured at this grid size), Demoralize is mechanically correct but never actually WINS against a direct attack in the Lunar-17/Security-Goon 1v1 — checked directly across several representative positions, not assumed:

| Position | Direct Strike/spell score | Demoralize score |
|---|---|---|
| Fresh turn, ordinary target | 5.2 | 0.13 |
| 3rd action this turn (-10 MAP) | 1.3 | 0.13 |
| Fresh turn, 3 allies present | 5.2 | 0.44 |
| Fresh turn, near-unhittable target (AC 30) | 0.325 | 0.065 |

The pattern holds across every configuration tried: Demoralize's entire value channels through `offensiveReach` (weight 0.2) and `threatExposure` (weight 0.12) — both weights deliberately tuned LOW by §17's own history to fix a *different* bug (repositioning dominating attacking 3:1). That fix, applied globally, also crushed the value of any pure-debuff action whose whole contribution runs through the same two terms. More allies raise Demoralize's score (proportionally, since offensiveReach sums across every ally who'd benefit) but even 3 allies weren't enough to close a 12x gap against a fresh direct Strike. This is exactly the kind of thing the ablation-harness/tactical-benchmark discipline (§17-18) exists to surface — flagged here, not silently re-tuned without real justification, per Ingram's own standing preference. Pinned as a literal, named regression test (`sawDemoralize === 0` across 10 seeds) specifically so a future change to this either updates that assertion with real measurement behind it, or the test itself proves something changed.

### The artifact viewer now renders personnel-scale runs correctly

`tools/battle-simulator/artifact/geometry.mjs`'s `GRID`/`MAP_PX`/`CELL`/`FEET_PER_SQUARE` were hardcoded module `const`s sized for exactly one map (the 44×44, 50ft/square Frame-scale city district) — the reader's "Simulation Library" can hold both scales side by side now, so they became mutable, recomputed per run by a new `setMapScale()` call wired into `selectRun()`. A new `vertexToPx()` (cell-CORNER coordinates, not `posToPx`'s cell-center) renders Phase 1b's real wall data as solid lines directly on the map — the actual room/doorway structure is now visible, not invisible geometry nobody could see. The Frame-scale city-district photo is hidden for any run that carries wall data (a personnel-scale run's own real signal, not a scale flag) rather than showing an unrelated satellite photo sized for a completely different map.

**Verified directly in a real browser session**, not assumed from reading the code: switching to a personnel-scale run correctly renders a 420×480 viewBox (14×16 cells at 30px/cell, matching the real Phase 1b facility exactly), 13 wall-line segments (matching `data/personnel-test-facility.mjs`'s real `WALLS` array exactly — 7 for the A↔B doorway wall, 6 for B↔C), tokens positioned correctly relative to the walls, and a 30ft spell range ring rendering at exactly 180px (6 squares × 30px) — previously would have rendered at 18px, 10x too small, under the old hardcoded 50ft-per-square assumption. Switching back to a Frame-scale run (`Escort`) correctly restores the 1320×1320 viewBox, zero wall lines, and the real city photo — real backward compatibility, not just an added-on branch. One real cosmetic bug found by the same live check (a literal "undefined · undefined" chip on the character sheet, from a Frame-only `kind`/`size` pair personnel combatants never set) and fixed, then re-verified as gone across all 11 steps of a full battle.

`tools/battle-simulator/run-personnel-scenario.mjs` (new) is the personnel-scale sibling of `run-scenario.mjs` — same per-simulation log store (`analysis/run-log-store.mjs`, confirmed genuinely engine-agnostic), same output shape, so `artifact/build.mjs` needed zero changes to pick up a personnel-scale run: it only ever reads whatever `logs/index.json` lists. Kept as a fully separate script (not a mode flag on `run-scenario.mjs`) on purpose — that file's own top-level imports pull in every Frame-scale scenario module, and importing personnel-engine there too would be exactly the cross-scale coupling §2 already rules out for engine code.

## 21. A bigger battlefield, a second PC and NPC, and a real 2v2 — and one honest oscillation finding

Direct follow-up after looking at the viewer: *"The best version was the one where the two sides started further away from each other and with line of sight blocking things. Make the map much larger, more buildings, more walls, more rooms, more doorways. Add a new pregen and cover the gap for any new abilities they would want to use, then add a new enemy npc to the same simulation and run that."* Four deliverables: a bigger map, a second real PC, a second real NPC, a real fight between all four.

### The map: two buildings, twelve rooms, a courtyard

`tools/battle-simulator/data/personnel-test-complex.mjs` (new) — a 36×24 grid (vs. the original 14×16 three-room facility), two mirrored 2×3-room buildings (six 8×8 rooms each) separated by an open courtyard, connected by twelve real doorways. Authored via three small generator helpers (`hWall`/`vWall`/`building`) rather than hand-typed segment arrays, specifically so a much bigger wall layout stays legible — but generated geometry gets the same scrutiny as hand-placed geometry, not less: `test/battle-simulator/personnel-test-complex.test.mjs` proves full 12-room connectivity via a real `reachableCells` flood from every room (not eyeballed against the layout diagram), and this same check caught a real coordinate mistake — the SAME_ROOM setup's original anchor points sat deliberately *off* every doorway's row (correctly, to avoid an accidental sightline), which meant it accidentally had *no* doorway sightline at all. Fixed with two new points (`A_CE_NEAR_DOOR`/`B_CW_NEAR_DOOR`) explicitly aligned to both buildings' shared external-door row. Three setups span the full range the original three-room map established (`SAME_ROOM`, `SAME_BUILDING_FAR_ROOMS`, `ACROSS_THE_COMPLEX`), each now with two spawn points per side for a real 2v2.

`tools/battle-simulator/scenarios/personnel-complex-battle.mjs` (new) is a fully generic scenario builder — `buildScenario({ seed, partyFixtures, oppositionFixtures, setup, roundLimit })` loads real, checked-in fixture JSON by filename and never invents a combatant inline. Building it surfaced one real bug before it could ever bite in practice: `runBattle` keys its live combatant map by `id`, so the same fixture file used twice on one side (two Security Goons, say) would silently collapse to a single combatant with no error — `Map` construction just keeps the last entry for a repeated key. Fixed with a `withUniqueId(fixture, index, side)` helper (`lunar-17-p0`, `lunar-17-p1`, ...) and proven end to end, not just at the data-shape level: a real 2-party+1-opposition battle asserts `Object.keys(log.roster).length === 3`, not 2.

### Choosing the second PC and NPC: a real survey, not a pick

Rather than picking a second pregen/NPC by feel, a background research agent surveyed all 5 remaining real level-1 Player Core pregens and the level-1 NPCs across `rulebook-bestiaries`/`alien-core-bestiary`, checking each one's *actual* raw data against what `build-combat-pregen.mjs`/`extract-npc.mjs` can currently derive — same "verify against real data, don't guess" discipline as everything else in this doc. Full findings matter for future roster picks, so the honest summary:

- **Jaedana (Operative)**: `toIngredients()` throws on an ambiguous boost with no recorded resolution — needs a hand-justified override before anything else can run. Her signature kit (Aim/Sharpshooter/Sabotage) is all mark-tracking or skill-vs-derived-DC mechanics this engine doesn't have.
- **Vorza Moonshot (Solarian)**: her entire melee weapon is a *stance* (Solar Manifestations, only exists while attuned) — no static fallback item exists at all, unlike a grenade or sidearm. Achievable residue is one ranged Strike and a Demoralize reskin.
- **Old-Growth Wildfire (Soldier)**: her one real weapon (Machine Gun) is built entirely around Auto-Fire/Suppressing Fire — multi-target cone/line attacks, the exact category already out of scope. No melee fallback exists on her sheet at all, despite a feat that implies one.
- **"Nitpick" Bennit (Witchwarper)**: closest runner-up. Her whole class chassis is a stance (Quantum Field), but two of her spells are genuinely achievable — Gouging Claw (attack-roll, zero new code) and Thunderstrike (a save-based spell, needing one small new sibling of `deriveSaveAttacks` sourcing its DC from the already-implemented `deriveSpellDC` instead of Class DC). Flagged for later, not built this pass.
- **Tapkey (Envoy)** — the pick: `toIngredients()` runs completely clean, and her whole practical kit derives through *existing* functions with zero changes anywhere: `deriveStrikes` (Nano-edge Rapier, Boom Pistol — her roster's first **martial**-category weapon, and first "deadly"/"disarm" traits), `deriveSaveAttacks` (Incendiary Grenade, matching Lunar-17's own grenade exactly), `deriveSkillModifier` (Intimidation +4, untrained but purely Charisma-driven — the roster's highest, and a genuinely different *source* from Security Goon's trained +6 or Lunar-17's flat +0).

On the NPC side:
- **Tough**: only one of three melee items (Gun Bash) is a real Strike — the other two are area attacks (`system.action: "area-fire"`/`"auto-fire"`, confirmed via the raw data's own field, not inferred from the name) — thinner than Security Goon already is.
- **Erabryth**: looks like a rich caster (6 spells) but none carries the "attack" trait with a basic-save shape this engine implements — headline content would be entirely inert.
- **Athraxer**: a clean, zero-new-code alternative (Bite/Claw/Acid Spit, first pure-natural-weapon NPC, new acid damage type) — the fallback if zero new code was the hard requirement.
- **Xenowarden Greenhorn (`alien-core-bestiary`)** — the pick: Arc Pistol and Nano-edge Rapier both derive through the existing `toCombatant` unmodified, **and** she's this project's first NPC with a genuinely usable attack-roll spell (Gouging Claw) — worth the one small addition below rather than settling for the zero-new-code option.

`system.action` (`"strike"` vs. `"area-fire"`/`"auto-fire"`) turned out to be a real, citable, structural signal for "is this melee item safely a plain Strike" — worth remembering for the next NPC pick, not just this one.

### The one genuinely new piece: NPC attack-roll spells

`tools/pack-extractor/extract-npc.mjs` gained `deriveSpellAttacks(npc, spellNames)` — the NPC-side counterpart to the PC side's `deriveSpells`, but simpler: an NPC's `spellcastingEntry` already stores a FINAL, precomputed `system.spelldc.{value,dc}` pair (Xenowarden Greenhorn's is `{"dc":14,"value":6}`, confirmed directly against her raw data), so there's no ability-modifier/proficiency derivation at all — the same "NPCs store final numbers, PCs derive them" split this file's header already documented for Strikes/AC/saves, now extended to spells. Output shape matches the PC side's derived spell exactly, so `personnel-engine/engine.mjs`'s `spellAttack` action — which only ever reads `combatant.spells` generically — needed **zero changes** to accept an NPC-sourced spell.

Two real, small bugs caught building this, neither by inspection — both by running it against Xenowarden Greenhorn's actual raw data and checking what came out:

1. **The "touch"-range bug.** Gouging Claw's raw range is the string `"touch"`, not a number. A naive `parseInt("touch", 10)` silently produces `NaN` — and `legality.mjs`'s `checkSpellRange` computes `maxRange = spell.range ?? FEET_PER_SQUARE`. Since `??` only falls back on `null`/`undefined`, **not** `NaN`, a `NaN` range would survive straight into `dist > maxRange`, which is *always false* for a NaN comparison — meaning the spell would have been legally castable from anywhere on the entire map, the exact opposite of "touch." Fixed by mapping any non-numeric range string to `null`, matching `checkSpellRange`'s own documented convention for what an absent range field means. Pinned as a named regression test asserting the range is neither `NaN` nor truthy-but-wrong, just cleanly `null`.
2. **The persistent-damage drop.** Gouging Claw's real damage is two entries — 2d6 untyped instant, plus 2 persistent bleed. Only the first is carried (`Object.values(damageMap)[0]`, and JS orders integer-like object keys first regardless of insertion order, so this reliably picks the instant entry, never the persistent one). This is the same scope limit already documented for the PC side's `firstSpellDamage`, for the same reason: personnel-engine has no persistent-damage-over-time mechanism to apply the second entry to. Not a silent loss — flagged in `deriveSpellAttacks`'s own header and in `xenowarden-greenhorn.json`'s `notes` field, same as every other honest gap in this project.

A third small, real thing found while extracting her Strikes: her raw data has **two distinct `melee` items both named "Knife"** — one finesse/melee (`versatile-s`), one thrown (`thrown-10`) — the same physical weapon's two use-modes represented as two separate NPC attack rows. `toCombatant`'s name-based lookup can only ever address the first match, so only Arc Pistol + Nano-edge Rapier were wired (already-distinct ranged/melee coverage); the redundant Knife wasn't worth resolving the name collision for. Not fixed structurally in `toCombatant` — nothing forces the ambiguity to matter unless a future caller actually needs both variants of one repeated name, which nothing does yet.

### The real 2v2: Lunar-17 + Tapkey vs. Security Goon + Xenowarden Greenhorn

Run across all three setups, multiple seeds each (15 real battles total): **zero illegal actions anywhere.** 14 of 15 resolved with a clean party victory within a handful of rounds; the 15th timed out. At the time this shipped, that looked like one contained, acceptable rough edge and a one-sided balance note. **It was not — see §22.** Both the "party wins basically every time" read and the single timeout were surface symptoms of two real bugs (an illegally-modeled area weapon, and a movement bug that had nothing to do with AI "design philosophy"), caught by direct user review of the actual runs rather than by this project's own test suite, which never checked for either.

### Files

New: `tools/battle-simulator/data/personnel-test-complex.mjs`, `tools/battle-simulator/scenarios/personnel-complex-battle.mjs`, `tools/battle-simulator/data/raw-validation-fixtures/tapkey.json`, `tools/battle-simulator/data/raw-validation-fixtures/xenowarden-greenhorn.json`, plus their test files. Changed: `tools/pack-extractor/extract-npc.mjs` (`deriveSpellAttacks`), `tools/character-builder/generate-raw-validation-fixtures.mjs` (`buildTapkey`/`buildXenowardenGreenhorn`), `tools/battle-simulator/run-personnel-scenario.mjs` (three new `complex-2v2-*` scenarios feeding the artifact viewer), `test/character-builder/extract-npc.test.mjs` and `raw-validation-fixtures.test.mjs` (new coverage).

## 22. Direct critical review of §21 — three real bugs, found and fixed, not one silently glossed over

§21 shipped with a passing test suite, "zero illegal actions across 15 seeds," and a soft framing of its one timeout as an interesting-but-acceptable AI-design finding. Ingram looked at the actual runs and pushed back hard and specifically: *"Still throwing infinite grenades I see. You need to call it what it is, not 'saveAttack' - but you also need to look up the rules of grenades to get them correct... I also noticed a bad guy moved three times when they could have moved and engaged a player. Another player used a spell to attack a baddie that they had no line of sight to. Then a bad guy oscillates by moving up and down... Are you embarrassed yet?"* — followed by, mid-investigation: *"Both complex 2v2 simulations turn into units moving three times back and forth over and over again... Any simulation where all that happens is 99% movement is clearly a broken simulation."*

Every claim was checked against real data or real code before anything was changed — none of it was taken on faith, and none of it was dismissed either. Three real, independent bugs came out of it.

### Bug 1 — grenades were never single-target attacks

Pulled the Incendiary Grenade's own full raw description directly (not just enough of it to confirm a DC formula, which is as far as §19/§20's own extraction had checked):

> **Activate** [1] **Area Fire** ... deal 1d8 fire damage with a `@Check[reflex|against:class|basic]` save (`@Template[burst|distance:5]`).

A 5-foot-burst AREA effect — structurally identical to Frag Grenade and Electromag Grenade, both already correctly excluded from other pregens' kits for exactly this reason (§21's own pregen survey). `saveAttack` only ever models a single target rolling one save; wiring an area weapon through it silently drops its real friendly-fire risk, which is almost certainly *why* the AI used it so liberally — a rules-correct grenade is a real tactical cost (you might catch your own side in the blast), a mismodeled single-target one is free damage with no downside. Fixed by removing the grenade from both Lunar-17's and Tapkey's usable kits entirely (`generate-raw-validation-fixtures.mjs`), matching the same "out of scope until this engine has a real area-effect mechanism" treatment already applied everywhere else. `deriveSaveAttacks` itself is untouched and still real, tested, general machinery — it was the *application*, not the function, that was wrong. `test/battle-simulator/personnel-lunar17-vs-security-goon.test.mjs`'s old "at most one grenade throw" regression test is rewritten to assert *zero* saveAttacks now, with the full history in its own comment so this doesn't look like an unexplained downgrade later.

### Bug 2 — a dead combatant permanently blocked movement, including through the one doorway that mattered

This turned out to be the actual mechanism behind BOTH "moved three times instead of engaging" and "oscillates by moving up and down" — the same bug, not two.

Root cause, found by instrumenting a real run directly (temporary `console.error` hooks in `decide.mjs`, removed once the mechanism was confirmed — never committed): `state.positions` keeps every combatant's position forever, alive or dead, on purpose (the artifact viewer needs a defeated combatant's final square to render its body). But every occupancy computation for movement — both `decide.mjs`'s own route-finding (`stepToward`/`stepAway`/`pathfindingDestinationToward`/`pathfindingDestinationAway`) AND the real engine-side legality gate (`engine.mjs`'s calls into `checkMoveLegality`/`checkStepLegality`) — read straight off `state.positions` with **no HP filter at all**. In the `ACROSS_THE_COMPLEX` seed 3 case examined directly: Security Goon dies standing at `(20,11)`, the single one-square doorway connecting Xenowarden Greenhorn's building to the rest of the map. From that point on, every one of Xenowarden Greenhorn's own pathfinding calls still saw `security-goon@(20,11)(hp0)` as occupied — she was structurally unable to ever leave her own building again. "Moved three times instead of engaging" and "oscillates near a doorway" were both just what that looks like from outside: her own destination-scoring correctly found every real route blocked and settled on two equally-useless squares near a door that could never actually open.

Fixed with a `livingPositions`/`otherLivingPositions` filter (HP > 0) at every one of those call sites — nothing in Player Core treats a fallen creature's square as an obstacle, so this isn't a judgment call, it's a straightforward correction. **Both** the engine-side legality gate and the AI's own candidate generation needed the fix; fixing only one would have left the other still computing a dead end. Verified two ways: a minimal, deterministic unit test (a 1-row corridor, a combatant that starts already dead in the only crossable square, `test/battle-simulator/personnel-engine.test.mjs`) and the real regression case itself — `ACROSS_THE_COMPLEX` seed 3 went from a 30-round timeout with zero net progress to a 4-round party-victory, with Xenowarden Greenhorn landing three real Arc Pistol strikes the instant the doorway opened back up.

**The "no line of sight" spell-attack claim was investigated just as rigorously and did NOT reproduce.** Built an independent cross-checker (`lineOfEffect`, recomputed from scratch against positions reconstructed purely by replaying each log's own move actions in order, never trusting the engine's own `legal` flag) and ran it against 600 real logged attacks across 24 battles: zero mismatches. The real engine-side LOS gate is correct everywhere sampled. The most likely explanation is that this was the SAME erratic-movement bug above making a frame of the (pre-fix) viewer look wrong to the eye — a combatant whose own position had just been oscillating nonsensically attacking the instant it briefly had a real, legal shot could easily read as "that shouldn't have worked" without being a real LOS bug. Flagged honestly as unreproduced rather than either dismissed or silently "fixed" — if it recurs in the corrected build, it's a new, different report, not this one.

### Bug 3 — a real, quantified performance cliff, found while chasing the first two

Investigating Bug 2 required running many real battles back to back, and they were taking far longer than they should — one 2-round fight timed out against a 15-second wall-clock cap. Profiled directly rather than guessed: `moveBlockedBetween` (in `engine/terrain.mjs`, shared verbatim by both scales) linear-scans the *entire* wall list for every candidate movement edge. §21's own bigger map has 256 wall segments, against the original facility's ~20 — and `reachableCells`' Dijkstra flood calls `moveBlockedBetween` once per (node, direction) pair, so one large flood was doing roughly 1,700 nodes × 8 directions × 256 walls ≈ 3.5 million comparisons. Measured directly: **~258ms for a single flood**, called repeatedly enough per turn to make a real 2-round fight take **~14 seconds**.

Fixed with a `WeakMap`-cached edge index (`engine/terrain.mjs`'s new `moveBlockingIndex`): a `Set` of normalized blocked-edge keys, built once per distinct `walls` array reference and reused for the array's whole lifetime — safe because `state.walls` is already a stable, never-mutated, by-reference-shared array for the life of a battle (the same invariant `evaluate/state-value.mjs`'s own `distanceCache` already relies on). `walls.length` no longer affects per-edge cost at all once the index is warm. Measured improvement: a single large flood, 258ms → 31ms average (8x); a real full battle, ~7 seconds/round → a few hundred milliseconds/round. This is a Frame-scale file too (`personnel-engine/terrain.mjs` is a pure re-export of it) — the fix benefits both scales, and the full test suite (Frame-scale included) was re-run afterward specifically because of that.

### The numbers, before and after all three fixes

30 real 2v2 battles (10 seeds × 3 setups), measured both ways rather than asserted:

| | Before | After |
|---|---|---|
| Overall actions that were `move` | 46% | 20% |
| Worst single case (`ACROSS_THE_COMPLEX` seed 3) | 97% move, timeout at round 30 | 39% move, resolves in 6 rounds |
| Timeouts across 30 battles | 1 | 0 |
| `saveAttack` actions of any kind | present (grenades) | 0 (correctly excluded) |

Outcomes are also genuinely mixed now (several real party-defeats appear across all three setups) rather than the near-uniform party-victory §21 originally reported — direct evidence the grenade fix wasn't cosmetic: the party really had been out-damaging its real SF2E kit.

### What this changes about how this project ships personnel-engine work going forward

None of these three bugs were caught by `node --test` — every existing test asserted "zero illegal actions" and "a legal outcome," neither of which this class of bug violates. All three were caught by a human actually looking at what the simulation did and finding it implausible. That's the gap: legality and structural-shape tests prove the engine never lies, not that it plays *well*. Nothing new is proposed here to close that gap systematically — worth a real, deliberate design pass of its own rather than a rushed addition at the end of a bug-fix section, and left as an open item rather than invented on the spot.

## 23. 3v3, a real cover mechanic, a redesigned map, and two new tactical-awareness terms

Direct follow-up once §22's fixes landed: *"It's looking better, not fantastic but at the moment since it's 2v2 there isn't a lot in the way of choices for either side to make, time to make it 3v3 and add a new pregen and a new type of NPC in... your buildings are very dull. I've given you a sketch for what you could do instead. Red = cover, you should add walls with both windows (see through, fire through but can't move through) and doors... you should include value in the idea of staying behind cover in line with the actual value of it in the SF2E system. A simple 'shot' and 'grenade' and 'spell' graphic would help to make it clear what happens during turns too. When player characters are low on health you could give them a greater reason to get out of line of sight of baddies and the same logic could apply to enemies and especially enemies which feel like they are outnumbered because they can see more enemies than they can see friends."* Five real deliverables, taken in the order the sketch and the ask actually implied: a third PC/NPC, a redesigned map with real windows and cover, a real SF2E cover mechanic wired into the engine, visual differentiation in the artifact viewer, and two new evaluator terms.

### The third PC and NPC: "Nitpick" Bennit and Erabryth — both flagged as gaps in §21, both closed here

§21's own pregen/NPC survey had already identified the two best "next" picks and exactly what each one needed:

- **"Nitpick" Bennit (Witchwarper)** — her whole class chassis is a stance with no static fallback, but two of her spells were flagged as achievable: Gouging Claw (zero new code, already covered by the existing NPC-side `deriveSpellAttacks`) and **Thunderstrike**, a save-based *spell* — this project's first. `build-combat-pregen.mjs` gained `deriveSaveSpells(ingredients, spellNames, abilityModifiers)`, deliberately NOT a copy-paste of the existing weapon-side `deriveSaveAttacks`: a spell's DC comes from `deriveSpellDC` through its own spellcastingEntry (not a flat Class DC), its damage list needed reading in full (every entry, not just the first — a real, if minor, difference from the weapon path), and its `usesRemaining` comes from the spell's own `system.slots.slot1.max`, not treated as unlimited. `SAVE_STATISTIC_TO_KEY` (`{reflex:"ref", fortitude:"fort", will:"will"}`) was added here too, and this is where a real, previously-shipped, previously-inert bug surfaced (see below).
- **Erabryth (`alien-core-bestiary`)** — flagged in §21 as "looks like a rich caster but none of her 6 spells carries an attack-roll/basic-save shape this engine implements — headline content would be entirely inert." Her real gap wasn't an attack spell at all: **Forced Reflection**, a Will save whose effect is a per-degree *table of conditions* (Frightened and/or Stunned), not damage. Neither `saveAttack` (always deals damage via `basicSaveDamage`) nor Demoralize (a flat two-tier Frightened table) could represent this — a genuinely new action shape, `conditionSave`, built for it (below). `extract-npc.mjs` gained `deriveConditionSave(npc, {name, saveType, range, outcomes})`: DC comes straight off the NPC's own `spellcastingEntry.system.spelldc.dc` (cross-checked directly against the `@Check[will|dc:17]` embedded in her own raw description text — two independent sources agreeing on 17), everything else — the outcomes table itself — is caller-supplied and hand-transcribed from her real text, matching this project's standing "hand-identify, cite verbatim" discipline for anything that can't be read off a structured field. Her three Strikes (Ribbon — this roster's first reach weapon, reach-10 — Fist, Light Ray) derive through the existing, unmodified `toCombatant` lookup.

Both fixtures generated via the same `generate-raw-validation-fixtures.mjs` pipeline as every other real combatant in this project — `bennit.json` (AC 17, HP 15, Intimidation +1), `erabryth.json` (AC 15, HP 20, Intimidation +4) — and both cross-checked against a fresh live re-derivation in `raw-validation-fixtures.test.mjs`, same discipline as Lunar-17/Tapkey/Security Goon/Xenowarden Greenhorn before them.

### `conditionSave`: a new action shape, reusing everything reusable

Modeled as a basic-save resolution (same shape as `saveAttack` — the target rolls, `resolveSave` produces a real degree) but with an `outcomes: {criticalSuccess, success, failure, criticalFailure}` table on the ability itself instead of a damage formula, each entry an optional `{frightened, stunnedRounds}` pair. Applied with the same `Math.max(current, applied)` "don't stack, keep the worse value" rule Demoralize's own Frightened application already used, extended here to Stunned too. Legality (`checkConditionSaveLegal`) mirrors `checkSaveAttackLegal` but keys its per-attacker immunity gate on `${conditionSave.name}|${target.id}` rather than just `target.id` — a small, deliberate improvement over Demoralize's simpler single-ability gate, since a combatant could plausibly have more than one `conditionSave` whose "already tried, don't retry" status needs tracking independently.

`stunnedRounds` needed a real evaluator price that didn't exist: personnel-engine's `evaluateState` had already dropped Frame-scale's `actionDenial` term on the stated assumption that no action-cap breakpoints existed to reward (an ordinary PC/NPC has exactly one threshold, alive vs. dead, already fully priced elsewhere) — Erabryth's Forced Reflection reintroduces exactly the scenario that assumption didn't anticipate. Added `stunDenial: 3.0` (flagged, like `closing` before it, as a reasoned starting point rather than a measured one), applied symmetrically for allies/enemies, with real monotonicity/scaling tests (a stunned enemy scores strictly better for the party than the same enemy un-stunned; 2 rounds is worth exactly twice 1 round).

**One real, previously-shipped, previously-inert bug found while testing this, not invented by it.** `combatant.saves` objects use the short key convention (`{fort, ref, will}`) everywhere in this project — every fixture, `sf2e-common.schema.json` itself — but `saveType` values had been authored as the full word `"reflex"` back in §20's original grenade work, and copied forward from there. `target.saves["reflex"]` silently resolves to `undefined`; `undefined + coverBonus` is `NaN`; and `degreeOfSuccess`'s three `>=`/`>` comparisons against a `NaN` total are *all* false in JS (`NaN` is never greater than, greater-or-equal to, or less than anything) — so the result always fell through to the final `else` branch, `criticalFailure`, regardless of the real roll (a natural 20 excepted, since that shifts `criticalFailure` up one band to plain `failure`). This had been sitting inert in §20's grenade `saveAttack` code since before §21 (masked because those grenades were removed for being illegally-modeled area effects before anyone noticed the saves inside them were *also* broken) and would have made every `saveAttack`/`conditionSave` in this new work resolve as worst-case-always. Found writing this session's own first cover-integration test, fixed with a `SAVE_STATISTIC_TO_KEY` mapping and a systematic `"reflex"` → `"ref"` correction across source and tests, and pinned with a dedicated regression (`Number.isFinite(action.roll.saveBonus)` and a real spread of degrees across 30 seeds — not the same result every time).

### The map: redesigned per Ingram's own sketch — windows, cover, genuinely unequal rooms

The original §21 map (a uniform 2×3 grid of identically-sized 8×8 rooms in both buildings) was mechanically fine and visually/tactically repetitive — Ingram's own words, "your buildings are very dull" — with a hand-drawn sketch attached showing an irregular building with red-hatched cover objects (some freestanding inside rooms, one set into a wall) and tick marks along walls for windows, plus a second, taller/narrower building with its own internal wall and cover.

`tools/battle-simulator/data/personnel-test-complex.mjs` was rewritten (same 38×24 footprint, same two-buildings-plus-courtyard shape) with:
- **Genuinely unequal rooms** — Building A is four asymmetric rooms in a 2×2 grid (a big NW hall, a smaller NE room, a tall SW room, and the SE room the external door opens directly into, so anyone entering from the courtyard has real cover immediately available rather than an empty threshold); Building B is just two rooms split by one dividing wall, matching the sketch's own taller/narrower second building.
- **Real windows** — `hWall`/`vWall` gained an optional `edge` parameter (defaulting to the existing solid-wall shape) so a run can be authored with `WINDOW_EDGE = {move: 20, sight: 0}` instead — blocks movement, not sight, using Foundry's own already-independent move/sight axes, which needed **zero new engine mechanism**, just actually authoring a wall segment with this combination for the first time anywhere in this project.
- **Real cover objects** — a new `coverBlock(c0, r0, w, h)` helper generates a small rectangular obstacle's full unit-edge perimeter with `{move: 20, sight: 0, cover: true}` — blocks movement like a solid wall, does **not** block sight (you can still see and target someone behind a crate), and carries a new, deliberate, documented extension to the Foundry Wall schema (`cover: true`) that the engine mechanic below reads.

**One real bug found authoring this, the same shape as a bug §19 already found once**: a window run authored *separately* from a perimeter wall run that happened to cover the identical coordinates was silently shadowed — `walls.some()` finds either segment, and the solid duplicate always won, so the window never actually worked (confirmed by dumping which wall segment a test sightline actually hit: the solid `{move:20,sight:20}` duplicate, not the intended window). Fixed the same way doors have always been handled: the perimeter call explicitly excludes the window's own columns/rows via the existing `doorCols`/`doorRows` parameter.

### The cover mechanic itself (Player Core pg. 416)

Fetched directly from the real rule (`https://2e.aonsrd.com/rules/420-cover`, mirrored honestly at `reference/srd/player-core/420-cover.json` with a retrieval note — two independent fetch attempts both came back lightly paraphrased rather than byte-verbatim, a real tool limitation, disclosed rather than presented as exact): **Standard cover grants a +2 circumstance bonus to AC, Reflex saves against area effects, and Stealth checks**, determined by whether a line drawn between the two creatures' space centers passes through blocking terrain. Greater cover (+4, via a real Take Cover action) and lesser cover (+1, from an intervening creature) both require mechanics this engine doesn't model yet and are explicitly out of scope — only Standard cover is implemented.

`engine/terrain.mjs` gained `STANDARD_COVER_AC_BONUS = 2` and `hasCover(a, b, walls)` (true if any `cover: true` wall segment's own edge geometrically intersects the line between `a` and `b`). Wired into three places, all reusing the same `hasCover` check rather than three separate implementations: `engine.mjs`'s real strike/spellAttack resolution (a copy of the target's effective stats gets `ac + coverBonus`, never mutating the real combatant), the `saveAttack` resolution path (applied to the save bonus **only** when `saveType === "ref"` — cover's real bonus is explicitly to Reflex saves against area effects, per the rule text above, and every `saveAttack`/`conditionSave` built so far already happens to be exactly that shape or a Will save with no area trait, so this stays a correct, not a coincidentally-correct, restriction), and `evaluate/state-value.mjs`'s `bestExpectedDamage` — meaning a covered position is automatically priced as safer by the AI's own planning with **no separate evaluator weight**, the same "elegant, not bolted on" shape cover bonus, coverage, and Frightened's evaluator integration already shared.

### The artifact viewer: cover, windows, and every action type now visually distinct

The existing `renderWalls` drew every wall segment as one undifferentiated dark line — meaning even after the mechanics above were real, a viewer looking at the map couldn't actually *see* a window or a cover object as anything different from a solid wall, which defeats the entire point of Ingram's sketch. `artifact/geometry.mjs` gained `wallLineClass(wall)` (cover checked before the shared move/sight shape, since a cover object and a window are otherwise mechanically identical on those two axes and cover must not silently render as an ordinary window) — solid walls stay the existing thick dark line, windows render thin and dashed in the accent color, and cover renders in the sketch's own red (`--danger`, matching Ingram's literal "Red = cover" legend). Verified against a real, live-rendered run in the browser, not just unit-tested: 197 solid segments, 6 window segments, 38 cover segments — both counts independently matching the map data's own generator math (`2×(w+h)` per `coverBlock` call, summed) — with computed CSS confirming three genuinely distinct colors, not just three class names.

Separately, `renderDecisionOverlay`'s action-type handling had a real gap once `saveAttack` and `conditionSave` became real, common actions: the function only ever branched on `move`/`step`, `strike` **or** `spellAttack` (drawn identically, differentiated only by hit/crit/miss), and `healAbility` — anything else, including the two new action types, silently drew **nothing** on the map. Fixed with `attackRollClass`/`saveRollClass`/`demoralizeClass` (new, tested `geometry.mjs` functions, not inline-only logic): `spellAttack` now shares a distinct arcane-violet color family with `saveAttack`/`conditionSave` — Ingram's "shot" vs. "spell" ask — while plain `strike` keeps its existing green/amber/gray. The two save-based types needed genuinely **inverted** polarity from an attack roll: the attacker rolls on a Strike (their `criticalSuccess` is their best outcome), but the *target* rolls on a save (their `criticalFailure` — the worst thing for *them* — is the best outcome for the attacker's effect, matching the real basic-save damage table). Getting this backwards would have rendered a critically-failed save as a miss; a dedicated test asserts `attackRollClass` and `saveRollClass` disagree at both ends of the scale for the identical degree string. Demoralize (pre-existing, also previously undrawn) got its own simple two-tier amber treatment rather than borrowing either family, since it's neither a shot nor a spell — a plain Intimidation check with only 2 real outcome tiers. Verified against real, live game data (not synthetic fixtures): a `saveAttack` with a real `"success"` degree rendered `spell-miss` as designed, a `conditionSave` with a real `"criticalFailure"` degree rendered `spell-crit` with the new arcane arrow marker — both pulled directly from an actual embedded 3v3 run, not asserted in the abstract.

**No "grenade" graphic exists, and this is a deliberate gap, not an oversight**: §22 removed every grenade from every fixture's usable kit for being illegally-modeled single-target area effects, and no real area-effect mechanism has been built since — there is currently no real action in this engine a grenade icon could ever attach to. If real AoE support is ever built, a grenade decision-line class belongs there, not invented now with nothing to represent.

### `lowHpCaution` and `outnumberedCaution`: two new evaluator terms, not a new candidate-generation mechanism

Ingram's ask was specific: *"When player characters are low on health you could give them a greater reason to get out of line of sight of baddies... and the same logic could apply to enemies and especially enemies which feel like they are outnumbered because they can see more enemies than they can see friends."* Checked before writing anything: `decide.mjs` already offers a real "disengage" move candidate every single turn, for every enemy (`bestDestinationAway`, real pathfinding-maximized distance from the threat) — it simply never scored high enough to win against attacking, regardless of how hurt or outnumbered the combatant actually was. Nothing new needed generating; the gap was purely in scoring.

Both are **multipliers on the existing `threatExposure` term**, applied once per ally inside `evaluateState`'s existing threat-summing loop, not new additive terms of their own:
- `lowHpCaution` (default 2.0): `1 + lowHpCaution * (1 - currentHP/maxHP)` — exactly 1× (no change) at full health, up to 3× at the edge of death, strictly linear in HP fraction (proven by a direct ratio test: the cost at 15-of-20 HP is exactly half the cost at 10-of-20 HP) — deliberately continuous, no threshold, the same lesson §22's own "moving three times is an alarm" bug already taught this project to respect.
- `outnumberedCaution` (default 1.0): computed from what THIS combatant can currently see from THIS position — `visibleEnemies / (visibleAllies + 1)` via the same `lineOfEffect` check already used everywhere else, not the global roster count, matching `belief.mjs`'s own "only what can actually be perceived" epistemic framing. Neutral (1×) at parity or better; a fair 1v1 costs exactly nothing extra. Symmetric by construction — this loop runs once per side regardless of which side is being evaluated, so "the same logic could apply to enemies" required no separate branch at all.

Both weights are flagged, like `closing`/`stunDenial` before them, as reasoned starting points awaiting a real measurement pass, not tuned-and-verified numbers.

**Proven at three separate levels, not just one:**
1. **Formula-level** (`personnel-state-value.test.mjs`, 8 new tests): monotonicity holds with both terms active and stacked on a badly-hurt, outnumbered combatant; the linear-scaling claim checked by exact ratio, not just direction; a fair 1v1 or full-HP ally costs exactly zero extra.
2. **Decision-level, the actual point of the exercise** (`personnel-decide.test.mjs`, 4 new tests): calling the *real* `decide()` — full candidate generation plus evaluation — on the identical position and identical enemy, changing only `currentHP` (20 → strike; 2 → disengage) or only the enemy count (1 → strike; 2 → disengage). Formula correctness alone doesn't guarantee the AI's actual chosen action changes; this is what proves it does.
3. **Statistical, across real battles**: 20 seeds of the real 3v3 roster, `SAME_ROOM` setup, baseline (caution terms zeroed) vs. the new defaults — zero illegal actions and zero timeouts in both, move-fraction a modest 29.6% → 32.6% (nowhere near §22's "99% movement, clearly broken" territory), average rounds 7.1 → 8.6, and **party-victory rate 50% → 75%**. The win-rate jump is a real, plausible, kit-driven asymmetry worth naming rather than hiding: this specific roster's party (Lunar-17, Tapkey, Bennit) skews more ranged than the opposition (Security Goon, Xenowarden Greenhorn, Erabryth, whose signature weapons lean melee/reach) — smarter positioning is a much better trade for a side that can keep attacking *while* repositioning than for one that has to close distance again after every retreat. Reported honestly, not retuned — matching this project's standing practice of flagging balance numbers rather than chasing them by feel.

**One real finding from reading an actual transcript, investigated fully rather than either dismissed or reported as worse than it is**: in one real battle (`complex-3v3-same-room` seed 2), Bennit spends all three actions of round 6 shuffling between two adjacent squares, `(14,20)` and `(15,20)` — on first read, exactly the surface pattern §22's bug report was originally about. Investigated the same way that one was: instrumented the real engine (not a hand-reconstructed approximation, which initially gave a misleading answer by using stale enemy positions from before their own round-6 turns) to print every legal candidate at each action. The real cause: from her position at that point in the battle, **both remaining enemies are fully out of line of effect**, and `(14,20)`/`(15,20)` are the *only two* reachable, mutually-adjacent squares available to her — not a scoring cycle, not competing options, literally one legal candidate at every single action, alternating because the two squares' absolute values genuinely differ (confirmed directly: `evaluateState` at `(15,20)` is a real, consistent 7.5 points better than `(14,20)`, not a coin flip). This is a consequence of a pre-existing, explicitly documented design decision (§15k: `decide()` never holds when *any* legal action exists, "the only honest reason to hold is that nothing at all is offered") meeting a combatant boxed into a dead-end pocket with nothing to shoot at.

**Measured before concluding anything, not assumed from one instance**: counted every turn across 60 real 3v3 battles (20 seeds × 3 setups) where a combatant spent an entire turn on nothing but movement and revisited a square from earlier in that same turn — the general shape of this pattern, not just Bennit's specific case. Baseline (caution terms zeroed): **277 of 2171 turns, 12.76%**. With `lowHpCaution`/`outnumberedCaution` active: **280 of 2411 turns, 11.61%** — statistically flat, if anything slightly lower. This is the honest correction to what looked, from one transcript, like something the new terms had caused: they didn't. Getting boxed into a small pocket with no line of effect to anyone is a pre-existing characteristic of this engine (tight map geometry combined with §15k's own always-act policy), already present at essentially the same rate before this section's work as after it. Real, worth a future look at whether `decide()` should ever genuinely hold instead of taking a guaranteed-pointless action — but not a regression this section introduced, and not something to unilaterally redesign as a side effect of a change that was asked for a different reason.

### What wasn't attempted this pass

Ingram's own closing line was "lots to think about," not a single scoped ask, and not everything in that message was pursued to the same depth:
- **A real "hold" option for `decide()`** — the one genuine follow-up the pocket-shuffle measurement surfaced. §15k's "always act if anything is legal" policy is a deliberate, pre-existing decision, not something this section's own ask touched — flagged above as a real open question, not resolved unilaterally.
- **Greater cover (+4) and lesser cover (+1)** — Player Core pg. 416 defines both; only Standard cover (+2) is implemented, since Greater requires a real Take Cover action this engine doesn't model and Lesser requires treating an intervening creature (not just terrain) as a cover source. Noted as scope, not forgotten.
- **A grenade decision-line graphic** — has nothing to attach to, see above; would need real area-effect support first.

### Files

New: `tools/battle-simulator/data/raw-validation-fixtures/bennit.json`, `tools/battle-simulator/data/raw-validation-fixtures/erabryth.json`, `reference/srd/player-core/420-cover.json`. Changed: `tools/battle-simulator/data/personnel-test-complex.mjs` (rewritten map geometry — windows, cover, asymmetric rooms), `tools/battle-simulator/engine/terrain.mjs` (`hasCover`, `STANDARD_COVER_AC_BONUS`), `tools/battle-simulator/personnel-engine/engine.mjs` (cover applied at strike/spellAttack/saveAttack resolution; the new `conditionSave` action), `tools/battle-simulator/personnel-engine/legality.mjs` (`checkConditionSaveLegal`), `tools/battle-simulator/personnel-engine/decide.mjs` (`conditionSave` candidates), `tools/battle-simulator/personnel-engine/evaluate/state-value.mjs` (cover-aware `bestExpectedDamage`, `stunDenial`, `lowHpCaution`, `outnumberedCaution`), `tools/pack-extractor/extract-npc.mjs` (`deriveConditionSave`), `tools/character-builder/build-combat-pregen.mjs` (`deriveSaveSpells`, `SAVE_STATISTIC_TO_KEY`), `tools/character-builder/generate-raw-validation-fixtures.mjs` (`buildBennit`/`buildErabryth`), `tools/battle-simulator/run-personnel-scenario.mjs` (the `complex-3v3-*` scenarios, superseding §21's `complex-2v2-*`), `tools/battle-simulator/artifact/geometry.mjs` (`wallLineClass`, `attackRollClass`, `saveRollClass`, `demoralizeClass`), `tools/battle-simulator/artifact/template.html` (wall/window/cover rendering, the spell/demoralize decision-line branches, the `--arcane` color token), plus test coverage for every one of the above.

## 24. Second direct critical review — a real Stunned bug, movement blocked through allies, a cover object that could trap a spawn, and a map with no exterior at all

Immediately after §23 shipped, Ingram reviewed the actual battle and found four more real, independent problems — three mechanical, one a map/UI issue — none of them speculative:

> *"Stunned is currently knocking out three actions during this battle... How? Why? Where did that come from? It makes no sense, stunned comes with a value and would need to be stunned 3 to remove all three actions."* — followed by the real Player Core text, quoted in full. *"You still have characters moving three times in a row and calling that a move, that's silly. Characters can move through friendly character spaces per the rules... Nitpick's first turn is three 5ft moves in a row... They start on top of a table... Are they stuck? Moving across cover should be possible, spawning inside shouldn't happen. Spawn the two sides at opposite corners of the map... Add more external doors to both buildings, add more windows. Add some large garage like openings."* Plus a separate, small UI report: the map and tokens render squashed.

Every claim was checked against real code or real rules text before anything changed, same discipline as §22.

### Bug 1 — Stunned was never a value, it was "skip N whole turns"

Pulled Erabryth's real Forced Reflection text directly from the raw pack data (not re-derived from memory): failure inflicts **"Stunned 1** and frightened 1," critical failure **"Stunned 2** and frightened 2" — real Player Core numbers, a VALUE, exactly as Ingram's quoted rules text describes: *"Stunned usually includes a value, which indicates how many total actions you lose, possibly over multiple turns... Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost."*

The engine's actual round-loop code (`personnel-engine/engine.mjs`) did something completely different: `if (combatant.stunnedRounds > 0) { combatant.stunnedRounds -= 1; /* forfeit the WHOLE turn */ }`. Any nonzero value forfeited all 3 actions, and the counter only ever decremented by 1 per turn regardless of the real value — so a real "Stunned 2" (which should cost exactly 2 of 3 actions, leaving 1 to use immediately, then clearing to 0) instead cost **6 actions across two fully-forfeited turns**, triple the real cost. "Stunned 1" (Erabryth's own most common outcome) lost all 3 instead of exactly 1 — precisely what Ingram saw and flagged.

Fixed at the root: `runTurn` gained an `actionsAvailableOverride` parameter (a partially-stunned turn still plays out as a real turn, just starting with fewer actions — `resolveEffectiveStats` itself stays a pure, HP/frightened-only function, safe to keep calling from the AI's own sandboxed lookahead), and the round loop now computes `lost = Math.min(fullAvailable, stunnedValue)`, deducts it from the real per-turn budget, and only takes the old "forfeit everything, log nothing" path when the value is big enough to actually consume the whole turn — Player Core's own worked example (`stunned 4` → lose all 3 actions turn 1, carry 1 over, lose it turn 2, keep the remaining 2) is now a literal, passing test, word for word. Renamed `stunnedRounds` → `stunnedValue` everywhere in personnel-engine (source, tests, the Erabryth fixture, `stunDenial`'s own per-unit price, rescaled from 3.0/round to 1.0/action to keep the same rough real-world magnitude) — **deliberately NOT touched at Frame scale**, where `stunnedRounds` is a different, older, pre-existing pattern used only by hardcoded narrative scripted-events (`target.stunnedRounds = 2` as an authored story beat, e.g. a Claimant's Sweep), never derived from a real creature's own "Stunned N" text — conflating the two would have been a scope creep this report never asked for. The artifact viewer's own turn-overview and narration panels previously assumed `stunned` always meant "zero actions, nothing to show" — fixed to render the real actions a partially-stunned turn still took, with a "lost N action(s) to Stunned" note instead of the old blanket "loses this turn."

### Bug 2 — movement was blocked by allies, not just enemies

Ingram's own correction, with a citation: *"Characters can move through friendly character spaces per the rules."* Checked directly: `isOccupied` (and everything built on it — `legality.mjs`'s path validation, `world/pathfind.mjs`'s Dijkstra flood, `decide.mjs`'s straight-line fallback) treated ANY occupied square as a hard block, ally or enemy alike, with no side check anywhere. This wasn't just a legality gap; it plausibly starved the AI's own candidate generation of real routes whenever a teammate happened to be standing between it and anywhere useful — a real, if partial, contributor to the exact "wastes a turn shuffling" pattern under review.

Fixed with a new `blocksPassage(pos, occupiedPositions, moverSide)` (`grid.mjs`), matching `isOccupied`'s shape but only counting a DIFFERENT-side occupant as blocking — a same-side occupant is a real waypoint, not a wall, matching the real rule's other half too (*"though you can't stop there"* — the actual DESTINATION square is still checked with a plain, side-blind `isOccupied`, so nobody can ever end a move standing on an ally either). Threaded through every layer that previously called `isOccupied` for a movement check: `world/pathfind.mjs`'s `reachableCells` (explores THROUGH a same-side cell so everything beyond it is still reachable, but never offers that cell itself as a selectable destination — the same explore-vs-select split the earlier corpse-in-doorway fix, §22, already established for HP-dead combatants), `decide.mjs`'s `extend`/`stepToward`/`stepAway` (the no-walls straight-line fallback), and `legality.mjs`'s `checkMoveLegality` (both the supplied-path and straight-line-fallback validation branches). `moverSide == null` (no side info available at all) safely falls back to the original any-occupant-blocks rule rather than silently treating every occupant as passable. Verified at every layer: unit tests on `blocksPassage` itself, `reachableCells` proving a route through an ally costs the true straight-line distance rather than detouring around, and `bestDestinationToward` proving the real entry point the AI calls walks straight past an ally but still genuinely detours around an enemy in the identical spot.

### Bug 3 — a cover object could seal a combatant inside it, and one actually did

*"Nitpick's first turn is three 5ft moves in a row... They start on top of a table... Are they stuck? Moving across cover should be possible, spawning inside shouldn't happen."* Investigated directly rather than assumed: `coverBlock`'s own four-edge perimeter used `move:20` (fully solid, identical to a real wall) on all four sides with no doorway — a small object is therefore a SEALED BOX, walkable INTO but never back OUT of. Cross-checked against the actual map data: the `SAME_ROOM` setup's own Bennit spawn point, `{col:15,row:20}`, sat exactly inside `coverBlock(14,19,2,2)`'s 2x2 interior. She really was trapped from turn 1, and the "three 5ft moves" were her own pathfinding correctly finding nothing better among the only 2-4 cells she could legally reach inside her own cage.

Fixed at the actual root, not just at that one coordinate: `coverBlock` no longer blocks movement at all (`move:0`). This engine has no difficult-terrain cost model to charge for climbing real waist-high cover (a crate, a low barrier), so full permeability is the honest simplification Ingram's own framing asked for — *"moving across cover should be possible"* — not `move:20` with a hand-placed gap that would only reinvent the same trap under different coordinates the next time a map got redesigned. `hasCover`'s own AC/Reflex bonus is completely unaffected (it was always independent of `move`, per its own header) — cover still makes you harder to hit, it just no longer makes you unable to walk anywhere. A dedicated regression test asserts every cover object on the real map is fully walkable, not just the one that trapped Bennit specifically.

### Structural redesign — opposite corners, a real exterior, more doors/windows/garage openings

*"Spawn the two sides at opposite corners of the map, together so that they have access to a full band of space outside the buildings at least two grid spaces wide. By putting them in opposite corners we force them to find each other first. ... Add more external doors to both buildings, add more windows. Add some large garage like openings."*

Checked first, and confirmed real: the map had **no exterior space at all** — both buildings spanned the grid's full height with zero north/south buffer, and were flush against the west/east edges too. There was no "outside" for an opposite-corners spawn to exist in. Fixed by growing the grid from 38x24 to **44x30** and shifting both buildings +3 cols/+3 rows, producing a uniform >=3-square exterior perimeter band on every side — comfortably over the ">= 2 grid spaces" floor, verified by test rather than eyeballed off the new dimensions.

`SETUPS` was rebuilt from scratch around this new exterior band, not adapted from the old room-based ones — the whole premise changed from "start already inside a room, sometimes adjacent to a shared door" to "start at an opposite corner or end of the whole map, with real ground to cover before any shot is possible." Three real setups, genuinely different shapes, all verified by connectivity/line-of-effect test rather than assumed:
- **`DIAGONAL_SW_NE`** and **`DIAGONAL_NW_SE`** — true opposite corners; a real building plausibly sits in the direct path, so neither side starts with line of effect to the other.
- **`NORTH_SOUTH_ENDS`** — opposite ends along the open courtyard gap between the two buildings; the deliberate exception, where both sides genuinely *can* see each other at spawn (the courtyard has nothing in it to block that), still 135ft apart — real, intentional tactical variety (an open-field approach), not an oversight, and pinned as its own explicit test rather than silently contradicting the other two setups' own "no initial line of effect" invariant.

The old setup names (`SAME_ROOM`/`SAME_BUILDING_FAR_ROOMS`/`ACROSS_THE_COMPLEX`) no longer described anything real once spawning moved outside the buildings entirely, so they were renamed rather than kept as a stale, misleading label — cascading into `run-personnel-scenario.mjs`'s scenario keys (`complex-3v3-diagonal-sw-ne`/`-diagonal-nw-se`/`-north-south-ends`, superseding §23's `complex-3v3-same-room` etc.) and every test that referenced them by name. `roundLimit` raised from 30 to 40 across the board — opposite-corner spawns require substantially more real travel before combat can even start.

New doors, windows, and garage openings (design doc §24's own literal ask), added to both buildings rather than just one: Building A gained a second external door (south wall, into the SE room) and a second window (NE room, north wall); Building B gained a second external door (north wall) and a second window (east wall). Both buildings gained a real "garage" opening — mechanically just an extra-wide (3-square) doorway, blocking neither movement nor sight, on Building A's west wall (SW room) and Building B's east wall (south room) respectively — visually and tactically distinct from a standard 1-square door without needing any new wall-schema mechanism.

Every new opening, every renamed setup, and the "no spawn point ever overlaps a cover object again" invariant are covered by real, passing tests in `test/battle-simulator/personnel-test-complex.test.mjs` (fully rewritten) — not just the map file itself.

**One more real finding, from actually running the redesigned map, not just checking its geometry in isolation.** A test proving "real cover gets used in real 3v3 fights" (added when cover was first built, §22) started failing once the new setups landed — not a broken assertion, a real, measured fact: across a fresh sweep of real battles on every one of the three new setups, not one single attack's line ever crossed a cover object. Every cover object on this map predates the opposite-corners redesign and sits deep inside a specific room (the NW hall, the SW room, each building's own courtyard-door corner) — real, useful placements for the OLD room-based spawns, which started combatants already adjacent to them. Once spawning moved to opposite map corners, real fights increasingly resolve in the open courtyard the two buildings flank, or wherever the two sides first make contact along the way — nowhere near where the old cover happened to be built. Cover didn't stop working; it just stopped mattering, because nothing was left where combat actually happens now. Fixed by adding two real cover objects directly in the courtyard itself (`cols 21-29`, the one stretch of ground every setup's own travel genuinely passes through or near, corner or end, diagonal or not) rather than patching the test to expect less. The specific test that caught this dropped from a ~73-second, all-10-seeds, never-finds-cover run to under 10 seconds once real courtyard cover existed to find.

### What wasn't attempted this pass

- **A genuinely different Stunned-with-a-DURATION variant** (Player Core's own alternate form — "stunned for 1 minute," lose every action for that span) — no real fixture in this project uses it, so it wasn't built speculatively alongside the value-based fix Erabryth's real "Stunned N" text actually needed.
- **Stunned/Slowed interaction** (the real rule's own worked example covers what happens when both apply at once) — no fixture currently carries Slowed at all, so there's nothing yet for this interaction to apply to; noted as a real gap for whenever one does, not invented now.
- **Tumble Through** (moving through a HOSTILE creature's space via an Acrobatics check, Ingram's own citation) — only the ally-passthrough half of the real movement rule was built. A real, separate action this engine doesn't model yet; moving through an ENEMY's space still requires going around, same as before.

### Bug 4 (small) — the map and tokens rendered squashed

A one-line root cause, found by reading the CSS directly rather than guessing: `.map-wrap`'s `aspect-ratio` was hardcoded to `1 / 1`, a leftover from when every map (the 44x44 Frame-scale city district) happened to be square. The new personnel-scale complex map is 44x30 — genuinely NOT square — so the container silently stretched the SVG (already rendering with `preserveAspectRatio="none"`, correct once the container itself is the right shape) non-uniformly to fit, squashing the whole map and turning every circular token into an oval along whichever axis got compressed. Fixed by setting `#mapWrap`'s `aspect-ratio` dynamically in `selectRun` (`${COLS} / ${ROWS}`, geometry.mjs's own already-correct per-run scale) rather than a static CSS value — the fix belongs where the real shape is actually known (per-run, at selection time), not in a stylesheet that has no way to know it in advance.

### Files

Changed: `tools/battle-simulator/personnel-engine/engine.mjs` (the real Stunned mechanic — `runTurn`'s `actionsAvailableOverride`, the round loop's partial-vs-full-forfeit split, `stunnedValue` rename throughout), `tools/battle-simulator/personnel-engine/evaluate/state-value.mjs` (`stunDenial` rescaled to per-action), `tools/battle-simulator/personnel-engine/grid.mjs` (`blocksPassage`), `tools/battle-simulator/personnel-engine/world/pathfind.mjs` (`reachableCells`'s `moverSide`, explore-vs-select split), `tools/battle-simulator/personnel-engine/decide.mjs` (`otherLivingPositions` now carries `side`; `extend`/`stepToward`/`stepAway`/`pathfindingDestinationToward`/`pathfindingDestinationAway` all faction-aware), `tools/battle-simulator/personnel-engine/legality.mjs` (`checkMoveLegality`'s intermediate-square checks), `tools/battle-simulator/data/personnel-test-complex.mjs` (fully rewritten — 44x30 grid, real exterior perimeter, `coverBlock` no longer move-blocking, new doors/windows/garage openings, `SETUPS` rebuilt around opposite corners/ends), `tools/battle-simulator/run-personnel-scenario.mjs` (renamed `complex-3v3-*` scenario keys), `tools/battle-simulator/artifact/template.html` (`#mapWrap`'s dynamic aspect-ratio; stunned-turn rendering shows real partial actions), `tools/character-builder/generate-raw-validation-fixtures.mjs` (`stunnedValue` rename in Erabryth's outcomes table), plus test coverage for every one of the above (`personnel-engine.test.mjs`, `personnel-grid.test.mjs`, `personnel-pathfind.test.mjs`, `personnel-decide.test.mjs`, `personnel-legality.test.mjs`, `personnel-state-value.test.mjs`, `personnel-test-complex.test.mjs`, `terrain-extensions.test.mjs`, `run-personnel-scenario-cli.test.mjs`, `personnel-complex-battle.test.mjs`, `raw-validation-fixtures.test.mjs`, `extract-npc.test.mjs` all touched).
